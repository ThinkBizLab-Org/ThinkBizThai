# Independent review #18

Three HIGH, two MEDIUM, one counting error. All closed.

## HIGH 1 — three commands inside the repository turned every guard into a silent no-op

```
git mv scripts tools && ln -s tools scripts
```

Then reverse real rules: `CTR-SEC-001`'s handle pattern to `^.*$`, its six redaction consts to
`false`.

| step | before | after |
| --- | --- | --- |
| `node scripts/verify-test-coverage-floor.mjs` (the CI guard step) | 0, checks run | **0, nothing executed** |
| `npm run check` | 0, 233 pass | **0, zero tests, no `ℹ pass` line** |
| `node scripts/verify-branch-identity.mjs` | prints a package id | **0, empty stdout** |

**Cause:** ten guards ended with
`if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))`.
`resolve()` normalises and does **not** follow symlinks; `import.meta.url` is the realpath. Through
`scripts/ → tools/` they never match, so `main()` never ran and each process exited 0.

Two things made it invisible. `assertDigestedFilesAreRegular` — added the day before for exactly
this class — `lstat`ed only the **leaf**, and every leaf was still a regular file reached through a
symlinked parent. And the secret scanner *would* have caught it: `node tools/scan-repository-secrets.mjs`
reports `unscannable-symlink — scripts` at exit 71, while `node scripts/…` exits 0. **The scanner
that catches the link is invoked through the link that disables it.**

Fixed in both places: every entry point compares `realpathSync` on both sides, and the digest check
`lstat`s **every path component**, not the leaf. Verified: the same three commands now exit **91**,
naming `scripts is a symbolic link`, from both the guard and `npm run check`.

## HIGH 2 — the per-file floor pinned the count, and hollowing preserves counts

The floor added one wave earlier pins each suite's `test()` count. The review rewrote
`schema-mutation-coverage.test.mjs` as exactly ten `test('placeholder N', () => assert.ok(true))`
— count unchanged, `record:verification` not even needed — and added
`ctr-api-001 properties.data.maxProperties = 3`, so a success envelope carrying four fields is
rejected by the contract every module composes. **exit 0, 233/233.** It also ran the full
nine-suite version of review seventeen's attack in count-preserving form: **exit 0, 232/232.**

**Hollowing preserves the count. It cannot preserve the assertions**: a placeholder makes one
trivial assertion where the real test made many. `DECLARED_ASSERTION_FLOOR_BY_FILE` pins the
`assert.` call sites per file — 508 across 24 files — and a file with no floor is itself a failure.
Same ratchet shape one level down, no new machinery. Verified: the count-preserving mutation now
exits **84**.

## HIGH 3 — `.NPMRC`

`assertNoPackageManagerConfig` compared names with `Array.includes`, and `'.NPMRC' !== '.npmrc'`.
On macOS's case-insensitive filesystem npm reads it: `npm config get script-shell` →
`/usr/bin/true`, `npm run check` exit 0 with zero guards, `npm run verify` exit 0 with **no output
at all**. Round seventeen's finding, reproduced verbatim through a different spelling.

Compared case-insensitively and NFC-normalised now. **The guard asserts the absence of a class;
comparing one spelling of it is not that.** On a case-sensitive CI filesystem npm would not read
`.NPMRC`, so this is a local-evidence bypass — and local evidence is what every handoff in this
package records.

## MEDIUM 4 — one exempting word anywhere exempted the whole value

`OUTSTANDING.test(value)` ran over the entire string, so
*"…signed off on the security review at exit 0 and cleared the freeze. Only the Product Owner merge
button is still **pending**."* exempted the sentence before it. Three roles, three approval verbs,
**exit 0**.

Evaluated clause by clause now — an exemption in a neighbouring clause does not cover an
affirmative approval in this one. Verified: the review's exact three-entry payload produces **seven
flagged clauses**, exit 1.

Adding `not` to the exempting vocabulary was needed for a real handoff sentence — *"is likewise not
countersigned here"* — and it is the weak point, stated plainly in the test: **a vocabulary is not
a control.** The alternative, flagging honest sentences that say an approval is outstanding, would
train the reader to ignore the check, which is worse.

## MEDIUM 5 — the decision-record walk was recursive but not repo-wide

It starts at `architecture/decisions`, so `architecture/RFC-2026-011-exemption.md` — one directory
up, the likeliest place of all — and `docs/sprint-0a/RFC-2026-011-exemption.md` were both invisible.
**exit 0** each.

Ratcheted on **content and name, repo-wide**: a document named `RFC-YYYY-NNN` or opening as one
*and* declaring an approved status is a decision record wherever it sits.

Two of my own mistakes while writing it, both caught by running it:

1. The first version matched `evidence/WP-0A-A0-001/rfc-002-exact-commit-verification.md`, which
   opens `# RFC-2026-002 exact-commit verification` — **an evidence record about an RFC, not an
   RFC.** Two signals are required now, heading *and* status line.
2. The second version skipped all of `architecture/`, which let the very file the review used pass.
   Only `architecture/decisions` is skipped now.

Verified: all three placements exit 1.

## Counting error corrected

*"`lstat`, all 65 of them"* — there are **66**. Corrected where it was written.

## Verification

See `evidence/VERIFICATION.md`. `npm run verify` reports the exit code directly.

---

## Probing my own fix for HIGH 2, before the next review could

The assertion floor closed the count-preserving hollow. The obvious next step is to preserve
**both** counts, so I ran it: ten placeholders making fifteen `assert.ok(true)` calls — exactly the
numbers the real suite declares — plus `ctr-api-001 properties.data.maxProperties = 3`.

**exit 0.** Every floor satisfied, a real rule in the envelope every module composes, nothing
failing.

**Counting anything can be satisfied by repeating anything.** What hollowing cannot preserve is
**what the tests are called**: `placeholder 1..10` is not
*"every contract reaches the mutation-coverage floor"*. `TEST_NAME_DIGEST_BY_FILE` digests the
sorted distinct test names per file, so a rename, an addition or a deletion is a deliberate edit
in a diff a reviewer reads.

It is the same lesson as the constraint surface, the untested-constraint list and the amendment
ratchet, arriving one level further down: **a name cannot be paid for with a count.**

Verified against the committed guard, in a clone: the both-floors mutation exits **84**, naming
the file and both digests. Renaming four tests honestly also exits 84 — which is the point, not a
false positive.

**My first version was wrong and running it said so.** It digested an empty list for all
twenty-four files and reported every one as renamed: it read `stripNonCode` output, and
`stripNonCode` removes string literals — which is exactly where a test's name lives. Fifth time in
this package a guard has been caught reporting a wrong reason, and each time by running it rather
than reading it.
