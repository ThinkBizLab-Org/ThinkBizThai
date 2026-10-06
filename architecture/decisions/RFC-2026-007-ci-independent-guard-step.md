# RFC-2026-007 — CI must invoke the test-integrity guard as its own step

Status: Approved 2026-09-02 by the Product Owner — CI invokes the guard as its own step; this is the step that survived the .npmrc bypass. Limitations and Rollback in this document stand unchanged.
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

## Amendment 2026-10-06 — the negative control runs only when the database surface changed; the checkout is asserted

Status of this amendment: Proposed 2026-10-06, for the Product Owner's disposition. The
decision above stays Approved and unchanged; this section adds two rules to the same workflow.
It changes CI, so under RFC-2026-025 §5 item 6 its pull request is merged by the Owner
personally, never by delegation.

Origin. A0 reported that one CI run takes about 22 minutes, of which the step `Negative
control - each table family must be detectable on its own` took 12.4 and `Validate repository
bootstrap` 8.4, and recommended option 1: run the negative control only when the pull request
touches the database surface. The Owner answered, verbatim, `ได้ทำตามที่คุณแนะนำ` ("yes, do as you
recommend"), on the condition that A1 (Security) and Q0 (Tester) confirm the skip cannot let a
pull request that should be checked slip through. Measured independently on main at `a5f6466`
(run 37395796828, push to main): the control took 10 min 18 s of an 18.5-minute job.

### A. The skip rule

1. A new step, `Decide whether the negative control must run` (`id: db_surface`), runs on
   `pull_request` events only, inside the existing `bootstrap` job.
2. It computes `git diff --no-renames --name-only <pull_request.base.sha> HEAD`, a tree-to-tree
   diff, so a file moved off the surface still names its old path.
3. If no changed path matches `DB_SURFACE` (below), it writes `skip=true` to the step output.
   It writes nothing in any other case.
4. The negative control carries `if: steps.db_surface.outputs.skip != 'true'`. It is skipped
   only on that exact value; unset, empty or any other value runs it.
5. Only the STEP is skipped. The job, and the required check context `bootstrap`, run and report
   on every pull request. `npm run check`, the database foundation step (shim, clean migrate,
   schema lint and one full `db-rls-smoke`) still run on every pull request.

`DB_SURFACE`, as written in the workflow:

```
^(db/|scripts/db/|tests/db/|test-kits/db/|\.github/|Makefile$|package\.json$|package-lock\.json$|\.node-version$)
```

Why each entry is there, measured rather than assumed. The control runs `make db-rls-smoke`
against the database the previous step built. The import graph of `scripts/db/run.mjs`, the
Makefile's `DB` command, and every repository path those modules and the two database steps
name, is:

- `Makefile`
- `scripts/db/run.mjs`, `rls-smoke.mjs`, `authz-proofs.mjs`, `psql-driver.mjs`, `sql-lexer.mjs`,
  `audit-producer-rule.mjs`
- `tests/db/identity/run-isolation.mjs`, `isolation-cases.mjs`, and the 21 fixture files in
  `tests/db/identity/fixtures/`
- `db/foundation/test-helpers/rls-assertions.mjs` and `auth-context.sql`
- `db/foundation/ci/supabase-shim.sql`, `prerequisites.sql`, `migrations/`, `invariants/`
  (with `superseded.json`), `seeds/fixture-catalog.json`, and 13 of the 15 files in `lint/`
  (`purge-order.json` and `retention-map.json` are named by no module the control loads; the
  whole of `db/` is on the surface regardless)
- `.github/workflows/ci.yml` itself: the step's own entries, the service image and the earlier
  steps

All of it lies under `db/`, `scripts/db/`, `tests/db/`, `Makefile` or `.github/`. The
remaining entries are margin and not required by the measurement. `test-kits/db/` is the
static database suite; the control does not read it. `package.json`, `package-lock.json` and
`.node-version` are the toolchain and install. A test (below) recomputes the graph on every
`npm run check` and fails if any path it reaches falls outside the pattern.

### B. Fail-closed cases. In each of these the control RUNS

- A push to `main`: the decision step does not run, its output is unset, and the control runs.
- An empty `pull_request.base.sha`, or a base commit that is not in the clone (for example a
  shallower checkout).
- A `git diff` that exits non-zero.
- A `grep` that exits with anything other than 0 (matched) or 1 (matched nothing). Exit 2, a
  malformed pattern, runs the control; it is not read as "nothing matched".
- Any changed path on the surface, including a deletion or a move off it.
- The decision step never fails the job on these cases. A failure there would stop the control
  by failing the job rather than by running it, and the job would then report on an untested
  head.

### C. The checkout assertion (A1 F1 on PR #189)

Straight after `actions/checkout`, `Verify the checkout is the commit this run reports on`
compares `git rev-parse HEAD` with `github.event.pull_request.head.sha || github.sha`. It
fails the job if they differ, or if the expected value is empty. Checking out by `head_ref`
checks out the branch as it is when the job starts. If the branch moved after the event, the run
would otherwise test the newer tip and report on the older commit. On a push the checkout takes
`github.sha` and the assertion holds trivially.

### D. Tests

The tests are in `test-kits/branch-scope.test.mjs`. They cut the step bodies out of `ci.yml`
and run them with `bash --noprofile --norc -eo pipefail`, as GitHub does, against throwaway
repositories. They cover:

- the skip on a change off the surface;
- a run on each surface entry, on a move off it and on a deletion;
- a run on an empty base, a missing base, a base that is not a commit, no repository, and a
  pattern grep cannot compile;
- the `!= 'true'` condition, the single `skip=true` writer and the absence of a job-level `if`;
- the measured closure;
- the checkout assertion passing on the right commit and failing on a moved or empty one.

### E. What this does NOT do

- **Image drift.** It does not protect against an input no path names. `postgres:17` is a
  floating tag, and the `ubuntu-24.04` runner image supplies `psql`. A change there can alter the
  control's outcome on a pull request that skips it. The control still runs on every push to
  `main`, so such drift is caught at the next merge, not on the pull request.
- **Base red on main.** A pull request that skips the control inherits the base's result. If
  the control was red on `main` at that base, the pull request does not reveal it; `main`'s own
  run does.
- **Gaps in the measurement.** The measured closure is static. A module that builds a path at
  run time from pieces no literal names would escape the test. None does today: every file the
  walk reaches is named by a literal or an import.

### F. Rollback

Rollback is a reviewed revert of the two steps and the condition, which restores
"always run". No data, provider or credential effect.
