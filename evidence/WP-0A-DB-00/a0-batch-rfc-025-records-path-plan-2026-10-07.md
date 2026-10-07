# Batch rfc-025-records-path: RFC-2026-025 §6, proposed (a light path for records-only PRs)

Date: 2026-10-07. Author: `/claude/a0_atlas` (A0), through a subagent of A0's workflow run. Package: WP-0A-DB-00,
which owns `architecture/decisions/RFC-2026-025-owner-delegated-merge.md`. Branch:
`agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, created from `origin/main` `7fb0fc05` (PR #202 merged).
**GOVERNANCE PR. Draft. A0 does not merge it** (RFC-2026-025 §5 item 6). This file approves nothing.

## 1. What was asked, and the words

The Owner wrote `ข้อ 4 mw` (2026-10-07) in reply to A0's recommendation (4): "consider fewer review rounds
for PRs that are only records". A0 reads it as "item 4: do it". The words and the reading are in
`product-owner-disposition-2026-10-07-rfc-025-s6.md`. The task A0's workflow gave this run named four
contents, (a) to (d). §6 of the RFC carries them as follows:

| Asked | Where |
|---|---|
| (a) a mechanical definition of records-only, with a guard that fails closed | §6.1; `scripts/db/classify-records-only.mjs` |
| (b) one independent reading (R0, or C0 when R0 is the subject), no re-check round unless blocking, A0 may merge under the delegation | §6.2 |
| (c) a mechanical sync voids no verdict and needs no carry reading; handoff last and alone and green CI still apply | §6.3; the same script, `--sync` |
| (d) what stays: four roles for code, contract, test, schema and CI; stop-the-line; security findings; governance PRs merged by the Owner | §6.4 |

**Where the RFC change goes.** RFC-2026-025 already carries one amendment in its own text: §5, approved
2026-09-28. The repository has no rule that an approved RFC must be amended by a new RFC number, and §5 is
the precedent. So §6 is appended, and one line under the header says §6 is Proposed. §1 to §5 are
byte-identical (see §3).

**Where the task text departs, and why.**

- **The branch.** The task said to use the branch named by the owning package's manifest. WP-0A-DB-00's slot
  read `agent/claude/WP-0A-DB-00-batch-174`, which merged as PR #185. DB-00 names a new branch per batch:
  `batch-rfc-text` and `batch-rfc-023-028` are the precedents for text-only increments. This batch does the
  same and moves the slot.
- **The status.** The task said "status in_review". WP-0A-DB-00 has read `in_progress` since batch 000,
  across every batch, because the status is the whole package's. Moving it would claim the whole package is
  in review. The increment is in review through its Draft PR instead, and the manifest's rationale says so.
- **(a) was widened in one place and narrowed in another**, after measuring tonight's PRs (§3).
  - Widened: `ownership.amends_without_owning` may be **narrowed**, with its rationale restated. #205 and
    #206 did exactly that and are otherwise records.
  - Widened: a closing clause put in front of a blocker's verbatim text counts as append-only, as #201 and
    #206 did. That is Q-025-6-3.
  - Narrowed: the branch slot is not records-only (Q-025-6-2). An appended evidence file must keep its old
    content as a prefix.

## 2. What changed

| Path | Owned? | Change |
|---|---|---|
| `architecture/decisions/RFC-2026-025-owner-delegated-merge.md` | yes | one header line; §6 appended |
| `scripts/db/classify-records-only.mjs` | yes (`scripts/db/**`) | new: classifier and sync check, fail closed, Node built-ins only |
| `test-kits/db/foundation-contract.test.mjs` | yes | one test |
| `evidence/WP-0A-DB-00/` (this file, the transcription) | yes | new |
| `work-packages/WP-0A-DB-00.json` | yes | branch slot; `amends_without_owning.rationale`; `open_blockers[203]` at the end |
| `scripts/test-suite-contract.mjs` | amended | foundation-contract floor 86 to 87, name digest, assertion floor 1121 to 1320 (the guard's own count) |
| `test-kits/branch-identity.test.mjs` | amended | the branch slot, two lines |
| `test-kits/integrity-manifest.json` | amended | regenerated |
| `evidence/VERIFICATION.md` | amended | regenerated |

The manifest gains no line above `open_blockers`, and the new blocker sits at the end. So the 33 line pins
in `db/foundation/lint/audit-coverage-map.json` do not move. The amendment list keeps the same four paths.

## 3. Measured

Node `v24.20.0` and npm `11.19.0`, first on `PATH` from `/Users/bank/.local/node-v24.20.0/bin`. The worktree
is on the branch **name**, and `origin/HEAD` is `origin/main`.

**Baseline.** `npm run check` on `origin/main` `dc7b9684`, before any edit: exit 0, `tests 716, pass 716`.

**The classifier over tonight's history.** For every first-parent merge on `origin/main` since
2026-10-05T12:00 (+07:00), `node scripts/db/classify-records-only.mjs <merge>^1 <merge>^2` reads the PR's own
diff:

| Result | PRs |
|---|---|
| records-only, exit 0 (5) | #198 (CON-005), #199 (A0-002), #201 (CON-003), #205 (CON-004), #206 (A0-005): the five `records-transcription-2026-10-06.md` increments, 3 paths each, no role file in their own diff |
| not records-only, exit 1 (21) | #183–#197 (all fifteen), #200, #202, #203, #207, #208, #209. They change scripts, tests, contracts, RFCs or CI, or they change `role_assignments`/`independence` (#200, #202, #207, #208 and others), or they reword a blocker. #202 (A0-006 to `in_review`) carries 11 role files. |

The two §6.1 choices were measured with each one removed. With only `startsWith` (no closing clause in
front), #201 and #206 become not records-only (`open_blockers[10]` and `open_blockers[3]`: reworded). With
`amends_without_owning` compared whole, #205 and #206 become not records-only.

**The sync check over tonight's history.** For every merge commit on the first-parent line of each PR
branch above, `--sync <merge>^1 <merge> origin/main` was run. **50 syncs; 48 mechanical (exit 0); 2 not
(exit 1)**:

- `31879073` (#196): "main changed the PR's own path(s): test-kits/contracts/catalog-registry.test.mjs".
  This is the sync behind `evidence/WP-0A-CON-004/c0-carry-reading-2026-10-06.md`, `q0-carry-reading-…` and
  R0's R-1.
- `f6652ee0` (#197): "main changed the PR's own path(s): scripts/test-suite-contract.mjs". This is the sync
  behind `evidence/WP-0A-A0-004/r0-ci-sync-reading-2026-10-06.md`.

Of the ten R0 sync-reading files dated 2026-10-06, the other eight read syncs the check calls mechanical.
Each ends with the verdict standing and no stop-the-line. That was read from their verdict lines with
`grep` and not re-measured. One of them,
`evidence/WP-0A-CON-006/r0-sync-reading-2026-10-06.md`, read a validator change on `main` and measured it
harmless. That is the semantic-interaction class that §6.3 leaves to CI on the final head.

**The test bites.** The scratch script replaced each rule with a pass, one at a time, ran the new test, and
restored the file each time:

| Rule disabled | Test |
|---|---|
| only A or M | fail 1 |
| main changed a PR path (overlap) | fail 1 |
| old text kept whole | fail 1 |
| amends paths may not widen | fail 1 |
| generated files are not records | fail 1 |
| evidence appended, not rewritten | fail 1 |
| amended_by: only `acknowledg*` keys | fail 1 |
| no stray path in the merge | fail 1 |

After the restore, `git status` showed the script unmodified.

**Before the commit.** `node scripts/run-test-suite.mjs` on the uncommitted tree gave `tests 717,
pass 715, fail 2`. The two failures were the handoff guard ("the handoff for this branch describes this
branch") and the ratchet that re-runs it on a copy. Both are expected until the refresh that comes last.
`npm run record:verification` refuses a run that is not clean. So `evidence/VERIFICATION.md` was
written by the record script's own `render()` for 717/717, the batch 174 precedent (`6bc9fc2b`). It is
re-recorded by `npm run record:verification` after the refresh. An earlier run turned up one more red: a
synthetic git e-mail in the new test tripped the repository's own e-mail scan. It was replaced with a
string that is not an address.

**The final run on this head.** The commands and their exit codes are in the handoff:
`npm run regenerate:manifest`, `npm run record:verification`, `npm run check`,
`node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00`,
`node scripts/verify-branch-identity.mjs <branch>`, and `npm run check:handoff` after the refresh.

## 4. What is owed (also `open_blockers[203]`)

1. The Owner: approve or refuse §6, and answer Q-025-6-2 and Q-025-6-3. The Owner merges this PR personally.
2. The role runs this governance PR needs, C0, A1, Q0 and R0, on its head. None has run.
3. If approved:
   - a non-gating CI step printing the verdict (WP-0A-A0-004);
   - `CONTRIBUTING_AGENTS.md` citing §6 (WP-0A-A0-001);
   - the classifier added to the integrity manifest and `DIGESTED_FLOOR`;
   - optionally, the script moved to a protocol path.
