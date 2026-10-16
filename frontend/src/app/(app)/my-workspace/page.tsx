'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import TeamTaskCard from '@/components/tasks/TeamTaskCard';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import { getDailyQuote } from '@/lib/motivationalQuotes';
import { Play, Square, CheckCircle, Bell, User, Clock, ChevronRight } from 'lucide-react';

export default function MyWorkspacePage() {
  const { state, setTaskStatus, clockIn, clockOut, startBreak, endBreak, getRealUserId } = useApp();
  const { user: authUser } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  // state.currentUserId is the mock team-member id (resolved from authUser via email match
  // in the app layout) — authUser.id is the real backend UUID and never matches teamMembers.
  const currentUser = authUser ? (state.teamMembers || []).find(m => m.id === state.currentUserId) || { ...authUser, title: '' } : null;
  const firstName = currentUser?.name?.split(' ')[0] || 'Team Member';
  
  // Date and greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const dailyQuote = getDailyQuote((currentUser as any)?.roleTag);

  // Filter Tasks
  const myTasks = (state.tasks || []).filter(t => t.assignedTo?.includes(state.currentUserId) && t.status !== 'done');
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const todaysFocus = myTasks
    .filter(t => t.status !== 'in_review' && t.status !== 'done')
    .filter(t => {
      let overdue = false;
      let dueToday = false;
      if (t.deadline) {
        const dl = new Date(t.deadline);
        dl.setHours(0,0,0,0);
        if (dl.getTime() < today.getTime()) overdue = true;
        if (dl.getTime() === today.getTime()) dueToday = true;
      }
      return overdue || dueToday || t.priority === 'critical' || t.priority === 'high';
    })
    .sort((a, b) => {
      // overdue first
      const aDl = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bDl = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (aDl < today.getTime() && bDl >= today.getTime()) return -1;
      if (bDl < today.getTime() && aDl >= today.getTime()) return 1;
      return aDl - bDl;
    });
  
  const inReviewTasks = myTasks.filter(t => t.status === 'in_review');
  const upcomingTasks = myTasks.filter(t => !todaysFocus.find(tf => tf.id === t.id) && t.status !== 'in_review');
  const overdueCount = myTasks.filter(t => {
    if (!t.deadline) return false;
    const dl = new Date(t.deadline);
    dl.setHours(0, 0, 0, 0);
    return dl.getTime() < today.getTime();
  }).length;
  
  const activeTimerTask = myTasks.find(t => t.status === 'in_progress');
  const unreadCount = (state.notifications || []).filter(n => n.userId === state.currentUserId && !n.read).length;

  return (
    <div className="flex flex-col h-full gap-6 pb-20 md:pb-10 max-w-7xl mx-auto">
      
      {/* A1 Header Bar */}
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--c-surface)] p-6 rounded-2xl border border-[var(--c-border)] shadow-sm">
        <div>
          <h2 className="font-syne font-bold text-2xl text-[var(--c-text)] flex items-center gap-2">
            Good day, {firstName}! 👋
            {currentUser?.title && (
              <span className="text-xs font-normal text-[var(--c-text-3)] bg-[var(--c-surface-3)] px-2.5 py-1 rounded-full border border-[var(--c-border)]">
                {currentUser.title}
              </span>
            )}
          </h2>
          <p className="text-[var(--c-primary)] text-sm mt-1 italic">&ldquo;{dailyQuote}&rdquo;</p>
          <p className="text-[var(--c-text-2)] text-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{dateStr}</span>
            <span aria-hidden>&middot;</span>
            <span className="font-semibold text-[var(--c-text)] whitespace-nowrap">{todaysFocus.length} due today</span>
            <span aria-hidden>&middot;</span>
            <span className="font-semibold whitespace-nowrap" style={{ color: 'var(--c-error)' }}>{overdueCount} overdue</span>
          </p>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {(() => {
            if (!currentUser) return null;
            const todayStr = new Date().toISOString().split('T')[0];
            const userId = currentUser.id || authUser?.id || '';

            const todaysLogs = (state.attendanceLogs || [])
              .filter(l => (l.userId === userId || l.userId === authUser?.id) && l.date === todayStr)
              .sort((a, b) => new Date(b.clockIn!).getTime() - new Date(a.clockIn!).getTime());
            const openLog = todaysLogs.find(l => !l.clockOut);

            if (openLog) {
              const isOnBreak = openLog.isOnBreak || (openLog.breaks && openLog.breaks.some((b: any) => !b.breakEnd));
              return (
                <div className="flex items-center gap-2">
                  {isOnBreak ? (
                    <button
                      onClick={() => endBreak(userId, todayStr)}
                      className="hidden md:flex bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-sm px-4 py-2 rounded-lg border border-emerald-500/20 transition items-center gap-2"
                    >
                      <Play size={16} /> Resume Work
                    </button>
                  ) : (
                    <button
                      onClick={() => startBreak(userId, todayStr)}
                      className="hidden md:flex bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-sm px-4 py-2 rounded-lg border border-amber-500/20 transition items-center gap-2"
                    >
                      <Clock size={16} /> Take Break
                    </button>
                  )}
                  <button
                    onClick={() => clockOut(userId, todayStr, new Date().toISOString())}
                    className="hidden md:flex bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm px-4 py-2 rounded-lg border border-red-500/20 transition items-center gap-2"
                  >
                    <Square size={16} /> Clock out
                  </button>
                </div>
              );
            }

            return (
              <button
                onClick={() => clockIn(userId, todayStr, new Date().toISOString(), new Date().getHours() >= 10)}
                className="hidden md:flex bg-[var(--c-primary)]/10 hover:bg-[var(--c-primary)]/20 text-[var(--c-primary)] font-bold text-sm px-4 py-2 rounded-lg border border-[var(--c-primary)]/20 transition items-center gap-2"
              >
                <Clock size={16} /> Clock in
              </button>
            );
          })()}

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Today's Focus */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          <div>
            <h3 className="font-syne font-bold text-lg text-[var(--c-text)] mb-4 flex items-center gap-2">
              <CheckCircle className="text-[var(--c-primary)]" /> Today's Focus
            </h3>
            <div className="space-y-4">
              {todaysFocus.length === 0 ? (
                <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-8 flex items-center justify-center text-[var(--c-text-3)] font-medium">
                  No tasks due today. You're all caught up!
                </div>
              ) : (
                todaysFocus.map(t => (
                  <TeamTaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="font-syne font-bold text-lg text-[var(--c-text)] mt-4 mb-4 flex items-center gap-2">
              <ChevronRight className="text-[var(--c-text-3)]" /> Upcoming & Backlog
            </h3>
            <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
              {(showAllUpcoming ? upcomingTasks : upcomingTasks.slice(0, 3)).map(t => (
                <TeamTaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
              ))}
              {!showAllUpcoming && upcomingTasks.length > 3 && (
                <button
                  onClick={() => setShowAllUpcoming(true)}
                  className="w-full py-3 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-2)] font-bold hover:text-[var(--c-text)] transition"
                >
                  View {upcomingTasks.length - 3} more tasks
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Right Col: Active & Review */}
        <div className="flex flex-col gap-6">
          
          <div>
            <h3 className="font-syne font-bold text-lg text-[var(--c-text)] mb-4 flex items-center gap-2">
              <Play className="text-blue-500" /> Active Now
            </h3>
            {activeTimerTask ? (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-1 animate-pulse-light">
                <TeamTaskCard task={activeTimerTask} onClick={() => setSelectedTaskId(activeTimerTask.id)} />
              </div>
            ) : (
              <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 text-center text-[var(--c-text-3)] font-medium text-sm">
                No active timer. Start a task to begin tracking.
              </div>
            )}
          </div>

          <div>
            <h3 className="font-syne font-bold text-lg text-[var(--c-text)] mb-4 flex items-center gap-2">
              <CheckCircle className="text-amber-500" /> In Review
            </h3>
            <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl flex flex-col overflow-hidden">
              {inReviewTasks.length === 0 ? (
                <div className="p-6 text-center text-[var(--c-text-3)] font-medium text-sm">
                  Nothing in review right now.
                </div>
              ) : (
                inReviewTasks.map(t => (
                  <div key={t.id} className="border-b border-[var(--c-border)] last:border-b-0">
                    <TeamTaskCard task={t} onClick={() => setSelectedTaskId(t.id)} />
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
