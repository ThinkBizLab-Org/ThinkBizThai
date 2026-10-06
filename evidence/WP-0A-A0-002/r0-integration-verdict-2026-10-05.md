# WP-0A-A0-002 — R0 integration verdict on PR #192, 2026-10-05

| Field | Value |
|---|---|
| Work package | WP-0A-A0-002 |
| Agent run id | `/claude/r0_steward` (Integration Owner; named successor to `/root/r0_steward` by the Owner's G0 step 2 item 2) |
| Subject | PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/192 (Draft, OPEN) |
| Branch | `agent/claude/WP-0A-A0-002-contract-test-coverage` |
| Head | `6cff65c5de775d997da5734f7afc274805777494` |
| Base | `origin/main` `8c089cc0bf30a234efa61752c6054d670f85a2a8` |
| Toolchain | Node v24.20.0 |
| Date | 2026-10-06 (file name keeps the dispatch date 2026-10-05) |

## 0. What I am

I am a subagent spawned by a workflow script of `/claude/a0_atlas`, acting as this package's Integration
Owner run `/claude/r0_steward`. RFC-2026-024 §3/3 requires this disclosure: I share a vendor and a parent
with the Author. I wrote none of the PR's content and I fix nothing. This file is Integration Owner
evidence only. It does not merge, does not move the package's status, and does not move Gate G0.

## 1. Verdict

**`integration_changes_requested` — NOT `integration_verified`.** The package cannot move to
`integration_verified` with these role files on the branch, even with CI green, because the manifest's
`review_and_test_gates` includes `review_approved` and the Reviewer's verdict is `changes_requested` with a
blocking finding (C0 F1). Stop-the-line: **none**.

## 2. The four conditions

| Condition | State | Basis |
|---|---|---|
| Head contains main | **Met** | `git merge-base --is-ancestor origin/main 6cff65c5` exit 0; `git ls-remote` reads `main` = `8c089cc0`. |
| Every role verdict non-blocking | **Not met** | C0 `changes_requested`, blocks (F1). A1 `security_approved_with_conditions`, non-blocking. Q0 `test_verified_with_conditions`, non-blocking. |
| Every gate in the manifest satisfied | **Not met** | `author_complete`: met (author-reverify, handoff). `review_approved`: **not met** (C0). `security_approved`: met with conditions (A1 T1, I1, I2). `test_verified`: met with conditions (Q0-C1, Q0-C2). `integration_verified`: withheld by this file. |
| Nothing protected changed | **Met** | `git diff --stat origin/main 6cff65c5`: three paths, `work-packages/WP-0A-A0-002.json`, `evidence/WP-0A-A0-002/author-reverify-2026-10-06.md`, `handoffs/WP-0A-A0-002-author-handoff.json`, all inside `ownership.writable_paths`. Each role branch (`4027d03b`, `f7042f95`, `e854b1e5`) adds exactly one file under `evidence/WP-0A-A0-002/` on top of `6cff65c5`. No script, test, CI, lockfile, contract, RFC or root config. |

CI: PR #192's required check `bootstrap` (Bootstrap validation, run 37370842515) concluded **SUCCESS** at
head `6cff65c5` (read with `gh pr view`, 2026-10-05T21:02:25Z). C0 read it before it finished; it is green
now. It will need to be green again on whatever head A0 produces next.

## 3. C0 F1, re-measured by this role

I did not take F1 on report. Fresh clone on the branch name at `6cff65c5`, under the scratchpad:

1. Prepended `import '../../../e4-outside.mjs';` to `test-kits/db/ws905-fixture.mjs` (not digested;
   imported by the digested `test-kits/db/foundation-contract.test.mjs`). `e4-outside.mjs` lives outside
   the clone and writes a marker file next to itself.
2. `node scripts/verify-test-coverage-floor.mjs` → **exit 0**. `integrity-manifest.json` untouched.
3. `node --test test-kits/db/foundation-contract.test.mjs` → **22 marker files** appeared outside the
   clone before I stopped the run (it waits on a database this sandbox does not have; the payload had
   already run).

So `open_blockers[9]`'s claim that E4 "sits inside the disclosed digest class" and needs
`scripts/test-suite-contract.mjs` edited is false, and `open_blockers[1]`'s "an escaping path -- is closed"
is false. The gap is pre-existing on `main`, not introduced by this PR, and executing it still requires a
reviewable edit to a tracked file, so it is not a stop-the-line incident. It blocks because this PR's only
job is a true record, and it adds a false one. A1 I1 and Q0-N1 reach the same conclusion by other routes.

## 4. What A0 must do before merge

All are record changes inside `writable_paths`; no code change is asked of this PR.

1. **C0 F1 (blocking).** Rewrite `open_blockers[9]`: E4 is reachable with no digest edit through any
   undigested module imported by a digested test (C0's measurement and §3 above), and also by editing an
   existing digested suite plus its digest (Q0-N1 / A1 I1). Drop "inside the disclosed digest class".
   Amend `open_blockers[1]` in place so "Everything OUTSIDE that class ... is closed" no longer names the
   escaping path or phantom declarations. Correct `author-reverify-2026-10-06.md` §3, or supersede it with
   a dated note.
2. **C0 F2.** Extend `open_blockers[11]` to name keyword-preceded regex literals (`return`, `typeof`,
   `case`).
3. **C0 F3.** Fix the "Row E (the E4 residual)" label in `author-reverify-2026-10-06.md` §1.1: Row E is
   the guard removed from `check` (exit 81 today); E4 was Row J.
4. **A1 T1.** Change "S1 fixed" to "S1 narrowed" where the records say it (`author-reverify` §1.2, and the
   manifest if it says so) and add T1 beside Q0-F2 in `open_blockers[10]`. The single-buffer code fix
   belongs to the next package that touches the runner.
5. **Q0-C1.** Extend `open_blockers[10]`: shadowing or aliasing `test` defeats exit 88, the per-file name
   digest and the assertion floor, and the mutation ratchets cover only the nine contract suites.
6. **A1 I2.** Optionally restate `open_blockers[5]` as the scanner's real residual (working tree only,
   pattern-based).
7. **WP-0A-CON-005 `amended_by` entry.** Add it to `ownership.amended_by`, citing this file's §5 as the
   acknowledgement (`acknowledgement_status: acknowledged`). It is missing today: the manifest lists
   WP-0A-A0-005, WP-0A-CON-007 and WP-0A-CON-008 but not WP-0A-CON-005, which also amended
   `test-kits/integrity-manifest.json`.
8. Put the three role files and this file on the branch, then run `npm run refresh:handoff` so the
   handoff is last and alone (C0 F4), on the branch name, never detached.
9. **Re-checks.** C0 re-checks F1-F3 (it said a re-check by that role covers the fix). Because the change
   is records-only, A1 and Q0 need only confirm their conditions' wording; R0 then re-issues on the new
   head with CI green. A0 merges under its standing delegation only after C0 returns a non-blocking
   verdict and CI is green on that head.

Still owed by this role, not given here and not required for this PR's merge: the acknowledgements of the
three existing `amended_by` entries (WP-0A-A0-005, WP-0A-CON-007, WP-0A-CON-008), `open_blockers[3]`
(the RFC-2026-003 amendments on WP-0A-A0-001 and WP-0A-CON-001) and `[4]` (the WP-0A-CON-001 addendum).
On `open_blockers[8]` (status vs tree): the status correctly stays `in_review`. The tree carries the work
through PR #3, but the role set at that head was never completed, and the gate set is not met today. The
status moves only when §4 is done and every gate holds.

## 5. Acknowledgement: the job-reference change (WP-0A-CON-005, RFC-2026-006)

**Pending, and sound. Acknowledged by `/claude/r0_steward`.**

WP-0A-CON-005's `authorized_cross_package_amendments` permits one change to this package's
`test-kits/integrity-manifest.json`: add the digest of `test-kits/contracts/ctr-job-001-reference-hardening.test.mjs`
and update the digest of `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` to its amended
bytes, with acknowledgement owed to `/claude/r0_steward`. WP-0A-CON-005.json still records it as not
countersigned. Measured:

- `b47aece1` changes exactly those two entries in `integrity-manifest.json` (one added, one replaced);
  both match the bytes of their files at that commit (`52b75dbb…` and `5f3fb5f1…`, by `shasum -a 256` of
  `git show b47aece1:<path>`).
- The only other commit in that PR (merge `390b5fb3`, PR #6) touching the manifest, `64d9c65c`, replaces
  only the shared-kernel test's digest, again after that file's bytes changed: inside the same permission.
- No other digest moved, and ownership of the manifest stayed with this package. The change is the
  structural coupling the guard forces (exit 87 or 86 otherwise), not a discretionary edit.

This acknowledgement covers the integrity-manifest change only. It is not an acknowledgement of
WP-0A-CON-005's amendments to WP-0A-CON-001's contract, fixtures or test; those belong to WP-0A-CON-001's
Integration Owner record.

## 6. Commands

| Command | Exit | Result |
|---|---|---|
| `git fetch origin`; `git ls-remote origin main <branch>` | 0 | main `8c089cc0`, branch `6cff65c5` |
| `git merge-base --is-ancestor origin/main 6cff65c5` | 0 | head contains main |
| `git diff --stat origin/main 6cff65c5` | 0 | three paths, all writable |
| `git diff --stat 6cff65c5 <4027d03b / f7042f95 / e854b1e5>` | 0 | one evidence file each |
| `gh pr view 192 --json …` (read) | 0 | Draft, OPEN, MERGEABLE, `bootstrap` SUCCESS at `6cff65c5` |
| F1 clone: `node scripts/verify-test-coverage-floor.mjs` after the fixture edit | 0 | guard green |
| F1 clone: `node --test test-kits/db/foundation-contract.test.mjs` | stopped | 22 markers written outside the clone |
| `git show b47aece1 -- test-kits/integrity-manifest.json`; `git show 64d9c65c -- …` | 0 | two entries, then one |
| `git show b47aece1:<two test paths> \| shasum -a 256` | 0 | both match the recorded digests |

VERDICT: integration_changes_requested (not integration_verified). Stop-the-line: none. Blocks merge: yes, through C0 F1.
