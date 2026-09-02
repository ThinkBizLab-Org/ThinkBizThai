# RFC-2026-007 — CI must invoke the test-integrity guard as its own step

Status: Proposed — awaiting independent review, security, test, integration, and Product Owner disposition
Decision needed by: before any package relies on `npm run check` as evidence that tests ran
Owner: A0 Architecture/Integration
Protocol version: `1.0.0`

## Problem

`.github/workflows/ci.yml` runs exactly one validation step:

```yaml
      - name: Validate repository bootstrap
        run: npm run check
```

Every guard this repository has — the toolchain check, the secret scan, the
protocol validators, the coverage floor and the test suite itself — is invoked
*by that one command*, from a `scripts.check` string inside `package.json`.

**A guard invoked by a command cannot constrain the command that invokes it.**
Independent testing demonstrated two forms of this, and neither is closable from
inside the scripts:

| Injected `scripts.check` | Result |
|---|---|
| `… && npm run test:bootstrap &` | exit **0**. The trailing `&` backgrounds the whole chain, so the shell returns before any step's exit code matters. The guard *does* run and *does* print its rejection; the process status was already decided. |
| every `&&` replaced with `\|\|` | exit **0**. Step 1 succeeds and the chain short-circuits. **Correction, from independent review:** the guard IS invoked — WP-0A-A0-002's first-step rule puts it there, it runs, and it correctly rejects with exit `81`. `||` then **discards that exit code** and hands off to the next step, which succeeds. An earlier draft of this RFC said the guard was never invoked, which wrongly described A0-002's rule as ineffective when it is firing. The outcome is the same — a green job that ran no test — but the mechanism is discarded status, not absent execution, and that distinction is the whole reason the fix has to come from the caller. |

WP-0A-A0-002 closed everything it could reach from inside: the chain is parsed
structurally, `||`, `;`, `|`, `#` and a surviving `&` are rejected inside a step,
the guard is required to be the **first** step, and the chain must **end** with the
runner. Those close *demotion*. They cannot close *non-invocation*, because the
code that would reject it does not run.

The integrity manifest does not help either: in both cases the exit code is `0`
whether or not the digests match.

So today, **a one-character edit to `package.json` turns CI green while executing
no test at all**, and the repository's own controls are structurally unable to
notice.

## Decision

`.github/workflows/ci.yml` gains **one step, before the existing one**:

```yaml
      - name: Verify test-integrity guard
        run: node scripts/verify-test-coverage-floor.mjs
      - name: Validate repository bootstrap
        run: npm run check
```

The guard is then invoked **by the workflow**, not by the script it audits. A
`package.json` edited to skip or neuter it now fails at a step that edit cannot
reach, because the workflow file is a different artifact with a different owner and
a separate review path.

The guard now also requires **all five** gating steps in order, not merely the guard and the runner: independent review reduced `check` to `verify:coverage-floor && test:bootstrap`, recomputed the digest, and both the new workflow step and `npm run check` exited `0` — silently deleting the toolchain pin, the secret scan and all three protocol validators from CI. Verified after the fix: the same edit now exits `81`.

`.github/workflows/ci.yml` and `scripts/verify-test-coverage-floor.mjs` are both
already digested in `test-kits/integrity-manifest.json`, so editing either to
defeat this is a visible line in a diff.

## Ownership transfer

`.github/workflows/ci.yml` is a WP-0A-A0-001 output, and that package is
`integration_verified`. `CONTRIBUTING_AGENTS.md` protects CI configuration and
directs a change through the Integration Owner/RFC path, which is what this is.
The file transfers to WP-0A-A0-004 for this change; WP-0A-A0-001's manifest is
amended only to drop it from `writable_paths` and `outputs.files`, and records the
amendment in `ownership.amended_by` with an acknowledgement pending from
`/root/r0_steward`.

## What this does NOT do

- It does not make the guard unbypassable. Someone who can edit `ci.yml` can delete
  the step. **This moves the bypass from a place no control can see into a place a
  reviewer reads**, and no further than that.
- It does not close the digest class: a commit that edits a guarded file *and* its
  digest still passes. Independent review established that as a fixed-point
  property of a repository where one commit can change every file.
- It does not satisfy the Gate G0 protected-CI requirement. That needs native
  branch protection, which remains blocked on an external constraint recorded in
  `evidence/g0-tracker-th.md`.

## Verification

- `npm run check` on pinned Node `24.20.0` / npm `11.19.0` — exit `0`, 119 tests.
- `check` reduced to the guard plus the runner — exit `81`, naming the missing steps.
- With `scripts.check` neutered by a trailing `&`, the **workflow's guard step**
  must fail even though `npm run check` exits `0`. This cannot be observed locally,
  because the failure is a property of the workflow rather than of any command; it
  is verified by reading the workflow and by the guard's own exit code when invoked
  directly.
- `node scripts/verify-test-coverage-floor.mjs` — exit `0` standing alone.
- The ownership validator must accept the transfer with no cross-package overlap.

## Rollback

Revert through a reviewed revert PR. The change adds one workflow step and moves
one path between two manifests; it creates no persisted data, provider state,
credential, migration, or customer-data effect.

## Limitations

This RFC does not approve Gate G0, does not authorize a merge, and does not grant
native protected CI. It is a procedural improvement to a workflow file, and its
whole value is that it puts one guard outside the blast radius of the script it
guards.
