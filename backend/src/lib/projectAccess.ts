import { Pool } from 'pg';

const STAFF = ['admin', 'ops', 'super_admin'];

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProjectCheck =
  | { ok: true; clientId: string; name: string }
  | { ok: false; status: 400 | 403; error: string };

// Who may point a task / meeting / change request at a project: staff, the project lead, or anyone who already has
// a task on it. The record's client must match the project's client so a project never collects another client's work.
export async function checkProjectLink(
  pool: Pool, user: { id: string; role: string }, projectId: unknown, recordClientId: string | null | undefined,
): Promise<ProjectCheck> {
  if (typeof projectId !== 'string' || !UUID_RE.test(projectId)) return { ok: false, status: 400, error: 'Unknown project' };
  const r = await pool.query(
    `SELECT p.client_id, p.name,
       (p.lead_id = $2 OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.project_id = p.id AND ($2 = ANY(t.assigned_to) OR t.created_by = $2))) AS member
     FROM public.projects p WHERE p.id = $1`, [projectId, user.id]);
  if (!r.rows.length) return { ok: false, status: 400, error: 'Unknown project' };
  const p = r.rows[0];
  if (!recordClientId || p.client_id !== recordClientId) return { ok: false, status: 400, error: 'This project belongs to a different client' };
  if (!STAFF.includes(user.role) && !p.member) return { ok: false, status: 403, error: 'You are not on this project' };
  return { ok: true, clientId: p.client_id, name: p.name };
}
