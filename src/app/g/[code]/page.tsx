"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { normalizeGameCode } from "@/lib/codes";
import { createClient } from "@/lib/supabase/client";

type Prompt = {
  id: string;
  kind: "multiple_choice" | "over_under";
  question: string;
  state: string;
  locks_at: string | null;
  over_under_line: number | null;
};

type Option = { id: string; label: string };

type Play = {
  PlayID: number;
  QuarterName: string;
  Sequence: number;
  TimeRemainingMinutes: number;
  TimeRemainingSeconds: number;
  Description: string;
  AwayTeamScore: number;
  HomeTeamScore: number;
};

export default function PatronGamePage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams<{ code: string }>();
  const code = normalizeGameCode(params?.code);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameNight, setGameNight] = useState<{
    id: string;
    code: string;
    title: string | null;
    sport: string;
    sportsdataio_game_id: number | null;
  } | null>(null);

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [options, setOptions] = useState<Option[]>([]);

  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const lastPromptIdRef = useRef<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<
    Array<{ patron_id: string; nickname: string; total_points: number }>
  >([]);
  const [myTotal, setMyTotal] = useState<number>(0);
  const [myLastPoints, setMyLastPoints] = useState<number | null>(null);

  const [pbp, setPbp] = useState<{
    Game?: {
      AwayTeam: string;
      HomeTeam: string;
      Status: string;
      Quarter: string;
      AwayTeamScore: number;
      HomeTeamScore: number;
      TimeRemainingMinutes: number;
      TimeRemainingSeconds: number;
      LastPlay: string;
    };
    Plays?: Play[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const gn = await supabase
        .from("game_nights")
        .select("id,code,title,sport,sportsdataio_game_id")
        .eq("code", code)
        .maybeSingle();

      if (cancelled) return;

      if (gn.error) {
        setError(gn.error.message);
        setLoading(false);
        return;
      }

      setGameNight(gn.data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [code, supabase]);

  useEffect(() => {
    if (!gameNight?.id) return;

    const gnId = gameNight.id;
    const sdGameId = gameNight.sportsdataio_game_id;
    let cancelled = false;

    async function load() {
      const patronId = localStorage.getItem(`patron:${code}:id`);

      // Current prompt = most recent
      const pr = await supabase
        .from("prompts")
        .select("id,kind,question,state,locks_at,over_under_line,created_at")
        .eq("game_night_id", gnId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (pr.error) {
        setError(pr.error.message);
        return;
      }

      const nextPrompt = pr.data as Prompt | null;
      setPrompt(nextPrompt);

      // Only reset local input state when the prompt changes.
      const nextId = nextPrompt?.id ?? null;
      const changed = nextId !== lastPromptIdRef.current;
      if (changed) {
        lastPromptIdRef.current = nextId;
        setSubmitted(false);
        setSelectedOptionId("");
      }

      if (nextPrompt?.id) {
        const opt = await supabase
          .from("prompt_options")
          .select("id,label")
          .eq("prompt_id", nextPrompt.id)
          .order("created_at", { ascending: true });

        if (!cancelled) setOptions(opt.data ?? []);
      } else {
        setOptions([]);
      }

      // Leaderboard + my points
      const lb = await supabase.rpc("get_game_night_leaderboard", {
        p_game_night_id: gnId,
      });
      if (!cancelled && !lb.error) {
        const rows = (lb.data ?? []) as Array<{
          patron_id: string;
          nickname: string;
          total_points: number;
        }>;
        setLeaderboard(rows);
        if (patronId) {
          const me = rows.find((r) => r.patron_id === patronId);
          setMyTotal(me?.total_points ?? 0);
        }
      }

      if (patronId && nextPrompt?.id) {
        const pts = await supabase
          .from("prompt_scores")
          .select("points")
          .eq("prompt_id", nextPrompt.id)
          .eq("patron_id", patronId)
          .maybeSingle();
        if (!cancelled && !pts.error) {
          setMyLastPoints(pts.data?.points ?? null);
        }
      } else if (!cancelled) {
        setMyLastPoints(null);
      }

      // Play-by-play (optional)
      if (sdGameId) {
        const res = await fetch(`/api/sportsdataio/replay/nba/pbp/${sdGameId}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled) setPbp(json);
      }
    }

    load();
    const id = setInterval(load, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [code, gameNight?.id, gameNight?.sportsdataio_game_id, supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!prompt?.id) return;

    const patronId = localStorage.getItem(`patron:${code}:id`);
    if (!patronId) {
      setError("Missing patron session. Re-join the game.");
      return;
    }

    if (prompt.kind === "multiple_choice" && !selectedOptionId) {
      setError("Pick an option.");
      return;
    }

    if (!selectedOptionId) {
      setError("Pick an option.");
      return;
    }

    const insert = await supabase.from("submissions").insert({
      prompt_id: prompt.id,
      patron_id: patronId,
      option_id: selectedOptionId,
      numeric_value: null,
    });

    if (insert.error) {
      setError(insert.error.message);
      return;
    }

    setSubmitted(true);
  }

  if (loading) return <div className="p-6">Loading…</div>;

  if (!gameNight) {
    return (
      <div className="p-6">
        <div className="text-xl font-semibold">Game not found</div>
        <div className="text-sm text-neutral-600">
          Join code <code>{code}</code> not found.
        </div>
      </div>
    );
  }

  const plays: Play[] = pbp?.Plays ?? [];
  const lastPlays = plays.slice(-12).reverse();
  const game = pbp?.Game;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {gameNight.title ?? "Game Night"} — <code>{gameNight.code}</code>
        </h1>
        <div className="text-sm text-neutral-600">{gameNight.sport}</div>
      </div>

      <div className="rounded border p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-neutral-600">Your points</div>
          <div className="text-2xl font-semibold">{myTotal}</div>
          {prompt?.state === "resolved" ? (
            <div className="text-xs text-neutral-600">
              Last prompt: {myLastPoints ?? 0} pts
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-600">Leaderboard (top 5)</div>
          <ol className="text-sm space-y-1">
            {leaderboard.slice(0, 5).map((r, idx) => (
              <li key={r.patron_id}>
                {idx + 1}. {r.nickname} — {r.total_points}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {game ? (
        <div className="rounded border p-4">
          <div className="font-medium">
            {game.AwayTeam} @ {game.HomeTeam}
          </div>
          <div className="text-sm text-neutral-600">
            {game.Status} — Q{game.Quarter} — {game.AwayTeamScore} :{" "}
            {game.HomeTeamScore} — {game.TimeRemainingMinutes}:
            {String(game.TimeRemainingSeconds).padStart(2, "0")}
          </div>
          <div className="text-sm mt-2">LastPlay: {game.LastPlay}</div>
        </div>
      ) : null}

      <div className="rounded border p-4 space-y-3">
        <div className="font-semibold">Current prompt</div>
        {!prompt ? (
          <div className="text-sm text-neutral-600">No prompt yet.</div>
        ) : (
          <>
            <div className="text-sm text-neutral-600">{prompt.state}</div>
            <div className="font-medium">{prompt.question}</div>

            {prompt.kind === "over_under" ? (
              <div className="text-sm">Line: {prompt.over_under_line}</div>
            ) : null}

            <form onSubmit={submit} className="space-y-2">
              <div className="space-y-2">
                {options.map((o) => (
                  <label key={o.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="opt"
                      value={o.id}
                      checked={selectedOptionId === o.id}
                      onChange={() => setSelectedOptionId(o.id)}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>

              <button
                disabled={submitted}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {submitted ? "Submitted" : "Submit"}
              </button>

              {error ? <div className="text-sm text-red-700">{error}</div> : null}
            </form>
          </>
        )}
      </div>

      <div className="rounded border p-4 space-y-2">
        <div className="font-semibold">Play-by-play</div>
        <ul className="space-y-2">
          {lastPlays.map((p) => (
            <li key={p.PlayID} className="text-sm">
              <span className="text-xs text-neutral-600">
                Q{p.QuarterName} {p.TimeRemainingMinutes}:
                {String(p.TimeRemainingSeconds).padStart(2, "0")} —
              </span>{" "}
              {p.Description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
