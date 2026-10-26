import {
  CANDY_FINDER_PLUS_2026_ENTITLEMENT,
  CANDY_FINDER_PLUS_2026_PRODUCT_ID,
  getCandyFinderPlusPurchaseBlockReason,
  isCandyFinderPlusSeasonActive,
  isExpectedCandyFinderPlusPurchase,
  isLifetimePackage,
} from '../premium-access';
import { getWebhookFulfillmentAction } from '../../../../../supabase/functions/revenuecat-webhook/fulfillment';

const userId = '7b86f3df-1d7e-4f23-8e20-7a7cb706a0e1';

describe('Candy Finder+ 2026 purchase guards', () => {
  it('allows access before the advertised seasonal cutoff and rejects it after', () => {
    expect(isCandyFinderPlusSeasonActive(new Date('2026-10-31T23:59:59-04:00'))).toBe(true);
    expect(isCandyFinderPlusSeasonActive(new Date('2026-11-01T00:00:00-04:00'))).toBe(false);
  });

  it('accepts only the configured App Store product and entitlement for the authenticated-style UUID', () => {
    expect(isExpectedCandyFinderPlusPurchase({ appUserId: userId, store: 'APP_STORE', productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, entitlementIds: [CANDY_FINDER_PLUS_2026_ENTITLEMENT] })).toBe(true);
  });

  it.each([
    { appUserId: userId, store: 'APP_STORE', productId: 'wrong.product', entitlementIds: [CANDY_FINDER_PLUS_2026_ENTITLEMENT] },
    { appUserId: userId, store: 'PLAY_STORE', productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, entitlementIds: [CANDY_FINDER_PLUS_2026_ENTITLEMENT] },
    { appUserId: 'not-a-user', store: 'APP_STORE', productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, entitlementIds: [CANDY_FINDER_PLUS_2026_ENTITLEMENT] },
    { appUserId: userId, store: 'APP_STORE', productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, entitlementIds: [] },
  ])('rejects an incorrect product, store, customer, or entitlement', (event) => {
    expect(isExpectedCandyFinderPlusPurchase(event)).toBe(false);
  });

  it('recognizes only RevenueCat’s configured lifetime package', () => {
    expect(isLifetimePackage('$rc_lifetime')).toBe(true);
    expect(isLifetimePackage('$rc_monthly')).toBe(false);
    expect(isLifetimePackage(null)).toBe(false);
  });

  it('does not allow a purchase while RevenueCat is connected to another account', () => {
    expect(getCandyFinderPlusPurchaseBlockReason({
      authenticatedUserId: userId,
      revenueCatUserId: 'a0ac525e-e9f6-4bc2-97b4-5f4105891a0e',
      isRevenueCatIdentityReady: true,
      hasLifetimePackage: true,
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('identity_syncing');
  });

  it('blocks new purchases after the seasonal cutoff or when the offering is unavailable', () => {
    expect(getCandyFinderPlusPurchaseBlockReason({
      authenticatedUserId: userId,
      revenueCatUserId: userId,
      isRevenueCatIdentityReady: true,
      hasLifetimePackage: true,
      now: new Date('2026-11-01T00:00:00-04:00'),
    })).toBe('season_ended');
    expect(getCandyFinderPlusPurchaseBlockReason({
      authenticatedUserId: userId,
      revenueCatUserId: userId,
      isRevenueCatIdentityReady: true,
      hasLifetimePackage: false,
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('offering_unavailable');
  });

  it('keeps failed webhook fulfillment retryable and ignores a completed duplicate delivery', () => {
    expect(getWebhookFulfillmentAction({
      wasProcessed: false,
      verifiedProductId: CANDY_FINDER_PLUS_2026_PRODUCT_ID,
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('grant');
    expect(getWebhookFulfillmentAction({
      wasProcessed: true,
      verifiedProductId: CANDY_FINDER_PLUS_2026_PRODUCT_ID,
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('already_processed');
  });

  it('uses current RevenueCat state to revoke refunds and stale purchase deliveries', () => {
    // A refund/revocation removes the verified entitlement. The same result is
    // required for a late purchase event that follows that refund.
    expect(getWebhookFulfillmentAction({
      wasProcessed: false,
      verifiedProductId: null,
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('revoke');
    expect(getWebhookFulfillmentAction({
      wasProcessed: false,
      verifiedProductId: CANDY_FINDER_PLUS_2026_PRODUCT_ID,
      now: new Date('2026-11-01T00:00:00-04:00'),
    })).toBe('revoke');
  });
});
