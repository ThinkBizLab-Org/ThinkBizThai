# A merge commit's parents are ordered by how the merge was made, not by which side is the branch

`scripts/refresh-author-handoff.mjs` compares a handoff against the branch **as it stood before
the current commit**, because a handoff cannot cite the revision that contains it. That comparison
point came from `branchTipBefore`, which read:

```js
export function branchTipBefore(head = 'HEAD') {
  const parents = git('rev-list', '--parents', '-1', head).split(' ');
  return parents.length > 1 ? parents[parents.length - 1] : head;
}
```

The **last** parent. The comment above it gave the whole justification: the merge commit
`actions/checkout` builds for a pull request has parents `[base, pull request head]`, so the last
one is the branch. That is true of that merge and of no other. Parent order records how a merge
was **made** — git puts the branch the merge was run *on* first — and not which side is the
feature branch:

| how the merge was made | parents | last parent |
| --- | --- | --- |
| `git merge main`, run on the working branch | `[branch tip, main tip]` | **main** |
| the pull request merge, built on the base | `[main tip, branch tip]` | branch tip |
| that merge once it is on `main` (a push-to-main run) | `[main as it stood, merged branch]` | **a commit main already contains** |

Reported by batch 040's author, who hit the first row, kept its branch linear as a workaround, and
reported it rather than editing a file the package does not own. Not found by any guard: every
branch in this repository had been linear, so the case had never occurred.

## Reproduced before anything was changed

`git merge main` on a working branch, against the implementation above, in a throwaway repository
(work, a handoff citing it, another package lands on main, then main is merged in):

```
ORIENTATION 1: git merge main  (run on the working branch)
  parents of HEAD      : 4ac359f 1d2b304
  branch tip (parent 1): 4ac359f
  main   tip (parent 2): 1d2b304
  branchTipBefore()    : 1d2b304 <- MAIN, NOT THE BRANCH (wrong)
  driftBetween(the handoff's honest cited head, that answer).state = unrelated
  npm run refresh:handoff -> exit 91
    handoffs/WP-TEST-001-author-handoff.json cites 4ac359f, which is on no path to this branch.
  handoff rewritten?   false
  npm run check:handoff -> exit 91 | handoffs/WP-TEST-001-author-handoff.json cites 4ac359f, which is on no path to this branch.

ORIENTATION 2: the CI pull-request merge commit (detached on the base)
  branchTipBefore()    : 72b0514 <- the branch tip (right)

ORIENTATION 3: the merge once it is on main (a push-to-main run)
  main as it stood     : c1d3024
  the merged branch    : 72b0514
  branchTipBefore()    : 72b0514 <- a commit main already contains (wrong)

ORIENTATION 4: an ordinary commit
  branchTipBefore()    : 72b0514 <- HEAD^ (right)
```

**This is the state the tooling refuses to repair.** The handoff cites a commit on the branch,
honestly. Compared against main it is a revision "on no path to this branch", so `check:handoff`
is red (91) — and `refresh:handoff`, the remedy its own message names, will not rewrite an
unrelated citation and exits 91 having written nothing. A branch that merges main cannot pass the
guard and cannot repair itself. Two of the four shapes CI itself produces were wrong.

## The rule

Order cannot tell the shapes apart, so order is not what is asked. The branch side of a merge is
the side **the integration branch does not already contain**, which is a fact in the history:

| shape | answer |
| --- | --- |
| first parent not in the integration branch | the first parent — any merge run *on* this branch, whether main or a sibling was merged in |
| first parent in it, exactly one other not | that other parent — a merge built *on* the integration branch out of one outside head: the pull request merge commit, and only it |
| every parent in it | the first parent — HEAD is itself a commit on the integration branch, which is what a push-to-main run checks out; the branch there *is* main |
| first parent in it, two or more others not | **REFUSED**, exit 94 |
| no integration ref resolves, and HEAD is a merge | **REFUSED**, exit 94 |

The integration ref is the existing `INTEGRATION_REFS` — `main`, `origin/main`, `origin/HEAD` — so
no new naming assumption enters. A non-merge commit never consults a ref at all: `HEAD^`, exactly
as before, which is why the repository's existing refusal case (`a repository with no integration
branch refuses rather than inventing a base`, exit 93) is unchanged.

**Refusing is a real answer here**, and it is the one this script already gives when it cannot
resolve an integration ref for the *base*. Exit 94 is kept apart from 93 because they are
different failures with different remedies: 93 is "I do not know where this branch started", 94 is
"I do not know which side of this merge the branch is". The message names the merge, its parents,
which of them the integration branch already contains, and what could not be determined.

After the change, all four shapes:

```
ORIENTATION 1: git merge main  (run on the working branch)
  branchTipBefore()    : bdc213f <- the branch tip (right)
  driftBetween(...).state = clean
  npm run refresh:handoff -> exit 0
  npm run check:handoff -> exit 0 | ... describes the branch: nothing substantive after its cited head
ORIENTATION 2: the CI pull-request merge commit (detached on the base)
  branchTipBefore()    : 1576b7e <- the branch tip (right)
ORIENTATION 3: the merge once it is on main (a push-to-main run)
  branchTipBefore()    : 18e0a99 <- main as it stood before (right)
ORIENTATION 4: an ordinary commit
  branchTipBefore()    : 1576b7e <- HEAD^ (right)
```

## The cases, and that they fail against the previous implementation

Four cases in `test-kits/handoff-conformance.test.mjs`, in that file's existing style: real
repositories in temp directories, the script run as a process, and the exported helper probed by a
child process with the temp repository as its working directory — it shells out to git in the
process's working directory, so a mock would be testing the mock. The probe accepts **both** return
shapes, the bare SHA the previous implementation returned and the result object this one does, so
the cases fail on the answer and never on the shape of it.

Restoring `scripts/refresh-author-handoff.mjs` from `HEAD` and running the suite unchanged:

```
✖ a range is never compared backwards
✖ a merge is compared against the branch, whichever side of it git recorded last
✖ a merge with no integration branch to compare against is refused, not guessed
✖ a merge with more than one candidate for the branch is refused rather than picked
✔ an ordinary in-progress branch is untouched by any of this, byte for byte
ℹ tests 19  ℹ pass 15  ℹ fail 4
```

and with the change in place, `tests 19, pass 19, fail 0`.

- `a merge is compared against the branch, whichever side of it git recorded last` builds all three
  merge shapes. On the reported one it asserts the comparison point, then that `refresh:handoff`
  exits 0 and writes a range covering this branch and not the package that landed on main, then
  that `check:handoff` is green on the next commit — the whole of "the tooling can repair this".
- The two refusal cases assert the literal exit code 94, the message, and that the handoff file is
  **byte-identical** afterwards. The literal, not the exported constant, for the reason the
  existing branch-point refusal case gives: importing the constant would prove the export exists
  and nothing about what the script does.
- `an ordinary in-progress branch is untouched by any of this, byte for byte` is the half a fix
  must not pay for. It asserts the refreshed handoff's **file bytes** against a value built in the
  test, and it passes against both implementations — which is the point of it.

`a range is never compared backwards` is a pre-existing case; it fails against the old
implementation only because it now reads `.tip` from the result object. That is a shape change, not
a finding, and it is recorded here rather than presented as one.

## What this does not establish

- It does not make a merged-in branch's *range* narrower or wider. Merging main moves the branch
  point (`git merge-base HEAD main`) forward to main's tip, so `baseFor` recomputes the stored base
  — visible in the run above as `base moved from …`. That is the existing base-side behaviour, it
  is unchanged here, and the resulting range still covers only this branch's files.
- The ambiguous case is refused, not solved. A merge built on the integration branch out of two
  heads outside it — what a merge queue produces — stops the run. If that shape ever becomes
  ordinary here, it needs a rule, not a guess.
- `main()` still reaches `branchTipBefore` only for a branch some package claims. On a detached
  HEAD the run stops earlier, at the branch-identity guard's `NO_CLAIMANT`, and that remains the
  right owner for that failure.
