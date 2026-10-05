# C0 re-verification of WP-0A-A0-002 (PR #192), 2026-10-05

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/192, branch
`agent/claude/WP-0A-A0-002-contract-test-coverage`, head `6cff65c5`, base `main @ 8c089cc`. Three files:
`evidence/WP-0A-A0-002/author-reverify-2026-10-06.md` (new), `handoffs/WP-0A-A0-002-author-handoff.json`,
`work-packages/WP-0A-A0-002.json`. My earlier verdict is `review-contract-round7.md` (`changes_requested`
at `ffe36fa`); this file re-checks its six blocking conditions at the current head and reports what is new.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Reviewer
run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor and a
parent with the Author. I wrote none of the PR's content and I fix nothing. This file is not a merge
authorisation, not a test or integration verdict, and moves no package status.

## 1. Method, and what was measured versus read

Private clone under the scratchpad, checked out on the branch NAME (never detached), `HEAD = 6cff65c5`,
`merge-base = origin/main = 8c089cc`. Node `v24.20.0`, npm `11.19.0` (`zsh -lc`). No database was used.
Every destructive probe ran in a separate copy; the clone ended clean (`git status --short` empty).

**Measured** (commands and exit codes in §5):

- `npm run check` on the branch: exit 0, 692 tests, pass 692, fail/skipped/todo 0.
- `npm run check:handoff`, `verify-branch-identity`, `verify-branch-scope`, the three protocol validators
  and the role-separation validator: all exit 0.
- `countDeclaredTests` against my round-7 adversarial cases and new ones (§3 F2).
- The E4 residual, end to end, through a module the manifest does not digest (§3 F1).
- C0 round-7 Row E (`check` without the guard): the standalone guard exits 81.
- Branch protection on `main` and PR #192's state, read live with `gh api` / `gh pr view` (read-only).

**Read, not measured:** RFC-2026-003 status line; `author-remediation-4.md` rows; the A1 and Q0 round-7
files (only to compare their findings with the new `open_blockers` text); the Owner's step-2 disposition
cited by the manifest. I did not re-judge the Owner's step 2 or the `amended_by` corrections beyond checking
that no acknowledgement is claimed (none is: all three stay `pending`).

## 2. My round-7 conditions at `6cff65c5`

| # | Condition (round 7) | State | Basis |
|---|---|---|---|
| C0-1 | Regex-literal state in `stripNonCode`; cases for `/[/*]/`, a backtick in a regex, the §3b payload | **Closed for the cases asked**, residual F2 | Measured: `/[/*]/` → 2/2, `/[`]/` → 2/2, §3b payload → 0, ×20 → 0. A regex after a keyword (`return`, `typeof`, `case`) is still read as division, so the §3b payload reopens with one word in front of it (F2). |
| C0-2 | Compare declared to the runner's real `pass`, no literal | **Closed** | Read `scripts/run-test-suite.mjs:101-123`; the suite's exit-88 test passed in the 692/692 run. |
| C0-3 | Every discovered test file is a manifest key; protect the unprotected suites | **Closed** for test files | Read `run-test-suite.mjs:112`; green run means every discovered `*.test.mjs` is digested. Modules those tests import are not covered (F1). |
| C0-4 | Publish round-7 author evidence with rows D, E, G, J | **Closed**, with a mislabel (F3) | `author-remediation-4.md:64-71` carries D, G, J. Row E is not E4 (F3); measured Row E now: guard exit 81, and `package.json` is digested. |
| C0-5 | Record the tripwire, the `package.json` entry point and E4 in `open_blockers` | **Not closed** | Tripwire `[1]` and entry point `[2]` are recorded; I accept `[2]`'s closure against CI (`ci.yml:74-75` runs the guard as its own step; `main` requires check `bootstrap`, strict, admins enforced, read live). E4 is recorded in `[9]` **with a classification I falsified** (F1), and `[1]` still says an escaping path "is closed". |
| C0-6 | `integrity-manifest.json` in `writable_paths` and `outputs.files` | **Closed** | `work-packages/WP-0A-A0-002.json:93,187`. |
| non-blocking | AC1 typed count | **Closed** | The new criterion reads the count from the run; it narrows nothing. |

## 3. Findings

### F1 (blocking for this PR) — E4 is not inside the digest class; `open_blockers[9]` and `[1]` say it is

`open_blockers[9]` and `author-reverify-2026-10-06.md` §3 conclude that reaching a green run with E4 "needs
`scripts/test-suite-contract.mjs` and its digest edited together", so E4 "sits inside the disclosed digest
class". The Author measured only one route: adding a **new test file**. The guard pins test files and never
looks at what they import, and the manifest does not digest the modules digested tests import.

Measured at `6cff65c5`, in a git clone on the branch name, working-tree edit only:

1. Prepend one line to `test-kits/db/ws905-fixture.mjs` (a test helper, not a `*.test.mjs`, not digested,
   imported by the digested `test-kits/db/foundation-contract.test.mjs`):
   `import '../../../e4-outside.mjs';` — a path outside the repository. No symlink, so the secret scan's
   symlink refusal (exit 71, which I hit on a first attempt with a symlink) does not apply.
2. `e4-outside.mjs` writes a marker file next to itself and prints nothing.
3. `git status --short` → only ` M test-kits/db/ws905-fixture.mjs`; `integrity-manifest.json` byte-identical.
4. `node scripts/verify-test-coverage-floor.mjs` → **exit 0**.
5. `npm run check` → **exit 0**, `tests 692 / pass 692 / fail 0 / skipped 0 / todo 0`.
6. **23 marker files** were written outside the repository: the outside code ran in every process that
   loaded the fixture, during a fully green `npm run check`.

So E4 is reachable with no digest line in the diff, which is exactly the kind of row round 7 said is
outside the unclosable class. Static count of the gap: digested tests and their imports reach **14
undigested modules** over 42 import edges, among them two test-side helpers
(`test-kits/db/ws905-fixture.mjs`, `tests/db/identity/isolation-cases.mjs`), the shared
`db/foundation/test-helpers/rls-assertions.mjs`, and eleven `scripts/db/*.mjs` modules.

This is pre-existing on `main`; the PR does not introduce it. What blocks is the record: this PR exists to
make the record true, and it adds a claim that is false and re-asserts another (`[1]`: "an escaping path
-- is closed"). Required, records only (no code change is asked of this PR):

- Rewrite `open_blockers[9]` to say E4 is reachable without a digest edit through any undigested module
  imported by a digested test, cite this measurement, and drop "inside the disclosed digest class".
- Amend `open_blockers[1]`'s "Everything OUTSIDE that class ... is closed" in place so it no longer names
  the escaping path (and, per F2, phantom declarations) as closed.
- Correct `author-reverify-2026-10-06.md` §3's conclusion, or supersede it in a dated note.
- Whether to close it (digest the transitive import closure of the test roots, or refuse imports that
  resolve outside the repository) is a code decision for a later package; recording it as open is enough here.

### F2 (non-blocking) — a regex after a keyword is still lexed as division

`stripNonCode` decides regex-versus-division from the preceding significant character, so a keyword that
ends in a letter reads as an identifier. Measured with the shipped `countDeclaredTests`:

```
want=1 got=0  function f(){ return /[/*]/; }  + one test            (loses)
want=0 got=1  function f() { return /[`]/; } /* pad ` test('phantom', ...); */   (invents)
want=0 got=1  const k = typeof /[`]/;          + same comment              (invents)
want=0 got=1  switch (x) { case /[`]/: ... }   + same comment              (invents)
want=1 got=2  Q0 round-7 F1 nested template (still open, as open_blockers[11] says)
```

On its own each case unbalances exit 88 and fails closed, and since every test file is now digested and the
set is pinned, using it to compensate needs a digest line. It is the same class as Q0-F3 and should be
recorded beside it: extend `open_blockers[11]` to name keyword-preceded regex literals.

### F3 (non-blocking) — "Row E" is not E4

`author-reverify-2026-10-06.md` §1.1 row C0-4 says "Row E (the E4 residual) is answered by §3". In
`review-contract-round7.md` §2, Row E is removing the guard and tests from `package.json`'s `check`; E4 was
Row J. Row E's real state today, measured: removing `npm run verify:coverage-floor &&` from `check` makes
the standalone guard exit **81** ("check must invoke npm run verify:coverage-floor as its own && step"),
`package.json` is digested, and CI runs the guard separately. Fix the label when F1 is fixed.

### F4 (process, not a defect)

- This commit lands after the handoff, so the "handoff last and alone" rule needs `npm run refresh:handoff`
  by the Author once the F1 correction is in.
- PR #192's required check `bootstrap` had no conclusion yet when read (`gh pr view`); I did not wait on it.
- Owed by other roles, unchanged by this file: A1 and Q0 re-verdicts, a new R0 verdict, the three
  `amended_by` acknowledgements and `open_blockers[3]`/`[4]` by `/claude/r0_steward`, and the status/tree
  disposition in `open_blockers[8]`.

What I checked and found sound: the three changed paths are inside `writable_paths` (scope guard exit 0);
closed entries keep their original text and indices (`[0]`, `[2]`, `[6]`); the `amended_by` corrections
claim no acknowledgement; `product_reviewer_note` and the cross-vendor withdrawal cite the step-2
disposition and do not claim more than it; AC1 is stricter, not weaker; the live branch-protection claim in
`open_blockers[1]` matches `gh api` (required check `bootstrap`, strict, admins enforced, no required review).

## 4. Stop-the-line

**None.** Nothing in the PR touches secrets, tenant data, a migration, an external side effect or a
contract meaning. F1 is a pre-existing gap on `main`; executing code requires a reviewable edit to a
tracked file, which diff review and the required CI check still see. It is a false record, not an incident.

## 5. Commands

| Command (clone on the branch name unless noted) | Exit | Result |
|---|---|---|
| `git rev-parse --abbrev-ref HEAD` / `HEAD` / `merge-base HEAD origin/main` | 0 | branch name / `6cff65c5` / `8c089cc` |
| `npm run check` | 0 | 692 tests, pass 692, fail 0, skipped 0, todo 0 |
| `npm run check:handoff` | 0 | "nothing substantive after its cited head" |
| `node scripts/verify-branch-identity.mjs agent/claude/WP-0A-A0-002-contract-test-coverage` | 0 | `WP-0A-A0-002` |
| `node scripts/verify-branch-scope.mjs 8c089cc… WP-0A-A0-002` | 0 | 3 changed paths declared |
| `validate-work-packages.mjs` / `validate-work-package-ownership.mjs` / `validate-work-package-role-separation.mjs` | 0 / 0 / 0 | — |
| `countDeclaredTests` probes (two scripts, 17 cases) | 0 | 11 as wanted; 6 failing, 5 distinct, listed in F2 |
| E4, copy without `.git`, symlink at root | 71 | secret scan refuses the symlink |
| E4, copy without `.git`, direct out-of-repo import | 1 | 6 failures, all from the missing `.git`; payload ran |
| E4, git clone on the branch name, direct out-of-repo import: guard | 0 | — |
| E4, same: `npm run check` | 0 | 692/692, manifest byte-identical, 23 markers outside the repo |
| Row E, copy: guard with `verify:coverage-floor` removed from `check` | 81 | refuses |
| `gh api …/branches/main/protection` (read) | 0 | check `bootstrap`, strict, admins enforced, reviews null |
| `gh pr view 192` (read) | 0 | OPEN, Draft, head `6cff65c5`, `bootstrap` no conclusion yet |

## 6. Verdict

**`changes_requested`.**

- C0-1, C0-2, C0-3, C0-4 and C0-6 are closed; C0-5 is not, because E4 is recorded with a classification
  that is measurably false (F1).
- **Merge is blocked by F1** from this role: a records-only PR whose job is a true record adds a false one.
  The fix is to the manifest and the author evidence only; a re-check by this role covers it.
- F2 and F3 should be fixed in the same pass and are not individually blocking.
- Stop-the-line: none.
