'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import LeadDetailDrawer from './LeadDetailDrawer';
import ObjectionLibrary from './ObjectionLibrary';
import type { Lead } from '@/lib/seed_meetings';

type SortKey = 'score' | 'value' | 'lastContact' | 'name';

function relativeDate(dateStr: string): { label: string; isStale: boolean } {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  const isStale = diff > 7;
  const label = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? `${diff}d ago` : diff < 30 ? `${Math.floor(diff / 7)}w ago` : `${Math.floor(diff / 30)}mo ago`;
  return { label, isStale };
}

const STAGE_COLORS: Record<string, string> = {
  discovery: '#8B5CF6', proposal: '#0EA5E9', revision: '#F59E0B',
  closing: '#EC4899', won: '#10B981', lost: '#EF4444', paused: '#6B7280',
};

export default function SalesLeadsTable({ initialFilterStage }: { initialFilterStage: string | null }) {
  const { state } = useApp();
  const leads: Lead[] = (state.leads || []) as Lead[];

  const [filterStage, setFilterStage] = useState<string>(initialFilterStage || 'all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // derive unique sources + assignees from live data
  const sources = useMemo(() => [...new Set(leads.map(l => l.source))].filter(Boolean).sort(), [leads]);
  const assignees = useMemo(() => [...new Set(leads.map(l => l.assignedTo))].filter(Boolean), [leads]);

  const filteredLeads = useMemo(() => {
    let out = leads.slice();
    if (filterStage !== 'all') out = out.filter(l => l.stage === filterStage);
    if (filterSource !== 'all') out = out.filter(l => l.source === filterSource);
    if (filterAssignee !== 'all') out = out.filter(l => l.assignedTo === filterAssignee);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(l =>
        l.contactPerson.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        (l.industry || '').toLowerCase().includes(q) ||
        (l.source || '').toLowerCase().includes(q)
      );
    }
    out.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'score') diff = a.score - b.score;
      else if (sortKey === 'value') diff = (a.monthlyValueINR || 0) - (b.monthlyValueINR || 0);
      else if (sortKey === 'lastContact') diff = new Date(a.lastContactDate).getTime() - new Date(b.lastContactDate).getTime();
      else if (sortKey === 'name') diff = a.contactPerson.localeCompare(b.contactPerson);
      return sortDir === 'desc' ? -diff : diff;
    });
    return out;
  }, [leads, filterStage, filterSource, filterAssignee, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 hover:text-[var(--c-text)] transition-colors"
    >
      {label}
      <span className="text-[8px] opacity-60">{sortKey === col ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}</span>
    </button>
  );

  const memberName = (id: string) => state.teamMembers.find(m => m.id === id)?.name || id.replace('u-', '');

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center bg-[var(--c-surface)] p-3 border border-[var(--c-border)] rounded-xl shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--c-text-2)]">Filter</span>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--c-text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="text-xs bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-emerald-500 w-48"
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="text-xs bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
        >
          <option value="all">All stages</option>
          {['discovery','proposal','revision','closing','won','lost','paused'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <select
          className="text-xs bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
        >
          <option value="all">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="text-xs bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
        >
          <option value="all">All assigned</option>
          {assignees.map(id => <option key={id} value={id}>{memberName(id)}</option>)}
        </select>

        <span className="ml-auto text-xs text-[var(--c-text-2)]">
          {filteredLeads.length} of {leads.length} leads
        </span>
      </div>

      {/* Table */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-border)] sticky top-0 z-10">
              <tr className="text-[10px] uppercase tracking-wider text-[var(--c-text-2)]">
                <th className="px-4 py-3 font-semibold"><SortBtn col="name" label="Contact" /></th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Industry</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold text-right"><SortBtn col="value" label="Value/mo" /></th>
                <th className="px-4 py-3 font-semibold"><SortBtn col="lastContact" label="Last Contact" /></th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Assigned</th>
                <th className="px-4 py-3 font-semibold text-right"><SortBtn col="score" label="Score" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {filteredLeads.map(lead => {
                const { label: dateLabel, isStale } = relativeDate(lead.lastContactDate);
                const stageColor = STAGE_COLORS[lead.stage] || '#6B7280';
                const isActive = !['won', 'lost', 'paused'].includes(lead.stage);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="hover:bg-[var(--c-surface-2)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{lead.contactPerson}</td>
                    <td className="px-4 py-3 text-[var(--c-text-2)]">{lead.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--c-text-2)]">{lead.industry || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="capitalize px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{ color: stageColor, backgroundColor: `${stageColor}15`, borderColor: `${stageColor}30` }}
                      >
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-500 font-semibold">
                      ₹{lead.monthlyValueINR?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={isStale && isActive ? 'text-red-500 font-medium' : 'text-[var(--c-text-2)]'}>
                        {dateLabel}
                        {isStale && isActive && ' ⚠'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--c-text-2)]">{lead.source || '—'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--c-text-2)]">{memberName(lead.assignedTo)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1.5 bg-[var(--c-border)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${lead.score}%`,
                              backgroundColor: lead.score > 70 ? '#10B981' : lead.score > 40 ? '#F59E0B' : '#EF4444'
                            }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right font-medium">{lead.score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--c-text-2)]">
                      <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">No leads match the current filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadDetailDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      <ObjectionLibrary />
    </div>
  );
}
