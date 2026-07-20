'use client';

import { useState, useEffect } from 'react';
import { X, PlayCircle, StopCircle, PlusCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Task, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_LABELS, isOverdue, calculateTaskProgress } from '@/lib/data';
import LiveTimer from '@/components/ui/LiveTimer';
import EditTaskModal from '@/components/tasks/EditTaskModal';

interface Props {
  taskId: string | null;
  onClose: () => void;
  onTaskSelect?: (id: string) => void;
}

const STATUSES: Task['status'][] = ['todo', 'in_progress', 'rework', 'in_review', 'blocked', 'done'];


export default function TaskDrawer({ taskId, onClose, onTaskSelect }: Props) {
  const { state, setTaskStatus, updateTask, deleteTask, startTimer, requestStopTimer, isTimerRunning, dispatch, addReviewComment, resolveApproval, requestApproval, notifyUser } = useApp();
  const [tab, setTab] = useState<'details' | 'timelog' | 'audit'>('details');
  const [manualHours, setManualHours] = useState('');
  const [manualMins, setManualMins] = useState('');
  const [logNote, setLogNote] = useState('');
  const [comment, setComment] = useState('');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignTarget, setReassignTarget] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);

  const task = taskId ? state.tasks.find(t => t.id === taskId) : null;
  const client = task ? state.clients.find(c => c.id === task.clientId) : null;
  const assignees = task ? task.assignedTo.map(id => state.teamMembers.find(m => m.id === id)).filter(Boolean) : [];
  const overdue = task ? isOverdue(task) : false;
  const timer = task ? state.activeTimers.find(t => t.taskId === task.id) : null;
  const timerRunning = !!timer;
  const taskAudit = task
    ? state.auditLog.filter(a => a.entity === 'Task' && a.entityRef === task.title)
    : [];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!task) return null;

  
  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  const isLeadership = currentUser?.role === "super_admin" || currentUser?.role === "admin" || currentUser?.roleTag === "leadership";
  const isAssigned = task?.assignedTo.includes(state.currentUserId) || task?.createdBy === state.currentUserId;
  const isReadOnly = !isLeadership && !isAssigned;
  // Edit permission: task creator (assigner) OR leadership/admin
  const canEdit = task?.createdBy === state.currentUserId || isLeadership;
  // Delete permission: only admin or ops role
  const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'ops';

  const pc = PRIORITY_CONFIG[task.priority];
  const pct = task ? calculateTaskProgress(task, state.tasks) : 0;

  const handleManualLog = () => {
    const mins = (parseInt(manualHours || '0') * 60) + parseInt(manualMins || '0');
    if (mins <= 0) return;
    
    if (!isLeadership) {
      const ceo = state.teamMembers.find(m => m.role === 'admin' || m.role === 'super_admin');
      if (ceo) {
        requestApproval(task.id, ceo.id, 'time_log', `Manual time log: ${mins}m. Note: ${logNote}`, { minutes: mins, note: logNote });
      }
    } else {
      dispatch({ type: 'LOG_TIME_MANUAL', payload: { taskId: task.id, minutes: mins, note: logNote, actorId: state.currentUserId } });
    }
    
    setManualHours(''); setManualMins(''); setLogNote('');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-[101] flex flex-col overflow-hidden bg-app-surface border-l border-app-border shadow-[var(--shadow-drawer)]"
        style={{ width: 'min(520px, 100vw)' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-app-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                {task.id}
              </span>
              {task.type === 'goal' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary">
                  GOAL
                </span>
              )}
              {task.type === 'subtask' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary/20 text-secondary">
                  SUBTASK
                </span>
              )}
              {overdue && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-500">
                  OVERDUE
                </span>
              )}
              {timerRunning && timer && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-primary" />
                  <LiveTimer startedAt={timer.startedAt} />
                </span>
              )}
            </div>
            <h2 className="font-bold text-[16px] leading-snug text-app-text font-grotesk">
              {task.title}
            </h2>
            {client && (
              <p className="text-[12px] mt-1 font-semibold text-primary">{client.name}</p>
            )}
            {/* Action buttons: Edit (creator/leadership) + Delete (admin/ops only) */}
            <div className="flex items-center gap-2 mt-3">
              {canEdit && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
                  style={{
                    background: 'rgba(37,99,235,0.08)',
                    color: '#2563EB',
                    borderColor: 'rgba(37,99,235,0.25)',
                  }}
                  title="Edit task details"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                  Edit Task
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
                      dispatch({ type: 'DELETE_TASK', payload: { id: task.id } });
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    color: '#EF4444',
                    borderColor: 'rgba(239,68,68,0.25)',
                  }}
                  title="Delete task (Admin / Ops only)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                  Delete
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors flex-shrink-0 text-app-text2 bg-app-hover hover:opacity-80">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-app-border">
          {(['details', 'timelog', 'audit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[12px] font-semibold uppercase tracking-wide transition-all font-grotesk border-b-2 bg-transparent ${tab === t ? 'text-primary border-primary' : 'text-app-text2 border-transparent hover:text-app-text'}`}
            >
              {t === 'timelog' ? 'Time Log' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── DETAILS TAB ── */}
          {tab === 'details' && (
            <div className="p-5 space-y-5">
              {/* Status */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-app-text3">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => {
                    const sc = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          if (s === 'todo' && task.status !== 'todo') {
                            const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
                            const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
                            if (task.createdBy !== state.currentUserId && !isAdmin) {
                              alert("Only the task assigner or admin can move a task back to Todo.");
                              return;
                            }
                          }

                          if (['paused', 'blocked', 'in_review'].includes(s) && task.status !== s) {
                            requestStopTimer(task.id, s as 'paused' | 'blocked' | 'in_review');
                          } else {
                            setTaskStatus(task.id, s);
                          }
                        }}
                        className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all"
                        style={{
                          background: task.status === s ? sc.bg : 'var(--c-surface-2)',
                          color: task.status === s ? sc.color : 'var(--c-text-2)',
                          border: `1px solid ${task.status === s ? sc.color + '40' : 'var(--c-border)'}`,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: sc.color }} />
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-app-text3">Priority</label>
                <div className="flex gap-2">
                  {(['critical','high','medium','low'] as const).map(p => {
                    const pc2 = PRIORITY_CONFIG[p];
                    return (
                      <button
                        key={p}
                        onClick={() => updateTask(task.id, { priority: p })}
                        className="text-[11px] font-bold px-2.5 py-1 rounded transition-all"
                        style={{
                          background: task.priority === p ? pc2.bg : 'var(--c-surface-2)',
                          color: task.priority === p ? pc2.color : 'var(--c-text-2)',
                          border: `1px solid ${task.priority === p ? pc2.color + '40' : 'var(--c-border)'}`,
                        }}
                      >
                        {pc2.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-app-text3">Category</label>
                  <p className="text-[13px] text-app-text2">{CATEGORY_LABELS[task.category]}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-app-text3">Deadline</label>
                  <input
                    type="datetime-local"
                    value={task.deadline ? new Date(new Date(task.deadline).getTime() - new Date(task.deadline).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={e => updateTask(task.id, { deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className={`input-base text-[13px] py-1 px-2 ${overdue ? 'text-red-500' : 'text-app-text2'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-app-text3">Estimate</label>
                  <p className="text-[13px] text-app-text2">{task.estimatedHours}h</p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-app-text3">Logged</label>
                  <div className={`text-[13px] font-semibold flex items-center gap-1 ${pct >= 100 ? 'text-red-500' : 'text-primary'}`}>
                    {timer ? <LiveTimer startedAt={timer.startedAt} accumulatedMinutes={task.loggedMinutes} /> : (
                      <span>{Math.floor(task.loggedMinutes/60)}:{String(task.loggedMinutes%60).padStart(2,'0')}</span>
                    )} ({pct}%)
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="h-2 rounded-full overflow-hidden bg-app-surface3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#EF4444' : '#2AB182' }} />
                </div>
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-app-text3">Assigned To</label>
                <div className="flex flex-wrap gap-2">
                  {assignees.map(m => m && (
                    <div key={m.id} className="flex items-center gap-2 rounded-full px-3 py-1 bg-app-surface2 border border-app-border">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: m.color }}>
                        {m.initials}
                      </div>
                      <span className="text-[12px] text-app-text">{m.name}</span>
                    </div>
                  ))}
                </div>

                {/* Reassign — only once paused, and only the assignee themselves or an
                    admin can hand it off. Replaces the assignee outright (not additive):
                    past logged hours stay correctly attributed to whoever logged them,
                    since time_logs tracks that independently of assignedTo. */}
                {task.status === 'paused' && (task.assignedTo.includes(state.currentUserId) || isLeadership) && (
                  <div className="mt-3">
                    {!reassigning ? (
                      <button
                        onClick={() => setReassigning(true)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-app-border text-app-text2 hover:text-primary hover:border-primary transition-colors"
                      >
                        Reassign to another developer
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 p-3 rounded-lg border border-app-border">
                        <select
                          className="input-base text-[12px]"
                          value={reassignTarget}
                          onChange={e => setReassignTarget(e.target.value)}
                        >
                          <option value="">Select developer…</option>
                          {state.teamMembers.filter(m => !task.assignedTo.includes(m.id)).map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setReassigning(false); setReassignTarget(''); }}
                            className="text-[12px] px-3 py-1.5 text-app-text2"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={!reassignTarget}
                            onClick={() => {
                              updateTask(task.id, { assignedTo: [reassignTarget] });
                              notifyUser(reassignTarget, `${task.title} has been reassigned to you`, task.id);
                              setReassigning(false);
                              setReassignTarget('');
                            }}
                            className="btn-primary text-[12px] px-3 py-1.5 disabled:opacity-40"
                          >
                            Confirm Reassign
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {task.description && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-app-text3">Description</label>
                  <p className="text-[13px] leading-relaxed text-app-text2">{task.description}</p>
                </div>
              )}

              {/* Relative Assets (Drive Links) */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-app-text3">Relative Assets / Drive Links</label>
                <div className="flex flex-col gap-2">
                  {(task.assets || []).map((asset, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-2 group">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-surface flex items-center justify-center flex-shrink-0 text-primary">
                          <span className="material-symbols-outlined text-[16px]">link</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-text truncate">{asset.name}</p>
                          <a href={asset.url} target="_blank" rel="noreferrer" className="text-[11px] text-text-3 hover:text-primary hover:underline truncate block">
                            {asset.url}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!task.assets || task.assets.length < 3) ? (
                    <div className="flex gap-2 mt-1">
                      <input 
                        type="text" 
                        placeholder="Name (e.g. Raw Footage)" 
                        className="input-base text-[12px] flex-1" 
                        value={newAssetName}
                        onChange={e => setNewAssetName(e.target.value)}
                      />
                      <input 
                        type="url" 
                        placeholder="Drive/Link URL" 
                        className="input-base text-[12px] flex-1" 
                        value={newAssetUrl}
                        onChange={e => setNewAssetUrl(e.target.value)}
                      />
                      <button 
                        className="btn-primary px-3 text-[12px]"
                        disabled={!newAssetName || !newAssetUrl}
                        onClick={() => {
                          const updatedAssets = [...(task.assets || []), { name: newAssetName, url: newAssetUrl }];
                          updateTask(task.id, { assets: updatedAssets });
                          setNewAssetName('');
                          setNewAssetUrl('');
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-3 italic">Maximum 3 assets reached. Please use comments for more links.</p>
                  )}
                </div>
              </div>

              {/* Subtasks (if Goal) */}
              {task.type === 'goal' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-app-text3">Subtasks</label>
                  <div className="flex flex-col gap-2">
                    {state.tasks.filter(t => t.parentId === task.id).length === 0 && (
                      <p className="text-[12px] text-text-3 italic">No subtasks found.</p>
                    )}
                    {state.tasks.filter(t => t.parentId === task.id).map(st => (
                      <div key={st.id} className="p-3 rounded-lg flex items-center justify-between bg-surface-2 border border-border group">
                        <div className="flex-1">
                           <div className="text-[13px] font-bold text-text group-hover:text-primary transition-colors cursor-pointer" onClick={() => onTaskSelect && onTaskSelect(st.id)}>{st.title}</div>
                           <div className="text-[11px] text-text-2 mt-0.5 flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[st.status].color }}></span>
                             {STATUS_CONFIG[st.status].label}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approvals */}
              {task.approvals && task.approvals.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-app-text3">Approvals</label>
                  <div className="flex flex-col gap-2">
                    {task.approvals.map(a => {
                      const approver = state.teamMembers.find(m => m.id === a.approver);
                      return (
                        <div key={a.id} className="p-3 rounded-lg bg-surface-2 border border-border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-[12px] font-bold text-text capitalize">{a.type} Request</div>
                              <div className="text-[11px] text-text-2 mt-0.5">Approver: {approver?.name || a.approver}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${a.status === 'pending' ? 'bg-amber-500/20 text-amber-500' : a.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                              {a.status}
                            </span>
                          </div>
                          {a.requestMessage && <div className="text-[12px] text-text-2 italic bg-surface p-2 rounded">&quot;{a.requestMessage}&quot;</div>}
                          {a.status === 'pending' && state.currentUserId === a.approver && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => resolveApproval(task.id, a.id, 'approved')} className="text-[11px] font-bold px-3 py-1.5 bg-emerald-500/20 text-emerald-500 rounded transition-colors hover:bg-emerald-500/30">Approve</button>
                              <button onClick={() => resolveApproval(task.id, a.id, 'rejected')} className="text-[11px] font-bold px-3 py-1.5 bg-red-500/20 text-red-500 rounded transition-colors hover:bg-red-500/30">Reject</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Review Comments */}
              {task.reviewComments && task.reviewComments.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-pink-500">Rework Feedback</label>
                  <div className="flex flex-col gap-2">
                    {task.reviewComments.map(rc => {
                      const author = state.teamMembers.find(m => m.id === rc.authorId);
                      return (
                        <div key={rc.id} className="p-3 rounded-lg bg-pink-500/5 border border-pink-500/20">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold text-pink-600">{author?.name || 'Admin'}</span>
                            <span className="text-[10px] text-pink-500/70">{new Date(rc.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[13px] text-text-2">{rc.text}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Admin Review Flow */}
              {task.status === 'in_review' && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-amber-600">Admin Review</label>
                  {task.submissionNotes && (
                    <div className="mb-3 p-3 bg-surface rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-text-3 uppercase mb-1">Submission Notes</p>
                      <p className="text-[12px] text-text-2">{task.submissionNotes}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setTaskStatus(task.id, 'done');
                        if (timerRunning) requestStopTimer(task.id);
                      }}
                      className="flex-1 py-2 bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-lg text-[12px] font-bold hover:bg-emerald-500/30 transition-colors"
                    >
                      Approve (Done)
                    </button>
                    <button 
                      onClick={() => {
                        const reason = window.prompt('Rework Reason:');
                        if (reason) {
                           addReviewComment(task.id, reason);
                           setTaskStatus(task.id, 'rework');
                        }
                      }}
                      className="flex-1 py-2 bg-pink-500/20 text-pink-600 border border-pink-500/30 rounded-lg text-[12px] font-bold hover:bg-pink-500/30 transition-colors"
                    >
                      Request Rework
                    </button>
                  </div>
                </div>
              )}

              {/* Timer control */}
              {task.status !== 'done' && (
                <button
                  onClick={() => {
                    if (timerRunning) {
                      requestStopTimer(task.id);
                    } else {
                      // The person who assigned this task to someone else shouldn't be able
                      // to start it on their behalf — only an actual assignee can, no
                      // exceptions (not even leadership/admin, even if they're the creator).
                      const isGenuineAssignee = task.assignedTo.includes(state.currentUserId);
                      if (!isGenuineAssignee) {
                        alert("Only an assignee can start this task.");
                        return;
                      }
                      startTimer(task.id);
                      if (task.status === 'todo') setTaskStatus(task.id, 'in_progress');
                    }
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all font-grotesk border ${timerRunning ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-primary/10 text-primary border-primary/30'}`}
                >
                  {timerRunning ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                  {timerRunning ? 'Complete Task' : 'Start Task'}
                </button>
              )}

              {/* Comment box */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2 text-app-text3">Add Comment</label>
                <textarea
                  className="input-base resize-none"
                  rows={3}
                  placeholder="Add a note or update..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <button
                  onClick={() => {
                    addReviewComment(task.id, comment);
                    setComment('');
                  }}
                  disabled={!comment.trim()}
                  className="btn-primary mt-2 text-[11px] py-1.5"
                  style={{ opacity: comment.trim() ? 1 : 0.4 }}
                >
                  Post
                </button>
              </div>
            </div>
          )}

          {/* ── TIME LOG TAB ── */}
          {tab === 'timelog' && (
            <div className="p-5 space-y-5">
              {/* Summary */}
              <div className="rounded-xl p-4 flex items-center justify-between bg-app-surface2 border border-app-border">
                <div>
                  <p className="text-[12px] mb-1 text-app-text2">Total Logged</p>
                  <div className="font-bold text-[18px] font-grotesk">
                    {timer ? <LiveTimer startedAt={timer.startedAt} accumulatedMinutes={task.loggedMinutes} /> : (
                      <span className="font-mono">{Math.floor(task.loggedMinutes/60)}:{String(task.loggedMinutes%60).padStart(2,'0')}</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="text-[12px] mb-1 text-app-text2">Estimate</p>
                  <p className="font-bold text-[22px] num text-app-text">{task.estimatedHours}h</p>
                </div>
              </div>

              {/* Circular progress */}
              <div className="flex justify-center">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--c-surface-3)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={pct >= 100 ? '#EF4444' : '#2AB182'}
                      strokeWidth="3"
                      strokeDasharray={`${Math.min(pct, 100)} 100`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`font-bold text-[22px] num ${pct >= 100 ? 'text-red-500' : 'text-app-text'}`}>{pct}%</span>
                  </div>
                </div>
              </div>

              {/* Manual log entry */}
              <div className="rounded-xl p-4 bg-app-surface2 border border-app-border">
                <p className="text-[12px] font-semibold mb-3 uppercase tracking-wide text-app-text2">Log Time Manually</p>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <input type="number" min="0" max="23" className="input-base" placeholder="0" value={manualHours}
                      onChange={e => setManualHours(e.target.value)} />
                    <p className="text-[10px] mt-1 text-center text-app-text3">Hours</p>
                  </div>
                  <div className="flex-1">
                    <input type="number" min="0" max="59" className="input-base" placeholder="0" value={manualMins}
                      onChange={e => setManualMins(e.target.value)} />
                    <p className="text-[10px] mt-1 text-center text-app-text3">Minutes</p>
                  </div>
                </div>
                <input className="input-base mb-3" placeholder="Note (optional)" value={logNote}
                  onChange={e => setLogNote(e.target.value)} />
                <button onClick={handleManualLog} className="btn-primary w-full justify-center">
                  <PlusCircle className="w-4 h-4" />
                  Add Time Entry
                </button>
              </div>
            </div>
          )}

          {/* ── AUDIT TAB ── */}
          {tab === 'audit' && (
            <div className="p-5">
              {taskAudit.length === 0 ? (
                <p className="text-center py-12 text-[13px] text-app-text3">No audit entries for this task.</p>
              ) : (
                <div className="space-y-2">
                  {taskAudit.map(entry => (
                    <div key={entry.id} className="flex gap-3 p-3 rounded-lg bg-app-surface2 border border-app-border">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white"
                        style={{ background: '#7C3AED' }}>
                        {entry.actor.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-app-text">
                          {entry.actor} <span className="font-normal text-app-text2">— {entry.action.replace(/_/g, ' ')}</span>
                        </p>
                        <p className="text-[11px] text-app-text3">
                          {entry.meta} · {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        task={task}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
      />
    </>
  );
}
