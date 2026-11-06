-- 003 revoked all public-table grants and only re-granted the parking tables,
-- which left warden_sightings and parked_cars unreachable for signed-in users.
-- Restore grants and tighten warden_sightings policies. Safe to re-run.

grant select, insert, delete on public.warden_sightings to authenticated;
grant select, insert, update, delete on public.parked_cars to authenticated;

alter table public.warden_sightings enable row level security;
alter table public.parked_cars enable row level security;

-- Any signed-in user can read sightings that have not expired yet
drop policy if exists "Anyone can view active sightings" on public.warden_sightings;
drop policy if exists "Authenticated users can view active sightings" on public.warden_sightings;
create policy "Authenticated users can view active sightings"
on public.warden_sightings for select
to authenticated
using (expires_at > now());

-- Users can only create sightings attributed to themselves
drop policy if exists "Authenticated users can create sightings" on public.warden_sightings;
drop policy if exists "Users can create own sightings" on public.warden_sightings;
create policy "Users can create own sightings"
on public.warden_sightings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sightings" on public.warden_sightings;
create policy "Users can delete own sightings"
on public.warden_sightings for delete
to authenticated
using (auth.uid() = user_id);

-- Realtime: ensure warden_sightings is published (001 adds it; this keeps re-runs idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'warden_sightings'
  ) then
    alter publication supabase_realtime add table public.warden_sightings;
  end if;
end;
$$;
