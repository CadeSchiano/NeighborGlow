-- NeighborGlow Halloween MVP: core listings and contribution data.
-- Public map reads will be added through a bounded PostGIS RPC in NG-007.

create extension if not exists postgis schema extensions;

create type public.house_status as enum (
  'not_started',
  'available',
  'running_low',
  'out',
  'finished'
);

create type public.candy_size as enum ('fun_size', 'full_size', 'mixed');

create type public.confirmation_status as enum ('available', 'running_low', 'out');

create type public.report_reason as enum (
  'not_participating',
  'incorrect_location',
  'inappropriate_listing',
  'unsafe_or_inappropriate',
  'other'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  location extensions.geography(point) not null,
  status public.house_status not null default 'not_started',
  starts_at time,
  ends_at time,
  decorated boolean not null default false,
  haunted boolean not null default false,
  accessible boolean not null default false,
  allergy_friendly boolean not null default false,
  non_candy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint houses_hours_are_ordered check (
    starts_at is null
    or ends_at is null
    or starts_at < ends_at
  )
);

create table public.candies (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  constraint candies_name_is_not_blank check (length(trim(name)) > 0)
);

create table public.house_candy (
  house_id uuid not null references public.houses (id) on delete cascade,
  candy_id bigint not null references public.candies (id) on delete restrict,
  size public.candy_size not null default 'mixed',
  created_at timestamptz not null default now(),
  primary key (house_id, candy_id)
);

create table public.house_confirmations (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.confirmation_status not null,
  created_at timestamptz not null default now()
);

create table public.house_reports (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason public.report_reason not null,
  details text,
  created_at timestamptz not null default now(),
  constraint house_reports_details_length check (char_length(details) <= 500)
);

create index houses_owner_id_idx on public.houses (owner_id);
create index houses_location_gix on public.houses using gist (location);
create index house_candy_candy_id_idx on public.house_candy (candy_id);
create index house_confirmations_house_created_at_idx
  on public.house_confirmations (house_id, created_at desc);
create index house_confirmations_user_id_idx on public.house_confirmations (user_id);
create index house_reports_house_created_at_idx
  on public.house_reports (house_id, created_at desc);
create index house_reports_reporter_id_idx on public.house_reports (reporter_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger houses_set_updated_at
before update on public.houses
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.houses enable row level security;
alter table public.candies enable row level security;
alter table public.house_candy enable row level security;
alter table public.house_confirmations enable row level security;
alter table public.house_reports enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.houses from anon, authenticated;
revoke all on table public.candies from anon, authenticated;
revoke all on table public.house_candy from anon, authenticated;
revoke all on table public.house_confirmations from anon, authenticated;
revoke all on table public.house_reports from anon, authenticated;
revoke all on function public.set_updated_at() from public;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.houses to authenticated;
grant select on table public.candies to anon, authenticated;
grant select, insert, update, delete on table public.house_candy to authenticated;
grant select, insert on table public.house_confirmations to authenticated;
grant select, insert on table public.house_reports to authenticated;

create policy "Profiles are visible only to their owner"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can delete their own profile"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

create policy "Owners can view their own houses"
on public.houses
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create their own houses"
on public.houses
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Owners can update their own houses"
on public.houses
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their own houses"
on public.houses
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Candy catalog is readable by app visitors"
on public.candies
for select
to anon, authenticated
using (true);

create policy "Owners can view their house candy"
on public.house_candy
for select
to authenticated
using (
  exists (
    select 1
    from public.houses
    where houses.id = house_candy.house_id
      and houses.owner_id = (select auth.uid())
  )
);

create policy "Owners can add candy to their houses"
on public.house_candy
for insert
to authenticated
with check (
  exists (
    select 1
    from public.houses
    where houses.id = house_candy.house_id
      and houses.owner_id = (select auth.uid())
  )
);

create policy "Owners can update their house candy"
on public.house_candy
for update
to authenticated
using (
  exists (
    select 1
    from public.houses
    where houses.id = house_candy.house_id
      and houses.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.houses
    where houses.id = house_candy.house_id
      and houses.owner_id = (select auth.uid())
  )
);

create policy "Owners can remove candy from their houses"
on public.house_candy
for delete
to authenticated
using (
  exists (
    select 1
    from public.houses
    where houses.id = house_candy.house_id
      and houses.owner_id = (select auth.uid())
  )
);

create policy "Users can view their own confirmations"
on public.house_confirmations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own confirmations"
on public.house_confirmations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can view their own reports"
on public.house_reports
for select
to authenticated
using ((select auth.uid()) = reporter_id);

create policy "Users can create their own reports"
on public.house_reports
for insert
to authenticated
with check ((select auth.uid()) = reporter_id);
