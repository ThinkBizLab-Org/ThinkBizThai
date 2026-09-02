# WP-0A-CON-008 — response to the sixth independent review

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification.

Five HIGH findings, and the worst of them is that **I claimed to have closed a hole
that was still open.**

## 1. `not` was a black box, and the previous review's exact rule still worked

I made `not` one site and stopped descending into it, on the reasoning that *"deleting
the whole thing is the observable act"*. True about deletion; false as a coverage
statement. Appending a conjunct to an existing `not` adds a real rule at **zero** new
sites and moves no counter.

Independent review re-injected **the identical rule the fifth review used** — an error
envelope carrying a causation chain, legal under the shipped contract, silently
rejected — into `ctr-api-001`'s existing `not`, and `npm run check` stayed green at
146/146. A sweep over root-level property pairs found **132 of 480 such injections
structurally invisible**, six of which reject documents the contract accepts.

## 2. "every position inside an `if` is unkillable by construction" was false

Two counterexamples, both executed:

| shape | site | instance | shipped | mutated |
|---|---|---|---|---|
| `if: {not: {required:["x"]}}, then: {...}` | `if.not.required` | `{}` | rejected | **accepted** |
| `if: {...}, else: {required:["y"]}` | `if.properties.k.const` | `{"k":"q"}` | rejected | **accepted** |

Deleting inside a guard widens it — which *tightens* a `then` and *loosens* an `else`.
Under a `not` in the guard it narrows instead. Both are relaxations a fixture can
observe, and I had excluded them from the denominator entirely.

## 3, 4, 5. Tightening was still invisible — including where I said it was caught

The commit message and evidence said *"Both narrowings are caught."* They were not.
Verified green at the stack head: `maxLength` 128 → 24 on three `ctr-api-001` fields;
the body alphabet of a **pinned** reference pattern narrowed from `[A-Za-z0-9_-]` to
`[a-z0-9_]`; `currency` narrowed from `["THB","USD"]` to `["THB"]` on a site this file
lists as **protected**.

Pinning seven fields was the wrong shape: the catalog has **76 reference-shaped
fields**, and the narrowings landed on the other sixty-nine.

## What changed

**A polarity model, applied everywhere, instead of refusing to look.** The walk
descends into `not` and into `if`, carrying the polarity: `not` flips it; an `if` with
only `then` flips it; with only `else` it does not; with both, either direction counts.
`relaxationObserved` is then asked for the direction that position can actually be
observed in.

That makes the measurement complete for the first time: **653 of 717 sites, 91.1%,
with nothing excluded from the denominator and no spurious kills.** Every earlier
figure traded one of those two properties away.

**The whole constraint surface is pinned, not seven fields.** Every assertion keyword
in every contract, with its value, reduced to one digest per contract — 717 sites. The
digest keeps it small; the failure message prints what was added and removed, so a
narrowing and a deliberate tightening look different in a diff.

Verified against all three narrowings and both injections:

| attack | result |
|---|---|
| conjunct appended to an existing `not` | `constraint surface changed` with the added line |
| `if`/`else` rule with a killable guard position | reported as an unnamed site |
| `maxLength` 128 → 24 | surface diff shows both values |
| pattern body alphabet narrowed | five surface lines reported |
| `currency` enum narrowed | surface diff shows both enums |

## 6. The record was wrong again, in the same way

Two numbers in `evidence/WP-0A-CON-007/author-self-check.md` said `tests 144` where
the tree executes **146**. That file already carries a section headed *"this package
was pushed with CI red, and the claim was mine"* about exactly this. **Fourth
recurrence**, and always the same mechanism: I quote a figure from before the last two
edits.

And the 83.4% sentence named the wrong criterion. 83.4% is the *old walk* scored with
the *new* criterion. The genuinely direction-blind criterion measures 91.2%; the new
walk under the direction-blind criterion measures 95.9%. Corrected in place.

## 7. My own widening broke the build on ordinary Markdown

Adding `#`, `//`, `*`, `-` and `/` to the card rule's line-continuation set meant a
newline followed by a bullet no longer ends a digit run. A five-line Markdown list of
four-digit build numbers became a `payment-card-number` finding — and this rule has no
prose exemption, so it fails the whole build. Measured by the reviewer: **15.06% of
bullet lists, 33.53% of JSDoc number blocks**, on exactly the evidence and runbook
files this repository is made of.

Three or more lines each carrying exactly one group is a list, not a wrapped card.
Both false positives go to zero.

**The cost is real and is stated rather than hidden:** a card written one group per
line down three or more lines is no longer detected. That case is speculative;
breaking CI on ordinary documents is not, and a rule that fails on documentation is a
rule someone deletes.

## Still open, from the same review

- **Fullwidth (U+FF10–FF19) and Thai (U+0E50–U+0E59) digits are not detected at all.**
  The run regex is `[0-9]` and the checksum strips non-ASCII. The rule's own comment
  claims to cover what a Thai IME produces — it widened the *separators* for that and
  never the *digits*. On a Thai-market product this is the sharpest one left.
- A hyphenated card wrapped immediately after its hyphen; `;` continuations; several
  further separators. 28 of 33 probed shapes missed.
- The pre-existing false-positive rates on dense numeric tables are higher than the
  single-row figures I quoted: **68.9%** for eight rows of space-separated 4-digit
  amounts, **48.9%** for an aligned numeric id column.

```
$ npm run check
ℹ tests 147   pass 147   fail 0   skipped 0   todo 0
```
