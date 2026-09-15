# Q0 independent test — the pre-080 closure set (batches 022, 031, 042), open as PR #144

Run: `/claude/q0_sentinel_pre080`
Role: independent Tester, one of the same-vendor role runs Product Owner decision Q1/Q6
(`product-owner-disposition-2026-09-15-six-questions.md`) made countable.
Subject: branch `origin/agent/claude/WP-0A-DB-00-pre-080-closures`, commits `60b69b4`, `56a840d`,
`9d5664d` (head), branched from `main` = `4499344` (merge of PR #143). **Draft for the Product
Owner's disposition; not merged; A0 does not merge it.** Read from the remote-tracking ref with
`git show` and `git diff main...`; never checked out.
Base for this run: `main` = `4499344`.
Date: 2026-09-15.

**This document RECORDS TEST RESULTS.** It advances no package status, writes `test_verified`
nowhere, signs nothing on any author's behalf, and repairs nothing it found. Every defect named
below is left standing on the batch branch.

---

## 0. What I am, before anything else

**I am a subagent spawned by `/claude/a0_atlas`, the Author of this package and the author of the
three files under test, and I run in the same vendor and model family.** A0 wrote the three briefs I
was handed and chose what to point me at: the S8-map premise, the seven cases, the CI partition,
the witness types, a reversal round against the static suite, and a scratch PostgreSQL. Under Q1 of
the 2026-09-15 disposition a distinct same-vendor run in a named role counts as that role's
signature; this run is distinct from A0. What that does and does not buy:

- **Every verdict below is a claim against the tree or against a database, with a `file:line`, a
  command, or a run id beside it**, so a reader re-runs it rather than trusting me. A shared model
  does not change what `020_business.sql:452-455` grants or what `pg_policy` holds.
- **Where I contradict the Author's record, I say so and show the measurement.** F4 rejects a
  cell the S8 map wrote three times — the map is the document the Owner is being asked to decide
  from. F2 says the sentence "this case fails against 020 and 021 alone", written into all seven
  cases and the Author's evidence §2, rests on one term no rule reads.
- **Where the briefs were wrong I followed the tree.** `brief-common.md` says "No PostgreSQL is
  available on this machine. Say so." That is false, and the subject override says so:
  Homebrew `postgresql@17` 17.11 is installed and every runtime claim below was **measured** on a
  scratch cluster I created on port 5523 (§3), never on the user's server at `/tmp:5432`, which I
  did not connect to. The brief-tester text is written for a batch `<NNN>`; the override maps it to
  this three-file set, and where it names a PR run id for another batch I read PR #144's own run.
- **Framing is the cost I cannot pay from inside.** A0 chose the questions. The findings that came
  from outside the brief — F1's `ALTER POLICY` probe and F2's constant — came from asking what
  the seven cases actually read, not from anything I was pointed at. There are probably others.
- Pressure from the coordinator, in either direction, is not evidence, and none was applied.

---

## 1. The declared commands, verbatim

Run on `agent/claude/WP-0A-DB-00-q0-test-pre-080`, made from `main` at `4499344`, in this
worktree, with `npm ci --ignore-scripts` (exit 0) first. Node `v24.20.0`, npm `11.19.0`.

| Command | Exit | Output line |
|---|---|---|
| `npm run verify` (this branch, before this file) | **0** | `clean: exit 0 — tests 643, pass 643, fail 0, skipped 0, todo 0` |
| `npm run verify` (this branch, with this file) | **0** | `clean: exit 0 — tests 643, pass 643, fail 0, skipped 0, todo 0` |
| `node --test tests/db/identity/identity-isolation.test.mjs`, `main` files | 0 | `ℹ tests 285` · `pass 285` · `fail 0` |
| the same, branch files copied in (§3) | 0 | `ℹ tests 285` · `pass 285` · `fail 0` |
| `node --test test-kits/db/foundation-contract.test.mjs`, `main` / branch files | 0 / 0 | `tests 60, pass 60` both |
| `buildCases()` on `main` / with the branch's `isolation-cases.mjs` | — | **847** / **854**, 0 duplicate ids |

So the branch adds **7** cases and **0** static tests (`identity-isolation.test.mjs` gains three
rows in `SERVICE_PATH_CLOSURES` and two comment lines, `:9685-9690`), which matches the PR body,
the handoff, and the numbers the override brief told me to expect: 854, 7-of-854, 643, 285, 60. **I
read nothing else.** `npm run check:scope` is not cited (it is not evidence).

**CI.** PR #144's run is [34920300638](https://github.com/ThinkBizLab-Org/ThinkBizThai/actions/runs/34920300638)
on head `9d5664d`, conclusion `success`, every step 5–11 `success`. Its log prints
`applied 022_business_service_path_closed.sql`, `applied 031_…`, `applied 042_…`,
`db-migrate-clean: ok in 2291ms`, `db-schema-lint: ok in 70ms`,
`db-rls-smoke: 854 isolation case(s) passed.`, `ℹ tests 643 / pass 643 / fail 0`, and the eight
negative-control lines quoted in §4.2. The CI job checks out the branch (Q4's fix is on `main`);
it does not run `npm run verify`, so the verify line above is this machine's, on the branch name.

---

## 2. The premise, checked against the tree

The Author's premise (`a0-pre-080-families-s8-map-2026-09-15.md` §3 row 1; the PR body; each
file's header) has three legs. The override brief calls checking them "the single most valuable
thing you can confirm or refute". All three hold. One cell of the map is wrong in a way that
matters to the reader it was written for (F4).

**Leg 1 — no `S` cell.** RFC-2026-022 §3's table
(`architecture/decisions/RFC-2026-022-service-policy-shape.md:173-183`) lists nine `S` cells by
batch: 140, 070, 120/121, 051, 061, 140, 050, 110/131, 100/160. None is 020, 021, 030, 040 or 041.
The matrices the cells come from: §8.1 (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:337-348`)
gives the Service column `P`, `P`, `N` on Business/Page SELECT, INSERT/UPDATE/archive, and
immutable version UPDATE/DELETE; §8.2 (`:351-366`) gives `P`, `P`, `N` on Knowledge SELECT,
current INSERT/UPDATE/archive, and version UPDATE/DELETE. The industry assignment inherits §8.1's
Business cells (`030_industry.sql:492`). **No `S` anywhere on the seven tables. Confirmed.**

**Leg 2 — `app_worker` holds grants no policy admits.** Grants: `020_business.sql:452-455`
(`select, insert, update` on `business_profiles` and `page_context_profiles`; `select, insert` on
both version tables), `030_industry.sql:485` (`select, insert, update` on `industry_assignments`),
`040_knowledge.sql:529-530` (`select, insert, update` on `knowledge_items`; `select, insert` on
`knowledge_item_versions`), `041_knowledge_resolution.sql:359` (EXECUTE on
`knowledge_scope_applies`, a `security invoker` predicate that reads no relation, `:288-356`).
Policies: I listed every `create policy` on the seven tables across the whole migration set —
`020:477-561` (ten), `021:595-618` (four narrowings) and `:648-716` (six scoped-editor
policies), `030:507-598` (six), `040:551-687` (seven), `102_updated_by_is_caller.sql:35-48` (four
restrictive INSERT policies) — thirty-seven, and **every one is `to authenticated`; none is
`TO PUBLIC`; none names a service role.** Confirmed on the live catalog too (§3, P-A1: 44
policies on the seven tables, `polroles = {authenticated}` on all 37 that pre-date the branch,
`{0}` on the seven closures; P-A2/P-L: `app_worker` and `authenticated`
are the only roles with any privilege; `app_command`, `app_maintenance` and `anon` hold no USAGE
on schema `app`). **Confirmed** — and understated by the map (F4).

**Leg 3 — the narrowings are `for all to authenticated`.** `021:595-618` (four),
`030:596-598`, `040:657-659` and `:685-687`. Confirmed in text and in the catalog (P-F:
`polroles = {16387}` = `authenticated`, `is_public = f`, on all seven `*_scope_narrows_member`).
They make the claim 080's did: `021:575-579` and `040:215` describe the restrictive policy as
the thing that ANDs with "every permissive policy". A policy applies to the roles its TO clause
names; these bind `authenticated` and nobody else. **Confirmed — this is S8's shape.**

**Two things the premise does not say and I checked anyway.** (i) No policy or function in any
other family reads the seven tables (grep `from app.<table>` over every migration outside
020–042: zero hits outside `102`), so a closure here pre-empts nothing indirectly — a future
CARRIED worker policy on research or metering does not resolve through a closed table.
(ii) The only `SECURITY DEFINER` functions in the schema are `app_authz`'s three
(`is_active_member`, `workspace_member_role`, `jwt_subject`; P-H) and they read
`workspace_members`, not a closed table, so `current_user` inside them is never asked the
closure's question. The `member_scope_*` helpers are `security invoker` (`021:389-483`) and read
`workspace_member_scopes`, which is not closed.

**The reasons for what is left open.** Metering (061) and research (070): RFC-2026-022 §3 rows
`061` and `070` are CARRIED `S` cells, so a `TO PUBLIC` closure would AND against the
`TO app_worker` policy the RFC expects when it comes into effect; the reason holds, and the map's
(a)/(b)/(c) are genuinely the Owner's. `industry_packs` and `industry_pack_versions`: `<no
policy>` at all (P-M), FORCE RLS, `app_worker` SELECT only — they make no narrowing claim, so
they are not S8's shape; the reason holds (they are 082's assertion-3 shape, "grant and no
policy", which is a different question). `workspace_member_scopes`: three policies, all
`to authenticated`, no restrictive narrowing, `app_worker` SELECT and INSERT (`021:357`; P-M) —
no narrowing, no S8 claim; the reason holds. The header's phrase "an app_authz question"
(`022:31`) is loose — `app_authz` neither owns nor reads that table — but the decision it records
is right.

---

## 3. What the database said

**Scratch cluster.** `initdb` (PostgreSQL 17.11, `--locale=C`, trust) into this worktree, started
on `127.0.0.1:5523` with no unix socket, database `thinkbizthai_test`, shim
`db/foundation/ci/supabase-shim.sql` applied, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5523/thinkbizthai_test`
with `LC_ALL=C TZ=UTC PGTZ=UTC`. Re-`initdb` before every fresh apply (001 creates cluster
roles). The branch's four files (`022`, `031`, `042`, `isolation-cases.mjs`) plus
`catalog-snapshot.json`, `identity-isolation.test.mjs` and `foundation-contract.test.mjs` were
copied into the worktree with `git show origin/…:<path> > <path>`, verified byte-identical to the
branch by SHA-256 after every probe round, and restored with `git checkout --` / deleted before
this file was committed. The cluster was stopped (`pg_ctl stop -m fast`; nothing listens on 5523)
and its directory removed before the commit. **Nothing here touched `/tmp:5432`.**

### 3.1 The declared targets, with and without the three files

| Set | `migrate-clean` | `schema-lint` | `rls-smoke` |
|---|---|---|---|
| branch (all files) | `applied 022_…`, `031_…`, `042_…`; `ok in 932ms` | `ok in 32ms` | **`854 isolation case(s) passed.`** |
| the same **without** the three closure files, fresh cluster | `ok in 842ms` | (not run: the branch's snapshot declares the three files) | **`FAILED — 7 of 854 case(s)`** |

The seven failures are exactly the seven new ids, each `(assert): … nothing was visible`; no
other case moves in either direction (854 − 7 = 847 by count, and the failed-line list is the
seven). This is the Author's §2 measurement, reproduced. One lint note for the record: with the
three files copied and `main`'s `catalog-snapshot.json`, `schema-lint` fails
(`not_applied_to_this_instance … is not the tail`) — the branch's snapshot fixes it, CI ran the
branch's, and the contract suite's tail rule passes 60/60 with it.

### 3.2 The S8 exploit, replayed on all seven tables (P-B; the Author replayed it on one)

Inside one rolled-back transaction: `create policy probe_worker_reads on app.<t> for select to
app_worker using (true)` on each table, then `set role app_worker; select count(*)`:

| Table | fixture rows | with the closure | closure dropped |
|---|---|---|---|
| `business_profiles` | 5 | **0** | 5 |
| `business_profile_versions` | 4 | **0** | 4 |
| `page_context_profiles` | 5 | **0** | 5 |
| `page_context_profile_versions` | 5 | **0** | 5 |
| `industry_assignments` | 3 | **0** | 3 |
| `knowledge_items` | 5 | **0** | 5 |
| `knowledge_item_versions` | 5 | **0** | 5 |

**The write half (P-C, `knowledge_items`).** A copy of a fixture row with a fresh id, inserted as
`app_worker`:

| Configuration | Result |
|---|---|
| 1. branch as it is (closure, no worker policy) | `ERROR: new row violates row-level security policy for table "knowledge_items"` — **unnamed**: the permissive group is empty, so the always-false WITH CHECK fires first |
| 2. closure dropped, no worker policy (040 alone, today) | the **same unnamed error, byte for byte** |
| 3a. closure dropped + `for insert to app_worker with check (true)` | **`INSERT 0 1`** — the row lands in tenant A's workspace, written by the service; read back as `postgres` |
| 3b. as 3a + a SELECT policy for the worker, with `RETURNING` | `ROW WRITTEN by app_worker into workspace c4840acc-…` |
| 4. closure re-created beside both probe policies | `ERROR: new row violates row-level security policy "knowledge_items_service_path_closed" for table "knowledge_items"` — **named** |

Rows 1 and 2 are the "changes nothing today" claim, measured: the closure decides nothing for
the existing service cases, because the absence of a permissive policy refuses first. Rows 3a
and 4 are S8 and its closure. One mechanic worth writing down because my first pass tripped on it:
`INSERT … RETURNING` also applies the SELECT policies to the new row (a worker with an INSERT
policy and no SELECT policy is refused, unnamed, on the RETURNING); the write itself needs no
SELECT policy, which is what 3a shows.

**Other roles (P-K, P-I).** `app_maintenance` given USAGE on `app`, SELECT on
`industry_assignments` and a permissive policy: **0** rows with the closure, 3 without — 082's
"deliberately refuses a future maintenance sweep" holds here. Flipping a closure's predicate to
`current_user = 'app_worker'` admits the worker (5 rows) — and the case still passes (F1).

**`authenticated` (P-J).** `private.as_user(owner_a)` sets `role = authenticated`;
`current_user` inside the policy is `authenticated`; owner A still sees 4 `knowledge_items`. The
854 green cases are the measurement that every `authenticated` case is unchanged.

---

## 4. Hand-simulation of the seven cases, against what the database then said

### 4.1 The cases

All seven are one template (`isolation-cases.mjs` on `9d5664d`, `:12780-12862`): `as: ownerA`
(`as_user` → role `authenticated`), `sql: SERVICE_PATH_CLOSURE_ON` (`:15390-15392`), one table
in `params`, `expect: 'rows'`, no `deniedBy`, no `deniedOn`, no witness. The statement is

```
select polname from pg_catalog.pg_policy where polrelid = ('app.' || $1)::regclass
  and not polpermissive and polcmd = '*' and polroles = '{0}'::oid[]
```

| Line | Case | Table | Layer the case names | What decides | Verdict |
|---|---|---|---|---|---|
| 12780 | `batch-022-…-on-the-profile-table` | `business_profiles` | none (a catalog read) | `pg_catalog` is readable by every role; the closure row exists with `polpermissive = f`, `polcmd = '*'`, `polroles = {0}` (P-A1) | right |
| 12792 | `…-the-profile-version-table` | `business_profile_versions` | " | " | right |
| 12804 | `…-the-context-table` | `page_context_profiles` | " | " | right |
| 12816 | `…-the-context-version-table` | `page_context_profile_versions` | " | " | right |
| 12828 | `batch-031-…-the-assignment-table` | `industry_assignments` | " | " | right |
| 12840 | `batch-042-…-the-item-table` | `knowledge_items` | " | " | right |
| 12852 | `…-the-item-version-table` | `knowledge_item_versions` | " | " | right |

**Outcome**: PostgreSQL returns one row per case on the branch and zero rows against the set
without the file (P-D3: `<no rows>`; §3.1). `expect: 'rows'` is right; there is no `deniedBy` to
be wrong; the `why` text — "fails against 020 and 021 alone and passes with 022", "the id names no
family word because each is a CI control pattern" — is true as measured (§3.1, §4.2). **0 wrong,
0 wrong-layer.**

**Right-for-the-wrong-reason, in the sense the brief asks for.** The thing to find is "a case
that would pass unchanged if the policy were deleted". Deleted, all seven fail (measured). But
the case reads three of the closure's five properties and not the two that make it a closure:

- P-D: `alter policy knowledge_items_service_path_closed on app.knowledge_items using (true) with
  check (true)` — the case still returns `knowledge_items_service_path_closed`; a worker with a
  permissive policy then reads **5** rows. The case is green over a closure that closes nothing.
- P-D2: drop the closure, create `knowledge_items_anything as restrictive for all using (true)
  with check (true)` — the case returns `knowledge_items_anything` and is green.
- P-I: flip the predicate to `'app_worker'` — green.

The predicate is asserted by apply-time claim 1 of each file (`022:82-115`, `031:55-88`,
`042:62-95`), which runs once, at that file's own apply, and by the static rule
(`identity-isolation.test.mjs:9697-9731`), which reads only files named
`*_service_path_closed.sql`. A later migration's `alter policy … on app.<closed table>` is
refused by nothing: not the case, not the static rule, not `schema-lint` (its alter/drop-policy
rule at `scripts/db/run.mjs:112` covers the managed schemas `auth|storage|realtime` only). This is
**F1**, and it is inherited: the thirteen 082/083/092/101 cases use the same constant and are open
to the same probe. The seven are right; they are right about less than their family's `why`
("reads that policy back … with all three properties", `:12661-12663`) suggests.

### 4.2 The partition, and CI's count

A case changes outcome when a table's RLS is disabled exactly when it is `no-rows`, `no-effect`,
or `denied` with `deniedBy: 'policy'`. All seven are `rows` over `pg_policy`, and `alter table …
disable row level security` does not remove a policy from the catalog (P-E: the case returns the
row with RLS disabled). So the seven are in **no control's basis** — the same position as
082/083/092/101's. Measured two ways:

- **CI**, run 34920300638 (branch) against run 34905360222 (`main` at `4499344`): the eight
  negative-control lines are identical — `business_profiles (020): 13`, `page_context_profiles
  (020): 11`, `workspace_member_scopes (021): 64`, `industry_assignments (030): 13`,
  `industry_packs (030): 1`, `industry_pack_versions (030): 1`, `knowledge_items (040): 28`,
  `knowledge_item_versions (040): 9`, each with the same first-named case.
- **Here**, the control replayed in the step's own shape (disable one table, run the suite,
  re-enable, count `^  <id> [covers] (phase):` lines) on all eight tables including the two
  version tables CI has no entry for: 13 / 5 / 11 / 2 / 64 / 13 / 28 / 9 noticed,
  `closure-cases-among-failures = 0` on every entry, and `854 passed` again with everything
  re-enabled.

None of the seven ids matches any of the 48 control patterns in `ci.yml:200-818` (checked
programmatically against the list, not by eye), and no static rule filters ids on `profile`,
`context`, `assignment`, `item-table` or `item-version` (`identity-isolation.test.mjs`, every
`.id.includes` / `.test(c.id)` site read).

### 4.3 Witnesses, and the twelve service cases the closure sits under

**No witness.** None of the seven carries `witness`, `equals`, `deniedBy` or `deniedOn`, so
there is no CSV-type comparison to check; nothing here compares a boolean or a NULL.

The twelve existing service cases on the seven tables (`as: service` → `app_worker`), by outcome:
`no-rows` × 5 (`service-path-is-denied-a-business-read-rls-must-filter`,
`service-sees-zero-industry-assignments`, `-knowledge-items`, `-knowledge-versions`,
`service-resolves-zero-knowledge-items`), `no-effect` × 1
(`service-cannot-update-a-knowledge-item`, witness `name = "fixture knowledge a1 business"`, a
text column, string-compared), `denied`/`policy` × 2 (`service-path-cannot-create-a-business`,
`service-cannot-create-a-knowledge-item`, both `deniedOn` the table), `denied`/`grant` × 4 (the
two version UPDATEs and two version DELETEs). **The closure decides none of them**: the reads are
zero rows with or without it (P-B, closure dropped, before the probe policy is added, is the
suite's own state), and the two policy-layer INSERT refusals are the unnamed always-false WITH
CHECK in both configurations (P-C rows 1 and 2, identical text). Their `why`s say exactly that
("row level security finding no permissive policy to admit the row", `:5749-5754`), so they are
right and stay right; the PR body's "nothing else moves" is measured true.

---

## 5. Reversal probes

Each probe rewrites one file in the worktree (branch state), runs
`node --test tests/db/identity/identity-isolation.test.mjs`, and restores the file from a pristine
copy; the harness reports NOT APPLIED if the replacement matched nothing, and I checked that it
reported 0 of those. Tally read from the `ℹ fail N` line and the `✖` lines — node's spec reporter
prints `✖` for a failure, not `not ok`. Baseline 285/285; restored 285/285.

| # | Reversal | Static suite | Database |
|---|---|---|---|
| P1 | 022: `business_profiles` closure `for select` | NOTICED (shape rule) | — |
| P2 | 031: closure given `to app_worker` | NOTICED (shape rule + the `S` cell rule) | — |
| P3 | 042: USING half `current_user = 'app_worker'` | NOTICED | — |
| P4 | 022: one closure deleted | NOTICED | — |
| P5 | 042: claim 1 count `2` → `0` | **MISSED** | `migrate-clean` **FAILED** (the block raises on a correct catalog) |
| P6 | 022: claim 2 gutted, `where false and not exists …` | **MISSED** | `migrate-clean` **ok** — applies clean, asserts nothing |
| P7 | 031: the whole `do $$` block removed, its two pinned sentences kept in a comment | **MISSED** | `migrate-clean` **ok** |
| P8 | 042: `grant select … to app_command` smuggled in | NOTICED | — |
| P9 | 022: an extra closure on `workspace_member_scopes` | NOTICED (declared list) | — |
| P10 | cases: the `knowledge_items` case repointed at the version table | NOTICED | — |
| P11 | cases: the 031 case deleted | NOTICED | — |
| P12 | cases: the 031 case's `sql` swapped for `select 1 as polname` | NOTICED (`c.sql === SERVICE_PATH_CLOSURE_ON`) | — |
| P13 | cases: `SERVICE_PATH_CLOSURE_ON` loses `and polroles = '{0}'::oid[]` | **MISSED** | `rls-smoke` **854 passed with the closures — and 854 passed WITHOUT them**; constant restored: 7 of 854 |
| P14 | 022: closure renamed `…_service_closed` | NOTICED | — |
| P15 | 031: closure `as permissive` | NOTICED | — |
| P16 | 042: claim 3's role filter inverted to `<> 'app_worker'` | **MISSED** | `migrate-clean` **FAILED** (raises on a correct catalog) |
| P17 | suite: the 031 row deleted from `SERVICE_PATH_CLOSURES` | NOTICED (file on disk, no row) | — |

**Honest tally: 17 run, 12 noticed, 5 missed** by the static suite; of the five, the database
caught two (P5, P16 — assertions turned false, which is loud) and missed three (P6, P7, P13 —
assertions turned silent, which is the shape that matters). Eleven of the twelve static catches
are one rule (`every service-path closure on disk is declared, and every declared closure has
082's shape`), so a defect in that rule's regex hides eleven probes at once; the Author's 082 probe
record said the same of its six. P13 is the probe I would put in front of the Owner: it removes
one term from one constant, leaves 285/285 and 854/854 green, and turns "fails against 020 and
021 alone" — written into seven `why`s and the Author's §2 — into a sentence that is no longer
true, without anything going red.

---

## 6. Findings

### F1 — MEDIUM. The seven cases assert a closure's existence and not its predicate; nothing after apply time guards the predicate

`SERVICE_PATH_CLOSURE_ON` (`isolation-cases.mjs:15390-15392`) reads `polpermissive`, `polcmd` and
`polroles`; it does not read `polqual` or `polwithcheck`. Measured (§4.1): a closure altered to
`using (true) with check (true)`, a closure whose predicate is flipped to `'app_worker'`, or a
differently-named restrictive `FOR ALL TO PUBLIC` policy with any predicate each satisfies all
seven cases, and under the first two a worker with a permissive policy reads every row. The
predicate is asserted only by each file's own claim 1 at its own apply, and by a static rule that
reads only `*_service_path_closed.sql`; a later file's `alter policy … on app.<closed table>` is
refused by no case, no static rule, and not by `schema-lint` (`scripts/db/run.mjs:112`, managed
schemas only). Inherited by the thirteen 082/083/092/101 cases, which share the constant. Not a
leak today; a statement about what "one catalog case per table" proves. The repair is small
(`and pg_get_expr(polqual, polrelid) = pg_get_expr(polwithcheck, polrelid) and
position('current_user' in lower(pg_get_expr(polqual, polrelid))) > 0`, or a second case), and
it is A0's, not mine.

### F2 — MEDIUM. `SERVICE_PATH_CLOSURE_ON` is pinned by no rule, and the negative property rests on one of its terms

P13: with `and polroles = '{0}'::oid[]` removed, the static suite is 285/285, the suite with the
closures is 854/854, and the suite **without** the closures is also 854/854, because the 021/030/040
narrowings are restrictive `FOR ALL` and now satisfy the statement. The sentence "this case fails
against 020 and 021 alone", in all seven `why`s (`:12786-12789` and six more), in the Author's
evidence §2 and in the PR body, is true today and is held true by a term that
`identity-isolation.test.mjs` never reads (`:27` imports the constant; `:9727` compares identity,
not text). Same shape as 082/083/092/101, whose "fails against 080 alone" sentences rest on the
same term.

### F3 — MEDIUM. The three apply-time blocks can be silenced or removed with every static rule green

P6 (claim 2's `where` prefixed with `false and`) and P7 (the whole block replaced by a comment
carrying the two sentences the rule matches) both leave 285/285 and both **apply clean**. The
rule matches the sentences against `raw` (`identity-isolation.test.mjs:9719-9721`), comments
included, so a comment satisfies it. P5 and P16 are caught only because they turn a true
assertion into a false one; an assertion turned silent is caught by nothing. Q0-080 Q1 and
Q0-081 F4 recorded the same lesson for other blocks; the three new blocks are 082's copied, and
so is the gap.

### F4 — LOW (record). The S8 map understates the worker's grants in all three "closable now" rows

`a0-pre-080-families-s8-map-2026-09-15.md` §2 says business/page: "SELECT on all four";
industry: "SELECT on … `industry_assignments`"; knowledge: "SELECT on both". The tree says
`select, insert, update` on `business_profiles`, `page_context_profiles`, `industry_assignments`
and `knowledge_items`, and `select, insert` on the three version tables
(`020:452-455`, `030:485`, `040:529-530`; P-A2). The three migration headers (`022:24`,
`031:24`, `042:24`) get it right, so the files are not wrong; the map is the document the Owner is
asked to decide from, and its row makes the pre-080 families look like 080 (read-only grants) when
they are 100's sharper case (the worker already holds the writes — §3.2 row 3a is what that
licenses). Two smaller record notes: `022:24` says "batches 020 and 021 grant app_worker …" —
021 grants nothing on the four closed tables (`021:357` is `workspace_member_scopes`); and
`022:31` calls the open helper table "an app_authz question" — `app_authz` neither owns nor reads
it.

### F5 — LOW. Message-shape claim in the header is true for a reason the file does not state

Each header says a service role "is refused there today because no permissive policy admits it,
and refused tomorrow by this closure" (`022:26-27`). Measured: today's refusal and tomorrow's
have different text — unnamed today (the always-false permissive WITH CHECK fires first), named
`"<table>_service_path_closed"` only once a permissive policy exists to pass (§3.2 rows 1, 4). The
two `deniedBy: 'policy'` service cases would therefore carry the same unnamed message with the
closure deleted; they are not evidence about the closure and do not claim to be. Record only.

---

## 7. Findings, collected

| # | Severity | Finding | Where |
|---|---|---|---|
| F1 | **MEDIUM** | Cases assert existence, not predicate; `alter policy` on a closed table after apply is guarded by nothing | `isolation-cases.mjs:15390-15392`; probes P-D, P-D2, P-I; `run.mjs:112` |
| F2 | **MEDIUM** | The constant is unpinned; without its `polroles` term the seven cases pass against the set with no closures | probe P13; `identity-isolation.test.mjs:27, :9727` |
| F3 | **MEDIUM** | Apply-time blocks silenced (P6) or removed (P7) with the static suite green and `migrate-clean` ok | `identity-isolation.test.mjs:9719-9721` |
| F4 | LOW (record) | The S8 map understates the worker's grants in all three rows the Owner is deciding on; two loose sentences in 022's header | map §2; `020:452-455`, `030:485`, `040:529-530`; `022:24, :31` |
| F5 | LOW (record) | "Refused today / refused tomorrow" is true with two different messages; the existing policy-layer service cases are not about the closure | §3.2 rows 1–2 vs 4 |

**Is any of this stop-the-line?** `CONTRIBUTING_AGENTS.md` names tenant leakage among the
stop-the-line incidents. **I found no leak and no false control**: the seven closures do what
their headers say on all seven tables, on read and on write, for `app_worker` and
`app_maintenance` alike, and `authenticated` is unchanged (§3). F1–F3 are about how much the
cases and the static rules would notice if that stopped being true. **No stop-the-line.**

---

## 8. What a hand-simulation cannot establish, what I did not review, and what I did

- **Everything in §3 was measured, not simulated**, on PostgreSQL 17.11 with the CI shim; §4's
  "what decides" column is my reading of the catalog and PostgreSQL's documented policy
  semantics, and every line of it was then confirmed by a run. What the scratch cluster cannot
  establish: anything about the platform (`service_role`'s real `BYPASSRLS`, the managed `auth`
  schema) — the shim's own header says so; and anything about a command function, because none
  exists to run.
- **`FORCE ROW LEVEL SECURITY` decides none of the 854** (no case runs as a table owner); it is
  guarded by claim 4 of each file, which P7 shows can be removed.
- **I did not re-simulate the 847 pre-existing cases** beyond the twelve service cases in §4.3 and
  the control replay; the 854 green run is the measurement that they are unchanged.
- **I did not review** the handoff beyond its diff, the `open_blockers` entry's wording, the
  `NOT_ON_THE_INSTANCE` comment text, RFC-2026-023's content (only its `In review` status),
  or whether `§8.5/service-P-closed` is the right `covers` tag (§8.5 is "Mandatory RLS
  patterns"; 101 used the same tag).
- **My seventeen probes are not a coverage measurement.** Five were chosen to slip.
- **What I measured on the scratch cluster, in full**: three fresh applies of the branch set
  (854 green each), one apply without the three files (7 of 854), eight control replays, four
  single-file mutation applies (P5, P16 failed; P6, P7 ok), two P13 suite runs plus its control,
  and the P-A…P-M probe blocks in §3, every write inside a rolled-back transaction.

---

## 9. Disposition

Nothing here advances `WP-0A-DB-00`. `status` stays `in_progress`; no gate in
`review_and_test_gates` is satisfied by this file; `test_verified` is not claimed. Whether this
run's file counts as the Tester signature PR #144 lacks is for the Integration Owner under Q1;
this file does not say it does. **The question the Owner has to answer — whether 082's shape
applies to families merged before Q3 existed — is not answered here**; what is answered is that
the premise the Author put under that question holds against the tree on all three legs, with
the worker's grants wider than the map says (F4).

**What this file signs:** that the seven cases demand the outcome PostgreSQL produces (0 wrong,
0 wrong-layer); that they fail exactly and only when their closure is absent (§3.1) and sit in no
control's basis (§4.2, CI and here); that the three closures refuse every service role every row
on read and on write and leave `authenticated` unchanged, measured on all seven tables (§3.2);
that the existing 847 cases do not move; and that the not-closed tables are left open for reasons
that hold (§2).

**What it does not sign:** that the cases would notice a closure that stopped closing (F1), that
the "fails without the file" property is held by anything but one unread term (F2), that the
apply-time blocks are worth more than "did not raise on this cluster" (F3), or anything about the
platform.

Owed to the Author (A0), in the order I would fix them: **F1** (four terms in one constant, or a
second case per table — which also settles F2 if the constant is then pinned by a rule that reads
its text), **F3** (a rule that reads the block's code, not `raw`), then F4's three sentences.
Owed to the Owner: nothing beyond the decision the PR is a draft for, with F4 read first.
