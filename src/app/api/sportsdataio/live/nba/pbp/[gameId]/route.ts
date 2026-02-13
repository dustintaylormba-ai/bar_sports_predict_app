import { NextResponse } from "next/server";

import { fetchLiveNbaPlayByPlay } from "@/lib/sportsdataio";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await ctx.params;

  try {
    const data = await fetchLiveNbaPlayByPlay(gameId);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "SPORTSDATAIO_LIVE_FAILED", message },
      { status: 502 },
    );
  }
}
