# Q0 re-check: batch 091's third round (`calendar.core`)

- **Run:** `/claude/q0_sentinel` (this run: Q0 r3, private dir `q0-091r3`, port 5503)
- **Role:** independent Tester. `work-packages/WP-0A-DB-00.json` names `/claude/q0_sentinel` as tester.
- **Subject:** local branch `draft/wp-db00-091-r3` (not pushed): code commit `bae8d91` ("fix(db): batch
  091 -- the second round's findings, acted on") and handoff commit `aec5f82`, over `2aee1a7`
  (`agent/claude/WP-0A-DB-00-batch-091`), base `86f55d2` (`main`). I checked `aec5f82` out into my own
  branch, `test/q0-batch-091-r3`, in my own worktree.
- **Scope:** a NARROW re-check of A0's corrections to my earlier test
  (`q0-batch-091-test-review-2026-10-03.md`, findings F1-F7) and of the record's and blocker's new text.
- **Date:** 2026-10-03.

**This document RECORDS TEST RESULTS AND FINDINGS.** It advances no package status, writes
`test_verified` nowhere, repairs nothing, and approves nothing. Nothing here approves the schedule
states or the zone rule on A5's behalf.

---

## 0. What I am

**I am a subagent of `/claude/a0_atlas`**, the Author of batch 091, spawned by a workflow script A0's
session runs, under a brief A0's script wrote; A0 chose the branch, the port, the cluster recipe and
the minimum list of mutations. **I am the same vendor (Anthropic) and the same model family as the
Author.** RFC-2026-024 is approved and withdrew the cross-vendor condition; what remains is
CONTRIBUTING_AGENTS.md's separation of duties, and I ran under it. **Whether this file is accepted as
the Tester's signature is the Integration Owner's and the Product Owner's act, not mine.**

I re-measured everything I rely on below and took none of A0's numbers on trust. Where I only read
something, it is marked [R].

---

## 1. How I measured

**[M] = measured by me on `aec5f82`; [R] = read, not executed.**

- PostgreSQL 17.11 (`/opt/homebrew/bin`), private cluster on `127.0.0.1:5503` only, TCP only
  (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, `TZ=UTC`,
  **re-initdb every round**; `db/foundation/ci/supabase-shim.sql` first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and
  `make db-rls-smoke`. Node `v24.20.0`, checked by the round script before every round.
- Each drift is **appended to `db/foundation/migrations/140_audit.sql`** for migrate-clean only and the
  file restored byte for byte (`cmp` against a copy saved first) before rls-smoke and on exit.
  `140_audit.sql` is identical to `main` after I finished [M]. The cluster is stopped and its data
  directory removed [M].
- Layers reported separately: **migrate-clean** (apply-time blocks, catalog-rule probes, the
  post-migrate pass that re-runs 091's block after 140), **rls-smoke** (1058 cases), **static**
  (`npm run check`), and **the CI negative control** (RLS off on one table, rls-smoke re-run, each
  failing case id matched against the two 091 patterns).

### Baseline [M]

| Check | Result |
|---|---|
| `npm run check` | exit 0; 675 tests, 675 pass, 0 skipped |
| `make db-migrate-clean` | exit 0; "post-migrate pass: 47 apply-time blocks, 37 re-run as written, 10 superseded and replaced" |
| `make db-rls-smoke` | exit 0; 1058 cases passed |
| `make db-rls-smoke` again, same database | exit 0; 1058 |
| `091-calendar-fixture.sql` applied again by hand | `INSERT 0 0` four times; `calendar_items` 5 rows (3 live), `content_schedules` 8, unchanged. The fixture writes only those two tables (its only DML statements) |
| Full round under `PGDATESTYLE='SQL, DMY'` (+ re-run) and under `German` | all exit 0, 1058 each |
| **Control for the row above:** `2aee1a7`'s 091 put in place, `PGDATESTYLE='SQL, DMY'` | migrate-clean **RED** (`calendar_items_timezone_known, content_schedules_timezone_known` not in their text): the variable does reach the sessions, so the green row means something |

---

## 2. The CI negative control, per table, per case [M]

| Table with RLS off | rls-smoke | Failed | Match placement pattern | Match schedule pattern |
|---|---|---|---|---|
| `app.calendar_items` | exit 2, `FAILED — 15 of 1058` | 15 | **15** | 0 |
| `app.content_schedules` | exit 2, `FAILED — 21 of 1058` | 21 | 0 | **21** |

- Every failing id was matched individually: the renamed `owner-a-cannot-arm-a-draft-schedule` is now
  one of the 21, and the six F1 cases split 3 / 3 as claimed.
- No non-case line of the green log or either control log contains `calendar`, `placement`,
  `place-an-item` or `schedule`.
- `admin-a-cannot-place-an-item-outside-their-remit` and `admin-a-cannot-schedule-a-target-outside-their-remit`
  fail under the controls as "the database returned zero rows rather than refusing", not 23505.
  **Two other cases still fail by 23505 under the calendar control**: `owner-a-cannot-place-an-item-of-tenant-b`
  and `owner-a-cannot-undelete-a-placement` (G3 below).
- A0's 15 / 21, the ci.yml comment and the handoff's criterion text match these numbers.

---

## 3. Mutations re-run (the brief's FOCUS) [M]

Every row is its own re-initdb'd round. "RED" names the first failing layer's message.

| # | Mutation (appended after 140) | migrate-clean | rls-smoke | Earlier (r2) | Now |
|---|---|---|---|---|---|
| M08b | placements' SELECT policy retyped FOR ALL, approver admitted | **RED**: "permissive policy(ies) not in their command and exact text: calendar_items_select_active_member" | **RED** (3: `approver-a-cannot-place-an-item-on-the-calendar` "permitted"; approver/viewer move) | SURVIVED (F1) | **caught twice** |
| M07b | schedules' SELECT policy retyped FOR ALL, viewer admitted | **RED** (same, `content_schedules_select_active_member`) | **RED** (3: `viewer-a-cannot-schedule-a-target` "permitted"; approver/viewer cancel) | SURVIVED (F1) | **caught twice** |
| X6 | A0's §6 drift: placements' read policy FOR ALL, USING unchanged, no WITH CHECK | RED (block item 5) | RED (**7**, as A0 says) | — | caught |
| M27 | `grant update (status)` on schedules to app_worker | **RED** "a non-client role holds a privilege … app_worker on content_schedules" | GREEN | SURVIVED (F2) | caught |
| M28 | column SELECT on placements to app_worker | **RED** (same, calendar_items) | GREEN | SURVIVED (F2) | caught |
| M35 | `grant trigger, references` on schedules to app_worker | **RED** | GREEN | SURVIVED (F2) | caught |
| M38 | `grant maintain` on placements to app_worker (PG17) | **RED** | GREEN | — | caught |
| M40 | column `references (id)` on schedules to app_worker | **RED** | GREEN | — | caught |
| N1 | `content_schedules.workspace_id` drop not null | **RED** "column(s) no longer NOT NULL: content_schedules.workspace_id" | GREEN | SURVIVED (F5) | caught |
| N2 | `content_schedules.status` drop not null | **RED** (names the column) | GREEN | SURVIVED (F5) | caught |
| N3 | `calendar_items.content_item_id`, `scheduled_local_date` drop not null | **RED** (names both) | GREEN | SURVIVED (F5) | caught |
| N5 | `calendar_items.timezone` drop not null | **RED** | GREEN | — | caught |
| M29 | `calendar_items_display_status_not_blank` dropped | **RED** (names it) | GREEN | SURVIVED (F5) | caught |
| M30 | `content_schedules_version_positive` dropped | **RED** (names it) | GREEN | SURVIVED (F5) | caught |
| M32 | `grant update (workspace_id, business_profile_id)` on schedules to authenticated | **RED** (names both columns) | GREEN | survived (F6) | caught |
| M39 | `grant update (created_by)` on placements to authenticated | **RED** at the closure coverage probe ("no pinned UPDATE closure: app.calendar_items.created_by") | GREEN | — | caught |
| M17 | placements narrowing WITH CHECK gutted | RED (pinned policy probe) | RED (1: the out-of-remit place, **"returned zero rows rather than refusing"**) | by 23505 (F7) | **by the write** |
| R2 | schedules narrowing WITH CHECK gutted | RED (pinned policy probe) | RED (1: the out-of-remit schedule, same message) | by 23505 (F7) | **by the admitted statement** |
| Z1 | both `*_timezone_is_iana` dropped | RED (block item 7) | RED (exactly the four shape cases) | — | caught |
| Z2 | both `*_timezone_known` dropped | RED (block item 7) | RED (exactly the two unknown-zone cases) | — | caught |
| Z3 | placements' shape widened to admit `Etc/…` | RED (block item 7) | GREEN | — | caught |

### Fresh mutations in F1's class: a policy recast to another command under its own name

| # | Mutation | migrate-clean | rls-smoke | Verdict |
|---|---|---|---|---|
| **X1** | `content_schedules_update_scheduler` (permissive) recast **FOR ALL**, both texts unchanged | **RED** (block item 5: command and text) | GREEN | caught by mc |
| **X2** | `calendar_items_updated_by_on_update_is_caller` (restrictive) recast **FOR DELETE** `using (true)` | **RED** (updated_by update closure probe: "not in their pinned shape (restrictive, UPDATE …)") | GREEN | caught by mc |
| X3 | `content_schedules_service_path_closed` recast **FOR SELECT**, same text and roles | **GREEN** | RED (1: `batch-091-closes-the-service-path-on-schedules`) | caught by its catalog case only (G4) |
| X4 | `content_schedules_updated_by_on_update_is_caller` recast **FOR INSERT** `with check (true)` | **RED** (updated_by closure probe) | GREEN | caught by mc |
| X5 | placements' read policy recast FOR ALL with the INSERT policy's own WITH CHECK (owner/admin token present) | **RED** (block item 5) | RED (3 move cases, as 42501, see G2) | caught |

Block item 5 now pins every permissive policy by name, command and both texts, and counts one per
table per command; the restrictive set is held by block item 2 (by name) plus `PINNED_POLICIES`, the
updated_by closure probe and the service-path catalog cases (by command). **No retype I tried passes
every layer.**

### The rest of my r2 table, re-run on this head (no regression) [M]

M01, M02, M03 (now 3 cases each: the approver/viewer cases added), M04, M05, M06, R5 (RED, mc), M07,
M08, M36 (RED, both layers), **M09 now RED** (block item 5 pins the read policy's text), M10, M11, M12,
M13, M16, R1, R3, R4, M18-M26, M25b, M31, M34 (RED as before), M14, M15 (rls-smoke catalog
case only, as before), N4 (status default `'armed'`: mc GREEN, rls-smoke RED, 7 cases, as before).
M33 (an index) and M37 (both `*_timezone_not_blank` dropped) still pass every layer, and as before
neither loses a guarantee (`timezone()` refuses blanks, and the shape refuses them too).

R3 (placements narrowing USING gutted) still fails both read cases, including
`editor-a-cannot-see-the-placement-outside-their-remit`, which now reads the soft-deleted
`calendar_item_a2`: soft-deleting it did not blind that case.

### In-file: S1 re-run [M]

S1 (inside 091: `calendar_items_insert_scheduler` admits the approver, block item 5's pin updated to
match): static **GREEN** (675/675), migrate-clean **GREEN**, rls-smoke **RED, 1 case**,
`approver-a-cannot-place-an-item-on-the-calendar` ("1 row(s) came back. The operation was
permitted."). **The case gap behind S1 is closed.** What A0 lists as not done stays true: a
same-change edit of 091 that removes an assertion from its own block (S4's class) is held by review,
not by a test; I did not re-run S4. The file was restored with `git checkout --`, `git status` clean.

---

## 4. The zone rule [M]

Measured on the migrated database (`psql` as postgres):

- Of 598 `pg_timezone_names`, the shape admits **490** and refuses **0** of those in the ten Areas
  (A0's numbers, reproduced).
- Refused by the shape: `UTC+7`, `+07`, `7`, `EST`, `WST`, `XYZ+3`, `EST5EDT`, `Asia/Bangkok-3`,
  `Etc/GMT-7`, `Etc/UTC`, `US/Eastern`, `GMT`, `Zulu`, `Factory`, `ASIA/Bangkok`, `asia/bangkok`,
  `Asia/Bangkok/`, `Asia//Bangkok`, `Asia/Bangkok ` (trailing space).
- Admitted by the shape and refused by `timezone()` (22023): `Asia/Not_A_Zone`, `Asia/x`, `Europe/A-B`,
  `Asia/Bangkok_`, `Asia/posixrules`, `America/posixrules`.
- `WST` under `timezone_abbreviations = 'Australia'` is a known zone to `timezone()`; the shape refuses
  it regardless (A0's claim, reproduced).
- **Admitted by both CHECKs and NOT in `pg_timezone_names`: `Asia/BANGKOK` and `Asia/bangkok`.**
  PostgreSQL's zone lookup is case-insensitive, and the shape constrains only the Area's case.
  `update app.calendar_items set timezone = 'Asia/BANGKOK' …` succeeded as postgres (rolled back). (G1)
- The md5 of the six zone constraints' deparse is identical (`4903b646…`) in all eight sessions of
  TimeZone {UTC, Asia/Bangkok} × DateStyle {ISO MDY, SQL DMY, German, Postgres DMY}.

---

## 5. Does each commit touch only what it claims? Is the handoff alone and last? [M]

- `bae8d91` changes ten files: `091_calendar.sql`, `isolation-cases.mjs`, the 091 fixture,
  `fixture-catalog.json` (calendar_item_a2's role text only), `identity-isolation.test.mjs` (pins 30/38,
  the 68-case exactly-one-pattern hold), `scripts/test-suite-contract.mjs` (floor 2150 → 2152),
  `test-kits/integrity-manifest.json` (three digests: ci.yml, the floor file, the test file),
  `.github/workflows/ci.yml` (**the comment only**; both `control` lines unchanged), the record, and
  `work-packages/WP-0A-DB-00.json` (**blocker 191's text only**, one line). Each is named in A0's
  done list and the commit body. `scripts/db/run.mjs` (`PINNED_POLICIES`) and 124 are untouched, as
  A0 says. ci.yml, the floor and the manifest are protected paths; the handoff already names the CI
  touch for the Owner.
- `aec5f82` changes `handoffs/WP-0A-DB-00-author-handoff.json` alone, is the branch tip, and its parent is
  `bae8d91`, the head it cites. Its `files_added` / `files_modified` equal `git diff --name-status
  86f55d2 bae8d91` exactly (11 added, 14 modified, none deleted). Its text fields (ten numbered
  checks, 68 / 1058 cases, 15 / 21, (a)-(h), the floor 2144 → 2152) match what I measured, except the
  floor history I did not trace before 2150.
- **Not measured: `npm run check:handoff` and the branch-identity guard on the branch name.** On
  `test/q0-batch-091-r3`, `refresh-author-handoff.mjs --check` exits 75 ("No work package declares
  ownership.branch"), and the `handoff-conformance` test returns early for an unclaimed branch; the
  branch `agent/claude/WP-0A-DB-00-batch-091` is checked out in the main checkout. I checked by hand
  what that guard compares (cited head = HEAD^ = `bae8d91`, so no drift). A0's run on the branch name
  in a temporary clone is [R].
- Cherry-pick map in the record's §6, read from each commit's `-x` line: `caed280` → `528bb18`,
  `8b0c123` → `36ae3b4`, `4a1bb65` → `2aee1a7` [M].

## 6. Are the record's §4/§6 and the blocker edits true?

- **§4 (summary of my r2 test):** a fair summary of `q0-batch-091-test-review-2026-10-03.md`: the
  verdict, the reproduced figures, the survivors (F1 MEDIUM; F2, F5 LOW; F6 INFO), F4, F7, S1/S4 [M by
  comparison with my file].
- **§6, row by row:** every "Measured" cell I could reproduce, I did, with the same counts and messages:
  M08b 3 / M07b 3 / the new drift 7; Z1 four cases, Z2 two; 490 of 598; DMY and German exit 0; the
  eight-session md5; M27, M28, M35, MAINTAIN; N1-N3, M29, M30; M32; `update (created_by)` at the
  closure coverage probe; F7's "returned zero rows rather than refusing" on both tables; 15 / 21 with
  no cross-matches; 47 blocks; 1058 twice; 675 tests. **One sentence is incomplete:** F7's row says
  "Neither reads 23505 any more" and "Under the RLS-off controls both fail the same way" -- true of the
  two out-of-remit inserts it names; my F7 also named `owner-a-cannot-place-an-item-of-tenant-b`, which
  still fails by 23505 under the calendar control, and the row and A0's not-done list are silent on it
  (G3).
- **Blocker 191:** (a) adds C0 G6 (soft-deleted placements visible to every active member; §10's 30-day
  recovery refused to clients) and A1 N3 (`scheduled_for` in the past): I measured, as postgres, a
  schedule's `scheduled_for` set to 1900 with nothing refusing it. (f) now says `deleted_at` is
  trustworthy for client writes only: I measured, as postgres, `calendar_item_a2`'s `deleted_at`
  re-timed from 2026-09-21 to 2000-01-01, accepted. (h)'s 490 of 598 is reproduced; its restore half is
  inference, as it says. The note in (a) that `editor-a-cannot-see-the-placement-outside-their-remit`
  now reads a deleted row is true (the fixture) and still detects (R3 above).

---

## 7. Findings

None reachable by a client on this head. F1-F7 of my r2 test are resolved as A0 claims, except where
G3 says otherwise.

### G1: LOW (A5's to decide). Case variants of a zone are admitted and stored [M]

- **Where:** `091_calendar.sql`, `calendar_items_timezone_is_iana` and `content_schedules_timezone_is_iana`
  (the shape fixes the Area's case only), with `*_timezone_known` (PostgreSQL's lookup is case-insensitive).
- **Failure:** `Asia/BANGKOK` and `Asia/bangkok` pass both CHECKs and are stored as written; neither is
  a `pg_timezone_names` name. A consumer that resolves names case-sensitively (a tz database on a
  case-sensitive filesystem, a string comparison with the workspace default) can reject or mismatch
  it. The "490 admitted, none refused" figure is about canonical names and does not show this.
- **Remedy:** part of the choice already left to A5 on blocker 191 (h): a pinned allowlist removes it;
  keeping shape + `timezone()` would want a note on (h) that case variants are admitted, or a canonical
  form enforced by the command path.

### G2: INFO. Under a read-policy retype, the move/cancel cases fail by over-refusal, not admission [M]

- Under M08b, M07b and X5 the approver/viewer/editor move and cancel cases fail as "expected an empty
  read, got denied (42501)": the retyped policy turns a filtered UPDATE into an RLS error. The cases
  that see the guarantee lost are the place/schedule ones ("1 row(s) came back. The operation was
  permitted."), and block item 5 is the first layer. Nothing to fix; recorded so a reader does not take
  six failures as six detections of the same loss.

### G3: INFO. Two calendar cases still detect the RLS-off control by 23505 [M]

- `owner-a-cannot-place-an-item-of-tenant-b` ("the database raised 23505, which is not an RLS refusal")
  and `owner-a-cannot-undelete-a-placement` ("got errored (23505)") still fail under the calendar
  control through the one-active index, not as admitted writes. Detection holds. My r2 F7 named the
  first in passing; the record's §6 F7 row and A0's not-done list do not mention it.
- **Remedy:** either aim the tenant-B case at an item with no live placement, or say in §6 that it
  still detects by collision.

### G4: INFO (carried). The service-path closures are pinned by rls-smoke catalog cases only [M]

- X3 (closure recast FOR SELECT), M14 and M15 pass migrate-clean and are caught by
  `batch-091-closes-the-service-path-on-*` alone. No grant reaches a service role (block item 6 now
  sees every grant shape), so nothing is reachable. Not a change from r2; recorded because the brief
  asked for the F1 class and this is the one retype migrate-clean does not see.

## 8. Stop-the-line verdict

**No stop-the-line.** No tenant leak, secret exposure, duplicate side effect, lost job, migration
divergence or client path to a forbidden write on `aec5f82`. My r2 F1 (MEDIUM) is fixed and measured
caught twice (block item 5 and the new cases); F2, F5, F6 and F7 are caught by migrate-clean or by the
write itself; F3's counts and patterns hold; F4's offsets, abbreviations and POSIX rules are refused.
**Nothing here blocks the Owner's merge.** G1 is A5's, on an item already open for A5; G2-G4 are
informational. The Owner presses the merge; this file does not.

## 9. Limits

- Not measured on the branch name (§5): the handoff guard and `check:handoff` skip or refuse on my
  branch, and the named branch is checked out elsewhere.
- The CI negative control was re-run on the clean head only, not under each mutation. Static was
  re-run for S1 only; appended drifts change no file the static suite pins except `140_audit.sql`,
  restored before each rls-smoke.
- I did not re-run S2-S5, concurrency on the unique indexes, ON CONFLICT DO UPDATE / MERGE paths, or a
  `pg_dump`/restore across tzdata versions (blocker 191 (h)'s restore half stays inference).
- G5 and N3 were measured as postgres (constraint and trigger layer), not through a future command role.
- A database that applied the earlier fixture keeps `calendar_item_a2` live (`on conflict (id) do
  nothing`); every CI and private cluster is fresh, so this only matters for a reused database.
- I did not run CI, push, or open a PR. The schedule states, §8.3's editor `P` and the zone allowlist
  are A5's.

## 10. Reproducing this

Private scripts (not committed) under the session scratchpad's `q0-091r3/`: `round.sh <label> <drift|->
[rerun|control:<table>|keep]`, `batch.sh`, `summ.mjs`, `controls.sh`, `run1.sh` / `run2.sh` (the
mutation batches), `drifts/*.sql` and `drifts-r3.txt` (X1-X6, Z1-Z3, M38-M40, N5), `runS1.sh` /
`applyS1.mjs`, `runDS.sh` / `runDSold.sh` (DateStyle and its control), `zone.sql`, `ds.sql`, `g5.sql`.
Each drift's effect is described in its row above.
