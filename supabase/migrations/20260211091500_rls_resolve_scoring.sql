-- Fix RLS for upserts during resolve/scoring

-- prompt_resolutions: allow authenticated update if you are the resolver
create policy if not exists "prompt_resolutions_owner_update" on public.prompt_resolutions
for update
to authenticated
using (resolved_by_user_id = auth.uid())
with check (resolved_by_user_id = auth.uid());

-- prompt_scores: allow authenticated update (needed for upsert on conflict)
create policy if not exists "prompt_scores_auth_update" on public.prompt_scores
for update
to authenticated
using (true)
with check (true);
