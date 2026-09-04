# RFC-2026-015 — DB-00 data foundation decisions

Status: Approved 2026-09-04 by the Product Owner — DATA-DEC-01 is `app` and DATA-DEC-02 is the wrapper command contract, both as proposed. DATA-DEC-03 stays open and referred to A1, due before G1.
Date: 2026-09-04
Author: /claude/a0_atlas (A0)
Supersedes: nothing
Affects: `DATA-DEC-01`, `DATA-DEC-02`; refers `DATA-DEC-03` to A1

## Why this exists

The Sprint 0A data package states the order without ambiguity:

1. close `DATA-DEC-01..03`
2. dispatch DB-00 with exact allowed paths
3. run the declared verify command
4. on green, dispatch DB-01 then DB-02

It also states the constraint that stops an agent from simply proceeding:

> การที่ decision ยังเปิดอยู่ไม่อนุญาตให้ Agent เลือกเอง Agent ใช้ default เฉพาะ prototype/test และต้องติด feature/policy gate ตามที่ owner กำหนด

An open decision does not authorise an agent to choose it. The defaults in the data
package are for prototype and test only. So these are proposed here rather than taken.

## What is not gating DB-00

All 36 blockers recorded across `WP-0A-CON-002`, `-003` and `-006` were re-checked by
opening the code or running the claim, not by reading the recorded text. Nine are no
longer true and had simply never been removed. Of the twenty-seven still true, **not one
can be closed by writing code**:

| | count | why it does not move on its own |
|---|---|---|
| already closed | 9 | fixed; the recorded line was stale |
| awaits a named authority | 18 | Product Owner, A1, A5, A6, a cross-package countersignature, a non-Anthropic review run |
| awaits a system that does not exist | 7 | a ledger, a paging harness, a policy evaluator — each needs an application to exist first |
| needs re-measurement | 2 | the recorded percentages describe a fixture population that has since changed |

The full verdict table, with the evidence behind each row, is in
`evidence/WP-0A-A0-006/blocker-re-audit.md`.

The seven in the third group are the load-bearing observation. They are properties of a
running system — reconciliation against a provider statement, no duplicate or missing item
across pages, a narrower scope not overriding a live kill switch. The catalog cannot
demonstrate them and correctly declares so. They stop being open when there is an
application, which is what DB-00 begins.

## DATA-DEC-01 — exposed application schema name

**Proposed: `app`.**

The data package already carries `app` as its placeholder, and every migration and RLS
example in the package is written against it. Choosing it makes the existing document
literal rather than illustrative, and no artefact has to be rewritten.

What turns on it: the name appears in the exposed schema of every migration from `000`
onward and in every RLS policy. It is cheap now and expensive after DB-01.

If the Product Owner prefers another name, say so on disposition and DB-00 is dispatched
with that name instead; nothing else in this RFC changes.

## DATA-DEC-02 — migration, test and runtime tooling

**Proposed: a wrapper command contract only, with no tool named in any package manifest.**

The repository already works this way for its own suite: packages declare
`deterministic_commands` and the tool behind each one is an implementation detail behind
`npm run`. Extending that to the database keeps DB-00's acceptance criteria expressed as
commands and outcomes, so a different agent — or a different tool — can satisfy them
without a decision record having to be reopened.

What turns on it: it fixes what DB-00's handoff may assume. A wrapper contract means DB-00
declares `make db-verify` and its expected output; naming a specific migration tool instead
would make that tool part of the contract and a later change an RFC.

What it deliberately does not decide: which tool. That stays a DB-00 implementation
choice, reviewable in its diff.

## DATA-DEC-03 — force RLS service path — REFERRED TO A1, NOT PROPOSED

`DATA-DEC-03` is owned by **A0 + A1** and is due before **G1**, not before DB-00. It does
not gate the DB-00 dispatch.

**No answer is proposed here, and A0 must not close it alone.** The question is whether the
service path forces RLS wherever the driver and pooler make forcing compatible, and what
the declared behaviour is where they do not. It is a security surface and A1 is a required
co-owner.

This is deliberate. `WP-0A-CON-006` records as **High** that `CTR-NTF-001` — owned by A5 —
was authored by A0, and that ratification after the fact is a weaker and different control
than the owner proposing it. `CTR-MOD-001` created the same irregularity against
`CTR-SEC-001`. Proposing an RLS decision that A1 co-owns would be the third instance of a
defect this repository has already graded High twice.

**Asked of A1:** answer `DATA-DEC-03` before G1, and state the fallback behaviour where
forcing is not compatible.

## Consequences

- On approval, DB-00 may be dispatched with exact allowed paths. `DATA-DEC-01` gates the
  merge; `DATA-DEC-02` gates the start of coding.
- The eighteen authority blockers and the two re-measurements do not gate DB-00 and are
  tracked during development rather than ahead of it.
- The seven system blockers begin to be answerable for the first time, because there will
  be something for those systems to observe.
- Until this RFC is disposed, DB-00 does not start. A Proposed decision record binds
  nothing.

## Rejected alternative

**Taking the defaults and proceeding.** The data package forbids it, and the two named
defaults are exactly the kind an agent would rationalise as obvious. The cost of asking is
one disposition; the cost of being wrong is a rename across every migration and RLS policy.
