'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import TaskCard from '@/components/tasks/TaskCard';
import { PlayCircle, AlertTriangle, Video, HardDrive, UploadCloud } from 'lucide-react';

export default function EditorDashboardPage() {
  const { state } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  if (!currentUser) return <div className="p-10 text-center text-app-text">Please log in.</div>;

  const myTasks = state.tasks.filter(t => t.assignedTo.includes(currentUser.id) && t.category === 'video_editing');
  
  const renderTasks = myTasks.filter(t => t.status === 'in_progress');
  const reviewTasks = myTasks.filter(t => t.status === 'in_review');
  const upcomingTasks = myTasks.filter(t => t.status === 'todo');

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden relative">
        <header className="flex-shrink-0 border-b border-app-border bg-app-surface/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-app-text tracking-tight font-syne flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-[16px]" style={{ background: currentUser.color }}>
                {currentUser.initials}
              </div>
              Post-Production
            </h1>
            <p className="text-[14px] text-app-text2 font-grotesk mt-1">
              Welcome back, {currentUser.name.split(' ')[0]}. Here is your edit bay.
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
          <div className="max-w-[1200px] mx-auto space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-app-surface2 border border-app-border rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-app-text text-[15px]">Upload Status</h3>
                    <p className="text-app-text3 text-[12px]">All active client drives synced</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-green-500 text-[13px] font-bold">100% Synced</span>
                </div>
              </div>
              
              <div className="bg-app-surface2 border border-app-border rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-app-text text-[15px]">Local NAS Storage</h3>
                    <p className="text-app-text3 text-[12px]">Drive E: / RAID 0</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-app-text font-bold text-[14px]">4.2 TB Free</div>
                  <div className="w-24 h-1.5 bg-app-surface3 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              <section className="bg-app-surface/30 rounded-xl p-4 border border-app-border">
                <h2 className="text-[16px] font-bold font-syne text-app-text mb-4">Upcoming Edits ({upcomingTasks.length})</h2>
                <div className="space-y-3">
                  {upcomingTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />)}
                </div>
              </section>

              <section className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
                <h2 className="text-[16px] font-bold font-syne text-red-500 mb-4 flex items-center gap-2">
                  <Video className="w-4 h-4" /> Editing / Rendering ({renderTasks.length})
                </h2>
                <div className="space-y-3">
                  {renderTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />)}
                </div>
              </section>

              <section className="bg-orange-500/5 rounded-xl p-4 border border-orange-500/20">
                <h2 className="text-[16px] font-bold font-syne text-orange-500 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Review Pending ({reviewTasks.length})
                </h2>
                <div className="space-y-3">
                  {reviewTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />)}
                </div>
              </section>
            </div>

          </div>
        </div>
      </div>
      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </>
  );
}
