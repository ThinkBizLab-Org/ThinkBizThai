# A1 security re-check: the owed-tooling batch's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-owed-tooling` (PR #176, Draft, open, not merged), head
  `a722c1c` (`a722c1c37e4918715275e5e0581e9c2904c10b81`) over code `84e10f7`, base `5558b26` (main). Previous
  reviewed head `af394fa`. Author `/claude/a0_atlas`. A NARROW re-check of the review-round corrections.
- **Checked out as:** local branch `recheck/a1-batch-owed-tooling` at `a722c1c`, in this run's own worktree. For
  branch scope, `check:handoff` and `verify` I checked the branch NAME out in the same worktree
  (`git checkout --ignore-other-worktrees`; it is also checked out, at the same `a722c1c`, in two other worktrees,
  and I made no commit on it); `git rev-parse --abbrev-ref HEAD` printed the name; then I returned to
  `recheck/a1-batch-owed-tooling`, where this file is committed.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, and the same vendor and
model family as the Author. Under RFC-2026-024 that is the stated independence limit of this role run. Accepting
this re-check as the A1 role's signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; my own review `a1-batch-owed-tooling-security-review-2026-10-03.md` first;
the plan's "Review round" section and §5-§8; the commit messages of `84e10f7` and `a722c1c`;
`git diff af394fa..84e10f7` of `scripts/db/run.mjs` and `scripts/db/psql-driver.mjs` in full; the new test code
for the do-block allowlist (`test-kits/db/foundation-contract.test.mjs:3440-3505`) and the tripwire
(`:4003-4030`, `:4350-4424`); the handoff's known limitations and reviewer instructions (by grep). PR #176 with
`gh`: Draft, OPEN, head `a722c1c`, `bootstrap` check **SUCCESS** (A0 reported it IN_PROGRESS; it has since
completed).

**Measured.** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`, `node -v` printed by every round script and
before every run; the PATH Node 26 was not used). PostgreSQL 17.11 from `/opt/homebrew/bin`, port **5501** on
`127.0.0.1` only, `-c unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the shim
first, a fresh `initdb` every round. Every drift was APPENDED to `db/foundation/migrations/140_audit.sql` and
restored byte for byte (sha256 `2ac596bb950e8dfb...` checked before and after by the round script, every round).
Private directory `a1-owed-toolingr2/` in the run's scratchpad. No other port was touched; at the end
`lsof -iTCP:5501 -sTCP:LISTEN` exit 1 and no data directory remains.

| # | Command | Exit | Result |
|---|---|---|---|
| V1 | `node scripts/verify-branch-scope.mjs 5558b26 WP-0A-DB-00` (branch name, `a722c1c`) | 0 | "all 20 changed path(s) are declared, and every amendment explains one" |
| V2 | `npm run check:handoff` (branch name) | 0 | "describes the branch: nothing substantive after its cited head" |
| V3 | `npm run verify` (branch name) | 0 | "clean: exit 0 — tests 684, pass 684, fail 0"; tree clean after |
| F0 | fresh cluster, `make db-migrate-clean`, `make db-rls-smoke` | 0, 0 | 30 probes; pinned trigger probe "... and every internal trigger there is one of its table's foreign key checks (self-test: refused each of its 3 drifts ...)"; 1087 cases; 360 internal of 411 triggers on app/private tables (A0's 360: TRUE) |
| D1-D6 | live drifts (§2) | see §2 | |
| R1 | `db-migrate-clean` and `db-rls-smoke` with six crafted `DB_TEST_URL`s (§3.4) | 2 each | only the printed text is at issue |
| S1 | `psqlLex` on 33 shapes, `redactConnection` on 20 URLs (`lex.mjs`, importing the branch's module) | -- | §3.3, §3.4 |
| S2 | `doBlockShapeProblems`, extracted from the test file at `a722c1c`, on drifts written into 170's raw text before its `--` strip, as the test reads it (`doblock.mjs`) | -- | §3.1 |
| S3 | `sqlWithoutComments` and the seven tripwire patterns, extracted from the test file (`trip.mjs`) | -- | §3.2 |
| C1 | `open_blockers` diff `af394fa` -> `a722c1c` (`blockers.mjs`) | -- | 196 -> 196; only [185], [191]-[195] changed, each its earlier text plus an append starting "THE OWED-TOOLING BATCH'S REVIEW ROUND" |
| C2 | the three cherry-picks | -- | `bf984f9` is byte-identical to my `c35e0a5` (diff 0 lines); each of `571980a`, `bf984f9`, `a071703` carries `(cherry picked from commit ...)` of the source named in the plan |

## 2. Live drifts (each a fresh cluster, appended to 140, restored)

| Drift | What it tries | migrate-clean | rls-smoke | Verdict |
|---|---|---|---|---|
| D1 | my A1-OT-1 again: a `when`-guarded BEFORE UPDATE trigger on `app.workspaces`, then `update pg_catalog.pg_trigger set tgisinternal = true` | **2** | -- | **held**, by name: "internal trigger(s) ... not its foreign key checks: app.workspaces.a1r2_hidden (private.refuse_mutation)" |
| D2 | `delete from pg_catalog.pg_trigger` the `RI_FKey_check_ins` trigger of `app.jobs` | **0** | **0** (1087) | **passes every layer**: `jobs_workspace_id_fkey` left with 0 insert-check triggers (read after): A1-RC-4 |
| D3 | `update pg_catalog.pg_trigger set tgenabled = 'D'` on that FK trigger | **2** | -- | held by the trigger probe: "trigger(s) not enabled: app.jobs.RI_ConstraintTrigger_c_16855 (tgenabled D, internal)" |
| D4 | `create or replace function pg_catalog."RI_FKey_check_ins"() ... language plpgsql` (keep the name the new rule trusts, change the body) | **2** | -- | held by the system object fingerprint probe: "function pg_catalog.RI_FKey_check_ins() [changed]" |
| D5 | three COPY spellings: `copy (select ...) to $$<private dir>/r2_dollar_marker$$;`, `copy "a1 r2" to '<file>'` (a temp table whose quoted name has a space), `copy (select 1 where 'a;' <> '') to '<file>'` | **0** | **0** (1087) | **all three host files written**, every layer green: A1-RC-1 |
| D6 | `create function pg_temp.a1_lx(oid, text) returns integer language internal strict as 'be_lo_export'`, a large object, then `pg_temp.a1_lx(...)`; and `... language internal as 'pg_read_file_all'` reading `postgresql.conf` | **0** | **0** (1087) | **host file written** ("a1 r2 alias") and the server config read, every layer green: A1-RC-2 |

Each marker file was removed after it was read.

## 3. Trying to defeat each new rule

### 3.1 The do-block allowlist (A1-OT-2; `foundation-contract.test.mjs:3440`, `:3461-3491`)

The four spellings I reported are refused and pinned (`"set_config"(`, `pg_catalog."set_config"(`,
`set_config/**/(`, `from "app"."workspaces"`, `from/**/app/**/./**/jobs`): **A1-OT-2's spellings are closed**,
and the JOIN-only and relation-only drifts each draw exactly one problem. A `--` comment between a name and its
`(` is refused (the strip at :3440 leaves `set_config\n(`). But the literal blanking at :3461 knows single quotes
only, and the `--` strip at :3440 runs over the raw text before it, so a quote can be re-aligned:

```
select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where $x$'$x$ <> set_config($z$role$z$, $z$app_worker$z$, false) or $x$'$x$ is null;
select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where 'a--' <> set_config('role', 'app_worker', false) or a.attname = 'b';
```

Written into 170's do-block, both return **no problem** (S2), and on PostgreSQL 17.11 both statements, inside a
`do $$ declare offending text; begin ... end $$;`, executed their `set_config` (measured with a custom setting:
both read back `ran`). (An `E'\''` re-alignment also returns no problem, but psqlLex refuses an `E''` spelling in a
fed source.) 170's body contains no `$` at all (counted) and its `--` comments start their lines, so the remedy
is cheap. **A1-RC-3.**

### 3.2 The widened tripwire (A1-OT-3; `:4010-4030`, `:4413-4423`)

My three spellings are closed and pinned: a comment between `on` and the name (also for the older ALTER and
POLICY patterns), CREATE RULE, and a rename onto either name. `sqlWithoutComments` reads single-quoted literals and
quoted identifiers but not dollar quotes, so `select $q$/*$q$;` newline `grant insert on app.audit_logs to
authenticated;` newline `select $q$*/$q$;` hides the grant (S3; the `$q$--$q$` form predates this round, since the
old strip was a bare `--` regex). Also not read, and outside the pinned spellings: `alter schema app rename`,
`alter table public.audit_logs set schema app`, `alter default privileges`, TRUNCATE, `create publication`. The
limit is now worded "any spelling not pinned here are not read", which covers all of these, and the live probes
(pinned grant, trigger, rewrite rule, closed table list) hold the catalog. **A1-RC-I1** (INFO).

### 3.3 COPY to a server file and the server-file calls (C0-OT-2, Q0-OT-3; `psql-driver.mjs:463`, `:467`, `:565-570`)

Refused (S1): a plain table, a column list, a parenthesised query, `binary`, a nested comment, `--` and newlines
between words, inside an EXECUTE literal, `\copy` (twice); `lo_import`, `pg_catalog."lo_import" /*x*/ (`, upper case,
a call inside an SQL function body. Admitted, as intended: `to stdout`, `from stdin`, a GRANT, REVOKE or COMMENT
ON FUNCTION naming one. Not refused, and each **measured to write a file on the database host with every layer
green** (D5, D6):

- a **dollar-quoted file name** (`to $$...$$`, `to $p$...$p$`): the rule needs `'`, `E'` or `U&'` after TO/FROM,
  and a dollar-quoted constant is a string literal to COPY;
- a table name the `[\w."$]+` class does not read: a **quoted name with a space**, or a non-ASCII name;
- a **`;` inside a literal** of the parenthesised query (`[^;]*?`);
- a **`language internal` alias** of the C function behind a listed name (`be_lo_export`, `pg_read_file_all`,
  `be_lo_import`, `pg_ls_dir_1arg`, ...): the call is by a name of the author's choosing, written statically, not
  "computed at run time" (handoff known limitation, line 205).

None is computed at run time, so the stated limit does not cover them; together they reopen C0-OT-2 and Q0-OT-3
by spelling. No migration, script or test source uses COPY to a file, `language internal` or `language c`
(grep), so refusing more is free. **A1-RC-1, A1-RC-2.** Also not refused and outside the rule's list (noted,
not graded): `alter system` (writes `postgresql.auto.conf`), `create tablespace ... location`.

### 3.4 `redactConnection` (A1-OT-4; `psql-driver.mjs:80-135`)

Measured through **both real tools** (R1, each exit 2): an encoded user (`a1sec%72etuser`) and database
(`a1sec%72etdb`), a two-host list, `?host=a1-tail#x.invalid`, `#a1frag?host=a1-frag.invalid` and a zone-id IPv6
host each print `[redacted]` for the user, database, host and port. Statically (S1) also: a `#` with no `?` (the
database `postgres#...` is redacted whole), an encoded password, an encoded query KEY, `%2541` (decoded once, as
libpq does), an undecodable `%ZZ`, `%3F` in the database, an upper-case scheme, a socket-directory `host=`.
**A1-OT-4 is closed.** One residue: for `[fe80::1%25a1zone]` psql also prints the resolved address in
parentheses, `"[redacted]" (fe80::1)` -- the host without its zone, which is not a part redaction reads.
**A1-RC-I2** (INFO). A `key=value` conninfo is not parsed (it was not before; the tools are given URLs).

### 3.5 The internal-trigger rule (A1-OT-1; `run.mjs:1247-1268`)

Held where tried: a hidden trigger (D1), a disabled internal trigger (D3, the older probe), and an RI function
replaced in place under the name the rule trusts (D4, the fingerprint probe). The rule reads one direction --
every internal trigger is an FK check -- and not the other, that every FK constraint still has its checks:
deleting an RI trigger row passes (D2), leaving `app.jobs.workspace_id` unchecked on INSERT. Pre-existing and not
claimed by the rule's text; the mirror of A1-OT-1. **A1-RC-4.** A trigger on a child or partition outside app and
private (my A1-OT-I2) is unchanged and stays a stated limit.

### 3.6 Schema owner and role attributes (rules 7, 8)

Not changed in this round (`git diff af394fa..84e10f7 -- scripts/db/run.mjs` touches only the trigger probe and
its self-test); my earlier L6 (PUBLIC USAGE/CREATE refused by name) stands. Not re-measured.

## 4. Findings

| ID | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| A1-RC-1 | LOW | `scripts/db/psql-driver.mjs:463` | `COPY_SERVER_FILE` reads COPY to a quoted literal only, and a table name of `[\w."$]+` and a query without `;`: a dollar-quoted file name, a quoted table name with a space and a `;` in the query's literal each wrote a host file with migrate-clean 0 and rls-smoke 0 (1087) (D5). C0-OT-2 reopened by spelling; the commit message, plan row and handoff ("COPY to a server file ... refused") are stronger than the rule. | Invert it to an allowlist: refuse every COPY in a fed source whose word after TO/FROM is not `stdin` or `stdout` (no source has one); pin the three spellings. |
| A1-RC-2 | LOW | `scripts/db/psql-driver.mjs:464-467`; handoff known limitation (line 205) | `SERVER_FILE_CALL` is a list of names; a `create function ... language internal as 'be_lo_export'` (or `'pg_read_file_all'`) gives the same C function a new name, written statically: a host file was written and `postgresql.conf` read, every layer green (D6). Not "computed at run time". | Refuse `language internal` and `language c` in fed sources (no source uses either), and/or a catalog rule: no function made after initdb has `prolang` internal or c; pin the drift. |
| A1-RC-3 | LOW | `test-kits/db/foundation-contract.test.mjs:3440`, `:3461` | The do-block allowlist's literal blanking ignores dollar quotes, and the `--` strip runs before it, so `$x$'$x$` or `'a--'` re-aligns the quotes and hides a `set_config` call; both return no problem and both executed `set_config` on PostgreSQL 17.11. A1-OT-2's class by another spelling (170 is integrated; this is the static backstop). | Refuse any `$` in the body (170's has none), and strip `--` comments after blanking literals (or tokenize once); pin both spellings. |
| A1-RC-4 | LOW | `scripts/db/run.mjs:1255-1265` | The new rule holds every internal trigger to an FK check, not every FK to its checks: deleting `app.jobs`'s `RI_FKey_check_ins` row from `pg_catalog.pg_trigger` passes migrate-clean 0 and rls-smoke 0 (1087), leaving `jobs_workspace_id_fkey` unchecked on INSERT (D2). Pre-existing; not newly opened; the mirror of A1-OT-1. | Add the converse: every FK constraint on app and private has exactly its four RI triggers (check_ins and check_upd on the referencing table, noaction_del and noaction_upd on the referenced one); a drift deleting one. |
| A1-RC-I1 | INFO | `test-kits/db/foundation-contract.test.mjs:4010-4030` | `sqlWithoutComments` does not read dollar quotes: `$q$/*$q$ ... $q$*/$q$` hides a GRANT on an audit table from every tripwire pattern. Covered by the restated limit; the live probes hold it. | Read dollar-quoted bodies as literals in the stripper; optionally pin the spelling. |
| A1-RC-I2 | INFO | `scripts/db/psql-driver.mjs:119-131` | For a zone-id IPv6 host psql prints `(fe80::1)` after the redacted host: the address without its zone is not a part redaction reads (R1). | Also add the bracketed host's text before `%` (as written and decoded). |

No finding is MEDIUM or above. A1-RC-1, -2 and -3 are the round's own rules weaker than worded, each reachable
only by a fed source the migration owner (a superuser) applies; A1-RC-4 and the INFOs predate the round.

**My earlier findings:** A1-OT-1 **closed** (D1); A1-OT-2 **closed** for its spellings, A1-RC-3 by another;
A1-OT-3 **closed** for its spellings, with the limit now stated truly (A1-RC-I1 is inside it); A1-OT-4 **closed**
(R1; A1-RC-I2 is a residue); A1-OT-I1 and -I2 stated as limits on [185] and [195] as said; A1-OT-I3 **closed**
(disposition §4 items 5-6 qualified, with a note saying the qualification was added in the review round).
Note that this one edits the disposition's earlier text in place rather than appending; the note discloses it.

## 5. Are the claims true?

| Claim (commit messages, plan "Review round", disposition, blocker appends, handoff) | Verdict |
|---|---|
| No migration; no grant, policy, role, contract or decision changed | TRUE (no `.sql` in `af394fa..a722c1c`; V1) |
| Cherry-picks `-x` of the three reviews, read in full | TRUE as to the commits (C2); the reading is A0's |
| The do-block refuses `"` and `/*`; five spellings and the JOIN-only / relation-only drifts | TRUE (S2 baseline and pinned cases); "every call however it is spelled" (test comment, :3459) OVERSTATED: A1-RC-3 |
| The pinned trigger probe's third rule; 360 internal triggers on the clean set; digest `6c73217f9ce9e45f` -> `8412a302b7f190a7`; A1's drift migrate-clean 2 by name | TRUE (F0, D1; the digest is asserted at :2815) |
| psqlLex refuses COPY to/from a server file and the server-file function calls; "no file written" | TRUE for the spellings pinned; OVERSTATED as a closure: A1-RC-1, A1-RC-2 (files written, D5, D6) |
| Quotes said by exactly one blocker; the export buckets and the eleven classes | Read, not re-measured (C0's and Q0's to judge) |
| `sqlWithoutComments`, CREATE RULE and rename patterns; limit restated | TRUE (S3); A1-RC-I1 is inside the restated limit |
| `redactConnection` reads the raw authority and path, as written and decoded; split on `&` only | TRUE (R1, S1) |
| open_blockers[185], [191]-[195] appended, nothing rewritten, count 196 | TRUE (C1) |
| Assertion floor 1000 -> 1014; integrity manifest regenerated | TRUE as to the floor (`scripts/test-suite-contract.mjs`); V3 passes with it |
| `verify`, `check:handoff`, branch scope green on the branch name; 684 of 684 | TRUE (V1-V3) |
| PR Draft/OPEN, not merged; CI IN_PROGRESS at report | TRUE then; now `bootstrap` SUCCESS on `a722c1c` |
| `84e10f7` and `a722c1c` through commit-when-clean, exit 0 | Read, not re-measured |

## 6. Stop-the-line and merge

**Stop-the-line: no.** The round adds assertions and tooling only; nothing it adds leaks a secret, crosses a
tenant, loses a job or diverges a migration. D5 and D6 write files on the database host, but only from a fed
source applied by the superuser migration owner on a private throwaway cluster, exactly as before this round
(the round narrowed, not widened, what passes).

**Does anything here block the merge? No.** All findings are LOW or INFO. A1-RC-1 and A1-RC-2 are the two I would
close first, since each leaves C0-OT-2 / Q0-OT-3 open by a static spelling and the records word them closed; if
they are not closed before merge, the handoff's limitation and open_blockers[185] should say so (append-only),
with an owner.

## 7. Limits

- Same vendor and model family as the Author (§0).
- S2 and S3 ran the test's own functions extracted from the file at `a722c1c`, not by editing the test or 170;
  170 is integrated and was not touched.
- The export-label, citation and ERD-line items, and `identity-isolation`'s `CREATE_VIEW` change, were read, not
  re-measured: they are contract and test findings (C0, Q0).
- I did not re-run A0's mutations, and ran rls-smoke once per round, only where migrate-clean passed.
- Rules 7 and 8 were not re-measured (unchanged in this round).
- I fixed nothing, approved nothing and answered no Q-id. I did not push. I made no commit on the branch name.
