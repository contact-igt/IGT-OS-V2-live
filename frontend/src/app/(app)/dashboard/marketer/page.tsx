'use client';

import { useApp } from '@/contexts/AppContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { MonthlyMetricsTable } from '@/components/dashboard/MonthlyMetricsTable';
import { DashboardCard } from '@/components/dashboard/DashboardCard';

export default function MarketerDashboard() {
  const { state } = useApp();
  
  // Marketer User Info
  const marketerUser = state.teamMembers.find(m => m.roleTag === 'performance_marketer') || { name: 'Aiswarya / Anju', initials: 'AA' };

  // Mock Campaigns Data
  const campaigns = [
    { id: '1', clientCode: 'GLB', clientName: 'GlobalCorp', channelName: 'Meta Ads', status: 'NEEDS ATTENTION' as const, weekSpend: 15000, budget: 12000, weekLeads: 45, cpl: 333, targetCpl: 250, lastOptimized: '3 days ago', reminderText: 'CPL is 33% above target. Pause underperforming adsets.' },
    { id: '2', clientCode: 'NEX', clientName: 'Nexus Tech', channelName: 'Google Search', status: 'LIVE' as const, weekSpend: 42000, budget: 50000, weekLeads: 120, cpl: 350, targetCpl: 400, lastOptimized: 'Yesterday', trend: { value: -12, label: 'vs last week CPL' } },
    { id: '3', clientCode: 'FIN', clientName: 'FinServe', channelName: 'LinkedIn Ads', status: 'PROOF WINDOW' as const, weekSpend: 0, budget: 80000, weekLeads: 0, cpl: 0, lastOptimized: 'N/A', proofDeadline: 'Today 5:00 PM' },
    { id: '4', clientCode: 'BLU', clientName: 'BluePeak', channelName: 'Meta Ads', status: 'LIVE' as const, weekSpend: 28000, budget: 30000, weekLeads: 185, cpl: 151, targetCpl: 200, lastOptimized: '2 days ago', trend: { value: 5, label: 'vs last week CPL' } },
  ];

  const metricRows = [
    { label: 'GlobalCorp', countText: '145 leads', avgText: '₹320 CPL', benchmarkText: 'Target: ₹250', trendValue: 12, trendGood: false },
    { label: 'Nexus Tech', countText: '420 leads', avgText: '₹345 CPL', benchmarkText: 'Target: ₹400', trendValue: -8, trendGood: true },
    { label: 'BluePeak', countText: '680 leads', avgText: '₹148 CPL', benchmarkText: 'Target: ₹200', trendValue: -2, trendGood: true },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PreviewBanner roleName="Performance Marketer" userName={marketerUser.name} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">Marketer Workspace</h1>
              <p className="text-[var(--c-text-2)] font-grotesk">Welcome back, {marketerUser.initials}</p>
            </div>
            
            <button className="bg-[var(--c-primary)] text-[#0E0E0E] font-bold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Log Daily Numbers
            </button>
          </header>

          {/* Top KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DashboardCard 
              title="Total Ad Spend" 
              value="₹3.2L" 
              subtitle="This month"
              icon="payments" 
            />
            <DashboardCard 
              title="Total Leads" 
              value="1,245" 
              trend={{ value: 15, label: 'vs last month' }} 
              icon="group_add" 
            />
            <DashboardCard 
              title="Avg Agency CPL" 
              value="₹258" 
              trend={{ value: -4, label: 'vs last month' }} 
              icon="trending_down" 
            />
            <DashboardCard 
              title="Active Campaigns" 
              value="12" 
              icon="campaign" 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">
                CAMPAIGN PULSE
              </h3>
              
              <div className="space-y-4">
                {campaigns.map(camp => (
                  <CampaignCard key={camp.id} {...camp} />
                ))}
              </div>
            </div>

            <div className="xl:col-span-1">
              <MonthlyMetricsTable 
                title="CLIENT PERFORMANCE (JULY)"
                rows={metricRows}
                footerContent={
                  <div className="flex justify-between items-center">
                    <span>Target Hit Rate:</span>
                    <span className="text-emerald-500 font-bold">85%</span>
                  </div>
                }
              />
              
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">
                  QUICK LINKS
                </h3>
                <div className="space-y-3">
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">ads_click</span>
                    Meta Ads Manager
                  </a>
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Google Ads
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
