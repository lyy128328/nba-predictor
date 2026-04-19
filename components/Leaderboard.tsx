import { LeaderboardEntry } from "@/lib/types";

type Props = {
  entries: LeaderboardEntry[];
};

export function Leaderboard({ entries }: Props) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-card backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-700">Leaderboard</p>
          <h2 className="mt-2 text-2xl font-semibold text-slatewarm-950">Pool standings</h2>
        </div>
        <p className="text-sm text-stone-500">2 pts exact call, 1 pt winner</p>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.userId}
            className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
          >
            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Rank</div>
              <div className="text-2xl font-semibold text-slatewarm-950">#{index + 1}</div>
            </div>
            <div>
              <div className="text-base font-semibold text-slatewarm-950">{entry.displayName}</div>
              <div className="text-sm text-stone-500">
                {entry.correctWinners} winners, {entry.exactCalls} exact calls
              </div>
            </div>
            <div className="rounded-2xl bg-court-500 px-4 py-3 text-right text-white">
              <div className="text-xs uppercase tracking-[0.18em]">Score</div>
              <div className="text-2xl font-semibold">{entry.score}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
