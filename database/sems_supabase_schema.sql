-- SEMS Supabase schema / RLS setup
-- Run this once in Supabase SQL Editor.
-- Then create users in Supabase Auth and insert matching rows into sems_profiles.

create extension if not exists pgcrypto;

create table if not exists public.sems_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  company text,
  role text not null default 'company_user' check (role in ('admin','company_user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sems_organizations (
  company text primary key,
  sites text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sems_entries (
  id text primary key,
  year integer not null,
  month integer not null check (month between 1 and 12),
  company text not null,
  site text not null,
  department text,
  source text,
  sub_source text,
  usage_detail text,
  scope text not null check (scope in ('Scope 1','Scope 2','Scope 3')),
  amount numeric not null default 0,
  unit text,
  base_amount numeric not null default 0,
  base_unit text,
  unit_multiplier numeric not null default 1,
  factor numeric not null default 0,
  emission numeric not null default 0,
  memo text,
  owner uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sems_revenues (
  key text primary key,
  year integer not null,
  company text not null,
  site text not null default 'ALL',
  amount numeric not null default 0,
  owner uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sems_emission_factors (
  id text primary key,
  source text not null,
  sub_source text,
  scope text not null check (scope in ('Scope 1','Scope 2','Scope 3')),
  base_unit text,
  factor numeric not null default 0,
  factor_unit text,
  standard text,
  factor_source text,
  factor_year text,
  note text,
  units jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sems_entries_company_year on public.sems_entries(company, year);
create index if not exists idx_sems_entries_scope on public.sems_entries(scope);
create index if not exists idx_sems_revenues_company_year on public.sems_revenues(company, year);

-- Helper functions for RLS.
create or replace function public.sems_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.sems_profiles where id = auth.uid()
$$;

create or replace function public.sems_current_company()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select company from public.sems_profiles where id = auth.uid()
$$;

create or replace function public.sems_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.sems_profiles where id = auth.uid()), false)
$$;

alter table public.sems_profiles enable row level security;
alter table public.sems_organizations enable row level security;
alter table public.sems_entries enable row level security;
alter table public.sems_revenues enable row level security;
alter table public.sems_emission_factors enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.sems_profiles;
create policy "profiles_select_self_or_admin"
on public.sems_profiles
for select
to authenticated
using (id = auth.uid() or (select public.sems_is_admin()));

drop policy if exists "profiles_admin_write" on public.sems_profiles;
create policy "profiles_admin_write"
on public.sems_profiles
for all
to authenticated
using ((select public.sems_is_admin()))
with check ((select public.sems_is_admin()));

drop policy if exists "organizations_select_own_or_admin" on public.sems_organizations;
create policy "organizations_select_own_or_admin"
on public.sems_organizations
for select
to authenticated
using ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "organizations_admin_write" on public.sems_organizations;
create policy "organizations_admin_write"
on public.sems_organizations
for all
to authenticated
using ((select public.sems_is_admin()))
with check ((select public.sems_is_admin()));

drop policy if exists "entries_select_own_company_or_admin" on public.sems_entries;
create policy "entries_select_own_company_or_admin"
on public.sems_entries
for select
to authenticated
using ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "entries_insert_own_company_or_admin" on public.sems_entries;
create policy "entries_insert_own_company_or_admin"
on public.sems_entries
for insert
to authenticated
with check ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "entries_update_own_company_or_admin" on public.sems_entries;
create policy "entries_update_own_company_or_admin"
on public.sems_entries
for update
to authenticated
using ((select public.sems_is_admin()) or company = (select public.sems_current_company()))
with check ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "entries_delete_own_company_or_admin" on public.sems_entries;
create policy "entries_delete_own_company_or_admin"
on public.sems_entries
for delete
to authenticated
using ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "revenues_select_own_company_or_admin" on public.sems_revenues;
create policy "revenues_select_own_company_or_admin"
on public.sems_revenues
for select
to authenticated
using ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "revenues_insert_own_company_or_admin" on public.sems_revenues;
create policy "revenues_insert_own_company_or_admin"
on public.sems_revenues
for insert
to authenticated
with check ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "revenues_update_own_company_or_admin" on public.sems_revenues;
create policy "revenues_update_own_company_or_admin"
on public.sems_revenues
for update
to authenticated
using ((select public.sems_is_admin()) or company = (select public.sems_current_company()))
with check ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "revenues_delete_own_company_or_admin" on public.sems_revenues;
create policy "revenues_delete_own_company_or_admin"
on public.sems_revenues
for delete
to authenticated
using ((select public.sems_is_admin()) or company = (select public.sems_current_company()));

drop policy if exists "factors_select_authenticated" on public.sems_emission_factors;
create policy "factors_select_authenticated"
on public.sems_emission_factors
for select
to authenticated
using (true);

drop policy if exists "factors_admin_write" on public.sems_emission_factors;
create policy "factors_admin_write"
on public.sems_emission_factors
for all
to authenticated
using ((select public.sems_is_admin()))
with check ((select public.sems_is_admin()));

-- Initial organization rows. Adjust as needed.
insert into public.sems_organizations(company, sites) values
('세원정공', array['세원정공']),
('세원물산', array['도남 1공장','채신 2공장']),
('세원테크', array['세원테크']),
('세원이엔아이', array['세원이엔아이']),
('SEWON AMERICA', array['Rincon Plant','Lagrange Plant'])
on conflict (company) do update set sites = excluded.sites, updated_at = now();

-- Example after creating users in Supabase Auth:
-- insert into public.sems_profiles(id, email, company, role)
-- select id, email, '세원정공', 'company_user' from auth.users where email = 'sewonj@se-won.co.kr';
--
-- insert into public.sems_profiles(id, email, company, role)
-- select id, email, null, 'admin' from auth.users where email = 'planning@se-won.co.kr';
