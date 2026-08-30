-- BYNV member foundation. Every member-owned table is protected by RLS.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.version_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_snapshot_id uuid not null,
  score integer not null check (score between 0 and 100),
  focus text not null,
  answers jsonb not null,
  area_results jsonb not null,
  strongest_areas text[] not null default '{}',
  opportunity_areas text[] not null default '{}',
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id, client_snapshot_id)
);

create table if not exists public.architect_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_section integer not null default 0 check (current_section >= 0),
  answers jsonb not null default '{}',
  section_results jsonb not null default '[]',
  version_score integer check (version_score between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, version)
);

create table if not exists public.architect_blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid references public.architect_assessments(id) on delete set null,
  priorities jsonb not null default '[]',
  strengths jsonb not null default '[]',
  friction_points jsonb not null default '[]',
  first_actions jsonb not null default '[]',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, assessment_id)
);

create table if not exists public.daily_focus_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_date date not null default current_date,
  priority text,
  action text,
  completed boolean not null default false,
  reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, focus_date)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text check (char_length(title) <= 140),
  content text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  pillar_key text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.architect_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  focus text not null,
  outcome text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.challenge_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_key text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  progress integer not null default 0 check (progress >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, challenge_key)
);

create table if not exists public.early_access_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 5 and 320),
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 5 and 320),
  topic text not null check (char_length(topic) between 1 and 80),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists version_snapshots_user_date_idx on public.version_snapshots(user_id, completed_at desc);
create index if not exists architect_assessments_user_idx on public.architect_assessments(user_id, updated_at desc);
create index if not exists journal_entries_user_date_idx on public.journal_entries(user_id, created_at desc);
create index if not exists goals_user_status_idx on public.goals(user_id, status);
create index if not exists architect_blueprints_user_idx on public.architect_blueprints(user_id, updated_at desc);
create index if not exists architect_cycles_user_idx on public.architect_cycles(user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','architect_assessments','architect_blueprints','daily_focus_entries','journal_entries','goals','architect_cycles','challenge_enrollments']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.version_snapshots enable row level security;
alter table public.architect_assessments enable row level security;
alter table public.architect_blueprints enable row level security;
alter table public.daily_focus_entries enable row level security;
alter table public.journal_entries enable row level security;
alter table public.goals enable row level security;
alter table public.architect_cycles enable row level security;
alter table public.challenge_enrollments enable row level security;
alter table public.early_access_signups enable row level security;
alter table public.contact_requests enable row level security;

do $$
declare table_name text;
declare owner_column text;
begin
  foreach table_name in array array['profiles','version_snapshots','architect_assessments','architect_blueprints','daily_focus_entries','journal_entries','goals','architect_cycles','challenge_enrollments']
  loop
    owner_column := case when table_name = 'profiles' then 'id' else 'user_id' end;
    execute format('drop policy if exists "Members manage own %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists %L on public.%I', 'Members read own ' || table_name, table_name);
    execute format('drop policy if exists %L on public.%I', 'Members create own ' || table_name, table_name);
    execute format('drop policy if exists %L on public.%I', 'Members update own ' || table_name, table_name);
    execute format('drop policy if exists %L on public.%I', 'Members delete own ' || table_name, table_name);
    execute format('create policy %L on public.%I for select to authenticated using ((select auth.uid()) = %s)', 'Members read own ' || table_name, table_name, owner_column);
    execute format('create policy %L on public.%I for insert to authenticated with check ((select auth.uid()) = %s)', 'Members create own ' || table_name, table_name, owner_column);
    execute format('create policy %L on public.%I for update to authenticated using ((select auth.uid()) = %s) with check ((select auth.uid()) = %s)', 'Members update own ' || table_name, table_name, owner_column, owner_column);
    execute format('create policy %L on public.%I for delete to authenticated using ((select auth.uid()) = %s)', 'Members delete own ' || table_name, table_name, owner_column);
  end loop;
end $$;

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.version_snapshots to authenticated;
grant select, insert, update, delete on public.architect_assessments to authenticated;
grant select, insert, update, delete on public.architect_blueprints to authenticated;
grant select, insert, update, delete on public.daily_focus_entries to authenticated;
grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.architect_cycles to authenticated;
grant select, insert, update, delete on public.challenge_enrollments to authenticated;

drop policy if exists "Public may request early access" on public.early_access_signups;
create policy "Public may request early access" on public.early_access_signups for insert to anon, authenticated with check (true);
drop policy if exists "Public may send contact requests" on public.contact_requests;
create policy "Public may send contact requests" on public.contact_requests for insert to anon, authenticated with check (true);
grant insert on public.early_access_signups to anon, authenticated;
grant insert on public.contact_requests to anon, authenticated;
