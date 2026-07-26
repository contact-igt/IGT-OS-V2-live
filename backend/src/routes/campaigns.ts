import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { role, id } = req.user;
    let query = '';
    let params: any[] = [];

    if (role === 'admin' || role === 'super_admin' || role === 'ops') {
      query = 'SELECT * FROM public.campaigns ORDER BY campaign_name ASC';
    } else {
      // In the schema, campaigns don't have assignedTo. They only have created_by. 
      // We will just return all campaigns for performance_marketing and sales roles.
      query = 'SELECT * FROM public.campaigns ORDER BY campaign_name ASC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/log', requireAuth, requireRole('performance_marketing', 'admin', 'ops'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { campaignId, leads, spend, cpl } = req.body;
    const userId = req.user.id;

    const query = `
      INSERT INTO public.campaign_weekly_logs ("campaignId", "userId", leads, spend, cpl, date)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [campaignId, userId, leads, spend, cpl]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error logging campaign numbers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
