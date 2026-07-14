import { Task, TaskCategory, CLIENTS, TEAM_MEMBERS } from './data';

export interface QueryResult {
  tasks: Task[];
  label: string; // human-readable description of what was found
  intent: string[]; // detected intents for display
  action?: {
    type: 'create_task';
    title: string;
    clientId: string;
    assignedTo: string;
    category: TaskCategory;
  };
}

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────
function today(): Date { return new Date(new Date().toDateString()); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function parseDateRange(query: string): { from: Date | null; to: Date | null } | null {
  const q = query.toLowerCase();
  const t = today();

  if (q.includes('today'))           return { from: t, to: t };
  if (q.includes('tomorrow'))        return { from: addDays(t, 1), to: addDays(t, 1) };
  if (q.includes('this week'))       return { from: t, to: addDays(t, 6 - t.getDay()) };
  if (q.includes('next week'))       return { from: addDays(t, 7 - t.getDay()), to: addDays(t, 13 - t.getDay()) };
  if (q.includes('this month'))      return { from: t, to: new Date(t.getFullYear(), t.getMonth() + 1, 0) };
  if (q.includes('overdue'))         return { from: null, to: addDays(t, -1) };

  // "next X days"
  const nextMatch = q.match(/next\s+(\d+)\s+days?/);
  if (nextMatch) return { from: t, to: addDays(t, parseInt(nextMatch[1])) };

  // "in X days"
  const inMatch = q.match(/in\s+(\d+)\s+days?/);
  if (inMatch) return { from: t, to: addDays(t, parseInt(inMatch[1])) };

  return null;
}

// ─────────────────────────────────────────────────────────────
// DURATION HELPERS
// ─────────────────────────────────────────────────────────────
function parseMaxDuration(query: string): number | null {
  const q = query.toLowerCase();
  if (q.includes('30 min') || q.includes('30min') || q.includes('half hour')) return 30;
  if (q.includes('1 hour') || q.includes('1h ') || q.includes('one hour')) return 60;
  if (q.includes('2 hour') || q.includes('2h ')) return 120;
  if (q.includes('quick') || q.includes('short')) return 30;
  if (q.includes('under 1') || q.includes('less than 1 hour')) return 59;
  if (q.includes('under 2') || q.includes('less than 2')) return 119;

  const minMatch = q.match(/under\s+(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]);

  const hourMatch = q.match(/under\s+(\d+)\s*h/);
  if (hourMatch) return parseInt(hourMatch[1]) * 60;

  return null;
}

// ─────────────────────────────────────────────────────────────
// MAIN QUERY ENGINE
// ─────────────────────────────────────────────────────────────
export function aiQuery(query: string, tasks: Task[]): QueryResult {
  const q = query.toLowerCase().trim();
  if (!q) return { tasks, label: 'All tasks', intent: [] };

  let filtered = [...tasks];
  const intents: string[] = [];
  let action: QueryResult['action'] = undefined;

  // 0. CHECK FOR ACTION INTENT (Create Task / Auto Assign)
  if (q.includes('create a') || q.includes('assign a') || q.includes('give a task') || q.includes('new task')) {
    // Basic AI parser for demo
    intents.push('Auto-Assign Task');
    
    // Find client
    let foundClientId = 'c1'; // Default
    for (const client of CLIENTS) {
      if (q.includes(client.name.toLowerCase().split(' ')[0])) {
        foundClientId = client.id;
        break;
      }
    }

    // Find category
    let foundCategory: TaskCategory = 'operations';
    if (q.includes('video') || q.includes('reels')) foundCategory = 'video_editing';
    else if (q.includes('social') || q.includes('post')) foundCategory = 'social_media';
    else if (q.includes('design') || q.includes('creative')) foundCategory = 'design_creative';
    else if (q.includes('web')) foundCategory = 'web_development';
    else if (q.includes('ad') || q.includes('campaign')) foundCategory = 'performance_marketing';

    // Workload Algorithm: Find the team member in the relevant department with highest available bandwidth
    // Map category to department
    const deptMap: Record<string, string> = {
      'video_editing': 'Video',
      'social_media': 'Performance',
      'performance_marketing': 'Performance',
      'design': 'Design',
      'web_development': 'Development',
      'operations': 'Operations'
    };
    const targetDept = deptMap[foundCategory] || 'Operations';
    
    // Filter candidates
    const candidates = TEAM_MEMBERS.filter(m => m.department === targetDept);
    // Find lowest workload (highest bandwidth: weeklyTarget - hoursThisWeek)
    let bestAssignee = candidates.length > 0 ? candidates[0] : TEAM_MEMBERS[0];
    let maxBandwidth = -999;
    
    for (const c of candidates) {
      const bandwidth = c.weeklyTarget - c.hoursThisWeek;
      if (bandwidth > maxBandwidth) {
        maxBandwidth = bandwidth;
        bestAssignee = c;
      }
    }

    action = {
      type: 'create_task',
      title: `New ${foundCategory.replace('_', ' ')} task`,
      clientId: foundClientId,
      assignedTo: bestAssignee.id,
      category: foundCategory
    };
    
    // If it's a direct action, maybe we just return the action without filtering the tasks,
    // or we return all tasks for that client.
    return {
      tasks: tasks.filter(t => t.clientId === foundClientId),
      label: `Proposing task assignment to ${bestAssignee.name} (Available: ${maxBandwidth}h)`,
      intent: intents,
      action
    };
  }

  // 1. STATUS FILTER
  if (q.includes('overdue')) {
    const t = today();
    filtered = filtered.filter(task =>
      task.deadline && task.status !== 'done' && new Date(task.deadline) < t
    );
    intents.push('Overdue');
  } else if (q.includes('blocked'))     { filtered = filtered.filter(t => t.status === 'blocked');     intents.push('Blocked'); }
  else if (q.includes('in review') || q.includes('review')) { filtered = filtered.filter(t => t.status === 'in_review'); intents.push('In Review'); }
  else if (q.includes('done') || q.includes('completed') || q.includes('finished')) { filtered = filtered.filter(t => t.status === 'done'); intents.push('Completed'); }
  else if (q.includes('not started') || q.includes('todo') || q.includes('to do') || q.includes('not done')) { filtered = filtered.filter(t => t.status === 'todo'); intents.push('Not Started'); }
  else if (q.includes('in progress') || q.includes('active') || q.includes('ongoing')) { filtered = filtered.filter(t => t.status === 'in_progress'); intents.push('In Progress'); }

  // 2. PRIORITY FILTER
  if (q.includes('critical') || q.includes('urgent')) { filtered = filtered.filter(t => t.priority === 'critical'); intents.push('Critical Priority'); }
  else if (q.includes('high priority') || q.includes('high prio')) { filtered = filtered.filter(t => t.priority === 'high'); intents.push('High Priority'); }
  else if (q.includes('medium priority'))              { filtered = filtered.filter(t => t.priority === 'medium'); intents.push('Medium Priority'); }

  // 3. DATE RANGE FILTER
  const dateRange = parseDateRange(q);
  if (dateRange) {
    filtered = filtered.filter(task => {
      if (!task.deadline || task.status === 'done') return false;
      const dl = new Date(task.deadline);
      if (dateRange.from && dl < dateRange.from) return false;
      if (dateRange.to && dl > dateRange.to) return false;
      return true;
    });
    if (q.includes('overdue')) intents.push('Overdue');
    else if (q.includes('today')) intents.push('Due Today');
    else if (q.includes('tomorrow')) intents.push('Due Tomorrow');
    else if (q.includes('this week')) intents.push('This Week');
    else if (q.includes('next week')) intents.push('Next Week');
    else {
      const m = q.match(/next\s+(\d+)\s+days?/) || q.match(/in\s+(\d+)\s+days?/);
      if (m) intents.push(`Next ${m[1]} Days`);
    }
  }

  // 4. DURATION FILTER (estimated hours)
  const maxDuration = parseMaxDuration(q);
  if (maxDuration !== null) {
    filtered = filtered.filter(t => (t.estimatedHours * 60) <= maxDuration);
    intents.push(`≤${maxDuration}min tasks`);
  }

  // 5. CLIENT FILTER
  for (const client of CLIENTS) {
    const nameLower = client.name.toLowerCase();
    const codeLower = client.code.toLowerCase();
    const shortName = nameLower.split(' ')[0];
    if (q.includes(codeLower) || q.includes(nameLower) || (shortName.length > 3 && q.includes(shortName))) {
      filtered = filtered.filter(t => t.clientId === client.id);
      intents.push(`Client: ${client.name}`);
      break;
    }
  }

  // 6. ASSIGNEE FILTER
  if (q.includes('my tasks') || q.includes('my task') || q.includes('assigned to me')) {
    // In real app this would use currentUserId; for demo use u1 (admin)
    filtered = filtered.filter(t => t.assignedTo.includes('u1'));
    intents.push('My Tasks');
  } else if (q.includes('unassigned')) {
    filtered = filtered.filter(t => t.assignedTo.length === 0);
    intents.push('Unassigned');
  } else {
    for (const member of TEAM_MEMBERS) {
      const firstName = member.name.split(' ')[0].toLowerCase();
      if (q.includes(firstName) && firstName.length > 3) {
        filtered = filtered.filter(t => t.assignedTo.includes(member.id));
        intents.push(`Assigned to: ${member.name}`);
        break;
      }
    }
  }

  // 7. CATEGORY FILTER
  const categoryMap: Record<string, Task['category']> = {
    'social media': 'social_media', 'social': 'social_media',
    'video': 'video_editing', 'reels': 'video_editing',
    'design': 'design_creative', 'creative': 'design_creative',
    'web': 'web_development', 'website': 'web_development',
    'whatsapp': 'whatsapp_automation', 'automation': 'whatsapp_automation',
    'performance': 'performance_marketing', 'ads': 'performance_marketing', 'meta': 'performance_marketing', 'google ads': 'performance_marketing',
    'strategy': 'strategy', 'report': 'strategy',
    'operations': 'operations', 'ops': 'operations',
    'seo': 'seo',
  };
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (q.includes(keyword)) {
      filtered = filtered.filter(t => t.category === category);
      intents.push(`Category: ${category.replace(/_/g, ' ')}`);
      break;
    }
  }

  // Build label
  const label = intents.length > 0
    ? `${filtered.length} task${filtered.length !== 1 ? 's' : ''} matching: ${intents.join(', ')}`
    : `${filtered.length} task${filtered.length !== 1 ? 's' : ''} (no specific filter applied)`;

  return { tasks: filtered, label, intent: intents };
}

// ─────────────────────────────────────────────────────────────
// QUICK QUERY CHIPS
// ─────────────────────────────────────────────────────────────
export const QUICK_QUERIES = [
  { label: 'Auto-Assign Task',    query: 'assign a new video task for Pixel Eye to someone free', icon: 'smart_toy', color: '#10B981' },
  { label: 'Overdue',             query: 'overdue tasks',          icon: 'warning',        color: '#EF4444' },
  { label: 'Due Today',           query: 'due today',              icon: 'today',          color: '#F97316' },
  { label: 'Next 7 Days',         query: 'next 7 days',            icon: 'date_range',     color: '#F59E0B' },
  { label: 'Critical Only',       query: 'critical tasks',         icon: 'priority_high',  color: '#EF4444' },
  { label: 'Quick Tasks (≤30m)',  query: '30 minute tasks',        icon: 'bolt',           color: '#8B5CF6' },
  { label: 'My Tasks',            query: 'my tasks',               icon: 'person',         color: '#2563EB' },
  { label: 'Pixel Eye Tasks',     query: 'pixel eye tasks',        icon: 'business_center', color: '#D97706' },
];
