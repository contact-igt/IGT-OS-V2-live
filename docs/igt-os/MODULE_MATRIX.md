# MODULE MATRIX  (WORKING / PARTIAL / UI-ONLY / BROKEN / UNVERIFIED / PROPOSED)

Basis: code reading + the API/browser checks in LOOP_STATUS. "Verified" = exercised in this run.

| Module | State | Evidence / gap |
|---|---|---|
| Auth (login, cookies, refresh, forced password change) | WORKING (verified: login, forced /set-password, session survives reload) | public reset closed; weak password policy (P1-5) |
| Tasks (CRUD, assignment scope, timers) | WORKING (verified create/update/delete, scope, persistence) | assets/timers authz verified only for access check |
| Clients list/detail | PARTIAL | read APIs verified; commercial/finance depth missing; no Client 360 model |
| Command center attention queue | WORKING (new) | tasks + leave only; no blockers/invoices/campaign/integration signals yet |
| Admin/Ops dashboard | PARTIAL | many widgets; render verified; data correctness UNVERIFIED |
| Audit log | WORKING (read gated) | |
| Meetings + AI analysis | PARTIAL | persistence + scoping verified; AI quality UNVERIFIED (no keys here) |
| Cortex AI chat | PARTIAL | now authenticated/rate-limited; still sends client-built prompts (client-side data) to external model; RBAC grounding is NOT enforced server-side (OPEN) |
| Leave requests / people | PARTIAL | endpoints exist; approval authz UNVERIFIED |
| Attendance | PARTIAL | needs attendance_breaks migration (P1-1) |
| Social (IG/YouTube) | PARTIAL / ACCESS REQUIRED | OAuth hardened; live sync UNVERIFIED; no content pipeline model |
| GitHub dev feed | PARTIAL / ACCESS REQUIRED | |
| Google Calendar/Gmail | PARTIAL / ACCESS REQUIRED | |
| Credentials vault (`/credentials`) | PARTIAL | API-key tab: AES-encrypted, write-only, admin-only. Client-credential vault: no backend; demo values removed |
| Finance / payroll | UI-ONLY | no backend; read-only zeros; label DEMO |
| Sales / deals / leads / pipeline | UI-ONLY | no backend |
| Ad budget / campaigns / performance | UI-ONLY (campaign log API exists, partial) | no Meta/Google adapters |
| HR (employee master, salary, documents, NDAs) | PROPOSED | no model; salary must be restricted server-side |
| Development projects / roadmap / change requests | PROPOSED | |
| Social content pipeline / deliverable tracking / monthly reports | PROPOSED | |
| Integration registry + sync health | PROPOSED | |
| Notifications / escalation engine | PARTIAL | in-app notifications only; no tiers/ack |
