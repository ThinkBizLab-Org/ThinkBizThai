# A0 plan and record: the owed-tooling batch -- allowlists for denylists, the trigger and schema pins, citation and export pins, the host guard's last halves

- **Package:** `WP-0A-DB-00`. **Author:** `/claude/a0_atlas` (written by a subagent of that run).
- **Branch:** `agent/claude/WP-0A-DB-00-batch-owed-tooling`, from `main` at `5558b26` (PR #175, batch 170,
  merged 2026-10-04T06:05:20Z by A0 at its reviewed head `ab7db39`, CI run 37181470982 "Bootstrap
  validation" green on that head, under the Owner's standing delegation; see the disposition).
- **Commits:** `70ab5ca` is the code and its packaging (the manifest's branch slot and rationale, the
  branch-identity slot, the floors, the integrity manifest, open_blockers[185] and [191]-[195]); this plan and
  the disposition are the commit after it; the handoff is last and alone.
- **Status:** written and measured by the Author. Not reviewed, not tested by an independent role, not
  approved. C0, Q0 and A1 role runs follow. The PR is a Draft.
- **The Owner's words:** `ลุยต่อเลย เอาตามแนะนำ` (2026-10-04), answering A0's summary that recommended, as
  the one item needing nobody, a small batch clearing the owed LOW tooling items. See
  `product-owner-disposition-2026-10-03-batch-owed-tooling.md`.
- **Inputs:** the OWED sentences of open_blockers[185] (blocker 186's text), [191], [192], [193], [194] and
  [195]; the re-check sections of the plans of batches 129, 141-prep, 160-prep, 170-assert, 150-prereq, 150,
  rfc-026-027 and 170, and the reviewers' re-check files they cite.

**No migration.** Every item is an assertion or tooling: catalog probes in `scripts/db/run.mjs`, the lexer and
redaction in `scripts/db/psql-driver.mjs`, the grant generator, two lint maps' citations, the static suites and
the README. No migration file is added or edited, so no number is asked of anyone. **This batch decides
nothing and approves no RFC.**

## 1. Item → change → what proves it

Every item the task named was bounded; none is recorded as owed instead. What each leaves owed is §6.

| # | Item (finding) | Change | Proof (a drift or mutation, measured red; §3, §4) |
|---|---|---|---|
| 1 | 170's do-block assertion is a keyword denylist that misses a side-effecting call in `select ... into` (C0-170R-1, A1 R-1, Q0R-F1) | `foundation-contract`: the block is held to an ALLOWLIST -- `declare offending text; begin ... end $$;` around statements each `select string_agg(...) into offending from` `pg_catalog.pg_attribute a` or the two unnests, `if ... then raise exception '', ...` or `end if`; six catalog-reading calls; no relation but `pg_catalog.pg_attribute`; no JOIN [review round: as first written this held UNQUOTED spellings only -- a double-quoted name or a block comment passed every scan (C0-OT-1, A1-OT-2, Q0-OT-1); since the review round neither may appear in the block] | nine in-test drifts each refused (set_config in a select-into, a function in a subselect, `from app.workspaces`, `exists (select 1 from app.jobs)`, a third FROM source, `perform`, an UPDATE in an IF, set_config in a RAISE, `execute`); M1 (set_config into 170's own block, which the old denylist passes -- measured: the old regex does not match) red; M1b (the call check removed) red |
| 2 | No guard reads triggers on `app.workspaces`; a BEFORE UPDATE trigger writing `NEW.lifecycle_state` passes every layer (A1 R-2) | `run.mjs`: the pinned trigger probe reads every non-internal trigger on every table in app and private (51 on 47 tables) by `pg_get_triggerdef`, and every function they run (four) by body digest, security, owner and empty search_path; `foundation-contract` re-derives the (table, trigger) set from the migration text | drift 1 adds the lifecycle trigger on workspaces and a trigger on a private table; drift 2 rewrites `set_deleted_at`; M2 (the probe narrowed back to approval_requests) migrate-clean 2; the workspaces trigger appended to 140, migrate-clean 2 by name |
| 3 | `pinned-grants.json`'s `_how_measured` says "through 140" (C0-170-3, A1 F170-3, Q0-F5) | `generate-pinned-grants.mjs` writes the last migration's file name and the server version (`measuredOn`), exports its doc builders and runs `main` only as a script; both files regenerated on the clean set (one line each); `foundation-contract` holds both to the current last migration | `--check` exit 0 on this branch's clean set; M3 (the text fixed at 140 again) red |
| 4 | `(line N)` citations pinned by nothing, and a consistent line-and-index move stays green (D3, C0-7, Q0-F9) | `retention-map.json`: 19 citations `WP:<line> (open_blockers[i])` -> `open_blockers[i] ("<quote>")` (the finding's own id where [192] names it); `audit-coverage-map.json`: two `(line N)` sources -> quotes (both had been stale since 170 -- first written "one"; corrected in the review round, C0-OT-5); tests require every citation to carry a quote blocker i says, and no line number | in-test drifts (moved, unquoted, line put back) red; M4 and M4b red |
| 5 | export_allowed unpinned (A1 R1, R2; Q0 R-3); F160-17's record held by nothing (C0 R1); export-label and minimum-domain guards hold today's cases (C0 R2, Q0 R-5) | `foundation-contract`: the forbidden set derived from §5's SECRET-4 cell and token/secret/credential/password columns (a `*_redacted` flag excepted) and pinned (11 tables); none exported, none with export_allowed; export_allowed is `app.audit_logs`'s alone; the finding set F160-01..17 and the three also_claimed_by pairs pinned; no table of any §11.1 minimum domain's class (11 classes, ERD:546-555) labelled outside them, and not-workspace-data equal to the purge order's outside-workspace tables less user_profiles | in-test drifts: EX-11 and exporting workspace_invitations, content_items / workspace_settings / audit_logs labelled outside, publish_jobs as not-workspace-data, each red; M5 (EX-11 in the data) and M5b (F160-17's pairing dropped, C0's N8) red |
| 6 | 141-prep: closed key set, `_shape.batch` and the CARRIED sentence unpinned (Q0 R1, R3, R4); tripwire reads policy and ALTER only (Q0 R2, C0 N3, A1 N2, N3) | `foundation-contract`: the nine row keys a literal, `_shape` exactly them, the map's six top-level keys; `_shape.batch`'s owning-batch reading and its [191] (8) citation; both CARRIED rows' "RE-CONFIRMED WHEN Q141-a IS ANSWERED" and open_blockers[32]; `AUDIT_TABLE_TOUCH` reads GRANT/REVOKE on either table or every table in app, CREATE/ALTER/DROP TRIGGER, ALTER/DROP POLICY, DROP/CREATE TABLE, each spelling pinned and a longer name refused; [191] (9)'s overstatement corrected in the blocker | M6 (`_shape.batch` reverted, N36) red; M6b (`grant insert on app.audit_logs to authenticated` in 170) red, named by the new tripwire |
| 7 | 150-prereq host guard: only ten crafted URLs through the tools, each half of the fix unpinned (G-1); redaction reads WHATWG searchParams (G-2) | `foundation-contract`: every crafted URL plus two through both tools; `#frag` pinned to the `#` rule and `?%20host=` to the raw loop's trim; `psql-driver.mjs`: redactConnection reads values from the raw query after the first `?` (past `#`), and drops an IPv6 host's brackets | M7a (the `#` rule removed) and M7b (the trim removed) each red alone, where Q0's M1 and M2 passed; M7c (redaction back to no raw query) red; through the real tool, `db-migrate-clean` with `.../postgres#?host=q0-probe.invalid` printed `could not translate host name "[redacted]"` (exit 1) |
| 8 | index coverage reads neither collation nor opclass (Q0 R-2 on 150-prereq) | `run.mjs`: a key column counts in rule 1's run and rule 2's column text only under its column's collation (`indcollation` vs `attcollation`) and its access method's default operator class (`opcdefault`); 563 key columns measured default | drift 1 adds a table whose policy reads a `COLLATE "C"` key and a `text_pattern_ops` key; drift 2 rebuilds the workspace-switch index with `status COLLATE "C"` and the quota recompute index with `text_pattern_ops`; M8 (the reading removed) migrate-clean 2; Q0's `(user_id, status COLLATE "C")` appended to 140, migrate-clean 2 by name, rls-smoke 0 |
| 9 | COPY ... TO/FROM PROGRAM in a fed source runs a server shell command and no layer reads it (C0 G1 on 129) | `psql-driver.mjs`: `COPY_PROGRAM`, TO or FROM then PROGRAM with whitespace or comments between, anywhere, refused by psqlLex in every fed source; none of 89 `.sql` files, 30 probes or their drifts carries one | lexer shapes (six refused, three admitted); `copy (select 1) to program 'true'` appended to 140: migrate-clean 2 before anything applied ("140_audit.sql line 1019") [review round, Q0-OT-2: first written "and rls-smoke 2"; rls-smoke does not read a migration, and its 2 was the empty database migrate-clean left; it refuses one only in the sources it feeds itself]; M9b (the rule removed) red |
| 10 | schema owners of app/private read by no layer (A1 S1); non-client attributes, schema CREATE, default privileges unread (Q0 R-2, A1 S3 on 170-assert) | `run.mjs`: pinned grant probe rule 7 (both schemas owned by the migration owner; every non-superuser role's USAGE/CREATE on them, grant option included, exactly `PINNED_SCHEMA_PRIVILEGES`) and rule 8 (six attributes false for every non-superuser role; `pg_default_acl` empty), a drift each | `alter schema private owner to app_command` appended to 140: migrate-clean 2 by name, rls-smoke 0; `alter role app_worker bypassrls`: migrate-clean 2 by name (rls-smoke 2, as before); M10c (rule 8 made unable to fire) migrate-clean 2 through its self-test |
| 11 | static view regex misses `create recursive view` and temp views (A1 S2, Q0 R-5) | `identity-isolation.test.mjs`: one `CREATE_VIEW` pattern (OR REPLACE, TEMP/TEMPORARY, RECURSIVE, MATERIALIZED) in all three scans, its spellings pinned | M11 (the old pattern back) red on `create recursive view` |

## 2. Commands and exit codes (Node `v24.20.0`, checked before every measured run)

Live runs: PostgreSQL 17.11 (`/opt/homebrew/bin`), 127.0.0.1:5507 only, TCP only (`-c
unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the CI shim first,
re-initdb every round. Private directory `a0-owed-toolingr/` in the run's scratchpad.

| Command | Where | Exit | Output |
|---|---|---|---|
| `make db-migrate-clean` | `70ab5ca`, branch name, round f1 | 0 | 30 probes (the pinned trigger probe refused each of its 2 drifts, pinned grant 8, index coverage 3, every probe clean again after every drift); 3753 initdb objects fingerprinted and compared in memory; post-migrate pass 51 apply-time blocks (39 as written, 12 replaced) |
| `make db-rls-smoke` twice | same database | 0, 0 | 1087 of 1087 each |
| `make db-migrate-clean`, `make db-rls-smoke` twice | `70ab5ca`, a second fresh cluster (f2) | 0; 0, 0 | as f1; 1087 of 1087 each |
| `DB_TEST_URL=... node scripts/db/generate-pinned-grants.mjs --check` | f2 | 0 | both files match the catalog; 66 tables |
| `npm run test:bootstrap` | `70ab5ca` | 0 | 684 of 684 |
| `node scripts/verify-branch-scope.mjs 5558b26 WP-0A-DB-00` | `70ab5ca` | 0 | "all 14 changed path(s) are declared, and every amendment explains one" |
| `node scripts/commit-when-clean.mjs` | before `70ab5ca` | 1 | refused: 2 failures, both the handoff guard ("the handoff for this branch describes this branch" and the ratchet that runs it on a copy), not yet refreshed; nothing else red (`npm run check` showed exactly these two). `70ab5ca` is therefore a PLAIN commit, as the task allows for that case alone |

The final `npm run check`, `npm run check:handoff` and `npm run verify` on the branch name are recorded in
the handoff, which is refreshed last and alone.

## 3. Each finding's exploit as a drift, per layer

Each live drift was APPENDED to `db/foundation/migrations/140_audit.sql` on a fresh cluster and the file
restored byte for byte (sha256 compared) after the round.

| Drift | Before this batch (as the reviewers measured) | migrate-clean | rls-smoke |
|---|---|---|---|
| A1 R-2: `m2_force_lifecycle`, BEFORE UPDATE on `app.workspaces` setting `purge_queued` | every layer green (A1, 170 re-check) | 2, pinned trigger probe names it | 2 (only because this trigger fires on the owner's rename too; one guarded by WHEN would pass) |
| Q0 R-2: `workspace_members_user_id_status_idx` rebuilt `(user_id, status COLLATE "C")` | every layer green | 2, index coverage names `app.workspace_members.status` | 0 |
| C0 G1: `copy (select 1) to program 'true'` | applied and ran | 2, lexer, before anything applied | 2, but not by its lexer: rls-smoke ran on the database the refused migrate-clean left empty (Q0-OT-2; first written "2, lexer") |
| A1 S1: `alter schema private owner to app_command` | every layer green | 2, rule 7 names it | 0 |
| Q0 R-2/A1 S3: `alter role app_worker bypassrls` | rls-smoke only | 2, rule 8 names it | 2 |

## 4. Each new reading weakened in code, with a drift

| Mutation | Layer | Exit | Verdict |
|---|---|---|---|
| M1 set_config into 170's block | static | 1 | "170's do-block is of the allowed shapes, calls and sources only" |
| M1b the allowlist's call check removed | static | 1 | its own drift fails |
| M2 the trigger probe narrowed to approval_requests | migrate-clean | 2 | 0 of 2 drifts refused, and as built names the pins on the other tables as missing |
| M3 the generator's text fixed at 140 | static | 1 | "pinned-grants.json says it was measured through 170_..." |
| M4 a citation moved to [5]; M4b a line number put back | static | 1, 1 | named by citation |
| M5 EX-11 in the data; M5b F160-17's pairing removed | static | 1, 1 | named |
| M6 `_shape.batch` reverted; M6b a later GRANT on audit_logs | static | 1, 1 | named |
| M7a the `#` rule removed; M7b the trim removed; M7c redaction without the raw query | static | 1, 1, 1 | each half now held alone |
| M8 the collation/opclass reading removed from rule 1 | migrate-clean | 2 | drift 1 refused without naming `probe_ic_c.label`, `.tag` |
| M9b the COPY PROGRAM rule removed | static | 1 | the lexer shapes |
| M10c rule 8 unable to fire | migrate-clean | 2 | drift 8 refused without naming the attributes |
| M11 the old view pattern | static (identity-isolation) | 1 | `create recursive view` |

Every file was restored byte for byte after each mutation (the harness compares sha256 and stops otherwise).

## 5. Per-layer verdicts

- **Static** (`npm run test:bootstrap`, 684 tests): items 1, 3, 4, 5, 6, 7, 9 and 11 are held here; 2, 8 and
  10's SQL text and pinned lists are asserted here too (probe digests move: pinned trigger `f136765c6beb5dbf`
  to `6c73217f9ce9e45f`, pinned grant `eb5ecbffb7f4f3cf` to `06c68d76dce9d29a`, index coverage
  `ae187b635c0ae0f4` to `2d47460e43a5c68e`; every other digest stays).
- **migrate-clean**: items 2, 8, 9 and 10 are held here, each new rule shown able to fail by its own drift on
  every run.
- **rls-smoke**: unchanged (1087 cases); item 9's lexer refuses there too, in the sources rls-smoke feeds itself (not a migration: Q0-OT-2). No case is added.

## 6. Owed, and why (recorded on the blockers, each with its owner)

- **Stated limits of what this batch added:** the trigger rule reads app and private only; the export rule's
  token half reads column names; the audit-table tripwire is text and cannot see a dynamic EXECUTE; a COPY
  whose words are computed at run time is not read; rules 7 and 8, like 2-4, fail by design on a provisioned
  platform instance until Q170-c's measurement.
- **Not in the task's list, left owed:** C0 R2's other two guards on 160-prep (phase inversions' `because`
  one way; the partial-cover verdict) and Q0 R-2 on 160-prep's six static spellings ([192], A0); Q0 R-1 and
  C0 R-1 on 170-assert ([193], A0); C0 N4's lint message ([191] (8), A1 with A0); A1 R3, R4 on 150-prereq
  ([194]); every other item those blockers already hold.

## 7. For the Owner, A0 and the reviewers

Nothing here needs the Owner's words: the batch adds no migration and no grant, and changes no policy, role,
contract or decision. The reviewers are asked to judge whether each closure is as strong as worded, and in
particular whether the do-block allowlist (item 1) and the derived export set (item 5) are allowlists in
substance or only in form.

## 8. Private artefacts (not in the repository)

`a0-owed-toolingr/` in the run's scratchpad: `round.sh` (one fresh cluster: shim, migrate-clean, rls-smoke
twice), `mutate.mjs` (each mutation applied, run and restored byte for byte), `mutations.log`, and each
round's output. The cluster on 5507 is stopped and its data directory removed at the end of the run.

## Review round

Written by a subagent of `/claude/a0_atlas` (the Author) after the three role runs reported on `af394fa`. It
fixes; it approves nothing. **No migration**: no file under `db/foundation/migrations/` changes, and nothing
here needs a decision. Every finding was bounded and is changed in this round; nothing is recorded as owed
instead, beyond the stated limits below.

**Cherry-pick map** (`git cherry-pick -x`, each a single new evidence file):

| Review | Source commit (review branch) | On this branch |
|---|---|---|
| C0 contract review | `1cc4857` (`review/c0-batch-owed-tooling`) | `571980a` |
| A1 security review | `c35e0a5` (`review/a1-batch-owed-tooling`) | `bf984f9` |
| Q0 independent test | `dee14ef` (`review/q0-batch-owed-tooling`) | `a071703` |

**Finding -> change -> measured.** Static mutations ran `node --test` on the file named; live ones a fresh
cluster on 127.0.0.1:5507 (shim first, `make db-migrate-clean`, then `make db-rls-smoke` twice), each drift
APPENDED to `140_audit.sql`; every file was restored byte for byte (sha256 compared by the harness). Node
`v24.20.0` checked before every run.

| Finding | Change | Measured |
|---|---|---|
| C0-OT-1, A1-OT-2, Q0-OT-1 (LOW): the do-block allowlist passed a quoted name or a comment; its JOIN and relation rules were vacuous | `foundation-contract`: the block refuses any `"` and any `/*` once literals are blanked (170's block has neither); five drifts (`"set_config"(`, `pg_catalog."set_config"(`, `set_config/**/(`, `from "app"."workspaces" for update`, `from/**/app/**/./**/jobs`); a JOIN drift and a relation drift that each draw exactly one problem; the comment and plan row 1 reworded | Q0's Q1a in 170's block: static 1 (was 0). The quote rule, the comment rule, the JOIN rule and the relation rule each removed: static 1 (JOIN and relation were 0 at Q0's Q1c/Q1d) |
| A1-OT-1 (LOW): a trigger marked `tgisinternal` by an UPDATE of `pg_catalog.pg_trigger` passed every pin | `run.mjs`: the pinned trigger probe's third rule -- every internal trigger on a table in app and private is one of its table's FK checks (`RI_FKey_check_ins`/`_check_upd` referencing, `RI_FKey_noaction_del`/`_noaction_upd` referenced); measured on the clean set first: all 360 internal triggers on app and private tables are of that kind. A third self-test drift (a hidden trigger on `app.workspaces`, and an FK trigger re-pointed at `RI_FKey_cascade_del`). Digest `6c73217f9ce9e45f` -> `8412a302b7f190a7`; the rule's text asserted | A1's drift (a `when`-guarded trigger on workspaces, then marked internal) appended to 140: migrate-clean **2**, "internal trigger(s) ... app.workspaces.r2_hidden (private.refuse_mutation)"; rls-smoke 0, 0 (as A1 found). The rule made unable to fire: migrate-clean 2, "its self-test after drift 3 passed" |
| C0-OT-2, Q0-OT-3 (LOW): `COPY ... TO '<file>'` wrote a host file with every layer green; G1's remedy also named the server-file functions | `psql-driver.mjs`: `COPY_SERVER_FILE` (COPY of a table -- quoted or not, a column list allowed -- or a parenthesised query, TO or FROM a quoted literal; STDIN/STDOUT admitted) and `SERVER_FILE_CALL` (a call of `lo_import`, `lo_export`, `pg_read_file`, `pg_read_binary_file`, `pg_stat_file`, the `pg_ls_*dir` family, adminpack's `pg_file_*`; a name after FUNCTION is not a call), both in psqlLex; measured first on every tracked `.sql`, `scripts/db/*.mjs` and `tests/db/**/*.mjs` file: no match. The lexer test's `copy app.jobs from '/tmp/x'` moves from 0 to 1, with twelve refused and four admitted shapes | `copy (select 'r2 file') to '<private dir>/r2_copy_marker'` appended to 140: migrate-clean **2** ("140_audit.sql line 1019 ... COPY ... TO/FROM a server file"), **no file written** (was 0 and written); `select pg_catalog.pg_stat_file('postgresql.conf')`: migrate-clean 2 by line. rls-smoke 2 in both, only because the database was left empty (Q0-OT-2). Each rule removed: static 1 |
| C0-OT-3 (LOW): the export-label guard read two of ten buckets | `exportLabelProblems` refuses a minimum-domain class in every omitted bucket but `in-minimum-domain-projection-undecided` and the derived `not-workspace-data`; M-C2 as an in-test drift; the message reworded | C0's M-C2 now fails by name; the rule narrowed back to `outside-minimum-domains`: static 1 |
| Q0-OT-5 (LOW): the eleven classes a hand list, three held by drifts | the eleven asserted as a literal beside each one's ERD line (548, 549, 551-555; ERD:546 opens the list) and one drift per class (an exported table of the class moved outside fails by name) | Q0's Q5 (the list cut to three): static 1 (was 0) |
| Q0-OT-4 (LOW), C0-OT-4 (INFO): three quotes in two blockers each | both citation checks require a quote said by exactly one blocker; [77]'s, F160-04's and F160-15's quotes lengthened to text their own blocker alone says; Q0's Q4 as an in-test drift | Q0's Q4 (F160-04 moved to [91]): static 1 (was 0); the exactly-one rule removed: static 1 |
| A1-OT-3 (LOW), Q0-OT-8 (INFO): the tripwire missed comments, CREATE RULE and a rename swap, and its limit was overstated | `sqlWithoutComments` (line and nested block comments as whitespace, outside literals and quoted identifiers) for the policy, ALTER and touch scans; two patterns, `a rewrite rule` and `a table renamed onto either name`; ten spellings and three refusals pinned; the limit restated in the test and on [191]. `identity-isolation`'s `CREATE_VIEW` reads a comment between its words | the stripping put back to `--` only: static 1; the rule pattern dropped: static 1; the view gap put back to whitespace: identity-isolation 1 |
| A1-OT-4 (LOW), Q0-OT-7 (INFO): redaction leaked a percent-encoded user, database and host, a host list, a zone id and a `#` tail | `redactConnection` also parses the authority and path from the raw text (user, password, each host of a `,` list without brackets or port, the database) and redacts each as written and decoded; the raw query split on `&` only; its comment corrected; seven cases pinned (A1's five, a zone id, Q0's encoded `host`) | the split on `#` put back: static 1 (a first run aimed at the guard's identical `split('&')` line passed, since `#` is refused there before the split; re-aimed at redaction's own line: 1); decoding removed: 1; the raw authority removed: 1 |
| Q0-OT-2 (LOW): "rls-smoke 2 ... lexer" for the PROGRAM drift | plan row 9, §3's C0 G1 row and §5's rls-smoke line corrected in place (each marked); [185] corrected in its append; the README says so | wording (rls-smoke reads no migration text, as Q0's D7 measured) |
| C0-OT-5 (INFO): "one had been stale since 170" | plan row 4 corrected in place; [195] corrected in its append | wording |
| C0-OT-6, A1-OT-I3, Q0-OT-10 (INFO): the disposition's "C0 R1, R2" and "C0 N3, N4" unqualified | disposition §4 items 5 and 6 qualified, with a note saying when; the manifest rationale qualified | wording |
| Q0-OT-6 (INFO): the measured-on version is read from the file it checks, and `--check` runs in no target or CI | stated as a limit on [195] (CI is protected; owed to the Integration Owner if it is to run there) | -- |
| A1-OT-I1, A1-OT-I2, Q0-OT-9 (INFO) | none beyond the stated limits (computed words; app and private only), restated on [185] and [195] | -- |

**Blockers.** open_blockers[185] and [191]-[195] each carry a second append ("THE OWED-TOOLING BATCH'S REVIEW
ROUND ..."), nothing above rewritten; the count stays 196. The manifest's per-increment rationale is rewritten
for this round. **Packaging**: `scripts/test-suite-contract.mjs`'s foundation-contract assertion floor 1000 ->
1014 (the guard's own count; no test added or renamed; identity-isolation stays 2169); the integrity manifest
regenerated.

**Live rounds on the final code** (fresh cluster each): f1 -- migrate-clean 0 (30 probes, the pinned trigger
probe "refused each of its 3 drifts", post-migrate pass 51 blocks), rls-smoke 0 and 0 (1087 cases each); a
second round, f2, on the committed code, and the final `npm run check`, branch scope, `check:handoff` and
`verify` are recorded in the handoff, refreshed last and alone.

**Private artefacts** (`a0-owed-toolingr2/` in the run's scratchpad): `round.sh`, `mutate.mjs`,
`static-mut.sh`, `mutations.log`, `copyscan.mjs` (the source scan for the two new lexer rules),
`q-internal.sql` (the internal trigger inventory), `append-blockers.mjs`, `rationale.mjs`, and each round's
output. The cluster on 5507 is stopped and its data directory removed at the end.
