import { NextResponse } from "next/server";
import { createPool, upsertUser } from "@/lib/data";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; displayName?: string };

  if (!body.name?.trim() || !body.displayName?.trim()) {
    return NextResponse.json({ error: "name and displayName are required." }, { status: 400 });
  }

  try {
    const user = await upsertUser(body.displayName);
    const pool = await createPool(body.name, user);

    return NextResponse.json({ pool, user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create pool." },
      { status: 500 }
    );
  }
}
