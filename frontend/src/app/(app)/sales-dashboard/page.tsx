'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Users, TrendingUp, DollarSign, Target, Activity } from 'lucide-react';

export default function SalesDashboardPage() {
  const { state } = useApp();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  if (!currentUser) return <div className="p-10 text-center text-app-text">Please log in.</div>;

  // Use state.leads for pipelines
  const newLeads = state.leads.filter(l => l.stage === 'discovery');
  const contactedLeads = state.leads.filter(l => l.stage === 'proposal' || l.stage === 'revision');
  const meetingLeads = state.leads.filter(l => l.stage === 'closing');
  
  // Calculate aggregate metrics from campaignWeeklyLogs
  let totalSpend = 0;
  let totalLeads = 0;
  
  state.campaignWeeklyLogs.forEach(log => {
    totalSpend += (log.weekLeads * log.cpl);
    totalLeads += log.weekLeads;
  });
  
  const totalImpressions = totalLeads * 125; // Estimated impressions for the UI
  const avgCpl = totalLeads > 0 ? (totalSpend / totalLeads) : 0;

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden relative">
        <header className="flex-shrink-0 border-b border-app-border bg-app-surface/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-app-text tracking-tight font-syne flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-[16px]" style={{ background: currentUser.color }}>
                {currentUser.initials}
              </div>
              Sales & Marketing
            </h1>
            <p className="text-[14px] text-app-text2 font-grotesk mt-1">
              Welcome back, {currentUser.name.split(' ')[0]}. Here is your pipeline overview.
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
          <div className="max-w-[1200px] mx-auto space-y-6">
            
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-app-surface2 border border-app-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-app-text2 font-bold text-[13px] uppercase tracking-wider">Ad Spend (All Time)</span>
                </div>
                <div className="text-[24px] font-bold font-syne text-app-text">₹{totalSpend.toLocaleString('en-IN')}</div>
              </div>
              
              <div className="bg-app-surface2 border border-app-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-app-text2 font-bold text-[13px] uppercase tracking-wider">Total Leads Generated</span>
                </div>
                <div className="text-[24px] font-bold font-syne text-app-text">{totalLeads.toLocaleString('en-IN')}</div>
              </div>
              
              <div className="bg-app-surface2 border border-app-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-app-text2 font-bold text-[13px] uppercase tracking-wider">Avg CPL</span>
                </div>
                <div className="text-[24px] font-bold font-syne text-app-text">₹{avgCpl.toFixed(0)}</div>
              </div>
              
              <div className="bg-app-surface2 border border-app-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-app-text2 font-bold text-[13px] uppercase tracking-wider">Impressions</span>
                </div>
                <div className="text-[24px] font-bold font-syne text-app-text">{totalImpressions.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Lead Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              <section className="bg-app-surface/30 rounded-xl p-4 border border-app-border">
                <h2 className="text-[16px] font-bold font-syne text-app-text mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" /> New Leads ({newLeads.length})
                </h2>
                <div className="space-y-3">
                  {newLeads.map(l => (
                    <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className="bg-app-surface2 p-4 rounded-lg border border-app-border cursor-pointer hover:border-primary/50 transition-colors">
                      <div className="font-bold text-app-text">{l.name}</div>
                      <div className="text-[12px] text-app-text2 mt-1">{l.contactPerson}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                <h2 className="text-[16px] font-bold font-syne text-blue-500 mb-4">Contacted ({contactedLeads.length})</h2>
                <div className="space-y-3">
                  {contactedLeads.map(l => (
                    <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className="bg-app-surface2 p-4 rounded-lg border border-app-border cursor-pointer hover:border-primary/50 transition-colors">
                      <div className="font-bold text-app-text">{l.name}</div>
                      <div className="text-[12px] text-app-text2 mt-1">{l.contactPerson}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/20">
                <h2 className="text-[16px] font-bold font-syne text-purple-500 mb-4">Meeting Scheduled ({meetingLeads.length})</h2>
                <div className="space-y-3">
                  {meetingLeads.map(l => (
                    <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className="bg-app-surface2 p-4 rounded-lg border border-app-border cursor-pointer hover:border-primary/50 transition-colors">
                      <div className="font-bold text-app-text">{l.name}</div>
                      <div className="text-[12px] text-app-text2 mt-1">{l.lastContactDate ? new Date(l.lastContactDate).toLocaleDateString() : ''}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

          </div>
        </div>
      </div>
      
    </>
  );
}
