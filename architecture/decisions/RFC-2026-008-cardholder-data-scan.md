# RFC-2026-008 — The secret scanner must detect cardholder data

Status: Approved 2026-09-02 by the Product Owner — the payment-card rule requires Luhn and an issuer prefix together, and the false-positive cost is recorded. Limitations and Rollback in this document stand unchanged.
Decision needed by: before any payment-provider work package leaves backlog
Owner: A0 Architecture/Integration
Protocol version: `1.0.0`

## Problem

`scripts/scan-repository-secrets.mjs` carries thirty credential rules and three
privacy rules. None of them detects a payment card number.

That is the wrong gap to have. A payment provider is one of this repository's own
declared Gate G0 blockers, so a card number is among the first pieces of regulated
data this repository is likely to meet. `CONTRIBUTING_AGENTS.md` forbids customer
PII repository-wide with no carve-out, and the scanner already enforces that for a
Thai national identity number and a Thai phone number. A primary account number is
customer PII by the same sentence. Enforcing the rule for two classes of Thai
personal data and not for the payment class enforces it selectively.

## Decision

Add one rule, `payment-card-number`, that reports a digit run only when it passes
**both** a Luhn checksum and a recognised issuer prefix at a length that issuer
actually uses.

Both tests are required, and neither is sufficient:

- **Luhn alone is far too weak.** Roughly one arbitrary digit run in ten of the
  right length passes it. A rule built on Luhn alone reports correlation ids, hash
  prefixes and timestamps until someone switches it off, and a rule that gets
  switched off protects nothing.
- **An issuer prefix alone is weaker still.** Every sixteen-digit run beginning
  with `4` would become a finding.

The run is matched generously — digits joined by the separators a card is written
or pasted with, a line break included — and every card-length window that starts
and ends on a written group boundary is then tested. The first version matched one
greedy window and tested only that, which independent security review defeated with
the shape cardholder data actually arrives in: **a PAN followed by an expiry and a
CVV on one line of a support ticket.** The regex committed to the 19-digit window,
the check rejected it, and the scan advanced past the card inside it without ever
backtracking.

Nine issuer families are covered, at the lengths each actually uses. The first
version covered five and omitted **UnionPay** entirely — the highest-volume network
globally and widely accepted in Thai e-commerce, which for this product is the wrong
one to miss — and omitted the 14-digit length altogether, which made Diners Club
structurally unreachable.

**A run only counts as a card when it is written like one.** Two kinds of separator
mean two different things, and treating them alike was a defect:

- A **space or hyphen** is how someone *groups* a number, so the grouping must be a
  layout a card is printed in — unbroken, broken once, groups of four, or one of
  4-6-5 (Amex), 4-6-4 (Diners) and 4-4-5 (13-digit Visa).
- A **line break** is where the medium ran out of width. It can fall anywhere, any
  number of times, and carries no information about layout, so it is transparent to
  the check.

Independent testing found the first version of the layout list too narrow in exactly
the place it mattered: it rejected **4-6-4, which is how a Diners Club card is
printed** — and the 14-digit length had just been added so that Diners would be
reachable at all. Amex's 4-6-5 was special-cased and its neighbour was not. It also
missed a card wrapped twice down a narrow column, and one wrapped into a quoted email
reply, because wraps were being counted as grouping.

### The false-positive cost, stated as measured rather than as it flatters

An earlier version of this document said the rate fell "from 2.6% to 0.000%". That
was wrong, and wrong in the direction that flattered the rule: 2.6% was measured on a
row of four space-separated integers, and 0.000% on a row of five 3-digit ones,
whose real starting rate was 0.188%. Independent testing measured both and the
comparison did not survive it.

Over 200 000 samples each, on what shipped:

| shape | reported |
|---|---|
| rows of five 3-digit integers | 0.000% |
| rows of eight 2-digit integers | 0.000% |
| **rows of four 4-digit integers** | **3.5%** |
| **rows of two 8-digit integers** | **3.5%** |
| random 16-digit ids beginning with 4 | 9.9% |
| random 16-digit ids, any lead digit | 3.0% |

The 4-digit-column rate is **irreducible, not an oversight**. Four groups of four IS
the card layout; a benchmark table written that way is indistinguishable from a card
at rest, and any rule that stops reporting it stops reporting cards. Independent
testing put the tradeoff exactly: the restriction that gives 0.000% on that shape is
the same one that gives a 100% miss for a real card in a column-aligned table.

So roughly **one four-column integer table in twenty-nine** will be reported. That is
the standing cost of this rule and it is stated here so nobody discovers it under
deadline and reaches for a blanket ignore. The mitigation is that a finding names the
file, and a benign one is cheap to resolve — unlike a missed card, which is silent.

The rule is **not prose-exempt**. A card number in a comment, a runbook or an
evidence file is the same disclosure as one in code, and the national-identity
rule already works this way.

## Published provider test cards are reported, not exempted

This is the part worth disagreeing with, so it is stated plainly.

A payment provider publishes card numbers for sandbox use. They are Luhn-valid and
carry real issuer prefixes, so this rule reports them. That is deliberate:

1. At rest, nothing distinguishes a published test number from a live one. The
   scanner reads bytes; the claim "this one is safe" lives outside the file.
2. Gate G0 authorizes no provider integration, so no work package that may
   currently run has a legitimate reason to carry one.
3. An allowlist of known-safe card numbers is the exact shape a real leak hides
   in — one entry added quietly, and the scanner is blind to that number forever.

When a payment sandbox is authorized and that G0 blocker lifts, fixture work may
legitimately need a test card. **Design that exemption before the payment package
starts, not under its deadline.** Independent security review put the cost plainly:
every payment fixture, every webhook-projection vector, every recorded provider
response and every runbook showing an operator a declined charge will trip this
rule, the friction is immediate and continuous, and it lands on the package with the
most schedule pressure and the strongest incentive to reach for a blanket ignore.

The shape it should take, so it is decided in advance rather than negotiated:

1. a named fixture path prefix, not a repository-wide carve-out;
2. an **enumerated** set of provider-published numbers, never a wildcard;
3. a named owner;
4. a test asserting that a card **outside** that set is still reported **inside**
   that path — so the carve-out carries its own tripwire.

What to refuse is the shape refused here: a constant appended to the rule.

## No card number is written literally, anywhere

Neither the rule nor its tests contain a valid card number. The tests construct
one at run time by computing its check digit, the way the Thai national identity
tests already do.

This is not tidiness. A rule that cannot be stated without tripping itself would
have to exempt its own source file, and a scanner with one file it does not read
is a scanner with a place to hide things.

## What was removed rather than shipped

The first draft rejected repeated-digit fillers as a separate guard. Deleting that
guard failed no test, so it was checked exhaustively: across all ten digits and all
four card lengths, **no** repeated-digit run is both Luhn-valid and issuer-prefixed.
The guard could never fire. It was removed rather than kept as a line that looks
like a defence and is not one.

## What this does NOT do

A pattern scanner cannot prove absence. This closes one named class. The 37 of 56
uncorrelated decoys recorded as unreported against `WP-0A-A0-003` remain unreported,
and this rule does not change that number.

**Git history is not scanned.** The scan walks the working tree, so a card committed
and later removed stays in history behind a green scan forever. This is recorded for
the scanner as a whole in RFC-2026-005, but it is restated here because for
regulated cardholder data the usual remediation — rewrite the history — is
unavailable under RFC-2026-002's manual-merge and no-force-push control. A PAN that
reaches `main` is a disclosure that this repository has no mechanism to undo.

**Encoded and non-ASCII digit forms are not detected** — full-width, Arabic-Indic
and Thai digits, zero-width or soft-hyphen interleaving, base64, hex and percent
encoding, and digits split across JSON array elements. This is a deliberate refusal
rather than an oversight: none has a plausible accidental-commit path, and none
stops a deliberate exfiltrator, who has better options. Adding decode passes for
them would multiply the surface a maintainer must reason about while buying nothing.
Independent security review reached the same conclusion and recommended not acting
on them. The one worth revisiting is base64, because a captured HTTP request body
committed as a fixture is a real artifact shape — but that is a scanner-wide
decision, not a card-rule one.

Two further classes are excluded on purpose:

- **Card verification values.** Three digits, no checksum, no prefix. A rule for
  them reports noise and would be disabled, taking the useful rules with it.
- **Thai bank account numbers.** The format carries no checksum this scanner can
  verify, so the same objection applies.

## Consequences if not adopted

The scanner keeps a hole in the one regulated-data class this project has already
named as a dependency, while reporting two others — which reads as a considered
scope decision and is not one.
