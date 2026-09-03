# A file declared to one package that four packages maintain

**Recorded:** 2026-09-03 by `/claude/a0_atlas`
**Prompted by:** finding H-7 of `/claude/c0_contract_reviewer`'s review of `WP-0A-CON-006`

## What the review found, and what is actually there

The reviewer recorded that `WP-0A-CON-006` wrote to
`test-kits/contracts/schema-mutation-coverage.test.mjs`, which `WP-0A-CON-003` declares as
an **output**, without an authorized cross-package amendment — a `writable_paths` breach in
already-merged work.

Investigating it found something wider than one package's breach. Tracing every commit that
has touched that file to the branch it was merged from:

| Package whose branch carried the change | Commits |
|---|---|
| `WP-0A-CON-008` | 3 |
| `WP-0A-CON-004` | 1 |
| `WP-0A-A0-001` | 1 |

plus `WP-0A-CON-006` per the review, and the file's own package `WP-0A-CON-003`.

**Four packages other than its owner have written to it.** Two of those writes —
`WP-0A-CON-004`'s and `WP-0A-A0-001`'s — were made under `amends_without_owning`
declarations recorded at the time. The others were not.

## Why this keeps happening, and it is not carelessness

That file pins **every contract's constraint surface**: the exact list of assertion sites
per contract, with a digest. Any package that changes a contract must move those pins in
the same commit, or the guard correctly refuses the change. So a file declared as one
package's exclusive output is, by the design of the guard that uses it, **maintained by
every package that touches a contract**.

The ownership model has a route for exactly this and it works: `amends_without_owning`
records the path with a reason, and the ownership validator accepts it. Verified in a
disposable copy of the manifests:

| Declaration | Validator |
|---|---|
| `amends_without_owning: [that file]` on `WP-0A-CON-006` | **passes** |
| `writable_paths: [that file]` on `WP-0A-CON-006` | **exit 70** — *"writable path overlaps WP-0A-CON-003 output"* |

So the reviewer's note that "the ownership guard rejects it the moment it is declared" is
true of the `writable_paths` route and not of the amendment route. The amendment route is
the instrument, and it was used correctly twice and skipped twice.

## Disposition

**No retroactive amendment is written.** An amendment is a per-branch record of what a
package touched outside its scope, and `verify-branch-scope` rejects one that matches no
diff as *"a standing permission over another package's files, granted for work that never
happened."* Ten of the eleven packages' declared branches no longer exist and their work
is merged. Declaring amendments now would create exactly the standing permissions that
guard exists to prevent, in order to tidy a record. **The breach is recorded instead.**

Nothing is reverted. The writes are in `main`, the suite is green at 260/260, and the
changes were pin updates the guards demanded — not edits to `WP-0A-CON-003`'s rules. This
is a bookkeeping defect, not a correctness one, and calling it more than that would be as
inaccurate as ignoring it.

**What changes going forward:** any package touching that file declares the amendment
before committing, as two of the four already did. That is not a new rule; it is the
existing one, applied.

**What is left open, and it is a real question the Product Owner or `WP-0A-CON-003`'s
owner should answer:** whether a file that four packages must maintain should be declared
as one package's exclusive `output` at all. The alternative — treating it as a shared pin
file, the way `test-kits/integrity-manifest.json` is treated in practice — cannot be
declared today, because the validator forbids two packages' `writable_paths` from
overlapping another's output, which is the check that makes the amendment route necessary.
Answering it means changing that model deliberately, and A0 is the author of every package
involved, so A0 recording its own convenience as a protocol change is exactly what this
record declines to do.

## What this does not claim

It does not claim `WP-0A-CON-006`'s write was harmless — only that it was a pin update the
guards required, and that no rule of `WP-0A-CON-003` was altered by it. A reviewer wanting
to check that should read the diff rather than this sentence.

It does not close finding H-7. The finding stands as recorded; this record says what the
finding is a symptom of and declines to fabricate the paperwork that would hide it.
