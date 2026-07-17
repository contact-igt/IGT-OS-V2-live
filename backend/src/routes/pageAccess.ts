import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /:userId — admin-only: the pages this user has been explicitly granted, beyond
// whatever their role already allows by default. Populates the Admin Panel's checkboxes.
router.get('/:userId', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { userId } = req.params;

  try {
    const result = await pool.query('SELECT page_path FROM public.page_access WHERE user_id = $1', [userId]);
    res.json({ pages: result.rows.map(r => r.page_path) });
  } catch (error: any) {
    console.error('Error fetching page access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:userId — admin-only: replaces this user's full set of granted pages with the
// one given (a plain checklist-save UX, not incremental add/remove).
router.put('/:userId', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { userId } = req.params;
  const { pages } = req.body;
  const grantedBy = (req as any).user.id;

  if (!Array.isArray(pages) || !pages.every(p => typeof p === 'string')) {
    return res.status(400).json({ error: 'pages must be an array of strings' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.page_access WHERE user_id = $1', [userId]);
    for (const pagePath of pages) {
      await client.query(
        'INSERT INTO public.page_access (user_id, page_path, granted_by) VALUES ($1, $2, $3)',
        [userId, pagePath, grantedBy]
      );
    }
    await client.query('COMMIT');
    res.json({ pages });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating page access:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
