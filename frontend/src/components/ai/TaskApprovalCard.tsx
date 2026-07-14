'use client';

import { useState } from 'react';
import { ProposedTask } from '@/lib/meetingTypes';
import { useApp } from '@/contexts/AppContext';

const TASK_CATEGORIES = [
  { value: 'performance_marketing', label: 'Performance Marketing' },
  { value: 'social_media',          label: 'Social Media' },
  { value: 'video_editing',         label: 'Video Editing' },
  { value: 'design_creative',       label: 'Design & Creative' },
  { value: 'web_development',       label: 'Web Development' },
  { value: 'whatsapp_automation',   label: 'WhatsApp Automation' },
  { value: 'strategy',              label: 'Strategy' },
  { value: 'operations',            label: 'Operations' },
  { value: 'content_writing',       label: 'Content Writing' },
  { value: 'seo',                   label: 'SEO' },
];

const PRIORITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.15)',   color: '#EF4444' },
  high:     { bg: 'rgba(249,115,22,0.15)',  color: '#F97316' },
  medium:   { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  low:      { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
};

interface Props {
  task: ProposedTask;
  index: number;
  onApprove: (updates: Partial<ProposedTask>) => void;
  onReject: () => void;
}

export default function TaskApprovalCard({ task, index, onApprove, onReject }: Props) {
  const { state } = useApp();
  const [assigneeId, setAssigneeId]   = useState(task.assigneeId || '');
  const [priority,   setPriority]     = useState(task.priority);
  const [category,   setCategory]     = useState(task.category || 'operations');
  const [deadline,   setDeadline]     = useState(task.deadline || '');
  const [title,      setTitle]        = useState(task.title);

  const invictusMembers = state.teamMembers;
  const canApprove = assigneeId !== '' && task.ownerSide === 'invictus';
  const priorityCfg = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium;

  let cardBorder = 'var(--c-border)';
  let cardBg     = 'var(--c-surface)';
  if (task.status === 'approved') { cardBorder = 'rgba(42,177,130,0.4)';  cardBg = 'rgba(42,177,130,0.05)'; }
  if (task.status === 'rejected') { cardBorder = 'rgba(239,68,68,0.3)';   cardBg = 'rgba(239,68,68,0.04)'; }
  if (task.confidence === 'low' && task.status === 'pending') { cardBorder = 'rgba(245,158,11,0.45)'; }

  return (
    <div
      className="rounded-xl p-4 mb-3 transition-all"
      style={{ border: `1px solid ${cardBorder}`, background: cardBg, opacity: task.status === 'rejected' ? 0.55 : 1 }}
    >
      {/* Top row: index + status chip + priority */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-bold rounded px-1.5 py-0.5" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}>#{index + 1}</span>
        
        {task.status === 'approved' && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(42,177,130,0.15)', color: '#2AB182' }}>✓ Approved</span>
        )}
        {task.status === 'rejected' && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>✗ Rejected</span>
        )}
        {task.status === 'pending' && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}>○ Pending</span>
        )}

        {task.confidence === 'low' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Low confidence</span>
        )}

        {task.ownerSide === 'client' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto" style={{ background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}>Client action</span>
        )}

        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded ml-auto capitalize"
          style={{ background: priorityCfg.bg, color: priorityCfg.color }}
        >
          {priority}
        </span>
      </div>

      {/* Title (editable) */}
      <input
        className="w-full rounded-lg px-3 py-1.5 text-[14px] font-semibold mb-1 outline-none focus:ring-1 ring-primary/40"
        style={{ background: 'var(--c-input)', color: 'var(--c-text)', border: '1px solid var(--c-border)' }}
        value={title}
        onChange={e => setTitle(e.target.value)}
        disabled={task.status === 'rejected'}
      />

      {/* Description */}
      <p className="text-[12px] mb-3 leading-relaxed" style={{ color: 'var(--c-text-3)' }}>{task.description}</p>

      {/* Fields grid */}
      {task.ownerSide === 'invictus' && task.status !== 'rejected' && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Assignee */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-3)' }}>Assignee</label>
            <select
              className="w-full rounded-lg px-2 py-1.5 text-[12px] outline-none"
              style={{ background: 'var(--c-input)', color: 'var(--c-text)', border: '1px solid var(--c-border)' }}
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
            >
              <option value="">Select...</option>
              {invictusMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {!assigneeId && (
              <p className="text-[10px] mt-0.5" style={{ color: '#F59E0B' }}>⚠ Required to approve</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-3)' }}>Category</label>
            <select
              className="w-full rounded-lg px-2 py-1.5 text-[12px] outline-none"
              style={{ background: 'var(--c-input)', color: 'var(--c-text)', border: '1px solid var(--c-border)' }}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {TASK_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-3)' }}>Deadline</label>
            <input
              type="date"
              className="w-full rounded-lg px-2 py-1.5 text-[12px] outline-none"
              style={{ background: 'var(--c-input)', color: 'var(--c-text)', border: '1px solid var(--c-border)' }}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
            {task.deadlineVerbatim && (
              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--c-text-3)' }} title={task.deadlineVerbatim}>
                "{task.deadlineVerbatim}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Priority selector (quick chips) */}
      {task.status !== 'rejected' && (
        <div className="flex gap-1 mb-3">
          {(['critical', 'high', 'medium', 'low'] as const).map(p => {
            const pcfg = PRIORITY_COLORS[p];
            return (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className="text-[10px] font-bold px-2 py-0.5 rounded capitalize transition-all"
                style={{
                  background: priority === p ? pcfg.bg : 'transparent',
                  color: priority === p ? pcfg.color : 'var(--c-text-3)',
                  border: `1px solid ${priority === p ? pcfg.color + '50' : 'var(--c-border)'}`,
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}

      {/* Source quote */}
      <details className="mb-3 group">
        <summary className="text-[11px] cursor-pointer select-none" style={{ color: 'var(--c-text-3)' }}>
          From transcript ↓
        </summary>
        <blockquote
          className="text-[11px] italic mt-1.5 px-3 py-2 rounded-lg leading-relaxed"
          style={{ color: 'var(--c-text-2)', background: 'var(--c-surface-2)', borderLeft: '3px solid var(--c-primary)' }}
        >
          "{task.sourceQuote}"
        </blockquote>
      </details>

      {/* Action buttons */}
      {task.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove({ title, priority: priority as any, category, deadline: deadline || null, assigneeId })}
            disabled={!canApprove && task.ownerSide === 'invictus'}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all"
            style={{
              background: canApprove || task.ownerSide === 'client' ? 'var(--c-primary)' : 'var(--c-surface-2)',
              color: canApprove || task.ownerSide === 'client' ? 'white' : 'var(--c-text-3)',
              cursor: canApprove || task.ownerSide === 'client' ? 'pointer' : 'not-allowed',
            }}
          >
            ✓ Approve
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all hover:bg-red-500/10"
            style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
          >
            ✗
          </button>
        </div>
      )}

      {task.status === 'approved' && (
        <button
          onClick={onReject}
          className="w-full py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-red-500/5"
          style={{ color: 'var(--c-text-3)', border: '1px solid var(--c-border)' }}
        >
          Undo approval
        </button>
      )}
    </div>
  );
}
