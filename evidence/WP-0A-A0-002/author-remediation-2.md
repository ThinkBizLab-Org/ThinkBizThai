# WP-0A-A0-002 — Author remediation round 2: the guard was bypassable

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Reviewed commit: `9403484`
Date: 2026-08-31

Author evidence only. Not review, security, test, integration, Product Owner, or
merge approval, and it does not move Gate G0.

## What independent testing found

`/claude/q0_sentinel` returned `test_verified_with_conditions` on `9403484` and
**demonstrated two working bypasses of the coverage floor this Author added in
that same commit.** Both are accepted in full. The guard as written did not close
the defect class it was introduced to close.

### Bypass 1 (critical) — the command shape was never checked

`"test:bootstrap": ": node --test 'test-kits/**/*.test.mjs'"` passed the guard,
passed `npm run check` with exit `0`, and executed **zero tests**. `:` is a POSIX
no-op, so the runner never ran. `... || true` passed identically and would have
permanently swallowed every future failure.

Cause: `extractTestPattern` matched `/--test\s+'([^']+)'/` anywhere inside the
declared string. It verified that a pattern was *mentioned*, never that
`node --test` was the command actually invoked. Any prefix or suffix passed.

This is the Tester's original condition C1 reproduced verbatim at head — a green
`npm run check` that executed nothing — inside the very commit that claimed to
close it.

### Bypass 2 (high) — the guard's globstar did not match node's

`"test:bootstrap": "node --test 'test-kits/**.test.mjs'"` passed the guard while
`node --test` ran **34 of 40** tests, silently dropping all six
`test-kits/contracts/` tests.

Cause: `globToRegExp` expanded a bare `**` to `.*`, which crosses `/`. Node's
glob treats `**` as directory-spanning only when it is a whole path segment;
inside a segment it is a single-segment `*`. The guard therefore believed every
file was matched while the runner skipped a directory — **the same defect class as
the original bug, passed by the guard built to catch it.**

### Also accepted

- The file floor counted files, not tests: eight files declaring no `test()` at
  all satisfied it.
- A renamed `test-kits/` produced an unhandled `ENOENT` whose non-numeric `code`
  bypassed the numeric `process.exit` path.
- The Author's own evidence table was wrong: a pattern matching nothing exits
  `76`, not `75`. Those are different code paths. The Tester was right and the
  Author's prose was wrong; the Author's test file had it right.

## Fixes

| Defect | Fix |
|---|---|
| Bypass 1 | The command is now pinned whole: `/^node --test '([^']+)'$/`. No prefix, suffix, chained operator, or extra flag is accepted. |
| Bypass 2 | `globToRegExp` now spans directories only for a `**` that is a whole segment (`**/` or trailing `**`); inside a segment it is `[^/]*`, matching node. |
| File floor gameable | `assertDeclaredTests` counts `test(...)` declarations, rejects any discovered file declaring none (`78`), and requires ≥30 declared tests overall. |
| ENOENT crash | A missing or relocated test root now raises this guard's own error (`79`). |
| Non-numeric exit code | `process.exit(Number.isInteger(error.code) ? error.code : 65)`. |
| Wrong exit code in the RFC | Regression table corrected and extended to every rejection path. |

## Re-verification of both bypasses, pinned Node `24.20.0` / npm `11.19.0`

Each was re-injected exactly as the Tester described, then `package.json` was
restored and confirmed byte-identical (`git diff --stat package.json` empty).

| Injected regression | Before this commit | Now |
|---|---|---|
| `: node --test 'test-kits/**/*.test.mjs'` (Bypass 1) | exit `0`, 0 tests | exit **74** |
| `node --test '...' \|\| true` (Bypass 1b) | exit `0`, 0 tests | exit **74** |
| `node --test 'test-kits/**.test.mjs'` (Bypass 2) | exit `0`, 34 of 40 | exit **76** |
| `node --test 'test-kits/*.test.mjs'` (superseded glob) | exit `0`, 26 tests | exit **76** |
| unquoted pattern | exit `0`, 6 tests under `sh` | exit **74** |
| `--test-shard=1/2` inserted before the pattern | exit `0` | exit **74** |
| correct command (control) | — | exit `0`, `tests 44 / pass 44 / fail 0` |

Node-glob equivalence checked directly for the corrected matcher:

| Pattern | Path | Guard | node |
|---|---|---|---|
| `test-kits/**/*.test.mjs` | `test-kits/contracts/a.test.mjs` | match | match |
| `test-kits/**.test.mjs` | `test-kits/contracts/a.test.mjs` | no match | no match |
| `test-kits/**.test.mjs` | `test-kits/a.test.mjs` | match | match |

## Guard fault injection repeated

Neutering `assertCoverage` with an early `return` fails **5** tests
(`44 total / 39 pass / 5 fail`); restoring it returns `44/44`. The guard's tests
remain coupled to the guard rather than self-satisfying. Four new tests cover the
two bypasses and the declared-test floor.

`npm run check`: 40 → **44** tests.

## N1 — two near-identically named runs

Accepted. `role_assignments._run_id_disambiguation` now states it explicitly:
`/claude/r0_steward` (Anthropic) is **this** package's Integration Owner and must
record its own capability declaration before the package leaves `backlog`.
`/root/r0_steward` (OpenAI Codex) is a **different** run, named in `open_blockers`
only because it must countersign the WP-0A-A0-001 and WP-0A-CON-001 amendments
and record the WP-0A-CON-001 `npm run check` addendum. Neither substitutes for
the other.

## N2 — previously untracked evidence committed by `9403484`

Accepted as a real traceability limitation. `9403484` committed the Reviewer's,
Security reviewer's, and Tester's evidence files, which were untracked before, so
no diff can prove they crossed unaltered. The Tester confirmed its own file is
intact. The Reviewer and Security reviewer should confirm theirs at
integration. The Author asserts it modified none of them; that assertion is not
self-verifying, which is precisely the Tester's point.

## Condition C1 — still open by the Tester's standard, and correctly so

The Tester narrowed rather than closed C1: the guard runs *before*
`test:bootstrap` (fail-fast, confirmed) and therefore structurally cannot observe
what the runner actually executed. Pinning the command shape closes every bypass
demonstrated so far, but "a green run can never mean executed nothing" is an
assertion about execution, and only a post-run check on the real executed count
can make it. That is a further change to `npm run check` and is recorded as an
open item rather than claimed as closed here. The Author does not consider C1
closed.

---

# Round 3 — independent review found the guard itself was unwired (N2)

Reviewed commit: `9403484`. Reviewer run `/claude/c0_contract_reviewer` returned
`approved_with_conditions` and closed R1, R2, R3, R5, R6, R7 while marking R4
**partially closed**, with a new blocking finding.

## N2 (blocking) — accepted

The guard validated `test:bootstrap` but never that `check` **invokes** it.
Removing `&& npm run test:bootstrap` from `check` left `npm run check` exiting
`0` with zero tests and the guard silent. A guard that is not wired into the
command it protects protects nothing.

The Reviewer also showed the quote-stripping path from its original R4 was still
open — if a shell does not strip the single quotes, node receives a literal
`'test-kits/**/*.test.mjs'`, matches nothing, and exits `0` with `tests 0`, which
a guard that only reads the declared string cannot see.

Both findings share one root cause: the guard was reasoning about a *string*
while the failure happens during *execution*. Patching one bypass at a time was
not converging.

## Structural fix rather than another patch

1. `scripts/test-suite-contract.mjs` — the pattern and every floor in one place.
2. `scripts/run-test-suite.mjs` — spawns the runner with the pattern as an
   **argv string**, so it never reaches a shell. Shell quoting, `globstar`
   support, and `script-shell` can no longer change what runs; the quote-stripping
   class is designed out rather than detected. After the run it reads the
   executed-test count the runner itself reported and exits `80` if it is below
   the floor.
3. `scripts/verify-test-coverage-floor.mjs` — now pins `test:bootstrap` to
   exactly the runner command, and verifies `check` invokes both
   `verify:coverage-floor` and `test:bootstrap`, guard first (`81`).

## Full attack replay, pinned Node `24.20.0` / npm `11.19.0`

`package.json` restored and confirmed byte-identical after every injection.

| Attack | Result |
|---|---|
| N2 — `check` drops `npm run test:bootstrap` | exit **81** `check must invoke npm run test:bootstrap` |
| N2b — `check` drops the guard | exit **1** (test-suite backstop) |
| N2c — guard runs after the runner | exit **1** (test-suite backstop) |
| N2d — guard script neutered to `echo skipped` | exit **1** (test-suite backstop) |
| B1 — `: node scripts/run-test-suite.mjs` | exit **74** |
| B1b — `... \|\| true` | exit **74** |
| B2 — bare `**` inside a segment | exit **74** |
| superseded glob | exit **74** |
| N1 — quotes not stripped by the shell | exit **74** |
| correct command (control) | exit `0`, `tests 46 / pass 46 / fail 0` |

**No attack reached exit 0.** Two independent layers: the guard rejects what it
can see, and the test suite is the backstop for anything that disables the guard
— including disabling the guard itself.

## Other Reviewer findings

- **N3** (non-numeric errno crash) — already fixed in this round: a relocated
  test root raises `CoverageFloorError(79)` and `process.exit` coerces via
  `Number.isInteger`. The RFC table is corrected.
- **N4/N5** (floor counted files, not tests) — fixed: `assertDeclaredTests`
  rejects any discovered file declaring no `test()` (`78`) and requires ≥30
  declared tests. The Reviewer's 9-stub-file bypass no longer passes.
- **N6** (the `backlog` justification was inverted) — accepted and it is a fair
  hit. `validate-capability-profiles.mjs` early-returns at `backlog`, so the
  check the Author cited as the reason is not running at that status. The
  Reviewer measured the real behaviour: `backlog` → `0`, `ready`/`in_review` →
  **`68`** naming `/claude/r0_steward`. The conclusion (stay at `backlog`) was
  right; the stated reason was wrong. The package is hard-blocked from `ready`
  until that run declares itself, which is the correct control.
- **N8** (`scripts/**` and `test-kits/**` dropped from `read_only_paths`
  wholesale) — accepted as a real widening. The paths were removed because this
  package now writes three scripts and one test file there. `writable_paths`
  lists those four exactly, so no wildcard write was granted, but the read-only
  declaration is now less specific than before. Left for the Integration Owner.
- **N10** (manifests machine-reformatted) — the two amended manifests were
  reformatted when `ownership.amended_by` was inserted. Reviewed: no semantic
  change. Noted as diff noise.
- **Cross-vendor ruling** — the Reviewer read the Thai register directly and
  ruled the exception correctly characterised, sufficient to record, and **not**
  a blocker, noting the Author slightly over-declared since this package touches
  none of the critical-code categories. The Reviewer's caveat is recorded and
  the Author agrees: five runs of the same vendor *and the same model* share a
  correlated blind spot. Recording the exception documents that; it does not
  reduce it. This entire chain of findings — two working bypasses and one
  unwired guard, all in code the Author believed correct — is evidence for that
  caveat, not against it.

## Not closed

- **R4 / C1 remains narrowed, not closed by the Author's own assessment.** Every
  demonstrated bypass now fails closed and execution is asserted after the run,
  which is materially stronger than round 2. But "a green run can never mean
  executed nothing" is a claim about all possible futures, and two independent
  runs have now falsified that claim twice against code the Author believed
  sound. It should be re-attacked, not accepted.
- RFC-2026-003 is still `Proposed`; Product Owner disposition outstanding.
- `/root/r0_steward` countersignature and the WP-0A-CON-001 addendum outstanding.
- Security C1 (weak secret scanner) outstanding and out of scope.
