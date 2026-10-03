# Q0 independent test re-check: batch 160 preparation, review round (PR #170)

- **Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Narrow re-check** of the
  review-round corrections.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-160-prep`
  (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/170>, Draft, OPEN, MERGEABLE), head
  `8af817fb88cd1f0bd3b4d38ff5c548f901a9d0ce` (handoff alone) over code `b06b4e0`, base `c7fe264` (main). Previous
  reviewed head `1706111`. Author `/claude/a0_atlas`. My earlier record:
  `evidence/WP-0A-DB-00/q0-batch-160-prep-test-review-2026-10-03.md` (Q0-F1..F6).
- **Checked out on:** my own branch `recheck/q0-batch-160-prep`, created at `8af817f` in worktree
  `wf_5b1db44b-fe1-8`. The branch name is checked out in other worktrees (`wf_5b1db44b-fe1-1`, `-5`, `-6`). For the
  commands that read the branch name (`npm run check:handoff`, `npm run verify`) I pointed this worktree's HEAD at
  `refs/heads/agent/claude/WP-0A-DB-00-batch-160-prep` with `git symbolic-ref` (same SHA, clean tree; `git rev-parse
  --abbrev-ref HEAD` printed the branch name), then pointed it back. HEAD was never detached; no ref was moved.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own workflow, and the same vendor and model family as the
Author (RFC-2026-024). I am independent of the Author's run, not of its vendor or its orchestration. This record is
evidence for the Tester role, not that role's signature. Accepting it as the role's signature is the act of the
Integration Owner and the Product Owner.

## 1. Measured vs read

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`), checked with `node -v` before every measured run. The
PATH Node 26 ran nothing measured.

**Measured (exit codes I observed):**

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs c7fe264 WP-0A-DB-00` | `8af817f` | **0** | "all 15 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | branch name, `8af817f` | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | branch name, `8af817f` | **0** | `clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0` |
| `node --test test-kits/db/foundation-contract.test.mjs` | `8af817f` | **0** | tests 80, pass 80 |
| `node scripts/regenerate-integrity-manifest.mjs --check`; `node scripts/scan-repository-secrets.mjs` | | **0; 0** | 88 digests; `git status` empty |
| `make db-schema-lint`; `make db-contract-check` | static | **0; 0** | ok; ok |
| the guard's own count (`stripNonCode`, `countDeclaredTests`, `\bassert\.\w+\(`, name digest) on `git show` of each tree (`q0-160-prepr2/count.mjs`) | `c7fe264` / `1706111` / `8af817f` | n/a | 77 / 80 / **80** tests; 633 / 720 / **747** assertions; digest `a91ced9f62276ebe` / `8c35e631c28c0574` / **`8c35e631c28c0574`**. Equal to `scripts/test-suite-contract.mjs:89` (80), `:198` (747) and `:238` (digest). |
| cherry-pick fidelity (`git diff-tree -r`) | `89d0994`/`1c8b0e4`, `ddd9879`/`886b1a4`, `b10e5f8`/`6e41fc8` | n/a | each pair adds one file with the **same blob** (`66b2a27`, `565e371`, `0403083`) |
| blocker edits (`q0-160-prepr2/blk.mjs`, `1706111` vs `8af817f`) | | n/a | 193 blockers both sides; only `ownership` (rationale, appended) and `open_blockers` change. `[91]`, `[105]`, `[148]`, `[150]`, `[190]` are **in-place corrections** (exact removed/added spans recorded in the log; each matches the plan §8.2 row it cites); `[192]` is append-only (item (13), (9) widened, (10) a lower bound). No line moves: `[0]` at line 254, `[192]` at 446. All 19 `WP:<n> (open_blockers[i])` citations in the map (8 distinct) resolve. |
| counted claims (`q0-160-prepr2/claims.mjs`, `git show 8af817f`) | | n/a | F160-13: 13 uncovered + 2 partial-only (`F160-13` verdict) = **15** ("Fifteen in all" in the finding); non-self keys touching a finding row **21**; conflicts **12**; `outside_workspace_purge` = `user_profiles` + six global tables (`ai_models`, `industry_packs`, `industry_pack_versions`, `billing_plans`, `billing_plan_versions`, `plan_entitlements`); `section9_not_picked` on **7** rows, `export_allowed` only on `audit_logs` (the only one exported); the four tables in `in-minimum-domain-projection-undecided`; `audit_logs` phase 8, no FK edge, at index 57 before `security_events` (58); F160-17 present with the `also_claimed_by` pair; 17 findings. |
| handoff vs git | `8af817f` | n/a | `base_revision` `c7fe264`, head `b06b4e0`; 8 added, 7 modified, 0 deleted = `git diff --name-status c7fe264 b06b4e0`. The post-commit entry has `exit_code: null`, "PENDING" (Q0-F5). |
| mutation harness (`q0-160-prepr2/mutate.mjs`, 112 mutations, every one restored and its sha256 compared) | `8af817f` | n/a | 96 caught, 15 survive, 1 control survives correctly (§3). Baseline 80/80 before and after; "restored byte for byte: true"; `git status --porcelain` empty. Two of my own mutations threw while being applied (RM-36, RM-48: my selector found no row); the `finally` restored the bytes (sha256 checked), I fixed the selectors and re-ran the remainder (`mutate2.log`, `mutate3.log`). |
| live rounds on 127.0.0.1:5503 (`q0-160-prepr2/round.sh`, `drift-live.sh`): baseline + seven drifts | migrations equal to `c7fe264` | see §3.4 | baseline `make db-migrate-clean` **0**, `make db-rls-smoke` **0** ("1079 isolation case(s) passed"); all seven drifts **refused by `db-migrate-clean` (2)** |
| `gh pr view 170`; `gh run view 37147066016` | | | Draft, OPEN, MERGEABLE, head `8af817f`; check `bootstrap` SUCCESS, run on `headSha 8af817f`, event `pull_request`. The PR body's post-commit table records `check:handoff` 0 and `verify` 0, which my runs reproduce. |
| `lsof -nP -iTCP:5503 -sTCP:LISTEN` | before, after every round | **1** | no listener; the data directory removed after every round |

**Live DB, why.** No input a database layer reads changed (no migration; the three data files are read only by
`foundation-contract.test.mjs`). I ran a cluster only to put the static-layer survivors of §3.4 in front of the
live probes. Every round: `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, TCP only
(`-c unix_socket_directories=''`), `db/foundation/ci/supabase-shim.sql` first, a fresh initdb per round, drifts
appended to `db/foundation/migrations/140_audit.sql` and restored byte for byte (sha256 compared, `restored=yes` on
all eight rounds), PostgreSQL 17.11 (Homebrew). Ports 5432 and 5499 were not touched. The cluster is stopped and
removed.

**Read, not measured:** the plan (§0, §1, §4, §6, §7, §8), the disposition diff, the five review-round commit
messages, the handoff text fields, the PR body; ERD:484-514 (§10), :540-600 (§11.1-§11.4), :866-873 (DATA-DEC),
:201, :555; the phase plan line 149 ("Undefined or mismatched", as plan P1 now says). The Author's `commit-when-clean`
exits for `b06b4e0` and `8af817f` (0, 0) I read from the Author's scratch logs (`a0-160-prepr2/commit1.log`,
`commit2.log`, both "clean: exit 0 — tests 684"); I did not re-run them at those commits. The Author's own
"39 mutations: 37 red, 2 green" I counted in `a0-160-prepr2/mutate.log` (39 lines, 37 `red`, 2 `GREEN`: P8 and the
control); I did not re-run that script.

## 2. My earlier findings

| finding | was | now | evidence |
|---|---|---|---|
| Q0-F1 MEDIUM, the window guard missed Thai, hyphenated and numeric windows | RM-10..13 green | **closed** | `WINDOW160` (`foundation-contract.test.mjs:3813`) with a self-test (`:3835-3837`) and the numeric-leaf rule (`:3898-3901`). RM-10 ("180 วัน"), RM-11 ("อายุ Workspace + 1 ปี"), RM-12 ("30-day recovery"), RM-13 (`retention_days: 30`), RM-37 ("1 ปี") and RM-36 (a nested numeric leaf) are red. Every window form §10 and DATA-DEC actually write (ERD:487-514, :866-873, including "1/2 ปี" and "Trash 30 วัน") is a digit, an optional space or hyphen, and one of the listed units. Plan §1(a) and disposition §4 now say what the guard does. Residue: R-1. |
| Q0-F2 LOW, schema-wide grants and later drop/disable trigger passed every static layer | MD-02/06/07/11 green | **closed for the forms named**; residue R-2 | `grants160` expands `on all tables in schema` (`:3719-3722`); a later `drop trigger` / `disable trigger` fails (`:3949-3952`). MD-02, -06, -07, -11 and the new MD-12, -17, -18, -21, -22, -23 are red. |
| Q0-F3 LOW, the export's exclusion rested on an unlabelled per-row pick | EX-07/08 green | **closed** | `section9_not_picked` is required two-way (`:3874-3876`); an exported table whose §5 cell carries an excluded class needs `export_allowed` (`:4045-4053`). EX-07, EX-08, EX-13 and RM-40..43 are red. Residue: R-3. |
| Q0-F4 LOW, purge `phase` and `fk` names unchecked | PO-08/09 green | **closed** | edges compared as `fk|child|parent` from the text (`:3768-3792`, `:4070`); the phase rule, inversions, outside mark and `refused_by` (`:4081-4118`); conflict fields (`:4140-4143`). PO-08, PO-09 and PO-12..24 are red. |
| Q0-F5 INFO, an exit code recorded before it was observed | | **closed** | the handoff's post-commit entry is `exit_code: null`, "PENDING"; the PR body carries the observed exits, which I reproduced (§1). |
| Q0-F6 INFO, cited scratch gone | | **closed** | plan §8.2 states `a0-160p/` no longer exists (`find` confirms); this round's scripts exist in `a0-160-prepr2/` (`mutate.mjs`, `mutate.log`, `count.mjs`, `fk.mjs`, `edit-*.mjs`). |

## 3. Mutations

Harness: `q0-160-prepr2/mutate.mjs` (my round-1 harness plus 45 new mutations). Each mutation edits one file (two for
EX-09 and EX-11), runs all 80 tests of `foundation-contract.test.mjs` with the TAP reporter, records every red test
and its first error, restores the bytes and compares the sha256. Logs: `mutate.log`, `mutate2.log`, `mutate3.log`.
T-map, T-export and T-purge are the three batch-160 tests in file order. A test stops at its first failing
assertion, so "caught by" names the first one that bit.

### 3.1 Retention map

| id | mutation | caught by |
|---|---|---|
| RM-01 | **drop a row** (`audit_logs`) | T-map "the rows are exactly the tables the migrations create", T-export, T-purge |
| RM-02 | **duplicate a table** (`jobs` twice) | T-map "no table has two rows", T-export |
| RM-03 | duplicate a table name (`content_ideas` renamed `content_items`) | T-map, T-export, T-purge |
| RM-04 | a row for a table no migration creates | T-map, T-export |
| RM-05 | **an undefined class given a §10 row number** (`meta_connections`) | T-map (`section10_row` must be null) |
| RM-06 / RM-07 / RM-08 | an undefined class made `defined`; `PUSH-SECRET` made defined on push refs; `CONNECTION-HISTORY` added to `section10_classes` | T-map, each with its own message |
| RM-09..14, RM-37 | windows: "365 days", "180 วัน", "อายุ Workspace + 1 ปี", "30-day recovery", `retention_days: 30`, "12 months", "1 ปี" | T-map "no row carries a retention number" / "no number is a field of a row except its §5 line" (all red; RM-10..13 were Q0-F1's survivors) |
| RM-36 | a numeric leaf nested in a sweep | T-map (numeric leaf) |
| **RM-30..35** | "30d", "12mo", `retention_days: "30"` (a string), "thirty days", "๓๐ วัน" (Thai digits), "P30D" | **nothing** (R-1) |
| RM-15 | **rename a blocking control** (trigger `refuse_mutation` -> `refuse_mutation_v2`) | T-map "trigger refuse_mutation_v2 runs private.refuse_mutation", T-purge "the refusal triggers on its purge are named" |
| RM-16..19 | rename a control's function, kind or role; swap a kind | T-map |
| RM-20 / RM-21 / RM-22 | remove the `refuse_mutation` / `refuse_truncate` / `no-delete-grant` control | T-map (and T-purge for the triggers) |
| RM-51 / RM-52 | remove the `set_decided_at` control; point it at `private.refuse_mutation` | T-map "the refusal trigger set_decided_at (private.set_decided_at) is named"; T-map + T-purge |
| RM-23 | drop `SECURITY-4` from `security_events` | T-map (`section9_not_picked` two-way), T-export (hit floor) |
| RM-24..29 | invented decision id; false `covered_by`; §5 / §10 paraphrased; an unused §10 class dropped; an invented §9 class | T-map |
| RM-40 / RM-41 / RM-42 | `section9_not_picked` dropped; its reason cut to 10 characters; added on a row whose cell has no excluded class | T-map |
| RM-43 | `audit_logs`' `export_allowed` removed (still exported) | T-export "it is exported only by a recorded judgement" |
| RM-44 / RM-45 | a partial predicate dropped; rewritten (`purged_at is not null`) | T-map "the partial predicates … are what the migrations write" |
| RM-46 / RM-48 | a `partial_cover` verdict dropped; one added where a full index covers | T-map (both branches) |
| **RM-47** | `billing_webhook_receipts`' verdict flipped `F160-13` -> `serves-the-sweep` | **nothing** (R-4) |
| RM-49 / RM-50 | a `WP:` citation off by one line; its index wrong | T-map "WP:259 is open_blockers[4]" / "WP:446 is open_blockers[191]" |

### 3.2 Export fixture

Every inclusion recomputes the file and package checksums, so only the exclusion logic can catch it.

| id | mutation | caught by |
|---|---|---|
| EX-01..05 | **an excluded class exported**: `ai_credential_references` (SECRET-4), `security_events`, `jobs`, `research_snapshots`, `billing_webhook_receipts` | T-export, each by its exclusion |
| EX-06 / EX-09 / EX-10 | exported and still omitted; SECURITY-4 dropped and exported; a bad checksum | T-export (EX-09 also T-map) |
| EX-07 / EX-08 / EX-13 | `notification_preferences`, `meta_connections`, `ai_models` exported (cell carries SECRET-4, not picked) | T-export "§5's cell carries SECRET-4; it is exported only by a recorded judgement" (EX-07/08 were Q0-F3's survivors) |
| EX-12 | `published_posts` (PUBLISH-HISTORY) labelled `outside-minimum-domains` | T-export "is in a minimum export domain, not outside them" |
| **EX-11** | `meta_connections` exported **and** `export_allowed: true` written on its SECRET-4 | **nothing** (R-3) |
| **EX-14** | `publish_jobs` (PUBLISH-HISTORY) moved to `not-workspace-data` | **nothing** (R-5) |

### 3.3 Purge order

| id | mutation | caught by |
|---|---|---|
| PO-01 | **a parent swapped before its child** (`ai_model_policies` <-> `ai_models`) | T-purge (first: "app.ai_models: outside_workspace_purge is true", the swap moves the mark; the topological check follows) |
| PO-02 | `assets` <-> `asset_versions` | T-purge "asset_versions_asset_scope_fk: … purged before app.assets" |
| PO-03 / PO-04 | root not last; `business_profiles` first | T-purge |
| PO-05..07, PO-11 | a conflict, an edge, a self-reference dropped; a fake cycle break | T-purge |
| PO-08 / PO-17 / PO-18 | root 9 -> 6; `audit_logs` 8 -> 7; `content_ideas` 7 -> 6 | T-purge "phase 9 is the tenant root alone" / "AUDIT is … in §11.4 step 8" / "one phase per class (CONTENT-HISTORY)" |
| PO-19 | a finding row 7 -> 6 (`social_accounts`) | T-purge "every phase inversion is declared" (the move creates an undeclared inversion) |
| PO-09 / PO-23 / PO-24 | an `fk` renamed; the cycle-break key renamed consistently in `edges` and `cycle_breaks`; an edge re-pointed with its name kept | T-purge "the declared edges are the foreign keys the migrations create, by name" |
| PO-12 / PO-13 | `outside_workspace_purge` removed from `user_profiles`; set on `jobs` | T-purge |
| PO-14 / PO-15 / PO-16 | an inversion dropped; one invented; its `because` names another parent's conflict | T-purge |
| PO-20 | `refused_by` removed from `audit_logs` | T-purge |
| PO-21 / PO-22 | a conflict's `child_behaviour` altered; its child renamed | T-purge "the behaviours are the map's" / "its child and parent are the key's" |
| PO-10 | *control*: swap two adjacent tables with no key between them | nothing, **correctly** |

### 3.4 Migration drifts (appended to `140_audit.sql`), static, then live

| id | drift | static | live `db-migrate-clean` (5503, fresh initdb) |
|---|---|---|---|
| MD-01, -03, -04, -05, -08, -09, -10 | named DELETE/TRUNCATE/UPDATE grants; an index; USAGE on private; a policy; a FK | T-map / T-purge (as in round 1) | not re-run |
| MD-02, -11, -17, -23 | `grant delete|update|all privileges on all tables in schema app` (and `private, app`) | **T-map** (Q0-F2 closed) | MD-02/-11 refused in round 1 |
| MD-06, -07, -12, -18, -22 | `drop trigger [if exists]`; `disable trigger <name>|all|user` (incl. `only`) | **T-map** "is not dropped or disabled after it is created" | MD-06/-07 refused in round 1 |
| MD-20 | a trigger with an unread function on `approval_events` | T-map "read neither as refusing nor as stamping" | n/a |
| MD-21 | `drop trigger set_decided_at on app.approval_requests` | T-map | n/a |
| **MD-13** | `alter table if exists app.audit_logs disable trigger refuse_mutation` | **nothing** | **2**: trigger probe "trigger(s) not enabled: app.audit_logs.refuse_mutation (tgenabled D)" |
| **MD-14** | `drop function private.refuse_mutation() cascade` | **nothing** | **2**: trigger probe "not exactly the four pinned definitions … missing: CREATE TRIGGER refuse_mutation …" |
| **MD-15** | `create or replace function private.refuse_mutation()` as a no-op (MD-15: plain; MD-15b: SECURITY DEFINER, `search_path = ''`, revoked from public) | **nothing** | **2 / 2**: SECURITY DEFINER probe "missing or no longer SECURITY DEFINER" / "[body differs from the pinned digest]" |
| **MD-16** | `grant delete on all tables in schema "app" to app_worker` (quoted schema) | **nothing** | **2**: pinned grant probe "unlisted: app_worker DELETE on app.calendar_items …"; `db-rls-smoke` **2** |
| **MD-19** | `drop trigger "refuse_mutation" on app.audit_logs` (quoted name) | **nothing** | **2**: trigger probe "missing: CREATE TRIGGER refuse_mutation …" |
| **MD-24** | `alter table app.audit_logs enable replica trigger refuse_mutation` | **nothing** | **2**: trigger probe "trigger(s) not enabled … (tgenabled R)" |

**Vacuity.** None of the new checks passes vacuously. Each was made to bite at least once, for the reason its
message names: the window self-test and guard (RM-10..13, RM-37), the numeric-leaf rule (RM-13, RM-36),
`section9_not_picked` both ways and its reason (RM-40, RM-42, RM-41), `export_allowed` (EX-07, EX-08, EX-13, RM-43),
the partial predicates (RM-44, RM-45), both `partial_cover` branches (RM-46, RM-48), the WP citations (RM-49, RM-50),
the two-way refusing-trigger rule for `set_decided_at` (RM-51) and the unread-function rule (MD-20), the
drop/disable rule (MD-06, -07, -12, -18, -21, -22), the schema-wide grant expansion (MD-02, -11, -17, -23), the
minimum-domain label (EX-12), every branch of the phase rule (PO-08, PO-17, PO-18), the inversions both ways and
their `because` (PO-14, PO-15, PO-16), the outside mark both ways (PO-12, PO-13), `refused_by` (PO-20, RM-15),
the conflict fields (PO-21, PO-22) and the key names (PO-09, PO-23, PO-24). The only branch I did not make bite
alone is "a finding row's phase is 6-8"; a finding row at 9 is caught first by "phase 9 is the tenant root alone".
Where a test stays green below, the cause is a form it does not parse or a judgement it does not pin, not an empty
loop.

## 4. Findings (this round)

Grades as before: HIGH (blocks the claim the batch makes), MEDIUM (a claim is false, no damage today), LOW (a gap
another layer holds, or a judgement left unpinned), INFO.

### R-1 — INFO — the window guard does not read abbreviations, words, Thai digits, ISO durations or a numeric string

- **Where:** `test-kits/db/foundation-contract.test.mjs:3813` (`WINDOW160`), `:3898-3901` (numeric leaves).
- **What passes:** RM-30 "30d", RM-31 "12mo", RM-32 `retention_days: "30"`, RM-33 "thirty days", RM-34 "๓๐ วัน",
  RM-35 "P30D".
- **Why INFO:** the comment at `:3809` claims the forms "§10 and DATA-DEC write", and that claim is true: I read
  ERD:487-514 and :866-873, and every window there is a digit, an optional space or hyphen, and one of the listed
  units. The plan's §1(a) and §8.2 claims hold. A window would have to be invented in a new form to pass.
- **Remedy (optional):** add `\d+\s*(?:d|h|w|mo|y)(?![A-Za-z])`, `\bP\d`, and refuse a string leaf that is all
  digits; or leave it, as §10 defines the forms.

### R-2 — LOW — the static grant and trigger reads still miss six spellings; the live probes hold all six

- **Where:** `foundation-contract.test.mjs:3719` (the grant regex reads `app|private` unquoted), `:3949-3951` (the
  undo regex has no `if exists` after `alter table`, no quoted names, no `enable replica|always`), and nothing reads a
  later `drop function` or `create or replace function` of a control's function.
- **What passes T-map, the suite and `db-schema-lint`:** MD-13, MD-14, MD-15, MD-16, MD-19, MD-24 (§3.4).
- **Why LOW:** live `db-migrate-clean` refuses all six (trigger probe, pinned grant probe, SECURITY DEFINER digest
  probe), and `db-rls-smoke` refuses MD-16. CI runs both. The forms Q0-F2 named are now held. The comment
  "AND IT STAYS" (`:3949`) is broader than what the regex reads.
- **Remedy (A0, any time):** either accept `alter table (?:if exists )?(?:only )?`, `"?name"?` and
  `enable (?:replica|always) trigger`, and refuse a later `drop function <fn>` or `create or replace function <fn>`
  after the trigger's create; or say in the comment that the live trigger, grant and definer probes hold the other
  spellings.

### R-3 — LOW — `export_allowed` is not pinned, so one data edit exports a SECRET-4-bearing table

- **Where:** `foundation-contract.test.mjs:4045-4053`. The comment says "today audit_logs alone", but nothing asserts
  that set.
- **What passes:** EX-11: write `export_allowed: true` on `meta_connections`' SECRET-4 entry and export the table.
  T-export, and the whole suite, stay green.
- **Why LOW, not more:** the judgement is now recorded in the map (which is what Q0-F3 asked), so the diff would show
  it to a reviewer. Nothing is exported wrongly today (§1: only `audit_logs` carries it, and only `audit_logs` is
  exported from such a cell).
- **Remedy (A0):** assert that the tables with `export_allowed: true` are exactly `['app.audit_logs']`, so widening
  the export of a SECRET-4/SECURITY-4/INTERNAL-3 cell needs a test edit, not only a data edit.

### R-4 — INFO — a `partial_cover` verdict can be flipped, and F160-13's count with it

- **Where:** `foundation-contract.test.mjs:3912-3916` accepts either verdict; nothing counts the `F160-13` verdicts
  against the finding's "Fifteen in all".
- **What passes:** RM-47 (`billing_webhook_receipts.received_at` flipped to `serves-the-sweep`); F160-13 silently
  becomes fourteen keys.
- **Remedy (optional):** assert that the uncovered keys plus the `F160-13` verdicts equal the number the finding
  states, or pin the two partial-only keys.

### R-5 — INFO — the minimum-domain guard reads one label only

- **Where:** `foundation-contract.test.mjs:4026-4029` refuses PUBLISH-HISTORY / FINANCE-HISTORY only under
  `outside-minimum-domains`.
- **What passes:** EX-14 (`publish_jobs` moved to `not-workspace-data`).
- **Remedy (optional):** require `not-workspace-data` to equal the `outside_workspace_purge` tables less
  `user_profiles` (the purge file already holds that set two-way), or refuse those classes in every omitted bucket
  except `in-minimum-domain-projection-undecided`.

### Claims checked and true

- **Commit `b06b4e0`'s message:** each item is in the diff: `WINDOW160` and the self-test; F160-17; the four tables
  moved and `user_profiles`' own bucket; the design note; partial predicates and fifteen keys; `audit_logs` to phase
  8, the outside mark, the inversions, key names and conflict fields; blocker texts and the WP check;
  `set_decided_at` both ways; `section9_not_picked` and `export_allowed`; schema-wide grants and later drop/disable.
  "No migration, no policy, no grant, no retention number" (no path under `db/foundation/migrations`, and no row
  matches `WINDOW160`). Floor 720 -> 747 and the unchanged test floor and digest, by my count. "39 mutations: 37 red"
  matches the Author's log.
- **Commit `8af817f`'s message:** a refresh plus text fields, the post-commit entry pending (§1). It is the only
  commit touching the handoff after `b06b4e0`, and `check:handoff` is green.
- **Plan §8:** the cherry-pick map (blob-identical, §1); every row of §8.2 whose "measured" column names a probe I
  re-made is red in my harness too (the window forms, F160-17's pairing is held by the map test as the plan says,
  EX-12 for G3, the phase/outside/`refused_by`/inversion probes, the key names, the citations, `set_decided_at`, the
  exclusion reasons, the schema-wide grants and drop/disable). §8.2's G4 row says P8 (exporting `user_profiles`)
  stays green by design; it is a judgement the ERD leaves open (ERD:549, "Members/roles/scopes ที่เหมาะสม"), and I do
  not grade it. §8.3's live-DB line is true (no DB-layer input changed).
- **Plan §4:** fifteen F160-13 keys and F160-14's "lower bound" with 21 keys touching a finding row, recomputed.
  P1's correction matches the phase plan's line 149.
- **Disposition:** the §4 note on the window guard and the Q160-b / Q160-c rows match plan §6 and §4. Q160-a..d stay
  UNANSWERED; nothing in the diff decides one.
- **Blockers:** the five in-place corrections and `[192]`'s appendix say what §8.2 says, and no line moves, so 141
  prep's pinned lines hold (`npm run verify` green).
- **A0's done-list:** branch name, cherry-picks, commits via `commit-when-clean` (read in the logs), a normal push
  (the remote head equals `8af817f`; PR still Draft and not merged).

## 5. Stop-the-line

**None.** Against CONTRIBUTING_AGENTS.md's incidents: no migration, grant, policy or role changes; no secret (scan 0,
synthetic fixture ids); no tenant path changes; no irreversible deletion is enabled (`no-executor`,
`no-deletion-manifest` stand); no contract changes.

**Does anything block the merge?** On Q0's evidence, no. All six of my earlier findings are closed, every required
command I ran is green on the branch name, and CI on `8af817f` is green. R-2 and R-3 are LOW (R-2 is held live; R-3
needs a deliberate data edit to bite), R-1, R-4 and R-5 are INFO; none needs fixing before the merge. The merge bar
(C0 and A1 re-checks, and RFC-2026-025 §5's Integration Owner evidence) is for A0 and the Owner to apply.

## 6. Limits

- I am the Author's vendor and orchestration (§0).
- The mutations are mine (112), cover every class asked for, and are not exhaustive. Two of them threw while being
  applied and were re-run after a selector fix (§1); no file was left changed.
- The live rounds were one baseline and seven drifts on PostgreSQL 17.11 (Homebrew) with the CI shim, not CI's
  image. I did not re-run the round-1 live drifts (MD-02/-06/-07/-11) or the catalog-versus-text equality, because
  no migration changed since `1706111`, where I measured them.
- I did not re-run the Author's `commit-when-clean` or the Author's mutation script; I read their logs.
- I did not re-review the design note's Route A/B balance beyond checking that the disposition and `[148]` match
  plan §6; that is A1's and the Owner's (Q160-b).
- Scratch, not committed: `q0-160-prepr2/` (`mutate.mjs`, `mutate.log`, `mutate2.log`, `mutate3.log`, the result
  JSON files, `count.mjs`, `blk.mjs`, `claims.mjs`, `round.sh`, `drift-live.sh`, `drift-live.log`, the round and
  server logs, `scope.log`, `verify.log`, `handoff.log`, `fc.log`).
