'use client';

import { useApp } from '@/contexts/AppContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useState, useEffect } from 'react';
import TaskCard from '@/components/tasks/TaskCard';

export default function COODashboard() {
  const { state } = useApp();
  const cooUser = state.teamMembers.find(m => m.roleTag === 'ops') || { name: 'Operations Lead' };

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiBaseUrl}/api/analytics/coo`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (err) {
        console.error('Failed to fetch COO analytics', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const getClientCode = (clientId: string) => {
    return state.clients.find(c => c.id === clientId)?.code || 'UNK';
  };

  const getClientName = (clientId: string) => {
    return state.clients.find(c => c.id === clientId)?.name || 'Unknown Client';
  };

  const inProgressTasks = state.tasks.filter(t => t.status === 'in_progress');
  
  // Group in-progress tasks by client
  const tasksByClient = inProgressTasks.reduce((acc, task) => {
    const clientId = task.clientId || 'unassigned';
    if (!acc[clientId]) acc[clientId] = [];
    acc[clientId].push(task);
    return acc;
  }, {} as Record<string, typeof state.tasks>);

  if (loading) {
    return <div className="p-8 text-[var(--c-text-2)]">Loading COO dashboard...</div>;
  }

  if (!analytics) {
    return <div className="p-8 text-[var(--c-error)]">Failed to load analytics</div>;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PreviewBanner roleName="COO" userName={cooUser.name} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">Operations Dashboard</h1>
            <p className="text-[var(--c-text-2)] font-grotesk">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DashboardCard 
              title="Active Tasks" 
              value={analytics.activeTasks.toString()} 
              icon="assignment" 
            />
            <DashboardCard 
              title="Overdue Tasks" 
              value={analytics.overdueCount.toString()} 
              icon="warning" 
            />
            <DashboardCard 
              title="Team Capacity" 
              value={`${analytics.teamCapacity.bookedHours}h / ${analytics.teamCapacity.availableHours}h`} 
              subtitle={`${Math.round((analytics.teamCapacity.bookedHours / analytics.teamCapacity.availableHours) * 100)}% Booked`}
              icon="group" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold text-[var(--c-text)] font-syne mb-4">In-Progress Tasks by Client</h2>
              {Object.entries(tasksByClient).map(([clientId, tasks]) => (
                <div key={clientId} className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--c-border)]">
                    <h3 className="font-syne font-bold text-[var(--c-text)] text-lg">
                      {getClientName(clientId)} <span className="text-[var(--c-text-3)] text-sm ml-2">({getClientCode(clientId)})</span>
                    </h3>
                    <span className="text-xs bg-[var(--c-surface-2)] text-[var(--c-text-2)] px-2 py-1 rounded">
                      {tasks.length} tasks
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tasks.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => {}} />
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(tasksByClient).length === 0 && (
                <div className="p-8 text-center text-[var(--c-text-2)] bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)]">
                  No active tasks in progress.
                </div>
              )}
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--c-error)]" style={{ fontSize: '18px' }}>report</span>
                  Bottlenecks
                </h3>
                <div className="space-y-4">
                  {analytics.bottlenecks.map((b: any) => (
                    <div key={b.id} className="p-3 bg-[var(--c-surface-2)] rounded border-l-2 border-[var(--c-error)]">
                      <p className="font-bold text-[var(--c-text)] text-sm">{b.department}</p>
                      <p className="text-sm text-[var(--c-text-2)] mt-1">{b.issue}</p>
                    </div>
                  ))}
                  {analytics.bottlenecks.length === 0 && (
                    <p className="text-sm text-[var(--c-text-2)]">No bottlenecks reported.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
