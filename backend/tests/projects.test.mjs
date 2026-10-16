// Client projects: create -> link tasks -> derived team/hours -> timeline -> RBAC. Requires a running backend + seeded TEST DB.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD required');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');
const ADMIN = 'sushilathithiyaa@invictusglobaltech.com', OPS = 'contact@invictusglobaltech.com';
const DEV = 'aiswarya.saiju.igt@gmail.com', OUTSIDER = 'rutuja.rajbhar.igt@gmail.com';

async function login(email) {
  const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  assert.equal(res.status, 200, `login ${email}`);
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  return { call: (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Cookie: cookie } }) };
}
const j = r => r.json();
const post = (u, body) => ({ method: 'POST', body: JSON.stringify(body) });

describe('projects', () => {
  let admin, ops, dev, outsider, clientId, otherClientId, devId, project, taskId, otherTaskId;

  test('setup: staff create a project with client details; it starts with a "created" timeline entry', async () => {
    [admin, ops, dev, outsider] = await Promise.all([login(ADMIN), login(OPS), login(DEV), login(OUTSIDER)]);
    const clients = await j(await admin.call('/api/clients'));
    clientId = clients[0].id; otherClientId = clients.find(c => c.id !== clientId).id;
    devId = (await j(await admin.call('/api/users'))).find(u => u.email === DEV).id;
    const r = await ops.call('/api/projects', post('', { clientId, name: 'Booking portal v2', description: 'Online appointment booking', status: 'active', startDate: '2026-09-01', targetDate: '2026-11-15', repoUrl: 'https://example.com/org/booking' }));
    assert.equal(r.status, 201, await r.clone().text()); project = await j(r);
    assert.equal(project.status, 'active');
    const d = await j(await admin.call(`/api/projects/${project.id}`));
    assert.equal(d.client_name.length > 0, true);
    assert.deepEqual(d.timeline.map(e => e.type), ['created']);
    assert.deepEqual(d.team, []);
  });

  test('validation: name/client required, status enum, urls must be http(s), unknown client rejected', async () => {
    const bad = b => ops.call('/api/projects', post('', { clientId, name: 'x', ...b }));
    assert.equal((await bad({ name: '' })).status, 400);
    assert.equal((await bad({ status: 'nonsense' })).status, 400);
    assert.equal((await bad({ repoUrl: 'javascript:alert(1)' })).status, 400);
    assert.equal((await bad({ clientId: '00000000-0000-0000-0000-000000000000' })).status, 400);
    assert.equal((await ops.call('/api/projects/not-a-uuid')).status, 404);
  });

  test('developers cannot create or edit projects', async () => {
    assert.equal((await dev.call('/api/projects', post('', { clientId, name: 'nope' }))).status, 403);
    assert.equal((await dev.call(`/api/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) })).status, 403);
  });

  test('a developer sees nothing until a task of theirs is on the project; then the project, team and hours appear', async () => {
    assert.equal((await dev.call(`/api/projects/${project.id}`)).status, 404, 'not a member yet');
    assert.equal((await j(await dev.call('/api/projects'))).some(p => p.id === project.id), false);

    const t = await admin.call('/api/tasks', post('', { title: 'Build booking form', clientId, category: 'web_development', assignedTo: [devId], priority: 'medium' }));
    assert.equal(t.status, 201, await t.clone().text()); taskId = (await j(t)).id;
    const o = await admin.call('/api/tasks', post('', { title: 'Other client work', clientId: otherClientId, category: 'web_development', assignedTo: [devId] }));
    otherTaskId = (await j(o)).id;

    assert.equal((await dev.call(`/api/projects/${project.id}/tasks`, post('', { taskId }))).status, 403, 'devs cannot attach');
    assert.equal((await ops.call(`/api/projects/${project.id}/tasks`, post('', { taskId: otherTaskId }))).status, 400, 'task of a different client is refused');
    assert.equal((await ops.call(`/api/projects/${project.id}/tasks`, post('', { taskId }))).status, 204);

    assert.equal((await dev.call(`/api/projects/${project.id}`)).status, 200, 'assigned developer is now a member');
    assert.equal((await outsider.call(`/api/projects/${project.id}`)).status, 404, 'unrelated developer still sees nothing');
    assert.equal((await j(await outsider.call('/api/projects'))).some(p => p.id === project.id), false);

    // work the task: timer, status changes (incl. rework), done
    assert.equal((await dev.call(`/api/tasks/${taskId}/timer/start`, { method: 'POST' })).status, 201);
    assert.equal((await dev.call(`/api/tasks/${taskId}/timer/stop`, { method: 'POST', body: JSON.stringify({ note: 'first pass' }) })).status, 200);
    for (const status of ['in_review', 'in_progress', 'done']) {
      assert.equal((await dev.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status }) })).status, 200, `-> ${status}`);
    }

    const d = await j(await dev.call(`/api/projects/${project.id}`));
    assert.deepEqual(d.team.map(m => m.id), [devId]);
    assert.equal(d.team[0].tasks_assigned, 1); assert.equal(d.team[0].tasks_done, 1);
    assert.equal(typeof d.team[0].minutes_logged, 'number');
    assert.equal(d.minutes_logged, d.team[0].minutes_logged);
    assert.equal(d.tasks.length, 1); assert.equal(d.tasks[0].status, 'done');
    assert.ok(!('email' in d.team[0]) && !('password_hash' in d.team[0]), 'team entries never carry contact or credential fields');
    assert.match(d.provenance.hours, /timer logs/);

    const types = d.timeline.map(e => e.type);
    assert.ok(types.includes('task_created'), types.join());
    assert.equal(types.filter(t => t === 'task_status').length, 3, 'review, rework and done all appear: ' + types.join());
    assert.ok(d.timeline.some(e => e.type === 'task_status' && /in_review → in_progress/.test(e.text)), 'rework step is visible');
    // newest first
    assert.ok(new Date(d.timeline[0].at) >= new Date(d.timeline[d.timeline.length - 1].at));
  });

  test('list shows task counts and hours; project status change is recorded and completion stamps a date', async () => {
    const row = (await j(await admin.call('/api/projects'))).find(p => p.id === project.id);
    assert.equal(row.tasks_total, 1); assert.equal(row.tasks_done, 1);
    const r = await ops.call(`/api/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed', leadId: devId }) });
    assert.equal(r.status, 200, await r.clone().text());
    const d = await j(await admin.call(`/api/projects/${project.id}`));
    assert.equal(d.status, 'completed'); assert.ok(d.completed_at); assert.equal(d.lead_name.length > 0, true);
    assert.ok(d.timeline.some(e => e.type === 'status_changed' && e.text === 'active → completed'));
    assert.ok(d.elapsed_days >= 0);
    const reopened = await j(await ops.call(`/api/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) }));
    assert.equal(reopened.completed_at, null, 're-opening clears the completion date');
  });

  test('notes, meeting notes and recording links: members and staff can add; outsiders cannot; links must be http(s)', async () => {
    assert.equal((await dev.call(`/api/projects/${project.id}/events`, post('', { type: 'meeting', note: 'Kickoff: agreed scope', linkUrl: 'https://example.com/notes' }))).status, 201);
    assert.equal((await ops.call(`/api/projects/${project.id}/events`, post('', { type: 'recording', linkUrl: 'https://example.com/rec/1' }))).status, 201);
    assert.equal((await outsider.call(`/api/projects/${project.id}/events`, post('', { type: 'note', note: 'hi' }))).status, 404);
    const bad = b => dev.call(`/api/projects/${project.id}/events`, post('', b));
    assert.equal((await bad({ type: 'bogus', note: 'x' })).status, 400);
    assert.equal((await bad({ type: 'note' })).status, 400, 'needs a note or a link');
    assert.equal((await bad({ type: 'recording', linkUrl: 'javascript:alert(1)' })).status, 400);
    const d = await j(await dev.call(`/api/projects/${project.id}`));
    const m = d.timeline.find(e => e.type === 'meeting');
    assert.equal(m.link, 'https://example.com/notes'); assert.equal(m.actor.length > 0, true);
  });

  test('detaching a task removes the developer from the derived team; project writes are audited', async () => {
    assert.equal((await dev.call(`/api/projects/${project.id}/tasks/${taskId}`, { method: 'DELETE' })).status, 403);
    assert.equal((await ops.call(`/api/projects/${project.id}/tasks/${taskId}`, { method: 'DELETE' })).status, 204);
    assert.equal((await ops.call(`/api/projects/${project.id}/tasks/${taskId}`, { method: 'DELETE' })).status, 404, 'already detached');
    const d = await j(await admin.call(`/api/projects/${project.id}`));
    assert.deepEqual(d.team.map(m => m.id), [devId], 'still listed as project lead');
    assert.equal((await dev.call(`/api/projects/${project.id}`)).status, 200, 'lead keeps access');
    const log = (await j(await admin.call('/api/audit-log'))).filter(e => e.entityId === project.id).map(e => e.action);
    for (const a of ['project_created', 'project_status_change', 'project_task_added', 'project_meeting_added']) assert.ok(log.includes(a), `${a} in ${log.join()}`);
  });
});
