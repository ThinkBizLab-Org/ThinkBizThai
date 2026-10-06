# WP-0A-A0-002 — Independent Test Re-verification at PR #192

- **agent_run_id:** `/claude/q0_sentinel`
- **Role:** Independent Tester
- **Subject:** https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/192, branch
  `agent/claude/WP-0A-A0-002-contract-test-coverage`, head `6cff65c5de775d997da5734f7afc274805777494`
  (base `origin/main` `8c089cc`)
- **Earlier verdict of this role:** `test_failed` at `c631c07` (`test-verdict-round7.md`)
- **Date:** 2026-10-06 (file name keeps the dispatch date 2026-10-05)

This is independent Tester evidence only. It is not a review, security, integration or Product Owner
verdict, it does not advance the package's status, and it does not move Gate G0. Nothing was fixed.

## §0 What I am

I am a subagent of `/claude/a0_atlas`, the run that authored this package's work and this PR, so I share
its vendor and model family. RFC-2026-024 puts that shared origin on record, and the Owner's step 2
(`prefer_cross_vendor_review: false` on this manifest) applies it here. This re-verification is **not**
the independent human sign-off a gate requires; whether a role run counts as the role's signature is for
the Integration Owner and the Product Owner to decide. Each item says whether I **measured** it (I ran
it) or **read** it (I read it in the tree).

## §1 Method and containment

- Toolchain (measured): Node `v24.20.0`, npm `11.19.0`, from `/Users/bank/.local/node-v24.20.0/bin`.
- **Branch-reading guards ran in a private clone on the branch NAME**, never detached:
  `…/scratchpad/q0-WP-0A-A0-002/clone`, `git checkout -B agent/claude/WP-0A-A0-002-contract-test-coverage 6cff65c5`,
  `origin` pointed at GitHub, `origin/main` = `8c089cc`, `origin/HEAD` set to `origin/main`.
  The clone's tree was clean after every run.
- **Attacks ran in `git archive 6cff65c5` copies** under the same scratchpad (`pristine/`, copied fresh to
  `work/` or `work-e4/` per attack). No tracked file in any repository checkout was modified. No database
  was started; no port was used.
- Digests were rebuilt with the repository's own `node scripts/regenerate-integrity-manifest.mjs` wherever
  an attack needed them: that is the disclosed digest class, and measuring it is how its reach is known.

## §2 Declared tests at the head (measured, private clone on the branch name)

| Command (manifest `deterministic_commands`) | Exit |
|---|---:|
| `npm run check` | **0** — `tests 692, pass 692, fail 0, cancelled 0, skipped 0, todo 0` |
| `node scripts/verify-test-coverage-floor.mjs` | 0 |
| `node scripts/validate-work-package-ownership.mjs work-packages` | 0 |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-A0-002.json` | 0 |
| `node scripts/validate-capability-profiles.mjs` | 0 |
| `node scripts/scan-repository-secrets.mjs` | 0 (not cited as secret-coverage assurance; A1 C1 / `open_blockers[5]`) |
| `npm run check:handoff` | 0 — "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-A0-002` | 0 — "all 3 changed path(s) are declared" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-002-contract-test-coverage` | 0 |

`check:handoff` first returned 91 because my clone's `origin/HEAD` pointed at the branch itself (an
artifact of cloning from a worktree). After `git remote set-head origin main` it returned 0. Recorded so
the 91 is not mistaken for a defect of the PR.

CI (read, `gh pr view 192`): check `bootstrap` on `6cff65c5` is `COMPLETED / SUCCESS`
(actions run 37370842515).

Diff `8c089cc..6cff65c5` (measured): three files, all inside `writable_paths` —
`work-packages/WP-0A-A0-002.json`, `evidence/WP-0A-A0-002/author-reverify-2026-10-06.md`,
`handoffs/WP-0A-A0-002-author-handoff.json`. No script, test, CI file or digest changed.

## §3 My round-7 findings, re-checked

### Q0-F1 (was blocking) — a neutered `check` reaches exit 0 with zero tests — **CLOSED**

Measured: each variant below written into `package.json`'s `check`, then the guard run once with the
manifest untouched and once after rebuilding every digest.

| # | `check` variant | guard, digest stale | guard, digests rebuilt |
|---|---|---:|---:|
| A0 | control, unmodified | 0 | 0 |
| A1 | `… validate:protocol \|\| npm run test:bootstrap` (my round-7 attack) | 81 | 81 |
| A2 | `… validate:protocol # && npm run test:bootstrap` | 81 | 81 |
| A3 | `… && echo npm run test:bootstrap` | 81 | 81 |
| A4 | trailing ` &` | 81 | 81 |
| A5 | `&& true\nexit 0 && npm run test:bootstrap` | 81 | 81 |
| A6 | `npm run test:bootstrap $(exit 0)` | 81 | 81 |
| A7 | `npm run test:bootstrap -- --help` | 81 | 81 |
| A8 | `NODE_OPTIONS=--version npm run test:bootstrap` | 81 | 81 |

`assertPackageScripts` now splits the chain on `&&`, admits only the alphabet `[A-Za-z0-9 ./:_@-]` per
step, and requires all five gating steps in order (`scripts/verify-test-coverage-floor.mjs:84-150`, read).
`package.json` is a digested, protected key (read, `PROTECTED_KEYS`). Read: `.github/workflows/ci.yml:69-75`
runs `node scripts/verify-test-coverage-floor.mjs` as its own step before `npm run check`, so A4 — which
still makes a *local* `npm run check` return 0 because the whole chain is backgrounded (read, not
measured) — is rejected in CI with 81 before `check` runs. The class I reported was "no protected-file
edit, no manifest edit, CI green": that class is closed, and even the digest-rebuilt variants fail.

### Q0-F2 (was blocking) — exit 88 compares integers — **OPEN, now bounded; disposition accepted with a correction**

Re-measured with a stronger form than round 7. No phantom function is needed: in one suite, replace
`import test from 'node:test';` with `import realTest from 'node:test'; const test = () => {};` and append
`for (let i = 0; i < N; i += 1) realTest('generated-' + i, () => {});` with N the file's declared count.
Every lexical `test(` line, every name, every `assert.*` call stays in the file — so the per-file test
floor, the test-name digest (`TEST_NAME_DIGEST_BY_FILE`) and the assertion floor all still hold — while
none of the original tests runs.

| Target | guard, digest stale | guard, digests rebuilt | file run alone | `assertDeclarationsMatchExecution(692)` | full `npm run check` |
|---|---:|---:|---|---|---|
| `test-kits/contracts/catalog-groups.test.mjs` (7) | 86 | **0** | 7/7 pass, no assertion runs | returns 692 (no 88) | exit 1: **`ratchets-bite` "the catalog-group ratchet notices three unrelated reversals" catches it** |
| `test-kits/capability-profile.test.mjs` (4) | 86 | **0** | 4/4 pass, no assertion runs | returns 692 (no 88) | exit 1, `pass 686, fail 6` — **the six failures are exactly the sandbox baseline**, none is caused by the attack |

The six sandbox-baseline failures (measured on the unmodified `git archive` copy): five tests in
`handoff-conformance` / `ratchets-bite` that need a `.git` directory, and "a target needing a database
refuses without one", which runs `git ls-files`. All six pass in the git-backed clone (692/692 above). So
on a real checkout the `capability-profile` hollowing is, by inference, a green run; I did **not** measure
that full run on a git-backed tree.

Assessment: exit 88 still detects nothing that is balanced, and the counter cannot see an aliased or
shadowed `test`. But every variant needs a digested test file and its digest edited in the same diff, so
it is inside the disclosed digest class (`open_blockers[1]`), now anchored by protected `main` with a
required check and Owner review of the diff. The nine contract suites are additionally covered by the
mutation ratchets in `test-kits/ratchets-bite.test.mjs`; the twenty other suites are not. I accept
"recorded, not fixed" for F2 on that basis, with condition **Q0-C1** below.

### Q0-F3 (non-blocking) — nested template literal — **OPEN, recorded accurately**

Measured: `countDeclaredTests` on my round-7 snippet returns **2**; node executes 1. `stripNonCode` still
ends a template literal at its first backtick (`scripts/verify-test-coverage-floor.mjs:255-268`, read).
On its own it unbalances 88 and fails closed. `open_blockers[11]` states this correctly.

## §4 The Author's other claims (measured where marked)

- **E4 residual (`open_blockers[9]`)** — measured. New test file importing `../e4-link.mjs` (a symlink
  to a file outside the copy): undigested → 87; digests rebuilt → 87 ("not in DIGESTED_FLOOR"); `node --test`
  on it prints the outside payload. Matches the Author. **But a second variant reaches a green guard more
  cheaply:** adding `import '../../e4-link.mjs';` to an *existing* digested suite
  (`test-kits/contracts/catalog-groups.test.mjs`) and rebuilding digests → guard **0**, file 7/7, payload
  printed. No edit to `scripts/test-suite-contract.mjs` is needed. (The stale-digest reading of this
  variant was confounded by the previous step's deleted probe — exit 91, "not a regular file" — so I do
  not report it.) Still the digest class; the blocker text overstates what a green run costs. See **Q0-C2**.
- **AC1 rewrite** (read) — the typed count is gone; the criterion now names floors, skipped/todo zero and
  the reconciliation. Measured head: 692 executed, 0 skipped, 0 todo, guard 0. Consistent. Note that the
  reconciliation it cites is approximate (F2), which `open_blockers[10]` already says.
- **`amended_by` acknowledgers, step-2 fields, `product_reviewer_note`** (read) — all three entries name
  `/claude/r0_steward` with `acknowledgement_status: pending`; no acknowledgement is claimed. Schema and
  role-separation validators accept the manifest (measured, §2). Whether the records are right is C0's and
  R0's call, not mine.
- **Status `in_review` vs the tree (`open_blockers[8]`)** (read) — not a Tester matter; R0 disposes.

## §5 Findings at this head

| id | grade | finding |
|---|---|---|
| Q0-F1 | closed | Neutered `check` — rejected 81 in all eight variants even with digests rebuilt; CI runs the guard on its own. |
| Q0-F2 | open, non-blocking (digest class) | Exit 88 is scalar and blind to a shadowed `test`; hollowing a non-contract suite is not caught by any test. Condition Q0-C1. |
| Q0-F3 | open, non-blocking | Nested template literal still counts 2 for 1. Recorded. |
| Q0-N1 | new, non-blocking | `open_blockers[9]` says E4 needs `test-suite-contract.mjs` edited; editing an existing suite plus its digest is enough. Condition Q0-C2. |
| Q0-N2 | new, non-blocking | The shadowed-`test` form keeps names, counts and assertion counts, so it also defeats the per-file name digest and assertion floor, not only 88; the mutation ratchets cover the 9 contract suites only. Folded into Q0-C1. |

Nothing found is a stop-the-line incident: no secret exposure, tenant leakage, duplicate side effect,
lost job, migration divergence, irreversible deletion or contract mismatch. Every open item requires a
digested file and its digest changed together in one reviewable diff.

## §6 Conditions (record corrections; none blocks the merge)

- **Q0-C1** — extend `open_blockers[10]` to say: aliasing or shadowing `test` (e.g. `const test = () => {}`
  plus an aliased import) hollows a suite while its count, name digest and assertion floor all hold, and
  exit 88 still balances; only `ratchets-bite`'s mutation checks catch it, and only for the nine
  `test-kits/contracts` suites.
- **Q0-C2** — correct `open_blockers[9]`: a green guard needs only the edited suite's digest when the
  import is added to an *existing* digested test file; the `DIGESTED_FLOOR` / `test-suite-contract.mjs`
  edit is needed only for a *new* file.

## §7 Verdict

My round-7 blocking finding F1 is closed and measured closed. F2 and F3 remain open inside the disclosed
digest class and are recorded; I accept that disposition with the two record corrections above. All
declared tests pass on the branch name at `6cff65c5` (692/692, every package command 0) and CI is green
on the head. Nothing here is stop-the-line, and nothing I found blocks the merge; Q0-C1 and Q0-C2 may land
in this PR or in a follow-up record change. C0, A1 and R0 verdicts are their own.

VERDICT: test_verified_with_conditions
