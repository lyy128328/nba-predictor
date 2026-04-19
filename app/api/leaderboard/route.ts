import { NextResponse } from "next/server";
import { computeLeaderboard } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get("poolId");

  if (!poolId) {
    return NextResponse.json({ error: "poolId is required." }, { status: 400 });
  }

  try {
    return NextResponse.json({ entries: await computeLeaderboard(poolId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load leaderboard." },
      { status: 500 }
    );
  }
}
