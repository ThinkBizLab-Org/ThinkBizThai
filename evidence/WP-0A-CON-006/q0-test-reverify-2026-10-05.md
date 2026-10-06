# WP-0A-CON-006 — Independent Tester re-verification

Package: CTR-USG-001 (Usage and Cost Event) and CTR-NTF-001 (Notification Command and Result)
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas`, a different run, so role separation holds.
Subject: PR #194, branch `agent/claude/WP-0A-CON-006-stale-blockers`, head
`87bd60fb80ad69a0bd91c1b8b3a0a4e4b618b75e` (work `a9916c0`, merge of `main` `b5d21d5` at `6da7487`,
handoff `87bd60f`). `origin/main` = `b5d21d5` when measured, so the branch is not behind.
Earlier verdicts re-checked: `evidence/WP-0A-CON-006/test-verdict.md` (`5c6eef2`) and
`evidence/WP-0A-CON-006/test-verdict-generated-fixtures.md` (`9a82456`), both
`test_verified_with_conditions`.
Protocol version: `1.0.0`. Date of run: 2026-10-06 (the file name carries the date the task named).

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`, the Author run of this package, acting in the
Tester role `/claude/q0_sentinel` under RFC-2026-024 §3/3-4. A0 computed the task text, including
its own list of what is done and not done. I took none of those claims as given: every "done" item
below was checked against the tree, against git history, or by a run. I share a vendor and a model
with the Author; RFC-2026-024 withdrew the cross-vendor condition and the Owner applied that to this
package on 2026-10-05 (step 2 item 1). I am not the Reviewer, the Security reviewer or the
Integration Owner. This file authorizes no merge and moves no gate. I fixed nothing.

Toolchain: `node v24.20.0`, `npm 11.19.0` through `zsh -lc`. Nothing was downloaded except a clone
of this repository. No database was started and port 5593 was not used: the package declares no
database test, and the DB suites in `npm run check` run statically with `DB_TEST_URL` empty.

## 1. Measured vs read

**Measured** (run by me, this session):

- A private clone in `.../scratchpad/q0-WP-0A-CON-006/clone`, checked out **on the branch name**
  (`git branch --show-current` = `agent/claude/WP-0A-CON-006-stale-blockers`, `HEAD` = `87bd60f`),
  `origin` pointed at the GitHub remote and `origin/main`/`origin/HEAD` fetched to `b5d21d5`.
- `npm run check`, `check:handoff`, `check:scope origin/main WP-0A-CON-006`, the role-separation
  validator, and the four contract suites on their own (§2).
- Assertion-site invariance of both schemas between `b5d21d5` and `87bd60f`, all fixtures of both
  contracts against their schemas with error counts, the byte-identity of the deleted fixture,
  `outputs.files` against the tree, the integrity-manifest digest (§3).
- My own C5 re-derivation from git history of `79fbc33` (§4).
- Three destructive probes on copies of the clone (§5).

**Read, not measured:** the Owner's step-2 disposition file (existence and the reply line only), the
manifest notes, the Author's closure file. I did not re-run the catalog-wide mutation metric
independently this time; I rely on `schema-mutation-coverage.test.mjs` passing with exact tables.

## 2. Declared tests

| Command (clone, branch name) | Exit | Result |
|---|---|---|
| `npm run check` | **0** | `tests 692 / pass 692 / fail 0 / cancelled 0 / skipped 0 / todo 0` (716.9 s) |
| `npm run check` second run, after `origin/HEAD` was set to `origin/main` | **0** | `tests 692 / pass 692 / fail 0 / skipped 0 / todo 0` (735.1 s) |
| `node --test` four contract suites (`schema-mutation-coverage`, `catalog-registry`, `shared-kernel-schema-conformance`, `shared-kernel-contract-catalog`) | **0** | 37/37 |
| `npm run check:handoff` | **0** | `describes the branch: nothing substantive after its cited head` |
| `npm run check:scope -- origin/main WP-0A-CON-006` | **0** | `all 10 changed path(s) are declared, and every amendment explains one` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-006.json` | **0** | |

Note on a measurement error of my own: my first `check:handoff` exited **91** because my clone's
`origin/HEAD` pointed at the worktree I cloned from (`87bd60f`), not at `main`. After
`git remote set-head origin main` it exits 0. The first `npm run check` was started before that fix,
which is why it was re-run (§2a). A clone whose `origin/HEAD` is wrong reads the handoff guard
wrongly in both directions; the result in the table is the corrected one.

### 2a. Second `npm run check`

Re-run from a clean clone state with `origin/HEAD` = `origin/main` = `b5d21d5` and the branch
name checked out: exit 0, 692/692. Both runs agree.

The 692 count equals the Author's pre-edit count on this branch name (692, of which 2 failed on the
stale handoff). No test was added or removed by this branch, which is consistent with the diff:
`schema-mutation-coverage.test.mjs` untouched, `catalog-registry.test.mjs` 5 lines changed.

## 3. The "done" claims, measured

| A0 claim | Measured | Holds |
|---|---|---|
| No assertion site moved in either schema | Both schemas, with every `x-*`, `description` and `title` key stripped, are byte-identical (`JSON.stringify`) between `b5d21d5` and `87bd60f` | **Yes** |
| H-2: 16-digit bound declared an inference | `cost.amount.x-source` now says so and says the fixture name is historical | Yes (text) |
| §4 / my finding 6: fraction asymmetry declared | `quantity.amount.x-source` declares 2–8 vs 0–8 on purpose, as an inference. My earlier sign and magnitude axes were already closed (no `-`, 16-digit bound on both) | **Closed** |
| H-9: `invalid-float-cost.json` single fault | subset validator: **1 error**, `$.cost.amount: does not match pattern …` (was 2 at `9a82456`) | **Yes** — but see §5 P1 |
| H-8: duplicate removed | at `b5d21d5` both files had md5 `f9991dca…26e8764d…`; the kept `invalid-failure-without-class.json` still does; it fails with **1 error**, `$.delivery: missing required property 'failure_class'` | **Yes** |
| H-10, B-6, N-8 manifest text | NTF `freeze_boundary` has no duplicated clause; `untestable_by_fixture` now says the const was removed; `source_references` has no `K MK-006` | Yes |
| Fixtures vs manifest | USG 47 on disk = 47 declared; NTF 30 = 30; zero `valid*` rejected, zero `invalid-*` accepted | Yes |
| H-7: `outputs.files` regenerated | 89 entries; 0 declared-but-absent; 0 files under the two contract dirs and `evidence/WP-0A-CON-006/` undeclared | **Yes** |
| Six pins moved, one digest | `catalog-registry.test.mjs`: 5 changed lines = 6 pins (NTF caveat line carries two); the `FIXTURE_SET` diff removes exactly `invalid-failure-missing-class-only.json`. `shasum -a 256` of the file = `441fb17b…ef974de7` = the new integrity-manifest value | **Yes** |
| Owner step 2 item 1 | `prefer_cross_vendor_review: false`; exception text records the withdrawal; disposition file exists with the reply at line 83 | Yes (read) |
| Remaining CTR-USG-001 / CTR-NTF-001 coverage | `SITE_FLOOR` 37 / 39, `UNKILLED_CEILING` 1 / 9 → 36/37 and 30/39 killed; suite passes with exact tables | Yes |

## 4. My earlier conditions

### `test-verdict.md` §12 (`5c6eef2`)

| # | Condition | State at `87bd60f` |
|---|---|---|
| 1 | Vacuous USG `allOf` | **Closed.** Measured from history: `79fbc33` reduced it to `[]`; the key is absent at this head (`"allOf" in schema` → `false`). |
| 2 | `PROTECTED` entries; both contracts in the guard | **Closed.** 4 USG and 6 NTF entries (`schema-mutation-coverage.test.mjs:50-59`), including NTF `deep_link.required`, `requires_permission.const`, `target_ref.pattern`, `delivery.state.enum`, `locale.enum`, root `required`; USG root `required`, both amount patterns, `currency.enum`. `metric_labels` (my U11) no longer exists. |
| 3 | Split the double-fault failure fixture | **Closed.** The rollback const is gone; the remaining fixture is single-fault (1 error) and its twin is deleted. |
| 4 | Owners rule on negative cost and quantity scale | **Closed for this contract.** No sign is accepted; quantity scale is bounded and the asymmetry declared as an inference. Refund policy stays OPEN-001, which is correct: nothing here materializes it. |
| 5 | Ownership irregularity | **Stands** (B-7, A5 ratification). Outside the Tester's reach. |

### `test-verdict-generated-fixtures.md` (`9a82456`)

| # | Condition | State |
|---|---|---|
| C1 | Metric gameable by deleting untested rules | **Held, not closed.** The exact `SITE_FLOOR`/`UNKILLED_CEILING` tables now make a deletion visible. Remainder owed by WP-0A-CON-003. |
| C2 | 71 % mechanical fixtures | Qualification only; recorded in `open_blockers`. Not a defect. |
| C3 | Conditional sites trail | Owed by CON-003 (generator not in tree). |
| C4 | Schema without manifest exempt | Closed before this branch, per A0; not re-probed this run. |
| C5 | No before/after diff of the generating commit | **Closed, by my own measurement.** `git show --name-status 79fbc33`: 442 A, 19 M, 1 D. Every A outside `examples/invalid-*` is `review-contract-head.md`; no `examples/` file is M. The only schema M is CTR-USG-001; stripped of annotations it differs from `79fbc33^` **only** in `allOf` (one `if provider_reported then require supersedes_usage_id` → `[]`). The 13 other manifests changed only `fixtures`; USG also changed `untestable_by_fixture`. In all 14 the non-`invalid-` fixture entries are the same set before and after (order changed only in `ctr-api-001` and `ctr-err-001`). The only fixture removed is `invalid-reported-without-supersedes.json`, which went with the rule. A0's answer is accurate. |

## 5. Destructive probes (copies of the clone; contract suites only)

| # | Probe | Expected if held | Observed |
|---|---|---|---|
| P1 | Revert H-9: set `invalid-float-cost.json` `basis` back to `list_price` (a value not in the enum: the fixture becomes double-faulted again) | red | **exit 0, 79/79** |
| P2 | Re-add the deleted duplicate to `examples/` and to the NTF manifest | red | exit 1 — `the fixture set is what it was…` |
| P3 | Restore `b5d21d5`'s USG `schema.json` (drop the two new `x-source` sentences) | red | exit 1 — `an annotation cannot be rewritten…` |

P2 and P3 show the H-8 deletion and the H-2/§4 declarations are held by CON-008's ratchets. P1 shows
the H-9 fix is **not** held by anything: a fixture can silently go back to failing twice, and
carrying a `basis` that the enum rejects, at exit 0. Today another fixture also kills
`cost.amount.pattern`, so the mutation tables did not notice either. Finding N2.

## 6. Findings

**N1 — The `integration_owner_note` says more than was measured. Low; for C0 and R0.**
The note states "no file in this package's writable paths, and no entry in this manifest, records an
acknowledgement pending against `/root/r0_steward`". `evidence/WP-0A-CON-006/review-contract-head.md:383-385`
(inside `evidence/WP-0A-CON-006/**`) is C0's H-6 condition: record the CTR-EVT/JOB fixture amendment
in `x-amended-by` "and carry `/root/r0_steward`'s acknowledgement". At this head neither
`ctr-evt-001` nor `ctr-job-001` carries a CON-006 `x-amended-by` entry; their existing entries are
CON-002 and CON-005. A0's own grep (closure file §5) covered the manifest, the contract dirs and the
handoff, not `evidence/`. H-6 is therefore open, and under the Owner's step 2 item 2 its
acknowledgement would run to `/claude/r0_steward`. Whether H-6 still binds is C0's call, not mine.

**N2 — H-9's single-fault fix is not pinned. Low.** P1 above. A guard that every `invalid-*`
fixture fails with exactly one schema error (or that each kills exactly one site) would hold H-9 and
H-8's class generally. It belongs in CON-003's or CON-008's file, not in this package.

**N3 — One USG fixture still reports two errors. Observational.**
`invalid-dedupe-key-minlength.json` (`dedupe_key: ""`) fails both `minLength` and `pattern`. This is
the dead `dedupe_key.minLength` site A0 lists as owed with CON-003; it is unchanged by this branch
(md5 identical at `b5d21d5` and `87bd60f`) and excused in `UNKILLED_SITES`. Recorded so the count is
not mistaken for a new double fault.

**Not-done items.** I checked the reasons A0 gives for the ten unbounded reference fields, the dead
`minLength`, the CON-003/CON-001 remainders and the role verdicts. They are consistent with what I
measured: adding `maxLength` would change `SITE_FLOOR` and `FIXTURE_SET`, which are not this
package's files, and I measured no assertion-site change at this head. None of these is a Tester
condition I set, except that N-6 (`message_key`) overlaps my earlier note on free text, and it
stays owed.

## 7. Stop-the-line and merge

**Stop-the-line: no.** No secret, tenant leak, duplicate side effect, lost job, migration divergence,
irreversible deletion or contract mismatch. No assertion keyword moved in either contract, every
fixture agrees with its schema, and the index is untouched.

**Does anything block the merge?** Nothing from the Tester. The merge is still blocked by things
that are not mine to give: no A1 Security verdict has ever been recorded for this package, C0's
`changes_requested` at `337dfe7` has not been re-verified at this head (and N1 says H-6 looks open),
R0's integration verdict and its acknowledgement of the two amendments are absent, and PR #194's
`bootstrap` CI check is green (§8). This file also adds a commit after the handoff commit, so the
handoff must be refreshed (last and alone) before merge, as on WP-0A-CON-005.

## 8. Results recorded after the long runs

| Item | Result |
|---|---|
| `npm run check`, run 1 | exit 0, 692/692 |
| `npm run check`, run 2 (corrected `origin/HEAD`) | exit 0, 692/692 |
| PR #194 `bootstrap` at `87bd60f` | `SUCCESS`, run `37378512942`, job `111993989449` |
| PR #194 state | Draft, `MERGEABLE`, `mergeStateStatus: BLOCKED` |

## 9. Conditions carried by this verdict

1. **N2** — pin the single-fault property of `invalid-*` fixtures (owed to CON-003 or CON-008; not
   blocking this package).
2. **C1 / C3** of `9a82456` remain owed by WP-0A-CON-003, held meanwhile by the exact tables.
3. **N1** — C0 should rule on whether H-6 still binds; if it does, the CTR-EVT/JOB `x-amended-by`
   entry and its acknowledgement by `/claude/r0_steward` are owed, and the `integration_owner_note`
   should be corrected.
4. The ten unbounded reference fields (incl. N-6 `message_key`) stay owed by this package after #188.

VERDICT: test_verified_with_conditions
