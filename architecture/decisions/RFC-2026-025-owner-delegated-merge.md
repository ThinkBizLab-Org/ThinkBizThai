# RFC-2026-025: the Owner may delegate the merge button to the Author, and record-only PRs need no role runs

Status: **Approved 2026-09-28 by the Product Owner.** The answer was `อนุมัติ RFC-2026-025` (transcribed in `evidence/WP-0A-DB-00/product-owner-disposition-2026-09-28-rfc-025.md`). It was given after A0 summarised this RFC in session as "the merge button may be delegated to A0 under conditions, and a PR that only changes records needs no role runs". The approved text is this file as committed at `5856f0b`. A0 wrote it on the Owner's instruction of the same day (`คุณลุยงานทั้งหมด ตามที่คุณแนะนำ เลยได้ไหม ตอนนี้ delay แล้ว`). **Any change to this text, narrowing or widening, needs the Owner.** A sentence that A0 added to this status line on the day of approval said otherwise. It was not in the approved text, and C0's review of batch 123 caught it. It was removed; §5 is the proposed amendment.
Date: 2026-09-28
Author: `/claude/a0_atlas` (A0 Integration / DB-00)
Amends: `RFC-2026-002` (temporary manual merge control), clause "the Product Owner may perform the final manual merge"
Origin: the one-page decision summary of 2026-09-28, item 4. The records this RFC reconciles are cited in §1.
Amendment §6: **Proposed 2026-10-07, not approved.** The Owner asked for it in the words `ข้อ 4 mw`. §1–§5 above are unchanged and stay approved. §6 takes effect only if the Owner approves it. It is a governance change, so under §5 item 6 the Owner merges it personally.

---

## 1. Why

The repository records the same merges two ways.

- **The Owner's reading.** `evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-six-questions.md`
  (lines 186–188) records the Author's merges under the Owner's delegation as "the Owner's manual merges
  under RFC-2026-002 performed by delegation".
- **The Author's reading.** From the sixth pass on (`session-2026-09-16-sixth-pass.md` §1,
  `session-2026-09-27-seventh-pass.md` §1a, `session-2026-09-27-eighth-pass.md` §1), every state record
  says the literal sentence of RFC-2026-002 "is not satisfied".

Both cannot be right. Every future record would carry the same caveat, and a reader cannot tell whether
the practice is sanctioned. Between 2026-09-27 and 2026-09-28, A0 pressed the merges of #155, #156, #157,
#158, #159, #160 and #161 on the Owner's words.

Separately, each record-only increment (#154, #158, #160) cost a full PR cycle. Some of those cycles
included three role runs of about 200k tokens each. None of them changed schema, code, a test or a gate.

## 2. The rule proposed

1. **Delegated merge.** The Product Owner may delegate the merge of a named PR, or of a stated sequence
   of PRs, to the Author, in words, in session. A merge performed under that delegation **is** the
   Owner's manual merge under RFC-2026-002. It requires all of the following:
   - the required CI check is green on the PR's head;
   - the merge is a merge commit pinned to that head (`--match-head-commit`), with no squash, rebase or
     force;
   - every role run the package's gates require has run on that head, or on a head whose later commits
     are that role run's own findings, and no stop-the-line finding is unresolved;
   - the handoff is the last commit and touches only itself;
   - the next state record quotes the Owner's words verbatim and names who pressed the button.
2. **A stop-the-line finding revokes the delegation** for that PR. It goes back to the Owner.
3. **Record-only PRs need no role runs.** This covers a PR whose diff touches only `evidence/**`, the
   package's own handoff, the branch-slot lines in `test-kits/branch-identity.test.mjs` and
   `test-kits/integrity-manifest.json`, and open-blocker text in the package's own manifest. It may merge
   on green CI under a delegation. A PR that touches a migration, a script, a test, a fixture, a case,
   CI, or a contract or decision document is not record-only.
4. **The Author still never approves, test-verifies or integrates its own work.** The role runs and CI do
   that. This RFC moves the button, not the judgement.

## 3. What it does not change

- The separation of duties in `CONTRIBUTING_AGENTS.md`.
- The package gates.
- RFC-2026-024.
- The Integration Owner's ownership of `.github/workflows/ci.yml`.
- The requirement that a stop-the-line finding halts a merge.

## 4. In effect

From its approval, state records stop saying that RFC-2026-002's literal sentence is "not satisfied" for a
delegated merge that meets §2. They say "merged by delegation under RFC-2026-025" and quote the delegation.
Merges before the approval keep the caveat their own records gave them.

## 5. Amendment, APPROVED 2026-09-28 by the Product Owner (C0's review of batch 123, F1–F4; A1's, F8–F9)

**Approved.** The Owner answered `อนุมัติ §5 ของ RFC-025`
(`evidence/WP-0A-DB-00/product-owner-disposition-2026-09-28-rfc-025.md` §5). At that moment §5 held
items 1–6. A0 had told the Owner in session that A1's items 5–6 were being added to C0's items 1–4.
§5 amends §2 wherever the two differ. **Until item 5's mechanical check exists, no PR is treated as
record-only.**

1. **Record-only, narrowed.** The exemption covers only:
   - the package's own state records (`evidence/<package>/session-*.md`);
   - the handoff;
   - the branch-slot lines (`ownership.branch`, the two pinned lines in
     `test-kits/branch-identity.test.mjs`, and the regenerated integrity manifest).

   It does **not** cover:
   - Owner dispositions or role-review files;
   - removing or rewording an open blocker;
   - any other manifest field.

   Where the Author's classification is in doubt, the PR is not record-only.
2. **Fix commits are re-verified.** A commit added after the role runs, answering their findings, is
   re-verified before a delegated merge:
   - by the role run whose finding it answers, when the commit touches only that finding's scope;
   - by all required role runs, when it touches a migration, a script, a case or a fixture.

   What happened with #161 is recorded rather than excused. Its commit `f82a70d` (migration 105 and
   57 lines of cases) merged without re-review.
3. **§3 corrected.** The record-only clause does change what `CONTRIBUTING_AGENTS.md` and RFC-2026-002
   require for such a merge: the per-merge Reviewer, Tester and Integration Owner evidence. §3 should
   say so. The Integration Owner (`/claude/r0_steward`) remains required for any merge the package
   gates require it for. This package has no r0 evidence file, and that is recorded as a gap.
4. **§1 corrected.**
   - The 2026-09-15 disposition is A0's transcription of the Owner's instruction, not the Owner's own
     text.
   - #154, #158 and #160 did change a test file: the pinned branch-slot lines.
   - The "about 200k tokens" figure is A0's estimate from session usage, with no evidence file behind
     it.
5. **A mechanical record-only check** (A1 F8). A test, not the Author's judgement, decides record-only.
   The diff must be additions to the paths in item 1 plus the branch-slot lines, and nothing else. The
   scope check's reading of the manifest from the PR's own head is not a licence: a change to
   `ownership` fields other than the branch slot makes a PR not record-only.
6. **Delegated-merge conditions, tightened** (A1 F9):
   - The PR's head must contain the current `main`, because CI tests the branch and not the merge
     result.
   - No unresolved **security** finding of any grade is open against the PR, which is RFC-2026-002
     clause 4, broader than "no stop-the-line".
   - The delegation must be given after the PR it names exists, or must name its sequence explicitly.
   - The Integration Owner's verdict is required where the package's gates require it.
   - **A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is merged by the
     Owner personally**, never by delegation.

## 6. Amendment, PROPOSED 2026-10-07: a light path for records-only PRs, and mechanical syncs

**Status: Proposed. Not approved.** Nothing in this section applies until the Owner approves it. Until then
§5 governs: under §5 its item 5 check did not exist, so no PR is treated as record-only.

**Origin.** On 2026-10-07, A0 recommended in session "(4) consider fewer review rounds for PRs that are only
records — several times faster; this needs an RFC-2026-025 change, a governance PR the Owner decides". The
Owner replied `ข้อ 4 mw`. A0 reads this as "item 4: do it". That reading is A0's. The words are transcribed
in `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-07-rfc-025-s6.md`. The "several times faster"
figure was A0's estimate when it made the recommendation. Nothing measures it. What §6.5 measures is the
number of role runs and readings.

### 6.1 Definition: a records-only PR, decided by a script

A PR is **records-only** when `node scripts/db/classify-records-only.mjs origin/main <head>` exits **0**
on its head. Exit 1 means the PR is not records-only. Exit 2 is a usage or git error and is treated the
same way: fail closed. The script reads the PR's own diff, `merge-base(origin/main, head)..head`, with
renames off. Every changed path must pass all of the following rules:

1. **Added or modified only.** A deletion, rename, copy or type change is not a record. The file must be a
   regular file with mode `100644`, so a symlink or an executable is not a record.
2. **`evidence/<package>/**`.** A new file is a record. An existing file is a record only if it is
   appended to: the old content must survive whole as the prefix of the new content. This rule stops the
   light path from rewriting a role's verdict or a transcription of the Owner's words.
   `evidence/VERIFICATION.md` and any file directly under `evidence/` are not records.
3. **`handoffs/*.json`.** Added or modified.
4. **`work-packages/*.json`.** Modified only. Both sides must parse. Each field must be deep-equal to the
   base except these:
   - `status`, which must still be a string. The schema and the role-separation validators still judge
     the value.
   - `open_blockers` and `required_human_authorities`: **append-only** lists of strings. Nothing may be
     removed or reordered. Every old entry stays whole, either unchanged or kept verbatim at the start of
     its new text (text appended) or at the end (a transcribed closing clause put in front of it, the way
     PR #201 closed CON-003's `open_blockers[10]`). New entries may follow at the end.
   - `ownership.amended_by`: the same entries in the same order. Only keys that begin with `acknowledg`
     may change or be added. This is the acknowledgement transcription.
   - `ownership.amends_without_owning`: may be **narrowed**, meaning paths are dropped and never added.
     Its `rationale` may be restated for the increment.
5. **Anything else is not a record.** This covers every script, test, case, fixture, migration, contract,
   schema, RFC, CI file, `CONTRIBUTING_AGENTS.md`, `package.json`, lockfile, the integrity manifest,
   `ownership.branch`, `writable_paths`, `role_assignments` and every other manifest field.

§6.1 is narrower than §5 item 1 in one place. The branch slot (`ownership.branch`, the pinned lines of
`test-kits/branch-identity.test.mjs` and the regenerated integrity manifest) is **not** records-only under
§6. A PR that moves a branch slot touches a test file and a generated digest file, and those take the full
path. It is wider than §5 item 1 in two places, each named here for the Owner. First, it admits any file
added under `evidence/<package>/`, while §5 admitted only `session-*.md`. Second, it admits the manifest
fields listed in item 4, where §5 admitted only open-blocker text. The classifier enforces append-only
mechanically. Only the reader of §6.2 can judge whether a transcription is accurate.

### 6.2 What a records-only PR needs

1. **One independent reading** replaces the four role runs and the re-check round. The reader is **R0**
   (`/claude/r0_steward`), or **C0** (`/claude/c0_contract_reviewer`) when R0 is the subject of the records,
   for example when the PR transcribes R0's own verdict or acknowledgement. The reader:
   - runs the classifier on the head and records the command and exit code;
   - reads every added or appended line against its source. A transcription is checked against the role
     file it cites, and a merge fact against `gh`/`git`;
   - records one verdict file under `evidence/<package>/`.

   That verdict file is itself a record, so committing it keeps the PR records-only.
2. **No re-check round** unless the reader raises a **blocking** finding. A fix for a blocking finding is
   re-read by the same reader alone, and only if the classifier still exits 0 after the fix. If it does not,
   the PR has left the light path and takes the full path.
3. **A0 may merge it under the standing delegation.** §2 item 1 still applies: green required CI on the
   head, a merge commit pinned with `--match-head-commit`, the handoff last and alone, and the next state
   record quoting the delegation. §5 item 6 also applies: the head contains current `main`, no security
   finding of any grade is open, and the delegation predates the merge or names its sequence.
4. **The Author still never approves its own work** (§2 item 4). The reading is the independent judgement.
   The classifier only decides which path the PR takes.

### 6.3 Mechanical sync: merging `main` into a PR branch

A merge of `main` into a PR branch is **mechanical** when
`node scripts/db/classify-records-only.mjs --sync <pre-merge-tip> <merge> origin/main` exits **0**. The
command checks that:

- the merge has two parents, and the first is the PR tip;
- the second parent is on `origin/main`;
- `main`, since the PR's old branch point, changed none of the PR's own paths, except
  `test-kits/integrity-manifest.json` and `evidence/VERIFICATION.md`;
- at the PR's own paths the merge equals the PR tip, and at `main`'s paths it equals `main`;
- the merge holds no path that neither side changed.

A mechanical sync **voids no role verdict and needs no carry or sync reading**. The following still apply:

1. Every generated file involved is rebuilt by its generator, never resolved by hand:
   `npm run regenerate:manifest`, then `npm run record:verification`, then a `cmp` (or a clean
   `git diff --exit-code`) against the committed file. A difference makes the sync not mechanical.
2. The handoff refresh comes last and alone (`npm run refresh:handoff` on the branch **name**, then
   `npm run check:handoff`).
3. The required CI check must be green on the final head. CI is what catches a semantic interaction: a
   change on `main` that leaves the PR's paths untouched but changes what they do. One example is a
   validator the PR's records are judged by, which `evidence/WP-0A-CON-006/r0-sync-reading-2026-10-06.md`
   read and measured harmless. The mechanical rule does not claim to see that. It claims only that the
   PR's own text is unchanged.

A sync that is not mechanical keeps the existing rule. Each role verdict whose carry clause is tripped is
carried or re-read by that role.

### 6.4 What does not change

- **Four-role review** (Reviewer, Tester, Security/Privacy where required, Integration Owner) for every PR
  that changes code, a contract, a test, a schema, a case or fixture, a migration, CI or a gate. This
  includes every PR the classifier rejects.
- **Stop-the-line.** A stop-the-line finding by the reader, or any finding later, halts the merge and
  revokes the delegation for that PR (§2 item 2).
- **Security findings.** An open security finding of any grade blocks a delegated merge (§5 item 6).
- **Governance PRs** (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) are merged by the Owner personally,
  never by delegation (§5 item 6). This PR is one.
- §1–§5, RFC-2026-002, RFC-2026-024 and the separation of duties in `CONTRIBUTING_AGENTS.md`.

### 6.5 Measured against the PRs of 2026-10-05 to 2026-10-07

These were measured with the classifier at this branch's head, run read-only over `origin/main`
`7fb0fc05`, first-parent merges since 2026-10-05T12:00 (+07:00). The commands and output are in
`evidence/WP-0A-DB-00/a0-batch-rfc-025-records-path-plan-2026-10-07.md` §3.

- **26 PRs merged. The classifier calls 5 records-only:** #198 (CON-005), #199 (A0-002), #201 (CON-003),
  #205 (CON-004) and #206 (A0-005). These are the five `records-transcription-2026-10-06.md` increments.
  None of the five has a role file in its own diff. Each transcribed wording that R0 had written in
  advance, in a file merged with the PR before it.
- **The other 21 are not records-only, and §6 would change nothing for them.** Examples are #202
  (A0-006's move to `in_review`, which changes `role_assignments`, `independence` and `outputs`, with 11
  role files) and #207 and #208 (`role_assignments`, plus a reworded blocker). A PR that names its role
  runs is not records-only under §6.1.
- **50 merges of `main` into those PRs' branches. The sync check calls 48 mechanical.** The two it
  rejects are the two that drew a reading of substance that night:
  - `31879073` on #196, where `main` changed `test-kits/contracts/catalog-registry.test.mjs`. This is the
    sync that C0's and Q0's carry readings and R0's R-1 in `evidence/WP-0A-CON-004/` were written for.
  - `f6652ee0` on #197, where `main` changed `scripts/test-suite-contract.mjs`
    (`evidence/WP-0A-A0-004/r0-ci-sync-reading-2026-10-06.md`).

  The other eight R0 sync readings of 2026-10-06 each read a sync the check calls mechanical. Each ended
  with the verdict standing and no stop-the-line. That was read from the files and not re-measured.
- **What §6 would have saved that night, counted in readings and not in tokens or time:** the eight sync
  readings on mechanical syncs, plus the role runs a records-only PR would otherwise need, one reading in
  place of four. No figure for tokens or time is claimed.

### 6.6 What is owed if the Owner approves

1. **CI wiring.** The classifier is a script, and CI does not run it. WP-0A-A0-004 owns
   `.github/workflows/ci.yml`. A step that prints the classifier's verdict on every PR, without gating on
   it, is owed there. That is a CI change, a governance PR of its own.
2. **The classifier is not itself digested.** Its test,
   `test-kits/db/foundation-contract.test.mjs`, is digested, so gutting the classifier turns that test red.
   The script file is not in `test-kits/integrity-manifest.json`. Adding it means a `DIGESTED_FLOOR` line
   in `scripts/verify-test-coverage-floor.mjs`, a path this package does not own.
3. **`CONTRIBUTING_AGENTS.md`** ("Temporary manual merge control") should cite §6 once it is approved. That
   file belongs to WP-0A-A0-001.
4. **The script's home.** It lives in `scripts/db/` because WP-0A-DB-00 owns this RFC and that path. If the
   Owner prefers a protocol path such as `scripts/`, moving it is a WP-0A-A0-001 or A0-002 change.

### 6.7 Questions for the Owner

- **Q-025-6-1.** Approve §6 as written: yes or no. A0 recommends yes.
- **Q-025-6-2.** Should a branch-slot move stay off the light path, as §6.1 says, or be admitted as in
  §5 item 1? A0 recommends keeping it off. It touches a test file.
- **Q-025-6-3.** Should a transcribed closing clause put **in front of** a blocker's verbatim text count
  as append-only (§6.1 item 4)? Two of the five transcriptions above depend on it: #201 (CON-003
  `open_blockers[10]`) and #206 (A0-005 `open_blockers[3]`). Without it, neither is records-only, as
  measured with that branch of the rule removed. A0 recommends yes, because the reader of §6.2 checks the
  clause against its source.
