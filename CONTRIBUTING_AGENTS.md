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

Sprint 0A is **Specification Baseline Complete / External Verification Pending**; the G0 exit is decided and conditional, and closes only as [`RFC-2026-031`](architecture/decisions/RFC-2026-031-first-slice-contract-freeze.md) §6 says, as narrowed by [`RFC-2026-034`](architecture/decisions/RFC-2026-034-fast-lane.md). Until then agents may build application code, fakes, consumer tests, fixtures, spikes and prototypes against contracts at `Candidate` or above (RFC-2026-034 §2.1), as reversible work only: synthetic data; migrations on local and CI service-container databases only, never on a hosted or production project; and no external provider account, sandbox included, bound and no provider credential used. Every contract a deploy uses is `Frozen` (RFC-2026-031) before any paid beta, real customer data, or production deploy that serves users. Do not represent a package as `Ready`, `Integrated`, `Verified`, or `Done` without the evidence and independent roles required by the package.

## Separation of duties

Every implementation package has distinct Author, Independent Reviewer, Independent Tester, and Integration Owner, and no role is ever held by the Author's run. When they read each pull request follows its lane under [`RFC-2026-034`](architecture/decisions/RFC-2026-034-fast-lane.md) §2.2, which keeps the tiers of [`RFC-2026-030`](architecture/decisions/RFC-2026-030-risk-tiered-review.md), decided by the base's copy of `scripts/db/classify-review-tier.mjs` and never lowered by hand: governance pull requests (RFCs, this guide, `docs/**`, `.agents/**`, gates, CI and the guards and runners it uses, either classifier, `package.json`, lockfiles and tool configuration) are read by every role and merged by the Product Owner personally under RFC-2026-025 §5; records-only pull requests follow RFC-2026-025 §6; every other tier H pull request (migrations and RLS, auth and tenancy, secrets and OAuth, billing, publishing, jobs and provider adapters, contracts, whose freeze pull requests also keep RFC-2026-031's roles, other scripts and test kits, every module not on the reviewed module allowlist, and anything the classifier cannot place) is read by the Security/Privacy reviewer and the Tester on its final head before merge; tier M and L pull requests are read by one independent Reviewer, who confirms in writing what the classifier cannot; a round audit's pull request takes the audit lane of RFC-2026-034 §2.2. The Reviewer, Tester, Security/Privacy reviewer and Integration Owner read all merged risk-lane and fast-lane work in the round audits of RFC-2026-034 §2.3, whose verdicts move a package past `in_review`. A stop-the-line or security finding raises any pull request to tier H and its full reading. The Author may move work only through `in_review`; an Author must never approve, test-verify, integrate, or gate-approve their own work; pressing the merge of a risk-lane or fast-lane pull request after its lane's readers have passed is not integrating it (RFC-2026-034 §2.2). Critical work additionally requires the appropriate independent Security/Privacy, Product/UX, Domain, or SRE reviewer.

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

Use the schemas in `.agents/` for capability profiles, work packages, status updates, and handoffs. Keep canonical evidence under `evidence/<work-package-id>/`, and round-audit evidence under `evidence/audits/` (RFC-2026-034 §2.3); it must contain no secrets or real customer data. A handoff must list changed files, contracts, assumptions, tests and exit codes, evidence paths, security/privacy/cost impact, known limitations, rollback/forward fix, and the recommended next package.

## Verification and handoff

Run only repository-declared deterministic commands. RFC-2026-001 is the in-review bootstrap tooling decision: Node.js `24.20.0` with bundled npm `11.19.0`, locked by `.node-version`, `package.json`, and `package-lock.json`. It is authorized for local validation only and cannot be treated as approved or merged until independent review, security review, test, integration, and CI evidence complete. `npm run check` enforces this exact toolchain before tests; do not substitute a system Node version, add another package manager, or introduce dependencies without a new approved RFC. Node-only validators and secret scan accept no network, credentials, or global tools. Record all commands and output in the handoff.

Before any commit or push, the Author must provide a clean diff and self-test evidence. What must pass before a merge follows the lane of RFC-2026-034 §2.2: for a governance pull request, the independent Reviewer, Tester and Security/Privacy reviewer complete their checks and the Integration Owner verifies the final state and CI; for a risk-lane pull request, the Security/Privacy reviewer and the Tester; for a fast-lane pull request, one independent Reviewer; for an audit pull request, RFC-2026-034 §2.2's audit lane; for a records-only pull request, RFC-2026-025 §6. Every merge needs green required CI on its exact head. Pushing branch-protection settings or production configuration requires authorized repository/operations ownership and must not be inferred from this guide.

## Temporary manual merge control

While native GitHub branch protection is unavailable, follow
[`RFC-2026-002`](architecture/decisions/RFC-2026-002-manual-merge-control.md) for
every proposed merge into `main`:

- Never push directly to `main`, force-push it, or delete it. Use a branch and
  Draft PR.
- Before a merge, the head commit must have a green required CI run and the linked evidence its lane requires under RFC-2026-034 §2.2: Author, independent Reviewer, independent Tester, Security/Privacy and Integration Owner evidence for a governance pull request; Security/Privacy and Tester evidence for a risk-lane pull request; the independent Reviewer's written confirmation for a fast-lane pull request. The Integration Owner's verdict on risk-lane and fast-lane work follows in the round audit (RFC-2026-034 §2.3).
- A records-only pull request, and a mechanical sync of `main` into a pull
  request branch, follow
  [`RFC-2026-025`](architecture/decisions/RFC-2026-025-owner-delegated-merge.md)
  §6.
- The Author never approves, test-verifies, integrates, or authorizes their own work; pressing the merge of a risk-lane or fast-lane pull request after its lane's readers have passed is not integrating it (RFC-2026-034 §2.2). A manual merge cannot waive an unresolved stop-the-line risk.
- Record the PR URL, head SHA, CI run, evidence links, and rollback plan in the
  handoff. Roll back with a reviewed revert commit/PR, never a force-push.

This is a temporary, owner-directed process control; it is not native branch
protection, does not satisfy the protected-CI G0 requirement, and does not grant
an exception to any gate, security rule, or production change control.
