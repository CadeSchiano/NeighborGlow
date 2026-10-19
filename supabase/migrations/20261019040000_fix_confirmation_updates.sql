-- Upserts for a current confirmation need update privileges in addition to the
-- existing owner-only RLS update policy.
grant update on table public.house_confirmations to authenticated;
