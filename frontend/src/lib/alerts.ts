import { AppState } from '@/contexts/AppContext';
import { Notification } from '@/lib/data';

export interface SystemAlert {
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  userId: string;
}

/**
 * Computes system alerts based on the current state and returns an array of alerts.
 * These are strictly derived rules.
 */
export function computeAlerts(state: AppState): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  
  // Rule 1: Ad Budgets under 3 days
  const lowBudgets = state.adAccountBalances?.filter(a => a.daysRemaining <= 3) || [];
  for (const acc of lowBudgets) {
    alerts.push({
      userId: state.currentUserId, // Alert goes to everyone in ops for now
      title: `Low Ad Budget: ${acc.platform.toUpperCase()} (${acc.accountId})`,
      message: `Only ${acc.daysRemaining} days remaining (Balance: ₹${acc.balanceINR})`,
      type: 'warning',
      actionUrl: '/dashboard',
    });
  }

  // Rule 2: High CPL in Campaigns
  const highCPL = state.campaignWeeklyLogs?.filter(c => c.status === 'high') || [];
  for (const cmp of highCPL) {
    alerts.push({
      userId: state.currentUserId,
      title: `High CPL Alert: ${cmp.clientName}`,
      message: `CPL is ₹${cmp.cpl}, above target. Review campaign immediately.`,
      type: 'error',
      actionUrl: '/dashboard',
    });
  }

  // Rule 3: People not clocked in (after 10 AM)
  const afterCutoff = new Date().getHours() >= 10;
  const notClocked = afterCutoff ? (state.attendanceLogs?.filter(a => a.clockIn === null) || []) : [];
  if (notClocked.length > 0) {
    alerts.push({
      userId: state.currentUserId,
      title: `Team Attendance Alert`,
      message: `${notClocked.length} members have not clocked in today.`,
      type: 'warning',
      actionUrl: '/team',
    });
  }

  // Rule 4: Overdue tasks
  const overdueTasks = state.tasks?.filter(t => {
    if (t.status === 'done' || t.status === 'cancelled' || !t.deadline) return false;
    const dl = new Date(t.deadline);
    dl.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    return dl < today;
  }) || [];

  if (overdueTasks.length > 0) {
    alerts.push({
      userId: state.currentUserId,
      title: `Overdue Tasks`,
      message: `You have ${overdueTasks.length} overdue tasks in the system.`,
      type: 'error',
      actionUrl: '/tasks',
    });
  }

  return alerts;
}
