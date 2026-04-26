import { NextResponse } from "next/server";
import { getPoolActivities } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get("poolId");
  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = Number(searchParams.get("limit") ?? "12");

  if (!poolId) {
    return NextResponse.json({ error: "poolId is required." }, { status: 400 });
  }

  try {
    const page = await getPoolActivities(poolId, offset, limit);
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load activity." },
      { status: 500 }
    );
  }
}
