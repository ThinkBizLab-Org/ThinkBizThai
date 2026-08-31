# ThinkBizThai — Canonical Engineering Agent Guide

Protocol version: `1.0.0`
Status: G0 bootstrap baseline; this file does not approve G0 or any production change.

## Authority and required reading

This is the canonical operating guide for every coding agent. It implements the repository protocol proposed in `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md`; it does not replace product, security, legal, or architecture decisions.

Resolve conflicts in this order:

1. Approved RFC/Decision that is newer than the affected baseline.
2. Sprint 0A Decision Register and Contract Catalog.
3. Execution Master Plan and its gates/dependencies.
4. Module Contracts, Core Database/RLS, and relevant domain workstream documents.
5. Product Master Plan and Backlog.
6. Other planning documents, comments, chat, or existing implementation.

Before accepting a work package, read this guide, the assigned package manifest, its declared contracts and the referenced domain documents. Chat or vendor-specific memory never changes repository source of truth.

## Current gate constraint

Sprint 0A is **Specification Baseline Complete / External Verification Pending**. Until G0 passes, agents may work only on spikes, prototypes, fixtures, fake adapters, contract tests, and reversible foundation that does not bind production schema or an external provider. Do not represent a package as `Ready`, `Integrated`, `Verified`, or `Done` without the evidence and independent roles required by the package.

## Separation of duties

Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner. The Author may move work only through `in_review`; an Author must never approve, test-verify, integrate, or gate-approve their own work. Critical work additionally requires the appropriate independent Security/Privacy, Product/UX, Domain, or SRE reviewer.

The work-package manifest must contain real, distinct `agent_run_id` values before the package moves from `backlog` to `ready`. If staffing is insufficient, keep the package in backlog or work sequentially; do not collapse the roles. The schema enforces non-empty IDs for ready-or-later packages, and `scripts/validate-work-package-role-separation.mjs` compares the four named role IDs directly. Reviewer and CI/evidence review must run that validator before a package is accepted as ready.

## Ownership and change control

- Respect manifest `writable_paths`, `read_only_paths`, `forbidden_paths`, module ownership, and migration reservations. Unlisted paths are read-only.
- Root configuration, lockfiles, CI, contract catalog, migration registry, composition root, and source-of-truth documents are protected. Propose changes through the Integration Owner/RFC path.
- One module, table, event, route namespace, and migration range has one owner. Cross-module writes use a public command, application port, or event only.
- Open an RFC before changing P0 scope, ownership, contract meaning/requiredness/state, tenant hierarchy/RLS, data/secret classification, provider or billing semantics, publishing idempotency, root runtime/package manager, CI/release policy, or gate rules.
- Never rewrite an integrated migration. Use a forward fix with a tested recovery path.

## Non-negotiable security and data rules

- Enforce tenant isolation and deny-by-default RLS for every tenant data path.
- Never commit, log, paste, fixture, screenshot, or hand off API keys, tokens, passwords, production secrets, private URLs, customer PII, or customer content without documented permission.
- Use synthetic fixtures by default. A package using permissioned data must declare classification, consent, retention, and redaction.
- Treat secret exposure, tenant leakage, duplicate external side effects, lost jobs, migration divergence, irreversible deletion, or contract mismatch as stop-the-line incidents.
- Payment entitlement is derived only from a verified Stripe webhook projection. Checkout redirects are never proof of payment.
- Publishing must be idempotent and preserve per-channel partial results. Retrying one failed target must not repeat successful targets.
- Production object deletion uses an approved immutable manifest of exact object keys; never recursively delete a user-supplied prefix.

## Work and evidence flow

`backlog → ready → in_progress → in_review → review_approved → test_verified → integration_verified → done`

Use the schemas in `.agents/` for capability profiles, work packages, status updates, and handoffs. Keep canonical evidence under `evidence/<work-package-id>/`; it must contain no secrets or real customer data. A handoff must list changed files, contracts, assumptions, tests and exit codes, evidence paths, security/privacy/cost impact, known limitations, rollback/forward fix, and the recommended next package.

## Verification and handoff

Run only repository-declared deterministic commands. RFC-2026-001 is the in-review bootstrap tooling decision: Node.js `24.20.0` with bundled npm `11.19.0`, locked by `.node-version`, `package.json`, and `package-lock.json`. It is authorized for local validation only and cannot be treated as approved or merged until independent review, security review, test, integration, and CI evidence complete. `npm run check` enforces this exact toolchain before tests; do not substitute a system Node version, add another package manager, or introduce dependencies without a new approved RFC. Node-only validators and secret scan accept no network, credentials, or global tools. Record all commands and output in the handoff.

Before any commit or push, the Author must provide a clean diff and self-test evidence; an independent Reviewer and Tester must complete their respective checks. The Integration Owner verifies the final state and CI before merging. Pushing branch-protection settings or production configuration requires authorized repository/operations ownership and must not be inferred from this guide.

## Temporary manual merge control

While native GitHub branch protection is unavailable, follow
[`RFC-2026-002`](architecture/decisions/RFC-2026-002-manual-merge-control.md) for
every proposed merge into `main`:

- Never push directly to `main`, force-push it, or delete it. Use a branch and
  Draft PR.
- Before the Product Owner merges, the head commit must have a green required
  CI run and linked Author, independent Reviewer, independent Tester,
  Security/Privacy (when required), and Integration Owner evidence.
- The Author never approves, test-verifies, integrates, or authorizes their own
  work. A manual merge cannot waive an unresolved stop-the-line risk.
- Record the PR URL, head SHA, CI run, evidence links, and rollback plan in the
  handoff. Roll back with a reviewed revert commit/PR, never a force-push.

This is a temporary, owner-directed process control; it is not native branch
protection, does not satisfy the protected-CI G0 requirement, and does not grant
an exception to any gate, security rule, or production change control.
