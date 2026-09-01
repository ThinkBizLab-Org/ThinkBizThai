# WP-0A-CON-008 — response to the ninth independent review

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification.

## The result that matters

**The injection attack failed, and not narrowly.** Nine independent runs have now been
dispatched against this stack; the first eight each shipped an untested business rule
past every guard. The ninth could not, after two exhaustive sweeps:

- **10,780 structural mutations** — 29 operators across every schema node in all
  fourteen contracts: `not:{}`, `oneOf:[{},{}]`, empty-branch inserts, `if`/`then`/
  `else`/`items`/`properties` inserts and deletes, combinator renames, branch
  duplication, `not:{not:X}` wrapping. **1,508 passed every guard, and all 1,508 are
  semantically vacuous** — no witness over 4,000 deep-fuzzed instances each.
  **Zero meaning-changing survivors.**
- **11,710 assertion mutations** — 17 keywords × insert and tighten, at every node,
  plus new properties with `{}`, `{type}` and `{maxLength}` schemas. **51 invisible to
  the constraint surface, all 51 inside `x-amended-by` subtrees** the validator also
  ignores. **Zero live-schema assertion changes are surface-invisible.**

It also measured the slack: `sites.length === SITE_FLOOR` on **all fourteen**
contracts, so there is no room to offset an addition against a deletion.

## What it still found

**A third spelling of the misleading record.** `|tests|717|` was closed, then a second
table appended below was closed — and a **three-column** table, a pipe-less GFM table,
raw HTML and plain bold prose all still slipped through, because the parser only ever
recognised a two-cell row.

The reviewer's fix direction is right and I took it: **stop parsing.** The file is
compared **byte-for-byte** against what the writer would produce. It either *is* the
generated record or it is not one. Enumerating markdown table syntaxes is a losing
game; there are always more of them than a regex holds.

**`surfaceOf` still applied keyword dispatch to property names.** I fixed that in
`constraintSites` last round and did not carry it across. `subject.properties.type`
was recorded as a `type` assertion whose value is the entire subschema, 380 characters
including an `x-` annotation every other guard deliberately skips — so **appending one
sentence to a comment failed CI**. A false failure, and a nonsense line in the record a
reviewer is supposed to read. Both fixed and both verified: the comment edit now
passes, the three-column table now fails.

**`notSites` hardcoded polarity 1.** The reviewer could not exploit it and neither
could I — a positive kill needs a rejected fixture to become accepted, and conformance
guarantees each rejected fixture is rejected for its own defect. Fixed anyway: code
that contradicts the comment above it is a defect waiting for its context to change.

## A claim of mine the review corrected

I repeated the eighth review's summary that the card rule has **"0 false positives
across 14 document shapes"**. Re-measured over 35 shapes at 2,000 samples each, that is
wrong. The real figure that matters:

| shape | false-positive rate |
|---|---|
| **markdown table, 4 columns of 4-digit values, 8 rows** | **22.2%** |
| single markdown row of four 4-digit cells | 3.0% |
| bare 16-digit numeric id | 3.0% |
| hyphenated numeric ids (8-8, 4-12, 6-10) | 2.9–3.8% |
| 3-digit columns, UUIDs, IPv4, timestamps, epoch ms, semvers, numeric paths, Thai phone numbers, prices, diff hunks, bullet lists, JSDoc blocks | 0.0% |

The ~3%-per-line figure is the information-theoretic floor — P(issuer prefix) ×
P(Luhn) — so it is not a defect. **The 22.2% for an eight-row four-column table is
real, that is the most common table shape in this repository's evidence files, and the
rule is not prose-exempt, so it fails the whole build.** I have been quoting a figure
for a *space-separated* table and treating it as covering the markdown one.

And a fourth miss class nobody had recorded: **a PAN embedded inside a longer digit
run** (`9<pan>9`). That one is deliberate — an earlier review required that a longer
identifier must not yield a card from its middle — but it was never written down as a
trade, only as a test.

Both are now recorded rather than left to be rediscovered.

```
$ npm run check
exit 0
```
