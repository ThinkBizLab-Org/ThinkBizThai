# Product Owner disposition, 2026-10-03: #164's merge, parallel work, and batch 126's open decisions

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) transcription of the Owner's words in session, not the Owner's
own text. It records decisions and the questions still open. It approves no merge and grants no
role's signature.

## 1. The Owner's words, verbatim

| Date | Words | What they answered |
|---|---|---|
| 2026-10-03 | `งานอะไรกระจายทำได้ทำเลยนะครับ` ("whatever work can be spread out, go ahead and do it") | Delegates parallel work: A0 may fan work out to runs in parallel rather than one batch at a time. |
| 2026-10-03 | `ใช่ merge ทำต่อได้เลย` ("yes, merge, and carry on") | A0's question whether A0 may press a merge itself when the Owner says `merge แล้ว ทำต่อได้เลย`. |

The English glosses are A0's.

## 2. The merge of #164 (batch 091)

**What A0 asked.** After #162 and #163, each merged by A0 on the Owner's `merge … แล้ว ทำต่อได้เลย`
(`product-owner-disposition-2026-09-28-after-162.md` §4, `product-owner-disposition-2026-09-28-batch-091.md`
§3), A0 asked the Owner directly whether A0 may press a merge when the Owner says `merge แล้ว ทำต่อได้เลย`,
as that disposition's "For the next merge" invited.

**The answer.** `ใช่ merge ทำต่อได้เลย`, 2026-10-03.

**What A0 did.** On that answer A0 merged PR #164
(<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/164>) at its reviewed head
`7c1537ae983b3b94db454ad936bc56d81fa77b9d`, with its one required check, `bootstrap`, green on that
head (run 37103243716, completed 2026-10-03T06:33:58Z). The merge commit is `e5380b0`, at
2026-10-03T07:02:38Z. The third-round re-checks of Q0, C0 and A1 had each found nothing blocking the
merge (`a0-batch-091-integration-2026-09-28.md` §7).

**A0 EXECUTED the Owner's decision; A0 did not make it.** The Owner's answer settles, for A0, the
question the #163 disposition left open: when the Owner says merge, A0 may press it. It does not
decide the RFC-2026-025 §5 points.

**The RFC-2026-025 §5 points remain open.** The blocker beginning "RFC-2026-025 §5, WHAT IT LEAVES
OPEN, FOR THE OWNER" is unchanged by this answer: the Owner's words were about who presses a merge
the Owner has decided, not about the RFC's text. RFC-2026-002's rule, as CONTRIBUTING_AGENTS.md states it
("Before the Product Owner merges, …"), is still not met literally when A0 presses the button, and this file does not claim it is.

## 3. Batch 126: the decisions the Owner has not yet made

Batch 126 (`agent/claude/WP-0A-DB-00-batch-126`; plan `a0-batch-126-plan-2026-10-03.md`) is the
hardening batch A0's batch-125 record recommended after 091, written under the Owner's
`งานอะไรกระจายทำได้ทำเลยนะครับ`. It puts four decisions to the Owner. **All four are UNANSWERED.**
The batch is written on A0's recommendation for each, so that the Owner can read what the
recommendation does before deciding; any other answer is a forward change.

| # | Question | A0's recommendation | Why | Status |
|---|---|---|---|---|
| **O1** | The new migration is numbered **126**, inside MOD-120's range 115–129 (publishing-metrics, A6), though the table is MOD-090's (approval-calendar, 090–099). May A0 keep numbering its forward fixes after the newest table they must follow? | **Yes, keep 126.** | It must sort after 125, whose function it replaces; nothing reserved 126; 123 and 125 set the precedent. Renumbering into 090–099 would sort before 120–125 and could not replace 125's body. The Integration Owner may prefer to record the exception in the register. | UNANSWERED |
| **O2** | Keep `CHECK (decided_at >= created_at)` (A1's remedy called it optional)? | **Keep it.** | It refuses a decision dated before its request (A1 V5 measured 1.03 s). No environment holds approval rows before G0, so it applies over nothing. The owed remediation for adding a CHECK over existing rows (Q0 F8, A1 F7 on 123) still applies before approvals exist anywhere. Dropping it means removing it from 126, its block, `PINNED_CHECKS` and the test. | UNANSWERED |
| **O3** | The INSERT branch overwrites any `decided_at` an inserting writer sends, the 090 fixture's fixed 2026-09-11 times included. Accept? | **Accept.** | It makes `decided_at` the database's for INSERT as well as UPDATE (A1 V1, C0 F6). The fixture's decided rows are no longer fully deterministic in `decided_at`; no case reads them. The alternative is an exemption for a named writer, which would be a grant reviewed against no caller. | UNANSWERED |
| **O4** | `cancelled` and `expired` are final, as `approved` and `changes_requested` are, for every writer that fires triggers. Accept? | **Accept.** | A1's remedy 1. No documented flow leaves a terminal state. Batch 160's anonymisation (blocker 186 item 16) already met 125's refusal on `decided_by`; its route must now also account for `status`. | UNANSWERED |

## 4. What this file does not do

It does not mark batch 126 ready, approve it, or merge it. Its role runs (C0, Q0, A1) follow, and
the PR stays a Draft until they report.
