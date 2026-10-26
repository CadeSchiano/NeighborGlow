import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { isLifetimePackage } from './premium-access';

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

export async function syncRevenueCatUser(userId: string | null) {
  if (!getPurchaseAvailability().available) return;
  await ensureConfigured();
  if (userId) await Purchases.logIn(userId);
  else await Purchases.logOut();
}

export function hasCandyFinderPlus(customerInfo: CustomerInfo) {
  return customerInfo.entitlements.active[CANDY_FINDER_PLUS_ENTITLEMENT]?.isActive === true;
}

export async function getCandyFinderPlusCustomerInfo() { await ensureConfigured(); return Purchases.getCustomerInfo(); }
export async function getCandyFinderPlusPackage(): Promise<PurchasesPackage | null> {
  await ensureConfigured();
  return (await Purchases.getOfferings()).current?.availablePackages.find((aPackage) => isLifetimePackage(aPackage.identifier)) ?? null;
}
export async function purchaseCandyFinderPlus(aPackage: PurchasesPackage) { await ensureConfigured(); return (await Purchases.purchasePackage(aPackage)).customerInfo; }
export async function restoreCandyFinderPlus() { await ensureConfigured(); return Purchases.restorePurchases(); }
