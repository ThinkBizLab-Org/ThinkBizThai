# Q0 independent test re-check of batch rfc-026-static-rule's review round (PR #180)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
**Subject:** branch `agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule`, head `2dc140c` (the handoff, last and alone),
over the evidence commit `bbfedbb` and the code commit `9fd448b`. The previous reviewed head is `fb508e7`, and the base
is `dc6d481` (`main`). **Author:** `/claude/a0_atlas`.
**PR:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/180 (Draft, OPEN, head `2dc140c`). Check `bootstrap`, run
37233876909, **SUCCESS** on `2dc140c`.
**Re-checking:** my review `q0-batch-rfc-026-static-rule-test-review-2026-10-03.md` (Q0-S1..S6), against the plan's §6
("Review round") and RFC-2026-026 §8.1/1 as revised in `9fd448b`.
**Recorded on:** my own branch `recheck/q0-batch-rfc-026-static-rule-b`, created at `2dc140c`. A previous Q0 re-check
stopped before it measured anything. This one started fresh and reuses nothing from it.
**Date:** 2026-10-05.

This file records findings. It advances no status and approves nothing. It does not test-verify on anyone's behalf,
repairs nothing, and decides nothing that belongs to the Integration Owner, A1 or the Product Owner.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, from the same vendor and model family as the Author. A0's
workflow wrote my brief and chose the questions, the port and the output file. A0 also wrote the change under test. My
independence is the independence `RFC-2026-024` describes, and no more. The Integration Owner and the Product Owner
decide whether this record counts as the Tester role's signature. I do not.

## 1. Measured versus read

**Setup:** Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin`), printed before every run. PostgreSQL 17 from
`/opt/homebrew/bin`. Each round got a fresh `initdb --locale=C -A trust -U postgres` on 127.0.0.1:**5503** only, TCP
only (`unix_socket_directories=''`), with `LC_ALL=C` and the shim first (exit 0 every round). The private directory was
`scratchpad/q0-srb/`. I touched no other port.

Every drift was appended to `db/foundation/migrations/140_audit.sql` in a **private clone** and restored from a copy.
The sha256 was `2ac596bb950e8dfb…` before and after every round. Each cluster was stopped and its data directory
removed, and after each round `pg_isready -h 127.0.0.1 -p 5503` printed "no response". After the last round the clone
was still on the branch name with an empty `git status --porcelain`, and I then deleted it. I pushed nothing.

**Measured:**

- the three repository commands, on a private clone checked out on the branch NAME (§1.1);
- A0's prototype of the added arms (`a0-rfc-026-static-ruler2/arms.mjs`), copied byte for byte except for the port
  (5507 → 5503) and the import path (now my clone). I re-ran it on a clean tree, on my earlier drift file, on A0's
  language drift, on A1's foreign-data drift, and on one new drift of my own past the text's enumeration (§1.2);
- the manifest, integrity, commit-scope, RFC status and CI claims (§4).

**Read, not executed:** the text changes for C0-SR-3..8 and A1 N4/N5 (only where they touch my findings); §3.7 and
Q-026-10; drifts 14-20 as self-tests. The rule is not implemented, so there is no `selfTests` job to run. I did not
re-run C0's `c2.sql` or A1's `r3.sql`. Their selections are A0's s2/s3 logs, which I read.

### 1.1 Repository commands, on the branch NAME

I cloned my worktree into `scratchpad/q0-srb/clone` and ran `git checkout agent/claude/WP-0A-DB-00-batch-rfc-026-static-rule`
there. `git branch --show-current` printed that name, and HEAD was `2dc140c2cd3c31b08e162376dd1b0a802ca1f440`.

The clone's `origin/HEAD` first pointed at my own recheck branch, which equals `2dc140c`. On that state `npm run
check:handoff` exited **91**: "cites base dc6d481, which is not on this branch's side of its branch point 2dc140c
(origin/HEAD)". This is a property of my clone, not of the branch. I ran `git remote set-head origin main`
(`origin/HEAD` = `dc6d481`) and re-ran all three:

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs dc6d481 WP-0A-DB-00` | 0 | "all 11 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | 0 | "clean: exit 0 — tests 685, pass 685, fail 0, skipped 0, todo 0" |

### 1.2 Rounds (A0's `arms.mjs`, port 5503)

| round | drift | `migrate-clean` | `rls-smoke` | arms (pinned producers; readers) |
|---|---|---|---|---|
| t1 | none | 0 ("51 apply-time blocks, 39 re-run as written, 12 superseded and replaced") | 0 ("1087 isolation case(s) passed"; "6 claim(s) discharged by execution") | exit 0, every arm green. 50 functions and 51 trigger/domain expressions read; after `rls-smoke`, 54 functions and every arm green |
| t2 | my `q0-r3.sql` from the review (`app.q_producer`, `app.q_producer2`; reader `public.q_reader_upd`) | 0 | — | exit 1. `pg_depend`: operator `app.@@@`, trigger `q_when`, constraint `q_dom_check`, aggregate `q_agg`. Language: `public.q_agg [internal]`. (g): `q_t2.q_when`, `public.q_dom_check`. Reader view: `public.q_reader_upd [updatable 28; grants none]`. Text-executing and (h): none |
| t3 | **new**, `d-edge.sql`: a btree operator class `public.q_uuid_ops` whose support function 1 is a stand-in producer `app.q_prod3(uuid, uuid)`, and an index on `public.q_t4` using it | **0** | — | exit 1. `pg_depend` alone selects "function 1 (uuid, uuid) of operator family q_uuid_ops for access method btree: app.q_prod3(uuid,uuid)". Every other arm is green. Run as `postgres` and rolled back: inserting three rows into `public.q_t4` **wrote 3 audit rows** (0 before) |
| t4 | A0's `d-lang.sql` | 0 ("52 … 40 re-run") | — | exit 1. Language: `s_lang.s_int [internal]`, `s_lang.s_cfn [c]`. Nothing else |
| t5 | A1's `r7.sql` (via A0's copy), port 5503 | 0 ("52 … 40 re-run") | — | exit 1. (h): extension `postgres_fdw`, its wrapper, server `s_loop`, a user mapping, foreign table `s_a1.s_ft`. Language: postgres_fdw's five `c` members |

t1, t2, t4 and t5 reproduce A0's s1, s4, s6 and s5 on another port, line for line, in what each arm selects.

## 2. Q0-S1..S6: is each now an executable obligation, with a drift that would fail without it?

The text is Proposed, and the rule is not implemented. So I judge the text, and §1.2 runs a prototype of it, not the
rule.

| finding | what §8.1/1 now says (`RFC-2026-026…md`) | executable? | drift that fails without it | measured here |
|---|---|---|---|---|
| **Q0-S1** MEDIUM (operator, aggregate) | (b), `:619-635`: "no object other than a pinned one has a row with `refclassid = 'pg_proc'::regclass` and `refobjid` a producer", with an empty pinned exemption list and the producer's own rows excluded. The sentence at the old `:584` is replaced by the stated conjunction (`:636-642`), which names what holds each route | **yes**. A single catalog predicate, decidable, fail closed | drift 16 (operator in a trigger function, a default and a view; aggregate from a function and a view) | t2: operator and aggregate selected. The view and default that use the operator are not selected themselves. The operator is selected instead, as the text's "a direct dependency is enough" says. t3: the general arm also holds a route the text does not enumerate (Q0-SR-1) |
| **Q0-S2** MEDIUM (trigger `WHEN`) | (g), `:705-715`, reads `pg_trigger.tgqual` through `pg_get_triggerdef(oid)` for every trigger in scope. (e), `:687-690`, defers the `WHEN` to (g) and to (b)'s `pg_depend` | **yes**, with two independent holds | drift 14 | t2: `q_when` selected by both (g) and `pg_depend` |
| **Q0-S3** LOW (updatable reader view) | (a), `:592-600`: each reader view has `pg_relation_is_updatable(oid, false) = 0`, and no role but its owner holds `INSERT`/`UPDATE`/`DELETE` | **yes** | drift 12's second half | t2: `public.q_reader_upd [updatable 28]` selected |
| **Q0-S4** INFO (aggregates) | "Which functions it reads", `:541-548`: an aggregate is in language `internal`, fails closed under (c)'s language rule unless pinned, and what it calls is read through `pg_depend`. Window functions are covered as well, but not measured | **yes** | drift 16's aggregate | t2: `public.q_agg [internal]` selected by the language rule and by `pg_depend` |
| **Q0-S5** INFO (domain `CHECK`) | (g), `:713-715`: "`pg_constraint` is scoped by `connamespace`, not by the constrained relation", domains included | **yes** | drift 15 | t2: `q_dom_check` selected by both (g) and `pg_depend` |
| **Q0-S6** INFO (record) | plan §6.2 records A0's `r3-extra.sql` attempt and its `reason_key` failure | n/a (record) | — | read |

**Answer:** each of Q0-S1..S6 is now stated as an executable obligation, and each has a named drift that the
corresponding arm selects and that migrates clean without it. The two MEDIUM findings each have two independent holds
(a token or expression read, plus `pg_depend`). §8.1/1's "what holds" sentence no longer claims more than its parts.

## 3. Findings

Grades are as before. MEDIUM means an obligation the RFC states as held is not held by its text, as measured. LOW means
a stated property held by review only. INFO means wording or record.

### Q0-SR-1 (INFO): an operator class support function is a route the text's enumeration omits; the `pg_depend` arm holds it

`RFC-2026-026…md:622-626` lists the OID routes as "an operator …, an aggregate …, a trigger's `WHEN`, a domain's default
or `CHECK`, and a cast". The catalog list at `:509-513` omits `pg_amproc`/`pg_opclass`, and drift 16 has no opclass
shape.

t3 measured a btree operator class whose support function 1 is a stand-in producer, used by an index on a table in
`public`. It migrated clean (exit 0), and each insert's comparisons ran the producer (3 rows written for 3 inserts, as
`postgres`, rolled back). No arm but `pg_depend` reads it, and `pg_depend` **does** select it, because the obligation is
stated over any object depending on a producer, not over the listed shapes. **So the obligation holds as written.**
Only its examples and its drifts are incomplete. The text already calls the catalog list an enumeration that does not
prove completeness (`:513-517`).

**Remedy (optional, with the rule's batch):** name an operator class or family support function among the
`pg_depend` examples, and add it to drift 16 as an extra shape. This is not owed before approval.

### Nothing else

I found no new MEDIUM or LOW item. I did not re-open C0's or A1's findings beyond where they meet mine.

## 4. Claims checked

Each is **true** as measured or read:

- `9fd448b` changes only the RFC, `test-kits/integrity-manifest.json` (one digest, the RFC's, now `3c782f85…`, equal to
  the file's sha256 on `2dc140c`) and the work-package manifest. `bbfedbb` changes only the plan, by 102 lines added to
  its §6. `2dc140c` changes only the handoff. The handoff is last and alone.
- The manifest has 197 → 198 `open_blockers`. `[195]`'s old text is a strict prefix of the new (31443 → 34725
  characters). The append covers every arm the round added, says what is prototyped and not implemented, and names
  owners. The new `[197]` (foreign-data and function-language live probe) is owned by "the Integration Owner, with A1
  (Security) as reviewer". No other blocker changed. Outside `open_blockers`, only `ownership` changed (its
  rationale).
- RFC-2026-026's Status line still says **Proposed**, "NOT approved; NOT in effect". Q-026-10 remains unanswered.
- Plan §6.3's selections for s1, s4, s5 and s6 match t1, t2, t5 and t4 here.
- PR #180 is a Draft, OPEN, with head `2dc140c` and `bootstrap` SUCCESS (run 37233876909).

## 5. Stop-the-line verdict

**No stop-the-line.** Nothing is applied to any instance. The round changes the text of a Proposed record, a blocker
append, a new blocker and evidence. I found no secret, tenant leak, migration divergence or contract mismatch. The
three repository commands are green on the branch name, and CI is green on `2dc140c`.

**Does anything block the merge?** No. Q0-S1..S6 are answered in the text, as executable obligations with drifts. A
prototype of the added arms selects each of my drift shapes on port 5503 and selects nothing on a clean tree, before
and after `rls-smoke`. Q0-SR-1 is INFO and owed with the rule, if at all. What remains owed before RFC-2026-026's
approval is already on `open_blockers[195]` and `[197]`: the rule itself and drifts 1-20 as `selfTests`, the
cast drift on the `pg_catalog` guard, the live foreign-data and language probe, C0's and A1's re-checks, Q-026-10's
answer, and the approval itself.

## 6. Limits

- `arms.mjs` is A0's prototype of the added arms only, re-run unchanged but for the port and the import path. It is not
  the rule and not its self-tests. My earlier independent prototype (`q0rule.mjs`) was not extended to the new arms
  this round.
- The prototype tokenises `pg_type.typdefault` (the deparsed text), while the RFC names `typdefaultbin`. They are the
  same expression. The RFC's wording says "deparsed expression", which an implementation can satisfy with either.
- I did not re-run C0's `c2.sql`, A1's `r3.sql`, drifts 1-13, or the `query_to_xml` drift 17. Those are A0's logs,
  which I read.
- The runtime proof in t3 ran as `postgres` (which bypasses RLS), against a `SECURITY INVOKER` stand-in producer owned
  by `postgres`. It shows reachability, not a client's path.
- Routes I considered but did not measure: logical replication (`pg_subscription`) and `COPY … FROM PROGRAM` in a
  function body. Both need a superuser session or a cluster setting at run time, so I record them as unexamined, not as
  findings.
- Before my clone's `origin/HEAD` was corrected, `check:handoff` exited 91 (§1.1). That was a clone artefact; the
  recorded run is the one after the correction.
- I am the Author's subagent (§0).
