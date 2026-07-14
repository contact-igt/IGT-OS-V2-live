'use client';

import { useApp } from '@/contexts/AppContext';
import { FinanceValue, useFinance } from './FinanceContext';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function RevenueSources() {
  const { state } = useApp();
  const { financeVisible } = useFinance();

  const { clients, totalDue, totalPaid, totalOutstanding, saasMrr } = useMemo(() => {
    const active = state.clients;
    
    const enhancedClients = active.map(c => {
      // Calculate outstanding for this client based on payments
      const clientPayments = state.payments.filter(p => p.clientId === c.id && p.status !== 'paid');
      const outstanding = clientPayments.reduce((sum, p) => sum + (p.amountDue - p.amountPaid), 0);
      const isPaid = outstanding === 0;
      
      return {
        ...c,
        outstanding,
        statusLabel: isPaid ? '✅ Paid' : (outstanding < c.monthlyRetainerINR ? `🟡 Partial (₹${(outstanding/1000).toFixed(0)}K)` : '🔴 Unpaid')
      };
    }).sort((a, b) => b.monthlyRetainerINR - a.monthlyRetainerINR);

    const localTotalDue = active.reduce((sum, c) => sum + c.monthlyRetainerINR, 0);
    const localTotalOutstanding = enhancedClients.reduce((sum, c) => sum + c.outstanding, 0);
    const localTotalPaid = localTotalDue - localTotalOutstanding;
    
    // Add fake SaaS MMR for variety
    const localSaasMrr = state.saasMetrics.currentMRR;

    return { 
      clients: enhancedClients, 
      totalDue: localTotalDue + localSaasMrr, 
      totalPaid: localTotalPaid + localSaasMrr, 
      totalOutstanding: localTotalOutstanding,
      saasMrr: localSaasMrr
    };
  }, [state.clients, state.payments, state.saasMetrics]);

  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col h-[550px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm uppercase">Revenue Sources — July 2026</h3>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[var(--c-surface)] z-10">
              <tr className="text-[var(--c-text-2)] border-b border-[var(--c-border)] uppercase text-xs">
                <th className="pb-3 font-semibold">Source</th>
                <th className="pb-3 font-semibold text-right">Amount</th>
                <th className="pb-3 font-semibold text-right">%</th>
                <th className="pb-3 font-semibold pl-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {clients.map(c => {
                const pct = ((c.monthlyRetainerINR / totalDue) * 100).toFixed(0);
                return (
                  <tr key={c.id} className="hover:bg-[var(--c-surface-3)] transition-colors group">
                    <td className="py-3 font-medium flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </td>
                    <td className="py-3 text-right font-medium">
                      <FinanceValue amount={c.monthlyRetainerINR} />
                    </td>
                    <td className="py-3 text-right text-[var(--c-text-2)]">{pct}%</td>
                    <td className="py-3 pl-4 text-[var(--c-text-2)]">{c.statusLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="w-48 flex flex-col justify-between border-l border-[var(--c-border)] pl-6">
          <div className="h-48 w-full -mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={clients} 
                  dataKey="monthlyRetainerINR" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={2}
                >
                  {clients.map((entry, i) => <Cell key={i} fill={entry.color} stroke="var(--c-surface)" strokeWidth={2} />)}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => financeVisible ? `₹${val.toLocaleString()}` : '••••••'} 
                  contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', borderRadius: '8px', fontSize: '12px' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4 text-sm mt-4">
            <div>
              <div className="text-[var(--c-text-2)] text-xs uppercase mb-1">Total Due</div>
              <div className="font-bold"><FinanceValue amount={totalDue} /></div>
            </div>
            <div>
              <div className="text-[var(--c-text-2)] text-xs uppercase mb-1">Total Paid ({((totalPaid/totalDue)*100).toFixed(0)}%)</div>
              <div className="font-bold text-emerald-500"><FinanceValue amount={totalPaid} /></div>
            </div>
            <div>
              <div className="text-[var(--c-text-2)] text-xs uppercase mb-1">Outstanding</div>
              <div className="font-bold text-amber-500"><FinanceValue amount={totalOutstanding} /></div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-[var(--c-border)]">
            <div className="text-[var(--c-text-2)] text-[10px] uppercase mb-1">WhatsNexus MRR</div>
            <div className="font-bold text-blue-500"><FinanceValue amount={saasMrr} /></div>
            <div className="text-[10px] text-[var(--c-text-2)]">Separate SaaS revenue</div>
          </div>
        </div>
      </div>
    </div>
  );
}
