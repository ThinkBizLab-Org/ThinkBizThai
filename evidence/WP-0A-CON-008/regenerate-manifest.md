# WP-0A-CON-008 — the command four documents assumed existed

## What was missing

Four places in this repository tell someone to *"rebuild the digests"* or *"rebuild it
from disk"*:

- `OVERNIGHT-SUMMARY.md`, in the working rules and in the merge instruction the Product
  Owner will follow;
- `evidence/WP-0A-CON-008/merge-order-drill.md`, twice.

**There was no command.** Every rebuild in this stack — and there have been many, one
per restack — was an inline script written from memory at the moment it was needed:
during a rebase, under a conflict, which is precisely when an improvised script is
least trustworthy and least reviewed.

## What exists now

`npm run regenerate:manifest`. It recomputes every digest over file bytes, drops what
the manifest names but no longer exists, adds any discovered `*.test.mjs` that carries
no digest, and sorts the keys so a rebuild produces the same bytes whatever order it
walked in.

**It reports what entered and what left**:

```
rebuilt 44 digest(s)
  + test-kits/temp-drill.test.mjs (discovered test file, was not digested)
```

and says why that matters — a file appearing or disappearing there is a change to what
is protected, not a formatting update. An improvised one-liner said nothing, so a file
silently leaving the protected set looked identical to a successful rebuild.

## The loop, drilled

Adding a test file and recovering:

| step | result |
|---|---|
| add `test-kits/temp-drill.test.mjs` | `npm run check` → **exit 87**, "not digested" |
| `npm run regenerate:manifest` | `+ test-kits/temp-drill.test.mjs` |
| `npm run record:verification` | `recorded 175 passing` |
| `npm run regenerate:manifest` | (the record changed, so digest it again) |
| `npm run check` | **exit 0** |

And removing it: `- test-kits/temp-drill.test.mjs (named by the manifest but not on
disk)`, then the same two commands, exit 0.

## What it is not

It **rebuilds digests; it does not decide what deserves one.** A file already named
keeps its place, a discovered test file is added because the coverage guard requires
every test file to carry a digest, and nothing else is invented. Deciding that a new
non-test file should be protected is still a human edit.

It also cannot make the tripwire an anchor. A commit that edits a guarded file *and*
runs this command passes — that is the fixed-point property recorded in the manifest's
own note, and this changes nothing about it.
