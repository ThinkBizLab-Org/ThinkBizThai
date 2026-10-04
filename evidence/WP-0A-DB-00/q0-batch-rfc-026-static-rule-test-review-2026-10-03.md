# Q0 independent test of batch rfc-026-static-rule (PR #180)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule`, head `fb508e7` (the handoff, last and alone),
over the evidence commit `3c82044` and the code commit `16b839b`, base `dc6d481` (`main`). **Author:** `/claude/a0_atlas`.
**PR:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/180 (Draft, OPEN, head `fb508e7`; check `bootstrap`, run
37230733209, **success** on `fb508e7`).
**Tested on:** my own branch `review/q0-batch-rfc-026-static-rule`, created at `fb508e7`. The repository commands ran on
the branch NAME (§1.1).
**Date:** 2026-10-05. The file name carries the phase's date (2026-10-03), as the batch's other records do.

This file records findings. It advances no status, approves nothing, test-verifies nothing on anyone's behalf, and
decides nothing that the Integration Owner, A1 or the Product Owner holds. It repairs nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and the same vendor and model family as the Author. A0's
workflow wrote my brief, chose the questions, the port and the output file, and A0 wrote the change under test. My
independence is the independence `RFC-2026-024` describes, and no more. Whether this record counts as the Tester role's
signature is for the Integration Owner and the Product Owner to decide, not me.

## 1. Measured versus read

**Setup for every measured run:** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), printed before each run; the
PATH Node 26 was not used. PostgreSQL 17 from `/opt/homebrew/bin`. A fresh `initdb --locale=C -A trust -U postgres` for
every round (r1-r7), on 127.0.0.1:**5503** only, TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`; the shim
`db/foundation/ci/supabase-shim.sql` first (exit 0 every round); `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`.
Private directory `scratchpad/q0-rfc-026-static-rule/`. I touched no other port. Every drift was appended to
`db/foundation/migrations/140_audit.sql` and restored from a private copy; sha256 `2ac596bb950e8dfb…` before and after
every round. Each cluster was stopped and its data directory removed; after each round `pg_isready -h 127.0.0.1 -p 5503`
printed "no response". `git status --porcelain` was empty before I wrote this file. Nothing was pushed.

**Measured:**

- the four repository commands on the branch name (§1.1);
- both database layers on an untouched tree (r1);
- my OWN hand application of the revised §8.1/1 (a)-(g) (`q0rule.mjs`, written without reusing A0's `rule.mjs`; it
  imports `walkLevels`, `word`, `keyword` and `isTrivia` from `scripts/db/sql-lexer.mjs` and reads the catalog after
  `migrate-clean`). It applies the text as written and, separately, reports what the text does not read ("beyond");
- A0's own drift files re-run under my prototype: `r3.sql` (A0's r3), `r4.sql` (drift 1b), `r2.sql` (the policy arm);
- my probes past the text's edges (r3, r4) and drift 13's fail-closed half (r5), which A0 did not measure;
- the blocker, manifest, digest, branch-slot, merge and CI claims (§4).

**Read, not executed:** §3.7 and Q-026-10's row (text only; there is still no command producer, no `app.security_events`
producer and no worker identity to run them against); the disposition's reading of the Owner's words.

### 1.1 Repository commands, on the branch NAME

The branch is checked out in A0's worktree (`wf_33e0e53c-af4-1`). I ran
`git checkout --ignore-other-worktrees agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule` in my own worktree;
`git branch --show-current` printed that name and HEAD was `fb508e7f2d52ab627f332d2b2adfa69a5d0c9413`. I committed nothing
there and switched back to `review/q0-batch-rfc-026-static-rule` before any drift and before writing this file.

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs dc6d481 WP-0A-DB-00` | 0 | "all 8 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| `npm run check` | 0 | tests 685, pass 685, fail 0 |

### 1.2 Rounds

| round | tree | `migrate-clean` | `rls-smoke` | my prototype (pinned producers; readers) |
|---|---|---|---|---|
| r1 | clean | 0 ("51 apply-time blocks, 39 re-run as written, 12 superseded and replaced") | 0 ("1087 isolation case(s) passed"; "6 claim(s) discharged by execution") | exit 0. Read 50 functions (36 extension members; `app` 9, `private` 4, `auth` 1), 0 rules, 715 stored expressions, 0 aggregates; nothing selected, nothing refused closed. The 36 members have one inner refusal each. After `rls-smoke`: 54 functions (`private` 8), nothing selected; `private.as_anonymous` 2, `as_user` 1, `as_service` 2 inner refusals |
| r2 | A0's `r3.sql` (`app.s_producer`; `app.s_reader`, `app.s_reader_vol`, `public.s_reader_view`) | 0 | — | exit 1, and each part selected exactly A0's list: (a) `app.s_d1`, `public.s_ext_member` [extension member], `app.s_reader_writes`; (a)'s attributes `app.s_producer` [invoker, owner postgres]; the reader rule `app.s_reader_vol`; (b) `app.s_caller` only (unstripped: also `app.s_producer`); (f) `public.s_rule_target.s_rule_audit` and `public.s_view_producer`'s `_RETURN`; (g) the default `s_def.a`; refused closed: none; `app.s_prose` 3 inner refusals |
| r3 | my `q0-r3.sql` (§2) | **0** | — | the text's parts select only the stand-in producers' attributes and the domain check; everything else in §2 is read by no part |
| r4 | my `q0-r4.sql`, a cast whose function is a producer | **2** (first form, a cast from a domain: PostgreSQL's own 42846; second form, from a composite type: the `pg_catalog` guard, "object(s) created in pg_catalog or another schema initdb made … cast 18426") | — | cast arm held by an existing probe |
| r5 | my `q0-r5.sql`, drift 13's fail-closed half | **0** | — | exit 1: refused closed, `app.q_badbody`: "depth 1: an unterminated quoted string" |
| r6 | A0's `r4.sql` (drift 1b) | **2**: "security definer probe: as built: … app.s_d1b() [not a pinned SECURITY DEFINER function]" | — | (a) also selects `app.s_d1b` |
| r7 | A0's `r2.sql` (the policy arm) | **2**: "policy helper probe: as built: function(s) a policy calls that are not pinned by body: app.s_producer(w uuid)" and "policy set probe: as built: policy(ies) no pinned list names: public.s_def.s_pol" | — | (g) also selects the policy |

So A0's prototype rounds reproduce under an independently written prototype, on another port, byte for byte in what
each part selects.

## 2. The question: is each obligation executable, with a drift that fails if the mechanism is missing?

| Obligation | Executable? | Drift that fails without it | Measured here |
|---|---|---|---|
| Extension members read (A1 N1) | yes | drift 9 | r2: selected; r1: the 36 members select nothing |
| Full definition, bare names | yes | drifts 2-4 (Q0's earlier X1-X3) | not re-run this batch (re-checked in `q0-batch-rfc-text-recheck`) |
| Lexer refusal rule (C0-RR-3, Q0 R5) | yes, both halves | drift 13 (control and fail-closed half) | r2: control green with 3 inner refusals; **r5: the fail-closed half, which A0 did not measure**: `set check_function_bodies = off` in a migration body passes `migrate-clean` (exit 0), the function is stored (`prosrc` 41 bytes), calling it fails "unterminated quoted string", and the text's reading refuses it closed at depth 1 |
| (a) producer set; reader list STABLE/IMMUTABLE (Q0 R6) | yes | drifts 1, 9, 12 | r2: all selected. r3-extra: a `STABLE` SQL-language inserter, once **called**, fails "INSERT is not allowed in a non-volatile function" ("during startup"), so A0's inference that the check is at run time holds for SQL-language functions too |
| Drift 1b (Q0 R3) | the unpinned form yes; the pinned form not measured (it edits `run.mjs`) | 1b | r6 |
| (b) header skip (C0-RR-1, Q0 R1) | yes | drift 5, control 5b | r2 |
| (c), (d), (e) | yes | drifts 6, 7, 8 | not re-run (unchanged since the recheck) |
| (f) (A1 N2, Q0 R2) | yes | drift 10 | r2 |
| (g) (A0's own) | yes for the four stores it names | drift 11 | r2, r7 |
| **"So no trigger, rule or expression reaches a producer, directly or through another function"** (`RFC-2026-026…md:584`) | **no** | — | **r3: false** (Q0-S1, Q0-S2) |

## 3. Findings

Grades: MEDIUM = an obligation the RFC states as held is not held by its text, measured; LOW = a stated property held
by review only; INFO = wording or record.

### Q0-S1 (MEDIUM) — a producer reached through an operator or an aggregate is named in no text the rule reads

`architecture/decisions/RFC-2026-026-audit-row-producer.md:573-587` ((b)), `:604-617` ((f)), `:618-628` ((g)). Every part
decides "names a producer" by an identifier token equal to the producer's name. PostgreSQL lets a migration call a
function without naming it: through an operator, an aggregate or a cast.

Measured in r3. `migrate-clean` exited **0** with all of the following, and the text's (a)-(g) selected none of them
(only the stand-ins' own attributes):

- `create operator app.@@@ (rightarg = uuid, function = app.q_producer)`;
- a trigger function `app.q_trg_op()` whose body is `perform operator(app.@@@) new.w`, on a trigger on `public.q_t`. The
  pinned trigger probe reads `app` and `private` only;
- a column default `(OPERATOR(app.@@@) gen_random_uuid())` on `public.q_def_op`;
- a view `public.q_view_op` whose `_RETURN` is `SELECT (OPERATOR(app.@@@) gen_random_uuid())`;
- `create aggregate public.q_agg(uuid) (sfunc = app.q_producer2, …)` and a view `SELECT q_agg(x) …`.

Run (as `postgres`, each rolled back): an insert into `public.q_t`, an insert into `public.q_def_op`, a select from each
view: **each wrote one `app.audit_logs` row**. That is a database-side producer, the class §3.1 says never exists, and
the class A1 N2 closed for rewrite rules. A cast is the one arm already held: r4 exits 2 at the `pg_catalog` guard.

`pg_depend` records every one of these: in r3 the rows with `refobjid` = a producer were the operator, the aggregate,
the trigger's `WHEN` (Q0-S2) and the domain check (Q0-S5); in r4, the cast and the default.

**Remedy (before approval; text, then the rule):** add an arm to §8.1/1: no object has a `pg_depend` row whose
`refobjid` is a pinned producer. Alternatively, name and read `pg_operator.oprcode`, `pg_aggregate`'s support functions
and `pg_cast.castfunc`. A direct dependency is enough, because the operator or aggregate itself is refused. Then
correct `:584`'s sentence. Add self-test drifts: an operator over a producer used in a trigger function on a `public`
table, in a default and in a view; and an aggregate over a producer. Record the item on `open_blockers[195]`, with A0
as owner, beside the rule's implementation.

### Q0-S2 (MEDIUM) — a trigger's `WHEN` clause calls a producer, and no part reads it

`:602-603` ((e)) reads which function a trigger runs (`tgfoid`). `:618-628` ((g)) lists column defaults, `CHECK`,
policies and index expressions. Neither reads `pg_trigger.tgqual`.

Measured in r3: `create trigger q_when before insert on public.q_t2 for each row when (app.q_producer(new.w) > 0)
execute function app.q_innocent()`. `migrate-clean` exited 0. (e) sees an innocent function, and no part selects the
trigger. An insert into `public.q_t2` **wrote one audit row**.

**Remedy:** (e) or (g) also tokenises `pg_get_triggerdef(oid)` (or `tgqual`) for every trigger in scope and refuses
one that names a producer. Q0-S1's `pg_depend` arm also holds it. Add a drift.

### Q0-S3 (LOW) — a pinned reader VIEW can write; "writes none" is held for functions only

`:556-567`. The reader list holds functions to `STABLE`/`IMMUTABLE` (Q0 R6), and "a view on the list is read by (f)".
But (f) asks only whether the view names a producer.

Measured in r3: `public.q_reader_upd as select * from app.audit_logs`, pinned as a reader, is auto-updatable
(`pg_relation_is_updatable` = 28). After `grant insert on public.q_reader_upd to app_command`, an insert by
`app_command` through the view **wrote an audit row** with `actor_id` `q0.forged.via.reader.view` (rolled back). The
view's owner is `postgres`, which bypasses the table's RLS.

The reader list is empty today, and both the pin and the grant are diffs a reviewer reads. So this is held by review,
not by the rule.

**Remedy:** each view on the reader list has `pg_relation_is_updatable(oid, false) = 0` and no `INSERT`/`UPDATE`/
`DELETE` grant. Add a drift.

### Q0-S4 (INFO) — aggregates have no text under "What text it reads"

`:524-528` reads each function by `pg_get_functiondef(oid)`. For an aggregate, PostgreSQL raises
`"q_agg" is an aggregate function` (r3-extra). The text does not say whether an aggregate is refused closed or read
through `pg_aggregate`, so an implementation will either abort or skip it. A0's prototype refuses it closed, while a
filter on `prokind <> 'a'` would skip it.

**Remedy:** one sentence. An aggregate is read through its support functions (Q0-S1), or is refused closed.

### Q0-S5 (INFO) — (g)'s "same scope" for `pg_constraint` does not say a domain's `CHECK` is included

`:621-623`. A domain `CHECK` has `conrelid = 0`. Measured in r3: `create domain public.q_dom as uuid check
(app.q_producer(value) > 0)`, and a column of that domain on `public.q_t3`, migrated clean. An insert **wrote a row**.

Both prototypes select it, because both scope `pg_constraint` by `connamespace`. An implementation that scopes it by
the constrained relation would miss it.

**Remedy:** state that the scope is by `connamespace` (domains included), and add the drift.

### Q0-S6 (INFO) — a record omission in A0's plan

A0's `r3-extra.sql` also tried A1 N2's executed shape: `app_command` inserting into `public.s_rule_target`. It failed
on `audit_logs_reason_key_form`, because the drift wrote `reason_key` `s.drift`. I reproduced that failure in r2. The
plan's §2 does not mention the attempt. No claim depends on it: the forged-row measurement in (f)'s text is cited as
A1's, and the static selection does not need the row to be written.

**Remedy:** none needed. A later prototype should use a `reason_key` matching `^audit\.`, as mine did.

## 4. Claims checked

Each of the following is **true** as measured:

- `open_blockers[195]`: the old text is a strict prefix of the new (27700 → 31443 characters), and the other 196
  entries are byte-equal. The manifest keeps 459 lines. Only `ownership` (the branch and the rationale) and `[195]`
  changed. The append's content matches the plan and the RFC, and it names owners.
- `test-kits/branch-identity.test.mjs`: both rows moved from `…-batch-rfc-text` to `…-batch-rfc-026-static-rule`.
- `test-kits/integrity-manifest.json`: 90 digests, and exactly the RFC and the branch-identity test changed.
- #179: MERGED 2026-10-04T18:45:52Z, merge commit `dc6d481`, head `8dc33ba`. Run 37225078364 is `success` on `8dc33ba`.
- RFC-2026-026's Status line still says Proposed. Q-026-10's row says **UNANSWERED**, and A0's (iii) is marked as a
  recommendation (`:345`, `:835`).
- The disposition quotes the Owner's words verbatim and reads them narrowly (text fixes only). It approves no RFC.
- Plan §1-§3 and the handoff's `tests` match what I re-measured: the counts 14 / 18 / 36 / 50 / 54 / 715 / 0 rules,
  "51 / 39 / 12", 1087 cases, each drift's selection, and the r4 and r2-first-attempt messages. I did not re-run the
  D1 digest drift, `regenerate:manifest` or commit-when-clean's refusal; I read the logs in A0's private directory.
- The commit messages of `16b839b`, `3c82044` and `fb508e7` describe what each commit changes: code paths, evidence,
  and the handoff alone.

## 5. Stop-the-line verdict

**No stop-the-line.** Nothing is applied to any instance. The batch changes the text of a Proposed record, a blocker
append, the branch slot and evidence. No secret, tenant leak, migration divergence or contract mismatch was found. All
four repository commands are green on the branch name, and CI is green on `fb508e7`.

**Does anything block the merge?** Nothing in this record blocks merging the text. Q0-S1 and Q0-S2 (MEDIUM) show that
§8.1/1 as revised does not hold its own sentence at `:584`. They are owed **before RFC-2026-026's approval**: §8.1/1
needs another arm and its drifts. That is the class `[195]` already holds for the rule's text. They should be appended
to `open_blockers[195]` with A0 as owner, by the Author, before the approval is asked for. Q0-S3 to Q0-S6 can go with
them. The C0 and A1 role runs on this head are not mine to report.

## 6. Limits

- My prototype is a hand application of the text, as A0's is. It is not the rule and not its self-test, and both of
  us read the same lexer.
- I did not re-run drifts 2-4, 6-8 (unchanged since my recheck), drift 1b's pinned form (it edits
  `scripts/db/run.mjs`), or the D1 digest drift.
- The runtime proofs in §3 ran as `postgres` (bypassing RLS), except Q0-S3's, which ran as `app_command`. The
  stand-in producers were `SECURITY INVOKER` and owned by `postgres`, not `app_command`'s `SECURITY DEFINER`
  functions, because no such function exists yet. They show reachability, not a client's path to it.
- §3.7 and Q-026-10 were read, not executed.
- I am the Author's subagent (§0).
