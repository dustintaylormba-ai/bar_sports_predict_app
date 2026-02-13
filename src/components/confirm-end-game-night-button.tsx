"use client";

import { useTransition } from "react";

import { useToast } from "@/components/toast-provider";

export function ConfirmEndGameNightButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleClick() {
    const confirmed = window.confirm(
      "End this game night? This locks scoring and returns you to the host dashboard.",
    );
    if (!confirmed) return;

    startTransition(() => {
      action()
        .then(() =>
          toast({
            title: "Game night ended",
            description: "Host dashboard updated",
            variant: "success",
          }),
        )
        .catch((err) =>
          toast({
            title: "Failed to end game night",
            description: err.message,
            variant: "error",
          }),
        );
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
