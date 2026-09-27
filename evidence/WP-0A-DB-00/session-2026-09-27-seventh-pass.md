# Session record, 2026-09-27, seventh pass: the post-migrate assertion pass, planned, approved, built, reviewed and merged

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. This file is a STATE RECORD and
approves nothing. It supersedes
[`session-2026-09-16-sixth-pass.md`](session-2026-09-16-sixth-pass.md) for STATE.

**READ THIS FIRST** if you are the next Author run on this package.

**Corrected after the merges.** The first version of this file was written before PR #155 merged
and said "Nothing is merged". That stopped being true three times the same day, so this is a
separate increment and not an amendment. The handoff has to be the last commit on its branch, so
the record could not be corrected on the branch it describes.

## 1. Where things stand

| Measure | Value |
|---|---|
| `main` | **`ec59737`** (merge of PR #156). CI run `36312726123`: **success** |
| Merged today, in order | [#155](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/155) the pass (head `3ade42f`, merge `4b98185`); [#157](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/157) the fix for main's red CI (head `d57017e`, merge `b5b944c`); [#156](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/156) the stray `.rej.orig` removed (head `b3ec768`, merge `ec59737`) |
| `main` CI between #155 and #157 | **RED**, run `36311266393` on `4b98185` (§1b) |
| `npm run verify` | **clean: exit 0, tests 667, pass 667** (663 before the pass) |
| Isolation cases | 965 (unmoved) |
| Migrations | unchanged, 000..140 |
| `open_blockers` | **188** |
| Open PRs for this package | none except this record's own |

### 1a. Who merged, and on whose word

**All three merges were pressed by A0, on the Product Owner's order. They were A0's execution of
the Owner's decision, not A0's decision.** The account is `workstationgroup`, the account A0's
`gh` is authenticated as. PRs #152, #153 and #154 were measured to have been authored and merged
through the same account, so the practice is established. The record states it in words so that
a reader does not have to infer it from a username.

- For #155, A0 first declined once, citing `CONTRIBUTING_AGENTS.md` ("The Author never approves,
  test-verifies, integrates, or authorizes their own work") and RFC-2026-002, under which the
  Product Owner merges. The Owner replied `ยืนยัน`. Claude Code's auto-mode permission classifier
  then refused `gh pr merge` twice ("Merge Without Review"), and A0 did not work around it. The
  Owner then said `merge #155 แล้ว ทำต่อได้เลย`, which the GitHub record did not bear out: the PR
  was still a Draft and still open. With the session in bypass-permissions mode, the Owner said
  `merge ให้เลย`, and A0 merged it, pinned to head `3ade42f`.
- #157 and #156 were merged under the Owner's `ทำเลยทุกอย่างตามคุณแนะนำไม่ต้องรอง` (quoted
  verbatim, including its closing typo), in the order A0 had recommended. Each merge was a merge
  commit, pinned to its head, after that head's CI was green.

**What is not satisfied is RFC-2026-002's literal sentence that the Product Owner merges.** The
separation that carries the meaning held for #155: three independent role runs, none
stop-the-line, and every finding either corrected or recorded as a blocker. #156 and #157 had no
role runs. #156 removes a file nothing reads. #157 changes three comparison strings and adds one
test. A reader should weigh them accordingly.

### 1b. Main was red from the merge of #155 (10:02 UTC) to the merge of #157 (10:16 UTC), and the cause was the Author's

After #155 merged, main's CI failed `migrate-clean`: `120_publisher.sql#1 is listed as superseded
… the register entry is stale`. 120's raise lists two policy names through a `string_agg` with no
ORDER BY. The register's `fails_with` had recorded the first name. CI received the two names in
the other order, so an entry whose block failed exactly as recorded was called stale.

#155's own CI run, the Author's cluster and all three role runs had happened to receive the
recorded order, so every earlier run was green by luck. #157 made each `fails_with` stop before
any text-valued `%`, and added a test: a `fails_with` must match one of its block's raises, and
may run past the first `%` only into an argument declared `integer`. **None of the three role runs
found this, and neither did the Author.**

## 2. What was decided, and on whose word

The Owner said `เอาตามคุณแนะนำ` twice. The first chose this work over batch 091 and the no-writer
class. The second answered all seven questions of
[`a0-post-migrate-pass-plan-2026-09-27.md`](a0-post-migrate-pass-plan-2026-09-27.md) §9. Both are
verbatim in
[`product-owner-disposition-2026-09-27-post-migrate-pass.md`](product-owner-disposition-2026-09-27-post-migrate-pass.md).

## 3. What was built

`make db-migrate-clean` now re-runs all 42 apply-time blocks after the full set, each rolled back.
32 run as written. 10 that a later batch legitimately made false are registered in
`db/foundation/invariants/superseded.json`, each with an additive final-state replacement. The
headline is measured and was reproduced by Q0: on `main`, a later file dropping 061's
`usage_events_dimension_known` left every layer green; with the pass, `migrate-clean` fails naming
the block.

## 4. What the three role runs found

None found a stop-the-line. Together they found that the pass's own guards were weaker than its
claims:

- **C0:** the branch failed its branch-scope guard.
- **Q0:** the runner was guarded only by regexes over its own text; replacements were tied to
  nothing.
- **A1:** the register could hide a security regression, and replacements could carry psql
  meta-commands.

All of these were corrected, and each correction was re-applied as a mutation. The full table is in
[`a0-post-migrate-pass-integration-2026-09-27.md`](a0-post-migrate-pass-integration-2026-09-27.md) §2.

## 5. Owed, in order

1. **The Owner:** the two questions in the integration record §4, plus the three still owed from
   batch 121 (the `10^12` bound, A1's grading against its brief, §3.3 against §4.8).
2. **The Integration Owner:** the `ci.yml` control job proposed in the integration record §5.
3. **A0, next:** the strengthening list in
   [`weak-assertion-survey-2026-09-27.md`](weak-assertion-survey-2026-09-27.md) §6. The survey was
   done by a read-only subagent under A0's brief and is a survey, not a review signature. Its first
   item is an FK-action probe in `migrate-clean`: all 87 FKs carry NO ACTION today (measured), and
   m1 and m2 (ON UPDATE CASCADE, and ON DELETE CASCADE under a rename) survive every layer
   (measured). Its second item is text pins of the `updated_by` and requester closures: m3 measured
   a fourth `or true` survivor. Before batch 150: its item 5.
4. **Batch 091:** still A5's by §6. Ask first.

## 6. Housekeeping

- **No scratch cluster was lost this pass.** Each role run had its own port and a private
  subdirectory, and the brief said the parent scratchpad directory is shared. The user's server on
  `:5432` was never touched.
- **The first commit on a branch cut from a merge.** The handoff cited `241f16c`, which is on the
  merge's second-parent side, and `refresh:handoff` refused it as "on no path to this branch". The
  fifth pass's recovery worked: reset the cited head to the branch point (`b07a8d9`), then re-run.
- **Two slips by the Author, caught before they landed:**
  - A mistyped character (a Greek ν) inside a verbatim Owner quote.
  - An automated marker edit that moved a semicolon into a comment in six replacements.

  Each was caught by reading the output, not by a guard.
- **PR #156's description was emptied once by the Author.** A shell redirect truncated the body file before a script read it, and `gh pr edit` posted the empty file. It was restored within minutes, and later edits write to a copy.
- **The assertion floor.** Twice, a hand count of assertions differed from the guard's (278 against
  276, 290 against 288). The floor is always the guard's number.
