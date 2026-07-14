'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import TaskCard from '@/components/tasks/TaskCard';
import { PlayCircle, AlertTriangle, Palette, FolderOpen, Image as ImageIcon } from 'lucide-react';

export default function DesignerDashboardPage() {
  const { state } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  if (!currentUser) return <div className="p-10 text-center text-app-text">Please log in.</div>;

  const myTasks = state.tasks.filter(t => t.assignedTo.includes(currentUser.id));
  const pendingTasks = myTasks.filter(t => t.status === 'todo');
  const inProgressTasks = myTasks.filter(t => t.status === 'in_progress');
  const reviewTasks = myTasks.filter(t => t.status === 'in_review');

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden relative">
        <header className="flex-shrink-0 border-b border-app-border bg-app-surface/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-app-text tracking-tight font-syne flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-[16px]" style={{ background: currentUser.color }}>
                {currentUser.initials}
              </div>
              Design Studio
            </h1>
            <p className="text-[14px] text-app-text2 font-grotesk mt-1">
              Welcome back, {currentUser.name.split(' ')[0]}. Here is your creative pipeline.
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
          <div className="max-w-[1200px] mx-auto space-y-6">
            
            {/* Asset Links Widget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-app-surface2 border border-app-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-app-surface transition-colors">
                <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Palette className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-bold text-app-text text-[15px]">Figma Workspaces</h3>
                  <p className="text-app-text3 text-[12px]">Recent brand files</p>
                </div>
              </div>
              <div className="bg-app-surface2 border border-app-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-app-surface transition-colors">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-bold text-app-text text-[15px]">Asset Drive</h3>
                  <p className="text-app-text3 text-[12px]">Client raw assets</p>
                </div>
              </div>
              <div className="bg-app-surface2 border border-app-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-app-surface transition-colors">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-app-text text-[15px]">Stock Library</h3>
                  <p className="text-app-text3 text-[12px]">Premium vectors & images</p>
                </div>
              </div>
            </div>

            {/* Creative Pipeline Kanban */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              <section className="bg-app-surface/30 rounded-xl p-4 border border-app-border">
                <h2 className="text-[16px] font-bold font-syne text-app-text mb-4">To Do ({pendingTasks.length})</h2>
                <div className="space-y-3">
                  {pendingTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />)}
                </div>
              </section>

              <section className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                <h2 className="text-[16px] font-bold font-syne text-blue-500 mb-4 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> Designing ({inProgressTasks.length})
                </h2>
                <div className="space-y-3">
                  {inProgressTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />)}
                </div>
              </section>

              <section className="bg-orange-500/5 rounded-xl p-4 border border-orange-500/20">
                <h2 className="text-[16px] font-bold font-syne text-orange-500 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Awaiting Review ({reviewTasks.length})
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
