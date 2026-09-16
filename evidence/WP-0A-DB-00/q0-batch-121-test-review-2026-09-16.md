# Q0 independent test — batch 121 (`publisher.meta`, metric snapshots), PR #153

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`; this is a distinct run of it.
Subject: branch `agent/claude/WP-0A-DB-00-batch-121`, head `426c294`, base `0f3a08b` (`main`).
Date: 2026-09-16.

**This document RECORDS TEST RESULTS.** It advances no package status, writes `test_verified`
nowhere, signs nothing on any author's behalf, and repairs nothing it found. Every defect named
below is left standing on the batch branch. I edited no migration, no case and no fixture except
transiently inside my own mutation harness, and the worktree is back at `426c294` with a clean
`git status`.

---

## 0. What I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`**, in a git worktree A0 created,
under a brief A0 wrote. I did not choose my own scope. A0 chose the branch under review, the
PostgreSQL port, the cluster recipe, the output filename, and — this matters most — the list of
mutation classes I was told to cover "at minimum". The batch under test was authored by A0 for
this package.

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is
approved and withdrew the cross-vendor condition. What remains is CONTRIBUTING_AGENTS.md's
separation of duties — four distinct `agent_run_id`s, and no run approving, test-verifying,
integrating or gate-approving its own work. A distinct same-vendor run in a named role IS that
role's signature. I record that as the rule I was run under; whether this file is *accepted* as
the Tester signature is the Integration Owner's and the Product Owner's act, not mine.

### What I measured, and what I did not

**Measured, live, on my own scratch cluster:** the full migration set applied from empty; the
apply-time `do $$` block inside `121_publisher_metrics.sql`; the 965 isolation cases; the static
suite (`npm run verify`, 663 tests); the per-family negative control for
`app.performance_snapshots` and for `app.research_snapshots`, reproduced by hand; and fifty
distinct mutations across fifty-eight runs.

**Not measured:**

- **I could not verify my own framing, and this qualifies everything else.** A0 named the
  mutation classes. Of the five survivors I found, **three (M17, M45 and D01h) are the same
  control seen from three angles, and one of those angles — drift introduced by a LATER migration
  — is a class A0's list did not name.** I added it because "what could a later developer break"
  is the question the brief asks, and editing 121's own file is not what a later developer does.
  A shared model is a shared blind spot; this section cannot list what neither of us thought of.
- **I could not verify CI.** I reproduced the `control` shell function's behaviour by hand
  against my own cluster. I did not observe a GitHub Actions run. `.github/workflows/ci.yml` is
  the Integration Owner's file; I executed nothing on GitHub and changed nothing there.
- **I did not verify the Thai source documents.** Every `§` reference in the migration's comments,
  in the cases' `why` fields and in `service-policy-map.json` is taken on trust. I tested whether
  the batch does what it *says*, never whether what it says is what §4.8, §8.3 or §10 say.
- **I could not falsify the Owner's disposition.** The thirteen answers of 2026-09-16 are not
  mine to reopen. I tested implementation fidelity only.
- **I tested nothing against a real provider.** Every claim about a "provider sentence" is a claim
  about what this schema will *store and serve*, never about what Meta returns.
- **One run of my own harness was invalid and was redone.** Mid-sweep I broke my mutation script
  with a bad edit; mutation M03 ran against unmutated sources and reported a false survivor. I
  detected it from the traceback in its own log, fixed the script, and re-ran M03, which is
  caught. I report this because a harness that can silently report a false green is the same
  defect class this file is about. No other run was affected — M01 and M02 preceded the break and
  M04 onward used the fixed script.

---

## 1. How I measured

PostgreSQL 17.11 from `/opt/homebrew/opt/postgresql@17/bin`, my own scratch cluster under my
scratchpad, `initdb --locale=C`, TCP-only on `127.0.0.1:5503`, `unix_socket_directories=''`,
started with `LC_ALL=C`. **The user's server on 5432 was never contacted.** The cluster is
rebuilt from a pristine `initdb` image before every single run, because migration 001 creates a
cluster-wide role and a second `migrate-clean` on the same cluster fails 42710.

Per run, in this order:

```
psql -f db/foundation/ci/supabase-shim.sql          # before the migration set
npm run verify                                       # layer (a) — static suite
node scripts/db/run.mjs migrate-clean                # layer (b) — apply-time block
node scripts/db/run.mjs rls-smoke                    # layer (c) — 965 isolation cases
```

`make` was not used (Xcode licence). Baseline on `426c294`, reproduced from pristine before and
after the sweep:

| layer | result |
|---|---|
| (a) `npm run verify` | `clean: exit 0 — tests 663, pass 663, fail 0` |
| (b) `db-migrate-clean` | `ok in 1022ms`, incl. `batch 121: 5 payload probe(s) passed` |
| (c) `db-rls-smoke` | `965 isolation case(s) passed` |
| — | `db-schema-lint: ok` |

A mutation is a **survivor** when all three layers stay green. Grading is by what the survivor
would cost in production, not by how hard it was to find.

### A methodological correction I had to make mid-run, and why it matters

My first five drift mutations added a new migration file. **All five were "caught" at layer (a),
and all five failed the identical 17 tests regardless of what the SQL did** — the catch was the
"unregistered migration file" tripwire, not anything about the drift. That is a confounded
result and I discarded it. I re-ran all five by appending the statement to `140_audit.sql`, a
migration already registered everywhere and sorting after 121, which is what a later batch
actually looks like. Both sets are reported below (`D0n` confounded, `D0nh` honest) because
showing only the honest set would hide that I got it wrong first.

The same correction applies to the three CI mutations. `.github/workflows/ci.yml` is digest-pinned
in `test-kits/integrity-manifest.json`, so *any* edit trips the guard — whose own message calls it
"a tripwire, not a security boundary". I re-ran all three with
`scripts/regenerate-integrity-manifest.mjs` applied, which is what a developer editing that file
does. **They are still caught, semantically** (`M38r`, `M39r`, `M40r`).

---

## 2. Is the negative control honest? — BOTH HALVES VERIFIED, YES

Reproduced by hand: `alter table app.performance_snapshots disable row level security`, full
`rls-smoke`, then re-enable.

```
db-rls-smoke: FAILED — 7 of 965 case(s)

  editor-a-sees-zero-metric-snapshots-under-a2        1 row(s) were visible and none should have been.
  admin-a-sees-zero-metric-snapshots-under-a2         1 row(s) were visible and none should have been.
  owner-b-cannot-read-a-metric-snapshot-of-tenant-a   2 row(s) were visible and none should have been.
  owner-a-cannot-read-a-metric-snapshot-of-tenant-b   1 row(s) were visible and none should have been.
  suspended-a-sees-zero-metric-snapshot-rows          4 row(s) were visible and none should have been.
  service-sees-zero-metric-snapshot-rows              4 row(s) were visible and none should have been.
  service-cannot-record-a-metric-snapshot             1 row(s) came back. The operation was permitted.
```

- **Exactly seven, and exactly the seven the CI comment names** — including the per-case row
  counts (1, 1, 2, 1, 4, 4), which the comment states and which I did not take on trust.
- **`service-cannot-record-a-metric-snapshot` LANDS.** "The operation was permitted" is the write
  succeeding, which is the `S` cell's fourth statement behaving as the batch claims.
- **No other family's case failed.** All seven ids are batch 121's.

**Is the entry satisfiable by a regression elsewhere?** No, in both directions, checked two ways.

*Statically*, over all 965 case ids and all 54 control entries: no batch 121 id matches any other
entry's pattern, and no non-121 id matches `^[a-z0-9-]*metric-snapshot`. Against the one that
shares the word `snapshot`: no metric id matches `^[a-z0-9-]*research-snapshot` and no research id
matches the metric pattern.

*Live*, disabling row level security on `app.research_snapshots` instead:

```
db-rls-smoke: FAILED — 2 of 965 case(s)
  service-sees-zero-research-snapshots
  service-cannot-capture-a-research-snapshot
```

Two cases, both batch 070's, neither matching the metric pattern. The shared word is not
exploitable.

---

## 3. The probe counting — BOTH COUNTS OBJECT, YES

| | mutation | result |
|---|---|---|
| migration | M37 — delete the size probe (one of five) | **CAUGHT**, layer (b): `batch 121 ran 4 payload probe(s) in the migration and there are 5` |
| fixture | M36 — delete the cross-tenant scope probe (one of two) | **CAUGHT twice**: layer (a) — a static test asserts the fixture still names `performance_snapshots_post_scope_fk`; layer (c) — the fixture's own `probes_passed <> 2` |

Both claims hold. The fixture's probe set is defended twice over, which is stronger than the
migration's.

---

## 4. Every mutation I ran

Fifty distinct mutations, fifty-eight runs. `A` = static suite, `B` = apply-time block,
`C` = isolation cases. `SKIP` means the schema never built, so (c) could not run.

### 4.1 The five CHECK constraints — all caught by name

| # | mutation | A | B | C | first noticing layer, verbatim |
|---|---|---|---|---|---|
| M01 | drop `..._metrics_is_an_object` | G | **C** | skip | `a batch 121 shape constraint on the PROVIDER-3 payload is gone: performance_snapshots_metrics_is_an_object (P0001)` |
| M02 | drop `..._metrics_keys_are_known` | G | **C** | skip | same message, `..._metrics_keys_are_known` |
| M03 | drop `..._metrics_values_are_numbers` | G | **C** | skip | same message, `..._metrics_values_are_numbers` |
| M04 | drop `..._metrics_is_bounded` | G | **C** | skip | same message, `..._metrics_is_bounded` |
| M05 | drop `..._schema_version_is_positive` | G | **C** | skip | same message, `..._schema_version_is_positive` |

### 4.2 Keys, the forward key, and the composite FK

| # | mutation | A | B | C | first noticing layer |
|---|---|---|---|---|---|
| M06 | drop `performance_snapshots_one_per_post_instant` | G | **C** | skip | `a uniqueness rule batch 121 depends on is gone: performance_snapshots_one_per_post_instant (P0001)` |
| M07 | drop `published_posts_scope_unique` | G | **C** | skip | `constraint "published_posts_scope_unique" for table "published_posts" does not exist (42704)` — Postgres refused the DDL before 121's own guard could speak |
| M08 | drop the composite scope FK | G | G | **C** | fixture probe: `a metric snapshot naming workspace_b over a post of workspace_a was accepted` |
| M09 | replace it with a single-column FK on `published_post_id` | G | G | **C** | same fixture probe |
| M44 | unique loses `metric_time` | G | **C** | skip | `performance_snapshots_one_per_post_instant no longer carries metric_time (P0001)` |

M08 and M09 are the fixture probe earning its place: the apply-time block never notices, and the
composite FK is the only thing standing between a snapshot and a post of another tenant.

### 4.3 NOT NULL, one column at a time — all seven caught by name

M10 `workspace_id`, M11 `business_profile_id`, M12 `published_post_id`, M13 `metric_time`,
M14 `metrics`, M15 `metrics_schema_version`, M16 `collected_at`. Every one: A=green, **B=caught**,
`a batch 121 column that may not be null has lost NOT NULL: performance_snapshots.<column>
(P0001)`. (The brief's separate "make `collected_at` nullable" is M16.)

### 4.4 The payload shape's content — THE WEAK SPOT

| # | mutation | A | B | C | verdict |
|---|---|---|---|---|---|
| **M17** | **widen the key set by one (`followers`)** | G | G | G | **SURVIVOR** |
| **M45** | **narrow the key set by one (drop `saves`)** | G | G | G | **SURVIVOR** |
| M18 | flip `impressions` value check from `'number'` to `'string'` | G | **C** | skip | `violates foreign key constraint "performance_snapshots_post_scope_fk" (23503)` — caught, but **not by the probe that exists to catch it** |
| M19 | raise the bound 2048 → 1048576 | G | **C** | skip | same 23503 — again not by name |
| M20 | lower the bound 2048 → 0 | G | **C** | skip | `the wrong constraint refused the unknown-key probe: ... violates check constraint "performance_snapshots_metrics_is_bounded" (P0001)` — caught, correctly, by name |

### 4.5 Grants — all four caught by name

| # | mutation | A | B | C | first noticing layer |
|---|---|---|---|---|---|
| M21 | grant `authenticated` INSERT | G | **C** | skip | `authenticated holds INSERT on 6 column(s) of batch 121's table, and §8.3 marks every client column N (P0001)` |
| M22 | grant `app_worker` UPDATE | G | **C** | skip | `batch 121's table is append-only and a role holds a mutating column privilege: app_worker:metrics:UPDATE (P0001)` |
| M23 | grant `app_worker` DELETE | G | **C** | skip | `batch 121's table is append-only and a role holds a mutating privilege: app_worker:DELETE (P0001)` |
| M24 | grant `anon` SELECT | G | **C** | skip | `anon holds 1 column privilege(s) on batch 121's table (P0001)` |

### 4.6 Policies

| # | mutation | A | B | C | verdict / first noticing layer |
|---|---|---|---|---|---|
| M25 | drop the SELECT policy | **C** | C | skip | static: the migration must write two policies |
| M26 | drop the restrictive narrowing | **C** | C | skip | static: same assertion |
| **M27** | **SELECT policy `using` → `true`** | G | G | G | **SURVIVOR** |
| M28 | restrictive narrowing `using` → `true` | G | G | **C** | 2 cases: `editor-a-sees-zero-metric-snapshots-under-a2`, `admin-a-...` |
| M29 | `as restrictive` → permissive | G | G | **C** | the same 2 cases |
| M43 | narrowing `for all` → `for select` | G | **C** | skip | `WITH CHECK cannot be applied to SELECT or DELETE (42601)` |
| M41 | drop `force row level security` | **C** | G | G | static suite, 1 test |
| M42 | drop `enable row level security` | **C** | G | **C** | static, and 7 isolation cases |

### 4.7 Indexes and the primary key

| # | mutation | A | B | C | verdict / first noticing layer |
|---|---|---|---|---|---|
| M30 | drop `performance_snapshots_scope_time_idx` | G | **C** | skip | `the month-sliceable index on batch 121's table is gone (P0001)` |
| M31 | drop `performance_snapshots_post_time_idx` | G | **C** | skip | `foreign key(s) with no supporting index and no named exemption: app.performance_snapshots.performance_snapshots_post_scope_fk (P0001)` — caught by the **repo-wide** batch 104 rule, not by 121's own block |
| M32 | identity PK → `bigserial` | G | G | **C** | `service-cannot-record-a-metric-snapshot: the case declares it is refused by the policy layer and the database refused it at the grant layer` |
| **M32b** | **`generated always` → `generated by default`** | G | G | G | **SURVIVOR** |

M32 is the single most impressive catch in the suite: the case asserts the *layer* of the
refusal, not merely that there was one, and a `bigserial` moves it from policy to grant because
`app_worker` holds no USAGE on the new sequence. That assertion is load-bearing.

### 4.8 Fixture and probe deletion

| # | mutation | A | B | C | first noticing layer |
|---|---|---|---|---|---|
| M34 | delete a fixture row (workspace B's) | G | G | **C** | fixture: `loaded 3 metric snapshot(s) and expects 4` |
| M35 | collapse the series (row two's `metric_time` → row one's) | G | G | **C** | fixture: the count and series assertions |
| M36 | delete one of the two fixture probes | **C** | G | C | static, then the fixture's own count |
| M37 | delete one of the five migration probes | G | **C** | skip | `batch 121 ran 4 payload probe(s) in the migration and there are 5 (P0001)` |

### 4.9 The CI control line — caught semantically once the tripwire is taken out of the way

| # | mutation | A | B | C | notes |
|---|---|---|---|---|---|
| M38 / M38r | remove the `app.performance_snapshots` control line | **C** | G | G | M38 trips the digest tripwire; **M38r**, with the manifest regenerated, fails **2** tests semantically |
| M39 / M39r | pattern → one that matches nothing | **C** | G | G | **M39r** fails 1 test — the basis count of seven |
| M40 / M40r | pattern → `[a-z0-9-]*published-post` (another family's) | **C** | G | G | **M40r** fails 3 tests |

### 4.10 Drift — what a LATER migration can do

`D0n` added an unregistered file (confounded, discarded). `D0nh` appended to `140_audit.sql`,
already registered and sorting after 121 — the honest form.

| # | mutation | A | B | C | verdict |
|---|---|---|---|---|---|
| **D01h** | **later migration drops `..._metrics_keys_are_known`** | G | G | G | **SURVIVOR** |
| D02h | later migration grants `app_worker` UPDATE | G | G | **C** | `service-cannot-rewrite-a-metric-snapshot: the database returned zero rows rather than refusing` |
| D03h | later migration drops the restrictive narrowing | C | G | **C** | caught |
| D04h | later migration drops the unique | G | G | **C** | fixture: `constraint "performance_snapshots_one_per_post_instant" ... does not exist` |
| D05h | later migration keeps the narrowing by name and empties it (`using (true)`) | C | G | **C** | caught |

**Read this table as the headline.** Drift in the grants, the unique, the FK and the policies IS
caught — by the fixture probes and the isolation cases, both of which re-run on every `rls-smoke`
forever. Drift in the payload shape is NOT, because the only thing that ever checks it is an
apply-time block that runs once, when 121 itself is applied, and never again.

---

## 5. Findings

### F1 — HIGH. The payload shape is undefended, both against widening and against later drift

**Three survivors on one control: M17, M45 and D01h.**

The apply-time block asserts that the five CHECK constraints **exist by name**. It never asserts
**what they say**. The five payload probes fire fixed literals that a widened or narrowed key set
still refuses or still never reaches. No isolation case can reach any constraint on this table —
no client role holds INSERT and the service is refused at the policy layer — which the batch
states itself. And the block runs only when 121 is applied, so nothing re-tests it afterwards.

So: add an eleventh key to `..._metrics_keys_are_known` without extending
`..._metrics_values_are_numbers`, and every layer stays green. I demonstrated the consequence
rather than asserting it. On a cluster with batch 121 applied, before the mutation:

```
ERROR:  new row for relation "performance_snapshots" violates check constraint
        "performance_snapshots_metrics_keys_are_known"
```

After adding `'followers'` to the allowlist and nothing else:

```
INSERT 0 1
      metric_time       |                           provider_sentence
------------------------+-----------------------------------------------------------------------
 2026-09-03 18:00:00+07 | "Graph API (#100) unsupported get request for post 17841400000000000"
```

That value sits in `metrics`, which is PROVIDER-3, which question D deliberately placed **inside**
the client SELECT, and which every active member of the workspace may read. This is precisely
A1's finding against `publish_targets.failure_class` — a PROVIDER-3 column inside the client
projection with no shape over it — which batch 121's own header says it is closing one batch
early. **The claim is true of the code as written and false of the code as defended.** The
migration comment says "what keeps a provider's sentence out is the shape, not the projection";
nothing keeps the shape.

D01h is the same hole reached the way it will actually be reached. And it is not hypothetical:
the migration header states that batch 150 "will have to **rebuild** rather than alter" this table
to partition it. A rebuild that reinstates four of the five CHECKs is invisible to all three
layers.

M45 is the mirror and is milder: removing `saves` from the allowlist silently narrows what a
collector may ever write, and the failure surfaces in production as a rejected insert.

**Actionable. How I would close it, cheapest first:**
1. In the apply-time block, assert the constraint **text**, not its existence — e.g.
   `pg_get_constraintdef` of `..._metrics_keys_are_known` contains exactly the ten keys, and the
   ten keys of `..._values_are_numbers` are the same ten. Ten lines, closes M17 and M45.
2. **Move the five payload probes into the fixture.** They need no parent row, so the batch's own
   stated reason for keeping them in the migration ("a probe that needs a parent row belongs in
   the fixture") does not argue against it — and in the fixture they re-run on every `rls-smoke`,
   which closes D01h. This is the single highest-value change and it is a move, not new code.
3. Repo-wide and beyond this batch: a post-migrate assertion pass that re-runs every batch's
   apply-time invariants **after the whole set**, so no batch's guarantees can be undone by a
   later file. D01h is a property of the harness, not of batch 121, and every batch has it.

### F2 — MEDIUM-HIGH. This table's own membership test can be deleted and nothing notices

**Survivor M27.** Changing the permissive SELECT policy from
`using (app.is_active_member(workspace_id))` to `using (true)` leaves all three layers green.

The reason is not that the suite is lazy. It is that every read is *also* gated by the restrictive
narrowing, whose `exists()` traverses `app.published_posts` → `publish_targets` →
`publish_intents` → `content_items`, each carrying its own membership policy. The parents answer
first, so the suspended member, the cross-tenant owner and the out-of-scope editor are all still
refused — by somebody else's policy.

`app.member_scope_admits_business`'s own comment in `021_member_scope.sql` is exact about this:

> It is NOT a membership test and must be ANDed with one.

M27 removes that AND on this table, and no layer can tell. This is the hazard batch 121 itself
names in the narrowing's policy comment — "a narrowing that relies on a parent's policy is one a
later change to that parent can silently remove", A1's finding F4 held one family deeper. **The
batch documents the hazard and does not test for it.**

Production cost: `app.performance_snapshots`' membership boundary becomes wholly inherited. The
change most likely to disturb it is already scheduled — RFC-2026-022 §7 coming into effect adds
CARRIED service policies to exactly those parent tables.

**Actionable.** A case that isolates this table's own membership test may not be constructible
with the current fixture, since the parents refuse the same callers. The honest fix is therefore
an apply-time assertion: `pg_get_expr(polqual)` for
`performance_snapshots_select_active_member` still mentions `app.is_active_member`. Four lines,
and it is the same kind of assertion the block already makes about `metric_time` being inside the
unique.

### F3 — MEDIUM. `generated always` can become `generated by default` unnoticed

**Survivor M32b.** Nothing asserts the identity's strength. Latent rather than live today:
`app_worker`'s INSERT grant is column-scoped and excludes `id`, so no role can currently supply
one. The contrast with M32 is the point — the suite is sharp enough to notice the *mechanism*
changing (bigserial moves the refusal layer) and blind to the *strength* changing.

**Actionable, one line:** assert `attidentity = 'a'` on `id` in the apply-time block.

### F4 — MEDIUM. Two probes are caught only by accident, and the diagnostic they emit is wrong

M18 and M19 both failed `migrate-clean` — with
`violates foreign key constraint "performance_snapshots_post_scope_fk" (23503)`.

The payload probes insert with `gen_random_uuid()` for all three scope columns. A CHECK is
evaluated before the FK trigger, so while the CHECKs bite the probes work. The moment the targeted
CHECK stops refusing, the row falls through to the FK, the `when check_violation` handler never
runs, and its `if sqlerrm not like '%<constraint>%'` assertion — the thing that makes the probe a
probe — is never evaluated. The migration fails, so this is not a security gap. But a developer is
told the composite foreign key is broken when what actually moved is the size bound.

It also bounds how much the probes prove: **any mutation that both passes the weakened CHECK and
satisfies the FK is missed entirely.** That is not a hypothetical — it is M17.

**Actionable:** give each probe a `when others then raise exception 'probe N was not refused by
<name>: %', sqlerrm` arm, so a fall-through is reported as a fall-through.

### F5 — LOW. The fixture's header contradicts the measurement and names a case that does not exist

`tests/db/identity/fixtures/121-publisher-metrics-fixture.sql` line 31 reads:

> the page-pinned member is admitted to NOTHING in this family, because every post that exists
> hangs off a business-level item, and `pinned-editor-a-sees-zero-metric-snapshot-rows` is that
> measurement

**There is no such case in the suite** (I grepped all 965 ids). The case that exists is
`pinned-editor-a-sees-the-metric-snapshots-of-the-fb-send`, `expect: 'rows'`, measured at 2 — the
exact opposite claim, and the batch is proud of having measured it: the commit message says the
plan's sentence "is corrected in the fixture that made the claim". **It was not corrected.** The
fixture still makes the claim, and cites a case id that no layer cross-checks.

Recorded as LOW because nothing executable depends on it. Recorded at all because this batch's
own evidential standard is that a claim in a comment is checkable, and this is a claim in a
comment that is both false and unfalsifiable by any of the three layers.

### F6 — LOW. A planned case was dropped without a record

`a0-batch-121-plan-2026-09-16.md` §6 lists `owner-a-cannot-rehome-a-metric-snapshot` as case 16.
It is not in the suite. Probably harmless — a rehome is the same table-level 42501 as the rewrite
that is tested — but the plan-to-implementation delta is unrecorded, where every other delta in
this batch is recorded loudly.

### What held, and deserves saying

- **The negative control is honest in both halves**, including its per-case row counts, which I
  did not take on trust (§2).
- **Both probe counts object** (§3).
- **Every CHECK, every NOT NULL, every grant and both uniques are caught by name** at apply time,
  with messages that say what was lost and why it mattered.
- **The `deniedBy` layer assertions are load-bearing**, and caught a mutation (M32) I expected to
  survive.
- **Drift in the grants, the unique, the FK and the policies IS caught** by the fixture probes and
  the cases — which is the right architecture. F1 is the observation that the payload shape alone
  was left out of it.

---

## 6. Is anything stop-the-line?

**No — with one condition I am putting to the Owner rather than deciding.**

Nothing in batch 121 is presently wrong. No tenant boundary is broken, no privilege is
mis-granted, the negative control is honest, and all three layers are green on `426c294` on a
cluster I built myself. Every survivor I found is a gap in **defence against future change**, not
a defect in the code under review. On the standard this package has used — a stop-the-line finding
is one that makes the merge itself unsafe — I do not have one.

The condition: **F1 and F2 should be recorded as blockers on WP-0A-DB-00 before this merges, and
F1 should be named explicitly against batch 150**, which the migration header already says will
have to *rebuild* this table. A rebuild is the exact operation D01h models, and a rebuild that
drops one CHECK is invisible to every layer that exists today. If the Owner would rather have
fix (2) of F1 — moving the five payload probes into the fixture, which is a move rather than new
code and closes the largest survivor — in this batch instead of a blocker in the next, that is a
cheap change and I would understand the choice. **I approve nothing and that decision is not
mine.**

---

## 7. The main limit on my own run, in my own words

**I tested the guards against the mutations I could imagine, and I share an author with the thing
I was testing.** A0 wrote the batch, wrote my brief, and named the mutation classes. Every one of
those named classes was caught — which is a statement about A0's list, not about the suite. Three
of my five survivors sit on a single control (the payload shape) and one of them, D01h, only
appeared because I stopped editing 121's own file and started doing what a later developer
actually does. I found that class by changing my method mid-run; I have no way to know how many
more classes lie on the other side of a method I did not think to change.

Concretely, and beyond §0:

- **Fifty mutations is not a proof.** It is fifty points sampled from an unbounded space, chosen
  by a model that shares its blind spots with the model that wrote the target.
- **I never ran CI.** I reproduced the `control` function's logic by hand. If the real workflow
  differs from my reading of it, my §2 is a statement about my script.
- **I proved nothing about `app_worker` in production.** Every service-path result is measured
  with `postgres` as the only member of that role, which bypasses RLS — the schema's own
  `_not_in_effect` note says so. `service-cannot-record-a-metric-snapshot` landing under the
  control is evidence about the policy layer, not about a real worker connection.
- **My one-table drift probes are not a survey.** D01h says batch 121's payload shape is
  undefended against later migrations. I did not test whether any *other* batch's apply-time
  guarantees are, and I suspect the same hole is repository-wide. That is a bigger question than
  this file, and I am naming it rather than answering it.
- **I could not test the cadence, the retention window, or the ERD mismatch.** All three are open
  blockers the batch declares; none is enforced anywhere, so there is nothing for me to falsify.

---

*Cluster stopped and removed. Worktree restored to `426c294`, `git status` clean.*
