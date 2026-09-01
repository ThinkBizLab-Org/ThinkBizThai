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
