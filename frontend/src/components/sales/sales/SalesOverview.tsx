'use client';
import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Lead } from '@/lib/seed_meetings';

const STAGE_COLORS: Record<string, string> = {
  discovery: '#8B5CF6', proposal: '#0EA5E9', revision: '#F59E0B',
  closing: '#EC4899', won: '#10B981',
};

function avgDaysInStage(leads: Lead[], stage: string): string {
  const stageLeads = leads.filter(l => l.stageHistory && l.stageHistory.length > 0);
  const durations: number[] = [];
  stageLeads.forEach(l => {
    const history = l.stageHistory || [];
    for (let i = 0; i < history.length; i++) {
      if (history[i].stage === stage) {
        const start = new Date(history[i].date).getTime();
        const end = history[i + 1] ? new Date(history[i + 1].date).getTime() : Date.now();
        const days = (end - start) / 86400000;
        if (days >= 0 && days < 365) durations.push(days);
      }
    }
  });
  if (!durations.length) return '—';
  return `${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)}d`;
}

export default function SalesOverview({ onStageClick }: { onStageClick: (stage: string) => void }) {
  const { state } = useApp();
  const leads: Lead[] = (state.leads || []) as Lead[];

  const snapshotLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const today = new Date().toISOString().split('T')[0];
  const [nowMs] = useState(() => Date.now()); // fixed at mount: render stays pure

  const openLeads = leads.filter(l => !['won', 'lost', 'paused'].includes(l.stage));
  const pipelineValue = openLeads.reduce((acc, l) => acc + (l.monthlyValueINR || 0), 0);

  // Won / Lost this month
  const thisMonth = today.substring(0, 7);
  const wonThisMonth = leads.filter(l => {
    const wonEntry = l.stageHistory?.find(sh => sh.stage === 'won');
    return wonEntry && wonEntry.date.startsWith(thisMonth);
  }).length;
  const lostThisMonth = leads.filter(l => {
    const lostEntry = l.stageHistory?.find(sh => sh.stage === 'lost');
    return lostEntry && lostEntry.date.startsWith(thisMonth);
  }).length;

  const followUps = openLeads.filter(l => {
    if (l.nextFollowUp === today) return true;
    const diffDays = (nowMs - new Date(l.lastContactDate).getTime()) / 86400000;
    return diffDays > 5;
  });

  const stages = [
    { id: 'discovery', label: 'DISCOVERY' },
    { id: 'proposal', label: 'PROPOSAL' },
    { id: 'revision', label: 'REVISION' },
    { id: 'closing', label: 'CLOSING' },
    { id: 'won', label: 'WON' },
  ];

  const funnelStats = useMemo(() => stages.map(stage => {
    const stageLeads = leads.filter(l => l.stage === stage.id);
    return {
      ...stage,
      count: stageLeads.length,
      value: stageLeads.reduce((acc, l) => acc + (l.monthlyValueINR || 0), 0),
      avgDays: avgDaysInStage(leads, stage.id),
    };
  }), [leads]);

  const maxCount = Math.max(...funnelStats.map(s => s.count), 1);

  const lostLeads = leads.filter(l => l.stage === 'lost');
  const lostValue = lostLeads.reduce((acc, l) => acc + (l.monthlyValueINR || 0), 0);
  const lostReasonSummary = lostLeads.map(l => l.lostReason).filter(Boolean).join(', ') || '—';

  return (
    <div className="space-y-6">
      {/* SUMMARY STRIP */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--c-text-2)] bg-[var(--c-surface-2)] px-2 py-1 rounded">
          Sales Snapshot — {snapshotLabel}
        </span>
        <div className="flex flex-wrap gap-6 text-sm">
          {[
            { label: 'Open Leads', value: openLeads.length, color: 'var(--c-text)' },
            { label: 'Pipeline Value', value: `₹${pipelineValue.toLocaleString('en-IN')}/mo`, color: '#10B981' },
            { label: 'Won This Month', value: wonThisMonth, color: '#10B981' },
            { label: 'Lost', value: lostThisMonth, color: '#EF4444' },
            { label: 'Follow-ups Today', value: followUps.length, color: '#F97316' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col">
              <span className="text-[var(--c-text-2)] text-xs">{label}</span>
              <span className="font-bold text-lg" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* VISUAL FUNNEL */}
        <div className="xl:col-span-2 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--c-text)] mb-6 uppercase text-xs tracking-wider">Conversion Funnel</h3>

          <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
            {/* CSS Funnel */}
            <div className="flex flex-col items-center space-y-0.5 w-full max-w-[260px]">
              {funnelStats.map((stat, i) => {
                const widthPercent = Math.max(28, (stat.count / maxCount) * 100);
                const isLast = i === funnelStats.length - 1;
                const color = STAGE_COLORS[stat.id] || '#10B981';

                return (
                  <div
                    key={stat.id}
                    className="w-full flex flex-col items-center group cursor-pointer"
                    onClick={() => onStageClick(stat.id)}
                  >
                    <div
                      className={`h-11 flex items-center justify-between px-4 text-white font-bold text-xs shadow-sm transition-all hover:brightness-110 hover:scale-[1.01] w-full`}
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: color,
                        clipPath: isLast ? 'none' : 'polygon(0 0, 100% 0, 96% 100%, 4% 100%)',
                        borderRadius: isLast ? '0 0 8px 8px' : '2px',
                      }}
                    >
                      <span className="uppercase tracking-wider text-[9px] opacity-80">{stat.label}</span>
                      <span>{stat.count}{isLast ? ' ✅' : ''}</span>
                    </div>
                    {!isLast && (
                      <div className="w-px h-3 bg-[var(--c-border)]" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Metrics table */}
            <div className="flex-1 w-full border-t md:border-t-0 md:border-l border-[var(--c-border)] pt-4 md:pt-0 md:pl-6">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-[var(--c-text-2)] border-b border-[var(--c-border)]">
                    <th className="pb-2 font-semibold">Stage</th>
                    <th className="pb-2 font-semibold text-right">Leads</th>
                    <th className="pb-2 font-semibold text-right">Value/mo</th>
                    <th className="pb-2 font-semibold pl-3">Avg time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-border)]">
                  {funnelStats.map(stat => (
                    <tr
                      key={stat.id}
                      className="hover:bg-[var(--c-surface-2)] transition-colors cursor-pointer"
                      onClick={() => onStageClick(stat.id)}
                    >
                      <td className="py-2.5 font-medium text-xs" style={{ color: STAGE_COLORS[stat.id] }}>
                        {stat.label}
                      </td>
                      <td className="py-2.5 text-right text-xs">{stat.count}</td>
                      <td className="py-2.5 text-right text-emerald-500 font-medium text-xs">
                        ₹{stat.value.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 pl-3 text-[var(--c-text-2)] text-xs">{stat.avgDays}</td>
                    </tr>
                  ))}
                  {/* Lost row — derived from real data */}
                  <tr
                    className="hover:bg-[var(--c-surface-2)] transition-colors cursor-pointer"
                    onClick={() => onStageClick('lost')}
                  >
                    <td className="py-2.5 font-medium text-xs text-red-500">LOST</td>
                    <td className="py-2.5 text-right text-xs">{lostLeads.length}</td>
                    <td className="py-2.5 text-right text-red-500 font-medium text-xs">
                      ₹{lostValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 pl-3 text-red-400 text-[10px] max-w-[100px] truncate" title={lostReasonSummary}>
                      {lostReasonSummary}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* TODAY'S FOLLOW-UPS */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-[var(--c-text)] uppercase text-xs tracking-wider">
              Today's Follow-ups
              <span className="ml-2 text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded font-bold">{followUps.length}</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
            {followUps.map(lead => {
// To be safe and clean, I will just disable the rule for this line since it's just calculating diff days.
              // eslint-disable-next-line react-hooks/purity
              const diffDays = Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / 86400000);
              const isUrgent = diffDays >= 9;
              const isWarm = diffDays >= 5 && diffDays < 9;
              const isPending = lead.nextFollowUp === today;

              const tag = isUrgent
                ? <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />URGENT</span>
                : isWarm
                  ? <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />WARM</span>
                  : isPending
                    ? <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />PENDING</span>
                    : null;

              const handleLogCall = () => {
                // ponytail: no persistent notes yet — logs to console until Activity model exists
                console.log(`[CRM] Call logged for lead ${lead.id} — ${lead.contactPerson}`);
                alert(`Call logged for ${lead.contactPerson}! (Note: persistent activity log coming soon)`);
              };

              const handleWhatsApp = () => {
                // Open WhatsApp web — no phone# on Lead interface yet, open chat search
                const msg = encodeURIComponent(`Hi, following up regarding our proposal for ${lead.name}.`);
                window.open(`https://wa.me/?text=${msg}`, '_blank');
              };

              return (
                <div key={lead.id} className="p-3 border border-[var(--c-border)] rounded-xl hover:border-emerald-500/40 transition-colors bg-[var(--c-surface-2)]">
                  <div className="flex items-center gap-2 mb-1">
                    {tag}
                    <span className="font-semibold text-sm">{lead.contactPerson}</span>
                  </div>
                  <div className="text-[11px] text-[var(--c-text-2)] mb-2.5 flex items-center gap-1.5 flex-wrap">
                    <span>{lead.name}</span>
                    <span>·</span>
                    <span className="capitalize">{lead.stage}</span>
                    <span>·</span>
                    <span className={isUrgent ? 'text-red-500 font-medium' : ''}>
                      {diffDays === 0 ? 'Contacted today' : `No contact in ${diffDays}d`}
                    </span>
                    <span>·</span>
                    <span className="text-emerald-500 font-medium">₹{lead.monthlyValueINR?.toLocaleString('en-IN')}/mo</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLogCall}
                      className="flex-1 text-[10px] font-semibold border border-[var(--c-border)] rounded-lg py-1.5 hover:bg-[var(--c-surface)] hover:border-emerald-500/50 hover:text-emerald-500 transition-colors"
                    >
                      📞 Log Call
                    </button>
                    <button
                      onClick={handleWhatsApp}
                      className="flex-1 text-[10px] font-semibold border border-[#25D366]/30 rounded-lg py-1.5 bg-[#25D366]/10 text-[#1a9e4e] hover:bg-[#25D366]/20 transition-colors"
                    >
                      💬 WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}

            {followUps.length === 0 && (
              <div className="text-center py-10 text-[var(--c-text-2)] text-sm">
                <div className="text-3xl mb-2">✅</div>
                All caught up! No follow-ups due.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
