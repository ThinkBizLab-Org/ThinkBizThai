# Q0 independent test re-check of batch rfc-text's review round (PR #179)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-text`, head `eaf92dd` (the handoff refresh, last and alone), over
the evidence commit `6613697` and the code commit `a35a619`, base `88a6670` (`main`). **Author:** `/claude/a0_atlas`.
**Previous reviewed head:** `54f5dd0`. My earlier record: `q0-batch-rfc-text-test-review-2026-10-03.md` (here as `ba4c654`).
**PR:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/179 (Draft, OPEN, not merged; head `eaf92dd`).
**Tested on:** my own branch `recheck/q0-batch-rfc-text`, created at `eaf92dd`. The repository commands ran on the branch
NAME (§1.1).
**Date:** 2026-10-05. The file name carries the phase's date (2026-10-03), as the batch's other records do.

This is a NARROW re-check of the review-round corrections. It records findings. It advances no status, approves nothing,
test-verifies nothing on anyone's behalf, and decides nothing that the Integration Owner, A1 or the Product Owner holds. It
repairs nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and the same vendor and model family as the Author. A0's
workflow wrote my brief, chose the questions, the port and the output file, and A0 wrote the change under test. My
independence is the independence `RFC-2026-024` describes, and no more. Whether this record counts as the Tester role's
signature is for the Integration Owner and the Product Owner to decide, not me.

## 1. Measured versus read

**Setup for every measured run:** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), printed before each run; the PATH
Node 26 was not used. PostgreSQL 17 from `/opt/homebrew/bin`. A fresh `initdb --locale=C -A trust -U postgres` for every
round (r1-r5), on 127.0.0.1:**5503** only, TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`; the shim
`db/foundation/ci/supabase-shim.sql` first (exit 0 every round); `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
Private directory `scratchpad/q0-rfc-textr2/`. I touched no other port. Every drift was appended to
`db/foundation/migrations/140_audit.sql` and restored from a private copy; sha256 `2ac596bb950e8dfb…` before and after every
round. Each cluster was stopped and its data directory removed; at the end `pg_isready -h 127.0.0.1 -p 5503` printed "no
response". `git status --porcelain` was empty before I wrote this file. Nothing was pushed.

**Measured:** the four repository commands on the branch name (§1.1); both database layers on an untouched tree (r1);
a hand implementation of RFC-2026-026 §8.1/1 (a)-(c), (e) as revised, using the repository's own lexer
(`scripts/db/sql-lexer.mjs` `walkLevels`, `word`, `keyword`) over `pg_get_functiondef`, applied to the catalog after
`migrate-clean` (`rule.mjs`), on a clean tree and under nine drifts (r2-r4); RFC-2026-027 §5/6 with the gate absent (r5);
the cherry-pick, blocker, line-pin, digest, handoff and commit claims (§4); the PR's CI state.

**Read, not executed:** RFC-2026-026 §3.3/2-4, §3.4, §3.7, §10 and §10.1 as rewritten; §8.2/17 and /21's new arms. There is
still no command function, no `RFC-2026-023` helper and no worker identity to run them against.

### 1.1 Repository commands, on the branch NAME

The branch is checked out in other worktrees (`wf_bb3eb819-b4c-1`, `-5`, `-7`). I ran
`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-rfc-text` in my own worktree; `git branch --show-current`
printed that name and HEAD was `eaf92dd5766a595f9a07e5180f4f285bcbbe7561`. I committed nothing there and switched back to
`recheck/q0-batch-rfc-text` before any drift and before writing this file.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 88a6670 WP-0A-DB-00` | 0 | "all 12 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `npm run check` | 0 | tests 685, pass 685, fail 0 |

`gh pr view 179`: Draft, OPEN, not merged, head `eaf92dd`, check `bootstrap` COMPLETED / SUCCESS. So C0-RT-7's bar (a green
run on the reviewed head) is met on `eaf92dd`.

### 1.2 Database layers

Nothing a database layer reads changed in the review round: `git diff 54f5dd0..eaf92dd` touches two RFCs, four evidence files,
the handoff, the integrity manifest and `open_blockers[195]`. The whole batch touches only the coverage map's `line` fields in
`db/`. I ran the layers once anyway (r1): `make db-migrate-clean` exit 0 ("51 apply-time blocks, 39 re-run as written, 12
superseded and replaced"); `make db-rls-smoke` exit 0 ("1087 isolation case(s) passed"; "db-authz-proofs: ok — 6 claim(s)
discharged by execution").

## 2. My earlier findings, one by one

| ID | Then | Now | How I know |
|---|---|---|---|
| F1 (MEDIUM) | §8.1/1 read `prosrc`; a `BEGIN ATOMIC` body made through `EXECUTE` in a `DO` block passed (a)-(d) | **closed in the text**; the driver change is owed and recorded (§9/4, `[195]`) | r2: `app.q0_d4` (`prosqlbody` set, `prosrc` length 0) migrated clean (exit 0) and is selected by (a) through `pg_get_functiondef` |
| F2 (LOW) | bare `audit_logs` unspecified | **closed** | r2: `app.q0_d3` (`set search_path = app, pg_catalog`, unqualified) selected by (a) |
| F3 (LOW) | (a)-(c) read `app`/`private` only | **closed** | r2: `public.q0_d2a` and `q0s.q0_d2b` (a schema the drift created) selected by (a); the 36 `extensions` functions are extension members (`deptype = 'e'`, measured) |
| F4 (LOW) | (d)'s drift refused by the pinned trigger probe first; drifts used triggers | **closed for triggers** (see R3 for the same shape with SECURITY DEFINER) | r4: the fourth trigger on `app.audit_logs` exits 2 with the pinned trigger probe's message (and 140's own trigger probe's); the r2 drifts carry no trigger on a table in `app`/`private` and migrate clean |
| F5 (LOW) | RFC-027 §5/6 not discriminating for editor/viewer | **closed** | r5: with the gate absent, in `access_blocked`, the owner reads own 1 / others **2**, the editor 1 / 0. Asserted as the owner, pre-asserted in `active` (others 2), the case fails without the gate |
| F6 (INFO) | /21 missing the unset arm | **closed** (read) | §8.2/21 now holds "refused, and not by `42704` or `22P02`" |
| F7 (INFO) | no place for a reader | **closed**, with a residue (R6) | read |
| F8 (INFO) | — | no change needed; none made | — |
| F9 (INFO) | "FOURTEEN" in `[195]`'s head | **closed** in the append ("SIXTEEN, fifteen answered and Q-026-10 UNANSWERED") | measured (§4) |

## 3. Are the revised obligations executable, and would each fail without its mechanism?

### 3.1 RFC-2026-026 §8.1/1, applied by hand to the catalog

`rule.mjs` reads every function in a non-system schema or at OID ≥ 16384, excluding extension members, tokenises
`pg_get_functiondef` with `walkLevels`, and applies (a), (b), (c) and (e) as the text words them. The pinned producer set is
empty today; in r2 I pinned a stand-in `app.q0_producer`.

| Round | Tree | `migrate-clean` | Functions read | (a) | (b) | (c) | (e) |
|---|---|---|---|---|---|---|---|
| r1 | clean, after `rls-smoke` | 0 | 18 (`app` 9, `private` 8, `auth` 1) | none | none | none | none |
| r5 | clean, no `rls-smoke` | 0 | **14** (`app` 9, `private` 4, `auth` 1) | none | none | none | none |
| r2 | drifts 1 (invoker), 2 (`public` and a new schema `q0s`), 3, 4, 5, 6 (concatenation and `return query execute`), 7, a stand-in producer, a rewrite rule R1, a benign message FP | **0** ("52 apply-time blocks, 40 re-run") | 24 | `q0_d1a`, `q0_d2a`, `q0_d2b`, `q0_d3`, `q0_d4 [BEGIN ATOMIC]` | `q0_d5` **and `q0_producer` itself** | `q0_d6a`, `q0_d6b`, `q0_fp` (false positive, fail closed as the text says) | `q0s.t.q0_d7` |
| r3 | drift 1's SECURITY DEFINER form | **2**: the security definer probe, "app.q0_d1b() [not a pinned SECURITY DEFINER function]" | 15 | `q0_d1b` | — | — | — |
| r4 | drift 8 (fourth trigger on `app.audit_logs`) | **2**: the pinned trigger probe's "unpinned: CREATE TRIGGER q0_d8 …" | 14 | — | — | — | — |

So each part, as the text now words it, selects its drift, and each would fail without its mechanism: drop the full-definition
read and r2's `q0_d4` passes; drop bare-name matching and `q0_d3` passes; drop the `userObject` scope and `q0_d2a`/`q0_d2b`
pass; drop (e) and `q0_d7` runs unseen. Three defects remain (R1-R3 below).

Two further probes of (c)'s claim that refusing the `execute` token "keeps them decidable": `query_to_xml` and `ts_stat`
take a query string and run it, with no `execute` token. Both refused a writable-CTE `INSERT` (r1, r2: "SELECT is not allowed
in a non-volatile function"; 0 rows written). I found no write through a query-string built-in without `execute`. I did not
search exhaustively.

### 3.2 RFC-2026-026 §8.2/17 and /21 (read)

- **/17's new arm** (a `business`-scoped member names its covered business and another tenant's page). It is executable once a
  command whose signature admits a page argument exists. It is discriminating: a producer that took the page from its input
  would record the other tenant's page, and the case asserts the changed row's page.
- **/21's unset arm.** With `app.workspace_id` unset, `nullif(current_setting('app.workspace_id', true), '')::uuid` is null.
  So `workspace_id = null` refuses under RLS. A term written without `missing_ok` raises `42704`, and one without `nullif`
  raises `22P02`. Both are named, and with the confinement term missing the row is admitted. The arm is discriminating.

### 3.3 RFC-2026-027 §5/6

r5 re-measured: see F5 in §2. With the rewrite, the case fails on today's tree, where the gate is absent. That is the
intended failure.

## 4. Are the claims in the commits, plan, disposition, blocker edit and handoff true?

| Claim | Where | Verdict |
|---|---|---|
| `cherry-pick -x`: C0 `42cdab1`→`98cc81c`, A1 `89ee445`→`3720c85`, Q0 `8edc15a`→`ba4c654` | plan §6.1, handoff | **true**: `git patch-id --stable` equal for each pair; each message carries "cherry picked from commit" |
| `open_blockers[195]` appended. The old text is a strict prefix. The other 196 entries are byte-equal. The line count is unchanged, so no pin moves. | `a35a619`, plan, handoff | **true**: 197 entries before and after. Only index 195 differs; the prefix holds, and 2,842 characters were appended. Every other manifest field is equal. 460 lines before and after. `"open_blockers"` is on line 253. All 33 coverage-map pins satisfy `line = 254 + index`, with each quote on its line. The coverage map is unchanged in the round. |
| The append's content: the correction, Q-026-10, "SIXTEEN, fifteen answered", the §8.1/1 changes, the owed driver change, A1 F5 | `[195]` | **true** (read against the RFC diff) |
| Integrity manifest regenerated, 90 digests | plan §6.4 | **true**: 90 digests. The two RFC digests equal `shasum` of the files (`769e6c52…`, `c431cf0b…`). `npm run check` is green. |
| All three commits went through commit-when-clean, and none is a plain commit | brief, handoff | **true** per A0's private logs (`cwc1-3.log`: `a35a619`, `6613697`, `eaf92dd`, each "clean: exit 0 — tests 685"). The first refused handoff commit, refused by the ratchet, has no log I could find (read, not verified). |
| `head_revision` is `6613697`, already on the path, so no repoint is needed | `eaf92dd`, brief | **true**: `head_revision_or_patch_checksum` is `66136970…`, an ancestor of `eaf92dd`; `check:handoff` exit 0 |
| `verify-branch-scope` at `a35a619`: "all 12 changed path(s)" | plan §6.4 | consistent: 12 at `eaf92dd` too (§1.1) |
| A pushed fast-forward `54f5dd0..eaf92dd`; PR #179 still Draft and OPEN | brief | **true**: PR head `eaf92dd`, Draft, OPEN, `mergedAt` null |
| "on a clean `migrate-clean` it selected nothing, out of 18 functions in scope" | RFC-026:568-569; plan §6.3 r1 and r4 | **not exact**: see R4. A clean `migrate-clean` leaves **14**. A0's own `round.sh` reads the rule after `rls-smoke`, which adds four `private.as_*` functions. |
| Q-026-10 re-opened; §10.1 no longer records "not recorded" as the Owner's answer; both Status lines still Proposed | RFC-026 Status, §3.3/4, §3.4, §3.7, §10, §10.1 | **true** (read). The Q-026-4 row no longer names the unreachable-workspace class. |

## 5. New findings

| ID | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| R1 | **LOW** (measured, r2) | `architecture/decisions/RFC-2026-026-audit-row-producer.md:525-527` with `:503` | (b) "No function read names a producer function" now reads `pg_get_functiondef`, whose header `CREATE OR REPLACE FUNCTION app.<producer>(…)` names the producer itself. Applied as written, (b) selected the stand-in producer `app.q0_producer` as well as its caller `q0_d5`. So once the first producer lands, (b) refuses every producer. Under `prosrc` this did not happen; F1's fix introduced it. It fails closed. | Word (b) as "names a producer function **other than itself**". Or tokenise the body (`prosrc`, or `pg_get_function_sqlbody` for `BEGIN ATOMIC`) for (b) and keep the full definition for (a)/(c). Add a self-test that a catalog with exactly one pinned producer and no caller is green. |
| R2 | **LOW** (measured, r2) | `RFC-2026-026…:490-501` (read point), `:543-544` (e); `scripts/db/run.mjs` `REWRITE_RULE_PROBE_SQL` (`nspname in ('app', 'private')`) | A rewrite rule is the trigger-free way for a table write to produce an audit row. `create rule q0_r1 as on insert to q0s.r do also insert into app.audit_logs …`, on a table in a schema the drift created, migrated clean (exit 0). The rewrite rule probe reads `app`/`private` only. §8.1/1 reads `pg_proc` and `pg_trigger` only, so (a)-(e) see nothing. Writing `q0s.r` as superuser ran the action's `INSERT` into `app.audit_logs`; only the `action_category` CHECK on my placeholder value stopped it. The rule's action runs with the rights of its table's owner. The migration owner is the superuser `postgres`, which owns `app.workspaces` and `app.audit_logs` (measured, r1), so RLS does not apply to that action. This is the rules counterpart of A1 F2's (e). | Add (f): no rewrite rule other than a view's `_RETURN` on any user relation (`userObject`, extension members excepted), or none whose action names an audit table or a producer. Or widen `REWRITE_RULE_PROBE_SQL` to `userObject`. Add the drift as a ninth self-test. |
| R3 | LOW (measured, r3) | `RFC-2026-026…:553-554` (drift 1's second form), `:547-551` | "The same body made `SECURITY DEFINER` — (a), whatever the SECURITY DEFINER probe says." On `migrate-clean` the security definer probe refuses it first (exit 2: "not a pinned SECURITY DEFINER function"). So a self-test that must assert "the rule's own refusal text" cannot see (a) bite through `migrate-clean`. This is the shape Q0 F4 found for triggers, and the text fixed it for triggers only. | Say that the SECURITY DEFINER form is held first by the security definer probe and assert that probe's message, as (d) now does. Or run (a)'s self-test against a catalog built without that gate. |
| R4 | INFO (measured, r1/r5; A0's `round.sh` read) | `RFC-2026-026…:568-569`; `a0-batch-rfc-text-plan-2026-10-03.md:140` and §6.3's r4 note | "On a clean `migrate-clean` it selected nothing, out of 18 functions in scope." After `migrate-clean` alone there are **14** (`app` 9, `private` 4, `auth` 1). 18 is the count after `rls-smoke`, which adds four `private.as_*`. A0's `round.sh` runs the rule after `rls-smoke`, so r4's note that those four were "made after the rule's read point" is not what the script did. The selection (none) is right either way. | Correct the count to 14 after `migrate-clean`, or say "after `rls-smoke`". The rule's stated read point is "after `migrate-clean`". |
| R5 | INFO (measured, r1; read) | `RFC-2026-026…:503-509`, `:528-536` | Because `walkLevels` reads every string literal as SQL, a definition with a JSON or apostrophe-bearing literal yields lexer refusals. `rls-smoke`'s `private.as_anonymous`, `as_user` and `as_service` yield 1-2 each. No migration function does today (r5: 0). The text does not say what a refusal in a definition does to (a)-(c). | State it: fail closed, with the function to the pinned exemption list, or not counted. Add a self-test with a JSON literal in a function body. |
| R6 | INFO (read) | `RFC-2026-026…:516-521` (reader list), `:525` (b), `:543` (e) | The pinned reader list is held to "writes none" by review only. (b) covers callers of producers, not of readers, so a trigger function may call a reader-list function. (e) catches only a trigger running the reader directly. | Require each reader to be `STABLE` or `IMMUTABLE` (PostgreSQL refuses a write in a non-volatile function), or extend (b) to reader-list names. |

None of R1-R6 is in effect anywhere. Each is a defect in a Proposed text's owed lint, or a count. No migration, policy or grant
changed.

## 6. Stop-the-line verdict

**No stop-the-line.** The review round changes the text of two Proposed decision records, a blocker append, the handoff,
evidence and two digests. Nothing is applied to any instance. There is no secret exposure, tenant leakage, duplicate side
effect, lost job, migration divergence, irreversible deletion or contract mismatch. Both database layers are green on the
tree, the repository commands are green on the branch name, and CI is green on `eaf92dd`.

**Does anything block the merge?** From the Tester's side, nothing I found blocks merging this Proposed text under the standing
delegation. My F1-F7 and F9 are acted on. R1-R3 are owed to §8.1/1's text before RFC-2026-026 is **approved**, or at the
latest by the batch that writes the lint. R1 would make the lint red on its first producer, and R2 is a write path no part of
the rule reads. They can be corrected in this PR or held on `open_blockers[195]` by name; that choice belongs to the Author and
the Integration Owner. Q-026-10 stays A1's and the Owner's. The C0 and A1 re-checks, and the Integration Owner evidence that
`[188]` holds, are not mine to waive.

## 7. Limits

- Same vendor and model family as the Author, and a subagent of its run (§0).
- `rule.mjs` is my hand application of §8.1/1's words using the repository's lexer, not the rule. Its choices are mine: every
  identifier token counts as "naming", `execute` is matched as an unquoted `ident` token at any level, and aggregates are
  skipped (none exist in scope). The rule's implementer may read the text differently.
- §8.2/16-21 and §3.3/§3.7's policies were read, not executed.
- The dynamic-SQL probe covered `query_to_xml` and `ts_stat` only.
- A0's private logs (`a0-rfc-textr2/`) were read for the commit and round-script claims. I did not re-measure A0's pre-commit
  states.
- Private artefacts (not in the repository), under `scratchpad/q0-rfc-textr2/`: `round.sh`, `rule.mjs`, `claims.mjs`,
  `repo-cmds.sh`, `drifts/r2.sql`-`r4.sql`, `r1-extra.sql`, `r2-extra.sql`, `r5-extra.sql`, and the logs `r1-*` to `r5-*`,
  `check.log`, `verify.log`, `scope.log`, `handoff.log`.
