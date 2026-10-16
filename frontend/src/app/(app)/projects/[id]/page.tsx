'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import ProvenanceBadge from '@/components/ui/ProvenanceBadge';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const STATUSES = ['planned', 'active', 'on_hold', 'completed', 'cancelled'];
const pretty = (s: string) => s.replace(/_/g, ' ');
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
const day = (s?: string | null) => (s ? String(s).slice(0, 10) : '—');
const field = 'w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-input)] px-3 py-2 text-sm text-[var(--c-text)]';
const btn = 'rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50';
const card = 'rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4';

const EVENT_LABEL: Record<string, string> = {
  created: 'Project created', status_changed: 'Status changed', note: 'Note', meeting: 'Meeting notes', recording: 'Recording',
  task_created: 'Task created', task_status: 'Task status', task_assigned: 'Task assignment', blocker_raised: 'Blocker raised', blocker_resolved: 'Blocker resolved',
};
const eventTone = (t: string) => (t.startsWith('blocker_raised') ? 'var(--c-error)' : t === 'blocker_resolved' ? 'var(--c-success)' : t === 'status_changed' || t === 'created' ? 'var(--c-primary)' : 'var(--c-info)');

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}/api/projects${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useApp();
  const { user } = useAuth();
  const staff = !!user && ['admin', 'ops', 'super_admin'].includes(user.role);
  const [p, setP] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [update, setUpdate] = useState({ type: 'note', note: '', linkUrl: '' });
  const [attachId, setAttachId] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setP(await api(`/${id}`)); } catch (e: any) { setError(e.message); setP(null); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<unknown>) => { setError(null); try { await fn(); await load(); } catch (e: any) { setError(e.message); } };

  // Tasks of the same client that are not already on this project.
  const attachable = useMemo(() => (p ? state.tasks.filter(t => t.clientId === p.client_id && !p.tasks.some((x: any) => x.id === t.id)) : []), [state.tasks, p]);

  if (loading) return <p className="text-sm text-[var(--c-text-2)]">Loading project…</p>;
  if (!p) return (
    <div className="mx-auto max-w-[1100px] space-y-3">
      <Link href="/projects" className="text-sm text-[var(--c-primary)]">← Projects</Link>
      <div role="alert" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--c-error)', color: 'var(--c-error)' }}>{error || 'Project not found'}</div>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <Link href="/projects" className="text-sm text-[var(--c-primary)]">← Projects</Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--c-text)]">{p.name}</h1>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">{p.client_name}{p.lead_name ? ` · Lead: ${p.lead_name}` : ''}</p>
          {p.description && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-[var(--c-text-2)]">{p.description}</p>}
          {p.repo_url && <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-[var(--c-primary)]">Repository ↗</a>}
        </div>
        {staff ? (
          <label className="text-xs text-[var(--c-text-2)]">Status
            <select className={`${field} !w-auto`} value={p.status} onChange={e => run(() => api(`/${id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) }))}>
              {STATUSES.map(s => <option key={s} value={s}>{pretty(s)}</option>)}
            </select>
          </label>
        ) : <span className="rounded-full border border-[var(--c-border-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--c-text-2)]">{pretty(p.status)}</span>}
      </header>

      {error && <div role="alert" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--c-error)', color: 'var(--c-error)' }}>{error}</div>}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Started', day(p.start_date ?? p.created_at)], ['Target', day(p.target_date)], [p.completed_at ? 'Took' : 'Elapsed', `${p.elapsed_days} days`], ['Logged time', hours(p.minutes_logged)]].map(([k, v]) => (
          <div key={k} className={card}><dt className="text-xs text-[var(--c-text-2)]">{k}</dt><dd className="mt-1 text-lg font-semibold text-[var(--c-text)]">{v}</dd></div>
        ))}
      </dl>

      <section aria-label="Team" className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Who worked on this project</h2>
          <ProvenanceBadge kind="DERIVED" note={p.provenance.team + '. ' + p.provenance.hours} />
        </div>
        {p.team.length === 0 ? <p className="text-sm text-[var(--c-text-2)]">Nobody yet. People appear here once they are assigned a task on this project or log time on one.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-[var(--c-text-2)]"><tr><th className="py-1 pr-3 font-medium">Person</th><th className="py-1 pr-3 font-medium">Tasks done</th><th className="py-1 font-medium">Time logged</th></tr></thead>
              <tbody>
                {p.team.map((m: any) => (
                  <tr key={m.id} className="border-t border-[var(--c-border)]">
                    <td className="py-2 pr-3"><span className="font-medium text-[var(--c-text)]">{m.name}</span>{m.is_lead && <span className="ml-2 rounded-full border border-[var(--c-border-strong)] px-1.5 text-[10px] uppercase text-[var(--c-text-2)]">lead</span>}
                      <span className="block text-xs text-[var(--c-text-2)]">{m.title || pretty(m.department || '')}</span></td>
                    <td className="py-2 pr-3 text-[var(--c-text)]">{m.tasks_done}/{m.tasks_assigned}</td>
                    <td className="py-2 text-[var(--c-text)]">{hours(m.minutes_logged)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Tasks" className={card}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--c-text)]">Tasks</h2>
        {p.tasks.length === 0 ? <p className="text-sm text-[var(--c-text-2)]">No tasks linked to this project.</p> : (
          <ul className="divide-y divide-[var(--c-border)]">
            {p.tasks.map((t: any) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0"><p className="truncate text-sm text-[var(--c-text)]">{t.title}</p><p className="text-xs text-[var(--c-text-2)]">{t.assignee_names || 'Unassigned'} · {hours(t.minutes_logged)}</p></div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[var(--c-border-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--c-text-2)]">{pretty(t.status)}</span>
                  {staff && <button className={`${btn} border border-[var(--c-border)] text-[var(--c-text-2)]`} onClick={() => run(() => api(`/${id}/tasks/${t.id}`, { method: 'DELETE' }))}>Remove</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {staff && (
          <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (attachId) run(async () => { await api(`/${id}/tasks`, { method: 'POST', body: JSON.stringify({ taskId: attachId }) }); setAttachId(''); }); }}>
            <label className="min-w-[200px] flex-1 text-xs text-[var(--c-text-2)]">Add an existing task of this client
              <select className={field} value={attachId} onChange={e => setAttachId(e.target.value)}><option value="">Select task…</option>{attachable.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
            <button type="submit" disabled={!attachId} className={`${btn} bg-[var(--c-primary)] text-white`}>Add task</button>
          </form>
        )}
      </section>

      <section aria-label="Timeline" className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Project timeline</h2>
          <ProvenanceBadge kind="DATABASE" note={p.provenance.timeline} />
        </div>
        <form className="mb-4 grid gap-2 md:grid-cols-[140px_1fr_1fr_auto] md:items-end" onSubmit={e => { e.preventDefault(); run(async () => { await api(`/${id}/events`, { method: 'POST', body: JSON.stringify({ type: update.type, note: update.note, linkUrl: update.linkUrl }) }); setUpdate({ ...update, note: '', linkUrl: '' }); }); }}>
          <label className="text-xs text-[var(--c-text-2)]">Add<select className={field} value={update.type} onChange={e => setUpdate({ ...update, type: e.target.value })}><option value="note">Note</option><option value="meeting">Meeting notes</option><option value="recording">Recording link</option></select></label>
          <label className="text-xs text-[var(--c-text-2)]">Note<input maxLength={2000} className={field} value={update.note} onChange={e => setUpdate({ ...update, note: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)]">Link (optional)<input type="url" placeholder="https://" className={field} value={update.linkUrl} onChange={e => setUpdate({ ...update, linkUrl: e.target.value })} /></label>
          <button type="submit" disabled={!update.note.trim() && !update.linkUrl.trim()} className={`${btn} bg-[var(--c-primary)] text-white`}>Add</button>
        </form>
        <ol className="space-y-3">
          {p.timeline.map((e: any, i: number) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: eventTone(e.type) }} aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-[var(--c-text-2)]"><span className="font-semibold uppercase tracking-wide" style={{ color: eventTone(e.type) }}>{EVENT_LABEL[e.type] || e.type}</span> · {new Date(e.at).toLocaleString()}{e.actor ? ` · ${e.actor}` : ''}</p>
                {e.text && <p className="break-words text-sm text-[var(--c-text)]">{e.text}</p>}
                {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--c-primary)]">Open link ↗</a>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
