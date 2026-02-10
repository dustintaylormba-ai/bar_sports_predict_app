-- Initial schema for Bar Sports Predict App
-- Designed for Supabase Postgres

-- Extensions
create extension if not exists pgcrypto;

-- Helpers
create or replace function public.generate_game_code(len int default 6)
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..len loop
    out := out || substr(chars, (1 + floor(random() * length(chars)))::int, 1);
  end loop;
  return out;
end;
$$;

-- Bars
create table if not exists public.bars (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.bars enable row level security;

create policy "bars_owner_select" on public.bars
for select
to authenticated
using (owner_user_id = auth.uid());

create policy "bars_owner_insert" on public.bars
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "bars_owner_update" on public.bars
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- Game nights
create table if not exists public.game_nights (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bars(id) on delete cascade,
  owner_user_id uuid not null,
  code text not null unique,
  title text,
  status text not null default 'active' check (status in ('active','ended')),
  sport text not null default 'NBA',
  sportsdataio_game_id bigint,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_game_nights_code on public.game_nights(code);
create index if not exists idx_game_nights_bar on public.game_nights(bar_id);

alter table public.game_nights enable row level security;

create policy "game_nights_public_select_by_code" on public.game_nights
for select
to anon, authenticated
using (true);

create policy "game_nights_owner_insert" on public.game_nights
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "game_nights_owner_update" on public.game_nights
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- Patrons (anonymous participants)
create table if not exists public.patrons (
  id uuid primary key default gen_random_uuid(),
  game_night_id uuid not null references public.game_nights(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_patrons_game_night on public.patrons(game_night_id);

alter table public.patrons enable row level security;

create policy "patrons_public_select" on public.patrons
for select
to anon, authenticated
using (true);

create policy "patrons_public_insert" on public.patrons
for insert
to anon, authenticated
with check (true);

-- Prompts
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  game_night_id uuid not null references public.game_nights(id) on delete cascade,
  created_by_user_id uuid,
  kind text not null default 'multiple_choice' check (kind in ('multiple_choice','over_under')),
  question text not null,
  over_under_line numeric,
  state text not null default 'draft' check (state in ('draft','open','locked','resolved','void')),
  opens_at timestamptz,
  locks_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_prompts_game_night_created on public.prompts(game_night_id, created_at desc);

alter table public.prompts enable row level security;

create policy "prompts_public_select" on public.prompts
for select
to anon, authenticated
using (true);

create policy "prompts_owner_insert" on public.prompts
for insert
to authenticated
with check (created_by_user_id = auth.uid());

create policy "prompts_owner_update" on public.prompts
for update
to authenticated
using (created_by_user_id = auth.uid())
with check (created_by_user_id = auth.uid());

-- Prompt options (for multiple choice)
create table if not exists public.prompt_options (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_prompt_options_prompt on public.prompt_options(prompt_id);

alter table public.prompt_options enable row level security;

create policy "prompt_options_public_select" on public.prompt_options
for select
to anon, authenticated
using (true);

create policy "prompt_options_owner_insert" on public.prompt_options
for insert
to authenticated
with check (true);

-- Submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  patron_id uuid not null references public.patrons(id) on delete cascade,
  option_id uuid references public.prompt_options(id) on delete set null,
  numeric_value numeric,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_submissions_patron_prompt on public.submissions(patron_id, prompt_id);
create index if not exists idx_submissions_prompt on public.submissions(prompt_id);

alter table public.submissions enable row level security;

create policy "submissions_public_select" on public.submissions
for select
to anon, authenticated
using (true);

create policy "submissions_public_insert" on public.submissions
for insert
to anon, authenticated
with check (true);

-- Prompt resolutions
create table if not exists public.prompt_resolutions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null unique references public.prompts(id) on delete cascade,
  resolved_by_user_id uuid not null,
  correct_option_id uuid references public.prompt_options(id) on delete set null,
  over_under_result text check (over_under_result in ('over','under','push')),
  created_at timestamptz not null default now()
);

alter table public.prompt_resolutions enable row level security;

create policy "prompt_resolutions_public_select" on public.prompt_resolutions
for select
to anon, authenticated
using (true);

create policy "prompt_resolutions_owner_insert" on public.prompt_resolutions
for insert
to authenticated
with check (resolved_by_user_id = auth.uid());
