# IGT OS - engineering notes

Monorepo: `frontend/` (Next.js 16, React, Tailwind v4) + `backend/` (Express + Postgres, cookie JWT auth).
Project memory lives in `docs/igt-os/` (start with LOOP_STATUS.md and RISK_REGISTER.md).

## Commands
- `npm ci` (root) installs workspaces. On Linux you may need the native `lightningcss-linux-x64-gnu` / `@tailwindcss/oxide-linux-x64-gnu` (`npm i --no-save`), the lockfile was made on macOS.
- Secret guard (run before every commit): `npm run test:secrets`
- Backend typecheck: `cd backend && npx tsc --noEmit`; frontend: `cd frontend && npx tsc --noEmit`
- Schema = ordered SQL in `backend/database/migrations/` + tracker `public.schema_migrations`. Never edit an applied migration; add a new one.
  Fresh LOCAL test DB: `DATABASE_URL=postgres://.../igt_test INITIAL_USER_PASSWORD=<throwaway> npm run db:init -w backend`
  (migrate -> seed fixtures if empty -> one-time passwords; random ones are printed if INITIAL_USER_PASSWORD is unset; refuses NODE_ENV=production).
  Existing DB that already has the old baseline: `npm run db:migrate -w backend -- --baseline-existing` once, then `npm run db:migrate -w backend`. VERIFY the live DB's
  `time_entries`/`campaign_weekly_logs`/`ad_account_balances` columns first (see RISK_REGISTER P1-1).
- API + schema + route-auth sweep: start backend on :4000 against the test DB, then `DATABASE_URL=<test db> TEST_PASSWORD=<same> npm run test:api -w backend`
  (96 tests). Refuses to run if API_URL looks like production. Seeded accounts need `must_change_password=false` for the browser journeys.
- Browser journeys (need `playwright` installed, `next start` on :3000): `TEST_PASSWORD=... node scripts/e2e/task-journey.mjs` and `delivery-journey.mjs`.
  In this container launch Chromium with `--disable-background-networking --proxy-bypass-list=*` or it hangs on the egress proxy.
- Next production build needs `NEXT_PUBLIC_API_URL`; type errors fail it (no ignoreBuildErrors).

## Rules
- Never commit credentials, hashes, tokens or real salary/HR data. Seed data must be fixtures only.
- Server-side authorization is the control; frontend hiding is cosmetic.
- Every number shown to management needs provenance (docs/igt-os/DATA_PROVENANCE.md). No silent fallback to seed data.
- Every new backend route must authenticate (the route-auth sweep test fails otherwise); unsafe methods are origin-checked (CSRF).
- Task lifecycle audit events are written by the SERVER (tasks.ts); never trust a client-supplied actor.
- Use semantic color tokens (`--c-error|warning|success|info`), not hard-coded colors.
