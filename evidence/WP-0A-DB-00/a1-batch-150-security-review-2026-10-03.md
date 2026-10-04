# A1 Security/Privacy review: batch 150 (performance_snapshots keyed by (id, metric_time); the workspace list from workspace_members; rule 17 as a pinned safe projection)

- **Package:** `WP-0A-DB-00`. **Role run:** `/claude/a1_bastion`, independent Security/Privacy reviewer.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-150`, PR
  <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/173> (Draft), head `c0fa18e` (handoff alone) over
  code `2318c72` and records `4b252d4`, base `1930f41` (`main`, PR #172). Author `/claude/a0_atlas`.
- **Checkout:** I checked the head out as my own local branch `review/a1-batch-150` (at `c0fa18e`). The
  Author's branch name is checked out in another worktree, so I ran the name-sensitive commands in a
  private clone (`scratchpad/a1-150/clone`) checked out as `agent/claude/WP-0A-DB-00-batch-150` at
  `c0fa18e`, with `origin/main` and `origin/HEAD` both `1930f41`. Not detached.
- **Date:** 2026-10-04. The file name carries the phase's date (2026-10-03), as the batch's plan does.

**This document records review findings. It advances no package status, signs nothing on anyone's
behalf and approves nothing.** I do not fix. Nothing in the subject was changed by this run.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`, the Author of the change under review. I am the same
vendor and model family (RFC-2026-024). The Author chose what to point me at. Whether this review counts
as the Security/Privacy role's signature is not mine to decide: accepting it as that signature is the
Integration Owner's and the Product Owner's act. Where the disposition records an answer as "A1's
acceptance remains owed", this file is not that acceptance.

## 1. Measured vs read

**Measured.** Setup for every round:

- PostgreSQL 17.11 from `/opt/homebrew/bin`, `initdb --locale=C -A trust -U postgres`.
- 127.0.0.1:5501 only, TCP only (`-c unix_socket_directories=''`), `LC_ALL=C`.
- `db/foundation/ci/supabase-shim.sql` first, then `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/postgres`.
- Node `v24.20.0` (`node -v` checked before every measured run).
- A fresh initdb for every round. Private directory `scratchpad/a1-150/`.
- Every drift was appended to `db/foundation/migrations/140_audit.sql` and restored byte for byte. The
  sha256 was `2ac596bb950e8dfb…` before each round and after each restore, the same value the plan records.
- At the end the cluster was stopped and its data directory removed. `lsof` shows nothing listening
  on 5501. Ports 5432 and 5499 were not touched.

| # | What | Exit | Output (abridged) |
|---|---|---|---|
| — | `node scripts/verify-branch-scope.mjs 1930f41 WP-0A-DB-00` (clone, on the branch name) | 0 | "all 15 changed path(s) are declared, and every amendment explains one" |
| — | `npm run check:handoff` (clone, on the branch name) | 0 | "describes the branch: nothing substantive after its cited head" |
| — | `npm run verify` (clone, on the branch name) | 0 | "clean: exit 0 — tests 684, pass 684, fail 0" |
| r1 | `make db-migrate-clean` | 0 | "applied 150_performance_snapshots_key.sql". The data classification probe claim matches the plan's §0.2 text word for word: 66 tables, 4 SECRET-4, 4 PROVIDER-3/INTERNAL-3, 12 open, 71 column reads, 4 drifts. Pinned shape probe: 32 constraints, 18 indexes, 4 policies, 0 triggers, 5 drifts. Post-migrate 50 / 38 / 12. |
| r1 | `make db-rls-smoke` | 0 | 1079 isolation cases; `db-authz-proofs: ok — 6 claim(s)` |
| r1 | K1, as the owner on the r1 database | — | Inserted a second row with `id = 1` at a distinct `metric_time` with `OVERRIDING SYSTEM VALUE`; it was **accepted** (2 rows with id 1); rolled back |
| r1 | K2, `set role app_worker`, the same insert | — | `permission denied for table performance_snapshots` (no INSERT on `id`) |
| r1 | K3/K4 | — | The identity sequence is owned by `postgres`. No client or service role holds USAGE or UPDATE on it. Nothing depends on the new key index. 0 foreign keys into the table. |
| r1 | W1, the workspace-list text as `authenticated` (claims set, RLS on and forced on both tables) | — | Owner of a 7-member workspace, caller's own id as the literal: 1 row. An other-tenant user's id: 0. A co-member's id: 1. Old text (`from app.workspaces`): 1. A viewer with the owner's id as the literal: 0. The viewer's own id: 1. |
| r1 | W2 | — | As `authenticated`, `app.jwt_subject()` gives "permission denied for function jwt_subject" and `auth.uid()` gives "permission denied for schema auth" (the plan's §3 claim holds on the shim) |
| r1 | D-1, `notifications_deep_link_target_ref_form`'s pattern against synthetic values | — | Admits `content:17841400000000000`, `content:104857600000000_987654321000000` and a 211-character alphanumeric token-shaped `job:EAA…` value. Refuses `https://…` and `content:../x`. |
| X1 | drift: table-level `select` on `consumer_ledger`; a new column on `publish_jobs` granted to authenticated; table-level `select` on `published_posts`; `select (status)` on `publish_jobs` to anon; `select (input_ref)` on `jobs` to PUBLIC | mc 2, rs 2 | **Data classification probe** (rule 17): "client privilege(s) outside the pinned safe projection …" names all 11 column reads, among them `authenticated SELECT (a1_provider_raw) on app.publish_jobs`, every `consumer_ledger` column, `authenticated SELECT (external_post_hash) on app.published_posts`, `anon SELECT (status) on app.publish_jobs` and `public SELECT (input_ref) on app.jobs` (plus anon and authenticated, which inherit it). Also refused by the pinned grant probe and the read allowlist probe. |
| X2 | drift: a definer view `select id, input_ref from app.jobs` and a `security_invoker` view over `jobs`, both granted to authenticated | mc 2, rs **0** | The data classification probe is **silent**. Refused by the client privilege probe ("view(s) … not pinned or not security_invoker: app.a1_jobs_definer, app.a1_jobs_invoker"), the pinned grant probe and the read allowlist probe. |
| X3 | drift: `create role a1_reader`; `select (input_ref)` on `jobs` to it; `grant a1_reader to authenticated` | mc 2, rs **0** | The data classification probe is **silent** (`authenticated` is NOINHERIT, so `has_column_privilege` is false, and SET ROLE still reaches the grant). Refused by the client membership probe and the pinned grant probe ("authenticated -> a1_reader"). |
| X4 | drift: `unique (id)` constraint on `performance_snapshots`, before 150 | mc 2 | "150_performance_snapshots_key.sql: a unique key on app.performance_snapshots does not carry metric_time: a1_id_alone_unique (P0001)" |
| X5 | drift: a bare `create unique index … (id)` on `performance_snapshots`, before 150 | mc 2, rs 0 | 150 **applied** (its block reads `pg_constraint` only). Refused by the pinned shape probe: "unlisted or changed: app.performance_snapshots.a1_id_alone_uix". |
| H | fresh cluster, `make db-migrate-clean`, then `explain-harness.mjs --scale 0.2 --json --fail-on-seq-scan` | 0, 0 | workspace list: no Seq Scan; `workspace_members_user_id_status_idx`, `workspaces_pkey`; total cost 27.3; `flagged: []`; 9 s |

Static checks against the diff:

- The 11 blockers the commit names (18, 21, 29, 33, 93, 95, 148, 150, 192, 193, 194), plus 179, were
  each changed **only by appending** (Python check against `1930f41`: every changed entry starts with
  its old text). The count stays 195.
- `open_blockers[i]` is WP line 253+i for 179, 193 and 194.
- 71 = 10 + 8 + 13 + 9 + 9 + 14 + 8.

**Read, not measured:**

- The Owner's words and what A0's phase-end summary said. The harness relays the user request of this
  run as `เิาตามแนะนำ`, verbatim, which matches §1 of the disposition. I did not see the summary those
  words answered, so I cannot check the reading "all 17 Q-ids ANSWERED as A0 recommended" against it.
- The ERD §9.1 table (`docs/sprint-0a/sprint-0a-core-erd-rls-retention-th.md`:440-455).
- The constraints in 051, 120 and 121 behind each pinned column.
- The Author's "before" measurement: exit 3, cost 865.54. I re-measured the "after" only.

## 2. Answers to the questions put

**Does the PK change open anything?** Nothing live.

- No foreign key references the table (K4, and 150's block 5).
- No policy, grant or index names the key. The policies read `workspace_id` and the post's scope, and
  are unchanged (read from `pg_policy` on r1).
- 121's block never names the key's columns. It re-runs as written (38 re-run).
- The publisher has no code yet. The one fixture write uses `on conflict on constraint
  performance_snapshots_one_per_post_instant`, which is unchanged.
- Rows are still made unique per post and instant by `performance_snapshots_one_per_post_instant`.

What changed in substance: **`id` alone is no longer unique by any constraint** (K1). Only the
identity sequence keeps it unique now, and only the migration owner can break that: with OVERRIDING
SYSTEM VALUE, or by resetting the sequence. app_worker cannot (K2, K3). This is F150-2 (INFO), and it
matters to the first consumer that addresses a snapshot by `id` alone.

**Does rule 17 refuse any client column outside the pinned projection?** On tables: yes. X1 shows it
refuses all of these:

- a table-level grant (expanded per column, because `has_column_privilege` is true under a table grant)
- a new column
- a pinned column granted to a role it is not pinned for
- a PUBLIC grant
- the narrowing direction (the Author's D4)

Two kinds of reach are **not rule 17's**: views (X2) and SET ROLE through a membership (X3). Other
probes refuse both, so the boundary holds today. Only the joint claim is true (F150-4, INFO).

**Is any pinned column unsafe under §9.1?** None carries a secret or a raw payload by its type, and
none is SECRET-4. SP-1, SP-2 and SP-3 are as the Author recorded them. I add one finding the review
text gets wrong: `notifications.deep_link_target_ref`, measured to admit a provider-identifier shape
and a token shape (F150-1, LOW).

**Is the rewritten workspace list RLS-safe?** Yes, measured (W1):

- Both tables have RLS enabled and forced.
- `workspaces_select_active_member` requires the caller's own active membership whatever the literal says.
- A literal naming another tenant's user returns 0 rows.
- A literal naming a co-member returns only workspaces the caller already sees.

The literal is not bound to the session. That is a harness device, and the production query must use
the session subject (F150-5, INFO).

## 3. Findings

### F150-1 (LOW). `safe-projections.json` says `notifications.deep_link_target_ref` "cannot carry … a provider identifier"; measured, its constraint admits one, and a token shape

- **Where:**
  - `db/foundation/lint/safe-projections.json`:55 (the `review` of `app.notifications`).
  - The constraint it relies on is `db/foundation/migrations/051_notification.sql`:535-536.
  - The plan's §4 bullet at `a0-batch-150-plan-2026-10-03.md`:228 is true as written (it says only
    that the column is held to a reference form).
- **What:** The pattern `^(app|content|asset|job):[A-Za-z0-9_-]+…$` has no length bound. It admits
  all of these (D-1, synthetic values):
  - `content:17841400000000000`, an Instagram-media-id shape;
  - `content:<digits>_<digits>`, a Page-post shape;
  - a 211-character alphanumeric `job:EAA…`, the shape of a Meta bearer token.

  It refuses a URL and `..` only. The column is in the client projection (10 pinned reads on
  `notifications`). Under §9.1, an "external post ID" is PROVIDER-3, which allows a "safe projection
  only", and a token is SECRET-4, which is "never returned after write".
- **Why not higher:** No client writes the column (authenticated holds UPDATE on `read_at` only), so a
  value reaches it only through the notification writer. Each reader sees only their own rows. 051
  already reports the missing `maxLength` as a contract gap. This is the same class as A1's F1 on 121:
  a shape check that does not separate meaning.
- **Remedy:**
  - Correct the `review` sentence. Record the column as SP-4 next to SP-1..SP-3 on `open_blockers[193]`.
  - In the owner's forward migration and CTR-NTF-001, bound the length and key the reference to an
    application identifier form, for example a uuid after the scheme.
  - Owners: the notification table's owner and A1, with the contract owner.

### F150-2 (INFO). After 150, `id` alone is unique only by the identity sequence, not by a constraint

- **Where:** `db/foundation/migrations/150_performance_snapshots_key.sql`:55-56. The key comment is at :61-65.
- **What:** K1 measured that a second row with an existing `id` at another `metric_time` is accepted.
  Only the owner can write one (OVERRIDING SYSTEM VALUE or a sequence reset). app_worker is refused
  (K2), and no non-owner role holds the sequence (K3). Today nothing reads a snapshot by `id` alone.
  The first API, keyset cursor, export row reference or audit reference that does would silently admit
  two rows.
- **Remedy:**
  - Say in the key's comment that `id` is not unique by constraint, and that a snapshot is addressed
    by `(id, metric_time)` or `(published_post_id, metric_time)`.
  - Keep `id` out of any future reference that lacks `metric_time`. Block 5 already refuses a foreign
    key, and PostgreSQL refuses one without a unique.

  Not blocking.

### F150-3 (INFO). 150's partition-readiness check reads constraints, not unique indexes

- **Where:** `150_performance_snapshots_key.sql`:103-113 (block 2).
- **What:** A bare `create unique index … (id)` passes 150's block (X5). It would make a later
  `partition by range (metric_time)` fail exactly as the old key would have. Today the pinned shape
  probe (rule 18) refuses it, so the property rests on the pin.
- **Remedy:** In a forward fix, block 2 also reads `pg_index` where `indisunique` and the index's keys
  do not contain `metric_time`.

### F150-4 (INFO). Rule 17's "exactly the 71 column reads" is true of table privileges; views and SET ROLE are other probes'

- **Where:**
  - `scripts/db/run.mjs`:1423-1442 (comment) and :2166-2167 (the probe's claim).
  - `db/foundation/README.md`:602-623.
- **What:** Measured, rule 17 is silent on two routes:
  - **A definer view** over `jobs.input_ref` granted to authenticated (X2). The client privilege
    probe, pinned grant probe and read allowlist probe refuse it.
  - **A role reachable by SET ROLE** that holds `jobs.input_ref` (X3; the client roles are NOINHERIT).
    The client membership probe and pinned grant probe refuse it.

  In both, rls-smoke stays 0. A SECURITY DEFINER function, or a trigger that copies a withheld value
  into a pinned column, is outside every grant probe.
- **Remedy:** One sentence in rule 17's README text and comment naming the probes that hold the rest
  of the boundary, so no reader takes the claim alone as the whole boundary. Not blocking.

### F150-5 (INFO). The workspace list's user literal is not the session subject

- **Where:** `scripts/db/explain-harness.mjs`:78-85.
- **What:** The query is RLS-safe (W1). With a co-member's id as the literal it lists that co-member's
  workspaces that the caller can also see, so the result follows the literal and not only the caller.
  The comment's reason, that a client cannot call `app.jwt_subject()` or `auth.uid()`, holds on the
  shim (W2). On the platform, `auth.uid()` is callable by `authenticated`.
- **Remedy:** When the BFF exists, it binds `m.user_id` to the session subject (`(select auth.uid())`)
  and never to a client-supplied id. A line in the harness comment saying so would carry this to the
  BFF author.

### On SP-1..SP-3 (the Author's findings, owed to A1)

My reading, recorded and not accepted as the role's signature:

- **SP-1 (LOW).** I agree, and with the grade. The plausibility bound (10^12) is what makes the
  payload a projection. Lowering that bound is the Owner's, as 121 records.
- **SP-2 (LOW).** I agree. A closed vocabulary is the remedy, and it needs Product's failure classes.
- **SP-3 (INFO).** I agree. It carries no provider text, and retry counts are the kind of
  bookkeeping a status page shows.

## 4. Claims checked

**True as measured or read:**

- Commit messages of `2318c72`, `4b252d4` and `c0fa18e`.
- The plan's §0.1 counts and digests: the suite stays 684, `npm run verify` passes, and the floor
  checks are part of `check`.
- §0.2 round 1 output, verbatim.
- §2: no foreign key, and nothing depends on the key index.
- §3 "after": cost 27.3, exit 0, and the two permission denials.
- §6 drift texts, read. D1 and D2 were not re-run; X4 and X5 exercise the same block.
- The disposition's §5: each row names an owner whose acceptance is owed.
- Blocker edits: append-only, and 12 entries changed, as the commit message counts them.
- The handoff's `head_revision_or_patch_checksum` is `4b252d4`, and the guard holds on the name.

**One false sentence:** F150-1, in `safe-projections.json`'s review text.

**One wording to read with care:** The handoff's "Rule 17 now refuses MORE" is true of the twelve
open tables. On the four classed tables it refuses the same as before today, and it is looser by
design: a column read becomes admissible by a pin. That is the Owner's Q170-d answer. It is not a
defect, but from now on the projection file is a security-relevant input.

## 5. Stop-the-line verdict

**No stop-the-line.** I measured:

- no secret exposure
- no tenant leakage (W1; rls-smoke 1079 on r1)
- no client reach that changed (the projection pins what the migrations grant; X1 shows it refuses
  more)
- no migration divergence (150 is declared not applied; the instance tail is contiguous)
- no irreversible change: the table holds no row on any instance, and the plan states the forward fix

**Does anything block the merge?** No finding of mine does. F150-1 is LOW and owed to its owners. It
should be corrected in the projection file's text, or carried as SP-4 on `open_blockers[193]`, before
anyone reads that file as a completed §9.1 review. F150-2..5 are INFO.

The merge remains gated by what this file cannot supply:

- C0's and Q0's reports
- the Integration Owner's evidence (`open_blockers[188]`)
- a green required check on the head
- RFC-2026-002's rule, recorded by the disposition as not met literally when A0 presses the merge

## 6. Limits

- One host, PostgreSQL 17.11, the shim and not the platform. Platform roles, `auth.uid()` reach,
  Data API and Realtime were not measured (Q170-c is owed to A0).
- I ran the harness at scale 0.2 only, once, as EXPLAIN without ANALYZE. I did not re-measure the
  PROPOSED p95 values (plan §5). They are not security claims.
- Drifts were appended to `140_audit.sql`, which runs before 150. A later migration that undoes 150's
  key (after 150) was not exercisable that way. That case is held by the post-migrate re-run of 150's
  block and by rule 18, which I read and did not drift.
- I did not read every one of the 71 pinned columns' constraints. I read the PROVIDER-3-adjacent ones
  (`metrics`, `failure_class`, `attempt_count`, `idempotency_key`, `deep_link_target_ref`,
  `message_key`, and the withheld `external_post_hash` and `provider_request_key`).
- Same vendor and model family as the Author (§0).
