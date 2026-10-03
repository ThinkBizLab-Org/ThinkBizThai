# Product Owner disposition, 2026-10-03: #171's merge and batch 150's prerequisites

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-04. It is
not the Owner's own text beyond the words quoted verbatim in §1. It approves no merge, grants no role's
signature, and answers none of the questions in §5.

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

- A0 does **now** the part of 150 that needs no pending decision. That is the phase plan's "Batch 150 —
  3. Can do now" (`a0-phase-plan-141-170-2026-10-03.md`):
  - weak-assertion survey §6 items 5-7 closed as `scripts/db/run.mjs` probes (121's shape, the
    vocabulary CHECKs and every policy, each pinned by text);
  - an index-coverage probe for RLS-predicate and keyset cursor columns, measured first, with its gaps
    recorded as exemptions or findings;
  - a WS:905 fixture generator and an EXPLAIN harness that report plans only, assert no p95, and run
    only where `DB_TEST_URL` exists.
- What needs a decision is **put to its owner and not taken** (§5). The batch writes no migration, no
  policy, no index and no grant, because each would take Q150-a or Q150-b.
- The harness is **not** added to CI or to the Makefile. CI is protected, so adding it needs the
  Integration Owner. That is recorded as owed (`open_blockers[194]` (9)), not done.
- "Review once" at the end of the phase is the Owner's own review. It does not replace this batch's
  role runs (C0, Q0, A1), and it does not change who may approve what.

This reading is A0's. A correction from the Owner replaces it.

## 3. The merge of #171: A0 executing the standing delegation

A0 merged PR #171 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/171>, batch 170 assertions)
at its reviewed head `e182b0f`. The merge commit is `b5f53c3`, at 2026-10-03T21:52:26Z. The required
check ("bootstrap") was green on that head.

A0 read the bar of batch 127 §6 as met for #171. The re-checks of 170-assert's review round (C0
`bae82ad`, A1 `8e7a95b`, Q0 `e37cde2`) had reported and were recorded (`e4b3755`), the check was green
on the reviewed head, and the head contained main.

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided that A0
presses the merge of a batch that is done. That #171 met the bar is A0's reading.

**The RFC-2026-025 §5 points remain open.** Integration Owner evidence is still owed. RFC-2026-002's
rule as CONTRIBUTING_AGENTS.md states it ("Before the Product Owner merges, …") is still not met
literally when A0 presses the button. This file does not claim it is.

## 4. Batch 150's prerequisites, written under that direction

Branch `agent/claude/WP-0A-DB-00-batch-150-prereq`, from `b5f53c3`; plan
`a0-batch-150-prereq-plan-2026-10-03.md`.

- **No migration, so no migration number.** Every item is lint data, a probe in `scripts/db/run.mjs`,
  a fixture generator, a harness, a static test or a record. No `150_*.sql` exists, and no number is
  asked of the Owner.
- **No index is added.** The content first page has no serving index (IC-1). It is recorded as a
  finding in `db/foundation/lint/index-coverage.json`, not as a lookup, because adding it is a migration
  and Q150-b is open.
- **`performance_snapshots` is pinned as it is**, `PRIMARY KEY (id)` included. If Q150-a is answered
  yes, the key change rewrites `pinned-shapes.json` in the same diff.
- **What the draft found is recorded as owed**, not decided (plan §6.1). `open_blockers[179]` (the key)
  and `[185]` (survey items 5-7, now closed) are extended, not repeated. F4 is cross-referenced to
  `[113]` (no worker identity). F2, F3/IC-1, F5-F10, F13 and F14 are on the new `open_blockers[194]`,
  appended at the end, each with its owner. F1, the disk incident of the draft's full-scale run, is an
  incident note in the plan (§6.2).

## 5. The plan's open questions for this batch: UNANSWERED

Each is open until its named owner answers it in words. A0's recommendations are the phase plan's
("Batch 150 — 4. Decisions needed").

| Q-id | Owner | Question | A0's recommendation | Status |
|---|---|---|---|---|
| Q150-a | Owner | Change `performance_snapshots`' primary key to `(id, metric_time)` now, while the table is empty and applied nowhere, without declaring partitioning? | **Yes, as a small forward migration once the item-5 pins exist.** Later partitioning becomes "create a parent and ATTACH this table" with no rewrite. It reverses the "id alone" answer to question C. This batch lands the item-5 pins. | **UNANSWERED** |
| Q150-b | Owner | Defer `partition by` and all production index work until a production-like fixture and an SLO exist? | **Yes.** The 150 migration waits; the fixture, harness and probes land now. | **UNANSWERED** |
| Q150-c | Owner / A0 | Who owns 150, and in which range? | **A0 authors, A1 reviews, number 150**, with a recorded one-time exception to MOD-120's range for the rebuild. | **UNANSWERED** |
| Q150-d | Product / Ops | Set the p95 DB-time SLO per query class. | **Draft values from the first fixture run, then have the Owner ratify them.** The harness asserts no timing. | **UNANSWERED** |

## 6. What this file does not do

It does not mark batch 150's prerequisites ready, approve them, or merge them. Their role runs (C0, Q0,
A1) follow, and the PR stays a Draft until they report. Under the standing delegation A0 may then press
the merge only if the bar of 127 §6 is met. A stop-the-line finding halts it.
