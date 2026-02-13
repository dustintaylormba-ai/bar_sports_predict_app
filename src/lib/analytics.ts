import type { SupabaseClient } from "@supabase/supabase-js";

import { getServiceSupabase } from "@/lib/supabase/service";

type AnalyticPayload = Record<string, unknown> | null;

type LogEventParams = {
  kind: string;
  userId?: string | null;
  gameNightId?: string | null;
  payload?: AnalyticPayload;
  client?: SupabaseClient;
};

function getClient(client?: SupabaseClient) {
  if (client) return client;
  try {
    return getServiceSupabase();
  } catch (err) {
    console.warn("Service Supabase client unavailable; skipping analytics log", err);
    return null;
  }
}

export async function logAnalyticEvent({
  kind,
  userId,
  gameNightId,
  payload,
  client,
}: LogEventParams) {
  const supabase = getClient(client);
  if (!supabase) return;
  await supabase.from("analytic_events").insert({
    kind,
    user_id: userId ?? null,
    game_night_id: gameNightId ?? null,
    payload: payload ?? {},
  });
}

type SportsDataIOMetricParams = {
  gameId?: string | number | null;
  source: "replay" | "live";
  status: number;
  latencyMs?: number;
  errorMessage?: string | null;
};

export async function logSportsDataIOMetric(params: SportsDataIOMetricParams) {
  const supabase = getClient();
  if (!supabase) return;
  await supabase.from("sportsdataio_metrics").insert({
    game_id: params.gameId ? String(params.gameId) : null,
    source: params.source,
    status: params.status,
    latency_ms: params.latencyMs ?? null,
    error_message: params.errorMessage ?? null,
  });
}
