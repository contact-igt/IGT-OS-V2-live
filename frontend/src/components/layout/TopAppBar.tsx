'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useApp } from '@/contexts/AppContext';
import { Search, StopCircle, ChevronDown, Plus, Sun, Moon, Bell, X, AlertTriangle, Menu } from 'lucide-react';
import NewTaskModal from '@/components/tasks/NewTaskModal';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import LiveTimer from '@/components/ui/LiveTimer';
import { computeAlerts } from '@/lib/alerts';

export default function TopAppBar({ sidebarWidth, onMenuClick }: { sidebarWidth: number; onMenuClick: () => void }) {
  const { theme, toggle } = useTheme();
  const { state, dispatch, requestStopTimer, getTimerElapsed } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [timersDropdownOpen, setTimersDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newTaskDefaults, setNewTaskDefaults] = useState<{title?: string, type?: string}>({});
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  const myNotifications = useMemo(
    () => state.notifications
      .filter(n => n.userId === state.currentUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.notifications, state.currentUserId]
  );
  const systemAlerts = useMemo(() => computeAlerts(state), [state]);
  const unreadCount = useMemo(
    () => myNotifications.filter(n => !n.read).length + systemAlerts.length,
    [myNotifications, systemAlerts]
  );

  const handleClearNotifications = () => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS', payload: { userId: state.currentUserId } });
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${baseUrl}/api/notifications`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(err => console.error('Failed to clear notifications on backend:', err));
  };

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const evt = e as CustomEvent;
      setNewTaskDefaults(evt.detail || {});
      setModalOpen(true);
    };
    const handleOpenDrawer = (e: Event) => {
      const evt = e as CustomEvent;
      setDrawerTaskId(evt.detail?.taskId || null);
    };
    window.addEventListener('open-new-task-modal', handleOpenModal);
    window.addEventListener('open-task-drawer', handleOpenDrawer);
    return () => {
      window.removeEventListener('open-new-task-modal', handleOpenModal);
      window.removeEventListener('open-task-drawer', handleOpenDrawer);
    };
  }, []);

  const firstTimer = state.activeTimers[0] ?? null;
  const firstTimerTask = useMemo(
    () => firstTimer ? state.tasks.find(t => t.id === firstTimer.taskId) ?? null : null,
    [firstTimer, state.tasks]
  );
  const firstTimerClient = useMemo(
    () => firstTimerTask ? state.clients.find(c => c.id === firstTimerTask.clientId) ?? null : null,
    [firstTimerTask, state.clients]
  );

  return (
    <>
      <header
        className="fixed top-0 right-0 z-40 flex items-center justify-between px-3 md:px-5 left-0 md:left-[var(--sw)] bg-app-surface border-b border-app-border transition-all duration-300"
        style={{ height: 56 }}
      >
        <button type="button" onClick={onMenuClick} aria-label="Open navigation menu"
          className="md:hidden mr-2 shrink-0 rounded-lg p-2 text-app-text2 hover:bg-app-surface3">
          <Menu className="w-5 h-5" />
        </button>
        {/* Left: Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 cursor-pointer bg-app-input border border-app-border"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          >
            <Search className="w-4 h-4 text-app-text2" />
            <span className="text-[13px] text-app-text3 font-grotesk">
              Search tasks, clients... <kbd className="text-[10px] px-1 rounded ml-1 bg-app-surface3 text-app-text2">⌘K</kbd>
            </span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Active Timer(s) */}
          {state.activeTimers.length === 1 && firstTimerTask && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 hide-mobile border"
              style={{ background: 'rgba(42,177,130,0.1)', borderColor: 'rgba(42,177,130,0.25)' }}>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
              <LiveTimer 
                startedAt={firstTimer.startedAt} 
                className="font-bold text-[13px] text-primary font-grotesk" 
              />
              <span className="text-[11px] truncate max-w-[120px] hide-mobile text-app-text2 font-grotesk">
                {firstTimerClient?.name?.split(' ')[0]}
              </span>
              <button
                onClick={() => requestStopTimer(firstTimer.taskId)}
                className="rounded p-0.5 hover:opacity-80 transition-opacity text-red-500"
                title="Complete Task"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {state.activeTimers.length > 1 && (
            <div className="relative">
              <button 
                onClick={() => setTimersDropdownOpen(!timersDropdownOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 hide-mobile hover:opacity-90 transition-opacity border text-primary font-grotesk font-bold text-[13px]"
                style={{ background: 'rgba(42,177,130,0.1)', borderColor: 'rgba(42,177,130,0.25)' }}>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
                <span>
                  {state.activeTimers.length} Active Tasks
                </span>
                <ChevronDown className="w-4 h-4 text-primary" />
              </button>

              {timersDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border shadow-lg rounded-lg overflow-hidden z-50">
                  <div className="px-3 py-2 bg-surface-2 border-b border-border font-bold text-[11px] uppercase tracking-wider text-text-3">
                    Active Timers
                  </div>
                  {state.activeTimers.map((timer) => {
                    const task = state.tasks.find(t => t.id === timer.taskId);
                    const client = state.clients.find(c => c.id === task?.clientId);
                    return (
                      <div key={timer.taskId} className="px-3 py-2 border-b border-border hover:bg-surface-2 flex items-center justify-between">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-[12px] truncate text-text">{task?.title || 'Unknown Task'}</span>
                          <span className="text-[10px] text-text-2">{client?.name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <LiveTimer startedAt={timer.startedAt} className="font-bold text-[12px] font-mono text-primary" />
                          <button
                            onClick={() => requestStopTimer(timer.taskId)}
                            className="rounded hover:opacity-80 transition-opacity text-red-500"
                            title="Complete Task"
                          >
                            <StopCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* New Task */}
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary hide-mobile"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>

          {/* Mobile new task */}
          <button
            onClick={() => setModalOpen(true)}
            className="show-mobile rounded-lg p-2 btn-primary"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="rounded-lg p-2 transition-all duration-200 bg-app-hover text-app-text2"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="h-10 w-10 rounded-full border border-app-border flex items-center justify-center hover:bg-app-hover relative transition-colors shadow-sm">
            <Bell className="w-5 h-5 text-app-text2" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-tertiary shadow-[0_0_0_2px_var(--c-surface)] text-[8px] font-bold text-white flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

        </div>
      </header>

      <NewTaskModal 
        isOpen={modalOpen} 
        onClose={() => { setModalOpen(false); setNewTaskDefaults({}); }} 
        defaultTitle={newTaskDefaults.title}
        defaultType={newTaskDefaults.type as any}
      />
      <TaskDrawer taskId={drawerTaskId} onClose={() => setDrawerTaskId(null)} />

      {/* Notifications Slider */}
      {notificationsOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[90] backdrop-blur-sm" onClick={() => setNotificationsOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-[360px] bg-surface z-[100] border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-2">
              <h2 className="font-bold text-lg text-text">Notifications</h2>
              <div className="flex gap-2 items-center">
                {unreadCount > 0 && (
                  <button onClick={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ', payload: { userId: state.currentUserId } })} className="text-[11px] font-bold text-primary hover:underline px-2">Mark all read</button>
                )}
                {myNotifications.length > 0 && (
                  <button onClick={handleClearNotifications} className="text-[11px] font-bold text-text-3 hover:text-red-500 hover:underline px-2">Clear</button>
                )}
                <button onClick={() => setNotificationsOpen(false)} className="p-1 hover:bg-hover rounded text-text-3 hover:text-text">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {systemAlerts.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-bold text-text-3 uppercase tracking-wider">System Alerts</div>
                  {systemAlerts.map((alert, i) => (
                    <div 
                      key={`alert-${i}`}
                      onClick={() => {
                        setNotificationsOpen(false);
                        if ((alert as any).actionUrl) window.location.href = (alert as any).actionUrl;
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border mb-1 bg-red-500/10 border-red-500/20`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-[12px] text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> System
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-text mb-0.5">{alert.title}</p>
                      <p className="text-[12px] text-text-2 leading-snug">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-2 py-1 text-[10px] font-bold text-text-3 uppercase tracking-wider">Activity</div>
              {myNotifications.length === 0 ? (
                <div className="text-center text-text-3 text-[13px] py-6 font-medium">No activity notifications.</div>
              ) : (
                myNotifications.map(n => {
                  const actor = state.teamMembers.find(m => m.id === n.actorId);
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { id: n.id } });
                        setNotificationsOpen(false);
                        if (n.taskId) window.dispatchEvent(new CustomEvent('open-task-drawer', { detail: { taskId: n.taskId } }));
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${!n.read ? 'bg-primary/5 border-primary/20' : 'bg-transparent border-transparent hover:bg-hover'} mb-1`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-[12px] text-text">{actor?.name || 'System'}</span>
                        <span className="text-[10px] text-text-3">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[13px] text-text-2 leading-snug">{n.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
