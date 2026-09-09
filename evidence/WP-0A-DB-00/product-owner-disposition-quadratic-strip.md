# Product Owner disposition — amending another package's guard

**Recorded:** 2026-09-10
**Authority:** Product Owner
**Subject:** the increment at `2857a3e`, which repairs a quadratic scan in
`scripts/verify-test-coverage-floor.mjs` and adds two tests to
`test-kits/test-coverage-floor.test.mjs`. Both files belong to `WP-0A-A0-002`.
**Evidence origin:** Owner statement in the ThinkBizThai project conversation, transcribed here as
the repository evidence record.

## What was put to the owner

Three questions. **One was answered. Two were not**, and this file says which is which rather than
reading a general "go ahead" as a disposition on all three.

### Question 1 — answered

`scripts/verify-test-coverage-floor.mjs` and `test-kits/test-coverage-floor.test.mjs` are owned by
`WP-0A-A0-002`, not by this package. This increment changes both through
`ownership.amends_without_owning`, which is the mechanism the repository provides and which
`WP-0A-A0-006`, `-008` and `-009` already use for the first of those files. The question was whether
to take that route or to hand the repair to the owning package.

The reason to refuse was stated when the question was put: `WP-0A-A0-002` is itself at `in_review`,
so a package reaching into its code while it waits means whoever reviews it reviews something that
has since changed.

> ยอม แก้ต่อได้เลย

**Disposition: the amendment is permitted.** The repair stays in this increment.

### Question 2 — put, not answered

One of the two added tests is a **wall-clock budget**: `stripNonCode` must finish the largest
discovered suite inside two seconds. The fixed implementation does it in ~11ms and the defective one
took 29,160ms, so the budget has ~180x headroom above the fix and stays ~14x inside the defect. The
handoff records the weakness in its own words — the test "cannot distinguish a reintroduced
whole-buffer scan from a runner that was merely slow." The alternative offered was to drop the cost
test and keep only the answer test: steadier, and with nothing left that would catch this particular
regression.

**No disposition.** The test ships as written, on the author's judgement, and that judgement is
carried in `known_limitations` rather than presented as settled.

### Question 3 — put, not answered

The fix is exact for the four appends that exist today, all of which append whitespace. A fifth
append that placed a non-whitespace character into the buffer without going through the
single-character branch would make the tracked variable stale, and **neither added test would catch
it**: the answer test uses short inputs and the cost test never reads the answer. What guards it
today is a comment sitting at the variable. The alternative offered was to make it a real control,
which appears to require shipping a counter inside the guard for a test's benefit.

**No disposition.** The comment remains the only guard, and that is recorded as a limitation rather
than resolved.

## Why the answered question was the one worth answering

Questions 2 and 3 are engineering trade-offs inside a package's own work. Question 1 is not: it asks
whether one package may change another's code while that other package is waiting to be reviewed.
That is an ownership question, and `CONTRIBUTING_AGENTS.md` puts ownership and change control above
implementation choices in its conflict order. An agent proposing the amendment cannot also authorise
it — and the agent that proposed this one is the same run that wrote the repair, which is exactly
the shape `no_self_approval` exists for.

## What this settles, and what it does not

**Settled.** The two `WP-0A-A0-002` files may be amended by this increment.

**Not settled:**

- Whether `WP-0A-A0-002`'s reviewer must re-review the changed files. This disposition permits the
  change; it does not tell that package's reviewer what to do about it, and the reviewer of
  `WP-0A-A0-002` is entitled to know its code moved while it sat at `in_review`.
- The timing assertion (question 2) and the unguarded fifth append (question 3). Both remain the
  author's readings.

## Explicit limits

This disposition does **not**:

- pass Gate G0, which remains Specification Baseline Complete / External Verification Pending;
- move `WP-0A-DB-00` or `WP-0A-A0-002` out of their current statuses;
- fill `role_assignments.product_reviewer_agent_run_id` in either package. That field wants an
  independent Product/UX **agent run** — the one package carrying a value has `/root/a5_loom` — and
  the Product Owner's own authority is neither that role nor delegated to it under `RFC-2026-013`;
- substitute for the independent Reviewer (`/claude/c0_contract_reviewer`), Tester
  (`/claude/q0_sentinel`), Security (`/claude/a1_bastion`) or Integration Owner
  (`/claude/r0_steward`) evidence `RFC-2026-002` requires before a merge into `main`;
- authorise the merge of PR #105, which is a draft and carries none of those four signatures;
- extend to any other file owned by `WP-0A-A0-002`, or to any future increment. It is a disposition
  on this diff.

## The measurements this increment rests on

Taken on the author's machine, 2026-09-09. These are repository-local readings and involve no
database and no platform.

| | before | after |
|---|---|---|
| `verify:coverage-floor` | 104s | 0s |
| `test-coverage-floor.test.mjs` | 362s | 0s |
| `ratchets-bite.test.mjs` | 702s | 30s |
| `npm run check` | ~830s | 39s |
| CI "Validate repository bootstrap" | 20.3m | 1m |

Equivalence was measured rather than argued: the previous implementation and the new one were run
over every `.mjs` file in the tree and produced **byte-identical output, 54 of 54**. Declared floors
were **raised** (33→35 tests, 95→100 assertions); none was lowered.

The CI figure comes from run `34334678124` on this branch against run `34328122639` on its base, so
it is a comparison between two real runs rather than a projection.
