// Blockers + client change requests: lifecycle, materiality rules, RBAC, audit, command-center integration.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD required');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');
const ADMIN = 'sushilathithiyaa@invictusglobaltech.com', OPS = 'contact@invictusglobaltech.com', TEAM = 'aiswarya.saiju.igt@gmail.com', OTHER = 'rutuja.rajbhar.igt@gmail.com';

async function login(email) {
  const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  return { call: (path, init = {}) => fetch(`${API}/api/delivery${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Cookie: cookie } }),
           raw: (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Cookie: cookie } }) };
}
const day = n => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const j = async r => (await r.json());

describe('change requests: capture -> classify -> impact -> decision -> roadmap -> work', () => {
  let admin, ops, team, other, clientId, taskId, minor, material;
  test('anyone can capture a client request; it starts pending and is audited', async () => {
    [admin, ops, team, other] = await Promise.all([login(ADMIN), login(OPS), login(TEAM), login(OTHER)]);
    clientId = (await j(await admin.raw('/api/clients')))[0].id;
    const r = await team.call('/change-requests', { method: 'POST', body: JSON.stringify({ clientId, title: 'Change hero image on home page', description: 'Client asked on WhatsApp to swap the banner', classification: 'content_change', source: 'whatsapp', requestedBy: 'Dr. Rao' }) });
    assert.equal(r.status, 201, await r.clone().text()); minor = await j(r);
    assert.equal(minor.decision, 'pending'); assert.equal(minor.is_material, false);
    const log = (await j(await admin.raw('/api/audit-log'))).filter(e => e.entityId === minor.id).map(e => `${e.action}:${e.actor}`);
    assert.ok(log.includes('change_request_created:Aiswarya Saiju'));
  });
  test('validation: classification/source/priority enums, required fields', async () => {
    const bad = b => team.call('/change-requests', { method: 'POST', body: JSON.stringify({ clientId, title: 't', description: 'd', classification: 'bug', ...b }) });
    assert.equal((await bad({ classification: 'nonsense' })).status, 400);
    assert.equal((await bad({ source: 'carrier-pigeon' })).status, 400);
    assert.equal((await bad({ title: '' })).status, 400);
    assert.equal((await bad({ clientId: '00000000-0000-0000-0000-000000000000' })).status, 400);
  });
  test('team cannot analyse or decide; ops can analyse', async () => {
    assert.equal((await team.call(`/change-requests/${minor.id}`, { method: 'PATCH', body: JSON.stringify({ scopeImpact: 'x' }) })).status, 403);
    assert.equal((await team.call(`/change-requests/${minor.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'accepted' }) })).status, 403);
    const r = await ops.call(`/change-requests/${minor.id}`, { method: 'PATCH', body: JSON.stringify({ technicalRisk: 'low', recommendedDecision: 'accept', timelineImpactDays: 0 }) });
    assert.equal(r.status, 200); assert.equal((await j(r)).recommended_decision, 'accept');
  });
  test('non-material change: ops may accept; decision persists; decided requests are immutable', async () => {
    const r = await ops.call(`/change-requests/${minor.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'accepted', roadmapBucket: 'now' }) });
    assert.equal(r.status, 200, await r.clone().text());
    const fresh = (await j(await (await login(ADMIN)).call('/change-requests?decision=accepted'))).find(x => x.id === minor.id);
    assert.equal(fresh.decision, 'accepted'); assert.equal(fresh.roadmap_bucket, 'now'); assert.equal(fresh.decided_by_name, 'Anitha Yogan');
    assert.equal((await ops.call(`/change-requests/${minor.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'rejected', note: 'x' }) })).status, 409);
    assert.equal((await ops.call(`/change-requests/${minor.id}`, { method: 'PATCH', body: JSON.stringify({ scopeImpact: 'late edit' }) })).status, 409);
  });
  test('MATERIAL change: needs impact analysis, and only leadership may accept; reject/defer need a reason', async () => {
    const created = await team.call('/change-requests', { method: 'POST', body: JSON.stringify({ clientId, title: 'Add online payments', description: 'New payment gateway', classification: 'new_feature', source: 'call' }) });
    material = await j(created); assert.equal(material.is_material, true);
    assert.equal((await ops.call(`/change-requests/${material.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'accepted' }) })).status, 403, 'ops cannot accept material scope');
    assert.equal((await admin.call(`/change-requests/${material.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'accepted' }) })).status, 422, 'no impact analysis yet');
    assert.equal((await admin.call(`/change-requests/${material.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'deferred' }) })).status, 400, 'defer needs a reason');
    assert.equal((await ops.call(`/change-requests/${material.id}`, { method: 'PATCH', body: JSON.stringify({ scopeImpact: 'Gateway integration + checkout page', timelineImpactDays: 12, commercialImpactInr: 45000, technicalRisk: 'medium', recommendedDecision: 'defer' }) })).status, 200);
    const ok = await admin.call(`/change-requests/${material.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'accepted', roadmapBucket: 'next', note: 'Approved with revised quote' }) });
    assert.equal(ok.status, 200, await ok.clone().text()); assert.equal((await j(ok)).roadmap_bucket, 'next');
  });
  test('accepted requests link to work; developers (assignees) can then see them, outsiders cannot', async () => {
    const t = await admin.raw('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Implement payments (CR)', clientId, category: 'web_development', assignedTo: ['111'], priority: 'high', status: 'todo', deadline: day(10) }) });
    taskId = (await j(t)).id;
    assert.equal((await ops.call(`/change-requests/${minor.id}/link-task`, { method: 'POST', body: JSON.stringify({ taskId }) })).status, 200);
    assert.equal((await ops.call(`/change-requests/${material.id}/link-task`, { method: 'POST', body: JSON.stringify({ taskId }) })).status, 200);
    const mine = await j(await (await login(TEAM)).call('/change-requests'));
    assert.ok(mine.find(x => x.id === material.id), 'assignee sees the accepted request linked to their task');
    const theirs = await j(await (await login(OTHER)).call('/change-requests'));
    assert.ok(!theirs.find(x => x.id === material.id), 'unrelated team member does not');
    const pending = await team.call('/change-requests', { method: 'POST', body: JSON.stringify({ clientId, title: 'Unlinked pending', description: 'd', classification: 'bug' }) });
    assert.equal((await ops.call(`/change-requests/${(await j(pending)).id}/link-task`, { method: 'POST', body: JSON.stringify({ taskId }) })).status, 409, 'pending requests cannot be linked');
  });
  test('decision trail is audited with the real decider', async () => {
    const log = (await j(await admin.raw('/api/audit-log'))).filter(e => e.entityId === material.id).map(e => `${e.action}:${e.actor}`);
    assert.ok(log.includes('change_request_decision:Sushil Athithiyaa') && log.includes('change_request_analysed:Anitha Yogan') && log.includes('change_request_linked:Anitha Yogan'));
  });
  test('cleanup task', async () => { assert.equal((await admin.raw(`/api/tasks/${taskId}`, { method: 'DELETE' })).status, 204); });
});

describe('structured blockers', () => {
  let admin, ops, team, other, taskId, blockerId, clientId;
  test('assignee raises a blocker on their task; outsider and non-task blockers are refused', async () => {
    [admin, ops, team, other] = await Promise.all([login(ADMIN), login(OPS), login(TEAM), login(OTHER)]);
    clientId = (await j(await admin.raw('/api/clients')))[0].id;
    taskId = (await j(await admin.raw('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Blocker host task', clientId, category: 'web_development', assignedTo: ['111'], priority: 'high', status: 'in_progress', deadline: day(3) }) }))).id;
    const mk = (who, body) => who.call('/blockers', { method: 'POST', body: JSON.stringify(body) });
    assert.equal((await mk(other, { taskId, title: 'x', reason: 'y', blockingParty: 'client' })).status, 403);
    assert.equal((await mk(team, { title: 'No task', reason: 'y', blockingParty: 'client' })).status, 403, 'team cannot raise free-floating blockers');
    assert.equal((await mk(team, { taskId, title: 'x', reason: 'y', blockingParty: 'aliens' })).status, 400);
    const r = await mk(team, { taskId, title: 'Waiting for brand assets', reason: 'Client has not sent logo files', blockingParty: 'client', severity: 'critical', escalationOwnerId: '102', expectedResolution: day(-4), nextAction: 'Call the client', ownerId: '111' });
    assert.equal(r.status, 201, await r.clone().text()); const b = await j(r); blockerId = b.id;
    assert.equal(b.client_id, clientId, 'client derived from the task'); assert.equal(b.status, 'open');
  });
  test('visible to ops with names; visible to its owner; hidden from an unrelated member', async () => {
    const list = await j(await ops.call('/blockers')); const b = list.find(x => x.id === blockerId);
    assert.ok(b && b.owner_name === 'Aiswarya Saiju' && b.escalation_owner_name === 'Anitha Yogan' && b.task_title === 'Blocker host task');
    assert.ok((await j(await team.call('/blockers'))).find(x => x.id === blockerId));
    assert.ok(!(await j(await other.call('/blockers'))).find(x => x.id === blockerId));
  });
  test('command center: a critical, overdue blocker is a CEO item with owner, escalation owner and next action', async () => {
    const q = await j(await admin.raw('/api/command-center/attention'));
    const it = q.ceoQueue.find(i => i.id === `blocker:${blockerId}`);
    assert.ok(it, 'in the CEO queue'); assert.equal(it.tier, 'critical'); assert.deepEqual(it.owners, ['Aiswarya Saiju']);
    assert.match(it.ceoAction, /Anitha Yogan/); assert.match(it.ceoAction, /Call the client/); assert.match(it.why, /client/);
  });
  test('only staff/owner/creator resolve; resolution persists, is audited, and clears the queue', async () => {
    assert.equal((await other.call(`/blockers/${blockerId}/resolve`, { method: 'POST', body: JSON.stringify({}) })).status, 403);
    const r = await team.call(`/blockers/${blockerId}/resolve`, { method: 'POST', body: JSON.stringify({ note: 'Logos received' }) });
    assert.equal(r.status, 200); assert.equal((await j(r)).status, 'resolved');
    assert.equal((await team.call(`/blockers/${blockerId}/resolve`, { method: 'POST', body: JSON.stringify({}) })).status, 409);
    assert.ok(!(await j(await ops.call('/blockers'))).find(x => x.id === blockerId));
    assert.ok((await j(await ops.call('/blockers?status=resolved'))).find(x => x.id === blockerId && x.resolution_note === 'Logos received'));
    const q = await j(await admin.raw('/api/command-center/attention'));
    assert.ok(![...q.ceoQueue, ...q.operationsQueue].find(i => i.id === `blocker:${blockerId}`));
    const log = (await j(await admin.raw('/api/audit-log'))).filter(e => e.entityId === blockerId).map(e => `${e.action}:${e.actor}`);
    assert.ok(log.includes('blocker_created:Aiswarya Saiju') && log.includes('blocker_resolved:Aiswarya Saiju'));
  });
  test('pending material change request surfaces in the CEO queue; cleanup', async () => {
    const cr = await j(await team.call('/change-requests', { method: 'POST', body: JSON.stringify({ clientId, title: 'CQ scope creep: add loyalty module', description: 'd', classification: 'scope_change' }) }));
    const q = await j(await admin.raw('/api/command-center/attention'));
    const it = q.ceoQueue.find(i => i.id === `cr:${cr.id}`);
    assert.ok(it && /material change/.test(it.why) && it.ceoAction);
    assert.equal((await admin.call(`/change-requests/${cr.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'rejected', note: 'Out of scope for this retainer' }) })).status, 200);
    const q2 = await j(await admin.raw('/api/command-center/attention'));
    assert.ok(![...q2.ceoQueue, ...q2.operationsQueue].find(i => i.id === `cr:${cr.id}`));
    assert.equal((await admin.raw(`/api/tasks/${taskId}`, { method: 'DELETE' })).status, 204);
  });
});
