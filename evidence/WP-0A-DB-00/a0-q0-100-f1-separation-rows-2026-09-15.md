# Q0-100 F1 closed — the link narrowing's two halves are separated by fixture rows, and the probe that showed the gap now goes red

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Finding: [`q0-test-batch-100-2026-09-15.md`](q0-test-batch-100-2026-09-15.md) §3 F1 (MEDIUM).

## 1. What was wrong

Batch 100 said in four places that no fixture row can put a link's asset and content version in different narrowings, because §4.7's "same Business" forbids it, so the AND of the link narrowing's two halves was held only by a substring assertion. Q0 showed "same Business" ≠ "same narrowing" — `asset_a1` (business-level) and `content_version_a1_sibling_page` (page-restricted) are both under `business_a1` — and measured the consequence (probe Q6): with the content half replaced by an uncorrelated `exists()`, every link case stayed green.

## 2. What changed

- `tests/db/identity/fixtures/100-asset-fixture.sql`: two links at `sort_order 1` (the logical key is `(…, role, sort_order)`): `content_version_a1_sibling_page ← asset_a1/asset_version_a1`, and `content_version_a1 ← asset_a1_sibling_page/asset_version_a1_sibling_page`.
- `tests/db/identity/isolation-cases.mjs`: `ASSET_SEPARATION_LINK_BY_VERSION`; four cases — `pinned-editor-a-cannot-see-the-asset-link-whose-content-half-is-restricted`, `…-whose-asset-half-is-restricted` (`no-rows`, one half refusing each), and an owner positive per row. Ids carry no other family's control word (`page`, `business`), which the batch-100 rule refuses; the pinned asset-id count moves 76 → 80 (18 on `content_asset_links`).
- The three sentences that said it could not be done — the coverage note `AUTHORIZATION_CASE_COVERAGE[4]`, the sibling-target case's `why`, the static rule's message — corrected with the original quoted beside each; the static assertion that pinned the old sentence now pins the new one.

## 3. Measured on the scratch PostgreSQL 17.11 (fresh cluster)

| | Result |
|---|---|
| `rls-smoke` | **`841 isolation case(s) passed.`** = 837 + 4 |
| **Q0's probe Q6 replayed** — the content half of `content_asset_links_scope_narrows_member` swapped for `exists (select 1 from app.content_versions v)` on both halves, then the suite | **`FAILED — 1 of 841`: `pinned-editor-a-cannot-see-the-asset-link-whose-content-half-is-restricted` — "1 row(s) were visible and none should have been"**, and nothing else moved. The half is now held by a case, not by a substring. |
| static suite | 285/285 |

The asset half's mirror probe (asset half uncorrelated) was not replayed; by symmetry the `…-whose-asset-half-is-restricted` case is the one that would go red, and that is a claim rather than a measurement.

## 4. Not done

Q0-100 F2 (RIGHTS-3 projection guarded by nothing at the live ACL), F5, F6, F7, F8 and the other reviewers' findings on batch 100 stand in their files.
