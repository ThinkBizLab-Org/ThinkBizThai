# Q0 independent test: batch 126 (the approval decision frozen for every writer, the probes' verdict tied to its objects)

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`. This file comes from a distinct run of it.
Subject: branch `agent/claude/WP-0A-DB-00-batch-126`, Draft PR ThinkBizLab-Org/ThinkBizThai#165, head
`8932e611551acddcc4b417129c4b45632fccfa35` (the handoff, alone) over `f421764d5a8675b5015d3a1581f2755038cf9ddb`
(batch 126's code), base `e5380b0` (`main`, #164 merged). I read `git diff e5380b0..8932e61` in full
for the migration, the replacement, `psql-driver.mjs`, `rls-smoke.mjs` and `run.mjs`, and the parts of
`foundation-contract.test.mjs`, the manifest and the handoff that the claims rest on.
Author: `/claude/a0_atlas`.
Local test branch: `test/q0-batch-126`, created at `8932e61` in my own worktree. Every mutation and
drift ran in a private clone on the branch NAME `agent/claude/WP-0A-DB-00-batch-126`; the worktree's
source files were never edited.
Date: 2026-10-03.

**This document RECORDS TEST RESULTS.** It advances no package status. It writes `test_verified`
nowhere, signs nothing on anyone's behalf, and repairs nothing it found. Every defect named below is
left as it is on the subject branch.

**Measured and read are marked.** "(measured)" means I ran it on the declared toolchain and a private
cluster and the numbers are the run's. "(read)" means I read it in the code or a record and did not run
it.

---

## 0. What I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`.** I ran in a git worktree A0's workflow
created, under a brief A0's workflow computed. That brief chose the subject, the port (5503) and the
cluster recipe, the output filename, and the classes I had to cover at minimum: weaken each new probe
rule, the verdict matching, the meta-command scanner, the FK exemption keys, the `*_by` predicate
assert, and 126's trigger and CHECK; whether each drift is refused for the right reason; fixture
idempotency; the truth of the commit messages, plan, disposition, blocker edits and handoff;
ownership; stop-the-line.

A0 also wrote the change under test, and that change answers findings of mine (Q0 on batch 125, F1-F6
and F8).

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is approved
and withdrew the cross-vendor condition. What remains is CONTRIBUTING_AGENTS.md's separation of duties:
four distinct `agent_run_id`s, and no run approves, test-verifies, integrates or gate-approves its own
work.

**Whether this file is accepted as the Tester signature is the Integration Owner's and the Product
Owner's act.** It is not mine.

The request the harness relayed to this run is the Owner's `ใช่ merge ทำต่อได้เลย`. I read it as the
Owner's word to A0, which this file transcribes as evidence (section 6); it does not make me an
integrator, and I merged, pushed and approved nothing.

---

## 1. How I measured (measured)

- PostgreSQL 17.11 from `/opt/homebrew/bin`; `initdb --locale=C -A trust -U postgres`; `LC_ALL=C`;
  127.0.0.1:5503 only, TCP only (`-c unix_socket_directories=''`); the shim
  `db/foundation/ci/supabase-shim.sql` first; then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres
  make db-migrate-clean` and `make db-rls-smoke`. A fresh `initdb` every round: 36 cluster rounds.
  5432, 5499 and every other port were never contacted. The cluster is stopped and its data directory
  removed; nothing listens on 5503.
- Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`, matching `.node-version`).
- Private directory: `.../scratchpad/q0-126/` (scripts `round.sh`, `drift.sh`, `mut.sh`, `mutate.mjs`,
  `nc.sh`; 299 log files). Not part of the repository.
- Drifts were APPENDED to `db/foundation/migrations/140_audit.sql` in the clone, after a saved copy, and
  restored byte for byte after every round: SHA-256 `2ac596bb950e8dfb11d9e45172f24305698ecddb4d3e8380114e2bfc1ad37149`
  before the first round and after the last, in the clone and (never edited) in the worktree.
- Code mutations were applied to the clone by a script that then **refreshed every digest the edit
  moved** (the probe digests in `foundation-contract.test.mjs`; for a 126 body change, the body md5 in
  126, in 125's replacement and in `run.mjs`) and ran `npm run regenerate:manifest`. Each was undone with
  `git checkout -- .` and `git status --porcelain` was empty after every one.
- Layers: **static** = `node --test test-kits/db/foundation-contract.test.mjs`; **suite** =
  `node scripts/run-test-suite.mjs`; **mc** = `make db-migrate-clean`; **rs** = `make db-rls-smoke`;
  **CI-NC** = CI's per-family negative control (`ci.yml` lines 169-200), reproduced locally by
  `nc.sh` with the same three tests (RLS off on one table, suite must report `db-rls-smoke: FAILED`,
  a failed case must match the family's pattern).

### Baseline on `8932e61` (measured)

| Command | Exit | Result |
|---|---|---|
| mc, fresh cluster (B0) | 0 | 14 probes, each "refused each of its drifts; clean again"; post-migrate pass 48 blocks, 37 as written, 11 replaced |
| rs, then rs again on the SAME database (B0) | 0, 0 | 1058 of 1058, then 1058 of 1058 |
| `node scripts/verify-branch-scope.mjs e5380b0 WP-0A-DB-00` (clone, branch NAME) | 0 | "all 18 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` (clone, branch NAME, origin/HEAD = origin/main = `e5380b0`) | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` (clone, branch NAME) | 0 | "clean: exit 0 — tests 675, pass 675, fail 0" |
| static | 0 | 72 of 72 |
| CI-NC `app.approval_requests` (B1) | suite 2 | FAILED reported; 22 failed cases, all matching `approval-request` |
| CI-NC `app.calendar_items` (B1) | suite 2 | FAILED reported; 15 failed cases, all matching the calendar pattern |
| `gh pr view 165` / `gh run view 37106223881` | | Draft, OPEN, head `8932e61`; `bootstrap` success on `8932e61`, branch `agent/claude/WP-0A-DB-00-batch-126` |

The fixture is idempotent as built: the second rs on one database passed 1058 of 1058. The 090
fixture's DO block passes the second time because its INSERTs are `on conflict do nothing`, so the
decided rows keep the statement time of the first load, which is neither 2026-09-11 literal (read +
measured).

A first `check:handoff` in the clone exited 91 because the clone's `origin/HEAD` pointed at the
clone's source branch; with `origin/HEAD` set to `origin/main` (`e5380b0`) it exited 0. That is my
setup, not a defect of the branch.

---

## 2. Mutation and drift table (measured)

"Exposure" is a second drift run WITH the mutation in place, showing a real weakening passing.
`—` = not run. Every code mutation below had its digests and the integrity manifest refreshed.

### 2.1 Code mutations

| ID | Mutation (file) | static | suite | mc | rs | Exposure with it | Verdict |
|---|---|---|---|---|---|---|---|
| M-VERD-NAMES | verdict: `missing = []`, names never read (`run.mjs:848`) | **1** | 1 | 0 | 0 | — | caught, static |
| M-VERD-ERR | verdict: `errorLines >= 1` for `=== 1` | **1** | 1 | 0 | 0 | — | caught, static |
| M-VERD-END | verdict: closing-marker rule dropped | **1** | 1 | 0 | 0 | — | caught, static |
| M-FORGE | grant probe's column rule silenced (`and false`) and its drift 2 replaced by `create function pg_catalog.format(text, name, name) … raise exception '<the rule's prefix and all three names>'` | 0 | 0 | 0 | 0 | + `grant insert (deleted_at) on app.calendar_items to authenticated` (C0's d3): **mc 0, rs 0**, claim still "refused each of its 2 drifts" | **SURVIVES, live exposure** (F3) |
| M-LEX-E | lexer: every `'…'` read as an `E''` literal (`psql-driver.mjs:339`) | 0 | 0 | 0 | 0 | + `select '\'; \! touch <file>` / `-- '`: **mc 0, rs 0, the file was created** | **SURVIVES, live exposure** (F1) |
| M-LEX-DQ | lexer: a dollar tag accepted after an identifier character | 0 | 0 | 0 | 0 | + `select 1 as x$a$; \! touch <file>` / `-- $a$`: **mc 0, rs 0, the file was created** | **SURVIVES, live exposure** (F1) |
| M-FK-SUFFIX | FK support: exemption matched on `'%.' \|\| conname` (the key kept in the list) | **1** | 1 | **2** | 0 | — | caught, static and mc (drift 1's namesake not named) |
| M-CV2 | coverage probe: `and a.attname not like 'decided%'` on the line after the LIKE | 0 | 0 | 0 | 0 | + `alter table app.knowledge_items add column decided_by uuid; grant update (decided_by) … to authenticated`: **mc 0, rs 0** | **SURVIVES, live exposure** (F4) |
| M-GR-ANON | grant probe: `and rolname <> 'anon'` in both role sets | 0 | 0 | 0 | 0 | + `grant select on app.calendar_items to anon`: mc **2**, by 091's own post-migrate block ("a non-client role holds a privilege … anon") | survives the probe's own layers; no exposure found |
| M-GR-REF | grant probe: REFERENCES dropped from the column rule (`run.mjs:573`) | 0 | 0 | 0 | 0 | + `grant references (id) on app.calendar_items to authenticated`: **mc 0, rs 0** (the same drift unmutated: mc 2 by name) | **SURVIVES**, low exposure (F7) |
| M-126-NOW | 126: `now()` for `statement_timestamp()`, body md5 refreshed in 126, 125's replacement and `run.mjs` | **1** | 1 | 0 | **2** | — | caught, static and rs |
| M-126-INS | 126: INSERT branch keeps a sent `decided_at` | **1** | 1 | 0 | **2** (the fixture's 2026-09-11 rows meet the CHECK) | — | caught, static and rs |
| M-126-CHK | 126: CHECK loosened by a day, every pin refreshed | **1** | 1 | 0 | 0 | — | caught, static only |

### 2.2 Drifts as later files (appended to 140)

| ID | Drift | mc | rs | static/suite | Verdict |
|---|---|---|---|---|---|
| T1 | 126's body back without the status freeze | **2** (pinned trigger probe: "body differs") | **2** (fixture: "the loader overturned a settled approval request") | — | caught, two layers |
| T2 | CHECK dropped and re-added `NOT VALID` | **2** (pinned check probe, by name) | 0 | — | caught |
| T3 | `alter column created_at drop not null` | 0 | 0 | — | survives; the CHECK is then NULL for a NULL `created_at` (F8) |
| T4 | a second BEFORE INSERT OR UPDATE trigger, sorting first | **2** ("unpinned: CREATE TRIGGER a_q0_first …") | 0 | — | caught |
| T5 | `alter function private.set_decided_at() owner to app_worker` | 0 | 0 | — | survives; no live exposure: no role logs in and app_worker has no USAGE on `private` (F8) |
| GGO | `grant update (deleted_at) on app.calendar_items to authenticated with grant option` | 0 | 0 | — | survives the allowlist (F7) |
| XRULE | an INSERT RULE on approval_requests whose DO ALSO UPDATE approves the row as its creator | 0 | **2**, only by a confound (below) | 0 / 0 | survives every layer but one, by accident (F5) |
| X1 | `set standard_conforming_strings = off;` then `select '\''; \! touch <file>` then `-- '` | **0, the file was created** | 0 | 0 / 0 | **survives every layer; a shell command ran** (F1) |
| X1B, X1C, GANON, GREF, CV2, GDEL | the exposure drifts above, with no mutation | **2** each, by name; no file created | — | — | caught as built (the controls for 2.1) |

### 2.3 Behaviour, live, as the superuser (fires triggers; measured)

| ID | Action on a migrated, fixture-loaded database | Result |
|---|---|---|
| X2 | `update app.approval_requests set content_item_id = <another item>, content_version_id = <its version>` on the APPROVED request `87f78e21…` | **UPDATE 1**; status `approved`, `decided_by` and `decided_at` unchanged (F2) |
| X3 | delete the `changes_requested` request's events and the request, insert it back as `approved` | INSERT 1, `approved` under the original decider, timed now. Without deleting the events, the FK refuses (X3b) |
| XRULE-live | with XRULE's rule (keyed on a session setting), `user_editor_a` (an editor, not an approver) inserts a pending request | the row comes back **`approved`, `decided_by` = the editor**, timed |

### 2.4 Are the drifts refused for the right reason? (measured + read)

As built, every one of the fourteen probes' drifts is refused, and the refusal now has to carry every
object the drift names, one ERROR line, the nonce marker after the drift and no closing marker. I
confirmed the matcher is load-bearing: removing the names, the one-ERROR rule or the closing-marker
rule each fails static (M-VERD-*). A drift that raises for itself never reaches the nonce marker, and
a drift cannot print the nonce. **But a forged refusal still passes** when the drift is a superuser
statement that the probe then executes: M-FORGE (F3).

I also checked the route the plan names for that limit: replacing a built-in `pg_catalog` function.
`create or replace function pg_catalog.split_part(text, text, integer) …` succeeds in the catalog,
but the call still runs the built-in, because the function manager dispatches a built-in OID to the
compiled function. The route that works is a NEW, better-matching overload in `pg_catalog` (M-FORGE).

---

## 3. Findings, graded

### F1 -- LOW. `psqlLex` is not psql's lexer when `standard_conforming_strings` is off, so a migration still runs a shell command at migrate-clean; and the static suite does not hold two lexer rules (measured)

`scripts/db/psql-driver.mjs:305-378`, `:339`. psql chooses its string rules from the server's
`standard_conforming_strings`, which a migration may `SET`. psqlLex always lexes as if it were on.
X1 (`set standard_conforming_strings = off;` then `select '\''; \! touch <file>`) passes every layer.
**The file was created:** psql read `\'` as an escaped quote, closed the literal, and executed `\!`.
psqlLex read one literal running to the `'` in the next line's comment. The claim in the plan, the
commit, the README and blocker 186 that psqlLex "refuses a psql meta-command anywhere psql would execute
one" is false as stated.

Separately, the static suite's twelve lexer shapes (`foundation-contract.test.mjs:2155`) include no
standard literal that ends in a backslash and no identifier containing `$`. So M-LEX-E and M-LEX-DQ,
each a one-line lexer change, pass static, suite, mc and rs, and each lets a meta-command run (X1B and
X1C: refused as built, executed with the mutation).

The class is Q0 F4 on batch 125 (LOW), which this batch set out to close. It needs an edit in the diff.

**Remedy.** Refuse any statement that sets `standard_conforming_strings` (or `SET`/`set_config` of it)
in every SQL source psql is fed, or have psqlLex end the scan, failing closed, at such a statement.
Add `["select '\\'; \\! x\n-- '", 1]` and `['select 1 as x$a$; \\! x\n-- $a$', 1]` to the shapes.

### F2 -- LOW. A settled request's outcome is frozen, but what it approved is not: a non-client writer re-points an approved request to another item and version under the original decider's name and time (measured)

`db/foundation/migrations/126_approval_decision_frozen_for_every_writer.sql:57-62`. The freeze reads
`status`, `decided_by` and `decided_at` only. X2: as the superuser, an approved request's
`content_item_id` and `content_version_id` moved to another item: UPDATE 1, still `approved` by the
same decider at the same time. In effect a different version is approved with nobody having decided
it. This is A1 V1's class (LOW, non-client writers: the loader, the superuser and a future RFC-2026-023
command role). A client cannot do this, because the settled-row closure refuses the row. The header's words "keeps its
outcome" are true of the three columns and say nothing about the subject. X3 is the same overturn by
delete and re-insert, which needs the request's events deleted first. That is a separate,
pre-existing gap: `approval_events` is append-only for clients by grant, and a superuser deleted from
it.

**Remedy.** Once `old.status <> 'pending'`, refuse a change to every column except `updated_at`,
`updated_by` (and whatever batch 160's anonymisation needs, item 16), or at least to
`content_item_id`, `content_version_id`, `policy_version_id`, `workspace_id`, `business_profile_id`,
`requested_by`. Add the move to the 090 fixture's loader block.

### F3 -- LOW (disclosed by the plan, mechanism misdescribed). The verdict still counts a forged refusal from a superuser drift that adds a better-matching `pg_catalog` overload (measured)

`scripts/db/run.mjs:787` (`probeJobScript`), `:752` (`driftHazards`). M-FORGE silenced the grant
probe's column rule and gave it the drift `create function pg_catalog.format(text, name, name) …
raise exception '<prefix>: <the three names>'`. The drift does not raise, so the nonce marker prints.
`set local search_path = pg_catalog` does not help, because the overload is in `pg_catalog`. The probe's
`format('%s.%s', n.nspname, c.relname)` then resolves to it and raises the exact message with one
ERROR line. Static 0, suite 0, mc 0, rs 0, and the claim read "refused each of its 2 drifts". **With
the mutation, C0's d3 (`grant insert (deleted_at)` on calendar_items) passed migrate-clean**; unmutated
it fails by name.
The plan's §3 says "a superuser drift can still forge … by replacing a pg_catalog function". Replacing
a built-in does not work (section 2.4); adding an overload does. It needs a `run.mjs` edit, a digest
and a manifest change, all in the diff, which is why it is LOW.

**Remedy.** Treat as a drift hazard any statement head that creates or alters an object in
`pg_catalog` or `information_schema`. Alternatively, have the job script check, after the drift and before
the probe, that no `pg_proc`, `pg_operator` or `pg_cast` row in `pg_catalog` has an OID at or above
16384. A run-time check holds even against a drift the static rule misses.

### F4 -- LOW. Item (19) holds the LIKE line, but a narrowing on the next line passes, and with it a client-writable `decided_by` with no closure (measured)

`test-kits/db/foundation-contract.test.mjs:2549`, `run.mjs:240`. The assertion refuses `attname =`,
`in` and `~`. M-CV2 adds `and a.attname not like 'decided%'` on its own line with the digest
refreshed. Static, suite, mc and rs all pass, and with it a later file's
`knowledge_items.decided_by`, client-updatable, passes migrate-clean (the same drift unmutated: mc 2 by
name). It is the same class as Q0 F5 on batch 125. `<>`, `not like`, `!~` and `similar to` all pass
the assertion.

**Remedy.** Assert that the probe's WHERE clause has exactly the expected predicate set, for
example by matching the whole `where … and not (format(…` block text. Or add a drift that grants
UPDATE on a new `decided_by` column, so the live layer holds the generality.

### F5 -- LOW (pre-existing class, not introduced by 126). No layer reads RULES on a pinned table; one let an editor self-approve, caught only by a fixture confound (measured)

The pinned trigger probe (`run.mjs:447`) reads triggers. XRULE is a later file adding `create rule …
on insert to app.approval_requests where current_setting('q0.self_approve', true) = 'on' do also update
… set status = 'approved', decided_by = new.created_by …`. It passes migrate-clean, static and the
suite. Live, `user_editor_a`, who holds no decide right, inserted a pending request and got it back
approved under their own name: the rule action runs as the table owner, a superuser, so the decide
policy never applied. rls-smoke failed only because the 090 fixture's INSERT uses `ON CONFLICT`, which
PostgreSQL refuses on a table with INSERT or UPDATE rules. A DELETE rule, or a fixture without
`ON CONFLICT`, would not meet it.

**Remedy.** A catalog rule: no `pg_rewrite` row on any `app` or `private` table other than a view's
`_RETURN`, with its drift.

### F6 -- INFO. The record's claims, checked (read + measured)

True as measured: the commit messages' counts (14 probes, 48 blocks, 1058 cases, 675 tests, assertion
floor 418 by the guard; static 72 of 72); the handoff's test entries; the scope result; the branch slot
move; that 091's migration is not rewritten; and that CI and `VERIFICATION.md` are untouched. The
plan's negative controls that I reproduced in substance all failed where the plan says they do: T1 ≈ D15a (rs 2 on the
fixture), T4 ≈ D13a (mc 2 by name), GDEL ≈ G1, cv2 and gref as later files (mc 2).
Overstated: item (12)'s "anywhere psql would execute one" (F1), and the §3 mechanism for (11)'s limit (F3).
Blocker 186's CLOSED BY BATCH 126 paragraph repeats (12)'s words, so it carries F1's overstatement. Its
other items match what I measured.

The disposition is an honest transcription as far as I can check it. It quotes both Owner phrases
verbatim, glosses them accurately, and says in terms that A0 executed and did not decide, that RFC-2026-002's
literal rule is not met when A0 presses the button, and that RFC-2026-025 §5 stays open. I checked #164's facts on
GitHub: merged 2026-10-03T07:02:38Z, merge commit `e5380b0`, head `7c1537a`, and check run 37103243716
`success` on `7c1537a` (updated 06:33:59Z). I cannot see the Owner's session. The second phrase is
word for word the request the harness relayed to this run. O1-O4 are marked UNANSWERED, and I found
no claim that any is answered.

### F7 -- INFO. Two holes in the allowlist (measured)

`run.mjs:573`: the static suite pins the table-level privilege list, MAINTAIN included, but not the
column-level list. M-GR-REF drops REFERENCES and passes static and live, after which
`grant references (id)` passes. Exposure is small: a client role cannot create a referencing table.
`has_*_privilege` does not read grant options, so GGO (`… with grant option`) passes. No client role
can issue a GRANT today. Remedy: assert the four column privileges and read `… WITH GRANT OPTION` too.

### F8 -- INFO. Two later-file weakenings with no exposure today (measured)

T3: if `created_at` loses NOT NULL, `CHECK (decided_at >= created_at)` is NULL, not false, for a NULL
`created_at`, so it admits anything. T5: a change of `set_decided_at`'s owner is pinned by nothing. The
pinned trigger probe checks body, security, `search_path` and PUBLIC EXECUTE, not the owner. An owner
could `DROP … CASCADE` the trigger, but no role logs in and app_worker has no USAGE on `private`.
Remedy: pin the owner beside the digest, and NOT NULL on the columns the CHECK reads.

---

## 4. Stop-the-line verdict

**No stop-the-line condition found in batch 126.**

- No tenant leakage, no secret exposure, no migration divergence, no irreversible deletion, no lost
  job. The settled-row freeze holds for every writer that fires triggers on the three columns it names
  (T1 fails two layers; the fixture's loader is refused on every rs run). The CI negative control for
  approval_requests and calendar_items still fires on its own family.
- Every new survivor (F1, F3, F4, M-LEX-*, M-GR-REF) needs an edit that shows in the diff: a
  migration that sets `standard_conforming_strings`, a `run.mjs` or lexer edit with its digest and
  manifest, or a test edit. F2 and X3 need a non-client writer with superuser-class rights. F5 needs
  a later file and is caught today, by accident, on rls-smoke.
- **Nothing I found blocks the Owner's merge as a stop-the-line.** Whether F1-F5 are fixed before or
  after merge is the Owner's decision. I would fix F1 first: it is the one claim of this batch that
  is false as written, and it keeps a green run over a shell command. F2 is second, because it is the
  same freeze one column wider. The Owner's open O1-O4, the C0 and A1 role runs, and the Integration
  Owner evidence gap (blocker "NO INTEGRATION OWNER EVIDENCE") are gates of RFC-2026-002 and
  RFC-2026-025 §5. They are not findings of this test.

---

## 5. Limits

- The workflow A0 wrote named my starting classes, and I share A0's model family. F1 came from asking
  what makes psql's lexer differ from a static one; F2 from asking which columns "the outcome" leaves
  out; F3 from asking how a drift can raise without raising; F5 from asking what else rewrites a write
  besides a trigger. Anything neither of us thought of is not here.
- The drift method appends to `140_audit.sql`. XRULE's rs failure is a confound of the 090 fixture, not
  a control.
- I did not run CI. I read the green `bootstrap` on `8932e61` from GitHub and reproduced the negative
  control for two families locally, not all of them.
- I did not re-run A1's two-session V5 scenario, any of the plan's mutations by their exact text, or
  `npm run check` on the subject itself (`npm run verify` on the branch name, which runs the suite, was 0).
- 36 cluster rounds, 16 mutation runs with static and suite, and 4 live behaviour scripts. They are a
  sample, not a proof.
