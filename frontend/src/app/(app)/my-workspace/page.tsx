'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import TeamTaskCard from '@/components/tasks/TeamTaskCard';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import RoleWidget from '@/components/team/RoleWidget';
import { Play, Square, CheckCircle, Bell, User, Clock, ChevronRight } from 'lucide-react';

export default function MyWorkspacePage() {
  const { state, setTaskStatus } = useApp();
  const { user: authUser } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  
  const currentUser = authUser ? (state.teamMembers || []).find(m => m.id === authUser.id) || authUser : null;
  const firstName = currentUser?.name?.split(' ')[0] || 'Team Member';
  
  // Date and greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Filter Tasks
  const myTasks = (state.tasks || []).filter(t => t.assignedTo?.includes(state.currentUserId) && t.status !== 'done');
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const todaysFocus = myTasks.filter(t => {
    let overdue = false;
    let dueToday = false;
    if (t.deadline) {
      const dl = new Date(t.deadline);
      dl.setHours(0,0,0,0);
      if (dl.getTime() < today.getTime()) overdue = true;
      if (dl.getTime() === today.getTime()) dueToday = true;
    }
    return overdue || dueToday || t.priority === 'critical' || t.priority === 'high';
  }).sort((a, b) => {
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

  const clockIn = (userId: string, dateStr: string, timeStr: string, isLate: boolean) => { console.log('Clock in', userId, dateStr); };
  const clockOut = (userId: string, dateStr: string, timeStr: string) => { console.log('Clock out', userId, dateStr); };

  return (
    <div className="flex flex-col h-full gap-6 pb-20 md:pb-10 max-w-7xl mx-auto">
      
      {/* A1 Header Bar */}
      <div className="flex items-center justify-between bg-[var(--c-surface)] rounded-xl p-4 border border-[var(--c-border)] sticky top-0 z-20 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-syne text-[var(--c-text)] flex items-center flex-wrap gap-2">
            <span>{hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'} {greeting}, {(currentUser?.name || 'Team Member')}.</span>
            {(currentUser?.title || (currentUser as any)?.roleTag || (currentUser as any)?.role) && (
              <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border border-[var(--c-primary)]/30 bg-[var(--c-primary)]/10 text-[var(--c-primary)] uppercase tracking-wider">
                {currentUser?.title || (currentUser as any)?.roleTag?.replace(/_/g, ' ') || (currentUser as any)?.role}
              </span>
            )}
          </h2>
          <p className="text-[var(--c-text-2)] text-sm mt-1 flex items-center gap-2">
            {dateStr} &middot; <span className="font-semibold text-[var(--c-text)]">{todaysFocus.length} due today</span> &middot; <span className="font-semibold text-red-500">{overdueCount} overdue</span>
          </p>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {(() => {
            if (!currentUser) return null;
            const todayStr = new Date().toISOString().split('T')[0];
            const log = state.attendanceLogs.find(l => l.userId === currentUser.id && l.date === todayStr);
            if (log && !log.clockOut) {
              return (
                <button 
                  onClick={() => clockOut(currentUser.id, todayStr, new Date().toISOString())}
                  className="hidden md:flex bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-sm px-4 py-2 rounded-lg border border-amber-500/20 transition items-center gap-2"
                >
                  <Clock size={16} /> Clock out
                </button>
              );
            } else if (log && log.clockOut) {
              return (
                <button disabled className="hidden md:flex bg-[var(--c-surface-3)] text-[var(--c-text-3)] font-bold text-sm px-4 py-2 rounded-lg border border-[var(--c-border)] items-center gap-2 opacity-50 cursor-not-allowed">
                  <Clock size={16} /> Done for today
                </button>
              );
            } else {
              return (
                <button 
                  onClick={() => clockIn(currentUser.id, todayStr, new Date().toISOString(), new Date().getHours() >= 10)}
                  className="hidden md:flex bg-[var(--c-primary)]/10 hover:bg-[var(--c-primary)]/20 text-[var(--c-primary)] font-bold text-sm px-4 py-2 rounded-lg border border-[var(--c-primary)]/20 transition items-center gap-2"
                >
                  <Clock size={16} /> Clock in
                </button>
              );
            }
          })()}

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Today's Focus */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          <RoleWidget />

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
