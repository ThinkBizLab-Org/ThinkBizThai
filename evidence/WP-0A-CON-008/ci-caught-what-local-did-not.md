# CI's branch-scope step found a path the local run did not

Run [33550347358](https://github.com/ThinkBizLab-Org/ThinkBizThai/actions/runs/33550347358)
failed at **exit 73**:

```
WP-0A-CON-008 changed 1 path(s) it neither owns nor records as an amendment:
  scripts/scan-repository-secrets.mjs
```

The path is real: review eleven's finding nine deleted an unreachable `return false;` there, and
the file belongs to `WP-0A-A0-003`. It was never declared.

**Why the local run said the branch was clean.** I invoked the guard as

```
node scripts/verify-branch-scope.mjs $(git merge-base HEAD agent/claude/WP-0A-CON-007-reference-bounds) WP-0A-CON-008
```

— the merge-base with the branch below this one in the stack. The pull request is based on
`653f699`, an earlier commit, so CI's range is strictly larger and contains the change mine did
not. **Run the guard with the pull request's own base sha, not a convenient one.** Against
`653f699`: *all 71 changed paths are declared*.

This is the second time the same class of error has appeared — measuring against a base that is
not the one that will be used. The first was comparing one shape's after-number to another
shape's before-number and calling it an improvement.

**The rest of the step worked.** `verify-branch-identity.mjs` resolved
`agent/claude/WP-0A-CON-008-freeze-readiness` to `WP-0A-CON-008` from the manifest, in CI, on a
real pull request — the first live exercise of that guard.

## And a status that contradicted its own branch

Adding `ownership.branch` to every manifest made a second inconsistency visible immediately:
`WP-0A-A0-003` and `WP-0A-A0-004` both read `status: "backlog"` while their work sat in pull
requests #8 and #10. The status corrections were arriving last, on the top branch of the stack,
and these two were never reached. Nothing noticed, because status was validated for being a
**legal value** and never against evidence that work had started.

`a package that declares a branch is not still in backlog` in `branch-identity.test.mjs` now
fails on exactly that, naming both packages. Both moved to `in_review`, which is as far as an
Author may take a package.

`npm run check` — **189/189, fail 0, skipped 0, todo 0, exit 0**.

---

## The same class of error again, one wave later — run 33552451049

```
WP-0A-CON-008 changed 1 path(s) it neither owns nor records as an amendment:
  test-kits/contracts/catalog-reference-integrity.test.mjs
```

Local, minutes earlier: *all 74 changed paths are declared*.

The first time, the cause was the wrong **base**. This time it was the wrong **moment**: I ran
the guard before `git commit`, and it diffs `base..HEAD` — an uncommitted change is not in `HEAD`
and is therefore invisible to it. The guard was right both times; the invocation was wrong both
times, in two different ways.

`npm run check:scope <pr-base-sha> <package-id>` now exists so the invocation is one thing to get
right instead of two, and the working rule is written into `OVERNIGHT-SUMMARY.md`: **after the
commit, with the pull request's own base sha.**
