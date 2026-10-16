import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../lib/auditLog';

// Month-end client report built ONLY from traceable database records. No AI-written commentary, no invented numbers:
// anything the data cannot support is reported as "unavailable" (never 0), and every section names its source.
const router = Router();

export interface ReportRow { section: string; metric: string; value: string; detail: string; source: string }

// Spreadsheet formula-injection guard: cells that start with = + - @ (or tab/CR) are neutralised.
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows: ReportRow[]): string {
  const head = ['section', 'metric', 'value', 'detail', 'source'];
  return [head.join(','), ...rows.map(r => head.map(h => csvCell((r as any)[h])).join(','))].join('\n') + '\n';
}

const DB = 'DATABASE';
const inr = (n: number) => `INR ${Math.round(n).toLocaleString('en-IN')}`;

router.get('/monthly', requireAuth, requireRole('admin', 'ops'), async (req: Request, res: Response) => {
  const pool: Pool = req.app.locals.pool;
  const month = String(req.query.month || '');
  const clientId = String(req.query.clientId || '');
  const format = req.query.format === 'json' ? 'json' : 'csv';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: 'month must be YYYY-MM' });
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return res.status(400).json({ error: 'clientId must be a client uuid' });

  try {
    const c = await pool.query('SELECT id, name, short_code FROM public.clients WHERE id = $1', [clientId]);
    if (c.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const client = c.rows[0];
    const start = `${month}-01`;
    const nextStart = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);

    const done = await pool.query(
      `SELECT t.title, t.category, t.task_type, t.completed_at,
              COALESCE((SELECT string_agg(u.name, '; ' ORDER BY u.name) FROM public.users u WHERE u.id = ANY(t.assigned_to)), 'unassigned') AS owners
       FROM public.tasks t WHERE t.client_id = $1 AND t.status = 'done' AND t.completed_at >= $2::date AND t.completed_at < $3::date ORDER BY t.completed_at`, [clientId, start, nextStart]);
    const open = await pool.query(`SELECT status, count(*)::int AS n FROM public.tasks WHERE client_id = $1 AND status NOT IN ('done','cancelled') AND parent_task_id IS NULL GROUP BY status`, [clientId]);
    const blk = await pool.query(
      `SELECT count(*) FILTER (WHERE created_at >= $2::date AND created_at < $3::date)::int AS raised,
              count(*) FILTER (WHERE resolved_at >= $2::date AND resolved_at < $3::date)::int AS resolved,
              count(*) FILTER (WHERE status = 'open')::int AS still_open FROM public.blockers WHERE client_id = $1`, [clientId, start, nextStart]);
    const crs = await pool.query(`SELECT title, classification, decision, roadmap_bucket FROM public.change_requests WHERE client_id = $1 AND received_at >= $2::date AND received_at < $3::date ORDER BY received_at`, [clientId, start, nextStart]);
    const camps = await pool.query(`SELECT campaign_name, campaign_type, status, spend_inr, leads, impressions, clicks, conversions FROM public.campaigns WHERE client_id = $1 ORDER BY campaign_name`, [clientId]);
    const social = await pool.query(
      `SELECT a.platform, a.account_label, a.last_synced_at,
              (SELECT followers FROM public.social_metric_snapshots s WHERE s.account_id = a.id AND s.synced_at < $3::date ORDER BY s.synced_at DESC LIMIT 1) AS followers_end,
              (SELECT followers FROM public.social_metric_snapshots s WHERE s.account_id = a.id AND s.synced_at < $2::date ORDER BY s.synced_at DESC LIMIT 1) AS followers_start
       FROM public.social_accounts a WHERE a.client_id = $1 ORDER BY a.platform, a.account_label`, [clientId, start, nextStart]);

    const rows: ReportRow[] = [];
    const add = (section: string, metric: string, value: unknown, detail = '', source = DB) => rows.push({ section, metric, value: String(value), detail, source });

    add('Report', 'Client', client.name, `code ${client.short_code}`);
    add('Report', 'Period', month, `${start} to ${new Date(Date.parse(nextStart) - 86_400_000).toISOString().slice(0, 10)}`);
    add('Report', 'Generated at', new Date().toISOString());

    add('Work delivered', 'Tasks completed', done.rows.length, 'tasks marked done with a completion date inside the period');
    const byCat = new Map<string, number>(); done.rows.forEach(t => byCat.set(t.category, (byCat.get(t.category) || 0) + 1));
    for (const [cat, n] of byCat) add('Work delivered', `Completed: ${cat}`, n);
    for (const t of done.rows) add('Work delivered', 'Task', t.title, `${t.task_type || t.category} · done ${new Date(t.completed_at).toISOString().slice(0, 10)} · ${t.owners}`);
    for (const o of open.rows) add('Work in progress (now)', `Open tasks: ${o.status}`, o.n, 'current status, not period-specific');

    add('Issues and decisions', 'Blockers raised', blk.rows[0].raised); add('Issues and decisions', 'Blockers resolved', blk.rows[0].resolved);
    add('Issues and decisions', 'Blockers still open (now)', blk.rows[0].still_open);
    add('Issues and decisions', 'Client change requests received', crs.rows.length);
    for (const r of crs.rows) add('Issues and decisions', 'Change request', r.title, `${r.classification.replace('_', ' ')} · ${r.decision}${r.roadmap_bucket !== 'none' ? ` · roadmap ${r.roadmap_bucket}` : ''}`);

    if (camps.rows.length === 0) add('Paid performance', 'Campaigns', 'unavailable', 'no campaigns recorded for this client', 'none');
    for (const k of camps.rows) {
      const sp = k.spend_inr, ld = k.leads;
      add('Paid performance', `Campaign: ${k.campaign_name}`, k.status, `${k.campaign_type}; recorded totals (not period-specific), manually entered`, 'DATABASE (manual, unverified against ad platform)');
      add('Paid performance', '  Spend', sp != null ? inr(sp) : 'unavailable', '', 'DATABASE (manual)');
      add('Paid performance', '  Leads', ld != null ? ld : 'unavailable', '', 'DATABASE (manual)');
      add('Paid performance', '  Cost per lead', sp != null && ld ? inr(sp / ld) : 'unavailable', 'DERIVED: spend / leads (needs both)', 'DERIVED');
      add('Paid performance', '  ROAS', 'unavailable', 'no verified revenue / conversion-value source', 'none');
    }

    if (social.rows.length === 0) add('Organic / social', 'Connected accounts', 'unavailable', 'no social account connected for this client', 'none');
    for (const a of social.rows) {
      const end = a.followers_end, st = a.followers_start;
      add('Organic / social', `${a.platform}: ${a.account_label} - followers (period end)`, end != null ? end : 'unavailable', end == null ? 'no snapshot before period end' : '', 'DATABASE (synced snapshot)');
      add('Organic / social', `${a.platform}: ${a.account_label} - follower change`, end != null && st != null ? end - st : 'unavailable', end != null && st != null ? 'DERIVED: end snapshot - start snapshot' : 'needs snapshots at both ends of the period', 'DERIVED');
      add('Organic / social', `${a.platform}: ${a.account_label} - last sync`, a.last_synced_at ? new Date(a.last_synced_at).toISOString() : 'never', 'data freshness', 'DATABASE');
    }

    add('Provenance', 'Commentary', 'none', 'This report contains no AI-written commentary; every figure above is a database record or a stated derivation', '—');
    add('Provenance', 'Live ad-platform data', 'not included', 'Meta Ads / Google Ads are not connected (ACCESS REQUIRED); paid figures are manually recorded', '—');
    add('Provenance', 'Reach / audience', 'not summed', 'platform reach figures are never added together as "unique people"', '—');

    await logAudit(pool, { actorId: req.user.id, actorName: req.user.name || req.user.email, action: 'report_generated', entity: 'Report', entityRef: `${client.name} ${month}`, entityId: client.id, clientName: client.name, meta: `monthly report (${format})` });

    if (format === 'json') return res.json({ client, month, rows });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="igt-report-${client.short_code}-${month}.csv"`);
    res.send(toCsv(rows));
  } catch (e) {
    console.error('monthly report error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
