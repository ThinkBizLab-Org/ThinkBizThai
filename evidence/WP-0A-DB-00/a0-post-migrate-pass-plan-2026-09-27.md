# A0 plan: the post-migrate assertion pass, put to the Product Owner before any code is written

Author run: `/claude/a0_atlas`. Package `WP-0A-DB-00`. Written 2026-09-27 at head `b07a8d9`, against
state this Author measured itself. This file decides nothing and approves nothing. §9 lists the
questions the Owner has to answer before a line is written.

The Owner chose this work over batch 091 in one sentence: `เอาตามคุณแนะนำ`, answering A0's
recommendation of "A: the post-migrate assertion pass". That sentence chose the work. It did not
answer the questions in §9.

## 1. State measured at the start of this session

| Measure | Read | Expected | Verdict |
|---|---|---|---|
| `main` | `b07a8d9` = origin/main, tree clean | `b07a8d9` | match |
| `npm run verify` | `clean: exit 0 — tests 663, pass 663, fail 0, skipped 0, todo 0` | 663 | match |
| Isolation cases (`buildCases`) | 965 | 965 | match |
| Open PRs | none | 0 | match |
| `open_blockers` | 187 | 187 | match |
| CI on `b07a8d9` | run `35065233928`, success | — | green |

## 2. The hole, stated once

Every batch from 004 to 140 ends with a `do $$ … $$` block that asserts what the batch built:
constraint text, policy expressions, grants, identity columns, triggers, and probe inserts that
must be refused. **Each block runs once, when its own file is applied, and never again.** So a
later file can undo any of those guarantees and every layer stays green.

Q0 demonstrated this on batch 121 as D01h. It was the only drift mutation that survived all three
layers. Batch 121 closed its own instance by copying its key-set assertion into the fixture. Every
other batch still has the hole. The open blocker against A0 Integration names this general form.

What already re-runs after the full set: the FK-support probe in `migrate-clean`
(`scripts/db/run.mjs:1226`), the fixtures and isolation cases in `rls-smoke`, and batch 121's
fixture copy. Nothing else does. The committed catalog snapshot covers only 000–010: its
`not_applied_to_this_instance` list names every file from 011 to 140.

## 3. The measurement that shapes the design

This was run on a private scratch cluster: `initdb --locale=C`, TCP only on `127.0.0.1:5499`, no
unix socket, and the CI shim applied first. `make db-migrate-clean` completed with `ok`. The
Author then extracted **every one of the 42 `do $$` blocks** (the survey's figure of 47 was wrong;
42 is the measured count) and re-ran each block, in its own transaction, against the fully
migrated database.

**32 pass and 10 fail.** The full re-run took 0.73 s. The cluster was then stopped and removed.
The user's server on `:5432` was not touched: it was listening on the same pid afterwards.

| Block | Fails because | The later file that changed it |
|---|---|---|
| `030` L627 | industry_assignments carries 3 restrictive policies; 030 asserts 1 | 031, 102 |
| `040` L725 | 5 restrictive policies; 040 asserts 2 | 042, 102 |
| `070` L1458 | 5; 070 asserts 4 | 071 |
| `080` L753 | 12; 080 asserts 5 | 082, 102 |
| `081` L368 | a FK on `social_account_id` exists; 081 asserts none | **111** (`content_targets_social_scope_fk`) |
| `090` L726 | 9; 090 asserts 3 | 092, 094, 102 |
| `100` L1346 | 10; 100 asserts 4 | 101, 102 |
| `102` L72 | 14 `updated_by` closures; 102 asserts 13 | 120 |
| `110` L1006 | the natural-key set on social_accounts gained a key | 111 |
| `120` L957 | a policy is not `TO authenticated` alone | 122 (`service_path_closed`) |

**Each of these later changes is legitimate.** None is a defect. But the result says two things:

1. **One in four apply-time blocks already states something that is false of `main`.** Each was
   true when it was written. They are snapshots, and nothing marks them as expired.
2. **The 10 are a lower bound on conflicting assertions.** A block stops at its first `raise`, so
   the rest of the assertions in `081` and `120` (for example) have not been checked at all. The
   survey predicted a second conflict in `081` (the restrictive count, changed by 083 and 102)
   that this run could not reach.

The survey also names blocks that are true today but will expire by design. Examples are "no
service role holds a privilege" in 082, 083, 092 and 122, which RFC-2026-022 shape B will change,
and the unique counts in 050 and 061. The design has to treat an expiry as a normal event and
not as a crisis.

## 4. The design A0 recommends

**Re-run the original blocks from the migration files themselves.** Blocks that have been
superseded are named in a register, and each one gets a final-state replacement.

- `migrate-clean`, immediately after the FK probe, extracts every `do $$` block from every
  migration file in lexical order and runs each block in its own transaction. This is the
  precedent the FK probe already set, and it runs in CI through the existing
  `make db-migrate-clean` step, **so no protected file needs editing**.
- A block that a later file legitimately made false is listed in
  `db/foundation/invariants/superseded.json`. Each entry names the block (file and ordinal), the
  later file or files responsible, and a replacement file under `db/foundation/invariants/` that
  restates **every** assertion of that block as it stands at the end of the set, not only the
  line that failed. The replacement runs in place of the block.
- **Three guards keep the register honest:**
  1. A block not in the register must pass.
  2. A block **in** the register must still **fail** when run verbatim. A superseded block that
     starts passing again is a stale entry, and the pass fails.
  3. The replacement must pass.
- There are no copies of the 32 blocks that pass today. The migration file stays the single
  source, so a copy cannot drift from its original. "Never edit a merged migration" is untouched,
  because the replacements are not migrations.
- The rule for every future batch comes for free. Its own block joins the pass without anyone
  doing anything. A batch that makes an earlier block false fails `migrate-clean` until the same
  PR adds a register entry and its replacement. **Changing another batch's guarantee becomes an
  explicit, reviewable line in the diff instead of a silent side effect.** That is the property
  D01h lacked.

Output is a single line inside migrate-clean's report, in the FK probe's style, for example
`post-migrate pass: 42 blocks, 32 re-run as written, 10 superseded and replaced`. A failure names
the block and the replacement.

## 5. What this does not do

- It does not defend shapes that no block asserts. D01h is caught only if some block asserts the
  thing that was dropped. Batch 121 F1 showed that existence-by-name blocks miss content changes;
  this pass re-runs whatever each block says and does not make any block stronger.
- It changes no schema, no policy and no grant. No tenant data path is touched.
- It does not answer any of the three decisions the Owner already owes (the `10^12` bound, A1's
  grading, and §3.3 against §4.8).
- It does not make the catalog snapshot cover 011–140. That is a separate piece of work on the
  provisioned instance.

## 6. Proof that the pass works

- **Q0's D01h, reproduced:** a scratch later migration drops `performance_snapshots_metrics_keys_are_known`,
  and `migrate-clean` must report FAILED and name the 121 block. The same check is run for one
  superseded block, by dropping something that only its replacement asserts.
- **The stale-entry guard:** revert one replacement's cause in a scratch copy, and the pass must
  fail on the register.
- **Contract tests (static, no DB):** every block in every migration is either re-run or
  registered. Every register entry names an existing block, an existing later file, and an
  existing replacement. The pass is wired after the FK probe, following the regex style of the
  existing FK-probe test. The replacements contain no silencers, which extends the existing
  silencer check.
- All of this is measured on a scratch cluster in a private subdirectory. Last pass a role run's
  `initdb` replaced the Author's data directory, so every role run's brief will say that the parent
  scratchpad directory is shared.

## 7. Paths

Everything is within `ownership.writable_paths`: `scripts/db/run.mjs`, `db/foundation/invariants/**`,
`db/foundation/README.md`, `test-kits/db/foundation-contract.test.mjs`, and `evidence/WP-0A-DB-00/**`.
The test-count floor and name digest in `scripts/test-suite-contract.mjs` and the integrity
manifest move through the declared amendment, as every batch has done. **No migration, no
reserved batch number and no `ci.yml` edit.**

## 8. The path

This plan goes to the Owner, whose answers are transcribed verbatim into a disposition file. Then:

1. Create branch `agent/claude/WP-0A-DB-00-post-migrate-pass`, repoint `ownership.branch`, and run
   `npm run regenerate:manifest`.
2. Build the runner, the register, the 10 replacements, the tests and the evidence.
3. Run three role runs (C0, Q0, A1) in isolation worktrees.
4. Cherry-pick with `-x`, then write the handoff last and alone.
5. Open a Draft PR and get CI green on that head. Then the Owner merges.

A stop-the-line finding from any role run halts the merge and comes back to the Owner.

## 9. The questions. A0's recommendation is named on each, and it is only a recommendation

| # | Question | Options | A0 recommends |
|---|---|---|---|
| A | Form of the pass | (a) re-run the original blocks from the migration files, with a supersession register and a full final-state replacement per superseded block (§4). (b) re-run the blocks verbatim and keep an expected-failure list for the 10. Rejected: a block stops at its first raise, so a listed block would be defended by nothing past its first conflict, and the list would hide exactly what D01h is. (c) hand-write a separate final-state invariant file for all 42, which duplicates 32 blocks that are true today and can drift from their originals. | **(a)** |
| B | Scope of the first PR | (a) all 42: the runner, the register, and all 10 replacements. (b) the runner and the 32 now, with the 10 recorded as blockers and replaced in a second PR. That leaves the largest families (080, 090, 100, 120) undefended in between. | **(a)** |
| C | Where it runs | (a) inside `migrate-clean`, after the FK probe. It reaches CI through the existing step with no protected edit. (b) a new `make` target, which needs a `ci.yml` step owned by another package. | **(a)** |
| D | CI negative control | (a) the D01h reproduction and the stale-entry guard as measured evidence plus contract tests, with one `ci.yml` control line (a scratch migration that drops the 121 CHECK must make `migrate-clean` fail) **proposed** to the Integration Owner and not written by this package. (b) no CI line. | **(a)** |
| E | RFC | (a) none. This strengthens a harness inside A0's paths, changes no contract meaning, and leaves the forward-fix-only rule intact. The rule is recorded in `db/foundation/README.md`. (b) an RFC, because it changes what a future batch must do when it supersedes an earlier guarantee. | **(a)**. The Owner may reasonably prefer (b) |
| F | Blocker | (a) close the "D01h in general form" blocker on merge, and open one that says §5's first point plainly: blocks that assert existence only remain weak. (b) keep it open. | **(a)** |
| G | Role runs | (a) C0, Q0 and A1 as the package gates require (`security_approved` is one of them), even though no tenant path moves. (b) C0 and Q0 only. | **(a)** |
