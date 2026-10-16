// Cortex permission grounding: the server decides what the model may see.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD required');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');

async function login(email) {
  const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const call = (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Cookie: cookie } });
  return { call, access: /igt_access_token=([^;]+)/.exec(cookie)?.[1] };
}
const context = async who => {
  const { ticket } = await (await who.call('/api/auth/ai-ticket', { method: 'POST' })).json();
  const res = await fetch(`${API}/api/cortex/context`, { headers: { Authorization: `Bearer ${ticket}` } });
  return { res, body: res.ok ? await res.json() : null };
};

describe('Cortex context is built server-side from the caller\'s permissions', () => {
  const ids = [];
  test('seed: a task for the team member, another for an unrelated member, with a retainer-bearing client', async () => {
    const admin = await login('sushilathithiyaa@invictusglobaltech.com');
    const client = (await (await admin.call('/api/clients')).json())[0];
    await admin.call(`/api/clients/${client.id}`, { method: 'GET' });
    for (const [title, assignee] of [['CTX mine: carousel batch', '111'], ['CTX theirs: confidential pitch deck', '113']]) {
      const r = await admin.call('/api/tasks', { method: 'POST', body: JSON.stringify({ title, clientId: client.id, category: 'design_creative', assignedTo: [assignee], priority: 'high', status: 'todo', deadline: '2020-01-01' }) });
      assert.equal(r.status, 201); ids.push((await r.json()).id);
    }
  });

  test('team member: only own tasks, no other people\'s tasks, no retainers, no emails/credentials/salary', async () => {
    const { res, body } = await context(await login('aiswarya.saiju.igt@gmail.com'));
    assert.equal(res.status, 200); assert.equal(body.scope, 'own');
    const p = body.systemPrompt.split('\nRULES:')[0]; // data section only (the rules text names forbidden topics)
    assert.match(p, /CTX mine: carousel batch/);
    assert.doesNotMatch(p, /confidential pitch deck/, 'must not leak a colleague\'s task');
    assert.doesNotMatch(p, /retainer/i); assert.doesNotMatch(p, /@/, 'no email addresses'); assert.doesNotMatch(p, /salary|password hash|api[_ ]?key/i);
    assert.doesNotMatch(p, /\nTEAM:/, 'no roster for non-staff');
    assert.match(p, /OVERDUE/); assert.match(body.systemPrompt, /cannot create, change or delete/i);
  });

  test('ops: all open work + attention items, but no retainer (finance is admin-only)', async () => {
    const { body } = await context(await login('contact@invictusglobaltech.com'));
    assert.equal(body.scope, 'staff');
    assert.match(body.systemPrompt, /CTX theirs: confidential pitch deck/); assert.match(body.systemPrompt, /ATTENTION ITEMS/);
    const data = body.systemPrompt.split('\nRULES:')[0];
    assert.doesNotMatch(data, /retainer/i); assert.doesNotMatch(data, /@/);
  });

  test('admin: sees retainers; still no emails/credentials', async () => {
    const { body } = await context(await login('sushilathithiyaa@invictusglobaltech.com'));
    const data = body.systemPrompt.split('\nRULES:')[0];
    assert.match(data, /retainer INR/); assert.doesNotMatch(data, /@|password|salary/i);
  });

  test('unauthenticated / forged / session-token callers are rejected', async () => {
    assert.equal((await fetch(`${API}/api/cortex/context`)).status, 401);
    assert.equal((await fetch(`${API}/api/cortex/context`, { headers: { Authorization: 'Bearer forged' } })).status, 401);
    const u = await login('aiswarya.saiju.igt@gmail.com');
    assert.equal((await fetch(`${API}/api/cortex/context`, { headers: { Authorization: `Bearer ${u.access}` } })).status, 401, 'a session token is not an AI ticket');
  });

  test('cleanup', async () => {
    const admin = await login('sushilathithiyaa@invictusglobaltech.com');
    for (const id of ids) assert.equal((await admin.call(`/api/tasks/${id}`, { method: 'DELETE' })).status, 204);
  });
});
