// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';

import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import TasksOverviewWidget from '@/components/dashboard/widgets/TasksOverviewWidget';
import TeamTasksWidget from '@/components/dashboard/widgets/TeamTasksWidget';
import TeamSnapshotWidget from '@/components/dashboard/widgets/TeamSnapshotWidget';
import MeetingsWidget from '@/components/dashboard/widgets/MeetingsWidget';
import SocialMediaWidget from '@/components/dashboard/widgets/SocialMediaWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);


const DEFAULT_LAYOUT = {
  lg: [
    { i: 'tasksoverview', x: 0, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'teamtasks', x: 1, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'teamsnapshot', x: 2, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'meetings', x: 0, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'socialmedia', x: 1, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
  ],
  md: [
    { i: 'tasksoverview', x: 0, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'teamtasks', x: 1, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'teamsnapshot', x: 0, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'meetings', x: 1, y: 2, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'socialmedia', x: 0, y: 4, w: 1, h: 2, minW: 1, minH: 2 },
  ],
};

export default function DashboardPage() {
  const { state } = useApp();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [compactMode, setCompactMode] = useState(false);

  const [layouts, setLayouts] = useState<any>(() => JSON.parse(JSON.stringify(DEFAULT_LAYOUT)));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);

    // Load saved layouts
    const savedLayout = localStorage.getItem('dashboard_layouts');
    if (savedLayout) {
      try {
        setLayouts(JSON.parse(savedLayout));
      } catch (e) {
        console.error("Failed to parse layout");
      }
    }
  }, []);

  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem('dashboard_layouts', JSON.stringify(allLayouts));
  };

  const resetLayout = () => {
    localStorage.removeItem('dashboard_layouts');
    setLayouts(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)));
  };

  const teamMembers = state.teamMembers || [];

  // Computed data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // 1. Tasks
  const tasks = state.tasks || [];
  const activeTasks = tasks.filter((t: any) => t.status !== 'Done');
  const tasksDueToday = activeTasks.filter((t: any) => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate.getTime() === today.getTime();
  });
  const tasksOverdue = activeTasks.filter((t: any) => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate.getTime() < today.getTime();
  });
  const tasksInReview = tasks.filter((t: any) => t.status === 'Review');

  // 2. Team Snapshot — only count unique users clocked in today, capped at team size
  const totalTeam = teamMembers.length;
  const attendanceLogs = state.attendanceLogs || [];
  // Filter: only today's logs, and only for actual team members
  const teamMemberIdSet = new Set(teamMembers.map((m: any) => m.id));
  const presentToday = attendanceLogs.filter((log: any) => {
    const logDate = log.date || log.timestamp?.split('T')[0];
    return logDate === todayStr && teamMemberIdSet.has(log.userId);
  });
  // Deduplicate: one entry per userId (in case of duplicate logs)
  const presentUserIdSet = new Set(presentToday.map((log: any) => log.userId));
  const presentUserIds = Array.from(presentUserIdSet) as string[];
  const presentCount = Math.min(presentUserIds.length, totalTeam); // can never exceed total
  const notClockedIn = teamMembers.filter((m: any) => !presentUserIdSet.has(m.id));

  // 3. Meetings Today
  const meetings = state.meetings || [];
  const todayMeetings = meetings.filter((m: any) => {
    const meetingDate = new Date(m.date || m.startTime);
    meetingDate.setHours(0, 0, 0, 0);
    return meetingDate.getTime() === today.getTime();
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col min-h-full bg-[var(--c-bg)] text-[var(--c-text)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--c-border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-[var(--c-text-2)] mt-1">Agency Overview & Health Metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={resetLayout} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg hover:bg-[var(--c-surface-2)] transition-colors" title="Auto Align Layout">
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            Auto Align
          </button>
          <div className="text-right bg-[var(--c-surface)] border border-[var(--c-border)] px-4 py-2 rounded-xl shadow-sm">
            <div className="text-lg font-bold text-[var(--c-text)]" suppressHydrationWarning>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-[var(--c-text-2)] font-medium" suppressHydrationWarning>
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 relative">
        {mounted ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
            rowHeight={150}
            onLayoutChange={handleLayoutChange}
            margin={[24, 24]}
            draggableHandle=".drag-handle"
          >
            {/* Module 1: Tasks Overview */}
            <div key="tasksoverview">
              <TasksOverviewWidget compactMode={compactMode} activeTasks={activeTasks} tasksDueToday={tasksDueToday} tasksOverdue={tasksOverdue} tasksInReview={tasksInReview} />
            </div>
            {/* Module 2: Team-wise Task Overview */}
            <div key="teamtasks">
              <TeamTasksWidget compactMode={compactMode} teamMembers={teamMembers} activeTasks={activeTasks} today={today} />
            </div>
            {/* Module 3: Team Snapshot */}
            <div key="teamsnapshot">
              <TeamSnapshotWidget compactMode={compactMode} presentCount={presentCount} totalTeam={totalTeam} notClockedIn={notClockedIn} presentUserIds={presentUserIds} teamMembers={teamMembers} />
            </div>
            {/* Module 4: Meetings Today */}
            <div key="meetings">
              <MeetingsWidget compactMode={compactMode} router={router} todayMeetings={todayMeetings} />
            </div>
            {/* Module 5: Social Media Metrics */}
            <div key="socialmedia">
              <SocialMediaWidget compactMode={compactMode} state={state} />
            </div>
          </ResponsiveGridLayout>
        ) : null}
      </div>
    </div>
  );
}
