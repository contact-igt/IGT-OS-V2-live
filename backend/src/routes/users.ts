import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Any authenticated user can read the roster (needed to populate assignee pickers
// and the frontend's mock-id <-> real-id mapping) — only non-sensitive columns are selected.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department, avatar_url, must_change_password 
       FROM public.users 
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/set-password', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const { password } = req.body;
  const userId = (req as any).user.id;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE public.users SET password_hash = $1, must_change_password = false WHERE id = $2',
      [hash, userId]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
