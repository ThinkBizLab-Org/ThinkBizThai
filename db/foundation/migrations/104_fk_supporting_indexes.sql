-- Batch 104 — every foreign key has a supporting index, and the rule that says so is live.
--
-- Owner: A0 Integration / DB-00. Closes C0-111 M1 (evidence/WP-0A-DB-00/c0-review-batch-111-2026-09-15.md)
-- and the blocker it opened: scripts/db/run.mjs said "every FK has a supporting index" was asserted
-- by the live targets, no live target read pg_index, and C0 measured twenty-one keys in app and
-- private with no index leading on their columns -- every target green. Batch 111 indexed its own
-- key and corrected its header; this batch writes the rule and pays the debt behind it.
--
-- THE RULE (scripts/db/run.mjs FK_SUPPORT_PROBE_SQL, applied by db-migrate-clean after every set, and
-- asserted again at the end of this file): a foreign key is SUPPORTED when some index on the
-- referencing table has the key's columns as its leading columns (any order), and the index is
-- either whole or partial on `<one of the key's columns> IS NOT NULL` -- a row whose key column is
-- NULL references nothing, so an index that omits those rows still finds every row a parent's
-- DELETE or UPDATE has to check. What the rule is for: without such an index, deleting or
-- re-keying a parent row scans the whole child table under the parent's lock (§4 invariant 2's
-- composite keys make every child a scan of a tenant's rows, not a table's), and nothing in the
-- suite would notice until the table was large.
--
-- ELEVEN INDEXES cover twelve of the sixteen keys the rule found unsupported on 2026-09-15 (one
-- index, on (workspace_id, business_profile_id, content_item_id, content_version_id), supports both
-- approval_requests_item_scope_fk and approval_requests_pinned_version_fk by prefix). Partial where
-- the key's last column is nullable, in the shape 100 and 131 already use (asset_versions_parent_idx,
-- billing_webhook_receipts_workspace_idx). Five of the twenty-one C0 counted were already supported
-- by exactly that partial shape, which the rule accepts and C0's count did not.
--
-- FOUR KEYS ARE EXEMPT BY NAME, with the reason beside each, in run.mjs and here; an exemption
-- without a reason fails the contract test:
--   assets_current_version_scope_fk (workspace_id, business_profile_id, id, current_version_id):
--     assets_current_version_idx (workspace_id, business_profile_id, current_version_id) WHERE
--     current_version_id IS NOT NULL finds every row a version's delete has to check; `id` is the
--     asset's own key and adds nothing to the lookup.
--   billing_invoices_subscription_scope_fk (workspace_id, billing_subscription_id):
--     billing_invoices_subscription_idx (billing_subscription_id) -- the subscription id is unique
--     across workspaces, so the single-column index is the lookup.
--   billing_payments_invoice_mode_fk (billing_invoice_id, livemode) and
--   billing_payments_invoice_scope_fk (workspace_id, billing_invoice_id):
--     billing_payments_invoice_idx (billing_invoice_id, occurred_at DESC, id DESC) leads with the
--     invoice id, unique across workspaces and modes; both keys are found through it.
--
-- Migration invariant 3: CREATE INDEX takes a SHARE lock on the table for the build. Every table
-- here is empty on every instance this batch can reach; on a populated instance the recovery is
-- CREATE INDEX CONCURRENTLY per statement outside a transaction, which this file does not do
-- because the driver applies a migration as one transaction. Stated rather than hidden, as 131 did.

create index if not exists approval_events_request_scope_idx
  on app.approval_events (workspace_id, business_profile_id, approval_request_id);
create index if not exists approval_policies_page_scope_idx
  on app.approval_policies (workspace_id, business_profile_id, page_context_profile_id);
create index if not exists approval_requests_item_version_scope_idx
  on app.approval_requests (workspace_id, business_profile_id, content_item_id, content_version_id);
create index if not exists approval_requests_policy_scope_idx
  on app.approval_requests (workspace_id, business_profile_id, policy_version_id);
create index if not exists content_ideas_page_scope_idx
  on app.content_ideas (workspace_id, business_profile_id, page_context_profile_id);
create index if not exists content_ideas_research_suggestion_idx
  on app.content_ideas (research_suggestion_id) where research_suggestion_id is not null;
create index if not exists content_items_page_scope_idx
  on app.content_items (workspace_id, business_profile_id, page_context_profile_id);
create index if not exists content_targets_item_scope_idx
  on app.content_targets (workspace_id, business_profile_id, content_item_id);
create index if not exists content_targets_variant_scope_idx
  on app.content_targets (workspace_id, business_profile_id, content_variant_id) where content_variant_id is not null;
create index if not exists content_versions_parent_idx
  on app.content_versions (workspace_id, business_profile_id, content_item_id, parent_version_id) where parent_version_id is not null;
create index if not exists quality_reviews_version_scope_idx
  on app.quality_reviews (workspace_id, business_profile_id, content_version_id);

-- ============================================================================================
-- WHAT THIS MIGRATION ASSERTS ABOUT THE DATABASE IT HAS JUST CHANGED — the rule, once, here;
-- run.mjs applies the same text after every migrate-clean so a later batch cannot add a key
-- without an index and stay green.
-- ============================================================================================
do $$
declare
  offending text;
  exempt constant text[] := array[
    'assets_current_version_scope_fk', 'billing_invoices_subscription_scope_fk',
    'billing_payments_invoice_mode_fk', 'billing_payments_invoice_scope_fk'];
begin
  with fk as (
    select c.oid, c.conname, c.conrelid, c.conkey
      from pg_catalog.pg_constraint c join pg_catalog.pg_namespace n on n.oid = c.connamespace
     where c.contype = 'f' and n.nspname in ('app', 'private')
  ), covered as (
    select distinct fk.oid from fk join pg_catalog.pg_index i on i.indrelid = fk.conrelid
     where (select array_agg(x order by x) from unnest((i.indkey::int2[])[0:array_length(fk.conkey, 1) - 1]) x)
         = (select array_agg(x order by x) from unnest(fk.conkey) x)
       and (i.indpred is null
            or exists (select 1 from unnest(fk.conkey) k
                        where pg_catalog.pg_get_expr(i.indpred, i.indrelid)
                            = '(' || quote_ident((select attname from pg_catalog.pg_attribute where attrelid = fk.conrelid and attnum = k)) || ' IS NOT NULL)'))
  )
  select string_agg(fk.conrelid::regclass::text || '.' || fk.conname, ', ' order by fk.conname) into offending
    from fk where fk.oid not in (select oid from covered) and not (fk.conname = any (exempt));
  if offending is not null then
    raise exception 'foreign key(s) with no supporting index and no named exemption: %', offending
      using hint = 'Batch 104: add an index whose leading columns are the key''s (whole, or partial on one of them IS NOT NULL), or add the key to the exemption list in this file AND in scripts/db/run.mjs with the reason.';
  end if;
  -- Three of the four exempt keys are batch 130's and 131's, which sort AFTER this file, so this
  -- block cannot ask whether every exemption names a key that exists; run.mjs's probe, applied after
  -- the whole set, asks it. (Recorded because the first version asked here and failed at apply time.)
end $$;
