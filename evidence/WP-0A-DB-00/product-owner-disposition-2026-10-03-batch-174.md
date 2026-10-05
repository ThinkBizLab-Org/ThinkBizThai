# Product Owner disposition, 2026-10-05: #184's merge, and batch 174 giving a job its actor and request (Q-028-5)

**Package:** `WP-0A-DB-00`.

This file is A0's (`/claude/a0_atlas`) record, written by a subagent of that run on 2026-10-05. Only the words quoted
verbatim in §1 are the Owner's own text. The file approves no merge, approves no RFC, and grants no role's signature.
The file name carries the phase's date (2026-10-03), as every disposition of this phase does. Plan:
`a0-batch-174-plan-2026-10-03.md` in this directory.

## 1. The Owner's words this batch is written under

The words of 2026-10-05, verbatim:

> พร้อมแล้วลุยเลยนะ ไม่ต้องรอผม

("Ready, go ahead, don't wait for me"). They were given after the delegation below. This subagent did not see them
said: they reached it in the task text of the A0 run that launched it, quoted there as the Owner's. They are
transcribed here as that run relayed them, and the Owner may correct the transcription.

The delegation of A0's recommendations, 2026-10-05, verbatim:

> เอาตามที่คุณแนะนำทุกอย่าง

("Take everything you recommend"), transcribed with the words before it in
`product-owner-disposition-2026-10-03-batch-171.md` §1 and confirmed by the Owner's `ครับ` in its appended section.

The phase direction of 2026-10-03, verbatim:

> เอาตามที่แนะนำเลย ลุยต่อ

("Go with what was recommended, carry on"), and the session's goal, verbatim, the doubled `น` the Owner's:

> คุณทำต่อยาวจนนกว่าจะจบ phase เลย แล้วรีวิวทีเดียว

("Keep going until the phase is done, then review once"). Both are transcribed in
`product-owner-disposition-2026-10-03-batch-129.md` §1. Under them the Owner ended the hardening chain at batch 129 and
directed A0 to do, now, everything in batches 141, 150, 160 and 170 that needs no pending decision (the phase plan,
`a0-phase-plan-141-170-2026-10-03.md`).

Already on record, and still standing:

| Date | Words | Where |
|---|---|---|
| 2026-10-03 | `ถ้าเสร็จแล้วคุณ merge เองไปได้เลย` / `ระบบนี้ผมใช้งานเองคนเดียว ไม่ impact user อยู่แล้ว` | `product-owner-disposition-2026-10-03-batch-127.md` §6, the standing delegation to merge |
| 2026-10-05 | `คุณตะลุยไล่ไปได้เลนไม่ต้องรอผม` / `เอาตามที่คุณแนะนำทุกอย่าง`, then `ครับ` | `product-owner-disposition-2026-10-03-batch-171.md` §1 and its appended section |
| 2026-10-05 | `ทำต่อตามแนะนำเลย` | `product-owner-disposition-2026-10-03-batch-rfc-023-028.md` §1; under it RFC-2026-028 was approved on A0's recommendation (its §6), Q-028-5 among the answers |

## 2. The merge of #184: A0 executing the standing delegation

A0 merged PR #184 (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/184>, batch 173, branch
`agent/claude/WP-0A-DB-00-batch-173-worker`) at its reviewed head `1ae007f`. The merge commit is `600b48b`, merged
2026-10-05T12:40:13Z. The required check `bootstrap` was green on that head (run 37309049441).

**A0 executed the Owner's standing delegation; it did not decide the merge.** The Owner decided, in
`product-owner-disposition-2026-10-03-batch-127.md` §6, that A0 presses the merge of a batch that is done: CI green,
the role runs' findings cleared, no stop-the-line. That #184 met that bar is A0's reading, recorded in #184's plan
(`a0-batch-173-worker-plan-2026-10-03.md`) and its re-checks (C0, A1, Q0). The RFC-2026-025 §5 points stay open:
Integration Owner evidence is still owed (`open_blockers[188]`), and RFC-2026-002's rule as CONTRIBUTING_AGENTS.md states
it ("Before the Product Owner merges, ...") is not met literally when A0 presses the button. This file does not claim it
is.

## 3. This batch

Branch `agent/claude/WP-0A-DB-00-batch-174`, from `600b48b`.

**It was resumed from a partial patch.** An earlier author run of this batch was cut off by a network failure after
about 100 tool calls, before it committed anything. Its unverified work was saved as a patch (eleven files: the
migration, the pins in `run.mjs`, the proof in `authz-proofs.mjs`, the 050 fixture, the isolation suite's enqueue, the
WS:905 fixture and the lint data). This run applied it to a branch cut from `origin/main`, read every hunk against the
inputs, re-measured all of it on its own cluster, and finished what was missing. That was the probe digests, the
assertions and one new test, the floors, the branch slot, the RFC's Implemented line, the blockers, this file and the
plan. Plan §1 says what was kept and why.

What it does, in one forward migration, `174_job_tenant_context.sql`:

1. **Q-028-5, as RFC-2026-028 recommends.** `app.jobs` gains `actor_kind`, `actor_id`, `request_id` (the enqueuing
   request's) and `correlation_id`, which RFC-2026-026 §3.5's worker producer reads. They are text, `NOT NULL`, with
   no default. `actor_kind` is CTR-TEN-001's enum exactly. The three ids are bounded by 172's identifier shape. Only
   `app_worker` may `SELECT` and `INSERT` them, and no role may `UPDATE` them. Every writer of `app.jobs` names them.
2. **A1-173-3.** Two more rules in the pinned grant probe. Rule 10: no non-superuser role holds `CREATE` on a database,
   or a database privilege with grant option. Rule 11: every non-superuser role's `EXECUTE` beyond what `PUBLIC` holds
   is exactly a pinned list of 31 rows, and `PUBLIC` executes nothing in `app` or `private`.
3. **171 (6), by inheritance.** 174's own block reads every role that `anon` or `authenticated` reaches through
   `pg_auth_members`, recursively. It refuses a policy TO any of those roles that bypasses the lifecycle helper.

Plan §2 maps each item to its change and the test or drift that holds it. Plan §3 is what was measured.

## 4. Answered as A0 recommends under the delegation

Each of these is a question the work raised that no approved text answered, or an answer the RFC left to its
implementing batch. Each is answered as A0 recommends, under `เอาตามที่คุณแนะนำทุกอย่าง` and `พร้อมแล้วลุยเลยนะ ไม่ต้องรอผม`,
and recorded here and in plan §4. **A0 executes these answers; the Owner may correct any.**

- **D1. The migration is numbered 174**, the next free number after 173, which it sorts after. RFC-2026-028 §3.4 and
  Q-028-5 say "A0's kernel range" (`050`), but a file numbered there would sort before `051`-`173` and run out of order
  on any database that holds them. This is the same one-time exception to the registry's ranges as 172's and 173's. The
  Integration Owner's acceptance is owed (`open_blockers[202]` (1)).
- **D2. The columns are CTR-TEN-001's `actor` flattened as 140 flattened CTR-AUD-001's**: `actor_kind`, `actor_id`.
  These are the names §3.4 lists. `causation_id`, `locale`, `timezone`, `business_profile_id` and
  `page_context_profile_id` are not stored. Plan §4 says why.
- **D3. The bound is 172's identifier shape**, `^[A-Za-z0-9._:-]{1,128}$` (batch 141's D9), for `actor_id`,
  `request_id` and `correlation_id`. CTR-TEN-001 states only `minLength: 1`. This narrows the contract as CTR-JOB-001
  reads it, and it is stated exactly on `open_blockers[202]` (2). It is not hidden.
- **D4. No default and no backfill.** The table holds no row wherever 174 applies: 050 is applied to no provisioned
  instance, and a migrate-clean cluster has no job when 174 runs. On a populated table the `ADD` fails closed with
  23502, measured. No row is given an invented actor.
- **D5. `SELECT` and `INSERT` for `app_worker`, `UPDATE` for no role.** This is 050's rule for a column an enqueuer
  supplies. It keeps the refusal of the service's enqueue with row level security, not with a missing grant. The
  correlation is "unchanged across attempts" (§3.4).
- **D6. CTR-JOB-001 is not restated here.** `contract-catalog/` is read-only to this package. The restatement and the
  narrowing are owed to the contract's owner (`open_blockers[202]` (2)).
- **D7. A1-173-3 is pinned in the pinned grant probe, not the client schema probe.** The pinned grant probe already
  reads every non-superuser, non-`pg_*` role, the client roles included. The client schema probe reads the client
  roles only.
- **D8. 171 (6) is resolved through `pg_auth_members`, not by narrowing its comment.** The rule is completed as 174's
  own block, re-run after every later migration. 171 and its replacement are not edited.
- **D9. Drifts on 174's own columns were appended to 174, not to `140_audit.sql`.** The columns do not exist when 140
  runs. Every other drift was appended to 140, as the brief says.
- **D10. The try-it demo was run on a port of its own range (55479), checked free first.** The tool refuses this run's
  port 5507 by design (`RESERVED_PORTS`). The earlier batches ran it the same way.

## 5. What stays owed

These are on `open_blockers[202]`, each with its owner: the number's acceptance (D1); CTR-JOB-001's restatement and
the narrowing stated exactly (D3, D6); 174 declared not applied to the provisioned instance (D4); reading rules 10 and
11 off this branch's first CI run; the stated limits; and this batch's independent review by C0, A1 and Q0. RFC-2026-026's
worker half, which reads the columns, stays where it was (`[21]`, `[113]`, `[201]` (5)).
