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

  test('notes and recording links: members and staff can add; outsiders cannot; links must be http(s); meetings come from AI meetings, not this form', async () => {
    assert.equal((await dev.call(`/api/projects/${project.id}/events`, post('', { type: 'note', note: 'Kickoff: agreed scope', linkUrl: 'https://example.com/notes' }))).status, 201);
    assert.equal((await ops.call(`/api/projects/${project.id}/events`, post('', { type: 'recording', linkUrl: 'https://example.com/rec/1' }))).status, 201);
    assert.equal((await outsider.call(`/api/projects/${project.id}/events`, post('', { type: 'note', note: 'hi' }))).status, 404);
    const bad = b => dev.call(`/api/projects/${project.id}/events`, post('', b));
    assert.equal((await bad({ type: 'bogus', note: 'x' })).status, 400);
    assert.equal((await bad({ type: 'meeting', note: 'typed-in meeting' })).status, 400, 'meetings are linked from AI meeting notes');
    assert.equal((await bad({ type: 'note' })).status, 400, 'needs a note or a link');
    assert.equal((await bad({ type: 'recording', linkUrl: 'javascript:alert(1)' })).status, 400);
    const d = await j(await dev.call(`/api/projects/${project.id}`));
    const m = d.timeline.find(e => e.type === 'note' && e.text === 'Kickoff: agreed scope');
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
    for (const a of ['project_created', 'project_status_change', 'project_task_added', 'project_note_added']) assert.ok(log.includes(a), `${a} in ${log.join()}`);
  });
});


// ───────────────────────── links: tasks, AI meetings, change requests ─────────────────────────
describe('project links: tasks on the Tasks page, AI meetings, Delivery change requests, developer started', () => {
  let admin, ops, dev, outsider, clientId, otherClientId, devId, project, otherProject, taskId, meetingId, crId;
  const api = (who, path, init) => who.call(path, init);
  const meetingResult = { summary: 'Agreed booking flow and SMS reminders; client wants it before Diwali.', decisions: [{ decision: 'Use the client SMS provider', decidedBy: 'Dr. Rao', isBinding: true, sourceQuote: 'secret quote' }, { decision: 'Launch date moves to 15 Nov' }], actionItems: [], aiInsights: { costs: 'SECRET-INSIGHT' } };

  test('setup', async () => {
    [admin, ops, dev, outsider] = await Promise.all([login(ADMIN), login(OPS), login(DEV), login(OUTSIDER)]);
    const clients = await j(await admin.call('/api/clients'));
    clientId = clients[0].id; otherClientId = clients.find(c => c.id !== clientId).id;
    devId = (await j(await admin.call('/api/users'))).find(u => u.email === DEV).id;
    project = await j(await ops.call('/api/projects', post('', { clientId, name: 'Links project', status: 'active' })));
    otherProject = await j(await ops.call('/api/projects', post('', { clientId: otherClientId, name: 'Other client project' })));
    assert.ok(project.id && otherProject.id);
  });

  test('task created with a project: same client only, caller must be on the project; shows on the Tasks list with projectId', async () => {
    const mk = (who, body) => who.call('/api/tasks', post('', { title: 'Project task', category: 'web_development', assignedTo: [devId], ...body }));
    assert.equal((await mk(admin, { clientId, projectId: otherProject.id })).status, 400, 'project of another client refused');
    assert.equal((await mk(admin, { clientId, projectId: 'not-a-uuid' })).status, 400);
    assert.equal((await mk(dev, { clientId, projectId: project.id })).status, 403, 'a developer not on the project cannot put work on it');
    const ok = await mk(admin, { clientId, projectId: project.id, title: 'Build booking form' });
    assert.equal(ok.status, 201, await ok.clone().text()); const t = await j(ok); taskId = t.id;
    assert.equal(t.projectId, project.id);
    const list = await j(await dev.call('/api/tasks'));
    assert.equal(list.find(x => x.id === taskId).projectId, project.id, 'the Tasks page data carries the project');
    const d = await j(await admin.call(`/api/projects/${project.id}`));
    assert.deepEqual(d.tasks.map(x => x.id), [taskId]);
    // now that the developer has a task on it, they may add more work to the project
    assert.equal((await mk(dev, { clientId, projectId: project.id, title: 'Dev-added task' })).status, 201);
    const audit = (await j(await admin.call('/api/audit-log'))).filter(e => e.entityId === taskId).map(e => `${e.action}:${e.meta}`);
    assert.ok(audit.some(a => a.startsWith('task_create:') && a.includes('Project: Links project')), audit.join('|'));
  });

  test('moving a task between projects: same client, permission, audit; null clears', async () => {
    const put = (who, body) => who.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(body) });
    assert.equal((await put(admin, { projectId: otherProject.id })).status, 400, 'other client');
    assert.equal((await put(outsider, { projectId: null })).status, 403, 'no access to the task at all');
    assert.equal((await put(dev, { title: 'Build booking form' })).status, 200, 'unrelated edits leave the project alone');
    assert.equal((await j(await dev.call('/api/tasks'))).find(x => x.id === taskId).projectId, project.id);
    assert.equal((await put(ops, { projectId: null })).status, 200);
    assert.equal((await j(await dev.call('/api/tasks'))).find(x => x.id === taskId).projectId, null);
    assert.equal((await put(ops, { projectId: project.id })).status, 200);
    const log = (await j(await admin.call('/api/audit-log'))).filter(e => e.entityId === taskId && e.action === 'task_project_change').map(e => e.meta);
    assert.ok(log.includes('Links project → none') && log.includes('none → Links project'), log.join('|'));
  });

  test('AI meetings: members link their own meeting; outsiders, wrong client and strangers are refused; project shows summary + decisions only', async () => {
    const save = (who, body) => who.call('/api/meetings', post('', { title: 'Booking kickoff', clientId, result: meetingResult, transcriptSnippet: 'RAW-TRANSCRIPT', ...body }));
    assert.equal((await save(outsider, { projectId: project.id })).status, 403, 'not on the project');
    assert.equal((await save(dev, { projectId: otherProject.id })).status, 400, 'wrong client');
    const r = await save(dev, { projectId: project.id });
    assert.equal(r.status, 201, await r.clone().text()); const m = await j(r); meetingId = m.id;
    assert.equal(m.projectId, project.id);

    // a second, unlinked meeting of the dev's can be linked afterwards; others cannot touch it
    const free = await j(await save(dev, { title: 'Later meeting' }));
    assert.equal(free.projectId, null);
    assert.equal((await outsider.call(`/api/meetings/${free.id}/project`, { method: 'PATCH', body: JSON.stringify({ projectId: project.id }) })).status, 404, "not their meeting");
    assert.equal((await dev.call(`/api/meetings/${free.id}/project`, { method: 'PATCH', body: JSON.stringify({ projectId: project.id }) })).status, 200);
    assert.equal((await dev.call(`/api/meetings/${free.id}/project`, { method: 'PATCH', body: JSON.stringify({ projectId: null }) })).status, 200, 'unlink');

    const d = await j(await admin.call(`/api/projects/${project.id}`));
    const pm = d.meetings.find(x => x.id === meetingId);
    assert.equal(pm.summary, meetingResult.summary);
    assert.deepEqual(pm.decisions, ['Use the client SMS provider', 'Launch date moves to 15 Nov']);
    const blob = JSON.stringify(d);
    assert.ok(!blob.includes('RAW-TRANSCRIPT') && !blob.includes('SECRET-INSIGHT') && !blob.includes('secret quote'), 'no transcript, insights or source quotes on the project');
    assert.equal(d.summary.meetings_held, 1);
    assert.ok(d.summary.last_meeting_at);
    assert.equal(pm.can_open, true, 'staff may open the meeting page');
    assert.ok(d.timeline.some(e => e.type === 'meeting' && e.link === `/meetings/${meetingId}` && e.text.includes('Booking kickoff')));
  });

  test('a member who did not create the meeting reads the review but gets no link to the transcript page', async () => {
    // make the outsider a member through a task of their own on the project
    const other = await j(await admin.call('/api/users')); const outsiderId = other.find(u => u.email === OUTSIDER).id;
    const t = await admin.call('/api/tasks', post('', { title: 'Outsider task', clientId, category: 'web_development', assignedTo: [outsiderId], projectId: project.id }));
    assert.equal(t.status, 201);
    const d = await j(await outsider.call(`/api/projects/${project.id}`));
    const pm = d.meetings.find(x => x.id === meetingId);
    assert.ok(pm.summary && pm.decisions.length === 2, 'review visible to members');
    assert.equal(pm.can_open, false);
    assert.equal(d.timeline.find(e => e.type === 'meeting').link, null);
    assert.equal((await outsider.call(`/api/meetings/${meetingId}`)).status, 404, 'raw meeting stays owner/staff only');
    await admin.call(`/api/tasks/${(await t.json()).id}`, { method: 'DELETE' });
  });

  test('changes needed go to Delivery: change request with project + source meeting, filterable, shown on the project and its timeline', async () => {
    const cr = (who, body) => who.call('/api/delivery/change-requests', post('', { clientId, title: 'Add SMS reminders', description: 'Agreed in the kickoff meeting', classification: 'new_feature', source: 'meeting', ...body }));
    assert.equal((await cr(dev, { projectId: project.id, meetingId: 'not-a-uuid' })).status, 400);
    assert.equal((await cr(dev, { meetingId })).status, 400, 'a meeting needs its project');
    assert.equal((await cr(dev, { projectId: otherProject.id })).status, 400, 'wrong client');
    assert.equal((await cr(outsider, { projectId: project.id })).status, 403, 'not on the project');
    // a member who is not the meeting's owner cannot cite someone else's meeting
    const outsiderId = (await j(await admin.call('/api/users'))).find(u => u.email === OUTSIDER).id;
    const helper = await j(await admin.call('/api/tasks', post('', { title: 'Outsider helper task', clientId, category: 'web_development', assignedTo: [outsiderId], projectId: project.id })));
    assert.equal((await cr(outsider, { projectId: project.id, meetingId })).status, 400, "someone else's meeting cannot be cited");
    await admin.call(`/api/tasks/${helper.id}`, { method: 'DELETE' });
    const r = await cr(dev, { projectId: project.id, meetingId });
    assert.equal(r.status, 201, await r.clone().text()); crId = (await j(r)).id;

    const list = await j(await ops.call(`/api/delivery/change-requests?projectId=${project.id}`));
    assert.deepEqual(list.map(x => x.id), [crId]);
    assert.equal(list[0].project_title, 'Links project'); assert.equal(list[0].meeting_title, 'Booking kickoff');
    assert.equal((await j(await ops.call(`/api/delivery/change-requests?projectId=${otherProject.id}`))).length, 0);

    let d = await j(await dev.call(`/api/projects/${project.id}`));
    assert.equal(d.summary.open_changes, 1);
    assert.equal(d.changes[0].decision, 'pending');
    assert.ok(!('commercial_impact_inr' in d.changes[0]), 'no commercial figures on the project page');
    assert.ok(d.timeline.some(e => e.type === 'change_requested' && e.text.startsWith('Add SMS reminders')));
    assert.equal(d.timeline.find(e => e.type === 'change_requested').link, null, 'devs are not sent to the Delivery page');
    assert.equal(d.meetings.find(x => x.id === meetingId).changes_raised, 1);

    // decision flows back (material change: needs impact analysis + leadership)
    await ops.call(`/api/delivery/change-requests/${crId}`, { method: 'PATCH', body: JSON.stringify({ scopeImpact: 'SMS provider integration', timelineImpactDays: 5, technicalRisk: 'low', recommendedDecision: 'accept' }) });
    assert.equal((await admin.call(`/api/delivery/change-requests/${crId}/decision`, post('', { decision: 'accepted', roadmapBucket: 'now' }))).status, 200);
    d = await j(await admin.call(`/api/projects/${project.id}`));
    assert.equal(d.summary.open_changes, 0);
    assert.ok(d.timeline.some(e => e.type === 'change_decided' && /accepted \(roadmap: now\)/.test(e.text) && e.link === '/delivery'));
  });

  test('developer started + rework rounds + summary counters come from real work', async () => {
    assert.equal((await dev.call(`/api/tasks/${taskId}/timer/start`, { method: 'POST' })).status, 201);
    await dev.call(`/api/tasks/${taskId}/timer/stop`, { method: 'POST' });
    for (const status of ['in_progress', 'in_review', 'in_progress']) assert.equal((await dev.call(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status }) })).status, 200);
    const d = await j(await dev.call(`/api/projects/${project.id}`));
    const started = d.timeline.filter(e => e.type === 'dev_started');
    assert.equal(started.length, 1, 'once per person, not per event');
    assert.match(started[0].text, /started working on this project/);
    assert.equal(d.summary.developers_started, 1);
    assert.equal(d.summary.rework_rounds, 1);
    assert.equal(d.tasks.find(t => t.id === taskId).rework_count, 1);
    assert.match(d.provenance.started, /first timer start/);
  });

  test('timeline pages instead of cutting off: limit + before cursor, newest first, no overlap', async () => {
    const p1 = await j(await admin.call(`/api/projects/${project.id}?limit=3`));
    assert.equal(p1.timeline.length, 3); assert.equal(p1.timeline_has_more, true); assert.ok(p1.timeline_next);
    const p2 = await j(await admin.call(`/api/projects/${project.id}?limit=3&before=${encodeURIComponent(p1.timeline_next)}`));
    assert.ok(p2.timeline.length > 0);
    assert.ok(p2.timeline.every(e => new Date(e.at) < new Date(p1.timeline_next)), 'strictly older than the cursor');
    const all = await j(await admin.call(`/api/projects/${project.id}?limit=100`));
    assert.equal(all.timeline_has_more, false);
    assert.ok(all.timeline.length >= p1.timeline.length + p2.timeline.length - 1);
    assert.equal((await admin.call(`/api/projects/${project.id}?limit=abc&before=garbage`)).status, 200, 'bad paging params fall back to defaults');
  });

  test('deleting a project keeps its tasks, meetings and change requests (links just clear)', async () => {
    const tmp = await j(await ops.call('/api/projects', post('', { clientId, name: 'Temp project' })));
    const t = await j(await admin.call('/api/tasks', post('', { title: 'Temp task', clientId, category: 'web_development', projectId: tmp.id })));
    const { default: pg } = await import('pg').catch(() => ({ default: null }));
    if (!pg) return; // direct DB access only when the pg driver is resolvable from the tests dir
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query('DELETE FROM public.projects WHERE id = $1', [tmp.id]);
      const after = (await j(await admin.call('/api/tasks'))).find(x => x.id === t.id);
      assert.ok(after, 'task survives'); assert.equal(after.projectId, null);
    } finally { await pool.end(); }
  });
});
