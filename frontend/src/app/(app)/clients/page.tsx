'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Users, IndianRupee, Wallet, PieChart, Search, SearchX, User, ExternalLink } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Client, isOverdue } from '@/lib/data';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

function getBudgetBarColor(util: number): string {
  if (util < 70) return '#2AB182';
  if (util < 90) return '#F59E0B';
  return '#EF4444';
}

type SortKey = 'name' | 'retainer' | 'budget';

const CONTRACT_STATUS_STYLES: Record<
  Client['contractStatus'],
  { label: string; color: string; bg: string }
> = {
  active:  { label: 'Active',  color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  paused:  { label: 'Paused',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  churned: { label: 'Churned', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { state } = useApp();
  const { clients, tasks } = state;

  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState<SortKey>('name');

  // ── Derived summary stats ─────────────────────────────────────────────────
  const totalRetainer = useMemo(
    () => clients.reduce((acc, c) => acc + c.monthlyRetainerINR, 0),
    [clients],
  );

  const totalAgencyFee = useMemo(
    () => clients.reduce((acc, c) => acc + (c.agencyFeeINR || 0), 0),
    [clients],
  );

  const avgBudgetUtil = useMemo(() => {
    if (!clients.length) return 0;
    const sum = clients.reduce((acc, c) => acc + (c.budgetUtilization || 0), 0);
    return Math.round(sum / clients.length);
  }, [clients]);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? clients.filter((c) => c.name.toLowerCase().includes(q))
      : [...clients];

    list.sort((a, b) => {
      if (sortKey === 'name')    return a.name.localeCompare(b.name);
      if (sortKey === 'retainer') return b.monthlyRetainerINR - a.monthlyRetainerINR;
      if (sortKey === 'budget')  return (b.budgetUtilization || 0) - (a.budgetUtilization || 0);
      return 0;
    });

    return list;
  }, [clients, search, sortKey]);

  // ── Per-client task computations (memoised map for performance) ───────────
  const taskMap = useMemo(() => {
    const map: Record<string, { active: number; overdue: number }> = {};
    for (const c of clients) {
      const clientTasks = tasks.filter((t) => t.clientId === c.id);
      const active = clientTasks.filter((t) => t.status !== 'done').length;
      const overdue = clientTasks.filter((t) => isOverdue(t)).length;
      map[c.id] = { active, overdue };
    }
    return map;
  }, [clients, tasks]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Briefcase className="w-7 h-7 text-amber-600" />
        <h1 className="text-2xl font-bold text-app-text m-0">
          Clients
        </h1>
        <span
          className="font-bold text-xs px-2.5 py-1 rounded-full tracking-wide bg-amber-600/15 text-amber-600"
        >
          {clients.length}
        </span>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7"
      >
        {[
          {
            label: 'Total Clients',
            value: clients.length.toString(),
            icon: Users,
          },
          {
            label: 'Total Monthly Retainer',
            value: formatINR(totalRetainer),
            icon: IndianRupee,
          },
          {
            label: 'Total Agency Fee',
            value: totalAgencyFee > 0 ? formatINR(totalAgencyFee) : '—', // no data source yet: never show a made-up 0
            icon: Wallet,
          },
          {
            label: 'Avg Budget Utilization',
            value: avgBudgetUtil > 0 ? `${avgBudgetUtil}%` : '—', // no data source yet
            icon: PieChart,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="card flex items-center gap-4 px-5 py-4"
          >
            <Icon className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="m-0 text-xs text-app-text3 font-medium">
                {label}
              </p>
              <p className="m-0 text-lg xl:text-xl font-bold text-app-text truncate">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Sort row ────────────────────────────────────────────── */}
      <div
        className="flex gap-3 mb-6 flex-wrap items-center"
      >
        {/* Search */}
        <div className="relative flex-[1_1_260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[1.1rem] h-[1.1rem] text-app-text3 pointer-events-none" />
          <input
            id="clients-search"
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-app-surface border border-app-border rounded-lg py-[0.55rem] pr-3 pl-9 text-app-text text-sm outline-none"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[0.8rem] text-app-text3 font-medium">
            Sort:
          </span>
          {(['name', 'retainer', 'budget'] as SortKey[]).map((key) => {
            const labels: Record<SortKey, string> = {
              name: 'Name',
              retainer: 'Retainer',
              budget: 'Budget %',
            };
            return (
              <button
                key={key}
                id={`sort-${key}`}
                onClick={() => setSortKey(key)}
                className={`px-3.5 py-1.5 rounded-md text-[0.8rem] font-semibold cursor-pointer transition duration-150 border ${sortKey === key ? 'border-amber-600/80 bg-amber-600/10 text-amber-600' : 'border-app-border bg-app-surface text-app-text2'}`}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── No results ────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div
          className="text-center py-16 px-8 text-app-text3"
        >
          <SearchX className="w-12 h-12 mx-auto mb-3" />
          <p className="text-base font-semibold m-0">No clients found</p>
          <p className="text-[0.85rem] mt-1">
            Try a different search term.
          </p>
        </div>
      )}

      {/* ── Client grid ───────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div
          className="clients-grid grid grid-cols-3 gap-4"
        >
          {filtered.map((client) => {
            const { active: activeTasks, overdue: overdueTasks } = taskMap[client.id] ?? { active: 0, overdue: 0 };
            const statusStyle = CONTRACT_STATUS_STYLES[client.contractStatus] || { label: client.contractStatus || 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
            const barColor = getBudgetBarColor(client.budgetUtilization || 0);
            const clientColor = client.color || '#3B82F6';

            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                id={`client-card-${client.id}`}
                className="card group cursor-pointer transition hover:scale-[1.02] flex flex-col gap-[0.875rem] p-5"
                style={{ 
                  borderTop: `4px solid ${clientColor}`
                }}
              >
                {/* ── Card top: name + badges ─────────────────────────── */}
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p
                      className="m-0 text-base font-bold text-app-text leading-snug truncate"
                      title={client.name}
                    >
                      {client.name}
                    </p>
                    <p className="mt-[0.2rem] mb-0 text-[0.72rem] text-app-text3 font-medium">
                      {client.code}
                    </p>
                  </div>
                  {/* Category badge */}
                  <span
                    className="text-[0.68rem] font-semibold px-[0.55rem] py-[0.2rem] rounded-full bg-amber-600/10 text-amber-600 whitespace-nowrap shrink-0"
                  >
                    {client.category}
                  </span>
                </div>

                {/* ── Contract status ─────────────────────────────────── */}
                <div className="flex items-center gap-[0.4rem]">
                  <span
                    className="inline-block w-[7px] h-[7px] rounded-full shrink-0"
                    style={{ background: statusStyle.color }}
                  />
                  <span
                    className="text-[0.73rem] font-semibold px-[0.55rem] py-[0.18rem] rounded-full"
                    style={{
                      color: statusStyle.color,
                      background: statusStyle.bg,
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* ── Monthly retainer & Agency Fee ─────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-app-surface2 rounded-lg py-[0.6rem] px-[0.875rem] flex flex-col gap-[0.2rem]">
                    <span className="text-[0.7rem] text-app-text3 font-medium">
                      Retainer
                    </span>
                    <span className="text-[0.9rem] font-bold text-app-text">
                      {client.monthlyRetainerINR > 0 ? formatINR(client.monthlyRetainerINR) : '—'}
                    </span>
                  </div>
                  <div className="bg-app-surface2 rounded-lg py-[0.6rem] px-[0.875rem] flex flex-col gap-[0.2rem]">
                    <span className="text-[0.7rem] text-app-text3 font-medium">
                      Agency Fee
                    </span>
                    <span className="text-[0.9rem] font-bold text-app-text">
                      {client.agencyFeeINR > 0 ? formatINR(client.agencyFeeINR) : '—'}
                    </span>
                  </div>
                </div>

                {/* ── Budget utilization bar (only when a real figure exists) ── */}
                <div>
                  <div className="flex items-center justify-between gap-[0.4rem] mb-[0.2rem]">
                    <span className="text-[0.7rem] text-app-text3 font-medium">Budget Used</span>
                    <span className="text-[0.8rem] font-bold text-app-text">{client.budgetUtilization ? `${client.budgetUtilization}%` : '—'}</span>
                  </div>
                  {client.budgetUtilization ? (
                    <div className="h-[6px] rounded-full bg-app-surface3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition duration-400 ease-in-out"
                        style={{ width: `${Math.min(client.budgetUtilization, 100)}%`, background: barColor }}
                      />
                    </div>
                  ) : null}
                </div>

                {/* ── Task stats ───────────────────────────────────────── */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-app-surface2 rounded-lg py-2 px-3 text-center">
                    <p className="m-0 text-[1.1rem] font-bold text-app-text">
                      {activeTasks}
                    </p>
                    <p className="m-0 text-[0.68rem] text-app-text3 font-medium">
                      Active Tasks
                    </p>
                  </div>
                  <div
                    className="flex-1 rounded-lg py-2 px-3 text-center"
                    style={{
                      background: overdueTasks > 0 ? 'rgba(239,68,68,0.08)' : 'var(--c-surface-2)'
                    }}
                  >
                    <p
                      className="m-0 text-[1.1rem] font-bold"
                      style={{ color: overdueTasks > 0 ? '#EF4444' : 'var(--c-text)' }}
                    >
                      {overdueTasks}
                    </p>
                    <p
                      className="m-0 text-[0.68rem] font-medium"
                      style={{ color: overdueTasks > 0 ? '#EF4444' : 'var(--c-text-3)' }}
                    >
                      Overdue
                    </p>
                  </div>
                </div>

                {/* ── Primary contact ──────────────────────────────────── */}
                <div className="flex items-center gap-[0.45rem]">
                  <User className="w-4 h-4 text-app-text3" />
                  <span className="text-[0.8rem] text-app-text2">
                    {client.primaryContact}
                  </span>
                </div>

                {/* ── Open indicator ───────────────────────────────────────── */}
                <div
                  className="btn-primary mt-auto flex items-center justify-center gap-[0.4rem] no-underline text-[0.82rem] font-semibold py-[0.55rem] border-none"
                  style={{
                    background: `${clientColor}20`, // 20% opacity
                    color: clientColor,
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Responsive grid styles ────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 1024px) {
          .clients-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .clients-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
