# C0 contract review re-check: the owed-tooling batch's review round

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00`. This is a NARROW re-check of the review-round corrections |
| Subject branch | `agent/claude/WP-0A-DB-00-batch-owed-tooling` (PR #176, Draft, open; CI "bootstrap" run 37188723660 SUCCESS on `a722c1c`) |
| Subject head | `a722c1c37e4918715275e5e0581e9c2904c10b81` (handoff refresh, alone), over code `84e10f7` |
| Previous reviewed head | `af394fa` (my review: `c0-batch-owed-tooling-contract-review-2026-10-03.md`, cherry-picked as `571980a`) |
| Base | `5558b26` (`main`, the merge of #175) |
| Author | `/claude/a0_atlas` |
| Date | 2026-10-04 (the file name carries the phase date, 2026-10-03) |
| Reviewed in | local branch `recheck/c0-batch-owed-tooling`, created at `a722c1c` in my own worktree. The subject branch name is checked out in A0's worktrees (`wf_df28dea9-c0e-1` and `-5`), so I ran the branch-NAME guards in a private clone of my worktree (in my private scratch directory). That clone is on a branch named exactly `agent/claude/WP-0A-DB-00-batch-owed-tooling` at `a722c1c`, with `origin/HEAD` set to `5558b26`. Nothing was written to A0's worktrees and nothing was pushed. |
| Scope | `git diff af394fa..a722c1c` (the round) inside `git diff 5558b26..a722c1c` (20 paths); plan section "Review round" and rows 1, 4, 9, §3, §5; disposition §4; `open_blockers[185]`, `[191]`-`[195]` (second appends); the rationale slot; the handoff; my own findings C0-OT-1 to C0-OT-6 |

This document records review findings. It advances no status, approves nothing, and signs nothing on
anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**. I run in a git worktree that A0's
  workflow created, under a brief that A0's workflow wrote, and A0 chose the questions I answer.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that alone does not bar me. It is still a real limit on my independence.
- The **Integration Owner and the Product Owner** decide whether this file counts as the Reviewer
  signature that RFC-2026-002 requires. I do not decide that.

## §1 Verdict in one paragraph

The round does what it says for every one of my six findings, and each closure is recorded
truthfully on its blocker, with one exception in each of two places. My own drifts now fail. M-C1
(`"set_config"(` in 170's block) fails the static suite. M-C2 (`content_items` moved into `internal-job`)
fails by name. A server-file `COPY ... TO '<path>'` appended to 140 now fails migrate-clean by line and
writes no file. A1's hidden internal trigger fails migrate-clean by name. The wording corrections
(C0-OT-5, C0-OT-6) are made, and each is marked. The blocker edits are pure appends: 196 blockers, and
only `[185]` and `[191]`-`[195]` plus the rationale slot changed. No migration was added, no decision
was taken, and the three amendment paths are unchanged. All three guards exit 0 on the branch NAME, and
CI is green on `a722c1c`.

**Two of the round's closures are still narrower than worded**, both by spellings the new rules do not
model:

1. **Dollar quoting in 170's do-block.** A dollar-quoted literal that contains `'` puts the block's
   literal blanker out of step, so an unquoted `set_config(...)` between two such literals is blanked
   away. The static suite stays at 684/684, migrate-clean and rls-smoke both exit 0, and PostgreSQL
   executes the call (C0-OTR-1, LOW).
2. **Two COPY spellings.** `COPY ... TO $p$<path>$p$` (a dollar-quoted file name) and
   `COPY (select ';') TO '<path>'` (a `;` inside the query) each still write a host file with every
   layer green (C0-OTR-2, LOW).

One INFO note: the `in-minimum-domain-projection-undecided` bucket admits any minimum-domain table by
design, and its membership is pinned by nothing (C0-OTR-3).

**No stop-the-line. Nothing blocks the merge in my reading.** Both LOW findings are cheap to close or
to state as limits.

## §2 What I measured, and what I only read

All measured runs used Node `v24.20.0`. I checked `node -v` before each run, and
`/Users/bank/.local/node-v24.20.0/bin` is first on PATH. The database was PostgreSQL 17.11 from
`/opt/homebrew/bin`, on port **5505** on 127.0.0.1 only, over TCP only
(`-c unix_socket_directories=''`). Each cluster was created with `initdb --locale=C -A trust -U postgres`
under `LC_ALL=C`, with the CI shim applied first, and every round used a fresh `initdb`.

- Drifts were APPENDED to `140_audit.sql`, except D-dodollar, which was inserted before `end $$;` in
  170's block.
- Every touched file was restored byte for byte by a harness that compares sha256 values. The final
  values are the same as at `af394fa`: `140_audit.sql` `2ac596bb950e8dfb…`, `170_…sql` `9a2dbb97718920f8…`
  and `export-manifest.fixture.json` `cf763b680c9914d1…`. `git status` is clean.
- The marker files the drifts wrote were deleted.
- Each cluster was stopped and its data directory removed. `lsof` shows nothing listening on 5505.

| # | Command | Where | Exit | Output |
|---|---|---|---|---|
| R1 | `node scripts/verify-branch-scope.mjs 5558b26 WP-0A-DB-00` | clone, branch NAME at `a722c1c` | 0 | "all 20 changed path(s) are declared, and every amendment explains one" |
| R2 | `npm run check:handoff` | same | 0 | "describes the branch: nothing substantive after its cited head" |
| R3 | `npm run verify` | same | 0 | "clean: exit 0 — tests 684, pass 684, fail 0, skipped 0, todo 0" |
| R4 | fresh cluster, shim, `make db-migrate-clean`, `make db-rls-smoke` twice | worktree at `a722c1c` | 0, 0, 0 | pinned trigger probe claim ends "and every internal trigger there is one of its table's foreign key checks"; 30 probes (refusal counts 6×2, 4×3, 2×4, 1×5, 1×6, 1×8 drifts); post-migrate pass "51 apply-time blocks, 39 re-run as written, 12 superseded and replaced"; rls-smoke "1087 isolation case(s) passed" twice |
| R5 | catalog query on R4's cluster: internal triggers on app/private tables, by function | — | — | 360 internal triggers: `RI_FKey_check_ins` 90, `_check_upd` 90, `_noaction_del` 90, `_noaction_upd` 90. The plan's "all 360 … of that kind" holds |
| R6 | `gh pr view 176` | — | 0 | OPEN, Draft, head `a722c1c`, not merged; check "bootstrap" COMPLETED SUCCESS (run 37188723660) |
| R7 | field-by-field JSON diff of `work-packages/WP-0A-DB-00.json`, `af394fa` vs `a722c1c` | — | — | only `amends_without_owning.rationale` was rewritten (the per-increment slot), and `open_blockers[185]`, `[191]`-`[195]` are each a pure APPEND (+1886, +1472, +1285, +515, +1277, +2726 chars). The count stays 196, and the amendment paths stay three |
| R8 | the three cherry-picks: `-x` trailer and file content vs the source commits | — | — | `571980a`←`1cc4857`, `bf984f9`←`c35e0a5`, `a071703`←`dee14ef`; each file byte-identical to its source |

Live drifts, each on a fresh cluster:

| Drift | migrate-clean | rls-smoke | Result |
|---|---|---|---|
| D-hidden (140): `create trigger c0_hidden before update on app.workspaces … when (new.name = 'c0-never') execute function private.set_updated_at(); update pg_catalog.pg_trigger set tgisinternal = true where tgname = 'c0_hidden';` | **2** | 0 | "internal trigger(s) … not its foreign key checks: app.workspaces.c0_hidden (private.set_updated_at)", as built and after every drift. A1-OT-1 is closed |
| D-copyfile (140): my D4 from the first review, `copy (select 'c0 file') to '<private dir>/c0_file_marker'` | **2** | 2 | "140_audit.sql line 1019: … COPY ... TO/FROM a server file". **No file was written.** C0-OT-2 is closed for this spelling. rls-smoke's 2 is the empty database, not its lexer (Q0-OT-2's correction holds) |
| D-copydollar (140): `copy (select 'c0 dollar') to $p$<private dir>/c0_dollar_marker$p$;` and `copy (select ';c0 semi') to '<private dir>/c0_semi_marker';` | **0** | **0** | **Both files were written** (`c0 dollar`, `;c0 semi`). The whole static suite under the same drift: 684/684 (C0-OTR-2) |
| D-dodollar (170's block): `select string_agg(a.attname, ', ') into offending from pg_catalog.pg_attribute a where $q$'$q$ is not null and set_config('role', 'app_worker', false) is not null and $q$'$q$ is not null;` | **0** | **0** | no layer reads it (C0-OTR-1). Each migration runs in its own session, so the role switch did not reach later steps |

Static mutations (worktree, restored byte for byte):

| # | Mutation | Command | Exit | Verdict |
|---|---|---|---|---|
| M0 | an empty line before `end $$;` in 170 (harness control) | `node --test test-kits/db/foundation-contract.test.mjs` | 0 | the harness itself perturbs nothing |
| M-R1 | my M-C1: `… where "set_config"('role', 'app_worker', false) is not null;` in 170's block | same | **1** | C0-OT-1 is closed for the quoted spelling |
| M-R2 | D-dodollar's line in 170's block | same; then `npm run test:bootstrap` | **0**; **0** | 80/80; 684/684 (C0-OTR-1) |
| M-R3 | the same desync by `E'\\''` instead of a dollar quote | `node --test …foundation-contract…` | 1 | caught, but by the E'' escape-spelling rule (line 90), not by the allowlist. So the desync class is closed for E'' and open for `$…$` |
| M-R4 | `psqlLex` directly on twelve spellings | node | — | refused: `to '/tmp/x'`, column list, quoted table, CTE query, nested parens, `pg_read_file($$…$$)`, `pg_catalog . pg_read_file(`, `"pg_read_file" (/* c */`. **Admitted: `to $p$/tmp/x$p$`, `to $$/tmp/x$$`, `copy (select ';') to '/tmp/x'`** |
| M-E1 | my M-C2: `app.content_items` from `files` into `internal-job`, package checksum recomputed | `node --test …foundation-contract…` | **1** | C0-OT-3 is closed |
| M-E2 | the same table into `in-minimum-domain-projection-undecided` | same; then `npm run test:bootstrap` | **0**; **0** | 80/80; 684/684 (C0-OTR-3, INFO, admitted by the declared rule) |

I also measured (Q1) that PostgreSQL 17.11 executes the D-dodollar shape: `application_name` was set to
`c0_dollar_desync` inside a `DO` block. Both COPY spellings each wrote their file through `psql -f`.

**Read, not measured:**

- A0's eighteen static mutations and four live rounds of the review round, beyond those I reproduced
  above (D-hidden, D-copyfile, M-R1, M-E1).
- A1's and Q0's findings on this round, except where they coincide with mine.
- The ERD line pins. I read `docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md:546-555`, and each
  pinned line names the domain the test ties to it. ERD:550 (Knowledge) carries no class of its own,
  because the knowledge tables are classed `CONTENT-HISTORY`, which the test ties to ERD:552.
- The claim that `84e10f7` passed commit-when-clean. The handoff records it, and the commit order (code,
  then handoff alone and last) holds in `git log`.

## §3 My findings: closed, and recorded truthfully?

| Finding | Closed? | Record |
|---|---|---|
| C0-OT-1 (LOW): do-block allowlist blind to quoted names and comments | **Yes, for the spellings named.** A `"` or `/*` anywhere in the block is refused (`foundation-contract.test.mjs:3470-3471`); the five spellings are in-test drifts; the JOIN and relation rules each have a drift that only they refuse (M-R1 red). **Not** for a dollar-quoted literal that throws the `'`-blanker out of step (C0-OTR-1) | `[195]`'s append is true for what it names. The test comment at `:3458-3459` ("every call means every call however it is spelled; a call whose name is COMPUTED … is the only kind not read") is **stronger than held** |
| C0-OT-2 (LOW): `COPY … TO '<file>'` and G1's named siblings | **Yes, for a plain, `E''` or `U&''` literal file name and for the seventeen functions** (D-copyfile 2, no file; M-R4). **Not** for a dollar-quoted file name or a `;` inside the COPY query (D-copydollar 0/0, both files written) | `[185]` "CLOSED -- COPY TO/FROM A SERVER FILE … TO or FROM a quoted literal" is true if "quoted" is read narrowly. Its stated limit names only computed words, and these two spellings are static (C0-OTR-2). The README (`:733`) and the handoff's compatibility line ("a migration may no longer carry COPY to or from a server file") read wider |
| C0-OT-3 (LOW): export guard read two of ten buckets | **Yes.** Every bucket except `in-minimum-domain-projection-undecided` and the derived `not-workspace-data` is read (`:4868`); M-E1 red; and the eleven classes are now a literal tied to ERD lines, with a drift each (Q0-OT-5) | `[192]`'s append and the new test message ("no minimum-domain table outside the two buckets that may hold one") say exactly what is held. The undecided bucket is admitted by declared rule (C0-OTR-3, INFO) |
| C0-OT-4 (INFO): three quotes carried by two blockers | **Yes.** Both citation checks require exactly one carrier (`:4175`, `:4904`), the three quotes are lengthened, and an in-test drift moves F160-04 to `[91]`. R3's full suite is green on the lengthened quotes, so each is carried once | `[195]` true |
| C0-OT-5 (INFO): "one stale" | **Yes.** Plan row 4 is corrected in place and marked ("first written 'one'; corrected in the review round"); `[195]` corrects it in its append with the line pairs 412/411 and 446/445, which match my M-C5 | true |
| C0-OT-6 (INFO): disposition ids unqualified | **Yes.** Disposition §4 items 5 and 6 are qualified, with a dated note saying when and why; the rationale's (5) and (6) are qualified too | true |

**Deferred items, honestly owed?**

- psqlLex refusing writes to `pg_catalog` relations (A1-OT-1's second option) is not done. A0 says the
  remedy read "and/or", that the catalog rule covers every way of writing, and that a text rule could not
  see an unqualified `update pg_trigger`. D-hidden confirms that the catalog rule names the drift.
  Honest.
- Running `generate-pinned-grants.mjs --check` in CI or a make target (Q0-OT-6) is not done. CI and root
  configuration are protected, and the item is recorded as a stated limit on `[195]` and in the handoff's
  `known_limitations`, with the Integration Owner as owner. Honest.
- The C0, Q0 and A1 re-checks and CI are outside the Author's role. CI is now green (R6).

**Ownership amendments.** Justified. R1 passes on 20 paths. The amendment list is still the same three
paths (R7). `scripts/test-suite-contract.mjs` changes only the foundation-contract floor, 1000 → 1014,
and the guard's own count holds in R3, with tests still at 684 and none added or renamed. The integrity
manifest was regenerated, and R3 is green on it.

**No decision taken, no migration added.** Confirmed. No path under `db/foundation/migrations/` is in
`5558b26..a722c1c`. The only SQL that changed is a probe rule and its self-test drift in `run.mjs`.
No grant, policy, role or contract changed. The disposition's added note says the round decides nothing.

## §4 Claims checked

| Claim (where) | Verdict |
|---|---|
| cherry-pick map `1cc4857→571980a`, `c35e0a5→bf984f9`, `dee14ef→a071703` (plan, handoff, rationale) | True (R8) |
| internal-trigger rule: "measured on the clean set first: all 360 internal triggers … are of that kind" (plan) | True (R5) |
| pinned trigger digest `6c73217f9ce9e45f → 8412a302b7f190a7`; "refused each of its 3 drifts" | True (the static suite asserts the digest, R3; the count is in R4's log) |
| A1's hidden trigger fails migrate-clean by name, rls-smoke 0 (plan, `[195]`, handoff) | True (D-hidden) |
| COPY to a server file: "migrate-clean 2 by line, no file written" (plan, `[185]`, handoff) | True for the spelling measured (D-copyfile). **Wider than held** as a general statement (C0-OTR-2) |
| "a call whose name is COMPUTED … is the only kind not read" (test comment `:3458-3459`) | **Overstated** (C0-OTR-1) |
| "every omitted bucket holds the declared rule: no minimum-domain table outside the two buckets that may hold one" | True as worded (M-E1, M-E2) |
| blockers appended, nothing rewritten, count 196 (plan, rationale, commit) | True (R7) |
| foundation-contract floor 1000 → 1014; tests 684 (commit, handoff) | True (diff; R3) |
| `a722c1c`: `refresh:handoff` (5558b26..84e10f7, 5 added, 15 modified, 0 deleted), the handoff alone | True: the handoff lists 5 added and 15 modified, R2 is green, and `a722c1c` touches only the handoff |
| the README's rls-smoke sentence and plan §3 and §5 corrected (Q0-OT-2) | True. D-copyfile's rls-smoke 2 is the "could not assume identity" failure on an empty database, not a lexer refusal |
| PR #176 Draft and open, not merged; CI on `a722c1c` | True; CI is now SUCCESS (R6). The handoff's "IN_PROGRESS at report time" was true when written |

## §5 Findings

### C0-OTR-1 — LOW — a dollar-quoted literal holding `'` hides a call from 170's do-block allowlist

- **Where:** `test-kits/db/foundation-contract.test.mjs:3461`. The blanker is
  `block.replace(/'(?:[^']|'')*'/g, "''")`, which knows single quotes only. The comment at `:3454-3459`
  and `open_blockers[195]`'s second append ("CLOSED -- (10)'s ALLOWLIST AS WORDED") rely on it.
- **Defect:** `$q$'$q$` is a one-character string to PostgreSQL. To the blanker, its `'` opens a
  literal that runs to the next `'`, which is the one inside `set_config('role'`. So in
  `… where $q$'$q$ is not null and set_config('role', 'app_worker', false) is not null and $q$'$q$ is not null;`
  the text from the first `$q$'` through `set_config('` becomes `''`, and the call scan never sees
  `set_config(`. The line has no `"` and no `/*`. It is in the allowed `select string_agg(...) into
  offending from pg_catalog.pg_attribute a where …` shape, and its only qualified relation is
  `pg_catalog.pg_attribute`.
- **Measured:**
  - M-R2: foundation-contract 80/80 and the whole static suite 684/684.
  - D-dodollar: migrate-clean 0 and rls-smoke 0.
  - Q1: PostgreSQL 17.11 executes the call inside a `DO` block.
  - The same desync by `E'\''` is refused, but only by the separate E'' escape-spelling rule (M-R3).
- **Why LOW:** this is the same class and the same severity as C0-OT-1. 170 is integrated and may not be
  edited, the guard protects against an edit a reviewer would see, and the role switch is local to that
  migration's session (D-dodollar 0/0).
- **Remedy:** blank dollar-quoted bodies before single-quoted literals, or refuse any `$` in the block
  other than the opening and closing `$$` (170's block has none). Add the line above as a drift. Or
  narrow the `:3458-3459` comment and `[195]` to "no unquoted call outside the six, with literals in
  single quotes".

### C0-OTR-2 — LOW — two static COPY spellings still write a host file with every layer green

- **Where:** `scripts/db/psql-driver.mjs:463` (`COPY_SERVER_FILE`). It accepts only `'`, `E'` or `U&'`
  after TO/FROM, and its query branch `\([^;]*?\)` stops at any `;`. The claim is in the comment at
  `:453-462`, `open_blockers[185]`'s second append, README `:733`, and the handoff's
  `compatibility_impact` ("a migration may no longer carry COPY to or from a server file").
- **Defect:** PostgreSQL accepts a dollar-quoted string as COPY's file name, and a query may contain a
  `;` inside a literal. D-copydollar appended `copy (select 'c0 dollar') to $p$<path>$p$;` and
  `copy (select ';c0 semi') to '<path>';` to 140. Migrate-clean was 0, rls-smoke 0 and the static suite
  684/684, and both files were written on the host by the server. `[185]`'s stated limit names only
  "words or names computed at run time". Both spellings are static, so they are neither closed nor
  stated.
- **Why LOW:** like C0-OT-2, which this narrows. It needs a hostile or careless later migration that a
  reader would see, and it writes as the server's OS user on a developer's throwaway cluster.
- **Remedy:** admit `\$[A-Za-z_]*\$` after TO/FROM in the file-name alternation. For the query, either
  read the parenthesised query on the already-blanked text, or refuse COPY followed by `(` and then TO or
  FROM with anything but STDIN or STDOUT anywhere before the statement's end. Add both spellings to the
  lexer shapes. Or state both on `[185]` as limits.

### C0-OTR-3 — INFO — the `in-minimum-domain-projection-undecided` bucket admits any minimum-domain table, and its membership is pinned by nothing

- **Where:** `test-kits/db/foundation-contract.test.mjs:4868`; `open_blockers[192]`'s second append.
- **Measured (M-E2):** `app.content_items`, whose projection is decided (it is exported today), moved
  into that bucket. The static suite stayed at 684/684. This is the rule as declared, so the record is
  true. It is the one omission route C0-OT-3's remedy left open. My remedy offered two options and A0
  took the first one, which was mine to word.
- **Remedy (optional):** pin the bucket's four tables by name, or require each of its tables to be named
  on a blocker as undecided.

## §6 Stop-the-line

**None.** No migration, grant, policy, role, CI file or contract changed. The live layers are green at
`a722c1c` (R4), and CI is green (R6). The new rules refuse their drifts and my earlier ones. No secret,
credential, real identity or private URL is in the diff; the redaction cases use synthetic `.invalid`
hosts and loopback addresses only.

C0-OTR-1 and C0-OTR-2 are the reach of text tripwires against a later migration that a reader would see.
Neither is a tenant leak, a secret exposure, a lost job, a migration divergence, an irreversible
deletion or a contract mismatch.

**Does anything block the merge?** Not in my reading. The round only adds readings, and every claim
I re-measured holds, except the two closure sentences that C0-OTR-1 and C0-OTR-2 narrow. I recommend
fixing both or narrowing their sentences (`[185]`, `[195]`, the `:3458` comment, README `:733` and
the handoff's compatibility line) in the same round. Each is a few lines of code or one stated limit.
Whether the bar of 127 §6 is met is for A0 to read and the Owner to decide.

## §7 Limits

- I am the same vendor and model family as the Author, and I was spawned by the Author's workflow (§0).
- This re-check was narrow. I re-ran my own drifts, A1's hidden-trigger drift and three new probes of
  the new rules. I did not re-run A0's eighteen static mutations (Q0's role) or A1's redaction cases.
- I ran the branch-name guards in a private clone with a hand-set `origin/HEAD` (`5558b26`), not in
  A0's worktree. The clone holds the same objects and the same SHA.
- The subject branch is checked out in two of A0's worktrees (`-1` and `-5`, the second through
  `--ignore-other-worktrees`). I did not inspect either one. A0's plan records its own check of `-1`.
- Every DB run was on PostgreSQL 17.11 on this host. I did not touch any provisioned instance.
- D-copydollar and Q1 wrote files and ran `set_config` on my throwaway cluster only. Their reach beyond
  the server's OS user is inferred, not measured.
