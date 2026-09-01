# Independent review #13

**The ninth successful bypass in thirteen rounds.** A one-token edit put a real business rule into
an envelope contract with a byte-identical constraint record and no declaration anywhere.

Two HIGH, three MEDIUM, two LOW. All closed. Every mutation below was re-run against the fix.

## HIGH 1 — a boolean subschema is a rule no ratchet here could see

In JSON Schema, `false` is a schema that rejects every instance and `true` is a schema that
accepts every instance. `json-schema-subset.mjs` tested **truthiness rather than presence**, so it
read both as *"no schema here"* — while every real validator enforces them.

Three mutations, each **exit 0 at 198/198** with the constraint digest unchanged:

| contract | mutation | what it means |
| --- | --- | --- |
| `ctr-pag-001` | `properties.items.items = false` | every paginated page must carry zero rows |
| `ctr-api-001` | `allOf[2].then.allOf = [false]` | an `accepted` envelope is always rejected |
| `ctr-ten-001` | `allOf = [false]` | every tenant context rejected — on the contract nine others `$ref` |

The first was planted on the exact property whose `x-leakage-boundary` says *"this contract does
NOT constrain the shape of `items`"*, and no fixture can ever reach it because all four `valid-*`
fixtures have an empty `items`. `ctr-pag-001/**` was already in this package's amendment list, so
the branch-scope guard was satisfied too.

Nothing saw it: `surfaceOf` (no `items`/`allOf` in `ASSERTIONS`, and `isEmptySubschema` returns
false for booleans **deliberately** — *"a boolean schema is explicit, not empty"*),
`constraintSites` (`walk(false)` returns `[]`), `emptyCombinators` (`isEmptyObject(false)` is
false), `assertSchemaSupported` (`typeof false !== 'object'`).

**This is precisely the defect `json-schema-subset.mjs` exists to prevent**, and its own header
states the invariant it was violating: *"a schema must not appear to constrain something this
validator ignores."* The keyword was supported; its **value form** was not.

Fixed in four layers, because one would have been another single point of reasoning:

1. **`validate`** — `schema === false` returns an error, `schema === true` returns none;
   `'items' in schema` and `branch !== undefined` replace the truthiness tests.
2. **`assertSchemaSupported`** — throws on a boolean in any subschema position.
3. **`surfaceOf`** — records `= false (boolean schema: rejects everything here)` and
   `allOf[0] = false (boolean schema branch)`.
4. **`catalog-groups.test.mjs`** — forbids boolean subschemas in the catalog outright. This is the
   version that cannot be reasoned around: a boolean subschema has no legitimate use here.

`additionalProperties` is excluded from 3 and 4 by design — `additionalProperties: false` is the
closure rule every contract uses, it is an assertion keyword, and `surfaceOf` already records it
with its value. Including it produced 40 duplicate lines on the first attempt, which is how that
exclusion was found.

Re-run after the fix:

| mutation | exit | failing tests |
| --- | --- | --- |
| `ctr-pag-001 items.items = false` | 1 | 7 |
| `ctr-api-001 allOf[2].then.allOf = [false]` | 1 | 19 |
| `ctr-ten-001 root allOf = [false]` | 1 | 29 |
| `ctr-api-001 causation_id.not = true` (MEDIUM 4) | 1 | 15 |

## HIGH 2 — `amends_without_owning.paths` was validated by nothing, and `["**"]` silenced the scope guard

`declaredPaths()` unions `writable_paths` **and** `amends_without_owning.paths`.
`validate-work-package-ownership.mjs` validated the first — shape, output containment,
cross-package overlap, exit 70 — and **never read the second at all**. `globToRegExp('**')`
compiles to `/^.*$/`.

Appending `"**"` to this package's amendment list: **exit 0, 198/198**, and against a real
repository a branch changing `not-mine.txt` and `ctr-api-001/schema.json` reported *"all N changed
path(s) are declared"*.

Fix: amendment paths are validated for shape, and rejected if they **name nothing** — a pattern
with no literal segment (`**`, `*`, `*/*`, `**/*`). An amendment is a claim about another
package's files, so a non-empty list now also requires a rationale of real length. Verified:
`"**"` → **exit 74**, *"which names no path at all"*.

## MEDIUM 3 — `accepted_gaps` was the fourth field of its kind and the pin covered three

`CAVEAT_DIGESTS` pinned `freeze_boundary`, `untestable_by_fixture`, `untestable_by_schema`.
`accepted_gaps` — what a contract knowingly accepts that it should not — was checked only by
heuristics: length over 80, a keyword regex, twenty unique words. **The identical weakness review
twelve found, relocated one field over.**

Review thirteen rewrote `CTR-SEC-001`'s record that the opaque-handle pattern gives *zero*
coverage against a credential smuggled inside a conforming handle body, replacing it with
*"nothing about credential material remains unresolved before freeze"*, satisfying all three
heuristics: **exit 0**. That is the security co-owner's open item, deleted by rewrite, in silence.

Fix: `ACCEPTED_GAP_DIGESTS` pins all six gaps across four contracts by digest, with the key set
asserted in both directions — a dropped gap, a rewritten gap and a **new** gap all fail. Verified:
the rewrite now reports the gap by name with its before and after digest.

## MEDIUM 4 — `not: true` is `not: {}` and produced no surface line

Semantically identical, and only one of them was recorded, because `isEmptySubschema` returns
false for booleans. Closed by the same fix as HIGH 1; the surface now carries a line for both.

## MEDIUM 5 — the symlink containment lived in another package by accident

A symlinked group evaded every contract suite: `readdir(..., {withFileTypes:true})` reports a
symlink-to-directory as neither `isDirectory()` nor `isFile()`. It was contained — at **exit 71**,
by the secret scanner, which fails closed on any symlink, **for an unrelated reason, in a package
this one does not own. Not one contract test failed.**

A containment that lives somewhere else by accident is one allow-list entry away from being none.
`no path under the catalog is a symbolic link` now walks the catalog with `lstat`. Verified
independently of the scanner: with the symlink present, that test alone fails.

## MEDIUM 6 — the CI guards were still stubbable in the gaps between the five pinned rows

Review twelve pinned identity `{75, 0, 2}` and scope `{73, 0}`. `AMBIGUOUS_CLAIM` (76) and
`UNREADABLE` (77) were never exercised as processes, and the scope guard's **predicate** was
unpinned. Two edits — a `.filter(f => !f.startsWith('contract-catalog/'))` and an early
`return 0` for 76/77 — passed all five rows at **exit 0, 198/198**, after which an undeclared
change to `ctr-api-001/schema.json` reported *"all 4 changed path(s) are declared"*.

**Every hole a test leaves is a hole shaped exactly like the test.** Three rows added: exit 76
with two claimants (asserting nothing resolvable is printed for CI to capture), exit 77 on an
unreadable manifest, and a stray path **inside `contract-catalog/`**. Verified: both stubs now
fail, naming all three.

## LOW 7 — the review confirmed seven shapes are already caught, and said so

`patternProperties`, `$defs`, `contentSchema`, `type: []`, `pattern: "(?!)"`, `required: []` and a
`$ref` cycle each fail at exit 1 (5 to 8 failing tests), by the constraint-surface pin rather than
by the empty-combinator walk. `const` and `maxProperties: 0` are assertion keywords and are
recorded. Written down here so the next review does not re-derive it.

## LOW 8 — two claims in the twelfth-review response were wrong

Both corrected where they were written, struck through rather than deleted:

- *"Adding an untested rule expressed in any supported keyword"* — false; HIGH 1 is exactly that.
- *"Self-widening `writable_paths`: exit 70"* — true of that field, and it read as a closed hole
  while the field beside it had no check at all; HIGH 2.

Everything the review counted was correct: 198/198, `PROTECTED_KEYS.length` 17, 705 catalog JSON
files, 0 matching `/fixtures/`, 676 under `examples/`, 29 manifest/schema/index files, 15 of 15
scripts digested, 28 caveat digests.

## Verification

`npm run check` — **205/205, fail 0, skipped 0, todo 0, exit 0**.

---

## Probing HIGH 2's own fix, immediately after committing it

`namesSomething` closed `["**"]`. Ten minutes later, probing it with the patterns a reviewer
would try next:

| pattern | before | after |
| --- | --- | --- |
| `**`, `*`, `*/*`, `**/*` | rejected | rejected |
| `contract-catalog/**` | **passed** | rejected |
| `scripts/**` | **passed** | rejected |
| `test-kits/**` | **passed** | rejected |

One literal segment was enough. Two rules now, because file count and protection are different
kinds of breadth:

1. **A glob may cover at most 128 repository files.** The threshold comes from the tree, not from
   taste: every legitimate amendment glob declared today covers between 1 and 70 files, and the
   only one above that covered everything.
2. **A glob may never cover a `PROTECTED_KEYS` file.** `scripts/**` covers *fifteen* files — under
   the cap — and those fifteen are every guard in the repository. A guard, a protocol schema or a
   registry is amended **by name** or not at all.

Rule 2 needs no file list, so it holds however the validator is called. Rule 1 needs the tree and
is measured where the tree is known.

**Both found a declaration already in the repository that nobody had noticed:**

- `WP-0A-CON-007` amended `contract-catalog/shared-kernel/**` — **705 files, the entire catalog**,
  including `ctr-ntf-001`, which belongs to A5 and which that package never touched. Replaced with
  the thirteen contract directories its own `git diff` range shows it changed.
- `WP-0A-CON-008` amended `.agents/**` — four protected protocol schemas, **and the package had
  changed none of them.** A pure over-claim; removed entirely.

Neither was planted. Both were live, declared, and green.

## Verification

`npm run check` — **206/206, fail 0, skipped 0, todo 0, exit 0**.

## Probing that fix, in turn — two more holes in my own guard

The two rules above were committed, then probed the same way. Both leaked:

| probe | result | why |
| --- | --- | --- |
| fourteen per-contract globs, each under the cap | **exit 0** | they sum to all 705 catalog files. A cap on one pattern cannot see the total. |
| `test-kits/contracts/**` | **exit 0** | ten files, under the cap, none in `PROTECTED_KEYS` — and every one of them a ratchet. |

Two further fixes:

3. **The shielded set is every file the integrity manifest digests**, not only `PROTECTED_KEYS` —
   which means every test suite. `test-kits/contracts/**` now covers *ten protected files* and is
   rejected; `test-kits/**` twenty-four; `scripts/**` fifteen; `contract-catalog/**` one.
   `PROTECTED_KEYS` stays the floor for the case where the manifest cannot be read, so an
   unreadable manifest cannot empty the shield.
4. **`deadAmendments` in the branch-scope guard**: an amendment matching **none** of what the
   branch changed is not a record of anything. A cap on breadth cannot see intent; the diff can.

On its first run against this branch, rule 4 named **six standing declarations that explained
nothing**, on this package, live — among them `contract-catalog/shared-kernel/ctr-ten-001/**` and
`work-packages/WP-0A-A6-001.json`. It is also what would have caught `.agents/**` without anyone
thinking to look: four protected schemas declared, none of them ever touched.

Four rounds of probing one field, each round finding the next hole, is what it took. The first
three were written confidently.

## Self-probing wave 48: what held, and one thing that is deliberately not enforced

Run against the fixes above, each planted and reverted:

| probe | exit | failing tests |
| --- | --- | --- |
| `properties.causation_id = false` (a boolean where a subschema was) | 1 | 5 |
| `properties.data = true` | 1 | 9 |
| delete a `required` entry | 1 | 3 |
| delete a property entirely | 1 | 5 |
| widen an enum by one value | 1 | 13 |
| loosen `maxLength` 32 → 4096 | 1 | 15 |
| `additionalProperties: false` → `true` | 1 | 17 |
| `additionalProperties` removed | 1 | 13 |
| delete one `invalid-*` fixture | 1 | 15 |
| promote a contract Draft → Candidate in the index | 1 | 7 |
| narrow `required_before_freeze` in the index | 1 | 3 |

**Rules created by omission are as guarded as rules created by addition.** That was worth
checking rather than assuming: every ratchet here is built around *adding* a constraint, and
deleting one is the more natural way to loosen a contract.

**One probe of mine was designed wrong and I am recording it rather than the phantom finding it
produced.** I "narrowed" `required_before_freeze` in a contract *manifest* and it passed at exit
0 — but that field does not exist in a manifest at all. I had added an inert key nobody reads, not
narrowed a freeze gate. The real copy lives in the catalog index, it is pinned, and narrowing it
there fails at exit 1. **A probe that mutates something nothing reads proves nothing**, and it
would have been reported as a hole if I had not checked the field existed.

### Stated limitation: prose in an `x-` annotation is not enforced, by design

Adding `"MUST be omitted entirely when kind is accepted. Consumers MUST reject a response that
carries it."` to an `x-source` passes at exit 0. Every guard here skips `x-` keys deliberately, so
that fixing a comment cannot fail CI.

The hazard is real: a reviewer reads `MUST` and believes something enforces it. Measured, the
catalog carries **155** `x-` annotations, of which **5** use uppercase RFC-2119 keywords — and all
five are *deferrals*, which is the honest use: *"Per-command response schemas MUST constrain it;
this envelope cannot"*, *"An integrity mechanism MUST be specified before freeze"*, *"THIS PATTERN
IS NOT A SECURITY CONTROL, AND MUST NOT BE CITED AS ONE"*.

Distinguishing a deferral from an unenforced obligation mechanically is not something I can do
without a fragile heuristic, and pinning all 155 annotations by digest would make every comment
fix a ratchet edit. **So it is written down as a limitation instead of guarded badly**, and it is
on the "What is NOT closed" list in `OVERNIGHT-SUMMARY.md`.
