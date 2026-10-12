'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Activity, Users, Lock, ShieldAlert, CalendarClock, Fingerprint,
  Download, FileText, Search, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import AuditSeverityDonut from '@/components/audit/AuditSeverityDonut';
import AuditActivityChart from '@/components/audit/AuditActivityChart';
import {
  AuditEntry, Severity, SEVERITY_CONFIG, MODULE_LABELS,
  getSeverity, getStatus, parseMeta, actionLabel,
} from '@/lib/auditSeverity';

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All Activity' },
  { key: 'Auth', label: 'Authentication' },
  { key: 'Task', label: 'Tasks' },
  { key: 'Employee', label: 'Employees' },
  { key: 'Attendance', label: 'Attendance' },
  { key: 'Leave', label: 'Leave' },
  { key: 'security', label: 'Security' },
];

const ACTION_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  created: { bg: 'rgba(139,92,246,0.12)', color: '#8B5CF6' },
  updated: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  deleted: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  failed: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  blocked: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  success: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  requested: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  saved: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  logged: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  change: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  commented: { bg: 'rgba(139,92,246,0.12)', color: '#8B5CF6' },
  start: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  stop: { bg: 'rgba(100,116,139,0.12)', color: '#64748B' },
};

function actionBadgeStyle(action: string) {
  const key = Object.keys(ACTION_BADGE_COLORS).find(k => action.includes(k));
  return key ? ACTION_BADGE_COLORS[key] : { bg: 'var(--c-surface-3)', color: 'var(--c-text-2)' };
}

interface Filters {
  search: string;
  actorId: string;
  module: string;
  action: string;
  severity: string;
  dateFrom: string;
  dateTo: string;
}
const EMPTY_FILTERS: Filters = { search: '', actorId: 'all', module: 'all', action: 'all', severity: 'all', dateFrom: '', dateTo: '' };

function dateKey(ts: string) {
  return ts.split('T')[0];
}

function downloadCsv(rows: (AuditEntry & { severity: Severity; status: string; metaParsed: any })[], teamMembers: any[]) {
  const header = ['Time', 'User', 'Module', 'Action', 'Resource', 'IP Address', 'Device', 'Status', 'Severity'];
  const lines = rows.map(r => {
    const cells = [
      new Date(r.timestamp).toLocaleString(),
      r.actor,
      MODULE_LABELS[r.entity] || r.entity,
      actionLabel(r.action),
      r.entityRef,
      r.metaParsed.ip || '',
      r.metaParsed.device || '',
      r.status,
      r.severity,
    ];
    return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditPage() {
  const { state } = useApp();
  const { user: authUser } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canView = !!authUser && ['admin', 'ops', 'super_admin'].includes(authUser.role); // server enforces the same rule

  const fetchLog = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/audit-log`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Audit log request failed (${res.status})`);
      setEntries(await res.json());
      setLoadError(null);
    } catch (e: any) {
      console.error('Failed to load audit log:', e);
      setLoadError(e.message || 'Could not load the audit log'); // never present a failed load as "no events"
    }
    setLoading(false);
  }, [canView]);

  // "Live" is real, not decorative — the log actually re-polls every 30s.
  useEffect(() => {
    fetchLog();
    const interval = setInterval(fetchLog, 30000);
    return () => clearInterval(interval);
  }, [fetchLog]);

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  const isAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'ops';

  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Some historical rows were written with actor_name literally 'Unknown' even though
  // actor_id is a valid, resolvable user — prefer the roster's current name over the
  // stored string wherever the id resolves, so the same person doesn't show up under two
  // different labels across different rows.
  const enriched = useMemo(() => entries.map(e => {
    const metaParsed = parseMeta(e.meta);
    const member = state.teamMembers.find(m => m.id === e.actorId);
    const actor = member?.name || e.actor;
    return { ...e, actor, metaParsed, severity: getSeverity(e, metaParsed), status: getStatus(e) };
  }), [entries, state.teamMembers]);

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return enriched;
    if (activeTab === 'security') return enriched.filter(e => e.severity === 'critical' || e.severity === 'warning');
    return enriched.filter(e => e.entity === activeTab);
  }, [enriched, activeTab]);

  const filtered = useMemo(() => tabFiltered.filter(e => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${e.actor} ${e.action} ${e.entityRef} ${e.entity}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.actorId !== 'all' && e.actorId !== filters.actorId) return false;
    if (filters.module !== 'all' && e.entity !== filters.module) return false;
    if (filters.action !== 'all' && e.action !== filters.action) return false;
    if (filters.severity !== 'all' && e.severity !== filters.severity) return false;
    if (filters.dateFrom && new Date(e.timestamp) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(e.timestamp) > new Date(`${filters.dateTo}T23:59:59`)) return false;
    return true;
  }), [tabFiltered, filters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return sortDir === 'desc' ? -diff : diff;
  }), [filtered, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  // ---- Stat cards & panels — computed off the FULL dataset, not the tab/filter scope, ----
  // matching the reference's cards which summarize the whole log regardless of the table below.
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const totalEvents = enriched.length;
  const todayLogs = enriched.filter(e => dateKey(e.timestamp) === todayStr).length;
  const yesterdayLogs = enriched.filter(e => dateKey(e.timestamp) === yesterdayStr).length;
  const activeUsersToday = new Set(enriched.filter(e => dateKey(e.timestamp) === todayStr).map(e => e.actorId)).size;
  const activeUsersYesterday = new Set(enriched.filter(e => dateKey(e.timestamp) === yesterdayStr).map(e => e.actorId)).size;
  const failedLoginsTotal = enriched.filter(e => e.status === 'failed').length;
  const failedLoginsToday = enriched.filter(e => e.status === 'failed' && dateKey(e.timestamp) === todayStr).length;
  const failedLoginsYesterday = enriched.filter(e => e.status === 'failed' && dateKey(e.timestamp) === yesterdayStr).length;
  const criticalTotal = enriched.filter(e => e.severity === 'critical').length;
  const criticalToday = enriched.filter(e => e.severity === 'critical' && dateKey(e.timestamp) === todayStr).length;
  const criticalYesterday = enriched.filter(e => e.severity === 'critical' && dateKey(e.timestamp) === yesterdayStr).length;
  const uniqueActors = new Set(enriched.map(e => e.actorId)).size;

  function pctDelta(today: number, yest: number): number | null {
    if (yest === 0) return today > 0 ? 100 : null;
    return Math.round(((today - yest) / yest) * 100);
  }

  const severityCounts: Record<Severity, number> = { critical: 0, warning: 0, info: 0, success: 0 };
  enriched.forEach(e => { severityCounts[e.severity]++; });
  const statusCounts = {
    success: enriched.filter(e => e.status === 'success').length,
    failed: enriched.filter(e => e.status === 'failed').length,
  };

  const activity24h = useMemo(() => {
    const now = new Date();
    const buckets: { hour: string; count: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const bucketStart = new Date(now);
      bucketStart.setMinutes(0, 0, 0);
      bucketStart.setHours(bucketStart.getHours() - i);
      const bucketEnd = new Date(bucketStart.getTime() + 3600 * 1000);
      const count = enriched.filter(e => {
        const t = new Date(e.timestamp).getTime();
        return t >= bucketStart.getTime() && t < bucketEnd.getTime();
      }).length;
      buckets.push({ hour: bucketStart.toLocaleTimeString([], { hour: '2-digit' }), count });
    }
    return buckets;
  }, [enriched]);

  const failedLoginTrend = useMemo(() => {
    const now = new Date();
    const buckets: { hour: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = enriched.filter(e => e.status === 'failed' && dateKey(e.timestamp) === key).length;
      buckets.push({ hour: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), count });
    }
    return buckets;
  }, [enriched]);

  const recentCritical = useMemo(() =>
    [...enriched]
      .filter(e => e.severity === 'critical' || e.severity === 'warning')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  , [enriched]);

  const quickFilterCounts = useMemo(() => {
    const last7 = new Date(); last7.setDate(last7.getDate() - 7);
    const last30 = new Date(); last30.setDate(last30.getDate() - 30);
    return {
      today: todayLogs,
      yesterday: yesterdayLogs,
      last7: enriched.filter(e => new Date(e.timestamp) >= last7).length,
      last30: enriched.filter(e => new Date(e.timestamp) >= last30).length,
    };
  }, [enriched, todayLogs, yesterdayLogs]);

  const topActiveUsers = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; actorId: string | null }>();
    enriched.forEach(e => {
      const key = e.actorId || e.actor;
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { name: e.actor, count: 1, actorId: e.actorId });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [enriched]);

  const topModules = useMemo(() => {
    const counts = new Map<string, number>();
    enriched.forEach(e => counts.set(e.entity, (counts.get(e.entity) || 0) + 1));
    return Array.from(counts.entries()).map(([entity, count]) => ({ entity, label: MODULE_LABELS[entity] || entity, count })).sort((a, b) => b.count - a.count);
  }, [enriched]);

  const authEntries = useMemo(() => enriched.filter(e => e.entity === 'Auth'), [enriched]);
  const topIPs = useMemo(() => {
    const counts = new Map<string, number>();
    authEntries.forEach(e => { if (e.metaParsed.ip) counts.set(e.metaParsed.ip, (counts.get(e.metaParsed.ip) || 0) + 1); });
    return Array.from(counts.entries()).map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [authEntries]);
  const topDevices = useMemo(() => {
    const counts = new Map<string, number>();
    authEntries.forEach(e => { if (e.metaParsed.device) counts.set(e.metaParsed.device, (counts.get(e.metaParsed.device) || 0) + 1); });
    return Array.from(counts.entries()).map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [authEntries]);

  const distinctActors = useMemo(() => {
    const map = new Map<string, string>();
    enriched.forEach(e => { if (e.actorId) map.set(e.actorId, e.actor); });
    return Array.from(map.entries());
  }, [enriched]);
  const distinctModules = useMemo(() => Array.from(new Set(enriched.map(e => e.entity))), [enriched]);
  const distinctActions = useMemo(() => Array.from(new Set(enriched.map(e => e.action))), [enriched]);

  const isDirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const maxTopUser = topActiveUsers[0]?.count || 1;
  const maxTopModule = topModules[0]?.count || 1;
  const maxTopIp = topIPs[0]?.count || 1;

  if (loading) {
    return <div className="p-8 text-[var(--c-text-2)]">Loading audit log...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        UNAUTHORIZED: Admin, Super Admin, or Ops access required.
      </div>
    );
  }

  const statCard = (icon: React.ReactNode, label: string, value: string | number, delta: number | null, iconBg: string, iconColor: string) => (
    <div className="rounded-xl border p-4 flex items-center gap-3 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
      <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        {React.cloneElement(icon as any, { className: 'w-5 h-5', style: { color: iconColor } })}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-[var(--c-text-2)] uppercase tracking-wide truncate">{label}</div>
        <div className="text-xl font-bold text-[var(--c-text)] leading-tight">{value}</div>
        {delta !== null && (
          <div className={`text-[11px] font-medium flex items-center gap-0.5 ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {delta >= 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {Math.abs(delta)}% vs yesterday
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 p-6 max-w-[1600px] mx-auto">
      {loadError && <p role="alert" className="text-sm" style={{ color: 'var(--c-error)' }}>Unavailable: {loadError}. The list below may be incomplete - this is not an empty log.</p>}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--c-text)]">System Audit Logs</h1>
          <p className="text-sm text-[var(--c-text-2)] mt-1">Monitor every activity performed across the organization.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)', color: 'var(--c-text)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
          <button
            onClick={() => downloadCsv(sorted, state.teamMembers)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-[var(--c-surface-3)] transition-colors"
            style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)', color: 'var(--c-text)' }}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:bg-[var(--c-surface-3)] transition-colors"
            style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)', color: 'var(--c-text)' }}
          >
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCard(<Activity />, 'Total Events', totalEvents.toLocaleString(), null, 'rgba(59,130,246,0.12)', '#3B82F6')}
        {statCard(<Users />, 'Active Users Today', activeUsersToday, pctDelta(activeUsersToday, activeUsersYesterday), 'rgba(16,185,129,0.12)', '#10B981')}
        {statCard(<Lock />, 'Failed Logins', failedLoginsTotal, pctDelta(failedLoginsToday, failedLoginsYesterday), 'rgba(239,68,68,0.12)', '#EF4444')}
        {statCard(<ShieldAlert />, 'Critical Events', criticalTotal, pctDelta(criticalToday, criticalYesterday), 'rgba(245,158,11,0.12)', '#F59E0B')}
        {statCard(<CalendarClock />, "Today's Logs", todayLogs, pctDelta(todayLogs, yesterdayLogs), 'rgba(99,102,241,0.12)', '#6366F1')}
        {statCard(<Fingerprint />, 'Unique Actors', uniqueActors, null, 'rgba(20,184,166,0.12)', '#14B8A6')}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
          <h3 className="font-semibold text-[var(--c-text)] mb-2">System Activity (Last 24 Hours)</h3>
          <div className="h-[220px]">
            <AuditActivityChart data={activity24h} />
          </div>
        </div>
        <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
          <h3 className="font-semibold text-[var(--c-text)] mb-2">Events by Severity</h3>
          <div className="h-[190px]">
            <AuditSeverityDonut counts={severityCounts} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* Main column */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b" style={{ borderColor: 'var(--c-border)' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setPage(1); }}
                className={`text-sm font-semibold px-3 py-2 whitespace-nowrap border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-500 text-[var(--c-text)]' : 'border-transparent text-[var(--c-text-2)] hover:text-[var(--c-text)]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="rounded-xl border p-3 flex flex-wrap items-center gap-2 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text-2)]" />
              <input
                value={filters.search}
                onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                placeholder="Search logs..."
                className="w-full text-sm rounded-lg border pl-8 pr-3 py-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <select value={filters.actorId} onChange={e => { setFilters(f => ({ ...f, actorId: e.target.value })); setPage(1); }} className="text-sm rounded-lg border px-2 py-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]">
              <option value="all">All Users</option>
              {distinctActors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <select value={filters.module} onChange={e => { setFilters(f => ({ ...f, module: e.target.value })); setPage(1); }} className="text-sm rounded-lg border px-2 py-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]">
              <option value="all">All Modules</option>
              {distinctModules.map(m => <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>)}
            </select>
            <select value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }} className="text-sm rounded-lg border px-2 py-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]">
              <option value="all">All Actions</option>
              {distinctActions.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
            </select>
            <select value={filters.severity} onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1); }} className="text-sm rounded-lg border px-2 py-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]">
              <option value="all">All Severity</option>
              {(Object.keys(SEVERITY_CONFIG) as Severity[]).map(s => <option key={s} value={s}>{SEVERITY_CONFIG[s].label}</option>)}
            </select>
            <input type="date" value={filters.dateFrom} onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }} className="text-sm rounded-lg border px-2 py-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]" />
            <span className="text-xs text-[var(--c-text-2)]">to</span>
            <input type="date" value={filters.dateTo} onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }} className="text-sm rounded-lg border px-2 py-1.5 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]" />
            {isDirty && (
              <button onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-red-500 border border-red-500/30 hover:bg-red-500/10">
                Reset
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border shadow-sm flex flex-col" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[var(--c-text-2)]" style={{ background: 'var(--c-surface)' }}>
                  <tr>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase cursor-pointer select-none" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                      Time {sortDir === 'desc' ? '↓' : '↑'}
                    </th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase">User</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase">Module</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase">Action</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase">Resource</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase">IP Address</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase">Device</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase">Status</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase">Severity</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
                  {pageRows.length === 0 && (
                    <tr><td colSpan={10} className="py-10 text-center text-[var(--c-text-2)]">No matching log entries.</td></tr>
                  )}
                  {pageRows.map(e => {
                    const member = state.teamMembers.find(m => m.id === e.actorId);
                    const sev = SEVERITY_CONFIG[e.severity];
                    const badge = actionBadgeStyle(e.action);
                    return (
                      <React.Fragment key={e.id}>
                        <tr className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 text-[var(--c-text-2)] whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: member?.color || '#64748B' }}>
                                {member?.initials || e.actor.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-[var(--c-text)] truncate">{e.actor}</div>
                                {member?.title && <div className="text-[10px] text-[var(--c-text-2)] truncate">{member.title}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[var(--c-text-2)]">{MODULE_LABELS[e.entity] || e.entity}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: badge.bg, color: badge.color }}>
                              {actionLabel(e.action)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[var(--c-text)] max-w-[200px] truncate" title={e.entityRef}>{e.entityRef}</td>
                          <td className="py-2.5 px-3 text-[var(--c-text-2)] font-mono text-xs">{e.metaParsed.ip || '—'}</td>
                          <td className="py-2.5 px-3 text-[var(--c-text-2)]">{e.metaParsed.device || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${e.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`} style={{ background: e.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                              {e.status === 'success' ? 'Success' : 'Failed'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button onClick={() => setExpandedId(id => id === e.id ? null : e.id)} className="text-[var(--c-text-2)] hover:text-[var(--c-text)]">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {expandedId === e.id && (
                          <tr>
                            <td colSpan={10} className="px-3 pb-3">
                              <div className="rounded-lg border p-3 text-xs font-mono whitespace-pre-wrap break-all" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text-2)' }}>
                                {JSON.stringify({ id: e.id, actorId: e.actorId, entityId: e.entityId, clientName: e.clientName, meta: e.metaParsed }, null, 2)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sorted.length > 0 && (
              <div className="flex items-center justify-between p-3 border-t text-xs text-[var(--c-text-2)]" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-center gap-2">
                  <span>Showing {(clampedPage - 1) * pageSize + 1}-{Math.min(clampedPage * pageSize, sorted.length)} of {sorted.length}</span>
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border px-2 py-1 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]">
                    {[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button disabled={clampedPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2.5 py-1 rounded border disabled:opacity-40 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]">Prev</button>
                  <span className="px-2">{clampedPage} / {totalPages}</span>
                  <button disabled={clampedPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-2.5 py-1 rounded border disabled:opacity-40 bg-[var(--c-surface)] border-[var(--c-border)] text-[var(--c-text)]">Next</button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
              <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Top Modules</h3>
              <div className="flex flex-col gap-2.5">
                {topModules.map(m => (
                  <div key={m.entity}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-[var(--c-text)] font-medium">{m.label}</span><span className="text-[var(--c-text-2)]">{m.count}</span></div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--c-surface)]"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(m.count / maxTopModule) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
              <h3 className="text-sm font-semibold text-[var(--c-text)] mb-1">Failed Login Trend</h3>
              <div className="text-xl font-bold text-red-500 mb-1">{failedLoginsTotal}</div>
              <div className="h-[70px]"><AuditActivityChart data={failedLoginTrend} color="#EF4444" showAxes={false} /></div>
            </div>
            <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
              <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Top IP Addresses</h3>
              {topIPs.length === 0 ? <p className="text-xs text-[var(--c-text-2)]">No login activity tracked yet.</p> : (
                <div className="flex flex-col gap-2.5">
                  {topIPs.map(ip => (
                    <div key={ip.ip}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-[var(--c-text)] font-mono">{ip.ip}</span><span className="text-[var(--c-text-2)]">{ip.count}</span></div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--c-surface)]"><div className="h-full rounded-full bg-purple-500" style={{ width: `${(ip.count / maxTopIp) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
              <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Top Devices</h3>
              {topDevices.length === 0 ? <p className="text-xs text-[var(--c-text-2)]">No login activity tracked yet.</p> : (
                <div className="flex flex-col gap-2.5">
                  {topDevices.map(d => (
                    <div key={d.device}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-[var(--c-text)]">{d.device}</span><span className="text-[var(--c-text-2)]">{d.count}</span></div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--c-surface)]"><div className="h-full rounded-full bg-teal-500" style={{ width: `${(d.count / (topDevices[0]?.count || 1)) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
              <h3 className="text-sm font-semibold text-[var(--c-text)] mb-2">Events by Status</h3>
              <div className="h-[140px] flex items-center gap-3">
                <div className="relative w-[45%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { key: 'success', label: 'Success', value: statusCounts.success, color: '#10B981' },
                          { key: 'failed', label: 'Failed', value: statusCounts.failed, color: '#EF4444' },
                        ].filter(d => d.value > 0)}
                        dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={2} strokeWidth={2} stroke="var(--c-surface-2)"
                        isAnimationActive={false}
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <RTooltip formatter={(v: any, n: any) => [`${v.toLocaleString()} events`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[var(--c-text-2)]"><span className="w-2 h-2 rounded-full bg-emerald-500" />Success</span><span className="font-semibold text-[var(--c-text)]">{statusCounts.success.toLocaleString()}</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[var(--c-text-2)]"><span className="w-2 h-2 rounded-full bg-red-500" />Failed</span><span className="font-semibold text-[var(--c-text)]">{statusCounts.failed.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Recent Critical Events</h3>
            {recentCritical.length === 0 ? (
              <p className="text-xs text-[var(--c-text-2)]">No critical or warning events.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentCritical.map(e => (
                  <div key={e.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: SEVERITY_CONFIG[e.severity].color }} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--c-text)] truncate">{actionLabel(e.action)}: {e.entityRef}</div>
                      <div className="text-[10px] text-[var(--c-text-2)]">{new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {e.actor}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Quick Filters</h3>
            <div className="flex flex-col gap-1.5 mb-3">
              {[
                { label: 'Today', value: quickFilterCounts.today, apply: () => setFilters(f => ({ ...f, dateFrom: todayStr, dateTo: todayStr })) },
                { label: 'Yesterday', value: quickFilterCounts.yesterday, apply: () => setFilters(f => ({ ...f, dateFrom: yesterdayStr, dateTo: yesterdayStr })) },
                { label: 'Last 7 Days', value: quickFilterCounts.last7, apply: () => setFilters(f => ({ ...f, dateFrom: '', dateTo: '' })) },
                { label: 'Last 30 Days', value: quickFilterCounts.last30, apply: () => setFilters(f => ({ ...f, dateFrom: '', dateTo: '' })) },
              ].map(q => (
                <button key={q.label} onClick={q.apply} className="flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-[var(--c-surface-3)] transition-colors">
                  <span className="text-[var(--c-text-2)]">{q.label}</span>
                  <span className="font-semibold text-[var(--c-text)]">{q.value.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div className="pt-3 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--c-border)' }}>
              {(['critical', 'warning', 'info', 'success'] as Severity[]).map(s => (
                <div key={s} className="flex items-center justify-between text-xs px-2 py-1">
                  <span className="flex items-center gap-1.5 text-[var(--c-text-2)]">
                    <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_CONFIG[s].color }} />
                    {SEVERITY_CONFIG[s].label}
                  </span>
                  <span className="font-semibold text-[var(--c-text)]">{severityCounts[s].toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3">Top Active Users</h3>
            <div className="flex flex-col gap-3">
              {topActiveUsers.map(u => {
                const member = state.teamMembers.find(m => m.id === u.actorId);
                return (
                  <div key={u.actorId || u.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-2 text-[var(--c-text)] font-medium truncate">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ background: member?.color || '#64748B' }}>
                          {member?.initials || u.name.slice(0, 2).toUpperCase()}
                        </span>
                        {u.name}
                      </span>
                      <span className="text-[var(--c-text-2)]">{u.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-[var(--c-surface)]"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(u.count / maxTopUser) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
