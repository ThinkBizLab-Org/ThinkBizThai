# A1 Security/Privacy review: the post-migrate assertion pass

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-post-migrate-pass`, head `d70d2d6`, base `b07a8d9` (`main`).
I checked it out as the local branch `review/a1-post-migrate-pass` in an isolation worktree.
Author: `/claude/a0_atlas`
Date: 2026-09-27

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the
Product Owner's disposition. It is not the disposition.

---

## 0. What I am, before anything else

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I ran in A0's
worktree, under a brief A0 wrote, and I am the same vendor and model family as A0. RFC-2026-024
withdrew the cross-vendor condition, so that fact does not by itself disqualify this review. It does
mean the author chose what to point me at. Whether this review counts as the Security signature is
for the Integration Owner and the Product Owner to decide, not for me or for A0.

What makes up for that: every claim below either names the file and line it rests on or was measured
on a live cluster, and each measurement can be re-run. §2 separates what I measured from what I
only inferred.

## 1. What was reviewed

- `git show d70d2d6`: 22 files. `scripts/db/run.mjs` gains `applyTimeBlocks` and `postMigratePlan`
  (lines 127-183) and the live pass inside `migrate-clean` (lines 1295-1326). The change also adds
  `db/foundation/invariants/superseded.json` with 10 entries and 10 replacement files, the README
  section (`db/foundation/README.md:265-300`), three contract tests
  (`test-kits/db/foundation-contract.test.mjs:2272-2330`), the test floors and digests, and a new
  blocker in `work-packages/WP-0A-DB-00.json:437`.
- The plan `evidence/WP-0A-DB-00/a0-post-migrate-pass-plan-2026-09-27.md`.
- `scripts/db/psql-driver.mjs` (`redactConnection`, `parseError`, `invoke`, `feed`).
- `.github/workflows/ci.yml:125-141`: shim, then `db-migrate-clean`, `db-schema-lint` and
  `db-rls-smoke`, all against the **same** database.

**The claim that no schema, policy or grant changed is true.** I measured it:
`git diff --stat b07a8d9 d70d2d6 -- db/ tests/ .github/ Makefile package.json package-lock.json`
lists only `db/foundation/README.md` and `db/foundation/invariants/**`, 12 files, all additions. No
migration, seed, test helper, CI shim, prerequisite, workflow or lockfile appears. Replacements are
never applied to any non-test database.

## 2. Method: measured vs inferred

**Measured** on a private cluster: PostgreSQL 17.11, `initdb --locale=C -A trust -U postgres`,
`127.0.0.1:5501`, TCP only (`unix_socket_directories=''`), `LC_ALL=C`. It lived in my own
subdirectory `…/scratchpad/a1-security/pgdata` and was re-initdb'd for every round, because roles
are cluster-wide. Each round ran the CI shim, then `make db-migrate-clean`, then `make db-rls-smoke`.
A scratch later migration went in as `db/foundation/migrations/145_scratch.sql` and was removed after
each round. The cluster has been stopped and deleted. I never connected to port 5432. The user's
server there was still listening under the same pid afterwards.

| Round | Scratch later migration (or register edit) | migrate-clean | rls-smoke |
|---|---|---|---|
| R0 | none (control) | ok: 42 blocks, 32 as written, 10 replaced | ok, 965 cases |
| M01 | `industry_assignments_service_path_closed` rewritten as `using (true) with check (true)`, still restrictive, FOR ALL, PUBLIC | **FAIL** (031#1) | FAIL (1) |
| M02 | the same closure made PERMISSIVE | **FAIL** (030 replacement: set pinned by name) | FAIL (9) |
| M03 | the same closure made `TO authenticated` | **FAIL** (031#1) | FAIL (1) |
| M04 | the same closure made `FOR SELECT` | **FAIL** (031#1) | FAIL (1) |
| M05 | the same closure made `using (current_user = 'authenticated' or true)` (the tokens are kept) | ok | **FAIL** (1) |
| M06 | `industry_assignments_updated_by_is_caller` made `with check (true)` | **FAIL** (102 replacement) | ok |
| M07 | the same closure made `with check (updated_by is null or updated_by = (select auth.uid()) or true)` | **ok** | **ok** |
| M08 | the same closure made PERMISSIVE | **FAIL** (030 replacement) | FAIL (2) |
| M09 | the same closure made `TO anon` | **FAIL** (030 replacement) | ok |
| M10 | the same closure made `FOR UPDATE` | **FAIL** (102 replacement) | ok |
| M11 | `publish_intents_service_path_closed` made `using (true)` | **FAIL** (122#1) | FAIL (1) |
| M12 | `publish_intents_updated_by_is_caller` gutted with `or true` (tokens kept) | ok | **FAIL** (1) |
| M13 | `publish_intents_service_path_closed` gutted with `or true` (tokens kept) | ok | **FAIL** (1) |
| M14 | `content_targets_social_scope_fk` re-added with `ON DELETE CASCADE` | **ok** | **ok** |
| M15 | `app.industry_assignments` set to `NO FORCE ROW LEVEL SECURITY` | **FAIL** (030 replacement) | ok |
| M16 | M15 **plus a register edit that masks it** (F1) | **ok** | **ok** |
| M17 | M15 plus a replacement that escapes its transaction and runs `\!` (F2) | **ok** | **ok** |
| N18 | drop `billing_subscriptions_workspace_key` cascade | FAIL (FK probe, before the pass) | ok |
| N19 | `approval_requests_requester_is_caller` gutted with `or true` | ok | **FAIL** (1) |
| N20 | the same closure made `TO anon` | **FAIL** (090 replacement) | FAIL (1) |
| N21 | `assets_updated_by_is_caller` gutted with `or true` | **ok** | **ok** |
| N22 | `content_ideas_updated_by_is_caller` gutted with `or true` | **ok** | **ok** |
| N23 | `knowledge_items_service_path_closed` gutted with `or true` | ok | **FAIL** (1) |

I also measured:

- **Durable state.** On a freshly migrated cluster I took a snapshot, ran the whole pass three more
  times exactly as `run.mjs` does it (same `postMigratePlan`, same `feed`, same `begin;…rollback;`
  wrap), and took a second snapshot. Each snapshot held `pg_dump` (schema, data and sequence values),
  `pg_dumpall --globals-only`, roles and attributes, `pg_auth_members`, `pg_db_role_setting`,
  `pg_default_acl`, RLS flags and ACLs of every relation in `app`, `private`, `audit`, `billing`,
  `public` and `auth`, sequences, prepared transactions, other backends, all locks, advisory locks,
  event triggers, large objects and replication slots. The pass ran 3 times with 0 problems. **The
  snapshots are identical.** The only difference is pg_dump's per-run random `\restrict` token.
- **Aborts.** (a) A block that runs `create table` and `create role` and then raises. (b) DDL
  outside the block followed by a raising block. In both cases `ON_ERROR_STOP` exits psql before the
  `rollback;` line, the server rolls back when the client disconnects, and the table and role do not
  exist afterwards. No other backend and no prepared transaction was left behind. (c) A client
  SIGKILLed while its transaction held `ACCESS EXCLUSIVE` on `app.audit_logs`: the lock was still held
  300 ms after the kill and was gone once the running statement (`pg_sleep(4)`) ended.
- **Redaction.** `feed()` was run against a URL with an unresolvable host, a refused port, and a
  missing database, each URL carrying a username and password. The line the pass would print leaked
  none of user, password, host, port or database name.
- **The ten committed replacements** were diffed against the original blocks, extracted with the
  pass's own `applyTimeBlocks`. Every replacement is **strictly additive**: the only original lines
  removed are four trailing-semicolon lines that were split to add a predicate. Each replacement
  file is exactly one house-form block (`applyTimeBlocks` returns 1 block equal to the whole file),
  with no line starting with a backslash and no transaction-control keyword.
- `node --test test-kits/db/foundation-contract.test.mjs` passed 66 of 66 on the head as committed.
  In M16/M17 I ran the three new tests plus the two meta-command tests against the planted files, and
  they passed.

**Inferred from reading, not measured:** the behaviour of blocks 011#1 and 131#1 when their object
is missing (F4); the claim that `superseded_by` is not checked for cause (F5); and everything about
how the Supabase platform would behave, since the shim is not Supabase.

## 3. Findings

### F1: MEDIUM. The register can hide a security regression, and nothing but human review stands in the way

**What.** A later migration weakens a security property. The developer then registers the earlier
block as superseded and writes a replacement that no longer asserts the property. Every guard,
every test and both live layers stay green.

**Evidence (measured, M16).** Scratch migration `alter table app.industry_assignments no force row
level security;`. On its own (M15) this fails `migrate-clean` on the 030 replacement, and
`rls-smoke` stays **green**, because rls-smoke runs as `authenticated` and FORCE only matters to
the table owner. The mask took three edits:

1. Add `145_scratch.sql` to the `superseded_by` of the existing 030 entry.
2. Drop `industry_assignments` from the FORCE check in `030_industry.1.sql`, under a
   `-- SUPERSEDED BY 145` comment.
3. Add an entry `031_industry_service_path_closed.sql#1` with a replacement that is 031's block,
   with `not (relrowsecurity and relforcerowsecurity)` changed to `not relrowsecurity`.

Results: all three new contract tests pass. `migrate-clean` reports `42 apply-time blocks, 31 re-run
as written, 11 superseded and replaced`. `rls-smoke` reports 965 passed. A replacement that asserts
nothing at all (`do $$ begin -- SUPERSEDED BY 145. null; end $$;`) also passes all three tests.

**Why the guards allow it.** They check form, not substance:

- `run.mjs:1314` requires the original to fail with P0001, which is exactly what a regression does.
- `run.mjs:1319` requires the replacement to pass.
- `run.mjs:159-162` require `superseded_by` to name an existing later file.
- `foundation-contract.test.mjs:2301-2310` require one `do $$ … end $$;` text, a `SUPERSEDED BY nnn`
  comment, no pattern from the SILENCERS list, and a `why` longer than 20 characters.

Nothing compares the replacement with the original. The "word for word" rule exists only in prose
(`README.md:281-285`, `superseded.json` `_editing`).

**What does surface it.** The diff does. A superseded-register line and an invariants edit appear
next to the weakening migration. The commit message says so ("changing another batch's guarantee
becomes a line in the diff"). That is real, and it is better than the state before this change,
where the same weakening passed with no register line at all (M15 would have been green
everywhere). But the README says what the developer must do. It does not say **who must review
it**, and it does not say what a replacement may never relax.

**Remedies. These are recommendations. The decision belongs to the Owner or the Integration Owner.**

1. **A mechanical additive-only test**, in place of the prose rule. Every line of the original
   block must appear in the replacement, allowing for a trailing `;` moved onto an added predicate.
   Any removed or altered original line must sit directly under a `SUPERSEDED BY` comment and must
   be listed in the entry (for example `"relaxes": ["…"]`). I measured that all ten current
   replacements already meet the strict form, so the test costs nothing today. M16's edit would
   have failed it.
2. **A review rule for the register.** Any change to `superseded.json` or `invariants/**` that
   removes, narrows, or adds a name-exclusion to an assertion about RLS enable/force, policy
   permissiveness/command/roles/expressions, grants, role attributes (`BYPASSRLS`, ownership), or a
   tenant/scope key should need the Security/Privacy reviewer's recorded sign-off in the handoff,
   in addition to the usual Reviewer. Additive pins, which is all ten current entries, would not
   need it. The README section should say this in one sentence beside the three steps.
3. Optionally, record the raise text each entry expects (for example `"expect_raise": "restrictive
   policies"`) and match on it. The "stale" guard would then also catch a *different* failure in a
   registered block (see F5).

### F2: MEDIUM. A replacement file is fed to psql on stdin without the meta-command rule, and can escape its rollback

**What.** Replacements go through `feed()`, which is psql on stdin. psql executes a line that starts
with a backslash as a meta-command (`\!` runs a shell command). It also honours `commit;` in the
middle of the stream. The repository already holds migrations and `prerequisites.sql` to a
no-backslash-line rule for exactly this reason (`foundation-contract.test.mjs:2093-2114`; the loop at
line 2109 covers `migrations/*` and `prerequisites.sql` only). That rule was **not** extended to
`db/foundation/invariants/*.sql`. The test that is meant to say "is one do-block and nothing else"
(`foundation-contract.test.mjs:2301`, `/^do \$\$\n[\s\S]*\nend \$\$;\n$/`) matches any text that
starts with a block and ends with one.

**Evidence (measured, M17).** This replacement text passed all five relevant static tests (the three
new ones and both meta-command rules):

```
do $$
begin
  -- SUPERSEDED BY 145.
  null;
end $$;
commit;
create table public.a1_escape_marker (x int);
\! echo A1-META-EXECUTED > …/a1-security/meta_marker.txt
begin;
do $$
begin
end $$;
```

Live, `migrate-clean` was ok, and so was `rls-smoke`. The marker file was written by the shell on the
runner machine, and `public.a1_escape_marker` **persisted** after the pass.

**Why it matters.** In CI, `db-schema-lint` and `db-rls-smoke` run on the database `migrate-clean`
leaves behind (`ci.yml:134-141`). A replacement that commits DDL therefore changes the schema that
the later layers test, and that schema is not the one the migrations give production. For example, a
replacement could re-create a restrictive policy that a migration dropped, and rls-smoke would go
green on a schema production will never have. That is a CI-versus-production divergence, which is
the stop-the-line class, though here it is **reachable, not present**. It needs a committed,
reviewed file, and anyone who can commit could also edit `run.mjs`, so it is not a privilege
escalation. It does defeat the invariant a reviewer would rely on ("rolled back, so the pass changes
nothing", `run.mjs:1296-1298`). The ten committed replacements are clean: I checked, and each is
exactly one block with no backslash line and no transaction control.

**Remedies.**

1. Extend the meta-command rule's file list to `db/foundation/invariants/*.sql`.
2. Replace the regex at `:2301` with `applyTimeBlocks(name, text)` returning exactly one block whose
   `sql` equals the whole file.
3. Make `postMigratePlan` itself refuse a replacement that fails that check, so the live path
   refuses it too and not only the test.

### F3: MEDIUM (pre-existing, not introduced by `d70d2d6`). The name-excluded closures are asserted by tokens, so a gutted `updated_by` closure passes both layers

**What.** The replacements exclude later policies by exact name from the earlier batch's
predicates, and rely on "their own batches' blocks, which this pass also re-runs"
(`invariants/030_industry.1.sql:108`, and the same wording in the other nine). I measured
whether those blocks actually catch a policy that keeps its name but is gutted:

- **Straight weakening is caught by migrate-clean**, with rls-smoke sometimes as well. This covers
  `using (true)`, a flip to PERMISSIVE, changed roles, and a changed command, on both families:
  M01-M04, M06, M08-M11, N20.
- **A tautology that keeps the tokens is not caught by migrate-clean.** The later blocks check shape
  with `position('current_user' …)`, `position('authenticated' …)`, `position('updated_by' …)`,
  `position('auth.uid' …)` (`031_…:79`, `102_…:85`, `094_…` block line 13), and
  `… or true` keeps every token.
  - *Service-path closures:* caught **only by rls-smoke** (M05, M13, N23, three of three tried).
  - *Requester closure (094):* caught only by rls-smoke (N19).
  - *`updated_by` closures from 102:* **caught by neither layer** on `industry_assignments`,
    `assets` and `content_ideas` (M07, N21, N22, three of three tried). The one from 120 on
    `publish_intents` is caught by rls-smoke (M12), because a forging case exists for that table
    only.
- **A deletion action on the social FK** (M14, `ON DELETE CASCADE` on the name-excluded
  `content_targets_social_scope_fk`) is caught by neither live layer. 111's block checks
  `convalidated`, the columns and the target (`111_social_fk.sql:85`), but not
  `confdeltype`/`confupdtype`. The static rule `foundation-contract.test.mjs:2343-2346` does catch it
  in any later migration, so it is covered, just not live.

**Grade and scope.** None of this was introduced by this change. Before `d70d2d6`, the same gutting
passed everything too. The pass is strictly an improvement here. I grade it MEDIUM because the
exclusions' stated rationale ("asserted by their own batches' blocks") is only as strong as those
token checks, and the `updated_by` class has no live control at all. The impact is attribution
forgery within one workspace: an `authenticated` member can insert a row naming another member as
`updated_by`. **No tenant boundary is crossed.** A1-090 graded the underlying property LOW, so the
Owner may reasonably read this as LOW. I record the disagreement rather than resolve it.

**Remedies.**

1. For every name the replacements exclude, pin the policy's normalised expression **text**
   (`pg_get_expr(polqual)` / `pg_get_expr(polwithcheck)` equality) in the replacement or in the
   excluding batch's block, the way batch 121 pinned constraint text. This belongs in the survey
   the new blocker already owes (`WP-0A-DB-00.json:437`), which should explicitly cover policy
   expressions and not only CHECK constraints.
2. Add rls-smoke forging cases for `updated_by` on the 13 tables in 102's set. Today only
   `publish_intents` has one.
3. Add `confdeltype`/`confupdtype` to the social-FK assertion.

### F4: LOW. Two of the "32 re-run as written" are DDL guards that assert nothing and can repair their object inside the rolled-back transaction

`011_authorization_helpers.sql:154` (`if not exists … create role app_authz`) and
`131_billing_projection.sql:523` (`if not exists … add constraint billing_subscriptions_workspace_key`)
are idempotent guards. When they are re-run they always pass. If a later file removed the object, the
re-run would create it again inside the transaction and roll it back, and it would still pass. So
"32 re-run as written" overstates coverage by two. The key in 131 is also covered elsewhere: 131's
second block asserts it by name, and in N18 the FK probe fired before the pass. I have not verified
that `app_authz` is covered elsewhere (inferred from reading). **Remedy:** have the plan mark guard
blocks as not assertions and report them separately in the summary line. If the two objects matter,
assert that they exist in a final-state form.

### F5: LOW. The register checks that a cause exists, not that it is the cause, and "stale" means only "still raises something"

`run.mjs:159-162` accept any existing later migration as `superseded_by`. An entry could cite an
unrelated file. `run.mjs:1314` accepts any P0001 from the original block. Suppose an entry's
original cause is later reverted while a *new* regression in the same block also raises: the entry
never goes stale, and only the replacement defends the block. **Remedy:** F1 remedy 3
(`expect_raise`). This makes F1 easier to exploit and is not otherwise independent of it.

### F6: NOTE. Redaction holds

The pass prints `error.message`, which has been through `redactConnection` inside `invoke()`
(`psql-driver.mjs` `invoke`, `catch` branch). That function removes every component of the URL it was
given, and it runs before `parseError`. `parseError` keeps only the `ERROR:` line, so DETAIL and
CONTEXT, where a "Failing row contains (…)" would appear, are dropped. The password is never printed
by psql, and CI supplies it through `PGPASSWORD`, not the URL. I measured three connection-failure
shapes and none leaked (§2). The block raise messages carry object names and policy expressions,
never row data. A cosmetic point: a connection that drops in the middle of the pass would be
reported as "no longer holds on the migrated database" or "register entry is stale". Both still fail
the build (fail-closed), but the message misleads.

### F7: NOTE. Superuser re-runs leave nothing behind

This is measured (§2): three full extra passes left schema, data, sequences, roles, memberships,
role settings, default ACLs, RLS flags and ACLs identical, with no locks, prepared transactions or
lingering backends. That holds for 120's probe inserts, 140's INSERT/UPDATE/DELETE/TRUNCATE probe
inside its always-aborting subtransaction, and the DDL guards in 011 and 131. `begin; … rollback;`
on stdin is robust. Under `ON_ERROR_STOP`, psql exits before `rollback;` and the server discards the
transaction on disconnect, which I measured with DDL and `CREATE ROLE`. Each block gets its own psql
process (`feed` → a new `spawn`), so no session state (`set role`, `set_config(…, false)`) carries
from one block to the next. The one transient effect is a lock that could outlive a killed client
until its running statement ends, which I measured at about 4 s. That is irrelevant on a throwaway
CI database.

### F8: NOTE. The CI negative control is proposed, not written

Plan question D has the pass's own red-proof as local evidence only. `ci.yml` has no step that plants
a later migration and requires `migrate-clean` to fail. Until the Integration Owner adds one, a
future change that quietly disables the pass (for example an early `return 0`) is caught only by the
static wiring test (`foundation-contract.test.mjs:2272-2282`), which reads source text. That test is
reasonably tight: it counts exactly four `return 1;` and requires the summary line to be immediately
before `return 0`.

## 4. The questions in the brief, answered

1. **Masking (F1).** Yes, the register can hide a regression. I demonstrated it end to end. The
   design surfaces it as diff lines, which is an improvement over the state before, but no
   mechanical check limits what a replacement may relax, and no reviewer is named. I recommend the
   additive-only test and a Security sign-off rule for relaxing entries. That is for the Owner or
   Integration Owner to decide.
2. **Name-based exclusions (F3).** A straight gutting (`using (true)`, permissive, roles, command) is
   caught by migrate-clean for every excluded family I tried. A tautology that keeps the tokens is
   caught only by rls-smoke for service-path and requester closures, and **by neither** for three
   `updated_by` closures from 102. An FK deletion action is caught only by a static test. The gap
   predates this change.
3. **Durable state (F7).** None, measured. The rollback wrap is robust to an aborted psql. **But**
   the wrap itself can be escaped by a replacement file (F2).
4. **Redaction (F6).** Holds, measured.
5. **Stop-the-line.** See §5.

## 5. Stop-the-line verdict

**No stop-the-line finding.**

- **Tenant leakage:** this change moves no tenant data path. Its replacements are strictly additive
  (measured) and its guards fail closed.
- **Secret exposure:** none. Redaction was measured.
- **Migration divergence:** migrations are untouched and the pass leaves no durable state (measured).

F2 describes a *reachable* CI-versus-production divergence that needs a committed replacement file.
No such file exists today. I recommend closing F1 and F2 before the register takes its first entry
from a batch other than this one, because from then on the register is the path every weakening of
an earlier guarantee will travel.

## 6. Limits of this run

- I am a same-vendor subagent under the Author's brief (§0). I chose the mutations myself, but only
  from the families the brief named plus the ones I added (094, 111, 131, FORCE). I tried 3 of the 13
  `updated_by` closures and 3 of the 20+ service-path closures, not all of them.
- The live database is the CI shim on stock PostgreSQL 17.11, not Supabase. Behaviour under a
  Supabase migration role that is not a superuser was not measured.
- I did not run `npm run verify` or the full suite, only `foundation-contract.test.mjs` (66/66) and
  targeted subsets. Test floors, digests and the integrity manifest are the Tester's to verify.
- I did not review the Owner disposition file's transcription against the Owner's words.
- Every scratch file (`145_scratch.sql`, the planted register entry and replacement) was removed.
  `git status` was clean apart from this file before commit. My scripts and logs remain only under
  my private scratchpad subdirectory.
