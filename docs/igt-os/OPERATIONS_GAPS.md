# OPERATIONS GAPS (requirements from the business brief not yet built)

Ordered by value. Each needs: additive migration + server authz + tests + provenance.
1. **Blockers** table (owner, blocked_item, reason, blocking_party, expected_resolution, severity, next_action, escalation_owner, resolved_at) feeding the attention queue.
2. **Client 360**: contacts/decision makers, owners, services, retainer + deliverable commitments, renewal date, drive/asset refs, ad accounts; commercial fields staff-only.
3. **Deliverable/retainer tracking**: committed vs planned vs in production vs awaiting client vs approved vs delivered vs shortfall per client-month.
4. **Change requests + roadmap (Now/Next/Later)** with impact analysis; progress derived from tasks/milestones.
5. **Development lifecycle** states (discovery -> ... -> released/support) on projects; reuse existing task statuses, do not add a parallel status system.
6. **Social pipeline** (idea -> brief -> copy -> design -> QA -> client review -> revision -> approved -> scheduled -> published/failed) with asset-version refs; no auto-publishing without approval.
7. **Integration registry** (provider, client, account id, scopes, status lifecycle, last_success, last_failure, token expiry, owner) + adapter contracts with fixtures; Meta/Google Ads stay ACCESS REQUIRED until credentials/approvals exist.
8. **Performance reporting**: ad -> lead -> qualified -> appointment -> conversion as separate provenance classes; configurable anomaly thresholds; monthly PDF/XLSX from traceable data; AI commentary only from validated metrics and labelled.
9. **HR**: employee master, leave, restricted compensation, restricted documents (offer/NDA/payslip) with access audit; NDA tracking (version/sent/signed/expiry). No in-app e-signature.
10. **Finance**: invoices/collections, agency fee vs client media spend kept separate, role-gated server-side.
11. **Notification tiers** INFO/ACTION/URGENT/ESCALATION with routing (owner -> ops -> leadership -> CEO queue) and acknowledgement.
12. **Cortex grounding**: answer only from data the caller may read; never forward secrets/HR/finance to external models.

## Open requirement (not invented)
- "Free data" (from management requirements) is ambiguous. Recorded, not implemented. Needs the owner to define it.

## Decisions needed from the business
- Should `team` users be able to create clients (New Task quick-add)?
- Password policy and whether to add emailed reset (needs approved mail provider).
- Whether to rewrite git history to purge the old secrets (affects all clones/PRs).
- Which roles may see per-client commercials, salary, invoices.
