# Product Owner approval — Sprint 0A baseline

**Recorded:** 2026-08-31
**Authority:** Product Owner
**Evidence origin:** Owner statement in the ThinkBizThai project conversation; transcribed here as the repository evidence record.

## Approval statement

> อนุมัติ Sprint 0A baseline ในฐานะ Product Owner

## Scope of this approval

The statement approves the Sprint 0A baseline described in the G0 Readiness Report:

- ThinkBizThai working name, Thai SME target market, Thai mobile-first/non-technical UX, and Phase 1 workflow scope through Facebook and Instagram.
- The source-defined security and delivery constraints, including tenant isolation/RLS, synthetic-only repository evidence, verified Stripe-webhook entitlement, idempotent/partial-failure-aware publishing, and exact-key-only production purge.
- The existing Decision Register baseline required for G0 review, without changing its contract statuses or selecting a provider.

## Explicit limits

This approval does **not**:

- pass Gate G0 or change `WP-0A-A0-001` from `in_review`;
- substitute for an independent Product/UX reviewer assignment, cross-vendor evidence, protected-branch configuration, security review, testing, or integration evidence;
- approve Meta/Stripe credentials, payment operations, legal/PDPA/accounting decisions, storage configuration, production data handling, customer-data use, or production release;
- advance a Candidate/Draft contract to Frozen or make any implementation package Ready.

The remaining external blockers stay governed by `evidence/g0-tracker-th.md` and the Sprint 0A source documents.
