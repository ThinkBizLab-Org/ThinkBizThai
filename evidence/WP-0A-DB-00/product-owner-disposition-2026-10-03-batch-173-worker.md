# Product Owner disposition, 2026-10-05: #183's merge, and batch 173 creating the worker's login identity (RFC-2026-028)

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-05. Only the words quoted
verbatim in §1 are the Owner's own text. The file approves no merge, approves no RFC, and grants no role's signature.
The file name carries the phase's date (2026-10-03), as every disposition of this phase does. Plan:
`a0-batch-173-worker-plan-2026-10-03.md` in this directory.

## 1. The Owner's words this batch is written under

No new words of the Owner's are recorded for this batch. It is written under words already on record:

The phase direction of 2026-10-03, verbatim:

> เอาตามที่แนะนำเลย ลุยต่อ

("Go with what was recommended, carry on"), and the session's goal, verbatim, the doubled `น` the Owner's:

> คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว

("Keep going until the phase is done, then review once"). Both are transcribed in
`product-owner-disposition-2026-10-03-batch-129.md` §1. Under them the Owner ended the hardening chain at batch 129 and
directed A0 to do, now, everything in batches 141, 150, 160 and 170 that needs no pending decision (the phase plan,
`a0-phase-plan-141-170-2026-10-03.md`).

The delegation of A0's recommendations, 2026-10-05, verbatim:

> เอาตามที่คุณแนะนำทุกอย่าง

("Take everything you recommend"), transcribed with the words before it in
`product-owner-disposition-2026-10-03-batch-171.md` §1 and confirmed by the Owner's `ครับ` in its appended section.

And the words of 2026-10-05, verbatim:

> ทำต่อตามแนะนำเลย

("Continue as recommended"), transcribed in `product-owner-disposition-2026-10-03-batch-rfc-023-028.md` §1. Under the
delegation, RFC-2026-028 was approved on A0's recommendation (that disposition's §6: the identity and its pins,
§3.1-§3.3, §3.6, §4/1; Q-028-1..13 answered as A0 recommended). This batch is the migration that RFC's §4/1 names.

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-05 | `คุณตะลุยไล่ไปได้เลนไม่ต้องรอผม` / `เอาตามที่คุณแนะนำทุกอย่าง`, then `ครับ` | `product-owner-disposition-2026-10-03-batch-171.md` §1 and its appended section |
| 2026-10-05 | `ทำต่อตามแนะนำเลย` | `product-owner-disposition-2026-10-03-batch-rfc-023-028.md` §1 |

## 2. The merge of #183: A0 executing the standing delegation

A0 merged PR #183 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/183>, batch 141, branch
`agent/claude/WP-0A-DB-00-batch-141`) at its reviewed head `58cff07`. The merge commit is `aa0e89f`, merged
2026-10-05T07:25:34Z. The required check `bootstrap` ("Bootstrap validation") was green on that head (run 37275560917).

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided, in
`product-owner-disposition-2026-10-03-batch-127.md` §6, that A0 presses the merge of a batch that is done: CI green,
the role runs' findings cleared, no stop-the-line. That #183 met that bar is A0's reading, recorded in #183's plan
(`a0-batch-141-plan-2026-10-03.md`) and its re-checks (C0, A1, Q0). The RFC-2026-025 §5 points stay open: Integration
Owner evidence is still owed (`open_blockers[188]`), and RFC-2026-002's rule as CONTRIBUTING_AGENTS.md states it
("Before the Product Owner merges, ...") is not met literally when A0 presses the button. This file does not claim it
is.

## 3. This batch

Branch `agent/claude/WP-0A-DB-00-batch-173-worker`, from `aa0e89f`. No draft preceded it in this run. It implements one
APPROVED decision record, RFC-2026-028, in one forward migration, `173_worker_login_identity.sql`:

1. **§3.1 and §4/1**: the login role `app_worker_login`, LOGIN and every other attribute false, created with **no
   credential**, so it is inert until an operator sets a verifier out of band; one membership in `app_worker` with
   INHERIT FALSE, SET TRUE, ADMIN FALSE; `createrole_self_grant` emptied first; an apply-time block reading every
   membership row of the role, both directions, per row.
2. **§3.6's pins** in the same diff: the fourth rule's pin and a per-row options rule (Q-028-10), the eighth rule's one
   admitted attribute, the settings rule, a ninth rule (no stored credential on a migrate-clean cluster), the
   `authenticator` negative, and the snapshot lint for the provisioned instance.
3. **§3.3 and §5/5**: a static rule that no SQL source the targets or CI feed carries a credential.
4. **§3.3/3 and §5/7-10, §5/12-13**: a test-only path in `scripts/db/authz-proofs.mjs` that logs in as the role with a
   generated credential it sets as a verifier and removes, and proves it reads nothing by default, cannot become any
   other role or reach a client command, and leaves no session-level workspace behind (A1R-2's check; the production
   runner's copy is owed and is written into RFC-2026-028's Implemented line as an obligation).

Plan §2 maps each item to its change and the test or drift that holds it; plan §3 is what was measured.

## 4. Answered as A0 recommends under the delegation

Each of these is a question the work raised that no approved text answered, or an answer the RFC left to its
implementing batch; each is answered as A0 recommends, under `เอาตามที่คุณแนะนำทุกอย่าง`, and recorded here and in plan
§4. **A0 executes these answers; the Owner may correct any.**

- **D1. The migration is numbered 173** (Q-028-9 as A0 recommended): the next free number above `172`, which it sorts
  after. A one-time exception to the registry's ranges (A0's foundation range is `001`-`004`), as Q150-c's was; the
  Integration Owner's acceptance is owed (`open_blockers[201]` (1)).
- **D2. Q-028-10: a pinned membership is pinned with its options**, by a separate rule over every direct membership row.
- **D3. A1R-1's remedy as A1 wrote it**: the setting emptied before the role is created; members read per row.
- **D4. Q-028-5's `app.jobs` columns are the next batch.** RFC-2026-028 recommends them before RFC-2026-026's worker
  half, `not null` with CTR-TEN-001's bounds and with CTR-JOB-001's reading restated by that contract's owner; the
  contract catalog is outside this package's paths, and a nullable copy would not be the RFC's answer. Still before the
  worker half (`open_blockers[201]` (3)).
- **D5. 173 is declared not applied to the provisioned instance** until Q-028-13's platform half and Q170-c are measured,
  as Q-028-13's own answer says.
- **D6. No connection limit yet** (Q-028-11's answer is the worker pool's size, which no decision fixes).
- **D7. A ninth probe rule** reads, as the probe's superuser, that no non-superuser role holds a stored credential on a
  migrate-clean cluster.
- **D8. The test credential is set as a client-computed SCRAM verifier**, never as plaintext.
- **D9. The login proofs' negative controls run under SET LOCAL SESSION AUTHORIZATION in rolled-back transactions.**
- **D10. §5/12 on a cluster that does not ask the role for a credential is printed NOT RUN**, never counted as passed; a
  `pg_hba` line trusting the role by name fails.
- **D11. Drifts were measured appended to 173**, where the role exists, rather than to `140_audit.sql`.
- **D12. One self-test per probe rule** is kept; the login role's other attribute drifts are measured, not self-tests.

## 5. What stays owed

On `open_blockers[201]`, each with its owner: the number's acceptance (D1); the platform half of Q-028-13 and the
snapshot retaken with 173 applied (D5); Q-028-5's columns (D4); Q-028-11 (D6); A1R-2 in the production worker's runner;
the reading of CI's `pg_hba` for the role off this branch's first CI run (C0-2); Q-028-3's custody runbook and
Q-028-12's pooler; the stated limits; and this batch's independent review by C0, A1 and Q0. A1's acceptance as
DATA-DEC-03's co-owner stays owed where it was (`open_blockers[199]`).
