import { NextResponse } from "next/server";

import { logSportsDataIOMetric } from "@/lib/analytics";
import { fetchLiveNbaPlayByPlay } from "@/lib/sportsdataio";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await ctx.params;
  const started = Date.now();

  try {
    const data = await fetchLiveNbaPlayByPlay(gameId);
    await logSportsDataIOMetric({
      gameId,
      source: "live",
      status: 200,
      latencyMs: Date.now() - started,
    }).catch((err) => console.error("Failed to log sportsdataio live metric", err));
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSportsDataIOMetric({
      gameId,
      source: "live",
      status: 502,
      latencyMs: Date.now() - started,
      errorMessage: message,
    }).catch((logErr) => console.error("Failed to log sportsdataio live error", logErr));
    return NextResponse.json(
      { error: "SPORTSDATAIO_LIVE_FAILED", message },
      { status: 502 },
    );
  }
}
