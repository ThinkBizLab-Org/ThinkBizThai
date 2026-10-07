# WP-0A-CON-004: Author closure of the role-verdict conditions, 2026-10-06

Author: `/claude/a0_atlas`. This record was written by a subagent of that run, in the same vendor and
model family as every role run on this package. It acts as the Author and approves nothing.
Branch: `agent/claude/WP-0A-CON-004-security-audit-observability`, cut from `origin/main` `8c089cc`.

## 0. What this is and is not

- Author evidence only. It does not review, test-verify, integrate or gate-approve anything, it
  countersigns no acknowledgement, and it does not move the package past `in_review`. The status
  was already `in_review` and stays there.
- The verdicts it answers are the latest role files on this package:
  - `review-contract.md` §2d and §9: Reviewer `/claude/c0_contract_reviewer`, `changes_requested`,
    at `a690f11` (2026-09-01), eight required changes.
  - `security-disposition-handle-ownership-a1.md` §4-§7: A1 `/claude/a1_bastion`, 2026-09-04,
    "refused in part, ratified in part", conditions C1-C5. By its own C5 it covers the ownership
    blocker only.
  - `co-owner-review-sec-aud-obs-usg.md`: A1 and A6 (`/claude/a6_relay`) co-owner assessments of
    2026-09-02. A1 signed off on CTR-SEC-001 with blocking conditions; A6 signed off on CTR-AUD-001
    and CTR-OBS-001 with recorded conditions. These are co-owner assessments, not a
    `security_approved` gate.
  - **No Tester verdict and no Integration verdict exist.** Those are first verdicts, owed.
  All three are a month and many merged packages older than `main`, so every condition below was
  re-measured at `main` `8c089cc`, not carried forward from the verdict text.
- The Owner's step-2 decisions are applied from
  `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186). The
  Owner's reply was `บืนยันขั้น 2`.
- This branch changes no RFC, no `CONTRIBUTING_AGENTS.md`, no CI file and no gate rule, so it is not a
  governance PR. It changes annotation and caveat TEXT in this package's three Draft contracts; no
  rule, enum, requiredness, bound or freeze level moves.

## 1. C0's eight required changes, re-measured at `main` `8c089cc`

| # | C0 required change | State at `8c089cc` | This branch |
|---|---|---|---|
| 1 | M1: `dependencies.status` inference must not claim the SEV-2 row distinguishes degraded from unavailable; declare `healthy` | **Half fixed.** The `status` x-source was corrected on 2026-09-02 and declares `healthy`. The block-level `dependencies` x-source still said the row "distinguishes a degraded provider from an unavailable one". | **Closed.** `ctr-obs-001/schema.json` `dependencies.x-source` now quotes the row and says it draws no such distinction. |
| 2 | M3: remove "MR-004 requires a reason" from the OBS x-rule and `freeze_boundary` | **Half fixed.** The capability x-rule was corrected (declared inference from MR-006). `ctr-obs-001/manifest.json` `freeze_boundary` still read "the MR-004 deny-by-default requirement that an unready capability states a reason". | **Closed.** `freeze_boundary` now records the reason as a declared inference from MR-006, MR-004 not mentioning one. |
| 3 | M6: give `trace_id` an x-source | **Closed before this branch** (declared inference, 2026-09-02). | Nothing to do. |
| 4a | M2: cite the 5.2 *name* column as a name | **Half fixed.** `x-catalog-note` was added, but `readiness.x-source` still opened "Decision Register 5.2 CTR-OBS-001 requires 'readiness'". | **Closed.** It now says the register NAMES the contract "Correlation/health/readiness" and points at the artifact column. |
| 4b | M4: drop SEC-009 as the source of "why" | **Open.** `ctr-sec-001` `allOf[0]` x-rule said a revoked handle "must record when, by whom and why" on PT-010 plus SEC-009; the manifest `freeze_boundary` said SEC-009 requires "actor, reason and correlation". | **Closed.** Both now say SEC-009 requires actor and correlation only, and requiring a reason is a declared inference from OB-005. `revocation.x-source` says the same. |
| 4c | M5: restate the legal-counsel note as what it says | **Open** in `ctr-aud-001` `retention.x-source`, `ctr-aud-001/manifest.json` `freeze_boundary`, and this manifest's retention blocker. | **Closed in all three.** The note (`meta-security-production-ops-workstream-th.md:191`) requires legal and tax requirements and the incident notification period to be confirmed before Production; it does not name retention periods and governs PDPA-006 by position only. |
| 5 | Declare the unsourced `maxLength` values and `liveness.status` | **Open** for `reason_key` (AUD and OBS), `retention.policy_ref`, `change.before_ref`/`after_ref` and `liveness.status`. `action.name` was already declared. | **Closed.** Each now carries a declared-inference note: 96 matches the existing stable-key length, 256 is adopted from the CTR-IDM-001 `result_ref` precedent (re-checked: `ctr-idm-001/schema.json:66`), and `up`/`down` are this contract's own terms. No bound value changed. |
| 6 | Soften "materializes exactly" on redaction, or add fixtures | **Fixtures added before this branch.** Six `invalid-redaction-<surface>-false.json` exist for CTR-SEC-001. `freeze_boundary` still listed the surface requirement under "Materializes exactly" without saying the six flags are a self-attestation, which A1's co-owner finding records. | **Closed.** `freeze_boundary` and `redaction.x-source` now say each surface is declared and fixture-defended, and that this is NOT evidence that any surface is free of plaintext. The runtime redaction tests that Decision Register 5.2 names still do not exist (open blocker). |
| 7 | Reframe the ownership escalation | **Open.** The `handle` x-source and `freeze_boundary` still called it an open conflict "for the A1 owner to resolve", although A1 disposed of it on 2026-09-04. | **Closed.** Both now record A1's disposition and name the open items: the RFC A1 required, and the issuance format. |
| 8 | Correct the coverage sentence in `author-self-check.md` | **Half fixed.** The later "Mutation coverage" section was corrected, but the original heading still said "proven by mutation". | **Closed.** The heading now says fixture mutation shows the suite reads the schema, with a dated correction note. |

## 2. A1's conditions (disposition C1-C5 and co-owner review)

| Condition | State | This branch |
|---|---|---|
| C1: never cite the pattern as a control | Holds: `x-opacity-limitation`, `freeze_boundary` and open_blockers[1] all say it is not one. | Kept. A duplicated half-sentence left in open_blockers[1] by the 2026-09-04 correction was removed; no claim changed. |
| C2: handle issuance format before freeze | Open. A1 must specify it through the RFC in §4(c). | **Owed by A1**, through an RFC in `architecture/decisions/**` (outside this package's paths). |
| C3: make the composition claim true, or withdraw it | Open. Re-measured: `ctr-sec-001` `handle` has `maxLength: 128`, and `ctr-mod-001` `secret_handles.items` has no `maxLength`, so the accept sets still differ. | **Withdrawn here.** The `handle` x-source and `freeze_boundary` no longer give "the two contracts compose" as the justification. Making them equal is owed through the RFC (CTR-MOD-001 belongs to WP-0A-CON-003 and A0). |
| C4: correct "zero coverage" in three places | Closed 2026-09-04 (`e7b8c4b`, `ec20e8b`). | Nothing to do. |
| C5: the other A1 blockers are untouched | True. The SEC-003 class, SEC-016 break-glass fields, runtime redaction tests, the cross-tenant scope binding and audit immutability are all still open. | Recorded in `required_human_authorities` and open_blockers. |
| §4(c): a narrow RFC, opened by A0 as CTR-MOD-001 owner | Not opened. `architecture/decisions/` holds RFC-2026-001..028 and none concerns handle syntax. | **Owed by A0, as owner of CTR-MOD-001 and the Decision Register.** It is a governance act this package cannot do. open_blockers[0] now carries A1's §7 wording. |
| A6 co-owner: per-label metric budget; `outcome` vocabulary | Open (accepted gap). | **Owed by A6** (OB-006, OBS-009). |
| A0+A6 and A1: audit immutability | Open. | **Owed**, before CTR-AUD-001 freezes. |

## 3. Owner step 2, applied to this manifest

| Item | Applied |
|---|---|
| 1. RFC-2026-024's cross-vendor withdrawal extends to the 15 packages | `independence.prefer_cross_vendor_review` is `false`, and `cross_vendor_exception` records the withdrawal and what independence still means. The "not satisfied" blocker is closed in place. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` | Nothing to act on in this package. `grep` for `root/r0` and `acknowledgement` across `ctr-sec-001`, `ctr-aud-001`, `ctr-obs-001`, the manifest and the handoff at `8c089cc` returns nothing. The Integration Owner was already `/claude/r0_steward`. Recorded as a blocker entry so the absence is measured. |
| 3. No Product reviewer for contract packages | `role_assignments.product_reviewer_note` records that the null slot is by decision. |

Also corrected in the record: RFC-2026-004 has been Approved since 2026-09-02 (the "Proposed" blocker
is closed in place), and the dependency blocker no longer says CON-002, CON-003 and A0-002 are
unmerged. Their work is on `main`, and their open blockers are still inherited.

## 4. Owed by this package's Author, not done here

- **22 reference-shaped fields with no upper bound**, listed in `KNOWN_UNBOUNDED` in
  `test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` as owed by WP-0A-CON-004:
  CTR-SEC-001 x8, CTR-AUD-001 x4, CTR-OBS-001 x10 (named in the manifest's `open_blockers[14]`).
  *Rewritten after the merge from `main` (R0 R4, C0 N-2, Q0 F-3):* PR #188 merged at `fa10229`, so
  the earlier "until #188 merges" deferral has lapsed. The 22 bounds are now due as this package's
  next increment (ids 128, references 256 per RFC-2026-009), with their own review round, because a
  bound is a rule change to a Draft contract. A1's four bare CTR-SEC-001 strings come first
  (`scope.workspace_id`, `rotation.owner.id`, `revocation.actor.id`, `correlation_id`). They are not
  bounded in this PR.

## 5. Commands at this branch (base `main` `8c089cc` plus this increment)

*Note added 2026-10-07 (Q0 O-3): this heading is true of the commands below, which ran on `8c089cc`. The branch later merged `main` `fa10229` and then `9e15881`; §6 records the merge and the new branch point.*

| Command | Exit | Result |
|---|---|---|
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | 0 | 6 tests, 6 pass, 0 fail, 0 skipped, 0 todo |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` | 0 | 6 tests, 6 pass, 0 fail, 0 skipped, 0 todo |
| `node --test test-kits/contracts/catalog-registry.test.mjs` | 0 | 15 tests, 15 pass. Before the six pins moved, it failed and named exactly the three `freeze_boundary` and three annotation digests this branch rewrote. |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | no output |
| `npm run check` (Node v24.20.0 / npm 11.19.0) | see handoff | Recorded in `handoffs/WP-0A-CON-004-author-handoff.json` `tests`, from the run `scripts/commit-when-clean.mjs` makes before it commits. A run made before the handoff was refreshed failed only the two handoff-describes-this-branch checks: 690/692. |

The six moved pins in `test-kits/contracts/catalog-registry.test.mjs` (owner WP-0A-CON-008), and the
digest of that file in `test-kits/integrity-manifest.json` (owner WP-0A-A0-002), are declared in
`ownership.amends_without_owning`.

## 6. Closure after the role round of 2026-10-05/06 (appended by A0)

Written by a subagent of `/claude/a0_atlas` (Author). A0 executes the Integration Owner's
recommended path under the Owner's delegation "เอาตามที่คุณแนะนำทุกอย่าง" (follow everything you
recommend). It decides nothing, approves nothing, and does not move the package past `in_review`.
This is not a governance PR: no RFC, `CONTRIBUTING_AGENTS.md`, CI or gate file is touched.

| Item | Done on the branch |
|---|---|
| Role files | C0 `e547b64a`, A1 `fcd04da1`, Q0 `722a05b2`, R0 `c7addd95` cherry-picked with `-x`. |
| R0 condition 2 / R1, C0 N-1, Q0 F-1 | `origin/main` `fa10229` merged into the branch (normal merge). The only conflict, `test-kits/integrity-manifest.json`, was resolved by union: this PR's `catalog-registry.test.mjs` digest, `main`'s two CTR-EVT/CTR-JOB test digests. `npm run regenerate:manifest` rebuilt 91 digests and `cmp` with the union was equal; sha256 `b192ae95…8e441`, the value R0 named. |
| R0 R2 path (a), A1 N-1 | The self-contradicting first clause of CTR-SEC-001 `handle.x-opacity-limitation`, "It excludes mixed-case base64 and nothing else", is deleted; the facts that followed it are kept. The `ctr-sec-001` annotation pin in `catalog-registry.test.mjs` moved `0173014e4eb46481` → `c6383e794198a422` (count unchanged at 21), and that file's integrity digest with it. This is a `contract-catalog/**` change: per R2 it re-opens C0 (one annotation) and Q0 (short §2 re-run), and A1 records N-1 closed. Not recorded here as closed. |
| R0 R4, C0 N-2, Q0 F-3, A1 N-2 first half | `open_blockers[14]` and §4 above rewritten: #188 merged at `fa10229`; the 22 bounds are this package's next increment (ids 128, references 256 per RFC-2026-009), with their own review round. |
| R0 R3 | `ownership.amends_without_owning.rationale` corrected: WP-0A-CON-008's and WP-0A-A0-002's manifests do not record CON-004's amendment. The record is owed by those packages' next PRs; their files are not edited here. |
| R0 R5, A1 N-3 | Recorded: A1's F5 (CTR-MOD-001 promoted to Candidate v1 without the Owner being told it fixes a syntax chartered to CTR-SEC-001) is to be disclosed to the Product Owner in the next Owner batch as a one-line disclosure, without waiting for the §4(c) RFC. |
| A1 N-2 second half | As A1 worded it: bound or pattern the 22 fields, starting with the four unconstrained CTR-SEC-001 strings; before CTR-SEC-001 leaves Draft. Owed in the next increment. |
| A1 carried items | As A1 worded them, unchanged: C2 (issuance format, by A1 through the RFC), the §4(c) RFC including equal accept sets (C3's other branch), SEC-003 data class, SEC-016 break-glass fields, runtime redaction tests, cross-tenant scope binding, audit immutability. All before freeze; none before this merge. |
| Q0 O-1 | The handoff still cites base `8c089cc`; it is refreshed in a later commit, last and alone. Until then `npm run check:handoff` is expected to fail. |
| Q0 O-2 | Next rule round: `revocation.required` `reason_key` and the `liveness.status` enum are held only by the generic pin. |

Still open before `integration_verified` (R0 §6): C0 and A1 re-check of the one annotation, Q0's
short §2 re-run at the new head, the refreshed handoff, and a green `bootstrap` on the exact head.
