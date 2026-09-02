# Independent review #22

Four HIGH, three MEDIUM, three LOW. This wave closes HIGH 1, HIGH 2 and MEDIUM 3.

## HIGH 1 — the behaviour ratchet is a no-op again, one spelling over

Review twenty-one's `reversals.slice(0, 0)` was closed with
`assert.doesNotMatch(source, /reversals\.slice\(/)`. Review twenty-two wrote
`reversals.filter(() => false)`: the runtime length assertion still passed, all thirty tuples
stayed in the file, **and not one executed**. `reversals.slice (0, 0)` — with a space — defeats the
blacklist too.

**A blacklist of spellings is a vocabulary, and this repository's own recorded lesson is that
vocabularies lose.** The loop now counts what it consumed and asserts it against what it was
handed, in both `mustNotice` and `mustNoticeSourceEdit`. Counting what ran cannot be satisfied by a
spelling.

## HIGH 2 — a targeted carve-out shipped a key pair with no test file touched

One line in `scanText`:

```js
if (relativePath.startsWith('evidence/WP-0A-CON-008/')) return [...hits];
```

The **unmodified** secret-scan suite and the **unmodified** behaviour ratchet both passed, 59/59,
and an AWS key pair shipped under `evidence/`. Two changed files, no hollowing, no floor edits, no
suspicious diff in any test.

`mustNoticeSourceEdit` pins two named reversals of that scanner. It proves those two lines matter;
**it says nothing about a third carve-out elsewhere in the same function. Pinning which lines are
load-bearing is not pinning the outcome.**

The new test plants one credential per rule family in five path shapes — the repository root,
`evidence/`, `handoffs/`, a nested new directory, and inside a contract — and requires a hit for
every combination. **A carve-out cannot satisfy that; only scanning can.** Verified: the review's
exact one-line carve-out now fails, naming the path shape it exempted.

*"Never commit API keys, tokens, passwords" is the first non-negotiable rule in
`CONTRIBUTING_AGENTS.md`, and it was one line from being unenforced.*

**And the scanner reported my own specimens twice while I wrote this** — once for a literal
`CREDENTIAL_RULES = [`, once for a PEM header I had left in an earlier draft of the same file. The
specimens are assembled at runtime from fragments that match nothing on their own. **Fifth and
sixth time a control here has fired on the test that proves the control works.**

## MEDIUM 3 — copies leak on every failing run

`rm` ran after the loop, so every `assertFailed` throw abandoned a 7–13 MB copy — and a reviewer's
job is to make it fail. Review twenty-two accumulated 23 directories, ~200 MB. Both helpers use
`try … finally` now.

The wave-21 measurement ("0 leaked directories") was true **for a passing run**, which is the run I
measured. *A measurement that only covers the case you expected is not a measurement of the thing.*

## Verification

See `evidence/VERIFICATION.md`. `npm run verify` reports the exit code directly.
