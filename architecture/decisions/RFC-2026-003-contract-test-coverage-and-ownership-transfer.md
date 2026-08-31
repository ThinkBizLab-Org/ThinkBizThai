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
integration evidence. Those citations were accurate about the command they ran;
they were not evidence of contract-test coverage.

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
3. **Narrow WP-0A-CON-001 ownership** from `contract-catalog/shared-kernel/**`
   and `test-kits/contracts/**` to the exact paths that package delivered:
   `contract-catalog/shared-kernel/index.json`, the four Candidate contract
   directories, and
   `test-kits/contracts/shared-kernel-contract-catalog.test.mjs`.
   Its declared outputs are unchanged and remain covered.
4. **No status, contract, or gate movement.** No contract advances from
   Draft/Candidate. No package status changes. Gate G0 remains
   Specification Baseline Complete / External Verification Pending.

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

- `npm run check` on pinned Node `24.20.0` / npm `11.19.0` — must report 32 tests.
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
