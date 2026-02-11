-- Fix RLS for upserts during resolve/scoring
-- NOTE: Postgres does not support `create policy if not exists`, so we use DO blocks.

-- prompt_resolutions: allow authenticated update if you are the resolver
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prompt_resolutions'
      AND policyname = 'prompt_resolutions_owner_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "prompt_resolutions_owner_update" ON public.prompt_resolutions
      FOR UPDATE
      TO authenticated
      USING (resolved_by_user_id = auth.uid())
      WITH CHECK (resolved_by_user_id = auth.uid())
    $policy$;
  END IF;
END;
$$;

-- prompt_scores: allow authenticated update (needed for upsert on conflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prompt_scores'
      AND policyname = 'prompt_scores_auth_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "prompt_scores_auth_update" ON public.prompt_scores
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true)
    $policy$;
  END IF;
END;
$$;
