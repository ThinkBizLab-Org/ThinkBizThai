# Product Owner disposition, 2026-10-05: #181's merge, and RFC-2026-023 brought current and RFC-2026-028 drafted

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-05. Only the
words quoted verbatim in §1 are the Owner's own text. The file approves no merge, approves neither RFC,
answers no question and grants no role's signature. The file name carries the phase's date (2026-10-03), as
every disposition of this phase does. Plan: `a0-batch-rfc-023-028-plan-2026-10-03.md` in this directory.

## 1. The Owner's words this batch is written under

On 2026-10-05, after batch 171 was merged, A0 recommended the next work: **draft the RFC for DATA-DEC-03 (the
worker's identity) and review RFC-2026-023** — the two items that unblock RFC-2026-026's implementation, the
141/160 migrations and the §11.4 closing command. The Owner replied, verbatim:

> ทำต่อตามแนะนำเลย

In English: "Continue as recommended."

A0's message that the words answer is not itself recorded in the repository; its content is stated above as
A0's summary of it, and the Owner may correct that summary.

The phase is run under the Owner's direction of 2026-10-03, verbatim, `เอาตามที่แนะนำเลย ลุยต่อ` ("go with
what was recommended, carry on"), and the session's goal, verbatim, the doubled `น` the Owner's,
`คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว` ("keep going until the phase is done, then review
once"); both are transcribed in `product-owner-disposition-2026-10-03-batch-129.md` §1. The phase plan is
`a0-phase-plan-141-170-2026-10-03.md`.

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-05 | `คุณตะลุยไล่ไปได้เลนไม่ต้องรอผม` / `เอาตามที่คุณแนะนำทุกอย่าง`, then `ครับ` to A0's plan | `product-owner-disposition-2026-10-03-batch-171.md` §1 and its appended section, the delegation of A0's recommendations |

## 2. What A0 reads the words to mean for this batch

- **Two pieces of text work, no migration.** RFC-2026-023 is brought current with everything decided since it
  was proposed on 2026-09-15, and stays **In review**. RFC-2026-028 is drafted, **Proposed**, answering
  DATA-DEC-03 (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:866`). So **no migration number is asked
  of the Owner.**
- **The words approve neither RFC.** They answered a recommendation to draft and to review; they did not
  approve a text that did not yet exist (RFC-2026-028) or a revision not yet reviewed (RFC-2026-023). Each
  approval stays the Owner's explicit act, which the Owner may take through the delegation of A0's
  recommendations, with A1's review. **A0's recommendation on approving each, and its conditions, is the
  plan's §6**; a later batch takes it through the delegation and records it where it is taken.
- **The writable-path amendment for RFC-2026-028 is A0's packaging, under the same words.** A new RFC path
  needs one (`CONTRIBUTING_AGENTS.md`, ownership and change control); batch rfc-026-027 is the precedent. It
  adds exactly one path beside 021-027 and nothing else (plan §1, items 3-5).
- **"Review once" at the end of the phase is the Owner's own review.** It does not replace this batch's role
  runs (C0, A1, Q0), and it does not change who may approve what.

This reading is A0's. A correction from the Owner replaces it.

## 3. The merge of #181: A0 executing the standing delegation

A0 merged PR #181 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/181>, batch 171, branch
`agent/claude/WP-0A-DB-00-batch-171`) at its reviewed head `d99d22c`. The merge commit is `921efb5`, merged
2026-10-05T00:15:42Z. The required check `bootstrap` ("Bootstrap validation") was green on that head
(run 37245602888).

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided, in
`product-owner-disposition-2026-10-03-batch-127.md` §6, that A0 presses the merge of a batch that is done: CI
green, the role runs' findings cleared, no stop-the-line. That #181 met that bar is A0's reading, recorded in
#181's own plan (`a0-batch-171-plan-2026-10-03.md` §9) and its re-checks (C0, A1, Q0). The RFC-2026-025 §5
points stay open: Integration Owner evidence is still owed (`open_blockers[188]`), and RFC-2026-002's rule as
CONTRIBUTING_AGENTS.md states it ("Before the Product Owner merges, ...") is not met literally when A0 presses
the button. This file does not claim it is.

## 4. This batch

Branch `agent/claude/WP-0A-DB-00-batch-rfc-023-028`, from `921efb5`. No draft preceded it.

1. **RFC-2026-023, In review, brought current**: new §0 records what changed since 2026-09-15 (RFC-2026-024's
   withdrawn condition; RFC-2026-025 and the delegations as the approval route; RFC-2026-026's command half
   and its §8.1/1 static rule and §8.1/6; RFC-2026-027's admitted-state gate, which Q-027-4's answer asked to
   be written here now; batch 170's revoke of the client `lifecycle_state`; the 127-129/170-assert probes);
   §3.2 carries the gate and corrects two omissions found against the tree; new §8 proposes **the §11.4
   closing command as the first command function**; §9 lists Q-023-1..8, each with A0's recommendation.
2. **RFC-2026-028, Proposed, drafted**: the worker's login role (`app_worker_login`, `LOGIN NOINHERIT
   NOBYPASSRLS`, member of `app_worker` alone `WITH INHERIT FALSE, SET TRUE, ADMIN FALSE`, `SET LOCAL ROLE`
   per transaction); FORCE RLS read through RFC-2026-016 §4's register; credential custody with no secret in
   the repository and a generated per-cluster test credential; the request, correlation and causation id
   sources; the `S` cells it serves first (RFC-2026-026's audit worker half, then §11.4's purge job, then the
   retention sweep); how the probes of batches 127-129 and 170-assert pin it; the migrations it implies;
   twelve test obligations with drifts; alternatives; rollback; Q-028-1..12, each with A0's recommendation.
3. **The writable-path amendment** for RFC-2026-028, with its registration as a decision record.
4. **Blockers**: `[113]` and `[195]` appended; new `[199]` holds both approvals, the twenty questions, and three
   findings with their owners — RFC-2026-023 §3.2's omissions; `app.jobs` keeping no `actor`, `request_id` or
   `correlation_id` although RFC-2026-026 §3.5 sources them from the job; and RFC-2026-017 §3 and the
   service-policy map disagreeing on who runs the retention sweep. None is stop-the-line.

## 5. What this file does not do

- It does not mark this batch ready, approve it, or merge it. Its role runs (C0, Q0, A1) follow, and the PR
  stays a Draft until they report. Under the standing delegation, A0 may then press the merge only if the bar
  of 127 §6 is met. A stop-the-line finding halts it.
- It does not approve RFC-2026-023 or RFC-2026-028, and does not answer any of Q-023-1..8 or Q-028-1..12.
- It does not sign for A1, A1 Identity, A6, operations or the Integration Owner. Where the repository requires
  a distinct human role, that role's acceptance is owed and is recorded as owed (`open_blockers[199]`).
