'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { SEVERITY_CONFIG, Severity } from '@/lib/auditSeverity';

const ORDER: Severity[] = ['success', 'info', 'warning', 'critical'];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
    >
      <div className="flex items-center gap-1.5 font-semibold">
        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
        {d.label}
      </div>
      <div className="text-[var(--c-text-2)] mt-0.5">{d.value.toLocaleString()} events · {d.pct}%</div>
    </div>
  );
}

export default function AuditSeverityDonut({ counts }: { counts: Record<Severity, number> }) {
  const total = ORDER.reduce((acc, k) => acc + counts[k], 0);
  const data = useMemo(() => ORDER
    .map(k => ({ key: k, label: SEVERITY_CONFIG[k].label, color: SEVERITY_CONFIG[k].color, value: counts[k], pct: total > 0 ? Math.round((counts[k] / total) * 100) : 0 }))
    .filter(d => d.value > 0), [counts, total]);

  return (
    <div className="flex items-center gap-4 h-full">
      <div className="relative w-[45%] h-full min-h-[110px]">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[var(--c-text-2)]">No events yet</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={data.length > 1 ? 2 : 0} strokeWidth={2} stroke="var(--c-surface)" isAnimationActive={false}>
                  {data.map(d => <Cell key={d.key} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-[var(--c-text)]">{total.toLocaleString()}</span>
              <span className="text-[9px] uppercase tracking-wide text-[var(--c-text-2)]">Total</span>
            </div>
          </>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        {ORDER.map(k => (
          <div key={k} className="flex items-center justify-between text-xs gap-2">
            <span className="flex items-center gap-1.5 text-[var(--c-text-2)] truncate">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEVERITY_CONFIG[k].color }} />
              {SEVERITY_CONFIG[k].label}
            </span>
            <span className="font-semibold text-[var(--c-text)] flex-shrink-0">
              {counts[k].toLocaleString()} <span className="text-[var(--c-text-2)] font-normal">({total > 0 ? Math.round((counts[k] / total) * 100) : 0}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
