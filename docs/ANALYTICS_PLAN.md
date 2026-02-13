# Analytics & Instrumentation Plan

Goal: capture enough data to understand engagement (host + patron), spot drop-off points, and diagnose gameplay issues without overwhelming Supabase. We’ll start with lightweight logging via Supabase tables + Edge Functions, then expand to a warehouse when needed.

## Key Events

| Event | When | Payload | Notes |
| --- | --- | --- | --- |
| `host_login` | After Supabase session established | `user_id`, `email`, `timestamp`, `device_info` | Useful to understand host usage cadence. |
| `game_night_created` | `createGameNight` server action success | `user_id`, `game_night_id`, `bar_id`, `sport`, `code` | Derived from existing insert. Store in `game_night_events`. |
| `prompt_created` | `createPrompt` success | `game_night_id`, `prompt_id`, `kind`, `question_length`, `options_count` | Helps tune prompt authoring. |
| `prompt_opened` | `openPrompt` / `reopenPrompt` | `prompt_id`, `game_night_id`, `duration`, `reopen` flag | Tells us how long openings last. |
| `prompt_locked` | `lockPrompt` auto/btn | `prompt_id`, `auto` vs manual | Later: auto-lock instrumentation. |
| `prompt_resolved` | `resolvePrompt` success | `prompt_id`, `resolution_time`, `correct_option_id`, `patron_count`, `average_latency` | Derived from existing scoring pass. |
| `prompt_voided` | `voidPrompt` | `prompt_id`, `reason_manual` (optional) | Identify common void reasons. |
| `prompt_submission` | Patron submission insert | `prompt_id`, `patron_id`, `submitted_at`, `option_id`, `first_submission` flag | Already in `submissions`; add denormalized log row via trigger if needed. |
| `patron_join` | `/join/:code` success | `game_night_id`, `patron_id`, `nickname_length`, `device_info` | Add to `patrons` table or separate log. |
| `sportsdataio_fetch` | Proxy request success/fail | `game_id`, `source (replay/live)`, `latency`, `status_code` | For monitoring API usage/quotas. |

## Storage Strategy

1. **Supabase tables**
   - `analytic_events` (generic): `id`, `created_at`, `kind`, `user_id`, `game_night_id`, `payload` (JSONB).
   - `sportsdataio_metrics`: `id`, `created_at`, `game_id`, `source`, `status`, `latency_ms`, `error_message`.

2. **Edge Functions**
   - `log_event(kind, payload)` callable from server actions (reduces duplicate code).
   - `log_proxy_event` inside SportsDataIO routes.

3. **RLS**
   - Restrict insert/select to service role and internal dashboards. No patron access.

## Dashboard/KPIs

Minimum metrics to surface on an internal dashboard or Supabase SQL view:
- Game nights per host per week.
- Average prompts per game night + distribution of MC vs O/U.
- Average open duration vs actual lock time.
- Patron count/join rate per game night.
- Submission rate (submissions / prompts).
- SportsDataIO error rate (per source).

## Implementation Phases

1. **Phase 1 (now)**
   - Add `analytic_events` table + Edge Function `log_event`.
   - Emit host-level events from server actions (`createGameNight`, `createPrompt`, `open/lock/resolve/reopen/void`, `endGameNight`).
   - Record SportsDataIO proxy metrics.

2. **Phase 2**
   - Patron join & submission instrumentation (maybe via Supabase triggers so we don’t touch client code).
   - Leaderboard snapshot after each resolution (store top 5 + scores for historical trending).

3. **Phase 3**
   - Upstream analytics/warehouse (e.g., Pipe Supabase data -> BigQuery/ClickHouse).
   - Visualization (Metabase/Grafana) for host usage.

## Open Questions
- Do we need PII (email, nickname) in logs or anonymized tokens?
- Retention period for analytics tables?
- Real-time monitoring (alerts when SportsDataIO fails consecutively?).

When you’re ready, I can scaffold the Supabase migration + Edge Function for Phase 1 and start wiring events. Let me know.
