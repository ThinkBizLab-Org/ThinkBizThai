# Q0 independent test re-check of the sql-lexer batch's review round (PR #177)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-sql-lexer`, head `548dead` (the handoff, alone and last) over the review-round code
`286770f`, previous reviewed head `45893d9`, base `5bde893` (main). Author `/claude/a0_atlas`. **Checked out on:** my
own branch `recheck/q0-batch-sql-lexer`, created at `548dead`. The branch-NAME guards ran in a private clone checked
out on the branch name `agent/claude/WP-0A-DB-00-batch-sql-lexer` at `548dead`, with `main`, `origin/main` and
`origin/HEAD` set to `5bde893`. **Date:** 2026-10-04. A previous re-check run was cut off before it wrote anything;
this one started fresh and reuses none of its artefacts.

This record holds findings and advances no status. It approves nothing, test-verifies nothing on anyone's behalf,
and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, of the same vendor and model family. My independence
from the Author is the independence RFC-2026-024 describes, and no more. Whether this record counts as the Tester
role's signature is for the Integration Owner and the Product Owner to decide, not me.

I fixed nothing. Every mutation and drift was applied in a private clone, run, and then restored. The sha256 of each
file was compared before and after, and every restore matched. My private artefacts are kept outside the repository
in `q0-sqllexr2/` in the run's scratchpad: `cluster.sh`, `round.sh`, `sources.mjs`, `differential.mjs`, `scan.mjs`,
`drifts.mjs`, `mutate.mjs` and every log. I wrote them fresh for this run, independently of A0's scripts.

## 1. Measured vs read

**Measured** with Node `v24.20.0` (checked before each run; a Node 26 is on the PATH and was not used) and
PostgreSQL 17.11 from `/opt/homebrew/bin`. The cluster ran on 127.0.0.1:5503 only, over TCP only
(`-c unix_socket_directories=''`), set up with `initdb --locale=C -A trust -U postgres` and `LC_ALL=C`. The CI shim
ran first, and every round used a fresh initdb. Drifts were APPENDED to `140_audit.sql` and restored byte for byte
(sha256 `2ac596bb950e8dfb...` before and after each one). The cluster was stopped and its data directory removed at
the end.

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs 5bde893 WP-0A-DB-00` | clone, branch name | 0 | "all 20 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | clone, branch name | 0 | "clean: exit 0 -- tests 685, pass 685, fail 0, skipped 0, todo 0" |
| golden test (`--test-name-pattern="one SQL lexer reads every fed source"`) | worktree, `548dead` | 0 | pass 1 |
| round r1: shim, `make db-migrate-clean`, `make db-rls-smoke` twice | worktree, `548dead` | 0, 0, 0, 0 | 30 probe self-tests, each refusing its drift and clean again (the fingerprint probe's new drift included); post-migrate pass 51 apply-time blocks (39 as written, 12 replaced); "1087 isolation case(s) passed" both times; 6 authz claims discharged |
| rebuild of every fed source (`sources.mjs`) | static | -- | 221 rebuilt, 221 recorded; 0 sha256 mismatches, 0 missing from the record, 0 missing from the tree |
| the differential (`differential.mjs`, jsonlog, `log_statement=all`, one `application_name` per source) | fresh cluster | 0 | §3 |
| every fed source through the head's psqlLex (`scan.mjs`) | static | -- | 221 sources (53 migrations): **0 with findings**, **0 held `;`** |
| drifts (`drifts.mjs`), head and previous head | a fresh cluster each | §4 | §4 |
| mutations (`mutate.mjs`) | static | §2 | 13 of 13 red |

**Read, not measured:** CI's result on `548dead` and the PR's state (I did not query them in this run). A0's
re-measurement of the one changed differential row (I re-measured all 221 instead, §3). C0's R5 measurement of 18
names and 15 internal symbols: I checked only that the list has 33 entries and that the test pins
`be_lo_export` at index 18 (the golden test is green). The role runs' findings as the plan quotes them.

## 2. Weakening rules in code: does a corpus case go red?

Each mutation is a single textual edit, applied exactly once (the script refuses an edit whose pattern does not match
exactly once). The named test was run and the file restored, and the sha256 matched on all 13. Unmutated, the golden
test passes (pass 1), as do the identity-isolation view-scan test (pass 1) and the catalog-rule test.

| Id | Rule weakened | Test | Exit | First failing assertion |
|---|---|---|---|---|
| **L14** | `'\v'` removed from `SPACE` (Q0-SL-1) | golden | **1** | the `select\v1\vfrom\vt` tokenization case (it survived on `45893d9`) |
| **L20** | canonical form keeps a quoted identifier as written (Q0-SL-2) | golden | **1** | the new canonical-form assertion (on `45893d9` only another test caught this) |
| M-held | `psqlHeldSemicolons` returns `[]` | golden | 1 | a `held` count |
| M-held-case | `case` no longer counted inside `begin` | golden | 1 | the CASE-inside count |
| M-held-parens | the parenthesis-depth condition dropped | golden | 1 | "a begin inside parentheses is not counted" |
| M-held-orrep | the CREATE OR REPLACE branch dropped | golden | 1 | the OR REPLACE PROCEDURE count |
| M-held-reset | the first-identifiers state not reset at a split `;` | golden | 1 | a `held` count |
| M-held-wire | psqlLex no longer reports held `;` | golden | 1 | the psqlLex message match |
| M-name | the server-file rule put back to "called" only (C0-SL-1) | golden | 1 | the operator case refused |
| M-naming-only | no GRANT/REVOKE/COMMENT exemption | golden | 1 | the GRANT case admitted |
| M-naming-alter | `alter` added to the exemption | golden | 1 | the rename case refused |
| M-view | `viewScanText = (text) => text` (Q0-SL-4, C0-SL-2) | identity-isolation view-scan test | 1 | "the view scan reads: create -- c ..." |
| M-grants | the `--[^\n]*` regex put back in `generate-pinned-grants.mjs` (C0-SL-4) | catalog-rule test | 1 | "the generator strips comments through the lexer" |

Q0-SL-1, Q0-SL-2 and Q0-SL-4 are closed as measured: each mutation that survived, or was caught only elsewhere, on
`45893d9` now turns the named test red. M-held-case, M-held-orrep, M-held-reset and M-naming-alter are my own
additions beyond A0's seven, and each is red.

## 3. The differential, over all fed sources

I rebuilt every recorded source from the tree. That is the 89 `git ls-files '*.sql'`, `CATALOG_RULE_PROBES` with
their drifts, every string export of `run.mjs` that contains a `;`, `harnessScript(paramsFor('small'))` and
`fixtureSql(WS905_SMALL)`. Every rebuilt sha256 equals the recorded one, including the changed fingerprint drift
(`8c0033d6...`). Each source was fed on stdin to psql 17.11 (`-X -q`, no ON_ERROR_STOP), with the shim first, on
one fresh cluster with `log_destination=jsonlog` and `log_statement=all`. Every `statement:` entry was read per
`application_name`. An ERROR whose statement differs from the last logged one counts as a query that failed to
parse. psql's queries (trailing `;` dropped) and the lexer's statements were compared in canonical form, position
by position.

**Result:** 221 sources; psql sent **1897** queries and psqlLex split **1897** statements. There were 0 sources
where the count, the canonical text or the recorded `psql`/`lexer` numbers differ. The server logged 110 ERRORs,
all at run time (0 queries failed to parse). This reproduces the record in full. A0 re-measured only one row this
round, so this run closes A0's not-done item "full 221-source differential not re-run" as far as this tree goes.

**No integrated migration is refused:** round r1 exits 0 at every step, psqlLex reports 0 findings on all 53
migrations and every other fed source, and `npm run verify` (which re-checks every recorded migration's sha256 in
the golden test) passes. In all 221 sources, the only identifier token that names a listed server-file function at
any level sits in a GRANT inside the fingerprint probe's drift, which is exempt by design. No fed source contains
the "literal holding only a server-file name" over-refusal that A0 names as not done.

## 4. Live drifts (appended to `140_audit.sql`, restored; fresh cluster each)

I describe the drifts by shape only. Their exact text is in my private `drifts.mjs`. All of them target a marker
path inside the private directory.

| Drift | On `548dead` (head) | On `45893d9` (control) |
|---|---|---|
| D-op: an operator over the large-object export function, then used | migrate-clean **2**, "140_audit.sql line 1018: ... server-file function named outside a GRANT, REVOKE or COMMENT"; **no marker** | migrate-clean **0**; **marker written** (reproduces C0-SL-1) |
| D-ren: the export function renamed, then called by the new name | **2**, same line and reason; **no marker** | **2**, but only from the system fingerprint after the run; **marker written** |
| D-setschema: the export function moved to another schema, then called | **2**, same reason; no marker | 2 (already refused as a call by name) |
| S-begin: C0's held-`;` input | **2**, "a `;` psql would not end a statement at" | **0** (admitted) |
| S-case: BEGIN ATOMIC with a CASE inside | **2**, held-`;` reason | not run |
| D1-copy: COPY TO a dollar-quoted server path (earlier D1) | **2**, COPY reason; no marker | not run |

The head refuses each of these before anything runs, and reports the line. The control shows the refusals are new
in this round and not an artefact of my harness. My first version of D-op and D-ren created the large object in the
same statement and failed at run time on `45893d9` without writing anything. I corrected it and re-ran it on both
heads, and the table above shows the second run.

## 5. Findings (graded)

| Id | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| Q0-SLR-1 | INFO | plan "Review round", "Measured on this round" | A0 reports "219 fed sources" for the zero-findings scan. The differential record and my rebuild both have 221: the EXPLAIN harness and the WS:911 fixture are included. My scan of all 221 shows 0 findings, so nothing hides behind the difference. Only the count is imprecise. | Say "219 of the 221" or "221" when the plan is next touched. |
| Q0-SLR-2 | INFO | plan, D-op/D-ren row | A0 cites line 1019 for the refusal. In my appends the refusal is at line 1018. The number depends on how the drift is appended (a leading newline or not) and is not a defect. | None. |
| Q0-SLR-3 | INFO | `scripts/db/psql-driver.mjs` NAMING_ONLY | A GRANT that names a server-file function is admitted by the lexer by design. In the one fed source that holds such a GRANT, the system-object fingerprint (an ACL change) is the layer that refuses it at migrate-clean. That is a catalog-layer control, not the lexer's job. I record it so that no one reads the exemption as "safe by the lexer". | None for this batch. It belongs to A1's reading of the layers if one is wanted. |

Q0-SL-1, Q0-SL-2 and Q0-SL-4 are **closed as measured** (§2). Q0-SL-3 is answered by the plan's correction
(wording only). Q0-SL-5 stays a stated limit, unchanged by this round.

## 6. Stop-the-line verdict

**No stop-the-line.** I found no secret exposure, tenant leakage, migration divergence or contract mismatch. Every
integrated migration applies cleanly and none is refused. Isolation stays at 1087 cases, twice. The round only adds
refusals: on the previous head a drift wrote a host file with migrate-clean green, and that drift is now refused by
line before anything runs.

**Does anything block the merge from the Tester's side?** No. Every finding in this record is INFO. The C0 and A1
re-checks of this round, CI on `548dead`, and the Integration Owner's evidence are not mine to judge, and I did not
measure them.

## 7. Limits

- I did not measure CI or the PR state.
- The differential compares both sides through the same lexer's canonical form. It measures where splits fall and
  the word sequence, not the token kinds independently.
- The mutations weaken one rule at a time. Combinations are not tried. I did not test the literal-only over-refusal
  that A0 names as not done, beyond confirming that no fed source contains one.
- A1-RC-4 and the owed-tooling INFO items are out of this re-check's scope.
- I share the Author's vendor and model family (§0).
