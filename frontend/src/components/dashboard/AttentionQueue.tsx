'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AttentionItem {
  id: string; kind: string; tier: 'critical' | 'action_today' | 'watch';
  what: string; why: string; owners: string[]; client: string | null; deadline: string | null;
  route: 'ceo' | 'operations'; ceoAction: string | null; link: string;
}
interface AttentionResponse {
  provenance: { classification: string; generatedAt: string };
  counts: { critical: number; actionToday: number; watch: number; needsCeo: number };
  ceoQueue: AttentionItem[]; operationsQueue: AttentionItem[];
}

const TIER_STYLE: Record<AttentionItem['tier'], { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'var(--c-error)' },
  action_today: { label: 'Action today', color: 'var(--c-warning)' },
  watch: { label: 'Watch', color: 'var(--c-info)' },
};
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function Row({ item }: { item: AttentionItem }) {
  const tier = TIER_STYLE[item.tier];
  return (
    <li className="flex items-start gap-3 py-3 border-t border-[var(--c-border)] first:border-t-0">
      <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold border" style={{ color: tier.color, borderColor: tier.color }}>{tier.label}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--c-text)] break-words">{item.what}</p>
        <p className="text-xs text-[var(--c-text-2)] mt-0.5">{item.why}</p>
        <p className="text-xs text-[var(--c-text-3)] mt-1">
          Owner: {item.owners.length ? item.owners.join(', ') : <span style={{ color: 'var(--c-error)' }}>nobody assigned</span>}
          {item.client ? ` · ${item.client}` : ''}{item.deadline ? ` · due ${item.deadline}` : ''}
        </p>
        {item.ceoAction && <p className="text-xs font-medium mt-1 text-[var(--c-text)]">Your call: {item.ceoAction}</p>}
      </div>
      <Link href={item.link} className="shrink-0 text-xs font-medium text-[var(--c-primary)] hover:underline">Open</Link>
    </li>
  );
}

export default function AttentionQueue() {
  const [data, setData] = useState<AttentionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/command-center/attention`, { credentials: 'include' });
      if (!res.ok) throw new Error(res.status === 403 ? 'You do not have access to the attention queue.' : `Request failed (${res.status})`);
      setData(await res.json());
    } catch (e: any) {
      setData(null); setError(e.message || 'Could not load the attention queue');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="attention-heading" className="mx-6 mt-4 mb-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]">
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[var(--c-border)]">
        <h2 id="attention-heading" className="flex items-center gap-2 text-sm font-bold text-[var(--c-text)]">
          <AlertTriangle size={16} style={{ color: 'var(--c-warning)' }} aria-hidden /> Attention required
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-[var(--c-text-3)]">
          {data && <span title="Computed live from task and leave records - nothing here is manually entered or seeded">
            DATABASE · {new Date(data.provenance.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          <button type="button" onClick={load} disabled={loading} aria-label="Refresh attention queue" className="rounded p-1 hover:bg-[var(--c-hover)] disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>
      <div className="px-4 py-2" aria-live="polite">
        {loading && !data && <p className="py-4 text-sm text-[var(--c-text-2)]">Loading…</p>}
        {error && <p className="py-4 text-sm" style={{ color: 'var(--c-error)' }}>Unavailable: {error}. This is not an “all clear”.</p>}
        {data && (
          <>
            <p className="py-2 text-xs text-[var(--c-text-2)]">
              {data.counts.needsCeo} need your decision · {data.counts.critical} critical · {data.counts.actionToday} action today · {data.counts.watch} watch
            </p>
            {data.ceoQueue.length === 0 && data.operationsQueue.length === 0 && (
              <p className="py-4 text-sm text-[var(--c-text-2)]">No open exceptions found in task and leave records.</p>
            )}
            {data.ceoQueue.length > 0 && (<><h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--c-text-3)]">Needs the CEO</h3>
              <ul>{data.ceoQueue.map(i => <Row key={i.id} item={i} />)}</ul></>)}
            {data.operationsQueue.length > 0 && (<><h3 className="pt-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-text-3)]">Routed to operations</h3>
              <ul className="max-h-80 overflow-y-auto">{data.operationsQueue.map(i => <Row key={i.id} item={i} />)}</ul></>)}
          </>
        )}
      </div>
    </section>
  );
}
