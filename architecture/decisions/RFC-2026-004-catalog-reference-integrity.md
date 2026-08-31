# RFC-2026-004 — Catalog $ref integrity and the shared-kernel envelope contracts

Status: Proposed — awaiting independent review, security, test, integration, and Product Owner disposition
Decision needed by: before any module contract package consumes the shared kernel
Owner: A0 Architecture/Contracts
Protocol version: `1.0.0`

## Problem

### D3 — two committed `$ref`s in the contract catalog resolve to nothing

`contract-catalog/shared-kernel/ctr-evt-001/schema.json` and
`ctr-job-001/schema.json` both declare:

```json
"tenant_context": { "$ref": "../../ctr-ten-001/schema.json" }
```

From `contract-catalog/shared-kernel/<contract>/`, `../../` is
`contract-catalog/`, so the reference resolves to
`contract-catalog/ctr-ten-001/schema.json` — **a path that does not exist**. The
correct reference is `../ctr-ten-001/schema.json`.

CTR-EVT-001 and CTR-JOB-001 are the two Candidate contracts whose entire tenant
isolation story rests on that reference. As committed, the two envelopes that
carry every domain event and every background job declare a tenant-context
constraint that points at nothing.

### Why four independent roles did not catch it

Not a review failure — a coverage failure, and a compound one:

1. `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` validates
   fixtures with hand-written JavaScript predicates. It never resolves a `$ref`,
   so a dangling reference is structurally invisible to it.
2. Until RFC-2026-003, that test file was executed by no CI run at all.

A test that cannot see the defect, and which was not running anyway. Every role
that ran the catalog tests got a truthful green.

## Decision

1. **Add the standing guard first.**
   `test-kits/contracts/catalog-reference-integrity.test.mjs` resolves every
   external `$ref` in every catalog schema against disk, asserts no `$ref`
   escapes `contract-catalog/`, asserts every file a manifest declares exists,
   and asserts every fixture on disk is declared by its manifest. It was written
   before the fix and **observed to fail**, naming both offending files and the
   paths they resolve to.
2. **Correct the two references** to `../ctr-ten-001/schema.json`. Two lines. No
   contract semantics, field, version, or freeze level changes.
3. **Materialize three Draft shared-kernel contracts** — CTR-API-001,
   CTR-PAG-001, CTR-IDM-001 — as schema, manifest, and synthetic valid/invalid
   fixtures, taking semantics only from the baseline and inventing none.
4. **No freeze-level movement.** All three remain `Draft`; the index still
   reports 4 Candidate and 10 Draft, asserted by test.

## Authority for the cross-package correction

`contract-catalog/shared-kernel/ctr-evt-001/**` and `ctr-job-001/**` are
WP-0A-CON-001 outputs. Correcting them from WP-0A-CON-002 is a cross-package
amendment under the same `CONTRIBUTING_AGENTS.md` Integration Owner/RFC path that
RFC-2026-003 used, and independent review ruled that path sufficient without
re-opening the owning package.

This amendment is **corrective, not anticipatory**: the references are broken
today. It is narrower than the RFC-2026-003 amendments — it changes two string
literals inside a delivered artifact and no ownership declaration — but it
touches delivered *content* rather than a boundary, so:

- both schemas record the correction in a `x-amended-by` field;
- `acknowledgement_required_from: /root/r0_steward`, WP-0A-CON-001's Integration
  Owner, with `acknowledgement_status: pending`;
- the guard in Decision 1 makes any recurrence a CI failure rather than a review
  judgement.

## Scope explicitly excluded

Contract freeze-level advancement, `contract-catalog/shared-kernel/index.json`
(owned by WP-0A-CON-001 and unchanged), production schema, migrations, RLS
implementation, provider SDKs, credentials, customer data, network calls, Gate G0
approval, and any merge authorization.

## Verification

- `npm run check` on pinned Node `24.20.0` / npm `11.19.0`.
- The reference-integrity guard must fail on the pre-fix tree naming both files,
  and pass after. Recorded in `evidence/WP-0A-CON-002/author-self-check.md`.
- Every valid fixture accepted and every negative fixture rejected, with at least
  two of each per contract.
- The index must still report 4 Candidate and 10 Draft after materialization.

## Rollback

Revert through a reviewed revert PR. Reverting restores the two broken references
exactly and removes the three Draft contract directories. No persisted data,
provider state, credential, migration, or customer-data effect exists.

## Limitations

Does not approve Gate G0, does not authorize a merge, does not advance any
contract freeze level, and does not substitute for the independent Reviewer,
Tester, Security, or Integration Owner evidence RFC-2026-002 requires.
