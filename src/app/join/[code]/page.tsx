"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { normalizeGameCode } from "@/lib/codes";
import { createClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const supabase = useMemo(() => createClient(), []);
  const code = normalizeGameCode(params?.code);

  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameNight, setGameNight] = useState<{
    id: string;
    code: string;
    title: string | null;
    sport: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("game_nights")
        .select("id,code,title,sport")
        .eq("code", code)
        .maybeSingle();

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      setGameNight(data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [code, supabase]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setJoining(true);

    const nn = nickname.trim();
    if (!nn) {
      setJoining(false);
      return;
    }
    if (!gameNight?.id) {
      setJoining(false);
      return;
    }

    const { data, error: err } = await supabase
      .from("patrons")
      .insert({ game_night_id: gameNight.id, nickname: nn })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      setJoining(false);
      return;
    }

    localStorage.setItem(`patron:${code}:id`, data.id);
    localStorage.setItem(`patron:${code}:nickname`, nn);

    sendJoinAnalytics({
      gameNightId: gameNight.id,
      patronId: data.id,
      nickname: nn,
      joinCode: gameNight.code,
    });

    router.push(`/g/${code}`);
    setJoining(false);
  }

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }

  if (!gameNight) {
    return (
      <div className="p-6 space-y-2">
        <div className="text-xl font-semibold">Game not found</div>
        <div className="text-sm text-neutral-600">
          No active game night for code <code>{code}</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Join game night</h1>
        <div className="text-sm text-neutral-600">
          {gameNight.title ?? "Game Night"} — <code>{gameNight.code}</code>
        </div>
      </div>

      <form onSubmit={join} className="space-y-3">
        <label className="block text-sm font-medium">Nickname</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="DT"
          className="w-full rounded border px-3 py-2"
          maxLength={24}
          required
        />

        <button
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={joining}
        >
          {joining ? "Joining…" : "Join"}
        </button>

        {error ? <div className="text-sm text-red-700">{error}</div> : null}
      </form>
    </div>
  );
}

function sendJoinAnalytics({
  gameNightId,
  patronId,
  nickname,
  joinCode,
}: {
  gameNightId: string;
  patronId: string;
  nickname: string;
  joinCode: string;
}) {
  if (typeof window === "undefined") return;
  const client = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      width: window.screen?.width ?? null,
      height: window.screen?.height ?? null,
      pixelRatio: window.devicePixelRatio ?? null,
    },
  };

  const payload = {
    gameNightId,
    patronId,
    nickname,
    joinCode,
    client,
    joinedAt: new Date().toISOString(),
  };

  void fetch("/api/analytics/patron-join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Fire and forget; don't block user flow.
  });
}
