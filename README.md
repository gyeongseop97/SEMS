# SEMS

SEWON Emission & Energy Management System

## Files

- `index.html`: GitHub Pages web app.
- `database/sems_supabase_schema.sql`: Supabase table and policy setup SQL.
- `docs/SEMS_supabase_deployment_guide.md`: Deployment guide.

## Basic setup

1. Create a Supabase project.
2. Run the SQL file in Supabase SQL Editor.
3. Create user accounts in Supabase Auth.
4. Add each user to `sems_profiles` with company and role.
5. Edit `index.html` and enter the Supabase project URL and anon public key in `SEMS_DEPLOY_CONFIG`.
6. Enable GitHub Pages from the `main` branch root folder.

Company users can access only their own company data. Planning team admin users can access all data.
