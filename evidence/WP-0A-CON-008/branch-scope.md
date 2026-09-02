# WP-0A-CON-008 — what a branch changed, checked against what it declared

## The gap

`validate-work-package-ownership.mjs` checks that a manifest's declared **outputs** sit
inside its declared **writable paths** and outside its forbidden ones. That is a check
on the promise. Nothing checked the fact — what the branch actually changed.

Two failures in this repository came through that gap:

1. **A rebase resolved with `--theirs` on a file the base had just changed.** The
   payment-card separator withdrawal was silently reverted, and the scanner then
   reported this package's own test file. The branch's diff would have shown
   `scripts/scan-repository-secrets.mjs` as changed; nothing was looking.
2. **Work accumulated on the top branch while answering review findings.** Running the
   new guard for the first time reported **26 undeclared paths** on this branch —
   catalog fixtures, another package's evidence, three manifests, ten handoffs. All of
   it real work, none of it declared.

## What it does

`node scripts/verify-branch-scope.mjs <base-ref> <work-package-id>` diffs the branch
against its base and reports every changed path that matches neither
`ownership.writable_paths` nor `ownership.amends_without_owning.paths`. Exit **73**.

The glob matching is the part such a guard usually gets wrong — too permissive and it
says nothing, too strict and it fails on paths the package legitimately owns — so that
is what the test asserts, including the rule this repository has already had a guard
defeated by: `**` spans directories only as a whole segment.

## What the first run made me declare

All 26 are now recorded on this package with the reason, grouped:

- the runner, `package.json` and the integrity manifest carry the verification-record
  control and belong to `WP-0A-A0-002` and `WP-0A-A0-001`;
- `schema-mutation-coverage.test.mjs` and the `ctr-api-001`, `ctr-idm-001` and
  `ctr-pag-001` fixtures are corrections made **here** in response to review findings
  six through nine, and belong to `WP-0A-CON-003` and `WP-0A-CON-007`. They were made
  here because the findings arrived against this head, and moving them down the stack
  risked the fixture loss a bulk rebase resolution has already caused once;
- the ten author handoffs are each their own package's deliverable;
- three manifests carry amendment records pointing back here;
- `OVERNIGHT-SUMMARY.md` belongs to no package.

**That list is the honest shape of this stack**, and it was invisible until something
counted it. A reviewer can now disagree with any line of it.

## What it does not do

It takes the base ref as an argument, because a repository cannot know which branch a
package is being built on. It is therefore **not** part of `npm run check` and will not
run in CI as things stand; it runs when someone runs it, and the test in
`test-kits/branch-scope.test.mjs` only covers the matching logic. Wiring it into CI
needs the workflow to know each PR's base — which is exactly the kind of thing
`RFC-2026-007` argues belongs in `.github/workflows/ci.yml` rather than in a script the
repository invokes on itself.
