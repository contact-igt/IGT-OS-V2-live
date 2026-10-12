# OPERATIONS GAPS (business requirements not yet built), ordered by value

DONE in run 2: structured blockers; client change-request workflow (capture, classify, impact, decision, roadmap bucket, link to work);
CEO/ops attention queue incl. blockers + pending decisions; integration registry; monthly client report (CSV/JSON); Cortex grounded server-side.

1. **Client 360**: contacts / decision makers, primary + secondary owner, services purchased, retainer terms, renewal date, drive/asset refs, web properties, ad accounts. Commercial fields staff-only.
2. **Deliverable / retainer tracking** per client-month: committed vs planned vs in production vs awaiting client vs approved vs delivered vs shortfall.
3. **Development project entity**: discovery -> requirements -> scope approved -> design -> design approved -> development -> internal QA -> client UAT -> ready -> released -> support; milestones, owners, repo/design/environment links; roadmap progress derived from tasks/milestones (currently only a stored bucket on change requests).
4. **Social content pipeline** (idea -> brief -> copy -> review -> design -> QA -> client review -> revision -> approved -> scheduled -> published/failed) linked to tasks (no second task engine), asset-version refs, approval history. No auto-publishing.
5. **Ads adapters** (Meta Marketing API, Google Ads, GA4, GBP) behind the registry: fixtures + sync health first; ACCESS REQUIRED until credentials/approval exist. Anomaly rules with configurable thresholds (spend with no leads, CPL deterioration, balance low, tracking failure, stale sync).
6. **Reporting**: PDF/XLSX output; per-period campaign metrics (needs period snapshots); funnel (lead -> qualified -> appointment -> conversion) as separate provenance classes; AI observations only from validated metrics and labelled.
7. **HR**: employee master, restricted compensation, restricted documents (offer/NDA/payslip) with access audit, NDA tracking. No in-app e-signature.
8. **Finance**: invoices/collections with agency fee vs client media spend kept separate; role-gated server-side.
9. **Notifications**: INFO/ACTION/URGENT/ESCALATION tiers with routing and acknowledgement; stale-approval and invoice signals into the attention queue.
10. **Sales -> delivery handoff**: won deal creates onboarding (services, commercials, contacts, owner, deliverables, access needed, first report date).

## Open requirement (not invented)
- "Free data" (management requirement) is ambiguous. Recorded, not implemented; needs the owner's definition.

## Decisions needed from the business
- Should `team` users create clients? Which roles see commercials / salary / invoices?
- Emailed password reset needs an approved mail provider; until then resets are admin-issued.
- Purge secrets from git history (affects every clone/PR)?
- Which change requests count as "material" beyond the current rule (scope/new feature/integration, or any timeline or commercial impact)?
