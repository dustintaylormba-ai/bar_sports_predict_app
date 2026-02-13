# Analytics & Instrumentation Plan

Goal: capture enough data to understand engagement (host + patron), spot drop-off points, and diagnose gameplay issues without overwhelming Supabase. We’ll start with lightweight logging via Supabase tables + server actions, then expand to a warehouse when needed.

## Key Events

| Event | When | Payload | Notes |
| --- | --- | --- | --- |
| `host_login` | After Supabase session established | `user_id`, `email`, `timestamp`, `device_info` | Useful to understand host usage cadence. |
| `game_night_created` | `createGameNight` server action success | `user_id`, `game_night_id`, `bar_id`, `sport`, `code` | Derived from existing insert. Stored via `logAnalyticEvent`. |
| `prompt_created` | `createPrompt` success | `game_night_id`, `prompt_id`, `kind`, `question_length`, `options_count` | Already implemented. |
| `prompt_opened` | `openPrompt` / `reopenPrompt` | `prompt_id`, `game_night_id`, `duration`, `reopen` flag | In place. |
| `prompt_locked` | `lockPrompt` auto/btn | `prompt_id`, `auto` vs manual | In place (manual lock events). |
| `prompt_resolved` | `resolvePrompt` success | `prompt_id`, `resolution_time`, `correct_option_id`, `patron_count`, `average_latency` | In place. |
| `prompt_voided` | `voidPrompt` | `prompt_id`, `reason_manual` (optional) | In place. |
| `prompt_submission` | Patron submission insert | `prompt_id`, `patron_id`, `submitted_at`, `option_id`, `first_submission` flag | Phase 2 (via trigger). |
| `patron_join` | `/join/:code` success | `game_night_id`, `patron_id`, `nickname_length`, `device_info` | Phase 2. |
| `sportsdataio_fetch` | Proxy request success/fail | `game_id`, `source (replay/live)`, `latency`, `status_code` | In place via replay/live routes. |

## Storage Strategy

1. **Supabase tables**
   - `analytic_events` (generic): `id`, `created_at`, `kind`, `user_id`, `game_night_id`, `payload` (JSONB). ✅ Implemented via migration.
   - `sportsdataio_metrics`: `id`, `created_at`, `game_id`, `source`, `status`, `latency_ms`, `error_message`. ✅ Implemented.

2. **Server logging helper**
   - `logAnalyticEvent` + `logSportsDataIOMetric` wrap the Supabase service client. If service creds are missing (e.g., local dev), the helper no-ops with a warning.

## Dashboard/KPIs (future)
- Game nights per host per week.
- Average prompts per game night + distribution of MC vs O/U.
- Average open duration vs actual lock time.
- Patron count/join rate per game night.
- Submission rate (submissions / prompts).
- SportsDataIO error rate (per source).

## Implementation Phases

1. **Phase 1 (done)**
   - Added `analytic_events` + `sportsdataio_metrics` tables with RLS.
   - Server actions emit events for game night + prompt lifecycle; SportsDataIO proxies log metrics.

2. **Phase 2 (next)**
   - Patron join/submission instrumentation (likely via Supabase triggers so clients stay clean).
   - Leaderboard snapshot after each resolution (store top 5 + scores for historical trending).

3. **Phase 3**
   - Upstream analytics/warehouse (e.g., Pipe Supabase data -> BigQuery/ClickHouse).
   - Visualization (Metabase/Grafana) for host usage + SportsDataIO health.

## Open Questions
- Do we need PII (email, nickname) in logs or anonymized tokens?
- Retention period for analytics tables?
- Real-time monitoring (alerts when SportsDataIO fails consecutively?).
