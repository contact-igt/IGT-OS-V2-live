// Regression guard: fails if plaintext credentials / hashes / guessable secrets are tracked.
// Run: npm run test:secrets   (never prints matched values)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files -z', { encoding: 'utf8' }).split('\0').filter(Boolean)
  .filter(f => !/package-lock\.json$|\.(png|jpg|jpeg|svg|ico|woff2?|pdf)$|^scripts\/secret-guard/.test(f));

const RULES = [
  ['bcrypt hash committed', /\$2[aby]\$\d{2}\$[A-Za-z0-9./]{40,}/],
  ['password/pass literal', /\b(pass|passwd|password|pwd)['"]?\s*[:=]\s*['"][^'"\s]{6,}['"]/i],
  ['JWT/secret literal', /\b(jwt_?secret|secret_?key|api_?key|client_?secret)['"]?\s*[:=]\s*['"][^'"\s]{8,}['"]/i],
  ['guessable secret fallback', /\|\|\s*['"][^'"]*(secret|fallback)[^'"]*['"]/i],
  ['jwt.sign with literal secret', /jwt\.sign\([^)]*,\s*['"][^'"]{8,}['"]/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['provider token', /\b(AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{24,}|ghp_[A-Za-z0-9]{30,}|EAA[A-Za-z0-9]{40,})/],
];

test('no plaintext credentials or secrets are tracked in git', () => {
  const hits = [];
  for (const f of files) {
    let text; try { text = readFileSync(f, 'utf8'); } catch { continue; }
    text.split('\n').forEach((line, i) => {
      for (const [name, re] of RULES) if (re.test(line)) hits.push(`${f}:${i + 1} [${name}]`);
    });
  }
  assert.deepEqual(hits, [], 'Secret-like content found (values withheld):\n' + hits.join('\n'));
});
