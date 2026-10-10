# R0 review of PR #243: the A5 owner assessment of CTR-NTF-001 and its owner decisions (NTF item 2, part 2)

| Item | Value |
|---|---|
| Role | R0, Integration Owner of WP-0A-CON-006: `/claude/r0_steward` |
| PR | #243, WP-0A-CON-006, draft, base `main` |
| Head read | `7ee39626d89e0d00ee32f91d782884805a64d9de` (verified with `gh pr view 243 --json headRefOid,headRefName` after `git fetch`; `git ls-remote` gives the same SHA for the branch) |
| Branch read | `agent/claude/WP-0A-CON-006-stale-blockers` |
| `origin/main` at reading | `9d0751ece9ba71c6bb7812f55dd04ab3c4b96c4b` (#242), which is the branch's merge base: the head contains current `main` |
| Worktree | new branch `r0/WP-0A-CON-006-ntf2b-2026-10-10` at that head |
| Tier | **H** (`classify-review-tier.mjs`, base's copy) |
| Verdict | **`integration_verified`** for this increment, with press conditions (§5). The package status stays `in_review`. |
| Stop-the-line | **No** |

## 0. Who I am

I am a subagent spawned by `/claude/a0_atlas` (A0, this package's Author, who also applied A5's decisions and wrote
the profile disclosure under review), acting as `/claude/r0_steward`. I share a vendor and a model
(`claude-opus-5-5`) with A0, with `/claude/a5_loom` (whose assessment this PR carries), and with C0, A1 and Q0. That
is the same-lineage arrangement the Owner accepted with disclosure (disposition 2026-10-09, Q4); it is a weaker
control than a different-lineage reviewer, and a reader should weigh this verdict accordingly. I hold no Author,
Reviewer, Tester, security, Product Owner, merge or Gate G0 authority. I fixed nothing, pushed nothing and wrote no
other role's verdict. This file is not A5's signature, not A1's acceptance of the Vercel disclosure, not Q0's C-3
re-read, not the Candidate move and not a merge.

My session has the same connectors as A5's re-read measured: `session_connectors_status` at about 12:28Z printed
Vercel (238 tools), Notion, Figma, Claude Docs, visualize and scheduled-tasks `connected`, and Supabase, Microsoft
365, Gmail and Cloudflare Developer Platform `disabled`. That listing is the only connector tool I called.

## 1. Measured and read

### 1.1 Measured on the head

- `gh pr view 243`: head `7ee39626…`, draft, open, mergeable. `Bootstrap validation` run `38051931420`
  (`bootstrap`): **pending** at 12:32:05Z. Not green yet at reading.
- `git log 9d0751ec..7ee39626`: five commits, as the brief lists them. By `git show --name-only`:
  `dce27479` touches only `a5-ntf-assessment-2026-10-10.md` and carries `(cherry picked from commit 96d08f35…)`;
  `2d5db735` touches only `a5-ntf-reread-2026-10-10.md` and carries `(cherry picked from commit 94328f1c…)`;
  `git diff 96d08f35 dce27479` and `git diff 94328f1c 2d5db735` are empty, so the run's words reach the branch
  unedited; `7ee39626` touches only the handoff. `aab9a165` and `936812a3` are A0's.
- `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-006`: exit **0**, "all 10 changed path(s) are declared,
  and every amendment explains one".
- `node scripts/db/classify-records-only.mjs origin/main HEAD`: exit **1** (not records-only; full path).
  `classify-review-tier.mjs`: tier **H**; "both classifiers equal the base's blobs"; `git diff origin/main HEAD --
  scripts/` is empty.
- `node scripts/validate-capability-profiles.mjs`: exit **0**. In `cc-a5-loom.json` no capability value moves
  (`can_access_external_secrets` stays `false`); `unavailable_tools` is unchanged; the only change is the new key
  `limitations.external_connectors_disclosure`.
- **C-1, reproduced.** I extracted A5's `c1.mjs` from its re-read's Appendix B (SHA-256 `f388f652…44b3`, as A5
  recorded) and ran it against **this** head (`node c1.mjs <wt> 9d0751ec 7ee39626…`): output byte-identical to
  A5's recorded `c1.out`. So on the final head: the manifest's only differing field is `untestable_by_schema`,
  expected → head differs in nothing; the schema's only differing leaves are the three `x-` annotations, expected →
  head differs in nothing; with every `x-` key removed base and head are deep-equal; the pins recompute to
  `dfe65f16b2f36949` and count 20 / `d41ba1c066871f44`. `git diff 936812a3 7ee39626` touches no contract, test,
  profile or work-package file.
- **C-T3 probes, reproduced.** I extracted `probe.mjs` and `probe2.mjs` from the assessment's Appendix B (SHA-256
  `8a98e2e6…bd3c` and `9d21cd63…a995`, as recorded) and ran them against this head: output byte-identical to the two
  blocks in the assessment §2. `json-schema-subset.mjs` SHA-256 `9037cc0a…5632`; Node v24.20.0. A walk of the head
  schema finds five `const`s (`deep_link.requires_permission`, and the four `allOf[i].if` selectors); the
  assessment's §2.1 addresses all five. Whether that meets C-T3 is Q0's to rule (C-3); I give it as a measurement.
- **Pins bite.** In my worktree, restoring each moved pin to its old value (`dfe65f16b2f36949` →
  `78c774aedcb5bdbc`; `d41ba1c066871f44` → `6676c9e55382b076`) makes `node --test catalog-registry.test.mjs`
  fail 1 of 19; restored, the worktree is clean. `node --test` of `catalog-registry`, `schema-mutation-coverage` and
  `shared-kernel-envelope-contracts`: 44 pass, 0 fail.
- `npm run regenerate:manifest`, then `git diff --exit-code`: **clean**. The one digest that moves base → head is
  `catalog-registry.test.mjs` (`fc079471…` → `e6dca3dc…`), which is `shasum -a 256` of that file at the head.
- `work-packages/WP-0A-CON-006.json`, by script against `9d0751ec`: only `open_blockers` and
  `ownership.amends_without_owning` differ; `open_blockers` grows 28 → 30 with `[0]`–`[27]` byte-equal; the base
  `rationale` is an exact prefix of the new one; `status` stays `in_review`.
- **`open_blockers[28]`** is my §5 words from `r0-review-2026-10-10-ntf2a.md`, verbatim, with only the five
  placeholders filled (script: `True`). The fills are correct: `gh pr view 242` gives head `423f2db7…`, merge
  `9d0751ec…` at 08:32:26Z; `git log -1 9d0751ec` gives parents `ecc6911b…` and `423f2db7…`; `gh run view
  38037578111` is `Bootstrap validation`, success, on `423f2db7…`; `26d77f52` is my #242 file as carried on that
  branch.
- **O-1** (A5's observation): the base schema wrote six Thai characters in `delivery.x-source` as `\uXXXX`; the head
  writes them raw. No other catalog schema uses escapes, and CTR-USG-001 writes Thai raw, so the head now matches
  the catalog's convention. No pin or integrity entry hashes `ctr-ntf-001/schema.json` bytes.
- Open PRs at reading: #243 only.

### 1.2 Read, not measured

- `CONTRIBUTING_AGENTS.md`; the Owner's disposition `product-owner-disposition-2026-10-09-ntf-a5.md`; the Owner's C-2
  disposition of 2026-10-10; `cc-a5-loom.json` (`role_scope`, `benchmark_outcome`); my §5a in
  `r0-review-2026-10-10-ntf2a.md`; A1's `a1-review-2026-10-10-ntf2a.md` §3 and §4; RFC-2026-031 §4.1; RFC-2026-025
  §5 item 6; the handoff at the head.
- A5's assessment and re-read in full. I did not check A5's source-line citations to the plans and register (C0's),
  did not rule on C-T3 (Q0's) and did not rule on item (5) or the Vercel reading as security matters (A1's). The
  Owner's answer times rest on A0's reading of the session transcript.

Not run by me: the full suite, `check:handoff` on the branch name and `record:verification`. Those are Q0's, on the
branch name; CI runs the suite on the head.

## 2. Is the increment integration-sound?

**Yes.**

- **Scope.** Every changed path is in `writable_paths` or declared in `amends_without_owning` with its reason. Each
  amendment moves only what its guard demands: two caveat/annotation pins with dated comments, one generated digest,
  one profile key.
- **Contract surface.** No schema constraint, fixture, requiredness, enum, version or freeze level moves (measured,
  §1.1); `status` stays `Draft`. The text that moves is A5's word for word, and A5 as owner stated it before A0
  applied it, which is the order Register §4.1 and §5a item 5 ask for. Item (6) fills the composition the Draft
  declared OWED; item (5) states runtime obligations and claims nothing the schema enforces.
- **NTF order.** This PR is sequence item 2's second part and nothing beyond it: no Candidate move, no RFC-2026-010
  line, no new authority for the run, no status moved. `open_blockers[1]`, `[2]`, `[19]`, `[22]` stay open.
- **Records.** Append-only holds on `main`'s entries. `[29]` was extended within this branch before any merge, which
  touches no merged entry. `[28]` is exact (§1.1).
- **The profile key.** `external_connectors_disclosure` is what the Owner chose (option (ก), 12:03:15Z) over an RFC
  (option (ข)). It changes no capability value, no `role_scope`, no authority sentence and neither the capability
  schema nor the validator. It is not governance under RFC-2026-025 §5 item 6 ("an RFC, `CONTRIBUTING_AGENTS.md`, CI
  or a gate"), the same reading as #238 and #242.
- **Sync.** The head contains current `main`. No sync is needed while `main` stays at `9d0751ec`.

### 2.1 R0 §5a, item by item

| §5a item | On `7ee39626` |
|---|---|
| 1. Base contains #242's merge | **Met**: merge base `9d0751ec` is #242's merge. |
| 2. Scope: `[1]`, `[2]`, `[19]`, `[22]` only; no status, no Candidate move, no RFC-010 line | **Met**. The F-items and the `tenant_context` observation are A5's notes on what stays owed, not assessments of other work. |
| 3. §0 in every A5 file; values confirmed or corrected; a correction in the profile before a signature is cited | **Met, subject to A1.** Both A5 files carry §0. The correction A5 asked for (`false` → `true`) is barred by the schema's `const: false`; the Owner chose turning four connectors off plus a Vercel disclosure. A5 re-measured and accepted that as meeting C-2 (re-read §3.2), and my own listing agrees. The Owner's second answer also needs **A1's** acceptance (press condition 3). |
| 4. C-T3 met, and Q0's re-read on the PR before its press | **Open: Q0's.** My reproduction of the probes is byte-identical (§1.1), and §2.1 of the assessment covers all five `const`s, `kind`'s absent case stated as having no fixture. Q0 rules. |
| 5. The run's words unedited; owner changes stated by A5 and re-reviewed | **Met as to A0 and A5** (cherry-picks are byte-identical; C-1 reproduced). Re-review by C0, A1 and Q0 is open. |
| 6. A1, C0, Q0 re-read; four roles pass on the final head; CI green | **Open.** No C0, A1 or Q0 file for this PR is on the head; bootstrap is pending. A1's SC-2 confirmation (`a1-review-2026-10-10-ntf2a.md` §3) is on main and item (4) is unchanged (C-1 probe). |
| 7. Owed records from R0-242-4 | Still owed; not a press condition (R0-243-3). |

## 3. Findings

Stop-the-line: **no**. No finding is blocking.

- **R0-243-1 (advisory, press gate).** At reading, bootstrap run `38051931420` is pending, and no C0, A1 or Q0
  verdict for this PR is on the branch. Those are press conditions (§5), not faults of the increment.
- **R0-243-2 (advisory, for the Owner via A0).** The Vercel disclosure is session-scoped. Its sentence "Supabase,
  Microsoft 365, Gmail and Cloudflare are turned off for the session" will read as current in any later session
  where they are on, and the Owner's answer leaves the same reading for the other Claude profiles of this session
  undecided (C0, A1, Q0, R0 and A0 all ran with Vercel connected and their profiles declare `false`; I used no Vercel
  tool). This does not bear on A5's signature, which was given in this session. A0 should put the open question to
  the Owner, separately and not as a condition of this press. Any *new* act of `/claude/a5_loom` in another session
  needs a fresh measurement before it relies on the profile.
- **R0-243-3 (advisory, records owed).** Owed by each package's next PR: WP-0A-A0-001's `amended_by` record of both
  `cc-a5-loom.json` amendments (`benchmark_outcome`, #242; `external_connectors_disclosure`, this PR); WP-0A-CON-008's
  record of the pin moves (#242's and this PR's two); WP-0A-A0-002's record of the digest moves. As Integration Owner
  of WP-0A-CON-008 and WP-0A-A0-002, I acknowledge the moves measured in §1.1:
  `ctr-ntf-001.untestable_by_schema` `78c774aedcb5bdbc` → `dfe65f16b2f36949`, `ctr-ntf-001` annotations count 20,
  `6676c9e55382b076` → `d41ba1c066871f44`, and the one integrity digest `fc079471…` → `e6dca3dc…`.
- **R0-243-4 (advisory, before Frozen).** A5's F-1 is a real cross-package mismatch: batch 051 stores
  `notification_id` as a per-recipient uuid primary key, while the contract admits any 1–128 string and one
  command can reach several recipients. That is acceptable at Candidate (a Draft→Candidate move is not freeze), but
  051 belongs to WP-0A-DB-00, so the record must reach that package too. The step-3 PR carries F-1 to F-5 as an
  open entry (§6 item 8).
- **R0-243-5 (advisory, wording).** The manifest still cites `invalid-dedupe-key-contact-detail.json` for three cases
  (email, E.164, spaced name), and A5 measured that it isolates `+` only (assessment §2 point 3). The fixture keys also
  do not follow OD-4 (F-2). Both are declared and owed before Frozen. No change on this PR.

## 4. May A0 press?

**Yes, under the Owner's Q3 (`ให้ A0 กดทั้งชุด (Recommended)`, sequence item 2), once every condition in §5 holds.**
The delegation names its sequence explicitly (RFC-2026-025 §5 item 6), this PR is not governance (§2), and tier H
puts all four roles on the final head.

## 5. Press conditions

A0 (`/claude/a0_atlas`) may press PR #243 when all of the following hold on one final head:

1. **Role verdicts**, each on `7ee39626` or on a later head its own carry clause reaches: C0 `review_approved`;
   A1 `security_approved` or `security_approved_with_conditions`, with no security finding of any grade open;
   Q0 `test_verified`; R0 this file. No blocking finding open.
2. **C-3 (Q0).** Q0's file states that the assessment meets C-T3 (a)–(c). If Q0 finds it does not, or withdraws its
   recommendation under its own rule, the press waits for a new Owner decision (§5a item 4).
3. **C-2 (A1).** A1's file states whether it accepts the Vercel disclosure reading (`false` as a policy prohibition,
   for Vercel). If A1 refuses, there is no press: the Owner's answer (ก) rests on that acceptance, and the matter
   returns to the Owner.
4. **C-1 re-reads.** C0, A1 and Q0 each state that the contract text is A5's (C-1). A1 states whether item (5)
   leaves item (4)'s meaning, and so its SC-2 confirmation, intact.
5. **Commits after `7ee39626`** are each within the carry clause (§8).
6. **Current `main`.** The final head contains `origin/main` as it stands at the press.
7. **CI.** `Bootstrap validation` is green on that exact final head; press with `--match-head-commit <final head>`.

## 6. What the step-3 PR (CTR-NTF-001 Draft → Candidate) must satisfy

1. **Base.** Cut from a `main` that contains this PR's merge. It records §7's words for #243 in `open_blockers`.
2. **Signature citable.** On `main`: A5's assessment and re-read; C-1 met by A5, C0, A1 and Q0; C-2 accepted by A5
   (re-read §3.2) and by A1; C-3 met by Q0. If any of these is refused or missing, the step-3 PR does not open.
3. **SC-2.** A1's confirmation (`a1-review-2026-10-10-ntf2a.md` §3) stands only while item (4) keeps its meaning.
   Item (4)'s text is unchanged on this PR; the step-3 PR must not change it; A1's #243 file must not withdraw it.
4. **The Owner's approval.** Quote Q3's answer `ให้ A0 กดทั้งชุด (Recommended)` and its option description,
   verbatim from the 2026-10-09 disposition file, not the English gloss: "รวมการอนุมัติ CTR-NTF-001 เป็น
   Candidate ตาม RFC-031 §4.1(1) เมื่อ A5 ลงนามแล้ว". Read with the question's own condition ("การเลื่อนสถานะ
   Candidate จะทำเมื่อ A1 ยืนยันว่า SC-2 ครบแล้ว"), that is the disposition naming CTR-NTF-001 for Candidate that
   RFC-2026-031 §4.1(1) requires.
5. **Change set, status only.** `ctr-ntf-001/manifest.json` `status` `Draft` → `Candidate`, version `1.0.0`
   unchanged; the matching entry in `contract-catalog/shared-kernel/index.json`; the status pins in
   `shared-kernel-envelope-contracts.test.mjs` (13/1 → 14/0, CTR-NTF-001 out of `AWAITING_CO_OWNER`) with a dated
   comment naming A5's signature and the Owner's Q3; any other status pin the suite names; the integrity manifest
   regenerated. Each path outside `writable_paths` is declared. No caveat, annotation, constraint, fixture or version
   text changes. Any text change needs A5's re-read, and A1's if it touches items (4) or (5).
6. **Roles.** Tier H, full path: C0, A1, Q0 and R0 on its final head, CI green, current `main`. It is not the
   RFC-2026-010 status line (sequence item 4, the governance PR the Owner presses personally) and freezes nothing.
7. **Closures, in place, index kept**, A0 recording the roles' words in the form of `[18]` and `[23]`. Only the
   bracketed placeholders are filled, from `gh`, `git` or the named file:
   - **`[1]` may close:** "CLOSED `<date>` BY A0 (/claude/a0_atlas) IN PLACE AT THE CANDIDATE MOVE, RECORDING A5'S
     WORDS (index kept; evidence/WP-0A-CON-006/a5-ntf-assessment-2026-10-10.md §3 and OD-1, A5 /claude/a5_loom): A5
     adopts CTR-NTF-001 'as A5's own proposal under Register §4.1'. 'Ratification after the fact cannot undo that
     order.' The qualification stays: cited for any date before 2026-10-10, the '14 of 14 materialized' figure
     counts a non-owner draft; from that date it reads 'ratified by A5 after the fact, same lineage, 2026-10-10'.
     Same-lineage ratification was accepted by the Product Owner with disclosure (2026-10-09, Q4)."
   - **`[2]` may close:** "CLOSED `<date>` BY A0 (/claude/a0_atlas) IN PLACE AT THE CANDIDATE MOVE, RECORDING A5'S
     WORDS (index kept; a5-ntf-assessment-2026-10-10.md §3 and a5-ntf-reread-2026-10-10.md §4): A5's ratification
     is given, RATIFY WITH CONDITIONS, for Candidate only, with C-1 to C-3 met on PR #243 (`<C0, A1, Q0 files as
     merged>`). A5: 'Not met for **freeze**: the Frozen-stage owner signature is a separate act under RFC-2026-031
     §3.2 item 2'. That signature is NOT given; it is owed in open_blockers[`<new index>`] (F-4) and needs its own
     Product Owner disposition."
   - **`[19]` may close:** "CLOSED `<date>` BY A0 (/claude/a0_atlas) IN PLACE AT THE CANDIDATE MOVE, RECORDING A1'S
     WORDS (index kept; evidence/WP-0A-CON-006/a1-review-2026-10-10-ntf2a.md §3, A1 /claude/a1_bastion): 'SC-2 is
     met by item (4) as it reads at `d361f68b`.' Item (4) is unchanged since (A5 OD-2, adopted unchanged); A1's
     re-read on PR #243 (`<A1 file>`): `<A1's sentence on item (5) and item (4), verbatim>`." If A1's #243 file has
     no such sentence, `[19]` does not close.
   - **`[22]` may close:** "CLOSED `<date>` BY A0 (/claude/a0_atlas) IN PLACE AT THE CANDIDATE MOVE, RECORDING A5'S
     WORDS (index kept; a5-ntf-assessment-2026-10-10.md §3 `[22]` table, OD-3 and OD-4): each bound, class and
     declaration is labelled owner decision or inference with its source (C-T3 (a), met as Q0 found in `<Q0 file>`);
     the dedupe key composition is untestable_by_schema item (6). A5's F-1, F-2, F-3 and F-5 stay owed before
     Frozen in open_blockers[`<new index>`]."
   - `[13]` is not closed by the step-3 PR. `[22]` is one of its inputs, and its own conditions need R0's separate
     ruling.
8. **A new entry, appended:** A5's §6 F-1 to F-5 and its `tenant_context` observation, verbatim, as OWED BEFORE
   FROZEN and not Candidate conditions, naming WP-0A-DB-00 (batch 051) for F-1.

## 7. Words A0 records after the merge

A0 appends to WP-0A-CON-006 `open_blockers`, on the package's next PR, with A0's dated attribution prefix and only the
bracketed placeholders filled from `gh` and `git`:

> R0 `/claude/r0_steward` integration_verified for PR #243 (WP-0A-CON-006, NTF sequence item 2, second part:
> `/claude/a5_loom`'s A5 owner assessment of CTR-NTF-001, RATIFY WITH CONDITIONS for Candidate only, and its re-read
> of C-1 and C-2, each carried with `-x`; A5's OD-2 and OD-4 applied in A5's words as `untestable_by_schema` items
> (2) and (3) reworded and (5) and (6) appended, and three schema `x-` annotations, no constraint moved;
> `cc-a5-loom.json` `limitations.external_connectors_disclosure` on the Product Owner's answer (ก) of 2026-10-10, a
> declared amendment) at `<final head>` (`r0-review-2026-10-10-ntf2b.md` on `<R0 commit, as carried>`), bootstrap
> `<run id>` green on that head, `origin/main` `<main sha>` contained, merged as `<merge sha>` with
> `--match-head-commit`, pressed by A0 (`/claude/a0_atlas`) under the Owner's direction of 2026-10-09 Q3 `ให้ A0
> กดทั้งชุด (Recommended)` (sequence item 2); tier H; not a governance PR under RFC-2026-025 §5 item 6. CTR-NTF-001
> stays Draft. `open_blockers[1]`, `[2]`, `[19]` and `[22]` stay OPEN until the step-3 PR closes them in place on the
> words in `r0-review-2026-10-10-ntf2b.md` §6. A5's F-1 to F-5 stay owed before Frozen.

## 8. Carry clause

This verdict carries to a later head of this PR if every commit after `7ee39626d89e0d00ee32f91d782884805a64d9de` is
one of the following:

- (a) another role's evidence file, carried with `cherry-pick -x` and touching only that file;
- (b) a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync` exits 0,
  `regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this PR's paths;
- (c) the handoff refreshed last and alone, with prose that stays true.

Anything else needs this role again, including any change to the contract text, the pins, the profile or
`open_blockers` made in response to C0, A1 or Q0.
