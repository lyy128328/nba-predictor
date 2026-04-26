"use client";

import { useEffect, useState } from "react";
import { ActivityItem, ActivityPage } from "@/lib/types";
import { formatPacificDateTime } from "@/lib/time";
import clsx from "clsx";

type Props = {
  poolId: string;
  initialItems: ActivityItem[];
  initialTotal?: number;
};

const PAGE_SIZE = 12;

function getActivityStyle(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("+2")) {
    return {
      badge: "Exact +2",
      accent: "border-emerald-400",
      badgeStyle: "bg-emerald-100 text-emerald-800"
    };
  }

  if (lower.includes("+1")) {
    return {
      badge: "Point",
      accent: "border-sky-400",
      badgeStyle: "bg-sky-100 text-sky-800"
    };
  }

  if (lower.includes("leader")) {
    return {
      badge: "Leader",
      accent: "border-amber-400",
      badgeStyle: "bg-amber-100 text-amber-900"
    };
  }

  if (lower.includes("missed") || lower.includes("cooked") || lower.includes("aged badly") || lower.includes("🤡")) {
    return {
      badge: "Trash Talk",
      accent: "border-rose-400",
      badgeStyle: "bg-rose-100 text-rose-800"
    };
  }

  if (lower.includes("result posted") || lower.includes("results are in") || lower.includes("time to score")) {
    return {
      badge: "Result",
      accent: "border-violet-400",
      badgeStyle: "bg-violet-100 text-violet-800"
    };
  }

  return {
    badge: "Update",
    accent: "border-court-300",
    badgeStyle: "bg-court-100 text-court-950"
  };
}

export function ActivityFeed({ poolId, initialItems, initialTotal }: Props) {
  const [items, setItems] = useState<ActivityItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal ?? initialItems.length);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
    setTotal(initialTotal ?? initialItems.length);
    setOffset(0);
    setError(null);
  }, [initialItems, initialTotal, poolId]);

  useEffect(() => {
    void loadPage(0);
  }, [poolId]);

  async function loadPage(nextOffset: number) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/activity?poolId=${poolId}&offset=${nextOffset}&limit=${PAGE_SIZE}`);
      const payload = (await response.json()) as ActivityPage & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load activity.");
      }

      setItems(payload.items);
      setTotal(payload.total);
      setOffset(payload.offset);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load activity.");
    } finally {
      setLoading(false);
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-card backdrop-blur">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Activity</p>
          <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Pool history</h2>
        </div>
        <div className="text-right text-xs uppercase tracking-[0.14em] text-stone-500">
          {total} total
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {items.map((item) => {
          const style = getActivityStyle(item.message);
          return (
            <div key={item.id} className={clsx("border-l-2 pl-4", style.accent)}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slatewarm-950">{item.message}</p>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    style.badgeStyle
                  )}
                >
                  {style.badge}
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                {formatPacificDateTime(item.createdAt)}
              </p>
            </div>
          );
        })}

        {items.length === 0 ? <p className="text-sm text-stone-500">No activity yet.</p> : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-500">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => loadPage(Math.max(0, offset - PAGE_SIZE))}
            disabled={loading || offset === 0}
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slatewarm-950 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => loadPage(offset + PAGE_SIZE)}
            disabled={loading || offset + PAGE_SIZE >= total}
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slatewarm-950 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Next"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
    </section>
  );
}
