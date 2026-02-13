"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { normalizeGameCode } from "@/lib/codes";
import { createClient } from "@/lib/supabase/client";

type Prompt = {
  id: string;
  kind: "multiple_choice" | "over_under";
  question: string;
  state: string;
  locks_at: string | null;
  opens_at: string | null;
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

const SPORTS_DATA_IO_SOURCE =
  process.env.NEXT_PUBLIC_SPORTSDATAIO_SOURCE === "live" ? "live" : "replay";

const SPORTS_DATA_IO_PBP_BASE_PATH =
  SPORTS_DATA_IO_SOURCE === "live"
    ? "/api/sportsdataio/live/nba/pbp"
    : "/api/sportsdataio/replay/nba/pbp";

function formatTimeRemaining(ms: number): string {
  const clamped = Math.max(ms, 0);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function computePotentialPoints(
  opensAtIso: string | null,
  locksAtIso: string | null,
  now: Date,
): number | null {
  if (!opensAtIso || !locksAtIso) return null;
  const opensAt = new Date(opensAtIso).getTime();
  const locksAt = new Date(locksAtIso).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(opensAt) || !Number.isFinite(locksAt)) return null;
  const minPoints = 5;
  const maxPoints = 10;
  const maxWindowMs = 5 * 1000;
  const minWindowMs = 2 * 1000;
  const startDecay = opensAt + maxWindowMs;
  const endDecay = locksAt - minWindowMs;

  if (nowMs <= startDecay) return maxPoints;
  if (nowMs >= endDecay) return minPoints;

  const denom = endDecay - startDecay;
  if (denom <= 0) return minPoints;
  const frac = Math.min(Math.max((nowMs - startDecay) / denom, 0), 1);
  const raw = maxPoints - (maxPoints - minPoints) * frac;
  return Math.round(raw);
}

export default function PatronGamePage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams<{ code: string }>();
  const router = useRouter();
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
  const [patronSession, setPatronSession] = useState<{
    id: string;
    nickname: string;
  } | null>(null);
  const [missingSession, setMissingSession] = useState(false);

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
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [potentialPoints, setPotentialPoints] = useState<number | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem(`patron:${code}:id`);
    const storedNickname = localStorage.getItem(`patron:${code}:nickname`);

    if (!storedId) {
      setMissingSession(true);
      setPatronSession(null);
      return;
    }

    setMissingSession(false);
    setPatronSession({ id: storedId, nickname: storedNickname ?? "" });
  }, [code]);

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
      const patronId = patronSession?.id ?? null;

      // Current prompt = most recent
      const pr = await supabase
        .from("prompts")
        .select("id,kind,question,state,locks_at,opens_at,over_under_line,created_at")
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
        const res = await fetch(`${SPORTS_DATA_IO_PBP_BASE_PATH}/${sdGameId}`, {
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
  }, [code, gameNight?.id, gameNight?.sportsdataio_game_id, patronSession?.id, supabase]);

  useEffect(() => {
    if (!prompt || prompt.state !== "open" || !prompt.locks_at) {
      setTimeRemaining(null);
      setPotentialPoints(null);
      return;
    }

    const update = () => {
      const now = new Date();
      const locksMs = new Date(prompt.locks_at!).getTime();
      setTimeRemaining(formatTimeRemaining(locksMs - now.getTime()));
      setPotentialPoints(computePotentialPoints(prompt.opens_at, prompt.locks_at, now));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [prompt?.id, prompt?.state, prompt?.locks_at, prompt?.opens_at]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!prompt?.id) return;

    const patronId = patronSession?.id ?? null;
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
    // lightweight toast for now
    setError(null);
  }

  if (loading) return <div className="p-6">Loading…</div>;

  if (missingSession) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-xl font-semibold">Session expired</div>
        <div className="text-sm text-neutral-600">
          We couldn't find your patron session for code <code>{code}</code>. Re-join to keep
          playing.
        </div>
        <button
          className="rounded bg-black px-4 py-2 text-white"
          onClick={() => router.push(`/join/${code}`)}
        >
          Re-join game
        </button>
      </div>
    );
  }

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
          {patronSession?.nickname ? (
            <div className="text-xs text-neutral-600">
              Playing as {patronSession.nickname}
            </div>
          ) : null}
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

            {prompt.state === "open" && (timeRemaining || potentialPoints) ? (
              <div className="rounded border px-3 py-2 text-sm flex flex-wrap items-center gap-4 bg-neutral-50">
                {timeRemaining ? (
                  <div>
                    Time remaining: <span className="font-semibold">{timeRemaining}</span>
                  </div>
                ) : null}
                {potentialPoints ? (
                  <div>
                    Answer now for <span className="font-semibold">{potentialPoints} pts</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {prompt.state === "locked" ? (
              <div className="rounded border px-3 py-2 text-sm bg-amber-50 text-amber-900">
                Prompt locked — waiting for host to resolve.
              </div>
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

              {submitted ? (
                <div className="text-sm text-green-700">Answer received! Hang tight.</div>
              ) : null}

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
