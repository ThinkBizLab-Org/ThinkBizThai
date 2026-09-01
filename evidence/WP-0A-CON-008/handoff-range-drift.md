# A handoff that cites a true range and describes none of the branch

Two checks added earlier this wave make a handoff unable to invent history: one resolves every
40-hex revision with `git cat-file -t`, the other diffs the cited range and compares it against
`files_added` / `files_modified`. Both pass on a handoff that is completely stale.

`WP-0A-CON-008`'s own handoff cited `653f699..ae5864d`. Both checks were green. **Twenty-four
substantive paths had changed after `ae5864d`** — including `verify-branch-identity.mjs`,
`catalog-groups.test.mjs`, the CI workflow, and the two revision checks themselves. The handoff
was truthful about a range that had stopped four commits earlier, which is the same defect class
as a test count quoted from two edits ago: accurate about the wrong moment.

## Fix

`scripts/refresh-author-handoff.mjs`, wired as `npm run refresh:handoff` (and `check:handoff`,
exit 91). It resolves the current branch to its package through `verify-branch-identity.mjs`,
recomputes the range from `base_revision` to `HEAD`, and rewrites `files_added`,
`files_modified` and `files_deleted` from `git diff --no-renames --name-status`. Nobody types
the range, for the same reason nobody types the test count.

`the handoff for this branch describes this branch` in `handoff-conformance.test.mjs` fails when
anything **substantive** has changed after the cited head. Substantive excludes the four kinds
of file that are written *after* the work they describe — `handoffs/**`, `evidence/**`,
`OVERNIGHT-SUMMARY.md` and the integrity manifest — because a handoff cannot list the commit
that contains it.

## Verification

Rolling the cited head back to `ae5864d`:

```
exit 1
✖ the handoff for this branch describes this branch
    WP-0A-CON-008's handoff cites head ae5864d, after which 24 substantive path(s) changed
✖ a handoff file list matches the range it cites
```

`npm run refresh:handoff` → `653f699..950ab8d — 41 added, 28 modified, 0 deleted`.
`npm run check` — **187/187, fail 0, skipped 0, todo 0, exit 0**.

## Known limitation

The check runs against the **current branch only**. The other nine handoffs describe branches
that are not checked out, and no single working tree can verify them all; each is checked when
its own branch is. In CI that is exactly one branch per pull request, which is the case that
matters.
