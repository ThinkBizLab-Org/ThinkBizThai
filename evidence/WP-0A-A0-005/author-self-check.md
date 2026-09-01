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

## The wrap fix was half a fix

Independent review found a Luhn-valid Visa written `4-4-4-4` and wrapped **before its
final group** going unreported. The cause: I applied the layout test to the
*wrap-merged* groups, so `[4,4,4,4]` became `[4,4,8]` and an 8-digit tail is not
card-like.

The review also spotted a latent bug that was masking it — `pendingWrap` was set on a
newline and never reset, so every group after the first newline merged into the
previous one. Fixing the reset alone would have *regressed* detection for the layouts
that only worked by accident. The reviewer said the two had to move together, and they
do.

The real point is that a line break is **ambiguous**: it may have split a group, or it
may have replaced the space between two groups. The medium does not say which. So both
readings are tried — one per subset of wrap boundaries, capped at eight wraps, because
no real card is written across nine lines.

All four wrap positions are now tests. False-positive rates are unchanged: 0.000% for
rows of five 3-digit and eight 2-digit integers, 3.5% for four 4-digit and two 8-digit
ones, 10.1% for 16-digit ids beginning with 4. Verified the tests bite by restoring
the single-reading behaviour.

```
$ npm run check
ℹ tests 133   pass 133   fail 0   skipped 0   todo 0
```

## The continuation set covered other people's documents, not this repository's

Independent security review wrapped a Luhn-valid Visa inside a `#`-commented YAML
block and inside a ` * ` JSDoc block. Neither was reported. The same file with `# `
rewritten to `> ` **was** reported — only the leader differed.

`>` and `|` are how a quoted email and a markdown table continue a line. `#`, `//` and
` * ` are how **this repository** continues one, and this scanner's own source is a
` * ` block.

Ten separator code points were also missing, each beside a neighbour that was already
covered: **U+2010**, the actual typographic hyphen, while U+2011/2013/2014 were
listed; **U+2012 FIGURE DASH**, which Unicode defines specifically for use *between
digits*; the em, en and hair spaces beside U+2007/U+2009; the soft hyphen and
zero-width space a justified or HTML-rendered statement carries; and the minus,
fullwidth hyphen and ideographic space a CJK or Thai IME produces.

All thirteen are now tests. False-positive rates are unchanged — 0.000% for rows of
five 3-digit and eight 2-digit integers, 3.4% and 3.6% for four 4-digit and two
8-digit ones, 10.1% for 16-digit ids beginning with 4 — so the widening cost nothing.

```
$ npm run check
ℹ tests 135   pass 135   fail 0   skipped 0   todo 0
```

## My own widening broke the build on ordinary Markdown

Independent security review found that adding `#`, `//`, `*`, `-` and `/` to the
line-continuation set meant a newline followed by a bullet no longer ends a digit run.
A five-line Markdown list of four-digit build numbers became a `payment-card-number`
finding, and this rule has **no prose exemption**, so it fails the whole build.

Measured by the reviewer over 20 000 documents per shape: **15.06% of markdown bullet
lists** and **33.53% of JSDoc number blocks**, against 0.000% before the widening —
on exactly the evidence and runbook files this repository is made of. I widened the
set to catch a card wrapped inside a comment and did not measure what else the change
admitted.

Three or more lines each carrying exactly one group is a list, not a wrapped card.
Both false positives go to zero, and every other wrap case still reports.

**The cost, stated rather than buried:** a card written one group per line down three
or more lines is no longer detected. I deleted the test that asserted it. That case is
speculative; breaking CI on ordinary documents is not, and a rule that fails on
documentation is a rule someone deletes.

## Still open, and the sharpest one is ours

- **Fullwidth digits (U+FF10–FF19) and Thai digits (U+0E50–U+0E59) are not detected at
  all** — the run regex is `[0-9]` and `isPaymentCardNumber` strips non-ASCII. The
  rule's own comment claims to cover what a Thai IME produces; it widened the
  *separators* for that and never the *digits*. On a Thai-market product a bare
  16-digit fullwidth PAN is the plainest possible representation and is invisible.
- A hyphenated card wrapped immediately after its hyphen; `;` continuations for
  `.ini`/`.sql`; several further separators. 28 of 33 probed shapes missed.
- The false-positive figures I quoted were single-row shapes. Dense tables are much
  worse and were already: **68.9%** for eight rows of space-separated 4-digit amounts,
  **48.9%** for an aligned numeric id column. Four groups of four is the card layout;
  this is the irreducible cost, and the honest number is the table one, not mine.

## Non-ASCII digits are now detected

A digit is not always U+0030..U+0039. The rule was blind to **fullwidth** (U+FF10–19)
and **Thai** (U+0E50–59) digits, on a Thai-market product, in a rule whose own comment
claims to cover what a Thai IME produces — it had widened the *separators* for that
scenario and never the *digits*. A bare sixteen-digit fullwidth card number, the
plainest representation there is, was invisible.

Folded at the run boundary, so the grouping analysis counts them as digits: fullwidth,
Thai, Arabic-Indic and Eastern Arabic-Indic, including a number written half in ASCII
and half in Thai. Seven cases, all now reported and all tests.

False-positive rates are unchanged — 0.000% / 3.5% / 0.000% / 3.5% / 10.0% / 3.1%
across the six shapes measured — because a benign ASCII table contains no fullwidth
digits to fold.

**One mutation did not bite and that was worth following up.** Restoring the ASCII
strip inside `isPaymentCardNumber` failed nothing, because the scanner folds the run
before calling it. The fold there is redundant *on that path* and correct on the one
the exported function is called on directly by tests, so it stays with that reason
written down. The fold that does the work — at the run boundary — fails a test when
removed.

## The rule was not usable on the documents this repository is made of

Independent security review measured the false-positive rate on ordinary numeric
documentation and it was **64% for eight rows of four 4-digit amounts** and **45% for
an aligned numeric id column**. This rule has no prose exemption and any finding fails
the whole build, so those are benchmark and evidence files failing CI at will. A rule
that fires on half of all numeric tables is a rule someone deletes, and that outcome
is worse than any single missed representation.

Almost all of it came from **windows joining the tail of one row to the head of the
next**, and not one of those windows was a card.

The principle that fixes it: **a card the medium wrapped is the WHOLE run.** The line
ran out of width in the middle of one number and the rest continues below. Anything
that spans a line break while being only *part* of the run is two different numbers
meeting at a row boundary. So a multi-line run is read twice — each line on its own,
and the whole run as one wrapped number, where only a window covering all of it counts.

| shape | before | after |
|---|---|---|
| eight rows of four 4-digit amounts | 64.15% | **24.43%** |
| aligned numeric id column | 45.10% | **0.00%** |
| markdown bullet list of 4-digit ids | 0.00% | 0.00% |
| JSDoc block of 4-digit numbers | 0.00% | 0.00% |
| metrics table, 3–4 digit latencies | 0.00% | 0.00% |
| ISO timestamps and durations | 0.00% | 0.00% |
| one row of four 4-digit integers | 3.50% | 3.52% |

Every card representation still reports — all thirteen wrap and separator cases, all
nine issuer families, all seven non-ASCII digit cases.

**What is left is arithmetic, not a defect.** A single row of four 4-digit numbers is
written exactly the way a card is written, and one such row in twenty-nine passes both
Luhn and an issuer prefix. Eight rows give eight chances, hence 24%. No rule that
detects `4-4-4-4` can avoid this, and a rule that avoids it does not detect cards in
tables. The honest number is 24%, and it is stated rather than averaged away.

**A first attempt used a digit-count threshold** — a multi-line run carrying more
digits than a card plus context is a table. It cut the id column to zero and left the
eight-row table at 64%, because the groups from every row were still one sequence.
Replaced by the whole-run rule, which is a property rather than a number.

**And the first draft of the new test put a Luhn-valid card into this file.** The
repository's own scanner reported it, which is the control working on its author.
Rebuilt with `synthCard` like every other case here.

## The missed representations, measured one at a time

Independent security review reported **18 of 46 realistic representations missed** and
said fixing them was a wave of work rather than a line. It was, because twice a
widening of this rule shipped without its price being read and both times it broke the
build on ordinary documents.

So each candidate separator was measured in both directions before any decision —
what it detects, and what it costs across ten shapes of numeric documentation, 3000
trials each.

### Accepted: four representations, no measurable cost

| separator | gains | cost |
|---|---|---|
| `\|` | a markdown table row, inline pipe separators | no shape worsened |
| `=` before a newline | the quoted-printable soft break a pasted email carries | no shape worsened |
| U+200D zero-width joiner | a joiner between groups | +0.5% on one shape |

The zero-width joiner has no business between digits at all, which is why half a
percent on one shape is worth it.

### Refused: four representations, each costing about a quarter of a common document

| separator | gains | cost, measured |
|---|---|---|
| `.` | dot-separated groups | 0.0% → **24.1%** on semantic versions and dotted build ids |
| `,` | comma-separated groups | 0.0% → **24.2%** on a CSV of numeric metrics |
| `/` | slash-separated groups | 0.0% → **24.8%** on file paths with numeric segments |
| `_` | underscore-separated groups | 24.2% → **26.4%** on numeric tables |

`v1.02.003 build.4111.1111.1111.1111` is a version string.
`/var/log/4111/1111/1111/1111.log` is a path. A CSV of four numbers per row is the
single most common numeric document there is. Each of these would have bought one
representation and made a quarter of those documents fail the build.

**The refusals are pinned as tests**, so adding one later is a deliberate act with a
number to argue against rather than a rediscovery. The measurements are in the
scanner's own comment beside the separator class.

## Where the rule stands

Detected: nine issuer families at their real lengths; unbroken, 4-4-4-4, Amex 4-6-5,
Diners 4-6-4, 13-digit 4-4-5, column-aligned; every wrap position on two lines
including quoted-email, markdown and comment continuations; thirteen Unicode
separators; fullwidth, Thai, Arabic-Indic and mixed-script digits; PAN followed by
expiry and CVV; markdown table rows; quoted-printable breaks.

Still missed, and now with a reason attached rather than an omission: the four refused
separators above, a card written one group per line down three or more lines (refused
— it is indistinguishable from a bullet list, which cost 15% of them), and a card
wrapped ungrouped across three narrow lines (same rule).

False positives on ordinary documents: **0.00%** on bullet lists, JSDoc blocks,
aligned id columns, markdown pipe tables, CSV metrics, version strings, file paths,
latency tables and timestamp lines. **23.7%** on eight rows of four 4-digit amounts,
which is the irreducible arithmetic of `4-4-4-4` being how a card is written.

## `|` was accepted, then withdrawn, and the reason is about my measurement

I added `|` as a separator in the wave that introduced the "measure both directions
before accepting" harness. Independent review then measured a **markdown table of four
4-digit columns over eight rows at 22.2%** — the most common table shape in this
repository's evidence files, on a rule with no prose exemption, so it fails the whole
build.

**I had measured `|`'s price against a three-column markdown table with mixed widths**
— a shape that cannot produce sixteen digits and therefore could never have tripped it.
I chose, without meaning to, a benign shape that could not fail. A price measured
against a shape that cannot pay it is not a measurement, and I made that error while
building the harness meant to prevent exactly it.

Re-measured properly:

| shape | with `\|` | without |
|---|---|---|
| markdown table, four 4-digit columns, 8 rows | **24.3%** | **0.00%** |
| single markdown row, four 4-digit cells | 3.8% | 0.00% |
| markdown table, three columns, mixed widths | 0.00% | 0.00% |

And what it bought:

| card representation | with `\|` | without |
|---|---|---|
| a card **split across four table cells** | detected | missed |
| a card pasted **bare into one cell** | detected | **detected** |
| a card pasted **grouped into one cell** | detected | **detected** |

Nobody writes a card split across four table cells. A card pasted *into* a cell is
what a real leak looks like, and it is detected either way. `|` is withdrawn and the
refusal is pinned as a test.

## Where the false-positive rate now stands

**0.00%** on markdown tables of every shape measured, bullet lists, JSDoc blocks,
aligned id columns, CSV metrics, version strings, file paths, latency tables, timestamp
lines, JSON number fields and sha256 digests.

**24.3%** on eight rows of four *space-separated* 4-digit amounts — one shape, and the
irreducible one. A row of four space-separated four-digit numbers is written exactly the way a card is
written; the per-row floor is P(issuer prefix) × P(Luhn) ≈ 3.5%, and eight rows
compound it. Any rule that stops reporting that stops detecting cards in tables.

### And the scanner caught this file

The paragraph above originally spelled the irreducible case out with a real
Luhn-valid card number as an illustration. `npm run check` exited **70**:

```
pii: payment-card-number — evidence/WP-0A-A0-005/author-self-check.md
```

Third time this control has fired on its own author — once on the rule's tests, once
on a draft of the table test, now on the evidence describing it. Each time the lesson
is the same and worth restating: **the reason no card number is written literally
anywhere in this package is not tidiness.** A rule that has to exempt the files
describing it is a rule with a blind spot, and I keep proving it by walking into one.

I also pushed before checking the exit code again. The commit message for that push
claims `exit 0`; it was 70. Corrected in the following commit rather than amended away.
