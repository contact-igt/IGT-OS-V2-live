import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/auditLog';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const role = req.user.role;
    let query = '';

    if (role === 'admin' || role === 'ops' || role === 'super_admin') {
      query = 'SELECT * FROM public.clients ORDER BY name ASC';
    } else {
      query = 'SELECT id, name, short_code, color_hex FROM public.clients ORDER BY name ASC';
    }

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quick-add: name + short code only. Everything else (retainer, contact, etc.) is
// filled in later from the Clients page — this exists so a client can be created
// inline from the New Task modal without leaving the flow.
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const name = (req.body.name || '').trim();
  const shortCode = (req.body.shortCode || '').trim().toUpperCase();

  if (!name) return res.status(400).json({ error: 'name is required' });
  if (shortCode.length < 3 || shortCode.length > 4) {
    return res.status(400).json({ error: 'shortCode must be 3-4 characters' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.clients (name, short_code, category)
       VALUES ($1, $2, 'other')
       RETURNING *`,
      [name, shortCode]
    );
    logAudit(pool, {
      actorId: req.user.id,
      actorName: req.user.name || req.user.email,
      action: 'client_created',
      entity: 'Client',
      entityRef: result.rows[0].name,
      entityId: result.rows[0].id,
      clientName: result.rows[0].name,
    });
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: `A client with code "${shortCode}" already exists` });
    }
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const role = req.user.role;
    const { id } = req.params;
    let query = '';

    if (role === 'admin' || role === 'ops' || role === 'super_admin') {
      query = 'SELECT * FROM public.clients WHERE id = $1';
    } else {
      query = 'SELECT id, name, short_code, color_hex FROM public.clients WHERE id = $1';
    }

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/deliverables', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM public.client_deliverables WHERE client_id = $1 ORDER BY deliverable_name ASC', [id]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching deliverables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/invoices', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM public.invoices WHERE client_id = $1 ORDER BY issue_date DESC', [id]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
