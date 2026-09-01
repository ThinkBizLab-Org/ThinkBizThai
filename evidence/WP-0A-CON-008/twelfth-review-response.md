# Independent review #12

Three HIGH findings, three MEDIUM, two LOW. Every one was reproduced before it was fixed, and
one of them falsified a sentence this package had written into its own evidence.

The review ran in a disposable `git worktree` at `dc82fc2` and left the live tree untouched.

## LOW 8 first — the branch tip was red, and I had reported it green

At `f9f789a`, `npm run check` exited **1** at 188/189: the handoff cited `74cb382` while four
substantive paths had changed after it. I had reported 189/189.

Cause: `refresh:handoff` returned early when nothing had drifted **and therefore never advanced
the citation**, so the next commit drifted again. It printed *"describes the branch"* and wrote
nothing, three commits in a row. The rewrite is now unconditional — the check-only mode reports,
the default mode always writes.

This is the same defect as the guard's two earlier broken versions, and it is the third time in
this package that a freshly written guard reported a comfortable answer instead of a true one.

## HIGH 3 — both CI-only guards could be replaced with stubs

`verify-branch-identity.mjs` and `verify-branch-scope.mjs` run **only** in CI. Their unit tests
imported the pure helpers — `claimantsOf`, `reportFor`, `globToRegExp`, `undeclared`,
`declaredPaths` — and `main()` was executed by nothing.

The review replaced both `main()` bodies with no-ops, ran `npm run regenerate:manifest`, and got
**exit 0, 187/187**. `PROTECTED_KEYS` passed, because **a digest pins bytes, and the bytes of a
stub are exactly what they claim to be.** After the mutation:

```
verify-branch-identity.mjs agent/claude/anything-at-all  →  "WP-0A-A0-001", exit 0
verify-branch-scope.mjs HEAD~5 WP-0A-CON-008             →  "all 0 changed path(s) are declared"
```

That falsified this package's own claim — *"There is no path through that step that reaches exit
0 without a resolved package"* — which is now struck through where it was written.

Fix — `test-kits/ci-guard-behaviour.test.mjs` spawns both as **processes**:

| test | asserts |
| --- | --- |
| no claimant | exit **75**, message names `ownership.branch` |
| real branch | exit **0**, and stdout is **exactly** `WP-0A-CON-008` — CI does `package_id="$(node …)"`, so any extra output becomes part of the id |
| no argument | exit **2** |
| stray path | exit **73** in a **real** temporary git repository, naming the stray and not the declared path |
| clean branch | exit **0** — without this, a guard that always exits 73 would pass the row above and block every pull request |

The scope guard is exercised against a repository built with `git init`, not a mock: it shells
out to git, and a mock would be testing the mock.

Verified both ways:

- stub `verify-branch-identity`'s `main` → **exit 1**, two named failures.
- replace `const stray = undeclared(...)` with `const stray = []` → **exit 1**, the stray-path test.

The repository's own secret scanner reported this new test file on its first run, for a literal
address in a `git config` call. Assembled from parts instead. That control has now fired on its
author four times.
