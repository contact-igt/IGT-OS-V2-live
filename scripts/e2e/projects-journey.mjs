// Projects E2E (Playwright): create a project, add a task from the project page, link an AI meeting, raise a change
// request from it (lands in Delivery), then check what a developer / an unrelated developer see.
// Same prerequisites as task-journey.mjs (local backend :4000 + next :3000 on a seeded TEST DB; TEST_PASSWORD).
import { chromium } from 'playwright';
const PW = process.env.TEST_PASSWORD, API = 'http://localhost:4000', WEB = 'http://localhost:3000';
const STAMP = Date.now() % 100000;
const NAME = `E2E Project ${STAMP}`, TASK = `E2E build step ${STAMP}`, MEETING = `E2E kickoff ${STAMP}`, DECISION = `Add SMS reminders ${STAMP}`;
let pass = 0, fail = 0; const ok = (n, p, x = '') => { p ? pass++ : fail++; console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); };
const browser = await chromium.launch({ args: ['--disable-background-networking', '--disable-component-update', '--no-first-run', '--proxy-bypass-list=*'] });
const mk = async (email, vw = { width: 1280, height: 900 }) => { const c = await browser.newContext({ viewport: vw }); await c.request.post(`${API}/api/login`, { data: { email, password: PW } }); const p = await c.newPage(); p.setDefaultTimeout(12000); return { c, p }; };
const settle = (p, ms = 2500) => p.waitForTimeout(ms);
const vis = async (loc) => { try { return await loc.first().isVisible(); } catch { return false; } };

const A = await mk('sushilathithiyaa@invictusglobaltech.com');
await A.p.goto(`${WEB}/projects`, { waitUntil: 'domcontentloaded' }); await settle(A.p);
ok('projects page loads for leadership', await vis(A.p.getByRole('heading', { name: 'Projects' })));
await A.p.getByRole('button', { name: /Add project/ }).click();
await A.p.locator('select').filter({ hasText: 'Select client' }).selectOption({ index: 1 });
await A.p.getByLabel('Project name').fill(NAME);
await A.p.getByLabel('Details').fill('E2E: client booking portal');
await A.p.getByRole('button', { name: 'Create project' }).click();
await A.p.waitForURL(/\/projects\/[0-9a-f-]{36}$/); await settle(A.p);
const projectId = A.p.url().split('/').pop();
ok('creating a project opens its page', await vis(A.p.getByRole('heading', { name: NAME })));
ok('timeline starts with "Project created"', await vis(A.p.getByText('Project created')));
ok('team is empty until someone works on it', await vis(A.p.getByText(/Nobody yet/)));
ok('summary row starts at zero meetings', await vis(A.p.locator('dt', { hasText: 'Meetings held' })) && (await A.p.locator('dt', { hasText: 'Meetings held' }).locator('xpath=following-sibling::dd').innerText()) === '0');

const proj = await (await A.c.request.get(`${API}/api/projects/${projectId}`)).json();
const users = await (await A.c.request.get(`${API}/api/users`)).json();
const dev = users.find(u => u.email === 'aiswarya.saiju.igt@gmail.com');

// --- task created FROM the project page, assigned to a developer
await A.p.getByRole('button', { name: '+ New task' }).click(); await settle(A.p, 800);
ok('New Task form opens with the project preselected', (await A.p.getByLabel('Project', { exact: true }).inputValue()) === projectId);
await A.p.getByPlaceholder('e.g. WhatsNexus Lead Tracking Setup', { exact: true }).fill(TASK);
// deadline is required: pick a day in the calendar popup
await A.p.getByText('Select date & time...').click(); await settle(A.p, 400);
await A.p.getByText('28', { exact: true }).first().click();
await A.p.getByRole('button', { name: 'Confirm' }).click(); await settle(A.p, 400);
// scroll the assignee field into view BEFORE clicking: the dropdown closes on any scroll event
const assignees = A.p.getByText('Select team members...');
await assignees.scrollIntoViewIfNeeded(); await settle(A.p, 600);
await assignees.click(); await settle(A.p, 500);
await A.p.getByText(dev.name, { exact: false }).last().click();
await A.p.getByRole('button', { name: 'Create Task' }).click(); await settle(A.p, 5500);
const made = (await (await A.c.request.get(`${API}/api/tasks`)).json()).find(t => t.title === TASK);
ok('task saved with the project (server)', !!made && made.projectId === projectId);
await A.p.reload({ waitUntil: 'domcontentloaded' }); await settle(A.p);
ok('task is listed on the project page', await vis(A.p.getByText(TASK)));
ok('assigned developer appears under "Who worked on this project"', await vis(A.p.getByRole('table').getByText(dev.name)));

// --- the same task on the Tasks page, with the project shown
await A.p.goto(`${WEB}/tasks`, { waitUntil: 'domcontentloaded' }); await settle(A.p, 3500);
ok('Tasks page shows the task with its project name', await vis(A.p.locator('.card', { hasText: TASK }).filter({ hasText: NAME })));
await A.p.getByLabel('Filter by project').selectOption(projectId); await settle(A.p, 800);
ok('Tasks page project filter keeps the task', await vis(A.p.getByText(TASK)));

// --- an AI meeting (saved as the analysis step would) linked from the project page
const result = { summary: `Agreed booking flow ${STAMP}`, decisions: [{ decision: DECISION, decidedBy: 'Dr. Rao', isBinding: true, sourceQuote: 'we need SMS' }], actionItems: [],
  meetingMeta: { title: MEETING, clientName: proj.client_name }, meetingQuality: { score: 7, rating: 'good', flags: [], positives: [], issues: [], narrative: 'ok' },
  talkTime: { participants: [], clientTalkPercent: 40, invictusTalkPercent: 60, conversationBalance: 'balanced', balanceNote: '' } };
const meeting = await (await A.c.request.post(`${API}/api/meetings`, { data: { title: MEETING, clientId: proj.client_id, result, transcriptSnippet: 'RAW-TRANSCRIPT' } })).json();
await A.p.goto(`${WEB}/projects/${projectId}`, { waitUntil: 'domcontentloaded' }); await settle(A.p);
await A.p.getByLabel('Meeting to link').selectOption(meeting.id);
await A.p.getByRole('button', { name: 'Link meeting' }).click(); await settle(A.p);
ok('linked meeting shows its summary and decision on the project', await vis(A.p.getByText(`Agreed booking flow ${STAMP}`)) && await vis(A.p.getByText(DECISION)));
ok('"Meetings held" is now 1', (await A.p.locator('dt', { hasText: 'Meetings held' }).locator('xpath=following-sibling::dd').innerText()) === '1');
ok('meeting also appears on the timeline', await vis(A.p.locator('ol').getByText(MEETING)));
ok('no transcript text anywhere on the project page', !(await A.p.content()).includes('RAW-TRANSCRIPT'));

// --- raise a change request from the meeting's decision -> Delivery
await A.p.getByRole('link', { name: 'Open meeting' }).first().click(); await A.p.waitForURL(/\/meetings\//); await settle(A.p, 3500);
ok('meeting page shows the linked project', (await A.p.getByLabel('Link meeting to project').inputValue()) === projectId);
await A.p.getByRole('button', { name: /^Decisions/ }).click();
await A.p.getByRole('button', { name: 'Raise change request' }).first().click();
await A.p.getByRole('button', { name: 'Send to Delivery' }).click(); await settle(A.p, 1500);
ok('change request raised from the decision', await vis(A.p.getByText('✓ Raised in Delivery')));
await A.p.goto(`${WEB}/projects/${projectId}`, { waitUntil: 'domcontentloaded' }); await settle(A.p);
ok('project lists the change under "Changes needed" as pending', await vis(A.p.getByRole('region', { name: 'Changes needed' }).getByText(DECISION)) && await vis(A.p.getByRole('region', { name: 'Changes needed' }).getByText('pending')));
ok('"Open changes" is 1 and the timeline shows it', (await A.p.locator('dt', { hasText: 'Open changes' }).locator('xpath=following-sibling::dd').innerText()) === '1' && await vis(A.p.locator('ol').getByText('Change requested')));
await A.p.goto(`${WEB}/delivery`, { waitUntil: 'domcontentloaded' }); await settle(A.p, 3000);
await A.p.getByLabel('Filter by project').selectOption(projectId); await settle(A.p, 1500);
ok('Delivery shows the request with its project, filtered by project', await vis(A.p.locator('li', { hasText: DECISION }).filter({ hasText: NAME })));

// --- developer started (real timer), then the developer's own view
const D = await mk('aiswarya.saiju.igt@gmail.com');
await D.c.request.post(`${API}/api/tasks/${made.id}/timer/start`); await D.c.request.post(`${API}/api/tasks/${made.id}/timer/stop`);
await D.p.goto(`${WEB}/projects/${projectId}`, { waitUntil: 'domcontentloaded' }); await settle(D.p);
ok('developer sees the project', await vis(D.p.getByRole('heading', { name: NAME })));
ok('timeline says the developer started working', await vis(D.p.getByText(/started working on this project/)));
ok('developer reads the meeting review but gets no link to the meeting page', await vis(D.p.getByText(`Agreed booking flow ${STAMP}`)) && (await D.p.getByRole('link', { name: 'Open meeting' }).count()) === 0);
ok('developer has no status control and no Remove / attach', (await D.p.locator('select').filter({ hasText: 'planned' }).count()) === 0 && (await D.p.getByRole('button', { name: 'Remove' }).count()) === 0 && (await D.p.getByRole('button', { name: 'Add task' }).count()) === 0);
ok('developer can add a note and start a new task from here', await vis(D.p.getByRole('button', { name: 'Add', exact: true })) && await vis(D.p.getByRole('button', { name: '+ New task' })));
await D.p.goto(`${WEB}/tasks`, { waitUntil: 'domcontentloaded' }); await settle(D.p, 3500);
ok('developer sees the project name on their Tasks page', await vis(D.p.locator('.card', { hasText: TASK }).filter({ hasText: NAME })));

// --- an unrelated developer gets nothing; phone width fits
const O = await mk('rutuja.rajbhar.igt@gmail.com');
await O.p.goto(`${WEB}/projects/${projectId}`, { waitUntil: 'domcontentloaded' }); await settle(O.p);
ok('unrelated developer cannot open the project', await vis(O.p.getByText('Project not found')));
const M = await mk('sushilathithiyaa@invictusglobaltech.com', { width: 390, height: 800 });
for (const [label, path] of [['list', '/projects'], ['detail', `/projects/${projectId}`], ['delivery', '/delivery']]) {
  await M.p.goto(WEB + path, { waitUntil: 'domcontentloaded' }); await settle(M.p, 3000);
  ok(`no horizontal scroll at 390px: ${label}`, await M.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
}

await A.c.request.delete(`${API}/api/tasks/${made.id}`);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
