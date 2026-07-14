'use client';

import { useApp } from '@/contexts/AppContext';
import { FinanceProvider, useFinance } from './FinanceContext';
import { Eye, EyeOff, Download } from 'lucide-react';
import ProfitGoalWidget from './ProfitGoalWidget';
import FinanceSnapshot from './FinanceSnapshot';
import RevenueBreakdown from './RevenueBreakdown';
import RevenueSources from './RevenueSources';
import ExpenseBreakdown from './ExpenseBreakdown';
import FinancialProjections from './FinancialProjections';
import SaaSTracker from './SaaSTracker';
import CostEfficiency from './CostEfficiency';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function FinanceDashboard() {
  const { state } = useApp();
  const { financeVisible, toggleFinance } = useFinance();
  const router = useRouter();
  
  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  const isAuthorized = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const isCEO = currentUser?.role === 'super_admin';

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (mounted && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--c-text-2)]">
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p>You do not have permission to view the financial dashboard.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-4 px-4 py-2 bg-[var(--c-primary)] text-white rounded-lg">Return to Dashboard</button>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="w-full max-w-[1400px] mx-auto min-h-full flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Finance</h1>
          <p className="text-sm text-[var(--c-text-2)] mt-1">Agency financial overview — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleFinance}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${financeVisible ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-[var(--c-surface)] text-[var(--c-text-2)] border-[var(--c-border)] hover:text-[var(--c-text)]'}`}
          >
            {financeVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {financeVisible ? 'Hide numbers' : 'Show all numbers'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--c-surface)] text-[var(--c-text)] border border-[var(--c-border)] rounded-lg text-sm font-semibold hover:bg-[var(--c-surface-3)] transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <ProfitGoalWidget />

      {/* Snapshot Cards */}
      <FinanceSnapshot />

      {/* Main Grid 1: Rev Breakdown & Projections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueBreakdown />
        <FinancialProjections />
      </div>

      {/* Main Grid 2: Sources & Expenses */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueSources />
        <ExpenseBreakdown isCEO={isCEO} />
      </div>

      {/* Main Grid 3: SaaS & Efficiency */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SaaSTracker />
        {isCEO && <CostEfficiency />}
      </div>
    </div>
  );
}

export default function FinanceContent() {
  return (
    <FinanceProvider>
      <FinanceDashboard />
    </FinanceProvider>
  );
}
