# WP-0A-A0-006: the Author's refresh at main d863f40, before the first role verdicts

Run: `/claude/a0_atlas` (Author), working as a subagent of the A0 run for this package. This is the
Author's own record. It is not a role verdict, it approves nothing, and it moves the package no further
than `in_review`, the furthest an Author may move it (`CONTRIBUTING_AGENTS.md` § Separation of duties).

Base: `main @ d863f40` (the merge of PR #199). Branch: `agent/claude/WP-0A-A0-006-db00-data-decisions`,
the name the manifest declares, created again from `origin/main` (no branch of that name was on the
remote; PR #107 used it and merged).

## 1. Where the package stands

- The package's work is on main. `RFC-2026-015` and `evidence/WP-0A-A0-006/blocker-re-audit.md` reached
  main as squash commit `1a9f589` of PR #45 on 2026-09-04. The disposition was transcribed the same day
  (`234693c`); the RFC's status line (`architecture/decisions/RFC-2026-015-db00-data-foundation-decisions.md:3`)
  reads "Approved 2026-09-04 by the Product Owner — DATA-DEC-01 is `app` and DATA-DEC-02 is the wrapper
  command contract, both as proposed. DATA-DEC-03 stays open and referred to A1, due before G1."
- PR #107 later corrected four stale blockers in the manifest and left the status at `in_progress`
  deliberately (the handoff at `c5a48a8` says so).
- The G0 survey row for this package reads "Blocker re-audit only … Move to `in_review` with a handoff;
  then C0/Q0/A1/R0 runs." Measured on this branch, that is accurate.

## 2. Conditions set by role verdicts

**There are none to close.** No C0, A1, Q0 or R0 file has ever existed under `evidence/WP-0A-A0-006/`;
the only file before this one is the Author's `blocker-re-audit.md`. No verdict exists, so no verdict has
set a condition. This refresh records that as a new open blocker in the manifest, and the four role runs
owed are **first** verdicts at the current main, each reviewing the whole package:

| Role | Run | Owed |
|---|---|---|
| Reviewer | `/claude/c0_contract_reviewer` | first review of RFC-2026-015, the re-audit and this manifest |
| Security (the conditional reviewer the manifest requires) | `/claude/a1_bastion` | first security verdict; separately, A1's acceptance as DATA-DEC-03's co-owner (RFC-2026-028's status line), which is not this package's to give |
| Tester | `/claude/q0_sentinel` | first test verdict against the five acceptance criteria and three required tests |
| Integration Owner | `/claude/r0_steward` | first integration verdict, including that the work reached main through PR #45 while this manifest read `in_progress` and before RFC-2026-025 |

The survey names one item as the human part: "DATA-DEC-03 security half is owned by A1, which an agent run
can hold". That is the A1 row above. It is outside this package's writable paths and is recorded as owed
by A1.

## 3. The Owner's step 2, applied to this manifest

Source: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186). The
Owner's words were `บืนยันขั้น 2`.

| Item | Change in `work-packages/WP-0A-A0-006.json` |
|---|---|
| 1. RFC-2026-024's withdrawal extends to the 15 packages | `independence.prefer_cross_vendor_review` becomes `false`. `cross_vendor_exception` is replaced, not deleted, by a sentence recording the withdrawal and its history (the form RFC-2026-024 §3/2 gives, in the wording C0 F1 settled on WP-0A-A0-004: the quoted item is the record's translation of A0's message, and which 15 packages is A0's mapping). `open_blockers[1]` (the cross-vendor blocker) is closed in place with its text as recorded. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` | `role_assignments._run_id_disambiguation` records the succession. Measured: nothing on this package was ever owed by `/root/r0_steward`. The field's old claim that the Codex run "is named in open_blockers" was false at every reachable version: a pickaxe search of this file's history for `/root/r0_steward` finds only `1a9f589`, the commit that wrote the field, and that commit's `open_blockers` do not name it. `WP-0A-A0-001.json` `ownership.amended_by` names WP-0A-A0-002, -003, -004 and WP-0A-CON-008, never this package. So the succession moves nothing here and no acknowledgement is given. The field's other old clause, that `/claude/r0_steward` "must record its own capability declaration before this package leaves backlog", is discharged: `.agents/capability-profiles/cc-r0-steward.json` is on main. |
| 3. No Product reviewer for tooling and contract packages | `role_assignments.product_reviewer_note` records that the null slot is a decision. That item 3 covers this package is A0's mapping: it is a decision-record package, its role profiles are `architecture-contracts`, `independent-qa`, `integration-release` and `security-privacy`, it has no UX surface, and its `review_and_test_gates` carry no product step. The Product Owner's disposition of RFC-2026-015 is a decision authority, not a Product reviewer slot. |

## 4. Other corrections in the manifest

- **`open_blockers[0]` (DATA-DEC-03) was stale and is corrected, with its text as recorded.** It said the
  service path was undecided and that "the only member of app_worker is postgres". Both stopped being true
  on main: `RFC-2026-028` (the worker identity) is Approved 2026-10-05, and
  `db/foundation/migrations/173_worker_login_identity.sql:69-71` creates `app_worker_login` and runs
  `grant app_worker to app_worker_login with inherit false, set true, admin false`. Together with
  `003_service_role_no_ambient_inherit.sql:26` (`grant app_worker to postgres with inherit false, set
  true`), a migrate-clean cluster has two members of `app_worker`. What stays open, read from RFC-2026-028's
  status line and 173's header (lines 48-53): A1's acceptance as DATA-DEC-03's co-owner, credential custody
  (Q-028-3), the pooler measurement (Q-028-12 with Q170-c), 173 is pending on the provisioned instance, and
  no service cell has a policy until its own batch lands. None of that is this package's to close; the
  blocker stays open and names A1 and WP-0A-DB-00.
- **`required_human_authorities[0]`** (the RFC-2026-015 disposition) is marked GIVEN 2026-09-04 with its
  citation; **[1]** (A1 owns DATA-DEC-03) is kept and gains its state as of today.
- **`open_blockers[3]`** is new: no role verdict exists at any head (§2).
- **`open_blockers[2]`** (G0 is still Specification Baseline Complete / External Verification Pending) is
  unchanged. It is still true.
- **`deterministic_commands.package_evidence[2]`** read `node scripts/validate-work-package-role-separation.mjs`
  with no argument. Run that way it prints `usage: node scripts/validate-work-package-role-separation.mjs
  <manifest.json>` and exits **64**, so the declared command could never pass. It now names this manifest,
  the form WP-0A-A0-002, -003 and WP-0A-CON-002 already use. The validator is unchanged.
- **`status`** moves `in_progress` → `in_review`.
- **`outputs.files`** gains this file.
- **The acceptance criteria are not edited.** Criterion 3 ("committed with status Proposed. An agent must
  not write Approved") describes the commit that proposed the RFC, and it was met there: `1a9f589`'s status
  line reads "Proposed — awaiting Product Owner disposition". The later "Approved" line is the
  disposition commit `234693c`, which transcribes the Product Owner's decision (the commit carries an agent
  co-author line, so it is a transcription of his act, not an agent's choice); it is not the proposing
  commit the criterion describes. The survey calls the criterion "now history"; rewriting it after
  the fact would change what the package was accepted against, so it is left for C0 to read.
- **RFC-2026-015 is not edited**, so this PR changes no RFC, `CONTRIBUTING_AGENTS.md`, CI or gate and is not
  a governance PR under RFC-2026-025 §5 item 6.

## 5. Acceptance criteria, read at this base

| # | Criterion | Author's reading (not a verdict) |
|---|---|---|
| 1 | RFC proposes DATA-DEC-01 and -02 only, with the data package's default and what changes if the Owner picks otherwise | RFC-2026-015 §DATA-DEC-01 (lines 48-60: `app`, "If the Product Owner prefers another name …") and §DATA-DEC-02 (lines 62-77: wrapper command contract, what turns on it, what it does not decide). |
| 2 | DATA-DEC-03 referred to A1, no answer proposed, A0 must not close it alone | §DATA-DEC-03 (line 79 heading "REFERRED TO A1, NOT PROPOSED"; line 84 "No answer is proposed here, and A0 must not close it alone"). |
| 3 | Committed with status Proposed; an agent must not write Approved | Met at `1a9f589` (see §4). |
| 4 | Re-audit records 36 verdicts and marks the two it could not re-measure as unknown | `blocker-re-audit.md` totals 9 + 18 + 7 + 2 = 36; #12 and #13 of CON-006 are REMEASURE and "reported as unknown" (lines 62-63, 83). It is a point-in-time audit at `main @ 963990f` and is not re-run here; later packages have closed several of its CLOSED rows in their own manifests (WP-0A-CON-002, -003, -006 cite it). |
| 5 | `npm run check` green, nothing skipped, no floor lowered | §6. This branch changes no test and no floor. |

## 6. Tests at this base

All on the branch name `agent/claude/WP-0A-A0-006-db00-data-decisions`, Node `v24.20.0`.

| Command | Exit | Result |
|---|---|---|
| `node scripts/validate-work-packages.mjs` | 0 | no output |
| `node scripts/validate-work-package-ownership.mjs` | 0 | no output |
| `node scripts/validate-work-package-role-separation.mjs` (as declared before this change) | 64 | usage message; the command needs a manifest argument (§4) |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-006.json` | 0 | no output |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-006` | see handoff | measured on the committed branch; recorded in `handoffs/WP-0A-A0-006-author-handoff.json` `tests` |
| `npm run check` | see handoff | run by `node scripts/commit-when-clean.mjs` before each commit on this branch; the counts and exit code are recorded in the handoff's `tests`, which its last commit refreshes |

## 7. What this file does not do

- It gives no role verdict and closes no condition a verdict set (none exists).
- It gives no acknowledgement on behalf of `/claude/r0_steward` or anyone else.
- It does not answer any part of DATA-DEC-03.
- It does not merge. The PR is left as a Draft for the role runs and the merge queue.
