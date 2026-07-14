'use client';

import { useApp } from '@/contexts/AppContext';
import { useFinance } from './FinanceContext';
import { useState, useMemo } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend } from 'recharts';

export default function FinancialProjections() {
  const { state } = useApp();
  const { financeVisible } = useFinance();
  const [caseType, setCaseType] = useState<'base' | 'push' | 'bear'>('base');

  const data = useMemo(() => {
    return state.projections.map(p => {
      let modRevenue = p.revenue;
      if (!p.isHistorical) {
        if (caseType === 'push') modRevenue = p.revenue * 1.15;
        if (caseType === 'bear') modRevenue = p.revenue * 0.85;
      }
      return {
        ...p,
        revenue: modRevenue,
        costs: p.payroll + p.opex,
        isDeficit: p.pnl < 0
      };
    });
  }, [state.projections, caseType]);

  const endOfYearPnl = data.length > 0 ? data[data.length - 1].cumulativePnl : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-3 rounded-lg shadow-xl text-sm min-w-[200px]">
          <p className="font-semibold mb-2">{label} 2026</p>
          <div className="space-y-1">
            {payload.map((p: any) => (
              <div key={p.dataKey} className="flex justify-between">
                <span style={{ color: p.color }}>{p.name}:</span>
                <span className={`font-medium ${!financeVisible ? 'blur-sm select-none' : ''}`}>
                  {financeVisible ? `₹${p.value.toLocaleString()}` : '••••••'}
                </span>
              </div>
            ))}
            <div className="border-t border-[var(--c-border)] mt-2 pt-2 flex justify-between font-bold">
              <span>Net P&L:</span>
              <span className={`font-medium ${!financeVisible ? 'blur-sm select-none' : ''}`}>
                {financeVisible ? `₹${(payload[0].payload.revenue - payload[0].payload.costs).toLocaleString()}` : '••••••'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col h-[400px]">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-sm">6-Month Forecast</h3>
          <p className="text-xs text-[var(--c-text-2)] mt-1">Cum. Dec Profit: <span className="font-bold text-emerald-500">{financeVisible ? `₹${(endOfYearPnl/100000).toFixed(2)}L` : '••••'}</span></p>
        </div>
        <div className="flex bg-[var(--c-surface-2)] p-1 rounded-lg border border-[var(--c-border)]">
          {['base', 'push', 'bear'].map(type => (
            <button
              key={type}
              onClick={() => setCaseType(type as any)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                caseType === type
                  ? 'bg-[var(--c-surface)] text-[var(--c-text)] shadow-sm'
                  : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} axisLine={false} tickLine={false} />
            <YAxis 
              tickFormatter={(val) => financeVisible ? `₹${(val/100000).toFixed(0)}L` : '•••'} 
              tick={{ fontSize: 12, fill: 'var(--c-text-2)' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-surface-3)' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={800000} stroke="#2AB182" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: 'Target ₹8L', fill: '#2AB182', fontSize: 11 }} />
            <Bar dataKey="revenue" name="Revenue" fill="#2AB182" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line type="monotone" dataKey="costs" name="Total Costs" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
