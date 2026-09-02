# WP-0A-CON-008 — response to the eighth independent review

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification.

The review confirmed both headline claims by re-implementing the metric itself —
**653/717 = 91.1%** shipped, **36/717 = 5.0%** with every `invalid-*` fixture dropped —
and then found four defects, two of which compose into a complete green-check
injection.

## 1. The record was never verified; only its digest was

`if (declared.digest === digest) continue;` short-circuited before `sites` was ever
read. The ~950 readable lines were used only to build a failure message.

So the file's own stated guarantee — *"a narrowing and a deliberate tightening look
different in a diff a reviewer reads"* — did not hold. The reviewer narrowed
`ctr-usg-001`'s `currency` from `["THB","USD"]` to `["THB"]`, updated **one hex
string**, and the check passed while the record still described the old enum. Then it
replaced an entire contract's `sites` array with `[]` — the contract nine others
compose — and nothing failed.

**The list is what is compared now, and the digest is a label on it.** A record whose
content matches but whose digest does not gets its own message, because that case is a
hand-edited digest and nothing else.

## 2. A rule written inside `oneOf` was invisible to every count, list and ceiling

`oneOf` is non-monotone — widening a branch can produce a second match and therefore a
rejection — so I had answered "no direction is sound" by not counting its interior at
all. The reviewer put a real rule through the hole: a success envelope whose `data`
carries more than three properties, rejected by the shared envelope **every module
composes**, with constraint sites unchanged at 42 and every floor, ceiling and list
untouched.

**Invisible is strictly worse than unprovable.** Its interior is counted now at
polarity 0, which never scores a kill, so anything added inside a `oneOf` lands on the
named untested list and has to be written down. The same applies to an `if` carrying
both branches.

## 3. A property name is not a schema keyword

The walk applied keyword dispatch to the keys of a `properties` container. Three
consequences, all found by execution:

- `ctr-evt-001 subject.properties.type` was read as a `type` assertion — **one of the
  eighteen names on the untested list was not a constraint at all**;
- a property named `not` would collapse its entire subtree into one opaque site;
- a property named `oneOf` would produce **zero** sites for its whole subtree.

Both are plausible in a filter or query contract. A `properties` container's keys are
names, and its values are recursed into as schemas.

That correction removed the phantom site: `ctr-evt-001` goes from 52 sites to 51, and
from one unkilled to none.

## 4. The record's table rule was a formatting check

`| tests | 154 |` matched; `|tests|717|` renders identically and did not. The reviewer
prepended a whole second table in that spelling, with a fabricated *"Mutation coverage
100.0%"* headline, and the check passed — the same failure the seventh review found,
re-entered through the row regex instead of `Object.fromEntries`.

Every table-shaped row is parsed now, whitespace normalised, and **a row that is not
one of the five counts is itself a failure**. Verified: the two-table file fails.

A first version of that check was too strict and rejected the table's own header row.
Recorded because the fix for an over-permissive check overshooting into an
over-strict one is the ordinary way this goes wrong.

## Verified, all four

| attack | result |
|---|---|
| narrow an enum, update only the digest | `+`/`-` lines for `cost.properties.currency.enum` |
| replace a contract's `sites` with `[]` | `constraint surface changed`, 25 `-` lines |
| a rule inside `oneOf` on `ctr-api-001` | **7** new named untested sites |
| a second count table in unspaced markdown | `must contain exactly one count table with five rows; found 10` |

## What the review says is fine, recorded because I had said otherwise

The card rule: the reviewer measured **63 representations** and **0 false positives
across 14 shapes** of ordinary numeric documentation, and calls the rule **usable as
shipped**. My own note claiming "18 of 46 realistic representations are still missed"
does not match this tree — a markdown table cell is detected, and realistic misses are
**three**, not eighteen. I had carried forward a figure measured two commits earlier
without re-measuring it. Corrected.

```
$ npm run check
exit 0
```
