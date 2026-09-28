# A0 integration record: batch 123, what three role runs found, and what changed

Author run: `/claude/a0_atlas`. Package `WP-0A-DB-00`, branch `agent/claude/WP-0A-DB-00-batch-123`.
The batch was built at `5856f0b`, and RFC-2026-025 was marked approved at `10d4a2a`. All three role
runs reviewed `5856f0b`. Their files were cherry-picked with `-x`: `46597fc` (C0), `c43ed4d` (A1)
and `8ba29d0` (Q0). The corrections are the commit that follows this one. This file approves
nothing.

Under RFC-2026-025 §5 item 2, approved by the Owner on 2026-09-28 (`อนุมัติ §5 ของ RFC-025`), a
correction commit is re-verified by role runs before merge. The runs on `5856f0b` do not cover it.
§5 item 6 makes this PR one the Owner merges personally, because it carries RFC-2026-025.

## 1. The headline, agreed by all three

**Batch 123 does what it claims on the database as built. None of the three found a
stop-the-line.**

- **A1** re-measured its own F1 and F2 from its review of 105, base against head. Both are closed:
  no `updated_by` forgery on any of the seventeen tables, and no decider on a cancellation.
- **Q0** made 95 mutation runs on the declared toolchain. It found no forgery of `updated_by` on
  any of the seventeen tables, by any of eight identities, through UPDATE, upsert, MERGE or NULL
  (1,168 live statements). It found nothing that writes `decided_by` or `decided_at` onto a
  cancelled, pending or expired row, through any writer and in any replica mode. Its baseline
  reproduced: verify 671/671, migrate-clean 44 blocks, rls-smoke 977 cases.
- **C0** measured the coverage rule and every replacement's `fails_with`. All four RFC-2026-025
  findings (F1–F4) are about governance text, not the database.

What the three found on the database is one class. **A later migration could still reopen an
attribution forgery with every layer green**, through a column or a constraint that 123 leans on
but does not pin. The corrections pin them.

## 2. Acted on in the corrections

| Finding | What changed | Measured |
|---|---|---|
| **Q0 F2, MEDIUM**. C0 F6 and A1 F3 are the same finding, each graded LOW. `decided_by` at decision is bound only inside the permissive decide policy. Q0's E19b let an approver approve in the owner's name. | A new restrictive UPDATE closure, `approval_requests_decided_by_on_update_is_caller`, checks `decided_by is null or` the caller. It is asserted in 123's block and pinned by exact text in a new decider closure probe. It refuses nothing that works today: clients update only pending rows, cancellations name no decider, and decisions name the caller. | **E19b alone:** all 986 cases pass, because the closure holds. **E19b plus a dropped closure:** the two cases that name another decider fail. **Closure dropped alone:** `editor-a-cannot-cancel-an-approval-request-naming-another-decider` fails, because the pair then refuses with 23514 instead of 42501. |
| **Q0 F1, MEDIUM.** 123's fix at cancellation also depends on 090's `approval_requests_decision_has_a_decider`, and nothing checked that constraint. E20 dropped it and a cancellation carried a whole decision stamp. | 123's block asserts 090's constraint by definition text, next to the pair. A new pinned-check probe pins both constraints by text and requires them validated. A new case cancels with both columns set. | **090's constraint dropped:** exactly `…-with-a-whole-decision-stamp` fails. **Pinned-check drift:** refused by name. |
| **Q0 F3 (LOW) and C0 F5 (LOW)**, one class. The coverage rule and the UPDATE rule ran but were never self-tested. | Every catalog probe now has one self-test drift per rule, and a static test holds the number of drifts equal to the number of raises. The closure probe is split into one probe per rule, which also gives the requester rule a drift for the first time. Applying the same check to every probe found five more rules no drift reached, now closed: security definer (a pinned function made `security invoker`) and trigger (a dropped `refuse_truncate`, a `session_replication_role` role default, a child of `security_events`). The fifth was the FK-action probe's stale-exemption rule. It is now written only when an exemption exists, so no rule goes untested. A probe with no self-test fails the verdict. | **migrate-clean:** nine probes. Each refused each of its drifts with its own raise: 1+1+1+1+1+1+1+2+4. After the runs, `pg_db_role_setting` is empty and no child table exists. |
| **Q0 F4, LOW.** The pair was tested in one direction only. The runner compared the SQLSTATE and not the constraint. | A `rejected` case may now name the constraint it proves (`violates`), and the runner checks the name in the message. A static test holds each name to a constraint some migration creates, and exercises the runner on a match, a mismatch, a longer name and an accepted row. New case: `…-with-only-a-decided-at`. The existing pair case now names the caller as decider, because row level security's WITH CHECK runs before CHECK constraints, and naming another member is refused first by the new closure (its own case). | **Pair dropped:** exactly `…-naming-a-decider` and `…-with-only-a-decided-at` fail. |
| **Q0 F5, LOW.** Five of 123's ten tables had no UPDATE case forging `updated_by`. Q0's E02c on `content_items` could not be seen by rls-smoke. | Five cases: `content_items`, `approval_policies`, `approval_requests`, `asset_rights`, `publish_intents`. Each is the passing statement of an existing positive, with the actor changed to another member. All seventeen tables now have one. | **Per table, closure dropped and an open permissive policy added:** that table's new case fails. |
| **C0 F7, LOW.** Stale raise messages in the six replacements. | They name 123, and 090's replacement now also names the decider closure. The register's `fails_with` for 090 moves from 11 to 12. | migrate-clean: 44 blocks, 34 as written, 10 replaced |
| **C0 F9, LOW.** The ninth-pass record lacked the RFC-2026-002 caveat. | Caveat added. | — |
| **C0 F1–F4 (MEDIUM, LOW)** and **A1 F8 (MEDIUM) and F9 (LOW)**, all on RFC-2026-025's text. | RFC-2026-025 §5, approved by the Owner, covers six things: a narrowed record-only scope, re-verification of fix commits, §3 and §1 corrected, a mechanical record-only check, and tighter delegated-merge conditions (the head contains main, no unresolved security finding, and governance PRs merged by the Owner personally). | — |
| **C0 §4 item 1, MEDIUM.** At `10d4a2a`, A0 added a clause to the approved status line that the Owner had not approved. | Removed. The status line now says any change to the text, narrowing or widening, needs the Owner. | — |
| **A1 F7.** 123's comment gave the fixed count of seventeen a purpose it did not have. | The count is gone. Planning batch 091 showed it would fail any later table at apply time. The probe's pinned list keeps the count. | — |

The counts after the corrections:

- rls-smoke: **986 cases** (977 + 9).
- Static isolation suite: 302/302.
- foundation-contract: 71/71.
- The family counts batch 100 and batch 120 pin move by one each, because each gains a row-level
  refusal case (asset_rights, publish_intents). The static test says why.

## 3. Recorded, not acted on here

- **`decided_at` is whatever the decider sends** (A1 F4, Q0 F7). 2000-01-01 and 2999-01-01 were
  both accepted. Batch 160's retention sweep will read the value. The fix is for the database to
  set it, which changes behaviour and is the Owner's decision. It is recorded on the
  name-or-token blocker.
- **The `created_by` cases mostly test `updated_by`** (A1 F5). 102's closure refuses them first.
  This stays on the blocker, together with the owed `created_by` closure at INSERT.
- **Only schema `app` and role `authenticated` are read** (A1 F6, Q0 F6). Q0's E14, a
  client-updatable table in `public`, and E16, a policy giving `app_worker` UPDATE on `workspaces`,
  each pass every layer. E16 is caught only by 140-specific static rules. The service half is
  RFC-2026-023's question and belongs to the Owner. Recorded on the blocker.
- **No recovery path for a new CHECK over bad rows** (Q0 F8, INFO; A1 F7). Adding the pair to a
  table that already holds a forged cancellation fails the migration and rolls it back. Nothing
  needs recovering before G0. Before approvals exist in any environment, a reviewed remediation must
  run first: null the decider on cancelled rows and record which rows were changed.
- **C0 F8 (INFO), for the Owner in one line.** The pair CHECK is stronger than what was recommended,
  because it binds every writer and not only clients. After these corrections, the restrictive
  closure A1 recommended is in place as well.
- **C0 F10 (INFO, pre-existing).** RFC-2026-024's §0 disclosure guard in
  `test-kits/repository-json.test.mjs` matches role files by a name pattern that the files have not
  used since 2026-09-16, so twelve role files go unchecked. C0 grepped each one, and each contains
  the word the guard looks for. The gap is in the guard, not the files. This is left for its own
  change, since the file is not this package's.

## 4. What the corrections do not claim

- Neither role run re-verified these corrections. §5 item 2 of RFC-2026-025 requires that before
  merge.
- Q0's negative controls were re-run here by the Author, on the Author's own cluster, not by an
  independent run.
- The static suite ran on the branch name, so the handoff guard ran. CI has not been observed on
  this head.

## 5. The re-verification round, 2026-09-28 (RFC-2026-025 §5 item 2)

C0, A1 and Q0 re-verified the corrections at `f2c1a54`. Their files were cherry-picked with `-x`:
`a00fed2` (C0), `7646324` (A1) and `741001f` (Q0). All three say that **nothing should block the
Owner's merge**, and none found a stop-the-line. Each reproduced §2's negative controls
independently. CI run `36387036665` on #162 at `f2c1a54` is green.

What they found is recorded, not fixed, in this PR. **None of it is live on the clean set. Each item
needs a later edit to become a forgery.**

- **Recorded on blocker 186, with each reviewer's grade:**
  - A settled decision can be taken over (A1 N1, LOW; C0 F2, LOW). The Owner may read this as
    MEDIUM, because it is the approval gate.
  - The probe executor is pinned by nothing but a regex (Q0 F1, LOW).
  - The drifts-equal-raises guard reads only one spelling of a raise (Q0 F2, LOW; C0 F5, INFO).
  - A drift can commit itself (Q0 F3, LOW; A1 N5, NOTE).
  - The `content_items` forging case runs as the editor, not the owner (Q0 F4, LOW).
  - `violates` is not wired through `runOne` in any test (Q0 F5, LOW).
  - The FK-support probe has no self-test (C0 F6, INFO).
  - Two NOTEs from A1: the `*_by` coverage (N3), and the command-path binding (N2).
- **Two new blockers:**
  - No Integration Owner evidence exists for this package (C0 F4). Until this entry, nothing recorded
    that gap except RFC §5 item 3's own sentence.
  - What RFC-2026-025 §5 leaves open, for the Owner (C0 F1 MEDIUM, C0 F3 LOW, A1 N6 LOW). Any change
    to the RFC's text needs the Owner.
- **Done here, because it is prose A0 owns:**
  - The README now says the closure rules cover only `app` tables and role `authenticated` (A1 F6's
    wording, which C0 listed as not adopted).
  - It also says the FK-support probe has no self-test.
- **C0 F8 (INFO).** The corrections commit's message does not mention the one pre-existing case it
  changed. That case is disclosed in §2 of this record, and C0 found the change honest.

**A0's recommendation.** Merge #162 as it stands, then write one small forward fix at once:

- the settled-decision closure `using (status = 'pending') with check (true)`, which C0 measured
  passing all 986 cases, together with an owner-run redecide case;
- the probe-executor pins (Q0 F1–F3);
- an owner-actor forging case on `content_items` (Q0 F4);
- a `runOne` test for `violates` (Q0 F5);
- a self-test for the FK-support probe (C0 F6).

Fixing these inside #162 would start another re-verification round on a PR whose live forgeries are
already closed. Until the Owner decides the RFC-2026-025 points on the new blocker, A0 treats no merge
as delegated and asks the Owner to press each one.
