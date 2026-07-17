import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const query = req.query.active === 'true'
      ? 'SELECT * FROM public.time_logs WHERE ended_at IS NULL ORDER BY started_at DESC'
      : 'SELECT * FROM public.time_logs ORDER BY started_at DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching time logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
