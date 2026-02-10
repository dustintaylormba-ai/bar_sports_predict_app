export type SportsDataIOConfig = {
  apiKey: string;
  replayBaseUrl: string;
};

export function getSportsDataIOConfig(): SportsDataIOConfig {
  const apiKey = process.env.SPORTSDATAIO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SPORTSDATAIO_API_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }

  return {
    apiKey,
    replayBaseUrl:
      process.env.SPORTSDATAIO_REPLAY_BASE_URL ?? "https://replay.sportsdata.io",
  };
}

export async function fetchReplayNbaPlayByPlay(gameId: string | number) {
  const { apiKey, replayBaseUrl } = getSportsDataIOConfig();

  const url = new URL(
    `/api/v3/nba/pbp/json/playbyplay/${encodeURIComponent(String(gameId))}`,
    replayBaseUrl,
  );
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    // Replay is essentially immutable for a given moment; tweak later if needed.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `SportsDataIO replay request failed: ${res.status} ${res.statusText}\n${body}`,
    );
  }

  return res.json();
}
