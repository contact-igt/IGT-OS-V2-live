import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

function serializeEntry(row: any) {
  return {
    id: row.id,
    timestamp: row.created_at,
    actor: row.actor_name,
    actorId: row.actor_id,
    action: row.action,
    entity: row.entity,
    entityRef: row.entity_ref,
    entityId: row.entity_id,
    clientName: row.client_name,
    meta: row.meta,
  };
}

// GET /api/audit-log — most recent entries, newest first (matches the frontend's
// local convention of prepending new entries to the front of the array)
router.get('/', requireAuth, requireRole('admin', 'ops'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      'SELECT * FROM public.audit_log ORDER BY created_at DESC LIMIT 1000'
    );
    res.json(result.rows.map(serializeEntry));
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Task events are recorded by the server itself (tasks.ts) with the verified actor; a browser must
// not be able to inject or duplicate them.
const SERVER_OWNED_TASK_ACTIONS = new Set(['task_create', 'task_status_change', 'task_priority_change', 'task_deadline_change',
  'task_assign_change', 'task_deleted', 'timer_start', 'timer_stop', 'commented']);
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : v == null ? null : String(v).slice(0, n));

// POST /api/audit-log - client-observed UI events only (clock in/out, approvals, time logged...).
// The actor is ALWAYS the authenticated user; any actorName in the body is ignored.
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { action, entity, entityRef, entityId, clientName, meta } = req.body || {};
  if (!action || !entity || !entityRef) {
    return res.status(400).json({ error: 'action, entity, and entityRef are required' });
  }
  if (entity === 'Task' && SERVER_OWNED_TASK_ACTIONS.has(action)) {
    return res.status(200).json({ ignored: true, reason: 'recorded server-side' });
  }

  try {
    const u = await pool.query('SELECT name FROM public.users WHERE id = $1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO public.audit_log (actor_id, actor_name, action, entity, entity_ref, entity_id, client_name, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, u.rows[0]?.name || req.user.email, clip(action, 80), clip(entity, 80), clip(entityRef, 300), clip(entityId, 80), clip(clientName, 200), clip(typeof meta === 'string' ? meta : meta == null ? null : JSON.stringify(meta), 1000)]
    );
    res.status(201).json(serializeEntry(result.rows[0]));
  } catch (error) {
    console.error('Error creating audit log entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
