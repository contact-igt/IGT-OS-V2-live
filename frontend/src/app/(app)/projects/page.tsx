'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import ProvenanceBadge from '@/components/ui/ProvenanceBadge';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const STATUSES = ['planned', 'active', 'on_hold', 'completed', 'cancelled'];
const pretty = (s: string) => s.replace(/_/g, ' ');
const statusTone = (s: string) => (s === 'active' ? 'var(--c-success)' : s === 'on_hold' ? 'var(--c-warning)' : s === 'cancelled' ? 'var(--c-error)' : 'var(--c-info)');
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
const field = 'w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-input)] px-3 py-2 text-sm text-[var(--c-text)]';
const btn = 'rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50';

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}/api/projects${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export default function ProjectsPage() {
  const { state } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const staff = !!user && ['admin', 'ops', 'super_admin'].includes(user.role);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ clientId: '', name: '', description: '', status: 'active', startDate: '', targetDate: '', leadId: '', repoUrl: '' });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(await api('')); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Projects</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--c-text-2)]">Client projects with their timeline and the people who worked on them. {staff ? 'You see every project.' : 'You see projects you lead or have a task on.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <ProvenanceBadge kind="DATABASE" note="Projects entered by the team; hours come from task timers" />
          {staff && <button className={`${btn} bg-[var(--c-primary)] text-white`} onClick={() => setAdding(a => !a)}>{adding ? 'Close' : '+ Add project'}</button>}
        </div>
      </header>

      {adding && staff && (
        <form className="grid gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 md:grid-cols-2" onSubmit={async e => {
          e.preventDefault(); setError(null);
          try {
            const p = await api('', { method: 'POST', body: JSON.stringify({ ...form, leadId: form.leadId || undefined }) });
            router.push(`/projects/${p.id}`);
          } catch (err: any) { setError(err.message); }
        }}>
          <label className="text-xs text-[var(--c-text-2)]">Client
            <select required className={field} value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}><option value="">Select client…</option>{state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Project name<input required maxLength={200} className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)] md:col-span-2">Details<textarea rows={3} className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)]">Status<select className={field} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{pretty(s)}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Project lead
            <select className={field} value={form.leadId} onChange={e => setForm({ ...form, leadId: e.target.value })}><option value="">None yet</option>{state.teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Start date<input type="date" className={field} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)]">Target date<input type="date" className={field} value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)] md:col-span-2">Repository link (optional)<input type="url" className={field} placeholder="https://" value={form.repoUrl} onChange={e => setForm({ ...form, repoUrl: e.target.value })} /></label>
          <div className="md:col-span-2"><button type="submit" className={`${btn} bg-[var(--c-primary)] text-white`}>Create project</button></div>
        </form>
      )}

      {error && <div role="alert" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--c-error)', color: 'var(--c-error)' }}>{error}</div>}
      {loading ? <p className="text-sm text-[var(--c-text-2)]">Loading projects…</p> : rows.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-[var(--c-border)] p-6 text-sm text-[var(--c-text-2)]">No projects yet.{staff ? ' Use “Add project” to create the first one.' : ''}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map(p => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="block rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 hover:border-[var(--c-border-strong)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--c-text)]">{p.name}</p><p className="truncate text-xs text-[var(--c-text-2)]">{p.client_name}</p></div>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: statusTone(p.status), borderColor: statusTone(p.status) }}>{pretty(p.status)}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--c-text-2)]">
                  <div><dt>Tasks</dt><dd className="text-sm font-semibold text-[var(--c-text)]">{p.tasks_done}/{p.tasks_total}</dd></div>
                  <div><dt>Logged</dt><dd className="text-sm font-semibold text-[var(--c-text)]">{hours(p.minutes_logged)}</dd></div>
                  <div><dt>Target</dt><dd className="text-sm font-semibold text-[var(--c-text)]">{p.target_date ? String(p.target_date).slice(0, 10) : '—'}</dd></div>
                </dl>
                {p.lead_name && <p className="mt-2 text-xs text-[var(--c-text-2)]">Lead: {p.lead_name}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
