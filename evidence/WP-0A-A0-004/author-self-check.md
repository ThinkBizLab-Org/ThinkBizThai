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
| every `&&` replaced with `\|\|` | exit **0** — step 1 succeeds, the chain short-circuits, and the guard is **never invoked at all**. |

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
