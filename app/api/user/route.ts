import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/data";

export async function GET() {
  try {
    const user = await upsertUser("Guest");
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create guest user." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { displayName?: string };

  if (!body.displayName?.trim()) {
    return NextResponse.json({ error: "displayName is required." }, { status: 400 });
  }

  try {
    const user = await upsertUser(body.displayName);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save user." },
      { status: 500 }
    );
  }
}
