# A1 Security/Privacy review — batch 120 (`120_publisher.sql`) and its closure `122_publisher_service_path_closed.sql`, PR #151, not merged

Run: `/claude/a1_bastion`.
Role: independent Security/Privacy reviewer for batch 120.
Subject: `agent/claude/WP-0A-DB-00-batch-120`, head `bd732a0`, checked out into the worktree this run
was given and verified with `git log --oneline -3` (`bd732a0`, `058548f`, `fbd4c3a`).
Base: `fd666e0` (merge of PR #150), which is `main`.
Date: 2026-09-15.

**This document records findings. It advances no package status, signs nothing on any author's
behalf, writes `security_approved` nowhere, and repairs nothing it found.** This file is the only
file this run changes.

---

## 0. Disclosure — what I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`.** I run in a git worktree A0 created,
under a brief A0 wrote. A0 chose my subject, my base, my five priorities and the order they are in.
I did not choose my own scope, and I did not pick the questions I pressed hardest on.

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is
approved and withdrew the cross-vendor condition. What remains is `CONTRIBUTING_AGENTS.md`'s
separation of duties — four distinct `agent_run_id` values, and no run approving, test-verifying,
integrating or gate-approving its own work. A distinct same-vendor run in a named role IS that
role's signature. So this file is a signature; it is the weakest form of one the protocol permits,
and I say so rather than let the header imply otherwise. A0 may not count it as A0's own approval of
anything.

A0 wrote batch 120. That means the run that framed my review is the run whose work I am reviewing.
What that does not weaken: every claim in §§2–6 that could be executed WAS executed, against a
database I built, and each carries the command or the `file:line` so a reader can re-run it. A shared
model does not change which SQLSTATE `ri_triggers.c` raises. What it does weaken: framing, and shared
blind spots. §7 lists what I did not review; it cannot list what neither of us thought of.

### What I could not verify, and why

1. **The source documents.** I did not open `docs/**`. Every citation in this batch to §4.8, §8.3,
   §8.4, §8.5, §9.1, §9.2, §9.3, §10, §11.1, §11.4, the technical architecture, ADR-010, CTR-PUB-001,
   ID-001, ID-004 or META-017 is taken from the batch's own quotation of it. I checked the batch
   against `evidence/WP-0A-DB-00/product-owner-disposition-2026-09-15-batch-120.md` and
   `a0-batch-120-plan-2026-09-15.md` AS THEY STAND IN THIS TREE; I did not verify that those files
   transcribe what the Owner actually said. The Owner's answers are not mine to re-open in any case.
2. **The service identity.** Everything I measured about `app_worker` was measured with `set role
   app_worker` from a superuser session — the suite's own method. RFC-2026-022 §5/8 records that the
   only member of `app_worker` today is `postgres`, which bypasses RLS. So no measurement here is a
   proof about a connection the service will one day actually make, and I make no such claim.
3. **CI.** I did not run CI and did not run the per-family negative-control step (it disables row
   level security one table at a time inside a GitHub Actions job). I checked the five patterns'
   disjointness statically against the case-id list, not by executing the control. The counts the
   work package quotes (14 of 14, 7 of 7, 4 of 4, 6 of 6, 5 of 5) are A0's and are not mine to quote
   as measured.
4. **Batches that do not exist.** 121 (metrics) and 091 (schedules) are named by this batch and are
   not in the tree. I could not review what they will do to this family.
5. **RFC-2026-022 §3's own classification.** I verified that the three map rows QUOTE §3's verdict
   and that no comment, case, fixture or assertion in batch 120 or 122 cites the confinement term at
   all (grep over both migrations, `isolation-cases.mjs` and the fixture: the only hit in the whole
   tree is a batch 061 case narrative). I did not review whether §3's verdict is itself right.
6. **A second same-vendor reviewer's findings.** I was told another run has reported on this head. I
   did not read it. Anything below that duplicates it duplicates it independently.

---

## 1. Verdict

**Nothing here is stop-the-line.** I found no cross-tenant read or write that a policy admits, no
secret or provider identifier reachable by a client, and no service grant that is not bounded by the
cell §8.3 names. Five findings, none HIGH: one MEDIUM and four LOW.

The headline: **`app.publish_targets.failure_class` is the only PROVIDER-3-classified column in this
batch that a client can read, and it is the only text column in the batch with neither a length bound
nor a vocabulary — so §9.2's "a code, never a provider's message or stack trace" is a comment on the
column rather than a control over it, and it is the one path by which the raw external identifier
this batch deliberately defers could still arrive in `app` and be read by every active member.**

---

## 2. What I ran

PostgreSQL 17.11 (Homebrew), `/opt/homebrew/opt/postgresql@17/bin`. A cluster of my own: `initdb
--locale=C`, TCP on **127.0.0.1:5501**, `unix_socket_directories=''`, `LC_ALL=C` in the environment.
**The user's own server on `/tmp:5432` was not touched** — every client in this review names
`-h 127.0.0.1 -p 5501` or `DB_TEST_URL=postgresql://postgres@127.0.0.1:5501/thinkbizthai_test`.
Node `v24.20.0`. `make` was not used.

```
psql -f db/foundation/ci/supabase-shim.sql
DB_TEST_URL=… LC_ALL=C TZ=UTC PGTZ=UTC node scripts/db/run.mjs migrate-clean   → ok in 978ms
DB_TEST_URL=… LC_ALL=C TZ=UTC PGTZ=UTC node scripts/db/run.mjs schema-lint     → ok in 30ms
DB_TEST_URL=… LC_ALL=C TZ=UTC PGTZ=UTC node scripts/db/run.mjs rls-smoke       → ok in 1028ms
                                                     941 isolation case(s) passed
                                                     db-authz-proofs: ok — 6 claim(s) discharged
```

`migrate-clean` applied 37 migrations including `120_publisher.sql` and
`122_publisher_service_path_closed.sql`, so **both apply-time `do $$` blocks ran and passed** —
including 120's fifteen assertions and its four CHECK probes, and 122's four claims.

On top of that I ran eight probe scripts of my own against the loaded fixtures. They are the basis
for everything in §§3–6 and are quoted inline. They are not in the tree: this run writes one file.

---

## 3. Priority 1 — tenant isolation on the five-table chain

### 3.1 What every identity sees (measured)

Ten `set_config('request.jwt.claims', …); set local role authenticated` sessions, counting rows on
all five tables. Fixture: two Workspaces, two Businesses in A, one Page-scoped member.

| identity | intents | targets | pins | jobs | posts | verdict |
|---|---|---|---|---|---|---|
| `owner_a` (no scope row) | 4 | 4 | 1 | 3 | 2 | both Businesses of A, no B |
| `owner_b` | 1 | 1 | 1 | 1 | 1 | `workspace_id` is B on every row |
| `editor_a` (scoped `business_a1`) | 3 | 3 | 1 | 2 | 1 | `business_profile_id` is `a1` on every row; zero under `a2` |
| `page_editor_a` (scoped `page_a1`) | 2 | 2 | 1 | 2 | 1 | the `page_a1` item and the business-level item only; nothing under `page_a1_sibling`, nothing under `a2` |
| `suspended_a` | 0 | 0 | 0 | 0 | 0 | — |
| `anon` | `permission denied for schema app` | | | | | |
| `app_worker` | 0 | 0 | 0 | 0 | 0 | grants held, RLS refuses |
| `app_command`, `app_maintenance` | `permission denied for schema app` | | | | | |

**The chain closes in the read direction on all five tables, for every identity in the fixture.**

### 3.2 Can the two-step `exists()` be defeated? — I tried to write the row

Eleven write attempts. Every one was refused, and the refusal is named:

| # | attempt | outcome |
|---|---|---|
| C1b | `owner_a` inserts an intent with A's scope columns and **workspace B's content item** | `ERROR: new row violates row-level security policy "publish_intents_scope_narrowing"` |
| C2 | `owner_a` inserts an intent with `requested_by = owner_b` | `ERROR: … "publish_intents_requester_is_caller"` |
| E7 | `admin_a` updates with `updated_by = owner_a` | refused by RLS |
| E5 | `admin_a` pins **another item's version** to an intent | `ERROR: … foreign key constraint "publish_intents_pinned_version_fk"` |
| D3 | a `publish_target` naming **an intent of workspace B** with A's scope columns | `… "publish_targets_intent_scope_fk"` |
| D1 | a `publish_target` naming **an aim of workspace B** | `… "publish_targets_content_target_fk"` |
| D2 | a `publish_target` naming **a social account of workspace B** | `… "publish_targets_content_target_fk"` (the four-column key answers first) |
| F1 | a `publish_job` on **workspace B's target** with A's scope columns | `… "publish_jobs_target_scope_fk"` |
| F2 | a `published_post` on **workspace B's target** with A's scope columns | `… "published_posts_target_scope_fk"` |
| F3 | a `published_post` whose **`social_account_id` is not its target's** | `… "published_posts_target_destination_fk"` |
| E10/D5 | a pin naming **workspace B's target**, and a pin of **workspace B's asset version** | `… "publish_target_assets_target_scope_fk"` / `… "_asset_version_scope_fk"` |

The three attacks the brief named specifically — **a row whose intent is in another Business**, **a
`content_target_id` whose aim belongs to another tenant**, **a post whose `social_account_id` is not
its send's** — are D3/D1 and F3, and all three are refused by a key at the database. The forward key
this batch adds to batch 081's table is what makes D1 and D2 fail; without it the pair (aim, account)
would not be held.

Idempotency and duplicate-side-effect keys, also measured: a second post on one target → `23505
published_posts_one_per_target`; a second job on one target → `23505 publish_jobs_one_per_target`; a
`provider_request_key` reused inside one workspace → `23505
publish_jobs_provider_request_key_unique`. The same key in a **different** workspace is accepted,
which is the documented and correct scope — a global key would be a cross-tenant oracle (batch 050's
reason, applied here).

### 3.3 The Q0-081 F2 question: is any predicate unfalsifiable? — see **F3**

**Measured, and the answer is split.** The `case … member_scope_admits_business /
member_scope_admits_page` term IS falsifiable in the `with check` half of
`publish_intents_scope_narrowing`: `admin_a` is scoped to `business_a1` (measured from
`app.workspace_member_scopes`), and its INSERT of an intent under `business_a2` is refused **by name**
by that policy (probe E1). That is the term doing work, on the one table a client can write.

On the read path it is not. The subqueries run as the caller, so `app.publish_intents`' own policies
answer first — which the header states. I measured the consequence, which the header does not state:

```
page_editor_a:  targets the narrowing admits = 2 ;  targets whose intent row is visible at all = 2
admin_a:        targets the narrowing admits = 3 ;  targets whose intent row is visible at all = 3
page_editor_a:  jobs the narrowing admits    = 2 ;  jobs whose target row is visible at all    = 2
```

The child's scope term cannot be the deciding term for a SELECT, because it re-asks exactly the
question the parent's own narrowing already asked about the same `content_items` row. And on the four
child tables the `with check` half is unreachable by any client at all, because no client holds
INSERT or UPDATE there (§4). So on `publish_targets`, `publish_target_assets`, `publish_jobs` and
`published_posts` the term is defence in depth and nothing else. That is not a defect — it is a
correct belt-and-braces — but the batch should say so where it is true. See **F3**.

---

## 4. Priority 2 — the service path

### 4.1 The live ACL, asked of every role (probe A2, `has_column_privilege` per column)

`app_worker` holds, and holds nothing else:

| table | SELECT | INSERT | UPDATE |
|---|---|---|---|
| `publish_intents` | all 13 columns | — | — |
| `publish_targets` | all 14 | `id, workspace_id, business_profile_id, publish_intent_id, content_target_id, social_account_id, content_variant_id, status` | `status, dispatched_at, completed_at, failed_at, failure_class, updated_at` (**six**) |
| `publish_target_assets` | all 9 | 8 (not `created_at`) | — |
| `publish_jobs` | all 12 | `id, …, kernel_job_id, provider_request_key, status` | `status, attempt_count, last_attempt_at, last_error_code, updated_at` (**five**) |
| `published_posts` | all 9 | 8 (not `created_at`) | — |

`anon`, `app_command`, `app_maintenance`, `app_authz` hold **nothing** on any of the five, and **no
role holds DELETE, TRUNCATE, REFERENCES or TRIGGER on any of the five** (probe A3 returned zero
rows). `published_posts` and `publish_target_assets` hold no UPDATE for anybody, so both are immutable
as the privilege system holds them and not only as a comment.

**Is the UPDATE list safe?** Yes, on the measurement that matters: `cancelled_at` is not in it, and
`app_worker` holds neither INSERT nor UPDATE on `app.publish_intents` at all (probe F7:
`permission denied for table publish_intents` on both verbs). The worker cannot cancel a tenant's
publishing, and `cancelled` is not in `publish_targets_status_known` — probe 15 of 120's own apply
block inserts `'cancelled'` and demands `23514 publish_targets_status_known`, and that block ran and
passed in my run. 070's reason for withholding `cancel_requested_at` is honoured, live.

**Can the worker reach a tenant it was not given?** Not today, and not for a reason this batch
invented: it is refused by row level security on all five tables (probe F6: `UPDATE 0` on both
mutable tables, and an INSERT refused with `new row violates row-level security policy for table
"publish_targets"` — the policy layer, not the grant layer, which is exactly what 010's shape is for
and what makes the CI negative control meaningful). I could not test a real service connection (§0.2).

**Can it do anything §8.3's cell does not name?** Yes — the six-column and five-column UPDATEs. §8.3's
`S` is INSERT. That is a decision, not a matrix cell, and the batch says so in three places (header,
map note, work package) and attributes it to the Owner's question 10 and to 070's precedent. It is
bounded: I confirmed against the live ACL that no identity, scope, aim, account, pin or key column is
updatable by any of the six roles (120's probe 7 asserts it; my probe A2 reproduces it column by
column). I record it as implemented faithfully rather than as a finding.

### 4.2 S8, and what 122 actually closes (probe A4, `pg_policy` live)

Sixteen policies on the five tables. Seven on `publish_intents`, two each on the rest, plus 122's two
closures. Every policy batch 120 writes is `TO authenticated` alone; both of 122's are restrictive,
`FOR ALL`, `TO PUBLIC` (`polroles = {0}`), both halves present and identical, both reading
`current_user = 'authenticated'` — 082's shape, column for column.

**122 closes the two tables it claims to and no others**: `publish_intents` (Service column is `P`,
not `S`) and `publish_target_assets` (no §8 row at all). `publish_targets`, `publish_jobs` and
`published_posts` stay open **by name**, because they are the `S` cell and a closure would have to be
amended before RFC-2026-022 §7's CARRIED policy could land beside them.

**Do the five narrowings bind a future `app_command`?** No, and that is the S8 shape, deliberately
left on three tables. Today no permissive policy admits any role but `authenticated` anywhere in the
family, so no role is admitted-and-unbound — 122's assertion 2 checks exactly this on the two closed
tables and passed in my run. On the three open ones the property holds today by the absence of a
permissive policy, not by a restrictive one. That is the known cost of keeping them open and the
batch states it. I reproduce it as measured rather than raise it: the hazard arrives with the batch
that writes the CARRIED policy, and that batch owes the closure in the same file.

---

## 5. Priority 3 — what leaves the database (§9.1 / §9.2)

### 5.1 Per column, against the LIVE ACL and not against the grant lines (probe A1)

| column | `authenticated` SELECT | `anon` SELECT |
|---|---|---|
| `published_posts.external_post_hash` | **f** | **f** |
| `publish_jobs.provider_request_key` | **f** | **f** |
| `publish_jobs.last_error_code` | **f** | **f** |
| `publish_jobs.kernel_job_id` | **f** | **f** |

All four are held by `app_worker` and `postgres` only. Reproduced from the client side: as `owner_a`,
`select external_post_hash from app.published_posts` → `permission denied for table published_posts`;
`select provider_request_key, last_error_code, kernel_job_id from app.publish_jobs` → `permission
denied for table publish_jobs`. **§9.1's withholding is real, per column, live.**

`external_post_hash` is `bytea not null` with `octet_length = 32` as an equality; the raw identifier
is in no column of the batch, and `identity-isolation.test.mjs:11309` refuses a column NAMED
`external_post_id`, `permalink`, `post_url`, `provider_response`, `raw_response`, `payload`,
`access_token` or `refresh_token` in any of the five table bodies.

### 5.2 Is `failure_class` safely a code? — **no. This is F1.**

Every text column in the batch carries either a length bound or a vocabulary — except two:

```
publish_intents_idempotency_key_bounded    length between 1 and 128
publish_jobs_provider_request_key_bounded  length between 1 and 128
publish_intents_request_kind_known         in ('now','scheduled')
publish_targets_status_known               in ('pending','publishing','published','failed','skipped')
publish_jobs_status_known                  in ('queued','running','succeeded','failed')
publish_target_assets_role_known           in ('cover','feed','story','reel','carousel_item','thumbnail')
published_posts_platform_known             in ('facebook','instagram')

publish_targets_failure_class_not_blank    length(btrim(failure_class)) > 0        ← no bound, no vocabulary
publish_jobs_last_error_code_not_blank     length(btrim(last_error_code)) > 0      ← no bound, no vocabulary
```

`failure_class` is the one of the two that `authenticated` **can read** — deliberately, so partial
success can be shown (§8.4/DB-10, and I agree with the grant). It is classified PROVIDER-3 in the
column comment (`120_publisher.sql:396`), in the table comment and in the plan (`a0-batch-120-plan…:146`),
each saying "a code, never a provider's message, payload or stack trace (§9.2)". **Nothing in the
database holds it to that.** The column takes an unbounded string, and `app_worker` holds UPDATE on it.

This is where F1 meets priority 4. The static guard is a guard over column NAMES; it cannot refuse a
raw provider identifier written into a column that legitimately exists. A provider's rejection message
routinely embeds the object id it rejected. So the batch's claim that the raw identifier "is stored
NOWHERE in this schema" is true of the columns the batch declares and is **not a property the schema
enforces** — and the column where it would land is the one every active member of the Workspace reads.

The repository has both precedents and chose the weaker one. 050's `jobs.last_error_code` is
not-blank-only (`050_async_kernel.sql:521`) and is not client-readable; 131 bounds its client-facing
`failure_code` at `between 1 and 128` (`131_billing_projection.sql:918`) and does the same for two
error codes; 140 holds `reason_key` to a REGEX, `^audit\.[a-z0-9_.]+$` with `length <= 96`
(`140_audit.sql:460`). No question put to the Owner covers this column's shape — question 5a is the
`status` vocabulary, and `failure_class` is not in the fourteen.

**Why it is not stop-the-line:** nothing writes the column today but the fixture, whose value is
`media_rejected`; `app_worker` cannot reach a row (RLS refuses it); and no provider integration exists
at this gate. It is a control that is missing before the caller arrives, not a leak that exists.

### 5.3 Does anything in the fixture, the cases or the comments carry a value §9.2 prohibits? — no

`tests/db/identity/fixtures/120-publisher-fixture.sql`, scanned for provider identifiers, permalinks,
URLs, tokens, secrets and digests:

- `external_post_hash` is `sha256(convert_to('published_post_a1_fb','utf8'))` and two siblings — a
  digest over a string this repository owns. No raw identifier anywhere.
- `provider_request_key` values are `fixture:publish:a1-fb` and three siblings.
- `last_error_code` is `media_rejected`; `failure_class` values are codes.
- `kernel_job_id` is NULL on every row, with the reason stated.
- No URL, no `facebook.com`/`instagram.com`, no token, no password, no PII beyond the synthetic
  fixture user uuids the whole suite uses.

---

## 6. Priorities 4 and 5

### 6.1 The deferred debt — honest in two places, missing from the third (**F2**)

The batch defers 110's debt and **states the consequence** rather than leaving it: "until the
identifiers have a home, no worker can address a Page at the provider and no `app.published_posts` row
can be produced by anything but a fixture" (header). `db/foundation/README.md` gains the same in
writing. The static test's failure message says the batch "DEFERS it in writing, with the consequence
stated". I checked the consequence is true, not rhetorical: `app_worker` cannot compose the fan-out
statement at all, because batches 080 and 081 grant it nothing on `content_variants` or
`content_targets` — the batch found this itself and recorded it as a blocker.

**Is there a path by which a raw identifier could still reach `app`?** One: `failure_class`, and
secondarily `last_error_code`. See F1. No column-shaped path exists.

What is missing: `120_publisher.sql` says "The debt stays open in the work package with this batch
named as the one that **met it and deferred it, in writing**." I diffed `open_blockers` between
`fd666e0` (164 entries) and `bd732a0` (173). **Nine entries were added; none is the deferral, and
blocker 5 — batch 110's entry, the canonical register of this debt — is unchanged, byte for byte.**
It already names batch 120 as owing the answer, so "named" is satisfied; "met it and deferred it" is
in the migration header and the README and is **not** in the register a reader of open security debt
consults. **F2.**

### 6.2 The forward key on a merged table — an addition, not a rewrite (clean)

`content_targets_destination_key unique (workspace_id, business_profile_id, id, social_account_id)`.

- **It is an addition.** No statement in batch 120 alters, drops or rewrites anything in
  `081_content_targets.sql`. The migration file is untouched (`git diff --stat` lists it not at all).
  Migration invariant 1 holds.
- **It cannot reject a row.** `id` is `content_targets`' primary key, so the tuple is unique by
  construction; the key adds an index and no new refusal. Measured: `pg_get_constraintdef` shows the
  four columns, all four `attnotnull = t`, and `migrate-clean` applied the full set with 081's fixture
  loading unchanged.
- **It contradicts nothing batch 081 asserted at apply time.** 081's block raises on "batch 081 wrote
  a **foreign key** on social_account_id" (`081_content_targets.sql:415`). This is a UNIQUE
  constraint, which is not a foreign key — and the whole set applied clean, which is the direct proof.
- Because all four columns of `publish_targets_content_target_fk` are NOT NULL, MATCH SIMPLE's
  any-NULL escape cannot arise. Probe D1/D2 confirm the key refuses.
- The six fixture id changes are in `tests/db/identity/fixtures/081-content-targets-fixture.sql` only,
  are additions of an explicit `id` where the column defaulted, and change nothing addressed by
  natural key. 941 isolation cases pass.

### 6.3 Other measurements worth recording (all clean)

- **The suspended path is closed by the helper, not only by the narrowing.** `publish_intents_update_owner_admin`'s
  `using` clause is role-only, which looked like a gap until measured: `app.workspace_member_role` is
  `SECURITY DEFINER … and m.status = 'active'` (`pg_get_functiondef`), so a suspended owner would get
  NULL. The suspended fixture member's UPDATE → `UPDATE 0`.
- **The editor refusal (question 2) is implemented.** `editor_a` inserting a well-formed intent in its
  own scope → `ERROR: new row violates row-level security policy for table "publish_intents"`.
- **Column immutability §8.5 asks for is held by the ACL**, not by a policy: `owner_a` re-pinning
  (`set content_version_id`) and re-homing (`set workspace_id`) both → `permission denied for table
  publish_intents`.
- **Cross-tenant cancellation** → `UPDATE 0` (owner_a on B's intent; admin_a on the `a2` intent it
  cannot see).
- **The CI negative control's five patterns are pairwise disjoint** over the 941 case ids, checked
  statically: `publish-intent` 30, `publish-target` 16, `publish-pin` 8, `publish-job` 14,
  `published-post` 14, with no id matching two patterns. Choosing `publish-pin` over
  `publish-target-asset` is what makes that true and the workflow comment says so.

---

## 7. Findings

Severity is mine. "Stop-the-line" means the merge must not proceed. **None of these is
stop-the-line.**

### F1 — MEDIUM, not stop-the-line — `failure_class` is a PROVIDER-3 column inside the client SELECT with no control holding it to a code

- **Where:** `db/foundation/migrations/120_publisher.sql:331` (the column), `:336-337` (the only
  CHECK), `:396` (the comment that claims the rule), `:613-620` (the client SELECT grant), `:627`
  (the worker UPDATE grant). Secondarily `:472` (`publish_jobs.last_error_code`, same shape, not
  client-readable).
- **Measured:** `pg_get_constraintdef` over every CHECK on the three mutable tables. `failure_class`
  and `last_error_code` are the only two text columns in the batch with neither a length bound nor a
  vocabulary; the other seven carry one or the other. `has_column_privilege('authenticated', …,
  'failure_class', 'SELECT')` → **t**; `app_worker` holds UPDATE on it.
- **Why it matters:** §9.2's "never a provider's message, payload or stack trace" is asserted in a
  comment and in the plan and enforced nowhere. The static guard at
  `tests/db/identity/identity-isolation.test.mjs:11309` refuses a column NAMED for a raw identifier
  and cannot refuse one written into a column that legitimately exists. This is the single path by
  which the raw external identifier this batch defers (§6.1) could reach `app` and be read by every
  active member of the Workspace.
- **Recommend:** bound both columns at `between 1 and 128` (131's shape,
  `131_billing_projection.sql:918`, already this repository's precedent for a client-facing failure
  code), and hold `failure_class` to a code shape with a named CHECK — either a vocabulary the Owner
  gives, as for `status`, or a regex in 140's shape (`140_audit.sql:460`). Add an apply-time
  assertion in 120's own block and one isolation case. Whether the vocabulary is the Owner's to give
  is a question the fourteen did not ask; if it is, it should be asked before the caller exists
  rather than after.

### F2 — LOW, not stop-the-line — the deferral the migration says is recorded in the work package is not in the work package

- **Where:** `db/foundation/migrations/120_publisher.sql` header ("The debt stays open in the work
  package with this batch named as the one that met it and deferred it, in writing") vs
  `work-packages/WP-0A-DB-00.json`, `open_blockers[5]`.
- **Measured:** `open_blockers` went from 164 entries at `fd666e0` to 173 at `bd732a0`; the nine added
  entries are listed in §6.1's diff and none is the deferral; entry 5 is unchanged.
- **Why it matters:** the migration header and `db/foundation/README.md` DO carry the deferral, so
  the debt is honestly recorded — but the work package is the register a reader consults for open
  security debt, and from it alone one cannot learn that the batch it names as owing the answer has
  met the question and declined it. The sentence in the migration is, narrowly, not true of the file
  it names.
- **Recommend:** amend `open_blockers[5]` with a `CLOSED`-style prefix sentence in this package's own
  convention — "MET AND DEFERRED BY BATCH 120 on 2026-09-15 …, consequence stated in
  `120_publisher.sql` and `db/foundation/README.md`; still owed to the batch that brings the typed
  service" — or soften the migration header to cite the README. Either is a one-line change; the
  first is better, because it puts the state where a register reader looks.

### F3 — LOW, not stop-the-line — the child narrowings' scope term cannot decide a read, and the batch does not say so where it is true

- **Where:** `120_publisher.sql` policies `publish_targets_scope_narrowing`,
  `publish_target_assets_scope_narrowing`, `publish_jobs_scope_narrowing`,
  `published_posts_scope_narrowing`; the workflow comment in `.github/workflows/ci.yml` added by this
  batch ("the ones that fail if a child's two-step `exists()` is flattened to one").
- **Measured:** §3.3's three pairs — narrowing-admitted rows equal parent-visible rows for
  `page_editor_a` (targets 2 = 2, jobs 2 = 2) and `admin_a` (targets 3 = 3). Contrast: the same term
  IS falsifiable on `publish_intents`' `with check` half (probe E1, refused by name).
- **Why it matters:** the header says the parent's policy answers first (081's measured note) but not
  the consequence, and the CI comment's sentence is true of the CHAIN and not of the scope term. A
  later reader could take a green case as evidence that the child's scope test works and remove the
  parent's narrowing, or weaken it, without a case turning red. This is a claim-precision finding, not
  a hole: the property being relied on — a child is reachable only through a visible parent — is real
  and is what my measurements confirm.
- **Recommend:** keep the term (it is correct defence in depth, and it is load-bearing in the `with
  check` half the day a client gains a write on a child). Add one sentence to the header and one to
  the CI comment saying which half of each narrowing is load-bearing today and which is not. No schema
  change.

### F4 — LOW, not stop-the-line — two of the four withheld PROVIDER-3 columns have no isolation case of their own

- **Where:** `tests/db/identity/isolation-cases.mjs`. Present:
  `owner-a-cannot-read-a-publish-jobs-provider-key`,
  `owner-a-cannot-read-a-published-posts-external-hash`. Absent: any case for
  `publish_jobs.last_error_code` or `publish_jobs.kernel_job_id`.
- **Measured:** both are withheld live (probe A1: `has_column_privilege` false for `authenticated`
  and `anon`), and 120's apply-time probe 11 asserts all four. So the property holds; only the case
  is missing.
- **Why it matters:** the apply-time block is the whole of the running evidence for those two, and it
  runs once per `migrate-clean` rather than per identity. A grant made by a later batch would be
  caught by probe 11 only when 120 is re-applied against a clean database, which is what CI does —
  so the exposure is small, but the two columns are not symmetric with the two that do have cases.
- **Recommend:** two cases in the shape of the two that exist, or one sentence in the batch's own
  test file saying the apply-time probe is deliberately the whole of the evidence for those two.

### F5 — LOW, not stop-the-line, and not a security finding — `publish_targets_failure_is_dated` holds one direction only

- **Where:** `120_publisher.sql:339-340`.
- **Measured:** `CHECK ((failure_class IS NULL) OR (failed_at IS NOT NULL))`. So a failure class
  implies a failure time; `status = 'failed'` implies neither, and `status = 'published'` with a
  `failure_class` set is accepted.
- **Why it matters:** DB-10's acceptance requires partial success to be SHOWN, and a client rendering
  it cannot rely on the triple being coherent. No tenant or disclosure consequence.
- **Recommend:** record it as a reading, or extend the CHECK so `status = 'failed'` implies
  `failed_at is not null`. Lowest priority of the five; I raise it because I was asked to say what I
  measured, and I measured it.

---

## 8. What I did not review

The source documents (§0.1). `docs/**`, which is read-only to this package. RFC-2026-022 §3's own
classification, as opposed to whether the map quotes it. Batches 121 and 091, which do not exist.
Performance, index selectivity, and the retention path (batch 160). The Owner's fourteen answers as
answers — I checked implementation fidelity only, which is what the brief assigns me. The CI
workflow's behaviour when executed (§0.3). The other reviewer's findings on this head (§0.6). And
whatever neither A0 nor I thought to ask, which §0 explains I am the least likely reader to catch.

---

## 9. Signature

Reviewed `bd732a0` on `agent/claude/WP-0A-DB-00-batch-120` as it stands, against a live PostgreSQL
17.11 on port 5501 that I built for this review. **Five findings: 0 HIGH, 1 MEDIUM, 4 LOW. None is
stop-the-line. I found no cross-tenant read or write that a policy admits, no secret or provider
identifier reachable by a client, and no service grant that is not bounded by the cell §8.3 names.**

This is the Security/Privacy role's signature for batch 120 under RFC-2026-024, from a distinct
same-vendor run spawned by the Author. It approves nothing else, and it is subject to §0 in full.

— `/claude/a1_bastion`, 2026-09-15.
