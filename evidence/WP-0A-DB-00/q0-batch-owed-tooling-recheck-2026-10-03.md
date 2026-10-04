# Q0 independent test re-check of the owed-tooling batch's review round (PR #176)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-owed-tooling`, head `a722c1c` (the handoff, alone and last) over the review
round's code `84e10f7`, base `5558b26` (main); previous reviewed head `af394fa`. Author `/claude/a0_atlas`.
PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/176>: Draft, OPEN, head `a722c1c`; required check
"bootstrap" run 37188723660 SUCCESS on that head (read with `gh` at the time of writing; the Author reported it
IN_PROGRESS). **Checked out:** my own branch `recheck/q0-batch-owed-tooling`, created at `a722c1c`; the
branch-name checks and every mutation ran in a private clone checked out on the branch NAME
`agent/claude/WP-0A-DB-00-batch-owed-tooling` (the name is held by another worktree), its `origin/HEAD` set to
`main` (`5558b26`). **Date:** 2026-10-04; the file name carries the phase's date, as the batch's plan does.

This record holds findings. It advances no status. It approves nothing, test-verifies nothing on anyone's
behalf, and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is the Integration Owner's act and the Product Owner's act, not mine.

I fixed nothing. Every mutation and drift ran in the private clone and was restored; the harness compared
sha256 before and after each, and every restore matched (`restored byte for byte: true` on all 51 runs).
Private artefacts (not in the repository), in `q0-owed-toolingr2/` in the run's scratchpad: `round.sh`,
`mutate.mjs`, `static.sh`, `branchchecks.sh`, `g2.sh`, `lex.mjs`, `touch.mjs`, `extra-B1.sql`,
`mutations.log` and every round's log.

## 1. Measured vs read

**Measured** (Node `v24.20.0` checked before every measured run; PostgreSQL 17.11 from `/opt/homebrew/bin`;
127.0.0.1:5503 only, TCP only, `-c unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`,
`LC_ALL=C`, the CI shim first, a fresh initdb every round; drifts APPENDED to `140_audit.sql`, or a new
`180_q0_probe.sql` where said, and removed or restored after):

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs 5558b26 WP-0A-DB-00` | clone, branch name | 0 | "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, branch name | 0 | "describes the branch: nothing substantive after its cited head" (first run 91, because the clone's `origin/HEAD` pointed at my worktree's branch; set to `main`, as in the real repository, it is 0) |
| `npm run verify` | clone, branch name | 0 | "clean: exit 0 -- tests 684, pass 684, fail 0" |
| `npm run check` | worktree, `recheck/q0-batch-owed-tooling` | 0 | coverage floor, toolchain, secrets, protocol, 684 of 684 |
| B0: shim, `make db-migrate-clean`, `generate-pinned-grants.mjs --check`, `make db-rls-smoke` twice | clone, `a722c1c` | 0, 0, 0, 0, 0 | pinned trigger probe "refused each of its 3 drifts; clean again after every drift"; post-migrate pass 51 blocks (39 as written, 12 replaced); both lint files match, 66 tables; 1087 isolation cases each run |
| B1: catalog read after a clean migrate | clone | 0 | 360 internal triggers on app/private tables: `RI_FKey_check_ins` 90, `_check_upd` 90, `_noaction_del` 90, `_noaction_upd` 90 -- the plan's "all 360 ... of that kind" holds |
| `g2.sh`: `db-migrate-clean` and `db-rls-smoke` with `postgresql://postgres@%71%30-probe.invalid:5503/...`, a percent-encoded user, a two-host list | clone | 2 each | `could not translate host name "[redacted]"`; the probe words occur 0 times in all six outputs |
| cherry-picks: `git diff 1cc4857:<file> 571980a:<file>` and the A1 and Q0 pairs | worktree | -- | each file byte-identical to its source; each commit adds one file |
| open_blockers at `af394fa` vs `a722c1c` | worktree | -- | count 196 both; only [185], [191]-[195] differ, and each new text starts with the old one byte for byte (append-only); the manifest's other changed key is `ownership` (the rationale slot) |
| `git diff --name-status 5558b26 84e10f7` | worktree | -- | 5 added, 15 modified, 0 deleted -- as a722c1c's message says |

**Read, not measured:** CI's result (`gh`); that `84e10f7` and `a722c1c` went through `commit-when-clean`
with exit 0 (the commits carry no trace of it; my own `verify` and `check` on the same tree are green); the
C0 and A1 re-checks (not mine).

## 2. Mutation table, per layer

"fc" is `node --test test-kits/db/foundation-contract.test.mjs` (80 tests); "ii" is identity-isolation
(305). Code weakenings of a probe had its digest pin recomputed exactly as the test computes it, so the digest
pin alone is not what fails. "Later file" means the rule's input weakened (a migration, the fixture, the map),
the code unchanged.

| Id | Rule or pin | Weakening | static | migrate-clean | rls-smoke | Verdict |
|---|---|---|---|---|---|---|
| S1 | do-block: no `"` | rule removed | fc 1 (its drift) | -- | -- | held |
| S2 | do-block: no `/*` | rule removed | fc 1 | -- | -- | held |
| S3 | do-block: JOIN rule | rule removed | fc 1 ("exactly one rule refuses ... join jobs") | -- | -- | held (was vacuous, Q1d) |
| S4 | do-block: relation rule | rule removed | fc 1 ("exactly one rule refuses ... , app.jobs") | -- | -- | held (was vacuous, Q1c) |
| Q1a, Q1b, Q1e | do-block, later file | `pg_catalog."set_config"(`, `from "app"."workspaces" for update`, `set_config/**/(` in 170's block | fc 1 each ("170's do-block is of the allowed shapes ...") | -- | -- | held (Q1a, Q1b were 0) |
| T1 | trigger rule 3 | `where t.tgisinternal and false`; digest refreshed | fc 1 (the rule's text) | **2** ("its self-test after drift 3") | 0 | held, two layers |
| **T2** | rule 3's side reading | referencing/referenced sides dropped (any of the four RI functions on any FK); digest refreshed | fc 1 (text pin only) | **0** | 0 | **live layer does not hold it** (Q0-OT2-3) |
| **T2d** | the same, with a drift | T2 plus `noaction_del` on workspaces re-pointed at `RI_FKey_check_ins` | -- | **0** | 0 | **as T2** |
| DA | rule 3, later file | A1's hidden `when`-guarded trigger on workspaces marked internal | -- | 2, names `app.workspaces.q0_hidden (private.set_updated_at)` | 0 | held |
| DA2 | rule 3, later file | the side-swap of T2d on the head | -- | 2, names `RI_ConstraintTrigger_a_16488 (pg_catalog.RI_FKey_check_ins)` | 0 | held by the head |
| X1 | `COPY_SERVER_FILE` | its loop in psqlLex removed | fc 1 (`copy app.jobs from '/tmp/x'`) | -- | -- | held |
| X2 | `SERVER_FILE_CALL` | its loop removed | fc 1 (`pg_read_file`) | -- | -- | held |
| **X3** | the function list | cut to the five names the shapes use | **fc 0** | -- | -- | **12 of 17 names unpinned** (Q0-OT2-5) |
| X4 | the `E''`/`U&''` alternative | reduced to `'` | fc 0 | -- | -- | redundant: `lex.mjs` shows the escape-spelling rule refuses both anyway |
| X5 | the FUNCTION look-behind | removed | fc 1 (the GRANT shape; "no shipped drift is unsafe") | -- | -- | held |
| X6 | the parenthesised-query alternative | removed | fc 1 | -- | -- | held |
| DC1 | lexer, later file | `copy (select 'q0r2') to '<private>/copy-r2-plain.txt'` | -- | 2, "140_audit.sql line 1019 ... COPY ... TO/FROM a server file"; **no file** | 2 (empty database) | held |
| **DC2** | lexer, later file | `copy (select 'q0r2') to $$<private>/copy-r2-dollar.txt$$` | -- | **0** | **0** | **every layer green; the file was written** (Q0-OT2-1) |
| **DC3** | lexer, later file | `copy (select ';') to '<private>/copy-r2-semi.txt'` | -- | **0** | **0** | **every layer green; the file was written** (Q0-OT2-1) |
| DC4 | outside the rules | `file_fdw` foreign table with `options (program 'touch <private>/fdw-program-ran.txt')`, selected | -- | 2, but only by the pinned grant probe AFTER apply (`private.q0_ft (relkind f)`) | 0 | **the shell command ran** (Q0-OT2-2) |
| DS | lexer, later file | `select pg_catalog.pg_stat_file('postgresql.conf')` | -- | 2 by line | 2 (empty database) | held |
| E1 | every omitted bucket | narrowed back to `outside-minimum-domains` | fc 1 (M-C2) | -- | -- | held |
| E2 | the same, later file | the fixture: `app.content_items` moved into `internal-job`, package checksum recomputed | fc 1 ("every omitted bucket holds the declared rule ...") | -- | -- | held |
| Q5 | the eleven classes | list cut to three | fc 1 ("the eleven minimum-domain classes, a literal") | -- | -- | held (was 0) |
| C1 | one blocker per quote, retention map | rule removed | fc 1 ("Q0's Q4: the citation moved to the other carrier fails") | -- | -- | held |
| **C2** | one blocker per quote, audit-coverage map | rule removed (fc:4175) | **fc 0** | -- | -- | **vacuous: no drift** (Q0-OT2-4) |
| Q4 | the retention map, later file | F160-04's citation to `open_blockers[91] ("F160-04")` | fc 1 | -- | -- | held (was 0) |
| K1 | `sqlWithoutComments` | block comments no longer stripped | fc 1 (`grant insert on /* x */ ...`) | -- | -- | held |
| K2 | its nesting | nesting removed | fc 1 (the nested trigger spelling) | -- | -- | held |
| K3 | its literal skipping | removed | fc 1 (the equality pin) | -- | -- | held |
| K4, K5 | rewrite rule; rename onto the name | each pattern made unable to match | fc 1, fc 1 | -- | -- | held |
| K6 | tripwire, later file | `180_q0_probe.sql`: `grant insert on /* q0 */ app.audit_logs to authenticated;` | fc 1: the tripwire names "180_q0_probe.sql: a GRANT or REVOKE on an audit table" (plus the generic not-applied snapshot tests) | -- | -- | held |
| **K7** | tripwire, later file | `180_q0_probe.sql`: `select $$--$$; grant insert on app.audit_logs to authenticated;` | fc 1, but **the tripwire test passes**; only the generic snapshot tests fail | **2** (K7live: pinned grant probe) | 0 | tripwire misses; catalog holds (Q0-OT2-7) |
| V1 | `CREATE_VIEW` gap | back to `\s+` | ii 1 (`create /* c */ view`) | -- | -- | held |
| V2 | views, later file | `180_q0_probe.sql`: `create /* q0 */ view public.q0_v as select 1;` | ii 1 ("no migration creates a view") | -- | -- | held |
| G1, G2, G3, G6 | redaction | raw authority removed; decoding removed; split back to `[&#]` (aimed at redaction's own line); the `,` host split removed | fc 1 each, by the case named | -- | -- | held |
| **G4, G5** | redaction | longest-first sort removed (psql-driver.mjs:135); the password `add` removed (:125) | **fc 0, fc 0** | -- | -- | **unpinned** (Q0-OT2-6) |

None of the rules marked held passes vacuously: each turned red from its own weakening at every layer it
claims, and each had a later-file drift that its layer refused. The survivors are the findings below.

## 3. My earlier findings, re-checked

| Finding | Status on `a722c1c` | Measured by |
|---|---|---|
| Q0-OT-1 (quoted names; vacuous JOIN and relation rules) | **closed** | S1-S4, Q1a, Q1b, Q1e |
| Q0-OT-2 (rls-smoke wording) | **closed**: plan row 9, §3, §5, [185] and README now say rls-smoke reads no migration text; DC1 and DS again show its 2 is the empty database | read; DC1, DS |
| Q0-OT-3 (COPY to a server file) | **closed for a single-quoted name and a query with no `;`; open for a dollar-quoted name and a `;` inside the query** | DC1 (held); DC2, DC3 (written) -- Q0-OT2-1 |
| Q0-OT-4 (shared quotes) | **closed for the retention map**; the same rule on the audit-coverage map has no drift | C1, Q4; C2 -- Q0-OT2-4 |
| Q0-OT-5 (the eleven classes) | **closed** | Q5, E1, E2 |
| Q0-OT-6 (`--check` in no target) | recorded as a stated limit on [195], as the remedy allowed | read |
| Q0-OT-7 (redaction halves) | **closed** for the two named parts | G2, G3, g2.sh |
| Q0-OT-8 (tripwire comments) | **closed** for comments | K1, K2, K6, V1, V2; K7 is a different spelling (Q0-OT2-7) |
| Q0-OT-9 | stated limit, restated on [195] | read |
| Q0-OT-10 | **closed**: disposition §4 items 5 and 6 qualified and the edit noted | read |

## 4. Claims checked

- **True, measured:** the cherry-pick map (three single-file commits, byte-identical to their sources); the
  review round's static claims "static 1 (was 0)" for Q1a, Q1c/Q1d's replacement drifts, Q4, Q5, M-C2, the
  stripping, the rule pattern, the view gap, the `#` split, decoding and the raw authority; the new
  trigger rule's digest `8412a302b7f190a7` (fc green with it, red when the rule changes); the trigger probe's
  three drifts and "every one of" the 360 internal triggers; COPY to a single-quoted file and `pg_stat_file`
  refused by line with no file written; the appended blocker texts are append-only, the count stays 196; the
  commit messages' counts (5 added, 15 modified); the handoff cites `84e10f7` and is green on the branch name;
  684 tests; the 1014 floor is met (`npm run check`).
- **Overstated:** "psqlLex refuses ... COPY of a table ... or a parenthesised query TO or FROM a quoted literal"
  (open_blockers[185]'s second append; README; plan "Review round" row C0-OT-2) and "where before every layer
  was green and the server wrote it" read as a closure: a dollar-quoted literal is a quoted literal to
  PostgreSQL and passes, and so does any query containing `;` in a literal (Q0-OT2-1). "Each rule removed fails
  the static suite" for the server-file functions holds for the rule, not for 12 of its 17 names (Q0-OT2-5).
  "Both citation checks now require it ... the rule removed ... fails" holds for the retention-map check only
  (Q0-OT2-4). The trigger rule's "on the referencing side ... on the referenced side" is held by its text pin
  alone (Q0-OT2-3).
- **Not measured:** that `84e10f7`/`a722c1c` were made through `commit-when-clean`; whether 1014 is the exact
  count rather than a floor below it (my F1 run, the floor raised to 1015, failed on the integrity manifest
  before the floor could be read alone).

## 5. Findings

**Q0-OT2-1 -- LOW. The new COPY-to-file rule misses a dollar-quoted file name and a `;` inside the query; both
wrote a host file with every layer green.** `scripts/db/psql-driver.mjs:463` (`COPY_SERVER_FILE`) ends in
`(?:[eE]?'|[uU]&')`, so `to $$/path$$` (a string constant to PostgreSQL) is not read, and its parenthesised
alternative is `\([^;]*?\)`, so `copy (select ';') to '/path'` is not read. Measured DC2 and DC3: migrate-clean
0, rls-smoke 0, and the server wrote `copy-r2-dollar.txt` ("q0r2") and `copy-r2-semi.txt` (";") in my private
directory. The same reach as Q0-OT-3, so the round's closure of C0-OT-2/Q0-OT-3 holds for single-quoted names
only. Reachable only by a reviewed migration on a private cluster. *Remedy:* accept a dollar-quoted literal
(`\$[A-Za-z_]*\$`) as the target; let the query alternative cross a `;` that sits inside a literal (or match
COPY to the end of its statement as the lexer splits it); pin both shapes; reword [185] and the README, or
record the gap on [185] with an owner.

**Q0-OT2-2 -- LOW (outside the round's items; record as owed). A `file_fdw` foreign table's `program` option
ran a server shell command at apply time.** Measured DC4: `create extension file_fdw`, a server, a foreign table
with `options (program 'touch ...')` and a select from it, appended to 140: migrate-clean 2, but only after
apply, by the pinned grant probe naming `private.q0_ft (relkind f)`; the file `fdw-program-ran.txt` existed
afterwards. `file_fdw` is available on this build (B1). This is the same class C0 G1 closed for COPY PROGRAM (a
server-side command run before any refusal) by another spelling. *Remedy:* refuse `create extension` of a
file- or program-reaching extension (`file_fdw`, `adminpack`, `dblink`, ...) or any extension outside an
allowlist in psqlLex before apply; or state it on [185] beside the other computed-word limits, with an owner.

**Q0-OT2-3 -- INFO. Rule 3's referencing/referenced reading is held by its text pin only.** Weakened to "any of
the four RI functions on any FK of the table" with the digest refreshed (T2), migrate-clean stays 0; with a
drift that re-points `app.workspaces`' `RI_FKey_noaction_del` trigger at `RI_FKey_check_ins` -- the delete-side
FK check disabled -- it stays 0 too (T2d), while the head refuses that drift by name (DA2). The text assertion
(fc:3132) holds it statically. *Remedy:* add DA2 as the rule's fourth self-test drift.

**Q0-OT2-4 -- INFO. The audit-coverage map's "said by one blocker only" check has no drift.**
`test-kits/db/foundation-contract.test.mjs:4175` can be removed with every test green (C2); the retention-map
twin (:4904) is held by its drift (C1). *Remedy:* an in-test drift for `sourceProblems` with a quote two
blockers share, or say only the retention check is drift-held.

**Q0-OT2-5 -- INFO. Twelve of the seventeen server-file function names are unpinned.**
`SERVER_FILE_FUNCTIONS` (`psql-driver.mjs:464`) cut to `lo_import`, `lo_export`, `pg_read_file`,
`pg_stat_file`, `pg_ls_dir` leaves fc green (X3). *Remedy:* one shape per exported name (a loop over the
list), so a cut name fails. (The `E''`/`U&''` alternative of `COPY_SERVER_FILE` is also unpinned (X4), but the
escape-spelling rule refuses both spellings anyway; no action needed.)

**Q0-OT2-6 -- INFO. Two parts of the new redaction are unpinned.** The longest-first sort (`psql-driver.mjs:135`)
and the password `add` (`:125`) can each be removed with every test green (G4, G5). *Remedy:* a case where one
part contains another (e.g. user `q0db`, database `q0dbx`), and an encoded password case; or drop them.

**Q0-OT2-7 -- INFO. `sqlWithoutComments` reads `--` inside a dollar-quoted body as a comment.** Measured K7:
`select $$--$$; grant insert on app.audit_logs to authenticated;` in a later migration passes the tripwire test
(the rest of the line is stripped); the generic not-applied snapshot tests fail and the pinned grant probe
refuses it live (K7live, migrate-clean 2). The old `--` stripping had the same gap, and the stated limit ("any
spelling not pinned here") covers it. *Remedy:* skip dollar-quoted bodies as the lexer does, or name this
spelling in the limit.

## 6. Stop-the-line verdict

**No stop-the-line.** The round adds no migration, grant, policy or role; nothing found leaks a secret or a
tenant, duplicates a side effect or diverges a migration. Q0-OT2-1 and Q0-OT2-2 are server-side effects
reachable only by a reviewed migration on a private cluster, of a class the batch is narrowing, not one it
introduced.

**Does anything block the merge?** Nothing I found is a regression, and every rule the round adds turns red at
each layer it claims for the spellings it pins. Q0-OT2-1 is the round's own closure claim (C0-OT-2, Q0-OT-3)
worded stronger than measured; I recommend it be fixed or recorded as owed on open_blockers[185] with the
merge, and Q0-OT2-2 recorded there too. Whether that is a condition is the Integration Owner's and Product
Owner's call. RFC-2026-002's other conditions stand: the C0 and A1 re-checks of this round and Integration
Owner evidence are not mine.

## 7. Limits

- One cluster version (17.11), macOS, my own port; no provisioned instance.
- Static mutations ran one file each (fc or ii); only F1 ran the whole suite, and it was inconclusive (the
  integrity manifest fails first on any edit of a protected file).
- `lex.mjs` and `touch.mjs` evaluate the head's own exported regex or the test's extracted functions; a later
  edit to those lines needs them re-run.
- I did not re-run the Author's M1-M11 or the C0 and A1 drifts beyond those listed; I read the rest from the
  plan.
- The cluster on 5503 was stopped and its data directory removed after every round; nothing else was touched.
  The files the drifts made (`copy-r2-dollar.txt`, `copy-r2-semi.txt`, `fdw-program-ran.txt`) are in my private
  directory only.
