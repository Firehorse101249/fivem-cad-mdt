-- Whitelist membership, interview, and permission schema for Sentinel CAD/MDT.
-- Run after supabase/rls-policies.sql and supabase/audit-log-schema.sql.
-- Additive and rerunnable; it keeps public.profiles.role for legacy code.

alter table if exists public.profiles add column if not exists steam_id64 text;
alter table if exists public.profiles add column if not exists discord_id text;
alter table if exists public.profiles add column if not exists discord_username text;
alter table if exists public.profiles add column if not exists membership_status text not null default 'not_applied';

create table if not exists public.access_permissions (
  key text primary key,
  label text not null,
  description text,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

create table if not exists public.access_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null unique,
  description text,
  priority integer not null default 0,
  is_system boolean not null default false,
  is_founder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.access_role_permissions (
  role_id uuid not null references public.access_roles(id) on delete cascade,
  permission_key text not null references public.access_permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists public.user_access_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.access_roles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.access_certifications (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.access_certification_permissions (
  certification_id uuid not null references public.access_certifications(id) on delete cascade,
  permission_key text not null references public.access_permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (certification_id, permission_key)
);

create table if not exists public.user_access_certifications (
  user_id uuid not null references auth.users(id) on delete cascade,
  certification_id uuid not null references public.access_certifications(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, certification_id)
);

create table if not exists public.membership_question_definitions (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('application', 'interview')),
  question_key text not null,
  prompt text not null,
  help_text text,
  field_type text not null default 'textarea'
    check (field_type in ('text', 'textarea', 'date')),
  required boolean not null default true,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (section, question_key)
);

create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'application_approved', 'application_denied', 'interview_pending', 'interview_accepted', 'interview_denied')),
  denial_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id)
);

create table if not exists public.membership_application_answers (
  application_id uuid not null references public.membership_applications(id) on delete cascade,
  question_id uuid not null references public.membership_question_definitions(id) on delete restrict,
  answer text not null default '',
  updated_at timestamptz not null default now(),
  primary key (application_id, question_id)
);

create table if not exists public.membership_interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.membership_applications(id) on delete cascade,
  interviewer_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'accepted', 'denied')),
  denial_reason text,
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.membership_interview_answers (
  interview_id uuid not null references public.membership_interviews(id) on delete cascade,
  question_id uuid not null references public.membership_question_definitions(id) on delete restrict,
  answer text not null default '',
  updated_at timestamptz not null default now(),
  primary key (interview_id, question_id)
);

create table if not exists public.membership_denial_cooldowns (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.membership_applications(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  steam_id64 text,
  discord_id text,
  reason text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  application_id uuid references public.membership_applications(id) on delete cascade,
  channel text not null default 'website',
  subject text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_steam_id64_idx on public.profiles (steam_id64);
create index if not exists profiles_discord_id_idx on public.profiles (discord_id);
create index if not exists membership_applications_status_idx on public.membership_applications (status);
create index if not exists membership_denial_cooldowns_lookup_idx
  on public.membership_denial_cooldowns (expires_at, email, steam_id64, discord_id);

insert into public.access_permissions (key, label, category, description) values
  ('admin:access', 'Open admin console', 'admin', 'Access the administrative console.'),
  ('applications:review', 'Review applications', 'membership', 'Approve and deny whitelist applications.'),
  ('interviews:conduct', 'Conduct interviews', 'membership', 'Read applications, save interview answers, and accept or deny interviews.'),
  ('questions:manage', 'Manage questions', 'membership', 'Create and edit application/interview questions.'),
  ('roles:manage', 'Manage roles', 'access', 'Create roles and assign role permissions.'),
  ('certifications:manage', 'Manage certifications', 'access', 'Create certifications and assign certification permissions.'),
  ('users:manage', 'Manage users', 'access', 'Manage user accounts, roles, certifications, and resets.'),
  ('audit:view', 'View audit logs', 'admin', 'View administrative audit logs.'),
  ('system:manage', 'Manage system settings', 'admin', 'Change maintenance mode and other system settings.'),
  ('cad:access', 'Access CAD', 'cad', 'Enter the CAD/MDT dashboard.'),
  ('cad:dispatch', 'Dispatch console', 'cad', 'Use dispatch workflows.'),
  ('cad:officer', 'Officer MDT', 'cad', 'Use patrol/officer workflows.'),
  ('cad:civilian', 'Civilian portal', 'cad', 'Use civilian profile workflows.')
on conflict (key) do update set
  label = excluded.label,
  category = excluded.category,
  description = excluded.description;

insert into public.access_roles (key, name, description, priority, is_system, is_founder) values
  ('founder', 'Founder', 'Highest system role with all permissions.', 1000, true, true),
  ('admin', 'Admin', 'Administrative staff access.', 800, true, false),
  ('mod', 'Mod', 'Moderation and membership support.', 500, false, false),
  ('interviewer', 'Interviewer', 'Can conduct whitelist interviews.', 450, false, false),
  ('mentor', 'Mentor', 'Can help onboard accepted members.', 350, false, false),
  ('member', 'Member', 'Approved community member with CAD access.', 100, true, false),
  ('dispatcher', 'Dispatcher', 'Dispatcher CAD certification role.', 250, false, false),
  ('police', 'Police', 'Police MDT certification role.', 250, false, false),
  ('civilian', 'Civilian', 'Civilian CAD access role.', 150, false, false)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  priority = excluded.priority,
  is_system = excluded.is_system,
  is_founder = excluded.is_founder;

insert into public.access_certifications (key, name, description) values
  ('dispatch', 'Dispatch', 'Dispatch workstation access.'),
  ('police', 'Police', 'Officer MDT access.'),
  ('civilian', 'Civilian', 'Civilian portal access.')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.access_role_permissions (role_id, permission_key)
select r.id, p.key
from public.access_roles r
cross join public.access_permissions p
where r.key in ('admin')
on conflict do nothing;

insert into public.access_role_permissions (role_id, permission_key)
select r.id, p.key
from public.access_roles r
join public.access_permissions p on p.key in ('cad:access')
where r.key = 'member'
on conflict do nothing;

insert into public.access_role_permissions (role_id, permission_key)
select r.id, p.key
from public.access_roles r
join public.access_permissions p on p.key in ('admin:access', 'applications:review', 'interviews:conduct')
where r.key = 'mod'
on conflict do nothing;

insert into public.access_role_permissions (role_id, permission_key)
select r.id, p.key
from public.access_roles r
join public.access_permissions p on p.key in ('admin:access', 'interviews:conduct')
where r.key = 'interviewer'
on conflict do nothing;

insert into public.access_certification_permissions (certification_id, permission_key)
select c.id, p.key
from public.access_certifications c
join public.access_permissions p on
  (c.key = 'dispatch' and p.key in ('cad:access', 'cad:dispatch'))
  or (c.key = 'police' and p.key in ('cad:access', 'cad:officer'))
  or (c.key = 'civilian' and p.key in ('cad:access', 'cad:civilian'))
on conflict do nothing;

insert into public.membership_question_definitions (section, question_key, prompt, field_type, required, sort_order) values
  ('application', 'preferred_name', 'Name they wish to be called by', 'text', true, 10),
  ('application', 'birthday', 'Birthday', 'date', true, 20),
  ('application', 'roleplay_experience', 'Any experience in roleplaying', 'textarea', true, 30),
  ('application', 'why_join', 'Why they wish to join the community', 'textarea', true, 40),
  ('application', 'skills', 'What skills they plan to bring', 'textarea', true, 50),
  ('interview', 'scenario_quality', 'Describe how the applicant handles roleplay quality and staying in character.', 'textarea', true, 10),
  ('interview', 'rules_maturity', 'Ask about rules, maturity, and handling staff direction.', 'textarea', true, 20),
  ('interview', 'community_fit', 'Ask what kind of community member they intend to be.', 'textarea', true, 30)
on conflict (section, question_key) do update set
  prompt = excluded.prompt,
  field_type = excluded.field_type,
  required = excluded.required,
  sort_order = excluded.sort_order;

insert into public.user_access_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.access_roles r on r.key = 'founder'
where p.role = 'admin'
on conflict do nothing;

alter table public.access_permissions enable row level security;
alter table public.access_roles enable row level security;
alter table public.access_role_permissions enable row level security;
alter table public.user_access_roles enable row level security;
alter table public.access_certifications enable row level security;
alter table public.access_certification_permissions enable row level security;
alter table public.user_access_certifications enable row level security;
alter table public.membership_question_definitions enable row level security;
alter table public.membership_applications enable row level security;
alter table public.membership_application_answers enable row level security;
alter table public.membership_interviews enable row level security;
alter table public.membership_interview_answers enable row level security;
alter table public.membership_denial_cooldowns enable row level security;
alter table public.membership_notifications enable row level security;
