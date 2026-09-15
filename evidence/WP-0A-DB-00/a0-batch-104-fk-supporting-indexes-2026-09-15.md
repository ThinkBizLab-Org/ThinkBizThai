# Batch 104 — every foreign key has a supporting index, and the rule that says so is live (C0-111 M1)

Run: `/claude/a0_atlas` (Author, A0 Integration). Date: 2026-09-15. Closes the blocker C0-111 M1
opened: `scripts/db/run.mjs` said "every FK has a supporting index" was asserted by the live
targets; no live target read `pg_index`; C0 counted twenty-one keys in `app`/`private` with no index
leading on their columns, every target green.

## 1. The rule, and what it is for

A foreign key is **supported** when some index on the referencing table has the key's columns as its
leading columns (any order), and the index is whole or partial on `<one of the key's columns> IS NOT
NULL` — a row whose key column is NULL references nothing, so an index that omits those rows still
finds every row a parent's DELETE or UPDATE has to check. Without one, deleting or re-keying a
parent scans the child table under the parent's lock, and nothing in the suite notices until the
table is large.

It lives in one place, `FK_SUPPORT_PROBE_SQL` in `scripts/db/run.mjs`, applied by `migrate-clean`
after every set (beside the ceiling probe), and again in 104's own apply-time block. Four keys are
exempt **by name with a reason**, in `FK_SUPPORT_EXEMPTIONS` and in 104's block; the contract test
holds the two lists equal and the probe refuses an exemption that names no key.

## 2. What the rule found, and what 104 does about it

C0's twenty-one, re-measured under the rule: **five** were already supported by a partial index on the
key's own `IS NOT NULL` (`asset_rights_proof_asset_idx`, `asset_versions_parent_idx`,
`content_asset_links_variant_idx`, `billing_webhook_receipts_workspace_idx`,
`meta_webhook_inbox_workspace_idx`) — C0's count did not accept that shape; **sixteen** remained.

| Disposition | Keys |
|---|---|
| **Eleven indexes** (twelve keys; one index on `approval_requests (workspace_id, business_profile_id, content_item_id, content_version_id)` supports the item key and the pinned-version key by prefix; partial where the key's last column is nullable, in 100's and 131's shape) | `approval_events_request_scope_fk`, `approval_policies_page_scope_fk`, `approval_requests_item_scope_fk`, `approval_requests_pinned_version_fk`, `approval_requests_policy_scope_fk`, `content_ideas_page_scope_fk`, `content_ideas_research_suggestion_fk`, `content_items_page_scope_fk`, `content_targets_item_scope_fk`, `content_targets_variant_scope_fk`, `content_versions_parent_scope_fk`, `quality_reviews_version_scope_fk` |
| **Exempt, with the reason in both lists** | `assets_current_version_scope_fk` (the partial index on `current_version_id` finds every row; `id` adds nothing), `billing_invoices_subscription_scope_fk` (subscription id is globally unique; single-column index is the lookup), `billing_payments_invoice_mode_fk` and `billing_payments_invoice_scope_fk` (the invoice index leads with the globally unique invoice id) |

## 3. Measured, scratch PostgreSQL 17.11 (fresh cluster each run)

| Run | Result |
|---|---|
| full set with 104 | `applied 104_fk_supporting_indexes.sql`; `fk support probe: every foreign key in app and private has a supporting index, 4 exempt by name`; lint ok; **857 isolation case(s) passed** (unchanged: no case, no policy) |
| the same set **without** 104 | `migrate-clean` **FAILED** at the probe, naming exactly the twelve keys above (P0001) |
| a fictitious exemption (`no_such_fk`) added to `FK_SUPPORT_EXEMPTIONS` | `migrate-clean` **FAILED**: `exempted foreign key(s) do not exist: no_such_fk` |
| a real exemption misspelled | `migrate-clean` **FAILED** on the key it no longer exempted (the first check fires first) |
| contract suite | 61/61 (60 → 61: the rule holding the two lists equal, the probe applied, eleven indexes counted) |

## 4. Recorded because it went wrong first

- 104's first block also asserted that every exemption names an existing key, and failed at apply
  time: three of the four are 130's and 131's keys, which sort **after** 104. The check moved to the
  probe, which runs after the whole set; the block says why.
- A `git checkout --` meant to restore a probe-mutated `run.mjs` restored the committed version and
  discarded the uncommitted probe; re-applied from a saved script, then checkpointed before the
  next mutation. Nothing in the tree differs from what was measured; the lesson is in the memory file.

## 5. Not decided here

Whether the four exemptions should become indexes anyway (a composite index costs writes; the
reasons stand on the referenced ids being globally unique). Migration invariant 3: `CREATE INDEX`
takes a SHARE lock; every table is empty on every instance this batch reaches, and the file says so.
