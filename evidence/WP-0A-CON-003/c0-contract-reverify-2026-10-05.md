# WP-0A-CON-003: C0 re-verification at the PR #195 head

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/195, branch
`agent/claude/WP-0A-CON-003-stale-blockers`, head `e5fa682dbff206040d6cd908887bde468eb560e1`,
cut from `main @ 8c089cc0bf30a234efa61752c6054d670f85a2a8`. Four changed paths against that base:
`contract-catalog/shared-kernel/ctr-flg-001/examples/invalid-temporary-without-expiry.json` (content
only), `work-packages/WP-0A-CON-003.json`, `handoffs/WP-0A-CON-003-author-handoff.json` and the new
`evidence/WP-0A-CON-003/author-conditions-closure-2026-10-06.md`. No schema, contract manifest, index
entry or test file changed.

Earlier verdict re-checked: `evidence/WP-0A-CON-003/review-contract.md`, my role's first verdict on
`2649401` (2026-09-01), **changes_requested**, with five blocking items (§8 #1-#5) and six
should-fix-before-freeze items (§8 #6-#11). There is no later C0 file on this package.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Reviewer
run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor and a
parent with the Author. I did not write any of this PR's content and I fix nothing in it. This file is
Reviewer evidence only: it approves no gate, authorises no merge, moves no package status and
countersigns no acknowledgement. Gate G0 remains Specification Baseline Complete / External
Verification Pending. Everything here is synthetic. No provider, credential or database was touched by
me; the suite's own database tests ran as `npm run check` runs them, and I started no database.

## 1. Measured versus read

**Measured** (I ran it; output summarised with exit codes):

- Toolchain: `node --version` `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), matching `.node-version`.
- A private clone at
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/c0-WP-0A-CON-003/clone`,
  checked out **by branch name** at `e5fa682` (`git branch --show-current` printed
  `agent/claude/WP-0A-CON-003-stale-blockers`), so the branch-reading guards ran on the branch, not on a
  detached HEAD.
- `npm run check`: exit 0, `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0`
  (coverage floor, toolchain, secret scan, protocol validators and the suite runner). Matches
  `evidence/VERIFICATION.md` (692/692).
- `node --test test-kits/contracts/*.test.mjs`: 79/79, skipped 0, todo 0.
- `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs`: 6/6.
- `node scripts/verify-test-coverage-floor.mjs`: exit 0.
- `node scripts/validate-work-package-ownership.mjs work-packages`: exit 0.
- `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-003.json`: exit 0.
- `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-003-stale-blockers`: `WP-0A-CON-003`, exit 0.
- `node scripts/refresh-author-handoff.mjs --check`: exit 0 ("nothing substantive after its cited head").
- `node scripts/verify-branch-scope.mjs 8c089cc0 WP-0A-CON-003`: exit 0, "all 4 changed path(s) are declared".
- `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-003` (`origin/main` = `fa102298`): **exit 73**,
  25 paths, all of them from PRs #187 and #188 merged after the cut (see N-6).
- `git merge-tree --write-tree origin/main HEAD`: exit 0, no conflict.
- `gh pr view 195`: Draft, `MERGEABLE`, the one `bootstrap` check on `e5fa682` is **FAILURE**, run
  37379568076, step "Verify branch scope", exit 73, `BASE_SHA fa102298` (N-6).
- My own probe, `.../scratchpad/c0-WP-0A-CON-003/probe/probe.mjs`: 47 in-memory documents, each one change
  to a shipped `valid-` fixture, validated by `validate()` from `test-kits/contracts/json-schema-subset.mjs`
  against the shipped `schema.json` at the head. It re-runs my original M1-M16 and F1-F15 and adds the
  registry and prefix cases below. Nothing was written to the repository.
- My own requiredness census, `.../probe/required-members.mjs`: for every `required` list outside an `if`,
  delete each member alone and re-validate every declared fixture, at the head and at a `git archive` of
  `8c089cc0`.
- One mutation in the clone, reverted afterwards (`git status` clean): replace the temporary-flag branch's
  `audit.required` with `["owner_role"]` and run the contract suites.

**Read, not re-measured:** the A1 and Q0 rows of the Author's closure table (theirs to re-check); the
Author's m1-m4 mutation results (I re-ran one mutation of my own class, below); the Owner's step-2 wording,
which I read in `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3 rows 1-3
without judging it; RFC-2026-004's status line, which reads "Approved 2026-09-02 by the Product Owner".

## 2. My earlier conditions, one by one

| # (review-contract.md §8) | Then | At `e5fa682` | Evidence |
|---|---|---|---|
| 1 | `x-source` cites DR §5.1 for the registry | **Closed** | `module_id` and `owner_role` `x-source` cite "Decision Register section 4.2"; `source_references` lists "Decision Register 4.2 Registry". But see N-1: the pattern the citation now sits on does not match §4.2. |
| 2 | blocked `missing: []` accepted | **Closed** | M1 rejected (`fewer than minItems 1`); R2 (`missing` absent) rejected. |
| 3 | `default_deny` / `explicit_deny` may allow | **Closed** | F1, F2 rejected (`expected const "deny"`); `explicit_allow` + deny also rejected. |
| 4 | `evaluated_scopes` order contradiction | **Closed** | F3, F4 and a gapped prefix `["platform","workspace"]` rejected by the prefix enum. `freeze_boundary` now separates the expressible order half from the evaluator-only enforcement half, and `untestable_by_fixture` agrees with it. The contradiction I recorded is gone. |
| 5 | no `x-source` on `policy_key`, `decided_at` | **Closed** | Both carry one, each stating a DECLARED INFERENCE. |
| 6 | `lifecycle` labels and `reason` attribution | **Closed** | The `x-source` declares the six labels an inference and re-sources the reason to MR-006. |
| 7 | restore `scope`, declare or drop `dependency` | **Closed** | `missing: ["scope"]` accepted; `["dependency"]` rejected. |
| 8 | semver prerelease/build rejected | **Closed** | `1.0.0-rc.1` and `1.0.0-rc.1+build.5` accepted. |
| 9 | declare `capability_key`, integer `version`, `secret:`, `tenant-data` | **Closed** | Each `x-source` reads DECLARED INFERENCE; the integer version records its tension with DR §5.5 as an unresolved owner decision. |
| 10 | `permissions: []` | **Open, correctly owed** | M2 still accepted. This was a should-fix-before-freeze item, not a blocking one. Both remedies I offered (a `minItems` or an `x-source` sentence) change a Candidate contract's requiredness or stated meaning, and annotations are pinned by `catalog-registry.test.mjs`. Recorded as `open_blockers[11]`(a), owner A0, Candidate change path. I accept that routing. |
| 11 | self-check figure 70/70 vs 85/85 | **Closed** | `author-self-check.md` "Correction round" restates it. |

All five blocking items are closed and measured closed. Of the six should-fix items, five are closed and
one (#10) is recorded with an owner and a route.

### 2.1 The one content change in this PR (Q0 T-7)

I attacked it, as the handoff asks:

- Census at `8c089cc0`: deleting `expires_at` alone from `allOf.3.then.properties.audit.required` flips
  **no** fixture. CTR-FLG-001 has 14 of 23 required members killed by no fixture.
- Census at `e5fa682`: the same deletion flips exactly `invalid-temporary-without-expiry.json`. 13 of 23.
  CTR-MOD-001 is 20 of 31 at both commits. Both figures match the Author's §1 table.
- Mutation in the clone (the obligation reduced to `["owner_role"]`): contract suites exit 1, 77/79, with
  `every fixture agrees with its own shipped schema, not with a hand-written predicate` failing. The
  fixture now kills that mutant. Before this PR, only the constraint-record ratchet would have caught it.
- The fixture stays invalid for exactly one reason (`$.audit: missing required property 'expires_at'`
  when the obligation is intact), keeps its name and its place in the pinned set, and its new
  `owner_role: "A0"` is a valid enum value. Nothing else in the file moved.

The change is correct, minimal, and does what the record says.

### 2.2 Re-run of my original counterexamples

| ID | At `2649401` | At `e5fa682` |
|---|---|---|
| M1 blocked, `missing: []` | accepted (defect) | **rejected** |
| M2 `permissions: []` | accepted | accepted (#10, owed) |
| M3 semver prerelease | rejected (over-strict) | **accepted** |
| M4 ready + activated + `missing: ["health"]` | accepted | accepted (A1 CS-3 / Q0 T-5, owed, `open_blockers[11]`(b)) |
| M5 `MOD-999` | accepted | **rejected**, but see N-1 |
| M6, M8 (MR-002, MR-003) | accepted, declared untestable | unchanged, still declared |
| M7, M10 | rejected | rejected |
| M11-M15 | accepted, not claimed | accepted, not claimed |
| F1, F2, F3, F4 | accepted (defects) | **rejected** |
| F5-F8 | rejected | rejected |
| F9, F10, F12, F13, F15 | accepted, not claimed | accepted; F10 and F12 now recorded as owed (`open_blockers[11]`(e), (f)) |
| F11 `reason_key: "policy....."` | accepted (minor) | **still accepted** (N-5) |
| kill switch, `write_disabled` omitted, `historical_read_allowed: false` | not probed | accepted (A1 CS-4, owed, `open_blockers[11]`(c)) |

## 3. New findings

| ID | Grade | Finding |
|---|---|---|
| N-1 | Medium, recorded condition | **`module_id` does not match the registry it cites.** The pattern is `^MOD-(0[0-9]{2}|1[0-4][0-9])$` and its `x-source` reads "Decision Register section 4.2 Registry (MOD-000..MOD-140)". DR §4.2 lists MOD-000 to MOD-140 in steps of ten **plus MOD-900** (`product-web`, owner A5). Measured: `MOD-900` is **rejected**, while `MOD-005`, `MOD-141` and `MOD-149`, which are in no registry row and outside the stated range, are **accepted**. So the schema refuses a real registered module and admits identifiers the registry does not have, and the `x-source` range matches neither the pattern nor §4.2. This is the residue of my original M5: the correction round fixed the citation and tightened the pattern, but tightened it to the wrong set. The Author's closure table lists `MOD-999 rejected` as the module-id evidence; that is true and does not cover this. Not introduced by this PR (pre-existing at `8c089cc`), and fixing it changes a Candidate contract's accepted values, so it goes the same way as `open_blockers[11]`: A0, Candidate change path. Whether MOD-900 should carry a module manifest at all is the owner's call; either the pattern admits it or the `x-source` says why not. It must be added to `open_blockers` before `integration_verified`. |
| N-2 | Low, recorded | Both contract manifests read `"status": "Candidate"` and `freeze_boundary` opens "Draft only." The same stale sentence is on all five contracts RFC-2026-010 promoted (API, FLG, IDM, MOD, PAG; measured across the catalog). `open_blockers[13]` records the "Draft" wording in the work-package manifest but not in the contract manifests. A text fix on a Candidate manifest, owner A0, catalog-wide; not this PR's to make. |
| N-3 | Low, record | `open_blockers[11]` says "Owner A0, with A1 for (b) and (d)". (b) is CS-3/T-5, the readiness/activation rule, which is neither a secret-handle nor a data-classification question. The closure file's §2 and §5 put A1 on CS-1, CS-2 and CS-5, and CS-1/CS-2 live in `open_blockers[1]`. The manifest probably means "(d)" only, or "(c) and (d)" if A1 wants the kill-switch item. The Author should reconcile the two records so the RFC author knows whom to bring. |
| N-4 | Info | The `x-rule` on the `explicit_deny` and `explicit_allow` branches ends "showed default_deny with effect allow validating", copied from the `default_deny` branch. Accurate history, wrong branch. Annotations are ratchet-pinned; fold it into the Candidate RFC. |
| N-5 | Low, recorded | F11 is unchanged: `reason_key` `^policy\.[a-z_.]+$` accepts `"policy....."`. I graded it minor at `2649401` and did not list it in §8, so no one owed it; it is not in `open_blockers`. It belongs with the CTR-FLG-001 Candidate RFC (a segment-shaped pattern such as `^policy(\.[a-z_]+)+$`). |
| N-6 | Merge blocker (process, not content) | **CI is red on the head.** `bootstrap` run 37379568076 on `e5fa682` failed at "Verify branch scope", exit 73, because `main` moved to `fa102298` (PRs #187, #188) after this branch was cut from `8c089cc`, and the guard diffs the head against the current `main`. I reproduced it locally (exit 73, the same 25 paths, all CON-005 and CON-007 files). Against its own base the scope is clean (exit 0), and `git merge-tree` shows no conflict. The fix is the Author's: merge `origin/main` into the branch, refresh the handoff (its commit last and alone), and let CI re-run. #187 and #188 added two test files (`ctr-evt-001-schema-ref-bounds.test.mjs`, `ctr-job-001-reference-hardening.test.mjs`), so the manifest's "the test count does not move" and the 692 figure will not hold after that merge; the Integration Owner should measure the merged head, not this one. |

**Nothing new is stop-the-line.** No secret, tenant leak, duplicate side effect, migration divergence or
contract mismatch between a live producer and consumer was introduced. The PR changes one invalid
fixture's content and records. N-1 is a contract defect at `main` with no consumer yet, so it is a
recorded condition, not a stop-the-line incident.

## 4. Open items that stay open, and whose they are

Correctly recorded, not this PR's to close, none blocks the merge on content grounds:

- `open_blockers[11]` (a)-(g): C0 #10; A1 CS-3, CS-4, CS-5 `tenant-data`, S-8; Q0 T-3 remainder, T-6.
  Owner A0 (with A1 per N-3), through an RFC on the two Candidate contracts.
- `open_blockers[1]`: A1 CS-1/CS-2, handle syntax owned by CTR-SEC-001 and no `maxLength`. The Author
  records, accurately, that A1's precondition on promotion was not raised when RFC-2026-010 promoted
  CTR-MOD-001. That record is right to make and right not to reopen.
- `open_blockers[12]`: 20 of 31 and 13 of 23 required members isolated by no fixture (my census agrees).
  New fixture names need `FIXTURE_SET` in `catalog-registry.test.mjs`, WP-0A-CON-008's file.
- `open_blockers[3]`, [4], [5], [6]: unchanged evaluator, registry and inheritance items.
- To add: N-1 and N-5, with N-2 and N-4 folded into the same RFC.

The Owner's step-2 application (cross-vendor withdrawal, `/claude/r0_steward` with nothing to transfer,
the Product-reviewer note) matches the disposition rows I read. I measured nothing that contradicts it.
I verified the "nothing pending against `/root/r0_steward`" search myself: the only hits in the package's
manifest, handoff, evidence folder and both contract directories are the sentences recording the search.

## 5. Verdict

**review_approved_with_conditions.**

All five of my blocking findings from `2649401` (#1-#5) are closed and measured closed at this head. The Author
reports that mutations reopening #2, #3 and #4 each turn the contract suites red; I read that and did not
re-run those three. Five of my six should-fix items are closed; #10
is recorded with an owner and a route I accept. The one content change in this PR, the T-7 fixture, is
correct and measured: it turns an expiry obligation no fixture killed into one a fixture kills, and moves
nothing else. The records the PR changes are accurate where I measured them.

Conditions: N-1 (Medium) and N-5 (Low) must be added to `open_blockers` before `integration_verified`;
N-3 must be reconciled; N-2 and N-4 ride with the Candidate RFC. None of them is this PR's to fix in a
schema, because `contract-catalog/**` rules on two Candidate contracts change only through that RFC.

- **Stop-the-line:** no.
- **Does anything block the merge:** yes, one thing, and it is not content: the required `bootstrap` CI is
  red on `e5fa682` (N-6). The Author must merge `origin/main`, refresh the handoff and get a green run on
  the new head. After that, nothing I found blocks the merge. What the merge also needs is not mine to give:
  A1's and Q0's re-checks, the Integration Owner verdict by `/claude/r0_steward` on the merged head, and the
  merge itself under RFC-2026-002 / RFC-2026-025. This PR touches no RFC, `CONTRIBUTING_AGENTS.md`, CI file
  or gate rule, so on my reading it is not a governance PR, and A0's standing delegation can apply once
  every role is clear and CI is green.
- This file is committed after the handoff commit `e5fa682`. Whether the handoff needs a refresh so that
  its commit stays last is the Author's call under the repository's handoff rule; N-6 requires one anyway.

Attested by `/claude/c0_contract_reviewer` against `e5fa682dbff206040d6cd908887bde468eb560e1`.
