-- SEMS monthly submission / review workflow
-- Run this once in Supabase SQL Editor.
-- Purpose:
-- 1) Company users submit monthly data after entry.
-- 2) Planning/Admin users approve or reject by company/month.
-- 3) Submitted/approved months are locked from company-side edits.

create extension if not exists pgcrypto;

create or replace function public.sems_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sems_profiles
    where id = auth.uid()
      and role = 'admin'
  )
$$;

create or replace function public.sems_current_company()
returns text
language sql
security definer
set search_path = public
as $$
  select company
  from public.sems_profiles
  where id = auth.uid()
$$;

grant execute on function public.sems_is_admin() to authenticated;
grant execute on function public.sems_current_company() to authenticated;

create table if not exists public.sems_monthly_submissions (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected')),
  submitted_at timestamptz,
  submitted_by uuid,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company, year, month)
);

alter table public.sems_monthly_submissions enable row level security;

drop policy if exists sems_monthly_select_own_or_admin on public.sems_monthly_submissions;
drop policy if exists sems_monthly_insert_own_or_admin on public.sems_monthly_submissions;
drop policy if exists sems_monthly_update_own_or_admin on public.sems_monthly_submissions;
drop policy if exists sems_monthly_delete_admin_only on public.sems_monthly_submissions;

create policy sems_monthly_select_own_or_admin
on public.sems_monthly_submissions
for select
to authenticated
using (
  public.sems_is_admin()
  or company = public.sems_current_company()
);

create policy sems_monthly_insert_own_or_admin
on public.sems_monthly_submissions
for insert
to authenticated
with check (
  public.sems_is_admin()
  or (
    company = public.sems_current_company()
    and status in ('draft','submitted')
  )
);

create policy sems_monthly_update_own_or_admin
on public.sems_monthly_submissions
for update
to authenticated
using (
  public.sems_is_admin()
  or (
    company = public.sems_current_company()
    and status in ('draft','rejected')
  )
)
with check (
  public.sems_is_admin()
  or (
    company = public.sems_current_company()
    and status in ('draft','submitted')
  )
);

create policy sems_monthly_delete_admin_only
on public.sems_monthly_submissions
for delete
to authenticated
using (public.sems_is_admin());

grant select, insert, update, delete on public.sems_monthly_submissions to authenticated;

create or replace function public.sems_month_is_open(p_company text, p_year integer, p_month integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.sems_monthly_submissions
    where company = p_company
      and year = p_year
      and month = p_month
      and status in ('submitted','approved')
  )
$$;

grant execute on function public.sems_month_is_open(text, integer, integer) to authenticated;

-- Rebuild entry write policies so submitted/approved months cannot be modified by company users.
-- Admin can still modify all periods.
alter table public.sems_entries enable row level security;

drop policy if exists entries_insert_own_company_or_admin on public.sems_entries;
drop policy if exists entries_update_own_company_or_admin on public.sems_entries;
drop policy if exists entries_delete_own_company_or_admin on public.sems_entries;
drop policy if exists sems_entries_insert_own_company_or_admin on public.sems_entries;
drop policy if exists sems_entries_update_own_company_or_admin on public.sems_entries;
drop policy if exists sems_entries_delete_own_company_or_admin on public.sems_entries;

create policy sems_entries_insert_own_company_or_admin
on public.sems_entries
for insert
to authenticated
with check (
  public.sems_is_admin()
  or (
    company = public.sems_current_company()
    and public.sems_month_is_open(company, year, month)
  )
);

create policy sems_entries_update_own_company_or_admin
on public.sems_entries
for update
to authenticated
using (
  public.sems_is_admin()
  or (
    company = public.sems_current_company()
    and public.sems_month_is_open(company, year, month)
  )
)
with check (
  public.sems_is_admin()
  or (
    company = public.sems_current_company()
    and public.sems_month_is_open(company, year, month)
  )
);

create policy sems_entries_delete_own_company_or_admin
on public.sems_entries
for delete
to authenticated
using (
  public.sems_is_admin()
  or (
    company = public.sems_current_company()
    and public.sems_month_is_open(company, year, month)
  )
);

-- Ensure read policy allows dashboard/submission status overview.
drop policy if exists entries_select_all_authenticated on public.sems_entries;
create policy entries_select_all_authenticated
on public.sems_entries
for select
to authenticated
using (true);
