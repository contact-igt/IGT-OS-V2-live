'use client';

import { useApp } from '@/contexts/AppContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import { TaskQueueTable } from '@/components/dashboard/TaskQueueTable';
import { StorageMetrics } from '@/components/dashboard/StorageMetrics';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useState } from 'react';
import TaskDrawer from '@/components/tasks/TaskDrawer';

export default function VideoEditorDashboard() {
  const { state } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Video Editor User Info (fallback to standard name if not matched perfectly)
  const editorUser = state.teamMembers.find(m => m.roleTag === 'video_editor') || { name: 'Basheer / Pranesh', initials: 'BP' };

  // Filter tasks for video editor (mocking assignment or category)
  const videoTasks = state.tasks.filter(t => t.category === 'video_editing' || t.title.toLowerCase().includes('reel') || t.title.toLowerCase().includes('video'));

  const renderQueue = videoTasks.filter(t => t.status === 'in_progress' || t.status === 'in_review');
  const upcomingQueue = videoTasks.filter(t => t.status === 'todo');

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PreviewBanner roleName="Video Editor" userName={editorUser.name} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">Editor Workspace</h1>
              <p className="text-[var(--c-text-2)] font-grotesk">Welcome back, {editorUser.initials}</p>
            </div>
            
            <button className="bg-[var(--c-primary)] text-[#0E0E0E] font-bold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload</span>
              Upload Asset
            </button>
          </header>

          {/* Top KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DashboardCard 
              title="Videos Delivered" 
              value="18" 
              subtitle="This month (velocity +12)"
              icon="movie" 
            />
            <DashboardCard 
              title="In Render/Review" 
              value={renderQueue.length.toString()} 
              icon="hourglass_empty" 
            />
            <DashboardCard 
              title="Revision Rate" 
              value="14%" 
              subtitle="-2% vs last month" 
              icon="swap_horiz" 
            />
            <DashboardCard 
              title="Focus Time" 
              value="32h" 
              subtitle="This week"
              icon="timer" 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <TaskQueueTable 
                title="PRODUCTION QUEUE"
                tasks={renderQueue} 
                onTaskClick={setSelectedTaskId} 
                renderExtraColumns={() => (
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Format</th>
                )}
                renderExtraCells={(task) => {
                  const isReel = task.title.toLowerCase().includes('reel') || task.title.toLowerCase().includes('short');
                  return (
                    <td className="px-6 py-3 text-sm">
                      <span className="font-mono text-xs text-[var(--c-text-2)] bg-[var(--c-surface-2)] px-2 py-0.5 rounded">
                        {isReel ? '9:16 Reel' : '16:9 Video'}
                      </span>
                    </td>
                  );
                }}
              />
              
              <TaskQueueTable 
                title="UPCOMING (TO DO)"
                tasks={upcomingQueue} 
                onTaskClick={setSelectedTaskId} 
              />
            </div>

            <div className="xl:col-span-1">
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 mb-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">
                  STORAGE METRICS
                </h3>
                
                <StorageMetrics label="Active Projects (SSD)" totalGb={2000} usedGb={1850} />
                <StorageMetrics label="Archive (HDD)" totalGb={8000} usedGb={4200} />
                <StorageMetrics label="Cloud Delivery" totalGb={1000} usedGb={450} />
              </div>
              
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">
                  ASSET LIBRARIES
                </h3>
                <div className="space-y-3">
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                    Envato Elements Logins
                  </a>
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">music_note</span>
                    Epidemic Sound
                  </a>
                  <a href="#" className="flex items-center gap-3 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--c-surface-2)]">
                    <span className="material-symbols-outlined text-[18px]">branding_watermark</span>
                    Client Brand Kit Folder
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
