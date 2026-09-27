# Product Owner disposition, 2026-09-27, in session: the post-migrate assertion pass and its seven questions

`/claude/a0_atlas` (Author) transcribed this from the ThinkBizThai project conversation of
2026-09-27. The conversation had two steps:

1. A0 put three candidate pieces of work to the Owner and recommended "A: the post-migrate
   assertion pass".
2. A0 wrote [`a0-post-migrate-pass-plan-2026-09-27.md`](a0-post-migrate-pass-plan-2026-09-27.md)
   and put its §9 table of seven lettered questions (A to G) to the Owner in session. Each question
   had its options and A0's recommendation, named on the question as a recommendation.

The Owner's words are verbatim. This file is not one of the four role signatures RFC-2026-002
requires, and it decides nothing by itself.

## 1. The Owner's answers (verbatim)

To the choice of work (A: the post-migrate pass; B: batch 091; C: the no-writer blocker class):

> เอาตามคุณแนะนำ

To the seven questions of the plan's §9:

> เอาตามคุณแนะนำ

## 2. How A0 read them, and what they do

The first answer chose the work and nothing more. A0 said so in session before putting §9, and did
not treat that answer as covering the questions.

A0 reads the second answer as **every question taking A0's recommended option**. This is the same
form of answer the Owner gave for batches 120 and 121, and A0 reads it the same way.

| # | Question | Taken as | Consequence |
|---|---|---|---|
| A | form | recommended | Re-run the original `do $$` blocks from the migration files. A register lists superseded blocks, and each one gets a full final-state replacement. Three guards: an unregistered block must pass, a registered block must still fail verbatim, and its replacement must pass |
| B | scope | recommended | All 42 blocks in this PR: the runner, the register, and all ten replacements |
| C | where it runs | recommended | Inside `migrate-clean`, after the FK probe. No new target and no `ci.yml` edit |
| D | CI negative control | recommended | D01h reproduction and the stale-entry guard as measured evidence plus contract tests. One `ci.yml` control line is **proposed** to the Integration Owner and not written by this package |
| E | RFC | recommended | None. The rule is recorded in `db/foundation/README.md` |
| F | blocker | recommended | On merge, close the "D01h in general form" blocker and open one saying that blocks which assert existence alone stay weak |
| G | role runs | recommended | C0, Q0 and A1 |

A0 also reads the answer as the Owner's instruction to carry the work along the path in the plan's
§8, in the same delegated form as batches 120 and 121. Every clause of RFC-2026-002 still applies.
**A stop-the-line finding by any role run halts the merge and goes back to the Owner.**

## 3. What this file is not

- It is not an approval of the proposed `ci.yml` line, which belongs to the Integration Owner.
- It is not an answer to the three decisions the Owner still owes from batch 121: the `10^12`
  bound, A1's grading against its brief, and §3.3 against §4.8.
- It is not a disposition of RFC-2026-023.
