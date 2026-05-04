-- Starter dispatch schema for Sentinel CAD/MDT.
-- Safe to run in Supabase SQL Editor. Uses CREATE TABLE IF NOT EXISTS and
-- ALTER TABLE ADD COLUMN IF NOT EXISTS; it does not drop or truncate data.
--
-- Run supabase/rls-policies.sql first so public.get_my_role() exists.

create table if not exists public.dispatch_calls (
  id uuid primary key default gen_random_uuid(),
  call_number text,
  call_type text,
  service_type text,
  priority text not null default 'Medium',
  status text not null default 'Pending',
  location text,
  postal text,
  caller_name text,
  caller_phone text,
  description text,
  involved_persons text,
  involved_vehicles text,
  assigned_units text[] not null default '{}',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.dispatch_calls add column if not exists call_number text;
alter table if exists public.dispatch_calls add column if not exists service_type text;
alter table if exists public.dispatch_calls add column if not exists postal text;
alter table if exists public.dispatch_calls add column if not exists caller_name text;
alter table if exists public.dispatch_calls add column if not exists caller_phone text;
alter table if exists public.dispatch_calls add column if not exists involved_persons text;
alter table if exists public.dispatch_calls add column if not exists involved_vehicles text;
alter table if exists public.dispatch_calls add column if not exists assigned_units text[] not null default '{}';
alter table if exists public.dispatch_calls add column if not exists notes text;
alter table if exists public.dispatch_calls add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.dispatch_call_notes (
  id uuid primary key default gen_random_uuid(),
  dispatch_call_id uuid references public.dispatch_calls(id) on delete cascade,
  message text not null,
  actor_name text,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispatch_units (
  id uuid primary key default gen_random_uuid(),
  callsign text not null,
  agency text,
  unit_type text,
  specialty text,
  status text not null default 'Available',
  current_call_id uuid references public.dispatch_calls(id) on delete set null,
  location text,
  postal text,
  member_name text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bolos (
  id uuid primary key default gen_random_uuid(),
  title text,
  type text,
  description text,
  last_known_location text,
  associated_subject text,
  priority text not null default 'Medium',
  status text not null default 'Active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.bolos add column if not exists type text;
alter table if exists public.bolos add column if not exists last_known_location text;
alter table if exists public.bolos add column if not exists associated_subject text;
alter table if exists public.bolos add column if not exists notes text;
alter table if exists public.bolos add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.weapons (
  id uuid primary key default gen_random_uuid(),
  serial_number text,
  weapon_type text,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'Active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_records (
  id uuid primary key default gen_random_uuid(),
  plate text,
  vin text,
  make text,
  model text,
  color text,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'Active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  license_type text,
  license_number text,
  status text not null default 'Valid',
  expires_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dispatch_calls_status_idx on public.dispatch_calls (status);
create index if not exists dispatch_calls_priority_idx on public.dispatch_calls (priority);
create index if not exists dispatch_calls_created_by_idx on public.dispatch_calls (created_by);
create index if not exists dispatch_call_notes_call_id_idx on public.dispatch_call_notes (dispatch_call_id);
create index if not exists dispatch_units_callsign_idx on public.dispatch_units (callsign);
create index if not exists dispatch_units_status_idx on public.dispatch_units (status);
create index if not exists dispatch_units_current_call_id_idx on public.dispatch_units (current_call_id);
create index if not exists bolos_status_idx on public.bolos (status);
create index if not exists bolos_created_by_idx on public.bolos (created_by);
create index if not exists weapons_serial_number_idx on public.weapons (serial_number);
create index if not exists vehicle_records_plate_idx on public.vehicle_records (plate);
create index if not exists license_records_owner_id_idx on public.license_records (owner_id);

alter table public.dispatch_calls enable row level security;
alter table public.dispatch_call_notes enable row level security;
alter table public.dispatch_units enable row level security;
alter table public.bolos enable row level security;
alter table public.weapons enable row level security;
alter table public.vehicle_records enable row level security;
alter table public.license_records enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatch_calls' and policyname = 'dispatch_calls_staff_read') then
    create policy "dispatch_calls_staff_read" on public.dispatch_calls for select to authenticated using (
      public.get_my_role() in ('admin', 'dispatch', 'officer')
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatch_calls' and policyname = 'dispatch_calls_dispatch_write') then
    create policy "dispatch_calls_dispatch_write" on public.dispatch_calls for all to authenticated using (
      public.get_my_role() in ('admin', 'dispatch')
    ) with check (
      public.get_my_role() in ('admin', 'dispatch')
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatch_calls' and policyname = 'dispatch_calls_officer_update_readable') then
    create policy "dispatch_calls_officer_update_readable" on public.dispatch_calls for update to authenticated using (
      public.get_my_role() = 'officer'
    ) with check (
      public.get_my_role() = 'officer'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatch_units' and policyname = 'dispatch_units_staff_read') then
    create policy "dispatch_units_staff_read" on public.dispatch_units for select to authenticated using (
      public.get_my_role() in ('admin', 'dispatch', 'officer')
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatch_units' and policyname = 'dispatch_units_dispatch_all') then
    create policy "dispatch_units_dispatch_all" on public.dispatch_units for all to authenticated using (
      public.get_my_role() in ('admin', 'dispatch')
    ) with check (
      public.get_my_role() in ('admin', 'dispatch')
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatch_units' and policyname = 'dispatch_units_officer_insert_own') then
    create policy "dispatch_units_officer_insert_own" on public.dispatch_units for insert to authenticated with check (
      public.get_my_role() = 'officer'
      and created_by = auth.uid()
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatch_units' and policyname = 'dispatch_units_officer_update_own') then
    create policy "dispatch_units_officer_update_own" on public.dispatch_units for update to authenticated using (
      public.get_my_role() = 'officer'
      and created_by = auth.uid()
    ) with check (
      public.get_my_role() = 'officer'
      and created_by = auth.uid()
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatch_units' and policyname = 'dispatch_units_officer_delete_own') then
    create policy "dispatch_units_officer_delete_own" on public.dispatch_units for delete to authenticated using (
      public.get_my_role() = 'officer'
      and created_by = auth.uid()
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bolos' and policyname = 'bolos_staff_read') then
    create policy "bolos_staff_read" on public.bolos for select to authenticated using (
      public.get_my_role() in ('admin', 'dispatch', 'officer')
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bolos' and policyname = 'bolos_dispatch_all') then
    create policy "bolos_dispatch_all" on public.bolos for all to authenticated using (
      public.get_my_role() in ('admin', 'dispatch')
    ) with check (
      public.get_my_role() in ('admin', 'dispatch')
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bolos' and policyname = 'bolos_officer_insert_own') then
    create policy "bolos_officer_insert_own" on public.bolos for insert to authenticated with check (
      public.get_my_role() = 'officer'
      and created_by = auth.uid()
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bolos' and policyname = 'bolos_officer_update_own') then
    create policy "bolos_officer_update_own" on public.bolos for update to authenticated using (
      public.get_my_role() = 'officer'
      and created_by = auth.uid()
    ) with check (
      public.get_my_role() = 'officer'
      and created_by = auth.uid()
    );
  end if;
end $$;
