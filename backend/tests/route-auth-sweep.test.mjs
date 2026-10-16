// Permanent regression guard: EVERY backend route must reject an anonymous caller, except an explicit public allow-list.
// Routes are discovered from the source (route files + their mount prefixes in index.ts), so a newly added route that
// forgets auth fails this test automatically.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const API = process.env.API_URL || 'http://localhost:4000';
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');
const SRC = 'src';
const index = fs.readFileSync(path.join(SRC, 'index.ts'), 'utf8');

// import name -> route file
const importFile = {};
for (const m of index.matchAll(/import\s+(\w+)\s+from\s+'\.\/routes\/([\w.]+)'/g)) importFile[m[1]] = m[2];
// mounts: app.use('/api/x', ...anything..., xRoutes)
const mounts = [];
for (const m of index.matchAll(/app\.use\('(\/api[^']*)'([^;]*?)\b(\w+)\)\s*;/g)) if (importFile[m[3]]) mounts.push({ prefix: m[1], file: importFile[m[3]], preAuth: /requireAuth/.test(m[2]) });

const routes = [];
for (const { prefix, file } of mounts) {
  const src = fs.readFileSync(path.join(SRC, 'routes', `${file}.ts`), 'utf8');
  for (const m of src.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']*)'/g)) routes.push({ method: m[1].toUpperCase(), url: (prefix + (m[2] === '/' ? '' : m[2])).replace(/:\w+/g, '00000000-0000-0000-0000-000000000000') });
}
// routes declared directly on app in index.ts
for (const m of index.matchAll(/app\.(get|post|put|patch|delete)\(\s*'(\/api[^']*)'/g)) routes.push({ method: m[1].toUpperCase(), url: m[2].replace(/:\w+/g, '00000000-0000-0000-0000-000000000000') });

// Intentionally public (each is individually justified)
const PUBLIC = new Set([
  'GET /api/health',                       // liveness + DB round-trip, no data
  'POST /api/login', 'POST /api/auth/identify',        // authentication entry points
  'POST /api/auth/refresh', 'POST /api/auth/logout',   // cookie-based; refuse without a valid refresh cookie
  'POST /api/users/forgot-password',       // non-enumerating, notifies admins
  'POST /api/users/reset-password',        // returns 410 (disabled)
  'GET /api/ai/login-hero-public',         // allow-listed + daily capped
  'POST /api/webhooks/github',             // HMAC-verified
  'GET /api/auth/ai-ticket/verify',        // ticket-verified (Bearer), 401 without
  'GET /api/cortex/context',               // ticket-verified (Bearer), 401 without
  'GET /api/app-secrets/internal/00000000-0000-0000-0000-000000000000', // x-internal-secret
]);

test(`discovered routes (${routes.length}) all reject anonymous callers unless allow-listed`, async () => {
  assert.ok(routes.length > 80, `route discovery looks broken (${routes.length})`);
  const leaks = [];
  for (const r of routes) {
    const key = `${r.method} ${r.url}`;
    const res = await fetch(`${API}${r.url}`, { method: r.method, headers: { 'Content-Type': 'application/json' }, body: r.method === 'GET' ? undefined : '{}', redirect: 'manual' });
    if (PUBLIC.has(key)) { assert.ok([200, 400, 401, 403, 404, 410, 429].includes(res.status), `${key} unexpected ${res.status}`); continue; }
    if (res.status !== 401 && res.status !== 403) leaks.push(`${key} -> ${res.status}`);
  }
  assert.deepEqual(leaks, [], 'Routes that answered an anonymous caller:\n' + leaks.join('\n'));
});

test('public allow-list entries really exist (stale entries are a smell)', () => {
  const have = new Set(routes.map(r => `${r.method} ${r.url}`));
  const missing = [...PUBLIC].filter(k => !have.has(k) && !k.includes('webhooks'));
  assert.deepEqual(missing, []);
});
