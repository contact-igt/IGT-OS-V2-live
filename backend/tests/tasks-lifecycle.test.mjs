// End-to-end task lifecycle against the REAL task model (categories, task_type, status enum - no TCU/CNC types exist in this repo).
// Requires a running backend + seeded TEST DB: API_URL, TEST_PASSWORD.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD required');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');
const ADMIN = 'sushilathithiyaa@invictusglobaltech.com'; // 101 admin
const OPS = 'contact@invictusglobaltech.com';            // 102 ops
const ASSIGNEE = 'aiswarya.saiju.igt@gmail.com';         // 111 team
const OUTSIDER = 'rutuja.rajbhar.igt@gmail.com';         // 113 team, not on the task

async function login(email) {
  const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  assert.equal(res.status, 200, `login ${email}`);
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const raw = (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { ...(init.headers || {}), Cookie: cookie } });
  const call = (path, init = {}) => raw(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
  return { call, raw };
}
const day = n => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe('task lifecycle: create -> assign -> start -> comment -> block -> review -> rework -> done', () => {
  let admin, ops, me, outsider, taskId, clientId;
  const auditFor = async id => (await (await admin.call('/api/audit-log')).json()).filter(e => e.entityId === id).map(e => `${e.action}:${e.actor}`);

  test('setup + create persists every field and is audited server-side', async () => {
    [admin, ops, me, outsider] = await Promise.all([login(ADMIN), login(OPS), login(ASSIGNEE), login(OUTSIDER)]);
    clientId = (await (await admin.call('/api/clients')).json())[0].id;
    const r = await admin.call('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Lifecycle: reel edit', clientId, category: 'video_editing', taskType: 'reel_edit', assignedTo: ['111'], priority: 'high', status: 'todo', deadline: day(2), estimatedHours: 3 }) });
    assert.equal(r.status, 201, await r.clone().text());
    taskId = (await r.json()).id;
    const t = (await (await me.call('/api/tasks')).json()).find(x => x.id === taskId);   // assignee workspace
    assert.equal(t.priority, 'high'); assert.equal(t.taskType, 'reel_edit'); assert.equal(t.category, 'video_editing');
    assert.deepEqual(t.assignedTo, ['111']); assert.ok(t.deadline.startsWith(day(2))); assert.equal(t.estimatedHours, 3);
    assert.ok((await (await ops.call('/api/tasks')).json()).find(x => x.id === taskId), 'operations view sees it');
    assert.ok((await auditFor(taskId)).includes('task_create:Sushil Athithiyaa'), 'task_create audited with the real actor');
  });

  test('invalid enum values are 400 (not 500)', async () => {
    assert.equal((await admin.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'not-a-status' }) })).status, 400);
    assert.equal((await admin.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ priority: 'urgent!!' }) })).status, 400);
  });

  test('timer: start -> active -> stop records duration; audited; nothing left running', async () => {
    assert.equal((await me.call(`/api/tasks/${taskId}/timer/start`, { method: 'POST' })).status, 201);
    assert.equal((await me.call(`/api/tasks/${taskId}/timer/start`, { method: 'POST' })).status, 409, 'no double timers');
    const active = await (await me.call('/api/time-logs?active=true')).json();
    assert.ok(active.find(l => (l.task_id || l.taskId) === taskId), 'active timer visible');
    const stop = await me.call(`/api/tasks/${taskId}/timer/stop`, { method: 'POST', body: JSON.stringify({ note: 'first pass' }) });
    assert.equal(stop.status, 200); const log = await stop.json(); assert.ok(log.ended_at && log.duration_minutes >= 0);
    assert.ok(!(await (await me.call('/api/time-logs?active=true')).json()).find(l => (l.task_id || l.taskId) === taskId));
    const a = await auditFor(taskId); assert.ok(a.includes('timer_start:Aiswarya Saiju') && a.includes('timer_stop:Aiswarya Saiju'));
  });

  test('status changes persist, are audited with previous->new, and survive a fresh session', async () => {
    assert.equal((await me.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) })).status, 200);
    const fresh = await login(ASSIGNEE);
    assert.equal((await (await fresh.call('/api/tasks')).json()).find(x => x.id === taskId).status, 'in_progress');
    const entries = (await (await admin.call('/api/audit-log')).json()).filter(e => e.entityId === taskId && e.action === 'task_status_change');
    assert.ok(entries.some(e => /todo.*in_progress/.test(e.meta)), 'meta shows previous -> new state');
  });

  test('comments persist for permitted users, are validated, and are access-controlled', async () => {
    const ok = await me.call(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ text: 'Draft v1 uploaded to Drive' }) });
    assert.equal(ok.status, 201, await ok.clone().text());
    assert.equal((await outsider.call(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ text: 'sneaky' }) })).status, 403);
    assert.equal((await me.call(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ text: '   ' }) })).status, 400);
    assert.equal((await me.call(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(5000) }) })).status, 400);
    for (const who of [me, admin, ops]) {
      const t = (await (await (await login(who === me ? ASSIGNEE : who === admin ? ADMIN : OPS)).call('/api/tasks')).json()).find(x => x.id === taskId);
      assert.deepEqual(t.reviewComments.map(c => [c.authorId, c.text]), [['111', 'Draft v1 uploaded to Drive']]);
    }
    assert.ok(!(await (await outsider.call('/api/tasks')).json()).find(x => x.id === taskId), 'outsider cannot even list it');
    assert.ok((await auditFor(taskId)).includes('commented:Aiswarya Saiju'));
  });

  test('blocked work is visible to operations (attention queue) and clears when unblocked', async () => {
    assert.equal((await me.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'blocked' }) })).status, 200);
    const q = await (await ops.call('/api/command-center/attention')).json();
    const item = [...q.ceoQueue, ...q.operationsQueue].find(i => i.id === `task:${taskId}`);
    assert.ok(item && item.kind === 'blocked_task' && item.owners.includes('Aiswarya Saiju'));
    assert.equal((await me.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_review' }) })).status, 200);
    const q2 = await (await ops.call('/api/command-center/attention')).json();
    assert.ok(![...q2.ceoQueue, ...q2.operationsQueue].find(i => i.id === `task:${taskId}` && i.kind === 'blocked_task'));
  });

  test('review -> rework -> completion; completedAt set then cleared on reopen', async () => {
    assert.equal((await ops.call(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ text: 'Rework requested: fix subtitle timing' }) })).status, 201);
    assert.equal((await ops.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'todo' }) })).status, 200);
    assert.equal((await me.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) })).status, 200);
    let t = (await (await admin.call('/api/tasks')).json()).find(x => x.id === taskId);
    assert.equal(t.status, 'done'); assert.ok(t.completedAt, 'completedAt stamped');
    assert.equal(t.reviewComments.length, 2);
    assert.equal((await admin.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) })).status, 200);
    t = (await (await admin.call('/api/tasks')).json()).find(x => x.id === taskId);
    assert.equal(t.completedAt, undefined, 'reopen clears completedAt');
  });

  test('audit trail tells a coherent story with real actors; client-posted entries cannot forge identity', async () => {
    const forged = await me.call('/api/audit-log', { method: 'POST', body: JSON.stringify({ actorName: 'Sushil Athithiyaa', action: 'task_deleted', entity: 'Task', entityRef: 'whatever', entityId: taskId }) });
    assert.equal(forged.status, 200); assert.equal((await forged.json()).ignored, true, 'server-owned task events posted by a client are ignored');
    const log = (await (await admin.call('/api/audit-log')).json()).filter(e => e.entityId === taskId);
    assert.ok(!log.some(e => e.action === 'task_deleted'), 'clients cannot inject server-owned task events');
    assert.ok(log.every(e => e.actor !== 'Sushil Athithiyaa' || e.actorId === '101'), 'actor name always matches the authenticated user');
    const order = log.map(e => e.action).reverse();
    assert.ok(order.indexOf('task_create') < order.indexOf('timer_start') && order.indexOf('timer_start') < order.indexOf('timer_stop'));
    assert.ok(log.every(e => !/password|token|secret/i.test(`${e.meta || ''}`)));
  });

  test('attachment: upload -> metadata -> download by permitted user only -> delete', async () => {
    const fd = new FormData(); fd.append('file', new Blob(['hello fixture'], { type: 'text/plain' }), 'fixture.txt');
    const up = await me.raw(`/api/tasks/${taskId}/assets`, { method: 'POST', body: fd });
    assert.equal(up.status, 201, await up.clone().text());
    const asset = (await (await me.call('/api/tasks')).json()).find(x => x.id === taskId).assets.find(a => a.name === 'fixture.txt');
    assert.ok(asset && asset.isFile && asset.sizeBytes === 13);
    assert.equal((await outsider.raw(`/api/tasks/assets/${asset.id}/download`)).status, 403);
    const dl = await me.raw(`/api/tasks/assets/${asset.id}/download`); assert.equal(dl.status, 200); assert.equal(await dl.text(), 'hello fixture');
    assert.equal((await outsider.raw(`/api/tasks/assets/${asset.id}`, { method: 'DELETE' })).status, 403);
    assert.equal((await me.raw(`/api/tasks/assets/${asset.id}`, { method: 'DELETE' })).status, 200);
  });

  test('cleanup: only staff delete; delete is audited and removes comments/assets', async () => {
    assert.equal((await me.call(`/api/tasks/${taskId}`, { method: 'DELETE' })).status, 403);
    assert.equal((await admin.call(`/api/tasks/${taskId}`, { method: 'DELETE' })).status, 204);
    assert.ok((await auditFor(taskId)).includes('task_deleted:Sushil Athithiyaa'));
    assert.ok(!(await (await admin.call('/api/tasks')).json()).find(x => x.id === taskId));
  });
});
