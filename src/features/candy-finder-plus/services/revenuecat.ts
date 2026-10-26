import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { isLifetimePackage } from './premium-access';

export const CANDY_FINDER_PLUS_ENTITLEMENT = 'candy_finder_plus_2026';

const revenueCatApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

type RevenueCatIdentity = {
  isReady: boolean;
  userId: string | null;
};

let identity: RevenueCatIdentity = { isReady: false, userId: null };
let identityQueue: Promise<void> = Promise.resolve();
let identityRequest = 0;

export type PurchaseAvailability =
  | { available: true }
  | { available: false; reason: 'ios_only' | 'not_configured' };

export function getPurchaseAvailability(): PurchaseAvailability {
  if (Platform.OS !== 'ios') return { available: false, reason: 'ios_only' };
  if (!revenueCatApiKey) return { available: false, reason: 'not_configured' };
  return { available: true };
}

async function ensureConfigured() {
  const availability = getPurchaseAvailability();
  if (!availability.available) {
    throw new Error(availability.reason === 'ios_only' ? 'Candy Finder+ purchases are currently available on iPhone only.' : 'Candy Finder+ is not configured yet.');
  }
  if (!(await Purchases.isConfigured())) Purchases.configure({ apiKey: revenueCatApiKey! });
}

export function getRevenueCatIdentity() {
  return identity;
}

export async function syncRevenueCatUser(userId: string | null) {
  const request = ++identityRequest;
  identity = { isReady: false, userId: null };

  if (!getPurchaseAvailability().available) return false;

  const sync = identityQueue.catch(() => undefined).then(async () => {
    await ensureConfigured();
    if (userId) await Purchases.logIn(userId);
    else await Purchases.logOut();

    // Sync requests are serialized. Only the newest authenticated account can
    // be marked ready, preventing an earlier account switch from winning late.
    if (request === identityRequest) identity = { isReady: userId !== null, userId };
  });
  identityQueue = sync;
  await sync;
  return request === identityRequest && identity.isReady && identity.userId === userId;
}

export function hasCandyFinderPlus(customerInfo: CustomerInfo) {
  return customerInfo.entitlements.active[CANDY_FINDER_PLUS_ENTITLEMENT]?.isActive === true;
}

function assertReadyForUser(userId: string) {
  if (!identity.isReady || identity.userId !== userId) {
    throw new Error('Candy Finder+ is still connecting to this account. Please try again.');
  }
}

export async function getCandyFinderPlusPackage(): Promise<PurchasesPackage | null> {
  await ensureConfigured();
  return (await Purchases.getOfferings()).current?.availablePackages.find((aPackage) => isLifetimePackage(aPackage.identifier)) ?? null;
}
export async function purchaseCandyFinderPlus(aPackage: PurchasesPackage, userId: string) {
  assertReadyForUser(userId);
  await ensureConfigured();
  return (await Purchases.purchasePackage(aPackage)).customerInfo;
}
export async function restoreCandyFinderPlus(userId: string) {
  assertReadyForUser(userId);
  await ensureConfigured();
  return Purchases.restorePurchases();
}
