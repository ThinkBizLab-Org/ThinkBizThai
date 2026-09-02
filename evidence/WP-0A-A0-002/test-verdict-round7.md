# WP-0A-A0-002 — Independent Test Verdict, Round 7

- **agent_run_id:** `/claude/q0_sentinel`
- **Role:** Independent Tester
- **Branch:** `agent/claude/WP-0A-A0-002-contract-test-coverage`
- **Head under test:** `c631c07`
- **Delta tested:** `eefc747..c631c07` (`ffe36fa`, `c631c07`) — content digests replacing name-pinning, the stateful scanner, and the three round-7 additions: `assertEveryTestFileProtected` (87), `assertDeclarationsMatchExecution` (88), `assertNoEscapingPath` (85).
- **Date:** 2026-08-31

**This document is independent Tester evidence only.** It records what was executed and what the exit codes were. It is not an approval, not a review sign-off, and not an integration verdict. No production or shared state was modified by this work.

## Toolchain

Pinned Node 24.20.0 / npm 11.19.0, invoked through a login shell (`zsh -lc`) because the default shell resolves a different Node.

```
$ zsh -lc 'node -v; npm -v; which node'
v24.20.0
11.19.0
/Users/bank/.local/node-v24.20.0/bin/node
```

## Method

**All attack injection was performed in a sandbox copy outside the repository**, at
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad/qa7/`,
restored from a pristine `tar` copy of the working tree (excluding `.git`) before every single attack.
No tracked file in `/Users/bank/ThinkBizThai` was modified at any point. Confirmed at the end of the run:

```
$ git status --short     # (empty)
$ git diff --stat        # (empty)
```

The only deliverable added to the repository is this file.

Where an attack required editing a file the integrity manifest protects, the digest was updated in the
same step. That is the path the Author documents as legitimately open, and testing it is how its real
blast radius gets measured rather than assumed.

## Head baseline (item 6)

```
$ zsh -lc 'npm run check'   →   EXIT 0
ℹ tests 56    ℹ suites 0    ℹ pass 56
ℹ fail 0      ℹ cancelled 0 ℹ skipped 0   ℹ todo 0
```

### How 56 decomposes

Declared (by `countDeclaredTests`) and executed (by `node --test` per file) agree exactly, file by file:

| File | Declared | Executed |
|---|---:|---:|
| `test-kits/capability-profile.test.mjs` | 4 | 4 |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | 6 | 6 |
| `test-kits/repository-json.test.mjs` | 2 | 2 |
| `test-kits/role-separation.test.mjs` | 8 | 8 |
| `test-kits/secret-scan.test.mjs` | 2 | 2 |
| `test-kits/test-coverage-floor.test.mjs` | 24 | 24 |
| `test-kits/toolchain-contract.test.mjs` | 3 | 3 |
| `test-kits/work-package-discovery.test.mjs` | 1 | 1 |
| `test-kits/work-package-ownership.test.mjs` | 6 | 6 |
| **Total** | **56** | **56** |

9 files, 2 directories. Per-directory floors (`test-kits` 30, `test-kits/contracts` 6) are met with 56 and 6.

## Attack results — every attack run, with its real exit code

"Failed closed" means the attack was rejected with a non-zero exit. **Red rows are attacks that
reached exit 0 while the suite was defeated.**

### A. `npm run check` composition — package.json is not a protected file

| # | Attack | Real exit | Tests executed | Failed closed? |
|---|---|---:|---:|---|
| A1 | `check`: `... && verify:coverage-floor \|\| npm run test:bootstrap` | **0** | **0** | **NO — full bypass** |
| A2 | `check`: `... && verify:coverage-floor # && npm run test:bootstrap` | **0** | **0** | **NO — full bypass** |
| A3 | `check`: `... && verify:coverage-floor && echo npm run test:bootstrap` | **0** | **0** | **NO — full bypass** |
| A4 | control: unmodified `check` | 0 | 56 | n/a (baseline) |

### B. The declared-vs-executed reconciliation (88) — item 1

| # | Attack | Real exit | Failed closed? |
|---|---|---:|---|
| B1 | **Balanced**: 5 lexical declarations in a never-called function + 1 lexical line generating 6 tests in a loop | **0** (`pass 56`) | **NO — reconciliation defeated** |
| B2 | Loop only — declares 1 lexically, executes 6 | 82 | yes (per-directory floor) |
| B3 | Phantom only — declares 6, executes 0 | 88 | yes |
| B4 | `t.test()` subtests — declares 1, executes parent + 2 subtests | 88 | yes |
| B5 | `describe`/`it` — counter sees 0 declarations | 78 | yes |
| B6 | Throws during load — node counts the file as one failing test | 1 | yes |

### C. TOCTOU against the post-run walk — item 1

| # | Attack | Real exit | Failed closed? |
|---|---|---:|---|
| T1 | Test creates a 0-declaration `.test.mjs` under `test-kits/` mid-run | 1 | yes |
| T1b | Second run over the tree T1 left behind | 87 | yes |
| T2 | Test creates a `.test.mjs` **with** a declaration mid-run | 1 | yes |
| T3 | Test deletes a protected test file mid-run | 1 | yes |
| T4 | Test creates a symlink under `test-kits/` mid-run | 1 | yes |

### D. `assertEveryTestFileProtected` (87) and discovery-vs-execution — item 2

Probe: planted `.hidden.test.mjs`, `.dot/dotdir.test.mjs`, `node_modules/nm.test.mjs`,
`a/b/c/deep.test.mjs`, and `dir.test.mjs/inside.test.mjs`, then compared the set
`discoverTestFiles` returns against the set `node --test 'test-kits/**/*.test.mjs'` executes.

**`discoverTestFiles` returned all five. `node --test` executed only two** (`deep`, `inside`);
dotfiles, dot-directories and `node_modules` were globbed out. Discovery is a strict **superset** of
execution in every case tested. **I found no file that `node --test` executes and discovery misses.**
The asymmetry runs the safe way: an extra discovered file is unprotected (87) or unbalances the
reconciliation (88), both of which fail closed.

### E. `assertNoEscapingPath` (85) — item 3

| # | Attack | Real exit | Failed closed? |
|---|---|---:|---|
| P1 | Symlinked test file pointing at `/tmp` | 85 | yes |
| P2 | **Hard link** to a file outside the repo, not in manifest | 87 | yes |
| P2b | Same hard link, added to the manifest | 0 | n/a — see note |
| P3 | Sibling directory sharing the root as a string prefix (`…/qa7Evil/`) | rejected | yes — the trailing `/` in `${realRoot}/` defeats it |
| P4 | Whole checkout reached through a symlinked path (`/tmp/linkedco → qa7`) | 0, `pass 56` | yes — `realpath` is applied to root and files alike |
| P5 | Case-variant cwd on this case-insensitive filesystem (`QA7` vs `qa7`) | 0, `pass 56` | yes — `realpath` normalises case on both sides |

Note on P2b: a hard link is not a path escape — `realpath` correctly resolves inside the repo, and the
guard reads the same inode `node --test` executes, so the digest covers it. Not a finding; recorded for
completeness because `assertNoEscapingPath` does not and cannot reject it.

### F. The stateful scanner — item 4

19 adversarial inputs. **18 counted correctly. One miscount.**

Correct: regex with `/` inside a character class; escaped `]` in a class; division after `)`, after an
identifier, and after `]`; regex after `return`; `typeof /x/`; unterminated string at EOF; unterminated
template at EOF; `test(` inside a JSON fixture string; the round-5 glob-string defect
(`'test-kits/*.test.mjs'` + `'test-kits/**/*.test.mjs'`); `test(` in block and line comments;
`await test(`; `t.test(`; escaped backslash before a quote; regex followed by a line comment.

**F1 — nested template literal manufactures a phantom declaration.**

```js
const banner = `report ${ `
test("phantom-inside-nested-template", () => {});
` } end`;
test("the-only-real-test", () => {});
```

`countDeclaredTests` returns **2**; node executes **1**. `stripNonCode` ends the outer template at the
first unescaped backtick, so the inner template's closing backtick re-opens "code" and the line inside
the interpolation is scanned as a declaration. The source comment states the opposite guarantee:
*"A template literal may nest arbitrary code in `${...}`; treat the whole literal as non-code so nothing
inside it can be counted as a declaration."* It does not. This is the same invent-a-declaration class
found in round 6, still open in a narrower form.

### G. Retest of earlier defeats at this head — item 5

| # | Attack | Real exit | Failed closed? |
|---|---|---:|---|
| R1 | Six `{skip:true}` placeholders, digest **not** updated | 86 | yes |
| R1b | Same, digest updated | 80 | yes — skip/todo assertion holds |
| R2 | **Six trivial tests replacing the contract suite, digest updated** | **0** (`pass 56`) | **NO — Author's disclosed row, confirmed** |
| R3 | **Six bodyless `test("name");`, digest updated** | **0** (`pass 56`, skipped 0, todo 0) | **NO — Author's disclosed row, confirmed** |
| R4 | `console.log` of the names only | 78 | yes |
| R5 | **Gut the runner's `main()`, digest updated** | **0** | **NO — digest class** |
| R6 | `:` prefix on `test:bootstrap` | 74 | yes |
| R7 | Drop the runner from `check` entirely | 81 | yes |
| R8 | Superseded glob `test-kits/**.test.mjs` | 76 | yes |
| R9 | Symlink in the test root (= P1) | 85 | yes |

**Author honesty check.** The Author stated that editing a guarded file together with its digest still
passes. R2, R3 and R5 confirm this directly: exit 0 in all three. The claim is accurate and was verified,
not assumed. R4 and R1b further show the Author did *not* overstate — two attacks the Author's notes
imply are closed are in fact closed.

## Findings

### FINDING 1 (blocking) — `npm run check` can be made to exit 0 with zero tests, with every protected file byte-identical

`package.json` is the one file that decides whether the suite runs at all, and it is **not in
`test-kits/integrity-manifest.json`**. `assertPackageScripts` pins the *values* of `test:bootstrap` and
`verify:coverage-floor` exactly, but validates the `check` script only with `String.includes` plus an
ordering comparison of two indices. A shell operator is enough to satisfy both while neutralising the run.

Changing exactly one character — `&&` to `||`:

```
"check": "node scripts/verify-toolchain.mjs && npm run scan:secrets && npm run validate:protocol
          && npm run verify:coverage-floor || npm run test:bootstrap"
```

- `check.includes('npm run test:bootstrap')` → true
- `check.includes('npm run verify:coverage-floor')` → true
- `guardAt < runnerAt` → true
- the guard succeeds, so `||` short-circuits and **the suite never runs**

Measured result:

```
npm run check              EXIT=0
tests executed             0   (no ℹ pass line is emitted at all)
protected files drifted    0   (all 12 match their pinned digests)
integrity-manifest.json    byte-identical to head
files differing from head  package.json only
```

`# && npm run test:bootstrap` (A2) and `&& echo npm run test:bootstrap` (A3) reach exit 0 the same way.

This matters more than a local footgun because **`.github/workflows` runs `npm run check` as its only
validation step**. A pull request carrying this one-character change goes green on ubuntu CI with zero
tests executed.

This is not the disclosed, unclosable "edit a file and its digest together" class. It requires **no**
manifest edit and **no** protected-file edit. It is the same class the Author explicitly declared closed
at round 7 — *"Independent review gutted the four test files the manifest did not name, with the manifest
byte-identical -- exit 0, 54/54 green. That is NOT the unclosable digest-updating class, so it is closed."*
The class is not closed. It survived through the one unprotected file that controls whether the suite runs.

### FINDING 2 (blocking) — the declared-vs-executed reconciliation (88) is a scalar comparison and can be balanced

`assertDeclarationsMatchExecution` compares two integers. It does not compare identities. Its own error
text claims to detect *"a declaration the runner does not execute, or a test the counter cannot see"* —
but when **both** errors are present in equal measure they cancel, and the control reports agreement.

The entire CTR contract suite was replaced with:

```js
// Never called. The counter sees five declarations here; node executes none of them.
function neverInvoked() {
test("phantom-1", () => { throw new Error("never runs"); });
...five of these...
}

// One lexical declaration; node executes six. The two errors cancel exactly.
for (const name of ["gen-1", ..., "gen-6"])
  test(name, () => {});
```

Counter sees 5 + 1 = **6** in `test-kits/contracts` (clears its floor of 6). Node executes **6**
empty-bodied tests. Result: `EXIT=0`, `tests 56`, `pass 56`, `fail 0`, `skipped 0`, `todo 0`. The
per-directory floor, the global floor, the executed floor, every digest, and the reconciliation all
report green while the contract suite asserts nothing whatsoever.

This attack does require a digest update, so it is bounded by the disclosed tripwire. It is reported as
blocking because 88 was introduced in this delta specifically to catch this, and it does not.

### FINDING 3 (non-blocking) — nested template literals manufacture a phantom declaration

See F1. The scanner is materially better than round 6 — 18 of 19 adversarial inputs are correct, and the
regex-literal state genuinely closed the `/[/*]/` hole. But the nested-`${` case still invents a
declaration, and the source comment asserts a guarantee the code does not provide. On its own it only
unbalances 88 (which fails closed); combined with Finding 2 it is another way to source the phantom half.

## Nothing weakened (item 7)

- `git diff --stat dcafcf8..c631c07`: 33 files, +7028 / −6. No test file deleted (`--diff-filter=D` over
  `test-kits/` is empty).
- `.github/` and `package-lock.json`: **untouched** across the delta.
- No `skip: true`, `todo: true`, `.only(`, `test.skip` or `it.skip` anywhere in `test-kits/` — the single
  grep hit is prose inside a comment in `test-coverage-floor.test.mjs`.
- Validators run individually: `verify-toolchain` 0, `scan-repository-secrets` 0, `validate-work-packages` 0,
  `validate-capability-profiles` 0, `validate-work-package-ownership` 0, `verify-test-coverage-floor` 0.
  `validate-work-package-role-separation.mjs` exits 64 standalone because it is an argument-taking CLI
  printing its usage; it is not wired into `check` and is exercised by the 8 tests in
  `role-separation.test.mjs`. Not a weakening.
- Head run is clean and repeatable: `npm run check` EXIT 0, 56/56, skipped 0, todo 0, and the working tree
  is unmodified afterwards.

## Assessment

The delta is real progress. The digest manifest closed the forgeable-runtime-stream class that defeated
name-pinning twice. `assertNoEscapingPath` (85) held against every path attack I could construct —
sibling-prefix, symlinked checkout, case-variant cwd on a case-insensitive filesystem, and hard links.
`assertEveryTestFileProtected` (87) held, and I could not find a file `node --test` executes that
`discoverTestFiles` misses. Every TOCTOU variant failed closed. Every unbalanced reconciliation variant
failed closed with a distinct, accurate exit code. The Author's disclosure about what still passes is
accurate.

But the work package's own defect class — a green `npm run check` that executed nothing — is still
reachable, and reachable by the cheapest possible edit, in the one file the manifest does not cover, with
CI going green alongside it. Finding 1 alone is disqualifying at this head.

VERDICT: test_failed
