'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchGoogleCalendarEvents, GoogleEvent } from '@/lib/googleCalendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, AlignLeft, Sparkles, X, Link as LinkIcon } from 'lucide-react';
import { Task } from '@/lib/data';
import GanttView from '@/components/tasks/GanttView';
import TaskDrawer from '@/components/tasks/TaskDrawer';

type ViewMode = 'day' | 'week' | 'month' | 'year';

export default function CalendarPage() {
  const { state, dispatch } = useApp();
  const { token, user } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
  const [isPrepPanelOpen, setIsPrepPanelOpen] = useState(false);

  const [ganttModalDate, setGanttModalDate] = useState<Date | null>(null);
  const [ganttSelectedTaskId, setGanttSelectedTaskId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  // Surfaced next to the Connect/Sync button so a mismatched Google account (wrong one
  // picked at the OAuth consent screen) is immediately visible here, instead of silently
  // showing someone else's calendar under this login.
  useEffect(() => {
    async function loadGoogleStatus() {
      if (!token) return;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/api/google/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setGoogleEmail(data.email || null);
        }
      } catch (err) {
        console.error('Failed to load Google connection status:', err);
      }
    }
    loadGoogleStatus();
  }, [token]);

  // Auto scroll to current time in day/week views
  const timeGridRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if ((view === 'day' || view === 'week') && timeGridRef.current) {
      const now = new Date();
      const scrollPosition = (now.getHours() - 1) * 60; // 1 hour before now
      timeGridRef.current.scrollTop = scrollPosition;
    }
  }, [view]);

  // Fetch google events
  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      const minDate = new Date(currentDate);
      minDate.setDate(1);
      minDate.setMonth(minDate.getMonth() - 1); // Fetch +/- 1 month
      const maxDate = new Date(currentDate);
      maxDate.setDate(28);
      maxDate.setMonth(maxDate.getMonth() + 2);
      
      const { events, connected } = await fetchGoogleCalendarEvents(
        token,
        minDate.toISOString(),
        maxDate.toISOString()
      );
      dispatch({ type: 'SET_GOOGLE_EVENTS', payload: { events, connected } });
      setLoading(false);
    }
    loadEvents();
  }, [currentDate, token, dispatch]);

  const tasksWithDeadlines = useMemo(() => {
    return state.tasks.filter(t => t.deadline && t.status !== 'done' && t.status !== 'cancelled');
  }, [state.tasks]);

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (view === 'day') next.setDate(next.getDate() - 1);
    else if (view === 'week') next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === 'day') next.setDate(next.getDate() + 1);
    else if (view === 'week') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openEventPrep = (e: React.MouseEvent, evt: GoogleEvent) => {
    e.stopPropagation();
    setSelectedEvent(evt);
    setIsPrepPanelOpen(true);
  };

  // Close the day-gantt modal on Escape
  useEffect(() => {
    if (!ganttModalDate) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setGanttModalDate(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ganttModalDate]);

  // Helpers for grid
  const getDaysInView = () => {
    if (view === 'day') return [currentDate];
    if (view === 'week') {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      start.setDate(diff);
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
      return days;
    }
    // Month view days
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const daysInView = getDaysInView();
  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  return (
    <div className="flex flex-col h-full bg-app-bg overflow-hidden relative">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-app-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-syne text-app-text tracking-tight">Calendar</h1>
          <div className="flex items-center bg-app-surface2 border border-app-border rounded-lg p-1">
            <button onClick={handlePrev} className="p-1 hover:bg-app-surface rounded text-app-text2 hover:text-app-text"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={handleToday} className="px-3 py-1 text-sm font-medium hover:bg-app-surface rounded text-app-text2 hover:text-app-text">Today</button>
            <button onClick={handleNext} className="p-1 hover:bg-app-surface rounded text-app-text2 hover:text-app-text"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <span className="text-lg font-medium text-app-text font-grotesk ml-2">
            {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-app-surface border border-app-border rounded-lg p-1">
            {(['day', 'week', 'month', 'year'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setView(m)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${
                  view === m ? 'bg-app-surface2 text-app-text shadow-sm' : 'text-app-text3 hover:text-app-text2'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              className="btn-primary"
              onClick={() => {
                if (state.isGoogleConnected) {
                  setCurrentDate(new Date(currentDate)); // re-trigger loadEvents
                  return;
                }
                if (!user?.id) return;
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                window.location.href = `${baseUrl}/api/google/connect?userId=${user.id}`;
              }}
              disabled={loading}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {state.isGoogleConnected ? 'Sync Now' : 'Connect Google'}
            </button>
            {state.isGoogleConnected && (
              googleEmail ? (
                <span className="text-[11px] text-app-text3">Synced with {googleEmail}</span>
              ) : (
                <button
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => {
                    if (!user?.id) return;
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                    window.location.href = `${baseUrl}/api/google/connect?userId=${user.id}`;
                  }}
                >
                  Reconnect to verify which account this is →
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex relative">
        
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Day / Week Header */}
          {(view === 'day' || view === 'week') && (
            <div className="flex border-b border-app-border flex-shrink-0" style={{ paddingLeft: '60px' }}>
              {daysInView.map((d, i) => (
                <div key={i} className="flex-1 py-3 text-center border-l border-app-border border-opacity-30">
                  <p className="text-xs font-semibold text-app-text3 uppercase mb-1">{d.toLocaleDateString('default', { weekday: 'short' })}</p>
                  <p className={`text-xl font-bold font-syne ${isToday(d) ? 'text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-app-text'}`}>
                    {d.getDate()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Month Header */}
          {view === 'month' && (
            <div className="flex border-b border-app-border flex-shrink-0 bg-app-surface2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="flex-1 py-2 text-center text-xs font-semibold text-app-text3 uppercase">{day}</div>
              ))}
            </div>
          )}

          {/* Time Grid (Day/Week) */}
          {(view === 'day' || view === 'week') && (
            <div className="flex-1 overflow-y-auto relative bg-app-bg" ref={timeGridRef}>
              
              {/* NOW Line Indicator — bright on today's column, thin/dim on past days, hidden on future days */}
              <div className="absolute top-0 left-[60px] right-0 bottom-0 z-20 pointer-events-none flex">
                {daysInView.map((d, i) => {
                  const dCopy = new Date(d); dCopy.setHours(0, 0, 0, 0);
                  const todayCopy = new Date(); todayCopy.setHours(0, 0, 0, 0);
                  if (dCopy.getTime() > todayCopy.getTime()) return <div key={i} className="flex-1" />;
                  const today = isToday(d);
                  return (
                    <div key={i} className="flex-1 relative">
                      <div
                        className="absolute left-0 right-0 flex items-center"
                        style={{ top: `${new Date().getHours() * 60 + new Date().getMinutes()}px` }}
                      >
                        {today && <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0"></div>}
                        <div
                          className={
                            today
                              ? 'h-[2px] bg-red-500 opacity-70 w-full shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                              : 'h-px bg-red-500 opacity-25 w-full'
                          }
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Lines */}
              <div className="relative h-[1440px]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="absolute w-full flex" style={{ top: `${i * 60}px` }}>
                    <div className="w-[60px] flex-shrink-0 text-right pr-3 -mt-2">
                      <span className="text-[10px] font-medium text-app-text3">{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</span>
                    </div>
                    <div className="flex-1 border-t border-app-border border-opacity-30"></div>
                  </div>
                ))}
                
                {/* Events & Task Deadlines Overlay */}
                <div className="absolute top-0 left-[60px] right-0 bottom-0 flex">
                  {daysInView.map((d, i) => {
                    const dayEvents = state.googleEvents.filter(e => {
                      const estart = new Date(e.start.dateTime);
                      return estart.getDate() === d.getDate() && estart.getMonth() === d.getMonth();
                    });

                    const dayTasks = tasksWithDeadlines.filter(t => {
                      const tdeadline = new Date(t.deadline!);
                      return tdeadline.getDate() === d.getDate() && tdeadline.getMonth() === d.getMonth();
                    });

                    return (
                      <div key={i} className="flex-1 border-l border-app-border border-opacity-30 relative px-1">
                        
                        {/* Render Google Events */}
                        {dayEvents.map(evt => {
                          const start = new Date(evt.start.dateTime);
                          const end = new Date(evt.end.dateTime);
                          const top = start.getHours() * 60 + start.getMinutes();
                          const height = Math.max(20, (end.getTime() - start.getTime()) / 60000);
                          
                          return (
                            <div 
                              key={evt.id}
                              onClick={(e) => openEventPrep(e, evt)}
                              className="absolute left-1 right-1 rounded-md p-2 cursor-pointer shadow-sm border overflow-hidden group hover:z-30 transition-all"
                              style={{ 
                                top: `${top}px`, 
                                height: `${height}px`,
                                background: 'rgba(66, 133, 244, 0.15)',
                                borderColor: 'rgba(66, 133, 244, 0.3)',
                                zIndex: 10
                              }}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4285F4]"></div>
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-bold text-[#4285F4] truncate flex-1">{evt.summary}</p>
                                {state.meetingNotes && state.meetingNotes.some((n: any) => n.googleEventId === evt.id) && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); router.push(`/ai?tab=meeting&prefill=${evt.id}`); }}
                                    className="flex-shrink-0 text-[9px] font-black px-1 py-0.5 rounded"
                                    style={{ background: 'rgba(124,58,237,0.2)', color: '#7C3AED' }}
                                    title="View AI meeting notes"
                                  >
                                    🤖
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-app-text3 truncate opacity-80">
                                {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          );
                        })}

                        {/* Render Task Deadlines as compact clickable chips, priority-colored */}
                        {dayTasks.map(task => {
                          const deadline = new Date(task.deadline!);
                          const top = deadline.getHours() * 60 + deadline.getMinutes();
                          const priorityColor = task.priority === 'critical' ? '#EF4444'
                            : task.priority === 'high' ? '#F59E0B'
                            : task.priority === 'medium' ? '#EAB308'
                            : '#6B7280';
                          return (
                            <div
                              key={`task-${task.id}`}
                              onClick={() => setGanttSelectedTaskId(task.id)}
                              className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer shadow-sm border overflow-hidden group hover:z-30 transition-all flex items-center gap-1"
                              style={{
                                top: `${top}px`,
                                height: '22px',
                                background: `${priorityColor}20`,
                                borderColor: `${priorityColor}50`,
                                zIndex: 15,
                              }}
                              title={`Deadline: ${task.title} — ${deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: priorityColor }}></div>
                              <span className="text-[10px]">🎯</span>
                              <p className="text-[10px] font-bold truncate" style={{ color: priorityColor }}>{task.title}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Month Grid */}
          {view === 'month' && (
            <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l border-t border-app-border overflow-y-auto">
              {daysInView.map((d, i) => {
                const dayEvents = state.googleEvents.filter((e: any) => {
                  const estart = new Date(e.start.dateTime);
                  return estart.getDate() === d.getDate() && estart.getMonth() === d.getMonth() && estart.getFullYear() === d.getFullYear();
                });
                const dayTasks = tasksWithDeadlines.filter(t => {
                  const tdeadline = new Date(t.deadline!);
                  return tdeadline.getDate() === d.getDate() && tdeadline.getMonth() === d.getMonth() && tdeadline.getFullYear() === d.getFullYear();
                });
                
                const isCurrentMonth = d.getMonth() === currentDate.getMonth();

                return (
                  <div
                    key={i}
                    onClick={() => setGanttModalDate(d)}
                    className={`border-r border-b border-app-border p-2 min-h-[120px] overflow-hidden hover:overflow-y-auto custom-scrollbar flex flex-col cursor-pointer ${isCurrentMonth ? 'bg-app-bg hover:bg-app-surface2' : 'bg-app-surface2 opacity-50'}`}
                  >
                    <div className="flex justify-between items-start mb-2 shrink-0">
                      <span className={`text-sm font-bold font-syne w-7 h-7 flex items-center justify-center rounded-full ${isToday(d) ? 'bg-primary text-white' : 'text-app-text2'}`}>
                        {d.getDate()}
                      </span>
                    </div>
                    
                    <div className="space-y-1 flex-1">
                      {dayEvents.map(evt => (
                        <div key={evt.id} onClick={(e) => openEventPrep(e, evt)} className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate cursor-pointer hover:opacity-80" style={{ background: 'rgba(66, 133, 244, 0.15)', color: '#4285F4' }}>
                          {evt.summary}
                        </div>
                      ))}
                      {dayTasks.map(task => (
                        <div key={task.id} className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate hover:opacity-80 flex items-center gap-1" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span> {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Year Grid */}
          {view === 'year' && (
            <div className="flex-1 overflow-y-auto p-6 bg-app-bg custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {Array.from({ length: 12 }).map((_, monthIndex) => {
                  const date = new Date(currentDate.getFullYear(), monthIndex, 1);
                  const monthName = date.toLocaleDateString('default', { month: 'long' });
                  
                  // Calculate days for this month's mini grid
                  const start = new Date(date);
                  const day = start.getDay();
                  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
                  start.setDate(diff);
                  const days = [];
                  for (let i = 0; i < 42; i++) {
                    const d = new Date(start);
                    d.setDate(d.getDate() + i);
                    days.push(d);
                  }

                  return (
                    <div key={monthIndex} className="bg-app-surface border border-app-border rounded-xl p-4 shadow-sm hover:border-primary/50 transition">
                      <h3 className="text-lg font-bold font-syne text-app-text mb-3">{monthName}</h3>
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                          <div key={i} className="text-center text-[10px] font-bold text-app-text3">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {days.map((d, i) => {
                          const isCurrentMonth = d.getMonth() === monthIndex;
                          const isTdy = isToday(d);
                          
                          // Check if day has events or tasks
                          const hasEvent = state.googleEvents.some((e: any) => {
                            const estart = new Date(e.start.dateTime);
                            return estart.getDate() === d.getDate() && estart.getMonth() === d.getMonth() && estart.getFullYear() === d.getFullYear();
                          });
                          const hasTask = tasksWithDeadlines.some(t => {
                            const tdeadline = new Date(t.deadline!);
                            return tdeadline.getDate() === d.getDate() && tdeadline.getMonth() === d.getMonth() && tdeadline.getFullYear() === d.getFullYear();
                          });

                          return (
                            <div 
                              key={i} 
                              onClick={() => {
                                setCurrentDate(d);
                                setView('day');
                              }}
                              className={`aspect-square flex flex-col items-center justify-center rounded text-[10px] cursor-pointer hover:bg-app-surface2 transition relative
                                ${!isCurrentMonth ? 'text-app-text3 opacity-30' : isTdy ? 'bg-primary text-white font-bold shadow-md' : 'text-app-text2 font-medium'}
                              `}
                            >
                              <span>{d.getDate()}</span>
                              <div className="flex gap-0.5 mt-0.5">
                                {hasEvent && <span className={`w-1 h-1 rounded-full ${isTdy ? 'bg-white' : 'bg-blue-500'}`}></span>}
                                {hasTask && <span className={`w-1 h-1 rounded-full ${isTdy ? 'bg-white' : 'bg-red-500'}`}></span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sliding Right Panel - Prep & AI Notes */}
        <div 
          className={`flex-shrink-0 w-[380px] bg-app-surface border-l border-app-border flex flex-col transition-transform duration-300 transform ${isPrepPanelOpen && selectedEvent ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 bottom-0 z-50'}`}
          style={{ boxShadow: isPrepPanelOpen ? '-10px 0 30px rgba(0,0,0,0.2)' : 'none' }}
        >
          {selectedEvent && (
            <>
              {/* Prep Header */}
              <div className="p-5 border-b border-app-border flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg font-syne text-app-text mb-1">{selectedEvent.summary}</h3>
                  <p className="text-xs text-app-text3 font-medium">
                    {new Date(selectedEvent.start.dateTime).toLocaleString()} - {new Date(selectedEvent.end.dateTime).toLocaleTimeString()}
                  </p>
                </div>
                <button onClick={() => setIsPrepPanelOpen(false)} className="text-app-text3 hover:text-app-text p-1 bg-app-surface2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Prep Actions */}
              <div className="p-5 border-b border-app-border space-y-3">
                {selectedEvent.meetLink && (
                  <a href={selectedEvent.meetLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg font-bold text-sm transition">
                    <Video className="w-4 h-4" /> Join Google Meet
                  </a>
                )}
                <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-app-surface2 text-app-text hover:bg-app-hover rounded-lg font-bold text-sm border border-app-border transition">
                  <LinkIcon className="w-4 h-4" /> Copy Link
                </button>
              </div>

              {/* AI Context / Notes */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-app-text2">AI Meeting Prep</h4>
                </div>
                
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-app-text mb-3 leading-relaxed">
                    Based on recent emails and tasks, the client will likely ask about the <strong className="text-purple-400">Q3 Campaign Creatives</strong>.
                  </p>
                  <ul className="text-[13px] text-app-text2 space-y-2 list-disc pl-4">
                    <li>Task "Draft Ad Copy" is <strong className="text-green-500">Done</strong></li>
                    <li>Task "Render final video" is <strong className="text-amber-500">In Progress</strong> (due in 2 hours)</li>
                  </ul>
                  <button className="mt-4 text-xs font-bold text-purple-500 bg-purple-500/10 px-3 py-1.5 rounded-md hover:bg-purple-500/20 transition">
                    Generate Full Brief
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <AlignLeft className="w-4 h-4 text-app-text3" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-app-text2">Attendees</h4>
                </div>
                
                <div className="space-y-2">
                  {selectedEvent.attendees ? selectedEvent.attendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-app-surface2 transition">
                      <div className="w-8 h-8 rounded-full bg-app-border flex items-center justify-center text-xs font-bold text-app-text">
                        {a.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-app-text truncate">{a.email}</p>
                        <p className="text-[10px] text-app-text3 capitalize">{a.responseStatus || 'needsAction'}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-app-text3">No attendees listed.</p>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="mt-8">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-app-text2 mb-3">Description</h4>
                    <div className="text-sm text-app-text2 prose prose-invert" dangerouslySetInnerHTML={{ __html: selectedEvent.description }} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Day-click Gantt popup */}
      {ganttModalDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setGanttModalDate(null)}
        >
          <div
            className="bg-surface-2 border border-border rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface flex-shrink-0">
              <h3 className="font-bold text-[16px] text-text flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {ganttModalDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setGanttModalDate(null)}
                className="text-text-3 hover:text-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-hidden">
              <GanttView
                selectedTaskId={ganttSelectedTaskId}
                setSelectedTaskId={setGanttSelectedTaskId}
                clientFilter=""
                memberFilter=""
                priorityFilter=""
                initialDate={ganttModalDate}
              />
            </div>
          </div>
        </div>
      )}

      <TaskDrawer taskId={ganttSelectedTaskId} onClose={() => setGanttSelectedTaskId(null)} />
    </div>
  );
}
