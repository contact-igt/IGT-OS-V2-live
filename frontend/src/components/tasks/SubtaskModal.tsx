'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Task, PRIORITY_CONFIG, TeamMember, TaskCategory } from '@/lib/data';

interface SubtaskRow {
  title: string;
  assigneeId: string;
  deadline: string;
  priority: Task['priority'];
  estimatedHours: number;
  requiresAsset: boolean;
}

function emptyRow(): SubtaskRow {
  return { title: '', assigneeId: '', deadline: '', priority: 'medium', estimatedHours: 2, requiresAsset: false };
}

interface Props {
  parentTask: Task;
  onClose: () => void;
}

export default function SubtaskModal({ parentTask, onClose }: Props) {
  const { state, dispatch } = useApp();
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [rows, setRows] = useState<SubtaskRow[]>([emptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smart suggestions: members whose roleTag matches the parent task category
  const ROLE_TAG_MAP: Record<TaskCategory, string[]> = {
    video_editing: ['video_editor'],
    design_creative: ['designer'],
    performance_marketing: ['performance_marketer'],
    web_development: ['web_developer', 'developer'],
    whatsapp_automation: ['web_developer', 'ai_developer'],
    social_media: ['performance_marketer', 'ops'],
    strategy: ['leadership', 'ops'],
    operations: ['ops'],
    content_writing: ['ops'],
    seo: ['performance_marketer'],
  };

  const suggestedMembers = useMemo(() => {
    const tags = ROLE_TAG_MAP[parentTask.category] ?? [];
    const suggested = state.teamMembers.filter(m => tags.includes(m.roleTag));
    const others = state.teamMembers.filter(m => !tags.includes(m.roleTag));
    return { suggested, others };
  }, [state.teamMembers, parentTask.category]);

  const updateRow = (i: number, patch: Partial<SubtaskRow>) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    const validRows = rows.filter(r => r.title.trim());
    if (!validRows.length) return;
    setIsSubmitting(true);

    const now = new Date().toISOString();
    for (const row of validRows) {
      dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: row.title.trim(),
          description: '',
          clientId: parentTask.clientId,
          category: parentTask.category,
          priority: row.priority,
          status: 'todo',
          assignedTo: row.assigneeId ? [row.assigneeId] : [],
          createdBy: state.currentUserId,
          deadline: row.deadline || null,
          estimatedHours: row.estimatedHours,
          loggedMinutes: 0,
          tags: [],
          type: 'subtask',
          parentId: parentTask.id,
          requiresAsset: row.requiresAsset,
          displayCode: '',
          updatedAt: now,
        } as any,
      });
    }

    setIsSubmitting(false);
    onClose();
  };

  const memberSelectEl = (rowIdx: number, value: string) => (
    <select
      value={value}
      onChange={e => updateRow(rowIdx, { assigneeId: e.target.value })}
      style={{
        background: 'var(--c-input)',
        border: '1px solid var(--c-border)',
        borderRadius: 8,
        color: 'var(--c-text)',
        fontSize: 13,
        padding: '7px 10px',
        width: '100%',
      }}
    >
      <option value="">— Unassigned —</option>
      {suggestedMembers.suggested.length > 0 && (
        <optgroup label="✨ Suggested">
          {suggestedMembers.suggested.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </optgroup>
      )}
      <optgroup label="All team">
        {suggestedMembers.others.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </optgroup>
    </select>
  );

  const prioritySelectEl = (rowIdx: number, value: Task['priority']) => (
    <select
      value={value}
      onChange={e => updateRow(rowIdx, { priority: e.target.value as Task['priority'] })}
      style={{
        background: 'var(--c-input)',
        border: '1px solid var(--c-border)',
        borderRadius: 8,
        color: PRIORITY_CONFIG[value].color,
        fontSize: 12,
        fontWeight: 700,
        padding: '7px 10px',
        width: '100%',
      }}
    >
      {(Object.keys(PRIORITY_CONFIG) as Task['priority'][]).map(p => (
        <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
      ))}
    </select>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 20,
          width: '100%',
          maxWidth: mode === 'batch' ? 860 : 520,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#2AB182', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                Add Subtasks
              </p>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--c-text)', lineHeight: 1.3, fontFamily: 'var(--font-syne-var)' }}>
                {parentTask.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--c-text-3)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'var(--c-surface-2)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--c-border)' }}>
            {(['single', 'batch'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setRows([emptyRow()]); }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === m ? 'var(--c-surface)' : 'transparent',
                  color: mode === m ? 'var(--c-text)' : 'var(--c-text-3)',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'single' ? '📌 Single Task' : '📋 Batch Create'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {mode === 'single' ? (
            /* ─── Single Mode ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                  Subtask Title *
                </label>
                <input
                  autoFocus
                  placeholder="What needs to be done?"
                  value={rows[0].title}
                  onChange={e => updateRow(0, { title: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px', fontSize: 14, fontWeight: 500,
                    background: 'var(--c-input)', border: '1px solid var(--c-border)',
                    borderRadius: 10, color: 'var(--c-text)', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                    Assignee
                  </label>
                  {/* Assignee with avatar preview */}
                  <select
                    value={rows[0].assigneeId}
                    onChange={e => updateRow(0, { assigneeId: e.target.value })}
                    style={{
                      background: 'var(--c-input)', border: '1px solid var(--c-border)', borderRadius: 8,
                      color: 'var(--c-text)', fontSize: 13, padding: '9px 12px', width: '100%',
                    }}
                  >
                    <option value="">— Unassigned —</option>
                    {suggestedMembers.suggested.length > 0 && (
                      <optgroup label="✨ Suggested for this category">
                        {suggestedMembers.suggested.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </optgroup>
                    )}
                    <optgroup label="All team">
                      {suggestedMembers.others.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </optgroup>
                  </select>
                  {/* Color preview for selected member */}
                  {rows[0].assigneeId && (() => {
                    const m = state.teamMembers.find(x => x.id === rows[0].assigneeId);
                    if (!m) return null;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 10px', background: m.color + '15', border: `1px solid ${m.color}33`, borderRadius: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}>
                          {m.initials}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--c-text-3)', marginLeft: 'auto' }}>{m.department}</span>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={rows[0].deadline}
                    onChange={e => updateRow(0, { deadline: e.target.value })}
                    style={{
                      background: 'var(--c-input)', border: '1px solid var(--c-border)', borderRadius: 8,
                      color: 'var(--c-text)', fontSize: 13, padding: '9px 12px', width: '100%', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                    Priority
                  </label>
                  {prioritySelectEl(0, rows[0].priority)}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    min="0.5" step="0.5"
                    value={rows[0].estimatedHours}
                    onChange={e => updateRow(0, { estimatedHours: Number(e.target.value) })}
                    style={{
                      background: 'var(--c-input)', border: '1px solid var(--c-border)', borderRadius: 8,
                      color: 'var(--c-text)', fontSize: 13, padding: '9px 12px', width: '100%', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: 'var(--c-surface-2)', borderRadius: 10, border: '1px solid var(--c-border)' }}>
                <input
                  type="checkbox"
                  checked={rows[0].requiresAsset}
                  onChange={e => updateRow(0, { requiresAsset: e.target.checked })}
                />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>Requires Asset Upload</p>
                  <p style={{ fontSize: 11, color: 'var(--c-text-3)' }}>Assignee must attach a file to submit this task</p>
                </div>
              </label>
            </div>
          ) : (
            /* ─── Batch Mode ─── */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 130px 100px 80px 32px', gap: 8, padding: '0 0 8px', borderBottom: '1px solid var(--c-border)', marginBottom: 8 }}>
                {['Subtask Title', 'Assignee', 'Deadline', 'Priority', 'Est. h', ''].map(h => (
                  <p key={h} style={{ fontSize: 10, fontWeight: 800, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</p>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 130px 100px 80px 32px', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder={`Subtask ${i + 1}…`}
                      value={row.title}
                      onChange={e => updateRow(i, { title: e.target.value })}
                      style={{
                        padding: '8px 10px', fontSize: 13, background: 'var(--c-input)',
                        border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)',
                      }}
                    />
                    <select
                      value={row.assigneeId}
                      onChange={e => updateRow(i, { assigneeId: e.target.value })}
                      style={{
                        padding: '8px 10px', fontSize: 12, background: 'var(--c-input)',
                        border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)',
                      }}
                    >
                      <option value="">Unassigned</option>
                      {suggestedMembers.suggested.length > 0 && (
                        <optgroup label="✨ Suggested">
                          {suggestedMembers.suggested.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="All">
                        {suggestedMembers.others.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </optgroup>
                    </select>
                    <input
                      type="date"
                      value={row.deadline}
                      onChange={e => updateRow(i, { deadline: e.target.value })}
                      style={{
                        padding: '8px 8px', fontSize: 12, background: 'var(--c-input)',
                        border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)',
                      }}
                    />
                    <select
                      value={row.priority}
                      onChange={e => updateRow(i, { priority: e.target.value as Task['priority'] })}
                      style={{
                        padding: '8px 8px', fontSize: 11, fontWeight: 700, background: 'var(--c-input)',
                        border: '1px solid var(--c-border)', borderRadius: 8,
                        color: PRIORITY_CONFIG[row.priority].color,
                      }}
                    >
                      {(Object.keys(PRIORITY_CONFIG) as Task['priority'][]).map(p => (
                        <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                      ))}
                    </select>
                    <input
                      type="number" min="0.5" step="0.5"
                      value={row.estimatedHours}
                      onChange={e => updateRow(i, { estimatedHours: Number(e.target.value) })}
                      style={{
                        padding: '8px 8px', fontSize: 13, background: 'var(--c-input)',
                        border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-text)', textAlign: 'center',
                      }}
                    />
                    <button
                      onClick={() => rows.length > 1 && removeRow(i)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: '1px solid var(--c-border)',
                        background: 'transparent', cursor: rows.length > 1 ? 'pointer' : 'not-allowed',
                        color: rows.length > 1 ? '#EF4444' : 'var(--c-text-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRow}
                style={{
                  marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 700, color: '#2AB182',
                  background: 'rgba(42,177,130,0.08)', border: '1px dashed rgba(42,177,130,0.35)',
                  borderRadius: 10, padding: '9px 16px', cursor: 'pointer', width: '100%', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,177,130,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(42,177,130,0.08)')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                Add another subtask
              </button>

              {/* Summary */}
              <div style={{
                marginTop: 16, padding: '12px 16px', background: 'var(--c-surface-2)',
                border: '1px solid var(--c-border)', borderRadius: 10,
                display: 'flex', gap: 24,
              }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--c-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Subtasks</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)' }}>{rows.filter(r => r.title.trim()).length}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--c-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Total Est.</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)' }}>
                    {rows.reduce((s, r) => s + r.estimatedHours, 0)}h
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--c-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Assigned</p>
                  <div style={{ display: 'flex', marginTop: 2, gap: -6 }}>
                    {[...new Set(rows.filter(r => r.assigneeId).map(r => r.assigneeId))].map(id => {
                      const m = state.teamMembers.find(x => x.id === id);
                      if (!m) return null;
                      return (
                        <span key={id} title={m.name} style={{
                          width: 24, height: 24, borderRadius: '50%', background: m.color,
                          border: '2px solid var(--c-surface)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff',
                          marginRight: -8,
                        }}>
                          {m.initials}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text-2)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !rows.some(r => r.title.trim())}
            style={{
              padding: '9px 24px', borderRadius: 10, fontSize: 13, fontWeight: 800,
              background: '#2AB182', border: 'none', color: '#fff', cursor: 'pointer',
              opacity: !rows.some(r => r.title.trim()) ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {mode === 'batch'
              ? `Create ${rows.filter(r => r.title.trim()).length} Subtask${rows.filter(r => r.title.trim()).length !== 1 ? 's' : ''}`
              : 'Create Subtask'}
          </button>
        </div>
      </div>
    </div>
  );
}
