# Q0 independent test: the post-migrate assertion pass

Run: `/claude/q0_sentinel`
Role: independent Tester. `work-packages/WP-0A-DB-00.json` `role_assignments.tester_agent_run_id`
names `/claude/q0_sentinel`. This file comes from a distinct run of it.
Subject: branch `agent/claude/WP-0A-DB-00-post-migrate-pass`, head `d70d2d6`, base `b07a8d9` (`main`).
Author: `/claude/a0_atlas`.
Local test branch: `test/q0-post-migrate-pass`, created at `d70d2d6`.
Date: 2026-09-27.

**This document RECORDS TEST RESULTS.** It advances no package status. It writes `test_verified`
nowhere, signs nothing on anyone's behalf, and repairs nothing it found. Every defect named below
is left as it is on the subject branch. I changed no migration, runner, register, replacement or
test except for the moment each mutation ran inside my own harness. After every mutation the
harness wrote each touched file back byte for byte and checked `git status --porcelain`, and no
run left the tree dirty. The only file this run adds to the repository is this one.

---

## 0. What I am, before anything else

**I am a SUBAGENT spawned by the Author run `/claude/a0_atlas`.** I ran in a git worktree A0
created, under a brief A0 wrote. A0 chose the subject, the port, the cluster recipe, the output
filename, and the mutation classes I had to cover "at minimum". A0 also wrote the change under
test.

**I am the same vendor as the Author (Anthropic), and the same model family.** RFC-2026-024 is
approved and withdrew the cross-vendor condition. What remains is CONTRIBUTING_AGENTS.md's
separation of duties: four distinct `agent_run_id`s, and no run approves, test-verifies,
integrates or gate-approves its own work. I record that as the rule I ran under. Whether this
file is *accepted* as the Tester signature is for the Integration Owner and the Product Owner to
decide. It is not my decision.

### What I measured, and what I did not

**Measured, live, on my own scratch cluster:**

- The Author's headline claim, both halves.
- The clean baseline on `d70d2d6`.
- Whether the pass is idempotent, by dumping the database before and after a second run of the
  pass, and again after a *committing* run of it.
- **78 distinct mutations, each on a freshly initdb'd cluster:**
  - 12 to the runner;
  - 11 to the register and the replacements;
  - 5 to the form of a block, including one confound check;
  - 50 later-migration drifts across 16 batches.
- Every survivor re-run against the **full** static suite (`npm run verify`), not just the fast
  proxy.

**Not measured:**

- **I could not check my own framing.** A0 named the starting classes. My two most consequential
  survivors are the runner-gutting class (F1) and the replacement-gutting class (F2). Both came
  from A0's named classes, pushed one step further than the brief's wording: "does the static
  suite catch this edit" became "does it catch an edit written to *evade* it". The form-escape
  class (F3) and the append-only class (F6) are not in A0's list. I found them by reading what
  the README and the 140 block *claim*. Neither of us thought of what I did not find.
- **I did not observe CI.** `.github/workflows/ci.yml` runs `make db-migrate-clean` once, after
  the shim, as I did locally. I did not run a GitHub Actions job.
- **The static suite ran on my branch name, not the subject's.** The subject branch is checked
  out elsewhere, so I measured on `test/q0-post-migrate-pass`. Branch-name-dependent guards
  (handoff and scope) therefore judged a different name. Nothing I mutated is judged by them.
  The baseline was `clean: exit 0 — tests 666, pass 666, fail 0`.
- **I did not check the Thai source documents or the Owner's disposition.** I tested whether the
  pass does what the commit, the plan, the README and the register *say*.
- **The mutations are a sample.** 78 points, chosen by a model that shares the Author's blind
  spots.

---

## 1. How I measured

PostgreSQL 17.11 from `/opt/homebrew/bin`. The cluster lived in my private subdirectory
`…/scratchpad/q0-test/`. The recipe:

- `initdb --locale=C -A trust -U postgres`;
- TCP only on `127.0.0.1:5503` with `unix_socket_directories=''`;
- started with `LC_ALL=C`;
- **re-initdb'd before every single run**, because roles are cluster-wide.

`db/foundation/ci/supabase-shim.sql` was applied first. Then
`DB_TEST_URL=postgresql://postgres@127.0.0.1:5503/postgres make db-migrate-clean` and
`make db-rls-smoke` ran with the same URL.

**The user's server on 5432 was never contacted.** Another role run's cluster was listening on
5499 and I did not touch it. I wrote nothing in the shared scratchpad outside `q0-test/`.

Layers, per mutation:

| col | layer | what |
|---|---|---|
| A | static suite | fast proxy per run: the three test files that read the runner, the register or the migrations (`foundation-contract`, `identity-isolation`, `ctr-job-001`). **Every survivor was re-run with the full `npm run verify`**; see §4.6. |
| S | `make db-schema-lint` | CI runs it, so I report it. |
| B | `make db-migrate-clean` | now includes the post-migrate pass. |
| C | `make db-rls-smoke` | 965 isolation cases, plus fixtures and authz proofs. `SKIP` means the schema never built. |

A **survivor** is a mutation that leaves every layer green.

**Drift method.** Each later-migration drift is **appended to `140_audit.sql`**, after its own
block. 140 is registered everywhere and sorts last. I checked that a genuinely new file is a
confound, as it was on batch 121: `X0`, a new `145_scratch.sql` containing only `select 1;`, fails
17 static tests and schema-lint whatever it contains. A scratch file would read "caught" for
every drift, so the brief's `145_scratch.sql` form was not used for any verdict.

Baseline on `d70d2d6`:

| layer | result |
|---|---|
| A | `clean: exit 0 — tests 666, pass 666, fail 0, skipped 0, todo 0` (106 s) |
| B | `post-migrate pass: 42 apply-time blocks, 32 re-run as written, 10 superseded and replaced`, `db-migrate-clean: ok` |
| C | `db-rls-smoke: 965 isolation case(s) passed` |

---

## 2. The Author's headline claim: REPRODUCED, both halves

The claim: a later file dropping 061's `usage_events_dimension_known`

- leaves every layer green on `main` (`b07a8d9`);
- fails `migrate-clean` on `d70d2d6`.

| tree | B | C |
|---|---|---|
| `b07a8d9` + drop appended to 140 | `db-migrate-clean: ok` | `965 isolation case(s) passed` |
| `d70d2d6` + same drop | **FAILED**: `061_metering.sql#1 (line 1106) no longer holds on the migrated database: batch 061 declares six vocabulary CHECK constraints and the catalog holds 5 (P0001)` | `965 … passed` |

The failure names the block and the line, as claimed. Q0's own D01h from batch 121 (`D03`, drop
`performance_snapshots_metrics_keys_are_known`) is now caught at B by name. It is also caught at
C by 121's fixture copy.

## 3. Idempotence: HOLDS

I built a fresh cluster and ran `migrate-clean`, which includes one pass. Then:

1. dump A: `pg_dump` of `app`, `private`, `auth` and `public`; roles; `pg_sequences.last_value`;
   `reltuples`; catalog counts.
2. a second run of the pass alone, through the same `begin; … rollback;` path;
3. dump B.

**A and B are identical** apart from the random `\restrict` tokens pg_dump 17 writes. Every
identity sequence stayed `null`, so the probe rows advance no sequence.

I then ran the pass once more with `commit` in place of `rollback`, and took dump C. **B and C
are also identical.** The rollback therefore protects nothing *today*: every block's side effects
already undo themselves. It matters only for a future block that does not. See F10.

---

## 4. Every mutation

`G` green, `C` caught, `SKIP` schema not built, `-` not applicable. Where a runner or register
mutation is paired with a drift, the drift is named. The drift makes the mutation's harm
observable. Without it a gutted pass has nothing to miss.

### 4.1 Runner (`scripts/db/run.mjs`)

| # | mutation | A | S | B | C | verdict |
|---|---|---|---|---|---|---|
| R01 | `rerun` definition: `rollback` → `commit` | C | G | G | G | caught (regex on the definition) |
| R02 | definition kept; call site appends `commit; begin;` | G | G | G | G | **survivor**, harmless today (§3) |
| R03 | `if (block.superseded) continue;` + drift D28 | G | G | G | G | **SURVIVOR** |
| R04 | stale check defanged: `(code !== 'P0001' && false)` | G | G | G | G | **survivor** (low harm) |
| R05 | pass moved before the FK probe | C | G | G | G | caught |
| R06 | unregistered failure's `return 1;` put inside a comment, so the count of 4 still holds; + drop 061 | G | G | G | G | **SURVIVOR**: the failure is printed and the target says `ok` |
| R07 | call site: `rerun(block.superseded ? block.sql : 'select 1;')` + drop 061 | G | G | G | G | **SURVIVOR** |
| R08 | replacement call: `rerun('select 1;')` + drift D28 | G | G | G | G | **SURVIVOR** |
| R09 | `if (env.Q0 === undefined) return 0;` before the pass + drop 061 | G | G | G | G | **SURVIVOR**: the pass line is simply absent |
| R10 | `plan = []` in place of `postMigratePlan()` | C | G | G | G | caught (regex) |
| R11 | extraction takes one block per file | C | G | C | G | caught twice |
| R12 | opener cross-check disabled | C | G | G | G | caught |

### 4.2 Register and replacements

| # | mutation | A | S | B | C | verdict |
|---|---|---|---|---|---|---|
| G01 | 030 replacement: pinned-name set check deleted | G | G | G | G | **survivor** (low harm alone, see F9) |
| G02 | 030 exclusion `not in (exact names)` → `not like '%\_closed' / '%\_caller'` | G | G | G | G | **survivor** (low harm alone) |
| G02d | G02 + narrowing renamed `…_scope_closed` and emptied | G | G | C | C | caught by the **pin** G01 removes, and by rls-smoke |
| G03 | 030's only `SUPERSEDED BY` comment reworded | C | G | G | G | caught |
| G03b | second of two `SUPERSEDED BY 122` in 120 deleted | G | G | G | G | survivor, harmless |
| G04 | 070 entry deleted, file kept | C | G | C | G | caught twice |
| G05 | 070 entry **and** file deleted | G | G | C | G | caught (guard 1) |
| G06 | 120 entry points at `#2` | G | G | C | G | caught (guard 1 on #1) |
| G07 | 070 replacement → `do $$ begin -- SUPERSEDED BY 071. null; end $$;` | G | G | G | G | **SURVIVOR** |
| G07d | G07 + drift D28 (caught with the intact replacement) | G | G | G | G | **SURVIVOR**: this is the demonstration |
| G08 | 120 replacement gutted the same way | G | G | G | G | **SURVIVOR** |

### 4.3 The form of a block (README: "A block written any other way is refused")

Each case appends to 140 a block asserting `jobs_lease_is_a_pair` exists, followed by a statement
dropping that constraint. At apply time the block passes; at pass time it should fail.

| # | block form | A | S | B | C | verdict |
|---|---|---|---|---|---|---|
| X1c | control: `do $$` … `end $$;` | G | G | **C** | G | caught: `140_audit.sql#2 (line 1020) … q0: jobs_lease_is_a_pair is gone` |
| X1 | `DO` newline `$$` … `end` newline `$$;` | G | G | G | G | **SURVIVOR**: not extracted, not refused |
| X2 | `do language plpgsql $$` … `end $$;` | G | G | G | G | **SURVIVOR** |
| X3 | `select 1; do $$` (mid-line) … `end $$;` | G | G | G | G | **SURVIVOR** |
| X0 | new file `145_scratch.sql`, `select 1;` | C | C | G | G | confound: caught whatever it contains |

### 4.4 Later-migration drift, appended to `140_audit.sql`

| # | drift | batch | A | S | B | C | verdict |
|---|---|---|---|---|---|---|---|
| D01 | drop `usage_events_dimension_known` | 061 | G | G | **C** | G | caught by the pass alone |
| D02 | same, kept by name and widened to `dimension is not null` | 061 | C | G | **C** | G | caught (061 compares text) |
| D03 | drop `performance_snapshots_metrics_keys_are_known` (D01h) | 121 | G | G | **C** | C | caught |
| D04 | same, kept by name and widened | 121 | G | G | **C** | C | caught |
| D05 | `publish_jobs_status_known` kept by name, widened | 120 (replacement) | G | G | **C** | G | caught by the **replacement** alone |
| D06 | drop `jobs_lease_is_a_pair` | 050 | G | G | G | G | **SURVIVOR** |
| D07 | drop `content_versions_body_not_blank` | 080 | G | G | G | G | **SURVIVOR** |
| D08 | drop `notifications_deep_link_demands_a_permission_check` | 051 | G | G | G | G | **SURVIVOR** |
| D09 | drop `assets_purge_follows_deletion` | 100 | G | G | G | G | **SURVIVOR** |
| D10 | drop `research_sources_uri_no_traversal` | 070 | G | G | G | G | **SURVIVOR** |
| D10b | drop `asset_versions_object_key_names_one_object` | 100 (replacement) | G | G | **C** | G | caught by the replacement alone |
| D11 | `outbox_events.id` generated always → by default | 050 | G | G | **C** | G | caught by the pass alone |
| D12 | `usage_events.id` the same | 061 | G | G | **C** | G | caught by the pass alone |
| D14 | `private.set_updated_at()` (SECURITY DEFINER) `reset search_path` | 000 | G | G | G | G | **SURVIVOR** |
| D15 | `private.refuse_mutation()` (SECURITY DEFINER) `reset search_path` | 140 | G | G | G | G | **SURVIVOR** |
| D16 | `app.jwt_subject()` `reset search_path` | 011 | G | G | **C** | C | caught |
| D17 | `app.is_active_member` `search_path = public` | 011 | G | G | **C** | C | caught |
| D18 | `set_updated_at` body → `return new` | 000/093 | G | G | G | **C** | caught by rls-smoke only |
| D19 | `refuse_mutation` body → allow | 140 | G | G | **C** | G | caught **by accident**, see F6 |
| D20 | disable `refuse_mutation` on `audit_logs` | 140 | G | G | **C** | G | caught **by accident**, see F6 |
| D20b | disable both append-only triggers on `security_events` | 140 | G | G | G | G | **SURVIVOR** |
| D20c | disable `refuse_truncate` on `audit_logs` | 140 | G | G | **C** | G | caught (the probe truncates) |
| D21 | disable `set_updated_at` on `content_items` | 093 | G | G | G | **C** | caught by rls-smoke only |
| D22 | drop that trigger | 093 | G | G | **C** | C | caught |
| D23 | `grant update on app.audit_logs to authenticated` | 140 | C | G | C | G | caught |
| D24 | `grant select on app.billing_webhook_receipts to authenticated` | 131 | C | G | C | C | caught |
| D25 | `grant usage on schema private to authenticated` | — | C | G | G | C | caught |
| D26 | `grant all on app.performance_snapshots to app_worker` | 121 | G | G | **C** | C | caught |
| D28 | `research_runs` NO FORCE RLS | 070 (replacement) | G | G | **C** | G | caught by the replacement alone |
| D29 | `billing_subscriptions` NO FORCE RLS | 130 | G | G | **C** | G | caught by the pass alone |
| D30 | `performance_snapshots` NO FORCE RLS | 121 | G | G | G | G | **SURVIVOR** |
| D31 | 030 narrowing kept by name, `using (true)` | 030 | G | G | G | **C** | caught by rls-smoke (the replacement loop misses it) |
| D32 | 121 narrowing kept by name, `using (true)` | 121 | G | G | G | **C** | caught by rls-smoke only |
| D33 | 120 narrowing kept by name, `using (true)` | 120 (replacement) | G | G | **C** | C | caught |
| D34 | 031 `…_service_path_closed` → `true` | 031 | G | G | **C** | C | caught |
| D35 | 031 closure → `current_user = 'authenticated' or current_user = 'app_worker'` | 031 | G | G | G | **C** | caught by rls-smoke only |
| D36 | 122 closure on `publish_intents`, the same | 122 | G | G | G | **C** | caught by rls-smoke only |
| D37 | 022 closure on `business_profiles`, the same | 022 | G | G | G | **C** | caught by rls-smoke only |
| D37b | 082 closure on `content_items`, the same | 082 | G | G | G | **C** | caught by rls-smoke only |
| D38 | `business_profiles_updated_by_is_caller` → `… or true` | 102 (replacement) | G | G | G | G | **SURVIVOR** |
| D39 | the same policy → `with check (true)` | 102 (replacement) | G | G | **C** | G | caught by the replacement alone |
| D40 | `content_items.business_profile_id` drop NOT NULL | 080 | G | G | G | G | **SURVIVOR** |
| D40b | `jobs.job_type` drop NOT NULL | 050 | G | G | G | G | **SURVIVOR** |
| D41 | social FK re-added `on delete cascade` | 111 | C | G | G | G | caught (static text rule only) |
| D42 | `research_runs` SELECT policy widened to anon, plus a grant | 070 (replacement) | C | G | **C** | G | caught |
| D43 | new `app` table with no RLS | — | C | C | G | G | caught (static text lints) |
| D44 | new SECURITY DEFINER function, no search_path, executable by authenticated | — | G | G | G | G | **SURVIVOR** |
| D45 | `alter role app_worker bypassrls` | — | G | G | G | **C** | caught by rls-smoke |
| D46 | drop 121's unique | 121 | G | G | **C** | C | caught |
| D47 | new client-writable column on `content_items` | 080 | G | G | G | G | **SURVIVOR** |

**Read this table as the headline.** The pass works for what the blocks say. It is the **only**
layer that catches these drifts, on eight batches:

- D01, D05, D10b, D11, D12, D19, D20, D28, D29, D39;
- that is 050, 061, 070, 100, 102, 120, 130 and 140, **four of them through replacements** (D05, D10b, D28, D39). D19 and D20 are among them but are caught by accident (F6).

That is a real gain over `main`, and I measured it directly. What survives falls into three
groups:

- **(i) Edits to the pass itself or to a replacement** (§4.1, §4.2). Nothing notices these.
- **(ii) Block forms the extraction does not see** (§4.3).
- **(iii) Guarantees no block asserts**: D06–D10, D14, D15, D20b, D30, D38, D40, D40b, D44 and
  D47. The pass cannot defend these by design. Only one of them (D38) is the "content changed
  under a kept name" case the new blocker describes.

### 4.5 A layer the brief asked about: the `*_service_path_closed` exclusion

The replacements exclude the closures **by exact name** from their narrowing loops. Their content
is checked by the closure batches' own blocks, and those check only that the text *contains*
`current_user` and `authenticated`. So D35–D37b, which widen a closure to admit `app_worker` while
keeping both words, pass **B**.

**They are all caught at C** by each family's `batch-0NN-closes-the-service-path-…` case. **The
exclusion is safe today, but because of rls-smoke, not because of the pass.** Weakening the
exclusion to a LIKE pattern (G02) survives on its own. The one harm I built from it (G02d) was
caught by the pin that G01 shows can be deleted unnoticed.

### 4.6 Survivors re-run against the full static suite

All 30 runs that were green on the fast proxy and on B and C were re-run with the mutation applied
and **the full `npm run verify`** in place of the proxy. The 30 are R02, R03, R04, R06, R07, R08,
R09, G01, G02, G03b, G07, G07d, G08, X1, X2, X3, D06, D07, D08, D09, D10, D14, D15, D20b, D30, D38,
D40, D40b, D44 and D47.

**All 30 are green on the full suite.** No second test anywhere in the 666 catches any of them. The
survivor list above is therefore final for the static layer. Of the 30, R02, G03b, G01, G02 and
R04 are graded harmless or low below. The rest are the findings.

---

## 5. Findings

### F1: HIGH. The pass's runner is defended only by regexes over its own text, and four evasive edits leave every layer green while real drift is present

The three new contract tests read `run.mjs` as text:

- the index of two strings;
- the `rerun` definition;
- the number of `return 1;` tokens in a slice;
- the presence of the literal `'P0001'`.

Measured survivors, each run **with a drift the unmutated pass catches**:

- **R06**: the unregistered failure's `return 1;` is placed inside a comment. The `/return 1;/g`
  count still finds four. `migrate-clean` *prints* `061_metering.sql#1 … no longer holds` and then
  reports `db-migrate-clean: ok`.
- **R07**: the call site feeds `select 1;` for every unregistered block. The success line reads
  `42 apply-time blocks, 32 re-run as written`, which is false.
- **R08**: the replacement is never run. The same false success line.
- **R09**: an early `return 0` before the pass. The pass line simply disappears from the output.
- **R03**: superseded blocks skipped entirely.

Also surviving, but low harm today: R04 (the P0001 literal kept and defanged) and R02 (commit via
the call site; harmless per §3).

**Why HIGH and not stop-the-line.** Each of these needs a deliberate edit to `run.mjs`, and
RFC-2026-002 review of the diff is the anchor. But the property the pass sells is that a later
developer changing a guarantee "becomes a reviewable line in the diff". An edit to the pass itself
becomes a diff that *claims success in the output*. There is also no CI negative control: plan §9
question D proposed one line to the Integration Owner, and it is not in `ci.yml`. So nothing
anywhere observes the pass failing.

**Remedies, in order of cost:**

1. **Make the decision a pure function and test it by behaviour.** Move the loop's decision into
   an exported `postMigrateVerdict(plan, results) → { exit, lines }`, the way
   `scripts/verify-clean-run.mjs` separates `decide`. Test it with synthetic results: an
   unregistered error gives exit 1; a superseded block that passes gives exit 1; a superseded
   block failing with 42703 gives exit 1; a failing replacement gives exit 1; the all-good case
   gives exit 0 and the count line. Then `runLive` only feeds SQL and hands the results over.
2. **Put the proposed CI control line in `ci.yml`, through the Integration Owner.** A scratch
   append that drops the 121 CHECK must make `make db-migrate-clean` exit non-zero *and* print
   `121_publisher_metrics.sql#1`.
3. **Optionally, a canary block inside the live pass.** One block known to be false, run through
   the same `rerun`, whose failure must be observed before the success line may print.

### F2: HIGH. A replacement can be gutted to `null;` and every layer stays green, so 10 of 42 blocks rest on files nothing ties to their originals

The register says each replacement is "the original block word for word except where a
`SUPERSEDED BY` comment says what changed". **No test checks that.** The static test requires:

- one do-block;
- one `SUPERSEDED BY … nnn` mention per later file;
- no silencer.

`G07` replaces 070's 434-line replacement with `do $$ begin -- SUPERSEDED BY 071. null; end $$;`,
and `G08` does the same to 120's. Both pass A, S, B and C.

**G07d is the proof of harm.** `research_runs NO FORCE ROW LEVEL SECURITY` (D28) is caught
*only* by 070's replacement, and with the replacement gutted it survives every layer. The
original still fails at its first raise, so guard 2 is satisfied, and nothing of the original
past that raise is ever evaluated again.

The ten superseded blocks are the largest in the repository: 070, 080, 081, 090, 100, 110 and 120,
about 3,400 lines between them. The runner's own gutting (F1) at least has to live in a file
whose job is obvious. A replacement is a SQL file that a later batch is *expected* to edit
whenever it supersedes the block again, which makes it the likeliest place for an accidental
weakening.

**Remedy.** A static test that the replacement preserves the original outside declared regions.
For example, each register entry gains `"replaces": [[fromLine, toLine], …]` (lines of the
original block). The test:

- (a) takes the original's lines outside those ranges, which must appear **in order and
  verbatim** in the replacement (a longest-common-subsequence check against the whole original
  is enough);
- (b) requires every replacement line not matched in (a) to lie inside a `-- SUPERSEDED BY nnn`
  region with an explicit end marker.

On today's files the edits are small (13–37 changed lines per replacement, as I measured by
diffing each against its extracted original). The test is cheap to satisfy honestly and
impossible to satisfy with G07.

### F3: MEDIUM. "A block written any other way is refused" is false; three legal forms escape both the extraction and the refusal

The README and `applyTimeBlocks`' comment both make this promise. The opener cross-check counts
lines matching `^\s*do\s*\$` after stripping `--` comments. It misses:

- **X1**: `DO` on one line and `$$` on the next;
- **X2**: `do language plpgsql $$`;
- **X3**: a block opened mid-line, as in `select 1; do $$`.

All three are valid PostgreSQL, run at apply time, and are never re-run by the pass. The house-form
control X1c *is* caught. The static coverage test counts `^do \$\$\s*$` lines, so it shares the
blind spot and cannot notice.

**Remedy.** Count openers over comment- and string-stripped text with a multi-line pattern such as
`/\bdo\s+(language\s+\w+\s+)?\$(\w*)\$/gi`, compare that count with the extracted count, and add
X1–X3 as refusal cases to the existing test. Until then, the README sentence should say "a block
in a form the pass recognises as a block but cannot extract is refused".

### F4: MEDIUM. SECURITY DEFINER search_path is checked live only for `app_authz`'s functions; the general rule runs against a snapshot that stops at batch 010

- **D14** and **D15** (`private.set_updated_at` and `private.refuse_mutation`, both SECURITY
  DEFINER and owned by `postgres`, which bypasses RLS) lose `search_path=""` with every layer
  green.
- **D44**, a *new* SECURITY DEFINER function with no `search_path`, executable by
  `authenticated`, also survives every layer.

The rule exists: `catalogLint` says "SECURITY DEFINER without an empty search_path". But
`catalogLint` reads the committed snapshot, whose `not_applied_to_this_instance` covers 011–140.
011's block asserts it only for functions owned by `app_authz`. This is not a defect of the pass;
it is a guarantee the repository states and never measures live.

**Remedy.** A live probe in `migrate-clean`, in exactly the FK-probe pattern: every
`prosecdef` function in `app` and `private` must carry `search_path=""`, with named exemptions.

### F5: MEDIUM. The updated_by closures can be neutralised under their own names: D38 survives every layer

`business_profiles_updated_by_is_caller` rewritten as `… or true` passes 102's final-state
replacement. That replacement checks only that the expression *contains* `updated_by` and
`auth.uid`. No rls-smoke case tries to forge `updated_by` on that table. A client can then
attribute a row to another user: the A1-090 S13 class the closures exist for.

This is the one survivor that is exactly the new blocker's "content changed under a kept name"
class. The blocker is right, and this names a concrete instance.

**Remedy.** In the 102 replacement, compare `pg_get_expr(polwithcheck, polrelid)` for equality
with the canonical text,
`((updated_by IS NULL) OR (updated_by = ( SELECT auth.uid() AS uid)))`, which I read from the live
catalog. Or add one forging case per family to the isolation suite.

### F6: MEDIUM. `app.security_events` can lose its append-only triggers with every layer green, and `audit_logs` is caught only by accident

**D20b** disables both `refuse_mutation` and `refuse_truncate` on `security_events`, and it
survives. 140's block counts the four triggers by name and function and ignores `tgenabled`. Its
behavioural probe writes only to `audit_logs`.

**D20** (disable on `audit_logs`) and **D19** (gut the function) are caught, but not by the
assertion meant to catch them. The probe's `update … set outcome = 'denied'` is no longer refused
with ZZ140, so the row reaches `audit_logs_outcome_matches_error` and the block dies with
**23514**, a CHECK violation. The diagnostic names a CHECK and not the trigger. A probe that
updated any other column would have let D20 through too. This is the same class as batch 121's
F4.

**Remedy.** 140 cannot be edited (migration invariant 1), and the pass admits replacements only
for blocks that already *fail*. So the design has **no place for a strengthened final-state
assertion of a block that still passes**. Either:

- the next batch's own block asserts `tgenabled = 'O'` on all four and probes `security_events`;
  or
- the invariants directory gains an "additional final-state assertions" class, beside
  replacements.

The second is the general fix for F4, F5, F6 and F7 alike.

### F7: MEDIUM (class). Many constraints are asserted by no block, so no re-run can defend them

The following survive every layer: D06–D10 (five CHECKs across 050, 051, 070, 080 and 100), D30
(`performance_snapshots` FORCE; 121's block never checks FORCE and 122 does not close that table),
D40 and D40b (NOT NULL) and D47 (a new client-writable column).

The Author's plan §5 says this in general terms ("it does not defend shapes that no block
asserts"). But the new blocker names only the *by-name-versus-content* weakness. **The larger
measured class is "asserted nowhere"**: of the 50 drifts, 14 survive every layer, and 12 of those
14 touch something no block names at all (the other two, D20b and D38, are named but not checked for what matters).

**Remedy.** Widen the blocker's text to this measured list. The structural fix is the one the
plan set aside as separate work: a catalog snapshot covering 011–140, compared live in
`migrate-clean`. Any unregistered catalog difference would fail, which catches every row of §4.4
that the pass cannot.

### F8: LOW. Guard 2 accepts any P0001 from anywhere in the block

A stale-entry check that passes whenever *some* raise fires cannot tell "the legitimate conflict
still holds" from "something else now fails first". The replacement still runs in either case, so
the only harm is a staleness signal that comes late. R04 shows the literal `'P0001'` test is also
text-only.

**Remedy.** Record in each entry the text of the raise expected (for example a `raise_prefix`),
and require the verbatim failure message to start with it.

### F9: LOW. The name pins in replacements can be deleted (G01) or loosened (G02) unnoticed

Alone, neither mutation opened a gap I could exploit. The closures are re-checked by their own
blocks, and G02d was caught by the pin and by rls-smoke. F2's remedy covers both.

### F10: NOTE. The rollback is correct, and today it is not load-bearing

§3 measured the commit variant and found the database identical. The rollback is the right
default and should stay. The regex that pins it (R01) catches the obvious edit, not R02.

### F11: NOTE. One `SUPERSEDED BY` mention per later file is all the static test requires

G03b deletes the second of two mentions in 120 unnoticed. It is harmless, and F2's
region markers would subsume it.

### F12: NOTE, out of scope. A patch-reject file is tracked on `main`

`tests/db/identity/isolation-cases.mjs.rej.orig` has been tracked since merge `1385005`. It is not
this change's, and I name it only because I tripped over it.

### What held, and deserves saying

- The headline claim reproduces exactly, and the pass names block and line.
- Idempotence is exact.
- The register's structural lies are refused before a database is touched: a missing file, a
  wrong ordinal, a non-migration, an order violation, a duplicate, a missing entry. So are an
  orphan replacement (G04), a wrong ordinal (G06) and an entry deleted together with its file
  (G05, caught live).
- **The pass is the sole catch for ten drifts across eight batches**, four through replacements.
- The runner gutting class in F1 needs an *evasive* edit. The honest edits (R01, R05, R10, R11,
  R12) are all caught.

---

## 6. Is anything stop-the-line?

**No.**

On `d70d2d6` all layers are green, on a cluster I built. The pass does what the commit says for
blocks in the house form, and it catches drift that `main` provably misses. No tenant boundary,
grant or policy is changed by this commit, and the database after the pass is byte-identical to
the database before it. Every survivor is a gap in **defence against future change**. None is a
defect in what is merged today. On this package's standard, a finding is stop-the-line only if
the merge itself is unsafe, and I have no such finding.

What I put to the Owner, without deciding it:

- **F1 and F2 are the two that matter.** Both make the new mechanism *report success while not
  checking*. The cheap parts of each could land in this change before merge: the pure-function
  test for F1, and the preserved-lines test for F2. Otherwise they become blockers naming this
  file.
- **F3's README sentence is a false claim in a source-of-truth document** and should be corrected
  whichever way F3's remedy goes.
- F4–F7 belong in the blocker list. F7 is a widening of the blocker this change writes.

I approve nothing, and those decisions are not mine.

---

## 7. The main limit on my own run, in my own words

I share an author, a vendor and a model family with the thing I tested, and the author wrote my
brief. The two findings I grade highest came from taking the brief's named classes and asking
what an edit written *to evade the test* looks like, not what an honest edit looks like. I cannot
tell how many further classes sit behind a question neither of us asked.

Concretely:

- **78 mutations is a sample, not a proof.** The drift sample touches about twenty batches. Of the 42
  blocks, I pushed hardest on 030, 061, 070, 100, 102, 120, 121 and 140.
- **Every run used `postgres` as the migration and pass role**, as CI does. A pass run by a
  non-superuser on the provisioned instance could fail differently. The pass runs only on
  `migrate-clean`'s fresh database, never on the provisioned one, so drift made by hand in
  production is outside everything measured here.
- **I did not run CI.** I also did not run `make db-verify` as a whole; I ran each layer the
  brief named separately.
- **The static layer per run was a fast proxy**, and the full suite only for survivors. A
  mutation the proxy caught might, in principle, also have been caught by a second test. That
  can only strengthen a "caught", never a "survivor".

---

*Cluster stopped and removed. The worktree is back at `d70d2d6` plus this file, and
`git status` shows only this file before the commit.*
