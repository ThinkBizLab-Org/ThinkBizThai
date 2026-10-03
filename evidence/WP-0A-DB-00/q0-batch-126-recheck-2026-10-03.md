# Q0 re-check: batch 126's review round (narrow)

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`. This file comes from a distinct run of it.
Subject: branch `agent/claude/WP-0A-DB-00-batch-126`, Draft PR ThinkBizLab-Org/ThinkBizThai#165, head
`aacb62840314a9eebb72fb8f7b7e69021c79d3ca` (the handoff, alone) over `3c8a494` (the record) and
`d482700` (the round's code), previous reviewed head `8932e61`, base `e5380b0`.
Scope: NARROW. The review round's corrections only (`git diff 8932e61..aacb628`), measured against my
earlier evidence `evidence/WP-0A-DB-00/q0-batch-126-test-review-2026-10-03.md` (F1-F8).
Author: `/claude/a0_atlas`.
Local test branch: `recheck/q0-batch-126-r2`, checked out at `aacb628` in my own worktree. Every
mutation and drift ran in a private clone on the branch NAME `agent/claude/WP-0A-DB-00-batch-126`;
the worktree's source files were never edited.
Date: 2026-10-03.

**This document RECORDS TEST RESULTS.** It advances no package status. It writes `test_verified`
nowhere, signs nothing on anyone's behalf, and repairs nothing.

"(measured)" = I ran it on the declared toolchain and a private cluster; the numbers are this run's.
"(read)" = I read it in the code or a record and did not run it.

---

## 0. What I am

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`**, in a worktree and under a brief that
A0's workflow computed. The brief chose the subject, the port (5503), the cluster recipe, this file's
name and the items to re-run (X1, X2, M-FORGE, M-CV2, the RULE exposure, M-LEX-E, M-LEX-DQ, M-GR-REF,
GGO, T3, T5, plus two fresh mutations per new rule). A0 wrote the change under test, and the change
answers my own findings on this batch.

**I am the same vendor as the Author (Anthropic) and the same model family.** RFC-2026-024 is approved
and withdrew the cross-vendor condition; CONTRIBUTING_AGENTS.md's separation of duties (four distinct
`agent_run_id`s, no run approves, test-verifies, integrates or gate-approves its own work) remains.

**Whether this file is accepted as the Tester's signature is the Integration Owner's and the Product
Owner's act, not mine.** I merged, pushed and approved nothing.

---

## 1. How I measured (measured)

- PostgreSQL 17 from `/opt/homebrew/bin`; `initdb --locale=C -A trust -U postgres`; `LC_ALL=C`;
  127.0.0.1:5503 only, TCP only (`-c unix_socket_directories=''`); the shim
  `db/foundation/ci/supabase-shim.sql` first; then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres
  make db-migrate-clean` and `make db-rls-smoke`. A fresh `initdb` every round. No other port was
  contacted.
- Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`, matching `.node-version`).
- Private directory `.../scratchpad/q0-126r2/` (scripts `round.sh`, `drift.sh`, `mut.sh`, `mutate.mjs`,
  `mutations.json`, `batch.sh`; drift files under `d/`; logs under `logs/`). Not part of the repository.
- Drifts were APPENDED to `db/foundation/migrations/140_audit.sql` in the clone after a saved copy,
  and restored byte for byte after every round: SHA-256
  `2ac596bb950e8dfb11d9e45172f24305698ecddb4d3e8380114e2bfc1ad37149` before the first round and after
  the last, in the clone and (never edited) in the worktree.
- Code mutations were applied in the clone by a script that refreshed every digest the edit moved
  (the probe digests in `foundation-contract.test.mjs`; for a 126 body change, the body md5 in 126, in
  125's replacement and in `run.mjs`) and then ran `npm run regenerate:manifest`. Each was undone with
  `git checkout -- .`, and `git status --porcelain` was empty afterwards.
- Every shell-escape drift pointed `\! touch` at a file inside the private directory. Nothing outside it
  was written.
- Layers: **static** = `node --test test-kits/db/foundation-contract.test.mjs`; **suite** =
  `node scripts/run-test-suite.mjs`; **mc** = `make db-migrate-clean`; **rs** = `make db-rls-smoke`.

### Baseline on `aacb628` (measured)

| Command | Exit | Result |
|---|---|---|
| mc, fresh cluster (B0) | 0 | 16 probes, each "refused its drift(s); clean again after every drift" (pinned check 2, security definer 2, trigger 5, pinned trigger 2, pinned grant 3, fk support 2, the rest 1); post-migrate pass 48 blocks, 37 as written, 11 replaced |
| rs, then rs again on the SAME database (B0) | 0, 0 | 1058 isolation cases passed, both times |
| static | 0 | 72 of 72 |
| `node scripts/verify-branch-scope.mjs e5380b0 WP-0A-DB-00` (clone, branch NAME) | 0 | "all 21 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` (clone, branch NAME, origin/HEAD = origin/main = `e5380b0`) | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` (clone, branch NAME) | 0 | "clean: exit 0 — tests 675, pass 675, fail 0" |
| `gh pr view 165`; `gh run list --branch agent/claude/WP-0A-DB-00-batch-126` | | Draft, OPEN, not merged, head `aacb628`; run 37109607517 "Bootstrap validation" **success** on `aacb628` (A0 listed this CI result as not yet confirmed; it is green now) |

A0's numbers (16 probes, 48 blocks, 1058 twice, 675 tests, 21 paths) match what I measured.

---

## 2. The named re-runs, per layer (measured)

"Exposure" is a drift appended to 140 WITH the mutation in place. It shows whether the live layers
still hold the property after the code layer is weakened. "PWNED" means the drift's `\! touch`
created its file inside my private directory.

### 2.1 Drifts as later files, no mutation (all on `aacb628` as built)

| ID | Drift | mc | rs | Refused by | Round 1 (`8932e61`) |
|---|---|---|---|---|---|
| X1 | `set standard_conforming_strings = off;` `select '\''; \! touch …` `-- '` | **2** | 2 (nothing applied) | the scan, before anything ran: the setting named (lines 1019, 1022) and `\'` in a plain literal (1020); no file | mc 0, **file created** |
| X1B | `select '\'; \! touch …` / `-- '` | **2** | 2 | the scan: `\'` in a plain literal, and the `\!`; no file | mc 2 |
| X1C | `select 1 as x$a$; \! touch …` / `-- $a$` | **2** | 2 | the scan: the `\!`; no file | mc 2 |
| XCR | a `--` comment ended by a bare CR, then `\! touch …` | **2** | 2 | the scan: "a bare carriage return"; no file | — |
| XSCS | mixed-case `SET Standard_Conforming_Strings = off`, `\'`, `\!` | **2** | 2 | the scan (case-insensitive) and the odd-backslash rule; no file | — |
| XODD3 / XODD3B | three backslashes before the quote, setting turned off by `set` / by `set_config('standard_' \|\| 'conforming_strings', …)` | **2** / **2** | 2 / 2 | the scan; XODD3B by the odd-backslash rule alone (line 1020); no file | — |
| XDOT | `select 1.e'\' ; \! touch …` / `';` | **2** | 2 | the scan: `\'` in a plain literal and the `\!`; no file | — |
| GGO | `grant update (deleted_at) on app.calendar_items to authenticated with grant option` | **2** | 0 | pinned grant probe, as built: "unlisted: authenticated UPDATE WITH GRANT OPTION (deleted_at) on app.calendar_items" | mc 0 (survived) |
| GREF | `grant references (id) on app.calendar_items to authenticated` | **2** | 0 | pinned grant probe, by name | mc 2 |
| GDEL | C0's d3, `grant insert (deleted_at) …` | **2** | 0 | pinned grant probe, by name | mc 2 |
| CV2 | client-updatable `knowledge_items.decided_by` | **2** | 0 | closure coverage probe, by name | mc 2 |
| T3 | `alter column created_at drop not null` | **2** | 0 | pinned check probe's new rule: "pinned NOT NULL column(s) … app.approval_requests.created_at" | mc 0 (survived) |
| T5 | `alter function private.set_decided_at() owner to app_worker` | **2** | 0 | pinned trigger probe: "[owner is not the pinned owner]" | mc 0 (survived) |
| XRULE | the self-approving INSERT rule on `approval_requests` | **2** | 2 (the fixture's ON CONFLICT, the round-1 confound) | rewrite rule probe, by name: `app.approval_requests.q0_self_approve` | mc 0; rs 2 only by the confound |
| RWUPD | an UPDATE rule (`do also notify`) on `approval_requests` | **2** | 2 (confound) | rewrite rule probe, by name | — |
| RWPRIV | a DELETE rule on `private.push_subscription_references` | **2** | 0 | rewrite rule probe, by name | — |
| OWNLOGIN | `create role q0_owner login; alter table app.content_schedules owner to q0_owner` | **2** | 0 | pinned grant probe's first rule: "app.content_schedules (owner q0_owner)" | — |

### 2.2 Behaviour, live, as the superuser on a migrated, fixture-loaded database

| ID | Action | Result | Round 1 |
|---|---|---|---|
| X2 | re-point the APPROVED request `87f78e21…` to another `content_item_id` and `content_version_id` | **ERROR**: "a settled approval request keeps what it decided: every column but updated_at and updated_by" (raised by `private.set_decided_at()`) | UPDATE 1 |
| X3 | delete the `changes_requested` request's events and the request, then insert it back as `approved` | INSERT 1: approved under the original decider, timed now | the same. **Unchanged and disclosed** (C0 F2, A1 F2; plan §7, 126's header, blocker 186 (15)) |
| X3b | the same without deleting the events | refused by `approval_events_request_scope_fk` | the same |

The 090 fixture's new loader block ran on every rs round, twice on one database in B0. It checks that
a `requested_by` change is refused and an `updated_by` change is admitted.

### 2.3 Code mutations named by the brief

| ID | Mutation | static | suite | mc | rs | Exposure with it | Verdict | Round 1 |
|---|---|---|---|---|---|---|---|---|
| M-FORGE | grant probe's column rule silenced (`and false`); drift 3 replaced by `create function pg_catalog.format(text, name, name) … raise exception '<prefix and all four names>'` | 0 | 0 | **2** | 0 | + GDEL: mc **2** | **caught live by the guard**: "drift 3 failed with P0001: object(s) created in pg_catalog … function format(text, name, name)"; "declares 3 drift(s) and 2 were refused" | survived every layer |
| M-LEX-E | every `'…'` read as an E-string | **1** | 1 | 0 | 0 | + X1B: mc 0, rs 0, **PWNED** | caught, static only | survived every layer |
| M-LEX-DQ | dollar tag accepted after an identifier character | **1** | 1 | 0 | 0 | + X1C: mc 0, rs 0, **PWNED** | caught, static only | survived every layer |
| M-GR-REF | REFERENCES dropped from the column rule | **1** | 1 | 0 | 0 | + GREF: mc 0 | caught, static only | survived every layer |
| M-CV2 | `and a.attname not like 'decided%'` added after the LIKE | **1** | 1 | 0 | 0 | + CV2: mc 0 | caught, static only (by the whole-statement assertion) | survived every layer |

"Static only" is a real layer, because `npm run check` and CI both run it. But it is one layer, not
two. With each of these mutations in place the live layers pass the exposure, and for the two lexer
mutations a shell command runs.

---

## 3. Two fresh mutations per new rule (measured)

| Rule | ID | Mutation | static | suite | mc | rs | Exposure with it | Verdict |
|---|---|---|---|---|---|---|---|---|
| lexer: bare CR | L-CR-OFF | CR rule removed | **1** | 1 | 0 | 0 | + XCR: **PWNED** | caught, static only |
| | L-CR-SP | CR rule skips a CR followed by a space | **1** | 1 | 0 | 0 | + XCR: **PWNED** | caught, static only |
| lexer: setting named | L-SCS-OFF | mention rule removed | **1** | 1 | 2 | 2 | + X1: the odd-backslash rule still refuses (line 1020) | caught, static and live |
| | L-SCS-CASE | mention rule made case-sensitive (`/g`) | **0** | 0 | 2 | 2 | + XSCS: the odd-backslash rule still refuses | **survives static**; the other rule holds it live (F2) |
| lexer: odd backslash run | L-ODD-OFF | odd-run rule removed | **1** | 1 | 2 | 2 | + X1B: the `\!` is still seen | caught, static and live |
| | L-ODD-ONE | `run % 2 === 1` narrowed to `run === 1` | **0** | **0** | **0** | **0** | + XODD3B (three backslashes, setting turned off by `set_config` with a concatenated name): **mc 0, rs 0, PWNED** | **SURVIVES every layer, and a shell command ran** (F1) |
| lexer: `.e'` | L-DOT-OFF | `.` rule removed | **1** | 1 | 2 | 2 | + XDOT: mc 2 from the server ("trailing junk after numeric literal"), no file | caught by static; live only by accident |
| | L-DOT-ANY | `,` treated like `.` (fails closed: more literals read as plain) | 0 | 0 | 0 | 0 | — | survives; it over-refuses, no exposure (F2) |
| 126: whole-row freeze | F-EXCL | `content_version_id` added to the exempt columns, every pin refreshed | **1** | 1 | 0 | 0 | + X2: still refused, because X2 also moves `content_item_id` | caught, static |
| | F-APPROVED | the new branch reads `old.status = 'approved'` instead of `<> 'pending'` | **1** | 1 | 0 | 0 | + X2B: a no-op (the fixture row's requester is its own decider), so not a valid exposure | caught by static; rs does not hold it, because the fixture moves only the approved row (F2) |
| pg_catalog guard | G-JOB-OFF | guard removed from `probeJobScript` | **1** | 1 | 0 | 0 | + M-FORGE: mc 0 | caught, static only |
| | G-OID-HIGH | threshold `16384` → `4000000` | **1** | 1 | **2** | 0 | + M-FORGE: mc 2 (the guard's own drift passes) | caught, static and live |
| coverage statement | M-CV2 | (section 2.3) | **1** | | | | | caught, static |
| | CV-RELKIND | `relkind in ('r', 'p')` → `('r')` | **1** | 1 | 0 | 0 | — | caught, static |
| rewrite rule probe | RW-APP | schema set narrowed to `app` | **1** | 1 | 0 | 0 | + RWPRIV: mc 0 | caught, static only |
| | RW-DEL | `and r.ev_type = '4'` (DELETE rules only) | **1** | 1 | 0 | 2 (confound) | + XRULE: mc 0 | caught, static only (the probe's one drift is a DELETE rule) |
| grant owner rule | GO-OWNER-OFF | owner rule can never fire | **1** | 1 | 2 | 0 | + OWNLOGIN: mc 2 by the table-level rule (the owner's implicit privileges read as unlisted) | caught, static and live |
| | GO-OWNER-LOGIN | a LOGIN owner admitted | **1** | 1 | 2 | 0 | + OWNLOGIN: mc 2 by the table-level rule | caught, static and live |
| grant option | GGO-TAB-OFF | table level read without grant option | **1** | 1 | **2** | 0 | — | caught, static and live (drift 2 not named) |
| | GGO-COL-OFF | column level read without grant option | **1** | 1 | **2** | 0 | + GGO | caught, static and live (drift 3 not named) |
| trigger function owner | TO-OFF | `case when pin.fn is not null` → `case when false` before the owner comparison | **0** | 0 | **2** | 0 | + T5 | **survives static**; caught live (drift 2 not named) (F2) |
| | TO-ANYSU | owner compared to "any role" | **1** | 1 | **2** | 0 | + T5 | caught, static and live |
| NOT NULL pin | NN-OFF | `and a.attnotnull` removed | **1** | 1 | **2** | 0 | + T3 | caught, static and live |
| | NN-EMPTY | `PINNED_NOT_NULL = []` | **1** | 1 | **2** (42P18 on the empty array) | 0 | + T3 | caught, static and live |

In all: 32 mutation runs, each with static, suite and a fresh cluster round, and 52 cluster rounds.
`git status --porcelain` in the clone was empty after every mutation, and 140's SHA-256 matched after
the last round. One batch was cut by my own command timeout during L-DOT-ANY. I restored the clone
(`git checkout -- .`, porcelain empty, 140's SHA matched) and re-ran L-DOT-ANY from the start.

---

## 4. Findings, graded

### F1 -- LOW. The odd-backslash rule is held by no layer beyond a run of one: narrowed to `run === 1`, it passes every layer, and a migration runs a shell command at migrate-clean (measured)

`scripts/db/psql-driver.mjs:375`; the shapes in `test-kits/db/foundation-contract.test.mjs:2157-2168`.
Every static shape that exercises rule (c) puts exactly ONE backslash before the quote. L-ODD-ONE
changes `run % 2 === 1` to `run === 1`, a one-token edit. With it, static, the suite, mc and rs all
exit 0. With it, XODD3B (`set_config('standard_' || 'conforming_strings', 'off', false)`, then
`select '\\\''; \! touch …`) passed migrate-clean, and **the file was created**. That drift avoids the
mention rule by concatenating the setting's name, so the odd-run rule is the only defence against it.
Unmutated, XODD3B is refused by that rule (mc 2, line 1020, no file). The code is therefore correct
today; what is missing is a test that holds it. This is the same class as round 1's M-LEX-E and M-LEX-DQ
(F1 there), now one rule over. It needs a code edit that shows in the diff, so LOW, not stop-the-line.
The plan's "M-LEX-ODD … static 1" is true of removing the rule (my L-ODD-OFF: static 1). It is not true
of narrowing it.

**Remedy.** Add a shape with a run of three, for example
`["select pg_catalog.set_config('standard_' || 'conforming_strings', 'off', false);\nselect '\\\\\\''; \\! x\n-- '", n]`,
and an even-run shape that must stay at 0 (`"select 'a\\\\\\\\';"` is the run-of-two case already
present; a run of four would hold the parity).

### F2 -- INFO. Where a new rule rests on one layer, or on another rule (measured)

- **Static only.** For these mutations the live layers pass the exposure, so CI's static step is the
  only thing that catches them: M-LEX-E, M-LEX-DQ, L-CR-OFF, L-CR-SP (each lets a `\!` run), M-GR-REF,
  M-CV2, G-JOB-OFF (with M-FORGE combined: mc 0), RW-APP (a `private` rule passes), RW-DEL (an INSERT
  rule passes). This is by design for the lexer, which no drift can test from inside a migration. For
  the rewrite rule probe, the single drift is a DELETE rule on an `app` table. A second drift (an
  INSERT or UPDATE rule on a `private` table) would let mc hold the generality as well.
- **Static misses, another layer holds.** L-SCS-CASE (the mention rule made case-sensitive) passes
  static, and the odd-backslash rule still refuses the mixed-case drift live. TO-OFF (the owner
  comparison gated by `false`) passes static, because the asserted regex text is intact; mc refuses it
  by drift 2's name. F-APPROVED (the freeze narrowed to approved rows) is held by static only, because
  the fixture's new loader block moves only the approved request. L-DOT-ANY passes everything, but it
  only over-refuses.
- **Caught twice.** G-OID-HIGH, GGO-*, TO-ANYSU, NN-*, GO-OWNER-* each fail static and mc. For the
  owner rule, the table-level allowlist also refuses a non-superuser owner, through its implicit
  privileges.

### F3 -- INFO. Round 1's findings, re-measured (measured + read)

| Round 1 | Now |
|---|---|
| F1 (lexer vs psql) | X1, XCR, XDOT, XSCS and XODD3/XODD3B are refused before anything is applied, and no file is created. M-LEX-E and M-LEX-DQ now fail static. **Closed as measured**, apart from F1 above. The record's claim is now "the shapes measured and this list", which is accurate. |
| F2 (freeze too narrow) | X2 refused with the new message. **Closed.** X3 (delete and re-insert as the superuser) still works, as disclosed and owed with RFC-2026-023. |
| F3 (forged refusal by a `pg_catalog` overload) | M-FORGE is caught by the guard in the job (mc 2), and its exposure with GDEL is mc 2. **Closed for the measured mechanism.** The plan states its own limit, an in-place catalog edit, which I did not test. |
| F4 (coverage narrowing on the next line) | M-CV2 static 1, CV-RELKIND static 1. **Closed** (static). |
| F5 (rules) | XRULE, RWUPD and RWPRIV each mc 2 by name. **Closed.** |
| F7 (grant option, REFERENCES) | GGO and GREF mc 2; M-GR-REF static 1. **Closed.** |
| F8 (T3, T5) | T3 and T5 mc 2 by name. **Closed.** |

### F4 -- INFO. The record's claims, checked (read + measured)

- A0's counts (16 probes; pinned check 2, pinned trigger 2, pinned grant 3 drifts; 48 blocks, 37 and 11;
  1058 twice; 72 static; 675 tests; 21 paths) match what I measured.
- A0 listed "CI on `aacb628`" as not done. It is now done: run 37109607517 "Bootstrap validation",
  success, on `aacb628`. PR #165 is Draft, OPEN and not merged.
- The disposition's §5 quotes `ok ลุยยาวๆไปเลย` and `ทั้งหมดเอาตามที่คุณแนะนำเลย`, marks O1-O4
  ANSWERED as recommended, corrects "any other answer is a forward change" (C0 F4), and says in terms
  that the merge of #165 still needs the Owner's own words for #165. I cannot see the Owner's session,
  and I verify only that the transcription is consistent with itself (read).
- The plan §7's limits match what I found: psqlLex is not psql's lexer; the guard does not cover
  in-place catalog edits; the rewrite rule probe covers `app` and `private`.

---

## 5. Stop-the-line verdict

**No stop-the-line condition found in batch 126's review round.**

- No tenant leakage, secret exposure, migration divergence, irreversible deletion or lost job. Every
  drift I appended as built (sixteen kinds, section 2.1) is refused by name or by the scan, and no shell
  escape ran without a mutation. X2 is refused live. The fixture passed rs twice on one database.
- F1 needs an edit to the lexer that shows in the diff and passes review. It is a gap in the tests,
  not a defect in the code.
- **Nothing I found blocks the Owner's merge as a stop-the-line.** Whether F1's one test shape goes in
  before or after the merge is the Owner's choice. I would add it first, because it is one line and
  it closes the same class round 1 asked to close. The gates that remain are not findings of this
  test: C0's and A1's re-checks of this round, the Integration Owner's evidence, and the Owner's words
  for the merge of #165 (RFC-2026-002, RFC-2026-025 §5).

---

## 6. Limits

- The brief that named my re-runs came from A0's workflow, and I share A0's model family. The fresh
  mutations are mine. They are two per rule, a sample and not a proof.
- I tested the mechanisms the round names. I did not search for new ways around the pg_catalog guard
  or the lexer beyond the mutation exposures above, and the plan's own stated limits stand untested by
  me.
- I did not re-run A1's or C0's measurements, CI's negative control, or `npm run check` on the subject.
  (`npm run verify` on the branch name ran the suite: 675 of 675.)
- F-EXCL's and F-APPROVED's live exposures were not valid: X2 also moves `content_item_id`, and X2B was
  a no-op. Their verdicts rest on static.
- Mutation-exposure drifts wrote four marker files (`PWNED_X1B`, `PWNED_X1C`, `PWNED_XCR`,
  `PWNED_XODD3B`), each only inside my private directory and only with a mutation in place.
- Cleanup: the cluster is stopped and `pgdata` removed. Nothing listens on 5503. 140's SHA-256 is
  `2ac596bb…c1ad37149` in the clone and in the worktree. The clone's `git status --porcelain` is empty.
