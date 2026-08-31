# C0 capability benchmark — architecture-contracts reviewer

**Recorded:** 2026-08-31
**Exact agent run ID:** `/root/c0_contract_reviewer`
**Runtime disclosed to this agent:** OpenAI Codex, GPT-5
**Proposed capability use:** Independent reviewer for a future, separately assigned `architecture-contracts` / canonical-contract work package only. This record accepts no implementation package and grants no status transition.

## Declared tools and boundaries

| Capability | Observed value | Boundary |
|---|---|---|
| Read repository files | Yes | Read `CONTRIBUTING_AGENTS.md`, Decision Register §9.3–§10.7, RFC-2026-001, validators, schemas, tests, and the existing A0 manifest. |
| Write files | Yes | This benchmark creates only this evidence file through `apply_patch`. |
| Shell commands | Yes | Used `sed`, `find`, `git status`, and `node`/`npm` read-only validation attempt. |
| Run deterministic tests | Conditional | The available runtime is Node `v26.7.0`; the repository requires Node `v24.20.0`, so `npm run check` correctly stopped at the version guard before tests. No substitute runtime was used. |
| Network / browser / external credentials | Not used | No network, browser, external account, secret, production credential, customer data, or provider was accessed. External-secret access is declared **false**. |
| Create branch or worktree | Not used | Not needed for a read-only benchmark. |

## Benchmark exercise

Review the existing bootstrap decision and role-separation controls as a contract reviewer. The exercise was to establish whether the controls make the following claims traceable without changing them:

1. RFC-2026-001 remains an in-review local bootstrap decision and cannot be mistaken for an approved production decision.
2. A ready-or-later work package requires four non-empty, pairwise-distinct primary role run IDs.
3. Each non-null assigned role has a capability declaration, including conditional security/product reviewers.
4. The observed validator behavior and test coverage align with the Sprint 0A role-separation and review-gate baseline.

## Observed evidence

| Check | Evidence observed | Result |
|---|---|---|
| Decision lifecycle | RFC-2026-001 header says `Status: In review`; its required-evidence section requires independent review, security, test, integration, and CI before merge. `CONTRIBUTING_AGENTS.md` repeats that it is local-only until those evidence types complete. | Pass for local bootstrap lifecycle; no approval inferred. |
| Four-role independence | `scripts/validate-work-package-role-separation.mjs` checks `author`, `reviewer`, `tester`, and `integration_owner` for non-empty and pairwise-distinct IDs for `ready` or later statuses. | Pass for the four primary roles specified by Decision Register §9.3.1. |
| Negative cases | `test-kits/role-separation.test.mjs` covers duplicate role ID, empty role ID, unsupported status, and malformed manifest rejection. | Pass by inspection; execution deferred because the pinned Node runtime is unavailable in this agent session. |
| Conditional role declaration | `scripts/validate-capability-profiles.mjs` checks every non-null `*_agent_run_id`, including conditional reviewer IDs, against a unique capability profile; `test-kits/capability-profile.test.mjs` covers undeclared security and product reviewer IDs. | Pass by inspection. |
| Existing manifest consistency | `work-packages/WP-0A-A0-001.json` is `in_review` and names distinct `/root`, `/root/a1_bastion`, `/root/q0_sentinel`, and `/root/r0_steward` primary roles. It does not name this C0 run. | No conflict; this run was not retroactively assigned. |
| Exact toolchain guard | `npm run check` under observed Node `v26.7.0` / npm `11.19.0` exited before validation with: `Expected Node v24.20.0 and npm 11.19.0; received node=v26.7.0.` | Expected safe failure; no test result is claimed. |

## Review observations and limits

- The RFC body uses the imperative “Approve option 1,” while its header is `In review`. The header and required-evidence clauses must remain the operative lifecycle signal; a future canonical-contract package should avoid language that could be read as granting approval before the listed evidence exists.
- The primary role validator intentionally validates identity separation, not skill-to-required-profile matching. The companion capability validator validates existence and secret-access denial, but it does not prove that a declared run has actually demonstrated every requested skill. This benchmark itself is the limited evidence for `architecture-contracts` review; a future manifest must still assign the exact run ID and apply the relevant independence rules.
- The test suite was not executed in this run because no Node `24.20.0` runtime was available. The version guard prevented an invalid substitute run, which is the correct behavior under RFC-2026-001.
- This agent did not review production schema, RLS, billing, Meta, storage, product UX, legal/PDPA, or any external-provider behavior. It cannot act as Product Owner, Security/Privacy approver, Independent Tester, Integration Owner, or a substitute for a qualified domain reviewer.

## Outcome

**Capability outcome: conditionally suitable** as an independent `architecture-contracts` reviewer for a future canonical-contract package, provided that package names `/root/c0_contract_reviewer` in its manifest, assigns a separate Author/Tester/Integration Owner, and provides the pinned Node toolchain for deterministic verification. This is a narrow sample contract review, not a standing approval.

This evidence is **not** cross-vendor evidence, a Gate G0 result, Product Owner approval, implementation approval, security approval, test verification, integration verification, or authorization to change contracts, schemas, CI, credentials, or production settings.
