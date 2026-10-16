// Monthly client report: RBAC, period boundaries, provenance honesty, CSV safety, audit.
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD required');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');
const url = process.env.DATABASE_URL;
const skip = !url && 'DATABASE_URL not set';

async function login(email) {
  const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  return { raw: (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Cookie: cookie } }) };
}
const now = new Date(); const MONTH = now.toISOString().slice(0, 7);
const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);

describe('monthly report', { skip }, () => {
  const pool = new pg.Pool({ connectionString: url });
  let admin, ops, team, clientId, taskIds = [], campaignIds = [], accountId;
  const report = (who, qs) => who.raw(`/api/reports/monthly?${qs}`);

  test('seed: client data for the period', async () => {
    [admin, ops, team] = await Promise.all([login('sushilathithiyaa@invictusglobaltech.com'), login('contact@invictusglobaltech.com'), login('aiswarya.saiju.igt@gmail.com')]);
    clientId = (await (await admin.raw('/api/clients')).json())[0].id;
    for (const title of ['Report probe: carousel batch', '=HYPERLINK("https://evil.example","click")']) {
      const t = await (await admin.raw('/api/tasks', { method: 'POST', body: JSON.stringify({ title, clientId, category: 'social_media', assignedTo: ['111'], priority: 'low', status: 'todo' }) })).json();
      taskIds.push(t.id);
      assert.equal((await admin.raw(`/api/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) })).status, 200);
    }
    const spendOnly = await pool.query(`INSERT INTO public.campaigns (client_id, campaign_name, campaign_type, spend_inr) VALUES ($1,'RPT spend only','meta',5000) RETURNING id`, [clientId]);
    const both = await pool.query(`INSERT INTO public.campaigns (client_id, campaign_name, campaign_type, spend_inr, leads, roas) VALUES ($1,'RPT spend+leads','google',10000,40,9.9) RETURNING id`, [clientId]);
    campaignIds.push(spendOnly.rows[0].id, both.rows[0].id);
    const acc = await pool.query(`INSERT INTO public.social_accounts (client_id, platform, account_label, platform_user_id, encrypted_access_token, access_token_iv, last_synced_at) VALUES ($1,'instagram','RPT ig','rpt-ig-1','\\x00','\\x00', now()) RETURNING id`, [clientId]);
    accountId = acc.rows[0].id;
    await pool.query(`INSERT INTO public.social_metric_snapshots (account_id, followers, synced_at) VALUES ($1, 1000, date_trunc('month', now()) - interval '2 days'), ($1, 1150, now())`, [accountId]);
  });

  test('RBAC: staff only', async () => {
    assert.equal((await fetch(`${API}/api/reports/monthly?clientId=${clientId}&month=${MONTH}`)).status, 401);
    assert.equal((await report(team, `clientId=${clientId}&month=${MONTH}`)).status, 403);
    assert.equal((await report(ops, `clientId=${clientId}&month=${MONTH}`)).status, 200);
  });

  test('input validation: month, client id, unknown client', async () => {
    assert.equal((await report(admin, `clientId=${clientId}&month=2026-13`)).status, 400);
    assert.equal((await report(admin, `clientId=${clientId}&month=oct`)).status, 400);
    assert.equal((await report(admin, `clientId=not-a-uuid&month=${MONTH}`)).status, 400);
    assert.equal((await report(admin, `clientId=00000000-0000-0000-0000-000000000000&month=${MONTH}`)).status, 404);
  });

  test('CSV download: content-type, filename, work delivered within the period only', async () => {
    const res = await report(admin, `clientId=${clientId}&month=${MONTH}`);
    assert.match(res.headers.get('content-type'), /text\/csv/); assert.match(res.headers.get('content-disposition'), /attachment; filename="igt-report-.*-\d{4}-\d{2}\.csv"/);
    const csv = await res.text();
    assert.match(csv, /^section,metric,value,detail,source\n/); assert.match(csv, /Report probe: carousel batch/);
    const prev = await (await report(admin, `clientId=${clientId}&month=${prevMonth}`)).text();
    assert.doesNotMatch(prev, /Report probe: carousel batch/, 'previous month must not include this month\'s completions');
  });

  test('spreadsheet formula injection is neutralised', async () => {
    const csv = await (await report(admin, `clientId=${clientId}&month=${MONTH}`)).text();
    assert.match(csv, /'=HYPERLINK/, 'cell prefixed so it is not executed'); assert.doesNotMatch(csv, /(^|,)=HYPERLINK/m);
  });

  test('provenance honesty: unavailable (never 0), derived only with both inputs, ROAS never computed, no AI commentary', async () => {
    const { rows } = await (await report(admin, `clientId=${clientId}&month=${MONTH}&format=json`)).json();
    const val = (section, metric, near) => { const i = rows.findIndex(r => r.metric.includes(near)); return rows.slice(i).find(r => r.section === section && r.metric.trim() === metric); };
    const only = rows.findIndex(r => r.metric === 'Campaign: RPT spend only'), both = rows.findIndex(r => r.metric === 'Campaign: RPT spend+leads');
    const after = (i, m) => rows.slice(i).find(r => r.metric.trim() === m);
    assert.equal(after(only, 'Leads').value, 'unavailable'); assert.equal(after(only, 'Cost per lead').value, 'unavailable', 'CPL needs spend AND leads');
    assert.match(after(both, 'Cost per lead').value, /INR 250/); assert.equal(after(both, 'Cost per lead').source, 'DERIVED');
    assert.equal(after(both, 'ROAS').value, 'unavailable', 'roas column is manual/unverified -> never reported');
    assert.ok(rows.some(r => r.section === 'Provenance' && r.metric === 'Commentary' && r.value === 'none'));
    assert.ok(rows.some(r => r.metric === 'Live ad-platform data' && /not included/.test(r.value)));
    void val;
  });

  test('social: follower change is derived from snapshots; freshness is shown', async () => {
    const { rows } = await (await report(admin, `clientId=${clientId}&month=${MONTH}&format=json`)).json();
    assert.equal(rows.find(r => /follower change/.test(r.metric)).value, '150');
    assert.ok(rows.find(r => /last sync/.test(r.metric) && r.value !== 'never'));
  });

  test('report generation is audited (data export trail)', async () => {
    const log = (await (await admin.raw('/api/audit-log')).json()).filter(e => e.action === 'report_generated');
    assert.ok(log.length > 0 && log[0].actor);
  });

  after(async () => {
    for (const id of taskIds) await admin.raw(`/api/tasks/${id}`, { method: 'DELETE' });
    if (campaignIds.length) await pool.query('DELETE FROM public.campaigns WHERE id = ANY($1)', [campaignIds]);
    if (accountId) await pool.query('DELETE FROM public.social_accounts WHERE id = $1', [accountId]);
    await pool.end();
  });
});
