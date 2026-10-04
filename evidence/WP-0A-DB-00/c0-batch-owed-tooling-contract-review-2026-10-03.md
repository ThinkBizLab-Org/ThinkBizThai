# C0 contract review: the owed-tooling batch (allowlists for denylists, trigger and schema pins, citation and export pins, the host guard's last halves)

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-owed-tooling` (PR #176, Draft, open; CI "Bootstrap validation" run 37185404172 success on `af394fa`) |
| Subject head | `af394fa1f16252fc55af32488f22fd3327ba38fd` (handoff refresh, alone), over code `70ab5ca4c596d7cbf88041a0630aebe7b67b2d60` and evidence `3dd930e` |
| Base | `5558b26` (`main`, the merge of #175) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `review/c0-batch-owed-tooling`, created at `af394fa` in my worktree. The subject branch is checked out in A0's worktree, so the guards that read the branch NAME were run in a private clone of my worktree (in my private scratch directory), on a branch named exactly `agent/claude/WP-0A-DB-00-batch-owed-tooling` at `af394fa`, with `origin/HEAD` pointed at `5558b26`. Nothing was written to A0's worktree or pushed. |
| Scope | `git diff 5558b26..af394fa` whole (17 paths); the plan `a0-batch-owed-tooling-plan-2026-10-03.md`; the disposition `product-owner-disposition-2026-10-03-batch-owed-tooling.md`; `open_blockers[185]` and `[191]`-`[195]` before and after; the cited findings in `c0-batch-129-recheck`, `c0-batch-141-prep-recheck`, `c0-batch-160-prep-recheck`, `c0-batch-170-recheck` and `c0-batch-170-contract-review`; the handoff. |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**, in a git worktree A0's workflow
  created, under a brief A0's workflow wrote. A0 chose the questions I answer.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar; it is still a real limit on independence.
- Whether this file counts as the Reviewer signature RFC-2026-002 requires is for the **Integration
  Owner and the Product Owner** to decide. I do not decide it.

## §1 Verdict in one paragraph

The batch does what it says in substance: no migration is added or edited (`140` and `170` are
byte-identical to `5558b26`; nothing under `db/foundation/migrations/` is in the diff), no grant, policy,
role or contract changes, and each of the eleven items adds a reading that I could make fail. I re-ran
five of the plan's live drifts and one stronger one on fresh clusters, and each failed `db-migrate-clean`
by name as claimed. Every count I re-measured holds (51 triggers on 47 tables, 4 trigger functions, 563
default key columns, 66 tables, 1087 rls-smoke cases, 684 tests, 89 `.sql` files with no `PROGRAM`).
The blocker edits are append-only (measured field by field). The deferred items are recorded on the
blockers with owners and match plan §6 and the handoff. **But two closures are narrower than their
records.** (1) Item 1's do-block "allowlist" does not see a call whose name is double-quoted or followed
by a comment before `(`. `"set_config"('role', 'app_worker', false)` inside 170's block, in an allowed
statement shape, leaves the whole static suite green (684/684), and PostgreSQL 17.11 executes it
(C0-OT-1, LOW). This is the same class of gap C0-170R-1 reported, by another spelling. (2) Item 5's
export-label guard reads two of the ten omitted buckets. `app.content_items` moved from the export into
`internal-job` stays green (C0-OT-3, LOW). Separately, `COPY ... TO '<server file>'` still writes a file
on the database host with every layer green. G1's own remedy named that sibling, and no blocker records
it (C0-OT-2, LOW). Two wording slips and one weak-quote note are INFO. **No stop-the-line.** None of the
findings blocks the merge in my reading. C0-OT-1's record on `open_blockers[195]` should be narrowed or
the gap closed, and that is cheap.

## §2 What I measured, and what I only read

All measured runs used Node `v24.20.0` (`node -v` checked first; `/Users/bank/.local/node-v24.20.0/bin`
is first on PATH), PostgreSQL 17.11 from `/opt/homebrew/bin`, port **5505** on 127.0.0.1 only, TCP only
(`-c unix_socket_directories=''`), `initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, the CI shim
first, and a fresh `initdb` every round. Drifts were APPENDED to `db/foundation/migrations/140_audit.sql`
(or, for M-C1, inserted into 170's do-block, and for M-C2 applied to the export fixture). Every touched
file was restored byte for byte by a harness that compares sha256 and stops otherwise. The final sha256
values are `140_audit.sql` `2ac596bb950e8dfb…`, `170_…sql` `9a2dbb97718920f8…` and
`export-manifest.fixture.json` `cf763b680c9914d1…`, and `git status` was clean. The cluster was stopped
and its data directory removed. Nothing is listening on 5505.

| # | Command | Where | Exit | Output |
|---|---|---|---|---|
| R1 | `node scripts/verify-branch-scope.mjs 5558b26 WP-0A-DB-00` | clone, branch NAME `agent/claude/WP-0A-DB-00-batch-owed-tooling` at `af394fa` | 0 | "all 17 changed path(s) are declared, and every amendment explains one" |
| R2 | `npm run check:handoff` | same | 0 | "describes the branch: nothing substantive after its cited head" (a first run with the clone's `origin/HEAD` still pointing at my worktree's HEAD exited 91; I fixed `origin/HEAD` to `5558b26` and re-ran) |
| R3 | `npm run verify` | same | 0 | "clean: exit 0 — tests 684, pass 684, fail 0" |
| R4 | fresh cluster, shim, `make db-migrate-clean`, `make db-rls-smoke` twice | clone at `af394fa` | 0, 0, 0 | pinned trigger probe "51 pinned definitions on 47 tables … 4 functions … refused each of its 2 drifts"; pinned grant probe "… 3 pinned … refused each of its 8 drifts"; index coverage "refused each of its 3 drifts"; post-migrate pass "51 apply-time blocks, 39 re-run as written, 12 superseded and replaced"; rls-smoke "1087 isolation case(s) passed" twice |
| R5 | `DB_TEST_URL=… node scripts/db/generate-pinned-grants.mjs --check` | R4's cluster | 0 | both files "matches the catalog"; 66 tables |
| R6 | catalog query: key columns of every index on app/private tables | R4-family cluster | — | 563 key columns, 0 under a non-default collation, 0 under a non-default operator class (plan item 8's "563" holds) |
| R7 | `git ls-files '*.sql'` and a grep for `(to\|from)\s+program` | `af394fa` | — | 89 files, no match (plan item 9's "none of 89" holds) |
| R8 | `DB_TEST_URL='postgresql://postgres@127.0.0.1:5505/postgres#?host=c0-probe.invalid' make db-migrate-clean` | worktree | 1 (make 2) | `could not translate host name "[redacted]"`; `c0-probe.invalid` is not printed (G-2 holds through the real tool) |
| R9 | `gh pr view 175` / `gh run view 37181470982` / `gh pr view 176` | — | 0 | #175 merged 2026-10-04T06:05:20Z at head `ab7db39`, merge `5558b26`; run 37181470982 success on `ab7db39`; #176 Draft, open, head `af394fa`, its check green |
| R10 | field-by-field JSON diff of `work-packages/WP-0A-DB-00.json`, `5558b26` vs `af394fa` | — | — | `ownership.branch` changed; `amends_without_owning.rationale` rewritten (the per-increment slot); `open_blockers[185]`, `[191]`-`[195]` each a pure APPEND (+1507, +2101, +2531, +1814, +1741, +2430 chars); nothing else changed. The amendment path list is unchanged (three) |

Live drifts, each on a fresh cluster:

| Drift (appended to 140) | migrate-clean | rls-smoke | Named by |
|---|---|---|---|
| D1 (stronger than A0's): `private.c0_force_lifecycle()` and a BEFORE UPDATE **OF lifecycle_state** trigger on `app.workspaces` **guarded by `WHEN (old.lifecycle_state is distinct from new.lifecycle_state)`** | **2** | 0 | pinned trigger probe: "unpinned: CREATE TRIGGER c0_force_lifecycle BEFORE UPDATE OF lifecycle_state ON app.workspaces … WHEN (…)". This confirms the plan's stated limit that rls-smoke alone would pass a WHEN-guarded trigger. The new probe holds it. |
| D2: `workspace_members_user_id_status_idx` rebuilt `(user_id, status collate "C")` | **2** | 0 | index coverage probe: `app.workspace_members.status` |
| D3: `copy (select 'c0 prog') to program 'cat > <private dir>/c0_prog_marker'` | **2** | **2** | lexer, before anything applied: "140_audit.sql line 1019: … COPY ... TO/FROM PROGRAM". No marker file was created. |
| D4 (mine): `copy (select 'c0 file') to '<private dir>/c0_file_marker'` | **0** | **0** | nothing. The marker file was written with `c0 file`. `npm run test:bootstrap` under the same drift: 684/684 (C0-OT-2) |
| D5: `alter schema private owner to app_command` | **2** | 0 | pinned grant probe rule 7: "schema private owned by app_command, unlisted: app_command CREATE … on private …" |
| D6: `alter role app_worker bypassrls` | **2** | 2 | pinned grant probe rule 8: "app_worker rolbypassrls" |

Static mutations (worktree, restored byte for byte):

| # | Mutation | Command | Exit | Verdict |
|---|---|---|---|---|
| M-C1 | inside 170's do-block, before `end $$;`: `select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where "set_config"('role', 'app_worker', false) is not null;` | `node --test test-kits/db/foundation-contract.test.mjs`; then `npm run test:bootstrap` | **0**; **0** | 80/80; 684/684. The allowlist passes it (C0-OT-1) |
| M-C1s | the test's own `doBlockShapeProblems` (copied verbatim from `:3426-3450`) on three spellings: `"set_config"(…)`, `set_config/**/(…)`, `pg_catalog."set_config"(…)` | node | — | `[]` for all three. `pg_catalog.set_config(…)` unquoted is refused, as the plan says |
| M-C1p | the three spellings inside a plpgsql `DO` block on R4's cluster | `psql -f` | 0 | `application_name` set to `c0_quoted`, `c0_comment` and `c0_qualified_quoted` in turn. All three execute |
| M-C2 | the export fixture: `app.content_items` (CONTENT-HISTORY) moved from `files` into the `internal-job` omitted bucket, package checksum recomputed | `node --test …foundation-contract…`; then `npm run test:bootstrap` | **0**; **0** | 80/80; 684/684 (C0-OT-3) |
| M-C4 | for every `open_blockers[i] ("quote")` citation in the two maps, the number of blockers that carry the quote (computed, no file changed) | node | — | 18 of 21 unique; `[77]`'s quote is also in `[78]`, `F160-04` also in `[91]`, `F160-15` also in `[150]` (C0-OT-4) |
| M-C5 | the line each audit-coverage citation named, at `5558b26` | node | — | `open_blockers[156]` is on line 411 (cited 412); `[190]` is on line 445 (cited 446). Both were stale, not one (C0-OT-5) |

**Read, not measured:** A0's seventeen code mutations (M1-M11 of plan §4) beyond the equivalent of M1,
which I reproduced through the copied function. The drift sets inside the probes' self-tests, which ran
green as part of R4. The A1 and Q0 findings' own texts, except where quoted. Whether the Owner's
`ลุยต่อเลย เอาตามแนะนำ` of 2026-10-04 is a second utterance distinct from the identical words batch
170's rationale already transcribes for 2026-10-04. I have only the harness's relay of this request,
which carries the same words.

## §3 Per item: does it close what the finding asked, and is the closure recorded truthfully?

| # | Finding asked | Closed? | Record (`open_blockers`, plan, commit) |
|---|---|---|---|
| 1 | C0-170R-1 (mine): "replace the deny-list with an allow-list of the function names the block calls … which `set_config` and any `private.`/`app.` call would then fail" | **Mostly.** Shapes, FROM sources, JOIN and qualified relations are allowlisted, and nine drifts are refused. A call is recognised only as `identifier(` or `ident.ident(`. A double-quoted name, or a comment between the name and `(`, is invisible to it (M-C1/M-C1s/M-C1p) | `[195]` says "six catalog-reading calls and no other relation" and "each of nine drifts is refused". True as measured on those nine, **stronger than held** for calls (C0-OT-1) |
| 2 | A1 R-2: a trigger on `app.workspaces` writing `NEW.lifecycle_state` passed every layer | **Yes**, and wider: every non-internal trigger on every app/private table, the four functions they run, owner and digest. D1 (WHEN-guarded, which rls-smoke misses) fails by name. Rules on other relations stay with the existing rewrite-rule and `tgenabled` probes (`run.mjs:1903`, `:1079`) | True; the stated limit (app/private only) is recorded in the handoff |
| 3 | C0-170-3: `_how_measured` says "through 140" | **Yes.** The generator writes the last migration and the server version; R5 `--check` 0; the static suite holds both files to the current last migration | True ("one line each" holds in the diff) |
| 4 | D3, C0-7, Q0-F9: `(line N)` citations pinned by nothing | **Yes** for line numbers and for a move to a blocker that lacks the quote. **Not** for a move to a blocker that also carries the quote: three quotes are in two blockers (C0-OT-4, INFO) | `[195]` (6) true. "one already stale since 170" is wrong: both were (C0-OT-5) |
| 5 | A1 R1/R2, Q0 R-3: export_allowed unpinned; C0 R1 (mine): F160-17's record held by nothing; C0 R2 first guard (mine): "refuse any [minimum-domain] class" in `outside-minimum-domains`; Q0 R-5 | **Yes** for export_allowed (the derived set of 11, pinned; export_allowed is audit_logs' alone), for F160-17 (ids, pairs, text and `[192]` (13) held), and for the `outside-minimum-domains` bucket over all 11 classes, as my R2 asked. **Not** for the same omission through another bucket (M-C2) | `[192]` (c) says the export-label guard asserts "the declared rule", and the test message says "every omitted bucket holds the declared rule" (`foundation-contract.test.mjs:4832`). Wider than held (C0-OT-3). C0 R2's other two guards are honestly owed in `[192]` |
| 6 | Q0 R1, R3, R4; Q0 R2, C0 N3 (mine), A1 N2/N3 | **Yes.** `SHAPE_KEYS` literal and top-level keys closed; `_shape.batch` and its `[191] (8)` citation held; both CARRIED sentences held; `AUDIT_TABLE_TOUCH` reads GRANT/REVOKE, CREATE/ALTER/DROP TRIGGER, ALTER/DROP POLICY and DROP/CREATE TABLE with bounded names. C0 N4: the first half is closed, and the second half (the lint message in `run.mjs`) is owed | `[191]` true, including the N4 split and the correction to (9). The disposition §4 and rationale say "C0 N3, N4" unqualified (C0-OT-6, INFO) |
| 7 | G-1, G-2 | **Yes.** Each half pinned by a URL only it refuses; every crafted URL through both tools; redaction reads the raw query (R8 through `db-migrate-clean`) | `[194]` (a), (b) true |
| 8 | Q0 R-2 on 150-prereq: collation/opclass not read | **Yes** (D2; R6 confirms 563/0/0) | `[194]` (c) true |
| 9 | C0 G1 (mine) on 129: `COPY ... PROGRAM` | **Yes** for PROGRAM (D3: 2 and 2, no marker; nested `/* /* */ */` comments are caught too, because the lazy comment match extends). My remedy (a) also named, "for good measure", `lo_import`/`lo_export` and the server-file functions. `COPY … TO '<file>'` writes a host file with every layer green (D4) and is recorded nowhere | `[185]` "CLOSED -- COPY ... TO/FROM PROGRAM" is true as worded. The sibling is neither owed nor a stated limit (C0-OT-2) |
| 10 | A1 S1, Q0 R-2 / A1 S3 on 170-assert | **Yes** (D5, D6 by name; the three pinned schema privileges match R4) | `[193]` true; rules 7-8's provisioned-instance limit stated |
| 11 | A1 S2, Q0 R-5 | **Yes**: one `CREATE_VIEW` pattern in all three scans with its spellings pinned. Like every text scan here, it does not read a comment between the words. It is a tripwire, and the live pinned grant probe names any view in app/private | `[193]` (c) true |

**Deferred items, honestly owed?** Yes. The four `not_done` entries match plan §6, the handoff's
`known_limitations` and the blockers: C0 R2's other two guards and Q0 R-2 on 160-prep in `[192]`; Q0 R-1
and C0 R-1 on 170-assert in `[193]`; C0 N4's second half in `[191]`; A1 R3/R4 in `[194]`. Each is
outside the batch's eleven and has an owner. Nothing that needs the Owner's words or access (the RFC
approvals, SLO ratification, Q170-c, DATA-DEC-03) is touched or claimed.

**Ownership amendments.** Justified. R1 passes on 17 paths. The three paths outside ownership are
unchanged in the manifest (`test-suite-contract.mjs`, `branch-identity.test.mjs`,
`integrity-manifest.json`), and each is changed for its stated reason only: the floors 946→1000 and
2167→2169 with no test added or renamed (684 stays); the branch slot replaced in both places; the
digests regenerated. `evidence/VERIFICATION.md` is rightly untouched.

**No decision taken, no migration added.** Confirmed (R10; no file under `db/foundation/migrations/` in
the diff; no grant, policy or role text in any changed SQL outside probe self-test drifts). The
disposition records #175's merge as A0 executing the standing delegation, with the RFC-2026-002 /
RFC-2026-025 §5 gap stated rather than claimed closed. R9 confirms the merge facts it cites.

## §4 Claims checked

| Claim (where) | Verdict |
|---|---|
| 51 triggers on 47 tables, 4 functions (commit `70ab5ca`, plan item 2, `[195]`, README) | True (R4) |
| pinned grant probe 8 drifts; index coverage 3; 30 probes; 1087 cases twice; 684 tests (plan §2, handoff) | True (R3, R4) |
| "both files regenerated (one line each)"; `--check` 0; 66 tables | True (diff, R5) |
| 563 key columns, every collation and opclass default (plan item 8) | True (R6) |
| none of 89 `.sql` files carries a `PROGRAM` (plan item 9) | True (R7) |
| each of the five §3 drifts fails migrate-clean by name, with the rls-smoke column as stated | True (D1-D3, D5, D6; D1 in a stronger form) |
| "All eleven named … were bounded and are closed" (disposition §2; rationale "ALL CLOSED") | True as bounded work. Items 1 and 5 are narrower than worded (C0-OT-1, C0-OT-3) |
| item 1: "every call one of six catalog-reading calls" (plan §1, `[195]`, test comment `:3420-3425`) | **Overstated** (C0-OT-1) |
| item 5: "every omitted bucket holds the declared rule" (`:4832`); `[192]` (c) "assert the declared rule" | **Overstated** (C0-OT-3) |
| item 4: "(one had been stale since 170)" (plan §1 row 4, `[195]` (6)) | **Untrue**: both were (C0-OT-5) |
| disposition §4 items 5-6 "C0 R1, R2", "C0 N3, N4" | Unqualified; the blockers and the handoff qualify them correctly (C0-OT-6) |
| #175 merged at `ab7db39` / `5558b26`, 06:05:20Z, run 37181470982 green (disposition §3, rationale) | True (R9) |
| `70ab5ca` a plain commit because commit-when-clean refused on the two handoff guards alone | Read, not reproduced. The commit order (code, docs, handoff alone and last) holds in `git log` |
| `af394fa` cites `5558b26..3dd930e`, "2 added, 14 modified, 0 deleted" | True (handoff file lists; R2) |

## §5 Findings

### C0-OT-1 — LOW — the do-block allowlist does not see a call through a quoted name or a comment

- **Where:** `test-kits/db/foundation-contract.test.mjs:3438-3441` (the call scan
  `/(\bas\s+)?\b([a-z_][a-z0-9_$]*(?:\s*\.\s*[a-z_][a-z0-9_$]*)*)\s*\(/gi`), the comment at `:3420-3425`,
  plan §1 row 1, `open_blockers[195]` (this batch's append), commit `70ab5ca`'s item (1).
- **Defect:** a function name in double quotes (`"set_config"(`, `pg_catalog."set_config"(`), or followed by
  a block comment before its parenthesis (`set_config/**/(`), is not matched as a call. Placed in the
  `where` clause of an allowed `select string_agg(...) into offending from pg_catalog.pg_attribute a where
  ...` statement, it also passes the shape, FROM, JOIN and relation checks. Measured: M-C1 leaves
  foundation-contract 80/80 and the whole static suite 684/684 green with `"set_config"('role',
  'app_worker', false)` in 170's block. M-C1p shows PostgreSQL 17.11 executes all three spellings inside a
  `DO` block. This is C0-170R-1's own gap by another spelling, so "every call one of six" and the closure
  on `[195]` are stronger than what is held.
- **Why LOW, not higher:** 170 is integrated and may not be edited (CONTRIBUTING_AGENTS.md "Never rewrite
  an integrated migration"). The guard only protects against an edit a reviewer would see, and a
  `set_config('role', …)` that persisted would most likely break the later migrations visibly.
- **Remedy:** before the scans, strip `/* … */` comments (nested) and either refuse any `"` outside the
  blanked literals or unquote double-quoted identifiers; add the three spellings to the drift list. If
  not done in this batch, narrow `[195]`'s sentence to "an unquoted call outside the six" and owe the rest.

### C0-OT-2 — LOW — `COPY … TO '<server file>'` still writes a host file with every layer green, and G1's named siblings are recorded nowhere

- **Where:** `scripts/db/psql-driver.mjs:422` (`COPY_PROGRAM` reads PROGRAM only, by design); the lexer
  test admits `copy app.jobs from '/tmp/x'` (count 0); `open_blockers[185]`'s append ("CLOSED -- COPY ...
  TO/FROM PROGRAM … Still owed here, unchanged: …" does not list this); C0 G1's remedy (a) in
  `c0-batch-129-recheck-2026-10-03.md:173-174` ("for good measure, `lo_import`/`lo_export` and the
  `pg_read_*file`/`pg_ls_dir` server-file functions").
- **Defect:** D4 appended `copy (select 'c0 file') to '<private dir>/c0_file_marker'` to 140. The static
  suite gave 684/684, migrate-clean 0 and rls-smoke 0, and the file was written on the host as the
  server's OS user. On a developer machine that is the executor's user too. That is the same reach G1's
  "why it matters" describes (a file earlier on a user-writable PATH), without PROGRAM. The batch's
  closure of PROGRAM is true as worded. The sibling is neither owed nor stated as a limit.
- **Remedy:** either extend the lexer rule to `COPY … TO|FROM '<literal>'` (a server-side file; `STDIN`
  and `STDOUT` stay admitted) and to `lo_import`/`lo_export`/`pg_read_file`/`pg_read_binary_file`/
  `pg_ls_dir`/`pg_stat_file` by name, or append it to `[185]`'s owed list as a stated limit.

### C0-OT-3 — LOW — the export-label guard reads two of the ten omitted buckets, but its message says "every omitted bucket"

- **Where:** `test-kits/db/foundation-contract.test.mjs:4750-4760` (`exportLabelProblems` reads
  `outside-minimum-domains` and `not-workspace-data` only), `:4832` ("every omitted bucket holds the
  declared rule"), `open_blockers[192]` (c).
- **Defect:** M-C2 moved `app.content_items` (CONTENT-HISTORY, a §11.1 minimum domain) out of the export
  into the `internal-job` bucket. foundation-contract 80/80 and the whole static suite 684/684 stayed green.
  The batch did what my C0 R2 remedy asked for the one bucket it named, so this is residual reach, not a
  failure to do the ask. But the assertion's message and `[192]` (c)'s "the guards assert the declared
  rule" read as covering every omission route, and they do not.
- **Remedy:** hold every omitted bucket. For example, refuse a MINIMUM_DOMAIN_CLASSES table in any bucket
  other than `in-minimum-domain-projection-undecided` and `not-workspace-data` (whose membership is
  already derived), or pin each bucket's table list by name. Or narrow the message and `[192]` (c) to
  the two buckets.

### C0-OT-4 — INFO — three citation quotes are carried by two blockers each

- **Where:** `db/foundation/lint/retention-map.json`: `open_blockers[77] ("§10 DEFINES NO \`CATALOG\`
  CLASS")` (also in `[78]`), `open_blockers[192] ("F160-04")` (also in `[91]`) and `open_blockers[192]
  ("F160-15")` (also in `[150]`); `retentionCitationProblems` at `:4779-4790`.
- **Defect:** the check is `blockers[i].includes(quote)`, so a citation moved consistently to the other
  carrier stays green (computed, M-C4; not mutated). That is Q0's Q2 in a narrower form.
- **Remedy:** require each quote to occur in exactly one blocker, and lengthen the three.

### C0-OT-5 — INFO — "one had been stale since 170" is untrue: both audit-coverage line citations were stale

- **Where:** plan §1 row 4; `open_blockers[195]`'s append ("(one already stale since 170)").
- **Measured (M-C5):** at `5558b26`, `open_blockers[156]` is on manifest line 411 (cited 412) and `[190]` on
  445 (cited 446). The batch removed both line numbers, so the fix is unaffected. Only the sentence is
  wrong.
- **Remedy:** none needed for the code; correct the word in a later append if the blocker is touched.

### C0-OT-6 — INFO — the disposition lists finding ids without the halves the blockers record

- **Where:** `product-owner-disposition-2026-10-03-batch-owed-tooling.md` §4 items 5 ("C0 R1, R2") and 6
  ("C0 N3, N4"); the manifest rationale's (6) ("C0 N3, N4").
- **Defect:** only R2's first guard and N4's first half are closed. `[191]`, `[192]`, plan §6, the
  rationale's (5) and the handoff say so correctly, so a reader of the disposition alone would
  over-read it. Wording only.

## §6 Stop-the-line

**None.** Measured: no migration, grant, policy, role, CI file or contract changes; the live layers are
green at `af394fa` (R4); the new probes refuse their drifts and mine. No secret, credential, real
identity or private URL is in the diff. The redaction now covers a fragment-carried host (R8). C0-OT-1
to C0-OT-3 are test reach and record wording on guards that protect against a hostile or careless later
migration a reader would see. None is a tenant leak, a secret exposure, a lost job, a migration
divergence, an irreversible deletion or a contract mismatch.

**Does anything block the merge?** Not in my reading. The batch strictly adds readings, and every one
of my findings concerns how far a new reading reaches, not a regression. I recommend that C0-OT-1 be
fixed or its `[195]` sentence narrowed before the merge, because the batch exists to close C0-170R-1.
Whether the 127 §6 bar is met is A0's reading and the Owner's.

## §7 Limits

- Same vendor and model family as the Author, spawned by the Author's workflow (§0).
- I re-ran six live drifts and five static probes; I did not re-run A0's seventeen mutations (Q0's role).
- The branch-name guards ran in a private clone with a hand-set `origin/HEAD` (`5558b26`), not in A0's
  worktree. That clone holds the same objects and the same SHA.
- Every DB run was on PostgreSQL 17.11 on this host. A provisioned platform instance was not touched
  (Q170-c), and rules 7 and 8, like 2-4, are stated to fail there by design.
- D4 and M-C1p ran a server-side file write and `set_config` on my throwaway cluster only. Their reach
  beyond the server's OS user is inferred, not measured.
- I cannot verify that the Owner's 2026-10-04 words are a separate utterance from the identical words
  batch 170's rationale cites for the same date; I have only the relayed request.
