'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import { PRIORITY_CONFIG } from '@/lib/data';

export default function CalendarPage() {
  const { state } = useApp();
  const [calendarView, setCalendarView] = useState<'month' | 'year'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tasks = state.tasks;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h1 className="text-[28px] font-bold flex items-center gap-2" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>calendar_month</span> Master Calendar
        </h1>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-hidden rounded-xl shadow-sm bg-surface border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-text font-syne">
            {calendarView === 'month' 
              ? currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : currentMonth.getFullYear()
            }
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex bg-surface-2 rounded-lg p-1 border border-border">
              <button 
                onClick={() => setCalendarView('month')}
                className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all ${calendarView === 'month' ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}
              >Month</button>
              <button 
                onClick={() => setCalendarView('year')}
                className={`px-3 py-1.5 rounded text-[12px] font-bold transition-all ${calendarView === 'year' ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}
              >Year</button>
            </div>

            <div className="flex bg-surface-2 rounded-lg p-1 items-center border border-border">
              <button 
                onClick={() => setCurrentMonth(calendarView === 'month' 
                  ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  : new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1)
                )}
                className="px-2 hover:text-text transition-colors text-text-2 flex items-center"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button 
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 text-[12px] font-bold text-text-2 hover:text-text transition-colors"
              >
                Today
              </button>
              <button 
                onClick={() => setCurrentMonth(calendarView === 'month'
                  ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  : new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1)
                )}
                className="px-2 hover:text-text transition-colors text-text-2 flex items-center"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {calendarView === 'month' ? (
            <div className="grid grid-cols-7 gap-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-bold text-[12px] text-text-3 uppercase tracking-wider mb-2">{day}</div>
              ))}
              {Array.from({ length: 42 }).map((_, i) => {
                const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - firstDayOfMonth + 1);
                const dateStr = d.toISOString().split('T')[0];
                const dayTasks = tasks.filter(t => t.deadline && t.deadline.startsWith(dateStr));
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                
                return (
                  <div key={i} className={`min-h-[120px] p-2 rounded-lg border ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-surface-2'} ${!isCurrentMonth ? 'opacity-40' : ''}`}>
                    <div className={`text-[12px] font-bold mb-2 ${isToday ? 'text-primary' : 'text-text-2'}`}>{d.getDate()}</div>
                    <div className="flex flex-col gap-1.5">
                      {dayTasks.slice(0, 3).map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => setSelectedTaskId(t.id)}
                          className="text-[10px] font-semibold truncate p-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ background: PRIORITY_CONFIG[t.priority].bg, color: PRIORITY_CONFIG[t.priority].color }}
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] font-bold text-text-3 text-center mt-1">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-6 pb-4">
              {Array.from({ length: 12 }).map((_, i) => {
                const monthDate = new Date(currentMonth.getFullYear(), i, 1);
                const monthTasks = tasks.filter(t => t.deadline && new Date(t.deadline).getMonth() === i && new Date(t.deadline).getFullYear() === currentMonth.getFullYear());
                
                return (
                  <div 
                    key={i} 
                    onClick={() => {
                      setCurrentMonth(monthDate);
                      setCalendarView('month');
                    }}
                    className="p-5 rounded-xl border border-border bg-surface-2 hover:bg-[var(--c-hover)] cursor-pointer transition-colors flex flex-col h-[180px]"
                  >
                    <h4 className="text-[15px] font-bold text-text mb-3">{monthDate.toLocaleDateString('en-US', { month: 'long' })}</h4>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      {monthTasks.length > 0 ? (
                        <>
                          <span className="text-[40px] font-black text-primary font-syne leading-none mb-1">{monthTasks.length}</span>
                          <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Tasks Due</span>
                        </>
                      ) : (
                        <span className="text-[13px] font-semibold text-text-3">No tasks</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
