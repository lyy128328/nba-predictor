"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  clearBrowserSession,
  getRememberedPools,
  getStoredUserSession,
  RememberedPool,
  rememberPool,
  setStoredUserSession
} from "@/lib/browser-session";
import { AdminPoolSummary, PlayoffTemplateSummary } from "@/lib/types";

type CreateJoinResponse = {
  pool: {
    id: string;
    name: string;
    code: string;
  };
  user: {
    id: string;
    displayName: string;
  };
};

type CreateOptionsResponse = {
  pools: AdminPoolSummary[];
  templates: PlayoffTemplateSummary[];
};

export default function LandingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [poolName, setPoolName] = useState("");
  const [poolCode, setPoolCode] = useState("");
  const [createMode, setCreateMode] = useState<"starter" | "template" | "pool">("starter");
  const [templateId, setTemplateId] = useState("");
  const [sourcePoolId, setSourcePoolId] = useState("");
  const [createOptions, setCreateOptions] = useState<CreateOptionsResponse>({ pools: [], templates: [] });
  const [rememberedPools, setRememberedPools] = useState<RememberedPool[]>([]);
  const [loadingAction, setLoadingAction] = useState<"create" | "join" | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUserSession();
    if (storedUser) {
      setDisplayName(storedUser.displayName);
    }

    setRememberedPools(getRememberedPools());
  }, []);

  useEffect(() => {
    async function loadCreateOptions() {
      try {
        const response = await fetch("/api/pool/create");
        const payload = (await response.json()) as CreateOptionsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load create options.");
        }

        setCreateOptions({
          pools: payload.pools ?? [],
          templates: payload.templates ?? []
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load create options.");
      } finally {
        setLoadingOptions(false);
      }
    }

    void loadCreateOptions();
  }, []);

  const starterLabel = useMemo(() => {
    if (loadingOptions) {
      return "Starter bracket";
    }

    return "Starter bracket";
  }, [loadingOptions]);

  function handleClearBrowserSession() {
    clearBrowserSession();
    setDisplayName("");
    setRememberedPools([]);
    setMessage(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction("create");
    setMessage(null);

    try {
      const response = await fetch("/api/pool/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          name: poolName,
          templateId: createMode === "template" ? templateId : undefined,
          sourcePoolId: createMode === "pool" ? sourcePoolId : undefined
        })
      });
      const payload = (await response.json()) as CreateJoinResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create pool.");
      }

      setStoredUserSession(payload.user);
      rememberPool(payload.pool);
      setRememberedPools(getRememberedPools());
      router.push(`/pool/${payload.pool.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create pool.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction("join");
    setMessage(null);

    try {
      const response = await fetch("/api/pool/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, poolCode })
      });
      const payload = (await response.json()) as CreateJoinResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to join pool.");
      }

      setStoredUserSession(payload.user);
      rememberPool(payload.pool);
      setRememberedPools(getRememberedPools());
      router.push(`/pool/${payload.pool.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to join pool.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <main className="relative overflow-hidden px-6 py-10 md:px-10">
      <div className="absolute inset-0 -z-10 bg-court-grid bg-[size:48px_48px] opacity-30" />
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[40px] border border-white/60 bg-slatewarm-950 px-8 py-10 text-white shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-court-100">NBA Predictor</p>
          <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-tight md:text-6xl">
            Run a simple playoff pool without spreadsheet chaos.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-stone-300">
            Create a private pool, collect series picks, and keep a live leaderboard with winner-plus-series-score scoring.
          </p>
          <div className="mt-10 grid gap-4 text-sm text-stone-300 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-semibold text-white">4 rounds</div>
              <div className="mt-1">Series-based predictions</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-semibold text-white">2 pts</div>
              <div className="mt-1">Exact call, 1 pt for winner only</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-semibold text-white">Live</div>
              <div className="mt-1">Mock API-driven leaderboard</div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {rememberedPools.length > 0 ? (
            <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">My pools</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Continue where you left off</h2>
                </div>
                <button
                  type="button"
                  onClick={handleClearBrowserSession}
                  className="rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Switch user / Clear this browser session
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {rememberedPools.map((pool) => (
                  <button
                    key={pool.poolId}
                    type="button"
                    onClick={() => router.push(`/pool/${pool.poolId}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-left transition hover:border-court-300 hover:bg-white"
                  >
                    <div>
                      <div className="font-semibold text-slatewarm-950">{pool.poolName}</div>
                      <div className="mt-1 text-sm text-stone-500">Code {pool.poolCode}</div>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.14em] text-stone-500">
                      Last opened
                      <div className="mt-1 text-sm font-semibold normal-case text-slatewarm-950">
                        {new Date(pool.lastVisitedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <form onSubmit={handleJoin} className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Join pool</p>
            <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Use an invite code</h2>
            <div className="mt-5 space-y-4">
              <input
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your display name"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0 transition focus:border-court-500"
              />
              <input
                required
                value={poolCode}
                onChange={(event) => setPoolCode(event.target.value.toUpperCase())}
                placeholder="Invite code"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 uppercase outline-none ring-0 transition focus:border-court-500"
              />
            </div>
            <button
              type="submit"
              disabled={loadingAction === "join"}
              className="mt-5 w-full rounded-2xl border border-slatewarm-950 px-5 py-3 text-sm font-semibold text-slatewarm-950 transition hover:bg-slatewarm-950 hover:text-white disabled:opacity-70"
            >
              {loadingAction === "join" ? "Joining..." : "Join pool"}
            </button>
            <p className="mt-4 text-sm text-stone-500">Use the invite code from a real pool to join.</p>
          </form>

          <form onSubmit={handleCreate} className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Create pool</p>
            <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Start a new bracket group</h2>
            <div className="mt-5 space-y-4">
              <input
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your display name"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0 transition focus:border-court-500"
              />
              <input
                required
                value={poolName}
                onChange={(event) => setPoolName(event.target.value)}
                placeholder="Pool name"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0 transition focus:border-court-500"
              />
              <select
                value={createMode}
                onChange={(event) => setCreateMode(event.target.value as "starter" | "template" | "pool")}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0 transition focus:border-court-500"
              >
                <option value="starter">{starterLabel}</option>
                <option value="template">From template</option>
                <option value="pool">Copy an existing pool's matchups</option>
              </select>
              {createMode === "template" ? (
                <select
                  required
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0 transition focus:border-court-500"
                >
                  <option value="">Select a template</option>
                  {createOptions.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} • {template.seriesCount} series
                    </option>
                  ))}
                </select>
              ) : null}
              {createMode === "pool" ? (
                <select
                  required
                  value={sourcePoolId}
                  onChange={(event) => setSourcePoolId(event.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0 transition focus:border-court-500"
                >
                  <option value="">Select a source pool</option>
                  {createOptions.pools.map((pool) => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name} ({pool.code}) • {pool.memberCount} members
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={
                loadingAction === "create" ||
                (createMode === "template" && !templateId) ||
                (createMode === "pool" && !sourcePoolId)
              }
              className="mt-5 w-full rounded-2xl bg-court-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-court-700 disabled:opacity-70"
            >
              {loadingAction === "create" ? "Creating..." : "Create pool"}
            </button>
            <p className="mt-4 text-sm text-stone-500">
              {createMode === "starter"
                ? "Start with the default demo playoff bracket."
                : createMode === "template"
                  ? "Templates are reusable playoff setups saved from admin."
                  : "This copies series into the new pool, but picks and members stay separate."}
            </p>
          </form>

          {message ? <p className="text-sm font-medium text-red-700">{message}</p> : null}
        </section>
      </div>
    </main>
  );
}
