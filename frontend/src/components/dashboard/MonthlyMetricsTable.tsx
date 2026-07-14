interface MetricRow {
  label: string;
  countText: string; // e.g. "4 done"
  avgText: string;   // e.g. "Avg 1h 45m"
  benchmarkText: string; // e.g. "Benchmark 1h 30m"
  trendValue?: number; // percentage
  trendGood?: boolean;
}

interface MonthlyMetricsTableProps {
  title: string;
  rows: MetricRow[];
  footerContent?: React.ReactNode;
}

export function MonthlyMetricsTable({ title, rows, footerContent }: MonthlyMetricsTableProps) {
  return (
    <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[var(--c-border)]">
        <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase">
          {title}
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <tbody className="divide-y divide-[var(--c-border)]">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-[var(--c-hover)] transition-colors text-sm">
                <td className="px-6 py-3 font-semibold text-[var(--c-text)] whitespace-nowrap">
                  {row.label}
                </td>
                <td className="px-6 py-3 text-[var(--c-text-2)] whitespace-nowrap">
                  {row.countText}
                </td>
                <td className="px-6 py-3 text-[var(--c-text-2)] whitespace-nowrap">
                  {row.avgText}
                </td>
                <td className="px-6 py-3 text-[var(--c-text-3)] whitespace-nowrap">
                  {row.benchmarkText}
                </td>
                <td className="px-6 py-3 text-right whitespace-nowrap font-bold">
                  {row.trendValue !== undefined && (
                    <span className={row.trendGood ? 'text-emerald-500' : 'text-amber-500'}>
                      {row.trendGood ? '✅ ' : '🟡 '}
                      {row.trendValue > 0 ? '+' : ''}{row.trendValue}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footerContent && (
        <div className="px-6 py-4 bg-[var(--c-surface-2)] border-t border-[var(--c-border)] text-sm font-medium text-[var(--c-text-2)] leading-relaxed">
          {footerContent}
        </div>
      )}
    </div>
  );
}
