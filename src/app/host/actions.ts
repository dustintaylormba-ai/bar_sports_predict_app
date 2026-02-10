"use server";

import { revalidatePath } from "next/cache";

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

  revalidatePath("/host");
}

export async function lockPrompt(promptId: string) {
  const { supabase } = await requireAuthedSupabase();

  const { error } = await supabase
    .from("prompts")
    .update({ state: "locked" })
    .eq("id", promptId);

  if (error) throw error;

  revalidatePath("/host");
}
