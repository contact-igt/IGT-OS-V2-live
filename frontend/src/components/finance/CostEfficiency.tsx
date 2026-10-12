'use client';

import { useApp } from '@/contexts/AppContext';
import { FinanceValue } from './FinanceContext';
import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function CostEfficiency() {
  const { state } = useApp();

  const efficiencyData = useMemo(() => {
    // Current month start
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const result = state.teamMembers
      .filter(m => m.role !== 'super_admin' && m.role !== 'admin' && m.role !== 'ops' && m.monthlySalaryINR)
      .map(m => {
        // Find tasks completed by this member this month
        const completedTasks = state.tasks.filter(t => {
          if (t.status !== 'done') return false;
          if (!t.assignedTo.includes(m.id)) return false;
          // Check if updated/completed this month (using updatedAt as proxy for completion time)
          const updatedTime = new Date(t.updatedAt).getTime();
          return updatedTime >= startOfMonth;
        });

        // Counts come only from real completed tasks (no per-person overrides).
        const tasksDone = completedTasks.length;
        const taskLabel = 'tasks';

        const costPerDay = Math.round(m.monthlySalaryINR / 26); // Assumed 26 working days
        const costPerHr = Math.round(costPerDay / 8); // Assumed 8 hrs/day
        const costPerTask = tasksDone > 0 ? Math.round(m.monthlySalaryINR / tasksDone) : null;

        return {
          id: m.id,
          name: m.name.split(' ')[0],
          role: m.department,
          salary: m.monthlySalaryINR,
          costPerDay,
          costPerHr,
          tasksDone,
          taskLabel,
          costPerTask,
        };
      })
      .sort((a, b) => b.salary - a.salary);
    
    return result;
  }, [state.teamMembers, state.tasks]);

  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-5 rounded-xl shadow-sm flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-[var(--c-text)] uppercase tracking-wide text-sm flex items-center gap-2">
          Team Cost Efficiency — July 2026
          <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px]">CEO ONLY</span>
        </h3>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="text-[var(--c-text-2)] border-b border-[var(--c-border)] uppercase text-[10px]">
              <th className="pb-2 font-semibold">Member</th>
              <th className="pb-2 font-semibold">Role</th>
              <th className="pb-2 font-semibold text-right">Salary</th>
              <th className="pb-2 font-semibold text-right">Cost/Day</th>
              <th className="pb-2 font-semibold text-right">Cost/Hr</th>
              <th className="pb-2 font-semibold text-right">Tasks Done</th>
              <th className="pb-2 font-semibold text-right text-[var(--c-text)]">Cost/Task</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-border)]">
            {efficiencyData.map(d => (
              <tr key={d.id} className="hover:bg-[var(--c-surface-3)] transition-colors group">
                <td className="py-2.5 font-medium">{d.name}</td>
                <td className="py-2.5 text-[var(--c-text-2)] text-xs">{d.role}</td>
                <td className="py-2.5 text-right font-medium"><FinanceValue amount={d.salary} /></td>
                <td className="py-2.5 text-right text-[var(--c-text-2)]"><FinanceValue amount={d.costPerDay} /></td>
                <td className="py-2.5 text-right text-[var(--c-text-2)]"><FinanceValue amount={d.costPerHr} /></td>
                <td className="py-2.5 text-right text-[var(--c-text-2)]">{d.tasksDone > 0 ? `${d.tasksDone} ${d.taskLabel}` : '—'}</td>
                <td className="py-2.5 text-right font-bold text-[var(--c-text)]">
                  {d.costPerTask ? (
                    <span className="flex items-center justify-end gap-1">
                      <FinanceValue amount={d.costPerTask} />
                      {d.costPerTask > 5000 && <AlertTriangle className="w-3 h-3 text-amber-500 ml-1" />}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-xs flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Insight:</strong> Pranesh cost per reel is ₹7,000 vs Basheer ₹2,500 — output gap is 3.5× for similar roles.
          Review output capacity or renegotiate base retainer.
        </p>
      </div>
    </div>
  );
}
