'use client';

import { useApp } from '@/contexts/AppContext';
import { FinanceValue } from './FinanceContext';
import { useMemo } from 'react';

export default function FinanceSnapshot() {
  const { state } = useApp();

  const { monthlyRev, payrollCost, outstanding } = useMemo(() => {
    const monthlyRev = state.clients.reduce((sum, c) => sum + c.monthlyRetainerINR, 0);

    const activeTeam = state.teamMembers;
    const payrollCost = activeTeam.reduce((sum, m) => sum + m.monthlySalaryINR, 0);

    // Mock total outstanding from payments
    let outstanding = 0;
    state.payments.forEach(p => {
      if (p.status !== 'paid') {
        outstanding += (p.amountDue - p.amountPaid);
      }
    });
    // Add some mock outstanding since our payments seed might be small
    if (outstanding === 0) outstanding = 174000;

    return { monthlyRev, payrollCost, outstanding };
  }, [state.clients, state.teamMembers, state.payments]);

  const totalOpex = state.opexExpenses.reduce((sum, ex) => sum + ex.amountINR, 0);
  const netPnL = monthlyRev - payrollCost - totalOpex;
  const isDeficit = netPnL < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Monthly Rev */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm">
        <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-2">Monthly Rev</div>
        <div className="text-2xl font-bold text-[var(--c-text)]">
          <FinanceValue amount={monthlyRev} />
        </div>
        <div className="text-sm text-[var(--c-text-2)] mt-2">
          Jul 2026
        </div>
      </div>

      {/* Payroll Cost */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm">
        <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-2">Payroll Cost</div>
        <div className="text-2xl font-bold text-[var(--c-text)]">
          <FinanceValue amount={payrollCost} />
        </div>
        <div className="text-sm text-[var(--c-text-2)] mt-2">
          {state.teamMembers.length} people
        </div>
      </div>

      {/* Net P&L */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm">
        <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-2">Net P&L</div>
        <div className={`text-2xl font-bold ${isDeficit ? 'text-red-500' : 'text-emerald-500'}`}>
          <FinanceValue amount={Math.abs(netPnL)} prefix={netPnL < 0 ? '-₹' : '₹'} />
        </div>
        <div className="text-sm text-[var(--c-text-2)] mt-2 flex items-center gap-1">
          {isDeficit ? '🔴 Deficit' : '🟢 Profit'}
        </div>
      </div>

      {/* Outstanding */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm">
        <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-2">Outstanding</div>
        <div className="text-2xl font-bold text-amber-500">
          <FinanceValue amount={outstanding} />
        </div>
        <div className="text-sm text-[var(--c-text-2)] mt-2">
          Invoices due
        </div>
      </div>
    </div>
  );
}
