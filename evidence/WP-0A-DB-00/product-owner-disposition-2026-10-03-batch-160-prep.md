# Product Owner disposition, 2026-10-03: #169's merge and batch 160's preparation

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run. It is not the Owner's
own text beyond the words quoted verbatim in §1. It approves no merge, grants no role's signature, and
answers none of the questions in §5.

## 1. The Owner's words this batch is written under

The Owner wrote, verbatim, on 2026-10-03:

> เอาตามที่แนะนำเลย ลุยต่อ

In English: "Go with what you recommended. Keep going."

It accepted A0's recommendation to **end the assertion-hardening chain at batch 129** and directed A0 to
do now everything in the planned batches 141, 150, 160 and 170 that needs no pending decision. The
Owner also set the session's goal, verbatim:

> คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว

In English: "Keep going until the phase is finished, then review it once." (The doubled `น` is the
Owner's own spelling, kept as written.)

Both are already transcribed in `product-owner-disposition-2026-10-03-batch-129.md` §1. No new Owner
words are recorded here.

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-03 | `คุณลุยตามที่แนะนำได้เลย` | the same file, §1-§2 |

## 2. What A0 reads the words to mean for this batch

- A0 does **now** the part of 160 that needs no pending decision: the phase plan's "Batch 160 -- 3. Can
  do now" (`a0-phase-plan-141-170-2026-10-03.md`): the retention map as data, the §11.1 export
  manifest fixture, the §11.4 purge order from the foreign keys, and a design note on the
  anonymisation route.
- What needs a decision is **put to its owner and not taken** (§5). The batch writes no migration, no
  policy, no grant and no retention number, because each would take Q160-a, Q160-b, Q160-d or one of
  DATA-DEC-03..10.
- "Review once" at the end of the phase is the Owner's own review. It does not replace this batch's
  role runs (C0, Q0, A1), and it does not change who may approve what.

This reading is A0's. A correction from the Owner replaces it.

## 3. The merge of #169: A0 executing the standing delegation

A0 merged PR #169 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/169>, batch 141 prep) at its
reviewed head `4d1f10c06f243eb6885e23eff304c63576e5a0f1`. The merge commit is
`c7fe26448b014e35358e85b1344a9f46a609d17a`, at 2026-10-03T17:51:16Z. The required check was green on
that head (run 37141584373, "Bootstrap validation", success).

A0 read the bar of batch 127 §6 as met for #169. The re-checks of 141 prep's review round (C0
`50950e6`, A1 `2d94009`, Q0 `0ce283d`) had reported and were recorded (`68855a6`), the check was green
on the reviewed head, and the head contained main.

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided that A0
presses the merge of a batch that is done. That #169 met the bar is A0's reading.

**The RFC-2026-025 §5 points remain open.** Integration Owner evidence is still owed, and RFC-2026-002's
rule as CONTRIBUTING_AGENTS.md states it ("Before the Product Owner merges, …") is still not met
literally when A0 presses the button. This file does not claim it is.

## 4. Batch 160's preparation, written under that direction

Branch `agent/claude/WP-0A-DB-00-batch-160-prep`, from `c7fe264`; plan
`a0-batch-160-prep-plan-2026-10-03.md`.

- **No migration, so no migration number.** Every item is lint data, a fixture, a static test or a
  record. No `160_*.sql` exists, and no number is asked of the Owner.
- **No retention number.** No row of the retention map carries a window, and the test refuses one. An
  undefined or mismatched class is a finding row with no class, no §10 row number and no behaviour.
- **Nothing here is an Owner decision.** No grant, policy, ownership, P0 scope, RLS meaning or data
  classification changes.
- **What the draft found is recorded as owed**, not decided (plan §4): F160-01, -02, -03, -08 and -11
  on the blockers that already held them (`open_blockers[4]`, `[77]`, `[91]`, `[105]`, `[190]`,
  extended, not repeated); Q160-b's design note on `[148]`; Q160-d on `[150]`; the rest (F160-04..07,
  -09, -10, -12..16 and the draft's P3) on the new `open_blockers[192]`, appended at the end, each with
  its owner.

## 5. The plan's open questions for this batch: UNANSWERED

Each is open until its named owner answers it in words. A0's recommendation is the phase plan's, and
for Q160-c it adds one point this batch found.

| Q-id | Owner | Question | A0's recommendation | Status |
|---|---|---|---|---|
| Q160-a | Product / Security / Legal | Approve, change or defer §10's numbers, with a named owner and date for each (the ERD:852 checklist). | **Approve them as Pilot defaults behind a policy-version gate, and keep DATA-DEC-05/06/10 open until Paid Beta.** Consequence: 160 may encode the Pilot numbers as versioned policy rows, not constraints. New input from this batch: the twelve retention conflicts (F160-14, `open_blockers[192]` (10)) mean the tenant root cannot be hard-deleted while FINANCE-HISTORY or AUTH-HISTORY rows exist, which the answer has to cover. | **UNANSWERED** |
| Q160-b | A1 + Owner | How is the "N for every role" audit/approval/ledger rule reconciled with anonymisation? (A) a pinned `app_maintenance`-only narrowing of the refusal trigger; (B) anonymise through a mapping, so the original row is never rewritten. | **B.** No refusal trigger has to be weakened; the cost is one indirection table, plus (measured in the plan's §6) one cross-family migration over the `auth.uid()` actor closures and one definer resolver, cheapest before another family adds such a closure and before G1 data exists. | **UNANSWERED** |
| Q160-c | A1 Data | Define `CONNECTION-HISTORY` and `CATALOG`, and fix the `NOTIFICATION-*` / `PUSH-SECRET` glob mismatch. | **A1 amends ERD §5/§10, since `docs/**` is read-only here.** New from this batch: **widen Q160-c** to F160-04 (no class for a notification preference), F160-05 (`LEDGER`; `OUTBOX-SHORT` and `CONSUMER-LEDGER` unnamed by §5), F160-06 (`AI-RUN-*`), F160-07 (`ASSET-*` / `RIGHTS-PROOF`), F160-08 (`billing_webhook_receipts`) and F160-16 (`HISTORY` / `CONTENT-HISTORY`), rather than stretching a decision id to fit; until then their map rows carry no decision id. | **UNANSWERED** |
| Q160-d | A4 + A1 | Who owns the deletion-manifest tables, and which batch creates them? | **A4, in the 100–109 range, with 160 consuming them.** | **UNANSWERED** |

DATA-DEC-03 to DATA-DEC-10 (ERD:866-873) stay open with their own owners; nothing here answers them.

## 6. What this file does not do

It does not mark batch 160's preparation ready, approve it, or merge it. Its role runs (C0, Q0, A1)
follow, and the PR stays a Draft until they report. Under the standing delegation A0 may then press the
merge only if the bar of 127 §6 is met. A stop-the-line finding halts it.
