# C0 contract review re-check: batch rfc-023-028's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-023-028`, head
  `498a7ee282a652bc8589789ca69f4515e2ed28ed` over code `abd48b384a4dad62e8f71589b9cca1db3a94508c`, base
  `921efb5` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/182> (Draft, open, head `498a7ee`, not merged).
  Previous reviewed head `b0adf6b` (my review:
  `evidence/WP-0A-DB-00/c0-batch-rfc-023-028-contract-review-2026-10-03.md`, cherry-picked as `c008820`).
- **Re-check branch:** `recheck/c0-batch-rfc-023-028`, checked out at the subject head `498a7ee`. This file
  is its only commit.
- **Scope:** NARROW. My own findings C0-1..C0-7 first, then the round's other changes as far as they touch
  the questions put to this run. This is not a fresh review of `1da0b1c`.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-rfc-023-028-plan-2026-10-03.md` (whole §7,
  and the two lines it changed in §3); the disposition (unchanged since `b0adf6b`); `git diff
  b0adf6b..498a7ee` (9 files) and `git diff --stat 921efb5..498a7ee` (14 files); the five commit messages of
  the round; RFC-2026-023 and RFC-2026-028 word diffs and their Status lines; `open_blockers[199]` (8);
  the handoff diff; the A1 and Q0 review files (their R0 table, F1-F8, Q0-R1..R8 rows); `171:245-297`;
  `021_member_scope.sql:530-539`; `invariants/011_authorization_helpers.2.sql:49-75`;
  `invariants/021_member_scope.1.sql:30-50`; `020_business.sql:650-656`; `scripts/db/run.mjs:1344-1354`,
  `:3710-3726`, `:3815-3823`; `RFC-2026-027:12`; RFC-2026-020's section headings; PR #182's body.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots, and both RFCs and their revisions are that run's own. Acceptance of this
file as the C0 role's signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** The round changes two RFC texts, the plan, one blocker string (appended), the
  integrity manifest (two digests) and the handoff. No migration, policy, grant, probe, fixture, CI file or
  contract-catalog file changed; nothing reaches a secret, a tenant boundary or an applied migration. Both
  RFCs keep their status words.
- **Blocks the merge: no, on my reading.** All seven of my findings are acted on: C0-1..C0-4, C0-6 and C0-7
  are folded into text that is true against the tree, C0-5 is corrected in the handoff and the plan, and
  what stays owed has an owner on `open_blockers[199]` (8). The re-check raises two INFO notes (R-1, R-2), neither
  of which needs a change before merge. CI on `498a7ee` (run 37259006037) was `in_progress` when this file
  was written; a green run on the head is the Integration Owner's to confirm before merge (RFC-2026-002).
  Whether anything blocks is the Integration Owner's call, not mine.

**Answers to the questions put to this run:**

1. *Is RFC-2026-023 now consistent with RFC-020..027 as approved and with batches 127-171?* **Yes.** The
   two gaps I raised are closed. C0-3: §3.2 (`RFC-023:76`) now says `171`'s block "holds the four places it
   names — three policies and the helper body — to one literal; it does not count copies", which is what
   `171:264-297` does (`strpos` over the `polqual` of three named policies and the helper's `prosrc`); §8/2
   (`:165`) takes the literal out of `USING` (`app.workspace_member_role(id) = 'owner'`, null for any blocked
   state since `171`) and keeps it only in `WITH CHECK` as the target-state bound, owing that expression to
   `171`'s literal check through `superseded.json`. C0-4: §5 and Q-023-3 (`:178`) now name RFC-2026-020
   §5/3, §6.1/5, §6.1/6 and §6.3/14, exactly `RFC-2026-027:12`'s four. The round's other additions are true:
   `PINNED_SCHEMA_PRIVILEGES` is the seventh rule at `run.mjs:1354` and holds no `app_command` entry; `171`'s
   rule 4 is `171:248-255` (exactly three `app_authz`-owned helpers); `invariants/011_authorization_helpers.2.sql`
   asserts two `app_authz` policies (`:59-60`) and `invariants/021_member_scope.1.sql` asserts one beside the
   excepted `workspaces` policy and, at `:40-49`, no `SELECT` on `workspace_member_scopes`; §3.2's
   comparison with `workspace_member_scopes_select_own` matches `021_member_scope.sql:534-539`.
2. *Is RFC-2026-028 a complete answer to DATA-DEC-03 as the ERD and RFC-2026-022 frame it, with every
   citation true?* **Complete in shape, and now honest about the provisioned instance.** C0-1 is folded in
   §2/4 (`RFC-028:60-64`, scoped to migrate-clean clusters), §3.1 (`:99-109`), §4/1 and §5/3 (`:315`), with
   the custody consequence in §3.3/2 (`:177-182`) and a new Q-028-13 (`:432`) owing the platform
   measurement. I re-measured the PostgreSQL behaviour the fold relies on (§2, M6): it holds. C0-2 is
   withdrawn as asserted and replaced by "read, not measured; the implementing batch measures it"
   (`:198-203`). C0-6's three quotations are now exact (`001:12`, `RFC-017:50`, `RFC-022:418-420`). The new
   citations I checked are true: `020_business.sql:652-655`, `run.mjs:3714-3724`, `run.mjs:3821`. The pooler
   (Q-028-12) and the platform half of Q-028-13 remain deferred, honestly.
3. *Are the questions and recommendations honest and the status lines unchanged?* **Yes.** Neither diff
   touches a `Status:` line (0 changed lines in each); RFC-2026-023 is `In review`, RFC-2026-028
   `Proposed`, and each gained a dated `Revised` line ending "Still In review / Still Proposed; the revision
   approves nothing". Twenty-one questions (Q-023-1..8, Q-028-1..13), all UNANSWERED; each new or amended
   recommendation is labelled as A0's. The plan's §7.2 says §1 row 2 and §5 keep the twenty-question count as
   the record of the first commit, which is accurate.

## 2. Measured (on this machine, Node `v24.20.0` checked with `node -v` before each run)

| # | command | where | exit | result |
|---|---|---|---|---|
| M1 | `git checkout -b recheck/c0-batch-rfc-023-028 498a7ee282a6…` | worktree | 0 | re-check branch at the subject head |
| M2 | `node scripts/verify-branch-scope.mjs 921efb5 WP-0A-DB-00` | re-check branch | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| M3 | `node scripts/verify-test-coverage-floor.mjs` | re-check branch | 0 | green; `shasum -a 256` of both RFCs equals the manifest (`d26e3e48…326c`, `b7566c62…92d9`); 91 digests |
| M4 | `git switch --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-rfc-023-028` (HEAD `498a7ee`, `rev-parse --abbrev-ref HEAD` = the subject branch, not detached; nothing committed; switched back after M5) | subject branch name | 0 | — |
| M5 | `npm run check:handoff`; `npm run verify` | subject branch name | 0; 0 | "describes the branch: nothing substantive after its cited head"; "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| M6 | private cluster: `initdb --locale=C -A trust -U postgres` (LC_ALL=C), PostgreSQL 17.11, `127.0.0.1:5505` TCP only (`unix_socket_directories=''`), shim first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean` and `make db-rls-smoke` | `c0-rfc-023-028r2/` | 0, 0, 0, 0 | migrate-clean ok ("52 apply-time blocks, 38 re-run as written, 14 superseded and replaced"); rls-smoke ok ("7 claim(s) discharged by execution") |
| M7 | on M6's cluster, as `postgres`: `create role c0_sim_owner login createrole`; `set role c0_sim_owner`; `create role c0_probe_login login noinherit`; read `pg_auth_members` | same | — | `createrole_self_grant` empty; one row: member `c0_sim_owner`, grantor **`postgres` (the bootstrap superuser)**, `admin t, inherit f, set f` — RFC-028 §3.1's claim |
| M8 | as `c0_sim_owner`: `alter role c0_probe_login password '<throwaway literal>'` | same | — | `ALTER ROLE` succeeds — §3.3/2's "whoever holds the migration owner's credential can set the worker's" holds locally |
| M9 | as `c0_sim_owner`: `revoke c0_probe_login from c0_sim_owner`; then `… granted by postgres` | same | — | the first is a no-op (`WARNING: role "c0_sim_owner" has not been granted membership … by role "c0_sim_owner"`, row still present); the second `ERROR: permission denied to revoke privileges granted by role "postgres"`. The creator cannot drop its own admin row locally |
| M10 | probe roles dropped (0 `c0_%` roles left); `pg_ctl stop -m fast`; data directory removed; `lsof -iTCP:5505 -sTCP:LISTEN` | — | 0 | cluster gone, port free |

No drift was applied to `140_audit.sql` (nothing a DB layer reads changed; M6-M9 test PostgreSQL behaviour
on throwaway roles, not repository code). Ports 5432, 5499, 5501, 5503 and 5507 were not touched. The
throwaway password in M8 is a literal for a role that existed for one statement on a removed cluster.

Also re-measured without a database:

- `open_blockers` has 200 entries at `b0adf6b` and at `498a7ee`; only `[199]` differs, and its new text
  starts with its `b0adf6b` text (appended, nothing rewritten). No other key of the manifest changed. The
  numstat is 1/1 on one line, so no line pin moves (M5's 685/685 includes the line-pin tests).
- The three cherry-picks are byte-identical to the review commits: `git diff bc0cb19 c008820`,
  `c7fb1cf ceca0b6` and `c4692ad 9fa8f84` over the evidence file each print nothing, and each original's
  parent is `b0adf6b`.
- The handoff's `make db-migrate-clean; make db-rls-smoke` entry has no `exit_code` ("NOT RUN -- no exit
  code recorded"); `head_revision_or_patch_checksum` is `abd48b3`.
- PR #182's body records `check:handoff` and `npm run verify` on the branch name (line 14 and the review
  round section), as plan §3 and §7.3 now say.

## 3. My findings, one by one

| finding | what changed | re-check |
|---|---|---|
| C0-1 MEDIUM | RFC-028 §2/4 (`:60-64`), §3.1 (`:99-109`), §4/1, §5/3 (`:315`), §3.3/2 (`:177-182`), §3.6 row and §5/14, Q-028-13 (`:432`); `[199]` (8)(a) | **Closed as text.** The admin row (admin t, inherit f, set f) is admitted as the one member only when the applier is not a superuser; any other member, or that row with `INHERIT` or `SET` true, is a finding. M7 reproduces A1's simulation. M9 adds that the creator cannot revoke the row locally, which Q-028-13 leaves "read, not measured" (R-1). The platform half stays owed with an owner. |
| C0-2 LOW | RFC-028 §3.3/3 (`:198-203`); handoff `known_limitations`; `[199]` (8)(b) | **Closed.** The `trust` claim is withdrawn; the scram reading is labelled "read, not measured", with the measuring query, and §5/12 runs in CI if scram. |
| C0-3 LOW | RFC-023 §3.2 (`:76`), §8/2 (`:165`); `[199]` (8)(d) | **Closed.** Wording matches `171:264-297`; the literal is out of `USING` and in `WITH CHECK` only, and its addition to `171`'s check is owed through `superseded.json`. |
| C0-4 LOW | RFC-023 §5, Q-023-3 (`:178`); `[199]` (8)(d) | **Closed.** The four sections match `RFC-2026-027:12`. `[199]` (1) is not rewritten, because blocker text is append-only; (8)(d) carries the correction. That is acceptable. |
| C0-5 LOW | handoff `tests`; plan §3 (`not run (no exit code)`, "recorded in the PR body") | **Closed.** |
| C0-6 INFO | RFC-028 Answers line, §2/1, §3.1; RFC-023 §6 (`:147`) | **Closed.** All four corrections are exact. |
| C0-7 INFO | RFC-023 §8 (`:160`) | **Closed.** "No later edge is a user command"; the hold edges' performer is left undecided; the worker's two edges are RFC-028 §3.5's. |

## 4. New findings

### R-1 — INFO — RFC-2026-028 §3.1 names the admin row's grantor as `postgres`; on the provisioned instance it is the bootstrap superuser

- **Where:** `architecture/decisions/RFC-2026-028-worker-identity.md:106` ("grantor `postgres`", quoting
  A1's simulation) against `:181` ("its grantor is the bootstrap superuser").
- **What I measured:** M7. The grantor is the bootstrap superuser, which on an `initdb -U postgres` cluster
  happens to be `postgres`. On the provisioned instance the bootstrap superuser is `supabase_admin`
  (`run.mjs:3821`), not the migration owner. M9: the creating non-superuser cannot revoke the row (plain
  `REVOKE` is a no-op with a WARNING; `GRANTED BY postgres` is refused).
- **Failure scenario:** the batch that writes §3.6's snapshot rule or §5/14's fixture pins `grantor =
  postgres` from §3.1's parenthesis. The rule then reports a correct platform snapshot as a finding, or
  someone relaxes it by hand.
- **Remedy (next text revision, not before merge):** in §3.1, write "grantor the bootstrap superuser
  (`postgres` on a local cluster)". In Q-028-13, record that locally the creator cannot revoke the row (M9),
  so the platform measurement checks the same thing rather than assuming revocation is available.

### R-2 — INFO — the Author's relayed completion report misdescribes the handoff refresh; the repository is right

- **Where:** the Author's done list as relayed to this run says the refresh did not need to re-point
  `head_revision` from `3d21389`. The handoff at `498a7ee` cites `abd48b3`, and the commit message of
  `498a7ee` says "refresh:handoff to abd48b3".
- **Effect:** none in the tree. `check:handoff` is green on the branch name (M5). The commit message, the
  handoff and PR #182's body agree with each other. Only the out-of-repository summary is wrong.
- **Remedy:** none in the repository. Readers should rely on the commit and the handoff, not on that
  summary.

## 5. Claims in the commit messages, plan, disposition, blocker edit and handoff

True as stated, and each one checked:
- `abd48b3`'s list of changes, item by item, against the word diffs.
- `498a7ee` is last and alone: only the handoff changed.
- The three cherry-picks carry `-x` lines and are byte-identical to their review commits.
- 23 findings (7 + 8 + 8).
- `[199]` (8)(a)-(e): each owner and each item is in the RFC text it names.
- 91 digests, of which only the two RFC digests changed (M3).
- 14 paths in scope (M2).
- 685/685 (M5).
- The plan's §7.2 rows match the cherry-picked findings they cite.
- Plan §7.3's "not run (no exit code)".
- The disposition did not change in the round.
- Neither RFC is approved.

The PR body's description of the round matches. Not re-measured: A0's `commit-when-clean` runs and its
targeted 97/97 subset, which are read from the plan and the handoff and are consistent with M5. Inaccurate: only
the out-of-repository summary (R-2).

## 6. Stop-the-line

**No.** Nothing in the round is live, and nothing weakens a rule. The guards that shape B and §4/1 would
falsify all fail closed until the implementing batches replace them.

## 7. Limits

- This is a narrow re-check of the review round (`b0adf6b..498a7ee`), not a fresh review of the batch.
- M7-M9 ran on PostgreSQL 17.11 locally, with a simulated non-superuser `CREATEROLE` owner. They measure
  nothing about the platform's `createrole_self_grant`, its bootstrap superuser or its pooler. Those remain
  owed under Q-028-13, Q-028-12 and Q170-c.
- A1's and Q0's other measurements that the revisions cite (F4's session setting, Q0-R2's message, Q0-R3's
  `pg_authid` denial, Q0-R5, Q0-R6 and Q0-R7) are read from their files, not re-run by me.
- CI on `498a7ee` had not finished when this file was written.
- M5 was measured by switching this worktree to the subject's branch name with `--ignore-other-worktrees`.
  Nothing was committed on that branch.
- I am the same vendor and model family as the Author (§0).
