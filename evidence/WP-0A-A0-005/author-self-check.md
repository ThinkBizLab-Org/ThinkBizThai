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
