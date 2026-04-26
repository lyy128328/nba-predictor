"use client";

import { LeaderboardEntry, Pick, PoolMemberPicks, Series } from "@/lib/types";

type Props = {
  entries: PoolMemberPicks[];
  leaderboard: LeaderboardEntry[];
  series: Series[];
};

function formatPick(series: Series, pick?: Pick) {
  if (!pick) {
    return "No pick yet";
  }

  return `${pick.winnerShortName} in ${pick.games}`;
}

export function PicksBoard({ entries, leaderboard, series }: Props) {
  const scoreByUser = new Map(leaderboard.map((entry) => [entry.userId, entry.score]));

  return (
    <section className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-card backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Picks board</p>
      <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Everyone's picks</h2>
      <p className="mt-2 text-sm text-stone-500">All pool members can see every submitted pick, even before results post.</p>

      <div className="mt-5 space-y-4">
        {entries.map((entry) => {
          const pickBySeries = new Map(entry.picks.map((pick) => [pick.seriesId, pick]));

          return (
            <details key={entry.userId} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slatewarm-950">{entry.displayName}</h3>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                    {scoreByUser.get(entry.userId) ?? 0} pts • {entry.picks.length} picks
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Expand
                  </span>
                </div>
              </summary>

              <div className="mt-4 grid gap-3">
                {series.map((seriesEntry) => (
                  <div
                    key={`${entry.userId}-${seriesEntry.id}`}
                    className="grid gap-2 rounded-2xl border border-white bg-white px-4 py-3 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slatewarm-950">
                        {seriesEntry.awayTeam.shortName} at {seriesEntry.homeTeam.shortName}
                      </div>
                      <div className="text-xs uppercase tracking-[0.14em] text-stone-500">{seriesEntry.round}</div>
                    </div>
                    <div className="text-sm font-semibold text-court-950">
                      {formatPick(seriesEntry, pickBySeries.get(seriesEntry.id))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        })}

        {entries.length === 0 ? <p className="text-sm text-stone-500">No member picks yet.</p> : null}
      </div>
    </section>
  );
}
