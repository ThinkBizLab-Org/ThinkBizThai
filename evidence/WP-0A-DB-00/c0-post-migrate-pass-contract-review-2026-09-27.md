# C0 contract review: the post-migrate assertion pass

| Field | Value |
|---|---|
| Run | `/claude/c0_contract_reviewer` |
| Role | Independent Reviewer (contract), work package `WP-0A-DB-00` |
| Subject branch | `agent/claude/WP-0A-DB-00-post-migrate-pass` |
| Subject head | `d70d2d6` |
| Base | `b07a8d9` (`main`) |
| Author | `/claude/a0_atlas` |
| Date | 2026-09-27 |
| Reviewed in | local branch `review/c0-post-migrate-pass` at `d70d2d6`, in a worktree |

This document records review findings. It advances no status, approves nothing, and signs
nothing on anyone's behalf.

## §0 What I am, before anything else

- I am a subagent **spawned by the Author run `/claude/a0_atlas`**. I run in a git worktree that
  A0 created, under a brief that A0 wrote. A0 chose the questions I was asked. I went beyond them
  where I judged it necessary, but the framing is A0's.
- I am the **same vendor and model family** as the Author (Claude). RFC-2026-024 withdrew the
  cross-vendor condition, so that is not by itself a bar. It is still a real limit on independence,
  and a reader should weigh it.
- Whether this file counts as the Reviewer signature that RFC-2026-002 requires is for the
  **Integration Owner and the Product Owner** to decide. I do not decide it.

## §1 Verdict in one paragraph

The pass does what the plan and the Owner's seven answers asked for, and it does it in the place
they named. On a fresh private cluster I measured the clean set passing: 42 blocks, 32 re-run as
written, 10 replaced. I extracted all ten superseded blocks mechanically and diffed them against
their replacements. Every change is additive, meaning a pinned-set check or a name exclusion. No
original assertion is deleted, and every `superseded_by` list is exact.

Two exclusions are not scoped to their table. They make the 120 and 110 replacements weaker than
their later files require, and I measured that live (F2). The branch also fails the repository's
own CI branch-scope guard at this head, and the ownership rationale it carries is false of this
diff (F1). I found nothing that is stop-the-line under CONTRIBUTING_AGENTS.md.

## §2 What I ran

- `npm run verify` on `d70d2d6`: `clean: exit 0 — tests 666, pass 666, fail 0, skipped 0, todo 0`.
- `node scripts/verify-branch-scope.mjs b07a8d9 WP-0A-DB-00`: **exit 73** (F1).
- `node scripts/verify-test-coverage-floor.mjs`: exit 0.
- I counted with the guard's own `stripNonCode`/`countDeclaredTests` and its regexes, loaded from
  `scripts/verify-test-coverage-floor.mjs`:

  | File version | Tests | Assertions | Name digest |
  |---|---|---|---|
  | foundation-contract at `b07a8d9` | 63 | 258 | `9de2dd9f7b8d4dd1` |
  | foundation-contract at `d70d2d6` | 66 | 276 | `8d4342714827eb37` |

  These match the floors and the digest in `scripts/test-suite-contract.mjs`. The floors equal the
  measured counts, with no slack.
- I extracted blocks mechanically with my own script, not with the Author's code. A block is a
  line exactly `do $$` through the next line exactly `end $$;`, with an ordinal per file. Result:
  **42 blocks**, the same list as the plan. `grep -i` for any other `do` opener in the migrations
  found none.
- Live database: PostgreSQL 17.11 at `127.0.0.1:5505`, TCP only (`unix_socket_directories=''`),
  `initdb --locale=C -A trust -U postgres`, started with `LC_ALL=C`, cluster in a private
  subdirectory `scratchpad/c0-review/pg`. I applied `supabase-shim.sql` first and then ran
  `DB_TEST_URL=... make db-migrate-clean`. I did this in **two rounds, with a re-initdb between
  them**. Both ended `post-migrate pass: 42 apply-time blocks, 32 re-run as written, 10 superseded
  and replaced` / `db-migrate-clean: ok`. The cluster was then stopped and removed. `:5432` was
  not touched: it was listening on pid 750 before and after.
- I ran mutation probes against the migrated database. Each mutation ran **inside the rolled-back
  transaction of the block under test**, so the database never changed. I used two harnesses. The
  first runs a single original block or replacement after a mutation. The second imports the real
  `postMigratePlan()` and repeats `runLive`'s verbatim/P0001/replacement logic over all 42 blocks.
  The second is a **reproduction** of the runner's loop, not the runner itself (see §5).

## §3 Findings

### F1. HIGH: the branch fails its own CI branch-scope guard, and the ownership rationale is false of this diff

Measured: `node scripts/verify-branch-scope.mjs b07a8d9 WP-0A-DB-00` exits **73**:

```
WP-0A-DB-00 changed 2 path(s) it neither owns nor records as an amendment:
  evidence/VERIFICATION.md
  scripts/test-suite-contract.mjs
```

`.github/workflows/ci.yml:85-114` runs this guard on every `pull_request`, so a Draft PR at this
head would have red CI.

- `work-packages/WP-0A-DB-00.json:111-116`: `ownership.amends_without_owning` is still the
  previous increment's. It lists only `branch-identity.test.mjs` and `integrity-manifest.json`, and
  its rationale says, of a different increment:

  > "neither evidence/VERIFICATION.md nor scripts/test-suite-contract.mjs is touched"

  That sentence is false at `d70d2d6`, which touches both.
- Plan §7 said the floor and digest "move through the declared amendment, as every batch has done".
  The precedent is real: batch 121's head declared both paths, along with ci.yml, branch-identity
  and the manifest. This commit did not move the declaration.
- Every changed path is otherwise inside `writable_paths` or the two declared amendments.
- No protected file is touched. `git diff --stat b07a8d9 d70d2d6` over `.github`, `Makefile`,
  `db/foundation/migrations`, `package*.json` and `contract-catalog` is empty.

This is not stop-the-line. It is a merge blocker until the declaration describes this increment.
I infer that A0 may intend a separate "declarations" commit, as in `945ae2c` and `8d10763`, but
nothing at this head says so.

### F2. MEDIUM: two name exclusions are not scoped to their table, so two replacements are weaker than their later file requires. Measured.

The register (`_editing`), the README (`db/foundation/README.md:284-287`) and the commit message
all claim a restated assertion is pinned so that "anything beyond it still fails". That holds for
the restrictive-policy sets, which are pinned per table. It does **not** hold in two places, where
the exclusion is by name alone and applies across tables that the later file never touched.

1. **`db/foundation/invariants/120_publisher.1.sql:268-271`.** 120's check that every policy on
   the five publisher tables is `TO authenticated` alone now excludes 122's two closure names
   **on any of the five tables**. 122 wrote those names only on `publish_intents` and
   `publish_target_assets`.
   - Measured: inside a rolled-back transaction I ran
     `create policy publish_intents_service_path_closed on app.publish_jobs as permissive for select to public using (true);`.
     The 120 replacement **passes**, 122's own block **passes**, and the whole reproduced pass
     (all 42 blocks) **passes**.
   - The same happens with a permissive `FOR ALL TO PUBLIC USING (true) WITH CHECK (true)` policy
     under that name on `app.published_posts`.
   - 120's original assertion was written to refuse exactly this. 122 does not require giving it
     up.
   - Inferred, not measured: the tables' restrictive narrowings still AND, and `authenticated`
     holds no table-level SELECT on either table. I did not demonstrate a tenant-visible read, and
     I did not run `rls-smoke` against this mutation. So I grade this as a harness-fidelity
     defect, not a leak.
2. **`db/foundation/invariants/110_meta_connector.1.sql:158`.** `con.conname <> 'social_accounts_scope_key'`
   sits in a query over **both** `app.social_accounts` and `private.meta_webhook_inbox`.
   - Measured: `alter table private.meta_webhook_inbox add constraint social_accounts_scope_key unique (id);`
     passes the 110 replacement and the whole reproduced pass.
   - 110's original refused any unique key on the inbox other than `(delivery_hash)`. 111 changed
     only `social_accounts`.

The fix is the Author's to choose. One form: exclude `(relation, name)` pairs, for example
`not (c.relname = 'publish_intents' and pol.polname = 'publish_intents_service_path_closed')`, in
the same way that `081_content_targets.1.sql` already scopes its exclusion to `content_targets`.

Measured controls: the per-table pinned restrictive sets did catch every other probe I made
(listed in §4). That includes a later closure's name reused as a restrictive policy on a sibling
table (040), and a later closure recreated as permissive under the same name (100).

### F3. MEDIUM: answer D's "measured evidence" and the proposed ci.yml line are not in the repository at this head

- Disposition D reads "D01h reproduction and the stale-entry guard as **measured evidence** plus
  contract tests. One `ci.yml` control line is **proposed** to the Integration Owner."
- At `d70d2d6` the only record of the live measurements is the commit message, which claims
  `127.0.0.1:5499`, a dropped 121 CHECK, a 030-only policy, and a stale entry. No evidence file
  records the commands and output. Plan §6 promised both.
- No proposal addressed to the Integration Owner exists in any file, blocker or handoff.
  `handoffs/WP-0A-DB-00-author-handoff.json` is reset (`head = base = b07a8d9`,
  `files_modified: []`), which is consistent with "handoff last and alone" but means it records
  nothing yet.
- Contract tests exist and pass. So D is **partly built**: tests yes, evidence file and proposal
  not yet.
- For the record, I reproduced the D01h half independently in the reproduced pass. Dropping
  `performance_snapshots_metrics_keys_are_known` fails `121_publisher_metrics.sql#1` by name, and
  dropping `usage_events_dimension_known` fails `061_metering.sql#1` by name. I did not reproduce
  the stale-entry half against the live runner (§5).

### F4. LOW: sentences that are not true as written

- `scripts/db/run.mjs:116` and `db/foundation/README.md:267` both say "Every batch ends with a
  `do $$` block that asserts what it built". Measured: 000, 001, 002, 003 and **010** have no
  block. 120 and 131 have two each. Two of the 42 assert nothing:
  - `011_authorization_helpers.sql#1` is `create role app_authz` if missing.
  - `131_billing_projection.sql#1` is `add constraint billing_subscriptions_workspace_key` if
    missing.

  Re-run, these two can never fail. They heal and then roll back, yet the output line counts them
  among the "32 re-run as written". `run.mjs:1297` discloses "two blocks carry
  idempotent DDL guards" but the README and commit message do not.
  - Mitigation, measured: dropping the 131 key is still caught, by `131_billing_projection.sql#2`.
    `011#2` asserts `app_authz`.
  - The plan's own wording ("every batch from 004 to 140") was closer, though still not exact.
- `db/foundation/README.md:285`: "Each change carries a `SUPERSEDED BY nnn` comment." In the seven
  templated replacements (040, 070, 080, 081, 090, 100, 120), the exclusion lines inside the count
  query and the narrowing loop carry **no adjacent** comment. For example
  `040_knowledge.1.sql:131` and `:167`. One header comment at the top of each block describes them
  collectively. Every change is accounted for, but not in the per-site form the README states.
- Minor templating artifacts in the replacement comments: "the ones no later file added" (070,
  120), and "from the 1 restrictive predicates" (120). These are cosmetic.

### F5. LOW: extraction and replacement-shape guards are narrower than their messages say

- `run.mjs:141`: the opener check `/^\s*do\s*\$/i` refuses `DO $body$` and inline blocks, as
  tested. It does not see `do language plpgsql $$` or a `do` with `$$` on the next line. Both would
  escape the pass silently. None exists today (grep).
- `foundation-contract.test.mjs:2301`: "is one do-block and nothing else" is
  `/^do \$\$\n[\s\S]*\nend \$\$;\n$/`. The middle `[\s\S]*` admits `end $$; commit; <sql>; do $$`.
  Because `rerun` wraps the text in `begin; … rollback;`, a replacement written that way would
  commit into the migrate-clean database. The replacement files are reviewed text in A0's paths,
  so this is a NOTE-level trust assumption and not an exploit, but the test's message overstates
  it.

### F6. NOTE: the stale-entry guard proves "still false", not "false for the registered reason"

Guard 2 accepts any `P0001`. Once a block is registered, its verbatim run is defended only by its
replacement. That is sound **only because** each replacement restates every assertion. I verified
that for all ten (§4), subject to F2. A future replacement that drops an assertion would not be
caught by guard 2. Only review would catch it.

### F7. NOTE: blocker replacement timing

Disposition F says "On merge, close … and open one". The commit replaces the blocker text on the
branch (`work-packages/WP-0A-DB-00.json:437`). It takes effect only at merge, so this is
consistent in substance. The count stays at 187 (measured).

## §4 Replacement fidelity, block by block (question 2)

Method: for each block, `diff <extracted original> db/foundation/invariants/<file>.1.sql`. I then
grepped the migrations for the file that creates every name the replacement pins or excludes.
Finally I ran each original and each replacement against the migrated database. All ten originals
fail with P0001 at the raise the plan's §3 table names. All ten replacements pass.

| Block | What the diff shows | Every change from the named later file? | `superseded_by` exact? | Strictness probes (each in a rolled-back txn) |
|---|---|---|---|---|
| 030#1 | + pinned 3-name restrictive set; count query excludes 031/102 names | yes (031, 102) | yes | +1 restrictive → fails; drop 030's narrowing → fails |
| 040#1 | + 2 per-table pinned sets; exclusion in count and in narrowing loop | yes (042, 102) | yes | +1 restrictive → fails; 102 name reused on sibling table → fails |
| 070#1 | + 4 per-table pinned sets; 2 exclusions | yes (071) | yes | +1 restrictive → fails |
| 080#1 | + 5 per-table pinned sets; 2 exclusions | yes (082, 102) | yes | +1 restrictive → fails; drop a 082 closure → fails |
| 081#1 | + pinned set; 2 exclusions; FK check excludes 111's FK by name (scoped to content_targets) and asserts it exists | yes (083, 102, 111) | yes | +1 restrictive → fails; second FK on social_account_id → fails; 111 FK dropped → fails. 111's own block asserts the key's shape and validation (read) |
| 090#1 | + 3 per-table pinned sets; 2 exclusions | yes (092, 094, 102) | yes | +1 restrictive → fails |
| 100#1 | + 4 per-table pinned sets; 2 exclusions | yes (101, 102) | yes | +1 restrictive → fails; closure recreated permissive → fails; closure gutted (restrictive, `true`) → replacement passes, **101's own block fails** (as designed) |
| 102#1 | 13-shape count excludes 120's name; + total-by-name = 14; + 14th's shape | yes (120) | yes | 15th by name → fails; 14th made permissive → fails |
| 110#1 | unique-key query excludes 111's key by name; + key pinned by columns | yes (111) | yes | extra unique on social_accounts → fails; scope key dropped → fails; **same name on the inbox → passes (F2)** |
| 120#1 | + 5 per-table pinned sets; loop exclusion; roles check excludes 122 names | yes (122) | yes | +1 restrictive → fails; 122 closure made permissive → fails; **122 name reused permissive TO PUBLIC on publish_jobs → passes (F2)** |

No original line is deleted in any of the ten. The only `c` hunks append a clause to an existing
`where`. Every name that is pinned or excluded is created by a file in that entry's `superseded_by`
and by no other file (grep over `create policy` / `constraint`). I found no assertion made vacuous.
The weakening is limited to the two unscoped exclusions in F2.

## §5 Limits of this run

- **Independence:** see §0. A0 wrote my brief, created my worktree, and shares my model family.
- **The live runner was measured on the clean set only.** I tried to add a scratch later
  migration to the worktree to drive `make db-migrate-clean` itself into failure. The permission
  system refused the write, and I did not pursue it by another route. Every negative result above
  comes from my reproduction of `runLive`'s loop, which imports the real `postMigratePlan()` and
  uses the same wrap and SQLSTATE rule, with mutations inside rolled-back transactions. It does not
  exercise `runLive`'s own `stderr` messages or its `return 1` paths live. The static test pins
  those.
- I did not run `rls-smoke` or any isolation case, so the claim "left rls-smoke green" is the
  Author's and not mine. I also did not run `migrate-upgrade`.
- I reviewed on a branch named `review/c0-post-migrate-pass`, not on the subject branch name. The
  project's own note says guards that key on the branch name can read differently. `npm run verify`
  was green here. I did not measure it under the subject name.
- I did not read all ten replacements line by line beyond the diff hunks. The rest is byte-identical
  to the originals by `diff`, which is what makes that sufficient.
- CI was not run for this head, and I opened no PR.
