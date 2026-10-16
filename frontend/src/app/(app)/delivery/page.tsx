'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import ProvenanceBadge from '@/components/ui/ProvenanceBadge';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CLASSES = ['bug', 'content_change', 'design_change', 'new_feature', 'integration_change', 'scope_change', 'production_issue'];
const SOURCES = ['whatsapp', 'email', 'call', 'meeting', 'portal', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const PARTIES = ['client', 'internal', 'vendor', 'platform', 'other'];
const pretty = (s: string) => s.replace(/_/g, ' ');
const tone = (sev: string) => (sev === 'critical' ? 'var(--c-error)' : sev === 'high' ? 'var(--c-warning)' : 'var(--c-info)');

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}/api/delivery${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: color || 'var(--c-text-2)', borderColor: color || 'var(--c-border-strong)' }}>{children}</span>;
}
const field = 'w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-input)] px-3 py-2 text-sm text-[var(--c-text)]';
const btn = 'rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50';

function ChangeRequests({ canDecide, isLeadership }: { canDecide: boolean; isLeadership: boolean }) {
  const { state } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ clientId: '', title: '', description: '', classification: 'content_change', source: 'whatsapp', requestedBy: '', priority: 'medium' });
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(await api(`/change-requests${filter === 'all' ? '' : `?decision=${filter}`}`)); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setMsg(m => ({ ...m, [id]: '' }));
    try { await fn(); await load(); } catch (e: any) { setMsg(m => ({ ...m, [id]: e.message })); }
  };

  return (
    <section aria-label="Change requests" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">Show
          <select className={`${field} !w-auto`} value={filter} onChange={e => setFilter(e.target.value)}>
            {['pending', 'accepted', 'deferred', 'rejected', 'all'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <button className={`${btn} bg-[var(--c-primary)] text-white`} onClick={() => setAdding(a => !a)}>{adding ? 'Close' : '+ Capture client request'}</button>
      </div>

      {adding && (
        <form className="grid gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 md:grid-cols-2" onSubmit={async e => {
          e.preventDefault(); setError(null);
          try { await api('/change-requests', { method: 'POST', body: JSON.stringify(form) }); setAdding(false); setForm(f => ({ ...f, title: '', description: '', requestedBy: '' })); setFilter('pending'); await load(); } catch (err: any) { setError(err.message); }
        }}>
          <label className="text-xs text-[var(--c-text-2)]">Client
            <select required className={field} value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}><option value="">Select client…</option>{state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Title<input required maxLength={200} className={field} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)] md:col-span-2">What did the client ask for?<textarea required rows={3} className={field} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)]">Type<select className={field} value={form.classification} onChange={e => setForm({ ...form, classification: e.target.value })}>{CLASSES.map(c => <option key={c} value={c}>{pretty(c)}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Received via<select className={field} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>{SOURCES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Requested by (client contact)<input className={field} value={form.requestedBy} onChange={e => setForm({ ...form, requestedBy: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)]">Priority<select className={field} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{SEVERITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <div className="md:col-span-2"><button type="submit" className={`${btn} bg-[var(--c-primary)] text-white`}>Capture</button></div>
        </form>
      )}

      {loading && <p className="text-sm text-[var(--c-text-2)]">Loading…</p>}
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--c-error)' }}>{error}</p>}
      {!loading && !error && rows.length === 0 && <p className="rounded-lg border border-dashed border-[var(--c-border)] p-4 text-sm text-[var(--c-text-2)]">No {filter === 'all' ? '' : filter} change requests.</p>}

      <ul className="flex flex-col gap-3">
        {rows.map(cr => (
          <li key={cr.id} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]">
            <button className="flex w-full flex-wrap items-center gap-2 p-4 text-left" aria-expanded={open === cr.id} onClick={() => setOpen(open === cr.id ? null : cr.id)}>
              <span className="min-w-0 basis-full sm:basis-0 sm:flex-1 text-sm font-semibold text-[var(--c-text)]">{cr.title}<span className="block text-xs font-normal text-[var(--c-text-3)]">{cr.client_name} · {String(cr.received_at).slice(0, 10)}{cr.requested_by ? ` · ${cr.requested_by}` : ''}</span></span>
              <Chip>{pretty(cr.classification)}</Chip><Chip color={tone(cr.priority)}>{cr.priority}</Chip>
              {cr.is_material && <Chip color="var(--c-warning)">material</Chip>}
              <Chip color={cr.decision === 'accepted' ? 'var(--c-success)' : cr.decision === 'pending' ? 'var(--c-info)' : 'var(--c-text-2)'}>{cr.decision}{cr.roadmap_bucket !== 'none' ? ` · ${cr.roadmap_bucket}` : ''}</Chip>
            </button>
            {open === cr.id && (
              <div className="flex flex-col gap-3 border-t border-[var(--c-border)] p-4 text-sm">
                <p className="whitespace-pre-wrap text-[var(--c-text-2)]">{cr.description}</p>
                <div className="grid gap-1 text-xs text-[var(--c-text-2)] md:grid-cols-3">
                  <span>Scope impact: {cr.scope_impact || '—'}</span>
                  <span>Timeline impact: {cr.timeline_impact_days != null ? `${cr.timeline_impact_days} days` : '—'}</span>
                  <span>Commercial impact: {cr.commercial_impact_inr != null ? `₹${cr.commercial_impact_inr.toLocaleString('en-IN')}` : '—'}</span>
                  <span>Technical risk: {cr.technical_risk || '—'}</span><span>Recommended: {cr.recommended_decision || '—'}</span>
                  {cr.decision !== 'pending' && <span>Decided by {cr.decided_by_name || '—'}{cr.decision_note ? `: ${cr.decision_note}` : ''}</span>}
                </div>
                {canDecide && cr.decision === 'pending' && <Decision cr={cr} isLeadership={isLeadership} run={run} />}
                {msg[cr.id] && <p role="alert" className="text-xs" style={{ color: 'var(--c-error)' }}>{msg[cr.id]}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Decision({ cr, isLeadership, run }: { cr: any; isLeadership: boolean; run: (id: string, fn: () => Promise<unknown>) => void }) {
  const [a, setA] = useState({ scopeImpact: cr.scope_impact || '', timelineImpactDays: cr.timeline_impact_days ?? '', commercialImpactInr: cr.commercial_impact_inr ?? '', technicalRisk: cr.technical_risk || '', recommendedDecision: cr.recommended_decision || '' });
  const [note, setNote] = useState(''); const [bucket, setBucket] = useState('next');
  const decide = (decision: string) => run(cr.id, () => api(`/change-requests/${cr.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, note, roadmapBucket: bucket }) }));
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-[var(--c-surface-2)] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-3)]">Impact analysis</p>
      <div className="grid gap-2 md:grid-cols-4">
        <label className="text-xs text-[var(--c-text-2)] md:col-span-4">Scope impact<textarea rows={2} className={field} value={a.scopeImpact} onChange={e => setA({ ...a, scopeImpact: e.target.value })} /></label>
        <label className="text-xs text-[var(--c-text-2)]">Timeline (days)<input type="number" min={0} className={field} value={a.timelineImpactDays} onChange={e => setA({ ...a, timelineImpactDays: e.target.value })} /></label>
        <label className="text-xs text-[var(--c-text-2)]">Commercial (₹)<input type="number" min={0} className={field} value={a.commercialImpactInr} onChange={e => setA({ ...a, commercialImpactInr: e.target.value })} /></label>
        <label className="text-xs text-[var(--c-text-2)]">Technical risk<select className={field} value={a.technicalRisk} onChange={e => setA({ ...a, technicalRisk: e.target.value })}><option value="">—</option>{['low', 'medium', 'high'].map(r => <option key={r}>{r}</option>)}</select></label>
        <label className="text-xs text-[var(--c-text-2)]">Recommend<select className={field} value={a.recommendedDecision} onChange={e => setA({ ...a, recommendedDecision: e.target.value })}><option value="">—</option>{['accept', 'defer', 'reject'].map(r => <option key={r}>{r}</option>)}</select></label>
      </div>
      <div><button className={`${btn} border border-[var(--c-border-strong)] text-[var(--c-text)]`} onClick={() => run(cr.id, () => api(`/change-requests/${cr.id}`, { method: 'PATCH', body: JSON.stringify({ ...a, timelineImpactDays: a.timelineImpactDays === '' ? undefined : Number(a.timelineImpactDays), commercialImpactInr: a.commercialImpactInr === '' ? undefined : Number(a.commercialImpactInr), technicalRisk: a.technicalRisk || undefined, recommendedDecision: a.recommendedDecision || undefined, scopeImpact: a.scopeImpact || undefined }) }))}>Save analysis</button></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[200px] flex-1 text-xs text-[var(--c-text-2)]">Decision note (required to reject/defer)<input className={field} value={note} onChange={e => setNote(e.target.value)} /></label>
        <label className="text-xs text-[var(--c-text-2)]">If accepted, roadmap<select className={field} value={bucket} onChange={e => setBucket(e.target.value)}>{['now', 'next', 'later', 'none'].map(b => <option key={b}>{b}</option>)}</select></label>
        <button className={`${btn} bg-[var(--c-primary)] text-white`} onClick={() => decide('accepted')} title={cr.is_material && !isLeadership ? 'Material changes need leadership acceptance' : undefined}>Accept</button>
        <button className={`${btn} border border-[var(--c-border-strong)] text-[var(--c-text)]`} onClick={() => decide('deferred')}>Defer</button>
        <button className={`${btn} border text-[var(--c-error)]`} style={{ borderColor: 'var(--c-error)' }} onClick={() => decide('rejected')}>Reject</button>
      </div>
      {cr.is_material && !isLeadership && <p className="text-xs text-[var(--c-text-2)]">This is a material change: complete the analysis and leave the decision to leadership.</p>}
    </div>
  );
}

function Blockers() {
  const { state } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ taskId: '', title: '', reason: '', blockingParty: 'client', severity: 'medium', expectedResolution: '', nextAction: '', escalationOwnerId: '' });
  const openTasks = useMemo(() => state.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled'), [state.tasks]);
  const staff = useMemo(() => state.teamMembers.filter(m => ['admin', 'ops', 'super_admin'].includes(m.role)), [state.teamMembers]);

  const load = useCallback(async () => { setLoading(true); setError(null); try { setRows(await api(`/blockers?status=${status}`)); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }, [status]);
  useEffect(() => { load(); }, [load]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section aria-label="Blockers" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Blocker status" className="flex rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-1">
          {(['open', 'resolved'] as const).map(s => <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${status === s ? 'bg-[var(--c-primary)] text-white' : 'text-[var(--c-text-2)]'}`}>{s}</button>)}
        </div>
        <button className={`${btn} bg-[var(--c-primary)] text-white`} onClick={() => setAdding(a => !a)}>{adding ? 'Close' : '+ Raise blocker'}</button>
      </div>
      {adding && (
        <form className="grid gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 md:grid-cols-2" onSubmit={async e => {
          e.preventDefault(); setError(null);
          try { await api('/blockers', { method: 'POST', body: JSON.stringify({ ...form, taskId: form.taskId || undefined, escalationOwnerId: form.escalationOwnerId || undefined, expectedResolution: form.expectedResolution || undefined }) }); setAdding(false); setForm(f => ({ ...f, title: '', reason: '', nextAction: '' })); setStatus('open'); await load(); } catch (err: any) { setError(err.message); }
        }}>
          <label className="text-xs text-[var(--c-text-2)]">Blocked task<select className={field} value={form.taskId} onChange={e => setForm({ ...form, taskId: e.target.value })}><option value="">(none)</option>{openTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Title<input required className={field} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)] md:col-span-2">Reason<textarea required rows={2} className={field} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)]">Waiting on<select className={field} value={form.blockingParty} onChange={e => setForm({ ...form, blockingParty: e.target.value })}>{PARTIES.map(p => <option key={p}>{p}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Severity<select className={field} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>{SEVERITIES.map(p => <option key={p}>{p}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)]">Expected resolution<input type="date" className={field} value={form.expectedResolution} onChange={e => setForm({ ...form, expectedResolution: e.target.value })} /></label>
          <label className="text-xs text-[var(--c-text-2)]">Escalation owner<select className={field} value={form.escalationOwnerId} onChange={e => setForm({ ...form, escalationOwnerId: e.target.value })}><option value="">(none)</option>{staff.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label className="text-xs text-[var(--c-text-2)] md:col-span-2">Next action<input className={field} value={form.nextAction} onChange={e => setForm({ ...form, nextAction: e.target.value })} /></label>
          <div className="md:col-span-2"><button type="submit" className={`${btn} bg-[var(--c-primary)] text-white`}>Raise blocker</button></div>
        </form>
      )}
      {loading && <p className="text-sm text-[var(--c-text-2)]">Loading…</p>}
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--c-error)' }}>{error}</p>}
      {!loading && !error && rows.length === 0 && <p className="rounded-lg border border-dashed border-[var(--c-border)] p-4 text-sm text-[var(--c-text-2)]">No {status} blockers.</p>}
      <ul className="flex flex-col gap-3">
        {rows.map(b => {
          const due = b.expected_resolution ? String(b.expected_resolution).slice(0, 10) : null; const late = due && due < today && b.status === 'open';
          return (
            <li key={b.id} className="flex flex-wrap items-start gap-3 rounded-xl border bg-[var(--c-surface)] p-4" style={{ borderColor: late ? 'var(--c-error)' : 'var(--c-border)' }}>
              <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <p className="text-sm font-semibold text-[var(--c-text)]">{b.title}</p>
                <p className="mt-0.5 text-xs text-[var(--c-text-2)]">{b.reason}</p>
                <p className="mt-1 text-xs text-[var(--c-text-3)]">Waiting on {b.blocking_party} · owner {b.owner_name || '—'}{b.escalation_owner_name ? ` · escalate to ${b.escalation_owner_name}` : ''}{b.task_title ? ` · task: ${b.task_title}` : ''}{b.client_name ? ` · ${b.client_name}` : ''}</p>
                {b.next_action && <p className="mt-1 text-xs text-[var(--c-text)]">Next: {b.next_action}</p>}
                {b.status === 'resolved' && <p className="mt-1 text-xs text-[var(--c-text-2)]">Resolved {b.resolved_at ? new Date(b.resolved_at).toLocaleDateString() : ''}{b.resolution_note ? `: ${b.resolution_note}` : ''}</p>}
              </div>
              <Chip color={tone(b.severity)}>{b.severity}</Chip>
              {due && <Chip color={late ? 'var(--c-error)' : undefined}>{late ? 'overdue ' : 'due '}{due}</Chip>}
              {b.status === 'open' && <button className={`${btn} border border-[var(--c-border-strong)] text-[var(--c-text)]`} onClick={async () => { const note = window.prompt('How was it resolved?') ; if (note === null) return; try { await api(`/blockers/${b.id}/resolve`, { method: 'POST', body: JSON.stringify({ note }) }); await load(); } catch (e: any) { setError(e.message); } }}>Resolve</button>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function DeliveryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'changes' | 'blockers'>('changes');
  const staff = !!user && ['admin', 'ops', 'super_admin'].includes(user.role);
  const leadership = !!user && ['admin', 'super_admin'].includes(user.role);
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Delivery</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--c-text-2)]">Client change requests and blockers. A request changes the roadmap only when it is explicitly accepted; blockers keep an owner, a reason and an expected resolution.</p>
        </div>
        <ProvenanceBadge kind="DATABASE" note="Records entered by the team in IGT OS" />
      </header>
      <div role="tablist" aria-label="Delivery sections" className="flex w-fit rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-1">
        {([['changes', 'Change requests'], ['blockers', 'Blockers']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-[var(--c-primary)] text-white' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'}`}>{label}</button>
        ))}
      </div>
      {tab === 'changes' ? <ChangeRequests canDecide={staff} isLeadership={leadership} /> : <Blockers />}
    </div>
  );
}
