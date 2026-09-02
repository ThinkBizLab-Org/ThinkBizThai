# Independent review #12

Three HIGH findings, three MEDIUM, two LOW. Every one was reproduced before it was fixed, and
one of them falsified a sentence this package had written into its own evidence.

The review ran in a disposable `git worktree` at `dc82fc2` and left the live tree untouched.

## LOW 8 first — the branch tip was red, and I had reported it green

At `f9f789a`, `npm run check` exited **1** at 188/189: the handoff cited `74cb382` while four
substantive paths had changed after it. I had reported 189/189.

Cause: `refresh:handoff` returned early when nothing had drifted **and therefore never advanced
the citation**, so the next commit drifted again. It printed *"describes the branch"* and wrote
nothing, three commits in a row. The rewrite is now unconditional — the check-only mode reports,
the default mode always writes.

This is the same defect as the guard's two earlier broken versions, and it is the third time in
this package that a freshly written guard reported a comfortable answer instead of a true one.

## HIGH 3 — both CI-only guards could be replaced with stubs

`verify-branch-identity.mjs` and `verify-branch-scope.mjs` run **only** in CI. Their unit tests
imported the pure helpers — `claimantsOf`, `reportFor`, `globToRegExp`, `undeclared`,
`declaredPaths` — and `main()` was executed by nothing.

The review replaced both `main()` bodies with no-ops, ran `npm run regenerate:manifest`, and got
**exit 0, 187/187**. `PROTECTED_KEYS` passed, because **a digest pins bytes, and the bytes of a
stub are exactly what they claim to be.** After the mutation:

```
verify-branch-identity.mjs agent/claude/anything-at-all  →  "WP-0A-A0-001", exit 0
verify-branch-scope.mjs HEAD~5 WP-0A-CON-008             →  "all 0 changed path(s) are declared"
```

That falsified this package's own claim — *"There is no path through that step that reaches exit
0 without a resolved package"* — which is now struck through where it was written.

Fix — `test-kits/ci-guard-behaviour.test.mjs` spawns both as **processes**:

| test | asserts |
| --- | --- |
| no claimant | exit **75**, message names `ownership.branch` |
| real branch | exit **0**, and stdout is **exactly** `WP-0A-CON-008` — CI does `package_id="$(node …)"`, so any extra output becomes part of the id |
| no argument | exit **2** |
| stray path | exit **73** in a **real** temporary git repository, naming the stray and not the declared path |
| clean branch | exit **0** — without this, a guard that always exits 73 would pass the row above and block every pull request |

The scope guard is exercised against a repository built with `git init`, not a mock: it shells
out to git, and a mock would be testing the mock.

Verified both ways:

- stub `verify-branch-identity`'s `main` → **exit 1**, two named failures.
- replace `const stray = undeclared(...)` with `const stray = []` → **exit 1**, the stray-path test.

The repository's own secret scanner reported this new test file on its first run, for a literal
address in a `git config` call. Assembled from parts instead. That control has now fired on its
author four times.

## HIGH 1 — `not: {}` rejects everything and the constraint record could not represent it

`surfaceOf` emits a line for keys in `ASSERTIONS` plus a `.properties = [...]` name list. `not`
is in neither, and walking `{}` emits nothing — so adding `"not": {}` to `CTR-API-001`'s
`causation_id` produced **zero new lines in the ~950-line record and a byte-identical digest**,
while a legal envelope started failing:

```
valid-success.json + causation_id → ["$.causation_id: matches a schema it must not match"]
```

`CTR-API-001` is the envelope every module composes; the causation chain was outlawed in silence.
The injection also **de-killed three constraints that had been tested** — `causation_id`'s
`type`, `minLength` and `maxLength` — because a location that rejects everything can no longer
show a mutation. **An added rule can retroactively untest existing ones.**

Fix, two layers:

1. `surfaceOf` now emits `<empty schema, rejects or vacuously accepts everything here>` for an
   empty subschema under any subschema-valued keyword (`not`, `if`, `then`, `else`, `items`,
   `contains`, `propertyNames`, `additionalProperties`, `unevaluatedProperties`,
   `unevaluatedItems`). A subschema carrying only `x-` annotations counts as empty, because every
   other guard here skips those keys.
2. The empty-combinator walk rejects `not: {}`, `if: {}` and `enum: []` alongside
   `anyOf|oneOf|allOf: []`.

Verified: `surfaceOf({properties:{causation_id:{type:'string',not:{}}}})` now returns the empty-
schema line; planting `not: {}` in `ctr-api-001` gives **exit 1 with 13 failing tests**, named.

## HIGH 2 — a `$ref` into a non-contract directory was a permanent ungoverned rule channel

`contracts()`, `constraintSites`, `surfaceOf`, `assertSchemaSupported` and `CATALOG_REGISTRY` all
iterate the **top-level** directories of a group. Nothing followed a `$ref`. The reference check
required the target to be named `schema.json` with a matching `$id` — which **any** subdirectory
can satisfy.

Review twelve built `ctr-api-001/vocab/schema.json`, referenced it, and declared it in
`manifest.fixtures` to satisfy the undeclared-file check. Three one-time declaration edits, then
**every later edit to that file was free**: `maxProperties: 1` on every success payload,
`allOf: []` — the exact vacuous primitive commit `07ea626` had just made impossible — and
`dependentRequired`, a keyword the validator does not implement, which is precisely what
`assertSchemaSupported` exists to prevent. **exit 0, 187/187, zero further edits anywhere.**

Fix: a `$ref` target must be a **top-level contract directory of a governed group**. A reference
that reaches anything else is a rule channel no ratchet iterates.

Verified: the exact reproduction now gives **exit 1**, *"target is not a top-level contract
directory of a governed group … a rule channel no suite measures"*, with 11 failing tests.

## MEDIUM 4 — the fixture clause matched nothing at all

Counted independently, and the review's figures are exact: **705** JSON files under
`contract-catalog/`, **0** matching `/fixtures/`, **676** under `examples/`, **29**
manifest/schema/index files. Every fixture lives in `examples/`, so a package could delete or
weaken every negative fixture — the evidence base of the conformance suite and of every
mutation-coverage number — and report no compatibility impact. Corrected to `/examples/`, with a
test asserting the classifier directly, since the failure state is one the repository is not
allowed to be in and so cannot be observed from committed files.

## MEDIUM 5 — a caveat could be replaced by its opposite

The pin checked presence and length: ≥20 characters for a caveat, ≥40 for a freeze boundary and
no placeholder prefix. Review twelve rewrote all three fields of `CTR-SEC-001`, the secret-handle
contract, into their opposites — *"Every claim this contract makes is demonstrated by its
fixtures"* — at **exit 0**. RFC-2026-010 assesses freeze readiness against exactly those fields.

Fix: `CAVEAT_DIGESTS` pins the **text** of all 14 freeze boundaries and all 14 caveats by digest,
and flags a caveat that *appears* unpinned. Verified: the three-field rewrite now reports each
field with its before and after digest and the offending text.

## MEDIUM 6 — a branch could still choose its judge

The branch table pinned 4 refs of 13. Repointing `WP-0A-CON-002`'s `ownership.branch` at
`agent/claude/WP-0A-CON-009-tidy` passed at exit 0 — a branch doing no CON-002 work would inherit
CON-002's eleven writable paths, three contract directories and two contract suites among them.
The mechanism had moved from the ref name into the manifest; it had not gone away.

Fix: `BRANCH_OWNERSHIP` pins the whole mapping, and the test also requires the resolver to agree
with the table for every row. Verified: the repointing now fails with *"a branch was repointed at
a different package"*.

## LOW 7 — three stale claims, all corrected in place

- `PROTECTED_KEYS.length` is **17**, not the "fifteen" written in prose. Corrected, with a note
  that a number in prose beside a list in code is a hand-maintained fact — the defect this
  document is about.
- "and fixtures" was false (MEDIUM 4). Corrected where it was written.
- "There is no path through that step that reaches exit 0 without a resolved package" was false
  (HIGH 3). Struck through where it was written, rather than deleted.

## What the review could not break, and said so

- An ungoverned group, plain or symlinked. The symlink evades `catalog-groups.test.mjs`, but the
  secret scanner fails closed on any symlink: **exit 71**.
- Relocating enforcement into an undigested script — all 15 are digested.
- Self-widening `writable_paths`: **exit 70**, cross-package overlap. **This bullet read as a
  closed hole and was not one**: review thirteen appended `"**"` to the sibling field
  `amends_without_owning.paths`, which the ownership validator never read at all, and silenced the
  branch-scope guard entirely at exit 0. A check on one field says nothing about the field beside
  it.
- ~~Adding an untested rule expressed in any *supported keyword* directly in a contract schema.~~
  **This was false, and independent review thirteen disproved it by execution.** `items` and
  `allOf` are supported keywords, and `"items": false` — one token — put *"every paginated page
  must carry zero rows"* into `CTR-PAG-001` at exit 0, 198/198, with a byte-identical constraint
  record and no declaration edit anywhere. See `thirteenth-review-response.md`. What review twelve
  measured while trying is still true and still useful: every declared property location is
  reached by some fixture, and only 8 schema locations catalog-wide are reached by no positive
  fixture.

## Closed before review thirteen could ask for it

The HIGH 1 fix listed ten subschema-valued keywords. Checked against the JSON Schema 2020-12
vocabulary rather than against what this catalog happens to contain, two were missing:
`additionalItems` and `contentSchema`. Neither appears in any contract today and neither is
supported by the validator, so both are currently rejected earlier — but **a set that is complete
only by accident of what is currently written is not a set**, and one missing keyword is exactly
how `not: {}` got past a 950-line record.

Both added, and a test now asserts the set against the vocabulary *and* runs `surfaceOf` for each
of the twelve, requiring a line for every one. Listing a keyword and emitting for it are two
different claims.

## Verification

`npm run check` — **199/199, fail 0, skipped 0, todo 0, exit 0**.
