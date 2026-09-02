# A4 Vault — Asset/Storage representative review

- Work package: `WP-0A-A0-001`
- Reviewer run ID: `/root/a4_vault`
- Review type: read-only / dry-run representative review
- Date: 2026-08-31
- Scope: repository-bootstrap guardrails only; no storage implementation, provider configuration, credentials, customer data, schema, or G0 decision is reviewed or approved here.

## Basis reviewed

- `CONTRIBUTING_AGENTS.md`
- `work-packages/WP-0A-A0-001.json`
- Its declared Sprint 0A inputs: Decision Register/Contract Catalog, Multi-agent Operating Model, and G0 Readiness Report.
- Bootstrap evidence and fixture-plan references needed to assess the stated storage, tenant, and synthetic-data guardrails.

## Findings

1. **Tenant and deletion policy is preserved.** The canonical guide requires deny-by-default tenant isolation for every tenant-data path and explicitly requires an approved immutable manifest of exact production object keys; it forbids recursive deletion from a user-supplied prefix. This retains the storage safety baseline from DEC-017/DEC-023 and the G0 storage rules; it is a policy guardrail, not evidence that an adapter or purge job exists.
2. **Synthetic-only evidence is appropriate for REP-00.** The manifest classifies this package as `synthetic-only`, requires no secrets, and excludes provider integrations. The repository fixture-plan pointer uses a Fake AI/Fake Publish flow and requires tenant/business/page isolation and immutable asset-version pinning. No real customer asset, signed URL, provider bucket, or credential was needed for this review.
3. **Secret handling has a bounded deterministic check.** The guide prohibits secrets, customer content, private URLs, and permanent signed URLs in repository evidence. The documented Node-only scan and its synthetic-pattern tests are a useful bootstrap control. They do not replace future storage-provider secret handling, signed-access authorization, malware scanning, or CI/platform secret controls.
4. **Future storage work has a safe routing baseline.** The source-of-truth catalog assigns `MOD-080 asset-media` and `CTR-AST-001` / `PRT-STO-001` to A4 with A0 contract involvement. G0 explicitly orders `STO-01 Storage adapter + paths` after `DB-00 Tenant foundation`; `OPEN-020` keeps the provider decision behind a Storage Port/fake adapter. A future storage package must therefore use a new manifest with immutable UUID-key fixtures, trusted tenant context/RLS dependency, staging-to-ready state coverage, exact-key purge manifest, idempotent/resumable/reconciled deletion tests, restore drill evidence, and independent storage/security plus QA review. It must not infer provider choice, legal retention, RPO/RTO, or production credentials from REP-00.

## Verdict

**Approve with limitations — REP-00 repository bootstrap only.** The bootstrap does not weaken the required tenant, storage deletion, synthetic fixture, or secret-evidence guardrails, and it provides a traceable route for later storage work. This is not approval of any storage contract, object-store adapter, upload path, signed URL behavior, offboarding/purge implementation, provider configuration, restore drill, or Gate G0.

## Limitations and open evidence

- No `STO-01` manifest, storage implementation, lifecycle test, provider pricing/configuration, export/purge execution, or restore drill was reviewed or run.
- G0 storage lifecycle/restore evidence remains externally open; permanent self-service deletion must remain disabled until the required evidence exists.
- This review does **not** constitute cross-vendor evidence. No independently verified vendor diversity/capability benchmark or recorded cross-vendor dry run was available in the reviewed material.
- Product Owner approval, legal/PDPA retention decisions, and RPO/RTO/provider decisions remain with their documented owners.
