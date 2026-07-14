import { TimeEntry, Task, TeamMember, DEFAULT_BENCHMARKS } from './data';

// IST = UTC+5:30
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

export function toISTDate(isoString?: string | null): Date {
  if (!isoString) return new Date(Date.now() + IST_OFFSET);
  const utcDate = new Date(isoString);
  return new Date(utcDate.getTime() + IST_OFFSET);
}

export function isoToYYYYMM(isoString: string): string {
  const d = toISTDate(isoString);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function isoToYYYY(isoString: string): string {
  const d = toISTDate(isoString);
  return `${d.getUTCFullYear()}`;
}

export function isoToYYYYMMDD(isoString: string): string {
  const d = toISTDate(isoString);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export interface DayStats {
  date: string;
  totalMinutes: number;
  tasksWorkedOn: number;
}

export function getDayStats(userId: string, date: string, entries: TimeEntry[]): DayStats {
  const dayEntries = entries.filter(e => e.userId === userId && isoToYYYYMMDD(e.startedAt) === date);
  const totalMinutes = dayEntries.reduce((sum, e) => sum + e.minutes, 0);
  const taskIds = new Set(dayEntries.map(e => e.taskId));
  return { date, totalMinutes, tasksWorkedOn: taskIds.size };
}

export interface MonthStats {
  month: string;
  tasksCompleted: number;
  totalMinutes: number;
  onTimePercentage: number;
  topCategoryId: string | null;
  topClientId: string | null;
  trend: number; // vs previous month
  completedTaskIds: string[];
}

export function getMonthStats(userId: string, yyyymm: string, entries: TimeEntry[], tasks: Task[]): MonthStats {
  const monthEntries = entries.filter(e => e.userId === userId && isoToYYYYMM(e.startedAt) === yyyymm);
  const totalMinutes = monthEntries.reduce((sum, e) => sum + e.minutes, 0);
  
  const completedTasks = tasks.filter(t => 
    t.status === 'done' && 
    t.completedBy === userId && 
    t.completedAt && 
    isoToYYYYMM(t.completedAt) === yyyymm
  );

  const onTimeCount = completedTasks.filter(t => {
    if (!t.deadline || !t.completedAt) return true;
    return t.completedAt <= t.deadline + 'T23:59:59.999Z';
  }).length;

  const onTimePercentage = completedTasks.length > 0 ? (onTimeCount / completedTasks.length) * 100 : 0;

  // Top category
  const categoryCounts = completedTasks.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Top client
  const clientCounts = completedTasks.reduce((acc, t) => {
    acc[t.clientId] = (acc[t.clientId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topClient = Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    month: yyyymm,
    tasksCompleted: completedTasks.length,
    totalMinutes,
    onTimePercentage,
    topCategoryId: topCategory,
    topClientId: topClient,
    trend: 0, // calculate later if needed
    completedTaskIds: completedTasks.map(t => t.id)
  };
}

export function getYearStats(userId: string, yyyy: string, entries: TimeEntry[], tasks: Task[]): MonthStats[] {
  const months = Array.from({length: 12}, (_, i) => `${yyyy}-${String(i + 1).padStart(2, '0')}`);
  return months.map(m => getMonthStats(userId, m, entries, tasks));
}

export function getTaskTypeStats(taskType: string, rangeDays: number, entries: TimeEntry[], tasks: Task[], benchmarks: Record<string, number>, userId?: string) {
  const now = new Date();
  const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  let targetTasks = tasks.filter(t => t.taskType === taskType && t.status === 'done' && t.completedAt && t.completedAt >= startDate);
  if (userId) {
    targetTasks = targetTasks.filter(t => t.completedBy === userId || t.assignedTo.includes(userId));
  }

  const count = targetTasks.length;
  let totalMinutes = 0;
  
  targetTasks.forEach(t => {
    const taskEntries = entries.filter(e => e.taskId === t.id && (!userId || e.userId === userId));
    totalMinutes += taskEntries.reduce((sum, e) => sum + e.minutes, 0);
  });

  const avgMinutes = count > 0 ? totalMinutes / count : 0;
  const benchmarkHours = benchmarks[taskType] || DEFAULT_BENCHMARKS[taskType] || 0;
  const benchmarkMinutes = benchmarkHours * 60;
  const efficiency = benchmarkMinutes > 0 ? (benchmarkMinutes / avgMinutes) * 100 : 100;

  return {
    taskType,
    count,
    avgMinutes,
    benchmarkMinutes,
    efficiency,
    tasks: targetTasks
  };
}

// Group entries by day and user for heatmap
export function getAgencyWeekHeatmap(weekStartIso: string, entries: TimeEntry[], members: TeamMember[]) {
  const weekStart = new Date(weekStartIso);
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0]; // simple YYYY-MM-DD
  });

  return members.map(m => {
    const dayStats = days.map(d => {
      const e = entries.filter(x => x.userId === m.id && x.startedAt.startsWith(d));
      const mins = e.reduce((sum, x) => sum + x.minutes, 0);
      return { date: d, minutes: mins };
    });
    return { member: m, days: dayStats };
  });
}
