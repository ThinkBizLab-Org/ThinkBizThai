# RFC-2026-014 — A usage key identifies a measurement, not a job

Status: Proposed
Decision needed by: before `CTR-USG-001` leaves Draft
Owner: A0 Architecture/Integration with A6 SRE/Billing
Protocol version: `1.0.0`

## Problem, and it was mine

`CTR-USG-001` shipped `dedupe_key` as `{ "type": "string", "minLength": 1 }` with no
composition stated anywhere in the repository. A6 refused to sign it: two events with an
identical key and costs of `0.0425` and `9999.9999` both validated, and a
`provider_reported` correction was byte-indistinguishable from a double-counted estimate.

I fixed that by composing the key as
`usg:<workspace_id>:<job_id>:<dimension>:<cost.basis>` and stating a uniqueness scope: *at
most one accepted usage event per key per workspace; a second event carrying a key already
seen is a duplicate and must be dropped, not summed.*

**A6 refused again, on a defect my fix introduced.** A job that makes two AI calls produces
two real measurements. Under that composition they carry the same key, and the rule I wrote
instructs the consumer to **discard the second legitimate charge**. Verified against the
shipped schema: two `ai_tokens` estimates for one job five minutes apart, 1450 tokens then
2900, both validate with an identical key.

That is worse than the gap it replaced. The original problem was a key that could not
detect double-counting. The replacement was a key that **manufactures** the missing-usage
condition `OB-008` exists to detect, and does it silently, in the direction that loses
money for the operator.

## Decision

**The key identifies one measurement.** The composition gains the measurement instant:

```
usg:<attribution.workspace_id>:<attribution.job_id>:<dimension>:<cost.basis>:<occurred_at>
```

with `occurred_at` written without its `-` and `:` so the separator stays unambiguous.

- Two events with the same key are **the same measurement seen twice**; the second is a
  duplicate.
- Two measurements of one job and dimension taken at different instants carry **different
  keys and are summed**, not collapsed.
- `cost.basis` stays in the key, which is what makes a `provider_reported` correction
  distinguishable from a duplicated estimate — the thing A6's first refusal asked for.

**Redelivery is a different problem with a different key.** `ID-002`'s inbox wrapper is
keyed on the event id — `usage_id` — and N redeliveries of one event commit its effect once
by that key. Reading `dedupe_key` as the redelivery key was the category error underneath
the first fix.

## What this does not assert

**It does not assert that a job emits one usage event per dimension.** Nothing in the
baseline says so — `OB-004`'s acceptance is attribution completeness and money precision,
and it is silent on cardinality. A6 offered that reading as an alternative resolution and it
may well be the intended one, but adopting it would put a rule in a P0 contract that no
source states. This contract takes the reading that loses no data if it is wrong.

**It does not close the agreement problem.** That the key's parts match the document's own
fields is a producer obligation; comparing two properties is outside this validator's
subset, and it stays recorded under `untestable_by_schema` rather than claimed.

**Two distinct measurements stamped with the same instant still collide.** They are
separated by `usage_id`, which is also the redelivery key. Recorded as a limitation, not
solved.

## Why this is an RFC and not an edit

`CONTRIBUTING_AGENTS.md` requires an RFC before changing billing semantics. Deciding what
counts as a duplicate charge is billing semantics: the first version of this rule would
have discarded revenue, and it reached a shipped contract because it looked like a
formatting decision. It is not one.

## What the second refusal is worth

A6 signed nothing here twice, and was right twice. The first refusal named a gap; the
second named a defect the fix for that gap introduced — which is the failure mode a review
exists to catch and the one an author is least able to see, having just convinced himself.
Recorded because the value of an independent run is easiest to doubt when it agrees.

## Limitations

Nothing enforces that a producer derives the key from the document rather than inventing
it. The schema checks the shape; the resolver must check the agreement.

Also left: `invalid-cost-magnitude-past-exact-range.json` still supersedes an estimate of a
different dimension, and its name asserts an exact-range guarantee that RFC-2026-010's
correction removed. Both are recorded rather than fixed here, because renaming a fixture
moves a pinned name and belongs in its own change.

## Rollback

Revert the `dedupe_key` pattern and annotation, the fixture keys, and the pinned surface,
digests and floors that moved with them. `CTR-USG-001` is Draft; nothing consumes it.
