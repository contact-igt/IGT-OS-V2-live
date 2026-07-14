'use client';

import { useApp } from '@/contexts/AppContext';
import { useFinance } from './FinanceContext';
import { useMemo } from 'react';

export default function ProfitGoalWidget() {
  const { state } = useApp();
  const { financeVisible } = useFinance();

  // 1 Crore = 1,00,00,000 INR
  const TARGET_PROFIT = 10000000;

  const currentYearProfit = useMemo(() => {
    // Sum up the PnL of all projections (which represent the months of the year)
    return state.projections.reduce((sum, p) => sum + p.pnl, 0);
  }, [state.projections]);

  const percentage = Math.min(100, Math.max(0, (currentYearProfit / TARGET_PROFIT) * 100));

  return (
    <div className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl p-6 shadow-md relative overflow-hidden mb-6">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <span>🎯</span> Annual Target
          </div>
          <h2 className="text-2xl font-black text-[var(--c-text)]">₹1 Crore Profit Goal</h2>
          <p className="text-sm text-[var(--c-text-2)] mt-1 max-w-md">
            Tracking our trajectory towards achieving ₹1 Crore in net profit for the current financial year.
          </p>
        </div>

        <div className="flex-1 max-w-xl">
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-sm font-semibold text-[var(--c-text-2)] uppercase mb-1">Current Trajectory</div>
              <div className="text-3xl font-black text-[var(--c-text)]">
                {financeVisible ? `₹${(currentYearProfit / 100000).toFixed(1)}L` : '••••••'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-[var(--c-text-2)] uppercase mb-1">Target</div>
              <div className="text-xl font-bold text-[var(--c-text-2)]">₹1.0Cr</div>
            </div>
          </div>
          
          <div className="w-full h-4 bg-[var(--c-surface)] rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000 ease-out relative"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          
          <div className="flex justify-between mt-2 text-xs font-medium">
            <span className="text-emerald-500">{percentage.toFixed(1)}% Achieved</span>
            <span className="text-[var(--c-text-2)]">
              {financeVisible ? `₹${((TARGET_PROFIT - currentYearProfit) / 100000).toFixed(1)}L remaining` : '••••••'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
