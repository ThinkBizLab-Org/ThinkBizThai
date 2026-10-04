# Q0 independent test of the sql-lexer batch (PR #177)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-sql-lexer`, head `45893d9` (the handoff, alone and last) over the plan and
disposition `98d0f2f` and the code `b2193ad`, base `5bde893` (main). Author `/claude/a0_atlas`. PR
<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/177>: Draft, OPEN, head
`45893d9e27f69ecbaaf9ccae8277f2df9bbbef5f`, required check `bootstrap` SUCCESS on that head (run 37195091542, read
with `gh`). **Tested on:** my own branch `review/q0-batch-sql-lexer`, created at `45893d9`. The branch-name checks
and every mutation and drift ran in a private clone checked out on the branch NAME
`agent/claude/WP-0A-DB-00-batch-sql-lexer`, because that name is checked out in another worktree and could not be
checked out here. In the clone, `main` and `origin/main` are set to `5bde893`. **Date:** 2026-10-04. The file name
carries the phase's date, as the batch's plan and disposition do.

This record holds findings and advances no status. It approves nothing, test-verifies nothing on anyone's behalf,
and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is an act for the Integration Owner and the Product Owner, not for me.

I fixed nothing. Every mutation and drift was applied in the private clone, run, and restored. The harness compared
the sha256 before and after each one, and every restore matched. My private artefacts are kept outside the
repository, in `q0-sql-lexer/` in the run's scratchpad: `cluster.sh`, `round.sh`, `differential.mjs`,
`mutate.mjs`, `drifts.mjs`, `scan.mjs`, `claims.mjs`, `old-psql-driver.mjs` (main's driver, taken with
`git show 5bde893:`), and every round's log. The cluster on 5503 was stopped and its data directory removed at
the end.

## 1. Measured vs read

**Measured** (Node `v24.20.0`, checked before every measured run; PostgreSQL 17.11 (Homebrew) from
`/opt/homebrew/bin`; 127.0.0.1:5503 only, TCP only (`-c unix_socket_directories=''`),
`initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the CI shim first, a fresh initdb every round; drifts
APPENDED to `140_audit.sql`):

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs 5bde893 WP-0A-DB-00` | clone, branch name | 0 | "all 16 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | clone, branch name | 0 | "clean: exit 0 -- tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `npm run check` | worktree, `review/q0-batch-sql-lexer` | 0 | coverage floor, toolchain, secrets, protocol, suite fail 0 |
| round r1: shim, `make db-migrate-clean`, `make db-rls-smoke` twice | clone, `45893d9` | 0, 0, 0 | 30 probe self-tests, each refusing its drifts and clean again; post-migrate pass 51 apply-time blocks (39 as written, 12 replaced); 1087 isolation cases each time |
| the differential (my own `differential.mjs`, written independently of A0's) | fresh cluster, `log_statement=all`, `log_line_prefix=@@%a@@` | 0 | §3: 221 sources rebuilt from the tree, every sha256 equal to the record; psql sent 1897 queries and the lexer split 1897 statements; canonical text equal on all 221 sources, in order; 0 queries that failed to parse |
| drifts D1-D4 (`drifts.mjs`) | a fresh cluster each | 2 each | §4 |
| lexer mutations L1-L21 (`mutate.mjs`) | static | §2 | §2 |
| every fed source through the branch's psqlLex and main's (`scan.mjs`) | static | -- | 219 sources (53 migrations; the harness and the WS:911 fixture are covered by the differential): branch 0 findings, main 0 findings |

**Read, not measured:** CI's result and the PR state (read with `gh`). The facts of #176's merge, as the
disposition gives them. The commit-when-clean exits A0 records for `b2193ad` (86, then 1) and for the two commits
after it. A0's own mutations M1-M9, which I did not re-run; my table in §2 covers the lexer's rules instead. The
Owner's words, which the disposition quotes.

## 2. Mutation table: each lexer rule weakened, one at a time

Each rule of `scripts/db/sql-lexer.mjs` was weakened by one textual edit. The golden test was run
(`node --test --test-name-pattern="one SQL lexer reads every fed source" test-kits/db/foundation-contract.test.mjs`),
and the file was restored (sha256 `bb391ca4e54db281...` compared every time: restored on all 21). Where the golden
test stayed green, the whole foundation-contract file was run as well.

| Id | Rule weakened | Golden | Whole fc | Verdict |
|---|---|---|---|---|
| L1 | a `--` comment ends at LF only, not at a bare CR | 1 | -- | held |
| L2 | block comments do not nest | 1 | -- | held |
| L3 | no string continuation across a newline | 1 | -- | held |
| L4 | E'' backslash escapes ignored when finding the end | 1 | -- | held |
| L5 | a dollar quote closes at the next `$`, whatever the tag | 1 | -- | held |
| L6 | `$` does not continue an identifier | 1 | -- | held |
| L7 | a doubled `""` in a quoted identifier is not undoubled | 1 | -- | held |
| L8 | an operator is not cut before an embedded comment | 1 | -- | held |
| L9 | UESCAPE ignored | 1 | -- | held |
| L10 | the numeric trailing-junk rule off | 1 | -- | held |
| L11 | a psql variable reference not refused | 1 | -- | held |
| L12 | a backslash not read as a meta-command in psql mode | 1 | -- | held |
| L13 | the split ignores parenthesis depth | 1 | -- | held |
| **L14** | **VT is not whitespace** | **0** | **0** | **survives** (Q0-SL-1) |
| L15 | literal and dollar-body texts not walked as SQL | 1 | -- | held |
| L16 | a zero-length quoted identifier admitted | 1 | -- | held |
| L17 | an unterminated block comment admitted | 1 | -- | held |
| L18 | the trailing +/- operator rule off | 1 | -- | held |
| L19 | E'' escapes not decoded | 1 | -- | held |
| L20 | the canonical form keeps every quoted identifier as written | 0 | 1 | held by another test, not by the golden corpus (Q0-SL-2) |
| L21 | an unterminated quoted string admitted | 1 | -- | held |

## 3. The differential

I wrote my own harness and did not use A0's. It rebuilds each recorded source from the tree: the 89 `.sql` files
(`git ls-files '*.sql'` equals the record's file list exactly), `CATALOG_RULE_PROBES` with their drifts, every
string export of `run.mjs`, `harnessScript(paramsFor('small'))` and `fixtureSql(WS905_SMALL)`. Every rebuilt text's
sha256 equals the recorded one (0 unmatched). No `run.mjs` export containing a `;`, and no probe or drift, is
missing from the record. Each source was fed on stdin to psql 17.11 (`-X -q`, no ON_ERROR_STOP) under its own
`application_name`. Every `statement:` entry was read from the server log; a `STATEMENT:` after an error counts
only when it differs from the last logged statement. psql's queries (a trailing `;` dropped) and the lexer's
statements were compared in canonical form.

**Result:** 221 sources, 1897 queries sent, 1897 statements split, 0 disagreements, 0 queries that failed to parse.
The server logged 110 errors, all at run time (most are "current transaction is aborted" and the drifts' intended
refusals). This reproduces the plan's §2 and the JSON exactly.

**No integrated migration is refused:** the clean round r1 exits 0. psqlLex reports 0 findings on every fed source
(all 53 migrations included). `npm run verify` passes the golden test's sha256 re-check of every recorded
migration.

## 4. Drifts D1-D4, as the plan states them (appended to `140_audit.sql`, restored: sha256 `2ac596bb950e8dfb...` before and after each)

| Drift | Main's psqlLex | Branch psqlLex | migrate-clean | Marker file |
|---|---|---|---|---|
| D1 `copy (select 'lexer drift') to $p$<private dir>/lexer_copy_marker$p$;` | +0 | 1, COPY ... server file | **2**, "140_audit.sql line 1019 ..." | absent |
| D2 `copy (select ';') to '<marker>';` | +0 | 1, same | **2** | absent |
| D3 `create function public.lx_read(text) ... language internal strict as 'pg_read_file_all';` | +0 | 1, LANGUAGE internal | **2** | -- |
| D4 `create extension file_fdw;` | +0 | 1, CREATE EXTENSION file_fdw | **2** | -- |

All four hold as the plan's §3 records them.

## 5. Claims checked

- **Commit messages.** `b2193ad`: the files and counts it names match the diff (16 paths, all declared). The floors
  move 80 -> 81 tests and 1014 -> 1044 assertions, with a new name digest (`test-suite-contract.mjs` diff). The
  "221 fed sources, 1897 queries" claim is reproduced in §3. `98d0f2f` and `45893d9` say what they hold. The
  handoff is last and alone, and `check:handoff` is 0 on the branch name.
- **Blocker edit.** `open_blockers` 196 -> 196. Only index 185 changed, and its old text is an exact prefix of the
  new text (3979 characters appended; nothing rewritten). The appended text names C0-OTR-1/2, A1-RC-1/2/3,
  A1-RC-I1, Q0-OT2-1/2/5/7 and A1-RC-4. The manifest's other change is `ownership` (the branch slot and rationale),
  as stated.
- **The audit-coverage map.** Exactly 33 `line` fields change, each by +1, and nothing else changes, as stated.
- **Rewiring counts.** foundation-contract had 23 old `--[^\n]*` strippers and 3 literal blankers at base; at
  head it has none of the old pattern, 25 `SQL_LINE_COMMENTS` uses (the new test adds some) and 3 `SQL_LITERALS`.
  identity-isolation has 54 at head and none of the old pattern. In run.mjs the base had 5 strippers and 1 blanker;
  at head 4 are `SQL_LINE_COMMENTS`, and the fifth, which also held the blanker, became `doBlockOpeners` (Q0-SL-3).
- **Disposition.** It quotes the Owner's words verbatim, reads them as covering item 5 only, approves no RFC,
  states that no migration number is needed, and does not claim RFC-2026-002's literal rule is met. All of this is
  consistent with what I read.
- **The 33 server-file names.** The list has 33 entries, and the golden test checks each one called and each one
  after FUNCTION. I did not re-measure the "measured on 17.11" provenance of the 16 internal symbols.

## 6. Findings (graded)

| Id | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| Q0-SL-1 | LOW | `scripts/db/sql-lexer.mjs:43`; golden test `test-kits/db/foundation-contract.test.mjs:2358-2385` | The header (line 15) claims VT as whitespace, but no golden case holds a VT. Removing `'\v'` from `SPACE` (L14) leaves the whole foundation-contract file green. | Add one tokenization case containing `\v` to the golden table. |
| Q0-SL-2 | INFO | `scripts/db/sql-lexer.mjs:443` | The canonical form's quoted-identifier rule (`"app"` -> `app`, anything else -> `"?"`) is not pinned by the golden corpus. L20 is red only through another test. | Add a canonical-form assertion with a non-plain quoted identifier to the golden test. |
| Q0-SL-3 | INFO | plan §1 row 6 | "5 in run.mjs" comment strippers and "1 in run.mjs" literal blanker are said to now be `.replace(SQL_LINE_COMMENTS / SQL_LITERALS, ...)`. Four are; the fifth stripper and the blanker were replaced by the lexer-based `doBlockOpeners`. The substance holds, but the wording is imprecise. | Reword when the plan is next touched; no code change. |
| Q0-SL-4 | INFO | `tests/db/identity/identity-isolation.test.mjs` (viewScanText) | A0's own not-done item: no mutation shows that the identity-isolation view scan goes red when weakened. I did not measure it either. | A0 (owed): one mutation run on that file. |
| Q0-SL-5 | INFO | `scripts/db/run.mjs:2496-2506`, `:3903` | The differential measures the 221 recorded sources. The runtime wrappers (`probeJobScript`, the `begin;/rollback;` re-run) are compositions of recorded parts joined by newlines and are not measured as wholes. | None required. It is a limit of the record, worth naming if the wrappers ever change shape. |

## 7. Stop-the-line verdict

**No stop-the-line.** No secret exposure, tenant leakage, migration divergence or contract mismatch was found.
Every integrated migration applies cleanly and none is refused. Isolation stays at 1087 cases, twice. The batch
strictly adds refusals: D1-D4 pass main and are refused here.

**Does anything block the merge from the Tester's side?** No finding in this record blocks it: Q0-SL-1 is LOW and
the rest are INFO. The bar of batch 127 §6 also needs the C0 and A1 role runs, and RFC-2026-025 §5's Integration
Owner evidence is still open, as the disposition itself says. Those are not mine to judge.

## 8. Limits

- The mutation table weakens the lexer's rules one at a time. It does not re-run A0's psqlLex-level mutations
  M1-M9, and it does not cover identity-isolation (Q0-SL-4).
- The differential and the zero-refusal scan read only the sources the repository records. The differential's
  canonical comparison runs both sides through the same lexer, so it measures where the split falls and the
  statements' word sequence, not the lexer's token kinds independently.
- I did not measure CI. I read its result.
- I share the Author's vendor and model family (§0).
