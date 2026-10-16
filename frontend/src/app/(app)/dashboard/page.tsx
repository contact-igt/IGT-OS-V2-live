'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import AttentionQueue from '@/components/dashboard/AttentionQueue';
import MeetingAnalyzePanel from '@/components/ai/MeetingAnalyzePanel';
import { Check, Sparkles, Calendar as CalendarIcon, Users, CheckSquare, Share2, X, Clock, ArrowRight } from 'lucide-react';

const TABS = [
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'meetings', label: 'Meetings', icon: CalendarIcon },
  { key: 'social', label: 'Social Media', icon: Share2 },
];

export default function DashboardPage() {
  const { state } = useApp();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'tasks' | 'team' | 'meetings' | 'social'>('tasks');
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [analyzePanelEvent, setAnalyzePanelEvent] = useState<any | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const teamMembers = state.teamMembers || [];
  const clients = state.clients || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allTasks = state.tasks || [];

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

  const meetings = state.meetings || [];
  const todayMeetings = meetings.filter((m: any) => {
    const meetingDate = new Date(m.date || m.startTime);
    meetingDate.setHours(0, 0, 0, 0);
    return meetingDate.getTime() === today.getTime();
  });

  const scrollToSection = (key: string) => {
    setActiveTab(key as any);
    const el = document.getElementById(`section-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col min-h-full bg-[var(--c-bg)] text-[var(--c-text)]">
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--c-border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-[var(--c-text-2)] mt-1">Single-View Operations, Health & Team Metrics</p>
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

      <AttentionQueue />

      {/* Sticky Tab Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 px-6 py-2.5 bg-[var(--c-bg)]/90 backdrop-blur-md border-b border-[var(--c-border)]">
        {TABS.map(tab => {
          const isActive = tab.key === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => scrollToSection(tab.key)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-[var(--c-surface-2)] text-[var(--c-text-2)] hover:text-[var(--c-text)] border border-[var(--c-border)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Single Scroll Container */}
      <div className="p-6 flex flex-col gap-10">

        {/* ─── SECTION 1: TASKS ─── */}
        <section id="section-tasks" className="flex flex-col gap-5 scroll-mt-20">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--c-border)]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold font-syne" style={{ color: 'var(--c-text)' }}>Tasks & Workload Overview</h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--c-surface-2)] text-[var(--c-text-3)] border border-[var(--c-border)]">
              {filteredTasks.length} Total Tasks
            </span>
          </div>

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
        </section>

        {/* ─── SECTION 2: TEAM ─── */}
        <section id="section-team" className="flex flex-col gap-5 scroll-mt-20">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--c-border)]">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <h2 className="text-xl font-bold font-syne" style={{ color: 'var(--c-text)' }}>Team Snapshot & Attendance</h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              {presentCount} / {totalTeam} Clocked In Today
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1">
              <TeamSnapshotWidget
                compactMode={false}
                presentCount={presentCount}
                totalTeam={totalTeam}
                notClockedIn={notClockedIn}
                presentUserIds={presentUserIds}
                teamMembers={teamMembers}
              />
            </div>

            {/* Interactive Team Roster Grid */}
            <div className="lg:col-span-2 border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-4 text-[var(--c-text)]">Team Members ({teamMembers.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {teamMembers.map((m: any) => {
                  const isPresent = presentUserSet.has(m.id);
                  const memberTasks = allTasks.filter((t: any) => t.assignedTo?.includes(m.id) && t.status !== 'done');
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className="p-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: m.color || '#3B82F6' }}>
                          {m.initials || m.name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--c-text)]">{m.name}</div>
                          <div className="text-[11px] text-[var(--c-text-3)]">{m.department || m.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${isPresent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-3 text-text-3'}`}>
                          {isPresent ? 'Present' : 'Away'}
                        </span>
                        <span className="text-[var(--c-text-3)]">{memberTasks.length} tasks</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: MEETINGS ─── */}
        <section id="section-meetings" className="flex flex-col gap-5 scroll-mt-20">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--c-border)]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold font-syne" style={{ color: 'var(--c-text)' }}>Meetings & Intelligence</h2>
            </div>
            <button
              onClick={() => router.push('/meetings')}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              All Meeting Summaries <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1">
              <MeetingsWidget compactMode={false} router={router} todayMeetings={todayMeetings} />
            </div>

            {/* Recent Meeting Intelligence List */}
            <div className="lg:col-span-2 border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 shadow-sm flex flex-col">
              <h3 className="font-bold text-sm mb-4 text-[var(--c-text)]">Recent Analyzed Meetings</h3>
              {(!state.meetingNotes || state.meetingNotes.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl border-[var(--c-border)]">
                  <p className="text-xs text-[var(--c-text-3)]">No meeting intelligence notes saved yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {state.meetingNotes.slice(0, 6).map((m: any) => (
                    <div
                      key={m.id}
                      onClick={() => router.push(`/meetings/${m.id}`)}
                      className="p-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="font-bold text-xs text-[var(--c-text)] group-hover:text-primary transition-colors">
                          {m.result?.meetingMeta?.title || m.title || 'Meeting Note'}
                        </h4>
                        <p className="text-[11px] text-[var(--c-text-3)] mt-0.5">
                          {new Date(m.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {m.result?.meetingMeta?.clientName || 'Internal'} · {m.tasksCreated?.length || 0} Tasks
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded bg-primary/10 text-primary">View →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: SOCIAL MEDIA ─── */}
        <section id="section-social" className="flex flex-col gap-5 scroll-mt-20">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--c-border)]">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold font-syne" style={{ color: 'var(--c-text)' }}>Social Media Metrics</h2>
            </div>
            <button
              onClick={() => router.push('/social')}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Social Channel Deep-dive <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1">
              <SocialMediaWidget compactMode={false} state={state} />
            </div>

            {/* Social Accounts Summary List */}
            <div className="lg:col-span-2 border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-4 text-[var(--c-text)]">Tracked Accounts & Performance</h3>
              {(!state.socialAccounts || state.socialAccounts.length === 0) ? (
                <div className="p-8 text-center border border-dashed rounded-xl border-[var(--c-border)]">
                  <p className="text-xs text-[var(--c-text-3)]">No social accounts connected yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {state.socialAccounts.map((acc: any) => (
                    <div key={acc.id} className="p-3.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-[var(--c-text)] capitalize">{acc.platform} · {acc.handle || acc.name}</div>
                        <div className="text-[11px] text-[var(--c-text-3)] mt-0.5">{acc.followers ? `${acc.followers.toLocaleString()} followers` : 'Connected'}</div>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">Active</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* Task Drawer Popup */}
      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />

      {/* Team Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl p-5 shadow-2xl border border-[var(--c-border)] bg-[var(--c-surface)]">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--c-border)] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: selectedMember.color || '#3B82F6' }}>
                  {selectedMember.initials || selectedMember.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--c-text)]">{selectedMember.name}</h3>
                  <p className="text-xs text-[var(--c-text-3)]">{selectedMember.department || selectedMember.role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-1 rounded-lg hover:bg-[var(--c-surface-2)]">
                <X className="w-5 h-5 text-[var(--c-text-3)]" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs py-1 border-b border-[var(--c-border)]">
                <span className="text-[var(--c-text-3)]">Email</span>
                <span className="font-medium text-[var(--c-text)]">{selectedMember.email}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-[var(--c-border)]">
                <span className="text-[var(--c-text-3)]">Status</span>
                <span className="font-bold text-emerald-500">
                  {presentUserSet.has(selectedMember.id) ? 'Clocked In' : 'Away'}
                </span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-[var(--c-text-3)]">Active Tasks</span>
                <span className="font-bold text-[var(--c-text)]">
                  {allTasks.filter((t: any) => t.assignedTo?.includes(selectedMember.id) && t.status !== 'done').length} assigned
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analyze Panel Popup */}
      {analyzePanelEvent && (
        <MeetingAnalyzePanel
          event={analyzePanelEvent}
          onClose={() => setAnalyzePanelEvent(null)}
          onSaved={(meetingId) => {
            setAnalyzePanelEvent(null);
            router.push(`/meetings/${meetingId}`);
          }}
        />
      )}
    </div>
  );
}
