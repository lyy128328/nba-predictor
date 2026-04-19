"use client";

import { FormEvent, useMemo, useState } from "react";
import { AdminPoolSummary, Series } from "@/lib/types";

type PoolResponse = {
  pool: {
    id: string;
    name: string;
    code: string;
    series: Series[];
  };
};

type DraftResult = Record<string, { winnerShortName: string; games: number }>;
type DraftSeries = Record<
  string,
  {
    round: string;
    lockAt: string;
    homeTeam: { name: string; shortName: string; seed: number; conference: "East" | "West" };
    awayTeam: { name: string; shortName: string; seed: number; conference: "East" | "West" };
  }
>;

type SeriesForm = {
  round: string;
  lockAt: string;
  homeTeam: { name: string; shortName: string; seed: number; conference: "East" | "West" };
  awayTeam: { name: string; shortName: string; seed: number; conference: "East" | "West" };
};

const emptySeriesForm: SeriesForm = {
  round: "Round 1",
  lockAt: "",
  homeTeam: { name: "", shortName: "", seed: 1, conference: "East" },
  awayTeam: { name: "", shortName: "", seed: 8, conference: "East" }
};

export default function AdminPage() {
  const [poolId, setPoolId] = useState("");
  const [secret, setSecret] = useState("");
  const [pools, setPools] = useState<AdminPoolSummary[]>([]);
  const [poolName, setPoolName] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [drafts, setDrafts] = useState<DraftResult>({});
  const [seriesDrafts, setSeriesDrafts] = useState<DraftSeries>({});
  const [newSeries, setNewSeries] = useState<SeriesForm>(emptySeriesForm);
  const [status, setStatus] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingSeriesId, setSavingSeriesId] = useState<string | null>(null);
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [loadingPools, setLoadingPools] = useState(false);

  const readySeries = useMemo(
    () =>
      series.map((entry) => ({
        ...entry,
        details: seriesDrafts[entry.id] ?? {
          round: entry.round,
          lockAt: entry.lockAt.slice(0, 16),
          homeTeam: {
            name: entry.homeTeam.name,
            shortName: entry.homeTeam.shortName,
            seed: entry.homeTeam.seed,
            conference: entry.homeTeam.conference
          },
          awayTeam: {
            name: entry.awayTeam.name,
            shortName: entry.awayTeam.shortName,
            seed: entry.awayTeam.seed,
            conference: entry.awayTeam.conference
          }
        },
        draft: drafts[entry.id] ?? {
          winnerShortName: entry.result?.winnerShortName ?? entry.homeTeam.shortName,
          games: entry.result?.games ?? 6
        }
      })),
    [drafts, series, seriesDrafts]
  );

  async function refreshPool(nextPoolId = poolId) {
    const refreshResponse = await fetch(`/api/series?poolId=${nextPoolId}`);
    const refreshPayload = (await refreshResponse.json()) as PoolResponse & { error?: string };
    if (!refreshResponse.ok) {
      throw new Error(refreshPayload.error ?? "Unable to refresh pool.");
    }
    setPoolName(refreshPayload.pool.name);
    setSeries(refreshPayload.pool.series);
  }

  async function loadAdminPools(currentSecret = secret) {
    if (!currentSecret) {
      return;
    }

    setLoadingPools(true);
    const response = await fetch("/api/admin/pools", {
      headers: {
        "x-admin-secret": currentSecret
      }
    });

    const payload = (await response.json()) as { pools?: AdminPoolSummary[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load pools.");
    }

    setPools(payload.pools ?? []);
    setLoadingPools(false);
  }

  async function handleLoad(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Loading pool...");

    const response = await fetch(`/api/series?poolId=${poolId}`);
    const payload = (await response.json()) as PoolResponse & { error?: string };

    if (!response.ok) {
      setStatus(payload.error ?? "Unable to load pool.");
      return;
    }

    setPoolName(payload.pool.name);
    setSeries(payload.pool.series);
    setDrafts({});
    setSeriesDrafts({});
    await loadAdminPools(secret);
    setStatus("Pool loaded.");
  }

  async function handleCreateSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingSeries(true);
    setStatus("");

    const response = await fetch("/api/admin/series", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({
        poolId,
        ...newSeries
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to create series.");
      setCreatingSeries(false);
      return;
    }

    await refreshPool();
    await loadAdminPools(secret);
    setNewSeries(emptySeriesForm);
    setStatus("Series created.");
    setCreatingSeries(false);
  }

  async function handleSave(seriesId: string, draft: { winnerShortName: string; games: number }) {
    setSavingId(seriesId);
    setStatus("");

    const response = await fetch("/api/admin/result", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({
        poolId,
        seriesId,
        winnerShortName: draft.winnerShortName,
        games: draft.games
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to update result.");
      setSavingId(null);
      return;
    }

    await refreshPool();
    await loadAdminPools(secret);
    setStatus("Result saved.");
    setSavingId(null);
  }

  async function handleSaveSeriesDetails(seriesId: string, draft: SeriesForm) {
    setSavingSeriesId(seriesId);
    setStatus("");

    const response = await fetch("/api/admin/series", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({
        poolId,
        seriesId,
        ...draft
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to update matchup.");
      setSavingSeriesId(null);
      return;
    }

    await refreshPool();
    await loadAdminPools(secret);
    setStatus("Matchup updated.");
    setSavingSeriesId(null);
  }

  async function handleLoadPools() {
    setStatus("Loading pools...");

    try {
      await loadAdminPools(secret);
      setStatus("Pools loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load pools.");
    }
  }

  async function handleSelectPool(nextPoolId: string) {
    setPoolId(nextPoolId);
    setStatus("Loading pool...");

    const response = await fetch(`/api/series?poolId=${nextPoolId}`);
    const payload = (await response.json()) as PoolResponse & { error?: string };

    if (!response.ok) {
      setStatus(payload.error ?? "Unable to load pool.");
      return;
    }

    setPoolName(payload.pool.name);
    setSeries(payload.pool.series);
    setDrafts({});
    setSeriesDrafts({});
    setStatus("Pool loaded.");
  }

  function renderTeamFields(
    scope: "new-home" | "new-away" | `series-${string}-home` | `series-${string}-away`,
    team: SeriesForm["homeTeam"],
    onChange: (next: SeriesForm["homeTeam"]) => void
  ) {
    return (
      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={team.name}
            onChange={(event) => onChange({ ...team, name: event.target.value })}
            placeholder="Team name"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
          />
          <input
            value={team.shortName}
            onChange={(event) => onChange({ ...team, shortName: event.target.value.toUpperCase() })}
            placeholder="Short name"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="number"
            min={1}
            value={team.seed}
            onChange={(event) => onChange({ ...team, seed: Number(event.target.value) })}
            placeholder="Seed"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
          />
          <select
            value={team.conference}
            onChange={(event) => onChange({ ...team, conference: event.target.value as "East" | "West" })}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
          >
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold text-slatewarm-950">Manage matchups and results</h1>
          <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]" onSubmit={handleLoad}>
            <input
              value={poolId}
              onChange={(event) => setPoolId(event.target.value)}
              placeholder="Pool ID"
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
              required
            />
            <input
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Admin secret"
              type="password"
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
              required
            />
            <button
              type="submit"
              className="rounded-2xl bg-slatewarm-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Load
            </button>
            <button
              type="button"
              onClick={handleLoadPools}
              disabled={!secret || loadingPools}
              className="rounded-2xl border border-slatewarm-950 px-5 py-3 text-sm font-semibold text-slatewarm-950 disabled:opacity-70"
            >
              {loadingPools ? "Loading..." : "List pools"}
            </button>
          </form>
          <p className="mt-4 text-sm text-stone-500">{status || (poolName ? `Editing ${poolName}` : "Enter a pool ID to manage results.")}</p>
        </section>

        <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Pools</p>
          <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">All pools and live scores</h2>
          <div className="mt-6 grid gap-4">
            {pools.length === 0 ? (
              <p className="text-sm text-stone-500">Load pools to see every pool, member, and score.</p>
            ) : (
              pools.map((pool) => (
                <article
                  key={pool.id}
                  className="rounded-[28px] border border-stone-200 bg-stone-50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slatewarm-950">{pool.name}</h3>
                      <p className="mt-1 text-sm text-stone-500">
                        Code {pool.code} • {pool.memberCount} members
                      </p>
                      <p className="mt-2 break-all text-xs text-stone-400">{pool.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectPool(pool.id)}
                      className="rounded-2xl bg-court-500 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Open pool
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {pool.leaderboard.length === 0 ? (
                      <p className="text-sm text-stone-500">No members scored yet.</p>
                    ) : (
                      pool.leaderboard.map((entry, index) => (
                        <div
                          key={entry.userId}
                          className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border border-white bg-white px-4 py-3"
                        >
                          <div className="text-sm font-semibold text-stone-500">#{index + 1}</div>
                          <div>
                            <div className="font-semibold text-slatewarm-950">{entry.displayName}</div>
                            <div className="text-sm text-stone-500">
                              {entry.correctWinners} winners • {entry.exactCalls} exact calls
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slatewarm-950 px-4 py-2 text-sm font-semibold text-white">
                            {entry.score} pts
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Create matchup</p>
          <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Add a new series manually</h2>
          <form className="mt-6 space-y-4" onSubmit={handleCreateSeries}>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={newSeries.round}
                onChange={(event) => setNewSeries((current) => ({ ...current, round: event.target.value }))}
                placeholder="Round"
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                required
              />
              <input
                type="datetime-local"
                value={newSeries.lockAt}
                onChange={(event) => setNewSeries((current) => ({ ...current, lockAt: event.target.value }))}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                required
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {renderTeamFields("new-away", newSeries.awayTeam, (awayTeam) =>
                setNewSeries((current) => ({ ...current, awayTeam }))
              )}
              {renderTeamFields("new-home", newSeries.homeTeam, (homeTeam) =>
                setNewSeries((current) => ({ ...current, homeTeam }))
              )}
            </div>
            <button
              type="submit"
              disabled={!poolId || !secret || creatingSeries}
              className="rounded-2xl bg-court-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
            >
              {creatingSeries ? "Creating..." : "Add series"}
            </button>
          </form>
        </section>

        <section className="grid gap-4">
          {readySeries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-card backdrop-blur"
            >
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-court-700">Series setup</p>
                  <h2 className="mt-2 text-xl font-semibold text-slatewarm-950">
                    {entry.awayTeam.shortName} at {entry.homeTeam.shortName}
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={entry.details.round}
                    onChange={(event) =>
                      setSeriesDrafts((current) => ({
                        ...current,
                        [entry.id]: { ...entry.details, round: event.target.value }
                      }))
                    }
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                  />
                  <input
                    type="datetime-local"
                    value={entry.details.lockAt}
                    onChange={(event) =>
                      setSeriesDrafts((current) => ({
                        ...current,
                        [entry.id]: { ...entry.details, lockAt: event.target.value }
                      }))
                    }
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {renderTeamFields(`series-${entry.id}-away`, entry.details.awayTeam, (awayTeam) =>
                    setSeriesDrafts((current) => ({
                      ...current,
                      [entry.id]: { ...entry.details, awayTeam }
                    }))
                  )}
                  {renderTeamFields(`series-${entry.id}-home`, entry.details.homeTeam, (homeTeam) =>
                    setSeriesDrafts((current) => ({
                      ...current,
                      [entry.id]: { ...entry.details, homeTeam }
                    }))
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveSeriesDetails(entry.id, entry.details)}
                    disabled={savingSeriesId === entry.id || !secret}
                    className="rounded-2xl border border-slatewarm-950 px-5 py-3 text-sm font-semibold text-slatewarm-950 disabled:opacity-70"
                  >
                    {savingSeriesId === entry.id ? "Saving..." : "Save matchup"}
                  </button>
                </div>

                <div className="border-t border-stone-200 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-court-700">Result</p>
                  <p className="mt-2 text-sm text-stone-500">
                    Current: {entry.result ? `${entry.result.winnerShortName} in ${entry.result.games}` : "No result posted"}
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
                    <select
                      value={entry.draft.winnerShortName}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [entry.id]: {
                            ...entry.draft,
                            winnerShortName: event.target.value
                          }
                        }))
                      }
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                    >
                      <option value={entry.details.homeTeam.shortName}>{entry.details.homeTeam.shortName}</option>
                      <option value={entry.details.awayTeam.shortName}>{entry.details.awayTeam.shortName}</option>
                    </select>
                    <select
                      value={entry.draft.games}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [entry.id]: {
                            ...entry.draft,
                            games: Number(event.target.value)
                          }
                        }))
                      }
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                    >
                      {[4, 5, 6, 7].map((games) => (
                        <option key={games} value={games}>
                          {games} games
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleSave(entry.id, entry.draft)}
                      disabled={savingId === entry.id || !secret}
                      className="rounded-2xl bg-court-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {savingId === entry.id ? "Saving..." : "Save result"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
