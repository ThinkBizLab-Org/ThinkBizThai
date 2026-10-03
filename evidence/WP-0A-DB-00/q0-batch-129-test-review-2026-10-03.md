# Q0 independent test: batch 129 (PR #168)

- **Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-129`
  (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/168>), head `0f08d92` (handoff alone) over code
  `36796dd`, plan and disposition `27e8817`, base `75c9274` (main, PR #167). Author `/claude/a0_atlas`.
- **Reviewed on:** my own branch `review/q0-batch-129`, checked out at `0f08d92` in this worktree. Every
  command that reads the branch name ran either on this branch name in the worktree, or in a private clone at
  `0f08d92` (`git archive`, byte-identical to the committed tree: `db/foundation/migrations/140_audit.sql`
  sha1 `2ac2fc2c592b…` matches the worktree's).
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own workflow, and the same vendor and model family as the
Author (RFC-2026-024). I am independent of the Author's run, but not of its vendor or its orchestration. So this
record is evidence for the Tester role, not that role's signature. Accepting it as the role's signature is the
act of the Integration Owner and the Product Owner.

## 1. Measured vs read

Setup, every measured DB round: PostgreSQL 17.11 at `/opt/homebrew/bin`; `initdb --locale=C -A trust -U
postgres`; 127.0.0.1:**5503** only, TCP only (`-c unix_socket_directories=''`); `LC_ALL=C`; the shim
`db/foundation/ci/supabase-shim.sql` first; `DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres`; Node
`v24.20.0`, checked before every run (a PATH Node 26 exists; it never ran a measured round). A fresh initdb per
round; each drift appended to `140_audit.sql` in the private clone and the file restored and `cmp`-compared
byte for byte after every round (sha1 `2ac2fc2c592b…`, `restored` every time). The cluster was stopped and its
data dir removed at the end; port 5503 is free.

**Measured (exit codes I observed myself):**

| Command | Exit | Output |
|---|---|---|
| `node scripts/run-test-suite.mjs` (worktree, branch name, `0f08d92`) | **0** | tests 677, pass 677, fail 0 |
| `node scripts/verify-branch-scope.mjs 75c9274 WP-0A-DB-00` (worktree) | **0** | "all 11 changed path(s) are declared, and every amendment explains one" (9 at code `36796dd`, as the plan says) |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-DB-00-batch-129` | **0** | `WP-0A-DB-00` |
| `node scripts/regenerate-integrity-manifest.mjs --check` | **0** | 88 digests, consistent |
| `node scripts/scan-repository-secrets.mjs` | **0** | clean |
| `make db-migrate-clean` (baseline, fresh) | **0** | "system object fingerprint: 3753 objects initdb made, taken before the migrations and sealed"; 24 catalog probes, each refusing its drift and clean again; post-migrate pass 49 blocks, 37 as written, 12 replaced |
| `make db-rls-smoke` (baseline, fresh) | **0** | 1079 isolation cases passed |
| CI negative-control step (56 `control` entries, copied from `ci.yml` at `0f08d92`), baseline | **0** | every table family detected on its own (RLS off ⇒ its own pattern fails) |

**Read, not measured:** CI of PR #168, the C0/A1 role runs, `gh` PR/CI state (no network here), cross-minor
fingerprint stability (only 17.11 was available — the plan states this limit, §5), and the merge. These are
outside the Author's scope and outside mine.

**On `commit-when-clean` exit 1 (the Author's "not done" item).** Confirmed consistent: at the intermediate
code commit `36796dd` the only red was the handoff guard (`the handoff for this branch describes this branch`
and the ratchet, which runs the same suite on a copy), because the handoff still described batch 128 until
refreshed last. At **HEAD `0f08d92`** — where the handoff was refreshed to describe batch 129 as its last,
lone commit — `run-test-suite.mjs` is **677/677, exit 0**: the guard is green. The handoff-reachability tests
fail only in a `.git`-less archive clone (they need revisions reachable from main), not in the worktree. The
sequencing is sound and self-disclosed.

## 2. Try to break it — mutation / drift table (per layer)

Columns: **static** = `node --test foundation-contract.test.mjs identity-isolation.test.mjs`;
**mc** = migrate-clean; **rs** = rls-smoke; **nc** = the CI negative control. Exit 2 = refused/failed, 0 = clean.
All re-measured by me on fresh 5503 clusters from the committed tree.

### 2a. The batch-128 re-check exploits, re-run as drifts (X7, X8, Q-IPF, Q-IPVx, Q-T1; plus the seal and X6)

| Id | Drift | static | mc | rs | My verdict |
|---|---|---|---|---|---|
| **X7** | `create or replace view information_schema.information_schema_catalog_name` + ideas' columns (built by EXECUTE) | 0 | **2** | 0 | Caught at mc, named as built. Before 129: every layer 0. |
| **X8** | `information_schema._pg_char_max_length` replaced, SECURITY DEFINER over ideas | 0 | **2** | 0 | Caught at mc. |
| **Q-IPF** | `information_schema._pg_interval_type` replaced, SECURITY DEFINER over ideas | 0 | **2** | 0 | Caught at mc. **Leak confirmed real:** before the guard a no-claims session read both tenants via the function (`workspace_id:topic a1 | …b1`). |
| **Q-IPVx** | the catalog-name view replaced in a DO block | 0 | **2** | 0 | Caught at mc. |
| **Q-T1** | `grant create on database template1 to authenticated` | 0 | **2** | 0 | Caught at mc, named "unlisted: authenticated CREATE on database template1". |
| **seal** | Q-IPVx, then `delete` the view's row from `catalog_baseline.system_fingerprint` | 0 | **2** | 0 | Caught: executor reports "its seal moved while the migrations ran … so it is no reference", before any probe. |
| **X6** | `alter role authenticated bypassrls` | 0 | **2** | **2** (347/1079; authz-proofs 2/6) | Caught at mc **and** rs. Before 129: rs alone. |

Every claim in §3/§6 of the plan that I re-ran reproduced exit-for-exit and name-for-name.

### 2b. Fresh drifts of my own (two+ per new rule)

| Id | Drift | static | mc | rs | Verdict |
|---|---|---|---|---|---|
| QA1 | `alter role anon replication; alter role authenticated login` | 0 | **2** | 0 | Caught — `rolreplication`/`rolcanlogin` pinned false. |
| QA2 | `alter role authenticated createrole` | 0 | **2** | 0 | Caught. |
| QB1 | `grant temporary on database template1 to authenticated with grant option` | 0 | **2** | 0 | Caught — the other-database grant-option arm. |
| QB2 | `grant create on database template0 to public` | 0 | **2** | 0 | Caught. |
| QF1 | `alter function pg_catalog.pg_sleep(double precision) set work_mem='64kB'` | 0 | **2** | 0 | Caught — `proconfig` is in the fingerprint. |
| QF2 | `grant select (staattnum) on pg_catalog.pg_statistic to authenticated` | 0 | **2** | 0 | Caught — per-column `attacl` is in the fingerprint. |
| QF3 | `alter function information_schema._pg_interval_type(oid,integer) rename to …` | 0 | **2** | 0 | Caught, but **indirectly**: the renamed function's own row is unchanged (name is not compared, see F1); it is named only because the `information_schema.attributes/columns/domains` views that reference it have a changed `pg_get_viewdef`. |
| QD1 | `alter default privileges grant usage on types to public` | 0 | **0** | 0 | **Not stored, so not caught — correctly a no-op.** USAGE on types to PUBLIC is PostgreSQL's built-in default, so `pg_default_acl` records no row and no privilege is added. Confirms rule 4 is not over-broad; not an escalation. |

### 2c. Each new rule weakened in code, digests refreshed (the forged-review model)

`refresh.mjs` recomputes every probe digest and rewrites the pin, so only an independent reading-pin or
self-test may still catch the mutation. Six fresh mutations, each paired with the drift it should let through:

| Mutation | What it weakens | paired drift | static | mc | Held by |
|---|---|---|---|---|---|
| QFP_REL | fingerprint reads no relations (relation arm `where false`) | X7 | 0 | **2** | the fingerprint probe's own self-test at mc ("declares 1 drift and 0 were refused") |
| QFP_SRC | fingerprint drops `prosrc` (function body) | QBODY (in-place body swap) | **1** | **2** | the static reading-pin "every function initdb made: owner, language, security, settings, **body**, binary and ACL" |
| QFP_SEAL | executor never re-reads the seal after the migrations | seal | **1** | **2** | a static pin on the executor's re-read |
| QATT_REP | `rolreplication` dropped from the pinned-false list | QA1 | **1** | **2** | the static pin on `CLIENT_ROLE_FALSE_ATTRIBUTES` |
| QDB_GO | the grant-option half of the other-database arm removed | QB1 | **1** | **0** | the static reading-pin "every other database: CREATE, and any grant option" (runtime slips; the code change is what the test refuses) |
| QD4_PUB | rule 4 stops reading PUBLIC (grantee 0) | QDPUB (default priv to PUBLIC) | **1** | **2** | the static pin on rule 4 **and** the probe's own self-test at mc |

Every mutation is caught by at least one layer with digests refreshed. This independently reproduces the
Author's MFP/MFV/MATT/MDACL/MDB result and extends it: the fingerprint's per-column coverage (`prosrc` and the
rest) is asserted by a static reading-pin, not by the digest alone — so a quiet narrowing of what the
fingerprint reads fails the suite.

### 2d. Can the baseline be forged by a drift?

The fingerprint is taken **before** migration 1, into `catalog_baseline.system_fingerprint` (revoked from
PUBLIC); the executor reads a seal (count + md5 of the ordered rows) out of band and re-reads it after the last
migration, failing the run if it moved (the **seal** drift above). The snapshot step refuses a database where
`app` already exists and no fingerprint was taken. A migration that `delete`s, re-inserts or rewrites the table
moves the seal and is caught. The only residual is a hostile superuser migration that perfectly rewrites the
very output functions/operators the probe calls — which blocker 186 already carries as owed and §5 states. I
did not find a drift that forges a green baseline within the stated model.

## 3. Graded findings (file:line, remedy)

- **F1 — INFO (documentation).** `scripts/db/run.mjs:695` — `SYSTEM_FINGERPRINT_ROWS` stores an object's name
  in `ident` but the probe compares only `fp` (`run.mjs:211`, `n.fp is distinct from b.fp`), so a rename of an
  initdb object in place changes `ident` but not `fp` and is not detected by its own row (QF3 was caught only
  because referencing views' `pg_get_viewdef` changed). This matches the probe's claim, which does not promise
  name detection, and a rename grants no data access by itself — but §5's "does not cover" list names neither
  rename nor `ident`. **Remedy:** either add `ident` to the compared tuple, or add one line to §5 stating that a
  pure rename of an unreferenced initdb object is not read. Record as owed on blocker 186 (the Owner ended the
  chain), not stop-the-line.

- **F2 — INFO (layering note, no change needed).** The relation arm's *presence* is guarded only by the
  probe's embedded self-test at migrate-clean, not by a static text pin (QFP_REL: static 0, mc 2). This is the
  project's accepted layering, not a defect; stated so the next author knows which layer holds it.

- **F3 — INFO (positive control, no change).** QD1 confirms rule 4 does not over-report: a default-privilege
  statement equal to PostgreSQL's built-in default stores no `pg_default_acl` row and is correctly silent.

No MEDIUM or higher finding. The five items blocker 186 recorded as closed by this batch (in-place
redefinition/re-grant, the `pg_temp`-only OID self-test, client role attributes, `pg_default_acl`, every other
database) are each independently reproduced as closed above.

## 4. Stop-the-line verdict, and what blocks the merge

**No stop-the-line.** No secret exposure, tenant leakage, duplicate side effect, lost job, migration divergence,
irreversible deletion or contract mismatch. The batch is assertion-and-tooling only; it adds no migration, binds
no production schema or provider, and strengthens the DB foundation's drift detection — every batch-128 exploit
I could reproduce is now refused at migrate-clean, with the one real data-leak (Q-IPF) confirmed before the
guard and closed after it.

**What blocks the merge** is the ordinary separation-of-duties gate, not a defect I found: this is Author
evidence produced within the Author's own vendor and orchestration (§0), the PR is a Draft, and RFC-2026-002
requires a green required CI run on `0f08d92` plus the independent Reviewer (C0), Tester and Security (A1) role
runs and the Integration Owner before the Product Owner merges. Acceptance of this record as the Tester
signature is the Integration Owner's and Product Owner's act, not mine. F1 is owed, not blocking.

## 5. Limits of this test

Measured only on PostgreSQL 17.11 (cross-minor fingerprint stability is argued, not measured — a known limit).
The drift and mutation rounds ran in a `git archive` clone of `0f08d92` (byte-identical to the committed tree;
`140_audit.sql` sha1 verified), while the clean baseline, the Node suite and the scope/identity/secret/manifest
checks ran on the branch name in the worktree. No network: CI, `gh` state and the other role runs are read, not
measured. I exercised only the DB foundation layer the task names; I did not audit application code or other
packages.
