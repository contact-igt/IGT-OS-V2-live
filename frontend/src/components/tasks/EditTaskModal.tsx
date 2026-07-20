'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/contexts/AppContext';
import { Task, CATEGORY_LABELS, TaskCategory } from '@/lib/data';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITIES: Task['priority'][] = ['critical', 'high', 'medium', 'low'];
const PRIORITY_COLORS: Record<Task['priority'], string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#94A3B8',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as TaskCategory[];

function isLeadershipMember(m?: { role?: string; roleTag?: string } | null) {
  return m?.role === 'super_admin' || m?.role === 'admin' || m?.roleTag === 'leadership';
}

function getAssignmentScope(
  currentUser: any,
  teamMembers: any[]
): { mode: 'open' | 'locked'; options: any[] } {
  if (!currentUser) return { mode: 'locked', options: [] };
  if (isLeadershipMember(currentUser) || currentUser.id === 'u-thariq') {
    return { mode: 'open', options: teamMembers };
  }
  if (currentUser.id === 'u-abhilash') {
    return {
      mode: 'open',
      options: teamMembers.filter(
        (m) => !isLeadershipMember(m) && m.id !== 'u-thariq'
      ),
    };
  }
  if (currentUser.department) {
    return {
      mode: 'open',
      options: teamMembers.filter(
        (m) => m.department === currentUser.department && !isLeadershipMember(m)
      ),
    };
  }
  return { mode: 'locked', options: [] };
}

export default function EditTaskModal({ task, isOpen, onClose }: Props) {
  const { state, updateTask } = useApp();
  const currentUser = state.teamMembers.find((m) => m.id === state.currentUserId);
  const scope = getAssignmentScope(currentUser, state.teamMembers);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    category: 'operations' as TaskCategory,
    estimatedHours: 1,
    deadline: '',
    assignedTo: [] as string[],
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        category: task.category,
        estimatedHours: task.estimatedHours,
        deadline: task.deadline
          ? new Date(
              new Date(task.deadline).getTime() -
                new Date(task.deadline).getTimezoneOffset() * 60000
            )
              .toISOString()
              .slice(0, 16)
          : '',
        assignedTo: task.assignedTo || [],
        tags: task.tags || [],
      });
      setTagInput('');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const toggleAssignee = (memberId: string) => {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(memberId)
        ? prev.assignedTo.filter((id) => id !== memberId)
        : [...prev.assignedTo, memberId],
    }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    setSaving(true);

    const updates: Partial<Task> = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      category: form.category,
      estimatedHours: Number(form.estimatedHours) || 1,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      assignedTo: form.assignedTo,
      tags: form.tags,
    };

    updateTask(task.id, updates);

    setTimeout(() => {
      setSaving(false);
      onClose();
    }, 300);
  };

  const content = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col custom-scrollbar"
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--c-border)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ color: '#2563EB', fontSize: 22 }}
            >
              edit
            </span>
            <h2
              className="font-bold text-[16px]"
              style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}
            >
              Edit Task
            </h2>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded"
              style={{
                background: 'var(--c-surface-2)',
                color: 'var(--c-text-3)',
                border: '1px solid var(--c-border)',
              }}
            >
              {task.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--c-text-2)', background: 'var(--c-surface-2)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1">
          {/* Title */}
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--c-text-3)' }}
            >
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              className="input-base w-full"
              placeholder="Enter task title..."
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--c-text-3)' }}
            >
              Description
            </label>
            <textarea
              className="input-base w-full resize-none"
              rows={3}
              placeholder="Describe what needs to be done..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Priority + Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--c-text-3)' }}
              >
                Priority
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all border"
                    style={{
                      background:
                        form.priority === p
                          ? `${PRIORITY_COLORS[p]}20`
                          : 'var(--c-surface-2)',
                      color:
                        form.priority === p
                          ? PRIORITY_COLORS[p]
                          : 'var(--c-text-2)',
                      borderColor:
                        form.priority === p
                          ? `${PRIORITY_COLORS[p]}50`
                          : 'var(--c-border)',
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--c-text-3)' }}
              >
                Category
              </label>
              <select
                className="input-base w-full text-[13px]"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value as TaskCategory }))
                }
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline + Estimated Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--c-text-3)' }}
              >
                Deadline
              </label>
              <input
                type="datetime-local"
                className="input-base w-full text-[13px]"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </div>

            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--c-text-3)' }}
              >
                Estimated Hours
              </label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                className="input-base w-full text-[13px]"
                value={form.estimatedHours}
                onChange={(e) =>
                  setForm((p) => ({ ...p, estimatedHours: parseFloat(e.target.value) || 1 }))
                }
              />
            </div>
          </div>

          {/* Assignees */}
          {scope.mode === 'open' && scope.options.length > 0 && (
            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: 'var(--c-text-3)' }}
              >
                Assigned To
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {scope.options.map((m) => {
                  const selected = form.assignedTo.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAssignee(m.id)}
                      className="flex items-center gap-2 p-2 rounded-lg text-left transition-all border"
                      style={{
                        background: selected
                          ? 'rgba(37,99,235,0.08)'
                          : 'var(--c-surface-2)',
                        borderColor: selected ? '#2563EB50' : 'var(--c-border)',
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ background: m.color }}
                      >
                        {m.initials}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-[12px] font-semibold truncate"
                          style={{ color: selected ? '#2563EB' : 'var(--c-text)' }}
                        >
                          {m.name}
                        </p>
                        <p
                          className="text-[10px] truncate"
                          style={{ color: 'var(--c-text-3)' }}
                        >
                          {m.department}
                        </p>
                      </div>
                      {selected && (
                        <span
                          className="material-symbols-outlined ml-auto flex-shrink-0"
                          style={{ fontSize: 16, color: '#2563EB' }}
                        >
                          check_circle
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--c-text-3)' }}
            >
              Tags
            </label>
            <div className="flex gap-2">
              <input
                className="input-base flex-1 text-[13px]"
                placeholder="Add a tag and press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 rounded-lg font-bold text-[12px] transition-colors border"
                style={{
                  background: 'var(--c-surface-2)',
                  color: 'var(--c-text-2)',
                  borderColor: 'var(--c-border)',
                }}
              >
                Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: 'var(--c-surface-2)',
                      color: 'var(--c-text-2)',
                      border: '1px solid var(--c-border)',
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        close
                      </span>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0"
          style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-[13px] transition-colors border"
            style={{
              color: 'var(--c-text-2)',
              borderColor: 'var(--c-border)',
              background: 'var(--c-surface)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!form.title.trim() || saving}
            onClick={handleSave}
            className="btn-primary px-5 py-2 text-[13px] flex items-center gap-2 disabled:opacity-40"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {saving ? 'hourglass_empty' : 'save'}
            </span>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
}
