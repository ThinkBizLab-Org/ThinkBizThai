# WP-0A-CON-008 — merge-order drill

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification.

## Why

Merging this stack into `main`, in PR order, is the one action `RFC-2026-002`
reserves for the Product Owner — and nothing had ever demonstrated it works. Thirteen
branches, several force-pushed and rebased across twenty-odd waves, with the earlier
ones carrying older copies of files the later ones changed. "CI is green on every PR"
does not answer it: GitHub tests each head against *its own* base, not the sequence.

## What was run

A clone of this repository, reset to the real `main` (`ff55332`), with every branch
merged in PR order and `npm run check` run after **each** merge. Nothing touched
`main`, the live working tree, or any remote.

```
#1   ok  WP-0A-A0-001-repository-bootstrap            tests 26   pass 26   fail 0
#2   ok  WP-0A-CON-001-contract-catalog               tests 26   pass 26   fail 0
#3   ok  WP-0A-A0-002-contract-test-coverage          tests 58   pass 58   fail 0
#4   ok  WP-0A-CON-002-envelope-contracts             tests 85   pass 85   fail 0
#5   ok  WP-0A-CON-003-module-and-policy              tests 87   pass 87   fail 0
#6   ok  WP-0A-CON-005-job-reference-hardening        tests 93   pass 93   fail 0
#7   ok  WP-0A-CON-004-security-audit-observability   tests 95   pass 95   fail 0
#8   ok  WP-0A-A0-003-secret-scan                     tests 118  pass 118  fail 0
#9   ok  WP-0A-CON-006-usage-and-notification         tests 121  pass 121  fail 0
#10  ok  WP-0A-A0-004-ci-independent-guard-step       tests 121  pass 121  fail 0
#11  ok  WP-0A-A0-005-cardholder-data-scan            tests 143  pass 143  fail 0
#12  ok  WP-0A-CON-007-reference-bounds               tests 151  pass 151  fail 0
#13  ok  WP-0A-CON-008-freeze-readiness               tests 156  pass 156  fail 0
```

Re-run at the current heads after every wave since. **No conflict at any step, green at
all thirteen, `skipped 0` and `todo 0` throughout**, and the suite grows monotonically
26 → 156.

## The drill found one thing I had reported wrongly

`WP-0A-A0-004` was still `backlog` in the fully merged tree. I stated in an earlier
wave that I had moved it to `in_review`; the change is in no branch. Either it never
happened or it was lost in the branch restore, and I did not check. It is corrected
here, on the same footing as the six corrected earlier — and for the same reason: a
manifest saying `backlog` while its work sits in an open PR tells a reader nobody has
started.

## The half-merge warning, confirmed

Merging **#1 through #11 and stopping** leaves seven packages reading `backlog` while
their work is already on `main`: `A0-003`, `A0-004`, `CON-002`, `CON-003`, `CON-004`,
`CON-005`, `CON-006`. The status corrections live at the top of the stack, so they
arrive last.

`WP-0A-A6-001` also reads `backlog` there and **should**: its own acceptance criteria
forbid advancing it until A6 supplies an independently reviewed capability benchmark.
It is parked on purpose, not forgotten.

So: **merge the whole stack, or expect to fix statuses by hand.**

## What this drill does not establish

- It does not run GitHub's own merge. It reproduces the sequence locally with the same
  commits; a protected-branch rule or a required check could still intervene.
- It does not review the content. Every merge being clean says the files do not
  collide, not that the result is correct.
- `main` is untouched and no branch was pushed.

## The drill found a conflict thirteen green pull requests could not

Re-run after the branch-scope guard moved to `WP-0A-A0-004` and the stack was rewritten
below it, the drill stopped at **#12 with a merge conflict on
`test-kits/integrity-manifest.json`**.

Every pull request was `MERGEABLE` and every one was green. That is not a
contradiction: **GitHub tests each head against its own base, never the sequence.**
`WP-0A-CON-007` had stopped containing `WP-0A-A0-005`, both had edited the manifest
independently, and nothing in thirteen green checks could see it.

The manifest conflicts by construction — every package adds digests to the same file —
so this will recur on any restack. What makes it findable is running the merge, and
what makes it fixable is that the file is generated: rebuild it from disk rather than
resolve it.

Both branches were rebuilt as a single commit on their true current base, which is the
only resolution that has worked here; rebasing replays commits already present in the
new base and collides again. Previous heads are kept as `con007-prev` and
`con008-prev2` until the stack merges.

**This is the argument for running the drill and not trusting the badges.** A stacked
set of pull requests is not verified by its pull requests.

## What the Product Owner will actually hit, and exactly what to do

Rebuilding the branches did **not** remove the conflict, and it cannot: merging
`#1..#11` produces a manifest that is the merged accumulation, while `#12`'s branch
carries its own. Two files collide on any sequence merge, by construction:

| file | why it always collides |
|---|---|
| `test-kits/integrity-manifest.json` | every package adds digests to it |
| `evidence/VERIFICATION.md` | it holds one test count, and every package changes the count |

**Neither can be merged textually and neither needs to be — both are generated.** On a
conflict in either, take any side and rebuild:

```bash
git checkout --theirs test-kits/integrity-manifest.json evidence/VERIFICATION.md
npm run regenerate:manifest          # rebuilds every digest from the tree
npm run record:verification          # rewrites evidence/VERIFICATION.md from a live run
npm run regenerate:manifest          # the record just changed, so digest it again
npm run check                        # exit 0
```

`npm run regenerate:manifest` prints every file that entered or left the manifest. **Read
those lines before committing** — a file appearing or disappearing there is a change to
what is protected, not a formatting update.

The drill now does exactly that, and **only** for those two paths: a conflict in any
other file still stops it. With that resolution the full sequence completes —
**thirteen merges, green at every step, 26 → 171 tests.**

If a conflict appears in any file that is *not* one of those two, stop. That is a real
disagreement between two packages and not a bookkeeping artifact.

---

## Re-run at wave 40, after the nine fixes for independent review #11

The drill was re-run from a fresh clone reset to the real `origin/main` (`ff55332`), merging
all thirteen pull requests in order with `npm run check` after each. Thirteen green PRs still
say nothing about the sequence, so this is re-run whenever the stack changes.

```
#1   ok  WP-0A-A0-001-repository-bootstrap           tests 26   pass 26   fail 0
#2   ok  WP-0A-CON-001-contract-catalog              tests 26   pass 26   fail 0
#3   ok  WP-0A-A0-002-contract-test-coverage         tests 58   pass 58   fail 0
#4   ok  WP-0A-CON-002-envelope-contracts            tests 85   pass 85   fail 0
#5   ok  WP-0A-CON-003-module-and-policy             tests 87   pass 87   fail 0
#6   ok  WP-0A-CON-005-job-reference-hardening       tests 93   pass 93   fail 0
#7   ok  WP-0A-CON-004-security-audit-observability  tests 95   pass 95   fail 0
#8   ok  WP-0A-A0-003-secret-scan                    tests 118  pass 118  fail 0
#9   ok  WP-0A-CON-006-usage-and-notification        tests 121  pass 121  fail 0
#10  ok  WP-0A-A0-004-ci-independent-guard-step      tests 124  pass 124  fail 0
#11  ok  WP-0A-A0-005-cardholder-data-scan           tests 144  pass 144  fail 0
#12  ok  WP-0A-CON-007-reference-bounds              tests 155  pass 155  fail 0
#13  ok  WP-0A-CON-008-freeze-readiness              tests 186  pass 186  fail 0
```

26 → 186, `skipped 0` and `todo 0` at every step, exit 0.

**No conflict in any file this time**, generated or otherwise — including the two that
collided by construction on the previous run (`test-kits/integrity-manifest.json` and
`evidence/VERIFICATION.md`). The regenerate-not-merge procedure below still stands, because
whether those two collide depends on which packages a given sequence touches; this run simply
did not produce the overlap. **A conflict in any other file remains a real disagreement — stop.**

## Re-run at wave 44, after review twelve's eight fixes

Fresh clone reset to `origin/main` (`ff55332`), thirteen merges in PR order, `npm run check`
after each: **26 → 198**, `skipped 0` and `todo 0` at every step, no conflict in any file,
exit 0.

Two further facts checked at the same time, because a drill that only proves the sequence still
says nothing about the shape:

**The chain is intact.** `git merge-base --is-ancestor` for all twelve consecutive pairs: every
branch contains the one below it. This is checked every wave now — it was broken once, silently,
and three pull requests were green against their own bases while missing the CI step they were
supposed to be running.

**The pull requests are stacked, not parallel.** Each targets the branch below it
(`#13 → #12 → … → #3 → #2 → main`, with `#1` and `#2` on `main`). GitHub retargets each one to
`main` as the branch below it merges, so **merging them in numeric order through the UI is all
that is required** — there is no rebase step for the Product Owner to perform.

## Re-run at wave 56

Fresh clone reset to `origin/main` (`ff55332`), thirteen merges in PR order, `npm run check` after
each: **26 → 233**, `skipped 0` and `todo 0` at every step, no conflict in any file, exit 0.

The stack has grown by 47 tests since the wave-44 drill and the guards have changed underneath it
substantially — the chain parser, the `.npmrc` and symlink checks, the per-file floors, the RFC and
annotation pins. **None of that is visible from thirteen green pull requests**, which is why this
is re-run whenever the top of the stack moves rather than when it feels necessary.

Counts at this drill, measured rather than remembered:

| | |
| --- | --- |
| digested files | 66 |
| `DIGESTED_FLOOR` entries | 66 (set-equal, both directions) |
| `PROTECTED_KEYS` | 20 |
| test files / declared tests | 24 / 233 |
| contracts / fixtures | 14 / 676 |
| guard scripts | 16 |
