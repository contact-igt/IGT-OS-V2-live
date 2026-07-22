'use client';

import { useState } from 'react';
import { Task } from '@/lib/data';
import { useApp } from '@/contexts/AppContext';
import SubtaskModal from '@/components/tasks/SubtaskModal';
import { useTick } from '@/lib/hooks';

interface TeamTaskCardProps {
  task: Task;
  onClick: () => void;
}

export default function TeamTaskCard({ task, onClick }: TeamTaskCardProps) {
  const { state, setTaskStatus, requestStopTimer, startTimer, getTaskLoggedMinutes } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);

  // Find subtasks
  const subtasks = state.tasks.filter(t => t.parentId === task.id);
  const isGoal = task.type === 'goal' || subtasks.length > 0;

  // Find client
  const client = state.clients.find(c => c.id === task.clientId);
  const clientColor = client?.color || '#94A3B8';
  // Progress calc — recompute every second while a real timer is running on this task
  // so the bar fills live instead of only jumping when the timer is stopped.
  const hasActiveTimer = state.activeTimers.some(t => t.taskId === task.id);
  useTick(hasActiveTimer);
  const loggedMinutesLive = hasActiveTimer ? getTaskLoggedMinutes(task.id) : (task.loggedMinutes || 0);
  const logged = Math.round(loggedMinutesLive / 60);
  const est = task.estimatedHours || 0;
  const pct = est > 0 ? Math.min(100, Math.round((logged / est) * 100)) : 0;
  // Overdue check
  let overdueDays = 0;
  if (task.deadline && task.status !== 'done') {
    const dl = new Date(task.deadline);
    dl.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = today.getTime() - dl.getTime();
    if (diff > 0) {
      overdueDays = Math.floor(diff / (1000 * 3600 * 24));
    }
  }

  // Timer logic (mocked for now, assuming if status is in_progress it's running)
  // Actually we need to integrate this with a real timer state if available, but for now:
  const isRunning = task.status === 'in_progress';

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      // Pause, not reset to Todo — moves the card to the Paused column and keeps
      // whatever progress it already logged, instead of discarding it back to square one.
      requestStopTimer(task.id, 'paused');
    } else {
      // setTaskStatus alone only updates the status column — startTimer is what actually
      // opens the real time_logs row on the backend, so both are required together.
      setTaskStatus(task.id, 'in_progress'); // Start
      startTimer(task.id);
    }
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskStatus(task.id, 'in_review'); // Team members submit for review first, but let's assume they click Done and it opens drawer for note if we enforce it, or just sets it to in_review.
  };

  return (
    <div 
      onClick={onClick}
      className="card-surface2 relative flex flex-col p-4 rounded-xl border border-border cursor-pointer hover:border-primary transition overflow-hidden"
    >
      {/* 3px left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: clientColor }} />
      
      <div className="pl-2 flex flex-col gap-2">
        {/* Top row */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isGoal && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="w-6 h-6 flex items-center justify-center rounded bg-surface-3 text-text hover:bg-surface border border-border"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            )}
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: clientColor }}>
              {client?.id.substring(0,4).toUpperCase() || 'CLNT'}
            </span>
            <span className="text-sm font-semibold text-text-2">{client?.name || 'Unknown Client'}</span>
          </div>
          {overdueDays > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 whitespace-nowrap">
              🔴 {overdueDays}d overdue
            </span>
          )}
        </div>
        
        {/* Title */}
        <h4 className="text-base font-bold text-text leading-tight">{task.title}</h4>
        
        {/* Meta */}
        <div className="text-xs text-text-2 flex items-center gap-1.5 flex-wrap">
          <span className="capitalize">{task.category.replace('_', ' ')}</span>
          <span>&middot;</span>
          <span>Est {est}h</span>
          <span>&middot;</span>
          <span>Logged {logged}h</span>
          <span>&middot;</span>
          {task.deadline ? (
            <span className={`flex items-center gap-1 ${overdueDays > 0 ? 'text-red-500 font-semibold' : ''}`}>
              <span className="material-symbols-outlined text-[12px]">calendar_today</span>
              {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-text-3 italic">
              <span className="material-symbols-outlined text-[12px]">calendar_today</span>
              No due date
            </span>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden mt-1">
          <div 
            className="h-full rounded-full transition-all" 
            style={{ 
              width: `${pct}%`, 
              backgroundColor: pct >= 100 ? '#F59E0B' : '#10B981' 
            }}
          />
        </div>
        
        {/* Actions (Thumb sized 44px) */}
        <div className="flex items-center gap-2 mt-3">
          <button 
            onClick={handleStart}
            className={`flex-1 h-[44px] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition ${isRunning ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-3 text-text hover:bg-surface'}`}
          >
            {isRunning ? (
              <><span className="material-symbols-outlined text-base animate-pulse">pause_circle</span> Pause</>
            ) : (
              <><span className="material-symbols-outlined text-base">play_circle</span> Start</>
            )}
          </button>
          
          <button 
            onClick={handleDone}
            className="flex-1 h-[44px] rounded-lg bg-surface-3 hover:bg-[#10B981]/15 hover:text-[#10B981] text-text font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <span className="material-symbols-outlined text-base">check_circle</span> Done
          </button>
          
          <button 
            className="w-[44px] h-[44px] flex-shrink-0 rounded-lg bg-surface-3 text-text-2 hover:text-text flex items-center justify-center transition"
          >
            <span className="material-symbols-outlined text-base">open_in_new</span>
          </button>
        </div>

        {/* Subtasks Inline Expansion */}
        {isGoal && isExpanded && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
            <div className="text-xs font-bold uppercase text-text-2 mb-1 flex justify-between items-center">
              <span>Subtasks ({subtasks.length})</span>
            </div>
            
            {subtasks.map(st => (
              <div key={st.id} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-surface hover:border-primary/50 transition cursor-pointer" onClick={(e) => { e.stopPropagation(); onClick(); /* ideally open subtask drawer */ }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTaskStatus(st.id, st.status === 'done' ? 'todo' : 'done'); }}
                      className={`w-4 h-4 rounded-full border ${st.status === 'done' ? 'bg-primary border-primary' : 'border-text-3'}`} 
                    />
                    <span className={`text-sm font-semibold ${st.status === 'done' ? 'line-through text-text-3' : 'text-text'}`}>{st.title}</span>
                  </div>
                  {st.priority === 'critical' && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Critical</span>}
                </div>
                
                <div className="flex items-center gap-3 text-[10px] text-text-2 pl-6">
                  {st.assignedTo && st.assignedTo.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">person</span>
                      {st.assignedTo.map(uid => {
                        const u = state.teamMembers.find(m => m.id === uid);
                        return u ? u.initials : 'Unassigned';
                      }).join(', ')}
                    </span>
                  )}
                  {st.deadline && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                      {new Date(st.deadline).toLocaleDateString()}
                    </span>
                  )}
                  {st.estimatedHours > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {Math.round((st.loggedMinutes || 0)/60)}/{st.estimatedHours}h
                    </span>
                  )}
                  {st.assets && st.assets.length > 0 && (
                    <span className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-[12px]">attachment</span>
                      {st.assets.length} assets
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {subtasks.length === 0 && (
              <div className="text-xs text-text-3 text-center py-2">No subtasks yet.</div>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); setShowSubtaskModal(true); }}
              className="mt-2 text-xs font-bold flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-border text-text-2 hover:text-text hover:border-text-3 transition"
            >
              <span className="material-symbols-outlined text-[14px]">add</span> Add Subtask
            </button>
          </div>
        )}
      </div>

      {/* Subtask Modal */}
      {showSubtaskModal && (
        <SubtaskModal
          parentTask={task}
          onClose={() => setShowSubtaskModal(false)}
        />
      )}
    </div>
  );
}
