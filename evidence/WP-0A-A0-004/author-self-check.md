# WP-0A-A0-004 — Author self-check

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Branch: `agent/claude/WP-0A-A0-004-ci-independent-guard-step`
Date: 2026-09-01

Author self-evidence only. Not review, security, test, integration, Product Owner,
or merge approval, and it does not move Gate G0.

## The hole, and why it could not be closed from where it was found

`.github/workflows/ci.yml` runs exactly one validation step, `npm run check`, and
every guard in this repository is invoked *by that command* from a `scripts.check`
string inside `package.json`.

Independent testing produced two forms of the same problem:

| Injected `scripts.check` | `npm run check` |
|---|---|
| trailing `&` | exit **0** — the shell backgrounds the chain and returns before any step's exit code matters. The guard runs and prints its rejection; the status was already decided. |
| every `&&` replaced with `\|\|` | exit **0** — step 1 succeeds and the chain short-circuits. The guard **does** run and **does** reject with exit `81`; `||` discards the exit code. |

WP-0A-A0-002 closed everything reachable from inside: the chain is parsed
structurally, `||`, `;`, `|`, `#` and a surviving `&` are rejected inside a step,
the guard must be the **first** step, and the chain must **end** with the runner.
Those close *demotion*. They cannot close *non-invocation* — the code that would
reject it does not run. The integrity manifest does not help either; the exit code
is `0` whether or not digests match.

So a one-character edit to `package.json` turned CI green while executing no test,
and the repository's own controls were structurally unable to notice.

## The fix, and what it is worth

One workflow step, **before** the existing one:

```yaml
      - name: Verify test-integrity guard
        run: node scripts/verify-test-coverage-floor.mjs
```

The guard is now invoked **by the workflow**, not by the script it audits.

Measured in a sandbox outside the repository, with the integrity manifest
recomputed after each edit so the digest tripwire was not what fired:

| Injected `scripts.check` | `npm run check` | The workflow's guard step |
|---|---|---|
| trailing `&` | exit **0** | exit **81** |
| `\|\|` at every position | exit **0** | exit **81** |

Both would now fail CI. Neither did before.

## What this does not do, stated plainly

- **It does not make the guard unbypassable.** Someone who can edit `ci.yml` can
  delete the step. This moves the bypass from a place no control can see into a
  place a reviewer reads, and **no further than that**.
- It does not close the digest class. A commit editing a guarded file *and* its
  digest still passes; independent review established that as a fixed-point
  property of a repository where one commit can change every file.
- It does not satisfy the **Gate G0 protected-CI requirement**, which needs native
  branch protection and remains blocked on an external constraint recorded in
  `evidence/g0-tracker-th.md`.

## Ownership

`.github/workflows/ci.yml` is a WP-0A-A0-001 output and that package is
`integration_verified`. `CONTRIBUTING_AGENTS.md` protects CI configuration and
directs the change through the Integration Owner/RFC path, which is what
RFC-2026-007 is. Only the two `ci.yml` lines were removed from that manifest; every
other declared output is untouched, and the ownership validator accepts the
transfer with no cross-package overlap.

## Verification

| Command | Exit | Result |
|---|---|---|
| `npm run check` | `0` | `tests 117 / pass 117 / fail 0 / skipped 0 / todo 0` |
| `node scripts/verify-test-coverage-floor.mjs` | `0` | standing alone |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |

The sandbox result above is the load-bearing one, and it is the only evidence that
distinguishes this change from a cosmetic edit.

## Author-declared limitations

- The workflow's behaviour cannot be observed locally. The two exit `81` results
  are the guard invoked directly, which is exactly what the workflow now does — but
  a reviewer should confirm the step lands and fails in a real CI run rather than
  taking a local invocation as proof.
- `ci.yml` and the guard are both digested, so editing either to defeat this is a
  visible diff line. That is a tripwire, not a control.
- This run authored the change and must not review, security-review, test-verify or
  integrate it.

## The branch-scope guard now runs, and only the workflow can run it

`scripts/verify-branch-scope.mjs` compares what a branch **changed** against what its
package **declares** — the gap `validate-work-package-ownership.mjs` cannot see,
because a manifest is a promise and a branch is a fact. It was written under
`WP-0A-CON-008` and recorded there as *not* running in CI, because it needs a base ref
and a repository cannot know which branch a package is being built on.

**A workflow can.** `github.event.pull_request.base.ref` is exactly that, so the guard
and its test move here, to the package that owns `.github/workflows/ci.yml`, and the
workflow runs it on every pull request. The package id comes from the branch name; a
branch that names no work package is skipped with a message rather than failing, and a
branch naming a package whose manifest does not exist fails with **73**.

`fetch-depth: 0` was added to the checkout: the guard diffs against the base commit,
and a shallow clone has only the head.

This is the same argument RFC-2026-007 makes for the step above it. A guard invoked by
the thing it audits cannot constrain that thing; a guard that needs to know the base
of a pull request cannot be invoked by the repository at all.

### Its first run against this branch reported three undeclared paths

`scripts/verify-test-coverage-floor.mjs`, `test-kits/test-coverage-floor.test.mjs` and
`work-packages/WP-0A-A0-001.json` — all real changes this package made and none of them
declared. The first two gained the requirement that all five gating steps appear in
order in `scripts.check`, which is this package's subject and `WP-0A-A0-002`'s file;
the third carries the record transferring `ci.yml` here.

All three are recorded now. **The guard found undeclared work on the very branch that
introduces it**, which is the most useful thing it could have done.

### What it is not

It runs on `pull_request` only. A push to `main` carries no base to diff against, so
this is a pull-request control, not a branch-protection one — and protected CI is still
an open Gate G0 item that needs a paid GitHub plan.
