import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { isLifetimePackage } from './premium-access';
import { createRevenueCatIdentitySynchronizer } from './revenuecat-identity-sync';

export const CANDY_FINDER_PLUS_ENTITLEMENT = 'candy_finder_plus_2026';

const revenueCatApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

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
  return identitySynchronizer.getIdentity();
}

const identitySynchronizer = createRevenueCatIdentitySynchronizer({
  configure: ensureConfigured,
  logIn: async (userId) => { await Purchases.logIn(userId); },
});

export function syncRevenueCatUser(userId: string | null) {
  if (userId === null) return identitySynchronizer.sync(null);
  if (!getPurchaseAvailability().available) return Promise.resolve(false);
  return identitySynchronizer.sync(userId);
}

export function hasCandyFinderPlus(customerInfo: CustomerInfo) {
  return customerInfo.entitlements.active[CANDY_FINDER_PLUS_ENTITLEMENT]?.isActive === true;
}

function assertReadyForUser(userId: string) {
  const identity = getRevenueCatIdentity();
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
