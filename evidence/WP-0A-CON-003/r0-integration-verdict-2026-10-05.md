# WP-0A-CON-003: R0 integration verdict on PR #195 at head `e5fa682`

Package: `WP-0A-CON-003`, Module manifest and feature policy contracts. PR:
https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/195, branch
`agent/claude/WP-0A-CON-003-stale-blockers`, head `e5fa682dbff206040d6cd908887bde468eb560e1`, cut from
`main` @ `8c089cc0bf30a234efa61752c6054d670f85a2a8`. `main` is now
`fa102298aa71ef5031c644501a42e50a7eb953b6`. The file name carries 2026-10-05 because the brief assigned it;
the work was done on 2026-10-06.

## 0. What I am

- A subagent of `/claude/a0_atlas`, spawned by A0's workflow script under RFC-2026-024 §3/3-4, acting in
  the role `/claude/r0_steward`. That run is this package's declared Integration Owner
  (`role_assignments.integration_owner_agent_run_id`) and, by item 2 of the Owner's confirmed G0 step 2
  (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` §3 row 2), the successor to
  `/root/r0_steward` for acknowledgements recorded pending against that run.
- The run that spawned me is this package's Author. I record that so the reader can weigh the verdict. I
  did not write any of the PR's content, and I did not write or edit C0's, A1's or Q0's files.
- I do not fix. My only change is this file. It gives an integration verdict and states the
  acknowledgement position (§5). It approves no review, test or security gate, authorises no merge, moves
  no package status and does not move G0. Gate G0 remains Specification Baseline Complete / External
  Verification Pending. Everything here is synthetic.
- This commit is cut at the PR head `e5fa682` on a local branch and is **not pushed**.

## 1. Measured versus read

### Measured (by me, in this run)

A private clone at `…/scratchpad/r0-WP-0A-CON-003/repo`, checked out **on the branch name**
`agent/claude/WP-0A-CON-003-stale-blockers` at `e5fa682`, upstream set to the PR branch, `origin/HEAD` set
to `origin/main` (`fa10229`). On top of `e5fa682` I applied the three role commits as patches, each adding
exactly one file under `evidence/WP-0A-CON-003/`: C0 `12f2527e`
(`c0-contract-reverify-2026-10-05.md`), A1 `fbf0a09e` (`a1-security-reverify-2026-10-05.md`) and Q0
`2acda9e5` (`q0-test-reverify-2026-10-05.md`). Q0's commit is parented on `main` `fa10229`, not on the PR
branch; its single file applied cleanly. I measured two trees:

- **Tree A**: `e5fa682` plus the three role files (the brief's state, without `main`).
- **Tree B**: Tree A with `origin/main` merged in (`git merge`, no conflict), which is the state the
  Author must produce.

Node `v24.20.0`, npm `11.19.0`, `npm ci --ignore-scripts` exit 0 on both trees. No database started by me,
no network beyond `git fetch` and `gh`.

| Command | Tree | Exit | Result |
|---|---|---|---|
| `gh pr view 195` | n/a | 0 | `OPEN`, Draft, `MERGEABLE`, `mergeStateStatus` **BEHIND**, `headRefOid` `e5fa682…` |
| `gh run view 37379568076` | n/a | 0 | `bootstrap` on `e5fa682`: **failure**. Toolchain, clean install, integrity guard and bootstrap validation succeeded; **Verify branch scope failed**; Database foundation and the negative control were **skipped** |
| `git log origin/main..e5fa682` / `e5fa682..origin/main` | n/a | 0 | 2 branch commits (`9931f91`, `e5fa682`); `main` is 31 commits ahead (PRs #187, #188). The head does **not** contain `main` |
| `npm run check` | A | 0 | `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0` |
| `npm run check:handoff` | A | 0 | `describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs 8c089cc0 WP-0A-CON-003` | A | 0 | `all 7 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-003` | A | **73** | 25 paths it neither owns nor amends, all from #187 and #188 (reproduces CI) |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-003.json` | A | 0 | four distinct role ids |
| `node scripts/validate-work-package-ownership.mjs work-packages` | A | 0 | clean |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | A | 0 | 6/6 |
| `git merge origin/main` | B | 0 | no conflict; `git merge-base origin/main HEAD` = `fa10229` |
| `git diff --name-only origin/main HEAD` | B | 0 | 7 paths, all in `writable_paths` (listed below) |
| `npm run check` | B | 0 | `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-003` | B | 0 | `all 7 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | B | **91** | `cites base 8c089cc, which is not on this branch's side of its branch point fa10229 (origin/main)… Run npm run refresh:handoff` (expected; the Author's refresh) |
| `git diff --stat 8c089cc0 origin/main -- test-kits` | n/a | 0 | #187/#188 **modified** two existing test files and the integrity manifest; they added none, which is why the count stays 692 (C0 N-6 expected it to move) |
| `grep` for `x-amended-by` in `ctr-mod-001`/`ctr-flg-001` `schema.json`; for `root/r0_steward` in the manifest, handoff, evidence folder and both contract directories | B | 0 | no `x-amended-by` record; the only `/root/r0_steward` hits are the sentences recording that nothing is pending (§5) |
| `probe.mjs` (8 in-memory documents, shipped `valid-` fixture plus one change, repository `validate()`) | B | 0 | `MOD-900` REJECT, `MOD-141` ACCEPT, `MOD-005` ACCEPT (C0 N-1); `business` decided with `evaluated_scopes: ["platform"]` ACCEPT (Q0 Q-2); 407-char handle ACCEPT (A1 CS-2); `tenant-data` with `tenant_scoped: false` and no retention ACCEPT (A1 N2, CS-5); `reason_key: "policy....."` ACCEPT (C0 N-5); `invalid-temporary-without-expiry.json` rejected for `expires_at` alone (T-7) |

Changed paths on Tree B against `main` (`git diff --name-only origin/main HEAD`):

```
contract-catalog/shared-kernel/ctr-flg-001/examples/invalid-temporary-without-expiry.json   own output, one key added
evidence/WP-0A-CON-003/a1-security-reverify-2026-10-05.md                                    role file
evidence/WP-0A-CON-003/author-conditions-closure-2026-10-06.md                              Author record
evidence/WP-0A-CON-003/c0-contract-reverify-2026-10-05.md                                    role file
evidence/WP-0A-CON-003/q0-test-reverify-2026-10-05.md                                        role file
handoffs/WP-0A-CON-003-author-handoff.json
work-packages/WP-0A-CON-003.json
```

No schema, contract manifest, `contract-catalog/shared-kernel/index.json`, test file, script, CI file,
lockfile, `package.json`, RFC, `CONTRIBUTING_AGENTS.md`, `db/` or `migrations/` path changes. No
cross-package amendment is used (`amends_without_owning.paths` is empty, and the scope guard agrees).

### Read, not measured

- The three role files in full. I re-ran none of their mutation campaigns or required-member censuses; my
  eight probes re-measure only the findings that decide what the Author must record.
- RFC-2026-025 §5 items 2 and 6; the Owner's step-2 disposition rows 1-3 as cited by the manifest.

## 2. Role verdicts at `e5fa682`

| Role | Run | Commit | Verdict | Stop-the-line | Blocks merge |
|---|---|---|---|---|---|
| Reviewer (C0) | `/claude/c0_contract_reviewer` | `12f2527e` | `review_approved_with_conditions` | no | **yes** (N-6, CI red) |
| Security (A1) | `/claude/a1_bastion` | `fbf0a09e` | `security_approved_with_conditions` | no | no |
| Tester (Q0) | `/claude/q0_sentinel` | `2acda9e5` | `test_verified_with_conditions` | no | **yes** (Q-1, CI red) |

C0 N-6 and Q0 Q-1 are the same blocker: the head does not contain `main`, so the required check fails at
the scope step. It is process, not content: Tree B shows the merge is clean and the guards pass.

Conditions the roles placed **on this PR** (records the Author can and must make, all inside
`writable_paths`):

| Item | Raised by | Grade | What must be on the branch |
|---|---|---|---|
| C0 N-1 | C0 | Medium | `module_id` pattern rejects `MOD-900` (DR §4.2, `product-web`, A5) and admits `MOD-005`, `MOD-141`, `MOD-149`; the `x-source` range matches neither. Measured (§1). Added to `open_blockers`, owner A0, Candidate change path. C0: "before `integration_verified`". |
| C0 N-5 | C0 | Low | `reason_key` admits `policy.....`. Measured. Added to `open_blockers` with N-1. C0: "before `integration_verified`". |
| C0 N-3 | C0 | Low | `open_blockers[11]` says "A1 for (b) and (d)"; the closure record puts A1 on CS-1, CS-2, CS-5. Reconcile the two. |
| Q0 Q-2 | Q0 | Low-Medium | F8 (deciding scope absent from `evaluated_scopes`) still validates, measured; recorded nowhere, and the closure record calls C-4/T-4 "Closed at main". Add `open_blockers[11]`(h) and change that row to "Mostly closed". |
| A1 N2, N3, N4 | A1 | Medium, Low, Low | A1: "N2 to N4 should be added to `open_blockers[11]` by the Author". Measured N2 (§1). |

Conditions **not** on this PR, correctly owned elsewhere: A1 CS-1/CS-2/N1 (`open_blockers[1]`, A0 + A1 by
RFC; blocking on **freeze**, not on merge), CS-3, CS-4, CS-5 `tenant-data`, S-8 and C0 #10, Q0 T-3, T-6
(`open_blockers[11]`(a)-(g)); Q0 Q-3 (no ratchet for single-obligation fixtures, owed by A0); Q0 Q-4 and the
nested-requiredness remainder (`open_blockers[12]`, fixture names pinned by WP-0A-CON-008); C0 N-2 and N-4
(fold into the Candidate RFC); A1 C1 (WP-0A-A0-003). None is made worse by this PR; the one content change
(T-7) is measured correct by C0, A1, Q0 and me.

## 3. The integration questions

| Question | Answer |
|---|---|
| Head contains current `main`? | **No.** `e5fa682` is two merges behind (`fa10229`). Tree B shows the merge is clean. |
| Required CI green on the head? | **No.** Run `37379568076` failed at Verify branch scope (exit 73); Database foundation never ran. |
| Every role verdict non-blocking? | **No.** C0 and Q0 block, both on the CI/`main` item only. A1 does not block. |
| Gate `author_complete` | Satisfied at `e5fa682` (`check:handoff` exit 0). After the `main` merge the handoff is stale (exit 91 on Tree B) and must be refreshed. |
| Gate `review_approved` | Satisfied **with conditions** (C0); N-1, N-5 are conditions before `integration_verified`, N-3 a reconciliation. |
| Gate `security_approved` | Satisfied **with conditions** (A1); its on-PR request is recording N2-N4. |
| Gate `test_verified` | Satisfied **with conditions** (Q0); Q-2 is a records correction on this PR. |
| Gate `integration_verified` | **Not given at this head.** See §6. |
| Changed paths declared? | Yes against its own base and on Tree B (exit 0, 7 paths). No against current `main` until merged (exit 73). |
| Anything protected changed? | **No.** One own fixture gains one key; the rest are records. |
| Stop-the-line? | **None.** No role raised one; no secret, tenant path, migration, job, side effect or contract meaning is touched; `scan:secrets` passed inside `npm run check` on both trees. |

## 4. Integration Owner findings

- **R1 (blocks): the head does not contain `main`, and CI is red.** As C0 N-6 and Q0 Q-1. RFC-2026-025 §5
  item 6 requires the head to contain current `main` for a delegated merge, and RFC-2026-002 requires a
  green required run on the exact head. Remedy: merge `origin/main`, refresh the handoff, green
  `bootstrap` including Database foundation.
- **R2 (blocks `integration_verified`): the record conditions are not yet on the branch.** C0 N-1, N-5, N-3;
  Q0 Q-2; A1 N2-N4 (§2). Each edits only `work-packages/WP-0A-CON-003.json` and
  `evidence/WP-0A-CON-003/author-conditions-closure-2026-10-06.md`. None changes a schema. I will not give
  `integration_verified` on a promise of records I have not read.
- **R3 (re-verification scope after R1 and R2).** Under RFC-2026-025 §5 item 2, the follow-up commit is a
  fix commit answering role findings. It touches no migration, script, case or fixture, so it is
  re-verified **by the role run whose finding it answers**: C0 for N-1, N-5, N-3; Q0 for Q-2; A1 for
  N2-N4. A light re-check each (the entry exists and says what the finding said) is enough. The `main`
  merge brings only `main`'s own content (Tree B: the branch's diff against `main` is the 7 paths above),
  so it needs no content re-review beyond CI.
- **R4 (merge path).** This PR changes no RFC, `CONTRIBUTING_AGENTS.md`, CI file or gate rule, so it is not
  a governance PR, and A0's standing delegation can apply once §6 holds. On RFC-2026-025 §5 item 6 "no
  unresolved security finding of any grade is open against the PR": A1 states that every open item predates
  this PR, is no worse at this head and is routed to the Candidate RFC, and that nothing blocks the merge
  from Security. My reading is that those items are open against the two Candidate contracts, not against
  this PR, **once they are recorded** with owner and route; until A1 N2-N4 are on the branch, A1's on-PR
  request is unresolved and the delegation does not apply. A0 must record this reading in the merge
  disposition; if A0 or the Owner reads the clause more strictly, the Owner merges personally.
- **R5 (Info).** C0 N-6 said the test count would move after the `main` merge. Measured: it does not (692 on
  Tree B), because #187 and #188 modified existing test files rather than adding them. The handoff's "the
  test count does not move" stays true; `evidence/VERIFICATION.md` (692) needs no change.
- **R6 (Info).** Q0's commit `2acda9e5` is parented on `main`, not on the PR branch. It applies cleanly as a
  one-file patch; cherry-pick it like the others.

## 5. Acknowledgements

- **Job-reference change: none pending for this package, so none given.** The job-reference change is
  WP-0A-CON-005's amendment to CTR-JOB-001 (RFC-2026-006, `ctr-job-001/schema.json` `x-amended-by[1]`).
  It belongs to WP-0A-CON-005 and to CTR-JOB-001's owner WP-0A-CON-001, and `/claude/r0_steward`
  acknowledged it in `evidence/WP-0A-CON-005/r0-integration-verdict-2026-10-05.md` §5.1. This package
  neither consumes CTR-JOB-001 (`contracts_consumed`: CTR-TEN-001, CTR-ERR-001) nor amends it, its own two
  schemas carry no `x-amended-by` record, and the only `/root/r0_steward` hits on its paths are the
  sentences recording that nothing is pending (measured, §1). The manifest's
  `required_human_authorities[1]` is accurate: the successor naming transfers nothing here.
- **No other acknowledgement is asked of me.** This increment uses no cross-package amendment.

## 6. Verdict

**integration_conditional.** WP-0A-CON-003 is **not** `integration_verified` at `e5fa682`, and it cannot move
there on "role files on the branch and CI green" alone: the head must first contain `main`, and C0's and
Q0's on-PR conditions require record edits that have to be on the branch and re-checked.

It **can** move to `integration_verified` when all of the following hold on one head of
`agent/claude/WP-0A-CON-003-stale-blockers`:

1. The head contains current `main`.
2. The three role files and this file are on the branch.
3. `open_blockers` records C0 N-1 and N-5 and A1 N2-N4, and `open_blockers[11]`(h) records Q0's F8, each
   with owner A0 (with A1 where A1 asks) and the Candidate change path; N-3 is reconciled; the closure
   record's C-4/T-4 row reads "Mostly closed".
4. C0, Q0 and A1 have each confirmed, at that head, that the item answering their finding says what it
   should (RFC-2026-025 §5 item 2).
5. The required `bootstrap` run is green on that exact head, including Database foundation.
6. `/claude/r0_steward` confirms 1-5 at that head in a short confirmation file. The measurement on Tree B
   says nothing else stands in the way.

- **Stop-the-line:** none.
- **Blocks the merge:** yes, until 1-6 hold. Nothing in the PR's content blocks it.

### What A0 must do before merge

1. Cherry-pick the four evidence commits (C0 `12f2527e`, A1 `fbf0a09e`, Q0 `2acda9e5`, this one) onto the
   PR branch, and merge `origin/main`.
2. In one fix commit, add C0 N-1, C0 N-5, A1 N2, N3, N4 and Q0 F8 (`open_blockers[11]`(h)) to the manifest,
   reconcile N-3, and correct the closure record's C-4/T-4 row. Do not reword or remove any existing entry
   except to add these.
3. `npm run refresh:handoff` and commit the handoff last and alone; `npm run check:handoff` exit 0 on the
   branch name.
4. Push, get `bootstrap` green on the exact head, and ask C0, Q0 and A1 for their light re-checks (R3), then
   `/claude/r0_steward` for the confirmation (§6 item 6).
5. Record `integration_verified` in `work-packages/WP-0A-CON-003.json` only after that confirmation, citing
   it, and close `open_blockers[10]` in place with pointers to the four role files and the confirmation.
6. Merge under the standing delegation only if A0 records the R4 reading of RFC-2026-025 §5 item 6 in the
   disposition; otherwise hand the merge to the Product Owner.

### Owed after merge (not conditions on this PR)

7. The Candidate RFC on CTR-MOD-001 and CTR-FLG-001 (A0, with A1): `open_blockers[1]` and `[11]`(a)-(h),
   C0 N-1, N-5, N-2, N-4, A1 N1-N4.
8. Q0 Q-3, a single-obligation ratchet for `invalid-` fixtures (A0).
9. The new fixture names for `open_blockers[12]`, through WP-0A-CON-008's `FIXTURE_SET`.

Attested by `/claude/r0_steward` against `e5fa682dbff206040d6cd908887bde468eb560e1`, with the role commits
`12f2527e`, `fbf0a09e` and `2acda9e5` applied on top, and against the same tree merged with `main`
`fa102298aa71ef5031c644501a42e50a7eb953b6`.
