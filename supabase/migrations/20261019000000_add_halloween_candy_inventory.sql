-- Curated Halloween MVP candy catalog. Homeowners can only associate existing
-- catalog entries with their own house; they cannot modify the shared catalog.
insert into public.candies (name)
values
  ('Dum Dums'),
  ('Gummy Bears'),
  ('Hershey''s Milk Chocolate'),
  ('Kit Kat'),
  ('Laffy Taffy'),
  ('M&M''s'),
  ('Milky Way'),
  ('Nerds Gummy Clusters'),
  ('Popcorn'),
  ('Reese''s Peanut Butter Cups'),
  ('Skittles'),
  ('Smarties'),
  ('Snickers'),
  ('Sour Patch Kids'),
  ('Starburst'),
  ('Swedish Fish'),
  ('Tootsie Roll'),
  ('Twix')
on conflict (name) do nothing;

-- Replaces a homeowner's selected inventory atomically. Security invoker means
-- the house_candy RLS policies and the owner check remain in force.
create function public.replace_my_house_candy(
  p_house_id uuid,
  p_candy_ids bigint[],
  p_candy_sizes public.candy_size[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(cardinality(p_candy_ids), 0) <> coalesce(cardinality(p_candy_sizes), 0) then
    raise exception 'Candy IDs and sizes must have matching lengths' using errcode = '22023';
  end if;

  if exists (
    select 1
    from (
      select unnest(p_candy_ids) as candy_id
    ) as requested_candy
    group by candy_id
    having count(*) > 1
  ) then
    raise exception 'Each candy can only be selected once' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.houses
    where id = p_house_id
      and owner_id = (select auth.uid())
  ) then
    raise exception 'House listing not found' using errcode = '42501';
  end if;

  delete from public.house_candy where house_id = p_house_id;

  insert into public.house_candy (house_id, candy_id, size)
  select p_house_id, p_candy_ids[index], p_candy_sizes[index]
  from generate_subscripts(p_candy_ids, 1) as index;
end;
$$;

revoke all on function public.replace_my_house_candy(
  uuid,
  bigint[],
  public.candy_size[]
) from public;

grant execute on function public.replace_my_house_candy(
  uuid,
  bigint[],
  public.candy_size[]
) to authenticated;
