# A1 security/privacy re-verification: WP-0A-A0-005 at head fb03d42

- **Package:** `WP-0A-A0-005` (the secret scanner detects cardholder data). **Role:** independent
  Security/Privacy reviewer, run `/claude/a1_bastion`.
- **Subject:** PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/190> (Draft), branch
  `agent/claude/WP-0A-A0-005-cardholder-data-scan`, head `fb03d42`, base `main @ 8c089cc`.
  Author `/claude/a0_atlas`.
- **Review branch:** the head was checked out into `recheck/a1-WP-0A-A0-005`; this file is its only change.
- **Status:** this file records findings. It advances no status, approves nothing, and fixes nothing.

## 0. What I am

A subagent of `/claude/a0_atlas`, the Author's own run: the same vendor and the same model family, which
RFC-2026-024 records as the limit of this role's independence. Accepting this record as the A1 role's
signature is the Integration Owner's and the Product Owner's act, not mine. I measured in a private clone
and report; I did not and cannot approve, test-verify as an independent role, or integrate.

## 1. My earlier verdict, and its conditions

**There is no earlier A1 file for this package.** `evidence/WP-0A-A0-005/` held only the Author's
`author-self-check.md` and `author-reverify-2026-10-06.md`. The 2026-08/09 security rounds
(`security_changes_requested`, two High; then the continuation-set, non-ASCII-digit and table
false-positive rounds) exist only as the Author's summary inside `author-self-check.md`. I read that
summary as the record of what was asked; I cannot certify it as a verdict I gave. So this is, in
substance, the **first** A1 verdict file, and it reviews the whole package: the PR #190 diff and the
`payment-card-number` rule that reached main through PR #11 (`eadd7d6`).

Of the conditions the summary records as raised, measured at this head:

| Raised earlier (per the Author's summary) | At fb03d42 |
|---|---|
| High 1, greedy window hid a card followed by expiry/CVV | **closed**: card + expiry + CVV on one line reported (suite) |
| High 2, UnionPay / 14-digit Diners / Maestro / RuPay unreachable | **closed**: nine families in `ISSUER_RANGES`, each a test |
| Medium 3, wrapped and NBSP-grouped cards | **closed** for two-line wraps (suite) |
| Fullwidth / Thai / Arabic-Indic digits | **closed**: `foldDigits` at the run boundary, seven tests |
| Continuation leaders `#`, `//`, ` * ` | **closed** (suite) |
| Table false-positive rate (64% / 45%) | **closed** to the stated irreducible 24% / 0% by the whole-run rule |
| Low 6, a near-PAN written literally in the test | **closed**: every case built by `synthCard` at run time |

## 2. Measured vs read

**Measured**, Node `v24.20.0` (`/Users/bank/.local/node-v24.20.0/bin/node`), in a private clone under the
session scratchpad, checked out on the **branch name** `agent/claude/WP-0A-A0-005-cardholder-data-scan`
at `fb03d42`, `origin/main` fetched at `8c089cc`. No database was needed or started.

| Command | Exit | Result |
|---|---|---|
| `node scripts/scan-repository-secrets.mjs` | 0 | no output |
| `node --test test-kits/secret-scan.test.mjs` | 0 | tests 46, pass 46, fail 0, skipped 0 |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-005` | 0 | all 3 changed path(s) are declared, and every amendment explains one |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-005.json` | 0 | |
| `npm run check` | 0 | tests 692, pass 692, fail 0, skipped 0 |

Probes (`scanText` on synthetic cards built at run time from a Luhn check digit; no card number is
written in this file or committed anywhere) and a scratch variant of the scanner, both kept in the
private directory only.

**Read:** `CONTRIBUTING_AGENTS.md`; `work-packages/WP-0A-A0-005.json` whole; `git diff 8c089cc..fb03d42`
whole (3 files: manifest, `author-reverify-2026-10-06.md`, the handoff); both Author evidence files;
`scripts/scan-repository-secrets.mjs` lines 60-290 and 376-584; the list test in
`test-kits/secret-scan.test.mjs` (566-590); `RFC-2026-008` grep. **Not measured:** git history was not
scanned for card numbers (RFC-2026-008 already records that history is out of the scanner's reach).

## 3. The PR #190 diff itself

No security or privacy regression. It touches only the manifest, one evidence file and the handoff; the
scan over the tree is clean; no credential, private URL or personal data was added. The manifest changes
(cross-vendor withdrawal per the Owner's step 2 and RFC-2026-024, succession note, product-reviewer note,
emptied `amends_without_owning.paths` with history kept in `rationale` and `recorded_on`) do not widen any
writable path; emptying `paths` *narrows* this package's standing permission over the scanner. The
`security_reviewer_agent_run_id` remains `/claude/a1_bastion` and `review_and_test_gates` still carries
`security_approved`. The wrong-acknowledger blocker (`amended_by[0]` naming the Author on WP-0A-A0-003 and
WP-0A-A0-002) is correctly identified and correctly left to the owners; I agree an Author cannot
acknowledge its own amendment.

## 4. Findings

### A1-005-1 (High): a whole card on its own line inside any 3+-line one-group-per-line run is not reported

`containsPaymentCardNumber` (`scripts/scan-repository-secrets.mjs:204`) returns `false` outright when a
run has three or more lines and each line carries exactly one digit group. The guard was added to stop a
card *split one group per line* from being confused with a list, and the test and comment state that
cost. But it also discards every line that is **itself a complete card**, because the per-line reading
(Reading 1) is never reached. Measured, synthetic Visa/Mastercard numbers, path `evidence/x.md`:

| Shape | Reported |
|---|---|
| bare card alone | yes |
| bullet list `- id` / `- card` / `- id` | **no** |
| plain column of ids with a bare card in it | **no** |
| ids, ids, then the card last | **no** |
| JSDoc ` * ` block with a bare card | **no** |
| YAML list (`  - `) with a bare card | **no** |
| single-column CSV export with a card | **no** |
| a card followed by two short numbers on the next lines | **no** |
| **three cards, one per line** | **no** |
| two-line column (id, card) | yes |
| bullet list with the card grouped 4-4-4-4 | yes |

A column of PANs, one per line, is the plainest bulk-leak shape (a CSV export, a log dump, a pasted
list), and it is invisible. This contradicts acceptance criterion 1 ("A Luhn-valid card number carrying a
recognised issuer prefix is reported, in prose and in code alike"); the stated trade-off in the test
comment and in `author-self-check.md` names only the split-card loss, not this one. No test covers it.

**Measured remedy, not applied:** in a scratch copy, replacing the early `return false` with a per-line
check (`return lines.some((line) => scanReading(line.match(/[0-9]+/g)))`) reports all nine missed shapes
above, keeps `test-kits/secret-scan.test.mjs` at 46/46 including the three list false-positive tests
(a 4-digit list item cannot reach 13 digits on its own), and the full-tree scan with that variant still
reports **zero** findings. So nothing in the tree today hides behind this gap, which is why it is not
stop-the-line. The fix belongs to whoever next amends `scripts/scan-repository-secrets.mjs` and its test
(owned by WP-0A-A0-003; this package would have to re-declare them under `amends_without_owning`).

### A1-005-2 (Low): the doc comment for the PAN rule appears twice

Lines 72-86 and 119-133 carry the same block comment verbatim; the first sits above `ISSUER_RANGES`, the
second above `DIGIT_RANGES`. No behavioural effect. Worth removing in the same edit as A1-005-1.

### Carried, agreed, not re-litigated

Reporting published provider test cards (RFC-2026-008) stays correct for G0. The refused separators
(`.` `,` `/` `_`) and the 24% four-4-digit-column cost are stated with numbers and I accept them. A
pattern scanner cannot prove absence; that blocker stays.

## 5. Verdict

**`security_changes_requested`** for WP-0A-A0-005, on A1-005-1.

- **Stop-the-line:** no. No secret or card is exposed; the full-tree scan is clean with and without the
  remedy. It is a detection gap in a control, not an incident.
- **PR #190 (this records PR):** its own diff is clean and I raise nothing against it. But the review is
  not clear: the package's first A1 verdict is changes-requested, and the manifest at `fb03d42` does not
  record A1-005-1. Under the standing PO delegation (merge when reviews are clear), the Author should not
  merge #190 until **either** (a) A1-005-1 is fixed and tested (with the scanner and test re-declared
  under `amends_without_owning`), **or** (b) the manifest's `open_blockers` records A1-005-1 by name and
  points to this file, keeping the package at `in_review`, and the Integration Owner accepts merging a
  records-only PR with an open A1 condition. Either path is a re-check for me at the new head.
- Nothing here moves the package past `in_review`; C0, Q0 and R0 first verdicts are still owed.
