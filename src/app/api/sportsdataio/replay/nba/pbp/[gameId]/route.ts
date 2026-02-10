import { NextResponse } from "next/server";

import { fetchReplayNbaPlayByPlay } from "@/lib/sportsdataio";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await ctx.params;

  try {
    const data = await fetchReplayNbaPlayByPlay(gameId);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "SPORTSDATAIO_REPLAY_FAILED", message },
      { status: 502 },
    );
  }
}
