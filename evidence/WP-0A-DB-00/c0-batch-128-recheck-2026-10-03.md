# C0 contract review re-check: batch 128's review round

- **Package:** `WP-0A-DB-00`. **Role:** independent Reviewer, run `/claude/c0_contract_reviewer`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-128`, head `0646f326e21b4e02bd02f8e1aa0876eb11a214f5`
  over code `b594b46`, base `18f1469` (main). Author `/claude/a0_atlas`. Draft PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/167> (read with `gh`: Draft, open, head `0646f32`).
  Previous reviewed head `b8435faf7f0d339ce101ceefccb49b3770679c8a`, my review
  `c0-batch-128-contract-review-2026-10-03.md` (cherry-picked as `dcb6fdc`).
- **Scope:** a narrow re-check of the review-round corrections (`b8435fa..0646f32`: `b594b46` code,
  `e863fab` record, `0646f32` handoff).
- **Review branch:** `recheck/c0-batch-128`, checked out at the subject head `0646f32`. This file is its only
  commit.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.
- **Inputs read:** `CONTRIBUTING_AGENTS.md`; `evidence/WP-0A-DB-00/a0-batch-128-plan-2026-10-03.md` (§1, §2
  and the new §7); `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-03-batch-128.md`;
  `git diff 18f1469..0646f32` (15 files) and `git diff b8435fa..0646f32` (12 files); blocker 186
  (`open_blockers[185]` of `work-packages/WP-0A-DB-00.json`), including its "REVIEW ROUND OF BATCH 128"
  paragraph; `handoffs/WP-0A-DB-00-author-handoff.json` (`tests`, `known_limitations`); README rules 9-13;
  the PR body.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's run, of the same vendor and model family. Under
RFC-2026-024 that makes this an independent-role run by configuration, not by provenance: I share the
Author's training and blind spots. This matters here in particular, because the review round implemented
the remedy I wrote for F1, and G1 below is a hole in that remedy. Acceptance of this file as the C0 role's
signature is the Integration Owner's and the Product Owner's act, not mine.

## 1. Verdict

- **Stop-the-line: no.** Nothing I measured is reachable on the clean set. The new hole (G1) is a later
  migration that could weaken a guarantee without any layer noticing. That is the same latent class as
  F1, and it already existed on `main`. There is no tenant leak, secret, migration divergence or contract
  mismatch on the branch as built, and no migration changed.
- **Blocks the merge: no, on my reading.** The round strictly adds refusals. Every exploit of mine that
  passed every layer at `b8435fa` (X1b, X2, X2b, X5, X4) now fails migrate-clean by name. I re-measured
  that myself, along with A0's computed-name variants X2c and X2bc. But my F1 remedy, "read by object
  OID", reaches only objects **made** after initdb. An object initdb made and a migration **redefines in
  place** keeps its OID below 16384, and it still passes every layer and crosses tenants (G1: X7, X8,
  X9). Blocker 186's "CLOSED: (a) OBJECTS IN information_schema, pg_catalog OR A pg_* SCHEMA" is
  therefore broader than what was closed. It should say "objects made after initdb in ..." and list the
  redefinition as owed. That is a record correction, not a code change. Whether to fix G1 before the
  merge or carry it is the Owner's or A0's call under the standing delegation, not mine.

## 2. Measured vs read

### Measured (by me, on this head)

- **Toolchain:** Node `v24.20.0`, checked with `node -v` before every run
  (`/Users/bank/.local/node-v24.20.0/bin` first on PATH). PostgreSQL 17.11 at `/opt/homebrew/bin`.
- **Cluster:** `initdb --locale=C -A trust -U postgres`, 127.0.0.1:**5505** only,
  `-c unix_socket_directories=''`, `LC_ALL=C`. A fresh initdb for every round.
- **Order:** the shim `db/foundation/ci/supabase-shim.sql` first, then
  `DB_TEST_URL=postgresql://postgres@127.0.0.1:5505/postgres` for `make db-migrate-clean` and
  `make db-rls-smoke`.
- **Where the database layers ran:** on a `git archive` export of `0646f32` in my private directory
  (`.../scratchpad/c0-128r2/wt`).
- **Drift handling:** each drift was appended to the export's `db/foundation/migrations/140_audit.sql`
  from a saved pristine copy (sha1 `2ac2fc2c592be3b5…`, identical to `b8435fa`'s) and restored after
  every round. At the end, `cmp` against the pristine copy passed for both the export and this worktree.
  No drift touched this worktree.
- **Where the static, `verify` and handoff commands ran:** in a private clone with the branch checked
  out under its own name, `agent/claude/WP-0A-DB-00-batch-128`, at `0646f32`. The clone's `origin/HEAD`
  was set to `main` (`18f1469`).

| Command | Exit | Output |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 18f1469 WP-0A-DB-00` (branch name) | **0** | "all 15 changed path(s) are declared, and every amendment explains one" |
| `npm run check:handoff` (branch name, `origin/HEAD` = main) | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` (branch name) | **0** | "clean: exit 0 — tests 677, pass 677, fail 0" |
| `npm run check` (branch name) | **0** | tests 677, pass 677 |
| static: `node --test test-kits/db/foundation-contract.test.mjs tests/db/identity/identity-isolation.test.mjs` (clean) | **0** | 378 of 378 |
| `make db-schema-lint`, `make db-migrate-clean` (clean round, and a second clean round) | **0**, **0** | 23 catalog probes, each refusing every drift and clean again. The client schema probe pins **13** rows (4 + 6 system-schema USAGE + 3 database TEMPORARY), the client membership probe 0 roles, the security definer probe 5 plus 0 extension members, and the pg_catalog guard now names `information_schema` and `pg_toast`. |
| `make db-rls-smoke`, twice on the same database | **0**, **0** | "1079 isolation case(s) passed", both times |

**My own exploits from `b8435fa`, re-run** (layers: static / schema-lint / migrate-clean / rls-smoke):

| Id | Drift | static | sl | mc | rs | Refusal (mc), or effect |
|---|---|---|---|---|---|---|
| X1 | a view in `information_schema` on content_ideas, select and insert to authenticated | 1 | 0 | **2** | 0 | guard: "relation information_schema.c0_ideas" |
| X1b | the same, built by a function's EXECUTE and the function dropped | 0 | 0 | **2** | 0 | guard: "relation information_schema.c0_ideas". **Was green on every layer; now closed.** |
| X2 | `set allow_system_table_mods = on`; schema `pg_c0api` with client USAGE; a definer-rights view | **1** | 0 | **2** | 2 (nothing applied) | lexer: "140_audit.sql line 1019 … allow_system_table_mods" (and line 1021). **Closed.** |
| X2b | the switch, then a definer-rights view in `pg_catalog` | **1** | 0 | **2** | 2 (nothing applied) | lexer, lines 1019 and 1023. **Closed.** |
| X2c | X2 with the switch set by a **computed** name (`set_config('allow_system' \|\| '_table_mods', …)`) | 0 | 0 | **2** | 0 | client privilege probe (by OID) "pg_c0api.ideas"; client schema probe "unlisted: authenticated USAGE on schema pg_c0api". **Closed.** |
| X2bc | X2b with the computed name | 0 | 0 | **2** | 0 | guard: "relation pg_catalog.c0_ideas". **Closed.** |
| X3 | SECURITY DEFINER `pg_catalog.c0_all_ideas()` to authenticated | 0 | 0 | **2** | 0 | guard: "function c0_all_ideas()" (as before) |
| X4 | `grant create on database postgres to authenticated` | 0 | 0 | **2** | 0 | "unlisted: authenticated CREATE on database". **Was green; now closed (F2).** |
| X5 | SECURITY DEFINER `information_schema.c0_all_ideas()`, EXECUTE to authenticated only | 0 | 0 | **2** | 0 | guard: "function c0_all_ideas()". **Was green; now closed.** |
| X6 | `alter role authenticated bypassrls` | 0 | 0 | 0 | **2** | "FAILED — 347 of 1079 case(s)". Held by rls-smoke alone, as stated (F3, owed). |

**The Author's 128 drifts, as a regression check:** R0, V16 and V06b each give 0 / 0 / **2** / 0, and LU1
gives **1** / 0 / **2** / 2. The names are the same as in plan §3 ("authenticated -> app_authz, …",
"unlisted: authenticated CREATE on schema app", "app.a1_all_ideas() (extension pgcrypto)", "line 1019: a
U& escape spelling").

**New drifts of this re-check** (G1 below). In each, a claimless `authenticated` session reads 0 of 2 rows
from `app.content_ideas` itself.

| Id | Drift | static | sl | mc | rs | Live effect, as `authenticated` with no JWT claims |
|---|---|---|---|---|---|---|
| X7 | `create or replace view information_schema.information_schema_catalog_name` (OID 13709, kept) with `content_ideas`' id and workspace_id appended as columns; built by a function's EXECUTE, then the function dropped | 0 | 0 | **0** | **0** | reads **2 of 2** ideas, across **2** workspaces. **Every layer green.** |
| X8 | `create or replace function information_schema._pg_char_max_length(oid, integer)` (OID 13694, kept), made SECURITY DEFINER with `search_path = ''` and the body `select count(*)::integer from app.content_ideas`; same EXECUTE shape. PUBLIC's EXECUTE is initdb's. | 0 | 0 | **0** | **0** | returns **2**. `prosecdef` is now true on an initdb function. **Every layer green.** |
| X9 | `set_config('allow_system' \|\| '_table_mods', 'on', false)`, then `create or replace view pg_catalog.pg_timezone_abbrevs` (OID 12122, kept) with `content_ideas`' columns appended | 0 | 0 | **0** | **0** | reads **2 of 2** ideas, across **2** workspaces. **Every layer green.** |
| X10 | X4 plus `create or replace function pg_catalog.has_database_privilege(name, text, text)` (OID 2250, kept; `internal` → `sql`) returning `$3 = 'TEMPORARY'` | 0 | 0 | **2** | 0 | Held, but only by the self-test. The client schema probe's **as-built** reading was blinded: it raised nothing on X4's real grant. Its self-test then failed: "refused without naming unlisted: authenticated CREATE on database … declares 1 drift(s) and 0 were refused". A claimless `authenticated` session still created a schema (rolled back). |

**Built-set measurements on a clean round, for G1's remedy:**

| What | Count |
|---|---|
| Functions with OID below 16384 that are `prosecdef` | **0** of 3330 |
| Functions with OID below 16384 that have a `proconfig` | **0** of 3330 |
| `pg_rewrite` rules with `objid` below 16384 that depend (`pg_depend`) on a `refobjid` at or above 16384 | **0** |
| initdb views `authenticated` may SELECT | 129 |
| initdb functions it may EXECUTE | 3268 |

### Read, not measured

- **A0's runs I did not re-run:** A0's X2s, the control `ctl`, Q0's ISV, IST and ISF, and the
  mutation MG (the guard's new arms reverted, with X5, ISV and IST). I read the arms they rely on in
  `run.mjs`, and those arms agree with plan §7.3's verdicts. X1b, X2c and X5 are the same shapes as ISV,
  X2s and ISF.
- **The new self-test drifts:** the temporary objects in the client privilege drifts, CREATE on
  `information_schema` and on the database in the client schema drift, and the `information_schema`
  view and function in the guard's drift. The clean round shows each probe refusing every drift by name,
  so each self-test was measured to refuse. I did not measure each new name separately.
- **The digests and the floor:** the five new probe digests and the 494 → 500 assertion floor are read,
  and they pass `verify`.

## 3. Item by item: does each closed item do what was asked?

The table covers my b8435fa findings, Q0-128-F1/F2 and A1 N2, read against blocker 186 and the 127
re-checks.

| Item | Asked | Verdict |
|---|---|---|
| C0 F1 / Q0-128-F1 (MEDIUM): `information_schema`, `pg_catalog`, `pg_*` left out by name | Read by object, not by schema name. Refuse objects made in initdb schemas. Refuse `allow_system_table_mods`. Add the exploits as drifts. | **Closed for objects made after initdb (measured: X1b, X2, X2b, X2c, X2bc, X5). Not closed for an initdb object redefined in place (G1: X7, X8, X9).** The pg_catalog guard, `userObject` and the definer and helper OID arms are what I asked for and work as stated. The lexer refusal holds for the literal name. The computed name is stated, and its consequences are read by OID only for new objects. |
| C0 F2 (LOW): CREATE on the database | Pin CREATE (none) and TEMPORARY (PUBLIC's default) on the database | **Closed.** X4 is refused by name (measured). The pinned set is correct for the shim plus every migration: TEMPORARY for anon, authenticated and PUBLIC through PUBLIC's default, and CREATE for none. I measured `datacl` on X10's round: PUBLIC holds `TEMPORARY` and `CONNECT`, and nothing else is granted to a client but the drift's. |
| Client schema probe reads every schema | Read every schema, and pin initdb's USAGE | **Closed.** The six system-schema rows (anon, authenticated and PUBLIC USAGE on `pg_catalog` and `information_schema`) are initdb's PUBLIC grant, read through `has_schema_privilege`. Correct, and justified. 13 rows, clean (measured). |
| C0 F3 (INFO), A1 N1 (INFO) | Optional | **Not taken; recorded as owed** in blocker 186 and plan §7.4. X6 is still held by rls-smoke alone (measured, 347 of 1079). Accurate. |
| C0 F4 (LOW): the handoff's `tests` | Record `check:handoff` and `verify`, or correct the plan | **Corrected in substance**: the PR body records both at 0 after the handoff commit, and I measured both at 0. The record is circular (G2, INFO). |
| Q0-128-F2 (LOW), A1 N2 (INFO) | State them | **Closed.** `scripts/db/psql-driver.mjs:355-359` and the README state them. Temporary objects are read by OID, and the self-test drifts carry them (read; the clean round refuses each drift). |
| Plan §1 item (2) wording, and blocker 186 item (2) | Say "new user schemas" at `b8435fa` | **Closed.** Plan line 31 and blocker 186 say so. The review round's own paragraph in blocker 186 now over-claims in the same way, one level down (G1). |

**Pinned sets re-checked against the shim plus the migrations (measured):**

- **Client memberships:** 0 on the clean set. R0 is refused by name.
- **Client schema and database privileges:** exactly the 13 rows, both ways, clean.
- **Extension SECURITY DEFINER members:** 0 (pgcrypto in `extensions`, plpgsql). V06b is refused by
  name.

All three sets are justified by what the shim and the migrations grant. None needs widening.

## 4. Findings

### G1 — MEDIUM — An object initdb made, redefined in place, keeps its OID below 16384; no layer reads it, and it crosses tenants

- **Where:**
  - `scripts/db/run.mjs:452-456`: the comment "everything initdb made is below it, everything a
    migration or a drift makes is at or above it". That is true of **making** an object and false of
    **redefining** one.
  - `scripts/db/run.mjs:467`: `userObject`, used at `:475`, `:489` and `:500`.
  - `scripts/db/run.mjs:754` and `:773`: security definer rules 1 and 3. `prosecdef` on an initdb
    function is not read.
  - `scripts/db/run.mjs:1139-1146`: the pg_catalog guard, which reads `oid >= 16384` only.
  - `scripts/db/psql-driver.mjs:437-446`: the stated reason the computed name is left to "those two",
    meaning the OID readings.
  - Blocker 186: "REVIEW ROUND OF BATCH 128 … CLOSED: (a) OBJECTS IN information_schema, pg_catalog OR
    A pg_* SCHEMA".
  - Plan `a0-batch-128-plan-2026-10-03.md:175` (the 7.1 row) and §7.4 item 3. Item 3 names other object
    kinds but not redefinition.
  - README rules 10 and 11 (`db/foundation/README.md:452-478`).
- **What:** `CREATE OR REPLACE VIEW` and `CREATE OR REPLACE FUNCTION` keep the object's OID. The
  migration owner is a superuser and owns `information_schema`. It can therefore redefine any of the 129
  initdb views a client may SELECT, or any of the 3268 initdb functions a client may EXECUTE. It needs
  nothing more for `information_schema`. For `pg_catalog` views it needs `allow_system_table_mods`, set
  by a computed name past the lexer. A view runs with its owner's rights, and the owner is a superuser,
  so RLS does not apply. A function can be made SECURITY DEFINER in the same statement.
- **Measured:**
  - **X7** (an `information_schema` view), **X8** (an `information_schema` function made SECURITY
    DEFINER) and **X9** (a `pg_catalog` view, with the switch computed) each passed static, schema-lint,
    migrate-clean and rls-smoke.
  - In each, a claimless `authenticated` session read both workspaces' ideas (2 of 2, or a count of 2),
    where the table returned 0.
  - X7 and X8 also existed on `main`. The class predates 128, and this round's claim is what makes it a
    finding now.
  - **X10** shows the same mechanism aimed at a probe: redefining `pg_catalog.has_database_privilege`
    blinded the client schema probe's reading of a real CREATE grant. Only the probe's self-test held it.
    Blocker 186 already says that "a hostile superuser drift can still forge in ways no verdict sees",
    and X10 is held, so it is evidence for the remedy's shape, not a separate finding.
- **Grade:** MEDIUM, the grade of F1, whose remainder this is. It is not stop-the-line. Nothing is
  reachable on the clean set: 0 initdb functions are `prosecdef` or carry a `proconfig`, and 0 initdb
  rewrite rules depend on an object made after initdb (measured).
- **Remedy** (for a later batch, or before merge if A0 prefers). Read what initdb made by its
  **definition**, not only by its OID.
  - **(a)** In the pg_catalog guard, refuse any function with OID below 16384 that is `prosecdef` or has
    a `proconfig`. Also refuse any `pg_rewrite` rule with `objid` below 16384 that has a `pg_depend` row
    on a `refobjid` at or above 16384. Both are measured 0 on the built set. Together they catch X7, X8
    and X9.
  - **(b)** To also catch X10's shape, which (a) does not catch, pin one digest of every initdb
    function's `(oid, prolang, prosrc, prosecdef, proconfig)` and every initdb view's `pg_get_viewdef`.
    Take it as measured on the shim's fresh cluster, since PostgreSQL's minor version fixes it, and
    restate it when the image moves.
  - Add X7, X8 and X9 as the guard's self-test drifts.
  - **In any case**, blocker 186's (a) and plan §7.1 should say "objects **made** after initdb in …".
    §7.4 should list the in-place redefinition of an initdb object as owed, and the comment at
    `run.mjs:452-456` should not say that a migration cannot reach below 16384.

### G2 — INFO — C0 F4's record is circular

- **Where:** `handoffs/WP-0A-DB-00-author-handoff.json`, `tests`, the last entry ("npm run check:handoff
  and npm run verify … exit_code 0, result: recorded in the PR body and plan §7.2 after this commit").
  Also `evidence/WP-0A-DB-00/a0-batch-128-plan-2026-10-03.md:210-211` ("… are in the handoff's `tests`
  (C0 F4)").
- **What:** The handoff's entry defers to plan §7.2, and §7.2 defers back to the handoff. The entry's
  `exit_code: 0` was written before the run it records, as its own text says. The measured result lives
  only in the PR body (lines 27-28 and 61, read), which is not a repository record.
- **Measured:** both commands exit 0 on the branch name at the head (§2), so the claim's substance holds.
- **Remedy:** at the next refresh, point the plan sentence at the PR body, or move the two results into
  the next record. Optional.

## 5. Other claims checked

- **Ownership amendments:** `amends_without_owning` is unchanged from `b8435fa`
  (`scripts/test-suite-contract.mjs`, `test-kits/branch-identity.test.mjs`,
  `test-kits/integrity-manifest.json`). The rationale gains an "ITS REVIEW ROUND" sentence explaining the
  494 → 500 floor and the regenerated manifest. Branch scope exits 0 with 15 paths (measured). No test was
  added and the count stays 677 (measured), so `evidence/VERIFICATION.md` is correctly not touched.
- **Cherry-pick map:** `dcb6fdc`, `a39fca6` and `ee42a3f` each sit between `b8435fa` and `b594b46` in
  `git log`. The map is read, not compared byte for byte with the originals.
- **The plan's §7.3 numbers** match mine where I re-ran the same drift: X1, X1b, X2, X2b, X2c, X2bc,
  X5, X4, R0, V16, V06b, LU1 and X6, the layers and the names alike.
- **Handoff:** `check:handoff` passes on the branch name. The handoff commit `0646f32` is last and alone
  (`git log`: it touches only the handoff). The `npm run check` entry honestly records exit 1 at
  `e863fab`, before the refresh.
- **Disposition:** unchanged by the round. I found nothing in it that overstates.
- **No migration:** confirmed. No file under `db/foundation/migrations/` changed in `18f1469..0646f32`.
- **PR:** Draft, open, head `0646f32` (read with `gh`). Not merged.

## 6. Limits of this review

- **Shared model family (§0).** I wrote the F1 remedy that the round implemented, and G1 is a hole in
  my own remedy. A reviewer of another family might find more in the same place.
- **What I re-ran:** my 10 exploits from `b8435fa` and 4 of the Author's drifts, plus 5 new drifts (X2c
  and X2bc as independent re-runs of A0's, then X7-X10). I did not re-run Q0's ISV, IST and ISF, A0's
  X2s and control, or the mutation MG.
- **Where the database measurements ran:** on the CI shim on PostgreSQL 17.11 locally. Nothing ran on
  the platform, where managed schemas and `authenticator` differ, as the plan states.
- **What I did not survey:** which of the 129 client-readable initdb views or 3268 executable initdb
  functions a probe or rls-smoke itself calls. X10 shows that one can be blinded.
- **Private artefacts** (not in the repository) are under
  `/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/c0-128r2/`:
  - scripts: `round.sh`, `batch.sh`, `inspect.sql`, `inspect2.sql`;
  - drifts and post-queries: `d/*.sql`;
  - logs: `logs/`, `batch1.log`, `batch2.log`, `scope.log`, `handoff.log`, `verify.log`, `check.log`;
  - copies: `140_audit.sql.pristine`, the export `wt/` and the clone `clone/`.
- **Cleanup:** the cluster on 5505 was stopped and its data directory removed. `140_audit.sql` is
  byte-identical to the pristine copy in the export and in this worktree (`cmp`).
