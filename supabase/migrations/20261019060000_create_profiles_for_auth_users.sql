-- Every authenticated NeighborGlow user gets one private profile row. Backfill
-- existing Auth users first, then keep profiles in sync for future signups.
insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

revoke all on function public.create_profile_for_new_user() from public;
