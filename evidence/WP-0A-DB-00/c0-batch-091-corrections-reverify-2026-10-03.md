# C0 re-verification: batch 091's corrections (`7fde2ef`, handoff `604e804`)

| | |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), WP-0A-DB-00. A narrow re-verification of A0's corrections against my own review of the first head (`c0-batch-091-contract-review-2026-09-28.md`) |
| Subject | branch `agent/claude/WP-0A-DB-00-batch-091` (Draft PR #164), head `604e804` (handoff only) over `7fde2ef` (the corrections), over `e8abe33` / `fca5674` (A1's and C0's reviews, cherry-picked), `49cec53` (the first head), `0a4d485` (batch 091); base `86f55d2` (main). Author `/claude/a0_atlas` |
| Records under review | `a0-batch-091-integration-2026-09-28.md` (§2 and §5); `git show 7fde2ef` (its message and diff); the blocker edits in `work-packages/WP-0A-DB-00.json` (blockers 173, 186 and 191); the handoff at `604e804` |
| Governing text | `docs/plans/core-database-and-rls-workstream-th.md` §4.7, §6; `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md` §3.2, §8.3, §8.5, §8.6, §10, §11.3 |
| Date | 2026-10-03 |

This file records findings. It advances no status, approves nothing, and signs nothing on anyone's
behalf. In particular it does not approve the schedule states on A5's behalf: the Owner's `ค` put
C0, Q0 and A1 in A5's place for review, and A5's decision on the states stays owed. Whether this
file counts as a Reviewer's re-verification is for the Integration Owner and the Product Owner to
decide.

## §0 What I am

- I am a subagent spawned by `/claude/a0_atlas`, the Author of the work under review, through a
  workflow script. The brief said what to read and what to ask. I checked each claim it pointed at
  against the diff and the database, not against the brief.
- I am the same vendor and model family as the Author. RFC-2026-024 withdrew the cross-vendor
  condition. That does not make me independent of the brief, and it does not make me A5.
- Accepting this file as the role's signature is an act of the Integration Owner and the Product
  Owner, not mine.

## §1 How I measured

"**Measured**" means I ran it and saw the result. "**Read**" means I read the file or record and
executed nothing.

- **Checkout (measured).** The subject branch is checked out in the main checkout, so I created
  `review/c0-batch-091-r2` at `604e804` in my own worktree. This file is the only thing committed
  there. `git log` shows `604e804 → 7fde2ef → e8abe33 → fca5674 → 49cec53 → 0a4d485 → 86f55d2`.
- **Toolchain (measured).** `node -v` is v24.20.0; every measured round refuses anything else.
  PostgreSQL 17.11 (Homebrew, `/opt/homebrew/bin`).
- **Live database (measured).** A private cluster in `scratchpad/c0-091r2/`, on `127.0.0.1:5505`
  only, TCP only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`,
  `LC_ALL=C`. The shim went first, then `make db-migrate-clean`, then `make db-rls-smoke`. Every round
  started from a fresh initdb. 5432, 5499 and other runs' ports were not touched.
- **Drifts (measured).** Migrate-time drifts were APPENDED to `db/foundation/migrations/140_audit.sql`
  and the file was restored from a saved copy after every round, checked by `cmp`. Live drifts were
  applied to the round's database AFTER migrate-clean, then rls-smoke was re-run.
- **An incident during the run (measured).** The shared volume filled up during the third drift
  round (127 MiB free). The restore `cp` of `140_audit.sql` failed with "No space left on device", and
  the next six rounds refused to start because the round script checks `140` first. I stopped my
  cluster, removed its data directory, restored the file and confirmed it (sha256
  `2ac596bb950e8dfb…`, equal to `HEAD`). After that, every round checked that more than 800 MB was free
  before it started. No round ran on a drifted `140` that it had not appended itself.
- **Branch-name run (measured).** I cloned my worktree into `scratchpad/c0-091r2/clone` with
  `--branch agent/claude/WP-0A-DB-00-batch-091`. `git rev-parse --abbrev-ref HEAD` there gives the
  branch name, and HEAD is `604e804`. The clone's `origin` is my worktree, so its `origin/HEAD` pointed
  at `604e804` and its `origin/main` at the stale local `main` (`5922684`). I set the clone's
  `refs/remotes/origin/main` to `86f55d2` (the real `origin/main`) and pointed `origin/HEAD` at it
  before running the guards. This changed only the clone.
- **End state (measured).** The cluster is stopped and its data directory removed. Nothing listens
  on `:5505`. The clone is removed. `140_audit.sql` is byte-identical to `HEAD`. `git status` is clean
  apart from this file.

### Static checks (measured, on the clone, on the branch name)

| Command | Result |
|---|---|
| `node scripts/verify-branch-scope.mjs 86f55d2 WP-0A-DB-00` | exit 0, "all 22 changed path(s) are declared, and every amendment explains one" |
| `npm run verify` | exit 0, "tests 675, pass 675, fail 0, skipped 0, todo 0". Run twice, before and after the `origin/HEAD` correction; the same both times |
| `npm run check:handoff` | exit 0, "describes the branch: nothing substantive after its cited head". With the clone's uncorrected `origin/HEAD` (`604e804`) it exited 91, "cites base 86f55d2, which is not on this branch's side of its branch point". That is an artefact of my clone, not of the branch |
| `node --test --test-name-pattern="batch 091 case ids" tests/db/identity/identity-isolation.test.mjs` | 1 pass, 0 fail |

### Round 0, the clean head (measured)

- `make db-migrate-clean`: exit 0, "47 apply-time blocks, 37 re-run as written, 10 superseded and
  replaced". The pinned policy probe reads "the 5 restrictive policies that bound which rows a client
  may update or see, in their pinned text (self-test: refused its drift; clean again after every
  drift)". The UPDATE-closure probe reads 19.
- `make db-rls-smoke`: exit 0, "1047 isolation case(s) passed" (1023 + 24).
- **The fixture is idempotent.** rls-smoke ran a second time on the same database and exited 0. The
  row digests did not change: `calendar_items` 5 rows `0e59e015…`, `content_schedules` 8 rows
  `16553387…`.

### Per-table negative controls on a round-0 database (measured, CI's procedure)

| Table with RLS off | Failed case lines | 091 cases among them |
|---|---|---|
| `app.calendar_items` | 12 | all 12; every id matches `(calendar\|placement\|place-an-item)` |
| `app.content_schedules` | 18 | all 18; 17 contain `schedule`, and `owner-a-cannot-arm-a-draft` does not |
| `app.workspaces` (010) | 12 | none |
| `app.business_profiles` (020) | 14 | none |
| `app.page_context_profiles` (020) | 12 | none |
| `app.workspace_member_scopes` (021) | 80 | 8: the 091 Business- and Page-scope reads and writes. Each is a genuine scope failure, and none of their ids matches `[a-z0-9-]*scope` any more |

This reproduces the record's "12 and 18" and the `ci.yml` comment.

### Migrate-time drifts (measured; each appended to 140, fresh cluster)

| # | Drift | migrate-clean | What refused it |
|---|---|---|---|
| d1 | `content_schedules_scope_narrowing` → `using (true) with check (true)` (my F1's d1) | exit 2 | pinned policy probe, by name |
| d2 | the same on `calendar_items_scope_narrowing` | exit 2 | pinned policy probe |
| d3 | both `*_service_path_closed` → `using (true) with check (true)` (my F4's d3) | exit 0 | rls-smoke exit 2: exactly `batch-091-closes-the-service-path-on-placements` and `…-on-schedules` |
| d4 | `content_schedules_update_scheduler` USING without its status term (my F2's d4) | exit 2 | 091's block item 5: "write policy(ies) not in their exact text: content_schedules_update_scheduler" |
| d5 | both composite scope keys replaced by single-column keys of the same names, with indexes (my F4's d5) | exit 2 | block item 7: "calendar_items_item_scope_fk, content_schedules_target_scope_fk" |
| d11 | an "owner may reopen" permissive UPDATE sibling | exit 2 | block item 5: "other permissive policies than its two reads and four writes" |
| d12 | `content_schedules_client_transition_is_bounded` dropped | exit 2 | pinned policy probe |
| d13 | `content_schedules_timezone_known` dropped | exit 2 | block item 7 |
| d14 | `set_deleted_at` trigger dropped | exit 2 | block item 10 |
| d15 | the one-live index rebuilt without `dispatched` | exit 2 | block item 8, "finds 1 of its two unique-active indexes" |
| d16 | `calendar_items_deleted_is_final` dropped | exit 2 | pinned policy probe |

Every drift that survived every layer in my first review (d1, d3, d4, d5) is now caught.

### Live drifts: the record's measurements reproduced at the case layer (measured)

Each drift was applied to a green round-0 database after migrate-clean, so the probes could not
stand in for the cases.

| # | Drift | Failed cases | Record says |
|---|---|---|---|
| e1u | schedules narrowing, USING half → `true` | 4: `editor-a-cannot-see-the-schedule-outside-their-remit`, `admin-a-cannot-see-…`, `admin-a-cannot-cancel-the-schedule-outside-their-remit`, `narrow-editor-a-cannot-see-the-schedule-on-the-sibling-item` | 4 ✓ |
| e1c | schedules narrowing, WITH CHECK half → `true` | 1: `admin-a-cannot-schedule-a-target-outside-their-remit` | 1 ✓ |
| e2u | calendar narrowing, USING half | 2: `editor-a-cannot-see-the-placement-outside-their-remit`, `narrow-editor-a-cannot-see-the-placement-on-the-sibling-item` | 2 ✓ |
| e2c | calendar narrowing, WITH CHECK half | 1: `admin-a-cannot-place-an-item-outside-their-remit` | 1 ✓ |
| e3 | the "owner may reopen" sibling alone | 0, 1047 pass | 0 ✓ (the closure holds) |
| e4 | the sibling, with the closure dropped | 6: arm, dispatch, reopen-cancelled, revive-completed, rewrite-failed, cancel-dispatched | 6 ✓ |
| e5 | `calendar_items_deleted_is_final` dropped | 1: `owner-a-cannot-undelete-a-placement` | ✓ |
| e6 | index without `dispatched` | 1: `owner-a-cannot-schedule-a-target-already-dispatched` | ✓ |
| e7 | both zone CHECKs dropped | 2: the two unknown-zone cases | ✓ |
| e8 | the display_status bound dropped | 1: `owner-a-cannot-give-a-placement-an-unbounded-status` | ✓ |
| e9 | the `set_deleted_at` trigger dropped | 1: `owner-a-cannot-backdate-a-deletion` | ✓ |
| e10 | my F2's d4, live | 0, 1047 pass: the restrictive closure now holds what the USING term held | (block item 5 catches it at migrate, d4) |

**The record's RETURNING claim (measured).** With the calendar WITH CHECK half gutted in a rolled-back
transaction, `user_admin_a`'s out-of-scope insert with no RETURNING reached the unique index (23505).
That differs from the case's expected policy denial, so the case fails. With `returning id` it was
refused by `calendar_items_scope_narrowing`, so a case with RETURNING would have stayed green. The
record is right.

### Rolled-back probes on a clean round-0 database (measured)

| # | Statement | Result |
|---|---|---|
| Z1 | `provolatile` of `timezone(text, timestamp without time zone)` | `i` |
| Z2 | `md5(pg_get_constraintdef)` of both `*_timezone_known` under TimeZone UTC and Asia/Bangkok | identical (`cd5fda14…`, `b8f310cc…`). Under `DateStyle = 'SQL, DMY'`: **different** (`f94138c5…`, `46f15a5e…`). The literal deparses as `'01/01/2000 00:00:00'`, and under German as `'01.01.2000 00:00:00'` (G2) |
| Z3 | `timezone(z, timestamp '2000-01-01 00:00')` for assorted `z` | Accepted: `Asia/Bangkok`, `asia/bangkok` and `ASIA/BANGKOK`, all 17:00 UTC; `Etc/GMT-7` 17:00 UTC; `ICT` 17:00 UTC. Also accepted, with a **sign opposite to the one a Thai user would mean**: `UTC+7`, `+07` and `7`, each 07:00 UTC, which is UTC−7. Also accepted: `EST` (05:00 UTC), `AEST`, `ACDT`, and an arbitrary `XYZ+3`. Refused: `Bangkok`, `posixrules` |
| Z4 | `EST` under `timezone_abbreviations = 'Australia'` | 14:00 UTC, which is +10, where Default gives −5. The same stored value means two different offsets depending on a session setting (G1) |
| Z5 | `owner_a` inserts a schedule with `timezone_snapshot = 'EST'`, and a placement with `timezone = 'UTC+7'` | 1 row each, stored as typed |
| D1 | `has_column_privilege('authenticated', 'app.calendar_items', 'deleted_at', 'INSERT' / 'UPDATE')` | f / t. A client cannot insert a pre-deleted, backdated placement |
| D2 | `owner_a` disarms the armed schedule; cancels it; moves its time and leaves it armed | 1 row; 1 row; refused by row-level security. This is unchanged from the first head |
| D3 | as postgres, the sibling-page schedule is moved dispatched → completed, then a new draft is inserted on that target | 1 row. A completed target can be scheduled again; this is on blocker (a) |
| D4 | `owner_a` counts the soft-deleted `calendar_item_a1_deleted` | 1. A deleted placement stays visible to every member (G6) |
| D5 | with business_a1 archived, `owner_a` inserts a draft schedule and a placement under it | 1 row; 1 row. My F7 is open and recorded on blocker (f) |
| D6 | `version` after a client disarm | 1. My F10 is open and recorded on blocker (a) |
| D7 | `private.set_deleted_at()` | not SECURITY DEFINER, `search_path=""`, body md5 `3b153bd2…` (as the block pins), no EXECUTE for PUBLIC or authenticated |
| D8 | triggers on `calendar_items` | `set_deleted_at` and `set_updated_at`, both BEFORE UPDATE |
| D9 | as postgres: the first deletion of `calendar_item_a1` sending 2001; then re-timing the already-deleted `calendar_item_a1_deleted` to 2001 | the first records `now()`; **the second keeps 2001** (G5) |
| D10 | the client's grants on `publish_intent_id` (UPDATE), `version` (UPDATE) and `status` (INSERT) | f, f, f |
| DS | a full round with `PGDATESTYLE='SQL, DMY'` | migrate-clean exit 2 **at 091 itself**: "batch 091 constraint(s) missing, unvalidated or not in their required text: calendar_items_timezone_known, content_schedules_timezone_known". Every file before 091 applied (G2) |

### The id renames and the overlap (measured)

- **The ids in the diff.** `git diff 49cec53 7fde2ef -- tests/db/identity/isolation-cases.mjs`
  removes 7 ids and adds 31. Seven of the additions are renames of the seven first-head ids that
  matched another family's pattern: six `workspace` ids became `tenant`, and the `scope` id became
  `remit`. The other 24 additions are new cases (33 + 24 = 57).
- **The overlap.** A script over `buildCases` and the 56 `control` lines in `ci.yml`, anchored as
  CI's `grep -E "^  $pattern"` is, reports 1047 cases with no duplicate ids. The calendar entry
  matches 23 ids and the schedule entry 32, all of them batch 091. No other entry matches any 091 id.
  Two 091 ids fall under neither 091 entry: `owner-a-cannot-arm-a-draft` and
  `owner-a-cannot-backdate-a-deletion`.

## §2 Answers to the brief's questions

### Q1. Is each of my findings F1–F15 dispositioned accurately, and does each fix do what the record says?

**Yes, all fifteen**, with the qualifications in G4 to G7. F1 and F2 were re-measured with their
original gutting experiments (d1, d4) and the half-by-half splits (e1u to e2c, e10).

| My finding | Record's disposition | What I found | Accurate? |
|---|---|---|---|
| F1 MEDIUM: the schedules narrowing is unasserted; §8.6/3 and /4 are missing | both narrowings pinned in `PINNED_POLICIES`, both halves; out-of-scope rows; 7 cases | d1 and d2 now fail migrate-clean. e1u, e1c, e2u and e2c each fail exactly the cases the record names. The fixture has `content_schedule_a2`, `…_a1_sibling_page` and `calendar_item_a1_sibling_page` (measured) | yes (measured) |
| F2 MEDIUM: settled-is-history is unasserted | restrictive `content_schedules_client_transition_is_bounded`, pinned; settled fixture rows; cases | d4 is caught by the block (item 5, exact text), and with d4 live (e10) the closure keeps all 1047 cases green. d11 and d12 are caught. e3 and e4 reproduce 0 and 6. The closure is the remedy I proposed, with a WITH CHECK of (draft, cancelled) where I had suggested `true`. That is stricter, and it changes nothing today (D2) | yes (measured) |
| F3 LOW: §8.6 coverage and labels | forged `created_by` ×2, suspended ×2, anonymous on schedules; labels `§8.6/5`, `§8.6/7` | all present (read, `isolation-cases.mjs:16836-16864`, `17327`) and passing (measured) | yes |
| F4 LOW: closures and keys by name; a false comment | two catalog cases; keys by definition text in item 7; comment corrected; item 4 FOR ALL; item 5 exact | d3 is caught by exactly the two catalog cases. d5 is caught by item 7. The comment at `091_calendar.sql:441-443` is corrected. The ids I suggested should carry no family word still do (G7) | yes |
| F5 LOW: 124's key ties only workspace and business | blocker (g) | (g) says it, and adds `unique(publish_intent_id)` and blocker 173 (read) | yes |
| F6 LOW: four blockers left as they were | 173's opening corrected; 139, 148 and 168 cross-referenced in (g) | read in the manifest diff (`open_blockers[172]`, item (g)) | yes |
| F7 LOW: §11.3 "archive closes creation" | blocker (f) | (f) states it (read). It is still open: D5 measured 1 row and 1 row | yes, recorded and not fixed |
| F8 LOW: zones are unchecked, and the comment was untrue | `*_timezone_known`; comment corrected | e7 and d13 confirm the CHECK and its pin. The comment is corrected. What the CHECK admits is wider than IANA, with traps (G1), and its pin depends on DateStyle (G2) | yes, with G1 and G2 |
| F9 LOW: the editor's `P` is described in §5.1, §7 and DB-08 | (c) cites them; (a) lists the placement mapping | read | yes |
| F10 LOW: `version` does not move | (a) | read. D6 still 1 | yes, recorded |
| F11 LOW: the CI comment, basis and overlap; no static test | comment re-measured; widened pattern; renames; static test pinned 23/32; floors moved | 12/18 measured; the overlap is clean (measured); the static test passes; the floors are 304/2150, and `npm run verify` reports 675. The record says "Fourteen ids were renamed"; the committed history shows seven (G4). My remedy had been to rename the four calendar ids; A0 widened the pattern instead, which the static test holds equally well | yes, with G4 |
| F12 INFO: item 4 misses FOR ALL; tokens survive `or true` | `'*'` added; item 5 exact text; permissive count = 6 | d11 measured caught by the count | yes |
| F13 INFO: the fixture entry was inserted, not appended | comment amended (`run-isolation.mjs:135-139`) | read | yes |
| F14 INFO: four wording points in the disposition | corrected, with a §4 saying so | read. "For #162, A0 had asked twice" matches the #162 disposition's "A0 had objected twice" (`product-owner-disposition-2026-09-28-after-162.md:67`) | yes |
| F15 INFO: smaller points | "no CHECK" qualified in the plan's row B and in (e); `violates` on both 23505 cases; row H and soft lifecycle in (a); the deleted placement made final and database-timed | `violates` read at `isolation-cases.mjs:16937, 17058` (and on the new `17209`). e5 and e9 measured. The handoff criterion's "scope pinning" is now true (d5). The visibility half of the deleted-placement point is neither fixed nor recorded (G6) | yes, with G6 |

### Q2. Do the new closures, the zone CHECK, the trigger and the widened index match §4.7, §8.3 and §11.3, or do they make a departure A5 or the Owner must decide?

**None of them contradicts a document.** The restrictive transition closure, the deleted-is-final
closure and the trigger narrow only what clients could already do. They refuse nothing that works
today: 1047 cases pass, and D2 still admits the disarm and the armed cancel. The widened index makes
a dispatched target unschedulable, which is the safe direction for §4.7's "approval gate … ก่อน
`armed`" and for the duplicate-publish class.

**Four points do need A5 or the Owner.** Each is a reading the corrections make or leave, and none is
a defect today:

1. **§3.2 says `timezone_snapshot` is IANA.** The CHECK admits every spelling PostgreSQL parses
   (G1). That includes POSIX and ISO-looking offsets whose sign is the opposite of what a Thai user
   would mean (`UTC+7`, `+07` and `7` are UTC−7), and abbreviations whose offset depends on a session
   setting (`EST`). (h) discloses "POSIX spellings too". It does not disclose the sign or the
   abbreviations.
2. **The restore trade-off my F8 named is not recorded.** A server whose tzdata lacks a stored zone
   would refuse the row on restore (read; not measured).
3. **§10 gives SCHEDULE-HISTORY a "30-day recovery" (`sprint-0a-core-erd-rls-retention-th.md` §10
   table).** `calendar_items_deleted_is_final` now forbids a client undelete, and leaves recovery to a
   future command path (`091_calendar.sql:163-164`). That is a defensible reading. Whether recovery
   is a client action is A5's question, and it is not in (a) (G6).
4. **Whether a completed target may be scheduled again (D3).** This is already a question for A5 in
   (a). The widened index does not decide it.

§8.3's cells are unchanged: owner and admin write, the editor's `P` is refused, approver and viewer
are refused, and the service gets nothing (D10, and the cases). §11.3 is unchanged: both of its halves
are open and recorded on (f).

### Q3. The id renames: do the new ids collide with another family's pattern, and is the static test right?

**No collision (measured).** No 091 id matches any of the 54 other control patterns, and no other
family's id matches either 091 pattern (§1). The renamed ids still fail under the control of 021,
the family whose rows they depend on (8 ids, each a genuine scope failure). They no longer satisfy
that control's pattern.

**The static test is correct (read and measured).** It:

- parses the `control` lines exactly as the other batches' tests do;
- anchors with `^`, as CI's `grep -E "^  $pattern"` does;
- holds each 091 entry's matches to cases whose `why` begins `BATCH 091`, which covers both
  directions;
- requires the two families to be disjoint;
- tests every 091 id against every other entry;
- pins 23 and 32.

The test passes on the branch name. Two caveats, both INFO (G7):

- The 32 includes the catalog case `batch-091-closes-the-service-path-on-schedules`, and the 23
  includes `…-on-placements`. A catalog read cannot fail when RLS is off, so these inflate the
  family count without affecting the control.
- `owner-a-cannot-arm-a-draft` fails under the schedules control, but matches neither pattern.

**The rename count.** The record says fourteen ids were renamed. The diff shows seven (G4).

### Q4. verify-branch-scope, `npm run verify` and `npm run check:handoff` on the branch name

**All exit 0 (measured, §1):**

- scope: 22 paths;
- verify: 675 of 675;
- check:handoff: "describes the branch".

**These guards do not read the handoff's text.** That text still describes the first head (G3).

### Q5. Are the claims in 7fde2ef's message, the record's §2 and §5, and the blocker edits true?

**The commit message: true (measured).** Every bullet is reproduced above:

- the two restrictive closures pinned (d12, d16);
- both narrowings pinned, both halves (d1, d2, e1u to e2c);
- seven scope cases, with the inserts carrying no RETURNING (read and measured);
- `dispatched` in the index (e6, d15);
- the zone and length bounds (e7, e8);
- `set_deleted_at` pinned (d14, e9);
- the static test pinned at 23/32.

"Q0 has not returned yet": not checked beyond the record.

**The record's §2: true, with one miscount and one overstatement.** Every measured row reproduces
(§1). The miscount is "Fourteen ids were renamed", which is seven (G4). The overstatement is that
"125's pattern" holds only in part for `set_deleted_at` (G5).

**The record's §5: true (measured).** 47 / 37 / 10, the rls-smoke run and its re-run all exit 0;
`npm run verify` stands in for `npm run check`.

**The blocker edits: true, with one overstatement.**

- 173's opening is corrected, and its open part is carried into (g).
- 186 names the two `created_by` tables.
- 191's items (a) to (h) say what the record says.
- The overstatement: (f) says batch 160's sweep "can now trust deleted_at on placements (set by the
  database since 091's corrections)". That holds for client writes. A non-client UPDATE can still
  re-time an existing deletion, because the trigger fires only on NULL → value (D9; G5).

**The handoff at `604e804`: not true of the head it cites (G3).** It cites `7fde2ef`, but its
evidence, test, compatibility, blocker and reviewer-instruction text is the first head's.

### Q6. Stop-the-line? Does anything block the Owner's merge?

**No stop-the-line, and nothing I found blocks the Owner's merge.** §3 grades the findings and §4 gives
the verdict.

## §3 Findings

Ranked most severe first. Neither 091 nor 124 is merged, so migration invariant 1 does not yet
prevent editing them in place.

### G1: LOW (measured). The zone CHECK admits non-IANA spellings, some with an inverted sign and some with a session-dependent meaning

- **Where.** `db/foundation/migrations/091_calendar.sql:82-83` and `:130-132`. The comment is at
  `:63-69`. Blocker 191 (h) is at `work-packages/WP-0A-DB-00.json:445`.
- **What it admits (Z3, Z4, Z5):**
  - `UTC+7`, `+07` and `7`, each read as UTC−7 (POSIX sign);
  - `XYZ+3`;
  - `EST`, which is −5 under the default `timezone_abbreviations` and +10 under `Australia`;
  - case variants, stored as typed.

  A client stored `EST` and `UTC+7` (1 row each).
- **Why it matters.** §3.2 requires an IANA `timezone_snapshot`. DB-08's acceptance needs Thai time
  converted to UTC correctly. A user who types `UTC+7` meaning Bangkok gets a 14-hour error, and the
  database accepts it as "known". An abbreviation's meaning depends on the reader's session, which
  conflicts with the IMMUTABLE reasoning the comment relies on. (h) discloses "POSIX spellings too"
  and none of this.
- **Remedy.** Either:
  - add an immutable shape test beside `timezone()`, for example
    `timezone ~ '^(UTC|[A-Z][A-Za-z_]+(/[A-Za-z0-9_+-]+)+)$'`. That refuses `UTC+7`, `+07`, `7`, `XYZ+3`
    and the bare abbreviations, and keeps `Asia/Bangkok` and `Etc/GMT-7`;
  - or record the sign trap and the abbreviations on (h) as A5's decision, together with the tzdata
    restore trade-off (Q2 point 2).

### G2: LOW (measured). The zone CHECKs' pinned text depends on DateStyle, so 091 fails to apply under a non-ISO DateStyle

- **Where.** The literal `timestamp '2000-01-01 00:00:00'` is at `091_calendar.sql:83, 132`. The
  pins compare exact `pg_get_constraintdef` text at `:453-454`. The record's claim is at
  `a0-batch-091-integration-2026-09-28.md:44`, "The deparse is identical under UTC and Asia/Bangkok".
- **Measured.** Under `DateStyle = 'SQL, DMY'` the deparse is `'01/01/2000 00:00:00'`, and under
  German it is `'01.01.2000 00:00:00'` (Z2). A full round with `PGDATESTYLE='SQL, DMY'` fails
  migrate-clean at 091 itself, naming both constraints (DS). Every earlier file applied, so 091 is the
  first file whose pins depend on DateStyle. grep finds no other pinned text in the migrations or
  `scripts/db` with a datetime literal.
- **Why it matters.** It fails closed, so nothing is let through. But the record's claim of session
  independence was tested on TimeZone only, and a migrate or post-migrate pass run by a client whose
  DateStyle is not ISO (a libpq `PGDATESTYLE`, or a role or database default) would turn red for no
  defect.
- **Remedy.** Write the CHECK with a literal that deparses the same under every DateStyle, for example
  `pg_catalog.make_timestamp(2000, 1, 1, 0, 0, 0)`, and re-pin it. Or `set local datestyle = 'ISO'` in
  the block and the probe. Then correct the record's sentence.

### G3: LOW (read). The handoff cites the corrected head, but its text describes the first head

- **Where.** `handoffs/WP-0A-DB-00-author-handoff.json` at `604e804`, which cites
  `head_revision_or_patch_checksum` `7fde2ef`.
- **What is stale:**
  - `:49`: "apply-time block (nine checks)". There are ten.
  - `:49`: "rls-smoke 33 cases". There are 57 for 091 and 1047 in all.
  - `:59` and `:99`: "exactly seven cases of that family". It is 12 and 18.
  - `:71`: "rls-smoke 1023 cases ok".
  - `:81`: "Cases 990 -> 1023". It is 990 → 1047.
  - `:89`: "(a) to (f)". It is (a) to (h).
- **Pre-existing.** `:92` "would reopen both forgeries" has been the same sentence since `86f55d2`'s
  handoff, and it does not describe a revert of 091.
- **Why nothing caught it.** `check:handoff` checks the range and the paths, not the text, so it is
  green (measured).
- **Why it matters.** The handoff is the record the Owner merges on. Its figures are the first head's.
- **Remedy.** Refresh the text fields to the corrected head's figures, and make the rollback sentence
  say what a revert removes.

### G4: INFO (measured). "Fourteen ids were renamed" is seven

- **Where.** `a0-batch-091-integration-2026-09-28.md:48`.
- **What.** The diff `49cec53..7fde2ef` renames seven ids (six `workspace` → `tenant`, one `scope` →
  `remit`) and adds 24. Fourteen is the number of diff lines.
- **Remedy.** Correct the number.

### G5: INFO (measured). `set_deleted_at` is 125's pattern only in part, and blocker (f) overstates what batch 160 can trust

- **Where.** `091_calendar.sql:160-184` and the record's row "A1 F9". Blocker 191 (f) is at
  `WP-0A-DB-00.json:445`.
- **The difference from 125.** 125's `set_decided_at` refuses any change to a recorded decision's
  `decided_at` by any writer that fires triggers. 091's function only records `now()` on
  NULL → value. As postgres, re-timing an already-deleted placement to 2001 was kept (D9).
- **No client path.** Clients cannot reach a deleted row (`calendar_items_deleted_is_final`, e5) and
  cannot INSERT `deleted_at` (D1).
- **What follows for (f).** "batch 160's sweep can now trust deleted_at" holds for client writes only.
  A future command role or maintenance writer can re-time a deletion.
- **Remedy.** Qualify (f). Optionally, refuse changing a non-null `deleted_at` to another non-null
  value in the trigger, as 125 does for `decided_at`. That still leaves an explicit undelete
  (non-null → NULL) open.

### G6: INFO (read and measured). Two halves of the deleted-placement point are not on the blocker: visibility, and §10's recovery

- **Visibility (D4).** A soft-deleted placement is still visible to every member. §8.5's SELECT
  pattern includes "lifecycle visibility", and my F15 named this.
- **Recovery.** `calendar_items_deleted_is_final` forbids a client undelete. §10 gives
  SCHEDULE-HISTORY a 30-day recovery.
- **Why it matters.** Neither is wrong today. Both are readings A5 should see, and (a) lists neither.
- **Remedy.** Add both to (a).

### G7: INFO (measured). The control-family counts include two catalog cases, and one failing schedule case matches neither pattern

- **The catalog cases.** `batch-091-closes-the-service-path-on-placements` and `…-on-schedules` match
  the 091 patterns and are counted in 23 and 32. My F4 remedy asked for ids without family words, as
  082's are. A catalog read cannot fail under RLS-off, so the control is unaffected.
- **The uncounted case.** `owner-a-cannot-arm-a-draft` fails under the schedules control and matches
  neither pattern. So does the positive `owner-a-cannot-backdate-a-deletion`, which does not fail.
- **Remedy.** None needed. Optionally rename the two catalog ids, which moves the pins to 22 and 31.

## §4 Stop-the-line verdict

**No stop-the-line condition found in `7fde2ef` / `604e804`.**

| Stop-the-line class | What I found | How I know |
|---|---|---|
| Secret exposure | none. The fixture's ids come from the catalog; `npm run verify` includes the secret scan | measured |
| Tenant leakage | none. Cross-tenant, Business and Page scope, suspended and anonymous are refused on both tables. Each narrowing half is now held by a case and a pin | measured: the controls, e1u to e2c, d1, d2 |
| Duplicate external side effects | none possible. No client can arm, dispatch or link, and a dispatched target cannot be scheduled again | measured: e4, e6, D10 |
| Lost jobs | none | – |
| Migration divergence | none. The set migrates clean with the pass, and the fixture is idempotent. G2 is fail-closed and needs a non-default DateStyle | measured |
| Irreversible deletion | none. There is no DELETE grant, and soft deletion is final for clients | measured |
| Contract mismatch | none silent. G1 is wider than §3.2's "IANA" and only partly disclosed; it is graded LOW and owed to A5 | measured and read |

**Nothing I found blocks the Owner's merge.**

- The merge is a governance change (it touches CI), so it is the Owner's personally.
- Both MEDIUM findings from my first review are closed, and I measured the closure.
- I recommend fixing G3 (the handoff's text) before the merge, because the Owner merges on it. G1
  and G2 can be fixed in this PR at the cost of a re-pin, or recorded for A5. G4 to G7 are wording
  or optional.
- Q0's test of this head had not returned when I ran (the record's §3 and §4). Whether to wait for it
  is the Owner's decision under `ค`.
- A5's review of the schedule states stays owed. This file is not a substitute for it.

## §5 Limits

- **Who I am.** I am the Author's subagent, of the same vendor and model family, under the Author's
  brief (§0). I am not A5.
- **Where I measured.** Homebrew PostgreSQL 17.11 on macOS with the shim. Not CI's container and not
  Supabase. I did not read CI's run for `604e804`, and I did not run migrate-upgrade, seed-replay or
  any performance budget.
- **The clone.** The branch-name run was on a local clone whose `origin/main` I set to `86f55d2` by
  hand, because the worktree's local `main` is stale. With the uncorrected ref, check:handoff exited
  91 (§1).
- **Disk.** The shared volume ran out of space once during my run, and later rounds ran behind a
  free-space check (§1). Rounds that failed to start produced no result and are not reported as one.
- **What I read and what I sampled.** I read 7fde2ef's diff in full, except the manifest, which I
  compared field by field with a script. I read 091's new cases where a finding depends on them, and
  checked the rest through the controls and the overlap script. I did not re-read A1's review.
- **Tzdata.** The tzdata restore trade-off (Q2 point 2) is read, not measured.
