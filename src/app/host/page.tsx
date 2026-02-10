import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function HostHomePage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Host</h1>
        <p className="text-sm text-neutral-600">
          Supabase environment variables are not configured.
        </p>
        <p className="text-sm text-neutral-600">
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
        </p>
        <Link className="underline" href="/">
          Home
        </Link>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Host</h1>
        <p className="text-sm text-neutral-600">You are not signed in.</p>
        <Link className="underline" href="/host/login">
          Go to login
        </Link>
      </div>
    );
  }

  const bars = await supabase
    .from("bars")
    .select("id,name")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(5);

  const bar = bars.data?.[0] ?? null;

  const gameNights = bar
    ? await supabase
        .from("game_nights")
        .select("id,code,title,status,created_at")
        .eq("bar_id", bar.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : null;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Host</h1>
        <div className="text-sm text-neutral-600">Signed in as {user.email}</div>
      </div>

      {!bar ? (
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Create your first bar</div>
          <p className="text-sm text-neutral-600">
            Next: set a bar name so you can create game nights.
          </p>
          <Link className="underline" href="/host/setup">
            Go to setup
          </Link>
        </div>
      ) : (
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Bar: {bar.name}</div>
          <div className="text-sm text-neutral-600">Create a new game night:</div>
          <Link className="underline" href="/host/game-night/new">
            New game night
          </Link>
        </div>
      )}

      {gameNights?.data?.length ? (
        <div className="space-y-2">
          <div className="font-semibold">Recent game nights</div>
          <ul className="space-y-2">
            {gameNights.data.map((gn) => (
              <li key={gn.id} className="rounded border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      {gn.title ?? "Game Night"} — <code>{gn.code}</code>
                    </div>
                    <div className="text-xs text-neutral-600">
                      {new Date(gn.created_at).toLocaleString()} — {gn.status}
                    </div>
                  </div>
                  <Link className="underline" href={`/host/game-night/${gn.id}`}>
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
