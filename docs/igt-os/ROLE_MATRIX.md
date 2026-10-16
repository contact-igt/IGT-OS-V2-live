# ROLE MATRIX (server-enforced; verified by backend tests unless noted)

Roles: `super_admin` > `admin` > `ops` > `team` / `viewer`. `super_admin` satisfies any `admin` gate. "Leadership" below = admin + super_admin.

| Capability | super_admin | admin | ops | team |
|---|---|---|---|---|
| Grant/modify `super_admin` | yes | no | no | no |
| Create/update users, admin password reset, app secrets | yes | yes | no | no |
| Clients: commercial columns / invoices | yes | yes | yes | no |
| Client creation | yes | yes | yes | yes (policy open, P1-10) |
| Tasks: list | all | all | all | assigned or created |
| Tasks: update / timer / comments / assets | any | any | any | assigned or created only |
| Task delete | yes | yes | yes | no |
| Audit log read | yes | yes | yes | no |
| Meetings (transcripts) | all | all | all | own only |
| Command-center attention queue | yes | yes | yes | no |
| Blockers: list | all | all | all | own / own tasks |
| Blockers: raise | any | any | any | only on tasks they can access |
| Blockers: resolve | yes | yes | yes | owner / creator |
| Change requests: capture | yes | yes | yes | yes |
| Change requests: impact analysis, recommend, link to work | yes | yes | yes | no |
| Change requests: decide (non-material) | yes | yes | yes | no |
| Change requests: ACCEPT a material change | yes | yes | **no (403)** | no |
| Change requests: view | all | all | all | own captures + accepted ones linked to their tasks |
| Projects: create / edit / attach or remove tasks | yes | yes | yes | no |
| Projects: view | all | all | all | only projects they lead or have a task on (others get 404) |
| Projects: add note / meeting / recording link | yes | yes | yes | members only |
| Integration registry | yes | yes | yes | no |
| Monthly client report | yes | yes | yes | no |
| Finance endpoint (retainers; payroll/profit UNKNOWN) | yes | yes | no | no |
| Per-member time analytics | any | any | any | self only |
| Cortex context | staff: all open work + attention + roster; retainers only for leadership | | | own tasks only |
| AI routes | any active user via ticket, 30 req/min | | | |
| Marketing balances | yes | yes | yes | no |

Never exposed to Cortex / generic APIs: credentials, password hashes, salaries, emails, HR documents.
UNVERIFIED: `viewer`, page_access grants, leave approval, HR/finance (no model).
