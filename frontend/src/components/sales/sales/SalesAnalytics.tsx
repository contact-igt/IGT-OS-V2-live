'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts';
import type { Lead } from '@/lib/seed_meetings';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-3 rounded-lg shadow-xl text-sm z-50">
      <p className="font-bold mb-2 border-b border-[var(--c-border)] pb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center justify-between gap-4 font-medium" style={{ color: entry.color }}>
          <span>{entry.name}:</span>
          <span>
            {entry.name.toLowerCase().includes('mrr') || entry.name.toLowerCase().includes('value') || entry.name.toLowerCase().includes('added') || entry.name.toLowerCase().includes('cumulative')
              ? `₹${Number(entry.value).toLocaleString('en-IN')}`
              : entry.name.includes('%') || entry.name.includes('Rate')
                ? `${entry.value}%`
                : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STAGE_ORDER = ['discovery', 'proposal', 'revision', 'closing', 'won', 'lost', 'paused'];

export default function SalesAnalytics() {
  const { state } = useApp();
  const leads: Lead[] = (state.leads || []) as Lead[];
  const [flowView, setFlowView] = useState<'funnel' | 'bar'>('bar');

  // ── Compute monthly flow from real leads ──────────────────
  const monthlyFlow = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const buckets: Record<string, { month: string; new: number; won: number; lost: number; pipeline: number }> = {};

    for (let m = 0; m < 7; m++) {
      const d = new Date(year, now.getMonth() - 6 + m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { month: MONTHS[d.getMonth()], new: 0, won: 0, lost: 0, pipeline: 0 };
    }

    leads.forEach(lead => {
      const firstHistory = lead.stageHistory?.[0];
      if (!firstHistory) return;
      const created = firstHistory.date.substring(0, 7);
      if (buckets[created]) buckets[created].new++;
      lead.stageHistory?.forEach(sh => {
        const k = sh.date.substring(0, 7);
        if (!buckets[k]) return;
        if (sh.stage === 'won') buckets[k].won++;
        if (sh.stage === 'lost') buckets[k].lost++;
      });
    });

    // running pipeline count
    let pipeline = 0;
    return Object.values(buckets).map(b => {
      pipeline = pipeline + b.new - b.won - b.lost;
      return { ...b, pipeline: Math.max(pipeline, 0) };
    });
  }, [leads]);

  // ── Compute MRR from won leads ────────────────────────────
  const mrrData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const buckets: Record<string, { month: string; added: number }> = {};

    for (let m = 0; m < 7; m++) {
      const d = new Date(year, now.getMonth() - 6 + m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { month: MONTHS[d.getMonth()], added: 0 };
    }

    leads.filter(l => l.stage === 'won').forEach(lead => {
      const wonEntry = lead.stageHistory?.find(sh => sh.stage === 'won');
      if (!wonEntry) return;
      const k = wonEntry.date.substring(0, 7);
      if (buckets[k]) buckets[k].added += lead.monthlyValueINR || 0;
    });

    let cumulative = 0;
    return Object.values(buckets).map(b => {
      cumulative += b.added;
      return { month: b.month, added: b.added, cumulative };
    });
  }, [leads]);

  // ── Compute source performance from real leads ─────────────
  const sourceData = useMemo(() => {
    const map: Record<string, { leads: number; won: number; totalValue: number }> = {};
    leads.forEach(l => {
      const src = l.source || 'Unknown';
      if (!map[src]) map[src] = { leads: 0, won: 0, totalValue: 0 };
      map[src].leads++;
      if (l.stage === 'won') { map[src].won++; map[src].totalValue += l.monthlyValueINR || 0; }
    });
    return Object.entries(map)
      .map(([source, d]) => ({
        source,
        leads: d.leads,
        won: d.won,
        winRate: d.leads > 0 ? Math.round((d.won / d.leads) * 100) : 0,
        avgDeal: d.won > 0 ? Math.round(d.totalValue / d.won) : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [leads]);

  // ── Funnel stage counts ───────────────────────────────────
  const funnelData = useMemo(() => {
    return ['discovery', 'proposal', 'revision', 'closing', 'won'].map(stage => ({
      stage,
      count: leads.filter(l => l.stage === stage).length,
      value: leads.filter(l => l.stage === stage).reduce((s, l) => s + (l.monthlyValueINR || 0), 0),
    }));
  }, [leads]);
  const maxFunnelCount = Math.max(...funnelData.map(f => f.count), 1);

  // ── Key metrics ───────────────────────────────────────────
  const { winRate, avgDeal, avgDaysToClose, pipelineVelocity } = useMemo(() => {
    const closed = leads.filter(l => l.stage === 'won' || l.stage === 'lost');
    const won = leads.filter(l => l.stage === 'won');
    const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;
    const avgDeal = won.length > 0 ? Math.round(won.reduce((s, l) => s + (l.monthlyValueINR || 0), 0) / won.length) : 0;
    const avgDaysToClose = won.length > 0 ? Math.round(
      won.reduce((s, l) => {
        const first = new Date(l.stageHistory?.[0]?.date || l.lastContactDate);
        const last = new Date(l.lastContactDate);
        return s + Math.abs((last.getTime() - first.getTime()) / (1000 * 86400));
      }, 0) / won.length
    ) : 0;
    const pipelineVelocity = leads.filter(l => !['won','lost','paused'].includes(l.stage))
      .reduce((s, l) => s + (l.monthlyValueINR || 0), 0);
    return { winRate, avgDeal, avgDaysToClose, pipelineVelocity };
  }, [leads]);

  const bestSource = sourceData[0]?.source || '—';

  return (
    <div className="space-y-6">

      {/* KEY METRICS */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-[var(--c-text)] mb-4 uppercase text-xs tracking-wider">Key Metrics — Live</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-[var(--c-text-2)] mb-1">Win Rate</div>
            <div className="text-2xl font-bold">{winRate}%</div>
            {winRate < 40 && <div className="text-[10px] text-red-500 mt-1 font-medium">⚠ Below target (40%)</div>}
          </div>
          <div>
            <div className="text-xs text-[var(--c-text-2)] mb-1">Avg Deal Size</div>
            <div className="text-2xl font-bold">₹{avgDeal.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--c-text-2)] mb-1">Avg Days to Close</div>
            <div className="text-2xl font-bold">{avgDaysToClose}d</div>
          </div>
          <div>
            <div className="text-xs text-[var(--c-text-2)] mb-1">Pipeline Velocity</div>
            <div className="text-2xl font-bold text-emerald-500">₹{pipelineVelocity.toLocaleString('en-IN')}/mo</div>
          </div>
          <div>
            <div className="text-xs text-[var(--c-text-2)] mb-1">Best Source</div>
            <div className="text-sm font-bold text-emerald-500">{bestSource}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--c-text-2)] mb-1">Won Deals</div>
            <div className="text-sm font-bold">{leads.filter(l => l.stage === 'won').length}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--c-text-2)] mb-1">Lost Deals</div>
            <div className="text-sm font-bold text-red-500">{leads.filter(l => l.stage === 'lost').length}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--c-text-2)] mb-1">Top Objection</div>
            <div className="text-sm font-bold text-red-400">Price Competition</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* GRAPH 1: Monthly Pipeline Flow with Funnel toggle */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-[var(--c-text)] uppercase text-xs tracking-wider">Monthly Pipeline Flow</h3>
            <div className="flex bg-[var(--c-surface-2)] p-0.5 rounded-lg border border-[var(--c-border)] text-xs gap-0.5">
              <button
                className={`px-3 py-1 rounded transition-all ${flowView === 'bar' ? 'bg-[var(--c-bg)] shadow font-semibold' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'}`}
                onClick={() => setFlowView('bar')}
              >Bar</button>
              <button
                className={`px-3 py-1 rounded transition-all ${flowView === 'funnel' ? 'bg-[var(--c-bg)] shadow font-semibold' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'}`}
                onClick={() => setFlowView('funnel')}
              >Funnel</button>
            </div>
          </div>

          {flowView === 'bar' ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyFlow} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-border)" opacity={0.5} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--c-text-2)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--c-text-2)' }} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-surface-2)', opacity: 0.5 }} />
                  <Bar dataKey="new" name="New Leads" stackId="a" fill="#3B82F6" radius={[0,0,0,0]} />
                  <Bar dataKey="won" name="Won" stackId="a" fill="#10B981" radius={[0,0,0,0]} />
                  <Bar dataKey="lost" name="Lost" stackId="a" fill="#EF4444" radius={[4,4,0,0]} />
                  <Line type="monotone" dataKey="pipeline" name="Total Pipeline" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 py-4">
              {funnelData.map((f, i) => {
                const w = Math.max(25, (f.count / maxFunnelCount) * 100);
                const opacity = 0.95 - i * 0.15;
                return (
                  <div key={f.stage} className="w-full flex flex-col items-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--c-text-2)]">{f.stage}</div>
                    <div
                      className="h-10 flex items-center justify-between px-4 text-white text-xs font-bold rounded-sm transition-all hover:brightness-110"
                      style={{
                        width: `${w}%`,
                        backgroundColor: `rgba(16,185,129,${opacity})`,
                        clipPath: i < funnelData.length - 1 ? 'polygon(0 0, 100% 0, 96% 100%, 4% 100%)' : 'none',
                      }}
                    >
                      <span>{f.count} leads</span>
                      <span>₹{f.value.toLocaleString('en-IN')}</span>
                    </div>
                    {i < funnelData.length - 1 && (
                      <div className="text-[9px] text-[var(--c-text-3)] my-0.5">▼</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GRAPH 2: MRR from deals closed */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-[var(--c-text)] uppercase text-xs tracking-wider">Revenue from Deals Closed</h3>
            <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
              Total: ₹{mrrData[mrrData.length - 1]?.cumulative?.toLocaleString('en-IN') ?? 0}/mo
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mrrData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-border)" opacity={0.5} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--c-text-2)' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} tick={{ fontSize: 11, fill: 'var(--c-text-2)' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} tick={{ fontSize: 11, fill: 'var(--c-text-2)' }} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-surface-2)', opacity: 0.5 }} />
                <Bar yAxisId="left" dataKey="added" name="MRR Added" fill="#10B981" radius={[4,4,0,0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative MRR" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--c-surface)' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GRAPH 3: Lead Source Performance — computed from real leads */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-[var(--c-text)] mb-6 uppercase text-xs tracking-wider">Lead Source Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--c-surface-2)] border-y border-[var(--c-border)] text-[10px] uppercase tracking-wider text-[var(--c-text-2)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold text-right">Leads</th>
                <th className="px-4 py-3 font-semibold text-right">Won</th>
                <th className="px-4 py-3 font-semibold text-right">Win %</th>
                <th className="px-4 py-3 font-semibold text-right">Avg Deal</th>
                <th className="px-4 py-3 font-semibold w-1/3">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {sourceData.map((src, idx) => (
                <tr key={src.source} className="hover:bg-[var(--c-surface-2)] transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {src.source}
                      {idx === 0 && <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">Best</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{src.leads}</td>
                  <td className="px-4 py-3 text-right">{src.won}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: src.winRate >= 50 ? '#10B981' : src.winRate >= 30 ? '#F59E0B' : '#EF4444' }}>
                    {src.winRate}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    {src.avgDeal > 0 ? `₹${src.avgDeal.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full h-2 bg-[var(--c-border)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${src.winRate}%`,
                          backgroundColor: src.winRate >= 50 ? '#10B981' : src.winRate >= 30 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
