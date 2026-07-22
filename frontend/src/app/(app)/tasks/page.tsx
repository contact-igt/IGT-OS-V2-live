'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useApp } from '@/contexts/AppContext';
import TaskCard from '@/components/tasks/TaskCard';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import NewTaskModal from '@/components/tasks/NewTaskModal';
import RevertToTodoModal from '@/components/tasks/RevertToTodoModal';
import dynamic from 'next/dynamic';
const GanttView = dynamic(() => import('@/components/tasks/GanttView'), {
  loading: () => (
    <div className="flex items-center justify-center h-64 text-app-text2 text-sm animate-pulse">
      Loading Gantt chart...
    </div>
  ),
  ssr: false,
});
import { Task, STATUS_CONFIG, PRIORITY_CONFIG, getClientById, isOverdue, canApproveOrCompleteTask } from '@/lib/data';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const STATUSES: Task['status'][] = ['todo', 'in_progress', 'paused', 'in_review', 'blocked', 'done'];

function TasksPageInner() {
  const { state, setTaskStatus, updateTask, startTimer, requestStopTimer } = useApp();
  const searchParams = useSearchParams();
  const defaultView = (searchParams.get('view') as any) || 'board';
  const [view, setView] = useState<'board' | 'list' | 'calendar' | 'gantt' | 'team' | 'goals'>(defaultView);
  const [calendarView, setCalendarView] = useState<'month' | 'year'>('month');

  // Update view when URL changes
  useEffect(() => {
    const v = searchParams.get('view') as any;
    if (v) setView(v);
  }, [searchParams]);
  const [isBrowser, setIsBrowser] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    setIsBrowser(true);
  }, []);
  const [clientFilter, setClientFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  // Drill-down from the dashboard's Tasks Overview tiles (?status=active|due-today|overdue|in-review)
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatusFilter(s);
  }, [searchParams]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [revertTaskId, setRevertTaskId] = useState<string | null>(null);
  const [ganttModalDate, setGanttModalDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!ganttModalDate) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setGanttModalDate(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ganttModalDate]);

  // Sorting state for list view
  const [sortField, setSortField] = useState<'title'|'client'|'status'|'priority'|'deadline'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');

  const tasks = useMemo(() => state.tasks.filter(t => {
    // Exclude goals from standard views, only show in "goals" view
    if (view === 'goals' && t.type !== 'goal') return false;
    if (view !== 'goals' && t.type === 'goal') return false;

    if (clientFilter && t.clientId !== clientFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (memberFilter && !t.assignedTo.includes(memberFilter)) return false;

    if (statusFilter === 'active' && (t.status === 'done' || t.status === 'cancelled')) return false;
    if (statusFilter === 'overdue' && !isOverdue(t)) return false;
    if (statusFilter === 'in-review' && t.status !== 'in_review') return false;
    if (statusFilter === 'due-today') {
      if (!t.deadline) return false;
      const deadlineDate = new Date(t.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate.getTime() !== today.getTime()) return false;
    }

    // Role-based visibility
    const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
    if (currentUser) {
      const isLeadership = currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.roleTag === 'leadership';
      if (!isLeadership) {
        // Can see if assigned to themselves
        const isAssignedToMe = t.assignedTo.includes(currentUser.id) || t.createdBy === currentUser.id;
        // Can see if assigned to anyone in their department
        const isAssignedToDepartment = t.assignedTo.some(id => {
          const m = state.teamMembers.find(member => member.id === id);
          return m && m.department === currentUser.department;
        });
        
        if (!isAssignedToMe && !isAssignedToDepartment) {
          return false;
        }
      }
    }
    
    return true;
  }), [state.tasks, view, clientFilter, priorityFilter, memberFilter, statusFilter, state.currentUserId, state.teamMembers]);

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
    else if (sortField === 'priority') cmp = a.priority.localeCompare(b.priority);
    else if (sortField === 'deadline') {
      const da = a.deadline ? new Date(a.deadline).getTime() : 0;
      const db = b.deadline ? new Date(b.deadline).getTime() : 0;
      cmp = da - db;
    } else if (sortField === 'client') {
      const ca = getClientById(a.clientId)?.name || '';
      const cb = getClientById(b.clientId)?.name || '';
      cmp = ca.localeCompare(cb);
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  }), [tasks, sortField, sortOrder]);

  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const newStatus = destination.droppableId as Task['status'];
    const oldStatus = source.droppableId as Task['status'];
    
    const task = state.tasks.find(t => t.id === draggableId);
    const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
    const isLeadership = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.roleTag === 'leadership';
    
    // Prevent modifying tasks that user doesn't own unless they are leadership
    if (task && !isLeadership) {
      const isOwner = task.assignedTo.includes(state.currentUserId) || task.createdBy === state.currentUserId;
      if (!isOwner) {
        alert("You can only see this task. You do not have permission to modify it.");
        return;
      }
    }
    
    // Prevent dragging to Todo unless createdBy or leadership
    if (newStatus === 'todo' && oldStatus !== 'todo') {
      if (task && (task.createdBy === state.currentUserId || isLeadership)) {
        setRevertTaskId(draggableId);
      } else {
        alert("Only the task assigner can move a task back to Todo.");
      }
      return;
    }

    // Prevent dragging to Done from In Review unless task assigner, CEO, COO, or Operations
    if (newStatus === 'done' && oldStatus === 'in_review') {
      if (task && !canApproveOrCompleteTask(state, task, state.currentUserId)) {
        alert("Only the person who assigned this task, CEO, COO, or Operations can mark a task in review as Done.");
        return;
      }
    }
    
    if (['paused', 'blocked', 'in_review'].includes(newStatus)) {
      requestStopTimer(draggableId, newStatus as 'paused' | 'blocked' | 'in_review');
    } else {
      setTaskStatus(draggableId, newStatus);
      if (newStatus === 'in_progress') {
        startTimer(draggableId);
      }
    }
  }, [state.tasks, state.teamMembers, state.currentUserId, setTaskStatus, startTimer, requestStopTimer]);

  if (!isBrowser) return null; // Prevent hydration mismatch with DND

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h1 className="text-[28px] font-bold flex items-center gap-2" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
          <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: 32 }}>view_kanban</span> Task Board
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-2 rounded-lg p-1" style={{ border: '1px solid var(--c-border)', background: 'var(--c-surface-2)' }}>
            <button 
              onClick={() => setView('board')} 
              className="px-3 py-1.5 rounded text-[12px] font-bold transition-all flex items-center gap-1.5" 
              style={{ background: view === 'board' ? 'var(--c-surface)' : 'transparent', color: view === 'board' ? 'var(--c-text)' : 'var(--c-text-2)', boxShadow: view === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_column</span> Board
            </button>
            <button 
              onClick={() => setView('list')} 
              className="px-3 py-1.5 rounded text-[12px] font-bold transition-all flex items-center gap-1.5" 
              style={{ background: view === 'list' ? 'var(--c-surface)' : 'transparent', color: view === 'list' ? 'var(--c-text)' : 'var(--c-text-2)', boxShadow: view === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>list</span> List
            </button>
            <button 
              onClick={() => setView('calendar')} 
              className="px-3 py-1.5 rounded text-[12px] font-bold transition-all flex items-center gap-1.5" 
              style={{ background: view === 'calendar' ? 'var(--c-surface)' : 'transparent', color: view === 'calendar' ? 'var(--c-text)' : 'var(--c-text-2)', boxShadow: view === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_month</span> Calendar
            </button>
            <button 
              onClick={() => setView('gantt')} 
              className="px-3 py-1.5 rounded text-[12px] font-bold transition-all flex items-center gap-1.5" 
              style={{ background: view === 'gantt' ? 'var(--c-surface)' : 'transparent', color: view === 'gantt' ? 'var(--c-text)' : 'var(--c-text-2)', boxShadow: view === 'gantt' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_timeline</span> Gantt
            </button>
            <button 
              onClick={() => setView('goals')} 
              className="px-3 py-1.5 rounded text-[12px] font-bold transition-all flex items-center gap-1.5" 
              style={{ background: view === 'goals' ? 'var(--c-surface)' : 'transparent', color: view === 'goals' ? 'var(--c-text)' : 'var(--c-text-2)', boxShadow: view === 'goals' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>flag</span> Goals
            </button>

          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-5 flex-shrink-0">
        <select className="input-base font-semibold" style={{ width: 220, fontSize: '13px' }} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="">All Clients</option>
          {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input-base font-semibold" style={{ width: 180, fontSize: '13px' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {Object.keys(PRIORITY_CONFIG).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p as Task['priority']].label}</option>)}
        </select>
        <select className="input-base font-semibold" style={{ width: 180, fontSize: '13px' }} value={memberFilter} onChange={e => setMemberFilter(e.target.value)}>
          <option value="">All Team Members</option>
          {state.teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {statusFilter && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-primary/10 text-primary">
            {{ active: 'Active', 'due-today': 'Due Today', overdue: 'Overdue', 'in-review': 'In Review' }[statusFilter] || statusFilter}
            <button onClick={() => setStatusFilter('')} className="hover:opacity-70" aria-label="Clear status filter">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </span>
        )}
      </div>

      {/* Board View */}
      {view === 'board' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-5 flex-1 min-h-0 overflow-x-auto pb-4 custom-scrollbar">
            {STATUSES.map(s => {
              const sc = STATUS_CONFIG[s];
              const colTasks = tasks.filter(t => t.status === s);
              return (
                <div key={s} className="flex flex-col w-[340px] flex-shrink-0 rounded-2xl overflow-hidden h-full max-h-full" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-4" style={{ background: `${sc.color}15`, borderBottom: `1px solid ${sc.color}25` }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: sc.color }} />
                      <span className="font-bold text-[14px] uppercase tracking-wider" style={{ color: sc.color }}>{sc.label}</span>
                    </div>
                    <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full shadow-sm" style={{ background: 'var(--c-surface)', color: 'var(--c-text-2)' }}>{colTasks.length}</span>
                  </div>
                  {/* Tasks List */}
                  <Droppable droppableId={s}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 custom-scrollbar"
                      >
                        {colTasks.length === 0 && (
                          <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-60">
                            <span className="material-symbols-outlined text-[32px] text-text-3 mb-2">assignment_turned_in</span>
                            <span className="text-[13px] font-bold text-text-3">No tasks here</span>
                          </div>
                        )}
                        {colTasks.map((t, index) => (
                          <Draggable key={t.id} draggableId={t.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                }}
                              >
                                <TaskCard task={t} onClick={() => setSelectedTaskId(t.id)} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {s === 'todo' && (
                          <button 
                            onClick={() => setModalOpen(true)} 
                            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition-colors hover:bg-[var(--c-surface)] mt-2" 
                            style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-3)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> <span className="font-semibold text-[13px]">Add task</span>
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl shadow-sm custom-scrollbar" style={{ border: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
              <tr style={{ background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border)' }}>
                {[
                  { id: 'title', label: 'Task' },
                  { id: 'client', label: 'Client' },
                  { id: 'status', label: 'Status' },
                  { id: 'priority', label: 'Priority' },
                  { id: 'deadline', label: 'Deadline' }
                ].map(col => (
                  <th 
                    key={col.id}
                    onClick={() => {
                      if (sortField === col.id) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(col.id as any);
                        setSortOrder('asc');
                      }
                    }}
                    className="p-4 text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:bg-[var(--c-hover)] transition-colors select-none" 
                    style={{ color: 'var(--c-text-3)' }}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <span className="material-symbols-outlined text-[14px]" style={{ opacity: sortField === col.id ? 1 : 0.2 }}>
                        {sortField === col.id && sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map(t => {
                const client = getClientById(t.clientId);
                return (
                  <tr key={t.id} onClick={() => setSelectedTaskId(t.id)} className="cursor-pointer hover:bg-[var(--c-hover)] transition-colors border-b border-[var(--c-border)] group">
                    <td className="p-4 w-[40%]">
                      <p className="text-[14px] font-bold" style={{ color: t.status === 'done' ? 'var(--c-text-3)' : 'var(--c-text)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</p>
                    </td>
                    <td className="p-4 text-[13px] font-medium w-[15%]" style={{ color: 'var(--c-text-2)' }}>{client?.name}</td>
                    <td className="p-4 w-[15%]">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit" style={{ background: STATUS_CONFIG[t.status].bg, color: STATUS_CONFIG[t.status].color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[t.status].color }} />
                        {STATUS_CONFIG[t.status].label}
                      </span>
                    </td>
                    <td className="p-4 w-[15%]">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded w-fit inline-block" style={{ background: PRIORITY_CONFIG[t.priority].bg, color: PRIORITY_CONFIG[t.priority].color }}>{PRIORITY_CONFIG[t.priority].label.toUpperCase()}</span>
                    </td>
                    <td className="p-4 text-[13px] font-medium w-[15%]" style={{ color: 'var(--c-text-2)' }}>
                      {t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                );
              })}
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[14px]" style={{ color: 'var(--c-text-3)' }}>No tasks found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-hidden rounded-xl shadow-sm bg-surface border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-bold text-text font-syne">
              {calendarView === 'month' 
                ? currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : currentMonth.getFullYear()
              }
            </h3>
            <div className="flex items-center gap-4">
              {/* Toggle Month/Year */}
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

              {/* Navigation */}
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
                  onClick={() => {
                    setCurrentMonth(new Date());
                    setCalendarView('month');
                  }}
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
                {(() => {
                  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                  const now = new Date();
                  const todayCalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  return Array.from({ length: 42 }).map((_, i) => {
                    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - firstDayOfMonth + 1);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const dayTasks = tasks.filter(t => t.deadline && t.deadline.startsWith(dateStr));
                    const isToday = dateStr === todayCalStr;
                    const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                    return (
                      <div
                        key={i}
                        onClick={() => setGanttModalDate(d)}
                        className={`min-h-[120px] p-2 flex flex-col rounded-lg border cursor-pointer ${isToday ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-surface-2 hover:border-text-3 transition-colors'} ${!isCurrentMonth ? 'opacity-40' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className={`text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-text-2'}`}>
                            {d.getDate()}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          {dayTasks.slice(0, 3).map(t => (
                            <div
                              key={t.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedTaskId(t.id); }}
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
                  });
                })()}
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
      )}

      {/* Team View */}
      {view === 'team' && (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl shadow-sm custom-scrollbar" style={{ border: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
          {state.teamMembers.map(member => {
            const memberTasks = tasks.filter(t => t.assignedTo.includes(member.id));
            if (memberTasks.length === 0) return null;
            return (
              <div key={member.id} className="mb-4 last:mb-0 border-b border-app-border last:border-0 pb-4 last:pb-0">
                <div className="px-4 py-2 bg-surface-2 flex items-center gap-3 sticky top-0 z-10 border-b border-border">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ background: member.color }}>
                    {member.initials}
                  </div>
                  <span className="font-bold text-[14px] text-text">{member.name}</span>
                  <span className="text-[11px] font-bold bg-surface border border-border px-1.5 py-0.5 rounded text-text-2">{memberTasks.length} tasks</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--c-surface-3)', borderBottom: '1px solid var(--c-border)' }}>
                      <th className="p-2 px-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-3)' }}>Task</th>
                      <th className="p-2 px-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-3)' }}>Client</th>
                      <th className="p-2 px-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-3)' }}>Status</th>
                      <th className="p-2 px-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-3)' }}>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberTasks.map(t => {
                      const client = getClientById(t.clientId);
                      return (
                        <tr key={t.id} onClick={() => setSelectedTaskId(t.id)} className="cursor-pointer hover:bg-[var(--c-hover)] transition-colors border-b border-[var(--c-border)] group">
                          <td className="p-3 px-4">
                            <p className="text-[13px] font-bold" style={{ color: t.status === 'done' ? 'var(--c-text-3)' : 'var(--c-text)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</p>
                          </td>
                          <td className="p-3 px-4 text-[12px] font-medium" style={{ color: 'var(--c-text-2)' }}>{client?.name}</td>
                          <td className="p-3 px-4">
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit" style={{ background: STATUS_CONFIG[t.status].bg, color: STATUS_CONFIG[t.status].color }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[t.status].color }} />
                              {STATUS_CONFIG[t.status].label}
                            </span>
                          </td>
                          <td className="p-3 px-4 text-[12px] font-medium" style={{ color: 'var(--c-text-2)' }}>
                            {t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
          {state.teamMembers.every(m => tasks.filter(t => t.assignedTo.includes(m.id)).length === 0) && (
            <div className="p-8 text-center text-[14px]" style={{ color: 'var(--c-text-3)' }}>No tasks found for any team member.</div>
          )}
        </div>
      )}

      {/* Goals View */}
      {view === 'goals' && (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl shadow-sm custom-scrollbar" style={{ border: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--c-text)]">Project Goals</h2>
              <button 
                onClick={() => setModalOpen(true)} 
                className="flex items-center gap-2 bg-[var(--c-text)] text-[var(--c-surface)] px-4 py-2 rounded-xl font-semibold text-[13px] hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Create Goal
              </button>
            </div>
            
            {tasks.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-[var(--c-border)]">
                <span className="material-symbols-outlined text-[var(--c-text-3)] mb-2" style={{ fontSize: 32 }}>target</span>
                <p className="text-[var(--c-text-2)] font-medium text-[14px]">No goals found.</p>
                <p className="text-[var(--c-text-3)] text-[13px]">Create a task with "Goal" type to see it here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {tasks.map(t => {
                  const goalSubtasks = state.tasks.filter(st => st.parentId === t.id);
                  const totalSubtasks = goalSubtasks.length;
                  const completedSubtasks = goalSubtasks.filter(st => st.status === 'done').length;
                  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
                  
                  return (
                  <div key={t.id} className="p-5 rounded-xl border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[var(--c-text-3)]" style={{ fontSize: 24 }}>flag</span>
                        <h3 className="font-bold text-[16px] text-[var(--c-text)]">{t.title}</h3>
                      </div>
                      <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: STATUS_CONFIG[t.status].bg, color: STATUS_CONFIG[t.status].color }}>{STATUS_CONFIG[t.status].label}</span>
                    </div>
                    {t.description && <p className="text-[14px] text-[var(--c-text-2)] mb-4 ml-9">{t.description}</p>}
                    
                    {/* Progress Bar */}
                    <div className="mb-4 ml-9 max-w-md">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[12px] font-bold text-[var(--c-text-2)]">Project Progress</span>
                        <span className="text-[12px] font-bold text-[var(--c-text)]">{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--c-surface)] rounded-full overflow-hidden border border-[var(--c-border)]">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {totalSubtasks > 0 ? (
                        <div className="text-[11px] font-semibold text-[var(--c-text-3)] mt-1.5">
                          {completedSubtasks} of {totalSubtasks} tasks completed
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-[var(--c-text-3)] mt-1.5">
                          No subtasks assigned
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-[12px] font-bold text-[var(--c-text-3)] ml-9">
                      {t.deadline && (
                        <span className="flex items-center gap-1.5 bg-[var(--c-surface-3)] px-2.5 py-1 rounded-lg text-[var(--c-text-2)]">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
                          {new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {t.clientId && (() => {
                        const client = getClientById(t.clientId);
                        return client ? (
                          <span className="flex items-center gap-1.5 bg-[var(--c-surface-3)] px-2.5 py-1 rounded-lg text-[var(--c-text-2)]">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>domain</span>
                            {client.name}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="mt-5 ml-9 border-t border-[var(--c-border)] pt-4 flex justify-between items-center">
                      <div className="flex -space-x-2">
                         {t.assignedTo.map((memberId, i) => {
                           const member = state.teamMembers.find(m => m.id === memberId);
                           if (!member) return null;
                           return (
                             <div key={memberId} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2" style={{ background: 'var(--c-surface-3)', color: 'var(--c-text)', borderColor: 'var(--c-surface-2)', zIndex: 10 - i }}>
                               {member.initials}
                             </div>
                           );
                         })}
                      </div>
                      <button onClick={() => setSelectedTaskId(t.id)} className="text-[13px] font-bold bg-[var(--c-surface)] text-[var(--c-text)] px-4 py-1.5 rounded-lg border border-[var(--c-border)] hover:bg-[var(--c-surface-3)] transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gantt View */}
      {view === 'gantt' && (
        <GanttView 
          selectedTaskId={selectedTaskId}
          setSelectedTaskId={setSelectedTaskId}
          clientFilter={clientFilter}
          memberFilter={memberFilter}
          priorityFilter={priorityFilter}
        />
      )}

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
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>calendar_month</span>
                {ganttModalDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setGanttModalDate(null)}
                className="text-text-3 hover:text-text transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-hidden">
              <GanttView
                selectedTaskId={selectedTaskId}
                setSelectedTaskId={setSelectedTaskId}
                clientFilter={clientFilter}
                memberFilter={memberFilter}
                priorityFilter={priorityFilter}
                initialDate={ganttModalDate}
              />
            </div>
          </div>
        </div>
      )}

      <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      <NewTaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      <RevertToTodoModal taskId={revertTaskId} onClose={() => setRevertTaskId(null)} />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading tasks...</div>}>
      <TasksPageInner />
    </Suspense>
  );
}
