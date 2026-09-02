# WP-0A-A0-002 — Author self-check

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Base revision: `dcafcf8`
Branch: `agent/claude/WP-0A-A0-002-contract-test-coverage`
Date: 2026-08-31

This is Author self-evidence only. It is not review, security, test, integration,
Product Owner, or merge approval, and it does not move Gate G0.

## Defect reproduction, before the fix

Executed on the pinned toolchain (`node v24.20.0`, `npm 11.19.0`, resolved from
`/Users/bank/.local/node-v24.20.0/bin/node` via a login shell):

| Command | Result |
|---|---|
| `npm run check` | exit `0`, `tests 32 / pass 32` **after** the fix; `tests 26 / pass 26` **before** it |
| `node --test test-kits/contracts/*.test.mjs` | exit `0`, `tests 6 / pass 6` |
| `node --test 'test-kits/**/*.test.mjs'` | exit `0`, `tests 32 / pass 32` |

26 + 6 = 32. Before this change the six WP-0A-CON-001 contract tests were
executed by no command in `npm run check` and therefore by no CI run. The
WP-0A-CON-001 review, test, and integration evidence each cite `npm run check`
and "26 tests"; those citations were accurate about the command executed and
were not evidence that the contract catalog was covered.

## Candidate rejected

`node --test test-kits/` fails on Node 24.20.0 with `MODULE_NOT_FOUND`
(`Error: Cannot find module '/Users/bank/ThinkBizThai/test-kits'`); the runner
resolves a bare directory argument as a module rather than as a search root. The
adopted form quotes the pattern so the Node test runner expands it, which keeps
the command identical under `sh`, `zsh`, and the CI runner instead of depending
on shell globstar support.

## Ownership boundary transfer

`node scripts/validate-work-package-ownership.mjs` exits `70` when one package's
`writable_paths` capture another package's declared output. Before this change:

- `WP-0A-CON-001` held `contract-catalog/shared-kernel/**` and
  `test-kits/contracts/**`, which capture the outputs of every planned follow-on
  shared-kernel contract package.
- `WP-0A-A0-001` held `package.json`, which this forward fix must modify.

Both were narrowed to the exact paths those packages delivered. Verified after
the amendment that every declared output of both packages is still covered by
their remaining `writable_paths` (the ownership validator enforces this and
exits `0`).

## Commands run and exit codes

| Command | Exit | Output |
|---|---|---|
| `npm run check` | `0` | `tests 32 / pass 32 / fail 0` |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-002.json` | `0` | no output |
| `node scripts/validate-capability-profiles.mjs` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output |

## Author-declared limitations

- This run authored the change. Under `CONTRIBUTING_AGENTS.md` separation of
  duties it must not review, security-review, test-verify, or integrate it, and
  it holds no Product Owner or merge authority.
- `work-packages/WP-0A-A0-001.json` and `work-packages/WP-0A-CON-001.json` are
  owned by other packages. They were amended under the RFC-2026-003 decision
  path and the exact permitted removals are declared in this package's
  `ownership.authorized_cross_package_amendments`. The Integration Owner must
  rule on whether that path is sufficient or whether each owning package must
  re-open to accept its own amendment.
- The corrected command changes what CI executes. The Integration Owner must
  record whether WP-0A-CON-001 review/test/integration evidence has to be
  re-executed against the corrected 32-test command.
- No contract status, no other package status, no schema, provider, credential,
  or gate state was changed. `package-lock.json` was not modified.
