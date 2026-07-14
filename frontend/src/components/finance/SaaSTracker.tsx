'use client';

import { useApp } from '@/contexts/AppContext';
import { FinanceValue, useFinance } from './FinanceContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SaaSTracker() {
  const { state } = useApp();
  const { financeVisible } = useFinance();
  const data = state.saasMetrics;

  const totalClients = data.clientsByPlan.reduce((sum, p) => sum + p.count, 0);
  const progressPct = Math.min(100, (data.currentMRR / data.targetMRR) * 100).toFixed(0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-2 rounded-lg shadow-xl text-xs">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-blue-500 font-bold">
            {financeVisible ? `₹${payload[0].value.toLocaleString()}` : '••••••'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-[var(--c-text)] uppercase tracking-wide text-sm flex items-center gap-2">
            WhatsNexus SaaS MRR
            <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px]">NEW</span>
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-[var(--c-text-2)] text-xs uppercase mb-1">Current MRR</div>
          <div className="text-3xl font-bold text-blue-500">
            <FinanceValue amount={data.currentMRR} />
          </div>
          <div className="text-xs text-[var(--c-text-2)] mt-1">{totalClients} active clients</div>
        </div>
        <div>
          <div className="text-[var(--c-text-2)] text-xs uppercase mb-1">Target MRR (Dec 31)</div>
          <div className="text-xl font-bold text-[var(--c-text)]">
            <FinanceValue amount={data.targetMRR} />
          </div>
          <div className="mt-2 w-full bg-[var(--c-surface-3)] rounded-full h-2 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-[10px] text-[var(--c-text-2)] mt-1 text-right">{progressPct}% achieved</div>
        </div>
      </div>

      {/* Mini Line Chart */}
      <div className="h-24 w-full mb-6">
        <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)] mb-2">MRR Growth (Monthly)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.monthlyHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--c-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line type="monotone" dataKey="mrr" stroke="#3B82F6" strokeWidth={3} dot={{ r: 3, fill: '#3B82F6' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Plan Breakdown */}
      <div>
        <div className="text-[10px] uppercase font-bold text-[var(--c-text-2)] mb-2 border-b border-[var(--c-border)] pb-1">Active Clients by Plan</div>
        <div className="space-y-2 text-sm mt-3">
          {data.clientsByPlan.map((plan, i) => {
            const rowRev = plan.price * plan.count;
            return (
              <div key={i} className="flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--c-text)] w-20">{plan.plan}</span>
                  <span className="text-[var(--c-text-2)] text-xs">
                    (₹{plan.price.toLocaleString()})
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[var(--c-text-2)] text-xs">{plan.count} {plan.count === 1 ? 'client' : 'clients'}</span>
                  <span className="font-bold w-16 text-right">
                    {plan.price > 0 ? <FinanceValue amount={rowRev} /> : <span className="text-[var(--c-text-2)] text-xs">Pilot</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
