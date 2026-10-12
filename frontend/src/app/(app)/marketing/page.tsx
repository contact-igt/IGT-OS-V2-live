'use client';

import React, { useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useMarketingData, DbCampaign } from '@/lib/useMarketingData';
import ProvenanceBadge from '@/components/ui/ProvenanceBadge';

// Pacing thresholds (days of balance remaining). Operational policy, kept in one place so they can be made configurable.
const BALANCE_CRITICAL_DAYS = 3;
const BALANCE_WARNING_DAYS = 7;

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
const PLATFORMS = ['overview', 'google', 'meta'] as const;

function balanceStatus(days: number | null) {
  if (days == null) return { label: 'UNKNOWN', color: 'var(--c-warning)' };
  if (days < BALANCE_CRITICAL_DAYS) return { label: 'CRITICAL', color: 'var(--c-error)' };
  if (days < BALANCE_WARNING_DAYS) return { label: 'LOW', color: 'var(--c-warning)' };
  return { label: 'OK', color: 'var(--c-success)' };
}

function Kpi({ label, value, kind, hint }: { label: string; value: string; kind: 'DATABASE' | 'DERIVED'; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--c-text-3)]">{label}</span>
      <span className="text-2xl font-bold text-[var(--c-text)]">{value}</span>
      <span className="flex items-center gap-2"><ProvenanceBadge kind={kind} note={hint} />{hint && <span className="text-[11px] text-[var(--c-text-3)]">{hint}</span>}</span>
    </div>
  );
}

export default function MarketingDashboard() {
  const { state } = useApp();
  const { campaigns, balances, loading, error, canSeeBalances } = useMarketingData();
  const [tab, setTab] = useState<(typeof PLATFORMS)[number]>('overview');

  const clientName = (id: string) => state.clients.find(c => c.id === id)?.name || 'Unknown client';
  const rows = useMemo(() => campaigns.filter((c: DbCampaign) => tab === 'overview' || c.campaign_type === tab), [campaigns, tab]);
  const bal = useMemo(() => balances.filter(b => tab === 'overview' || (b.platform || '').toLowerCase() === tab), [balances, tab]);

  const withSpend = rows.filter(c => num(c.spend_inr) != null);
  const spend = withSpend.reduce((a, c) => a + (num(c.spend_inr) || 0), 0);
  const leadsAll = rows.reduce((a, c) => a + (num(c.leads) || 0), 0);
  // CPL only over campaigns that have BOTH spend and leads recorded; otherwise it would be a mismatched ratio.
  const both = rows.filter(c => num(c.spend_inr) != null && (num(c.leads) || 0) > 0);
  const cpl = both.length ? both.reduce((a, c) => a + (num(c.spend_inr) || 0), 0) / both.reduce((a, c) => a + (num(c.leads) || 0), 0) : null;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-[var(--c-text)]"><Megaphone className="h-7 w-7 text-[var(--c-primary)]" aria-hidden /> Performance Marketing</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--c-text-2)]">Campaign figures recorded in IGT OS. Nothing on this page is pulled live from Meta or Google Ads yet.</p>
        </div>
        <div role="tablist" aria-label="Platform" className="flex rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-1">
          {PLATFORMS.map(p => (
            <button key={p} role="tab" aria-selected={tab === p} onClick={() => setTab(p)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${tab === p ? 'bg-[var(--c-primary)] text-white' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'}`}>{p}</button>
          ))}
        </div>
      </header>

      <section aria-label="Data sources" className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 text-xs text-[var(--c-text-2)]">
        <span className="flex items-center gap-2">Campaign figures <ProvenanceBadge kind="DATABASE" note="Entered in IGT OS by the team; not verified against the ad platform" /> manually entered</span>
        <span className="flex items-center gap-2">Meta Ads sync <ProvenanceBadge kind="ACCESS REQUIRED" note="No Meta Marketing API credentials/approval configured" /></span>
        <span className="flex items-center gap-2">Google Ads sync <ProvenanceBadge kind="ACCESS REQUIRED" note="No Google Ads API credentials/approval configured" /></span>
      </section>

      {loading && <p className="text-sm text-[var(--c-text-2)]">Loading…</p>}
      {error && <p role="alert" className="rounded-lg border px-4 py-3 text-sm" style={{ color: 'var(--c-error)', borderColor: 'var(--c-error)' }}>Unavailable: {error}. These figures are not zero - they could not be loaded.</p>}

      {!loading && !error && (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Recorded spend" value={withSpend.length ? inr(spend) : '—'} kind="DATABASE" hint={`${withSpend.length} of ${rows.length} campaigns have spend`} />
            <Kpi label="Recorded leads" value={rows.some(c => num(c.leads) != null) ? leadsAll.toLocaleString('en-IN') : '—'} kind="DATABASE" />
            <Kpi label="Cost per lead" value={cpl != null ? inr(cpl) : '—'} kind="DERIVED" hint="spend ÷ leads, campaigns with both" />
            <Kpi label="Campaigns" value={String(rows.length)} kind="DATABASE" />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section aria-labelledby="bal-h" className="lg:col-span-1">
              <h2 id="bal-h" className="mb-3 text-base font-semibold text-[var(--c-text)]">Ad account balances</h2>
              {!canSeeBalances ? (
                <p className="text-sm text-[var(--c-text-2)]">Balances are visible to operations and leadership.</p>
              ) : bal.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--c-border)] p-4 text-sm text-[var(--c-text-2)]">No balances recorded. Live balances need a connected ad account (ACCESS REQUIRED).</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {bal.map(b => { const s = balanceStatus(b.daysRemaining); return (
                    <li key={b.id} className="rounded-xl border bg-[var(--c-surface)] p-4" style={{ borderColor: s.color }}>
                      <div className="flex items-start justify-between gap-2">
                        <div><div className="text-sm font-semibold text-[var(--c-text)]">{clientName(b.clientId)}</div><div className="text-xs capitalize text-[var(--c-text-3)]">{b.platform || 'platform n/a'}</div></div>
                        <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</span>
                      </div>
                      <div className="mt-3 flex items-end justify-between text-sm text-[var(--c-text)]">
                        <span>{b.balance != null ? inr(Number(b.balance)) : '—'}</span>
                        <span className="text-xs text-[var(--c-text-2)]">{b.daysRemaining != null ? `${b.daysRemaining} days left` : 'days left unknown'}</span>
                      </div>
                      <div className="mt-2 text-[11px] text-[var(--c-text-3)]">{b.updated_at ? `Updated ${new Date(b.updated_at).toLocaleDateString()}` : 'No update date'}</div>
                    </li>); })}
                </ul>
              )}
            </section>

            <section aria-labelledby="camp-h" className="lg:col-span-2">
              <h2 id="camp-h" className="mb-3 text-base font-semibold text-[var(--c-text)]">Campaigns</h2>
              {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--c-border)] p-4 text-sm text-[var(--c-text-2)]">No campaigns recorded{tab !== 'overview' ? ` for ${tab}` : ''}.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead><tr className="border-b border-[var(--c-border)] text-xs uppercase tracking-wide text-[var(--c-text-3)]">
                      <th className="p-3 font-semibold">Campaign</th><th className="p-3 font-semibold">Client</th><th className="p-3 text-right font-semibold">Spend</th>
                      <th className="p-3 text-right font-semibold">Leads</th><th className="p-3 text-right font-semibold" title="Derived: spend ÷ leads">CPL</th><th className="p-3 text-right font-semibold">Impr.</th>
                    </tr></thead>
                    <tbody className="divide-y divide-[var(--c-border)]">
                      {rows.map(c => { const sp = num(c.spend_inr), ld = num(c.leads);
                        return (
                          <tr key={c.id}>
                            <td className="p-3"><div className="font-medium text-[var(--c-text)]">{c.campaign_name}</div><div className="text-xs capitalize text-[var(--c-text-3)]">{c.campaign_type} · {c.status}</div></td>
                            <td className="p-3 text-[var(--c-text-2)]">{clientName(c.client_id)}</td>
                            <td className="p-3 text-right">{sp != null ? inr(sp) : '—'}</td>
                            <td className="p-3 text-right">{ld != null ? ld : '—'}</td>
                            <td className="p-3 text-right">{sp != null && ld ? inr(sp / ld) : '—'}</td>
                            <td className="p-3 text-right">{c.impressions != null ? Number(c.impressions).toLocaleString('en-IN') : '—'}</td>
                          </tr>); })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
