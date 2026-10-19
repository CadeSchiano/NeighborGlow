-- One signed-in neighbor can maintain one current confirmation per house.
-- This limits duplicate confirmation spam without storing visitor location data.
alter table public.house_confirmations
add column updated_at timestamptz not null default now();

create unique index house_confirmations_one_per_user_idx
on public.house_confirmations (house_id, user_id);

create trigger house_confirmations_set_updated_at
before update on public.house_confirmations
for each row execute function public.set_updated_at();

create policy "Users can update their own confirmations"
on public.house_confirmations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Add aggregate confirmation data to the existing public card RPC. It returns
-- no user IDs, no individual confirmation records, and no location data.
drop function public.get_public_house_details(uuid);

create function public.get_public_house_details(p_house_id uuid)
returns table (
  id uuid,
  status public.house_status,
  starts_at time,
  ends_at time,
  decorated boolean,
  haunted boolean,
  accessible boolean,
  allergy_friendly boolean,
  non_candy boolean,
  recent_confirmation_count integer,
  last_confirmed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    h.id,
    h.status,
    h.starts_at,
    h.ends_at,
    h.decorated,
    h.haunted,
    h.accessible,
    h.allergy_friendly,
    h.non_candy,
    count(c.id) filter (where c.updated_at >= now() - interval '6 hours')::integer as recent_confirmation_count,
    max(c.updated_at) as last_confirmed_at
  from public.houses as h
  left join public.house_confirmations as c on c.house_id = h.id
  where h.id = p_house_id
    and h.status in ('available', 'running_low')
  group by h.id;
$$;

revoke all on function public.get_public_house_details(uuid) from public;
grant execute on function public.get_public_house_details(uuid) to anon, authenticated;
