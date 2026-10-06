# WP-0A-A0-005: the Author closes the role conditions at fb03d42 (2026-10-06)

Run: `/claude/a0_atlas` (Author), working as a subagent of the A0 run for this package. This is the
Author's own record. It is not a role verdict, approves nothing and does not move the package past
`in_review`. It follows `author-reverify-2026-10-06.md`.

## 1. Authority and what kind of PR this now is

- The Owner's delegation for this pass: "เอาตามที่คุณแนะนำทุกอย่าง" (do everything as you recommend). A0
  recommended A1's path **(a)**: fix A1-005-1 now, rather than record it and merge records only. A0
  executes that recommendation under the delegation. It does not decide anything the roles left open.
- This increment changes an approved RFC (RFC-2026-008, a dated correction paragraph). That makes PR #190
  a **governance PR** (RFC-2026-025 §5 item 6): the Product Owner merges it, not A0 under the standing
  merge delegation.
- Role records brought onto the branch with `git cherry-pick -x`: `ebcc51f` (C0), `cbfb1c7` (A1),
  `e74d1f7` (Q0), `20956eb` (R0).

## 2. Each condition, as the role worded it, and what was done

| Condition | Source | Done |
|---|---|---|
| A1-005-1 (High): a whole card alone on its line inside a 3+-line one-group-per-line run is not reported | A1 §4; R0 §1 reproduced it | `containsPaymentCardNumber` no longer returns `false` for that run. It returns `lines.some((line) => scanReading(line.match(/[0-9]+/g)))`, which is A1's measured remedy, word for word. New test `reports a whole card standing on its own line inside a list of numbers` covers A1's eight missed shapes: bullet list, plain column, card last, JSDoc block, YAML list, single-column CSV, card then two short numbers, and three cards one per line. Each card is built at run time by `synthCard`. |
| A1-005-2 / C0 F8 / Q0 Q4: the duplicated doc comment | A1, C0, Q0 | The second copy, above `DIGIT_RANGES`, is removed. One copy remains, above `ISSUER_RANGES`. |
| Re-declare the scanner and its test under `amends_without_owning` | A1 §4, R0 §5 | `paths` now holds `scripts/scan-repository-secrets.mjs` and `test-kits/secret-scan.test.mjs` (WP-0A-A0-003), plus `test-kits/integrity-manifest.json` and `scripts/test-suite-contract.mjs` (WP-0A-A0-002). The rationale names A1-005-1. `test-suite-contract.mjs` is needed because the coverage-floor guard refused the suite until its test-name digest was updated (`dc3d730ee7d4d461` became `c2dc04486e768877`). The test floor was raised from 46 to 48. `evidence/VERIFICATION.md` (WP-0A-CON-008) is also declared: `npm run record:verification` regenerates it for the new count, and `commit-when-clean.mjs` refuses a stale record. |
| Q0 Q2: separated-form tests for six families | Q0 | New test `detects each issuer family written with spaces and with hyphens` covers Mastercard (51-55 and 2-series), Discover, JCB, UnionPay, Maestro and RuPay, each grouped 4-4-4-4 with a space and with a hyphen. |
| C0 F2 + Q0 Q3(b): the RFC says non-ASCII digits and soft hyphen are not detected | C0, Q0 | A dated correction paragraph in RFC-2026-008 says they ARE detected (measured). It also lists what is still not detected (measured): a zero-width character between every digit, base64, hex, percent encoding and JSON-array splits. |
| Q0 Q3(a): the RFC's line-break claim | Q0 | **Measured after the fix: the claim is still not true as written.** A card broken one group per line down three or more lines is not detected. That covers an ungrouped 5/6/5 wrap, 4-4-4-4 one group per line, and `pan` + 6/5/5. The correction says so, and it says when a wrap is detected: the run fits in two lines, or at least one line carries more than one group. Only the whole-card-on-one-line case became true. |
| C0 F3: lengths | C0 | Stated as a limitation in the correction, not widened. Measured over 12-19 digits per family: JCB 16 only; Discover 16, 19; Maestro 16, 19. So JCB 17-19, Discover 17 and Maestro 13 are not detected. |
| C0 F1: "the 15" is A0's mapping | C0 | `cross_vendor_exception` now reads "one of those 15 by A0's mapping: the Owner was shown the count, not the ids". |
| C0 F4: false history claim about `/root/r0_steward` | C0, R0 measured | `_run_id_disambiguation` now says that earlier text of the field made the claim, and that no reachable version of this manifest's `open_blockers` names it. |
| C0 F5: `WP-0A-A0-002.json` `amended_by[1]`, `[2]` also name the Author | C0 | Added to the wrong-acknowledger blocker (now `open_blockers[3]`). |
| C0 F6: the removed RFC-008-Proposed blocker | C0 | Restored at `open_blockers[0]`, its index on main, and closed in place with `Text as recorded:`, following PR #186's convention. The "no role verdict" blocker (`[1]`) is also closed in place, because all four first verdicts now exist. |
| C0 F7: rollback | C0 | Manifest `rollback_or_forward_fix`: a merged PR is reverted by reverting its merge commit. The handoff's own text is rewritten at the handoff refresh, which this pass does not do. |
| R0 R3: keep `in_review` | R0 §5 | `status` stays `in_review`. R0's disposition is recorded on the status/tree blocker (`[2]`): the manifest must not be advanced to match the tree. |

New blockers: `[4]` A1-005-1 is fixed but **not closed**. It closes only on A1's re-check at the new head.
C0 and Q0 re-check this increment, and R0 gives a fresh verdict, because the 2026-10-05 file does not carry
forward. `[5]` is the RFC/rule disagreement, open until the Owner merges.

## 3. Measured (Node v24.20.0, branch name `agent/claude/WP-0A-A0-005-cardholder-data-scan`)

| Command | Exit | Result |
|---|---|---|
| `node --test test-kits/secret-scan.test.mjs`, scanner fix stashed | 1 | 47 pass, 1 fail: the new list test (red before the fix) |
| `node --test test-kits/secret-scan.test.mjs` | 0 | tests 48, pass 48, fail 0; the three list false-positive tests stay green |
| `node scripts/scan-repository-secrets.mjs` | 0 | no findings over the full tree |
| `npm run regenerate:manifest` | 0 | rebuilt 91 digests |
| `npm run check` (working tree, before commit) | 0 | tests 694, pass 694, fail 0, skipped 0 |
| `npm run record:verification`, then `node scripts/commit-when-clean.mjs` | 0 | the verifier ran clean before the commit; the count is in `evidence/VERIFICATION.md` |
| in-memory probe, before → after the fix | 0 | A1's eight shapes 0/8 → 8/8 reported; fullwidth, Thai, Arabic-Indic and soft hyphen reported both before and after; the three-or-more-line one-group-per-line wrap is not reported before or after |

No card number is written in this file or anywhere on disk. Every probe built its numbers in memory from a
prefix and a computed check digit.

## 4. Not done here

- The handoff refresh, so that the handoff is the last commit and stands alone. A0 runs it next, on the
  branch name. Until then `check:handoff` may be red.
- The acknowledgements on `WP-0A-A0-003.json` and `WP-0A-A0-002.json`. These belong to the owners and to
  R0.
- The merge. This is a governance PR, so the Product Owner merges it.
