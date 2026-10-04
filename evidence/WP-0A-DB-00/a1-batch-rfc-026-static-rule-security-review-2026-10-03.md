# A1 security review: batch rfc-026-static-rule (RFC-2026-026 §8.1/1 and Q-026-10 text)

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule` (PR #180, Draft, OPEN, not merged,
  required check `bootstrap` SUCCESS on the head), head `fb508e7` (`fb508e7f2d52ab627f332d2b2adfa69a5d0c9413`)
  over code `16b839b` and evidence `3c82044`, base `dc6d481` (main). Author `/claude/a0_atlas`.
- **Checked out as:** local branch `review/a1-batch-rfc-026-static-rule` at `fb508e7`, in this run's own
  worktree (`wf_33e0e53c-af4-3`). For `verify-branch-scope`, `check:handoff` and `verify` I checked out the
  branch NAME `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule` in the same worktree
  (`--ignore-other-worktrees`; `git branch --show-current` printed that name, `HEAD` = `fb508e7`), committed
  nothing there, and switched back to `review/a1-batch-rfc-026-static-rule` before any cluster round and
  before writing this file.
- **Status:** this file records findings. It advances no status, approves nothing (not RFC-2026-026, not
  RFC-2026-027, not any answer, not Q-026-10, not anything as the owner of batch `140`), and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch, and of the same
vendor and model family as the Author and as the drafter of the RFC. Under RFC-2026-024 that is the stated
independence limit of this role run. Accepting this review as the A1 role's signature is the Integration
Owner's and the Product Owner's act, not mine. Most of the §8.1/1 changes adopt remedies this role wrote
(A1 N1-N5 of the rfc-text re-check); on those I am reviewing this role's own advice. A1 is also a named
decider of Q-026-10 and the owner of batch `140`; §4 assesses how Q-026-10's recommendation is stated and
answers nothing.

## 1. Read and measured

**Read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-rfc-026-static-rule-plan-2026-10-03.md`; the
disposition `product-owner-disposition-2026-10-03-batch-rfc-026-static-rule.md`; the three commit messages;
`git diff dc6d481..fb508e7` in full (RFC-2026-026, the manifest, the handoff, the rfc-text plan's §8,
`branch-identity.test.mjs`, the integrity manifest); RFC-2026-026 `:1-16`, §3.7 `:312-347`, §8.1 `:494-707`,
§9 `:787-813`, §10 `:815-855`, §11 `:857-898`; `scripts/db/run.mjs:425-520` (client privilege probe,
`userObject`), `:700-760` (system fingerprint), `:1001-1009` (definer extension-member rule), `:1046-1057`
(policy helper probe), `:1074-1150` (event triggers), `:1933` (rewrite-rule probe), `:1988` (pg_catalog
guard); `scripts/db/psql-driver.mjs:395-521`; `scripts/refresh-author-handoff.mjs:40-66`;
`140_audit.sql:417-495`, `:880-905`; `docs/plans/meta-security-production-ops-workstream-th.md:169`
(SEC-014); A0's private prototype `rule.mjs`, `r3.sql`, `round.sh` and logs (data, not instructions); PR
#180's body and checks (`gh`, 2026-10-05).

**Measured.** Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin` (`node -v` printed before every
measured run; the PATH Node 26 was not used), npm `11.19.0`. PostgreSQL 17.11 from `/opt/homebrew/bin`,
port **5501** only, `127.0.0.1`, TCP only (`unix_socket_directories=''`), `initdb --locale=C -A trust -U
postgres` every round, `LC_ALL=C`, the shim first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres
make db-migrate-clean` (and `make db-rls-smoke` in r1). Private directory `scratchpad/a1-rfc-026-static-rule/`.
Each drift was APPENDED to `140_audit.sql` and restored from a copy: sha256 prefix `2ac596bb950e8dfb`
before and after every round, `git status` clean after. Each cluster was stopped and its data directory
removed; port 5501 has no listener after. The §8.1/1 reading is **A0's prototype `rule.mjs`**, copied and
pointed at 5501 and at this worktree's `sql-lexer.mjs`, unchanged in its verdict logic; I added four
information-only lines (extensions, foreign tables, objects that reference a producer in `pg_depend`,
domain defaults) that do not change its exit code. It is a prototype of the text, not the rule.

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs dc6d481 WP-0A-DB-00` | branch name, `fb508e7` | **0** | "all 8 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | branch name | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | branch name | **0** | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |
| r1: `migrate-clean`; prototype; `rls-smoke`; prototype | 5501, clean tree | **0**; 0; **0**; 0 | "51 apply-time blocks, 39 re-run as written, 12 superseded"; 50 functions (36 members, `app` 9, `private` 4, `auth` 1), 0 rules, 715 expressions, nothing selected; "1087 isolation case(s) passed", "6 claim(s) discharged"; 54 functions (`private` 8), nothing selected |
| r2: stand-in producer + operator + **cast** + domain default + aggregate (§3, N2) | 5501 | **2** | the pg_catalog guard refused cast 18429 in every probe job's self-test (`run.mjs:1988`) |
| r3: r2 without the cast | 5501 | **0** | prototype: (b) and (g) green; 4 audit rows written through the producer (§3) |
| r4: `create extension pltcl/plperl/postgres_fdw`, server, mapping, foreign table, spelled | 5501 | **2** | `psql-driver.mjs` refused each statement as spelled ("CREATE EXTENSION pltcl, which is not one the migrations create", "a foreign table, foreign data wrapper, server or user mapping") |
| r5: the same, extensions computed in DO blocks | 5501 | **2** | pg_catalog guard: "plperl_call_handler(), … pltcl_call_handler()" created in pg_catalog |
| r6: postgres_fdw + dblink, computed | 5501 | **2** | definer probe: "SECURITY DEFINER extension member(s) not pinned … dblink_connect_u" |
| r7: postgres_fdw loopback only, computed, in the extractable `do $$ … end $$;` form | 5501 | **0** | "52 apply-time blocks, 40 re-run as written, 12 superseded"; prototype exit 0 (all green); `app_command` wrote a forged audit row (§3, N1) |
| r8: A0's own `r3.sql` + a rule on a table and an INSTEAD rule on a view in a schema the drift creates | 5501 | **0** | prototype selects exactly what A0's plan §2 lists, plus both new rules under (f); each new rule, executed, wrote a forged row |
| `blockers.cjs` (`dc6d481` vs `fb508e7` manifest) | worktree | 0 | §5 |

## 2. The questions put to this run

**Does the revised §8.1/1 catch an invoker audit writer added to an extension?** Yes, as text and as
prototyped. "Which functions it reads" (`:508-523`) now includes extension members. r8 re-ran A0's drift 9
unchanged: `migrate-clean` exit 0, and (a) selects `public.s_ext_member [extension member]`; pgcrypto's
members are 36 on a clean tree (r1) and select nothing. My N1 of the rfc-text re-check is closed in the
text.

**Does it catch a rewrite rule writing an audit table from any schema?** Yes. (f) (`:604-617`) reads
`pg_rewrite` for every relation in `userObject` scope and allows only a view's or materialized view's
`_RETURN`. r8 measured it beyond A0's drift: a `do also` rule on a table and a `do instead` rule on a view,
both in a schema the drift creates, migrated clean, were each selected by (f), and each, when one row was
inserted, wrote a `succeeded` audit row with a forged `actor_id`. A0's `public` rule and producer view are
selected as plan §2 says. My N2 of the re-check is closed in the text.

**Is anything else a route the rule should name?**

- **A foreign table (FDW): yes — N1, MEDIUM.** Measured end to end with every layer green.
- **An operator, a domain default or an aggregate over a producer: yes — N2, LOW.** The producer is reached
  without its name appearing in any text the rule reads. A cast is held already, by the pg_catalog guard.
- **Dynamic SQL without the `execute` token** (PL/Tcl `spi_exec`, PL/Perl `spi_exec_query`, `dblink_exec`):
  held today, but only incidentally, by two probes written for other reasons — N3, LOW.
- **Event triggers: no new route.** `PINNED_EVENT_TRIGGERS` is empty and the event-trigger probe refuses any
  (`run.mjs:1074-1150`); an event trigger's function is in `pg_proc` and read by (a)/(b). INFO in N4.
- **Policies with side effects: no new route.** A function a policy calls is in `pg_proc` and read by
  (a)/(b); the policy helper probe pins such functions by body (`run.mjs:1046`, `:1057`; A0's r2 first
  attempt, exit 2, read not re-run). INFO in N4.

**Is the Q-026-10 recommendation honestly stated as a security trade-off?** Yes, with two refinements
(N5, INFO). See §4.

## 3. Findings

### N1 — MEDIUM — a loopback foreign table writes an audit table, and no part of §8.1/1 (a)-(g), and no live probe, reads it

**Where:** RFC-2026-026 `:500-505` (the catalogs §8.1/1 reads: no `pg_extension`, `pg_foreign_table`,
`pg_foreign_server` or `pg_user_mapping`), the headline "nothing else reaches one" (`:500-501`);
`scripts/db/psql-driver.mjs:428-432` and `:507-521` (the refusal of unapproved `CREATE EXTENSION` and of
every foreign-data statement is lexical) and `:436` (its own stated limit: "a statement whose words are
COMPUTED at run time … stay held by the live catalog probes in run.mjs"); `scripts/db/run.mjs:509-517` (the
only probe that reads foreign tables, and only for the client roles `anon`, `authenticated`, `PUBLIC`).

**Measured (r7):** appended to `140_audit.sql`: `create schema s_a1`, then one `do $$ … end $$;` block that
`execute`s, each with the word `create ` in a variable, `extension if not exists postgres_fdw schema
extensions`, a server on `127.0.0.1:5501`, a user mapping for `public` to `postgres` with
`password_required 'false'`, and `foreign table s_a1.s_ft (…) … options (schema_name 'app', table_name
'audit' || '_logs')`; then `grant usage on schema s_a1` and `grant insert on s_a1.s_ft` to `app_command`.
`migrate-clean` **exit 0** ("52 apply-time blocks, 40 re-run as written"). The prototype of the revised text
**exit 0**, every part green: the DO block is not in `pg_proc`, and the foreign table is no function, rule,
trigger or stored expression. Then, as `app_command`: a direct insert into `app.audit_logs` is refused
("permission denied for schema app"), and `insert into s_a1.s_ft values (…, 'user',
'forged-by-fdw-as-app_command', …, 'succeeded', …)` returns `INSERT 0 1`; `app.audit_logs` then holds that
row. The remote session is the migrating superuser, so forced RLS, the grants `140` withholds and every
policy §3.2/§3.3/§3.7 will add are all bypassed. That is a database-side producer with a forged actor,
which §3.1 says never exists.

**Why MEDIUM, not higher:** nothing in the tree does this today; it needs a migration written to evade the
driver, which is the same adversary every §8.1/1 drift models; and this text is Proposed and its rule
unimplemented. It is the same class as N1/N2 of the re-check, which were MEDIUM. It is also **broader than
RFC-026**: the same foreign table onto any `app` table is a row-level-security bypass for any non-client
role granted it (`app_command`, `app_worker`, `app_maintenance`), which no probe reads.

**Remedy:** add to §8.1/1 an (h), read live after `migrate-clean`: `pg_extension` is exactly
`APPROVED_EXTENSIONS` plus `plpgsql`, and `pg_foreign_data_wrapper`, `pg_foreign_server`,
`pg_user_mapping` and `pg_foreign_table` are empty, each with a pinned exemption list (empty) in a diff a
reviewer reads. Name r7 as a drift asserting (h)'s own text. Because the gap is not specific to audit
tables, A0 (or the Integration Owner) should also record a live probe of these four catalogs in
`run.mjs` on an open blocker, independent of RFC-026's approval, as the driver's header already says its
computed-text limit is "held by the live catalog probes".

### N2 — LOW — a producer reached by reference, not by name: an operator, a domain default, an aggregate

**Where:** RFC-2026-026 `:573-586` ((b) reads tokens; its last sentences, "No view names a producer ((f))
and no stored expression does ((g)). So no trigger, rule or expression reaches a producer, directly or
through another function", `:583-584`, do not follow); `:618-626` ((g) reads `pg_attrdef`,
`pg_constraint`, `pg_policy`, `pg_index`, not a domain's default); `:524-525` (`pg_get_functiondef` is the
text read, and it raises an error on an aggregate, which the text does not mention).

**Measured (r3; stand-in producer `app.s_producer(uuid)`, INVOKER as in A0's r3, pinned as the producer on
the prototype's command line):** appended to `140`:
`create operator public.### (rightarg = uuid, function = app.s_producer)`, a function `app.s_op_caller()`
whose body is `return operator(public.###) gen_random_uuid()`, and a table `public.s_opdef (a int default
(operator(public.###) gen_random_uuid()), b int)`; `create domain public.s_dom as int default
app.s_producer(gen_random_uuid())` and a table with a column of that domain; `create aggregate
public.s_agg(uuid) (sfunc = public.s_pick, stype = uuid, finalfunc = app.s_producer)` and a function that
calls `public.s_agg(x)`. `migrate-clean` **exit 0**. The prototype: (b) **green** and (g) **green** — none
of these texts holds the token `s_producer`. Its `pg_depend` information line names all three:
"operator ###(NONE,uuid); type s_dom; function s_agg(uuid)". Executed: the operator caller, an insert
relying on the operator default, an insert relying on the domain default, and the aggregate caller each
wrote one audit row through the producer (4 rows, `actor_id = 'reached-by-a1'`). The aggregate was
refused only because A0's prototype treats every aggregate as fail-closed (`rule.mjs`: "aggregate"), a
choice the text does not state. **A cast is held already (r2):** `create cast (uuid as int) with function
app.s_producer(uuid)` made every probe job's self-test fail on the pg_catalog guard ("cast 18429",
`run.mjs:1988`), `migrate-clean` exit 2.

**Why LOW:** the real producers are `SECURITY DEFINER` and bind the acting user and its membership
(§3.3/1-2), so reaching one by reference writes an actor-bound row, not a forged one. The defect is that
(b)'s claim, the decidable form of "a producer is an entry point, never a callee", is not true as worded:
a write to an unrelated table can produce an audit row with no command having run.

**Remedy:** (b) also reads `pg_depend`: no object other than a pinned one has a dependency on a producer
(`refclassid = 'pg_proc'`, `refobjid` a producer). That one read catches an operator, an aggregate, a cast,
a domain (default or `CHECK`), a column default, a view and a policy expression, because PostgreSQL
records each of those; it does not replace the token read, since a PL/pgSQL body records no dependency.
(g) adds domain defaults (`pg_type.typdefaultbin`) and states that domain `CHECK`s are read through
`pg_constraint`. The text states that an aggregate or window function, whose definition
`pg_get_functiondef` refuses, fails closed unless pinned. Drifts: r3's three shapes, each asserting the
rule's own text, and the cast asserting the pg_catalog guard's message.

### N3 — LOW — (c) holds "no dynamic SQL" for `sql` and `plpgsql` only; other routes are held by accident

**Where:** RFC-2026-026 `:587-595` ((c) is the token `execute`); `:521-523` ("A function in language `c` or
`internal` is opaque … making one needs a superuser and a library on the server").

**Measured:** (r5) PL/Tcl `public.s_tcl()`, with `set t audit; append t _logs; spi_exec "insert into app.$t
…"`, lexed cleanly at every level; the prototype selected it under neither (a) nor (c), and, called, it
wrote `actor_id = 'forged-by-tcl'`. The PL/Perl equivalent wrote `forged-by-perl`; it was refused by the
prototype only because `my $t` is "a `$` that opens no dollar quote" at level 1, an accident of the
lexer. (r6) A plpgsql function returning `extensions.dblink_exec('host=127.0.0.1 …', 'insert into app.' ||
'audit' || '_logs …')` passed (a)-(c) in the prototype and wrote `forged-by-dblink`. None of these reached
a green `migrate-clean`: the PL extensions were refused by the **pg_catalog guard** because their handlers
are created in `pg_catalog` (r5), and dblink by the **definer probe's extension-member rule** because two
of its members (`dblink_connect_u`) are `SECURITY DEFINER` and unpinned (r6). Spelled plainly (r4), the
driver refuses all of them first. `LANGUAGE c` and `internal` are refused lexically at every level by the
driver (`psql-driver.mjs:425-427`, `:499-505`), which `:521-523` does not cite.

**Why LOW:** nothing passes today. But each hold is a side effect of a probe written for another reason;
pinning dblink's definer members for an unrelated need, or a PL whose handler is not in `pg_catalog`, would
remove it, and (c)'s wording would still read as complete.

**Remedy:** (c) states a language rule: every function read is in `sql` or `plpgsql`, or is a pinned
extension member in `c`; any other language fails closed. It cites the pg_catalog guard, the definer
extension-member rule and the driver's `LANGUAGE c/internal` refusal as the present holds, the way (d)
cites the trigger probe. N1's (h) also makes dblink an unapproved extension by name. Drifts: r5's and r6's
shapes, each asserting the message that holds it.

### N4 — INFO — event triggers and policies need no new part, but the text should cite what holds them

Event triggers are held by the event-trigger probe (`PINNED_EVENT_TRIGGERS = []`, `run.mjs:1074-1150`),
and their functions are read by (a)/(b). A policy expression that calls a writer is held twice: the
function is read by (a)/(b), and the policy helper probe pins functions a policy calls by body
(`run.mjs:1046`, `:1057`); (g)'s policy arm already says so for a producer. **Remedy:** one sentence in
§8.1/1 naming both, as (d) names the trigger probe, so that a later edit to either probe is seen to weaken
this rule.

### N5 — INFO — Q-026-10's recommendation is honestly stated; two refinements

**Where:** RFC-2026-026 `:835` (Q-026-10), `:342-346` (§3.7), `:889-896` (§11), the disposition §2.

**What is honest:** the recommendation is marked "a recommendation, NOT an answer" in the row, §3.7, §10's
introduction, the Status line, `[195]` and the disposition; the disposition reads the Owner's
`เอาตามแนะนำ` as not covering it, because the summary it answered recommended nothing on Q-026-10. The
cost is stated as a security cost: the attempt "leaves no row in this database until SEC-014's producer
exists — a loss of detection, not of isolation". Option (i)'s cost (no column; a store change or a misuse of
`event_type`; an actor with no reachable workspace still unrecorded) is stated correctly, which closes my
N3 of the re-check. §11 says that (iii) is the option that asks least of the proposer's own batch. I found
nothing overstated.

**Refinements:** (1) Name *which* events are lost: an acting user naming another tenant's workspace id, or
a non-existent one, is the cross-tenant probing pattern ERD §9.1's security events exist to show, and
SEC-014 is the P0 "rate limit/abuse prevention per user/workspace/IP/action" item
(`docs/plans/meta-security-production-ops-workstream-th.md:169`); until it lands, repeated probing is
neither recorded in the database nor limited. (2) "Loss of detection, not of isolation" holds on §3.3's
membership literal, which §11 says has not been executed by the text (A1 prototyped it in an earlier
round); say it is conditional on that. And "SEC-014's producer owed before Paid Beta" is held by no gate
check or blocker of its own; if (iii) is chosen, record that deadline on `open_blockers` with an owner, as
Q-026-4's acceptance should be too.

## 4. A1's position on Q-026-10

Not given here. This review assesses the statement of the trade-off only. A1 answers Q-026-10, with the
Owner, in a separate act.

## 5. Claims checked

| claim | where | verdict |
|---|---|---|
| `open_blockers[195]` appended; old text a strict prefix; the other 196 entries byte-equal | `16b839b` message, plan §1, A0's done list | **true** (197 entries on both sides; only index 195 differs; old 27700 chars, a strict prefix of the new 31443; only the manifest's `ownership` and `open_blockers` keys changed) |
| the manifest keeps 459 lines | plan, handoff | **true** (459 at `dc6d481` and at `fb508e7`) |
| integrity manifest regenerated, 90 digests | A0's done list, plan §3 | **true** (90 entries) |
| branch slot moved in the manifest and in both rows of `branch-identity.test.mjs` | `16b839b` message | **true** (diff) |
| no migration; nothing a DB layer reads changed | commit messages, plan | **true** (`git diff --stat`: RFC-026, two plans, the disposition, the handoff, the manifest, two test-kits files) |
| 50 functions read on a clean `migrate-clean` (14 + 36 members), 0 rules, 715 expressions, nothing selected; 54 after `rls-smoke`; 1087 cases, 6 proofs; 51/39/12 apply-time blocks | RFC `:681-683`, plan §2 r1/r5 | **true** (r1, re-measured) |
| r3's selections: (a) `s_d1`, the extension member, the unpinned STABLE writer; the producer's attributes; the reader rule; (b) `s_caller` only; (f) the rule and the producer view; (g) the default; nothing refused closed | plan §2 | **true** (r8 re-ran A0's `r3.sql` unchanged; identical lines) |
| "14 functions after `migrate-clean` (18 after `rls-smoke`)" | RFC `:673-676`, rfc-text plan §8 | **true** (r1: `app` 9, `private` 4, `auth` 1; after smoke `private` 8) |
| `16b839b` is a plain commit because only the handoff guard was red | plan §3, PR body | **true as logged** (A0's `cwc-code.log`: "tests 685, pass 683, fail 2"); not re-run |
| `3c82044` through commit-when-clean, 685/685, before the handoff refresh | handoff `tests`, PR body | **true as logged** (A0's `cwc-ev.log`); consistent with the guard comparing the cited head with `HEAD^` (`refresh-author-handoff.mjs:44-50`), which at that point was `dc6d481`; not re-run |
| the previous `head_revision` `8fc8af2` lies on this branch's path, so no repoint | `fb508e7` message | **true** (`merge-base --is-ancestor`; it was `8fc8af2` at `dc6d481`, now `3c82044`) |
| `verify-branch-scope` 0 (8 paths), `check:handoff` 0, `verify` 0 (685) at `fb508e7`, on the branch name | PR body | **true** (§1, re-measured) |
| the handoff does not cite the plan for final-head results (C0-RR-5 not repeated) | handoff `tests`, plan §3 | **true** (the last `tests` entry points to the PR body; plan §3 says so) |
| the disposition approves neither RFC and does not answer Q-026-10; RFC Status still Proposed | disposition §2, §5; RFC `:3`, `:8` | **true** |
| #179 merged at its reviewed head `8dc33ba` as `dc6d481` | disposition §3 | **true** (`dc6d481` is the merge of #179 in `git log`; the CI run id was not re-read) |
| (g) is A0's own addition, flagged for review first | RFC `:618-619`, `:893-894`, `[195]` | **true**; reviewed here: sound as far as it goes, with N2's domain-default gap |
| PR #180 Draft, OPEN, not merged, head `fb508e7`, `bootstrap` SUCCESS | A0's done list | **true** (`gh`, 2026-10-05) |

## 6. Stop-the-line verdict

**No stop-the-line.** Nothing here is in effect: the batch changes the text of a Proposed decision record,
evidence and branch bookkeeping. No secret, credential, private URL or customer data is in the diff (the
loopback address and the `trust` cluster in §3 are this review's own throwaway cluster). N1 and N3's
routes exist in no migration in the tree; they are gaps in a rule that does not exist yet, and in the
probe set for a migration written to evade the driver.

**Does anything block the merge?** Not under the bar applied to #179: the findings are owed before
RFC-2026-026's **approval**, not before this text batch merges. N1 and N2 should be appended to
`open_blockers[195]`'s owed list (A0's, in the rule's batch), and N1's live foreign-data probe recorded
separately, since it is not specific to audit tables. RFC-2026-026 should not be approved while (h) and
(b)'s `pg_depend` read are absent from §8.1/1. Merging remains the Owner's decision, or A0's under the
standing delegation, and the C0 and Q0 role runs are still owed.

## 7. Limits

- The §8.1/1 reading is A0's prototype with my information lines added, not the rule and not its
  self-tests; the rule does not exist. My routes are measured against that prototype and the live layers.
- The stand-in producer is `SECURITY INVOKER` and owned by `postgres` (a pinned `SECURITY DEFINER` one needs
  `run.mjs` edited); N2's "actor-bound" reasoning about real producers is from §3.3's text, not executed.
- N1's user mapping uses `password_required 'false'` on a `trust` cluster; on a managed host the mapping
  would need a password, which is a credential in a migration and a separate refusal. The catalog gap is
  the same.
- Not measured: drift 1b's pinned form, drift 13's fail-closed half (`check_function_bodies` off), a
  window function, a domain `CHECK` over a producer, `plpython3u` (not installed here), and the C0 and Q0
  questions. The CI run id of #179 was not re-read.
- I am the same vendor and model family as the Author (§0).
