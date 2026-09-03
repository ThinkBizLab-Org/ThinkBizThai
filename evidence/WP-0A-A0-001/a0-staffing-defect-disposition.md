# A0 staffed a package against a prohibition written in that package

**Recorded:** 2026-09-03
**Defect owner:** `/claude/a0_atlas` (A0), acting as dispatcher
**Disposition:** Product Owner, 2026-09-03 — remedy path (a)

## What happened

`work-packages/WP-0A-A6-001.json` carried, and still carries, in `open_blockers[0]`:

> *"A6 has not yet supplied an independently reviewed capability benchmark for
> billing-cost-ops; it must not be assigned as Author from its current declaration."*

A0 staffed the package with `/claude/a6_relay` as `author_agent_run_id` and moved it from
`backlog` to `ready` without reading its own blockers. A0 had also written that run's
capability profile earlier the same day, which states in its own words that the run holds
*"SRE, observability and billing **review** only"* and *"NO Author … authority"*.

**No general condition was missed. A specific, named prohibition was overridden by the
run that owned the manifest it sat in.**

## What the Author did

`/claude/a6_relay` noticed, said so, added the contradiction as a further open blocker so
it would travel with the package, edited neither the profile nor the existing blocker —
both outside its writable paths — and delivered the work under the unreconciled
assignment rather than either downing tools or pretending the assignment was clean.

**The Author behaved correctly throughout. The defect is A0's alone.**

## Why the defensible reading did not survive

The independent reviewer stated it before rejecting it, and A0 records it here rather
than only the conclusion: `.agents/capability-profiles/README.md` puts the dispatcher's
duty as matching required skill profiles to real declarations *and their cited evidence*,
not as requiring a benchmark; `cc-a6-relay.json` cites real prior independent evidence;
and the general benchmark condition has never been enforced against anyone — **A0
included**, having authored ten packages requiring `architecture-contracts` with no
benchmark of its own.

It fails on three counts. The blocker is specific and prohibitive and sat in the manifest
A0 staffed. **RFC-2026-013, approved 2026-09-02, keys role legitimacy to what a capability
profile declares an agent may hold** — so under a decision that outranks a manifest, an
`a6_relay` Author signature is not a signature, while the same RFC affirms that run's
*review* signatures as genuine. And review capability is not authoring capability:
RFC-2026-014 exists because A6 twice refused an author's key while the author, *"having
just convinced himself,"* could not see the defect.

## Why a benchmark now cannot repair the past

The repository's only benchmark, `evidence/capability-benchmarks/c0-contract-reviewer.md`,
is headed *"pre-assignment evidence … No package has been accepted or assigned to this
run"*. Its function is **predictive**: it asks whether a run can be trusted with a role
before anything rides on the answer. A benchmark written from a deliverable that already
exists is post-hoc and circular, since the artifact under assessment would be the sole
evidence for the assessment. The blocker's operative words govern an act — *must not be
**assigned***  — and later evidence cannot un-perform an assignment.

**It cures the future, not this package's past.**

## The remedy, as chosen

1. The invalid assignment is **withdrawn**: `author_agent_run_id` is null, the branch
   declaration is withdrawn, and the package returns to `backlog`. A package declares a
   branch to own that work as its own attested output, and this package does not.
2. A forward-scoped `billing-cost-ops` benchmark for `/claude/a6_relay` is produced by a
   run distinct from it **and** from its reviewer, and governs future assignments only.
3. The existing artifact is **reviewed input**, credited to `/claude/a6_relay` as its
   source, and is the material the next authorship act starts from — not something to be
   retyped by a different run so the paperwork reads cleanly.
4. Neither blocker is deleted. The disposition is recorded on the manifest with its
   reasoning, the way RFC-2026-013 was.

## What A0 should have done, stated so it is checkable next time

Read the target manifest's `open_blockers` before writing `role_assignments`, and treat a
prohibition naming a specific run and role as binding on the dispatcher even when the
dispatcher wrote it. **A0 wrote both the prohibition's subject profile and the assignment
that broke it, eight hours apart, and did not connect them.**

This is a candidate for a guard — a package must not name as Author a run that its own
blockers prohibit — and it is not written here, because the author of the defect writing
the guard that would have caught it, in the same change that discloses it, is the pattern
this repository has twice recorded as an author enforcing his own proposal. It belongs to
whoever reviews this record.
