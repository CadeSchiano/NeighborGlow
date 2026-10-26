import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const entitlementId = 'candy_finder_plus_2026';
const productId = 'com.cadeschiano.neighborglow.candyfinder2026';
const seasonEndsAt = '2026-11-01T04:00:00.000Z';
const encoder = new TextEncoder();

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

async function getVerifiedEntitlement(appUserId: string, revenueCatSecretKey: string) {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${revenueCatSecretKey}` },
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body?.subscriber?.entitlements?.[entitlementId] ?? null;
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

  const event = JSON.parse(rawBody)?.event;
  const eventId = event?.id;
  const appUserId = event?.app_user_id;
  const entitlementIds: string[] = event?.entitlement_ids ?? [];
  const isExpectedPurchase = event?.store === 'APP_STORE'
    && event?.product_id === productId
    && entitlementIds.includes(entitlementId);
  if (!eventId || !appUserId || !isExpectedPurchase) return new Response('Ignored', { status: 200 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { error: insertEventError } = await admin.from('revenuecat_webhook_events').upsert({
    id: eventId,
    app_user_id: appUserId,
    event_type: event.type,
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (insertEventError) return new Response('Unable to record event', { status: 500 });

  if (event.type === 'REFUND') {
    const { error } = await admin.from('candy_finder_plus_entitlements').delete().eq('user_id', appUserId);
    return new Response(error ? 'Database error' : 'Revoked', { status: error ? 500 : 200 });
  }

  const verifiedEntitlement = await getVerifiedEntitlement(appUserId, revenueCatSecretKey);
  if (verifiedEntitlement?.product_identifier !== productId) return new Response('Unverified purchase', { status: 422 });

  const { error } = await admin.from('candy_finder_plus_entitlements').upsert({
    user_id: appUserId,
    source: 'app_store',
    revenuecat_product_id: productId,
    expires_at: seasonEndsAt,
  }, { onConflict: 'user_id' });
  return new Response(error ? 'Database error' : 'Granted', { status: error ? 500 : 200 });
});
