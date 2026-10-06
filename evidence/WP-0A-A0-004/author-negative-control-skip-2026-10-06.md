# Author record: the negative control runs only when the database surface changed, and the checkout is asserted (WP-0A-A0-004, 2026-10-06)

Run: `/claude/a0_atlas` (Author), through a subagent of its workflow. Branch
`agent/claude/WP-0A-A0-004-ci-independent-guard-step`, reset from `origin/main` at `9b34be7`
(PR #189, the previous use of this branch name, is merged). This is a GOVERNANCE increment. It
changes `.github/workflows/ci.yml` and RFC-2026-007, so under RFC-2026-025 §5 item 6 the Owner
merges it personally. This file approves, verifies and merges nothing.

## 1. What the Owner said

A0 reported that CI takes about 22 minutes: `Negative control - each table family must be
detectable on its own` 12.4 min and `Validate repository bootstrap` 8.4 min. A0 recommended
option 1: run the negative control only when the pull request's diff touches the database
surface. A1 and Q0 must confirm that the skip cannot let a pull request that should be checked
slip through. The Owner's words, verbatim, in chat on 2026-10-06: `ได้ทำตามที่คุณแนะนำ` ("yes,
do as you recommend").

The same increment carries a fix that was owed on the same file: A1 F1 from PR #189
(`a1-security-reverify-2026-10-05.md` §4). The checkout uses `head_ref`, and no step asserted
HEAD == `pull_request.head.sha`.

## 2. Measured time, independent of the figure the Owner was given

Measured on main at `a5f6466`, run 37395796828 (push to main, success), from `gh run view
--json jobs`:

| Step | Duration |
|---|---|
| Validate repository bootstrap | 7 min 00 s |
| Database foundation | 37 s |
| Negative control | 10 min 18 s |
| Job | 18 min 30 s |

On a pull request that skips the control, the expected saving is the control's whole duration.
Nothing else changes.

## 3. The path set, measured

The control runs `make db-rls-smoke` against the database the previous step built. I walked the
Makefile's `DB := node scripts/db/run.mjs`, its static and dynamic imports, and every literal
repository path those modules name. I added the paths named in the run bodies of `Database
foundation` and of the control. The result:

- Modules: `scripts/db/run.mjs`, `rls-smoke.mjs`, `authz-proofs.mjs`, `psql-driver.mjs`,
  `sql-lexer.mjs`, `audit-producer-rule.mjs`, `tests/db/identity/run-isolation.mjs`,
  `isolation-cases.mjs`, `db/foundation/test-helpers/rls-assertions.mjs`.
- Data:
  - `db/foundation/ci/supabase-shim.sql`, `prerequisites.sql`, `migrations/` (whole
    directory), `invariants/` with `superseded.json`, `seeds/fixture-catalog.json`;
  - 13 of the 15 files in `db/foundation/lint/`;
  - `db/foundation/test-helpers/auth-context.sql`;
  - the 21 files in `tests/db/identity/fixtures/`.
- Configuration: `Makefile`, `.github/workflows/ci.yml`.

Every one of these is under `db/`, `scripts/db/`, `tests/db/`, `Makefile` or `.github/`. No
module the control loads imports anything outside `scripts/db/`, `tests/db/` or `db/`.

The `DB_SURFACE` in the workflow is that set plus a margin: `test-kits/db/` (the static
database suite, which the control does not read), `package.json`, `package-lock.json` and
`.node-version`:

```
^(db/|scripts/db/|tests/db/|test-kits/db/|\.github/|Makefile$|package\.json$|package-lock\.json$|\.node-version$)
```

The measurement is now a test, `every repository path the negative control can read is on
DB_SURFACE, measured from the code`, in `test-kits/branch-scope.test.mjs`. It recomputes the
closure on every `npm run check` and fails on any path outside the pattern. It also fails if
the walk stops reaching eleven files the control is known to read, so a broken walk cannot
pass by measuring nothing.

## 4. Mutations the new tests were run against

Each mutation was applied to `ci.yml` alone, the branch-scope suite was run, and the original
file was restored.

| Mutation | Result |
|---|---|
| Rename detection back on (`--no-renames` removed) | caught, 1 failing test |
| Condition changed to `skip == 'false'` | caught, 1 |
| A grep error treated as "no match" | caught, 1 |
| `tests/db/` removed from `DB_SURFACE` | caught, 2 |
| `Makefile` removed from `DB_SURFACE` | caught, 2 |
| A missing base writes `skip=true` | caught, 2 |
| Checkout assertion exits 0 on a mismatch | caught, 1 |
| `continue-on-error: true` on the decision step | caught, 1 |
| The `-z "${EXPECTED_SHA}"` clause removed | not caught: an equivalent mutant. An empty expectation still differs from any real HEAD, so the job fails either way. The clause stays for the reader. |

## 5. What is not done here

- The Owner's disposition of the amendment, and the confirmation by A1 and Q0 that the Owner
  made a condition. C0 review and R0 integration are owed as well.
- No CI run exists for the new steps yet. This pull request changes `.github/`, so its own run
  executes the control. A run that skips can only be observed on a later pull request that
  does not touch the surface.
- The residual risks are listed in RFC-2026-007 Amendment §E and in the manifest's
  `open_blockers`: the floating `postgres:17` tag and the runner's `psql`, inheriting a red
  base, and the closure being static.
