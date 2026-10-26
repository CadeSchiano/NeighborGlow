const encoder = new TextEncoder();

export function parseRevenueCatSignatureHeader(header: string | null) {
  const timestamp = header?.match(/(?:^|,)\s*t=(\d+)/)?.[1] ?? null;
  const signature = header?.match(/(?:^|,)\s*v1=([0-9a-f]{64})/i)?.[1] ?? null;
  return { signature, timestamp };
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{1,2}/g)!.map((pair) => Number.parseInt(pair, 16)));
}

/** RevenueCat signs the exact bytes of `${t}.` followed by the raw JSON body. */
export async function hasValidRevenueCatSignature(rawBody: Uint8Array, signatureHeader: string | null, signingSecret: string) {
  const { signature, timestamp } = parseRevenueCatSignatureHeader(signatureHeader);
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const prefix = encoder.encode(`${timestamp}.`);
  const signedPayload = new Uint8Array(prefix.length + rawBody.length);
  signedPayload.set(prefix);
  signedPayload.set(rawBody, prefix.length);
  return crypto.subtle.verify('HMAC', key, hexToBytes(signature), signedPayload);
}
