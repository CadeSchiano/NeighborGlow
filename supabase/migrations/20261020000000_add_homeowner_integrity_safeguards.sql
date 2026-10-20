-- Keep house ownership permanent for the lifetime of a listing. RLS already limits
-- updates to the owner, and this trigger is defense in depth against a future policy
-- change or direct API misuse transferring a listing to another account.
create function public.prevent_house_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'A house listing cannot be transferred to another account.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger houses_prevent_owner_change
before update on public.houses
for each row execute function public.prevent_house_owner_change();

revoke all on function public.prevent_house_owner_change() from public;

-- Community confirmations must come from a neighbor, not the homeowner. This is
-- enforced for direct Data API calls as well as the mobile UI, while revealing no
-- reporter identity or location to the public.
drop policy "Users can create their own confirmations" on public.house_confirmations;
drop policy "Users can update their own confirmations" on public.house_confirmations;

create policy "Users can confirm other houses"
on public.house_confirmations
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and not exists (
    select 1
    from public.houses
    where houses.id = house_confirmations.house_id
      and houses.owner_id = (select auth.uid())
  )
);

create policy "Users can update confirmations for other houses"
on public.house_confirmations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and not exists (
    select 1
    from public.houses
    where houses.id = house_confirmations.house_id
      and houses.owner_id = (select auth.uid())
  )
);
