# RFC-2026-003 — Contract-test CI coverage and ownership boundary transfer

Status: Proposed — awaiting independent review, test, integration, and Product Owner disposition
Decision needed by: before any further shared-kernel contract package becomes Ready
Owner: A0 Architecture/Integration
Protocol version: `1.0.0`

## Problem

Two defects in the committed bootstrap block correct follow-on work.

### D1 — Contract tests are invisible to CI

`package.json` defines:

```
"test:bootstrap": "node --test test-kits/*.test.mjs"
```

The shell glob `test-kits/*.test.mjs` does not descend into `test-kits/contracts/`.
WP-0A-CON-001 delivered `test-kits/contracts/shared-kernel-contract-catalog.test.mjs`
and declared `node --test test-kits/contracts/*.test.mjs` as a package-evidence
command, but `npm run check` — the command CI runs and the command every role
cites as evidence — never executes it.

Observed on pinned Node `v24.20.0` / npm `11.19.0`:

| Command | Tests executed |
|---|---|
| `npm run check` | 26 |
| `node --test test-kits/contracts/*.test.mjs` | 6 |
| `node --test 'test-kits/**/*.test.mjs'` | 32 |

A regression in the shared-kernel contract catalog would therefore pass CI and
pass every `npm run check` citation in the WP-0A-CON-001 review, test, and
integration evidence.

**The gap was in the CI gate, not in role coverage.** Independent review of the
WP-0A-CON-001 evidence establishes that all four independent roles — reviewer,
security, tester, and integration — each separately ran
`node --test test-kits/contracts/*.test.mjs` at `f28fb8e` and each recorded
`6/6` passing. Their conclusions therefore stand and WP-0A-CON-001's
`integration_verified` status is not invalidated by this defect. What is stale is
a number, not a judgement: five artifacts cite "26 tests" for a command that has
since changed. Independent security review further confirmed that no regression
was realized during the window — `git diff f28fb8e HEAD -- contract-catalog/
test-kits/contracts/` is empty, so not one byte of the reviewed artifacts
drifted while the CI gate was blind.

The remedy is correspondingly bounded: a `npm run check` re-execution addendum
recorded by the WP-0A-CON-001 Integration Owner `/root/r0_steward`, superseding
the `26/26` citation with the current count. No re-review, re-test, or re-
integration of WP-0A-CON-001 is required.

### D2 — Package writable globs capture future outputs

`scripts/validate-work-package-ownership.mjs` rejects (exit `70`) any manifest
whose `writable_paths` capture another package's declared output. Two committed
globs make every planned follow-on package unrepresentable:

- WP-0A-CON-001 declares `contract-catalog/shared-kernel/**` and
  `test-kits/contracts/**`. Any later contract package materializing a Draft
  shared-kernel contract collides.
- WP-0A-A0-001 declares `package.json`, which D1 must modify.

This is the ownership validator behaving as designed. The fix is an explicit,
recorded boundary transfer, not a validator change and not a silent cross-package
write.

## Decision

1. **Fix the test glob.** `test:bootstrap` becomes
   `node --test 'test-kits/**/*.test.mjs'`. The pattern is quoted so the Node
   test runner expands it, not the invoking shell; this keeps the command
   identical under `sh`, `zsh`, and the CI runner, and it picks up future
   `test-kits/<area>/` suites without another root-config change.
2. **Transfer `package.json` ownership** from WP-0A-A0-001 to WP-0A-A0-002 for
   this forward fix. WP-0A-A0-001 remains `integration_verified` for the scope it
   delivered; its manifest is amended only to drop `package.json` from
   `writable_paths` and `outputs.files`.
3. **Narrow WP-0A-CON-001 ownership.** Remove **three** writable globs —
   `contract-catalog/shared-kernel/**`, `test-kits/contracts/**`, and the unused
   `fixtures/contracts/**` (no `fixtures/` directory exists in the repository and
   no WP-0A-CON-001 output lives under it) — replacing them with the exact paths
   that package delivered: `contract-catalog/shared-kernel/index.json`, the four
   Candidate contract directories, and
   `test-kits/contracts/shared-kernel-contract-catalog.test.mjs`.
   Its declared outputs are unchanged and remain covered.
4. **Take the shell out of the loop and assert execution.** The test pattern
   moves into `scripts/test-suite-contract.mjs` and is handed to node's test
   runner as an **argv string by `scripts/run-test-suite.mjs`**, so it never
   reaches a shell: shell quoting, `globstar` support, and `script-shell` can no
   longer change what runs. Two independent layers then guarantee that a green
   run executed the suite:
   - **Before the run**, `scripts/verify-test-coverage-floor.mjs` pins
     `test:bootstrap` to exactly the runner command, verifies that `check`
     actually invokes both the guard and the runner in that order, and checks
     discovery against the declared pattern, the file floor, the directory floor,
     and a declared-test floor.
   - **After the run**, `scripts/run-test-suite.mjs` reads the executed-test count
     the runner itself reported and fails when it is below the floor, closing the
     case where `node --test` exits `0` reporting `tests 0`.

   See "Why the glob fix alone is not sufficient" below.
5. **No status, contract, or gate movement.** No contract advances from
   Draft/Candidate. No package status changes. Gate G0 remains
   Specification Baseline Complete / External Verification Pending.

### Which amendments are forced and which are anticipatory

The two amendments do not carry the same necessity, and the Product Owner should
dispose of them with that difference in view:

| Amendment | Necessity | Evidence |
|---|---|---|
| WP-0A-A0-001 drops `package.json` from `writable_paths` and `outputs.files` | **Forced today.** Without it the repository does not validate at all. | `validate-work-package-ownership.mjs` exits `70` (`WP-0A-A0-001 writable path overlaps WP-0A-A0-002 output: package.json`) while both hold it. Independently reproduced by the Tester against a reconstructed pre-amendment manifest set. |
| WP-0A-CON-001 drops its three broad globs | **Anticipatory.** The repository validates with them restored. | The globs bite only once a follow-on package declares outputs under those paths; the Reviewer confirmed this with a synthetic WP-0A-CON-002. They foreclose a collision that every planned shared-kernel contract package would otherwise hit. |

## Why the glob fix alone is not sufficient

`node --test` exits `0` reporting `tests 0` when its pattern matches nothing.
The corrected command therefore still reproduces the exact silent-green failure
class this RFC exists to close, under any condition that stops the pattern from
expanding: a relocation or rename of `test-kits/`, an accidental re-edit of the
line, or a `script-shell` that does not strip the single quotes (Windows
`cmd.exe` is the obvious case). Independent review and independent testing each
found this separately.

Decision 4 closes it. Verified by deliberate regression on the pinned toolchain:

| Injected regression | `npm run check` before the guard | `npm run check` with the guard |
|---|---|---|
| `test:bootstrap` reverted to `node --test 'test-kits/*.test.mjs'` | exit `0`, 26 tests, contract tests silently skipped | exit `76`, naming `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` as the file that would never run |
| `test:bootstrap` pattern left unquoted | exit `0` under `sh` with only 6 of 40 tests | exit `74` |
| `test-kits/` emptied below the file floor | exit `0`, `tests 0` | exit `75` |
| a pattern matching no discovered file | exit `0`, `tests 0` | exit `76` |
| `test:bootstrap` wrapped so the runner never executes (`: node --test ...`, `... || true`) | exit `0`, `tests 0` | exit `74` |
| a bare `**` inside a segment (`test-kits/**.test.mjs`) | exit `0`, 34 of 40 tests | exit `76` |
| discovered files declaring no test at all | exit `0`, `tests 0` | exit `78` |
| `test-kits/` renamed or deleted | exit `0`, `tests 0` | exit `79` |

The quoting is load-bearing and was verified, not assumed: `npm config get
script-shell` is `null`, so npm uses `/bin/sh`, which has no `globstar`. Unquoted
under `/bin/sh` the pattern degrades to `test-kits/*/*.test.mjs` and runs 6 tests
instead of 40 while still exiting `0`.

## Why this is a manifest amendment and not a rewrite

`CONTRIBUTING_AGENTS.md` protects root configuration and requires protected
changes to run through the Integration Owner/RFC path; it forbids rewriting an
*integrated migration*, not correcting a declared ownership boundary. Both
amendments are additive-safe: they only remove capture of paths the amended
package never wrote, and both packages' declared outputs stay covered by their
remaining writable paths. `npm run check` re-validates ownership, role
separation, and capability references after the amendment.

## Scope explicitly excluded

Production schema, migrations, provider SDKs, credentials, customer data,
network calls, contract freeze-level advancement, package status advancement,
Gate G0 approval, native branch protection, and any merge authorization.

## Verification

- `npm run check` on pinned Node `24.20.0` / npm `11.19.0` — must report 46 tests.
- `node scripts/verify-test-coverage-floor.mjs` — exit `0`; and exit `74`/`75`/`76`/`77`/`78`/`79`/`81`
  against the injected regressions tabulated above.
- `node scripts/run-test-suite.mjs` — exit `0`; exit `80` when the executed count is below the floor.
- `node scripts/validate-work-package-ownership.mjs work-packages` — exit `0`.
- `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-002.json` — exit `0`.
- `node scripts/validate-capability-profiles.mjs` — exit `0`.
- `node scripts/scan-repository-secrets.mjs` — exit `0`.

## Rollback

Revert the RFC, `package.json`, manifest, capability-profile, evidence, and
handoff changes through a reviewed revert PR. The change creates no persisted
data, provider state, credential, migration, or customer-data effect. Reverting
restores the previous glob and the previous ownership boundaries exactly.

## Limitations

This RFC does not approve Gate G0, does not authorize a merge, does not grant
native protected CI, and does not substitute for the independent Reviewer,
Tester, Security, or Integration Owner evidence that RFC-2026-002 requires for
every proposed merge into `main`.
