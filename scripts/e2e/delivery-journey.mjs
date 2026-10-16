// Delivery E2E (Playwright): change request capture -> impact -> ops refused on material -> leadership accepts -> blocker raise/resolve.
// Same prerequisites as task-journey.mjs (local backend :4000 + next :3000 on a seeded TEST DB; TEST_PASSWORD).
import { chromium } from 'playwright';
const PW = process.env.TEST_PASSWORD, API = 'http://localhost:4000', WEB = 'http://localhost:3000';
const TITLE = `E2E CR ${Date.now() % 100000}`;
let pass = 0, fail = 0; const ok = (n, p, x = '') => { p ? pass++ : fail++; console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); };
const browser = await chromium.launch({ args: ['--disable-background-networking', '--disable-component-update', '--no-first-run', '--proxy-bypass-list=*'] });
const mk = async email => { const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await c.request.post(`${API}/api/login`, { data: { email, password: PW } }); const p = await c.newPage(); p.setDefaultTimeout(12000); p.on('dialog', d => d.accept('Resolved on a call with the client')); return { c, p }; };
const get = async (ctx, path) => (await ctx.request.get(`${API}/api/delivery${path}`)).json();

const A = await mk('sushilathithiyaa@invictusglobaltech.com');
await A.p.goto(`${WEB}/delivery`, { waitUntil: 'domcontentloaded' }); await A.p.waitForTimeout(3000);
ok('delivery page loads for leadership', await A.p.getByRole('heading', { name: 'Delivery' }).isVisible());
await A.p.getByRole('button', { name: /Capture client request/ }).click();
await A.p.locator('select').filter({ hasText: 'Select client' }).selectOption({ index: 1 });
await A.p.getByLabel('Title').fill(TITLE);
await A.p.getByLabel('What did the client ask for?').fill('Client wants an online payments module added to the website');
await A.p.getByLabel('Type').selectOption('new_feature');
await A.p.getByRole('button', { name: /^Capture$/ }).click(); await A.p.waitForTimeout(1500);
const cr = (await get(A.c, '/change-requests?decision=pending')).find(x => x.title === TITLE);
ok('captured request persisted (pending, material)', !!cr && cr.decision === 'pending' && cr.is_material === true, cr ? cr.classification : 'missing');
ok('request is visible in the list', await A.p.getByText(TITLE).first().isVisible());

// ops tries to accept the material change -> refused with the server's reason shown in the UI
const O = await mk('contact@invictusglobaltech.com');
await O.p.goto(`${WEB}/delivery`, { waitUntil: 'domcontentloaded' }); await O.p.waitForTimeout(3000);
await O.p.getByText(TITLE).first().click(); await O.p.waitForTimeout(500);
await O.p.getByRole('button', { name: /^Accept$/ }).click(); await O.p.waitForTimeout(1200);
ok('ops is refused and the reason is shown', await O.p.getByText(/require explicit acceptance by leadership/i).isVisible().catch(() => false));
await O.p.getByLabel('Scope impact').fill('Payment gateway integration + checkout page');
await O.p.getByLabel('Timeline (days)').fill('12'); await O.p.getByLabel('Commercial (₹)').fill('45000');
await O.p.getByRole('button', { name: /Save analysis/ }).click(); await O.p.waitForTimeout(1200);
const analysed = (await get(A.c, '/change-requests')).find(x => x.id === cr.id);
ok('impact analysis persisted', analysed.timeline_impact_days === 12 && analysed.commercial_impact_inr === 45000 && /gateway/.test(analysed.scope_impact));

// leadership accepts -> roadmap bucket
await A.p.reload({ waitUntil: 'domcontentloaded' }); await A.p.waitForTimeout(3000);
await A.p.getByText(TITLE).first().click(); await A.p.waitForTimeout(500);
await A.p.getByRole('button', { name: /^Accept$/ }).click(); await A.p.waitForTimeout(1500);
const decided = (await get(A.c, '/change-requests?decision=accepted')).find(x => x.id === cr.id);
ok('leadership acceptance persisted with roadmap bucket', !!decided && decided.roadmap_bucket === 'next' && decided.decided_by_name === 'Sushil Athithiyaa', decided ? decided.roadmap_bucket : 'missing');

// blocker raise + resolve through the UI
await A.p.getByRole('tab', { name: 'Blockers' }).click(); await A.p.waitForTimeout(500);
await A.p.getByRole('button', { name: /Raise blocker/ }).click();
await A.p.getByLabel('Title').fill('E2E blocker: awaiting brand assets');
await A.p.getByLabel('Reason').fill('Client has not shared logo files');
await A.p.getByLabel('Severity').selectOption('high');
await A.p.getByRole('button', { name: /^Raise blocker$/ }).last().click(); await A.p.waitForTimeout(1500);
const blk = (await get(A.c, '/blockers')).find(x => x.title === 'E2E blocker: awaiting brand assets');
ok('blocker persisted with owner + severity', !!blk && blk.severity === 'high' && blk.owner_name === 'Sushil Athithiyaa');
await A.p.getByRole('button', { name: /^Resolve$/ }).first().click(); await A.p.waitForTimeout(1500);
const done = (await get(A.c, '/blockers?status=resolved')).find(x => x.id === blk.id);
ok('blocker resolution persisted with note', !!done && /call with the client/.test(done.resolution_note));

// permission: a plain team member cannot open the page (UI) nor decide (server)
const T = await mk('rutuja.rajbhar.igt@gmail.com');
await T.p.goto(`${WEB}/delivery`, { waitUntil: 'domcontentloaded' }); await T.p.waitForTimeout(2500);
ok('team member is kept off /delivery (UI)', !new URL(T.p.url()).pathname.startsWith('/delivery'), new URL(T.p.url()).pathname);
ok('...and the server refuses their decision (403)', (await T.c.request.post(`${API}/api/delivery/change-requests/${cr.id}/decision`, { data: { decision: 'rejected', note: 'x' } })).status() === 403);
await browser.close(); console.log(`\n${pass}/${pass + fail} checks passed`); process.exit(fail ? 1 : 0);
