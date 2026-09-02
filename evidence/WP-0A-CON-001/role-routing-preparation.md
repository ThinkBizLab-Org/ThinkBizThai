# CON-00 role-routing preparation

**Recorded:** 2026-08-31
**Package:** `WP-0A-CON-001` — `ready`
**Purpose:** Record the independent, capability-declared role assignment required for the reviewed `backlog → ready` transition. This record does not approve a contract, advance a freeze level, or pass Gate G0.

## Candidate routing

| Assigned role | Exact run ID | Evidence and bounded suitability |
|---|---|---|
| Author | `/root` | Capability profile `a0-atlas.json` shows repository-local JavaScript/JSON/Markdown/YAML editing, deterministic Node 24 verification, and no external-secret access. The Author cannot approve, test-verify, or integrate this package. |
| Independent architecture-contracts Reviewer | `/root/c0_contract_reviewer` | The self-declared C0 profile and benchmark are conditionally suitable for contract boundaries, versioning, compatibility, ownership, and RFC/protocol consistency. Tester/CI must execute deterministic checks on the pinned runtime. |
| Independent Tester | `/root/q0_sentinel` | Suitable for catalog/fixture parsing, compatibility, negative cases, secret scan, and deterministic Node 24 tests; it has not pre-verified CON-00 contract semantics. |
| Independent Integration Owner | `/root/r0_steward` | Suitable for dependency order, ownership boundaries, compatibility, deterministic checks, and evidence reconciliation for a contract/fixture-only change. |
| Conditional Security/Privacy Reviewer | `/root/a1_bastion` | Assigned because the package catalogs tenant, error, event, and job boundaries. It reviews only synthetic contract/fixture handling and does not approve production RLS, migration, provider, legal/PDPA policy, or production data. |
| Conditional Product/UX Reviewer | `null` | Not assigned: this package is prohibited from adding user-facing behavior. Any change to that boundary requires a new independent Product/UX assignment and review. |

## Conditions for the `ready` transition

1. The manifest names real, distinct Author, Reviewer, Tester, and Integration Owner IDs and preserves Author independence from every approval/test/integration transition.
2. `/root/a1_bastion` is assigned because the package touches tenant, error, event, job, and synthetic-data security boundaries. `/root/a5_loom` is unassigned because user-facing semantics are explicitly out of scope; neither condition grants Product Owner approval.
3. Keep all entries Candidate/Draft, source-linked, synthetic-only, and free of provider SDKs, credentials, customer data, schema migrations, external calls, or freeze-level advancement.
4. Re-run package-specific checks under Node `24.20.0` and capture independent Reviewer, Tester, Security, and Integration evidence after implementation. C0's current benchmark is not a test result.
5. `WP-0A-A0-001` is integration_verified, but protected CI, Product Owner approval, and Gate G0 are not inferred from this routing record. Breaking or critical contract changes require cross-vendor review when available.

## Current conclusion

Routing evidence is sufficiently specific for this reviewed `ready` assignment. It is not implementation evidence, a contract freeze, integration verification, merge authorization, or a Gate G0 result.
