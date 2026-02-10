"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { normalizeGameCode } from "@/lib/codes";
import { createClient } from "@/lib/supabase/client";

export default function JoinPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const code = normalizeGameCode(params.code);

  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
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

    const nn = nickname.trim();
    if (!nn) return;
    if (!gameNight?.id) return;

    const { data, error: err } = await supabase
      .from("patrons")
      .insert({ game_night_id: gameNight.id, nickname: nn })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    localStorage.setItem(`patron:${code}:id`, data.id);
    localStorage.setItem(`patron:${code}:nickname`, nn);

    router.push(`/g/${code}`);
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

        <button className="rounded bg-black px-4 py-2 text-white">Join</button>

        {error ? <div className="text-sm text-red-700">{error}</div> : null}
      </form>
    </div>
  );
}
