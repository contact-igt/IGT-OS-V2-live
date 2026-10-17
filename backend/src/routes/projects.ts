import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/auditLog';
import { UUID_RE } from '../lib/projectAccess';

// Client projects: details, a timeline, and who worked on it. The team and the hours are DERIVED from the
// tasks linked to the project and their timer logs (time_logs), so there is no second list to keep in sync.
const router = Router();
const STAFF = ['admin', 'ops', 'super_admin'];
const isStaff = (req: Request) => STAFF.includes(req.user.role);

export const PROJECT_STATUSES = ['planned', 'active', 'on_hold', 'completed', 'cancelled'];
// Meetings come from the AI meeting notes (linked via meetings.project_id), so only plain notes and recording links are typed in here.
const EVENT_TYPES = ['note', 'recording'];

// A task going back from review to in-progress is a rework round (audit meta is written by tasks.ts as "<from> → <to>").
const REWORK_STEP = 'in_review → in_progress';
// First time each person worked on a project task: first timer start, or first move to in_progress by an assignee.
const STARTS_CTE = `starts AS (
  SELECT s.user_id, MIN(s.at) AS at FROM (
    SELECT tl.user_id, tl.started_at AS at FROM public.time_logs tl WHERE tl.task_id IN (SELECT id FROM pt)
    UNION ALL
    SELECT l.actor_id, l.created_at FROM public.audit_log l JOIN pt ON pt.id::text = l.entity_id
     WHERE l.entity = 'Task' AND l.action = 'task_status_change' AND l.meta LIKE '% → in_progress' AND l.actor_id = ANY(pt.assigned_to)
  ) s WHERE s.user_id IS NOT NULL GROUP BY s.user_id
)`;

const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const dateOrNull = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const httpUrl = (v: unknown): string | null | false => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || v.length > 500 || !/^https?:\/\/\S+$/i.test(v.trim())) return false;
  return v.trim();
};

async function audit(pool: Pool, req: Request, action: string, name: string, id: string, meta?: string) {
  await logAudit(pool, { actorId: req.user.id, actorName: req.user.name || req.user.email, action, entity: 'Project', entityRef: name, entityId: id, meta });
}

// Staff see every project; others only projects they lead or have a task on.
const MEMBER_SQL = `(p.lead_id = $2 OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.project_id = p.id AND ($2 = ANY(t.assigned_to) OR t.created_by = $2)))`;
async function canView(pool: Pool, req: Request, projectId: string): Promise<boolean> {
  if (isStaff(req)) return true;
  const r = await pool.query(`SELECT 1 FROM public.projects p WHERE p.id = $1 AND ${MEMBER_SQL}`, [projectId, req.user.id]);
  return r.rows.length > 0;
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  try {
    const r = await pool.query(
      `SELECT p.*, c.name AS client_name, lu.name AS lead_name,
         (SELECT count(*) FROM public.tasks t WHERE t.project_id = p.id)::int AS tasks_total,
         (SELECT count(*) FROM public.tasks t WHERE t.project_id = p.id AND t.status = 'done')::int AS tasks_done,
         COALESCE((SELECT sum(tl.duration_minutes) FROM public.time_logs tl JOIN public.tasks t ON t.id = tl.task_id WHERE t.project_id = p.id), 0)::int AS minutes_logged
       FROM public.projects p
       JOIN public.clients c ON c.id = p.client_id
       LEFT JOIN public.users lu ON lu.id = p.lead_id
       WHERE ($1::boolean OR ${MEMBER_SQL})
       ORDER BY CASE p.status WHEN 'active' THEN 0 WHEN 'planned' THEN 1 WHEN 'on_hold' THEN 2 ELSE 3 END, p.created_at DESC
       LIMIT 200`,
      [isStaff(req), req.user.id]
    );
    res.json(r.rows);
  } catch (e) { console.error('projects list error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!isStaff(req)) return res.status(403).json({ error: 'Only admin or ops can create projects' });
  const b = req.body || {};
  const name = text(b.name, 200);
  if (!name || typeof b.clientId !== 'string' || !UUID_RE.test(b.clientId)) return res.status(400).json({ error: 'name and clientId are required' });
  const status = b.status ?? 'planned';
  if (!PROJECT_STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of: ${PROJECT_STATUSES.join(', ')}` });
  const repoUrl = httpUrl(b.repoUrl);
  if (repoUrl === false) return res.status(400).json({ error: 'repoUrl must be an http(s) link' });
  try {
    const client = await pool.query('SELECT 1 FROM public.clients WHERE id = $1', [b.clientId]);
    if (!client.rows.length) return res.status(400).json({ error: 'Unknown client' });
    if (b.leadId) {
      const lead = await pool.query('SELECT 1 FROM public.users WHERE id = $1', [b.leadId]);
      if (!lead.rows.length) return res.status(400).json({ error: 'Unknown lead' });
    }
    const r = await pool.query(
      `INSERT INTO public.projects (client_id, name, description, status, start_date, target_date, lead_id, repo_url, created_by, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $4 = 'completed' THEN now() ELSE NULL END) RETURNING *`,
      [b.clientId, name, text(b.description, 4000), status, dateOrNull(b.startDate), dateOrNull(b.targetDate), b.leadId || null, repoUrl, req.user.id]
    );
    const p = r.rows[0];
    await pool.query(`INSERT INTO public.project_events (project_id, event_type, note, actor_id) VALUES ($1, 'created', $2, $3)`, [p.id, `Project created (${status})`, req.user.id]);
    await audit(pool, req, 'project_created', p.name, p.id, `Status: ${status}`);
    res.status(201).json(p);
  } catch (e) { console.error('project create error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const id = req.params.id;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'Project not found' });
  try {
    if (!(await canView(pool, req, id))) return res.status(404).json({ error: 'Project not found' });
    const proj = await pool.query(
      `SELECT p.*, c.name AS client_name, lu.name AS lead_name,
         (GREATEST(0, COALESCE(p.completed_at, now())::date - COALESCE(p.start_date, p.created_at::date)))::int AS elapsed_days
       FROM public.projects p JOIN public.clients c ON c.id = p.client_id LEFT JOIN public.users lu ON lu.id = p.lead_id
       WHERE p.id = $1`, [id]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Project not found' });

    const team = await pool.query(
      `WITH pt AS (SELECT id, assigned_to, status FROM public.tasks WHERE project_id = $1),
            ${STARTS_CTE},
            ids AS (
              SELECT unnest(assigned_to) AS user_id FROM pt
              UNION SELECT user_id FROM public.time_logs WHERE task_id IN (SELECT id FROM pt)
              UNION SELECT lead_id FROM public.projects WHERE id = $1 AND lead_id IS NOT NULL)
       SELECT u.id, u.name, u.title, u.department,
         (u.id = (SELECT lead_id FROM public.projects WHERE id = $1)) AS is_lead,
         COALESCE((SELECT sum(tl.duration_minutes) FROM public.time_logs tl WHERE tl.user_id = u.id AND tl.task_id IN (SELECT id FROM pt)), 0)::int AS minutes_logged,
         (SELECT count(*) FROM pt WHERE u.id = ANY(pt.assigned_to))::int AS tasks_assigned,
         (SELECT count(*) FROM pt WHERE u.id = ANY(pt.assigned_to) AND pt.status = 'done')::int AS tasks_done,
         (SELECT at FROM starts WHERE starts.user_id = u.id) AS started_at
       FROM ids JOIN public.users u ON u.id = ids.user_id
       ORDER BY minutes_logged DESC, u.name`, [id]);

    const tasks = await pool.query(
      `SELECT t.id, t.title, t.status, t.deadline_date, t.completed_at, t.assigned_to,
         COALESCE((SELECT sum(tl.duration_minutes) FROM public.time_logs tl WHERE tl.task_id = t.id), 0)::int AS minutes_logged,
         COALESCE((SELECT string_agg(u.name, ', ' ORDER BY u.name) FROM public.users u WHERE u.id = ANY(t.assigned_to)), '') AS assignee_names,
         (SELECT count(*) FROM public.audit_log l WHERE l.entity = 'Task' AND l.entity_id = t.id::text AND l.action = 'task_status_change' AND l.meta = $2)::int AS rework_count
       FROM public.tasks t WHERE t.project_id = $1 ORDER BY t.created_at`, [id, REWORK_STEP]);

    const staff = isStaff(req);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const beforeRaw = typeof req.query.before === 'string' ? new Date(req.query.before) : null;
    const before = beforeRaw && !Number.isNaN(beforeRaw.getTime()) ? beforeRaw.toISOString() : null;

    const timeline = await pool.query(
      `WITH pt AS (SELECT id, assigned_to FROM public.tasks WHERE project_id = $1),
       ${STARTS_CTE},
       tl AS (
         SELECT e.created_at AS at, e.event_type AS type, e.note AS text, e.link_url AS link, u.name AS actor
           FROM public.project_events e LEFT JOIN public.users u ON u.id = e.actor_id WHERE e.project_id = $1
         UNION ALL
         SELECT st.at, 'dev_started', u.name || ' started working on this project', NULL, u.name
           FROM starts st JOIN public.users u ON u.id = st.user_id
         UNION ALL
         SELECT l.created_at, CASE l.action WHEN 'task_create' THEN 'task_created' WHEN 'task_status_change' THEN 'task_status' ELSE 'task_assigned' END,
                l.entity_ref || COALESCE(' — ' || l.meta, ''), NULL, l.actor_name
           FROM public.audit_log l
          WHERE l.entity = 'Task' AND l.action IN ('task_create', 'task_status_change', 'task_assign_change')
            AND l.entity_id IN (SELECT id::text FROM pt)
         UNION ALL
         SELECT m.created_at, 'meeting', m.title || COALESCE(' — ' || NULLIF(left(m.result->>'summary', 300), ''), ''),
                CASE WHEN $4::boolean OR m.created_by = $5 THEN '/meetings/' || m.id::text END, u.name
           FROM public.meetings m LEFT JOIN public.users u ON u.id = m.created_by WHERE m.project_id = $1
         UNION ALL
         SELECT cr.created_at, 'change_requested', cr.title || ' (' || replace(cr.classification, '_', ' ') || ')',
                CASE WHEN $4::boolean THEN '/delivery' END, u.name
           FROM public.change_requests cr LEFT JOIN public.users u ON u.id = cr.created_by WHERE cr.project_id = $1
         UNION ALL
         SELECT cr.decided_at, 'change_decided',
                cr.title || ' — ' || cr.decision || CASE WHEN cr.roadmap_bucket <> 'none' THEN ' (roadmap: ' || cr.roadmap_bucket || ')' ELSE '' END,
                CASE WHEN $4::boolean THEN '/delivery' END, du.name
           FROM public.change_requests cr LEFT JOIN public.users du ON du.id = cr.decided_by
          WHERE cr.project_id = $1 AND cr.decision <> 'pending' AND cr.decided_at IS NOT NULL
         UNION ALL
         SELECT b.created_at, 'blocker_raised', b.title || ': ' || b.reason, NULL, u.name
           FROM public.blockers b JOIN public.tasks t ON t.id = b.task_id LEFT JOIN public.users u ON u.id = b.created_by WHERE t.project_id = $1
         UNION ALL
         SELECT b.resolved_at, 'blocker_resolved', b.title, NULL, u.name
           FROM public.blockers b JOIN public.tasks t ON t.id = b.task_id LEFT JOIN public.users u ON u.id = b.resolved_by
          WHERE t.project_id = $1 AND b.resolved_at IS NOT NULL
       )
       SELECT * FROM tl WHERE ($2::timestamptz IS NULL OR at < $2::timestamptz) ORDER BY at DESC LIMIT $3`,
      [id, before, limit + 1, staff, req.user.id]);
    const hasMore = timeline.rows.length > limit;
    const page = timeline.rows.slice(0, limit);

    const summaryQ = await pool.query(
      `WITH pt AS (SELECT id, assigned_to FROM public.tasks WHERE project_id = $1),
       ${STARTS_CTE}
       SELECT (SELECT count(*) FROM public.meetings WHERE project_id = $1)::int AS meetings_held,
              (SELECT max(created_at) FROM public.meetings WHERE project_id = $1) AS last_meeting_at,
              (SELECT count(*) FROM public.change_requests WHERE project_id = $1 AND decision = 'pending')::int AS open_changes,
              (SELECT count(*) FROM starts)::int AS developers_started,
              (SELECT count(*) FROM public.audit_log l WHERE l.entity = 'Task' AND l.action = 'task_status_change' AND l.meta = $2
                 AND l.entity_id IN (SELECT id::text FROM pt))::int AS rework_rounds`, [id, REWORK_STEP]);

    // Meeting reviews and change requests are shown as a small, explicit projection: never the transcript, the
    // role-specific AI insights, or commercial impact figures.
    const meetingsQ = await pool.query(
      `SELECT m.id, m.title, m.created_at, u.name AS created_by_name, m.result->>'summary' AS summary, m.result->'decisions' AS decisions,
              COALESCE(array_length(m.tasks_created, 1), 0)::int AS tasks_created,
              (SELECT count(*) FROM public.change_requests cr WHERE cr.meeting_id = m.id)::int AS changes_raised,
              ($2::boolean OR m.created_by = $3) AS can_open
         FROM public.meetings m LEFT JOIN public.users u ON u.id = m.created_by WHERE m.project_id = $1 ORDER BY m.created_at DESC LIMIT 50`,
      [id, staff, req.user.id]);
    const meetings = meetingsQ.rows.map((m: any) => ({
      id: m.id, title: m.title, created_at: m.created_at, created_by_name: m.created_by_name, can_open: m.can_open,
      summary: m.summary ? String(m.summary).slice(0, 1000) : null,
      decisions: (Array.isArray(m.decisions) ? m.decisions : []).slice(0, 8)
        .map((d: any) => (typeof d === 'string' ? d : d?.decision)).filter(Boolean).map((d: any) => String(d).slice(0, 300)),
      tasks_created: m.tasks_created, changes_raised: m.changes_raised,
    }));

    const changes = await pool.query(
      `SELECT cr.id, cr.title, cr.classification, cr.priority, cr.decision, cr.roadmap_bucket, cr.created_at, cr.decided_at, cr.meeting_id, m.title AS meeting_title
         FROM public.change_requests cr LEFT JOIN public.meetings m ON m.id = cr.meeting_id
        WHERE cr.project_id = $1 ORDER BY cr.created_at DESC LIMIT 100`, [id]);

    const minutes = team.rows.reduce((s: number, m: { minutes_logged: number }) => s + m.minutes_logged, 0);
    res.json({
      ...proj.rows[0], team: team.rows, tasks: tasks.rows, meetings, changes: changes.rows, summary: summaryQ.rows[0],
      timeline: page, timeline_has_more: hasMore, timeline_next: hasMore ? page[page.length - 1].at : null,
      minutes_logged: minutes,
      provenance: {
        team: 'DERIVED from tasks assigned to this project and timer logs',
        hours: 'DATABASE timer logs (time_logs); manual entry not included',
        timeline: 'DATABASE project updates, linked AI meetings, change requests, task audit events, blockers',
        started: 'DERIVED from each person\'s first timer start or first move to in progress on a project task',
      },
    });
  } catch (e) { console.error('project detail error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const id = req.params.id;
  if (!isStaff(req)) return res.status(403).json({ error: 'Only admin or ops can edit projects' });
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'Project not found' });
  const b = req.body || {};
  if (b.status !== undefined && !PROJECT_STATUSES.includes(b.status)) return res.status(400).json({ error: `status must be one of: ${PROJECT_STATUSES.join(', ')}` });
  const repoUrl = b.repoUrl === undefined ? undefined : httpUrl(b.repoUrl);
  if (repoUrl === false) return res.status(400).json({ error: 'repoUrl must be an http(s) link' });
  if (b.name !== undefined && !text(b.name, 200)) return res.status(400).json({ error: 'name cannot be empty' });
  try {
    const before = await pool.query('SELECT * FROM public.projects WHERE id = $1', [id]);
    if (!before.rows.length) return res.status(404).json({ error: 'Project not found' });
    if (b.leadId) {
      const lead = await pool.query('SELECT 1 FROM public.users WHERE id = $1', [b.leadId]);
      if (!lead.rows.length) return res.status(400).json({ error: 'Unknown lead' });
    }
    const old = before.rows[0];
    const r = await pool.query(
      `UPDATE public.projects SET
         name = COALESCE($2, name), description = CASE WHEN $3::boolean THEN $4 ELSE description END,
         status = COALESCE($5, status),
         start_date = CASE WHEN $6::boolean THEN $7::date ELSE start_date END,
         target_date = CASE WHEN $8::boolean THEN $9::date ELSE target_date END,
         lead_id = CASE WHEN $10::boolean THEN $11 ELSE lead_id END,
         repo_url = CASE WHEN $12::boolean THEN $13 ELSE repo_url END,
         completed_at = CASE WHEN $5 = 'completed' AND completed_at IS NULL THEN now() WHEN $5 IS NOT NULL AND $5 <> 'completed' THEN NULL ELSE completed_at END,
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, text(b.name, 200), b.description !== undefined, text(b.description, 4000), b.status ?? null,
       b.startDate !== undefined, dateOrNull(b.startDate), b.targetDate !== undefined, dateOrNull(b.targetDate),
       b.leadId !== undefined, b.leadId || null, repoUrl !== undefined, repoUrl ?? null]
    );
    const p = r.rows[0];
    if (b.status && b.status !== old.status) {
      await pool.query(`INSERT INTO public.project_events (project_id, event_type, note, actor_id) VALUES ($1, 'status_changed', $2, $3)`, [id, `${old.status} → ${b.status}`, req.user.id]);
      await audit(pool, req, 'project_status_change', p.name, id, `${old.status} → ${b.status}`);
    } else {
      await audit(pool, req, 'project_edited', p.name, id);
    }
    res.json(p);
  } catch (e) { console.error('project update error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

// Notes and recording links on the project timeline. Any member (or staff) may add one.
router.post('/:id/events', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const id = req.params.id;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'Project not found' });
  const b = req.body || {};
  const note = text(b.note, 2000);
  const link = httpUrl(b.linkUrl);
  if (!EVENT_TYPES.includes(b.type)) return res.status(400).json({ error: `type must be one of: ${EVENT_TYPES.join(', ')}` });
  if (link === false) return res.status(400).json({ error: 'linkUrl must be an http(s) link' });
  if (!note && !link) return res.status(400).json({ error: 'note or linkUrl is required' });
  try {
    if (!(await canView(pool, req, id))) return res.status(404).json({ error: 'Project not found' });
    const r = await pool.query(
      `INSERT INTO public.project_events (project_id, event_type, note, link_url, actor_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, b.type, note, link, req.user.id]);
    const p = await pool.query('SELECT name FROM public.projects WHERE id = $1', [id]);
    await audit(pool, req, `project_${b.type}_added`, p.rows[0]?.name || id, id);
    res.status(201).json(r.rows[0]);
  } catch (e) { console.error('project event error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

// Link an existing task to the project (same client only). Staff only.
router.post('/:id/tasks', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const id = req.params.id;
  if (!isStaff(req)) return res.status(403).json({ error: 'Only admin or ops can attach tasks' });
  const taskId = req.body?.taskId;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'Project not found' });
  if (typeof taskId !== 'string' || !UUID_RE.test(taskId)) return res.status(400).json({ error: 'taskId is required' });
  try {
    const p = await pool.query('SELECT name, client_id FROM public.projects WHERE id = $1', [id]);
    if (!p.rows.length) return res.status(404).json({ error: 'Project not found' });
    const t = await pool.query('SELECT title, client_id FROM public.tasks WHERE id = $1', [taskId]);
    if (!t.rows.length) return res.status(400).json({ error: 'Unknown task' });
    if (t.rows[0].client_id !== p.rows[0].client_id) return res.status(400).json({ error: "Task belongs to a different client than this project" });
    await pool.query('UPDATE public.tasks SET project_id = $1 WHERE id = $2', [id, taskId]);
    await pool.query(`INSERT INTO public.project_events (project_id, event_type, note, actor_id) VALUES ($1, 'note', $2, $3)`, [id, `Task added: ${t.rows[0].title}`, req.user.id]);
    await audit(pool, req, 'project_task_added', p.rows[0].name, id, t.rows[0].title);
    res.status(204).end();
  } catch (e) { console.error('project attach error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id/tasks/:taskId', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!isStaff(req)) return res.status(403).json({ error: 'Only admin or ops can detach tasks' });
  const { id, taskId } = req.params;
  if (!UUID_RE.test(id) || !UUID_RE.test(taskId)) return res.status(404).json({ error: 'Not found' });
  try {
    const r = await pool.query('UPDATE public.tasks SET project_id = NULL WHERE id = $1 AND project_id = $2 RETURNING title', [taskId, id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Task is not on this project' });
    await pool.query(`INSERT INTO public.project_events (project_id, event_type, note, actor_id) VALUES ($1, 'note', $2, $3)`, [id, `Task removed: ${r.rows[0].title}`, req.user.id]);
    res.status(204).end();
  } catch (e) { console.error('project detach error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
