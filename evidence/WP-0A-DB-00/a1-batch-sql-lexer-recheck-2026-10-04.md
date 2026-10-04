# A1 Security/Privacy re-check — the sql-lexer batch's review round (WP-0A-DB-00)

- **Reviewer role:** independent Security/Privacy, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-sql-lexer`, PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/177> (Draft), head `548dead` (handoff) over code `286770f`;
  previous reviewed head `45893d9`; base `5bde893` (main). Author `/claude/a0_atlas`.
- **Checked out:** `548dead` into my own branch `recheck/a1-batch-sql-lexer-b`. A previous A1 re-check stopped
  before measuring; this one started fresh and relies on nothing it recorded.
- **Measured on the branch NAME:** a private clone with `agent/claude/WP-0A-DB-00-batch-sql-lexer` checked out
  as a branch (HEAD `548deadd2a66…`, not detached), in my private scratchpad directory, never `/tmp`.
- **Date:** 2026-10-04.
- **This file records findings and advances no status.** It approves nothing, marks nothing reviewed, tested or
  ready, and merges nothing.

## §0 What I am

I am a subagent of `/claude/a0_atlas`, the same run that authored this batch, so I share its vendor and model family.
RFC-2026-024 puts that shared origin on record. This re-check is **not** the independent human sign-off a gate
requires. Whether a role run counts as the role's signature is for the Integration Owner and the Product Owner
to decide. Each item below says whether I **measured** it (I ran it) or **read** it (I read it in the tree).

## §1 Scope

The scope is verification only. I checked my own earlier findings F1 and F2
(`a1-batch-sql-lexer-security-review-2026-10-03.md`) and the two security-relevant C0 corrections, C0-SL-1 and
C0-SL-3, against the plan's "Review round (2026-10-04)" section. Then I ran the repo's declared guards and the live
DB targets. I wrote no new attack payloads. The live drifts below are C0's D-op and D-ren as recorded in
`c0-batch-sql-lexer-contract-review-2026-10-03.md` §2, and every static input is already in the golden corpus.

## §2 What changed, from the diff `45893d9..286770f` (read)

| Item | Change in the code |
|---|---|
| **C0-SL-1** (server-file aliases) | `scripts/db/psql-driver.mjs` `statementFindings`: the rule used to refuse a `SERVER_FILE_FUNCTIONS` name only when `(` followed it and FUNCTION did not precede it. Now any identifier token with that name is refused, at every level, unless the statement's first keyword is in `NAMING_ONLY = ['grant','revoke','comment']`. A call keeps its old message, and any other position gets "a server-file function named outside a GRANT, REVOKE or COMMENT". The fingerprint probe's rename drift (`run.mjs`) moved from `pg_read_file(text)` to `pg_sleep(double precision)`, and its digest moved with it (`6a533b62eacf2022` → `f75c1e00bd908cd5`). The owed-tooling test that admitted `alter function pg_catalog.pg_read_file(text) rename to probe_x` now expects a refusal. The golden test adds the operator, cast, aggregate, rename, SET SCHEMA, OWNER TO and same-name CREATE FUNCTION cases, plus an operator inside an EXECUTE literal, all as refusals. It admits GRANT, a two-name REVOKE and COMMENT. |
| **C0-SL-3** (psql's held `;`) | `scripts/db/sql-lexer.mjs` gains `psqlHeldSemicolons(tokens)`, which mirrors psqlscan.l's begin_depth heuristic. A statement whose first unquoted identifiers are CREATE [OR REPLACE] FUNCTION/PROCEDURE counts `begin` (+1 at paren depth 0), `case` (+1 once inside) and `end` (−1). The function returns every top-level `;` psql would hold. At depth 0, `psqlLex` turns each one into a refusal: the split is refused, not modelled. Six `held` counts and one psqlLex refusal are pinned in the golden test. |
| **F1** (view-scan mutation unmeasured) | `tests/db/identity/identity-isolation.test.mjs` adds two positives only the lexer reads (`create -- c\nview …`, `create --\r or replace view …`) and two negatives only the lexer clears (`select 1 -- create view v`, `create table "create view" (x int)`). |
| **F2** (VERIFICATION.md hand-rendered) | Nothing changed, and nothing was owed. I check the recorded figure against a fresh run below. |

The other changes are evidence, the README, the manifest append and integrity digests. They are C0-SL-4
(`generate-pinned-grants.mjs` reads through `SQL_LINE_COMMENTS`), C0-SL-5 (counts), Q0-SL-1/2 (golden cases) and the
`test-kits/db/sql-lexer-differential.json` row for the changed fingerprint drift. `286770f..548dead` touches only
`handoffs/WP-0A-DB-00-author-handoff.json` (read: `git diff --stat`).

## §3 Measured

Every run used Node `v24.20.0` (`node -v` before each run, `/Users/bank/.local/node-v24.20.0/bin` first on PATH).
PostgreSQL was 17.11 from `/opt/homebrew/bin`, run on **127.0.0.1:5501** over TCP only
(`-c listen_addresses=127.0.0.1 -c unix_socket_directories=''`). Each cluster was a fresh
`initdb --locale=C -A trust -U postgres` under `LC_ALL=C`, with `db/foundation/ci/supabase-shim.sql` applied
first, and stopped and removed at the end of its run.

### 3.1 Guards on the branch name (private clone)

| Command | Exit | Output |
|---|---|---|
| `npm run verify` | 0 | `clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0` |
| `npm run check:handoff` | 0 | "handoffs/WP-0A-DB-00-author-handoff.json describes the branch: nothing substantive after its cited head" |
| `node --test --test-name-pattern="one SQL lexer" test-kits/db/foundation-contract.test.mjs` (the golden corpus) | 0 | tests 1, pass 1, fail 0 |

**F2:** `evidence/VERIFICATION.md` records tests 685 and pass 685. That matches the fresh `npm run verify` above,
so the hand-rendered record is still accurate at this head.

### 3.2 Each fix reverted locally, the static suite run, then restored byte for byte

I used a private harness, `mutate.mjs`. It replaces one anchor, which must match exactly once, runs the named test,
and writes the original bytes back, comparing sha256. `git status` in the clone was empty afterwards.

| Mutation | Reverts | Test | Exit | First failure |
|---|---|---|---|---|
| M0 (control, nothing changed) | — | golden, argv-ceiling, effective-limit | 0, 0, 0 | — |
| **M-name**: the rule back to "called" (`(` must follow, FUNCTION exemption restored) | C0-SL-1 | golden | **1** | `refused: "create operator public.### (… function = pg_catalog.lo_export);"` |
| M-name | C0-SL-1 | argv-ceiling | **1** | `"alter function pg_catalog.pg_read_file(text) rename to probe_x;": 1 meta-command(s)` |
| **M-naming-only**: the GRANT/REVOKE/COMMENT exemption removed | C0-SL-1 (its boundary) | golden | **1** | `admitted: grant execute on function pg_catalog.pg_read_file(text) to authenticated;` |
| **M-held-driver**: psqlLex no longer refuses a held `;` | C0-SL-3 | golden | **1** | psqlLex output no longer matches /a \`;\` psql would not end a statement at/ |
| **M-held**: the heuristic never holds a `;` | C0-SL-3 | golden | **1** | `Expected values to be strictly equal` (the S-begin count 3) |
| **M-held-parens**: `begin` counted inside parentheses | C0-SL-3 (its boundary) | golden | **1** | `a begin inside parentheses is not counted` |
| **M-view**: `viewScanText = (text) => text` | F1 | effective-limit projection | **1** | `the view scan reads: create -- c …` |

Every file was restored byte-identical: `psql-driver.mjs` `0f691469f0bdf2ad…`, `sql-lexer.mjs` `69f43b6285803621…`,
`identity-isolation.test.mjs` `ba86d54e30cba78b…`. On `45893d9`, C0 measured M-view green. It is red now, so
**F1 is closed**.

### 3.3 Live, fresh cluster each

| Run | Result |
|---|---|
| r1: `make db-migrate-clean`, then `make db-rls-smoke` twice | 0, 0, 0. 30 probe self-tests refused their drifts and were clean again, including the fingerprint probe's moved rename drift. Post-migrate pass: 51 apply-time blocks (39 re-run as written, 12 superseded and replaced). 1087 isolation cases each time. |
| r2: a second fresh cluster, the same three targets | 0, 0, 0. The same 30, the same 51/39/12, and 1087 each time. |
| **D-op** (C0's operator over `lo_export`) appended to `140_audit.sql`, `make db-migrate-clean` | `make` exit **2** (`run.mjs` failed in 132 ms) with "140_audit.sql line 1019: … a server-file function named outside a GRANT, REVOKE or COMM…". The marker file was **not** written. On `45893d9`, C0 measured migrate-clean 0 with the file written. |
| **D-ren** (C0's rename of `lo_export`, then a call by the new name), the same way | `make` exit **2**, the same line and message. The marker was **not** written. On `45893d9`, C0 measured the file written before the fingerprint refused. |

After each drift, `140_audit.sql` was restored and its sha256 compared: `2ac596bb950e8dfb` before and after,
byte-identical. At the end, `lsof -iTCP:5501` showed nothing listening, the data directories were gone, and the
clone's `git status` was empty.

**C0-SL-1 is closed** as the manifest append words it. Static: M-name and M-naming-only are each red. Live: the
two writes C0 measured are now refused before anything is applied. **C0-SL-3 is closed as a refusal**: three
mutations are red, and a held `;` is refused rather than split differently from psql. I did not re-feed S-begin
to psql live. Its psql-side count (1 query) is C0's measurement, and the lexer side is pinned in the golden test
(count 3) and measured red above.

## §4 Findings

**No stop-the-line. Nothing blocks the merge on the Security/Privacy dimension.**

| ID | Grade | Status |
|---|---|---|
| F1 (view-scan mutation unmeasured) | INFO | **Closed.** M-view is red (measured). |
| F2 (VERIFICATION.md hand-rendered) | INFO | **Closed as accurate.** 685/685 is re-measured. The provenance note stands as recorded. |
| C0-SL-1 (server-file aliases) | was MEDIUM (C0) | **Closed.** Golden, M-name and M-naming-only are red, and D-op and D-ren are refused live with no marker (measured). |
| C0-SL-3 (psql's held `;`) | was LOW (C0) | **Closed as a refusal.** Golden, M-held-driver, M-held and M-held-parens are red (measured). |

Observations only (not findings):

- **R-1 (read):** `NAMING_ONLY` admits `grant execute on function pg_catalog.pg_read_file(text) to authenticated`
  lexically, and it did so before this round as well, since FUNCTION preceded the name. Granting a server-file
  function to a client role is a privilege change, not a lexical alias. The live system object fingerprint is
  what refuses it: its own drift grants on `pg_ls_dir` and expects `[changed]`, and r1/r2 show that self-test
  refusing. This round introduces no regression here. I record it so nobody reads the lexer as the guard on GRANTs.
- **R-2 (read):** `psqlHeldSemicolons` counts `case` only once `begin_depth >= 1`. My reading of psqlscan.l is
  that psql may count a `case` at depth 0 inside CREATE FUNCTION too, and I did not verify that against the
  psqlscan.l source, which is not in the tree. CASE and END pair in valid SQL, so the two counts return to the
  same value at every `;` I could construct from the corpus. If they ever diverged, the only effect would be a
  source psql sends merged that the server then rejects. That needs no new payload, and I wrote none.
- **R-3 (read):** the over-refusal of a literal that holds only a server-file name (`where proname = 'lo_export'`)
  fails closed, and the plan's "Still owed" records it. This is correct for security.

## §5 Stop-the-line verdict

**Stop-the-line: NO. Blocks the merge: NO** (Security/Privacy dimension). Nothing I read or measured at `548dead` /
`286770f` reaches a secret, another tenant, a host file, a program, a lost job, migration divergence or a contract
mismatch. The two writes C0 measured on `45893d9` are now refused before anything is applied. The merge still needs
the other role re-checks and the Integration Owner and Product Owner acts under RFC-2026-002. This file grants none
of them.

## §6 Limits

- The guarantee is **lexical**. Meaning (search_path resolution, what a GRANT widens) and run-time-computed text
  (`format()`, concatenated `EXECUTE`) stay with the live catalog probes, as recorded in my 2026-10-03 review §5.
  I re-ran those probes only through `migrate-clean`'s self-tests.
- I did not re-run the full 221-source differential. I relied on the golden corpus, my mutations and the two live
  drifts. The Author re-measured only the one changed drift (6 sent / 6 split, read in the plan).
- I did not measure S-begin live (see §3.3), and I did not read psqlscan.l's source (R-2).
- Private artefacts are in my scratchpad `a1-sqllexr3/`: `mutate.mjs`, `round.sh`, `drift.sh` and each log. They
  are not committed.
- I am a same-family subagent of the Author (RFC-2026-024). This is a recorded re-check, not an independent human
  sign-off.
