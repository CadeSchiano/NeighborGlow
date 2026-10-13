-- A homeowner has one Halloween house listing for the MVP.
-- This deliberately refuses to deploy when old duplicates exist, rather than deleting
-- listings without the homeowner's choice.
do $$
begin
  if exists (
    select 1
    from public.houses
    group by owner_id
    having count(*) > 1
  ) then
    raise exception 'Remove or consolidate duplicate house listings before applying this migration.';
  end if;
end;
$$;

alter table public.houses
add constraint houses_one_listing_per_owner unique (owner_id);

-- This authenticated RPC exposes only the current homeowner's own listing,
-- including coordinates needed to edit the location pin.
create function public.get_my_house_listing()
returns table (
  id uuid,
  latitude double precision,
  longitude double precision,
  starts_at time,
  ends_at time,
  decorated boolean,
  haunted boolean,
  accessible boolean,
  allergy_friendly boolean,
  non_candy boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    h.id,
    extensions.st_y(h.location::extensions.geometry) as latitude,
    extensions.st_x(h.location::extensions.geometry) as longitude,
    h.starts_at,
    h.ends_at,
    h.decorated,
    h.haunted,
    h.accessible,
    h.allergy_friendly,
    h.non_candy
  from public.houses as h
  where h.owner_id = (select auth.uid());
$$;

revoke all on function public.get_my_house_listing() from public;
grant execute on function public.get_my_house_listing() to authenticated;
