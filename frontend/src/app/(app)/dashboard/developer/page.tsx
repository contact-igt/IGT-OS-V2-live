'use client';

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import TaskCard from '@/components/tasks/TaskCard';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useState, useEffect } from 'react';

export default function DeveloperDashboard() {
  const { state } = useApp();
  const { user } = useAuth();
  const devUser = (user?.role === 'team' || user?.role === 'admin')
    ? (state.teamMembers.find(m => m.id === user.id) || { name: user.email, initials: 'US' })
    : (state.teamMembers.find(m => m.roleTag === 'developer') || { name: 'Gowthaman', initials: 'GM' });

  // Filter tasks related to development/automation
  const devTasks = state.tasks.filter(t => 
    t.category === 'web_development' || 
    t.category === 'whatsapp_automation' ||
    t.category === 'operations' // Sometimes tech ops
  );

  const todoTasks = devTasks.filter(t => t.status === 'todo');
  const inProgressTasks = devTasks.filter(t => t.status === 'in_progress');

  const [apiHealth, setApiHealth] = useState<{ status: string; uptime: number; databaseConnected?: boolean } | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiBaseUrl}/api/health`);
        if (res.ok) {
          setApiHealth(await res.json());
        }
      } catch (err) {
        console.error('API Health check failed', err);
      }
    }
    fetchHealth();
  }, []);

  // Mock GitHub-like streak
  const streakDays = 14;
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PreviewBanner roleName="Developer & AI Engineer" userName={devUser.name} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">Developer Workspace</h1>
            <p className="text-[var(--c-text-2)] font-grotesk">Track development tasks, API health, and system uptime.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DashboardCard 
              title="API Health" 
              value={apiHealth ? '99.9%' : 'OFFLINE'} 
              subtitle={apiHealth && apiHealth.databaseConnected ? `Connected` : 'Systems down'}
              icon="dns" 
            />
            <DashboardCard 
              title="Active PRs" 
              value="4" 
              icon="code" 
            />
            <DashboardCard 
              title="Commit Streak" 
              value={`${streakDays} Days`} 
              icon="local_fire_department" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* To Do */}
            <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] flex flex-col h-[500px]">
              <div className="p-4 border-b border-[var(--c-border)] bg-[var(--c-surface-2)]">
                <h2 className="font-syne font-bold text-[var(--c-text)]">Backlog / To Do ({todoTasks.length})</h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {todoTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => {}} />
                ))}
              </div>
            </div>

            {/* In Progress */}
            <div className="lg:col-span-2 bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] flex flex-col h-[500px]">
              <div className="p-4 border-b border-[var(--c-border)] bg-[var(--c-surface-2)]">
                <h2 className="font-syne font-bold text-[var(--c-primary)]">Current Sprints ({inProgressTasks.length})</h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max">
                {inProgressTasks.map(task => (
                  <div key={task.id} className="h-full border border-[var(--c-primary)]/30 rounded-xl p-1 bg-[var(--c-primary)]/5">
                    <TaskCard task={task} onClick={() => {}} />
                  </div>
                ))}
                {inProgressTasks.length === 0 && (
                  <p className="col-span-full text-center text-[var(--c-text-2)] p-8">No active sprints.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
