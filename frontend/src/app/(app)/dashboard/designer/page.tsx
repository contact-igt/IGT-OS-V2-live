'use client';

import { useApp } from '@/contexts/AppContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import { TaskQueueTable } from '@/components/dashboard/TaskQueueTable';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useState } from 'react';
import TaskDrawer from '@/components/tasks/TaskDrawer';

export default function DesignerDashboard() {
  const { state } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Designer User Info
  const designerUser = state.teamMembers.find(m => m.roleTag === 'designer') || { name: 'Karan K', initials: 'KK' };

  // Filter tasks for designer
  const designTasks = state.tasks.filter(t => t.category === 'design_creative' && t.status !== 'done');
  const creativeQueue = designTasks.filter(t => t.status === 'todo' || t.status === 'in_progress');
  const revisionQueue = designTasks.filter(t => t.status === 'in_review');

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PreviewBanner roleName="Designer" userName={designerUser.name} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">Designer Workspace</h1>
              <p className="text-[var(--c-text-2)] font-grotesk">Welcome back, {designerUser.initials}</p>
            </div>
          </header>

          {/* Top KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DashboardCard 
              title="Assets Delivered" 
              value="42" 
              subtitle="This month"
              trend={{ value: 5, label: 'velocity' }} 
              icon="draw" 
            />
            <DashboardCard 
              title="In Review" 
              value={revisionQueue.length.toString()} 
              icon="rate_review" 
            />
            <DashboardCard 
              title="Revision Rate" 
              value="8%" 
              trend={{ value: -1, label: 'vs last month' }} 
              icon="published_with_changes" 
            />
            <DashboardCard 
              title="Focus Time" 
              value="28h" 
              subtitle="This week"
              icon="timer" 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <TaskQueueTable 
                title="CREATIVE QUEUE"
                tasks={creativeQueue} 
                onTaskClick={setSelectedTaskId} 
              />
              
              <TaskQueueTable 
                title="REVISION & REVIEW QUEUE"
                tasks={revisionQueue} 
                onTaskClick={setSelectedTaskId} 
              />
            </div>

            <div className="xl:col-span-1">
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 mb-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">
                  QUICK LINKS
                </h3>
                <div className="space-y-3">
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">brush</span>
                    Figma Workspace
                  </a>
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                    Brand Assets Drive
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
