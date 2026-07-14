interface StorageMetricsProps {
  totalGb: number;
  usedGb: number;
  label: string;
}

export function StorageMetrics({ totalGb, usedGb, label }: StorageMetricsProps) {
  const percent = Math.min(100, Math.round((usedGb / totalGb) * 100));
  const isWarning = percent > 85;
  const isCritical = percent > 95;

  return (
    <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-[var(--c-text)] text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--c-text-3)]">cloud</span>
          {label}
        </h4>
        <span className="text-xs font-semibold text-[var(--c-text-2)]">
          {usedGb} GB / {totalGb} GB
        </span>
      </div>

      <div className="w-full h-2.5 bg-[var(--c-surface-3)] rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full transition-all duration-500 ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-[var(--c-text-3)]">{percent}% full</span>
        {isCritical && (
          <span className="text-red-500 font-bold">Storage nearly full!</span>
        )}
      </div>
    </div>
  );
}
