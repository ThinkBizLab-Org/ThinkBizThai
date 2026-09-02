# WP-0A-A0-002 — Independent Tester verdict at head

**This document is independent Tester evidence only.** It is not review evidence, not
integration evidence, and not an authoring record. Nothing here was taken on the Author's
word: every exit code below was produced by executing the command in this repository.

| Field | Value |
| --- | --- |
| agent_run_id | `/claude/q0_sentinel` |
| Role | Independent Tester |
| Work package | WP-0A-A0-002 |
| Branch | `agent/claude/WP-0A-A0-002-contract-test-coverage` |
| Delta tested | `9403484..f55b8ff` (commits `4e1d6e5`, `f55b8ff`) |
| Head verified | `f55b8fffff2198b72d4eaab77695c7255fbcac4e` |
| Date | 2026-08-31 |

## Toolchain observed

Every command was run through a login shell (`zsh -lc`) because the default shell resolves
the wrong Node.

```
$ zsh -lc 'node --version; npm --version'
v24.20.0
11.19.0
```

Matches the `engines` pin in `package.json` (node 24.20.0 / npm 11.19.0).

## 1. `npm run check` at head

```
$ zsh -lc 'cd /Users/bank/ThinkBizThai && npm run check'
EXIT=0
ℹ tests 48
ℹ suites 0
ℹ pass 48
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Exit code **0**, 48 tests, `skipped 0`, `todo 0`, `fail 0`. The Author's claim of 48 is
confirmed.

### How 48 decomposes, per file

Each file was executed in isolation (`node --test <file>`) and its declared `test(` count
read independently. Executed and declared agree everywhere — no file hides a declaration
that does not run.

| File | Executed | Declared |
| --- | ---: | ---: |
| `test-kits/capability-profile.test.mjs` | 4 | 4 |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | 6 | 6 |
| `test-kits/repository-json.test.mjs` | 2 | 2 |
| `test-kits/role-separation.test.mjs` | 8 | 8 |
| `test-kits/secret-scan.test.mjs` | 2 | 2 |
| `test-kits/test-coverage-floor.test.mjs` | 16 | 16 |
| `test-kits/toolchain-contract.test.mjs` | 3 | 3 |
| `test-kits/work-package-discovery.test.mjs` | 1 | 1 |
| `test-kits/work-package-ownership.test.mjs` | 6 | 6 |
| **Total** | **48** | **48** |

Per-directory: `test-kits/` (root files) = 42, `test-kits/contracts/` = 6.
Against the declared floors in `scripts/test-suite-contract.mjs`
(`test-kits` ≥ 30, `test-kits/contracts` ≥ 6, `MIN_EXECUTED_TESTS` = 40) the suite clears
the contracts floor with **zero margin**: deleting any one contract test breaks the build.

## 2. Attack table — every attack, real exit code observed

| # | Attack | Real exit | Failed closed? |
| --- | --- | ---: | --- |
| A3.1 | `test-kits/contracts/…catalog.test.mjs` replaced by one trivial passing test | **82** | Yes |
| A3.2 | Same file gutted, padded with six trivial `test('x', () => {})` | **0** | **NO — bypass** |
| A3.3 | Same file gutted, six `test.skip(…)` | **78** | Yes |
| A3.4 | Same file gutted, six `test('x', { skip: true }, fn)` | **0** | **NO — bypass** |
| A3.5 | Real suite moved to `test-kits/contracts/nested/` | **82** | Yes |
| A3.6 | One real test + five `test(` lines inside a block comment / template literal | **0** | **NO — bypass** |
| I4.a | Test prints `ℹ tests 8888` inline and `ℹ tests 9999` from `process.on('exit')` | **0**, parsed **49** (true count) | Yes — forgery ignored |
| I4.b | Test calls `process.exit(0)` mid-run | **0**, `tests 49 / fail 0` | Yes — count not inflated |
| I4.c | Test SIGKILLs its own process | **1** | Yes |
| I4.d | Inner `node --test` child SIGKILLed (close code `null`) | **1** | Yes |
| I4.e | Runner output containing no summary line at all | throws, exit path **80** | Yes |
| R1 | `test:bootstrap` prefixed with the `:` no-op | **74** | Yes |
| R2 | `test:bootstrap` suffixed with `\|\| true` | **74** | Yes |
| R3 | `&& npm run test:bootstrap` dropped from `check` | **81** | Yes |
| R4 | `TEST_PATTERN` reverted to the superseded `test-kits/**.test.mjs` | **76** | Yes |

## 3. Attacking the I3 fix (per-directory floors)

The I3 remediation added `MIN_DECLARED_TESTS_BY_DIRECTORY` with
`'test-kits/contracts': 6`, enforced by `assertDeclaredTests` in
`scripts/verify-test-coverage-floor.mjs` (exit 82).

**The Integration Owner's original attack now fails.** Replacing the contract suite with a
single trivial passing test produced:

```
EXIT=82
directory 'test-kits/contracts' declares 1 tests, below its floor of 6.
A per-directory floor exists because a global total lets the suite it protects be
replaced by a placeholder.
```

The file was restored byte-identically. Proof:

```
$ shasum -a 256 test-kits/contracts/shared-kernel-contract-catalog.test.mjs
65a4c793e4dcfcc464ea77fd4e832c9f9272a08a13b050cc44e3bf4dff4039bc   (== pre-attack hash)
$ git diff --stat
(no output)
```

(The A3.5 relocation was performed with `git mv`; the index was reset with
`git reset HEAD -- test-kits/` and the working tree confirmed clean.)

### But the fix is defeatable — three working bypasses

The floor counts **declarations**, not **behaviour**. Anything that makes the regex
`/^\s*(?:await\s+)?test\s*\(/gm` fire six times satisfies it.

**Bypass 1 — trivial padding (A3.2), exit 0.** The entire contract suite replaced by:

```js
import test from 'node:test';
test('a', () => {}); test('b', () => {}); test('c', () => {});
test('d', () => {}); test('e', () => {}); test('f', () => {});
```

`npm run check` exits **0** reporting `ℹ tests 48`. Every real shared-kernel contract
assertion is gone and no guard notices. The per-directory floor stops a *smaller*
placeholder, not an *equal-sized* one.

**Bypass 2 — `{ skip: true }` (A3.4), exit 0. This is the package's own defect class,
reproduced.** `test.skip(…)` fails closed (see below), but the option-object form does not:

```js
test('a', { skip: true }, () => { throw new Error('never runs'); });   // ×6
```

```
EXIT=0
ℹ tests 48
ℹ pass 42
ℹ skipped 6
```

`countDeclaredTests` counts each line (it matches on `test(`), and node's `tests N`
summary counts skipped tests toward the total, so `assertExecuted` sees **48** while only
**42** tests actually executed. This is precisely the "green run that executed nothing"
the floor exists to prevent, one level down: six tests that throw on execution never
execute, and `npm run check` is green. **Nothing in `check` asserts `skipped 0` or
`todo 0`.**

**Answer to the direct question — does a skipped test count toward the floor while
executing nothing?** It depends on the form, and the split is the vulnerability:

| Form | `countDeclaredTests` | Executed | `npm run check` |
| --- | ---: | ---: | ---: |
| `test.skip('a', fn)` | **0** | 0 | **78** (fails closed) |
| `test('a', { skip: true }, fn)` | **1** | 0 (counted as skipped) | **0** (bypass) |

**Bypass 3 — comments and template literals (A3.6), exit 0.** `countDeclaredTests` is a
line-anchored regex over raw source with no lexing, so a `test(` at the start of a line
inside a block comment or a template literal is counted:

```js
/*
test('commented b', () => {});   // ×3, counted, never parsed as code
*/
const doc = `
test('literal e', () => {});     // ×2, counted, never executed
`;
test('the only real one', () => {});
```

`npm run check` exits **0** with `ℹ tests 43 / pass 43` — the contracts directory
"declares" 6 and executes 1.

### Attacks on the I3 fix that DID fail closed

- **`test.skip(…)` (A3.3) — exit 78.** The regex requires `test` followed by `(`, so
  `test.skip(` matches nothing, the file counts 0, and the "declares no test at all" guard
  fires. Correct behaviour, reached by accident rather than by design.
- **Nested subdirectory (A3.5) — exit 82.** `assertDeclaredTests` matches directory keys by
  exact equality, so moving the suite into `test-kits/contracts/nested/` drops the
  `test-kits/contracts` count to 0. Fails closed, but note the flip side: the floor is
  brittle to any *legitimate* reorganisation, which invites a future author to relax it.

## 4. Attacking the I4 fix (last-match executed count)

`parseExecutedTests` now takes `matches.at(-1)`. I could not defeat it.

- **Inline forgery (I4.a).** A test that both `console.log`s `ℹ tests 8888` and writes
  `ℹ tests 9999` from a `process.on('exit')` handler. Both forged lines landed at output
  lines 53 and 55; the runner's real summary landed at line 56. `parseExecutedTests`
  returned **49** — the true count. The `process.on('exit')` vector is the strongest
  available from inside a test file, and it still cannot get past the summary: `node --test`
  runs each file in its own child process and forwards that child's stdout *before* the
  parent emits the run summary.
- **`process.exit(0)` mid-run (I4.b).** Exits only the per-file child. The file was still
  counted (`tests 49`, `fail 0`, exit 0); the count was not inflated, and a file that exits
  early reports *fewer* tests, which drives the count toward the floor rather than past it.
- **Ordering / concurrency.** `TEST_PATTERN` reaches `spawn` as a single argv string and no
  `--test-concurrency` flag is reachable from the repository, so interleaving between files
  cannot reorder the parent's final summary relative to forwarded child output.

**One residual weakness, not demonstrated as exploitable.** The parent accumulates with
`output += chunk` on raw `Buffer`s. A chunk boundary that splits the multi-byte `ℹ`
(U+2139) of the real summary would corrupt that line, while the regex's *other* accepted
prefix — `#` — is pure ASCII and cannot be split. An attacker who could force a pipe-chunk
boundary at exactly that offset would leave a forged `# tests 9999` as the last surviving
match. I could not realise this in practice (the summary is written as one small write and
the reader drains promptly), so I record it as a latent hardening item, not a defect:
`child.stdout.setEncoding('utf8')` removes it entirely.

## 5. `scripts/run-test-suite.mjs` as new code

| Scenario | Behaviour observed | Correct? |
| --- | --- | --- |
| Child killed by signal (close code `null`) | `code !== 0` → `process.exit(code ?? 1)` → **exit 1** | Yes |
| Test calls `process.exit(0)` | per-file child only; run continues; **exit 0** with true count | Yes |
| Output contains no summary at all | `parseExecutedTests` → `null` → `assertExecuted` throws `could not read an executed-test count …` → **exit 80** | Yes |
| Executed count below floor | **exit 80** | Yes |
| Test suite fails | child's non-zero code propagated verbatim | Yes |

Exit-code propagation is correct in every case tested. `stderr` is `inherit`, so nothing
written to stderr can reach the audited buffer — a small hardening in the runner's favour.

**Can `npm run check` exit 0 while fewer than 48 tests actually executed? Yes, two ways.**
(a) By design: `MIN_EXECUTED_TESTS` is 40, so eight tests can be deleted and the run stays
green — an eight-test erosion budget. (b) By bypass A3.4, which reports 48 while executing
42. Neither is caught.

## 6. Earlier attacks re-run at this head

All four still fail closed. Real exit codes and the real guard messages:

- **`:` no-op prefix — exit 74.** `test:bootstrap must be exactly 'node scripts/run-test-suite.mjs' …; found: : node scripts/run-test-suite.mjs`
- **`|| true` — exit 74.** Same guard; `found: node scripts/run-test-suite.mjs || true`
- **`test:bootstrap` dropped from `check` — exit 81.** `check must invoke npm run test:bootstrap; a guard that is not wired into check protects nothing.`
- **Superseded glob `test-kits/**.test.mjs` — exit 76.** `pattern … does not match 1 discovered test file(s): test-kits/contracts/shared-kernel-contract-catalog.test.mjs. These would silently never run.`

`package.json` and `scripts/test-suite-contract.mjs` were restored from pre-attack copies
after each run; `git status --short` was clean afterwards.

## 7. I5 restoration verified

All three files claimed restored are present on this branch:

- `.agents/capability-profiles/cc-r0-steward.json` — PRESENT
- `evidence/WP-0A-A0-002/integration-verdict.md` — PRESENT
- `handoffs/WP-0A-A0-002-integration-handoff.json` — PRESENT

The capability declaration is **byte-identical** to the version the Author moved it from:

```
$ git show 106f91c:.agents/capability-profiles/cc-r0-steward.json | diff - .agents/capability-profiles/cc-r0-steward.json
(no output)
$ shasum -a 256  (both)
7fadb4dc961e97738791c7f1015044eab7d2f15375c1564e20f5486657b64edf
```

The move altered nothing.

## 8. Nothing weakened

- **No test skipped or disabled.** `grep -rnE "test\.skip|test\.todo|test\.only|skip:\s*true|todo:\s*true|only:\s*true|it\.skip" test-kits/` → **no matches**. Run reports `skipped 0 / todo 0`.
- **Declared tests rose 40 → 48** across `9403484..f55b8ff`.
- **One test was removed**, legitimately: `a test:bootstrap without a single-quoted pattern is rejected` tested `extractTestPattern`, a function deleted when the pattern moved to `scripts/test-suite-contract.mjs` as a constant that never reaches a shell. The shell-quoting concern it covered is designed out, not un-tested. Net +8.
- **`.github/` and `package-lock.json` untouched** across `dcafcf8..f55b8ff` (`git diff --stat` empty for both paths).
- **All validators exit 0 individually:** `verify-toolchain` 0, `scan-repository-secrets` 0, `validate-work-packages` 0, `validate-capability-profiles` 0, `validate-work-package-ownership` 0, `verify-test-coverage-floor` 0.

## Conditions attached to this verdict

1. **`test('x', { skip: true }, fn)` is a working bypass of the executed-test floor** —
   `assertExecuted` sees a number higher than the true executed count. Remediate by
   parsing `ℹ skipped` / `ℹ todo` from the same summary the floor already reads and
   failing on any non-zero value.
2. **`countDeclaredTests` counts text, not tests.** Comment bodies and template-literal
   contents satisfy the floor (bypass 3), and six no-op `test()` calls satisfy it
   (bypass 1). A declaration count cannot express "this suite still checks the shared
   kernel"; only asserting on the contract fixtures' own content can.
3. **The `test-kits/contracts` floor of 6 has zero headroom and matches its directory key
   by exact string equality**, so any legitimate reorganisation breaks the build and
   pressures a future author to loosen it.
4. **Latent:** `child.stdout` is concatenated as raw `Buffer`s in
   `scripts/run-test-suite.mjs`; call `child.stdout.setEncoding('utf8')` so a chunk
   boundary cannot corrupt the multi-byte `ℹ` of the authoritative summary line.

None of these are regressions introduced by `f55b8ff`, and none block the delta: the I4
and I5 remediations hold under every attack I could construct, the I3 remediation blocks
the exact defect it was written for, and all four previously-demonstrated wiring attacks
still fail closed. They are limits of the guard as shipped and must be recorded so the
next role does not mistake a green `npm run check` for a semantically intact suite.

VERDICT: test_verified_with_conditions
