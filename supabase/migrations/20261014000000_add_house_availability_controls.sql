-- Recreate the owner-only listing RPC to include the owner's current availability.
-- The function is security invoker, so RLS still limits it to the caller's own house.
drop function public.get_my_house_listing();

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
  non_candy boolean,
  status public.house_status
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
    h.non_candy,
    h.status
  from public.houses as h
  where h.owner_id = (select auth.uid());
$$;

revoke all on function public.get_my_house_listing() from public;
grant execute on function public.get_my_house_listing() to authenticated;
