# A1 security/privacy re-check: batch 128's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-128`, head
  `0646f326e21b4e02bd02f8e1aa0876eb11a214f5` over code `b594b46`, base `18f1469` (main).
  Author `/claude/a0_atlas`. PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/167> (Draft).
- **Scope:** NARROW re-check of the review-round corrections only. Previous reviewed head
  `b8435faf7f0d339ce101ceefccb49b3770679c8a`; my earlier record is
  `a1-batch-128-security-review-2026-10-03.md`.
- **Review branch:** the head was checked out into `recheck/a1-batch-128`; this file is its only change.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

A subagent of `/claude/a0_atlas`, the Author's own run: the same vendor and the same model family, which
RFC-2026-024 records as the limit of this role's independence. Accepting this record as the A1 role's
signature is the Integration Owner's and the Product Owner's act, not mine. I measured on a private
cluster and report; I did not and cannot approve, test-verify as an independent role, or integrate.

## 1. Inputs read

`CONTRIBUTING_AGENTS.md`; `evidence/WP-0A-DB-00/a0-batch-128-plan-2026-10-03.md` (whole, §7 review round in
full); `product-owner-disposition-2026-10-03-batch-128.md`; my earlier
`a1-batch-128-security-review-2026-10-03.md`; `git diff b8435fa..0646f32` for `scripts/db/run.mjs` and
`scripts/db/psql-driver.mjs` in full, and `git diff 18f1469..0646f32 --stat` for the rest; blocker 186's
text (`work-packages/WP-0A-DB-00.json:118`); the review-round self-tests in `run.mjs`; `tenantTableLint`
and `schemaLint`'s app-table RLS rule (`run.mjs:1767`, `:2226`); the assertion-floor note
(`scripts/test-suite-contract.mjs:164-172`).

## 2. Measured vs read

**Measured** — Node `v24.20.0` (checked with `node -v` under the exact PATH before every run; a Node 26 on
the machine was kept off the PATH); PostgreSQL 17.11 at `/opt/homebrew/bin`; `127.0.0.1:5501`, TCP only,
`-c unix_socket_directories=''`; `initdb --locale=C -A trust -U postgres`; `LC_ALL=C`; the shim first; a
fresh `initdb` for every round; each drift appended to `db/foundation/migrations/140_audit.sql` on an
rsync of the worktree in the private dir and the file restored byte for byte after every one (pristine
sha1 `2ac2fc2c592be3b5fa7844ce12793093b782a502`; the worktree's own copy was never touched — confirmed
`git status --short` clean at the end).

| Round / drift | `migrate-clean` | `rls-smoke` | What held it |
|---|---|---|---|
| clean (no drift) | **0** | **0**, 1079 cases | client schema probe "exactly the 13 pinned"; membership "exactly the 0 pinned"; security definer "5 pinned"; guard clean; authz-proofs 6 discharged |
| X2 — `set allow_system_table_mods=on`; schema `pg_a1api`, client USAGE, definer-rights view | **2** | 2 (nothing applied) | lexer, `140_audit.sql line 1018`: `allow_system_table_mods` **and** bare-CR not present here; refused before apply |
| X2c — the same, switch set by a **computed** name (`set_config('allow_system_'\|\|'table_mods',…)`) past the lexer | **2** | 0 | client privilege rule 2 "pg_a1api.ideas" (by OID) **and** client schema probe "unlisted: authenticated USAGE on schema pg_a1api" (every schema) |
| ISF — SECURITY DEFINER `information_schema.a1_all_ideas()`, EXECUTE to authenticated | **2** | 0 | pg_catalog guard (every job), "function a1_all_ideas()" |
| IST — RLS-less `information_schema.a1_notes`, SELECT/INSERT to authenticated | **2** | 0 | pg_catalog guard, "relation information_schema.a1_notes" |
| READALL — `grant pg_read_all_data to authenticated` (predefined role; bypasses RLS) | **2** | — | client membership probe, "authenticated -> pg_read_all_data, which SET ROLE reaches past every privilege rule" |
| TRANS — `pg_read_all_data` → `a1_top` → `a1_mid` → authenticated (two hops) | **2** | — | membership probe, recursive: names "authenticated -> a1_mid, -> a1_top, -> pg_read_all_data"; pinned grant probe also names the inherited SELECTs |
| CRLF — `set allow_system_table_mods\r= on; …` (bare CR inside the statement) | **2** | 2 (nothing applied) | refused twice at line 1018: the bare-CR rule **and** the `allow_system_table_mods` match |
| ADP — `alter default privileges in schema app grant select on tables to authenticated; create table app.a1_adp_target(…)` (no RLS) | **0** | 0 | migrate-clean clean — **correct**: see §4 |
| ADP, static layer (`make db-schema-lint`) | **2** (4 problems) | — | `app.a1_adp_target does not ENABLE ROW LEVEL SECURITY` (and FORCE, PK, owner comment) |

Static layer on the clean head (`node --test test-kits/db/foundation-contract.test.mjs
tests/db/identity/identity-isolation.test.mjs`): **378 / 378**, exit 0. `node
scripts/test-suite-contract.mjs` (the toolchain/floor gate): exit **0** — the foundation-contract
assertion floor is **500** as stated. `node scripts/regenerate-integrity-manifest.mjs`: exit 0, no change
to the committed manifest.

**Read, not measured:** that SET SESSION AUTHORIZATION needs a superuser session user, reachable only
through a membership the probe reads; that event triggers, casts and operators that reach an
extension-member definer require creating the object, which a drift does by a path the catalog rules
read by OID (the review round extends exactly those rules into the two system schemas). I did not re-run
every plan-§7 reviewer drift (X1b, X2b, X2bc, X5, X4, the mutation-guard rounds); I re-derived the same
four classes with my own drifts above and reached the same verdicts.

## 3. The questions, by class (this round)

1. **Role membership.** A predefined role granted to a client (READALL) and a two-hop transitive grant
   (TRANS) are both named by `CLIENT_MEMBERSHIP_PROBE_SQL`, recursively, with the SET ROLE wording. A role
   cannot be granted to PUBLIC. SET SESSION AUTHORIZATION needs a superuser session user, itself a
   membership this probe reads. NOINHERIT is in the catalog (`rolinherit=f`, measured), which is why the
   privilege rules alone do not see a grant — the membership probe does. Nothing newly opened.
2. **Schemas reachable by name or default privilege.** A `pg_*` schema made after initdb by a computed
   switch name (X2c) is read by the client privilege rule's OID arm (`userObject`) and by the client
   schema probe, which now reads **every** schema with no name filter. A temporary schema carries no ACL.
   `search_path` only resolves inside schemas a client may USE, and USAGE is pinned both ways (13 triples,
   measured). Default privileges: §4. Nothing newly opened.
3. **Extension-member definer via operator/cast/event trigger.** The definer rules and the policy-helper
   rule now carry the OID arm into `pg_catalog`/`information_schema`; a definer function there (ISF) is
   caught by the guard first, in every job. How a function is reached does not change a catalog rule on
   the function itself. An operator over an *invoker* function stays Q0 N5, stated open. Nothing newly
   opened.
4. **Lexer escape refusals.** The literal `allow_system_table_mods` is refused (X2); a bare CR inside the
   statement does not evade it and trips the older bare-CR rule as well (CRLF). The computed name is the
   stated, deliberate gap (plan §7.4 item 3), and its effect is read by OID (X2c). Depth-eight,
   dollar-tag and comment behaviour is unchanged from `b8435fa` and I did not re-measure it. Nothing newly
   opened.
5. **ALTER DEFAULT PRIVILEGES granting to authenticated.** §4.

## 4. The one thing worth stating clearly (ADP)

`migrate-clean` passed ADP, and that is correct, not a miss. `ALTER DEFAULT PRIVILEGES … grant select on
tables to authenticated` changes nothing until an object is created; the new object
(`app.a1_adp_target`, no RLS) is then judged by the layer that owns "every tenant table has RLS" — the
**static** `schemaLint` reading of the migration text (`run.mjs:1767`) and the committed
`catalog-snapshot.json` completeness check in `tenantTableLint`, **not** a live migrate-clean probe. I
confirmed it: `make db-schema-lint` with the ADP drift present fails with "`app.a1_adp_target` does not
ENABLE ROW LEVEL SECURITY" (4 problems), exit 2. A new table *outside* `app`, or a view/matview/foreign
table anywhere, is caught live by the client privilege rules instead. So the ADP effect is covered; the
cause (`pg_default_acl` not read by a catalog rule) remains A1 N1 / plan §7.4 item 2, owed, INFO. The
review round did not touch `tenantTableLint` or `schemaLint`, so this layering is unchanged from before
batch 128.

## 5. Findings

| Id | Grade | Where | Finding | Remedy |
|---|---|---|---|---|
| R1 | INFO | `scripts/db/run.mjs` client privilege / schema probes | `pg_default_acl` is still read by no catalog rule (A1 N1, carried). A default privilege granted to a client is named only by its later effect on an object, which the rules then read — confirmed live for a new `app` table (static layer) and would be a privilege-probe finding outside `app`. No live gap. | Optional, as before: pin `pg_default_acl` to have no client grantee, with a self-test drift, so the cause is named at the point it is written. Recorded owed on blocker 186. |
| R2 | INFO | `run.mjs` client role rows | The client roles' own attributes (`rolbypassrls`, `rolsuper`, `rolcreaterole`, `rolcreatedb`, `rolinherit`) are read by no catalog rule (C0 F3, carried). `alter role authenticated bypassrls` is held by `rls-smoke` alone, loudly (the Author measured 347/1079); I did not re-measure it this round. | Optional. Recorded owed on blocker 186. |
| R3 | INFO | plan §7.4, blocker 186 | The computed name of `allow_system_table_mods` passes the lexer by design; its effect is read by OID (X2c, measured). The open items (Q0 N5 operators, computed encoding names, the §5-item-4 list) are each still open and correctly stated as open. | Keep as written. |

No CRITICAL, HIGH, MEDIUM or LOW finding. Every review-round correction I re-measured holds: read by OID
(X2c, ISF, IST), every schema and the database (X2c, 13 pinned), the guard over every initdb schema but
`public` (ISF, IST), the lexer's literal refusal (X2, CRLF), and the recursive membership probe (READALL,
TRANS). All the plan-§7 "closed" verdicts I re-derived reproduced.

## 6. Stop-the-line verdict

**No stop-the-line.** Nothing in the review round exposes a secret, leaks a tenant, or weakens a rule that
held before. The changes only add refusals (OID arms, every-schema reads, a wider guard, one more lexer
shape) and the clean set stays green at every layer. **From A1's side nothing blocks the merge.** The
merge still needs what the process requires and this record does not supply: the independent C0, A1 and Q0
re-checks of this review round accepted as role signatures by the Integration Owner and Product Owner, a
green required CI run on head `0646f32`, and the Integration Owner's and Product Owner's acceptance. I am a
subagent of the Author's run (§0); my acceptance is not one of those signatures.

## 7. Limits

- Narrow re-check. I re-ran four attack classes with my own drifts and the clean baseline; I did not
  re-run every plan-§7 reviewer drift, the lexer depth/dollar/comment cases (unchanged since `b8435fa`),
  or the guard-mutation rounds. R2's `rls-smoke`-only coverage of `bypassrls` is read from the Author's
  measurement, not re-measured.
- Same vendor and model family as the Author (§0).
- The cluster on 5501 was stopped and its data directory removed; port 5501 is free. Private artefacts,
  not in the repository, are in the scratchpad dir `a1-128r2/` (`round.sh`, `q.sh`, `i1.sql`, the drifts
  in `d/`, per-round logs in `logs/`, `140_audit.sql.pristine`, the rsync `wt/`).
