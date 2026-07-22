import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleCalendarEvents, GoogleEvent } from '@/lib/googleCalendar';
import { Task } from '@/lib/data';
import { GripVertical } from 'lucide-react';

export default function CalendarMiniWidget({
  activeTasks,
  setSelectedDate
}: {
  activeTasks: Task[],
  setSelectedDate: (d: Date) => void
}) {
  const { state, dispatch } = useApp();
  const { token } = useAuth();
  const [calendarWeeks, setCalendarWeeks] = useState(2);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      if (!token) return;
      setLoading(true);
      const minDate = new Date();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      const { events, connected } = await fetchGoogleCalendarEvents(token, minDate.toISOString(), maxDate.toISOString());
      dispatch({ type: 'SET_GOOGLE_EVENTS', payload: { events, connected } });
      setLoading(false);
    }
    loadEvents();
  }, [token, dispatch]);

  return (
    <>
      <div className="p-4 border-b border-app-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-app-surface rounded-t-xl">
        <div className="flex items-center gap-3">
          <GripVertical className="w-5 h-5 text-app-text3 cursor-grab hover:text-app-text" />
          <h3 className="text-lg font-bold text-app-text">Calendar Overview</h3>
        </div>
        <div className="flex bg-surface-2 p-1 rounded-lg border border-border">
          <button 
            onClick={() => setCalendarWeeks(1)}
            className={`px-3 py-1 rounded text-[11px] font-bold ${calendarWeeks === 1 ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}
          >1 Week</button>
          <button 
            onClick={() => setCalendarWeeks(2)}
            className={`px-3 py-1 rounded text-[11px] font-bold ${calendarWeeks === 2 ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}
          >2 Weeks</button>
          <button 
            onClick={() => setCalendarWeeks(4)}
            className={`px-3 py-1 rounded text-[11px] font-bold ${calendarWeeks === 4 ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'}`}
          >4 Weeks</button>
        </div>
      </div>
      <div className="p-4 bg-surface-2">
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-bold text-[12px] text-text-3 uppercase tracking-wider mb-2">{day}</div>
          ))}
          {Array.from({ length: calendarWeeks * 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - d.getDay() + i); 
            const dateStr = d.toISOString().split('T')[0];
            const dayTasks = activeTasks.filter(t => t.deadline && t.deadline.startsWith(dateStr));
            const dayEvents = state.googleEvents.filter(e => e.start.dateTime.startsWith(dateStr));
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            
            return (
              <div 
                key={i} 
                className={`min-h-[90px] flex flex-col p-2 rounded-lg border cursor-pointer hover:bg-app-hover transition-colors ${isToday ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-surface'}`}
                onClick={() => setSelectedDate(d)}
              >
                <div className={`text-[12px] font-bold mb-1 ${isToday ? 'text-primary' : 'text-text-2'}`}>{d.getDate()}</div>
                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                  
                  {/* Events */}
                  {dayEvents.slice(0, 2).map(evt => (
                    <div 
                      key={evt.id} 
                      className="text-[9px] font-bold truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(66, 133, 244, 0.15)', color: '#4285F4' }}
                      title={evt.summary}
                    >
                      {evt.summary}
                    </div>
                  ))}

                  {/* Tasks */}
                  {dayTasks.slice(0, Math.max(0, 3 - dayEvents.slice(0,2).length)).map(t => {
                    const primaryAssignee = state.teamMembers.find(m => t.assignedTo.includes(m.id));
                    const memberColor = primaryAssignee?.color || '#2AB182';
                    const client = state.clients.find(c => c.id === t.clientId);
                    const clientColor = client?.color || '#64748B';
                    return (
                      <div 
                        key={t.id} 
                        className="text-[9px] font-bold truncate pl-2 pr-1.5 py-0.5 rounded-r cursor-pointer hover:opacity-80 transition-opacity relative overflow-hidden"
                        style={{ 
                          background: t.status === 'done' ? 'transparent' : `${clientColor}18`,
                          borderLeft: `2.5px solid ${t.status === 'done' ? 'var(--c-border)' : memberColor}`,
                          color: t.status === 'done' ? 'var(--c-text-3)' : 'var(--c-text)',
                        }}
                        title={`${t.title} · ${primaryAssignee?.name || 'Unassigned'} · ${client?.name || ''}`}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                  
                  {(dayEvents.length + dayTasks.length) > 3 && (
                    <div className="text-[9px] font-medium text-text-3 pl-1">
                      +{(dayEvents.length + dayTasks.length) - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
