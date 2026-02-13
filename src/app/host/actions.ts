"use server";

import { revalidatePath } from "next/cache";

import { logAnalyticEvent } from "@/lib/analytics";
import { normalizeGameCode } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";

async function requireAuthedSupabase() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase env not configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return { supabase, user };
}

export async function ensureBar(name: string) {
  const { supabase, user } = await requireAuthedSupabase();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Bar name required");

  // If a bar already exists for this owner, just return it.
  const existing = await supabase
    .from("bars")
    .select("id,name")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data;
  }

  const created = await supabase
    .from("bars")
    .insert({ owner_user_id: user.id, name: trimmed })
    .select("id,name")
    .single();

  if (created.error) throw created.error;

  revalidatePath("/host");
  return created.data;
}

export async function createGameNight(params: {
  barId: string;
  title?: string;
  sport?: string;
  code?: string;
  sportsdataioGameId?: number;
}) {
  const { supabase, user } = await requireAuthedSupabase();

  const code = normalizeGameCode(params.code ?? "");
  if (!code || code.length < 4) {
    throw new Error("Game code must be at least 4 characters");
  }

  const insert = await supabase
    .from("game_nights")
    .insert({
      bar_id: params.barId,
      owner_user_id: user.id,
      code,
      title: params.title?.trim() || null,
      sport: params.sport ?? "NBA",
      sportsdataio_game_id: params.sportsdataioGameId ?? null,
    })
    .select("id,code")
    .single();

  if (insert.error) throw insert.error;

  await logAnalyticEvent({
    kind: "game_night_created",
    userId: user.id,
    gameNightId: insert.data.id,
    payload: {
      code,
      sport: params.sport ?? "NBA",
    },
  }).catch((err) => console.error("Failed to log game_night_created", err));

  revalidatePath("/host");
  return insert.data;
}

export async function createPrompt(params: {
  gameNightId: string;
  kind: "multiple_choice" | "over_under";
  question: string;
  options?: string[];
  overUnderLine?: number;
}) {
  const { supabase, user } = await requireAuthedSupabase();

  const question = params.question.trim();
  if (!question) throw new Error("Question required");

  const promptRes = await supabase
    .from("prompts")
    .insert({
      game_night_id: params.gameNightId,
      created_by_user_id: user.id,
      kind: params.kind,
      question,
      over_under_line: params.kind === "over_under" ? params.overUnderLine ?? null : null,
      state: "draft",
    })
    .select("id,kind")
    .single();

  if (promptRes.error) throw promptRes.error;

  const prompt = promptRes.data;

  if (params.kind === "multiple_choice") {
    const opts = (params.options ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (opts.length < 2) throw new Error("Need at least 2 options");

    const { error } = await supabase.from("prompt_options").insert(
      opts.map((label) => ({ prompt_id: prompt.id, label })),
    );
    if (error) throw error;
  }

  if (params.kind === "over_under") {
    // For v1, over/under prompts are a binary choice.
    const { error } = await supabase.from("prompt_options").insert([
      { prompt_id: prompt.id, label: "Over" },
      { prompt_id: prompt.id, label: "Under" },
    ]);
    if (error) throw error;
  }

  await logAnalyticEvent({
    kind: "prompt_created",
    userId: user.id,
    gameNightId: params.gameNightId,
    payload: {
      promptId: prompt.id,
      kind: params.kind,
      questionLength: question.length,
      optionsCount: params.kind === "multiple_choice" ? (params.options ?? []).length : 2,
    },
  }).catch((err) => console.error("Failed to log prompt_created", err));

  revalidatePath(`/host/game-night/${params.gameNightId}`);
  return prompt;
}

export async function openPrompt(promptId: string, durationSeconds: number) {
  const { supabase, user } = await requireAuthedSupabase();

  const now = new Date();
  const locksAt = new Date(now.getTime() + durationSeconds * 1000);

  const { error } = await supabase
    .from("prompts")
    .update({
      state: "open",
      opens_at: now.toISOString(),
      locks_at: locksAt.toISOString(),
      created_by_user_id: user.id,
    })
    .eq("id", promptId);

  if (error) throw error;

  await logAnalyticEvent({
    kind: "prompt_opened",
    userId: user.id,
    payload: { promptId, durationSeconds },
  }).catch((err) => console.error("Failed to log prompt_opened", err));

  revalidatePath("/host");
}

export async function reopenPrompt(promptId: string, durationSeconds: number) {
  const { supabase, user } = await requireAuthedSupabase();

  const now = new Date();
  const locksAt = new Date(now.getTime() + durationSeconds * 1000);

  // Reopen resets timing and clears resolution/scores for that prompt.
  const del1 = await supabase.from("prompt_resolutions").delete().eq("prompt_id", promptId);
  if (del1.error) throw del1.error;

  const del2 = await supabase.from("prompt_scores").delete().eq("prompt_id", promptId);
  if (del2.error) throw del2.error;

  const { error } = await supabase
    .from("prompts")
    .update({
      state: "open",
      opens_at: now.toISOString(),
      locks_at: locksAt.toISOString(),
      resolved_at: null,
      created_by_user_id: user.id,
    })
    .eq("id", promptId);

  if (error) throw error;

  await logAnalyticEvent({
    kind: "prompt_reopened",
    userId: user.id,
    payload: { promptId, durationSeconds },
  }).catch((err) => console.error("Failed to log prompt_reopened", err));

  revalidatePath("/host");
}

export async function voidPrompt(promptId: string) {
  const { supabase, user } = await requireAuthedSupabase();

  // Mark void; clear resolution + scores.
  const del1 = await supabase.from("prompt_resolutions").delete().eq("prompt_id", promptId);
  if (del1.error) throw del1.error;

  const del2 = await supabase.from("prompt_scores").delete().eq("prompt_id", promptId);
  if (del2.error) throw del2.error;

  const { error } = await supabase
    .from("prompts")
    .update({ state: "void", resolved_at: new Date().toISOString() })
    .eq("id", promptId);

  if (error) throw error;

  await logAnalyticEvent({
    kind: "prompt_voided",
    userId: user.id,
    payload: { promptId },
  }).catch((err) => console.error("Failed to log prompt_voided", err));

  revalidatePath("/host");
}

export async function endGameNight(gameNightId: string) {
  const { supabase, user } = await requireAuthedSupabase();

  const { error } = await supabase
    .from("game_nights")
    .update({ status: "ended", ended_at: new Date().toISOString(), owner_user_id: user.id })
    .eq("id", gameNightId);

  if (error) throw error;

  await logAnalyticEvent({
    kind: "game_night_ended",
    userId: user.id,
    gameNightId,
  }).catch((err) => console.error("Failed to log game_night_ended", err));

  revalidatePath("/host");
}

export async function lockPrompt(promptId: string) {
  const { supabase, user } = await requireAuthedSupabase();

  const { error } = await supabase
    .from("prompts")
    .update({ state: "locked" })
    .eq("id", promptId);

  if (error) throw error;

  await logAnalyticEvent({
    kind: "prompt_locked",
    userId: user.id,
    payload: { promptId },
  }).catch((err) => console.error("Failed to log prompt_locked", err));

  revalidatePath("/host");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeSpeedPoints(args: {
  submittedAt: string;
  opensAt: string;
  locksAt: string;
  minPoints: number;
  maxPoints: number;
  // Keep max points for first N seconds
  maxWindowSeconds?: number;
  // Start clamping to min points during last N seconds
  minWindowSeconds?: number;
}) {
  const t0 = new Date(args.opensAt).getTime();
  const t1 = new Date(args.locksAt).getTime();
  const ts = new Date(args.submittedAt).getTime();

  if (!Number.isFinite(t0) || !Number.isFinite(t1) || !Number.isFinite(ts)) {
    return args.minPoints;
  }

  const durationMs = t1 - t0;
  if (durationMs <= 0) return args.minPoints;

  const maxWindowMs = (args.maxWindowSeconds ?? 5) * 1000;
  const minWindowMs = (args.minWindowSeconds ?? 2) * 1000;

  const startDecay = t0 + maxWindowMs;
  const endDecay = t1 - minWindowMs;

  // Answered quickly → max points
  if (ts <= startDecay) return args.maxPoints;

  // Answered very late → min points
  if (ts >= endDecay) return args.minPoints;

  // Linear decay between (startDecay..endDecay)
  const denom = endDecay - startDecay;
  if (denom <= 0) return args.minPoints;

  const frac = clamp((ts - startDecay) / denom, 0, 1);
  const raw = args.maxPoints - (args.maxPoints - args.minPoints) * frac;
  return clamp(Math.round(raw), args.minPoints, args.maxPoints);
}

export async function resolvePrompt(params: {
  promptId: string;
  correctOptionId: string;
}) {
  const { supabase, user } = await requireAuthedSupabase();

  // Load prompt details
  const promptRes = await supabase
    .from("prompts")
    .select("id,game_night_id,kind,state,opens_at,locks_at")
    .eq("id", params.promptId)
    .single();

  if (promptRes.error) throw promptRes.error;
  const prompt = promptRes.data;

  // If still open, lock first (so scoring uses a stable locks_at).
  if (prompt.state === "open") {
    const { error: lockErr } = await supabase
      .from("prompts")
      .update({ state: "locked" })
      .eq("id", prompt.id);
    if (lockErr) throw lockErr;
  }

  // Upsert resolution record (unique on prompt_id)
  const resInsert = await supabase.from("prompt_resolutions").upsert(
    {
      prompt_id: prompt.id,
      resolved_by_user_id: user.id,
      correct_option_id: params.correctOptionId,
      over_under_result: null,
    },
    { onConflict: "prompt_id" },
  );
  if (resInsert.error) throw resInsert.error;

  // Mark prompt resolved
  const { error: updErr } = await supabase
    .from("prompts")
    .update({ state: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", prompt.id);
  if (updErr) throw updErr;

  // Fetch patrons + submissions for this prompt
  const patronsRes = await supabase
    .from("patrons")
    .select("id")
    .eq("game_night_id", prompt.game_night_id);
  if (patronsRes.error) throw patronsRes.error;

  const subsRes = await supabase
    .from("submissions")
    .select("patron_id,option_id,created_at")
    .eq("prompt_id", prompt.id);
  if (subsRes.error) throw subsRes.error;

  const subsByPatron = new Map<
    string,
    { option_id: string | null; created_at: string }
  >();
  for (const s of subsRes.data ?? []) {
    subsByPatron.set(s.patron_id, { option_id: s.option_id, created_at: s.created_at });
  }

  // Reload opens/locks after potential lock.
  const freshPrompt = await supabase
    .from("prompts")
    .select("opens_at,locks_at")
    .eq("id", prompt.id)
    .single();
  if (freshPrompt.error) throw freshPrompt.error;

  const opensAt = freshPrompt.data.opens_at;
  const locksAt = freshPrompt.data.locks_at;

  const scoreRows: Array<{
    prompt_id: string;
    game_night_id: string;
    patron_id: string;
    points: number;
    reason: string;
  }> = [];

  for (const p of patronsRes.data ?? []) {
    const sub = subsByPatron.get(p.id);
    if (!sub) {
      // No answer → 0 points (we omit row)
      continue;
    }

    const correct = sub.option_id === params.correctOptionId;

    if (!correct) {
      scoreRows.push({
        prompt_id: prompt.id,
        game_night_id: prompt.game_night_id,
        patron_id: p.id,
        points: 2,
        reason: "incorrect",
      });
      continue;
    }

    let pts = 5;
    if (opensAt && locksAt) {
      pts = computeSpeedPoints({
        submittedAt: sub.created_at,
        opensAt,
        locksAt,
        minPoints: 5,
        maxPoints: 10,
      });
    }

    scoreRows.push({
      prompt_id: prompt.id,
      game_night_id: prompt.game_night_id,
      patron_id: p.id,
      points: pts,
      reason: "correct_speed",
    });
  }

  if (scoreRows.length) {
    const ins = await supabase
      .from("prompt_scores")
      .upsert(scoreRows, { onConflict: "prompt_id,patron_id" });
    if (ins.error) throw ins.error;
  }

  await logAnalyticEvent({
    kind: "prompt_resolved",
    userId: user.id,
    gameNightId: prompt.game_night_id,
    payload: {
      promptId: prompt.id,
      totalSubmissions: subsRes.data?.length ?? 0,
      scoredCount: scoreRows.length,
    },
  }).catch((err) => console.error("Failed to log prompt_resolved", err));

  revalidatePath(`/host/game-night/${prompt.game_night_id}`);
}
