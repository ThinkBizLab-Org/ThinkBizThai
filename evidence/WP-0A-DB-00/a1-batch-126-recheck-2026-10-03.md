# A1 Security/Privacy re-check: batch 126's review round (`d482700`, record `3c8a494`, handoff `aacb628`)

Run: `/claude/a1_bastion`
Role: independent Security/Privacy reviewer for `WP-0A-DB-00`
Subject: branch `agent/claude/WP-0A-DB-00-batch-126`, PR #165
(<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/165>, Draft, OPEN), head
`aacb62840314a9eebb72fb8f7b7e69021c79d3ca` (the handoff alone) over record commit `3c8a494` over code
commit `d482700`, previous reviewed head `8932e61` (my first-pass review), base `e5380b0` (`main`, the
merge of #164). I checked the head out into my own branch `recheck/a1-batch-126-r2`.
Author: `/claude/a0_atlas`
Date: 2026-10-03
Scope: the review-round corrections only — the three cherry-picked review files are not re-reviewed as
reviews; I re-measure what the corrections changed. Corrections in scope: the `psqlLex` lexer changes
(A1 F1, Q0 F1); the whole-row freeze of a settled request (Q0 F2); the grant-option read in the pinned
grant probe (C0 F3, A1 F3, Q0 F7); the new pg_catalog guard and rewrite-rule probes and the
trigger-owner / NOT-NULL pins (Q0 F3, F5, F8); the 125.1 superseded-pair dead-code marking (C0 F1); and
the record edits — plan §7, blocker 186, README, disposition O1-O4, the commit split and the handoff.

**This document records findings. It advances no package status, signs nothing on anyone's behalf,
writes `security_approved` nowhere, and repairs nothing it found.** It is one input to the Product
Owner's disposition, not the disposition.

---

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author of the change under review. I ran in a worktree of A0's
repository, under a brief A0's workflow wrote, and I am the same vendor and model family as A0.
RFC-2026-024 withdrew the cross-vendor condition, so that fact does not by itself disqualify this review.
It does mean the Author chose what to point me at. **Whether this re-check is accepted as the
Security/Privacy role's signature is for the Integration Owner (`/claude/r0_steward`) and the Product
Owner to decide.** Neither A0 nor I can decide it, and acceptance as the role's signature is their act,
not a property of this file.

## 1. How I measured, and what is measured [M] versus read [R]

**Environment [M].** PostgreSQL 17.11 from `/opt/homebrew/bin`, a private cluster on 127.0.0.1:5501, TCP
only (`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres` afresh for every round,
`LC_ALL=C`, the shim `db/foundation/ci/supabase-shim.sql` first. Node 24.20.0 for repository commands
(the login default is node 26.7.0; `npm run verify` refuses it with exit 68, so I ran the repo commands
under the pinned 24.20.0). Each drift was APPENDED to `db/foundation/migrations/140_audit.sql` from a
saved copy (sha256 `2ac596bb…c1ad37149`) and restored byte for byte after every round; the sha256 was
printed after each round and is the saved one at the end. Shell-escape probes used a harmless
`\! touch <file-in-my-private-dir>` as the marker — a created file is the only proof a meta-command ran,
and every marker path was inside my private directory. No file was ever created. The cluster was stopped
and its data directory removed at the end; port 5501 is free; no other port was touched.

**Baseline on `aacb628` [M] (round B0).** `make db-migrate-clean` exit 0: the catalog probes each
"refused each of its drifts; clean again after every drift", including the new rewrite-rule and
pg_catalog-guard probes; post-migrate pass 48 blocks, 37 as written, 11 superseded and replaced.
`make db-rls-smoke` exit 0, **1058** isolation cases, and exit 0 again, 1058, run a second time on the
same database. (The README/handoff count the probes as sixteen in eleven families; the run also prints a
ceiling probe. The count is not load-bearing and I did not grade it.)

**Repository commands, on a clone on the branch NAME [M].** A clone in my private directory,
`git checkout -b agent/claude/WP-0A-DB-00-batch-126 aacb628` (not detached), `origin/HEAD` set to
`origin/main = e5380b0`:

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs e5380b0 WP-0A-DB-00` | 0 | all 21 changed path(s) are declared, and every amendment explains one |
| `npm run verify` (node 24.20.0) | 0 | clean: tests 675, pass 675, fail 0 |
| `npm run check:handoff` | 0 | describes the branch: nothing substantive after its cited head |

**GitHub [M, via `gh`].** PR #165 is Draft, OPEN, base `main`, head `aacb628`, `mergeStateStatus` CLEAN.
Its `bootstrap` check concluded **`success`** on head `aacb628` (run 37109607517). So the Author's open
"not done" item — CI not yet confirmed on the new head — is now green.

**Commit shape [M].** `d482700` carries the code (psql-driver, run.mjs, the two migrations, the contract
test, the 090 fixture, the integrity manifest); `3c8a494` carries the record (README, plan, disposition,
WP json) and also four lines of `run.mjs` and two of `rls-smoke.mjs` — comment/wording corrections
bundled into the record commit rather than the code commit, a minor hygiene deviation, not a
code-behaviour change; `aacb628` is the handoff alone. The handoff-alone-last shape holds.

**Read [R].** The three cherry-picked review files, the plan §7, the disposition, blocker 186's
CLOSED-BY-126 and REVIEW-ROUND paragraphs, the migration 126 and 125.1 diffs, the probe and lexer source,
and my own first-pass evidence.

## 2. The brief's questions, re-measured

### Q1. Lexer: are L1-L3 (and X1, L2b) now refused, fail-closed, and did the corrections open anything new?

**All refused; nothing opened.** I ran `psqlLex` directly over sixteen shapes and confirmed each live
where it mattered.

Direct lexer [M, static], meta-command count (>=1 ⇒ the caller refuses the source):

| Shape | before (first pass) | now | verdict |
|---|---|---|---|
| L1 `select 1.e'\' \! …` | ran | meta 2 | refused |
| L2 `standard_conforming_strings=off` then `'x\' … \! …` | ran, all layers green | meta 2 | refused |
| L2b the same via `set_config('standard_conforming'\|\|'_strings',…)` | — | meta 1 | refused |
| L3 bare CR after `--` comment then `\! …` | ran, all layers green | meta 1 | refused |
| X1 `standard_conforming_strings` in a comment | — | meta 2 | refused |

Live, each appended to `140_audit.sql` on a fresh cluster [M]:

| Round | mc | rs | marker file created? | what named it |
|---|---|---|---|---|
| L2 | **2** | 2 | **no** | `140_audit.sql` line …: `standard_conforming_strings` + `\'` inside a plain literal |
| L3 | **2** | 2 | **no** | `140_audit.sql` line …: `\r` a bare carriage return, which ends a `--` comment for psql |
| L2b | **2** | 2 | **no** | `140_audit.sql` line …: `\'` inside a plain literal |

Each failed **before anything was applied** and created no file. My first-pass F1 (LOW) is closed for the
measured shapes.

New evasions I tried [M, `psqlLex` and live psql ground truth side by side]:

| Shape | psql ground truth | `psqlLex` | agree? |
|---|---|---|---|
| nested `/* a /* b */ c */ \! …` | runs (real meta-command) | meta 1 → refused | yes |
| `U&'x' \! …` | runs | meta 1 → refused | yes |
| dollar tag with digits `$x1$ … $x1$ \! …` | runs | meta 1 → refused | yes |
| dollar tag after an identifier `a$$ … $$ \! …` | **errors** "unterminated dollar-quoted string"; no meta runs | meta 0 → harmless | yes |
| `\` inside a double-quoted identifier `"a\b" \! …` | runs | meta 1 → refused | yes |
| CRLF between statements (normal) | clean | meta 0 | yes |
| even run of backslashes in a plain literal | n/a | correctly not flagged on the `\\` run | — |
| `\gexec` built from data | would be a backslash meta-command | flagged like any backslash | refused |

In every case `psqlLex`'s verdict matches what psql actually does: each shape that runs a meta-command in
psql is flagged and refused, and the one shape that does not run (`a$$…` → unterminated dollar error) is
`meta 0`, which is correct. **The corrections only ADD metaCommand flags; they never remove one, so they
cannot turn a previously-refused shape into an accepted one.** The one reclassification — `e'` after a
`.` now read as a plain literal — can only over-refuse, and B0 shows the real tree (integrated migrations
030/050/051/070/100/110/131/140, fixtures, helper) still passes, so there is no false-positive
regression. I found nothing newly opened.

### Q2. The freeze: is a settled decision frozen now, and what remains? (T1-T5)

Measured as `postgres` (superuser: bypasses RLS, fires triggers; the 090 loader's class) on the migrated,
fixture-loaded database, each in a rolled-back transaction [M]:

| # | Write on the approved request | Outcome |
|---|---|---|
| T1 | `UPDATE … set status = 'changes_requested'` | refused: "a settled approval request keeps its status, decided_by and decided_at" |
| T1b | `UPDATE … set content_version_id = <new>` | **refused by the new clause**: "a settled approval request keeps what it decided: every column but updated_at and updated_by" |
| T1c | `UPDATE … set requested_by = <new>` | **refused** by the same clause |
| T1d | `UPDATE … set updated_by = <new>` | accepted (explicitly admitted; row updated) |
| T2 | `INSERT … ON CONFLICT (id) DO UPDATE set status = …` | refused |
| T3 | `MERGE … WHEN MATCHED THEN UPDATE set decided_at = '2001-…'` | refused |
| T4 | `DELETE` the approved request, then `INSERT` it again as `changes_requested` | **accepted** (status became `changes_requested`) |

So the whole-row freeze (Q0 F2) works: UPDATE, upsert and MERGE now freeze **every column but
`updated_at` and `updated_by`**, which closes the content-repointing half of my first-pass F2 (an approved
request can no longer be repointed to another version while keeping the decision). The 090 fixture's own
loader block asserts the same (requested_by change refused, updated_by still admitted) and passed on every
rls-smoke run in B0.

**What remains (unchanged, and correctly not fixed):** T4 — a writer holding DELETE can delete a settled
request and insert it again as anything, and a pre-settled INSERT still names any decider. Today only the
table owner and a superuser hold DELETE (and either can switch triggers off), so no client or service
role reaches it. The migration header and blocker 186 now record this as owed with RFC-2026-023's command
role — give that role no DELETE, or add a BEFORE DELETE refusal then — and explain it is **not** added now
because it would pre-empt batch 160's erasure route (item 16). I agree with deferring it.

### Q3. The grant allowlist: are grant options caught now? (G-GO)

**Yes.** `grant update (timezone) on app.calendar_items to authenticated with grant option` appended to
140 gave **mc 2**, refused by the pinned grant probe: "column privilege(s) on a pinned table not exactly
its allowlist: unlisted: authenticated UPDATE **WITH GRANT OPTION** (timezone)". My first-pass F3 (INFO)
is closed. The probe also now requires each pinned table's owner to be a superuser (C0 F5), measured
green in B0.

### Q4. The record

- **`psqlLex` wording [M/R].** The discredited "anywhere psql would execute one" is gone from
  `psql-driver.mjs`, `run.mjs`, the plan and the README; each now says "the shapes measured and this
  list". The one surviving "ANYWHERE psql would execute one" in `run.mjs:1050` is a different, true claim
  (a backslash anywhere on a line is a meta-command, not only at line start), not the lexer-completeness
  claim. Blocker 186 item (12) reads "the shapes measured, not anywhere psql would execute one".
- **Blocker 186 [R].** Item (15) now reads the freeze as "status, decided_by and decided_at — and since
  the review round every other column but updated_at and updated_by — for every UPDATE, upsert or MERGE";
  the DELETE and pre-settled-INSERT gaps are recorded under STILL OWED. Accurate against Q2.
- **125.1 [R].** The widened pair is marked SUPERSEDED BY 126 and dead while the strict pair above it
  passes (C0 F1); the body digest is updated to `48bcd0d0…` in both 125.1 and 126.
- **Disposition O1-O4 [R].** All four are marked ANSWERED "as A0 recommended", with the Owner's words
  `ทั้งหมดเอาตามที่คุณแนะนำเลย` and `ok ลุยยาวๆไปเลย` transcribed, and C0 F4's point recorded (O1 is
  answered before the merge, by the Owner's words, not by the act of merging). I cannot see the Owner's
  session and do not verify the transcription; as far as the file shows it is internally consistent.

## 3. Findings

**No new findings, and the three first-pass findings are closed or narrowed:**

- **F1 (first pass, LOW) — CLOSED for the measured shapes.** L1, L2, L2b, L3 and X1 are each refused
  fail-closed before apply, with no marker file created; the new evasions I tried are each refused or
  (the unterminated-dollar case) harmless, and `psqlLex` agrees with psql's own behaviour on every one.
  The guard remains, by construction, a reviewability aid over repository content rather than a trust
  boundary (writing a migration already means writing code `npm run check` runs), and it cannot model
  every build of psql; the record now says so.
- **F2 (first pass, INFO) — NARROWED.** The whole-row freeze closes the content-repointing route. The
  residual DELETE-and-reinsert / pre-settled-INSERT route needs the table owner or a superuser, reaches no
  client or service role, and is recorded as owed with RFC-2026-023. INFO stands.
- **F3 (first pass, INFO) — CLOSED.** Grant options are read; a `with grant option` drift is refused.

## 4. Stop-the-line verdict

**None.** Nothing I measured exposes a secret, crosses a tenant, duplicates an external side effect, loses
a job, diverges a migration or deletes irreversibly. The corrections strictly add refusals.

**Does anything block the Owner's merge?** From the Security/Privacy side, **no**. The record defect my
first pass named (the false "anywhere psql would execute one" claim) is corrected, the freeze is widened,
the grant-option gap is closed, and CI is green on the merge head. The three decisions that are not mine
remain outstanding and are the Integration Owner's and Product Owner's to weigh: the **C0, A1 and Q0 role
runs on this round's own changes** (`d482700`, `3c8a494`) — RFC-2026-002 asks for independent reviewer,
tester and security evidence on the head being merged, and A0, as Author, cannot supply any of them; the
**Integration Owner evidence** (blocker "NO INTEGRATION OWNER EVIDENCE"); and the **Owner's words for the
merge of #165 itself** (the disposition answers O1-O4 but says plainly the merge still needs its own
word). I record these; I do not clear them.

## 5. Limits

- I measured on one PostgreSQL build (17.11, Homebrew, macOS) with psql from the same build. The CI
  runner's psql may lex differently; I did not measure the lexer there.
- I re-measured T1-T5 and the whole-row freeze as `postgres` only — no command role exists to test, and
  the fixtures load through the loader as `postgres`. The 090 loader block carries the same assertions
  and passed in B0.
- I did not re-run the full first-pass drift battery (T-ER, T-PSET, T-AOWN, the eleven mutations, G1-G5);
  I re-ran the shapes the corrections touched (L1-L3, X1, L2b, T1-T4, G-GO) and the new evasions, and read
  the rest. The new pg_catalog-guard and rewrite-rule probes I confirmed self-testing their drifts in B0;
  I did not independently re-exploit Q0's `format`-overload forge.
- I cannot see the Owner's session; the disposition transcription is `[R]`, consistent but unverified.
- The commit-hygiene note (run.mjs/rls-smoke lines in the record commit) is an observation, not a finding.
- This is the Security/Privacy role's input, not its signature; acceptance is the Integration Owner's and
  Product Owner's act.
