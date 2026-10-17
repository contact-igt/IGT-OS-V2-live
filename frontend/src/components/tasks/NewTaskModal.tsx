'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/contexts/AppContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import DateTimePicker from '@/components/ui/DateTimePicker';

import { Task, TEAM_MEMBERS, CATEGORY_LABELS, TaskCategory, DEFAULT_BENCHMARKS, TASK_TYPE_LABELS } from '@/lib/data';
import { aiFetch } from '@/lib/aiFetch';
import { useProjects, isOpenProject } from '@/lib/useProjects';

interface Props { isOpen: boolean; onClose: () => void; defaultClientId?: string; defaultTitle?: string; defaultType?: 'goal' | 'task' | 'subtask'; defaultProjectId?: string; }

const PRIORITIES: Task['priority'][] = ['critical', 'high', 'medium', 'low'];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as TaskCategory[];

const PRIORITY_COLORS = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#94A3B8'
};

// Mirrors MAX_UPLOAD_BYTES in backend/src/routes/tasks.ts — checked here too so an
// oversized file is rejected before it's sent rather than after a wasted round trip.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Sentinel for the "+ New task type…" entry at the bottom of the Task Type dropdown. Kept
// distinct from any real type so picking it can never be mistaken for a genuine value.
const NEW_TASK_TYPE_OPTION = '__new_task_type__';

const isLeadershipMember = (m?: { role?: string; roleTag?: string } | null) =>
  m?.role === 'super_admin' || m?.role === 'admin' || m?.roleTag === 'leadership';

// Real accounts are keyed by backend DB ids now, not the old mock roster's 'u-*' ids — match
// these two people by email (stable across environments) instead of a dead mock id that never
// matches a hydrated teamMembers entry.
const THARIQ_EMAIL = 'thariq.dev@gmail.com';
const ABHILASH_EMAIL = 'connect@invictusglobaltech.com';

// Assignment hierarchy: leadership and the CTO can assign to anyone (Thariq's cross-department
// assignments are gated by an approval/notify side-effect in handleSubmit, not by hiding options);
// Abhilash (Operations Manager) can assign to anyone except leadership/the CTO; everyone else
// (department heads included) can assign within their own department, so teammates can hand
// tasks to one another, not just top-down from the head; anyone without a department is locked
// to self-assignment.
function getAssignmentScope(currentUser: any, teamMembers: any[]): { mode: 'open' | 'locked'; options: any[] } {
  if (!currentUser) return { mode: 'locked', options: [] };
  if (isLeadershipMember(currentUser) || currentUser.email === THARIQ_EMAIL) {
    return { mode: 'open', options: teamMembers };
  }
  if (currentUser.email === ABHILASH_EMAIL) {
    return { mode: 'open', options: teamMembers.filter(m => !isLeadershipMember(m) && m.email !== THARIQ_EMAIL) };
  }
  if (currentUser.department) {
    return { mode: 'open', options: teamMembers.filter(m => m.department === currentUser.department && !isLeadershipMember(m)) };
  }
  return { mode: 'locked', options: [] };
}

// Client dropdown with an inline "+ New Client" quick-add (name + short code only —
// full details like retainer/contact get filled in later from the Clients page).
function ClientPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { state, createClient } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) { setAddError('Client name is required'); return; }
    if (newCode.trim().length < 3 || newCode.trim().length > 4) { setAddError('Code must be 3-4 characters'); return; }
    setSaving(true);
    setAddError('');
    const result = await createClient(newName.trim(), newCode.trim());
    setSaving(false);
    if ('error' in result) { setAddError(result.error); return; }
    onChange(result.id);
    setAdding(false);
    setNewName('');
    setNewCode('');
  };

  if (adding) {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-lg border" style={{ borderColor: 'var(--c-border)' }}>
        <div className="flex gap-2">
          <input className="input-base flex-1" placeholder="Client name" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          <input className="input-base w-20" placeholder="Code" maxLength={4} value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} />
        </div>
        {addError && <p className="text-[11px] text-red-500">{addError}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" className="text-[12px] px-3 py-1.5" style={{ color: 'var(--c-text-2)' }} onClick={() => { setAdding(false); setAddError(''); setNewName(''); setNewCode(''); }}>Cancel</button>
          <button type="button" className="btn-primary text-[12px] px-3 py-1.5" disabled={saving} onClick={handleCreate}>{saving ? 'Adding…' : 'Add Client'}</button>
        </div>
      </div>
    );
  }

  return (
    <select
      className="input-base"
      value={value}
      onChange={e => { if (e.target.value === '__new__') setAdding(true); else onChange(e.target.value); }}
    >
      <option value="">Select client…</option>
      {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      <option value="__new__">+ New Client…</option>
    </select>
  );
}

export default function NewTaskModal({ isOpen, onClose, defaultClientId, defaultTitle, defaultType, defaultProjectId }: Props) {
  const { projects } = useProjects();
  const { createTask, state, requestApproval, notifyUser, uploadTaskFile, reloadData } = useApp();
  const confirm = useConfirm();
  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  const scope = getAssignmentScope(currentUser, state.teamMembers);

  // Held until the task exists — a file can only be attached to a task that has a real
  // backend id, so the upload happens right after createTask() resolves.
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // True once "+ New task type…" is picked, which swaps in a text box for the custom value.
  const [isCustomTaskType, setIsCustomTaskType] = useState(false);

  const [form, setForm] = useState({
    title: '',
    type: 'task' as 'goal' | 'task' | 'subtask',
    parentId: '',
    clientId: defaultClientId ?? '',
    projectId: defaultProjectId ?? '',
    category: 'performance_marketing' as TaskCategory,
    priority: 'high' as Task['priority'],
    assignedTo: scope.mode === 'locked' ? [state.currentUserId] : [],
    deadline: '',
    estimatedHours: '',
    estimatedMinutes: '',
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
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isAssigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const assigneeTriggerRef = useRef<HTMLDivElement>(null);
  const assigneePortalRef = useRef<HTMLDivElement>(null);
  const assigneeSearchRef = useRef<HTMLInputElement>(null);
  const [assigneeCoords, setAssigneeCoords] = useState({ top: 0, left: 0, width: 0 });
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchTitles, setBatchTitles] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: defaultTitle || '',
        type: defaultType || 'task',
        parentId: '',
        clientId: defaultClientId ?? '',
        projectId: defaultProjectId ?? '',
        category: 'performance_marketing',
        priority: 'high',
        assignedTo: scope.mode === 'locked' ? [state.currentUserId] : [],
        deadline: '',
        estimatedHours: '',
        estimatedMinutes: '',
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
      setIsCustomTaskType(false);
      setAttachedFile(null);
      setUploadError(null);
      setActiveTab('manual');
      setAiPrompt('');
    }
  }, [isOpen, defaultTitle, defaultType, defaultClientId, defaultProjectId, state.currentUserId, state.teamMembers]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAssigneeDropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        assigneeTriggerRef.current && !assigneeTriggerRef.current.contains(event.target as Node) &&
        (!assigneePortalRef.current || !assigneePortalRef.current.contains(event.target as Node))
      ) {
        setAssigneeDropdownOpen(false);
      }
    }
    function handleScroll(event: Event) {
      // Scrolling inside the dropdown's own list (or its search box) shouldn't close it —
      // only scrolling of an ancestor (e.g. the modal body moving the trigger) should.
      if (assigneePortalRef.current && event.target instanceof Node && assigneePortalRef.current.contains(event.target)) {
        return;
      }
      setAssigneeDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isAssigneeDropdownOpen]);

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

  const handleAssigneeToggleOpen = () => {
    if (!isAssigneeDropdownOpen && assigneeTriggerRef.current) {
      const rect = assigneeTriggerRef.current.getBoundingClientRect();
      setAssigneeCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
      setAssigneeSearch('');
      setTimeout(() => assigneeSearchRef.current?.focus(), 0);
    }
    setAssigneeDropdownOpen(!isAssigneeDropdownOpen);
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
    if (form.assignedTo.length === 0) {
      e.assignedTo = 'Assign at least one team member';
    } else if (!isLeadershipMember(currentUser) && currentUser?.email !== THARIQ_EMAIL) {
      const targetsLeadershipOrCto = form.assignedTo.some(id => {
        const m = state.teamMembers.find(t => t.id === id);
        return m && (isLeadershipMember(m) || m.email === THARIQ_EMAIL);
      });
      if (targetsLeadershipOrCto) e.assignedTo = 'You cannot assign tasks to leadership';
    }
    return e;
  };

  // Projects of the chosen client only (closed ones hidden unless already chosen). A project picked before the client
  // changed is dropped rather than sent: the server refuses cross-client links.
  const projectOptions = projects.filter(p => p.client_id === form.clientId && (isOpenProject(p) || p.id === form.projectId));
  const effectiveProjectId = projectOptions.some(p => p.id === form.projectId) ? form.projectId : '';

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);

    const isThariq = currentUser?.email === THARIQ_EMAIL;
    const ceo = state.teamMembers.find(m => m.role === 'super_admin');
    // Leadership, Thariq, Abhilash, and department heads manage their own assignments without
    // a CEO self-assignment approval request. Regular team members still need approval to
    // self-assign even though department scoping now also lets them assign to teammates.
    const needsSelfAssignApproval = !isLeadershipMember(currentUser) && currentUser?.email !== THARIQ_EMAIL
      && currentUser?.email !== ABHILASH_EMAIL && !currentUser?.isHeadOfDepartment;

    const applyThariqSideEffect = (taskId: string, taskTitle: string) => {
      if (!isThariq || !ceo) return;
      const allDev = form.assignedTo.every(id => state.teamMembers.find(m => m.id === id)?.department === 'Development');
      if (allDev) {
        const names = form.assignedTo.map(id => state.teamMembers.find(m => m.id === id)?.name).filter(Boolean).join(', ');
        notifyUser(ceo.id, `CTO has assigned "${taskTitle}" to ${names}`, taskId);
      } else {
        requestApproval(taskId, ceo.id, 'self_assignment', 'CTO assigned outside Development — requires Sushil/Anitha approval');
      }
    };

    const assets = form.driveLink.trim() ? [{ name: 'Drive Link', url: form.driveLink.trim() }] : [];
    
    if (isBatchMode) {
      const titles = batchTitles.split('\n').map(s => s.trim()).filter(Boolean);
      titles.forEach(title => {
        const newTaskId = `TSK-${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
        createTask({
          id: newTaskId,
          title,
          type: form.type,
          parentId: form.type === 'subtask' ? form.parentId : undefined,
          clientId: form.clientId,
          projectId: effectiveProjectId || undefined,
          category: form.category,
          priority: form.priority,
          status: 'todo',
          assignedTo: form.assignedTo,
          createdBy: state.currentUserId,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
          estimatedHours: (parseFloat(form.estimatedHours) || 0) + (parseFloat(form.estimatedMinutes) || 0) / 60,
          description: form.description.trim(),
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          assets: assets.length > 0 ? assets : undefined,
          requiresAsset: form.requiresAsset,
          taskType: form.taskType || undefined,
          dependencies: form.dependencies.length > 0 ? form.dependencies : undefined,
        });
        applyThariqSideEffect(newTaskId, title);
        if (needsSelfAssignApproval && ceo && form.assignedTo.includes(state.currentUserId)) {
          requestApproval(newTaskId, ceo.id, 'self_assignment', 'User self-assigned a new batch task');
        }
      });
    } else {
      const newTaskId = `TSK-${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
      const createdIdPromise = createTask({
        id: newTaskId,
        title: form.title.trim(),
        type: form.type,
        parentId: form.type === 'subtask' ? form.parentId : undefined,
        clientId: form.clientId,
        projectId: effectiveProjectId || undefined,
        category: form.category,
        priority: form.priority,
        status: 'todo',
        assignedTo: form.assignedTo,
        createdBy: state.currentUserId,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        estimatedHours: (parseFloat(form.estimatedHours) || 0) + (parseFloat(form.estimatedMinutes) || 0) / 60,
        description: form.description.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        assets: assets.length > 0 ? assets : undefined,
        requiresAsset: form.requiresAsset,
        taskType: form.taskType || undefined,
        dependencies: form.dependencies.length > 0 ? form.dependencies : undefined,
      });
      applyThariqSideEffect(newTaskId, form.title.trim());

      // Upload only once the task actually exists in Postgres — there's nothing to attach a
      // file to before that. Failures are surfaced and stop the modal from closing, so a
      // dropped attachment is never silently swallowed.
      if (attachedFile) {
        const realId = await createdIdPromise;
        if (!realId) {
          setUploadError('Task was created, but the file could not be attached (task not saved to the server).');
          setSubmitting(false);
          return;
        }
        const { error } = await uploadTaskFile(realId, attachedFile);
        if (error) {
          setUploadError(`Task created, but the file failed to upload: ${error}`);
          setSubmitting(false);
          return;
        }
        reloadData();
      }

      if (needsSelfAssignApproval && ceo && form.assignedTo.includes(state.currentUserId)) {
        requestApproval(newTaskId, ceo.id, 'self_assignment', 'User self-assigned a new task');
      }

      if (form.type === 'goal' && form.subtasksBatch.trim()) {
        // Wait for the goal's real backend id before creating its children — Postgres needs
        // a genuine parent UUID, and the local "TSK-…" placeholder isn't one. Falls back to
        // the local id if the goal never reached the server, so the subtasks still appear
        // locally rather than being dropped.
        const realParentId = (await createdIdPromise) || newTaskId;
        const subtasks = form.subtasksBatch.split('\n').map(s => s.trim()).filter(Boolean);
        subtasks.forEach(title => {
          const newSubtaskId = `TSK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
          createTask({
            id: newSubtaskId,
            title: title,
            type: 'subtask',
            parentId: realParentId,
            clientId: form.clientId,
            projectId: effectiveProjectId || undefined,
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
          applyThariqSideEffect(newSubtaskId, title);
          if (needsSelfAssignApproval && ceo && form.assignedTo.includes(state.currentUserId)) {
            requestApproval(newSubtaskId, ceo.id, 'self_assignment', 'User self-assigned a new batch subtask');
          }
        });
      }
    }

    setSubmitting(false);
    setBatchTitles('');
    setAttachedFile(null);
    setUploadError(null);
    setIsCustomTaskType(false);
    setForm({ title: '', type: 'task', parentId: '', clientId: defaultClientId ?? '', projectId: defaultProjectId ?? '', category: 'performance_marketing', priority: 'high', assignedTo: [], deadline: '', estimatedHours: '', estimatedMinutes: '', description: '', tags: '', driveLink: '', requiresAsset: false, subtasksBatch: '', fileName: '', taskType: '', dependencies: [] });
    setErrors({});
    onClose();
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError(null);
    try {
      const res = await aiFetch('/api/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          clients: state.clients,
          teamMembers: state.teamMembers,
          categories: CATEGORIES
        })
      });
      if (res.ok) {
        const parsed = await res.json();
        setForm(p => ({ ...p, ...parsed }));
        setActiveTab('manual');
      } else {
        const body = await res.json().catch(() => ({}));
        setAiError(body.error || `AI parsing failed (${res.status}). Create the task manually.`);
      }
    } catch (e: any) {
      console.error(e);
      setAiError(e?.message || 'AI parsing failed. Create the task manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isFormDirty = Boolean(form.title.trim() || form.description.trim() || batchTitles.trim() || form.driveLink.trim());
  const handleBackdropClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFormDirty) {
      onClose();
    } else if (await confirm('Discard unsaved task creation?', { confirmLabel: 'Discard', danger: true })) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[120]" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={handleBackdropClick} />

      {/* Modal */}
      <div
        className="fixed z-[121] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col"
        onClick={e => e.stopPropagation()}
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
              {aiError && <p role="alert" className="text-[12px]" style={{ color: 'var(--c-error)' }}>{aiError}</p>}
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
                <ClientPicker value={form.clientId} onChange={v => set('clientId', v)} />
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
                <ClientPicker value={form.clientId} onChange={v => set('clientId', v)} />
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

          {/* Project (optional) — only that client's projects; the project page and this task list stay in step. */}
          {form.clientId && projectOptions.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Project (Optional)</label>
              <select className="input-base" aria-label="Project" value={effectiveProjectId} onChange={e => set('projectId', e.target.value)}>
                <option value="">No project</option>
                {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Task Type — the usual dropdown, plus a "New task type" entry at the bottom that
              reveals a text box, so the assigner can add a type that isn't on the list yet. */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Task Type (Optional)</label>
            <select
              className="input-base"
              value={isCustomTaskType ? NEW_TASK_TYPE_OPTION : form.taskType}
              onChange={e => {
                if (e.target.value === NEW_TASK_TYPE_OPTION) {
                  setIsCustomTaskType(true);
                  set('taskType', ''); // start blank so the box below is theirs to fill
                } else {
                  setIsCustomTaskType(false);
                  set('taskType', e.target.value);
                }
              }}
            >
              <option value="">None</option>
              {Object.keys(DEFAULT_BENCHMARKS).map(t => (
                <option key={t} value={t}>{TASK_TYPE_LABELS[t] || t}</option>
              ))}
              <option value={NEW_TASK_TYPE_OPTION}>+ New task type…</option>
            </select>

            {isCustomTaskType && (
              <input
                className="input-base mt-2"
                placeholder="Enter the new task type"
                autoFocus
                value={form.taskType}
                onChange={e => set('taskType', e.target.value)}
              />
            )}
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
              <DateTimePicker
                value={form.deadline}
                onChange={v => set('deadline', v)}
                error={!!errors.deadline}
              />
              {errors.deadline && <p className="text-[11px] mt-1 text-red-500">{errors.deadline}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)' }}>Estimate</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min="0" step="1" className="input-base" placeholder="Hours" value={form.estimatedHours}
                  onChange={e => set('estimatedHours', e.target.value)} />
                <input type="number" min="0" max="59" step="1" className="input-base" placeholder="Minutes" value={form.estimatedMinutes}
                  onChange={e => set('estimatedMinutes', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Assignees */}
          <div className="relative">
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>Assignees</label>
            {scope.mode === 'locked' ? (
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
            ) : (
              <div
                ref={assigneeTriggerRef}
                className="input-base min-h-[42px] flex items-center flex-wrap gap-1.5 cursor-pointer"
                onClick={handleAssigneeToggleOpen}
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
            )}
            {errors.assignedTo && <p className="text-[11px] mt-1 text-red-500">{errors.assignedTo}</p>}

            {scope.mode === 'open' && isAssigneeDropdownOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={assigneePortalRef}
                className="fixed z-[130] mt-1 bg-surface border border-border rounded-lg shadow-lg flex flex-col"
                style={{ top: assigneeCoords.top, left: assigneeCoords.left, width: assigneeCoords.width, maxHeight: 260 }}
              >
                <div className="p-2 border-b border-border flex-shrink-0">
                  <input
                    ref={assigneeSearchRef}
                    type="text"
                    value={assigneeSearch}
                    onChange={e => setAssigneeSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Search team members..."
                    className="input-base text-[12px] py-1.5"
                  />
                </div>
                <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 212 }}>
                  {scope.options
                    .filter(m => m.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase()))
                    .map(m => {
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
                  {scope.options.length === 0 && (
                    <div className="px-3 py-2.5 text-[12px] text-text-3">No team members available.</div>
                  )}
                  {scope.options.length > 0 && scope.options.filter(m => m.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase())).length === 0 && (
                    <div className="px-3 py-2.5 text-[12px] text-text-3">No matches for &quot;{assigneeSearch}&quot;.</div>
                  )}
                </div>
              </div>,
              document.body
            )}
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
                  <label className="btn-outline text-[11px] py-1 px-2 flex-1 border-dashed cursor-pointer flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">upload_file</span>
                    <span className="truncate">{attachedFile ? attachedFile.name : 'Attach File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0] || null;
                        e.target.value = ''; // let the same file be re-picked after removing it
                        setUploadError(null);
                        if (f && f.size > MAX_UPLOAD_BYTES) {
                          setUploadError(`"${f.name}" is ${(f.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
                          return;
                        }
                        setAttachedFile(f);
                      }}
                    />
                  </label>
                  {attachedFile && (
                    <button type="button" className="text-red-500 hover:bg-red-500/10 p-1 rounded" onClick={() => { setAttachedFile(null); setUploadError(null); }}>
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
                {attachedFile && !uploadError && (
                  <p className="text-[10px] text-text-3">{(attachedFile.size / 1024).toFixed(0)} KB · uploaded when the task is created</p>
                )}
                {uploadError && <p className="text-[11px] text-red-500">{uploadError}</p>}
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
