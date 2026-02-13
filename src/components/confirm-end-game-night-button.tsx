"use client";

import { useTransition } from "react";

export function ConfirmEndGameNightButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "End this game night? This locks scoring and returns you to the host dashboard.",
    );
    if (!confirmed) return;

    startTransition(() => {
      void action();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded bg-rose-700 px-3 py-2 text-white disabled:opacity-60"
    >
      {isPending ? "Ending…" : "End game night"}
    </button>
  );
}
