import { NextResponse } from "next/server";
import { clearSeriesResult, updateSeriesResult } from "@/lib/data";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function isAuthorized(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get("x-admin-secret");
  return Boolean(adminSecret && requestSecret === adminSecret);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
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

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const body = (await request.json()) as {
    poolId?: string;
    seriesId?: string;
  };

  if (!body.poolId || !body.seriesId) {
    return NextResponse.json({ error: "poolId and seriesId are required." }, { status: 400 });
  }

  try {
    const result = await clearSeriesResult(body.poolId, body.seriesId);
    if (!result) {
      return NextResponse.json({ error: "Series not found." }, { status: 404 });
    }

    return NextResponse.json({ series: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to clear result." },
      { status: 500 }
    );
  }
}
