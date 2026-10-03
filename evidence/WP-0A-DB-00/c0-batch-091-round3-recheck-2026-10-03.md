# C0 re-check: batch 091's third round (`bae8d91`, handoff `aec5f82`)

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00. A narrow re-check of A0's third-round corrections against my re-verification of the second (`c0-batch-091-corrections-reverify-2026-10-03.md`, G1 to G7) |
| Subject | local branch `draft/wp-db00-091-r3` (not pushed), head `aec5f82` (handoff only) over `bae8d91` (the corrections), over `2aee1a7` (`agent/claude/WP-0A-DB-00-batch-091`, PR #164); base `86f55d2` (main). Author `/claude/a0_atlas` |
| Records under review | `git show bae8d91` (message and diff); `a0-batch-091-integration-2026-09-28.md` §2, §4 and §6; blocker "BATCH 091 (calendar.core)" in `work-packages/WP-0A-DB-00.json` (index 190 of 191), items (a), (f), (h); the handoff at `aec5f82` |
| Governing text | `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md` §3.2, §8.3, §8.5, §10; `docs/plans/core-database-and-rls-workstream-th.md` §4.7 |
| Date | 2026-10-03 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf. It does not approve the schedule states or the zone rule on A5's behalf; both stay A5's.

## §0 What I am

- A subagent of `/claude/a0_atlas`, the Author of the work under review, spawned by a workflow script.
  The brief named the questions; I measured each claim I rely on against the diff and the database,
  not against the brief or A0's numbers.
- The same vendor and model family as the Author. RFC-2026-024 withdrew the cross-vendor condition.
  That does not make me independent of the brief, and it does not make me A5.
- Accepting this file as the role's signature is an act of the Integration Owner and the Product
  Owner, not mine.

## §1 How I measured

"**Measured**" means I ran it and saw the result. "**Read**" means I read the file or record only.

- **Checkout (measured).** `draft/wp-db00-091-r3` lives in another worktree, so I created
  `review/c0-batch-091-r3` at `aec5f82` in my own worktree. This file is the only thing committed there.
  `git log 86f55d2..aec5f82` is `aec5f82 → bae8d91 → 2aee1a7 → 36ae3b4 → 528bb18 → 604e804 → 7fde2ef →
  e8abe33 → fca5674 → 49cec53 → 0a4d485`.
- **Toolchain (measured).** Node v24.20.0; PostgreSQL 17.11 (Homebrew, `/opt/homebrew/bin`).
- **Live database (measured).** A private cluster in `scratchpad/c0-091r3/` on `127.0.0.1:5505` only,
  TCP only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, a
  fresh initdb every round; the shim first, then `make db-migrate-clean`, then `make db-rls-smoke`.
  5432, 5499 and other runs' ports were not touched.
- **Drifts (measured).** Migrate-time drifts were APPENDED to `140_audit.sql` and the file was restored
  from a saved copy after every round and checked by `cmp`. Live drifts were applied to a green round's
  database after migrate-clean, then rls-smoke was re-run. Client probes ran in rolled-back
  transactions as `authenticated` with `request.jwt.claims` set.
- **Branch-name run (measured).** I cloned my worktree into `scratchpad/c0-091r3/clone`, checked out
  `agent/claude/WP-0A-DB-00-batch-091` at `aec5f82` there (a branch name, not detached;
  `git rev-parse --abbrev-ref HEAD` gives the name), and set the clone's `origin/main` and `origin/HEAD`
  to `86f55d2`. This changed only the clone.
- **End state (measured).** The cluster is stopped and its data directory removed; nothing listens on
  `:5505`. The clone is removed. `140_audit.sql` is byte-identical to `main` (sha256
  `2ac596bb950e8dfb…`). `git status` was clean before this file.

### Static checks (measured, on the clone, on the branch name)

| Command | Result |
|---|---|
| `node scripts/verify-branch-scope.mjs 86f55d2 WP-0A-DB-00` | exit 0, "all 25 changed path(s) are declared, and every amendment explains one" |
| `npm run verify` | exit 0, "tests 675, pass 675, fail 0, skipped 0, todo 0" |
| `npm run check:handoff` | exit 0, "describes the branch: nothing substantive after its cited head" |
| `node --test --test-name-pattern="batch 091 case ids" …identity-isolation.test.mjs` | 1 pass, 0 fail |

### Round 0, the clean head (measured)

- `make db-migrate-clean`: exit 0. "47 apply-time blocks, 37 re-run as written, 10 superseded and
  replaced"; 11 self-tested catalog probes; the pinned policy probe still names 5 restrictive policies.
- `make db-rls-smoke`: exit 0, "1058 isolation case(s) passed". After the two controls below, a third
  run on the same database: exit 0.

### Per-table negative controls (measured, CI's `control()` procedure)

| Table with RLS off | Failed case lines | Match placement pattern | Match schedule pattern | Non-case lines matching either |
|---|---|---|---|---|
| `app.calendar_items` | 15 | 15 | 0 | 0 |
| `app.content_schedules` | 21 | 0 | 21 | 0 |

The fifteen include all three approver/viewer placement cases; the twenty-one include
`owner-a-cannot-arm-a-draft-schedule` and the three approver/viewer schedule cases.

### The CI patterns against every family (measured)

A script over `buildCases` and the 56 `control` lines of `ci.yml`: 1058 cases, 1058 unique ids, 68 of
them batch 091. The placement entry matches 30 ids and the schedule entry 38, all batch 091. **No other
entry matches any 091 id**, and **no 091 id matches neither 091 entry**. The old ids
`owner-a-cannot-arm-a-draft` and `owner-a-cannot-backdate-a-deletion` appear nowhere outside `evidence/`.

### Session independence, G2 (measured)

| Round | Result |
|---|---|
| Server `DateStyle='SQL,DMY'`, `TimeZone=Asia/Bangkok`, and `PGDATESTYLE='SQL, DMY'` in make's environment | migrate-clean exit 0; rls-smoke exit 0, 1058 |
| The same with `German` | migrate-clean exit 0; rls-smoke exit 0, 1058 |
| `prerequisites.sql` and all 49 migrations applied by `psql -f` directly, in sessions with `PGTZ=Asia/Bangkok` and `PGDATESTYLE='SQL, DMY'` (make cannot do this: `psql-driver.mjs` and the Makefile pin `PGTZ=UTC`) | all 50 files exit 0, so 091's apply-time block passed under Bangkok × DMY |
| `md5(pg_get_constraintdef)` of the four zone constraints under Bangkok × `SQL, DMY`, UTC × `ISO, MDY` and `German` | identical in all three |
| `provolatile` of `make_timestamp(int,int,int,int,int,float8)` and `timezone(text, timestamp)` | `i`, `i` |

### The zone rule, G1 (measured, on a round-0 database)

| Probe | Result |
|---|---|
| `pg_timezone_names` against the shape | 598 names; 490 admitted; **0 refused inside the ten Areas**; no name in the ten Areas contains a digit or `+` |
| The 108 refused | 44 with no `/` (legacy links such as `GMT`, `Japan`, `Singapore`, and `EST5EDT`, `Factory`); 35 `Etc/*` **including `Etc/UTC`**; 29 legacy country directories (`US/*` 12, `Canada/*` 8, `Brazil/*` 4, `Mexico/*` 3, `Chile/*` 2) |
| Admitted and recognised | `Asia/Bangkok`, `America/Argentina/Buenos_Aires`, `America/Port-au-Prince`, `Europe/Kyiv` and `Europe/Kiev`, `Asia/Saigon`, `Pacific/Kanton`, `Antarctica/Troll` |
| Shape-admitted but refused by `timezone()` (22023) | `Asia/Not_A_Zone`, `Asia/Bangkok/`, `Asia//Bangkok`, `Asia/_`, `Asia/a` |
| Refused by the shape | `UTC+7`, `+07`, `EST`, `XYZ+3` (the four cases), `utc`, `asia/bangkok`, `ASIA/BANGKOK`, `Asia/Bangkok-3`, `Etc/GMT-7`, `Etc/UTC`, `GMT`, `US/Eastern` |
| **Admitted by both CHECKs, not IANA's spelling** | `Asia/BANGKOK` and `Asia/bangkok`: `timezone()` reads names case-insensitively. As `owner_a`, `update … set timezone = 'Asia/BANGKOK'` returned 1 row, stored as typed |
| As `owner_a`: `Etc/UTC`; `America/Argentina/Buenos_Aires` | 23514 `calendar_items_timezone_is_iana`; 1 row |

### Migrate-time drifts (measured; each appended to 140, fresh cluster)

| # | Drift | migrate-clean | rls-smoke | What refused it |
|---|---|---|---|---|
| d1 | Q0 F1's shape: the calendar read policy retyped FOR ALL, WITH CHECK naming owner, admin and approver | exit 2 | exit 2, 5 cases | block item 4 (the write authority) |
| d2 | the schedules read policy retyped FOR ALL, USING unchanged, no WITH CHECK | exit 2 | exit 2, 7 cases (A0: 7) | block item 5, by name |
| d5 | `grant update (status)` on schedules to `app_worker` (Q0 M27) | exit 2 | 0 | block item 6, "a non-client role holds a privilege" |
| d6 | `status` drop not null | exit 2 | 0 | block item 7, "no longer NOT NULL: content_schedules.status" |
| d7 | both `*_timezone_is_iana` dropped | exit 2 | exit 2, exactly the four shape cases | block item 7 |
| d8 | `calendar_items_timezone_is_iana` widened to `Etc` under its own name | exit 2 | 0 | block item 7, by text |
| d9 | `grant update (workspace_id)` on placements to `authenticated` (Q0 M32) | exit 2 | 0 | block item 6 |
| d10 | a second permissive SELECT policy on schedules, `using (true)` | exit 2 | 0 | block item 5's per-command count |
| **d3** | **`grant insert (deleted_at) on app.calendar_items to authenticated`** | **exit 0** | **exit 0, 1058** | **nothing (H1)** |
| **d11** | `grant insert (created_at)` on both tables to `authenticated` | exit 0 | exit 0, 1058 | nothing (H1) |
| **d4** | `calendar_items.timezone` default → `'UTC'` | exit 0 | exit 0, 1058 | nothing (H3) |

### Live drifts and rolled-back probes (measured)

| # | Drift or probe | Result |
|---|---|---|
| L1 | calendar narrowing, WITH CHECK → `true` | exactly `admin-a-cannot-place-an-item-outside-their-remit`, "returned zero rows rather than refusing" (no longer 23505) |
| L2 | schedules narrowing, WITH CHECK → `true` | exactly `admin-a-cannot-schedule-a-target-outside-their-remit`, the same message |
| L3 | Q0's S1 as a live drift: `calendar_items_insert_scheduler` admits the approver | exactly `approver-a-cannot-place-an-item-on-the-calendar` |
| L4 | `content_schedules_update_scheduler` USING admits the viewer | exactly `viewer-a-cannot-cancel-a-schedule` (42501 from the WITH CHECK, read as a failure) |
| P1 | clean database: `owner_a` inserts a placement with `deleted_at = 2001-01-01` | "permission denied for table calendar_items" |
| P2 | d3 live (rolled back): the same insert | `INSERT 0 1`; one placement deleted in 2001 |
| P3 | the client's column grants (information_schema) | placements INSERT: business_profile_id, content_item_id, created_by, display_status, scheduled_local_date, timezone, workspace_id; UPDATE: deleted_at, display_status, scheduled_local_date, timezone, updated_at, updated_by. Schedules INSERT: business_profile_id, content_target_id, created_by, scheduled_for, timezone_snapshot, workspace_id; UPDATE: scheduled_for, status, timezone_snapshot, updated_at, updated_by |
| P4 | column defaults | `calendar_items.timezone` `'Asia/Bangkok'::text`; `content_schedules.timezone_snapshot` none |

## §2 Answers to the brief

### G1. The zone shape against §3.2: is any valid IANA zone now refused?

**Inside the ten geographic Areas, none (measured, 0 of 490).** Outside them the shape refuses 108 names
the server knows. Most are IANA's backward-compatibility links (`US/Eastern`, `GMT`, `Japan`), which
§3.2 does not require. Three groups are worth naming to A5:

- **`Etc/UTC`, a canonical IANA zone**, is refused. Only its alias `UTC` is admitted. A client that
  reports `Etc/UTC` (common on Linux hosts) gets 23514.
- `Etc/GMT±N` is refused on purpose, because of its inverted sign. The comment and blocker (h) say so.
- **Case variants pass both CHECKs** (`Asia/BANGKOK`, `Asia/bangkok`). They mean the same zone in
  every session, so this is not G1's session problem. But the stored text is not IANA's spelling, and a
  byte comparison with `'Asia/Bangkok'` in a later command or report will miss it.

What G1 asked for is done: offsets, POSIX rules and bare abbreviations are refused (d7; the four cases).
I found no admitted spelling whose meaning depends on the session. Blocker (h) gives "490 of 598" and
the allowlist trade-off. It names neither `Etc/UTC` nor the case variants (H2).

### G2. migrate-clean under `PGDATESTYLE='SQL, DMY'` and TimeZone Asia/Bangkok

**Resolved (measured).** Both DMY and German rounds exit 0, and so does rls-smoke. The constraints'
deparse is identical in every session. Make cannot open a Bangkok session, because the driver pins
`PGTZ=UTC`, as A0's `not_done` says. So I applied every file directly under `PGTZ=Asia/Bangkok` and
`SQL, DMY`, and all 50 exit 0. That covers more than A0's re-run of 091's block alone.

### G3. Is the handoff's text true for this head?

**Yes (read, and measured where checkable):**

- "ten numbered checks": items 1 to 10 at `091_calendar.sql:369-562`.
- 68 and 1058; 15 and 21.
- "(a) to (h)", and "Count 191": 191 blockers.
- Floor 2144 → 2152: base `scripts/test-suite-contract.mjs:154` reads 2144.
- "eleven catalog probes": 11 self-test lines.
- PGDATESTYLE DMY and German: measured above.
- The three evidence files in `files_added`.

**The rollback sentence is true (measured by grep).** It says no other migration's SQL references the two
tables: only 091 and 124 do, and 081 and 120 name them in comments alone.

**The commit shape holds (measured).** `aec5f82` changes only the handoff, it is last, and
`check:handoff` is green on the branch name.

### G4 to G7

All resolved:

- **G4 (read).** §2 now says seven.
- **G5 (read).** Blocker (f) says "FOR CLIENT WRITES ONLY". The trigger is unchanged, which is a
  recorded choice.
- **G6 (read).** Blocker (a) now covers the visibility of soft-deleted placements and §10's recovery,
  and adds A1's N3, `scheduled_for` in the past.
- **G7 (measured).** Both ids are renamed, and every 091 case is in exactly one family. My earlier note
  stands: the two catalog cases still count in 30 and 38, which affects no control.

### The CI pattern renames against every other family

**Clean (measured, §1).** No 091 id can satisfy another batch's control. No other batch's id
falls under a 091 pattern. Both directions are held by the static test, which passes.

### Does the commit touch only what it claims?

**Yes (read and measured).** `bae8d91` touches 10 files, and each one is named in its message or the
record's §6. The manifest's only change is blocker 190: (a), (f) and (h).

### Are the record's §4 and §6 and the blocker edits true?

**§4 (read against Q0's file).** It matches Q0's grades: F1 MEDIUM; F2, F3, F4 and F5 LOW; F6 and F7
INFO; no stop-the-line.

**§6 (measured where I could).** Each row reproduces:

- the per-command count, and the FOR ALL retype with 7 cases (d2);
- the shape checks, with exactly the four cases (d7), and 490/598 with none refused in the Areas;
- DMY and German;
- the column and MAINTAIN-family grant checks (d5);
- NOT NULL (d6);
- the scope columns (d9);
- F7: "returned zero rows rather than refusing" (L1, L2);
- 15/21;
- the `-x` map (`caed280→528bb18`, `8b0c123→36ae3b4`, `4a1bb65→2aee1a7`, read from the commit bodies).

One sentence is now weaker than the head (H4).

**The blocker edits (read).** They say what A0 reports. The wording in (h) is accurate, apart from what
H2 adds.

## §3 Findings

Ranked most severe first. 091 and 124 are not integrated, so editing them in place is still allowed.

### H1: LOW (measured). Block item 6 is a list of forbidden grants, so an INSERT grant on `deleted_at` (or `created_at`) passes every layer, and a client can then write a pre-deleted, backdated placement

- **Where.** `091_calendar.sql:454-470`. Item 6 names 17 column/privilege pairs that `authenticated`
  must not hold. `calendar_items.deleted_at INSERT`, and `created_at INSERT` on both tables, are not
  among them.
- **Measured.**
  - d3 and d11 leave migrate-clean and rls-smoke green (1058).
  - With d3 live, `owner_a` inserted a placement with `deleted_at = 2001-01-01` (P2), which the clean
    database refuses (P1).
  - `private.set_deleted_at()` fires on UPDATE only, so nothing re-times that value.
- **Why it matters.**
  - A1 F9 made `deleted_at` "the database's". That holds only while the grant stays absent, and nothing
    asserts the absence.
  - Batch 160's SCHEDULE-HISTORY sweep is told in (f) that it can trust `deleted_at` for client writes.
  - This is the class Q0 F2 and F6 named, closed this round for the columns they listed and not for the
    rest.
  - No exposure today: P1 refuses the insert.
- **Remedy.**
  - Pin the client's column grants exactly: compare the per-table, per-privilege column sets (P3) to a
    literal, so any added grant is refused.
  - Or add `deleted_at`, `created_at` and `updated_at` INSERT to the list.
  - And add a case, `owner-a-cannot-place-an-item-already-deleted`.

### H2: INFO (measured). The shape refuses `Etc/UTC` and admits case variants; neither is on blocker (h)

- **Where.** The `*_timezone_is_iana` constraints, `091_calendar.sql:101-103` and `:154-156`. Blocker (h).
- **What.** See G1.
  - `Etc/UTC` (canonical IANA) is refused, with 23514 for `owner_a`.
  - `Asia/BANGKOK` is stored as typed (1 row).
  - The only positive case re-writes `Asia/Bangkok` over `Asia/Bangkok`. No case covers a
    multi-segment or hyphenated name, though both pass (measured).
- **Remedy.** Name both points on (h) for A5. If A5 keeps the shape:
  - requiring each Location segment to begin with a capital refuses `Asia/bangkok` but not
    `Asia/BANGKOK`, so only an allowlist settles spelling;
  - admitting `Etc/UTC` beside `UTC` is a one-word change.

  Optionally, add a positive case on `America/Argentina/Buenos_Aires` or `America/Port-au-Prince`.

### H3: INFO (measured). The placement zone's default (DEC-UX-06 `Asia/Bangkok`) is pinned by nothing

- **Measured.** d4 (default → `'UTC'`) leaves every layer green. `content_schedules.timezone_snapshot`
  has no default (P4), so only placements are affected.
- **Remedy.** Pin `pg_get_expr(adbin)` for `calendar_items.timezone` in block item 7. Or add a case that
  inserts a placement without a zone and reads back `Asia/Bangkok`. This belongs to the class blocker
  "THE POST-MIGRATE PASS RE-RUNS WHAT THE BLOCKS ASSERT" already records (column defaults are named by no
  block). It is not 091-specific.

### H4: INFO (measured). Q0's S1 is now caught at run time; the record and `not_done` still read as if nothing but review holds it

- **Where.** Record §6, "Not changed: Q0's S1 and S4 … are held by review". A0's `not_done` says no
  test can close them.
- **Measured.** L3 is S1's drift: the approver admitted by `calendar_items_insert_scheduler`, applied
  live, where the block cannot see it. It fails `approver-a-cannot-place-an-item-on-the-calendar`. L4,
  the viewer admitted to the update policy, fails `viewer-a-cannot-cancel-a-schedule`. When Q0 measured
  S1, rls-smoke was green.
- **What remains review-only.** A change that edits 091's policy, its pin and the matching cases
  together.
- **Remedy.** Say this in the record's "Not changed" sentence.

## §4 Verdict

- **Stop-the-line: none.** I found no tenant leak, no secret exposure, no duplicate external side
  effect, no lost job, no migration divergence, no irreversible deletion, and no contract mismatch.
  Every 091 refusal holds on the clean head, under three DateStyles and two TimeZones.
- **Blocks the Owner's merge: nothing I found.** H1 is LOW and has no exposure today. It is cheap to
  close while 091 is unintegrated, and that is the Owner's call.
- **Process preconditions, not findings.** RFC-2026-002 still requires these before any merge:
  - `aec5f82` is not pushed, so PR #164 does not carry it, and no CI run exists for this head;
  - the Integration Owner's evidence (the open blocker on r0) is absent;
  - A5's review stays owed.

## §5 Limits

- **Not measured:**
  - S4 and S1 as same-change edits of 091 itself. The brief confines drifts to 140, so L3 and L4 are
    live equivalents at the case layer.
  - The tzdata-on-restore trade-off in (h). That is A1's inference.
  - The `WST`/Australia un-updatable-row claim in (h). That is A1's measurement, read only.
  - CI on GitHub.
- **Measured by others, read only.** A0's "three witnesses failed under DMY on the first try" is not
  reproducible from the committed tree. What I measured is that the committed witnesses use `to_char`
  and pass under DMY and German.
- **Drift coverage.** One clean head and eleven drifts. A green result here is not proof that no other
  drift survives.
