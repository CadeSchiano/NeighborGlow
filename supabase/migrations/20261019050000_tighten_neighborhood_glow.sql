-- Tighten city-scale Glow areas to a neighborhood-sized, light-blue signal.
create or replace function public.get_glow_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision
)
returns table (
  latitude double precision,
  longitude double precision,
  intensity text,
  radius_meters double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cell_size double precision;
  max_span double precision;
begin
  if min_lat < -90 or max_lat > 90 or min_lng < -180 or max_lng > 180 or min_lat >= max_lat or min_lng >= max_lng then
    raise exception 'Invalid map bounds' using errcode = '22023';
  end if;

  max_span := greatest(max_lat - min_lat, max_lng - min_lng);

  if max_span > 40 then
    return;
  end if;

  cell_size := case
    when max_span <= 1 then 0.02
    when max_span <= 5 then 0.20
    when max_span <= 15 then 0.50
    else 1.00
  end;

  return query
  with active_houses as (
    select
      floor((extensions.st_y(h.location::extensions.geometry) + 90) / cell_size) as lat_cell,
      floor((extensions.st_x(h.location::extensions.geometry) + 180) / cell_size) as lng_cell
    from public.houses as h
    where h.status in ('available', 'running_low')
      and h.location operator(extensions.&&) extensions.st_setsrid(
        extensions.st_makebox2d(extensions.st_point(min_lng, min_lat), extensions.st_point(max_lng, max_lat)),
        4326
      )
  ),
  glow_cells as (
    select lat_cell, lng_cell, count(*) as active_listing_count
    from active_houses
    group by lat_cell, lng_cell
    having count(*) >= 3
  )
  select
    -90 + (lat_cell + 0.5) * cell_size as latitude,
    -180 + (lng_cell + 0.5) * cell_size as longitude,
    case
      when active_listing_count >= 12 then 'high'
      when active_listing_count >= 6 then 'medium'
      else 'low'
    end as intensity,
    case
      when cell_size <= 0.02 then 1200::double precision
      when cell_size <= 0.20 then 10000::double precision
      when cell_size <= 0.50 then 25000::double precision
      else 50000::double precision
    end as radius_meters
  from glow_cells
  order by active_listing_count desc
  limit 150;
end;
$$;
