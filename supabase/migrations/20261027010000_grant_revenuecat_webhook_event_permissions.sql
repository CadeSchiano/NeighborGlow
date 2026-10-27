-- The RevenueCat Edge Function uses the service-role client to record webhook
-- deliveries and to retain a retryable diagnostic if verification fails.
-- Keep this table inaccessible to browser roles; RLS remains enabled and the
-- earlier migration grants no anon/authenticated access.
grant usage on schema public to service_role;
grant select, insert, update on table public.revenuecat_webhook_events to service_role;
