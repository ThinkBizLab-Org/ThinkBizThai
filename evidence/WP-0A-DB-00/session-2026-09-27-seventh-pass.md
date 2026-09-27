# Session record, 2026-09-27, seventh pass: the post-migrate assertion pass, planned, approved, built and reviewed

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. Written before the Draft PR is
opened. This file is a STATE RECORD and approves nothing. It supersedes
[`session-2026-09-16-sixth-pass.md`](session-2026-09-16-sixth-pass.md) for STATE.

**READ THIS FIRST** if you are the next Author run on this package. **Nothing is merged at the time
of writing.** If the PR has merged since, `main` has moved, and `git log` is the truth, not this
line.

## 1. Where things stand

| Measure | Value |
|---|---|
| `main` at the start | `b07a8d9` (merge of PR #154), CI run `35065233928` success |
| Branch | `agent/claude/WP-0A-DB-00-post-migrate-pass` |
| `npm run verify` on the branch | **clean: exit 0, tests 667, pass 667** (663 before) |
| Isolation cases | 965 (unmoved) |
| Migrations | unchanged, 000..140 |
| `open_blockers` | **188** (187 before: the D01h blocker replaced, plus one new) |

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
3. **A0, before batch 150:** the name-or-token survey, which now also carries A1 F3 and Q0 F5. Then
   a live SECURITY DEFINER search_path probe (Q0 F4, small).
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
- **The assertion floor.** Twice, a hand count of assertions differed from the guard's (278 against
  276, 290 against 288). The floor is always the guard's number.
