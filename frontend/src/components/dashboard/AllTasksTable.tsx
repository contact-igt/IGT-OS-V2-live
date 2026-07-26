'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, LayoutGrid, List as ListIcon } from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG, Task, TeamMember, Client } from '@/lib/data';

type SortKey = 'title' | 'assignee' | 'client' | 'priority' | 'status' | 'deadline' | 'hours';
type SortDir = 'asc' | 'desc';

const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface Props {
  tasks: Task[];
  teamMembers: TeamMember[];
  clients: Client[];
  onOpenTask: (taskId: string) => void;
}

function downloadCsv(rows: Task[], teamMembers: TeamMember[], clients: Client[]) {
  const header = ['Task Name', 'Assigned To', 'Project', 'Priority', 'Status', 'Due Date', 'Est. Hours', 'Tags'];
  const lines = rows.map(t => {
    const assignees = t.assignedTo.map(id => teamMembers.find(m => m.id === id)?.name || id).join('; ');
    const client = clients.find(c => c.id === t.clientId)?.name || '';
    const cells = [
      t.title,
      assignees,
      client,
      PRIORITY_CONFIG[t.priority]?.label || t.priority,
      STATUS_CONFIG[t.status]?.label || t.status,
      t.deadline ? new Date(t.deadline).toLocaleDateString() : '',
      String(t.estimatedHours ?? ''),
      (t.tags || []).join('; '),
    ];
    return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AllTasksTable({ tasks, teamMembers, clients, onOpenTask }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

  const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'title': av = a.title.toLowerCase(); bv = b.title.toLowerCase(); break;
        case 'assignee': av = memberMap.get(a.assignedTo[0])?.name || ''; bv = memberMap.get(b.assignedTo[0])?.name || ''; break;
        case 'client': av = clientMap.get(a.clientId)?.name || ''; bv = clientMap.get(b.clientId)?.name || ''; break;
        case 'priority': av = PRIORITY_RANK[a.priority] || 0; bv = PRIORITY_RANK[b.priority] || 0; break;
        case 'status': av = a.status; bv = b.status; break;
        case 'hours': av = a.estimatedHours || 0; bv = b.estimatedHours || 0; break;
        case 'deadline':
        default:
          av = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          bv = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [tasks, sortKey, sortDir, memberMap, clientMap]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const toggleRow = (id: string) => {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every(t => selected.has(t.id));
  const toggleAllOnPage = () => {
    setSelected(s => {
      const next = new Set(s);
      if (allPageSelected) pageRows.forEach(t => next.delete(t.id));
      else pageRows.forEach(t => next.add(t.id));
      return next;
    });
  };

  const handleExport = () => {
    const rows = selected.size > 0 ? sorted.filter(t => selected.has(t.id)) : sorted;
    downloadCsv(rows, teamMembers, clients);
  };

  const th = (label: string, key: SortKey, extraClass = '') => (
    <th
      className={`py-3 px-3 font-medium text-xs uppercase tracking-wide cursor-pointer select-none hover:text-[var(--c-text)] ${extraClass}`}
      onClick={() => toggleSort(key)}
    >
      <span className="flex items-center gap-1">{label} <SortIcon col={key} /></span>
    </th>
  );

  return (
    <div className="rounded-xl border shadow-sm flex flex-col" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--c-border)' }}>
        <h3 className="font-semibold text-[var(--c-text)]">
          All Tasks <span className="text-[var(--c-text-2)] font-normal">({sorted.length})</span>
          {selected.size > 0 && <span className="text-[var(--c-text-2)] font-normal ml-2">· {selected.size} selected</span>}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-xs font-semibold rounded-lg border px-3 py-1.5 flex items-center gap-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)] hover:bg-[var(--c-surface-3)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--c-border)' }}>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-[var(--c-surface-3)]' : 'bg-[var(--c-surface)]'} text-[var(--c-text)]`}
              title="List view"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-[var(--c-surface-3)]' : 'bg-[var(--c-surface)]'} text-[var(--c-text)]`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--c-text-2)]">No tasks match the current filters.</div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--c-text-2)]" style={{ background: 'var(--c-surface)' }}>
              <tr>
                <th className="py-3 px-3 w-8">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAllOnPage} />
                </th>
                {th('Task Name', 'title')}
                {th('Assigned To', 'assignee')}
                {th('Project', 'client')}
                {th('Priority', 'priority')}
                {th('Status', 'status')}
                {th('Due Date', 'deadline')}
                {th('Hours', 'hours', 'text-right')}
                <th className="py-3 px-3 font-medium text-xs uppercase tracking-wide">Tags</th>
                <th className="py-3 px-3 font-medium text-xs uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
              {pageRows.map(t => {
                const client = clientMap.get(t.clientId);
                const sc = STATUS_CONFIG[t.status];
                const pc = PRIORITY_CONFIG[t.priority];
                return (
                  <tr key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t" style={{ borderColor: 'var(--c-border)' }}>
                    <td className="py-2.5 px-3">
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleRow(t.id)} />
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => onOpenTask(t.id)} className="font-medium text-[var(--c-text)] hover:underline text-left">
                        {t.title}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex -space-x-2">
                        {t.assignedTo.slice(0, 3).map(id => {
                          const m = memberMap.get(id);
                          if (!m) return null;
                          return (
                            <div
                              key={id}
                              title={m.name}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2"
                              style={{ background: m.color || 'var(--c-surface-3)', color: '#fff', borderColor: 'var(--c-surface-2)' }}
                            >
                              {m.initials}
                            </div>
                          );
                        })}
                        {t.assignedTo.length > 3 && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2" style={{ background: 'var(--c-surface-3)', color: 'var(--c-text)', borderColor: 'var(--c-surface-2)' }}>
                            +{t.assignedTo.length - 3}
                          </div>
                        )}
                        {t.assignedTo.length === 0 && <span className="text-[var(--c-text-2)] text-xs">Unassigned</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--c-text-2)]">{client?.name || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded w-fit inline-block" style={{ background: pc.bg, color: pc.color }}>
                        {pc.label.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit" style={{ background: sc.bg, color: sc.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--c-text-2)]">{t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'}</td>
                    <td className="py-2.5 px-3 text-right text-[var(--c-text-2)]">{t.estimatedHours ?? '—'}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 flex-wrap max-w-[160px]">
                        {(t.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--c-surface)] border border-[var(--c-border)] text-[var(--c-text-2)]">{tag}</span>
                        ))}
                        {(t.tags || []).length > 2 && <span className="text-[10px] text-[var(--c-text-2)]">+{t.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button onClick={() => onOpenTask(t.id)} className="text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)]">
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {pageRows.map(t => {
            const client = clientMap.get(t.clientId);
            const sc = STATUS_CONFIG[t.status];
            const pc = PRIORITY_CONFIG[t.priority];
            return (
              <button
                key={t.id}
                onClick={() => onOpenTask(t.id)}
                className="text-left rounded-lg border p-3 flex flex-col gap-2 hover:border-[var(--c-text-3)] transition-colors"
                style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-[var(--c-text)] text-sm">{t.title}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: pc.bg, color: pc.color }}>
                    {pc.label.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-[var(--c-text-2)]">{client?.name || '—'}</div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit" style={{ background: sc.bg, color: sc.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
                    {sc.label}
                  </span>
                  <span className="text-[11px] text-[var(--c-text-2)]">{t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'}</span>
                </div>
                <div className="flex -space-x-2">
                  {t.assignedTo.slice(0, 4).map(id => {
                    const m = memberMap.get(id);
                    if (!m) return null;
                    return (
                      <div key={id} title={m.name} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2" style={{ background: m.color || 'var(--c-surface-3)', color: '#fff', borderColor: 'var(--c-surface)' }}>
                        {m.initials}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="flex items-center justify-between p-4 border-t text-xs text-[var(--c-text-2)]" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded border px-2 py-1 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]"
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={clampedPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border disabled:opacity-40 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - clampedPage) <= 1)
              .reduce<number[]>((acc, n) => {
                if (acc.length && n - acc[acc.length - 1] > 1) acc.push(-1);
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) => n === -1 ? (
                <span key={`gap-${i}`} className="px-1">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-2.5 py-1 rounded border ${n === clampedPage ? 'bg-blue-500 text-white border-blue-500' : 'bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]'}`}
                >
                  {n}
                </button>
              ))}
            <button
              disabled={clampedPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border disabled:opacity-40 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
