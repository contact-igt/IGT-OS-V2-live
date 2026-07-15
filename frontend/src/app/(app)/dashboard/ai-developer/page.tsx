'use client';

import { useApp } from '@/contexts/AppContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import { TaskQueueTable } from '@/components/dashboard/TaskQueueTable';
import { ProductFocusBar } from '@/components/dashboard/ProductFocusBar';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useState } from 'react';
import TaskDrawer from '@/components/tasks/TaskDrawer';

export default function AIDeveloperDashboard() {
  const { state } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // AI Developer User Info
  const aiDevUser = state.teamMembers.find(m => m.roleTag === 'ai_developer') || { name: 'Iyyappan', initials: 'IY' };

  // Filter tasks (Mocking WhatsNexus vs Agency)
  // Let's assume tasks with category 'product' are WhatsNexus, others are agency
  const allTasks = state.tasks.filter(t => t.category === 'web_development' || t.category === 'whatsapp_automation');
  
  const productTasks = allTasks.filter(t => t.category === 'web_development' || t.title.toLowerCase().includes('nexus'));
  const agencyTasks = allTasks.filter(t => !productTasks.includes(t));

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PreviewBanner roleName="AI Developer" userName={aiDevUser.name} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">AI Developer Workspace</h1>
              <p className="text-[var(--c-text-2)] font-grotesk">Welcome back, {aiDevUser.initials}</p>
            </div>
            
            <button className="bg-[var(--c-primary)] text-[#0E0E0E] font-bold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>terminal</span>
              Open Console
            </button>
          </header>

          <ProductFocusBar productPercent={85} clientPercent={15} />

          {/* Top KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DashboardCard 
              title="Feature Velocity" 
              value="9" 
              subtitle="Points this week"
              trend={{ value: 15, label: 'velocity' }} 
              icon="rocket_launch" 
            />
            <DashboardCard 
              title="Active Agents" 
              value="4" 
              icon="smart_toy" 
            />
            <DashboardCard 
              title="API Errors" 
              value="12" 
              trend={{ value: -5, label: 'vs yesterday' }} 
              icon="bug_report" 
            />
            <DashboardCard 
              title="Focus Time" 
              value="36h" 
              subtitle="This week"
              icon="timer" 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <TaskQueueTable 
                title="WHATSNEXUS SPRINT"
                tasks={productTasks.filter(t => t.status !== 'done')} 
                onTaskClick={setSelectedTaskId} 
              />
              
              <TaskQueueTable 
                title="AGENCY TASKS (Limited)"
                tasks={agencyTasks.filter(t => t.status !== 'done')} 
                onTaskClick={setSelectedTaskId} 
              />
            </div>

            <div className="xl:col-span-1">
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 mb-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">
                  SYSTEM STATUS
                </h3>
                
                <div className="space-y-4 text-sm text-[var(--c-text-2)]">
                  <div className="flex justify-between items-center">
                    <span>LLM API Gateway</span>
                    <span className="text-emerald-500 font-bold">● Operational</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Vector DB</span>
                    <span className="text-emerald-500 font-bold">● Operational</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Webhook Listener</span>
                    <span className="text-emerald-500 font-bold">● Operational</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">
                  QUICK LINKS
                </h3>
                <div className="space-y-3">
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">cloud</span>
                    Vercel Dashboard
                  </a>
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">database</span>
                    Postgres Console
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
