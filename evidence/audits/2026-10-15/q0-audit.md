# Q0 round audit, 2026-10-15: `main` from `8086281b` (exclusive) to `2aef8182` (inclusive), merges #252–#261

- **Role:** Q0, independent Tester (`/claude/q0_sentinel`). First round audit under RFC-2026-034 §2.3 (§8 item 1).
- **Range:** `8086281b..2aef8182` on `main` (first parent), merges of PR #252 to #261. Fixed at `2aef8182` [measured:
  `git log --first-parent --oneline 8086281b..2aef8182`; `origin/main` = `2aef8182` after `git fetch -q origin`].
- **Reading time:** 2026-10-15 00:23:12Z to 00:37Z UTC [measured: `date -u`].
- **Brief:** `.claude/ntf-session/brief-audit-1015.md`.
- **Verdicts:** `test_verified` for each risk-lane PR in range: **#253, #254, #261**. No fast-lane PR is in range.
  On `2aef8182`: the full suite passes 827 of 827 under the suite lock; `npm run typecheck`, `npm run test:app` (224 of
  224) and `verify-app-boundaries --require-parser` exit 0; `regenerate:manifest` and `record:verification` leave no
  diff; CI on `main` at `2aef8182` is green on both required jobs.
- **Stop-the-line:** no. **Security finding:** none raised by Q0 (A1 grades whether Q0-AUD1015-1 is one).
- **Findings:** Q0-AUD1015-1 (Low), -2 (Low), -3 (Info), -4 (Low, carried), -5 (Low, carried), -6 (Info), -7 (Info).
  None blocks the verdicts above; -1 and -2 are owed tests on the risk-lane code of #261.

## 0. Who I am

`/claude/q0_sentinel`, a Claude Code subagent (Anthropic, `claude-opus-5-5`) spawned by A0 (`/claude/a0_atlas`), who
authored the PRs audited here; C0, A1 and R0 come from the same lineage, the same-lineage reading the Product Owner
accepted with disclosure. I disclose it and do not claim it is cured. I audit only: I fixed, pushed and merged nothing,
and write no other role's verdict. I did not read the other auditors' files. One worktree,
`.claude/ntf-session/q0-aud1015`, checked out `main` with `git worktree add -f` to measure on the branch name, then this
branch `q0/audit-2026-10-15` cut from `2aef8182` for this file alone; `node_modules` from `npm ci --ignore-scripts`,
removed with the worktree. Every mutation was restored (`git status --porcelain` empty after each batch).

## 1. Commands on `2aef8182` [measured: scratchpad `suite.log`, `typecheck.log`, `testapp.log`, `bound.log`]

On branch `main` at `2aef8182`, node v24.20.0, npm 11.19.0.

| Command | Result |
|---|---|
| `npm run check` (under `$P/suite.lock`, acquired 00:23:53Z, exit at 00:28:32Z) | exit 0; tests 827, pass 827, fail/cancelled/skipped/todo 0 |
| `npm run regenerate:manifest`, then `git diff --exit-code` | exit 0, no diff |
| `npm run record:verification`, then `git diff --exit-code` | exit 0 ("recorded 827 passing, 0 skipped, 0 todo"), no diff |
| `npm run typecheck` | exit 0 |
| `npm run test:app` | exit 0; 6 files, 224 of 224 |
| `node scripts/verify-app-boundaries.mjs --require-parser` | exit 0 (24 source files; 54 controls held first) |

Not run locally: the `Database foundation` step (it needs CI's Postgres service container) and the web build with
`verify-app-build-graph`; both are CI's (§2).

## 2. CI on `main` at `2aef8182` [measured: `gh run view 38567631406 --json jobs` and `--log`]

Run 38567631406 (`push`, `main`, head `2aef8182`): `bootstrap` success (both validations 827/827; `Database foundation`
and the negative control success), `application` success (dependencies, boundaries parsed, type-check and its negative
control, **Application tests** 6 files 224 passed, boundaries again, build, build-graph check, vulnerability audit).
`main`'s required checks are `bootstrap` and `application`, `strict: true` [measured: `gh api
.../branches/main/protection/required_status_checks`]. Every `main` push run in the range (`928afae9` … `2aef8182`)
concluded success [measured: `gh run list --branch main`].

## 3. Every merged PR: tier, lane, press, readers, CI

Classifier: the **base's** copies of `scripts/db/classify-review-tier.mjs` and `classify-records-only.mjs`, read with
`git show <base>:…` into a scratch directory, run as CI runs them (`<base> <head> --lane --head-ref=… --repo=…
--head-repo=…`) [measured: scratchpad `cls/<n>/out`]. Bases #252–#255 hold a classifier without `--lane` (exit 2, as
CI's step says); for those the tier is the base copy without `--lane`, and the lane "would have printed" is the first
lane-capable copy (`3070d888`, #255's merge). "CI printed" is the `review tier and lane:` line of the PR head's run.

| PR | Base → final head | Tier (base copy) | Lane CI printed / would have printed | Lane right? | Last role readings → final head | CI on final head |
|---|---|---|---|---|---|---|
| #252 | `8086281b`→`a0c0f4ed` | records | (records) | yes | C0 light-path reading at `22e852ca` (blocking C0-252-1), re-read at `1c9a861a` passes; then C0's file `376ff83a`, handoff `a0c0f4ed` last and alone | 38115911976 success, 740/740 |
| #253 | `928afae9`→`40d674d6` | H (`amended_by` changed shape) | (risk) | yes | A1, Q0 at `c2a2b499`; then their files (`-x`, blob-equal), mechanical merge of main `454ed1d0` (tree = `git merge-tree` result; #252's paths are records, no guard), handoff | 38117607761 success, 740/740 |
| #254 | `21ca7592`→`7f9b4be1` | H (`amended_by` entries added) | (risk) | yes | A1, Q0 at `6e4f92ee`; then files (`-x`), mechanical merge `c5d75013` (no guard path), handoff | 38118860882 success, 740/740 |
| #255 | `9fcc458c`→`5a17e0a4` | H (CI) | governance (not classified: base exit 2) / governance | yes | C0, A1, Q0, R0 fourth re-read at `b3e430e0`; then four files (`-x`), handoff | 38162633761 success, 764/764 |
| #256 | `3070d888`→`309a93c8` | H | governance | yes | four roles at `a0a76a8b`; files, handoff | 38172695119 success, 764/764 |
| #257 | `8c9a32ba`→`bef3249e` | H | governance | yes | four roles at `f23dbba2` (re-read five); files, handoff | 38269234433 success both jobs, 821/821 |
| #258 | `40267ae9`→`f0bcb870` | H ("not records-only") | governance | yes (see Q0-AUD1015-6) | four roles at `6362ba68`; files, handoff | 38307173517 success both jobs, 821/821 |
| #259 | `5d8f8fd4`→`f723662b` | H | governance | yes | four roles at `9dc4e813`; files, handoff | 38539239403 success both jobs, 821/821 |
| #260 | `e69fc87b`→`fc60f82d` | H | governance | yes | four roles at `3d588bf6`; files, handoff | 38552329070 success both jobs, 827/827 |
| #261 | `6af75480`→`1c34880d` | H | risk | yes | four roles at `90eb8a77` (A1, Q0 the lane's readers); files, handoff | 38564806352 success both jobs, 827/827 + 224 |

- **Lanes.** My local runs print exactly what CI printed for #255–#261, and the lane is right for every PR: no lane
  error. #261 adds no guard, registry or governance path (16 `src/modules/platform-kernel/**` files, evidence, its
  handoff and manifest), so no additive-guard confirmation was needed. #253 and #254 change only evidence, handoffs and
  their manifest, are tier H and not records-only (§6.1 item 4: `amended_by` entries added or reshaped), so risk.
- **A0's reading, checked.** I agree with risk for #253, #254, #261 and governance for #255, #256, #257, #259, #260,
  and records for #252. I do **not** agree that #258 is records: Q0-AUD1015-6.
- **Every merge** is a true merge whose first parent is the previous `main` and second the final head; every final head
  contains its base; every PR was opened after RFC-2026-034 took effect (#251 merged 04:12:28Z; #252 opened 04:53:19Z),
  so §2.4's "opened before" clause reaches none [measured: `git rev-parse <merge>^1 ^2`, `git merge-base --is-ancestor`,
  `gh pr view --json createdAt`].
- **Carries.** All 80 cherry-picked commits in the range carry `(cherry picked from commit …)` and are blob-equal to
  their source commits, with the same path list [measured by script over `git rev-list --no-merges 8086281b..2aef8182`].
  The one role-file commit without `-x` is `376ff83a` (C0's light-path file for #252), whose parent is the head C0
  re-read; that is RFC-2026-025 §6.2's "committed by the reader run", which C0 and R0 judge.
- **Who pressed, under what authority.** `gh` shows `workstationgroup`, the repository account, for all ten, which
  does not show who acted. What the repository records: #257 by A0 under the 2026-10-12 skeleton disposition §3 (c)
  and §7.1; #258 by A0 at 21:06:31Z under the Owner's 20:28:22Z answer (`product-owner-disposition-2026-10-13-lane-walk-ts.md`
  item 2, before the press; #258 existed from 20:24:05Z); #259 under `product-owner-disposition-2026-10-13-package-tool-config-press.md`
  (a); #260 under the lane-walk disposition item 2; #256 to be merged by the Owner personally
  (`product-owner-disposition-2026-10-12-rfc-029-approval.md` (c)). For #252–#255 and #261 the authorities exist
  (RFC-2026-025 §6.2 item 3; RFC-2026-034 Q-034-1; Q-034-6 (i) for #255, §8 item 2), but the press itself is recorded
  only in A0's local session handoff, not on `main`: Q0-AUD1015-7. Readers passed on each final head (by carry) with
  green required CI in every case.

## 4. Coverage of the risk-lane code (#261, `src/modules/platform-kernel/**`)

**Line coverage** [measured: `NODE_V8_COVERAGE` over `vitest run --pool=threads`, mapped through each module's Vite SSR
transform and source map; scratchpad `covmap.cjs`, `coverage-report.txt`]: of the 11 non-test files, `ports.ts` is
types only (never loaded); `fakes.ts`, `json-shape.ts`, `platform-errors.ts`, `private-reference.ts` have no unexecuted
code; the rest have unexecuted code on 10 source lines in all: `application/tenant-context.ts` 83, 84, 160;
`application/envelope.ts` 48, 73; `domain/envelope.ts` 79; `domain/idempotency.ts` 68; `domain/stable-error.ts` 121;
`domain/tenant-context.ts` 83, 84.

**Mutation of exactly those lines** [measured: scratchpad `mutate.py`, `mutations.out`; each mutant runs the whole
`vitest run`; a control mutant (dropping `if (hasPage && !hasBusiness) return invalid;`) is killed, so the harness
detects failures]:

| Id | Mutation | Result |
|---|---|---|
| P1 | drop `if (hasBusiness && typeof business !== 'string') return invalid;` | **survived** |
| P2 | drop `if (hasPage && typeof page !== 'string') return invalid;` | **survived** |
| P4 / P4b | `scopeOf` drops `business_profile_id` / `page_context_profile_id` | **survived** / **survived** |
| P3 | `definitionOf` drops `retryAfterSeconds` | **survived** |
| P5 | `acceptedEnvelope` drops `deep_link_ref` from the receipt copy | **survived** |
| P6 / P7 | `checkEnvelope` / `checkIdempotencyRecord` without `if (!isObject(value)) return false;` | survived / survived |
| P8 / P9 | the post-condition throws in `checked()` and the resolver removed | survived / survived (unreachable by construction) |

Every other line of the module is executed by the 224 tests, and round two's 33 mutations and the 800,000-case fuzz
(`q0-reread-2026-10-14-pr261.md`) stand. The live code at P1–P5 is correct by reading; what is missing is a test.

## 5. Findings

- **Q0-AUD1015-1 (Low, test gap on the tenant scope).** P1, P2: a selection whose `business_profile_id` (or
  `page_context_profile_id`) is present but not a string is refused today, but deleting the check fails no test; the
  resolver would then build a scope without that id (the spread keeps a string only), so the request would be resolved
  at the wider workspace (or business) scope instead of `tenant.selection.invalid`. P4, P4b: no test builds an envelope,
  or calls `tenantContextRecordOf`, from a business- or page-scoped context, so `scopeOf` could drop either id and every
  response envelope would echo a narrower tenant context than the one resolved, with every test green. Owed: a
  selection test with a non-string business id and one with a non-string page id (expect `tenant.selection.invalid`), and
  an envelope test from a page-scoped context asserting `tenant_context.business_profile_id` and
  `page_context_profile_id`. No route from outside is shown; A1 grades whether it is a security finding.
- **Q0-AUD1015-2 (Low, test gap).** P3: an error re-issued through `errorEnvelope` with `retry_after_seconds` loses it
  if `definitionOf` drops the key, and no test notices. P5: `deep_link_ref` in an accepted receipt is never exercised.
  Owed: one test each.
- **Q0-AUD1015-3 (Info).** P6, P7: no test hands `checkEnvelope` or `checkIdempotencyRecord` a non-object (null, a
  string, an array), so a regression that throws instead of answering `false` would pass. P8, P9 are defensive
  post-conditions no valid path reaches; recorded, nothing owed.
- **Q0-AUD1015-4 (Low, carried: Q0-257r6-1 still open at `2aef8182`).** Owed after #257 (`WP-1A-A0-002`
  `open_blockers`) and not delivered in the range. Re-measured: with `runBuildControls` returning `[]` before any
  control runs (G200), `node --test test-kits/app-stack.test.mjs` passes, 0 failed; the test asserts the result is `[]`,
  which a hollowed runner also returns. (b) and (c) are untouched since #257 [measured: `git log` on
  `scripts/verify-app-build-graph.mjs`, `scripts/verify-app-boundaries.mjs`, `test-kits/app-stack.test.mjs`].
- **Q0-AUD1015-5 (Low, carried: Q0-259-1 still open, now with code behind it).** With `"src/**/*.ts", "src/**/*.tsx"`
  removed from `tsconfig.json` and the manifest regenerated: `app-stack`, `app-boundaries`, `repository-json` and
  `app-dependencies` tests pass 65 of 65; `typecheck`, `verify-typecheck-control`, `verify-app-boundaries
  --require-parser` and `verify-test-coverage-floor` exit 0; and `tsc --listFiles` checks **0** of the 16
  `src/modules/` files (16 at `2aef8182`). Since #261, dropping the pattern silently ends type-checking of the tenant
  code. Owed as recorded: a pin in `test-kits/app-stack.test.mjs` (governance; the Owner or a direction covering it
  presses).
- **Q0-AUD1015-6 (Info, A0's lane list).** The brief lists #258 as records. The base's classifier printed `tier: H`
  ("only evidence, handoff or manifest paths, and not records-only under RFC-2026-025 §6.1") and `lane: governance`,
  in CI and locally, and #258 was read by all four roles and pressed under a governance direction, which is what its
  lane needed. It could not be records in any case: it adds role-review files and appends to an Owner disposition,
  neither of which §6.1 item 2 admits. No lane error; the label should read governance.
- **Q0-AUD1015-7 (Info, records).** Who pressed #252, #253, #254, #255, #256, #259, #260 and #261, and the words each
  press relied on, are not recorded on `main` at `2aef8182` (they are in A0's local `.claude/session-handoff-2026-10-11.md`
  §3.1–§3.1d only); `gh` cannot show it. The owed post-merge records PRs should carry them. R0 judges what is owed.

Carried and still open, not re-measured: Q0-261-5 (Low), Q0-261-6 and -7 (Info).

## 6. What this audit does and does not cover

It covers the tests and CI of the cumulative diff `8086281b..2aef8182` and the Q0 verdict on its risk-lane PRs (#253,
#254, #261). Governance PRs (#255–#257, #259, #260) and #258 were read by Q0 on their final heads before merge and are
not re-verdicted here; #252 is records. It does not cover WP-1A-A0-003's last acceptance criterion: that package stays
short of `integration_verified` until the provider-bound increment, which is R0's call. It does not judge records,
Owner quotes, or security grades (C0, R0, A1).
