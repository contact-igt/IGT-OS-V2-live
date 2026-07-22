'use client';

import { memo, useMemo, useCallback } from 'react';
import { Calendar, PlayCircle, PauseCircle } from 'lucide-react';
import { Task, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_LABELS, isOverdue, calculateTaskProgress, canApproveOrCompleteTask } from '@/lib/data';
import { useApp } from '@/contexts/AppContext';
import LiveTimer from '@/components/ui/LiveTimer';
import { useTick } from '@/lib/hooks';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  showClient?: boolean;
  compact?: boolean;
}

export default memo(function TaskCard({ task, onClick, showClient = true, compact = false }: TaskCardProps) {
  const { state, setTaskStatus, requestStopTimer, startTimer, getTaskLoggedMinutes } = useApp();
  const client = useMemo(() => state.clients.find(c => c.id === task.clientId), [state.clients, task.clientId]);
  const assignees = useMemo(
    () => task.assignedTo.map(id => state.teamMembers.find(m => m.id === id)).filter(Boolean),
    [task.assignedTo, state.teamMembers]
  );
  const overdue = isOverdue(task);
  const timer = useMemo(() => state.activeTimers.find(t => t.taskId === task.id), [state.activeTimers, task.id]);
  const timerRunning = !!timer;

  const pc = PRIORITY_CONFIG[task.priority];
  const sc = STATUS_CONFIG[task.status];

  // Recompute every second while the timer runs so the bar fills in real time
  // instead of jumping only when the timer is stopped.
  useTick(timerRunning);
  const liveLoggedMinutes = timerRunning ? getTaskLoggedMinutes(task.id) : task.loggedMinutes;
  const pct = calculateTaskProgress({ ...task, loggedMinutes: liveLoggedMinutes }, state.tasks);

  const handleTimer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
    const isLeadership = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.roleTag === 'leadership';
    const isAssignee = task.assignedTo.includes(state.currentUserId);
    const isOwner = isAssignee || task.createdBy === state.currentUserId;
    if (!isLeadership && !isOwner) {
      alert("You do not have permission to modify this task.");
      return;
    }

    // Driven by status, not just timer presence — a task can end up 'in_progress' with no
    // live timer (e.g. auto-stopped elsewhere), and it should still show/act as "Pause",
    // not silently fall back to an unrelated "Start". requestStopTimer's modal stops the
    // timer if one exists and sets status regardless, so this is safe either way.
    if (task.status === 'in_progress') {
      requestStopTimer(task.id, 'paused');
    } else {
      // The person who assigned this task to someone else shouldn't be able to start it
      // on their behalf — only an actual assignee can, no exceptions (not even leadership).
      if (!isAssignee) {
        alert("Only an assignee can start this task.");
        return;
      }
      // Covers todo/paused/blocked alike — moves the card into In Progress. setTaskStatus
      // only updates local/display state + the task's status column; startTimer is what
      // actually opens the real time_logs row on the backend, so both are required or the
      // logged time never gets durably persisted.
      setTaskStatus(task.id, 'in_progress');
      startTimer(task.id);
    }
  }, [task.status, task.id, requestStopTimer, setTaskStatus, startTimer, state.teamMembers, state.currentUserId, task.assignedTo, task.createdBy]);

  const handleStatus = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
    const isLeadership = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.roleTag === 'leadership';
    const isAssignee = task.assignedTo.includes(state.currentUserId);
    const isOwner = isAssignee || task.createdBy === state.currentUserId;

    if (!isLeadership && !isOwner) {
      alert("You do not have permission to modify this task.");
      return;
    }

    const order: Task['status'][] = ['todo', 'in_progress', 'in_review', 'done'];
    const idx = order.indexOf(task.status);
    const nextStatus = order[(idx + 1) % order.length];

    if (nextStatus === 'in_progress' && task.status === 'todo' && !isAssignee) {
      alert("Only an assignee can start this task.");
      return;
    }

    if (nextStatus === 'todo' && task.status !== 'todo') {
      if (task.createdBy !== state.currentUserId && !isLeadership) {
        alert("Only the task assigner or leadership can move a task back to Todo.");
        return;
      }
    }

    if (nextStatus === 'done' && task.status === 'in_review') {
      if (!canApproveOrCompleteTask(state, task, state.currentUserId)) {
        alert("Only the person who assigned this task, CEO, COO, or Operations can mark a task in review as Done.");
        return;
      }
    }

    // Route through the same stop-timer flow TaskDrawer's status pills already use —
    // advancing straight via setTaskStatus left a running timer ticking forever once the
    // card moved on to In Review/Blocked/Paused (e.g. a task sitting in "In Review" with a
    // 40+ hour timer still counting, because nothing ever told it to stop).
    if (['paused', 'blocked', 'in_review'].includes(nextStatus) && task.status !== nextStatus) {
      requestStopTimer(task.id, nextStatus as 'paused' | 'blocked' | 'in_review');
    } else {
      setTaskStatus(task.id, nextStatus);
    }
  }, [task, state.teamMembers, state.currentUserId, setTaskStatus, requestStopTimer]);

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition duration-150 group bg-app-surface2 border border-app-border"
      >
        {/* Status dot button */}
        <button
          onClick={handleStatus}
          className="w-4 h-4 rounded-full border-2 flex-shrink-0 transition"
          title={`${sc.label} → click to advance`}
          style={{ borderColor: sc.color, background: task.status === 'done' ? sc.color : 'transparent' }}
        />

        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium truncate text-app-text ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
            {task.title}
          </p>
        </div>

        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: pc.bg, color: pc.color }}>
          {pc.label}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="card p-3.5 cursor-pointer group transition duration-150 hover:translate-y-[-1px]"
      style={{ borderLeft: `3px solid ${pc.color}` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {showClient && client && (
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-primary">
              {client.name}
            </p>
          )}
          <p className="text-[13px] font-semibold leading-snug text-app-text font-grotesk">
            {task.title}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: pc.bg, color: pc.color }}>
            {pc.label.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Category */}
      <p className="text-[11px] mb-2.5 truncate text-app-text2">
        {CATEGORY_LABELS[task.category]}
      </p>

      {/* Status + deadline row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={handleStatus}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full transition hover:opacity-80"
          style={{ background: sc.bg, color: sc.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
          {sc.label}
        </button>

        {task.deadline && (
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${overdue ? 'bg-red-500/10 text-red-500' : 'bg-app-surface3 text-app-text2'}`}>
            <Calendar className="w-3 h-3" />
            {overdue ? 'Overdue · ' : ''}{new Date(task.deadline).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {task.estimatedHours > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-app-text3">
              {timer ? (
                <LiveTimer startedAt={timer.startedAt} accumulatedMinutes={task.loggedMinutes} format="hm" />
              ) : (
                <>{Math.floor(task.loggedMinutes / 60)}h {task.loggedMinutes % 60}m</>
              )} / {task.estimatedHours}h
            </span>
            <span className={`text-[10px] font-semibold ${pct >= 100 ? 'text-red-500' : 'text-primary'}`}>{pct}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden bg-app-surface3">
            <div className="h-full rounded-full transition" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#EF4444' : '#2AB182' }} />
          </div>
        </div>
      )}

      {/* Footer: assignees + timer */}
      <div className="flex items-center justify-between">
        {/* Assignees */}
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 3).map(m => m && (
            <div
              key={m.id}
              className="w-6 h-6 rounded-full border border-app-surface flex items-center justify-center text-[9px] font-bold text-white font-grotesk"
              style={{ background: m.color }}
              title={m.name}
            >
              {m.initials}
            </div>
          ))}
          {assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full border border-app-surface flex items-center justify-center text-[9px] font-bold bg-app-surface3 text-app-text2">
              +{assignees.length - 3}
            </div>
          )}
        </div>

        {/* Timer */}
        {task.status !== 'done' && task.status !== 'in_review' && (
          <div className="flex items-center gap-2">
            {timerRunning && timer && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-2 py-1 rounded-lg border border-red-200 dark:bg-red-500/10 dark:border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <LiveTimer 
                  startedAt={timer.startedAt} 
                  accumulatedMinutes={task.loggedMinutes} 
                  format="hhmmss"
                  className="font-mono font-bold text-[12px] tracking-wider"
                />
              </div>
            )}
            <button
              onClick={handleTimer}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold transition border ${
                task.status === 'in_progress'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20'
              }`}
            >
              {task.status === 'in_progress' ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
              {task.status === 'in_progress' ? 'Pause' : (task.status === 'paused' || task.loggedMinutes > 0 ? 'Resume' : 'Start')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
