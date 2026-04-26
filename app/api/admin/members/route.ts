import { NextResponse } from "next/server";
import { listAdminPoolMembers, removePoolMember } from "@/lib/data";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function checkSecret(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get("x-admin-secret");
  return Boolean(adminSecret && requestSecret === adminSecret);
}

export async function GET(request: Request) {
  if (!checkSecret(request)) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get("poolId");

  if (!poolId) {
    return NextResponse.json({ error: "poolId is required." }, { status: 400 });
  }

  try {
    const members = await listAdminPoolMembers(poolId);
    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load members." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!checkSecret(request)) {
    return unauthorized();
  }

  const body = (await request.json()) as { poolId?: string; userId?: string };
  if (!body.poolId || !body.userId) {
    return NextResponse.json({ error: "poolId and userId are required." }, { status: 400 });
  }

  try {
    const deleted = await removePoolMember(body.poolId, body.userId);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove member." },
      { status: 500 }
    );
  }
}
