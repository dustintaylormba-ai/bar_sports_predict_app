import Link from "next/link";

import { ensureBar } from "@/app/host/actions";
import { createClient } from "@/lib/supabase/server";

export default async function HostSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase?.auth.getUser() ?? { data: { user: null } };

  if (!supabase) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Setup</h1>
        <p className="text-sm text-neutral-600">
          Supabase environment variables are not configured.
        </p>
        <Link className="underline" href="/">
          Home
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Setup</h1>
        <p className="text-sm text-neutral-600">Please sign in first.</p>
        <Link className="underline" href="/host/login">
          Go to login
        </Link>
      </div>
    );
  }

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "");
    await ensureBar(name);
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Bar setup</h1>
        <p className="text-sm text-neutral-600">Create your first bar.</p>
      </div>

      <form action={create} className="space-y-3">
        <label className="block text-sm font-medium">Bar name</label>
        <input
          name="name"
          required
          placeholder="DT’s Sports Bar"
          className="w-full rounded border px-3 py-2"
        />
        <button className="rounded bg-black px-4 py-2 text-white">Create</button>
      </form>

      <Link className="underline" href="/host">
        Back
      </Link>
    </div>
  );
}
