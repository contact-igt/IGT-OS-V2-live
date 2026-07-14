'use client';

import { useApp } from '@/contexts/AppContext';
import { useFinance } from './FinanceContext';
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function RevenueBreakdown() {
  const { state } = useApp();
  const { financeVisible } = useFinance();
  const [graphType, setGraphType] = useState<'waterfall' | 'stacked' | 'line'>('waterfall');

  const data = useMemo(() => {
    const serviceRev = state.clients.reduce((sum, c) => sum + c.monthlyRetainerINR, 0);
    const saasRev = state.saasMetrics.currentMRR || 0;
    const totalRev = serviceRev + saasRev;

    const activeTeam = state.teamMembers;
    const payrollCost = activeTeam.reduce((sum, m) => sum + m.monthlySalaryINR, 0);

    const totalOpex = state.opexExpenses.reduce((sum, ex) => sum + ex.amountINR, 0);
    const netPnL = totalRev - payrollCost - totalOpex;

    return [
      { name: 'Service Rev', value: [0, serviceRev], raw: serviceRev, fill: '#2AB182', label: 'Services' },
      { name: 'SaaS Rev', value: [serviceRev, totalRev], raw: saasRev, fill: '#8B5CF6', label: 'SaaS' },
      { name: 'Payroll', value: [totalRev - payrollCost, totalRev], raw: -payrollCost, fill: '#F59E0B', label: 'Payroll' },
      { name: 'Opex', value: [totalRev - payrollCost - totalOpex, totalRev - payrollCost], raw: -totalOpex, fill: '#3B82F6', label: 'Opex' },
      { name: 'Net P&L', value: [Math.min(0, netPnL), Math.max(0, netPnL)], raw: netPnL, fill: netPnL >= 0 ? '#2AB182' : '#EF4444', label: 'P&L' },
    ];
  }, [state]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-3 rounded-lg shadow-xl text-sm">
          <p className="font-semibold mb-1">{data.name}</p>
          <p className="text-[var(--c-text-2)]">
            Amount: <span className={`font-bold ${!financeVisible ? 'blur-sm select-none' : ''}`}>
              {financeVisible ? `₹${Math.abs(data.raw).toLocaleString()}` : '••••••'}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Revenue Waterfall</h3>
        <div className="flex gap-2">
          {['Waterfall', 'Stacked', 'Line'].map(type => {
            const val = type.toLowerCase() as any;
            return (
              <button
                key={type}
                onClick={() => setGraphType(val)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors border ${
                  graphType === val
                    ? 'bg-[var(--c-text)] text-[var(--c-bg)] border-[var(--c-text)]'
                    : 'bg-transparent text-[var(--c-text-2)] border-[var(--c-border)] hover:text-[var(--c-text)]'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0 relative">
        {graphType === 'waterfall' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} axisLine={false} tickLine={false} />
              <YAxis 
                tickFormatter={(val) => financeVisible ? `₹${(val/1000).toFixed(0)}k` : '•••'} 
                tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-surface-3)' }} />
              <Bar dataKey="value" radius={4} maxBarSize={60}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--c-text-2)] text-sm border-2 border-dashed border-[var(--c-border)] rounded-lg m-4">
            [ {graphType.charAt(0).toUpperCase() + graphType.slice(1)} view selected - Add history data to render ]
          </div>
        )}
      </div>
    </div>
  );
}
