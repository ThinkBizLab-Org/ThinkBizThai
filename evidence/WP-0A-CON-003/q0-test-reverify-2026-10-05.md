# WP-0A-CON-003 — Independent Tester re-verification at the 2026-10-06 head

Package: Module Manifest and Lifecycle (CTR-MOD-001) and Feature Policy Decision (CTR-FLG-001)
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas`, which is a different run.
Subject: PR #195, branch `agent/claude/WP-0A-CON-003-stale-blockers`, head
`e5fa682dbff206040d6cd908887bde468eb560e1`. The branch was cut from `8c089cc0`. `origin/main` is now
`fa102298aa71ef5031c644501a42e50a7eb953b6`, so the PR is **behind `main` by two merges**, #187 and #188 (see Q-1).
Earlier verdict re-checked: `evidence/WP-0A-CON-003/test-verdict.md` (`test_verified_with_conditions`,
commit `2649401`, 2026-09-01). This is my first re-verification of this package.
Protocol version: `1.0.0`. Gate: G0. Synthetic only, with no provider, no credentials and no database.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`'s workflow orchestration, running as the Tester role
`/claude/q0_sentinel` under RFC-2026-024 §3/3-4. The run that spawned me is this package's Author. Every
assigned role run on this package is the same vendor and model. Since the Product Owner's step-2 answer of
2026-10-05, this is no longer a recorded exception for this package. This branch records that withdrawal in
`independence.cross_vendor_exception`. The reader should still know that the Author's workflow launched the
Tester. What keeps this run independent is how it worked. I re-derived every figure below on a private clone
and on scratch extractions, and I copied no number from the Author's closure record. Where I agree with it, I
agree because my own measurement agrees. I do not fix anything. I wrote this one file and nothing else.

**This is independent Tester evidence only.** It is not the contract review, the security review or the
integration verdict. It authorizes no merge and no gate movement.

## 1. Measured versus read

| Measured by this run, at `e5fa682` unless stated | Read, not re-measured |
|---|---|
| every command in §2, with exit codes | the CI log beyond the failing step's output and the step list (§2) |
| 30 probes on the shipped schemas, at the head, at `8c089cc` and on a head-plus-`main` tree (§3) | C0's and A1's conditions, except where they overlap with mine |
| 8 mutations plus a control, each on a fresh extraction of the head (§4) | the Owner's step-2 words and the RFC-2026-004 status line the manifest quotes |
| per-member `required` deletion over every declared fixture, at `8c089cc`, at the head, and merged (§5) | that `.github/workflows/ci.yml` now runs the integrity guard as its own step (C-3; I read the file and the CI step list, and did not re-run G3c or G4) |
| the error count of every `invalid-` fixture against its own schema (§5) | whether this PR is a governance PR (I agree that it touches no RFC, CI file, gate rule or `CONTRIBUTING_AGENTS.md`) |

All repository measurements ran in a private clone,
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/27edf3de-b1b4-4cfe-a757-7d17332ec256/scratchpad/q0-WP-0A-CON-003/clone`.
It was checked out **on the branch name** `agent/claude/WP-0A-CON-003-stale-blockers`, with its upstream set to
`origin/agent/claude/WP-0A-CON-003-stale-blockers`. `git status -sb` shows the branch, not a detached HEAD,
so the handoff guard was not skipped. Probes and mutations ran on `git archive` extractions next to the
clone. No database was started, because nothing in this package's declared commands needs one. Port 5573 was
not used.

## 2. Declared commands, at `e5fa682`, on the branch name

| Command | Result |
|---|---|
| `node --version` / `npm --version` | `v24.20.0` / `11.19.0` |
| `npm ci --ignore-scripts` | exit `0` |
| `npm run check` (`deterministic_commands.verify`) | exit `0`: `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0` |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` (`package_evidence`) | exit `0`: `tests 6, pass 6, skipped 0, todo 0` |
| `node scripts/validate-work-package-ownership.mjs work-packages` (`package_evidence`) | exit `0` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-003.json` | exit `0` |
| `npm run check:handoff` | exit `0`: `handoffs/WP-0A-CON-003-author-handoff.json describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs 8c089cc0 WP-0A-CON-003` | exit `0`: `all 4 changed path(s) are declared, and every amendment explains one` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-003` (`origin/main` = `fa10229`) | **exit `73`**: `changed 25 path(s) it neither owns nor records as an amendment`. All 25 are #187's and #188's files (RFC-2026-006, RFC-2026-009, CON-005 and CON-007 evidence, handoffs and manifests, and two test kits). |
| GitHub CI on PR #195 | run `37379568076`, `bootstrap`, event `pull_request`, `headSha` `e5fa682…`, conclusion **`failure`**. The steps `Verify test-integrity guard` and `Validate repository bootstrap` succeeded. **`Verify branch scope` failed with exit 73**, against `BASE_SHA` `fa102298…`, with the same 25 paths. `Database foundation` and the negative control were **skipped**. The PR is Draft, `OPEN`, `MERGEABLE`, `mergeStateStatus: BEHIND`. |

The Author's handoff reported CI as pending. It has since finished **red**.

## 3. Probes: my earlier attack table, re-run

Each probe is one in-memory document. It is a shipped `valid-` fixture with one change, validated by
`validate()` from `test-kits/contracts/json-schema-subset.mjs` against the shipped schema. All values are
synthetic. The results at the head and on the head-plus-`main` tree are identical, compared programmatically.

| # (2026-09-01) | Attack | At `2649401` | At `e5fa682` |
|---|---|---|---|
| M1 | `ready`, `readiness` omitted | rejected | rejected: `missing required property 'readiness'` |
| M2 | `ready` + `activated: false` | rejected | rejected: `expected const true` |
| **M4 / T-1** | `blocked` + `missing: []` | **ACCEPTED** | **rejected**: `fewer than minItems 1` |
| M5 | `blocked` + `missing: ["quota"]` | rejected | rejected (enum) |
| M6 | `blocked` + `activated: true` | rejected | rejected |
| **M7 / T-5** | `ready` + `activated: true` + `missing: ["health","permission"]` | ACCEPTED | **ACCEPTED** (owed, `open_blockers[11]`(b)) |
| M10 | literal credential in `secret_handles` | rejected | rejected (pattern) |
| M13 | duplicate `capability_key` at two versions | ACCEPTED (disclosed) | ACCEPTED (disclosed, `open_blockers[5]`) |
| F1 | kill switch at `capability` scope | rejected | rejected |
| F2 | kill switch with `effect: allow` | rejected | rejected |
| F3b | `write_disabled: true`, `historical_read_allowed: false` | rejected | rejected |
| F4 | `percentage: 150` | rejected | rejected |
| **F7 / T-4** | `evaluated_scopes` reversed | **ACCEPTED** | **rejected**: prefix enum |
| **F7b / T-4** | decision at `capability` with `evaluated_scopes: ["capability"]` | **ACCEPTED** | **rejected**: prefix enum |
| **F8 / T-4** | decision at `business` with `evaluated_scopes: ["platform"]` | **ACCEPTED** | **ACCEPTED**. Not recorded anywhere (see **Q-2**). |
| **F9-F11 / T-3** | `default_deny`+allow, `explicit_deny`+allow, `explicit_allow`+deny | **ACCEPTED** (all three) | **rejected** (all three) |
| T-3 remainder | `percentage_bucket`, `effect: allow`, `bucket.allocated: false` | not probed | ACCEPTED (owed, `open_blockers[11]`(f)) |
| F6 / F6b / T-6 | permanent decision with no `audit`; kill switch with no `audit` | ACCEPTED | ACCEPTED (owed, `open_blockers[11]`(g)) |
| C0 #10 | `permissions: []` | n/a | ACCEPTED (owed, (a)) |
| CS-2 | `secret:` + 400 characters | n/a | ACCEPTED (owed, `open_blockers[1]`) |
| CS-5 | `tenant-data` with no `retention_reference` | n/a | ACCEPTED (owed, (d)) |
| S-4 | `initializing` / `registered` / `draining` with no `readiness` | n/a | ACCEPTED, all three (owed, (b)) |
| CS-4 | kill switch, `write_disabled` omitted, `historical_read_allowed: false` | n/a | ACCEPTED (owed, (c)) |
| T-7 | `invalid-temporary-without-expiry.json` as shipped | two errors (`expires_at` **and** `owner_role`) | one error: `missing required property 'expires_at'` |
| T-7 | that fixture with `expires_at` added | still rejected (on `owner_role`) | **ACCEPTED**, so it isolates the expiry obligation |
| T-7 | `invalid-temporary-without-owner.json` with `owner_role` added | ACCEPTED | ACCEPTED |

Every row the Author's closure record lists agrees with my measurement. The one row it omits is F8.

## 4. Mutation campaign, at `e5fa682`

Each mutation ran on a fresh copy of a `git archive` extraction of the head. Each copy then ran all 11
`test-kits/contracts/*.test.mjs` suites, 79 tests. The unmutated control passes 79/79 with exit 0.

| # | Mutation | At `2649401` | At `e5fa682`: exit, and the messages that fired |
|---|---|---|---|
| C | delete `secret_handles.items.pattern` (PT-010) | **exit 0**, 85/85 | **exit 1**, 75/79: `ctr-mod-001 — 86 constraint sites, below its declared floor of 87`, `properties.secret_handles.items.pattern does not exist — the protected-site list is stale` |
| D | `evaluated_scopes` loses its enum | **exit 0** | **exit 1**, 73/79: `15 constraint sites killed by no fixture, but 14 declared`, protected-site list stale |
| E | delete `expires_at` alone from the temporary branch's `audit.required` | **exit 0** | **exit 1**, 77/79: constraint-surface digest **and** `invalid-temporary-without-expiry.json is named invalid but its schema accepts it`. The second message is the T-7 fix doing its job. |
| E2 | delete `owner_role` alone, same place | not run | **exit 1**, 77/79: digest and `invalid-temporary-without-owner.json is named invalid but its schema accepts it` |
| F | delete `bucket.percentage` `minimum` and `maximum` | **exit 0** | **exit 1**, 75/79: `72 constraint sites, below its declared floor of 74` |
| G | delete `readiness.missing.items.enum` | **exit 0** | **exit 1**, 75/79: floor and protected-site list |
| T1 | delete `minItems` from the `blocked` branch's `missing` | n/a (did not exist) | **exit 1**, 76/79: floor and `UNKILLED_CEILING says 10, measured 9` |
| **R** | **revert the T-7 fix**: drop `owner_role` from `invalid-temporary-without-expiry.json` again | n/a | **exit 0, 79/79.** Nothing notices (see **Q-3**). |

Every schema-weakening mutation that passed green on 2026-09-01 (C, D, E, F, G) now fails closed. Each one
fails with a message that names what changed.

## 5. Re-derived figures

**Per-member `required` deletion.** My walker deletes each member of every `required` list (not inside `if`)
alone, then re-validates every declared fixture. A member counts as "killed by no fixture" when no verdict
changes.

| Contract | Fixtures (valid) | Required members | Killed by no fixture at `8c089cc` | At `e5fa682` | Head plus `main` |
|---|---|---|---|---|---|
| CTR-MOD-001 | 77 (2) | 31 | 20 | 20 | 20 |
| CTR-FLG-001 | 59 (7) | 23 | 14 | **13** | 13 |

Both figures match `open_blockers[12]` and the closure record exactly. The member closed is
`allOf[3].then.properties.audit.required` → `expires_at`. No fixture's verdict disagrees with its name in
either contract.

**Single-obligation fixtures (acceptance criterion 10).** Of the `invalid-` fixtures, the number that violate
more than one rule:

| Contract | At `8c089cc` | At `e5fa682` |
|---|---|---|
| CTR-MOD-001 | 1: `invalid-permissioned-without-declarations.json` (`consent_reference` and `redaction_reference`) | 1, the same fixture |
| CTR-FLG-001 | 1: `invalid-temporary-without-expiry.json` (`expires_at` and `owner_role`) | **0** |

The CTR-MOD-001 remainder is recorded in `open_blockers[12]`. It needs a new fixture name in the pinned
`FIXTURE_SET`, and that set is WP-0A-CON-008's.

**Branch content.** The diff `8c089cc..e5fa682` is 4 files: one fixture, which gains one key and nothing
else, the closure record, the handoff and the manifest. No schema, catalog manifest, index, fixture name or
test file changes. No path overlaps with #187 or #188. On a head-plus-`main` tree (a `git archive` of `fa10229`
with the 4 branch files laid over it), `shared-kernel-schema-conformance`, `schema-mutation-coverage` and
`catalog-registry` pass 31/31 with skipped 0 and todo 0. The probe set gives identical results there. I did
**not** run the full `npm run check` on that tree. CI has to do that after the merge.

## 6. My earlier conditions

| Condition | State at `e5fa682` | Evidence |
|---|---|---|
| C-1 / T-1: `missing: []` satisfies the blocked rule | **Closed** | M4 rejected; mutation T1 fails closed |
| C-2 / T-2: constraints no fixture kills | **Closed** | Mutations C, D, F and G, green at exit 0 on 2026-09-01, all fail closed. A mutation-coverage floor with named untested sites exists. |
| C-2 / T-7: split the over-determined expiry fixture | **Closed on this branch**, but unratcheted (Q-3) | §3 T-7 rows; mutation E now flips the fixture; single-obligation count 1 → 0 |
| C-3: CI backgrounding / early `\|\|` before the guard | **Addressed outside this package**, read and not re-measured | `ci.yml` runs `node scripts/verify-test-coverage-floor.mjs` as its own step, and that step ran green in CI run `37379568076` |
| C-4 / T-4: precedence order; manifest/index disagreement | **Mostly closed** | F7 and F7b rejected (prefix enum), and the `freeze_boundary` / `untestable_by_fixture` text is reconciled. **F8 is still accepted, and it is recorded as closed** (Q-2). |
| C-5 / T-3: link `rule` to `effect` | **Closed for the three named rules** | F9-F11 rejected. The `percentage_bucket` remainder is recorded as owed. |
| T-5, T-6 | **Open, recorded as owed** | `open_blockers[11]`(b), (g) |
| T-8 (INFO) | No change | not measured further |

## 7. Findings at this head

**Q-1 (blocks the merge, not stop-the-line): the required CI check is red, because the head does not contain `main`.**
CI run `37379568076` failed `Verify branch scope` with exit 73 against `fa10229`. #187 merged at
04:30 +07, **before** this branch's work commit `9931f91` (04:37). #188 merged at 04:58, one minute before
`e5fa682`. The branch was cut from a `main` that was already stale. Because of the failure, CI never reached
`Database foundation`. Under RFC-2026-002 and RFC-2026-025 the head needs a green required run and must contain
the current `main`. Remedy (Author): merge `origin/main`, re-commit the handoff last and alone, and get CI
green. I found no file overlap. The contract kits and probes on a head-plus-`main` tree are clean, so I expect
the merge to be mechanical. I have not measured the merged head under `npm run check`. That merge produces a
new head, which needs a fresh check by the role runs. Under RFC-2026-025 §5 item 2, an Author routing decision
could make that check light.
Side note, not this package's: `scripts/verify-branch-scope.mjs` diffs `base..HEAD` (two-dot). A branch that is
behind therefore reports `main`'s newer files as its own changes, while the workflow comment speaks of the
merge-base. The guard still fails closed, but its message attributes 25 files to a package that did not touch
them.

**Q-2 (LOW-MEDIUM, records accuracy; fix in this PR): one T-4 remainder is recorded as closed while it is still open.**
`author-conditions-closure-2026-10-06.md` §2 marks "C-4 / T-4" as **Closed at main**, and `open_blockers[11]`
lists (a) to (g) without it. My 2026-09-01 T-4 named three cases: F7, F7b and **F8**, a decision whose deciding
scope is absent from `evaluated_scopes`. F7 and F7b are now rejected. F8 is still **accepted**:
`decision_source.scope: "business"` with `evaluated_scopes: ["platform"]` validates. A1's 2026-09-01 F6 is the
same case. The constraint is expressible in the subset: one `if`/`then` per scope can confine
`evaluated_scopes` to the prefixes that reach it. Adding it changes a Candidate contract, so the schema change
is owed through the RFC path like the other items in `open_blockers[11]`. The record should still say so.
Remedy (Author): add the item as `open_blockers[11]`(h), and change the closure record's C-4/T-4 row to
"Mostly closed". This edits only paths this package owns.

**Q-3 (LOW, owed; not blocking): the T-7 fix has no ratchet.**
If someone reverts the one-key fixture edit, the fixture again violates two obligations, and all 79 contract
tests still pass (mutation R, exit 0). The fixture-set test pins names, not content. No test asserts that an
`invalid-` fixture violates exactly one obligation. A check of that shape, "every `invalid-` fixture yields
exactly one validation error, except a named list", would make acceptance criterion 10 self-reporting. It would
name `invalid-permissioned-without-declarations.json` today. `test-kits/contracts/schema-mutation-coverage.test.mjs`
is in this package's `writable_paths`, but a new assertion moves the integrity digest and test counts. So I
record this as owed (A0), not as a condition on this PR.

**Q-4 (INFO): the remaining acceptance-criterion-10 breach is recorded correctly.**
`invalid-permissioned-without-declarations.json` still violates two obligations. `open_blockers[12]` names it,
and gives the reason it cannot be split here: the fixture-name set is WP-0A-CON-008's.

Nothing here is a secret exposure, a tenant leak, a lost job, migration divergence, irreversible deletion or a
contract mismatch introduced by this branch. The branch changes no schema. **No stop-the-line.**

## 8. Verdict

The branch's own content does what it claims. T-7 is closed, and I measured the change from two errors to one
at `8c089cc` and at the head. Every condition and figure the closure record states matches my independent
re-derivation, except Q-2. All declared commands pass at exit 0 with 692/692, skipped 0 and todo 0, on the
branch name. My 2026-09-01 conditions C-1 and C-2 are closed, C-5 is closed for its named rules, and C-4 is
closed except for F8. Two things remain. The required CI run at this head is **red** because the branch is
behind `main` (Q-1). One open item is recorded as closed (Q-2). Q-1 blocks the merge. Q-2 is a records
correction this PR should carry.

Conditions for this verdict:

1. **Q-1**: merge `origin/main` into the branch, refresh the handoff last and alone, and get a green required
   CI run at the new head, including `Database foundation`, which never ran.
2. **Q-2**: record the F8 remainder as owed (`open_blockers[11]`(h)), and correct the closure record's C-4/T-4
   row.
3. Q-3 is owed to A0 and is not a condition on this PR.

The re-verification by C0 and A1 and the `/claude/r0_steward` Integration verdict are still owed
(`open_blockers[10]`). This file is none of them.

VERDICT: test_verified_with_conditions
