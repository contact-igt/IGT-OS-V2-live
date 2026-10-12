// Analytics: access rules + correct data source + honest finance (no fabricated profit).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD required');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');

async function login(email) {
  const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  return { call: (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Cookie: cookie } }) };
}

describe('time analytics', () => {
  test('a member sees their own numbers (from real timer sessions); others and outsiders are refused; staff may read', async () => {
    const [admin, me, other] = await Promise.all([login('sushilathithiyaa@invictusglobaltech.com'), login('aiswarya.saiju.igt@gmail.com'), login('rutuja.rajbhar.igt@gmail.com')]);
    const clientId = (await (await admin.call('/api/clients')).json())[0].id;
    const t = await (await admin.call('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Analytics probe', clientId, category: 'operations', assignedTo: ['111'], priority: 'low', status: 'todo' }) })).json();
    const before = await (await me.call('/api/analytics/team/111/week')).json();
    assert.equal((await me.call(`/api/tasks/${t.id}/timer/start`, { method: 'POST' })).status, 201);
    if (process.env.DATABASE_URL) { // make the session a deterministic 30 minutes
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query(`UPDATE public.time_logs SET started_at = now() - interval '30 minutes' WHERE task_id = $1 AND ended_at IS NULL`, [t.id]); await pool.end();
    }
    assert.equal((await me.call(`/api/tasks/${t.id}/timer/stop`, { method: 'POST' })).status, 200);
    const after = await (await me.call('/api/analytics/team/111/week')).json();
    const expectedExtra = process.env.DATABASE_URL ? 30 : 0;
    assert.ok(after.tasksWorkedOn >= before.tasksWorkedOn, 'task count never goes down');
    assert.ok(after.totalMinutes >= before.totalMinutes + expectedExtra, `week minutes ${before.totalMinutes} -> ${after.totalMinutes} (expected +${expectedExtra})`);
    assert.ok((await (await me.call('/api/analytics/team/111/month')).json()).totalMinutes >= after.totalMinutes - 1);
    assert.equal((await other.call('/api/analytics/team/111/week')).status, 403, 'another team member cannot read it');
    assert.equal((await admin.call('/api/analytics/team/111/week')).status, 200, 'staff can');
    assert.equal((await fetch(`${API}/api/analytics/team/111/week`)).status, 401);
    assert.equal((await admin.call(`/api/tasks/${t.id}`, { method: 'DELETE' })).status, 204);
  });
});

describe('agency finance endpoint', () => {
  test('admin only; payroll is NOT modelled so salaries/profit are null with provenance, never a made-up 0', async () => {
    assert.equal((await (await login('contact@invictusglobaltech.com')).call('/api/analytics/agency/finance')).status, 403);
    const res = await (await login('sushilathithiyaa@invictusglobaltech.com')).call('/api/analytics/agency/finance');
    assert.equal(res.status, 200); const b = await res.json();
    assert.equal(typeof b.totalRetainers, 'number'); assert.equal(b.totalSalaries, null); assert.equal(b.profitAndLoss, null);
    assert.match(b.provenance.totalSalaries, /UNKNOWN/); assert.match(b.provenance.totalRetainers, /not invoiced/);
  });
});
