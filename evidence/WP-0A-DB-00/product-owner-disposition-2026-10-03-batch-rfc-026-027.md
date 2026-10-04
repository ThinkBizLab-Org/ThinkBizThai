# Product Owner disposition, 2026-10-04: #173's merge, and RFC-2026-026 and RFC-2026-027 written, Proposed

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-04. Only the
words quoted verbatim in §1 are the Owner's own text. The file approves no merge, approves neither RFC and
grants no role's signature. The file name carries the phase's date (2026-10-03), as every disposition of
this phase does.

## 1. The Owner's words this batch is written under

**No new Owner words since 2026-10-04's `เิาตามแนะนำ`**, which is transcribed, slip included, in
`product-owner-disposition-2026-10-03-batch-150.md` §1. This batch is written under words already on
record:

| Date | Words, verbatim | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-03 | `เอาตามที่แนะนำเลย ลุยต่อ` | `product-owner-disposition-2026-10-03-batch-129.md` §1: end the hardening chain at 129, and do now everything in batches 141/150/160/170 that needs no pending decision |
| 2026-10-03 | `คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว` | the same file, §1: the session's goal (the doubled `น` is the Owner's) |
| 2026-10-04 | `เิาตามแนะนำ` | `product-owner-disposition-2026-10-03-batch-150.md` §1 and §5: the phase's 16 questions answered as A0 recommended, among them Q141-a = (B) and Q170-a = yes, each directing an RFC to be written in the next batch |

The phase plan is `a0-phase-plan-141-170-2026-10-03.md`.

## 2. What A0 reads the words to mean for this batch

- **The two RFCs implement Q141-a's and Q170-a's answers.** Q141-a's answer (B): an audit row is produced by
  an application command or the worker only, for G1, with no database trigger producing it, and no audit
  migration lands before the worker RFC. Q170-a's answer (yes): close the `access_blocked` gap with an RFC
  amending `RFC-2026-020` so that `app_authz` may read `workspaces.lifecycle_state`. Both answers said the
  RFC is written in the next batch, after a writable-path amendment. This batch is that batch.
- **Both RFCs are Proposed and NOT approved.** The Owner's answer directed that each RFC be written. It did
  not approve the text, which did not exist yet. **Approval is the Owner's and A1's act** (A1 is
  co-owner of Q141-a and Q170-a, and A1's acceptance of both answers was already owed). Until either file
  carries an approval, `RFC-2026-020` reads as it does today, and no migration, policy, grant or pin
  changes because of them.
- **The writable-path amendment is A0's packaging, under the same direction.** Both answers named it as
  owed. It adds exactly the two RFC files beside 021-025 and nothing else (plan §1).
- **"Review once" at the end of the phase is the Owner's own review.** It does not replace this batch's
  role runs (C0, Q0, A1), and it does not change who may approve what.

This reading is A0's. A correction from the Owner replaces it.

## 3. The merge of #173: A0 executing the standing delegation

A0 merged PR #173 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/173>, batch 150) at its reviewed
head `04c2a6c`.

- The merge commit is `f3e6fbc`, at 2026-10-04T03:20:26Z.
- The required check, "bootstrap" (run 37173407430, "Bootstrap validation"), was green on `04c2a6c`.

A0 read the bar of batch 127 §6 as met for #173: C0, A1 and Q0 had re-checked the review round (recorded in
`a0-batch-150-plan-2026-10-03.md` §12), C0 had re-checked the wording fix and found no stop-the-line and
nothing blocking the merge (`c0-batch-150-wording-recheck-2026-10-04.md`, recorded in §13 of that plan), the
check was green on the reviewed head, and the head contained main.

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided that A0
presses the merge of a batch that is done. That #173 met the bar is A0's reading.

**The RFC-2026-025 §5 points remain open.** Integration Owner evidence is still owed (`open_blockers[188]`).
RFC-2026-002's rule as CONTRIBUTING_AGENTS.md states it ("Before the Product Owner merges, …") is still not
met literally when A0 presses the button. This file does not claim it is.

## 4. This batch

Branch `agent/claude/WP-0A-DB-00-batch-rfc-026-027`, from `f3e6fbc`. Plan:
`a0-batch-rfc-026-027-plan-2026-10-03.md`. Drafting record: `a0-rfc-026-027-draft-2026-10-04.md`.

- `architecture/decisions/RFC-2026-026-audit-row-producer.md`, Proposed (Q141-a).
- `architecture/decisions/RFC-2026-027-lifecycle-visibility.md`, Proposed (Q170-a).
- **No migration.** So no migration number is asked of the Owner. RFC-2026-027's forward migration takes a
  number in batch 170's range when it is approved (Q-027-6, Integration Owner).
- **A new finding, recorded as the new `open_blockers[195]`:** `010_identity.sql:403` grants the client
  `UPDATE` of `workspaces.lifecycle_state`, and `workspaces_update_owner`'s `WITH CHECK` (`:509-517`) does
  not bound the new value. So an owner can move their own workspace into any §11.4 state, skipping
  step-up, the recovery window and audit. Graded MEDIUM by A0. **A0's reading is that it is NOT
  stop-the-line:** no deletion path exists, the actor is the workspace's own owner acting on their own
  workspace, and no other tenant is reached. **The reviewers are asked to judge that reading, not to take
  it.** The fix (revoke the client `UPDATE` of `lifecycle_state`) is owed to RFC-2026-027's forward
  migration, and it is the decision in Q-026-5 / Q-027-5 (§5). One qualification is unmeasured, and the
  blocker states it: PostgreSQL's SELECT-policy check on an UPDATE that reads a column may refuse the
  targeted form, leaving only an UPDATE that reads no column, which moves every workspace the owner owns.

## 5. The fourteen questions: UNANSWERED

**None of these is answered.** The Owner's `เิาตามแนะนำ` of 2026-10-04 answered Q141-a and Q170-a; it came
before these questions existed. Each is held, by name and owner, in `open_blockers[195]`. The
recommendation column is A0's, for the Owner's phase-end review; it is not an answer.

| Q-id | Named owner | Question (short; full text in the RFC) | A0's recommendation |
|---|---|---|---|
| Q-026-1 | A1 | May a defective command append `denied`/`failed` rows, attributed to the true acting user, in a workspace that user cannot reach (RFC-026 §3.3/3)? | **Accept the cost.** The row cannot be `succeeded`, cannot name another actor, and cannot alter anything; a stricter denial predicate needs the workspace's existence, which `app_command` cannot see. |
| Q-026-2 | A1 | Does copying scope from the changed row (§3.6) discharge `open_blockers[191]` (6) and `[32]` on the producer side? | **Yes on the producer side, no on the policy side**: keep `[32]`'s missing foreign key owed; a policy-side check stays owed with it. |
| Q-026-3 | A1, A6 | `occurred_at` for a worker projecting an external event: projection time or provider time? | **Projection time in `occurred_at`**, the provider's time carried in the event's own payload, so `occurred_at` is always a time this system witnessed. |
| Q-026-4 | A1 | Refusals that never reach a producer (RLS refusals, authentication failures, platform-scope events) go unrecorded under B: accepted until G1? | **Accept until G1, recorded as an accepted gap**; SEC-014's producer for them is owed before Paid Beta. |
| Q-026-5 | Owner, A1 | Revoke the client `UPDATE` of `workspaces.lifecycle_state`, or accept the unaudited gap until the §11.4 command? (Coupled to Q-027-5.) | **Revoke**, in RFC-2026-027's forward migration at the latest; no workspace can then be closed until the §11.4 command exists, which is acceptable for a single-user Pilot. |
| Q-026-6 | Owner | May the command half land with `RFC-2026-023`'s first command function, before the worker RFC? | **Yes.** It lets §11.4 step 1 be audited sooner; the Owner's "no audit migration before the worker RFC" is then read as binding the worker half only. The Owner's to say. |
| Q-026-7 | A0, A1 | `service-policy-map.json` keys one row per `(table, operation)`: add a producer field, or keep command-path policies out of the map? | **Add a producer field**, so the register stays the one place every write path is listed; cross-referenced to `open_blockers[191]` (2). |
| Q-026-8 | A6 | The worker's actor for a user's job: the job's user or a `system_actor`? | **The job's `tenant_context.actor`** (the user who started it); `system_actor` only for a sweep no user started. |
| Q-027-1 | Owner, A1 | Does a member of a blocked workspace still see their own membership row? | **Yes, kept** (RFC-027's proposal): the client can tell "your workspace is closed" from "you belong to nothing". |
| Q-027-2 | A1 | Is `closing` admitted for writes as well as reads? | **Yes, both** (RFC-027's proposal), as `010`'s workspace policies already do; a narrower `closing` is a command-side rule. |
| Q-027-3 | Owner, A1 | Billing reads of a blocked workspace by its owner: refused (export only), or kept? | **Refused through the client**; the owner's invoices reach them through the export job batch 160 owns. |
| Q-027-4 | A1 | Write the gate requirement into `RFC-2026-023` now? | **Yes**, so whichever RFC's batch lands first carries it. |
| Q-027-5 | Owner, A1 | Revoke the client `UPDATE` of `lifecycle_state` in the same migration as RFC-027's gate? | **Yes, revoke in the same migration** (RFC-027's proposal); without it the gate turns the finding of §4 into an irreversible lock-out. |
| Q-027-6 | Integration Owner | Migration number in batch 170's range, and landing order. | **The next free number in 170's range, landing after approval and before any batch that relies on the gate.** The Integration Owner's to assign. |

Still owed, and not re-held by this batch: A1's acceptance of Q141-a, Q141-c and Q170-a
(`open_blockers[21]`, `[29]`, `[95]`); A6's countersignature of CTR-AUD-001 (Q141-b, `[33]`); `DATA-DEC-03`
(`[113]`); `RFC-2026-023`'s own disposition.

## 6. What this file does not do

- It does not approve RFC-2026-026 or RFC-2026-027. Each stays Proposed until the Owner and A1 approve it.
- It does not answer any of the fourteen questions of §5.
- It does not mark this batch ready, approve it, or merge it. Its role runs (C0, Q0, A1) follow, and the PR
  stays a Draft until they report. Under the standing delegation, A0 may then press the merge only if the
  bar of 127 §6 is met. A stop-the-line finding halts it, and the reviewers' judgement of §4's reading is
  part of that bar.
- It does not sign for A1, A6 or the Integration Owner.
