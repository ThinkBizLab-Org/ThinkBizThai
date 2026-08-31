# WP-0A-CON-002 — Author self-check

Author run: `/claude/a0_atlas` (Anthropic, `claude-opus-5`)
Base revision: `4e1d6e5` (branch `agent/claude/WP-0A-A0-002-contract-test-coverage`)
Branch: `agent/claude/WP-0A-CON-002-envelope-contracts`
Date: 2026-08-31

Author self-evidence only. Not review, security, test, integration, Product Owner,
or merge approval, and it does not move Gate G0.

## D3 — the guard was written first and observed to fail

`test-kits/contracts/catalog-reference-integrity.test.mjs` was written and run
**before** the two `$ref`s were corrected. Observed on pinned Node `24.20.0`:

```
ℹ tests 4   ℹ pass 3   ℹ fail 1

AssertionError: unresolved catalog $ref(s):
  contract-catalog/shared-kernel/ctr-evt-001/schema.json $.properties.tenant_context.$ref
    -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
  contract-catalog/shared-kernel/ctr-job-001/schema.json $.properties.tenant_context.$ref
    -> ../../ctr-ten-001/schema.json -> contract-catalog/ctr-ten-001/schema.json
```

After correcting both to `../ctr-ten-001/schema.json`: `tests 4 / pass 4 / fail 0`.

This ordering matters. A guard written after a fix proves only that the fix is
present; a guard observed failing on the defect proves it detects the defect.

### Why this survived WP-0A-CON-001's four independent roles

Not a review failure. `shared-kernel-contract-catalog.test.mjs` validates fixtures
with hand-written predicates and never resolves a `$ref`, so a dangling reference
is structurally invisible to it — and until WP-0A-A0-002 that file was executed by
no CI run at all. A test that cannot see the defect, which was not running anyway.

The two affected contracts are CTR-EVT-001 and CTR-JOB-001: the envelopes that
carry every domain event and every background job. Their entire declared tenant
isolation constraint pointed at a file that does not exist.

## Baseline sourcing — no invented semantics

Every rule below traces to a source line; none was inferred.

| Contract | Source | Rule materialized |
|---|---|---|
| CTR-API-001 | Workstream §D API-001 | "success/error/correlation serialize ได้และไม่ leak internal detail" — exactly one of `data`/`error`/`accepted`; error `details` must be empty |
| CTR-API-001 | Workstream §D API-005 | "`accepted` response + job/status/deep-link refs" — the `accepted` receipt shape |
| CTR-PAG-001 | Workstream §D API-003 | "Stable ordering; no duplicate/missing ระหว่าง page; cursor opaque/tamper-safe" — ≥2 sort keys so a tiebreaker exists, opaque cursor charset, bounded page size |
| CTR-IDM-001 | Workstream §G ID-001 | "key scope includes workspace+operation; payload hash mismatch conflict" |
| CTR-IDM-001 | Workstream §D API-002 | "request key เดิม+payloadเดิมคืนผลเดิม; payloadต่างกันได้ conflict" — the replay fixture pair shares key, scope and payload hash |

What each manifest's `freeze_boundary` explicitly declines to infer: CTR-API-001
auth rules, OpenAPI generation (API-006) and optimistic-concurrency preconditions
(API-004); the CTR-PAG-001 cursor encoding, signing algorithm and key management;
the CTR-IDM-001 store implementation, lock strategy, retention window and HTTP
header name. Only opacity and the absence of a client-decodable offset are
contractual for the cursor.

## Freeze level not moved

`contract-catalog/shared-kernel/index.json` is owned by WP-0A-CON-001 and is
**untouched**. It still reports 4 Candidate and 10 Draft, asserted by test.
Materializing a Draft contract's schema and fixtures does not promote it.

## Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` (pre-fix) | `1` | `tests 4 / pass 3 / fail 1` — both offending files named |
| `node --test test-kits/contracts/catalog-reference-integrity.test.mjs` (post-fix) | `0` | `tests 4 / pass 4 / fail 0` |
| `npm run check` | `0` | `tests 59 / pass 59 / fail 0` (46 → 59) |
| `node --test test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | `0` | 9 tests |
| `node scripts/validate-work-package-ownership.mjs work-packages` | `0` | no output |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-002.json` | `0` | no output |
| `node scripts/scan-repository-secrets.mjs` | `0` | no output (weak — see WP-0A-A0-002 Security C1) |

## Author-declared limitations

- This run authored the change and must not review, security-review,
  test-verify, or integrate it.
- The correction touches two WP-0A-CON-001 **delivered artifacts**, not just an
  ownership declaration. RFC-2026-004 records the authority; both schemas carry
  `x-amended-by` with `acknowledgement_status: pending` from `/root/r0_steward`.
  An Integration Owner must rule on whether amending delivered content carries
  the same authority as amending a boundary.
- No validator resolves `$ref` at runtime — the schemas are declarative artifacts
  and the tests use hand-written predicates. The new guard checks reference
  *integrity*, not that any consumer honours the reference. A future package
  introducing real schema validation should re-check this.
- This package depends on unmerged WP-0A-A0-002. Without it the ownership
  validator rejects these paths and CI executes no contract test at all.
- The `sha256:` payload-hash fixture uses a repeated-character digest. It is
  format-valid and synthetic by construction; it is not a real hash of any
  payload and must not be treated as one.
