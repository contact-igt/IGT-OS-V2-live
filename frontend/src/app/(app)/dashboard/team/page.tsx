'use client';

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import TaskCard from '@/components/tasks/TaskCard';
import { useState, useEffect } from 'react';

function TimerWidget({ isActive }: { isActive: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 60000); // every minute
    }
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 mt-3 p-2 bg-[var(--c-bg)] border border-[var(--c-primary)] rounded-md text-xs font-bold text-[var(--c-primary)]">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--c-primary)] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--c-primary)]"></span>
      </span>
      {Math.floor(elapsed / 60)}h {elapsed % 60}m Active
    </div>
  );
}

export default function TeamDashboard() {
  const { state } = useApp();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) {
    return <div className="p-8 text-[var(--c-text-2)]">Loading dashboard...</div>;
  }

  // Filter tasks assigned to current user. Note: task.assigneeIds might be an array in some versions, or assigneeId as string.
  // We'll check if the user.id is in the assignee array or matches assigneeId.
  const myTasks = state.tasks.filter(t => {
    return t.assignedTo?.includes(user.id);
  });

  const todoTasks = myTasks.filter(t => t.status === 'todo');
  const inProgressTasks = myTasks.filter(t => t.status === 'in_progress');
  // We mock a review column. Real tasks might not have 'review' status in DB yet, but we'll show it.
  const reviewTasks = myTasks.filter(t => t.status === 'in_review');

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* @ts-ignore - name property might be missing on User type */}
      <PreviewBanner roleName={user.role} userName={(user as any).name || user.email} />
      
      <div className="p-8 h-full flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
          <header className="mb-4 shrink-0">
            <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">My Workspace</h1>
            <p className="text-[var(--c-text-2)] font-grotesk">Manage your active workload and track time.</p>
          </header>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
            {/* To Do Column */}
            <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[var(--c-border)] flex justify-between items-center bg-[var(--c-surface-2)]">
                <h2 className="font-syne font-bold text-[var(--c-text)]">To Do</h2>
                <span className="bg-[var(--c-surface-3)] text-[var(--c-text-2)] text-xs px-2 py-1 rounded font-bold">{todoTasks.length}</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {todoTasks.map(task => (
                  <div key={task.id} className="relative">
                    <TaskCard task={task} onClick={() => {}} />
                  </div>
                ))}
                {todoTasks.length === 0 && (
                  <p className="text-sm text-[var(--c-text-2)] text-center mt-4">No pending tasks.</p>
                )}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-[var(--c-surface)] rounded-xl border-t-4 border-t-[var(--c-primary)] border-l border-r border-b border-[var(--c-border)] flex flex-col overflow-hidden shadow-[0_0_15px_rgba(42,177,130,0.1)]">
              <div className="p-4 border-b border-[var(--c-border)] flex justify-between items-center bg-[var(--c-surface-2)]">
                <h2 className="font-syne font-bold text-[var(--c-primary)]">In Progress</h2>
                <span className="bg-[var(--c-primary)]/20 text-[var(--c-primary)] text-xs px-2 py-1 rounded font-bold">{inProgressTasks.length}</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {inProgressTasks.map(task => (
                  <div key={task.id} className="relative border border-[var(--c-primary)]/30 rounded-xl p-1 bg-[var(--c-primary)]/5">
                    <TaskCard task={task} onClick={() => {}} />
                    <div className="px-3 pb-3">
                      <TimerWidget isActive={true} />
                    </div>
                  </div>
                ))}
                {inProgressTasks.length === 0 && (
                  <p className="text-sm text-[var(--c-text-2)] text-center mt-4">No active tasks.</p>
                )}
              </div>
            </div>

            {/* Review Column */}
            <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[var(--c-border)] flex justify-between items-center bg-[var(--c-surface-2)]">
                <h2 className="font-syne font-bold text-[var(--c-text)]">In Review</h2>
                <span className="bg-[var(--c-surface-3)] text-[var(--c-text-2)] text-xs px-2 py-1 rounded font-bold">{reviewTasks.length}</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {reviewTasks.map(task => (
                  <div key={task.id}>
                    <TaskCard task={task} onClick={() => {}} />
                  </div>
                ))}
                {reviewTasks.length === 0 && (
                  <p className="text-sm text-[var(--c-text-2)] text-center mt-4">No tasks in review.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
