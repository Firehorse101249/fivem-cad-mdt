-- Department, FTO, and partner-session additions for Sentinel CAD/MDT.
-- Safe to run multiple times. This file only creates/adds/upserts data.
-- Run after supabase/membership-access-schema.sql and supabase/dispatch-schema.sql.

create table if not exists public.access_departments (
  key text primary key,
  name text not null unique,
  category text not null default 'department',
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table if exists public.access_roles add column if not exists department_key text references public.access_departments(key) on delete set null;
alter table if exists public.access_roles add column if not exists rank_order integer;
alter table if exists public.access_roles add column if not exists role_kind text not null default 'general'
  check (role_kind in ('system', 'rank', 'general'));

alter table if exists public.access_certifications add column if not exists department_key text references public.access_departments(key) on delete set null;
alter table if exists public.access_certifications add column if not exists certification_kind text not null default 'certification'
  check (certification_kind in ('subdivision', 'perk', 'certification', 'tier'));

create index if not exists access_roles_department_idx on public.access_roles (department_key, rank_order);
create index if not exists access_certifications_department_idx on public.access_certifications (department_key, certification_kind);

insert into public.access_permissions (key, label, category, description) values
  ('departments:manage', 'Manage departments', 'access', 'Manage department, rank, and subdivision access.'),
  ('fto:manage', 'Manage FTO program', 'training', 'Manage FTO templates, assignments, notes, and trainee progress.'),
  ('cad:fto', 'FTO MDT', 'cad', 'Use the FTO MDT workspace.'),
  ('reports:write', 'Write reports', 'cad', 'Create and update CAD/MDT reports.'),
  ('reports:review', 'Review reports', 'cad', 'Review saved CAD/MDT reports.')
on conflict (key) do update set
  label = excluded.label,
  category = excluded.category,
  description = excluded.description;

insert into public.access_departments (key, name, category, description, sort_order) values
  ('sasp', 'San Andreas State Police', 'law_enforcement', 'Statewide enforcement and highways.', 10),
  ('bcso', 'Blaine County Sheriff''s Office', 'law_enforcement', 'County and rural operations.', 20),
  ('lspd', 'Los Santos Police Department', 'law_enforcement', 'City policing.', 30),
  ('fib', 'Federal Bureau of Investigation', 'law_enforcement', 'Federal investigations.', 40),
  ('lsfd', 'Los Santos Fire Department', 'fire', 'Fire suppression and rescue.', 50),
  ('saems', 'San Andreas Emergency Medical Services', 'ems', 'Emergency medical services.', 60),
  ('sacom', 'San Andreas Communications', 'dispatch', 'Dispatch backbone.', 70),
  ('satr', 'San Andreas Towing and Recovery', 'services', 'Towing and services.', 80),
  ('civilian', 'Civilian Operations', 'civilian', 'Civilian progression tiers.', 90),
  ('doj', 'Department of Justice', 'government', 'Courts and legal system.', 100),
  ('government', 'Governor''s Office', 'government', 'State leadership.', 110)
on conflict (key) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

-- Mark existing system roles.
update public.access_roles
set role_kind = case when key in ('founder', 'admin', 'mod', 'member') then 'system' else role_kind end
where key in ('founder', 'admin', 'mod', 'member');

insert into public.access_roles (key, name, description, priority, is_system, is_founder, department_key, rank_order, role_kind) values
  ('sasp_cadet', 'SASP Cadet', 'San Andreas State Police rank.', 110, false, false, 'sasp', 10, 'rank'),
  ('sasp_trooper', 'SASP Trooper', 'San Andreas State Police rank.', 120, false, false, 'sasp', 20, 'rank'),
  ('sasp_trooper_first_class', 'SASP Trooper First Class', 'San Andreas State Police rank.', 130, false, false, 'sasp', 30, 'rank'),
  ('sasp_senior_trooper', 'SASP Senior Trooper', 'San Andreas State Police rank.', 140, false, false, 'sasp', 40, 'rank'),
  ('sasp_corporal', 'SASP Corporal', 'San Andreas State Police rank.', 150, false, false, 'sasp', 50, 'rank'),
  ('sasp_sergeant', 'SASP Sergeant', 'San Andreas State Police rank.', 160, false, false, 'sasp', 60, 'rank'),
  ('sasp_staff_sergeant', 'SASP Staff Sergeant', 'San Andreas State Police rank.', 170, false, false, 'sasp', 70, 'rank'),
  ('sasp_lieutenant', 'SASP Lieutenant', 'San Andreas State Police rank.', 180, false, false, 'sasp', 80, 'rank'),
  ('sasp_captain', 'SASP Captain', 'San Andreas State Police rank.', 190, false, false, 'sasp', 90, 'rank'),
  ('sasp_major', 'SASP Major', 'San Andreas State Police rank.', 200, false, false, 'sasp', 100, 'rank'),
  ('sasp_lieutenant_colonel', 'SASP Lieutenant Colonel', 'San Andreas State Police rank.', 210, false, false, 'sasp', 110, 'rank'),
  ('sasp_colonel', 'SASP Colonel', 'San Andreas State Police command rank.', 220, false, false, 'sasp', 120, 'rank'),
  ('bcso_cadet', 'BCSO Cadet', 'Blaine County Sheriff''s Office rank.', 110, false, false, 'bcso', 10, 'rank'),
  ('bcso_deputy_sheriff', 'BCSO Deputy Sheriff', 'Blaine County Sheriff''s Office rank.', 120, false, false, 'bcso', 20, 'rank'),
  ('bcso_senior_deputy', 'BCSO Senior Deputy', 'Blaine County Sheriff''s Office rank.', 130, false, false, 'bcso', 30, 'rank'),
  ('bcso_master_deputy', 'BCSO Master Deputy', 'Blaine County Sheriff''s Office rank.', 140, false, false, 'bcso', 40, 'rank'),
  ('bcso_corporal', 'BCSO Corporal', 'Blaine County Sheriff''s Office rank.', 150, false, false, 'bcso', 50, 'rank'),
  ('bcso_sergeant', 'BCSO Sergeant', 'Blaine County Sheriff''s Office rank.', 160, false, false, 'bcso', 60, 'rank'),
  ('bcso_staff_sergeant', 'BCSO Staff Sergeant', 'Blaine County Sheriff''s Office rank.', 170, false, false, 'bcso', 70, 'rank'),
  ('bcso_lieutenant', 'BCSO Lieutenant', 'Blaine County Sheriff''s Office rank.', 180, false, false, 'bcso', 80, 'rank'),
  ('bcso_captain', 'BCSO Captain', 'Blaine County Sheriff''s Office rank.', 190, false, false, 'bcso', 90, 'rank'),
  ('bcso_commander', 'BCSO Commander', 'Blaine County Sheriff''s Office rank.', 200, false, false, 'bcso', 100, 'rank'),
  ('bcso_undersheriff', 'BCSO Undersheriff', 'Blaine County Sheriff''s Office rank.', 210, false, false, 'bcso', 110, 'rank'),
  ('bcso_sheriff', 'BCSO Sheriff', 'Blaine County Sheriff''s Office command rank.', 220, false, false, 'bcso', 120, 'rank'),
  ('lspd_recruit', 'LSPD Recruit', 'Los Santos Police Department rank.', 110, false, false, 'lspd', 10, 'rank'),
  ('lspd_officer_i', 'LSPD Officer I', 'Los Santos Police Department rank.', 120, false, false, 'lspd', 20, 'rank'),
  ('lspd_officer_ii', 'LSPD Officer II', 'Los Santos Police Department rank.', 130, false, false, 'lspd', 30, 'rank'),
  ('lspd_officer_iii', 'LSPD Officer III', 'Los Santos Police Department rank.', 140, false, false, 'lspd', 40, 'rank'),
  ('lspd_senior_officer', 'LSPD Senior Officer', 'Los Santos Police Department rank.', 150, false, false, 'lspd', 50, 'rank'),
  ('lspd_fto', 'LSPD Field Training Officer', 'Los Santos Police Department FTO rank.', 160, false, false, 'lspd', 60, 'rank'),
  ('lspd_corporal', 'LSPD Corporal', 'Los Santos Police Department rank.', 170, false, false, 'lspd', 70, 'rank'),
  ('lspd_sergeant', 'LSPD Sergeant', 'Los Santos Police Department rank.', 180, false, false, 'lspd', 80, 'rank'),
  ('lspd_staff_sergeant', 'LSPD Staff Sergeant', 'Los Santos Police Department rank.', 190, false, false, 'lspd', 90, 'rank'),
  ('lspd_lieutenant', 'LSPD Lieutenant', 'Los Santos Police Department rank.', 200, false, false, 'lspd', 100, 'rank'),
  ('lspd_captain', 'LSPD Captain', 'Los Santos Police Department rank.', 210, false, false, 'lspd', 110, 'rank'),
  ('lspd_commander', 'LSPD Commander', 'Los Santos Police Department rank.', 220, false, false, 'lspd', 120, 'rank'),
  ('lspd_deputy_chief', 'LSPD Deputy Chief', 'Los Santos Police Department command rank.', 230, false, false, 'lspd', 130, 'rank'),
  ('lspd_assistant_chief', 'LSPD Assistant Chief', 'Los Santos Police Department command rank.', 240, false, false, 'lspd', 140, 'rank'),
  ('lspd_chief', 'LSPD Chief of Police', 'Los Santos Police Department command rank.', 250, false, false, 'lspd', 150, 'rank'),
  ('fib_trainee_agent', 'FIB Trainee Agent', 'Federal Bureau of Investigation rank.', 110, false, false, 'fib', 10, 'rank'),
  ('fib_special_agent', 'FIB Special Agent', 'Federal Bureau of Investigation rank.', 120, false, false, 'fib', 20, 'rank'),
  ('fib_senior_special_agent', 'FIB Senior Special Agent', 'Federal Bureau of Investigation rank.', 130, false, false, 'fib', 30, 'rank'),
  ('fib_supervisory_special_agent', 'FIB Supervisory Special Agent', 'Federal Bureau of Investigation rank.', 140, false, false, 'fib', 40, 'rank'),
  ('fib_asac', 'FIB Assistant Special Agent in Charge', 'Federal Bureau of Investigation rank.', 150, false, false, 'fib', 50, 'rank'),
  ('fib_sac', 'FIB Special Agent in Charge', 'Federal Bureau of Investigation rank.', 160, false, false, 'fib', 60, 'rank'),
  ('fib_deputy_director', 'FIB Deputy Director', 'Federal Bureau of Investigation command rank.', 170, false, false, 'fib', 70, 'rank'),
  ('fib_director', 'FIB Director', 'Federal Bureau of Investigation command rank.', 180, false, false, 'fib', 80, 'rank'),
  ('lsfd_probationary_firefighter_emt', 'LSFD Probationary Firefighter/EMT', 'Los Santos Fire Department rank.', 110, false, false, 'lsfd', 10, 'rank'),
  ('lsfd_firefighter_emt', 'LSFD Firefighter/EMT', 'Los Santos Fire Department rank.', 120, false, false, 'lsfd', 20, 'rank'),
  ('lsfd_paramedic', 'LSFD Paramedic', 'Los Santos Fire Department rank.', 130, false, false, 'lsfd', 30, 'rank'),
  ('lsfd_senior_firefighter', 'LSFD Senior Firefighter', 'Los Santos Fire Department rank.', 140, false, false, 'lsfd', 40, 'rank'),
  ('lsfd_engineer', 'LSFD Engineer', 'Los Santos Fire Department rank.', 150, false, false, 'lsfd', 50, 'rank'),
  ('lsfd_lieutenant', 'LSFD Lieutenant', 'Los Santos Fire Department rank.', 160, false, false, 'lsfd', 60, 'rank'),
  ('lsfd_captain', 'LSFD Captain', 'Los Santos Fire Department rank.', 170, false, false, 'lsfd', 70, 'rank'),
  ('lsfd_battalion_chief', 'LSFD Battalion Chief', 'Los Santos Fire Department rank.', 180, false, false, 'lsfd', 80, 'rank'),
  ('lsfd_division_chief', 'LSFD Division Chief', 'Los Santos Fire Department rank.', 190, false, false, 'lsfd', 90, 'rank'),
  ('lsfd_assistant_chief', 'LSFD Assistant Chief', 'Los Santos Fire Department command rank.', 200, false, false, 'lsfd', 100, 'rank'),
  ('lsfd_deputy_chief', 'LSFD Deputy Chief', 'Los Santos Fire Department command rank.', 210, false, false, 'lsfd', 110, 'rank'),
  ('lsfd_fire_chief', 'LSFD Fire Chief', 'Los Santos Fire Department command rank.', 220, false, false, 'lsfd', 120, 'rank'),
  ('saems_emt', 'SAEMS EMT', 'San Andreas EMS rank.', 110, false, false, 'saems', 10, 'rank'),
  ('saems_paramedic', 'SAEMS Paramedic', 'San Andreas EMS rank.', 120, false, false, 'saems', 20, 'rank'),
  ('saems_senior_paramedic', 'SAEMS Senior Paramedic', 'San Andreas EMS rank.', 130, false, false, 'saems', 30, 'rank'),
  ('saems_field_supervisor', 'SAEMS Field Supervisor', 'San Andreas EMS rank.', 140, false, false, 'saems', 40, 'rank'),
  ('saems_captain', 'SAEMS Captain', 'San Andreas EMS command rank.', 150, false, false, 'saems', 50, 'rank'),
  ('saems_chief', 'SAEMS Chief of EMS', 'San Andreas EMS command rank.', 160, false, false, 'saems', 60, 'rank'),
  ('sacom_dispatcher_trainee', 'SACOM Dispatcher Trainee', 'San Andreas Communications rank.', 110, false, false, 'sacom', 10, 'rank'),
  ('sacom_dispatcher_i', 'SACOM Dispatcher I', 'San Andreas Communications rank.', 120, false, false, 'sacom', 20, 'rank'),
  ('sacom_dispatcher_ii', 'SACOM Dispatcher II', 'San Andreas Communications rank.', 130, false, false, 'sacom', 30, 'rank'),
  ('sacom_senior_dispatcher', 'SACOM Senior Dispatcher', 'San Andreas Communications rank.', 140, false, false, 'sacom', 40, 'rank'),
  ('sacom_lead_dispatcher', 'SACOM Lead Dispatcher', 'San Andreas Communications rank.', 150, false, false, 'sacom', 50, 'rank'),
  ('sacom_shift_supervisor', 'SACOM Shift Supervisor', 'San Andreas Communications rank.', 160, false, false, 'sacom', 60, 'rank'),
  ('sacom_communications_supervisor', 'SACOM Communications Supervisor', 'San Andreas Communications rank.', 170, false, false, 'sacom', 70, 'rank'),
  ('sacom_deputy_director', 'SACOM Deputy Director', 'San Andreas Communications command rank.', 180, false, false, 'sacom', 80, 'rank'),
  ('sacom_director', 'SACOM Director', 'San Andreas Communications command rank.', 190, false, false, 'sacom', 90, 'rank')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  priority = excluded.priority,
  department_key = excluded.department_key,
  rank_order = excluded.rank_order,
  role_kind = excluded.role_kind,
  updated_at = now();

insert into public.access_certifications (key, name, description, department_key, certification_kind) values
  ('sasp_traffic_enforcement', 'SASP Traffic Enforcement Unit', 'SASP Highway Patrol subdivision.', 'sasp', 'subdivision'),
  ('sasp_commercial_vehicle_enforcement', 'SASP Commercial Vehicle Enforcement', 'SASP Highway Patrol subdivision.', 'sasp', 'subdivision'),
  ('sasp_dui_task_force', 'SASP DUI Task Force', 'SASP Highway Patrol subdivision.', 'sasp', 'subdivision'),
  ('sasp_sib_major_crimes', 'SASP SIB Major Crimes', 'State Investigations Bureau subdivision.', 'sasp', 'subdivision'),
  ('sasp_sib_narcotics', 'SASP SIB Narcotics', 'State Investigations Bureau subdivision.', 'sasp', 'subdivision'),
  ('sasp_air_operations', 'SASP Air Operations', 'SASP air operations access.', 'sasp', 'subdivision'),
  ('sasp_seu_swat', 'SASP SEU/SWAT', 'SASP tactical operations access.', 'sasp', 'subdivision'),
  ('bcso_rural_enforcement', 'BCSO Rural Enforcement Unit', 'BCSO rural operations access.', 'bcso', 'subdivision'),
  ('bcso_detective_bureau', 'BCSO Detective Bureau', 'BCSO investigations access.', 'bcso', 'subdivision'),
  ('bcso_swat', 'BCSO SWAT', 'BCSO tactical operations access.', 'bcso', 'subdivision'),
  ('bcso_air_support', 'BCSO Air Support', 'BCSO air support access.', 'bcso', 'subdivision'),
  ('lspd_traffic_division', 'LSPD Traffic Division', 'LSPD traffic operations access.', 'lspd', 'subdivision'),
  ('lspd_gang_narcotics', 'LSPD Gang and Narcotics', 'LSPD gang and narcotics operations access.', 'lspd', 'subdivision'),
  ('lspd_detective_bureau', 'LSPD Detective Bureau', 'LSPD investigations access.', 'lspd', 'subdivision'),
  ('lspd_swat', 'LSPD SWAT', 'LSPD tactical operations access.', 'lspd', 'subdivision'),
  ('lspd_air_support', 'LSPD Air Support', 'LSPD air support access.', 'lspd', 'subdivision'),
  ('fib_cid', 'FIB Criminal Investigations Division', 'FIB CID access.', 'fib', 'subdivision'),
  ('fib_counterterrorism', 'FIB Counterterrorism Division', 'FIB counterterrorism access.', 'fib', 'subdivision'),
  ('fib_cyber', 'FIB Cyber Division', 'FIB cyber access.', 'fib', 'subdivision'),
  ('fib_swat_hrt', 'FIB SWAT/HRT', 'FIB tactical operations access.', 'fib', 'subdivision'),
  ('lsfd_fire_suppression', 'LSFD Fire Suppression', 'LSFD fire suppression access.', 'lsfd', 'subdivision'),
  ('lsfd_rescue_division', 'LSFD Rescue Division', 'LSFD rescue access.', 'lsfd', 'subdivision'),
  ('lsfd_hazmat', 'LSFD HazMat Division', 'LSFD HazMat access.', 'lsfd', 'subdivision'),
  ('lsfd_air_rescue', 'LSFD Air Rescue', 'LSFD air rescue access.', 'lsfd', 'subdivision'),
  ('saems_als', 'SAEMS Advanced Life Support', 'EMS ALS certification.', 'saems', 'subdivision'),
  ('saems_bls', 'SAEMS Basic Life Support', 'EMS BLS certification.', 'saems', 'subdivision'),
  ('saems_air_medical', 'SAEMS Air Medical', 'EMS air medical access.', 'saems', 'subdivision'),
  ('saems_field_training', 'SAEMS Field Training', 'EMS field training access.', 'saems', 'subdivision'),
  ('sacom_law_dispatch', 'SACOM Law Enforcement Dispatch', 'Law dispatch access.', 'sacom', 'subdivision'),
  ('sacom_fire_ems_dispatch', 'SACOM Fire and EMS Dispatch', 'Fire and EMS dispatch access.', 'sacom', 'subdivision'),
  ('sacom_tactical_dispatch', 'SACOM Tactical Dispatch', 'Major incident and tactical dispatch access.', 'sacom', 'subdivision'),
  ('satr_light_tow', 'SATR Light Duty Tow', 'Light duty tow access.', 'satr', 'subdivision'),
  ('satr_heavy_recovery', 'SATR Heavy Recovery', 'Heavy recovery access.', 'satr', 'subdivision'),
  ('satr_impound_operations', 'SATR Impound Operations', 'Impound operations access.', 'satr', 'subdivision'),
  ('satr_roadside_assistance', 'SATR Roadside Assistance', 'Roadside assistance access.', 'satr', 'subdivision'),
  ('interviewer', 'Interviewer', 'Can conduct membership interviews.', null, 'perk'),
  ('fto', 'Field Training Officer', 'Can use the FTO MDT and train assigned officers.', null, 'perk'),
  ('civilian_tier_1', 'Civilian Tier 1', 'Basic civilian access.', 'civilian', 'tier'),
  ('civilian_tier_2', 'Civilian Tier 2', 'Established civilian access.', 'civilian', 'tier'),
  ('civilian_tier_3', 'Civilian Tier 3', 'Advanced civilian access.', 'civilian', 'tier'),
  ('civilian_tier_4', 'Civilian Tier 4', 'High-risk civilian access.', 'civilian', 'tier'),
  ('civilian_tier_5', 'Civilian Tier 5', 'Elite civilian access.', 'civilian', 'tier')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  department_key = excluded.department_key,
  certification_kind = excluded.certification_kind,
  updated_at = now();

insert into public.access_certification_permissions (certification_id, permission_key)
select c.id, p.key
from public.access_certifications c
join public.access_permissions p on
  (c.key = 'fto' and p.key in ('cad:access', 'cad:officer', 'cad:fto', 'reports:write'))
  or (c.key = 'interviewer' and p.key in ('admin:access', 'interviews:conduct'))
  or (c.department_key in ('sasp', 'bcso', 'lspd', 'fib') and p.key in ('cad:access', 'cad:officer', 'reports:write'))
  or (c.department_key = 'sacom' and p.key in ('cad:access', 'cad:dispatch'))
  or (c.department_key in ('lsfd', 'saems') and p.key in ('cad:access', 'cad:officer', 'reports:write'))
  or (c.department_key = 'civilian' and p.key in ('cad:access', 'cad:civilian'))
on conflict do nothing;

insert into public.access_role_permissions (role_id, permission_key)
select r.id, p.key
from public.access_roles r
join public.access_permissions p on
  (r.department_key in ('sasp', 'bcso', 'lspd', 'fib') and p.key in ('cad:access', 'cad:officer', 'reports:write'))
  or (r.department_key in ('lsfd', 'saems') and p.key in ('cad:access', 'cad:officer', 'reports:write'))
  or (r.department_key = 'sacom' and p.key in ('cad:access', 'cad:dispatch'))
  or (r.key = 'lspd_fto' and p.key in ('cad:fto', 'fto:manage'))
on conflict do nothing;

insert into public.access_role_permissions (role_id, permission_key)
select r.id, p.key
from public.access_roles r
join public.access_permissions p on p.key in ('departments:manage', 'fto:manage', 'reports:review')
where r.key = 'admin'
on conflict do nothing;

create table if not exists public.fto_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_key text references public.access_departments(key) on delete set null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.fto_checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.fto_checklist_templates(id) on delete cascade,
  category text not null,
  task text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.fto_assignments (
  id uuid primary key default gen_random_uuid(),
  trainee_user_id uuid not null references auth.users(id) on delete cascade,
  fto_user_id uuid references auth.users(id) on delete set null,
  template_id uuid references public.fto_checklist_templates(id) on delete set null,
  department_key text references public.access_departments(key) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'removed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.fto_checklist_progress (
  assignment_id uuid not null references public.fto_assignments(id) on delete cascade,
  item_id uuid not null references public.fto_checklist_items(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'observed', 'needs_remediation', 'complete')),
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, item_id)
);

create table if not exists public.fto_notes (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.fto_assignments(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  note_type text not null default 'note' check (note_type in ('note', 'daily_observation', 'remediation', 'weekly_summary')),
  shift_date date not null default current_date,
  rating integer check (rating is null or (rating >= 1 and rating <= 7)),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists fto_assignments_trainee_idx on public.fto_assignments (trainee_user_id, status);
create index if not exists fto_assignments_fto_idx on public.fto_assignments (fto_user_id, status);
create index if not exists fto_notes_assignment_idx on public.fto_notes (assignment_id, created_at desc);
create unique index if not exists fto_checklist_templates_name_idx on public.fto_checklist_templates (name);

with template as (
  insert into public.fto_checklist_templates (name, department_key, active)
  values ('Default Patrol FTO Checklist', 'lspd', true)
  on conflict do nothing
  returning id
),
selected_template as (
  select id from template
  union all
  select id from public.fto_checklist_templates where name = 'Default Patrol FTO Checklist' limit 1
)
insert into public.fto_checklist_items (template_id, category, task, description, sort_order)
select id, category, task, description, sort_order
from selected_template
cross join (values
  ('Orientation', 'Agency orientation and department policies', 'Reviews agency structure, conduct expectations, forms, and required systems.', 10),
  ('Officer Safety', 'Officer safety procedures', 'Demonstrates safe approach, positioning, scene awareness, backup use, and de-escalation safety.', 20),
  ('Ethics', 'Ethics and professional demeanor', 'Maintains integrity, courtesy, impartiality, and appropriate decision-making.', 30),
  ('Use of Force', 'Use of force policy and articulation', 'Understands force options, reporting requirements, and articulation standards.', 40),
  ('Vehicle Operations', 'Patrol vehicle operations', 'Safely operates patrol vehicle during routine, response, and scene positioning situations.', 50),
  ('Community Relations', 'Community relations', 'Communicates professionally with civilians, victims, witnesses, and other responders.', 60),
  ('Radio', 'Radio communication systems', 'Uses radio codes, status updates, unit identifiers, and dispatch traffic correctly.', 70),
  ('Report Writing', 'Report writing and CAD/MDT documentation', 'Completes accurate reports, narratives, citations, warnings, and involved-party entries.', 80),
  ('Custody', 'Control of persons and prisoners', 'Performs detentions, arrests, searches, transport, and custody control safely.', 90),
  ('Patrol Procedures', 'Patrol procedures and call handling', 'Handles calls for service from dispatch through disposition.', 100),
  ('Investigations', 'Investigations and evidence', 'Identifies evidence, interviews parties, documents facts, and preserves chain of custody.', 110),
  ('Tactical Communication', 'Tactical communication and conflict resolution', 'Uses clear commands, active listening, and conflict-resolution skills.', 120),
  ('Traffic', 'Traffic enforcement and stops', 'Conducts traffic stops, warnings, citations, DUI observations, and roadway safety.', 130),
  ('Self-Initiated Activity', 'Self-initiated activity', 'Develops lawful proactive activity and proper documentation.', 140),
  ('Agency Specific', 'Agency-specific activities', 'Completes local procedures, geography, special units, and server-specific expectations.', 150)
) as seed(category, task, description, sort_order)
where not exists (
  select 1
  from public.fto_checklist_items existing
  where existing.template_id = selected_template.id
    and existing.task = seed.task
);

create table if not exists public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid references auth.users(id) on delete cascade,
  requester_callsign text not null,
  requester_name text,
  target_callsign text not null,
  combined_callsign text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.partner_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.partner_requests(id) on delete set null,
  combined_callsign text not null,
  status text not null default 'active' check (status in ('active', 'ended')),
  members jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists partner_requests_target_idx on public.partner_requests (target_callsign, status, created_at desc);
create index if not exists partner_requests_requester_idx on public.partner_requests (requester_user_id, status, created_at desc);
create index if not exists partner_sessions_status_idx on public.partner_sessions (status, combined_callsign);

alter table public.access_departments enable row level security;
alter table public.fto_checklist_templates enable row level security;
alter table public.fto_checklist_items enable row level security;
alter table public.fto_assignments enable row level security;
alter table public.fto_checklist_progress enable row level security;
alter table public.fto_notes enable row level security;
alter table public.partner_requests enable row level security;
alter table public.partner_sessions enable row level security;
