# OPERATIONS BLUEPRINT (as built)

CEO view: `Operations Dashboard` -> "Attention required" (GET /api/command-center/attention): tiers critical / action today / watch,
routed to the CEO only when a decision is needed, otherwise to operations. Sources: overdue/blocked/review-stalled/unowned tasks,
pending leave, open blockers (severity + expected resolution), pending client change requests (material ones are leadership decisions).

Operations view: `/delivery` (change requests with impact analysis; blockers with owner, blocking party, escalation owner, next action),
`/tasks`, `/team`. Delivery rule: a client request changes the roadmap only when explicitly accepted; material changes need leadership.

Reporting: month-end client report (CSV/JSON) from traceable data, downloadable from the client page.
Integrations: derived registry; Ads adapters are ACCESS REQUIRED. Cortex answers only from data the caller may read (server-built context).
