type Props = {
  totalSeries: number;
  completedSeries: number;
  editableSeries: number;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
};

export function SubmitBar({ totalSeries, completedSeries, editableSeries, saving, canSubmit, onSubmit }: Props) {
  const complete = totalSeries === 0 ? 0 : Math.round((completedSeries / totalSeries) * 100);
  const disabled = saving || editableSeries === 0 || !canSubmit;

  return (
    <div className="sticky bottom-4 z-10 rounded-[28px] border border-slatewarm-950 bg-slatewarm-950 p-4 text-white shadow-card">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-court-100">Submission progress</p>
          <h3 className="mt-2 text-xl font-semibold">{completedSeries}/{totalSeries} series picked</h3>
          <p className="mt-1 text-sm text-stone-300">
            {complete}% complete. {editableSeries} series still editable before lock.
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-2xl bg-court-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-court-700 disabled:cursor-wait disabled:opacity-70"
        >
          {saving ? "Saving..." : editableSeries === 0 ? "All series locked" : !canSubmit ? "Pick a series first" : "Submit picks"}
        </button>
      </div>
    </div>
  );
}
