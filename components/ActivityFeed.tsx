import { ActivityItem } from "@/lib/types";
import clsx from "clsx";

type Props = {
  items: ActivityItem[];
};

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

export function ActivityFeed({ items }: Props) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-card backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Activity</p>
      <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Recent pool updates</h2>
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
              {new Date(item.createdAt).toLocaleString()}
            </p>
          </div>
        )})}
      </div>
    </section>
  );
}
