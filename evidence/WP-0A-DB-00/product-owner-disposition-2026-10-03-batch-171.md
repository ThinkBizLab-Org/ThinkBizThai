# Product Owner disposition, 2026-10-05: #180's merge, the two RFCs and the SLO taken on the Owner's delegation, and batch 171

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-05. Only the
words quoted verbatim in §1 are the Owner's own text. The file approves no merge and grants no role's
signature. The file name carries the phase's date (2026-10-03), as every disposition of this phase does.
Plan: `a0-batch-171-plan-2026-10-03.md` in this directory.

## 1. The Owner's words this batch is written under

On 2026-10-05, while batch rfc-026-static-rule was in review, the Owner wrote, verbatim (transcribed first in
the appended section of `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md`):

> คุณตะลุยไล่ไปได้เลนไม่ต้องรอผม
> เอาตามที่คุณแนะนำทุกอย่าง

In English: "Go ahead without waiting for me; take everything you recommend."

A0 reads these words as a **delegation**: from that point, A0's recommendations are the Owner's answers, and
each one is recorded where it is taken.

**What the delegation reaches is A0's reading, and the Owner's confirmation of it is owed** (batch 171's
review round, C0 M1). The words reach what A0 had recommended when they were written. A0 reads that as three
things: approve RFC-2026-026 and RFC-2026-027 (A1's review being the role runs held before this batch), ratify
the PROPOSED SLO values of batch 150, and implement RFC-2026-027's migration. The repository does not record
a message of A0's to the Owner, sent before the words, that names those three. The only record of them is the
section appended to `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md` (its last section),
written after the words, which speaks of "A0's standing recommendations" without quoting them; and that
file records (lines 19-21 and 44) that the summary the Owner answered earlier that day recommended nothing on
the SLO. So whether the Owner had seen "approve both RFCs, ratify the SLO" before writing the words is not
shown here.
This is recorded the way RFC-2026-027 §10.1 records the words of 2026-10-04: the reading is A0's, and the
Owner may correct it. Until the Owner confirms it, D1-D3 stand as A0's reading of the delegation, and the
confirmation is owed on `open_blockers[195]` (e). This batch does those three things and nothing else.

The phase is run under the Owner's direction of 2026-10-03, verbatim:

> เอาตามที่แนะนำเลย ลุยต่อ

("Go with what was recommended, carry on"), and the session's goal, verbatim, the doubled `น` the Owner's:

> คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว

("Keep going until the phase is done, then review once"). Both are transcribed in
`product-owner-disposition-2026-10-03-batch-129.md` §1.

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-04 | `ลุยต่อเลย เอาตามแนะนำ` (Q-026-1..9, Q-027-1..6 as recommended) | `product-owner-disposition-2026-10-03-batch-rfc-026-027.md` §8 |
| 2026-10-05 | `เอาตามแนะนำ` (the §8.1/1 text fixes) | `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md` §1 |
| 2026-10-05 | `คุณตะลุยไล่ไปได้เลนไม่ต้องรอผม` / `เอาตามที่คุณแนะนำทุกอย่าง` | that file's appended section, and §1 above |

## 2. The merge of #180: A0 executing the standing delegation

A0 merged PR #180 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/180>, batch rfc-026-static-rule,
branch `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule`) at its reviewed head `61a01f6`, the merged head of
#180. The merge commit is `700715e`, merged 2026-10-04T21:37:21Z. The required check `bootstrap` was green on
that head (run 37235924563).

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided, in
`product-owner-disposition-2026-10-03-batch-127.md` §6, that A0 presses the merge of a batch that is done:
CI green, the role runs' findings cleared, no stop-the-line. That #180 met that bar is A0's reading, recorded
in #180's own plan (§6) and re-checks (C0, A1, Q0). The RFC-2026-025 §5 points stay open: Integration Owner
evidence is still owed (`open_blockers[188]`), and RFC-2026-002's rule as CONTRIBUTING_AGENTS.md states it
("Before the Product Owner merges, ...") is not met literally when A0 presses the button. This file does not
claim it is.

## 3. The Owner's decisions, taken through the delegation of A0's recommendations

Each row is **the Owner's decision**, taken through the delegation of §1. A0 executes it; A0 does not decide
it. That the delegation reaches D1-D3 is A0's reading, and the Owner's confirmation of it is owed (§1;
`open_blockers[195]` (e)). Where the repository requires a distinct human role's acceptance, that acceptance is recorded as owed.

| # | Decision | Where it now stands in the repository | Named-role acceptance still owed |
|---|---|---|---|
| D1 | **RFC-2026-027 APPROVED** (lifecycle visibility: the authorization helper refuses a member of a workspace whose access is blocked). A1's review is the role runs of batches rfc-026-027, rfc-text and rfc-026-static-rule. Batch 171's A1 run (`a1-batch-171-security-review-2026-10-03.md`) was written after this approval and is a findings record that accepts nothing (C0 M2, A1 F1). | RFC-2026-027's Status line: approved 2026-10-05 by the Owner's delegation of A0's recommendation; **in effect when migration 171 is integrated**. | A1 (`/claude/a1_bastion`), co-owner of Q170-a; A1 Identity (`/claude/a1_identity`), author of RFC-2026-020, which RFC-2026-027 amends. `open_blockers[195]` (a). |
| D2 | **RFC-2026-026 APPROVED** (who writes an audit row), **with its implementation still gated on RFC-2026-023 and DATA-DEC-03** (its §9). | RFC-2026-026's Status line: approved 2026-10-05; **NOT in effect until RFC-2026-023 and DATA-DEC-03 hold (§9)**. Nothing implements it in this batch. | A1, co-owner of Q141-a and Q141-c; A6, whose MOD-140 the audit producer serves (DR:163 reserves 140–180 for MOD-140, "A6 with A0 contract"). `open_blockers[195]` (a), (d). |
| D3 | **The batch-150 PROPOSED p95 values RATIFIED as the Pilot p95 DB-time budget** (Q150-d), exactly as `a0-batch-150-plan-2026-10-03.md` §5 states them. | Written in `db/foundation/README.md` (the harness section). No timing assertion exists; one is now owed. | Product/Ops, Q150-d's named owners. `open_blockers[194]`. |
| D4 | **Migration number 171**, per Q-027-6's answer of 2026-10-04 ("the next free number in batch 170's range", landing after the RFC's approval and before any batch that relies on the gate). | `db/foundation/migrations/171_workspace_lifecycle_visibility.sql`. | The Integration Owner (`/claude/r0_steward`), who assigns migration numbers; A1 Security (`/claude/a1_bastion`), to whom the migration registry (ERD:282) gives range `170` ("grants/RLS/exposed surface hardening"), with A0 "manifest only" (C0 L6); A6, because DR:163 reserves the 140–180 range for MOD-140 ("A6 with A0 contract") and the phase plan records that conflict with ERD:279-282. `open_blockers[195]` (a). |

**RFC-2026-020's text is not edited by this batch.** RFC-2026-027 §3.4 quotes the exact sentences of
RFC-2026-020 it amends. `architecture/decisions/RFC-2026-020-authorization-helper-role.md` is outside
`WP-0A-DB-00`'s `writable_paths`, so the amendment applies **by reference**: RFC-2026-027's Status line says
so, and RFC-2026-020 must be read with §3.4 applied until its owner makes the edit. The edit is owed
(`open_blockers[195]` (b)).

## 4. Batch 171, written under that direction

Branch `agent/claude/WP-0A-DB-00-batch-171`, from `700715e`. There was no draft; this branch is the first
writing of the batch. The plan (`a0-batch-171-plan-2026-10-03.md`) maps each item to its change and its
measurement:

1. **The two Status lines** (D1, D2). RFC-2026-020 applied by reference (§3 above).
2. **The migration** `171_workspace_lifecycle_visibility.sql`, RFC-2026-027 §3.1-§3.3 and §4 as written:
   - `app_authz` gains `SELECT (id, lifecycle_state)` on `app.workspaces` and one policy,
     `workspaces_select_authz_own_open`, no wider than `workspaces_select_active_member` and calling no helper;
   - `app.workspace_member_role` admits only `active` and `closing`, and `is_active_member`, the roster and every
     family's policies inherit it;
   - the five `010` policies the helper did not reach are rewritten to call it;
   - an apply-time block holds app_authz to two policies and six columns, the lifecycle states classified, the
     admitted literal the same in four places, and no client policy on a workspace-scoped table without the
     helper.
   The pins (`run.mjs`, `pinned-grants.json`, `superseded.json`, the snapshot declaration) move in the same
   diff.
3. **The cases**: 42 rls-smoke cases (1087 → 1129) and one authz proof (6 → 7 claims), per RFC-2026-027 §5.
   The fixture sets the states as the migration owner, inside each case's rolled-back transaction.
4. **RFC-2026-026: no implementation** (blocked on §9). Recorded here and on `open_blockers[195]` (d).
5. **The SLO** (D3), written where the repository's docs hold budgets. A timing assertion is now owed.
6. **try-it's demo**: step 7 shows a blocked workspace's owner seeing nothing, with its control.

`open_blockers[53]` and `[95]` are closed with evidence **in the migration set, when 171 is integrated**; on the
provisioned instance the gap stays open until 011 and 171 are applied there (A1 F4; `[198]` (2)). `[194]` and `[195]` are appended. `[198]` is new and holds what this
batch leaves owed that no other blocker holds.

## 5. What this file does not do

- It does not mark this batch ready, approve it, or merge it. Its role runs (C0, Q0, A1) follow, and the PR
  stays a Draft until they report. Under the standing delegation, A0 may then press the merge only if the bar
  of 127 §6 is met. A stop-the-line finding halts it.
- It does not sign for A1, A1 Identity, A6, Product/Ops or the Integration Owner. Where the repository
  requires a distinct human role, that role's acceptance is owed and is recorded as owed.
- It does not answer any question the Owner has not answered. The approvals, the ratification and the
  number are the Owner's decisions taken through §1's delegation, recorded where each is taken; that the
  delegation reaches them is A0's reading, and the Owner's confirmation is owed (§1).

## The Owner's confirmation of A0's plan (appended 2026-10-05; closes `open_blockers[195]` (e))

C0's re-check (R1) found the approvals resting on A0's reading of a general delegation, with the
Owner's confirmation still owed. The conversation holds that confirmation. It is transcribed here
verbatim.

The Owner first wrote `คุณตะลุยไล่ไปได้เลนไม่ต้องรอผม` / `เอาตามที่คุณแนะนำทุกอย่าง`. A0 replied with
its plan. These are A0's words to the Owner, in Thai as sent:

> แผนต่อจากนี้:
> 1. batch RFC-026 §8.1/1 ที่รันอยู่: พอเสร็จจะจดว่า Q-026-10 ใช้ทางเลือก (iii) คือยอมรับช่องนี้ไว้จนถึง Paid Beta แล้ว merge
> 2. batch อนุมัติ:
>    - RFC-026/027 เปลี่ยนเป็น Approved โดยระบุว่ามาจากคำแนะนำของผมที่คุณมอบอำนาจไว้ และ A1 รีวิวแล้ว ทั้งสองฉบับมีผลก็ต่อเมื่อ dependency ใน §9 ครบ
>    - รับรองค่า SLO ตามที่เสนอไว้
> 3. migration ของ RFC-027: ปิดช่องที่สมาชิกของ workspace ซึ่งถูกระงับแล้วยังเห็นข้อมูลได้ งานนี้ไม่ต้องรอ DATA-DEC-03 จึงทำได้เลย รันครบรอบรีวิวเหมือนเดิม

In English, the plan was:

1. When the running RFC-026 §8.1/1 batch finishes, record Q-026-10 as (iii) and merge.
2. Run an approvals batch:
   - mark RFC-026/027 Approved, as A0's recommendation taken through the Owner's delegation, with A1's
     review; each takes effect only when its §9 dependencies hold;
   - ratify the proposed SLO values.
3. Implement RFC-027's migration, with the full review cycle. It does not wait on DATA-DEC-03.

**The Owner replied, verbatim: `ครับ`** ("yes"). This was the Owner's next message after the plan.

That reply confirms all three: the approval of RFC-2026-026 and RFC-2026-027 through the delegation,
the ratification of the SLO values, and the migration that puts RFC-027 into effect. They are the
Owner's decisions. A0 executes them; it does not decide them. Two things remain owed:

- the named roles' own acceptances (A1, A1 Identity, A6, Product/Ops), which the repository requires
  as distinct human roles, on `[194]` and `[195]`;
- the RFC-2026-020 text, applied by reference.

The qualifiers that read "A0's reading … pending the Owner's confirmation", in the RFC status lines,
the README, the harness header and the handoff, are superseded by this section. They are not
rewritten.
