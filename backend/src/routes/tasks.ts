import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/tasks
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { role, id } = req.user;
    let query = '';
    let params: any[] = [];

    if (role === 'admin' || role === 'ops') {
      query = 'SELECT * FROM public.tasks ORDER BY created_at DESC';
    } else {
      query = 'SELECT * FROM public.tasks WHERE $1 = ANY("assignedTo") ORDER BY created_at DESC';
      params = [id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks (admin/ops only)
router.post('/', requireAuth, requireRole('admin', 'ops'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { title, clientId, assignedTo, category, taskType, priority, status, deadline, timeEstimateMinutes } = req.body;
    
    // Auto-generate displayCode
    const countResult = await pool.query('SELECT COUNT(*) FROM public.tasks');
    const count = parseInt(countResult.rows[0].count) + 1;
    const displayCode = `TSK-${String(count).padStart(4, '0')}`;

    const query = `
      INSERT INTO public.tasks 
      ("displayCode", title, "clientId", "assignedTo", category, "taskType", priority, status, deadline, "timeEstimateMinutes") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
    `;
    const params = [displayCode, title, clientId, assignedTo || [], category, taskType, priority || 'medium', status || 'todo', deadline, timeEstimateMinutes || 0];
    
    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.params;
    const { status, comments, assets } = req.body; // Team restricted
    // Admin could update more fields, but keeping it simple for now based on prompt

    const query = `
      UPDATE public.tasks 
      SET status = COALESCE($1, status)
      WHERE id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/timer/start
router.post('/:id/timer/start', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const query = `
      INSERT INTO public.active_timers ("userId", "taskId", "startedAt") 
      VALUES ($1, $2, NOW()) 
      RETURNING *
    `;
    const result = await pool.query(query, [userId, id]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'A timer is already running for this user.' });
    }
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/timer/stop
router.post('/:id/timer/stop', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await pool.query('BEGIN');
    
    const timerResult = await pool.query('SELECT * FROM public.active_timers WHERE "userId" = $1 AND "taskId" = $2', [userId, id]);
    
    if (timerResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Timer not found' });
    }
    
    const startedAt = new Date(timerResult.rows[0].startedAt);
    const durationMinutes = Math.floor((new Date().getTime() - startedAt.getTime()) / 60000);
    
    await pool.query('DELETE FROM public.active_timers WHERE "userId" = $1', [userId]);
    
    const insertEntry = `
      INSERT INTO public.time_entries ("taskId", "userId", "durationMinutes", date, note) 
      VALUES ($1, $2, $3, NOW(), $4) 
      RETURNING *
    `;
    const result = await pool.query(insertEntry, [id, userId, durationMinutes, req.body.note || '']);
    
    await pool.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
