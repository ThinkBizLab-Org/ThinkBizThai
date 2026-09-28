# A0 integration record: batch 105, what three role runs found, and what changed

Author run: `/claude/a0_atlas`. Package `WP-0A-DB-00`, branch `agent/claude/WP-0A-DB-00-batch-105`.
The batch was built at `4eb118e`. All three role runs reviewed that head, and their files were
cherry-picked with `-x` (`82720ab` C0, `5fb4371` A1, `5ba7eb0` Q0). The corrections are the commit
that follows. This file approves nothing.

## 1. The headline, agreed by all three

**Batch 105 closes blocker 189 on all seven tables for every client role, and none of the three
found a stop-the-line.**

- A1 reproduced its own F1 on the base and found the forgery reached **four roles, not just the
  owner** it had reported. It also found a second route, `INSERT … ON CONFLICT DO UPDATE`. All of
  these are refused on the head.
- Q0 tried every role, NULL, and ON CONFLICT on all seventeen `updated_by` tables and found no
  forgery. Q0 also reproduced the negative control: without 105, exactly the seven forging cases
  fail.
- C0 re-measured all seventeen tables and found the same.

## 2. Acted on in the corrections commit

| Finding | What changed | Measured |
|---|---|---|
| C0 F1, A1 F1, Q0 F2 (the general rule checks that the text is present, not that the policy binds; the comment claimed "a later table cannot reopen the class") | 105's comment, error message and README now say exactly what the rule proves and what it does not. The rule now also reads partitioned tables and refuses a table whose RLS is not enabled and forced | a later `no force row level security` on `workspaces` fails `migrate-clean`, naming 105's block |
| C0 F2 | The comment about the service's refusal is corrected: the service holds UPDATE and is filtered by RLS | — |
| C0 F4, Q0 F4 | Owner positives for honest updates on `workspaces`, `workspace_settings` and `workspace_invitations`, and a NULL-forging case | rls-smoke: 976 cases, all passing |
| C0 F6 | Stale comments in 030's replacement and the rename helper | — |
| C0 F7 | The pin test now reads the general rule's SQL as well as its messages | test |

## 3. Recorded, not acted on here

- **The general rule's real weakness** (C0 F1, A1 F1, Q0 F2). A1 and Q0 measured it on
  `publish_intents`, and Q0 on `content_items`. On the ten tables whose `updated_by` binding lives
  in their permissive UPDATE policy, a later second, looser permissive policy or an `or true`
  reopens the forgery with every layer green. The seven tables 105 fixed are not affected: they are
  restrictive and pinned by exact text.
  - C0 and A1 grade this LOW. Q0 grades it MEDIUM and says that fixing it before merge is the
    Owner's decision.
  - It is recorded on the name-or-token blocker. **A0 recommends the remedy A1 names: batch 105's
    restrictive closure on all seventeen tables, pinned by exact text, with the general rule then
    requiring exactly that closure.** That extends the shape the Owner chose to the ten tables. No
    UPDATE that works today would be refused, because the ten already require equality. It is put
    to the Owner in §4 rather than done here, because the Owner approved seven tables.
- **`approval_requests.decided_by` can be forged at cancellation** (A1 F2 and Q0 F1, both MEDIUM,
  predating 105). A **new blocker (189)**. Its grade and remedy are the Owner's.
- **Q0 F3 (LOW).** Nothing proves the general rule can fire. The closure probe's self-test drifts
  only an INSERT closure. This becomes moot if the rule turns into the exact seventeen-table check
  above; otherwise it is owed as a catalog-rule probe with its own drift.
- **Q0 F4 (LOW).** The harness does not record *which* policy refused a case, so a forging case
  would pass whichever policy on the table refused it. Recorded.
- **Q0 F2's case gap.** Five of the ten bound tables have no UPDATE forging case: `content_items`,
  `asset_rights`, `approval_policies`, `approval_requests`, `publish_intents`. This belongs with the
  forging-case work (survey item 3).
- **A1 F3 (NOTE).** Every client UPDATE on the seven tables must now name its caller, so an admin
  renaming a row the owner last touched is refused unless the admin names itself. This fails closed.
  API callers will see a permission error, so the API contract must say so when it is written.
- **A1 F4 (NOTE).** `app_worker` holds UPDATE on `updated_by` on nine tables, but no policy lets it
  update anything, so this is harmless today. A future worker UPDATE policy would leave the column
  unbound, because 105 covers `authenticated` only.
- **Q0 F5 (INFO, predates 105).** With RLS disabled on `app.workspaces`, `migrate-clean` passed
  before this correction; it now fails on 105's rule. `schema-lint` reads the snapshot, which stops
  at batch 010.

## 4. For the Owner

1. **The seventeen-table extension** (§3, first item). A0 recommends it as the next batch.
2. **Blocker 189 (new): `decided_by` at cancellation.** Its grade and remedy.
3. **Still open:** A1's objection to delegating plan questions F and C of the probes in advance; the
   post-migrate pass's integration record §4; batch 121's three questions.
