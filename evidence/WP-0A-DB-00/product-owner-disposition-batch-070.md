# Product Owner disposition — batch 070's three open readings

**Recorded:** 2026-09-10
**Authority:** Product Owner
**Subject:** `db/foundation/migrations/070_research.sql` as it stands at `8a28c8b`, and the three
questions its own `known_limitations` and `open_blockers` left for an owner rather than an agent.
**Evidence origin:** Owner statement in the ThinkBizThai project conversation, transcribed here as
the repository evidence record. The transcription is the record; the conversation is not.

## What was put to the owner

Three questions, in the form they were asked, because a disposition on a paraphrase is a
disposition on nothing:

1. **A `Y` cell implemented in half.** §8.2 marks "Start/cancel Research" `Y` for the owner, the
   admin and the editor. Batch 070 implements the CANCEL as a client `UPDATE` behind a policy and
   does **not** implement the START, because the row's own `INSERT` is `N` for every client column
   on the next line of the same matrix — so starting research is a command function's act, and
   `RFC-2026-021` §10 records that no command function exists. Accept the half, or wait for the
   command function?
2. **`app.research_suggestions.used_at` is not bound to the act it records.** A client holding the
   column can stamp it on a suggestion nothing used, because binding a lifecycle stamp to the
   operation it describes is what a command function is for. Acceptable at G0?
3. **`app.research_snapshots` is this batch's own reading rather than a quotation.** Neither §6's
   migration ownership registry nor §4's ERD names the table; §5's inventory does. Should it exist?

## Disposition

> ข้อ 1 รับได้ ข้อ 2 รับได้ ข้อ 3 ควรมี

Read against the three questions above, in order:

| # | Subject | Disposition |
|---|---|---|
| 1 | The half-implemented `Y` cell | **Accepted.** The CANCEL ships; the START waits on a command function. |
| 2 | `used_at` stampable by a client | **Accepted at G0.** |
| 3 | `app.research_snapshots` | **It should exist.** The table stays. |

## What this settles, and what it does not

**Settled.** Batch 070 may ship the CANCEL without the START, may ship `used_at` unbound, and keeps
`app.research_snapshots`. Question 3 in particular was a question about SCOPE — whether a table
absent from two source documents belongs in the schema at all — and it is the kind of question an
agent must not close for itself. It is closed.

**Not settled, and each still owed to somebody:**

- The START path. It needs a command function, and none exists. This disposition accepts the gap;
  it does not authorise a policy or a grant that would close it, and it does not assign the batch
  that writes one.
- `used_at`'s binding. Accepted at G0 is not accepted at Pilot. The day batch 080 creates a content
  idea from a suggestion, an unbound stamp becomes a claim about an act that may not have happened.
- `DATA-DEC-07`. Untouched. `retention_until` is `NOT NULL` with no default and no arithmetic
  anywhere in the file, so every capture states its own limit; the 30-day number is Research's and
  Legal's and is not decided here.
- `COPYRIGHT-3`. Untouched. `app.research_snapshots` holds a locator and a digest and no captured
  content, and nothing in this repository defines what approves an excerpt. Deciding that the table
  should exist is not deciding that it may ever hold an excerpt.
- The `S` cell. `RFC-2026-022` is not in effect — the only member of `app_worker` is `postgres`,
  which bypasses row level security — so batch 070 classifies its three statements as data in
  `db/foundation/lint/service-policy-map.json` and writes no service policy. Unchanged by this.

## Explicit limits

This disposition does **not**:

- pass Gate G0, which remains Specification Baseline Complete / External Verification Pending;
- move `WP-0A-DB-00` out of `in_progress`, or make any package `Ready`;
- fill `role_assignments.product_reviewer_agent_run_id`. That field wants an independent
  Product/UX **agent run** — the one package that has it filled carries `/root/a5_loom` — and the
  Product Owner's own authority is not that role and is not delegated to it under `RFC-2026-013`;
- substitute for the independent Reviewer (`/claude/c0_contract_reviewer`), Tester
  (`/claude/q0_sentinel`), Security (`/claude/a1_bastion`) or Integration Owner
  (`/claude/r0_steward`) evidence that `RFC-2026-002` requires before a merge into `main`;
- authorise the merge of PR #104. A manual merge cannot waive an unresolved stop-the-line risk, and
  four role signatures are still absent;
- approve Meta or Stripe credentials, payment operations, legal/PDPA/accounting decisions, storage
  configuration, production data handling, or any production release.

## What the isolation cases have now met, since the handoff says otherwise

`handoffs/WP-0A-DB-00-author-handoff.json` at this revision records, as a known limitation, that
"THE ISOLATION CASES HAVE NEVER MET A DATABASE", because the machine the branch was written on had
no PostgreSQL client. That is no longer true and the correction belongs beside the disposition
rather than only in a later increment's notes.

Measured 2026-09-09 on PostgreSQL 17.11 with `db/foundation/ci/supabase-shim.sql` applied first —
plain Postgres plus the shim, **not** the provisioned Supabase instance, whose own header says so:

| target | result |
|---|---|
| `make db-migrate-clean`, including `070_research.sql` | ok, 661ms |
| `make db-rls-smoke`, 554 cases including 73 whose id names research | **ok, 38,584ms** |
| `make db-schema-lint` | ok, 20ms |
| negative control on `app.research_runs` | went **RED** on 12 cases, first `editor-a-cannot-see-the-research-run-outside-their-narrowing` |

Two precisions, because the difference matters and would otherwise be discovered by a reader:

- The 554-case pass was measured through the psql driver **this branch ships**. `git diff` over
  `scripts/db/psql-driver.mjs` and `scripts/db/rls-smoke.mjs` between this branch and the base the
  measurement was taken on is empty, which is what makes the reading transferable to this PR.
- The negative control was run through the **replacement** driver proposed in a later increment,
  not this one. So "the cases are written correctly and pass on this branch's driver" is measured
  here; "the cases detect a disabled policy set" is measured on a driver this PR does not contain.

Neither reading discharges `RFC-2026-022` §7.3 (a)–(d), which name the provisioned instance and
forbid a citation in place of a reading.
