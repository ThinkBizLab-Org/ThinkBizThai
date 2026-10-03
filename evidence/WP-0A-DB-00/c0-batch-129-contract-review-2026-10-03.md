# C0 contract review: batch 129, what initdb made, read as initdb made it

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-129`, head `0f08d92a442ade84d7900ace2f31bcca7a6d0f57`
  over code `36796dd`, base `75c9274` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/168>.
- **Review branch:** `review/c0-batch-129`, checked out at the subject head `0f08d92`; this file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; `evidence/WP-0A-DB-00/a0-batch-129-plan-2026-10-03.md`;
  `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-129.md`; `git diff 75c9274..0f08d92`
  (11 files); blocker 186 (`open_blockers[185]` of `work-packages/WP-0A-DB-00.json`, from its
  `RE-CHECKED 2026-10-03 (C0 465e6af ...` sentence on); `handoffs/WP-0A-DB-00-author-handoff.json`.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. Acceptance of this file as the C0 role's signature is the Integration
Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** Nothing I measured is reachable on the clean set. The tree's own migrations change
  no initdb object (the fingerprint is the same before and after them), and no integrated file does what
  F1 or F2 does. Both findings need a later superuser migration written to do it. That is the same class
  as C0 G1 and Q0 F1 on 128's re-check, which were graded MEDIUM and not stop-the-line.
- **Blocks the merge: no, on my reading, but one claim must not land as written.** The batch adds
  refusals only. Items 1 to 5 close what 128's re-checks asked, for the drifts those re-checks wrote, and
  I re-measured items 1, 3, 4 and 5 myself. **F1** shows that the batch's central guarantee, "sealed so a
  migration cannot rewrite the reference", does not hold. A migration that swaps the reference table for a
  view passes the seal and blinds the probe, and through Q-IPF a session with no claims then reads both
  workspaces' ideas with every layer green. Under the Owner's words of 2026-10-03 this goes to blocker 186
  **as owed**. But the sentences in `run.mjs`, the README, plan §7.6, the handoff and blocker 186 (i) that
  say the reference cannot be rewritten are false, and they should be corrected in the same merge, or
  blocker 186 should say so explicitly. Whether to do that before merging or to carry it is the Owner's
  or A0's call under the standing delegation, not mine.

## 2. Measured vs read

### Measured (by me, on this head)

Node `v24.20.0` (`node -v` checked before every run; `/Users/bank/.local/node-v24.20.0/bin` first on
PATH, and every round script refuses any other version). PostgreSQL **17.11** at `/opt/homebrew/bin`;
`initdb --locale=C -A trust -U postgres`; 127.0.0.1:**5505** only, `-c unix_socket_directories=''`;
`LC_ALL=C`; the shim `db/foundation/ci/supabase-shim.sql` first, then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres make db-migrate-clean` and `make db-rls-smoke`.
**Every round used a fresh initdb.** Each drift was **appended** to
`db/foundation/migrations/140_audit.sql` in this worktree and restored byte for byte from a copy saved
first (sha1 `2ac2fc2c592be3b5fa7844ce12793093b782a502`). `cmp` passed after every round and again at the
end. Static = `node --test test-kits/db/foundation-contract.test.mjs tests/db/identity/identity-isolation.test.mjs`;
sl = `make db-schema-lint`. The private directory is `.../scratchpad/c0-129/`.

**Repository commands, on the branch name.** These ran in a local clone in the private directory with
`agent/claude/WP-0A-DB-00-batch-129` checked out at `0f08d92` (never detached) and `origin/main` =
`75c9274`:

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 75c9274 WP-0A-DB-00` | **0** | "all 11 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | **0** | "clean: exit 0 — tests 677, pass 677, fail 0" |

Two first attempts in the clone are recorded but do not count. `check:handoff` exited 91 while the
clone's `origin/HEAD` pointed at the clone source's HEAD, and 93 with no `origin/main`. Both are
artefacts of cloning. Once `origin/main` was set to `75c9274` it exited 0. On `review/c0-batch-129` the
guard refuses as designed ("no work package declares ownership.branch").

PR #168: open, Draft, head `0f08d92`, check `bootstrap` SUCCESS. PR #167: merged 2026-10-03T14:17:50Z,
merge commit `75c9274`, head `1e85499`. Run 37127744567: "Bootstrap validation", success, head `1e85499`.
All three are as the disposition §3 states (read with `gh`).

**Live rounds** (`all.log`, `logs/`):

| Id | Drift | static | sl | mc | rs | What was named |
|---|---|---|---|---|---|---|
| clean | none | (verify 0) | (n/a) | **0** | **0** | "system object fingerprint: 3753 objects initdb made, taken before the migrations and sealed"; 24 probes, each refusing its drifts; post-migrate 49 blocks (37/12); rls-smoke 1079 passed, authz proofs 6/6 |
| X7 (C0 G1) | A0's `x7.sql` | | | **2** | 0 | "relation information_schema.information_schema_catalog_name [changed]" |
| SEAL | A0's `seal.sql` | | | **2** | 0 | "its seal moved while the migrations ran (the table was rewritten)" |
| Q-T1 (Q0 F3) | `grant create on database template1 to authenticated` | | | **2** | 0 | "unlisted: authenticated CREATE on database template1" |
| X6 (A1 R2, C0 F3) | `alter role authenticated bypassrls` | | | **2** | **2** (347 of 1079) | "authenticated rolbypassrls = true" |
| DACLg (A1 R1) | A0's `daclg.sql` | | | **2** | 0 | "anon EXECUTE on functions in every schema (default for app_worker), public EXECUTE ..." |
| FVc (control) | Q-IPF + Q-GS, no swap | | | **2** | 0 | "_pg_interval_type ... [changed], relation pg_catalog.pg_statistic [changed]" |
| **FV3** (F1) | Q-IPF + Q-GS, then the reference table renamed and replaced by a view (below) | **0** | **0** | **0** | **0** | nothing; 24 probes "refused each of its drifts"; post-migrate 50 blocks |
| FV, FV2 | FV3's earlier spellings | 1, 1 | 0, 0 | 0, 2 | 0, 0 | refused only incidentally: the static "no migration creates a view" text rule (FV), and the post-migrate block shape (FV2). Neither reads the fingerprint. |
| **RN3** (F2) | two leaf initdb objects renamed | **0** | **0** | **0** | **0** | nothing |
| RN2 | RN3 + `information_schema._pg_numeric_scale` renamed | | | **2** | 0 | only through three dependent views' deparse ("information_schema.attributes/columns/domains [changed]"), not the renamed function |
| RN | `pg_ls_dir(text)` and `information_schema_catalog_name` renamed | | | **2** | 0 | only incidentally: the fingerprint self-test's own drift calls `pg_ls_dir(text)` by name (42883). The as-built probe passed. |

**FV3's leak, measured.** On the FV3 cluster (and earlier on FV's, where mc was also 0), in one
transaction that was rolled back, I inserted two `app.content_ideas` rows under two workspace ids. Then
`set local role authenticated` with **no** `request.jwt.claims`: `select count(*) from app.content_ideas`
returned **0**, and `select information_schema._pg_interval_type(0, 0)` returned **every** row of both
workspaces, the rls-smoke fixtures' two included (`logs/fv3.leak.log`).

### Read, not measured

- Q0 F2's U1/U2, and the mutations MFP, MFV, MATT, MDACL and MDB (plan §4). I read the pg_toast drifts in
  the diff and did not run the mutations.
- X8, X9, X10, Q-IPF alone, Q-IPVx, Q-GS alone, FGRANT, ATTR, DACL, Q-PTn, R0, LU1 and ctl (plan §3). FVc
  covers Q-IPF and Q-GS together.
- That the fingerprint equals `template1`'s, and cross-minor-version behaviour (plan §5).
- The Owner's words. I cannot see the Owner's messages. I checked only that the two quotations are
  identical, byte for byte, in the disposition, the plan, the manifest rationale and blocker 186.
- The Author's not-done item: that `36796dd` and `27e8817` were red only on the handoff guard under
  `commit-when-clean`. On the head, `npm run verify` is 677/677.

## 3. The questions

**Does each closed item do what 128's re-checks asked?** 128's re-check remedy for C0 G1 and Q0 F1 was
"compare system objects against a pristine post-initdb+shim fingerprint (definitions, ACLs, prosecdef),
not by OID". The batch does this for every function, relation, schema and language below 16384 (X7, FVc
measured). Q0 F2 (pg_toast drifts) is read only. A1 R2/C0 F3 (X6), A1 R1 (DACLg) and Q0 F3 (Q-T1) were
measured, each named. **Yes, subject to F1 and F2.**

**Is the fingerprint taken at the right moment?** Yes. `run.mjs:2963-2975`: the meta-command scan
includes the snapshot SQL, then the snapshot, then the seal, all before `for (const { name, sql } of
steps)`, the prerequisite included. The snapshot runs on the database as initdb and the shim left it. A
database with `app` and no fingerprint is refused. Every probe job and the post-migrate pass run after
the reseal (`run.mjs:2981`), and each is rolled back.

**Is it sealed so that a migration cannot rewrite the baseline?** **No (F1).** The seal pins the
*answer to one query* (`SYSTEM_FINGERPRINT_SEAL_SQL`, `run.mjs:737`). It does not pin the *relation* that
the query and the probe both read by name (`run.mjs:748`). A migration can replace that relation with a
view that answers the seal query with the old rows and the probe with rows taken after the change.

**Is what it covers and does not cover honestly stated?** Mostly. §5's "does not cover" list is long
and accurate as far as it goes. It is missing two things: the baseline relation's own identity (F1), and
object names and namespaces, which the comparison does not read (F2). The second contradicts "filtered
by no name" as a reader would take it.

**Ownership amendments.** Three paths are outside writable_paths and declared with reasons:
`scripts/test-suite-contract.mjs` (floor 500 → 525, a single line), `test-kits/branch-identity.test.mjs`
(the slot moved from batch-128 to batch-129, in two places) and `test-kits/integrity-manifest.json` (the
three digests that follow from those edits). Each is changed and explained, scope is 0, and
`evidence/VERIFICATION.md` is rightly not declared, since the test count is unchanged. **Sound.**

**Plan, disposition, blocker and handoff claims.** The PR, merge and CI identifiers are true. The
counts I measured are true: 3753, 24 probes, 49 blocks (37/12), 1079 cases, X6's 347. Blocker 186's
closure records items (i) to (v) and the owed list as the plan states them. These claims are false or
overstated: the "cannot rewrite" sentences (F1), and the handoff's `security_privacy_cost_impact`,
"A later file that redefines, re-grants or re-owns any function, relation, schema or language initdb
made ... now fails migrate-clean by name" (F1, F3). The disposition labels A0's reading of the Owner's
words as A0's. It keeps stop-the-line outside the delegation and records the RFC-2026-025 §5 gap.
**Sound.**

## 4. Findings

### F1 — MEDIUM — the seal pins one query's answer, not the reference relation; a view swap blinds the fingerprint and Q-IPF crosses tenants with every layer green

- **Where:** `scripts/db/run.mjs:681-683` ("so a migration cannot rewrite the reference it is compared
  with"), `:737` (the seal reads `catalog_baseline.system_fingerprint` by name), `:748` (the probe reads
  it by name), `:2966-2968`; `db/foundation/README.md:533-534`; plan `:251` (§7.6, "a migration cannot
  reach it"); handoff `security_privacy_cost_impact` (`handoffs/WP-0A-DB-00-author-handoff.json:118`);
  blocker 186 (i), `work-packages/WP-0A-DB-00.json` `open_blockers[185]`.
- **Exploit (FV3, `d/fv3.sql`), appended to 140:** Q-IPF (`_pg_interval_type` replaced, SECURITY
  DEFINER over `app.content_ideas`) and Q-GS. Then
  `alter table catalog_baseline.system_fingerprint rename to c0_sf_orig`, then
  `create table catalog_baseline.c0_sf_now as <SYSTEM_FINGERPRINT_ROWS>` (taken after the change). Then,
  in a `do $$` block in the extractable shape that is idempotent on re-run, an EXECUTEd
  `create view catalog_baseline.system_fingerprint` that returns `c0_sf_orig`'s rows when
  `current_query()` contains `as seal`, and `c0_sf_now`'s otherwise.
- **Result:** static 0, schema-lint 0, migrate-clean **0**, rls-smoke **0**. The seal matches, because
  the seal query sees the old rows. The probe compares against the new rows and finds nothing, both as
  built and after every drift. The fingerprint's self-test still passes, because its drift's three
  objects are not the ones the view hides. Then a session with no claims reads both workspaces' ideas
  (§2). Without the swap (FVc) the same two changes fail migrate-clean by name, so the swap alone is
  what blinds it.
- **Why MEDIUM, not stop-the-line:** it needs a superuser migration that names the probe's own schema,
  which a reviewer reading the file would see, and nothing in the tree does it. It is G1's own exploit
  class, which this batch was written to close, and the batch's claim that it is closed is what fails.
- **Remedy (any one; the first is the strongest):** (a) keep the reference out of the database's
  reach. The executor reads the snapshot rows into memory before the first migration. After the last
  migration it feeds the probe the rows as a literal, or reads `SYSTEM_FINGERPRINT_ROWS` again and
  diffs in a pure, exported, synthetically tested function. (b) At the least, seal the relation's
  identity with its content: its `pg_class` OID, `relkind = 'r'`, `relhasrules` false, no policy, its
  owner and its four column types. Re-read them in the reseal and **inside the probe job**, with the OID
  interpolated by the executor. (c) Whatever the code does, correct the five "cannot rewrite" sentences
  and add the baseline relation's identity to §5's "does not cover" list and to blocker 186's owed list
  until (a) or (b) lands.

### F2 — LOW — names and namespaces are not compared, so an initdb object renamed in place passes every layer

- **Where:** `scripts/db/run.mjs:749` (`where n.fp is distinct from b.fp`, joined on `(kind, objoid)`).
  `ident` is stored and printed but never compared, and `fp` holds no `proname`, `pronamespace`,
  `relname`, `relnamespace`, `nspname` or `lanname`. Plan `:183`, "every object ... filtered by no name",
  with no rename in §5's "does not cover" list.
- **Measured:** RN3 (`alter function pg_catalog.pg_read_file(text) rename to c0_renamed_read_file; alter
  table information_schema.sql_features rename to c0_renamed_sql_features;`): static 0, sl 0, mc **0**,
  rs 0. A rename is named only when a view's deparse quotes the old name (RN2), or by accident (RN).
- **Impact:** I did not find a tenant-crossing rename. A name swap between two same-signature initdb
  functions changes what a SQL- or plpgsql-language body, resolved at call time, calls. For example,
  `app.current_subject()` calls `current_setting` by name. rls-smoke would see a swap that breaks
  isolation. A swap aimed at a probe's own call is held by that probe's self-test, as X10 is. So this is
  a coverage and honesty gap, not a measured leak.
- **Remedy:** compare `ident` too (`where (n.fp, n.ident) is distinct from (b.fp, b.ident)`; `ident`
  carries the schema and the name), with a rename in the fingerprint probe's drift. Or list renames and
  SET SCHEMA in §5 and blocker 186 as owed.

### F3 — INFO — the handoff's security sentence claims more than the batch reads

- **Where:** `handoffs/WP-0A-DB-00-author-handoff.json:118`, "redefines, re-grants or re-owns any
  function, relation, schema or language initdb made ... now fails migrate-clean by name".
- **Why:** F1 shows a redefinition that does not fail, and F2 shows a rename that does not. §5's own
  exclusions (types, operators and the rest) are correctly left out of this sentence, but the sentence
  carries no "subject to plan §5" qualifier.
- **Remedy:** add "as plan §5 states, and subject to C0 F1/F2 on 129" at the next handoff refresh.

### Checked and found sound (no finding)

The snapshot's position, and the refusal of a database with `app` and no fingerprint. The executor
refuses an unsealed or malformed seal (`run.mjs:2974`). Both directions are compared (`[gone]`,
`[not in the fingerprint]`). Rule 4 names a global functions entry together with PUBLIC's implied
EXECUTE, as its comment says. The other-database arm leaves TEMPORARY unread, stated with its reason.
The attribute rule names a missing role. The branch slot moved in both places, and the 129 rationale
replaces 128's. The disposition does not claim RFC-2026-002 is met when A0 presses the merge.

## 5. Limits

- One minor version (17.11), one machine, no platform (Supabase) run.
- I ran no mutation of `run.mjs`. Q0 F2's closure and the five self-test mutations are the Author's
  measurement, read here.
- F1's exploit discriminates on `current_query()`. A remedy that only changes the seal query's text would
  be defeated by another discriminator: `search_path` (the probe job sets `pg_catalog`), the transaction
  state, or a DO block versus a plain select. That is why remedy (a) or (b), and not a cosmetic change, is
  what closes it.
- I have the Author's training and blind spots (§0).
- Cleanup: the cluster on 5505 was stopped and its data directory removed; port 5505 is free (`lsof`
  exit 1). `140_audit.sql` is `cmp`-identical to the copy saved first. The clone and logs stay in the
  private directory. Nothing was pushed.
