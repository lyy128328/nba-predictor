import { NextResponse } from "next/server";
import { createSeries, deleteAllSeries, deleteSeries, updateSeriesDetails } from "@/lib/data";

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
    poolId?: string;
    round?: string;
    lockAt?: string;
    homeTeam?: { name?: string; shortName?: string; seed?: number; conference?: "East" | "West" };
    awayTeam?: { name?: string; shortName?: string; seed?: number; conference?: "East" | "West" };
  };

  if (!body.poolId || !body.round || !body.lockAt || !body.homeTeam || !body.awayTeam) {
    return NextResponse.json({ error: "poolId, round, lockAt, homeTeam, and awayTeam are required." }, { status: 400 });
  }

  try {
    const series = await createSeries(body.poolId, {
      round: body.round,
      lockAt: body.lockAt,
      homeTeam: {
        name: body.homeTeam.name ?? "",
        shortName: body.homeTeam.shortName ?? "",
        seed: Number(body.homeTeam.seed),
        conference: body.homeTeam.conference ?? "East"
      },
      awayTeam: {
        name: body.awayTeam.name ?? "",
        shortName: body.awayTeam.shortName ?? "",
        seed: Number(body.awayTeam.seed),
        conference: body.awayTeam.conference ?? "West"
      }
    });

    return NextResponse.json({ series });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create series." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    poolId?: string;
    seriesId?: string;
    round?: string;
    lockAt?: string;
    homeTeam?: { name?: string; shortName?: string; seed?: number; conference?: "East" | "West" };
    awayTeam?: { name?: string; shortName?: string; seed?: number; conference?: "East" | "West" };
  };

  if (!body.poolId || !body.seriesId || !body.round || !body.lockAt || !body.homeTeam || !body.awayTeam) {
    return NextResponse.json(
      { error: "poolId, seriesId, round, lockAt, homeTeam, and awayTeam are required." },
      { status: 400 }
    );
  }

  try {
    const series = await updateSeriesDetails(body.poolId, body.seriesId, {
      round: body.round,
      lockAt: body.lockAt,
      homeTeam: {
        name: body.homeTeam.name ?? "",
        shortName: body.homeTeam.shortName ?? "",
        seed: Number(body.homeTeam.seed),
        conference: body.homeTeam.conference ?? "East"
      },
      awayTeam: {
        name: body.awayTeam.name ?? "",
        shortName: body.awayTeam.shortName ?? "",
        seed: Number(body.awayTeam.seed),
        conference: body.awayTeam.conference ?? "West"
      }
    });

    if (!series) {
      return NextResponse.json({ error: "Series not found." }, { status: 404 });
    }

    return NextResponse.json({ series });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update series." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { poolId?: string; seriesId?: string; deleteAll?: boolean };

  if (!body.poolId) {
    return NextResponse.json({ error: "poolId is required." }, { status: 400 });
  }

  try {
    if (body.deleteAll) {
      await deleteAllSeries(body.poolId);
      return NextResponse.json({ ok: true });
    }

    if (!body.seriesId) {
      return NextResponse.json({ error: "seriesId is required." }, { status: 400 });
    }

    const deleted = await deleteSeries(body.poolId, body.seriesId);
    if (!deleted) {
      return NextResponse.json({ error: "Series not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete series." },
      { status: 500 }
    );
  }
}
