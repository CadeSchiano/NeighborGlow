-- A webhook ID is only complete after its entitlement reconciliation succeeds.
-- Failed calls intentionally retain a NULL processed_at so RevenueCat retries
-- can safely repeat the idempotent reconciliation.
alter table public.revenuecat_webhook_events
  add column processed_at timestamptz,
  add column last_error text;
