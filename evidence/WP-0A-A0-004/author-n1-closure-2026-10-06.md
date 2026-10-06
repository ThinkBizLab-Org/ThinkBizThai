# WP-0A-A0-004 — Author closure of A1 N1 and R0-F6 on PR #197 (2026-10-06)

Author: A0 (`/claude/a0_atlas`). Head before this commit: `1552a9c`. Executed under the Owner's
delegation `เอาตามที่คุณแนะนำทุกอย่าง` ("do everything as you recommend"), to close R0 D3 (no
security finding stays open) as the roles worded it. A0 executes; it does not decide, approve, test-verify
or merge. The four role re-check commits (`94897e05`, `6f0c3dda`, `be8ffa7d`, `1bb4f69d`) were
already on the branch; nothing was cherry-picked.

## 1. A1 N1 (LOW) — `base.ref == 'main'` is case-insensitive

Source: `a1-ci-recheck-2026-10-06.md` §4 N1. GitHub Actions compares `if:` strings ignoring case,
so the decision step's `if:` is also true for a pull request into `MAIN` or `Main`.

Done, as A1 worded the fix:

- `.github/workflows/ci.yml`: the `if:` is unchanged. The decision step gains
  `BASE_REF: ${{ github.event.pull_request.base.ref }}` in its `env:`, and its script's first test is
  the case-sensitive one, in bash:

  ```
  if [ "${BASE_REF:-}" != main ]; then
    echo "negative control: the base branch '${BASE_REF:-}' is not exactly main; the control RUNS"
    exit 0
  fi
  ```

  It runs before any path can write `skip=true`, and it exits 0, so it runs the control rather than
  failing the job.
- `test-kits/branch-scope.test.mjs`: new test `a base that is not exactly main runs the negative
  control, whatever its case (A1 N1 on PR #197)`. It cuts the step out of `ci.yml`, pins the
  `BASE_REF` env line and the four guard lines as the body's first, and runs the body on one pull
  request that changes nothing on the surface: `MAIN`, `Main`, `mAiN`, `main2`, `main `,
  `refs/heads/main`, empty and unset all RUN; `main` SKIPS. The existing decision-step tests now pass
  `BASE_REF: 'main'`, so each still measures the branch it names rather than passing on the guard.
- Mutation: with the guard replaced by `if false; then`, the new test fails (1 of 1).
- `architecture/decisions/RFC-2026-007-ci-independent-guard-step.md` Amendment: §A.1 notes the
  `if:` is case-insensitive; §B adds the fail-closed case and quotes the four lines byte for byte;
  §D lists the new test.
- `scripts/test-suite-contract.mjs` (`amends_without_owning`): branch-scope floors 20 → 21 tests,
  102 → 112 assertions, name digest `e7aefe49e52ded15` → `c89691d0316299fb`.
  `test-kits/integrity-manifest.json` regenerated. `evidence/VERIFICATION.md` re-recorded (702 → 703).

## 2. R0-F6 — `open_blockers[8]` wording

`work-packages/WP-0A-A0-004.json` `open_blockers[8]` read "(governance PR, Draft)"; PR #197 is out
of Draft. It now reads "(PR #197, governance; Ready for review, not Draft)", the wording the handoff
already uses. The `amends_without_owning.rationale` records the floor change above.

## 3. Measured

Branch name `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, Node `v24.20.0`, npm `11.19.0`.

| Command | Exit | Result |
|---|---|---|
| `node --test test-kits/branch-scope.test.mjs` | 0 | 21 tests, 21 pass |
| same, guard mutated to `if false` (name pattern `not exactly main`) | 1 | 0 pass, 1 fail; restored |
| `npm run regenerate:manifest` | 0 | rebuilt 91 digests |
| `npm run record:verification` | 0 | 703 passing, 0 skipped, 0 todo |
| `npm run check` | see commit | recorded by `scripts/commit-when-clean.mjs` |

## 4. Still owed (not done here)

- The changed files are on the role's own surface (`ci.yml`, the RFC, the suite), so whether C0, A1,
  Q0 and R0 re-check this commit is the Integration Owner's call.
- `npm run refresh:handoff` as the last commit, alone; until then `check:handoff` is expected red.
- Green `bootstrap` on the final head, and the Owner's merge under RFC-2026-025 §5 item 6.
