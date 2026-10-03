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
  - a WS:911 fixture generator and an EXPLAIN harness that report plans only, assert no p95, and run
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

Since the review round (C0-3) each question also names its other options and what follows from "no", and
F2's question is put as its own id, Q150-e, rather than routed to the SLO question. A0's recommendation is
unchanged; the alternatives are written so that the answer is a choice, not a confirmation.

| Q-id | Owner | Question | A0's recommendation | Other options | If the answer is no | Status |
|---|---|---|---|---|---|---|
| Q150-a | Owner | Change `performance_snapshots`' primary key to `(id, metric_time)` now, while the table is empty and applied nowhere, without declaring partitioning? | **Yes, as a small forward migration once the item-5 pins exist.** Later partitioning becomes "create a parent and ATTACH this table" with no rewrite. It reverses the "id alone" answer to question C. This batch lands the item-5 pins. | (1) Keep `PRIMARY KEY (id)` and take the rewrite when partitioning is declared. (2) Keep `(id)` and drop partition-readiness for this table from §4.8. | `PRIMARY KEY (id)` stays pinned as it is; the table cannot be partitioned by month without a rebuild later, when it may hold rows; `open_blockers[179]` stays open. | **UNANSWERED** |
| Q150-b | Owner | Defer `partition by` and all production index work until a production-like fixture and an SLO exist? | **Yes.** The 150 migration waits; the fixture, harness and probes land now. | (1) Land the indexes the harness already shows missing (IC-1, the content first page) now, and defer only `partition by`. (2) Land both now on the 0.2-scale plans. | Batch 150 writes its migration before an SLO exists; IC-1's index would be the first candidate, and the plans that justify it are the 0.2-scale ones of plan §5. | **UNANSWERED** |
| Q150-c | Owner / A0 | Who owns 150, and in which range? | **A0 authors, A1 reviews, number 150**, with a recorded one-time exception to MOD-120's range for the rebuild. | (1) The "DB performance owner" ERD:279-282 names for 150, who is not assigned (ERD:280). (2) MOD-140's owner, since DR:163 reserves 140-180 for MOD-140 ("A6 with A0 contract"). (3) MOD-120's owner for the rebuild of its table (range 115-129, DR:161), and 150 for the indexes only. | No one may author batch 150's migration; this batch's assertions stand, and the phase plan's ownership conflict (its §2) stays open. | **UNANSWERED** |
| Q150-d | Product / Ops | Set the p95 DB-time SLO per query class. | **Draft values from the first fixture run, then have the Owner ratify them.** The harness asserts no timing. | (1) Set the values without a fixture run. (2) Leave the first-page budget out of 150 and keep WS:914 as a statement only. | The harness keeps reporting plans and asserting no timing; WS:914's p95 budget is not checked by anything. | **UNANSWERED** |
| Q150-e | Owner | (F2) Is 100 workspaces "a growing table" under WS:913's "no sequential scan" for workspace switch/list, which is not an SLO? If yes, which fix? | **Yes, and rewrite the list query to start from `workspace_members`** (no migration), measured with the harness; A0's, new at the review round. | (1) No: at 100 rows a seq scan is the right plan, and WS:913 binds only larger tables. (2) Yes, and rewrite `workspaces_select_active_member` (a policy change, so an RFC-2026-016 shape question). (3) Yes, and add an index (a migration, so Q150-b). | The workspace list keeps seq-scanning `workspaces` at the WS:911 shape, and `--fail-on-seq-scan` keeps exiting 3 on it; `open_blockers[194]` (1) stays open. | **UNANSWERED** |

## 6. What this file does not do

It does not mark batch 150's prerequisites ready, approve them, or merge them. Their role runs (C0, Q0,
A1) follow, and the PR stays a Draft until they report. Under the standing delegation A0 may then press
the merge only if the bar of 127 §6 is met. A stop-the-line finding halts it.
