-- Starter Row Level Security setup for Sentinel CAD/MDT.
-- Run this in the Supabase SQL Editor for your project.
-- The service-role key bypasses RLS entirely, so keep it server-only.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'civilian'
    check (role in ('admin', 'dispatch', 'officer', 'civilian')),
  display_name text,
  created_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists email text;

alter table if exists public.profiles
  add column if not exists role text not null default 'civilian';

alter table if exists public.profiles
  add column if not exists display_name text;

alter table if exists public.profiles
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('admin', 'dispatch', 'officer', 'civilian'));
  end if;
end $$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    'civilian'
  );
$$;

comment on function public.get_my_role() is
  'Returns the current authenticated user role from public.profiles. SECURITY DEFINER avoids profile-policy recursion; keep search_path pinned.';

create table if not exists public.civilians (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plate text,
  make text,
  model text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.warrants (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  subject_name text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bolos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  civilian_id uuid references public.civilians(id) on delete set null,
  offense text,
  fine numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arrests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  civilian_id uuid references public.civilians(id) on delete set null,
  charges text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text,
  narrative text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispatch_calls (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  call_type text,
  location text,
  description text,
  status text not null default 'open',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.civilians
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table if exists public.vehicles
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table if exists public.warrants
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table if exists public.bolos
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table if exists public.citations
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table if exists public.arrests
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table if exists public.reports
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table if exists public.dispatch_calls
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.profiles enable row level security;
alter table public.civilians enable row level security;
alter table public.vehicles enable row level security;
alter table public.warrants enable row level security;
alter table public.bolos enable row level security;
alter table public.citations enable row level security;
alter table public.arrests enable row level security;
alter table public.reports enable row level security;
alter table public.dispatch_calls enable row level security;

create index if not exists profiles_id_idx on public.profiles (id);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists civilians_owner_id_idx on public.civilians (owner_id);
create index if not exists vehicles_owner_id_idx on public.vehicles (owner_id);
create index if not exists reports_created_by_idx on public.reports (created_by);
create index if not exists citations_created_by_idx on public.citations (created_by);
create index if not exists arrests_created_by_idx on public.arrests (created_by);
create index if not exists bolos_created_by_idx on public.bolos (created_by);
create index if not exists dispatch_calls_created_by_idx on public.dispatch_calls (created_by);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own_safe_fields" on public.profiles;
create policy "profiles_update_own_safe_fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = public.get_my_role()
);

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
on public.profiles for select
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists "profiles_admin_update_roles" on public.profiles;
create policy "profiles_admin_update_roles"
on public.profiles for update
to authenticated
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles for insert
to authenticated
with check (public.get_my_role() = 'admin');

drop policy if exists "civilians_staff_read" on public.civilians;
create policy "civilians_staff_read"
on public.civilians for select
to authenticated
using (public.get_my_role() in ('admin', 'dispatch', 'officer'));

drop policy if exists "civilians_owner_read" on public.civilians;
create policy "civilians_owner_read"
on public.civilians for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "civilians_owner_insert" on public.civilians;
create policy "civilians_owner_insert"
on public.civilians for insert
to authenticated
with check (owner_id = auth.uid() or public.get_my_role() in ('admin', 'dispatch'));

drop policy if exists "civilians_owner_update" on public.civilians;
create policy "civilians_owner_update"
on public.civilians for update
to authenticated
using (owner_id = auth.uid() or public.get_my_role() in ('admin', 'dispatch'))
with check (owner_id = auth.uid() or public.get_my_role() in ('admin', 'dispatch'));

drop policy if exists "civilians_admin_delete" on public.civilians;
create policy "civilians_admin_delete"
on public.civilians for delete
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists "vehicles_staff_read" on public.vehicles;
create policy "vehicles_staff_read"
on public.vehicles for select
to authenticated
using (public.get_my_role() in ('admin', 'dispatch', 'officer'));

drop policy if exists "vehicles_owner_read" on public.vehicles;
create policy "vehicles_owner_read"
on public.vehicles for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "vehicles_owner_insert" on public.vehicles;
create policy "vehicles_owner_insert"
on public.vehicles for insert
to authenticated
with check (owner_id = auth.uid() or public.get_my_role() in ('admin', 'dispatch'));

drop policy if exists "vehicles_owner_update" on public.vehicles;
create policy "vehicles_owner_update"
on public.vehicles for update
to authenticated
using (owner_id = auth.uid() or public.get_my_role() in ('admin', 'dispatch'))
with check (owner_id = auth.uid() or public.get_my_role() in ('admin', 'dispatch'));

drop policy if exists "vehicles_admin_delete" on public.vehicles;
create policy "vehicles_admin_delete"
on public.vehicles for delete
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists "warrants_staff_read" on public.warrants;
create policy "warrants_staff_read"
on public.warrants for select
to authenticated
using (public.get_my_role() in ('admin', 'dispatch', 'officer'));

drop policy if exists "warrants_admin_dispatch_write" on public.warrants;
create policy "warrants_admin_dispatch_write"
on public.warrants for all
to authenticated
using (public.get_my_role() in ('admin', 'dispatch'))
with check (public.get_my_role() in ('admin', 'dispatch'));

drop policy if exists "bolos_staff_read" on public.bolos;
create policy "bolos_staff_read"
on public.bolos for select
to authenticated
using (public.get_my_role() in ('admin', 'dispatch', 'officer'));

drop policy if exists "bolos_officer_insert" on public.bolos;
create policy "bolos_officer_insert"
on public.bolos for insert
to authenticated
with check (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
);

drop policy if exists "bolos_officer_update_own" on public.bolos;
create policy "bolos_officer_update_own"
on public.bolos for update
to authenticated
using (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
)
with check (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
);

drop policy if exists "bolos_admin_delete" on public.bolos;
create policy "bolos_admin_delete"
on public.bolos for delete
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists "reports_staff_read" on public.reports;
create policy "reports_staff_read"
on public.reports for select
to authenticated
using (public.get_my_role() in ('admin', 'dispatch', 'officer'));

drop policy if exists "reports_officer_insert" on public.reports;
create policy "reports_officer_insert"
on public.reports for insert
to authenticated
with check (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
);

drop policy if exists "reports_officer_update_own" on public.reports;
create policy "reports_officer_update_own"
on public.reports for update
to authenticated
using (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
)
with check (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
);

drop policy if exists "reports_admin_delete" on public.reports;
create policy "reports_admin_delete"
on public.reports for delete
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists "citations_staff_read" on public.citations;
create policy "citations_staff_read"
on public.citations for select
to authenticated
using (public.get_my_role() in ('admin', 'dispatch', 'officer'));

drop policy if exists "citations_officer_insert" on public.citations;
create policy "citations_officer_insert"
on public.citations for insert
to authenticated
with check (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
);

drop policy if exists "citations_officer_update_own" on public.citations;
create policy "citations_officer_update_own"
on public.citations for update
to authenticated
using (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
)
with check (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
);

drop policy if exists "citations_admin_delete" on public.citations;
create policy "citations_admin_delete"
on public.citations for delete
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists "arrests_staff_read" on public.arrests;
create policy "arrests_staff_read"
on public.arrests for select
to authenticated
using (public.get_my_role() in ('admin', 'dispatch', 'officer'));

drop policy if exists "arrests_officer_insert" on public.arrests;
create policy "arrests_officer_insert"
on public.arrests for insert
to authenticated
with check (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
);

drop policy if exists "arrests_officer_update_own" on public.arrests;
create policy "arrests_officer_update_own"
on public.arrests for update
to authenticated
using (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
)
with check (
  public.get_my_role() in ('admin', 'dispatch')
  or (public.get_my_role() = 'officer' and created_by = auth.uid())
);

drop policy if exists "arrests_admin_delete" on public.arrests;
create policy "arrests_admin_delete"
on public.arrests for delete
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists "dispatch_calls_staff_read" on public.dispatch_calls;
create policy "dispatch_calls_staff_read"
on public.dispatch_calls for select
to authenticated
using (public.get_my_role() in ('admin', 'dispatch', 'officer'));

drop policy if exists "dispatch_calls_dispatch_write" on public.dispatch_calls;
create policy "dispatch_calls_dispatch_write"
on public.dispatch_calls for all
to authenticated
using (public.get_my_role() in ('admin', 'dispatch'))
with check (public.get_my_role() in ('admin', 'dispatch'));

drop policy if exists "dispatch_calls_officer_update_readable" on public.dispatch_calls;
create policy "dispatch_calls_officer_update_readable"
on public.dispatch_calls for update
to authenticated
using (public.get_my_role() = 'officer')
with check (public.get_my_role() = 'officer');
