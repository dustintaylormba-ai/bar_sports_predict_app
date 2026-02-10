-- Scoring + leaderboard support

create table if not exists public.prompt_scores (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  game_night_id uuid not null references public.game_nights(id) on delete cascade,
  patron_id uuid not null references public.patrons(id) on delete cascade,
  points int not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (prompt_id, patron_id)
);

create index if not exists idx_prompt_scores_game_night on public.prompt_scores(game_night_id);
create index if not exists idx_prompt_scores_patron on public.prompt_scores(patron_id);

alter table public.prompt_scores enable row level security;

create policy "prompt_scores_public_select" on public.prompt_scores
for select
to anon, authenticated
using (true);

-- Only authenticated hosts can insert scores (computed server-side)
create policy "prompt_scores_auth_insert" on public.prompt_scores
for insert
to authenticated
with check (true);
