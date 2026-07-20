import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';

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
    clientName: row.client_name,
    meta: row.meta,
  };
}

// GET /api/audit-log — most recent entries, newest first (matches the frontend's
// local convention of prepending new entries to the front of the array)
router.get('/', requireAuth, async (req: Request, res: Response) => {
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

// POST /api/audit-log — any authenticated user may log an entry for their own action.
// actor_id is taken from the verified token, not the request body, so it can't be spoofed.
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { actorName, action, entity, entityRef, clientName, meta } = req.body;
  if (!actorName || !action || !entity || !entityRef) {
    return res.status(400).json({ error: 'actorName, action, entity, and entityRef are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.audit_log (actor_id, actor_name, action, entity, entity_ref, client_name, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, actorName, action, entity, entityRef, clientName || null, meta || null]
    );
    res.status(201).json(serializeEntry(result.rows[0]));
  } catch (error) {
    console.error('Error creating audit log entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
