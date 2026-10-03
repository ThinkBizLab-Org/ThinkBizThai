# C0 contract review re-check: batch 129's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-129`, head `00bf2f5a9f76590dbf0323e5560c27e3c1235d34`
  over code `a9f7508`, base `75c9274` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/168>. Previous reviewed head `0f08d92`
  (`c0-batch-129-contract-review-2026-10-03.md`, cherry-picked onto the subject as `d2f5ccc`).
- **Scope:** a NARROW re-check of the review-round corrections (`0f08d92..00bf2f5`: `a9f7508`, `70ad049`,
  `00bf2f5`), not a fresh review of batch 129.
- **Review branch:** `recheck/c0-batch-129`, checked out at the subject head `00bf2f5`. This file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; my earlier evidence; plan
  `evidence/WP-0A-DB-00/a0-batch-129-plan-2026-10-03.md` (§5 and §9 in full); the disposition
  `product-owner-disposition-2026-10-03-batch-129.md` (unchanged since `0f08d92`); `git diff
  75c9274..00bf2f5` (14 files) and `git diff 0f08d92..00bf2f5`; blocker 186 (`open_blockers[185]`, from
  `CLOSED BY BATCH 129` to the end); `handoffs/WP-0A-DB-00-author-handoff.json`.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** Every exploit I wrote against `0f08d92` (FV3, RN3) now fails migrate-clean by
  name. Nothing I measured against the new code is reachable on the clean set.
- **Blocks the merge: no.** C0 F1, F2 and F3 are closed as I asked. Remedy (a) is implemented, so the
  verdict on the migrations as built no longer reads any relation a migration can create, rename or
  replace. Half of remedy (b) is implemented too, and the "cannot rewrite/cannot reach" sentences are
  corrected (remedy (c)). The half of (b) that was left out is recorded as owed, and I agree it is not
  needed (G2). I found one new item, **G1 (LOW)**. It predates batch 129 and is not introduced by this
  round. A migration's `COPY ... TO PROGRAM` runs a shell command as the server's OS user, and no layer
  reads it. It should go to blocker 186 as owed, under the Owner's words that ended the chain. Whether
  to record it before or after the merge is the Owner's or A0's call, not mine.

## 2. Measured vs read

### Measured (by me, on this head)

Node `v24.20.0` (`node -v` checked by every round script, which refuses any other version;
`/Users/bank/.local/node-v24.20.0/bin` first on PATH). PostgreSQL **17.11** at `/opt/homebrew/bin`;
`initdb --locale=C -A trust -U postgres`; 127.0.0.1:**5505** only, `-c unix_socket_directories=''`;
`LC_ALL=C`; the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean` and `make db-rls-smoke`.
**Every round used a fresh initdb.** Each drift was **appended** to `db/foundation/migrations/140_audit.sql`
in this worktree and restored byte for byte from a copy saved first (sha1
`2ac2fc2c592be3b5fa7844ce12793093b782a502`). `cmp` passed after every round and again at the end.
Static = `node --test test-kits/db/foundation-contract.test.mjs tests/db/identity/identity-isolation.test.mjs`;
sl = `make db-schema-lint`. Private directory: `.../scratchpad/c0-129r2/` (`all.log`, `logs/`, `d/`).

**Repository commands, on the branch name.** I checked `agent/claude/WP-0A-DB-00-batch-129` out by name
in this worktree (`--ignore-other-worktrees`; `git branch --show-current` printed it; HEAD `00bf2f5`, never
detached). I ran the three commands, committed nothing, and switched back to `recheck/c0-batch-129`.
`origin/main` = `75c9274`.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 75c9274 WP-0A-DB-00` | **0** | "all 14 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | **0** | "clean: exit 0 — tests 677, pass 677, fail 0, skipped 0, todo 0" |

PR #168, read with `gh`: OPEN, Draft, head `00bf2f5`, check `bootstrap` SUCCESS, not merged.

**Live rounds:**

| Id | Drift | static | sl | mc | rs | What was named |
|---|---|---|---|---|---|---|
| clean | none | (verify 0) | (n/a) | **0** | **0** | "3753 objects initdb made, taken before the migrations and sealed"; "the 3753 objects ... read again after the last migration and compared in memory, are as they were"; ceiling + 24 probes, each refusing its drifts; post-migrate 49 blocks (37/12); rls-smoke 1079 passed, authz proofs 6/6 |
| **FV3** (my F1 exploit, verbatim) | Q-IPF + Q-GS, then the reference table renamed and replaced by a view | 0 | 0 | **2** | 0 | "its table was replaced while the migrations ran (16390 r rules=f triggers=f rls=f owner=10 before, 18429 v rules=t triggers=f rls=f owner=10 after), so it is no reference". At `0f08d92` this was 0/0/0/0. |
| **RN3** (my F2 exploit, verbatim) | `pg_read_file(text)` and `information_schema.sql_features` renamed | 0 | 0 | **2** | 0 | in memory: "function pg_catalog.pg_read_file(text) [renamed to pg_catalog.c0_renamed_read_file(text)], relation information_schema.sql_features [renamed to information_schema.c0_renamed_sql_features]". At `0f08d92` this was 0/0/0/0. |
| FVc (control: FV3 without the swap) | Q-IPF + Q-GS | | | **2** | 0 | in memory: "function information_schema._pg_interval_type(typid oid, mod integer) [changed], relation pg_catalog.pg_statistic [changed]" |
| R2c (A1 R2, my spelling) | a `request.jwt.claims` default for `anon`; `alter database postgres set search_path = app, public` | | | **2** | **2** | "client role setting default(s) not pinned ...: anon in every database: request.jwt.claims={...}, every role in database [redacted]: search_path=app, public". rls-smoke failed authz proof `security-definer-is-not-inlined` (1 of 6). |
| R3c (A1 R3, my spelling) | an event trigger over a `private` function, then **disabled** | | | **2** | 0 | "event trigger(s) not pinned, each running on DDL in any session: c0_evt on ddl_command_end" |
| TB (new) | a time bomb: a SECURITY DEFINER trigger function that replaces `_pg_interval_type` on the first insert, after every check has read | | | **2** | 0 | the in-memory comparison passes, as it should, because nothing initdb made has changed yet. The security definer probe names "private.c0_tb() [PUBLIC can execute] [not a pinned SECURITY DEFINER function]" |
| SHADOW (new) | `create function pg_catalog.c0_shadow()` (OID above 16384, outside the fingerprint) | | | **2** | 0 | the pg_catalog guard, in every probe job: "object(s) created in pg_catalog ...: function c0_shadow()" |
| **PROG** (new, G1) | `copy (select 'c0 prog') to program 'cat > <private dir>/c0_prog_marker'` | **0** | **0** | **0** | **0** | nothing. migrate-clean "ok", in-memory comparison "as they were". The marker file was created and holds `c0 prog`. |

### Read, not measured

- A0's mutations M-ID, M-MEM, M-SQLBODY and M-IDENT (plan §9.3), A0's SWAP and FV3n, and A1's R1
  (`_pg_datetime_precision`). I read the `prosqlbody` addition and its static pin, and the
  fingerprint drift's six shapes, in the diff. I did not run the mutations.
- The nine synthetic cases of `diffSystemFingerprint`. I read them in
  `test-kits/db/foundation-contract.test.mjs`, and they pass inside `npm run verify`. They cover: same,
  any order, changed, renamed, renamed and changed, gone, new, read twice, and the combined sort.
- The Owner's words. I cannot see the Owner's messages. `เอาตามที่แนะนำเลย ลุยต่อ` appears byte-identical in the
  disposition (1), the plan (2), the manifest (2) and the handoff (1). The disposition is unchanged since
  `0f08d92`.
- G1's reach beyond the DB server's OS user. That reach is inference: on a developer machine the server
  and the executor share one OS user, and `psql` is resolved through a user-writable PATH. I touched
  nothing outside my private directory. In CI, Postgres is a service container
  (`.github/workflows/ci.yml:22-27`), so the command runs in that container. On Supabase, the migration
  role is not a superuser.

## 3. The questions

**Does each closed item do what batch 128's and 129's re-checks asked?**

- **C0 F1 (MEDIUM) → closed.** (a): `run.mjs:3078-3082` reads the rows from the catalogs into memory
  before the first migration (`SYSTEM_FINGERPRINT_READ_SQL`, `:777`, the same text under the same
  `search_path`). It also requires the table to hold exactly those rows. `:3100-3107` reads the rows again
  after the last migration and compares them with `diffSystemFingerprint` (`:787`), which is pure and
  exported. (b), first half: the table's identity is read from `pg_class` before (`:3075`, refused unless
  it matches `SYSTEM_FINGERPRINT_RELATION_SHAPE`, `:782`) and after (`:3094-3099`). (c): the sentences are
  corrected in `run.mjs` (both comments), README rule 15, plan §5 and §7.6, and the handoff. FV3, run
  verbatim, now fails migrate-clean on the identity. FVc shows that the in-memory comparison alone names
  the same change when no swap is made.
- **C0 F2 (LOW) / Q0 F1 → closed.** `ident` is compared in memory and in the probe (`:822`), and the
  probe names a rename as `[renamed to ...]`. RN3, run verbatim, now fails by naming both renames.
  `SET SCHEMA` is covered because `ident` carries the schema. That is read, not measured.
- **C0 F3 (INFO) → closed.** The handoff's `security_privacy_cost_impact`
  (`handoffs/WP-0A-DB-00-author-handoff.json:168`) now begins "Within what plan section 5 states the
  fingerprint reads, and subject to its stated exclusions". It also records that the sentence as first
  written was broader than what the batch read.
- **A1 R1, R2, R3.** These are A1's to re-check. I measured R2 and R3 in spellings of my own (R2c, R3c),
  both named. R3c includes a *disabled* event trigger, which the rule still names, since it reads
  `pg_event_trigger` whole (`:1144`).

**Is the fingerprint taken at the right moment, and is it sealed so a migration cannot rewrite the
baseline?** It is taken after initdb and the shim, and before the prerequisite and the first migration.
The order is `snapshot → seal → identity → rows in memory → the table held against them → steps`
(`:3069-3084`), and the static test asserts the same order. **Sealed: yes, now, for the verdict that
matters.** The baseline the migrations are judged against lives in the executor's memory, read before any
migration ran. The after-reading goes to the catalogs, never to `catalog_baseline`. No SQL a migration
runs can reach that memory. What can still forge the after-reading is the class plan §9.6 and blocker 186
name: catalog functions replaced so they forge their own row. G1 adds a second route, from outside the
database (§4).

**Is what it covers and does NOT cover honestly stated?** Yes, with one gap of statement (G3, INFO).
Plan §5 lists the baseline relation's identity as closed by the round and the perfect-forgery class as
owed. Blocker 186's correction to (i) records that "a migration cannot rewrite the reference" was false,
as I asked. "No relation a migration can create, rename or replace is read by that verdict" (plan `:166`)
is true as worded.

**Ownership amendments.** These are the three declared paths outside `writable_paths`, unchanged from
`0f08d92`. `test-kits/integrity-manifest.json` still moves exactly three digests against base
(`test-suite-contract.mjs`, `branch-identity.test.mjs` and `foundation-contract.test.mjs`); the round
moved only the last of these again. Branch scope exits 0 with 14 paths. The test count is unchanged at
677, so `evidence/VERIFICATION.md` is rightly not touched. **Sound.**

**Plan, disposition, blocker and handoff claims.** These are true as measured. The identity text quoted
in plan §9.2 for FV3 ("16390 r ... before, 18429 v rules=t ... after") is what I got, character for
character. RN3's and FVc's names match. The clean-run counts are 3753 objects, 24 probes, 49 blocks
(37/12) and 1079 cases. Blocker 186's (vi)-(x) and its owed list agree with plan §9.2 and §9.6, and the
handoff's `open_risks_or_blockers` says the fixes are not yet re-checked and the PR stays Draft. The
handoff's `head_revision_or_patch_checksum` is `70ad049`, the commit before the handoff, which is the
"last and alone" convention, and `check:handoff` accepts it.

## 4. Findings

### G1 — LOW — a migration's `COPY ... TO PROGRAM` runs a shell command as the server's OS user, and no layer reads it

- **Where:** no rule exists. `psqlLex` (`scripts/db/psql-driver.mjs:418`) and blocker 186 item 12 refuse
  psql's client-side meta-commands (`\!`) in every fed file. Nothing reads the server-side equivalent.
  `grep -i "to program\|pg_execute_server_program"` over `scripts/db/`, `test-kits/db/` and the README
  finds nothing.
- **Measured (PROG, `d/prog.sql`), appended to 140:** static 0, sl 0, migrate-clean **0**, rls-smoke
  **0**. The command ran and the marker file appeared in my private directory.
- **Why it matters here:** the review round's guarantee is that the reference is out of the *database's*
  reach. On a machine where the server runs as the same OS user as the executor (any local
  `make db-migrate-clean`), a superuser migration can also reach the executor's environment. For example,
  it could put a `psql` earlier on a user-writable PATH, which would answer the after-reading. That is
  inference; I did not measure it outside my private directory. The project already treated the
  client-side route as worth closing (blocker 186 item 12, Q0 MC1). This is the same capability by
  another door.
- **Why LOW and not stop-the-line:** it predates batch 129 and is not introduced by this round. It needs
  a hostile superuser migration that a reader would see. Nothing in the tree does it. In CI it runs
  inside the Postgres service container, not on the runner. On the platform the migration role is not a
  superuser. All of that is read.
- **Remedy (any one):** (a) a static rule in the `psqlLex` family that refuses `COPY ... PROGRAM`, and,
  for good measure, `lo_import`/`lo_export` and the `pg_read_*file`/`pg_ls_dir` server-file functions, in
  every migration, replacement, fixture and drift; (b) run migrate-clean's migrations as a role that is
  not a superuser and lacks `pg_execute_server_program`; or (c) at the least, record it on blocker 186 as
  owed, beside "a hostile superuser drift can still forge in ways no verdict sees", and add it to plan §5's
  "does not cover" list.

### G2 — INFO — the identity is not re-checked inside the probe job; I agree it need not be

- **Where:** A0's not-done item 1; plan §9.6; blocker 186's owed list.
- **Assessment:** I asked for this in remedy (b) when the probe *was* the verdict on the migrations. The
  verdict is now `run.mjs:3102`, which never reads the table. The probe jobs run drift text taken from
  the repository, each rolled back, after the executor has shown the table's identity and seal
  unchanged. A probe-job re-check would only defend the self-tests against a drift written to blind
  them, and those drifts are reviewed code. **No change needed.** Recording it as owed is accurate.

### G3 — INFO — §5's two lists leave a few relation and function attributes in neither

- **Where:** plan §5 "What it covers" / "What it does NOT cover" (`:214`); README rule 15's "Not read"
  (`db/foundation/README.md:554`), which is shorter than §5 (it omits domains, aggregates' `pg_aggregate`
  rows, conversions and text-search objects).
- **What:** the covered list is exact, so a careful reader will not over-read it. Still, neither list
  names: on initdb relations, column `NOT NULL`, defaults (`pg_attrdef`), constraints and indexes, and
  the *definitions* (as against the names) of rules, triggers and policies; on functions, the columns
  outside the `fp` row (`proretset`, `provariadic`, `proargmodes`). The function columns are not
  changeable by `CREATE OR REPLACE`. I found no isolation effect, and none of this was asked of the
  round.
- **Remedy:** one sentence in plan §5 and README rule 15 at the next touch: "Of a relation, only the
  attributes listed are read; of a function, only the `fp` row's".

### Checked and found sound (no finding)

- The before-reading and the after-reading are the same constant under `set local search_path =
  pg_catalog`, in a transaction that is rolled back. psql runs `--no-psqlrc --csv`, and the CSV parser
  keeps quoted newlines and carriage returns, so a multi-line `prosrc` cannot misalign a row. Keys are
  `kind` plus `objoid`, and a key read twice is named.
- The table is held against the catalogs before the first migration (`:3081`). A pre-poisoned table is
  refused.
- `[renamed to ...]` in the probe and in memory produce the same text, so the self-test names and the
  in-memory names agree.
- The new client-role-settings rule reads `setrole = 0` (every role) in every database and in each
  database, which covers `ALTER DATABASE ... SET`, as R2c shows.
- A0's claim that the static layer fails on its own for each mutation rests on reading pins I checked
  in the diff (order, refusals, `prosqlbody`, `(fp, ident)`).

## 5. Limits

- One minor version (17.11), one machine, no platform (Supabase) run.
- I ran no mutation of `run.mjs`. Plan §9.3 is the Author's measurement, read here.
- G1's reach past the server's OS user is inferred, not measured. I kept every shell effect inside my
  private directory.
- I did not try the perfect-forgery class (catalog functions replaced to forge their own row). It is
  stated as owed, and closing it is beyond a bounded change, as plan §9.6 says.
- I have the Author's training and blind spots (§0).
- Cleanup: the cluster on 5505 was stopped and its data directory removed; port 5505 is free (`lsof`
  exit 1). `140_audit.sql` is `cmp`-identical to the copy saved first (sha1 `2ac2fc2c…`). The subject
  branch was checked out only to run the three repository commands, nothing was committed on it, and
  this worktree is back on `recheck/c0-batch-129`. The logs and drifts stay in the private directory.
  Nothing was pushed.
