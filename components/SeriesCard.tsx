"use client";

import clsx from "clsx";
import { Pick, Series } from "@/lib/types";

type Props = {
  series: Series;
  pick?: Pick;
  onChange: (nextPick: Pick) => void;
};

const gameOptions = [4, 5, 6, 7];

export function SeriesCard({ series, pick, onChange }: Props) {
  const teams = [series.homeTeam, series.awayTeam];
  const locked = series.status !== "open" || new Date(series.lockAt).getTime() <= Date.now();

  return (
    <article className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-card backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">{series.round}</p>
          <h3 className="mt-2 text-xl font-semibold text-slatewarm-950">
            {series.awayTeam.shortName} at {series.homeTeam.shortName}
          </h3>
        </div>
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
            series.status === "final"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          )}
        >
          {series.status}
        </span>
      </div>

      <div className="space-y-3">
        {teams.map((team) => {
          const selected = pick?.winnerShortName === team.shortName;
          return (
            <button
              key={team.shortName}
              type="button"
              disabled={locked}
              onClick={() =>
                onChange({
                  seriesId: series.id,
                  winnerShortName: team.shortName,
                  games: pick?.games ?? 6
                })
              }
              className={clsx(
                "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                selected
                  ? "border-court-500 bg-court-50 text-court-950"
                  : "border-stone-200 bg-stone-50 text-stone-700 hover:border-court-300 hover:bg-white",
                locked && "cursor-not-allowed opacity-60 hover:border-stone-200 hover:bg-stone-50"
              )}
            >
              <span className="text-sm font-medium">
                #{team.seed} {team.name}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">{team.shortName}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Games</p>
        <div className="grid grid-cols-4 gap-2">
          {gameOptions.map((games) => (
            <button
              key={games}
              type="button"
              disabled={locked}
              onClick={() =>
                onChange({
                  seriesId: series.id,
                  winnerShortName: pick?.winnerShortName ?? series.homeTeam.shortName,
                  games
                })
              }
              className={clsx(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                pick?.games === games
                  ? "border-court-500 bg-court-500 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-court-300",
                locked && "cursor-not-allowed opacity-60 hover:border-stone-200"
              )}
            >
              {games}
            </button>
          ))}
        </div>
      </div>

      {series.result ? (
        <div className="mt-5 rounded-2xl bg-stone-900 px-4 py-3 text-sm text-stone-100">
          Final: {series.result.winnerShortName} in {series.result.games}
        </div>
      ) : locked ? (
        <div className="mt-5 rounded-2xl bg-stone-200 px-4 py-3 text-sm font-medium text-stone-700">
          Locked. Picks can no longer be edited for this series.
        </div>
      ) : (
        <p className="mt-5 text-sm text-stone-500">Locks at {new Date(series.lockAt).toLocaleString()}</p>
      )}
    </article>
  );
}
