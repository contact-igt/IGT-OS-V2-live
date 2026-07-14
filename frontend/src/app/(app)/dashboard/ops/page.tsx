'use client';

import { useApp } from '@/contexts/AppContext';
import { PreviewBanner } from '@/components/dashboard/PreviewBanner';
import { TaskQueueTable } from '@/components/dashboard/TaskQueueTable';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useState } from 'react';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import { isOverdue } from '@/lib/data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function OpsDashboard() {
  const { state } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Ops User Info
  const opsUser = state.teamMembers.find(m => m.roleTag === 'ops') || { name: 'Anitha / Abhilash', initials: 'AY' };

  const activeTasks = state.tasks.filter(t => t.status !== 'done');
  const overdueTasks = activeTasks.filter(t => isOverdue(t));
  const inReviewTasks = state.tasks.filter(t => t.status === 'in_review');
  const doneThisMonth = state.tasks.filter(t => t.status === 'done'); // Simplified mock

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PreviewBanner roleName="Operations" userName={opsUser.name} />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-[var(--c-text)] font-syne mb-2">Ops Dashboard</h1>
              <p className="text-[var(--c-text-2)] font-grotesk">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </header>

          {/* Top KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DashboardCard 
              title="Active Tasks" 
              value={activeTasks.length.toString()} 
              icon="task" 
            />
            <DashboardCard 
              title="Overdue" 
              value={overdueTasks.length.toString()} 
              icon="warning" 
              subtitle="Requires follow-up"
            />
            <DashboardCard 
              title="In Review" 
              value={inReviewTasks.length.toString()} 
              icon="rate_review" 
            />
            <DashboardCard 
              title="Done This Month" 
              value={doneThisMonth.length.toString()} 
              icon="check_circle" 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <TaskQueueTable 
                title="ALL ACTIVE TASKS"
                tasks={activeTasks} 
                onTaskClick={setSelectedTaskId} 
                renderExtraColumns={() => (
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--c-text-2)] uppercase">Assignee</th>
                )}
                renderExtraCells={(task) => {
                  const assignee = state.teamMembers.find(m => m.id === task.assignedTo?.[0]);
                  return (
                    <td className="px-6 py-3 text-sm">
                      <span className="text-[var(--c-text)] bg-[var(--c-surface-2)] px-2 py-0.5 rounded-full text-xs font-medium">
                        {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
                      </span>
                    </td>
                  );
                }}
              />
            </div>

            <div className="xl:col-span-1 space-y-6">
              {/* Client Task Distribution Chart */}
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase mb-4">
                  Client Task Load
                </h3>
                
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state.clients.map(c => ({
                      name: c.name,
                      tasks: state.tasks.filter(t => t.clientId === c.id && t.status !== 'done').length
                    })).filter(d => d.tasks > 0).sort((a,b) => b.tasks - a.tasks).slice(0, 5)}>
                      <XAxis dataKey="name" tick={{fill: 'var(--c-text-3)', fontSize: 10}} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: 'var(--c-surface-2)'}}
                        contentStyle={{backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '8px'}}
                      />
                      <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                        {
                          state.clients.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="var(--c-primary)" />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Read-Only Gantt Snippet */}
              <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase">
                    Timeline Overview
                  </h3>
                  <a href="/tasks?view=gantt" className="text-xs font-bold text-[var(--c-primary)] hover:underline">View Full</a>
                </div>
                
                <div className="space-y-4">
                  {state.tasks.filter(t => t.status !== 'done' && t.deadline).slice(0, 5).sort((a,b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()).map(task => (
                    <div key={task.id} className="relative pt-2 pb-2">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-medium text-[var(--c-text)] truncate max-w-[70%]">{task.title}</p>
                        <p className="text-[10px] text-[var(--c-text-3)]">{new Date(task.deadline!).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>
                      </div>
                      <div className="w-full bg-[var(--c-surface-2)] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isOverdue(task) ? 'bg-red-500' : 'bg-[var(--c-primary)]'}`}
                          style={{
                            width: '50%',
                            marginLeft: `${Math.max(0, Math.min(80, (new Date(task.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
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
