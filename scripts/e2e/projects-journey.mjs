// Projects E2E (Playwright): admin creates a project in the UI -> adds a task -> notes -> developer sees it read-mostly.
// Same prerequisites as task-journey.mjs (local backend :4000 + next :3000 on a seeded TEST DB; TEST_PASSWORD).
import { chromium } from 'playwright';
const PW = process.env.TEST_PASSWORD, API = 'http://localhost:4000', WEB = 'http://localhost:3000';
const NAME = `E2E Project ${Date.now() % 100000}`, TASK = `E2E build step ${Date.now() % 100000}`;
let pass = 0, fail = 0; const ok = (n, p, x = '') => { p ? pass++ : fail++; console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); };
const browser = await chromium.launch({ args: ['--disable-background-networking', '--disable-component-update', '--no-first-run', '--proxy-bypass-list=*'] });
const mk = async (email, vw = { width: 1280, height: 900 }) => { const c = await browser.newContext({ viewport: vw }); await c.request.post(`${API}/api/login`, { data: { email, password: PW } }); const p = await c.newPage(); p.setDefaultTimeout(12000); return { c, p }; };
const settle = p => p.waitForTimeout(2500);

const A = await mk('sushilathithiyaa@invictusglobaltech.com');
await A.p.goto(`${WEB}/projects`, { waitUntil: 'domcontentloaded' }); await settle(A.p);
ok('projects page loads for leadership', await A.p.getByRole('heading', { name: 'Projects' }).isVisible());
await A.p.getByRole('button', { name: /Add project/ }).click();
await A.p.locator('select').filter({ hasText: 'Select client' }).selectOption({ index: 1 });
await A.p.getByLabel('Project name').fill(NAME);
await A.p.getByLabel('Details').fill('E2E: client booking portal');
await A.p.getByRole('button', { name: 'Create project' }).click();
await A.p.waitForURL(/\/projects\/[0-9a-f-]{36}$/); await settle(A.p);
const projectId = A.p.url().split('/').pop();
ok('creating a project opens its page', await A.p.getByRole('heading', { name: NAME }).isVisible());
ok('timeline starts with "Project created"', await A.p.getByText('Project created').first().isVisible());
ok('team is empty until someone works on it', await A.p.getByText(/Nobody yet/).isVisible());

// A task of the same client, assigned to a developer, attached from the UI
const proj = await (await A.c.request.get(`${API}/api/projects/${projectId}`)).json();
const dev = (await (await A.c.request.get(`${API}/api/users`)).json()).find(u => u.email === 'aiswarya.saiju.igt@gmail.com');
const t = await (await A.c.request.post(`${API}/api/tasks`, { data: { title: TASK, clientId: proj.client_id, category: 'web_development', assignedTo: [dev.id] } })).json();
await A.p.reload({ waitUntil: 'domcontentloaded' }); await settle(A.p);
await A.p.locator('select').filter({ hasText: 'Select task' }).selectOption({ label: TASK });
await A.p.getByRole('button', { name: 'Add task' }).click(); await settle(A.p);
ok('attached task is listed', await A.p.getByText(TASK).first().isVisible());
ok('assigned developer now appears under "Who worked on this project"', await A.p.getByRole('table').getByText(dev.name).isVisible());

// meeting note with a link
const upd = A.p.locator('form').filter({ hasText: 'Link (optional)' });
await upd.locator('select').selectOption('meeting');
await upd.getByRole('textbox', { name: 'Note', exact: true }).fill('Kickoff: scope agreed');
await upd.getByRole('textbox', { name: /Link/ }).fill('https://example.com/notes/1');
await upd.getByRole('button', { name: 'Add', exact: true }).click(); await settle(A.p);
ok('meeting note shows on the timeline with its link', await A.p.getByText('Kickoff: scope agreed').isVisible() && await A.p.getByRole('link', { name: /Open link/ }).first().isVisible());

// developer: sees the project, cannot manage it
const D = await mk('aiswarya.saiju.igt@gmail.com');
await D.p.goto(`${WEB}/projects`, { waitUntil: 'domcontentloaded' }); await settle(D.p);
ok('developer sees the project they have a task on', await D.p.getByText(NAME).first().isVisible());
ok('developer has no "Add project" button', (await D.p.getByRole('button', { name: /Add project/ }).count()) === 0);
await D.p.getByText(NAME).first().click(); await D.p.waitForURL(/\/projects\/[0-9a-f-]{36}$/); await settle(D.p);
ok('developer detail: no status control, no attach/remove', (await D.p.getByRole('button', { name: 'Add task' }).count()) === 0 && (await D.p.getByRole('button', { name: 'Remove' }).count()) === 0 && (await D.p.locator('select').filter({ hasText: 'planned' }).count()) === 0);
ok('developer can still add a note', await D.p.getByRole('button', { name: 'Add', exact: true }).isVisible());

// an unrelated developer gets nothing
const O = await mk('rutuja.rajbhar.igt@gmail.com');
await O.p.goto(`${WEB}/projects/${projectId}`, { waitUntil: 'domcontentloaded' }); await settle(O.p);
ok('unrelated developer cannot open the project', await O.p.getByText('Project not found').isVisible());

// phone width: no horizontal overflow on list and detail
const M = await mk('sushilathithiyaa@invictusglobaltech.com', { width: 390, height: 800 });
for (const path of ['/projects', `/projects/${projectId}`]) {
  await M.p.goto(WEB + path, { waitUntil: 'domcontentloaded' }); await settle(M.p);
  ok(`no horizontal scroll at 390px: ${path === '/projects' ? 'list' : 'detail'}`, await M.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
}

// cleanup the task we made (the project stays: other tests do not depend on it)
await A.c.request.delete(`${API}/api/tasks/${t.id}`);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
