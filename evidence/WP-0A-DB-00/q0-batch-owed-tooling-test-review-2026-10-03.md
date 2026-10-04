# Q0 independent test of the owed-tooling batch (PR #176)

**Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`. **Subject:** branch
`agent/claude/WP-0A-DB-00-batch-owed-tooling`, head `af394fa` (the handoff, alone and last) over the plan and
disposition `3dd930e` and the code `70ab5ca4c596d7cbf88041a0630aebe7b67b2d60`, base `5558b26` (main). Author
`/claude/a0_atlas`. PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/176>: Draft, OPEN, head `af394fa`,
required check "bootstrap" run 37185404172 "Bootstrap validation" SUCCESS on `af394fa` (read with `gh`).
**Tested on:** my own branch `review/q0-batch-owed-tooling`, created at `af394fa`; the branch-name checks ran in a
private clone checked out on the branch NAME `agent/claude/WP-0A-DB-00-batch-owed-tooling` (the name is checked
out in another worktree, so it could not be checked out here). **Date:** 2026-10-04; the file name carries the
phase's date, as the batch's plan and disposition do.

This record holds findings. It advances no status. It approves nothing, test-verifies nothing on anyone's
behalf, and decides nothing that the Integration Owner or the Product Owner holds.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own run, and I am the same vendor and model family. My
independence from the Author is the independence RFC-2026-024 describes, and no more. Accepting this record as
the Tester role's signature is the Integration Owner's act and the Product Owner's act, not mine.

I fixed nothing. Every mutation and drift was applied in the private clone, run, and restored; the harness
compared sha256 before and after each and every restore matched (`restored byte for byte: true` on all 28
harness runs, and on D7's own script). Private artefacts (not in the repository): `q0-owed-tooling/` in the run's scratchpad -- `round.sh`,
`mutate.mjs`, `d7.sh`, `g2.sh`, the probe scripts `doblock.mjs`, `cites.mjs`, `lex.mjs`, `touch.mjs`,
`blockers.mjs`, `mutations.log` and every round's log.

## 1. Measured vs read

**Measured** (Node `v24.20.0` checked before every measured run; PostgreSQL 17.11 from `/opt/homebrew/bin`;
127.0.0.1:5503 only, TCP only, `-c unix_socket_directories=''`, `initdb --locale=C -A trust -U postgres`,
`LC_ALL=C`, the CI shim first, a fresh initdb every round; drifts APPENDED to `140_audit.sql`):

| Command | Where | Exit | Output |
|---|---|---|---|
| `node scripts/verify-branch-scope.mjs 5558b26 WP-0A-DB-00` | clone, branch name | 0 | "all 17 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | clone, branch name | 0 | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | clone, branch name | 0 | "clean: exit 0 -- tests 684, pass 684, fail 0" |
| `npm run check` | worktree, `review/q0-batch-owed-tooling` | 0 | coverage floor, toolchain, secrets, protocol, 684 of 684 |
| baseline round: shim, `make db-migrate-clean`, `generate-pinned-grants.mjs --check`, `make db-rls-smoke` twice | clone, `af394fa` | 0, 0, 0, 0, 0 | 30 probes; pinned trigger refused each of its 2 drifts, pinned grant 8, index coverage 3; 3753 initdb objects; post-migrate pass 51 blocks (39 as written, 12 replaced); both lint files "match the catalog", 66 tables; 1087 isolation cases twice |
| catalog read after a clean migrate (round D4c) | -- | -- | 563 key columns in app/private, 0 under a non-default collation, 0 under a non-default operator class; 51 non-internal triggers on 47 tables |
| `DB_TEST_URL='...5503/postgres#?host=q0-probe.invalid' make db-migrate-clean` | clone | 2 | `could not translate host name "[redacted]"`; `q0-probe` occurs 0 times in the output (G-2 holds through the real target) |

**Read, not measured:** CI's result (read with `gh`); #175's merge facts (`gh pr view 175`: merged
2026-10-04T06:05:20Z at head `ab7db39`, merge commit `5558b26`, parents `9a07459 ab7db39`; run 37181470982
"Bootstrap validation" success on `ab7db39`) -- all as the disposition says; the ERD §11.1 domain list
(`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:546-555`); the reviewers' earlier findings, as the plan
quotes them.

## 2. Mutation table, per layer

Code weakenings marked "digest refreshed" had the probe's digest pin in `foundation-contract` recomputed exactly
as the test computes it, so the digest pin alone is not what fails. "fc" is
`node --test test-kits/db/foundation-contract.test.mjs` (80 tests); "all" is `npm run test:bootstrap` (684).

| Id | Item | What was weakened | static | migrate-clean | rls-smoke | Verdict |
|---|---|---|---|---|---|---|
| R1 | 1 | `select pg_catalog.set_config('role','app_worker',false) into offending;` in 170's block (A0's M1) | fc 1 ("170's do-block is of the allowed shapes...") | -- | -- | held |
| **Q1a** | 1 | `... where pg_catalog."set_config"('role','app_worker',false) is not null;` in 170's block | **fc 0, all 0 (684/684)** | -- | -- | **survives** (Q0-OT-1) |
| **Q1b** | 1 | `... where exists (select 1 from "app"."workspaces" for update);` in 170's block | **fc 0** | -- | -- | **survives** (Q0-OT-1) |
| **Q1live** | 1 | `pg_catalog."set_config"('q0.probe','ran',false)` in 170's block | (as Q1a) | **0** | **0** | **every layer green** |
| **Q1c** | 1 | the relation check (fc:3446-3448) removed | **fc 0** | -- | -- | **vacuous rule** (Q0-OT-1) |
| **Q1d** | 1 | the JOIN check (fc:3445) removed | **fc 0** | -- | -- | **vacuous rule** (Q0-OT-1) |
| L3 | 2 | rule 1 of the pinned trigger probe reads `('app')` only; digest refreshed | fc 1 ("both rules read every table in app and private") | 2 (drift 1 "refused without naming ... private.meta_credential_references"; as built names the four private pins missing) | 0 | held, two layers |
| D2 | 2 | BEFORE UPDATE trigger on app.workspaces writing `lifecycle_state`, guarded `when (new.name like 'q0-%')` | -- | 2, names `q0_force_lifecycle` | **0** | held by migrate-clean alone (confirms the plan's note that a WHEN-guarded one passes rls-smoke) |
| D5 | 2 | a table in `public` with a trigger running `private.set_updated_at()` | 0 | 0 | 0 | outside the stated scope (app and private only) -- Q0-OT-9 |
| **Q3** | 3 | both lint files' `_how_measured` rewritten to "PostgreSQL 16.4" | **fc 0** | not read | not read | **survives** (Q0-OT-6) |
| **Q4 / Q4All** | 4 | retention-map F160-04's citation moved `open_blockers[192]` -> `open_blockers[91]`, quote kept | **fc 0, all 0** | -- | -- | **survives** (Q0-OT-4) |
| **Q5** | 5 | `MINIMUM_DOMAIN_CLASSES` cut to the three classes its drifts use | **fc 0** | -- | -- | **survives** (Q0-OT-5) |
| R7a | 7 | testHostRefusal's `#` rule removed (A0's M7a) | fc 1 ("the # rule alone refuses a bare fragment") | -- | -- | held |
| R7b | 7 | the raw loop's `trim()` removed (A0's M7b) | fc 1 ("the raw-text loop alone refuses ...") | -- | -- | held |
| **Q7a** | 7 | redaction splits the raw query on `&` only (psql-driver.mjs:98) | **fc 0** | -- | -- | **survives** (Q0-OT-7) |
| **Q7b** | 7 | redaction's `decodeURIComponent` removed (psql-driver.mjs:102) | **fc 0** | -- | -- | **survives** (Q0-OT-7) |
| L2 | 8 | the operator-class half of `nonDefaultKey` removed; digest refreshed | fc 1 (the `v` reading count) | 2 (drift 1 "refused without naming app.probe_ic_c.tag"; drift 2 without the quota recompute lookup) | 0 | held, two layers |
| D1 | 8 | `workspace_members_user_id_status_idx` rebuilt `(user_id, status text_pattern_ops)` | -- | 2, names `app.workspace_members.status` | 0 | held by migrate-clean |
| Q9 | 9 | `COPY_PROGRAM` reads `\s+` only between the words | fc 1 (`to /* c */ program`) | -- | -- | held |
| D6 | 9 | `copy (select 1) from /* q0 */ -- q0 program 'touch ...'` appended to 140 | -- | 2, "140_audit.sql line 1019 ... COPY ... TO/FROM PROGRAM", nothing applied, no file made | 2 -- but see D7 | held by migrate-clean |
| **D7** | 9 | the same drift in 140's TEXT, rls-smoke on a database migrated cleanly first | -- | 0 (clean text) | **0** | rls-smoke does not read 140 (Q0-OT-2) |
| **D4c** | 9 | `copy (select 'q0c') to '<private dir>/copy-ran-c.txt'` appended to 140 | -- | **0** | **0** | **every layer green; the server wrote the file on the host** (Q0-OT-3) |
| D4 | 9 | the same COPY TO a file, then `alter system set archive_command = 'true'` | -- | 2 (ALTER SYSTEM "cannot run inside a transaction block", 25001) | 2 (database left unmigrated) | the file was still written before the rollback |
| L8 | 10 | rule 7's owner reading made unable to fire; digest refreshed | fc 1 ("rule 7: app and private ... owned by the migration owner") | 2 (drift 7 "refused without naming schema private owned by app_command") | 0 | held, two layers |
| D3 | 10 | `grant usage on schema private to app_worker` appended to 140 | -- | 2, rule 7 names `unlisted: app_worker USAGE on private` | 2 (8 of 1087: the credential-reference cases expect a refusal on the schema) | held |
| Q11 | 11 | TEMP/TEMPORARY dropped from `CREATE_VIEW` | identity-isolation 1 ("the view scan reads: create temp view v as select 1") | -- | -- | held |

None of the held rules passes vacuously: each was turned red by its own weakening at every layer it claims.
The survivors are the findings below.

## 3. Claims checked

- **True, measured:** the 684 tests and both floors (946 -> 1000, 2167 -> 2169 pass `npm run check`); 51 triggers
  on 47 tables; four trigger functions; 563 key columns, all default; 66 tables and `--check` exit 0; 30 probes
  and their self-test counts; the eleven-table export-forbidden set and `export_allowed` on `app.audit_logs`
  alone (fc green and the pinned literal); 19 retention citations and two audit-coverage citations, no `WP:<n>`
  and no `(line N)` left; 89 `.sql` files (`git ls-files`); the commit messages' file counts (`5558b26..3dd930e`:
  2 added, 14 modified); the old denylist does not match `set_config` (`\bset\b` stops at `_`); every
  open_blockers edit ([185], [191]-[195]) is APPEND-ONLY -- each new text starts with the old one byte for byte,
  the count stays 196; the handoff cites `3dd930e` and `check:handoff` is green on the branch name; the
  disposition's #175 facts.
- **Overstated:** "no relation but `pg_catalog.pg_attribute`" / "six catalog-reading calls and no other
  relation" (plan:30; open_blockers[195]'s appended text) -- Q0-OT-1. "rls-smoke 2 ... lexer, before anything
  applied" for the COPY PROGRAM drift (plan:38, plan:70; open_blockers[185]'s appended text; A0's done item
  (9)) -- Q0-OT-2. "a citation moved consistently to the wrong blocker ... fail[s]" (open_blockers[195];
  plan §1 row 4) holds for 16 of 19 -- Q0-OT-4. "the export-label guard over every §11.1 domain" is held by a
  drift for 3 of 11 classes -- Q0-OT-5. The disposition §4 item 6 lists "C0 N3, N4" as closed where
  open_blockers[191] closes only N4's first half -- Q0-OT-10.

## 4. Findings

**Q0-OT-1 -- LOW. The do-block "allowlist" admits quoted identifiers, and two of its four rules are vacuous.**
`test-kits/db/foundation-contract.test.mjs:3438` reads a call as `[a-z_]...\s*\(` and `:3446` a relation as
`name.name`; neither sees a double-quoted identifier. Measured: `pg_catalog."set_config"('role', 'app_worker',
false)` and `exists (select 1 from "app"."workspaces" for update)` in 170's do-block pass fc and the full suite
(684/684); with a harmless `"set_config"` the live layers pass too (migrate-clean 0, rls-smoke 0). So the
closure of C0-170R-1 / A1 R-1 / Q0R-F1 holds for unquoted spellings only, and the plan's own question (§7:
"an allowlist in substance or only in form") answers "partly in form". Separately, removing the relation check
(Q1c) or the JOIN check (Q1d) leaves every test green: no drift is refused by either alone. Not a live
exposure: 170 is integrated and any edit to it is a reviewed diff. *Remedy:* refuse any `"` outside the blanked
literals in the block (170 has none), or unquote identifiers before the three checks; add a quoted-call and a
quoted-relation drift; give the relation and JOIN rules a drift only they refuse, or drop them; correct the
plan and open_blockers[195] wording.

**Q0-OT-2 -- LOW (evidence accuracy). rls-smoke does not read a migration's text; its red in the COPY PROGRAM
round was migrate-clean's consequence.** Measured D7: with `copy (select 1) to program 'touch ...'` in
`140_audit.sql` on a database migrated cleanly first, `make db-rls-smoke` exits 0 and reports nothing about
PROGRAM (it feeds helpers, fixtures and probes, not migrations). In D6, as in A0's round, rls-smoke ran on the
database the failed migrate-clean left empty and failed with `schema "private" does not exist`. The rule
itself holds where it claims (migrate-clean 2 by line, nothing applied, no file made). *Remedy:* reword
plan:38, plan:70 and open_blockers[185]'s appended sentence: migrate-clean refuses a PROGRAM in a migration;
rls-smoke's lexer refuses one in the sources IT feeds.

**Q0-OT-3 -- LOW (outside the eleven items; record as owed). A server-side file write passes every layer.**
Measured D4c: `copy (select 'q0c') to '<path>'` appended to 140 -> migrate-clean 0, rls-smoke 0, and the
database server wrote the file on the host as its OS user; in D4 the file was written even though the
migration then rolled back. Item 9's own framing ("the server-side twin of `\!`") stops at PROGRAM; a write to
an arbitrary server path (`COPY ... TO '<file>'`; `lo_export` is the same class) can reach the server's own
configuration files. `ALTER SYSTEM` is refused today only incidentally (25001, migrations run in a transaction).
*Remedy:* refuse `COPY ... TO|FROM '<literal>'` (any server file) in psqlLex beside PROGRAM, or state the limit
on open_blockers[185] with an owner.

**Q0-OT-4 -- LOW. Three of the 19 retention-map quotes are said by two blockers.** Measured (`cites.mjs`):
`"§10 DEFINES NO \`CATALOG\` CLASS"` is in [77] and [78]; `"F160-04"` in [91] and [192]; `"F160-15"` in [150] and
[192] (`db/foundation/lint/retention-map.json:314, :328, :405`). Q4: F160-04's citation moved from [192] to [91]
stays green (fc 80/80, full 684/684). *Remedy:* `retentionCitationProblems` (fc:4779) also requires the quote to
be said by exactly one blocker; lengthen the three quotes.

**Q0-OT-5 -- LOW. The minimum-domain class list is a hand list, pinned by drifts for 3 of its 11 classes.**
`MINIMUM_DOMAIN_CLASSES` (fc:4748) is not derived from ERD:546-555 and is not asserted as a literal; Q5 cut it
to TENANT-LIFE, CONTENT-HISTORY and AUDIT and every test stayed green, so PUBLISH-HISTORY and FINANCE-HISTORY
(the two C0 G3 named) and six more are held by the code text alone. *Remedy:* assert the eleven as a literal
beside each one's ERD line, or one drift per domain.

**Q0-OT-6 -- INFO. The measured-on version is self-referential, and `--check` runs in no make target or CI.**
fc:3180 reads the version from the file it checks; both files rewritten to "PostgreSQL 16.4" pass fc (Q3).
`generate-pinned-grants.mjs` is referenced by no Makefile target, workflow or `package.json` script. The
migration-name half holds (A0's M3). *Remedy:* run the generator's `--check` inside migrate-clean, or state that
the version is held only by a manual `--check`.

**Q0-OT-7 -- INFO. Two parts of the raw-query redaction are unpinned.** Splitting on `#` and decoding the value
(`scripts/db/psql-driver.mjs:98, :102`) can each be removed with every test green (Q7a, Q7b). *Remedy:* a case
each (a percent-encoded `host` value; a value after a second `#`), or drop them.

**Q0-OT-8 -- INFO. The static text scans read no block comment.** Measured (`touch.mjs`, `lex.mjs`): the
audit-table tripwire (fc:4312) misses `grant insert on /* c */ app.audit_logs ...`, `create /* c */ trigger ...`,
`drop policy p on /* c */ app.security_events`, `drop /* c */ table app.audit_logs`; `CREATE_VIEW`
(`tests/db/identity/identity-isolation.test.mjs:46`) misses `create /* c */ view`. The live probes still hold
grants, triggers, policies, tables and views in app and private, so this is the tripwire layer only; the stated
limit names only a dynamic EXECUTE. (`COPY_PROGRAM` does read comments, nested ones included -- measured.)
*Remedy:* strip comments (nesting-aware) before the scans, or add the limit to open_blockers[191].

**Q0-OT-9 -- INFO.** A trigger on a table outside app and private passes every layer (D5), as the batch's
stated limit says. No action beyond the limit.

**Q0-OT-10 -- INFO.** The disposition §4 item 6 (line 74) says "C0 N3, N4" closed; open_blockers[191] closes N4's
first half and keeps the lint message owed, as plan §6 does. *Remedy:* correct the disposition's wording.

## 5. Stop-the-line verdict

**No stop-the-line.** The batch adds no migration, grant, policy or role; nothing here leaks a secret or a tenant,
duplicates a side effect or diverges a migration. Q0-OT-3 is a pre-existing gap of the same class item 9 closes,
reachable only by a reviewed migration on a private cluster.

**Does anything block the merge?** Nothing I found is a regression or a safety gap introduced by this batch,
and every rule the batch adds turns red at each layer it claims. Q0-OT-1, -2 and -4 are claims worded stronger
than measured; I recommend they be corrected or recorded as owed (on open_blockers[195] and [185]) with the
merge. Whether that is a condition is the Integration Owner's and Product Owner's call. RFC-2026-002's other
conditions stand as the disposition records (C0 and A1 reports; Integration Owner evidence owed).

## 6. Limits

- One cluster version (17.11), macOS, my own port; no provisioned instance (rules 2-4, 7 and 8 fail there by
  design until Q170-c).
- The static mutations ran one file each (fc or identity-isolation); only Q1a and Q4 also ran the whole suite.
- I did not re-run A0's M1b, M3, M4, M4b, M5, M5b, M6, M6b, M7c, M10c or the bypassrls drift; I re-ran their
  equivalents where listed above, and read the rest from the plan.
- The probe scripts evaluate the head's own regexes, extracted from the test file; a later edit to those lines
  needs them re-run.
- The cluster on 5503 was stopped and its data directory removed after every round; nothing else was touched.
