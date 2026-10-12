// API regression suite. Requires a running backend + seeded TEST database:
//   API_URL (default http://localhost:4000), TEST_PASSWORD (the INITIAL_USER_PASSWORD used at db:init)
// Run: npm run test:api -w backend      (never run against production)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD env var required (test DB password)');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');

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
    const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ADMIN, password: 'definitely-wrong' }) });
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
