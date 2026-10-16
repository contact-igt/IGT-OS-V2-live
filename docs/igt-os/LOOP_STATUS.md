# LOOP STATUS

## Run 2 (2026-10-12, 19:46-20:45 UTC, ~1h wall clock; no cost telemetry available) - START HEAD `8f83779` on `claude/elegant-pasteur-hyppmv`
All 14 session-1 fixes were re-verified present in code before starting. PulseOS reference was NOT reachable (egress proxy 403 on
CONNECT); UI decisions used the existing IGT design direction + the live app. Superpowers skills are not installed in this
environment: the same discipline was applied manually (reproduce -> test first -> fix -> verify).
Push status: **BLOCKED** - GitHub returns 403 (Claude GitHub App has no write access to contact-igt/IGT-OS-V2-live). All work is committed locally.

| # | Objective (verified) | Evidence |
|---|---|---|
| 1 | One migration strategy; fresh DB reproducible; removed `DROP SCHEMA public CASCADE` from the old schema.sql | empty DB -> `db:init` -> 0001..0003 -> seed -> boot -> 80 tests; schema drift test |
| 2 | Task lifecycle end-to-end; server-owned audit trail; comments persisted (were never stored); blocker reasons persisted; timer stop idempotent | tasks-lifecycle tests + 21-check browser journey |
| 3 | Audit forgery closed (body-supplied actorName); audit read = admin/ops | api tests |
| 4 | Cortex permission-grounded SERVER-side (client prompt ignored, system turns rejected, retainers admin-only) | cortex tests |
| 5 | Password policy (10+, letter+digit, no name); CSPRNG temp passwords; admin create-user was broken on the schema | api tests |
| 6 | Real clients from DB (UI used a mock roster; unmapped tasks silently saved 'locally only'); fake metrics removed (marketing, client tab, cost-efficiency, parse-task, alerts) | browser journey + code |
| 7 | Command center: blockers + change requests feed the CEO/ops queue | delivery tests |
| 9 | Client projects: /projects list + detail (timeline, derived team and hours), migration 0004 | 7 API tests + 14-check browser journey |
| 8 | Delivery: change-request workflow with leadership gating of material changes; structured blockers; /delivery page | 13 API tests + 10-check browser journey |
| 9 | Integration registry (derived, no secrets) + marketing provenance strip | integrations tests |
| 10 | Monthly client report (CSV/JSON) from traceable data + download | reports tests + browser download |
| 11 | CSRF origin guard on unsafe methods; route-auth sweep over all 110 routes | api + sweep tests |
| 12 | Analytics: honest finance endpoint, correct time source, self-or-staff | analytics tests |
| 13 | Lint 18 -> 0 errors (no suppressions); one Next config (type errors fail builds); 27 dead files removed; CI workflow added (UNVERIFIED on GitHub) | eslint / tsc / next build |

## Final verification (fresh DB, local Postgres :5433, backend :4000, `next start` :3000)
- `node --test scripts/secret-guard.test.mjs` -> 1/1
- backend `tsc --noEmit` OK; frontend `tsc --noEmit` OK
- `eslint src` -> **0 errors**, 179 warnings (unused vars etc., not enforced)
- backend suite (`node --test tests/*.test.mjs`) -> **87/87** (api 32, tasks-lifecycle 10, cortex 6, delivery 13, projects 7, reports 8, integrations 4, schema 3, analytics 2, route-auth sweep 2)
- `next build` -> compiled, 59 pages
- browser journeys: task journey 21/21, delivery journey 10/10, projects journey 14/14
- responsive sweep (Chromium): admin 1440/1024/768/375/320 dark + 1440 light + 375 light, ops 1280, team 1440/768/375/320 + redirects: **73/77 clean**;
  the 4 flagged are one expected 404 (`/api/google/calendar/events` for a user with no Google account - the "not connected" signal), zero horizontal overflow anywhere, zero console errors.

## Known / BLOCKED
- Push to GitHub (403). Real Meta/Google Ads/GA/GBP access. PulseOS visual reference (egress policy).
- Live DB: the three legacy tables (time_entries / campaign_weekly_logs / ad_account_balances) may differ from migration 0002 - inspect before `db:migrate`.
- Rotation of the 16 historically weak accounts + JWT secret (RISK_REGISTER P0-R1).

## Next 5
1. Push (fix GitHub App access); rotate credentials; run `db:migrate --baseline-existing` on a COPY of the live DB first.
2. Server-side HR/compensation model (restricted) so payroll/finance UI stops being UI-only; label finance pages DEMO until then.
3. Development-project entity (milestones, QA/UAT/release states) linking change requests, tasks and GitHub repos; derive roadmap progress from tasks.
4. Social content pipeline statuses linked to tasks + approval history; deliverable/retainer tracking per client-month.
5. Meta/Google Ads adapters behind the registry once credentials/approval exist (fixtures + sync health first).

---

# Run 1 (2026-10-12) - kept for history
Branch: `claude/elegant-pasteur-hyppmv` (from `main` @ 08cdd05). Baseline note: the docs, branch `oct-12-build-v4`, and the "UI V3 foundation" referenced in the brief did NOT exist in this repository; this run started from `main` and created these docs.

## Run 1 (2026-10-12) - completed objectives (each verified)
| # | Objective | Evidence |
|---|---|---|
| 1 | Remove tracked plaintext/predictable credentials, hardcoded JWT secret, bundled demo vault passwords | `npm run test:secrets` red->green |
| 2 | JWT secret fail-closed (no guessable fallback) | prod boot throws without secret; dev ephemeral |
| 3 | Seed ships no usable hashes; `db:init` provisions one-time passwords | fresh DB init, 16 accounts forced to /set-password in browser |
| 4 | Public `reset-password` account takeover closed; forgot-password non-enumerating, admin-notified | API tests (410, identical responses) |
| 5 | 6 paid Next.js AI routes were unauthenticated -> ticket gate + per-user rate limit + size cap | curl through real Next server: 401/401/401, valid ticket reaches handler (400/413) |
| 6 | Task IDOR (update/timers/assets) -> assignee-or-creator, staff exempt | API tests incl. persistence refetch |
| 7 | OAuth connect/callback (Google/IG/YouTube): signed user-bound state, session required | API tests |
| 8 | Admin could mint super_admin; invoices readable by team; audit log + meeting transcripts readable by all | API tests |
| 9 | Salary values + vault passwords removed from browser bundle | guard + grep |
| 10 | logout does not clear cached app state (tasks/clients/roster) | fixed in AuthContext (not browser-asserted) |
| 11 | /api/health did not check DB; unauth /api/data leaked error text | API test |
| 12 | schema.sql could not bootstrap a fresh DB (UUID vs VARCHAR user ids) | fresh init works |
| 13 | CEO/Ops attention queue (DB-derived) + dashboard panel | API tests; browser: dark/light 1440, dark 375 |
| 14 | Mobile app shell unusable (main 135px @375) -> drawer; sidebar collapse now resizes layout | Playwright measurements 375/768/1440 |
| 15 | Mobile tab bar had 3 dead links | browser @375 as team: tabs = /my-workspace,/tasks,/my-profile; Profile click lands on /my-profile; 0 404s |

## Verification run (final, local throwaway Postgres, backend :4000, `next start` :3000)
- `npm run test:secrets` -> 1/1 pass
- `npm run test:api -w backend` -> 28/28 pass (auth, AI ticket gate, client/finance authz, health, task authz+persistence, privilege boundaries, OAuth, audit/meetings, command center, takeover paths)
- backend `tsc --noEmit` OK; frontend `tsc --noEmit` OK
- frontend eslint: 18 errors, identical file/rule set to base commit 08cdd05 (pre-existing react-hooks rules); 0 new
- frontend `next build`: compiled, 58 pages
- curl via real Next server: all 6 AI routes 401 without ticket; forged ticket 401; valid ticket reaches handler (400 bad body / 413 oversize)
- Playwright (Chromium): admin 1440 /home,/clients,/team,/audit,/ai: no console errors, no failed requests, session survives reload; team 375 /my-workspace,/tasks,/audit: no horizontal overflow, /audit redirected (UI) and 403 (server); mobile drawer open/Escape; tablet 768 persistent sidebar; desktop collapse resizes main 1200->1376px; attention panel dark+light 1440, dark 375.
- NOT browser-tested: forgot-password screen flow (API + typecheck/build only), logout cache clearing, light theme on mobile, viewports 1024/320, keyboard/focus/contrast audit.
- Known noise: team users still trigger 403s on github/social/audit fetches from AppContext (P2: skip those fetches by role).

## BLOCKED / ACCESS REQUIRED
- Rotate every account whose password followed the old pattern (see RISK_REGISTER P0-R1). Needs a human with production access.
- Meta/Google Ads/GA/GBP/YouTube Analytics live data: no credentials/approvals in this environment -> ACCESS REQUIRED.
- Git history still contains the removed secrets; history rewrite is a business decision (not done).

## Next 5
1. Rotate production credentials + JWT secret; decide on history rewrite.
2. Consolidate schema.sql + add_*.ts into ordered migrations (P1-1).
3. Server-side compensation/HR API replacing seeded salary/payroll UI; label finance pages DEMO until then.
4. Blockers/change-request tables + roadmap (OPERATIONS_GAPS).
5. Integration registry table + sync-health states; social pipeline statuses.
