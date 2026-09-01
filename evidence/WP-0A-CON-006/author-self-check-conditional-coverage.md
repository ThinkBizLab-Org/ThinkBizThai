# WP-0A-CON-006 — author self-check for the conditional-coverage change

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification. Written because independent review found no author evidence existed
for the head commit — correctly: the previous self-check predated it.

Toolchain: Node 24.20.0 / npm 11.19.0 via `zsh -lc`. Nothing downloaded.

## Two independent runs defeated the first version of this proof

Both were dispatched at the true head, and both found the same class of defect
without seeing each other's work.

**Independent review (`changes_requested`)** supplied two schemas where
`provablyRedundant` returned `true` while a real instance distinguishes the schema
from the schema without the site:

- a sibling `allOf` branch, guarded by a *different* `if`, admitted as evidence
- `additionalProperties: false` compared by value, though its meaning depends on
  its sibling `properties`

**Independent testing (`test_verified_with_conditions`)** went further and **shipped
a genuine untested business rule past the suite with `npm run check` green at
120/120**: a percentage bucket that did not allocate the subject still returning
`allow`. No fixture in the catalog carries `bucket.allocated === false` at all. The
rule was shaped as `then.allOf[1].then`, where the proof picked up an unrelated
branch carrying the same value as its justification.

Both reproduced here before anything was changed:

```
F1 — a non-ancestor `then` spliced in as unconditional evidence
  instance {"kind":"Q"}:        valid before deletion = false, after = true
F2 — additionalProperties compared by value across different properties sets
  instance {"kind":"P","b":"x"}: valid before deletion = false, after = true
```

## The cause was one conflation

`scopesAlong` mapped every step over the whole evidence list. Descending through
`properties`/`items` legitimately moves every node in step — they describe the same
instance location. Stepping into `then`, `else` or an `allOf` branch does not: it
selects **one** obligation out of many at that level. Applying that step to the whole
list admitted cousins.

The rewrite tracks two things instead of one: a `cursor` down the real ancestor path,
and `evidence` that only ever grows from that cursor.

A first attempt over-corrected — clearing evidence on every `properties` descent —
and reported 14 legitimate sites as gaps. A second contained a closure reading the
loop index *after* incrementing it, so it looked up the wrong property name and
found nothing. Both are recorded because a proof that is too strict is not safe
either: it produces gap reports against contracts that are fine, and those get
dismissed.

## Verification

```
$ npm run check
ℹ tests 121   pass 121   fail 0   skipped 0   todo 0
```

| Attack | Before | After |
|---|---|---|
| Review's F1 (sibling `then`) | excused | reported |
| Review's F2 (`additionalProperties`) | excused | reported |
| Testing's shaped `percentage_bucket` rule | **green, rule untested** | reported as a gap |
| The 47 legitimately excused sites | excused | still excused |

All three counterexamples are now tests in the suite, and each one asserts first
that its instance still distinguishes the two schemas — so a stale counterexample
fails loudly instead of passing vacuously. Reintroducing either defect fails that
test immediately; both were reintroduced and both were caught.

## A claim withdrawn

`CTR-NTF-001 allOf.2.if.required` and `allOf.3.if.required` were declared gaps
"reported to A5". Both independent runs showed they are **not gaps**: each guard is
`required: ["delivery"]`, and each matching `then` constrains only inside
`properties.delivery`, vacuous when `delivery` is absent. Independent testing put
150 000 targeted instances against each and found nothing that distinguishes them.

They remain listed, because this proof genuinely cannot account for them — the
reason is a vacuous consequent, not a duplicated obligation — but the declaration
now says so, and **the escalation to A5 is withdrawn**. A5 would have been asked to
fix a rule that is not broken.

## Numbers corrected

The commit message said "the 30 sites left … 41 are unreachable by construction".
Both independent runs flagged this: 41 > 30 is self-inconsistent and neither figure
is right. Measured at the parent commit: **61 unkilled conditional sites = 47
excused by the proof + 14 real gaps**; 12 fixtures closed 12 of the 14. The 30 and
41 came from intermediate runs of a throwaway script under a broken `$ref` resolver
and should never have reached a commit message.

## Still open

- Independent testing's structural note stands: conformance forces `valid-*` to pass
  and `invalid-*` to fail, so a newly added rule can never be counted "killed"
  without a new fixture. `UNKILLED_CEILING` is the only arithmetic backstop, and a
  one-line deletion elsewhere offsets it. The conditional test now catches the shaped
  case, but the general observation is not closed.
- Cross-vendor review is **not** satisfied. Both runs above are Anthropic
  `claude-opus-5`, carried as the recorded exception.
