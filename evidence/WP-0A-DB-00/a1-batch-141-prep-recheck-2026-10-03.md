# A1 security re-check: batch 141 preparation's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141-prep` (PR #169, Draft, open, not merged),
  head `9be87ca` (`9be87ca27e31b8a769e25088768be331eb9a9d89`) over code `cc00ccc`, base `c5a648e`
  (main). Author `/claude/a0_atlas`. Previous reviewed head `047a0e2`
  (`a1-batch-141-prep-security-review-2026-10-03.md`, findings R1-R6).
- **Scope:** narrow. I checked the review-round corrections `047a0e2..9be87ca` against my own findings
  first, then answered the three security questions again for this head.
- **Checked out as:** local branch `recheck/a1-batch-141-prep` at `9be87ca`, in this run's own
  worktree. For `check:handoff`, `verify` and branch scope, I switched the same worktree to the branch
  name (`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-141-prep`, HEAD confirmed
  `9be87ca`, `git status` clean). I committed nothing on that name and switched back before writing
  this file.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same
vendor and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this
role run. Accepting this re-check as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine.

## 1. Read and measured

**Read:**

- `CONTRIBUTING_AGENTS.md`.
- My own review of `047a0e2`.
- The plan's §7 "Review round" (`a0-batch-141-prep-plan-2026-10-03.md:117-`).
- The commit messages of `549e76d`, `db699ee`, `251db95`, `cc00ccc`, `f8f1320` and `9be87ca`.
- The full code diff `047a0e2..9be87ca` (`audit-coverage-map.json`, `service-policy-map.json`,
  `store-conformance.json`, `foundation-contract.test.mjs`, `test-suite-contract.mjs`,
  `integrity-manifest.json`, and the `WP-0A-DB-00.json` edits to `open_blockers[33]` and `[191]`, both
  read in full).
- `scripts/db/run.mjs:2606-2660` (`servicePolicyMapLint`), `:183-205` and `:390-410` (the catalog
  policy rules).
- `foundation-contract.test.mjs:150-200` (the snapshot and not-applied declaration tests).
- From the governing documents: `meta-security-production-ops-workstream-th.md`, every line with
  "audit"; ERD (`sprint-0a-core-erd-rls-retention-th.md`), every line with "audit".

**Measured** (Node `v24.20.0`, checked with `node -v` before each measured run; scratch under the
private directory `a1-141-prepr2/`):

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs c5a648e WP-0A-DB-00` | `recheck/a1-batch-141-prep`, then the branch name | 0, 0 | `all 28 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | branch name | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` | branch name | 0 | `clean: exit 0 — tests 681, pass 681, fail 0, skipped 0, todo 0` |
| `node scripts/scan-repository-secrets.mjs` | recheck branch (same tree) | 0 | clean |
| `make db-schema-lint` / `make db-contract-check` | recheck branch | 0 / 0 | `ok` / `ok` |
| `node --test --test-name-pattern="batch 141 prep" test-kits/db/foundation-contract.test.mjs` | recheck branch | 0 | 4 of 4 pass |
| guard count (`stripNonCode`, `countDeclaredTests` and the guard's `\bassert\.\w+\(` regex, imported from `scripts/verify-test-coverage-floor.mjs`) | `047a0e2` and `9be87ca` | 0 | 77 -> 77 tests; **613 -> 633** assertions, matching the moved floor |
| `git diff --name-only 047a0e2..9be87ca` filtered to migrations, invariants, `ci/`, seeds, prerequisites, `scripts/db/`, `Makefile`, `.github/` and isolation cases | | 1 (no match) | No live-layer input changed. |
| regex probe: `AUDIT_TABLE_POLICY` / `AUDIT_TABLE_ALTER` copied from `foundation-contract.test.mjs:3296-3298`, 15 spellings | node script | 0 | 15 of 15 as expected (§2, R4) |
| `gh pr view 169` / `gh pr checks 169` | | 0 | Draft, open, head `9be87ca`, not merged; CI `bootstrap` **pending** (run 37138227949) |

**Not run: the live DB.** Nothing a live layer reads changed (see the diff row above). I started no
cluster on 5501, so there is none to stop or remove. No drift was appended to `140_audit.sql`.

## 2. My earlier findings, at this head

| finding | what changed | verdict |
|---|---|---|
| R1 (LOW): CARRIED rows pre-position a worker policy; the scope path is unchecked | Both rows' `why` (`service-policy-map.json:138`, `:146`) and `open_blockers[191]` (6) now say: the rows are re-confirmed when Q141-a is answered, and any service INSERT policy owes the `open_blockers[32]` scope-path check beside the workspace term. | **Resolved as recorded.** This is the remedy I asked for. |
| R2 (MEDIUM): the coverage map omits audited actions | Eleven rows added (`audit-coverage-map.json:155-322`). These cover every omission I named: export, account delete, Business/Page delete, member removal or suspension, BIL-013 adjustment, OPS-002 manual replay and ERD §10 holds. C0 also added the §8.4 security event, two admin actions and the OPS-006 banner. `_what` (`:2`) is narrowed to "complete against those sources ONLY", and the remainder is owed on `open_blockers[191]` (5). The test pins each new id, its category and its 191 citation, plus the narrowed `_what`. | **Resolved.** One residual, outside the declared sources, is N1 below. |
| R3 (LOW): the platform-scope security event has no blocker | `open_blockers[191]` (7), owed to A1, names SEC-014 and SEC-018. | **Resolved.** |
| R4 (LOW): the policy scan matches one spelling | `AUDIT_TABLE_POLICY` (`foundation-contract.test.mjs:3296-3297`) pins four spellings and one near-miss (`:3351-3356`). It is labelled a tripwire, and the catalog assertion is owed on `open_blockers[191]` (9). An ALTER scan was added as well (`:3298`, `:3590-3598`). | **Resolved as recorded.** Measured below. |
| R5 (INFO): the "resolved context" wording | The `audit_logs` row's `why` now says the target workspace is an input, and for a denial it is the workspace asked for, even when membership failed. | **Resolved.** |
| R6 (INFO): absolute paths in the phase plan | Unchanged, as I asked. | No action needed. |

**R4 probe (measured).**

- The policy scan matches every spelling it should:
  - `app.audit_logs`;
  - `"app"."audit_logs"`;
  - unqualified `audit_logs` after `set search_path`;
  - a newline between `on` and the table name;
  - a policy named `"x on y"`;
  - a second statement after a policy whose expression contains a quoted `';'`.
- It does not match `app.audit_logs_archive` or `public.audit_logs`, as it should not.
- The ALTER scan matches `disable row level security`, `no force row level security`, and a quoted
  `add column`.
- **Not seen, as the comment and blocker (9) say:**
  - a policy built by a dynamic `EXECUTE format(... %I.%I ...)`;
  - `grant ... on app.audit_logs`;
  - `alter policy ... on app.audit_logs`.

  None of these opens a read or write path today. Both tables have RLS enabled, so a grant without a
  policy reads and writes nothing. Disabling RLS is an `ALTER TABLE`, and the scan catches it. No
  policy exists for an `ALTER POLICY` to change.

## 3. Answers

### Q1. Does anything grant, classify or imply a write path that does not exist?

**No.** No migration, policy or grant changed in `047a0e2..9be87ca` (measured).

The review round changed three things in `service-policy-map.json`:

- **The two `why` texts** now add a re-confirmation condition. They narrow what the rows imply.
- **The `_shape.batch` text** is documentation. `servicePolicyMapLint` checks only that `batch` is
  present (`run.mjs:2618-2619`) and keeps `CELL_FIELDS` closed (`:2606`, `:2655`), so no row can
  acquire `role`.

None of these weakens a lint. A future service INSERT policy on either audit table still arrives in a
migration diff, which faces:

- the widened text tripwire;
- 140's in-migration refusal for service and anonymous roles;
- the explicit re-confirmation and scope-path debt in `open_blockers[191]` (6).

Of the eleven new coverage-map rows:

- every one is `producer_path: "UNDECIDED"`, which the test pins;
- row keys are now closed, so no row can grow a `producer`;
- the rows with no table say so in a `tables_note`, rather than naming a table that does not exist.

`billing.admin_adjustment`'s note restates that billing state is written only by the verified
webhook projection. Nothing implies a path that manual payment could use.

### Q2. Secrets or PII in the CTR-AUD-001 fixtures?

**None.** The only fixture file the round changed is `store-conformance.json`. It gained a
`check_narrowings` map of five column names and one divergence text. There are no values, only
constraint names and contract paths. The 12 record fixtures are byte-identical to `047a0e2`, which I
read in full at the first review. `scan-repository-secrets` exits 0.

### Q3. Does the coverage map omit a security-relevant action the documents name?

**Not against the sources it now claims.** Every credential, role, delete, billing and support action
that SEC-009, OB-005, PDPA-007/008, BIL-013, OPS-002, OPS-006 and ERD §8, §10 and §11 name has a row.
Beyond those sources the map makes no claim, and `open_blockers[191]` (5) owes the rest to A0. The same
two documents still carry several audited actions that (5) does not name (N1). None of them is
stop-the-line.

### Q4. Are the claims true?

Each claim I checked holds:

- **The cherry-pick map.** The `(cherry picked from commit …)` trailers name `a231fe7`, `a7b8c48` and
  `1062fc2`.
- **"Eleven rows, seven with `category: null`."** Counted: `security_event`,
  `approval_policy_manage`, `workspace_update`, `data_export`, `manual_replay`,
  `service_health_banner` and `legal_finance_rights`.
- **The floor, 613 -> 633, with 77 tests unchanged.** Measured.
- **The test start lines 3321, 3359, 3486 and 3601.** Read.
- **The handoff's "23 paths at b99218e; 28 at f8f1320".** Branch scope measures 28 at `9be87ca`, and
  `9be87ca` only touches the already-changed handoff.
- **`check:handoff` and `verify` exit 0 on the branch name.** Measured.
- **"No live input changed".** Measured.
- **The blocker texts.** `open_blockers[33]` F3 is reworded, F6 widened and F15 added.
  `open_blockers[191]` (5)-(9) are present, and it says "LEAVES FIVE MORE", which is (5) to (9).
- **PR #169 is Draft and unmerged at `9be87ca`.** Measured with `gh pr view`.

Not re-measured, and taken on the record:

- A0's 21 reversal probes, which are in A0's private scratchpad;
- C0's live measurement of `audit_logs_actor_id_not_blank` on port 5505.

One claim is worded more strongly than it holds (N2).

### Q5. Stop-the-line and merge

**No stop-the-line.** Nothing in this round:

- exposes a secret;
- leaks across tenants;
- duplicates a side effect;
- loses a job;
- diverges a migration;
- deletes irreversibly;
- breaks a contract.

**No finding of mine blocks the merge.** One process precondition is not met at the time of writing:
the required CI run on `9be87ca` was **pending** (N4). RFC-2026-002 requires a green run on the head
before the Owner merges.

## 4. Findings at `9be87ca`

### N1 (LOW): audited actions in the same two documents fall outside the map's declared sources, and (5) does not name them

- **Where:** `db/foundation/lint/audit-coverage-map.json:2` (`_what`, `_sources`) and
  `work-packages/WP-0A-DB-00.json` `open_blockers[191]` (5).
- **What:** the map is honest about its scope, and (5) owes "another domain document". The documents
  this batch already cites still carry audited actions the map has no row for and (5) does not name:
  - **Credential class.** ERD §9.2 (`sprint-0a-core-erd-rls-retention-th.md:469`): the secret table
    keeps "created/rotated/expired timestamps และ audit reference" (an audit reference for each
    created, rotated or expired credential). So credential rotation and expiry carry an audit
    reference, including a system-side Meta token expiry. `credential.connector_or_byok` names
    connect, disconnect and re-authorise, plus BYOK management, but not rotation or expiry by the
    system.
  - **Admin and operations.** In `meta-security-production-ops-workstream-th.md`:
    - INF-013 feature flags and kill switches, "audit; per-env/workspace" (`:271`), a per-workspace
      operator switch;
    - BIL-011 reconciliation, mismatches "แก้แบบ audit ได้" (corrected in an auditable way)
      (`:228`), a billing correction;
    - OBS-009, maintenance and exclusion "มี audit" (are audited) (`:310`).
- **Why LOW, not higher:**
  - The map claims nothing beyond its sources.
  - Nothing can write an audit row today (`open_blockers[21]`).
  - BIL-011's correction plausibly falls under `billing.admin_adjustment`, and rotation plausibly
    under the credential row's "manage".

  It matters because the map is the input to Q141-a's producer RFC. A credential rotation or a kill
  switch done by the system or an operator is exactly the producer the Owner is asked to choose.
- **Remedy (A0, under `open_blockers[191]` (5)):** name these five items in (5), or add rows (or
  widen an existing row's `action`), before the Q141-a producer RFC is written.

### N2 (INFO): `open_blockers[191]` (9) credits "the new-migration snapshot tests" with catching a later client policy

- **Where:** `work-packages/WP-0A-DB-00.json`, `open_blockers[191]` (9), the clause "a later client
  policy on either table is caught by the text scan and the new-migration snapshot tests alone".
- **What:** the snapshot tests (`foundation-contract.test.mjs:159-162`, and the pinned whole
  not-applied list at `:165-200`) make a new migration a deliberate edit. They see that a migration was
  added, not what it writes. A policy hidden in a dynamic `EXECUTE` reaches a human review of that
  edit, not an assertion.
- **Remedy:** when (9) is next touched, say that the snapshot tests force review of any new migration
  and do not detect a policy. The owed catalog assertion is already the real fix.

### N3 (INFO): the tripwires do not read GRANT or ALTER POLICY

- **Where:** `test-kits/db/foundation-contract.test.mjs:3296-3298`.
- **What:** measured in §2. Neither omission opens a path today: RLS is on, no policy exists, and
  disabling RLS is caught.
- **Remedy:** none now. The every-role catalog assertion owed on `open_blockers[191]` (9) should also
  assert that no client role holds a grant on either table, beyond what 140 grants.

### N4 (INFO): CI on the head was pending at the time of this re-check

- **What:** `gh pr checks 169` showed `bootstrap pending` (run 37138227949) for `9be87ca`.
- **Remedy:** none for A0. Under RFC-2026-002, the Integration Owner and the Owner confirm a green run
  on `9be87ca` before merging.

## 5. Stop-the-line verdict

**None.** R1-R5 from my first review are resolved or recorded as I asked, and R6 needed no action.
N1 (LOW), N2, N3 and N4 (INFO) are new. None of them blocks the merge on its own, by my reading. The
merge still needs:

- the green CI run (N4);
- the role evidence and the Integration Owner's and Owner's act, which RFC-2026-002 and the
  disposition require.

Whether to merge before N1 is recorded is the Integration Owner's and the Owner's call.

## 6. Limits

- I am the same vendor and model family as the Author (RFC-2026-024).
- No live database was run, because no input of a live layer changed.
- C0's live measurement of the not-blank CHECK and A0's 21 reversal probes were taken on the record.
- I read the coverage map against the two documents above and the sources it cites. Other workstream
  documents were not walked; that remains owed under `open_blockers[191]` (5).
- CI was pending when I checked. I did not wait for it.
