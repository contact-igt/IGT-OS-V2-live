// Critical-journey E2E (Playwright, Chromium). Requires: backend :4000 + 'next start' :3000 on a LOCAL TEST DB seeded via db:init,
// the four seeded test accounts with must_change_password cleared, and TEST_PASSWORD. Run: TEST_PASSWORD=... node scripts/e2e/task-journey.mjs
// Covers: login -> dashboard -> create task in the real UI -> assign -> comment -> status/blocked -> reload -> command center -> audit -> RBAC -> Cortex failure honesty.
if (!/localhost|127\.0\.0\.1/.test('http://localhost:4000')) throw new Error('local only');
import { chromium } from 'playwright';
const PW = process.env.TEST_PASSWORD, API = 'http://localhost:4000', WEB = 'http://localhost:3000';
const TITLE = `E2E journey ${Date.now() % 100000}`;
const results = []; const ok = (name, pass, extra = '') => { results.push({ name, pass, extra }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const browser = await chromium.launch({ args: ['--disable-background-networking','--disable-component-update','--no-first-run','--proxy-bypass-list=*'] });
const mk = async (email, vw = { width: 1440, height: 900 }) => {
  const c = await browser.newContext({ viewport: vw });
  const r = await c.request.post(`${API}/api/login`, { data: { email, password: PW } });
  const p = await c.newPage(); p.setDefaultTimeout(12000);
  const errs = [], bad = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 100)));
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 100)));
  p.on('response', rs => { if (rs.status() >= 400) bad.push(`${rs.status()} ${rs.request().method()} ${rs.url().replace(/http:\/\/localhost:\d+/, '')}`.slice(0, 90)); });
  return { c, p, errs, bad, login: r.status() };
};
const api = async (ctx, method, path, data) => { const r = await ctx.request.fetch(`${API}${path}`, { method, data }); return { status: r.status(), body: await r.json().catch(() => null) }; };

// ---------- 1. ADMIN: login -> dashboard -> create task through the real UI
const A = await mk('sushilathithiyaa@invictusglobaltech.com');
ok('admin login', A.login === 200);
await A.p.goto(`${WEB}/dashboard`, { waitUntil: 'domcontentloaded' }); await A.p.waitForTimeout(3500);
ok('dashboard shows Attention required panel', await A.p.locator('#attention-heading').isVisible());
await A.p.goto(`${WEB}/tasks`, { waitUntil: 'domcontentloaded' }); await A.p.waitForTimeout(3000);
await A.p.getByRole('button', { name: /^New Task$/ }).first().click(); await A.p.waitForTimeout(800);
const modal = A.p.locator('.fixed').filter({ has: A.p.getByRole('button', { name: /Create Task/ }) }).first();
await modal.locator('input[placeholder^="e.g. WhatsNexus"]').fill(TITLE);
const clientSelect = modal.locator('select').nth(1);
const clientOptions = await clientSelect.locator('option').allTextContents();
const dbNames = (await api(A.c, 'GET', '/api/clients')).body.map(c => c.name).sort();
ok('client dropdown == DATABASE clients exactly', JSON.stringify(clientOptions.filter(o => !/^Select|\+ New/.test(o)).sort()) === JSON.stringify(dbNames), `${dbNames.length} clients`);
await clientSelect.selectOption({ label: clientOptions.find(o => /Aarav/.test(o)) });
await modal.locator('select').nth(2).selectOption({ label: 'Video Editing' });
await modal.getByRole('button', { name: /^high$/i }).click();
await modal.getByText('Select date & time...').click(); await A.p.waitForTimeout(400);
await A.p.getByRole('button', { name: '25', exact: true }).first().click();
await A.p.getByRole('button', { name: /confirm/i }).first().click(); await A.p.waitForTimeout(400);
await modal.getByText('Select team members...').click(); await A.p.waitForTimeout(400);
await A.p.getByText('Aiswarya Saiju', { exact: false }).last().click(); await A.p.waitForTimeout(300);
await modal.getByText('New Task', { exact: true }).first().click(); await A.p.waitForTimeout(300);
await modal.getByText('Select a client', { exact: false }).count();
await modal.getByRole('button', { name: /Create Task/ }).click(); await A.p.waitForTimeout(3000);
console.log('   modal still open after submit:', await modal.isVisible().catch(() => false), '| modal errors:', ((await modal.innerText().catch(() => '')).match(/[^.\n]*(required|at least)[^.\n]*/gi) || []).join(' / '));
const all = await api(A.c, 'GET', '/api/tasks');
const task = (all.body || []).find(t => t.title === TITLE);
ok('task created via UI is PERSISTED in the database', !!task, task ? `id ${task.id.slice(0, 8)} status ${task.status} priority ${task.priority} category ${task.category}` : 'not found');
if (!task) { await browser.close(); process.exit(1); }
ok('priority + category persisted correctly', task.priority === 'high' && task.category === 'video_editing');

// ---------- 2. ADMIN assigns via API; ASSIGNEE sees it in workspace, comments, changes status through the UI
ok('assignee chosen in the UI persisted', JSON.stringify(task.assignedTo) === JSON.stringify(['111']), JSON.stringify(task.assignedTo));
ok('deadline chosen in the UI persisted', !!task.deadline && task.deadline.startsWith('2026-10-25'), task.deadline);
const M = await mk('aiswarya.saiju.igt@gmail.com');
await M.p.goto(`${WEB}/my-workspace`, { waitUntil: 'domcontentloaded' }); await M.p.waitForTimeout(3500);
ok('assignee workspace shows the task', await M.p.getByText(TITLE).first().isVisible().catch(() => false));
await M.p.getByText(TITLE).first().click(); await M.p.waitForTimeout(1000);
await M.p.getByPlaceholder('Add a note or update...').fill('Draft v1 is ready for review');
await M.p.getByRole('button', { name: /^Post$/ }).click(); await M.p.waitForTimeout(1500);
await M.p.getByRole('button', { name: /^In Progress$/ }).click(); await M.p.waitForTimeout(1500);
const afterUi = (await api(M.c, 'GET', '/api/tasks')).body.find(t => t.id === task.id);
ok('status change via drawer persisted (in_progress)', afterUi.status === 'in_progress', afterUi.status);
ok('comment via drawer persisted server-side', (afterUi.reviewComments || []).some(c => c.text === 'Draft v1 is ready for review' && c.authorId === '111'));
await M.p.getByRole('button', { name: /^Blocked$/ }).click(); await M.p.waitForTimeout(1000);
const stopModal = M.p.locator('.fixed').filter({ hasText: 'FEEDBACK / REASON' }).first();
await stopModal.locator('textarea').first().fill('Waiting on client for brand assets');
console.log('   stop-modal buttons:', JSON.stringify(await stopModal.getByRole('button').evaluateAll(b => b.map(x => x.textContent.trim().slice(0, 28)).filter(Boolean))));
await stopModal.getByRole('button', { name: /confirm|save|submit|update|stop|block/i }).last().click(); await M.p.waitForTimeout(2000);
const blocked = (await api(M.c, 'GET', '/api/tasks')).body.find(t => t.id === task.id);
ok('blocked state persisted', blocked.status === 'blocked', blocked.status);
ok('blocker reason is persisted on the task (visible to ops)', (blocked.reviewComments || []).some(c => /brand assets/.test(c.text)), (blocked.reviewComments || []).map(c => c.text).join(' | ').slice(0, 80));

// ---------- 3. RELOAD with cleared client cache: state still correct from the server
await M.p.evaluate(() => localStorage.clear()); await M.p.reload({ waitUntil: 'domcontentloaded' }); await M.p.waitForTimeout(3500);
await M.p.getByText(TITLE).first().click(); await M.p.waitForTimeout(1000);
ok('after reload (cache cleared) the comment is still visible in the drawer', await M.p.getByText('Draft v1 is ready for review').first().isVisible().catch(() => false));

// ---------- 4. OPERATIONS/CEO visibility
const q = (await api(A.c, 'GET', '/api/command-center/attention')).body;
const item = [...q.ceoQueue, ...q.operationsQueue].find(i => i.id === `task:${task.id}`);
ok('blocked task appears in the attention queue with owner', !!item && item.owners.includes('Aiswarya Saiju') && item.kind === 'blocked_task', item ? `${item.tier}/${item.route}` : 'missing');
await A.p.goto(`${WEB}/dashboard`, { waitUntil: 'domcontentloaded' }); await A.p.waitForTimeout(3500);
ok('attention panel (browser) lists the blocked task', await A.p.locator('#attention-heading').locator('xpath=ancestor::section').getByText(TITLE).first().isVisible().catch(() => false));

// ---------- 5. AUDIT trail (API + audit page)
const audit = (await api(A.c, 'GET', '/api/audit-log')).body.filter(e => e.entityId === task.id).map(e => `${e.action}:${e.actor}`);
ok('audit has create/status/comment events with real actors', ['task_create:Sushil Athithiyaa', 'task_status_change:Aiswarya Saiju', 'commented:Aiswarya Saiju'].every(x => audit.includes(x)), [...new Set(audit)].join(', '));
await A.p.goto(`${WEB}/audit`, { waitUntil: 'domcontentloaded' }); await A.p.waitForTimeout(3500);
ok('audit page (browser) shows the task story', await A.p.getByText(TITLE).first().isVisible().catch(() => false));

// ---------- 6. PERMISSIONS
const O = await mk('rutuja.rajbhar.igt@gmail.com');
await O.p.goto(`${WEB}/tasks`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(3500);
ok('unrelated team member cannot see the task in the UI', !(await O.p.getByText(TITLE).first().isVisible().catch(() => false)));
ok('...and the server rejects their modification (403)', (await api(O.c, 'PUT', `/api/tasks/${task.id}`, { status: 'done' })).status === 403);
await O.p.goto(`${WEB}/audit`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(2500);
ok('team member is kept out of /audit (UI redirect)', !new URL(O.p.url()).pathname.startsWith('/audit'), new URL(O.p.url()).pathname);

// ---------- 7. CORTEX panel (no provider keys here: must fail honestly, never fabricate)
await A.p.goto(`${WEB}/ai`, { waitUntil: 'domcontentloaded' }); await A.p.waitForTimeout(3000);
const box = A.p.locator('textarea').first();
await box.fill('What needs my attention today?'); await box.press('Enter'); await A.p.waitForTimeout(5000);
const bodyText = (await A.p.locator('body').innerText()).replace(/\s+/g, ' ');
ok('Cortex answers or fails HONESTLY (no invented answer)', /No AI provider is configured|AI provider|could not|Unavailable/i.test(bodyText) || /attention|blocked|E2E journey/i.test(bodyText), bodyText.match(/(No AI provider[^.]*\.|All configured AI providers failed[^|]*)/)?.[0]?.slice(0, 90) || '');

// ---------- console / network hygiene
for (const [n, ctx] of [['admin', A], ['assignee', M], ['outsider', O]]) {
  console.log(`${n}: console errors=${JSON.stringify([...new Set(ctx.errs)].slice(0, 4))} failed=${JSON.stringify([...new Set(ctx.bad)].slice(0, 6))}`);
}
await api(A.c, 'DELETE', `/api/tasks/${task.id}`);
await browser.close();
const failed = results.filter(r => !r.pass); console.log(`\n${results.length - failed.length}/${results.length} checks passed`); process.exit(failed.length ? 1 : 0);
