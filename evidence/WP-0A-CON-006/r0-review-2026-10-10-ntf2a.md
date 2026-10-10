# R0 review of PR #242: CTR-NTF-001 states SC-2, and the `/claude/a5_loom` benchmark (NTF item 2, part 1)

| Item | Value |
|---|---|
| Role | R0, Integration Owner of WP-0A-CON-006: `/claude/r0_steward` |
| PR | #242, WP-0A-CON-006, draft, base `main`; branch point `9296877418cd0939b07829c915717bf13d571d92` (#239) |
| Head read | `d361f68bb1603380d184c82f3dcac1c308a72e0c` (verified with `gh pr view 242 --json headRefOid,headRefName` after `git fetch`) |
| Branch read | `agent/claude/WP-0A-CON-006-stale-blockers` |
| `origin/main` at reading | `4a0a8bd602e2845d1ffc7e4ed5581c9b41370ebe` (#240 merged after the branch point) |
| Worktree | new branch `r0/WP-0A-CON-006-ntf2a-2026-10-10` at that head; a second, detached scratch worktree for the simulated sync (§1.2), removed afterwards |
| Tier | **H** (`classify-review-tier.mjs`, base's copy) |
| Verdict | **`integration_verified`** for this increment, with press conditions (§4). The package status stays `in_review`. |
| Stop-the-line | **No** |

## 0. Who I am

I am a subagent spawned by `/claude/a0_atlas` (A0, this package's Author and the dispatcher of the benchmark run),
acting as `/claude/r0_steward`. I share a vendor and a model (`claude-opus-5-5`) with A0, with Q0 (who wrote and
scored the benchmark), with `/claude/a5_loom` (the run benchmarked) and with the other reviewers of this PR. That is
the same-lineage arrangement the Owner accepted with disclosure (disposition 2026-10-09, Q4); it is a weaker control
than a different-lineage reviewer, and a reader should weigh this verdict accordingly. I hold no Author, Reviewer,
Tester, security, Product Owner, merge or Gate G0 authority here. I fixed nothing, pushed nothing and wrote no other
role's verdict. This file is not an A5 signature, not A1's SC-2 confirmation, not the Candidate move and not a merge.

## 1. Measured and read

### 1.1 Measured on the head

- `gh pr view 242`: head `d361f68b…`, branch `agent/claude/WP-0A-CON-006-stale-blockers`, draft, open.
  `Bootstrap validation` run `38036065668` (`bootstrap`): **success** on `d361f68b`.
- `git log 92968774..d361f68b`: four commits: `98186d14` (Q0 task sheet, carried), `c9016ca4` (Q0 scoring,
  carried), `56ff27a2` (the increment), `d361f68b` (the handoff, alone).
- `node scripts/verify-branch-scope.mjs 92968774 WP-0A-CON-006`: exit **0**, "all 11 changed path(s) are declared,
  and every amendment explains one". Against `origin/main` (`4a0a8bd6`) it exits **73**, listing only the seven
  paths #240 brought to `main` (the script diffs against the tip, and the branch predates #240). That is a stale
  base, not a scope fault; the sync in §1.2 clears it.
- `node scripts/db/classify-records-only.mjs origin/main HEAD`: exit **1** (not records-only). Full path required.
- `node scripts/db/classify-review-tier.mjs origin/main HEAD`: tier **H**; both classifiers equal the base's blobs.
- By script, against `92968774`:
  - `contract-catalog/shared-kernel/ctr-ntf-001/manifest.json`: still one line (compact JSON); the only key that
    differs is `untestable_by_schema`; the old text is an exact prefix of the new; `status` is `Draft`.
  - `.agents/capability-profiles/cc-a5-loom.json`: the only field that differs is `limitations.benchmark_outcome`.
    No capability value, `role_scope`, `declaration_origin` or authority sentence moves.
  - `work-packages/WP-0A-CON-006.json`: `open_blockers` grows 27 → 28 and `[0]`–`[26]` are byte-equal;
    `ownership.amends_without_owning.rationale` on the base is an exact prefix of the new text;
    `recorded_on` gains only `work-packages/WP-0A-A0-001.json`; `paths` is re-declared to the three paths this branch
    changes outside `writable_paths`; no other key differs; `status` is `in_review`.
  - `test-kits/integrity-manifest.json`: exactly one digest moves, `test-kits/contracts/catalog-registry.test.mjs`.
  - `catalog-registry.test.mjs`: one pin moves, `ctr-ntf-001.untestable_by_schema` `7c05ce2b6365a50e` →
    `78c774aedcb5bdbc`, with a two-line dated comment. The first 16 hex of SHA-256 of the new caveat text is
    `78c774aedcb5bdbc`. `node --test test-kits/contracts/catalog-registry.test.mjs`: 19 pass, 0 fail.
- C-T3 is reproduced verbatim: the blockquote of `q0-a5-benchmark-2026-10-10.md` §6, whitespace-normalised, is a
  substring of `benchmark_outcome` (script, `True`).
- `shasum -a 256 evidence/WP-0A-CON-006/q0-a5-benchmark-key-2026-10-10.md` prints
  `94013cc84328941a6072dfeb3a9f051af00c18d6d219432c5765c54dc8b63a5b`, the hash in the task sheet header and in
  `benchmark_outcome`.
- A grep of the four benchmark files for Thai-mobile-shaped digit runs and `+66`: no hit. The one redaction is a marked
  placeholder (`a5-benchmark-answer-2026-10-10.md`, T3 (ii) row F-1).
- Open PRs at reading: #241 (WP-0A-CON-004 records) and this one. They share no path.

### 1.2 Measured on a simulated sync (not pushed)

In a detached scratch worktree I merged `origin/main` (`4a0a8bd6`) into `d361f68b` (local merge `d13546ed`, never
pushed, worktree removed):

- `classify-records-only.mjs --sync d361f68b d13546ed origin/main`: exit **0**, "mechanical sync … no conflict
  inside the PR's own paths".
- `verify-branch-scope.mjs origin/main WP-0A-CON-006`: exit **0**.
- `npm run regenerate:manifest`, then `git diff --exit-code`: **clean**.
- Under the suite lock (held 08:08:37Z–08:16:34Z, released): `npm run record:verification` exit **0**, "recorded 740
  passing, 0 skipped, 0 todo", then `git diff --exit-code` **clean**; `npm run check` exit **0**, 740 tests, 740 pass,
  0 fail. So `regenerate:manifest` and `record:verification` are both cmp-clean on the sync, as clause (b) requires.

### 1.3 Read, not measured

- `CONTRIBUTING_AGENTS.md`; the Owner's disposition `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md`;
  `cc-a5-loom.json` on `main` (`role_scope`, `benchmark_outcome` before this PR); R0-238-4 in
  `evidence/WP-0A-A0-001/r0-review-2026-10-09-pr238.md`.
- `author-ntf-step2-2026-10-10.md`; the handoff; Q0's sheet, key and scoring; A0's transcription of the answer. I did
  not re-score the benchmark (Q0's), and I did not verify the unredacted-answer hash or the transcript key search,
  which rest on A0's script and the session transcript.

Not run by me on the head itself: the full suite, `check:handoff` and `record:verification`. Those are Q0's, on the
branch name.

## 2. Is the increment integration-sound?

**Yes.**

- **Scope.** Every changed path is in `writable_paths` or declared in `amends_without_owning` with its reason, and
  each amendment moves only what its guard demands: one caveat pin, one generated digest, one profile field. This is
  the route R0-238-4 named for `benchmark_outcome`, so it closes that advisory.
- **Contract surface.** CTR-NTF-001's accepted set does not move: no schema, fixture, requiredness, enum, version or
  freeze-level change; `status` stays `Draft`. The change is caveat text only, and it claims nothing the schema
  enforces: it says outright that the contract has no recipient field and that the check is outside it.
- **Order of the NTF sequence.** The disposition puts SC-2 in the manifest and the benchmark on `main` **before**
  `/claude/a5_loom` signs. This PR delivers both and nothing beyond them: no A5 assessment, no Candidate move, no
  RFC-2026-010 line, no new authority for the run.
- **Records.** Append-only holds (`open_blockers`, `rationale`, `recorded_on`). `open_blockers[19]` stays open, as it
  must until A1 confirms SC-2 (Q3).
- **Governance.** No RFC, `CONTRIBUTING_AGENTS.md`, CI file or gate changes. A capability profile's `limitations`
  text is not governance under RFC-2026-025 §5 item 6 (the same reading as #238, `r0-review-2026-10-09-pr238.md` §2).
  So A0 may press it by the Owner's Q3 direction.
- **Sync.** `main` has moved by #240, and branch protection requires an up-to-date branch (`strict: true`). The sync
  is mechanical (§1.2) and lies within the carry clause (b).

## 3. Findings

No finding is blocking.

- **R0-242-1 (advisory, integration).** The head does not contain current `main` (`4a0a8bd6`, #240), and `main`
  requires an up-to-date branch. Sync before the press. R0 measured that sync as mechanical (§1.2); carry clause (b)
  admits it, and a refreshed handoff after it is clause (c).
- **R0-242-2 (advisory, wording, for A5 and A1).** SC-2's first sentence calls the recipient "the person who opens the
  link", and its last sentence says a link opened by someone else is checked for that person. Read together, the
  check is for **whoever opens**, and the notified recipient is the intended opener. That is the safe reading, but the
  two clauses use "recipient" in two senses. Whether this meets A1's condition is A1's call (Q3); A5 may tighten the
  wording as owner. No change is needed for this PR.
- **R0-242-3 (advisory, wording).** `benchmark_outcome`, after the verbatim C-T3, says Q0's recommendation "is
  withdrawn rather than re-conditioned" where Q0's §6 says it "should be withdrawn". The sentence sits outside the
  verbatim quote and cites §6, so the record is not false, but it states as a rule what Q0 gave as a direction. A later
  edit of the profile (the run's §0 correction, if any) may align it; not a press condition.
- **R0-242-4 (advisory, records owed).** `recorded_on` now lists `WP-0A-A0-001.json`. WP-0A-A0-001's record of this
  amendment of `cc-a5-loom.json` (its `amended_by`), and WP-0A-CON-008's and WP-0A-A0-002's records of the pin and
  digest moves, are OWED by each package's next PR. I acknowledge, as Integration Owner of WP-0A-CON-008 and
  WP-0A-A0-002, the pin move `7c05ce2b6365a50e` → `78c774aedcb5bdbc` and the one digest move as measured in §1.1.

## 4. Press conditions

A0 (`/claude/a0_atlas`) may press PR #242 under the Owner's direction of 2026-10-09, Q3, `ให้ A0 กดทั้งชุด
(Recommended)`, sequence item 2 (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-ntf-a5.md`), when all
of the following hold on one final head:

1. **Role verdicts**, each on `d361f68b` or on a later head its own carry clause reaches: C0 `review_approved`;
   A1 `security_approved` or `security_approved_with_conditions`, with no security finding of any grade open;
   Q0 `test_verified`; R0 this file. No blocking finding open.
2. **Commits after `d361f68b`** are each within the carry clause (§6).
3. **Current `main`.** The final head contains `origin/main` as it stands at the press (R0-242-1).
4. **CI.** `Bootstrap validation` is green on that exact final head; press with `--match-head-commit <final head>`.
5. **A1's SC-2 answer is stated, whatever it is.** The press of this PR does not need A1's confirmation that SC-2 is
   met (that gates the Candidate move, Q3). But if A1 says SC-2 as stated does **not** meet `open_blockers[19]`, the
   wording is corrected on this branch, and re-reviewed, before the press: the run must not ratify a manifest whose
   SC-2 A1 has already rejected (`role_scope`: SC-2 must be in the manifest before the run ratifies).

## 5. Words A0 records after the merge

A0 appends to WP-0A-CON-006 `open_blockers`, on the package's next PR, with A0's dated attribution prefix and only the
bracketed placeholders filled from `gh` and `git`:

> R0 `/claude/r0_steward` integration_verified for PR #242 (WP-0A-CON-006, NTF sequence item 2, first part:
> CTR-NTF-001 `untestable_by_schema` (4) states A1's SC-2, and Q0's forward-scoped benchmark of `/claude/a5_loom`,
> RECOMMEND WITH CONDITIONS (C-T3), recorded in `cc-a5-loom.json` `benchmark_outcome` as a declared amendment) at
> `<final head>` (`r0-review-2026-10-10-ntf2a.md` on `<R0 commit, as carried>`), bootstrap `<run id>` green on that
> head, `origin/main` `<main sha>` contained, merged as `<merge sha>` with `--match-head-commit`, pressed by A0
> (`/claude/a0_atlas`) under the Owner's direction of 2026-10-09 Q3 `ให้ A0 กดทั้งชุด (Recommended)` (sequence
> item 2); tier H; not a governance PR under RFC-2026-025 §5 item 6. CTR-NTF-001 stays Draft. `open_blockers[19]`
> stays OPEN until A1 confirms SC-2 is met. The benchmark is now on main; `/claude/a5_loom` may sign as A5 only
> within `role_scope` and under C-T3.

## 5a. What the second PR (the A5 assessment) must satisfy before its press

1. **Base.** Cut from a `main` that contains this PR's merge, so SC-2 (manifest `untestable_by_schema` (4)) and
   `benchmark_outcome` are on `main` before the run's signature is written.
2. **Scope.** `/claude/a5_loom` assesses `open_blockers[1]`, `[2]`, `[19]` and `[22]` of WP-0A-CON-006 and nothing
   else; its assessment moves no status (`role_scope`). No Candidate move, no RFC-2026-010 line on that PR.
3. **§0.** Every A5 file carries the same-lineage disclosure (Q4) and confirms or corrects the capability values of
   `cc-a5-loom.json`. A correction is made in the profile, by a declared amendment as here or a WP-0A-A0-001
   increment, **before** any signature of the run is cited.
4. **C-T3.** The A5 file meets C-T3 (a)–(c) as recorded in `benchmark_outcome`, and Q0's re-reading against (a)–(c)
   is on the PR before its press. If the file ratifies a `const`-enforced rule without the absent case, Q0's
   recommendation is withdrawn, the signature is not cited, and the press waits for a new Owner decision.
5. **Who writes what.** The run's answer is transcribed by A0 as here (prompt, any resume, git-status record,
   disclosed redactions, hash check), or written by the run itself on the branch; A0 does not edit the run's words.
   Any change the A5 makes to the manifest as owner is the A5's, stated in its file, and re-reviewed by C0, A1 and Q0.
6. **Re-reading.** A1, C0 and Q0 re-read the A5 result (Q4); C0, A1, Q0 and R0 pass on its final head and CI is green
   (Q3). A1's confirmation of SC-2 may come on that PR or the step-3 PR, but before the Candidate move.
7. **Records.** The amendments still owed by R0-242-4, if not yet recorded, are not a press condition for it.

## 6. Carry clause

This verdict carries to a later head of this PR if every commit after `d361f68bb1603380d184c82f3dcac1c308a72e0c` is
one of the following:

- (a) another role's evidence file, carried with `cherry-pick -x` and touching only that file;
- (b) a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync` exits 0,
  `regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this PR's paths;
- (c) the handoff refreshed last and alone, with prose that stays true.

Anything else needs this role again, including any change to SC-2's wording made in response to A1.
