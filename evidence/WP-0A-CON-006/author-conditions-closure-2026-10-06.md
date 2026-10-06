# WP-0A-CON-006: closing the role verdicts' conditions, and the Owner's step 2

Author run: `/claude/a0_atlas`. Written by a subagent that the Author run spawned. Branch
`agent/claude/WP-0A-CON-006-stale-blockers`, cut from `origin/main` `8c089cc`. Toolchain: Node
`v24.20.0`, npm `11.19.0`.

**This is Author evidence only.** It approves nothing. It is not a review, a test verdict, a
security review, an integration verdict or a Product Owner disposition, and it does not move Gate
G0. The package stays `in_review`.

## 1. Which verdicts are on file, and against what

| Role | File | Head | Verdict |
|---|---|---|---|
| Reviewer C0 | `review-contract-head.md` | `337dfe7` | `changes_requested` |
| Tester Q0 | `test-verdict.md` | `5c6eef2` | `test_verified_with_conditions` |
| Tester Q0 | `test-verdict-generated-fixtures.md` | `9a82456` | `test_verified_with_conditions` |
| Security A1 | none | — | **no verdict has ever been recorded** |

All three files predate pull request #9's final state, pull request #62, and this branch. No role
run has re-verified this package at a current head. This file maps every condition those three
verdicts set to its state at `main` `8c089cc`. It then records what this branch closes and who
owes the rest. The re-verifications themselves belong to C0, A1, Q0 and R0. Nothing here is
offered in their place.

## 2. Conditions, measured at `main` `8c089cc`, then at this branch

"Closed before" means a merged change already closed the condition, and this file only re-measures it.
"Closed here" means this branch closes it. "Owed" names the package whose paths hold the fix.

### C0 `review-contract-head.md`

| Id | State | Evidence |
|---|---|---|
| H-1 `supersedes_usage_id` required on every `provider_reported` | Closed before | The `allOf` was removed in `79fbc33`. `cost.supersedes_usage_id` is optional, and its `x-source` says so. Self-reference and duplicate supersession are declared in `untestable_by_schema` (2). |
| H-2 16-digit money bound unsourced, rationale false | Closed before for the false rationale (A6, `724ce5f`). **Closed here** for the source: `cost.amount.x-source` now calls the bound a DECLARED INFERENCE. No task states a maximum, and the only purpose of the bound is to cap what a consumer parses. The fixture `invalid-cost-magnitude-past-exact-range.json` keeps its old name, and the annotation says it witnesses the bound, not an IEEE-754 property. Renaming it would move a pinned `FIXTURE_SET` name and the generator's naming for no change in behaviour. | `contract-catalog/shared-kernel/ctr-usg-001/schema.json` |
| H-3 `constraintSites` counted property names | Closed before by WP-0A-CON-003: the metric counts assertion keywords only (`METADATA`/`STRUCTURAL` sets, `schema-mutation-coverage.test.mjs:178-179`). | CON-003's file |
| H-4 floor gameable both ways | Partly closed before. The exact `SITE_FLOOR` and `UNKILLED_CEILING` tables now hold the line, and the ratio does not. **Owed by WP-0A-CON-003** for any remainder. | `schema-mutation-coverage.test.mjs:149-174` |
| H-5 `dimension.enum` and `attribution.required` killed by nothing | Closed before. The only unkilled CTR-USG-001 site is `properties.dedupe_key.minLength`, which the redundancy proof excuses (`UNKILLED_SITES`, `:718-724`; `UNKILLED_CEILING['ctr-usg-001'] = 1`). | measured with `node --test test-kits/contracts/schema-mutation-coverage.test.mjs`, 10/10 |
| H-6 CTR-EVT/JOB fixtures added without provenance | History from pull request #9. The fixtures sit in WP-0A-CON-001's paths. Not reopened here. | — |
| H-7 undeclared write to CON-003's `schema-mutation-coverage.test.mjs`; `outputs.files` stale; scope/criteria describe removed constructs | **Closed here** for every part inside this package's paths: `outputs.files` is regenerated from the tree (5 USG fixtures and one evidence file were undeclared, and the deleted duplicate is dropped). `scope.include[1]`, `acceptance_criteria[3]` and `required_tests[1]` are amended with dated notes. `acceptance_criteria[6..8]` now record that the coverage guard is CON-003's output and was written here without a declaration. The write itself is history (pull request #9) and cannot be undone by a record. | `work-packages/WP-0A-CON-006.json` |
| H-8 two byte-identical CTR-NTF-001 fixtures | **Closed here.** `invalid-failure-missing-class-only.json` is deleted (md5 `f9991dca…` for both files before the change). `invalid-failure-without-class.json` stays, because its name is the one `required_tests[2]` uses. It fails with exactly one error: `$.delivery: missing required property 'failure_class'`. | NTF manifest `fixtures`; `catalog-registry.test.mjs` `FIXTURE_SET` |
| H-9 `invalid-float-cost.json` carries removed `list_price` | **Closed here.** `basis` is now `estimated`, which matches its own `dedupe_key`. It fails with exactly one error, on `cost.amount.pattern`. | subset validator, one error |
| H-10 duplicated clause in NTF `freeze_boundary` | **Closed here.** | NTF manifest |
| §3 supersedes reference unverifiable | Closed before (A6, `724ce5f`): `untestable_by_schema` (2) and `untestable_by_fixture`. | USG manifest |
| §4 fraction asymmetry undeclared | **Closed here.** `quantity.amount.x-source` states why `cost.amount` requires 2–8 fraction digits and a quantity allows 0–8: money has a minor unit and a count does not. Declared as an inference. | USG schema |
| §8 conjunction in `shared-kernel-contract-catalog.test.mjs` hides divergence | **Owed by WP-0A-CON-001.** Still conjoined at `:103`. Non-blocking. | — |
| B-6 residue: NTF `untestable_by_fixture` still describes the removed const | **Closed here.** | NTF manifest |
| B-7 CTR-NTF-001 authored by a non-owner | **Stands**, recorded in `open_blockers[1]` and `[2]`. A5 must ratify it. | — |
| N-2 `forbidden_paths_note` false | Closed before (`forbidden_paths_note` rewritten). | manifest |
| N-6 `message_key` unbounded | **Owed by this package, not closed here.** It is one of the ten fields in §4. | — |
| N-7 `dedupe_key` cites ID-002 rather than §5.5 | Superseded. A6's rewrite cites ID-002 for what ID-002's row actually says: an inbox/processed record, with redelivery keyed on the event id (`usage_id`). §5.5 of the register is the Contract Artifact Standard and states no carried-key obligation. C0 should re-read this item. | USG schema `dedupe_key.x-source` |
| N-8 `K MK-006` and the meta-security input cited by nothing | **Closed here.** `K MK-006` is removed from NTF `source_references`. `docs/plans/meta-security-production-ops-workstream-th.md` is removed from `inputs.files`, with an `inputs.files_note`. | both manifests |

### Q0 `test-verdict.md`, §12

| # | State |
|---|---|
| 1 vacuous USG `allOf` | Closed before: removed (`79fbc33`). The empty `allOf: []` it left was removed later, when "make empty combinators impossible" landed. |
| 2 `PROTECTED` entries and root-`required` guard for both contracts | Closed before by CON-003. `PROTECTED` carries 4 USG and 6 NTF sites (`:50-59`). Every site Q0 named is now killed. The exceptions are `metric_labels.type`, which is gone, and NTF's proof-excused or ownership-held sites listed in `UNKILLED_SITES`. |
| 3 split `invalid-failure-without-class.json` | Closed before when the rollback const was removed; the fixture is single-fault. Its byte-identical twin is removed here (H-8). |
| 4 owners rule on negative cost and quantity scale | The sign was removed, and A6 signed the contract (third assessment, `evidence/WP-0A-CON-004/co-owner-review-sec-aud-obs-usg.md`). The quantity scale is now declared (§4 above). Refund policy remains OPEN-001 (Product plus an accountant), and the Owner's 2026-10-05 step 2 did not decide it. |
| 5 ownership irregularity | Stands (B-7). |

### Q0 `test-verdict-generated-fixtures.md`

| # | State |
|---|---|
| C1 metric gameable by deletion | Held by the exact tables (H-4). Any remainder is owed by CON-003. |
| C2 71 % mechanical fixtures | Recorded in `open_blockers` as a qualification. It is not a defect to close. |
| C3 conditional sites trail | Recorded with re-measured numbers in `open_blockers`. The generator is not in the tree, so the generator-naming fix is owed by CON-003. |
| C4 schema with no manifest exempt | Closed before: `schema-mutation-coverage.test.mjs:325` names such a contract as weak. |
| C5 no before/after diff of the generating commit | **Answered here with history.** The generating commit is `79fbc33` ("test(contracts): count constraints, not property names"). `git show --name-status 79fbc33`: 442 added, 19 modified, 1 deleted. All 441 added fixtures are `invalid-*` (the 442nd add is `review-contract-head.md`). **No `valid-*` fixture changed.** **Exactly one schema changed, deliberately:** `ctr-usg-001/schema.json` dropped the `allOf` that required `supersedes_usage_id` on `provider_reported` (C0 H-1). It also deleted that rule's fixture, `invalid-reported-without-supersedes.json`. The 14 modified `manifest.json` files were compared parsed, key by key, between `79fbc33^` and `79fbc33`. In 13 of them only `fixtures` changed. In the 14th, CTR-USG-001, `untestable_by_fixture` also gained the sentences that move the supersession checks to the ledger, which go with the same H-1 change. In every manifest, the non-`invalid-` entries of `fixtures` are the same set before and after. Only `ctr-api-001` and `ctr-err-001` changed the order, to sorted. So Q0's invariant holds for every contract except that one intended change. The Integration Owner should confirm it. |

## 3. What this branch changes

Contract files (this package's own paths):

- `ctr-usg-001/schema.json`: two `x-source` sentences (H-2, §4). No assertion keyword moves.
- `ctr-usg-001/manifest.json`: `untestable_by_fixture` records A6's fifth condition as half closed.
- `ctr-usg-001/examples/invalid-float-cost.json`: `basis` `list_price` changed to `estimated` (H-9).
- `ctr-ntf-001/manifest.json`: the duplicate fixture is dropped, the duplicated clause removed, the
  stale const sentence corrected, and `K MK-006` removed.
- `ctr-ntf-001/examples/invalid-failure-missing-class-only.json`: deleted (H-8).

Outside this package's paths, declared in `ownership.amends_without_owning`:

- `test-kits/contracts/catalog-registry.test.mjs` (WP-0A-CON-008): exactly six pins move with the
  text they pin. They are the USG annotation digest, the USG `untestable_by_fixture`, NTF
  `freeze_boundary`, NTF `untestable_by_fixture`, the NTF `source_references` digest, and one name
  in NTF's `FIXTURE_SET`. Before the edit, the suite reported exactly these six and nothing else.
- `test-kits/integrity-manifest.json` (WP-0A-A0-002): the one digest of `catalog-registry.test.mjs`.

`test-kits/contracts/schema-mutation-coverage.test.mjs` needed **no** edit. That is the evidence
that no assertion site, kill or ceiling moved.

The work package manifest applies the Owner's step 2. It is described in §5.

## 4. Owed, outside this branch

| Item | Owner | Why not here |
|---|---|---|
| Ten unbounded reference fields: NTF `notification_id`, `message_key`, `deep_link.target_ref`, `dedupe_key`; USG `usage_id`, `attribution.workspace_id`, `attribution.business_profile_id`, `attribution.job_id`, `attribution.provider_key`, `cost.supersedes_usage_id` | This package, with A5 (NTF owner) and A6 (USG co-signer) | `maxLength` is an assertion site, pinned by CON-003's tables, and each one needs a too-long fixture pinned by CON-008's `FIXTURE_SET`. Pull request #188's `KNOWN_UNBOUNDED` fails on a **stale** entry, so bounding these fields before #188 merges breaks #188. After it merges, the change must drop the ten entries from CON-007's test in the same diff. Proposed: one change after #188, with RFC-2026-009's class values (128 for an id, 256 for a reference) declared as inferences. |
| Dead `dedupe_key.minLength` on USG | CON-003 jointly with this package; A6 sees it | It moves `SITE_FLOOR`, `UNKILLED_CEILING`, `UNKILLED_SITES` and the pinned site record. |
| H-3/H-4 remainder, C1, C3 generator naming | WP-0A-CON-003 | The fix is in its file. |
| §8 conjunction | WP-0A-CON-001 | The fix is in its file. |
| Acknowledgement of this branch's two amendments | `/claude/r0_steward` (Integration Owner of CON-008 and A0-002) | Only that role can acknowledge them. |
| Security verdict (first), C0/Q0 re-verification, Integration verdict | `/claude/a1_bastion`, `/claude/c0_contract_reviewer`, `/claude/q0_sentinel`, `/claude/r0_steward` | Role runs. The Author cannot give them. |
| A5 ratification of CTR-NTF-001 | A5 | Ownership (B-7). |

## 5. The Owner's step 2 on this manifest

- **Item 1:** `independence.prefer_cross_vendor_review` is set to `false`. `cross_vendor_exception`
  now records the withdrawal. The blocker "prefer_cross_vendor_review is not satisfied" is resolved
  in place.
- **Item 2:** `role_assignments.integration_owner_note`. Measured on `main` `8c089cc`, nothing in
  this package records an acknowledgement pending against `/root/r0_steward`
  (`grep -rn root/r0_steward` over the manifest, both contract directories and the handoff found
  none). The ruling therefore changes nothing here. The two acknowledgements this branch creates
  run to `/claude/r0_steward`.
- **Item 3:** `role_assignments.product_reviewer_note`. `product_reviewer_agent_run_id` stays
  `null`, and `review_and_test_gates` has no product step.

Source: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3 rows 1-3.

## 6. Tests

These were run at `main` `8c089cc` on this branch name before any edit (`npm run check`): 692
tests, 690 pass, 2 fail, 0 skipped, 0 todo. Both failures are the branch's own stale handoff, which
cited head `3cd473c`. They are "the handoff for this branch describes this branch" and the ratchet
that re-runs it on a copy. `npm run refresh:handoff` fixes them, and it is the last commit on this
branch.

The handoff (`handoffs/WP-0A-CON-006-author-handoff.json`) records the results after the change,
with exit codes.
