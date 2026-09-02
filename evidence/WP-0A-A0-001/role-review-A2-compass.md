# A2 Compass review — WP-0A-A0-001

Reviewer agent run: `/root/a2_compass`
Review date: 2026-08-31
Scope: read-only review of the repository-bootstrap candidate for A2 concerns only: evidence provenance, synthetic-only handling, source-of-truth hierarchy, and capability-routing readiness. This is not a review of industry-pack content, research sources, customer data, provider integrations, or Gate G0.

## Inputs and inspection

Read the assigned manifest and its declared Sprint 0A inputs, then inspected the bootstrap artifacts relevant to this scope: `CONTRIBUTING_AGENTS.md`, thin adapters, `.agents/role-profiles/`, the capability schema/example, the contract-catalog pointer, the first-integration-slice fixture plan, and the existing author/reviewer/tester evidence.

Read-only commands:

- `git status --short && git log --oneline --decorate -5` — exit 0; working tree clean and the candidate has commits `3c8e025` and `899c2bb` after base `ff55332`.
- `rg -n --glob '!docs/**' --glob '!node_modules/**' 'agent_run_id|capability|synthetic|source of truth|cross-vendor|vendor' ...` — exit 0; used to trace role, evidence, and synthetic-data claims in the bootstrap artifacts.

## Findings

1. **Source-of-truth hierarchy: pass for this bootstrap scope.** `CONTRIBUTING_AGENTS.md` points to the Sprint 0A decision hierarchy, declares that vendor-specific memory cannot override it, and the two adapters remain thin. `contract-catalog/README.md` and the first-slice plan explicitly point back to the Decision Register rather than inventing a parallel domain contract.
2. **Synthetic-only/provenance boundary: pass with a stated limit.** The package declares `synthetic-only`, the first-slice artifact is expressly a fixture-plan pointer, and the committed evidence does not contain customer content or external research claims. The deterministic scanner is useful as a guardrail, but pattern scanning cannot prove complete provenance, consent, or redaction for a future permissioned-data package. Such a package must still declare classification, consent, retention, and redaction before it is accepted.
3. **Evidence traceability: pass for the local bootstrap candidate.** Author, reviewer/security, tester, and integration evidence distinguish working-tree/CI/G0 limitations instead of presenting local checks as production or external proof. The records correctly retain the unresolved cross-vendor, Product Owner, branch-protection, and external-evidence conditions.
4. **Capability-routing readiness: changes required.** The repository has a capability *schema* and role directory, but it has no non-example, machine-readable capability declaration or benchmark evidence for the real agent runs named in this manifest (`/root`, `/root/a1_bastion`, `/root/q0_sentinel`, `/root/r0_steward`). Therefore a dispatcher cannot independently establish that the assigned runs satisfy the declared skill profiles before a later package advances to `ready`. This is also an explicit remaining G0 condition, not a reason to alter a domain contract now.

## Verdict

**Changes requested — bootstrap protocol only.** Before REP-00 can be treated as a completed vendor-neutral protocol baseline, record real capability declarations/benchmark references for its named role runs and run a recorded handoff dry run using those declarations. The change should remain synthetic-only and must not claim Product Owner approval or G0 passage.

## Cross-vendor limitation

This review is performed by a distinct agent run, but I have no evidence that it is a different vendor implementation from the Author, Reviewer, Tester, or Integration Owner. **It is not cross-vendor evidence** and does not satisfy the Decision Register's required cross-vendor protocol dry run.

## Recommended safe next action

Create a narrowly scoped, reversible protocol-evidence follow-up that adds capability declarations for the actual runs, records how each required skill was benchmarked or otherwise verified, and executes a manifest-to-handoff dry run. Keep every domain package in backlog until its own capability declarations, dependencies, and approval conditions are satisfied.
