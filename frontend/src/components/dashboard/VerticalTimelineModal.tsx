'use client';

import { useApp } from '@/contexts/AppContext';
import { Task, PRIORITY_CONFIG } from '@/lib/data';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import { useState, useEffect } from 'react';

interface Props {
  date: Date | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VerticalTimelineModal({ date, isOpen, onClose }: Props) {
  const { state } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen || !date) return null;

  // Set the start and end of the selected day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Filter tasks that have a deadline or start time on this day
  const dayTasks = state.tasks.filter(t => {
    const tStart = t.startTime ? new Date(t.startTime) : new Date(t.createdAt);
    const tEnd = t.deadline ? new Date(t.deadline) : null;

    // Falls within this day
    if (tEnd && tEnd >= startOfDay && tEnd <= endOfDay) return true;
    if (tStart >= startOfDay && tStart <= endOfDay) return true;
    
    // Spans across this day
    if (tEnd && tStart <= startOfDay && tEnd >= endOfDay) return true;
    
    return false;
  }).sort((a, b) => {
    const timeA = a.deadline ? new Date(a.deadline).getTime() : new Date(a.createdAt).getTime();
    const timeB = b.deadline ? new Date(b.deadline).getTime() : new Date(b.createdAt).getTime();
    return timeA - timeB;
  });

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <div 
        className="fixed top-0 right-0 h-full z-[101] flex flex-col overflow-hidden bg-app-surface border-l border-app-border shadow-[var(--shadow-drawer)] animate-in slide-in-from-right duration-200"
        style={{ width: 'min(480px, 100vw)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-app-border bg-app-surface2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-syne text-app-text">Schedule Overview</h2>
              <p className="text-sm font-semibold text-primary">
                {date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-app-hover text-app-text2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-app-surface p-6">
          {dayTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-app-text3">
              <Clock className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-bold font-syne text-app-text2">No tasks scheduled</p>
              <p className="text-sm">Enjoy your free time!</p>
            </div>
          ) : (
            <div className="relative pl-12">
              {/* Vertical line */}
              <div className="absolute top-0 bottom-0 left-[23px] w-px bg-app-border z-0"></div>

              {hours.map(hour => {
                const hourDate = new Date(startOfDay);
                hourDate.setHours(hour);

                // Find tasks falling around this hour (just a rough binning for visualization)
                const tasksInHour = dayTasks.filter(t => {
                  const tTime = t.deadline ? new Date(t.deadline) : new Date(t.createdAt);
                  return tTime.getHours() === hour;
                });

                return (
                  <div key={hour} className="relative min-h-[80px] pb-4 z-10">
                    {/* Time Label */}
                    <div className="absolute -left-12 top-0 w-10 text-right">
                      <span className="text-[11px] font-bold text-app-text3 mt-1 block">
                        {hourDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
                      </span>
                    </div>

                    {/* Timeline Dot */}
                    <div className="absolute -left-[5px] top-1.5 w-[11px] h-[11px] rounded-full bg-app-surface border-[2px] border-app-border shadow-sm z-10"></div>

                    {/* Tasks */}
                    <div className="pl-4 space-y-3 pt-0.5">
                      {tasksInHour.map(t => {
                        const pc = PRIORITY_CONFIG[t.priority];
                        const client = state.clients.find(c => c.id === t.clientId);
                        const tTime = t.deadline ? new Date(t.deadline) : new Date(t.createdAt);
                        
                        return (
                          <div 
                            key={t.id} 
                            onClick={() => setSelectedTaskId(t.id)}
                            className="bg-app-surface2 border border-app-border rounded-xl p-3 cursor-pointer hover:bg-app-hover transition-colors group relative overflow-hidden shadow-sm hover:shadow-md"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: pc.color }}></div>
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                              <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
                                {client?.name}
                              </span>
                              <span className="text-[10px] font-semibold text-app-text2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {tTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-app-text font-grotesk leading-snug group-hover:text-primary transition-colors">
                              {t.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: pc.bg, color: pc.color }}>
                                {pc.label.toUpperCase()}
                              </span>
                              {t.status === 'done' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </>
  );
}
