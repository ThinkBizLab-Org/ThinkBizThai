# A1 security re-check: batch 160 preparation, review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-160-prep` (PR #170, Draft, open, not merged),
  head `8af817f` (`8af817fb88cd1f0bd3b4d38ff5c548f901a9d0ce`) over code `b06b4e0`, base `c7fe264` (main).
  Author `/claude/a0_atlas`. Previous reviewed head `1706111`; my review there is
  `a1-batch-160-prep-security-review-2026-10-03.md` (cherry-picked here as `886b1a4`).
- **Scope:** narrow. My own findings S1-S7 first, then what the round changed (`1706111..8af817f`), then
  the measured claims.
- **Checked out as:** local branch `recheck/a1-batch-160-prep` at `8af817f`, in this run's own worktree.
  The branch name is checked out in two of the Author's worktrees (`wf_5b1db44b-fe1-1`, `-5`). So for
  `verify`, `check:handoff` and branch scope I made a local clone in my private directory
  (`a1-160-prepr2/repo`). There I created `agent/claude/WP-0A-DB-00-batch-160-prep` at `8af817f`, set
  `origin/main` to `c7fe264`, confirmed the name with `git branch --show-current` and a clean tree, and
  measured on that name, not detached. I committed nothing there. The probes (§3) ran in that clone; every
  file was restored byte for byte (sha256 compared after each probe).
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent started by a workflow of `/claude/a0_atlas`, the Author of this batch. I am the same vendor
and model family as the Author. Under RFC-2026-024 that is the stated independence limit of this role
run. Accepting this re-check as the A1 role's signature is the Integration Owner's and the Product
Owner's act, not mine.

## 1. Read and measured

**Read:**

- `CONTRIBUTING_AGENTS.md`; my review at `1706111`.
- All ten commit messages `c7fe264..8af817f`, the five new ones in full.
- `git diff 1706111..8af817f`:
  - `foundation-contract.test.mjs` (all hunks);
  - `export-manifest.fixture.json` (all hunks);
  - the six changed `open_blockers` entries;
  - `amends_without_owning`;
  - `test-suite-contract.mjs`;
  - plan §0, §1(a), §4, §6, §7 and the new §8;
  - the disposition (both hunks);
  - the handoff's `security_privacy_cost_impact`, `known_limitations` and `tests`.
- The changed data, by script:
  - the purge order's `audit_logs`, `security_events`, the seven `outside_workspace_purge` entries,
    `phase_inversions` and `_phases`;
  - the map's `section9_not_picked` on all seven rows that carry it, the `approval_requests` controls,
    the `workspace_invitations` row, F160-13 and F160-17.
- Governing text:
  - ERD §9.3 (470-475), §10 (484-526) and DATA-DEC (866-873);
  - `125_approval_settled_is_immutable.sql:50-103` (`set_decided_at`);
  - `000_foundation.sql:50-64` (`set_updated_at`) and `091_calendar.sql:192-206` (`set_deleted_at`),
    the two functions the test now reads as "stamping only";
  - `140_audit.sql:362-398` and `:684-690` (`refuse_mutation` and its triggers).

**Measured** (Node `v24.20.0`, checked with `node -v` before each measured run; scratch under
`a1-160-prepr2/`):

| command | where | exit | result |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs c7fe264 WP-0A-DB-00` | branch name (clone) | **0** | `all 15 changed path(s) are declared, and every amendment explains one` |
| `npm run check:handoff` | branch name (clone) | **0** | `describes the branch: nothing substantive after its cited head` |
| `npm run verify` | branch name (clone) | **0** | `clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0` |
| `node scripts/scan-repository-secrets.mjs` | clone | **0** | clean |
| PII/secret grep (email, Thai phone, `sk_live`/`sk_test`, JWT, `password`, `bearer`, URL) over the three data files | clone | 0 | One hit: the word "bearer" in the fixture's token-material reason (fixture:306). No value. |
| guard count (`stripNonCode`, `countDeclaredTests` imported from the guard, its `\bassert\.\w+\(` and name-digest recipe) | `1706111` / `8af817f` | 0 | **80 / 720 / `8c35e631c28c0574`** -> **80 / 747 / `8c35e631c28c0574`**. Matches `test-suite-contract.mjs:89/198/238`. |
| `git patch-id --stable` of each review commit against its cherry-pick | | 0 | `89d0994`=`1c8b0e4`, `ddd9879`=`886b1a4`, `b10e5f8`=`6e41fc8`: identical patches |
| manifest against `c7fe264` and `1706111` | node | 0 | Outside `open_blockers` and `ownership`: unchanged since `c7fe264`. Since `1706111` only `amends_without_owning` (the 720 -> 747 sentence appended) and blockers 91, 105, 148, 150, 190 and 192 changed. Each of 91-190 still starts with its `c7fe264` text. `[192]` is new. The `254+i` line rule holds for 4, 77, 91, 105, 148, 150, 190 and 192. |
| `WINDOW160` against every line of ERD §10 and DATA-DEC that has a digit | node | 0 | Every window matches, including "1/2 ปี" (DATA-DEC-06). The only lines it does not match are §10's numbered precedence list (520-524) and DATA-DEC-03/10, which have no window. No other form ("30d", "P30D", Thai digits) appears anywhere in the ERD. |
| grep for readers of the three data files in `scripts db Makefile .github test-kits tests`; `git diff --name-only c7fe264..8af817f` over migrations, `ci/`, seeds, `scripts/db`, `Makefile`, `.github`, `tests` | | 0 | Only `foundation-contract.test.mjs` reads them, and none of those paths changed. So no live-layer input changed. |
| `gh pr view 170`, `gh pr checks 170`, `gh run view 37147066016` | | 0 | Draft, open, head `8af817f`, MERGEABLE. `bootstrap` **pass**: run 37147066016, "Bootstrap validation", success on `8af817f`. |
| `lsof -nP -iTCP:5501 -sTCP:LISTEN` | | 1 | Nothing listening |
| probes, §3 | clone, branch name | 0 | 43 one-file edits, each restored. Baseline and after-restore: green. |

**Not run: the live DB.** Nothing a database layer reads changed (see the readers row above). No drift
needed re-running. I started no cluster on 5501, so none was left to stop or remove. Nothing was appended
to `140_audit.sql` on a live cluster. The static probes appended to it in the clone only, and those were
restored byte for byte. Ports 5432 and 5499 were not touched.

## 2. My findings at `1706111`, re-checked

| id | was | now | evidence |
|---|---|---|---|
| S1 | MEDIUM: the Thai half of the window guard never fired | **Closed.** | `WINDOW160` (`foundation-contract.test.mjs:3813`) has no `\b` after a Thai unit. It also reads ชั่วโมง and สัปดาห์, an optional hyphen, and a self-test on §10's own forms. Probes "30 วัน", "1 ปี", "12 เดือนหลัง final state", "30วัน after", "24 ชั่วโมง", "1-year" and `retention_days: 30`: all red. Every §10 and DATA-DEC window matches (§1). Plan §1(a), the disposition and the handoff's impact line now say this, and it is true. |
| S2 | LOW: `set_decided_at` not held both ways | **Closed.** | Dropping the control turns red. An unnamed `refuse_mutation` trigger appended on `approval_requests`, an unread trigger function that nulls `decided_by`, and a later `drop trigger set_decided_at` each turn red. I read the two "stamping" functions: each only stamps a timestamp (000:50-60, 091:192-204). |
| S3 | MEDIUM: `audit_logs` in step 7, and the phase untested | **Closed.** | `audit_logs` is phase 8, with no foreign key, at position 57, just before `security_events`. Both carry `refused_by: [refuse_mutation, refuse_truncate]`. Moving `audit_logs` to 7, moving `security_events` to 6, or dropping `refused_by` each turns red. The four phase inversions are declared and held two-way. |
| S4 | LOW: exclusions rest on an unjustified per-table pick | **Closed for §5's SECRET-4, SECURITY-4 and INTERNAL-3. A residual remains (R1).** | All seven not-picked rows carry a reason. Exporting `notifications`, `meta_connections`, `ai_model_policies` or `social_accounts` turns red, and so does weakening a reason or removing `audit_logs`' `export_allowed`. `export_allowed` is on `audit_logs` alone (measured). |
| S5 | INFO: `user_profiles` called a global catalog row | **Closed.** | It now has its own `user-scoped-profile` class, labelled a judgement, with ERD:549 undecided. Exporting it stays green (P8). I agree that this is by design: §11.1/5 does not name user profile fields, so the test has nothing to hold. The omission is the conservative judgement, and it is recorded as one. |
| S6 | INFO: `[190]` named `app.schedules` | **Closed.** | `[190]` names `app.content_schedules`, and `app.schedules` is absent. Every `WP:<n> (open_blockers[i])` citation is now checked: an off-by-one turns red. |
| S7 | INFO: global tables in a workspace purge | **Closed.** | The six global catalogs and `user_profiles` carry `outside_workspace_purge` with a reason. The test holds that two-way, by "no `workspace_id` and no key to the root". Dropping it from `ai_models` or `user_profiles` turns red. |

## 3. Probes (measured; clone on the branch name; each edit restored and its sha256 compared)

`a1-160-prepr2/probe.mjs` makes one edit at a time and runs the three batch-160 tests
(`--test-name-pattern`). Baseline exit 0, after-restore exit 0. The full log is `probe.log`.

| group | red (caught) | green (not caught) |
|---|---|---|
| S1, the window guard | the six §10-form windows, and `retention_days: 30` | Thai digits "๓๐ วัน"; spelled "สามสิบวัน"; "30d"; "720h"; "P30D"; a string field `"retention_days": "30"`; a window put on a purge-order entry or into the export fixture (R3) |
| S2, triggers | the dropped control; an unnamed refusal trigger; an unread trigger function; a later `drop trigger set_decided_at`; a later `disable trigger refuse_mutation` on `audit_logs`; `grant delete on all tables in schema app to app_worker` | a later `create or replace function private.refuse_mutation()` with a no-op body (see the note in §6) |
| S3, S7, purge | `audit_logs` 8->7; `security_events` 8->6; `refused_by` dropped; `outside_workspace_purge` dropped (`ai_models`, `user_profiles`) | none |
| S4, S5, export | exporting `notifications`, `meta_connections`, `ai_model_policies`, `social_accounts`, `security_events`, `meta_webhook_inbox`, `research_snapshots`, `jobs` or `ai_credential_references`; a not-picked reason weakened; `audit_logs`' `export_allowed` removed | exporting **`workspace_invitations`** (R1); exporting `user_profiles` (by design, S5); `export_allowed: true` added to `meta_connections` and the table exported (R2) |
| S6 | a `WP:` citation off by one | none |

## 4. The questions

**Does the retention map or the export fixture leak anything?** No. Measured: the secret scan is clean,
and the pattern grep finds no value. The round adds reasons, judgements, predicates and finding text, not
data. The fixture's identities are unchanged (the catalog's uuid5 ids).

**Does any of it imply a deletion or anonymisation path that bypasses `refuse_mutation` or
`set_decided_at` without a decision?** No.

- No migration, grant, policy or trigger changed (diff).
- The purge order now says, per table, that `refuse_mutation` and `refuse_truncate` refuse the purge of
  `audit_logs` and `security_events` (`refused_by`). It places both in §11.4 step 8.
- `set_decided_at` is held both ways.
- Plan §6's rebalanced design note keeps Route A as a costed, unrecommended option. It now books the
  executor (DATA-DEC-03) to both routes. Q160-b is still UNANSWERED (disposition, `[148]`).
- F160-17 records the `workspace_invitations` TOKEN-SHORT/AUTH-HISTORY disagreement. It decides
  nothing (`decision: null`) and is owed under Q160-c on `[192]` (13).

**Are the excluded export classes truly excluded and tested?** Yes for the five classes §11.1/5 names.
SECRET-4, raw webhook, internal job, SECURITY detail and research snapshot each turn red when exported
(§3). §5-cell SECRET-4, SECURITY-4 and INTERNAL-3 that a row did not pick are now held too. One residual
remains outside those five as the test reads them: `workspace_invitations`' token hash (R1).

**Is any retention-relevant control misdescribed?** None of the round's descriptions is untrue as
written. What they now claim, they hold:

- the plan §1(a) and the handoff on the window guard;
- the plan P4 and the handoff on the export judgements;
- `_phases._rule`;
- `refused_by`.

R3 records how far the window guard reaches.

## 5. Findings

| id | grade | finding | where | remedy |
|---|---|---|---|---|
| **R1** | **LOW** | **`workspace_invitations`' exclusion is held only by the fixture's own list.** §11.1/5 says no secret. The fixture omits the table as `token-material` (fixture:305-306): "token_hash is the stored form of a bearer invitation token" (§9.3). But §5's cell is `PII-2/AUTH-3`, with no SECRET-4. So neither the class rule nor the new §5-cell rule (`:4045-4053`) reaches it. It is not in the ten tables "omitted by name" either (`:4054-4056`). Exporting it stays green (§3). This is the one survivor of S4 that is not a recorded undecided judgement. Today it is omitted, and nothing leaks. | `test-kits/db/foundation-contract.test.mjs:4054-4056`; `test-kits/db/export-manifest.fixture.json:305-306` | Add `app.workspace_invitations` to the omitted-by-name list. Or hold the class: a table whose columns include a `token_hash` (§9.3's "store cryptographic hash only") is never in `files`. |
| **R2** | **INFO** | **`export_allowed` is a single-field gate the test does not pin.** Adding `export_allowed: true` to `meta_connections`' not-picked SECRET-4, then exporting the table, stays green (§3). The why must already be over 40 characters, and the change shows in the map's diff. But the test comment says "today audit_logs alone" (`:4047`), and nothing makes a second table fail. | `foundation-contract.test.mjs:4045-4053` | Pin the set (`['app.audit_logs']`), so a new export of a SECRET-4/SECURITY-4-family table changes the test and is reviewed as a judgement. |
| **R3** | **INFO** | **The window guard's reach.** It holds every form §10 and DATA-DEC write (measured, §1), on map rows. It does not read Thai digits, spelled numerals, compact "30d"/"720h", ISO "P30D", or a number written as a string field. It does not run over the purge order or the export fixture at all (§3). The plan and the handoff claim only rows and §10's forms, so nothing is misdescribed. 160 will consume all three files. | `foundation-contract.test.mjs:3813`, `:3897-3901` | Optional: refuse `/\d+\s*[dhwmy]\b|P\d+[DWMY]|[๐-๙]/` too, refuse any string leaf that is all digits, and run `WINDOW160` over the purge order's entries and the fixture's manifest. |

No finding of mine from `1706111` stays open except as R1. R1 is a residual of S4, graded lower because
the four SECRET-4-family exports S4 named are now red.

## 6. Claims checked

**True, measured or read:**

- The three cherry-picks: patch-identical to their sources, each with `-x` (§1).
- The A0 "done" list:
  - the guard reads Thai without `\b`, hyphens, and hour/week/ชั่วโมง/สัปดาห์, with a self-test, and
    refuses every numeric leaf but `section5.line`;
  - F160-17 and `[192]` (13);
  - the four tables are in `in-minimum-domain-projection-undecided`, and `user_profiles` has its own
    bucket;
  - `security_events`' omission is labelled a judgement;
  - `partial_predicates` and `partial_cover`, with F160-13 at fifteen keys;
  - `audit_logs` in phase 8, `refused_by`, the seven `outside_workspace_purge` entries,
    `phase_inversions`, and the phase-vs-class test;
  - edges as `fk|child|parent`, and the conflict fields;
  - the `[190]`, `[105]`, `[91]`, `[150]` and P1 texts, and the `WP:` citation assert;
  - `set_decided_at` both ways, and an unread trigger function fails;
  - `section9_not_picked` on seven rows, and `export_allowed` on `audit_logs` alone;
  - schema-wide grants and later drop/disable are read;
  - F160-14's twelve is a lower bound;
  - the post-commit entry is "pending" in the handoff, and the observed exits are in the PR body;
  - plan §8 records that `a0-160p/` is gone;
  - 720 -> 747 by the guard's own count, with the test floor and digest unchanged;
  - verify-branch-scope 15 paths;
  - PR #170 is still Draft and not merged.
- The commit messages of `b06b4e0` and `8af817f` match the diff.
- The PR body's post-`8af817f` table. I re-measured three rows of it on the branch name and got the same
  exits: `check:handoff` 0, `verify` 0 (684/684) and branch scope 0 (15).
- "No live DB, because no DB-layer input changed": true (§1).
- CI on `8af817f`: **green**, run 37147066016.

**Read, not re-measured:**

- A0's 39-mutation tally. I ran my own 43 probes; on the overlap, mine agree.
- The live FK-name equality ("all 90 equal `pg_constraint`", C0 at `1706111`).
- Plan §6's closure counts ("175 `auth.uid()` closures").
- C0's G-findings beyond where they touch S1-S7.

**Note (not a finding).** The static test holds a refusal trigger by its name and its function's name,
not by the function's body. A later `create or replace function private.refuse_mutation()` with a no-op
body stays green statically (§3). That gap was there at `1706111` too. It is held live:
`tests/db/identity/*` exercise `refuse_mutation` under `make db-rls-smoke`, and the rule against
rewriting an integrated migration covers the rest.

## 7. Stop-the-line verdict

**No stop-the-line.**

- Nothing leaks: the secret scan is clean and the data has no values.
- Nothing changes isolation: no migration, grant, policy or trigger.
- Nothing can delete: no executor, no DELETE grant, and the purge order names the refusal that blocks
  audit and security.
- Nothing diverges a migration.

**Does anything block the merge?** Nothing I found blocks it:

- my two MEDIUM findings (S1, S3) are closed and measured;
- R1 is LOW and may be recorded and owed, for example on `[192]`, rather than fixed in another round;
- R2 and R3 are INFO.

Independently of A1:

- the C0 and Q0 re-checks of this round have not reported here;
- Integration Owner evidence (RFC-2026-025 §5) is still owed, as the disposition says;
- the merge is the Product Owner's act.

## 8. Limits

- Same vendor and model family as the Author (§0).
- I did not run the live database, because no live-layer input changed. The live FK-name equality, the
  catalog counts and C0's partial-index predicates are taken from C0's and Q0's live runs at `1706111`,
  and from the static tests, which passed.
- I did not re-run A0's 39 mutations. I ran my own 43 (§3).
- I re-read only the rows, entries and blockers that the round changed or that my findings touch. I did
  not re-read the whole map.
- I did not judge the Owner-level questions (Q160-a..d, DATA-DEC-03..10) or Route A against Route B on
  their merits.
