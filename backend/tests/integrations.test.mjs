// Integration registry: derived from real state, role-gated, never leaks secrets, never fabricates health.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const API = process.env.API_URL || 'http://localhost:4000';
const PW = process.env.TEST_PASSWORD;
assert.ok(PW, 'TEST_PASSWORD required');
if (/railway|prod/i.test(API)) throw new Error('Refusing to run against a non-local API');
const skipDb = !process.env.DATABASE_URL && 'DATABASE_URL not set';

async function login(email) {
  const res = await fetch(`${API}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  return { get: path => fetch(`${API}${path}`, { headers: { Cookie: cookie } }) };
}

describe('integration registry', () => {
  test('staff only', async () => {
    assert.equal((await fetch(`${API}/api/integrations`)).status, 401);
    assert.equal((await (await login('aiswarya.saiju.igt@gmail.com')).get('/api/integrations')).status, 403);
    assert.equal((await (await login('contact@invictusglobaltech.com')).get('/api/integrations')).status, 200);
  });

  test('providers without an adapter are ACCESS_REQUIRED + not_built, never healthy or "live"', async () => {
    const body = await (await (await login('sushilathithiyaa@invictusglobaltech.com')).get('/api/integrations')).json();
    for (const key of ['meta_ads', 'google_ads', 'google_analytics', 'google_business_profile']) {
      const p = body.providers.find(x => x.key === key);
      assert.ok(p, key); assert.equal(p.adapter, 'not_built'); assert.equal(p.status, 'ACCESS_REQUIRED'); assert.equal(p.dataClass, 'UNKNOWN'); assert.equal(p.lastSuccessfulSync, null);
    }
    assert.ok(body.thresholds.staleSyncHours > 0);
  });

  test('unconfigured OAuth providers say NOT_CONFIGURED and list missing config NAMES only (no values, no secrets)', async () => {
    const res = await (await login('sushilathithiyaa@invictusglobaltech.com')).get('/api/integrations');
    const raw = await res.text(); const body = JSON.parse(raw);
    for (const key of ['instagram', 'youtube']) {
      const p = body.providers.find(x => x.key === key);
      if (!p.configured) { assert.equal(p.status, 'NOT_CONFIGURED'); assert.ok(p.missingConfig.every(n => /^[A-Z_]+$/.test(n))); }
      assert.notEqual(p.dataClass, 'LIVE API', 'no connected account => not live');
    }
    assert.doesNotMatch(raw, /encrypted_|access_token|refresh_token|client_secret|Bearer |@/, 'no token columns, bearer strings or emails in the registry (env var NAMES are fine)');
  });

  test('a connected account with an EXPIRED token is ERROR (not healthy / not hidden); stale sync is DEGRADED', { skip: skipDb }, async () => {
    process.env.META_APP_ID = ''; // registry reads server env, so we assert the account-state rules via the DB-backed path only if configured
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(`DELETE FROM public.social_accounts WHERE platform_user_id LIKE 'itest-%'`);
      await pool.query(`INSERT INTO public.social_accounts (platform, account_label, platform_user_id, encrypted_access_token, access_token_iv, token_expires_at, last_synced_at)
                        VALUES ('youtube','ITEST expired','itest-1', '\\x00', '\\x00', now() - interval '2 days', now() - interval '1 hour'),
                               ('youtube','ITEST stale','itest-2', '\\x00', '\\x00', now() + interval '30 days', now() - interval '3 days')`);
      const body = await (await (await login('sushilathithiyaa@invictusglobaltech.com')).get('/api/integrations')).json();
      const yt = body.providers.find(p => p.key === 'youtube');
      const exp = yt.accounts.find(a => a.label === 'ITEST expired'), stale = yt.accounts.find(a => a.label === 'ITEST stale');
      assert.equal(exp.health, 'ERROR'); assert.match(exp.reason, /expired/);
      assert.equal(stale.health, 'DEGRADED'); assert.match(stale.reason, /sync/);
      if (yt.configured) assert.equal(yt.status, 'ERROR', 'provider status is the worst account state');
      assert.equal(JSON.stringify(yt).includes('\\x00'), false);
    } finally {
      await pool.query(`DELETE FROM public.social_accounts WHERE platform_user_id LIKE 'itest-%'`);
      await pool.end();
    }
  });
});
