# C0 contract review re-check: the sql-lexer batch's review round

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00`, narrow re-check |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-sql-lexer` (PR #177, Draft) |
| Subject head | `548dead` (the handoff, alone and last) over code `286770f`; previously reviewed head `45893d9` |
| Base | `5bde893` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 |
| Reviewed in | local branch `recheck/c0-batch-sql-lexer`, created at `548dead` in my own worktree (`wf_af648896-ae3-1`). The branch-NAME guards ran in a private clone on a branch named exactly `agent/claude/WP-0A-DB-00-batch-sql-lexer` at `548dead`, with `origin/main` set to `5bde893`. Nothing was pushed, and nothing was written to A0's worktrees. A previous re-check run was cut off before it wrote anything, so this one started fresh. |
| Scope | `git diff 45893d9..548dead`; my findings C0-SL-1 to C0-SL-6 in `c0-batch-sql-lexer-contract-review-2026-10-03.md`; the plan's "Review round" section; `open_blockers[185]`'s second append; the refreshed handoff |

This document records review findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf.

## §0 What I am

- I am a subagent **spawned by the Author run `/claude/a0_atlas`** (RFC-2026-024). A0's workflow wrote my brief
  and chose my questions, and I run in a worktree that A0's workflow created.
- I share the Author's vendor and model family (Claude). RFC-2026-024 withdrew the cross-vendor condition, but
  this is still a real limit on my independence.
- The Integration Owner and the Product Owner decide whether this record counts as the Reviewer evidence that
  RFC-2026-002 requires. I do not decide that.

## §1 Verdict

**Each of C0-SL-1 to C0-SL-6 is addressed, and what I re-measured matches what A0 recorded.**

- **C0-SL-1** (server-file names reached under another name) is closed by token position, which was my remedy
  (a).
- **C0-SL-3**: every `;` that psql's begin_depth heuristic would hold is refused. On my 14-input live
  differential, the heuristic matched psql exactly.
- **C0-SL-2 and C0-SL-4** are now pinned. Both mutations go red.
- **C0-SL-5**: the counts are corrected by append.
- **C0-SL-6**: the handoff now records the guards.
- **The blocker edit is a pure append** to `[185]`, and the count is 196 before and after.
- **The guards pass on the branch name.** All three exit 0, and `npm run verify` is 685/685.
- **The live round is green.** migrate-clean and rls-smoke (twice, 1087 cases each) exit 0 on a fresh cluster.

**No stop-the-line. Nothing blocks the merge in my reading.** I record two new INFO items (§4).

## §2 What I measured, and what I only read

Every measured run used Node `v24.20.0`, checked before each run, from `/Users/bank/.local/node-v24.20.0/bin`
first on PATH. The database was PostgreSQL 17.11 from `/opt/homebrew/bin`, on port **5505**, 127.0.0.1 only,
TCP only (`-c unix_socket_directories=''`). Each cluster came from a fresh `initdb --locale=C -A trust -U postgres`
under `LC_ALL=C`, with the CI shim applied first. Afterwards, the cluster was stopped and its data directory
removed, and `lsof` shows nothing listening on 5505. `140_audit.sql` was not modified in this re-check: its sha256
was `2ac596bb950e8dfb…` before and after. Static mutations were restored byte for byte, checked by sha256.
`git status` was clean before this file was written.

| # | Command | Where | Exit | Output |
|---|---|---|---|---|
| R1 | `node scripts/verify-branch-scope.mjs 5bde893 WP-0A-DB-00` | clone, branch NAME at `548dead` | 0 | "all 20 changed path(s) are declared, and every amendment explains one" |
| R2 | `npm run check:handoff` | same | 0 | "describes the branch: nothing substantive after its cited head" (on my own branch name it exits 75, as designed) |
| R3 | `npm run verify` | same, and the worktree | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| R4 | fresh cluster, shim, `make db-migrate-clean`, `make db-rls-smoke` twice | worktree at `548dead` | 0, 0, 0 | 30 probe self-tests refused their drifts (the fingerprint probe's new `pg_sleep` rename drift included); "post-migrate pass: 51 apply-time blocks, 39 re-run as written, 12 superseded and replaced"; "1087 isolation case(s) passed" twice |
| R5 | field-by-field JSON diff of `work-packages/WP-0A-DB-00.json`, `45893d9` vs `548dead` | — | — | only `open_blockers` changed; `[185]` is a pure APPEND (the new text starts with the old); 196 → 196 |
| R6 | split differential (private `splitdiff.mjs`): 14 benign inputs on stdin to psql 17.11 (`-X -q`), `log_statement = all`, the queries psql sent compared with `splitStatements` and `psqlHeldSemicolons` | fresh cluster | — | see the table below |

R6, the split differential:

| Input | psql sent | split | held | Result |
|---|---|---|---|---|
| S-begin (`set search_path = begin`) | 1 | 3 | 3 | refused |
| BEGIN ATOMIC procedure | 2 | 4 | 2 | refused |
| BEGIN ATOMIC with a CASE | 2 | 3 | 1 | refused |
| upper-case `CREATE OR REPLACE FUNCTION … BEGIN` | 1 | 2 | 2 | refused |
| `begin … ; … ; end ;` held, then released | 3 | 5 | 2 | refused; held = the 2 `;` psql merged |
| a quoted `"begin"`; `begin` in parentheses; `create table (begin int)`; `begin` in a dollar body; in a literal; in comments; `create or replace view … as begin`; CASE outside a routine; transaction `begin; … commit;` | equal | equal | 0 | **agree** (9 of 9) |

In every input where `held` is 0, the split equals psql's. Wherever psql merged statements, `held` is non-zero,
so psqlLex refuses the source. Where I could count the merges, `held` equals the number of `;` that psql merged.
In S-begin and upper-case, my end-of-input sentinel was merged as well.

Static mutations (worktree, each restored, sha256 checked; private `mutate.mjs`):

| # | Mutation | Test | Exit |
|---|---|---|---|
| M0 | none (control) | `identity-isolation.test.mjs`, "effective-limit projection" | 0 |
| M-view | `const viewScanText = (text) => text;` | same | **1** (green on `45893d9`, C0-SL-2) |
| M-grants | `generate-pinned-grants.mjs` back to `.replace(/--[^\n]*/g, '')` | `foundation-contract.test.mjs` | **1** |
| M-held-off | psqlLex ignores `psqlHeldSemicolons` | same | **1** |
| M-held-case | the `case` increment removed from `psqlHeldSemicolons` | same | **1** |
| M-naming-only | `NAMING_ONLY = []` | same | **1** |

**Read, not measured:**

- **C0-SL-1's live drifts.** In this re-check I did not re-run D-op or D-ren, or any other spelling that writes a
  host file. My evidence for the closure is:
  - the code: `psql-driver.mjs` `statementFindings`, where a `SERVER_FILE_FUNCTIONS` name as ANY identifier token,
    at every level, is refused unless `kw(0)` is GRANT, REVOKE or COMMENT;
  - the golden cases: an operator, a cast, an aggregate, a rename, SET SCHEMA, OWNER TO, a function created under
    the name, and the operator inside an EXECUTE literal are each refused, and GRANT, a two-name REVOKE and COMMENT
    are admitted. R3 runs these green;
  - M-naming-only going red;
  - R4: no fed source trips the wider rule.

  A0 records D-op, D-ren and S-begin as each exiting 2 with no marker written. I did not re-measure that.
- A0's mutations M-name, L14 and M-held-parens. I ran five of my own, listed above.
- The whole 221-source differential. A0 lists it as not done, and so did I in the first review. A0 re-measured only
  the one fed source it changed (the fingerprint drift, 6 = 6). I did not re-measure that one.
- The review round's "219 fed sources, 0 findings" scan (private to A0). See C0-SLR-I1.

## §3 My findings, disposition by disposition

| Finding | Was | Now | Holds? |
|---|---|---|---|
| **C0-SL-1** (MEDIUM) | closure recorded broader than its evidence; the operator and rename routes admitted | **Remedy (a)**: the name is refused at any token position outside GRANT, REVOKE and COMMENT. These three evaluate no expression and bind nothing; a COMMENT's literal is read again as SQL at the next level anyway. `[185]` appends a CORRECTION naming the earlier over-claim and the new closure, and the README sentences are corrected. My §7 limit (event triggers, type I/O functions) is covered by position, not by statement | **Yes**, on reading and the golden cases (live drifts not re-run here, §2). The over-refusal of a literal holding only a listed name is stated truthfully in the code comment, in `[185]` and in the plan's "Still owed" |
| **C0-SL-2** (LOW) | view scan's lexer reading pinned by nothing | two positives only the lexer reads, two negatives only the lexer clears | **Yes**: M-view red. A0's correction of my suggested negative is right: with every literal read again as SQL, `comment … is 'create view'` spells a view, so it is not a negative |
| **C0-SL-3** (LOW) | split finer than psql's on a bare `begin` in CREATE FUNCTION/PROCEDURE | `psqlHeldSemicolons` mirrors psqlscan.l's begin_depth rule: the first four unquoted identifiers decide CREATE [OR REPLACE] FUNCTION/PROCEDURE; at paren depth 0, `begin` adds one, `case` adds one once inside, `end` takes one away; `paren_depth` never goes below 0; a terminating `;` resets. Each held `;` is refused, not modelled, so a head rule never loses a statement start | **Yes**: on reading against psqlscan.l, R6 (14 of 14 classified correctly; held = merged), and M-held-off and M-held-case red. "Where psqlLex does not refuse, the split is psql's" is true on what I measured |
| **C0-SL-4** (LOW) | `generate-pinned-grants.mjs:109` still a regex | reads through `SQL_LINE_COMMENTS`, pinned by a source assertion | **Yes**: M-grants red; the generated output is unchanged (the pinned-grants test is green in R3) |
| **C0-SL-5** (LOW) | 16 and 17 | 15 internal symbols and 18 names, corrected by append; the test pins `be_lo_export` at index 18 | **Yes**. Plan line 32 stays wrong as written, and the plan's review-round section says so |
| **C0-SL-6** (LOW) | handoff omitted the branch-NAME guards | the handoff records C0's R1-R3 on `45893d9`, `npm run check`, branch scope and commit-when-clean before `286770f`, and r2 on `286770f` | **Yes**. The guard run after the handoff commit cannot be recorded inside that handoff, and the handoff says so. I measured it myself (R1-R3, exit 0) |

**Is every former static reader on the lexer?** Yes, apart from the word rules that the README and `[185]` now name
as patterns: `rls-assertions.test.mjs` (`set_config`) and `run.mjs` §8.5 (`[\s\S]*?\$\$`). This is C0-SL-I2,
recorded as a stated limit.

**Are the closures and limits on blocker 186 truthful?** The append to `[185]` (index 185, the 186th entry) is
pure, and its corrections match what I measured or read. The STILL OWED items are stated with their owner (A0):

- the differential re-run;
- A1-RC-4;
- the owed-tooling INFO items.

The disposition and approval state did not change in this round.

## §4 New findings

- **C0-SLR-I1 (INFO).** The two scans count different source sets:
  - The review round scanned **219** fed sources with the new psqlLex (plan, handoff, `[185]`: "the new refusals
    over every fed source 0").
  - The batch's differential counted **221**.

  The plan does not reconcile the two counts. The operational claim still holds where I measured it: R4's
  migrate-clean and rls-smoke feed their sources through psqlLex, and both exited 0. Remedy: at the owed
  full-differential re-run, use one source set and say which two sources (if any) the 219 omits.
- **C0-SLR-I2 (INFO).** The fingerprint probe's self-test now renames `pg_sleep` instead of `pg_read_file`. The
  shape and the probe are unchanged, and its digest moved with a stated reason. Because of the review round's own
  rule, no fed source can now rename a server-file function in place, and the fingerprint probe no longer
  self-tests on one. This is the intended consequence, not a gap: the static rule now refuses that route before
  anything is applied.

## §5 Stop-the-line verdict

**No stop-the-line.** No finding involves secret exposure, tenant leakage, duplicate side effects, lost jobs,
migration divergence, irreversible deletion or a contract mismatch. **Nothing blocks the merge in my reading.**
The two INFO items can be addressed later.

## §6 Limits of this re-check

- §0 applies: I share the Author's vendor and model family, and A0's workflow set my questions.
- **C0-SL-1's closure was checked by reading the code, by the golden cases and by one mutation.** I did not re-run
  the host-file drifts live in this pass. A0's live exits for D-op and D-ren (2, no marker) are read from A0's
  record.
- R6 covers 14 benign inputs, not psql's scanner source in full. The mirror's reading of psqlscan.l is my own,
  and it is consistent with every measured input.
- I did not re-run A0's full 219- and 221-source scans, or A0's mutations M-name, L14 and M-held-parens.
- Private artefacts (not in the repository), in `c0-sqllexr2/` of the session scratchpad:
  - scripts: `round.sh`, `guards.sh`, `clone.sh`, `mutate.mjs`, `splitdiff.mjs`, `split.sh`, `jdiff.py`;
  - logs: `mutations.log`, `splitdiff.log`, and each run's server and make logs.

  The clone and the cluster data directory were removed.
