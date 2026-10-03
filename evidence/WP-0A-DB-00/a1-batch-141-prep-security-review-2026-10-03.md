# A1 security review: batch 141's preparation

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141-prep` (PR #169, Draft), head `047a0e2`
  (`047a0e25acc1da54c14ef17aab17f6a124e8dfe7`) over code `b99218e`, base `c5a648e` (main). Author
  `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-141-prep` at `047a0e2`, in this run's own worktree.
  For the branch-name-sensitive commands I switched the same worktree to the branch name
  (`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-141-prep`, HEAD confirmed
  `047a0e2`). I committed nothing on that name and switched back before writing this file.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this
role run. Accepting this review as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine.

## 1. Questions asked

1. Does anything in this batch grant, classify or imply a write path that does not exist? In particular,
   does classifying the §8.4 audit INSERT cell `carried` weaken a lint, or let a policy land later
   without review?
2. Do the CTR-AUD-001 fixtures contain anything resembling secrets or PII?
3. Does the coverage map leave out a security-relevant action that the documents name (credential, role,
   delete, billing, support)?
4. Are the claims in the commit messages, plan, disposition, blocker edits and handoff true?
5. Is anything stop-the-line, and does anything block the merge?

## 2. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-141-prep-plan-2026-10-03.md`; the disposition
`product-owner-disposition-2026-10-03-batch-141-prep.md`; the full diff `c5a648e..047a0e2`, with
`db/foundation/lint/service-policy-map.json`, `db/foundation/lint/audit-coverage-map.json`, all 13
files under `test-kits/db/fixtures/ctr-aud-001/`, the four new tests
(`test-kits/db/foundation-contract.test.mjs:3314-3600`) and the `open_blockers[33]`/`[191]` edits read
in full; `scripts/db/run.mjs:2579-2700` (`servicePolicyMapLint`, `servicePolicyMapCheck`) and
`:3190-3210` (the static target dispatch); `140_audit.sql:286-296, 410-450, 583-600, 725-745, 836-850,
970-985`; RFC-2026-022 §3 (`:170-199`), §7.1 (`:471-502`) and §7.2 (`:504-519`); ERD §8 (all four
matrices) and §11 (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:530-610`, and `:526`);
`docs/plans/meta-security-production-ops-workstream-th.md:155-240, 370-390`; OB-005
(`docs/plans/module-contracts-events-jobs-workstream-th.md:337`); DB-12
(`docs/plans/core-database-and-rls-workstream-th.md:790-800`); `ctr-aud-001/schema.json` and
`manifest.json`.

**Measured** (Node `v24.20.0`, `node -v` before each run; `/Users/bank/.local/node-v24.20.0/bin/node`
first on PATH):

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs c5a648e WP-0A-DB-00` | `review/a1-batch-141-prep` and again on the branch name | 0, 0 | `all 25 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | `review/a1-batch-141-prep` | 75 | `no work package declares ownership.branch "review/a1-batch-141-prep"`. This is expected, and it is why the next row runs on the branch name. |
| `npm run check:handoff` | branch name `agent/claude/WP-0A-DB-00-batch-141-prep` | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` | branch name | 0 | `clean: exit 0 — tests 681, pass 681, fail 0, skipped 0, todo 0` |
| `node scripts/scan-repository-secrets.mjs` | branch name | 0 | clean |
| `make db-schema-lint` | branch name, static | 0 | `db-schema-lint: ok` |
| `make db-contract-check` | branch name, static | 0 | ok |
| guard count (`stripNonCode` + `countDeclaredTests` + `assert.*(` count, imported from `scripts/verify-test-coverage-floor.mjs`) | `c5a648e`'s and `047a0e2`'s `foundation-contract.test.mjs` | 0 | main: 73 tests, **549** assertions; head: 77 tests, **613** assertions. This matches the plan's 549 + 64. |
| `git log --diff-filter=A` on `140_audit.sql` and `service-policy-map.json`; `grep -ci audit` of the map at `75c9274` and `c5a648e` | | 0 | `b0267f5` 2026-09-07, `2e08e57` 2026-09-08; 0 and 0 hits. The `_what_batch_140_classified_in_141_prep` note is true. |
| regex probe of the new test's later-migration rule (`foundation-contract.test.mjs:3335`) against four policy spellings | node one-liner | 0 | 1 of 4 matched (see R4) |
| grep of every consumer of the service-policy map and of `audit-coverage-map` / `ctr-aud-001` in `scripts/`, `db/`, `Makefile`, `.github/` | | | the map is read only by `servicePolicyMapLint`/`servicePolicyMapCheck` (static `schema-lint`) and by tests; the coverage map and fixtures are read by tests only; no changed path is under `migrations/`, `invariants/`, `ci/`, `seeds/`, `scripts/db/`, `.github/` or `Makefile` |

**Not run: the live DB.** Nothing a live layer reads changed (last row above). Re-running
`db-migrate-clean`/`db-rls-smoke` would have measured `c5a648e`'s database again. I started no cluster
on 5501, so there was none to remove. Scratch files are under the private directory `a1-141-prep/`.

## 3. Answers

### Q1. Does it grant, classify or imply a write path that does not exist?

**It grants nothing and weakens no lint today.** Measured: no policy, grant or migration changed. The
map's `shape` is read by no rule except the closed-field, two-shape, table-exists and duplicate checks
in `servicePolicyMapLint` (`run.mjs:2608-2665`), so a `carried` row has no effect on anything
`schema-lint` or the live layers enforce. The new test `foundation-contract.test.mjs:3314` adds a guard
that did not exist before: no `create policy` in 140, and none on an audit table in a later file. The
rows carry no `role` field, and the lint would refuse one (`CELL_FIELDS`, `run.mjs:2606`). 140's
in-migration block still refuses any policy naming `app_worker`, `app_command`, `app_maintenance` or
`anon` on either table (`140_audit.sql:970-985`).

**It does classify ahead of the decision that would use the classification.** That is R1. RFC-2026-022
§7.1/6 and /8 (`RFC-2026-022:494-502`) say that once the RFC is in effect, a service policy matching the
pinned CARRIED shape "owes a map row instead" of an exemption-register row. These two rows are therefore
the paperwork that a future `TO app_worker` audit INSERT policy would need, written before Q141-a
decides whether the worker is the producer at all. Neither /6 nor /8 is implemented yet (no consumer,
measured), so nothing lands without review today. Any future policy still arrives in a migration diff.

### Q2. Secrets or PII in the CTR-AUD-001 fixtures?

**None.** I read all 12 fixtures and `store-conformance.json`. Every identifier is synthetic:

- UUIDs of the form `00000000-0000-4000-8000-0000000141xx`;
- `user_synthetic_141_owner`, `system_billing_projection`;
- `req_`/`corr_`/`evt_synthetic_141_*`;
- refs such as `record:workspace_member_scope.synthetic-141-1.v1`.

There is no email address, phone number, name, IP address, user agent, token, key or free text, except
`"note": "synthetic free text"` in `invalid-details-not-empty.json`, which is the point of that fixture.
`invalid-pii-not-redacted.json` sets the flag to `false` and carries no PII. A grep for email, Thai phone,
Stripe, JWT, Meta-token, `password`, `token` and `secret` value patterns over the fixtures and the
coverage map found nothing. `scan-repository-secrets` exits 0.

### Q3. Does the coverage map omit a security-relevant action the documents name?

**Yes.** R2 lists them. The map has one row per SEC-009 class, plus the two owed actions. Its `_what`
claims "one row per action SEC-009 and OB-005 name". OB-005 names "security/admin/external actions", and
the security workstream and the ERD name several audited actions that have no row. The test
(`foundation-contract.test.mjs:3401`) requires only one row per SEC-009 category, so the omission passes.

### Q4. Are the claims true?

Every claim I checked holds:

- The floor arithmetic: 549 + 64 = 613, and 73 -> 77 tests (measured).
- Branch scope: 0, with 25 paths at the head. The plan's 23 was measured at `b99218e`, before the plan
  and disposition were added.
- `check:handoff` and `verify`: 0 on the branch name.
- The `140_audit.sql` line citations F1-F5: `:418`, `:419-421`, `:423-424`/`:429-431`, `:439`,
  `:447-448`, `:572` (the header of the section creating `security_events` at `:583`), and `:740-741`.
- RFC-2026-022 `:175`, `:180` and `:504-514`; the map note's two commits and dates; `CELL_FIELDS` at
  `run.mjs:2606`; the static target at `run.mjs:3202-3203`.
- "No contract example is storable" (F1): the examples use `aud_synthetic_000N`, and the store wants a
  uuid.
- The blocker line pins: `open_blockers[i]` on line 254+i. The coverage-map test checks every pin, and it
  passes.
- The two cherry-picks and the conflict note in `3d9ede0`'s message.
- Blocker 191 says "NONE IS STOP-THE-LINE". I agree.
- Not re-measured: A0's 28 reversal probes (A0's private scratchpad) and the CI run 37134594625 that the
  disposition cites. I took these on the record.

### Q5. Stop-the-line and merge

**No stop-the-line.** Nothing in this batch exposes a secret, leaks across tenants, causes a duplicate
side effect, loses a job, diverges a migration, deletes irreversibly or breaks a contract. No finding
below blocks the Owner's merge on its own. R2 is the one I would want addressed or recorded before batch
141's producer RFC, because Q141-a is asked against the map's scope.

## 4. Findings

### R1 (LOW): the CARRIED rows pre-position a worker INSERT policy that Q141-a has not chosen, and workspace-only confinement does not hold the audit scope path

- **Where:** `db/foundation/lint/service-policy-map.json:135` and `:143`.
- **Why:**
  - Under RFC-2026-022 §7.1/6 and /8, a CARRIED-shape service policy owes a map row and no
    exemption-register row. These rows supply that for `app_worker` on `app.audit_logs` and
    `app.security_events`, while Q141-a (trigger vs worker vs hybrid) is open.
  - The rows' `why` says the classification "holds whichever producer issues the INSERT". That is true
    of the statement, but it means that if Q141-a chooses (B) later, nothing re-asks the question.
  - Separately, for this family the pinned confinement term constrains only `workspace_id`. Neither audit
    table has a foreign key (`open_blockers[32]`), so a service INSERT naming another workspace's
    `business_profile_id` or `page_context_profile_id` would pass a CARRIED policy.
- **Today:** no effect; measured.
- **Remedy (A0, or A1 under blocker 191):** state in `open_blockers[191]` (2), or in the rows' `why`,
  that:
  - the rows are re-confirmed when Q141-a is answered;
  - any service INSERT policy on these tables owes the scope-path check that blocker 32 assigns to the
    producer, in addition to the workspace term.

### R2 (MEDIUM): the audit coverage map omits audited, security-relevant actions that the baseline names

- **Where:** `db/foundation/lint/audit-coverage-map.json:2` (the `_what` claim) and `:21-149` (the rows).
- **Named and missing:**
  - **Export (data egress):** PDPA-007 "export ... audit" (`meta-security-production-ops-workstream-th.md:185`);
    ERD §11.1 item 7, "download URL short-lived, single-purpose, audited" (`ERD:542`).
  - **Delete:**
    - PDPA-008, "delete account/workspace/business ... tombstone/audit" (`:186`). Only workspace
      closing and asset purge have rows; account deletion and Business/Page archive or purge
      (ERD §11.3) do not.
    - ERD §11.2, removing or suspending a member, with session, push-token and invitation revocation.
      The role row names only invite, scope change and owner transfer/removal.
  - **Billing:** BIL-013, "Admin adjustment/credit/manual payment ... Audited admin tools", dual
    confirmation (`:230`). The billing row covers webhook-projected state only.
  - **Support/ops:** OPS-002 and `:388`, "งาน publish/charge/delete ทุก manual replay ต้อง preview target
    และมี audit": a manual replay of publish, charge or delete must be audited. There is no row.
  - **Holds:** ERD `:526`, a legal/finance/rights hold "ต้องมี ... audit trail". A hold blocks deletion,
    and there is no row.
- **Why it matters:** DB-12's acceptance is "critical actions มี actor/request/target/outcome". The map
  is the input to Q141-a, so an understated map understates the producer surface the Owner and A1 are
  asked to decide. The test checks one row per SEC-009 category and nothing more
  (`foundation-contract.test.mjs:3399-3403`).
- **Not stop-the-line:** nothing can write an audit row today (`open_blockers[21]`), and the map says it
  is "a map of what is owed".
- **Remedy (A0):** either add the rows (`category: null` with a note where none fits, tables empty with a
  note where no table exists), or narrow `_what` to "a representative row per SEC-009 class". In both
  cases record the named omissions in `open_blockers[191]`.

### R3 (LOW): the platform-scope security event gap is named in the new row but held by no blocker

- **Where:** `service-policy-map.json:143` (the `why`, which correctly says an unattributed login failure
  or a replay against an unknown tenant "cannot be stored by this table at all");
  `140_audit.sql:290-295`.
- **Measured:** no `open_blockers` entry mentions a platform-scope or no-workspace security event (a
  regex over all 192 blockers).
- **Why it matters:** SEC-014 (login rate limits) and SEC-018 (account-takeover tabletop) need exactly
  these events.
- **Remedy (A0, with A1 as owner):** add it to `open_blockers[191]` as owed to A1, beside Q141-a.

### R4 (LOW): the new test's "no later policy on an audit table" rule matches one spelling only

- **Where:** `test-kits/db/foundation-contract.test.mjs:3335`, regex
  `/create\s+policy[^;]*\bon\s+app\.(audit_logs|security_events)\b/i`.
- **Measured:**
  - It matches `create policy p on app.audit_logs ...`.
  - It does **not** match `on "app"."audit_logs"`, `set search_path=app; create policy p on audit_logs`,
    or a `DO` block that runs `execute format('create policy ... %I.%I', 'app', 'audit_logs')`.
- **Mitigation, read but not measured:** the live block at `140_audit.sql:976-985` refuses a policy for
  `app_worker`, `app_command`, `app_maintenance` or `anon` on either table. It does not cover
  `authenticated`.
- **Remedy (A0):** either accept quoted and unqualified forms in the regex, or state in the test that the
  catalog is the authority and this text check is only a tripwire.

### R5 (INFO): the audit row's reasoning overstates "inside a resolved CTR-TEN-001 context" for denial records

- **Where:** `service-policy-map.json:138` (the `why` of the `audit_logs` row).
- **What:** a `denied` record, such as `valid-publish-denied-on-page.json`, may be written for an actor
  whose membership or scope validation is what failed. The target workspace is still an input, so CARRIED
  holds, but the sentence says more than the case supports.
- **Remedy:** reword the sentence when the row is next touched.

### R6 (INFO): absolute local paths in the committed phase plan

- **Where:** `evidence/WP-0A-DB-00/a0-phase-plan-141-170-2026-10-03.md:240-244` (`/Users/bank/ThinkBizThai/...`).
- **What:** these are not secrets. `git grep` finds the same pattern in 47 evidence files at `c5a648e`, so
  this is established practice. It is noted only because evidence files are meant to carry no private
  paths that aren't needed.
- **Remedy:** none required.

## 5. Stop-the-line verdict

**None.** R2 (MEDIUM) and R1, R3, R4 (LOW) are recorded as owed. None of them blocks the merge on its
own, by my reading. Whether to merge before R2 is recorded is the Integration Owner's and the Owner's
call.

## 6. Limits

- I am the same vendor and model family as the Author (RFC-2026-024).
- No live database was run. The live behaviour of a quoted-identifier policy (R4) is read, not measured.
- A0's 28 reversal probes and CI run 37134594625 were taken on the record and not re-run.
- I compared the coverage map against the documents listed in §2 only. Other workstream documents may
  name further audited actions.
