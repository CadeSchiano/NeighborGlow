// @ts-expect-error Deno Edge Functions require explicit TypeScript extensions.
import { getSanitizedDatabaseError } from './database-error.ts';

type WebhookEventRecord = {
  id: string;
  app_user_id: string;
  event_type: string;
  event_timestamp_ms: number;
};

type EventUpsert = (
  record: WebhookEventRecord,
  options: { onConflict: 'id'; ignoreDuplicates: true },
) => Promise<{ error: unknown | null }>;

type ErrorLogger = (message: string, metadata: ReturnType<typeof getSanitizedDatabaseError>) => void;

/** Returns false so the caller can retain a 500 response and RevenueCat retry. */
export async function recordRevenueCatWebhookEvent(
  record: WebhookEventRecord,
  upsert: EventUpsert,
  logError: ErrorLogger = console.error,
) {
  const { error } = await upsert(record, { onConflict: 'id', ignoreDuplicates: true });
  if (!error) return true;

  logError('RevenueCat webhook event record failed', getSanitizedDatabaseError(error));
  return false;
}
