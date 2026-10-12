import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

export type AttentionTier = 'critical' | 'action_today' | 'watch';
export interface AttentionItem {
  id: string;
  kind: 'overdue_task' | 'blocked_task' | 'due_today' | 'review_waiting' | 'unowned_task' | 'leave_pending';
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

    items.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    res.json({
      provenance: { classification: 'DATABASE', derivedFrom: ['tasks', 'leave_requests'], generatedAt: now.toISOString(),
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
