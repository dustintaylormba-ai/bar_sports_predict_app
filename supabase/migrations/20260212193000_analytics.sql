-- Analytics tables

create table if not exists public.analytic_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,
  user_id uuid,
  game_night_id uuid references public.game_nights(id) on delete set null,
  payload jsonb default '{}'::jsonb
);

create table if not exists public.sportsdataio_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  game_id text,
  source text not null check (source in ('replay','live')),
  status int not null,
  latency_ms int,
  error_message text
);

alter table public.analytic_events enable row level security;
alter table public.sportsdataio_metrics enable row level security;

create policy "analytic_events_insert_auth" on public.analytic_events
for insert
to authenticated
with check (
  user_id is null or user_id = auth.uid()
);

create policy "analytic_events_select_none" on public.analytic_events
for select
to authenticated
using (false);

create policy "sportsdataio_metrics_insert_auth" on public.sportsdataio_metrics
for insert
to authenticated
with check (false);

create policy "sportsdataio_metrics_select_none" on public.sportsdataio_metrics
for select
to authenticated
using (false);
