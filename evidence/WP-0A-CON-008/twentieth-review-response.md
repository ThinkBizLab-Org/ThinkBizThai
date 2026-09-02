# Independent review #20

Two HIGH, four MEDIUM, two LOW, and two corrections to this package's evidence. This wave closes
HIGH 1, HIGH 2, LOW 7 and LOW 8; the rest follow.

## HIGH 1 — I asserted on the child's stdout, and stdout can be printed

Two of the twelve behaviour cases could not make their suite pass on an unmodified copy, because
the copy lacked git history and the toolchain pins. Rather than fix the copy I asserted on the
child's **output**:

```js
assert.match(after.stdout, /attributes approval language/);
```

The review hollowed `handoff-conformance.test.mjs` and put `console.log('attributes approval
language')` inside the placeholder that kept the right name. Three fabricated role approvals and a
self-declared `final_status: "integration_verified"` shipped at **exit 0, 247/247**.

**This repository's own contract file already says it** — *anything the running tests can emit, the
running tests can forge* — which is why an earlier name-pinning scheme was abandoned. I wrote that
lesson into a comment and then broke it two files later.

Fixed by removing the reason for the shortcut: `repositoryCopy()` copies the **whole repository**,
`.git` included. It is 4.9 MB and copies in 0.15 s. **Every case asserts an exit code now**, and
`assertFailed` additionally rejects `status === null`, which is what `spawnSync` returns when a
child is killed or never spawns — review 20's LOW 8, and every `after` assertion had been accepting
it.

## HIGH 2 — one reversal per suite, so a stub that keeps one assertion survives

The review did not hollow the suites; it **stubbed** them, keeping in each the single assertion the
matching case exercised — `catalog-registry.test.mjs` from 804 lines to 76 — and shipped
`CTR-SEC-001` as `"Frozen"` with `required_before_freeze: []` in the index. **exit 0, 247/247, with
`ratchets-bite.test.mjs` untouched and green.**

Counting how many tests noticed does not discriminate: measured against the real suites, most of
these reversals fail one or two tests.

What a stub cannot do is notice **several unrelated reversals**. Each case now puts two or three
through its suite — **23 in total** — and each one a stub keeps is another pin it must reimplement,
at which point it is the suite. Verified: the review's exact stub now fails at *"catalog-registry
must notice: a contract promoted out of Draft"*.

**Three of my first reversals were aimed at things the suite does not check**, and the shape of the
test said so immediately: a `redaction.secret_redacted` key that does not exist (it is
`event_safe`), a `freeze_boundary` the envelope suite does not read, and an index version the
catalog suite does not compare. Fixed by reading each suite. *A reversal nothing notices is exactly
the failure this file exists to prevent, so it cannot be written by guesswork.*

## The assertion floor and the thing it proxies pointed in opposite directions

Moving from one reversal to many put the assertions inside shared helpers, so
`ratchets-bite.test.mjs` went from 24 `assert.` sites to 5 while its coverage went from 12
reversals to 23. Lowering that floor is normally a weakening; here it is the proxy failing, and the
honest fix is to pin the thing itself: `REVERSAL_FLOOR = 23`, asserted separately. **The one place
in this repository where a count and what it stands for move opposite ways, recorded as such.**

## Verification

See `evidence/VERIFICATION.md`. `npm run verify` reports the exit code directly.
