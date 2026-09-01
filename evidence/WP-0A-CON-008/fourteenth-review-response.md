# Independent review #14

Three HIGH, three MEDIUM, two LOW. All closed. Every mutation was reproduced first and re-run
against the fix. The review verified every count in the thirteenth-review response independently
and found them all correct.

## HIGH 1 — three edits removed every ownership guard, and the manifest could not tell

`PROTECTED_KEYS` names seventeen files whose absence is itself the defect. **The four protocol
validators were not among them** — `validate-work-package-ownership.mjs`,
`validate-work-packages.mjs`, `validate-capability-profiles.mjs`,
`validate-work-package-role-separation.mjs` — digested only because they happened to be listed.
`regenerate:manifest` re-adds discovered test files and nothing else, so a deleted entry stays
deleted.

And the **directory entry point** of the ownership validator — the one `npm run validate:protocol`
calls — was executed by no test. Every unit test calls the pure `validateManifestOwnership` on
synthetic manifests.

Three edits: delete those four keys; insert `if (directory === 'work-packages') return;` as the
first line of `validateWorkPackageOwnership`; set this package's amendments to `["**"]`.

**exit 0, 208/208, zero failing tests.** Then, with an undeclared edit to `ctr-obs-001/schema.json`
committed on the branch:

```
WP-0A-CON-008: all 932 changed path(s) are declared, and every amendment explains one
SCOPE_EXIT=0
```

Every rule I had added the wave before — `namesSomething`, the protected-file shield,
`deadAmendments` — was inside the function that no longer ran.

Fix, both halves:

1. **`DIGESTED_FLOOR`** — all 49 current manifest keys, pinned by name.
   `assertDigestedSetNeverShrinks` fails at exit **87** when any is missing. Protection is a
   ratchet: adding is free, removing is a deliberate edit in a diff a reviewer reads.
2. **Two process rows** in `ci-guard-behaviour.test.mjs` spawning
   `node scripts/validate-work-package-ownership.mjs <dir>` over a real directory — exit **74**
   for a `["**"]` amendment, exit **0** for a clean manifest, because a validator that always
   fails would pass the first row and block every package.

Verified: the exact three-edit attack now exits **87**, naming all four removed files.

*This is the third time the same lesson has been learned in this package: **a digest pins bytes;
only running the thing pins behaviour.** Review twelve taught it for the two CI guards, and I did
not apply it to the script beside them.*

## HIGH 2 — the annotations inside `schema.json` carry security admissions and were pinned by nothing

One wave ago I wrote: *"prose in an `x-` annotation is not enforced, by design … written down
rather than guarded badly."* **That was the wrong call**, and the review showed why by rewriting
`CTR-SEC-001`:

- `x-opacity-limitation`: *"THIS PATTERN IS NOT A SECURITY CONTROL, AND MUST NOT BE CITED AS ONE"*
  → *"THIS PATTERN IS A SECURITY CONTROL AND MAY BE CITED AS ONE … no further opacity mechanism is
  required before freeze."*
- `x-cross-tenant-limitation` — the record that nothing binds a claimed scope to its handle, raised
  by independent security review — **deleted**.

**exit 0, 208/208.** This is review thirteen's MEDIUM 3 relocated one file over: the manifest
caveats were pinned, the schema annotations were not — while `x-reference-rule` and
`x-tiebreaker-rule` are cited elsewhere in this repository as *the* source of a rule. The catalog
treats this channel as normative, so it is now pinned like one.

`ANNOTATION_DIGESTS` pins a per-contract digest over every `x-` key and value, path-qualified and
sorted, **with the count beside it** so a deletion and an addition cannot cancel out. 157
annotations across 14 contracts.

The cost is stated and accepted: **fixing a typo in a comment is now a ratchet edit.** That is the
price of the channel being normative, and the alternative — my earlier one — is that a security
admission can be inverted at exit 0.

Verified: the exact rewrite now fails with *"carries 17 annotation(s), pinned at 18"* and the
digest change.

## HIGH 3 and MEDIUM 4 — the gap prose was pinned; the evidence was not

`ACCEPTED_GAP_DIGESTS` pins what a contract *says* it accepts. Nothing pinned the fixture that
demonstrates it. Five fixture bodies changed with every reason left untouched:

- `page_size` 500 → 20, under a reason that still reads *"page_size 500. The contract ACCEPTS it."*
- the credential-smuggling demonstration removed from the structureless-handle fixture
- `classification` `internal` → `restricted`
- the error-code cardinality gap removed
- the break-glass action replaced

**exit 0 for all five.** And nothing pinned the fixture **set**: deleting five negative fixtures —
including the proof that a secret handle must declare `event_safe: true`, and four of
`CTR-USG-001`'s money rules — also passed. Twelve at once does fail, so the coverage ratchet bites
eventually; **it does not bite at five, and five is what an author would delete.**

`FIXTURE_SET` pins every fixture **by name** per contract, both directions, plus a digest of each
accepted-gap fixture body. Names, not a count, for the reason every ratchet here is named.

Verified: the `page_size` change fails with *"no longer demonstrates its gap"*; the five deletions
fail naming each.

## MEDIUM 5 — the index header, and every entry's name and version

Pinned before: owner, status, `required_before_freeze`, consumers. Not pinned: `catalog_version`,
`source`, the index's own `freeze_boundary`, and each entry's `name` and `version`. The review set
the freeze boundary to *"This index freezes every contract listed. No further owner sign-off is
required."*, `catalog_version` to `9.9.9`, and gave `CTR-MOD-001` version `2.0.0` while its
manifest still said `1.0.0`. **exit 0.**

Now pinned, and each entry's version is **cross-checked against the manifest that contract
actually ships**. Verified: exit 1, naming the version, the boundary digest and the entry.

## MEDIUM 6 — a manifest took arbitrary normative fields

`"normative_rules": ["Every paginated page MUST carry zero rows…"]` added to `CTR-PAG-001` and
`composes` deleted: **exit 0**. A manifest is what a human reads when deciding whether a contract
can freeze; an invented normative field there is a rule with no schema behind it. The key set is
now declared — 14 keys — and a `composes` list cannot vanish. Verified: exit 1, naming the field.

## LOW 8 — the catalog root itself could be a symlink

The walk `readdir`s `CATALOG` and `lstat`s its children; the root was never `lstat`ed.
`mv contract-catalog catalog-real && ln -s catalog-real contract-catalog` left every contract
suite at **71/71 passing**, contained only by the secret scanner again. Fixed by `lstat`ing the
root first. Verified: that test alone now fails.

## LOW 9 — one script's main-detection was path-fragile

`verify-branch-identity.mjs` used `import.meta.url === \`file://${process.argv[1]}\`` while the
other twelve use `resolve(process.argv[1]) === fileURLToPath(import.meta.url)`. From a directory
containing a space, `main()` never ran and it exited **0 with no output** where 75 was required —
CI would then capture an empty package id and fail for the wrong reason. Same idiom as the others
now. Verified from `/tmp/space dir`: exit **75**.

## Verification

`npm run check` — **214/214, fail 0, skipped 0, todo 0, exit 0**.
