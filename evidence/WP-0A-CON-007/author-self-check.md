# WP-0A-CON-007 — author self-check

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification. Review, security, test and integration verification are open.

Toolchain: Node 24.20.0 / npm 11.19.0 via `zsh -lc`, already installed. Nothing
downloaded.

## The defect was observed failing before it was fixed

The probe was run against the **shipped** schema first:

```
seed fixture: examples/valid.json
declared as:  {"type":"string","minLength":1}
metadata.schema_ref ACCEPTS 16/16 hostile forms
```

After the constraint:

```
metadata.schema_ref ACCEPTS 0/16 hostile forms
```

A first run of the probe reported `0/16` against the *unfixed* schema and was
wrong: it selected its seed with `includes('valid-')`, which matches
`invalid-...` too, so every probe was rejected for an unrelated reason. Recorded
because the failure mode — a security probe that reports safe because it was
measuring the wrong thing — is the same class as the resolver error recorded
against WP-0A-CON-006, and one is not a coincidence.

## Commands run, with observed output

```
$ npm run check
ℹ tests 130
ℹ pass 130
ℹ fail 0
ℹ skipped 0
ℹ todo 0
```

126 tests before this package, 130 after.

## Each acceptance criterion

| Criterion | Evidence |
|---|---|
| 16 hostile forms rejected | Asserted in the new suite, and each rejection is asserted to name `schema_ref`, so a rejection for an unrelated reason does not count |
| A well-formed name still accepted | Three contract names asserted valid |
| The bound tested independently of the shape | The overlong fixture **satisfies** the pattern (`CTR-EVT-001@` + a 17-digit major) and exceeds 32 |
| Every touched reference field bounded | Asserted structurally over all six fields |
| Behaviour, never pattern text | No assertion in the suite reads a `pattern` string |
| No ceiling rises | `UNKILLED_CEILING` unchanged and green; each new constraint arrived with a fixture that kills it |

## The ratchet caught the work, as intended

Adding five bounds and one pattern immediately failed
`schema-mutation-coverage.test.mjs` on four contracts — `ctr-api-001` 8 unkilled
against a ceiling of 6, `ctr-evt-001` 5 against 2, `ctr-idm-001` 5 against 4,
`ctr-job-001` 6 against 4. Every new rule had to arrive with a fixture that kills
it before the suite would go green. That is the tightened ceiling from
WP-0A-CON-006 doing exactly what it was written to do, against its own author.

One fixture was then found not to isolate: the overlong `schema_ref` first written
failed **both** the pattern and the bound, so deleting either constraint alone
still rejected it. Rebuilt to satisfy the pattern.

## Deviations and open items

- `maxLength: 256` is a declared inference; the longest real reference is 51.
- `minLength` was removed from `schema_ref` rather than tested, because the pattern
  makes it unreachable. Argued in RFC-2026-009.
- `CTR-NTF-001.deep_link.target_ref` is left unbounded. A5 owns it.
- One fixture that closed no site was deleted and replaced by a behaviour test, per
  the rule adopted in WP-0A-CON-006: a fixture that isolates nothing is not coverage.
- Cross-vendor review is **not** satisfied; carried as the recorded exception.

## Correction: this package was pushed with CI red, and the claim was mine

The commit message and the pull request both said `npm run check: 126 → 130,
skipped 0, todo 0`. CI failed. The secret scanner reported
`pii: email-address — architecture/decisions/RFC-2026-009-reference-bounds.md`:
the RFC wrote the contract-name shape as a literal, and written as a literal it is
email-shaped.

The cause is not the false positive. It is the order I worked in. I ran the check,
saw 130 green, and *then* wrote the RFC and the evidence and committed — never
re-running the check over the files I had just added. The green number was true of a
tree that no longer existed when I quoted it.

This repository's own working rules already say **verify every claim against the
tree before writing it into a commit message**, recorded after a failed heredoc left
an evidence file unwritten while a commit said it existed. Same rule, same failure,
one wave later. Recorded here rather than quietly amended, because a rule broken by
the person who wrote it is worth more as evidence than as an embarrassment.

The shape is now written out in words. `npm run check`: 131/131, skipped 0, todo 0,
run after the last file was written.

## Independent security review: the construction held, the claim scope did not

The `schema_ref` constraint itself survived every attack brought against it in the
runtime this repository uses: all sixteen hostile forms plus trailing and leading
newlines, a trailing space, Arabic-Indic digits, full-width characters and an RLO
suffix; linear under a one-million-character adversarial input; portable to RE2.

The reviewer also verified the `minLength` removal independently rather than taking
my word for it — diffing the shipped schema against one with `minLength: 1` restored,
over a hostile corpus plus every string of length ≤ 3 over the relevant alphabet.
**Zero divergences.**

### What was wrong: the fields next to the one I hardened

Nine fields on `CTR-EVT-001` — `event_id`, `correlation_id`, `causation_id`,
`idempotency_key`, `producer.module_key`, `producer.implementation_version`,
`subject.type`, `subject.id`, `event_type` — were `{ type: string, minLength: 1 }`.
No pattern **and** no bound: *strictly weaker* than the condition this package was
written to fix. Each accepted a 100 000-character value, and four of the sixteen
hostile forms passed on them, on the same envelope, one key away from the field I
had just spent the package hardening.

The reviewer's point about claim scope is the one that matters. The acceptance
criterion I wrote ("every reference field **this package touches**") was satisfied.
The purpose said "no reference field **anywhere in the catalog**" and RFC-2026-009
said "**every** reference field in the catalog". Those were not true of what shipped.

Twenty-three reference-shaped fields across the four contracts this package amends
are now bounded, each with a fixture that kills its bound — verified one at a time:
all eighteen new fixtures close exactly one site. What remains unbounded is now
**named** in RFC-2026-009 rather than covered by a claim that was never true,
including `CTR-TEN-001.workspace_id`, the tenant-isolation key, which the reviewer
demonstrated accepting `file:///etc/passwd` through the envelope's `tenant_context`.

### The guard now discovers fields instead of listing them

It was titled "every reference field in this package carries an upper bound" while
iterating a literal list of six. A field added tomorrow would not be noticed and the
title would keep asserting otherwise. It walks the schemas now, and a second test
asserts the discovery actually finds the fields — so the walk cannot silently return
nothing and pass.

### Recorded, not fixed

- **Anchor semantics.** Python's `re` accepts a trailing newline after `$`, and
  Ruby's anchors are unconditionally multiline, so any string containing one
  well-formed line passes — defeating the constraint in 27 characters, inside
  `maxLength`. This affects every anchored pattern in the catalog, so it is inherited,
  not introduced. RFC-2026-009 now states the ECMA-262 precondition explicitly. A
  conformance test belongs with the first non-JS validator.
- **`ctr-aud-001` still carries the RE2-incompatible lookaheads** that three other
  contracts removed. Different package; raised against its owner.

```
$ npm run check
ℹ tests 136   pass 136   fail 0   skipped 0   todo 0
```

## The counting ratchet is replaced by a named list

Independent testing found the hole and, by finding it, showed the guards could not
close it. It added a real untested business rule to `ctr-flg-001` — a percentage
bucket that did not allocate the subject still returning `allow`, which no fixture in
the catalog touches — and kept the entire check green by **also deleting one vacuous
guard elsewhere in the same contract**. Four unkilled sites in, four out. Both
numeric guards were satisfied: the site count stayed above its floor and the unkilled
count landed back on its ceiling.

A count can always be offset. A name cannot.

Every constraint no fixture kills, and no proof excuses, is now listed by name. An
untested rule appears as a new line in a diff; deleting a rule elsewhere does not
remove that line. Both directions verified by construction:

| Attempt | Result |
|---|---|
| Independent testing's exact evasion — add the rule, delete the vacuous guard | 3 named sites reported |
| Delete a rule that is declared untested | reported as a stale declaration |

The second direction matters as much as the first. Without it, a rule nothing tests
can be deleted silently and the list would still pass — which is how a declaration
becomes a licence rather than a record.

## What the list showed once the sites had names

64 sites, and they are not one problem. Read by keyword they are five, and only some
are gaps: 26 `type` (a wrong type violates something else first, mostly not
closeable), 9 `$ref`, 8 root `required` (a catalog-wide finding open since
WP-0A-CON-003), 7 `minLength` each sitting beside a `pattern` that cannot match a
string that short — **redundant constraints that should be removed, not tested**, the
same class as the `minLength` removed from `schema_ref` — and 7 `maxLength` that were
simply missing a fixture.

Those last seven are closed in this commit. Real bounds in `CTR-AUD-001`,
`CTR-OBS-001` and `CTR-SEC-001` that nothing exercised: an audit action name, both
change references, a reason key, a retention policy reference, a readiness capability
reason and a secret handle. `after_ref` needed a valid fixture first — it is optional
and appeared in none — so the deleted-record example now carries one, which is where
a "what it looked like after" reference belongs anyway.

Naming them is what made them findable. Calling all 64 "untested" and reporting one
number would have been the same flattening this suite exists to stop.

```
$ npm run check
ℹ tests 137   pass 137   fail 0   skipped 0   todo 0
```

## Six unreachable `minLength` constraints removed, one kept

The named list surfaced seven `minLength: 1` constraints nothing exercises. Six sit
beside a `pattern` that no single character matches — checked over every code point
below U+2100 — so no instance can distinguish the schema from one without them. They
are removed, not tested.

The seventh, `CTR-PAG-001.next_cursor`, carries **no pattern at all**. That one is
load-bearing and stays on the list until a fixture reaches it. Removing it because
the other six went would have been the failure mode, not the fix.

`SITE_FLOOR` caught the removal and had to be lowered by hand, which is the point of
it: a rule leaves this catalog only through a number someone edits in a diff a
reviewer reads.

## Independent testing: `test_failed`, and it walked through the discovery twice

**Escape 1 — a nullable reference.** The predicate compared `type` to the string
`"string"` by strict equality, while this repository's own validator fully supports
type unions. `{"type": ["string", "null"]}` was not discovered, and an unbounded
`parent_event_id` shipped with `npm run check` green — accepting a 100 000-character
value, `file:///etc/passwd`, `javascript:alert(1)`, traversal and a cloud
instance-metadata address. The exact defect class this package exists to close, one
key away from the field it closed it on.

**Escape 2 — an array of references.** `related_event_ids`: type `array`, plural
name. Green, and unbounded in both item length and element count.

Both are closed and both were re-run to confirm it. A field is reference-shaped by
**name**; what it holds may be the string, an array of them, or a nullable one. An
array now also needs `maxItems`, because bounding each item and not the count leaves
the field unbounded in aggregate.

### Counts I got wrong

- "Twenty-three reference-shaped fields" — it is **24 fields bounded**, of which
  **21** are reference-shaped by the discovery rule's own naming test. The other three
  (`event_type`, `subject.type`, `producer.implementation_version`) were bounded
  because they were unbounded and adjacent. 23 is neither number and I did not
  measure it.
- "all eighteen new fixtures" — **24** at that commit, and 31 on this branch now.
  Independent testing verified all 24 close exactly one site each, which is the claim
  that mattered; the count attached to it was still wrong.

Both numbers came from counting by hand what a script was already computing.

## Working the named list: 16 more constraints closed

The list said 64. Reading it by keyword said which were gaps and which were not, and
the gaps turned out to be closeable:

- **Seven `$ref` sites.** The earlier note claimed "every fixture that would notice
  is already rejected by the referenced contract's own rules". That was wrong. A body
  that breaks the *referenced* contract and nothing else is rejected while the
  reference stands and accepted once it is deleted — exactly the observation the note
  said could not be made. `tenant_context` and `error` now have one each across five
  contracts. The two remaining belong to `CTR-NTF-001`, which A5 owns.
- **All six `uniqueItems` sites**, by a fixture carrying a duplicated array element:
  module capabilities, dependencies, permissions, secret handles, observability
  dependencies, and page sort keys.
- **Two `required` lists**, by omitting exactly one field: `CTR-API-001`'s root and
  `CTR-MOD-001`'s lifecycle.

Five generated fixtures closed nothing and were deleted rather than shipped. All five
hit the same wall: the constraint is **duplicated by a conditional copy that fires on
every branch**, so deleting the unconditional one leaves the conditional one
rejecting. `CTR-SEC-001`'s rotation owner is the clearest — both values of `ownership`
have a branch requiring it, so no instance distinguishes the two schemas.

Those constraints **stay in the schema**. A third `ownership` value tomorrow makes the
unconditional guard load-bearing again, and removing it because today's branches
happen to cover it would be trading a real defence for a coverage number. They are
listed as untested with that reason recorded, which is what the list is for.

Catalog mutation coverage **84.1% → 88.6%** (635 of 717 sites). Four contracts are
now above 97%.

```
$ npm run check
ℹ tests 139   pass 139   fail 0   skipped 0   todo 0
```

## The `type` note was wrong the same way the `$ref` note was wrong

I annotated 26 `type` sites as "a wrong type almost always violates something else
first" and "largely not closeable". That was a guess written as a finding, and it was
wrong for 15 of the 26.

The technique is the same one that closed the `$ref` sites: give the field a value of
a type that makes every *other* keyword on that node vacuous. `pattern` and
`minLength` bind only strings; `minItems` and `uniqueItems` only arrays; `required`
and `additionalProperties` only objects. Delete `type` and there is nothing left to
object.

That closed the root `type: "object"` on **eight contracts** — the rule that the whole
document is an object, which nothing had ever tested — plus the array types on module
capabilities, dependencies, permissions and secret handles, observability dependencies
and readiness capabilities, and page sort keys.

Eleven `type` sites remain, and those are the real ones: a sibling `const` or an
enclosing branch rejects the wrong-typed value before `type` gets to.

Twice now I have written "not closeable" into the list and been wrong on re-reading
it. Both times the note was reasoning about the schema rather than executing against
it. The list is only worth what its annotations are worth, and mine have been the
weakest part of it.

Catalog mutation coverage **88.6% → 90.7%** (650 of 717 sites). Four contracts at
100%: `CTR-EVT-001`, `CTR-JOB-001`, `CTR-TEN-001`, `CTR-USG-001`.

```
$ npm run check
ℹ tests 139   pass 139   fail 0   skipped 0   todo 0
```

## Six packages said `backlog` while their work sat in a Draft PR

`CONTRIBUTING_AGENTS.md` gives the flow `backlog → ready → in_progress → in_review →
…` and says the Author may move work only through `in_review`. Six manifests —
`WP-0A-CON-002`, `-003`, `-004`, `-005`, `-006` and `WP-0A-A0-003` — still said
`backlog` while their work was authored, committed, pushed and open for review.

Anyone reading those manifests would conclude nobody had started. That is the one
thing the status field exists to prevent, and I left it wrong across six packages for
several waves.

### Why the correction lands here and not on each package's own branch

I first made the edit on each branch and began restacking. The rebase hit content
conflicts in `ctr-aud-001`, `ctr-obs-001` and `ctr-sec-001` manifests and schemas —
divergences that **predate this change** and that previous rebases had resolved by
hand. Resolving them blindly would have dropped fixtures that later branches added,
which is data loss dressed as a merge.

So the eight-branch restack was **aborted and every branch restored to its pushed
tip**, verified sha by sha, and the correction is recorded once at the top of the
stack, where the merged result is what the Product Owner reads.

**Consequence, stated so it is not discovered later:** each package's own PR still
shows `backlog` in its manifest. Merging in order fixes it, because this commit is
last. If the packages are merged out of order, or some are merged and others are not,
the statuses will be wrong again and will need the same edit. That is a cost of the
stacked-branch shape, not of this change.

## CTR-AUD-001 was the contract nobody came back for

Independent security review found `CTR-AUD-001` still carrying the two negative
lookaheads `(?!/)` and `(?!.*\.\.)` that `CTR-API-001`, `CTR-IDM-001` and
`CTR-JOB-001` had each removed for RE2 portability. A lookahead does not make an
RE2-backed validator behave differently — it makes it **fail to compile the schema**,
so the contract does not load at all.

Equivalence was checked by exhaustion rather than by re-reading the earlier argument:
**885 793 strings**, over an alphabet containing every character-class boundary the
pattern can turn on, plus the named hazards at full length. **Zero divergence.** The
body grammar already forbids both: every `.` must be followed by `[A-Za-z0-9_-]+`, so
`..` is unreachable, and the first body character cannot be `/`.

The guard added for it is **catalog-wide and structural**, not a list of the four
known patterns. The previous three removals were done one contract at a time and the
fourth was missed for several waves; a list would have been missed the same way. It
rejects any `pattern` containing a construct RE2 cannot compile, verified by putting
one back and watching it fail.

```
$ npm run check
ℹ tests 140   pass 140   fail 0   skipped 0   todo 0
```

## Independent review walked through the named-list ratchet

`ASSERTIONS` does not contain `not`, `if` or `then`, so a rule written as
`then: { "not": {} }` — *"if the guard matches, reject"* — contributed **zero
constraint sites**. Every site the rule created sat in its `if` guard, and deleting a
guard keyword *widens* the guard, which breaks an existing valid fixture, so the site
scored "killed" by a fixture that never once satisfied the rule.

Independent review shipped exactly that as a real untested business rule on
`CTR-PAG-001` with `npm run check` green at 139/139, then searched exhaustively and
found **628 more** such injections across five contracts — several of them rules that
would *reject legitimate production documents*, including one forbidding the very
rotation `SEC-005` requires.

My comment in that file said "a newly added rule can NEVER be counted killed without
someone writing a new fixture. Every rule added to this catalog therefore arrives here
first." That was false, and it was the load-bearing claim of the whole design.

A `then`, `else` or `not` whose subtree contains no assertion at all is now itself a
site. Deleting it removes the whole obligation, and only a fixture that satisfies the
guard can notice. Reproduced before and after: the injected rule now appears as two
named sites.

## Four sites I declared untestable, closed by the reviewer in an afternoon

`ctr-err-001 field_errors.type`, `ctr-mod-001 lifecycle.readiness.required`,
`ctr-sec-001 rotation.owner.required` and `ctr-sec-001 rotation.required`. All four
now have fixtures; each closes exactly one site.

My annotation said the `required` residue was "duplicated by a conditional copy that
covers every branch". That is true only where the two lists **match**. Here the
unconditional lists were `["owner","rotated_at"]` and `["kind","id"]` while the
conditional copies were `["owner"]` and `["kind"]` — the extra member was load-bearing
and testable the whole time. I deleted five generated fixtures on the strength of that
reasoning in an earlier wave.

**This is the third consecutive round in which a "not closeable" note of mine was
wrong** — `$ref`, then `type`, now these. Each time the note reasoned about the schema
instead of executing against it.

So the one claim in that block that can be settled by execution now **is** a test, not
a comment: each root `type` on the list is checked against six probe values, and if
one of them is rejected with `type` and accepted without it, the test fails and says
to write the fixture. Verified by deleting the `not` from `CTR-API-001` and watching
it fire.

Corrections to the counts in that block: six root `type` entries, not five, and only
three use the `anyOf` form. `CTR-NTF-001` has one `$ref`, not two — and it is
**killable**; it is listed because A5 owns the contract, which is a temporary block
and not the same thing as unkillable. That distinction was missing.

Catalog mutation coverage **90.7% → 91.2%** (654 of 717).

```
$ npm run check
ℹ tests 141   pass 141   fail 0   skipped 0   todo 0
```

## The bodyless-obligation fix, checked against the class rather than the example

I fixed the bypass and verified it against the one injection the reviewer supplied.
The reviewer had found **628**. Verifying a class fix against one instance is the
same mistake in a different place, so it was redone properly.

Two-conjunct prohibitions were generated from each contract's own fixtures — the
reviewer's construction — giving **896** rules, each one a real obligation that some
real document satisfies. For every one:

- it contributes at least one constraint site the counter can see, and
- at least one of those sites survives every declared fixture, so the suite names it

**896 of 896.** Zero contribute nothing; zero are scored killed by a fixture that
never enters the guard.

## The two untested-constraint guards no longer disagree

`UNKILLED_CEILING` counted every site no fixture kills. `UNKILLED_SITES` names only
those the redundancy proof does not excuse. Independent review pointed out that two
guards disagreeing about what "unkilled" means is how a change slips between them —
and that in one case the coarser count caught an injected rule the named list missed.

They are reconciled rather than merged, because catching that case is worth keeping:

- the count is now **exact**, not a ceiling, so closing a site or removing a rule
  fails until the number is edited deliberately — the same discipline `SITE_FLOOR`
  already carries;
- a test asserts the relationship: raw unkilled = named + proof-excused, per contract.
  The gap between the two numbers is now a stated quantity rather than an accident.

Verified by construction in both directions: adding a bound to `CTR-TEN-001` without
editing the number fails with "1 killed by no fixture, but 0 declared"; setting the
number wrong fails with "says 2, measured 0".

```
$ npm run check
ℹ tests 142   pass 142   fail 0   skipped 0   todo 0
```

## The kill criterion was direction-blind, and that was the root of both High findings

A site counted as killed when deleting it changed **any** fixture verdict, in either
direction. Deleting a keyword normally weakens a schema — but under `not`, and inside
an empty `oneOf` branch, the polarity inverts and deletion **strengthens**:
`not: { required: [a, b] }` becomes `not: {}`, which rejects everything, so every
fixture flips valid→invalid, the verdict string changes, and the site scores "killed"
by fixtures that demonstrated nothing.

Independent review used that to inject a real and harmful rule into `CTR-API-001` —
an error envelope carrying a causation chain, legal under the shipped contract,
silently rejected — with the whole check green, and found **56 more**, including one
on `CTR-PAG-001` that would reject essentially every real paginated response.

The same asymmetry explains a symptom I had been treating separately: an `if`-guard
keyword scored "killed" because deleting it **widens** the guard and breaks a valid
fixture — without any fixture ever entering the branch.

### The fix is a classification, not a patch

A kill is now one direction only: some fixture the contract **rejects** must become
**accepted**. And the walk follows polarity:

- **`if` is a condition, not an obligation.** It contributes no site and is not
  descended into. Every position inside one is unkillable by deletion *by
  construction* — widening a guard can only cause more rejections.
- **`not` is one obligation.** Deleting the whole thing is the observable act; the
  assertions inside it are not separately countable.
- An **`anyOf`/`oneOf` with an empty branch** is a negation, so the combinator is the
  obligation.
- A **`then`/`else` with no assertion under it** is itself the obligation.

All three shapes independent review used are now reported by name: `not`, `oneOf`,
and `allOf.N.then.not`.

**`UNPROVEN_CONDITIONAL_GAPS` emptied itself.** Both entries were `if` guards on
`CTR-NTF-001`. What two independent runs had to establish with 150 000 targeted
instances each is now a property of the walk.

And eight `then.not` obligations turned out to be genuinely untested — including
*"an error envelope must not also carry data"* and *"a completed idempotency record
must not carry an error"*. Fixtures for two of them were fixtures I **deleted in an
earlier wave** for "closing nothing"; under the corrected criterion they close
exactly what they always should have.

### The numbers, and why they are not comparable to the last ones

**610 of 637 observable sites, 95.8%.** The denominator changed: 80 positions that a
deletion test provably cannot reach are no longer counted. Under the previous
direction-blind criterion the same catalog measures **83.4%**, not the 91.2% I
reported — that figure counted spurious kills.

## Tightening a rule was invisible to every guard

Every guard here is computed by **deleting** a keyword, so all of them are invariant
under a change to a keyword's **value**. Independent review narrowed `request_id`'s
`maxLength` from 128 to 24 and dropped four of six allow-listed schemes from
`status_ref` — both real contract narrowings that reject values the shipped contract
declares legal — and nothing failed.

A negative-only test cannot see it either: the hostile-reference suites assert bad
schemes are rejected, and a narrowed pattern still rejects those. The missing
direction is **acceptance**. `CTR-JOB-001`'s suite already had it, with the right
comment — *"a guard that only ever rejects is indistinguishable from one that rejects
everything"* — and the other reference fields did not.

Seven reference fields now assert what they **accept**: every allow-listed scheme, and
a value at exactly the declared bound.

My first version of that test read the scheme list and the bound **out of the very
field it was checking**, so narrowing the field narrowed the test with it and nothing
failed. A test that measures itself cannot fail. Both are pinned now, and both
narrowings are caught.

```
$ npm run check
ℹ tests 144   pass 144   fail 0   skipped 0   todo 0
```
