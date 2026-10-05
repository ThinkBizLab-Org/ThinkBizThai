# R0 final integration reading: WP-0A-CON-005 (PR #187) at head `bab3d64`

Date: 2026-10-06. Package: `WP-0A-CON-005`, CTR-JOB-001 reference-field hardening. PR: #187, branch
`agent/claude/WP-0A-CON-005-job-reference-hardening`, head `bab3d64d8bf986cbc3ef925d1d552cf57c2c4e66`,
`main` `8c089cc0bf30a234efa61752c6054d670f85a2a8` (#185).
Earlier R0 files: `r0-integration-verdict-2026-10-05.md` (verdict, at `e7d5e6e`) and
`r0-integration-confirmation-2026-10-06.md` (confirmation, at `edbb6ae`), both on the branch.

## 0. What I am

- `/claude/r0_steward`, Integration Owner, a subagent spawned by a workflow script of `/claude/a0_atlas`
  under RFC-2026-024. A0 is this package's Author; I record that so the reader can weigh this file.
- I do not fix. I edited no file of the PR. This file is my only output: a reading of the head after
  the second `main` merge, against my confirmation §4, and the terms on which the package is recorded
  `integration_verified`. It is not the review, not the test, not security, not the merge, not Gate G0.
- This commit is cut on a fresh local branch `r0/WP-0A-CON-005-final-2026-10-06` from `bab3d64` and is
  **not pushed**.

## 1. Measured (by me, in this run)

Private clone, checked out **on the branch name** `agent/claude/WP-0A-CON-005-job-reference-hardening`
at `bab3d64` (not detached). Node `v24.20.0`, npm `11.19.0`.

| Command | Exit | Result |
|---|---|---|
| `git log --first-parent edbb6ae..bab3d64` | 0 | `6c153a4` C0 re-check, `175c57a` R0 confirmation, `cf01515` refresh, `80f151f` merge of `8c089cc`, `bab3d64` refresh. Nothing else |
| `git rev-parse <orig>:<file>` vs `<pick>:<file>` vs `HEAD:<file>` | 0 | C0 `d465bfc` = `6c153a4` = head (`c4a0cfa`); R0 `be15401` = `175c57a` = head (`e96b1be`). Blob-identical, `-x` trailers present, both originals' parent `edbb6ae` |
| `grep VERDICT c0-recheck-2026-10-06.md` | 0 | `review_approved`; §6: "C5 is lifted", no open review condition |
| `git log -1 --format=%P 80f151f` | 0 | parents `cf01515`, `8c089cc`: a normal merge, nothing rewritten |
| `git merge-tree --write-tree cf01515 8c089cc` | 0 | no conflict; tree `e37f359` equals `80f151f^{tree}`, so the merge commit is the plain automatic merge |
| `git merge-base HEAD origin/main` | 0 | `8c089cc` (head contains current `main`) |
| `git diff cf01515 80f151f -- test-kits/integrity-manifest.json` | 0 | exactly five entries move: RFC-2026-028, `evidence/VERIFICATION.md`, `scripts/test-suite-contract.mjs`, `test-kits/branch-identity.test.mjs`, `test-kits/db/foundation-contract.test.mjs` |
| `git diff e1fa28e 8c089cc -- test-kits/integrity-manifest.json` | 0 | the same five lines, byte-equal (`diff` of the two hunks: identical). They are `main`'s content, taken by the merge |
| `git diff origin/main...bab3d64 -- test-kits/integrity-manifest.json` | 0 | **only the PR's two digests**: RFC-2026-006 `c96da4a…` → `b91cd19…`, `ctr-job-001-reference-hardening.test.mjs` `52b75db…` → `66e9d40…` |
| per path: `git diff e1fa28e...cf01515 -- P` vs `git diff origin/main...bab3d64 -- P` (+/- lines hashed) | 0 | **identical for 12 of the 13 paths**, including the integrity manifest; the 13th is the handoff, changed only by the refresh `bab3d64` |
| `git diff cf01515 bab3d64 -- handoffs/WP-0A-CON-005-author-handoff.json` | 0 | base `e1fa28e` → `8c089cc`, head `175c57a` → `80f151f`, one assumption rewritten to state the second merge and the manifest point; accurate against the tree |
| `git diff --name-only origin/main...HEAD` | 0 | **13** paths: the 11 of my confirmation §1 plus `c0-recheck-2026-10-06.md` and `r0-integration-confirmation-2026-10-06.md` |
| `git diff --name-only origin/main HEAD -- contract-catalog .github scripts package.json package-lock.json CONTRIBUTING_AGENTS.md AGENTS.md CLAUDE.md docs db` | 0 | **empty** |
| `npm ci --ignore-scripts` | 0 | |
| `npm run check` | 0 | `tests 692, pass 692, fail 0` (691 + one test `main` added in #185) |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-identity.mjs <branch>` | 0 | `WP-0A-CON-005` |
| `node scripts/verify-branch-scope.mjs 8c089cc WP-0A-CON-005` | 0 | "all 13 changed path(s) are declared, and every amendment explains one" |
| `validate-work-package-role-separation.mjs`, `validate-work-package-ownership.mjs`, `verify-test-coverage-floor.mjs` | 0, 0, 0 | |
| `gh run view 37356213562` | 0 | head `bab3d64`, `success`; every step `success`, including `Verify test-integrity guard`, `Validate repository bootstrap`, `Verify branch scope`, `Database foundation` and the negative control. None skipped |
| `gh pr view 187` | 0 | Draft, `MERGEABLE`, `mergeStateStatus` `CLEAN`, head `bab3d64` |
| `gh api repos/{owner}/{repo}/commits/main` | 0 | `8c089cc` |

### Read, not re-measured

- The content of the C0 re-check beyond its verdict and §6. It is C0's measurement.
- Q0's attestation for this head: it does not exist yet on any ref I can see (§3 F1).

## 2. My confirmation §4 item 5, read against `80f151f`

Item 5 said the `main` merge must change **none of the 13 paths**. Read literally, `80f151f` changes one
of them, `test-kits/integrity-manifest.json`, against its first parent. That wording was mine and was
too broad for a shared file whose other entries belong to other packages. What item 5 is for is that
`main` must not alter **this package's change** on any of its paths. Measured (§1):

- the five entries the merge moves are `main`'s own content, byte-equal to `e1fa28e → 8c089cc`;
- the PR's diff of that file against `main` is still exactly its two digests, the ones my verdict §5.2
  acknowledged;
- the PR's diff against `main` is unchanged on every other path but the handoff, which only the refresh
  moved;
- the merge is conflict-free and is the plain automatic merge; CI's `Verify test-integrity guard`
  and local `npm run check` both accept the merged manifest.

**Item 5 holds as intended.** I correct its wording here: "changes this package's diff against `main`
on none of its paths". §5.2's acknowledgement stays limited to the two digests; it does not extend to
the five, which are acknowledged by their own packages on `main`.

## 3. Findings (this run)

- **F1 — Medium, blocks `integration_verified` until supplied, process.** Q0's attestation is of
  `e7d5e6e` (`test_verified_with_conditions`). `cf39be3` changed one assertion in the attested test
  (C0 N3). My confirmation (F3) left that to Q0; the Author has now chosen to obtain a Q0 attestation,
  and the `test_verified` gate of `review_and_test_gates` precedes `integration_verified`. Once it is
  sought it must be on the branch and must be clean (§4 step 1). It is not on any ref yet.
- **F2 — Info.** My §4 item 5 wording, corrected in §2. No action.
- **F3 — Info.** Final path count becomes **15**, not 13: the Q0 file and this file are added. That is
  the only change to the count I allow; any other path lapses this file.

Earlier R-items stand as in my confirmation §2 (R3 Owner merges personally; R6, R8 (non-special
schemes), R9, R10 carried; R4 in effect). The `x-amended-by[1]` acknowledgement (verdict §5.1) and its
transcription on the contract owner's path after merge are unchanged.

**Stop-the-line: no.** No protected, catalog, CI, script, lockfile or database path changes; no role
run raised stop-the-line; the merge brought nothing of `main` into this package's change.

## 4. Answer: may WP-0A-CON-005 be recorded `integration_verified` at the final head?

**Yes**, at the final head **H**, without another R0 run, when all of the following hold:

1. **Q0 attestation** by `/claude/q0_sentinel`: one commit adding one file under
   `evidence/WP-0A-CON-005/`, attesting the content at `bab3d64` (which includes `cf39be3`'s
   strengthened assertion), with verdict `test_verified` and **no Tester condition**. A
   `_with_conditions` verdict, or any condition, lapses this file.
2. **This file** on the branch: cherry-pick `-x` of this commit, one file, blob-identical.
3. **Handoff refreshed last and alone** on the branch name, after 1 and 2: one commit touching only
   `handoffs/WP-0A-CON-005-author-handoff.json`; `npm run check:handoff` exit 0 and `npm run check`
   `692/692` on the branch name.
4. `git log --first-parent bab3d64..H` is exactly those three commits (1 and 2 in either order, 3 last).
5. **Green required CI on H**, every step run (none skipped), including `Verify branch scope`.
6. `git diff --name-only origin/main...H` is the 13 paths of §1 plus the Q0 file and this file
   (**15**), and `git diff origin/main...H -- test-kits/integrity-manifest.json` is still only the two
   digests of §1.
7. **`main` still at `8c089cc`** when the Owner merges. If `main` moves, this file lapses and the head
   needs another `main` merge and an R0 re-run.

Then:

- **The Owner merges personally** (R3, RFC-2026-025 §5 item 6: the PR changes RFC-2026-006), merge
  commit pinned with `--match-head-commit` to H. The PR stays Draft until the Owner acts. A0's standing
  delegation does not apply.
- The manifest is **not** changed on PR #187: a write after the refresh would be a substantive change and
  would turn the handoff guard red. The record of `integration_verified` is this file plus the green CI
  run on H.

### The manifest wording A0 records on my behalf (after merge only)

A0 may transcribe the following, verbatim, as a scribe and not as a judgment, in one commit on its own
branch **after** the Owner's merge of H, touching only `work-packages/WP-0A-CON-005.json`, with
`npm run check` exit 0 and the commit message naming this file. `<H>`, `<RUN>` and `<M>` are replaced by
the final head SHA, its green CI run id and the Owner's merge commit SHA; nothing else is changed.

1. `"status": "in_review"` → `"status": "integration_verified"`
2. Appended to the end of `open_blockers[14]` (the entry beginning "No Tester attestation covers the
   current head."), inside the string, preceded by one space:

   ```
   (2026-10-06, R0: CLOSED. /claude/r0_steward recorded WP-0A-CON-005 integration_verified at head <H>, CI run <RUN> green on every step, after C0 review_approved (evidence/WP-0A-CON-005/c0-recheck-2026-10-06.md) and Q0 test_verified at that content; see evidence/WP-0A-CON-005/r0-integration-final-2026-10-06.md. Merged by the Product Owner personally as <M>. Status transcribed by /claude/a0_atlas on R0's behalf; the Author decided nothing.)
   ```

If any `<…>` value cannot be filled from a fact on `main` or in the CI record, nothing is transcribed.
The transcription of verdict §5.1 onto `ctr-job-001/schema.json` `x-amended-by[1]` stays on the
contract owner's path, separately.

## 5. Verdict

**integration_conditional** at `bab3d64`, for one reason only: F1, the Q0 attestation, is not yet on
the branch. Everything else in my confirmation §4 is measured satisfied at `bab3d64`, including item 5
as corrected in §2: the integrity-manifest change brought by `80f151f` is only `main`'s content, and
the PR's own diff of that file is still its two digests. WP-0A-CON-005 becomes `integration_verified`
at H when §4 steps 1–7 hold; this file is then the record.

VERDICT: integration_conditional

— `/claude/r0_steward`, Integration Owner, WP-0A-CON-005
