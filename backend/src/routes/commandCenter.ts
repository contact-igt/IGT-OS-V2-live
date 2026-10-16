import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

export type AttentionTier = 'critical' | 'action_today' | 'watch';
export interface AttentionItem {
  id: string;
  kind: 'overdue_task' | 'blocked_task' | 'due_today' | 'review_waiting' | 'unowned_task' | 'leave_pending' | 'open_blocker' | 'change_request';
  tier: AttentionTier;
  what: string;          // what happened
  why: string;           // why it matters
  owners: string[];      // who owns it ([] = nobody - itself an exception)
  client: string | null;
  deadline: string | null;
  route: 'ceo' | 'operations'; // who must act: CEO only when a decision/relationship call is needed
  ceoAction: string | null;
  link: string;
}

const DAY = 86_400_000;
const REVIEW_STALE_HOURS = 48;

// Pure classification so the rules are unit-testable and every tier decision is explainable.
export function classifyTask(t: any, now: Date): AttentionItem | null {
  const today = new Date(now.toISOString().slice(0, 10)).getTime();
  const deadline = t.deadline_date ? new Date(t.deadline_date).getTime() : null;
  const daysLate = deadline !== null ? Math.floor((today - deadline) / DAY) : 0;
  const hot = t.priority === 'critical' || t.priority === 'high';
  const owners: string[] = t.owner_names || [];
  const base = {
    owners, client: t.client_name || null, deadline: t.deadline_date ? String(t.deadline_date).slice(0, 10) : null,
    link: '/tasks', id: `task:${t.id}`,
  };

  if (t.status === 'blocked') {
    const ceo = t.priority === 'critical';
    return { ...base, kind: 'blocked_task', tier: hot ? 'critical' : 'action_today',
      what: `Blocked: ${t.title}`, why: hot ? `${t.priority}-priority work cannot progress` : 'Work cannot progress until the blocker is cleared',
      route: ceo ? 'ceo' : 'operations', ceoAction: ceo ? 'Remove the blocker or reprioritise' : null };
  }
  if (deadline !== null && daysLate > 0) {
    const ceo = daysLate >= 3 && hot;
    return { ...base, kind: 'overdue_task', tier: hot || daysLate >= 3 ? 'critical' : 'action_today',
      what: `Overdue ${daysLate}d: ${t.title}`, why: `Deadline passed ${daysLate} day(s) ago${hot ? ` on a ${t.priority}-priority task` : ''}`,
      route: ceo ? 'ceo' : 'operations', ceoAction: ceo ? 'Decide: extend deadline, add capacity, or inform client' : null };
  }
  if (t.status === 'in_review' && t.updated_at && (now.getTime() - new Date(t.updated_at).getTime()) / 3_600_000 >= REVIEW_STALE_HOURS) {
    return { ...base, kind: 'review_waiting', tier: 'action_today', what: `Waiting for review: ${t.title}`,
      why: `In review for over ${REVIEW_STALE_HOURS}h - the next step is stalled`, route: 'operations', ceoAction: null };
  }
  if (deadline !== null && daysLate === 0) {
    return { ...base, kind: 'due_today', tier: hot ? 'action_today' : 'watch', what: `Due today: ${t.title}`,
      why: 'Deadline is today', route: 'operations', ceoAction: null };
  }
  if (owners.length === 0) {
    return { ...base, kind: 'unowned_task', tier: hot ? 'action_today' : 'watch', what: `No owner: ${t.title}`,
      why: 'Nobody is responsible for this open task', route: 'operations', ceoAction: null };
  }
  return null;
}

const TIER_ORDER: Record<AttentionTier, number> = { critical: 0, action_today: 1, watch: 2 };

// GET /api/command-center/attention - admin/ops only. Derived exclusively from DB state; no manual status
// fields, no mock data. Items routed to 'ceo' need a decision; the rest belong to operations.
router.get('/attention', requireAuth, requireRole('admin', 'ops'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  try {
    const now = new Date();
    const tasks = await pool.query(
      `SELECT t.id, t.title, t.status, t.priority, t.deadline_date, t.updated_at, c.name AS client_name,
              COALESCE((SELECT array_agg(u.name ORDER BY u.name) FROM public.users u WHERE u.id = ANY(t.assigned_to)), '{}') AS owner_names
       FROM public.tasks t LEFT JOIN public.clients c ON c.id = t.client_id
       WHERE t.status NOT IN ('done', 'cancelled') AND t.parent_task_id IS NULL
       LIMIT 2000`
    );
    const items: AttentionItem[] = [];
    for (const row of tasks.rows) { const it = classifyTask(row, now); if (it) items.push(it); }

    const leave = await pool.query(
      `SELECT id, user_name, type, from_date, to_date FROM public.leave_requests WHERE status = 'pending' ORDER BY from_date LIMIT 100`
    );
    for (const l of leave.rows) {
      items.push({
        id: `leave:${l.id}`, kind: 'leave_pending', tier: 'watch', what: `Leave request pending: ${l.user_name}`,
        why: `${l.type} leave from ${String(l.from_date).slice(0, 10)} awaits a decision`, owners: [], client: null,
        deadline: String(l.from_date).slice(0, 10), route: 'operations', ceoAction: null, link: '/people',
      });
    }

    // Structured blockers: severity + blocking party + expected resolution decide the tier; a critical blocker
    // (or a high one that is 3+ days past its expected resolution) needs the CEO.
    const blockers = await pool.query(
      `SELECT b.id, b.title, b.reason, b.severity, b.blocking_party, b.expected_resolution, b.next_action, c.name AS client_name,
              ou.name AS owner_name, eu.name AS escalation_name
       FROM public.blockers b LEFT JOIN public.clients c ON c.id = b.client_id
       LEFT JOIN public.users ou ON ou.id = b.owner_id LEFT JOIN public.users eu ON eu.id = b.escalation_owner_id
       WHERE b.status = 'open' LIMIT 200`
    );
    const todayMs = new Date(now.toISOString().slice(0, 10)).getTime();
    for (const b of blockers.rows) {
      const due = b.expected_resolution ? String(b.expected_resolution).slice(0, 10) : null;
      const late = due ? Math.floor((todayMs - new Date(due).getTime()) / DAY) : 0;
      const hot = b.severity === 'critical' || b.severity === 'high';
      const ceo = b.severity === 'critical' || (b.severity === 'high' && late >= 3);
      items.push({
        id: `blocker:${b.id}`, kind: 'open_blocker', tier: hot || late > 0 ? 'critical' : 'action_today',
        what: `Blocker (${b.severity}): ${b.title}`,
        why: `${b.reason.slice(0, 160)} - waiting on ${b.blocking_party}${late > 0 ? `; expected resolution ${late}d ago` : ''}`,
        owners: b.owner_name ? [b.owner_name] : [], client: b.client_name || null, deadline: due, route: ceo ? 'ceo' : 'operations',
        ceoAction: ceo ? `Unblock or escalate${b.escalation_name ? ` (escalation owner: ${b.escalation_name})` : ''}${b.next_action ? `; planned next action: ${b.next_action.slice(0, 100)}` : ''}` : null,
        link: '/delivery',
      });
    }

    // Client change requests awaiting a decision: material ones are leadership decisions (the roadmap changes only on explicit acceptance).
    const crs = await pool.query(
      `SELECT cr.id, cr.title, cr.classification, cr.priority, cr.timeline_impact_days, cr.commercial_impact_inr, cr.received_at, c.name AS client_name
       FROM public.change_requests cr JOIN public.clients c ON c.id = cr.client_id WHERE cr.decision = 'pending' LIMIT 200`
    );
    for (const cr of crs.rows) {
      const material = ['scope_change', 'new_feature', 'integration_change'].includes(cr.classification) || (cr.timeline_impact_days ?? 0) > 0 || (cr.commercial_impact_inr ?? 0) > 0;
      const ageDays = Math.floor((todayMs - new Date(String(cr.received_at).slice(0, 10)).getTime()) / DAY);
      const urgent = cr.priority === 'critical' || cr.classification === 'production_issue';
      items.push({
        id: `cr:${cr.id}`, kind: 'change_request', tier: urgent ? 'critical' : ageDays >= 2 ? 'action_today' : 'watch',
        what: `Client change request awaiting decision: ${cr.title}`,
        why: `${cr.classification.replace('_', ' ')} from ${cr.client_name}, ${ageDays}d old${material ? ' - material change: roadmap/timeline/commercials affected' : ''}`,
        owners: [], client: cr.client_name, deadline: null, route: material || urgent ? 'ceo' : 'operations',
        ceoAction: material || urgent ? 'Accept, defer or reject (impact analysis on the request)' : null, link: '/delivery',
      });
    }

    items.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    res.json({
      provenance: { classification: 'DATABASE', derivedFrom: ['tasks', 'leave_requests', 'blockers', 'change_requests'], generatedAt: now.toISOString(),
        note: 'Computed on request from current rows; nothing here is manually entered or seeded.' },
      counts: { critical: items.filter(i => i.tier === 'critical').length, actionToday: items.filter(i => i.tier === 'action_today').length,
        watch: items.filter(i => i.tier === 'watch').length, needsCeo: items.filter(i => i.route === 'ceo').length },
      ceoQueue: items.filter(i => i.route === 'ceo'),
      operationsQueue: items.filter(i => i.route === 'operations'),
    });
  } catch (err) {
    console.error('command-center attention error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
