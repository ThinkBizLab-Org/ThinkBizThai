# C0 contract review: the sql-lexer batch

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-sql-lexer` (PR #177, Draft) |
| Subject head | `45893d9e27f69ecbaaf9ccae8277f2df9bbbef5f` (the handoff, alone and last), over evidence `98d0f2f` and code `b2193ad` |
| Base | `5bde893` (`main`, the merge of #176) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (the file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `review/c0-batch-sql-lexer`, created at `45893d9` in my own worktree (`wf_e9ed3b89-843-2`). The subject branch NAME is checked out in A0's worktrees (`-843-1`, `-843-3`), so I ran the branch-NAME guards in a private clone in my private directory, on a branch named exactly `agent/claude/WP-0A-DB-00-batch-sql-lexer` at `45893d9`, with `origin/main` and `origin/HEAD` set to `5bde893`. Nothing was written to A0's worktrees and nothing was pushed. |
| Scope | `git diff 5bde893..45893d9` (16 paths); the plan `a0-batch-sql-lexer-plan-2026-10-03.md`; the disposition `product-owner-disposition-2026-10-03-batch-sql-lexer.md`; the three commit messages; `open_blockers[185]`'s append; the handoff; CONTRIBUTING_AGENTS.md; PostgreSQL's lexical rules (the documentation and psql's scanner behaviour, below) |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**. I run in a git worktree that A0's
  workflow created, under a brief that A0's workflow wrote, and A0 chose the questions I answer.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that alone does not bar me. It is still a real limit on my independence.
- The **Integration Owner and the Product Owner** decide whether this file counts as the Reviewer
  signature that RFC-2026-002 requires. I do not decide that.

## §1 Verdict in one paragraph

The lexer follows PostgreSQL's documented lexical rules wherever I checked it against them (§3). psqlLex and
the static readers the plan names now read through it. The old regexes (`SET_NAMES`, `COPY_PROGRAM`,
`COPY_SERVER_FILE`, `SERVER_FILE_CALL`, `escapeSpellings`) are gone. I re-measured A0's drifts D1 and D2, its
mutation M3, and the differential over the prerequisite and all 53 migrations, and each matched what A0
recorded. The blocker edit is a pure append to `[185]` (196 blockers before and after). No dependency, no
migration and no decision are added. All three guards exit 0 on the branch NAME, and `npm run verify` is
clean at 685/685.

**Several claims are broader than what was measured:**

1. **Server-file aliases** (C0-SL-1, MEDIUM). The batch records A1-RC-2 ("the server-file aliases") as closed.
   It refuses `LANGUAGE internal` and `LANGUAGE c` only. An **operator over `lo_export`** appended to 140 wrote a
   host file, and every layer stayed green (migrate-clean 0, rls-smoke 0). A **rename** of `lo_export` also
   wrote its file. The live fingerprint caught the rename, but only after the write.
2. **The view scan's lexer reading is not pinned** (C0-SL-2, LOW). I put `viewScanText` back to raw text, and
   the test stayed green. This measures A0's own not-done item.
3. **"Splits where psql does" is narrower than psql** (C0-SL-3, LOW). psql 17.11 sent one query where the lexer
   split three (measured). The difference is in the safe direction: no rule is evaded.
4. **"Every static reader" leaves one regex reader behind** (C0-SL-4, LOW): `generate-pinned-grants.mjs:109`.
5. **Two counts are wrong** (C0-SL-5, LOW). The plan and the blocker say 16 internal symbols, and the blocker
   says 17 names. I measured 15 and 18. The total of 33 is correct.
6. **The handoff omits the final branch-NAME guards** (C0-SL-6, LOW). Plan §5 says it records them.

**No stop-the-line. Nothing blocks the merge in my reading.** C0-SL-1 is a closure recorded more broadly than
its evidence, and correcting the wording on `[185]` is cheap. It should land with the merge, or right after.

## §2 What I measured, and what I only read

All measured runs used Node `v24.20.0`. I checked `node -v` before each run, and
`/Users/bank/.local/node-v24.20.0/bin` is first on PATH. The database was PostgreSQL 17.11 from
`/opt/homebrew/bin`, on port **5505** on 127.0.0.1 only, over TCP only (`-c unix_socket_directories=''`). Each
cluster was created with `initdb --locale=C -A trust -U postgres` under `LC_ALL=C`, with the CI shim applied
first. Every round used a fresh `initdb`. Drifts were APPENDED to `db/foundation/migrations/140_audit.sql`, and
a harness restored the file byte for byte after each one, comparing sha256 (`2ac596bb950e8dfb…` every time).
Static mutations were restored the same way. The marker files were deleted afterwards. The cluster was
stopped and its data directory removed, and `lsof` shows nothing listening on 5505. `git status` was clean
before this file was written.

| # | Command | Where | Exit | Output |
|---|---|---|---|---|
| R1 | `node scripts/verify-branch-scope.mjs 5bde893 WP-0A-DB-00` | clone, branch NAME at `45893d9` | 0 | "all 16 changed path(s) are declared, and every amendment explains one" |
| R2 | `npm run check:handoff` | same | 0 | "describes the branch: nothing substantive after its cited head" |
| R3 | `npm run verify` | same | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| R4 | fresh cluster, shim, `make db-migrate-clean`, `make db-rls-smoke` twice | worktree at `45893d9` | 0, 0, 0 | 30 probe self-tests; "post-migrate pass: 51 apply-time blocks, 39 re-run as written, 12 superseded and replaced"; "1087 isolation case(s) passed" twice |
| R5 | `pg_proc` on R4's cluster: `prosrc` of every `pg_ls_*`, `pg_read*`, `pg_stat_file`, `lo_import`, `lo_export` | — | — | **15** distinct internal symbols where `prosrc <> proname`, each one in `SERVER_FILE_FUNCTIONS`; no `pg_ls_summariesdir` on 17.11 |
| R6 | differential, partial: the prerequisite and all 53 migrations in order, on stdin to psql 17.11 (`-X -q`), on a fresh cluster with `log_statement = all`; "statement:" entries counted per source and compared with psqlLex's split (private `diffmig.mjs`) | — | — | **54 sources, psql sent 1401, lexer split 1401, none differ**. The recorded JSON gives 1401 for the same 54 |
| R7 | field-by-field JSON diff of `work-packages/WP-0A-DB-00.json`, `5bde893` vs `45893d9` | — | — | Only `ownership` changed (the branch slot, the rationale, and `evidence/VERIFICATION.md` as a fourth amendment path, which batch 160 prep used before) and `open_blockers[185]` (a pure APPEND of +3979 characters). Count 196 → 196 |
| R8 | `git diff --stat` | — | — | No `package.json`, no lockfile, no migration file. `sql-lexer.mjs` imports nothing |

Live drifts, each appended to 140 on a fresh cluster:

| Drift | migrate-clean | rls-smoke | Result |
|---|---|---|---|
| D1 (A0's, re-run): `copy (select 'c0 d1') to $p$<private dir>/c0_d1_marker$p$;` | **2** | — | "140_audit.sql line 1019: … COPY ... TO/FROM a server file", before anything applied. **No file written** |
| D2 (A0's, re-run): `copy (select ';c0 d2') to '<private dir>/c0_d2_marker';` | **2** | — | the same. **No file written** |
| D-op: `create operator public.### (leftarg = oid, rightarg = text, function = pg_catalog.lo_export); select lo_from_bytea(424242, 'c0 operator alias'); select 424242::oid ### '<private dir>/c0_op_marker'; select lo_unlink(424242);` | **0** | **0** (1087 cases) | **The file was written** (`c0 operator alias`). Every layer was green (C0-SL-1) |
| D-ren: `alter function pg_catalog.lo_export(oid, text) rename to c0_lx; select lo_from_bytea(424243, 'c0 rename alias'); select pg_catalog.c0_lx(424243, '<private dir>/c0_ren_marker'); …` | 2 | 0 | **The file was written** (`c0 rename alias`). Afterwards the system object fingerprint refused "function pg_catalog.lo_export(oid, text) [renamed to pg_catalog.c0_lx(oid, text)]". psqlLex admitted it |
| S-begin (psql split, not a migration): `create function public.c0_f() returns int language sql set search_path = begin as 'select 1';` followed by `select 2;` and `select 3;`, on stdin to psql with `log_statement = all` | — | — | **psql sent 1 query. The lexer split 3**, and psqlLex had 0 findings (C0-SL-3) |

Static runs (worktree, restored byte for byte):

| # | Mutation or input | Command | Exit | Verdict |
|---|---|---|---|---|
| M0 | none (harness control) | `node --test --test-name-pattern="effective-limit projection" tests/db/identity/identity-isolation.test.mjs` | 0 | — |
| M-view | `const viewScanText = (text) => text;` | same | **0** | the view scan's lexer reading is pinned by nothing (C0-SL-2) |
| M3 (A0's, re-run) | a `--` comment ends at LF only | `node --test --test-name-pattern="one SQL lexer" test-kits/db/foundation-contract.test.mjs` | **1** | as A0 recorded |
| M-fn | the "unless FUNCTION precedes it" exemption removed | same | 1 | the exemption is pinned (the golden test names each server-file function after FUNCTION) |
| P1 | `psqlLex` on spellings (private `probe.mjs`, `probe2.mjs`) | node | — | **admitted:** an operator with `function = pg_catalog.lo_export`, the same for `pg_read_file`, `create cast … with function pg_catalog.pg_read_file(text)`, `alter function pg_catalog.pg_read_file(text) rename to lx` plus `lx(…)`, `alter function … lo_export … set schema public`, an aggregate with `sfunc = pg_catalog.pg_read_file`, `select pg_ls_summariesdir()` (absent on 17), and `select<U+00A0>pg_read_file('/x')`. The last is correct: PostgreSQL reads U+00A0 as an identifier character, so this is a call to a function named `select pg_read_file`. **Refused:** `copy t to "stdout"` (correct: a quoted identifier is not a COPY target), `copy t to '/tmp/x'`, `pg_catalog.lo_import(…)`, `language 'internal'`, D3's `language internal … 'pg_read_file_all'`, and D4's `create extension file_fdw` |

**Read, not measured:**

- The full differential's other 167 sources (the probes, drifts, replacements, fixtures, helper, shim and
  harness). I re-measured only the 54 in R6. The static test re-checks each source whose sha256 is unchanged
  (`foundation-contract.test.mjs:2446-2467`), and R3 ran that check green.
- A0's drifts D3 and D4 live. I checked their refusal statically only (P1).
- A0's mutations M1, M2 and M4-M9. I re-ran M3.
- That `b2193ad` was red at commit-when-clean only on the two handoff-guard tests, and that `45893d9` passed
  commit-when-clean. The commit order (code, evidence, then the handoff alone and last) holds in `git log`.
- The reader-rewiring counts. Counted from the diff: 54 of 54 `--` strippers in identity-isolation; 4 of 5 in
  `run.mjs`, where the fifth, together with its literal blanker, became `doBlockOpeners`; and 22 in
  foundation-contract plus `sqlWithoutComments` for its 23, with 3 `SQL_LITERALS`. These agree with the plan.

## §3 Does the lexer follow PostgreSQL's documented lexical rules?

I checked `scripts/db/sql-lexer.mjs` rule by rule against *PostgreSQL 17 Documentation, §4.1 Lexical Structure*.
For the edges the page leaves out, I checked the scanner behaviour of `src/backend/parser/scan.l` and psql's
`psqlscan.l`.

| Rule | Doc section | Code | Holds? |
|---|---|---|---|
| Identifiers: a letter, `_` or a non-ASCII character first; then digits and `$`; unquoted folded to lower case (ASCII only); quoted with `""` doubled, zero-length an error; `U&""` with UESCAPE | §4.1.1 | `:40-41`, `:249-261`, `:232-248` | yes |
| Plain strings with `''` doubled; continuation across whitespace holding a newline, comments allowed | §4.1.2.1 | `:128-178` | yes, including `--` before the newline and a block comment refused as a joiner |
| `E''` escapes `\b \f \n \r \t`, `\o`/`\oo`/`\ooo`, `\xh`/`\xhh`, `\uxxxx`, `\Uxxxxxxxx`, any other `\c` = `c` | §4.1.2.2 | `:79-106` | yes (`\x` without a hex digit reads `x`, as documented) |
| `U&''` with `\XXXX`, `\+XXXXXX`, a doubled escape; UESCAPE not a hex digit, `+`, a quote or whitespace | §4.1.2.3 | `:60-77`, `:181-198` | yes |
| Dollar quotes: the tag follows identifier rules without `$`; only the same tag closes; a `$` after an identifier character continues the identifier | §4.1.2.4 | `:266-279` | yes. `indexOf(tag)` is equivalent to scan.l's throw-back of the last `$` on a mismatched delimiter, because every `$` in a body is revisited as a delimiter start |
| `B''` and `X''` (no `''` doubling: the second quote opens a new token) | §4.1.2.5 | `:152`, `:175-176` | yes |
| Numbers: `0x`/`0o`/`0b`, `_` separators, the exponent, `1..`, and PG 15+ trailing junk (an identifier character right after a number or parameter is an error) | §4.1.2.6 | `:283-297`, `:267-270` | yes (refused, i.e. fail closed) |
| Operators: the 17 characters; `--` and `/*` end the name; a trailing `+`/`-` is dropped unless the name holds `~ ! @ # % ^ & \| ` ?` | §4.1.3 | `:322-334` | yes |
| Special characters `( ) [ ] , ; : :: .`, and `$n` | §4.1.4 | `:299-313`, `:267-270` | yes |
| `--` comments to the end of the line (scan.l `non_newline` is `[^\n\r]`); nested `/* */` | §4.1.5 | `:216-221`, `:200-208` | yes |
| Whitespace including VT (PostgreSQL 16+) | scan.l `space` | `:43-44` | yes |
| psql: a backslash outside quotes starts a meta-command; `:name`, `:'name'`, `:"name"` are substituted | psql docs, "Meta-Commands" and "SQL Interpolation" | `:299-321` | yes, and all are refused (fail closed) |
| psql: `;` ends a statement outside parentheses | psqlscan.l | `:351-371` | **narrower than psql.** psql also holds `;` while `begin_depth > 0`, and it counts that on ANY `begin` identifier at paren depth 0 inside a `CREATE [OR REPLACE] FUNCTION|PROCEDURE` statement, not only on `BEGIN ATOMIC` (C0-SL-3) |

Not modelled, and harmless for these readers: identifier truncation to NAMEDATALEN − 1 (no listed name comes
near 63 bytes), and the multi-character tokens `:=` and `=>`, which are lexed as `:` `=` and the operator `=>`.
That changes no split and no rule.

## §4 Findings

### C0-SL-1 (MEDIUM): the A1-RC-2 closure ("the server-file aliases") is narrower than it is recorded

- **Where:** `scripts/db/psql-driver.mjs:415-420`, and `:479-482`, which admits a server-file name whenever
  FUNCTION precedes it or `(` does not follow it. Also `work-packages/WP-0A-DB-00.json:441`
  (`open_blockers[185]`'s append: "CLOSED … the server-file aliases (A1-RC-2: LANGUAGE internal or c refused
  …)"), `db/foundation/README.md:768` ("either can alias any built-in"), plan row 4, and disposition §4 item 3.
- **What:** A name no list holds can reach a server-file function without `LANGUAGE internal`/`c`. It can come
  through `CREATE OPERATOR … (function = pg_catalog.lo_export)`, `CREATE CAST … WITH FUNCTION
  pg_catalog.pg_read_file(text)`, `CREATE AGGREGATE … (sfunc = …)`, or `ALTER FUNCTION pg_catalog.lo_export(…)
  RENAME TO …` / `SET SCHEMA …`. In each, the server-file name is either preceded by FUNCTION or not followed by
  `(`, so psqlLex admits it.
- **Measured:** D-op wrote `c0_op_marker` on the host, and migrate-clean and rls-smoke both exited 0. D-ren
  wrote `c0_ren_marker`, and the system fingerprint refused it afterwards. A cast would be caught afterwards
  by the pg_catalog guard (`pg_cast` OID ≥ 16384). An operator in `public` is not caught, because the guard
  excludes namespace 2200.
- **Why MEDIUM, not stop-the-line:** The clusters are private and throwaway. The fed sources are written in
  this repository. The write needs superuser, and it touches no tenant data. Its impact matches C0-OTR-2,
  which I graded LOW. I grade this one higher because the batch records the CLASS as closed on a blocker, and
  the evidence covers one spelling of it.
- **Remedy:** Either (a) refuse any server-file name as an identifier token wherever it is not the object of
  `GRANT`/`REVOKE … ON FUNCTION` or `COMMENT ON FUNCTION`. That covers `function =`, `sfunc =`, `WITH
  FUNCTION`, `RENAME` and `SET SCHEMA`. Pin it with D-op and D-ren as drifts. Or (b) append to `[185]` that
  A1-RC-2 is closed for `LANGUAGE internal`/`c` only, and that the operator, cast, aggregate and rename
  routes stay open, with the live layers that catch which (see above). Correct the README sentence in either
  case.

### C0-SL-2 (LOW): the view scan's reading through the lexer is pinned by nothing

- **Where:** `tests/db/identity/identity-isolation.test.mjs:57` (`viewScanText`) and `:8046-8061`.
- **Measured:** M-view (`viewScanText = (text) => text`) leaves the test green, exit 0. The two new spellings
  (a view a DO block EXECUTEs from a literal, and from a dollar body) are matched by `CREATE_VIEW` on the raw
  text too.
- **Remedy:** Add a spelling only the lexer reads, for example `create -- c\nview v as select 1`, which
  `VIEW_GAP` does not span on raw text. Add a negative only the lexer clears, for example
  `comment on table app.t is 'create view'`, which the raw text matches. Then record M-view red. This is A0's
  own not-done item, measured.

### C0-SL-3 (LOW): the statement split is finer than psql's on a bare `begin` in CREATE FUNCTION or PROCEDURE

- **Where:** `scripts/db/sql-lexer.mjs:31-32`, `:347-350`; `scripts/db/psql-driver.mjs:399`, `:544`; plan row 1
  and §2 ("splits where psql does").
- **Measured:** S-begin. psql sent one query, and the lexer split three.
- **Impact:** The difference only ever runs in the safe direction: the lexer's statements are a refinement of
  psql's, so every token rule still reads every token, and a head rule sees more statement starts, not fewer.
  But the split claim and the "refuse BEGIN ATOMIC" rationale are narrower than psql's actual rule. The
  differential covers only today's 221 sources.
- **Remedy:** Mirror psqlscan.l. Refuse a CREATE [OR REPLACE] FUNCTION or PROCEDURE statement that holds a
  `begin` identifier at paren depth 0, or record the limit next to the BEGIN ATOMIC sentence.

### C0-SL-4 (LOW): one regex static reader is left behind

- **Where:** `scripts/db/generate-pinned-grants.mjs:109`
  (`readFileSync(…).replace(/--[^\n]*/g, '')`, then a `grant … on … to …;` regex over the result), exercised by
  `foundation-contract.test.mjs:3346`. The plan's title, row 6, the README ("all read through it") and
  `[185]` ("every static reader") do not name it.
- **Impact:** It only attributes `granted_by` provenance. The catalog is the truth, and a mismatch is
  refused, so it fails closed.
- **Remedy:** Rewire it to `SQL_LINE_COMMENTS` (or to `canonicalStatements`), or name it as out of scope where
  the claim is made.

### C0-SL-5 (LOW, wording): the internal-symbol and name counts

- **Where:** plan line 32 ("the 16 internal symbols"), and `[185]`'s append ("the 16 internal symbols … added to
  the 17 names").
- **Measured (R5):** There are 15 internal symbols (`prosrc <> proname` on 17.11) and 18 base names
  (`psql-driver.mjs:434-436`). The total of 33 is right, and so is the list.
- **Remedy:** Correct the counts in an append. Note also that five of the 18 base names (`pg_file_*`,
  `pg_logdir_ls`) are adminpack functions, and PostgreSQL 17 no longer ships adminpack. Keeping them is
  harmless.

### C0-SL-6 (LOW): the handoff does not record the final branch-NAME guards that plan §5 says it records

- **Where:** `handoffs/WP-0A-DB-00-author-handoff.json` `tests` (9 entries), and plan line 112.
- **What:** The handoff records no `npm run check`, `npm run check:handoff` or `npm run verify` on the branch
  name, and no commit-when-clean of `45893d9`. The previous batch's handoff did record them (at `5bde893`).
  CONTRIBUTING_AGENTS.md requires the handoff to list the tests run and their exit codes.
- **Measured:** R1-R3 all exit 0, so nothing is hidden. The record is incomplete.
- **Remedy:** Add the entries at the next handoff refresh.

### INFO

- **C0-SL-I1.** The `CREATE EXTENSION` allowlist (`pgcrypto` only) is recorded truthfully, not narrowed
  silently. P1 confirms that `file_fdw` is refused.
- **C0-SL-I2.** Word rules over raw or stripped text remain:
  - `rls-assertions.test.mjs:96,178` (`set_config` over the helper's raw text);
  - the §8.5 rules at `run.mjs:2799-2810`, whose `[\s\S]*?\$\$` pairs a function with the next `$$` whatever its
    own tag.

  These are covered by the stated limit "the word rules … are still patterns". I list them so the next reader
  knows where they are.

## §5 The questions asked

- **Does the lexer follow PostgreSQL's documented lexical rules?** Yes, as tabled in §3. The exception is the
  psql split heuristic (C0-SL-3), which errs only in the safe direction.
- **Does every former static reader use it?** Every reader the plan names does. One is left behind
  (C0-SL-4).
- **Are closures recorded truthfully on blocker 186, and are the limits stated?**
  - The append is pure and states the dynamic-SQL and semantics limits, the word-rule limit, the
    digit-variable admission and the owed items with their owner.
  - Two things are not truthful as recorded. The A1-RC-2 closure is broader than its evidence (C0-SL-1), and
    two counts are wrong (C0-SL-5).
  - The other closures hold as worded on the spellings I re-ran: C0-OTR-2, A1-RC-1 and Q0-OT2-1 by D1 and D2,
    and Q0-OT2-2 statically.
- **No dependency, no migration, no decision taken?**
  - True. There is no package or lockfile change and no migration path, and `sql-lexer.mjs` imports nothing.
  - The disposition quotes the Owner's words `ลุยต่อเลย เอาตามแนะนำ` verbatim. They match the workflow's
    relayed request. The disposition reads them as reaching item 5 only and approves no RFC.
  - The disposition records the merge of #176 as executing the standing delegation, not as a decision.
- **Are the commit messages, plan, disposition, blocker edits and handoff true?** Yes, except C0-SL-1, -4, -5
  and -6. Commit `b2193ad`'s body matches its diff (floors 80 → 81 and 1014 → 1044, the digest, the 33 line
  fields of the coverage map, which verify passes).

## §6 Stop-the-line verdict

**No stop-the-line.** None of the findings involves secret exposure, tenant leakage, duplicate side effects,
lost jobs, migration divergence, irreversible deletion or a contract mismatch. The host-file write in C0-SL-1
needs a repository-authored migration and a superuser on a private throwaway cluster. **Nothing blocks the
merge in my reading.** I recommend that C0-SL-1's correction (remedy (a) or (b)) lands with the merge or
immediately after it, because the merged tree would otherwise record a closure its evidence does not cover.

## §7 Limits of this review

- §0 applies: I share the Author's vendor and model family, and A0's workflow set my questions.
- I re-measured 54 of 221 differential sources and 2 of A0's 4 drifts live, and 1 of A0's 9 mutations.
- I did not run psql's scanner source. The psql split behaviour in C0-SL-3 is measured on one input, and the
  heuristic described is my reading of psqlscan.l, consistent with that measurement.
- I looked for alias routes beyond the ones I measured but did not enumerate every DDL that can bind a function
  (for example event triggers, or a type's I/O functions). C0-SL-1's remedy (a) is worded to cover the class
  by token position, not by statement.
- Private artefacts (not in the repository), in `c0-sql-lexer/` of the session scratchpad: `cluster.sh`,
  `round.sh`, `drift.mjs` and `drift-*.sql`, `mutate.mjs`, `probe.mjs`, `probe2.mjs`, `diffmig.mjs`,
  `splitdiff.sh`, `split-begin.sql`, `jdiff.mjs`, and each run's log.
