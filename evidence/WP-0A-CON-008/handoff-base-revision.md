# A refreshed handoff that claimed 861 files its branch never touched

`scripts/refresh-author-handoff.mjs` regenerated the handoff's HEAD from history and took its BASE
out of the record it was rewriting:

```js
const base = handoff.base_revision;
const head = git('rev-parse', 'HEAD');
const range = changedIn(base, head);
```

That is correct while a package has one branch. It breaks the moment a package comes back for a
SECOND increment: the new branch is cut from a `main` that has since absorbed the first increment
and everybody else's, the stored base is far behind that branch point, and `base..HEAD` claims every
file merged in between.

Measured, on WP-0A-CON-002, whose new branch changed four lines of one manifest:

```
handoffs/WP-0A-CON-002-author-handoff.json now cites d207d7d..463cf97 — 861 added, 37 modified, 0 deleted
```

## Why the handoff guards were green over it

`handoff-conformance.test.mjs` diffs the cited range against `files_added` / `files_modified`. The
refresher had written **both** from the same wrong base, so the two agreed. Two things derived from
one mistake agree about the mistake; a check that compares them confirms it.

What did catch it was an unrelated assertion: the handoff claimed contract-catalog compatibility
impact while changing no catalog file. That is luck, not coverage.

## The fix

The branch point is a fact in the history, so it is read from the history:
`git merge-base HEAD <integration ref>`.

**Which ref.** `main`, then `origin/main`, then `origin/HEAD`, and the branch point taken is the
LATEST of the ones that resolve. `main` first because that is what this repository merges into and
what a worktree or clone has locally; `origin/main` because a stale local `main` puts the branch
point earlier than it is, which is a smaller copy of the same over-claim; `origin/HEAD` last because
it is the only one of the three that names a default branch called something else without this
script guessing at names.

**When it cannot be determined.** Exit 93, with a message naming every ref it looked for and what
was wrong with each. It does not fall back to the stored base and it does not fall back to the root
commit: both produce a range that looks plausible and describes work the branch did not do, which is
the defect rather than a degraded form of it. Two refs that disagree and are not on one line of
history are also a refusal, not a choice.

A detached HEAD never reaches that code. `reportFor` runs first, `git rev-parse --abbrev-ref HEAD`
reads `HEAD`, no package declares it, and the run stops at NO_CLAIMANT (75) with the branch-identity
guard's own message — the right owner for that failure.

**When it recomputes.** Only when the stored base is not on the branch's own side of the branch
point. A stored base at or after the branch point could have been chosen deliberately — a second
handoff on a long-lived branch describing only the increment since the first — and moving it
backwards would silently widen someone's range with nothing in the diff to say why. A stored base
*before* the branch point cannot be deliberate: everything between it and the branch point reached
`main` through somebody else's reviewed merge. A stored base that is not an ancestor of HEAD at all
— a SHA a squash merge orphaned — is replaced for the same reason.

The ordinary in-progress branch, where the stored base already IS the branch point, is untouched:
the field is not written at all, not rewritten with the value it had.

## What moving the base forward costs

Stated rather than assumed away, because it is real:

1. The commits between the old base and the new branch point leave this handoff's range. After a
   normal merge they are still in `main`'s history and in the earlier increment's own handoff. After
   a **squash** — PR #45 here — the individual commits are gone, and the earlier handoff is the only
   surviving record of what that increment contained. That is why this rewrites only the handoff of
   the branch it is run on, and never regenerates a handoff whose branch has been merged.
2. If part of this branch has already been merged into `main` while work continues, the branch point
   moves onto the branch itself and the recomputed range describes LESS than the branch did. Nothing
   here detects that: the drift check looks past the cited head, never before the cited base. A
   reviewer seeing a range narrower than the pull request should read it as this case.

## The test, and what it proves

`test-kits/handoff-conformance.test.mjs`, three cases. Each builds a real git repository in a
temporary directory and runs the refresher against it as a process — the script shells out to git
for every fact it uses, so a mock would be testing the mock.

| case | pre-fix script | fixed script |
| --- | --- | --- |
| a second increment cites its own branch point | **fail** | pass |
| an in-progress branch keeps the base it recorded | pass | pass |
| a repository with no integration branch refuses | **fail** | pass |

Run against the pre-fix `refresh-author-handoff.mjs` restored from `HEAD`:

```
✖ a second increment cites its own branch point, not the base its first branch left behind
✔ an in-progress branch keeps the base it recorded, byte for byte
✖ a repository with no integration branch refuses rather than inventing a base
ℹ tests 15  ℹ pass 12  ℹ fail 3
```

The first case is the defect, constructed rather than asserted on a string: a branch, a merge into
`main`, three commits from other packages, then a second branch off the new `main` changing one
file. The pre-fix script claims `increment-one.txt` and `another-package-1..3.txt`; the fixed one
claims exactly the three paths the branch wrote.

The middle row is the row that matters for "the fix changed nothing else": the ordinary case passes
against **both** implementations, and their output for it is identical. The third failure is a
different one for the two: pre-fix the script exits 0 having written a base from a repository with
no `main` at all, fixed it exits 93 and writes nothing.

(The third case pins the literal `93` rather than importing the script's exported constant. Importing
it would make the case fail at module load against an implementation that lacks the export, which
proves the export exists and nothing about what the script does.)

## Not closed

- The base side has no drift check of its own in `npm run check`. `refresh-author-handoff.mjs
  --check` (`npm run check:handoff`) now reports a stale base with its own message and exit 91, but
  that command is not in the CI chain. A handoff hand-edited to a stale base **and** a matching file
  list would still pass, exactly as the 861-file one did.
- The under-claim in item 2 above is undetected by anything in this repository.
- `INTEGRATION_REFS` is a list of three names. A repository whose default branch is not `main` and
  whose `origin/HEAD` is unset is refused rather than served; that is deliberate, and it is still a
  case somebody will meet.
