# Q0 independent test: batch 141 preparation (PR #169)

- **Package:** `WP-0A-DB-00`. **Role:** Independent Tester, run `/claude/q0_sentinel`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-141-prep`
  (<https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/169>, Draft, open), head `047a0e2` (handoff alone)
  over code `b99218e`, plan and disposition `f3814e8`, base `c5a648e` (main, PR #168). Author `/claude/a0_atlas`.
- **Reviewed on:** my own branch `review/q0-batch-141-prep`, checked out at `047a0e2` in this worktree. The
  branch name `agent/claude/WP-0A-DB-00-batch-141-prep` is checked out in the Author's worktree, so for the two
  commands that read the branch name (`npm run check:handoff`, `npm run verify`) I pointed this worktree's HEAD
  at that branch by `git symbolic-ref` (same SHA `047a0e2`, clean tree, no commit made, ref not moved) and
  pointed it back to `review/q0-batch-141-prep` straight after. Never detached.
- **Status:** this file records findings. It advances no status, approves nothing and fixes nothing.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, the Author's own workflow, and the same vendor and model family as the
Author (RFC-2026-024). I am independent of the Author's run, but not of its vendor or its orchestration. So this
record is evidence for the Tester role, not that role's signature. Accepting it as the role's signature is the
act of the Integration Owner and the Product Owner.

## 1. Measured vs read

Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`), checked with `node -v` before every measured run;
the PATH Node 26 never ran a measured command.

**Measured (exit codes I observed myself):**

| Command | Where | Exit | Output |
|---|---|---|---|
| `npm run check:handoff` | branch name, `047a0e2` | **0** | "describes the branch: nothing substantive after its cited head" |
| `npm run verify` | branch name, `047a0e2` | **0** | `clean: exit 0 — tests 681, pass 681, fail 0, skipped 0, todo 0` |
| `node scripts/verify-branch-scope.mjs c5a648e WP-0A-DB-00` | `047a0e2` | **0** | "all 25 changed path(s) are declared, and every amendment explains one" (23 at `b99218e`, as the plan says; `git diff --name-only` gives 23 and 25) |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-DB-00-batch-141-prep` | | **0** | `WP-0A-DB-00` |
| `node scripts/regenerate-integrity-manifest.mjs --check` | | **0** | 88 digests; tree unchanged afterwards |
| `node scripts/scan-repository-secrets.mjs` | | **0** | clean |
| `make db-schema-lint` | static | **0** | `db-schema-lint: ok` |
| `make db-contract-check` | static | **0** | ok |
| `node --test test-kits/db/foundation-contract.test.mjs` | | **0** | tests 77, pass 77 |
| assertion and name count (the guard's own `stripNonCode` + `\bassert\.\w+\(`, and its name digest) on `git show` of each tree | `c5a648e` / `047a0e2` | n/a | **549 / 613** assertions, **73 / 77** tests, digest `c125bbd792fa8a92` / `a91ced9f62276ebe`. The plan's "613 = 549 + 64" is true. |
| 81 reversal probes (§2), each one file, restored byte for byte (sha256 compared) | `047a0e2` | n/a | 4 controls survive as they should; 67 of 77 mutations make a batch-141 test fail; the 10 that do not are 8 probes behind Q0-F1 to Q0-F6 (two of them, MG03 and MG11, caught only by existing new-migration tests) and 2 equivalent mutations |
| `gh pr view 169` | | | Draft, open, MERGEABLE, head `047a0e2`, "Bootstrap validation" SUCCESS (run 37135988441) |
| `gh run view 37134594625` | | | "Bootstrap validation", success, head `999456d` (as the disposition says) |
| `gh pr view 168` | | | merged 2026-10-03T15:55:36Z at head `999456d`; merge commit `c5a648e`, parents `75c9274` and `999456d` |

**Live DB: not run, and nothing to remove.** Nothing a live layer reads changed. Of the files changed, only
`db/foundation/lint/service-policy-map.json` is read by `scripts/db/run.mjs`, and only by the static
`schema-lint` target (`run.mjs:2579`, `:2680`, `:3202-3203`). No migration, invariant, fixture SQL, isolation
case, Makefile or CI file changed (`git diff --name-only c5a648e 047a0e2`). I started no cluster on 5503; port
5503 had no listener at the end.

**Read, not measured:** the plan, the disposition, the phase plan's provenance header, the three commit
messages, the handoff's text fields, `open_blockers[33]` (the appended text) and `[191]`, RFC-2026-022 §3 and
§7.2, RFC-2026-023's and RFC-2026-025's status lines, SEC-009/SEC-016/OB-005 source lines.

## 2. Reversal probes on the new static tests

Harness: `q0-141-prep/probes.mjs` in the private scratchpad. Each probe mutates one file, runs
`node --test --test-reporter=tap test-kits/db/foundation-contract.test.mjs` (and `make db-schema-lint` when the
file is the service-policy map or a migration), records the failing tests, then restores the file and compares
its sha256 to the original. `git status` was empty after every batch. T1-T4 are the four new tests
(`foundation-contract.test.mjs:3314`, `:3340`, `:3437`, `:3515`).

One method note: my first pass used `spawnSync`'s default 1 MB buffer, and the policy probes' assertion output
(the whole of `140_audit.sql`) overflowed it, which hid T1 from the failing list. I re-ran those eight probes
with a 256 MB buffer and reproduced MG01 by hand; the table below is the re-run.

| probe | mutation | caught by |
|---|---|---|
| CTRL1-4 | coverage map, conformance, policy map, one valid fixture re-serialised with no semantic change | nothing (correct) |
| CM01-CM21, CM24 | producer named; producer_decision dropped; a table no migration creates; unqualified table; category outside the six; short category_note; §8 cell not in the ERD; `section8_cell: []`; null with no note; blocker index 999; quote absent; line +1; blocker 22 with a quote it happens to contain on the wrong line; `blockers: []`; duplicate id; billing row deleted; rights row deleted; schedule row citing 189; **`actions: []`**; `tables: []` with no note; undotted id; file deleted | T2, every one |
| **CM22** | `section8_cell` set to `"Zone"`, the first column of a table at ERD line 68 (§8 is lines 333-435) | **nothing** (Q0-F3) |
| **CM23** | row gains `"producer": "trigger"` | **nothing** (Q0-F4) |
| **CM25** | support row drops its `open_blockers[191]` citation | **nothing** (Q0-F2) |
| SC01-SC15, SC17 | column dropped; column invented; unmapped path dropped; path both mapped and pinned; pinned path not in the contract; declared flags flipped either way; narrowing dropped; narrowing invented; unused divergence; used divergence removed; column mapped to the wrong path; collapsed copy dropped; `not_governed` removed; **`columns`, `unmapped_contract_paths`, `type_narrowings` all emptied**; file deleted | T3 (SC09, SC17 also T4; SC14 T4) |
| SC16 | `actor_id.paths` order reversed | nothing: equivalent, both paths required strings |
| FX01-FX04, FX06-FX12 | invalid fixture removed; second error added; made valid; fails for another reason; valid fixture's copies disagree; non-uuid `audit_id`; made invalid; non-uuid `workspace_id`; a valid fixture removed (4 -> 3); an extra `invalid-*` with no expectation; categories spanned 4 -> 3 | T4, every one |
| **FX05** | `invalid-category-rights.json`'s category `rights` -> `zzz` | **nothing** (Q0-F5) |
| SP01-SP08, SP10 | shape `discovered`; security_events row removed; row duplicated; batch renamed; `role` key added; `why` loses Q141-a; service column `P`; operation `update`; table that does not exist | T1 every one; lint exit 2 for SP03, SP05, SP10 and six existing map tests with them |
| SP09 | `table: "app.audit_logs"` (qualified) | nothing: equivalent by design (T1 and the lint accept both forms) |
| MG01 | `create policy ... on app.audit_logs` appended to 140 | T1 (and one existing map test) |
| MG02 | new `999_probe.sql` with that policy | T1, and 18 existing tests (catalog snapshot drift) |
| **MG03** | new `999_probe.sql`, `create policy p on "app"."audit_logs"` | **not T1**; 17 existing tests, all because a new migration file exists (Q0-F6) |
| **MG04**, **MG05** | a `jsonb` / `bigint` column added inside 140's `create table app.audit_logs` | **nothing** (Q0-F1) |
| MG06-MG10 | a `text` column added; `causation_id` NOT NULL; outcome vocabulary widened; `action_name` length 96 -> 128; pii dropped from the redaction CHECK | T3 |
| **MG11** | new `999_probe.sql`: `alter table app.audit_logs add column details jsonb ...` | **not T1-T4**; only the generic new-migration tests (Q0-F1) |
| WP01, WP02 | blocker 33 loses "four divergences are declared in the migration header"; blocker 191 loses its support sentence | T3; T2 |

**Vacuity.** The tests do not pass on empty input: `actions: []` (CM19), an emptied conformance reading (SC15),
fewer than four valid fixtures (FX10) and every deleted file (CM24, SC17, FX01) fail. The validator
(`test-kits/contracts/json-schema-subset.mjs:39`) throws on any keyword it does not implement, and every keyword
CTR-AUD-001 uses is one it implements, so a valid fixture cannot pass by an ignored keyword.

**Each invalid fixture fails for exactly its stated reason.** Measured directly (`fxdiff.mjs`): each yields
exactly one error, equal to its expected prefix, and each is its nearest valid fixture with one or two leaves
changed (the two category fixtures also change `action.name` to match; the delete fixture moves `before_ref` to
`after_ref`, which the `minProperties` on `change` needs). No incidental second reason.

## 3. Claims checked

True as written, re-measured or read at source:

- The commit messages of `3d9ede0`, `b6c0206`, `b99218e`, `f3814e8`, `047a0e2`: floors 73 -> 77 and 525 -> 613,
  the name digest, 88 digests, VERIFICATION 677 -> 681 (681/681 measured), "no migration, no policy, no grant"
  (no file under `db/foundation/migrations/` changed), scope exit 0, schema-lint 0, contract-check 0.
- `_what_batch_140_classified_in_141_prep`: `b0267f5` added 140 on 2026-09-07, `2e08e57` created the map on
  2026-09-08, and `git show 75c9274:db/foundation/lint/service-policy-map.json` has zero hits for `audit`.
  `140_audit.sql:740-741` are the two `grant select, insert ... to app_worker` lines.
- Plan citations: RFC-022:175 (Audit/security INSERT, CARRIED), :180 (Security event details SELECT, "with a
  caveat"), :504-514 (§7.2 and its sketch), `run.mjs:2606` (`CELL_FIELDS`), `:2608`, `:2680`, `:3202-3203`,
  `foundation-contract.test.mjs:1656`; ERD rows 366, 378, 385, 400-402. The phase plan's corrected citations I
  sampled at `75c9274` (WP:79-83, WP:96, WP:382, ERD:440, ERD:852, WS:795, :909, :911, :914) are right.
- `open_blockers`: only `[33]` changed (an append; the prior text is an exact prefix) and `[191]` is new; 192
  blockers, and `open_blockers[i]` is on line `254+i` for every one (0 mismatches). F14 is true.
- Disposition: both Owner sentences are in `product-owner-disposition-2026-10-03-batch-129.md` §1 (lines 12,
  21); the delegation is batch 127 §6 (line 75); merge time, head, merge commit and run 37134594625 match
  GitHub. It records the merge as A0 executing the delegation and keeps the RFC-2026-025 §5 points open.
  RFC-2026-023 is "In review"; RFC-2026-022's map note `_not_in_effect` is at line 15.
- Q141-a/b/c are listed UNANSWERED in the plan, the disposition and the handoff, and nothing on the branch takes
  one: every coverage-map row says `UNDECIDED`, no policy and no migration exist.
- The handoff: `base_revision` `c5a648e`, head `f3814e8`, 17 added / 7 modified / 0 deleted, `final_status`
  `author_complete`; `check:handoff` exits 0 on the branch name.

One stale figure (Q0-F7): the handoff's `tests[2]` records `verify-branch-scope` as "all 23 changed path(s)"
without saying at which commit; at its own cited head `f3814e8` and at `047a0e2` it is 25.

## 4. Findings

| id | grade | finding | file:line | remedy |
|---|---|---|---|---|
| Q0-F1 | MEDIUM | T3's "both directions" covers less of the store than it says. `columnsOf` only recognises a column whose type is `uuid\|text\|timestamptz\|boolean\|bytea`, and only in 140's `create table`. A `jsonb` or `bigint` column added there (MG04, MG05), or any column a later migration adds with `alter table app.audit_logs` (MG11), leaves T3 green. `details jsonb` is exactly the shape that would quietly undo the declared divergence `no_details_column` while the pin still says it holds. Not stop-the-line: 140 is integrated and nothing adds a column today, and a new migration fails the catalog-snapshot tests until its digest is regenerated, which a real migration does anyway. | `test-kits/db/foundation-contract.test.mjs:3307`, `:3439-3447` | Read every column line whatever its type (any `^\s{2}(\w+)\s+\S` that is not `constraint`), and fail on any later migration that names `app.audit_logs` or `app.security_events` in an `alter table`, the way T1 already scans later migrations for policies. |
| Q0-F2 | LOW | Nothing holds the support row's citation of `open_blockers[191]`, which this batch added for F7 (plan §5; commit `b99218e`). Dropping it (CM25) leaves every test green. T2 holds the 156 and 190 citations by name and not 191. | `test-kits/db/foundation-contract.test.mjs:3404-3408`; `db/foundation/lint/audit-coverage-map.json` (support row) | Add `assert.ok(map.actions.some((a) => a.id === 'support.break_glass_access' && a.blockers.some((b) => b.index === 191)))` beside the 156/190 checks. |
| Q0-F3 | LOW | The §8 cell check accepts any first-column cell anywhere in the ERD, though its message says "a row of the ERD's §8 matrices". `"Zone"` (ERD:68, a header outside §8) passes (CM22). | `test-kits/db/foundation-contract.test.mjs:3384` | Search only the §8 slice (from `## 8` to `## 9`). |
| Q0-F4 | LOW | A coverage-map row has no closed key set. A row carrying `"producer": "trigger"` passes (CM23), although the map's own `_undecided` says a row naming a producer would be Q141-a taken in a lint file. `servicePolicyMapLint` closes its rows (`CELL_FIELDS`); this map does not. | `test-kits/db/foundation-contract.test.mjs:3363`; `audit-coverage-map.json` `_shape` | Assert each row's keys are a subset of `_shape`'s keys plus the declared `*_note` fields. |
| Q0-F5 | LOW | The two category fixtures, the evidence for F6, are held only by their error prefix, so `rights` -> `zzz` (FX05) still passes; the fixtures can drift away from the finding they exist to show. | `test-kits/db/foundation-contract.test.mjs:3522-3523` | Assert `doc.action.category` is `rights` and `schedule` respectively. |
| Q0-F6 | LOW | T1's scan of later migrations misses quoted identifiers: `create policy p on "app"."audit_logs"` (MG03) is not T1's failure. Today any new migration fails 17 other tests until the snapshot is regenerated, so this matters only once a real migration has passed those. | `test-kits/db/foundation-contract.test.mjs:3335` | Strip `"` before matching, or match `on\s+"?app"?\s*\.\s*"?(audit_logs\|security_events)"?`. |
| Q0-F7 | INFO | The handoff's branch-scope line says 23 paths with no commit; at its cited head it is 25. Exit 0 either way. | `handoffs/WP-0A-DB-00-author-handoff.json` `tests[2]` | Name the commit (`at b99218e`) or the head's count at the next refresh. |

Equivalent mutations, not findings: SC16 (path order where both paths agree), SP09 (qualified table name).

## 5. Stop-the-line verdict

**No stop-the-line.** No secret, tenant leak, migration divergence, duplicate side effect or contract mismatch is
introduced: the branch adds no migration, policy or grant, and every changed file is lint data, a fixture, a
static test or a record. The divergences it records (F1-F6) are existing gaps between 140 and a Draft contract,
pinned and owed to Q141-b. They are not created by this branch.

**Q0 findings that block the merge: none.** Q0-F1 is the one I would want fixed before batch 141 writes a
migration, because that is when a column can be added. Whether to merge is not mine to decide. The disposition
itself records Integration Owner evidence as still owed (RFC-2026-025 §5), and the C0 and A1 role runs are
separate.

## 6. Limits

- Static only. No live DB round, for the reason in §1.
- The probes exercise `foundation-contract.test.mjs` and `make db-schema-lint`. They are not a full
  `npm run check` per probe; the full suite ran once, unmutated, through `npm run verify`.
- I could not check out the branch name in a second worktree. The branch-name runs used `git symbolic-ref` on
  this worktree at the same SHA, which reads the same name through `git rev-parse --abbrev-ref HEAD`, the call
  the handoff guard makes (`scripts/refresh-author-handoff.mjs:300`).
- Owner words are checked against the repository's earlier transcription, not against the Owner's chat.
- Same vendor and model family as the Author (§0).
