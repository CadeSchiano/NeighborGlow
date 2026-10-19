-- Keep one report per signed-in person and house, and retain a simple moderation
-- state for manual review in Supabase without exposing reports publicly.
create type public.report_status as enum ('pending', 'resolved', 'dismissed');

alter table public.house_reports
add column status public.report_status not null default 'pending',
add column updated_at timestamptz not null default now();

create unique index house_reports_one_per_user_idx
on public.house_reports (house_id, reporter_id);

create index house_reports_pending_created_at_idx
on public.house_reports (status, created_at asc)
where status = 'pending';

create trigger house_reports_set_updated_at
before update on public.house_reports
for each row execute function public.set_updated_at();

drop policy "Users can create their own reports" on public.house_reports;

create policy "Users can report other houses"
on public.house_reports
for insert
to authenticated
with check (
  (select auth.uid()) = reporter_id
  and not exists (
    select 1
    from public.houses
    where houses.id = house_reports.house_id
      and houses.owner_id = (select auth.uid())
  )
);
