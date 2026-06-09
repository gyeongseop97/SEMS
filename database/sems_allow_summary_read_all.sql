-- SEMS policy update: allow authenticated users to read all company summary data,
-- while keeping insert/update/delete limited to own company or admin.
-- Run this once in Supabase SQL Editor.

-- Entries: all authenticated users can read all rows for dashboard/summary.
drop policy if exists "entries_select_own_company_or_admin" on public.sems_entries;
drop policy if exists entries_select_own_or_admin on public.sems_entries;
drop policy if exists entries_select_all_authenticated on public.sems_entries;

create policy entries_select_all_authenticated
on public.sems_entries
for select
to authenticated
using (true);

-- Revenues: all authenticated users can read all rows for intensity/dashboard reference.
drop policy if exists "revenues_select_own_company_or_admin" on public.sems_revenues;
drop policy if exists revenues_select_own_or_admin on public.sems_revenues;
drop policy if exists revenues_select_all_authenticated on public.sems_revenues;

create policy revenues_select_all_authenticated
on public.sems_revenues
for select
to authenticated
using (true);

-- Organizations: all authenticated users can read all companies/sites for filters.
drop policy if exists "organizations_select_own_or_admin" on public.sems_organizations;
drop policy if exists organizations_select_own_or_admin on public.sems_organizations;
drop policy if exists organizations_select_all_authenticated on public.sems_organizations;

create policy organizations_select_all_authenticated
on public.sems_organizations
for select
to authenticated
using (true);

-- Keep write policies as-is. The following policies should remain in place:
-- entries_insert_own_company_or_admin
-- entries_update_own_company_or_admin
-- entries_delete_own_company_or_admin
-- revenues insert/update/delete policies, if used
-- organizations_admin_write
-- factors_admin_write
