# MODULE MATRIX  (WORKING / PARTIAL / UI-ONLY / PROPOSED / UNVERIFIED) - after run 2

"Verified" = exercised by a test or browser journey in run 2 (see QA_MATRIX).

| Module | State | Evidence / gap |
|---|---|---|
| Auth (login, cookies, refresh, forced change, policy) | WORKING (verified) | reset takeover closed; CSRF guard; password policy |
| Tasks (create/assign/priority/deadline/status/timers/comments/attachments) | WORKING (verified end-to-end incl. UI) | server-side audit trail; assignee-or-creator scope; goal/task/subtask exist |
| Activity / audit log | WORKING (verified) | server-owned task events with previous->new; actor from session; admin/ops read |
| Clients | PARTIAL | real DB clients in UI; commercial columns staff-only; no Client 360 model (contacts/owners/services/renewal); Agency fee + budget utilisation have no source (shown as "-") |
| Command center (attention queue) | WORKING (verified) | tasks, leave, blockers, change requests; CEO vs ops routing; no invoice/campaign/integration-failure signals yet |
| Delivery: change requests | WORKING (verified, API + browser) | capture -> classify -> impact -> decision -> roadmap bucket -> link to task; material changes need admin/super_admin + impact analysis |
| Delivery: blockers | WORKING (verified) | owner, party, severity, expected resolution, next action, escalation owner; feeds queue |
| Client projects (details, timeline, who worked, hours) | WORKING (verified, API + browser) | `projects` + `project_events`, `tasks.project_id`; team and hours DERIVED from linked tasks + timer logs; timeline = project updates + task audit events + blockers |
| Development milestones / QA-UAT-release states | PROPOSED | not built; projects have status only (planned/active/on_hold/completed/cancelled) |
| Roadmap (Now/Next/Later) | PARTIAL | bucket stored on accepted change requests; no roadmap view, no progress derivation |
| Cortex AI | WORKING (verified, API) / provider call UNVERIFIED | server-built, role-scoped context; no provider key in test env -> honest 503 |
| Integration registry | WORKING (verified) | derived; Meta/Google Ads/GA4/GBP adapters NOT BUILT (ACCESS REQUIRED) |
| Performance marketing page | PARTIAL | DB campaigns + balances, DERIVED CPL, provenance strip; no live platform data |
| Monthly client report | WORKING (verified, CSV/JSON) | PDF/XLSX not built; no per-period campaign metrics (campaign table is cumulative) |
| Social (IG/YouTube) | PARTIAL / ACCESS REQUIRED | OAuth hardened; sync UNVERIFIED; content pipeline absent |
| GitHub dev feed | PARTIAL / ACCESS REQUIRED | webhook HMAC; UNVERIFIED without credentials |
| Google Calendar/Gmail | PARTIAL / ACCESS REQUIRED | UNVERIFIED |
| Credentials vault | PARTIAL | API-key vault: AES, write-only, admin-only (constant-time internal secret). Client credential vault: no backend |
| Leave / attendance / people | PARTIAL | endpoints exist; leave approval authz UNVERIFIED |
| HR (employee master, documents, NDAs, compensation) | PROPOSED | no model |
| Finance / payroll / invoices / collections | UI-ONLY | no backend except `GET /clients/:id/invoices`; finance endpoint returns UNKNOWN for payroll/profit |
| Sales pipeline | UI-ONLY | no backend |
| Notifications | PARTIAL | in-app; no tiers/ack/escalation engine |
