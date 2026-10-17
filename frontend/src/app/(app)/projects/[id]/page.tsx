'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import ProvenanceBadge from '@/components/ui/ProvenanceBadge';
import NewTaskModal from '@/components/tasks/NewTaskModal';
import { invalidateProjects } from '@/lib/useProjects';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const STATUSES = ['planned', 'active', 'on_hold', 'completed', 'cancelled'];
const pretty = (s: string) => s.replace(/_/g, ' ');
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
const day = (s?: string | null) => (s ? String(s).slice(0, 10) : '—');
const field = 'w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-input)] px-3 py-2 text-sm text-[var(--c-text)]';
const btn = 'rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50';
const card = 'rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4';
const chip = 'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap';

const EVENT_LABEL: Record<string, string> = {
  created: 'Project created', status_changed: 'Status changed', note: 'Note', recording: 'Recording',
  dev_started: 'Developer started', meeting: 'Meeting', change_requested: 'Change requested', change_decided: 'Change decided',
  task_created: 'Task created', task_status: 'Task status', task_assigned: 'Task assignment', blocker_raised: 'Blocker raised', blocker_resolved: 'Blocker resolved',
};
const eventTone = (t: string) =>
  t === 'blocker_raised' ? 'var(--c-error)' : t === 'blocker_resolved' ? 'var(--c-success)'
  : t === 'change_requested' ? 'var(--c-warning)' : t === 'change_decided' ? 'var(--c-warning)'
  : t === 'meeting' || t === 'dev_started' ? 'var(--c-success)'
  : t === 'status_changed' || t === 'created' ? 'var(--c-primary)' : 'var(--c-info)';
const decisionTone = (d: string) => (d === 'accepted' ? 'var(--c-success)' : d === 'pending' ? 'var(--c-info)' : 'var(--c-text-2)');

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
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
  const [timeline, setTimeline] = useState<any[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [update, setUpdate] = useState({ type: 'note', note: '', linkUrl: '' });
  const [attachId, setAttachId] = useState('');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [linkMeetingId, setLinkMeetingId] = useState('');
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api(`/projects/${id}`);
      setP(d); setTimeline(d.timeline); setNext(d.timeline_next);
    } catch (e: any) { setError(e.message); setP(null); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // The signed-in user's own analysed meetings (staff: all) that are not on a project yet: candidates to link.
  useEffect(() => { api('/meetings').then(setMeetings).catch(() => setMeetings([])); }, [p?.meetings?.length]);

  const run = async (fn: () => Promise<unknown>) => { setError(null); try { await fn(); invalidateProjects(); await load(); } catch (e: any) { setError(e.message); } };

  const loadOlder = async () => {
    if (!next) return;
    try {
      const d = await api(`/projects/${id}?before=${encodeURIComponent(next)}`);
      setTimeline(t => [...t, ...d.timeline]); setNext(d.timeline_next);
    } catch (e: any) { setError(e.message); }
  };

  // Tasks of the same client that are not already on this project.
  const attachable = useMemo(() => (p ? state.tasks.filter(t => t.clientId === p.client_id && !p.tasks.some((x: any) => x.id === t.id)) : []), [state.tasks, p]);
  const linkable = useMemo(() => (p ? meetings.filter((m: any) => m.clientId === p.client_id && !m.projectId) : []), [meetings, p]);

  if (loading) return <p className="text-sm text-[var(--c-text-2)]">Loading project…</p>;
  if (!p) return (
    <div className="mx-auto max-w-[1100px] space-y-3">
      <Link href="/projects" className="text-sm text-[var(--c-primary)]">← Projects</Link>
      <div role="alert" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--c-error)', color: 'var(--c-error)' }}>{error || 'Project not found'}</div>
    </div>
  );

  const s = p.summary;
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
            <select className={`${field} !w-auto`} value={p.status} onChange={e => run(() => api(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) }))}>
              {STATUSES.map(st => <option key={st} value={st}>{pretty(st)}</option>)}
            </select>
          </label>
        ) : <span className={`${chip} border-[var(--c-border-strong)] text-[var(--c-text-2)]`}>{pretty(p.status)}</span>}
      </header>

      {error && <div role="alert" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--c-error)', color: 'var(--c-error)' }}>{error}</div>}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Started', day(p.start_date ?? p.created_at)], ['Target', day(p.target_date)],
          [p.completed_at ? 'Took' : 'Elapsed', `${p.elapsed_days} days`], ['Logged time', hours(p.minutes_logged)],
          ['Meetings held', String(s.meetings_held)], ['Open changes', String(s.open_changes)],
          ['Developers started', String(s.developers_started)], ['Rework rounds', String(s.rework_rounds)],
        ].map(([k, v]) => (
          <div key={k} className={card}><dt className="text-xs text-[var(--c-text-2)]">{k}</dt><dd className="mt-1 text-lg font-semibold text-[var(--c-text)]">{v}</dd></div>
        ))}
      </dl>

      <section aria-label="Team" className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Who worked on this project</h2>
          <ProvenanceBadge kind="DERIVED" note={`${p.provenance.team}. ${p.provenance.hours}. Started: ${p.provenance.started}`} />
        </div>
        {p.team.length === 0 ? <p className="text-sm text-[var(--c-text-2)]">Nobody yet. People appear here once they are assigned a task on this project or log time on one.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-[var(--c-text-2)]"><tr><th className="py-1 pr-3 font-medium">Person</th><th className="py-1 pr-3 font-medium">Started</th><th className="py-1 pr-3 font-medium">Tasks done</th><th className="py-1 font-medium">Time logged</th></tr></thead>
              <tbody>
                {p.team.map((m: any) => (
                  <tr key={m.id} className="border-t border-[var(--c-border)]">
                    <td className="py-2 pr-3"><span className="font-medium text-[var(--c-text)]">{m.name}</span>{m.is_lead && <span className="ml-2 rounded-full border border-[var(--c-border-strong)] px-1.5 text-[10px] uppercase text-[var(--c-text-2)]">lead</span>}
                      <span className="block text-xs text-[var(--c-text-2)]">{m.title || pretty(m.department || '')}</span></td>
                    <td className="py-2 pr-3 text-[var(--c-text)]">{m.started_at ? day(m.started_at) : 'Not yet'}</td>
                    <td className="py-2 pr-3 text-[var(--c-text)]">{m.tasks_done}/{m.tasks_assigned}</td>
                    <td className="py-2 text-[var(--c-text)]">{hours(m.minutes_logged)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Meetings" className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Meetings and reviews</h2>
          <ProvenanceBadge kind="DATABASE" note="AI meeting notes linked to this project. Only the summary and decisions are shown here, never the transcript." />
        </div>
        {p.meetings.length === 0 ? <p className="text-sm text-[var(--c-text-2)]">No meetings linked yet. Analyse a meeting in Meeting Summaries and link it to this project.</p> : (
          <ul className="space-y-3">
            {p.meetings.map((m: any) => (
              <li key={m.id} className="rounded-lg border border-[var(--c-border)] p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--c-text)]">{m.title}</p>
                  <p className="text-xs text-[var(--c-text-2)]">{new Date(m.created_at).toLocaleDateString()}{m.created_by_name ? ` · ${m.created_by_name}` : ''}</p>
                </div>
                {m.summary && <p className="mt-1 whitespace-pre-line text-sm text-[var(--c-text-2)]">{m.summary}</p>}
                {m.decisions.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-[var(--c-text)]">{m.decisions.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul>
                )}
                <p className="mt-2 text-xs text-[var(--c-text-2)]">
                  {m.tasks_created} task{m.tasks_created === 1 ? '' : 's'} created · {m.changes_raised} change{m.changes_raised === 1 ? '' : 's'} raised
                  {m.can_open && <> · <Link href={`/meetings/${m.id}`} className="text-[var(--c-primary)]">Open meeting</Link></>}
                </p>
              </li>
            ))}
          </ul>
        )}
        {linkable.length > 0 && (
          <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (linkMeetingId) run(async () => { await api(`/meetings/${linkMeetingId}/project`, { method: 'PATCH', body: JSON.stringify({ projectId: id }) }); setLinkMeetingId(''); }); }}>
            <label className="min-w-[200px] flex-1 text-xs text-[var(--c-text-2)]">Link one of your analysed meetings for this client
              <select aria-label="Meeting to link" className={field} value={linkMeetingId} onChange={e => setLinkMeetingId(e.target.value)}><option value="">Select meeting…</option>{linkable.map((m: any) => <option key={m.id} value={m.id}>{m.title || m.result?.meetingMeta?.title || 'Meeting'} · {new Date(m.createdAt).toLocaleDateString()}</option>)}</select></label>
            <button type="submit" disabled={!linkMeetingId} className={`${btn} bg-[var(--c-primary)] text-white`}>Link meeting</button>
          </form>
        )}
      </section>

      <section aria-label="Changes needed" className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Changes needed</h2>
          <ProvenanceBadge kind="DATABASE" note="Delivery change requests that belong to this project" />
        </div>
        {p.changes.length === 0 ? <p className="text-sm text-[var(--c-text-2)]">No change requests yet. Raise one from a linked meeting’s decisions or action items{staff ? ', or in Delivery' : ''}.</p> : (
          <ul className="divide-y divide-[var(--c-border)]">
            {p.changes.map((c: any) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--c-text)]">{c.title}</p>
                  <p className="text-xs text-[var(--c-text-2)]">{pretty(c.classification)} · {c.priority}{c.meeting_title ? ` · from “${c.meeting_title}”` : ''} · {day(c.created_at)}</p>
                </div>
                <span className={chip} style={{ color: decisionTone(c.decision), borderColor: decisionTone(c.decision) }}>{c.decision}{c.roadmap_bucket !== 'none' ? ` · ${c.roadmap_bucket}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
        {staff && <Link href="/delivery" className="mt-2 inline-block text-xs text-[var(--c-primary)]">Open Delivery ↗</Link>}
      </section>

      <section aria-label="Tasks" className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Tasks</h2>
          <button className={`${btn} bg-[var(--c-primary)] text-white`} onClick={() => setNewTaskOpen(true)}>+ New task</button>
        </div>
        {p.tasks.length === 0 ? <p className="text-sm text-[var(--c-text-2)]">No tasks linked to this project.</p> : (
          <ul className="divide-y divide-[var(--c-border)]">
            {p.tasks.map((t: any) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0"><p className="truncate text-sm text-[var(--c-text)]">{t.title}</p><p className="text-xs text-[var(--c-text-2)]">{t.assignee_names || 'Unassigned'} · {hours(t.minutes_logged)}{t.rework_count > 0 ? ` · rework ×${t.rework_count}` : ''}</p></div>
                <div className="flex items-center gap-2">
                  <span className={`${chip} border-[var(--c-border-strong)] text-[var(--c-text-2)]`}>{pretty(t.status)}</span>
                  {staff && <button className={`${btn} border border-[var(--c-border)] text-[var(--c-text-2)]`} onClick={() => run(() => api(`/projects/${id}/tasks/${t.id}`, { method: 'DELETE' }))}>Remove</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {staff && (
          <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (attachId) run(async () => { await api(`/projects/${id}/tasks`, { method: 'POST', body: JSON.stringify({ taskId: attachId }) }); setAttachId(''); }); }}>
            <label className="min-w-[200px] flex-1 text-xs text-[var(--c-text-2)]">Add an existing task of this client
              <select className={field} value={attachId} onChange={e => setAttachId(e.target.value)}><option value="">Select task…</option>{attachable.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
            <button type="submit" disabled={!attachId} className={`${btn} border border-[var(--c-border)] text-[var(--c-text)]`}>Add task</button>
          </form>
        )}
        <p className="mt-2 text-xs text-[var(--c-text-2)]">Tasks you create here also appear on the <Link href="/tasks" className="text-[var(--c-primary)]">Tasks page</Link>, where the timer and status changes happen.</p>
      </section>

      <NewTaskModal
        isOpen={newTaskOpen}
        onClose={() => { setNewTaskOpen(false); setTimeout(load, 1500); setTimeout(load, 4500); }}
        defaultClientId={p.client_id}
        defaultProjectId={p.id}
      />

      <section aria-label="Timeline" className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Project timeline</h2>
          <ProvenanceBadge kind="DATABASE" note={p.provenance.timeline} />
        </div>
        <form className="mb-4 grid gap-2 md:grid-cols-[140px_1fr_1fr_auto] md:items-end" onSubmit={e => { e.preventDefault(); run(async () => { await api(`/projects/${id}/events`, { method: 'POST', body: JSON.stringify({ type: update.type, note: update.note, linkUrl: update.linkUrl }) }); setUpdate({ ...update, note: '', linkUrl: '' }); }); }}>
          <label className="text-xs text-[var(--c-text-2)]">Add<select className={field} value={update.type} onChange={e => setUpdate({ ...update, type: e.target.value })}><option value="note">Note</option><option value="recording">Recording link</option></select></label>
          <label className="text-xs text-[var(--c-text-2)]">Note<input maxLength={2000} className={field} value={update.note} onChange={e => setUpdate({ ...update, note: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)]">Link (optional)<input type="url" placeholder="https://" className={field} value={update.linkUrl} onChange={e => setUpdate({ ...update, linkUrl: e.target.value })} /></label>
          <button type="submit" disabled={!update.note.trim() && !update.linkUrl.trim()} className={`${btn} bg-[var(--c-primary)] text-white`}>Add</button>
        </form>
        <ol className="space-y-3">
          {timeline.map((e: any, i: number) => (
            <li key={`${e.at}-${i}`} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: eventTone(e.type) }} aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-[var(--c-text-2)]"><span className="font-semibold uppercase tracking-wide" style={{ color: eventTone(e.type) }}>{EVENT_LABEL[e.type] || e.type}</span> · {new Date(e.at).toLocaleString()}{e.actor ? ` · ${e.actor}` : ''}</p>
                {e.text && <p className="break-words text-sm text-[var(--c-text)]">{e.text}</p>}
                {e.link && (e.link.startsWith('/')
                  ? <Link href={e.link} className="text-xs text-[var(--c-primary)]">Open ↗</Link>
                  : <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--c-primary)]">Open link ↗</a>)}
              </div>
            </li>
          ))}
        </ol>
        {next && <button className={`${btn} mt-4 border border-[var(--c-border)] text-[var(--c-text-2)]`} onClick={loadOlder}>Load older entries</button>}
      </section>
    </div>
  );
}
