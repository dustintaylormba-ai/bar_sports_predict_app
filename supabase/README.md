# Supabase

This folder contains SQL migrations.

## Apply migrations

In Supabase Dashboard:
- SQL Editor → paste the migration SQL from `supabase/migrations/*` and run.

Or use the Supabase CLI if you have it installed:
```bash
supabase link --project-ref <ref>
supabase db push
```
