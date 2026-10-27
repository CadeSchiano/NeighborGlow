import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  CANDY_FINDER_PLUS_2026_ENTITLEMENT as entitlementId,
  CANDY_FINDER_PLUS_2026_PRODUCT_ID as productId,
  getWebhookFulfillmentAction,
} from './fulfillment.ts';
import { recordRevenueCatWebhookEvent } from './event-recording.ts';
import { hasValidRevenueCatSignature } from './signature.ts';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getVerifiedEntitlement(appUserId: string, revenueCatSecretKey: string): Promise<{ entitlement: { expiresAt: string | null; productId: string } | null; retry: boolean }> {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${revenueCatSecretKey}` },
  });
  if (response.status === 404) return { entitlement: null, retry: false };
  if (!response.ok) return { entitlement: null, retry: true };
  const body = await response.json();
  const entitlement = body?.subscriber?.entitlements?.[entitlementId];
  if (!entitlement || typeof entitlement.product_identifier !== 'string') return { entitlement: null, retry: false };
  return {
    entitlement: {
      expiresAt: typeof entitlement.expires_date === 'string' ? entitlement.expires_date : null,
      productId: entitlement.product_identifier,
    },
    retry: false,
  };
}

async function markFailed(admin: ReturnType<typeof createClient>, eventId: string, error: string) {
  // Never clear a successful concurrent delivery back to retryable.
  await admin.from('revenuecat_webhook_events').update({ last_error: error }).eq('id', eventId).is('processed_at', null);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authorization = Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION');
  const signingSecret = Deno.env.get('REVENUECAT_WEBHOOK_SIGNING_SECRET');
  const revenueCatSecretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!authorization || !signingSecret || !revenueCatSecretKey) return new Response('Webhook is not configured', { status: 500 });
  if (request.headers.get('authorization') !== authorization) return new Response('Unauthorized', { status: 401 });

  const rawBody = new Uint8Array(await request.arrayBuffer());
  if (!(await hasValidRevenueCatSignature(rawBody, request.headers.get('x-revenuecat-webhook-signature'), signingSecret))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: Record<string, unknown> | undefined;
  try {
    event = JSON.parse(new TextDecoder().decode(rawBody))?.event;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const eventId = typeof event?.id === 'string' ? event.id : null;
  const appUserId = typeof event?.app_user_id === 'string' ? event.app_user_id : null;
  const eventTimestampMs = typeof event?.event_timestamp_ms === 'number' && Number.isSafeInteger(event.event_timestamp_ms)
    ? event.event_timestamp_ms
    : null;
  // Refund/revocation events are allowed through even if RevenueCat omits the
  // entitlement list. The authoritative subscriber lookup below still requires
  // this exact entitlement and product before it can ever grant access.
  const isExpectedEvent = event?.store === 'APP_STORE' && event?.product_id === productId;
  if (!eventId || !appUserId || !eventTimestampMs || !uuidPattern.test(appUserId) || !isExpectedEvent) return new Response('Ignored', { status: 200 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const didRecordEvent = await recordRevenueCatWebhookEvent({
    id: eventId,
    app_user_id: appUserId,
    event_type: typeof event.type === 'string' ? event.type : 'unknown',
    event_timestamp_ms: eventTimestampMs,
  }, (record, options) => admin.from('revenuecat_webhook_events').upsert(record, options));
  if (!didRecordEvent) return new Response('Unable to record event', { status: 500 });

  // Do not trust the event's ordering or purchase status. RevenueCat's current
  // subscriber state is authoritative for every first-time delivery, including
  // REFUND/revocation events and late purchase events.
  const verified = await getVerifiedEntitlement(appUserId, revenueCatSecretKey);
  if (verified.retry) {
    await markFailed(admin, eventId, 'RevenueCat subscriber lookup failed');
    return new Response('RevenueCat lookup failed', { status: 500 });
  }

  const action = getWebhookFulfillmentAction({
    wasProcessed: false,
    verifiedEntitlement: verified.entitlement,
  });
  const { data: result, error: fulfillmentError } = await admin.rpc('reconcile_revenuecat_webhook_event', {
    p_event_id: eventId,
    p_should_grant: action === 'grant',
  });
  if (fulfillmentError) {
    await markFailed(admin, eventId, fulfillmentError.message);
    return new Response('Database fulfillment failed', { status: 500 });
  }

  if (result === 'already_processed') return new Response('Already processed', { status: 200 });
  if (result === 'ignored_stale') return new Response('Ignored stale event', { status: 200 });
  return new Response(result === 'granted' ? 'Granted' : 'Revoked', { status: 200 });
});
