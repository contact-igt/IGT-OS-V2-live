'use client';
import { useState, useRef, MouseEvent, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import { PRIORITY_CONFIG } from '@/lib/data';
import { AlignLeft, ChevronLeft, ChevronRight, GripVertical, ChevronDown } from 'lucide-react';

export default function GanttView({
  selectedTaskId,
  setSelectedTaskId,
  clientFilter,
  memberFilter,
  priorityFilter,
  initialDate,
}: {
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  clientFilter: string;
  memberFilter: string;
  priorityFilter: string;
  initialDate?: Date;
}) {
  const { state, updateTask } = useApp();
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>('day');
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  
  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Task Dragging state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState(0);
  const [dragMode, setDragMode] = useState<'move' | 'extend-left' | 'extend-right'>('move');

  const BASE_UNIT_WIDTH = zoomLevel === 'day' ? 60 : zoomLevel === 'week' ? 40 : 30;
  const UNIT_WIDTH = BASE_UNIT_WIDTH * zoomMultiplier;
  const numUnits = zoomLevel === 'day' ? 48 : zoomLevel === 'week' ? 30 : 90;
  
  // Helper to get a Date object whose local time methods return IST values
  const getISTDate = (dateInput: Date | string | number = new Date()) => {
    const d = new Date(dateInput);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5)); // IST is +5:30
  };

  const [today, setToday] = useState<Date>(() => {
    const d = getISTDate();
    d.setHours(0,0,0,0);
    return d;
  });
  
  const [startDate, setStartDate] = useState(() => {
    const d = initialDate ? getISTDate(initialDate) : getISTDate();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - 1); // For 'day' view, start a day before so 48 hrs covers the day before & the target day
    return d;
  });

  useEffect(() => {
    // Update today dynamically if app stays open
    const interval = setInterval(() => {
      const d = getISTDate();
      d.setHours(0,0,0,0);
      setToday(d);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const shiftDays = (days: number) => {
    const d = new Date(startDate);
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    setStartDate(d);
  };

  const scrollToDate = (target: Date) => {
    const todayIST = getISTDate();
    todayIST.setHours(0,0,0,0);
    const targetIST = getISTDate(target);
    targetIST.setHours(0,0,0,0);
    const isTargetToday = targetIST.getTime() === todayIST.getTime();

    const d = new Date(targetIST);
    d.setDate(d.getDate() - (zoomLevel === 'day' ? 1 : 5));
    setStartDate(d);

    setTimeout(() => {
      if (timelineRef.current) {
        if (zoomLevel === 'day') {
           const hour = isTargetToday ? getISTDate().getHours() : 12;
           const targetIndex = 24 + hour;
           timelineRef.current.scrollLeft = (targetIndex * UNIT_WIDTH) - (timelineRef.current.clientWidth / 2) + (UNIT_WIDTH / 2);
        } else {
           timelineRef.current.scrollLeft = (5 * UNIT_WIDTH) - (timelineRef.current.clientWidth / 2) + (UNIT_WIDTH / 2);
        }
      }
    }, 50);
  };

  const scrollToToday = () => scrollToDate(getISTDate());

  useEffect(() => {
    if (initialDate) {
      scrollToDate(initialDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const units = Array.from({ length: numUnits }).map((_, i) => {
    const d = new Date(startDate);
    if (zoomLevel === 'day') {
      d.setHours(i, 0, 0, 0);
    } else {
      d.setDate(d.getDate() + i);
    }
    return d;
  });

  const getLeft = (date: Date | string) => {
    const d = getISTDate(date);
    if (zoomLevel === 'day') {
      const diffMs = d.getTime() - startDate.getTime();
      return (diffMs / (1000 * 60 * 60)) * UNIT_WIDTH;
    } else {
      const startOfDay = new Date(d);
      startOfDay.setHours(0,0,0,0);
      const diffDays = (startOfDay.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays * UNIT_WIDTH;
    }
  };

  const clients = clientFilter ? state.clients.filter(c => c.id === clientFilter) : state.clients;

  // Panning handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (draggingTaskId) return; // don't pan if dragging a task
    if (!timelineRef.current) return;
    setIsPanning(true);
    setStartX(e.pageX - timelineRef.current.offsetLeft);
    setScrollLeft(timelineRef.current.scrollLeft);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isPanning && timelineRef.current) {
      e.preventDefault();
      const x = e.pageX - timelineRef.current.offsetLeft;
      const walk = (x - startX) * 1.5; 
      timelineRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Task Drag handlers
  const handleTaskDragStart = (e: MouseEvent, taskId: string, mode: 'move' | 'extend-left' | 'extend-right' = 'move') => {
    e.stopPropagation();
    setDraggingTaskId(taskId);
    setDragMode(mode);
    setDragOffsetDays(0);
    setStartX(e.pageX);
  };

  const handleTaskDragMove = (e: MouseEvent) => {
    if (draggingTaskId) {
      const diffX = e.pageX - startX;
      const unitsMoved = Math.round(diffX / UNIT_WIDTH);
      setDragOffsetDays(zoomLevel === 'day' ? unitsMoved / 24 : unitsMoved);
    }
  };

  const handleTaskDragEnd = (e: MouseEvent) => {
    if (draggingTaskId && dragOffsetDays !== 0) {
      const task = state.tasks.find(t => t.id === draggingTaskId);
      if (task) {
        if (dragMode === 'move' && task.deadline) {
          const d = new Date(task.deadline);
          d.setDate(d.getDate() + dragOffsetDays);
          
          const updateData: any = { deadline: d.toISOString() };
          if (task.startTime) {
            const st = new Date(task.startTime);
            st.setDate(st.getDate() + dragOffsetDays);
            updateData.startTime = st.toISOString();
          }
          updateTask(task.id, updateData);
        } else if (dragMode === 'extend-right' && task.deadline) {
          const d = new Date(task.deadline);
          d.setDate(d.getDate() + dragOffsetDays);
          updateTask(task.id, { deadline: d.toISOString() });
        } else if (dragMode === 'extend-left') {
          const st = task.startTime ? new Date(task.startTime) : new Date(task.createdAt);
          st.setDate(st.getDate() + dragOffsetDays);
          updateTask(task.id, { startTime: st.toISOString() });
        }
      }
    }
    setDraggingTaskId(null);
    setDragMode('move');
    setDragOffsetDays(0);
  };

  return (
    <div 
      className="flex flex-col h-full overflow-hidden select-none"
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleTaskDragMove(e);
      }}
      onMouseUp={(e) => {
        handleMouseUp();
        handleTaskDragEnd(e);
      }}
      onMouseLeave={(e) => {
        handleMouseUp();
        handleTaskDragEnd(e);
      }}
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex gap-3">
          <div className="flex bg-surface-2 rounded-lg p-1 items-center" style={{ border: '1px solid var(--c-border)' }}>
            <button 
              onClick={() => setZoomMultiplier(prev => Math.min(prev + 0.5, 5.0))} 
              className="px-2 hover:text-text transition-colors text-text-2 flex items-center"
              title="Zoom In"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            <button onClick={() => { setZoomLevel('day'); setZoomMultiplier(1); const d = getISTDate(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 1); setStartDate(d); }} className={`px-2 py-1 rounded text-[11px] font-bold ${zoomLevel === 'day' ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}>Day</button>
            <button onClick={() => { setZoomLevel('week'); setZoomMultiplier(1); const d = getISTDate(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 5); setStartDate(d); }} className={`px-2 py-1 rounded text-[11px] font-bold ${zoomLevel === 'week' ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}>Week</button>
            <button onClick={() => { setZoomLevel('month'); setZoomMultiplier(1); const d = getISTDate(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 5); setStartDate(d); }} className={`px-2 py-1 rounded text-[11px] font-bold ${zoomLevel === 'month' ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}>Month</button>
            <button 
              onClick={() => setZoomMultiplier(prev => Math.max(prev - 0.5, 0.25))} 
              className="px-2 hover:text-text transition-colors text-text-2 flex items-center"
              title="Zoom Out"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
          </div>
          <div className="flex bg-surface-2 rounded-lg p-1 items-center" style={{ border: '1px solid var(--c-border)' }}>
            <button onClick={() => shiftDays(zoomLevel === 'day' ? -0.5 : zoomLevel === 'week' ? -7 : zoomLevel === 'month' ? -30 : -90)} className="px-2 hover:text-text transition-colors text-text-2 flex items-center"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={scrollToToday} className="px-3 text-[13px] font-bold text-text-2 hover:text-text transition-colors">Today</button>
            <button onClick={() => shiftDays(zoomLevel === 'day' ? 0.5 : zoomLevel === 'week' ? 7 : zoomLevel === 'month' ? 30 : 90)} className="px-2 hover:text-text transition-colors text-text-2 flex items-center"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
      
      <div className="flex gap-5 mb-4 flex-shrink-0 items-center bg-surface-2 w-fit px-4 py-2 rounded-lg border border-border">
        <span className="text-[12px] font-bold uppercase tracking-widest text-text-3">Priority Legend</span>
        <div className="w-px h-4 bg-border mx-1"></div>
        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-[12px] font-semibold text-text-2">
            <span className="w-3 h-3 rounded shadow-sm" style={{ background: v.color }}></span>
            {v.label}
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 border border-border rounded-xl bg-surface overflow-hidden shadow-sm">
        {/* Left Panel */}
        <div className="w-[280px] flex-shrink-0 border-r border-border flex flex-col bg-surface-2 z-20">
          <div className="h-[54px] border-b border-border flex items-center px-5 bg-surface-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-text-3">Task Details</span>
          </div>
          <div 
            ref={leftPanelRef}
            className="flex-1 overflow-y-auto pb-8 gantt-scrollbar"
            onScroll={(e) => {
              if (timelineRef.current) {
                timelineRef.current.scrollTop = e.currentTarget.scrollTop;
              }
            }}
          >
            {clients.map(c => {
              let ctasks = state.tasks.filter(t => t.clientId === c.id && t.status !== 'done');
              if (memberFilter) {
                ctasks = ctasks.filter(t => t.assignedTo.includes(memberFilter));
              }
              if (priorityFilter) {
                ctasks = ctasks.filter(t => t.priority === priorityFilter);
              }
              if (ctasks.length === 0) return null;
              return (
                <div key={c.id}>
                  <div className="px-5 py-2.5 bg-surface-3 border-y border-border sticky top-0 z-20 font-bold text-[13px] text-text flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color || '#2AB182' }}></span>
                      {c.name}
                    </div>
                    <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-text-2 border border-border">{ctasks.length}</span>
                  </div>
                  {ctasks.map(t => (
                    <div key={t.id} className="px-5 border-b border-border h-[58px] flex flex-col justify-center cursor-pointer hover:bg-hover transition-colors group" onClick={() => setSelectedTaskId(t.id)}>
                      <p className="text-[13px] font-semibold text-text truncate group-hover:text-primary">{t.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold px-1.5 rounded-sm" style={{ background: `${PRIORITY_CONFIG[t.priority].color}20`, color: PRIORITY_CONFIG[t.priority].color }}>{PRIORITY_CONFIG[t.priority].label.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Right Panel (Timeline) */}
        <div 
          ref={timelineRef}
          onMouseDown={handleMouseDown}
          onScroll={(e) => {
            if (leftPanelRef.current) {
              leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          className={`flex-1 overflow-x-auto overflow-y-auto relative bg-surface gantt-scrollbar ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ scrollbarWidth: 'auto' }} // Ensure native visible scrollbars
        >
          <div className="sticky top-0 z-10 bg-surface border-b border-border" style={{ width: units.length * UNIT_WIDTH }}>
            {/* Month view: two-row header (month name row + day number row) */}
            {zoomLevel === 'month' && (() => {
              // Build month spans for the top row
              const monthSpans: { label: string; span: number }[] = [];
              let currentLabel = '';
              let currentSpan = 0;
              units.forEach((d) => {
                const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                if (label !== currentLabel) {
                  if (currentLabel) monthSpans.push({ label: currentLabel, span: currentSpan });
                  currentLabel = label;
                  currentSpan = 1;
                } else {
                  currentSpan++;
                }
              });
              if (currentLabel) monthSpans.push({ label: currentLabel, span: currentSpan });

              return (
                <div className="flex flex-col">
                  {/* Row 1: Month names */}
                  <div className="flex h-[28px]">
                    {monthSpans.map((m, i) => (
                      <div
                        key={m.label + i}
                        className="flex items-center border-r border-border px-3"
                        style={{
                          width: m.span * UNIT_WIDTH,
                          background: i % 2 === 0 ? 'var(--c-surface-2)' : 'var(--c-surface)',
                        }}
                      >
                        <span className="text-[11px] font-bold text-text uppercase tracking-wider whitespace-nowrap">
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Row 2: Day numbers */}
                  <div className="flex h-[26px] border-t border-border/60">
                    {units.map((d, i) => {
                      const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                      return (
                        <div
                          key={d.toISOString()}
                          className="flex-shrink-0 flex items-center justify-center border-r border-border/40"
                          style={{
                            width: UNIT_WIDTH,
                            background: isToday ? 'rgba(42,177,130,0.12)' : 'transparent',
                          }}
                        >
                          <span className={`text-[10px] font-semibold ${isToday ? 'text-[#2AB182] font-bold' : 'text-text-3'}`}>
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {/* Day / Week views: single-row header */}
            {zoomLevel !== 'month' && (
              <div className="flex" style={{ width: units.length * UNIT_WIDTH }}>
                {units.map((d, i) => {
                  const isToday = zoomLevel !== 'day' && d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                  const isCurrentHour = zoomLevel === 'day' && d.getHours() === getISTDate().getHours() && d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                  const isFirstOfMonth = d.getDate() === 1;

                  return (
                    <div key={d.toISOString()} className="flex-shrink-0 border-r border-border flex items-center justify-center flex-col h-[53px] relative" style={{ width: UNIT_WIDTH, background: (isToday || isCurrentHour) ? 'rgba(42,177,130,0.08)' : 'var(--c-surface)' }}>
                      {zoomLevel === 'day' && UNIT_WIDTH >= 25 && (
                        <span className={`text-[12px] font-bold ${isCurrentHour ? 'text-[#2AB182]' : 'text-text-2'}`}>
                          {d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
                        </span>
                      )}
                      {zoomLevel === 'day' && UNIT_WIDTH < 25 && (
                        <span className={`text-[10px] font-bold ${isCurrentHour ? 'text-[#2AB182]' : 'text-text-2'}`}>
                          {d.getHours() % 3 === 0 ? d.getHours() + 'h' : ''}
                        </span>
                      )}
                      {zoomLevel === 'week' && (
                        <>
                          {UNIT_WIDTH >= 30 && <span className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: isToday ? '#2AB182' : 'var(--c-text-3)' }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>}
                          {UNIT_WIDTH >= 20 && (
                            <span className={`text-[14px] font-bold flex flex-col items-center gap-0 ${isToday ? 'text-[#2AB182]' : 'text-text'}`}>
                              <span>{d.getDate()}</span>
                              {(isFirstOfMonth || i === 0) && <span className="text-[9px] text-text-3 font-medium bg-surface-2 px-1 rounded">{d.toLocaleDateString('en-US', { month: 'short' })}</span>}
                            </span>
                          )}
                          {UNIT_WIDTH < 20 && <span className={`text-[10px] font-bold ${isToday ? 'text-[#2AB182]' : 'text-text-3'}`}>{d.getDate() % 2 === 0 ? d.getDate() : ''}</span>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="relative" style={{ width: units.length * UNIT_WIDTH, minHeight: 'calc(100% - 54px)' }}>
            {/* Background grid */}
            <div className="absolute inset-0 flex pointer-events-none">
              {units.map(d => {
                const isToday = zoomLevel !== 'day' && d.getTime() === today.getTime();
                const isCurrentHour = zoomLevel === 'day' && d.getHours() === getISTDate().getHours() && startDate.getTime() === today.getTime();
                const isWorkingHour = zoomLevel === 'day' && d.getHours() >= 9 && d.getHours() < 18;
                const isFirstOfMonth = d.getDate() === 1;
                return (
                  <div key={d.toISOString()} className={`flex-shrink-0 h-full relative border-r border-border/40`} style={{ width: UNIT_WIDTH, background: (isToday || isCurrentHour) ? 'rgba(42,177,130,0.03)' : (zoomLevel === 'day' && isWorkingHour ? 'var(--c-surface-2)' : 'transparent') }}>
                    {(isToday || isCurrentHour) && <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-[#EF4444]/60 z-0" style={{ left: '50%' }}></div>}
                  </div>
                );
              })}
            </div>
            
            <div className="pb-8 z-10 relative">
              {clients.map(c => {
                let ctasks = state.tasks.filter(t => t.clientId === c.id && t.status !== 'done');
                if (memberFilter) {
                  ctasks = ctasks.filter(t => t.assignedTo.includes(memberFilter));
                }
                if (ctasks.length === 0) return null;
                return (
                  <div key={c.id}>
                    <div className="h-[40px] pointer-events-none"></div> {/* Header spacer (bg-surface-3 matches left) */}
                    {ctasks.map(t => {
                      const dl = t.deadline ? new Date(t.deadline) : null;
                      const st = getISTDate();
                      if (dl) {
                        const daysToSubtract = Math.max(1, Math.ceil((t.estimatedHours || 8) / 8));
                        st.setTime(dl.getTime() - (daysToSubtract * 86400000));
                      } else {
                        st.setTime(new Date(t.startTime || t.createdAt).getTime());
                      }
                      if (dl && dl < st) st.setTime(dl.getTime() - 86400000); 
                      
                      let left = getLeft(st);
                      let width = UNIT_WIDTH * 2;
                      if (dl) {
                        width = getLeft(dl) - left;
                        if (zoomLevel === 'day' && width < UNIT_WIDTH * 2) width = UNIT_WIDTH * Math.max(t.estimatedHours || 2, 2);
                      } else if (zoomLevel === 'day' && t.estimatedHours) {
                        width = t.estimatedHours * UNIT_WIDTH;
                      }
                      width = Math.max(width, UNIT_WIDTH);
                      
                      // Apply drag offset
                      if (draggingTaskId === t.id) {
                        const dragPx = (dragOffsetDays * (zoomLevel === 'day' ? 24 : 1) * UNIT_WIDTH);
                        if (dragMode === 'move') {
                          left += dragPx;
                        } else if (dragMode === 'extend-right') {
                          width += dragPx;
                        } else if (dragMode === 'extend-left') {
                          left += dragPx;
                          width -= dragPx;
                        }
                      }

                      const pcolor = PRIORITY_CONFIG[t.priority].color;
                      const isDraggingThis = draggingTaskId === t.id;
                      
                      // Duration text
                      let durationText = '';
                      if (dl) {
                        const diffMs = dl.getTime() - st.getTime();
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        durationText = diffDays > 0 ? `${diffDays}d` : '1d';
                        if (zoomLevel === 'day' && diffDays <= 1) {
                          durationText = `${t.estimatedHours || 8}h`;
                        }
                      }

                      return (
                        <div key={t.id} className="h-[58px] border-b border-transparent relative flex items-center group hover:bg-[var(--c-hover)] transition-colors">
                          <div 
                            onMouseDown={(e) => dl ? handleTaskDragStart(e, t.id, 'move') : null}
                            onClick={() => { if (dragOffsetDays === 0) setSelectedTaskId(t.id); }}
                            className={`absolute h-[32px] rounded transition-shadow shadow-sm flex items-center px-2 z-10 overflow-hidden text-[12px] font-bold text-white whitespace-nowrap hover:shadow-md ${dl ? 'cursor-move' : 'cursor-pointer'} ${isDraggingThis ? 'scale-[1.02] shadow-xl z-50 ring-2 ring-primary' : 'hover:scale-[1.01]'}`}
                            style={{ 
                              left: Math.max(0, left) + 2, 
                              width: dl ? Math.max(12, Math.min(width - 4, (units.length * UNIT_WIDTH) - left - 4)) : Math.max(12, width - 4), 
                              background: dl ? pcolor : 'transparent',
                              border: dl ? 'none' : `2px dashed ${pcolor}`,
                              color: dl ? '#fff' : pcolor,
                              opacity: (left + width < 0 || left > units.length * UNIT_WIDTH) ? 0 : 1
                            }}
                          >
                            {!dl && "No Deadline"}
                            {dl && (
                              <>
                                <div 
                                  className="absolute left-0 top-0 bottom-0 w-2 hover:bg-black/20 cursor-col-resize flex items-center justify-center pointer-events-auto"
                                  onMouseDown={(e) => handleTaskDragStart(e, t.id, 'extend-left')}
                                ></div>
                                {width > 40 && (
                                  <div className="ml-2 flex items-center justify-between w-full pointer-events-none pr-4">
                                    <span className="font-medium text-[10px] truncate">{t.title}</span>
                                    {width > 120 && <span className="font-bold text-[9px] bg-black/20 px-1.5 rounded">{durationText}</span>}
                                  </div>
                                )}
                                <div 
                                  className="absolute right-0 top-0 bottom-0 w-4 bg-black/10 flex items-center justify-center hover:bg-black/20 cursor-col-resize pointer-events-auto"
                                  onMouseDown={(e) => handleTaskDragStart(e, t.id, 'extend-right')}
                                >
                                  <GripVertical className="w-3 h-3 text-white/50" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
