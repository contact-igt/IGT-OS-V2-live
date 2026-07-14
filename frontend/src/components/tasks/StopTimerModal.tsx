import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { CheckCircle2, PauseCircle, AlertTriangle, X, Paperclip } from 'lucide-react';

export default function StopTimerModal({ 
  taskId, 
  targetStatus,
  onClose 
}: { 
  taskId: string | null; 
  targetStatus?: 'paused' | 'in_review' | 'blocked' | null;
  onClose: () => void;
}) {
  const { state, stopTimer, setTaskStatus, dispatch, getTimerElapsed, updateTask } = useApp();
  const [note, setNote] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [error, setError] = useState('');
  
  if (!taskId) return null;

  const task = state.tasks.find(t => t.id === taskId);
  const timer = state.activeTimers.find(t => t.taskId === taskId);
  
  if (!task) {
    onClose();
    return null;
  }

  const elapsedSeconds = timer ? getTimerElapsed(taskId) : 0;
  const sessionMinutes = Math.floor(elapsedSeconds / 60);

  const handleAction = (status: 'paused' | 'in_review' | 'blocked') => {
    // Validation
    if (!note.trim()) {
      setError(`Please provide a note/reason for marking this task as ${status.replace('_', ' ')}.`);
      return;
    }
    
    if (status === 'in_review') {
      if (task.requiresAsset && !assetUrl.trim()) {
        setError('This task requires an asset link to be submitted.');
        return;
      }
    }

    // 1. Stop the timer if it exists
    if (timer) {
      stopTimer(taskId);
    }
    
    // 2. Change the status
    setTaskStatus(taskId, status, note.trim());

    // 3. Update task with notes and assets if provided
    const updates: any = {};
    if (note.trim() && status === 'in_review') {
      updates.submissionNotes = note.trim();
    }
    if (assetUrl.trim()) {
      updates.assets = [...(task.assets || []), { name: 'Submitted Asset', url: assetUrl.trim() }];
    }
    
    if (Object.keys(updates).length > 0) {
      updateTask(taskId, updates);
    }

    // 4. Add an audit note if provided
    if (note.trim()) {
      dispatch({
        type: 'ADD_AUDIT',
        payload: {
          id: `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          actorId: state.currentUserId,
          actor: state.teamMembers.find(m => m.id === state.currentUserId)?.name || 'Unknown',
          action: 'time_logged',
          entity: 'Task',
          entityRef: task.title,
          clientName: state.clients.find(c => c.id === task.clientId)?.name || '—',
          meta: `Note: ${note}`
        }
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-2">
          <h2 className="text-lg font-bold text-text font-syne">Complete / Stop Task</h2>
          <button onClick={onClose} className="p-1 rounded text-text-3 hover:text-text hover:bg-hover transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {timer && (
            <div className="bg-surface-3 border border-border rounded-lg p-3 text-center">
              <p className="text-[12px] font-bold text-text-3 uppercase tracking-wider mb-1">Session Time Logged</p>
              <p className="text-3xl font-bold text-primary num">{sessionMinutes} <span className="text-[16px] text-text-2">min</span></p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] p-3 rounded-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-bold text-text-2 mb-1.5 uppercase tracking-wider">
              Feedback / Reason <span className="text-red-500">*</span>
            </label>
            <textarea 
              className="input-base w-full h-20 resize-none text-[13px]" 
              placeholder="Provide a detailed explanation of what was done..."
              value={note}
              onChange={(e) => { setNote(e.target.value); setError(''); }}
            />
          </div>

          {(task.requiresAsset || assetUrl) && (
            <div>
              <label className="block text-[12px] font-bold text-text-2 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                Asset URL {task.requiresAsset && <span className="text-red-500">*</span>}
              </label>
              <input 
                type="text"
                className="input-base w-full text-[13px]" 
                placeholder="https://drive.google.com/..."
                value={assetUrl}
                onChange={(e) => { setAssetUrl(e.target.value); setError(''); }}
              />
            </div>
          )}

          <div className="pt-2">
            <label className="block text-[12px] font-bold text-text-2 mb-3 uppercase tracking-wider">What&apos;s the status of this task?</label>
            <div className="flex flex-col gap-2">
              {(!targetStatus || targetStatus === 'in_review') && (
                <button 
                  onClick={() => handleAction('in_review')}
                  className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors text-left"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <div className="font-bold text-[14px]">Submit for Review</div>
                    <div className="text-[11px] opacity-80">Task is complete and ready for admin approval</div>
                  </div>
                </button>
              )}
              
              {(!targetStatus || targetStatus === 'paused') && (
                <button 
                  onClick={() => handleAction('paused')}
                  className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors text-left"
                >
                  <PauseCircle className="w-5 h-5" />
                  <div>
                    <div className="font-bold text-[14px]">Pause for Later</div>
                    <div className="text-[11px] opacity-80">Will continue working on this later</div>
                  </div>
                </button>
              )}

              {(!targetStatus || targetStatus === 'blocked') && (
                <button 
                  onClick={() => handleAction('blocked')}
                  className="flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors text-left"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <div>
                    <div className="font-bold text-[14px]">Blocked</div>
                    <div className="text-[11px] opacity-80">Waiting on client, assets, or another team member</div>
                  </div>
                </button>
              )}


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
