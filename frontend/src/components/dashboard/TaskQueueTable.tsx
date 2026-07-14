import React from 'react';
import type { Task } from '@/lib/data_types';
import { isOverdue } from '@/lib/data';
import { useApp } from '@/contexts/AppContext';

interface TaskQueueTableProps {
  tasks: Task[];
  title?: string;
  onTaskClick: (taskId: string) => void;
  renderExtraColumns?: () => React.ReactNode;
  renderExtraCells?: (task: Task) => React.ReactNode;
}

export function TaskQueueTable({ tasks, title = "MY TASKS", onTaskClick, renderExtraColumns, renderExtraCells }: TaskQueueTableProps) {
  const { state } = useApp();
  return (
    <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[var(--c-border)] flex justify-between items-center">
        <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase">
          {title}
        </h3>
        <span className="text-xs font-bold text-[var(--c-text-3)] bg-[var(--c-surface-2)] px-2 py-1 rounded-full">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--c-surface-2)] border-b border-[var(--c-border)]">
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Client</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Title</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Est.</th>
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Deadline</th>
              {renderExtraColumns && renderExtraColumns()}
              <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-border)]">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-[var(--c-text-3)] text-sm">
                  Your queue is clear.
                </td>
              </tr>
            ) : (
              tasks.map((t) => {
                const isLate = isOverdue(t);
                const isDone = t.status === 'done';
                const clientCode = state.clients.find(c => c.id === t.clientId)?.code || 'Unknown';
                
                const statusColors = {
                  todo: 'bg-slate-500/10 text-slate-500',
                  in_progress: 'bg-blue-500/10 text-blue-500',
                  in_review: 'bg-amber-500/10 text-amber-500',
                  blocked: 'bg-red-500/10 text-red-500',
                  done: 'bg-emerald-500/10 text-emerald-500',
                };
                
                const estText = t.estimatedHours 
                  ? `${(t.estimatedHours).toFixed(1)}h`
                  : '--';
                const loggedText = t.loggedMinutes 
                  ? `${(t.loggedMinutes / 60).toFixed(1)}h`
                  : '0h';

                return (
                  <tr 
                    key={t.id} 
                    className="hover:bg-[var(--c-hover)] transition-colors cursor-pointer group"
                    onClick={() => onTaskClick(t.id)}
                  >
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColors[t.status as keyof typeof statusColors] || statusColors.todo}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-[var(--c-text-2)]">
                      {clientCode}
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm font-semibold text-[var(--c-text)] group-hover:text-[var(--c-primary)] transition-colors">
                        {t.title}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--c-text-2)]">
                      {estText}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className={isLate && !isDone ? 'text-red-500 font-bold' : 'text-[var(--c-text-2)]'}>
                        {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No deadline'}
                      </span>
                    </td>
                    
                    {renderExtraCells && renderExtraCells(t)}
                    
                    <td className="px-6 py-3 text-sm text-right">
                      <button 
                        className="text-[var(--c-primary)] font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(t.id);
                        }}
                      >
                        [Open →]
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
