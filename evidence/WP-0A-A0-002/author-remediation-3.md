# WP-0A-A0-002 — Author remediation round 5

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Reviewed commit: `f55b8ff`
Date: 2026-08-31

Author evidence only. Not review, security, test, integration, Product Owner, or
merge approval, and it does not move Gate G0.

## Verdicts on `f55b8ff`

| Role | Run | Verdict |
|---|---|---|
| Reviewer | `/claude/c0_contract_reviewer` | `changes_requested` |
| Security/Privacy | `/claude/a1_bastion` | `security_changes_requested` |
| Tester | `/claude/q0_sentinel` | `test_verified_with_conditions` |

**All three runs independently defeated the guard, and all three arrived at the same
root cause.** That convergence, reached without contact, is the strongest signal of
the night and it is the reason this round changes what the floor measures rather
than adding another check to it.

## The finding all three found: the floor was reading the wrong number

`ℹ tests N` is `pass + fail + skipped + todo`. The floor was asserted on it.

- Reviewer replaced **all 48 tests across all 9 files** with `{ skip: true }`
  placeholders whose bodies throw. `npm run check` exited `0` with
  `pass 0 / fail 0 / skipped 48`.
- Security built an 8-file, 44-test suite, every test skipped with a throwing body.
  The real guard and the real floor **both reported PASSED**.
- Tester found the same with six `{ skip: true }` tests, and noted it defeated the
  I3 directory floor and the I4 executed-count floor simultaneously.

`test.skip('a', fn)` was already caught (the `.` defeats the counting regex). It is
the **options-object form** that passed — a skipped test is counted by `tests N`
while executing nothing, which is precisely this package's own defect class,
reproduced inside the fix for it.

Fixed: `parseExecutedTests` now reads `pass`, and `assertNothingSkipped` fails the
run on any `skipped` or `todo` above zero. Skips must be removed, not tolerated.

## Counting cannot detect gutting, so the floor stopped counting

Tester replaced the contract suite with six trivial `test('x', () => {})` calls.
Every count-based floor stayed green, and no count-based floor ever could catch it:
six real tests and six trivial ones are indistinguishable by number.

`REQUIRED_TEST_NAMES` pins ten load-bearing test names that must appear in the
runner's own output (exit `84`). The guard stops asking *how many* and asks
**whether the things that must be checked are still being checked**. Renaming one is
a deliberate, reviewable edit to that list; deleting a suite is not.

## Every other finding

| ID | Finding | Fix | Exit |
|---|---|---|---|
| RH3 | `test(` inside block comments, line comments and template literals was counted | `stripNonCode` blanks those regions before counting | `82` |
| Sec-3 | `isFile()` is false for a symlink but `node --test` follows and **executes** it; Security's symlinked payload ran while the guard reported clean | any symlink under the test root fails the run | `85` |
| RH5 / Sec-2 | `output += chunk` on raw Buffers: a chunk split inside the 3-byte `ℹ` corrupts the summary and hands the parser an earlier forged match — Security demonstrated the planted `9999` being returned | `child.stdout.setEncoding('utf8')` | — |
| RH2 | the guard pins the command *string*; gutting `main()` to `return` while keeping the exports exited `0` with zero tests | `GUARDED_SCRIPT_DIGESTS` tripwire | `86` |
| RH10 | `MIN_EXECUTED_TESTS` was unpinned — lowering `40` → `1` passed everything, while the directory floor **was** pinned in the same commit | pinned by test | `1` |
| RH9 | `MIN_TEST_DIRECTORIES` was exported from the "single source of truth" and imported nowhere; `assertCoverage` hardcoded `2` | wired | `77` |
| RH4 | acceptance criterion still said 46 | corrected to the measured count | — |

### RH2 is mitigated, not closed — stated plainly

A build script is editable by anyone who can edit the build script. This cannot be
eliminated from inside a script that the same commit can change. The digest tripwire
does not claim otherwise: it makes such an edit **loud**, failing the run until the
digest is deliberately updated, which is a reviewable diff rather than a silent one.

This distinction matters because this Author has twice claimed a defect class
"closed" and been falsified both times. RH2 is recorded as mitigated.

## Full attack replay on pinned Node `24.20.0` / npm `11.19.0`

Every file restored from backup and verified after each injection.

| Attack | Exit | Control that fired |
|---|---|---|
| six `{ skip: true }` placeholders | **80** | `reported 6 skipped` |
| six trivial tests replace the suite | **84** | `does not contain 4 required test name(s)` |
| five tests hidden in a block comment | **82** | `declares 1 tests, below its floor` |
| symlink inside the test root | **85** | `symbolic link inside the test root` |
| gut the runner's `main()` to `return` | **86** | `guarded script(s) changed` |
| lower `MIN_EXECUTED_TESTS` 40 → 1 | **1** | `must not be lowered below 40` |
| `:` no-op prefix on the runner | **74** | `must be exactly` |
| drop the runner from `check` | **81** | `must invoke` |
| superseded glob | **74** | `must be exactly` |
| control | **0** | `pass 53 / fail 0 / skipped 0 / todo 0` |

**No attack reached exit 0.** `npm run check`: 48 → 53.

## An Author error worth recording

While preparing this round the Author ran `git checkout -- scripts/test-suite-contract.mjs`
to undo a test injection. That reverted the file to `HEAD`, discarding the round-5
work in it. It was rebuilt and re-verified. Restoration during attack replay must use
a copied backup, never `git checkout`, while the change under test is uncommitted.

## Handling of another run's evidence

`evidence/WP-0A-A0-002/review-security-head.md` tripped `scan:secrets` because the
Security run had quoted a literal AWS example access-key id while demonstrating the
scanner's weakness. The Author did **not** edit it. It was routed back to
`/claude/a1_bastion`, which redacted its own file, confirmed only one line actually
matched, kept every finding and its verdict byte-for-byte, and verified
`scan:secrets` exits `0`. This preserves the sole-writer property that gives a run's
evidence its value — the same principle that run raised about capability declarations.

## Not closed, and not closable by the Author

- **No independent evidence exists at this head.** Three `changes_requested` /
  `security_changes_requested` verdicts stand against `f55b8ff`. A fresh Reviewer,
  Security, and Tester pass is required.
- RFC-2026-003 remains `Proposed`.
- The `/root/r0_steward` countersignature and the WP-0A-CON-001 addendum remain
  outstanding.
- **Security C1 re-confirmed by fresh probe:** the secret scanner missed 8 of 8
  realistic credential formats in a `.env.production`, catching only the AKIA
  control. Pre-existing, out of scope, and it must be closed before any package
  handles permissioned data or a real credential.
- Security's CI note: what protects secrets today is that the workflow references
  **no** `secrets.*` at all — not `contents: read`. That holds only until someone
  adds one, and in-repo-branch PRs would receive it.
