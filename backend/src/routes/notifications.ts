import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Retention window: read notifications are cleaned up after READ_RETENTION_DAYS; anything
// still unread gets a longer hard cap (MAX_RETENTION_DAYS) so a notification nobody ever
// looked at doesn't sit in the DB forever either. Fired opportunistically on GET (same
// non-blocking prune-on-request pattern already used for expired refresh tokens on login),
// scoped to the requesting user's own rows only — no cron/worker needed for this scale.
const READ_RETENTION_DAYS = 14;
const MAX_RETENTION_DAYS = 60;

function pruneOldNotifications(pool: Pool, userId: string) {
  pool.query(
    `DELETE FROM public.notifications
     WHERE user_id = $1
       AND ((read = true AND created_at < NOW() - ($2 || ' days')::interval)
         OR created_at < NOW() - ($3 || ' days')::interval)`,
    [userId, READ_RETENTION_DAYS, MAX_RETENTION_DAYS]
  ).catch(err => console.error('Failed to prune old notifications:', err));
}

function serializeNotification(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    actorId: row.actor_id,
    type: row.type,
    taskId: row.task_id,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

// GET /api/notifications — the logged-in user's own notifications
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      'SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json(result.rows.map(serializeNotification));
    pruneOldNotifications(pool, req.user.id);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications — create a notification for another user (e.g. on task assignment)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { userId, type, taskId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const result = await pool.query(
      `INSERT INTO public.notifications (user_id, actor_id, type, task_id, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, req.user.id, type || 'assignment', taskId || null, message]
    );
    res.status(201).json(serializeNotification(result.rows[0]));
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read — mark one notification read (only the recipient can)
router.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      `UPDATE public.notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json(serializeNotification(result.rows[0]));
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all — mark all of the logged-in user's notifications read
router.patch('/read-all', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await pool.query(`UPDATE public.notifications SET read = true WHERE user_id = $1`, [req.user.id]);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications — clear all of the logged-in user's notifications
router.delete('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    await pool.query('DELETE FROM public.notifications WHERE user_id = $1', [req.user.id]);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
