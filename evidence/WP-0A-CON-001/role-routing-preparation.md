# CON-00 role-routing preparation

**Recorded:** 2026-08-31
**Package:** `WP-0A-CON-001` — remains `backlog`
**Purpose:** Preserve capability-routing evidence required before a later `backlog → ready` transition. This record does not assign a package, advance its status, approve a contract, or pass Gate G0.

## Candidate routing

| Future role | Candidate exact run ID | Evidence and bounded suitability |
|---|---|---|
| Author | `/root` | Capability profile `a0-atlas.json` shows repository-local JavaScript/JSON/Markdown/YAML editing, deterministic Node 24 verification, and no external-secret access. The future Author must still provide package-specific self-check and cannot approve, test-verify, or integrate their own work. |
| Independent architecture-contracts Reviewer | `/root/c0_contract_reviewer` | The C0 benchmark is conditionally suitable for contract boundaries, versioning, compatibility, ownership, and RFC/protocol consistency. Its session lacked Node 24, so Tester/CI must execute deterministic checks on the pinned runtime. |
| Independent Tester | `/root/q0_sentinel` | Conditionally suitable for catalog/fixture parsing, compatibility, negative cases, secret scan, and deterministic Node 24 tests; it has not pre-verified CON-00 contract semantics. |
| Independent Integration Owner | `/root/r0_steward` | Conditionally suitable for dependency order, ownership boundaries, compatibility, deterministic checks, and evidence reconciliation for a contract/fixture-only change. |
| Conditional Security/Privacy Reviewer | `/root/a1_bastion` | Conditionally suitable to review tenant context/isolation, safe error shape, event/job idempotency and ownership/failure boundaries, and synthetic-only fixture handling. It does not approve production RLS, migration, provider, legal/PDPA policy, or production data. |
| Conditional Product/UX Reviewer | `/root/a5_loom` | May review only if a catalog/fixture introduces user-facing error, recovery, permission, approval/calendar, notification, or deep-link semantics. It cannot substitute for Product Owner approval or Thai-SME usability evidence. |

## Conditions before assignment or `ready`

1. The future manifest update must name real, distinct Author, Reviewer, Tester, and Integration Owner IDs and preserve Author independence from every approval/test/integration transition.
2. Assign `/root/a1_bastion` when the contract touches tenant, error, event, job, or synthetic-data security boundaries. Assign `/root/a5_loom` only when user-facing semantics are in scope; neither assignment is Product Owner approval.
3. Keep all entries Candidate/Draft, source-linked, synthetic-only, and free of provider SDKs, credentials, customer data, schema migrations, external calls, or freeze-level advancement.
4. Re-run package-specific checks under Node `24.20.0` and capture independent Reviewer, Tester, Security, and Integration evidence after implementation. C0's current benchmark is not a test result.
5. Do not infer completion of the `WP-0A-A0-001` dependency, protected CI, cross-vendor review, Product Owner approval, or Gate G0 from these role candidates. Breaking or critical contract changes require cross-vendor review when available.

## Current conclusion

Routing evidence is sufficiently specific to prepare a reviewed assignment later. It is not sufficient to set `WP-0A-CON-001` to `ready` while its declared dependency remains unresolved and the source-listed G0 external blockers are open.
