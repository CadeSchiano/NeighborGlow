-- Marker attributes are homeowner-selected public listing details. They are returned
-- only for active participating homes within the existing bounded map viewport.
drop function public.get_houses_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision
);

create function public.get_houses_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision
)
returns table (
  id uuid,
  latitude double precision,
  longitude double precision,
  status public.house_status,
  decorated boolean,
  haunted boolean,
  accessible boolean,
  allergy_friendly boolean,
  non_candy boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if min_lat < -90
    or max_lat > 90
    or min_lng < -180
    or max_lng > 180
    or min_lat >= max_lat
    or min_lng >= max_lng then
    raise exception 'Invalid map bounds' using errcode = '22023';
  end if;

  -- Do not turn an anonymous map pan into a bulk geographic download.
  if max_lat - min_lat > 0.25 or max_lng - min_lng > 0.25 then
    return;
  end if;

  return query
  select
    h.id,
    extensions.st_y(h.location::extensions.geometry) as latitude,
    extensions.st_x(h.location::extensions.geometry) as longitude,
    h.status,
    h.decorated,
    h.haunted,
    h.accessible,
    h.allergy_friendly,
    h.non_candy
  from public.houses as h
  where h.status in ('available', 'running_low')
    and h.location operator(extensions.&&) extensions.st_setsrid(
      extensions.st_makebox2d(
        extensions.st_point(min_lng, min_lat),
        extensions.st_point(max_lng, max_lat)
      ),
      4326
    )
  order by h.updated_at desc
  limit 100;
end;
$$;

revoke all on function public.get_houses_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision
) from public;

grant execute on function public.get_houses_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision
) to anon, authenticated;
