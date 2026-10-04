# Product Owner disposition, 2026-10-04: #174's merge, and batch 170's first migration

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-04. Only the
words quoted verbatim in §1 are the Owner's own text. The file approves no merge and grants no role's
signature. The file name carries the phase's date (2026-10-03), as every disposition of this phase does.
Plan: `a0-batch-170-plan-2026-10-03.md` in this directory.

## 1. The Owner's words this batch is written under

**No new words since the last batch.** The latest words of the Owner are those of 2026-10-04, transcribed
in `product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §8:

> ลุยต่อเลย เอาตามแนะนำ

In English: "Carry on, take the recommendations."

The phase is run under the Owner's direction of 2026-10-03, verbatim:

> เอาตามที่แนะนำเลย ลุยต่อ

("Go with what was recommended, carry on": end the hardening chain at 129 and do now everything in batches
141, 150, 160 and 170 that needs no pending decision), and the session's goal, verbatim, the doubled `น`
the Owner's:

> คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว

("Keep going until the phase is done, then review once"). Both are transcribed in
`product-owner-disposition-2026-10-03-batch-129.md` §1.

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-04 | `เิาตามแนะนำ` (the phase's 16 questions, as recommended) | `product-owner-disposition-2026-10-03-batch-150.md` §1 |
| 2026-10-04 | `ลุยต่อเลย เอาตามแนะนำ` (the RFC batch's fifteen questions, as recommended) | `product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §8 |

## 2. What this batch implements, and the answers it rests on

| Q-id | Named owner | Answer (`ลุยต่อเลย เอาตามแนะนำ`, as A0 recommended) | This batch |
|---|---|---|---|
| Q-026-5 | Owner + A1 | **revoke**: the client `UPDATE` of `workspaces.lifecycle_state` is revoked in the first of batch 170's migrations | **Done:** `db/foundation/migrations/170_workspace_lifecycle_not_client_writable.sql` |
| Q-027-5 | Owner + A1 | the same answer, from RFC-2026-027's side | **Done:** the same file |
| Q-027-6 | Integration Owner | **the next free number in 170's range** | **Done:** 170, the first number in the range; no 17x file existed |

The Owner directed these answers. **A1's acceptance (Q-026-5, Q-027-5) and the Integration Owner's
(Q-027-6) remain owed**, as `open_blockers[195]` already records for every named role.

**Neither RFC-2026-026 nor RFC-2026-027 is approved, and this batch does not depend on either.** The revoke
needs nothing either RFC decides (C0-8 on the RFC batch), so it lands first, as `open_blockers[195]` (4)
requires: it is the precondition of RFC-2026-027's gate and of any job that selects workspaces by
`lifecycle_state`.

## 3. The merge of #174: A0 executing the standing delegation

A0 merged PR #174 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/174>, batch RFC-026-027) at its
reviewed head `c307d1d`.

- The merge commit is `9a07459`, at 2026-10-04T04:35:58Z.
- The required check, "bootstrap" (run 37177130592), was green on `c307d1d`.
- C0, A1 and Q0 had re-checked the review round (C0 `6dd5183`, A1 `28afbb1`, Q0 `2cc4bdc`, on `80c171f`;
  plan `a0-batch-rfc-026-027-plan-2026-10-03.md` §8): no stop-the-line, nothing that blocks the merge.

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided that A0
presses the merge of a batch that is done (batch 127 §6). That #174 met the bar is A0's reading.

**The RFC-2026-025 §5 points remain open.** Integration Owner evidence is still owed (`open_blockers[188]`).
RFC-2026-002's rule as CONTRIBUTING_AGENTS.md states it ("Before the Product Owner merges, …") is still not
met literally when A0 presses the button. This file does not claim it is.

## 4. Batch 170, written under that direction

Branch `agent/claude/WP-0A-DB-00-batch-170`, from `9a07459`.

- **One migration**, one statement: `revoke update (lifecycle_state) on app.workspaces from authenticated`.
  anon and PUBLIC held nothing on the column (measured). No other grant and no policy is touched; the owner
  still updates `name` and `updated_by`. An apply-time block holds it.
- **Measured** on main and on this branch (plan §2): 48 of 72 attempts admitted before, 0 of 72 after, every
  one refused 42501 "permission denied for table workspaces"; the owner's renames still admitted.
- **Eight rls-smoke cases** (plan §4): seven refusals demanded at the grant layer, the column-free forms
  among them, and the rename positive. On the pre-170 privilege the seven fail.
- `pinned-grants.json` moves in the same diff. `open_blockers[195]`'s finding is closed ((8)).

## 5. What remains

**Nothing on a request path writes `lifecycle_state` until §11.4's command lands.** The writer is
RFC-2026-023's step-up command (with RFC-2026-026's producer for its audit row, `open_blockers[21]`), or,
for the later transitions, DATA-DEC-03's worker (`open_blockers[113]`). Neither exists. Until then a
workspace's state changes only by a superuser's hand, and an owner can neither request closing nor cancel
it from a client. This is recorded on `open_blockers[195]` (9), owed to the batch that writes RFC-2026-023's
first command function.

## 6. What this file does not do

- It does not mark batch 170 ready, approve it, or merge it. Its role runs (C0, Q0, A1) follow, and the PR
  stays a Draft until they report. Under the standing delegation, A0 may then press the merge only if the
  bar of 127 §6 is met. A stop-the-line finding halts it.
- It does not approve RFC-2026-026 or RFC-2026-027, and it does not sign for A1 or the Integration Owner.
- It does not write the §11.4 command or anything of RFC-2026-027's gate.
