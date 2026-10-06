# WP-0A-CON-002: Author merge reading, 2026-10-06 (PR #193)

Author: `/claude/a0_atlas`, written by a subagent of that run. Author evidence only: it approves,
tests, integrates and decides nothing. A0 executes under the Owner's delegation
`เอาตามที่คุณแนะนำทุกอย่าง`; it does not decide. The package stays `in_review` here.

## What this commit set is

- The four role commits, cherry-picked with `-x` and unchanged: C0 `1f297e11`, A1 `0b5249e6`,
  Q0 `c1cfe8b4`, R0 `6ddd8b10`. That is R0 §5 C1 and action A1.
- This one evidence note, which records the reading R0 §5 action A5 asks the merger to record.
- No code, test, schema, fixture, manifest, index, CI or RFC edit. K2, Q0-R1 and Q0-N1 are **not**
  fixed here: R0 §5 C5 says a fix for any of them voids its verdict.

Note for the merger: R0 C5 lists the commits it permits after `568658c` (the four evidence files,
the handoff refresh, the optional status edit, a clean merge of `main`). This note is an evidence
file under `evidence/WP-0A-CON-002/`, not a code, test or manifest edit, and it carries the A5
reading R0 asked to have recorded. If the merger reads C5 as excluding it, the Owner decides.

## The merge reading (R0 §4 and §5 A5)

1. **No security finding requiring action is open.** A1's verdict is
   `security_approved_with_conditions`; its only blocking item, R1, is the missing green CI run.
   R2 and R3 are Info with no action asked. S11 and the cursor, page-size and hash-algorithm items
   block freeze of the Candidate contracts, not this PR.
2. **This is not a governance PR** under RFC-2026-025 §5 item 6. It changes no RFC, no
   `CONTRIBUTING_AGENTS.md`, no CI file and no gate rule.
3. **Carried to the next CON-002 increment as named conditions**, not closed here:
   - **K2** (C0): `required_tests[6]` says "eight" hostile scheme forms; the test carries ten on
     three targets.
   - **Q0-R1** (Q0): no catalog sweep for conflicting idempotency records.
   - **Q0-N1** (Q0): `format: date-time` accepts calendar-impossible dates. The fix touches the
     shared validator, so every `validate()` consumer is re-run with it.
   R0 A6 asks that Q0-R1 and Q0-N1 be the first things that increment closes.

## Still owed before the merge

- R0 C2: the handoff refreshed last and alone, citing the final head.
- R0 C3: a green `bootstrap` run on that exact head. If no hosted runner is acquired, the run is
  re-run (`gh run rerun`). Nobody merges without a green bootstrap on the exact head.
- R0 C4: `origin/main` an ancestor of the head at the moment of merge.
- The merge itself pinned to the head (`--match-head-commit`, merge commit only), quoting the
  Owner's words verbatim (RFC-2026-025 §2 item 1).
