import { NextResponse } from "next/server";
import { cloneSeriesBetweenPools } from "@/lib/data";

function isAuthorized(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get("x-admin-secret");
  return Boolean(adminSecret && requestSecret === adminSecret);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    sourcePoolId?: string;
    targetPoolId?: string;
    replaceExisting?: boolean;
  };

  if (!body.sourcePoolId || !body.targetPoolId) {
    return NextResponse.json({ error: "sourcePoolId and targetPoolId are required." }, { status: 400 });
  }

  try {
    const copied = await cloneSeriesBetweenPools(
      body.sourcePoolId,
      body.targetPoolId,
      Boolean(body.replaceExisting)
    );

    return NextResponse.json({ ok: true, copied });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to copy series." },
      { status: 500 }
    );
  }
}
