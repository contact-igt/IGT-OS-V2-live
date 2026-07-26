'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  data: { hour: string; count: number }[];
  color?: string;
  showAxes?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
    >
      <div className="font-semibold">{label}</div>
      <div className="text-[var(--c-text-2)] mt-0.5">{payload[0].value.toLocaleString()} events</div>
    </div>
  );
}

export default function AuditActivityChart({ data, color = '#3B82F6', showAxes = true }: Props) {
  const gradientId = `auditActivityFill-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: showAxes ? -20 : 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxes && <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />}
        {showAxes && <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--c-text-2)' }} axisLine={{ stroke: 'var(--c-border)' }} tickLine={false} interval={2} />}
        {showAxes && <YAxis tick={{ fontSize: 10, fill: 'var(--c-text-2)' }} axisLine={false} tickLine={false} width={36} />}
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
