"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function HostLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");

    const supabase = createClient();
    const origin = window.location.origin;
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        // @ts-expect-error flowType is available in supabase-js but missing from our types
        flowType: "implicit",
      },
    });

    if (err) {
      setError(err.message);
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Host Login</h1>
        <p className="text-sm text-neutral-600">
          Enter your email to receive a magic link.
        </p>
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@bar.com"
          className="w-full rounded border px-3 py-2"
        />

        <button
          type="submit"
          disabled={status === "sending" || email.length < 3}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>

        {status === "sent" ? (
          <p className="text-sm text-green-700">
            Sent. Check your email for the sign-in link.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700">Error: {error}</p>
        ) : null}
      </form>
    </div>
  );
}
