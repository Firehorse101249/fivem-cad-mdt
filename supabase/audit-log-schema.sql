-- Audit log schema for Sentinel CAD/MDT.
-- Safe to run in Supabase SQL Editor. Uses additive CREATE/ALTER/INDEX work
-- and conditional trigger creation; it does not drop tables or delete data.
--
-- Run supabase/rls-policies.sql first so public.get_my_role() exists.
-- Run supabase/civilian-schema.sql before this if you want character triggers
-- attached immediately. You can rerun this file after adding those tables.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  target_user_id uuid,
  target_civilian_id uuid,
  summary text not null,
  severity text not null default 'info',
  source text not null default 'app',
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  before_data jsonb,
  after_data jsonb
);

alter table if exists public.audit_logs add column if not exists created_at timestamptz not null default now();
alter table if exists public.audit_logs add column if not exists actor_id uuid references auth.users(id) on delete set null;
alter table if exists public.audit_logs add column if not exists actor_email text;
alter table if exists public.audit_logs add column if not exists event_type text;
alter table if exists public.audit_logs add column if not exists entity_type text;
alter table if exists public.audit_logs add column if not exists entity_id text;
alter table if exists public.audit_logs add column if not exists target_user_id uuid;
alter table if exists public.audit_logs add column if not exists target_civilian_id uuid;
alter table if exists public.audit_logs add column if not exists summary text;
alter table if exists public.audit_logs add column if not exists severity text not null default 'info';
alter table if exists public.audit_logs add column if not exists source text not null default 'app';
alter table if exists public.audit_logs add column if not exists ip_address inet;
alter table if exists public.audit_logs add column if not exists user_agent text;
alter table if exists public.audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.audit_logs add column if not exists before_data jsonb;
alter table if exists public.audit_logs add column if not exists after_data jsonb;

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_target_user_id_idx on public.audit_logs (target_user_id);
create index if not exists audit_logs_target_civilian_id_idx on public.audit_logs (target_civilian_id);
create index if not exists audit_logs_event_type_idx on public.audit_logs (event_type);
create index if not exists audit_logs_entity_type_idx on public.audit_logs (entity_type);

alter table public.audit_logs enable row level security;

comment on table public.audit_logs is
  'Admin-visible immutable event stream for users, civilians, vehicles, licenses, records, settings, and other sensitive CAD/MDT changes.';

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_admin_read'
  ) then
    create policy "audit_logs_admin_read"
    on public.audit_logs for select
    to authenticated
    using (public.get_my_role() = 'admin');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_admin_insert'
  ) then
    create policy "audit_logs_admin_insert"
    on public.audit_logs for insert
    to authenticated
    with check (public.get_my_role() = 'admin');
  end if;
end $$;

create or replace function public.audit_entity_id(row_data jsonb)
returns text
language sql
stable
as $$
  select coalesce(
    row_data ->> 'id',
    row_data ->> 'key',
    row_data ->> 'plate',
    row_data ->> 'email',
    'unknown'
  );
$$;

create or replace function public.audit_uuid_from_json(row_data jsonb, key_name text)
returns uuid
language plpgsql
stable
as $$
declare
  raw_value text;
begin
  raw_value := row_data ->> key_name;

  if raw_value is null or raw_value = '' then
    return null;
  end if;

  return raw_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.audit_event_type(table_name text, operation text)
returns text
language sql
stable
as $$
  select case table_name
    when 'profiles' then
      case operation when 'INSERT' then 'user_profile_created' when 'UPDATE' then 'user_profile_updated' else 'user_profile_deleted' end
    when 'civilian_profiles' then
      case operation when 'INSERT' then 'civilian_profile_created' when 'UPDATE' then 'civilian_profile_updated' else 'civilian_profile_deleted' end
    when 'civilian_licenses' then
      case operation when 'INSERT' then 'civilian_license_created' when 'UPDATE' then 'civilian_license_updated' else 'civilian_license_deleted' end
    when 'civilian_vehicles' then
      case operation when 'INSERT' then 'civilian_vehicle_created' when 'UPDATE' then 'civilian_vehicle_updated' else 'civilian_vehicle_deleted' end
    when 'civilian_images' then
      case operation when 'INSERT' then 'civilian_image_created' when 'UPDATE' then 'civilian_image_updated' else 'civilian_image_deleted' end
    when 'civilian_records' then
      case operation when 'INSERT' then 'civilian_record_created' when 'UPDATE' then 'civilian_record_updated' else 'civilian_record_deleted' end
    when 'system_settings' then 'system_setting_changed'
    else lower(table_name || '_' || operation)
  end;
$$;

create or replace function public.write_table_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_data jsonb;
  new_data jsonb;
  row_data jsonb;
  audit_actor uuid;
  audit_target_user uuid;
  audit_target_civilian uuid;
  audit_entity text;
begin
  if TG_OP = 'DELETE' then
    old_data := to_jsonb(OLD);
    row_data := old_data;
  else
    new_data := to_jsonb(NEW);
    row_data := new_data;
  end if;

  audit_actor := auth.uid();
  audit_entity := public.audit_entity_id(row_data);

  audit_target_user := case
    when TG_TABLE_NAME = 'profiles' then public.audit_uuid_from_json(row_data, 'id')
    when row_data ? 'owner_id' then public.audit_uuid_from_json(row_data, 'owner_id')
    when row_data ? 'updated_by' then public.audit_uuid_from_json(row_data, 'updated_by')
    else null
  end;

  audit_target_civilian := case
    when TG_TABLE_NAME = 'civilian_profiles' then public.audit_uuid_from_json(row_data, 'id')
    when row_data ? 'civilian_id' then public.audit_uuid_from_json(row_data, 'civilian_id')
    else null
  end;

  insert into public.audit_logs (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    target_user_id,
    target_civilian_id,
    summary,
    source,
    metadata,
    before_data,
    after_data
  )
  values (
    audit_actor,
    public.audit_event_type(TG_TABLE_NAME, TG_OP),
    TG_TABLE_NAME,
    audit_entity,
    audit_target_user,
    audit_target_civilian,
    initcap(replace(TG_TABLE_NAME, '_', ' ')) || ' ' || lower(TG_OP) || ': ' || audit_entity,
    'database_trigger',
    jsonb_build_object('schema', TG_TABLE_SCHEMA, 'operation', TG_OP),
    old_data,
    new_data
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  return NEW;
end;
$$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'profiles',
    'civilian_profiles',
    'civilian_licenses',
    'civilian_vehicles',
    'civilian_images',
    'civilian_records',
    'system_settings'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      trigger_name := 'audit_' || table_name || '_changes';

      if not exists (
        select 1
        from pg_trigger
        where tgname = trigger_name
          and tgrelid = ('public.' || table_name)::regclass
      ) then
        execute format(
          'create trigger %I after insert or update or delete on public.%I for each row execute function public.write_table_audit_log()',
          trigger_name,
          table_name
        );
      end if;
    end if;
  end loop;
end $$;
