# WP-0A-A0-005 — author self-check

Run: `/claude/a0_atlas` (author). This is the AUTHOR's own record and is **not**
independent verification. Review, security, test and integration verification are
open.

Toolchain: Node 24.20.0 / npm 11.19.0, reached via `zsh -lc`, already installed on
the machine. Nothing was downloaded.

## Commands run, with observed output

```
$ npm run check
ℹ tests 126
ℹ pass 126
ℹ fail 0
ℹ skipped 0
ℹ todo 0

$ node scripts/scan-repository-secrets.mjs
(no output, exit 0)
```

The suite was 120 tests before this package and is 126 after.

## Each acceptance criterion, and how it was checked

| Criterion | Evidence |
|---|---|
| Luhn-valid, issuer-prefixed numbers are reported | Seven issuer families asserted, each constructed at run time: Visa 13/16/19, Mastercard on both the `5[1-5]` and `2[2-7]` ranges, Amex 15, Discover 16/19, JCB 16 |
| Luhn-invalid runs are not reported | A valid number with its final digit altered is asserted absent |
| Luhn-valid runs without an issuer prefix are not reported | Two constructed runs, prefixes `9` and `7` |
| A published provider test card IS reported | Asserted, and the number is constructed rather than written down |
| Not prose-exempt | Asserted for `docs/**` and for `evidence/**`, the two locations the national-identity rule also refuses to exempt |
| No card-shaped window from a longer run | A twenty-digit run containing a valid card is asserted absent |
| Repository scan clean, no test skipped | Above |

## Mutation checks on the rule itself

A green test says the code ran, not that it is defended. Each branch was deleted
and the suite re-run:

| Mutation | Result |
|---|---|
| Luhn check always true | 2 failures |
| Issuer-prefix check bypassed | 2 failures |
| Visa 13-digit length removed | 1 failure |
| Mastercard `2[2-7]` range removed | 1 failure |
| Discover `64[4-9]`/`65` ranges removed | 1 failure |
| JCB range narrowed | 1 failure |
| **19-digit length removed** | **0 failures — a real gap** |
| **Repeated-digit filler guard removed** | **0 failures** |

The nineteen-digit gap was closed by adding Visa and Discover cases at that length;
the mutation now fails one test.

The filler guard was not fixed but **removed**. Exhaustive check over all ten digits
and all four card lengths: no repeated-digit run is both Luhn-valid and
issuer-prefixed, so the guard could never fire. Keeping an unreachable branch that
looks like a defence is the failure mode this package exists to avoid.

## Deviations and open items

- The rule reports published provider test cards. This is a decision, not an
  oversight; the argument and its cost are in RFC-2026-008 §"Published provider
  test cards are reported, not exempted". A reviewer who disagrees should say so —
  it is the one judgement call in this package.
- RFC-2026-008 is `Proposed`. Until the Product Owner disposes of it, this rule is
  staged, not authorized.
- Cross-vendor review is **not** satisfied. Every run on this package is Anthropic
  `claude-opus-5`, carried forward as the recorded exception, not as an equivalent.

## Independent security review: `security_changes_requested`, two High

The rule as first shipped missed cardholder data along two paths a real leak takes.

**High 1 — the greedy window hid the card.** A PAN followed by an expiry and a CVV
on one line — a support ticket, a chat paste, a captured form body — was never
reported. The regex committed to the 19-digit window, `isPaymentCardNumber` rejected
it, and `matchAll` advanced past the card inside it without backtracking. My own
test at the time asserted the *inverse* case (no card sliced from a longer run) and
never considered a valid card hidden by a longer window.

**High 2 — whole issuer families were unreachable.** UnionPay (BIN 62) was absent
entirely; for a Thai commerce product that is the wrong network to omit. No 14-digit
length was checked at all, which made Diners Club structurally unreachable. Maestro
and RuPay were also missing.

Fixed by matching the run generously and testing every card-length window that
starts and ends on a written group boundary, and by covering nine issuer families at
the lengths each uses.

**Medium 3 — wrapped and NBSP-grouped cards were missed.** A card broken across an
80-column log line, or grouped with the non-breaking spaces a paste from a rendered
statement carries. Now detected.

**Low/Medium 5 — the widened separator set brought false positives with it**, which
the reviewer measured at 2.6% for rows of small integers. This repository's evidence
directories are full of numeric tables and the rule is not prose-exempt, so a green
CI would have depended on no benchmark table ever concatenating into a Luhn-valid
card. A run now counts only when it is *written* like a card. Measured after: rows of
five 3-digit measurements 0.000% over 200 000 samples, down from 2.6%.

**Low 6 — the negative test held a published test PAN with one digit changed.** In a
block whose stated principle is that no card number is ever written down, one
well-meaning "typo fix" would have committed a real card. Now constructed.

### Verification

| Reintroduced defect | Result |
|---|---|
| Single greedy window | 3 failures |
| Four issuer families removed | 1 failure |
| Grouping plausibility removed | 2 failures |

```
$ npm run check
ℹ tests 131   pass 131   fail 0   skipped 0   todo 0
```

Fifteen must-detect and five must-not-report cases from the review are now tests.

### Accepted, not fixed

- **10.1% of random 16-digit identifiers beginning with 4 are reported.** One
  arbitrary run in ten passes Luhn, and at rest nothing distinguishes such an
  identifier from a card. This is the irreducible cost of the rule.
- **Encoded and non-ASCII digit forms are not detected.** A deliberate refusal, with
  the reviewer's agreement: no accidental-commit path, no obstacle to a deliberate
  exfiltrator, and a large maintenance surface. Recorded in RFC-2026-008.
- **Git history is not scanned**, and under RFC-2026-002's no-force-push control the
  usual remediation is unavailable. Now restated in RFC-2026-008 for this data class.

### Agreed, and acted on

The reviewer agreed with reporting published provider test cards, and set out what
it will cost when the Stripe blocker lifts. RFC-2026-008 now carries the shape the
exemption must take — a named path prefix, an enumerated set, a named owner, and a
test proving a card outside that set is still reported inside that path — so it is
decided in advance rather than negotiated under the payment package's deadline.

## Independent testing: `test_failed`, and the sharpest finding was self-inflicted

**The layout list rejected the way Diners Club is printed.** I added the 14-digit
length *specifically* so Diners would be reachable, special-cased Amex's 4-6-5, and
left 4-6-4 — its neighbour, and how the card actually appears — falling through to
the all-fours rule. Four Diners prefix families missed. Adding a length while
rejecting the layout that length exists for is not a gap in coverage; it is a change
that looked like coverage.

Eleven further real cards were missed: 13-digit Visa in 4-4-5; a column-aligned table
using two spaces; en-dash groups, which is what a word processor makes of a hyphen; a
card wrapped **twice** down a narrow column; and a card wrapped into a quoted email
reply. The last two share a cause worth naming: I was counting a line break as
grouping. A space or hyphen is how someone *groups* a number and must look like a
card; a line break is where the medium ran out of width, can fall anywhere, and says
nothing about layout. They are now handled separately.

All twelve reported misses are detected, and each is a test.

### The false-positive claim was wrong in the direction that flattered the rule

I wrote "rows of five 3-digit measurements fall from 2.6% to 0.000%". Independent
testing measured both halves: **2.6% was a different shape** — rows of four
space-separated integers — and the 3-digit shape's real starting rate was **0.188%**.
I compared the after-number of one shape to the before-number of another and reported
it as an improvement.

The shape the reviewer actually raised got **worse**, 2.3% → 3.1%, because the
widened issuer table admits many more prefixes. I did not disclose that, because I
did not measure it.

Measured now, 200 000 samples each, on what ships:

| shape | reported |
|---|---|
| rows of five 3-digit integers | 0.000% |
| rows of eight 2-digit integers | 0.000% |
| rows of four 4-digit integers | **3.5%** |
| rows of two 8-digit integers | **3.5%** |
| 16-digit ids beginning with 4 | 9.9% |
| 16-digit ids, any lead digit | 3.0% |

The 4-digit-column rate is irreducible: four groups of four **is** the card layout,
and independent testing put the tradeoff exactly — the restriction that gives 0.000%
there is the same one that gives a 100% miss for a real card in a column-aligned
table. Roughly one four-column integer table in twenty-nine will be reported. That is
now stated in RFC-2026-008 as a standing cost rather than presented as a solved
problem.

```
$ npm run check
ℹ tests 133   pass 133   fail 0   skipped 0   todo 0
```
