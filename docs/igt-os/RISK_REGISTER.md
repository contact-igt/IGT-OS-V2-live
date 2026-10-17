# RISK REGISTER  (status after run 2; FIXED = reproduced, fixed, test-verified)

## P0 - security / privacy / authz / secrets / data loss
| ID | Finding | Status |
|---|---|---|
| P0-1 | Public `POST /users/reset-password` = account takeover | FIXED (410; admin-issued resets; non-enumerating forgot-password) |
| P0-2 | 6 paid Next.js AI routes unauthenticated | FIXED (AI ticket + 30/min/user + size caps) |
| P0-3 | Plaintext/predictable credentials, hardcoded JWT secret, guessable fallback | FIXED in tree. **History still contains them -> P0-R1** |
| P0-4 | Task IDOR (update/timers/assets) | FIXED |
| P0-5 | OAuth state forgeable (Google tokens could be bound to another user) | FIXED (signed, user-bound, session required) |
| P0-6 | admin could grant/modify super_admin | FIXED |
| P0-7 | Invoices / audit log / meeting transcripts readable by every user | FIXED |
| P0-8 | Salaries + vault passwords shipped in the browser bundle | FIXED |
| P0-9 | App-state cache survived logout | FIXED in code (not browser-asserted) |
| P0-10 | Old schema.sql began with `DROP SCHEMA public CASCADE` (db:init destroyed a real DB) | FIXED (removed; init refuses production; test forbids DROP/TRUNCATE) |
| P0-11 | Audit trail forgeable: any user could POST audit rows with any `actorName` / task events | FIXED (actor forced from session; server-owned task events; clients' copies ignored) |
| P0-12 | CSRF: cookies are SameSite=None in prod, unsafe methods were not origin-checked | FIXED (Origin / Sec-Fetch-Site guard; tested) |
| P0-13 | Cortex scope was decided in the browser (client-built prompt, mock leadership ids, arbitrary systemPrompt accepted) | FIXED (server builds context from the verified caller) |
| **P0-R1** | **HUMAN ACTION**: git history still contains the old plaintext passwords (pattern `IGT@<FirstName>2026`, 16 accounts), a JWT secret literal and a login password literal; session-1 transcript displayed them once. Force-reset those accounts, rotate `JWT_SECRET`, invalidate refresh tokens, decide on a history rewrite. | OPEN |

## P1 - correctness, persistence, mock-as-real, inert controls
| ID | Finding | Status |
|---|---|---|
| P1-1 | Schema not reproducible (UUID vs VARCHAR ids, stray add_*.ts, competing table definitions) | FIXED locally (ordered migrations + runner + drift test). **Live DB UNVERIFIED**: compare `time_entries`/`campaign_weekly_logs`/`ad_account_balances` to migration 0002 (camelCase) before `db:migrate`; run `--baseline-existing` once on a COPY first |
| P1-2 | Modules with no backend (finance/payments/opex/projections, sales/deals/leads, approvals, expense claims, hiring, devProjects, ad recharges): in-memory only | OPEN (see MODULE_MATRIX); finance endpoint now says UNKNOWN, not a made-up number |
| P1-3 | No compensation/HR model; payroll UI reads a roster whose salaries are now 0 | OPEN (restricted model needed before any real salary data) |
| P1-4 | `team/[id]` hard-codes a 25,000 INR salary placeholder in "estimated cost" | OPEN |
| P1-5 | Password policy was 6 chars | FIXED (10+, letter+digit, no name tokens) |
| P1-6 | `/auth/identify` returns a display name for an email (enumeration, by design for the welcome screen) | OPEN (decision) |
| P1-7 | `POST /notifications` lets any user notify any user (message is free text, actor is the real sender) | OPEN (low) |
| P1-8 | Deactivated users keep API access until their 15-min access token expires (refresh path re-checks is_active) | NOTED (bounded 15 min) |
| P1-9 | UI client list was the mock roster; DB clients never appeared; unmapped tasks saved 'locally only' | FIXED |
| P1-10 | Any authenticated role can create clients (New Task quick-add) | OPEN (policy decision) |
| P1-11 | In-memory rate limits (AI tickets, public hero, reset requests) are per-process | NOTED (single instance only) |
| P1-12 | Internal-secret compare not constant-time; app-secret set/delete not audited | compare FIXED; audit OPEN |
| P1-13 | Comments/revision notes were never persisted (only notifications + audit text) | FIXED |
| P1-14 | Fake numbers in UI: marketing seed campaigns, 'balance/1000 days left', hard-coded CPL trend, cost-efficiency task counts, parse-task mock result, always-after-10AM alert | FIXED |
| P1-15 | `time_entries` analytics read a table nothing writes | FIXED (reads time_logs; legacy table now unused -> drop in a future migration, NOT done) |
| P1-17 | `POST /api/meetings` with a `googleEventId` upserts on `google_event_id` with no owner check: any signed-in user who knows another user's calendar event id can overwrite that meeting's analysis (found while adding project links; NOT changed) | OPEN (add `WHERE meetings.created_by = EXCLUDED.created_by` or staff-only on conflict) |
| P1-16 | `next.config.js` had `typescript.ignoreBuildErrors: true` and duplicated next.config.ts | FIXED |

## P2 / P3
- P2: no deliverable/retainer tracking; no dev-project entity (milestones, QA/UAT/release); no roadmap progress derivation; social content pipeline absent; Ads adapters not built; HR documents/NDAs absent.
- P2: CI workflow added but UNVERIFIED on GitHub; `next build` not in CI (lockfile lacks Linux native binaries).
- P3: ~180 eslint warnings (unused vars); older pages still hard-code colors (`#2AB182`, amber/red utility classes) - migrate to `--c-*` tokens as touched; "not connected" Google calendar signal is a 404.
