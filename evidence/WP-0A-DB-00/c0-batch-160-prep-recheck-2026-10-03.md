# C0 contract review re-check: batch 160 preparation's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-160-prep`, head
  `8af817fb88cd1f0bd3b4d38ff5c548f901a9d0ce` over code `b06b4e0`, base `c7fe264` (main). Author
  `/claude/a0_atlas`. Draft PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/170>. Previously
  reviewed head `1706111f822cfa87d61943fdb3ed0f29e586878f`; my first-round record is
  `c0-batch-160-prep-contract-review-2026-10-03.md` (cherry-picked here as `1c8b0e4`).
- **Re-check branch:** `recheck/c0-batch-160-prep`, checked out at the subject head `8af817f`. This file is
  its only commit.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.
- **Scope:** narrow. My own nine graded findings and four notes first; then the round's new guards; then
  the claims the round makes. Not a fresh review of the batch.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; the plan `a0-batch-160-prep-plan-2026-10-03.md` (§0, §1, §4,
  §6 in full, §7, §8 in full); the disposition (§4, the Q160 table); `git diff c7fe264..8af817f` and
  `git diff 1706111..8af817f` (13 files), with the commit messages of `b06b4e0` and `8af817f`; ERD
  (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`) §5 (192-219), §10 (482-526), §11 (530-600);
  `open_blockers[91, 105, 148, 150, 190, 192]` at `8af817f` against `1706111` and `c7fe264`; the handoff's
  `tests` and `known_limitations`; PR #170's body and checks (`gh`, read-only); the migration bodies of
  `private.set_decided_at` (`125_approval_settled_is_immutable.sql:50-76`), `private.set_updated_at`
  (`000_foundation.sql:50-60`) and `private.set_deleted_at` (`091_calendar.sql:192-210`);
  `scripts/verify-test-coverage-floor.mjs:540-570`; the Author's scratch logs `a0-160-prepr2/commit1.log`,
  `commit2.log`, `mutate.mjs`, `mutate.log` (read only).

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** No path under `db/foundation/migrations/`, `scripts/db/`, `docs/`,
  `contract-catalog/`, `.github/` or `Makefile` changes against `c7fe264` (measured, empty diff). The live
  layers are green at `8af817f` (§2).
- **Blocks the merge: no**, on my reading. All nine of my graded findings (G1-G9) and all four notes
  (N1-N4) are resolved as I asked, each re-measured (§3). The re-check finds **one LOW** (R1: the F160-17
  record can be removed whole and the suite stays green, and the plan's "pairing removed: red" is
  narrower than it reads) and **one LOW** of residual guard narrowness (R2), plus two notes. Neither is a
  false statement about the schema, and each is a test addition or a sentence. Whether they are fixed
  before the merge or owed by name is the Integration Owner's call.
- **Answers to the questions:**
  1. *Retention map complete, citations true:* **yes.** 66 rows for the 66 relations in `app` and
     `private`, measured live at `8af817f`, none missing, none extra, no duplicate. Every `defined` row's
     class is one §10 defines and §5's cell reaches; §5 cells verbatim (the test holds it, and the test is
     green on the branch name). The one mismatch I found unrecorded (G2) is now F160-17, true to ERD:201,
     :491 and :492.
  2. *Undefined classes and mismatches are findings, never numbered:* **yes.** 17 findings; no row
     carries a §10 window in any form §10 or DATA-DEC writes: all 21 window phrases in ERD:488-514 and
     866-873 match the new `WINDOW160` (measured), and P1-P3 now fail the suite. Forms §10 never writes
     (`"30"` as a string, `P30D`, `30d`, Thai digits) still pass (note R-N1).
  3. *Export manifest and §11.1:* **faithful.** The manifest fields are those §11.1/6 lists; the 39
     included and 27 omitted tables partition the map; the four tables I showed to be inside the minimum
     domains are now `in-minimum-domain-projection-undecided`, `user_profiles` has its own labelled
     judgement, and `security_events`' whole-table omission is labelled a judgement. The five tables
     left `outside-minimum-domains` (`ai_model_policies`, `meta_connections`, `notification_preferences`,
     `notifications`, `social_accounts`) are, on my reading of ERD:548-555, outside them.
  4. *Purge order:* **a valid topological order of the real FK graph**, re-measured live: the 90 declared
     edges equal `pg_constraint` by `fk|child|parent`; no violations once the two self-references and the
     declared break are set aside; the break's reverse key exists; 12 conflicts recompute. The phase
     labels now follow §11.4 (`audit_logs` in step 8), the four phase inversions equal the recomputed set,
     and `outside_workspace_purge` equals the live set of tables with no `workspace_id` and no key to the
     root (the six global catalogs and `user_profiles`).
  5. *Design note:* **fair to both routes now.** The executor (DATA-DEC-03) is booked to both, Route A has
     a Benefit list that mirrors Route B's costs, the investigation trade-off (ERD:513) is a Route B cost,
     and the disposition's Q160-b row and `open_blockers[148]` list B's costs as §6 does. The
     recommendation (B) is unchanged and still labelled a recommendation.
  6. *Claims:* true where measured (§4), with the exception in R1.

## 2. Measured, and how

Node `v24.20.0` (`node -v` before every measured run; `/Users/bank/.local/node-v24.20.0/bin/node` first on
PATH). The three repository commands were run **on the branch NAME**: the agent branch is checked out in
the Author's worktrees, so I took the name here with `git checkout --ignore-other-worktrees` at the
unchanged ref `8af817f` (`git branch --show-current` printed `agent/claude/WP-0A-DB-00-batch-160-prep`),
measured, and returned to `recheck/c0-batch-160-prep`. Local and `origin` refs were both `8af817f`
before and after; `git status` was empty throughout.

| command | exit | result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs c7fe264 WP-0A-DB-00` | 0 | `all 15 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | 0 | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` | 0 | `clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0` |
| the guard's own `stripNonCode` / `countDeclaredTests` / assertion regex / name digest, imported from `scripts/verify-test-coverage-floor.mjs` | n/a | 80 tests, **747** assertions, `8c35e631c28c0574`; `test-suite-contract.mjs` declares 747 and the same digest. As the Author states. |
| `test-kits/integrity-manifest.json` | n/a | 88 entries |
| `git diff --stat c7fe264..8af817f -- db/foundation/migrations scripts/db .github docs contract-catalog Makefile` | n/a | empty |
| `open_blockers` at `8af817f` vs `c7fe264` | n/a | 193 entries; `[4, 77, 91, 105, 148, 150, 190]` each `startsWith` its base string; `[192]` new; `open_blockers[0]` on line 254. Vs `1706111`: only `[91, 105, 148, 150, 190, 192]` and `ownership`'s rationale differ |
| PR #170 (`gh`, read-only) | n/a | Draft, open, not merged, head `8af817f`, base `main`; `bootstrap` SUCCESS (run 37147066016); the body ends with the Generated-with line |
| live round, port 5505 (below) | 0, 0, 0 | `db-migrate-clean: ok`; `db-rls-smoke: 1079 isolation case(s) passed`; `db-authz-proofs: ok — 6 claim(s)` |
| catalog read on that database, compared by my own `check.mjs` (not by the test) | n/a | §2.1 |
| my reversal probes, 28 (below) | n/a | §2.2 |

**Live layers.** Nothing a live database layer reads has changed, so the Author's reason for not running
them is sound. I ran one round anyway, because G6, G7 and G8 are claims about the catalog (partial
predicates, `workspace_id` columns, constraint names) and I wanted them compared with the catalog, not with
the test's text parser:

- a private cluster under `scratchpad/c0-160-prepr2/pgdata`; `initdb --locale=C -A trust -U postgres`,
  `LC_ALL=C`; TCP only on `127.0.0.1:5505` (`-c unix_socket_directories=''`);
- `db/foundation/ci/supabase-shim.sql` first; then, with
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres`, `make db-migrate-clean` and
  `make db-rls-smoke`, on this worktree at `8af817f`;
- no drift was appended to `140_audit.sql` for the live round; the three drift probes in §2.2 were
  static (the suite only) and `140_audit.sql` was restored byte for byte (`shasum -a 256 -c`: OK).

The cluster was stopped and its data directory removed; nothing listens on 5505 afterwards (`lsof`
exit 1). Ports 5432 and 5499 were not touched.

### 2.1 Catalog against the round's data

- **Tables:** 66 live = 66 rows; none only in the map, none only live, no duplicates.
- **Keys (G8):** 90 live, all NO ACTION and non-deferrable; the declared 90 equal them by `fk|child|parent`
  (missing `[]`, extra `[]`). The order has 66 entries, ends with `app.workspaces`, and has no topological
  violation. The break `assets_current_version_scope_fk` (child at 27, parent at 26) has the reverse key
  `asset_versions_asset_scope_fk`.
- **Outside a workspace's purge (G7):** the live set of tables with no `workspace_id` column and no key to
  `app.workspaces` is exactly `ai_models`, `billing_plan_versions`, `billing_plans`,
  `industry_pack_versions`, `industry_packs`, `plan_entitlements`, `user_profiles`, equal to the marked
  set. Each global table's children (`ai_model_policies`, `billing_subscriptions`, `industry_assignments`,
  `plan_entitlements`) come before it in the order, so leaving it unpurged blocks nothing.
- **Phases (G7):** `audit_logs` 8, `security_events` 8; every defined class has one phase except
  `TENANT-LIFE` (7, and 9 for the root alone); the recomputed inversions are `content_versions`,
  `content_items`, `page_context_profiles`, `business_profiles`, equal to `phase_inversions`, and each
  entry's `because` is the full list of conflicts with that parent (1, 1, 2 and 4; the other four
  conflicts have the root as parent).
- **Conflicts (N1):** 12 recomputed, equal to the declared; 21 non-self keys touch a finding row, as F160-14
  and `_retention_conflicts` now say.
- **Sweeps (G6):** every `covered_by` equals the live leading-column cover; 13 keys uncovered; exactly four
  keys are covered only by partial indexes, and the live predicates (`pg_get_expr`) agree with the
  recorded ones: `assets.purge_after` and `research_snapshots.retention_until` serve their sweeps;
  `workspace_invitations.expires_at` (`accepted_at IS NULL AND revoked_at IS NULL`) and
  `billing_webhook_receipts.received_at` (`processed_at IS NULL AND dead_lettered_at IS NULL`) do not, and
  carry `F160-13`. Fifteen, as stated.
- **Triggers (A1 S2's rule, which I relied on for G7):** 51 non-internal, none disabled; four functions in
  use: `refuse_mutation` (on `audit_logs` and `security_events`, as `refuse_mutation` and
  `refuse_truncate`), `set_decided_at` (on `approval_requests`), `set_updated_at`, `set_deleted_at`. I read
  the last two: they only stamp a timestamp. `set_decided_at` refuses a change to a recorded
  `decided_by` (`125_…sql:59-62`), so treating it as refusing is right.
- **Grants:** no role other than `postgres` holds DELETE or TRUNCATE in `app` or `private`.

### 2.2 Reversal probes (`probe.mjs`, `probe3.mjs`)

Each was a one-file edit; the three batch-160 tests were run (`--test-name-pattern`, 3 tests); the file
was restored from a saved buffer and compared by sha256. Baseline green before; all four touched files
`OK` against `before.sha` after.

- **My first-round probes, re-run:** P1, P2, P3 (Thai and hyphenated windows), P4 (control), P5 (phase
  relabel), P6 (fk renamed), P7 (conflict child changed), P9 (`SECRET-4` re-picked), P10 (false `WP:`
  line): **all red**. P8 (export `user_profiles`): green, which is what I asked for (G4 asked for the
  reason, not for a refusal; whether member profile fields are exported is undecided, ERD:549).
- **On the round's new guards, red (they bite):** N5 a number-typed `retention_days: 30`; N9 F160-17's
  finding deleted with the row's pairing kept; N11 `publish_jobs` back to `outside-minimum-domains`; N12
  `audit_logs`' `export_allowed` removed; N14 `audit_logs`' `refused_by` dropped; N15 a `refuse_mutation`
  trigger appended on `workspace_settings` and not named; N16 `grant delete on all tables in schema app`
  appended; N17 `drop trigger refuse_mutation on app.audit_logs` appended.
- **On the round's new guards, green (survive):**
  - N1 `"retention_days": "30"` (a string), N2 `"P30D"`, N3 `"keep 30d"`, N4 `"keep ๓๐ วัน"` (R-N1);
  - N6 `workspace_invitations`' `partial_cover.verdict` flipped to `serves-the-sweep`; N7 `assets`'
    flipped to `F160-13` (R2);
  - N8 the invitations row's `also_claimed_by` and `also_claimed_finding` both removed; N18 those two and
    the F160-17 finding all removed (R1);
  - N10 `app.content_items` moved from the export to `outside-minimum-domains`, checksums recomputed (R2);
  - N13 `business_profiles`' `phase_inversions[].because` cut from four conflicts to one (R2).

## 3. My first-round findings, re-checked

| finding | asked | done at `8af817f` | measured | status |
|---|---|---|---|---|
| G1 (MEDIUM) window guard English-only | drop `\b`, allow `[-\s]*`, add hour/week/ชั่วโมง, pin Thai and hyphen | `WINDOW160` (`foundation-contract.test.mjs:3813`), a self-test, numeric leaves refused (`:3901`); plan §1, disposition §4 corrected | P1-P3 red, P4 red; 21/21 §10 and DATA-DEC forms match; no row matches | **resolved** |
| G2 (MEDIUM) invitations mismatch unrecorded | F160-17, `also_claimed_by` pair, owed under Q160-c widened | F160-17 in `findings`; pair on the row (`retention-map.json:3038`); `[192]` (13); disposition Q160-c | text true to ERD:201, :491, :492; nothing decided. But see R1 | **resolved, with R1** |
| G3 (MEDIUM) four tables mislabelled outside the domains | separate bucket; P4 and handoff corrected; optional test | `in-minimum-domain-projection-undecided`; plan P4 and handoff `known_limitations` corrected; test at `:4029` | N11 red. See R2 for the guard's reach | **resolved** |
| G4 (LOW) `user_profiles` reason false | own bucket, labelled a judgement | `user-scoped-profile`, citing ERD:198 and :549 | P8 green, by design | **resolved** |
| G5 (MEDIUM) design note unbalanced | executor to B; A benefits; investigation trade-off; disposition and `[148]` match §6 | all four, plan §6, disposition Q160-b, `[148]` | read against §6 and ERD:513 | **resolved** |
| G6 (LOW) partial covers counted | predicate recorded and re-derived; two keys added to F160-13 | `partial_predicates`, `partial_cover` (`:3912`); F160-13 fifteen; `[192]` (9) widened | live predicates agree (§2.1). See R2 for the verdict | **resolved** |
| G7 (LOW) phases, audit in 7, global tables | `outside_workspace_purge`; audit to 8; `_phases` note; phase-against-class test | all, plus `phase_inversions`, `refused_by`, `_rule`, `_not_monotone` | live sets equal (§2.1); P5, N14 red | **resolved** |
| G8 (LOW) fk names and conflict fields not held | compare `fk|child|parent`; conflicts' fields | `fkEdges160` names; conflicts checked against edges and map behaviours | 90/90 live; P6, P7 red | **resolved** |
| G9 (LOW) blocker untruths; `WP:` citations unchecked | `[190]`, `[105]`, `[91]`, P1 texts; optional assertion | all four texts; citation assertion (`:3983-3992`) | read; P10 red; no other `WP:` form in the map | **resolved** |
| N1 twelve is a lower bound | say so | F160-14, `_retention_conflicts`, `[192]` (10) | 21 recomputed live | **resolved** |
| N2 exclusions rest on picks | (note) | `section9_not_picked` two-way; `export_allowed` | P9 red, N12 red | **resolved** |
| N3 `security_events` omission a judgement | label it | reason now says so, citing ERD:555 | read | **resolved** |
| N4 `[150]` wording | (note) | "controls_on_every_row names" | read | **resolved** |

## 4. Claims checked

| claim (where) | verdict |
|---|---|
| assertion floor 720 -> 747, test floor 80 and digest `8c35e631c28c0574` unchanged, the guard's own count (`b06b4e0`, plan §8.3, rationale) | **true**, measured with the guard's own functions |
| integrity manifest regenerated, 88 digests | **true** |
| "all 15 changed paths declared" (plan §8.3, PR body) | **true**, measured |
| `check`, `check:handoff`, `verify` exit 0 after `8af817f` (PR body) | **true**, measured on the branch name: `check:handoff` exit 0, and `verify` exit 0, which runs `npm run check` (coverage floor, toolchain, secret scan, protocol, tests) as its child, 684/684 |
| handoff records the post-commit entry as PENDING with `exit_code: null` (Q0-F5) | **true**, read |
| `commit-when-clean` exit 0 for `b06b4e0` and `8af817f` | **read** in the Author's `commit1.log` / `commit2.log`; consistent with `8af817f` being green; not reproduced |
| cherry-picks `89d0994 -> 1c8b0e4`, `ddd9879 -> 886b1a4`, `b10e5f8 -> 6e41fc8` (plan §8.1) | **true** (`git log`; my record at `1c8b0e4` is byte-identical to the file I wrote) |
| "`a0-160p/` no longer exists" (plan §8.2, Q0-F6) | **true**: absent from the scratchpad listing |
| the `diff -rq` against worktree `wf_5b1db44b-fe1-1` before taking the name (plan §8.1) | read, not reproduced |
| blockers: `[190]` `app.content_schedules`; `[105]` "batch 131 used WEBHOOK-SHORT"; `[91]` "Undefined or mismatched"; `[150]` "controls_on_every_row"; `[148]` B's costs as §6; `[192]` (13) and the widened (9), (10) | **true**, read; append-only against `c7fe264` |
| "F160-13 has 15 keys" (A0's report, plan §4, `[192]`, handoff) | **true**: 13 uncovered + 2 partial-only, live |
| "37 red, 2 green" of 39 mutations (plan §8.3, handoff, PR body) | **read** in `mutate.log`; I re-ran my own ten, not the Author's 39 |
| G2 row: "the pairing removed: red" (plan §8.2) | **narrower than it reads**: the Author's mutation (`mutate.mjs:53`) removes only `also_claimed_finding`; removing the pairing (N8) or F160-17 whole (N18) stays green (R1) |
| G1 row / disposition §4: the guard refuses "numeric" windows | **true for number-typed fields** (N5 red); a string-typed `"30"` is not refused (R-N1) |
| G7 row: "the inversions two-way" | **true for the table set**; the `because` list is held one way (N13, R2) |
| "No migration, no policy, no grant, no retention number; no Q-id decided" (`b06b4e0`) | **true**: no protected path changed; every Q160 row still UNANSWERED; no row carries a window |

## 5. Findings

### R1 (LOW): the F160-17 record is not held by any assertion, and the plan's "pairing removed: red" is narrower than it reads

- **Where:** `test-kits/db/foundation-contract.test.mjs:3886` (the pairing is checked only *if present*)
  and `:3981` (every finding has `what` and `source`, but the set of findings is not held);
  `db/foundation/lint/retention-map.json:3038`; plan §8.2's G2 row
  (`a0-batch-160-prep-plan-2026-10-03.md:502`).
- **Defect:** the row-level check runs only when `also_claimed_by` is present. Removing both pairing
  fields from the invitations row (N8), or those two and the F160-17 finding (N18), leaves the three
  tests green. The Author's probe (`a0-160-prepr2/mutate.mjs:53`) removed only `also_claimed_finding`,
  which trips the presence check; that is what "the pairing removed: red" measured. The same is true of
  F160-16's pairing. So G2's record, the one mismatch that changes the final behaviour, can be dropped
  silently, while `[192]` (13) and the disposition still cite it.
- **Remedy:** hold the expected pairs, for example assert that the rows of `workspace_invitations` and the
  two `HISTORY`-claimed tables carry `also_claimed_by`/`also_claimed_finding`, or that every finding id
  `[192]` names exists in the map and is referenced by a row or by `controls_on_every_row`; and reword the
  §8.2 cell to what was measured ("`also_claimed_finding` removed: red").

### R2 (LOW): three of the round's guards hold today's instance rather than the stated rule

None of these is untrue as the plan words it; each is narrower than the rule its comment states.

- **Export labels** (`:4029`): only `PUBLISH-HISTORY` and `FINANCE-HISTORY` are refused in
  `outside-minimum-domains`. The other classes §11.1's minimum domains name (TENANT-LIFE settings,
  AUTH-HISTORY members, CONTENT-, APPROVAL- and SCHEDULE-HISTORY, RESEARCH-\*, ASSET-ORIGINAL, AUDIT) are
  not: N10 moved `app.content_items` there and stayed green. Remedy: a class-to-domain table for
  ERD:548-555, and refuse any class in it.
- **Phase inversions' `because`** (`:4103`): every listed key must be a conflict on that parent, but the
  list need not be complete (N13 green). Remedy: assert equality with the conflicts whose parent is the
  table.
- **Partial-cover verdict** (`:3912`): either verdict is accepted, so the "fifteen" of F160-13 is not
  held (N6, N7 green). It is a judgement, so a test cannot decide it; remedy: pin the count, or the two
  `F160-13` keys, beside F160-13's text.

### Notes (no grade)

- **R-N1. Window forms §10 never writes still pass.** A string-typed `"30"`, ISO `P30D`, compact `30d`
  and Thai digits (`๓๐`) pass the row guard (N1-N4). §10 and DATA-DEC write none of these (21/21 of their
  phrases match, and the ERD carries no Thai digit), and a number-typed field is refused (N5). Optional:
  refuse any digit string in a row outside the known id and citation shapes.
- **R-N2. Commit-message wording.** `b06b4e0`'s body says "Thai, hyphenated and numeric windows"; the
  numeric part is number-typed fields only (as R-N1). The plan's §1 sentence says so correctly.

## 6. Stop-the-line

**None.** Measured: no migration, policy, grant, role, CI file or contract changes; the live layers are
green at `8af817f`; no fixture carries real identity (the fixture's ids are unchanged from
`fixture-catalog.json`); no secret appears in the diff (`npm run verify` includes the secret scan, exit 0).
R1 and R2 are test reach, not a tenant leak, a secret exposure, a lost job, a migration divergence, an
irreversible deletion or a contract mismatch under `CONTRIBUTING_AGENTS.md`'s list.

## 7. Limits

- I share the Author's vendor and model family (§0). An error we both make, I am unlikely to see.
- Narrow by instruction: I re-checked my own findings, the round's new guards and the round's claims. I
  did not re-review A1's or Q0's findings beyond where they share a change with mine (S1-S4, Q0-F1..F4),
  and I did not re-run the Author's 39 mutations, only my 10 and 18 new ones.
- I did not reproduce `commit-when-clean` or the `diff -rq` the plan records; doing so would mean moving
  a branch ref that other worktrees hold.
- I ran `npm run check` only as `npm run verify`'s child (`scripts/verify-clean-run.mjs`), not on its own.
- The judgement that the five remaining `outside-minimum-domains` tables are outside ERD:548-555 is my
  reading; the fixture itself marks inclusion as NOT decided.
- Graded findings are my reading. Their disposition (fix, owe or reject) belongs to the Author and the
  Integration Owner; acceptance of this file as C0's signature belongs to the Integration Owner and the
  Product Owner.
- Scratch, not committed: `scratchpad/c0-160-prepr2/` holds `round.sh`, `catalog.sql` and its dumps,
  `check.mjs` and `check.txt`, `probe.mjs`, `probe3.mjs`, `probe.txt`, `before.sha`, and the logs.
