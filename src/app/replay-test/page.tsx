import Link from "next/link";
import { headers } from "next/headers";

type Play = {
  PlayID: number;
  QuarterName: string;
  Sequence: number;
  TimeRemainingMinutes: number;
  TimeRemainingSeconds: number;
  Description: string;
  AwayTeamScore: number;
  HomeTeamScore: number;
};

export default async function ReplayTestPage() {
  const gameId = 22433;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";

  const res = await fetch(`${proto}://${host}/api/sportsdataio/replay/nba/pbp/${gameId}`, {
    cache: "no-store",
  });

  const json = await res.json();

  const game = json?.Game;
  const plays = (json?.Plays ?? []) as Play[];
  const lastPlays = plays.slice(-25).reverse();

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">SportsDataIO Replay Test</h1>
        <p className="text-sm text-neutral-600">
          GameID {gameId}. This page is a dev smoke test.
        </p>
        <p className="text-sm">
          <Link className="underline" href="/">
            Home
          </Link>
        </p>
      </div>

      {!res.ok ? (
        <pre className="whitespace-pre-wrap rounded border p-4 text-sm">
          {JSON.stringify(json, null, 2)}
        </pre>
      ) : (
        <>
          <div className="rounded border p-4">
            <div className="font-medium">
              {game?.AwayTeam} @ {game?.HomeTeam}
            </div>
            <div className="text-sm text-neutral-600">
              {game?.Status} — Q{game?.Quarter} — {game?.AwayTeamScore} :{" "}
              {game?.HomeTeamScore} — {game?.TimeRemainingMinutes}:
              {String(game?.TimeRemainingSeconds).padStart(2, "0")}
            </div>
            <div className="text-sm mt-2">LastPlay: {game?.LastPlay}</div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Recent plays</h2>
            <ul className="space-y-2">
              {lastPlays.map((p) => (
                <li key={p.PlayID} className="rounded border p-3">
                  <div className="text-xs text-neutral-600">
                    Q{p.QuarterName} — {p.TimeRemainingMinutes}:
                    {String(p.TimeRemainingSeconds).padStart(2, "0")} — Seq {p.Sequence}
                  </div>
                  <div className="text-sm">{p.Description}</div>
                  <div className="text-xs text-neutral-600 mt-1">
                    Score: {p.AwayTeamScore} - {p.HomeTeamScore}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
