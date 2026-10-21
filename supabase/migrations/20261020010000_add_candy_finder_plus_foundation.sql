-- Candy Finder+ entitlements are created later by a trusted purchase verifier
-- (App Store / RevenueCat webhook). Mobile clients can only read their own pass.
create type public.candy_finder_plus_source as enum ('app_store', 'manual');

create table public.candy_finder_plus_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  source public.candy_finder_plus_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger candy_finder_plus_entitlements_set_updated_at
before update on public.candy_finder_plus_entitlements
for each row execute function public.set_updated_at();

alter table public.candy_finder_plus_entitlements enable row level security;
revoke all on table public.candy_finder_plus_entitlements from anon, authenticated;
grant select on table public.candy_finder_plus_entitlements to authenticated;

create policy "Users can view their own Candy Finder Plus entitlement"
on public.candy_finder_plus_entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

-- This RPC intentionally returns only the current user's entitlement state.
create function public.get_my_candy_finder_plus_status()
returns table (
  is_active boolean,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(entitlement.expires_at > now(), false) as is_active,
    entitlement.expires_at
  from (select 1) as placeholder
  left join public.candy_finder_plus_entitlements as entitlement
    on entitlement.user_id = (select auth.uid());
$$;

-- Premium filter results remain bounded to the visible map viewport. Exact candy
-- information is not included here; it has its own entitlement-gated RPC below.
create function public.get_candy_finder_plus_houses_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  p_full_size_only boolean default false
)
returns table (
  id uuid,
  latitude double precision,
  longitude double precision,
  status public.house_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not exists (
      select 1
      from public.candy_finder_plus_entitlements
      where user_id = (select auth.uid())
        and expires_at > now()
    ) then
    raise exception 'An active Candy Finder Plus pass is required.' using errcode = '42501';
  end if;

  if min_lat < -90
    or max_lat > 90
    or min_lng < -180
    or max_lng > 180
    or min_lat >= max_lat
    or min_lng >= max_lng
    or max_lat - min_lat > 0.25
    or max_lng - min_lng > 0.25 then
    raise exception 'Invalid map bounds' using errcode = '22023';
  end if;

  return query
  select
    h.id,
    extensions.st_y(h.location::extensions.geometry) as latitude,
    extensions.st_x(h.location::extensions.geometry) as longitude,
    h.status
  from public.houses as h
  where h.status in ('available', 'running_low')
    and h.location operator(extensions.&&) extensions.st_setsrid(
      extensions.st_makebox2d(
        extensions.st_point(min_lng, min_lat),
        extensions.st_point(max_lng, max_lat)
      ),
      4326
    )
    and (
      not p_full_size_only
      or exists (
        select 1
        from public.house_candy as inventory
        where inventory.house_id = h.id
          and inventory.size = 'full_size'
      )
    )
  order by h.updated_at desc
  limit 250;
end;
$$;

-- Exact candy names and sizes are available only for active listings to an active
-- pass holder. No homeowner identity, visitor identity, or location history is returned.
create function public.get_candy_finder_plus_house_candy(p_house_id uuid)
returns table (
  name text,
  size public.candy_size
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not exists (
      select 1
      from public.candy_finder_plus_entitlements
      where user_id = (select auth.uid())
        and expires_at > now()
    ) then
    raise exception 'An active Candy Finder Plus pass is required.' using errcode = '42501';
  end if;

  return query
  select candy.name, inventory.size
  from public.houses as h
  join public.house_candy as inventory on inventory.house_id = h.id
  join public.candies as candy on candy.id = inventory.candy_id
  where h.id = p_house_id
    and h.status in ('available', 'running_low')
  order by candy.name;
end;
$$;

revoke all on function public.get_my_candy_finder_plus_status() from public;
revoke all on function public.get_candy_finder_plus_houses_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision,
  boolean
) from public;
revoke all on function public.get_candy_finder_plus_house_candy(uuid) from public;

grant execute on function public.get_my_candy_finder_plus_status() to authenticated;
grant execute on function public.get_candy_finder_plus_houses_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision,
  boolean
) to authenticated;
grant execute on function public.get_candy_finder_plus_house_candy(uuid) to authenticated;
