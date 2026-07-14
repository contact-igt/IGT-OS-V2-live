'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import SalesOverview from './SalesOverview';
import SalesPipeline from './SalesPipeline';
import SalesLeadsTable from './SalesLeadsTable';
import SalesAnalytics from './SalesAnalytics';
import QuickAddLeadModal from './QuickAddLeadModal';

export default function SalesContent() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'leads' | 'analytics'>('overview');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [filterStage, setFilterStage] = useState<string | null>(null);

  const exportCSV = () => {
    const leads = state.leads || [];
    const headers = ['Contact', 'Company', 'Industry', 'Stage', 'Value/mo (₹)', 'Source', 'Assigned To', 'Score', 'Last Contact', 'Next Follow-up'];
    const rows = leads.map(l => [
      l.contactPerson, l.name, l.industry, l.stage, l.monthlyValueINR,
      l.source, l.assignedTo, l.score, l.lastContactDate, l.nextFollowUp || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  const role = currentUser?.role;
  const isOps = role === 'ops';
  const isTeam = role === 'team';
  const isReadOnly = role !== 'super_admin' && role !== 'admin';

  if (isOps || isTeam) {
    return (
      <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <svg className="w-16 h-16 mb-4 text-[var(--c-border)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-[var(--c-text-2)] max-w-md">
          You do not have permission to view the Sales CRM. This module is restricted to executive leadership.
        </p>
      </div>
    );
  }

  const handleStageClick = (stage: string) => {
    setFilterStage(stage);
    setActiveTab('leads');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--c-bg)]">
      {/* HEADER */}
      <header className="shrink-0 px-6 py-4 border-b border-[var(--c-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--c-surface)] z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--c-text)] leading-tight">Sales CRM</h1>
            <p className="text-xs font-medium text-[var(--c-text-2)]">Agency pipeline & lead tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isReadOnly && (
            <button 
              onClick={() => setIsAddLeadModalOpen(true)}
              className="flex-1 sm:flex-none btn-primary py-2 px-4 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Lead
            </button>
          )}
          <button onClick={exportCSV} className="flex-1 sm:flex-none btn-secondary py-2 px-4 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="px-6 border-b border-[var(--c-border)] bg-[var(--c-surface)] overflow-x-auto custom-scrollbar shrink-0">
        <div className="flex space-x-6 min-w-max">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'leads', label: 'Leads' },
            { id: 'analytics', label: 'Analytics' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id !== 'leads') setFilterStage(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-[var(--c-text-2)] hover:text-[var(--c-text)] hover:border-[var(--c-border)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
            {activeTab === 'overview' && (
              <SalesOverview onStageClick={handleStageClick} />
            )}
            
            {activeTab === 'pipeline' && (
              <SalesPipeline isReadOnly={isReadOnly} />
            )}
            
            {activeTab === 'leads' && (
              <SalesLeadsTable initialFilterStage={filterStage} />
            )}

            {activeTab === 'analytics' && (
              <SalesAnalytics />
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isAddLeadModalOpen && (
        <QuickAddLeadModal isOpen={isAddLeadModalOpen} onClose={() => setIsAddLeadModalOpen(false)} />
      )}
    </div>
  );
}
