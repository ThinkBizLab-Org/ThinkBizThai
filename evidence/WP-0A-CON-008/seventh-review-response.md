# WP-0A-CON-008 — response to the seventh independent review

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification.

Two HIGH findings, and the review named them correctly as **one defect seen from two
sides**: the metric measured whether a mutation moves a verdict, not whether a fixture
demonstrates a rule — and it looked only at assertion keywords, so it could not see
the shape of a contract at all.

## 1. The negative-polarity kill was vacuous

Inside a `not`, deleting a keyword leaves `{}`, which matches everything and makes the
schema reject everything. **Every** accepted fixture flips, whether or not any fixture
exercises the rule. My previous fix changed which *direction* was required; it did not
make the observation evidential.

The reviewer's proof is the one that settles it: **delete every `invalid-*` fixture
from every manifest, and all 55 negative-polarity sites still score "killed"** —
set-identical. The flip came from the mere existence of one accepted instance.

It then appended one conjunct to an existing `not` — *an error envelope may not carry
a causation chain*, silently rejecting a legal response — and the whole check stayed
green, the site scored killed, and every floor and ceiling and list agreed.

**The mutation operator was wrong, not the direction.** An obligation stated inside a
`not` is removed by removing the **branch**, and that relaxes. So `not` is no longer
descended into for keywords: each branch under it is a site whose deletion removes it,
judged in the ordinary positive direction, and a fixture must actually be let through.

The same measurement now:

| | before the fix | after |
|---|---|---|
| full catalog | 653/717 = 91.1% | 653/717 = **91.1%** |
| **with every `invalid-*` fixture deleted** | **653/717 = 91.1%** | **36/717 = 5.0%** |

The headline number is unchanged and now means something. Eight prohibition branches
turned out genuinely untested — *an error envelope must not carry an acceptance body*,
*an in-progress idempotency record must not carry a result, an error, or a completion
time*, *a page request must not echo a cursor or a has-more flag* — and each has a
fixture now.

Two of those fixtures needed hand-writing: `accepted` must be an object that satisfies
its own sub-schema, so a borrowed scalar could not violate the prohibition without
violating something else first.

## 2. A contract could be silently widened with no guard edit at all

`properties.diagnostics = {}` on `CTR-API-001`, and
`properties.impersonated_actor = {}` on `CTR-TEN-001` — the contract nine others
compose — each passed `npm run check` at 153/153 **with no edit to any test, digest,
floor, ceiling or list**.

An unconstrained property defeats `additionalProperties: false` for that key. The
reviewer put a provider secret and a stack trace through the envelope that
`CTR-API-001`'s own `x-leakage-boundary` exists to stop:

```
baseline : ["$: additional property 'diagnostics' is not permitted"]
injected : []
```

A property carrying no assertion contributes no keyword, so a surface built only from
keywords cannot see it. **The declared property names are part of the contract**, and
the surface records them now — 717 entries became 853. Both injections are reported
with the property list showing the added name.

## 3. The verification record could show a false headline

`Object.fromEntries` over every match meant the **last** table won. The reviewer left
the headline reading `999` and appended a correct table below the prose: exit 0, and a
person opening the file — its whole purpose — read 999.

The record must now contain exactly one five-row table. Verified: the two-table file
fails with *"must contain exactly one count table with five rows; found 10"*.

Note the layering that showed up while testing it: the integrity manifest catches the
edit first with exit 86, because `evidence/VERIFICATION.md` is digested. The
single-table rule is the second line, for the case where a change is made legitimately
and the file is re-digested.

## Finding 5, taken as correct and closed rather than deferred

Two polarity branches were unsound and unreachable. Both are removed rather than left
latent:

- **`if` with both `then` and `else`** accepted a flip in either direction — the
  weakest criterion in the file, and one `else` added to an existing guard would have
  silently downgraded every site inside it. Nothing inside such a guard is counted now.
- **`oneOf` is non-monotone** — widening one branch can produce a second match and
  therefore a rejection — so no single direction is sound. Its interior is not counted;
  the combinator itself still is when an empty branch turns it into a negation.

Measured polarity distribution before the change was `{1: 625, -1: 92, 0: 0}`, so
neither was reachable today. They were wrong anyway.

## Finding 4 is partly stale and the rest is recorded

The reviewer measured the card rule at commit `d715e51`. The multi-column table figure
they report (68.8%) was fixed in `b75e401`, after that commit: an aligned numeric id
column is 0.00% and an eight-row four-column table is 24.4%, measured on this tree.

What stands from their measurement, and is **not** fixed here: 18 of 46 realistic
representations are still missed — dot and comma separators, a markdown table row, a
card wrapped ungrouped across three narrow lines, quoted-printable soft breaks. Each
addition to the separator set has previously cost false positives on ordinary
documents, so each needs its own measurement; that is a wave of work, not a line.

```
$ npm run check
ℹ tests 154   pass 154   fail 0   skipped 0   todo 0
```
