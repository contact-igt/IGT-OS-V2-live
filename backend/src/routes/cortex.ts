import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateAiCaller, AiAuthError, AiCaller } from '../lib/aiTicket';
import { classifyTask } from './commandCenter';

const router = Router();
const STAFF = ['admin', 'ops', 'super_admin'];
const MAX_TASKS = 60;

// Permission-grounded context for Cortex. Built ENTIRELY server-side from the verified caller:
// the browser (and the model prompt) can neither widen the scope nor supply its own system prompt.
// Deliberately excluded for everyone: credentials/secrets, salary & HR data, emails, password data.
export async function buildCortexContext(pool: Pool, caller: AiCaller, now = new Date()): Promise<string> {
  const staff = STAFF.includes(caller.role);
  const finance = caller.role === 'admin' || caller.role === 'super_admin';

  const tasks = await pool.query(
    `SELECT t.id, t.title, t.status, t.priority, t.deadline_date, t.updated_at, c.name AS client_name,
            COALESCE((SELECT array_agg(u.name ORDER BY u.name) FROM public.users u WHERE u.id = ANY(t.assigned_to)), '{}') AS owner_names
     FROM public.tasks t LEFT JOIN public.clients c ON c.id = t.client_id
     WHERE t.status NOT IN ('done', 'cancelled') AND t.parent_task_id IS NULL
       AND ($1::boolean OR $2 = ANY(t.assigned_to) OR t.created_by = $2)
     ORDER BY CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.deadline_date NULLS LAST
     LIMIT $3`,
    [staff, caller.id, MAX_TASKS + 1]
  );
  const shown = tasks.rows.slice(0, MAX_TASKS);
  const today = new Date(now.toISOString().slice(0, 10)).getTime();
  const taskLines = shown.map(t => {
    const due = t.deadline_date ? String(t.deadline_date).slice(0, 10) : 'none';
    const late = t.deadline_date ? Math.floor((today - new Date(t.deadline_date).getTime()) / 86_400_000) : 0;
    return `- [${String(t.priority).toUpperCase()}] ${t.title} | ${t.status} | owners: ${t.owner_names.join(', ') || 'nobody'} | client: ${t.client_name || 'internal'} | due ${due}${late > 0 ? ` (OVERDUE ${late}d)` : ''}`;
  });

  let clients: string[] = [];
  if (staff) {
    const r = await pool.query(`SELECT name, short_code, category${finance ? ', monthly_retainer_inr' : ''} FROM public.clients ORDER BY name LIMIT 50`);
    clients = r.rows.map(c => `- ${c.name} [${c.short_code}] (${c.category})${finance ? ` retainer INR ${Number(c.monthly_retainer_inr || 0).toLocaleString('en-IN')}/month` : ''}`);
  } else {
    clients = [...new Set(shown.map(t => t.client_name).filter(Boolean))].map(n => `- ${n}`);
  }

  let attention: string[] = [];
  let roster: string[] = [];
  if (staff) {
    attention = shown.map(t => classifyTask(t, now)).filter(Boolean).slice(0, 12)
      .map(i => `- (${i!.tier}) ${i!.what} - ${i!.why}; owners: ${i!.owners.join(', ') || 'nobody'}${i!.ceoAction ? `; needs CEO: ${i!.ceoAction}` : ''}`);
    const r = await pool.query(`SELECT name, department FROM public.users WHERE is_active = true ORDER BY name`);
    roster = r.rows.map(u => `- ${u.name} (${u.department || 'n/a'})`);
  }

  return [
    `You are Invictus Cortex, the internal operations assistant for Invictus Global Tech.`,
    `CURRENT USER: ${caller.name} | role: ${caller.role} | department: ${caller.department || 'n/a'}`,
    `SCOPE: ${staff ? 'all open work and all clients (operations/leadership)' : 'ONLY tasks assigned to or created by this user'}`,
    `DATA SOURCE: application database, read at ${now.toISOString()}.`,
    ``,
    `OPEN TASKS${tasks.rows.length > MAX_TASKS ? ` (top ${MAX_TASKS} by priority/deadline; more exist)` : ''}:`,
    taskLines.join('\n') || '(none)',
    ``,
    `CLIENTS:`, clients.join('\n') || '(none in scope)',
    ...(staff ? [``, `ATTENTION ITEMS (derived):`, attention.join('\n') || '(none)', ``, `TEAM:`, roster.join('\n') || '(none)'] : []),
    ``,
    `RULES:`,
    `- Answer ONLY from the data above. If something is not in it, say you cannot see it - never guess or invent numbers, people, tasks or causes.`,
    `- Do not discuss or infer salaries, credentials, passwords, API keys, HR records, or any client or task not listed above.`,
    `- You cannot create, change or delete records. If asked to, explain which screen the user should use.`,
    `- Be concise; use bullet points; address the user by first name (${(caller.name || '').split(' ')[0] || 'there'}).`,
  ].join('\n');
}

// GET /api/cortex/context - called server-to-server by the Next.js cortex route with the user's AI ticket.
router.get('/context', async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  try {
    const caller = await authenticateAiCaller(pool, req.headers.authorization);
    res.json({ systemPrompt: await buildCortexContext(pool, caller), scope: STAFF.includes(caller.role) ? 'staff' : 'own', generatedAt: new Date().toISOString() });
  } catch (err) {
    if (err instanceof AiAuthError) return res.status(err.status).json({ error: err.message });
    console.error('cortex context error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
