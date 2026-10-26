-- Candy Finder+ is a permanent Apple non-consumable purchase, but NeighborGlow
-- advertises its in-app premium access only for the 2026 Halloween season.
-- The pass is therefore recorded server-side through 2026-11-01 05:00 UTC
-- (midnight immediately following Halloween in US Eastern daylight time).
alter table public.candy_finder_plus_entitlements
  add column revenuecat_product_id text;

alter table public.candy_finder_plus_entitlements
  add constraint candy_finder_plus_app_store_product_check
  check (
    source <> 'app_store'
    or revenuecat_product_id = 'com.cadeschiano.neighborglow.candyfinder2026'
  );

-- RevenueCat retries deliveries. This private table makes processing idempotent.
create table public.revenuecat_webhook_events (
  id text primary key,
  app_user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.revenuecat_webhook_events enable row level security;
revoke all on table public.revenuecat_webhook_events from anon, authenticated;

drop function public.get_my_candy_finder_plus_status();

create function public.get_my_candy_finder_plus_status()
returns table (is_active boolean, expires_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select
    coalesce(
      entitlement.expires_at > now()
      and now() < timestamptz '2026-11-01 04:00:00+00',
      false
    ) as is_active,
    entitlement.expires_at
  from (select 1) as placeholder
  left join public.candy_finder_plus_entitlements as entitlement
    on entitlement.user_id = (select auth.uid());
$$;

revoke all on function public.get_my_candy_finder_plus_status() from public;
grant execute on function public.get_my_candy_finder_plus_status() to authenticated;

drop function public.get_candy_finder_plus_houses_in_bounds(double precision, double precision, double precision, double precision, boolean);

create function public.get_candy_finder_plus_houses_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  p_full_size_only boolean default false,
  p_candy_names text[] default null
)
returns table (id uuid, latitude double precision, longitude double precision, status public.house_status)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.candy_finder_plus_entitlements
    where user_id = (select auth.uid())
      and expires_at > now()
      and now() < timestamptz '2026-11-01 04:00:00+00'
  ) then
    raise exception 'An active Candy Finder Plus 2026 pass is required.' using errcode = '42501';
  end if;

  if min_lat < -90 or max_lat > 90 or min_lng < -180 or max_lng > 180
    or min_lat >= max_lat or min_lng >= max_lng
    or max_lat - min_lat > 0.25 or max_lng - min_lng > 0.25 then
    raise exception 'Invalid map bounds' using errcode = '22023';
  end if;

  return query
  select h.id, extensions.st_y(h.location::extensions.geometry), extensions.st_x(h.location::extensions.geometry), h.status
  from public.houses h
  where h.status in ('available', 'running_low')
    and h.location operator(extensions.&&) extensions.st_setsrid(
      extensions.st_makebox2d(extensions.st_point(min_lng, min_lat), extensions.st_point(max_lng, max_lat)), 4326
    )
    and (not p_full_size_only or exists (
      select 1 from public.house_candy inventory
      where inventory.house_id = h.id and inventory.size = 'full_size'
    ))
    and (coalesce(array_length(p_candy_names, 1), 0) = 0 or exists (
      select 1 from public.house_candy inventory
      join public.candies candy on candy.id = inventory.candy_id
      where inventory.house_id = h.id
        and lower(candy.name) = any (select lower(value) from unnest(p_candy_names) value)
    ))
  order by h.updated_at desc
  limit 250;
end;
$$;

revoke all on function public.get_candy_finder_plus_houses_in_bounds(double precision, double precision, double precision, double precision, boolean, text[]) from public;
grant execute on function public.get_candy_finder_plus_houses_in_bounds(double precision, double precision, double precision, double precision, boolean, text[]) to authenticated;

drop function public.get_candy_finder_plus_house_candy(uuid);

create function public.get_candy_finder_plus_house_candy(p_house_id uuid)
returns table (name text, size public.candy_size)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.candy_finder_plus_entitlements
    where user_id = (select auth.uid())
      and expires_at > now()
      and now() < timestamptz '2026-11-01 04:00:00+00'
  ) then
    raise exception 'An active Candy Finder Plus 2026 pass is required.' using errcode = '42501';
  end if;

  return query
  select candy.name, inventory.size
  from public.houses h
  join public.house_candy inventory on inventory.house_id = h.id
  join public.candies candy on candy.id = inventory.candy_id
  where h.id = p_house_id and h.status in ('available', 'running_low')
  order by candy.name;
end;
$$;

revoke all on function public.get_candy_finder_plus_house_candy(uuid) from public;
grant execute on function public.get_candy_finder_plus_house_candy(uuid) to authenticated;
