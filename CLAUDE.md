# IGT OS - engineering notes

Monorepo: `frontend/` (Next.js 16, React, Tailwind v4) + `backend/` (Express + Postgres, cookie JWT auth).
Project memory lives in `docs/igt-os/` (start with LOOP_STATUS.md and RISK_REGISTER.md).

## Commands
- `npm ci` (root) installs workspaces. On Linux you may need the native `lightningcss-linux-x64-gnu` / `@tailwindcss/oxide-linux-x64-gnu` (`npm i --no-save`), the lockfile was made on macOS.
- Secret guard (run before every commit): `npm run test:secrets`
- Backend typecheck: `cd backend && npx tsc --noEmit`; frontend: `cd frontend && npx tsc --noEmit`
- Fresh LOCAL test DB: `DATABASE_URL=postgres://.../igt_test INITIAL_USER_PASSWORD=<throwaway> npm run db:init -w backend`
  (without INITIAL_USER_PASSWORD, random one-time passwords are printed). Then apply the idempotent `backend/add_*.ts` migrations
  (see RISK_REGISTER P1-1: schema.sql does not yet include them; `attendance_breaks` also needs creating).
- API regression: start backend on :4000 against the test DB, then `TEST_PASSWORD=<same> npm run test:api -w backend`.
  Refuses to run if API_URL looks like production.

## Rules
- Never commit credentials, hashes, tokens or real salary/HR data. Seed data must be fixtures only.
- Server-side authorization is the control; frontend hiding is cosmetic.
- Every number shown to management needs provenance (docs/igt-os/DATA_PROVENANCE.md). No silent fallback to seed data.
- Use semantic color tokens (`--c-error|warning|success|info`), not hard-coded colors.
