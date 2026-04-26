import { NextResponse } from "next/server";
import { getPool, getPoolPicks, getUserPicks, saveUserPicks } from "@/lib/data";
import { Pick } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get("poolId");
  const userId = searchParams.get("userId");
  const viewerUserId = searchParams.get("viewerUserId");
  const scope = searchParams.get("scope");

  if (!poolId) {
    return NextResponse.json({ error: "poolId is required." }, { status: 400 });
  }

  try {
    if (scope === "all") {
      if (!viewerUserId) {
        return NextResponse.json({ error: "viewerUserId is required." }, { status: 400 });
      }

      return NextResponse.json({ entries: await getPoolPicks(poolId, viewerUserId) });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    return NextResponse.json({ picks: await getUserPicks(poolId, userId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load picks." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { poolId?: string; userId?: string; picks?: Pick[] };

  if (!body.poolId || !body.userId || !Array.isArray(body.picks)) {
    return NextResponse.json({ error: "poolId, userId, and picks are required." }, { status: 400 });
  }

  try {
    const pool = await getPool(body.poolId);
    if (!pool) {
      return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    }

    const sanitized = await saveUserPicks(body.poolId, body.userId, body.picks);
    return NextResponse.json({ ok: true, picks: sanitized });
  } catch (error) {
    console.error("[api/picks] unable to save picks", {
      poolId: body.poolId,
      userId: body.userId,
      picksCount: body.picks?.length ?? 0,
      error
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save picks." },
      { status: 500 }
    );
  }
}
