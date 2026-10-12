import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../lib/auditLog';
import { postDepartmentTaskAssignmentAlert, ALERTING_DEPARTMENTS } from '../lib/googleChat';

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
    // goal | task | subtask — drives the Goals view and the goal→subtask nesting.
    type: row.type || 'task',
    parentId: row.parent_task_id,
    dependencies: row.dependencies || [],
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Total minutes actually logged across all completed time_logs sessions for this task —
    // defaults to 0 for a task with no sessions yet, never undefined/NaN.
    loggedMinutes: row.logged_minutes != null ? Number(row.logged_minutes) : 0,
    // Free-text — the New Task form offers common types as suggestions but allows any value.
    taskType: row.task_type || undefined,
    // When this task was marked done; drives the 7-day archive window on the boards.
    // Omitted (rather than null) for anything not currently done, matching the optional
    // completedAt the frontend's Task type already declares.
    completedAt: row.completed_at || undefined,
    // Attachments on this task: either an external link (url) or an uploaded file stored in
    // Postgres (isFile: true, fetched via the download endpoint below).
    assets: row.assets || [],
    // Review / revision / discussion thread (persisted in task_comments, oldest first)
    reviewComments: row.comments || [],
  };
}

// Aggregates task_assets into the { name, url } array shape serializeTask expects. Kept as
// a correlated subquery (rather than a LEFT JOIN) so a task with several assets doesn't
// multiply the task row and skew the logged_minutes join alongside it.
// file_data is deliberately NOT selected — only whether it exists — so listing tasks never
// drags every uploaded file's bytes through the query. Files are fetched on demand from the
// download endpoint instead.
const COMMENTS_SUBQUERY = `
  (SELECT COALESCE(json_agg(json_build_object(
      'id', c.id, 'authorId', c.user_id, 'text', c.content, 'createdAt', c.created_at
    ) ORDER BY c.created_at), '[]'::json)
   FROM public.task_comments c WHERE c.task_id = t.id) AS comments
`;

const ASSETS_SUBQUERY = `
  (SELECT COALESCE(json_agg(json_build_object(
      'id', a.id,
      'name', a.file_name,
      'url', a.file_url,
      'isFile', (a.file_data IS NOT NULL),
      'sizeBytes', a.file_size_bytes,
      'mimeType', a.mime_type
    ) ORDER BY a.created_at), '[]'::json)
   FROM public.task_assets a WHERE a.task_id = t.id) AS assets
`;

// Replaces a task's asset rows wholesale. Both the NewTaskModal (create) and the
// TaskDrawer/StopTimerModal (update) send the full intended list rather than a delta, so a
// delete-then-insert keeps the table in step with exactly what the client submitted.
async function replaceTaskAssets(pool: Pool, taskId: string, assets: any, userId: string | null) {
  if (!Array.isArray(assets)) return; // undefined = "not editing assets", leave existing rows alone

  // Only link-style rows are replaced. Uploaded files (file_data IS NOT NULL) are managed
  // through the dedicated upload/delete endpoints, so a link edit must never delete someone's
  // attached file as a side effect.
  await pool.query('DELETE FROM public.task_assets WHERE task_id = $1 AND file_data IS NULL', [taskId]);

  const valid = assets.filter((a: any) => a && !a.isFile && typeof a.url === 'string' && a.url.trim());
  for (const asset of valid) {
    await pool.query(
      `INSERT INTO public.task_assets (task_id, uploaded_by, file_name, file_url) VALUES ($1, $2, $3, $4)`,
      [taskId, userId, (asset.name || 'Link').toString().slice(0, 255), asset.url.trim()]
    );
  }
}

// { development: ['Naveen', 'Veeravel'], design: ['Karan'] } — so a task spanning two
// departments posts one alert per Space, each naming only that Space's own assignees.
function groupNamesByDepartment(rows: { name: string; department: string }[]): Record<string, string[]> {
  return rows.reduce((acc, row) => {
    (acc[row.department] ||= []).push(row.name);
    return acc;
  }, {} as Record<string, string[]>);
}

async function fetchTaskAssets(pool: Pool, taskId: string) {
  const result = await pool.query(
    `SELECT id, file_name AS name, file_url AS url, (file_data IS NOT NULL) AS "isFile",
            file_size_bytes AS "sizeBytes", mime_type AS "mimeType"
     FROM public.task_assets WHERE task_id = $1 ORDER BY created_at`,
    [taskId]
  );
  return result.rows;
}

function splitDeadline(deadline?: string | null): { date: string | null; time: string | null } {
  if (!deadline) return { date: null, time: null };
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return { date: null, time: null };
  return { date: d.toISOString().split('T')[0], time: d.toISOString().split('T')[1].slice(0, 8) };
}

// GET /api/tasks — all tasks for admin/ops, only assigned tasks for everyone else
// Object-level authorization: admin/ops/super_admin may touch any task; everyone else only tasks
// they are assigned to or created (the same visibility rule GET / applies). Missing tasks pass
// through so the route's own 404 handling still applies.
const TASK_STAFF_ROLES = ['admin', 'ops', 'super_admin'];
const TASK_STATUSES = ['todo', 'in_progress', 'paused', 'in_review', 'done', 'blocked', 'cancelled'];
const TASK_PRIORITIES = ['critical', 'high', 'medium', 'low'];
const MAX_COMMENT_LENGTH = 4000;

// Server-owned audit trail for task state changes: actor comes from the verified session, never the client.
async function auditTask(pool: Pool, req: Request, action: string, task: { id: string; title: string; client_id?: string | null }, meta?: string) {
  let clientName: string | null = null;
  if (task.client_id) {
    const c = await pool.query('SELECT name FROM public.clients WHERE id = $1', [task.client_id]).catch(() => null);
    clientName = c?.rows[0]?.name || null;
  }
  await logAudit(pool, {
    actorId: req.user.id, actorName: req.user.name || req.user.email, action, entity: 'Task',
    entityRef: task.title, entityId: task.id, clientName: clientName || '—', meta,
  });
}
async function userNames(pool: Pool, ids: string[]): Promise<string> {
  if (!ids.length) return 'nobody';
  const r = await pool.query('SELECT name FROM public.users WHERE id = ANY($1) ORDER BY name', [ids]);
  return r.rows.map(x => x.name).join(', ') || ids.join(', ');
}

async function canAccessTask(pool: Pool, user: { id: string; role: string }, taskId: string): Promise<boolean> {
  if (TASK_STAFF_ROLES.includes(user.role)) return true;
  const r = await pool.query(
    'SELECT ($2 = ANY(assigned_to) OR created_by = $2) AS ok FROM public.tasks WHERE id = $1',
    [taskId, user.id]
  );
  return r.rows.length === 0 || r.rows[0].ok === true;
}
function requireTaskAccess(req: Request, res: Response, next: NextFunction) {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  canAccessTask(pool, req.user, req.params.id)
    .then(ok => (ok ? next() : res.status(403).json({ error: 'Forbidden' })))
    .catch(() => res.status(400).json({ error: 'Invalid task id' }));
}
// Same rule for /assets/:assetId routes, resolved through the asset's owning task.
async function requireAssetAccess(req: Request, res: Response, next: NextFunction) {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  try {
    const a = await pool.query('SELECT task_id FROM public.task_assets WHERE id = $1', [req.params.assetId]);
    if (a.rows.length === 0) return res.status(404).json({ error: 'File not found' });
    if (!(await canAccessTask(pool, req.user, a.rows[0].task_id))) return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch {
    res.status(400).json({ error: 'Invalid asset id' });
  }
}

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
      query = `SELECT t.*, tl.logged_minutes, ${ASSETS_SUBQUERY}, ${COMMENTS_SUBQUERY} FROM public.tasks t ${loggedMinutesJoin} ORDER BY t.created_at DESC`;
    } else {
      query = `SELECT t.*, tl.logged_minutes, ${ASSETS_SUBQUERY}, ${COMMENTS_SUBQUERY} FROM public.tasks t ${loggedMinutesJoin} WHERE $1 = ANY(t.assigned_to) OR t.created_by = $1 ORDER BY t.created_at DESC`;
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
      deadline, estimatedHours, parentId, dependencies, tags, assets, taskType, type,
    } = req.body;

    if (!title || !clientId || !category) {
      return res.status(400).json({ error: 'title, clientId, and category are required' });
    }
    if (status && !TASK_STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of: ${TASK_STATUSES.join(', ')}` });
    if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ error: `priority must be one of: ${TASK_PRIORITIES.join(', ')}` });

    const { date: deadlineDate, time: deadlineTime } = splitDeadline(deadline);

    const query = `
      INSERT INTO public.tasks
        (title, description, client_id, category, assigned_to, created_by, priority, status,
         deadline_date, deadline_time, time_estimate_minutes, parent_task_id, dependencies, tags, task_type,
         type, completed_at)
      -- $8 is pinned to text and cast up to task_status here, rather than being inferred as
      -- the enum and cast down to text in the CASE below. Mixing the two directions on one
      -- parameter makes Postgres bail with "inconsistent types deduced for parameter $8".
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::task_status, $9, $10, $11, $12, $13, $14, $15,
              $16, CASE WHEN $8 = 'done' THEN now() ELSE NULL END)
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
      taskType ? String(taskType).trim().slice(0, 100) || null : null,
      // A task carrying a parent is a subtask regardless of what the client claimed, which
      // keeps the hierarchy self-consistent.
      ['goal', 'task', 'subtask'].includes(type) ? type : (parentId ? 'subtask' : 'task'),
    ];

    const result = await pool.query(query, params);
    const createdTask = result.rows[0];

    await replaceTaskAssets(pool, createdTask.id, assets, req.user.id);
    createdTask.assets = await fetchTaskAssets(pool, createdTask.id);

    await auditTask(pool, req, 'task_create', { id: createdTask.id, title, client_id: clientId }, `Priority: ${priority || 'medium'}`);

    // Fire-and-forget: alert each department's Chat space that has an assignee on this task
    // (Development and Design today — see DEPARTMENT_WEBHOOK_ENV). Not awaited so a slow or
    // failing webhook never delays the task-create response.
    if (assignedTo && assignedTo.length > 0) {
      (async () => {
        try {
          const deptRes = await pool.query(
            `SELECT name, department FROM public.users WHERE id = ANY($1) AND department = ANY($2)`,
            [assignedTo, ALERTING_DEPARTMENTS]
          );
          if (deptRes.rows.length === 0) return;

          const clientRes = await pool.query('SELECT name FROM public.clients WHERE id = $1', [clientId]);
          const byDepartment = groupNamesByDepartment(deptRes.rows);

          for (const [department, names] of Object.entries(byDepartment)) {
            await postDepartmentTaskAssignmentAlert(
              department,
              { title, priority: priority || 'medium', deadline, clientName: clientRes.rows[0]?.name },
              names
            );
          }
        } catch (err) {
          console.error('Failed to post task assignment alerts:', err);
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
router.put('/:id', requireAuth, requireTaskAccess, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.params;
    const { title, description, category, priority, status, assignedTo, deadline, estimatedHours, tags, assets, taskType } = req.body;

    if (status && !TASK_STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of: ${TASK_STATUSES.join(', ')}` });
    if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ error: `priority must be one of: ${TASK_PRIORITIES.join(', ')}` });

    // Pre-update snapshot: drives the audit diff below and the Chat alert, which must fire only for
    // genuinely *new* dev-department assignees (re-saving the same array on an unrelated edit must not re-post).
    const prevRes = await pool.query('SELECT title, client_id, status, priority, assigned_to, deadline_date FROM public.tasks WHERE id = $1', [id]);
    const before = prevRes.rows[0];
    const previousAssignedTo: string[] = before?.assigned_to || [];

    const hasDeadline = deadline !== undefined;
    const { date: deadlineDate, time: deadlineTime } = hasDeadline ? splitDeadline(deadline) : { date: null, time: null };

    const query = `
      UPDATE public.tasks
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        priority = COALESCE($4, priority),
        status = COALESCE($5::task_status, status),
        assigned_to = COALESCE($6, assigned_to),
        deadline_date = CASE WHEN $7 THEN $8 ELSE deadline_date END,
        deadline_time = CASE WHEN $7 THEN $9 ELSE deadline_time END,
        time_estimate_minutes = COALESCE($10, time_estimate_minutes),
        tags = COALESCE($11, tags),
        task_type = COALESCE($13, task_type),
        -- Stamped the moment a task becomes done, and cleared if it's reopened, so the
        -- 7-day archive window measures actual completion rather than last edit. Re-saving
        -- an already-done task keeps its original timestamp instead of resetting the clock.
        -- $5 stays text here (cast up to task_status above) for the same reason as the INSERT.
        completed_at = CASE
          WHEN $5 = 'done' AND status <> 'done' THEN now()
          WHEN $5 IS NOT NULL AND $5 <> 'done' THEN NULL
          ELSE completed_at
        END,
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
      taskType !== undefined ? (String(taskType).trim().slice(0, 100) || null) : null,
    ];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    if (before) {
      const after = result.rows[0];
      const ref = { id, title: after.title, client_id: after.client_id };
      if (status && before.status !== after.status) await auditTask(pool, req, 'task_status_change', ref, `${before.status} → ${after.status}`);
      if (priority && before.priority !== after.priority) await auditTask(pool, req, 'task_priority_change', ref, `${before.priority} → ${after.priority}`);
      const prevDeadline = before.deadline_date ? String(before.deadline_date).slice(0, 10) : 'none';
      const newDeadline = after.deadline_date ? String(after.deadline_date).slice(0, 10) : 'none';
      if (hasDeadline && prevDeadline !== newDeadline) await auditTask(pool, req, 'task_deadline_change', ref, `${prevDeadline} → ${newDeadline}`);
      const newAssigned: string[] = after.assigned_to || [];
      if (assignedTo && [...previousAssignedTo].sort().join() !== [...newAssigned].sort().join()) {
        await auditTask(pool, req, 'task_assign_change', ref, `${await userNames(pool, previousAssignedTo)} → ${await userNames(pool, newAssigned)}`);
      }
    }

    // Only touches task_assets when the caller actually sent an assets array — an unrelated
    // edit (status change, rename) leaves existing links untouched.
    await replaceTaskAssets(pool, id, assets, req.user.id);
    result.rows[0].assets = await fetchTaskAssets(pool, id);

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

    // Fire-and-forget: alert each department's Chat space about *newly added* assignees only
    // (see previousAssignedTo above) — mirrors the same check on task creation, so re-saving
    // an unchanged assignee list never re-posts the same alert.
    if (assignedTo) {
      const newlyAdded = assignedTo.filter((uid: string) => !previousAssignedTo.includes(uid));
      if (newlyAdded.length > 0) {
        (async () => {
          try {
            const deptRes = await pool.query(
              `SELECT name, department FROM public.users WHERE id = ANY($1) AND department = ANY($2)`,
              [newlyAdded, ALERTING_DEPARTMENTS]
            );
            if (deptRes.rows.length === 0) return;

            const updatedTask = serializeTask(result.rows[0]);
            const clientRes = await pool.query('SELECT name FROM public.clients WHERE id = $1', [updatedTask.clientId]);
            const byDepartment = groupNamesByDepartment(deptRes.rows);

            for (const [department, names] of Object.entries(byDepartment)) {
              await postDepartmentTaskAssignmentAlert(
                department,
                { title: updatedTask.title, priority: updatedTask.priority, deadline: updatedTask.deadline, clientName: clientRes.rows[0]?.name },
                names
              );
            }
          } catch (err) {
            console.error('Failed to post task reassignment alerts:', err);
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

// ── File attachments ────────────────────────────────────────────────────────
// Files are stored as bytes in Postgres (task_assets.file_data) rather than on disk, since
// the app runs on ephemeral container storage where an uploaded file would vanish on the
// next deploy. MAX_UPLOAD_BYTES is deliberately conservative — Postgres is a workable home
// for briefs/mockups/spreadsheets, not for raw video.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

// POST /api/tasks/:id/assets — upload one file and attach it to this task.
router.post('/:id/assets', requireAuth, requireTaskAccess, (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err: any) => {
    // Multer surfaces the size cap as an error code rather than a rejected promise, so it's
    // translated here into a message the UI can show verbatim.
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` });
      }
      console.error('Upload error:', err);
      return res.status(400).json({ error: 'Upload failed' });
    }

    const pool: Pool = req.app.locals.pool;
    if (!pool) return res.status(500).json({ error: 'Database not configured' });
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    try {
      const taskExists = await pool.query('SELECT id FROM public.tasks WHERE id = $1', [req.params.id]);
      if (taskExists.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

      const result = await pool.query(
        `INSERT INTO public.task_assets (task_id, uploaded_by, file_name, file_data, file_size_bytes, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, file_name AS name, NULL AS url, true AS "isFile",
                   file_size_bytes AS "sizeBytes", mime_type AS "mimeType"`,
        [
          req.params.id,
          req.user.id,
          file.originalname.slice(0, 255),
          file.buffer,
          file.size,
          file.mimetype || 'application/octet-stream',
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error saving uploaded file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// GET /api/tasks/assets/:assetId/download — streams an uploaded file back. requireAuth keeps
// attachments behind the same login as the task itself; there are no public file URLs.
router.get('/assets/:assetId/download', requireAuth, requireAssetAccess, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query(
      'SELECT file_name, file_data, mime_type FROM public.task_assets WHERE id = $1',
      [req.params.assetId]
    );
    if (result.rows.length === 0 || !result.rows[0].file_data) {
      return res.status(404).json({ error: 'File not found' });
    }
    const { file_name, file_data, mime_type } = result.rows[0];
    res.setHeader('Content-Type', mime_type || 'application/octet-stream');
    // Quotes + encodeURIComponent so filenames with spaces or non-ASCII survive the header.
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file_name)}"`);
    res.send(file_data);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/assets/:assetId — removes an attachment (link or uploaded file).
router.delete('/assets/:assetId', requireAuth, requireAssetAccess, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const result = await pool.query('DELETE FROM public.task_assets WHERE id = $1 RETURNING id', [req.params.assetId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/comments - discussion / review / rework notes. Same visibility rule as the task itself.
router.post('/:id/comments', requireAuth, requireTaskAccess, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'text is required' });
  if (text.length > MAX_COMMENT_LENGTH) return res.status(400).json({ error: `text must be at most ${MAX_COMMENT_LENGTH} characters` });
  try {
    const t = await pool.query('SELECT id, title, client_id FROM public.tasks WHERE id = $1', [req.params.id]);
    if (t.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const r = await pool.query(
      'INSERT INTO public.task_comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, user_id, content, created_at',
      [req.params.id, req.user.id, text]
    );
    await auditTask(pool, req, 'commented', t.rows[0], text.slice(0, 200));
    const c = r.rows[0];
    res.status(201).json({ id: c.id, authorId: c.user_id, text: c.content, createdAt: c.created_at });
  } catch (error) {
    console.error('Error adding task comment:', error);
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
    const result = await pool.query('DELETE FROM public.tasks WHERE id = $1 RETURNING id, title, client_id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    await auditTask(pool, req, 'task_deleted', result.rows[0]);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/timer/start
router.post('/:id/timer/start', requireAuth, requireTaskAccess, async (req: Request, res: Response) => {
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
    const t = await pool.query('SELECT id, title, client_id FROM public.tasks WHERE id = $1', [id]);
    if (t.rows[0]) await auditTask(pool, req, 'timer_start', t.rows[0], 'Timer started');
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/timer/stop
router.post('/:id/timer/stop', requireAuth, requireTaskAccess, async (req: Request, res: Response) => {
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
      // Idempotent: a status change auto-closes running timers server-side, so a client's explicit stop can
      // legitimately arrive second. The caller's intent (no running timer) is already satisfied.
      await client.query('ROLLBACK');
      return res.status(200).json({ stopped: false, reason: 'no running timer' });
    }

    const startedAt = new Date(timerResult.rows[0].started_at);
    const durationMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000);

    const result = await client.query(
      `UPDATE public.time_logs SET ended_at = NOW(), duration_minutes = $1, note = COALESCE($2, note) WHERE id = $3 RETURNING *`,
      [durationMinutes, req.body.note || null, timerResult.rows[0].id]
    );

    await client.query('COMMIT');
    const t = await pool.query('SELECT id, title, client_id FROM public.tasks WHERE id = $1', [id]);
    if (t.rows[0]) await auditTask(pool, req, 'timer_stop', t.rows[0], `Timer stopped after ${durationMinutes} min`);
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
