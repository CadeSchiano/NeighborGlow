-- Public active-house details are intentionally limited to homeowner-published
-- availability, hours, and attributes. No owner identity, address text, or candy
-- inventory is returned.
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
  non_candy boolean
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
    h.non_candy
  from public.houses as h
  where h.id = p_house_id
    and h.status in ('available', 'running_low');
$$;

revoke all on function public.get_public_house_details(uuid) from public;
grant execute on function public.get_public_house_details(uuid) to anon, authenticated;
