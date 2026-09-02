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

## HIGH 3 — the heading was an AND-gate, and my evidence said it was not

I wrote *"the status line is the load-bearing signal"* while the code required
`RFC_HEADING.test(body) && RFC_STATUS.test(body)`. The review walked through the gate twice:
`# Decision: internal service callers are exempt…` in `docs/`, and a fully-matching `# Amendment 1`
in `evidence/`, which was skipped outright. Both **exit 0**.

It is load-bearing now. Measured across the whole repository, **exactly nine files declare an
Approved/Accepted/Proposed status, and all nine are decision records in `architecture/decisions`.**
A tenth anywhere else is the finding, whatever it is called. `evidence/` is no longer exempt — it
was the one directory this package writes freely, and a fabricated amendment there outranked
everything.

**The heading rule alone still holds outside `evidence/` and `handoffs/`**, because the moment
`evidence/` was included four real files matched it — a security verdict, a test verdict, an
RFC-002 verification note, an integration verdict. A record *about* a decision may carry its
heading; it may not *declare a status*. Flagging the four would have trained a reader to ignore the
check, which is the failure mode recorded five times in this package.

## MEDIUM 4 — a vocabulary, corrected until it stopped being one

Four payloads walked past the first list: a bare `reviewer`; `pending` trailing an affirmative
approval in the same clause; `security review` rather than `security reviewer`; and **`A1 and A6
have signed off`** — owner codes that are neither run ids nor role nouns, and exactly who
RFC-2026-010 is waiting on.

Three changes, in order of how much they matter:

1. **Order, not vocabulary.** `"requires an acknowledgement countersigned by …"` and `"signed off …
   and nothing is pending"` contain the same two kinds of word; what separates them is which comes
   **first**. An exempting word *before* the approval verb governs it.
2. **Verb forms only.** `sign-off` the noun and `accepted` are out — `"A1 and A6 sign-off is
   outstanding"` and `"the judgement is accepted"` are honest sentences in real handoffs.
3. Role nouns widened, with the owner code written as `(?<![\w-])A[0-6](?![\w-])` because `A0`
   appears inside `WP-0A-A0-001` in every handoff and the first version reported those.

All four payloads now flag. **Two of my own three attempts at this fix reported wrong reasons and
the run said so both times**; the second was `re.sub` eating the `\b` out of the pattern, which is a
mistake I recorded in these files twenty waves ago and repeated.

## MEDIUM 5 — author artifacts, not every handoff

The approval check read `*-author-handoff.json`, so an author could write
`WP-…-author-note.md` beside it. Closed for any author artifact whatever its extension.

**My first version scanned every file under `handoffs/` and immediately reported four real ones** —
including an integration verdict recording the Integration Owner's own approval, which is precisely
the artifact where that belongs. *A guard that flags the correct use of the protocol teaches people
to ignore it.* The check is the size of the hole and no larger.

## MEDIUM 6 — `.github/`, not `.github/workflows/`

`CODEOWNERS` decides whose review GitHub requires, and `.github/CODEOWNERS` with `* @attacker` was
**exit 0**. It is inert here only because native branch protection is unavailable — a temporary
condition a ratchet must not depend on. The declared-set and digest ratchet covers all of `.github/`
now. Verified: `CODEOWNERS` and `dependabot.yml` both flag.

## Corrections to this package's evidence

- *"the status line is the load-bearing signal"* — it was not; the code required a heading too.
  Struck through where it was written.
- *"both payloads produce three flagged clauses each"* — **one** `wrong` entry per payload. The
  review counted; I had not.

## Verification

See `evidence/VERIFICATION.md`. `npm run verify` reports the exit code directly.
