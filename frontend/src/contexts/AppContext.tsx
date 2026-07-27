// @ts-nocheck
'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { useConfirm } from './ConfirmContext';
import {
  INITIAL_TASKS_FULL, SEED_TIME_ENTRIES_FULL, MEETING_NOTES_SEED,
  INITIAL_AUDIT_LOG_FULL,
  LEAVE_REQUESTS_FULL,
  ATTENDANCE_TODAY,
  MEETINGS_TODAY,
  MOCK_SAAS_METRICS,
} from '@/lib/seed_index';
import {
  Task, Client, TeamMember, AuditEntry, TaskApproval, ClientCredential, SocialMetric, Notification, TimeEntry,
  INITIAL_TASKS, CLIENTS, TEAM_MEMBERS, INITIAL_AUDIT_LOG, CREDENTIALS, SOCIAL_METRICS, SEED_TIME_ENTRIES,
  isOverdue, isDueToday, formatMinutes, canApproveOrCompleteTask, parseHexColor,
  type AttendanceLog, type AdAccountBalance, type GitHubDevActivity, type GitHubRepo,
  type Lead, type CampaignLog, type MeetingEvent,
  type PaymentRecord, type Campaign, type CampaignWeeklyLog2,
  type OpexExpense, type SaaSMetrics, type ProjectionMonth,
  type GitHubCommit, type AdRechargeEvent, type DevProject, type SocialAccount,
  SystemApproval, ExpenseClaim, JobPosting, Candidate, Timesheet
} from '@/lib/data';

import StopTimerModal from '@/components/tasks/StopTimerModal';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface ActiveTimer {
  taskId: string;
  userId: string;
  startedAt: number; // Date.now()
  accumulated: number; // previously accumulated minutes
}

export interface AppState {
  tasks: Task[];
  clients: Client[];
  teamMembers: TeamMember[];
  credentials: ClientCredential[];
  socialMetrics: SocialMetric[];
  socialAccounts: SocialAccount[];
  activeTimers: ActiveTimer[];
  auditLog: AuditEntry[];
  currentUserId: string;
  tickCount: number; // increments every second to trigger re-renders
  notifications: Notification[];
  timeEntries: TimeEntry[];
  meetingNotes: any[];
  leads: Lead[];
  leaveRequests: any[];
  campaignWeeklyLogs: CampaignLog[];
  attendanceLogs: AttendanceLog[];
  adAccountBalances: AdAccountBalance[];
  githubActivity: GitHubDevActivity[];
  githubRepos: GitHubRepo[];
  payments: PaymentRecord[];
  meetings: MeetingEvent[];
  approvals: SystemApproval[];
  expenseClaims: ExpenseClaim[];
  jobPostings: JobPosting[];
  candidates: Candidate[];
  timesheets: Timesheet[];
  deals: any[];
  campaigns: Campaign[];
  campaignLogs2: CampaignWeeklyLog2[];
  opexExpenses: OpexExpense[];
  saasMetrics: SaaSMetrics;
  projections: ProjectionMonth[];
  leaveLedger: any[];
  googleEvents: any[];
  isGoogleConnected: boolean;
  googleAccessToken?: string;
  stateVersion: number;
  githubCommits: GitHubCommit[];
  adRecharges: AdRechargeEvent[];
  devProjects: DevProject[];
  screenShareMode: boolean;
  isGlobalLoading: boolean;
  globalError: string | null;
}

type AppAction =
  | { type: 'CREATE_TASK'; payload: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'loggedMinutes'> }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: { id: string } }
  | { type: 'SET_TASK_STATUS'; payload: { id: string; status: Task['status']; actorId: string; note?: string } }
  | { type: 'START_TIMER'; payload: { taskId: string; userId: string } }
  | { type: 'STOP_TIMER'; payload: { taskId: string; userId: string } }
  | { type: 'TICK' }
  | { type: 'ADD_AUDIT'; payload: AuditEntry }
  | { type: 'ADD_MEETING_NOTE'; payload: any }
  | { type: 'LOG_TIME_MANUAL'; payload: { taskId: string; minutes: number; note: string; actorId: string; date?: string } }
  | { type: 'ADD_TEAM_MEMBER'; payload: Omit<TeamMember, 'id'> }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_TEAM_MEMBER'; payload: { id: string; updates: Partial<TeamMember> } }
  | { type: 'REQUEST_APPROVAL'; payload: { taskId: string; approver: string; approvalType: 'budget' | 'task_completion' | 'self_assignment' | 'time_log'; requestMessage?: string; requestedBy: string; meta?: any; } }
  | { type: 'RESOLVE_APPROVAL'; payload: { taskId: string; approvalId: string; status: 'approved' | 'rejected'; responseMessage?: string; } }
  | { type: 'ADD_REVIEW_COMMENT'; payload: { taskId: string; text: string; authorId: string } }
  | { type: 'HYDRATE_STATE'; payload: AppState }
  | { type: 'CREATE_NOTIFICATION'; payload: Omit<Notification, 'id' | 'createdAt' | 'read'> }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ'; payload: { userId: string } }
  | { type: 'MARK_NOTIFICATION_READ'; payload: { id: string } }
  | { type: 'CLEAR_ALL_NOTIFICATIONS'; payload: { userId: string } }
  | { type: 'SET_CURRENT_USER'; payload: { userId: string } }
  | { type: 'UPDATE_LEAD'; payload: Lead }
  | { type: 'ADD_LEAD'; payload: Lead }
  | { type: 'SET_SCREEN_SHARE_MODE'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'DECIDE_APPROVAL'; payload: { id: string; decision: 'approved' | 'rejected'; note?: string } }
  | { type: 'UPDATE_DEAL_STAGE'; payload: { id: string; stage: string } }
  | { type: 'CREATE_DEAL'; payload: any }
  | { type: 'SET_GOOGLE_EVENTS'; payload: { events: any[], connected?: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLOCK_IN'; payload: { userId: string; date: string; time: string; isLate?: boolean } }
  | { type: 'CLOCK_OUT'; payload: { userId: string; date: string; time: string } }
  | { type: 'START_BREAK'; payload: { userId: string; date: string; time: string } }
  | { type: 'END_BREAK'; payload: { userId: string; date: string; time: string } };

// ─────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────
const initialState: AppState = {
  tasks: [],
  clients: CLIENTS,
  teamMembers: TEAM_MEMBERS,
  credentials: [],
  socialMetrics: [],
  socialAccounts: [],
  activeTimers: [],
  auditLog: [],
  currentUserId: 'u1',
  tickCount: 0,
  notifications: [],
  timeEntries: [],
  meetingNotes: [],
  leads: [],
  leaveRequests: [],
  campaignWeeklyLogs: [],
  attendanceLogs: [],
  adAccountBalances: [],
  githubActivity: [],
  githubRepos: [],
  payments: [],
  meetings: [],
  campaigns: [], // fetched
  campaignLogs2: [],
  opexExpenses: [],
  saasMetrics: { currentMRR: 0, targetMRR: 0, clientsByPlan: [], monthlyHistory: [] },
  projections: [],
  leaveLedger: [],
  googleEvents: [],
  isGoogleConnected: false,
  stateVersion: 12,
  githubCommits: [],
  adRecharges: [],
  devProjects: [],
  screenShareMode: false,
  approvals: [],
  expenseClaims: [],
  jobPostings: [],
  candidates: [],
  timesheets: [],
  deals: [],
  isGlobalLoading: false,
  globalError: null,
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function makeAuditId() { return `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }
function makeTaskId() { return `TSK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }

function addAudit(log: AuditEntry[], entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry[] {
  return [
    { id: makeAuditId(), timestamp: new Date().toISOString(), ...entry },
    ...log,
  ];
}

function getActorName(state: AppState, actorId: string): string {
  return state.teamMembers.find(m => m.id === actorId)?.name ?? 'Unknown';
}

function getClientName(state: AppState, clientId: string): string {
  return state.clients.find(c => c.id === clientId)?.name ?? '—';
}

// Only the head(s) of the departments a task's own assignees belong to — not every
// department head company-wide. A Design task's status change/comment should reach the
// Design head, not the Video/Dev/Sales/Ops heads too.
function getTaskDepartmentHeadIds(state: AppState, task: Task): string[] {
  const assigneeDepts = new Set(
    task.assignedTo
      .map(id => state.teamMembers.find(m => m.id === id)?.department)
      .filter((d): d is string => !!d)
  );
  return state.teamMembers
    .filter(m => m.isHeadOfDepartment && m.department && assigneeDepts.has(m.department))
    .map(m => m.id);
}

// ─────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case 'SET_CURRENT_USER': {
      return { ...state, currentUserId: action.payload.userId };
    }

    case 'CREATE_TASK': {
      const newTask: Task = {
        ...action.payload,
        id: action.payload.id || makeTaskId(),
        loggedMinutes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newNotifications = [...state.notifications];
      const assignees = action.payload.assignedTo || [];
      assignees.forEach((userId: string) => {
        newNotifications.push({
          id: `NOTIF-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          actorId: action.payload.createdBy || 'system',
          type: 'assignment',
          taskId: newTask.id,
          message: `You have been assigned a new task: ${newTask.title}`,
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      // No audit entry here — see createTask's success handler, which logs it once the
      // real backend id is known, instead of stamping it with newTask.id's temporary local
      // id (which would persist wrong forever, since nothing could ever correct it reliably —
      // the entry gets written to the backend before the id-swap has any chance to run).
      return {
        ...state,
        tasks: [newTask, ...state.tasks],
        notifications: newNotifications,
      };
    }

    case 'UPDATE_TASK': {
      const task = state.tasks.find(t => t.id === action.payload.id);
      if (!task) return state;
      
      let newAuditLog = state.auditLog;
      const actor = getActorName(state, state.currentUserId);
      const clientName = getClientName(state, task.clientId);
      const updates = action.payload.updates;

      if (updates.priority && updates.priority !== task.priority) {
        newAuditLog = addAudit(newAuditLog, { actor, actorId: state.currentUserId, action: 'task_priority_change', entity: 'Task', entityRef: task.title, entityId: task.id, clientName, meta: `${task.priority} → ${updates.priority}` });
      }
      if (updates.deadline !== undefined && updates.deadline !== task.deadline) {
        newAuditLog = addAudit(newAuditLog, { actor, actorId: state.currentUserId, action: 'task_deadline_change', entity: 'Task', entityRef: task.title, entityId: task.id, clientName, meta: `Deadline updated` });
      }
      
      const prevAssignees = task.assignedTo || [];
      const newAssignees = updates.assignedTo || [];
      const addedAssignees = newAssignees.filter(uId => !prevAssignees.includes(uId));
      
      const newNotifications = [...state.notifications];
      addedAssignees.forEach((userId: string) => {
        newNotifications.push({
          id: `NOTIF-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          actorId: state.currentUserId || 'system',
          type: 'assignment',
          taskId: task.id,
          message: `You have been assigned to task: ${task.title}`,
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      if (updates.assignedTo !== undefined && JSON.stringify(updates.assignedTo) !== JSON.stringify(task.assignedTo)) {
        newAuditLog = addAudit(newAuditLog, { actor, actorId: state.currentUserId, action: 'task_assign_change', entity: 'Task', entityRef: task.title, entityId: task.id, clientName, meta: `Assignees updated` });
      }

      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id
            ? { ...t, ...updates, updatedAt: new Date().toISOString() }
            : t
        ),
        notifications: newNotifications,
        auditLog: newAuditLog,
      };
    }

    case 'DELETE_TASK': {
      const taskToDelete = state.tasks.find(t => t.id === action.payload.id);
      if (!taskToDelete) return state;

      const actor = getActorName(state, state.currentUserId);
      const clientName = getClientName(state, taskToDelete.clientId);
      const newAuditLog = addAudit(state.auditLog, {
        actor, actorId: state.currentUserId, action: 'task_deleted', entity: 'Task', entityRef: taskToDelete.title, entityId: taskToDelete.id, clientName, meta: `Task permanently deleted`
      });

      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload.id),
        auditLog: newAuditLog,
      };
    }

    case 'SET_TASK_STATUS': {
      const task = state.tasks.find(t => t.id === action.payload.id);
      if (!task) return state;
      const prevStatus = task.status;

      // Enforcement: Only assigner or admin can move a task back to Todo, UNLESS it's just stopping an in_progress task
      if (action.payload.status === 'todo' && prevStatus !== 'todo' && prevStatus !== 'in_progress') {
        const currentUser = state.teamMembers.find(m => m.id === action.payload.actorId);
        const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'ops';
        if (task.createdBy !== action.payload.actorId && !isAdmin) {
          console.warn("Unauthorized: Only the task assigner or admin can move a task back to Todo.");
          return state;
        }
      }

      // Enforcement: Tasks in "In Review" can only be approved/marked Done by task assigner, CEO, COO, or Operations
      if (action.payload.status === 'done' && prevStatus === 'in_review') {
        if (!canApproveOrCompleteTask(state, task, action.payload.actorId)) {
          console.warn("Unauthorized: Only the task assigner, CEO, COO, or Operations can mark a task in review as Done.");
          return state;
        }
      }

      const actor = getActorName(state, action.payload.actorId);
      const clientName = getClientName(state, task.clientId);
      
      const timers = [...state.activeTimers];
      let updatedLoggedMinutes = task.loggedMinutes;
      let auditEntries = state.auditLog;
      const newTimeEntries = [...state.timeEntries];
      const newNotifications = [...state.notifications];
      const now = Date.now();

      if (['paused', 'blocked', 'in_review', 'done'].includes(action.payload.status) && prevStatus !== action.payload.status) {
        const targets = new Set<string>();
        if (task.createdBy !== action.payload.actorId) targets.add(task.createdBy);
        const ceoId = state.teamMembers.find(m => m.role === 'super_admin')?.id;
        if (ceoId && ceoId !== action.payload.actorId) targets.add(ceoId);
        getTaskDepartmentHeadIds(state, task).filter(id => id !== action.payload.actorId).forEach(id => targets.add(id));

        // Extract mentions
        if (action.payload.note) {
          state.teamMembers.forEach(m => {
            if (action.payload.note!.includes(`@${m.name}`) || action.payload.note!.includes(`@${m.name.split(' ')[0]}`)) {
              targets.add(m.id);
            }
          });
        }
        
        targets.forEach(userId => {
          newNotifications.push({
            id: `NOTIF-${crypto.randomUUID().slice(0, 8)}`,
            userId,
            actorId: action.payload.actorId,
            type: 'status_change',
            taskId: task.id,
            message: `Task moved to ${action.payload.status}${action.payload.note ? `: ${action.payload.note}` : ''}`,
            read: false,
            createdAt: new Date().toISOString()
          });
        });
      }
      
      // Auto-timer logic
      if (action.payload.status === 'in_progress' && prevStatus !== 'in_progress') {
        // Start timer if not running
        if (!timers.find(t => t.taskId === task.id)) {
          timers.push({ taskId: task.id, userId: action.payload.actorId, startedAt: now, accumulated: task.loggedMinutes });
          auditEntries = addAudit(auditEntries, {
            actor, actorId: action.payload.actorId, action: 'timer_start', entity: 'Task', entityRef: task.title, entityId: task.id, clientName, meta: 'Timer auto-started'
          });
        }
      } else if (action.payload.status !== 'in_progress') {
        // Stop timer
        const timerIndex = timers.findIndex(t => t.taskId === task.id);
        if (timerIndex !== -1) {
          const timer = timers[timerIndex];
          const elapsed = Math.floor((now - timer.startedAt) / 60000);
          updatedLoggedMinutes = timer.accumulated + elapsed;
          timers.splice(timerIndex, 1);
          newTimeEntries.push({
            id: crypto.randomUUID(),
            taskId: task.id,
            userId: action.payload.actorId,
            startedAt: new Date(timer.startedAt).toISOString(),
            endedAt: new Date().toISOString(),
            minutes: elapsed,
            source: 'timer',
            note: action.payload.note
          });
          auditEntries = addAudit(auditEntries, {
            actor, actorId: action.payload.actorId, action: 'timer_stop', entity: 'Task', entityRef: task.title, entityId: task.id, clientName, meta: `Auto-stopped: ${formatMinutes(elapsed)}`
          });
        }
      }
      
      // Add the status change audit log — only for an actual change. Without this guard,
      // any repeated dispatch of the same status (a duplicate click, a retried request, a
      // stray effect re-firing) silently piles up duplicate entries forever, since nothing
      // else in this reducer path checks for a genuine transition before logging.
      if (prevStatus !== action.payload.status) {
        auditEntries = addAudit(auditEntries, {
          actor,
          actorId: action.payload.actorId,
          action: 'task_status_change',
          entity: 'Task',
          entityRef: task.title,
          entityId: task.id,
          clientName,
          meta: `${prevStatus} → ${action.payload.status}`,
        });
      }

      let newCompletedAt = task.completedAt;
      let newCompletedBy = task.completedBy;
      if (action.payload.status === 'done' && prevStatus !== 'done') {
        newCompletedAt = new Date().toISOString();
        newCompletedBy = action.payload.actorId;
      } else if (action.payload.status !== 'done' && prevStatus === 'done') {
        newCompletedAt = undefined;
        newCompletedBy = undefined;
      }

      return {
        ...state,
        activeTimers: timers,
        timeEntries: newTimeEntries,
        notifications: newNotifications,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id
            ? { ...t, status: action.payload.status, loggedMinutes: updatedLoggedMinutes, updatedAt: new Date(now).toISOString(), completedAt: newCompletedAt, completedBy: newCompletedBy }
            : t
        ),
        auditLog: auditEntries,
      };
    }

    case 'START_TIMER': {
      const { taskId, userId } = action.payload;
      // If timer already running for this task, no-op
      if (state.activeTimers.find(t => t.taskId === taskId)) return state;
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return state;
      const actor = getActorName(state, userId);
      const clientName = getClientName(state, task.clientId);
      return {
        ...state,
        activeTimers: [
          ...state.activeTimers,
          { taskId, userId, startedAt: Date.now(), accumulated: task.loggedMinutes },
        ],
        auditLog: addAudit(state.auditLog, {
          actor,
          actorId: userId,
          action: 'timer_start',
          entity: 'Task',
          entityRef: task.title,
          entityId: task.id,
          clientName,
          meta: 'Timer started',
        }),
      };
    }

    case 'STOP_TIMER': {
      const { taskId, userId } = action.payload;
      const timer = state.activeTimers.find(t => t.taskId === taskId);
      if (!timer) return state;
      const elapsedMinutes = Math.floor((Date.now() - timer.startedAt) / 60000);
      const totalMinutes = timer.accumulated + elapsedMinutes;
      const task = state.tasks.find(t => t.id === taskId);
      const actor = getActorName(state, userId);
      const clientName = task ? getClientName(state, task.clientId) : '—';
      const newEntry: TimeEntry = {
        id: crypto.randomUUID(),
        taskId,
        userId,
        startedAt: new Date(timer.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        minutes: elapsedMinutes,
        source: 'timer'
      };
      return {
        ...state,
        timeEntries: [...state.timeEntries, newEntry],
        activeTimers: state.activeTimers.filter(t => t.taskId !== taskId),
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? { ...t, loggedMinutes: totalMinutes, updatedAt: new Date().toISOString() }
            : t
        ),
        auditLog: addAudit(state.auditLog, {
          actor,
          actorId: userId,
          action: 'timer_stop',
          entity: 'Task',
          entityRef: task?.title ?? taskId,
          entityId: taskId,
          clientName,
          meta: `Duration: ${formatMinutes(elapsedMinutes)}`,
        }),
      };
    }

    case 'LOG_TIME_MANUAL': {
      const { taskId, minutes, actorId } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return state;
      const actor = getActorName(state, actorId);
      const clientName = getClientName(state, task.clientId);
      const dt = action.payload.date ? new Date(action.payload.date) : new Date();
      const newEntry: TimeEntry = {
        id: crypto.randomUUID(),
        taskId,
        userId: actorId,
        startedAt: dt.toISOString(),
        endedAt: dt.toISOString(),
        minutes: minutes,
        source: 'manual',
        note: action.payload.note
      };
      return {
        ...state,
        timeEntries: [...state.timeEntries, newEntry],
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? { ...t, loggedMinutes: t.loggedMinutes + minutes, updatedAt: new Date().toISOString() }
            : t
        ),
        auditLog: addAudit(state.auditLog, {
          actor,
          actorId,
          action: 'time_logged',
          entity: 'Task',
          entityRef: task.title,
          entityId: task.id,
          clientName,
          meta: `Manual: ${formatMinutes(minutes)}`,
        }),
      };
    }

    case 'ADD_AUDIT': {
      return { ...state, auditLog: [action.payload, ...state.auditLog] };
    }

    case 'ADD_MEETING_NOTE': {
      // Re-analyzing the same calendar event upserts the same backend row (same id) — replace
      // the existing entry in place instead of prepending a duplicate.
      const existingIdx = state.meetingNotes.findIndex((n: any) => n.id === action.payload.id);
      if (existingIdx !== -1) {
        const updated = [...state.meetingNotes];
        updated[existingIdx] = action.payload;
        return { ...state, meetingNotes: updated };
      }
      return { ...state, meetingNotes: [action.payload, ...state.meetingNotes] };
    }


    case 'ADD_CLIENT': {
      return { ...state, clients: [...state.clients, action.payload] };
    }

    case 'ADD_TEAM_MEMBER': {
      const newMember: TeamMember = {
        ...action.payload,
        id: `u${crypto.randomUUID().slice(0, 8)}`,
      };
      return { ...state, teamMembers: [...state.teamMembers, newMember] };
    }

    case 'UPDATE_TEAM_MEMBER': {
      const updatedMembers = state.teamMembers.map(m =>
        m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
      );
      if (typeof window !== 'undefined' && action.payload.updates.color) {
        try {
          const stored = localStorage.getItem('igt_team_member_colors');
          const map = stored ? JSON.parse(stored) : {};
          map[action.payload.id] = action.payload.updates.color;
          const target = state.teamMembers.find(m => m.id === action.payload.id);
          if (target?.email) map[target.email.toLowerCase()] = action.payload.updates.color;
          localStorage.setItem('igt_team_member_colors', JSON.stringify(map));
        } catch (e) {}
      }
      return {
        ...state,
        teamMembers: updatedMembers,
      };
    }

    case 'UPDATE_LEAD': {
      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === action.payload.id ? action.payload : l
        ),
      };
    }

    case 'ADD_LEAD': {
      return {
        ...state,
        leads: [action.payload, ...state.leads],
      };
    }

    case 'REQUEST_APPROVAL': {
      const { taskId, approver, approvalType, requestMessage, requestedBy, meta } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id === taskId) {
            const newApproval: TaskApproval = {
              id: `app_${Math.random().toString(36).substr(2, 9)}`,
              requestedBy,
              approver,
              type: approvalType,
              status: 'pending',
              requestMessage,
              meta
            };
            return { ...t, approvals: [...(t.approvals || []), newApproval], updatedAt: new Date().toISOString() };
          }
          return t;
        })
      };
    }

    case 'RESOLVE_APPROVAL': {
      const { taskId, approvalId, status, responseMessage } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      const actor = getActorName(state, state.currentUserId);
      const clientName = getClientName(state, task?.clientId || '');

      const approval = task?.approvals?.find(a => a.id === approvalId);
      
      let nextState = { ...state };
      
      nextState.tasks = nextState.tasks.map(t => {
        if (t.id === taskId) {
          const updatedApprovals = (t.approvals || []).map(app => 
            app.id === approvalId ? { ...app, status, responseMessage } : app
          );
          let extraUpdates = {};
          if (status === 'approved' && approval?.type === 'time_log' && approval.meta?.minutes) {
             extraUpdates = { loggedMinutes: t.loggedMinutes + approval.meta.minutes };
          }
          return { ...t, ...extraUpdates, approvals: updatedApprovals, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      
      if (status === 'approved' && approval?.type === 'time_log' && approval.meta?.minutes) {
        const dt = new Date();
        const newEntry: TimeEntry = {
          id: crypto.randomUUID(),
          taskId,
          userId: approval.requestedBy,
          startedAt: dt.toISOString(),
          endedAt: dt.toISOString(),
          minutes: approval.meta.minutes,
          source: 'manual',
          note: approval.meta.note || ''
        };
        nextState.timeEntries = [...nextState.timeEntries, newEntry];
      }
      
      nextState.auditLog = addAudit(nextState.auditLog, {
        actor,
        actorId: state.currentUserId,
        action: `approval_${status}`,
        entity: 'Task',
        entityRef: task?.title || 'Unknown Task',
        entityId: taskId,
        clientName,
        meta: `Approval ${status}${responseMessage ? `: ${responseMessage}` : ''}`,
      });
      
      return nextState;
    }

    case 'DECIDE_APPROVAL': {
      const idx = state.approvals.findIndex(a => a.id === action.payload.id);
      if (idx === -1) return state;
      const updated = [...state.approvals];
      updated[idx] = { 
        ...updated[idx], 
        status: action.payload.decision, 
        decidedAt: new Date().toISOString(),
        decisionNote: action.payload.note
      };
      return { ...state, approvals: updated };
    }

    case 'UPDATE_DEAL_STAGE': {
      return {
        ...state,
        deals: state.deals.map(d => d.id === action.payload.id ? { ...d, stage: action.payload.stage } : d)
      };
    }

    case 'CREATE_DEAL': {
      return {
        ...state,
        deals: [...state.deals, { ...action.payload, id: `deal_${Date.now()}` }]
      };
    }

    case 'ADD_REVIEW_COMMENT': {
      const { taskId, text, authorId } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return state;
      
      const actor = getActorName(state, authorId);
      const clientName = getClientName(state, task.clientId);
      
      // Extract mentions
      const targets = new Set<string>();
      if (task.createdBy !== authorId) targets.add(task.createdBy);
      const ceoId = state.teamMembers.find(m => m.role === 'super_admin')?.id;
      if (ceoId && ceoId !== authorId) targets.add(ceoId);
      getTaskDepartmentHeadIds(state, task).filter(id => id !== authorId).forEach(id => targets.add(id));
      
      state.teamMembers.forEach(m => {
        if (text.includes(`@${m.name}`) || text.includes(`@${m.name.split(' ')[0]}`)) {
          targets.add(m.id);
        }
      });
      
      const newNotifications = [...state.notifications];
      targets.forEach(userId => {
        newNotifications.push({
          id: `NOTIF-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          actorId: authorId,
          type: 'mention',
          taskId: task.id,
          message: `Commented: ${text}`,
          read: false,
          createdAt: new Date().toISOString()
        });
      });
      
      return {
        ...state,
        notifications: newNotifications,
        auditLog: addAudit(state.auditLog, {
          actor,
          actorId: authorId,
          action: 'commented',
          entity: 'Task',
          entityRef: task.title,
          entityId: task.id,
          clientName,
          meta: text,
        })
      };
    }

    case 'TICK': {
      return state; // Deprecated. No longer re-renders the whole app.
    }
    
    
        case 'SET_LOADING':
      return { ...state, isGlobalLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, globalError: action.payload, isGlobalLoading: false };
    case 'SET_SCREEN_SHARE_MODE':
      return { ...state, screenShareMode: action.payload };
    case 'CREATE_NOTIFICATION':
      return { ...state, notifications: [ { id: `NOTIF-${crypto.randomUUID().slice(0, 8)}`, createdAt: new Date().toISOString(), read: false, ...action.payload }, ...state.notifications ] };
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload.id ? { ...n, read: true } : n) };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.userId === action.payload.userId ? { ...n, read: true } : n)
      };

    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.userId !== action.payload.userId)
      };

    case 'HYDRATE_STATE': {
      const payloadTasks = Array.isArray(action.payload.tasks) ? action.payload.tasks.map((t: any) => ({ ...t, assignedTo: t.assignedTo || [] })) : undefined;
      const payloadToMerge: any = { ...action.payload };
      if (payloadTasks) {
        payloadToMerge.tasks = payloadTasks;
      } else if (action.payload.tasks && !Array.isArray(action.payload.tasks)) {
        delete payloadToMerge.tasks;
      }
      if (action.payload.teamMembers && !Array.isArray(action.payload.teamMembers)) delete payloadToMerge.teamMembers;
      if (action.payload.clients && !Array.isArray(action.payload.clients)) delete payloadToMerge.clients;
      if (action.payload.campaigns && !Array.isArray(action.payload.campaigns)) delete payloadToMerge.campaigns;
      
      const migratedState = { ...state, ...payloadToMerge };
      if (!migratedState.stateVersion || migratedState.stateVersion < 12) {
        migratedState.stateVersion = 12;
        migratedState.teamMembers = initialState.teamMembers;
        // IMPORTANT: wipe all seed/dummy data so app starts clean
        migratedState.tasks = [];
        migratedState.timeEntries = [];
        migratedState.auditLog = [];
        migratedState.attendanceLogs = []; // clear old corrupted attendance data
        migratedState.adAccountBalances = initialState.adAccountBalances;
        migratedState.githubActivity = initialState.githubActivity;
        migratedState.githubRepos = initialState.githubRepos;
        migratedState.payments = initialState.payments;
        migratedState.meetings = initialState.meetings;
        migratedState.leads = initialState.leads;
        migratedState.campaignWeeklyLogs = initialState.campaignWeeklyLogs;
        migratedState.campaignLogs2 = initialState.campaignLogs2;
        migratedState.opexExpenses = initialState.opexExpenses;
        migratedState.saasMetrics = initialState.saasMetrics;
        migratedState.projections = initialState.projections;
        migratedState.leaveLedger = initialState.leaveLedger;
        migratedState.googleEvents = initialState.googleEvents;
        migratedState.isGoogleConnected = initialState.isGoogleConnected;
        migratedState.githubCommits = initialState.githubCommits;
        migratedState.adRecharges = initialState.adRecharges;
        migratedState.devProjects = initialState.devProjects;

        // Add synthetic time entries for tasks
        const synthEntries: TimeEntry[] = [];
        migratedState.tasks = migratedState.tasks.map((t: Task) => {
          const mt = { ...t };
          if (mt.loggedMinutes > 0) {
            synthEntries.push({
              id: crypto.randomUUID(), taskId: mt.id, userId: mt.assignedTo[0] || mt.createdBy,
              startedAt: mt.updatedAt, endedAt: mt.updatedAt, minutes: mt.loggedMinutes, source: 'manual', migrated: true
            });
          }
          if (mt.status === 'done' && !mt.completedAt) mt.completedAt = mt.updatedAt;
          return mt;
        });
        migratedState.timeEntries = synthEntries;
        migratedState.notifications = [];
      }
      return { 
        ...initialState, 
        ...migratedState,
        tasks: migratedState.tasks || initialState.tasks,
        clients: action.payload.clients || initialState.clients,
        teamMembers: migratedState.teamMembers || initialState.teamMembers,
        activeTimers: action.payload.activeTimers || initialState.activeTimers,
        auditLog: action.payload.auditLog || initialState.auditLog,
        meetingNotes: action.payload.meetingNotes || initialState.meetingNotes,
        credentials: action.payload.credentials || initialState.credentials,
        socialMetrics: action.payload.socialMetrics || initialState.socialMetrics,
        githubCommits: action.payload.githubCommits || initialState.githubCommits,
        adRecharges: action.payload.adRecharges || initialState.adRecharges,
        devProjects: action.payload.devProjects || initialState.devProjects
      };
    }

    case 'CLOCK_IN': {
      const { userId, date, time, isLate } = action.payload;
      const actor = getActorName(state, userId);
      const newAttendanceLogs = [...state.attendanceLogs];
      const todaysLogs = newAttendanceLogs.filter(l => l.userId === userId && l.date === date);
      const openSession = todaysLogs.find(l => !l.clockOut);
      if (!openSession) {
        // Most recent closed session today (if any) — used to flag a late return from a break.
        const lastClosed = [...todaysLogs].sort((a, b) => new Date(b.clockIn!).getTime() - new Date(a.clockIn!).getTime())[0];
        const lateReturn = !!lastClosed?.clockOut && (new Date(time).getTime() - new Date(lastClosed.clockOut).getTime()) / 60000 > 60;
        newAttendanceLogs.push({ userId, date, clockIn: time, clockOut: null, totalMinutes: 0, status: isLate ? 'late' : 'present', lateReturn });
      }
      return {
        ...state,
        attendanceLogs: newAttendanceLogs,
        auditLog: addAudit(state.auditLog, { actor, actorId: userId, action: 'clock_in', entity: 'Attendance', entityRef: date, clientName: '—', meta: 'User clocked in' })
      };
    }

    case 'CLOCK_OUT': {
      const { userId, date, time } = action.payload;
      const actor = getActorName(state, userId);
      const newAttendanceLogs = state.attendanceLogs.map(l => {
        if (l.userId === userId && l.date === date && !l.clockOut) {
          const breaks = (l.breaks || []).map(b => !b.breakEnd ? { ...b, breakEnd: time } : b);
          return { ...l, clockOut: time, breaks, isOnBreak: false };
        }
        return l;
      });

      const h = new Date(time).getHours();
      let newNotifications = [...state.notifications];
      if (h >= 9 && h < 18) {
        newNotifications.push({ id: `NOTIF-${crypto.randomUUID().slice(0, 8)}`, userId, actorId: 'system', type: 'status_change', taskId: 'system', message: 'Warning: You have been clocked out before 6 PM. A Google Chat notification has been sent.', read: false, createdAt: new Date().toISOString() });
      }

      return {
        ...state,
        attendanceLogs: newAttendanceLogs,
        notifications: newNotifications,
        auditLog: addAudit(state.auditLog, { actor, actorId: userId, action: 'clock_out', entity: 'Attendance', entityRef: date, clientName: '—', meta: 'User clocked out' })
      };
    }

    case 'START_BREAK': {
      const { userId, date, time } = action.payload;
      const newAttendanceLogs = state.attendanceLogs.map(l => {
        if (l.userId === userId && l.date === date && !l.clockOut) {
          const breaks = l.breaks ? [...l.breaks] : [];
          breaks.push({ id: `break-${Date.now()}`, breakStart: time, breakEnd: null });
          return { ...l, breaks, isOnBreak: true };
        }
        return l;
      });
      return {
        ...state,
        attendanceLogs: newAttendanceLogs
      };
    }

    case 'END_BREAK': {
      const { userId, date, time } = action.payload;
      const newAttendanceLogs = state.attendanceLogs.map(l => {
        if (l.userId === userId && l.date === date && !l.clockOut) {
          const breaks = (l.breaks || []).map(b => !b.breakEnd ? { ...b, breakEnd: time } : b);
          return { ...l, breaks, isOnBreak: false };
        }
        return l;
      });
      return {
        ...state,
        attendanceLogs: newAttendanceLogs
      };
    }

    // Was previously undispatched entirely — declared in the action union and dispatched
    // from the Calendar page, but with no matching case here it silently fell through to
    // `default` and never actually updated state, so real events could never render.
    case 'SET_GOOGLE_EVENTS': {
      return {
        ...state,
        googleEvents: action.payload.events,
        isGoogleConnected: action.payload.connected !== undefined ? action.payload.connected : state.isGoogleConnected,
      };
    }

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  decideApproval: (id: string, decision: 'approved' | 'rejected', note?: string) => void;
  updateDealStage: (id: string, stage: string) => void;
  createDeal: (deal: any) => void;
  saveMeetingNote: (note: any) => Promise<string | null>;
  // Convenience computed
  activeTasks: Task[];
  overdueTasks: Task[];
  todayTasks: Task[];
  getTimerElapsed: (taskId: string) => number; // seconds
  getTaskLoggedMinutes: (taskId: string) => number;
  isTimerRunning: (taskId: string) => boolean;
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void; // Immediate stop
  requestStopTimer: (taskId: string, targetStatus?: 'paused' | 'in_review' | 'blocked') => void; // Opens modal
  setTaskStatus: (taskId: string, status: Task['status'], note?: string) => void;
  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'loggedMinutes'> & { id?: string }) => Promise<string | null>;
  // Uploads a real file and attaches it to a task. Returns an error string on failure so the
  // caller can surface it (e.g. the 10 MB size cap) rather than failing silently.
  uploadTaskFile: (taskId: string, file: File) => Promise<{ error?: string }>;
  deleteTaskAsset: (assetId: string) => Promise<boolean>;
  taskAssetDownloadUrl: (assetId: string) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => Promise<boolean>;
  createClient: (name: string, shortCode: string) => Promise<{ id: string } | { error: string }>;
  addTeamMember: (data: Omit<TeamMember, 'id'>) => void;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  setCurrentUser: (userId: string) => void;
  requestApproval: (taskId: string, approver: string, approvalType: 'budget' | 'task_completion' | 'self_assignment' | 'time_log', requestMessage?: string, meta?: any) => void;
  notifyUser: (userId: string, message: string, taskId?: string, type?: string) => void;
  resolveApproval: (taskId: string, approvalId: string, status: 'approved' | 'rejected', responseMessage?: string) => void;
  addReviewComment: (taskId: string, text: string) => void;
  setScreenShareMode: (active: boolean) => void;
  reloadData: () => void;
  clockIn: (userId: string, date: string, time: string, isLate?: boolean) => void;
  clockOut: (userId: string, date: string, time: string) => void;
  startBreak: (userId: string, date: string) => void;
  endBreak: (userId: string, date: string) => void;
  // Attendance rows are keyed by the real backend user id, not the mock id most components
  // use everywhere else — this looks up a mock team member's real id for matching against them.
  getRealUserId: (mockId: string) => string | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const confirm = useConfirm();

  const [state, dispatch] = useReducer(appReducer, initialState);
  const prevUserRef = useRef<string | undefined>(user?.id);
  const stateRef = useRef(state);
  stateRef.current = state; // inline ref sync — no useEffect needed
  const userRef = useRef(user);
  userRef.current = user; // read fresh in timers/callbacks without adding `user` to every dep array

  // Mock client ids ('c1', ...) used throughout the app's hierarchy/permission logic
  // don't match the real backend's UUIDs. This map (built from /api/clients by matching
  // short code) translates between the two so tasks actually persist to Postgres under
  // real foreign keys. User ids no longer need an equivalent map — team members are keyed
  // directly by the real backend id everywhere (see updatedTeamMembers in fetchData below).
  const clientIdMapRef = useRef<{ toDb: Record<string, string>; toMock: Record<string, string> }>({ toDb: {}, toMock: {} });
  // Maps a freshly-created task's local id to the real id Postgres assigned it, until
  // the next fetchData() makes the real id the task's id everywhere.
  const taskIdMapRef = useRef<Record<string, string>>({});
  // Tracks the newest audit entry id already persisted to the backend, so the sync effect
  // below only POSTs genuinely new entries (not ones just hydrated from the server).
  const lastSyncedAuditIdRef = useRef<string | null>(null);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toISOString();
    
    if (user?.id && user.id !== prevUserRef.current) {
      dispatch({ type: 'SET_CURRENT_USER', payload: { userId: user.id } });
      // Only clock in if NOT already clocked in today (prevent duplicate entries)
      const todayLog = stateRef.current.attendanceLogs.find(
        (a: any) => a.userId === user.id && a.date === todayStr
      );
      if (!todayLog) {
        dispatch({ type: 'CLOCK_IN', payload: { userId: user.id, date: todayStr, time: nowStr } });
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        fetch(`${baseUrl}/api/attendance/clock-in`, {
          method: 'POST',
          credentials: 'include',
        }).catch(err => console.error('Error syncing clock-in:', err));
      }
    }
    prevUserRef.current = user?.id;

    const handleBeforeUnload = () => {
      if (user?.id) {
        const today = new Date().toISOString().split('T')[0];
        let updatedState = { ...stateRef.current };

        // Save active task timers on unload (do NOT clock out attendance)
        const userTimers = updatedState.activeTimers.filter(t => t.userId === user.id);
        if (userTimers.length > 0) {
          const nowMs = Date.now();
          let newTasks = [...updatedState.tasks];
          let newEntries = [...updatedState.timeEntries];
          
          userTimers.forEach(timer => {
             const elapsedMin = Math.floor((nowMs - timer.startedAt) / 60000);
             const totalMin = timer.accumulated + elapsedMin;
             if (totalMin > 0) {
               newTasks = newTasks.map(t => t.id === timer.taskId ? { ...t, loggedMinutes: (t.loggedMinutes || 0) + totalMin } : t);
               newEntries.push({
                 id: 'te-' + Date.now() + Math.random(),
                 taskId: timer.taskId,
                 userId: user.id,
                 minutes: totalMin,
                 date: today,
                 note: 'Auto-logged on tab close'
               });
             }
          });
          
          updatedState.tasks = newTasks;
          updatedState.timeEntries = newEntries;
          updatedState.activeTimers = updatedState.activeTimers.filter(t => t.userId !== user.id);
        }
        
        localStorage.setItem('invictus_app_state_v2', JSON.stringify(updatedState));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const opts: RequestInit = { credentials: 'include' };

      const [usersRes, clientsRes, tasksRes, notificationsRes, attendanceRes, githubRes, socialRes, activeTimersRes, auditLogRes, meetingsRes] = await Promise.all([
        fetch(`${baseUrl}/api/users`, opts),
        fetch(`${baseUrl}/api/clients`, opts),
        fetch(`${baseUrl}/api/tasks`, opts),
        fetch(`${baseUrl}/api/notifications`, opts),
        fetch(`${baseUrl}/api/attendance`, opts),
        fetch(`${baseUrl}/api/github/live`, opts),
        fetch(`${baseUrl}/api/social/accounts`, opts),
        fetch(`${baseUrl}/api/time-logs?active=true`, opts),
        fetch(`${baseUrl}/api/audit-log`, opts),
        fetch(`${baseUrl}/api/meetings`, opts),
      ]);

      // A 401 from ANY endpoint means the session has expired — log out consistently
      // instead of only checking users/tasks, which used to leave the other endpoints
      // (attendance, github, social, timers) failing silently with no explanation.
      const allResponses = [usersRes, clientsRes, tasksRes, notificationsRes, attendanceRes, githubRes, socialRes, activeTimersRes, auditLogRes, meetingsRes];
      if (allResponses.some(res => res.status === 401)) {
        logout();
        return;
      }

      const dbUsers = usersRes.ok ? await usersRes.json() : [];
      const dbClients = clientsRes.ok ? await clientsRes.json() : [];
      const dbTasks = tasksRes.ok ? await tasksRes.json() : [];
      const dbNotifications = notificationsRes.ok ? await notificationsRes.json() : [];
      const dbAttendance = attendanceRes.ok ? await attendanceRes.json() : [];
      const dbGithub = githubRes.ok ? await githubRes.json() : {};
      const dbSocial = socialRes.ok ? await socialRes.json() : {};
      const dbActiveTimers = activeTimersRes.ok ? await activeTimersRes.json() : [];
      const dbAuditLog = auditLogRes.ok ? await auditLogRes.json() : [];
      const dbMeetings = meetingsRes.ok ? await meetingsRes.json() : [];
      const updatedTeamMembers = dbUsers.map((dbUser: any) => {
        const getInitials = (name: string) => {
          return (name || '').split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2);
        };

        const getRoleTag = (dept: string, role: string) => {
          const d = dept?.toLowerCase() || '';
          if (d.includes('develop')) return 'developer';
          if (d.includes('design')) return 'designer';
          if (d.includes('video')) return 'video_editor';
          if (d.includes('marketing')) return 'performance_marketer';
          if (d.includes('sales')) return 'sales';
          if (d.includes('operations') || role === 'ops') return 'ops';
          return 'team';
        };

        const getDeptName = (dept: string) => {
          const d = dept?.toLowerCase() || '';
          if (d === 'bd') return 'Business Development';
          if (d === 'operations') return 'Operations';
          if (d === 'design') return 'Design';
          if (d === 'development') return 'Development';
          if (d === 'video') return 'Video';
          if (d === 'performance_marketing') return 'Performance Marketing';
          if (d === 'sales') return 'Sales';
          return dept || 'Other';
        };

        const colors = [
          '#3B82F6', '#10B981', '#F97316', '#EC4899', '#F43F5E',
          '#14B8A6', '#8B5CF6', '#6366F1', '#06B6D4', '#0EA5E9',
          '#D946EF', '#F59E0B', '#84CC16', '#64748B'
        ];
        const hash = (dbUser.email || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const defaultColor = colors[hash % colors.length];

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          department: getDeptName(dbUser.department),
          initials: getInitials(dbUser.name),
          hoursThisWeek: 0,
          weeklyTarget: 40,
          color: parseHexColor(dbUser.color || savedColors[dbUser.id] || (dbUser.email && savedColors[dbUser.email.toLowerCase()]) || defaultColor),
          permissions: (dbUser.role === 'admin' || dbUser.role === 'super_admin') ? ['all'] : dbUser.role === 'ops' ? ['manage_ops'] : [],
          monthlySalaryINR: 0,
          roleTag: getRoleTag(dbUser.department, dbUser.role),
          mustChangePassword: dbUser.must_change_password,
          avatarUrl: dbUser.avatar_url,
          employeeId: dbUser.employee_id || undefined,
          title: dbUser.title || undefined,
          isHeadOfDepartment: !!dbUser.is_head_of_department,
        };
      });

      // Build the mock-id <-> real-id maps for clients
      const toDbClient: Record<string, string> = {};
      const toMockClient: Record<string, string> = {};
      for (const mock of CLIENTS) {
        const match = dbClients.find((c: any) => (c.short_code || c.shortCode)?.toUpperCase() === mock.code?.toUpperCase());
        if (match) { toDbClient[mock.id] = match.id; toMockClient[match.id] = mock.id; }
      }
      clientIdMapRef.current = { toDb: toDbClient, toMock: toMockClient };

      const translatedTasks = dbTasks.map((t: any) => ({
        ...t,
        type: t.type || 'task',
        assignedTo: t.assignedTo || [],
        createdBy: t.createdBy,
        clientId: toMockClient[t.clientId] || t.clientId,
        tags: t.tags || [],
        loggedMinutes: t.loggedMinutes || 0,
      }));

      const translatedNotifications = dbNotifications.map((n: any) => ({
        ...n,
        userId: n.userId,
        actorId: n.actorId,
      }));

      // NOTE: unlike tasks/notifications, attendance userId is intentionally left as the
      // real backend UUID, not translated through toMockUser — the existing local
      // CLOCK_IN/CLOCK_OUT dispatches (and state.currentUserId) have always stored the
      // real `user.id` from useAuth() here, so this keeps the DB-hydrated rows consistent
      // with that pre-existing convention.
      const translatedAttendance = dbAttendance.map((a: any) => {
        const totalMinutes = a.clockIn && a.clockOut
          ? Math.max(0, Math.round((new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime()) / 60000))
          : 0;
        return {
          ...a,
          totalMinutes,
          lateFlag: a.status === 'late',
          source: 'web',
          autoClosed: false,
        };
      });

      const githubCommits = (dbGithub.commits || []).map((c: any) => ({
        id: c.id,
        userId: c.authorUserId || null,
        authorName: c.authorName || null,
        repo: c.repo,
        clientId: null,
        taskId: c.linkedTaskId || null,
        message: c.message,
        additions: c.additions || 0,
        deletions: c.deletions || 0,
        timestamp: c.timestamp,
        isLive: true,
      }));

      const githubRepos = (dbGithub.repos || []).map((repo: any) => {
        const repoCommits = (dbGithub.commits || []).filter((c: any) => c.repo === repo.name);
        return {
          name: repo.name,
          clientId: null,
          commitsThisWeek: repoCommits.length,
          lastPushed: repoCommits[0]?.timestamp ? new Date(repoCommits[0].timestamp).toLocaleDateString() : 'Unknown',
          contributors: Array.from(new Set(repoCommits.map((c: any) => c.authorUserId).filter(Boolean))),
          status: 'active' as const,
        };
      });

      const devProjects = (dbGithub.repos || []).map((repo: any) => {
        const repoCommits = (dbGithub.commits || []).filter((c: any) => c.repo === repo.name);
        const repoPRs = (dbGithub.pullRequests || []).filter((pr: any) => pr.repo === repo.name);
        const developers = Array.from(new Set(repoCommits.map((c: any) => c.authorUserId).filter(Boolean))) as string[];
        return {
          id: repo.id,
          repoName: `${repo.owner}/${repo.name}`,
          clientId: null,
          name: repo.name,
          commitsThisWeek: repoCommits.length,
          developers,
          status: 'active' as const,
          openPRs: repoPRs.filter((pr: any) => pr.state === 'open').length,
          openIssues: repo.openIssues || 0,
          lastPush: repoCommits[0]?.timestamp ? new Date(repoCommits[0].timestamp).toLocaleDateString() : 'Unknown',
          isInternal: repo.name.toLowerCase().includes('internal') || repo.name.toLowerCase().includes('os'),
        };
      });

      const socialAccounts = (dbSocial.accounts || []).map((a: any) => ({
        ...a,
        clientId: toMockClient[a.clientId] || null,
      }));

      const meetingNotes = dbMeetings.map((m: any) => ({
        id: m.id,
        clientId: toMockClient[m.clientId] || null,
        processedAt: m.createdAt,
        transcriptSnippet: m.transcriptSnippet,
        result: m.result,
        tasksCreated: m.tasksCreated || [],
        googleEventId: m.googleEventId || null,
      }));

      // userId intentionally left as the real backend UUID, not translated through
      // toMockUser — matches the local START_TIMER dispatch (uses state.currentUserId,
      // the real uuid) and the same convention already used for attendanceLogs.
      const activeTimers = dbActiveTimers.map((t: any) => ({
        taskId: t.task_id,
        userId: t.user_id,
        startedAt: new Date(t.started_at).getTime(),
        accumulated: 0,
      }));

      dispatch({ type: 'HYDRATE_STATE', payload: {
        tasks: translatedTasks,
        activeTimers,
        notifications: translatedNotifications,
        attendanceLogs: translatedAttendance,
        githubCommits,
        githubRepos,
        devProjects,
        socialAccounts,
        teamMembers: updatedTeamMembers,
        auditLog: dbAuditLog,
        meetingNotes,
        isGlobalLoading: false,
        globalError: null
      } as any });
      // Everything in dbAuditLog just came from the backend, so it's already persisted —
      // mark it as synced immediately. Without this, the watermark below still points at a
      // locally-generated "AUD-xxxx" id from before this hydration, which will never be
      // found in this backend-sourced array (real UUIDs). That permanently pins boundaryIdx
      // to -1 in the sync effect, causing it to silently re-POST the "newest" entry as a
      // fresh duplicate on every single subsequent fetchData() call, forever.
      if (dbAuditLog[0]?.id) {
        lastSyncedAuditIdRef.current = dbAuditLog[0].id;
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (err: any) {
      console.error('fetchData failed, keeping local state:', err);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user?.id, logout]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user?.id, fetchData]);

  // Persist newly-added audit entries to the backend as they're created. addAudit()
  // always prepends new entries to the front of the array, so anything newer than
  // lastSyncedAuditIdRef hasn't been synced yet — this fires for every code path that
  // adds an entry (task changes, timer events, clock in/out, etc.) without needing a
  // matching backend-sync call threaded through each of those individually.
  useEffect(() => {
    if (!user || state.auditLog.length === 0) return;
    const newest = state.auditLog[0];
    if (newest.id === lastSyncedAuditIdRef.current) return;

    const boundaryIdx = lastSyncedAuditIdRef.current
      ? state.auditLog.findIndex(a => a.id === lastSyncedAuditIdRef.current)
      : -1;
    // If the watermark isn't found (first run, or it scrolled out of the fetched window),
    // sync only the newest entry rather than re-posting the whole list.
    const toSync = boundaryIdx === -1 ? state.auditLog.slice(0, 1) : state.auditLog.slice(0, boundaryIdx);

    lastSyncedAuditIdRef.current = newest.id;
    for (const entry of [...toSync].reverse()) {
      fetch(`${apiBaseUrl}/api/audit-log`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: entry.actor,
          action: entry.action,
          entity: entry.entity,
          entityRef: entry.entityRef,
          entityId: entry.entityId,
          clientName: entry.clientName,
          meta: entry.meta,
        }),
      }).catch(err => console.error('Failed to sync audit entry to backend:', err));
    }
  }, [state.auditLog, user]);


  const [isMounted, setIsMounted] = React.useState(false);
  const [stoppingTaskId, setStoppingTaskId] = useState<string | null>(null);
  const [stoppingTaskTargetStatus, setStoppingTaskTargetStatus] = useState<'paused' | 'in_review' | 'blocked' | null>(null);
  
  // Notification alert sounds & popups
  const [activeToast, setActiveToast] = useState<{ id: string; message: string; taskId?: string } | null>(null);
  const prevNotifsLength = useRef(0);

  // Surfaces backend-sync failures that would otherwise fail silently in the console —
  // e.g. a task whose client/assignee has no real-DB mapping never reaches the server,
  // so it looks fine locally but vanishes the moment fetchData() re-hydrates from the
  // backend on the next login. Without this, that data loss is invisible until it's too late.
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const warnSyncFailure = useCallback((message: string) => {
    console.error('[backend sync]', message);
    setSyncWarning(message);
  }, []);
  useEffect(() => {
    if (syncWarning) {
      const t = setTimeout(() => setSyncWarning(null), 7000);
      return () => clearTimeout(t);
    }
  }, [syncWarning]);

  // Persistence (BUG-07)
  useEffect(() => {
    const saved = localStorage.getItem('invictus_app_state_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Notifications are always re-fetched fresh from the backend (see fetchData below) —
        // never restore them from this local cache, or a just-cleared notification can flash
        // back on reload before fetchData's authoritative HYDRATE_STATE overwrites it.
        delete parsed.notifications;
        dispatch({ type: 'HYDRATE_STATE', payload: parsed });
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  // Monitor notifications to trigger popups and play audio chime
  useEffect(() => {
    if (!isMounted) return;
    
    const count = state.notifications.length;
    if (count > prevNotifsLength.current) {
      // Find the newly added notification(s)
      const latestNotif = state.notifications[0];
      if (latestNotif && latestNotif.userId === state.currentUserId) {
        // Play synthetic sound chimes
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const playTone = (freq: number, startTime: number, duration: number) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, startTime);
              gain.gain.setValueAtTime(0, startTime);
              gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
              gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(startTime);
              osc.stop(startTime + duration);
            };
            const now = ctx.currentTime;
            playTone(523.25, now, 0.35); // C5
            playTone(783.99, now + 0.08, 0.45); // G5 (slack-like double chime)
          }
        } catch (err) {
          console.warn('Audio chime failed:', err);
        }

        // Show sliding toast popup
        setActiveToast({
          id: latestNotif.id,
          message: latestNotif.message,
          taskId: latestNotif.taskId,
        });
      }
    }
    prevNotifsLength.current = count;
  }, [state.notifications, state.currentUserId, isMounted]);

  // Clear toast alert after 4.5 seconds
  useEffect(() => {
    if (activeToast) {
      const t = setTimeout(() => setActiveToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [activeToast]);

  useEffect(() => {
    if (!isMounted) return;

    // Only persist essential slices — never serialize the full state (3-8MB)
    const timer = setTimeout(() => {
      // Notifications are deliberately excluded — they're always re-fetched fresh from the
      // backend on load, and persisting them here is exactly what let a cleared notification
      // flash back on the next reload before the fresh fetch overwrote it.
      const essentialState = {
        tasks:             state.tasks,
        clients:           state.clients,
        teamMembers:       state.teamMembers,
        attendanceLogs:    state.attendanceLogs,
        activeTimers:      state.activeTimers,
        currentUserId:     state.currentUserId,
        leaveRequests:     state.leaveRequests,
        googleEvents:      state.googleEvents,
        isGoogleConnected: state.isGoogleConnected,
        stateVersion:      state.stateVersion,
      };
      // Skip writes once logged out — otherwise this timer (scheduled before logout)
      // fires after logout clears state and silently resurrects the just-cleared data.
      if (!userRef.current) return;
      try {
        localStorage.setItem('invictus_app_state_v2', JSON.stringify(essentialState));
      } catch {
        // localStorage full — clear stale data and retry
        localStorage.removeItem('invictus_app_state_v2');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    state.tasks,
    state.clients,
    state.teamMembers,
    state.attendanceLogs,
    state.activeTimers,
    state.currentUserId,
    state.leaveRequests,
    state.googleEvents,
    state.isGoogleConnected,
    state.stateVersion,
    isMounted,
  ]);

  const getTimerElapsed = useCallback((taskId: string): number => {
    const timer = state.activeTimers.find(t => t.taskId === taskId);
    if (!timer) return 0;
    return Math.floor((Date.now() - timer.startedAt) / 1000);
  }, [state.activeTimers]); // removed state.tickCount

  const getTaskLoggedMinutes = useCallback((taskId: string): number => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return 0;
    const timer = state.activeTimers.find(t => t.taskId === taskId);
    if (!timer) return task.loggedMinutes;
    return task.loggedMinutes + Math.floor((Date.now() - timer.startedAt) / 60000);
  }, [state.tasks, state.activeTimers]); // removed state.tickCount

  const isTimerRunning = useCallback((taskId: string) =>
    state.activeTimers.some(t => t.taskId === taskId),
  [state.activeTimers]);

  const startTimer = useCallback((taskId: string) => {
    dispatch({ type: 'START_TIMER', payload: { taskId, userId: state.currentUserId } });
    if (user) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${baseUrl}/api/tasks/${taskId}/timer/start`, {
        method: 'POST',
        credentials: 'include',
      }).catch(err => console.error('Error syncing timer start:', err));
    }
  }, [state.currentUserId, user]);

  const stopTimer = useCallback((taskId: string) => {
    dispatch({ type: 'STOP_TIMER', payload: { taskId, userId: state.currentUserId } });
    if (user) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      // keepalive: this fetch must still reach the server even if the page is mid-navigation
      // or a refresh fires right after the click — without it, the browser can cancel the
      // in-flight request, leaving the timer "stopped" locally but still running server-side.
      fetch(`${baseUrl}/api/tasks/${taskId}/timer/stop`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      }).catch(err => console.error('Error syncing timer stop:', err));
    }
  }, [state.currentUserId, user]);

  const requestStopTimer = useCallback((taskId: string, targetStatus?: 'paused' | 'in_review' | 'blocked') => {
    setStoppingTaskId(taskId);
    setStoppingTaskTargetStatus(targetStatus || null);
  }, []);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const setTaskStatus = useCallback((taskId: string, status: Task['status'], note?: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    const prevStatus = task?.status;

    if (task && status === 'done' && prevStatus === 'in_review') {
      if (!canApproveOrCompleteTask(state, task, state.currentUserId)) {
        alert("Only the person who assigned this task, CEO, COO, or Operations can mark a task in review as Done.");
        return;
      }
    }

    if (status !== 'in_progress' && isTimerRunning(taskId)) {
      stopTimer(taskId);
    }

    dispatch({ type: 'SET_TASK_STATUS', payload: { id: taskId, status, actorId: state.currentUserId, note } });

    if (user) {
      const dbTaskId = taskIdMapRef.current[taskId] || taskId;
      // keepalive: a status change (esp. marking Done) must persist even if the user
      // refreshes or navigates away right after clicking — otherwise the UI shows the new
      // status optimistically while the backend never actually received the update, and the
      // next fetchData() pass correctly (if confusingly) reverts to the true, unsaved status.
      fetch(`${apiBaseUrl}/api/tasks/${dbTaskId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        keepalive: true,
      }).catch(err => console.error('Failed to sync status change to backend:', err));

      // Mirror the local status-change notification (see SET_TASK_STATUS reducer case) to the
      // backend so the task creator/admin/dept heads actually see it in their own session —
      // without this, the notification only ever existed in this tab's local state.
      if (task && ['paused', 'blocked', 'in_review', 'done'].includes(status) && prevStatus !== status) {
        const targets = new Set<string>();
        if (task.createdBy !== state.currentUserId) targets.add(task.createdBy);
        const ceoId = state.teamMembers.find(m => m.role === 'super_admin')?.id;
        if (ceoId && ceoId !== state.currentUserId) targets.add(ceoId);
        getTaskDepartmentHeadIds(state, task).filter(id => id !== state.currentUserId).forEach(id => targets.add(id));
        if (note) {
          state.teamMembers.forEach(m => {
            if (note.includes(`@${m.name}`) || note.includes(`@${m.name.split(' ')[0]}`)) targets.add(m.id);
          });
        }
        const message = `Task moved to ${status}${note ? `: ${note}` : ''}`;
        targets.forEach(dbUserId => {
          fetch(`${apiBaseUrl}/api/notifications`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: dbUserId, type: 'status_change', taskId: dbTaskId, message }),
          }).catch(err => console.error('Failed to sync status-change notification:', err));
        });
      }
    }
  }, [state.currentUserId, state.tasks, state.teamMembers, user]);

  // Resolves to the real backend task id (or null if it couldn't be created there), so
  // callers that need to act on the persisted task — e.g. uploading a file attachment, which
  // requires a task to attach to — can await it instead of guessing.
  const createTask = useCallback(async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'loggedMinutes'> & { id?: string }): Promise<string | null> => {
    dispatch({ type: 'CREATE_TASK', payload: data });

    if (user) {
      return await (async () => {
        try {
          const dbClientId = clientIdMapRef.current.toDb[data.clientId];
          if (!dbClientId) {
            console.warn('No backend client mapping for', data.clientId, '— task created locally only.');
            return null;
          }
          const dbAssignedTo = data.assignedTo || [];

          const res = await fetch(`${apiBaseUrl}/api/tasks`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.title,
              description: data.description,
              clientId: dbClientId,
              category: data.category,
              assignedTo: dbAssignedTo,
              priority: data.priority,
              status: data.status,
              deadline: data.deadline,
              estimatedHours: data.estimatedHours,
              tags: data.tags,
              // Drive/deliverable links — without this they only ever lived in local state
              // and silently vanished on the next fetchData() re-hydration.
              assets: data.assets,
              taskType: (data as any).taskType,
              // goal/task/subtask and the parent link — without these a goal came back from
              // the next fetch as a plain task, and subtasks lost their parent entirely.
              // parentId is mapped through taskIdMapRef because callers pass the local
              // placeholder id, while Postgres needs the real parent UUID.
              type: data.type || 'task',
              parentId: data.parentId ? (taskIdMapRef.current[data.parentId] || data.parentId) : null,
            }),
          });
          const created = await res.json();
          if (data.id) {
            taskIdMapRef.current[data.id] = created.id;
            taskIdMapRef.current[created.id] = data.id;
            if (data.id !== created.id) {
              dispatch({
                type: 'UPDATE_TASK',
                payload: { id: data.id, updates: { id: created.id } },
              });
            }
          }

          // Log the task-creation audit entry only now, stamped with the real backend id
          // from the start — logging it earlier (before this response came back) would mean
          // writing a temporary local id that nothing could reliably correct afterward, since
          // the entry gets persisted to the backend before any correction has a chance to run.
          dispatch({
            type: 'ADD_AUDIT',
            payload: {
              id: makeAuditId(),
              timestamp: new Date().toISOString(),
              actor: getActorName(state, data.createdBy),
              actorId: data.createdBy,
              action: 'task_create',
              entity: 'Task',
              entityRef: data.title,
              entityId: created.id,
              clientName: getClientName(state, data.clientId),
              meta: `Priority: ${data.priority}`,
            },
          });

          // Mirror the local assignment notification (see CREATE_TASK reducer case) to the
          // backend so it's visible to the assignee's account in a different session too.
          for (const dbUserId of dbAssignedTo) {
            fetch(`${apiBaseUrl}/api/notifications`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: dbUserId, type: 'assignment', taskId: created.id, message: `You have been assigned a new task: ${data.title}` }),
            }).catch(err => console.error('Failed to sync assignment notification:', err));
          }
          return created.id as string;
        } catch (err) {
          console.error('Failed to sync new task to backend:', err);
          return null;
        }
      })();
    }
    return null;
  }, [user]);

  // File attachments. Uploaded bytes live in Postgres (task_assets.file_data) and are served
  // back through an authenticated download endpoint — there are no public file URLs.
  const uploadTaskFile = useCallback(async (taskId: string, file: File): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const dbTaskId = taskIdMapRef.current[taskId] || taskId;
      const formData = new FormData();
      formData.append('file', file);
      // No Content-Type header here on purpose — the browser has to set the multipart
      // boundary itself, and setting it manually breaks the upload.
      const res = await fetch(`${apiBaseUrl}/api/tasks/${dbTaskId}/assets`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { error: data.error || 'Upload failed' };
      }
      return {};
    } catch (err) {
      return { error: 'Could not connect to the server' };
    }
  }, [user, apiBaseUrl]);

  const deleteTaskAsset = useCallback(async (assetId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/assets/${assetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [user, apiBaseUrl]);

  const taskAssetDownloadUrl = useCallback(
    (assetId: string) => `${apiBaseUrl}/api/tasks/assets/${assetId}/download`,
    [apiBaseUrl]
  );

  // Quick-add client (name + short code only — see backend POST /api/clients). Registers
  // the new client into both state.clients and clientIdMapRef so createTask's mock->real
  // id translation works immediately, without waiting for the next full fetchData() pass.
  const createClient = useCallback(async (name: string, shortCode: string): Promise<{ id: string } | { error: string }> => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const res = await fetch(`${apiBaseUrl}/api/clients`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, shortCode }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Failed to create client' };

      const mockId = `c-${shortCode.toLowerCase()}`;
      const newClient: Client = {
        id: mockId,
        code: shortCode.toUpperCase(),
        name,
        category: 'other',
        monthlyRetainerINR: 0,
        agencyFeeINR: 0,
        contractStatus: 'active',
        primaryContact: '',
        notes: '',
      };
      dispatch({ type: 'ADD_CLIENT', payload: newClient });
      clientIdMapRef.current.toDb[mockId] = data.id;
      clientIdMapRef.current.toMock[data.id] = mockId;
      return { id: mockId };
    } catch (err) {
      return { error: 'Could not connect to the server' };
    }
  }, [user]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });

    if (user) {
      (async () => {
        try {
          const dbTaskId = taskIdMapRef.current[id] || id;
          const body: any = { ...updates };
          if (updates.assignedTo) {
            body.assignedTo = updates.assignedTo;
          }
          delete body.clientId; // client reassignment isn't supported by this path today

          await fetch(`${apiBaseUrl}/api/tasks/${dbTaskId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } catch (err) {
          console.error('Failed to sync task update to backend:', err);
        }
      })();
    }
  }, [user]);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return false;
    if (await confirm(`Delete '${task.title}'? This cannot be undone.`, { danger: true, confirmLabel: 'Delete' })) {
      dispatch({ type: 'DELETE_TASK', payload: { id } });
      if (user) {
        const dbTaskId = taskIdMapRef.current[id] || id;
        fetch(`${apiBaseUrl}/api/tasks/${dbTaskId}`, {
          method: 'DELETE',
          credentials: 'include',
        }).catch(err => console.error('Failed to sync task deletion to backend:', err));
      }
      return true;
    }
    return false;
  }, [state.tasks, confirm, user]);

  const addTeamMember = useCallback((data: Omit<TeamMember, 'id'>) => dispatch({ type: 'ADD_TEAM_MEMBER', payload: data }), []);
  const updateTeamMember = useCallback((id: string, updates: Partial<TeamMember>) => dispatch({ type: 'UPDATE_TEAM_MEMBER', payload: { id, updates } }), []);
  const setCurrentUser = useCallback((userId: string) => dispatch({ type: 'SET_CURRENT_USER', payload: { userId } }), []);

  const requestApproval = useCallback((taskId: string, approver: string, approvalType: 'budget' | 'task_completion' | 'self_assignment' | 'time_log', requestMessage?: string, meta?: any) => {
    dispatch({ type: 'REQUEST_APPROVAL', payload: { taskId, approver, approvalType, requestMessage, requestedBy: state.currentUserId, meta } });
  }, [state.currentUserId]);

  // Notify an arbitrary user (mock id) of something (e.g. Thariq assigning within Development
  // still needs Sushil informed). Dispatches locally and syncs to the backend so it survives
  // a different login session, the same way task-assignment notifications do.
  const notifyUser = useCallback((userId: string, message: string, taskId?: string, type: string = 'assignment') => {
    dispatch({ type: 'CREATE_NOTIFICATION', payload: { userId, actorId: state.currentUserId, type, taskId: taskId || '', message } });

    if (user) {
      const dbTaskId = taskId ? (taskIdMapRef.current[taskId] || taskId) : undefined;
      fetch(`${apiBaseUrl}/api/notifications`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type, taskId: dbTaskId, message }),
      }).catch(err => console.error('Failed to sync notification to backend:', err));
    }
  }, [state.currentUserId, user]);

  const resolveApproval = useCallback((taskId: string, approvalId: string, status: 'approved' | 'rejected', responseMessage?: string) => {
    dispatch({ type: 'RESOLVE_APPROVAL', payload: { taskId, approvalId, status, responseMessage } });
  }, []);

  const decideApproval = useCallback((id: string, decision: 'approved' | 'rejected', note?: string) => {
    dispatch({ type: 'DECIDE_APPROVAL', payload: { id, decision, note } });
  }, []);

  const updateDealStage = useCallback((id: string, stage: string) => {
    dispatch({ type: 'UPDATE_DEAL_STAGE', payload: { id, stage } });
  }, []);

  const createDeal = useCallback((deal: any) => {
    dispatch({ type: 'CREATE_DEAL', payload: deal });
  }, []);

  const saveMeetingNote = useCallback(async (note: any): Promise<string | null> => {
    if (!user) return null;
    try {
      const dbClientId = note.clientId ? (clientIdMapRef.current.toDb[note.clientId] || null) : null;
      const res = await fetch(`${apiBaseUrl}/api/meetings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: note.title || note.result?.meetingMeta?.title || 'Meeting Notes',
          clientId: dbClientId,
          transcriptSnippet: note.transcriptSnippet,
          analysisPreference: note.result?.meetingMeta?.meetingType || null,
          result: note.result,
          googleEventId: note.googleEventId || null,
        }),
      });
      if (!res.ok) { console.error('Failed to save meeting note:', await res.text()); return null; }
      const saved = await res.json();
      // Dispatched only after the backend confirms the real id — waiting here (rather than
      // stamping a temporary local id first) avoids reintroducing the same local-id/real-id
      // race that caused audit log entries to end up orphaned earlier; the analysis itself
      // already rendered from component-local state, so there's no perceptible delay.
      dispatch({ type: 'ADD_MEETING_NOTE', payload: {
        id: saved.id,
        clientId: note.clientId || null,
        processedAt: saved.createdAt,
        transcriptSnippet: note.transcriptSnippet,
        result: note.result,
        tasksCreated: note.tasksCreated || [],
        googleEventId: saved.googleEventId || null,
      } });
      return saved.id;
    } catch (err) {
      console.error('Error saving meeting note:', err);
      return null;
    }
  }, [user, apiBaseUrl]);

  const addReviewComment = useCallback((taskId: string, text: string) => {
    dispatch({ type: 'ADD_REVIEW_COMMENT', payload: { taskId, text, authorId: state.currentUserId } });
  }, [state.currentUserId]);

  const setScreenShareMode = useCallback((active: boolean) => {
    dispatch({ type: 'SET_SCREEN_SHARE_MODE', payload: active });
  }, []);

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const activeTasks = React.useMemo(() => state.tasks.filter(t => t.status !== 'done'), [state.tasks]);
  const overdueTasks = React.useMemo(() => state.tasks.filter(t => t.deadline && t.status !== 'done' && t.deadline < todayStr), [state.tasks, todayStr]);
  const todayTasks = React.useMemo(() => state.tasks.filter(t => t.deadline && t.status !== 'done' && t.deadline === todayStr), [state.tasks, todayStr]);
  const clockIn = useCallback((userId: string, date: string, time: string, isLate?: boolean) => {
    dispatch({ type: 'CLOCK_IN', payload: { userId, date, time, isLate } });
    if (user) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${baseUrl}/api/attendance/clock-in`, {
        method: 'POST',
        credentials: 'include',
      })
      .then(() => fetchData())
      .catch(err => console.error('Error syncing clock-in:', err));
    }
  }, [user, fetchData]);

  const clockOut = useCallback((userId: string, date: string, time: string) => {
    dispatch({ type: 'CLOCK_OUT', payload: { userId, date, time } });
    if (user) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${baseUrl}/api/attendance/clock-out`, {
        method: 'POST',
        credentials: 'include',
      })
      .then(() => fetchData())
      .catch(err => console.error('Error syncing clock-out:', err));
    }
  }, [user, fetchData]);

  const startBreak = useCallback((userId: string, date: string) => {
    const time = new Date().toISOString();
    dispatch({ type: 'START_BREAK', payload: { userId, date, time } });
    if (user) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${baseUrl}/api/attendance/break-start`, {
        method: 'POST',
        credentials: 'include',
      })
      .then(() => fetchData())
      .catch(err => console.error('Error starting break:', err));
    }
  }, [user, fetchData]);

  const endBreak = useCallback((userId: string, date: string) => {
    const time = new Date().toISOString();
    dispatch({ type: 'END_BREAK', payload: { userId, date, time } });
    if (user) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${baseUrl}/api/attendance/break-end`, {
        method: 'POST',
        credentials: 'include',
      })
      .then(() => fetchData())
      .catch(err => console.error('Error ending break:', err));
    }
  }, [user, fetchData]);

  // User ids are the real backend id everywhere now — no translation needed. Kept as a
  // pass-through rather than removed outright since callers throughout the app still invoke it.
  const getRealUserId = useCallback((mockId: string) => mockId, []);

  const contextValue = React.useMemo(() => ({
    reloadData: fetchData,
    state,
    dispatch,
    activeTasks,
    overdueTasks,
    todayTasks,
    getTimerElapsed,
    getTaskLoggedMinutes,
    isTimerRunning,
    startTimer,
    stopTimer,
    requestStopTimer,
    setTaskStatus,
    createTask,
    uploadTaskFile,
    deleteTaskAsset,
    taskAssetDownloadUrl,
    updateTask,
    deleteTask,
    createClient,
    addTeamMember,
    updateTeamMember,
    setCurrentUser,
    requestApproval,
    notifyUser,
    resolveApproval,
    decideApproval,
    updateDealStage,
    createDeal,
    saveMeetingNote,
    addReviewComment,
    setScreenShareMode,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getRealUserId,
  }), [
    state, fetchData, activeTasks, overdueTasks, todayTasks,
    getTimerElapsed, getTaskLoggedMinutes, isTimerRunning,
    startTimer, stopTimer, requestStopTimer, setTaskStatus,
    createTask, updateTask, deleteTask, createClient, addTeamMember, updateTeamMember,
    setCurrentUser, requestApproval, notifyUser, resolveApproval, decideApproval,
    updateDealStage, createDeal, saveMeetingNote, addReviewComment, setScreenShareMode,
    clockIn, clockOut, startBreak, endBreak, getRealUserId
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {isMounted && stoppingTaskId && (
        <StopTimerModal 
          taskId={stoppingTaskId} 
          targetStatus={stoppingTaskTargetStatus}
          onClose={() => {
            setStoppingTaskId(null);
            setStoppingTaskTargetStatus(null);
          }} 
        />
      )}
      
      {/* Toast Alert popup system */}
      {isMounted && activeToast && (
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes toastSlideIn {
              0% { transform: translateY(20px) scale(0.95); opacity: 0; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
            .animate-toast-slide {
              animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}} />
          <div 
            onClick={() => {
              if (activeToast.taskId) {
                window.dispatchEvent(new CustomEvent('open-task-drawer', { detail: { taskId: activeToast.taskId } }));
              }
              setActiveToast(null);
            }}
            className="fixed bottom-6 right-6 z-[9999] bg-[#1E293B] border border-[#2AB182]/30 rounded-xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex items-start gap-3.5 cursor-pointer animate-toast-slide hover:border-[#2AB182] transition-colors max-w-sm"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(42,177,130,0.15)' }}>
              <span className="material-symbols-outlined text-[#2AB182]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[13px] text-white leading-tight">New Notification</p>
              <p className="text-[12px] text-slate-300 leading-snug mt-1 break-words">{activeToast.message}</p>
            </div>
            <button className="text-slate-400 hover:text-white flex-shrink-0 p-0.5 rounded hover:bg-slate-700/50 transition-colors" onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
