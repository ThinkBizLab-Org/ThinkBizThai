# Independent review #11 — findings 4 and 5

Two of the review's remaining findings are closed here. Each was reproduced first, at exit 0,
before anything was written.

## HIGH #4 — every catalog ratchet was hardcoded to one group

`catalog-registry.test.mjs:23`, `schema-mutation-coverage.test.mjs:16`,
`shared-kernel-schema-conformance.test.mjs:15`, `shared-kernel-envelope-contracts.test.mjs:10`
and `catalog-reference-integrity.test.mjs:14` all name `contract-catalog/shared-kernel`. Any
contract in any other group is governed by nothing.

Reproduction — `contract-catalog/billing/ctr-pay-001/` with:

- `"status": "Frozen"` — a level `FREEZE_LEVELS` explicitly rejects
- `"owner": "nobody"`
- `"fixtures": []`
- `unevaluatedProperties` — a keyword the conformance suite does not support
- `"source": {"enum": ["stripe_webhook","checkout_redirect"]}` — a rule that contradicts
  `CONTRIBUTING_AGENTS.md:45`

Before: **exit 0, 171/171**. The Decision Register declares 25 further contracts in other
groups, so this was the next package, not a hypothetical.

Fix — `test-kits/contracts/catalog-groups.test.mjs`. Two assertions:

1. every directory under `contract-catalog/` is a group named in `GOVERNED_GROUPS`, and
2. every governed group actually exists and holds at least one contract.

The second is the reverse of the same hole: a group pointed at nothing makes every count over
it read zero. Widening `GOVERNED_GROUPS` is now a line in a diff a reviewer reads, next to the
commit that points the five suites at the new group.

After: **exit 1**, naming the directory —
`contract-catalog/billing — 1 contract directory(ies): ctr-pay-001.`

This does not widen the five suites. It makes their narrowness fail loudly instead of silently,
which is the property that was missing.

## MEDIUM #5 — the integrity manifest's key set selected itself

The floor asked for seven named keys and a length. A length is satisfied by whatever remains.
The review deleted seven entries — the branch-scope guard, all four protocol schemas, the
catalog index and the secret scanner, 43 down to 36 — then replaced the guard's enforcement
path with `const stray = []`. The check exited 0.

Fix — `PROTECTED_KEYS` in `scripts/verify-test-coverage-floor.mjs`, seventeen files whose ABSENCE
from the manifest is itself the defect: every guard, every schema deciding what a package may
claim, every registry a gate decision rests on. (This document said "fifteen" until review twelve
counted them by executing `PROTECTED_KEYS.length`. The list has grown twice since it was written;
a number in prose beside a list in code is a fact maintained by hand, which is the defect this
whole document is about.) Named, not counted, for the same reason the
untested-constraint ratchet is named: a count can be paid for by deleting something else.

After: **exit 1**, listing each missing path by name.

The named set found a real gap on its first run, before any probe:
`scripts/regenerate-integrity-manifest.mjs` — **the tool that rewrites the manifest was not in
the manifest.** It could be edited to skip any file and nothing would notice. It is digested now.

## Costs recorded

- `MIN_DECLARED_TESTS_BY_DIRECTORY['test-kits/contracts']` raised 6 → 7. The pin stays an
  equality, so a raise is as deliberate as a lowering; a floor that drifts up with the suite
  re-baselines itself and stops being a statement about what must exist.
- `regenerate:manifest` adds discovered **test files** only. Non-test protected files are still
  seeded by hand — which is why `PROTECTED_KEYS` had to be a separate list, and why it caught
  the regenerator itself.

## Verification

`npm run check` — **176/176, fail 0, skipped 0, todo 0, exit 0**. Both probes above were run
against this tree and both exit 1; the tree was restored and re-verified at 176/176 after each.

---

# Findings 6 and 7

## MEDIUM #6 — four manifest fields were pinned by nothing

`freeze_boundary` is declared by all 14 contracts, `source_references` by 14,
`untestable_by_fixture` by 8, `untestable_by_schema` by 6. Only two contracts had any of that
text asserted, both in the envelope suite. The other twelve could be rewritten, emptied, or —
the case that matters — have a caveat **deleted**.

A caveat is the only record that a contract makes a claim its own fixtures cannot demonstrate.
Deleting one fails no test; it just makes the contract look better than it is.

Fix — two tests in `catalog-registry.test.mjs`:

1. every contract states a freeze boundary of real length and cites at least one source, with
   `n/a`/`none`/`tbd`/`todo` rejected as the absence of one wearing its name;
2. the **set** of contracts carrying each caveat is pinned **by name**, with equality in both
   directions. Dropping a caveat fails. *Gaining* one fails too — a new admission belongs in a
   reviewed diff, not in a silent pass.

Probe: deleting `untestable_by_fixture` from `CTR-PAG-001` → **exit 1**, *"the set of contracts
admitting a claim their fixtures cannot demonstrate has changed"*. Setting `CTR-EVT-001`'s
`freeze_boundary` to `"n/a"` → **exit 1**, naming the contract and the value.

## MEDIUM #7 — the CI scope step was opt-out, and the branch chose its own judge

The step derived its package with `sed` over the branch name. Two holes, not one:

- `agent/claude/tidy-up` parses to nothing → *"nothing to scope"*, **exit 0**. The branch-scope
  guard was opt-out by rename.
- `agent/claude/WP-0A-A0-001-anything` is judged against `WP-0A-A0-001`'s writable paths — the
  broadest in the repository. A rename also **selected the judge**.

A ref name is not evidence. Fix — `scripts/verify-branch-identity.mjs`: every work package now
declares `ownership.branch`, and a branch is judged against the package that **names it**. The
link is two-way: a branch cannot pick its manifest, and a manifest cannot be pointed at a branch
without a reviewed edit. Exit 75 no claimant, 76 two claimants, 77 an unreadable manifest —
because silently skipping a manifest that will not parse is how a claimant disappears and a
branch becomes unclaimed, which is the same shape as the bypass being replaced.

CI now runs `package_id="$(node scripts/verify-branch-identity.mjs "$HEAD_REF")" || exit $?`.

> **This sentence was wrong and independent review twelve disproved it by execution.** It read:
> *"There is no path through that step that reaches exit 0 without a resolved package."* There
> was one: replace `main()` with a no-op. Both `verify-branch-identity.mjs` and
> `verify-branch-scope.mjs` run **only** in CI, their unit tests imported only the pure helpers,
> and `main()` was executed by nothing — so a stub passed at exit 0, 187/187, with an honest
> digest, because a digest pins bytes and the bytes of a stub are exactly what they claim to be.
> Closed by `test-kits/ci-guard-behaviour.test.mjs`, which spawns both as processes. See
> `evidence/WP-0A-CON-008/twelfth-review-response.md`.

`test-kits/branch-identity.test.mjs` covers all four failure modes plus the rename attack
(`WP-BROAD-alpha` must not resolve to `WP-BROAD`) and asserts the real manifests resolve to
distinct packages.

## Verification

`npm run check` — **184/184, fail 0, skipped 0, todo 0, exit 0**.
`verify-branch-scope.mjs` against the stack base — *all 54 changed paths are declared*.

---

# Findings 8 and 9 — and one defect the fix found

## LOW-MED #8 — empty combinators were invisible primitives

`anyOf: []` and `oneOf: []` reject every document. `allOf: []` accepts every document — vacuous
truth. None is visible to the mutation walk, because there is nothing inside to delete.

Probed first, as always. All three ARE caught in the catalog as it stands today, but only by
accident of coverage: the empty combinator happened to sit where a fixture reaches it, so a
valid fixture stopped validating or a negative fixture stopped being rejected. Buried under an
unused property, only the constraint-surface pin fires, and only because the KEYWORD is new.

Fix — `no catalog schema holds an empty combinator`, a structural walk over every governed
schema. It costs nothing: an empty combinator has no legitimate use. A second test asserts the
walk actually reaches the positions that matter — under a property, inside array `items`,
beneath a `not`, inside `definitions` — because a walk that finds nothing passes trivially.

**On its first run it found one that was already shipped.** `ctr-usg-001/schema.json` carried
`"allOf": []` — a rule that accepts every document, in a Candidate contract, left behind when a
vacuous rule was removed in `b00c6b3`. Nothing in 184 tests had observed it. Removed here.

Probe: replanting `anyOf: []` at `properties/readiness/properties/capabilities/items` in
`ctr-obs-001` — a position no fixture reaches — → **exit 1**, naming the JSON path and the
effect.

## LOW #9 — a one-directional impact check, and dead code

The handoff impact check ran one direction: claiming an impact you do not have. That is the
harmless half — it looks worse than the truth. The half that matters is a package that **does**
change the contract catalog and says nothing about compatibility, because a reader of that
handoff has no reason to look. Now checked both ways.

Measured cost, first run: it reported `WP-0A-A0-001` for adding `contract-catalog/README.md` —
a prose file with no compatibility surface. Narrowed to contract **artifacts**: the index, each
contract's `manifest.json` and `schema.json`, and fixtures. A README is not a contract.

> **The fixture half of that clause matched nothing.** It tested for `/fixtures/`, and every
> fixture in this repository lives in `examples/` — review twelve counted 0 of 705 catalog JSON
> files matching, so a package could delete every negative fixture and report no compatibility
> impact. Corrected in the twelfth-review response.

`scan-repository-secrets.mjs:263` — unreachable `return false;` after a `return`. Deleted.

## Verification

`npm run check` — **186/186, fail 0, skipped 0, todo 0, exit 0**.

Every finding of independent review #11 is now closed: HIGH 1–4, MEDIUM 5–7, LOW-MED 8, LOW 9.
Four of the nine fixes found a real defect the moment they ran, none of them planted:

| fix | what it found unprompted |
| --- | --- |
| revision-resolving handoff check | handoffs citing a range that did not match their file lists |
| `PROTECTED_KEYS` | the tool that rewrites the integrity manifest was not in the manifest |
| empty-combinator walk | `allOf: []` shipped in `CTR-USG-001`, accepting every document |
| two-way impact check | a false positive in its own first formulation, corrected before commit |
