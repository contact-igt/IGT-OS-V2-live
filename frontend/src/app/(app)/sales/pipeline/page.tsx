'use client';
import { useState } from 'react';
import FunnelEngine, { FunnelStage } from '@/components/sales/FunnelEngine';
import { FunnelItem } from '@/lib/data';

const INVICTUS_BD_STAGES: FunnelStage[] = [
  { id: 'stg-1', name: 'Discovery', color: '#94A3B8' },
  { id: 'stg-2', name: 'Qualification', color: '#3B82F6' },
  { id: 'stg-3', name: 'Needs Analysis', color: '#8B5CF6' },
  { id: 'stg-4', name: 'Value Proposition', color: '#EC4899' },
  { id: 'stg-5', name: 'Proposal / Quote', color: '#F59E0B' },
  { id: 'stg-6', name: 'Negotiation', color: '#F97316' },
  { id: 'stg-7', name: 'Strategy Review', color: '#22C55E' },
];

import { useApp } from '@/contexts/AppContext';

export default function PipelinePage() {
  const { state, updateDealStage, createDeal } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeal, setNewDeal] = useState({ title: '', value: 0, contactName: '', company: '', stageId: 'stg-1' });

  const handleMove = (itemId: string, newStageId: string) => {
    updateDealStage(itemId, newStageId);
  };

  const handleAddDeal = () => {
    if (!newDeal.title || !newDeal.company) return;
    createDeal({
      title: newDeal.title,
      value: Number(newDeal.value) || 0,
      contactName: newDeal.contactName,
      company: newDeal.company,
      stageId: newDeal.stageId
    });
    setShowAddModal(false);
    setNewDeal({ title: '', value: 0, contactName: '', company: '', stageId: 'stg-1' });
  };

  return (
    <div className="h-full relative">
      <FunnelEngine 
        stages={INVICTUS_BD_STAGES}
        initialItems={state.deals}
        onItemMove={handleMove}
        onAddDealClick={() => setShowAddModal(true)}
      />

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-app-surface w-full max-w-md rounded-2xl border border-app-border overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6">
              <h2 className="text-xl font-bold text-app-text mb-6">Add New Deal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-bold text-app-text3 mb-1">Company / Lead Name *</label>
                  <input type="text" value={newDeal.company} onChange={e => setNewDeal(prev => ({...prev, company: e.target.value}))} className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-app-text focus:border-primary outline-none" placeholder="e.g. Apex Clinic" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-app-text3 mb-1">Deal Title *</label>
                  <input type="text" value={newDeal.title} onChange={e => setNewDeal(prev => ({...prev, title: e.target.value}))} className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-app-text focus:border-primary outline-none" placeholder="e.g. Website Revamp" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-app-text3 mb-1">Contact Person</label>
                  <input type="text" value={newDeal.contactName} onChange={e => setNewDeal(prev => ({...prev, contactName: e.target.value}))} className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-app-text focus:border-primary outline-none" placeholder="e.g. Rahul" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-app-text3 mb-1">Deal Value (₹)</label>
                  <input type="number" value={newDeal.value} onChange={e => setNewDeal(prev => ({...prev, value: Number(e.target.value)}))} className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-app-text focus:border-primary outline-none" placeholder="e.g. 150000" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-app-text3 mb-1">Initial Stage</label>
                  <select value={newDeal.stageId} onChange={e => setNewDeal(prev => ({...prev, stageId: e.target.value}))} className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-app-text focus:border-primary outline-none">
                    {INVICTUS_BD_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setShowAddModal(false)} className="px-5 py-2 rounded-lg font-bold text-app-text3 hover:bg-app-bg transition-colors">Cancel</button>
                <button onClick={handleAddDeal} disabled={!newDeal.title || !newDeal.company} className="px-5 py-2 rounded-lg font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors">Create Deal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
