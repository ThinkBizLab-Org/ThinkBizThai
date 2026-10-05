# C0 contract review: batch rfc-023-028 (RFC-2026-023 brought current, RFC-2026-028 drafted)

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-023-028`, head
  `b0adf6b51299d57e6d8c010c31d13bf6e6bc474b` over code `1da0b1c39d39757330724f876486fc985ed4e2cb`, base
  `921efb5` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/182>.
- **Review branch:** `review/c0-batch-rfc-023-028`, checked out at the subject head `b0adf6b`. This file is
  its only commit.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-rfc-023-028-plan-2026-10-03.md`; the
  disposition `product-owner-disposition-2026-10-03-batch-rfc-023-028.md`; `git diff 921efb5..b0adf6b`
  (11 files) and the three commit messages; `RFC-2026-023` whole (and its removed 2026-09-15 lines);
  `RFC-2026-028` whole; `RFC-2026-022` §5, §7.3-§7.4, §8, §9; `RFC-2026-026` §3.2-§3.5, §6, §8.1/1, §8.1/6,
  §8.2 numbering, §9, §10; `RFC-2026-027` Status/Amends lines, §3.2 (146), §10; `RFC-2026-020` §5/1-3,
  §6.1; `RFC-2026-019` §4-§5; `RFC-2026-017` §3 (50); every Status line of RFC-016..028; ERD
  `:576-584` (§11.4) and `:862-868` (§15); migrations `001:10-50`, `002:34`, `003:20-30`,
  `010:427, 481-517`, `011:209-320`, `021:326, 389-400, 415-450, 505-507`, `050:424-427, 488-512, 604-610,
  852-879`, `105:49-51`, `171:78-110, 160-295`; `scripts/db/run.mjs:481, 640-660, 1340, 1354, 1385,
  1443-1467, 2840-2880, 3000-3020, 3712-3726, 3783-3822`; `db/foundation/test-helpers/auth-context.sql:95-113`;
  `scripts/db/try-it.mjs:26-89, 365-371`; `db/foundation/lint/catalog-snapshot.json` (notes, `service_roles`,
  `not_applied_to_this_instance`); `service-policy-map.json` (16 cells); `rls-exemption-register.json`;
  `.github/workflows/ci.yml:22-27, 129-130`; `open_blockers[113, 195, 196, 198, 199]` against their base
  text at `921efb5`; the handoff; PR #182's body and checks; PR #181's merge record.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots, and this batch's two RFCs are that run's own. Acceptance of this file as
the C0 role's signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** The batch is text, lint data and blocker text. No migration, policy, grant, probe,
  fixture or CI file changed; nothing a DB layer reads changed except `audit-coverage-map.json`, which only
  `test-kits/db/foundation-contract.test.mjs` reads (re-measured, §2). Nothing reaches a secret, a tenant
  boundary, an applied migration, an irreversible deletion or a contract-catalog file. Neither RFC is put in
  effect, and both Status lines say so.
- **Blocks the merge: no, on my reading** — one MEDIUM, four LOW, two INFO, all in RFC text or evidence
  text, none live. Under the standing delegation's bar (127 §6, "role runs' findings cleared"), C0-1 should
  be folded into RFC-2026-028 or explicitly carried as a condition of its approval (plan §6) before A0 presses
  the merge; the LOWs are text fixes. Whether any blocks is the Integration Owner's call, not mine.
- **CI:** run 37255381909 ("Bootstrap validation", `pull_request`, head `b0adf6b`) was `in_progress` when I
  started and `completed / success` when I re-read it before writing this file.

**Answers to the questions put to this run:**

1. *Is RFC-2026-023 now consistent with RFC-020..027 as approved and with batches 127-171?* **Yes, with two
   gaps.** §0's seven rows are each true against the tree and the RFCs they cite (§3). §3.2's gate
   (`app.is_active_member`, called) is exactly what RFC-2026-027 §3.2 (`:146`) and Q-027-4's answer ask; its
   `app_authz` policy calling `app.jwt_subject()` has a precedent in `171:80-89`, and Q-023-8's "no membership
   helper in the policy" agrees with `171`'s own check 2 (`171:198-210`). The two omissions §0/7 records are
   real (`021:326`, `:425`, `:448-450`). The gaps: C0-3 (§8 copies `171`'s admitted literal into a fifth place
   while §3.2 argues against exactly that) and C0-4 (the RFC-2026-020 sections it amends are listed short).
2. *Is RFC-2026-028 a complete answer to DATA-DEC-03 as the ERD and RFC-2026-022 frame it, with every
   citation true?* **Complete in shape, not yet for the provisioned instance.** It supplies what RFC-2026-022
   §5/8 (`:410-421`) and §9's first bullet (`:601-603`) leave to "the RFC that creates the worker": the
   login role per RFC-2026-019 §4/3, its credential custody, and what "force where compatible" (ERD `:866`)
   now means through RFC-2026-016 §4's register (empty: measured). It honestly defers the pooler (§7.3 (d))
   to Q-028-12. What it misses is that on the provisioned instance the migration owner is not a superuser, and
   the repository has measured what `CREATE ROLE` then does (C0-1). One factual claim about CI is unsupported
   (C0-2). Citations: every `file:line` I checked is true; four quotations or section numbers are slightly
   off (C0-6).
3. *Are the questions and recommendations honest, and the status lines unchanged?* **Yes.** RFC-2026-023
   is still `In review` (its Status line gained a sentence, the status word did not change); RFC-2026-028 is
   `Proposed`, "Not approved; not in effect". The twenty questions are counted correctly (8 + 12), each has an
   owner and A0's recommendation is labelled as one; plan §5's list of the Owner's five is right. The
   recommendation to approve is A0's own RFCs recommended by A0, and RFC-2026-028 §10 says so; the plan §6
   conditions it on these role runs. The disposition transcribes `ทำต่อตามแนะนำเลย` verbatim and reads it as
   approving neither RFC, which is the narrow reading.

## 2. Measured (on this machine, Node `v24.20.0` checked with `node -v` before each run)

| # | command | where | exit | result |
|---|---|---|---|---|
| M1 | `git checkout -b review/c0-batch-rfc-023-028 b0adf6b` | worktree | 0 | review branch at the subject head |
| M2 | `node scripts/verify-branch-scope.mjs 921efb5 WP-0A-DB-00` | review branch | 0 | "all 11 changed path(s) are declared, and every amendment explains one" |
| M3 | `npm run check:handoff` | review branch name | 75 | "no work package declares ownership.branch \"review/c0-batch-rfc-023-028\"" — expected; the guard judges a branch by its name, so the review branch cannot be measured |
| M4 | `git switch --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-rfc-023-028` (HEAD `b0adf6b`, nothing committed, switched back after M5-M6) | subject branch name | 0 | `rev-parse --abbrev-ref HEAD` = the subject branch, not detached |
| M5 | `npm run check:handoff` | subject branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| M6 | `npm run verify` | subject branch name | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| M7 | drift D2 (RFC-028 removed from `writable_paths`) + M2's command | review branch | 73 | "changed 1 path(s) it neither owns nor records as an amendment: …RFC-2026-028-worker-identity.md" |
| M8 | drift D6 (RFC-028 Status → `Approved`) + `node scripts/verify-test-coverage-floor.mjs` | review branch | 86 | "…RFC-2026-028-worker-identity.md — content does not match its recorded digest" |
| M9 | drift D5 (every `audit-coverage-map.json` `line` +1) + `node --test test-kits/db/foundation-contract.test.mjs` | review branch | 1 | 80 of 81; the failing test is "batch 141 prep: the audit coverage map names real tables, real §8 rows, live blockers, and no producer" |
| M10 | each drift restored with `git checkout --`; `git status --short`, `git diff --stat b0adf6b` | review branch | 0 | empty |

Also re-measured without a database:

- `open_blockers` opens on manifest line 256; all 33 `line` pins equal 257 + their `index`, and each quote
  is on its line (one compares only after JSON unescaping: index 167, line 424).
- `test-kits/integrity-manifest.json` holds 91 digests; RFC-2026-028's is `ef925fc0…886fa`, which is the
  file's `shasum -a 256`.
- `open_blockers` has 200 entries (base 199). Against `921efb5`, only `[113]` and `[195]` differ, and each
  keeps its base text as a prefix (appended, nothing rewritten); `[199]` is new and last. `[196]` (2) is
  "DONE" (scram, per-cluster password, `<dir>/pgpass`), as `[199]` and RFC-2026-028 §3.3/3 say.
- PR #181: `mergedAt 2026-10-05T00:15:42Z`, merge commit `921efb5`, head `d99d22c`; run 37245602888
  `success` on `d99d22c`. The disposition's §3 is true. PR #182 is Draft, head `b0adf6b`.

**Live database: not used.** No input a DB layer reads changed, and the drifts this batch states are Node
drifts, so I started no cluster and did not touch port 5505 (or 5432, 5499, 5507).

## 3. Read and checked, not measured

RFC-2026-023 §0, row by row: (1) RFC-024 approved 2026-09-15 — Status line true. (2) RFC-025 approved
2026-09-28 — true. (3) RFC-026 approved 2026-10-05, not in effect; its §3.3 literal (`RFC-026:139-155`)
calls `app.is_active_member` and both acting-user helpers; Q-026-6 answered yes (`:1011`); §8.1/6 at `:862`
— true. (4) RFC-027 approved, `171` gates `workspace_member_role` (`171:93-110`), `app_authz` holds six
columns and two policies (`171` block checks 1 and 3) — true. (5) `170:71` revokes the client `UPDATE` of
`lifecycle_state` — true. (6) the probes exist at the cited constants (`run.mjs:640, 642, 1340, 1354`,
eighth rule `:1455-1465`) — true. (7) the two omissions — true.

RFC-2026-028 §2, fact by fact: `001:30, 39, 48` create the three roles `nologin nobypassrls noinherit`;
`003:26` is the grant quoted; `KNOWN_BYPASS` is `run.mjs:3816`; the `authenticator` negative is
`run.mjs:3712-3726`; `auth-context.sql:95-108` is `as_service()`; `050:426-427` and `:490-510` carry no
actor, request or correlation id (finding (4) is true, and MEDIUM-for-design is a fair grade);
`050:608` is `outbox_events.correlation_id`; `010:427` grants `app_worker` table-level `SELECT, INSERT,
UPDATE` on `app.workspaces` and no `TO app_worker` policy exists there; the service-policy map has 16
cells, 13 carried and 3 discovered, `audit_logs` and `security_events` carried, the retention sweep
discovered with a broker and no role; the exemption register's `exemptions` is `[]`. Finding (5) is true:
`RFC-017:50` gives retention sweeps to `app_maintenance`.

## 4. Findings

### C0-1 — MEDIUM — RFC-2026-028 says "nothing is a member of it", which the repository has measured to be false on the provisioned instance

- **Where:** `architecture/decisions/RFC-2026-028-worker-identity.md:95` ("Nothing is a member of it"),
  `:236-238` (§4/1's apply-time block asserts "nothing a member of it"), `:260` (§5/3), and `:59-60` ("today
  no login role other than a superuser can exist without a pin moving").
- **What the tree says:** on the provisioned instance the migration owner `postgres` is not a superuser
  (`run.mjs:3821`, `KNOWN_SUPERUSERS = ['supabase_admin']`; `open_blockers[198]` (2) says the same). For the
  three service roles `001` created there, `catalog-snapshot.json` measured `grants_to_admin: 2`, and its
  `_membership_note` names one of them "the CREATE ROLE admin grant (set false, inherit false)". That is
  PostgreSQL 16+ behaviour: a non-superuser role with `CREATEROLE` that creates a role is granted membership
  in it `WITH ADMIN OPTION`. The snapshot's rule was therefore written as `members_besides_admin: 0`, not
  "no member".
- **Failure scenario:** §4/1's migration applied to the provisioned instance by `postgres` creates
  `app_worker_login` and, with it, a `pg_auth_members` row making `postgres` an ADMIN member of it. An
  apply-time block written as §4/1 states ("nothing a member of it") raises and the migration aborts there,
  or, if the block is relaxed silently by whoever hits it, the RFC no longer describes the role. On every
  local and CI cluster the applier is a superuser, so the case never shows. §2/4's sentence is likewise true
  of migrate-clean clusters only: `postgres` and `authenticator` are non-superuser login roles on the
  platform.
- **Not live:** nothing is created by this batch. Read, not measured: I did not create a role as a
  non-superuser `CREATEROLE` role.
- **Remedy:** restate §3.1, §4/1 and §5/3 as "no member besides the applying role's `CREATE ROLE` admin grant
  (`inherit false, set false`) when the applier is not a superuser", reusing the snapshot's
  `members_besides_admin` reading; scope §2/4's sentence to migrate-clean clusters; add a test obligation (or
  a Q-028 row tied to `[198]` (2) and Q170-c) measuring §4/1 applied by a non-superuser `CREATEROLE` role.

### C0-2 — LOW — RFC-2026-028 §3.3/3 says the CI service container authenticates by `trust`; nothing in the repository measures it, and the configuration points the other way

- **Where:** `RFC-2026-028-worker-identity.md:154-158`.
- **What the tree says:** `ci.yml:24-27` runs `postgres:17` with `POSTGRES_PASSWORD` set, and the jobs connect
  over TCP with `PGPASSWORD` (`:129-130`, `:171-172`). The official image's default host authentication for
  PostgreSQL 14+ is `scram-sha-256` when a password is set (read, not measured). No evidence file records the
  container's `pg_hba`.
- **Failure scenario:** the implementing batch takes the RFC at its word and reports §5/12's authentication
  cases "not run" in CI, where they could run; or it writes a harness for a `trust` container that is not.
- **Remedy:** measure it (`select type, database, user_name, address, auth_method from pg_hba_file_rules`,
  or a wrong password refused) in the implementing batch, and correct the sentence to what was measured.

### C0-3 — LOW — RFC-2026-023 §8 copies `171`'s admitted literal into a fifth place, which §3.2 argues against, and §3.2 overstates what `171`'s block holds

- **Where:** `RFC-2026-023-acting-user-narrowing.md:161` (§8/2: the `app_command` policy's `USING` and
  `WITH CHECK` are both `lifecycle_state in ('active', 'closing') and …`) against `:75` (§3.2: a copy of the
  literal "a fifth time" is the hazard, and "`171`'s apply-time block holds that literal to four places").
- **What the tree says:** `171:279-295` checks that the literal is *the same* in three named policies
  (`workspaces_select_authz_own_open`, `workspaces_select_active_member`, `workspaces_update_owner`) and the
  helper body. It does not count copies, so a fifth copy in a new policy is unchecked rather than refused.
- **Failure scenario:** the closing command's policy lands with the literal and no check; a later
  classification change (a ninth state, or `closing` moved) updates the four checked places, the block
  passes, and the command's policy keeps the old set.
- **Remedy:** in §8/2, drop the literal from `USING` (`app.workspace_member_role(id)` is already null for a
  blocked workspace), keep it in `WITH CHECK` as the target-state bound, and say that the implementing batch
  adds that policy to `171`'s literal check (a `superseded.json` entry, as §5 already owes). In §3.2, say
  "holds the four places to one literal", not "holds that literal to four places".

### C0-4 — LOW — RFC-2026-023 lists the RFC-2026-020 sections it amends short

- **Where:** `RFC-2026-023-acting-user-narrowing.md:119` (§5 names §6.1/6), `:174` (Q-023-3 names §6.1/6 and
  §5/3); `open_blockers[199]` (1) repeats "§5/3 and §6.1/6".
- **What the tree says:** a third `app_authz` policy also moves RFC-2026-020 §6.1/5 ("`app_authz` holds
  exactly one policy … `pg_get_expr(polqual, polrelid)` equals a pinned literal", `RFC-020:444-447`) and the
  negative control §6.3/14 (`:476`). RFC-2026-027, amending the same pin for the same reason, listed §5/3,
  §6.1/5, §6.1/6 and §6.3/14 (`RFC-027:12`).
- **Remedy:** name §6.1/5 and §6.3/14 in §5, Q-023-3 and `[199]` (1) at the next text revision.

### C0-5 — LOW — the evidence records an exit code for commands that were not run, and promises a record the handoff does not hold

- **Where:** `handoffs/WP-0A-DB-00-author-handoff.json:108-112` (`"command": "make db-migrate-clean; make
  db-rls-smoke"`, `"exit_code": 0`, `"result": "not run: …"`); plan `:69-70` ("`check:handoff`, and `npm run
  verify` on the branch name are recorded in the handoff and the PR body").
- **What the tree says:** the handoff's `tests` has no `check:handoff` or `npm run verify` entry; only PR
  #182's body records them (both exit 0, which I re-measured: M5, M6). A handoff cannot record a measurement
  of its own commit, so the plan's sentence cannot be true of the handoff.
- **Failure scenario:** a reader or a tool that totals `exit_code` reads "migrate-clean and rls-smoke: 0" as
  a pass.
- **Remedy:** record a not-run command without a passing exit code (or move it to `known_limitations`), and
  make the plan's sentence say "the PR body".

### C0-6 — INFO — four quotations or section references are slightly off

- `RFC-2026-028:33` quotes `001` as created "with no grant and no membership"; `001:12` says "holding no
  grant and no membership".
- `RFC-2026-028:103-104` quotes RFC-2026-017 as giving `app_maintenance` "retention sweeps, purge
  verification, chunked backfills"; `RFC-017:50` says "backfills" — "chunked" is `001:44`'s comment.
- `RFC-2026-028:7` attributes "choosing it, and paying for its credential custody, belongs to the RFC that
  creates the worker" to RFC-2026-022 "§5/8 and §9's first bullet"; the words are §5/8's (`RFC-022:418-420`);
  §9's first bullet (`:601-603`) says the same thing in other words.
- `RFC-2026-023:143` calls RFC-2026-026 §8.2 `/16`-`/21` "the cases for the command producer"; the command
  cases are `/6`-`/11`, `/14` and `/16`-`/20`, and `/21` is `app.security_events`.

No remedy beyond correcting the text at the next revision.

### C0-7 — INFO — RFC-2026-023 §8 gives every later §11.4 edge to the worker

- **Where:** `RFC-2026-023-acting-user-narrowing.md:156` ("every later edge is the worker's").
- **What the tree says:** ERD `:580-581` — `PurgeQueued --> Held: legal/finance/rights hold` and
  `Held --> PurgeQueued: hold released` — are hold decisions whose actor no record names; RFC-2026-028 §3.5
  (`:196-201`) assigns the worker only `Closing --> AccessBlocked` and `AccessBlocked --> PurgeQueued`.
- **Remedy:** "no later edge is a user command; who performs the hold edges is not decided here".

## 5. Claims in the commit messages, plan, disposition, blockers and handoff

True as stated, each checked: the three commits and their order (code, evidence, handoff last and alone);
11 changed paths, all declared (M2); the four amended-but-not-owned paths and the dropped
`scripts/test-suite-contract.mjs`; `writable_paths` gaining RFC-028 after RFC-027; the branch slot moved in
the manifest and both rows of `branch-identity.test.mjs`; `DECISION_RECORDS` and `DIGESTED_FLOOR` gaining
RFC-028; 91 digests; the +2 line move of 33 pins; `[113]` and `[195]` appended and `[199]` added last with the
cross-references it names; 685 tests; drifts D2, D5, D6 at the stated exits (M7-M9; D1, D3, D4, D7 read, not
re-run); the #181 merge record; the Owner's words verbatim; no migration, so no number asked; neither RFC
approved. Not re-measured: the refused `commit-when-clean` at `1da0b1c` (683/685) — read from the plan,
consistent with the handoff guard's behaviour (M3). Inaccurate: C0-5 only.

## 6. Limits

- No database was started; every PostgreSQL behaviour either RFC relies on (`SET LOCAL ROLE`'s scope, a
  no-password login under `scram-sha-256`, `has_schema_privilege` under `INHERIT FALSE`, the PG16+ admin
  grant of C0-1, the CI container's `pg_hba` of C0-2) is read, not executed by me — as it was not by A0
  (`[199]` (6)).
- M5 and M6 were measured by switching this worktree to the subject's branch name with
  `--ignore-other-worktrees` (the branch is checked out in A0's worktree); nothing was committed on it.
- Same vendor and model family as the Author (§0).
