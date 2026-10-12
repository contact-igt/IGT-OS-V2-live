# DESIGN AUDIT

Reference: PulseOS (pulseos.invictuslowbuildtech.com) was NOT reachable from this environment (egress policy). Decisions below follow the
existing IGT direction (dark graphite default, green primary, restrained surfaces) and what the live app showed.

Fixed in run 2
- Mobile shell was unusable (main area 135px at 375px): drawer + responsive margins/padding.
- Desktop sidebar collapse did not resize the page (two unconnected collapse states).
- Undefined status tokens (silent no-op colors) -> defined for both themes.
- Mobile bottom tab bar had 3 dead tabs (404) -> real routes.
- Client list KPI overflowed at 1024; "Agency fee 0" / "Budget used 0%" were made-up zeros -> "-".
- Task card client badge showed a UUID prefix after the client-id change ("1111") -> client code.
- Workspace hero meta line wrapped with stray separators on mobile; Delivery list titles collapsed to a sliver on mobile.
- Fake data removed from the UI (marketing seed, CPL trend bars, hard-coded invoices in a dead widget, invented task counts).

Direction: calm, dense, operational; glass only for shell/menus; tables and forms on solid readable surfaces; provenance visible next to numbers.

Remaining: hundreds of hard-coded colors in older pages; older dashboards still mix card sizes; no keyboard/contrast pass; Gantt/Goals views unreviewed.
