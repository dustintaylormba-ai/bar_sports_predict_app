'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<"checking" | "error">("checking");
  const [message, setMessage] = useState("Hold tight while we finish signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Hash params → easiest path (Supabase magic link default)
      const hash = window.location.hash?.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();

      const hashError = hash.get("error");
      if (hashError) {
        const desc = decodeURIComponent(hash.get("error_description") ?? hashError);
        if (!cancelled) {
          setStatus("error");
          setMessage(desc);
        }
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (cancelled) return;

        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        window.history.replaceState({}, document.title, "/auth/callback");
        router.replace("/host");
        return;
      }

      // Legacy code-flow fallback
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) return;

        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        router.replace("/host");
        return;
      }

      if (!cancelled) {
        setStatus("error");
        setMessage("Missing sign-in info. Request a new link.");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, supabase]);

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Signing you in…</h1>
        <p className="text-sm text-neutral-600">{message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign-in failed</h1>
      <p className="text-sm text-red-700">{message}</p>
      <Link className="underline" href="/host/login">
        Back to login
      </Link>
    </div>
  );
}
