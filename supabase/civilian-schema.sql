-- Civilian portal schema prep for Sentinel CAD/MDT.
-- Safe to run in Supabase SQL Editor. This file uses CREATE TABLE IF NOT EXISTS,
-- ALTER TABLE ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, and
-- conditional policy creation. It does not drop tables or delete data.
--
-- Run supabase/rls-policies.sql first so public.get_my_role() exists.

create table if not exists public.civilian_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  date_of_birth date,
  gender text,
  height text,
  weight text,
  address text,
  phone text,
  occupation text,
  emergency_contact text,
  notes text,
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.civilian_profiles add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.civilian_profiles add column if not exists first_name text;
alter table if exists public.civilian_profiles add column if not exists last_name text;
alter table if exists public.civilian_profiles add column if not exists date_of_birth date;
alter table if exists public.civilian_profiles add column if not exists gender text;
alter table if exists public.civilian_profiles add column if not exists height text;
alter table if exists public.civilian_profiles add column if not exists weight text;
alter table if exists public.civilian_profiles add column if not exists address text;
alter table if exists public.civilian_profiles add column if not exists phone text;
alter table if exists public.civilian_profiles add column if not exists occupation text;
alter table if exists public.civilian_profiles add column if not exists emergency_contact text;
alter table if exists public.civilian_profiles add column if not exists notes text;
alter table if exists public.civilian_profiles add column if not exists profile_image_url text;
alter table if exists public.civilian_profiles add column if not exists created_at timestamptz not null default now();
alter table if exists public.civilian_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.civilian_licenses (
  id uuid primary key default gen_random_uuid(),
  civilian_id uuid not null references public.civilian_profiles(id) on delete cascade,
  license_type text,
  status text not null default 'None',
  issued_at timestamptz,
  expires_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table if exists public.civilian_licenses add column if not exists civilian_id uuid references public.civilian_profiles(id) on delete cascade;
alter table if exists public.civilian_licenses add column if not exists license_type text;
alter table if exists public.civilian_licenses add column if not exists status text not null default 'None';
alter table if exists public.civilian_licenses add column if not exists issued_at timestamptz;
alter table if exists public.civilian_licenses add column if not exists expires_at timestamptz;
alter table if exists public.civilian_licenses add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table if exists public.civilian_licenses add column if not exists created_at timestamptz not null default now();

create table if not exists public.civilian_vehicles (
  id uuid primary key default gen_random_uuid(),
  civilian_id uuid not null references public.civilian_profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plate text,
  make text,
  model text,
  color text,
  year int,
  vin text,
  insurance_status text,
  registration_status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.civilian_vehicles add column if not exists civilian_id uuid references public.civilian_profiles(id) on delete cascade;
alter table if exists public.civilian_vehicles add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.civilian_vehicles add column if not exists plate text;
alter table if exists public.civilian_vehicles add column if not exists make text;
alter table if exists public.civilian_vehicles add column if not exists model text;
alter table if exists public.civilian_vehicles add column if not exists color text;
alter table if exists public.civilian_vehicles add column if not exists year int;
alter table if exists public.civilian_vehicles add column if not exists vin text;
alter table if exists public.civilian_vehicles add column if not exists insurance_status text;
alter table if exists public.civilian_vehicles add column if not exists registration_status text;
alter table if exists public.civilian_vehicles add column if not exists notes text;
alter table if exists public.civilian_vehicles add column if not exists created_at timestamptz not null default now();
alter table if exists public.civilian_vehicles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.civilian_images (
  id uuid primary key default gen_random_uuid(),
  civilian_id uuid not null references public.civilian_profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  image_type text,
  image_url text,
  storage_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.civilian_images add column if not exists civilian_id uuid references public.civilian_profiles(id) on delete cascade;
alter table if exists public.civilian_images add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.civilian_images add column if not exists image_type text;
alter table if exists public.civilian_images add column if not exists image_url text;
alter table if exists public.civilian_images add column if not exists storage_path text;
alter table if exists public.civilian_images add column if not exists notes text;
alter table if exists public.civilian_images add column if not exists created_at timestamptz not null default now();
alter table if exists public.civilian_images add column if not exists updated_at timestamptz not null default now();

create table if not exists public.civilian_records (
  id uuid primary key default gen_random_uuid(),
  civilian_id uuid not null references public.civilian_profiles(id) on delete cascade,
  record_type text,
  title text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  visibility text not null default 'officer'
);

alter table if exists public.civilian_records add column if not exists civilian_id uuid references public.civilian_profiles(id) on delete cascade;
alter table if exists public.civilian_records add column if not exists record_type text;
alter table if exists public.civilian_records add column if not exists title text;
alter table if exists public.civilian_records add column if not exists description text;
alter table if exists public.civilian_records add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table if exists public.civilian_records add column if not exists created_at timestamptz not null default now();
alter table if exists public.civilian_records add column if not exists visibility text not null default 'officer';

create index if not exists civilian_profiles_owner_id_idx on public.civilian_profiles (owner_id);
create index if not exists civilian_profiles_name_dob_idx on public.civilian_profiles (last_name, first_name, date_of_birth);
create index if not exists civilian_licenses_civilian_id_idx on public.civilian_licenses (civilian_id);
create index if not exists civilian_licenses_type_status_idx on public.civilian_licenses (license_type, status);
create index if not exists civilian_vehicles_civilian_id_idx on public.civilian_vehicles (civilian_id);
create index if not exists civilian_vehicles_owner_id_idx on public.civilian_vehicles (owner_id);
create index if not exists civilian_vehicles_plate_idx on public.civilian_vehicles (plate);
create index if not exists civilian_images_civilian_id_idx on public.civilian_images (civilian_id);
create index if not exists civilian_records_civilian_id_idx on public.civilian_records (civilian_id);
create index if not exists civilian_records_type_idx on public.civilian_records (record_type);

alter table public.civilian_profiles enable row level security;
alter table public.civilian_licenses enable row level security;
alter table public.civilian_vehicles enable row level security;
alter table public.civilian_images enable row level security;
alter table public.civilian_records enable row level security;

comment on table public.civilian_profiles is
  'Civilian profiles intended to be searchable by MDT and dispatch lookup modules.';
comment on table public.civilian_vehicles is
  'Civilian vehicle registrations intended for MDT and dispatch plate lookup modules.';
comment on table public.civilian_records is
  'Read-only civilian-facing record summaries. Officer/admin systems own arrest, citation, warrant, BOLO, and history updates.';

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_profiles' and policyname = 'civilian_profiles_owner_read') then
    create policy "civilian_profiles_owner_read" on public.civilian_profiles for select to authenticated using (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_profiles' and policyname = 'civilian_profiles_owner_insert') then
    create policy "civilian_profiles_owner_insert" on public.civilian_profiles for insert to authenticated with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_profiles' and policyname = 'civilian_profiles_owner_update') then
    create policy "civilian_profiles_owner_update" on public.civilian_profiles for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_profiles' and policyname = 'civilian_profiles_staff_read') then
    create policy "civilian_profiles_staff_read" on public.civilian_profiles for select to authenticated using (public.get_my_role() in ('admin', 'dispatch', 'officer'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_profiles' and policyname = 'civilian_profiles_admin_all') then
    create policy "civilian_profiles_admin_all" on public.civilian_profiles for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_licenses' and policyname = 'civilian_licenses_owner_read') then
    create policy "civilian_licenses_owner_read" on public.civilian_licenses for select to authenticated using (
      exists (select 1 from public.civilian_profiles cp where cp.id = civilian_id and cp.owner_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_licenses' and policyname = 'civilian_licenses_owner_insert') then
    create policy "civilian_licenses_owner_insert" on public.civilian_licenses for insert to authenticated with check (
      exists (select 1 from public.civilian_profiles cp where cp.id = civilian_id and cp.owner_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_licenses' and policyname = 'civilian_licenses_owner_update') then
    create policy "civilian_licenses_owner_update" on public.civilian_licenses for update to authenticated using (
      exists (select 1 from public.civilian_profiles cp where cp.id = civilian_id and cp.owner_id = auth.uid())
    ) with check (
      exists (select 1 from public.civilian_profiles cp where cp.id = civilian_id and cp.owner_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_licenses' and policyname = 'civilian_licenses_staff_read_update') then
    create policy "civilian_licenses_staff_read_update" on public.civilian_licenses for all to authenticated using (public.get_my_role() in ('admin', 'dispatch', 'officer')) with check (public.get_my_role() in ('admin', 'dispatch', 'officer'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_vehicles' and policyname = 'civilian_vehicles_owner_read') then
    create policy "civilian_vehicles_owner_read" on public.civilian_vehicles for select to authenticated using (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_vehicles' and policyname = 'civilian_vehicles_owner_insert') then
    create policy "civilian_vehicles_owner_insert" on public.civilian_vehicles for insert to authenticated with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_vehicles' and policyname = 'civilian_vehicles_owner_update') then
    create policy "civilian_vehicles_owner_update" on public.civilian_vehicles for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_vehicles' and policyname = 'civilian_vehicles_staff_read') then
    create policy "civilian_vehicles_staff_read" on public.civilian_vehicles for select to authenticated using (public.get_my_role() in ('admin', 'dispatch', 'officer'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_vehicles' and policyname = 'civilian_vehicles_admin_all') then
    create policy "civilian_vehicles_admin_all" on public.civilian_vehicles for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_images' and policyname = 'civilian_images_owner_manage') then
    create policy "civilian_images_owner_manage" on public.civilian_images for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_images' and policyname = 'civilian_images_staff_read') then
    create policy "civilian_images_staff_read" on public.civilian_images for select to authenticated using (public.get_my_role() in ('admin', 'dispatch', 'officer'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_records' and policyname = 'civilian_records_owner_visible_read') then
    create policy "civilian_records_owner_visible_read" on public.civilian_records for select to authenticated using (
      visibility in ('civilian', 'officer')
      and exists (select 1 from public.civilian_profiles cp where cp.id = civilian_id and cp.owner_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_records' and policyname = 'civilian_records_staff_read') then
    create policy "civilian_records_staff_read" on public.civilian_records for select to authenticated using (public.get_my_role() in ('admin', 'dispatch', 'officer'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_records' and policyname = 'civilian_records_officer_admin_insert') then
    create policy "civilian_records_officer_admin_insert" on public.civilian_records for insert to authenticated with check (
      public.get_my_role() in ('admin', 'officer')
      and created_by = auth.uid()
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'civilian_records' and policyname = 'civilian_records_admin_all') then
    create policy "civilian_records_admin_all" on public.civilian_records for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
  end if;
end $$;
