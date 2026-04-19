import { NextResponse } from "next/server";
import { listAdminPools } from "@/lib/data";

export async function GET(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const requestSecret = request.headers.get("x-admin-secret");

  if (!adminSecret || requestSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const pools = await listAdminPools();
    return NextResponse.json({ pools });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load pools." },
      { status: 500 }
    );
  }
}
