# R0 integration confirmation: WP-0A-CON-005 (PR #187) at head `edbb6ae`

Date: 2026-10-06. Package: `WP-0A-CON-005`, CTR-JOB-001 reference-field hardening. PR: #187, branch
`agent/claude/WP-0A-CON-005-job-reference-hardening`, head `edbb6ae607daf6ceb33939423a6b4b9d1fecdd1e`
(fast-forward from `e7d5e6e`, no force), current `main` `e1fa28ec0232ccbb4dadb5faa079df5b1579b469` (#186).
Earlier verdict: `evidence/WP-0A-CON-005/r0-integration-verdict-2026-10-05.md` (on the branch as `2d11873`).

## 0. What I am

- `/claude/r0_steward`, Integration Owner, a subagent spawned by a workflow script of `/claude/a0_atlas`
  under RFC-2026-024. A0 is this package's Author; I record that so the reader can weigh this file.
- I do not fix. I edited no file of the PR. This file is my only output. It is an integration
  confirmation of the steps in my verdict §7, nothing else: not the review, not the test, not
  security, not the merge, not Gate G0.
- This commit is cut on a fresh local branch from `edbb6ae` and is **not pushed**.

## 1. Measured vs read

### Measured (by me, in this run)

Private clone, checked out **on the branch name** `agent/claude/WP-0A-CON-005-job-reference-hardening`
at `edbb6ae` (not detached). Node `v24.20.0`, npm `11.19.0`, `.node-version` `24.20.0`.

| Command | Exit | Result |
|---|---|---|
| `git merge-base --is-ancestor origin/main HEAD` | 0 | head **contains** `main` `e1fa28e` |
| `git log --first-parent e7d5e6e..edbb6ae` | 0 | `049f833` C0, `ddc57b9` A1, `6d515b0` Q0, `2d11873` R0, `cf39be3` increment, `edbb6ae` merge of `e1fa28e` |
| `git diff-tree` of each pick vs its original | 0 | blob-identical: `2d5a6da`=`049f833` (`df2847f`), `3f63ac0`=`ddc57b9` (`e08f760`), `b82019d`=`6d515b0` (`85162a8`), `a69435d`=`2d11873` (`065a6f3`); each `-x` trailer present; each original's parent is `e7d5e6e` |
| `git diff --name-status origin/main...HEAD` | 0 | **11** paths: the 7 package paths of my verdict §1, plus the four role files |
| `git diff --name-only origin/main HEAD -- contract-catalog .github scripts package.json package-lock.json CONTRIBUTING_AGENTS.md AGENTS.md CLAUDE.md docs db` | 0 | **empty** |
| `git diff e7d5e6e edbb6ae -- test-kits/integrity-manifest.json` | 0 | exactly two digests move: RFC-2026-006 and `ctr-job-001-reference-hardening.test.mjs` |
| `npm ci --ignore-scripts` | 0 | |
| `npm run check` | **1** | `tests 691, pass 689, fail 2`; the two are the handoff guard and its ratchet (below) |
| `npm run check:handoff` | **91** | handoff cites base `600b48b` (not on this branch's side of `e1fa28e`) and head `efbaf70`, after which `cf39be3` changed 3 substantive paths |
| `node scripts/verify-branch-identity.mjs <branch>` | 0 | `WP-0A-CON-005` |
| `node scripts/verify-branch-scope.mjs e1fa28e WP-0A-CON-005` | 0 | "all 11 changed path(s) are declared, and every amendment explains one" |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-005.json` | 0 | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 | |
| `node scripts/verify-test-coverage-floor.mjs` | 0 | |
| `node --test` on `ctr-job-001-reference-hardening`, `shared-kernel-contract-catalog`, `shared-kernel-schema-conformance` | 0, 0, 0 | 6/6, 6/6, 6/6 |
| `gh pr view 187` | 0 | Draft, `MERGEABLE`, `mergeStateStatus` **BLOCKED**, head `edbb6ae` |
| `gh run view 37349359495` | 0 | head `edbb6ae`: **failure**; failed step `Validate repository bootstrap` (the same handoff-guard assertion); `Verify branch scope`, `Database foundation` and the negative control **skipped** |

The two red tests on the branch name, verbatim heads:

```
✖ the handoff for this branch describes this branch
  WP-0A-CON-005's handoff cites head efbaf70, after which 3 substantive path(s) changed:
    architecture/decisions/RFC-2026-006-job-reference-hardening.md
    test-kits/contracts/ctr-job-001-reference-hardening.test.mjs
    work-packages/WP-0A-CON-005.json
✖ the handoff ratchet fails when an author handoff claims another role approved something
  (its "suite must pass on an unmodified copy" precondition fails on the same guard)
```

This is the expected state of a head whose handoff has not yet been refreshed: the guard does what it
is for. **The suite does not pass on the branch name at `edbb6ae`.**

**Simulated refresh** (same private clone, on the branch name, local commit, discarded with
`git reset --hard edbb6ae` afterwards, never pushed):

| Command | Exit | Result |
|---|---|---|
| `npm run refresh:handoff` | 0 | handoff now cites `e1fa28e..edbb6ae`, 5 added, 6 modified, 0 deleted; base moved from `600b48b` to the branch point |
| `npm run check` (after committing that one file) | 0 | `tests 691, pass 691, fail 0` |
| `npm run check:handoff` | 0 | |
| `node scripts/verify-branch-scope.mjs e1fa28e WP-0A-CON-005` | 0 | 11 paths |

So a refresh made last and alone turns the branch green, measured. The real refresh must be made after
every role file is on the branch (§4), or it goes stale again.

**Content of `cf39be3`, checked against the tree:**

- **C5 / R2.** Leaf diff `64d9c65^ → 64d9c65` (script over every JSON leaf) on `ctr-api-001` and
  `ctr-idm-001`: exactly `pattern` and `x-reference-rule` change on `accepted.status_ref`,
  `accepted.deep_link_ref` and `result_ref`; each new `x-reference-rule` is the old one as a prefix plus
  the two appended sentences. The sentences quoted in `authorized_cross_package_amendments[7]` and in
  RFC-2026-006's "Scope explicitly excluded" paragraph match that appended text word for word (the RFC
  only re-wraps lines). "NOTHING ELSE" is gone from `[7]` and `[8]`; dated correction notes say what was
  omitted; a corrections-table row is added. The record now says what the tree contains.
- **R5.** `cbbc6cb` is on `main` and is the commit that added `db/foundation/migrations/050_async_kernel.sql`;
  lines 529-535 carry `jobs_input_ref_form` / `jobs_result_ref_form` with the lookahead-free pattern and
  `length(...) <= 256`. `rollback_or_forward_fix` now says a revert alone is unsafe and the rollback is a
  forward fix or a revert paired with a reviewed forward migration on the database package's path. The
  RFC's approved Rollback paragraph is unchanged; a dated note follows it.
- **R7.** `open_blockers[2]` and `[14]` keep their text and gain dated "STALE" parentheticals citing the Q0
  and R0 files. `[2]` cites my §5.4 disposition and does not decide it. `[14]` also says what is still
  owed (C0 re-check, R0 confirmation) and that Q0's attestation does not cover the N3 test change.
- **N5.** Measured with the repository validator on `valid.json`: `job:`/`app:` + 252 accepted, + 253
  rejected; `content:` + 248 accepted, + 249 rejected; both fields. `open_blockers[12]` now says 252.
- **N3.** `2^4+2^5+2^2+2^3+2^3+2^4 = 84` spellings, over both fields. Mutation on a disposable copy
  (scheme group of both fields widened, file restored afterwards): `+hTTp`, `+FiLe`, `+wSs`, `+Https`,
  `+HTTP` each make the file fail (exit 1). With the `e7d5e6e` version of the test, `+hTTp` passes
  (exit 0); with the head's version it fails. The assertion stays inside the existing test, so no test
  name moves (691 before and after).
- **`[6]`.** One more increment recorded; the integrity manifest shows exactly the two digests named.

### Read, not re-measured

- A0's statement that `cf39be3` was made by `node scripts/commit-when-clean.mjs` with a clean exit 0
  (691/691). I did not see that run. It is consistent with a pre-commit check of uncommitted changes;
  at the committed state the handoff guard is red by design until the refresh.
- The order A0 first tried (merge, then picks) and its 689/691 result, kept on a local branch since
  deleted. I measured only the tree that was pushed.
- The three role files' own measurements, as in my verdict.

## 2. Earlier R0 findings and A0's corrections

| Item | State | Basis |
|---|---|---|
| R1 (head lacks `main`, CI red) | **half closed.** Head contains `e1fa28e`, merge clean. CI is still red at `edbb6ae`, now on the handoff guard, not on scope | §1 |
| R2 (C0 C5 content) | **closed from R0's side.** The record is accurate. C5 itself is C0's condition and only a C0 re-check lifts it (§3 F1) | §1 |
| R3 (Owner merges personally) | **stands.** PR changes RFC-2026-006 (RFC-2026-025 §5 item 6) | |
| R4 (no `x-amended-by` on `ctr-api-001`/`ctr-idm-001`) | **now in effect**, because R2's record is accurate | verdict §4 R4 |
| R5 (rollback text) | **closed** | §1 |
| R6 (prose entries become machine permission) | carried, unchanged; owner of `scripts/` | |
| R7 (stale blockers) | **closed** | §1 |
| R8 (mixed case, 252) | **closed for mixed case and 252**; non-special dereferenceable schemes (`data`, `javascript`, `blob`) remain disclosed, not covered | §1 |
| R9, R10 | carried as written | |
| Order change (picks, increment, merge last) | **accepted.** Same file set and blob-identical role files; the merge is a normal merge commit with `e1fa28e` as second parent; nothing rewritten, no force. Putting the merge last is what lets the guard compare against the branch side of the merge | §1 |
| Closure note §7 | present; records the Owner's words "เอาตามที่คุณแนะนำทุกอย่าง" and that A0 decides nothing | read |

Acknowledgements §5.1 (CTR-JOB-001 `x-amended-by[1]`), §5.2 (integrity manifest, now also covering
this increment's two digest moves, which I measured), §5.3 (`ctr-api-001`/`ctr-idm-001`, **now
effective**: `[7]`/`[8]` state the whole change) and §5.4 (class of change) stand.

## 3. Findings (this run)

- **F1 — High, blocks `integration_verified`, process.** No C0 re-check of `cf39be3` exists: not on the
  branch, not on any local or remote ref I can see. My verdict §7 step 2 required it (RFC-2026-025 §5
  item 2), and the closure note §7 lists it as still owed. C0's verdict at `e7d5e6e` is
  `review_approved_with_conditions` with C5 open, so the `review_approved` gate is **not** satisfied.
  I have measured that C5's content is now correct; that does not lift a Reviewer's condition.
- **F2 — Medium, blocks merge, expected.** Handoff not refreshed: `npm run check` 689/691 and
  `check:handoff` exit 91 on the branch name; CI run `37349359495` red, so `Verify branch scope` has
  **not** run in CI on any head of this PR that contains `main`. Measured locally: 0, 11 paths, and the
  simulated refresh gives 691/691.
- **F3 — Info, not a condition.** Q0's attestation is of `e7d5e6e`; `cf39be3` strengthens one assertion
  in the guard Q0 attested. The contract is unchanged and the change only narrows what the guard
  accepts; I measured it (84 × 2, five mutants caught, one shown surviving the old version). Whether
  Q0 extends its attestation is Q0's call, as the closure note says. I do not make it a condition.
- **F4 — Info.** `[8]`'s correction note says "omitted the appended sentence" (singular) where two
  sentences were appended; the quoted text it points to (in `[7]`) is complete. Not a condition.

**Stop-the-line: no.** No protected, catalog, CI, script, lockfile or database path changes; no role
run raised stop-the-line; the contract and migration 050 agree.

## 4. Answer: may the package be recorded `integration_verified` once the handoff is refreshed last and CI is green, with the Owner merging personally?

**Not on those two alone.** F1 must be closed first. With it, **yes**, and this file is then the
record, without another R0 run, at the final head **H**, when all of the following hold:

1. **C0 re-check of `cf39be3`** by `/claude/c0_contract_reviewer`, one commit adding one file under
   `evidence/WP-0A-CON-005/`, whose verdict is `review_approved` (C5 lifted) with **no new condition**.
2. **This file** on the branch (cherry-pick `-x`, one file).
3. **Handoff refreshed last and alone**, on the branch name: one commit touching only
   `handoffs/WP-0A-CON-005-author-handoff.json`, made after 1 and 2; `npm run check:handoff` exit 0 and
   `npm run check` 691/691 on the branch name.
4. **Green required CI on H**, every step run (including `Verify branch scope`), and
   `git diff --name-only origin/main...H` equal to the 11 paths of §1 plus this file and the C0 file
   (13 paths).
5. **`main` still at `e1fa28e`**, or, if it moved, taken again by a normal merge commit that conflicts on
   nothing and changes none of the 13 paths, followed by a fresh refresh (step 3) and green CI.

Any other commit after `edbb6ae`, any other path, a C0 condition, or a C0 verdict other than
`review_approved` makes this confirmation lapse and needs an R0 re-run.

Then:

- **The Owner merges personally** (R3), merge commit pinned with `--match-head-commit` to H. The PR stays
  Draft until then. A0's standing delegation does not apply to this PR.
- The manifest's `status` stays `in_review` on this PR; writing it would be a substantive change after
  the refresh. The move to `integration_verified` is recorded by this file plus the CI run on H, and is
  transcribed onto the manifest after merge on the Integration Owner's path, citing this file, with the
  §5.1 transcription onto `ctr-job-001/schema.json` `x-amended-by[1]` on the contract owner's path. The
  Author does not write either.

## 5. Verdict

**integration_conditional** at `edbb6ae`. WP-0A-CON-005 is **not** `integration_verified` now. It
becomes `integration_verified` at H when §4 steps 1–5 hold; F1 (C0 re-check) is the one item that a
refresh and green CI cannot supply.

VERDICT: integration_conditional

— `/claude/r0_steward`, Integration Owner, WP-0A-CON-005
