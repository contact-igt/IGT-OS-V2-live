'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import TaskCard from '@/components/tasks/TaskCard';
import { isDueToday, isOverdue, formatMinutes } from '@/lib/data';
import { Clock, CheckCircle2, AlertTriangle, Bell, PlayCircle, CalendarDays } from 'lucide-react';
import LiveTimer from '@/components/ui/LiveTimer';
import StopTimerModal from '@/components/tasks/StopTimerModal';

export default function TeamDashboardPage() {
  const { state, requestStopTimer, startTimer } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  
  if (!currentUser) {
    return <div className="p-10 text-center text-app-text">Please log in.</div>;
  }

  // Filter tasks for current user
  const myTasks = state.tasks.filter(t => t.assignedTo.includes(currentUser.id) && t.status !== 'done');
  
  const todayTasks = myTasks.filter(isDueToday);
  const overdueTasks = myTasks.filter(isOverdue);
  const inProgressTasks = myTasks.filter(t => t.status === 'in_progress');

  // Notifications
  const myNotifications = state.notifications.filter(n => n.userId === currentUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = myNotifications.filter(n => !n.read).length;

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden relative">
        <header className="flex-shrink-0 border-b border-app-border bg-app-surface/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-app-text tracking-tight font-syne flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-[16px]" style={{ background: currentUser.color }}>
                {currentUser.initials}
              </div>
              My Workspace
            </h1>
            <p className="text-[14px] text-app-text2 font-grotesk mt-1">
              Welcome back, {currentUser.name.split(' ')[0]}. Here is your agenda.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-app-surface2 border border-app-border rounded-lg px-4 py-2 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <span className="text-[14px] font-bold text-app-text">{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Quick Timers (Active Tasks) */}
              {inProgressTasks.length > 0 && (
                <section>
                  <h2 className="text-[18px] font-bold font-syne text-app-text mb-4 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-blue-500" />
                    In Progress
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {inProgressTasks.map(t => (
                      <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Tasks Due Today */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-bold font-syne text-app-text flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Due Today
                    <span className="bg-app-surface3 text-app-text2 px-2 py-0.5 rounded-full text-[12px] font-bold">{todayTasks.length}</span>
                  </h2>
                </div>
                {todayTasks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {todayTasks.map(t => (
                      <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-app-border bg-app-surface2 text-center text-app-text3 flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 mb-2 opacity-50" />
                    <p className="font-bold">No tasks due today!</p>
                  </div>
                )}
              </section>

              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <section>
                  <h2 className="text-[18px] font-bold font-syne text-red-500 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Overdue
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {overdueTasks.map(t => (
                      <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              
              {/* Notifications */}
              <section className="bg-app-surface2 rounded-xl border border-app-border overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <div className="p-4 border-b border-app-border bg-app-surface/50 backdrop-blur flex justify-between items-center sticky top-0">
                  <h3 className="font-bold font-syne text-[16px] text-app-text flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => console.log('markAllNotificationsRead', currentUser.id)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                  {myNotifications.length === 0 ? (
                    <div className="p-6 text-center text-app-text3 text-[13px]">
                      You're all caught up!
                    </div>
                  ) : (
                    myNotifications.map(n => {
                      const actor = state.teamMembers.find(m => m.id === n.actorId);
                      return (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            if (!n.read) console.log('markNotificationRead', n.id);
                            if (n.taskId) setSelectedTaskId(n.taskId);
                          }}
                          className={`p-3 rounded-lg cursor-pointer transition-colors border ${n.read ? 'bg-transparent border-transparent hover:bg-app-surface' : 'bg-primary/5 border-primary/20 hover:bg-primary/10'}`}
                        >
                          <div className="flex gap-3">
                            {actor && (
                              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-1" style={{ background: actor.color }}>
                                {actor.initials}
                              </div>
                            )}
                            <div>
                              <p className="text-[13px] text-app-text">
                                <span className="font-bold">{actor?.name}</span> {n.message}
                              </p>
                              <span className="text-[10px] text-app-text3 mt-1 block">
                                {new Date(n.createdAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>

      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </>
  );
}
