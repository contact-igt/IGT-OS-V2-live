import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET / — the single agency-metrics row, or nulls if the CEO hasn't set anything yet.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      'SELECT monthly_arr, agency_health_percent, updated_at FROM public.agency_metrics ORDER BY updated_at DESC LIMIT 1'
    );
    if (result.rows.length === 0) {
      return res.json({ monthlyArr: null, agencyHealthPercent: null, updatedAt: null });
    }
    const row = result.rows[0];
    res.json({
      monthlyArr: row.monthly_arr === null ? null : Number(row.monthly_arr),
      agencyHealthPercent: row.agency_health_percent === null ? null : Number(row.agency_health_percent),
      updatedAt: row.updated_at,
    });
  } catch (error: any) {
    console.error('Error fetching agency metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT / — admin-only upsert of the singleton row.
router.put('/', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const userId = (req as any).user.id;
  const { monthlyArr, agencyHealthPercent } = req.body;

  if (monthlyArr !== null && monthlyArr !== undefined && typeof monthlyArr !== 'number') {
    return res.status(400).json({ error: 'monthlyArr must be a number or null' });
  }
  if (agencyHealthPercent !== null && agencyHealthPercent !== undefined && (typeof agencyHealthPercent !== 'number' || agencyHealthPercent < 0 || agencyHealthPercent > 100)) {
    return res.status(400).json({ error: 'agencyHealthPercent must be a number between 0 and 100, or null' });
  }

  try {
    const existing = await pool.query('SELECT id FROM public.agency_metrics ORDER BY updated_at DESC LIMIT 1');
    let row;
    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE public.agency_metrics SET monthly_arr = $1, agency_health_percent = $2, updated_by = $3, updated_at = now()
         WHERE id = $4
         RETURNING monthly_arr, agency_health_percent, updated_at`,
        [monthlyArr ?? null, agencyHealthPercent ?? null, userId, existing.rows[0].id]
      );
      row = result.rows[0];
    } else {
      const result = await pool.query(
        `INSERT INTO public.agency_metrics (monthly_arr, agency_health_percent, updated_by)
         VALUES ($1, $2, $3)
         RETURNING monthly_arr, agency_health_percent, updated_at`,
        [monthlyArr ?? null, agencyHealthPercent ?? null, userId]
      );
      row = result.rows[0];
    }
    res.json({
      monthlyArr: row.monthly_arr === null ? null : Number(row.monthly_arr),
      agencyHealthPercent: row.agency_health_percent === null ? null : Number(row.agency_health_percent),
      updatedAt: row.updated_at,
    });
  } catch (error: any) {
    console.error('Error updating agency metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /initiatives — list, joined with users for the owner's display info.
router.get('/initiatives', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      `SELECT si.id, si.name, si.progress_percent, si.quarter_label, si.created_at,
              u.id AS owner_id, u.name AS owner_name
       FROM public.strategic_initiatives si
       LEFT JOIN public.users u ON u.id = si.owner_user_id
       ORDER BY si.created_at DESC`
    );
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      progressPercent: r.progress_percent,
      quarterLabel: r.quarter_label,
      createdAt: r.created_at,
      owner: r.owner_id ? { id: r.owner_id, name: r.owner_name } : null,
    })));
  } catch (error: any) {
    console.error('Error fetching strategic initiatives:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function validateInitiativeBody(body: any) {
  const { name, ownerUserId, progressPercent, quarterLabel } = body;
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return 'name must be a non-empty string';
  }
  if (ownerUserId !== undefined && ownerUserId !== null && typeof ownerUserId !== 'string') {
    return 'ownerUserId must be a string or null';
  }
  if (progressPercent !== undefined && (typeof progressPercent !== 'number' || progressPercent < 0 || progressPercent > 100)) {
    return 'progressPercent must be a number between 0 and 100';
  }
  if (quarterLabel !== undefined && quarterLabel !== null && typeof quarterLabel !== 'string') {
    return 'quarterLabel must be a string or null';
  }
  return null;
}

// POST /initiatives — admin-only create.
router.post('/initiatives', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const userId = (req as any).user.id;
  const { name, ownerUserId, progressPercent, quarterLabel } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const validationError = validateInitiativeBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const result = await pool.query(
      `INSERT INTO public.strategic_initiatives (name, owner_user_id, progress_percent, quarter_label, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name.trim(), ownerUserId || null, progressPercent ?? 0, quarterLabel || null, userId]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error: any) {
    console.error('Error creating strategic initiative:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /initiatives/:id — admin-only partial update.
router.patch('/initiatives/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { id } = req.params;

  const validationError = validateInitiativeBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const fields: string[] = [];
  const values: any[] = [];
  const { name, ownerUserId, progressPercent, quarterLabel } = req.body;
  if (name !== undefined) { fields.push(`name = $${fields.length + 1}`); values.push(name.trim()); }
  if (ownerUserId !== undefined) { fields.push(`owner_user_id = $${fields.length + 1}`); values.push(ownerUserId); }
  if (progressPercent !== undefined) { fields.push(`progress_percent = $${fields.length + 1}`); values.push(progressPercent); }
  if (quarterLabel !== undefined) { fields.push(`quarter_label = $${fields.length + 1}`); values.push(quarterLabel); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  fields.push(`updated_at = now()`);
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE public.strategic_initiatives SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Initiative not found' });
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Error updating strategic initiative:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /initiatives/:id — admin-only.
router.delete('/initiatives/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM public.strategic_initiatives WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Initiative not found' });
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting strategic initiative:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
