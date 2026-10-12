# DATA PROVENANCE

Classes: LIVE API | DATABASE | VALIDATED MANUAL IMPORT | DERIVED | DEMO / SEED | UNKNOWN | (ACCESS REQUIRED = a source that cannot be read yet).
Rules: never fall back from a failed live source to seed numbers; show unavailable/stale/error; every management number carries its class.
UI primitive: `components/ui/ProvenanceBadge.tsx`.

| Surface | Class | Notes |
|---|---|---|
| Tasks, clients, users, notes/comments, time logs, blockers, change requests, audit log | DATABASE | |
| Attention queue | DERIVED from DATABASE | response carries `provenance`; failed load renders "Unavailable", never "all clear" |
| Campaign figures (spend, leads, impressions...) | DATABASE (manually entered, unverified against the platform) | per-campaign totals, not period-specific |
| Cost per lead | DERIVED = spend / leads, only when both exist | |
| ROAS | not shown | no verified revenue / conversion-value source; the `roas` column is manual and is never reported |
| Ad balances / days remaining | DATABASE (manual) | no invented pacing assumption |
| Meta / Google Ads / GA4 / GBP | ACCESS REQUIRED | adapters not built; registry says so |
| Instagram / YouTube / Gmail / Calendar / GitHub | LIVE API when connected, UNVERIFIED here | registry derives HEALTHY/DEGRADED/ERROR from token expiry + last sync |
| Monthly report | DATABASE + DERIVED | every row names its source; no AI commentary; reach never summed |
| Finance: retainers | DATABASE (contract value, not invoiced revenue) | |
| Finance: payroll, profit, collections, expenses | UNKNOWN | not modelled; endpoint returns null + provenance |
| Roster / client mock lists in `lib/data.ts` | DEMO / SEED | no longer shown as the client list; salaries and passwords removed |
| Ad -> lead -> qualified -> appointment -> conversion | NOT IMPLEMENTED | keep as separate classes when built |
