'use client';
import React, { useState } from 'react';

type Category = 'All' | 'Price' | 'Timing' | 'Trust';

interface Objection {
  id: number;
  category: Exclude<Category, 'All'>;
  title: string;
  response: string;
  timesUsed: number;
}

const DEFAULT_OBJECTIONS: Objection[] = [
  {
    id: 1,
    category: 'Price',
    title: 'Too expensive / found cheaper',
    response: "We understand budget matters. Here's what separates our approach: [show case study]. Would you be open to a proof-of-results first month so you see the ROI before committing long-term?",
    timesUsed: 3,
  },
  {
    id: 2,
    category: 'Timing',
    title: 'Let me review and come back',
    response: "No problem at all! Let me know if you need any references from our existing doctors. I'll follow up in a few days — and I'm always a WhatsApp away.",
    timesUsed: 2,
  },
  {
    id: 3,
    category: 'Trust',
    title: 'Not sure if you can deliver',
    response: "Totally valid. Let's do a small pilot project — you'll see our quality first-hand. We also share our performance guarantees and SLAs upfront so there's no ambiguity.",
    timesUsed: 1,
  },
];

const CATEGORIES: Category[] = ['All', 'Price', 'Timing', 'Trust'];

export default function ObjectionLibrary() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<Category>('All');
  const [objections, setObjections] = useState<Objection[]>(DEFAULT_OBJECTIONS);
  const [copied, setCopied] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [newCategory, setNewCategory] = useState<Exclude<Category, 'All'>>('Price');

  const filtered = filter === 'All' ? objections : objections.filter(o => o.category === filter);

  const copyText = async (obj: Objection) => {
    try {
      await navigator.clipboard.writeText(obj.response);
      setCopied(obj.id);
      // Increment timesUsed
      setObjections(prev => prev.map(o => o.id === obj.id ? { ...o, timesUsed: o.timesUsed + 1 } : o));
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = obj.response;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(obj.id);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const addObjection = () => {
    if (!newTitle.trim() || !newResponse.trim()) return;
    setObjections(prev => [
      ...prev,
      { id: Date.now(), category: newCategory, title: newTitle.trim(), response: newResponse.trim(), timesUsed: 0 },
    ]);
    setNewTitle('');
    setNewResponse('');
    setIsAdding(false);
  };

  return (
    <>
      {/* Floating Button — z-30 so drawer (z-70) covers it */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[var(--c-surface)] border-2 border-[var(--c-border)] shadow-lg rounded-full px-4 py-3 flex items-center gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all font-bold text-sm z-30 hover:shadow-xl hover:scale-105"
      >
        <span>📚</span> Objections
      </button>

      {/* Panel — z-50, below drawer (z-70) */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[45]" onClick={() => setIsOpen(false)} />
          <div className="fixed bottom-24 right-6 w-full max-w-sm bg-[var(--c-surface)] border border-[var(--c-border)] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[65vh]">

            {/* Header */}
            <div className="p-4 border-b border-[var(--c-border)] bg-[var(--c-surface-2)] flex justify-between items-center shrink-0">
              <h3 className="font-bold text-[var(--c-text)] flex items-center gap-2 text-sm">
                <span>📚</span> Objection Library
                <span className="text-[10px] font-normal text-[var(--c-text-2)] bg-[var(--c-border)] px-1.5 py-0.5 rounded">{objections.length}</span>
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Category filter */}
            <div className="p-2.5 border-b border-[var(--c-border)] flex gap-1.5 overflow-x-auto shrink-0">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className="px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-colors"
                  style={filter === c
                    ? { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.12)', color: '#10B981' }
                    : { borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface-2)', color: 'var(--c-text-2)' }}
                >
                  {c} {c !== 'All' && `(${objections.filter(o => o.category === c).length})`}
                </button>
              ))}
            </div>

            {/* Objections list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filtered.length === 0 && (
                <div className="text-center py-6 text-xs text-[var(--c-text-2)]">No objections in this category.</div>
              )}
              {filtered.map(obj => (
                <div key={obj.id} className="bg-[var(--c-surface-2)] border border-[var(--c-border)] p-3.5 rounded-xl">
                  <div className="text-[9px] font-bold uppercase text-[var(--c-text-2)] mb-1 tracking-wider">{obj.category}</div>
                  <h4 className="font-bold text-xs text-[var(--c-text)] mb-2">"{obj.title}"</h4>
                  <div className="text-xs text-[var(--c-text-2)] bg-[var(--c-surface)] border border-[var(--c-border)] p-2.5 rounded-lg italic leading-relaxed">
                    {obj.response}
                  </div>
                  <div className="mt-2.5 flex justify-between items-center">
                    <span className="text-[9px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                      Used {obj.timesUsed}× this month
                    </span>
                    <button
                      onClick={() => copyText(obj)}
                      className="text-[10px] font-semibold transition-colors px-2 py-1 rounded"
                      style={{ color: copied === obj.id ? '#10B981' : '#3B82F6' }}
                    >
                      {copied === obj.id ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Add new inline form */}
              {isAdding && (
                <div className="bg-[var(--c-surface-2)] border border-emerald-500/30 p-3.5 rounded-xl space-y-2.5">
                  <select
                    className="w-full text-xs bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                  >
                    {(['Price', 'Timing', 'Trust'] as const).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    className="w-full text-xs bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
                    placeholder='Objection title (e.g. "Too busy right now")'
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                  <textarea
                    rows={3}
                    className="w-full text-xs bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500 resize-none"
                    placeholder="Ideal response..."
                    value={newResponse}
                    onChange={e => setNewResponse(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setIsAdding(false); setNewTitle(''); setNewResponse(''); }} className="flex-1 text-xs py-1.5 rounded-lg border border-[var(--c-border)] text-[var(--c-text-2)] hover:text-[var(--c-text)]">Cancel</button>
                    <button onClick={addObjection} disabled={!newTitle.trim() || !newResponse.trim()} className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-40 transition-colors">Save</button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--c-border)] bg-[var(--c-surface-2)] flex justify-end shrink-0">
              <button
                onClick={() => setIsAdding(true)}
                className="text-xs font-semibold text-emerald-500 hover:text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                + Add Objection
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
