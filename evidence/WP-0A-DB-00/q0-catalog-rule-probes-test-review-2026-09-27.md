# Q0 independent test: the four catalog-rule probes

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`. This file comes from a distinct run of it.
Subject: branch `agent/claude/WP-0A-DB-00-catalog-rule-probes`, head `055b977`, base `9039738` (`main`).
Author: `/claude/a0_atlas`.
Local test branch: `test/q0-catalog-probes`, created at `055b977`.
Date: 2026-09-27.

**This document RECORDS TEST RESULTS.** It advances no package status. It writes `test_verified`
nowhere, signs nothing on anyone's behalf, and repairs nothing it found. Every defect named below
is left as it is on the subject branch. I changed no migration, runner or test except for the
moment each mutation ran inside my own harness. After every mutation the harness wrote each
touched file back byte for byte and checked `git status --porcelain`. No run left the tree dirty.
`140_audit.sql` was checked by SHA-1 (`2ac2fc2c…`) before and after the one hand-driven run. The
only file this run adds to the repository is this one.

The run was interrupted once by an API-side network error, not by anything found. On resuming I
found no cluster listening on 5503, removed the stale data directory, and started fresh. The
coordinator told me the Author has uncommitted corrections in the main checkout: the trigger probe
is to read internal triggers and pin `pg_get_triggerdef` text. **I tested `055b977` only, as
briefed. I did not read or test that working tree.** Where a finding below may be what that change
addresses, I say so. I have not measured whether it does.

---

## 0. What I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`.** I ran in a git worktree A0
created, under a brief A0 wrote. A0 chose the subject, the port, the cluster recipe, the output
filename, and the mutation classes I had to cover "at minimum". A0 also wrote the change under
test.

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is
approved and withdrew the cross-vendor condition. What remains is CONTRIBUTING_AGENTS.md's
separation of duties: four distinct `agent_run_id`s, and no run approves, test-verifies,
integrates or gate-approves its own work. I record that as the rule I ran under. Whether this
file is *accepted* as the Tester signature is for the Integration Owner and the Product Owner to
decide. It is not my decision.

### What I measured, and what I did not

**Measured, live, on my own scratch cluster:**

- The plan's §2 catalog facts, all six rows.
- The clean baseline on `055b977`.
- The Author's ten live proofs (plan §4 and the commit message), all ten.
- **75 mutations, each on a freshly initdb'd cluster:**
  - 21 to the runner and its probe SQL;
  - 54 drifts appended to `140_audit.sql`: 16 FK, 15 closure, 10 SECURITY DEFINER, 13 trigger
    (controls and confound variants included).
- A hand-driven harm demonstration for three survivors (§4.6).
- Every survivor re-run against the **full** static suite (`npm run verify`), not just the fast
  proxy.

**Not measured:**

- **I could not check my own framing.** A0 named the starting classes. The finding I grade highest
  (F1, the trigger probe reads `tgenabled` and `tgtype` but not what the trigger *does*) came from
  asking "how do I keep the probe's columns intact and lose the guarantee". The brief listed
  `tgtype` changes. It did not list `WHEN` or `UPDATE OF`. Neither of us thought of what I did not
  find.
- **I did not observe CI.** CI runs `postgres:17` and `make db-migrate-clean` after the shim, as I
  did.
- **The static suite ran on my branch name, not the subject's.** Branch-name guards judged
  `test/q0-catalog-probes`. Nothing I mutated is judged by them. Baseline:
  `clean: exit 0 — tests 668, pass 668, fail 0, skipped 0, todo 0`.
- **I did not test the Author's uncommitted corrections** (see above).
- **The mutations are a sample**, chosen by a model that shares the Author's blind spots.

---

## 1. How I measured

PostgreSQL 17.11 from `/opt/homebrew/bin`. The cluster lived in my private subdirectory
`…/scratchpad/q0-probes/`. The recipe:

- `initdb --locale=C -A trust -U postgres`;
- TCP only on `127.0.0.1:5503` with `unix_socket_directories=''`;
- started with `LC_ALL=C`;
- **re-initdb'd before every single run**, because roles are cluster-wide.

`db/foundation/ci/supabase-shim.sql` was applied first. Then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and
`make db-rls-smoke` ran with the same URL. **5432 and 5499 were never contacted.** I wrote nothing
in the shared scratchpad outside `q0-probes/`.

Layers, per mutation:

| col | layer | what |
|---|---|---|
| A | static suite | fast proxy per run: `foundation-contract`, `identity-isolation`, `ctr-job-001`. **Every survivor was re-run with the full `npm run verify`**; see §4.7. |
| S | `make db-schema-lint` | CI runs it. |
| B | `make db-migrate-clean` | now includes the four probes, then the post-migrate pass. |
| C | `make db-rls-smoke` | 965 isolation cases, plus fixtures and authz proofs. |

A **survivor** is a mutation that leaves every layer green.

**Drift method.** Each drift is appended to `140_audit.sql`. A new migration file is a confound
(Q0's earlier X0). **This method has a confound of its own, and I name it:**
`identity-isolation.test.mjs`'s "batch 140 adds to the merged batches and rewrites none of them"
refuses `drop policy`, and `alter table` on six named tables, *in 140's text*. A drift that uses
those words is caught at A by that rule. The rule is real, but it guards 140 only, and a later
batch file would not trip it. Rows where that is the only A catch are marked `A*`. For them the B
and C verdicts are what count, and where B and C were green I re-ran a variant avoiding the words
(F04b to F04c, F08 to F08e and F08f, S04 and S04b to S04d and S04e).

Baseline on `055b977`:

| layer | result |
|---|---|
| A | `clean: exit 0 — tests 668, pass 668, fail 0` |
| B | all four probes print their claims; `post-migrate pass: 42 apply-time blocks, 32 re-run as written, 10 superseded and replaced`; `db-migrate-clean: ok` |
| C | `db-rls-smoke: 965 isolation case(s) passed` |

## 2. The plan's §2 facts: REPRODUCED

| fact | plan | measured |
|---|---|---|
| FKs in `app` and `private`, all NO ACTION both ways, not deferrable | 87 | 87 of 87 (and 0 NOT VALID) |
| SECURITY DEFINER in `app`/`private`, all `{search_path=""}` | 5 | the same 5, all `{search_path=""}` |
| non-internal triggers enabled | 47 | 47 of 47 `O` |
| `refuse_mutation` triggers | 4, tgtype 27 and 34 | the same 4; `tgqual` null, `tgattr` empty, no args |
| `*_updated_by_is_caller` | 14, one deparse | 14, one distinct deparse |
| `*_requester_is_caller` | 2, one deparse | 2, one distinct deparse |

Two facts the plan does not state: there are **348 internal (RI) triggers** in `app` and `private`,
all `O`, which the trigger probe excludes. There are **no FKs outside `app` and `private`** today.

## 3. The Author's ten proofs: REPRODUCED

Each fails `migrate-clean` **by name**, from the probe the commit says:

| proof | my row | B names |
|---|---|---|
| m1, ON UPDATE CASCADE | F01 | `fk action probe … content_targets_social_scope_fk (on delete a, on update c)` |
| m2, ON DELETE CASCADE under a rename | F02 | `… (on delete c, on update a)` |
| m3, updated_by `or true` | C01 | `closure text probe … knowledge_items.knowledge_items_updated_by_is_caller` |
| deferrable FK | F06 | `… (on delete a, on update a, deferrable)`; also C |
| requester `or true` | C10 | `requester_is_caller closure(s) … publish_intents…`; also C |
| closure made permissive | C11 | `closure text probe …`; also C |
| D14 | S01 | `security definer probe … private.set_updated_at() proconfig=<none>` |
| D44 | S05 | `… app.q0_sd(p uuid) proconfig=<none>` |
| D20b | T01 | `trigger probe: trigger(s) not enabled: app.security_events.refuse_mutation (tgenabled D), …refuse_truncate (tgenabled D)` |
| a refuse trigger dropped | T10 | `the private.refuse_mutation triggers are not exactly the four …` |

The "two controls fail the new test" claim also reproduces: four honest runner edits (R01h, R02h,
R03, R12) each fail it.

---

## 4. Every mutation

`G` green, `C` caught, `A*` caught at A only by 140's own no-rewrite text rule (see §1).

### 4.1 Runner and probe SQL (`scripts/db/run.mjs`), each paired with a drift the unmutated probe catches

| # | mutation | drift | A | S | B | C | verdict |
|---|---|---|---|---|---|---|---|
| R01h | honest: loop iterates `[]` | m1 | C | G | G | G | caught |
| R01 | loop line kept; `if (label) continue;` inserted as its first statement | m1 | G | G | G | G | **SURVIVOR** |
| R02h | honest: `return 1;` deleted from the failure branch | m1 | C | G | G | G | caught |
| R02 | failure branch `return 1; }` → `if (0) return 1; }` | m1 | G | G | G | G | **SURVIVOR**: the failure is printed, the target says `ok` |
| R03 | honest: the FK probe removed from `CATALOG_RULE_PROBES` | m1 | C | G | G | G | caught (deepEqual) |
| R03e | array kept; `CATALOG_RULE_PROBES.splice(0, 1);` before the loop | m1 | G | G | G | G | **SURVIVOR** |
| R12 | honest: loop made to iterate nothing where it stands | m1 | C | G | G | G | caught |
| R04 | FK predicate `where c.contype = 'f' and false and …` | m1 | G | G | G | G | **SURVIVOR** |
| R19 | FK probe narrowed to `nspname in ('private')` | m1 | G | G | G | G | **SURVIVOR** |
| R05 | closure compare `= '${text}' or true)` | m3 | G | G | G | G | **SURVIVOR** |
| R13 | closure probe: the `polroles` line deleted | closure TO public | G | G | C | G | caught by the 102 replacement, not the probe |
| R15 | closure probe: missing-closure branch `where false and …` | closure dropped | A* | G | C | G | caught by the 040 block in the pass |
| R08 | `REQUESTER_CHECK_TEXT` rewritten to the `OR true` deparse | both requester closures `or true` | G | G | G | C | caught **only** by rls-smoke's two requester forging cases |
| R10 | `REQUESTER_CLOSURES = ['approval_requests']` | publish_intents closure dropped | A* | G | C | C | caught (120 replacement; rls-smoke) |
| R06 | definer predicate `… array['search_path=""'] and false` | D14 | G | G | G | G | **SURVIVOR** |
| R07 | trigger predicate `tgenabled <> 'O' and false` | D20b | G | G | G | G | **SURVIVOR** |
| R07b | trigger probe: `return;` after `begin` | D20b | G | G | G | G | **SURVIVOR** |
| R20 | trigger probe narrowed to `nspname in ('private')` | D20b | G | G | G | G | **SURVIVOR** |
| R16 | refuse-set comparison `… ] and false then` | refuse_mutation BEFORE DELETE only | G | G | G | G | **SURVIVOR** |
| R09 | `REFUSE_MUTATION_TRIGGERS` loses the two security_events rows | both dropped | G | G | C | G | caught by 140's block in the pass |
| R11 | `FK_ACTION_EXEMPTIONS` names the social FK with a 60-char reason | m1 | G | G | G | G | green **by design**: an exemption is a reviewable line |

### 4.2 FK drifts

| # | drift | A | S | B | C | verdict |
|---|---|---|---|---|---|---|
| F01 | m1 | G | G | **C** | G | caught by name |
| F02 | m2 | G | G | **C** | G | caught by name |
| F03 | `knowledge_items_business_scope_fk` re-added `ON DELETE SET NULL (business_profile_id)` | A* | G | **C** | G | caught (`on delete n`) |
| F04 | social FK `ON DELETE SET NULL … NOT VALID`, then `VALIDATE` | C | G | **C** | G | caught (and the static social-FK rule) |
| F05 | `ON DELETE RESTRICT` | A* | G | **C** | G | caught (`on delete r`) |
| F06 | `ALTER CONSTRAINT … DEFERRABLE INITIALLY DEFERRED`, no drop | G | G | **C** | C | caught |
| F04b | `knowledge_items_business_scope_fk` re-added NO ACTION, `NOT VALID`, never validated | A* | G | G | G | confound; see F04c |
| F04c | `content_ideas_business_scope_fk` the same | G | G | G | G | **SURVIVOR** (outside the stated rule) |
| F07 | `public.q0_shadow` with an FK to `app.business_profiles` `ON DELETE CASCADE` | G | G | G | G | **SURVIVOR** (outside the probe schemas; low) |
| F08 | RI check triggers of `knowledge_items_business_scope_fk` disabled (tgisinternal) | A* | G | G | G | confound; see F08e/F08f |
| F08e | the same for `content_items_business_scope_fk` | G | G | G | G | **SURVIVOR**, harm measured §4.6 |
| F08f | the same for `content_ideas_business_scope_fk` | G | G | G | G | **SURVIVOR** |
| F08b | the same for `content_targets_social_scope_fk` | G | G | G | C | caught by rls-smoke only |
| F08c | `alter table app.knowledge_item_versions disable trigger all` (no user trigger there, so RI only) | G | G | G | G | **SURVIVOR** |
| F08d | `disable trigger all` on all 20 app tables with no user trigger | G | G | G | C | caught by rls-smoke only |
| F09 | `ALTER DATABASE <current> SET session_replication_role = replica` | G | G | C | C | caught **by accident**: 140's block dies on `audit_logs_outcome_matches_error` (23514), not on a trigger check |

### 4.3 Closure drifts

| # | drift | A | S | B | C | verdict |
|---|---|---|---|---|---|---|
| C01 | m3 | G | G | **C** | G | caught by name |
| C02 | extra PERMISSIVE insert policy `with check (true)` on knowledge_items | G | G | G | C | caught by rls-smoke (it widens the permissive side, not the closure) |
| C03 | second RESTRICTIVE insert policy (narrows) | G | G | C | G | caught by 040's name-set count; harmless |
| C04 | `alter policy … to authenticated, anon` | G | G | **C** | G | caught |
| C04b | `alter policy … to public` | G | G | **C** | G | caught |
| C05 | closure renamed away and recreated identically | A* | G | G | G | control: correctly green |
| R15b | knowledge_items closure dropped (control for R15) | A* | G | **C** | G | caught (`app.knowledge_items has no …`) |
| C05b | closure renamed to `knowledge_items_ub`, gutted | G | G | **C** | G | caught (`has no …_updated_by_is_caller`) |
| C06 | same predicate respelled: upper case, extra parens, `::uuid` | G | G | G | G | control: deparses identically, correctly green |
| C06b | same predicate, operands swapped | G | G | C | G | a false alarm on identical meaning (safe direction; F7) |
| C07 | `auth.uid()` replaced to prefer a client-settable GUC (every pinned text unchanged) | C | C | G | G | caught at A and S (db-verify / schema lint), not by the probe |
| C08 | closure recreated `FOR ALL` | A* | G | **C** | C | caught |
| C09 | knowledge_items `DISABLE ROW LEVEL SECURITY` | A* | G | C | C | caught by the pass (040) and rls-smoke |
| C10 | requester `or true` (proof) | G | G | **C** | C | caught |
| C11 | closure made permissive (proof) | A* | G | **C** | C | caught |

### 4.4 SECURITY DEFINER drifts

| # | drift | A | S | B | C | verdict |
|---|---|---|---|---|---|---|
| S01 | D14 | G | G | **C** | G | caught |
| S02 | `set search_path = public` | G | G | **C** | G | caught |
| S03 | `search_path=""` kept plus `work_mem` | G | G | **C** | G | caught (stricter than the claim; fine) |
| S05 | D44 in `app` | A* | G | **C** | G | caught |
| S04 | definer in `public`, no search_path, reads `workspace_members`, EXECUTE to authenticated | A* | G | G | G | caught at A only by 140's "reads no membership" text rule; see S04d |
| S04b | the same in new schema `q0x` | A* | G | G | G | the same; see S04e |
| S04c | the same in schema `auth` | C | C | G | G | caught at A and S |
| S04d | definer in `public`, no search_path, reads `app.security_events`, EXECUTE to authenticated | G | G | G | G | **SURVIVOR**, harm measured §4.6 |
| S04e | the same in new schema `q0x` with USAGE | G | G | G | G | **SURVIVOR** |
| S06 | control: `app.jwt_subject()` made SECURITY INVOKER | G | G | C | C | caught by 011's block and the authz proofs |

### 4.5 Trigger drifts

| # | drift | A | S | B | C | verdict |
|---|---|---|---|---|---|---|
| T01 | D20b | G | G | **C** | G | caught |
| T02 | `enable replica trigger` (`R`) | G | G | **C** | G | caught |
| T03 | `enable always trigger` (`A`) | G | G | **C** | G | caught (stricter than needed; fine) |
| T04 | `disable trigger all` on security_events | G | G | **C** | G | caught (user triggers `D`) |
| T07 | refuse_mutation on security_events recreated `before delete` only | G | G | **C** | G | caught (tgtype) |
| T08 | D21: `set_updated_at` on content_items disabled | G | G | **C** | C | now caught at B |
| T10 | refuse_mutation dropped (proof) | G | G | **C** | G | caught |
| T11 | refuse trigger moved to audit_logs under another name | G | G | **C** | G | caught |
| T05 | refuse_mutation on **security_events** recreated `… for each row WHEN (false) …`: enabled, tgtype 27 | G | G | G | G | **SURVIVOR**, harm measured §4.6 |
| T05c | refuse_truncate on security_events recreated `WHEN (false)`: tgtype 34 | G | G | G | G | **SURVIVOR** |
| T06 | refuse_mutation on security_events recreated `before update of user_agent_hash or delete`: tgtype 27 | G | G | G | G | **SURVIVOR**: an UPDATE of any other column is no longer refused |
| T05a | the same `WHEN (false)` on audit_logs | G | G | C | G | caught **by accident** (140's probe hits the 23514 CHECK, as in Q0's earlier F6) |
| T09 | `set_updated_at` on content_items recreated `WHEN (false)` | G | G | G | C | caught by rls-smoke only (`owner-a-cannot-backdate-a-content-item`) |

### 4.6 Harm, demonstrated by hand

This was one cluster, with T05, F08e and S04d appended together. `migrate-clean` said `ok`, and
`rls-smoke` passed all 965 cases. Then, as `postgres`, inside rolled-back transactions:

- **T05:** a new `app.security_events` row was `UPDATE`d (`occurred_at` backdated a year), with
  `UPDATE 1`, and then `DELETE`d, with `DELETE 1`. The append-only guarantee on security_events is
  gone, and the trigger probe's line still printed
  `the 4 append-only triggers are exactly where they belong`.
- **F08e:** a `content_items` row was inserted naming a `business_profile_id` that exists in no
  workspace (`content_items with no business profile=1`). The FK is still listed, `NO ACTION`, and
  the FK probe passed.
- **S04d:** `SET ROLE authenticated`, with no JWT, no membership and no grant on the table
  (a direct `select` was refused with `permission denied for table security_events`).
  `public.q0_sd(<workspace>)` returned that workspace's security-event count (`2`). The function
  is `proconfig=<none>` and owned by `postgres`.

### 4.7 Survivors re-run against the full static suite

These 23 were green on the proxy and on B and C, and each was re-run with the full
`npm run verify`: R01, R02, R03e, R04, R05, R06, R07, R07b, R11, R16, R19, R20, F04c, F07, F08c,
F08e, F08f, S04d, S04e, T05, T05c, T06, C06.

**All 23 are green on the full suite** (`npm run verify` exit 0 with each mutation applied). No
second test anywhere in the 668 catches any of them. Of the 23, R11 is by design, C06 is a correct
pass, and F07 and F04c are outside the stated rules. The other 19 are the findings below.

---

## 5. Findings

### F1: HIGH. The trigger probe checks two columns of a trigger and not what the trigger does; security_events can lose append-only while the probe prints "exactly where they belong"

The probe reads `tgenabled` and, for the refuse set, `(relname, tgname, tgtype)`. It reads neither
`tgqual` (`WHEN`) nor `tgattr` (`UPDATE OF`), and it excludes every `tgisinternal` trigger.
Measured survivors:

- **T05**: `WHEN (false)` on security_events' `refuse_mutation`. UPDATE and DELETE succeed (§4.6).
- **T05c**: the same on `refuse_truncate`.
- **T06**: `before update of user_agent_hash or delete`. tgtype is still 27.
- **F08e, F08f, F08c**: RI triggers disabled, so the FK is listed but not enforced (F4 below).

On audit_logs the same edit (T05a) is caught, but by 140's CHECK-violation accident, not by the
probe. The commit's claim, "the refuse_mutation set is exactly four", holds for names and tgtypes.
The claim the plan draws from it, that this "closes Q0 D20b and the survey's 093/120/140 disable
gap", holds only for `ALTER TABLE … DISABLE`. A trigger kept enabled and made inert is the same
harm, reached by another route.

**Remedy.** Pin `pg_catalog.pg_get_triggerdef(t.oid)` text for the four refuse triggers, which
covers WHEN, UPDATE OF, FOR EACH, timing and function in one comparison. Then extend the enabled
check to internal triggers (`tgisinternal` rows must also be `O`). The coordinator says the Author
is making exactly these two changes in the main checkout. **I have not tested that, and the ten
rows above are the cases it must fail.** Consider pinning the definition of all 47 non-internal
triggers the same way, since `set_updated_at WHEN (false)` (T09) is caught today only by one
rls-smoke case on one table.

### F2: HIGH (the same class as Q0's earlier F1). The probes and their loop are defended by regexes over their own text; eleven evasive edits leave every layer green while a drift is present

The contract test locates the loop by `indexOf` and matches one regex over the loop body. It
deep-equals the array at import time, and it matches one fragment of each probe's SQL. Each of
these keeps every matched fragment and disarms a probe:

- R01 (`continue`), R02 (`if (0) return 1`) and R03e (`splice` at run time): the loop.
- R04 and R19 (FK), R05 (closure), R06 (definer), R07, R07b, R20 and R16 (trigger): a probe's
  predicate made constant or narrowed.

All eleven were run with a drift that probe catches unmutated, and all are green on the full suite
(§4.7). The pinned constants carry no test of their values. R08 (`REQUESTER_CHECK_TEXT` rewritten
to match an `or true` drift) was caught only because rls-smoke has requester forging cases. The
survey says only 3 of the 14 updated_by tables have such a case, so the same edit to
`UPDATED_BY_CHECK_TEXT` plus drift on the other eleven would likely survive. That is inferred, not
measured.

**Why HIGH and not stop-the-line.** Each needs a deliberate edit to `run.mjs`, which review sees.
But the probe then prints its claim as true.

**Remedies, in order of cost:**

1. **A self-test inside the live target.** For each probe, inside `begin; … rollback;`, apply one
   known drift (m1, m3, D14, T05) and require that probe's SQL to raise with its own message
   before the real run's claim may print. That tests the predicate, the loop and the failure path
   by behaviour, and survives any rewording.
2. Pin each constant's value in the test, with the measurement it came from:
   `UPDATED_BY_CHECK_TEXT`, `REQUESTER_CHECK_TEXT`, `REQUESTER_CLOSURES` (its length is unpinned)
   and `REFUSE_MUTATION_TRIGGERS`.
3. Move the loop's decision into a pure function, as `decidePostMigrate` already is, and drive it
   with synthetic results.

### F3: MEDIUM. The SECURITY DEFINER rule stops at `app` and `private`; a definer function anywhere else reads tenant data for any caller

- **S04d**: a definer function in `public`, with no `search_path`, EXECUTE to `authenticated`,
  that reads `app.security_events`. It survives every layer. §4.6 shows `authenticated`, with no
  JWT and no grant, reading any workspace's event count through it.
- **S04e**: the same in a new schema.

The code comment says "in app and private". **The commit message's item 3 says "Every SECURITY
DEFINER function" without the qualifier.** `public` is where a hurried function lands by default.

**Remedy.** Check every schema except `pg_catalog` and `information_schema`, skip extension
members (`pg_depend.deptype = 'e'`), and name platform exemptions (the `auth` schema's) in a list
like `FK_ACTION_EXEMPTIONS`. Alternatively, a second rule: no function outside `app` and `private`
is SECURITY DEFINER at all.

### F4: MEDIUM. The FK rule reads the declared action, not whether the key is enforced

- **F08e and F08f**: a key's RI triggers are disabled. §4.6 shows an orphan row inserted.
- **F08c**: `disable trigger all` on a table with no user trigger.
- **F04c**: a key re-added `NOT VALID` and never validated.

Each survives every layer. F08b and F08d are caught, but only where an rls-smoke case happens to
exercise the key. This is outside the stated rule, which is about actions, but it is the same
guarantee reached by another route: "this key constrains the row".

**Remedy.** Add `c.convalidated` to the FK probe. The internal-trigger half is F1's remedy.

### F5: LOW. A database-level `session_replication_role = replica` silences every trigger and FK, and is caught only by accident

F09 fails `migrate-clean` because 140's own probe row hits a CHECK (23514) once `refuse_mutation`
stops firing. It is caught, but not by any statement of the rule.

**Remedy.** A probe that `pg_db_role_setting` holds no `session_replication_role`, and none of
`row_security` or `search_path`, for the database or for `authenticated`, `anon`, `service_role`
and `app_worker`.

### F6: LOW. FK exemptions are keyed by constraint name alone

`FK_ACTION_EXEMPTIONS` and its stale check match `conname` in any table and any schema. Constraint
names are unique per table, not per schema. One exemption would therefore exempt every FK of that
name. The list is empty today.

**Remedy.** Key it by `table.conname`, as the probe already prints it.

### F7: NOTE. The text pin fails safe on a meaning-preserving rewrite

C06 (case, parentheses, a no-op cast) deparses identically and passes. C06b (operands swapped)
fails `migrate-clean` although its meaning is the same. That is the right direction to fail in.
It will cost a batch author one confusing failure, and the probe's message names the pinned text,
which is enough. The Author already records the PostgreSQL-major-version limit.

### F8: NOTE. Outside the probe schemas, an FK can cascade (F07)

This has low impact today, because nothing outside `app` and `private` holds an FK. F3's remedy,
applied to FKs, would cover it.

### What held, and deserves saying

- All ten Author proofs fail `migrate-clean` by name. So do the further drifts the brief named:
  F03, F05, C04, C04b, C05b, S02, S03, T02–T04, T07 and T11. The honest runner edits are all caught
  at A.
- The closure probe is the strongest of the four. Every neutralisation I tried that kept the
  pinned policy's name either failed it or was caught elsewhere:
  - a role change;
  - a command change;
  - a rename-and-gut;
  - permissive;
  - a second policy;
  - RLS disabled;
  - `auth.uid()` replaced.

  Adding a permissive policy cannot loosen a restrictive one, and C02's harm was to the
  permissive side, where rls-smoke caught it.
- D14, D15-class and D44 inside `app` and `private`, D20b, D21 and m1–m3 are now caught at B, where
  on `main` they survived every layer.

---

## 6. Is anything stop-the-line?

**No.**

On `055b977` all layers are green on a cluster I built. The four probes do what the commit says for
the drifts it names, and they change nothing in the database. Every survivor is a gap in **defence
against future change**. None is a defect in what is merged. On this package's standard, a finding
is stop-the-line only if the merge itself is unsafe, and I have no such finding.

What I put to the Owner, without deciding it:

- **F1 is the one that matters most**, because the probe prints a claim, "exactly where they
  belong", that T05 makes false. The Author's in-flight correction is aimed at it. The ten F1 and
  F4 rows here should be the correction's live negative cases, and a Tester should run them against
  the corrected head. I have not.
- **F2 repeats a finding from my earlier review**, and it is cheaper to fix now than after a fifth
  probe. The live self-test (remedy 1) closes it by behaviour.
- **F3's commit-message wording** should match the code ("in app and private"), whichever way the
  remedy goes.

I approve nothing, and those decisions are not mine.

---

## 7. The main limit on my own run, in my own words

I share an author, a vendor and a model family with the thing I tested, and the author wrote my
brief. My top finding came from asking what keeps the probed columns intact while losing the
guarantee. The brief asked about `tgenabled` and `tgtype`, and the answer was the columns next to
them. I cannot tell how many further classes sit behind a question neither of us asked.

Concretely:

- **75 mutations is a sample, not a proof.** I pushed hardest on knowledge_items, content_*,
  security_events and `private.set_updated_at`.
- **Every run used `postgres` as the migration and probe role**, as CI does. The probes run only
  on `migrate-clean`'s fresh database, never on a provisioned instance, so drift made by hand in
  production is outside everything measured here.
- **I did not run CI**, and I did not test the Author's working tree.
- **The static layer per run was a fast proxy**, and the full suite ran only for survivors. That
  can only strengthen a "caught", never a "survivor".

---

*Cluster stopped and removed. The worktree is back at `055b977` plus this file, and
`git status` shows only this file before the commit.*
