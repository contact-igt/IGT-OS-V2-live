'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';

export default function RevertToTodoModal({ 
  taskId, 
  onClose 
}: { 
  taskId: string | null; 
  onClose: () => void;
}) {
  const { state, setTaskStatus } = useApp();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!taskId) return null;

  const task = state.tasks.find(t => t.id === taskId);
  if (!task) {
    onClose();
    return null;
  }

  const handleSubmit = () => {
    if (!note.trim()) {
      setError('Please provide a reason for moving this task back to Todo.');
      return;
    }
    
    // Using currentUserId since they must be the assigner to even see this modal
    setTaskStatus(taskId, 'todo', note);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-app-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-app-border flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-amber-500 text-[28px]">warning</span>
            <h2 className="text-xl font-bold font-syne text-app-text">Revert to Todo</h2>
          </div>
          
          <p className="text-sm font-grotesk text-app-text2 mb-6 leading-relaxed">
            You are moving <strong className="text-app-text">&quot;{task.title}&quot;</strong> back to the Todo column. Please provide a reason for the assignee.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-app-text3 mb-2">Reason / Feedback</label>
              <textarea
                className="input-base min-h-[100px] resize-none"
                placeholder="e.g. Needs a complete rewrite based on new client brief..."
                value={note}
                onChange={e => { setNote(e.target.value); setError(''); }}
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-app-border bg-app-surface2 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-app-text2 hover:text-app-text transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            className="btn-primary"
          >
            Move to Todo
          </button>
        </div>
      </div>
    </div>
  );
}
