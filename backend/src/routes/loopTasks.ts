import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';

const router = Router();

function serializeTemplate(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    clientId: row.client_id,
    category: row.category,
    priority: row.priority,
    assignedTo: row.assigned_to || [],
    createdBy: row.created_by,
    frequency: row.frequency,
    isActive: row.is_active,
    lastGeneratedDate: row.last_generated_date,
    createdAt: row.created_at,
  };
}

// Generates today's occurrence for a single template — shared by the lazy-generation pass
// (called from GET /api/tasks) and by template creation (so the very first occurrence
// exists immediately, without waiting on someone else's next page load).
async function generateOccurrenceIfDue(pool: Pool, template: any): Promise<any | null> {
  if (!template.is_active) return null;

  const dueCheck = await pool.query(
    `SELECT CASE
       WHEN $1::date IS NULL THEN CURRENT_DATE
       WHEN $2 = 'daily' THEN $1::date + INTERVAL '1 day'
       WHEN $2 = 'every_15_days' THEN $1::date + INTERVAL '15 days'
       WHEN $2 = 'monthly' THEN $1::date + INTERVAL '1 month'
     END::date AS next_due,
     CURRENT_DATE AS today`,
    [template.last_generated_date, template.frequency]
  );
  const { next_due: nextDue, today } = dueCheck.rows[0];
  if (new Date(nextDue) > new Date(today)) return null; // not due yet

  // Jumps straight to today rather than backfilling every missed day in a gap (server down,
  // nobody opened the app for a week) — one catch-up occurrence, not a pile of stale ones.
  const inserted = await pool.query(
    `INSERT INTO public.tasks
       (title, description, client_id, category, assigned_to, created_by, priority, status,
        deadline_date, recurrence_id, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo', CURRENT_DATE, $8, 'task')
     RETURNING *`,
    [
      template.title,
      template.description,
      template.client_id,
      template.category,
      template.assigned_to,
      template.created_by,
      template.priority,
      template.id,
    ]
  );

  await pool.query('UPDATE public.loop_task_templates SET last_generated_date = CURRENT_DATE WHERE id = $1', [template.id]);

  return inserted.rows[0];
}

// Called (fire-and-forget) from GET /api/tasks, same non-blocking maintenance-on-request
// pattern as attendance.ts's autoCloseStaleSessions — no cron/worker needed at this scale.
export async function generateDueLoopTaskOccurrences(pool: Pool): Promise<void> {
  try {
    const templates = await pool.query('SELECT * FROM public.loop_task_templates WHERE is_active = true');
    for (const template of templates.rows) {
      await generateOccurrenceIfDue(pool, template);
    }
  } catch (err) {
    console.error('Failed to generate due LoopTask occurrences:', err);
  }
}

// POST /api/loop-tasks — create a recurring template and immediately generate its first
// occurrence, so it shows up in the task list right away rather than after the next
// lazy-generation pass.
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { title, description, clientId, category, priority, assignedTo, frequency } = req.body;
    if (!title || !category || !frequency) {
      return res.status(400).json({ error: 'title, category, and frequency are required' });
    }
    if (!['daily', 'every_15_days', 'monthly'].includes(frequency)) {
      return res.status(400).json({ error: "frequency must be 'daily', 'every_15_days', or 'monthly'" });
    }

    const result = await pool.query(
      `INSERT INTO public.loop_task_templates
         (title, description, client_id, category, priority, assigned_to, created_by, frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description || null,
        clientId || null,
        category,
        priority || 'medium',
        assignedTo || [],
        req.user.id,
        frequency,
      ]
    );
    const template = result.rows[0];
    const firstOccurrence = await generateOccurrenceIfDue(pool, template);

    res.status(201).json({ template: serializeTemplate(template), firstOccurrence });
  } catch (error: any) {
    console.error('Error creating LoopTask template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/loop-tasks — the caller's own templates (admin/ops see all, matching the same
// visibility rule as GET /api/tasks) for a future management view.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { role, id } = req.user;
    const result = (role === 'admin' || role === 'super_admin' || role === 'ops')
      ? await pool.query('SELECT * FROM public.loop_task_templates ORDER BY created_at DESC')
      : await pool.query('SELECT * FROM public.loop_task_templates WHERE created_by = $1 ORDER BY created_at DESC', [id]);
    res.json(result.rows.map(serializeTemplate));
  } catch (error: any) {
    console.error('Error fetching LoopTask templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/loop-tasks/:id — pause/resume (isActive) or edit a template. Past generated
// occurrences are untouched either way.
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { isActive, title, priority, assignedTo } = req.body;
    const result = await pool.query(
      `UPDATE public.loop_task_templates SET
         is_active = COALESCE($1, is_active),
         title = COALESCE($2, title),
         priority = COALESCE($3, priority),
         assigned_to = COALESCE($4, assigned_to)
       WHERE id = $5
       RETURNING *`,
      [isActive, title || null, priority || null, assignedTo || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'LoopTask template not found' });
    res.json(serializeTemplate(result.rows[0]));
  } catch (error: any) {
    console.error('Error updating LoopTask template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/loop-tasks/:id — stops future occurrences. Already-generated task rows are
// kept (recurrence_id just goes NULL via the FK's ON DELETE SET NULL) — they're real history.
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query('DELETE FROM public.loop_task_templates WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'LoopTask template not found' });
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting LoopTask template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
