# WP-0A-CON-008 — the test count is no longer typed by hand

## The failure this closes

Four times in this repository an evidence file has quoted a test count that was true
two edits earlier. Independent review caught the fourth and pointed out that the same
file already carried a section headed *"this package was pushed with CI red, and the
claim was mine"* about exactly this.

Every occurrence had the identical mechanism: run the check, write the prose, make two
more edits, ship the old number. The fix is not more care. Care has been tried four
times.

## What replaced it

`npm run record:verification` runs the suite and writes the counts to
`evidence/VERIFICATION.md`. Nobody types the number.

The comparison lives in `scripts/run-test-suite.mjs`, because that is the only place
that knows the real figure — after the run, from the runner's own summary. A record
that disagrees with the run exits **89**. Evidence prose points at the record instead
of restating a figure.

A per-package evidence file may still record what was true **when that package was
verified**; that is a historical fact and stays accurate. What must never be stale is
a claim about the tree as it stands, and that claim now lives in exactly one file that
a person cannot write.

## Verified by construction, both directions

| attempt | result |
|---|---|
| edit the recorded count by hand, 153 → 151 | `does not match this run (tests: recorded 151, ran 153; pass: recorded 151, ran 153)`, exit **89** |
| add a test file without re-recording | `does not match this run (tests: recorded 153, ran 154)`, exit **89** |

## What it does not do

- It does not check the counts quoted in the twenty-one existing per-package evidence
  files. Those are historical and correct as history; rewriting them would destroy
  information rather than add it.
- The writer refuses to record a run that did not pass cleanly, so a red tree cannot
  be papered over — but it also means the record is only as trustworthy as the suite
  it counts.

The record's own bootstrap was circular: its test is part of the suite, so the writer
would not write until the suite passed, and the suite could not pass until the record
existed. Broken once, deliberately, by rendering the counts the run would have with
the record in place. Recorded because a one-time manual step in a control designed to
remove manual steps is exactly the thing a reviewer should know about.

## The guard caught its author in the same wave it was built

`npm run check` failed on PR #13 with:

```
evidence/VERIFICATION.md does not match this run
(tests: recorded 154, ran 156; pass: recorded 154, ran 156). exit 89
```

Cause: a stacked rebase brought the record forward from an earlier branch, and I
regenerated it *before* the rebase-continue rather than after, so the committed file
carried the pre-rebase count. Then I pushed without checking the exit code — I grepped
the summary lines, saw `tests 156`, and did not notice the run had exited 89.

**Two things worth recording.** The control works: this is precisely the class it was
built for, and it fired in CI within the same wave. And it caught the failure mode one
layer up from where I fixed it — I stopped typing the number, then read a partial
output instead of an exit code.

The rebuild-from-disk rule this repository already records for the integrity manifest
applies to the record too: both are generated, both conflict by construction on a
stacked rebase, and both must be regenerated **after** the rebase completes, not
during it.
