# RFC-2026-010 — Nine shared-kernel contracts are ready to leave Draft

Status: Partially approved 2026-09-02 — the Product Owner approved the five A0-owned promotions (CTR-API-001, CTR-PAG-001, CTR-IDM-001, CTR-MOD-001, CTR-FLG-001), which are now Candidate. CTR-SEC-001 awaits A1; CTR-AUD-001, CTR-OBS-001 and CTR-USG-001 await A6; CTR-NTF-001 is A5's and remains unassessed. The Limitations in this document stand unchanged — approval is of the promotion, not a claim that every 'present' row is the artifact the phrase meant.
Decision needed by: before any package builds a consumer against a Draft contract
Owner: A0 Architecture/Integration
Protocol version: `1.0.0`

## What this asks for

The Decision Register (§5.2) defines the levels:

| Level | Meaning | What it permits |
|---|---|---|
| Draft | the owner is still designing | exploratory spike only |
| Candidate v1 | schema and examples are ready | fakes, fixtures and consumer tests |

Ten shared-kernel contracts are still `Draft`. **This RFC does not change any status.**
It puts the evidence for nine of them in front of their owners and the Product Owner,
so the promotion is a decision someone makes, not a status that drifts.

The distinction matters in one concrete way: a Draft contract permits *exploratory
spikes only*. Every consumer package waiting to build a fake or a consumer test is
blocked on this, and each of these contracts already carries the schema and the
fixtures that Candidate v1 asks for.

## The evidence, per contract, against its own list

Each row's requirement is the `required_before_freeze` list the Decision Register
records for that contract — not a standard I chose. Coverage is the mutation figure
from `test-kits/contracts/schema-mutation-coverage.test.mjs`.

### A0 owns these outright — the promotion is A0's to propose and the Product Owner's to approve

| Contract | Required before freeze | Present | Coverage |
|---|---|---|---|
| CTR-API-001 | success/error examples · correlation · auth rules | 3/3 | 97.2% |
| CTR-PAG-001 | opaque cursor fixture · stable ordering tests | 2/2 | 80.0% |
| CTR-IDM-001 | scope · payload hash · conflict/replay examples | 3/3 | 97.0% |
| CTR-MOD-001 | capabilities · dependencies · health · flags · owner | 5/5 | 94.9% |
| CTR-FLG-001 | platform→plan→workspace→business precedence | 1/1 | 92.7% |

### These have a co-owner, and A0 cannot promote them alone

| Contract | Co-owner | Required before freeze | Present | Coverage |
|---|---|---|---|---|
| CTR-SEC-001 | A1 | opaque ref · scope · rotation/revoke · redaction tests | 4/4 | 91.2% |
| CTR-AUD-001 | A6 | actor/scope/action/reason/ref/redaction | 1/1 | 98.2% |
| CTR-OBS-001 | A6 | propagation · SLI tags · bounded cardinality | 3/3 | 100.0% |
| CTR-USG-001 | A6 | dimensions · attribution · decimal money · dedupe | 4/4 | 100.0% |

`CTR-NTF-001` belongs to **A5** and is deliberately not assessed here. Judging another
role's contract ready is as much that role's decision as writing it.

## What "present" means, and what it does not

Read this before treating the table as an approval.

The check is **presence of the artifact the phrase names**, verified by a script
against the shipped schema and fixture list. It is not proof that the artifact
satisfies the intent behind the phrase, and for several items the gap between those
two is real:

- *"stable ordering tests"* is checked as **`sort` exists in the schema and a fixture
  exercises it**. It is not a proof that ordering is stable across pages — nothing in
  this repository can demonstrate that without a running query engine.
- *"auth rules"* is checked as **`tenant_context` is referenced**. The contract carries
  the trusted context; it does not encode an authorization policy.
- *"decimal money"* is checked as **a money-shaped property with a decimal
  representation**. An accountant has not reviewed it, and OPEN-016 still requires that.
- *"bounded cardinality"* is checked as **`sli_tags` closes `additionalProperties` or
  constrains its values**. Whether the resulting cardinality is operationally
  acceptable is an SRE judgement.

Each phrase was written by someone who knew what they meant by it. A script can show
the artifact exists; only the owner can say it is the artifact they meant.

## Why coverage is quoted, and why it is not the criterion

The Decision Register does not ask for mutation coverage, and this RFC does not
propose it as a bar. It is quoted because it answers a different question the reader
will have — *are the fixtures real, or decorative?* — and because two of these numbers
are worth looking at directly:

- **CTR-PAG-001 at 80.0%** is the lowest in the catalog. Its six untested constraints
  are recorded by name in the suite.
- **CTR-OBS-001 and CTR-USG-001 at 100%** have no untested constraint at all.

A contract can be Candidate with imperfect coverage; Candidate means *"schema and
examples are ready"*, and it is. The number is context, not a gate.

## What promotion would and would not authorize

Candidate v1 permits fakes, fixtures and consumer tests. It does **not** authorize a
production schema, a migration, a provider call, or any Gate G0 item. Every G0
restriction on this repository stands unchanged.

## Recommended disposition

1. **Product Owner**: approve or reject the five A0-owned promotions.
2. **A1**: sign off `CTR-SEC-001`, or say what is missing.
3. **A6**: sign off `CTR-AUD-001`, `CTR-OBS-001` and `CTR-USG-001`, or say what is missing.
4. **A5**: assess `CTR-NTF-001` separately; this RFC takes no position on it.

If any owner reads a "present" row and disagrees that the artifact is what the phrase
meant, that disagreement is the useful outcome — and it is the reason this is an RFC
and not a status change.

## Disposition, 2026-09-02

The Product Owner approved the five A0-owned promotions. `CTR-API-001`, `CTR-PAG-001`,
`CTR-IDM-001`, `CTR-MOD-001` and `CTR-FLG-001` moved `Draft` → `Candidate v1` in their manifests
and in the catalog index; the census is now **9 Candidate and 5 Draft**.

Three guards failed when the change landed, which is what they exist for — the index census, the
baseline freeze-level pin, and the registry's per-contract status pin. Each was updated in the
same commit with the date and the reason, so the promotion is legible in the diff rather than
inferred from a number that moved.

**Nothing else changed.** No schema, fixture, version or owner moved. Candidate v1 permits fakes,
fixtures and consumer tests; it does not authorize a production schema, a migration, a provider
call, or any Gate G0 item.

The four co-owned contracts stay `Draft` and are now asserted by name — *"still Draft"* is the
part a drift would eat quietly.
