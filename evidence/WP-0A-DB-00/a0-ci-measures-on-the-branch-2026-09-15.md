# CI measures on the branch — the fix, and the fix that was measured and rejected first

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Decision it implements: Q4 (a) of
[`product-owner-disposition-2026-09-15-six-questions.md`](product-owner-disposition-2026-09-15-six-questions.md)
— "fix `ci.yml` so CI measures on the branch name, before anything else merges".

## 1. The defect, restated in one line

`actions/checkout` with no `ref` leaves a pull request at a detached HEAD;
`test-kits/handoff-conformance.test.mjs` reads `HEAD` as the branch name, finds no claimant, returns
early, and is reported as a pass. Found three ways by Q0 (F10), C0 (M5) and A1 (S10); reproduced at
`ffd9cc3` — CI run 34753189118 green, `npm run verify` on the same commit `NOT clean: 584/586`.

## 2. The obvious fix, measured, and wrong

The first candidate was to keep the merge commit CI builds and give it the branch's name — a step
running `git checkout -b "$HEAD_REF"` after checkout. `branchTipBefore` already knows which parent
of that merge is the branch, so the guard would run. It was simulated locally before being written:

```
git worktree add --detach <scratch> origin/main
git merge --no-ff 9668127              # PR #121's head, a correctly built branch: plumbing last
git checkout -b agent/claude/WP-0A-DB-00-disposition-2026-09-15
node --test test-kits/handoff-conformance.test.mjs
```

Result: **`✖ the handoff for this branch describes this branch`**. On the merge commit the guard's
comparison point is the branch tip — the plumbing commit — and the handoff, correctly, cites that
commit's parent. The plumbing files (`test-kits/branch-identity.test.mjs`, `work-packages/**`) are
not in `WRITTEN_AFTERWARDS`, so the range reads as drifted. **Every correctly built branch would be
red in CI under this fix**, and the only repairs are to exempt those two files (the weakening
Q4.1 (b) declined) or to change a protected guard (`scripts/refresh-author-handoff.mjs`, owned by
another package). Rejected.

## 3. The fix taken

`ref: ${{ github.head_ref }}` on the checkout step. For a branch ref, `actions/checkout` v4 runs
`git checkout --progress --force -B <ref> refs/remotes/origin/<ref>` (`src/ref-helper.ts` sets
`startPoint` to `refs/remotes/origin/<branch>`; `src/git-command-manager.ts` `checkout()` pushes
`-B ref startPoint`), so `git rev-parse --abbrev-ref HEAD` reads the branch name and `HEAD^` is the
same commit `npm run verify` on the branch compares against. CI now measures what the branch
measures — which is the whole of what the three findings asked for.

What is given up: CI no longer tests the merge-with-`main` result. Branch protection on `main` is
`strict: true` (required status check `bootstrap`, must be up to date with the base), so a head that
does not already contain `main` cannot merge, and the merge result is the head. On a `push` event
`head_ref` is empty and the checkout falls back to the pushed ref, as before.

## 4. What this changes for the queue

- #114, #115 and #116 will read in CI what they read locally: `584/586`. Q4.1 (a) replaces them.
- Every later PR must keep the plumbing as its last commit, in CI as well as locally. That was
  always the rule; it is now enforced where RFC-2026-002 reads it.
- `.github/workflows/ci.yml` is owned by `WP-0A-A0-004`. This is an amendment, declared in the
  manifest with this reason, and the Owner was told before deciding Q4.

## 5. Not measured

The new checkout has not run in CI at the time of writing; this branch's own run is the
measurement. If it is green **and** the handoff test actually executed — visible as the test not
being skipped in the run log, and as #114–#116 going red on rebase — the fix holds.
