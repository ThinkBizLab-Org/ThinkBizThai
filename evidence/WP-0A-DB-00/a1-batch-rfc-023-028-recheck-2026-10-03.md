# A1 security re-check: batch rfc-023-028's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-023-028` (PR #182, Draft, OPEN, not merged), head
  `498a7ee` (`498a7ee282a652bc8589789ca69f4515e2ed28ed`) over code `abd48b3`
  (`abd48b384a4dad62e8f71589b9cca1db3a94508c`), base `921efb5` (main). Author `/claude/a0_atlas`. Previous
  reviewed head `b0adf6b` (my review: `a1-batch-rfc-023-028-security-review-2026-10-03.md`, cherry-picked here
  as `ceca0b6`).
- **Scope:** NARROW. The review-round corrections `b0adf6b..498a7ee` (five commits: three cherry-picked
  reviews, code `abd48b3`, handoff `498a7ee`), checked first against my own findings F1-F8.
- **Checked out as:** local branch `recheck/a1-batch-rfc-023-028` at `498a7ee`, in this run's own worktree
  (`wf_94b46ca9-189-7`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the branch NAME
  `agent/claude/WP-0A-DB-00-batch-rfc-023-028` in the same worktree (`--ignore-other-worktrees`; `git rev-parse
  --abbrev-ref HEAD` printed that name; local and remote refs both `498a7ee`), committed nothing there, and
  switched back to `recheck/a1-batch-rfc-023-028` before writing this file.
- **Status:** this file records findings. It advances no status and approves nothing: not the batch, not
  RFC-2026-023, not RFC-2026-028, not any Q-023-* or Q-028-* answer. It fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and
model family as the Author and as the drafter of both RFCs and of the review-round corrections. Under
RFC-2026-024 that is the stated independence limit of this role run. This file is a findings record from a
role run, not DATA-DEC-03's co-owner's acceptance; accepting it as the A1 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my earlier review; plan §3 and new §7 (`git diff b0adf6b 498a7ee` of the
plan); both RFC diffs of the round in full; the three commit messages of the round; the handoff diff;
`open_blockers[199]` compared to `b0adf6b` by prefix. Citations the corrected text adds, each opened at the
line: `171:249-255` (rule 4, exactly three `app_authz` functions), `171:279-295` (the literal check reads the
`USING` of three named policies and the helper body), `invariants/021_member_scope.1.sql:40-49` (no
`app_authz` SELECT on `workspace_member_scopes`), `invariants/011_authorization_helpers.2.sql` (exactly two
`app_authz` policies, :48-60), `run.mjs:1354` (`PINNED_SCHEMA_PRIVILEGES`, three entries, no `app_command`),
`run.mjs:3714-3724` (the `authenticator` negative), `run.mjs:3821` (`KNOWN_SUPERUSERS`), `020_business.sql:652-655`
(no `pg_authid` in a migration), `catalog-snapshot.json:128,141,154,302` (`members_besides_admin: 0`; the
note recording the platform's `CREATE ROLE` admin grant, set false, inherit false), `021_member_scope.sql:534-539`
(`select_own`), `001_service_roles.sql:12,44`, `RFC-2026-017:50`, `RFC-2026-022:418-420`, `RFC-2026-027:12`.
Each is where the text says and says what the text quotes.

**Measured** (Node `v24.20.0`, `node -v` before each run; logs in the private directory `a1-rfc-023-028r2/`,
not committed):

| command / probe | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 921efb5 WP-0A-DB-00` on the branch name | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` on the branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` on the branch name | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `git patch-id --stable` of each review commit and its cherry-pick | — | identical for `bc0cb19`/`c008820`, `c7fb1cf`/`ceca0b6`, `c4692ad`/`9fa8f84`: my review arrived unaltered |
| `open_blockers` vs `b0adf6b` | — | 200 and 200 entries; only `[199]` differs, a strict append (`(8)`); no other manifest key changed |
| integrity manifest | — | 91 digests; only the two RFC digests changed; both match `shasum -a 256` of the files |
| Q-ids in the two RFCs' question tables | — | 21 (Q-023-1..8, Q-028-1..13) |
| `grep` of `WP-0A-DB-00.json`, `integrity-manifest`, `open_blockers` in `scripts/db`, `db/foundation/ci`, `Makefile` | — | comments only (`explain-harness.mjs`, `authz-proofs.mjs`, `run.mjs`); no DB layer reads a changed file |
| added lines of the round's diff, grepped for `password '`, credentialed URLs, `PGPASSWORD=` | — | none |
| `gh pr view 182` | — | Draft, OPEN, head `498a7ee`, not merged |
| `gh run list` on the branch | — | run `37259006037` on `498a7ee` **in_progress** when read; `37255381909` on `b0adf6b` success |

**Live, port 5501 only** (`/opt/homebrew/bin`, PostgreSQL 17.11, `initdb --locale=C -A trust -U postgres`,
`LC_ALL=C`, TCP only with `unix_socket_directories=''`, the shim first; one round). Nothing a DB layer reads
changed, so this is not a re-measurement of the batch: I ran it to measure four claims the corrected text now
makes about PostgreSQL (one of them left to Q-028-13). `make db-migrate-clean` exit 0 ("52 apply-time blocks,
38 re-run as written, 14 superseded and replaced"). No drift appended; `140_audit.sql` untouched; `git status`
clean; cluster stopped and removed; nothing listening on 5501. `db-rls-smoke` not run.

| probe | what | result |
|---|---|---|
| P1 | non-superuser `CREATEROLE` role `sim_owner` creates a login role, `createrole_self_grant` empty | one member row: `sim_owner`, admin t, inherit f, set f, grantor `postgres` (reproduces my R0 and §3.1's text) |
| P2 | `sim_owner` (CREATEROLE + that row) runs `alter role … password` | succeeds |
| P3 | a role holding `ADMIN` on the login role but **no** `CREATEROLE` runs the same | `permission denied to alter role` — "the current user must have the CREATEROLE attribute and the ADMIN option on the role" |
| P4 | `sim_owner` revokes its own creator row | `revoke wl_a from sim_owner`: **exit 0 with a WARNING and nothing revoked**; `… granted by postgres`: `permission denied to revoke privileges granted by role "postgres"`. The row remains |
| P5 | `set createrole_self_grant = 'set, inherit'`, then `create role` | **two** member rows for `sim_owner`: the admin row (admin t, inherit f, set f, grantor `postgres`) **and a second** (admin f, inherit t, set t, grantor `sim_owner`) |
| P6 | §3.1 typed as `postgres`; as `app_worker_login`, `set local role app_worker` each transaction | `current_setting('app.workspace_id', true)`: fresh session `<null>`; after a `set_config(…, true)` transaction `''`; after a `set_config(…, false)` made **as `app_worker`**, the next transaction reads the leaked id. `current_user` after commits: `app_worker_login` |

## 2. My findings, re-checked

| finding | where folded | verdict |
|---|---|---|
| F1 (MEDIUM) creator ADMIN row on the platform | RFC-028 §2/4 (:60-64), §3.1 (:99-109), §3.3/2 (:177-182), §4/1 (:283-285), §5/3, Q-028-13 (:432); `[199]` (8)(a) | **Resolved in text**, platform half owed with an owner. P1 reproduces the row; `catalog-snapshot.json:302` already records it on the platform. Two refinements below (A1R-1, A1R-3, A1R-4) |
| F2 (MEDIUM) no topology read where provisioned | §3.6 new row (:277), §3.3/2 last paragraph, §5/14, Q-028-3; `[199]` (8)(b) | **Resolved in text**, owed to §4/1's batch. The row lists every item my remedy named (attributes, memberships with options, members, settings, connection limit) and the re-take after each credential change |
| F3 (MEDIUM) custody vs request tier | §3.3/2 three conditions (:164-175), Q-028-3's condition; `[199]` (8)(c) | **Resolved in text**, as conditions of Q-028-3's answer, owed to the Integration Owner with operations and A1 |
| F4 (LOW) session-level `app.workspace_id` | §5/13 (:365-373), Q-028-12; `[199]` (8)(b) | **Resolved in text for the test**; the predicate (neither null nor empty) is right (P6). One gap: A1R-2 |
| F5 (LOW) `app_command` USAGE on `app` | RFC-023 §0/6, §5 (:122); `[199]` (8)(d) | **Resolved in text**; the need is also recorded for RFC-2026-026's command half, which is approved and outside the writable paths |
| F6 (LOW) `app_authz` policy wider than `select_own` | RFC-023 §3.2 (:85); handoff `security_privacy_cost_impact` | **Resolved**: both now say the policy omits the membership conjunct and why no reach follows; Q-023-8 keeps the choice open |
| F7 (LOW) closing power is the role's | RFC-023 §8/3 (:166); `[199]` (8)(d) | **Resolved in text**: a static writer rule for `app.workspaces` or a dedicated owner role, each with a drift, owed to Q-023-5's batch |
| F8 (INFO) "inert" scope | RFC-028 §3.3/1 | **Resolved** |

The C0-3 change to RFC-023 §8/2 (no lifecycle literal in `USING`; the literal bounds the target in `WITH
CHECK`) keeps the gate: `USING (app.workspace_member_role(id) = 'owner')` is null, hence false, for every
blocked state since `171`, so a blocked workspace's owner still cannot be served by the command (this is
RFC-2026-027's gate inherited, the property my R2 measured for the helpers). Not re-measured for the policy,
which does not exist.

## 3. New findings (in the corrected text)

Graded for what they would do if built as written. None is live: no role, grant, policy or credential exists.

**A1R-1 — LOW (design). `createrole_self_grant` adds a second membership row; it does not change the admin
row's options.** `RFC-2026-028-worker-identity.md:432` (Q-028-13 asks whether the setting "add[s] `INHERIT`
or `SET` to it"), `:283-285` (§4/1), `:277` (§3.6's snapshot row: "no member besides the migration owner's
admin row (admin t, inherit f, set f)"). Measured (P5): with `createrole_self_grant = 'set, inherit'` the
creator gets a second row, admin f, inherit t, set t, grantor itself — so the migration owner could `SET ROLE
app_worker_login` and act as the worker identity, outside the custody §3.3 describes. An assertion written
"per member" (is `postgres` the only member, and is its row admin t, inherit f, set f) can pass on either row
depending on which it reads; one written per row refuses it. **Remedy:** §4/1's migration issues `set local
createrole_self_grant = ''` before `create role` (the setting is user-settable), and §4/1's block, §3.6's
snapshot lint and §5/14 assert **per `pg_auth_members` row**: exactly one row whose member is the applier,
with those three options; §5/14 gains the drift "a second row for the migration owner, set t". Q-028-13's
wording corrected to "adds a second row".

**A1R-2 — LOW (test obligation placed on the test only). §5/13's check is the "worker harness's", and no
text obliges the production worker to make it.** `RFC-2026-028-worker-identity.md:365-373` and §3.1 (:110).
In this RFC "the harness" is the test harness that sets the test credential (§3.3/3, :188, :289); the
production rule in §3.1 is prose ("never issues `SET` … without `LOCAL`"). A leak is exactly a violation of
that prose, and P6 shows it survives a role change made inside the job, so a check that runs only in tests
proves the test harness, not the worker. **Remedy:** §3.1's "every transaction the worker runs" gains the
start-of-transaction check (refuse when `current_setting('app.workspace_id', true)` is neither null nor
empty), owed to the batch that writes the runner (`RFC-2026-026`'s worker half), and §5/13 runs through that
code path, not a test-only copy.

**A1R-3 — INFO (accuracy). "`ADMIN` on a role is enough to `alter role … password` it" is not what PostgreSQL
requires.** `RFC-2026-028-worker-identity.md:178`. Measured (P2, P3): it takes `CREATEROLE` **and** `ADMIN`;
a role with `ADMIN` alone is refused. The conclusion stands on the provisioned instance, because `postgres`
holds `CREATEROLE` there, so whoever holds its credential can set the worker's. **Remedy:** "`ADMIN` on the
role, with the `CREATEROLE` the migration owner already holds".

**A1R-4 — INFO (for Q-028-13's measurement). A revoke of the creator row by its holder is a silent no-op.**
`RFC-2026-028-worker-identity.md:180-182`, `:432`. Measured locally (P4): `revoke … from <self>` exits 0 with
only a WARNING and the row remains (its grantor is the bootstrap superuser); naming that grantor is refused.
A runbook step judged by exit code would read "revoked". **Remedy:** Q-028-13's measurement asserts the row's
absence in `pg_auth_members` after any revoke, never the exit code. Platform behaviour, where the bootstrap
superuser is `supabase_admin`, is unmeasured.

## 4. The questions asked of this review

**Can the worker identity be used by a client or a compromised web tier?** Not by a client (unchanged: no
membership from `authenticator` or any client role, kept in §3.1 and §5/3; the `authenticator` drift now
honestly snapshot-only). By a compromised web tier only if it can read the credential, which §3.3/2 now
forbids as a condition of Q-028-3. Two further holders are now named or measured: whoever holds `postgres`'s
credential (§3.3/2, A1R-3), and — if the platform sets `createrole_self_grant` — the migration owner directly
by `SET ROLE` (A1R-1).

**Does it bypass RLS anywhere?** No; the round changed no topology. Measured again (P6): after each commit the
login role is back to `app_worker_login`.

**Is credential custody sound?** In the repository, yes: no secret in the diff (grep, and `verify`'s secret
scan green); the migration sets no password and §4/1 no longer reads `pg_authid`. On the provisioned
instance, the round turned my three gaps into conditions with owners (`[199]` (8)(a)-(c)); A1R-1 and A1R-4
refine the measurement Q-028-13 holds.

**Do the probes catch a mis-provisioned worker?** On migrate-clean, as before (my DA, DB; DC still not caught,
as §3.6 says, until the settings rule is extended). On the provisioned instance, only once §3.6's new
snapshot row is built (owed); A1R-1 asks it to read per row.

**RFC-2026-023: can a command serve a user outside their scope, including a blocked workspace?** Not as
revised: the helpers still call `app.is_active_member`; the §8/2 policy's `USING` inherits the gate through
`workspace_member_role`; §6's `scope_type` case now fails at first call, so the grant is held by execution.

## 5. Claims checked

| claim (where) | verdict |
|---|---|
| cherry-picks `bc0cb19`→`c008820`, `c7fb1cf`→`ceca0b6`, `c4692ad`→`9fa8f84` with `-x` (plan §7.1, handoff, task report) | TRUE (patch-ids identical; `-x` trailers present) |
| 23 findings (C0-1..7, A1 F1..F8, Q0-R1..R8) folded or owed (`[199]` (8), plan §7.2) | TRUE for my eight (§2 above); C0's and Q0's not re-judged here |
| twenty-one questions unanswered; Q-028-13 new (blocker, plan, handoff, commit) | TRUE (counted) |
| `[199]` appended on its own line, nothing else in the manifest changed; 33 line pins hold (plan §7.3) | TRUE (prefix comparison; `verify` green, which runs the pin test) |
| 91 digests, only the two RFC digests changed (commit, plan, handoff) | TRUE |
| nothing a DB layer reads changed; migrate-clean and rls-smoke not run, no exit code recorded (plan, handoff) | TRUE; the handoff row carries no `exit_code` |
| `498a7ee` is the handoff alone, cites `abd48b3` (commit message) | TRUE (`git show --stat`: one file; `head_revision_or_patch_checksum` `abd48b3…`). The task text's "head_revision 3d21389 … not re-pointed" does not match the commit message or the file; the file is what counts |
| both RFCs keep their status words; nothing approved (commit, plan §7, Revised lines) | TRUE |
| handoff impact: "wider than what authenticated holds, and reaches nothing…" (F6) | TRUE |
| RFC-028 §3.3/2 "`ADMIN` … is enough to `alter role … password`" | IMPRECISE (A1R-3), conclusion holds |
| RFC-028 §3.1 "PostgreSQL 16+ grants … `ADMIN TRUE, INHERIT FALSE, SET FALSE`" | TRUE with `createrole_self_grant` empty (P1); with it set, a second row (A1R-1) |
| PR #182 Draft, open, head `498a7ee` (task report) | TRUE |

## 6. Stop-the-line verdict

**No stop-the-line.** No secret, credential, customer data, role, grant, policy or migration in the round's
diff; no tenant path reachable that was not before. **Nothing in security blocks the merge** of this
text-only batch: A1R-1..4 are refinements of proposals (two LOW, two INFO) and belong in RFC-2026-028's text or
on `open_blockers[199]` before its approval, not before the merge. The merge itself still needs a green
required CI run on `498a7ee` (`37259006037` was in progress when I read it) and the Integration Owner's
evidence (`[188]`); those are process conditions, not findings of mine. My reading on approval, as a role
run: F1-F3 are now conditions with owners, so they no longer stand between RFC-2026-028 and approval;
A1R-1 and A1R-2 should be folded (or recorded on `[199]`) first. RFC-2026-023's F5-F7 are folded; nothing new
of mine stands against it.

## 7. Limits

- Same vendor and model family as the Author (§0); narrow re-check of the round, not a re-review of the batch.
- P1-P6 were run on a throwaway local cluster as a simulated non-superuser owner; the platform's
  `createrole_self_grant`, its bootstrap superuser as grantor, and revoke behaviour there are unmeasured.
- I did not re-run my earlier R0-R2 or the drifts DA-DC; the round changed nothing they read.
- I did not re-judge C0's or Q0's findings or their folds, beyond where they touch my questions.
- `db-rls-smoke` not run. The CI run on `498a7ee` was not complete when read.
