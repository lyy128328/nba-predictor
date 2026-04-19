import { NextResponse } from "next/server";
import { joinPool, upsertUser } from "@/lib/data";

export async function POST(request: Request) {
  const body = (await request.json()) as { poolCode?: string; displayName?: string };

  if (!body.poolCode?.trim() || !body.displayName?.trim()) {
    return NextResponse.json({ error: "poolCode and displayName are required." }, { status: 400 });
  }

  try {
    const user = await upsertUser(body.displayName);
    const pool = await joinPool(body.poolCode, user);

    if (!pool) {
      return NextResponse.json({ error: "Pool not found for that invite code." }, { status: 404 });
    }

    return NextResponse.json({ pool, user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to join pool." },
      { status: 500 }
    );
  }
}
