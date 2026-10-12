# RISK REGISTER  (status as of run 1; FIXED = reproduced, fixed, test-verified)

## P0 - security / privacy / authz / secrets / integrity
| ID | Finding | Status |
|---|---|---|
| P0-1 | `POST /api/users/reset-password` public: email + new password = full account takeover | FIXED (410; admin-issued resets) |
| P0-2 | 6 Next.js AI routes unauthenticated (spend OpenAI/Gemini/Anthropic keys; cortex-chat = open LLM proxy) | FIXED (AI ticket + rate limit + size cap) |
| P0-3 | Plaintext default passwords tracked (`generate_users.js`), predictable-password hashes in `seed.sql`/`generated_users.sql`, plaintext in browser-bundled `data.ts`, hardcoded JWT secret (`test_fetch.js`), guessable JWT fallback in `tokens.ts` | FIXED in tree. **Rotation required, see P0-R1** |
| P0-4 | Task IDOR: any user could update/time/attach/download/delete any task's data | FIXED |
| P0-5 | OAuth `state` was attacker-controlled JSON; Google flow trusted `?userId=` -> a victim consenting on a crafted link could have Calendar/Gmail tokens stored under another user | FIXED |
| P0-6 | admin could grant/modify `super_admin` (self-escalation) | FIXED |
| P0-7 | Invoices readable by `team`; audit log and all meeting transcripts readable by every user | FIXED |
| P0-8 | Salary figures and client-credential passwords shipped in the frontend bundle | FIXED (values removed). Real payroll still unmodelled, see P1-3 |
| P0-9 | App-state cache (tasks, client commercials, roster, attendance) survived logout in localStorage | FIXED in code; not browser-asserted |
| P0-R1 | **HUMAN ACTION**: git history still contains the old plaintext passwords (pattern `IGT@<FirstName>2026`, 16 accounts, in `backend/generate_users.js`), a JWT secret literal (`test_fetch.js`) and a login password literal in an old lint dump. Treat as compromised: force-reset those 16 accounts (those with `must_change_password=false` first), rotate `JWT_SECRET`, invalidate refresh tokens, and decide on a history rewrite. This session's transcript also displayed those passwords once (redaction miss). | OPEN |

## P1 - persistence, broken flows, mock-as-real, inert controls
| ID | Finding | Status |
|---|---|---|
| P1-1 | Schema was not reproducible (UUID vs VARCHAR user ids, ~12 stray `add_*.ts` scripts, competing snake_case/camelCase definitions of `time_entries`/`campaign_weekly_logs`/`ad_account_balances`). **Fixed**: single ordered-migration strategy (`database/migrations/0001_baseline`, `0002_...`, `src/migrate.ts`), fresh bootstrap + 31-test suite verified. **Still to do by a human**: compare the LIVE DB's three legacy tables to migration 0002 (camelCase, what the code queries) before running migrate there, and run `--baseline-existing` once. | FIXED locally / live DB UNVERIFIED |
| P0-10 | Old `schema.sql` began with `DROP SCHEMA public CASCADE`: `npm run db:init` against a real DB destroyed all data. Removed; init refuses NODE_ENV=production; test asserts no migration drops/truncates. | FIXED |
| P1-2 | Modules with NO backend (state is in-memory; lost on refresh): finance/payments/opex/projections, sales/deals/leads, approvals, expense claims, hiring, devProjects, ad recharges, campaign weekly logs | OPEN (see MODULE_MATRIX) |
| P1-3 | No compensation/HR data model: payroll dashboards read `monthlySalaryINR` from a roster that is now 0; `analytics.ts /agency/finance` queries a non-existent column (silently 0); `/team/:userId/*` analytics query a non-existent `time_entries` table (500) | OPEN |
| P1-4 | `team/[id]` page hardcodes a 25,000 INR salary placeholder in "estimated cost" | OPEN |
| P1-5 | Password policy: min 6 chars (set-password, admin create) | OPEN |
| P1-6 | `/api/auth/identify` returns a display name for an email (account enumeration, by design for the welcome screen) | OPEN (decision) |
| P1-7 | notifications `POST` lets any user create a notification for any other user | OPEN |
| P1-8 | `requireAuth` does not re-check `is_active`; deactivated users keep access until their 15-min token expires (refresh path checks DB: UNVERIFIED) | OPEN |
| P1-9 | Initial `clients`/`teamMembers` state is the mock roster until the API answers; failure to load leaves mock people on screen | OPEN |
| P1-10 | Client creation allowed for every authenticated role (New Task quick-add). Policy decision needed | OPEN (decision) |
| P1-11 | in-memory rate limits (AI tickets, public hero, reset requests) are per-process; fine for one instance only | NOTED |
| P1-12 | app-secrets `x-internal-secret` compared with `!==` (not constant time); set/delete are not audit-logged | OPEN |

## P2 / P3
- P2: Dead tracked helper scripts (frontend `fix_*.py`, `patch_*.py`, `refactor_*.py`, `update_data*.py`), `.next` was tracked (removed). Lint: 18 pre-existing react-hooks errors (identical to base). `AttentionStrip` component unused.
- P3: 3 dead mobile tabs (fixed). Hard-coded colors remain throughout (`#2AB182`, `bg-amber-500/10`, ...) - migrate to semantic tokens as components are touched.
