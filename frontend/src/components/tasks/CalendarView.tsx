'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Task, PRIORITY_CONFIG, STATUS_CONFIG, Client } from '@/lib/data';
import { GoogleEvent } from '@/lib/googleCalendar';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function startOfWeek(d: Date) {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ─── Month View ─────────────────────────────────────────────────────────────

function MonthView({
  tasks,
  googleEvents,
  currentDate,
  onTaskClick,
  onDayClick,
}: {
  tasks: Task[];
  googleEvents: GoogleEvent[];
  currentDate: Date;
  onTaskClick: (id: string) => void;
  onDayClick: (d: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  const todayStr = isoDate(new Date());

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 flex-shrink-0 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[11px] font-black uppercase tracking-wider py-2" style={{ color: 'var(--c-text-3)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px flex-1 min-h-0" style={{ background: 'var(--c-border)' }}>
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - firstDow + 1;
          const cellDate = new Date(year, month, dayNum);
          const cellStr = isoDate(cellDate);
          const isCurrentMonth = cellDate.getMonth() === month;
          const isToday = cellStr === todayStr;

          const dayTasks = tasks.filter(t => t.deadline?.startsWith(cellStr));
          const dayEvents = googleEvents.filter(evt =>
            evt.start.dateTime.startsWith(cellStr)
          );
          const overflow = dayTasks.length + dayEvents.length - 3;

          return (
            <div
              key={i}
              onClick={() => onDayClick(cellDate)}
              className="flex flex-col p-1.5 cursor-pointer transition-colors min-h-[100px]"
              style={{
                background: isToday ? 'rgba(42,177,130,0.05)' : 'var(--c-surface)',
                opacity: isCurrentMonth ? 1 : 0.38,
              }}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full"
                  style={{
                    background: isToday ? '#2AB182' : 'transparent',
                    color: isToday ? 'white' : 'var(--c-text-2)',
                  }}
                >
                  {cellDate.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4285F4' }} />
                )}
              </div>

              {/* Task chips (up to 2) */}
              <div className="flex flex-col gap-0.5 flex-1">
                {dayTasks.slice(0, 2).map(t => (
                  <div
                    key={t.id}
                    onClick={e => { e.stopPropagation(); onTaskClick(t.id); }}
                    className="text-[9px] font-bold truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: PRIORITY_CONFIG[t.priority].bg,
                      color: PRIORITY_CONFIG[t.priority].color,
                    }}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
                {/* Google event chips */}
                {dayEvents.slice(0, dayTasks.length >= 2 ? 0 : 2 - dayTasks.length).map(evt => (
                  <div
                    key={evt.id}
                    className="text-[9px] font-bold truncate px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(66,133,244,0.12)', color: '#4285F4' }}
                    title={evt.summary}
                  >
                    📅 {evt.summary}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-[9px] font-bold" style={{ color: 'var(--c-text-3)' }}>
                    +{overflow} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({
  tasks,
  googleEvents,
  currentDate,
  onTaskClick,
  onDayClick,
}: {
  tasks: Task[];
  googleEvents: GoogleEvent[];
  currentDate: Date;
  onTaskClick: (id: string) => void;
  onDayClick: (d: Date) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = isoDate(new Date());
  const nowRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const nowPx = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    if (nowRef.current) {
      nowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Day header row */}
      <div className="grid flex-shrink-0" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
        <div /> {/* time gutter */}
        {days.map(d => {
          const dStr = isoDate(d);
          const isToday = dStr === todayStr;
          return (
            <div
              key={dStr}
              onClick={() => onDayClick(d)}
              className="text-center py-2 cursor-pointer"
              style={{ borderBottom: '1px solid var(--c-border)' }}
            >
              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: isToday ? '#2AB182' : 'var(--c-text-3)' }}>
                {DAY_LABELS[d.getDay()]}
              </p>
              <div
                className="w-7 h-7 rounded-full mx-auto flex items-center justify-center text-[14px] font-bold"
                style={{
                  background: isToday ? '#2AB182' : 'transparent',
                  color: isToday ? 'white' : 'var(--c-text)',
                }}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deadline task pills at top */}
      <div className="grid flex-shrink-0 mb-1" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
        <div className="text-[9px] font-bold flex items-center justify-end pr-2" style={{ color: 'var(--c-text-3)' }}>All day</div>
        {days.map(d => {
          const dStr = isoDate(d);
          const dayTasks = tasks.filter(t => t.deadline?.startsWith(dStr));
          return (
            <div key={dStr} className="min-h-[28px] p-0.5 flex flex-col gap-0.5" style={{ borderLeft: '1px solid var(--c-border)' }}>
              {dayTasks.slice(0, 2).map(t => (
                <div
                  key={t.id}
                  onClick={() => onTaskClick(t.id)}
                  className="text-[9px] font-bold truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80"
                  style={{ background: PRIORITY_CONFIG[t.priority].bg, color: PRIORITY_CONFIG[t.priority].color }}
                >
                  {t.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="relative" style={{ height: `${24 * 60}px` }}>
          {/* Hour lines + labels */}
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: `${h * 60}px`, height: '60px' }}
            >
              <span
                className="text-[9px] font-bold w-12 text-right pr-2 flex-shrink-0 -mt-2.5"
                style={{ color: 'var(--c-text-3)' }}
              >
                {h === 0 ? '' : `${h}:00`}
              </span>
              <div className="flex-1 border-t" style={{ borderColor: 'var(--c-border)' }} />
            </div>
          ))}

          {/* Google events */}
          <div className="absolute left-12 right-0 top-0 bottom-0 grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map(d => {
              const dStr = isoDate(d);
              const isToday = dStr === todayStr;
              const dayEvents = googleEvents.filter(evt => evt.start.dateTime.startsWith(dStr));
              return (
                <div
                  key={dStr}
                  className="relative"
                  style={{
                    borderLeft: '1px solid var(--c-border)',
                    background: isToday ? 'rgba(42,177,130,0.03)' : 'transparent',
                  }}
                >
                  {dayEvents.map(evt => {
                    const start = new Date(evt.start.dateTime);
                    const end = new Date(evt.end.dateTime);
                    const top = start.getHours() * 60 + start.getMinutes();
                    const height = Math.max(20, (end.getTime() - start.getTime()) / 60000);
                    return (
                      <div
                        key={evt.id}
                        className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          background: 'rgba(66,133,244,0.18)',
                          border: '1px solid rgba(66,133,244,0.35)',
                          zIndex: 5,
                        }}
                        title={evt.summary}
                      >
                        <p className="text-[9px] font-bold truncate" style={{ color: '#4285F4' }}>{evt.summary}</p>
                        <p className="text-[8px]" style={{ color: '#4285F4', opacity: 0.8 }}>
                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {evt.meetLink && (
                          <a
                            href={evt.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[8px] font-bold mt-0.5 block"
                            style={{ color: '#4285F4' }}
                          >
                            📹 Join
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* NOW line */}
          <div
            ref={nowRef}
            className="absolute left-12 right-0 z-20 pointer-events-none flex items-center"
            style={{ top: `${nowPx}px` }}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#EF4444', marginLeft: '-4px' }} />
            <div className="flex-1 border-t border-red-500" style={{ borderStyle: 'solid' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({
  tasks,
  googleEvents,
  currentDate,
  onTaskClick,
}: {
  tasks: Task[];
  googleEvents: GoogleEvent[];
  currentDate: Date;
  onTaskClick: (id: string) => void;
}) {
  const dStr = isoDate(currentDate);
  const dayTasks = tasks.filter(t => t.deadline?.startsWith(dStr));
  const dayEvents = googleEvents.filter(evt => evt.start.dateTime.startsWith(dStr));
  const isToday = dStr === isoDate(new Date());
  const now = new Date();
  const nowPx = now.getHours() * 60 + now.getMinutes();
  const nowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nowRef.current) {
      nowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div
        className="flex items-center gap-4 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface-2)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] font-black"
          style={{
            background: isToday ? '#2AB182' : 'var(--c-surface)',
            color: isToday ? 'white' : 'var(--c-text)',
          }}
        >
          {currentDate.getDate()}
        </div>
        <div>
          <p className="text-[16px] font-bold" style={{ color: 'var(--c-text)' }}>
            {currentDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-[12px]" style={{ color: 'var(--c-text-3)' }}>
            {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''} due · {dayEvents.length} meeting{dayEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* All-day tasks */}
      {dayTasks.length > 0 && (
        <div
          className="px-4 py-2.5 flex-shrink-0 flex flex-wrap gap-1.5"
          style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface-2)' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider mr-2 self-center" style={{ color: 'var(--c-text-3)' }}>Due today</span>
          {dayTasks.map(t => (
            <button
              key={t.id}
              onClick={() => onTaskClick(t.id)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: PRIORITY_CONFIG[t.priority].bg, color: PRIORITY_CONFIG[t.priority].color }}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="relative" style={{ height: `${24 * 60}px` }}>
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: `${h * 60}px`, height: '60px' }}
            >
              <span
                className="text-[10px] font-bold w-14 text-right pr-3 flex-shrink-0 -mt-2.5"
                style={{ color: 'var(--c-text-3)' }}
              >
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </span>
              <div className="flex-1 border-t" style={{ borderColor: 'var(--c-border)' }} />
            </div>
          ))}

          {/* Events */}
          <div className="absolute left-14 right-2 top-0 bottom-0">
            {dayEvents.map(evt => {
              const start = new Date(evt.start.dateTime);
              const end = new Date(evt.end.dateTime);
              const top = start.getHours() * 60 + start.getMinutes();
              const height = Math.max(30, (end.getTime() - start.getTime()) / 60000);
              return (
                <div
                  key={evt.id}
                  className="absolute left-0 right-0 rounded-xl px-3 py-2 overflow-hidden cursor-pointer hover:opacity-90"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    background: 'rgba(66,133,244,0.14)',
                    border: '1px solid rgba(66,133,244,0.35)',
                    borderLeft: '4px solid #4285F4',
                  }}
                >
                  <p className="text-[12px] font-bold truncate mb-0.5" style={{ color: '#4285F4' }}>{evt.summary}</p>
                  <p className="text-[11px]" style={{ color: '#4285F4', opacity: 0.8 }}>
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {evt.meetLink && (
                    <a
                      href={evt.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[10px] font-bold mt-1 px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(66,133,244,0.2)', color: '#4285F4' }}
                    >
                      📹 Join meeting
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* NOW line */}
          {isToday && (
            <div
              ref={nowRef}
              className="absolute left-14 right-0 z-20 pointer-events-none flex items-center"
              style={{ top: `${nowPx}px` }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#EF4444', marginLeft: '-4px' }} />
              <div className="flex-1 border-t-2" style={{ borderColor: '#EF4444' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

type CalendarSubView = 'month' | 'week' | 'day';

interface Props {
  tasks: Task[];
  googleEvents: GoogleEvent[];
  onTaskClick: (id: string) => void;
}

export default function CalendarView({ tasks, googleEvents, onTaskClick }: Props) {
  const [subView, setSubView] = useState<CalendarSubView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (subView === 'month') d.setMonth(d.getMonth() - 1);
    else if (subView === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (subView === 'month') d.setMonth(d.getMonth() + 1);
    else if (subView === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const headerLabel = useMemo(() => {
    if (subView === 'month') return currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (subView === 'week') {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      return `${ws.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [subView, currentDate]);

  const handleDayClick = (d: Date) => {
    setCurrentDate(d);
    setSubView('day');
  };

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface-2)' }}
      >
        {/* Nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text-2)' }}
          >
            Today
          </button>
          <button
            onClick={navigatePrev}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text-2)' }}
          >
            ‹
          </button>
          <button
            onClick={navigateNext}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text-2)' }}
          >
            ›
          </button>
          <h3 className="text-[15px] font-bold ml-1" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
            {headerLabel}
          </h3>
        </div>

        {/* Sub-view switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          {(['month', 'week', 'day'] as const).map(sv => (
            <button
              key={sv}
              onClick={() => setSubView(sv)}
              className="px-4 py-1.5 rounded-md text-[12px] font-bold capitalize transition-all"
              style={{
                background: subView === sv ? '#2AB182' : 'transparent',
                color: subView === sv ? 'white' : 'var(--c-text-2)',
              }}
            >
              {sv}
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {subView === 'month' && (
          <MonthView
            tasks={tasks}
            googleEvents={googleEvents}
            currentDate={currentDate}
            onTaskClick={onTaskClick}
            onDayClick={handleDayClick}
          />
        )}
        {subView === 'week' && (
          <WeekView
            tasks={tasks}
            googleEvents={googleEvents}
            currentDate={currentDate}
            onTaskClick={onTaskClick}
            onDayClick={(d) => { setCurrentDate(d); setSubView('day'); }}
          />
        )}
        {subView === 'day' && (
          <DayView
            tasks={tasks}
            googleEvents={googleEvents}
            currentDate={currentDate}
            onTaskClick={onTaskClick}
          />
        )}
      </div>
    </div>
  );
}
