// Severity/status aren't stored columns on audit_log — they're derived here from
// action+entity so the dashboard can bucket/color events without a schema change.
export type Severity = 'critical' | 'warning' | 'info' | 'success';
export type EventStatus = 'success' | 'failed';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityRef: string;
  entityId?: string | null;
  clientName?: string | null;
  meta: string | null;
}

// Reserved status colors, matching STATUS_CONFIG's existing done/blocked/in_review hues
// elsewhere in the app (green=success, red=critical, amber=warning, blue=info) — never
// reused for anything else, per this app's existing color convention.
export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  warning: { label: 'Warning', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  info: { label: 'Information', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  success: { label: 'Success', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
};

export const MODULE_LABELS: Record<string, string> = {
  Auth: 'Authentication',
  Task: 'Tasks',
  Employee: 'Employees',
  Attendance: 'Attendance',
  Leave: 'Leave',
};

export function getSeverity(entry: Pick<AuditEntry, 'action' | 'entity'>, meta: any): Severity {
  const a = entry.action;
  if (a === 'login_failed' || a === 'login_blocked') return 'critical';
  if (a === 'employee_updated' && meta?.role) return 'critical';
  if (a === 'task_deleted') return 'warning';
  if (a === 'employee_updated') return 'warning';
  if (a === 'login_success' || a === 'task_create' || a === 'employee_created' || a === 'client_created') return 'success';
  return 'info';
}

export function getStatus(entry: Pick<AuditEntry, 'action'>): EventStatus {
  return entry.action === 'login_failed' || entry.action === 'login_blocked' ? 'failed' : 'success';
}

// audit_log.meta is a free-form TEXT column — newer rows (this dashboard's own writes)
// store a JSON object, but rows written before this feature existed just hold a plain
// description string (e.g. "User clocked out"). Handle both without throwing.
export function parseMeta(meta: string | null): Record<string, any> {
  if (!meta) return {};
  try {
    const parsed = JSON.parse(meta);
    return typeof parsed === 'object' && parsed !== null ? parsed : { note: String(parsed) };
  } catch {
    return { note: meta };
  }
}

export function actionLabel(action: string): string {
  return action
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
