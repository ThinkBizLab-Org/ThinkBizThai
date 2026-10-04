# A0 plan and record: the sql-lexer batch -- one SQL lexer for every static reader

- **Package:** `WP-0A-DB-00`. **Author:** `/claude/a0_atlas` (written by a subagent of that run).
- **Branch:** `agent/claude/WP-0A-DB-00-batch-sql-lexer`, from `main` at `5bde893` (PR #176, the owed-tooling
  batch, merged 2026-10-04T09:07:34Z by A0 at its reviewed head `84ed650`, required check `bootstrap` green on
  that head, run 37190663121, under the Owner's standing delegation; see the disposition).
- **Commits:** `b2193ad` is the code and its packaging (the manifest's branch slot and rationale, the
  branch-identity slot, the floors, the integrity manifest, evidence/VERIFICATION.md, the audit-coverage map's line
  fields, open_blockers[185]); this plan and the disposition are the commit after it; the handoff is last and alone.
- **Status:** written and measured by the Author. Not reviewed, not tested by an independent role, not approved.
  C0, Q0 and A1 role runs follow. The PR is a Draft.
- **The Owner's words:** `ลุยต่อเลย เอาตามแนะนำ` (2026-10-04), answering A0's summary whose item 5 recommended one
  real lexer shared by every static reader over an RFC for PostgreSQL's own parser (a dependency). A0 recommended
  nothing on items 1-4, which stay unanswered. See `product-owner-disposition-2026-10-03-batch-sql-lexer.md`.
- **Inputs:** `scripts/db/psql-driver.mjs` (psqlLex, COPY_SERVER_FILE, SERVER_FILE_CALL, the escape, encoding and
  standard_conforming_strings refusals); every static SQL reader in `test-kits/db/foundation-contract.test.mjs`
  and `tests/db/identity/*.test.mjs` (sqlWithoutComments, the do-block blanker, the view regex, the audit
  tripwire, the migration-text rules) and in `scripts/db/run.mjs`; the "Re-checks" section of
  `a0-batch-owed-tooling-plan-2026-10-03.md`; blocker 186's (open_blockers[185]) last OWED-TOOLING sentence.

**No migration and no dependency.** `scripts/db/sql-lexer.mjs` is Node built-ins only (RFC-2026-001 holds). No
migration file is added or edited, so no number is asked of anyone. **This batch decides nothing beyond the
recommendation the Owner accepted, and approves no RFC.**

## 1. Item -> change -> what proves it

| # | Item | Change | Proof (measured; §3, §4) |
|---|---|---|---|
| 1 | One SQL tokenizer (task item 1) | `scripts/db/sql-lexer.mjs`: `lexSql` returns every token (kind, start, end, line, value) and every place it cannot classify as a refusal; whitespace incl. VT; `--` comments ended by LF or a bare CR (scan.l: `non_newline` is `[^\n\r]`); nested `/* */`; plain, `E''` (decoded), `U&''` and `U&""` (with `UESCAPE`, decoded), `B''`, `X''`, `N''`; continuation across a newline in the state the first segment opened; dollar quotes with tags (another tag inside is body text; a `$` after an identifier character continues it); identifiers folded; quoted identifiers with `""` (zero-length refused); numbers with the 15+ trailing-junk rule; operators cut before `--`/`/*` with the trailing +/- rule; psql meta-commands and variable references in psql mode. `splitStatements` splits where psql does; `walkLevels` reads every literal's and dollar body's text again as SQL to depth 8 (past it, refused); `canonical`, `canonicalStatements`, `stripComments`, `blankLiterals` and the `SQL_LINE_COMMENTS` / `SQL_COMMENTS` / `SQL_LITERALS` replacers are the readers' API | the golden test's tokenization table (13 inputs, kinds and values, text round-trips), statement split, and 15 fail-closed inputs (each a lexer refusal and a psqlLex finding); mutation M3 (a `--` comment ended at LF only) red |
| 2 | psqlLex's refusals (task item 2) | psqlLex rewritten on the lexer. Top level: every lexer refusal, every meta-command, the odd-backslash quote in a plain literal, `BEGIN ATOMIC`, a COPY statement whose target cannot be read. Raw mention, kept as before: standard_conforming_strings, client_encoding, allow_system_table_mods. Every level, by token: `E''`/`U&''`/`U&""`; SET [SESSION/LOCAL] NAMES; the COPY rule; the server-file call rule; LANGUAGE internal/c; CREATE EXTENSION outside `APPROVED_EXTENSIONS`; foreign table / data wrapper / server / user mapping / IMPORT FOREIGN SCHEMA. `SET_NAMES`, `COPY_PROGRAM`, `COPY_SERVER_FILE`, `SERVER_FILE_CALL` and `escapeSpellings` are removed | the existing 79 lexer shapes: 76 unchanged, three gain a fail-closed finding (an unterminated literal 1 -> 2; `1.e'` junk 3 -> 4; `E'set\x20names ...'` now decoded and its `set names` read, 1 -> 2), each commented in place |
| 3 | COPY server-file detection (C0-OTR-2, A1-RC-1, Q0-OT2-1) | after COPY [BINARY], a parenthesised query (skipped by token depth, whatever it holds) or a name with an optional column list, then TO/FROM, then a target: `STDIN`/`STDOUT` admitted, `PROGRAM` refused, ANY other token refused as a server file -- plain, `E''`, `U&''`, dollar-quoted or an identifier | drifts D1, D2 (§3): old psqlLex 0 findings, migrate-clean 2, no file written; golden: `$p$...$p$`, `(select ';')`, `U&'...'`, `$$...$$`, an identifier target, PROGRAM inside a dollar body, a bare `copy;`; M1 (targets read as single-quoted only) red |
| 4 | Server-file functions by identifier token; `language internal` (A1-RC-2, Q0-OT2-5) | an identifier or quoted identifier whose name is in `SERVER_FILE_FUNCTIONS`, then `(`, unless FUNCTION precedes it; the list adds the 16 internal symbols `pg_proc.prosrc` names for those functions on PostgreSQL 17.11 (`be_lo_export`, `pg_read_file_all`, ...); `LANGUAGE internal` and `LANGUAGE c`, by keyword or literal, refused in every fed source | drift D3 (`create function public.lx_read(text) ... language internal ... as 'pg_read_file_all'`): old 0, migrate-clean 2; golden: all 33 names called refused, each named after FUNCTION admitted; M2 (no language rule), M6 (unquoted names only) red |
| 5 | The 170 do-block allowlist and blanker (C0-OTR-1, A1-RC-3) | its literals blanked by `SQL_LITERALS` and comments stripped by `SQL_LINE_COMMENTS` (the lexer); a dollar-quoted literal in the block refused outright, as a quoted name and a block comment are | two drifts: `$q$'$q$ = '' and pg_catalog.set_config(...)` and `string_agg(..., 'a--') ... set_config(...)`, each refused by name; M8 (no dollar rule) and M9 (the blanker back to the old regex) red |
| 6 | sqlWithoutComments and its users: the audit tripwire, the view regex, the migration-text rules (A1-RC-I1, Q0-OT2-7) | `sqlWithoutComments` = `stripComments` (lexer); the four tripwire scans and 140's policy scan read `auditScanText` = every statement at every level in canonical form, each with its own `;`; the three view scans read `viewScanText` likewise; every `.replace(/--[^\n]*/g, '')` (23 in foundation-contract, 54 in identity-isolation, 5 in run.mjs) is `.replace(SQL_LINE_COMMENTS, '')`, and every `'...'` blanker (3 in foundation-contract, 1 in run.mjs) is `.replace(SQL_LITERALS, "''")`; the do-block counter (`applyTimeBlocks`) counts DO tokens through the lexer (`doBlockOpeners`) | golden and tripwire: `$$--$$; grant ...`, `create trigger "t;x" ...`, `alter policy ... (x <> ';')`, a GRANT and a DROP TABLE a DO block EXECUTEs, `create policy "a;b" ...`; view: a view a DO block EXECUTEs from a literal and from a dollar body; M7 (the tripwire back to comment-stripped text) red. The post-migrate plan still extracts 51 blocks |
| 7 | file_fdw / foreign table / extension (Q0-OT2-2) | see row 2; `APPROVED_EXTENSIONS = ['pgcrypto']` | drift D4 (`create extension file_fdw`): old 0, migrate-clean 2; golden: `dblink`, a server, a foreign table with `options (program ...)`, IMPORT FOREIGN SCHEMA, a user mapping; M5 (any extension admitted) red. **Not silently narrowed:** a blanket refusal of CREATE EXTENSION would refuse `000_foundation.sql:24` and `prerequisites.sql:48` (both create pgcrypto), so the rule is an allowlist of that one extension, written as such in the code, README, blocker and here |
| 8 | The golden corpus and the differential (task item 3) | one new test in foundation-contract, "one SQL lexer reads every fed source as PostgreSQL and psql do: ..."; `test-kits/db/sql-lexer-differential.json` | §2 |
| 9 | Close the OWED items on blocker 186 (task item 4) | open_blockers[185] appended ("THE SQL-LEXER BATCH ..."), nothing rewritten | §6 |
| 10 | Packaging | the manifest's branch slot, rationale and a fourth amendment path (evidence/VERIFICATION.md, since the suite count moves by one); because that list grew by one line, the 33 blocker `line` fields of `db/foundation/lint/audit-coverage-map.json` each move by one (indexes and quotes unchanged), which the coverage-map test requires; floors, name digest, integrity manifest | `npm run check`, branch scope (handoff) |

## 2. The differential, measured

Every source the repository feeds psql -- the prerequisite, 53 migrations, the 12 replacements, the CI shim, the
auth-context helper, the 21 fixtures, every probe SQL and drift in `run.mjs` (30 probes, 66 drifts, 34 exported
probe scripts), the WS:911 fixture and the EXPLAIN harness: **221 sources** -- was fed on stdin to psql 17.11
(`-X -q`, no ON_ERROR_STOP, each under its own `application_name`) against a fresh PostgreSQL 17.11 cluster with
`log_statement = all` (127.0.0.1:5507, TCP only). Each query psql sent is one `statement:` entry (a query that
fails to parse would be counted by its error; none did). **Result: 1897 queries sent, 1897 statements split by
the lexer, and for every source every sent query's canonical text equals the lexer's statement's** (221 of 221
agree). Recorded with each source's sha256 in `test-kits/db/sql-lexer-differential.json`; the static test checks
that every recorded source agreed, that every recorded migration is unchanged, and re-splits every source whose
text is unchanged (at least 150) against the recorded psql count.

A first measurement included 11 exported string constants of run.mjs that are not scripts (a policy name, a
CHECK expression, a file path); psql sends none of them as a query (each is a syntax error or nothing), so the
second measurement reads only exported strings that contain a `;` -- the scripts.

New refusals over the same 221 sources: **0** (the private `scan.mjs`). No integrated migration and no fed source
is newly refused.

## 3. Drifts, appended to `140_audit.sql` (restored byte for byte, sha256 `2ac596bb950e8dfb...` compared)

Fresh cluster each, shim first, `make db-migrate-clean`. "Old psqlLex" is `origin/main`'s psql-driver.mjs run on
the same text.

| Drift | Old psqlLex | migrate-clean on this branch | Marker file |
|---|---|---|---|
| D1 C0-OTR-2: `copy (select 'lexer drift') to $p$<private dir>/lexer_copy_marker$p$;` | 0 findings | **2**, "140_audit.sql line 1019 ... COPY ... TO/FROM a server file", before anything applied | not written |
| D2 Q0-OT2-1: `copy (select ';') to '<marker>';` | 0 | **2**, same | not written |
| D3 A1-RC-2: `create function public.lx_read(text) returns text language internal strict as 'pg_read_file_all';` | 0 | **2**, "a LANGUAGE internal function ..." | -- |
| D4 Q0-OT2-2: `create extension file_fdw;` | 0 | **2**, "CREATE EXTENSION file_fdw ..." | -- |

## 4. Each new reading weakened in code (static, `node --test --test-name-pattern=...` on foundation-contract)

| Mutation | Exit | Named by |
|---|---|---|
| M1 COPY targets read as single-quoted only | 1 | `refused: "copy app.jobs to $p$/tmp/x$p$;"` |
| M2 LANGUAGE internal/c not read | 1 | the `language internal ... 'pg_read_file_all'` shape |
| M3 a `--` comment ends at LF only | 1 | `tokenized as PostgreSQL does: "select 1 -- c\r\\! touch f\n"` |
| M4 dollar bodies not read as SQL | 1 | PROGRAM inside a dollar body |
| M5 any extension admitted | 1 | `create extension file_fdw;` |
| M6 server-file names by unquoted identifier only | 1 | `"pg_read_file" /* c */ (...)` |
| M7 the tripwire back to comment-stripped text | 1 | `create trigger "t;x" ...` |
| M8 the do-block allowlist without its dollar rule | 1 | the `$q$'$q$` drift |
| M9 the do-block blanker back to the old regex | 1 | the `$q$'$q$` drift |

Every file was restored byte for byte after each mutation (sha256 compared by the harness).

## 5. Commands and exit codes (Node `v24.20.0`, checked before every measured run)

Live: PostgreSQL 17.11 (`/opt/homebrew/bin`), 127.0.0.1:5507 only, TCP only (`-c unix_socket_directories=''`),
`initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the CI shim first, re-initdb every round.

| Command | Where | Exit | Output |
|---|---|---|---|
| `make db-migrate-clean` | working tree before the code commit, round r1 | 0 | 30 probes, each refusing its drifts and clean again; post-migrate pass 51 apply-time blocks (39 as written, 12 replaced) |
| `make db-rls-smoke` twice | same database | 0, 0 | 1087 isolation cases each |
| the same three on the committed code `b2193ad`, a second fresh cluster (r2) | branch name | 0; 0, 0 | as r1: 30 probes clean, 51 apply-time blocks; 1087 isolation cases each |
| differential (private `differential.mjs`) | fresh cluster with `log_statement = all` | -- | 221 sources, 221 agree, 1897 = 1897 |
| drifts D1-D4 (private `drifts.mjs`) | fresh cluster each | 2 each | §3 |
| mutations M1-M9 (private `mutate.mjs`) | static | 1 each | §4 |

| `npm run test:bootstrap` | the tree that became `b2193ad` | 1 | 685 tests, 683 pass; the 2 failures are the handoff guard alone ("the handoff for this branch describes this branch" and the ratchet that runs it on a copy), not yet refreshed |
| `node scripts/commit-when-clean.mjs` | before `b2193ad` | 86, then 1 | first refused for an integrity manifest not regenerated after the last edit (regenerated); then refused for the two handoff-guard failures alone. `b2193ad` is therefore a PLAIN commit, as the task allows for that case alone |
| `node scripts/verify-branch-scope.mjs 5bde893 WP-0A-DB-00` | `b2193ad` | 0 | "all 13 changed path(s) are declared, and every amendment explains one" |

`evidence/VERIFICATION.md` is written with `scripts/record-verification.mjs`'s own `render` at 685 / 685 / 0:
`npm run record:verification` refuses to record while the handoff guard is red, and the handoff must be the last
commit and alone, so the record cannot be written by that command after the refresh in a commit of its own. The
count is the suite's (685 tests, every one passing but the two handoff-guard tests until the refresh), and
`test-kits/verification-record.test.mjs` checks it against a live run in `npm run check` after the refresh.

The final `npm run check`, `npm run check:handoff` and `npm run verify` on the branch name are recorded in the
handoff, which is refreshed last and alone.

## 6. What a lexer still cannot decide, and what stays owed (recorded on open_blockers[185])

- **Semantics.** Which function a name resolves to through `search_path`, what a trigger or a body does at run
  time, whether a grant widens anything: the parser's and the catalog's. The live catalog probes hold these.
- **Text computed at run time.** `EXECUTE` of a concatenation, `format()`, `chr()`, `set_config` of a built name,
  `'pro' || 'gram'`: the source never spells it. Held by the probes where they read the result.
- **Word rules over the lexer's output** (the tripwire and view patterns, the migration-text pins) are still
  patterns. They now read text the lexer has normalised -- no comment, no `;` or quote inside a token, every
  literal's and body's statements read separately -- and they read the spellings pinned, no more.
- **psql variables named by a digit** (`b[1:2]`) are admitted: psql sets no such variable and nothing fed can
  set one (`\set` is a meta-command, refused).
- **Owed, A0:** re-run the differential when a new fed source lands (the static re-check covers only sources
  whose sha256 it recorded); A1-RC-4 (the internal-trigger rule one way) stays owed as [185] records it; the INFO
  items of the owed-tooling re-checks (C0-OTR-3, Q0-OT2-3, -4, -6, A1-RC-I2) stay recorded.

## 7. For the Owner, A0 and the reviewers

Nothing here needs the Owner's words: no migration, no grant, no dependency, no change of policy, role, contract
or decision. The reviewers are asked to judge (a) whether the lexer follows PostgreSQL's lexical rules where it
claims to, (b) whether each reader rewired onto it now reads what PostgreSQL reads, and (c) whether the
differential's method -- psql's sent queries from the server log -- measures the split psql makes.

## 8. Private artefacts (not in the repository)

`a0-sql-lexerr/` in the run's scratchpad: `cluster.sh`, `round.sh`, `scan.mjs` (every fed source through
psqlLex), `corpus.mjs` (the 79 lexer shapes), `differential.mjs`, `drifts.mjs` (with `old-psql-driver.mjs`,
origin/main's driver), `mutate.mjs`, `mutations.log`, `drifts.log`, `rewire.py` and the other edit scripts, and
each round's output. The cluster on 5507 is stopped and its data directory removed at the end of the run.
