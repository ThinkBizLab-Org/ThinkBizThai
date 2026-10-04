# Product Owner disposition, 2026-10-04: #172's merge, the phase's 16 questions answered, and batch 150

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-04. Only the
words quoted verbatim in §1 are the Owner's own text. The file approves no merge and grants no role's
signature. It records the Owner's answer to the 16 open questions of the phase (§5); it does not give that
answer. The file name carries the phase's date (2026-10-03), as every disposition of this phase does.

## 1. The Owner's words this batch is written under

The Owner wrote, verbatim, on 2026-10-04:

> เิาตามแนะนำ

In English: "Go with what was recommended." The second character is the Owner's typing slip for `เอา`. The
words are kept exactly as written, slip included.

The words answered A0's phase-end summary. That summary listed the open Q-ids of batches 141, 150, 160 and
170, 16 of them (Q141-a/b/c, Q150-a..e, Q160-a..d, Q170-a..d), each with A0's recommendation. It said that with this
answer A0 would start the migration work that does not wait on DATA-DEC-03 or RFC-2026-023, namely 150's key
(Q150-a) and Q150-e. The Owner gave one answer to the whole list.

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-03 | `คุณลุยตามที่แนะนำได้เลย` | the same file, §1-§2 |
| 2026-10-03 | `เอาตามที่แนะนำเลย ลุยต่อ` (end the hardening chain at 129; do now what needs no pending decision) | `product-owner-disposition-2026-10-03-batch-129.md` §1 |
| 2026-10-03 | `คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว` (the session's goal; the doubled `น` is the Owner's) | the same file, §1 |

## 2. What A0 reads the words to mean

- **Every one of the 16 questions is ANSWERED as A0 recommended** (§5). The Owner did not pick among the
  alternatives the dispositions set out; the answer is the recommendation, in each case as worded in the
  disposition file the question came from.
- **Where a question's named owner is another role, the Owner's answer is a direction, not that role's
  signature.** This applies to A1, A6, A4, Product/Ops and Product/Security/Legal. The Owner directed the
  answer, and that role's own acceptance remains owed. Each is recorded on the relevant blocker (§5, last
  column).
- **A0 implements now only what the answer lets it implement now** (§4): Q150-a, Q150-e and Q170-d. Every
  other answer either defers work (Q150-b), names a later batch or another role, or needs a writable-path
  amendment first (the RFCs of Q170-a and Q141-a). Those answers are recorded, and their work is owed.
- **"Review once" at the end of the phase is the Owner's own review.** It does not replace this batch's role
  runs (C0, Q0, A1), and it does not change who may approve what.

This reading is A0's. A correction from the Owner replaces it.

## 3. The merge of #172: A0 executing the standing delegation

A0 merged PR #172 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/172>, batch 150 prerequisites) at
its reviewed head `64684a2`.

- The merge commit is `1930f41`, at 2026-10-03T23:45:49Z.
- The required check, "bootstrap" (run 37162394369, "Bootstrap validation"), was green on `64684a2`.

A0 read the bar of batch 127 §6 as met for #172:

- C0, A1 and Q0 had re-checked the review round (C0 `029b949`, A1 `48086e6`, Q0 `f597e95`; on the branch
  as `d975a6c`, `547105d` and `65ff9d8`).
- Q0 had re-checked the host-guard fix (`4293112`; on the branch as `9d1a4a0`), and that re-check was recorded
  in `2c4b3cb`.
- The check was green on the reviewed head, and the head contained main.

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided that A0
presses the merge of a batch that is done. That #172 met the bar is A0's reading.

**The RFC-2026-025 §5 points remain open.** Integration Owner evidence is still owed (`open_blockers[188]`).
RFC-2026-002's rule as CONTRIBUTING_AGENTS.md states it ("Before the Product Owner merges, …") is still not
met literally when A0 presses the button. This file does not claim it is.

## 4. Batch 150, written under that direction

Branch `agent/claude/WP-0A-DB-00-batch-150`, from `1930f41`. Plan: `a0-batch-150-plan-2026-10-03.md`.

**One migration.** Its number is **150**, per Q150-c's answer: A0 authors, A1 reviews, and the number is a
**recorded one-time exception to MOD-120's range** (115-129, DR:161) for rebuilding a MOD-120 table. It is not
a precedent for that range, and it does not assign ERD:280's "DB performance owner".

- **Q150-a.** `db/foundation/migrations/150_performance_snapshots_key.sql` makes
  `app.performance_snapshots`' key `PRIMARY KEY (id, metric_time)`. It runs under lock and statement
  timeouts and ends with an apply-time block.
  - It was written only after measuring that no foreign key references the table (plan §2).
  - It has **no `partition by`** and **no index** (Q150-b).
  - `pinned-shapes.json` is rewritten in the same diff, and `open_blockers[179]` is closed.
- **Q150-e.** The harness reads the workspace list from `workspace_members`, joined to `workspaces`.
  - At scale 0.2 the Seq Scan is gone, and `--fail-on-seq-scan` exits 0 where it exited 3 (plan §3).
  - No policy and no index changed.
- **Q170-d.** Rule 17 keeps "no client privilege" for SECRET-4. For PROVIDER-3 and INTERNAL-3 it becomes "only
  a pinned safe projection": `db/foundation/lint/safe-projections.json` lists, per table and client role,
  the exact columns a client may read, and every other client privilege is refused, both ways.
  - The projection was derived from `pinned-grants.json` and reviewed against ERD §9.1.
  - Three columns are recorded as findings SP-1..SP-3 and kept, not dropped (plan §4).
- **Q150-d.** A0 drafted PROPOSED p95 DB-time values from a 0.2-scale run into the plan (§5), for the Owner
  to ratify. Nothing asserts them.

## 5. The 16 questions: ANSWERED

Every row is answered by the Owner's `เิาตามแนะนำ` (2026-10-04, §1) **as A0 recommended**. The
recommendation is quoted in substance from the disposition file named in the "From" column, where the full
question, its alternatives and its consequences are written.

| Q-id | From | Named owner | Question (short) | Answer: A0's recommendation | Done here, or owed | Held on |
|---|---|---|---|---|---|---|
| Q141-a | `product-owner-disposition-2026-10-03-batch-141-prep.md` §5 | Owner + A1 | How is an audit row produced: a definer trigger, command or worker only, or a hybrid? | **(B) command or worker only, for G1, with an RFC written now.** No audit migration lands before the worker RFC. | **Owed:** the producer RFC is to be written in the next batch, which first needs a writable-path amendment (A0, with A1). The Owner directed the answer; **A1's acceptance remains owed.** | `open_blockers[21]` |
| Q141-b | `...-batch-141-prep.md` §5 | A0 + A6 | Freeze CTR-AUD-001 as batch 140 reads it, or move it first? | **Countersign 140's reading**, which countersigns F1-F4 by name. | **Owed:** the countersignature is A6's act on `contract-catalog/**`, which is read-only here. The Owner directed the answer; **A6's acceptance remains owed.** F6 still needs its own answer. | `open_blockers[33]` |
| Q141-c | `...-batch-141-prep.md` §5 | A1 | Is tamper resistance enough before Paid Beta, or is tamper evidence required? | **Resistance only until G1; the gap is an accepted risk.** | **Recorded** as an accepted risk until G1. The Owner directed the answer; **A1's acceptance remains owed.** | `open_blockers[29]` |
| Q150-a | `product-owner-disposition-2026-10-03-batch-150-prereq.md` §5 | Owner | Change `performance_snapshots`' key to `(id, metric_time)` now, without `partition by`? | **Yes, as a small forward migration once the item-5 pins exist.** | **Done:** `150_performance_snapshots_key.sql`; reverses question C's "id alone" for the key only. | `open_blockers[179]` (closed) |
| Q150-b | `...-batch-150-prereq.md` §5 | Owner | Defer `partition by` and all production index work until a production-like fixture and an SLO exist? | **Yes.** The 150 migration waits; the fixture, harness and probes land now. | **Done by not doing it:** no `partition by`, no index; IC-1 stays a finding. Owed to batch 150's later part. "The 150 migration" in the recommendation is the deferred partition and index migration. Q150-a's answer asked for a small forward migration now, and Q150-c gave it the number 150, so that number is used by the re-key. **The later part has no number:** A1 and the Integration Owner must assign one (review round, C0-4). | `open_blockers[194]` (2) |
| Q150-c | `...-batch-150-prereq.md` §5 | Owner / A0 | Who owns 150, and in which range? | **A0 authors, A1 reviews, number 150**, a recorded one-time exception to MOD-120's range for the rebuild. | **Done:** this batch is A0's, number 150, and the exception is recorded here and on the blocker. A1 reviews. | `open_blockers[194]` |
| Q150-d | `...-batch-150-prereq.md` §5 | Product / Ops | Set the p95 DB-time SLO per query class. | **Draft values from the first fixture run, then have the Owner ratify them.** | **Drafted:** plan §5, PROPOSED, not asserted. **Owed:** the Owner's ratification; the Owner directed the route, and **Product/Ops' acceptance remains owed.** | `open_blockers[194]` |
| Q150-e | `...-batch-150-prereq.md` §5 | Owner | Is 100 workspaces a growing table under WS:913, and which fix? | **Yes, and rewrite the list query to start from `workspace_members`** (no migration). | **Done:** `scripts/db/explain-harness.mjs`; measured, plan §3. | `open_blockers[194]` (1) (closed) |
| Q160-a | `product-owner-disposition-2026-10-03-batch-160-prep.md` §5 | Product / Security / Legal | Approve, change or defer §10's numbers. | **Approve them as Pilot defaults behind a policy-version gate**; DATA-DEC-05/06/10 stay open until Paid Beta. | **Owed:** implementation to batch 160, after DATA-DEC-03. The Owner directed the answer; **Product/Security/Legal's acceptance remains owed.** | `open_blockers[192]` |
| Q160-b | `...-batch-160-prep.md` §5 | A1 + Owner | Reconcile "N for every role" with anonymisation: (A) narrow the refusal trigger, or (B) a mapping? | **B, a mapping.** | **Owed:** batch 160, after DATA-DEC-03 and RFC-2026-023 (the alias writer). **A1's acceptance remains owed.** | `open_blockers[148]` |
| Q160-c | `...-batch-160-prep.md` §5 | A1 Data | Define `CONNECTION-HISTORY` and `CATALOG`, fix the `NOTIFICATION-*` / `PUSH-SECRET` glob, widened to F160-04..08, -16, -17. | **A1 amends ERD §5/§10, widened as recommended.** | **Owed to A1** (`docs/**` is read-only here). The Owner directed the answer; **A1's acceptance remains owed.** | `open_blockers[192]` |
| Q160-d | `...-batch-160-prep.md` §5 | A4 + A1 | Who owns the deletion-manifest tables, and which batch creates them? | **A4, in the 100-109 range, with 160 consuming them.** | **Owed to A4** (the creating batch). The Owner directed the answer; **A4's and A1's acceptance remain owed.** | `open_blockers[150]` |
| Q170-a | `product-owner-disposition-2026-10-03-batch-170-assert.md` §5 | Owner + A1 | Close the `access_blocked` gap with an RFC amending RFC-2026-020 so `app_authz` can read `workspaces.lifecycle_state`? | **Yes.** | **Owed:** the RFC is to be written in the next batch, after a writable-path amendment (A0, with A1). **A1's acceptance remains owed.** | `open_blockers[95]` (and `[53]`) |
| Q170-b | `...-batch-170-assert.md` §5 | Owner | Keep the inherited base-table grants as a closed list for Pilot, or convert them to views? | **Closed list now, conversion per family later**: closed at the 41 measured, the 31 later rows accepted as §8.5 exceptions. | **Done by keeping it:** the list stays closed at 41. The Owner answered; **A1's acceptance as RFC-2026-021's owner remains owed.** | `open_blockers[18]`, `[93]` |
| Q170-c | `...-batch-170-assert.md` §5 | A0 | Who measures the provisioned instance's Data API, Realtime and default ACLs, and when? | **A0, a read-only catalog measurement before G1.** | **Owed to A0**, before G1. Not run here. | `open_blockers[193]` (9) |
| Q170-d | `...-batch-170-assert.md` §5 | A1 + Owner | For PROVIDER-3 and INTERNAL-3: "no client privilege" or "only a pinned safe projection"? | **A pinned safe projection**: an allowlist of the exact columns a client may read, every other client privilege refused. | **Done:** rule 17 and `db/foundation/lint/safe-projections.json`; SP-1..SP-4 owed (SP-4 since the review round, A1 F150-1). **A1's acceptance remains owed.** | `open_blockers[193]` (1), (12), (13) |

## 6. What this file does not do

- It does not mark batch 150 ready, approve it, or merge it. Its role runs (C0, Q0, A1) follow, and the PR
  stays a Draft until they report. Under the standing delegation, A0 may then press the merge only if the
  bar of 127 §6 is met. A stop-the-line finding halts it.
- It does not sign for A1, A6, A4, Product/Ops or Product/Security/Legal. Where §5 says a role's acceptance
  remains owed, it remains owed.
- It does not write the RFCs of Q170-a and Q141-a. They wait for a writable-path amendment.

## 7. Corrections from the review round (2026-10-04)

C0, A1 and Q0 reviewed `c0fa18e` (plan §11). Two corrections land in this file. Neither changes the Owner's
words or any answer.

- **16, not 17** (C0-2, Q0 Q-1). The file said 17 in five places. The enumeration it gave, the four source
  dispositions and §5 all hold 16. No other Q141, Q150, Q160 or Q170 id exists in `evidence/WP-0A-DB-00/`.
  A0's phase-end summary is not in the repository, so whether it listed a 17th item cannot be checked
  here. If it did, that answer is not recorded. The commit messages of `2318c72` and `4b252d4` still say 17;
  pushed messages are not rewritten.
- **Q150-b's recommendation quoted in full** (C0-4). The row now carries "The 150 migration waits" and says
  that the later partition and index migration has no number yet.
