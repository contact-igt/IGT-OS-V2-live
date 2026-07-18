'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { Mail, Briefcase, Target, Clock, AlertCircle } from 'lucide-react';
import TaskDrawer from '@/components/tasks/TaskDrawer';

export default function TeamPage() {
  const { state, getRealUserId } = useApp();
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const memberStats = useMemo(() =>
    state.teamMembers.map(member => {
      const memberTasks = state.tasks.filter(t => t.assignedTo.includes(member.id));
      const activeTasks = memberTasks.filter(t => t.status !== 'done');
      const upcomingTasks = memberTasks.filter(t => t.status === 'todo' || t.status === 'paused');
      const doneTasks = memberTasks.filter(t => t.status === 'done');

      const timeLeft = activeTasks.reduce((acc, t) => acc + Math.max(0, (t.estimatedHours || 0) - (t.loggedMinutes / 60)), 0);
      const avgWorkTime = doneTasks.length > 0 ? (doneTasks.reduce((acc, t) => acc + (t.loggedMinutes / 60), 0) / doneTasks.length).toFixed(1) : '0';

      // Attendance rows are keyed by the real backend user id, not member.id (the mock id).
      // Break/return-lateness is tracked server-side (attendance_logs.late_return) for audit
      // purposes only — deliberately not surfaced here, just the overall hours worked today.
      const realUserId = getRealUserId(member.id);
      const todaysSessions = (state.attendanceLogs || [])
        .filter(a => a.userId === realUserId && a.date === todayStr)
        .sort((a, b) => new Date(a.clockIn!).getTime() - new Date(b.clockIn!).getTime());
      const firstClockIn = todaysSessions[0]?.clockIn;
      const clockInTime = firstClockIn
        ? new Date(firstClockIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : 'Not in yet';
      const totalWorkedMinutesToday = todaysSessions.reduce((acc, s) => {
        const end = s.clockOut ? new Date(s.clockOut).getTime() : Date.now();
        return acc + Math.max(0, (end - new Date(s.clockIn!).getTime()) / 60000);
      }, 0);

      const doneEst = doneTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const doneActual = doneTasks.reduce((acc, t) => acc + (t.loggedMinutes / 60), 0);
      const efficiency = doneActual > 0 ? Math.round((doneEst / doneActual) * 100) : 100;
      let effColor = 'text-green-500';
      if (efficiency < 80) effColor = 'text-amber-500';
      if (efficiency < 60) effColor = 'text-red-500';

      const inProgressTask = activeTasks.find(t => t.status === 'in_progress');
      const activeTimer = inProgressTask ? state.activeTimers.find(t => t.taskId === inProgressTask.id && t.userId === realUserId) : undefined;

      return {
        member, activeTasks, upcomingTasks, doneTasks, timeLeft, avgWorkTime, clockInTime,
        efficiency, effColor, totalWorkedMinutesToday,
        inProgressTask, activeTimerStartedAt: activeTimer?.startedAt,
      };
    })
  , [state.teamMembers, state.tasks, state.attendanceLogs, state.activeTimers, todayStr, getRealUserId]);

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  const isAdmin = currentUser?.role === 'admin' || state.currentUserId === 'u1';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-[28px] font-bold flex items-center gap-2" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>groups</span> Team Directory
          </h1>
          <h2 className="text-[14px] font-semibold text-text-2 mt-1">Team Overview</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 min-h-0 overflow-y-auto pb-8 custom-scrollbar">
        {memberStats.map(({ member, activeTasks, upcomingTasks, doneTasks, timeLeft, avgWorkTime, clockInTime, efficiency, effColor, totalWorkedMinutesToday, inProgressTask, activeTimerStartedAt }) => (
            <div 
              key={member.id} 
              onClick={() => router.push(`/team/${member.id}`)}
              className="card-surface2 p-5 flex flex-col gap-4 cursor-pointer hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold text-white shadow-sm"
                  style={{ background: member.color }}
                >
                  {member.initials}
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-text group-hover:text-primary transition-colors">{member.name}</h3>
                  <p className="text-[12px] font-semibold text-text-2">{member.department} • <span className="uppercase text-[10px]">{member.role}</span></p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-[12px] font-medium text-text-3 mt-2">
                <div className="flex flex-col gap-1 p-2 rounded bg-surface border border-border">
                  <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider">Clock In</span>
                  <span className={`text-[14px] font-bold ${clockInTime === 'Not in yet' ? 'text-amber-500' : 'text-text'}`}>{clockInTime}</span>
                </div>
                <div className="flex flex-col gap-1 p-2 rounded bg-surface border border-border">
                  <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider">Hours Today</span>
                  <span className="text-[14px] font-bold text-text">{(totalWorkedMinutesToday / 60).toFixed(1)}h</span>
                </div>
                <div className="flex flex-col gap-1 p-2 rounded bg-surface border border-border">
                  <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider">Efficiency</span>
                  <span className={`text-[14px] font-bold ${effColor}`}>{efficiency}%</span>
                </div>
                <div className="flex flex-col gap-1 p-2 rounded bg-surface border border-border">
                  <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider">Active Tasks</span>
                  <span className="text-[14px] text-text font-bold">{activeTasks.length}</span>
                </div>
                <div className="flex flex-col gap-1 p-2 rounded bg-surface border border-border">
                  <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider">Time Left</span>
                  <span className="text-[14px] text-primary font-bold">{timeLeft.toFixed(1)}h</span>
                </div>
                {isAdmin && (
                  <div className="col-span-2 flex flex-col gap-1 p-2 rounded bg-surface border border-border mt-1">
                    <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider">Monthly Cost</span>
                    <span className="text-[14px] text-rose-500 font-bold">₹{(member.monthlySalaryINR || 0).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* CURRENT WORK STRIP */}
              <div className="mt-2 flex flex-col gap-2 pt-4 border-t border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                      Working On
                    </span>
                    <span className="text-[12px] text-text font-semibold truncate max-w-[150px]">
                      {inProgressTask?.title || 'None'}
                    </span>
                  </div>
                  {inProgressTask && (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-text-3 font-bold tracking-wider">STARTED</span>
                      <span className="text-[11px] text-text-2 font-medium">
                        {activeTimerStartedAt ? new Date(activeTimerStartedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-start justify-between gap-2 bg-surface p-2 rounded border border-border">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider">Next Up</span>
                    <span className="text-[11px] text-text-2 font-medium truncate max-w-[120px]">
                      {upcomingTasks[0]?.title || 'No upcoming tasks'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] uppercase text-text-3 font-bold tracking-wider">Due Today</span>
                    <span className="text-[12px] text-amber-500 font-bold">
                      {upcomingTasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === new Date().toDateString()).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
        ))}
      </div>

      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
