import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  CANDY_FINDER_PLUS_2026_ENTITLEMENT as entitlementId,
  CANDY_FINDER_PLUS_2026_PRODUCT_ID as productId,
  CANDY_FINDER_PLUS_2026_SEASON_END as seasonEndsAt,
  getWebhookFulfillmentAction,
} from './fulfillment.ts';

const encoder = new TextEncoder();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hexToBytes(value: string) {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return Uint8Array.from(value.match(/.{1,2}/g)!.map((pair) => Number.parseInt(pair, 16)));
}

async function hasValidSignature(rawBody: string, signatureHeader: string | null, signingSecret: string) {
  const timestamp = signatureHeader?.match(/(?:^|,)\s*t=(\d+)/)?.[1];
  const signature = signatureHeader?.match(/(?:^|,)\s*v1=([0-9a-f]+)/i)?.[1];
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const signatureBytes = hexToBytes(signature);
  if (!signatureBytes) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(`${timestamp}.${rawBody}`));
}

async function getVerifiedEntitlement(appUserId: string, revenueCatSecretKey: string): Promise<{ productId: string | null; retry: boolean }> {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${revenueCatSecretKey}` },
  });
  if (response.status === 404) return { productId: null, retry: false };
  if (!response.ok) return { productId: null, retry: true };
  const body = await response.json();
  return { productId: body?.subscriber?.entitlements?.[entitlementId]?.product_identifier ?? null, retry: false };
}

async function markFailed(admin: ReturnType<typeof createClient>, eventId: string, error: string) {
  await admin.from('revenuecat_webhook_events').update({ last_error: error, processed_at: null }).eq('id', eventId);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authorization = Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION');
  const signingSecret = Deno.env.get('REVENUECAT_WEBHOOK_SIGNING_SECRET');
  const revenueCatSecretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!authorization || !signingSecret || !revenueCatSecretKey) return new Response('Webhook is not configured', { status: 500 });
  if (request.headers.get('authorization') !== authorization) return new Response('Unauthorized', { status: 401 });

  const rawBody = await request.text();
  if (!(await hasValidSignature(rawBody, request.headers.get('x-revenuecat-webhook-signature'), signingSecret))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: Record<string, unknown> | undefined;
  try {
    event = JSON.parse(rawBody)?.event;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const eventId = typeof event?.id === 'string' ? event.id : null;
  const appUserId = typeof event?.app_user_id === 'string' ? event.app_user_id : null;
  // Refund/revocation events are allowed through even if RevenueCat omits the
  // entitlement list. The authoritative subscriber lookup below still requires
  // this exact entitlement and product before it can ever grant access.
  const isExpectedEvent = event?.store === 'APP_STORE' && event?.product_id === productId;
  if (!eventId || !appUserId || !uuidPattern.test(appUserId) || !isExpectedEvent) return new Response('Ignored', { status: 200 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { error: insertEventError } = await admin.from('revenuecat_webhook_events').upsert({
    id: eventId,
    app_user_id: appUserId,
    event_type: typeof event.type === 'string' ? event.type : 'unknown',
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (insertEventError) return new Response('Unable to record event', { status: 500 });

  const { data: recordedEvent, error: recordedEventError } = await admin
    .from('revenuecat_webhook_events')
    .select('processed_at')
    .eq('id', eventId)
    .maybeSingle();
  if (recordedEventError || !recordedEvent) return new Response('Unable to load event', { status: 500 });
  if (recordedEvent.processed_at) return new Response('Already processed', { status: 200 });

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
    verifiedProductId: verified.productId,
  });
  const { error: fulfillmentError } = action === 'grant'
    ? await admin.from('candy_finder_plus_entitlements').upsert({
      user_id: appUserId,
      source: 'app_store',
      revenuecat_product_id: productId,
      expires_at: seasonEndsAt,
    }, { onConflict: 'user_id' })
    : await admin.from('candy_finder_plus_entitlements').delete().eq('user_id', appUserId);
  if (fulfillmentError) {
    await markFailed(admin, eventId, fulfillmentError.message);
    return new Response('Database fulfillment failed', { status: 500 });
  }

  const { error: processedError } = await admin.from('revenuecat_webhook_events').update({
    processed_at: new Date().toISOString(),
    last_error: null,
  }).eq('id', eventId);
  if (processedError) return new Response('Unable to finish event', { status: 500 });

  return new Response(action === 'grant' ? 'Granted' : 'Revoked', { status: 200 });
});
