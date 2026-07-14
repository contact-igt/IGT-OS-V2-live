'use client';
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import LeadDetailDrawer from './LeadDetailDrawer';
import type { Lead } from '@/lib/seed_meetings';

const STAGE_NEXT: Record<string, string> = {
  discovery: 'proposal',
  proposal: 'revision',
  revision: 'closing',
  closing: 'won',
};

const STAGE_COLORS: Record<string, string> = {
  discovery: '#8B5CF6',
  proposal: '#0EA5E9',
  revision: '#F59E0B',
  closing: '#EC4899',
  won: '#10B981',
  lost: '#EF4444',
  paused: '#6B7280',
};

function relativeDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

export default function SalesPipeline({ isReadOnly }: { isReadOnly: boolean }) {
  const { state, dispatch } = useApp();
  const leads: Lead[] = (state.leads || []) as Lead[];
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const columns = [
    { id: 'discovery', label: 'Discovery' },
    { id: 'proposal', label: 'Proposal' },
    { id: 'revision', label: 'Revision' },
    { id: 'closing', label: 'Closing' },
    { id: 'won', label: 'Won ✅' },
    { id: 'lost', label: 'Lost' },
    { id: 'paused', label: 'Paused' },
  ];

  const advanceStage = (lead: Lead) => {
    if (isReadOnly) return;
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

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    if (isReadOnly) return;
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    if (isReadOnly) return;
    e.preventDefault();
    setDragOverCol(null);
    const leadId = e.dataTransfer.getData('leadId');
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;
    const today = new Date().toISOString().split('T')[0];
    const updated = {
      ...lead,
      stage: targetStage as Lead['stage'],
      stageHistory: [...(lead.stageHistory || []), { stage: targetStage, date: today }],
    };
    dispatch({ type: 'UPDATE_LEAD', payload: updated });
  };

  return (
    <div className="flex-1 flex overflow-x-auto overflow-y-hidden pb-4 gap-3 min-h-0">
      {columns.map(col => {
        const colLeads = leads.filter(l => l.stage === col.id);
        const colValue = colLeads.reduce((acc, l) => acc + (l.monthlyValueINR || 0), 0);
        const color = STAGE_COLORS[col.id] || '#6B7280';
        const isDragOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className="w-64 shrink-0 flex flex-col rounded-xl border transition-all duration-150"
            style={{
              backgroundColor: 'var(--c-surface)',
              borderColor: isDragOver ? color : 'var(--c-border)',
              boxShadow: isDragOver ? `0 0 0 2px ${color}30` : undefined,
            }}
            onDragOver={e => { if (!isReadOnly) { e.preventDefault(); setDragOverCol(col.id); } }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div
              className="p-3 rounded-t-xl shrink-0 border-b"
              style={{ borderColor: 'var(--c-border)', borderTop: `3px solid ${color}` }}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider" style={{ color }}>{col.label}</span>
                <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: color }}>
                  {colLeads.length}
                </span>
              </div>
              <div className="text-xs mt-1 font-medium text-[var(--c-text-2)]">
                {col.id === 'won' ? `${colLeads.length} deal${colLeads.length !== 1 ? 's' : ''}` : `₹${colValue.toLocaleString('en-IN')}/mo`}
              </div>
            </div>

            {/* Column Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
              {colLeads.map(lead => {
                const isWon = lead.stage === 'won';
                const isLost = lead.stage === 'lost';
                const isPaused = lead.stage === 'paused';
                const daysSinceContact = Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / 86400000);
                const isStale = !isWon && !isLost && daysSinceContact > 7;

                return (
                  <div
                    key={lead.id}
                    draggable={!isReadOnly}
                    onDragStart={e => handleDragStart(e, lead.id)}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`rounded-lg p-3 border text-sm transition-all duration-150 cursor-pointer
                      hover:shadow-md hover:border-[${color}]/40 active:scale-[0.99]
                      ${!isReadOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    style={{
                      backgroundColor: 'var(--c-bg)',
                      borderColor: isStale ? '#EF444440' : 'var(--c-border)',
                    }}
                  >
                    {/* Header row */}
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="font-semibold text-[var(--c-text)] truncate flex-1 pr-2">
                        {lead.contactPerson}
                      </div>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: color }}
                        title={`Assigned: ${lead.assignedTo}`}
                      >
                        {lead.assignedTo?.replace('u-', '').charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Company */}
                    <div className="text-[11px] text-[var(--c-text-2)] mb-1.5 truncate">{lead.name}</div>

                    {/* Value */}
                    <div className="text-sm font-bold text-emerald-500 mb-2">
                      ₹{lead.monthlyValueINR?.toLocaleString('en-IN')}/mo
                    </div>

                    {/* Services tags */}
                    {lead.servicesNeeded && lead.servicesNeeded.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {lead.servicesNeeded.slice(0, 2).map(svc => (
                          <span key={svc} className="text-[9px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded uppercase">
                            {svc.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Status footer */}
                    <div className="flex items-center justify-between text-[10px]">
                      {isWon ? (
                        <span className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">Closed ✅</span>
                      ) : isLost ? (
                        <span className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded font-bold">{lead.lostReason || 'Lost'}</span>
                      ) : isPaused ? (
                        <span className="text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded font-bold">Paused</span>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded font-medium ${isStale ? 'text-red-500 bg-red-500/10' : 'text-[var(--c-text-2)] bg-[var(--c-surface-2)]'}`}>
                          {isStale ? `⚠ ${relativeDate(lead.lastContactDate)}` : relativeDate(lead.lastContactDate)}
                        </span>
                      )}
                      <span className="text-[var(--c-text-3)]">{lead.score}/100</span>
                    </div>

                    {/* Stage advance button */}
                    {!isReadOnly && STAGE_NEXT[lead.stage] && (
                      <button
                        onClick={e => { e.stopPropagation(); advanceStage(lead); }}
                        className="w-full mt-2 text-center text-[10px] font-semibold py-1 rounded border transition-colors hover:text-white"
                        style={{ borderColor: color, color, ['--hover-bg' as any]: color }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = color; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; (e.currentTarget as HTMLButtonElement).style.color = color; }}
                      >
                        → {STAGE_NEXT[lead.stage].charAt(0).toUpperCase() + STAGE_NEXT[lead.stage].slice(1)}
                      </button>
                    )}
                  </div>
                );
              })}

              {colLeads.length === 0 && (
                <div
                  className="h-20 flex items-center justify-center rounded-lg border-2 border-dashed text-[11px] text-[var(--c-text-3)] transition-colors"
                  style={{ borderColor: isDragOver ? color : 'var(--c-border)' }}
                >
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Use the shared LeadDetailDrawer instead of a hardcoded panel */}
      <LeadDetailDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
