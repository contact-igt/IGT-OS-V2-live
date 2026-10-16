# QA MATRIX (what is actually automated / actually run)

Commands (see CLAUDE.md): `npm run test:secrets`; `npm run test:api -w backend` (needs backend + seeded TEST DB); browser journeys in `scripts/e2e/`.

## Backend suite - 87 tests, all passing on a freshly bootstrapped DB
| File | Tests | Covers |
|---|---|---|
| api.test.mjs | 32 | auth basics, AI ticket gate, client/finance authz, health, task authz + persistence, privilege boundaries (super_admin), OAuth state, audit/meeting scoping, takeover paths, password policy, CSRF |
| tasks-lifecycle.test.mjs | 10 | create -> assign -> timer -> comment -> block -> review -> rework -> done; attachments; server audit; forgery |
| cortex.test.mjs | 6 | permission-grounded context per role; no emails/credentials/salary; ticket auth |
| projects.test.mjs | 7 | project create/validation, RBAC (members only), derived team + hours, timeline incl. rework steps, notes/links, detach, audit |
| delivery.test.mjs | 13 | change-request lifecycle + materiality rules + RBAC + audit; blockers + command-center integration |
| reports.test.mjs | 8 | RBAC, period bounds, provenance honesty, CSV formula-injection guard, audit |
| integrations.test.mjs | 4 | staff-only, not-built providers, no secret leakage, expired/stale account health |
| schema.test.mjs | 3 | no destructive migrations, migrations recorded, columns the code queries exist |
| analytics.test.mjs | 2 | time analytics source + access, honest finance endpoint |
| route-auth-sweep.test.mjs | 2 | all 110 discovered routes reject anonymous callers (explicit public allow-list) |

## Other gates
secret guard (1) - fails on tracked credentials/hashes/guessable secrets; `tsc --noEmit` backend + frontend; `eslint src` (0 errors); `next build` (59 pages).

## Browser (Playwright/Chromium, real stack)
- `scripts/e2e/task-journey.mjs` - 21 checks: login, dashboard, task created through the real modal (client dropdown == DB clients), persisted fields, assignee drawer comment + status + blocked-with-reason, reload with cleared cache, attention queue (API + UI), audit (API + UI), outsider blocked (UI + server), Cortex fails honestly.
- `scripts/e2e/projects-journey.mjs` - 14 checks: admin creates project in the UI -> attaches a task -> team appears -> meeting note + link -> developer sees it without manage controls -> unrelated developer gets 'not found' -> no horizontal scroll at 390px.
- `scripts/e2e/delivery-journey.mjs` - 10 checks: capture -> impact -> ops refused with reason -> leadership accepts -> blocker raise/resolve -> team kept off page + server 403.
- Responsive sweep (run 2): 77 page/viewport checks (roles x 1440/1024/768/375/320 x dark/light): 73 clean; 4 = expected Google "not connected" 404.
Playwright is not a repo dependency yet (global tool): install `playwright` to run the scripts.

## Not covered / UNVERIFIED
Real provider calls (OpenAI/Gemini/Anthropic, Meta, Google, GitHub); email; production DB; keyboard/focus/contrast audit; reduced-motion; logout cache clearing in a browser; leave approval authz; CI on GitHub.
