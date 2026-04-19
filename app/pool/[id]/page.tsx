"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Leaderboard } from "@/components/Leaderboard";
import { SeriesCard } from "@/components/SeriesCard";
import { SubmitBar } from "@/components/SubmitBar";
import { Pick, Pool, Series, UserSession } from "@/lib/types";

const SESSION_KEY = "nba-predictor-user";

type SeriesResponse = {
  pool: Pool;
};

export default function PoolPage() {
  const params = useParams<{ id: string }>();
  const poolId = params.id;
  const [pool, setPool] = useState<Pool | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; displayName: string; score: number; exactCalls: number; correctWinners: number }>>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [user, setUser] = useState<UserSession | null>(null);
  const [status, setStatus] = useState("Loading pool...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw) {
      setUser(JSON.parse(raw) as UserSession);
    }
  }, []);

  useEffect(() => {
    async function loadPool() {
      setStatus("Loading pool...");

      const [seriesResponse, leaderboardResponse] = await Promise.all([
        fetch(`/api/series?poolId=${poolId}`),
        fetch(`/api/leaderboard?poolId=${poolId}`)
      ]);

      if (!seriesResponse.ok) {
        setStatus("Pool not found.");
        return;
      }

      const seriesPayload = (await seriesResponse.json()) as SeriesResponse;
      const leaderboardPayload = (await leaderboardResponse.json()) as { entries: typeof leaderboard };

      setPool(seriesPayload.pool);
      setLeaderboard(leaderboardPayload.entries);
      setStatus("");
    }

    void loadPool();
  }, [poolId]);

  useEffect(() => {
    async function loadPicks() {
      if (!user) {
        return;
      }

      const response = await fetch(`/api/picks?poolId=${poolId}&userId=${user.id}`);
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { picks: Pick[] };
      setPicks(Object.fromEntries(payload.picks.map((pick) => [pick.seriesId, pick])));
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
      return;
    }

    setSaving(true);
    setStatus("");

    const response = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poolId,
        userId: user.id,
        picks: Object.values(picks)
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(payload.error ?? "Unable to save picks.");
      setSaving(false);
      return;
    }

    const leaderboardResponse = await fetch(`/api/leaderboard?poolId=${poolId}`);
    const leaderboardPayload = (await leaderboardResponse.json()) as { entries: typeof leaderboard };
    const seriesResponse = await fetch(`/api/series?poolId=${poolId}`);
    const seriesPayload = (await seriesResponse.json()) as SeriesResponse;

    setLeaderboard(leaderboardPayload.entries);
    setPool(seriesPayload.pool);
    setStatus("Picks saved.");
    setSaving(false);
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
              onSubmit={handleSubmit}
            />
          </section>

          <aside className="space-y-6">
            <Leaderboard entries={leaderboard} />
            <ActivityFeed items={pool.activities} />
          </aside>
        </div>
      </div>
    </main>
  );
}
