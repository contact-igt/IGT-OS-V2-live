'use client';

import React from 'react';

interface StatPillProps {
  label: string;
  value: number;
  total?: number;
  percentage?: number;
  colorHex?: string; // e.g. #2AB182
}

export default function StatPill({ label, value, total, percentage, colorHex = '#2AB182' }: StatPillProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-surface-2)]">
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: colorHex, boxShadow: `0 0 8px ${colorHex}66` }}
      />
      <span className="text-xs font-medium text-[var(--c-text-2)] uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <span>{value}</span>
        {total !== undefined && (
          <span className="text-[var(--c-text-3)] font-normal">/ {total}</span>
        )}
        {percentage !== undefined && (
          <>
            <span className="text-[var(--c-text-3)] font-normal">·</span>
            <span style={{ color: colorHex }}>{percentage}%</span>
          </>
        )}
      </div>
    </div>
  );
}
