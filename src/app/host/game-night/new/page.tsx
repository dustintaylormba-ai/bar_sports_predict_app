import Link from "next/link";
import { redirect } from "next/navigation";

import { createGameNight } from "@/app/host/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewGameNightPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase?.auth.getUser() ?? { data: { user: null } };

  if (!supabase) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">New game night</h1>
        <p className="text-sm text-neutral-600">
          Supabase environment variables are not configured.
        </p>
        <Link className="underline" href="/host">
          Back
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">New game night</h1>
        <p className="text-sm text-neutral-600">Please sign in first.</p>
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
    .limit(1);

  const bar = bars.data?.[0] ?? null;

  if (!bar) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">New game night</h1>
        <p className="text-sm text-neutral-600">Create a bar first.</p>
        <Link className="underline" href="/host/setup">
          Go to setup
        </Link>
      </div>
    );
  }

  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    const code = String(formData.get("code") ?? "");
    const sport = String(formData.get("sport") ?? "NBA");
    const sportsdataioGameIdRaw = String(formData.get("sportsdataioGameId") ?? "").trim();
    const sportsdataioGameId = sportsdataioGameIdRaw ? Number(sportsdataioGameIdRaw) : undefined;

    const created = await createGameNight({
      barId: bar!.id,
      title,
      sport,
      code,
      sportsdataioGameId,
    });

    redirect(`/host/game-night/${created.id}`);
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">New game night</h1>
        <p className="text-sm text-neutral-600">Bar: {bar.name}</p>
      </div>

      <form action={create} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Title (optional)</label>
          <input
            name="title"
            placeholder="NBA Tuesday Night"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Game code</label>
          <input
            name="code"
            required
            placeholder="OKC123"
            className="w-full rounded border px-3 py-2"
          />
          <p className="text-xs text-neutral-600 mt-1">
            Patrons will join at <code>/join/&lt;code&gt;</code>.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Sport</label>
          <select name="sport" className="w-full rounded border px-3 py-2">
            <option value="NBA">NBA</option>
            <option value="NCAA_M">NCAA M</option>
            <option value="NCAA_W">NCAA W</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">
            SportsDataIO GameID (optional)
          </label>
          <input
            name="sportsdataioGameId"
            placeholder="22433"
            inputMode="numeric"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button className="rounded bg-black px-4 py-2 text-white">Create</button>
      </form>

      <Link className="underline" href="/host">
        Back
      </Link>
    </div>
  );
}
