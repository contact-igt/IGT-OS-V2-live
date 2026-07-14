'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import NewTaskModal from '@/components/tasks/NewTaskModal';
import { Task } from '@/lib/data';
import { RefreshCw } from 'lucide-react';

const FILTER_OPTIONS = [
  { label: 'Today', days: 1 },
  { label: '2 Days', days: 2 },
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: 'All Time', days: -1 },
];

export default function LeadershipPanel() {
  const { state } = useApp();
  const allTasks = (state.tasks || []) as Task[];

  const [filterDays, setFilterDays] = useState(7);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const filteredTasks = useMemo(() => {
    if (filterDays === -1) return allTasks;
    const now = new Date();
    // Normalize to the start of the cut-off day
    const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - filterDays + 1);
    
    return allTasks.filter(t => {
      // @ts-ignore - gracefully handle variations in data structure
      const dateStr = t.createdAt || t.deadline || new Date().toISOString();
      return new Date(dateStr) >= cutoffDate;
    });
  }, [allTasks, filterDays]);

  // --- KPIs ---
  const kpis = useMemo(() => {
    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];
    
    let active = 0;
    let overdue = 0;
    let dueToday = 0;
    let review = 0;
    let done = 0;

    filteredTasks.forEach(t => {
      // @ts-ignore
      const status = t.status || 'todo';
      const isDone = status === 'done';
      
      if (!isDone) active++;
      if (status === 'in_review') review++;
      if (isDone) done++;

      // @ts-ignore
      if (t.deadline && !isDone) {
        // @ts-ignore
        const dl = new Date(t.deadline);
        const dlStr = dl.toISOString().split('T')[0];
        if (dlStr === todayDateStr) {
          dueToday++;
        } else if (dl < now) {
          overdue++;
        }
      }
    });

    return { active, overdue, dueToday, review, done };
  }, [filteredTasks]);

  // --- Charts Data ---
  // 1. Status Breakdown
  const statusData = useMemo(() => {
    const counts = { todo: 0, in_progress: 0, review: 0, blocked: 0, done: 0 };
    filteredTasks.forEach(t => {
      // @ts-ignore
      const s = (t.status || 'todo').toLowerCase();
      if (s in counts) counts[s as keyof typeof counts]++;
      else counts.todo++;
    });
    return Object.entries(counts).map(([k, v]) => ({ label: k.replace('_', ' '), value: v }));
  }, [filteredTasks]);
  const maxStatus = Math.max(...statusData.map(d => d.value), 1);

  // 2. Priority
  const priorityData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredTasks.forEach(t => {
      // @ts-ignore
      const p = (t.priority || 'medium').toLowerCase();
      if (p in counts) counts[p as keyof typeof counts]++;
      else counts.medium++;
    });
    return Object.entries(counts).map(([k, v]) => ({ label: k, value: v }));
  }, [filteredTasks]);
  const maxPriority = Math.max(...priorityData.map(d => d.value), 1);

  // 3. Completion Trend (SVG Line)
  const trendData = useMemo(() => {
    const map: Record<string, number> = {};
    const daysToMap = filterDays === -1 ? 30 : filterDays === 1 ? 7 : filterDays; // min 7 days for trend line visualization
    
    for (let i = daysToMap - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toISOString().split('T')[0]] = 0;
    }

    filteredTasks.forEach(t => {
      // @ts-ignore
      if (t.status === 'done') {
        // @ts-ignore
        const dateStr = (t.updatedAt || t.createdAt || new Date().toISOString()).split('T')[0];
        if (map[dateStr] !== undefined) {
          map[dateStr]++;
        }
      }
    });

    const values = Object.values(map);
    return {
      labels: Object.keys(map).map(d => d.slice(5)), // MM-DD
      values,
      max: Math.max(...values, 1)
    };
  }, [filteredTasks, filterDays]);

  // 4. Team Workload
  const workloadData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTasks.forEach(t => {
      // @ts-ignore
      if (t.status !== 'done') {
        // @ts-ignore
        const assignee = t.assigneeId || t.assignee || 'Unassigned';
        map[assignee] = (map[assignee] || 0) + 1;
      }
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return sorted.map(([k, v]) => ({ label: k, value: v }));
  }, [filteredTasks]);
  const maxWorkload = Math.max(...workloadData.map(d => d.value), 1);

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-bg">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-syne text-text tracking-tight mb-1">Ops Dashboard</h1>
          <p className="text-sm font-grotesk text-text-2">{todayStr}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Date Filter */}
          <div className="flex bg-surface p-1 rounded-md border border-border">
            {FILTER_OPTIONS.map(opt => {
              const isActive = filterDays === opt.days;
              return (
                <button
                  key={opt.label}
                  onClick={() => setFilterDays(opt.days)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold font-grotesk transition-all ${isActive ? 'bg-primary text-bg shadow-sm' : 'text-text-2 hover:text-text hover:bg-hover'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-surface border border-border text-text hover:bg-hover transition-colors"
          >
            <RefreshCw 
              size={16} 
              className={`transition-transform duration-500 ${isRefreshing ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
        </div>
      </div>

      {/* KPIs (Bento Rhythm) */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Hero KPI */}
        <div className="col-span-1 md:col-span-2 bg-text border border-text rounded-xl p-6 flex flex-col gap-2">
          <div className="text-sm font-medium text-bg/70">Total Active</div>
          <div className="text-5xl font-syne font-bold text-bg">{kpis.active}</div>
        </div>
        
        {/* Standard KPIs */}
        <KpiCard title="Overdue" value={kpis.overdue} color="text-red-500" />
        <KpiCard title="Due Today" value={kpis.dueToday} color="text-amber-500" />
        <KpiCard title="In Review" value={kpis.review} color="text-blue-500" />
        <KpiCard title="Done" value={kpis.done} color="text-primary" />
      </div>

      {/* Charts Section (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Chart 1: Status */}
        <ChartCard title="Task Status Breakdown" className="col-span-1">
          <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', gap: '12px', paddingTop: '20px' }}>
            {statusData.map(d => (
              <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--c-text-2)' }}>{d.value}</div>
                <div style={{ 
                  width: '100%', 
                  background: '#2AB182', 
                  borderRadius: '4px 4px 0 0',
                  height: `${(d.value / maxStatus) * 120}px`,
                  transition: 'height 0.3s'
                }} />
                <div style={{ fontSize: '12px', color: 'var(--c-text-3)', textTransform: 'capitalize' }}>
                  {d.label}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Chart 3: Completion Trend (Span 2 columns for bento effect) */}
        <ChartCard title="Completion Trend" className="col-span-1 md:col-span-2 bg-surface-2 border-none">
          <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', gap: '12px', paddingTop: '20px' }}>
            {priorityData.map(d => (
              <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--c-text-2)' }}>{d.value}</div>
                <div style={{ 
                  width: '100%', 
                  background: '#7C3AED', 
                  borderRadius: '4px 4px 0 0',
                  height: `${(d.value / maxPriority) * 120}px`,
                  transition: 'height 0.3s'
                }} />
                <div style={{ fontSize: '12px', color: 'var(--c-text-3)', textTransform: 'capitalize' }}>
                  {d.label}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Chart 3: Completion Trend */}
        <ChartCard title="Completion Trend">
          <div style={{ position: 'relative', height: '100%', width: '100%', paddingTop: '20px' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#2AB182"
                strokeWidth="2"
                points={
                  trendData.values.map((v, i) => {
                    const x = trendData.values.length > 1 ? (i / (trendData.values.length - 1)) * 100 : 50;
                    const y = 100 - ((v / trendData.max) * 80); // leave 20% padding at top
                    return `${x},${y}`;
                  }).join(' ')
                }
              />
              {trendData.values.map((v, i) => {
                const x = trendData.values.length > 1 ? (i / (trendData.values.length - 1)) * 100 : 50;
                const y = 100 - ((v / trendData.max) * 80);
                return (
                  <circle key={i} cx={x} cy={y} r="3" fill="#2AB182" />
                );
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              {trendData.labels.filter((_, i) => i === 0 || i === trendData.labels.length - 1 || i === Math.floor(trendData.labels.length / 2)).map((l, i) => (
                <span key={i} style={{ fontSize: '11px', color: 'var(--c-text-3)' }}>{l}</span>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Chart 4: Team Workload */}
        <ChartCard title="Team Workload (Active)" className="col-span-1 md:col-span-3">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '12px' }}>
            {workloadData.length === 0 ? (
              <div style={{ color: 'var(--c-text-3)', fontSize: '14px', textAlign: 'center' }}>No active tasks assigned</div>
            ) : workloadData.map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '80px', fontSize: '12px', color: 'var(--c-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.label}
                </div>
                <div style={{ flex: 1, background: 'var(--c-surface-2)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${(d.value / maxWorkload) * 100}%`, 
                    height: '100%', 
                    background: '#7C3AED',
                    borderRadius: '4px',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ width: '24px', fontSize: '12px', color: 'var(--c-text-2)', textAlign: 'right' }}>
                  {d.value}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Task Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-base font-semibold font-syne text-text m-0">Active Tasks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-2 text-text-3 text-xs uppercase font-grotesk tracking-wider">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Task Title</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Deadline</th>
                <th className="px-5 py-3 font-medium">Est. Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* @ts-ignore */}
              {filteredTasks.filter(t => t.status !== 'done').length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--c-text-3)' }}>
                    No active tasks found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredTasks.filter(t => (t as any).status !== 'done').map((t, idx) => {
                  const task = t as any;
                  return (
                  <tr 
                    key={task.id || idx} 
                    onClick={() => setSelectedTaskId(task.id)}
                    style={{ 
                      borderBottom: '1px solid var(--c-border)',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--c-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 20px', color: 'var(--c-text)' }}>{task.clientId || task.client || '-'}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--c-text)', fontWeight: 500 }}>{task.title || 'Untitled Task'}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--c-text-2)' }}>{task.categoryId || task.category || '-'}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        background: getPriorityColor(task.priority) + '20',
                        color: getPriorityColor(task.priority)
                      }}>
                        {(task.priority || 'Medium').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--c-text-2)', textTransform: 'capitalize' }}>
                      {(task.status || 'todo').replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--c-text-2)' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--c-text-2)' }}>
                      {task.estHours || task.estimatedHours || '-'}
                    </td>
                  </tr>
                )}
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTaskId && (
        <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}

// --- Helper Components ---

function KpiCard({ title, value, color }: { title: string, value: number, color: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-2">
      <div className="text-xs font-medium text-text-2 uppercase tracking-wider font-grotesk">{title}</div>
      <div className={`text-3xl font-bold font-syne ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-xl p-5 flex flex-col min-h-[260px] ${className}`}>
      <div className="text-sm font-semibold font-syne text-text mb-4">
        {title}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

function getPriorityColor(priority?: string) {
  switch ((priority || '').toLowerCase()) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#3b82f6';
    case 'low': return '#2AB182';
    default: return '#8b5cf6';
  }
}
