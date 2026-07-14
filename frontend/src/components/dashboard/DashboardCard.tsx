import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon?: string;
  subtitle?: string;
  trend?: { value: number; label: string; };
}

export function DashboardCard({ title, value, icon, subtitle, trend }: DashboardCardProps) {
  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-5 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[var(--c-text-2)] font-syne font-semibold text-sm">{title}</h3>
        {icon && <span className="material-symbols-outlined text-[var(--c-text-3)] text-xl">{icon}</span>}
      </div>
      <div>
        <p className="text-3xl font-bold text-[var(--c-text)]">{value}</p>
        {subtitle && <p className="text-[var(--c-text-3)] text-xs mt-1">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-2 font-medium ${trend.value >= 0 ? 'text-[var(--c-success)]' : 'text-[var(--c-error)]'}`}>
            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
