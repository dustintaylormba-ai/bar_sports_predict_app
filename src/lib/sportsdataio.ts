export type SportsDataIOSource = "replay" | "live";

export type SportsDataIOConfig = {
  apiKey: string;
  replayBaseUrl: string;
  liveBaseUrl: string;
};

function ensureEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  }
  return value;
}

export function getSportsDataIOConfig(): SportsDataIOConfig {
  const apiKey = ensureEnv("SPORTSDATAIO_API_KEY", process.env.SPORTSDATAIO_API_KEY);

  return {
    apiKey,
    replayBaseUrl:
      process.env.SPORTSDATAIO_REPLAY_BASE_URL ?? "https://replay.sportsdata.io",
    liveBaseUrl: process.env.SPORTSDATAIO_LIVE_BASE_URL ?? "https://api.sportsdata.io",
  };
}

function buildNbaPlayByPlayPath(gameId: string | number, source: SportsDataIOSource) {
  const encoded = encodeURIComponent(String(gameId));
  if (source === "live") {
    // Live API path per SportsDataIO docs.
    return `/v3/nba/stats/json/PlayByPlay/${encoded}`;
  }
  return `/api/v3/nba/pbp/json/playbyplay/${encoded}`;
}

export async function fetchNbaPlayByPlay(
  gameId: string | number,
  source: SportsDataIOSource = "replay",
) {
  const { apiKey, replayBaseUrl, liveBaseUrl } = getSportsDataIOConfig();
  const baseUrl = source === "live" ? liveBaseUrl : replayBaseUrl;
  const url = new URL(buildNbaPlayByPlayPath(gameId, source), baseUrl);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    cache: source === "replay" ? "no-store" : "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `SportsDataIO ${source} request failed: ${res.status} ${res.statusText}\n${body}`,
    );
  }

  return res.json();
}

export async function fetchReplayNbaPlayByPlay(gameId: string | number) {
  return fetchNbaPlayByPlay(gameId, "replay");
}

export async function fetchLiveNbaPlayByPlay(gameId: string | number) {
  return fetchNbaPlayByPlay(gameId, "live");
}
