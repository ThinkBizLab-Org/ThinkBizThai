# C0 review of WP-0A-A0-005 at PR #190, head `fb03d42`

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/190, branch
`agent/claude/WP-0A-A0-005-cardholder-data-scan`, head `fb03d42`, base `main @ 8c089cc`. The PR changes
three files: `work-packages/WP-0A-A0-005.json`, `handoffs/WP-0A-A0-005-author-handoff.json`, and the new
`evidence/WP-0A-A0-005/author-reverify-2026-10-06.md`. The rule, its tests and RFC-2026-008 have been on
`main` since PR #11 (merge `eadd7d6`, 2026-09-02).

## 0. What I am

I am a subagent of `/claude/a0_atlas`. A0's workflow script spawned me to act as the independent Reviewer
run `/claude/c0_contract_reviewer` for this package. RFC-2026-024 §3/3-4 requires this disclosure. I share
a vendor and a parent with the Author. I wrote none of the package's content and none of the PR. I review
it and I approve nothing beyond this role. This file is not a merge authorisation, not a Security, Tester
or Integration verdict, and it moves no package status.

## 1. The earlier verdict of this role

**None exists.** `evidence/WP-0A-A0-005/` at `fb03d42` holds only `author-self-check.md` and
`author-reverify-2026-10-06.md`. I searched `evidence/` and `handoffs/` for `WP-0A-A0-005`. The closest
record is `evidence/WP-0A-A0-003/review-contract-c0.md:209,558`, which is C0's review of **WP-0A-A0-003**.
It confirms that the `payment-card-number` rule fires on a runtime-built number. It is not a verdict on
this package. So there is no earlier C0 condition to close, and this file is the **first** C0 verdict.
As the handoff's reviewer instructions ask, it covers the whole package (rule, tests, RFC-2026-008,
manifest) and not only the records increment. The Author's statement that no role verdict exists
(manifest `open_blockers[0]`, reverify §1-§2) is accurate.

## 2. Method: measured vs read

**Measured**: run by me in a private clone, on the branch **name**
`agent/claude/WP-0A-A0-005-cardholder-data-scan` at `fb03d42`, never detached. The clone is at
`…/scratchpad/c0-WP-0A-A0-005/repo`. Node `v24.20.0`, npm `11.19.0`. No database was used.

| Command | Exit | Result |
|---|---|---|
| `node scripts/scan-repository-secrets.mjs` | 0 | no output |
| `node --test test-kits/secret-scan.test.mjs` | 0 | tests 46, pass 46, fail 0, cancelled 0, skipped 0, todo 0 |
| `npm run check` | 0 | coverage floor, toolchain, secret scan, protocol validators; tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0 |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-005` | 0 | "all 3 changed path(s) are declared, and every amendment explains one" |
| `node scripts/refresh-author-handoff.mjs --check` | 0 | "describes the branch: nothing substantive after its cited head" (measured before this review commit) |
| `git merge-base --is-ancestor origin/main HEAD` | 0 | the head contains the current `main` (`8c089cc`) |
| `gh pr view 190` (read-only) | 0 | OPEN, Draft, MERGEABLE, head `fb03d42`; required check `bootstrap` was IN_PROGRESS when read |
| In-memory probe 1: 15 card shapes built from fragments at run time, through `scanText` | 0 | all 11 asserted cases behaved as the acceptance criteria require (§3 row "Rule"); 4 observed cases are in F3 |
| In-memory probe 2: the RFC-2026-008 "not detected" list, through `scanText` | 0 | fullwidth, Thai and Arabic-Indic digits and soft-hyphen groups are **reported**. Zero-width-per-digit, base64 and JSON-array splits are not (F2) |

The probes wrote no number to disk. Each number was built from a prefix plus a computed Luhn digit, in
memory.

**Read, not measured**: the manifest diff against `main` (byte for byte), the handoff, the reverify file,
the Owner disposition `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`,
RFC-2026-008, RFC-2026-025 §5, and the scanner source at
`scripts/scan-repository-secrets.mjs:72-160,376-436`. I also read the `amended_by` records of
`WP-0A-A0-003.json` and `WP-0A-A0-002.json` with a parser, the creation and full history of
`work-packages/WP-0A-A0-005.json` (`git log --all`, created in `dcb3ffc`), and commits `82aae60` and
`eadd7d6`.

## 3. What I confirmed

| Claim | Check | Result |
|---|---|---|
| Stale blocker "RFC-2026-008 is Proposed" is closed | RFC-2026-008:3 reads `Status: Approved 2026-09-02 by the Product Owner`. `82aae60` is "Product Owner approves RFC-2026-003 through -009", and it touches RFC-2026-008's status line. | True. RFC-2026-008 is not changed by this PR. |
| Step 2 item 1 applied | `prefer_cross_vendor_review: false`. `cross_vendor_exception` is replaced by a withdrawal record. Disposition §3 row 1 lists WP-0A-A0-002..009 as the 15 (A0's mapping). Independence restated per RFC-2026-024 §3/3. | Applied. See F1 on wording. |
| Step 2 item 2 applied | The succession is recorded, and the record says that naming a successor gives no acknowledgement. This package's `amended_by` records name `/claude/a0_atlas`, never `/root/r0_steward`. | Applied. See F4 on one historical claim. |
| Step 2 item 3 applied | `product_reviewer_note` added. `review_and_test_gates` has no product step. `scripts/validate-work-package-role-separation.mjs` checks only the four core role ids. | Applied. The schema accepts the extra key (`npm run check` validators exit 0). |
| `amends_without_owning.paths` emptied | `verify-branch-scope` exits 0 on the branch, and `git diff --stat origin/main...HEAD` shows 3 files, none of them the four former paths. `recorded_on` still points at the owning manifests, and their `amended_by[0]` entries still record the PR #11 amendments. | Correct. It follows the `0c47050` precedent, and the rationale keeps the history. |
| Wrong acknowledger (new blocker) | `WP-0A-A0-003.json` and `WP-0A-A0-002.json` `amended_by[0]` (`work_package_id: WP-0A-A0-005`) both name `acknowledgement_required_from: /claude/a0_atlas`, status `pending`. Both owning packages name `/claude/r0_steward` as Integration Owner. | True as stated. See F5 for the same defect beyond this package. |
| Status and tree disagree (new blocker) | `eadd7d6` is the PR #11 merge of this branch name. The manifest reads `in_review`. | True. Disposing of it is correctly left to the Integration Owner. |
| Rule meets its six acceptance criteria | Probe 1, asserted cases: Visa bare in code, Visa space-grouped in evidence prose, Visa as a JSON number, Visa in a URL query, Visa NBSP-grouped, Amex 15, Diners 14 and UnionPay 19 are reported. Luhn-broken Visa, a Luhn-valid run with prefix `9`, and a Visa embedded in a 20-digit run are not reported. The repository scan exits 0 over the tree with the rule not prose-exempt. The test suite asserts the published test card is reported (`secret-scan.test.mjs:430`). | Met for every criterion as worded. |
| Required tests exist | `secret-scan.test.mjs:394` (issuer families), `:415`/`:489`/`:623`/`:700` (separators), `:438`/`:465`/`:577`/`:590`/`:677`/`:738` (negatives and boundaries), `:430` (test card); the full scan exits 0. | Present and passing. |

## 4. Findings

| ID | Grade | Finding |
|---|---|---|
| F1 | Minor | `cross_vendor_exception` presents WP-0A-A0-005's membership of "the 15" without saying that the list of 15 is A0's mapping. |
| F2 | Minor | RFC-2026-008's "What this does NOT do" says the rule misses digit forms that it now detects. |
| F3 | Minor | RFC-2026-008:45 says "at the lengths each actually uses". Several lengths that real issuers use are not detected. |
| F4 | Minor | `_run_id_disambiguation` says `/root/r0_steward` was "named in earlier versions of this package's open_blockers". No version of this manifest ever did that. |
| F5 | Info | The self-acknowledgement defect is wider than this package's two records. |
| F6 | Info | The stale blocker was removed outright, while the G0 records PR closed blockers in place. |
| F7 | Info | The handoff's rollback text says "revert its two commits". The increment has five commits plus a merge. |
| F8 | Info | Scanner source carries a verbatim duplicated JSDoc block. |
| F9 | Info | This review commit lands after the handoff commit. |

### F1: membership of the 15 is A0's mapping (Minor)

The disposition says in §3 row 1: "Which 15 packages is A0's mapping, from the survey: WP-0A-A0-002..009
and WP-0A-CON-002..008". The Owner was shown "work package ทั้ง 15 ตัว" and no ids (§1.1). The manifest
says: "the Owner answered … to step 2 item 1 … and WP-0A-A0-005 is one of those 15 (… §3 row 1)". It cites
the right row, but it drops the qualifier that the row itself carries. C0's F1 on PR #186 caught exactly
this pattern: an Owner record carrying more than the Owner was shown. Here the effect is small, because
the mapping is plausible and cited. **Fix:** write "is one of those 15 by A0's mapping (… §3 row 1)".

### F2: RFC-2026-008 understates what the rule detects (Minor)

`RFC-2026-008-cardholder-data-scan.md:165-166` says: "Encoded and non-ASCII digit forms are not detected —
full-width, Arabic-Indic and Thai digits, zero-width or soft-hyphen interleaving, base64, hex and percent
encoding, and digits split across JSON array elements". The code that merged says otherwise:
`DIGIT_RANGES` and `foldDigits` (`scan-repository-secrets.mjs:135-148`), the rule's pattern
(`:429`, which includes U+00AD SOFT HYPHEN and U+200B ZERO WIDTH SPACE as separators), and the test
`secret-scan.test.mjs:649` "reports a card written in digits that are not ASCII". Probe 2 measured it:
fullwidth, Thai and Arabic-Indic digits and soft-hyphen groups are reported. Zero-width-per-digit
interleaving, base64 and JSON-array splits are not. The decision record and the implementation disagree.
The error is on the safe side, since the rule does more than the record claims. But a reader of the RFC
would conclude that a Thai-digit card is invisible and might add a second rule for it. **Owed:** correct
the paragraph to the measured set. RFC-2026-008 is in this package's `writable_paths`, but it is an
approved RFC, so the edit is governance under RFC-2026-025 §5 item 6 and the Owner merges it. It is not
a defect of this PR, which does not touch the RFC.

### F3: lengths are narrower than "the lengths each actually uses" (Minor)

`ISSUER_RANGES` (`scan-repository-secrets.mjs:92-102`) has JCB at 16 only, Discover at 16 and 19, and
Maestro at 16 and 19. Probe 1 observed that a Luhn-valid JCB of 19 digits, a Discover of 17 digits and a
Maestro of 13 digits are **not reported**. Issuers do use JCB 16-19, Discover 16-19 and Maestro 12-19, so
RFC-2026-008:45 overstates the coverage. "What this does NOT do" does not list these lengths. The common
lengths are covered. Widening them has a false-positive cost, which must be measured the way the rule's
own comments demand (`:400-428`), so I do not ask for the widening. **Owed:** either state the uncovered
lengths as a limitation in RFC-2026-008 (governance, as in F2), or widen them with a measured price. That
is for this package's next increment and for A1.

### F4: "earlier versions of this package's open_blockers" (Minor)

The new `_run_id_disambiguation` text says that `/root/r0_steward` was "named in earlier versions of this
package's open_blockers solely because it had to countersign …". The manifest was created in `dcb3ffc`
(`git log --all --diff-filter=A`). In every reachable version, `/root/r0_steward` appears only on the
`_run_id_disambiguation` line (`git log --all -p` filtered on the name: one `+` line in `dcb3ffc` and the
`-`/`+` pair in `25cff93`). The old text said "is named in open_blockers". That was apparently a stale
carry-over, or it meant other packages' blockers. The new text turns it into a historical claim that the
repository does not support. **Fix:** e.g. "earlier text of this field said it was named in
open_blockers; no reachable version of this manifest's open_blockers names it".

### F5: the self-acknowledgement defect is wider (Info)

Blocker 3 is right about the two WP-0A-A0-005 records. The same shape also holds on
`WP-0A-A0-002.json` `amended_by[1]` (WP-0A-CON-007) and `amended_by[2]` (WP-0A-CON-008): both name
`acknowledgement_required_from: /claude/a0_atlas`, and both amending packages have
`author_agent_run_id: /claude/a0_atlas`. The owning packages WP-0A-A0-003 and WP-0A-A0-002 are also
authored by `/claude/a0_atlas`. So the acknowledger named is the author on both sides of each amendment.
This is outside this package. It is recorded so that the owners of WP-0A-A0-002 correct all three
entries in one pass, not one.

### F6: blocker removed, not closed in place (Info)

The "RFC-2026-008 is Proposed" line is deleted, and the remaining entries shift index. The G0 records PR
(#186) closed blockers **in place**, with `Text as recorded:` and stable indices, in A0-001 and
CON-002/003/006. No validator requires that. The closure is correct, and it is recorded in
`author-reverify-2026-10-06.md` §1 and §3 and in git. Following the in-place convention would keep
cross-references by index stable.

### F7: rollback text (Info)

The handoff's `rollback_or_forward_fix` says "revert its two commits". The increment is `25cff93`,
`47da524`, `fdc60ed`, `bacf138`, `fb03d42` and the merge `82071f5`. Once merged, the reviewed revert is
of the PR's merge commit. The text should say that.

### F8: duplicated JSDoc block (Info)

`scripts/scan-repository-secrets.mjs:72-86` and `:119-133` are the same comment, word for word. The file
is owned by WP-0A-A0-003, and the block reached `main` in PR #11. This is cosmetic, and it is for the
scanner's owner.

### F9: handoff ordering (Info)

This file is committed after the handoff commit `fb03d42`. Before merge, A0 must re-run
`npm run refresh:handoff` so that the handoff is again the last commit and touches only itself
(RFC-2026-025 §2 item 1). The handoff guard passed at `fb03d42` before this commit.

## 5. Verdict

**`approved` for the Reviewer role (C0), on head `fb03d42`.**

- **Earlier conditions:** none. This is the first C0 verdict for WP-0A-A0-005 (§1).
- **Stop-the-line: none.** No secret, card number, tenant data, migration, side effect, CI change or
  contract meaning is touched. The PR changes records only. The full repository scan exits 0, and my
  probes wrote nothing to disk.
- **Not a governance PR.** It changes no RFC, `CONTRIBUTING_AGENTS.md`, CI or gate (RFC-2026-025 §5
  item 6). It is not record-only either: it rewords open blockers and other manifest fields (§5 item 1).
- **No C0 finding blocks the merge.** F1 and F4 are one-line wording fixes to the manifest and should be
  made in the same pass. A commit that touches only those strings needs re-checking by this role
  (RFC-2026-025 §5 item 2). F2 and F3 are owed against RFC-2026-008 by a governance increment. F5 is
  owed by the owners of WP-0A-A0-002 and WP-0A-A0-003.
- **What still blocks the merge, outside this role:**
  - the first verdicts of Security `/claude/a1_bastion`, Tester `/claude/q0_sentinel` and Integration
    Owner `/claude/r0_steward`; R0 also disposes of the merged-while-`in_review` state;
  - a green `bootstrap` check on the final head (IN_PROGRESS when read);
  - a refreshed handoff as the last commit (F9).
