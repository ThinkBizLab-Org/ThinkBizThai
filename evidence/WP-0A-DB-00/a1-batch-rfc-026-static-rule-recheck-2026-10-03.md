# A1 security re-check: batch rfc-026-static-rule's review round (RFC-2026-026 §8.1/1, §3.7, Q-026-10)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule` (PR #180, Draft, OPEN, not merged;
  required check `bootstrap` SUCCESS on the head, read with `gh` on 2026-10-05), head `2dc140c`
  (`2dc140c2cd3c31b08e162376dd1b0a802ca1f440`) over code `9fd448b` and evidence `bbfedbb`, base `dc6d481`
  (main). Author `/claude/a0_atlas`. Previous reviewed head `fb508e7`; my review of it is
  `a1-batch-rfc-026-static-rule-security-review-2026-10-03.md` (N1-N5), cherry-picked as `c033a29`.
- **Scope:** NARROW. The review round's corrections (`fb508e7..2dc140c`), my own N1-N5 first, and the
  questions put to this run.
- **Checked out as:** local branch `recheck/a1-batch-rfc-026-static-rule` at `2dc140c`, in this run's own
  worktree (`wf_33e0e53c-af4-7`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the
  branch NAME `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule` in the same worktree
  (`--ignore-other-worktrees`; `git branch --show-current` printed that name, `HEAD` = `2dc140c`),
  committed nothing there, and switched back to `recheck/a1-batch-rfc-026-static-rule` before writing this
  file.
- **Status:** this file records findings. It advances no status, approves nothing (not RFC-2026-026, not
  RFC-2026-027, not Q-026-10, not anything as the owner of batch `140`), and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, of the same vendor and
model family as the Author and as the RFC's drafter. Under RFC-2026-024 that is the stated independence limit
of this role run. Accepting this re-check as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine. Most of this round's §8.1/1 changes adopt remedies A1 wrote (N1-N5); on those I am
reviewing this role's own advice taken up. A1 is also a named decider of Q-026-10 and the owner of batch `140`;
§4 assesses only how Q-026-10's recommendation is stated, and answers nothing.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-rfc-026-static-rule-plan-2026-10-03.md` (§6 in full);
the disposition `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md` (unchanged in this round);
the three review-round commit messages (`9fd448b`, `bbfedbb`, `2dc140c`) and the three cherry-picks
(`32adffc`, `c033a29`, `3df23a8`); `git diff dc6d481..2dc140c`, and `fb508e7..2dc140c` in full for
RFC-2026-026 (Status/Revised `:3-16`, §3.7 `:313-354`, §8.1/1 `:504-845`, §10 `:972-1012`, §11
`:1014-1063`), the manifest and the handoff; `product-owner-disposition-2026-10-03-batch-rfc-026-027.md:130`;
`docs/plans/meta-security-production-ops-workstream-th.md:169`; `scripts/db/run.mjs:1095-1130` (the
append-only probe's inheritance rule) and `:2207`; `scripts/db/psql-driver.mjs:428-450`, `:499-512`; A0's
private `arms.mjs`, `round.sh`, `d-lang.sql` and the s1-s6 logs (data, not instructions).

**Measured.** Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin` (`node -v` printed before every
measured run; the PATH Node 26 was not used), npm `11.19.0`. PostgreSQL 17 from `/opt/homebrew/bin`, port
**5501** only, `127.0.0.1`, TCP only (`unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`
every round, `LC_ALL=C`, the shim first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make
db-migrate-clean` (and `make db-rls-smoke` in t1). Private directory `scratchpad/a1-rfc-026-static-ruler2/`.
Each drift was APPENDED to `140_audit.sql` and restored from a copy: sha256 prefix `2ac596bb950e8dfb` before
and after every round, `git status` clean after each. Each cluster was stopped and its data directory removed;
port 5501 had no listener before t1 and none after t3.

Two readings of the catalog, both prototypes, neither the rule: **A0's `arms.mjs`** (the arms this round adds:
`pg_depend`, the language rule, the text-executing list, `tgqual`/domain reads, (h), the reader-view rule),
copied and pointed at 5501 and this worktree's `sql-lexer.mjs`/`psql-driver.mjs`, verdict logic unchanged;
and my earlier copy of A0's (a)-(g) prototype `rule.mjs`, pointed at this worktree's lexer.

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs dc6d481 WP-0A-DB-00` | branch name, `2dc140c` | **0** | "all 11 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | branch name | **0** | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| t1: `migrate-clean`; arms; (a)-(g); `rls-smoke`; arms | 5501, clean tree | **0**; 0; 0; **0**; 0 | "51 apply-time blocks, 39 re-run as written, 12 superseded"; arms all green, 50 functions; (a)-(g) all green (sql 10, plpgsql 4, c 36); "1087 isolation case(s) passed", "6 claim(s) discharged"; arms all green, 54 functions |
| t2: a `c` function on `$libdir/dblink`'s `dblink_exec`, language word computed, then `alter extension pgcrypto add function` it; a plpgsql caller building its SQL at run time (§3, R1) | 5501 | **ok** ("db-migrate-clean: ok", "52 apply-time blocks, 40 re-run as written"; no error line) | arms **all green** (the function is `c`, a member of pgcrypto); (a)-(g) **all green**; called as the migrating superuser: `INSERT 0 1`, `app.audit_logs` holds `forged-by-c-member`; called as `app_command`: refused by dblink's own check, "password or GSSAPI delegated credentials required" |
| t3: t2 plus `dblink_connect_u` bound the same way | 5501 | **2** | my drift's own error: "could not find function \"dblink_connect_u\" in file …dblink…" (42883); the SQL `dblink_connect_u` is a `SECURITY DEFINER` wrapper of the C symbol `dblink_connect`, so an invoker binding of it gains nothing and a definer one meets the SECURITY DEFINER probe. Recorded as a failed attempt; no claim rests on it |
| `blockers.cjs` (`fb508e7` vs `2dc140c` manifest) | worktree | 0 | §5 |

## 2. My findings of the previous round

| finding | grade | now | verdict |
|---|---|---|---|
| N1 — a loopback foreign table writes an audit table | MEDIUM | new (h) `:722-736`; catalogs listed `:509-513`; drift 19 `:808-811`; the live probe on new `open_blockers[197]` | **closed in the text.** A0's s5 log (my r7, port changed) shows (h) selecting the extension, wrapper, server, mapping and foreign table; t1 shows (h) green on a clean tree before and after `rls-smoke`. The live probe is correctly put on its own blocker with the Integration Owner as owner and A1 as reviewer |
| N2 — a producer reached by operator, domain default or aggregate | LOW | (b) reads `pg_depend` `:619-635`; (g) reads `typdefaultbin` `:705-721`; aggregates fail closed `:541-547`; drifts 15-16, 20 | **closed in the text.** A0's s3 log (my r3 unchanged) selects the operator, the domain and the aggregate under `pg_depend`, and the aggregate under the language rule. "(b)'s claim does not follow" is replaced by a sentence naming the conjunction that holds it (`:636-642`), which is accurate |
| N3 — "no dynamic SQL" held for `sql`/`plpgsql` only | LOW | (c) gains a language rule `:665-679` and a text-executing list `:653-664`; drift 18 | **closed as worded for what I measured, but the rule's allowance is wider than stated: R1 below.** The holds I named (pg_catalog guard for PL handlers, the definer extension-member rule for dblink, `REFUSED_LANGUAGES`) are cited, as asked |
| N4 — cite what holds event triggers and policies | INFO | `:737-740` | **closed.** R2 adds one more hold that should be cited |
| N5 — Q-026-10: name the events lost; conditionality; a blocker for SEC-014's deadline | INFO | Q-026-10 row (`§10`) | **closed**, see §4 |

## 3. The questions put to this run, and new findings

**Does the revised §8.1/1 catch an invoker audit writer added to an extension?** Yes. Members are read by (a)
(`:520-531`, drift 9), whatever their language: a `plpgsql` or `sql` member is tokenised like any function. (h)
now also confines which extensions may exist. **One residual (R1):** a member in language `c` is opaque, and the
language rule admits any `c` member of an approved extension, which `ALTER EXTENSION … ADD` makes of any `c`
function.

**Does it catch a rewrite rule writing an audit table from any schema?** Yes; (f) is unchanged from the text I
measured in r8 of the previous round (a `do also` rule on a table and a `do instead` rule on a view, both in a
schema the drift creates, each selected). Nothing in this round weakened it.

**Is anything else a route the rule should name?**

- **Event triggers:** held by the event-trigger probe and cited (`:737-739`). No new route.
- **Policies with side effects:** held by the policy helper and policy set probes and cited (`:719-721`,
  `:739-740`). No new route.
- **FDW:** named, as (h). No new route beyond R1.
- **A `c` function bound to another library and made an approved extension's member:** R1, LOW.
- **A child table or partition of an audit table:** held already, not cited — R2, INFO.
- **Logical replication (`pg_subscription`, `pg_publication`):** not in the enumeration; not measured — R3,
  INFO.

### R1 — LOW — the language rule admits any `c` function made a member of pgcrypto, including one bound to another library's SQL-executing symbol

**Where:** RFC-2026-026 `:665-666` ("every function read is in `sql` or `plpgsql`, or is a `c` member of an
extension (h) approves"), `:533-536` (the same allowance), `:650-652` ("the three together are what keep (a)
and (b) decidable"); `work-packages/WP-0A-DB-00.json` `open_blockers[197]` (line 451), whose owed probe uses
the same allowance ("not a c member of an approved extension").

**Measured (t2):** appended to `140`: a `DO` block that, with `chr(99)` as the language word, creates
`s_a1.s_cx(text, text) returns text language c strict as '$libdir/dblink', 'dblink_exec'` — no dblink
extension is created — and runs `alter extension pgcrypto add function s_a1.s_cx(text, text)`; then a
`plpgsql` function `s_a1.s_call()` returning `s_a1.s_cx('host=127.0.0.1 …', 'insert into app.' || 'audit' ||
'_logs …')`. `migrate-clean` **ok**, every probe green. The catalog then shows `s_cx` as `c`,
`probin = $libdir/dblink`, `prosrc = dblink_exec`, a member of `pgcrypto`; `pg_extension` holds `pgcrypto` and
`plpgsql` only. A0's arms: **all green** — the language rule admits it as a `c` member of an approved
extension, (h) sees only pgcrypto, the text-executing list does not name `s_cx`, and nothing depends on a
producer. (a)-(g): **all green** — `s_call` has no `execute` token and no `audit_logs` token at any level.
Called by the migrating superuser it wrote one `succeeded` row with `actor_id = 'forged-by-c-member'`. Called
by `app_command` it was refused by **dblink's own** non-superuser check ("password or GSSAPI delegated
credentials required"), not by anything in this repository.

**Why LOW, not MEDIUM:** no non-superuser role I could find reaches it today: the forged row needed a
superuser caller, and dblink's password check is what stops `app_command` (the `dblink_connect_u` route that
skips the check is a `SECURITY DEFINER` SQL wrapper, which the SECURITY DEFINER probe refuses unpinned; t3).
It needs a migration written to evade the driver, like every drift here, and nothing in the tree does it. But
the text's claim is false as worded: a `c` member is opaque to (a)-(c), membership is something any migration
grants with one statement (the same move as drift 9), and the allowance therefore admits **any symbol of any
library installed on the server**, under any name. The same allowance is copied into `[197]`'s owed probe, so
fixing only the RFC would leave the live probe with the hole.

**Remedy:** state the allowance by what the member *is*, not by membership alone: a `c` function in scope is
admitted only if its `(extension, signature, probin, prosrc)` is on a pinned list of the approved extensions'
own members — pgcrypto's 36 today, each with `probin = '$libdir/pgcrypto'` — in a diff a reviewer reads; any
other `c` function, member or not, fails closed. Add t2's shape as a drift asserting the language rule's own
text, and amend `open_blockers[197]`'s owed probe the same way. (Reading `probin` alone is weaker: it would
still admit a pgcrypto symbol under a new name, which is harmless today but not decidable.)

### R2 — INFO — the inheritance hold is real but not cited among "what else holds this rule"

A table that inherits from `app.audit_logs` (or a partition of it) adds rows that every read of the parent
returns: a forged row inserted into an RLS-less child would appear as an audit row. This is held today by the
append-only probe (`scripts/db/run.mjs:1118-1127`: "append-only table(s) partitioned, inherited from or
inheriting", with its self-test drift at `:2207`), so it is not a gap. **Remedy:** one clause in `:737-740`
citing it, as N4's sentence cites the event-trigger and policy helper probes, so a later edit to that probe is
seen to weaken this rule.

### R3 — INFO — logical replication is not in the enumeration

A subscription's apply worker writes as the subscription's owner with `session_replication_role = replica`,
which bypasses row level security and ordinary triggers; a subscription whose publisher has a table named
`app.audit_logs` would write rows into it. I did not measure it: it needs a publisher database and
`wal_level = logical` (Supabase's default, not this cluster's), and `CREATE SUBSCRIPTION` with a slot cannot
run in a transaction block. **Remedy:** add `pg_subscription` (and `pg_publication`, for the reverse
direction's exposure) to (h)'s empty catalogs, or name them beside statistics objects and publication row
filters in `:514-517` as unexamined. Cheap either way; (h)'s reading of empty catalogs is the shape already.

## 4. Is the Q-026-10 recommendation honestly stated as a security trade-off?

**Yes.** Read in the Q-026-10 row, §3.7 (`:325-354`) and §10.1's Q-026-9 row:

- It is marked "a recommendation, NOT an answer" in the row, §3.7, §10's introduction, the Status/Revised
  lines and `open_blockers[195]`, and "Q-026-10 stays UNANSWERED" closes the row. Nothing in the diff answers
  it.
- The words accepted for Q-026-9 are now quoted verbatim, and I checked them against
  `product-owner-disposition-2026-10-03-batch-rfc-026-027.md:130` (exact match). The "matches Q-026-9" reason
  is withdrawn and said to be withdrawn; (i)'s column and (ii)'s store are stated as new store questions in
  batch `140`'s range (A1's), not as things Q-026-9 excluded.
- The cost is stated as a security cost: loss of detection, not of isolation; **which** events are lost
  (cross-tenant probing of workspace ids, the pattern ERD §9.1's security events exist to show); that SEC-014
  is the P0 rate-limit item (`meta-security-production-ops-workstream-th.md:169`, read) so probing is neither
  recorded nor limited until it lands; that "not of isolation" is conditional on §3.3's literal being executed;
  and that SEC-014's Paid-Beta deadline has no blocker of its own and needs one with an owner if (iii) is
  chosen. §11 still says (iii) asks the least of the proposer's own batch.

I found nothing overstated. A1's position on Q-026-10 is not given here.

## 5. Claims checked

| claim | where | verdict |
|---|---|---|
| checked out by name with `--ignore-other-worktrees` because `wf_33e0e53c-af4-1` holds the branch | A0's done list | **consistent**: `git worktree list` shows `af4-1` (and `af4-5`, `af4-6`) at `2dc140c` on that branch name; the pre-checkout state of `af4-1` was not re-read |
| cherry-picks `-x`: C0 `6d0c27f`→`32adffc`, A1 `c1e48a0`→`c033a29`, Q0 `1665deb`→`3df23a8`, unchanged | plan §6.1, `9fd448b` message | **true**: each carries "cherry picked from commit" with that SHA, and each review file is byte-identical (`git diff --stat` empty for all three) |
| all three reviews report no stop-the-line | plan §6.1 | **true** for mine (`c033a29` §6); the other two not re-read beyond their headlines |
| `9fd448b` changes RFC-026 §8.1/1 as the message lists (b) `pg_depend`, (g) `tgqual`/`typdefaultbin`/`connamespace`, (h), (c) language rule and the five-name list, reader view, aggregates, `BEGIN ATOMIC`, harness, drifts 14-20, the `:584` sentence | message, plan §6.2 | **true** (read at `:504-845`) |
| `9fd448b` through `commit-when-clean`, 685/685 | A0's done list, handoff | **true as logged** (A0's `cwc-code.log`); not re-run; `verify` at the head is 685/685 (§1) |
| §3.7, Q-026-10 and §10.1 quote `:130` verbatim | message | **true** (§4) |
| `open_blockers[195]` appended; old text a strict prefix; every other blocker byte-equal | message, done list | **true**: 197 → 198 entries; only indices 195 and 197 differ; `[195]` old 31443 chars, new 34725, the old a strict prefix of the new; only `ownership` (the rationale, appended) and `open_blockers` keys changed |
| `open_blockers[197]` new, at the end, owner the Integration Owner with A1 reviewing | message, done list | **true** (read in full); see R1 for its owed probe's wording |
| manifest 459 → 460 lines, no earlier blocker line moved | done list | **true**: `diff` changes line 119 (rationale) and 449-450 → 449-451; line 450 is blocker 196 gaining only its trailing comma; nothing before it moves |
| integrity manifest regenerated, 90 digests | `9fd448b` message, plan §6.4 | **true as logged** (`regen2.log`); `verify` green |
| s1-s6 on 5507 with the results of plan §6.3 | plan §6.3, done list | **true as logged** (A0's s1-s6 logs read); s1 **re-measured** as t1 (identical counts: 50/54 functions, 51/39/12 blocks, 1087 cases, 6 proofs, arms green); s5's (h) selection matches my r7 drift |
| s6: an `internal` and a `c` function, language computed, migrate clean and are selected | plan §6.2-§6.3, `[197]` | **true as logged** (`s6-arms.log`); not re-run; t2 confirms the same driver gap with a computed `c` |
| `140_audit.sql` restored byte for byte | plan §6.3 | **true** for my rounds (sha256 `2ac596bb950e8dfb` before and after each, `git status` clean); A0's from its logs |
| handoff `2dc140c` last and alone; post-commit rows carry no exit code (C0-SR-7) | `2dc140c` message | **true**: `2dc140c` touches only the handoff; its cited head is `bbfedbb`; the last `tests` row has no `exit_code` and points to the PR body |
| PR #180 Draft, OPEN, not merged, head `2dc140c` | done list | **true** (`gh`, 2026-10-05; `bootstrap` SUCCESS) |
| "no migration; nothing a DB layer reads changed" | messages, plan §6 | **true** (`fb508e7..2dc140c` touches RFC-026, the plan, three review files, the handoff, the manifest and the integrity manifest only) |
| RFC Status still Proposed; Q-026-10 unanswered | RFC `:3`, `:15`, row | **true** |

## 6. Stop-the-line verdict

**No stop-the-line.** The round changes the text of a Proposed decision record, evidence and bookkeeping; no
migration, probe or grant is in effect. No secret, credential, private URL or customer data is in the diff
(the loopback address and `trust` cluster above are this review's own throwaway cluster). R1's route exists in
no migration in the tree, needs a migration written to evade the driver, and, measured, forges only with a
superuser caller.

**Does anything block the merge?** No, under the bar applied to #179 and to this PR's first round: every
finding is owed before RFC-2026-026's **approval**, not before this text batch merges. R1 should be appended to
`open_blockers[195]`'s owed list (for (c)'s language rule) and to `[197]` (for the live probe's wording); R2 and
R3 are wording. RFC-2026-026 should not be approved while R1 is open. Merging remains the Owner's decision, or
A0's under the standing delegation once the C0 and Q0 re-checks are in.

## 7. Limits

- Both catalog readings are prototypes (A0's `arms.mjs`, my copy of A0's (a)-(g) `rule.mjs`), not the rule and
  not its self-tests; the rule does not exist.
- R1's non-superuser path was tried only through dblink's symbols (t2, t3). I did not survey every library in
  `pkglibdir` for a symbol that executes text without its own superuser check; the remedy does not depend on
  that survey.
- R3 is reasoning, not measured.
- A0's s2-s6 were read from logs, not re-run; only s1 (as t1) was re-measured. The C0 and Q0 reviews were read
  for their headlines and cherry-pick identity only.
- I am the same vendor and model family as the Author (§0), and N1-N5's remedies are this role's own.
