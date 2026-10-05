# WP-0A-CON-007: C0 re-verification at the PR #188 head

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/188, branch
`agent/claude/WP-0A-CON-007-reference-bounds`, head `113e4f3950b917b6ed24410cbe52d429247c7e0e`,
base `main @ 8c089cc0bf30a234efa61752c6054d670f85a2a8` (confirmed with `git ls-remote` as the current
`main` and an ancestor of the head). Seven changed paths: the bounds test, RFC-2026-009, the manifest,
the handoff, the integrity manifest (two digests), `author-self-check.md`, and the new
`author-conditions-closure-2026-10-06.md`. No file under `contract-catalog/**` changed.

Earlier verdict re-checked: `evidence/WP-0A-CON-007/review-contract-c0.md`, my role's verdict on
`main @ 03c584b`, **changes_required** on F1, F2 and F4, with F3, F5 to F9, blocker 1's sequencing and
the cross-vendor exception carried as recorded conditions.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Reviewer
run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor and a
parent with the Author. I did not write any of this PR's content and I fix nothing in it. This file is
Reviewer evidence only: it approves no gate, authorises no merge, moves no package status and
countersigns no acknowledgement. Gate G0 remains Specification Baseline Complete / External
Verification Pending; everything here is synthetic. No provider, credential or database was touched.

## 1. Measured versus read

**Measured** (I ran it and the output is below or summarised with its exit code):

- Toolchain: `node --version` `v24.20.0`, `npm --version` `11.19.0`
  (`/Users/bank/.local/node-v24.20.0/bin`).
- A private clone at
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/c0-WP-0A-CON-007/repo`,
  checked out **by branch name** (`git checkout -B agent/claude/WP-0A-CON-007-reference-bounds 113e4f3`;
  `git branch --show-current` printed the name), so the branch-reading guards ran on the branch and not
  on a detached HEAD.
- `npm run check`: exit 0, `tests 692, pass 692, fail 0, skipped 0, todo 0`. This includes
  `verify:coverage-floor`, `verify-toolchain`, `scan:secrets`, `validate:protocol` and the suite runner.
- Package evidence commands:
  - `node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`: tests 8, pass 8, fail 0.
  - `node --test test-kits/contracts/schema-mutation-coverage.test.mjs`: tests 10, pass 10, fail 0.
- `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-007-reference-bounds`: printed
  `WP-0A-CON-007`, exit 0.
- `node scripts/verify-branch-scope.mjs 8c089cc0bf30a234efa61752c6054d670f85a2a8 WP-0A-CON-007`:
  `all 7 changed path(s) are declared, and every amendment explains one`, exit 0.
- `node scripts/refresh-author-handoff.mjs --check`: `describes the branch: nothing substantive after its
  cited head`, exit 0.
- 37 mutants plus a control on a disposable copy of `contract-catalog/shared-kernel` and
  `test-kits/contracts` (§3), and two on a full disposable copy for the mutation-coverage suite.
- The RFC's record-correction figures, re-measured with my own script over the head and over the
  pre-fix blob `653f699^` (§4).

**Read, not measured**: the manifest and handoff diffs; the Owner's step-2 disposition
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (on `main`); the Author's
closure file; PR #188's state through `gh pr view` (Draft, open, `MERGEABLE`; the `bootstrap` CI job on
this head was **IN_PROGRESS** when I wrote this, so I did not see it green).

The repository tree was not mutated by any probe. My only change is this file.

## 2. My earlier conditions, one by one

| Earlier | Grade then | Now | Evidence |
|---|---|---|---|
| F1: nothing guards the `^` anchor | Medium, blocking | **Closed** | `HOSTILE_AROUND_A_GOOD_NAME` adds `file:///`, `javascript:` and `../../` prefixed to a well-formed name. Mutant M6 (`^` removed) is killed. So is N2, a pattern that admits an optional `file:///` prefix while keeping both anchors. |
| F2: `schema_ref`'s bound drifts unseen from 18 to 79 | Medium, blocking | **Closed** | `AT_THE_BOUND` (32) must be accepted, `ONE_PAST_THE_BOUND` (33) rejected, and the 33 is asserted to satisfy the shape without the bound. Mutants 17, 18, 24, 31, 33, 79 and 100000 are all killed. |
| F4: the ratchet opens four contracts, not fourteen | Medium, blocking | **Closed** | `catalogSchemas()` walks the catalog. A gap in a `BOUNDED_CONTRACTS` contract fails; a gap elsewhere fails unless it is in `KNOWN_UNBOUNDED`; a listed entry that is no longer a gap fails. Cases A to D from my earlier §3 are now all killed, including A (a fifteenth contract) and B (a new field in `ctr-aud-001`), which were green before. |
| F3: letter class can widen | Low | **Closed** | `CTR-evt-001@1.0.0` added; M8 killed. |
| F5: residual list names 23 of 49 | Medium, recorded | **Closed** | RFC-2026-009 R-4 lists 49 by owning package. My count at this head: 14 contracts, 76 reference-shaped fields, 49 unbounded, per contract aud 4, err 2, flg 4, mod 4, ntf 4, obs 10, sec 8, ten 7, usg 6. The table and `KNOWN_UNBOUNDED` match it exactly, or the ratchet would be red. |
| F6: "51 characters" | Low | **Closed** | R-1 says 85, then 81 and 77 (all `ctr-usg-001` `dedupe_key`), and 48 for `*_ref`. I measured the same four values and files. |
| F7: four / five / thirteen contracts | Low | **Closed** | R-4's last paragraph reconciles them. The test's title still says "in the contracts this package touches" (§5 N-2). |
| F8: self-check says no assertion reads a `pattern` | Low | **Closed** | A dated correction is appended, not rewritten into the original row. Its replacement sentence ("no assertion compares a `pattern` string to an expected value") is true of the file at this head. |
| F9: nullable and array branches untested | Low | **Closed** | A synthetic fragment covers both. Mutants T1 (array branch removed) and T2 (nullable branch removed) are killed. |
| Blocker 1 sequencing | Integration Owner's | **Correctly recorded, still open** | `required_human_authorities[0]` states the merge at 13:35 preceded the approval at 16:21 and leaves it to the Integration Owner. `open_blockers[0]` reads RESOLVED only for the Proposed/Approved status, which is accurate. |
| Cross-vendor exception not waived by my review | Recorded | **Superseded by an Owner act** | `prefer_cross_vendor_review` is now `false`, citing step 2 item 1 of the disposition, whose Owner reply is `บืนยันขั้น 2` (verbatim, typo included). The record of the earlier exception is kept in the field's text. See §5 N-3 on one wording point. |

All three blocking findings are closed, and every recorded finding of mine is closed or correctly
handed to its owner.

## 3. Mutation run at the head

Disposable copy, the package's own guard (`ctr-evt-001-schema-ref-bounds.test.mjs`) as the oracle.

```
CONTROL (no mutation)                                            GREEN  (control ok)
M1  delete schema_ref.maxLength                                  killed
M2  maxLength 32->17                                             killed
M3  maxLength 32->79                                             killed   (survived at 03c584b)
M3b maxLength 32->33                                             killed
M3c maxLength 32->31                                             killed
M3d maxLength 32->24                                             killed
M3e maxLength 32->18                                             killed
M4  maxLength 32->100000                                         killed
M5  delete pattern                                               killed
M6  pattern loses ^                                              killed   (survived at 03c584b)
M7  pattern loses $                                              killed
M8  [A-Z]{3} -> [A-Za-z]{3}                                      killed   (survived at 03c584b)
M9  semver -> [0-9]+                                             killed
M10 pattern ^[\s\S]*$                                            killed
M11 delete event_id.maxLength                                    killed
M12 event_id.maxLength 128->1                                    killed
M13 delete correlation_id.maxLength                              killed
M14 delete producer.module_key.maxLength                         killed
M15 delete subject.id.maxLength                                  killed
M16 delete idempotency_key.maxLength                             killed
N1  pattern also admits https URLs (alternation)                 killed
N2  pattern admits an optional file:/// prefix, anchors kept     killed
N3  event_id.maxLength 128->1000000                              GREEN    (see §5 N-1)
N4  correlation_id.maxLength 128->1000000                        GREEN    (see §5 N-1)
A   a fifteenth contract with an unbounded exfil_ref             killed   (green at 03c584b)
B   new unbounded exfil_ref in ctr-aud-001                       killed   (green at 03c584b)
B2  new unbounded exfil_ref in ctr-ten-001                       killed
C   ctr-aud-001 before_ref loses maxLength                       killed
D   new unbounded exfil_ref in ctr-evt-001                       killed
E   owner bounds ctr-ten-001.workspace_id (list goes stale)      killed
F   new unbounded nullable ref in ctr-usg-001                    killed
G   new ref array in ctr-obs-001, items bounded, no maxItems     killed
H   catalog emptied                                              killed
T1  test text: stringBearer array branch removed                 killed
T2  test text: isStringSchema nullable branch removed            killed
T3  test text: a fictitious KNOWN_UNBOUNDED entry added          killed
T4  test text: HOSTILE_AROUND_A_GOOD_NAME emptied                GREEN    (expected: schema unchanged)
```

T4 deletes test cases while leaving the schema correct, so a green run is the right answer. Test text is
held by the integrity manifest's digest of this file, which `verify:coverage-floor` enforces.

N3 and N4 against the catalog-wide mutation-coverage suite, on a full disposable copy:

```
N3 event_id       -> schema-mutation-coverage.test.mjs: red  "constraint value(s) changed without being recorded"
N3 event_id       -> ctr-evt-001-schema-ref-bounds.test.mjs: GREEN
N4 correlation_id -> schema-mutation-coverage.test.mjs: red  (same message)
N4 correlation_id -> ctr-evt-001-schema-ref-bounds.test.mjs: GREEN
```

## 4. RFC-2026-009 record corrections, checked

The decision is unchanged: `schema_ref` is still a contract id and semantic version with `maxLength` 32,
and no bound in the four contracts moved. No contract file changed in this PR. The corrections:

- **R-1** (85, 81, 77; 48 for `*_ref`): measured, exact.
- **R-2** (256 is load-bearing): the three migrations hold the CHECK constraints it names, read at the
  head: `050_async_kernel.sql:531` and `:535` (`input_ref`, `result_ref`), `140_audit.sql:474` and
  `:478` (`change_before_ref`, `change_after_ref`), `110_meta_connector.sql:693` (`body_ref`), each
  `length(...) <= 256`. The four contracts' `manifest.json` each say `"owner": "A0"`. The quoted
  2026-09-28 instruction is cited from RFC-2026-025's status line; I did not re-trace it to the
  transcript. R-2 says plainly that the bounds are A0's decision and not the Product Owner's, and that
  the Owner sees it when he merges. That is the honest framing.
- **R-3** (the neighbours accepted 16 of 16, not 4): measured against `653f699^`. `event_id`,
  `correlation_id`, `causation_id`, `idempotency_key`, `producer.module_key`,
  `producer.implementation_version`, `subject.type` and `subject.id` each accept 16/16 and the
  100 000-character value. `event_type` accepts 0/16 and rejects it. Exact.
- **R-4**: matches my count (§2, F5).
- **R-5**: the 16-digit run follows from the arithmetic (32 − 12 for `CTR-EVT-001@` − 4 for `.0.0`).
- **R-6**: hostile form 13 is 26 characters. Exact.
- **R-7**: matches the test file I read and the mutants I ran.

Every corrected sentence above the new section is marked in place with a pointer to its correction. No
sentence was silently rewritten. This edits an Approved RFC, so it is a governance PR, and the record
says so in the RFC, the manifest and the closure file.

## 5. New findings at this head

| ID | Grade | Finding |
|---|---|---|
| N-1 | Low, recorded | The ratchet pins bound **presence** catalog-wide but bound **value** only for `schema_ref` and the seven `REFERENCE_FIELDS`. Raising `event_id` or `correlation_id` from 128 to 1 000 000 leaves the package's own guard green (N3, N4). The catalog-wide `schema-mutation-coverage.test.mjs` does go red, but its message is "changed without being recorded", not "weaker", which is the same limit I recorded at `03c584b` for F1. Not blocking: a raise has to pass a red suite and an edit of the surface record, both reviewer-visible, and R-2 records that raising a 256 bound would break the database CHECKs. Pinning the six envelope ids as behaviour (128 accepted, 129 rejected) would remove the dependence. That is a choice for CTR-EVT-001's owner before freeze. |
| N-2 | Low, recorded | The test still reads `every reference-shaped field in the contracts this package touches carries an upper bound`, but it now walks all fourteen contracts and accepts 49 known gaps, four of them in `ctr-aud-001`, which this package edited. The title overstates what it asserts. The Author kept all eight names so that the test-name digest in `scripts/test-suite-contract.mjs` does not move (R-7). That is a reasonable trade, and the body comments describe the real behaviour. A rename belongs with the next change to that digest. |
| N-3 | Info | The manifest's `cross_vendor_exception` says WP-0A-CON-007 "is one of those 15". The Owner's words name "all 15 work packages" without listing them. Which fifteen is A0's mapping, as disposition §3 row 1 says ("Which 15 packages is A0's mapping, from the survey"). The manifest cites that row, so the mapping can be traced, but the sentence reads as if the Owner named the package. Not blocking, because the disposition is on `main` and its §3 makes the mapping explicit. |
| N-4 | Info | `CATALOG_CONTRACT_FLOOR` (14) and `CATALOG_REFERENCE_FIELD_FLOOR` (76) equal today's exact counts. An owner who legitimately removes a contract or a reference field will have to lower a floor in this file. That is the intended ratchet cost, not a defect. |

**Nothing new blocks.** No finding is stop-the-line. No secret, tenant leak, contract mismatch or
migration divergence was introduced: the PR changes no contract, no migration and no runtime path.

## 6. Open items that stay open, and whose they are

These are correctly recorded in `open_blockers` and are not this package's to close. None blocks the
merge of PR #188:

- the wrong `x-bound-note` on eight fields of `ctr-evt-001/schema.json` (R-3), owed by WP-0A-CON-001,
  because `contract-catalog/**` is read-only here;
- the 49 unbounded fields, by owning package (R-4);
- the four bare strings on CTR-JOB-001, escalated as `required_before_freeze` (R-5);
- A1's suggestion of 24 for `schema_ref` (R-2), with CTR-EVT-001's owner;
- the cross-validator conformance test for `format` and anchor semantics (R-5), deferred;
- blocker 1's sequencing, for the Integration Owner;
- the assertion floor of 11 in `scripts/test-suite-contract.mjs`. A floor below the count still holds,
  and `scripts/` is not this package's path.

## 7. Verdict

**review_approved_with_conditions.**

My three blocking findings (F1, F2, F4) are closed and measured closed: every mutant that survived at
`03c584b` is now killed by the package's own guard, and the ratchet sees the whole catalog. My recorded
findings F3 and F5 to F9 are closed. The RFC's record corrections are accurate where I measured them,
and they do not change the decision. The conditions are N-1 and N-2 (Low) and the owners' items in §6.
All of them are recorded and none of them is this package's to fix in this PR.

- **Stop-the-line:** no.
- **Does anything I found block the merge:** no. What the merge still needs is not mine to give: A1's
  and Q0's re-checks at this head, the Integration Owner verdict by `/claude/r0_steward`, a green
  `bootstrap` CI run on this head (in progress when I looked), and the Product Owner's personal merge,
  because this PR edits RFC-2026-009 (RFC-2026-025 §5 item 6). A0 must not merge it under the standing
  delegation.
- This file is committed after the handoff commit `113e4f3`. Whether the handoff needs a refresh so that
  its commit stays last is the Author's call under the repository's handoff rule.

Attested by `/claude/c0_contract_reviewer` against `113e4f3950b917b6ed24410cbe52d429247c7e0e`.
