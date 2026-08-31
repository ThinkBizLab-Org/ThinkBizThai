# Claude Code cross-vendor protocol dry run — WP-0A-A0-001

**Recorded:** 2026-08-31

## Evidence classification

`partial / blocked-environment` external cross-vendor protocol evidence only.
This is not a Gate G0 result, package approval, role substitution, merge
authorization, native branch-protection evidence, production approval, or test
pass evidence.

## Independent run provenance

- **Vendor / model:** Anthropic / `claude-opus-5` (Claude Opus 5)
- **Harness:** Claude Code (Claude Agent SDK)
- **External run ID:** `ef9eb7cf-0243-46bf-81d3-bc2bc42773cf`
- **Workspace:** local ThinkBizThai workspace
- **Base revision observed:** `bb11ccbdd7d7f0896d744483630beefddcdb2b8f`
- **External participant authority:** read-only protocol participant;
  `accepted_work_package: null`; no Author, Reviewer, Security, Tester,
  Integration, Product Owner, Product/UX, Release, or merge authority.

The participant reported that it read `CONTRIBUTING_AGENTS.md`, the assigned
manifest, its three declared Sprint 0A inputs, `CLAUDE.md`, and the capability
and handoff schemas before the dry run. It reported no file write, git write,
credential, provider, network, or production action.

## Replayed commands and observed results

| Command | Result | Evidence meaning |
|---|---|---|
| `git rev-parse HEAD` | exit `0`; matched the base revision above | Exact repository revision observed |
| `git status --short` | exit `0`; empty output | Working tree was clean at observation |
| `git diff --check` | exit `0`; empty output | No whitespace error at observation |
| `npm run check` | exit `68`; expected Node `v24.20.0`, received `v26.7.0` | **Blocked environment**, not repository test failure or passing test evidence |

Because the toolchain guard halted first, the external run did **not** execute
the secret scan, protocol validation, or bootstrap tests. It did not install a
runtime, substitute Node 26, bypass the guard, or run validators separately.

## External capability and handoff shape

The Claude Code response supplied JSON that it reported conforms to the current
capability and handoff schemas. Its capability declaration states
`can_access_external_secrets: false`; although its harness can edit files and
run shell commands, this run was explicitly read-only and made no repository
change. Its handoff sets `work_package_id` to `WP-0A-A0-001`, `final_status` to
`in_review`, the base revision above, empty changed-file arrays, and records
the toolchain result as exit `68`.

This repository record does not register the external run as a package role or
as a Ready-package capability profile. Doing so would require a separate
owned/routed change and independent review.

## Findings requiring disposition, not adoption

The external participant reported these observations after reading the exact
revision. They are not accepted changes or new repository decisions:

1. A distinct-vendor environment without Node `24.20.0` cannot reproduce the
   declared suite; the safe status is `blocked-environment`.
2. It identified two A0 writable tracked files absent from `outputs.files`:
   `scripts/validate-work-package-ownership.mjs` and
   `test-kits/work-package-ownership.test.mjs`.
3. It raised potential gaps around all-manifest role-separation coverage,
   externally observable role independence, canonical-guide naming, JSON/YAML
   protocol format, and branch naming.

These observations require independent verification and the normal RFC/owner
path before any protocol, schema, CI, ownership, or source-document change.

## Explicit remaining boundaries

- Cross-vendor evidence is now recorded, but the manifest-to-worktree-to-
  evidence-to-handoff dry run remains incomplete because external pinned-runtime
  verification did not run.
- Gate G0 remains **Specification Baseline Complete / External Verification
  Pending**. Its other external blockers remain unchanged.
- Native GitHub branch protection remains unavailable; RFC-2026-002 is only a
  provisional manual procedure.
- Tenant/RLS, Stripe verified-webhook-only entitlement, publishing idempotency
  and partial failure, exact-key-only purge, and separation of duties remain
  mandatory and were not implementation-tested by this run.
