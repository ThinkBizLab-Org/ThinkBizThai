# Q0 independent test: batch 160 preparation (PR #170)

- **Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-160-prep`
  (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/170>, Draft, open, MERGEABLE), head
  `1706111f822cfa87d61943fdb3ed0f29e586878f` (handoff alone) over code `159d43bb1b780ef7677ab953cbb7d229b35ba405`,
  plan and disposition `f9d9a79`, base `c7fe264` (main; `origin/main` is still `c7fe264`). Author `/claude/a0_atlas`.
- **Reviewed on:** my own branch `review/q0-batch-160-prep`, checked out at `1706111` in worktree
  `wf_5b1db44b-fe1-4`. The branch name is checked out in the Author's worktree (`wf_5b1db44b-fe1-1`). For the
  commands that read the branch name (`npm run check:handoff`, `npm run verify`, `npm run check`), I pointed this
  worktree's HEAD at `refs/heads/agent/claude/WP-0A-DB-00-batch-160-prep` with `git symbolic-ref`. It was the same
  SHA and the tree was clean. I made no commit and moved no ref. `git rev-parse --abbrev-ref HEAD` printed the branch
  name, and I pointed HEAD back straight afterwards. HEAD was never detached.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own workflow, and the same vendor and model family as the
Author (RFC-2026-024). I am independent of the Author's run, but not of its vendor or its orchestration. So this
record is evidence for the Tester role, not that role's signature. Accepting it as the role's signature is the act of
the Integration Owner and the Product Owner.

## 1. Measured vs read

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`, first on PATH), checked with `node -v` before every
measured run. The PATH Node 26 never ran a measured command.

**Measured (exit codes I observed myself):**

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs c7fe264 WP-0A-DB-00` | `1706111` | **0** | "all 12 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | branch name, `1706111` | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | branch name, `1706111` | **0** | `clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0` |
| `npm run check` | branch name, `1706111` | **0** | tests 684, pass 684, fail 0 |
| `node scripts/regenerate-integrity-manifest.mjs --check` | | **0** | 88 digests; `git status` empty afterwards |
| `node scripts/scan-repository-secrets.mjs` | | **0** | |
| `make db-schema-lint` / `make db-contract-check` | static | **0 / 0** | ok / ok |
| `node --test test-kits/db/foundation-contract.test.mjs` | | **0** | tests 80, pass 80. The three batch-160 tests open at `:3791`, `:3918` and `:3970`, as plan §1 says. |
| the guard's own count (`stripNonCode`, `countDeclaredTests`, `\bassert\.\w+\(`, name digest) on `git show` of each tree (`q0-160-prep/count.mjs`) | `c7fe264` / `1706111` | n/a | **77 / 80** tests, **633 / 720** assertions, digest `a91ced9f62276ebe` / `8c35e631c28c0574`. These equal the floors at `scripts/test-suite-contract.mjs:89`, `:192` and `:232`. |
| cherry-pick fidelity | `9dd168e` vs `60105df`, and the head | n/a | The blobs of `retention-map.json` (`1688d3c` at the pick, `52c41db` after packaging), `purge-order.json` (`ee8ef9c`) and `export-manifest.fixture.json` (`dd037cc`) are identical between the draft and the pick. The added lines of `foundation-contract.test.mjs` are byte-identical between `9dd168e^..9dd168e` and `c7fe264..1706111`, and the head removes no line from the file. `git range-diff` shows only the floor, digest and VERIFICATION conflict lines differing, as plan §0 says. |
| packaging diff of `retention-map.json` (`60105df..159d43b`, word diff) | | n/a | Only the `WP:` citations changed (+1 each, plus the blocker index), and the `; WP:<n> (open_blockers[i])` suffixes were appended to finding sources. No row, class, control or number changed. |
| blocker edits (`q0-160-prep/blk.mjs`, base manifest vs head) | | n/a | `[4]`, `[77]`, `[91]`, `[105]`, `[148]`, `[150]` and `[190]` are **append-only** (the head string starts with the base string). `[192]` is new, and there are 193 blockers. Each sits on line `254+i`, so every `WP:<line> (open_blockers[i])` citation in the map (8 distinct) resolves to the right line. No top-level key except `ownership` changed, and `amends_without_owning.paths` lists the four files the rationale names. |
| each finding's blocker (map `findings[].source`) | | n/a | All 16 name the blocker that plan §4's "Owed to" column names. |
| **live catalog vs the tests' text parse** (`q0-160-prep/catalog-round.sh`: fresh initdb, shim, `make db-migrate-clean` 0, read-only `catalog.sql`; the test's own helpers sliced verbatim into `parse.mjs`) | `1706111` (migrations equal to `c7fe264`) | 0 | tables **66 = 66**; UPDATE role:column pairs **216 = 216**; DELETE/TRUNCATE grants **0 = 0**; indexes (name and leading column) **269 = 269**; FK edges **90 = 90** as a multiset (**87** distinct). Equal element by element. |
| `make db-migrate-clean`; `make db-rls-smoke` twice (baseline, fresh initdb) | 127.0.0.1:5503 | **0; 0, 0** | "db-migrate-clean: ok"; "1079 isolation case(s) passed" both times |
| four live drift rounds (§2.5) | 5503 | see §2.5 | migrate-clean red on all four |
| mutation harness (§2), 61 mutations, each restored and its sha256 compared | `1706111` | n/a | 48 caught, 12 survive, 1 control survives (correctly). `git status` was empty at the end, and the baseline was green before and after. |
| `gh pr view 170` | | | Draft, OPEN, MERGEABLE, head `1706111`; "Bootstrap validation" `bootstrap` SUCCESS (run 37143863333) |
| `gh pr view 169`; `gh run view 37141584373` | | | merged 2026-10-03T17:51:16Z, merge commit `c7fe264`, head `4d1f10c`; the run is on `4d1f10c`, success. This matches disposition §3. |
| `lsof -nP -iTCP:5503 -sTCP:LISTEN` | after every round and at the end | **1** | no listener; data directory removed |

**Live DB.** None of the inputs a database layer reads changed:

- `git diff --stat 75c9274 c7fe264 -- db .github Makefile` touches only the README and two lint maps.
- The branch touches no migration.
- `grep -rl` over `scripts .github Makefile test-kits tests db` finds the three new files read only by `foundation-contract.test.mjs`.

I ran a cluster anyway, for two reasons:

- the draft's scratch directory `a0-160p/`, which plan §2 cites for the catalog-versus-text equality and for the 27 mutations, exists nowhere under `/private/tmp/claude-501` (`find` returned nothing), so I re-measured the equality myself;
- I re-ran the drifts the static layer misses (§2.5).

Every round was on port 5503 only:

- `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, TCP only (`-c unix_socket_directories=''`);
- `db/foundation/ci/supabase-shim.sql` first;
- a fresh initdb for every round;
- drifts appended to `140_audit.sql` and restored byte for byte, with the sha256 compared;
- each data directory removed after its round.

Ports 5432 and 5499 were not touched.

**Read, not measured:**

- the plan, the disposition, the five commit messages and the handoff diff;
- the Owner's words, which I checked as present in `product-owner-disposition-2026-10-03-batch-129.md` (2 matches);
- the phase plan's "Batch 160 — 3. Can do now", which is at its lines 156-167, as the plan says;
- ERD lines 488-514 (§10), 852 (the checklist) and 866-873 (DATA-DEC-03..10), which match the citations;
- A0's earlier exit codes for `commit-when-clean` (1, then 0) and for `verify-branch-scope` at `159d43b` (0, and 74 before the identity edit). I did not re-run them at those commits.

## 2. Mutations

Harness: `q0-160-prep/mutate.mjs` in the private scratchpad. Each mutation edits one file, or two for EX-09. It then
runs `node --test --test-reporter=tap test-kits/db/foundation-contract.test.mjs` (all 80 tests), records every red
test with its first error line, restores the bytes and compares the sha256. Logs: `mutate.log` and `mutate2.log`.
T-map, T-export and T-purge are the three batch-160 tests, in file order.

### 2.1 Retention map

| id | mutation | caught by |
|---|---|---|
| RM-01 | drop a row (`app.audit_logs`) | T-map "the rows are exactly the tables the migrations create", T-export |
| RM-02 | duplicate a row (`app.jobs` twice) | T-map "no table has two rows", T-export |
| RM-03 | duplicate a table name (`content_ideas` row renamed `app.content_items`) | T-map, T-export, T-purge |
| RM-04 | a row for a table no migration creates | T-map, T-export |
| RM-05 | undefined class given a §10 row number (`meta_connections`) | T-map (`section10_row` must be null) |
| RM-06 | undefined `CONNECTION-HISTORY` made `defined` | T-map "is a class §10 defines" |
| RM-07 | `PUSH-SECRET` made `defined` on push refs | T-map "§5's cell NOTIFICATION-* reaches PUSH-SECRET" |
| RM-08 | `CONNECTION-HISTORY` added to `section10_classes` | T-map "§10's classes, in §10's order, and no other" |
| RM-09 | `"365 days"` on a finding row | T-map "no row carries a retention number" |
| **RM-10** | `"180 วัน"` on a finding row (§10's own form) | **nothing** (Q0-F1) |
| **RM-11** | sweep basis `"อายุ Workspace + 1 ปี"` (§10's own APPROVAL-HISTORY cell) | **nothing** (Q0-F1) |
| **RM-12** | `"30-day recovery"` (§10's own form) | **nothing** (Q0-F1) |
| **RM-13** | `"retention_days": 30` | **nothing** (Q0-F1) |
| RM-14 | sweep basis `"12 months after last use"` | T-map |
| RM-15 | **rename a blocking control**: trigger `refuse_mutation` -> `refuse_mutation_v2` | T-map "trigger refuse_mutation_v2 runs private.refuse_mutation" |
| RM-16 | rename a control's function `private.set_decided_at` -> `private.set_decided` | T-map |
| RM-17 | rename a control kind `no-update-grant` -> `no-update` | T-map "every control is of a known kind" |
| RM-18 | swap a control kind to `client-only-update` | T-map "only the client role holds UPDATE" |
| RM-19 | rename a control's role `app_worker` -> `app_maintenance` | T-map "app_maintenance holds UPDATE" |
| RM-20 / RM-21 | remove the `refuse_mutation` / `refuse_truncate` control on `audit_logs` | T-map "the refusal trigger … is named". So the refusal loop at `:3900` is not vacuous. |
| RM-22 | remove `no-delete-grant` | T-map |
| RM-23 | drop `SECURITY-4` from `security_events.section9_classes` | T-export "SECURITY detail matches at least one table". So the hit floor at `:3961` is not vacuous. |
| RM-24 | invented decision id | T-map |
| RM-25 | false `covered_by` | T-map |
| RM-26 | §5 cell paraphrased | T-map "the §5 cells are verbatim" |
| RM-27 | §10 final behaviour paraphrased | T-map "quoted, not paraphrased" |
| RM-28 | an unused §10 class dropped from `section10_classes_without_a_row` | T-map (two-way) |
| RM-29 | a §9 class not in the §5 cell | T-map "picked from §5's sensitivity cell" |

### 2.2 Export fixture

Every mutation included the table with a correctly recomputed file checksum and package checksum, so only the
exclusion logic can catch it.

| id | mutation | caught by |
|---|---|---|
| EX-01 | `private.ai_credential_references` (SECRET-4) exported | T-export "(SECRET-4) never appears in an export" |
| EX-02 | `app.security_events` exported | T-export "(SECURITY detail) never appears" |
| EX-03 | `app.jobs` exported | T-export "(internal job)" |
| EX-04 | `app.research_snapshots` exported | T-export "(research snapshot)" |
| EX-05 | `app.billing_webhook_receipts` exported | T-export "(raw webhook)" |
| EX-06 | `security_events` exported and still listed as omitted | T-export "exactly once" |
| **EX-07** | `app.notification_preferences` exported (§5 cell `PII-2/SECRET-4`; the row selects `PII-2`) | **nothing** (Q0-F3) |
| **EX-08** | `app.meta_connections` exported (§5 cell `INTEGRATION-2/SECRET-4`; the row selects `INTEGRATION-2`) | **nothing** (Q0-F3) |
| EX-09 | `SECURITY-4` dropped from the map row and `security_events` exported | T-export (hit floor) |
| EX-10 | altered file checksum | T-export |

### 2.3 Purge order

| id | mutation | caught by |
|---|---|---|
| PO-01 | **parent swapped before child** (`ai_model_policies` <-> `ai_models`) | T-purge "ai_model_policies_ai_model_id_fkey: … is purged before app.ai_models" |
| PO-02 | `assets` <-> `asset_versions` swapped (across the cycle) | T-purge "asset_versions_asset_scope_fk" |
| PO-03 | tenant root not last | T-purge |
| PO-04 | `business_profiles` moved to the front | T-purge |
| PO-05 | a retention conflict dropped | T-purge "every retention conflict is declared, and only those" |
| PO-06 | an edge dropped | T-purge "the declared edges are the foreign keys the migrations create" |
| PO-07 | a fake cycle break on a non-cycle edge | T-purge "breaks a real cycle: the reverse key exists" |
| PO-11 | a self-reference dropped | T-purge |
| **PO-08** | `workspaces` phase 9 -> 6 | **nothing** (Q0-F4) |
| **PO-09** | an edge's `fk` renamed to `no_such_fkey` | **nothing** (Q0-F4) |
| PO-10 | *control*: swap two adjacent tables with no key between them | nothing, **correctly** |

### 2.4 Migration drifts (appended to `140_audit.sql`), static

| id | drift | caught by |
|---|---|---|
| MD-01 | `grant delete on app.audit_logs to app_worker` | T-map "no migration grants DELETE or TRUNCATE on it" |
| MD-03 | `grant truncate on app.jobs to authenticated` | T-map |
| MD-04 | `grant update (actor) on app.approval_events to app_worker` | T-map "no role holds UPDATE on it" |
| MD-05 | `create index … on app.audit_logs (occurred_at)` | T-map (`covered_by`) |
| MD-08 | `grant usage on schema private to app_worker` | T-map |
| MD-09 | `create policy … to app_worker` | T-map, and 141 prep's "§8.4 audit/security INSERT cell" test |
| MD-10 | a new foreign key | T-purge |
| **MD-02** | `grant delete on all tables in schema app to app_worker` | **nothing in the static layer** (Q0-F2) |
| **MD-11** | `grant update on all tables in schema app to app_worker` | **nothing in the static layer** (Q0-F2) |
| **MD-06** | `drop trigger refuse_mutation on app.audit_logs` | **nothing in the static layer** (Q0-F2) |
| **MD-07** | `alter table app.audit_logs disable trigger refuse_mutation` | **nothing in the static layer** (Q0-F2) |

For the four survivors I also ran `make db-schema-lint` and the full suite (`node scripts/run-test-suite.mjs`). The
results were exit 0 / exit 0 and 684 / 684 for all four (`q0-160-prep/drift-static.sh`, logs `MD-*.suite.log`). No
static layer holds them.

### 2.5 The same four drifts, live (5503, fresh initdb each)

| id | migrate-clean | rls-smoke ×2 | what refused it |
|---|---|---|---|
| MD-02 | **2** | **2, 2** | pinned grant probe "table-level privilege(s) on a pinned table not exactly its allowlist: unlisted: app_worker DELETE …"; rls-smoke "FAILED — 26 of 1079" |
| MD-11 | **2** | **2, 2** | pinned grant probe (`app_worker UPDATE`); rls-smoke 26 of 1079 |
| MD-06 | **2** | 0, 0 | trigger probe "the private.refuse_mutation triggers are not exactly the four pinned definitions … missing: CREATE TRIGGER refuse_mutation …" |
| MD-07 | **2** | 0, 0 | trigger probe "trigger(s) not enabled: app.audit_logs.refuse_mutation (tgenabled D)" |

140 was restored byte for byte after every round.

**Vacuity.** Each of the three tests went red under at least eight distinct mutations, each for the reason its
assertion message names. The loops that could run over nothing were each shown to run:

- the refusal-trigger loop (RM-20, RM-21);
- the exclusion hit floor (RM-23, EX-09);
- the `grant-without-policy` branch (RM-19);
- the `no-schema-usage` branch (MD-08);
- the cycle-break check (PO-07);
- the self-reference check (PO-11).

None passes vacuously. Where a test is green under a mutation, the cause is a form it does not parse, or a field it
does not check (§3). It is not an empty loop.

## 3. Findings

Grades: HIGH (blocks the claim the batch makes), MEDIUM (a claim the batch makes is false, with no damage today), LOW
(a gap another layer holds, or a judgement left unlabelled), INFO.

### Q0-F1 — MEDIUM — the "no retention number" guard does not read Thai, hyphens or numbers

- **Where:** `test-kits/db/foundation-contract.test.mjs:3856`. The guard is
  `/\d+\s*(day|days|month|months|year|years|วัน|เดือน|ปี)\b/i`.
- **What is false:** plan §1(a) (lines 79-80) says "a digit followed by day, month or year, in English or Thai". The
  Thai alternatives can never match at the end of a JSON string or before a space. JavaScript's `\b` is an ASCII
  word boundary, so `น"` and `ี ` are two non-word characters with no boundary between them. Measured:
  `/\d+\s*(วัน)\b/i.test('"180 วัน"')` is `false`, and it is also `false` with the `u` flag.
- **What gets through:**
  - §10's own Thai windows, `"180 วัน"` (RM-10) and `"อายุ Workspace + 1 ปี"` (RM-11);
  - §10's own `"30-day recovery"` (RM-12), because `\s*` does not cross a hyphen;
  - a numeric field such as `"retention_days": 30` (RM-13).

  §10 writes most of its numbers in Thai units, so a copy from §10 is the likeliest way a number arrives, and that is
  exactly what passes. This guard is the only thing that holds the Q160-a boundary in the map. ERD:484 and ERD:852
  leave those numbers unapproved.
- **No damage today.** No row carries a window in any of those forms, and no row has a numeric leaf other than
  `section5.line` (measured).
- **Remedy (A0, before or with merge):**
  - Replace `\b` with `(?![A-Za-z])`, and only on the English units.
  - Allow `\s*-?\s*` between the digit and the unit.
  - Add `hour|hours|week|weeks|ชั่วโมง|สัปดาห์`.
  - Refuse any numeric leaf in a row other than `section5.line`.
  - Add a self-test asserting that the pattern matches `"180 วัน"`, `"1 ปี"`, `"12 เดือน"`, `"30-day"` and
    `"24 ชั่วโมง"`, so the guard cannot rot silently again.
  - Correct plan §1(a), or the remedy commit's message.

### Q0-F2 — LOW — T-map's grant and trigger reads are create-only, and four drifts pass every static layer

- **Where:**
  - `foundation-contract.test.mjs:3717` (`grants160` parses only named `app.`/`private.` objects);
  - `:3893` (a `trigger` control holds if its `create trigger` text exists anywhere).
- **What gets through:** these pass T-map, all 684 tests and `db-schema-lint`:
  - a schema-wide `grant delete|update on all tables in schema app` (MD-02, MD-11);
  - a later `drop trigger refuse_mutation` (MD-06);
  - a later `disable trigger` (MD-07).

  The test's name says "every blocking control it names holds in the migrations", and its preamble says "a file that
  described a schema that no longer exists fails here".
- **Why it is LOW:** live `db-migrate-clean` refuses all four through the pinned grant probe and the trigger probe,
  and `db-rls-smoke` refuses the two grant drifts (26 of 1079) (§2.5).
- **Remedy (A0):** either
  - expand `on all tables in schema <s>` to every table of `<s>` in `grants160`, and in the trigger check refuse a
    later `drop trigger <name> on <table>` or `disable trigger <name>`; or
  - narrow the test's comment to say that the live pinned-grant and trigger probes hold these forms, not the text read.

### Q0-F3 — LOW — the export's exclusion rests on an unlabelled per-row judgement

- **Where:**
  - `foundation-contract.test.mjs:3835`, which checks `section9_classes` only as a *subset* of §5's sensitivity cell;
  - `:3952-3958`, which reads the exclusions from that subset.
- **The judgement:** six rows whose §5 cell carries `SECRET-4` select no `SECRET-4`: `meta_connections`,
  `social_accounts`, `notification_preferences`, `notifications`, `ai_models` and `ai_model_policies`. `audit_logs`
  drops `SECURITY-4`.
- **What gets through:** exporting `notification_preferences` or `meta_connections` passes T-export (EX-07, EX-08).
- **No damage today.** The fixture omits the six as `outside-minimum-domains`. `audit_logs` is exported under §11.1's
  "Tenant-visible audit trail", which is a defensible reading.
- **Why it matters:** the per-table selection is a judgement, and unlike plan P4's two it is not labelled as one. Any
  later widening of the export can include those tables with nothing red.
- **Remedy (A0):** for every row that does not select a `SECRET-4`, `SECURITY-4` or `INTERNAL-3` present in its §5
  cell, require a recorded `why`, for example `section9_not_selected: [{class, why}]`, and assert it. Then the
  exclusion's input is held, not only its output.

### Q0-F4 — LOW — the purge order's `phase` and `fk` names are unchecked

- **Where:** `foundation-contract.test.mjs:3988` (any of 6-9) and `:3979` (only `child>parent` is compared).
- **What gets through:** PO-08 (the root's phase 9 -> 6) and PO-09 (an edge's `fk` renamed) pass.
- **Why it matters:**
  - The order is not phase-monotone. `app.content_versions` (7) follows `app.approval_requests` (8) at index 46,
    and `app.page_context_profiles` (7) follows `app.workspace_member_scopes` (8) at index 62. That is what F160-14's
    conflicts force, but nothing asserts that each inversion is a declared conflict.
  - The cycle break's key name `assets_current_version_scope_fk`, which is load-bearing in F160-15 and
    `open_blockers[192]` (11), is checked only against the JSON's own edge list, never against the migration text.
- **Remedy (A0):**
  - Parse FK names from the text (named constraints, or PostgreSQL's `<table>_<col>_fkey` default) and compare
    `{fk, child, parent}` triples.
  - Assert that each phase follows from the row's final behaviour (purge -> 6/7, retain or anonymise -> 8, the root ->
    9), and that every phase inversion in the order is a declared retention conflict.

### Q0-F5 — INFO — the handoff records exit 0 for commands not yet run when it was written

- **Where:** in `handoffs/WP-0A-DB-00-author-handoff.json`, the `tests` entry "npm run check; npm run check:handoff;
  npm run verify (after this commit, on the branch name)" carries `exit_code: 0`. Its own `result` says the commands
  could not run before the file was committed.
- **Measured now:** all three exit 0 on the branch name, so the value is true. It was still written before it was
  observed.
- **Remedy:** record such an entry as pending, and put the observed exit in the PR body, as the entry itself says it
  does. Alternatively, have `check:handoff` refuse an exit code on an entry that names its own commit.

### Q0-F6 — INFO — evidence the plan cites cannot be re-run

- **Where:** plan §1 ("27 mutations", `a0-160p/mutate.mjs`), §2 (`catalog.sql`, `fktext.mjs`, `granttext.mjs`,
  `idxtext.mjs`) and §7.
- **What is missing:** all of these cite the draft's scratch `a0-160p/`, which does not exist under
  `/private/tmp/claude-501`. The packaging scratch `a0-160-prepr/` does exist.
- **No damage:** I reproduced the substance independently. The catalog equals the text parse element by element (§1),
  and my 61 mutations cover every class in plan §1's list of 27.
- **Remedy:** for a claim that rests on a scratch script, keep the script, or state in the record that it is gone.

### Claims checked and true

- **Commit messages and plan §0.1:**
  - the floors and digest (77 -> 80, 633 -> 720, `a91ced9f62276ebe` -> `8c35e631c28c0574`);
  - 88 digests;
  - VERIFICATION 681 -> 684;
  - the four amended files, all declared;
  - the path list unchanged, so no line above `open_blockers` moves and 141 prep's pinned lines hold (`npm run verify`
    is green);
  - the six `WP:` citations +1, each with its index.
- **The blocker edits:**
  - seven extended, append-only;
  - `[192]` new, with each item's owner as the plan's table states;
  - no finding duplicated, and the cross-references resolve.
- **Plan §2's catalog figures:** re-measured live (66, 90/87, 0 DELETE/TRUNCATE, 216, 269) and equal to the text parse.
  The plan's §3 and §3.1 are labelled as the draft's.
- **Plan §4's lists:** 13 uncovered sweep keys and 12 retention conflicts, recomputed from the data.
- **The disposition:**
  - §1's Owner words are present in the batch-129 disposition;
  - §3's merge facts (time, merge commit, head, run) match GitHub;
  - Q160-a..d are all UNANSWERED, and nothing in the diff decides one;
  - no migration and no `160_*.sql`.
- **Commit `1706111`:** it says the refresh moved the base from `c5a648e` to the branch point, and the diff shows base
  `c5a648e` -> `c7fe264` and head `68855a6` -> `f9d9a79`. A0's done-list reads "no repoint needed" for the old head
  `68855a6`. That refers to the tool not needing a manual repoint, not to the fields being unchanged. The files are
  consistent.
- **The handoff's file lists:** 5 added and 6 modified, equal to `git diff --name-status c7fe264 f9d9a79`.

## 4. Stop-the-line

**None.** Here is what I checked against the stop-the-line incidents in CONTRIBUTING_AGENTS.md:

- No migration, grant, policy or role changes.
- No secret: the secret scan exits 0, and the fixture's ids are the fixture catalog's.
- No tenant path changes.
- No irreversible deletion is enabled. The batch records that none can run (`no-executor`, `no-deletion-manifest`).
- No contract changes.

**Does anything block the merge?** On Q0's evidence, nothing is a stop-the-line incident, and every required command
I ran is green on the branch name. Q0-F1 is a false claim in the plan about a guard that holds a decision boundary
(Q160-a). It is cheap to fix: one pattern and a self-test. I recommend fixing it before the merge rather than carrying
it. That is a recommendation, not a block. Q0-F2 to Q0-F4 are LOW, and Q0-F5 and Q0-F6 are INFO. The merge bar
(`product-owner-disposition-2026-10-03-batch-127.md` §6, which needs C0 and A1 as well) is for A0 and the Owner to
apply. RFC-2026-025 §5's Integration Owner evidence is still owed, as disposition §3 says.

## 5. Limits

- I am the Author's vendor and orchestration (§0).
- The mutations are mine. They cover the classes asked for, and every class in plan §1's list. They are not
  exhaustive, and an equivalent mutation (PO-10) is a control, not a finding.
- The live rounds were one baseline, one catalog read and four drift rounds on PostgreSQL 17.11 (Homebrew) with the
  CI shim. They are not CI's image.
- I did not re-run A0's `commit-when-clean` attempts, or `verify-branch-scope` at `159d43b`. I read those.
- My UPDATE-pair query counts explicit ACL entries (table and column level) for non-superuser roles. It matched the
  text exactly, but it is my query, not the draft's (which is gone, Q0-F6).
- I did not review the design note's Route A/B costing beyond checking that its counts of closures and pinned families
  are cited. That is A1's and the Owner's (Q160-b).
- Scratch, not committed: `q0-160-prep/`, which holds `mutate.mjs`, `mutate.log`, `mutate2.log`, `blk.mjs`, `count.mjs`,
  `parse.mjs`, `catalog.sql`, `catalog.json`, `parse.json`, `round.sh`, `catalog-round.sh`, `drift-static.sh`,
  `drift-live.sh` and the round logs.
