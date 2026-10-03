# A1 Security/Privacy re-check: batch 091's third round (`bae8d91`, handoff `aec5f82`)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: local branch `draft/wp-db00-091-r3` (not pushed), code commit `bae8d91` ("fix(db): batch 091 --
the second round's findings, acted on"), handoff commit `aec5f82`, over `2aee1a7` (the tip of
`agent/claude/WP-0A-DB-00-batch-091`) and base `86f55d2` (`main`). I checked `aec5f82` out in my own
worktree as the local branch `review/a1-batch-091-r3`. `git merge-base --is-ancestor 86f55d2 aec5f82`
holds, and `git diff bae8d91 aec5f82` touches only `handoffs/WP-0A-DB-00-author-handoff.json`.
Author: `/claude/a0_atlas`
Date: 2026-10-03
Scope: NARROW. Whether the third round closes what Q0 (F1-F7), C0 (G1-G7) and my previous re-check
(`a1-batch-091-corrections-reverify-2026-10-03.md`, N1-N3) found, centred on N1 (the zone), and whether it
opens anything new. It is not a fresh review of batch 091.
Standing-in note: by the Owner's choice (ค), C0, Q0 and A1 review this batch in place of A5 (Calendar's
owner, `/root/a5_loom`). **I do not approve the schedule states, or the zone rule, on A5's behalf.**
Blocker 191 (a) and (h) still record A5's review as owed.

**This document records findings. It advances no package status, signs nothing on anyone's behalf,
writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the Product
Owner's disposition, not the disposition.

---

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author of the change under review. I ran in a worktree of
A0's repository, under a brief A0's workflow wrote, and I am the same vendor and model family as A0.
RFC-2026-024 withdrew the cross-vendor condition, so that fact does not by itself disqualify this
review. It does mean the Author chose what to point me at. **Whether this re-check is accepted as the
Security/Privacy role's signature is for the Integration Owner (`/claude/r0_steward`) and the Product
Owner to decide.** Neither A0 nor I can decide it.

## 1. How I measured, and what is measured [M] versus read [R]

**Environment [M].** PostgreSQL 17.11 from `/opt/homebrew/bin`, a private cluster on 127.0.0.1:5501, TCP
only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres` afresh for every round
(server encoding SQL_ASCII), `LC_ALL=C`, the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make db-migrate-clean` and
`make db-rls-smoke`. Node 24.20.0. Each drift was APPENDED to `db/foundation/migrations/140_audit.sql`
from a saved copy and the file restored byte for byte after the round (`cmp` after every round; at the end
it is identical to the saved copy and to `main`). Scratch files lived only in my private directory. The
cluster was stopped and its data directory removed at the end. No other port was touched.

**Baseline on `aec5f82` [M].** `db-migrate-clean` exit 0 (47 apply-time blocks, 37 re-run as written, 10
superseded and replaced); `db-rls-smoke` exit 0, **1058** cases. `npm run check` exit 0, **675** tests (run
on the branch name `review/a1-batch-091-r3`; see §5 for what that does not cover).

## 2. The focus questions

### Q1. N1: can a stored zone still change meaning by session, or make a row un-updatable?

**No path found [M].**

- **Session matrix (48 sessions).** For `timezone_abbreviations` in {Default, Australia, India} (the three
  installed full sets) × `DateStyle` in {ISO MDY, SQL DMY, German, Postgres YMD} × `TimeZone` in {UTC,
  Asia/Bangkok, America/New_York, the POSIX 'UTC+7'}, set through `PGOPTIONS` and confirmed with `SHOW`:
  091's apply-time block (extracted verbatim, all ten items) exits 0 in all 48; an UPDATE of every
  placement's zone to 'Asia/Bangkok', of one to 'UTC', and a no-op UPDATE of every schedule's
  `timezone_snapshot` all succeed in all 48 (no row becomes un-updatable); the md5 of the deparse of all
  CHECK constraints on both tables is identical in all 48; and `timezone(z, make_timestamp(2026,10,5,9,0,0))`
  for Asia/Bangkok, UTC, Asia/BANGKOK, Australia/Sydney and America/Argentina/Buenos_Aires gives the
  same instants in all 48.
- **Why that holds [M]+[R].** Every value the shape admits contains a '/' or is exactly 'UTC'. None of
  the 486 abbreviation entries in the installed `timezonesets` files contains a '/' [M], and 'UTC' is 0
  in every set. So no admitted value is resolved through `timezone_abbreviations`. (The header's
  sentence "a name with a '/' is never read as an abbreviation" is true of every shipped set; whether a
  custom set file installed on the server could define one is not measured: R5, INFO.)
- **Full rounds under DateStyle [M].** `PGDATESTYLE='SQL, DMY'` and `PGDATESTYLE=German`: migrate-clean
  exit 0, rls-smoke exit 0, 1058 each. The driver passes the environment through and overrides only
  `PGTZ`, `TZ`, `LC_ALL` and `PGOPTIONS` (`scripts/db/psql-driver.mjs:156`, :398 [R]), so A0's statement
  that PGTZ=Asia/Bangkok cannot be measured through `make` is accurate.
- **The remaining way a stored name becomes un-updatable** is tzdata changing under it (restore onto a
  server that lacks the name). That is blocker 191 (h)'s, recorded as A5's choice; not re-measured.

### Q2. Are offsets and POSIX rules refused? Can the shape CHECK be bypassed?

Each value below was written by an UPDATE of a fixture placement's `timezone` (CHECKs bind every role,
postgres included); the schedule column was spot-checked with ten of them and behaved identically [M].

| Refused, 23514 `*_timezone_is_iana` | Refused otherwise | Accepted |
|---|---|---|
| 'utc', 'Etc/UTC', 'UTC+7', '+07', '7', 'Etc/GMT-7', 'EST', 'ICT', 'XYZ+3', 'EST5EDT', 'asia/bangkok', ' Asia/Bangkok', 'Asia/Bangkok ', 'Asia/Bangkok\n', 'Asia/Bangkok\nX', 'Asia/\tBangkok', 'Asia//Bangkok', 'Asia/Bangkok/', 'Asia/../Asia/Bangkok', 'Asia', 'posixrules', 'localtime', 'Factory'; UTF-8 lookalikes (Cyrillic а, fullwidth solidus, NBSP, zero-width space); 'Asia/' + 'A-'×30000 + '1' (0 ms) | 'Asia/X-Y' and 'Asia/Not_A_Zone': 22023 from `timezone()`. 'Asia/'+60×'A' and a 1 MB string: 23514 `*_timezone_known` (length), 1 ms | 'Asia/Bangkok', 'UTC', 'America/Argentina/Buenos_Aires', 'America/Port-au-Prince', 'Asia/Calcutta' (an IANA link), **'Asia/bangkok', 'Asia/BANGKOK'** |

- **Unicode under a UTF-8 database [M].** In a separate UTF8 database on the same cluster, the shape regex
  rejected twelve lookalike spellings (Cyrillic а and А, fullwidth solidus and A, NBSP, ZWSP, Kelvin
  sign K, é, long s, dotless i, a combining accent) under the C, libc `en_US.UTF-8` and ICU `und-x-icu`
  collations alike. The regex ranges are by code point, not collation.
- **No ReDoS [M].** The nested quantifier is evaluated by PostgreSQL's automaton-based engine; the 60 000-
  character adversarial input took 0 ms.
- **Count [M].** Of PostgreSQL 17.11's 598 `pg_timezone_names`, 490 pass the shape, as blocker 191 (h)
  says, and no name in the ten Areas is refused by it.
- **What the shape does not hold: the case of the Location [M].** 'Asia/BANGKOK' and 'Asia/bangkok' are
  stored as written; PostgreSQL resolves them case-insensitively to Asia/Bangkok, so the instant is right
  in the database. See **R2**.

### Q3. Do the per-command pins and the privilege checks close the paths Q0 found?

Each row is a fresh cluster with one drift appended to `140_audit.sql` [M].

| Drift | Result | Caught by |
|---|---|---|
| e01/e02: Q0 F1's shape -- each read policy dropped and recreated FOR ALL under its own name, USING unchanged, WITH CHECK `is_active_member(...) OR role in ('owner','admin')` (passes items 3 and 4) | migrate-clean RED | item 5, "not in their command and exact text: calendar_items_select_active_member" (resp. content_schedules_...) |
| the same two drifts applied live after a clean migrate, then rls-smoke alone | rls-smoke RED, 7 of 1058 each | placements: editor/viewer/approver-cannot-place, editor/approver/viewer-cannot-move, owner-cannot-place-naming-another-creator; schedules: editor/approver/viewer-cannot-schedule, -cancel, owner-...-naming-another-creator. **All six of A0's new cases go red.** |
| d01/d02: FOR ALL retype with a wider WITH CHECK | RED | item 4 |
| e03: read USING set to `true` | RED | item 5 |
| d03: an extra permissive FOR DELETE policy | RED | item 5's per-command count |
| d20: read policy altered TO public | RED | item 3 |
| d04 column SELECT, d05 REFERENCES, d06 TRIGGER to app_worker (Q0 F2) | RED | item 6, "a non-client role holds a privilege" |
| d19 `grant select ... to public`; d21 column SELECT to anon | RED | item 6 (every non-client role named) |
| d12 `grant update (workspace_id)` to authenticated (Q0 F6) | RED | item 6, "calendar_items.workspace_id UPDATE" |
| d22 `grant insert (status)` on schedules to authenticated | RED | item 6 |
| d13 status, d23 workspace_id: DROP NOT NULL (Q0 F5) | RED | item 7, "no longer NOT NULL" |
| d14 drop display_status_not_blank (Q0 F5) | RED | item 7 |
| d15 is_iana loosened, d16 dropped, d24 recreated NOT VALID | RED | item 7, "missing, unvalidated or not in their required text" |
| **d07 `grant truncate` to authenticated** | **GREEN, 1058 pass** | nothing: **R1** |
| **d08 TRIGGER, d09 REFERENCES, d10 MAINTAIN to authenticated** | **GREEN, 1058 pass** | nothing: **R1** |
| **d17 `grant update (created_at)` on schedules, d18 `grant insert (deleted_at)` on placements, to authenticated** | **GREEN, 1058 pass** | nothing: **R3** |
| d11 `grant all` to service_role | GREEN | nothing: **R4** (repo-wide convention) |

So every path Q0 named is closed, at the apply-time layer and (for F1) at the live-case layer as well.
What remains open is the authenticated role's table-level privileges other than DELETE, and its column
privileges outside the enumerated deny-list.

### Q4. Anything new opened?

- **The fixture change [M]+[R].** `calendar_item_a2` is now soft-deleted. Only one case reads it
  (`editor-a-cannot-see-the-placement-outside-their-remit`, a SELECT); the read policy does not filter
  deleted rows, so the narrowing still decides it, and the case is among the 15 that fail when RLS is
  off on calendar_items. No UPDATE case aims at it, so none is now refused by `calendar_items_deleted_is_final`
  in place of the narrowing.
- **The negative control [M].** RLS off on `app.calendar_items`: 15 of 1058 fail, 15 match the placement
  pattern, 0 the schedule pattern, 0 neither. Off on `app.content_schedules`: 21 fail, 21 schedule, 0
  placement, 0 neither. Re-enabled: 1058 pass. The suite has 1058 cases, 68 of them batch 091's, 30
  matching the placement pattern and 38 the schedule pattern, none both and none neither (counted from
  `buildCases`).
- **The six zone cases [R]+[M].** Four expect 23514 from the shape constraint, two 22023 from
  `timezone()`, one is positive. All pass at the head; d15/d16 show the shape constraint cannot be removed
  with the block green.
- Nothing else new found.

### Q5. Does the commit touch only what it claims; is the handoff alone and last; are §4, §6 and the blocker edits true?

- **`bae8d91` [M].** Ten files: `ci.yml` (comment lines only; both 091 control lines unchanged),
  `091_calendar.sql`, `fixture-catalog.json` (one role string), the record, `test-suite-contract.mjs` (floor
  2150 → 2152), `integrity-manifest.json` (three digests), the fixture, `identity-isolation.test.mjs` (the
  pins 30/38 and the converse test), `isolation-cases.mjs`, `WP-0A-DB-00.json` (blocker 191 only). That is
  what the record's §6 and A0's report say.
- **`aec5f82` [M].** One file, the handoff, and it is the last commit. Its `base_revision` 86f55d2 and
  `head_revision_or_patch_checksum` bae8d91 are on the branch; its `files_added` and `files_modified`
  equal `git diff --name-status 86f55d2 bae8d91` exactly (no file missing, none extra, none deleted). Its
  figures hold: ten numbered block items; 68/1058 cases; 15/21; floor 2144 (on `86f55d2`) → 2152; rls-smoke
  and migrate-clean exit 0 under PGDATESTYLE SQL DMY and German. Its rollback sentence is true as far as I
  can read: no other migration's SQL references either table outside comments (081, 120), and
  `scripts/db/run.mjs` names them in its probe pins, which a revert removes with them.
- **The handoff's "Zones are IANA-shaped and recognised"** is true of shape and recognition; it is not
  true that every stored value is an IANA name (R2).
- **The record's §4 [R].** A fair summary of Q0's file (grades, M/N ids, 1047 cases on `604e804`).
- **The record's §6 [M] where I re-measured:** F1 (both layers), F2, F5, F6, F3's counts, and the DateStyle
  rounds are as stated. The cherry-pick map is true: the `-x` lines on 528bb18, 36ae3b4 and 2aee1a7 name
  caed280, 8b0c123 and 4a1bb65. **Not re-measured:** the F7 rows (gutted WITH CHECK failing "as returned zero
  rows rather than refusing") and Q0's own drift ids as A0 replayed them; I used my own drifts.
- **Blocker 191 [R].** (a) now carries C0 G6 (visibility of soft-deleted placements under §8.5, §10's 30-day
  recovery) and my N3 (`scheduled_for` in the past); (f) says deleted_at is trustworthy for client writes
  only (C0 G5); (h) records the zone rule, the 490/598 figure (measured true), and the allowlist-versus-
  shape choice with the restore trade-off, labelled unmeasured. True as written, except that (h)'s "admits
  any name in those Areas that the server's tzdata knows" omits the case variants (R2).

## 3. Findings

### R1: LOW (new). authenticated's TRUNCATE, TRIGGER, REFERENCES and MAINTAIN are asserted by nothing

- **Where [R].** Block item 6 checks the five non-client roles for every table and column privilege, but
  checks `authenticated` only for DELETE (`091_calendar.sql:487-491`) and for an enumerated list of column
  privileges. No other batch, probe or case checks `authenticated` for TRUNCATE (grep over
  `db/foundation/migrations` and `scripts/db` [R]).
- **Measured [M].** d07 (`grant truncate on app.calendar_items to authenticated`): migrate-clean exit 0,
  rls-smoke 1058 pass. On that database, a session `SET ROLE authenticated` with no JWT claims at all ran
  `TRUNCATE app.calendar_items` and removed all 5 rows of both tenants (inside a transaction I rolled
  back). TRUNCATE is not subject to row level security. d08-d10 (TRIGGER, REFERENCES, MAINTAIN) are
  green as well; `authenticated` holds CREATE on no schema [M], so TRIGGER and REFERENCES are hard to use
  today, while MAINTAIN gives `LOCK TABLE` (a cross-tenant denial of service).
- **Why LOW.** Nothing is live: no such grant exists. It is the same class as Q0 F2 (a grant a later
  migration could add with every layer green), which Q0 graded LOW. The consequence if it happened is
  cross-tenant irreversible deletion, which is a stop-the-line class, so it is worth the one line.
- **Remedy.** In item 6, add `has_table_privilege('authenticated', t, 'TRUNCATE, REFERENCES, TRIGGER'` [+
  `, MAINTAIN` on 17+]`)`, or better, R3's allow-list. The general version, every RLS table in `app`, is a
  central probe's job and belongs with blocker 186's hardening batch.

### R2: LOW (new; A5's to decide). The shape admits case variants of IANA names

- **Measured [M].** 'Asia/BANGKOK' and 'Asia/bangkok' pass both CHECKs and are stored as written, on both
  columns. PostgreSQL and Node's `Intl` resolve them to Asia/Bangkok, so the instant is right in both
  [M]. A consumer whose tz database is case-sensitive (zoneinfo files on a case-sensitive filesystem, for
  example) may not resolve them; equality or grouping by the stored string also splits one zone into
  several. I did not measure a case-sensitive consumer (macOS's filesystem is case-insensitive).
- **Not a session-meaning problem.** The value means the same in every session (Q1).
- **Remedy (A5's choice, already framed in blocker 191 (h)).** The pinned allowlist resolves it outright.
  Under shape + `timezone()`, the command layer should canonicalise the name before it is written. Either
  way, (h)'s sentence should say the shape admits case variants, and the handoff's "IANA-shaped" should
  not be read as "an IANA name".

### R3: INFO (new). authenticated's column privileges are a deny-list, not an allow-list

- **Measured [M].** d17 (`grant update (created_at)` on schedules) and d18 (`grant insert (deleted_at)` on
  placements) pass every layer. d18 would let an owner insert a placement born deleted with a deletion
  time of their choosing: `set_deleted_at` is a BEFORE UPDATE trigger only, so this would reopen, for
  INSERT, the backdating that my F9 closed for UPDATE.
- **Remedy.** Assert the exact set of `authenticated`'s column privileges on both tables (for example from
  `information_schema.column_privileges`, or `has_column_privilege` over every column × verb compared to
  the granted lists at `091_calendar.sql:224-246`). That closes R1's verbs as a side effect if it also
  compares table privileges.

### R4: INFO. `service_role` is outside item 6's role list

d11 (`grant all ... to service_role`) is green. Batches 082, 083, 092, 101 and 122 use the same five-role
list [R], and on the platform `service_role` has BYPASSRLS (the shim's own comment), so this is the
repository's convention and not 091's defect. Recorded so that no one reads item 6 as covering it.

### R5: INFO. "A name with a '/' is never read as an abbreviation" is true of the shipped sets

Measured over the 486 abbreviation entries installed with 17.11: none contains '/'. Whether a custom file
in the server's `timezonesets` directory could define one is not measured, and only a server
administrator can install one. The sentence could say "in any shipped set".

### Earlier findings: status after this round

| Finding | Status |
|---|---|
| Q0 F1 (MEDIUM) | **Closed** at both layers [M] |
| Q0 F2 | **Closed** for the five non-client roles [M]; the authenticated half is R1 |
| Q0 F3, C0 G7 | **Closed**: 30/38, every 091 case in exactly one family [M] |
| Q0 F4, C0 G1, my N1 | **Closed** as far as session meaning, offsets, abbreviations and POSIX go [M]; R2 and blocker 191 (h) remain, A5's |
| Q0 F5, F6 | **Closed** [M] |
| Q0 F7 | Placement side re-designed as stated [R]; schedule side `ON CONFLICT DO NOTHING`, reason given in not_done; not re-measured |
| C0 G2 | **Closed** [M] |
| C0 G3 | Handoff refreshed and consistent with the range [M]; `check:handoff` not run under the owning branch name (§5) |
| My N2, N3 | **Closed** in wording: the DS1b row and blocker 191 (a) [R] |

## 4. Stop-the-line verdict

**No stop-the-line risk found.** Nothing measured leaks across tenants, exposes a secret, duplicates a
side effect, diverges a migration or deletes irreversibly on the code as it stands. R1 describes a
deletion path that opens only if a future migration grants TRUNCATE, and nothing grants it today.

**Does anything block the Owner's merge?** In my view, no. R1 and R3 are cheap to close in item 6 and I
recommend doing so in this PR if A0 iterates again, or recording them under blocker 186 or 191 if not.
R2 is A5's choice and is already framed in 191 (h). That is advice, not a gate: whether to merge is the
Owner's decision, with r0's evidence still owed (the open blocker beginning "NO INTEGRATION OWNER EVIDENCE EXISTS", entry
189 of 191).

## 5. Limits

- `npm run check:handoff` exits 75 on my branch name ("no work package declares ownership.branch
  review/a1-batch-091-r3"), as designed. I could not run it under `agent/claude/WP-0A-DB-00-batch-091`,
  which is checked out in the main checkout and which I must not move. I compared the handoff to the range
  directly instead (§2 Q5). `npm run check` passed on my branch name; the measured-on-the-branch-name
  rule means that is not proof of the guard on the Author's branch.
- My main clusters were SQL_ASCII (`initdb --locale=C`). Unicode was tested on the regex expression in a
  UTF8 database, not by writing rows into the tables there.
- One server version (17.11, which has MAINTAIN); the `< 170000` branch of item 6 was not executed.
- The session matrix used installed abbreviation sets only, with PGTZ fixed to UTC by the driver for the
  `make` runs (the matrix itself set TimeZone through PGOPTIONS on direct psql sessions).
- Not measured: a restore onto older tzdata; a case-sensitive tz consumer; Q0's own drift ids; the F7
  rows; anything outside the third round's diff.
- The Author chose what I was pointed at (§0).
