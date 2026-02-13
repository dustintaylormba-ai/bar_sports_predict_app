import { NextResponse } from "next/server";

import { logAnalyticEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const gameNightId = typeof body?.gameNightId === "string" ? body.gameNightId : null;
    const patronId = typeof body?.patronId === "string" ? body.patronId : null;
    const nickname = typeof body?.nickname === "string" ? body.nickname : null;
    if (!gameNightId || !patronId) {
      return NextResponse.json({ ok: false, error: "Missing ids" }, { status: 400 });
    }

    await logAnalyticEvent({
      kind: "patron_joined",
      gameNightId,
      payload: {
        patronId,
        nickname,
        joinCode: body?.joinCode ?? null,
        client: body?.client ?? null,
        joinedAt: body?.joinedAt ?? new Date().toISOString(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to log patron_joined", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
