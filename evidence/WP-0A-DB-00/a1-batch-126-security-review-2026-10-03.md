# A1 Security/Privacy review: batch 126 (`f421764`, handoff `8932e61`)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-batch-126`, PR #165
(<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/165>, Draft, open), head
`8932e611551acddcc4b417129c4b45632fccfa35` (the handoff alone) over code commit
`f421764d5a8675b5015d3a1581f2755038cf9ddb`, base `e5380b0` (`main`, the merge of #164). I checked the head
out in my own worktree as the local branch `review/a1-batch-126`.
Author: `/claude/a0_atlas`
Date: 2026-10-03
Scope: blocker 186 items (11)-(14), (15) without its command-role half, and (17)-(19); the two batch 091
items (pinned grant probe, pinned default probe); migration 126; the plan, the disposition, the blocker
edits, the commit messages and the handoff.

**This document records findings. It advances no package status, signs nothing on anyone's behalf,
writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the Product
Owner's disposition, not the disposition.

---

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author of the change under review. I ran in a worktree of
A0's repository, under a brief A0's workflow wrote, and I am the same vendor and model family as A0.
RFC-2026-024 withdrew the cross-vendor condition, so that fact does not by itself disqualify this
review. It does mean the Author chose what to point me at. **Whether this review is accepted as the
Security/Privacy role's signature is for the Integration Owner (`/claude/r0_steward`) and the Product
Owner to decide.** Neither A0 nor I can decide it.

## 1. How I measured, and what is measured [M] versus read [R]

**Environment [M].** PostgreSQL 17.11 from `/opt/homebrew/bin`, a private cluster on 127.0.0.1:5501, TCP
only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres` afresh for every round,
`LC_ALL=C`, the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres make db-migrate-clean` and `make db-rls-smoke`.
Node 24.20.0. Each drift was APPENDED to `db/foundation/migrations/140_audit.sql` from a saved copy
(sha256 `2ac596bb…c1ad37149`) and restored byte for byte after every round; the sha256 was printed after
each round and is the saved one at the end. Static runs (`node --test
test-kits/db/foundation-contract.test.mjs`) used the same append-and-restore. Scratch files lived only in
my private directory. The cluster was stopped and its data directory removed at the end; port 5501 is
free. No other port was touched.

**Baseline on `8932e61` [M].** `db-migrate-clean` exit 0: 14 catalog probes, each "refused each of its
drifts; clean again after every drift"; post-migrate pass 48 blocks, 37 as written, 11 superseded and
replaced. `db-rls-smoke` exit 0, **1058** cases, and exit 0 again, 1058, run a second time on the same
database (round B1). Static suite 72 of 72.

**Repository commands, on a clone on the branch NAME [M].** A clone of the worktree in my private
directory, `git checkout -b agent/claude/WP-0A-DB-00-batch-126 8932e61` (not detached), `origin/HEAD` set
to `origin/main` = `e5380b0`:

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs e5380b0 WP-0A-DB-00` | 0 | all 18 changed path(s) are declared, and every amendment explains one |
| `npm run verify` | 0 | clean: tests 675, pass 675, fail 0 |
| `npm run check:handoff` | 0 | describes the branch: nothing substantive after its cited head |

(Before I pointed `origin/HEAD` at `main`, `check:handoff` exited 91 because a fresh clone's `origin/HEAD`
followed the source worktree's HEAD, `8932e61`. That is my clone's setup, not the branch.)

**GitHub [M, via `gh`].** PR #165 is a Draft, head `8932e61`, its `bootstrap` check passing (run
37106223881). PR #164 was merged 2026-10-03T07:02:38Z at head `7c1537a`, and run 37103243716
("Bootstrap validation") concluded `success` on `7c1537a` at 06:33:59Z; `e5380b0`'s parents are
`86f55d2` and `7c1537a`.

**Read [R].** The plan, the disposition, the diff `e5380b0..8932e61`, blocker 186 and blocker 191's new
paragraphs, migration 126, `psqlLex`, the probes and the verdict in `scripts/db/run.mjs`, the 090
fixture's new block, the batch-125 reviews (C0, A1, Q0) and my batch-091 third-round re-check.

## 2. The brief's questions

### Q1. Can a settled approval decision still be changed by a writer that fires triggers? Items 13 and 14?

Measured as `postgres` (superuser: bypasses RLS, fires triggers; the 090 loader's class) on the migrated,
fixture-loaded database, each in a rolled-back transaction [M]:

| # | Write | Outcome |
|---|---|---|
| T1 | `UPDATE … set status = 'changes_requested'` on the approved request | refused: "a settled approval request keeps its status, decided_by and decided_at" |
| T2 | `INSERT … ON CONFLICT (id) DO UPDATE set status = …` on it | refused, same message |
| T3 | `MERGE … WHEN MATCHED THEN UPDATE set decided_at = '2001-…'` | refused, same message |
| T4 | `DELETE` the approved request, then `INSERT` it again, same id and decider, `status = 'changes_requested'` | **accepted**: approved -> changes_requested under the original approver's id; `decided_at` became the statement's time |
| T5 | `INSERT` a request born `approved` with `decided_by` = an arbitrary uuid, `decided_at` and `created_at` = 2001 | **accepted**: `decided_at` replaced by the statement's time, `created_at` kept at 2001, decider kept |
| T6 | a client editor cancels a pending request sending `decided_at = '2999-…'` | refused by `approval_requests_decider_is_a_pair` (23514) |
| T7 | `set local session_replication_role = replica`, then T1 | accepted (inherent to a superuser; recorded by A0, plan §3) |
| T8 | table-level UPDATE / DELETE / INSERT on `app.approval_requests` for `app_command`, `app_worker`, `app_maintenance`, `service_role`, `authenticated` | all false |

So UPDATE, upsert and MERGE are frozen; DELETE-and-reinsert and a pre-settled INSERT are not. Only the
table owner and a superuser can take T4 or T5 today (T8; 090's block asserts no role holds DELETE), and
both can switch triggers off anyway (T7). That is F2.

Catalog drifts, each a later file on a fresh cluster [M]:

| Drift | mc | rs | What refused it |
|---|---|---|---|
| T-ER `alter table app.approval_requests enable replica trigger set_decided_at` | 2 | 2 | trigger probe, "trigger(s) not enabled: … set_decided_at (tgenabled R)"; rls-smoke because the 090 fixture's 2026-09-11 times then hit the new CHECK |
| T-PSET `grant set on parameter "Session_Replication_Role" to public` (mixed case, PUBLIC) | 2 | 0 | trigger probe, "… through a parameter grant by: PUBLIC (SET)" |
| T-AOWN `alter table app.approval_requests owner to app_command` | 2 | 2 | 090's block and its replacement (every identity column "updatable … to app_command"); rls-smoke, the fixture loader lost schema access |

A second trigger and a re-pinned body (A0's D13a, D15a) I read and did not re-run. A function with
`SET session_replication_role` in its `proconfig` is refused either by the SECURITY DEFINER probe (any new
definer) or by the pinned trigger probe (any trigger function whose `proconfig` is not exactly
`search_path=""`) [R].

### Q2. Does the psql meta-command scan (item 12) refuse every backslash psql would execute?

**No.** `psqlLex` (`scripts/db/psql-driver.mjs:305`) refuses the shapes the reviews of 125 measured, and I
confirmed the shapes the brief named: a backslash in a nested comment, a dollar-quoted body, a quoted
identifier (`"a\b"`) and an `E''` literal with `\'` is text, and a backslash after a closed `E''` or
`U&''` is caught [M, static]. But three shapes where psql's own lexer ends a literal or comment earlier
than `psqlLex` does let a shell command through every scan. Each is in F1:

| Round | Appended to 140 | `psqlLex` | static | mc | rs | shell command ran |
|---|---|---|---|---|---|---|
| L1 | `select 1.e'\' \! touch <private file>` then `';` | 0 meta-commands | 72/72 | 2 (trailing junk, after the command) | 2 | **yes** |
| L2 | `set standard_conforming_strings = off;` then `select 'x\' as a, ' \! touch <private file>` / `as b;` | 0 | 72/72 | **0** | **0** | **yes** |
| L3 | `select 1 as one; -- a comment` CR (no LF) ` \! touch <private file>` | 0 | 72/72 | **0** | **0** | **yes** |

The same lexer gates the fixtures, the helper, the replacements and the drifts, so the same shapes pass
there [R]; a replacement must also be exactly one `do $$ … end $$;` block, which leaves no room outside
the body for them [R].

### Q3. Can a drift still be counted as refused when it was not (item 11)?

Not by any route I found short of a superuser drift rewriting the catalog. The count needs P0001, the
rule's prefix, every `names` entry, exactly one `ERROR:` on stderr, the opening and nonce markers on the
same transaction id, and no closing marker (`run.mjs:373-431`) [R]. A drift cannot print the nonce. A
forged `ERROR:` line makes the count two, which fails. A transaction ended by a drift changes the id. The
probe runs under `search_path = pg_catalog`, so a `pg_temp` function or relation cannot shadow what it
calls. I tried the route A0's plan §3 names, a drift replacing `pg_catalog.split_part(text, text,
integer)` under `set local allow_system_table_mods = on`. In my one attempt the call still resolved to the
built-in [M], so I demonstrated nothing either way. The limit stands as A0 recorded it, and the static
digest over each probe's SQL, drifts, prefixes and names (`foundation-contract.test.mjs:2507`) is the
layer that sees a drift being edited.

### Q4. Does the 091 grant allowlist catch my R1 and R3 drifts?

**Yes.** Each drift was a later file [M]:

| Drift | mc | rs | Refusal |
|---|---|---|---|
| G-R1: TRUNCATE, TRIGGER, REFERENCES, MAINTAIN on calendar_items to authenticated; `grant all` on content_schedules to service_role (my R4 d11) | 2 | 0 | "table-level privilege(s) … not exactly its allowlist: unlisted: authenticated MAINTAIN …, REFERENCES …, TRIGGER …, TRUNCATE …; unlisted: service_role DELETE/INSERT/MAINTAIN/…" |
| G-R3: UPDATE(created_at) on content_schedules, INSERT(deleted_at) on calendar_items, to authenticated | 2 | 0 | "column privilege(s) … unlisted: authenticated INSERT (deleted_at) on app.calendar_items; unlisted: authenticated UPDATE (created_at) on app.content_schedules" |
| G-PUB: `grant select (id) on app.calendar_items to public` | 2 | 2 | every non-superuser role named as unlisted |
| G-OWN: a new NOLOGIN role made the owner of calendar_items | 2 | 0 | all eight table privileges, named for the new role |
| G-GO: `grant update (timezone) … to authenticated with grant option` | **0** | **0** | nothing (F3) |

### Q5. Anything newly opened?

Nothing reachable by a client or a service role. Migration 126 opens no path: the INSERT branch only
overwrites `decided_at`, the UPDATE branch only adds refusals, the function keeps SECURITY INVOKER, an
empty `search_path` and no PUBLIC EXECUTE, and the new CHECK only refuses [M, T1-T6; R]. Batch 126 does
not create the gaps in F1-F3; it narrows each class. What it does add is a record that calls item (12)
closed in words the code does not meet (F1).

### Claims checked

- **Commit messages [M].** `f421764`: 14 probes, 48 blocks, 1058 cases, floor 365 -> 418, branch slot
  batch-091 -> batch-126. All reproduced, except that I took 418 from the diff and not from a run of the
  guard. The (12) sentence "refuses a psql meta-command anywhere psql would run one" is false (F1).
  `8932e61` changes only the handoff [M].
- **Plan [M/R].** §1-§6 match the code and what I re-measured. §2 row (12) says "any backslash psql would
  execute", which F1 refutes. §3's limits are accurate and complete except for F1-F3.
- **Disposition [R].** The words `ใช่ merge ทำต่อได้เลย` match, character for character, the Owner's
  message the workflow relayed to me. I cannot see the session that holds `งานอะไรกระจายทำได้ทำเลยนะครับ`
  and did not verify it. The merge facts (head `7c1537a`, run 37103243716, `e5380b0` at
  07:02:38Z) match GitHub [M]. The file says plainly that A0 executed the merge and did not decide it,
  and that RFC-2026-025 §5 and the literal RFC-2026-002 sentence remain unmet. O1-O4 are all marked
  UNANSWERED. As far as I can check it, the transcription is honest.
- **Blocker 186 [R].** The "CLOSED BY BATCH 126" paragraph is accurate for (11), (13), (14), (17), (18)
  and (19). For (12) it repeats the claim F1 refutes. For (15), "freezes … for every writer that fires
  triggers" holds for UPDATE-shaped writes and not for DELETE-and-reinsert or a pre-settled INSERT (F2).
  **Blocker 191 [R]**: the new paragraph matches Q4.
- **Handoff [M/R].** Its tests field matches what I re-ran: verify 675, scope 18 paths, migrate-clean 14
  probes and 48 blocks, rls-smoke 1058 twice. `check:handoff` passes on the branch name.

## 3. Findings

### F1: LOW (measured). `psqlLex` is not psql's lexer, and three shapes run a shell command from a migration past every scan, two of them with every layer green

**Where.** `scripts/db/psql-driver.mjs:324` (a `--` comment runs to `\n` only), `:339` (an `e'` counts as
an E-string whenever the character before the `e` is not an identifier character), and the whole function's
assumption that `standard_conforming_strings` is on. The callers are `run.mjs:2117`
(`metaCommandFindings`, migrate-clean), `postMigratePlan`, `rls-smoke.mjs` (helper and fixtures),
`unsafeDrifts`, and the static rule at `foundation-contract.test.mjs:2147-2159`.

**What.** psql's lexer (psqlscan.l) differs from `psqlLex` in at least three places, and each one makes
psql leave a literal or a comment where `psqlLex` stays inside it:

1. **Bare CR (L3).** psql's `--` comment is `--[^\n\r]*`, so a carriage return ends it.
   `select 1 as one; -- a comment\r \! touch f` runs `touch`. Measured: migrate-clean 0, rls-smoke 0
   (1058), static 72/72, file created.
2. **`standard_conforming_strings = off` (L2).** psql reads the server's setting when it sets up each line,
   so after `set standard_conforming_strings = off;` a backslash escapes a quote in a plain literal.
   `select 'x\' as a, ' \! touch f` is then one literal followed by a meta-command for psql, and an open
   literal for `psqlLex`. Measured: migrate-clean 0, rls-smoke 0, static 72/72, file created.
3. **Numeric junk (L1).** In PostgreSQL 15 and later, `1.e` is a single junk token, so in `1.e'\'` the
   quote opens a standard literal. `psqlLex` reads it as an `E''` literal. The meta-command runs while
   psql is still lexing, before the server rejects the junk. Measured: migrate-clean 2, but only after the
   file was created.

The plan's D12 guarantee, refused before anything is applied and the file not created, therefore holds
for the measured shape and not for the class. Blocker 186, the plan (§2) and `f421764`'s message all
state the class.

**Severity.** LOW, the grade Q0 F4 and A1 V4 gave this class on 125. Writing a migration already means
writing to the repository, where `npm run check` runs repository JavaScript, so this guard keeps the
SQL reviewable rather than standing as a trust boundary. No secret, tenant or data path is involved. The
batch is strictly better than `main`, whose rule read only lines beginning with a backslash and misses all
three shapes too.

**Remedy (any one closes the measured shapes; the first fails closed):**
(a) refuse every backslash outside dollar-quoted bodies and comments, inside plain and `E''` literals
included, in every source psql is fed, and rewrite the one probe literal that needs one (`'%\_by'`)
without it, for example `like '%' || chr(92) || '_by'` or `E'%\\_by'` with E-strings also refused;
(b) refuse any `\r` not followed by `\n`, end `--` comments at `\r` as psql does, refuse any statement
that names `standard_conforming_strings` (SET, `set_config`, ALTER ROLE/DATABASE), and recognise `e'`
as an E-string only where psql does, so not after `<digits>.`;
(c) add L1-L3 to the static shapes at `foundation-contract.test.mjs:2155` and to the live D12 round.
Until one lands, correct blocker 186's (12) sentence and the plan's §2 row to "the shapes measured", not
"anywhere psql would execute one".

### F2: INFO (measured). The freeze covers UPDATE, upsert and MERGE. A writer holding DELETE can reverse a settled decision by deleting and re-inserting it, and a pre-settled INSERT names any decider

**Where.** `db/foundation/migrations/126_approval_decision_frozen_for_every_writer.sql:53-56` (the INSERT
branch times a decision and accepts any non-pending status and any decider) and `:82-84` (no DELETE
event).

**What.** T4: an approved request was deleted and re-inserted with the same id and approver as
`changes_requested`, and `decided_at` moved to the statement's time. T5: a request was inserted already
`approved`, under an arbitrary decider uuid, with `created_at` 2001. Every layer allows both.

**Why INFO.** No non-superuser role holds DELETE on the table, or INSERT on `status` or the decision
columns (T8; 090's block asserts the DELETE half). The only writers that can take this route are the
owner and a superuser, who can also turn triggers off (T7). O3 and O4 already put the INSERT-side
trade-off to the Owner.

**Remedy, when RFC-2026-023 names a command role:** grant it no DELETE on `app.approval_requests` and no
INSERT on `status`, `decided_by` or `decided_at`. If it needs either, add a BEFORE DELETE refusal for
non-pending rows and make the INSERT branch refuse a non-pending status from any writer but the fixture
loader. Meanwhile word blocker 186's (15) and 126's comment as "for every UPDATE, upsert or MERGE by a
writer that fires triggers".

### F3: INFO (measured). The grant allowlist compares privileges and not grant options

**Where.** `scripts/db/run.mjs:560` and `:574` (`has_table_privilege` / `has_column_privilege` with
the bare privilege name).

**What.** G-GO, `grant update (timezone) on app.calendar_items to authenticated with grant option`,
passes migrate-clean and rls-smoke. A holder of the option can pass the privilege on to any role at
runtime. Clients have no SQL surface on which to issue a GRANT, so nothing reaches this today.

**Remedy.** In both rules, also require `has_*_privilege(r, …, '<priv> WITH GRANT OPTION')` to be false
for every role, or read `is_grantable` from `aclexplode`, with a drift.

## 4. Stop-the-line verdict

**None.** Nothing I measured exposes a secret, crosses a tenant, duplicates an external side effect,
loses a job, diverges a migration or deletes irreversibly. F1 is a guard on repository content that
repository code can already bypass, and the batch improves on `main`. F2 needs a role that does not
exist. F3 has no client SQL surface.

**Does anything block the Owner's merge?** In my view, no, with one condition on the record. Blocker 186
should not keep saying (12) is closed "anywhere psql would execute one". Correcting that sentence, or
landing F1's remedy, can come before or after the merge, and the Owner decides which. O1-O4 remain the
Owner's, unanswered. The C0 and Q0 runs are still owed under RFC-2026-002, and so is Integration Owner
evidence (blocker "NO INTEGRATION OWNER EVIDENCE").

## 5. Limits

- I measured on one PostgreSQL build (17.11, Homebrew, macOS), with psql from the same build. The CI
  runner's psql may differ, and I did not measure F1 there.
- I tried one route for the forge in Q3 and it did not take effect. That shows nothing either way.
- I did not re-run A0's D13a, D15a, D17, D18, G1-G5, TZ or the eleven code mutations; I read them. My
  own drifts overlap G1-G3 and add G-PUB, G-OWN, G-GO, T-ER, T-PSET and T-AOWN.
- I did not review the post-migrate replacement for 125's block, the `fails_with` matcher change or the
  catalog snapshot for contract fidelity (C0's scope), and I did not mutation-test the static suite
  (Q0's scope).
- The rls-smoke rounds load the fixtures through the loader as `postgres`. I measured no command role,
  because none exists.
- The Owner's `งานอะไรกระจายทำได้ทำเลยนะครับ` is outside what I can see.
