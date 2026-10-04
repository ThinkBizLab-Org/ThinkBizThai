# Product Owner disposition, 2026-10-04: #176's merge, and the sql-lexer batch

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run. It is not the Owner's
own text beyond the words quoted verbatim in §1. It approves no merge and grants no role's signature.

## 1. The Owner's words since the owed-tooling batch

The Owner wrote, verbatim, on 2026-10-04:

> ลุยต่อเลย เอาตามแนะนำ

In English: "Keep going. Go with what you recommended."

It answers A0's summary after #176 merged. That summary's item 5 recommended **one real lexer shared by every
static reader**, over an RFC for running every fed source through PostgreSQL's own parser (which would add a
dependency). On items 1-4 A0 recommended nothing: RFC approval (RFC-2026-026, RFC-2026-027, RFC-2026-023), the
ratification of the proposed p95 SLO values, the read-only measurement of the provisioned instance (Q170-c),
and DATA-DEC-03 / RFC-2026-023. So "what you recommended" reaches item 5 only, and items 1-4 stay unanswered.

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-03 | `เอาตามที่แนะนำเลย ลุยต่อ` | `product-owner-disposition-2026-10-03-batch-129.md` §1, the end of the hardening chain and the phase's next batches |
| 2026-10-03 | `คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว` | the same file, §1, the session's goal (the doubled `น` is the Owner's own spelling) |
| 2026-10-04 | `ลุยต่อเลย เอาตามแนะนำ` (answering the owed-tooling summary) | `product-owner-disposition-2026-10-03-batch-owed-tooling.md` §1 |

## 2. What A0 reads the new words to mean

- **Write the sql-lexer batch now**, as recommended: one SQL tokenizer following PostgreSQL's lexical rules,
  every static reader rewired onto it, a golden corpus of every spelling the review rounds measured, a
  differential against what psql actually sends, and the OWED-TOOLING items of open_blockers[185] closed with
  evidence, with what a lexer still cannot decide stated (plan `a0-batch-sql-lexer-plan-2026-10-03.md`).
- **No dependency.** The lexer is Node built-ins only, so RFC-2026-001 holds and no new RFC is needed. The
  parser-RFC alternative is not taken and not proposed.
- **No migration.** The batch is tooling and static tests only, so no migration number is needed and none is
  asked of anyone.
- **Nothing else is answered.** Items 1-4 stay open. The words do not approve RFC-2026-026, RFC-2026-027 or
  RFC-2026-023, do not ratify the proposed SLO values, do not grant access to the provisioned instance, and do
  not decide DATA-DEC-03.
- The role runs (C0, Q0, A1) of this batch still run. "Review once" at the end of the phase is the Owner's
  own review and does not replace them.

This reading is A0's. A correction from the Owner replaces it.

## 3. The merge of #176: A0 executing the standing delegation

A0 merged PR #176 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/176>, branch
`agent/claude/WP-0A-DB-00-batch-owed-tooling`) at its reviewed head `84ed650517c25c84db52cf1d856dc1479205a6dc`.
The merge commit is `5bde893136cbe17a222e3a6abd83dcd4a1433f26`, at 2026-10-04T09:07:34Z. The required check was
green on that head (`bootstrap`, run 37190663121, success).

A0 read the bar of batch 127 §6 as met for #176: the re-checks of the owed-tooling review round (C0 `f20b1ec`,
A1 `036360c`, Q0 `8b98314`, cherry-picked; plan "Re-checks") had reported; none reported a stop-the-line or
anything blocking the merge; the check was green on the reviewed head; the head contained main.

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided that A0
presses the merge of a batch that is done. That this batch met the bar is A0's reading.

**The RFC-2026-025 §5 points remain open.** Integration Owner evidence is still owed, and RFC-2026-002's rule
as CONTRIBUTING_AGENTS.md states it ("Before the Product Owner merges, …") is still not met literally when A0
presses the button. This file does not claim it is.

## 4. The sql-lexer batch, written under those words

Branch `agent/claude/WP-0A-DB-00-batch-sql-lexer`, from `5bde893`; plan `a0-batch-sql-lexer-plan-2026-10-03.md`.
It closes, each with a drift or a mutation measured red (plan §1, §3, §4):

1. the do-block blanker's dollar-quoted quote and `'a--'` (C0-OTR-1, A1-RC-3);
2. COPY to or from any target but STDIN/STDOUT, whatever its quoting, and a `;` inside the COPY query
   (C0-OTR-2, A1-RC-1, Q0-OT2-1);
3. the server-file aliases: LANGUAGE internal or c refused, the internal symbols added, every name pinned
   (A1-RC-2, Q0-OT2-5);
4. `--` inside a dollar body in sqlWithoutComments and the tripwires (A1-RC-I1, Q0-OT2-7);
5. file_fdw: CREATE EXTENSION outside pgcrypto, foreign tables, wrappers, servers and user mappings
   (Q0-OT2-2).

What stays owed is on open_blockers[185] with its owner: A1-RC-4 (A0), the INFO items of the owed-tooling
re-checks, and re-running the differential for each new fed source (A0). The limits no lexer removes --
semantics, and text computed at run time -- stay with the live catalog probes.

**Nothing here is an Owner decision.** No grant, policy, role, contract, ownership, P0 scope or RLS meaning
changes. The batch reads the same sources more exactly and refuses spellings that today pass every static
layer. No integrated migration and no fed source is newly refused (measured over all 221). The one rule that
would have refused two of them, a blanket `CREATE EXTENSION`, is written as an allowlist of the one extension
they create, and the plan says so.

## 5. What this file does not do

It does not mark the batch ready, approve it, or merge it. Its role runs (C0, Q0, A1) follow. The PR stays a
Draft until they report. Under the standing delegation A0 may then press the merge only if the bar of 127 §6
is met. A stop-the-line finding halts it.
