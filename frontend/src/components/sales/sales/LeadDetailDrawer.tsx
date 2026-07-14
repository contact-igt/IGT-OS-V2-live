'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { Lead } from '@/lib/seed_meetings';

const STAGE_COLORS: Record<string, string> = {
  discovery: '#8B5CF6', proposal: '#0EA5E9', revision: '#F59E0B',
  closing: '#EC4899', won: '#10B981', lost: '#EF4444', paused: '#6B7280',
};

const STAGE_NEXT: Record<string, string> = {
  discovery: 'proposal', proposal: 'revision', revision: 'closing', closing: 'won',
};

type NoteType = 'call' | 'whatsapp' | 'meeting' | 'note' | 'email';
interface Note {
  id: string;
  type: NoteType;
  text: string;
  timestamp: string;
}

const TYPE_META: Record<NoteType, { icon: string; label: string; color: string }> = {
  call:     { icon: '📞', label: 'Call Log', color: '#10B981' },
  whatsapp: { icon: '💬', label: 'WhatsApp', color: '#25D366' },
  meeting:  { icon: '🗓', label: 'Meeting Note', color: '#3B82F6' },
  email:    { icon: '✉️', label: 'Email', color: '#6366F1' },
  note:     { icon: '📝', label: 'Note', color: '#F59E0B' },
};

function relTime(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 60000;
  if (diff < 1) return 'just now';
  if (diff < 60) return `${Math.round(diff)}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

export default function LeadDetailDrawer({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const leads: Lead[] = (state.leads || []) as Lead[];
  const lead = leads.find(l => l.id === leadId);

  // Local note state — stored in lead.notes array (added to Lead interface below)
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (leadId) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leadId, onClose]);

  // Reset note form when lead changes
  useEffect(() => { setNoteText(''); setIsAddingNote(false); }, [leadId]);

  if (!lead) return null;

  const notes: Note[] = (lead as any).notes || [];
  const memberName = (id: string) => state.teamMembers.find(m => m.id === id)?.name || id.replace('u-', '');

  const saveNote = () => {
    if (!noteText.trim()) return;
    const newNote: Note = {
      id: `note-${Date.now()}`,
      type: noteType,
      text: noteText.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = { ...(lead as any), notes: [newNote, ...notes] };
    dispatch({ type: 'UPDATE_LEAD', payload: updated });
    setNoteText('');
    setIsAddingNote(false);
  };

  const advanceStage = () => {
    const next = STAGE_NEXT[lead.stage];
    if (!next) return;
    const today = new Date().toISOString().split('T')[0];
    const updated = {
      ...lead,
      stage: next as Lead['stage'],
      stageHistory: [...(lead.stageHistory || []), { stage: next, date: today }],
    };
    dispatch({ type: 'UPDATE_LEAD', payload: updated });
  };

  const stageColor = STAGE_COLORS[lead.stage] || '#6B7280';
  const nextStage = STAGE_NEXT[lead.stage];
  const scoreColor = lead.score > 70 ? '#10B981' : lead.score > 40 ? '#F59E0B' : '#EF4444';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[560px] bg-[var(--c-surface)] shadow-2xl z-[70] flex flex-col border-l border-[var(--c-border)]">

        {/* Header */}
        <div className="shrink-0 border-b border-[var(--c-border)] p-5 bg-[var(--c-surface-2)] flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h2 className="text-xl font-bold text-[var(--c-text)]">{lead.contactPerson}</h2>
              <span
                className="capitalize px-2 py-0.5 rounded text-xs font-bold border"
                style={{ color: stageColor, backgroundColor: `${stageColor}15`, borderColor: `${stageColor}30` }}
              >
                {lead.stage}
              </span>
              {lead.stage === 'won' && <span className="text-xs font-bold text-emerald-500">✅ Won</span>}
              {lead.stage === 'lost' && <span className="text-xs font-bold text-red-500">❌ Lost</span>}
            </div>
            <p className="text-xs font-medium text-[var(--c-text-2)]">{lead.name} · {lead.industry} · Assigned: {memberName(lead.assignedTo)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--c-surface)] rounded-lg text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--c-surface-2)] p-3.5 rounded-xl border border-[var(--c-border)]">
              <div className="text-[10px] text-[var(--c-text-2)] font-semibold uppercase mb-1">Potential Value</div>
              <div className="text-lg font-bold text-emerald-500">₹{lead.monthlyValueINR?.toLocaleString('en-IN')}/mo</div>
            </div>
            <div className="bg-[var(--c-surface-2)] p-3.5 rounded-xl border border-[var(--c-border)]">
              <div className="text-[10px] text-[var(--c-text-2)] font-semibold uppercase mb-1">Lead Score</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[var(--c-border)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${lead.score}%`, backgroundColor: scoreColor }} />
                </div>
                <span className="text-sm font-bold" style={{ color: scoreColor }}>{lead.score}</span>
              </div>
            </div>
            <div className="bg-[var(--c-surface-2)] p-3.5 rounded-xl border border-[var(--c-border)]">
              <div className="text-[10px] text-[var(--c-text-2)] font-semibold uppercase mb-1">Source</div>
              <div className="font-medium text-sm">{lead.source || '—'}</div>
            </div>
            <div className="bg-[var(--c-surface-2)] p-3.5 rounded-xl border border-[var(--c-border)]">
              <div className="text-[10px] text-[var(--c-text-2)] font-semibold uppercase mb-1">Last Contact</div>
              <div className="font-medium text-sm">{lead.lastContactDate}</div>
            </div>
          </div>

          {/* Services */}
          {lead.servicesNeeded && lead.servicesNeeded.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--c-text-2)] mb-2">Services Needed</div>
              <div className="flex flex-wrap gap-1.5">
                {lead.servicesNeeded.map(svc => (
                  <span key={svc} className="text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full uppercase">
                    {svc.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setNoteType('call'); setIsAddingNote(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs shadow-sm"
            >
              📞 Log Call
            </button>
            <button
              onClick={() => { setNoteType('whatsapp'); setIsAddingNote(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className="flex-1 font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs shadow-sm text-white"
              style={{ backgroundColor: '#25D366' }}
            >
              💬 WhatsApp
            </button>
            <button
              onClick={() => { setNoteType('meeting'); setIsAddingNote(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs shadow-sm"
            >
              🗓 Meeting
            </button>
          </div>

          {/* Advance stage button */}
          {nextStage && (
            <button
              onClick={advanceStage}
              className="w-full py-2 rounded-xl font-semibold text-sm text-white transition-colors shadow-sm"
              style={{ backgroundColor: STAGE_COLORS[nextStage] || '#10B981' }}
            >
              Advance → {nextStage.charAt(0).toUpperCase() + nextStage.slice(1)}
            </button>
          )}

          {/* Add Note Inline Form */}
          {isAddingNote && (
            <div className="bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--c-text-2)]">Type:</span>
                {(Object.keys(TYPE_META) as NoteType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setNoteType(t)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors"
                    style={noteType === t
                      ? { backgroundColor: TYPE_META[t].color, color: '#fff', borderColor: TYPE_META[t].color }
                      : { borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}
                  >
                    {TYPE_META[t].icon} {TYPE_META[t].label}
                  </button>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                rows={3}
                className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none resize-none"
                placeholder={`Add ${TYPE_META[noteType].label.toLowerCase()}...`}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveNote(); }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsAddingNote(false); setNoteText(''); }}
                  className="text-xs text-[var(--c-text-2)] hover:text-[var(--c-text)] px-3 py-1.5"
                >Cancel</button>
                <button
                  onClick={saveNote}
                  disabled={!noteText.trim()}
                  className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  Save Note ⌘↵
                </button>
              </div>
            </div>
          )}

          {!isAddingNote && (
            <button
              onClick={() => { setIsAddingNote(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className="w-full py-2 text-xs font-semibold border border-dashed border-[var(--c-border)] rounded-xl text-[var(--c-text-2)] hover:text-emerald-500 hover:border-emerald-500/50 transition-colors"
            >
              + Add Note
            </button>
          )}

          {/* Stage History */}
          <div>
            <h3 className="font-bold text-[var(--c-text)] mb-3 text-[10px] uppercase tracking-wider">Stage History</h3>
            <div className="relative border-l-2 border-[var(--c-border)] ml-3 pl-5 space-y-4">
              {(lead.stageHistory || []).map((sh, idx) => {
                const color = STAGE_COLORS[sh.stage] || '#6B7280';
                return (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[23px] w-3 h-3 rounded-full border-2 border-[var(--c-surface)]" style={{ backgroundColor: color }} />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs capitalize" style={{ color }}>{sh.stage}</span>
                      <span className="text-[10px] text-[var(--c-text-2)]">{sh.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity & Notes — real, stored in lead.notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[var(--c-text)] text-[10px] uppercase tracking-wider">Activity & Notes</h3>
              <span className="text-[10px] text-[var(--c-text-3)]">{notes.length} entries</span>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-6 text-[var(--c-text-2)] text-xs border border-dashed border-[var(--c-border)] rounded-xl">
                No activity yet. Log a call or add a note to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => {
                  const meta = TYPE_META[note.type] || TYPE_META.note;
                  return (
                    <div key={note.id} className="bg-[var(--c-surface-2)] p-4 rounded-xl border border-[var(--c-border)]">
                      <div className="flex justify-between text-[10px] mb-2">
                        <span className="font-bold flex items-center gap-1.5" style={{ color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                        <span className="text-[var(--c-text-2)]">{relTime(note.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[var(--c-text)] leading-relaxed">{note.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lost Reason */}
          {lead.stage === 'lost' && lead.lostReason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="text-[10px] font-bold uppercase text-red-500 mb-1">Lost Reason</div>
              <p className="text-sm text-red-400">{lead.lostReason}</p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
