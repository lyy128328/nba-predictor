import { NextResponse } from "next/server";
import { deletePool } from "@/lib/data";

export async function DELETE(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get("x-admin-secret");

  if (!adminSecret || requestSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { poolId?: string };

  if (!body.poolId) {
    return NextResponse.json({ error: "poolId is required." }, { status: 400 });
  }

  try {
    await deletePool(body.poolId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete pool." },
      { status: 500 }
    );
  }
}
