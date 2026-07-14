'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import TaskCard from '@/components/tasks/TaskCard';
import { Terminal, CheckCircle2, CloudLightning, GitCommit, PlayCircle } from 'lucide-react';

export default function DeveloperDashboardPage() {
  const { state } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  if (!currentUser) return <div className="p-10 text-center text-app-text">Please log in.</div>;

  const myTasks = state.tasks.filter(t => t.assignedTo.includes(currentUser.id));
  
  const devTasks = myTasks.filter(t => t.status === 'in_progress');
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
              Dev Console
            </h1>
            <p className="text-[14px] text-app-text2 font-grotesk mt-1">
              Welcome back, {currentUser.name.split(' ')[0]}. Here is your sprint overview.
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
          <div className="max-w-[1200px] mx-auto space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-app-surface2 border border-app-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CloudLightning className="w-5 h-5 text-green-500" />
                  <h3 className="font-bold text-app-text text-[15px]">Production</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-app-text3">api.igtos.com</span>
                  <span className="text-[12px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold">Healthy</span>
                </div>
              </div>
              
              <div className="bg-app-surface2 border border-app-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CloudLightning className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold text-app-text text-[15px]">Staging</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-app-text3">staging.igtos.com</span>
                  <span className="text-[12px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-bold">Building...</span>
                </div>
              </div>
              
              <div className="bg-app-surface2 border border-app-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <GitCommit className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-app-text text-[15px]">Recent Commits</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-app-text3">main branch</span>
                  <span className="text-[12px] text-app-text font-mono">b3d9f1a</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              <section className="bg-app-surface/30 rounded-xl p-4 border border-app-border">
                <h2 className="text-[16px] font-bold font-syne text-app-text mb-4">Sprint Backlog ({upcomingTasks.length})</h2>
                <div className="space-y-3">
                  {upcomingTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />)}
                </div>
              </section>

              <section className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                <h2 className="text-[16px] font-bold font-syne text-blue-500 mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Coding ({devTasks.length})
                </h2>
                <div className="space-y-3">
                  {devTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />)}
                </div>
              </section>

              <section className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/20">
                <h2 className="text-[16px] font-bold font-syne text-purple-500 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Code Review / PR ({reviewTasks.length})
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
