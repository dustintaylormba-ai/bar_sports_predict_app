import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createPrompt,
  endGameNight,
  lockPrompt,
  openPrompt,
  reopenPrompt,
  resolvePrompt,
  voidPrompt,
} from "@/app/host/actions";
import { createClient } from "@/lib/supabase/server";
import { ConfirmEndGameNightButton } from "@/components/confirm-end-game-night-button";
import { ConfirmButton } from "@/components/confirm-button";

export default async function HostGameNightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase?.auth.getUser() ?? { data: { user: null } };

  if (!supabase) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Game night</h1>
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
        <h1 className="text-2xl font-semibold">Game night</h1>
        <p className="text-sm text-neutral-600">Please sign in first.</p>
        <Link className="underline" href="/host/login">
          Go to login
        </Link>
      </div>
    );
  }

  const gnRes = await supabase
    .from("game_nights")
    .select("id,code,title,sport,sportsdataio_game_id,created_at")
    .eq("id", id)
    .single();

  const gameNight = gnRes.data;

  if (!gameNight) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <Link className="underline" href="/host">
          Back
        </Link>
      </div>
    );
  }

  const gameNightId = gameNight.id;

  const promptsRes = await supabase
    .from("prompts")
    .select("id,kind,question,state,locks_at,created_at,over_under_line")
    .eq("game_night_id", gameNightId)
    .order("created_at", { ascending: false })
    .limit(20);

  const prompts = promptsRes.data ?? [];
  const current = prompts[0] ?? null;

  const currentOptions = current
    ? await supabase
        .from("prompt_options")
        .select("id,label")
        .eq("prompt_id", current.id)
        .order("created_at", { ascending: true })
    : null;

  async function createMc(formData: FormData) {
    "use server";
    const question = String(formData.get("question") ?? "");
    const options = String(formData.get("options") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    await createPrompt({
      gameNightId,
      kind: "multiple_choice",
      question,
      options,
    });
  }

  async function createOu(formData: FormData) {
    "use server";
    const question = String(formData.get("question") ?? "");
    const line = Number(String(formData.get("line") ?? "0"));

    await createPrompt({
      gameNightId,
      kind: "over_under",
      question,
      overUnderLine: line,
    });
  }

  async function open(formData: FormData) {
    "use server";
    const promptId = String(formData.get("promptId") ?? "");
    const duration = Number(String(formData.get("duration") ?? "30"));
    await openPrompt(promptId, duration);
  }

  async function reopen(formData: FormData) {
    "use server";
    const promptId = String(formData.get("promptId") ?? "");
    const duration = Number(String(formData.get("duration") ?? "30"));
    await reopenPrompt(promptId, duration);
  }

  async function lock(formData: FormData) {
    "use server";
    const promptId = String(formData.get("promptId") ?? "");
    await lockPrompt(promptId);
  }

  async function resolve(formData: FormData) {
    "use server";
    const promptId = String(formData.get("promptId") ?? "");
    const correctOptionId = String(formData.get("correctOptionId") ?? "");
    await resolvePrompt({ promptId, correctOptionId });
  }

  async function voidIt(formData: FormData) {
    "use server";
    const promptId = String(formData.get("promptId") ?? "");
    await voidPrompt(promptId);
  }

  async function endNight() {
    "use server";
    await endGameNight(gameNightId);
    redirect("/host");
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {gameNight.title ?? "Game Night"} — <code>{gameNight.code}</code>
        </h1>
        <div className="text-sm text-neutral-600">
          {gameNight.sport}
          {gameNight.sportsdataio_game_id
            ? ` — SportsDataIO GameID ${gameNight.sportsdataio_game_id}`
            : ""}
        </div>
        <div className="text-sm">
          Patron join link: <code>/join/{gameNight.code}</code>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded border p-4 space-y-4">
          <div className="font-semibold">Create prompt</div>

          <form action={createMc} className="space-y-2">
            <div className="text-sm font-medium">Multiple choice</div>
            <input
              name="question"
              required
              placeholder="Who scores next?"
              className="w-full rounded border px-3 py-2"
            />
            <textarea
              name="options"
              required
              placeholder={`Option A\nOption B\nOption C`}
              className="w-full rounded border px-3 py-2 h-28"
            />
            <button className="rounded bg-black px-3 py-2 text-white">
              Create MC prompt
            </button>
          </form>

          <hr />

          <form action={createOu} className="space-y-2">
            <div className="text-sm font-medium">Over / Under</div>
            <input
              name="question"
              required
              placeholder="Total points in next 3 minutes"
              className="w-full rounded border px-3 py-2"
            />
            <input
              name="line"
              required
              inputMode="decimal"
              placeholder="12.5"
              className="w-full rounded border px-3 py-2"
            />
            <button className="rounded bg-black px-3 py-2 text-white">
              Create O/U prompt
            </button>
          </form>
        </div>

        <div className="rounded border p-4 space-y-4">
          <div className="font-semibold">Current prompt</div>
          {current ? (
            <div className="space-y-2">
              <div className="text-sm text-neutral-600">
                {current.kind} — {current.state}
              </div>
              <div className="font-medium">{current.question}</div>
              {current.kind === "over_under" ? (
                <div className="text-sm">Line: {current.over_under_line}</div>
              ) : null}

              <form action={open} className="flex items-end gap-2">
                <input type="hidden" name="promptId" value={current.id} />
                <div className="flex-1">
                  <label className="block text-xs text-neutral-600">Duration (sec)</label>
                  <input
                    name="duration"
                    defaultValue={30}
                    inputMode="numeric"
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <button className="rounded bg-blue-600 px-3 py-2 text-white">
                  Open
                </button>
              </form>

              <form action={reopen} className="flex items-end gap-2">
                <input type="hidden" name="promptId" value={current.id} />
                <div className="flex-1">
                  <label className="block text-xs text-neutral-600">
                    Reopen duration (sec)
                  </label>
                  <input
                    name="duration"
                    defaultValue={30}
                    inputMode="numeric"
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <button className="rounded bg-indigo-600 px-3 py-2 text-white">
                  Reopen
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                <form action={lock}>
                  <input type="hidden" name="promptId" value={current.id} />
                  <button className="rounded bg-neutral-800 px-3 py-2 text-white">
                    Lock
                  </button>
                </form>

                <form action={voidIt}>
                  <input type="hidden" name="promptId" value={current.id} />
                  <ConfirmButton
                    message="Void this prompt? This removes submissions and scores for it."
                    className="rounded bg-red-600 px-3 py-2 text-white"
                  >
                    Void
                  </ConfirmButton>
                </form>
              </div>

              {currentOptions?.data?.length ? (
                <form action={resolve} className="space-y-2">
                  <input type="hidden" name="promptId" value={current.id} />
                  <label className="block text-xs text-neutral-600">
                    Correct answer
                  </label>
                  <select
                    name="correctOptionId"
                    className="w-full rounded border px-3 py-2"
                    defaultValue={currentOptions.data[0].id}
                  >
                    {currentOptions.data.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ConfirmButton
                    message="Resolve this prompt and score patrons? This cannot be undone without reopening."
                    className="rounded bg-green-700 px-3 py-2 text-white"
                  >
                    Resolve + score
                  </ConfirmButton>
                </form>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-neutral-600">No prompts yet.</div>
          )}
        </div>
      </div>

      <div className="rounded border p-4 space-y-3">
        <div className="font-semibold">Game night controls</div>
        <p className="text-sm text-neutral-600">
          Ending the night locks out new prompts and freezes patron scoring.
        </p>
        <ConfirmEndGameNightButton action={endNight} />
      </div>

      <div className="space-y-2">
        <div className="font-semibold">Recent prompts</div>
        <ul className="space-y-2">
          {prompts.map((p) => (
            <li key={p.id} className="rounded border p-3">
              <div className="text-xs text-neutral-600">
                {new Date(p.created_at).toLocaleString()} — {p.kind} — {p.state}
                {p.locks_at ? ` — locks ${new Date(p.locks_at).toLocaleTimeString()}` : ""}
              </div>
              <div className="text-sm font-medium">{p.question}</div>
            </li>
          ))}
        </ul>
      </div>

      <Link className="underline" href="/host">
        Back
      </Link>
    </div>
  );
}
