# WP-0A-A6-001 — independent review, and a staffing defect that is A0's

Reviewer: `/claude/c0_contract_reviewer`, a run distinct from the Author
(`/claude/a6_relay`) and from A0 (`/claude/a0_atlas`). Reviewed read-only from throwaway
worktrees; the main tree was not modified.

**Verdict: changes required.** Not an approval.

## The deliverable

Structurally sound, and verified mechanically rather than read: all fourteen metrics
carry a definition, numerator, denominator, window, source, split owner, `target: null`
and a non-empty reason. **No number leaked in** — `A-02`'s cohort parameter `N` is null
too, which was the likeliest place a target would have hidden. The cardinality budget is
restated verbatim from `ctr-obs-001/manifest.json` rather than invented, and its implied
ceiling of 524,288 is arithmetically right.

The author's own checker was tested rather than trusted: it really does follow
cross-contract `$ref`s, proved by mutation, and fails loudly on a reference it cannot
resolve.

### Three substantive defects, all re-verified by A0 against the shipped schemas

**1 — `A-03`'s reason for "absent" is false, and the request it generates is harmful.**
The dictionary asserts three times that `CTR-EVT-001` can carry no step identifier at
all, because `payload` is `maxProperties: 0` and `event_type` has no vocabulary. Both
halves are wrong. `event_type` is `^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$` — an open grammar
that admits `onboarding.step.completed` today, confirmed by matching it — and `subject`
is a **required** block whose `type` and `id` are free text, so a step identifier fits
without touching `payload` at all.

The consequence is not cosmetic. The package asks, in two places, for an event vocabulary
**and a payload shape** — a widening of a control the contract holds deliberately, of the
same family as `CTR-AUD-001.details`, whose own annotation calls a free-form bag *"how a
secret or a page of user content reaches an audit log"*. **The metric does not need it.**
`absent` remains the right status; the reason and the derived request are wrong.

**2 — `M-01` gives a contract less than it says.** The note calls `CTR-TEN-001.timezone`
a per-tenant value and `Asia/Bangkok` "plausible". It is `{"const": "Asia/Bangkok"}` and
**required** — the only value the shared kernel admits. Whether a reporting calendar is a
separate decision from a tenant timezone is a fair open question; misdescribing what the
contract says is not.

**3 — `C-03`'s formula names `occurred_at` and its source list does not declare it.** The
only such case in fourteen, and precisely the class the checker is structurally blind to.

### The stale base

The branch was authored eleven commits behind `main`, before **RFC-2026-014 was
approved**. Five metrics take populations of `CTR-USG-001` records and **none says whether
the population is pre- or post-dedupe**. `C-04` is the sharpest: it is the metric about
restatement and never mentions the key that decides what a restatement is.

The RFC existed at that base as `Proposed`, and its own text records that **A6 refused to
sign that key twice**. The run authoring these cost metrics is the run that made those
refusals — so this is the author's own prior finding about the contract underneath five of
his metrics, absent from the dictionary.

### Three holes in the author's checker, each demonstrated

A metric may cite a contract and declare **zero** fields and the run still reports "no
problems" — vacuously true. Nothing checks that the fields a formula *names* are the
fields it *declares*, which is how defect 3 shipped. And for the one budget line where the
check is possible and one comparison long, `max_distinct_values` is never compared to
`enum.length`: set to 99, the script prints `budget 99 … enum(4)` and then "no problems".

**The deepest limitation, worth stating for the Tester: the checker validates presence and
never validates absence.** An `absent` verdict is the highest-consequence claim in the
dictionary, because it generates a contract-change request — and it is the one claim
exempted from checking. That is how defect 1 passed a green run.

## The staffing defect, and it is A0's

`work-packages/WP-0A-A6-001.json` `open_blockers[0]` reads: *"A6 has not yet supplied an
independently reviewed capability benchmark for billing-cost-ops; **it must not be
assigned as Author from its current declaration.**"*

**A0 assigned `/claude/a6_relay` as Author anyway**, in the same manifest that carries the
prohibition. The Author noticed, refused to paper over it, recorded it as a further open
blocker so it travels with the package, and did the work under the unreconciled
assignment rather than pretending it was clean. **The Author behaved correctly
throughout; the defect is A0's.**

The reviewer stated the defensible reading before rejecting it — the dispatcher's duty in
`.agents/capability-profiles/README.md` is to match declarations *and their cited
evidence*, `cc-a6-relay.json` cites real prior independent evidence, and the general
benchmark condition has never been enforced against anyone, A0 included. It does not
survive three counts:

1. This blocker is **specific, named and prohibitive**, and sits in the manifest A0
   staffed. No other package carries a prohibition of that shape against its own author.
2. **RFC-2026-013, now Approved, decides it.** It keys role legitimacy to what a
   capability profile declares an agent may hold — and `cc-a6-relay.json`, written by A0,
   says the run holds *"SRE, observability and billing **review** only"* with Author
   authority explicitly excluded. Under an approved decision that outranks a manifest, an
   `a6_relay` Author signature is not a signature. The same RFC affirms this run's
   *review* signatures as genuine, which is the point: the competence is ratified in the
   role its profile declares, and no other.
3. **Review capability is not authoring capability.** RFC-2026-014 is the demonstration —
   it records A6 correctly refusing an author's key twice while the author, *"having just
   convinced himself,"* could not see it.

**A benchmark produced now cannot satisfy a blocker that asks for one before assignment.**
The repository's only existing benchmark is headed *"pre-assignment evidence… No package
has been accepted or assigned to this run"*; its function is predictive. One written from
a deliverable that already exists is post-hoc and circular — the artifact under assessment
would be the sole evidence for the assessment. It can license A6 as Author for the *next*
package. It cures the future, not this package's past.

**The reviewer disclosed the same gap in itself**, unprompted: its own profile records no
independent benchmark, the repository's one benchmark belongs to a different vendor's run,
and this manifest asks nothing of the reviewer at all. *"I am not in a position to be
fastidious about A6's provenance and silent about my own."*

## Disposition

**The work is not void.** Its correctness is checkable without trusting its author — the
field citations are executable and were re-executed, the contract quotations are verbatim
and were checked against the schemas, the targets are mechanically verified null. All
three substantive findings came from reading the contracts, not from doubting the run.
Discarding it so a benchmarked author could retype the same fourteen entries would burn
the work and buy nothing, and would let a procedural defect masquerade as a quality
judgement.

**The artifact is admissible as reviewed input and evidence, and inadmissible as an
author-attested deliverable.** The chain is what needs repair, not the prose.

**Whether the assignment nonetheless stands is the Product Owner's disposition**, not
A0's and not the reviewer's — and if it stands, it is recorded as a disposition with its
reasoning, the way RFC-2026-013 was, and never by deleting the blocker. The blocker the
Author added must not be removed by anyone but the authority that disposes of it.

`OPEN-016`'s Product Owner review of all fourteen formulas, sources, owners and targets
remains outstanding and is closable by no agent.
