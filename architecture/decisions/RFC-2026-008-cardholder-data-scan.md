# RFC-2026-008 — The secret scanner must detect cardholder data

Status: Proposed — awaiting independent review, security, test, integration, and Product Owner disposition
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

Separators are permitted inside the run and the run is bounded by non-digits on
both sides, so a longer identifier does not yield a card-shaped window from its
middle.

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
legitimately need a test card. The exemption should then arrive as a reviewed
decision with a named owner and a bounded path, not as a constant appended to this
rule.

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

Two classes are excluded on purpose:

- **Card verification values.** Three digits, no checksum, no prefix. A rule for
  them reports noise and would be disabled, taking the useful rules with it.
- **Thai bank account numbers.** The format carries no checksum this scanner can
  verify, so the same objection applies.

## Consequences if not adopted

The scanner keeps a hole in the one regulated-data class this project has already
named as a dependency, while reporting two others — which reads as a considered
scope decision and is not one.
