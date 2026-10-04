# A1 Security/Privacy re-check: batch 150's review round

- **Package:** `WP-0A-DB-00`. **Role run:** `/claude/a1_bastion`, independent Security/Privacy reviewer.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-150`, PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/173> (Draft). Head `218f91f` (handoff alone) over
  code `2492ae9`, base `1930f41` (`main`). The previous head I reviewed was `c0fa18e`. Author `/claude/a0_atlas`.
- **Scope:** a narrow re-check of the review-round corrections (`git diff c0fa18e..218f91f`). My own findings
  F150-1..F150-5 (`a1-batch-150-security-review-2026-10-03.md`) were checked first. I also re-answered the four
  questions put to me against the whole diff `1930f41..218f91f`.
- **Checkout:** I checked the head out as my own local branch, `recheck/a1-batch-150` at `218f91f`. The
  Author's branch name is checked out in another worktree, so I ran the name-sensitive commands in a private
  clone (`scratchpad/a1-150r2/clone`) checked out as `agent/claude/WP-0A-DB-00-batch-150` at `218f91f`. In that
  clone, `origin/main` and `origin/HEAD` are both `1930f41`. Not detached.
- **Date:** 2026-10-04. The file name carries the phase's date (2026-10-03).

**This document records review findings. It advances no package status, signs nothing on anyone's behalf
and approves nothing.** I do not fix. Nothing in the subject was changed by this run. The only file this run
adds is this one.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I am the same vendor
and model family (RFC-2026-024). The Author chose what to point me at. Whether this re-check counts as the
Security/Privacy role's signature is not mine to decide. Accepting it as that signature is the Integration
Owner's and the Product Owner's act. The acceptances recorded as owed to A1 (the Q170-d answer, SP-1..SP-4,
and the disposition's §5 rows) are not given by this file.

## 1. Measured vs read

**Measured.** Setup for every round:

- PostgreSQL 17.11 from `/opt/homebrew/bin`, `initdb --locale=C -A trust -U postgres`.
- 127.0.0.1:5501 only, TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`.
- `db/foundation/ci/supabase-shim.sql` first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres`.
- Node `v24.20.0` from `/Users/bank/.local/node-v24.20.0/bin`, with `node -v` printed before every measured
  run. The PATH Node 26 was not used.
- A fresh initdb for every round. Private directory `scratchpad/a1-150r2/`.
- Each drift was appended to `db/foundation/migrations/140_audit.sql` and restored from a saved copy. The
  sha256 was `2ac596bb950e8dfb…` after every restore, the same value the plan records.
- At the end the cluster was stopped and its data directory removed. `lsof` shows nothing listening on
  5501 (exit 1). Ports 5432 and 5499 were not touched.

| # | What | Exit | Output (abridged) |
|---|---|---|---|
| — | `node scripts/verify-branch-scope.mjs 1930f41 WP-0A-DB-00` (clone, on the branch name) | 0 | "all 19 changed path(s) are declared, and every amendment explains one" |
| — | `npm run check:handoff` (clone, on the branch name) | 0 | "describes the branch: nothing substantive after its cited head" (`head_revision_or_patch_checksum` = `2492ae9`) |
| — | `npm run verify` (clone, on the branch name) | 0 | "clean: exit 0 — tests 684, pass 684, fail 0" |
| r1 | `make db-migrate-clean` | 0 | Applied 150. Data classification probe: "exactly the 71 column reads … (self-test: refused each of its 4 drifts …)". The widened drift is drift 3. Pinned shape probe: 32 / 18 / 4 / 0, 5 drifts. Post-migrate 50 / 38 / 12. |
| r1 | `make db-rls-smoke` | 0 | 1079 isolation cases; `db-authz-proofs: ok — 6 claim(s)` |
| r1 | K0 (catalog) | — | Keys: `PRIMARY KEY (id, metric_time)` and `UNIQUE (published_post_id, metric_time)`, plus the scope FK out to `published_posts`. 0 FKs reference the table, and nothing in `pg_depend` names the key index besides the constraint. `indkey::int2[]` has lower bound 0, so `[0:indnkeyatts-1]` is exactly the key columns: pkey `{1,5}`. |
| r1 | K1, as owner, `OVERRIDING SYSTEM VALUE`, existing `id` 1 at another `metric_time` | — | Accepted: 2 rows with `id` 1. Rolled back. This is the accepted property; unchanged from round 1. |
| r1 | K2, `set role app_worker`: insert with `OVERRIDING SYSTEM VALUE`, then `update … set id = 1` | — | "permission denied for table performance_snapshots", then "column "id" can only be updated to DEFAULT" |
| r1 | K3, roles (excluding `pg_*`) holding INSERT or UPDATE on `id`, or USAGE/UPDATE on its sequence | — | `postgres` only, in both. `pg_write_all_data` has no members on the shim. |
| r1 | Policies and grants on the table | — | The two policies read `workspace_id` and the post's scope only, never `id`. `authenticated` and `app_worker` hold column SELECT. `app_worker` holds INSERT on every column but `id` and `collected_at`. |
| r1 | C2, 150's check-2 query run live against test unique indexes (rolled back) | — | `offending` = `index t_expr, index t_id_incl, index t_id_only, index t_partial`. `(metric_time, id)` passes. So `(id)`, `(id) INCLUDE (metric_time)`, a partial `(id)` and `(id, (metric_time at time zone 'UTC'))` are each refused. |
| r1 | A1–A3, the partition path (C0-1), rolled back, on 4 fixture rows | — | Attach to a parent whose `id` is an ALWAYS identity: "table "performance_snapshots" being attached contains an identity column "id"" / "The new partition may not contain an identity column". The same error when the parent's `id` is not an identity. Path that works: drop the identity, create the parent with an identity `id` and key `(id, metric_time)`, attach, then `setval` to 4. Result: 4 rows read through the parent, and the partition's `attidentity` is `a`. The new parent had RLS **off**, no ACL and 0 policies after the attach. |
| r1 | A4, an exclusion constraint `exclude using btree (id with =)` | — | The table accepts it. A range-partitioned parent refuses the same constraint: "EXCLUDE constraint on table "t_parent" lacks column "metric_time" which is part of the partition key". |
| r1 | W1, the workspace-list text as `authenticated` (claims set; RLS enabled and forced on both tables) | — | Results are the same as round 1. Owner, own id: 1. Owner, another tenant's id: 0. Owner, a co-member's id: 1. Owner, no filter: 1 distinct workspace. Viewer, owner's id: 0. Viewer, own id: 1. The other tenant's owner, with this tenant's owner id: 0. |
| e1 | drift: `create unique index … (id)` before 150 | mc **2**, rs 0 | "150_performance_snapshots_key.sql: a unique key on app.performance_snapshots does not carry metric_time: index a1r2_id_alone_uix (P0001)". In round 1 (X5), 150 **applied** this. |
| e2 | drift: `create unique index … (id) include (metric_time)` | mc **2**, rs 0 | Refused at 150's check 2, named `index a1r2_id_incl_uix` |
| e3 | drift: `exclude using btree (id with =)` | mc **2**, rs 0 | 150 **applied** (check 2 reads `p`/`u` constraints and `indisunique` indexes, and the exclusion index is neither). The pinned shape probe (rule 18) refused it: "unlisted or changed: app.performance_snapshots.a1r2_id_excl". |
| M5ab | Mutant in the clone's `run.mjs`: the projection column list narrowed to SELECT, REFERENCES and the table list to DELETE, with the test's digest set to the mutant's (`07bf97b8c5fd9efa`). Run: `node --test test-kits/db/foundation-contract.test.mjs`. | 1 | "AssertionError: rule 3 reads SELECT, INSERT, UPDATE and REFERENCES per column of a projection table, both ways". With the digest **not** refreshed, the digest assertion fails first. Both files were restored from saved copies (sha256 equal to `integrity-manifest.json`), and `git status --porcelain` in the clone is empty. |
| — | Catalog read-back after 150 (round e3) | — | The table comment contains "refuses to attach a table with an identity column". The key comment contains "id ALONE IS NOT UNIQUE BY ANY CONSTRAINT". |

**Static checks against the diff:**

- `c0fa18e..218f91f` changes `open_blockers` 179, 193 and 194, **only by appending**. I checked this in
  Python: each new entry starts with its old text. Counted against `1930f41`, 12 entries changed, all by
  appending. The count stays 195.
- Apart from `open_blockers`, the only WP field that changed is `ownership` (the
  `amends_without_owning.rationale` text, 17 → 16).
- 3 + 5 + 4 + 4 = 16 Q-ids.
- The Q150-b quote matches `product-owner-disposition-2026-10-03-batch-150-prereq.md`:103 word for word.
- In the code diff the workspace-list `sql` string is unchanged. Only its comment and the metrics query's
  `source` string changed.
- A grep for consumers of `performance_snapshots` that address `id` alone (`on conflict`, `returning`,
  `where … id =`) in `db/`, `scripts/` and `test-kits/` finds none.

**Read, not measured:**

- The plan's §11. The disposition's diff and §7. The handoff's text fields. Both commit messages.
- README rules 17 and 18 as changed.
- I did not re-run `explain-harness.mjs`, because the query text is unchanged. Its round-1 result stands:
  no Seq Scan, cost 27.3.
- A0's own r1/r2/Q3 rounds on 5507. I re-measured their substance; I did not re-run Q3 as a later file,
  because the self-test's drift 3 is that drift.

## 2. My round-1 findings

| Finding | Remedy asked | Now | Verdict |
|---|---|---|---|
| F150-1 (LOW), `deep_link_target_ref` "cannot carry … a provider identifier" | correct the sentence; SP-4 on `[193]`; forward migration and contract bound, by the owners | The review text is corrected at `safe-projections.json`:55. SP-4 is added at :127-133, with the measured shapes, the §9.1 classes and owners. Test: SP-1..SP-4. README rule 17, `[193]` and disposition §5 list it. | **Resolved as a record.** The bound itself is owed to the owners (`[193]`), as asked. |
| F150-2 (INFO), `id` alone unique by no constraint | say so in the key comment; keep `id` out of references without `metric_time` | Stated in 150:29-34, the key comment 150:81-88 (read back from the catalog), README rule 18, `[194]` (14) and the handoff. Block 5 still refuses a referencing FK. | **Resolved.** One wording point: F150r-1. |
| F150-3 (INFO), check 2 reads constraints only | read `pg_index` unique indexes by key columns | Done (150:128-149). Measured: e1 and e2 now fail at 150, and C2 refuses partial and expression uniques too. | **Resolved.** A residual, held by rule 18: F150r-2. |
| F150-4 (INFO), rule 17's claim is about privileges only | a sentence naming the other probes | `run.mjs`:1442-1447 and README rule 17 name the client privilege, pinned grant, read allowlist and client membership probes. They also name what no grant probe holds. | **Resolved.** |
| F150-5 (INFO), the literal is not the session subject | a line in the harness comment for the BFF author | `explain-harness.mjs`:83-89 says nothing binds the literal and the BFF MUST bind `m.user_id` to `(select auth.uid())`. `[194]` (1) is appended. | **Resolved as a record**, owed with the BFF. |

## 3. Answers to the questions put

**Does the PK change open anything?** No, measured again.

- No foreign key references the table (K0).
- No policy reads `id`.
- No grant lets a non-owner write `id` (K2, K3).
- 121's block re-runs as written (38 re-run).
- The publisher has no code. The fixture's upsert targets `performance_snapshots_one_per_post_instant`,
  which is unchanged.

Duplicate ids across `metric_time` are possible for the owner only (K1). That is now recorded in the
catalog and the README as an accepted property, and the address of a row is `(id, metric_time)`. The
round-1 X1 and X2 classes are unchanged, because no grant, policy or index moved in this round.

**Does rule 17 refuse any client column outside the pinned projection?** On tables and columns, yes, as
measured in round 1 (X1). In this round:

- The widened self-test drift (drift 3) adds a column UPDATE, a column INSERT, a table TRUNCATE and a table
  TRIGGER. migrate-clean refuses it, naming each grant (r1).
- The new static regexes kill the narrowed-list mutant M5ab once the digest is refreshed.
- Views and SET ROLE remain other probes' (X2, X3 in round 1), and the README and the comment now say so.

On the twelve open tables rule 17 reads SELECT only. Their INSERT and UPDATE are rule 7's, as the handoff's
`known_limitations` states.

**Is any pinned column unsafe under §9.1?** No column the projection pins changed in this round (71 reads).
SP-1..SP-3 stand as in round 1. `deep_link_target_ref` is now recorded truthfully as SP-4 (LOW): no client
writes it, and each reader sees only their own rows. No pinned column is SECRET-4, carries a provider
token by its type, or carries a raw payload.

**Is the rewritten workspace-list query RLS-safe?** Yes (W1, re-measured). `workspaces_select_active_member`
limits every row to the caller's own workspaces whatever the literal says. A literal naming another
tenant's user returns 0 rows. The remaining point is binding the literal to the session, which now
reads as owed by the BFF (`[194]` (1)).

## 4. Findings of this re-check

### F150r-1 (INFO). "No role but the owner holds INSERT or UPDATE on id" is stated as a fact of every instance, and it is measured on the shim only

- **Where:** `150_performance_snapshots_key.sql`:30-31 (header) and :85 (the key comment, which goes into
  the catalog). Also `db/foundation/README.md`:642-643 and the handoff's `security_privacy_cost_impact`.
- **What:** On the shim it is true (K3: `postgres` only, and `pg_write_all_data` has no members). The same
  round's plan §11.2 and `[194]` (14) decline a block pin precisely because platform roles
  (`pg_write_all_data` members, Supabase's own roles) are unmeasured (Q170-c). Any role holding INSERT
  can use `OVERRIDING SYSTEM VALUE`, which needs no special privilege. So, on a platform instance, the
  catalog comment may claim a guard the instance does not have.
- **Why INFO:** No client role is affected. The property is recorded as accepted either way, and no
  consumer addresses `id` alone.
- **Remedy:** In a later edit (or the forward migration that partitions), qualify the sentence: "of the
  roles these migrations grant; platform roles are Q170-c's". Or carry the qualification on `[194]` (14).
  Not blocking.

### F150r-2 (INFO). Check 2 does not read exclusion constraints; rule 18 holds them

- **Where:** `150_performance_snapshots_key.sql`:128-149.
- **What:** `exclude using btree (id with =)` is a uniqueness on `id` alone that a range-partitioned
  parent refuses (A4). It passes 150 (e3), because it is `contype = 'x'` and its index is not `indisunique`.
  The pinned shape probe refuses it (e3, mc 2), so the property is held today, by the pin.
- **Remedy:** None needed now. If the later part of batch 150 retires the pin before partitioning, its
  block should read `contype in ('p', 'u', 'x')`.

### F150r-3 (INFO). The partition path as recorded leaves the parent without RLS until the later batch adds it

- **Where:** `150_performance_snapshots_key.sql`:19-27, `[179]`. This is the path as measured, not a
  defect of 150.
- **What:** In A3, the parent `create table … partition by range` had RLS off, no ACL and 0 policies after
  the attach. No grants means no client reach, so that order is safe. A batch that grants on the parent
  before enabling and forcing RLS and creating the policies would expose every partition's rows through
  the parent. 150's header and `[179]` already say that the batch "moves the policies, grants and
  comments to the parent".
- **Remedy:** For the later part (`[179]`, `[194]` (2)): in one transaction, enable and force RLS and
  create the policies on the parent **before** any grant. The rule 17 and rule 18 pins move to the parent
  in the same diff. A1 reviews that batch.

No finding of this round is LOW or higher.

## 5. Claims checked

**True as measured or read:**

- Commit `2492ae9`'s message:
  - the C0-1 path, measured identically (A1–A3);
  - check 2 reads unique indexes (e1, e2, C2);
  - Q-3's drift and regexes (r1, M5ab);
  - digest `a848ca33af3460e3` and floor 932 (`npm run verify` 0 and the manifest hash of the test file);
  - SP-4, `[194]` (1), `[194]` (2) and the 16-not-17 note.
- Commit `218f91f`'s message: the handoff's text fields carry each listed change. `decisions_consumed` now
  names this batch's answers, the count is 16, and the floor and digest are as stated.
- Plan §11.1–11.6. The cherry-pick map holds: `9c6da72` adds my round-1 file unchanged, and it is the file
  I read in §2. Two points are taken as A0's report and were not re-run by me: "M5ab mc 2" (I measured the
  static half) and "Q3 as a later file mc 2" (the self-test half I measured).
- The disposition's changes are text only. The Owner's words are unchanged, and §7 says what cannot be
  checked.
- The blocker edits are append-only, 3 entries this round. `open_blockers[179]`'s split (key half CLOSED,
  identity and attach half OPEN) matches A1–A3.

**One wording to read with care:** F150r-1.

## 6. Stop-the-line verdict

**No stop-the-line.** I measured:

- no secret exposure;
- no tenant leakage (W1; rls-smoke 1079 and 6 claims on r1);
- no client reach that changed (no grant, policy or projection row moved in this round, and rule 17's
  self-test now refuses more);
- no migration divergence (150 is still declared not applied, and is edited in place only because it is
  not integrated);
- no irreversible change.

**Does anything block the merge?** No finding of mine does. F150r-1..3 are INFO. My round-1 findings are
resolved as records, with the substantive work owed to named owners on `[193]` and `[194]`.

The merge remains gated by what this file cannot supply:

- C0's and Q0's re-checks;
- the Integration Owner's evidence (`open_blockers[188]`);
- a green required CI run on the head;
- RFC-2026-002's rule, which the disposition records as not met literally when A0 presses the merge;
- A1's acceptances recorded as owed, which this file does not give (§0).

## 7. Limits

- One host, PostgreSQL 17.11, the shim and not the platform. Platform roles, `auth.uid()` reach, Data API
  and Realtime were not measured (Q170-c). F150r-1 rests on that limit.
- I did not re-run `explain-harness.mjs`, X1–X3, or A0's Q3 round as a later file (§1).
- The partition experiments (A1–A4) are rolled back in one session on the migrated database. They show
  what the server accepts, not a designed migration.
- Drifts were appended to `140_audit.sql`, which runs before 150. A later migration that undoes 150's key
  was not exercised.
- Same vendor and model family as the Author (§0).
