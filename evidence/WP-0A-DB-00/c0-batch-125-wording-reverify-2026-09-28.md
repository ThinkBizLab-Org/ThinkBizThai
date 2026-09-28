# C0 re-verification: batch 125's text corrections (`155d906`, handoff `5d4969e`)

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00 |
| Subject | `155d906` and `5d4969e` (the handoff alone) on `agent/claude/WP-0A-DB-00-batch-125` (PR #163), over `56b10e0`; Author `/claude/a0_atlas` |
| Rule | RFC-2026-025 §5 item 2: a commit that answers a role run's findings, touching only their scope, is re-verified by that role run |
| My review under it | `c0-batch-125-contract-review-2026-09-28.md` (F1–F9). The commit says it answers F2, F3, F6, F7, F8 and F9 in text |
| Date | 2026-09-28 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf.

## §0 What I am

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review. I ran in A0's
  worktree, under A0's brief, and I am the same vendor and model family as the Author.
- RFC-2026-024 withdrew the cross-vendor condition. That does not make me independent of the brief.
- Accepting this file as the Reviewer's re-verification is an act of the Integration Owner and the
  Product Owner, not mine.

## §1 What I did

"Measured" means I ran it. "Read" means I read it and executed nothing.

- **Checkout.** I checked out `5d4969e` in my worktree as `review/c0-batch-125-wording`. This file is
  committed there, and nothing else is.
- **Diff.** I read `git diff 56b10e0 5d4969e` in full. `5d4969e` alone changes one line: the
  handoff's head goes from `56b10e0` to `155d906`.
- **The branch name.** I cloned the worktree into my private directory (`scratchpad/c0-125w/clone`),
  put `agent/claude/WP-0A-DB-00-batch-125` at `5d4969e` and `main` at `7f6cefb`, and measured there:
  - `npm run verify`: exit 0, 674 of 674;
  - `test-kits/handoff-conformance.test.mjs`: "the handoff for this branch describes this branch"
    passes (19 of 19);
  - `node scripts/verify-branch-scope.mjs 7f6cefb WP-0A-DB-00`: exit 0, 20 paths;
  - `npm run scan:secrets` and the role-separation validator: exit 0.
- **No cluster.** Every claim could be settled by reading. The code at `5d4969e` is byte-identical
  to `d85a643`, which I measured in my review (below), so I did not start a cluster. Port 5505 was
  not used, and 5432 and 5499 were not touched.

## §2 Job 1: the commit touches no code (measured)

`git diff --stat 56b10e0 5d4969e`: 5 files, +93/−21.

| File | What changes |
|---|---|
| `db/foundation/README.md` | prose in the catalog-rule section only |
| `a0-batch-125-record-2026-09-28.md` | §5 appended |
| `product-owner-disposition-2026-09-28-after-162.md` | §2 and §4 |
| `handoffs/WP-0A-DB-00-author-handoff.json` | the head, `files_added` (the three review files), and five narrative fields |
| `work-packages/WP-0A-DB-00.json` | `open_blockers` only: entries 186 and 190, edited in place and extended. The count stays 190 |

- `git diff --quiet d85a643 5d4969e` over migrations, invariants, `scripts`, `tests` and `test-kits`
  is clean. No lint snapshot, fixture, case or probe changes either.
- Only one test reads the README: `foundation-contract.test.mjs:2679-2680`. It checks a phrase this
  commit does not touch.
- The three review commits each carry a `-x` trailer. My file in `e8773d4` is byte-identical to my
  commit `0a3ac90`.

## §3 Job 2: the six findings the commit answers

| Mine | The new text | Now true? |
|---|---|---|
| **F2** LOW | Blocker 186 item (8): "UPDATE only: a client-INSERTable attribution column with no closure still passes, owed with created_by at INSERT". The record's §5 and the handoff's next-work item say the same | **TRUE.** The coverage probe reads UPDATE grants only; my D7 and D7u were measured on the same code |
| **F3** LOW | Blocker 190 now opens: "none reached #162's content; #162 itself was merged by A0 on the Owner's instruction" | **NOT TRUE.** The stale clause is gone, but its replacement misstates the facts (**W1**). The moved parenthetical is right: README `:338-341` says "an `app` table" and "Both read schema `app` and role `authenticated` only". A1's N6.g is now in (d) |
| **F6** INFO | README `:356-365`: "cannot be touched by a client"; "for every writer that fires triggers"; for non-clients the trigger does not freeze `status` and does not cover INSERT. Blocker 186 and the handoff's acceptance criterion now say the same | **TRUE where corrected.** Details below the table. Uncorrected copies remain: **W3** |
| **F7** INFO | Record §5: the closure removed alone fails no case and the probe refuses it; the trigger removed fails three cases, one pre-existing; `…-naming-a-decider` now rests on 090's equivalence | **TRUE**, matching my D3, D4 and D5 and `isolation-cases.mjs:13554`. The count "in two places" is short: **W3** |
| **F8** INFO | README: "six families … in eleven probes … The other five are numbered below". Record §5: 124 is reserved for 091's deferred key | **TRUE for both points a text commit can reach.** Details below the table |
| **F9** INFO | Disposition §2 `:29-36` and §4 `:63-65`, and the RFC-2026-002 sentence at `:80-83` | **PARTLY.** The readings and the count are true. The clause-4 pointer is not: **W2** |

**F6 in detail.**
- The write grants on `approval_requests` go to `authenticated` only (`090_approval.sql:477-482`),
  and there is no DELETE grant.
- The trigger reads only `decided_by` and `decided_at` (`125_…sql:55-66`), and my S6 skipped it. So
  "fires triggers" is the right qualifier.
- It is BEFORE UPDATE only (`:75-76`; my I1).
- It never reads `status` for any writer. For clients, the closure holds `status`. "Nothing freezes
  `status` for a non-client" would be exact. This is not a finding.

**F8 in detail.**
- **Six families.** The list has five items, and my review counted eleven claim lines.
- **The 124 reservation.** It now sits in A0's record. The migration registry
  (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:268-274`) lists no forward-fix number,
  not even 105, 122, 123 or 125.
- **"Not yet on any branch".** `git log --all` over `db/foundation/migrations/124*` is empty, and
  `draft/wp-db00-091-on-125` sits at `d85a643` with no commit of its own (measured). That the draft
  exists is read only.
- **The test name** (`foundation-contract.test.mjs:2534`). It needs a test edit, and item (20)
  lists it as owed.

**F9 in detail.**
- **True.** §2 says how A0 first read the words and that แล้ว allows both readings. It counts three
  "merge #162 แล้ว", two of them with ทำต่อได้เลย. §4 and blocker 190's "THIRD INSTRUCTION" agree.
- **Not true.** The clause-4 pointer: W2.

## §4 Job 3: my other findings on blocker 186, and nothing over-closed

| Mine | Where | Grade recorded | Note |
|---|---|---|---|
| F1 LOW | item (11) | LOW | Its remedy carries mine |
| F4 INFO | item (12) | INFO | See below |
| F5 INFO | item (20) | INFO | |
| F6 INFO | item (15), beside A1 V1 LOW | INFO | |
| F7, F8, F9 INFO | item (20), "wording" | INFO | Listed as owed while partly answered here. That over-records; it does not over-close |

**F4.** Two parts of it are not stated in item (12):
- My first half (J1): a keyword drift runs, and its residue commits, before the verdict refuses it.
  Item (12) covers this only through its remedy, "applied before the executor feeds any job".
- The comment I asked to correct, `foundation-contract.test.mjs:2475`, "refused before anything
  runs", is still there.

Both need a test edit and both are INFO.

**Nothing is recorded as closed that is not.**
- Items (1)–(8) and `decided_at` are measured closed in my review, on identical code.
- Items (4) and (8) now carry their open halves.
- Item (2) is recorded closed, and my F1 called Q0 F1's class "narrowed and not closed". Both
  hold: (2)'s remedy as written is done (my J4), and the residual needs a later edit and is item
  (11). My review's Q2 had also accepted (2) as closed.

## §5 New findings

Grades are mine. The Owner may regrade any of them.

### W1: LOW (read and measured). Blocker 190's corrected opening says "none reached #162's content", and #162 added RFC-2026-025

- **The findings are on #162's content.** C0 F1 and F3 on 123's corrections, and A1 N6, are findings
  on RFC-2026-025's text. F3 is about its line 3.
- **#162 added that file.** `5856f0b`, `10d4a2a` and `f429fe6` are in `e276c9a..e77f131`, and the
  file does not exist at `e276c9a` (measured). The disposition says so itself (`:40`: "#162
  carries RFC-2026-025").
- **The reviewers gave a different reason.** They wrote "None of them reaches this PR: §5 item 6
  makes the Owner merge it personally, so no delegation applies to it"
  (`a1-batch-123-corrections-reverify-2026-09-28.md:369-370`). That
  reason failed when A0 pressed the merge. The new clause keeps their conclusion and gives it a
  reason no reviewer gave.
- **Why LOW.** It is F3's class: the first sentence of the governance entry the Owner acts on
  states something false. Nothing else changes.
- **Remedy (a record edit, A0's sentence).** For example: "each is a finding on RFC-2026-025's text,
  which #162 added. The reviewers said none reached #162 because the Owner would merge it
  personally; A0 merged it on the Owner's instruction (see the end of this entry)".

### W2: INFO (read). The disposition points RFC-2026-002 clause 4 at records that do not hold it

- **The sentence** (`:80-83`): "Its clauses 2 and 4 are already recorded on the open blockers: the
  clause-by-clause compliance entry, and the missing Integration Owner evidence".
- **Clause 2** (pre-merge evidence, including the Integration Owner verdict) is on blocker 189, and
  for #57–#92 on blocker 27.
- **Clause 4** ("unresolved security finding … blocks merge") is on neither.
  - Blocker 27 (2026-09-08, #57–#92) records clause 4 as *holding* for those merges.
  - Blocker 189 is about clause 2.
- **The record that bears on clause 4 for #162** is blocker 190 (d), "'Unresolved' (item 6) is
  undefined". A1's N6.e mapped RFC-2026-002 clause 4 there.
- **Remedy.** Point clause 4 at blocker 190 (d).

### W3: INFO (read). "For every writer" survives where the correction did not reach, and §5 undercounts the commit message

- **Disposition §3.2** (`:48-49`): "its decider and time cannot change, for any writer". This commit
  edited that file and left this sentence. My review's Q1 named this exact row.
- **The record's §2 row for A1 F4 / Q0 F7** (`:25`): "refuses any change to a recorded decision for
  every writer". §5 of the same file corrects blocker 186's copy of the sentence, not this one.
- **The commit message count.** Record §5 says `43f4d96`'s message is looser "in two places".
  - My Q2 also named its title's "the probe executor is pinned", which does not hold against J3
    (F1).
  - The title's "a settled approval is immutable" and the body's "for every writer" are F6's
    overclaim.
- **Code comments.** The migration's header comment (`125_…sql:30`) and its `COMMENT ON FUNCTION`
  (`:70-73`, visible in the catalog) say "for every writer". A text-only commit cannot reach them.
- **Remedy.**
  - Add "that fires triggers" to the two record rows, and complete §5's list.
  - Fix the two comments at 125's next edit while it is not integrated, or record them.

### W4: INFO (read). "None is live on the clean set, and each needs a later edit" is not true of two of them

- **Where.** Blocker 186's REVIEWED paragraph and record §5.
- **Item (17).** It is today's behaviour. A1 measured a decision recorded 1.03 s before the
  request's `created_at` on the clean set (V5, NOTE). The size of the gap depends on how long the
  transaction stays open.
- **Item (15).** Its superuser half needs no edit (my S5 and I1). A1 V1's "not live" means not
  reachable by a client, which is true.
- **Remedy.** Say "none is reachable by a client on the clean set". Add that (15)'s superuser half
  and (17) are current behaviour.

## §6 Stop-the-line verdict

**None.**
- **The change.** A text-only commit, with a clean secret scan. It touches no code or migration.
- **The findings.** W1 is a LOW record error, and W2–W4 are INFO. Each can be closed by a record
  edit.
- **The merge.** In my reading nothing here blocks the Owner's merge of #163. Whether W1 is fixed
  first is the Owner's call.

## §7 Limits

- **Independence.** The same brief, worktree, vendor and model family as §0.
- **Not re-measured.** No cluster was run. The rounds I cite (D, S, I, J) are from my review of
  `d85a643`, on identical code. A1's and Q0's numbers are read, not re-measured.
- **Not seen.** The session, other worktrees (the 091 draft), CI on `5d4969e`, and #163's current
  state on GitHub.
- **Scratch files.** They stay in `scratchpad/c0-125w/`, and none is committed.
