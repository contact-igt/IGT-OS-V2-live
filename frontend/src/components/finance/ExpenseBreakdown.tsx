'use client';

import { useApp } from '@/contexts/AppContext';
import { FinanceValue, useFinance } from './FinanceContext';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function ExpenseBreakdown({ isCEO }: { isCEO: boolean }) {
  const { state } = useApp();
  const { financeVisible } = useFinance();

  const { activeTeam, payrollCost, expenses, totalOpex, chartData, revenue } = useMemo(() => {
    const activeTeam = state.teamMembers.sort((a, b) => b.monthlySalaryINR - a.monthlySalaryINR);
    const payrollCost = activeTeam.reduce((sum, m) => sum + m.monthlySalaryINR, 0);
    const totalOpex = state.opexExpenses.reduce((sum, ex) => sum + ex.amountINR, 0);
    const revenue = state.clients.reduce((sum, c) => sum + c.monthlyRetainerINR, 0);

    const expenses = [
      { id: 'payroll', category: 'Salaries', amountINR: payrollCost, vsLastMonthStr: '▲ +₹6,500 (Anju ₹12K→₹15K)', color: '#F59E0B' },
      ...state.opexExpenses.map(ex => ({
        ...ex,
        color: ex.category === 'Tools & SaaS' ? '#3B82F6' : ex.category === 'Office / Misc' ? '#10B981' : '#EC4899'
      }))
    ];

    const chartData = expenses.map(e => ({ name: e.category, value: e.amountINR, color: e.color }));

    return { activeTeam, payrollCost, expenses, totalOpex, chartData, revenue };
  }, [state.teamMembers, state.opexExpenses, state.clients]);

  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col h-[550px] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[var(--c-surface)] z-10 py-1">
        <h3 className="font-semibold text-sm uppercase">Expenses — July 2026</h3>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--c-text-2)] border-b border-[var(--c-border)] uppercase text-xs">
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-right">% Rev</th>
                  <th className="pb-3 font-semibold pl-4">vs Last Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-border)]">
                {expenses.map(e => {
                  const pct = revenue > 0 ? ((e.amountINR / revenue) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={e.id} className="hover:bg-[var(--c-surface-3)] transition-colors">
                      <td className="py-3 font-medium flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.category}
                      </td>
                      <td className="py-3 text-right font-bold text-[var(--c-text)]">
                        <FinanceValue amount={e.amountINR} />
                      </td>
                      <td className="py-3 text-right text-[var(--c-text-2)]">{pct}%</td>
                      <td className="py-3 pl-4 text-[var(--c-text-2)] text-xs">{e.vsLastMonthStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="mt-4 pt-4 border-t border-[var(--c-border)] flex justify-between font-bold text-sm">
              <span className="text-[var(--c-text-2)] uppercase">Total Opex:</span>
              <span className="text-[var(--c-text)]"><FinanceValue amount={payrollCost + totalOpex} /></span>
            </div>
          </div>

          <div className="w-32 flex flex-col items-center">
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={35}
                    outerRadius={55}
                  >
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="var(--c-surface)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => financeVisible ? `₹${val.toLocaleString()}` : '***'} 
                    contentStyle={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', borderRadius: '8px', fontSize: '12px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {isCEO && (
          <div className="mt-2">
            <h4 className="font-bold text-xs uppercase text-[var(--c-text-2)] mb-3 flex items-center gap-2">
              Salary Breakdown
              <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px]">CEO ONLY</span>
            </h4>
            <div className="bg-[var(--c-surface-2)] p-4 rounded-xl border border-[var(--c-border)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {activeTeam.map(m => {
                  const pct = ((m.monthlySalaryINR / payrollCost) * 100).toFixed(1);
                  return (
                    <div key={m.id} className="flex justify-between items-center border-b border-[var(--c-border)] pb-1 border-dashed">
                      <span className="text-[var(--c-text)] font-medium">{m.name.split(' ')[0]}</span>
                      <div className="flex gap-4">
                        <span className="font-bold"><FinanceValue amount={m.monthlySalaryINR} /></span>
                        <span className="text-[var(--c-text-2)] w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--c-border)] flex justify-between font-bold text-sm">
                <span className="text-[var(--c-text-2)] uppercase">Total Payroll:</span>
                <span className="text-[var(--c-text)]"><FinanceValue amount={payrollCost} /></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
