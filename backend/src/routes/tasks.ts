import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';
import { postDevTaskAssignmentAlert } from '../lib/googleChat';

const router = Router();

// Combine deadline_date + deadline_time into a single ISO string for the API response,
// since the frontend works with one `deadline` field rather than the DB's split columns.
function serializeTask(row: any) {
  // row.deadline_date is now a plain 'YYYY-MM-DD' string (see the DATE type parser
  // override in index.ts) — compose the ISO string directly, no Date parsing, so no
  // local-timezone can shift the calendar date.
  let deadline: string | null = null;
  if (row.deadline_date) {
    const timePart = row.deadline_time || '00:00:00';
    deadline = `${row.deadline_date}T${timePart}.000Z`;
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    clientId: row.client_id,
    category: row.category,
    assignedTo: row.assigned_to || [],
    createdBy: row.created_by,
    priority: row.priority,
    status: row.status,
    deadline,
    estimatedHours: row.time_estimate_minutes ? row.time_estimate_minutes / 60 : 0,
    parentId: row.parent_task_id,
    dependencies: row.dependencies || [],
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Total minutes actually logged across all completed time_logs sessions for this task —
    // defaults to 0 for a task with no sessions yet, never undefined/NaN.
    loggedMinutes: row.logged_minutes != null ? Number(row.logged_minutes) : 0,
  };
}

function splitDeadline(deadline?: string | null): { date: string | null; time: string | null } {
  if (!deadline) return { date: null, time: null };
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return { date: null, time: null };
  return { date: d.toISOString().split('T')[0], time: d.toISOString().split('T')[1].slice(0, 8) };
}

// GET /api/tasks — all tasks for admin/ops, only assigned tasks for everyone else
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { role, id } = req.user;
    let query = '';
    let params: any[] = [];

    const loggedMinutesJoin = `
      LEFT JOIN (
        SELECT task_id, SUM(duration_minutes) AS logged_minutes
        FROM public.time_logs
        WHERE ended_at IS NOT NULL
        GROUP BY task_id
      ) tl ON tl.task_id = t.id
    `;

    if (role === 'admin' || role === 'super_admin' || role === 'ops') {
      query = `SELECT t.*, tl.logged_minutes FROM public.tasks t ${loggedMinutesJoin} ORDER BY t.created_at DESC`;
    } else {
      query = `SELECT t.*, tl.logged_minutes FROM public.tasks t ${loggedMinutesJoin} WHERE $1 = ANY(t.assigned_to) OR t.created_by = $1 ORDER BY t.created_at DESC`;
      params = [id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map(serializeTask));
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const {
      title, description, clientId, assignedTo, category, priority, status,
      deadline, estimatedHours, parentId, dependencies, tags,
    } = req.body;

    if (!title || !clientId || !category) {
      return res.status(400).json({ error: 'title, clientId, and category are required' });
    }

    const { date: deadlineDate, time: deadlineTime } = splitDeadline(deadline);

    const query = `
      INSERT INTO public.tasks
        (title, description, client_id, category, assigned_to, created_by, priority, status,
         deadline_date, deadline_time, time_estimate_minutes, parent_task_id, dependencies, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const params = [
      title,
      description || null,
      clientId,
      category,
      assignedTo || [],
      req.user.id,
      priority || 'medium',
      status || 'todo',
      deadlineDate,
      deadlineTime,
      estimatedHours ? Math.round(estimatedHours * 60) : 0,
      parentId || null,
      dependencies || [],
      tags || [],
    ];

    const result = await pool.query(query, params);
    const createdTask = result.rows[0];

    // Log task creation in public.audit_log table
    try {
      const userRes = await pool.query('SELECT name FROM public.users WHERE id = $1', [req.user.id]);
      const userName = userRes.rows[0]?.name || 'Unknown';

      const clientRes = await pool.query('SELECT name FROM public.clients WHERE id = $1', [clientId]);
      const clientName = clientRes.rows[0]?.name || '—';

      await pool.query(
        `INSERT INTO public.audit_log (actor_id, actor_name, action, entity, entity_ref, entity_id, client_name, meta)
         VALUES ($1, $2, 'task_create', 'Task', $3, $4, $5, $6)`,
        [
          req.user.id,
          userName,
          title,
          createdTask.id,
          clientName,
          `Priority: ${priority || 'medium'}`,
        ]
      );
    } catch (auditErr) {
      console.error('Failed to log task creation audit entry:', auditErr);
    }

    // Fire-and-forget: alert the Web Development Chat space if any assignee is in that
    // department. Not awaited so a slow/failing webhook never delays the task-create response.
    if (assignedTo && assignedTo.length > 0) {
      (async () => {
        try {
          const devRes = await pool.query(
            `SELECT name FROM public.users WHERE id = ANY($1) AND department = 'development'`,
            [assignedTo]
          );
          if (devRes.rows.length === 0) return;

          const clientRes = await pool.query('SELECT name FROM public.clients WHERE id = $1', [clientId]);
          await postDevTaskAssignmentAlert(
            { title, priority: priority || 'medium', deadline, clientName: clientRes.rows[0]?.name },
            devRes.rows.map((r: any) => r.name)
          );
        } catch (err) {
          console.error('Failed to post dev task assignment alert:', err);
        }
      })();
    }

    res.status(201).json(serializeTask(createdTask));
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id — partial update; only provided fields are changed
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.params;
    const { title, description, category, priority, status, assignedTo, deadline, estimatedHours, tags } = req.body;

    // Capture the pre-update assignee list so the Chat alert below fires only for genuinely
    // *new* dev-department assignees — without this, re-saving the same assignedTo array on
    // every unrelated edit would re-post the same alert each time.
    let previousAssignedTo: string[] = [];
    if (assignedTo) {
      const prevRes = await pool.query('SELECT assigned_to FROM public.tasks WHERE id = $1', [id]);
      previousAssignedTo = prevRes.rows[0]?.assigned_to || [];
    }

    const hasDeadline = deadline !== undefined;
    const { date: deadlineDate, time: deadlineTime } = hasDeadline ? splitDeadline(deadline) : { date: null, time: null };

    const query = `
      UPDATE public.tasks
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        assigned_to = COALESCE($6, assigned_to),
        deadline_date = CASE WHEN $7 THEN $8 ELSE deadline_date END,
        deadline_time = CASE WHEN $7 THEN $9 ELSE deadline_time END,
        time_estimate_minutes = COALESCE($10, time_estimate_minutes),
        tags = COALESCE($11, tags),
        updated_at = now()
      WHERE id = $12
      RETURNING *
    `;
    const params = [
      title || null,
      description ?? null,
      category || null,
      priority || null,
      status || null,
      assignedTo || null,
      hasDeadline,
      deadlineDate,
      deadlineTime,
      estimatedHours !== undefined ? Math.round(estimatedHours * 60) : null,
      tags || null,
      id,
    ];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    // Authoritative safety net: close out ANY still-running timer on this task whenever its
    // status moves away from 'in_progress' — regardless of which user made this request. The
    // frontend also tries to stop the timer client-side, but that only works when the acting
    // user is the same person whose timer is running; it does nothing when an approver/ops
    // person completes someone else's task, which is the normal review-approval flow here.
    // Without this, timers silently keep running in the DB forever (see the 31-hour stuck
    // "Whatsnexus Bug fix" timer this was written to fix).
    if (status && status !== 'in_progress') {
      try {
        await pool.query(
          `UPDATE public.time_logs
           SET ended_at = NOW(),
               duration_minutes = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at)) / 60)::int
           WHERE task_id = $1 AND ended_at IS NULL`,
          [id]
        );
      } catch (timerErr) {
        console.error('Failed to auto-close active timers on status change:', timerErr);
      }
    }

    // Fire-and-forget: alert the Web Development Chat space about newly added dev-department
    // assignees only (see previousAssignedTo above) — mirrors the same check on task creation.
    if (assignedTo) {
      const newlyAdded = assignedTo.filter((uid: string) => !previousAssignedTo.includes(uid));
      if (newlyAdded.length > 0) {
        (async () => {
          try {
            const devRes = await pool.query(
              `SELECT name FROM public.users WHERE id = ANY($1) AND department = 'development'`,
              [newlyAdded]
            );
            if (devRes.rows.length === 0) return;

            const updatedTask = serializeTask(result.rows[0]);
            const clientRes = await pool.query('SELECT name FROM public.clients WHERE id = $1', [updatedTask.clientId]);
            await postDevTaskAssignmentAlert(
              { title: updatedTask.title, priority: updatedTask.priority, deadline: updatedTask.deadline, clientName: clientRes.rows[0]?.name },
              devRes.rows.map((r: any) => r.name)
            );
          } catch (err) {
            console.error('Failed to post dev task reassignment alert:', err);
          }
        })();
      }
    }

    const loggedResult = await pool.query(
      `SELECT COALESCE(SUM(duration_minutes), 0) AS logged_minutes FROM public.time_logs WHERE task_id = $1 AND ended_at IS NOT NULL`,
      [id]
    );
    res.json(serializeTask({ ...result.rows[0], logged_minutes: loggedResult.rows[0].logged_minutes }));
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id — admin/ops only, matching the frontend's canDelete gate. Dependent
// rows (time_logs, task_comments, task_assets, audit_logs, notifications, subtasks) all cascade
// via FK ON DELETE CASCADE, so a plain delete here is sufficient.
router.delete('/:id', requireAuth, requireRole('admin', 'ops'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM public.tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting task:', error);
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

    const existing = await pool.query(
      'SELECT id FROM public.time_logs WHERE user_id = $1 AND task_id = $2 AND ended_at IS NULL',
      [userId, id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A timer is already running for this user on this task.' });
    }

    const result = await pool.query(
      `INSERT INTO public.time_logs (task_id, user_id, started_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [id, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/timer/stop
router.post('/:id/timer/stop', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    const timerResult = await client.query(
      'SELECT * FROM public.time_logs WHERE user_id = $1 AND task_id = $2 AND ended_at IS NULL',
      [userId, id]
    );

    if (timerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Timer not found' });
    }

    const startedAt = new Date(timerResult.rows[0].started_at);
    const durationMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000);

    const result = await client.query(
      `UPDATE public.time_logs SET ended_at = NOW(), duration_minutes = $1, note = COALESCE($2, note) WHERE id = $3 RETURNING *`,
      [durationMinutes, req.body.note || null, timerResult.rows[0].id]
    );

    await client.query('COMMIT');
    res.status(200).json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
