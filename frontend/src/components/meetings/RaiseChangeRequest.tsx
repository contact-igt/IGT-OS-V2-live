'use client';

import { useState } from 'react';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CLASSES = ['scope_change', 'new_feature', 'content_change', 'design_change', 'integration_change', 'bug', 'production_issue'];
const pretty = (s: string) => s.replace(/_/g, ' ');

// "What needs to change" from a linked meeting becomes a Delivery change request (project + source meeting attached),
// so it follows the normal impact -> decision -> roadmap flow and appears on the project timeline.
export default function RaiseChangeRequest({ clientId, projectId, meetingId, title, description, requestedBy }: {
  clientId: string; projectId: string; meetingId: string; title: string; description: string; requestedBy?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [classification, setClassification] = useState('scope_change');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (state === 'done') return <span className="text-[11px] font-bold" style={{ color: 'var(--c-success)' }}>✓ Raised in Delivery</span>;
  if (!open) return <button onClick={() => setOpen(true)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-2)' }}>Raise change request</button>;

  const submit = async () => {
    setState('saving'); setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/delivery/change-requests`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, projectId, meetingId, title: title.slice(0, 200), description: description.slice(0, 4000), classification, source: 'meeting', requestedBy: requestedBy || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setState('done');
    } catch (e: any) { setError(e.message); setState('idle'); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Change type" className="input-base !py-1 !text-[12px] !w-auto" value={classification} onChange={e => setClassification(e.target.value)}>
        {CLASSES.map(c => <option key={c} value={c}>{pretty(c)}</option>)}
      </select>
      <button onClick={submit} disabled={state === 'saving'} className="text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: 'var(--c-primary)', color: '#fff' }}>Send to Delivery</button>
      <button onClick={() => setOpen(false)} className="text-[11px]" style={{ color: 'var(--c-text-3)' }}>Cancel</button>
      {error && <span role="alert" className="text-[12px]" style={{ color: 'var(--c-error)' }}>{error}</span>}
    </div>
  );
}
