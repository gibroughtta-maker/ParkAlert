-- Create the parking tables used by src/services/warden.ts and src/types/database.ts.
-- Must run before 003_harden_rls_and_grants.sql, which alters these tables.
-- Supabase CLI applies migrations in filename order and needs a numeric prefix:
-- "0025_" sorts after 001_ (profiles) and before 002_/003_, so 003 finds these tables.

create table if not exists public.parking_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  alert_radius integer not null default 150,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  parking_location_id uuid not null references public.parking_locations (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  alert_count integer not null default 0
);

create table if not exists public.alert_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  parking_location_id uuid not null references public.parking_locations (id) on delete cascade,
  distance double precision not null,
  alert_type text not null check (alert_type in ('distance', 'time')),
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_parking_locations_user_active
  on public.parking_locations (user_id, is_active, created_at desc);
create index if not exists idx_parking_sessions_user on public.parking_sessions (user_id);
create index if not exists idx_parking_sessions_location on public.parking_sessions (parking_location_id);
create index if not exists idx_alert_logs_user on public.alert_logs (user_id);
create index if not exists idx_alert_logs_location on public.alert_logs (parking_location_id);

-- Keep parking_locations.updated_at current
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

drop trigger if exists set_parking_locations_updated_at on public.parking_locations;
create trigger set_parking_locations_updated_at
  before update on public.parking_locations
  for each row execute function public.set_updated_at();

-- RLS is enabled here so the tables are never exposed without policies;
-- 003_harden_rls_and_grants.sql adds the per-user policies and grants.
alter table public.parking_locations enable row level security;
alter table public.parking_sessions enable row level security;
alter table public.alert_logs enable row level security;
