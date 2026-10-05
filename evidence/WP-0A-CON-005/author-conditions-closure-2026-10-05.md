# WP-0A-CON-005: Author closure of the role-verdict conditions, 2026-10-05

Author: `/claude/a0_atlas`. This record was written by a subagent of that run. It acts as the
Author and approves nothing.
Branch: `agent/claude/WP-0A-CON-005-job-reference-hardening`, cut from `origin/main` `600b48b`.

## 0. What this is and is not

- This file is Author evidence only. It does not review, test-verify, integrate or gate-approve
  anything. It does not countersign any acknowledgement, and it does not move the package past
  `in_review`. The status was already `in_review` and stays there.
- The three verdicts it answers are `review-contract-c0.md` §8 (Reviewer,
  `review_approved_with_conditions`), `review-security-a1.md` §10 (Security,
  `security_approved_with_conditions`) and `test-verdict.md` §9 (Tester,
  `test_verified_with_conditions`).
- The Owner's step-2 decisions are applied from
  `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (PR #186, branch
  `agent/root/WP-0A-A0-001-repository-bootstrap`; read from that branch because the PR had not
  merged when this was written). The Owner's reply was `บืนยันขั้น 2`.

## 1. Conditions, one by one

"Closed" means closed by an edit inside this package's `writable_paths`, or by
`authorized_cross_package_amendments[6]` for the one integrity-manifest digest. "Owed" means it
cannot be closed from here, and the owner is named.

### Reviewer (`/claude/c0_contract_reviewer`)

| Condition | State | What was done |
|---|---|---|
| C1 (F1): Decision 2 and the manifest print a pattern the tree does not carry | **Closed** | RFC-2026-006 Decision 2 now prints the lookahead-free pattern, measured byte-equal to `ctr-job-001` `input_ref`/`result_ref` and `ctr-idm-001` `result_ref`. It also records that `64d9c65` removed the lookaheads before approval. `authorized_cross_package_amendments[0]` was corrected the same way. |
| C2 (F2, F3): Decision 4 tally; `ctr-evt-001` Limitations paragraph; blockers 10 and 12 | **Closed** | Decision 4 and acceptance criterion 7 are time-stamped: 4 C / 10 D when written, 9 C / 5 D at `600b48b`. The Limitations bullet is withdrawn as closed, and it cites the remedy that landed (`^CTR-[A-Z]{3}-[0-9]{3}@<semver>$`, `maxLength 32`, held by `ctr-evt-001-schema-ref-bounds.test.mjs`). Blockers 10 and 12 are removed from `open_blockers` (§2). |
| C3 (F4): the guard does not defend allow-list membership | **Closed, by the assertion C0 preferred** | One assertion was added inside the existing test "neither reference field carries a deny-list, and both carry the recorded rule". It pairs `http`, `https`, `ws`, `wss`, `ftp`, `file`, each in lower and upper case, with a body the grammar accepts (`<scheme>:public.example.invalid/x`) on both fields, and requires every pair to be rejected. No test was added or renamed, so `scripts/test-suite-contract.mjs` (read-only here) does not move. **Observed to bite:** with `https` added to the schema's alternation, the suite fails, naming `input_ref=https:public.example.invalid/x, result_ref=https:public.example.invalid/x`. With the schema restored, it is 6/6 green. The RFC Limitations also state the assertion's own limit: schemes outside that list are not covered. |
| C4: record the blocker triage | **Closed** | §2 below. |
| Referred F5 (`ctr-ntf-001` `deep_link.target_ref` unbounded) | **Owed:** CTR-NTF-001's owner | Recorded in `open_blockers[13](b)` and the RFC Limitations. |
| Referred F6 (two hand-written predicates carry the lookahead form) | **Owed:** WP-0A-CON-001 and WP-0A-CON-002 | `open_blockers[13](c)`. Equivalent in behaviour; the text diverges. |
| Referred §5 (`dedupe_key`, absent `x-source`) | **Owed:** CTR-JOB-001's owner, `required_before_freeze` | `open_blockers[13](d)`. |
| Referred F7 (no Tester attestation covers the head) | **Owed:** `/claude/q0_sentinel` re-test, then `/claude/r0_steward` | `open_blockers[14]`. This increment moves the head again. |

### Security (`/claude/a1_bastion`)

| Condition | State | What was done |
|---|---|---|
| C1 (S1): record the `ctr-api-001` / `ctr-idm-001` amendments | **Manifest and RFC halves closed. Schema half owed.** | Both schemas were added to `authorized_cross_package_amendments` as entries recorded after the fact, with the exact change: lookahead removal only. The RFC's "Scope explicitly excluded" clause now has a dated amendment naming the departure. The `x-amended-by` records **on the two schemas** are owed by WP-0A-CON-001's owner (contract-catalog files outside this package's writable paths), acknowledged by `/claude/r0_steward`. This branch does not touch either schema. |
| C2 (S2): populate `amends_without_owning.paths` with nine paths | **Superseded, not done** | `f3b4fbd` ("the scope guard could not read half the declarations it checks") taught `scripts/verify-branch-scope.mjs` to read `authorized_cross_package_amendments` too. It now reads every prose entry, and `scripts/validate-work-package-ownership.mjs` validates both fields under the same rules. Listing the nine historical paths in `amends_without_owning` would now **fail** this branch: `deadAmendments` exits 74 on a declared path the branch does not change, and this branch changes only one of the nine (`test-kits/integrity-manifest.json`), which the prose entry already covers. The machine-readability S2 asked for exists now. |
| C3 (S6, F1, F3): Decision 2; withdraw the `ctr-evt-001` bullet; close blockers 3, 10, 12 | **Closed** | As Reviewer C1 and C2. Blocker 3 (independent neutrality proof) is removed as discharged: Q0 at `b47aece`, A1 at `64d9c65`, C0 at `1478f34`. |
| C4 (S3, S8): disclose unbounded `job_type`, `lease_owner`, `progress_stage`, `last_error_code` and the numeric bounds | **Closed as disclosure, as the condition requires** | `open_blockers[11]`, escalated to CTR-JOB-001's owner as `required_before_freeze`. Nothing was bounded, because the condition forbids it. S5 (248 opaque body characters) is disclosed beside it in `open_blockers[12]`. |

### Tester (`/claude/q0_sentinel`)

| Item | State | What was done |
|---|---|---|
| §9(1): 91 should be 93, baseline 85 should be 87 | **Closed** | `author-self-check.md` §6 now reads 87 → 93. Its own Corrections table already claimed this fix, but the lines themselves had not changed. RFC-2026-006 already read 93, and its Verification now states that the count belongs to `64d9c65`. |
| §9(2): integrity-manifest counts 27/25 should be 27 + 1 = 28, 26 unchanged | **Closed** | `author-self-check.md` §7 corrected. |
| §9(3): no `maxLength` on any `_ref` | **Closed by a later package** | `input_ref`/`result_ref` carry `maxLength: 256` at `600b48b`, held by `ctr-evt-001-schema-ref-bounds.test.mjs` over four contracts. CTR-NTF-001 remains (Reviewer F5, owed). |
| §9(4): lookaheads redundant, RE2 portability | **Closed** at `64d9c65` | Recorded in Decision 2. |
| §9(5): `isPrivateRef` bypassable predicate | **Closed elsewhere; text divergence owed** | The `^https?://` form was closed in WP-0A-A0-003, per the self-check. The remaining lookahead-text divergence is Reviewer F6, owed. |
| §9(6): `$` dialect dependency (trailing newline, CRLF) | **Open, carried** | It is a porting note for whoever moves the constraint off ECMAScript. Nothing here ports it. |
| §9(7): `acknowledgement_status` read by nothing | **Open**, `open_blockers[1]` | Wording narrowed to C0's measurement: the guard reads it, but only as an enum. |
| §9(8): reconstruction caveat | **Open**, for the Integration Owner | `git show` of the parent commit is a cheap confirmation for whoever holds R0. |

## 2. Blocker triage (Reviewer C4)

Numbered as in the manifest at `600b48b`, 1-based:

| # | Was | Now |
|---|---|---|
| 1 | `/root/r0_steward` acknowledgement pending | Kept, with the successor named: `/claude/r0_steward` (Owner step 2 item 2). Still `pending` in both `x-amended-by` records. |
| 2 | Nothing reads `acknowledgement_status` | Kept, **narrowed**: the guard reads it as an enum only; self-countersigning goes undetected (C0 measured it). |
| 3 | Neutrality proof must be re-derived by a non-Author run | **Removed: discharged** (Q0, A1, C0). |
| 4 | Heavier than RFC-2026-004 | Kept. Disposition owed by `/claude/r0_steward`. |
| 5, 6 | Two CON-001 fixtures and one CON-001 test had to change | Kept as disclosures, unchanged. |
| 7 | `integrity-manifest.json` belongs to WP-0A-A0-002 | Kept, with this increment's one-digest update noted. |
| 8 | Scheme allow-list not decided | Kept, with the new membership property noted. |
| 9 | No tenant binding in the reference | Kept, unchanged. |
| 10 | `ctr-evt-001` `schema_ref` unconstrained | **Removed: closed by a later package.** |
| 11 | One hostile form on disk | Kept, unchanged. |
| 12 | RFC-2026-006 Proposed | **Removed: approved 2026-09-02, `82aae60`.** Recorded in `required_human_authorities[0]`. |
| 13 | Depends on A0-002 and CON-002, "unmerged" | Kept, **reworded**: both are still `in_review`, yet both are in `main`. The status fields and the tree disagree. |
| 14 | `prefer_cross_vendor_review` not satisfied | **Removed: the condition was withdrawn for this package** (Owner step 2 item 1; §3). |
| 15 | Gate G0 | Kept. |
| new | S3/S8 unbounded fields; S5 opaque body; owed-elsewhere list; no Tester attestation at the head | Added. |

That gives 15 blockers before and 15 after: four removed, four added.

## 3. Owner step-2 decisions applied to the manifest

| Item | Field | Change |
|---|---|---|
| 1. RFC-2026-024's cross-vendor withdrawal extends to the 15 packages | `independence.prefer_cross_vendor_review`, `independence.cross_vendor_exception` | `true` → `false`. The exception text is **replaced, not deleted**, by a sentence that records the withdrawal, its source and what independence still means (RFC-2026-024 §3/2-5). The old blocker 14 is removed. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` for pending acknowledgements | `required_human_authorities[1]`, `open_blockers[0]`, `open_blockers[2]` | The acknowledgement is now owed by `/claude/r0_steward`. **Not given:** naming a successor is not the acknowledgement. The `x-amended-by` field `acknowledgement_required_from` in `ctr-job-001/schema.json` still reads `/root/r0_steward`. That file is outside this package's writable paths, and the standing guard asserts that value, so it is left for the successor to update when it acknowledges. |
| 3. No Product reviewer for tooling and contract packages | `role_assignments.product_reviewer_note` (the schema allows extra keys in `role_assignments`) | `product_reviewer_agent_run_id: null` is recorded as a decision, not a gap. `review_and_test_gates` already carried no product step. |

`required_human_authorities[0]` now records the RFC-2026-006 disposition as given. It also notes
that this PR changes an RFC, so under RFC-2026-025 §5 item 6 the Owner merges it personally.

## 4. Declared tests, re-run at current `main` on this branch

Toolchain: `node v24.20.0`, `npm 11.19.0`. Base `600b48b`.

| Command | Exit | Result |
|---|---|---|
| `npm run check` on unmodified `600b48b`, on this branch name, before any edit | `1` | 691 tests, 689 pass, **2 fail**, skipped 0, todo 0. Both failures are "the handoff for this branch describes this branch", directly and through the ratchet copy: the handoff still cited the previous branch's `fdcade1`. That is expected on a fresh branch and is cleared by `npm run refresh:handoff`. Nothing else failed. |
| `node --test test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` (with the new assertion) | `0` | 6 tests, 6 pass, 0 fail, skipped 0, todo 0 |
| the same, with `https` added to the schema's scheme alternation (disposable edit, reverted with `git checkout`) | `1` | 5 pass, **1 fail**: `a network-dereferenceable scheme is in the reference allow-list: input_ref=https:public.example.invalid/x, result_ref=https:public.example.invalid/x` |
| `node --test test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `0` | 6 / 6, skipped 0, todo 0 |
| `node scripts/verify-test-coverage-floor.mjs` (before the digests were regenerated) | `86` | `RFC-2026-006-job-reference-hardening.md — content does not match its recorded digest`. The RFC is itself a digested file. |
| `npm run regenerate:manifest` | `0` | 91 digests rebuilt; exactly two entries changed: the RFC and the guard test |
| `node scripts/verify-test-coverage-floor.mjs` (after) | `0` | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | |
| `node scripts/validate-work-packages.mjs` | `0` | |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-005.json` | `0` | |
| `node --test test-kits/protocol-schema-conformance.test.mjs` | `0` | 4 / 4 |

`npm run check` on the final tree is run by `node scripts/commit-when-clean.mjs` before each
commit, and its result is in `evidence/VERIFICATION.md` and the handoff.

## 5. Files this increment changes

| File | Owner | Why |
|---|---|---|
| `architecture/decisions/RFC-2026-006-job-reference-hardening.md` | this package | Reviewer C1/C2, Security C1 (RFC half)/C3, Tester §9(1) |
| `test-kits/contracts/ctr-job-001-reference-hardening.test.mjs` | this package | Reviewer C3 |
| `work-packages/WP-0A-CON-005.json` | this package | all conditions and Owner step 2 |
| `evidence/WP-0A-CON-005/author-self-check.md` | this package | Tester §9(1)/(2) |
| `evidence/WP-0A-CON-005/author-conditions-closure-2026-10-05.md` | this package | this record |
| `handoffs/WP-0A-CON-005-author-handoff.json` | this package | refreshed, last and alone |
| `test-kits/integrity-manifest.json` | WP-0A-A0-002 | two digests: `authorized_cross_package_amendments[6]` |

No contract-catalog file, script, CI file, `docs/**` file or other package's manifest is touched.

## 6. What is still owed before `integration_verified`

1. `/claude/q0_sentinel` re-test at the new head (F7).
2. Reviewer and Security re-checks of this closure. Each verdict's conditions are answered here.
   Only those runs can say whether the answers lift them.
3. `/claude/r0_steward`: the CTR-JOB-001 acknowledgements (two `x-amended-by` records), the
   integrity-manifest acknowledgement, the disposition of the narrowing class of change
   (blocker 4), and the Integration verdict.
4. WP-0A-CON-001's owner: `x-amended-by` on `ctr-api-001` and `ctr-idm-001` (Security C1, schema
   half).
5. The Product Owner's personal merge, because the PR changes an RFC (RFC-2026-025 §5 item 6).
