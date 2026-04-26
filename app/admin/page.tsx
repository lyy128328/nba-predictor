"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { formatPacificDateTime } from "@/lib/time";
import { AdminPoolMember, AdminPoolSummary, PlayoffTemplateSummary, Series } from "@/lib/types";

type PoolResponse = {
  pool: {
    id: string;
    name: string;
    code: string;
    members: { id: string; displayName: string }[];
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
  const [poolQuery, setPoolQuery] = useState("");
  const [pools, setPools] = useState<AdminPoolSummary[]>([]);
  const [poolName, setPoolName] = useState<string | null>(null);
  const [poolCode, setPoolCode] = useState<string | null>(null);
  const [sourcePoolId, setSourcePoolId] = useState("");
  const [templates, setTemplates] = useState<PlayoffTemplateSummary[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({});
  const [series, setSeries] = useState<Series[]>([]);
  const [members, setMembers] = useState<AdminPoolMember[]>([]);
  const [drafts, setDrafts] = useState<DraftResult>({});
  const [seriesDrafts, setSeriesDrafts] = useState<DraftSeries>({});
  const [newSeries, setNewSeries] = useState<SeriesForm>(emptySeriesForm);
  const [status, setStatus] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [clearingResultId, setClearingResultId] = useState<string | null>(null);
  const [savingSeriesId, setSavingSeriesId] = useState<string | null>(null);
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [loadingPools, setLoadingPools] = useState(false);
  const [deletingSeriesId, setDeletingSeriesId] = useState<string | null>(null);
  const [deletingPoolId, setDeletingPoolId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [clearingSeries, setClearingSeries] = useState(false);
  const [copyingSeries, setCopyingSeries] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [renamingTemplateId, setRenamingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);

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

  const filteredPools = useMemo(() => {
    const query = poolQuery.trim().toLowerCase();
    if (!query) {
      return pools;
    }

    return pools.filter((pool) =>
      [pool.name, pool.code, pool.id, pool.leaderDisplayName ?? ""].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [poolQuery, pools]);

  const sourcePoolOptions = useMemo(() => pools.filter((entry) => entry.id !== poolId), [pools, poolId]);

  async function loadTemplates(currentSecret = secret) {
    if (!currentSecret) {
      return;
    }

    const response = await fetch("/api/admin/templates", {
      headers: {
        "x-admin-secret": currentSecret
      }
    });

    const payload = (await response.json()) as { templates?: PlayoffTemplateSummary[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load templates.");
    }

    setTemplates(payload.templates ?? []);
    setTemplateDrafts(
      Object.fromEntries((payload.templates ?? []).map((template) => [template.id, template.name]))
    );
  }

  async function refreshPool(nextPoolId = poolId) {
    const refreshResponse = await fetch(`/api/series?poolId=${nextPoolId}`);
    const refreshPayload = (await refreshResponse.json()) as PoolResponse & { error?: string };
    if (!refreshResponse.ok) {
      throw new Error(refreshPayload.error ?? "Unable to refresh pool.");
    }
    setPoolName(refreshPayload.pool.name);
    setPoolCode(refreshPayload.pool.code);
    setSeries(refreshPayload.pool.series);
    await loadPoolMembers(nextPoolId);
  }

  async function loadPoolMembers(nextPoolId = poolId, currentSecret = secret) {
    if (!nextPoolId || !currentSecret) {
      setMembers([]);
      return;
    }

    const response = await fetch(`/api/admin/members?poolId=${nextPoolId}`, {
      headers: {
        "x-admin-secret": currentSecret
      }
    });

    const payload = (await response.json()) as { members?: AdminPoolMember[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load members.");
    }

    setMembers(payload.members ?? []);
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
    setPoolCode(payload.pool.code);
    setSeries(payload.pool.series);
    setDrafts({});
    setSeriesDrafts({});
    await loadPoolMembers(poolId, secret);
    await loadAdminPools(secret);
    await loadTemplates(secret);
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

  async function handleClearResult(seriesId: string) {
    const target = series.find((entry) => entry.id === seriesId);
    const label = target ? `${target.awayTeam.shortName} at ${target.homeTeam.shortName}` : "this series";

    if (!confirm(`Clear the saved result for ${label}?`)) {
      return;
    }

    setClearingResultId(seriesId);
    setStatus("");

    const response = await fetch("/api/admin/result", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({
        poolId,
        seriesId
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to clear result.");
      setClearingResultId(null);
      return;
    }

    await refreshPool();
    await loadAdminPools(secret);
    setStatus("Result cleared.");
    setClearingResultId(null);
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
      await loadTemplates(secret);
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
    setPoolCode(payload.pool.code);
    setSeries(payload.pool.series);
    setDrafts({});
    setSeriesDrafts({});
    await loadPoolMembers(nextPoolId, secret);
    setStatus("Pool loaded.");
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDeleteSeries(seriesId: string) {
    const target = series.find((entry) => entry.id === seriesId);
    const label = target
      ? `${target.awayTeam.shortName} at ${target.homeTeam.shortName}`
      : "this series";

    if (!confirm(`Delete ${label} and all associated picks? This cannot be undone.`)) {
      return;
    }

    setDeletingSeriesId(seriesId);
    setStatus("");

    const response = await fetch("/api/admin/series", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({ poolId, seriesId })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to delete series.");
      setDeletingSeriesId(null);
      return;
    }

    await refreshPool();
    await loadAdminPools(secret);
    setStatus("Series deleted.");
    setDeletingSeriesId(null);
  }

  async function handleDeletePool(targetPoolId: string) {
    const target = pools.find((pool) => pool.id === targetPoolId);
    const label = target ? `${target.name} (${target.code})` : "this pool";

    if (!confirm(`Delete ${label} and everything inside it? This cannot be undone.`)) {
      return;
    }

    setDeletingPoolId(targetPoolId);
    setStatus("");

    const response = await fetch("/api/admin/pool", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({ poolId: targetPoolId })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to delete pool.");
      setDeletingPoolId(null);
      return;
    }

    if (poolId === targetPoolId) {
      setPoolId("");
      setPoolName(null);
      setPoolCode(null);
      setTemplateName("");
      setSeries([]);
      setMembers([]);
      setDrafts({});
      setSeriesDrafts({});
    }

    await loadAdminPools(secret);
    await loadTemplates(secret);
    setStatus("Pool deleted.");
    setDeletingPoolId(null);
  }

  async function handleDeleteAllSeries() {
    if (!poolId || !poolName) {
      return;
    }

    if (!confirm(`Delete every series in ${poolName}? This will also remove all picks tied to those series.`)) {
      return;
    }

    setClearingSeries(true);
    setStatus("");

    const response = await fetch("/api/admin/series", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({ poolId, deleteAll: true })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to delete all series.");
      setClearingSeries(false);
      return;
    }

    await refreshPool();
    await loadAdminPools(secret);
    setStatus("All series deleted.");
    setClearingSeries(false);
  }

  async function handleDeleteMember(userId: string) {
    const target = members.find((entry) => entry.id === userId);
    const label = target?.displayName ?? "this member";

    if (!confirm(`Remove ${label} from this pool and delete their picks in this pool?`)) {
      return;
    }

    setDeletingMemberId(userId);
    setStatus("");

    const response = await fetch("/api/admin/members", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({ poolId, userId })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to remove member.");
      setDeletingMemberId(null);
      return;
    }

    await refreshPool();
    await loadAdminPools(secret);
    setStatus("Member removed.");
    setDeletingMemberId(null);
  }

  async function handleCopySeries() {
    if (!poolId || !sourcePoolId) {
      setStatus("Pick both a target pool and a source pool.");
      return;
    }

    const sourcePool = pools.find((entry) => entry.id === sourcePoolId);
    const targetLabel = poolName ?? "this pool";
    const sourceLabel = sourcePool?.name ?? "the source pool";

    if (
      !confirm(
        `Copy all series from ${sourceLabel} into ${targetLabel}? Existing series in ${targetLabel} will be replaced.`
      )
    ) {
      return;
    }

    setCopyingSeries(true);
    setStatus("");

    const response = await fetch("/api/admin/series/copy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({
        sourcePoolId,
        targetPoolId: poolId,
        replaceExisting: true
      })
    });

    const payload = (await response.json()) as { copied?: number; error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to copy series.");
      setCopyingSeries(false);
      return;
    }

    await refreshPool();
    await loadAdminPools(secret);
    setStatus(`Copied ${payload.copied ?? 0} series into ${targetLabel}.`);
    setCopyingSeries(false);
  }

  async function handleSaveTemplate() {
    if (!poolId || !templateName.trim()) {
      setStatus("Pick a pool and enter a template name.");
      return;
    }

    setSavingTemplate(true);
    setStatus("");

    const response = await fetch("/api/admin/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({
        poolId,
        name: templateName
      })
    });

    const payload = (await response.json()) as { error?: string; template?: PlayoffTemplateSummary };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to save template.");
      setSavingTemplate(false);
      return;
    }

    await loadTemplates(secret);
    setStatus(`Saved template ${payload.template?.name ?? templateName}.`);
    setSavingTemplate(false);
    setTemplateName("");
  }

  async function handleRenameTemplate(templateId: string) {
    const name = templateDrafts[templateId]?.trim();
    if (!name) {
      setStatus("Template name is required.");
      return;
    }

    setRenamingTemplateId(templateId);
    setStatus("");

    const response = await fetch("/api/admin/templates", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({ templateId, name })
    });

    const payload = (await response.json()) as { error?: string; template?: PlayoffTemplateSummary };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to rename template.");
      setRenamingTemplateId(null);
      return;
    }

    await loadTemplates(secret);
    setStatus(`Renamed template to ${payload.template?.name ?? name}.`);
    setRenamingTemplateId(null);
  }

  async function handleDeleteTemplate(templateId: string) {
    const target = templates.find((template) => template.id === templateId);
    const label = target?.name ?? "this template";

    if (!confirm(`Delete template ${label}? Pools already created from it will stay intact.`)) {
      return;
    }

    setDeletingTemplateId(templateId);
    setStatus("");

    const response = await fetch("/api/admin/templates", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({ templateId })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to delete template.");
      setDeletingTemplateId(null);
      return;
    }

    await loadTemplates(secret);
    setStatus("Template deleted.");
    setDeletingTemplateId(null);
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
          <div className="mt-4">
            <input
              value={poolQuery}
              onChange={(event) => setPoolQuery(event.target.value)}
              placeholder="Search by pool name, code, id, or leader"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
            />
          </div>
          <div className="mt-6 grid gap-4">
            {filteredPools.length === 0 ? (
              <p className="text-sm text-stone-500">Load pools to see every pool, member, and score.</p>
            ) : (
              filteredPools.map((pool) => (
                <article
                  key={pool.id}
                  className={`rounded-[28px] border p-5 ${
                    pool.id === poolId ? "border-court-500 bg-court-50/70" : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slatewarm-950">{pool.name}</h3>
                        {pool.leaderDisplayName ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
                            Leader: {pool.leaderDisplayName}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        Code {pool.code} • {pool.memberCount} members
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        Last updated {formatPacificDateTime(pool.lastUpdatedAt)}
                      </p>
                      <p className="mt-2 break-all text-xs text-stone-400">{pool.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectPool(pool.id)}
                        className="rounded-2xl bg-court-500 px-4 py-3 text-sm font-semibold text-white"
                      >
                        Open pool
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePool(pool.id)}
                        disabled={deletingPoolId === pool.id}
                        className="rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-70"
                      >
                        {deletingPoolId === pool.id ? "Deleting..." : "Delete pool"}
                      </button>
                    </div>
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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Templates</p>
          <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Reusable playoff templates</h2>
          <div className="mt-6 grid gap-3">
            {templates.length === 0 ? (
              <p className="text-sm text-stone-500">No templates yet. Save a pool as a template to reuse it later.</p>
            ) : (
              templates.map((template) => (
                <article
                  key={template.id}
                  className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <input
                      value={templateDrafts[template.id] ?? template.name}
                      onChange={(event) =>
                        setTemplateDrafts((current) => ({
                          ...current,
                          [template.id]: event.target.value
                        }))
                      }
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 font-semibold text-slatewarm-950"
                    />
                    <p className="mt-2 text-sm text-stone-500">
                      {template.seriesCount} series • created {formatPacificDateTime(template.createdAt)}
                    </p>
                    {template.sourcePoolId ? (
                      <p className="mt-1 break-all text-xs text-stone-400">Source pool: {template.sourcePoolId}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRenameTemplate(template.id)}
                    disabled={!secret || renamingTemplateId === template.id}
                    className="rounded-2xl border border-slatewarm-950 px-4 py-3 text-sm font-semibold text-slatewarm-950 disabled:opacity-70"
                  >
                    {renamingTemplateId === template.id ? "Saving..." : "Rename"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template.id)}
                    disabled={!secret || deletingTemplateId === template.id}
                    className="rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-70"
                  >
                    {deletingTemplateId === template.id ? "Deleting..." : "Delete"}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section
          ref={editorRef}
          className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Selected pool</p>
          <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">
            {poolName ? `Editing ${poolName}` : "Pick a pool to edit"}
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            {poolName && poolCode ? `Code ${poolCode} • ${series.length} series • ${members.length} members` : "Use Open pool from the list above or load a pool by ID."}
          </p>
          {poolName ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Save this pool as a reusable template"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!secret || !templateName.trim() || savingTemplate || series.length === 0}
                  className="rounded-2xl border border-slatewarm-950 px-5 py-3 text-sm font-semibold text-slatewarm-950 disabled:opacity-70"
                >
                  {savingTemplate ? "Saving..." : "Save as template"}
                </button>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <select
                  value={sourcePoolId}
                  onChange={(event) => setSourcePoolId(event.target.value)}
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <option value="">Copy series from another pool</option>
                  {sourcePoolOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.code}) • {entry.leaderboard.length} players
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCopySeries}
                  disabled={!secret || !sourcePoolId || copyingSeries}
                  className="rounded-2xl bg-court-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {copyingSeries ? "Copying..." : "Copy series here"}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAllSeries}
                  disabled={!secret || clearingSeries || series.length === 0}
                  className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-70"
                >
                  {clearingSeries ? "Deleting..." : "Delete all series"}
                </button>
              </div>
              {templates.length > 0 ? (
                <p className="text-sm text-stone-500">
                  Templates: {templates.map((template) => `${template.name} (${template.seriesCount})`).join(" • ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Members</p>
          <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Pool members and current scores</h2>
          <div className="mt-6 grid gap-3">
            {!poolName ? (
              <p className="text-sm text-stone-500">Open a pool first to manage its members.</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-stone-500">No members in this pool.</p>
            ) : (
              members.map((member, index) => (
                <article
                  key={member.id}
                  className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 md:grid-cols-[48px_1fr_auto_auto]"
                >
                  <div className="text-sm font-semibold text-stone-500">#{index + 1}</div>
                  <div>
                    <div className="font-semibold text-slatewarm-950">{member.displayName}</div>
                    <div className="text-sm text-stone-500">
                      {member.score} pts • {member.correctWinners} winners • {member.exactCalls} exact calls
                    </div>
                    <div className="mt-1 break-all text-xs text-stone-400">{member.id}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slatewarm-950">
                    {member.score} pts
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(member.id)}
                    disabled={!secret || deletingMemberId === member.id}
                    className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-70"
                  >
                    {deletingMemberId === member.id ? "Removing..." : "Remove member"}
                  </button>
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
          {poolName && readySeries.length === 0 ? (
            <article className="rounded-[28px] border border-dashed border-stone-300 bg-white/70 p-6 text-sm text-stone-500">
              This pool has no series right now. Add real matchups above.
            </article>
          ) : null}
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
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveSeriesDetails(entry.id, entry.details)}
                      disabled={savingSeriesId === entry.id || !secret}
                      className="rounded-2xl border border-slatewarm-950 px-5 py-3 text-sm font-semibold text-slatewarm-950 disabled:opacity-70"
                    >
                      {savingSeriesId === entry.id ? "Saving..." : "Save matchup"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSeries(entry.id)}
                      disabled={deletingSeriesId === entry.id || !secret}
                      className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-70"
                    >
                      {deletingSeriesId === entry.id ? "Deleting..." : "Delete series"}
                    </button>
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-court-700">Result</p>
                  <p className="mt-2 text-sm text-stone-500">
                    Current: {entry.result ? `${entry.result.winnerShortName} in ${entry.result.games}` : "No result posted"}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    Saving again will overwrite the existing result.
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto_auto]">
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
                      {savingId === entry.id ? "Saving..." : entry.result ? "Overwrite result" : "Save result"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearResult(entry.id)}
                      disabled={clearingResultId === entry.id || !secret || !entry.result}
                      className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-70"
                    >
                      {clearingResultId === entry.id ? "Clearing..." : "Clear result"}
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
