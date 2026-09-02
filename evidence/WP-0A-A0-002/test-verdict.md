# WP-0A-A0-002 — Independent Tester verdict

Tester run: `/claude/q0_sentinel` (Anthropic, `claude-opus-5`)
Role: independent Tester only
Author under test: `/claude/a0_atlas` (distinct run; this run authored nothing in this package)
Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage`
Head commit: `1873ade0252608be870b6b617515b00d0ae405a2`
Base revision: `dcafcf8`
Date: 2026-08-31

**Scope statement.** This document is independent Tester evidence only. It is **not**
Reviewer approval, **not** Security/Privacy approval, **not** Integration Owner
verification, **not** Product Owner disposition, **not** merge authorization, and
**not** Gate G0 approval. It does not advance Gate G0, does not advance any package
status, and does not authorize a merge. Every result below was reproduced by this run;
no claim was accepted on the Author's word.

## Toolchain observed

Resolved through a login shell (`zsh -lc`), matching the pinned RFC-2026-001 toolchain:

| Tool | Required | Observed |
|---|---|---|
| Node.js | `24.20.0` | `v24.20.0` |
| npm | `11.19.0` | `11.19.0` |

`node scripts/verify-toolchain.mjs` runs first inside `npm run check` and passed on
every invocation recorded here.

## 1. Replay of every command in the Author handoff `tests` array

Each command was re-executed by this run on the pinned toolchain. "Claimed" is the
Author's recorded value in `handoffs/WP-0A-A0-002-author-handoff.json`.

| # | Command | Claimed exit | Observed exit | Claimed result | Observed result | Match |
|---|---|---|---|---|---|---|
| 1 | `npm run check` | `0` | `0` | tests 32 / pass 32 / fail 0 | tests 32 / pass 32 / fail 0 / skipped 0 / todo 0 | yes |
| 2 | `node --test 'test-kits/**/*.test.mjs'` | `0` | `0` | tests 32 / pass 32 / fail 0 | tests 32 / pass 32 / fail 0 / skipped 0 / todo 0 | yes |
| 3 | `node --test test-kits/contracts/*.test.mjs` | `0` | `0` | tests 6 / pass 6 / fail 0 | tests 6 / pass 6 / fail 0 | yes |
| 4 | `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | `0` | no output | no output | yes |
| 5 | `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-002.json` | `0` | `0` | no output | no output | yes |
| 6 | `node scripts/validate-capability-profiles.mjs` | `0` | `0` | no output | no output | yes |
| 7 | `node scripts/scan-repository-secrets.mjs` | `0` | `0` | no output | no output | yes |

**7 of 7 replayed commands match the Author's claims exactly. No mismatch.**

The six contract tests executed by command 3 were observed by name:

- shared-kernel catalog preserves baseline IDs, versions, and freeze levels
- Candidate schemas and synthetic valid/invalid fixtures remain present and traceable
- Candidate fixture validator accepts valid fixtures and rejects every declared negative fixture
- negative fixtures demonstrate required tenant and job isolation metadata
- Candidate safety constraints reject unsafe detail, payload, and public job references
- Candidate fixture validator rejects missing Event and Job required fields

## 2. Genuine before/after through `npm run check`

Performed as a real mutation of the working tree, not a simulation. Only the
`test:bootstrap` line of `package.json` was temporarily reverted to
`node --test test-kits/*.test.mjs`; the file was then restored with
`git checkout -- package.json`.

| State | `test:bootstrap` value | `npm run check` exit | tests | pass | fail |
|---|---|---|---|---|---|
| Temporarily reverted (old) | `node --test test-kits/*.test.mjs` | `0` | **26** | 26 | 0 |
| Restored (corrected, HEAD) | `node --test 'test-kits/**/*.test.mjs'` | `0` | **32** | 32 | 0 |

26 + 6 contract tests = 32. The Author's arithmetic and both counts are confirmed.

Restoration was verified three ways before continuing: `grep` shows the corrected
quoted glob; `git diff package.json` produced **no output**; and a byte comparison
against a pre-experiment copy reported the files identical. `package.json` is left in
its corrected state.

## 3. Required negative check — old glob vs new glob

Both globs were run directly and their **test-name sets** compared, not just their counts.

| Glob | exit | tests | pass |
|---|---|---|---|
| `node --test test-kits/*.test.mjs` (old) | `0` | **26** | 26 |
| `node --test 'test-kits/**/*.test.mjs'` (new) | `0` | **32** | 32 |

Test names present under the new glob and **absent** under the old glob — exactly the
six `test-kits/contracts/` tests listed in section 1. Test names present under the old
glob and absent under the new glob: **none**. The new set is a strict superset of the
old set.

This proves the old glob structurally missed `test-kits/contracts/` and the new one
does not.

## 4. Fault-testing the fix

Attempts to break the corrected command:

| # | Fault test | Result |
|---|---|---|
| FT1 | `npm run check` invoked from subdirectory `test-kits/contracts` | exit `0`, **32** tests — npm resolves the package root |
| FT2 | `sh -c "node --test 'test-kits/**/*.test.mjs'"` (POSIX shell, no `globstar`) | exit `0`, **32** tests |
| FT3 | `bash -c "node --test 'test-kits/**/*.test.mjs'"` | exit `0`, **32** tests |
| FT4 | `npm --prefix /Users/bank/ThinkBizThai run check` from the repository parent | exit `0`, **32** tests |
| FT5 | raw command run from an unrelated cwd (`/private/tmp`) | exit `0`, **0** tests — see condition C1 |

FT2 and FT3 confirm the Author's assumption that the quoted pattern is expanded by the
Node test runner rather than the invoking shell, so the command is identical under
`sh`, `bash`, `zsh`, and a CI runner. It does not depend on shell `globstar` support.

### Discovery fault-test (real file, not a claim)

A throwaway test file was created at
`test-kits/contracts/__tmp_discovery_check.test.mjs` containing one trivially-passing
`node:test` test, then deleted.

| Step | Observed |
|---|---|
| Temp nested test file created | `git status --short` showed `?? test-kits/contracts/__tmp_discovery_check.test.mjs` |
| `npm run check` with file present | exit `0`, **33** tests / 33 pass; probe test executed by name |
| Old glob `node --test test-kits/*.test.mjs` with the same file present | exit `0`, **26** tests — old glob did not discover it either |
| Temp file deleted | directory back to `shared-kernel-contract-catalog.test.mjs` only |
| `npm run check` after deletion | exit `0`, **32** tests / 32 pass |
| `git status --short` | clean of the temp file |

**Discovery is proven: 32 → 33 → 32.** A newly added nested test file is picked up
automatically by the corrected glob and was never picked up by the old one. No
temporary file was left behind.

## 5. Validators reject bad input as well as accept good input

The corrected glob is only valuable if the suites it now runs are real. Negative
coverage was executed and counted:

| Test file | exit | tests | pass | positive / negative |
|---|---|---|---|---|
| `test-kits/work-package-ownership.test.mjs` | `0` | 6 | 6 | 1 accepts, **5 rejects** |
| `test-kits/role-separation.test.mjs` | `0` | 8 | 8 | 3 accepts, **5 rejects** |
| `test-kits/work-package-discovery.test.mjs` | `0` | 1 | 1 | rejects an invalid manifest beside a valid one |
| `test-kits/capability-profile.test.mjs` | `0` | 4 | 4 | accepts and rejects |

The ownership suite rejects: output outside writable paths; output matching a read-only
path; wildcard output declarations; absolute, traversal, and directory-like ownership
paths; and a writable path capturing another package's output. The role-separation
suite rejects: duplicate named role IDs; a conditional approval role assigned to the
reviewer run; an empty named role ID; an unsupported status; and malformed JSON.

### Live falsification of the ownership validator

To prove the validator is not passing vacuously, it was run against a reconstructed
**pre-amendment** manifest set (current manifests, with `WP-0A-A0-001.json` and
`WP-0A-CON-001.json` restored from `dcafcf8`) in a scratch directory outside the repository:

| Manifest set | exit | output |
|---|---|---|
| Pre-amendment (both reverted) | **`70`** | `work package WP-0A-A0-001 writable path overlaps WP-0A-A0-002 output: package.json` |
| Only `WP-0A-CON-001` reverted | `0` | none — see condition C2 |
| Current (post-amendment, HEAD) | `0` | none |

The validator genuinely rejects the pre-amendment state and accepts the amended state.

## 6. No test was removed, skipped, or weakened

| Check | Observed |
|---|---|
| `git diff --name-only dcafcf8..HEAD -- test-kits scripts .github` | **empty** — no test file, validator script, or workflow was modified on this branch |
| Test-name set, old glob vs new glob | new set is a strict **superset**; nothing lost |
| `skipped` / `todo` counters, all runs | `0` / `0` |
| `package.json` diff vs base | exactly one line — the `test:bootstrap` glob |

No test was deleted, renamed, skipped, marked `todo`, or altered. The increase from 26
to 32 is entirely the six pre-existing contract tests being executed rather than any
test being added or relaxed.

## 7. Independent verification of the manifest acceptance criteria

| # | Acceptance criterion | Verdict | How this run verified it |
|---|---|---|---|
| 1 | `npm run check` executes every test-kits suite incl. `test-kits/contracts` and reports 32 passing tests on pinned Node 24.20.0 / npm 11.19.0 | **pass** | Sections 2–4; genuine 26→32 before/after plus 32→33→32 discovery proof |
| 2 | Ownership validator exits 0 with no cross-package writable/output overlap | **pass** | Replay 4 exit `0`; falsified against pre-amendment set (exit `70`) |
| 3 | WP-0A-A0-001 and WP-0A-CON-001 declared outputs remain fully covered by remaining writable_paths | **pass** | Validator enforces output coverage and exits `0`; CON-001's 32 declared outputs inspected individually against its 11 new writable globs — all covered |
| 4 | Cross-package amendments limited to the exact RFC-2026-003 removals and declared in `authorized_cross_package_amendments` | **pass** | `git diff dcafcf8..HEAD` on both manifests shows only the authorized removals: A0-001 drops `package.json` from `writable_paths` and `outputs.files` (2 deletions, nothing else); CON-001 replaces the three broad globs with exact delivered paths and drops the unused `fixtures/contracts/**`. No status, role, output, or acceptance-criteria change in either |
| 5 | No contract status, other-package status, provider, schema, credential, or gate state changes | **pass** | `contract-catalog/`, `fixtures/`, `scripts/`, `test-kits/`, `.github/` untouched vs base. Package statuses compared base vs HEAD: WP-0A-A0-001 `integration_verified` → `integration_verified`; WP-0A-CON-001 `integration_verified` → `integration_verified`; WP-0A-A0-002 `backlog`. Secret scan exit `0` |
| 6 | The Author does not review, security-review, test-verify, or integrate this package | **pass, for the Tester role** | This run (`/claude/q0_sentinel`) is distinct from the Author (`/claude/a0_atlas`) and authored nothing in this package. This run cannot attest to the Reviewer, Security, or Integration roles |

## 8. Conditions and observations

None of the following falsifies an Author claim. All are recorded for the Reviewer,
Security reviewer, and Integration Owner to disposition.

**C1 — a zero-match glob exits 0.** In FT5, running the corrected command from an
unrelated working directory produced exit `0` with `tests 0`. The Node test runner does
not fail when the pattern matches nothing. `npm run check` is not exposed to this
(FT1 and FT4 prove npm always runs scripts from the package root), so the shipped
command is safe. However, the suite has no floor: if `test-kits/` were ever moved,
renamed, or emptied, CI would report success having run nothing — the same class of
silent-non-execution defect this package exists to fix. A future guard asserting a
minimum executed-test count would close it. This is a residual robustness gap, not a
defect in the change under test.

**C2 — only the WP-0A-A0-001 amendment is presently load-bearing.** Reverting *only*
`WP-0A-CON-001.json` to its pre-amendment globs still leaves the ownership validator at
exit `0`. The CON-001 narrowing is therefore preventive — it forecloses future overlap
with planned follow-on contract packages per RFC-2026-003 decision 3 — rather than a
fix for a currently-detected violation. This is consistent with the Author's own
description of those globs as capturing "the outputs of every planned follow-on contract
package", and contradicts no recorded claim. Whether a preventive cross-package
amendment carries the same authority as a corrective one is a Reviewer / Integration
Owner ruling, not a Tester finding.

**C3 — stale field in the handoff under test.** `handoffs/WP-0A-A0-002-author-handoff.json`
records `"head_revision_or_patch_checksum": "pending-commit"` while the actual branch
head is `1873ade`. This is handoff metadata, outside the `tests` array this run was
tasked to replay, but it should be corrected before the handoff is relied on for merge.

**C4 — Tester role assignment is not yet recorded.** `role_assignments.tester_agent_run_id`
in `work-packages/WP-0A-A0-002.json` is still `null`. This run did not edit that
manifest, because doing so was outside its instructed write scope. Recording the
assignment is a dispatcher action and remains outstanding.

**C5 — concurrent independent runs detected in the working tree.** During this run's
verification, untracked capability declarations belonging to other in-flight runs
appeared in `.agents/capability-profiles/`:

| File | mtime | `agent_run_id` | Role |
|---|---|---|---|
| `cc-a1-bastion.json` | `2026-08-31 21:05:36` | `/claude/a1_bastion` | Security/Privacy reviewer |
| `cc-c0-contract-reviewer.json` | `2026-08-31 21:07:19` | `/claude/c0_contract_reviewer` | Reviewer |

Both appeared after this run began and all four `cc-*` declarations (Author, Security,
Reviewer, Tester) accept `WP-0A-A0-002`. **This run did not create, modify, or delete
either file**, and deliberately left them in place rather than "cleaning" other runs'
in-flight deliverables. They are reported so the final `git status` below is not misread
as scope creep by this Tester. They are inside the package's declared writable paths and
are not this run's evidence to vouch for. Because those runs are still writing, the
`git status` recorded below is a snapshot at this run's completion
(`2026-08-31 21:08`) and may legitimately grow further.

This run's verification results are unaffected: capability declarations do not change
test discovery, and the final `npm run check` with all four declarations present still
reported 32/32.

## 9. This run's own writes

Exactly two files, both inside the WP-0A-A0-002 declared writable paths
(`.agents/capability-profiles/cc-*.json` and `evidence/WP-0A-A0-002/**`):

- `.agents/capability-profiles/cc-q0-sentinel.json`
- `evidence/WP-0A-A0-002/test-verdict.md`

Nothing was committed and nothing was pushed. The temporary `package.json` revert was
restored via `git checkout --` and verified byte-identical. The temporary discovery test
file was deleted and verified gone. Scratch copies of the manifest set used for the
falsification in section 5 were created outside the repository and never inside it.

`node scripts/validate-capability-profiles.mjs` after writing this run's declaration:
**exit `0`** (this also confirms `agent_run_id` uniqueness holds across the pre-existing
OpenAI `/root/q0_sentinel` declaration and this Anthropic `/claude/q0_sentinel` one).

Final full re-run with both new profiles present: `npm run check` exit `0`,
**tests 32 / pass 32 / fail 0**; ownership validator exit `0`; secret scan exit `0`.

### `git status --short` at completion (snapshot `2026-08-31 21:08`)

```
?? .agents/capability-profiles/cc-a1-bastion.json
?? .agents/capability-profiles/cc-c0-contract-reviewer.json
?? .agents/capability-profiles/cc-q0-sentinel.json
?? evidence/WP-0A-A0-002/review-security.md
?? evidence/WP-0A-A0-002/test-verdict.md
```

`git diff package.json` is empty and `git diff --name-only HEAD` is empty: **no tracked
file is modified** by this run or any other. All five entries are untracked additions.

| Entry | Owner |
|---|---|
| `.agents/capability-profiles/cc-q0-sentinel.json` | **this run** |
| `evidence/WP-0A-A0-002/test-verdict.md` | **this run** |
| `.agents/capability-profiles/cc-a1-bastion.json` | concurrent Security run (C5) |
| `evidence/WP-0A-A0-002/review-security.md` | concurrent Security run (C5) |
| `.agents/capability-profiles/cc-c0-contract-reviewer.json` | concurrent Reviewer run (C5) |

The concurrent runs continued adding their own deliverables while this evidence was being
written, so the list above is a completion snapshot rather than a final tree state. This
run touched only its own two files.

## Verdict

All seven Author test claims were independently replayed and every one held. The
central acceptance criterion was proven by genuine mutation (26 before, 32 after) and by
a real discovery fault-test (32 → 33 → 32), not accepted on assertion. No test was
removed, skipped, or weakened. Conditions C1–C5 are non-blocking for the test claims but
require disposition by roles other than this one.

VERDICT: test_verified_with_conditions

This is independent Tester evidence only. It is not Reviewer, Security, Integration,
Product Owner, merge, or Gate G0 approval, and it does not advance Gate G0 or any
package status.
