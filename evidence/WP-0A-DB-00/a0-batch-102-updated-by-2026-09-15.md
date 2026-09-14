# Batch 102 — updated_by, when a client writes it at INSERT, is the caller, on thirteen tables

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Closes the LOW siblings of A1-090 S13: `updated_by` sits in the INSERT grant to `authenticated` on thirteen client-writable tables, every INSERT policy checks `created_by = auth.uid()` and the role, and none checks `updated_by` — checked on UPDATE everywhere, so the INSERT was the one statement that could write somebody else's name into the column.

## 1. The change

- `db/foundation/migrations/102_updated_by_is_caller.sql` (numbered after 100 because it names `app.assets`): one RESTRICTIVE, INSERT-only, `TO authenticated` policy per table, `with check (updated_by is null or updated_by = (select auth.uid()))`, ANDed with each table's permissive INSERT policy. **NULL is admitted**, stated as the one difference from 094: `updated_by` is nullable on all thirteen and a row never updated has no updater; `created_by` carries the attribution at INSERT. An apply-time block asserts the thirteen by shape and a **schema-wide rule**: no `app` table lets `authenticated` INSERT `updated_by` without an INSERT policy that names the column beside `auth.uid()`.
- Two cases, one per family shape: `owner-a-cannot-create-a-content-item-in-the-editors-name` (080) and `owner-a-cannot-create-a-page-in-the-editors-name` (020), each `denied` by policy with `created_by` the caller and `updated_by` the editor. Builders: `contentCreateItemUpdatedBy`, `createPageUpdatedBy`.

The tables: `workspace_invitations` (010), `business_profiles`, `page_context_profiles` (020), `workspace_member_scopes` (021), `industry_assignments` (030), `knowledge_items` (040), `content_ideas`, `content_items` (080), `content_targets` (081), `approval_policies`, `approval_requests` (090), `assets`, `asset_rights` (100) — measured by reading every `grant insert (…)` against every INSERT policy's WITH CHECK.

## 2. Measured on the scratch PostgreSQL 17.11 (fresh cluster each time)

| | Result |
|---|---|
| **without 102**, the two cases | `FAILED — 2 of 847` (replayed on the post-111 base, scratch 17.11, 2026-09-15): both forgeries land — "1 row(s) came back. The operation was permitted." |
| with 102 | `applied 102_updated_by_is_caller.sql`; **`847 isolation case(s) passed.`** = 845 + 2 (first measured as 846 = 844 + 2 before batch 111 merged; both runs on the scratch 17.11); every existing positive INSERT still passes, so no builder was leaving `updated_by` to somebody else |
| static suites | identity 285/285 |

## 3. Not done

`app_worker`'s INSERT grants that include `updated_by` (`workspace_invitations` in 010, `meta_connections` in 110) are not bound: the worker acts for no user and `auth.uid()` is not its identity; that is RFC-2026-022's question. A1-090 S14 and the other findings stand.
