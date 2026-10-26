export const CANDY_FINDER_PLUS_2026_ENTITLEMENT = 'candy_finder_plus_2026';
export const CANDY_FINDER_PLUS_2026_PRODUCT_ID = 'com.cadeschiano.neighborglow.candyfinder2026';
export const CANDY_FINDER_PLUS_2026_SEASON_END = '2026-11-01T04:00:00.000Z';

export function isCandyFinderPlusSeasonActive(now = new Date()) {
  return now.getTime() < new Date(CANDY_FINDER_PLUS_2026_SEASON_END).getTime();
}

export type WebhookFulfillmentAction = 'already_processed' | 'grant' | 'revoke';
export type ProcessedWebhookAction = 'grant' | 'revoke';

export type RevenueCatEntitlement = {
  expiresAt: string | null;
  productId: string;
} | null;

export function isCurrentRevenueCatEntitlement(entitlement: RevenueCatEntitlement, now = new Date()) {
  if (!entitlement || entitlement.productId !== CANDY_FINDER_PLUS_2026_PRODUCT_ID) return false;
  if (entitlement.expiresAt === null) return true;
  const expiresAt = new Date(entitlement.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}

/**
 * The verified subscriber state, not the webhook's delivery order, determines
 * the database result. This keeps refund/revocation and stale-purchase events
 * convergent and lets failed deliveries be safely retried.
 */
export function getWebhookFulfillmentAction({
  wasProcessed,
  verifiedEntitlement,
  now,
}: {
  wasProcessed: boolean;
  verifiedEntitlement: RevenueCatEntitlement;
  now?: Date;
}): WebhookFulfillmentAction {
  if (wasProcessed) return 'already_processed';
  return isCurrentRevenueCatEntitlement(verifiedEntitlement, now) && isCandyFinderPlusSeasonActive(now)
    ? 'grant'
    : 'revoke';
}

/**
 * A newer RevenueCat event has already established the state for this user.
 * For a timestamp tie, fail closed: a recorded revoke cannot be overwritten by
 * a different event's grant.
 */
export function shouldApplyWebhookEvent({
  action,
  eventTimestampMs,
  latestProcessedAction,
  latestProcessedTimestampMs,
}: {
  action: ProcessedWebhookAction;
  eventTimestampMs: number;
  latestProcessedAction: ProcessedWebhookAction | null;
  latestProcessedTimestampMs: number | null;
}) {
  if (latestProcessedTimestampMs === null) return true;
  if (eventTimestampMs < latestProcessedTimestampMs) return false;
  return !(eventTimestampMs === latestProcessedTimestampMs && latestProcessedAction === 'revoke' && action === 'grant');
}
