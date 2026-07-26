'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG, TeamMember, Client } from '@/lib/data';

export interface DashboardFilters {
  search: string;
  status: string;
  priority: string;
  assignee: string;
  clientId: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: DashboardFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  assignee: 'all',
  clientId: 'all',
  dateFrom: '',
  dateTo: '',
};

interface Props {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  teamMembers: TeamMember[];
  clients: Client[];
}

const selectClass = "text-sm rounded-lg border px-3 py-2 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/40";

export default function DashboardFilterBar({ filters, onChange, teamMembers, clients }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const set = (patch: Partial<DashboardFilters>) => onChange({ ...filters, ...patch });

  const isDirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="rounded-xl border shadow-sm p-4 flex flex-col gap-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)]" />
          <input
            value={filters.search}
            onChange={e => set({ search: e.target.value })}
            placeholder="Search tasks by name, tag, client..."
            className="w-full text-sm rounded-lg border pl-9 pr-3 py-2 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <select className={selectClass} value={filters.status} onChange={e => set({ status: e.target.value })}>
          <option value="all">All Statuses</option>
          {Object.keys(STATUS_CONFIG).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}</option>
          ))}
        </select>

        <select className={selectClass} value={filters.priority} onChange={e => set({ priority: e.target.value })}>
          <option value="all">All Priorities</option>
          {Object.keys(PRIORITY_CONFIG).map(p => (
            <option key={p} value={p}>{PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].label}</option>
          ))}
        </select>

        <select className={selectClass} value={filters.assignee} onChange={e => set({ assignee: e.target.value })}>
          <option value="all">All Assignees</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>{m.name || m.email}</option>
          ))}
        </select>

        <button
          onClick={() => setAdvancedOpen(o => !o)}
          className="text-sm rounded-lg border px-3 py-2 flex items-center gap-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)] transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Advanced
        </button>

        {isDirty && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-sm rounded-lg border px-3 py-2 flex items-center gap-1.5 text-red-500 border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {advancedOpen && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--c-border)' }}>
          <select className={selectClass} value={filters.clientId} onChange={e => set({ clientId: e.target.value })}>
            <option value="all">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
            <span>Deadline:</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => set({ dateFrom: e.target.value })}
              className="text-sm rounded-lg border px-2.5 py-2 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <span>to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => set({ dateTo: e.target.value })}
              className="text-sm rounded-lg border px-2.5 py-2 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}
