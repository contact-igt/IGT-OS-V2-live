'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import { TEAM_MEMBERS, Task } from '@/lib/data';

export default function TeamWorkloadPage() {
  const { state } = useApp();
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  
  // Group by department
  const departments = Array.from(new Set(TEAM_MEMBERS.map(m => m.department))).filter(Boolean);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const deptData = departments.map(dept => {
    // Get all members in this department
    const members = TEAM_MEMBERS.filter(m => m.department === dept);
    const memberIds = members.map(m => m.id);
    
    // Total weekly capacity = sum of weekly targets
    const totalCapacity = members.reduce((acc, m) => acc + m.weeklyTarget, 0);
    
    // Find tasks assigned to ANY member of this department
    const tasks = state.tasks.filter(t => 
      t.status !== 'done' && 
      t.assignedTo?.some(id => memberIds.includes(id))
    );
    
    // Active tasks = in_progress
    const activeTasks = tasks.filter(t => t.status === 'in_progress');
    
    // Overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      return new Date(t.deadline) < new Date(today.toDateString());
    });
    
    // Total estimated hours for active tasks
    const totalEstimated = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const totalLogged = Math.round(tasks.reduce((acc, t) => acc + (t.loggedMinutes || 0), 0) / 60);

    return {
      department: dept,
      members,
      tasks,
      activeTasks,
      overdueTasks,
      totalCapacity,
      totalEstimated,
      totalLogged
    };
  });

  return (
    <div className="flex flex-col gap-8 pb-10 relative">
      <div className="absolute top-0 right-1/4 w-1/3 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex justify-between items-end relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-text font-syne">Department Workload</h2>
          <p className="text-text-2 mt-1">High-level capacity and task overview by team.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
        {deptData.map(dept => (
          <div key={dept.department} className="card flex flex-col h-full bg-surface">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-2 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined font-bold">workspaces</span>
                </div>
                <div>
                  <h3 
                    onClick={() => setExpandedDept(expandedDept === dept.department ? null : dept.department)}
                    className="text-lg font-bold text-text uppercase tracking-wide cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {dept.department}
                    <span className="material-symbols-outlined text-[16px]">{expandedDept === dept.department ? 'expand_less' : 'expand_more'}</span>
                  </h3>
                  <button 
                    onClick={() => router.push(`/team?dept=${encodeURIComponent(dept.department)}`)}
                    className="text-[11px] text-primary font-mono hover:underline text-left"
                  >
                    View Directory &rarr;
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[18px] font-bold num ${dept.totalEstimated > dept.totalCapacity ? 'text-red-500' : 'text-primary'}`}>
                  {dept.totalEstimated}h / {dept.totalCapacity}h
                </span>
                <span className="text-[10px] uppercase font-bold text-text-3 tracking-wider">Allocated Capacity</span>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-5 flex-1 flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="flex-1 bg-surface-2 p-3 rounded-lg border border-border text-center">
                  <div className="text-[20px] font-bold text-text">{dept.activeTasks.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-text-3 font-bold mt-1">Active Tasks</div>
                </div>
                <div className="flex-1 bg-red-500/5 p-3 rounded-lg border border-red-500/20 text-center">
                  <div className="text-[20px] font-bold text-red-500">{dept.overdueTasks.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-red-500 font-bold mt-1">Overdue</div>
                </div>
              </div>
              
              {expandedDept === dept.department && (
                <div className="flex flex-col gap-3 mt-2 mb-2 animate-in slide-in-from-top-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-text-3">Member Split</h4>
                  {dept.members.map(member => {
                    const memberTasks = dept.tasks.filter(t => t.assignedTo?.includes(member.id));
                    const est = memberTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
                    const over = est > member.weeklyTarget;
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => router.push(`/team/${member.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ background: member.color }}>
                            {member.initials}
                          </div>
                          <div>
                            <div className="font-bold text-[13px] text-text">{member.name}</div>
                            <div className="text-[10px] text-text-3 font-mono">{memberTasks.length} active tasks</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-[13px] font-bold num ${over ? 'text-red-500' : 'text-primary'}`}>
                            {est}h / {member.weeklyTarget}h
                          </span>
                          <div className="w-24 h-1.5 bg-border rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-primary'}`} 
                              style={{ width: `${Math.min(100, (est / member.weeklyTarget) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-text-3 mb-3">Key Active Tasks</h4>
                <div className="flex flex-col gap-2">
                  {dept.activeTasks.length === 0 ? (
                    <div className="p-4 border border-dashed border-border rounded-lg text-center text-sm text-text-3">
                      No active tasks
                    </div>
                  ) : (
                    dept.activeTasks.slice(0, 5).map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTaskId(task.id)}
                        className="p-3 border border-border rounded-lg bg-surface hover:bg-surface-2 hover:border-primary/30 transition cursor-pointer group flex justify-between items-center"
                      >
                        <div className="truncate pr-4">
                          <div className="font-bold text-[13px] text-text group-hover:text-primary transition-colors truncate">{task.title}</div>
                          <div className="text-[11px] text-text-3 mt-1 font-mono">
                            {task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Deadline'} 
                            {' • '} {task.estimatedHours}h est.
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="material-symbols-outlined text-text-3 text-[16px] group-hover:text-primary">arrow_forward_ios</span>
                        </div>
                      </div>
                    ))
                  )}
                  {dept.activeTasks.length > 5 && (
                    <div className="text-center pt-2 text-[11px] font-bold text-text-3">
                      + {dept.activeTasks.length - 5} more tasks
                    </div>
                  )}
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
