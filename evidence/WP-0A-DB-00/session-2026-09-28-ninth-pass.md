# Session record, 2026-09-28, ninth pass: #161 merged, batch 123 built, RFC-2026-025 approved

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. This file is a STATE RECORD and
approves nothing. It supersedes [`session-2026-09-27-eighth-pass.md`](session-2026-09-27-eighth-pass.md)
for STATE, and it is folded into batch 123's PR rather than opened as its own. It was written on that
PR's branch before the PR merged. **If `main` has moved, `git log` is the truth.**

**READ THIS FIRST** if you are the next Author run on this package.

## 1. Where things stand

| Measure | Value |
|---|---|
| `main` when this branch was cut | `e276c9a` (merge of PR #161, batch 105) |
| Merged since the eighth pass | #160 (the eighth-pass record, `5922684`) and #161 (batch 105, `e276c9a`), both pressed by A0 on the Owner's words (#161: `คุณลุยงานทั้งหมด ตามที่คุณแนะนำ เลยได้ไหม ตอนนี้ delay แล้ว`). **Both merged before RFC-2026-025 was approved, so they carry the caveat every earlier record gave: RFC-2026-002's sentence that the Product Owner merges is not satisfied.** #161's fix commit `f82a70d` (migration 105 and 57 lines of cases, answering its role runs) also merged without re-review (C0's review of batch 123, F2). |
| This branch | `agent/claude/WP-0A-DB-00-batch-123`: batch 123, RFC-2026-025 (approved), this record |
| Isolation cases | 977 |
| Post-migrate pass | 44 blocks, 34 as written, 10 replaced |
| `open_blockers` | 188 |

## 2. What the Owner decided, and what not

See [`product-owner-disposition-2026-09-28-one-page-summary.md`](product-owner-disposition-2026-09-28-one-page-summary.md).

- **Decided:** the summary's items 1, 2, 3 and 5.
- **Item 4:** RFC-2026-025, written as Proposed and then **approved by the Owner** (`อนุมัติ RFC-2026-025`), and its §5 amendment approved as well (`อนุมัติ §5 ของ RFC-025`; [disposition](product-owner-disposition-2026-09-28-rfc-025.md)). **§5 item 6 means this PR, which carries the RFC, is merged by the Owner personally.**
- **Not decided:** sections 2–4 of the summary. A0 is drafting options with recommendations for
  section 2.

## 3. What batch 123 is

- **Batch 105's restrictive UPDATE closure on the remaining ten `updated_by` tables.** All seventeen
  now carry it.
  - The general rule requires the exact closure.
  - The closure-text probe refuses any table that grants the column without one.
  - Measured: a looser permissive UPDATE policy beside the closure on `content_items` lets an owner
    forge `updated_by` without 123, and is refused by 123's policy with it.
- **`approval_requests_decider_is_a_pair`:** `decided_at` and `decided_by` set together or not at all.
  - Without it, an editor cancelling a request could stamp the approver as its decider.
  - Its case `editor-a-cannot-cancel-an-approval-request-naming-a-decider` fails without the constraint
    and passes with it. `migrate-clean` also names 123's block.

## 4. Owed, in order

1. **The Owner:**
   - the product decisions in the summary's section 2, which A0 is drafting as options;
   - the external actions in section 3;
   - the governance items in section 4.
2. **A0:** batch 091 (A0 writes, A5 reviews); `created_by` at INSERT in 102's shape (recorded on the
   survey blocker); the forging cases of survey item 3; batch 150's pins before 150.
3. **The Integration Owner:** the `ci.yml` control job.
