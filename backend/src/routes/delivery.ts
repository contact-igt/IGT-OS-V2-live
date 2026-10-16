import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/auditLog';

// Structured blockers + client change requests ("client input must not silently destroy the roadmap").
const router = Router();
const STAFF = ['admin', 'ops', 'super_admin'];
const CEO_ROLES = ['admin', 'super_admin'];
const isStaff = (req: Request) => STAFF.includes(req.user.role);

export const BLOCKING_PARTIES = ['client', 'internal', 'vendor', 'platform', 'other'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const CR_CLASSES = ['bug', 'content_change', 'design_change', 'new_feature', 'integration_change', 'scope_change', 'production_issue'];
export const CR_SOURCES = ['whatsapp', 'email', 'call', 'meeting', 'portal', 'other'];
const DECISIONS = ['accepted', 'rejected', 'deferred'];
const BUCKETS = ['none', 'now', 'next', 'later'];
const RISKS = ['low', 'medium', 'high'];
const RECS = ['accept', 'reject', 'defer'];

const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const intOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN);
const dateOrNull = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

// A change is "material" (needs explicit CEO-level acceptance) if it changes scope/integrations/new features,
// or carries any timeline or commercial impact.
export function isMaterialChange(cr: { classification: string; timeline_impact_days: number | null; commercial_impact_inr: number | null }): boolean {
  return ['scope_change', 'new_feature', 'integration_change'].includes(cr.classification)
    || (cr.timeline_impact_days ?? 0) > 0 || (cr.commercial_impact_inr ?? 0) > 0;
}

async function audit(pool: Pool, req: Request, action: string, entity: string, ref: string, id: string, meta?: string) {
  await logAudit(pool, { actorId: req.user.id, actorName: req.user.name || req.user.email, action, entity, entityRef: ref, entityId: id, meta });
}

// ───────────── BLOCKERS ─────────────
async function canTouchTask(pool: Pool, req: Request, taskId: string): Promise<boolean> {
  if (isStaff(req)) return true;
  const r = await pool.query('SELECT ($2 = ANY(assigned_to) OR created_by = $2) AS ok FROM public.tasks WHERE id = $1', [taskId, req.user.id]);
  return r.rows.length > 0 && r.rows[0].ok === true;
}

router.get('/blockers', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const status = req.query.status === 'resolved' ? 'resolved' : 'open';
  try {
    const r = await pool.query(
      `SELECT b.*, c.name AS client_name, t.title AS task_title, ou.name AS owner_name, eu.name AS escalation_owner_name
       FROM public.blockers b
       LEFT JOIN public.clients c ON c.id = b.client_id LEFT JOIN public.tasks t ON t.id = b.task_id
       LEFT JOIN public.users ou ON ou.id = b.owner_id LEFT JOIN public.users eu ON eu.id = b.escalation_owner_id
       WHERE b.status = $1 AND ($2::boolean OR b.owner_id = $3 OR b.created_by = $3 OR $3 = ANY(t.assigned_to))
       ORDER BY CASE b.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, b.expected_resolution NULLS LAST
       LIMIT 200`,
      [status, isStaff(req), req.user.id]
    );
    res.json(r.rows);
  } catch (e) { console.error('blockers list error:', e); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/blockers', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const b = req.body || {};
  const title = text(b.title, 200), reason = text(b.reason, 2000);
  if (!title || !reason) return res.status(400).json({ error: 'title and reason are required' });
  if (!BLOCKING_PARTIES.includes(b.blockingParty)) return res.status(400).json({ error: `blockingParty must be one of: ${BLOCKING_PARTIES.join(', ')}` });
  const severity = b.severity ?? 'medium';
  if (!SEVERITIES.includes(severity)) return res.status(400).json({ error: `severity must be one of: ${SEVERITIES.join(', ')}` });
  try {
    let clientId: string | null = typeof b.clientId === 'string' ? b.clientId : null;
    if (b.taskId) {
      if (!(await canTouchTask(pool, req, b.taskId))) return res.status(403).json({ error: 'Forbidden' });
      const t = await pool.query('SELECT client_id FROM public.tasks WHERE id = $1', [b.taskId]);
      if (t.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
      clientId = t.rows[0].client_id;
    } else if (!isStaff(req)) {
      return res.status(403).json({ error: 'Only operations can raise a blocker that is not tied to one of your tasks' });
    }
    const r = await pool.query(
      `INSERT INTO public.blockers (task_id, client_id, title, reason, blocking_party, severity, owner_id, escalation_owner_id, expected_resolution, next_action, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.taskId || null, clientId, title, reason, b.blockingParty, severity, b.ownerId || req.user.id, b.escalationOwnerId || null, dateOrNull(b.expectedResolution), text(b.nextAction, 500), req.user.id]
    );
    await audit(pool, req, 'blocker_created', 'Blocker', title, r.rows[0].id, `${severity} · blocked by ${b.blockingParty}`);
    res.status(201).json(r.rows[0]);
  } catch (e) { console.error('blocker create error:', e); res.status(400).json({ error: 'Could not create blocker (check ids)' }); }
});

router.post('/blockers/:id/resolve', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  try {
    const cur = await pool.query('SELECT * FROM public.blockers WHERE id = $1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Blocker not found' });
    const b = cur.rows[0];
    if (!isStaff(req) && b.owner_id !== req.user.id && b.created_by !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (b.status === 'resolved') return res.status(409).json({ error: 'Already resolved' });
    const r = await pool.query(`UPDATE public.blockers SET status='resolved', resolved_at=now(), resolved_by=$2, resolution_note=$3 WHERE id=$1 RETURNING *`, [b.id, req.user.id, text(req.body?.note, 1000)]);
    await audit(pool, req, 'blocker_resolved', 'Blocker', b.title, b.id);
    res.json(r.rows[0]);
  } catch (e) { console.error('blocker resolve error:', e); res.status(400).json({ error: 'Invalid blocker id' }); }
});

// ───────────── CHANGE REQUESTS ─────────────
const CR_SELECT = `SELECT cr.*, c.name AS client_name, du.name AS decided_by_name FROM public.change_requests cr
  JOIN public.clients c ON c.id = cr.client_id LEFT JOIN public.users du ON du.id = cr.decided_by`;
const withMateriality = (row: any) => ({ ...row, is_material: isMaterialChange(row) });

router.get('/change-requests', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const decision = typeof req.query.decision === 'string' ? req.query.decision : null;
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : null;
  try {
    const r = await pool.query(
      `${CR_SELECT}
       WHERE ($1::text IS NULL OR cr.decision = $1) AND ($2::uuid IS NULL OR cr.client_id = $2)
         AND ($3::boolean OR cr.created_by = $4 OR (cr.decision = 'accepted' AND cr.linked_task_ids && ARRAY(SELECT id FROM public.tasks WHERE $4 = ANY(assigned_to) OR created_by = $4)))
       ORDER BY cr.created_at DESC LIMIT 200`,
      [decision, clientId, isStaff(req), req.user.id]
    );
    res.json(r.rows.map(withMateriality));
  } catch (e) { console.error('cr list error:', e); res.status(400).json({ error: 'Invalid filter' }); }
});

// Capture is open to everyone (speed matters: it must not live only in a WhatsApp message).
router.post('/change-requests', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const b = req.body || {};
  const title = text(b.title, 200), description = text(b.description, 4000);
  if (!b.clientId || !title || !description) return res.status(400).json({ error: 'clientId, title and description are required' });
  if (!CR_CLASSES.includes(b.classification)) return res.status(400).json({ error: `classification must be one of: ${CR_CLASSES.join(', ')}` });
  const source = b.source ?? 'other', priority = b.priority ?? 'medium';
  if (!CR_SOURCES.includes(source)) return res.status(400).json({ error: `source must be one of: ${CR_SOURCES.join(', ')}` });
  if (!SEVERITIES.includes(priority)) return res.status(400).json({ error: `priority must be one of: ${SEVERITIES.join(', ')}` });
  try {
    const r = await pool.query(
      `INSERT INTO public.change_requests (client_id, project_name, title, description, source, requested_by, received_at, classification, priority, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE),$8,$9,$10) RETURNING *`,
      [b.clientId, text(b.projectName, 200), title, description, source, text(b.requestedBy, 200), dateOrNull(b.receivedAt), b.classification, priority, req.user.id]
    );
    await audit(pool, req, 'change_request_created', 'ChangeRequest', title, r.rows[0].id, `${b.classification} · via ${source}`);
    res.status(201).json(withMateriality(r.rows[0]));
  } catch (e) { console.error('cr create error:', e); res.status(400).json({ error: 'Could not create change request (check clientId)' }); }
});

// Impact analysis / recommendation / reclassification - operations and leadership only.
router.patch('/change-requests/:id', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!isStaff(req)) return res.status(403).json({ error: 'Forbidden' });
  const b = req.body || {};
  const timeline = intOrNull(b.timelineImpactDays), money = intOrNull(b.commercialImpactInr);
  if (Number.isNaN(timeline) || Number.isNaN(money)) return res.status(400).json({ error: 'impact values must be numbers' });
  if (b.classification !== undefined && !CR_CLASSES.includes(b.classification)) return res.status(400).json({ error: 'invalid classification' });
  if (b.technicalRisk !== undefined && b.technicalRisk !== null && !RISKS.includes(b.technicalRisk)) return res.status(400).json({ error: 'invalid technicalRisk' });
  if (b.recommendedDecision !== undefined && b.recommendedDecision !== null && !RECS.includes(b.recommendedDecision)) return res.status(400).json({ error: 'invalid recommendedDecision' });
  try {
    const cur = await pool.query('SELECT decision FROM public.change_requests WHERE id = $1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Change request not found' });
    if (cur.rows[0].decision !== 'pending') return res.status(409).json({ error: 'Decided change requests are immutable' });
    const r = await pool.query(
      `UPDATE public.change_requests SET
         classification = COALESCE($2, classification), scope_impact = COALESCE($3, scope_impact),
         timeline_impact_days = CASE WHEN $4::boolean THEN $5 ELSE timeline_impact_days END,
         commercial_impact_inr = CASE WHEN $6::boolean THEN $7 ELSE commercial_impact_inr END,
         technical_risk = COALESCE($8, technical_risk), recommended_decision = COALESCE($9, recommended_decision),
         recommended_by = CASE WHEN $9::text IS NOT NULL THEN $10 ELSE recommended_by END, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, b.classification ?? null, text(b.scopeImpact, 2000), b.timelineImpactDays !== undefined, timeline, b.commercialImpactInr !== undefined, money,
        b.technicalRisk ?? null, b.recommendedDecision ?? null, req.user.id]
    );
    await audit(pool, req, 'change_request_analysed', 'ChangeRequest', r.rows[0].title, r.rows[0].id);
    res.json(withMateriality(r.rows[0]));
  } catch (e) { console.error('cr patch error:', e); res.status(400).json({ error: 'Invalid change request' }); }
});

// Decision rules: material changes need CEO-level (admin/super_admin) acceptance AND a completed impact analysis;
// reject/defer need a reason; accepted changes can be placed on the roadmap (now/next/later).
router.post('/change-requests/:id/decision', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!isStaff(req)) return res.status(403).json({ error: 'Forbidden' });
  const { decision, note, roadmapBucket } = req.body || {};
  if (!DECISIONS.includes(decision)) return res.status(400).json({ error: `decision must be one of: ${DECISIONS.join(', ')}` });
  const bucket = roadmapBucket ?? 'none';
  if (!BUCKETS.includes(bucket)) return res.status(400).json({ error: `roadmapBucket must be one of: ${BUCKETS.join(', ')}` });
  try {
    const cur = await pool.query('SELECT * FROM public.change_requests WHERE id = $1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Change request not found' });
    const cr = cur.rows[0];
    if (cr.decision !== 'pending') return res.status(409).json({ error: 'Already decided' });
    if (decision !== 'accepted' && !text(note, 1000)) return res.status(400).json({ error: 'A reason (note) is required to reject or defer' });
    if (decision === 'accepted' && isMaterialChange(cr)) {
      if (!CEO_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Material scope/timeline/commercial changes require explicit acceptance by leadership' });
      if (!text(cr.scope_impact, 2000) || cr.timeline_impact_days === null) return res.status(422).json({ error: 'Complete the impact analysis (scope impact and timeline impact) before accepting a material change' });
    }
    const r = await pool.query(
      `UPDATE public.change_requests SET decision=$2, decided_by=$3, decided_at=now(), decision_note=$4, roadmap_bucket=$5, updated_at=now() WHERE id=$1 RETURNING *`,
      [cr.id, decision, req.user.id, text(note, 1000), decision === 'accepted' ? bucket : 'none']
    );
    await audit(pool, req, 'change_request_decision', 'ChangeRequest', cr.title, cr.id, `${decision}${decision === 'accepted' && bucket !== 'none' ? ` → roadmap ${bucket}` : ''}`);
    res.json(withMateriality(r.rows[0]));
  } catch (e) { console.error('cr decision error:', e); res.status(400).json({ error: 'Invalid change request' }); }
});

// Link delivery work to an ACCEPTED change request so developers see the request next to their task.
router.post('/change-requests/:id/link-task', requireAuth, async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  if (!isStaff(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const cur = await pool.query('SELECT decision, title FROM public.change_requests WHERE id = $1', [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Change request not found' });
    if (cur.rows[0].decision !== 'accepted') return res.status(409).json({ error: 'Only accepted change requests can be linked to work' });
    const t = await pool.query('SELECT id FROM public.tasks WHERE id = $1', [req.body?.taskId]);
    if (t.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const r = await pool.query(`UPDATE public.change_requests SET linked_task_ids = (SELECT ARRAY(SELECT DISTINCT unnest(linked_task_ids || $2::uuid))), updated_at = now() WHERE id = $1 RETURNING *`, [req.params.id, req.body.taskId]);
    await audit(pool, req, 'change_request_linked', 'ChangeRequest', cur.rows[0].title, req.params.id, `task ${String(req.body.taskId).slice(0, 8)}`);
    res.json(withMateriality(r.rows[0]));
  } catch (e) { console.error('cr link error:', e); res.status(400).json({ error: 'Invalid ids' }); }
});

export default router;
