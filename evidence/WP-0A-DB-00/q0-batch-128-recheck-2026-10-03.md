# Q0 independent test re-check: batch 128's review round (PR #167)

- **Package:** `WP-0A-DB-00`. **Role run:** `/claude/q0_sentinel` (independent Tester).
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-128`, head
  `0646f326e21b4e02bd02f8e1aa0876eb11a214f5` over code `b594b46`, base `18f1469` (main). Author
  `/claude/a0_atlas`. Previous reviewed head `b8435faf7f0d339ce101ceefccb49b3770679c8a` (my test of it:
  `q0-batch-128-test-review-2026-10-03.md`). PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/167>.
- **Scope:** a NARROW re-check of the review-round corrections (plan §7, `b8435fa..0646f32`), with my own
  earlier exploits re-run first.
- **Checked out** the head into my own branch `recheck/q0-batch-128` in a worktree. The live layers ran on
  a `git archive` export of that head in my private dir (`q0-128r2/`), never on the worktree.
- This file **records findings and advances no status.**

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author of this batch: the same vendor and model family as the
Author, the Reviewer (`/claude/c0_contract_reviewer`) and the Security reviewer (`/claude/a1_bastion`).
RFC-2026-024 governs what that means: my acceptance is not a role's signature. **Acceptance of this
package as test-verified is the Integration Owner's and Product Owner's act, not mine.** I report what I
measured and what I only read, graded findings with file:line and remedies, and a stop-the-line verdict.
I approve nothing and I fixed nothing.

**Measured vs read.** Everything in §1–§5 I ran myself. PostgreSQL 17.11 at `/opt/homebrew/bin`,
`initdb --locale=C -A trust -U postgres`, 127.0.0.1:5503, TCP only (`unix_socket_directories=''`),
`LC_ALL=C`, the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean`, `make db-schema-lint`
and `make db-rls-smoke`. A fresh initdb for every round. Node `v24.20.0`, checked before every measured
run. Every drift was appended to `140_audit.sql` from a saved copy, and the file was restored byte for
byte after each round (sha1 `2ac2fc2c592b…`, `cmp` each time, and again at the end; the worktree's copy
was never touched). I only **read**: the CI workflow (to say what CI would do with a drift, §3), the
disposition, blocker 186's text and the handoff. I did not push and no CI ran on my measurements.

## 1. Baseline on this head

| Command | Exit | Result |
|---|---|---|
| `node scripts/run-test-suite.mjs` (worktree) | 0 | **tests 677, pass 677, fail 0** |
| static (`foundation-contract` + `identity-isolation`) | 0 | 378 of 378 |
| `make db-migrate-clean` | 0 | 23 catalog probes, each refusing its self-tests, clean again |
| `make db-schema-lint` | 0 | clean |
| `make db-rls-smoke` | 0 | **1079** isolation cases; authz proofs 6 of 6 |
| `verify-branch-scope.mjs 18f1469 WP-0A-DB-00` | 0 | all 15 changed paths declared |
| `verify-test-coverage-floor`, `scan-repository-secrets`, `validate-work-packages`, `validate-work-package-ownership`, `validate-work-package-role-separation WP-0A-DB-00.json` | 0 each | clean |
| `npm run check:handoff` from `recheck/q0-batch-128` | 75 | the guard refusing a branch no package owns, as designed; not a finding (measure on the branch name) |

The probe digests in plan §7.1 (`a620d5629d5192d7`, `13ad35c1af22ba18`, `42d056bde20ea854`,
`79f1d9721698eb44`, `75f034a2f40a686e`) are the ones my refresh script started from: they reproduce.

## 2. Earlier exploits re-run on this head (mine first, then the 127 re-check set, then A0's new ones)

static = the two static suites with the drift in place; sl = schema-lint; mc = migrate-clean; rs =
rls-smoke.

| Drift | static | sl | mc | rs | Named by |
|---|---|---|---|---|---|
| **ISV** (my Q0-128-F1) function-built definer view in `information_schema` | 0 | 0 | **2** | 0 | guard, "relation information_schema.q0_ideas", in every job |
| **IST** (Q0-128-F1) RLS-less table in `information_schema` | 0 | 0 | **2** | 0 | guard, "relation information_schema.q0_notes" |
| **ISF** (Q0-128-F1) SECURITY DEFINER function in `information_schema` | 0 | 0 | **2** | 0 | guard, "function q0_all_ideas()" |
| R0 `grant postgres to authenticated` | 0 | 0 | **2** | 0 | membership probe, `authenticated -> app_authz, …` |
| R1r TRUNCATE through a granted role | 0 | 0 | **2** | 0 | membership probe, `authenticated -> q0_t` |
| F1r view through a granted role | 1 | 2 | **2** | 0 | membership probe, `authenticated -> q0_r` |
| F1sf function-built view, new schema | 0 | 0 | **2** | 0 | rule 2 `q0api.ideas`; schema probe `unlisted: authenticated USAGE on schema q0api` |
| F1srv recursive view, new schema | 0 | 0 | **2** | 0 | rule 2 `q0api.ideas_rv`; schema probe |
| R3s client table, new schema | 0 | 0 | **2** | 0 | rule 3 `q0x.notes`; schema probe |
| V06b definer function in pgcrypto | 0 | 0 | **2** | 0 | definer rule 3, `app.a1_all_ideas() (extension pgcrypto)` |
| LU1, LU2 U& spellings | **1** | 0 | **2** | 2 (nothing applied) | lexer, 140 line 1019 |
| E2 `E'set…names…'` in a DO body | **1** | 0 | **2** | 2 (nothing applied) | lexer, 140 line 1020 |
| DP5 notifications policy widened | 0 | 0 | **2** | **2** | permissive policy probe; the 128 rls case |
| NW narrowing `OR true` | 0 | 0 | **2** | 0 | pinned policy probe |
| A0 X1b, X5 (`information_schema`) | 0 | 0 | **2** | 0 | guard |
| A0 X2c (computed switch, `pg_c0api`, USAGE) | 0 | 0 | **2** | 0 | rule 2 `pg_c0api.ideas`; schema probe |
| A0 X2bc (computed switch, view in `pg_catalog`) | 0 | 0 | **2** | 0 | guard, "relation pg_catalog.c0_ideas" |
| A0 X4 CREATE on the database | 0 | 0 | **2** | 0 | schema probe, `unlisted: authenticated CREATE on database` |
| A0 ctl (new schema, no client grant) | 0 | 0 | **0** | 0 | not over-refused |

**Every exploit I, C0 and A1 raised on 127 and 128 is now refused by at least one layer, by name.** My
three `information_schema` drifts (Q0-128-F1) are closed. A0's own verdicts in plan §7.3 reproduce.

## 3. Mutations: each new rule weakened in code (digests refreshed) + a later-file drift

Two fresh mutations per new rule, mine, distinct from A0's MG (which reverted every guard arm at once).
After each code mutation I recomputed the probe digests exactly as `foundation-contract.test.mjs` does and
wrote them back, so the digest pin is not what catches it. **CI** is read, not measured: `ci.yml` runs
`npm run check` (the full suite, so static), then `make db-migrate-clean`, `db-schema-lint`,
`db-rls-smoke`, so a drift fails CI exactly when one of those four columns is non-zero. The CI
**negative control** step only switches RLS off table by table and demands a matching case. It reads no
drift, so it adds nothing to any row below.

| Id | Rule weakened (in code) | Paired drift (in 140) | static | mc | rs | CI | Caught by |
|---|---|---|---|---|---|---|---|
| U1 | rule 2 reads `userObject('c.relnamespace')` (the schema's OID, not the object's) | Q-PTn: view in `pg_toast` by computed switch, SELECT to authenticated, **no** USAGE | **1** | 0 | 0 | fail | **static only** (rule 2 regex pin). Temp self-tests still pass: `pg_temp_N` is ≥ 16384 too |
| U1′ | same | Q-PT: as Q-PTn **with** USAGE on `pg_toast` | **1** | **2** | 0 | fail | static; schema probe `unlisted: authenticated USAGE on schema pg_toast` |
| U2 | `userObject` keeps its OID arm only for `^pg_temp` schemas | A0 X2s: RLS-less table in `pg_c0api` by computed switch, no USAGE | **1** | 0 | 0 | fail | **static only** (the `userObject` equality pin) |
| U2′ | same | A0 X2c: view in `pg_c0api`, **with** USAGE | **1** | **2** | 0 | fail | static; schema probe `unlisted: authenticated USAGE on schema pg_c0api` |
| D1 | definer rule 1 arm reads `n.oid >= 16384` (the schema's OID) | ISF | **1** | **2** | 0 | fail | static; guard "function q0_all_ideas()" |
| D2 | policy-helper arm `p.oid < 0` | Q-PH: a helper in `information_schema` returning true, a new permissive SELECT policy calling it | **1** | **2** | **2** | fail | static; guard; 2 rls cases |
| G1 | guard relation arm reads namespaces `< 12000` (pg_catalog only) | IST | **1** | **2** | 0 | fail | static; rule 3 `information_schema.q0_notes` (the OID arm); guard's own self-test "refused without naming relation information_schema.probe_is_v" |
| G2 | guard function arm reads namespaces `< 12000` | ISF | **1** | **2** | 0 | fail | static; definer rule 1 `information_schema.q0_all_ideas() [not a pinned SECURITY DEFINER function]` (the OID arm); guard self-test |
| S1 | schema probe's database arm skips `authenticated` | A0 X4 | **1** | **2** | 0 | fail | static; "as built: missing: authenticated TEMPORARY on database"; self-test "refused without naming unlisted: authenticated CREATE on database" |
| S2 | schema probe skips `^pg_toast` | Q-PT | **1** | **2** | 0 | fail | static; rule 2 `pg_toast.q0_ideas` |
| L1 | lexer reads the switch only in its `= ` form | Q-L: `set_config('allow_system_table_mods', 'on', true)`, view in `pg_catalog` to authenticated | **1** | **2** | 0 | fail | static (lexer shapes); guard "relation pg_catalog.q0_ideas" |
| L2 | lexer arm can never match | A0 X2 (`set allow_system_table_mods = on`) | **1** | **2** | 0 | fail | static; rule 2 `pg_c0api.ideas`; schema probe |
| MP5 | the notifications pin widened with the policy | DP5 | 0 | 0 | **2** | fail | the 128 rls case alone (§4) |

Verdict: every new rule is pinned structurally in `foundation-contract.test.mjs` (static fails on every
code mutation even with digests refreshed). For **ten of the twelve** pairs a second, independent layer
(migrate-clean) also refuses. The two exceptions are U1 and U2 with an **unreachable** object (no client
USAGE on the schema): there the static pin is the only layer for the OID arm's own code (Q0-128R-F2).
Every **reachable** variant (U1′, U2′) is refused at migrate-clean by the schema probe. Q-PTn on the
unmutated head is refused by rule 2 alone (`pg_toast.q0_ideas`): the guard leaves `pg_toast` out by
design, so the OID arm of rule 2 is that object's only reader.

## 4. The rls-smoke case fails for the right reason

The review round added no rls case; the one under test is batch 128's
`owner-a-cannot-mark-a-teammates-notification-read-by-a-bare-update`.

- **DP5 alone** (policy widened in 140): mc 2 (permissive policy probe, "missing or changed:
  app.notifications.notifications_update_own_read_state"), rs 2: 1 of 1079, that case.
- **MP5 + DP5** (pin and policy widened together, digests refreshed): static 0, mc 0, **rs 2**, 1 of 1079,
  that case, with "the write must affect no row: 1 row(s) were visible". That is the right half, on the
  right row. The case is the sole backstop in this scenario, and it catches.
- **D2 + Q-PH** also fails 2 rls cases: a permissive policy whose helper returns true widens reads, which
  the isolation suite sees independently of the catalog rules.

## 5. Breaking it: what still passes every layer

### Q0-128R-F1: an object initdb made, **changed in place**, keeps its OID below 16384 (MEDIUM, latent)

The review round's premise, as written at `scripts/db/run.mjs:455` and README rule 13
(`db/foundation/README.md:475`), is that "everything initdb made is below it, everything a migration or a
drift makes is at or above it". That holds for objects a migration **creates**. It does not hold for
initdb objects a migration **redefines or re-grants**. `CREATE OR REPLACE` keeps a function's or a view's
OID, and `GRANT` changes no OID. Every OID arm (`userObject` at `run.mjs:467`; definer rules at `:754`,
`:773`; the policy helper at `:821`) and the guard (`:1143`–`:1146`) reads only `oid >= 16384`, and the
name filters still leave `pg_catalog` and `information_schema` out below that. So none of them reads an
initdb object changed in place.

**Measured.** Each drift appended to 140 on a fresh cluster:

| Drift | What it does | static | sl | mc | rs |
|---|---|---|---|---|---|
| **Q-IPF** | `create or replace function information_schema._pg_interval_type(oid, integer) returns text … security definer set search_path = ''` with a body aggregating `app.content_ideas` (OID 13701 kept; EXECUTE is PUBLIC's from initdb) | 0 | 0 | **0** | **0** |
| **Q-IPVx** | in a `do $$` block, `execute 'create or replace ' \|\| 'view information_schema.information_schema_catalog_name as …'`: the built-in view gains `workspace_id, topic` from `app.content_ideas` (OID 13709 kept; definer rights; SELECT is PUBLIC's) | 0 | 0 | **0** | **0** |
| Q-IPV | the same with a literal `create or replace view` | 1 | 0 | 0 | 0 |
| **Q-GS** | `grant select on pg_catalog.pg_statistic to authenticated` (the planner's most-common values and histogram bounds of every column) | 0 | 0 | **0** | **0** |

Q-IPV fails static only through the unrelated "no migration creates a view" text rule. The executed
form, Q-IPVx, passes it. Then, after the full migrate with all three drifts in 140 and rls-smoke's
fixtures loaded, I ran in a transaction I rolled back, as `authenticated` with a `sub` in no workspace:
`select count(*) from app.content_ideas` returned **0** (RLS held on the base table), yet

- `information_schema._pg_interval_type(0, 0)` returned both workspaces' ids and topics;
- `information_schema.information_schema_catalog_name` returned 2 rows from **2 workspaces**;
- after `analyze app.content_ideas`, `pg_catalog.pg_statistic` returned both workspaces' `topic` and
  `workspace_id` values.

The same class as Q0-128-F1 and C0 F1, which this round set out to close, reached through
modification rather than creation. **Attack surface on the clean set** (measured): 11 SQL-language initdb
functions in `information_schema` and 50 in `pg_catalog` (each replaceable in place; built-in `internal`
functions are not, since fmgr dispatches them by OID, and I measured `pg_catalog.version()` replaced
still running the C code), and 59 + 70 initdb views a client can SELECT. Only the
`information_schema` cases were exploited. The `pg_catalog` SQL functions are read, not measured.

**Latent, not live.** On the integrated set (shim, every migration, rls-smoke fixtures) I fingerprinted
every object below 16384 in `postgres` against `template1`, which no migration touches: function
security, body, ACL, config and owner; relation ACL, RLS flag, owner and options; every `pg_rewrite`
action; namespace ACLs; column ACLs. That is **3911 rows, identical**. With Q-ALL applied, the same
fingerprint differs in **exactly three rows**, the three drifts. So nothing integrated does this today,
and the comparison is a clean, precise detector.

**Remedy.** (a) A catalog probe, in every job like the guard, comparing that fingerprint of every object
with OID below 16384 against `template1` (the runner already opens connections; template1 is untouched
by the migration set) or against a digest pinned per PostgreSQL major. Measured above: 0 differences
clean, 3 of 3 drifts named. (b) Cheaper partial arms: no `prosecdef` function anywhere below 16384
(initdb has **none**, measured 0); no client privilege on a relation below 16384 beyond what template1
grants. (c) At minimum, correct the sentence at `run.mjs:455` and README rule 13 and record the class
on blocker 186 as an open limit. As written, the record claims more than the code reads.

### Q0-128R-F2: the OID arm's own code is held at migrate-clean only through temporary objects (LOW)

The three client-privilege self-test drifts (`run.mjs:1251`, `:1256`, `:1261`) exercise the OID arm only
with `pg_temp_N` objects. That is the one kind a mutation keeping "OID ≥ 16384 in a temporary schema" or
"schema OID ≥ 16384" (U1, U2) still satisfies. Those mutations pass migrate-clean, and the static
`userObject` / rule-regex pins are the only layer for that code. A0's comment at `:1247`–`:1250` says a
drift "cannot use information_schema or pg_catalog … nor allow_system_table_mods". Measured: a
**computed** switch name passes the lexer (A0's own X2c), so a self-test drift could create a `pg_*`
schema object. **No reachable leak follows**: a client needs USAGE on the schema, and the schema probe
names it (U1′, U2′). **Remedy:** add one self-test object in a non-temporary `pg_*` schema made by the
computed switch (or in `pg_toast`), or state the static-only layer beside the arm, as the round did for
the escape rule (Q0-128-F2).

### Q0-128R-F3: the database privileges read only the current database (INFO)

`run.mjs:553` reads `has_database_privilege(…, current_database(), …)`. Q-T1
(`grant create on database template1 to authenticated`) passes every layer. No tenant data lives in
another database on this instance, and a new database does not inherit its template's ACL, so this
records scope only. Remedy, if wanted: read `pg_database` whole, as the schema probe now reads
`pg_namespace` whole.

### Confirmed, not findings

- **C0 F3** (`alter role authenticated bypassrls`) and **A1 N1** (`pg_default_acl`) remain owed on
  blocker 186, as plan §7.4 says. I did not re-measure X6.
- **Q-PT / Q-PTn**: a view in `pg_toast`, the guard's one excluded initdb namespace, is refused by rule 2's
  OID arm (and by the schema probe with USAGE). With either U-mutation and no USAGE it is static-only
  (F2 above).
- A side effect worth knowing, not a defect: when the database already holds an object a self-test's
  **earlier** rule names, the later self-test reports "its self-test after drift 3 failed" (Q-PT, F1sf).
  The run still fails, by name.

## 6. Stop-the-line verdict, and what blocks the merge

- **No stop-the-line.** I found no live tenant leak, secret, duplicated side effect, migration divergence,
  irreversible deletion or contract mismatch on the integrated set. Q0-128R-F1's exploits need a
  migration to redefine or re-grant an initdb object, and I measured that no integrated migration does
  (3911 rows identical to template1). 677 of 677 tests, 1079 rls cases, 140 restored byte for byte.
- **Does not block the merge on test grounds**, on the same footing as Q0-128-F1 at `b8435fa`: latent,
  defence in depth, nothing reachable on the clean set. But Q0-128R-F1 shows the round's stated invariant
  ("everything a migration makes is at or above 16384") is **not what the code guarantees**. I recommend
  that before the merge the sentence at `run.mjs:455` / README rule 13 be corrected, or the class at least
  recorded on blocker 186 as an open limit, so the record does not overclaim. Whether that is a condition
  of the merge is the Owner's and Integration Owner's call, not mine.
- **Process items, outside my role, read only:** the C0 and A1 re-checks of this round, Integration Owner
  (R0) evidence (blocker: none has ever been written for this package) and a green required CI run on
  `0646f32` are owed before the merge under RFC-2026-002 / the disposition's §4 bar. This file supplies
  the Tester's re-check only.

## 7. Limits of this review

- One engine (PostgreSQL 17.11, Homebrew) on the CI shim. The platform's managed schemas,
  `authenticator`, and whether a platform migration role can `CREATE OR REPLACE` in `information_schema`
  are not modelled here. The migration owner on the shim is a superuser.
- The CI column is derived from `ci.yml`, not from a CI run. I did not push.
- Mutations were applied to saved copies in my private dir and restored after every round (`save.sh check`
  ok for `140_audit.sql`, `run.mjs`, `psql-driver.mjs`, `foundation-contract.test.mjs`,
  `isolation-cases.mjs`). The cluster on 5503 was stopped and its data directory removed at the end.
- I am the Author's subagent (RFC-2026-024). Treat §5 as findings for an independent reader to weigh,
  not as a cleared bill.

Private artefacts, not in the repository, in
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/q0-128r2/`:
`drifts/` (mine: `Q-IPF`, `Q-IPV`, `Q-IPVx`, `Q-GS`, `Q-ALL`, `Q-PT`, `Q-PTn`, `Q-PH`, `Q-L`, `Q-T1`;
earlier ones copied), `qmut2.mjs` (U1, U2, D1, D2, G1, G2, S1, S2, L1, L2, MP5), `refresh.mjs`,
`fp.sql` with `fp-*.txt`, `leak.sql`, and `logs/` (`new.log`, `re1.log`, `re2.log`, `mut.log`,
`leak.out`, per-round logs).
