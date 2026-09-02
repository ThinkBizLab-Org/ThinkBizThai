# Verification record

This file is **written by `npm run record:verification`** and asserted by
`test-kits/verification-record.test.mjs` against a live run. Do not edit it by hand;
an edited value fails the check.

It exists because four evidence files in this repository have quoted a test count that
was true two edits earlier — every time by the same mechanism: run the check, write
the prose, make two more edits, ship the old number. Evidence should point here rather
than restate a figure.

| count | value |
|---|---|
| tests | 233 |
| pass | 233 |
| fail | 0 |
| skipped | 0 |
| todo | 0 |

A per-package evidence file may still record the count that was true **when that
package was verified** — that is a historical fact and stays accurate. What must never
be stale is a claim about the tree as it stands, and that claim lives only here.
