# DATA PROVENANCE

Classes: LIVE API | DATABASE | VALIDATED MANUAL IMPORT | DERIVED | DEMO / SEED | UNKNOWN.
Rule: never silently fall back from a failed live source to seed numbers; show unavailable/stale/error.

| Surface | Class (verified?) | Notes |
|---|---|---|
| Tasks, clients, users, notifications, time logs, leave, attendance, meetings, audit log | DATABASE (API-verified for tasks/clients/users/meetings/audit) | Postgres via Express |
| `GET /api/command-center/attention` + dashboard panel | DERIVED from DATABASE (tasks, leave_requests) | response carries `provenance`; panel shows "DATABASE - time"; load errors render "Unavailable", never "all clear" |
| GitHub activity | LIVE API (webhook/App) - UNVERIFIED here (no credentials) | |
| Instagram / YouTube social metrics | LIVE API when connected - UNVERIFIED here | OAuth state hardened this run |
| Google Calendar / Gmail recaps | LIVE API - UNVERIFIED here | |
| Finance, payroll, SaaS MRR, projections, payments, deals/leads, ad balances, campaign weekly logs | UNKNOWN / UI-only: no backend source found; in-memory state starts empty | do not present as real; label DEMO until a source exists |
| `TEAM_MEMBERS`/`CLIENTS` mock roster in `lib/data.ts` | DEMO / SEED | shown briefly until API load; salaries/passwords removed |
| Ad-platform, lead, CRM, appointment, revenue metrics | NOT IMPLEMENTED | must stay separate classes; ROAS only with a conversion-value source; never sum reach into "unique people" |
