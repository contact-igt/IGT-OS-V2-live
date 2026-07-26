// @ts-nocheck
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { isOverdue } from '@/lib/data';

import TasksOverviewWidget from '@/components/dashboard/widgets/TasksOverviewWidget';
import TeamTasksWidget from '@/components/dashboard/widgets/TeamTasksWidget';
import TeamSnapshotWidget from '@/components/dashboard/widgets/TeamSnapshotWidget';
import MeetingsWidget from '@/components/dashboard/widgets/MeetingsWidget';
import SocialMediaWidget from '@/components/dashboard/widgets/SocialMediaWidget';
import TasksByStatusChart from '@/components/dashboard/TasksByStatusChart';
import DashboardFilterBar, { DashboardFilters, EMPTY_FILTERS } from '@/components/dashboard/DashboardFilterBar';
import AllTasksTable from '@/components/dashboard/AllTasksTable';
import TaskDrawer from '@/components/tasks/TaskDrawer';

const TABS = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'team', label: 'Team' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'social', label: 'Social Media' },
];

export default function DashboardPage() {
  const { state } = useApp();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'tasks' | 'team' | 'meetings' | 'social'>('tasks');
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const teamMembers = state.teamMembers || [];
  const clients = state.clients || [];

  // todayStr must match Postgres's CURRENT_DATE (UTC), so it's derived from the current
  // moment directly — NOT from `today` below, which is deliberately shifted to local midnight
  // for calendar-day deadline comparisons and would otherwise roll back a day in any
  // timezone ahead of UTC (e.g. IST) once .toISOString() re-serializes it.
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allTasks = state.tasks || [];

  // Filtered task set — drives both the summary widgets and the data table, so the
  // filter bar controls the whole board, not just the table underneath it.
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t: any) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const client = clients.find((c: any) => c.id === t.clientId);
        const haystack = [t.title, client?.name, ...(t.tags || [])].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.assignee !== 'all' && !t.assignedTo?.includes(filters.assignee)) return false;
      if (filters.clientId !== 'all' && t.clientId !== filters.clientId) return false;
      if (filters.dateFrom && (!t.deadline || new Date(t.deadline) < new Date(filters.dateFrom))) return false;
      if (filters.dateTo && (!t.deadline || new Date(t.deadline) > new Date(filters.dateTo))) return false;
      return true;
    });
  }, [allTasks, filters, clients]);

  // Stat groups (computed off the filtered set)
  const activeTasks = filteredTasks.filter((t: any) => t.status === 'in_progress');
  const tasksCompleted = filteredTasks.filter((t: any) => t.status === 'done');
  const tasksPending = filteredTasks.filter((t: any) => t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'in_progress');
  const tasksDueToday = filteredTasks.filter((t: any) => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate.getTime() === today.getTime();
  });
  const tasksOverdue = filteredTasks.filter((t: any) => isOverdue(t));
  const tasksInReview = filteredTasks.filter((t: any) => t.status === 'in_review');

  // Team Snapshot — only count unique users clocked in today, capped at team size
  const totalTeam = teamMembers.length;
  const attendanceLogs = state.attendanceLogs || [];
  const presentToday = attendanceLogs.filter((log: any) => {
    const logDate = log.date || log.timestamp?.split('T')[0];
    return logDate === todayStr && !!log.userId;
  });
  const presentUserSet = new Set(presentToday.map((log: any) => log.userId));
  const presentUserIds = Array.from(presentUserSet) as string[];
  const presentCount = Math.min(presentUserIds.length, totalTeam);
  const notClockedIn = teamMembers.filter((m: any) => !presentUserSet.has(m.id));

  // Meetings Today
  const meetings = state.meetings || [];
  const todayMeetings = meetings.filter((m: any) => {
    const meetingDate = new Date(m.date || m.startTime);
    meetingDate.setHours(0, 0, 0, 0);
    return meetingDate.getTime() === today.getTime();
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col min-h-full bg-[var(--c-bg)] text-[var(--c-text)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--c-border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-[var(--c-text-2)] mt-1">Agency Overview & Health Metrics</p>
        </div>
        <div className="text-right bg-[var(--c-surface)] border border-[var(--c-border)] px-4 py-2 rounded-xl shadow-sm">
          <div className="text-lg font-bold text-[var(--c-text)]" suppressHydrationWarning>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-[var(--c-text-2)] font-medium" suppressHydrationWarning>
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Tab bar — switches the panel below in place, never navigates away from the board */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-[var(--c-border)]">
        {TABS.map(tab => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`text-sm font-semibold px-4 py-2 rounded-t-lg border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-[var(--c-text)]'
                  : 'border-transparent text-[var(--c-text-2)] hover:text-[var(--c-text)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {activeTab === 'tasks' && (
        <div className="p-6 flex flex-col gap-5">
          <DashboardFilterBar filters={filters} onChange={setFilters} teamMembers={teamMembers} clients={clients} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: 340 }}>
            <TasksOverviewWidget
              compactMode={false}
              activeTasks={activeTasks}
              tasksDueToday={tasksDueToday}
              tasksOverdue={tasksOverdue}
              tasksInReview={tasksInReview}
              tasksCompleted={tasksCompleted}
              tasksPending={tasksPending}
              totalTasks={filteredTasks}
            />
            <TeamTasksWidget
              compactMode={false}
              teamMembers={teamMembers}
              tasks={filteredTasks}
            />
            <TasksByStatusChart tasks={filteredTasks} />
          </div>

          <AllTasksTable
            tasks={filteredTasks}
            teamMembers={teamMembers}
            clients={clients}
            onOpenTask={setSelectedTaskId}
          />
        </div>
      )}

      {activeTab === 'team' && (
        <div className="p-6" style={{ minHeight: 340 }}>
          <div className="max-w-xl">
            <TeamSnapshotWidget
              compactMode={false}
              presentCount={presentCount}
              totalTeam={totalTeam}
              notClockedIn={notClockedIn}
              presentUserIds={presentUserIds}
              teamMembers={teamMembers}
            />
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="p-6" style={{ minHeight: 340 }}>
          <div className="max-w-xl">
            <MeetingsWidget compactMode={false} router={router} todayMeetings={todayMeetings} />
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="p-6" style={{ minHeight: 340 }}>
          <div className="max-w-xl">
            <SocialMediaWidget compactMode={false} state={state} />
          </div>
        </div>
      )}

      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
