import re

with open('src/contexts/AppContext.tsx', 'r') as f:
    content = f.read()

# 1. Update AppAction SET_TASK_STATUS and LOG_TIME_MANUAL
content = content.replace(
    "| { type: 'SET_TASK_STATUS'; payload: { id: string; status: Task['status']; actorId: string } }",
    "| { type: 'SET_TASK_STATUS'; payload: { id: string; status: Task['status']; actorId: string; note?: string } }"
)
content = content.replace(
    "| { type: 'LOG_TIME_MANUAL'; payload: { taskId: string; minutes: number; note: string; actorId: string } }",
    "| { type: 'LOG_TIME_MANUAL'; payload: { taskId: string; minutes: number; note: string; actorId: string; date?: string } }"
)

# 2. Add Notification handlers at end of reducer
reducers_str = """
    case 'CREATE_NOTIFICATION':
      return { ...state, notifications: [ { id: `NOTIF-${crypto.randomUUID().slice(0, 8)}`, createdAt: new Date().toISOString(), read: false, ...action.payload }, ...state.notifications ] };
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload.id ? { ...n, read: true } : n) };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => n.userId === action.payload.userId ? { ...n, read: true } : n) };

    case 'HYDRATE_STATE':"""
content = content.replace("case 'HYDRATE_STATE':", reducers_str)

# 3. SET_TASK_STATUS let declarations
set_task_let_before = """      let timers = [...state.activeTimers];
      let updatedLoggedMinutes = task.loggedMinutes;
      let auditEntries = state.auditLog;
      const now = Date.now();"""
set_task_let_after = """      let timers = [...state.activeTimers];
      let updatedLoggedMinutes = task.loggedMinutes;
      let auditEntries = state.auditLog;
      let newTimeEntries = [...state.timeEntries];
      let newNotifications = [...state.notifications];
      const now = Date.now();

      if (['paused', 'blocked', 'in_review', 'done'].includes(action.payload.status) && prevStatus !== action.payload.status) {
        const targets = new Set<string>();
        if (task.createdBy !== action.payload.actorId) targets.add(task.createdBy);
        if ('u1' !== action.payload.actorId) targets.add('u1');
        state.teamMembers.filter(m => m.isHeadOfDepartment && m.id !== action.payload.actorId).forEach(m => targets.add(m.id));
        
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
      }"""
content = content.replace(set_task_let_before, set_task_let_after)

# 4. SET_TASK_STATUS stop timer logic fix
stop_timer_before = """          const elapsed = Math.floor((now - timer.startedAt) / 60000);
          updatedLoggedMinutes += timer.accumulated + elapsed;
          timers.splice(timerIndex, 1);
          auditEntries = addAudit(auditEntries, {"""
stop_timer_after = """          const elapsed = Math.floor((now - timer.startedAt) / 60000);
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
          auditEntries = addAudit(auditEntries, {"""
content = content.replace(stop_timer_before, stop_timer_after)

# 4.b SET_TASK_STATUS return
ret_before = """      return {
        ...state,
        activeTimers: timers,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id
            ? { ...t, status: action.payload.status, loggedMinutes: updatedLoggedMinutes, updatedAt: new Date(now).toISOString() }"""
ret_after = """      let newCompletedAt = task.completedAt;
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
            ? { ...t, status: action.payload.status, loggedMinutes: updatedLoggedMinutes, updatedAt: new Date(now).toISOString(), completedAt: newCompletedAt, completedBy: newCompletedBy }"""
content = content.replace(ret_before, ret_after)

# 5. STOP_TIMER push TimeEntry
stop_timer_case_before = """      const actor = getActorName(state, userId);
      const clientName = task ? getClientName(state, task.clientId) : '—';
      return {
        ...state,
        activeTimers: state.activeTimers.filter(t => t.taskId !== taskId),"""
stop_timer_case_after = """      const actor = getActorName(state, userId);
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
        activeTimers: state.activeTimers.filter(t => t.taskId !== taskId),"""
content = content.replace(stop_timer_case_before, stop_timer_case_after)

# 6. LOG_TIME_MANUAL push TimeEntry
log_manual_before = """      const actor = getActorName(state, actorId);
      const clientName = getClientName(state, task.clientId);
      return {
        ...state,
        tasks: state.tasks.map(t =>"""
log_manual_after = """      const actor = getActorName(state, actorId);
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
        tasks: state.tasks.map(t =>"""
content = content.replace(log_manual_before, log_manual_after)

# 7. HYDRATE_STATE handle migration
hydrate_before = """    case 'HYDRATE_STATE': {
      return { 
        ...initialState, 
        ...action.payload,
        tasks: action.payload.tasks || initialState.tasks,"""
hydrate_after = """    case 'HYDRATE_STATE': {
      let migratedState = { ...initialState, ...action.payload };
      if (!migratedState.stateVersion || migratedState.stateVersion < 3) {
        migratedState.stateVersion = 3;
        migratedState.teamMembers = initialState.teamMembers; // Pull fresh data with salaries/tags
        // Add synthetic time entries for tasks
        const synthEntries: TimeEntry[] = [];
        migratedState.tasks = migratedState.tasks.map(t => {
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
        tasks: migratedState.tasks || initialState.tasks,"""
content = content.replace(hydrate_before, hydrate_after)


with open('src/contexts/AppContext.tsx', 'w') as f:
    f.write(content)

