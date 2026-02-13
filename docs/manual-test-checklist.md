# Manual Test Checklist (2026-02-13)

These are the flows I walked through (or simulated via server actions) after today’s changes. Repeat this list whenever we ship major host UX updates.

1. **Host login (magic link)**
   - Generate link via `node scripts/generate-magic-link.js you@example.com` (skips rate limit).
   - Follow link → confirm redirect to `/auth/callback#...` and automatic navigation to `/host`.

2. **Create game night**
   - Visit `/host/game-night/new`, submit form.
   - Expect immediate redirect to `/host/game-night/<id>`.

3. **End game night**
   - On host controls page, click **End game night**.
   - Confirm dialog appears.
   - After accepting, button shows “Ending…” and page redirects back to `/host`.

4. **Void prompt**
   - With an active prompt, click **Void**.
   - Confirm dialog should reference clearing submissions + scores.

5. **Resolve + score prompt**
   - Choose answer, click **Resolve + score**.
   - Confirmation dialog warns it’s irreversible unless reopened.

6. **Safety net**
   - `npm run build` passes locally to catch type errors.

Documenting the checklist here keeps us honest about what we validated before pushing to prod.
