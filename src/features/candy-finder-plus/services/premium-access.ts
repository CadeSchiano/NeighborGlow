export const CANDY_FINDER_PLUS_2026_PRODUCT_ID = 'com.cadeschiano.neighborglow.candyfinder2026';
export const CANDY_FINDER_PLUS_2026_ENTITLEMENT = 'candy_finder_plus_2026';
export const CANDY_FINDER_PLUS_2026_SEASON_END = '2026-11-01T04:00:00.000Z';

export function isCandyFinderPlusSeasonActive(now = new Date()) {
  return now.getTime() < new Date(CANDY_FINDER_PLUS_2026_SEASON_END).getTime();
}

export function isExpectedCandyFinderPlusPurchase({
  appUserId,
  entitlementIds,
  productId,
  store,
}: {
  appUserId: unknown;
  entitlementIds: unknown;
  productId: unknown;
  store: unknown;
}) {
  return typeof appUserId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appUserId)
    && store === 'APP_STORE'
    && productId === CANDY_FINDER_PLUS_2026_PRODUCT_ID
    && Array.isArray(entitlementIds)
    && entitlementIds.includes(CANDY_FINDER_PLUS_2026_ENTITLEMENT);
}

export function isLifetimePackage(identifier: string | null | undefined) {
  return identifier === '$rc_lifetime';
}
