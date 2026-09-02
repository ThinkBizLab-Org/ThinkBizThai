# Independent review #21

Five HIGH, three MEDIUM. This wave closes HIGH 1, HIGH 2 and MEDIUM 3; HIGH 3, HIGH 4, HIGH 5 and
MEDIUM 1–2 follow. **The review's structural conclusion is correct and worth quoting**, because it
is the honest summary of where this repository is:

> `ratchets-bite.test.mjs` is the only guard in this repository that measures behaviour, its depth
> is pinned by a text count in a file the author edits in the same commit, and it covers 12 of 25
> suites.

## HIGH 2 — `reversals.slice(0, 0)`, and the whole behaviour ratchet is a no-op

`REVERSAL_FLOOR` counted `/^\s+\['/gm` over the source. The review wrote `.slice(0, 0)` into the
loop that consumes the tuples: **the 23 tuples stayed in the file, the count still read 23, and not
one of them executed.** Twelve behaviour cases became no-ops that still printed a tick, and a
hollowed `catalog-registry.test.mjs` then shipped `CTR-SEC-001` as `Frozen` with its **A1 security
co-owner dropped**, at exit 0.

**A count over source text is satisfied by dead syntax** — this repository's own lesson, applied to
the one pin that was supposed to escape it.

The control is inside the thing it constrains now: `mustNotice` asserts **at runtime** that it was
handed at least two reversals. The source-level test keeps only what a source count can honestly
say — that the helper is still called, and that the list still reaches the loop. Verified:
`.slice(0, 0)` exits 1.

## HIGH 1 — three named reversals cost three lines to reimplement

The review reduced `catalog-registry.test.mjs` from **803 lines to 90** — fourteen tests carrying
the original names, twenty assertions, and exactly the three pins this case reversed — and shipped
**A6 dropped as co-owner of CTR-AUD-001, CTR-OBS-001 and CTR-USG-001**, with `CTR-MOD-001`'s freeze
requirements emptied. exit 0.

*"A stub that reimplements them all is the suite"* was false: reimplementing three named pins costs
three lines. **Reversal diversity, not reversal count.** The registry case now generates a
cross-product — every contract × {promoted out of its freeze level, reassigned to an owner that
does not exist} plus the index and caveat reversals, **30 in one case**. A stub that reimplements
that *is* the suite.

Verified: the review's 90-line stub now fails at *"ctr-api-001 promoted out of its freeze level"*.

**My first generated reversal was a no-op** — `owner = 'A0'` on the contracts A0 already owns — and
the case failed on `ctr-api-001` for that reason. Fifth time a reversal here has been aimed at
something that was not a change; a value no contract can legitimately carry is a change for all of
them.

## MEDIUM 3 — 35 whole-repository copies per run, and a filled disk

`repositoryCopy()` never removed anything: **~840 MB per run**, and the review filled its machine to
ENOSPC. The failure mode is `spawnSync` returning `status: null`, which this file reported as *"the
suite must pass on an unmodified copy"* — **a misleading reason for a disk-full condition**, which
is the failure shape recorded five times in these files.

Every copy is removed now, and `assertFailed` says *"the child never ran … check disk space and
process limits before reading it as one"* when the status is null. Measured after the fix: **0
leaked directories** where there had been 35.

## And one more wrong reason, in the fix itself

My replacement for the `REVERSAL_FLOOR` test forbade `reversals.slice(` in the source — and matched
**the comment in that file describing the very bypass it forbids.** A guard tripping on its own
explanation. Comments are stripped before the check now. Sixth wrong reason recorded here, and the
sixth caught by running rather than reading.

## Verification

See `evidence/VERIFICATION.md`. `npm run verify` reports the exit code directly.
