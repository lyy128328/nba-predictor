import { NextResponse } from "next/server";
import { getPool } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get("poolId");

  if (!poolId) {
    return NextResponse.json({ error: "poolId is required." }, { status: 400 });
  }

  try {
    const pool = await getPool(poolId);
    if (!pool) {
      return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    }

    return NextResponse.json({ pool });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load pool." },
      { status: 500 }
    );
  }
}
