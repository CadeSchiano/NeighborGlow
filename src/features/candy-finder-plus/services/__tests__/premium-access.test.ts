import {
  CANDY_FINDER_PLUS_2026_ENTITLEMENT,
  CANDY_FINDER_PLUS_2026_PRODUCT_ID,
  getCandyFinderPlusPurchaseBlockReason,
  isCandyFinderPlusSeasonActive,
  isExpectedCandyFinderPlusPurchase,
  isLifetimePackage,
} from '../premium-access';
import { getWebhookFulfillmentAction, shouldApplyWebhookEvent } from '../../../../../supabase/functions/revenuecat-webhook/fulfillment';
import { parseRevenueCatSignatureHeader } from '../../../../../supabase/functions/revenuecat-webhook/signature';
import { getSanitizedDatabaseError } from '../../../../../supabase/functions/revenuecat-webhook/database-error';
import { recordRevenueCatWebhookEvent } from '../../../../../supabase/functions/revenuecat-webhook/event-recording';

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
      verifiedEntitlement: { productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, expiresAt: null },
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('grant');
    expect(getWebhookFulfillmentAction({
      wasProcessed: true,
      verifiedEntitlement: { productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, expiresAt: null },
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('already_processed');
  });

  it('uses current RevenueCat state to revoke refunds and stale purchase deliveries', () => {
    // A refund/revocation removes the verified entitlement. The same result is
    // required for a late purchase event that follows that refund.
    expect(getWebhookFulfillmentAction({
      wasProcessed: false,
      verifiedEntitlement: null,
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('revoke');
    expect(getWebhookFulfillmentAction({
      wasProcessed: false,
      verifiedEntitlement: { productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, expiresAt: null },
      now: new Date('2026-11-01T00:00:00-04:00'),
    })).toBe('revoke');
  });

  it('does not grant an expired or malformed RevenueCat entitlement', () => {
    expect(getWebhookFulfillmentAction({
      wasProcessed: false,
      verifiedEntitlement: { productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, expiresAt: '2026-10-30T00:00:00.000Z' },
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('revoke');
    expect(getWebhookFulfillmentAction({
      wasProcessed: false,
      verifiedEntitlement: { productId: CANDY_FINDER_PLUS_2026_PRODUCT_ID, expiresAt: 'not-a-date' },
      now: new Date('2026-10-31T20:00:00-04:00'),
    })).toBe('revoke');
  });

  it('parses only RevenueCat’s documented HMAC webhook header format', () => {
    const signature = 'a'.repeat(64);
    expect(parseRevenueCatSignatureHeader(`t=1761969600,v1=${signature}`)).toEqual({ timestamp: '1761969600', signature });
    expect(parseRevenueCatSignatureHeader('X-RevenueCat-Signature=legacy')).toEqual({ timestamp: null, signature: null });
  });

  it('keeps a newer refund authoritative when different event IDs for one user arrive concurrently', () => {
    const purchaseEventId = 'purchase-event';
    const refundEventId = 'refund-event';
    const applied = new Map<string, 'grant' | 'revoke'>();

    expect(shouldApplyWebhookEvent({
      action: 'revoke',
      eventTimestampMs: 200,
      latestProcessedAction: null,
      latestProcessedTimestampMs: null,
    })).toBe(true);
    applied.set(refundEventId, 'revoke');

    expect(shouldApplyWebhookEvent({
      action: 'grant',
      eventTimestampMs: 100,
      latestProcessedAction: applied.get(refundEventId)!,
      latestProcessedTimestampMs: 200,
    })).toBe(false);
    expect(applied.has(purchaseEventId)).toBe(false);
  });

  it('keeps event-recording database diagnostics useful without logging customer identifiers', () => {
    expect(getSanitizedDatabaseError({
      code: '23503',
      message: 'insert or update on table "revenuecat_webhook_events" violates foreign key constraint',
      details: 'Key (app_user_id)=(7b86f3df-1d7e-4f23-8e20-7a7cb706a0e1) is not present in table "users".',
      hint: 'Contact test@example.com with Bearer secret-token',
      unrelated: 'must not be logged',
    })).toEqual({
      code: '23503',
      message: 'insert or update on table "revenuecat_webhook_events" violates foreign key constraint',
      details: 'Key (app_user_id)=([redacted-uuid]) is not present in table "users".',
      hint: 'Contact [redacted-email] with Bearer [redacted]',
    });
  });

  it('does not serialize arbitrary failure objects into webhook logs', () => {
    expect(getSanitizedDatabaseError({ cause: { authorization: 'do-not-log' } })).toEqual({
      code: null,
      message: null,
      details: null,
      hint: null,
    });
  });

  it('keeps an event-recording failure retryable and logs only sanitized database diagnostics', async () => {
    const upsert = jest.fn().mockResolvedValue({
      error: {
        code: '23503',
        message: 'foreign key violation',
        details: `Key (app_user_id)=(${userId}) is not present.`,
        hint: null,
      },
    });
    const logError = jest.fn();

    await expect(recordRevenueCatWebhookEvent({
      id: 'event-id',
      app_user_id: userId,
      event_type: 'NON_RENEWING_PURCHASE',
      event_timestamp_ms: 1761969600000,
    }, upsert, logError)).resolves.toBe(false);

    expect(upsert).toHaveBeenCalledWith({
      id: 'event-id',
      app_user_id: userId,
      event_type: 'NON_RENEWING_PURCHASE',
      event_timestamp_ms: 1761969600000,
    }, { onConflict: 'id', ignoreDuplicates: true });
    expect(logError).toHaveBeenCalledWith('RevenueCat webhook event record failed', {
      code: '23503',
      message: 'foreign key violation',
      details: 'Key (app_user_id)=([redacted-uuid]) is not present.',
      hint: null,
    });
  });
});
