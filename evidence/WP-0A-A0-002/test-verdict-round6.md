# WP-0A-A0-002 — Independent Tester verdict, round 6

**This document is independent Tester evidence only.** It is not a review, not an
integration verdict, and not an approval. It records what was executed, the real exit
codes observed, and nothing else.

- **agent_run_id:** `/claude/q0_sentinel`
- **Role:** independent Tester (adversarial)
- **Delta tested:** `f55b8ff..eefc747` (Author remediation 3)
- **Branch:** `agent/claude/WP-0A-A0-002-contract-test-coverage`, head `eefc747`
- **Round:** 6

## Toolchain

| Item | Value |
| --- | --- |
| Node | v24.20.0 (pinned; every command run through a login shell) |
| npm | 11.19.0 |
| Invocation | `zsh -lc 'cd /Users/bank/ThinkBizThai && npm run check'` |
| Platform | darwin 25.6.0 |

## Method

The repository working tree was **never modified**. Every attack was executed against a
byte-identical copy of the tree in the session scratchpad
(`.../scratchpad/qa6/sandbox`). Fidelity was verified before and after:

```
diff -r scripts sandbox/scripts      -> scripts IDENTICAL
diff -r test-kits sandbox/test-kits  -> test-kits IDENTICAL
diff package.json sandbox/package.json -> package.json IDENTICAL
```

Each attack restored from a **copied backup** (`cp -R`), never `git checkout`.
Final `git status --short` is empty except this deliverable; final `git diff --stat` is
empty.

## 7. `npm run check` at head

```
EXIT = 0
ℹ tests 53   ℹ suites 0   ℹ pass 53   ℹ fail 0
ℹ cancelled 0   ℹ skipped 0   ℹ todo 0   ℹ duration_ms 223.668167
```

### The 53, decomposed per file

Executed counts were obtained by running `node --test <file>` on each discovered file.
Declared counts are what the guard's own `countDeclaredTests` reports.

| File | Executed (`pass`) | Guard's declared count |
| --- | ---: | ---: |
| `test-kits/capability-profile.test.mjs` | 4 | 4 |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | 6 | 6 |
| `test-kits/repository-json.test.mjs` | 2 | 2 |
| `test-kits/role-separation.test.mjs` | 8 | 8 |
| `test-kits/secret-scan.test.mjs` | 2 | 2 |
| `test-kits/test-coverage-floor.test.mjs` | **21** | **10** |
| `test-kits/toolchain-contract.test.mjs` | 3 | 3 |
| `test-kits/work-package-discovery.test.mjs` | 1 | 1 |
| `test-kits/work-package-ownership.test.mjs` | 6 | 6 |
| **Total** | **53** | **42** |

`suites 0` — no `describe` blocks exist, so all 53 are top-level leaf tests.

**The two columns do not agree.** The guard believes the repository declares 42 tests
when it executes 53. All 11 of the missing declarations are in
`test-kits/test-coverage-floor.test.mjs` — the guard's own suite. Cause is documented
under claim 5 below (attack I3). The direction here is fail-safe (undercount), but the
number the guard prints and the floor it enforces are computed from a corrupted view of
the source.

## Attack table

Every row was executed. "Failed closed" means the run was rejected with a non-zero exit.

| # | Attack | Real exit | Failed closed? |
| --- | --- | ---: | --- |
| **A** | Replace all 9 suites with 51 empty-bodied `test(name, () => {})`; 10 of them named the `REQUIRED_TEST_NAMES` strings | **0** | **NO — full bypass** |
| **B** | Same gutting; **no** test named a required name; one `console.log` of the 10 strings | **0** | **NO — full bypass** |
| **C** | Same gutting; every test **bodyless** — `test('name');` with no callback at all | **0** | **NO — full bypass** |
| **D1** | Edit **only** `scripts/test-suite-contract.mjs` (floors→1, `REQUIRED_TEST_NAMES=[]`, by-directory `{}`); leave one bodyless test in the whole repo | **0** | **NO — full bypass, digest tripwire silent** |
| D2 | Gut `main()` in `run-test-suite.mjs` to `return`, **and update its digest in the same change** | **0** | NO (exactly as the Author admits) |
| D3 | Same edit, digest **not** updated | 86 | yes |
| E1 | Symlink to a file placed inside `test-kits/` | 85 | yes |
| E2 | Symlink to a **directory** placed inside `test-kits/` | 85 | yes |
| E3 | **Hardlink** inside `test-kits/` to a payload outside the root | 0 | partial — see claim 4 |
| **E4** | In-root test `import`s a **symlink resolving outside** `test-kits/`; payload adds passing tests | **0** | **NO — residual gap** |
| F | Test forges a full summary from a `process.on('exit')` handler | 80 | yes |
| G | Test spawns a **detached grandchild** that writes a forged summary 1.2 s later on the inherited stdout | 80 | yes |
| H | Chunk-boundary split of the 3-byte `ℹ` in the real summary | parses `3` (correct) | yes — closed |
| **I1** | `stripNonCode`: template literal containing `` ${'`'} `` | **counts 3, executes 1** | **NO — count inflation** |
| I2 | `stripNonCode`: glob strings `'test-kits/*.test.mjs'` … `'x/**/y'` form a phantom block comment | counts 0, executes 1 | undercount (fail-safe, still wrong) |
| I3 | Same defect on the real `test-coverage-floor.test.mjs` | counts 10, executes 21 | undercount (fail-safe, still wrong) |
| J1 | `t.skip()` called **inside** a test body | 80 (`skipped 1`) | yes |
| J2 | Async assertion never awaited (`Promise.resolve().then(() => assert…)`) | 1 (node raises an extra failing test) | yes |
| J3 | `describe`/`it` nesting used to inflate `pass` | `pass` counts leaves only (3 for 3 `it`s, `suites 2` separate) | yes — no inflation |
| J4 | `{ only: true }` without `--test-only` | ignored by node; all tests still run | yes |
| R1 | `test:bootstrap` = `: node scripts/run-test-suite.mjs` | 74 | yes |
| R2 | `test:bootstrap` = `node scripts/run-test-suite.mjs \|\| true` | 74 | yes |
| R3 | `check` drops `&& npm run test:bootstrap` | 81 | yes |
| R4 | `check` drops `&& npm run verify:coverage-floor` | 1 (caught by the suite, not the guard) | yes |
| R5 | Superseded glob `test-kits/*.test.mjs` | 76 | yes |
| R6 | Bare `**` — `test-kits/**.test.mjs` | 76 | yes |

## Results against the six claimed closures

### Claim 1 — assert on `pass`, reject `skipped`/`todo` > 0 (exit 80) — **NOT CLOSED**

The **skip half works.** `t.skip()` inside a body is counted as `skipped` and rejected
(J1, exit 80). A forged summary cannot raise the count, from a `process.on('exit')`
handler (F) or from a detached grandchild holding the inherited pipe open for 1.2 s (G) —
in both cases the forgery lands *before* the parent's own summary and the last-match rule
takes the real one. The classic unawaited-async-assertion attack (J2) fails closed:
Node 24 promotes the unhandled rejection to an extra **failing** test, exit 1. `describe`
nesting does not inflate `pass` (J3); `only: true` without `--test-only` is ignored (J4).

**But the premise fails.** `pass` can be made arbitrarily large with zero real coverage:

- `test('name', () => {})` — empty body — counts as `pass` (attack A).
- `test('name');` — **no callback at all** — also counts as `pass` (attack C).

Attack C replaced the entire repository test suite with 51 lines of the form
`test('<string>');`. Not one function body exists in the repository. `npm run check`
reported `pass 51`, `skipped 0`, `todo 0`, and **exit 0**. Asserting on `pass` instead of
`tests` closes the skip class and only the skip class.

### Claim 2 — `REQUIRED_TEST_NAMES` identity pinning (exit 84) — **DEFEATED, twice**

This is the load-bearing claim ("identity, not quantity"), and it is the weakest guard in
the change. `assertRequiredTests` is `output.includes(name)` against the runner's stdout.
Stdout is attacker-controlled by anything that runs.

**Bypass 2a — name a trivial test one of the required names (attacks A and C).**
Yes: this satisfies the check completely. Every real suite in the repository was deleted
and replaced with empty-bodied (A) and then bodyless (C) tests, ten of which carried the
ten required name strings verbatim. `node --test` printed `✔ <required name>` for each,
`output.includes(name)` was satisfied for all ten, and **`npm run check` exited 0** with
`pass 51 / fail 0 / skipped 0 / todo 0`. The guard cannot distinguish
`test('rejects a synthetic private-key pattern');` — which asserts nothing and has no
body — from the real secret-scan test.

**Bypass 2b — a bare `console.log` (attack B).** Stronger still: **no test needs to be
named anything.** All 54 tests were named `t0_1 … t7_6`, and a single statement,

```js
console.log([...the ten required names...].join('\n'));
```

placed at the top of one test file, satisfied all ten required names.
**Exit 0.** A `console.log` is enough; the string never has to be a test name, let alone
a test that ran.

The check therefore proves only that ten byte-strings reached stdout. It does not
establish that any named test exists, ran, or asserted anything. (One narrow limit
observed: stderr is `inherit`, not piped, so only stdout can carry the forgery.)

### Claim 3 — `GUARDED_SCRIPT_DIGESTS` tripwire (exit 86) — **as weak as claimed, and weaker**

- Editing a guarded script without updating its digest is caught: exit 86 (D3). ✔
- Editing a guarded script **and** updating its digest in the same change passes: exit 0
  with `main()` gutted to `return` and zero tests executed (D2). This is exactly the
  weakness the Author documents, no more. ✔ (as admitted)
- **The digest table does not cover the file that holds it.** There is no `GUARDED_SCRIPTS`
  export anywhere in `scripts/` (`grep -rn GUARDED_SCRIPTS scripts/` → no match);
  `GUARDED_SCRIPT_DIGESTS` lists exactly two entries, `run-test-suite.mjs` and
  `verify-test-coverage-floor.mjs`. **`scripts/test-suite-contract.mjs` is not digested** —
  yet it is the single source of truth for `TEST_PATTERN`, `MIN_TEST_FILES`,
  `MIN_TEST_DIRECTORIES`, `MIN_DECLARED_TESTS`, `MIN_DECLARED_TESTS_BY_DIRECTORY`,
  `MIN_EXECUTED_TESTS`, `REQUIRED_TEST_NAMES`, **and the digest table itself**.

Attack D1 edited that one file only — floors to 1, `REQUIRED_TEST_NAMES` to `[]`,
`MIN_DECLARED_TESTS_BY_DIRECTORY` to `{}` — deleted every test file, and left a single
`test('nothing at all');`. Result: `tests 1 / pass 1`, **exit 0**, and the tripwire
printed nothing, because both digested files were untouched and still hash correctly.
The in-suite pins (`MIN_EXECUTED_TESTS >= 40`, etc.) do not help: they live in
`test-kits/test-coverage-floor.test.mjs`, which is also undigested and is deleted by the
same change.

### Claim 4 — symlink rejection (exit 85) — **holds inside the root; scoped too narrowly**

- Symlink to a **file** under `test-kits/`: exit 85. ✔
- Symlink to a **directory** under `test-kits/`: exit 85. ✔ (`readdir` reports
  `isSymbolicLink()` true for a dirent that targets a directory, so it is caught before
  the recursive descent.)
- **Hardlink** (E3): evades `isSymbolicLink()` and executes — exit 0. This is **not** a
  coverage bypass: a hardlink is a second name for the same inode, so the guard's
  `readFile` inspects exactly the content that runs and counts its declarations. The
  guard's stated rationale ("run code the guard never inspected") is not violated.
- **Out-of-root symlink import (E4) — residual gap.** A test file inside `test-kits/`
  that does `import '../outside-link.mjs'`, where that path is a symlink resolving outside
  the repository's test root, executes the payload, contributes its tests to `pass`
  (`tests 55 / pass 55`), and **exit 0** — the guard never flags it, because the symlink
  rejection only walks the test root and never follows what test files import. The
  rejection is a property of the directory walk, not of what executes. Combined with
  claim 1's weakness this lets the `pass` floor be met by code the guard never inspected.

### Claim 5 — `stripNonCode` (exit 82 / 78 path) — **DEFEATED in both directions**

`stripNonCode` applies five line-oriented regexes in sequence with no lexer state, so any
`/*`, `*/`, or `` ` `` occurring inside a string or regex literal is treated as a real
delimiter.

**Inflation (I1) — counted but never executed.** This is the direction that matters:

```js
const t = `a${'`'}b
test('phantom1', () => {});
test('phantom2', () => {});
`;
test('real', () => {});
```

`countDeclaredTests` returns **3**. Exactly **one** test executes. The template-literal
stripper closes its region at the backtick inside `${'`'}`, leaving the rest of the
template — including two line-anchored `test(` declarations that Node never runs — in the
"code" it counts. The claim that declaration counting "ignores comments, template literals
and strings" is false, and phantom declarations can be used to satisfy the per-directory
floor (`test-kits/contracts` ≥ 6) with declarations that do not run.

Related, JS-valid variant: `const re = /[/*]/;` is a legal regex literal whose source text
contains `/*`, opening a phantom block comment.

**Deletion (I2, I3) — real declarations erased.** A string containing `/*` opens a phantom
block comment that runs to the next `*/` anywhere in the file, blanking everything between.
This is not hypothetical — it is happening in the repository right now.
In `test-kits/test-coverage-floor.test.mjs`:

- `assertCoverage('test-kits/*.test.mjs', files)` (line 40) opens a phantom comment that
  closes at `'no-such-dir/**/*.test.mjs'` (line 46), erasing the test declared at line 45.
- `globToRegExp('test-kits/**.test.mjs')` (line 121) opens a phantom comment that closes
  at `'/* test("a", () => {}); */'` (line 214), erasing **ten** consecutive real test
  declarations (lines 126–213).

Net: 21 real tests, 10 counted. This direction is fail-safe for the floor, but it means
the declared floor and every per-directory floor are enforced against a mis-parsed source,
and a future edit could silently drop a protected directory below its floor for reasons
unrelated to its actual content.

### Claim 6 — `setEncoding('utf8')` — **CLOSED**

The chunk-boundary attack was re-run directly against the head parser. A child writes a
forged `ℹ pass 9999`, then the real `ℹ pass 3` with the 3-byte U+2139 split across two
writes:

```
WITHOUT setEncoding (old behaviour): "ℹ pass 9999\n��� pass 3\n" -> parses 9999
WITH    setEncoding('utf8'):         "ℹ pass 9999\nℹ pass 3\n"                  -> parses 3
```

The `StringDecoder` buffers the partial sequence, the real summary line survives intact,
and the last-match rule selects it. The attack no longer inverts the parse. This one is
genuinely closed.

## 9. Nothing weakened across `dcafcf8..eefc747`

| Check | Result |
| --- | --- |
| `skipped` / `todo` at head | `skipped 0`, `todo 0` |
| Test declarations removed in `f55b8ff..eefc747` | none (`git diff … \| grep '^-.*test('` → empty) |
| Test declarations added in the delta | 5 |
| Test files deleted anywhere in `dcafcf8..eefc747` | none (only `A` for `test-coverage-floor.test.mjs`, `M` in the delta) |
| `.github/` touched | no (`git diff --name-only dcafcf8..eefc747 -- .github` empty; directory exists) |
| `package-lock.json` touched | no |
| `package.json` touched in `f55b8ff..eefc747` | no |
| `{ skip: true }` / `t.skip()` / `only:` in `test-kits/` | none in code (one occurrence inside a comment at line 177) |
| Digests in the contract match head files | yes — `f22dd71e…0d93` and `523eb586…5d84` both match `shasum -a 256` |

No weakening found. The remediation is additive.

## Summary

Three of the six claimed closures were defeated, one has a material residual gap, one is
as weak as admitted plus an unguarded file, and one is genuinely closed.

| Claim | Status |
| --- | --- |
| 1 — assert on `pass`, reject skipped/todo | **NOT CLOSED** — skip class closed; `pass` is trivially inflatable (bodyless tests count) |
| 2 — `REQUIRED_TEST_NAMES` identity pinning | **DEFEATED** — trivial rename (A/C) and bare `console.log` (B) both give exit 0 |
| 3 — `GUARDED_SCRIPT_DIGESTS` tripwire | as-admitted weak **plus** `test-suite-contract.mjs` is itself undigested (D1, exit 0) |
| 4 — symlink rejection | holds inside the root; **out-of-root symlink import is not covered** (E4, exit 0) |
| 5 — `stripNonCode` | **DEFEATED** — template-literal phantom declarations inflate the count (I1); glob strings erase 11 real ones today (I3) |
| 6 — `setEncoding('utf8')` | **CLOSED** — chunk-boundary attack no longer inverts the parse |

The single most damaging finding: **naming a trivial test one of the `REQUIRED_TEST_NAMES`
satisfies the identity check, and so does a `console.log` of the strings.** The entire
"identity, not quantity" claim rests on `output.includes(name)` against a stream the tests
themselves write to. A repository whose complete test suite is 51 lines of
`test('<string>');` passes `npm run check` with exit 0.

VERDICT: test_failed
