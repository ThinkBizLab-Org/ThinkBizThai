# WP-0A-CON-003: Author closure of the role-verdict conditions, 2026-10-06

Author: `/claude/a0_atlas`. This record was written by a subagent of that run, in the same vendor and
model family as every role run on this package. It acts as the Author and approves nothing.
Branch: `agent/claude/WP-0A-CON-003-stale-blockers` (the branch `ownership.branch` names), cut from
`origin/main` `8c089cc`.

## 0. What this is and is not

- Author evidence only. It does not review, test-verify, integrate or gate-approve anything, it
  countersigns no acknowledgement, and it does not move the package past `in_review`. The status was
  already `in_review` and stays there.
- The verdicts it answers are the only role files on this package, all three at commit `2649401`
  (2026-09-01): `review-contract.md` §8 (Reviewer `/claude/c0_contract_reviewer`,
  `changes_requested`), `review-security.md` §8 (Security `/claude/a1_bastion`,
  `security_approved_with_conditions`) and `test-verdict.md` §4-§5 (Tester `/claude/q0_sentinel`,
  `test_verified_with_conditions`). No Integration verdict exists. There are no later re-verifications,
  so these are **first** verdicts, five weeks and many merged packages older than `main`. The
  Author's correction round (`author-self-check.md`, "Correction round") answered them on the
  package's own branch; that work is in `main`. This file re-measures every finding at `main` rather
  than carrying the correction round forward.
- The Owner's step-2 decisions are applied from
  `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186). The
  Owner's reply was `บืนยันขั้น 2`.
- This branch changes no RFC, no `CONTRIBUTING_AGENTS.md`, no CI file and no gate rule, so it is not a
  governance PR under RFC-2026-025 §5 item 6. It changes no schema, no manifest in the catalog, no
  fixture name and no test file. It changes the content of one fixture,
  `contract-catalog/shared-kernel/ctr-flg-001/examples/invalid-temporary-without-expiry.json`, so that
  it violates one obligation instead of two (§2, T-7). That is contract impact in the handoff's sense
  (a fixture is evidence), but it changes no rule, no requiredness and no verdict.

## 1. How each finding was re-measured

**Probes on the shipped schemas.** Each row below is one in-memory document built from a shipped
`valid-` fixture with one change, validated by `validate()` from
`test-kits/contracts/json-schema-subset.mjs` against the shipped `schema.json` at `8c089cc`. Nothing
was written to the repository. The probe values are synthetic; the two handle bodies are repeated
`ab` and `0123456789abcdef`, not credentials.

| Probe (finding) | Change to a valid fixture | Verdict at `main` |
|---|---|---|
| S-1 / CS-2 length | `secret_handles: ["secret:" + 400 lowercase chars]` | **accepted** (no `maxLength`) |
| S-1 lowercase body | `secret_handles: ["secret:" + 32 hex chars]` | **accepted** |
| S-1 mixed case | `secret_handles: ["secret:AbC"]` | rejected (pattern) |
| S-4 / T-5 / CS-3 | `ready`, `activated: true`, `missing: ["secret_handle"]` | **accepted** |
| S-4 M3-M5 | `initializing`, `registered`, `draining` with no `readiness` | **accepted** (all three) |
| T-1 / C-1 / C0 R2 | `blocked`, `missing: []` | rejected (`minItems 1`) |
| S-4 | `blocked`, `activated: true` | rejected (`const false`) |
| C0 R7 | `missing: ["scope"]` / `missing: ["dependency"]` | accepted / rejected |
| CS-5 tenant-data | `classification: "tenant-data"` with no `retention_reference` | **accepted** |
| S-7 | `permissioned-data` with `tenant_scoped: false` | rejected (`const true`) |
| S-7 | `permissioned-data` with no consent/retention/redaction | rejected (required) |
| S-3 | free-text `readiness.reason` | rejected (pattern `^readiness\.[a-z_.]+$`) |
| C0 R10 | `permissions: []` | **accepted** |
| C0 R8 | `version: "1.0.0-rc.1+build.5"` | accepted, as R8 asked |
| C0 (module id) | `module_id: "MOD-999"` | rejected |
| S-6 / CS-4 | kill switch, `write_disabled` omitted, `historical_read_allowed: false` | **accepted** |
| S-6 | kill switch, both omitted | **accepted** |
| S-5 | kill switch at `business` scope | rejected (`const "platform"`) |
| T-3 / C-5 | `default_deny`+allow, `explicit_deny`+allow, `explicit_allow`+deny | rejected (all three) |
| T-3 | `percentage_bucket`, `effect: allow`, `bucket.allocated: false` | **accepted** |
| T-4 / C-4 | `evaluated_scopes` reversed | rejected (prefix enum) |
| S-8 | `percentage: 0`, `allocated: true` | **accepted** |
| S-8 | temporary flag, `expires_at` years before `changed_at` | **accepted** |
| T-6 | kill switch with no `audit` | **accepted** |

**Mutations in a scratch extraction.** For T-2 / C-2 (constraints no fixture kills), four mutations
were each applied to a fresh `git archive` extraction of `8c089cc`, then
`node --test test-kits/contracts/*.test.mjs` and `node scripts/verify-test-coverage-floor.mjs` were run.
The unmutated extraction: contract suites 79/79, exit 0; floor exit 0.

| Mutation (finding) | Contract suites | Floor | First failing tests |
|---|---|---|---|
| m1: delete the `secret_handles` pattern (T-2, the Tester's headline unkilled mutation) | exit 1 (75/79) | 0 | `every contract reaches the mutation-coverage floor`, `deleting a protected constraint changes at least one fixture verdict`, `no constraint value changes without the change being written down`, `every fixture agrees with its own shipped schema…` |
| m2: delete `minItems` from the `blocked` branch (T-1) | exit 1 (76/79) | 0 | mutation-coverage floor, `the untested count and the untested list agree…`, constraint record |
| m3: delete the `explicit_deny` → `deny` link (T-3) | exit 1 (74/79) | 0 | `an annotation cannot be rewritten, deleted or added without being written down`, mutation-coverage floor |
| m4: replace the `evaluated_scopes` prefix enum with membership only (T-4) | exit 1 (72/79) | 0 | annotation ratchet, mutation-coverage floor, `deleting a protected constraint…`, `every untested constraint is named…` |

All four fail closed. At `2649401` the Tester reported five schema-weakening deletions passing green
at 85/85; `test-kits/contracts/schema-mutation-coverage.test.mjs` (this package's own suite) and the
catalog ratchets now catch them.

**Required members, one at a time.** The mutation suite deletes a `required` list as one site. The
open remainder of `open_blockers[3]` is that a required list nested inside a subschema is not
measured member by member. So for every `required` list in the two schemas (outside `if`), each
member was deleted alone and every declared fixture re-validated. A member is "killed by no fixture"
when no verdict changes.

| Contract | Members | Killed by no fixture at `main` | On this branch |
|---|---|---|---|
| CTR-MOD-001 | 31 | 20 | 20 |
| CTR-FLG-001 | 23 | 14 | 13 (`allOf.3.then.properties.audit.required` → `expires_at` closed, §2 T-7) |

Not all of these are gaps. The root members (8 + 5) are covered by the generative root-`required`
test in `catalog-registry.test.mjs`, which uses no fixture. Some are duplicated by a conditional copy
(`allOf.4/5/6.then.required` → `effect`; the `readiness.activated` copies) or by their own `if`
(`allOf.2.then` → `classification`). The rest are nested members no fixture isolates:
`capabilities.items` → `version`, `dependencies.items` → `range`, `data_policy` → `tenant_scoped`,
`lifecycle` → `supports_drain`, the permissioned-data branch's `retention_reference`,
`consent_reference` and `redaction_reference` (one fixture, `invalid-permissioned-without-declarations.json`,
lacks consent and redaction together), `decision_source` → `rule`, `bucket` → `allocated`, `audit` →
`reason_key` and `changed_at`, and `audit.actor` → `id`. Isolating them needs new fixtures, and the
fixture-name set is pinned by `catalog-registry.test.mjs`, which this package does not own. Owed: see
§5.

## 2. Conditions, one by one

"Closed at main" means the correction round or a later merged package closed it and §1 measures it
closed. "Owed" means it cannot be closed from this increment; the owner is named.

**Why no rule in the contract is edited here.** CTR-MOD-001 and CTR-FLG-001 were promoted Draft →
Candidate v1 by the Product Owner on 2026-09-02 (RFC-2026-010 status line). Every open item below
either adds a constraint (requiredness), changes what an annotation or `freeze_boundary` says the
contract means, or changes the fixture set. `CONTRIBUTING_AGENTS.md` § Ownership and change control
requires an RFC before changing contract meaning or requiredness, and the fixture set and annotations
are pinned by `test-kits/contracts/catalog-registry.test.mjs`, which is outside this package's
writable paths. So they go through the Candidate change path: an RFC by the contract owner (A0), with
A1 where the item is a secret-handle or data-classification question. That RFC would be a governance
PR the Owner merges. The same reasoning was applied to WP-0A-CON-002's Candidate items (its
`author-conditions-closure-2026-10-06.md` §2).

### Reviewer (`/claude/c0_contract_reviewer`, `review-contract.md` §8)

| # | Required change | State | Evidence |
|---|---|---|---|
| 1 | `x-source` cites §5.1 for the registry; correct to §4.2 | **Closed at main** | `module_id` and `owner_role` `x-source` read "Decision Register section 4.2"; `source_references` lists "Decision Register 4.2 Registry". |
| 2 | `minItems: 1` on blocked `missing` | **Closed at main** | §1 T-1 rejected; m2 fails closed; `invalid-lifecycle-readiness-missing-minitems.json` and `invalid-blocked-without-missing.json` exist. |
| 3 | Link `rule` ⇄ `effect` for `default_deny` and `explicit_deny` | **Closed at main** | Three `allOf` branches link `default_deny`, `explicit_deny` and `explicit_allow`; §1 T-3 rejected; m3 fails closed. The `percentage_bucket` remainder is under T-3 below. |
| 4 | `evaluated_scopes` order contradiction | **Closed at main** | Prefix enum; `freeze_boundary` and `untestable_by_fixture` now separate the expressible order half from the evaluator-only enforcement half. §1 T-4 rejected; m4 fails closed. |
| 5 | `x-source` on `policy_key` and `decided_at` | **Closed at main** | Both carry one, each stating its inference. |
| 6 | `lifecycle` labels and `reason` attribution | **Closed at main** | The `lifecycle` `x-source` declares the six labels an inference and re-sources the reason to MR-006. |
| 7 | Restore `scope`, drop `dependency` | **Closed at main** | §1 C0 R7. |
| 8 | Semver prerelease/build | **Closed at main** | §1 C0 R8 accepted. |
| 9 | Declare `capability_key`, integer `version`, `secret:`, `tenant-data` | **Closed at main** | Each `x-source` says DECLARED INFERENCE; the integer version also records its tension with §5.5 as an unresolved owner decision. |
| 10 | `permissions` `minItems: 1`, or state that `[]` is deliberate | **Owed** (contract owner A0, Candidate change path) | §1 C0 R10: `[]` is accepted and the `x-source` ("MR-001 rejects a manifest missing its permission policy") does not say whether an empty list is that policy. Either branch changes the contract text or its requiredness. |
| 11 | Self-check figure 70/70 → 85/85 | **Closed** | `author-self-check.md` "Correction round" records the correction. |

### Security (`/claude/a1_bastion`, `review-security.md` §8)

| Condition | State | Evidence |
|---|---|---|
| CS-1 (S-2): handle syntax belongs to CTR-SEC-001 (A0+A1); RFC or move it. "CTR-MOD-001 must not reach Candidate carrying a syntax owned by a contract it does not co-own." | **Owed** (A0 + A1, by RFC) — and **the stated precondition was not honoured** | CTR-MOD-001 reached Candidate on 2026-09-02 (RFC-2026-010) still defining `^secret:[a-z0-9._-]+$` in its own schema. RFC-2026-010 does not mention CS-1. The promotion is the Product Owner's decision and stands; this record does not reopen it. It records that the condition A1 set on promotion was not raised when promotion was decided. CTR-SEC-001 (still Draft, A0+A1) now adopts the same pattern "as PRECEDENT, not as authority" and records the conflict as open. Kept as `open_blockers[1]`. |
| CS-2 (S-1): `maxLength` on handles; `x-source` states what is enforced | **Half closed at main; length owed** | The `x-source` now says the `secret:` token is a declared inference and points at CTR-SEC-001. **No `maxLength`**: §1 accepts a 407-character handle. New observation: CTR-SEC-001 `handle` carries `maxLength: 128`, so a CTR-MOD-001 `secret_handles` entry can be a string no CTR-SEC-001 handle can equal, and the two contracts no longer compose on length. Owed to A0 + A1 with CS-1. |
| CS-3 (S-4): `activated: true` ⇒ `missing` absent/empty; `freeze_boundary` names the states a consumer may treat as available | **Owed** (contract owner A0, Candidate change path) | §1 S-4/T-5 accepted; `invalid-blocked-but-activated.json` covers only the `blocked` direction. `freeze_boundary` still says only "the MR-005 lifecycle states"; §1 shows `initializing`, `registered` and `draining` validate with no readiness at all, and nothing tells a consumer those are not available. |
| CS-4 (S-5, S-6): kill-switch `x-rule` overclaims; rename the misnamed fixture; require `historical_read_allowed: true` under a kill switch | **Owed** (contract owner A0, Candidate change path) | The `x-rule` still reads "a kill switch is a platform-scope deny that no narrower scope may override" (the manifest itself declares the override half untestable). `invalid-business-overrides-kill-switch.json` still tests a business-scope kill switch, not an override. §1 S-6: a kill switch with `write_disabled` omitted accepts `historical_read_allowed: false`. |
| CS-5 (S-7, S-3): permissioned-data declarations and tenant scope; `tenant-data` retention; `reason` as a key | **Mostly closed at main; `tenant-data` retention owed** | §1 S-7 both rejected; S-3 rejected. §1 CS-5: `tenant-data` with no `retention_reference` is accepted. Owed to A0 with A1 (data classification). |
| CS-6 | **Withdrawn by A1** | `review-security.md` §7. |
| S-8 (Low): `percentage: 0` with `allocated: true`; `expires_at` before `changed_at` | **Owed** (A0) | §1 both accepted. A1 raised these as findings, not conditions. The ordering check is cross-field and may not be expressible in the validator subset; that is for the owner to say. |
| C1 (standing, scanner) | **Not this package's** | Recorded on WP-0A-A0-003 / CTR-SEC-001 `x-opacity-limitation`; `open_blockers[2]` here carries A1's re-measurement (12 of 15 detected, a reach limitation). |

### Tester (`/claude/q0_sentinel`, `test-verdict.md` §4-§5)

| Condition / finding | State | Evidence |
|---|---|---|
| C-1 / T-1 | **Closed at main** | As C0 #2. |
| C-2 / T-2 (unkilled constraints; named minimum set) | **Closed at main** | §1 m1-m4 fail closed; `schema-mutation-coverage.test.mjs` pins per-contract floors and names every untested constraint. |
| C-2 / T-7 (split `invalid-temporary-without-expiry` into its two obligations) | **Closed here** | The correction round added `invalid-temporary-without-owner.json` (lacks only `owner_role`) but left `invalid-temporary-without-expiry.json` lacking **both** `expires_at` and `owner_role`. Measured at `main`: deleting `expires_at` alone from the temporary branch's `audit.required` changed no fixture verdict, so the expiry obligation had no counterexample of its own (acceptance criterion 10). This branch adds `"owner_role":"A0"` to that fixture and changes nothing else. Re-measured: deleting `expires_at` alone now flips `invalid-temporary-without-expiry.json`, and deleting `owner_role` alone flips `invalid-temporary-without-owner.json`. The fixture's name and its file in the pinned set are unchanged; contract suites 79/79. |
| C-3 (CI chain backgrounding / early `||`) | **Not this package's** | Owned by WP-0A-A0-002 (open blocker there). |
| C-4 / T-4 | **Mostly closed** (corrected 2026-10-06 per Q0 Q-2; this row read "Closed at main") | F7 and F7b rejected by the prefix enum; manifest reconciled. **F8 is still accepted**: a decision whose deciding scope is absent from `evaluated_scopes` (`decision_source.scope: "business"` with `evaluated_scopes: ["platform"]`) validates. Owed, `open_blockers[11]`(h). The index's `required_before_freeze` still lists "platform→plan→workspace→business precedence"; that is correct, because the enforcement half needs an evaluator. |
| C-5 / T-3 | **Mostly closed at main** | All three explicit rules are linked. Remainder: `percentage_bucket` with `effect: allow` and `bucket.allocated: false` validates (§1). Owed to A0 with the FP-003 allocation algorithm, which this package deliberately does not infer. |
| T-5 | **Owed** | Same as CS-3. |
| T-6 (`audit` required only for a temporary flag) | **Owed** (A0) | §1: a kill switch validates with no `audit`. FP-005 says every change carries actor, reason and time; whether a decision document is a change is the owner's call. |
| T-8 (INFO, a `then` relying on the root for `required`) | **No action** | Informational; the open nested-requiredness remainder is `open_blockers[3]`. |

## 3. The Owner's step 2, applied to the manifest

| Item | Applied |
|---|---|
| 1. RFC-2026-024's cross-vendor withdrawal extends to this package | `independence.prefer_cross_vendor_review` → `false`; `cross_vendor_exception` replaced by the withdrawal sentence; `open_blockers[8]` closed in place. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` | This package records **no** acknowledgement pending against `/root/r0_steward` (searched: manifest, handoff, evidence folder and both contract directories). Its Integration Owner is already `/claude/r0_steward`. Nothing to transfer; recorded so the absence is checkable. |
| 3. No Product reviewer for contract packages | `role_assignments.product_reviewer_note` records that the null slot is a decision; `review_and_test_gates` has no product step. |

`required_human_authorities[0]` (RFC-2026-004 disposition) is recorded as given: RFC-2026-004 line 3
reads "Approved 2026-09-02 by the Product Owner".

`ownership.amends_without_owning.paths` is emptied: this increment touches neither
`test-kits/branch-identity.test.mjs` nor `test-kits/integrity-manifest.json` (the branch name is
unchanged and no test file moves), and `scripts/verify-branch-scope.mjs` refuses a declared amendment
the diff does not explain (exit 74).

## 4. Tests at `main` and on this branch

| Command | Where | Exit | Result |
|---|---|---|---|
| `npm run check` | `main` `8c089cc` checked out on this branch name, before any edit | 1 | 692 tests, 690 pass, 2 fail, skipped 0, todo 0. Both failures are the handoff guard: `the handoff for this branch describes this branch` (the handoff cites `1e4a162`, 174 paths stale) and the ratchet that copies it. Measured on the branch name, not detached, because a detached HEAD skips that guard. |
| `node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs` | `main` | 0 | 6/6 |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `main` | 0 | clean |
| `node --test test-kits/contracts/*.test.mjs` | scratch extraction of `main` | 0 | 79/79 |
| `node scripts/verify-test-coverage-floor.mjs` | scratch extraction of `main` | 0 | clean |

The figures on this branch's head are in the handoff's `tests` and in `evidence/VERIFICATION.md`.

## 5. What remains before this package can move past `in_review`

1. Re-verification at this head by C0, A1 and Q0. Each verdict on file is at `2649401`.
2. An Integration verdict by `/claude/r0_steward`. None exists.
3. The owed contract items in §2 (C0 #10; CS-1, CS-2 length, CS-3, CS-4, CS-5 `tenant-data`; S-8;
   T-3 remainder; T-6), through an RFC by A0, with A1 for CS-1, CS-2 and CS-5. Whether any of them
   must close before `integration_verified` rather than before freeze is for the role runs to say.
   A1 graded CS-1 as "blocking on freeze, not on Draft".
4. The nested required members §1 lists as isolated by no fixture. Each needs a new single-obligation
   fixture; the fixture-name set is pinned in `test-kits/contracts/catalog-registry.test.mjs`
   (`FIXTURE_SET`), which `WP-0A-CON-008` writes, so the new names land there together with the
   fixtures. This is the CON-003 part of the catalog-wide nested-requiredness remainder in
   `open_blockers[3]`.

## 6. Closure of the role re-verification conditions, 2026-10-06

Added by a subagent of `/claude/a0_atlas`, acting as the Author. It approves nothing and moves no
status. A0 executes under the Owner's delegation `เอาตามที่คุณแนะนำทุกอย่าง`; it does not decide.

The four role files are now on this branch, cherry-picked with `-x`: C0
`c0-contract-reverify-2026-10-05.md` (`12f2527e`, `review_approved_with_conditions`), A1
`a1-security-reverify-2026-10-05.md` (`fbf0a09e`, `security_approved_with_conditions`), Q0
`q0-test-reverify-2026-10-05.md` (`2acda9e5`, `test_verified_with_conditions`) and R0
`r0-integration-verdict-2026-10-05.md` (`d408abfc`, `integration_conditional`). `origin/main`
(`fa10229`) is merged into the branch, as R0 §6 step 1 and C0 N-6 / Q0 Q-1 require; `git merge-tree`
was clean. One fix commit then made the record conditions, records only, no schema or fixture change:

| Condition | Raised by | Where it is now |
|---|---|---|
| N-1, `module_id` pattern refuses MOD-900 and admits MOD-005/141/149 | C0 | `open_blockers[11]`(l), owner A0, Candidate change path |
| N-5, `reason_key` accepts `policy.....` | C0 | `open_blockers[11]`(m), owner A0, Candidate change path |
| N-3, A1 lettering in `open_blockers[11]` | C0 | Reconciled in place: "with A1 for (d), (i), (j) and (k)", agreeing with §2 and §5 above (A1 on CS-1, CS-2 in `open_blockers[1]` and CS-5 in (d)); the old wording is quoted in the entry |
| N-2, contract manifests' `freeze_boundary` still opens "Draft only." | C0 | `open_blockers[14]`(3), owner A0, catalog-wide, Candidate RFC |
| N-4, copied `x-rule` history on two branches | C0 | `open_blockers[11]`(n), folded into the Candidate RFC |
| N1, MOD/SEC handle length does not compose (129 chars) | A1 | `open_blockers[14]`(1), the length half of `open_blockers[1]`, A0 + A1 by RFC, blocking on freeze |
| N2, `tenant-data` with `tenant_scoped: false` passes | A1 | `open_blockers[11]`(i), A0 with A1 |
| N3, `readiness.reason` has no `maxLength` | A1 | `open_blockers[11]`(j), A0 with A1 |
| N4, permissioned-data references accept a single space | A1 | `open_blockers[11]`(k), A0 with A1 |
| CS-1 to CS-5, S-8, C1 at this head | A1 | `open_blockers[14]`(2), in A1's own words, each pointing at its existing entry |
| Q-2, F8 recorded as closed | Q0 | `open_blockers[11]`(h); the C-4/T-4 row in §2 now reads "Mostly closed" |
| Q-3, the T-7 fix has no ratchet | Q0 | `open_blockers[14]`(4), owed by A0, not made on this PR |

Not made here, and why: no schema, fixture, test or catalog file moved, because every item above changes a
Candidate contract's rules, annotations or fixture set, which goes through an RFC (§2). The handoff is
refreshed in a later commit, last and alone; until then `npm run check:handoff` is expected to be red.

**A0's reading of RFC-2026-025 §5 item 6 (R0 R4).** The clause asks that no unresolved security finding
of any grade be open against the PR. A1's open findings (CS-1, CS-2 length, CS-3, CS-4, CS-5
`tenant-data`, S-8, N1-N4) are pre-existing on `main` at `8c089cc`, as A1 measured and states; each is
now recorded with an owner and a route (`open_blockers[1]`, `[11]`, `[14]`); and none is introduced by
this PR, which changes no schema. A0 therefore reads them as open against the two Candidate contracts,
not against this PR. This is the reading R0 asked A0 to record; A0 records it executing under
`เอาตามที่คุณแนะนำทุกอย่าง` and does not decide it. If the Owner reads the clause more strictly, the
Owner merges personally. Still owed before any merge, per R0 §6: the light re-checks by C0, A1 and Q0
at the new head, a green `bootstrap` run on that exact head including Database foundation, and the
`/claude/r0_steward` confirmation.
