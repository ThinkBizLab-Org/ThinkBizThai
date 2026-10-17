# WP-0A-CON-008 records transcription, 2026-10-17: PR #266, PR #271 and PR #278 after their merges

Scribe: `/claude/a0_atlas` (A0, this package's Author), drafted by a records subagent of that run. It transcribes
words already on `main` (the role files, the Owner dispositions and the 2026-10-17 round-audit files cited below) and
facts read with `gh` and `git` on 2026-10-17. It is not a role verdict, moves no status (`in_review` stays) and closes
no role's finding.

Branch `agent/claude/WP-0A-CON-008-merge-parent-order`, recreated from `origin/main` `6fd6aa0e` (the merge of PR #282).
Before writing, `git grep` on `main` for the three merge commits and their final heads found no merge record of #266,
#271 or #278 in this package's records (`open_blockers`, `records-transcription-*`): the merge commits appear only in
other packages' files and the 2026-10-17 audit files. The 2026-10-17 audits list these three as owed
(`evidence/audits/2026-10-17/r0-audit.md` §7 item 2, R0-AUD1017-3).

**Why this record changes no line of `work-packages/WP-0A-CON-008.json`.** This package's manifest is digested in
`test-kits/integrity-manifest.json` (line 131, the only work-package manifest there; it is the sample of
`test-kits/protocol-schema-conformance.test.mjs` and is listed in `scripts/verify-test-coverage-floor.mjs`). Any edit
to it, even a records-shaped one, moves that digest, and `test-kits/integrity-manifest.json` is a generated file that
`scripts/db/classify-records-only.mjs` (`GENERATED_PATHS`) and RFC-2026-025 §6.1 item 5 exclude from records. So the
merge records live in this file and in the handoff, and the `open_blockers[15]` correction is not made here (§5).

## 1. Merge facts

| Fact | PR #266 | PR #271 | PR #278 |
|---|---|---|---|
| Title | `fix(protocol): the handoff guard measures an audit-only branch from its merge-base, so the audit lane passes CI (WP-0A-CON-008)` | `docs(governance): status note on RFC-2026-031 that RFC-2026-034 amends it (WP-0A-CON-008; bundle item 5)` | `fix(protocol): commit-when-clean stages before it verifies; the handoff guard's two owed audit-lane cases (WP-0A-CON-008)` |
| Merged (`gh pr view <n> --json mergedAt`) | `2026-10-15T12:37:02Z` | `2026-10-15T14:54:53Z` | `2026-10-16T04:52:52Z` |
| Merge commit | `9b3ffbd56bd9c314e20c6e1634d5fe286cadbc92` | `0c35c265c79e8659b989b3e4c3812fe3e366b0ec` | `4f9ab1401f1f5fa3105046127730ae8b89866fb4` |
| Merged by (`mergedBy`) | `workstationgroup` | `workstationgroup` | `workstationgroup` |
| Final head (`headRefOid`) | `a2d15306f81256a19808a17bec87381e132ea449` | `80958a8ae6d8e9c0c5bce1735ebf407993c59a4a` | `0d773f6f8b8152e948b9230e598d37b573c4a931` |
| Merge parents (`git log -1 --format=%P`) | `14716adf` (main, PR #265), `a2d15306` | `c9554ef9` (main), `80958a8a` | `d1057429` (main, PR #277), `0d773f6f` |
| Head contains that `main` (`git merge-base --is-ancestor`) | yes | yes | yes |
| Merge tree = final head's tree | yes, `9fefc022` | yes, `33997b14` | yes, `814e3d5d` |
| CI on the final head (the only run for that commit) | run `38733379219`, Bootstrap validation, `pull_request`: `bootstrap` job `116416429283` success (12:36:08Z), `application` job `116424967391` success (12:36:41Z) | run `38752303650`: `bootstrap` `116481547488` success (14:53:30Z), `application` `116492523912` success (14:53:59Z) | run `38851087280`: `bootstrap` `116812220300` success (2026-10-16T04:51:34Z), `application` `116817446502` success (04:52:07Z) |
| Tests in both bootstrap test steps (`gh run view --log`) | `ℹ tests 831`, `ℹ pass 831`, `ℹ fail 0` | `ℹ tests 831`, `ℹ pass 831`, `ℹ fail 0` | `ℹ tests 841`, `ℹ pass 841`, `ℹ fail 0` |
| Lane printed on the final head (`gh run view --log`) | `records-only classifier: NOT RECORDS-ONLY` on `14716adf..HEAD`; `review tier and lane: tier: H, lane: governance` | `NOT RECORDS-ONLY` on `c9554ef9..HEAD`; `tier: H, lane: governance` | `NOT RECORDS-ONLY` on `d1057429..HEAD`; `tier: H, lane: governance` |

**Measured base (R0-266-2).** PR #266 was measured on `main` `14716adf` (PR #265), not on `94c858f0` as its
disposition §1 and the handoff's first acceptance result said when drafted: R0's file names `14716adf` as the base at
its reading head `f3ee0c1d`, and `14716adf` is the merge's first parent.

**The press.** Each merge is A0's: A1's round audit records "every press is an A0 `Bash` tool call `gh pr merge <n>
--merge --match-head-commit <sha>`, 20 of 20, each `<sha>` equal to the PR's final head"
(`evidence/audits/2026-10-17/a1-audit.md` §1). The `check:handoff` exit at each press is not recorded on `main`
(R0-AUD1017-4); this record cannot supply it.

## 2. Commits after each reading head, and the carry clauses

Every role-file commit below is a `cherry-pick -x` touching one file, whose source commit's parent is the reading head,
and whose blob at the source equals the blob at the final head (`git rev-parse <commit>:<path>`).

- **#266** (reading head `f3ee0c1d`): `1d53ce6e` C0 (from `a2722502`, blob `fddb858e`), `624a5864` A1 (`2730c128`,
  `61969614`), `e39412cc` Q0 (`ba4c7f6b`, `7750fd20`), `11fa3163` R0 (`635b2279`, `70f1da76`); then `a2d15306`,
  `handoffs/WP-0A-CON-008-author-handoff.json` alone. No merge of `main`. Each of the four carry clauses admits role
  files carried with `-x` and the handoff last and alone.
- **#271** (reading head `14db1f85`): `915ad00d` C0 (`9813c412`, `65a92a61`), `01ff8127` A1 (`bf853fc4`, `0234ef61`),
  `768602db` Q0 (`e7eb8e43`, `8b2cc1f4`), `087b0471` R0 (`f5b486d8`, `d7323a8a`); then `81b300a1`, a merge of `main`
  `c9554ef9` whose only changed path against `087b0471` is `test-kits/integrity-manifest.json`;
  `node scripts/db/classify-records-only.mjs --sync 087b0471 81b300a1 c9554ef9` exits 0 ("mechanical sync … no
  conflict inside the PR's own paths", the manifest left to regenerate and compare); R0's audit records the
  regeneration as clean (`r0-audit.md` §2, the #271 row); then `80958a8a`, the handoff alone. C0 §7, A1 §5, Q0 §7 and
  R0 §8 each admit such a merge with the integrity manifest rebuilt by its generator.
- **#278** (round two reading head `2b50d10a`): the four round-one files read at `83274247`, `04ecb4bf` C0 (`db91dfd6`,
  `72d72bb5`), `81b390b5` A1 (`70fbd553`, `54c34f65`), `7aa28cac` Q0 (`14068743`, `21764762`), `24b677e5` R0
  (`34e84303`, `48cc623e`); the four round-two files read at `2b50d10a`, `21ea9dc3` C0 (`b1500ed1`, `22e9b510`),
  `ff7703cb` A1 (`e4fe81ff`, `62f86ffe`), `3c8a3f20` Q0 (`0e4b2936`, `c20637b1`), `665b6226` R0 (`d6ce9038`,
  `0f28d236`); then `0d773f6f`, the handoff alone. No merge of `main` after `2b50d10a`.

## 3. The role verdicts, from their files on `main`

**PR #266**, all at `f3ee0c1d3f93603380dcfb2c5c2b352bead93734`:
- C0, `evidence/WP-0A-CON-008/c0-review-2026-10-15-pr266.md` §6: "**`review_approved`** on
  `f3ee0c1d3f93603380dcfb2c5c2b352bead93734`."
- A1, `a1-review-2026-10-15-pr266.md` §5: "**`security_approved`.** No security finding open, no stop-the-line."
- Q0, `q0-review-2026-10-15-pr266.md`: "**Verdict:** `test_verified` at `f3ee0c1d`." and "**Stop-the-line:** no.
  **Security finding:** none raised by Q0."
- R0, `r0-review-2026-10-15-pr266.md` §1: "**Ready at `f3ee0c1d`.**"

**PR #271**, all at `14db1f8512193bfb97ea8181b61f2447c60073d9`:
- C0, `c0-review-2026-10-15-pr271.md` §1: "**`review_approved`** at `14db1f8512193bfb97ea8181b61f2447c60073d9`. No
  stop-the-line."
- A1, `a1-review-2026-10-15-pr271.md` §4: "**`security_approved`** at `14db1f8512193bfb97ea8181b61f2447c60073d9`. No
  stop-the-line. No security finding of any grade open against this PR."
- Q0, `q0-review-2026-10-15-pr271.md`: "**Verdict:** `test_verified` for the content at `14db1f85`."
- R0, `r0-review-2026-10-15-pr271.md` (table): "**ready** on content (no blocking finding)", with
  `integration_verified` held on R0-271-1 (the head behind `main`, no CI) until its §6 held.

**PR #278**, round one at `83274247`: C0 `review_approved`, A1 `changes_requested` on A1-278-1, Q0 `test_verified`,
R0 ready (`*-review-2026-10-16-pr278.md`). Round two, all at `2b50d10a6534bc25cd5d1277b9686eecddf829a3`:
- C0, `c0-reread-2026-10-16-pr278.md` §1: "**`review_approved`** at `2b50d10a6534bc25cd5d1277b9686eecddf829a3`. No
  stop-the-line."
- A1, `a1-reread-2026-10-16-pr278.md` §5: "**`security_approved`** at `2b50d10a`. Not stop-the-line. A1-278-1 is
  closed, and the conflict refusal is stricter than `main`. No security finding counts against RFC-2026-025 §5 item 6.
  A1-278r2-1 and A1-278r2-2 are Low advisories that A0 may close or record." Its table: "A1-278r2-1 and A1-278r2-2
  are Low advisories (§3 gives the reason)."
- Q0, `q0-reread-2026-10-16-pr278.md`: "**Verdict:** `test_verified` at `2b50d10a`."
- R0, `r0-reread-2026-10-16-pr278.md` §1: "**Ready at `2b50d10a`.**"

## 4. Who pressed, under which Owner direction

- **#266** and **#271**: A0, under the Product Owner's answer of 2026-10-15T02:13:35.293Z to question 2 (header "ชุด
  governance"), "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)", whose option description reads "เฉพาะ 5 เรื่องนี้ ·
  แต่ละ PR 4 role + CI เขียว 2 job + ไม่มี security finding ค้าง · ไม่รวม dependency ใหม่". #266 is item (2)
  (`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-15-governance-bundle-press.md` §2.1;
  `required_human_authorities[3]`); #271 is item (5) (`product-owner-disposition-2026-10-15-governance-bundle-press-item-5.md`;
  `required_human_authorities[4]`).
- **#278**: A0, under the Product Owner's answer of 2026-10-16T02:40:07.764Z to question 1 (header "commit gate"),
  "เปิด PR + A0 กดเมื่อ 4 role ผ่าน (Recommended)", whose option description reads "เฉพาะ 2 เรื่องนี้ใน PR เดียว · CI
  เขียว 2 job + ไม่มี security finding ค้าง" (`product-owner-disposition-2026-10-16-commit-gate.md` §2.1;
  `required_human_authorities[5]`).
- **#278 was pressed with two A1 Lows open against its own diff** (A1-AUD1017-1 (3)). A1's round audit, on `main` at
  `evidence/audits/2026-10-17/a1-audit.md` (cherry-picked as `c753eb7f` from `e3607cf1` on branch
  `a1/audit-2026-10-17`, blob `ea1d7b87` at both), §4: "#278 was pressed with two A1 Lows open against its own diff,
  called "advisories"", and "A0 pressed at 04:52:47Z relying on A1's label, which is a fair reading of what A1 wrote:
  the fault is in A1's grading, not A0's press." R0 agrees (`r0-audit.md` §3 item 5).

## 5. A1-278r2-1 and A1-278r2-2: open

Both are **open**. A1's words, `a1-reread-2026-10-16-pr278.md`:
- **A1-278r2-1** "Low (integrity/privacy), advisory, open; not stop-the-line": "**A refusal drops index flags that a
  tree cannot carry.** Intent-to-add entries, `assume-unchanged`, `skip-worktree` and sparse-checkout bits are lost
  when the gate restores with `read-tree`."
- **A1-278r2-2** "Low (integrity), advisory, open; not stop-the-line": "**The commit-gate cases' throwaway
  repositories inherit the caller's `GIT_*` environment.**"

A1-AUD1017-1 (Low) grades both as findings that were open at the press and names the fix: "(2) WP-0A-CON-008, in its
next governance increment, either closes both (…), or records both in the handoff's `known_limitations` and corrects
`open_blockers[15]`'s "the index … after the refusal" to except per-entry flags."

**What this record does and does not do.** Both are now in this branch's handoff `known_limitations` and
`open_risks_or_blockers`, as open. `open_blockers[15]` is **not** corrected here: RFC-2026-025 §6.1 item 4 admits
appended text on an old entry, but on this package the edit moves the digest in `test-kits/integrity-manifest.json`,
which no records-only PR may touch (above). **Owed:** the correction of `open_blockers[15]` (or the fix of both), in a
WP-0A-CON-008 **governance-lane** PR read by C0, A1, Q0 and R0, as A1-AUD1017-1 (2) says ("in its next governance
increment"); a fix of either is a script or test change and needs an A1 re-read (`a1-reread-2026-10-16-pr278.md` §6).
A1 then says whether A1-AUD1017-1 is closed.

## 6. R0's words after the merges, and the status

R0 asked the records PR after each merge for the following; each is recorded here.

- `r0-review-2026-10-15-pr266.md` §1, quoted as R0 directs: "**`integration_verified` for this increment at
  `f3ee0c1d`, conditional**: it holds once C0 `review_approved`, A1 `security_approved` (with no security finding of
  any grade open) and Q0 `test_verified` are on this head (or carried to the final head under their own carry
  clauses), and CI is green on both jobs (`bootstrap`, `application`) on the head A0 presses. At my read CI run
  `38723764656` (`bootstrap`) was in progress and `application` (which `needs: bootstrap`) had not started; I record
  no CI result. The records pull request after the merge moves `status` `in_review` -> `integration_verified` and
  quotes this paragraph."
- `r0-review-2026-10-15-pr266.md` §5, R0-266-1: "R0-262-2 is discharged by this PR on merge." R0-266-2: "The records
  PR should say the PR was measured on `14716adf`." (§1 above.) §3 names this post-merge records PR as the record of
  its acknowledgement of the `WP-0A-A0-002` amendments (`scripts/test-suite-contract.mjs`, `test-kits/integrity-manifest.json`):
  "No separate `WP-0A-A0-002` record is owed beyond this acknowledgement and the post-merge records PR naming it".
  This record names it.
- `r0-review-2026-10-15-pr271.md` §6: "On a final head reached only by commits inside §8, with items 1 to 5 met, this
  verdict reads as `integration_verified` for this increment without a new R0 run." R0's audit: "#271's reads as
  `integration_verified` once its §6 holds" and "The #266 and #271 conditions held on their final heads"
  (`r0-audit.md` §5).
- `r0-review-2026-10-16-pr278.md` §1, quoted as R0 directs: "**`integration_verified` for this increment at
  `83274247`, conditional**: it holds once C0 `review_approved`, A1 `security_approved` (with no security finding of
  any grade open) and Q0 `test_verified` are on this head (or carried to the final head under their own carry
  clauses), and CI is green on both jobs (`bootstrap`, `application`) on the head A0 presses. At my last read (03:15Z)
  CI run `38844276564` (`bootstrap`) was pending and `application` had not started; I record no CI result. The records
  pull request after the merge moves `status` `in_review` -> `integration_verified` and quotes this paragraph." Round
  two (`r0-reread-2026-10-16-pr278.md` §1) restates it "as in round one" at `2b50d10a`.

**The status move is not made.** R0's audit, R0-AUD1017-2 (Low): "my #278 verdict does not hold as written, and the
package-level move waits until A1-AUD1017-1's fix (2) lands: either both are closed in a governance increment, or both
are recorded in `known_limitations` with `open_blockers[15]` corrected. A1 then has to say the finding is closed. Until
then the records PR records #266's, #271's and #278's merges and leaves `status` at `in_review`." `status` stays
`in_review`. (This PR could not make the move in any case: the manifest edit is not records-only here.)

## 7. A discrepancy noted, not corrected

`r0-review-2026-10-15-pr271.md` says "The package status stays `integration_verified`" (table) and "`status` stays
`integration_verified`" (§3). The manifest's `status` was `in_review` at #271's reading head `14db1f85`, at its branch
point `9b3ffbd5` (#266 moved it, the Author's move for a new increment) and at its merge `0c35c265`. R0's point, that
#271 moves no status, holds; the value named is R0's to correct.

## 8. Not recorded here

- `open_blockers[15]`'s correction (§5) and the status move (§6): manifest edits, not records-only on this package.
- `ownership.amended_by` acknowledgements for amendments other PRs made to this package's files (R0-270-2 and earlier):
  this manifest has no `amended_by` list, and adding one is not records-only here.

## 9. Addendum 2026-10-17: this branch becomes a governance-lane pull request

Appended after §1 to §8, which stand as written for the records commit `028c1b60`. The Owner answered, at
2026-10-17T16:31:14.663Z, who presses this package's records pull request once it carries manifest edits:
`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-17-records-press.md` (`required_human_authorities[6]`).
On that answer this branch, after a mechanical merge of `origin/main` (`ba3efcfd`, PR #286), now also edits
`work-packages/WP-0A-CON-008.json`, so the "not done here" items of §5 and §8 that were held back only because the
manifest edit is not records-only are made here, on the governance lane:

- `open_blockers[15]` gains a dated correction clause, its old text kept whole (the field is append-only): the index
  "as it was found" holds for the tree and the staged set, not for per-entry index flags (A1-AUD1017-1 (2)).
- `open_blockers[16]` (new) records A1-278r2-1 and A1-278r2-2 as open known limitations, as the handoff does.
- `ownership.amends_without_owning.paths` is narrowed: `scripts/test-suite-contract.mjs` is dropped (#278's amendment,
  on `main` since `4f9ab140`); `test-kits/integrity-manifest.json` stays, because this manifest is digested there and
  `npm run regenerate:manifest` moves that digest. The rationale gains one dated sentence; its old text is kept.

Still not done: the status move (§6; R0-AUD1017-2 holds it until A1 says A1-AUD1017-1 is closed), any fix of
A1-278r2-1 or A1-278r2-2 (a script or test change), and §7's discrepancy (R0's). No script, test, RFC, CI file or
contract is changed.
