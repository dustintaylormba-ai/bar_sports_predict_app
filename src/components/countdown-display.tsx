"use client";

import { useEffect, useState } from "react";

function formatTimeRemaining(ms: number): string {
  const clamped = Math.max(ms, 0);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function computePotentialPoints(
  opensAtIso: string | null,
  locksAtIso: string | null,
  now: Date,
): number | null {
  if (!opensAtIso || !locksAtIso) return null;
  const opensAt = new Date(opensAtIso).getTime();
  const locksAt = new Date(locksAtIso).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(opensAt) || !Number.isFinite(locksAt)) return null;
  const minPoints = 5;
  const maxPoints = 10;
  const maxWindowMs = 5 * 1000;
  const minWindowMs = 2 * 1000;
  const startDecay = opensAt + maxWindowMs;
  const endDecay = locksAt - minWindowMs;

  if (nowMs <= startDecay) return maxPoints;
  if (nowMs >= endDecay) return minPoints;

  const denom = endDecay - startDecay;
  if (denom <= 0) return minPoints;
  const frac = Math.min(Math.max((nowMs - startDecay) / denom, 0), 1);
  const raw = maxPoints - (maxPoints - minPoints) * frac;
  return Math.round(raw);
}

export function CountdownDisplay({
  locksAt,
  opensAt,
}: {
  locksAt: string;
  opensAt: string | null;
}) {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [potentialPoints, setPotentialPoints] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const locksMs = new Date(locksAt).getTime();
      setTimeRemaining(formatTimeRemaining(locksMs - now.getTime()));
      setPotentialPoints(computePotentialPoints(opensAt, locksAt, now));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [locksAt, opensAt]);

  if (!timeRemaining && !potentialPoints) return null;

  return (
    <div className="rounded border px-3 py-2 text-sm flex flex-wrap items-center gap-3 bg-neutral-50">
      {timeRemaining ? (
        <div>
          Time remaining: <span className="font-semibold">{timeRemaining}</span>
        </div>
      ) : null}
      {potentialPoints ? (
        <div>
          Current value: <span className="font-semibold">{potentialPoints} pts</span>
        </div>
      ) : null}
    </div>
  );
}
