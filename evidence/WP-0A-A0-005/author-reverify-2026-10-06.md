# WP-0A-A0-005: the Author's refresh at main e1fa28e, before the first role verdicts

Run: `/claude/a0_atlas` (Author), working as a subagent of the A0 run for this package. This is the
Author's own record. It is not a role verdict, it approves nothing, and it does not move the package
past `in_review`.

Base: `main @ e1fa28e` (the merge of PR #186). Branch: `agent/claude/WP-0A-A0-005-cardholder-data-scan`,
the name the manifest declares, created again from `origin/main` (no branch of that name was on the remote).

## 1. Where the package stands

- The work merged into main on 2026-09-02 through PR #11 (merge `eadd7d6`). That includes the
  `payment-card-number` rule in `scripts/scan-repository-secrets.mjs`, its tests in
  `test-kits/secret-scan.test.mjs`, and `RFC-2026-008`. The manifest still reads `in_review`. The status
  field and the tree disagree. That is recorded as a blocker for the Integration Owner and is not
  changed by the Author.
- `RFC-2026-008`'s status line records a Product Owner disposition: Approved 2026-09-02, commit `82aae60`.
  The manifest's first open blocker ("RFC-2026-008 is Proposed…") was stale, and this refresh closes it
  with that citation. `RFC-2026-008` itself is not edited, so this PR does not change an RFC.
- **No role verdict exists at any head.** The independent security review and independent testing that
  corrected the rule in its first weeks are recorded only as the Author's own summary inside
  `author-self-check.md` (the sections "Independent security review: `security_changes_requested`…" and
  "Independent testing: `test_failed`…"). No C0, A1, Q0 or R0 file exists under this folder. The G0
  survey row ("Author self-check only; all four role verdicts") is accurate.

## 2. Conditions set by role verdicts

There are none to close. No verdict exists, so no verdict has set a condition. The four role runs owed
are **first** verdicts at the current main, each reviewing the whole package:

| Role | Run | Owed |
|---|---|---|
| Reviewer | `/claude/c0_contract_reviewer` | first review |
| Security (conditional reviewer the manifest requires) | `/claude/a1_bastion` | first security verdict |
| Tester | `/claude/q0_sentinel` | first test verdict, against the six acceptance criteria and four required tests |
| Integration Owner | `/claude/r0_steward` | first integration verdict, including the merged-while-`in_review` state |

## 3. The Owner's step 2, applied to this manifest

Source: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md` (merged in PR #186). The
Owner's words were `บืนยันขั้น 2`.

| Item | Change in `work-packages/WP-0A-A0-005.json` |
|---|---|
| 1. RFC-2026-024's withdrawal extends to the 15 packages | `independence.prefer_cross_vendor_review` becomes `false`. `cross_vendor_exception` is replaced, not deleted, by a sentence recording the withdrawal and its history, in the form RFC-2026-024 §3/2 gives. Independence stays as §3/3 restates it. |
| 2. `/claude/r0_steward` succeeds `/root/r0_steward` | `role_assignments._run_id_disambiguation` records the succession. No acknowledgement on this manifest was ever owed by `/root/r0_steward`: this package's amendments sit on WP-0A-A0-003 and WP-0A-A0-002, and neither names the Codex run. So nothing moves to the successor here, and no acknowledgement is given. |
| 3. No Product reviewer for tooling and contract packages | `role_assignments.product_reviewer_note` records that the null slot is a decision. This is a tooling package with no UX surface, and its gates carry no product step. |

The manifest also gets these changes:

- `required_human_authorities`: the RFC-2026-008 disposition is recorded as given, with its commit.
- `open_blockers`: the stale "Proposed" line is replaced by two lines. One says the four role verdicts
  are owed. The other says the status and the tree disagree. A wrong-acknowledger line is added
  (§4). A G0 line is added. The two carried limitations stay word for word: the 37 of 56 uncorrelated
  decoys, and the future test-card exemption.
- `outputs.files`: this file is added.

## 4. Found while refreshing, and owed outside this package

**The acknowledgements of this package's own amendments name its Author.** `WP-0A-A0-003.json`
`ownership.amended_by[0]` and `WP-0A-A0-002.json` `ownership.amended_by[0]` are the WP-0A-A0-005 records.
Both say `acknowledgement_required_from: /claude/a0_atlas` and `acknowledgement_status: pending`. But
`/claude/a0_atlas` wrote those amendments, and an Author cannot acknowledge its own amendment. Both
owning packages name `/claude/r0_steward` as Integration Owner. Neither file is in this package's
writable paths, so this PR does not correct them.

| Owed | Owner |
|---|---|
| Correct `acknowledgement_required_from` on `WP-0A-A0-003.json` `amended_by[0]` and `WP-0A-A0-002.json` `amended_by[0]` to the owning package's Integration Owner | WP-0A-A0-003 and WP-0A-A0-002 (their own manifests) |
| Review both amendments and record the acknowledgements | `/claude/r0_steward` |
| `evidence/g0-tracker-th.md` row for A0-004/A0-005 ("author self-check เท่านั้น") moves only when verdicts exist | WP-0A-A0-001 |
| Decision Register §9.3.1 cross-vendor clause (line 527) amended per step 2 item 1 | Register owner (`docs/**` is read-only to every package) |
| Disposition of the merged-while-`in_review` state (PR #11 predates RFC-2026-025 and carries no role signature of this package) | `/claude/r0_steward` |

## 5. Tests re-run at main e1fa28e

Toolchain: `node v24.20.0`, `npm 11.19.0`. Every run was on the branch name, never on a detached HEAD.
A detached HEAD skips the handoff guard and reads a false green.

| Command | Exit | Result |
|---|---|---|
| `node scripts/scan-repository-secrets.mjs` | 0 | no output |
| `node --test test-kits/secret-scan.test.mjs` | 0 | tests 46, pass 46, fail 0, skipped 0, todo 0 |
| `npm run check` (before this refresh, on the branch, handoff untouched) | 1 | tests 691, pass 689, **fail 2**, skipped 0 |

Both failures have one cause, and that cause is what this refresh fixes. The handoff cited head `dcb3ffc` of
2026-09, and 390 substantive paths changed after it:

- `test-kits/handoff-conformance.test.mjs` "the handoff for this branch describes this branch"
  fails directly.
- `test-kits/ratchets-bite.test.mjs` "the handoff ratchet fails when an author handoff claims another
  role approved something" fails at its precondition. It runs the conformance suite on an unmodified
  copy, and that copy fails for the same reason.

The handoff refreshed with this change records the green `npm run check` at the branch head. It is
written last, in a commit of its own.

The four `required_tests` are covered by `test-kits/secret-scan.test.mjs`:

- each issuer family, in hyphen-separated and space-separated forms;
- Luhn-invalid runs, unrecognised prefixes and adjacent-digit boundaries;
- the published provider test card, built at run time;
- the full-repository scan, which exited 0.

This is the Author's reading of a green suite. Independent testing has not attested it at this head.
