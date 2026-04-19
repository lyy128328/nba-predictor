import { NextResponse } from "next/server";
import { updateSeriesResult } from "@/lib/data";

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get("x-admin-secret");

  if (!adminSecret || requestSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    poolId?: string;
    seriesId?: string;
    winnerShortName?: string;
    games?: number;
  };

  if (!body.poolId || !body.seriesId || !body.winnerShortName || typeof body.games !== "number") {
    return NextResponse.json(
      { error: "poolId, seriesId, winnerShortName, and games are required." },
      { status: 400 }
    );
  }

  try {
    const result = await updateSeriesResult(body.poolId, body.seriesId, body.winnerShortName, body.games);
    if (!result) {
      return NextResponse.json({ error: "Series not found." }, { status: 404 });
    }

    return NextResponse.json({ series: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update result." },
      { status: 500 }
    );
  }
}
