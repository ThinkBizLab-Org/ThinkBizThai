# WP-0A-A0-004: the Owner's step-2 decisions applied, the authority line corrected, and every declared test re-run at main

Author run: `/claude/a0_atlas` (Anthropic, Claude Opus family), working as a subagent of the A0 Author run.
Branch: `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, cut from `origin/main` at `e1fa28e` (PR #186 merged).
Date: 2026-10-06

This is Author evidence only. It is not a review, security review, test verification, integration
verdict, Product Owner act or merge approval, and it does not move Gate G0. This package's status stays
`in_review`.

## 1. Where the package stood

The G0 survey (§2, row A0-004) found the Author's self-check and nothing else. All four role verdicts were
missing, and the manifest named two different RFCs as its authority. `evidence/WP-0A-A0-004/` holds
`author-self-check.md` and nothing from any other role. **No verdict set any condition**, so this
increment closes none. It corrects the record and re-measures. The first verdicts are owed
(§6).

## 2. RFC-2026-003 or RFC-2026-007: which is this package's authority

`required_human_authorities[0]` read "Product Owner disposition of RFC-2026-003", and `open_blockers[0]`
read "RFC-2026-007 is Proposed". The texts settle it.

| Source | Says |
|---|---|
| `RFC-2026-003` title and decision 2 | Contract-test coverage, and the transfer of **`package.json`** from WP-0A-A0-001 to **WP-0A-A0-002**. It does not mention WP-0A-A0-004 or `ci.yml`. |
| `RFC-2026-007` (lines 67-70) | "`.github/workflows/ci.yml` is a WP-0A-A0-001 output ... The file transfers to **WP-0A-A0-004** for this change". |
| This manifest | `scope.include[0]` "RFC-2026-007 recording the decision and the ownership transfer"; `writable_paths[0]` is the RFC-2026-007 file. |
| `WP-0A-A0-001.json` `ownership.amended_by[2]` | `work_package_id: WP-0A-A0-004`, `decision_record: architecture/decisions/RFC-2026-007-ci-independent-guard-step.md`. |
| `WP-0A-A0-002.json:46` | The identical string "Product Owner disposition of RFC-2026-003 before the manual merge described in RFC-2026-002". |
| `git log -S` on this manifest | The RFC-2026-003 line arrived in the package's first commit, `3737893` (2026-09-01). |

**RFC-2026-007 is true.** The RFC-2026-003 line was copied from WP-0A-A0-002 when this manifest was
created. Both RFCs were approved together on 2026-09-02 (`82aae60`, "Product Owner approves RFC-2026-003
through -009"), and RFC-2026-007's status line reads "Approved 2026-09-02 by the Product Owner". So the
blocker "RFC-2026-007 is Proposed" was also stale. Both lines are corrected: the authority now reads
RFC-2026-007, GIVEN, with the correction stated, and the stale blocker is removed.

## 3. The Owner's step-2 decisions, applied to this manifest

Source: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (on main since PR #186),
the Owner's words `บืนยันขั้น 2`.

| Item | Field changed | Now |
|---|---|---|
| 1. RFC-024's cross-vendor withdrawal extends to the 15 packages (A0-004 is one, §3 row 1) | `independence.prefer_cross_vendor_review`, `independence.cross_vendor_exception`; the blocker "prefer_cross_vendor_review is not satisfied" | `false`. The exception is replaced, not deleted, by the withdrawal record with its history. What remains of independence is restated (RFC-2026-024 §3/3-5). The blocker is removed because it has no ground left. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` for pending acknowledgements | `required_human_authorities[1]`, `open_blockers` (ci.yml acknowledgement), `role_assignments._run_id_disambiguation` | The acknowledgement at `WP-0A-A0-001.json` `amended_by[2]` is owed by `/claude/r0_steward`. **It is still pending.** Naming a successor is not the successor acting. That file is outside this package's writable paths and still names `/root/r0_steward`. |
| 3. No Product reviewer for tooling and contract packages | `role_assignments.product_reviewer_note` (new) | `product_reviewer_agent_run_id: null` is by decision. This package has no UX surface, and `review_and_test_gates` carries no product step. |

## 4. Other stale lines corrected

- **Protected CI.** The blocker said G0's protected-CI requirement "remains blocked on an external
  constraint". That is no longer true. A read-only re-measurement on 2026-10-06,
  `gh api repos/ThinkBizLab-Org/ThinkBizThai/branches/main/protection`, returned `contexts: ["bootstrap"]`,
  `strict: true`, `enforce_admins: true`, force-push off, deletion off, and no required pull-request
  reviews. This matches the step-2 record's §6. The blocker now says so. G0's external verification
  is unchanged.
- **Acceptance criterion 6** says the workflow derives the package "from the branch name, skipping
  cleanly when a branch names none". Since `8df0f4c` (2026-09-02) it does neither. It resolves the branch
  through the manifest that claims it (`scripts/verify-branch-identity.mjs`). An unclaimed branch exits
  `75` and is then accepted only as a disposition branch. Measured: `agent/claude/nothing-here` exits
  `75`, and this branch resolves to `WP-0A-A0-004`. The criterion is annotated rather than rewritten,
  so a reviewer judges it against the stricter behaviour.
- **`amends_without_owning`.** It declared the previous increment's five paths. This branch touches
  none of them, so the scope guard fails it at exit `74`. Measured on this branch before the edit:
  `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-004` printed "declares 5 amendment(s) that
  explain nothing this branch changed" and exited 74. CI's "Verify branch scope" step would therefore
  have failed this PR. The paths are now `[]`. The rationale names the five paths and where the record
  stays.

## 5. Every declared test, re-run at main `e1fa28e`

Toolchain: `node v24.20.0`, `npm 11.19.0`.

| Command | Where | Exit | Result |
|---|---|---|---|
| `npm run check` | a scratch branch `measure/a0-004-main-e1fa28e` at `e1fa28e`, which no package claims, so the handoff guard has no handoff to judge | 0 | `tests 691 / pass 691 / fail 0 / cancelled 0 / skipped 0 / todo 0` |
| `npm run check` | this branch, at `e1fa28e` before any edit | 1 | 689/691. Two failures, both the handoff guard: "WP-0A-A0-004's handoff cites head a5c33fd, after which 186 substantive path(s) changed". This is expected. The refreshed handoff is this PR's last commit. |
| `node scripts/verify-test-coverage-floor.mjs` | standing alone | 0 | |
| `node scripts/validate-work-package-ownership.mjs work-packages` | before and after the manifest edit | 0 | no cross-package overlap |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-004.json` | before and after | 0 | |
| `node scripts/validate-work-packages.mjs` | after the edit | 0 | |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-004-ci-independent-guard-step` | | 0 | prints `WP-0A-A0-004` |
| `node scripts/verify-branch-identity.mjs agent/claude/nothing-here` | | 75 | refuses the unclaimed branch |

The secret scan, protocol, capability and role-separation checks run inside `npm run check`, which
covers `required_tests[2]`. The final-head run of `npm run check` is recorded in the handoff's `tests`.

### 5.1 The load-bearing measurement, repeated at `e1fa28e`

The self-check's sandbox result is the only evidence that separates this package from a cosmetic edit.
It was repeated on a `git archive` of `origin/main` at `e1fa28e`, outside the repository. The integrity
manifest was regenerated after each edit, so the digest tripwire is not what fired.

| Injected `scripts.check` | `npm run check` | The workflow's guard step, `node scripts/verify-test-coverage-floor.mjs` |
|---|---|---|
| trailing ` &` | exit **0** | exit **81**: `check step "npm run test:bootstrap &" contains "&"` |
| every ` && ` replaced with ` \|\| ` | exit **0**, and no test-count line in the output | exit **81** |

The result is unchanged from 2026-09-01. Without the separate step, both would leave CI green. With it,
both fail. The workflow still runs that step (`.github/workflows/ci.yml:74-75`) before
`npm run check` (`:76-77`).

## 6. Owed, and to whom

| Item | Owner |
|---|---|
| The four first role verdicts, each a full review of the package: Reviewer, Security, Tester, Integration Owner | `/claude/c0_contract_reviewer`, `/claude/a1_bastion`, `/claude/q0_sentinel`, `/claude/r0_steward` |
| The acknowledgement at `WP-0A-A0-001.json` `amended_by[2]`, and replacing its `acknowledgement_required_from` | `/claude/r0_steward`, as successor; WP-0A-A0-001 owns the file |
| `evidence/g0-tracker-th.md` stating protected CI as live, if any line still says otherwise | WP-0A-A0-001 |

## 7. What this PR is not

It changes no RFC, no `CONTRIBUTING_AGENTS.md`, no CI file and no gate. `.github/workflows/ci.yml` and
`RFC-2026-007` are in this package's writable paths and are left untouched. So it is not a governance PR
under RFC-2026-025 §5 item 6. It still needs the role runs its gates require before anyone merges it, and
this run approves nothing.
