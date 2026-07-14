// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import TasksOverviewWidget from '@/components/dashboard/widgets/TasksOverviewWidget';
import TeamTasksWidget from '@/components/dashboard/widgets/TeamTasksWidget';
import TeamSnapshotWidget from '@/components/dashboard/widgets/TeamSnapshotWidget';
import ClientHealthWidget from '@/components/dashboard/widgets/ClientHealthWidget';
import PaymentsWidget from '@/components/dashboard/widgets/PaymentsWidget';
import SalesPipelineWidget from '@/components/dashboard/widgets/SalesPipelineWidget';
import MeetingsWidget from '@/components/dashboard/widgets/MeetingsWidget';
import CampaignsWidget from '@/components/dashboard/widgets/CampaignsWidget';
import DevActivityWidget from '@/components/dashboard/widgets/DevActivityWidget';
import SocialMediaWidget from '@/components/dashboard/widgets/SocialMediaWidget';
import FinancialsWidget from '@/components/dashboard/widgets/FinancialsWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);


const DEFAULT_LAYOUT = {
  lg: [
    { i: 'tasksoverview', x: 0, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'teamtasks', x: 1, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'teamsnapshot', x: 2, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'clienthealth', x: 0, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'payments', x: 1, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'salespipeline', x: 2, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'meetings', x: 0, y: 4, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'campaigns', x: 1, y: 4, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'financials', x: 2, y: 4, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'devactivity', x: 0, y: 6, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'socialmedia', x: 1, y: 6, w: 1, h: 2, minW: 1, minH: 2 },
  ],
  md: [
    { i: 'tasksoverview', x: 0, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'teamtasks', x: 1, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'teamsnapshot', x: 0, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'clienthealth', x: 1, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'payments', x: 0, y: 4, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'salespipeline', x: 1, y: 4, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'meetings', x: 0, y: 6, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'campaigns', x: 1, y: 6, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'financials', x: 0, y: 8, w: 2, h: 4, minW: 1, minH: 3 },
    { i: 'devactivity', x: 0, y: 12, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'socialmedia', x: 1, y: 12, w: 1, h: 2, minW: 1, minH: 2 },
  ],
};

export default function DashboardPage() {
  const { state } = useApp();
  const isOps = state.user?.role === "ops";
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [financeVisible, setFinanceVisible] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  
  const [layouts, setLayouts] = useState<any>(() => JSON.parse(JSON.stringify(DEFAULT_LAYOUT)));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [financeIdleTimer, setFinanceIdleTimer] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    const isVisible = localStorage.getItem('finance_visible') === 'true';
    setFinanceVisible(isVisible);
    
    // Load saved layouts
    const savedLayout = localStorage.getItem('dashboard_layouts');
    if (savedLayout) {
      try {
        setLayouts(JSON.parse(savedLayout));
      } catch (e) {
        console.error("Failed to parse layout");
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (financeVisible) {
      interval = setInterval(() => {
        setFinanceIdleTimer(prev => prev + 1);
      }, 1000);
    } else {
      setFinanceIdleTimer(0);
    }
    return () => clearInterval(interval);
  }, [financeVisible]);

  useEffect(() => {
    if (financeIdleTimer > 60) {
      setFinanceVisible(false);
    }
  }, [financeIdleTimer]);

  const toggleFinanceVisible = () => {
    setFinanceVisible(prev => {
      const next = !prev;
      setFinanceIdleTimer(0);
      localStorage.setItem('finance_visible', String(next));
      return next;
    });
  };
  
  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem('dashboard_layouts', JSON.stringify(allLayouts));
  };

  const resetLayout = () => {
    localStorage.removeItem('dashboard_layouts');
    setLayouts(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)));
  };

  const renderMoney = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const teamMembers = state.teamMembers || [];
  const currentUser = teamMembers.find((m: any) => m.id === state.currentUserId) || 
                      (state.currentUserId === 'u1' ? { role: 'admin' } as any : null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Computed data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // 1. Tasks
  const tasks = state.tasks || [];
  const activeTasks = tasks.filter((t: any) => t.status !== 'Done');
  const tasksDueToday = activeTasks.filter((t: any) => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate.getTime() === today.getTime();
  });
  const tasksOverdue = activeTasks.filter((t: any) => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate.getTime() < today.getTime();
  });
  const tasksInReview = tasks.filter((t: any) => t.status === 'Review');

  // 2. Team Snapshot — only count unique users clocked in today, capped at team size
  const totalTeam = teamMembers.length;
  const attendanceLogs = state.attendanceLogs || [];
  // Filter: only today's logs, and only for actual team members
  const teamMemberIdSet = new Set(teamMembers.map((m: any) => m.id));
  const presentToday = attendanceLogs.filter((log: any) => {
    const logDate = log.date || log.timestamp?.split('T')[0];
    return logDate === todayStr && teamMemberIdSet.has(log.userId);
  });
  // Deduplicate: one entry per userId (in case of duplicate logs)
  const presentUserIdSet = new Set(presentToday.map((log: any) => log.userId));
  const presentUserIds = Array.from(presentUserIdSet) as string[];
  const presentCount = Math.min(presentUserIds.length, totalTeam); // can never exceed total
  const notClockedIn = teamMembers.filter((m: any) => !presentUserIdSet.has(m.id));

  // 3. Client Health
  const clients = state.clients || [];
  const activeHealthyCount = clients.filter((c: any) => c.clientStatus === 'active' || (!c.clientStatus && c.contractStatus === 'active')).length;
  const onHoldPaused = clients.filter((c: any) => c.clientStatus === 'on_hold' || c.contractStatus === 'paused');
  const delayedAtRisk = clients.filter((c: any) => c.clientStatus === 'at_risk');
  const churnedQtr = clients.filter((c: any) => c.clientStatus === 'churned' || c.contractStatus === 'churned');
  
  const perfMarketingCount = clients.filter((c: any) => c.category?.toLowerCase().includes('marketing') || c.category?.toLowerCase().includes('performance')).length || 8;
  const socialMediaCount = clients.filter((c: any) => c.category?.toLowerCase().includes('social')).length || 7;
  const websiteCount = clients.filter((c: any) => c.category?.toLowerCase().includes('web')).length || 4;
  const saasCount = clients.filter((c: any) => c.category?.toLowerCase().includes('saas') || c.category?.toLowerCase().includes('product')).length || 1;

  // 4. Ad Budgets
  const adAccountBalances = state.adAccountBalances || [];

  // 5. Sales Pipeline
  const leads = state.leads || [];
  const pipelineValue = leads.reduce((acc: number, lead: any) => acc + (lead.value || 0), 0);
  const leadsInDiscovery = leads.filter((l: any) => (l.stage || '').toLowerCase() === 'discovery').length;
  const leadsInProposal = leads.filter((l: any) => (l.stage || '').toLowerCase() === 'proposal').length;
  const leadsInReview = leads.filter((l: any) => (l.stage || '').toLowerCase() === 'review').length;
  const leadsWonThisMonth = leads.filter((l: any) => (l.stage || '').toLowerCase() === 'won').length;
  const leadsLostThisMonth = leads.filter((l: any) => (l.stage || '').toLowerCase() === 'lost').length;
  
  // Payments
  const payments = state.payments || [];
  const currentCyclePayments = payments.filter((p: any) => p.cycleMonth === '2026-07');
  const olderUnpaidClaims = payments.filter((p: any) => p.cycleMonth !== '2026-07' && p.amountPaid < p.amountDue);
  
  const totalCollected = currentCyclePayments.reduce((acc: number, p: any) => acc + (p.amountPaid || 0), 0);
  const totalDue = currentCyclePayments.reduce((acc: number, p: any) => acc + (p.amountDue || 0), 0);
  const totalOutstanding = totalDue - totalCollected;

  // 6. Meetings Today
  const meetings = state.meetings || [];
  const todayMeetings = meetings.filter((m: any) => {
    const meetingDate = new Date(m.date || m.startTime);
    meetingDate.setHours(0, 0, 0, 0);
    return meetingDate.getTime() === today.getTime();
  });

  // 7. Campaign Health
  const campaignWeeklyLogs = state.campaignWeeklyLogs || [];

  // 8. Dev Activity
  const githubActivity = state.githubActivity || [];
  const githubRepos = state.githubRepos || [];
  const financeBlur = !financeVisible || state.screenShareMode ? 'blur-md select-none opacity-50' : '';

  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col min-h-full bg-[var(--c-bg)] text-[var(--c-text)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--c-border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-[var(--c-text-2)] mt-1">Agency Overview & Health Metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={resetLayout} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg hover:bg-[var(--c-surface-2)] transition-colors" title="Auto Align Layout">
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            Auto Align
          </button>
          <div className="text-right bg-[var(--c-surface)] border border-[var(--c-border)] px-4 py-2 rounded-xl shadow-sm">
            <div className="text-lg font-bold text-[var(--c-text)]" suppressHydrationWarning>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-[var(--c-text-2)] font-medium" suppressHydrationWarning>
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 relative">
        {mounted ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
            rowHeight={150}
            onLayoutChange={handleLayoutChange}
            margin={[24, 24]}
            draggableHandle=".drag-handle"
          >
            {/* Module 1: Tasks Overview */}
            <div key="tasksoverview">
              <TasksOverviewWidget compactMode={compactMode} activeTasks={activeTasks} tasksDueToday={tasksDueToday} tasksOverdue={tasksOverdue} tasksInReview={tasksInReview} />
            </div>
            {/* Module 1.5: Team-wise Task Overview */}
            <div key="teamtasks">
              <TeamTasksWidget compactMode={compactMode} teamMembers={teamMembers} activeTasks={activeTasks} today={today} />
            </div>
            {/* Module 2: Team Snapshot */}
            <div key="teamsnapshot">
              <TeamSnapshotWidget compactMode={compactMode} presentCount={presentCount} totalTeam={totalTeam} notClockedIn={notClockedIn} presentUserIds={presentUserIds} teamMembers={teamMembers} />
            </div>
            {/* Module 3: Client Health */}
            <div key="clienthealth">
              <ClientHealthWidget compactMode={compactMode} clients={clients} activeHealthyCount={activeHealthyCount} onHoldPaused={onHoldPaused} delayedAtRisk={delayedAtRisk} churnedQtr={churnedQtr} perfMarketingCount={perfMarketingCount} socialMediaCount={socialMediaCount} websiteCount={websiteCount} saasCount={saasCount} />
            </div>
            {/* Module 4: Payment Tracking */}
            {isAdmin && (
              <div key="payments">
                <PaymentsWidget compactMode={compactMode} clients={clients} currentCyclePayments={currentCyclePayments} olderUnpaidClaims={olderUnpaidClaims} totalCollected={totalCollected} totalDue={totalDue} financeVisible={financeVisible} screenShareMode={state.screenShareMode} setFinanceIdleTimer={setFinanceIdleTimer} toggleFinanceVisible={toggleFinanceVisible} renderMoney={renderMoney} />
              </div>
            )}
            {/* Module 5: Sales Pipeline */}
            {!isOps && (
              <div key="salespipeline">
                <SalesPipelineWidget compactMode={compactMode} router={router} leads={leads} pipelineValue={pipelineValue} leadsInDiscovery={leadsInDiscovery} leadsInProposal={leadsInProposal} leadsInReview={leadsInReview} leadsWonThisMonth={leadsWonThisMonth} leadsLostThisMonth={leadsLostThisMonth} />
              </div>
            )}
            {/* Module 6: Meetings Today */}
            <div key="meetings">
              <MeetingsWidget compactMode={compactMode} router={router} todayMeetings={todayMeetings} />
            </div>
            {/* Module 7: Campaign Health (Simplified) */}
            <div key="campaigns">
              <CampaignsWidget compactMode={compactMode} router={router} />
            </div>
            {/* Module 8: Dev Activity */}
            <div key="devactivity">
              <DevActivityWidget compactMode={compactMode} githubActivity={githubActivity} githubRepos={githubRepos} teamMembers={teamMembers} />
            </div>
            {/* Module 8.5: Social Media Metrics */}
            <div key="socialmedia">
              <SocialMediaWidget compactMode={compactMode} state={state} />
            </div>
            {/* Module 9: Financials */}
            {isAdmin ? (
              <div key="financials" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm relative overflow-hidden h-full w-full ${financeBlur} transition-all duration-300`} onMouseMove={() => setFinanceIdleTimer(0)}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
                    <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors">
                      <span className="material-symbols-outlined text-[16px] text-[var(--c-text-3)]">drag_indicator</span>
                    </div>
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Financials
                    <span className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-500/20 ml-2 tracking-wider">Admin</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {state.screenShareMode && (
                      <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                        Screen Share Active
                      </span>
                    )}
                    <button onClick={toggleFinanceVisible} className="text-[var(--c-text-3)] hover:text-[var(--c-text)] transition-colors" title="Toggle Privacy">
                      <span className="material-symbols-outlined text-[18px]">{financeVisible && !state.screenShareMode ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                </div>
                
                <div className={`flex flex-col gap-4 flex-1 relative z-10 transition-all duration-300 ${financeBlur}`}>
                  {/* Collected MTD */}
                  <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-1">Collected (MTD)</div>
                        <div className="text-3xl font-bold tracking-tight">₹4.2L</div>
                      </div>
                      <div className="text-sm font-medium text-[var(--c-text-2)] mb-1">Target: <span className="text-[var(--c-text)]">₹8.0L</span></div>
                    </div>
                    <div className="w-full bg-[var(--c-border)] rounded-full h-2 mt-3">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '52.5%' }}></div>
                    </div>
                  </div>

                  {/* Projections Graph */}
                  <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm flex-1 flex flex-col">
                    <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">Revenue Projection (Jul-Dec)</div>
                    <div className="flex items-end justify-between gap-2 flex-1 mt-2 min-h-[100px]">
                      {[1.0, 1.05, 1.12, 1.18, 1.25, 1.35].map((mult, idx) => {
                        const baseMrr = 420000; // Base ₹4.2L
                        const val = baseMrr * mult;
                        const height = Math.min(100, Math.max(20, (mult - 0.5) * 100));
                        const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return (
                          <div key={idx} className="flex flex-col items-center flex-1 group h-full justify-end">
                            <div className="w-full bg-yellow-500/20 rounded-t-sm group-hover:bg-yellow-500/40 transition-colors relative" style={{ height: `${height}%` }}>
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--c-text)] text-[var(--c-bg)] text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-bold pointer-events-none">
                                ₹{(val/100000).toFixed(1)}L
                              </div>
                            </div>
                            <div className="text-[10px] font-medium text-[var(--c-text-2)] mt-1">{months[idx]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dec 2026 Target */}
                  <div className="bg-[var(--c-surface)] border border-[var(--c-border)] p-4 rounded-xl shadow-sm">
                    <div className="text-xs font-semibold text-[var(--c-text-2)] uppercase mb-3">Dec 2026 Target</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-[var(--c-text-2)] uppercase mb-1">Projected MRR</div>
                        <div className="text-lg font-bold text-[var(--c-text)]">₹5.67L</div>
                        <div className="text-[10px] text-yellow-500 font-medium mt-0.5">↑ 35% growth</div>
                      </div>
                      <div className="border-l border-[var(--c-border)] pl-4">
                        <div className="text-[10px] text-[var(--c-text-2)] uppercase mb-1">Est. Profit (35%)</div>
                        <div className="text-lg font-bold text-emerald-500">₹1.98L</div>
                        <div className="text-[10px] text-[var(--c-text-2)] font-medium mt-0.5">Monthly run rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key="financials" className="border border-[var(--c-border)] border-dashed rounded-xl bg-[var(--c-surface-2)] p-5 flex flex-col shadow-sm items-center justify-center text-center opacity-60 h-full w-full">
                <div className="drag-handle cursor-move p-1 -m-1 hover:bg-[var(--c-surface-2)] rounded transition-colors absolute top-4 left-4">
                  <span className="material-symbols-outlined text-[16px] text-[var(--c-text-3)]">drag_indicator</span>
                </div>
                <svg className="w-10 h-10 text-[var(--c-text-2)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <div className="font-semibold text-[var(--c-text)]">Financials</div>
                <div className="text-xs font-medium text-[var(--c-text-2)] mt-1">Admin access required</div>
              </div>
            )}
          </ResponsiveGridLayout>
        ) : null}
      </div>
    </div>
  );
}
