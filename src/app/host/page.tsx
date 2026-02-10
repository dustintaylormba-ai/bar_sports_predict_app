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
        <p className="text-sm text-neutral-600">
          You are not signed in.
        </p>
        <Link className="underline" href="/host/login">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Host</h1>
      <div className="rounded border p-4">
        <div className="text-sm text-neutral-600">Signed in as</div>
        <div className="font-medium">{user.email}</div>
      </div>

      <div className="space-y-2">
        <div className="font-semibold">Next</div>
        <ul className="list-disc pl-5 text-sm">
          <li>Bar + GameNight creation UI</li>
          <li>Prompt lifecycle (open/lock/resolve)</li>
          <li>Patron join + leaderboard</li>
        </ul>
      </div>
    </div>
  );
}
