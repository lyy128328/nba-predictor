"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getStoredUserSession,
  rememberPool,
  removeRememberedPool
} from "@/lib/browser-session";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Leaderboard } from "@/components/Leaderboard";
import { PicksBoard } from "@/components/PicksBoard";
import { SeriesCard } from "@/components/SeriesCard";
import { SubmitBar } from "@/components/SubmitBar";
import { Pick, Pool, PoolMemberPicks, Series, UserSession } from "@/lib/types";

type SeriesResponse = {
  pool: Pool;
};

export default function PoolPage() {
  const params = useParams<{ id: string }>();
  const poolId = params.id;
  const [pool, setPool] = useState<Pool | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; displayName: string; score: number; exactCalls: number; correctWinners: number }>>([]);
  const [allPicks, setAllPicks] = useState<PoolMemberPicks[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [user, setUser] = useState<UserSession | null>(null);
  const [status, setStatus] = useState("Loading pool...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUser(getStoredUserSession());
  }, []);

  useEffect(() => {
    async function loadPool() {
      setStatus("Loading pool...");

      const [seriesResponse, leaderboardResponse] = await Promise.all([
        fetch(`/api/series?poolId=${poolId}`),
        fetch(`/api/leaderboard?poolId=${poolId}`)
      ]);

      if (!seriesResponse.ok) {
        removeRememberedPool(poolId);
        setStatus("Pool not found.");
        return;
      }

      const seriesPayload = (await seriesResponse.json()) as SeriesResponse;
      const leaderboardPayload = (await leaderboardResponse.json()) as { entries: typeof leaderboard };

      setPool(seriesPayload.pool);
      rememberPool(seriesPayload.pool);
      setLeaderboard(leaderboardPayload.entries);
      setErrorMessage(null);
      setStatus("");
    }

    void loadPool();
  }, [poolId]);

  useEffect(() => {
    async function loadPicks() {
      if (!user) {
        return;
      }

      const [myPicksResponse, allPicksResponse] = await Promise.all([
        fetch(`/api/picks?poolId=${poolId}&userId=${user.id}`),
        fetch(`/api/picks?poolId=${poolId}&scope=all&viewerUserId=${user.id}`)
      ]);

      if (!myPicksResponse.ok) {
        return;
      }

      const payload = (await myPicksResponse.json()) as { picks: Pick[] };
      setPicks(Object.fromEntries(payload.picks.map((pick) => [pick.seriesId, pick])));

      if (allPicksResponse.ok) {
        const allPicksPayload = (await allPicksResponse.json()) as { entries: PoolMemberPicks[] };
        setAllPicks(allPicksPayload.entries);
      }
    }

    void loadPicks();
  }, [poolId, user]);

  const totalSeries = pool?.series.length ?? 0;
  const editableSeries = useMemo(
    () =>
      pool?.series.filter(
        (series) => series.status === "open" && new Date(series.lockAt).getTime() > Date.now()
      ).length ?? 0,
    [pool]
  );
  const completedSeries = useMemo(
    () => Object.values(picks).filter((pick) => pick.winnerShortName && pick.games).length,
    [picks]
  );

  function handlePickChange(nextPick: Pick) {
    setPicks((current) => ({
      ...current,
      [nextPick.seriesId]: nextPick
    }));
  }

  async function handleSubmit() {
    if (!user) {
      setStatus("Create or join a pool from the home page first so we can identify your picks.");
      setErrorMessage("No active user session for this pool.");
      return;
    }

    const payload = {
      poolId,
      userId: user.id,
      picks: Object.values(picks)
    };

    setSaving(true);
    setErrorMessage(null);
    setStatus("");

    try {
      console.log("[submit-picks] request", payload);

      const response = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      console.log("[submit-picks] response", response.status, rawText);

      let responsePayload: { error?: string } | { ok?: boolean; picks?: Pick[] } = {};
      try {
        responsePayload = rawText ? (JSON.parse(rawText) as typeof responsePayload) : {};
      } catch (error) {
        console.error("[submit-picks] invalid json response", error);
      }

      if (!response.ok) {
        const nextError = "error" in responsePayload ? responsePayload.error ?? "Unable to save picks." : "Unable to save picks.";
        setStatus(nextError);
        setErrorMessage(nextError);
        return;
      }

      const [leaderboardResponse, seriesResponse, allPicksResponse] = await Promise.all([
        fetch(`/api/leaderboard?poolId=${poolId}`),
        fetch(`/api/series?poolId=${poolId}`),
        fetch(`/api/picks?poolId=${poolId}&scope=all&viewerUserId=${user.id}`)
      ]);

      const leaderboardPayload = (await leaderboardResponse.json()) as { entries: typeof leaderboard; error?: string };
      const seriesPayload = (await seriesResponse.json()) as SeriesResponse & { error?: string };
      const allPicksPayload = allPicksResponse.ok ? ((await allPicksResponse.json()) as { entries: PoolMemberPicks[] }) : null;

      if (!leaderboardResponse.ok || !seriesResponse.ok) {
        const nextError = leaderboardPayload.error ?? seriesPayload.error ?? "Picks saved, but refresh failed.";
        setStatus(nextError);
        setErrorMessage(nextError);
        return;
      }

      setLeaderboard(leaderboardPayload.entries);
      setPool(seriesPayload.pool);
      rememberPool(seriesPayload.pool);
      if (allPicksPayload) {
        setAllPicks(allPicksPayload.entries);
      }
      setErrorMessage(null);
      setStatus("Picks saved.");
    } catch (error) {
      const nextError = error instanceof Error ? error.message : "Unexpected error while saving picks.";
      console.error("[submit-picks] request failed", error);
      setStatus(nextError);
      setErrorMessage(nextError);
    } finally {
      setSaving(false);
    }
  }

  if (!pool) {
    return (
      <main className="px-6 py-10 md:px-10">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-card">
          <p className="text-sm text-stone-600">{status}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[36px] border border-white/60 bg-slatewarm-950 px-8 py-8 text-white shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-100">Pool overview</p>
              <h1 className="mt-2 text-4xl font-semibold">{pool.name}</h1>
              <p className="mt-3 text-stone-300">
                Invite code <span className="font-semibold text-white">{pool.code}</span> • {pool.members.length} members
              </p>
            </div>
            <div className="grid gap-3 text-sm text-stone-200 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-court-100">Signed in as</div>
                <div className="mt-1 text-lg font-semibold text-white">{user?.displayName ?? "Guest"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-court-100">Series</div>
                <div className="mt-1 text-lg font-semibold text-white">{pool.series.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-court-100">Status</div>
                <div className="mt-1 text-lg font-semibold text-white">{status || "Ready"}</div>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-4 text-red-900 shadow-card">
            <p className="text-sm font-semibold">Submit error</p>
            <p className="mt-1 text-sm">{errorMessage}</p>
          </section>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {pool.series.map((series: Series) => (
                <SeriesCard
                  key={series.id}
                  series={series}
                  pick={picks[series.id]}
                  onChange={handlePickChange}
                />
              ))}
            </div>
            <SubmitBar
              totalSeries={totalSeries}
              completedSeries={completedSeries}
              editableSeries={editableSeries}
              saving={saving}
              canSubmit={completedSeries > 0}
              onSubmit={handleSubmit}
            />
          </section>

          <aside className="space-y-6">
            <Leaderboard entries={leaderboard} />
            <PicksBoard entries={allPicks} leaderboard={leaderboard} series={pool.series} />
            <ActivityFeed poolId={pool.id} initialItems={pool.activities} />
          </aside>
        </div>
      </div>
    </main>
  );
}
