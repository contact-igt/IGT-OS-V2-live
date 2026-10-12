// API regression suite. Requires a running backend + seeded TEST database:
//   API_URL (default http://localhost:4000), TEST_PASSWORD (the INITIAL_USER_PASSWORD used at db:init)
// Run: npm run test:api -w backend      (never run against production)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD env var required (test DB password)');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');

const ATTACKER_PW = `atk-${Date.now()}-x`;
const ADMIN = 'sushilathithiyaa@invictusglobaltech.com';
const TEAM = 'aiswarya.saiju.igt@gmail.com';   // id 111
const OTHER = 'rutuja.rajbhar.igt@gmail.com';  // id 113 - unrelated team member

async function login(email) {
  const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  assert.equal(res.status, 200, `login ${email}`);
  const cookies = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const access = /igt_access_token=([^;]+)/.exec(cookies)?.[1];
  return { cookies, access, call: (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { ...(init.headers || {}), Cookie: cookies, 'Content-Type': 'application/json' } }) };
}

describe('auth basics', () => {
  test('wrong password is rejected', async () => {
    const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ADMIN, password: `wrong-${Date.now()}` }) });
    assert.ok([400, 401, 403, 429].includes(res.status));
  });
  test('protected route without credentials is 401', async () => {
    assert.equal((await fetch(`${API}/api/clients`)).status, 401);
  });
});

describe('AI ticket gate (protects paid LLM routes)', () => {
  test('cannot mint a ticket unauthenticated', async () => {
    assert.equal((await fetch(`${API}/api/auth/ai-ticket`, { method: 'POST' })).status, 401);
  });
  test('verify rejects missing / garbage / access-token credentials', async () => {
    assert.equal((await fetch(`${API}/api/auth/ai-ticket/verify`)).status, 401);
    assert.equal((await fetch(`${API}/api/auth/ai-ticket/verify`, { headers: { Authorization: 'Bearer nope' } })).status, 401);
    const u = await login(TEAM);
    assert.equal((await fetch(`${API}/api/auth/ai-ticket/verify`, { headers: { Authorization: `Bearer ${u.access}` } })).status, 401);
  });
  test('valid ticket verifies; ticket is NOT usable as a session token', async () => {
    const u = await login(TEAM);
    const { ticket } = await (await u.call('/api/auth/ai-ticket', { method: 'POST' })).json();
    assert.ok(ticket);
    assert.equal((await fetch(`${API}/api/auth/ai-ticket/verify`, { headers: { Authorization: `Bearer ${ticket}` } })).status, 200);
    assert.equal((await fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${ticket}` } })).status, 401);
  });
});

describe('client + finance authorization', () => {
  test('team role sees only non-commercial client columns', async () => {
    const u = await login(TEAM);
    const rows = await (await u.call('/api/clients')).json();
    for (const r of rows) assert.equal(r.monthly_retainer_inr, undefined, 'retainer must not leak to team role');
  });
  test('team role cannot read invoices', async () => {
    const admin = await login(ADMIN); const team = await login(TEAM);
    const clients = await (await admin.call('/api/clients')).json();
    assert.ok(clients.length > 0, 'seed has clients');
    assert.equal((await team.call(`/api/clients/${clients[0].id}/invoices`)).status, 403);
    assert.equal((await admin.call(`/api/clients/${clients[0].id}/invoices`)).status, 200);
  });
});

describe('health', () => {
  test('/api/health reflects real DB reachability', async () => {
    const body = await (await fetch(`${API}/api/health`)).json();
    assert.equal(body.databaseConnected, true);
    assert.equal(body.dbCheck, 'ok');
  });
});

describe('task object-level authorization + persistence', () => {
  let taskId;
  test('admin creates a task assigned to TEAM; it persists and reads back', async () => {
    const admin = await login(ADMIN);
    const clients = await (await admin.call('/api/clients')).json();
    const res = await admin.call('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'RBAC probe task', clientId: clients[0].id, category: 'operations', assignedTo: ['111'], priority: 'medium', status: 'todo' }) });
    assert.equal(res.status, 201, await res.clone().text());
    taskId = (await res.json()).id;
    const list = await (await (await login(TEAM)).call('/api/tasks')).json();
    assert.ok(list.find(t => t.id === taskId), 'assignee sees the task after refetch');
  });
  test('unrelated team member cannot see, edit or time the task', async () => {
    const other = await login(OTHER);
    const list = await (await other.call('/api/tasks')).json();
    assert.ok(!list.find(t => t.id === taskId), 'not listed');
    assert.equal((await other.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) })).status, 403);
    assert.equal((await other.call(`/api/tasks/${taskId}/timer/start`, { method: 'POST' })).status, 403);
  });
  test('assignee can update; value survives a fresh session refetch', async () => {
    const me = await login(TEAM);
    const res = await me.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) });
    assert.equal(res.status, 200, await res.clone().text());
    const fresh = await login(TEAM);
    const t = (await (await fresh.call('/api/tasks')).json()).find(x => x.id === taskId);
    assert.equal(t.status, 'in_progress');
  });
  test('admin can update any task; team cannot delete', async () => {
    const admin = await login(ADMIN);
    assert.equal((await admin.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ priority: 'high' }) })).status, 200);
    assert.equal((await (await login(TEAM)).call(`/api/tasks/${taskId}`, { method: 'DELETE' })).status, 403);
    assert.equal((await admin.call(`/api/tasks/${taskId}`, { method: 'DELETE' })).status, 204);
  });
});

describe('privilege boundaries', () => {
  test('admin cannot promote anyone (incl. self) to super_admin', async () => {
    const admin = await login(ADMIN);
    assert.equal((await admin.call('/api/users/101', { method: 'PUT', body: JSON.stringify({ role: 'super_admin' }) })).status, 403);
    assert.equal((await admin.call('/api/users/111', { method: 'PUT', body: JSON.stringify({ role: 'super_admin' }) })).status, 403);
  });
  test('team role cannot change roles', async () => {
    assert.equal((await (await login(TEAM)).call('/api/users/111', { method: 'PUT', body: JSON.stringify({ role: 'admin' }) })).status, 403);
  });
});

describe('OAuth connect flows require an authenticated session and signed state', () => {
  for (const path of ['/api/google/connect', '/api/auth/instagram/connect', '/api/auth/youtube/connect']) {
    test(`${path} rejects anonymous callers`, async () => {
      assert.equal((await fetch(`${API}${path}?userId=101`, { redirect: 'manual' })).status, 401);
    });
  }
  for (const path of ['/api/google/callback', '/api/auth/instagram/callback', '/api/auth/youtube/callback']) {
    test(`${path} rejects anonymous callers and forged state`, async () => {
      assert.equal((await fetch(`${API}${path}?code=x&state=${encodeURIComponent('{"userId":"101"}')}`, { redirect: 'manual' })).status, 401);
      const u = await login(TEAM);
      const res = await u.call(`${path.replace(/^/, '')}?code=x&state=${encodeURIComponent('{"userId":"101"}')}`, { redirect: 'manual' });
      assert.ok([400, 403].includes(res.status), `forged state must be refused, got ${res.status}`);
    });
  }
});

describe('audit log + meeting confidentiality', () => {
  test('audit log is staff-only', async () => {
    assert.equal((await (await login(TEAM)).call('/api/audit-log')).status, 403);
    assert.equal((await (await login(ADMIN)).call('/api/audit-log')).status, 200);
  });
  test('meeting transcripts: creator + staff only; persists across sessions', async () => {
    const admin = await login(ADMIN);
    const created = await admin.call('/api/meetings', { method: 'POST', body: JSON.stringify({ title: 'Confidential probe', result: { summary: 'x' }, transcriptSnippet: 'secret talk' }) });
    assert.equal(created.status, 201, await created.clone().text());
    const { id } = await created.json();
    const other = await login(OTHER);
    assert.equal((await other.call(`/api/meetings/${id}`)).status, 404);
    assert.ok(!(await (await other.call('/api/meetings')).json()).find(m => m.id === id));
    assert.equal((await (await login(ADMIN)).call(`/api/meetings/${id}`)).status, 200);
  });
});

describe('command center attention queue (derived from DB, role-gated)', () => {
  const ids = {};
  const day = n => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  test('seed exception tasks', async () => {
    const admin = await login(ADMIN);
    const clients = await (await admin.call('/api/clients')).json();
    const mk = async (key, body) => {
      const r = await admin.call('/api/tasks', { method: 'POST', body: JSON.stringify({ clientId: clients[0].id, category: 'operations', ...body }) });
      assert.equal(r.status, 201, await r.clone().text()); ids[key] = (await r.json()).id;
    };
    await mk('overdueCritical', { title: 'CC overdue critical', priority: 'critical', status: 'in_progress', assignedTo: ['111'], deadline: day(-5) });
    await mk('blockedMedium', { title: 'CC blocked medium', priority: 'medium', status: 'blocked', assignedTo: ['113'], deadline: day(3) });
    await mk('unowned', { title: 'CC unowned low', priority: 'low', status: 'todo', assignedTo: [], deadline: day(10) });
    await mk('doneOld', { title: 'CC done long ago', priority: 'critical', status: 'done', assignedTo: ['111'], deadline: day(-9) });
  });
  test('queue classifies, routes and explains each exception', async () => {
    const body = await (await (await login(ADMIN)).call('/api/command-center/attention')).json();
    assert.equal(body.provenance.classification, 'DATABASE');
    const all = [...body.ceoQueue, ...body.operationsQueue];
    const byId = id => all.find(i => i.id === `task:${ids[id]}`);
    const oc = byId('overdueCritical');
    assert.ok(body.ceoQueue.includes(oc), 'critical task 5d late goes to the CEO queue');
    assert.equal(oc.tier, 'critical'); assert.deepEqual(oc.owners, ['Aiswarya Saiju']); assert.ok(oc.ceoAction && oc.why && oc.deadline);
    const bm = byId('blockedMedium');
    assert.ok(body.operationsQueue.includes(bm), 'medium blocker is operations work, not CEO noise');
    assert.equal(bm.ceoAction, null);
    const un = byId('unowned'); assert.equal(un.tier, 'watch'); assert.deepEqual(un.owners, []);
    assert.equal(byId('doneOld'), undefined, 'completed work never appears');
    assert.equal(body.counts.needsCeo, body.ceoQueue.length);
  });
  test('team role and anonymous callers are rejected', async () => {
    assert.equal((await (await login(TEAM)).call('/api/command-center/attention')).status, 403);
    assert.equal((await fetch(`${API}/api/command-center/attention`)).status, 401);
  });
  test('resolving the task removes it from the queue after refetch', async () => {
    const admin = await login(ADMIN);
    assert.equal((await admin.call(`/api/tasks/${ids.overdueCritical}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) })).status, 200);
    const body = await (await (await login(ADMIN)).call('/api/command-center/attention')).json();
    assert.ok(![...body.ceoQueue, ...body.operationsQueue].find(i => i.id === `task:${ids.overdueCritical}`));
    for (const k of Object.keys(ids)) await admin.call(`/api/tasks/${ids[k]}`, { method: 'DELETE' });
  });
});

describe('account takeover paths are closed', () => {
  const post = (path, body) => fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  test('public reset-password cannot change anyone\'s password', async () => {
    const res = await post('/api/users/reset-password', { email: TEAM, newPassword: ATTACKER_PW });
    assert.equal(res.status, 410);
    // original password still works, attacker's does not
    assert.equal((await post('/api/login', { email: TEAM, password: ATTACKER_PW })).status === 200, false);
    await login(TEAM);
  });
  test('forgot-password does not reveal whether an account exists', async () => {
    const a = await post('/api/users/forgot-password', { email: TEAM });
    const b = await post('/api/users/forgot-password', { email: 'nobody-here@example.com' });
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    assert.deepEqual(await a.json(), await b.json());
  });
});

describe('password policy (server-enforced)', () => {
  test('set-password rejects weak passwords and leaves the current one working', async () => {
    const u = await login(TEAM);
    for (const weak of ['short1', 'alllettersonly', '1234567890123', 'aiswarya.saiju1']) {
      assert.equal((await u.call('/api/users/set-password', { method: 'POST', body: JSON.stringify({ password: weak }) })).status, 400, weak);
    }
    await login(TEAM); // original credentials still valid
  });
  test('admin account creation enforces the policy; weak supplied password is refused', async () => {
    const admin = await login(ADMIN);
    const res = await admin.call('/api/users', { method: 'POST', body: JSON.stringify({ name: 'Policy Probe', email: `probe${Date.now()}@example.com`, role: 'team', department: 'design', password: 'abc123' }) });
    assert.equal(res.status, 400);
  });
  test('a compliant password is accepted for a throwaway account, and then works', async () => {
    const admin = await login(ADMIN);
    const email = `probe${Date.now()}@example.com`; const pw = `Zz-${Date.now()}-ok-pw`;
    const created = await admin.call('/api/users', { method: 'POST', body: JSON.stringify({ name: 'Policy Probe', email, role: 'team', department: 'design', password: pw }) });
    assert.equal(created.status, 201, await created.clone().text());
    const r = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
    assert.equal(r.status, 200);
  });
});
