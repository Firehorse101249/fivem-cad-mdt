-- System-wide settings for Sentinel CAD/MDT.
-- Run in Supabase SQL Editor after the profiles/RLS helper script.

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.system_settings (key, value)
values (
  'maintenance_mode',
  '{"enabled": false, "message": "System temporarily offline for development"}'::jsonb
)
on conflict (key) do nothing;

alter table public.system_settings enable row level security;

drop policy if exists "system_settings_admin_select" on public.system_settings;
create policy "system_settings_admin_select"
on public.system_settings for select
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists "system_settings_admin_update" on public.system_settings;
create policy "system_settings_admin_update"
on public.system_settings for update
to authenticated
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

drop policy if exists "system_settings_admin_insert" on public.system_settings;
create policy "system_settings_admin_insert"
on public.system_settings for insert
to authenticated
with check (public.get_my_role() = 'admin');

comment on table public.system_settings is
  'Admin-controlled system settings. Do not expose sensitive values here; service-role access bypasses RLS.';
