-- SEMS simple monthly completion status
-- Run once in Supabase SQL Editor.
-- This is intentionally simple: no approval, no reject, no lock.

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

create table if not exists public.sems_monthly_completions (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  completed_at timestamptz not null default now(),
  completed_by uuid,
  updated_at timestamptz not null default now(),
  unique(company, year, month)
);

alter table public.sems_monthly_completions enable row level security;

drop policy if exists sems_monthly_completions_select on public.sems_monthly_completions;
drop policy if exists sems_monthly_completions_upsert on public.sems_monthly_completions;
drop policy if exists sems_monthly_completions_delete_admin on public.sems_monthly_completions;

create policy sems_monthly_completions_select
on public.sems_monthly_completions
for select
to authenticated
using (
  public.sems_is_admin()
  or company = public.sems_current_company()
);

create policy sems_monthly_completions_upsert
on public.sems_monthly_completions
for insert
to authenticated
with check (
  public.sems_is_admin()
  or company = public.sems_current_company()
);

create policy sems_monthly_completions_update
on public.sems_monthly_completions
for update
to authenticated
using (
  public.sems_is_admin()
  or company = public.sems_current_company()
)
with check (
  public.sems_is_admin()
  or company = public.sems_current_company()
);

create policy sems_monthly_completions_delete_admin
on public.sems_monthly_completions
for delete
to authenticated
using (public.sems_is_admin());

grant select, insert, update, delete on public.sems_monthly_completions to authenticated;
