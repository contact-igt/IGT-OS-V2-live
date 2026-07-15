'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';

import { Task, CLIENTS, TEAM_MEMBERS, CATEGORY_LABELS, TaskCategory, DEFAULT_BENCHMARKS } from '@/lib/data';

interface Props { isOpen: boolean; onClose: () => void; defaultClientId?: string; defaultTitle?: string; defaultType?: 'goal' | 'task' | 'subtask'; }

const PRIORITIES: Task['priority'][] = ['critical', 'high', 'medium', 'low'];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as TaskCategory[];

const PRIORITY_COLORS = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#94A3B8'
};

export default function NewTaskModal({ isOpen, onClose, defaultClientId, defaultTitle, defaultType }: Props) {
  const { createTask, state, requestApproval } = useApp();

  const [form, setForm] = useState({
    title: '',
    type: 'task' as 'goal' | 'task' | 'subtask',
    parentId: '',
    clientId: defaultClientId ?? '',
    category: 'performance_marketing' as TaskCategory,
    priority: 'high' as Task['priority'],
    assignedTo: (state.teamMembers.find(m => m.id === state.currentUserId)?.role === "admin" || state.teamMembers.find(m => m.id === state.currentUserId)?.role === "super_admin" || state.teamMembers.find(m => m.id === state.currentUserId)?.roleTag === "leadership") ? [] : [state.currentUserId],
    deadline: '',
    estimatedHours: '',
    description: '',
    tags: '',
    driveLink: '',
    requiresAsset: false,
    subtasksBatch: '',
    fileName: '',
    taskType: '',
    dependencies: [] as string[],
  });

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
      const isLeadership = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.roleTag === 'leadership';
      
      setForm({
        title: defaultTitle || '',
        type: defaultType || 'task',
        parentId: '',
        clientId: defaultClientId ?? '',
        category: 'performance_marketing',
        priority: 'high',
        assignedTo: isLeadership ? [] : [state.currentUserId],
        deadline: '',
        estimatedHours: '',
        description: '',
        tags: '',
        driveLink: '',
        requiresAsset: false,
        subtasksBatch: '',
        fileName: '',
        taskType: '',
        dependencies: [],
      });
      setIsBatchMode(false);
      setBatchTitles('');
      setErrors({});
      setActiveTab('manual');
      setAiPrompt('');
    }
  }, [isOpen, defaultTitle, defaultType, defaultClientId, state.currentUserId, state.teamMembers]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isAssigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchTitles, setBatchTitles] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const set = (k: string, v: string | string[]) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const toggleAssignee = (id: string) => {
    set('assignedTo', form.assignedTo.includes(id)
      ? form.assignedTo.filter(x => x !== id)
      : [...form.assignedTo, id]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (isBatchMode) {
      if (!batchTitles.trim()) e.batchTitles = 'At least one title is required';
    } else {
      if (!form.title.trim()) e.title = 'Title is required';
    }
    if (!form.clientId) e.clientId = 'Client is required';
    if (!form.deadline) e.deadline = 'Deadline is required';
    if (form.type === 'subtask' && !form.parentId) e.parentId = 'Parent Task is required for subtasks';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    
    const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
    const isLeadership = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.roleTag === 'leadership';
    const ceo = state.teamMembers.find(m => m.role === 'super_admin');
    
    const assets = form.driveLink.trim() ? [{ name: 'Drive Link', url: form.driveLink.trim() }] : [];
    
    if (isBatchMode) {
      const titles = batchTitles.split('\n').map(s => s.trim()).filter(Boolean);
      titles.forEach(title => {
        const newTaskId = `TSK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        createTask({
          id: newTaskId,
          title,
          type: form.type,
          parentId: form.type === 'subtask' ? form.parentId : undefined,
          clientId: form.clientId,
          category: form.category,
          priority: form.priority,
          status: 'todo',
          assignedTo: form.assignedTo,
          createdBy: state.currentUserId,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
          estimatedHours: parseFloat(form.estimatedHours) || 0,
          description: form.description.trim(),
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          assets: assets.length > 0 ? assets : undefined,
          requiresAsset: form.requiresAsset,
          taskType: form.taskType || undefined,
          dependencies: form.dependencies.length > 0 ? form.dependencies : undefined,
        });
        if (!isLeadership && ceo && form.assignedTo.includes(state.currentUserId)) {
          requestApproval(newTaskId, ceo.id, 'self_assignment', 'User self-assigned a new batch task');
        }
      });
    } else {
      const newTaskId = `TSK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      createTask({
        id: newTaskId,
        title: form.title.trim(),
        type: form.type,
        parentId: form.type === 'subtask' ? form.parentId : undefined,
        clientId: form.clientId,
        category: form.category,
        priority: form.priority,
        status: 'todo',
        assignedTo: form.assignedTo,
        createdBy: state.currentUserId,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        estimatedHours: parseFloat(form.estimatedHours) || 0,
        description: form.description.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        assets: assets.length > 0 ? assets : undefined,
        requiresAsset: form.requiresAsset,
        taskType: form.taskType || undefined,
        dependencies: form.dependencies.length > 0 ? form.dependencies : undefined,
      });

      if (!isLeadership && ceo && form.assignedTo.includes(state.currentUserId)) {
        requestApproval(newTaskId, ceo.id, 'self_assignment', 'User self-assigned a new task');
      }

      if (form.type === 'goal' && form.subtasksBatch.trim()) {
        const subtasks = form.subtasksBatch.split('\n').map(s => s.trim()).filter(Boolean);
        subtasks.forEach(title => {
          const newSubtaskId = `TSK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
          createTask({
            id: newSubtaskId,
            title: title,
            type: 'subtask',
            parentId: newTaskId,
            clientId: form.clientId,
            category: form.category,
            priority: form.priority,
            status: 'todo',
            assignedTo: form.assignedTo,
            createdBy: state.currentUserId,
            deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
            estimatedHours: 0,
            description: '',
            tags: [],
            requiresAsset: false,
            taskType: form.taskType || undefined,
            dependencies: form.dependencies.length > 0 ? form.dependencies : undefined,
          });
          if (!isLeadership && ceo && form.assignedTo.includes(state.currentUserId)) {
            requestApproval(newSubtaskId, ceo.id, 'self_assignment', 'User self-assigned a new batch subtask');
          }
        });
      }
    }

    setSubmitting(false);
    setBatchTitles('');
    setForm({ title: '', type: 'task', parentId: '', clientId: defaultClientId ?? '', category: 'performance_marketing', priority: 'high', assignedTo: [], deadline: '', estimatedHours: '', description: '', tags: '', driveLink: '', requiresAsset: false, subtasksBatch: '', fileName: '', taskType: '', dependencies: [] });
    setErrors({});
    onClose();
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          clients: CLIENTS,
          teamMembers: state.teamMembers,
          categories: CATEGORIES
        })
      });
      if (res.ok) {
        const parsed = await res.json();
        setForm(p => ({ ...p, ...parsed }));
        setActiveTab('manual');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[120]" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed z-[121] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col"
        style={{
          maxWidth: 580,
          maxHeight: '90vh',
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border-strong)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.15)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563EB', fontVariationSettings: "'FILL' 1" }}>add_task</span>
            </div>
            <h2 className="font-bold text-[16px]" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>New Task</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors" style={{ color: 'var(--c-text-2)', background: 'var(--c-hover)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 mt-2">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-4 text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'manual' ? 'border-primary text-primary' : 'border-transparent text-text-3 hover:text-text-2'}`}
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Manual Entry
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`py-2 px-4 text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ai' ? 'border-primary text-primary' : 'border-transparent text-text-3 hover:text-text-2'}`}
          >
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
            AI Creation
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {activeTab === 'ai' ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>Describe the task</label>
                <textarea 
                  className="input-base resize-none h-32" 
                  placeholder="e.g. Create a performance marketing task for WhatsNexus assigned to Sushil due tomorrow at 5pm."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </div>
              <button 
                type="button"
                onClick={handleGenerateAI}
                disabled={isGenerating || !aiPrompt.trim()}
                className="btn-primary w-full py-3 text-[14px] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    Generate Task Details
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Batch Toggle */}
              <div className="flex items-center gap-2 mb-2 bg-[var(--c-surface-2)] p-1.5 rounded-lg border border-[var(--c-border)] w-fit">
                <button
                  type="button"
                  onClick={() => setIsBatchMode(false)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors ${!isBatchMode ? 'bg-[var(--c-surface)] shadow-sm text-[var(--c-text)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-2)]'}`}
                >
                  Single Task
                </button>
                <button
                  type="button"
                  onClick={() => setIsBatchMode(true)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors ${isBatchMode ? 'bg-[var(--c-surface)] shadow-sm text-[var(--c-text)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text-2)]'}`}
                >
                  Batch Create
                </button>
              </div>

              {/* Title(s) */}
              {isBatchMode ? (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 flex justify-between" style={{ color: 'var(--c-text-2)' }}>
                    <span>Task Titles (One per line) <span className="text-red-500">*</span></span>
                    <span className="text-[10px] text-text-3 font-normal normal-case">Each line creates a new task</span>
                  </label>
                  <textarea
                    className="input-base resize-y"
                    rows={6}
                    placeholder="e.g. WhatsNexus Lead Tracking Setup&#10;Create Meta Ads Campaign&#10;Design new landing page"
                    value={batchTitles}
                    onChange={e => { setBatchTitles(e.target.value); if (errors.batchTitles) setErrors(p => ({ ...p, batchTitles: '' })) }}
                  />
                  {errors.batchTitles && <p className="text-[11px] mt-1 text-red-500">{errors.batchTitles}</p>}
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-base"
                    placeholder="e.g. WhatsNexus Lead Tracking Setup"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                  />
                  {errors.title && <p className="text-[11px] mt-1 text-red-500">{errors.title}</p>}
                </div>
              )}

          {/* Type + Client + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Task Type</label>
              <select className="input-base" value={form.type} onChange={e => {
                set('type', e.target.value);
                if (e.target.value !== 'subtask') set('parentId', '');
              }}>
                <option value="goal">Goal (Project)</option>
                <option value="task">Standard Task</option>
                <option value="subtask">Subtask</option>
              </select>
            </div>
            {form.type === 'subtask' ? (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>
                  Parent Task <span className="text-red-500">*</span>
                </label>
                <select className="input-base" value={form.parentId} onChange={e => set('parentId', e.target.value)}>
                  <option value="">Select Parent Task…</option>
                  {state.tasks.filter(t => t.type === 'goal' || t.type === 'task').map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                {errors.parentId && <p className="text-[11px] mt-1 text-red-500">{errors.parentId}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>
                  Client <span className="text-red-500">*</span>
                </label>
                <select className="input-base" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                  <option value="">Select client…</option>
                  {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.clientId && <p className="text-[11px] mt-1 text-red-500">{errors.clientId}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {form.type === 'subtask' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>
                  Client <span className="text-red-500">*</span>
                </label>
                <select className="input-base" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                  <option value="">Select client…</option>
                  {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.clientId && <p className="text-[11px] mt-1 text-red-500">{errors.clientId}</p>}
              </div>
            )}
            <div className={form.type !== 'subtask' ? "col-span-2" : ""}>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Category</label>
              <select className="input-base" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Task Type (Optional)</label>
            <select className="input-base" value={form.taskType} onChange={e => set('taskType', e.target.value)}>
              <option value="">None</option>
              {Object.keys(DEFAULT_BENCHMARKS).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('priority', p)}
                  className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase transition"
                  style={{
                    background: form.priority === p ? `${PRIORITY_COLORS[p]}20` : 'var(--c-surface-2)',
                    color: form.priority === p ? PRIORITY_COLORS[p] : 'var(--c-text-2)',
                    border: `1px solid ${form.priority === p ? PRIORITY_COLORS[p] + '40' : 'var(--c-border)'}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline + Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>
                Deadline <span className="text-red-500">*</span>
              </label>
              <input 
                type="datetime-local" 
                className="input-base" 
                value={form.deadline} 
                onChange={e => set('deadline', e.target.value)} 
                onClick={(e: any) => { try { e.target.showPicker(); } catch (err) {} }}
                onFocus={(e: any) => { try { e.target.showPicker(); } catch (err) {} }}
              />
              {errors.deadline && <p className="text-[11px] mt-1 text-red-500">{errors.deadline}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Estimate (hours)</label>
              <input type="number" min="0.5" step="0.5" className="input-base" placeholder="e.g. 4" value={form.estimatedHours}
                onChange={e => set('estimatedHours', e.target.value)} />
            </div>
          </div>

          {/* Assignees */}
          <div className="relative">
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>Assignees</label>
            {(() => {
              const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
              const isLeadership = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.roleTag === 'leadership';
              
              if (!isLeadership) {
                return (
                  <div className="input-base min-h-[42px] flex items-center flex-wrap gap-1.5 opacity-70 cursor-not-allowed">
                    {form.assignedTo.map(id => {
                      const m = state.teamMembers.find(t => t.id === id);
                      if (!m) return null;
                      return (
                        <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-2 border border-border text-[11px] font-medium text-text">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ background: m.color || '#94A3B8' }}>
                            {m.initials || m.name.charAt(0)}
                          </div>
                          {m.name.split(' ')[0]}
                        </div>
                      );
                    })}
                  </div>
                );
              }
              
              return (
                <div 
                  className="input-base min-h-[42px] flex items-center flex-wrap gap-1.5 cursor-pointer"
                  onClick={() => setAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                >
                  {form.assignedTo.length === 0 && (
                    <span className="text-text-3 text-[13px]">Select team members...</span>
                  )}
                  {form.assignedTo.map(id => {
                    const m = state.teamMembers.find(t => t.id === id);
                    if (!m) return null;
                    return (
                      <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-2 border border-border text-[11px] font-medium text-text">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ background: m.color || '#94A3B8' }}>
                          {m.initials || m.name.charAt(0)}
                        </div>
                        {m.name.split(' ')[0]}
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleAssignee(m.id); }} className="text-text-3 hover:text-red-500 ml-1">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            
            {(() => {
              const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
              const isLeadership = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.roleTag === 'leadership';
              
              if (!isLeadership) return null;
              
              return isAssigneeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAssigneeDropdownOpen(false)} />
                  <div className="absolute z-20 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-[220px] overflow-y-auto custom-scrollbar">
                    {state.teamMembers.map(m => {
                      const selected = form.assignedTo.includes(m.id);
                      return (
                        <div 
                          key={m.id}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-hover transition-colors"
                          onClick={() => {
                            toggleAssignee(m.id);
                          }}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: m.color || '#94A3B8' }}>
                            {m.initials || m.name.charAt(0)}
                          </div>
                          <div className="flex-1 text-[13px] text-text font-medium">{m.name}</div>
                          {selected && <span className="material-symbols-outlined text-primary text-[18px]">check</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Subtasks Batch for Goals */}
          {!isBatchMode && form.type === 'goal' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: 'var(--c-text-2)' }}>
                <span className="material-symbols-outlined text-[14px]">format_list_bulleted</span> Batch Create Subtasks
              </label>
              <textarea 
                className="input-base resize-y" 
                rows={6} 
                placeholder="Enter subtask titles, one per line..."
                value={form.subtasksBatch} 
                onChange={e => set('subtasksBatch', e.target.value)} 
              />
              <p className="text-[10px] text-text-3 mt-1">Each line will be created as a separate subtask under this goal, assigned to the same team.</p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Description</label>
            <textarea className="input-base resize-y" rows={6} placeholder="What needs to be done?"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Drive Link & Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Drive / Asset Link</label>
              <div className="flex flex-col gap-2">
                <input className="input-base" placeholder="https://drive.google.com/..." value={form.driveLink}
                  onChange={e => set('driveLink', e.target.value)} />
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-outline text-[11px] py-1 px-2 flex-1 border-dashed" onClick={() => setForm(p => ({...p, fileName: 'mock_asset_file.zip'}))}>
                    <span className="material-symbols-outlined text-[14px]">upload_file</span> {form.fileName || 'Attach File'}
                  </button>
                  {form.fileName && (
                    <button type="button" className="text-red-500 hover:bg-red-500/10 p-1 rounded" onClick={() => setForm(p => ({...p, fileName: ''}))}>
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Tags (comma-separated)</label>
              <input className="input-base" placeholder="meta, campaign, design" value={form.tags}
                onChange={e => set('tags', e.target.value)} />
            </div>
          </div>
          
          <div className="mt-2 flex items-center gap-2 bg-surface-2 p-3 rounded-lg border border-border">
            <input 
              type="checkbox" 
              id="requiresAsset" 
              checked={form.requiresAsset}
              onChange={e => setForm(p => ({ ...p, requiresAsset: e.target.checked }))}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="requiresAsset" className="text-[12px] font-medium text-text cursor-pointer">
              Require asset attachment on completion
            </label>
          </div>
          </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--c-border)' }}>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary"
            style={{ opacity: submitting ? 0.7 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_task</span>
            Create Task
          </button>
        </div>
      </div>
    </>
  );
}
