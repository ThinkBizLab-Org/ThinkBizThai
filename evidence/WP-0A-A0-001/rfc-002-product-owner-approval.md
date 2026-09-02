# Product Owner approval — RFC-2026-002 temporary manual control

**Recorded:** 2026-08-31

**Authority:** Product Owner
**Evidence origin:** Owner statement in the ThinkBizThai project conversation;
transcribed here as the repository evidence record.

## Approval statement

> อนุมัติ RFC-2026-002 เป็นกฎ manual ชั่วคราว

## Scope of this approval

The Product Owner approves the proposed temporary, procedural merge rule in
[`RFC-2026-002`](../../architecture/decisions/RFC-2026-002-manual-merge-control.md):
branch plus Draft PR, a green CI run for the exact head SHA, independent package
evidence, and a reviewed revert path before a Product Owner manual merge.

## Explicit limits

This approval does **not**:

- change the RFC from `In review` until its independent technical/security review,
  tester replay, Integration Owner verification, and CI evidence for the exact
  committed revision are complete;
- create native GitHub branch protection, satisfy the protected-CI G0 requirement,
  authorize a direct push/force-push, or grant a merge exception;
- pass G0, advance `WP-0A-A0-001`, waive role independence, or replace any
  package-specific review, test, integration, or stop-the-line control;
- approve billing, repository visibility, production credentials, providers,
  legal/PDPA/accounting decisions, or production activity.

The RFC remains a temporary manual safeguard while the external native-protection
blocker remains unresolved.
