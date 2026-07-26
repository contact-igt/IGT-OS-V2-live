'use client';

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { STATUS_CONFIG, TaskStatus, Task } from '@/lib/data';

interface Props {
  tasks: Task[];
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'paused', 'rework', 'blocked', 'done', 'cancelled'];

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
      <div className="text-[var(--c-text-2)] mt-0.5">{d.value} tasks · {d.pct}%</div>
    </div>
  );
}

export default function TasksByStatusChart({ tasks }: Props) {
  const [tableView, setTableView] = useState(false);

  const data = useMemo(() => {
    const total = tasks.length || 1;
    return STATUS_ORDER
      .map(status => {
        const count = tasks.filter(t => t.status === status).length;
        return {
          status,
          label: STATUS_CONFIG[status].label,
          color: STATUS_CONFIG[status].color,
          value: count,
          pct: Math.round((count / total) * 100),
        };
      })
      .filter(d => d.value > 0);
  }, [tasks]);

  const total = tasks.length;

  return (
    <div
      className="overflow-hidden h-full w-full border rounded-xl shadow-sm flex flex-col p-5"
      style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-indigo-500" />
          Tasks by Status
        </h3>
        <button
          onClick={() => setTableView(v => !v)}
          className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]"
        >
          {tableView ? 'Chart view' : 'Table view'}
        </button>
      </div>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--c-text-2)]">No tasks yet.</div>
      ) : tableView ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--c-text-2)] text-xs uppercase">
                <th className="py-1.5 font-medium">Status</th>
                <th className="py-1.5 font-medium text-right">Count</th>
                <th className="py-1.5 font-medium text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.status} className="border-t" style={{ borderColor: 'var(--c-border)' }}>
                  <td className="py-1.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    {d.label}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-[var(--c-text)]">{d.value}</td>
                  <td className="py-1.5 text-right text-[var(--c-text-2)]">{d.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-4 min-h-0">
          <div className="relative w-[45%] h-full min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={data.length > 1 ? 2 : 0}
                  strokeWidth={2}
                  stroke="var(--c-surface-2)"
                  isAnimationActive={false}
                >
                  {data.map(d => <Cell key={d.status} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[var(--c-text)]">{total}</span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--c-text-2)]">Total</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar max-h-full">
            {data.map(d => (
              <div key={d.status} className="flex items-center justify-between text-xs gap-2">
                <span className="flex items-center gap-1.5 text-[var(--c-text-2)] truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  {d.label}
                </span>
                <span className="font-semibold text-[var(--c-text)] flex-shrink-0">{d.value} <span className="text-[var(--c-text-2)] font-normal">({d.pct}%)</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
