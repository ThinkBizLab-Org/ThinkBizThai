#!/usr/bin/env node
// The single entry point behind every `make db-*` target.
//
// DATA-DEC-02 fixes the contract as commands and outcomes; this file is the wrapper that hides
// which tool performs them. Today no tool is chosen and no database is provisioned, and that is
// the point of how this is written:
//
//   **A target that cannot do its job exits non-zero and says what is missing.** It never reports
//   a pass it did not earn. This repository has spent its whole history removing guards that
//   reported clean runs they could not substantiate — a database harness that printed "ok" with no
//   database would be the largest one yet.
//
// Targets split into two kinds:
//   * STATIC — answerable from the repository alone (schema lint over the migration text, the
//     command contract itself). These run anywhere and really check.
//   * LIVE   — require a Postgres test instance (migrate, seed replay, RLS smoke). These refuse,
//     naming the environment variable that would let them run.
import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { psqlLex } from './psql-driver.mjs';
import { argv, env, exit, stdout, stderr, hrtime } from 'node:process';

const MIGRATIONS = 'db/foundation/migrations';

// The one variable that turns the live half on. It is deliberately NOT `DATABASE_URL`: §12.5
// requires a separate test instance and forbids a production URL, so the name says test.
const TEST_URL = 'DB_TEST_URL';

export const LIVE = new Set(['reset-test', 'migrate-clean', 'migrate-upgrade', 'seed-replay', 'rls-smoke', 'test-foundation']);
const STATIC = new Set(['schema-lint', 'contract-check', 'generated-drift-check']);
export const ORDER = ['reset-test', 'migrate-clean', 'migrate-upgrade', 'seed-replay', 'schema-lint',
  'rls-smoke', 'contract-check', 'generated-drift-check', 'test-foundation'];

const redact = (text) => String(text).replace(/(postgres(?:ql)?:\/\/)[^\s"']*/gi, '$1[redacted]');

// §12.5: a stable summary line — command, elapsed, outcome — on every target, pass or fail.
function summarise(target, startedAt, ok, detail) {
  const ms = Math.round(Number(hrtime.bigint() - startedAt) / 1e6);
  stdout.write(`db-${target}: ${ok ? 'ok' : 'FAILED'} in ${ms}ms${detail ? ` — ${redact(detail)}` : ''}\n`);
}

async function migrationFiles() {
  const names = (await readdir(MIGRATIONS)).filter((n) => n.endsWith('.sql')).sort();
  const out = [];
  for (const name of names) out.push({ name, sql: await readFile(join(MIGRATIONS, name), 'utf8') });
  return out;
}

// What `db-migrate-clean` applies, in order, and the reason it is a function rather than a loop
// inside the target: the prerequisite is part of the declared command, so it has to be visible to
// a test without reading this file as text.
//
// Batch 000 installs pgcrypto into `public` when nothing has installed it anywhere, and batch 004
// refuses a database with pgcrypto in `public`. Both are applied and migration invariant 1 forbids
// rewriting either, so the set is applicable only where pgcrypto already exists outside `public`.
// That was true of the provisioned instance by the platform's doing and of CI by a line inside a
// GitHub workflow — which meant `make db-migrate-clean` could not apply this repository's own
// migration set to a bare Postgres (C0's review D3). PREREQUISITE is that line, moved into the
// command, where it is applied on every database rather than on the two that were prepared.
export const PREREQUISITE = 'db/foundation/prerequisites.sql';

// A script larger than MAX_ARG_STRLEN (131,072 bytes on Linux) that changes nothing: one empty DO
// block and a comment. Applied by db-migrate-clean after the real set, so a driver that silently
// went back to `--command` fails the target instead of the next big migration.
export const CEILING_PROBE_BYTES = 200000;
export const CEILING_PROBE_SQL = `do \$\$ begin end \$\$;\n-- ${'x'.repeat(CEILING_PROBE_BYTES)}\n`;

// FOREIGN-KEY SUPPORT, ASSERTED LIVE. run.mjs used to say this was "asserted by the live targets"
// and no live target read pg_index (C0-111 M1: twenty-one keys, every target green). Batch 104
// wrote the rule and paid the debt; this is the rule, applied after every migrate-clean so the next
// key without an index fails the target by name. A key is supported when some index on its table
// leads with the key's columns (any order), whole or partial on one of them IS NOT NULL. The four
// exemptions carry their reasons and are the same four 104's own block names; the contract test
// holds the two lists equal. Each is keyed SCHEMA.TABLE.CONSTRAINT (blocker 186 item 18; Q0 F6 on
// batch 125): keyed by name alone, an unindexed key on ANOTHER table named like an exempt one passed,
// and the stale-exemption rule was satisfied as long as some key of that name existed anywhere.
export const FK_SUPPORT_EXEMPTIONS = {
  'app.assets.assets_current_version_scope_fk': 'assets_current_version_idx (workspace_id, business_profile_id, current_version_id) WHERE current_version_id IS NOT NULL finds every row a version delete checks; id is the asset\'s own key and adds nothing',
  'app.billing_invoices.billing_invoices_subscription_scope_fk': 'billing_invoices_subscription_idx (billing_subscription_id): the subscription id is unique across workspaces, so the single column is the lookup',
  'app.billing_payments.billing_payments_invoice_mode_fk': 'billing_payments_invoice_idx leads with billing_invoice_id, unique across workspaces and modes',
  'app.billing_payments.billing_payments_invoice_scope_fk': 'billing_payments_invoice_idx leads with billing_invoice_id, unique across workspaces and modes',
};
export const FK_SUPPORT_PROBE_SQL = `do \$\$
declare
  offending text;
  exempt constant text[] := array[${Object.keys(FK_SUPPORT_EXEMPTIONS).map((k) => `'${k}'`).join(', ')}];
begin
  with fk as (
    select c.oid, c.conname, c.conrelid, c.conkey, format('%s.%s.%s', n.nspname, cl.relname, c.conname) as key
      from pg_catalog.pg_constraint c join pg_catalog.pg_namespace n on n.oid = c.connamespace
      join pg_catalog.pg_class cl on cl.oid = c.conrelid
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
  select string_agg(fk.key, ', ' order by fk.key) into offending
    from fk where fk.oid not in (select oid from covered) and not (fk.key = any (exempt));
  if offending is not null then
    raise exception 'foreign key(s) with no supporting index and no named exemption: %', offending;
  end if;
  -- Every exemption names a key that exists; a stale exemption is a lie about the catalog. Asked
  -- here and not in 104's own block because three of the four are 130's and 131's keys, which sort
  -- after 104.
  select string_agg(e, ', ' order by e) into offending from unnest(exempt) e
   where not exists (select 1 from pg_catalog.pg_constraint c
                       join pg_catalog.pg_namespace n on n.oid = c.connamespace
                       join pg_catalog.pg_class cl on cl.oid = c.conrelid
                      where format('%s.%s.%s', n.nspname, cl.relname, c.conname) = e and c.contype = 'f');
  if offending is not null then
    raise exception 'exempted foreign key(s) do not exist: %', offending;
  end if;
end \$\$;
`;

// FOUR CATALOG-RULE PROBES (the weak-assertion survey's items 1, 2 and 4; plan and disposition of
// 2026-09-27). Each asserts a rule over the whole of app and private that no apply-time block
// states, so no later file can break it silently and no replacement could carry it (a replacement
// exists only for a block a later file made false). Measured on the full set before any was written:
// 87 of 87 foreign keys NO ACTION and not deferrable; 5 of 5 SECURITY DEFINER functions with
// search_path=""; 395 of 395 triggers enabled (348 of them internal); 14 + 2 closures in one deparse each. No exemption is
// needed for any of them today. Every list a probe prints is ORDERED: PR #157 is what an unordered
// string_agg in a comparison costs.

// 1. Every foreign key, in EVERY schema but the system ones: NO ACTION on delete and update, not
// deferrable, and VALIDATED. The survey measured `ON UPDATE CASCADE`, and `ON DELETE CASCADE` written
// under a temporary name and renamed into place, each surviving every layer; Q0 measured a NOT VALID
// key and a cascading key from a `public` table surviving the first version (F4, F07). An exemption
// is keyed `schema.table.constraint` (Q0 F6) and carries its reason; one that lets a delete cascade
// through tenant data is the irreversible-deletion stop-the-line class (A1 F6, README).
export const FK_ACTION_EXEMPTIONS = {};
export const FK_ACTION_PROBE_SQL = `do \$\$
declare
  offending text;
  exempt constant text[] := array[${Object.keys(FK_ACTION_EXEMPTIONS).map((k) => `'${k}'`).join(', ')}]::text[];
begin
  select string_agg(format('%s.%s (on delete %s, on update %s%s%s)', c.conrelid::regclass, c.conname,
                           c.confdeltype, c.confupdtype, case when c.condeferrable then ', deferrable' else '' end,
                           case when c.convalidated then '' else ', NOT VALID' end),
                    ', ' order by c.conrelid::regclass::text, c.conname) into offending
    from pg_catalog.pg_constraint c join pg_catalog.pg_namespace n on n.oid = c.connamespace
   where c.contype = 'f' and n.nspname not in ('pg_catalog', 'information_schema')
     and (c.confdeltype <> 'a' or c.confupdtype <> 'a' or c.condeferrable or not c.convalidated)
     and not (format('%s.%s', c.conrelid::regclass, c.conname) = any (exempt));
  if offending is not null then
    raise exception 'foreign key(s) with an action, deferrable or NOT VALID, and no named exemption: %', offending;
  end if;${Object.keys(FK_ACTION_EXEMPTIONS).length === 0 ? '' : `
  select string_agg(e, ', ' order by e) into offending from unnest(exempt) e
   where not exists (select 1 from pg_catalog.pg_constraint c where format('%s.%s', c.conrelid::regclass, c.conname) = e and c.contype = 'f');
  if offending is not null then
    raise exception 'exempted foreign key(s) do not exist: %', offending;
  end if;`}
end \$\$;
`;

// 2. The caller-binding closures, by EXACT deparse text on an exact (table, name) set. Every block
// that reads them reads tokens, and \`... or true\` keeps the tokens: A1 measured three tables, Q0 one,
// the survey a fourth, each surviving every layer. A batch that adds a closure adds its pair here.
export const UPDATED_BY_CLOSURES = ['approval_policies', 'approval_requests', 'asset_rights', 'assets',
  'business_profiles', 'content_ideas', 'content_items', 'content_targets', 'industry_assignments',
  'knowledge_items', 'page_context_profiles', 'publish_intents', 'workspace_invitations', 'workspace_member_scopes'];
export const REQUESTER_CLOSURES = ['approval_requests', 'publish_intents'];
// The updated_by UPDATE closures: batch 105's seven (updated_by client-updatable and bound nowhere) and
// batch 123's ten (bound only inside a permissive policy, which a looser sibling could widen), and batch
// 091's two, carried from birth. Every
// table that grants authenticated UPDATE on updated_by is here; the probe refuses one that is not.
export const UPDATED_BY_ON_UPDATE_CLOSURES = ['approval_policies', 'approval_requests', 'asset_rights', 'assets',
  'business_profiles', 'calendar_items', 'content_ideas', 'content_items', 'content_schedules', 'content_targets',
  'industry_assignments', 'knowledge_items',
  'page_context_profiles', 'publish_intents', 'research_runs', 'research_suggestions', 'workspace_invitations',
  'workspace_settings', 'workspaces'];
export const UPDATED_BY_ON_UPDATE_CHECK_TEXT = '(updated_by = ( SELECT auth.uid() AS uid))';
export const UPDATED_BY_CHECK_TEXT = '((updated_by IS NULL) OR (updated_by = ( SELECT auth.uid() AS uid)))';
export const REQUESTER_CHECK_TEXT = '(requested_by = ( SELECT auth.uid() AS uid))';
const closureRule = (suffix, tables, text, cmd = 'a') => `
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s.%s', c.relname, pol.polname) as x
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where right(pol.polname, ${suffix.length + 1}) = '_${suffix}'
       and not (n.nspname = 'app'
                and c.relname = any (array[${tables.map((t) => `'${t}'`).join(', ')}])
                and pol.polname = c.relname || '_${suffix}'
                and not pol.polpermissive and pol.polcmd = '${cmd}'
                and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
                and pol.polqual is null
                and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = '${text}')
    union all
    select format('app.%s has no %s_${suffix}', t, t) from unnest(array[${tables.map((t) => `'${t}'`).join(', ')}]) t
     where not exists (select 1 from pg_catalog.pg_policy pol
                        where pol.polrelid = to_regclass('app.' || t) and pol.polname = t || '_${suffix}')
  ) found;
  if offending is not null then
    raise exception '${suffix} closure(s) not in their pinned shape (restrictive, ${cmd === 'a' ? 'INSERT' : 'UPDATE'}, TO authenticated, no USING, WITH CHECK exactly ${text.replace(/'/g, "''")}) on their pinned tables: %', offending;
  end if;`;
// ONE RULE PER PROBE, so each has its own self-test drift (Q0's test of 123, F3: three rules in one
// probe with one drift left two of them live but never shown able to fail).
const closureProbe = (rule) => `do \$\$
declare
  offending text;
begin${rule}
end \$\$;
`;
export const UPDATED_BY_CLOSURE_PROBE_SQL = closureProbe(closureRule('updated_by_is_caller', UPDATED_BY_CLOSURES, UPDATED_BY_CHECK_TEXT));
export const REQUESTER_CLOSURE_PROBE_SQL = closureProbe(closureRule('requester_is_caller', REQUESTER_CLOSURES, REQUESTER_CHECK_TEXT));
export const UPDATED_BY_ON_UPDATE_CLOSURE_PROBE_SQL = closureProbe(closureRule('updated_by_on_update_is_caller', UPDATED_BY_ON_UPDATE_CLOSURES, UPDATED_BY_ON_UPDATE_CHECK_TEXT, 'w'));
// Batch 123's decider closure: who decided is the caller, whichever permissive policy admitted the row.
export const DECIDER_CLOSURES = ['approval_requests'];
export const DECIDER_CHECK_TEXT = '((decided_by IS NULL) OR (decided_by = ( SELECT auth.uid() AS uid)))';
export const DECIDER_CLOSURE_PROBE_SQL = closureProbe(closureRule('decided_by_on_update_is_caller', DECIDER_CLOSURES, DECIDER_CHECK_TEXT, 'w'));
// Batch 127's created_by INSERT closures (blocker 186; A1 F5 on batch 123, A1 F3 on batch 091). Every
// table that grants authenticated INSERT on created_by, measured from the catalog on the clean set
// through 126: nineteen, where created_by was bound only inside twenty-four permissive INSERT policies,
// so a looser permissive sibling reopened the forgery with every layer green. Equality, as 105's: every
// permissive INSERT policy on these tables already required it.
export const CREATED_BY_CLOSURES = ['approval_policies', 'approval_requests', 'asset_rights', 'assets',
  'business_profile_versions', 'business_profiles', 'calendar_items', 'content_ideas', 'content_items',
  'content_schedules', 'content_targets', 'industry_assignments', 'knowledge_item_versions', 'knowledge_items',
  'page_context_profile_versions', 'page_context_profiles', 'publish_intents', 'workspace_invitations',
  'workspace_member_scopes'];
export const CREATED_BY_CHECK_TEXT = '(created_by = ( SELECT auth.uid() AS uid))';
export const CREATED_BY_CLOSURE_PROBE_SQL = closureProbe(closureRule('created_by_is_caller', CREATED_BY_CLOSURES, CREATED_BY_CHECK_TEXT));

// 2b. COVERAGE of the attribution UPDATE closures, as its own probe so it has its own self-test drift
// (Q0's test of 105, F3; C0's review of 123, F5: folded into the closure probe, it could be silenced
// with `and false` while the closure probe's drift still passed). EVERY client-updatable column named
// `*_by` records who did something, so each must be in a pinned closure list for its column: updated_by
// in UPDATED_BY_ON_UPDATE_CLOSURES, decided_by in DECIDER_CLOSURES. The first version read updated_by
// alone, so a later table with a client-writable decided_by and no closure would pass (A1's
// re-verification of 123, N3). A (table, column) that is not pinned fails by name.
export const ATTRIBUTION_UPDATE_CLOSURES = {
  updated_by: UPDATED_BY_ON_UPDATE_CLOSURES,
  decided_by: DECIDER_CLOSURES,
};
export const CLOSURE_COVERAGE_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(format('app.%s.%s', c.relname, a.attname), ', ' order by c.relname, a.attname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
   where n.nspname = 'app' and c.relkind in ('r', 'p')
     and a.attname like '%\\_by'
     and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE')
     and not (format('%s.%s', c.relname, a.attname) = any (array[${Object.entries(ATTRIBUTION_UPDATE_CLOSURES).flatMap(([col, tables]) => tables.map((t) => `'${t}.${col}'`)).join(', ')}]));
  if offending is not null then
    raise exception 'client-updatable attribution column(s) with no pinned UPDATE closure: %', offending;
  end if;
end \$\$;
`;
// 2b'. THE SAME COVERAGE AT INSERT (batch 127). The UPDATE probe above reads only UPDATE, so a later
// table granting authenticated INSERT on created_by -- or on any `*_by` column -- with no closure passed
// every probe; only 127's own apply-time block, for created_by alone, would have refused it. At INSERT
// the set is bounded and measured: created_by on nineteen tables, updated_by on fourteen (102 and 120)
// and requested_by on two (094 and 120), each held by a restrictive INSERT closure pinned by exact text
// in its own probe. A (table, column) client-insertable and not pinned fails by name. Its own probe, so
// it has its own drift (C0 on 123, F5).
export const ATTRIBUTION_INSERT_CLOSURES = {
  created_by: CREATED_BY_CLOSURES,
  requested_by: REQUESTER_CLOSURES,
  updated_by: UPDATED_BY_CLOSURES,
};
export const INSERT_CLOSURE_COVERAGE_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(format('app.%s.%s', c.relname, a.attname), ', ' order by c.relname, a.attname) into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
   where n.nspname = 'app' and c.relkind in ('r', 'p')
     and a.attname like '%\\_by'
     and pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT')
     and not (format('%s.%s', c.relname, a.attname) = any (array[${Object.entries(ATTRIBUTION_INSERT_CLOSURES).flatMap(([col, tables]) => tables.map((t) => `'${t}.${col}'`)).join(', ')}]));
  if offending is not null then
    raise exception 'client-insertable attribution column(s) with no pinned INSERT closure: %', offending;
  end if;
end \$\$;
`;
// 2b''. EVERY CLIENT-WRITABLE TABLE'S PERMISSIVE POLICIES, EXACTLY (batch 127; the Owner's answer of
// 2026-10-03 to A0's recommendation (3)). A restrictive closure holds one column against any permissive
// policy, but a looser permissive sibling under a NEW name still widens everything else the permissive
// set decides -- who may insert at all, which rows an UPDATE reaches, which rows a SELECT shows -- and
// before this probe only 081's and 091's replacements pinned a permissive COUNT, on two tables: batch
// 127's draft measured a looser INSERT sibling beside each of the 24 permissive INSERT policies passing
// migrate-clean on the other seventeen created_by tables (its D1). Here every app table a client can
// write -- INSERT or UPDATE on any column, or DELETE, held by anon or authenticated -- has its permissive
// policies read and compared with this list by (table, name), command, roles and the EXACT deparse of
// both halves (search_path pinned to pg_catalog, as every probe job runs). Anything unlisted, missing or
// changed is named. Measured on the clean set through 127: 74 permissive policies on 25 tables, all
// TO authenticated, none FOR ALL or DELETE. A batch that adds, drops or rewrites a permissive policy on
// a client-writable table changes this list in the same diff, which puts every widening in front of a
// reviewer. Read from schema app, tables only: a view, and a table in public or private, are refused any client
// privilege outright by the client privilege probe below (batch 127's review round; A1 F6 on batch 123).
export const PERMISSIVE_POLICIES = {
  'approval_policies.approval_policies_insert_manager': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'approval_policies.approval_policies_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'approval_policies.approval_policies_update_manager': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'approval_requests.approval_requests_insert_writer': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'approval_requests.approval_requests_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'approval_requests.approval_requests_update_cancel_writer': { cmd: 'w', roles: 'authenticated', using: "((app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])) AND (status = 'pending'::text))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])) AND (status = 'cancelled'::text))" },
  'approval_requests.approval_requests_update_decide_approver': { cmd: 'w', roles: 'authenticated', using: "((app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'approver'::text])) AND (status = 'pending'::text))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (decided_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'approver'::text])) AND (status = ANY (ARRAY['approved'::text, 'changes_requested'::text])))" },
  'asset_rights.asset_rights_insert_writer': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'asset_rights.asset_rights_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'asset_rights.asset_rights_update_writer': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'assets.assets_insert_writer': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'assets.assets_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'assets.assets_update_writer': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'business_profile_versions.business_profile_versions_insert_owner_or_admin': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'business_profile_versions.business_profile_versions_insert_scoped_editor': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_business(workspace_id, business_profile_id))" },
  'business_profile_versions.business_profile_versions_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'business_profiles.business_profiles_insert_owner_or_admin': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'business_profiles.business_profiles_insert_scoped_editor': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_business(workspace_id, id))" },
  'business_profiles.business_profiles_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'business_profiles.business_profiles_update_owner_or_admin': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))", check: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))" },
  'business_profiles.business_profiles_update_scoped_editor': { cmd: 'w', roles: 'authenticated', using: "((app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_business(workspace_id, id))", check: "((app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_business(workspace_id, id))" },
  'calendar_items.calendar_items_insert_scheduler': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'calendar_items.calendar_items_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'calendar_items.calendar_items_update_scheduler': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'content_ideas.content_ideas_insert_writer': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'content_ideas.content_ideas_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'content_ideas.content_ideas_update_writer': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'content_items.content_items_insert_writer': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'content_items.content_items_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'content_items.content_items_update_writer': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'content_schedules.content_schedules_insert_scheduler': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])) AND (status = 'draft'::text) AND (publish_intent_id IS NULL) AND (version = 1))" },
  'content_schedules.content_schedules_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'content_schedules.content_schedules_update_scheduler': { cmd: 'w', roles: 'authenticated', using: "((app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])) AND (status = ANY (ARRAY['draft'::text, 'armed'::text])))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])) AND (status = ANY (ARRAY['draft'::text, 'cancelled'::text])))" },
  'content_targets.content_targets_insert_writer': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'content_targets.content_targets_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'content_targets.content_targets_update_writer': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'industry_assignments.industry_assignments_insert_owner_or_admin': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])) AND (EXISTS ( SELECT 1\n   FROM app.business_profiles b\n  WHERE ((b.workspace_id = industry_assignments.workspace_id) AND (b.id = industry_assignments.business_profile_id) AND (b.archived_at IS NULL)))))" },
  'industry_assignments.industry_assignments_insert_scoped_editor': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_business(workspace_id, business_profile_id) AND (EXISTS ( SELECT 1\n   FROM app.business_profiles b\n  WHERE ((b.workspace_id = industry_assignments.workspace_id) AND (b.id = industry_assignments.business_profile_id) AND (b.archived_at IS NULL)))))" },
  'industry_assignments.industry_assignments_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'industry_assignments.industry_assignments_update_owner_or_admin': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))", check: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))" },
  'industry_assignments.industry_assignments_update_scoped_editor': { cmd: 'w', roles: 'authenticated', using: "((app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_business(workspace_id, business_profile_id))", check: "((app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_business(workspace_id, business_profile_id))" },
  'knowledge_item_versions.knowledge_item_versions_insert_writer': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'knowledge_item_versions.knowledge_item_versions_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'knowledge_items.knowledge_items_insert_writer': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])) AND (EXISTS ( SELECT 1\n   FROM app.business_profiles b\n  WHERE ((b.workspace_id = knowledge_items.workspace_id) AND (b.id = knowledge_items.business_profile_id) AND (b.archived_at IS NULL)))) AND ((page_context_profile_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM app.page_context_profiles p\n  WHERE ((p.workspace_id = knowledge_items.workspace_id) AND (p.business_profile_id = knowledge_items.business_profile_id) AND (p.id = knowledge_items.page_context_profile_id) AND (p.archived_at IS NULL))))))" },
  'knowledge_items.knowledge_items_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'knowledge_items.knowledge_items_update_writer': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))", check: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))" },
  'notifications.notifications_select_own': { cmd: 'r', roles: 'authenticated', using: "((user_id = ( SELECT auth.uid() AS uid)) AND app.is_active_member(workspace_id))", check: null },
  'notifications.notifications_update_own_read_state': { cmd: 'w', roles: 'authenticated', using: "((user_id = ( SELECT auth.uid() AS uid)) AND app.is_active_member(workspace_id))", check: "((user_id = ( SELECT auth.uid() AS uid)) AND app.is_active_member(workspace_id))" },
  'page_context_profile_versions.page_context_profile_versions_insert_owner_or_admin': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'page_context_profile_versions.page_context_profile_versions_insert_scoped_editor': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_page(workspace_id, business_profile_id, page_context_profile_id))" },
  'page_context_profile_versions.page_context_profile_versions_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'page_context_profiles.page_context_profiles_insert_owner_or_admin': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])) AND (EXISTS ( SELECT 1\n   FROM app.business_profiles b\n  WHERE ((b.workspace_id = page_context_profiles.workspace_id) AND (b.id = page_context_profiles.business_profile_id) AND (b.archived_at IS NULL)))))" },
  'page_context_profiles.page_context_profiles_insert_scoped_editor': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_page(workspace_id, business_profile_id, id) AND (EXISTS ( SELECT 1\n   FROM app.business_profiles b\n  WHERE ((b.workspace_id = page_context_profiles.workspace_id) AND (b.id = page_context_profiles.business_profile_id) AND (b.archived_at IS NULL)))))" },
  'page_context_profiles.page_context_profiles_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'page_context_profiles.page_context_profiles_update_owner_or_admin': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))", check: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))" },
  'page_context_profiles.page_context_profiles_update_scoped_editor': { cmd: 'w', roles: 'authenticated', using: "((app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_page(workspace_id, business_profile_id, id))", check: "((app.workspace_member_role(workspace_id) = 'editor'::text) AND app.member_scope_covers_page(workspace_id, business_profile_id, id))" },
  'publish_intents.publish_intents_insert_owner_admin': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'publish_intents.publish_intents_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'publish_intents.publish_intents_update_owner_admin': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text])))" },
  'research_runs.research_runs_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'research_runs.research_runs_update_writer': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'research_suggestions.research_suggestions_select_active_member': { cmd: 'r', roles: 'authenticated', using: "app.is_active_member(workspace_id)", check: null },
  'research_suggestions.research_suggestions_update_writer': { cmd: 'w', roles: 'authenticated', using: "(app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))", check: "((updated_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))" },
  'user_profiles.user_profiles_select_own': { cmd: 'r', roles: 'authenticated', using: "(user_id = ( SELECT auth.uid() AS uid))", check: null },
  'user_profiles.user_profiles_update_own': { cmd: 'w', roles: 'authenticated', using: "(user_id = ( SELECT auth.uid() AS uid))", check: "(user_id = ( SELECT auth.uid() AS uid))" },
  'workspace_invitations.workspace_invitations_insert_owner': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspace_invitations.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text) AND (m.role = 'owner'::text)))))" },
  'workspace_invitations.workspace_invitations_select_owner': { cmd: 'r', roles: 'authenticated', using: "(EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspace_invitations.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text) AND (m.role = 'owner'::text))))", check: null },
  'workspace_invitations.workspace_invitations_update_owner': { cmd: 'w', roles: 'authenticated', using: "(EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspace_invitations.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text) AND (m.role = 'owner'::text))))", check: "(EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspace_invitations.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text) AND (m.role = 'owner'::text))))" },
  'workspace_member_scopes.workspace_member_scopes_insert_owner': { cmd: 'a', roles: 'authenticated', using: null, check: "((created_by = ( SELECT auth.uid() AS uid)) AND (app.workspace_member_role(workspace_id) = 'owner'::text))" },
  'workspace_member_scopes.workspace_member_scopes_select_own': { cmd: 'r', roles: 'authenticated', using: "((user_id = ( SELECT auth.uid() AS uid)) AND app.is_active_member(workspace_id))", check: null },
  'workspace_settings.workspace_settings_select_active_member': { cmd: 'r', roles: 'authenticated', using: "(EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspace_settings.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text))))", check: null },
  'workspace_settings.workspace_settings_update_owner': { cmd: 'w', roles: 'authenticated', using: "(EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspace_settings.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text) AND (m.role = 'owner'::text))))", check: "(EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspace_settings.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text) AND (m.role = 'owner'::text))))" },
  'workspaces.workspaces_select_active_member': { cmd: 'r', roles: 'authenticated', using: "((lifecycle_state = ANY (ARRAY['active'::text, 'closing'::text])) AND (EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspaces.id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text)))))", check: null },
  'workspaces.workspaces_update_owner': { cmd: 'w', roles: 'authenticated', using: "((lifecycle_state = ANY (ARRAY['active'::text, 'closing'::text])) AND (EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspaces.id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text) AND (m.role = 'owner'::text)))))", check: "(EXISTS ( SELECT 1\n   FROM app.workspace_members m\n  WHERE ((m.workspace_id = workspaces.id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'active'::text) AND (m.role = 'owner'::text))))" },
};
export const PERMISSIVE_POLICY_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  with writable as (
    select c.oid, c.relname
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app' and c.relkind in ('r', 'p')
       and exists (select 1 from unnest(array['anon', 'authenticated']) as cr(r)
                    where pg_catalog.has_any_column_privilege(cr.r, c.oid, 'INSERT')
                       or pg_catalog.has_any_column_privilege(cr.r, c.oid, 'UPDATE')
                       or pg_catalog.has_table_privilege(cr.r, c.oid, 'DELETE'))
  ), found as (
    select format('%s.%s', w.relname, pol.polname) as k, pol.polcmd::text as cmd,
           (select string_agg(rn, ',' order by rn) from (
              select case when ro.oid = 0 then 'public' else pg_catalog.pg_get_userbyid(ro.oid)::text end as rn
                from unnest(pol.polroles) as ro(oid)) rs) as roles,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) as using_text,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_text
      from writable w join pg_catalog.pg_policy pol on pol.polrelid = w.oid
     where pol.polpermissive
  ), pinned as (
    select * from (values ${Object.entries(PERMISSIVE_POLICIES).map(([k, p]) => `('${k}', '${p.cmd}', '${p.roles}', ${p.using === null ? 'null' : `'${p.using.replace(/'/g, "''")}'`}, ${p.check === null ? 'null' : `'${p.check.replace(/'/g, "''")}'`})`).join(',\n      ')}) as pin(k, cmd, roles, using_text, check_text)
  )
  select string_agg(x, '; ' order by x) into offending from (
    select 'unlisted or changed: app.' || f.k as x from found f
     where not exists (select 1 from pinned p where p.k = f.k and p.cmd = f.cmd and p.roles = f.roles
                          and p.using_text is not distinct from f.using_text and p.check_text is not distinct from f.check_text)
    union all
    select 'missing or changed: app.' || p.k from pinned p
     where not exists (select 1 from found f where f.k = p.k and f.cmd = p.cmd and f.roles = p.roles
                          and f.using_text is not distinct from p.using_text and f.check_text is not distinct from p.check_text)
  ) d;
  if offending is not null then
    raise exception 'permissive policy set of a client-writable app table not exactly its pinned list: %', offending;
  end if;
end \$\$;
`;
// 2b'''. WHAT A CLIENT MAY HOLD THAT NO POLICY GOVERNS (batch 127's review round). Every probe above reads
// tables of relkind r and p in schema app, through their policies. Three privileges reach past all of them,
// each measured passing every layer by a reviewer of 127:
//   * TRUNCATE (and TRIGGER, REFERENCES, MAINTAIN) is not subject to row level security: C0 X6 granted
//     TRUNCATE on an app table to authenticated, and workspace B's owner emptied workspace A's rows (C0 F1);
//   * a VIEW runs as its owner, the migrating superuser, unless it is security_invoker: A1 R5b created one
//     invoker, switched it off with ALTER VIEW and granted SELECT and INSERT; a client then forged created_by
//     and read and wrote another workspace through it (A1 F1, Q0 F1);
//   * a table in schema public, where clients hold USAGE, is read by no probe: A1 R6 inserted another
//     user's and another workspace's row through one (A1 F2; A1 F6 on 123, Q0 F6, owed on blocker 186).
// The rule is FAIL-CLOSED: no client role (anon, authenticated, or PUBLIC, which both inherit) holds any
// of them, unless the relation is pinned here, and a pinned view must be security_invoker. Measured on the
// clean set through 127: app, private and public hold no view, materialized view or foreign table; public
// holds no relation; no client role holds TRUNCATE, TRIGGER, REFERENCES or MAINTAIN on any relation in the
// three schemas, or any privilege on a table in private. Both allowlists are empty. Sequences are not
// read: no client role holds any privilege on one (measured), and a sequence carries no tenant row.
//
// EVERY SCHEMA BUT THE SYSTEM ONES, NOT THREE BY NAME (batch 128; A1 N1, C0 N1, Q0 N1 on 127's re-check).
// The first version read app, private and public by name, and each re-check created a fourth schema,
// granted a client USAGE on it and put a definer-rights view or a table with no RLS there: every layer
// stayed green, and through the view a user read every workspace's ideas and wrote a row with a forged
// created_by into another workspace (A1 V11, C0 G1, Q0 F1-sf). So all three rules now read every schema
// that is not pg_catalog, information_schema or a pg_* schema (a user schema cannot be named pg_*), and
// rule 3 reads every schema but app. Measured on the clean set at batch 128: no relation exists outside
// app and private, and no client role holds any privilege on a relation outside app, so nothing that
// passed before is refused now. Which schemas a client may USE or CREATE in is the client schema probe's,
// below, and what a client role may BECOME is the client membership probe's.
//
// AND EVERY OBJECT MADE AFTER INITDB, WHATEVER ITS SCHEMA IS CALLED (batch 128's review round; C0 F1, Q0 F1).
// "A user schema cannot be named pg_*" holds only for a non-superuser: the migration owner is a superuser,
// and with `set allow_system_table_mods = on` it can create a schema named pg_* and relations in pg_catalog;
// information_schema needs nothing at all (it is an ordinary schema owned by the migration owner), and
// clients hold USAGE on both system schemas through PUBLIC. C0 X1b, X2, X2b and Q0 ISV, IST put a
// definer-rights view or an RLS-less table, granted to authenticated, in information_schema, in pg_c0api and
// in pg_catalog: every layer stayed green and a session with no claims read both workspaces' ideas. So each
// rule reads a relation when its schema is not a system one by name OR its own OID is at or above 16384
// (FirstNormalObjectId): everything initdb made is below it, everything a migration or a drift MAKES is at
// or above it, in any schema (temporary ones included, A1 N2 on 128). What a migration REDEFINES or
// RE-GRANTS in place keeps initdb's OID (CREATE OR REPLACE and GRANT assign none), so these OID arms do not
// read it (C0 G1, Q0 F1 on 128's re-check): the system object fingerprint probe (2b'''''', below) does,
// against a fingerprint taken before the migrations. Measured on the clean set at 128's
// review round: no relation, function or operator at or above 16384 in any schema initdb made but public,
// so nothing that passed is refused. The pg_catalog guard (9, below) refuses such an object in those
// schemas first, in every job; this is the second reading, held by the static pins.
//
// AND NOT ONLY THROUGH pg_temp (batch 129; Q0 F2 on 128's re-check). The three drifts read the OID arm with
// a temporary object alone, and a mutation that reads the SCHEMA's OID (pg_temp_N is at or above 16384
// too) or keeps the arm for pg_temp only passed them. Each drift now also puts an object in pg_toast, whose
// own OID (99) is below 16384 and whose name is a system one, so only the object's OID reads it; the guard
// leaves pg_toast's relations out, because every user table's TOAST table lives there. The drift sets the
// switch by a computed name, which the lexer passes by design (its stated limit), inside the job's own
// transaction (set_config is_local), so it ends with the rollback.
//
// AND WHAT EVERY LATER OBJECT WILL CARRY (batch 129; A1 R1 on 128's re-check, A1 N1 on 128): rule 4 reads
// pg_default_acl, so a default privilege granting anon, authenticated or PUBLIC is named where it is written
// rather than only by its effect on each later object. Measured on the clean set at batch 129 (the shim,
// then every migration): pg_default_acl is empty. A global entry (every schema) for functions stores the
// whole ACL, PUBLIC's EXECUTE included, so one written without revoking PUBLIC is named too (stated).
export const CLIENT_ROLES = ['anon', 'authenticated', 'public'];
export const CLIENT_VIEWS = {};
export const CLIENT_NON_APP_TABLES = {};
const clientRoles = `unnest(array[${CLIENT_ROLES.map((r) => `'${r}'`).join(', ')}]) as cr(r)`;
const pinnedArray = (o) => `array[${Object.keys(o).map((k) => `'${k}'`).join(', ')}]::text[]`;
export const NON_SYSTEM_SCHEMA = "n.nspname not in ('pg_catalog', 'information_schema') and n.nspname !~ '^pg_'";
export const FIRST_NORMAL_OID = 16384;
export const userObject = (oid) => `((${NON_SYSTEM_SCHEMA}) or ${oid} >= ${FIRST_NORMAL_OID})`;
export const CLIENT_PRIVILEGE_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  with rels as (
    select c.oid, format('%s.%s', n.nspname, c.relname) as t
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where ${userObject('c.oid')} and c.relkind in ('r', 'p', 'v', 'm', 'f')
  ), privs as (
    select unnest(array['TRUNCATE', 'TRIGGER', 'REFERENCES']
                  || case when pg_catalog.current_setting('server_version_num')::integer >= 170000 then array['MAINTAIN'] else array[]::text[] end) as p
  )
  select string_agg(format('%s %s on %s', cr.r, privs.p, rels.t), ', ' order by rels.t, cr.r, privs.p) into offending
    from rels, privs, ${clientRoles}
   where case when privs.p = 'REFERENCES' then pg_catalog.has_any_column_privilege(cr.r, rels.oid, privs.p)
              else pg_catalog.has_table_privilege(cr.r, rels.oid, privs.p) end;
  if offending is not null then
    raise exception 'client role(s) hold TRUNCATE, TRIGGER, REFERENCES or MAINTAIN, which no policy governs: %', offending;
  end if;
  select string_agg(distinct format('%s.%s', n.nspname, c.relname), ', ' order by format('%s.%s', n.nspname, c.relname)) into offending
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace, ${clientRoles}
   where ${userObject('c.oid')} and c.relkind in ('v', 'm', 'f')
     and (pg_catalog.has_any_column_privilege(cr.r, c.oid, 'SELECT') or pg_catalog.has_any_column_privilege(cr.r, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(cr.r, c.oid, 'UPDATE') or pg_catalog.has_table_privilege(cr.r, c.oid, 'DELETE'))
     and not (format('%s.%s', n.nspname, c.relname) = any (${pinnedArray(CLIENT_VIEWS)}) and c.relkind = 'v'
              and exists (select 1 from pg_catalog.pg_options_to_table(c.reloptions) o
                           where o.option_name = 'security_invoker' and lower(o.option_value) in ('true', 'on', '1', 'yes')));
  if offending is not null then
    raise exception 'view(s), materialized view(s) or foreign table(s) a client role can use, not pinned or not security_invoker: %', offending;
  end if;
  select string_agg(distinct format('%s.%s', n.nspname, c.relname), ', ' order by format('%s.%s', n.nspname, c.relname)) into offending
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace, ${clientRoles}
   where n.nspname <> 'app' and ${userObject('c.oid')} and c.relkind in ('r', 'p')
     and (pg_catalog.has_any_column_privilege(cr.r, c.oid, 'SELECT') or pg_catalog.has_any_column_privilege(cr.r, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(cr.r, c.oid, 'UPDATE') or pg_catalog.has_table_privilege(cr.r, c.oid, 'DELETE'))
     and not (format('%s.%s', n.nspname, c.relname) = any (${pinnedArray(CLIENT_NON_APP_TABLES)}));
  if offending is not null then
    raise exception 'table(s) outside schema app a client role can read or write, which no probe reads: %', offending;
  end if;
  select string_agg(x, ', ' order by x) into offending from (
    select distinct format('%s %s on %s in %s (default for %s)',
             case when a.grantee = 0::pg_catalog.oid then 'public' else pg_catalog.pg_get_userbyid(a.grantee)::text end, a.privilege_type,
             case d.defaclobjtype when 'r' then 'tables' when 'S' then 'sequences' when 'f' then 'functions' when 'T' then 'types' when 'n' then 'schemas' else d.defaclobjtype::text end,
             case when d.defaclnamespace = 0::pg_catalog.oid then 'every schema' else 'schema ' || d.defaclnamespace::pg_catalog.regnamespace::text end,
             pg_catalog.pg_get_userbyid(d.defaclrole)) as x
      from pg_catalog.pg_default_acl d cross join lateral pg_catalog.aclexplode(d.defaclacl) a
     where a.grantee = 0::pg_catalog.oid or a.grantee in (select r.oid from pg_catalog.pg_roles r where r.rolname in ('anon', 'authenticated'))
  ) f;
  if offending is not null then
    raise exception 'default privilege(s) granting a client role, which every object made later carries: %', offending;
  end if;
end \$\$;
`;

// 2b''''. WHICH SCHEMAS A CLIENT MAY USE OR CREATE IN, EXACTLY (batch 128; A1 N1 and N5, C0 N1, Q0 N1 on 127's
// re-check). The client privilege probe now reads every schema, and this pins the other half: the
// (role, privilege, schema) triples for anon, authenticated and PUBLIC, USAGE and CREATE, each also read
// WITH GRANT OPTION (never pinned), must be exactly this list, both ways. A new schema a client can USE,
// CREATE granted on any schema (A1 V16: nothing reads it today), or a grant option, is named; so is a pinned
// triple that went missing. Read with has_schema_privilege, so what PUBLIC holds is counted for anon and
// authenticated too, as a client meets it. Measured on the clean set at batch 128 (the shim, then every
// migration): exactly four, outside the system schemas (the review round adds the six there, below). On the platform the managed schemas (auth, storage, graphql_public,
// extensions) grant clients USAGE as well; the probe runs on the shim, which grants none (stated, not
// modelled).
//
// EVERY SCHEMA, AND THE DATABASE (batch 128's review round; C0 F1 and F2, Q0 F1). The first version left out
// pg_catalog, information_schema and every pg_* schema by name, and the migration owner can make a pg_*
// schema (C0 X2: pg_c0api, by allow_system_table_mods) and grant clients USAGE on it with every layer green.
// So no schema is left out now: the USAGE initdb gives PUBLIC on pg_catalog and information_schema is pinned
// like any other triple, as measured on the clean set (the shim, then every migration), and a temporary
// schema is read like the rest (it carries no ACL, so a client holds nothing on it; A1 N2). And CREATE on the
// DATABASE lets a client make a schema of its own (C0 X4 passed every layer and did), so CREATE and
// TEMPORARY on the current database are read the same way, both ways: TEMPORARY is what PUBLIC holds by
// default, pinned for the three client roles, and CREATE for none.
//
// AND EVERY OTHER DATABASE (batch 129; Q0 F3 on 128's re-check: `grant create on database template1 to
// authenticated` passed every layer). On every database but the current one a client may hold no CREATE and
// no grant option, each named with the database. TEMPORARY there is not read: what PUBLIC holds by default
// differs by database (measured at batch 129: TEMPORARY on a database made with the default ACL, as CI's
// postgres beside its thinkbizthai_test; none on template0 and template1), and no tenant row lives there.
export const CLIENT_SCHEMA_PRIVILEGES = {
  app: { authenticated: ['USAGE'] },
  information_schema: { anon: ['USAGE'], authenticated: ['USAGE'], public: ['USAGE'] },
  pg_catalog: { anon: ['USAGE'], authenticated: ['USAGE'], public: ['USAGE'] },
  public: { anon: ['USAGE'], authenticated: ['USAGE'], public: ['USAGE'] },
};
export const CLIENT_DATABASE_PRIVILEGES = { anon: ['TEMPORARY'], authenticated: ['TEMPORARY'], public: ['TEMPORARY'] };
const clientSchemaRows = [
  ...Object.entries(CLIENT_SCHEMA_PRIVILEGES).flatMap(([schema, roles]) =>
    Object.entries(roles).flatMap(([role, privs]) => privs.map((p) => `${role} ${p} on schema ${schema}`))),
  ...Object.entries(CLIENT_DATABASE_PRIVILEGES).flatMap(([role, privs]) => privs.map((p) => `${role} ${p} on database`)),
];
export const CLIENT_SCHEMA_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  with found as (
    select format('%s %s%s on schema %s', cr.r, p.p, go.opt, n.nspname) as g
      from pg_catalog.pg_namespace n, ${clientRoles}, unnest(array['USAGE', 'CREATE']) as p(p), (values (''), (' WITH GRANT OPTION')) as go(opt)
     where pg_catalog.has_schema_privilege(cr.r, n.oid, p.p || go.opt)
    union all
    select format('%s %s%s on database', cr.r, p.p, go.opt)
      from ${clientRoles}, unnest(array['CREATE', 'TEMPORARY']) as p(p), (values (''), (' WITH GRANT OPTION')) as go(opt)
     where pg_catalog.has_database_privilege(cr.r, pg_catalog.current_database(), p.p || go.opt)
    union all
    select format('%s %s%s on database %s', cr.r, p.p, go.opt, d.datname)
      from pg_catalog.pg_database d, ${clientRoles}, unnest(array['CREATE', 'TEMPORARY']) as p(p), (values (''), (' WITH GRANT OPTION')) as go(opt)
     where d.datname <> pg_catalog.current_database() and (p.p = 'CREATE' or go.opt <> '')
       and pg_catalog.has_database_privilege(cr.r, d.oid, p.p || go.opt)
  ), pinned as (
    select unnest(array[${clientSchemaRows.map((r) => `'${r}'`).join(', ')}]::text[]) as g
  )
  select string_agg(x, ', ' order by x) into offending from (
    select 'unlisted: ' || f.g as x from found f where not exists (select 1 from pinned p where p.g = f.g)
    union all
    select 'missing: ' || p.g from pinned p where not exists (select 1 from found f where f.g = p.g)
  ) d;
  if offending is not null then
    raise exception 'client schema or database privilege(s) not exactly the pinned list: %', offending;
  end if;
end \$\$;
`;

// 2b'''''. WHAT A CLIENT ROLE MAY BECOME (batch 128; Q0 N2 MEDIUM, A1 N3 on 127's re-check). Every rule above
// reads has_*_privilege, which follows only INHERITED privileges, and anon and authenticated are NOINHERIT:
// a plain `grant r to authenticated` gives SET ROLE without inheritance, and no layer read it. Q0 R0 and
// A1 V14d granted postgres to authenticated, and a client session ran `set role postgres` and became
// superuser with every layer green; Q0 R1r emptied every workspace's ideas through a role holding TRUNCATE.
// So anon and authenticated must be members of exactly the pinned roles, read from pg_auth_members
// RECURSIVELY (a membership of a role that is itself a member of another reaches both), whatever the
// grant's INHERIT, SET or ADMIN option. PUBLIC is not read: it cannot be granted a role (GRANT ... TO
// PUBLIC is refused for a role), and every role is already in it. Measured on the clean set at batch 128:
// no role grants membership to anon or authenticated, so the list is empty, and a pin is an RFC-sized
// decision in the same diff as its reason. (What may become a client role, authenticator on the
// platform, is the other direction and authzLint's.)
//
// AND WHAT A CLIENT ROLE IS (batch 129; A1 R2, C0 F3 on 128's re-check). `alter role authenticated
// bypassrls` was read by no catalog rule and held by rls-smoke alone. So the second rule reads the client
// roles' own attributes, each pinned false as measured on the clean set at batch 129 (the shim makes both
// NOLOGIN NOINHERIT and no migration alters them): a superuser, a role that bypasses row level security,
// creates roles or databases, inherits, logs in or replicates is named, attribute by attribute. A client
// role that does not exist is named too. Not read: the connection limit, the password and its validity,
// which grant nothing.
//
// AND WHAT EVERY CLIENT SESSION STARTS WITH (batch 129's review round; A1 R2: pg_db_role_setting was read
// for session_replication_role alone). A default set for anon, for authenticated or for every role, in
// one database or all, applies to every session of that role before any statement runs: a search_path,
// or a setting the policies read through current_setting. So the third rule reads each such default and
// names any not pinned, as `<role> in <database>: <name>=<value>`. Measured on the clean set at batch 129:
// none (the shim sets none and no migration does). The platform may set some, a statement timeout for
// example (read, not measured here); pinning those is an RFC-sized decision in the same diff as its reason.
export const CLIENT_ROLE_MEMBERSHIPS = [];
export const CLIENT_ROLE_SETTINGS = [];
export const CLIENT_ROLE_FALSE_ATTRIBUTES = ['rolbypassrls', 'rolcanlogin', 'rolcreatedb', 'rolcreaterole', 'rolinherit', 'rolreplication', 'rolsuper'];
export const CLIENT_MEMBERSHIP_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  with recursive reach(client, roleid) as (
    select r.rolname::text, m.roleid
      from pg_catalog.pg_roles r join pg_catalog.pg_auth_members m on m.member = r.oid
     where r.rolname in ('anon', 'authenticated')
    union
    select reach.client, m.roleid
      from reach join pg_catalog.pg_auth_members m on m.member = reach.roleid
  )
  select string_agg(x, ', ' order by x) into offending from (
    select distinct format('%s -> %s', reach.client, pg_catalog.pg_get_userbyid(reach.roleid)) as x from reach
  ) f
   where not (x = any (array[${CLIENT_ROLE_MEMBERSHIPS.map((m) => `'${m}'`).join(', ')}]::text[]));
  if offending is not null then
    raise exception 'client role(s) members of a role not pinned, which SET ROLE reaches past every privilege rule: %', offending;
  end if;
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s %s = %s', r.rolname, a.k, coalesce(a.v::text, 'null')) as x
      from pg_catalog.pg_roles r cross join lateral (values ${CLIENT_ROLE_FALSE_ATTRIBUTES.map((k) => `('${k}', r.${k})`).join(', ')}) as a(k, v)
     where r.rolname in ('anon', 'authenticated') and a.v is distinct from false
    union all
    select format('%s [missing]', c.r) from unnest(array['anon', 'authenticated']) as c(r)
     where not exists (select 1 from pg_catalog.pg_roles r where r.rolname = c.r)
  ) f;
  if offending is not null then
    raise exception 'client role attribute(s) not their pinned value (false): %', offending;
  end if;
  select string_agg(x, ', ' order by x) into offending from (
    select pg_catalog.format('%s in %s: %s', coalesce(r.rolname::text, 'every role'), coalesce('database ' || d.datname::text, 'every database'), g.setting) as x
      from pg_catalog.pg_db_role_setting s
      left join pg_catalog.pg_roles r on r.oid = s.setrole
      left join pg_catalog.pg_database d on d.oid = s.setdatabase
      cross join lateral unnest(s.setconfig) as g(setting)
     where s.setrole = 0::pg_catalog.oid or r.rolname in ('anon', 'authenticated')
  ) f
   where not (x = any (array[${CLIENT_ROLE_SETTINGS.map((m) => `'${m}'`).join(', ')}]::text[]));
  if offending is not null then
    raise exception 'client role setting default(s) not pinned, each applied to every session of the role: %', offending;
  end if;
end \$\$;
`;

// 2b''''''. WHAT initdb MADE, AS initdb MADE IT (batch 129; C0 G1 and Q0 F1 on 128's re-check, MEDIUM). Every
// OID arm above reads an object MADE after initdb. An object initdb made and a later migration REDEFINES or
// RE-GRANTS in place keeps its OID below 16384: C0 X7 and Q0 Q-IPVx `create or replace`d the view
// information_schema.information_schema_catalog_name with content_ideas' columns appended, C0 X8 and Q0 Q-IPF
// made information_schema._pg_char_max_length / _pg_interval_type SECURITY DEFINER over content_ideas, Q0
// Q-GS granted pg_catalog.pg_statistic to authenticated, and C0 X10 replaced
// pg_catalog.has_database_privilege to blind a probe. Each passed every layer, and a session with no claims
// read both workspaces' ideas through the first three.
//
// So the executor takes a FINGERPRINT of every object whose OID is below 16384 -- every function (owner,
// language, kind, SECURITY DEFINER, leakproof, strict, volatility, parallel, cost, rows, support, return
// type, argument defaults, body in prosrc and an SQL-standard body in prosqlbody, probin, settings, ACL;
// prosqlbody since batch 129's review round, A1 R1), every relation (owner, kind, ACL, row level
// security and its FORCE, rules, triggers, options, a view's definition by pg_get_viewdef, every column's
// name, type and ACL, and the names of its rules, triggers and policies), every schema (owner, ACL) and
// every language (owner, trust, handlers, ACL) -- on the database migrate-clean is given, the shim already
// applied and BEFORE the prerequisite and the first migration, into catalog_baseline.system_fingerprint (a
// schema of the probe's own; no client holds anything on it, which the client probes read). It is
// COMPUTED there, not pinned here: what initdb makes varies with the PostgreSQL minor version, and the
// comparison is always with the same cluster's own. The executor seals the table (its row count and an md5
// of its rows) before the first migration and refuses the run if the seal moved by the end of the last.
// The seal alone did NOT keep the reference out of a migration's reach (C0 F1 on 129: a view swapped in
// for the table answered the seal query with the old rows and this probe with new ones), so since 129's
// review round the verdict on the migrations as built is the executor's, in memory (below the seal), and
// this probe, which reads the table by name, is what each drift is refused by. It compares, both ways, by
// kind and OID: a changed, gone or new row is named, and since that review round a row whose name or schema
// moved (C0 F2, Q0 F1: the name, `ident`, was stored and never compared, so a rename passed every layer). Measured at batch 129 on PostgreSQL 17.11: 3753 rows
// (3330 functions, 415 relations, 4 schemas, 4 languages); after the shim and every migration the same
// fingerprint, row for row, and the cluster's template1 the same too.
//
// What it does not read (stated): types, operators, casts, aggregates' own rows, operator classes and
// collations initdb made (the guard reads what is made in those schemas; none of these is a grant or a
// body a client reaches); the large-object, tablespace and database rows (the client schema probe reads
// database privileges); and an object a migration made and then dropped. A migrate-clean run on a database
// that already holds a fingerprint keeps the first one taken; one on a database whose schema app exists
// and holds none is refused, since that fingerprint would bless whatever the migrations did.
export const SYSTEM_FINGERPRINT_TABLE = 'catalog_baseline.system_fingerprint';
export const SYSTEM_FINGERPRINT_ROWS = `select 'function'::text as kind, p.oid as objoid,
       pg_catalog.format('%s.%s(%s)', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)) as ident,
       row(p.proowner, p.prolang, p.prokind, p.prosecdef, p.proleakproof, p.proisstrict, p.provolatile, p.proparallel,
           p.procost, p.prorows, p.prosupport, p.prorettype, p.proargdefaults::text, p.prosrc, p.prosqlbody::text, p.probin, p.proconfig, p.proacl)::text as fp
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where p.oid < ${FIRST_NORMAL_OID}::pg_catalog.oid
union all
select 'relation', c.oid, pg_catalog.format('%s.%s', n.nspname, c.relname),
       row(c.relowner, c.relkind, c.relacl, c.relrowsecurity, c.relforcerowsecurity, c.relhasrules, c.relhastriggers, c.reloptions,
           case when c.relkind in ('v', 'm') then pg_catalog.pg_get_viewdef(c.oid) end,
           (select pg_catalog.array_agg(row(a.attnum, a.attname, a.atttypid, a.attacl)::text order by a.attnum) from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attnum > 0),
           (select pg_catalog.array_agg(r.rulename::text order by r.rulename) from pg_catalog.pg_rewrite r where r.ev_class = c.oid),
           (select pg_catalog.array_agg(t.tgname::text order by t.tgname) from pg_catalog.pg_trigger t where t.tgrelid = c.oid),
           (select pg_catalog.array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol where pol.polrelid = c.oid))::text
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
 where c.oid < ${FIRST_NORMAL_OID}::pg_catalog.oid
union all
select 'schema', n.oid, n.nspname::text, row(n.nspowner, n.nspacl)::text
  from pg_catalog.pg_namespace n
 where n.oid < ${FIRST_NORMAL_OID}::pg_catalog.oid
union all
select 'language', l.oid, l.lanname::text, row(l.lanowner, l.lanpltrusted, l.lanplcallfoid, l.laninline, l.lanvalidator, l.lanacl)::text
  from pg_catalog.pg_language l
 where l.oid < ${FIRST_NORMAL_OID}::pg_catalog.oid`;
export const SYSTEM_FINGERPRINT_SNAPSHOT_SQL = `set local search_path = pg_catalog;
create schema if not exists catalog_baseline;
revoke all on schema catalog_baseline from public;
create table if not exists ${SYSTEM_FINGERPRINT_TABLE} (kind text not null, objoid oid not null, ident text not null, fp text not null, primary key (kind, objoid));
revoke all on table ${SYSTEM_FINGERPRINT_TABLE} from public;
do \$\$
begin
  if exists (select 1 from ${SYSTEM_FINGERPRINT_TABLE}) then
    return;
  end if;
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'app') then
    raise exception 'the system object fingerprint is taken before the migrations, and this database already has schema app and no fingerprint: run migrate-clean on a fresh cluster';
  end if;
  insert into ${SYSTEM_FINGERPRINT_TABLE} (kind, objoid, ident, fp)
${SYSTEM_FINGERPRINT_ROWS};
end \$\$;
`;
// The seal: one row, read before the first migration and after the last.
export const SYSTEM_FINGERPRINT_SEAL_SQL = `select pg_catalog.count(*)::text || ':' || coalesce(pg_catalog.md5(pg_catalog.string_agg(kind || ':' || objoid::text || ':' || ident || ':' || fp, pg_catalog.chr(10) order by kind, objoid)), '') as seal from ${SYSTEM_FINGERPRINT_TABLE}`;
// THE REFERENCE OUT OF THE DATABASE'S REACH (batch 129's review round; C0 F1). The seal pins the ANSWER to
// one query over the table, read by name, and the probe reads the same name: C0 FV3 renamed the table and
// put a view in its place that answered the seal query with the rows taken before the migrations and every
// other reader with rows taken after them, and Q-IPF then crossed tenants with every layer green. So:
//   * the executor reads the fingerprint's rows into its own memory BEFORE the first migration (straight
//     from the catalogs, and requires the table to hold exactly those rows), reads them again from the
//     catalogs AFTER the last, and compares the two in JavaScript (diffSystemFingerprint, pure and tested
//     on synthetic rows). No relation a migration can create, rename or replace is read by that verdict;
//   * and the table's own identity is read from pg_class before and after (its OID, a plain table, no rule,
//     no trigger, no row level security, its owner), so a swap is named as a swap, not only by its effect.
// What this still trusts: the catalog functions the reading itself calls (format, pg_get_viewdef and the
// rest), which a superuser migration could replace and so forge its own row; that is the perfect-forgery
// class blocker 186 carries as owed.
export const SYSTEM_FINGERPRINT_READ_SQL = `begin;\nset local search_path = pg_catalog;\n${SYSTEM_FINGERPRINT_ROWS};\nrollback;\n`;
export const SYSTEM_FINGERPRINT_TABLE_READ_SQL = `begin;\nset local search_path = pg_catalog;\nselect kind, objoid, ident, fp from ${SYSTEM_FINGERPRINT_TABLE};\nrollback;\n`;
export const SYSTEM_FINGERPRINT_RELATION_SQL = `select pg_catalog.format('%s %s rules=%s triggers=%s rls=%s owner=%s', c.oid, c.relkind, c.relhasrules, c.relhastriggers, c.relrowsecurity, c.relowner) as relation
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'catalog_baseline' and c.relname = 'system_fingerprint'`;
export const SYSTEM_FINGERPRINT_RELATION_SHAPE = /^[1-9]\d* r rules=f triggers=f rls=f owner=[1-9]\d*$/;
// Both ways, by kind and OID, as the probe compares: a row gone, a row new, a name moved (`[renamed to ...]`,
// C0 F2) and a fingerprint changed, each named as the probe names it, sorted as its `order by x` sorts
// under the C collation. A row read twice is named too: the comparison is keyed, and a key read twice
// would hide one of its readings.
export function diffSystemFingerprint(before, after) {
  const keyed = (rows, side, out) => {
    const map = new Map();
    for (const r of rows) {
      const k = `${r.kind}\u0000${r.objoid}`;
      if (map.has(k)) out.push(`${r.kind} ${r.ident} [read twice ${side}]`);
      map.set(k, r);
    }
    return map;
  };
  const out = [];
  const b = keyed(before, 'before', out);
  const a = keyed(after, 'after', out);
  for (const [k, r] of b) {
    const n = a.get(k);
    if (!n) { out.push(`${r.kind} ${r.ident} [gone]`); continue; }
    const tags = `${n.ident !== r.ident ? ` [renamed to ${n.ident}]` : ''}${n.fp !== r.fp ? ' [changed]' : ''}`;
    if (tags) out.push(`${r.kind} ${r.ident}${tags}`);
  }
  for (const [k, n] of a) if (!b.has(k)) out.push(`${n.kind} ${n.ident} [not in the fingerprint]`);
  return out.sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
}
export const SYSTEM_FINGERPRINT_PROBE_SQL = `do \$\$
declare
  offending text;
  differing integer;
begin
  with now as (
${SYSTEM_FINGERPRINT_ROWS}
  ), d as (
    select coalesce(b.kind, n.kind) || ' ' || coalesce(b.ident, n.ident)
           || case when n.fp is null then ' [gone]' when b.fp is null then ' [not in the fingerprint]'
                   else case when n.ident is distinct from b.ident then ' [renamed to ' || n.ident || ']' else '' end
                        || case when n.fp is distinct from b.fp then ' [changed]' else '' end end as x
      from now n full join ${SYSTEM_FINGERPRINT_TABLE} b on b.kind = n.kind and b.objoid = n.objoid
     where (n.fp, n.ident) is distinct from (b.fp, b.ident)
  )
  select count(*)::integer, string_agg(x, ', ' order by x) filter (where rn <= 40) into differing, offending
    from (select x, row_number() over (order by x) as rn from d) r;
  if differing > 0 then
    raise exception 'initdb object(s) not as the fingerprint taken before the migrations found them (%, the first 40 named): %', differing, offending;
  end if;
end \$\$;
`;

// 2c. The CHECK constraints the attribution closures lean on, by EXACT definition text: 090's
// equivalence and 123's pair together are what make a cancelled, pending or expired request name no
// decider. Q0's test of 123 dropped or weakened either in a later file (E20, E20b, G06b+E08) and every
// layer stayed green, because only the batches' own apply-time blocks read them.
export const PINNED_CHECKS = {
  'approval_requests.approval_requests_decision_has_a_decider': "CHECK (((status = ANY (ARRAY['approved'::text, 'changes_requested'::text])) = ((decided_at IS NOT NULL) AND (decided_by IS NOT NULL))))",
  'approval_requests.approval_requests_decider_is_a_pair': 'CHECK (((decided_at IS NULL) = (decided_by IS NULL)))',
  // Batch 126 (blocker 186 item 17; A1 V5 on batch 125): a decision cannot predate its request.
  'approval_requests.approval_requests_decided_after_created': 'CHECK ((decided_at >= created_at))',
};
// A CHECK is NULL, and so passes, when a column it reads is NULL. decided_at is NULL by design while a
// request is pending (the pair CHECK says when); created_at must never be, or 126's order CHECK admits
// anything (Q0 F8 on batch 126: `drop not null` on created_at passed every layer).
export const PINNED_NOT_NULL = ['app.approval_requests.created_at'];
export const PINNED_CHECK_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(pin.k, ', ' order by pin.k) into offending
    from (values ${Object.entries(PINNED_CHECKS).map(([k, def]) => `('${k}', '${def.replace(/'/g, "''")}')`).join(', ')}) as pin(k, def)
   where not exists (
     select 1 from pg_catalog.pg_constraint con
      where con.conrelid = to_regclass('app.' || split_part(pin.k, '.', 1)) and con.contype = 'c'
        and con.conname = split_part(pin.k, '.', 2) and con.convalidated
        and pg_catalog.pg_get_constraintdef(con.oid) = pin.def);
  if offending is not null then
    raise exception 'pinned CHECK constraint(s) missing, unvalidated or not in their pinned text: %', offending;
  end if;
  select string_agg(pin.k, ', ' order by pin.k) into offending
    from unnest(array[${PINNED_NOT_NULL.map((k) => `'${k}'`).join(', ')}]) as pin(k)
   where not exists (
     select 1 from pg_catalog.pg_attribute a
      where a.attrelid = to_regclass(split_part(pin.k, '.', 1) || '.' || split_part(pin.k, '.', 2))
        and a.attname = split_part(pin.k, '.', 3) and a.attnum > 0 and not a.attisdropped and a.attnotnull);
  if offending is not null then
    raise exception 'pinned NOT NULL column(s) a pinned CHECK reads are nullable or missing: %', offending;
  end if;
end \$\$;
`;

// 2d. Restrictive policies with a USING half, pinned by their exact deparse (batch 125). closureRule
// requires no USING, so a closure that narrows WHICH ROWS a client may touch needs its own pin:
// approval_requests_settled_is_immutable is the one that makes approval history immutable (§4
// invariant 8; A1 N1 and C0 F2 on batch 123's corrections).
export const PINNED_POLICIES = {
  'approval_requests.approval_requests_settled_is_immutable': { cmd: 'w', using: "(status = 'pending'::text)", check: 'true' },
  // Batch 091: which rows a client may update, and the member-scope narrowings, both halves (C0 F1/F2 and
  // A1 F1/F2 on 091's first head: each could be gutted in a later file with every layer green).
  "calendar_items.calendar_items_deleted_is_final": { cmd: "w", using: "(deleted_at IS NULL)", check: "true" },
  "calendar_items.calendar_items_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = calendar_items.workspace_id) AND (i.business_profile_id = calendar_items.business_profile_id) AND (i.id = calendar_items.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = calendar_items.workspace_id) AND (i.business_profile_id = calendar_items.business_profile_id) AND (i.id = calendar_items.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "content_schedules.content_schedules_client_transition_is_bounded": { cmd: "w", using: "(status = ANY (ARRAY['draft'::text, 'armed'::text]))", check: "(status = ANY (ARRAY['draft'::text, 'cancelled'::text]))" },
  "content_schedules.content_schedules_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM (app.content_targets t\n     JOIN app.content_items i ON (((i.workspace_id = t.workspace_id) AND (i.business_profile_id = t.business_profile_id) AND (i.id = t.content_item_id))))\n  WHERE ((t.workspace_id = content_schedules.workspace_id) AND (t.business_profile_id = content_schedules.business_profile_id) AND (t.id = content_schedules.content_target_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM (app.content_targets t\n     JOIN app.content_items i ON (((i.workspace_id = t.workspace_id) AND (i.business_profile_id = t.business_profile_id) AND (i.id = t.content_item_id))))\n  WHERE ((t.workspace_id = content_schedules.workspace_id) AND (t.business_profile_id = content_schedules.business_profile_id) AND (t.id = content_schedules.content_target_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  // Batch 127's review round (C0 F3): every other member-scope narrowing, both halves by exact deparse. The
  // apply-time replacements read these for TOKENS, so `... or true` kept the tokens and passed migrate-clean
  // (C0 X2b on industry_assignments, X2c on content_items), held by rls-smoke alone. Measured from the catalog
  // on the clean set: 33 restrictive policies named *_scope_narrow*, all FOR ALL, TO authenticated, with both
  // halves; 091's two were pinned already, and these are the other thirty-one.
  "approval_events.approval_events_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM (app.approval_requests r\n     JOIN app.content_items i ON (((i.workspace_id = r.workspace_id) AND (i.business_profile_id = r.business_profile_id) AND (i.id = r.content_item_id))))\n  WHERE ((r.workspace_id = approval_events.workspace_id) AND (r.business_profile_id = approval_events.business_profile_id) AND (r.id = approval_events.approval_request_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM (app.approval_requests r\n     JOIN app.content_items i ON (((i.workspace_id = r.workspace_id) AND (i.business_profile_id = r.business_profile_id) AND (i.id = r.content_item_id))))\n  WHERE ((r.workspace_id = approval_events.workspace_id) AND (r.business_profile_id = approval_events.business_profile_id) AND (r.id = approval_events.approval_request_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "approval_policies.approval_policies_scope_narrowing": { cmd: "*", using: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND", check: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND" },
  "approval_requests.approval_requests_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = approval_requests.workspace_id) AND (i.business_profile_id = approval_requests.business_profile_id) AND (i.id = approval_requests.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = approval_requests.workspace_id) AND (i.business_profile_id = approval_requests.business_profile_id) AND (i.id = approval_requests.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "asset_rights.asset_rights_scope_narrows_member": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.assets a\n  WHERE ((a.workspace_id = asset_rights.workspace_id) AND (a.business_profile_id = asset_rights.business_profile_id) AND (a.id = asset_rights.asset_id))))", check: "(EXISTS ( SELECT 1\n   FROM app.assets a\n  WHERE ((a.workspace_id = asset_rights.workspace_id) AND (a.business_profile_id = asset_rights.business_profile_id) AND (a.id = asset_rights.asset_id))))" },
  "asset_versions.asset_versions_scope_narrows_member": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.assets a\n  WHERE ((a.workspace_id = asset_versions.workspace_id) AND (a.business_profile_id = asset_versions.business_profile_id) AND (a.id = asset_versions.asset_id))))", check: "(EXISTS ( SELECT 1\n   FROM app.assets a\n  WHERE ((a.workspace_id = asset_versions.workspace_id) AND (a.business_profile_id = asset_versions.business_profile_id) AND (a.id = asset_versions.asset_id))))" },
  "assets.assets_scope_narrows_member": { cmd: "*", using: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND", check: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND" },
  "business_profile_versions.business_profile_versions_scope_narrows_member": { cmd: "*", using: "app.member_scope_admits_business(workspace_id, business_profile_id)", check: "app.member_scope_admits_business(workspace_id, business_profile_id)" },
  "business_profiles.business_profiles_scope_narrows_member": { cmd: "*", using: "app.member_scope_admits_business(workspace_id, id)", check: "app.member_scope_admits_business(workspace_id, id)" },
  "content_asset_links.content_asset_links_scope_narrows_member": { cmd: "*", using: "((EXISTS ( SELECT 1\n   FROM app.assets a\n  WHERE ((a.workspace_id = content_asset_links.workspace_id) AND (a.business_profile_id = content_asset_links.business_profile_id) AND (a.id = content_asset_links.asset_id)))) AND (EXISTS ( SELECT 1\n   FROM app.content_versions v\n  WHERE ((v.workspace_id = content_asset_links.workspace_id) AND (v.business_profile_id = content_asset_links.business_profile_id) AND (v.id = content_asset_links.content_version_id)))))", check: "((EXISTS ( SELECT 1\n   FROM app.assets a\n  WHERE ((a.workspace_id = content_asset_links.workspace_id) AND (a.business_profile_id = content_asset_links.business_profile_id) AND (a.id = content_asset_links.asset_id)))) AND (EXISTS ( SELECT 1\n   FROM app.content_versions v\n  WHERE ((v.workspace_id = content_asset_links.workspace_id) AND (v.business_profile_id = content_asset_links.business_profile_id) AND (v.id = content_asset_links.content_version_id)))))" },
  "content_ideas.content_ideas_scope_narrowing": { cmd: "*", using: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND", check: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND" },
  "content_items.content_items_scope_narrowing": { cmd: "*", using: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND", check: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND" },
  "content_targets.content_targets_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = content_targets.workspace_id) AND (i.business_profile_id = content_targets.business_profile_id) AND (i.id = content_targets.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = content_targets.workspace_id) AND (i.business_profile_id = content_targets.business_profile_id) AND (i.id = content_targets.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "content_variants.content_variants_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM (app.content_versions v\n     JOIN app.content_items i ON (((i.workspace_id = v.workspace_id) AND (i.business_profile_id = v.business_profile_id) AND (i.id = v.content_item_id))))\n  WHERE ((v.workspace_id = content_variants.workspace_id) AND (v.business_profile_id = content_variants.business_profile_id) AND (v.id = content_variants.content_version_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM (app.content_versions v\n     JOIN app.content_items i ON (((i.workspace_id = v.workspace_id) AND (i.business_profile_id = v.business_profile_id) AND (i.id = v.content_item_id))))\n  WHERE ((v.workspace_id = content_variants.workspace_id) AND (v.business_profile_id = content_variants.business_profile_id) AND (v.id = content_variants.content_version_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "content_versions.content_versions_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = content_versions.workspace_id) AND (i.business_profile_id = content_versions.business_profile_id) AND (i.id = content_versions.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = content_versions.workspace_id) AND (i.business_profile_id = content_versions.business_profile_id) AND (i.id = content_versions.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "industry_assignments.industry_assignments_scope_narrows_member": { cmd: "*", using: "app.member_scope_admits_business(workspace_id, business_profile_id)", check: "app.member_scope_admits_business(workspace_id, business_profile_id)" },
  "knowledge_item_versions.knowledge_item_versions_scope_narrows_member": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.knowledge_items i\n  WHERE ((i.workspace_id = knowledge_item_versions.workspace_id) AND (i.business_profile_id = knowledge_item_versions.business_profile_id) AND (i.id = knowledge_item_versions.knowledge_item_id))))", check: "(EXISTS ( SELECT 1\n   FROM app.knowledge_items i\n  WHERE ((i.workspace_id = knowledge_item_versions.workspace_id) AND (i.business_profile_id = knowledge_item_versions.business_profile_id) AND (i.id = knowledge_item_versions.knowledge_item_id))))" },
  "knowledge_items.knowledge_items_scope_narrows_member": { cmd: "*", using: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND", check: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND" },
  "page_context_profile_versions.page_context_profile_versions_scope_narrows_member": { cmd: "*", using: "app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)", check: "app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)" },
  "page_context_profiles.page_context_profiles_scope_narrows_member": { cmd: "*", using: "app.member_scope_admits_page(workspace_id, business_profile_id, id)", check: "app.member_scope_admits_page(workspace_id, business_profile_id, id)" },
  "performance_snapshots.performance_snapshots_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM (((app.published_posts p\n     JOIN app.publish_targets t ON (((t.workspace_id = p.workspace_id) AND (t.business_profile_id = p.business_profile_id) AND (t.id = p.publish_target_id))))\n     JOIN app.publish_intents pi ON (((pi.workspace_id = t.workspace_id) AND (pi.business_profile_id = t.business_profile_id) AND (pi.id = t.publish_intent_id))))\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((p.workspace_id = performance_snapshots.workspace_id) AND (p.business_profile_id = performance_snapshots.business_profile_id) AND (p.id = performance_snapshots.published_post_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM (((app.published_posts p\n     JOIN app.publish_targets t ON (((t.workspace_id = p.workspace_id) AND (t.business_profile_id = p.business_profile_id) AND (t.id = p.publish_target_id))))\n     JOIN app.publish_intents pi ON (((pi.workspace_id = t.workspace_id) AND (pi.business_profile_id = t.business_profile_id) AND (pi.id = t.publish_intent_id))))\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((p.workspace_id = performance_snapshots.workspace_id) AND (p.business_profile_id = performance_snapshots.business_profile_id) AND (p.id = performance_snapshots.published_post_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "publish_intents.publish_intents_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = publish_intents.workspace_id) AND (i.business_profile_id = publish_intents.business_profile_id) AND (i.id = publish_intents.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM app.content_items i\n  WHERE ((i.workspace_id = publish_intents.workspace_id) AND (i.business_profile_id = publish_intents.business_profile_id) AND (i.id = publish_intents.content_item_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "publish_jobs.publish_jobs_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM ((app.publish_targets t\n     JOIN app.publish_intents pi ON (((pi.workspace_id = t.workspace_id) AND (pi.business_profile_id = t.business_profile_id) AND (pi.id = t.publish_intent_id))))\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((t.workspace_id = publish_jobs.workspace_id) AND (t.business_profile_id = publish_jobs.business_profile_id) AND (t.id = publish_jobs.publish_target_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM ((app.publish_targets t\n     JOIN app.publish_intents pi ON (((pi.workspace_id = t.workspace_id) AND (pi.business_profile_id = t.business_profile_id) AND (pi.id = t.publish_intent_id))))\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((t.workspace_id = publish_jobs.workspace_id) AND (t.business_profile_id = publish_jobs.business_profile_id) AND (t.id = publish_jobs.publish_target_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "publish_target_assets.publish_target_assets_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM ((app.publish_targets t\n     JOIN app.publish_intents pi ON (((pi.workspace_id = t.workspace_id) AND (pi.business_profile_id = t.business_profile_id) AND (pi.id = t.publish_intent_id))))\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((t.workspace_id = publish_target_assets.workspace_id) AND (t.business_profile_id = publish_target_assets.business_profile_id) AND (t.id = publish_target_assets.publish_target_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM ((app.publish_targets t\n     JOIN app.publish_intents pi ON (((pi.workspace_id = t.workspace_id) AND (pi.business_profile_id = t.business_profile_id) AND (pi.id = t.publish_intent_id))))\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((t.workspace_id = publish_target_assets.workspace_id) AND (t.business_profile_id = publish_target_assets.business_profile_id) AND (t.id = publish_target_assets.publish_target_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "publish_targets.publish_targets_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM (app.publish_intents pi\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((pi.workspace_id = publish_targets.workspace_id) AND (pi.business_profile_id = publish_targets.business_profile_id) AND (pi.id = publish_targets.publish_intent_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM (app.publish_intents pi\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((pi.workspace_id = publish_targets.workspace_id) AND (pi.business_profile_id = publish_targets.business_profile_id) AND (pi.id = publish_targets.publish_intent_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "published_posts.published_posts_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM ((app.publish_targets t\n     JOIN app.publish_intents pi ON (((pi.workspace_id = t.workspace_id) AND (pi.business_profile_id = t.business_profile_id) AND (pi.id = t.publish_intent_id))))\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((t.workspace_id = published_posts.workspace_id) AND (t.business_profile_id = published_posts.business_profile_id) AND (t.id = published_posts.publish_target_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM ((app.publish_targets t\n     JOIN app.publish_intents pi ON (((pi.workspace_id = t.workspace_id) AND (pi.business_profile_id = t.business_profile_id) AND (pi.id = t.publish_intent_id))))\n     JOIN app.content_items i ON (((i.workspace_id = pi.workspace_id) AND (i.business_profile_id = pi.business_profile_id) AND (i.id = pi.content_item_id))))\n  WHERE ((t.workspace_id = published_posts.workspace_id) AND (t.business_profile_id = published_posts.business_profile_id) AND (t.id = published_posts.publish_target_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "quality_reviews.quality_reviews_scope_narrowing": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM (app.content_versions v\n     JOIN app.content_items i ON (((i.workspace_id = v.workspace_id) AND (i.business_profile_id = v.business_profile_id) AND (i.id = v.content_item_id))))\n  WHERE ((v.workspace_id = quality_reviews.workspace_id) AND (v.business_profile_id = quality_reviews.business_profile_id) AND (v.id = quality_reviews.content_version_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))", check: "(EXISTS ( SELECT 1\n   FROM (app.content_versions v\n     JOIN app.content_items i ON (((i.workspace_id = v.workspace_id) AND (i.business_profile_id = v.business_profile_id) AND (i.id = v.content_item_id))))\n  WHERE ((v.workspace_id = quality_reviews.workspace_id) AND (v.business_profile_id = quality_reviews.business_profile_id) AND (v.id = quality_reviews.content_version_id) AND\n        CASE\n            WHEN (i.page_context_profile_id IS NULL) THEN app.member_scope_admits_business(i.workspace_id, i.business_profile_id)\n            ELSE app.member_scope_admits_page(i.workspace_id, i.business_profile_id, i.page_context_profile_id)\n        END)))" },
  "quota_buckets.quota_buckets_scope_narrows_member": { cmd: "*", using: "((business_profile_id IS NULL) OR app.member_scope_admits_business(workspace_id, business_profile_id))", check: "((business_profile_id IS NULL) OR app.member_scope_admits_business(workspace_id, business_profile_id))" },
  "research_evidence.research_evidence_scope_narrows_member": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.research_sources s\n  WHERE ((s.workspace_id = research_evidence.workspace_id) AND (s.business_profile_id = research_evidence.business_profile_id) AND (s.id = research_evidence.research_source_id))))", check: "(EXISTS ( SELECT 1\n   FROM app.research_sources s\n  WHERE ((s.workspace_id = research_evidence.workspace_id) AND (s.business_profile_id = research_evidence.business_profile_id) AND (s.id = research_evidence.research_source_id))))" },
  "research_runs.research_runs_scope_narrows_member": { cmd: "*", using: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND", check: "\nCASE\n    WHEN (page_context_profile_id IS NULL) THEN app.member_scope_admits_business(workspace_id, business_profile_id)\n    ELSE app.member_scope_admits_page(workspace_id, business_profile_id, page_context_profile_id)\nEND" },
  "research_sources.research_sources_scope_narrows_member": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.research_runs r\n  WHERE ((r.workspace_id = research_sources.workspace_id) AND (r.business_profile_id = research_sources.business_profile_id) AND (r.id = research_sources.research_run_id))))", check: "(EXISTS ( SELECT 1\n   FROM app.research_runs r\n  WHERE ((r.workspace_id = research_sources.workspace_id) AND (r.business_profile_id = research_sources.business_profile_id) AND (r.id = research_sources.research_run_id))))" },
  "research_suggestions.research_suggestions_scope_narrows_member": { cmd: "*", using: "(EXISTS ( SELECT 1\n   FROM app.research_runs r\n  WHERE ((r.workspace_id = research_suggestions.workspace_id) AND (r.business_profile_id = research_suggestions.business_profile_id) AND (r.id = research_suggestions.research_run_id))))", check: "(EXISTS ( SELECT 1\n   FROM app.research_runs r\n  WHERE ((r.workspace_id = research_suggestions.workspace_id) AND (r.business_profile_id = research_suggestions.business_profile_id) AND (r.id = research_suggestions.research_run_id))))" },
};
export const PINNED_POLICY_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(pin.k, ', ' order by pin.k) into offending
    from (values ${Object.entries(PINNED_POLICIES).map(([k, { cmd, using, check }]) => `('${k}', '${cmd}', '${using.replace(/'/g, "''")}', '${check.replace(/'/g, "''")}')`).join(', ')}) as pin(k, cmd, using_text, check_text)
   where not exists (
     select 1 from pg_catalog.pg_policy pol
      where pol.polrelid = to_regclass('app.' || split_part(pin.k, '.', 1)) and pol.polname = split_part(pin.k, '.', 2)
        and not pol.polpermissive and pol.polcmd = pin.cmd
        and pol.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]::oid[]
        and pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) = pin.using_text
        and pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) = pin.check_text);
  if offending is not null then
    raise exception 'pinned restrictive policy(ies) missing or not in their pinned text: %', offending;
  end if;
end \$\$;
`;

// 3. SECURITY DEFINER, in EVERY schema but the system ones: exactly the pinned functions, each with
// its pinned owner and body digest, proconfig exactly search_path="", and no EXECUTE for PUBLIC.
// The first version read app and private only, and read proconfig only: A1 measured a definer
// function in `public` or a new schema, one keeping EXECUTE for PUBLIC, one resetting search_path
// inside its body, a changed owner and a replaced refuse_mutation body each passing every layer (A1
// F2, F3). A batch that adds or rewrites a definer function updates this list in the same change,
// which puts every SECURITY DEFINER change in front of a reviewer. `migration owner` is the role
// that applied the set (current_user here). Settings are never PRINTED, only compared: a value set
// at function level would otherwise land in the CI log (A1 F5).
export const SECURITY_DEFINER_FUNCTIONS = [
  ['app.is_active_member(workspace uuid)', 'app_authz', '552b6db607ddb258f6917f7e9e01cfd4'],
  ['app.jwt_subject()', 'app_authz', '185148c2a93687d4574a2c66df66d3f3'],
  ['app.workspace_member_role(workspace uuid)', 'app_authz', '83e32b7264d1cf2532581a88bf6e7732'],
  ['private.refuse_mutation()', 'migration owner', '6db127bec23ecfaaf041b7dc5c031615'],
  ['private.set_updated_at()', 'migration owner', '1c4318bee4240d4113d86fad7eb15623'],
];
// The first rule skips EXTENSION MEMBERS (pg_depend deptype 'e'), since an extension's own functions are
// not this repository's to pin by body. A1 V06b (127's re-check, N2) made a SECURITY DEFINER function that
// read every tenant's ideas a member of pgcrypto with one ALTER EXTENSION ... ADD, and every layer stayed
// green. So the third rule (batch 128) reads exactly those members, in every schema the first reads: each
// SECURITY DEFINER extension member must be pinned here as 'schema.name(args) (extension name)'. Measured
// on the clean set at batch 128 (pgcrypto in extensions, plpgsql): none, so the list is empty.
// Since batch 128's review round the first and third rules also read a function in pg_catalog or
// information_schema whose OID is at or above 16384, made after initdb (C0 X5, Q0 ISF: a SECURITY DEFINER
// function in information_schema, EXECUTE to authenticated, counted every tenant's ideas with every layer
// green). The pg_catalog guard refuses one there first, in every job; this is the second reading.
export const EXTENSION_DEFINER_FUNCTIONS = [];
export const SECURITY_DEFINER_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s.%s(%s)%s%s%s%s', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid),
                  case when p.proconfig is distinct from array['search_path=""'] then ' [proconfig is not exactly search_path=""]' else '' end,
                  case when pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE') then ' [PUBLIC can execute]' else '' end,
                  case when pin.owner is null then ' [not a pinned SECURITY DEFINER function]'
                       when pg_catalog.pg_get_userbyid(p.proowner) <> case when pin.owner = 'migration owner' then current_user::text else pin.owner end
                         then ' [owner is not the pinned owner]' else '' end,
                  case when pin.digest is not null and md5(p.prosrc) <> pin.digest then ' [body differs from the pinned digest]' else '' end) as x,
           p.proconfig, p.oid, pin.owner, pin.digest, p.prosrc, p.proowner
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      left join (values ${SECURITY_DEFINER_FUNCTIONS.map(([f, o, d]) => `('${f}', '${o}', '${d}')`).join(', ')}) as pin(fn, owner, digest)
        on pin.fn = format('%s.%s(%s)', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid))
     where p.prosecdef and (n.nspname not in ('pg_catalog', 'information_schema') or p.oid >= ${FIRST_NORMAL_OID})
       and not exists (select 1 from pg_catalog.pg_depend d where d.classid = 'pg_catalog.pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  ) f
   where x ~ '\\[';
  if offending is not null then
    raise exception 'SECURITY DEFINER function(s) not in their pinned shape: %', offending;
  end if;
  select string_agg(fn, ', ' order by fn) into offending
    from (values ${SECURITY_DEFINER_FUNCTIONS.map(([f]) => `('${f}')`).join(', ')}) as pin(fn)
   where not exists (select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                      where p.prosecdef and format('%s.%s(%s)', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)) = pin.fn);
  if offending is not null then
    raise exception 'pinned SECURITY DEFINER function(s) missing or no longer SECURITY DEFINER: %', offending;
  end if;
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s.%s(%s) (extension %s)', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), e.extname) as x
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      join pg_catalog.pg_depend d on d.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass and d.objid = p.oid and d.deptype = 'e'
      join pg_catalog.pg_extension e on d.refclassid = 'pg_catalog.pg_extension'::pg_catalog.regclass and e.oid = d.refobjid
     where p.prosecdef and (n.nspname not in ('pg_catalog', 'information_schema') or p.oid >= ${FIRST_NORMAL_OID})
  ) f
   where not (x = any (array[${EXTENSION_DEFINER_FUNCTIONS.map((f) => `'${f}'`).join(', ')}]::text[]));
  if offending is not null then
    raise exception 'SECURITY DEFINER extension member(s) not pinned, which the first rule does not read: %', offending;
  end if;
end \$\$;
`;
// 3'. THE INVOKER HELPERS THE POLICIES CALL, BY BODY (batch 127's review round; C0 F4). The permissive and
// restrictive pins compare a policy's DEPARSE, and a deparse names a function without its body: C0 X1
// replaced member_scope_covers_business and member_scope_admits_business with `select true` and migrate-clean
// passed, held by rls-smoke alone (40 cases). Measured on the clean set through 127: policies call exactly
// auth.uid(), the two pinned SECURITY DEFINER lookups, and four invoker helpers; two of those call
// member_scope_is_narrowed and the other two. These five are pinned here by owner, body digest and an empty
// search_path, and every function any policy calls must be one of them, a pinned SECURITY DEFINER function or
// the platform's auth.uid(): a policy that starts calling an unpinned function fails by that function's name.
export const POLICY_HELPER_FUNCTIONS = [
  ['app.member_scope_admits_business(workspace uuid, business uuid)', 'migration owner', '1887136915f293e7a8b8a97cfb99f855'],
  ['app.member_scope_admits_page(workspace uuid, business uuid, page_context uuid)', 'migration owner', '91f9821a8f333293e4d143a37637355d'],
  ['app.member_scope_covers_business(workspace uuid, business uuid)', 'migration owner', '786d81cc03c67608c0f69f44d52bc0df'],
  ['app.member_scope_covers_page(workspace uuid, business uuid, page_context uuid)', 'migration owner', '63aaa2293bd43d74743a3f93b6217e05'],
  ['app.member_scope_is_narrowed(workspace uuid)', 'migration owner', '6c54d6ea9adc9233be6e416f9d3ce204'],
];
export const POLICY_PLATFORM_FUNCTIONS = ['auth.uid()'];
export const POLICY_HELPER_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(x, ', ' order by x) into offending from (
    select pin.fn || case when p.oid is null then ' [missing]' else
             case when p.prosecdef then ' [SECURITY DEFINER]' else '' end
             || case when p.proconfig is distinct from array['search_path=""'] then ' [proconfig is not exactly search_path=""]' else '' end
             || case when pg_catalog.pg_get_userbyid(p.proowner) <> case when pin.owner = 'migration owner' then current_user::text else pin.owner end
                     then ' [owner is not the pinned owner]' else '' end
             || case when md5(p.prosrc) <> pin.digest then ' [body differs from the pinned digest]' else '' end end as x
      from (values ${POLICY_HELPER_FUNCTIONS.map(([f, o, d]) => `('${f}', '${o}', '${d}')`).join(', ')}) as pin(fn, owner, digest)
      left join (pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace)
        on format('%s.%s(%s)', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)) = pin.fn
  ) f
   where x ~ '\\[';
  if offending is not null then
    raise exception 'policy helper function(s) not in their pinned shape: %', offending;
  end if;
  select string_agg(distinct called.fn, ', ' order by called.fn) into offending from (
    select format('%s.%s(%s)', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)) as fn
      from pg_catalog.pg_depend d join pg_catalog.pg_proc p on p.oid = d.refobjid
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where d.classid = 'pg_catalog.pg_policy'::pg_catalog.regclass and d.refclassid = 'pg_catalog.pg_proc'::pg_catalog.regclass
       and (n.nspname not in ('pg_catalog', 'information_schema') or p.oid >= ${FIRST_NORMAL_OID})
  ) called
   where not (called.fn = any (array[${[...POLICY_HELPER_FUNCTIONS.map(([f]) => f), ...SECURITY_DEFINER_FUNCTIONS.map(([f]) => f), ...POLICY_PLATFORM_FUNCTIONS].map((f) => `'${f}'`).join(', ')}]));
  if offending is not null then
    raise exception 'function(s) a policy calls that are not pinned by body: %', offending;
  end if;
end \$\$;
`;

// 4. Every trigger on a table in app and private is ENABLED -- internal ones included, because an
// FK is enforced by internal triggers and `disable trigger all` turns them off (C0 MEDIUM 2) -- and
// the append-only set is exactly four definitions, compared by pg_get_triggerdef TEXT: matching on
// table, name and tgtype let `WHEN (false)` or `UPDATE OF id` through, and with the first a
// security_events row could be updated and deleted (C0 MEDIUM 1). 093, 120 and 140 assert that
// triggers exist and never read tgenabled; Q0 D20b disabled security_events' triggers unnoticed.
export const REFUSE_MUTATION_TRIGGERS = [
  'CREATE TRIGGER refuse_mutation BEFORE DELETE OR UPDATE ON app.audit_logs FOR EACH ROW EXECUTE FUNCTION private.refuse_mutation()',
  'CREATE TRIGGER refuse_truncate BEFORE TRUNCATE ON app.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION private.refuse_mutation()',
  'CREATE TRIGGER refuse_mutation BEFORE DELETE OR UPDATE ON app.security_events FOR EACH ROW EXECUTE FUNCTION private.refuse_mutation()',
  'CREATE TRIGGER refuse_truncate BEFORE TRUNCATE ON app.security_events FOR EACH STATEMENT EXECUTE FUNCTION private.refuse_mutation()',
];
// The event triggers a migration may make, by name (batch 129's review round; A1 R3). None, as measured on
// the clean set at batch 129: a pin is an RFC-sized decision in the same diff as its reason.
export const PINNED_EVENT_TRIGGERS = [];
export const TRIGGER_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(format('%s.%s (tgenabled %s%s)', t.tgrelid::regclass, t.tgname, t.tgenabled,
                           case when t.tgisinternal then ', internal' else '' end), ', '
                    order by t.tgrelid::regclass::text, t.tgname) into offending
    from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname not in ('pg_catalog', 'information_schema') and t.tgenabled <> 'O';
  if offending is not null then
    raise exception 'trigger(s) not enabled: %', offending;
  end if;
  -- The refusal names what differs, missing or unpinned, so the verdict can tie it to the
  -- definition its drift touched (blocker 186 item 11).
  with found as (
    select pg_catalog.pg_get_triggerdef(t.oid) as def
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_proc p on p.oid = t.tgfoid join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
     where not t.tgisinternal and pn.nspname = 'private' and p.proname = 'refuse_mutation'
  ), pinned as (
    select unnest(array[${[...REFUSE_MUTATION_TRIGGERS].sort().map((d) => `'${d}'`).join(', ')}]) as def
  )
  select string_agg(x, '; ' order by x) into offending from (
    select 'missing: ' || def as x from pinned where def not in (select def from found)
    union all
    select 'unpinned: ' || def from found where def not in (select def from pinned)
  ) d;
  if offending is not null then
    raise exception 'the private.refuse_mutation triggers are not exactly the four pinned definitions on audit_logs and security_events: %', offending;
  end if;
  -- No role or database may default session_replication_role, which stops every trigger and every FK
  -- trigger from firing; 140's block caught it only by accident, on a CHECK violation (Q0 F5).
  select string_agg(format('%s/%s', coalesce(r.rolname, '<every role>'), coalesce(d.datname, '<every database>')), ', '
                    order by coalesce(r.rolname, ''), coalesce(d.datname, '')) into offending
    from pg_catalog.pg_db_role_setting s
    left join pg_catalog.pg_roles r on r.oid = s.setrole left join pg_catalog.pg_database d on d.oid = s.setdatabase
   where exists (select 1 from unnest(s.setconfig) g where g like 'session_replication_role=%');
  if offending is not null then
    raise exception 'session_replication_role is set as a default for: %', offending;
  end if;
  -- No child and no partitioning: rows in a table inheriting from audit_logs are deleted THROUGH the
  -- parent without its row trigger (A1 F2, measured), and PostgreSQL 17 does not copy a statement
  -- TRUNCATE trigger to partitions, so a rebuild as a partitioned table would open TRUNCATE on each.
  select string_agg(format('%s', c.oid::regclass), ', ' order by c.oid::regclass::text) into offending
    from pg_catalog.pg_class c
   where c.oid in ('app.audit_logs'::regclass, 'app.security_events'::regclass)
     and (c.relkind <> 'r'
          or exists (select 1 from pg_catalog.pg_inherits i where i.inhparent = c.oid or i.inhrelid = c.oid));
  if offending is not null then
    raise exception 'append-only table(s) partitioned, inherited from or inheriting: %', offending;
  end if;
  -- No parameter ACL lets a non-superuser SET session_replication_role (blocker 186 item 14; A1 V3 on
  -- batch 125). PostgreSQL 15+ grants a superuser-only parameter through pg_parameter_acl, which the
  -- role-default rule above never read: A1 measured "grant set on parameter session_replication_role to
  -- authenticated" in a later file passing every layer, after which a decider in replica mode recorded
  -- a decision dated 2001 and an owner inserted a request pinned to a version that does not exist.
  select string_agg(format('%s (%s)', coalesce(r.rolname, 'PUBLIC'), a.privilege_type), ', '
                    order by coalesce(r.rolname, 'PUBLIC'), a.privilege_type) into offending
    from pg_catalog.pg_parameter_acl p
    cross join lateral pg_catalog.aclexplode(p.paracl) a
    left join pg_catalog.pg_roles r on r.oid = a.grantee
   where p.parname = 'session_replication_role' and not coalesce(r.rolsuper, false);
  if offending is not null then
    raise exception 'session_replication_role can be SET or ALTER SYSTEM-ed through a parameter grant by: %', offending;
  end if;
  -- No event trigger but the pinned ones (batch 129's review round; A1 R3: no probe read pg_event_trigger).
  -- An event trigger fires on DDL in ANY session, a client's TEMPORARY DDL included, and runs a function no
  -- other rule here enumerates by that path. Measured on the clean set at batch 129: none.
  select string_agg(format('%s on %s', e.evtname, e.evtevent), ', ' order by e.evtname) into offending
    from pg_catalog.pg_event_trigger e
   where not (e.evtname::text = any (array[${PINNED_EVENT_TRIGGERS.map((t) => `'${t}'`).join(', ')}]::text[]));
  if offending is not null then
    raise exception 'event trigger(s) not pinned, each running on DDL in any session: %', offending;
  end if;
end \$\$;
`;

// 5. EVERY TRIGGER ON A PINNED TABLE, BY DEFINITION, AND THE BODY OF EVERY FUNCTION THEY RUN (blocker 186
// item 13; Q0 F3 and F8 on batch 125). decided_at is the database's only for the trigger that sets it:
// PostgreSQL fires BEFORE ROW triggers in name order, and Q0 measured a later file adding
// `set_decided_at_backfill`, sorting after it and taking decided_at from a session setting, backdate a
// decision to 2001 with every layer green (M7); and an edit to 125's own body with its md5 recomputed
// do the same (M6). set_decided_at is SECURITY INVOKER, so the definer probe never read it. Here every
// non-internal trigger on a pinned table is compared by pg_get_triggerdef TEXT against an exact list,
// and every function those triggers execute is compared against a pinned body digest, security and
// empty search_path, with no EXECUTE for PUBLIC -- a second pin, in this file, beside 126's block.
export const PINNED_TABLE_TRIGGERS = {
  'app.approval_requests': [
    'CREATE TRIGGER set_decided_at BEFORE INSERT OR UPDATE ON app.approval_requests FOR EACH ROW EXECUTE FUNCTION private.set_decided_at()',
    'CREATE TRIGGER set_updated_at BEFORE UPDATE ON app.approval_requests FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()',
  ],
};
// [function, security, body digest, owner]. The owner is pinned beside the digest (Q0 F8 on batch 126: a
// later file handing set_decided_at to app_worker passed every layer, and an owner can drop the trigger).
export const PINNED_TRIGGER_FUNCTIONS = [
  ['private.set_decided_at()', 'invoker', '48bcd0d03295b86120ea89fa4dec7adf', 'migration owner'],
  ['private.set_updated_at()', 'definer', SECURITY_DEFINER_FUNCTIONS.find(([f]) => f === 'private.set_updated_at()')[2],
    SECURITY_DEFINER_FUNCTIONS.find(([f]) => f === 'private.set_updated_at()')[1]],
];
export const PINNED_TRIGGER_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  with found as (
    select format('%s.%s', n.nspname, c.relname) as tab, pg_catalog.pg_get_triggerdef(t.oid) as def
      from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where not t.tgisinternal
       and format('%s.%s', n.nspname, c.relname) = any (array[${Object.keys(PINNED_TABLE_TRIGGERS).map((t) => `'${t}'`).join(', ')}])
  ), pinned as (
    select * from (values ${Object.entries(PINNED_TABLE_TRIGGERS).flatMap(([t, defs]) => defs.map((d) => `('${t}', '${d}')`)).join(', ')}) as v(tab, def)
  )
  select string_agg(x, '; ' order by x) into offending from (
    select 'missing: ' || p.def as x from pinned p where not exists (select 1 from found f where f.tab = p.tab and f.def = p.def)
    union all
    select 'unpinned: ' || f.def from found f where not exists (select 1 from pinned p where p.tab = f.tab and p.def = f.def)
  ) d;
  if offending is not null then
    raise exception 'trigger(s) on a pinned table not exactly its pinned definitions: %', offending;
  end if;
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s.%s()%s%s%s%s%s', pn.nspname, p.proname,
                  case when pin.fn is null then ' [not a pinned trigger function]' else '' end,
                  case when pin.fn is not null and md5(p.prosrc) <> pin.digest then ' [body differs from the pinned digest]' else '' end,
                  case when pin.fn is not null and p.prosecdef <> (pin.security = 'definer') then ' [not ' || pin.security || ']' else '' end,
                  case when p.proconfig is distinct from array['search_path=""'] or pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE')
                       then ' [search_path is not exactly "" or PUBLIC can execute]' else '' end,
                  case when pin.fn is not null
                        and pg_catalog.pg_get_userbyid(p.proowner) <> case when pin.owner = 'migration owner' then current_user::text else pin.owner end
                       then ' [owner is not the pinned owner]' else '' end) as x
      from (select distinct t.tgfoid from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
              join pg_catalog.pg_namespace n on n.oid = c.relnamespace
             where not t.tgisinternal
               and format('%s.%s', n.nspname, c.relname) = any (array[${Object.keys(PINNED_TABLE_TRIGGERS).map((t) => `'${t}'`).join(', ')}])) used
      join pg_catalog.pg_proc p on p.oid = used.tgfoid join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
      left join (values ${PINNED_TRIGGER_FUNCTIONS.map(([f, sec, d, o]) => `('${f}', '${sec}', '${d}', '${o}')`).join(', ')}) as pin(fn, security, digest, owner)
        on pin.fn = format('%s.%s(%s)', pn.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid))
  ) f
   where x ~ '\\[';
  if offending is not null then
    raise exception 'trigger function(s) on a pinned table not in their pinned shape: %', offending;
  end if;
end \$\$;
`;

// 6. THE GRANT SET ON EVERY TABLE IN app AND private, BY ALLOWLIST, AT TABLE AND COLUMN LEVEL (batch 126;
// C0 H1, A1 R1 and R3 on batch 091's third round; every table and every role since the batch 170 draft).
// 091's block item 6 names privileges a role must NOT hold, so a grant it does not name passes every
// layer: C0 measured `grant insert (deleted_at)` on calendar_items to authenticated -- a placement born
// deleted, dated by the client, since set_deleted_at fires on UPDATE only -- and INSERT or UPDATE on
// created_at, and A1 TRUNCATE, TRIGGER, REFERENCES and MAINTAIN, each green on migrate-clean and
// rls-smoke. Here every role that is neither a superuser nor a predefined pg_* role (authenticated, anon,
// service_role, app_worker, app_command, app_maintenance and app_authz on this cluster) is read for its
// EFFECTIVE privileges, has_table_privilege and has_column_privilege, and the set found must be exactly
// the pinned set: anything unlisted and anything missing is named.
//
// EVERY TABLE, EVERY ROLE (the batch 170 draft; plan "Batch 170 -- Can do now" (a), WP blocker text "the
// other roles' reach (app_worker, service_role, RFC-2026-023 command roles), which no rule here reads").
// The first version pinned 091's two tables, so a privilege granted to app_worker, app_command or
// service_role on any other table passed every layer. The list is now DATA, db/foundation/lint/
// pinned-grants.json, generated from a live catalog read on the clean set and committed as reviewed data:
// one entry per table, one line per role. Its first rule makes the TABLE list closed too: every table in
// app and private is an entry (one no role holds anything on is an empty one), and every entry is a
// table, so a new table is named even when it is granted nothing. Measured on the clean set at the
// draft: 66 tables, 43 table-level and 1328 column-level privileges, held by app_worker (on 41 tables),
// authenticated (44) and app_authz (1); service_role, app_command, app_maintenance and anon hold none, and
// no privilege is held WITH GRANT OPTION. A column privilege a table-level privilege already implies is
// not read at the column level (the table-level row carries it), so a role's table-wide SELECT is one
// row, not one per column. A batch that grants, revokes or adds a table changes the file in the same
// diff. 091's apply-time block is integrated and is not rewritten: this is the forward assertion beside it.
const lintData = (name) => JSON.parse(readFileSync(new URL(`../../db/foundation/lint/${name}`, import.meta.url), 'utf8'));
export const PINNED_GRANTS_FILE = 'db/foundation/lint/pinned-grants.json';
export const PINNED_GRANTS = lintData('pinned-grants.json').tables;
const pinnedGrantRows = (level) => Object.entries(PINNED_GRANTS).flatMap(([table, roles]) => Object.entries(roles).flatMap(([role, privs]) =>
  level === 'table' ? (privs.table ?? []).map((p) => `${role} ${p} on ${table}`)
    : Object.entries(privs).filter(([p]) => p !== 'table').flatMap(([p, cols]) => cols.map((c) => `${role} ${p} (${c}) on ${table}`))));
const grantDiff = (found, rows) => `
  ), pinned as (
    select unnest(array[${rows.length ? rows.map((r) => `'${r}'`).join(', ') : ''}]::text[]) as g
  )
  select string_agg(x, '; ' order by x) into offending from (
    select 'unlisted: ' || f.g as x from ${found} f where f.g not in (select g from pinned)
    union all
    select 'missing: ' || p.g from pinned p where p.g not in (select g from ${found})
  ) d;`;
const pinnedGrantTables = `array[${Object.keys(PINNED_GRANTS).map((t) => `'${t}'`).join(', ')}]::text[]`;
// The review round on batch 126 added two things. The role set leaves superusers out, so the probe
// ASSUMES each pinned table's owner is a superuser (C0 F5): that is now a rule, not a silent
// premise -- on a cluster where the owner is not one, the owner's implicit privileges would read as
// unlisted, and the rule says why first. And each privilege is read WITH GRANT OPTION as well, a row
// the allowlist never lists (C0 F3, A1 F3, Q0 F7: `... with grant option` passed every layer).
export const PINNED_GRANT_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(x, ', ' order by x) into offending from (
    select 'unpinned: ' || format('%s.%s', n.nspname, c.relname) as x
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('app', 'private') and c.relkind in ('r', 'p')
       and not (format('%s.%s', n.nspname, c.relname) = any (${pinnedGrantTables}))
    union all
    select 'pinned but absent: ' || tabs.t from unnest(${pinnedGrantTables}) as tabs(t)
     where not exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                        where format('%s.%s', n.nspname, c.relname) = tabs.t and c.relkind in ('r', 'p'))
  ) d;
  if offending is not null then
    raise exception 'app or private table(s) not exactly the pinned grant table list: %', offending;
  end if;
  select string_agg(format('%s (owner %s)', tabs.t, pg_catalog.pg_get_userbyid(c.relowner)), ', ' order by tabs.t) into offending
    from unnest(${pinnedGrantTables}) as tabs(t)
    join pg_catalog.pg_class c on c.oid = tabs.t::regclass
   where not exists (select 1 from pg_catalog.pg_roles o where o.oid = c.relowner and o.rolsuper);
  if offending is not null then
    raise exception 'pinned table(s) owned by a role that is not a superuser, whose implicit privileges the allowlist would misread: %', offending;
  end if;
  with roles as (
    select rolname as r from pg_catalog.pg_roles where not rolsuper and rolname !~ '^pg_'
  ), tabs as (
    select unnest(${pinnedGrantTables}) as t
  ), tprivs as (
    select unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
                  || case when pg_catalog.current_setting('server_version_num')::integer >= 170000 then array['MAINTAIN'] else array[]::text[] end) as p
  ), found as (
    select format('%s %s%s on %s', roles.r, tprivs.p, go.opt, tabs.t) as g
      from roles, tabs, tprivs, (values (''), (' WITH GRANT OPTION')) as go(opt)
     where pg_catalog.has_table_privilege(roles.r, tabs.t::regclass, tprivs.p || go.opt)${grantDiff('found', pinnedGrantRows('table'))}
  if offending is not null then
    raise exception 'table-level privilege(s) on a pinned table not exactly its allowlist: %', offending;
  end if;
  with roles as (
    select rolname as r from pg_catalog.pg_roles where not rolsuper and rolname !~ '^pg_'
  ), cols as (
    select c.oid as rel, format('%s.%s', n.nspname, c.relname) as t, a.attnum, a.attname
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
     where format('%s.%s', n.nspname, c.relname) = any (${pinnedGrantTables})
  ), found as (
    select format('%s %s%s (%s) on %s', roles.r, p.p, go.opt, cols.attname, cols.t) as g
      from roles, cols, unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) as p(p), (values (''), (' WITH GRANT OPTION')) as go(opt)
     where pg_catalog.has_column_privilege(roles.r, cols.rel, cols.attnum, p.p || go.opt)
       and not pg_catalog.has_table_privilege(roles.r, cols.rel, p.p || go.opt)${grantDiff('found', pinnedGrantRows('column'))}
  if offending is not null then
    raise exception 'column privilege(s) on a pinned table not exactly its allowlist: %', offending;
  end if;
end \$\$;
`;

// 6b. THE READ ALLOWLIST, BOTH WAYS (the batch 170 draft; RFC-2026-021 §8.1, §8.2 and §8.5, approved).
// RFC-021 makes db/foundation/lint/read-allowlist.json the only place "is this on the allowlist" is
// answered -- an EMPTY array on approval, which it still is -- and requires the rule to run both ways:
// every client grant is an inherited base-table grant in the known-exceptions block or corresponds to a
// registry entry, and every entry corresponds to something that exists. Neither file existed (WP blocker
// text "read-allowlist.json does not exist"). §8.3 asks for the catalog reading, so this is a catalog
// rule: every relation a client role (anon, authenticated, PUBLIC) can SELECT from, in any schema but the
// system ones or made after initdb, is read as `<role> SELECT (<level>) on <relation>`, the level being
// `columns` for a base table read through column grants, `table` for a table-wide SELECT and `view` for a
// view, materialized view or foreign table. An allowlist entry contributes its view and, for each base
// table behind it, column-level SELECT for each of its roles (§8.1's shape); a known exception contributes
// its own row. Rule 1 names a grant on no list; rule 2 names a list row with no grant. A table-wide
// SELECT on an excepted table is unlisted (§8.4's first negative: a table-wide grant is a finding even
// over the same columns). Which COLUMNS are granted is the pinned grant probe's, exactly; this probe reads
// the boundary RFC-021 draws, by relation. Measured on the clean set at the draft: 41 relations, all
// authenticated SELECT by column grants on base tables in app, which are exactly the §8.5 exceptions;
// anon and PUBLIC hold none; no view. What this does not read (stated): client INSERT, UPDATE and DELETE
// (the pinned grant and permissive policy probes hold them), and RFC-021 §8.2's migration-TEXT half
// (the contract test reads read-allowlist.json's shape statically).
export const READ_ALLOWLIST_FILE = 'db/foundation/lint/read-allowlist.json';
export const READ_ALLOWLIST_EXCEPTIONS_FILE = 'db/foundation/lint/read-allowlist-known-exceptions.json';
export const READ_ALLOWLIST = lintData('read-allowlist.json');
export const READ_ALLOWLIST_EXCEPTIONS = lintData('read-allowlist-known-exceptions.json').exceptions;
export const readAllowlistRows = () => [...new Set([
  ...READ_ALLOWLIST_EXCEPTIONS.map((e) => `${e.role} SELECT (${e.level}) on ${e.relation}`),
  ...READ_ALLOWLIST.flatMap((e) => e.roles.flatMap((r) => [`${r} SELECT (view) on ${e.view}`, ...e.base_tables.map((t) => `${r} SELECT (columns) on ${t}`)])),
])].sort();
const readAllowlistFound = `with found as (
    select distinct format('%s SELECT (%s) on %s.%s', cr.r,
             case when c.relkind not in ('r', 'p') then 'view'
                  when pg_catalog.has_table_privilege(cr.r, c.oid, 'SELECT') then 'table' else 'columns' end,
             n.nspname, c.relname) as g
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace, ${clientRoles}
     where ${userObject('c.oid')} and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and pg_catalog.has_any_column_privilege(cr.r, c.oid, 'SELECT')
  ), pinned as (
    select unnest(array[${readAllowlistRows().map((r) => `'${r}'`).join(', ')}]::text[]) as g
  )`;
export const READ_ALLOWLIST_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  ${readAllowlistFound}
  select string_agg(f.g, ', ' order by f.g) into offending from found f where not exists (select 1 from pinned p where p.g = f.g);
  if offending is not null then
    raise exception 'client SELECT grant(s) neither on the read allowlist nor in its known exceptions: %', offending;
  end if;
  ${readAllowlistFound}
  select string_agg(p.g, ', ' order by p.g) into offending from pinned p where not exists (select 1 from found f where f.g = p.g);
  if offending is not null then
    raise exception 'read allowlist or known-exception row(s) matching no client grant: %', offending;
  end if;
end \$\$;
`;

// 6c. NO CLIENT PRIVILEGE ON A SECRET-4, PROVIDER-3 OR INTERNAL-3 TABLE OR COLUMN (the batch 170 draft;
// plan "Batch 170 -- Can do now" (c); ERD §9.1, WS:803's "no credential, raw webhook, DLQ payload or
// internal billing payload" exposure). The classes come from db/foundation/lint/data-classification.json,
// which reads every table's class from the ERD's §5 family row and §9.1/§9.2 text and nowhere else: a
// table whose §5 row mixes a refused class with others and that the ERD does not resolve is a FINDING in
// that file, not a guess. Rule 1 holds the registry to the catalog both ways (every table in app and
// private is classified, every classified table exists), so a new table cannot arrive unclassified. Rule
// 2: no client role (anon, authenticated, PUBLIC) holds any privilege, at table or column level, on a
// refused table, or on a column the registry classes with a refused class (none: the ERD names no
// column). Measured on the clean set at the draft: 8 refused tables (jobs, outbox_events, consumer_ledger,
// billing_webhook_receipts, and the four in private), no client privilege on any.
export const DATA_CLASSIFICATION_FILE = 'db/foundation/lint/data-classification.json';
export const DATA_CLASSIFICATION = lintData('data-classification.json');
export const REFUSED_CLASSES = ['SECRET-4', 'PROVIDER-3', 'INTERNAL-3'];
export const REFUSED_CLASS_TABLES = Object.entries(DATA_CLASSIFICATION.tables)
  .filter(([, e]) => REFUSED_CLASSES.includes(e.class) || (e.class === null && e.erd_classes.every((c) => REFUSED_CLASSES.includes(c))))
  .map(([t]) => t);
export const REFUSED_CLASS_COLUMNS = Object.entries(DATA_CLASSIFICATION.columns).filter(([, c]) => REFUSED_CLASSES.includes(c)).map(([k]) => k);
const classifiedTables = `array[${Object.keys(DATA_CLASSIFICATION.tables).map((t) => `'${t}'`).join(', ')}]::text[]`;
export const DATA_CLASSIFICATION_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(x, ', ' order by x) into offending from (
    select 'unclassified: ' || format('%s.%s', n.nspname, c.relname) as x
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('app', 'private') and c.relkind in ('r', 'p')
       and not (format('%s.%s', n.nspname, c.relname) = any (${classifiedTables}))
    union all
    select 'classified but absent: ' || tabs.t from unnest(${classifiedTables}) as tabs(t)
     where not exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                        where format('%s.%s', n.nspname, c.relname) = tabs.t and c.relkind in ('r', 'p'))
  ) d;
  if offending is not null then
    raise exception 'app or private table(s) not exactly the classification registry: %', offending;
  end if;
  select string_agg(x, ', ' order by x) into offending from (
    select format('%s %s on %s', cr.r, p.p, t.t) as x
      from unnest(array[${REFUSED_CLASS_TABLES.map((t) => `'${t}'`).join(', ')}]::text[]) as t(t), ${clientRoles},
           unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES', 'DELETE', 'TRUNCATE', 'TRIGGER']
                  || case when pg_catalog.current_setting('server_version_num')::integer >= 170000 then array['MAINTAIN'] else array[]::text[] end) as p(p)
     where case when p.p in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES') then pg_catalog.has_any_column_privilege(cr.r, t.t::regclass, p.p)
                else pg_catalog.has_table_privilege(cr.r, t.t::regclass, p.p) end
    union all
    select format('%s %s (%s) on %s.%s', cr.r, p.p, split_part(k.k, '.', 3), split_part(k.k, '.', 1), split_part(k.k, '.', 2))
      from unnest(array[${REFUSED_CLASS_COLUMNS.map((k) => `'${k}'`).join(', ')}]::text[]) as k(k), ${clientRoles},
           unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) as p(p)
     where pg_catalog.has_column_privilege(cr.r, (split_part(k.k, '.', 1) || '.' || split_part(k.k, '.', 2))::regclass, split_part(k.k, '.', 3), p.p)
  ) f;
  if offending is not null then
    raise exception 'client privilege(s) on a table or column classed SECRET-4, PROVIDER-3 or INTERNAL-3: %', offending;
  end if;
end \$\$;
`;

// 7. COLUMN DEFAULTS A DECISION FIXES, BY DEPARSE TEXT (batch 126; C0 H3 on batch 091's third round).
// DEC-UX-06 makes Asia/Bangkok the product's zone, and 091 writes it as calendar_items.timezone's
// default; C0 measured a later file setting it to 'UTC' with every layer green, because no block reads
// a default. content_schedules.timezone_snapshot has no default (C0 P4), so it is not here.
export const PINNED_DEFAULTS = {
  'app.calendar_items.timezone': "'Asia/Bangkok'::text",
};
export const PINNED_DEFAULT_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(pin.k, ', ' order by pin.k) into offending
    from (values ${Object.entries(PINNED_DEFAULTS).map(([k, def]) => `('${k}', '${def.replace(/'/g, "''")}')`).join(', ')}) as pin(k, def)
   where not exists (
     select 1 from pg_catalog.pg_attrdef d
       join pg_catalog.pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum and not a.attisdropped
      where d.adrelid = to_regclass(split_part(pin.k, '.', 1) || '.' || split_part(pin.k, '.', 2))
        and a.attname = split_part(pin.k, '.', 3)
        and pg_catalog.pg_get_expr(d.adbin, d.adrelid) = pin.def);
  if offending is not null then
    raise exception 'pinned column default(s) missing or not in their pinned text: %', offending;
  end if;
end \$\$;
`;

// 8. NO REWRITE RULE ON A TABLE IN app OR private (batch 126's review round; Q0 F5). A rule rewrites a
// write before any trigger or policy sees it, and its action runs as the table's owner: Q0 measured a
// later file's `create rule ... on insert to app.approval_requests ... do also update ... set status =
// 'approved', decided_by = new.created_by` let an editor approve their own request, and no probe read
// rules. The only rule a relation here may carry is a view's (or materialized view's) _RETURN.
export const REWRITE_RULE_PROBE_SQL = `do \$\$
declare
  offending text;
begin
  select string_agg(format('%s.%s.%s', n.nspname, c.relname, r.rulename), ', ' order by n.nspname, c.relname, r.rulename) into offending
    from pg_catalog.pg_rewrite r join pg_catalog.pg_class c on c.oid = r.ev_class
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('app', 'private')
     and not (r.rulename = '_RETURN' and c.relkind in ('v', 'm'));
  if offending is not null then
    raise exception 'rewrite rule(s) on a relation in app or private, which rewrite a write past its triggers and policies: %', offending;
  end if;
end \$\$;
`;

// 9. NOTHING CREATED IN pg_catalog, checked in EVERY probe job after its drift and before its probe
// (batch 126's review round; Q0 F3). The probes run with search_path pinned to pg_catalog, and a
// superuser drift that ADDS a better-matching overload there -- Q0's `create function
// pg_catalog.format(text, name, name)` raising a rule's own prefix and names -- had a silenced rule
// counted as refusing its drift, with every layer green. (Replacing a built-in does not work: the
// function manager dispatches a built-in OID to the compiled function, which is why plan §3's first
// description of this limit was wrong.) Every object a migration or a drift creates has an OID at or
// above 16384 (FirstNormalObjectId); the built-ins are below it. The decision is taken by EXISTS over
// OID comparisons that are exact matches to built-in operators, which no overload can displace; only
// the message's detail, written after the decision, calls anything a drift could shadow. It runs as
// its own probe too, so its rule has a drift on every migrate-clean, and probeJobScript places it in
// every job.
// EVERY SCHEMA initdb MADE BUT public, AND RELATIONS TOO (batch 128's review round; C0 F1, Q0 F1). The
// rules that read by schema name left pg_catalog and information_schema out, and the migration owner can
// write both: information_schema with nothing more (C0 X1b, X5; Q0 ISV, IST, ISF), pg_catalog with
// allow_system_table_mods (C0 X2b, a definer-rights view there). Clients hold USAGE on both through PUBLIC,
// and each of those passed every layer and read every tenant's ideas. So the guard reads every namespace
// whose own OID is below 16384 -- pg_catalog (11), pg_toast (99) and information_schema -- except public
// (2200), which the probes read as a user schema: no function or operator in one at or above 16384, and no
// relation at or above 16384 in one but pg_toast, where every user table's TOAST table lives. Still OID
// comparisons and nothing a drift could overload. Measured on the clean set at 128's review round: none
// of the three kinds, so nothing that passed is refused.
export const PG_CATALOG_GUARD_SQL = `do \$\$
declare
  offending text;
begin
  if exists (select 1 from pg_catalog.pg_proc p where p.pronamespace < 16384::pg_catalog.oid and p.pronamespace <> 2200::pg_catalog.oid and p.oid >= 16384::pg_catalog.oid)
     or exists (select 1 from pg_catalog.pg_operator o where o.oprnamespace < 16384::pg_catalog.oid and o.oprnamespace <> 2200::pg_catalog.oid and o.oid >= 16384::pg_catalog.oid)
     or exists (select 1 from pg_catalog.pg_cast k where k.oid >= 16384::pg_catalog.oid)
     or exists (select 1 from pg_catalog.pg_class c where c.relnamespace < 16384::pg_catalog.oid and c.relnamespace <> 2200::pg_catalog.oid and c.relnamespace <> 99::pg_catalog.oid and c.oid >= 16384::pg_catalog.oid) then
    select string_agg(x, ', ' order by x) into offending from (
      select 'function ' || p.proname::text || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' as x
        from pg_catalog.pg_proc p where p.pronamespace < 16384::pg_catalog.oid and p.pronamespace <> 2200::pg_catalog.oid and p.oid >= 16384::pg_catalog.oid
      union all
      select 'operator ' || o.oprname::text from pg_catalog.pg_operator o where o.oprnamespace < 16384::pg_catalog.oid and o.oprnamespace <> 2200::pg_catalog.oid and o.oid >= 16384::pg_catalog.oid
      union all
      select 'cast ' || k.oid::text from pg_catalog.pg_cast k where k.oid >= 16384::pg_catalog.oid
      union all
      select 'relation ' || c.relnamespace::pg_catalog.regnamespace::text || '.' || c.relname::text
        from pg_catalog.pg_class c where c.relnamespace < 16384::pg_catalog.oid and c.relnamespace <> 2200::pg_catalog.oid and c.relnamespace <> 99::pg_catalog.oid and c.oid >= 16384::pg_catalog.oid) f;
    raise exception 'object(s) created in pg_catalog or another schema initdb made (information_schema, pg_toast), where a call in a probe could resolve to them or a client reach them past every rule that reads by schema name: %', coalesce(offending, 'unnamed');
  end if;
end \$\$;
`;
// Each probe carries a DRIFT for EACH RULE it states, and the start of the raise that rule must answer
// it with. On every migrate-clean the probe runs once on the database as built, where it must pass,
// and once after each drift, where it must fail with that rule's own raise (P0001), each run in a
// transaction that is rolled back. So a rule that has been silenced, skipped or emptied fails the
// target, whatever its text says: Q0's test of the first version found eleven edits to the probes and
// their loop that passed every regex over this file (Q0 F2, the same class as its F1 on the
// post-migrate pass), and Q0's test of 123 found rules that ran live beside a drift that never reached
// them (F3), which is why a probe now has exactly as many drifts as raises.
//
// AND EACH DRIFT NAMES WHAT ITS REFUSAL MUST NAME (blocker 186 item 11; C0 F1 and Q0 F1 on batch 125).
// A refusal counted on its P0001 prefix alone could be the drift's own: Q0 silenced the coverage rule
// and gave it a drift that raised the rule's prefix itself, and the verdict read "refused its drift".
// Now `names` lists the objects the rule's raise must name -- the drift's own target, as the probe
// prints it -- and the executor's markers (probeJobScript) say the raise came after the drift, from the
// probe, in the transaction the job opened.
export const CATALOG_RULE_PROBES = [
  // The FK-support probe (batch 104) ran once before this list with no self-test and no digest pin, so
  // silenced it still printed its claim over a live unindexed key (C0's re-verification of 123, F6).
  { label: 'fk support probe', sql: FK_SUPPORT_PROBE_SQL,
    claim: `every foreign key in app and private has a supporting index, ${Object.keys(FK_SUPPORT_EXEMPTIONS).length} exempt by schema.table.constraint`,
    selfTests: [
      // Two inputs to one rule: a supporting index dropped, and an unindexed key on another table that
      // borrows an exempt key's NAME (blocker 186 item 18; Q0 FS4b on batch 125 passed every layer).
      { drift: 'drop index app.content_targets_social_scope_idx; create table app.probe_fk_namesake (workspace_id uuid, constraint billing_payments_invoice_mode_fk foreign key (workspace_id) references app.workspaces (id));',
        raises: 'foreign key(s) with no supporting index and no named exemption',
        names: ['app.content_targets.content_targets_social_scope_fk', 'app.probe_fk_namesake.billing_payments_invoice_mode_fk'] },
      { drift: 'alter table app.billing_invoices drop constraint billing_invoices_subscription_scope_fk;',
        raises: 'exempted foreign key(s) do not exist',
        names: ['app.billing_invoices.billing_invoices_subscription_scope_fk'] },
    ] },
  { label: 'fk action probe', sql: FK_ACTION_PROBE_SQL,
    claim: `every foreign key is NO ACTION on delete and update, not deferrable and validated, ${Object.keys(FK_ACTION_EXEMPTIONS).length} exempt by name`,
    selfTests: [
      { drift: 'alter table app.content_targets drop constraint content_targets_social_scope_fk; alter table app.content_targets add constraint content_targets_social_scope_fk foreign key (workspace_id, social_account_id) references app.social_accounts (workspace_id, id) on update cascade;',
        raises: 'foreign key(s) with an action, deferrable or NOT VALID',
        names: ['app.content_targets.content_targets_social_scope_fk (on delete a, on update c)'] },
      // The stale-exemption rule is written only when an exemption exists, and so is its drift.
      ...Object.keys(FK_ACTION_EXEMPTIONS).slice(0, 1).map((k) => ({
        drift: `alter table ${k.split('.').slice(0, 2).join('.')} drop constraint ${k.split('.')[2]};`,
        raises: 'exempted foreign key(s) do not exist', names: [k] })),
    ] },
  { label: 'updated_by insert closure probe', sql: UPDATED_BY_CLOSURE_PROBE_SQL,
    claim: `${UPDATED_BY_CLOSURES.length} updated_by INSERT closures in their exact text on their pinned tables`,
    selfTests: [{ drift: 'alter policy knowledge_items_updated_by_is_caller on app.knowledge_items with check (true);',
      raises: 'updated_by_is_caller closure(s) not in their pinned shape', names: ['knowledge_items.knowledge_items_updated_by_is_caller'] }] },
  { label: 'requester closure probe', sql: REQUESTER_CLOSURE_PROBE_SQL,
    claim: `${REQUESTER_CLOSURES.length} requester closures in their exact text on their pinned tables`,
    selfTests: [{ drift: 'alter policy publish_intents_requester_is_caller on app.publish_intents with check (true);',
      raises: 'requester_is_caller closure(s) not in their pinned shape', names: ['publish_intents.publish_intents_requester_is_caller'] }] },
  { label: 'updated_by update closure probe', sql: UPDATED_BY_ON_UPDATE_CLOSURE_PROBE_SQL,
    claim: `${UPDATED_BY_ON_UPDATE_CLOSURES.length} updated_by UPDATE closures in their exact text on their pinned tables`,
    selfTests: [{ drift: 'alter policy content_items_updated_by_on_update_is_caller on app.content_items with check (true);',
      raises: 'updated_by_on_update_is_caller closure(s) not in their pinned shape', names: ['content_items.content_items_updated_by_on_update_is_caller'] }] },
  { label: 'decider closure probe', sql: DECIDER_CLOSURE_PROBE_SQL,
    claim: `${DECIDER_CLOSURES.length} decided_by UPDATE closure in its exact text on its pinned table`,
    selfTests: [{ drift: 'alter policy approval_requests_decided_by_on_update_is_caller on app.approval_requests with check (true);',
      raises: 'decided_by_on_update_is_caller closure(s) not in their pinned shape', names: ['approval_requests.approval_requests_decided_by_on_update_is_caller'] }] },
  { label: 'closure coverage probe', sql: CLOSURE_COVERAGE_PROBE_SQL,
    claim: `every client-updatable *_by column is among the ${Object.values(ATTRIBUTION_UPDATE_CLOSURES).flat().length} with a pinned closure (${Object.keys(ATTRIBUTION_UPDATE_CLOSURES).join(', ')})`,
    selfTests: [{ drift: 'grant update (updated_by) on app.workspace_member_scopes to authenticated;',
      raises: 'client-updatable attribution column(s) with no pinned UPDATE closure', names: ['app.workspace_member_scopes.updated_by'] }] },
  // Batch 127 (blocker 186's created_by class; A1 F5 on 123, A1 F3 on 091).
  { label: 'created_by insert closure probe', sql: CREATED_BY_CLOSURE_PROBE_SQL,
    claim: `${CREATED_BY_CLOSURES.length} created_by INSERT closures in their exact text on their pinned tables`,
    selfTests: [{ drift: 'alter policy content_schedules_created_by_is_caller on app.content_schedules with check (true);',
      raises: 'created_by_is_caller closure(s) not in their pinned shape', names: ['content_schedules.content_schedules_created_by_is_caller'] }] },
  { label: 'insert closure coverage probe', sql: INSERT_CLOSURE_COVERAGE_PROBE_SQL,
    claim: `every client-insertable *_by column is among the ${Object.values(ATTRIBUTION_INSERT_CLOSURES).flat().length} with a pinned INSERT closure (${Object.keys(ATTRIBUTION_INSERT_CLOSURES).join(', ')})`,
    selfTests: [{ drift: 'grant insert (created_by) on app.content_versions to authenticated;',
      raises: 'client-insertable attribution column(s) with no pinned INSERT closure', names: ['app.content_versions.created_by'] }] },
  // Batch 127, item (3) of A0's message the Owner answered on 2026-10-03: a looser permissive sibling
  // under a new name, and a permissive policy widened in place, each fail by name. One rule, one drift
  // with both inputs (the fk support probe's shape).
  { label: 'permissive policy probe', sql: PERMISSIVE_POLICY_PROBE_SQL,
    claim: `the ${Object.keys(PERMISSIVE_POLICIES).length} permissive policies on the ${new Set(Object.keys(PERMISSIVE_POLICIES).map((k) => k.split('.')[0])).size} client-writable app tables, exactly, by name, command, roles and deparse`,
    selfTests: [{ drift: 'create policy content_ideas_insert_looser on app.content_ideas for insert to authenticated with check (true); alter policy content_items_select_active_member on app.content_items using (true);',
      raises: 'permissive policy set of a client-writable app table not exactly its pinned list',
      names: ['app.content_ideas.content_ideas_insert_looser', 'app.content_items.content_items_select_active_member'] }] },
  // Batch 127's review round: what reaches past every policy (C0 F1; A1 F1 and F2; Q0 F1). Each drift
  // leaves the rules before its own intact, since the first raise ends the block.
  { label: 'client privilege probe', sql: CLIENT_PRIVILEGE_PROBE_SQL,
    claim: `no client role (${CLIENT_ROLES.join(', ')}) holds TRUNCATE, TRIGGER, REFERENCES or MAINTAIN on any relation in any schema but the system ones, or made after initdb in any schema; any privilege on a view, materialized view or foreign table there (${Object.keys(CLIENT_VIEWS).length} pinned, each security_invoker); any privilege on a table outside app (${Object.keys(CLIENT_NON_APP_TABLES).length} pinned); or any default privilege`,
    selfTests: [
      // C0 X6: TRUNCATE skips row level security. And the other three, each on its own table: MAINTAIN since
      // batch 128 (Q0 N6 on 127's re-check: a probe that stopped reading MAINTAIN still passed this drift).
      // MAINTAIN is PostgreSQL 17's (CI's image and the local server); the rule reads it on 17 and later.
      // Since 128's review round each of the three drifts also puts an object in a TEMPORARY schema,
      // pg_temp_N: a pg_* name the rules once left out, read now because the object's OID is at or above
      // 16384 (C0 F1, Q0 F1). A drift cannot use information_schema or pg_catalog for this, which the guard
      // refuses first. Since batch 129 each also puts one in pg_toast (Q0 F2 on 128's re-check), by the
      // switch set under a computed name in the job's own transaction: an initdb schema, a pg_* name, and
      // only the object's OID reads it. TRIGGER there, not TRUNCATE: on a table in a system schema
      // PostgreSQL withholds INSERT, UPDATE, DELETE and TRUNCATE from a non-superuser whatever its ACL
      // says (measured at batch 129: has_table_privilege false after the grant), so rule 3 reads its SELECT.
      { drift: 'grant truncate on app.notifications to authenticated; grant references (id) on app.workspaces to anon; grant trigger on app.content_items to public; grant maintain on app.workspace_settings to authenticated; create temporary table probe_temp_r1 (id uuid); grant truncate on probe_temp_r1 to authenticated; do $d$ begin perform pg_catalog.set_config(\'allow_system_\' || \'table_mods\', \'on\', true); end $d$; create table pg_toast.probe_toast_r1 (id uuid); grant trigger on pg_toast.probe_toast_r1 to authenticated;',
        raises: 'client role(s) hold TRUNCATE, TRIGGER, REFERENCES or MAINTAIN',
        names: ['authenticated TRUNCATE on app.notifications', 'anon REFERENCES on app.workspaces', 'public TRIGGER on app.content_items', 'authenticated MAINTAIN on app.workspace_settings', '.probe_temp_r1',
          'authenticated TRIGGER on pg_toast.probe_toast_r1'] },
      // A1 R5b (invoker switched off by ALTER VIEW), Q0's plain view, and a materialized view in private; and
      // since batch 128 a definer-rights view in a NEW schema a client may use (A1 V11, C0 G1, Q0 F1-sf).
      { drift: 'create view app.probe_invoker_off_v with (security_invoker = true) as select id, workspace_id, created_by from app.content_ideas; alter view app.probe_invoker_off_v set (security_invoker = false); grant select, insert on app.probe_invoker_off_v to authenticated; create view public.probe_plain_v as select id from app.workspaces; grant select on public.probe_plain_v to anon; create materialized view private.probe_mv as select id from app.workspaces with no data; grant select on private.probe_mv to public; create schema probe_view_api; grant usage on schema probe_view_api to authenticated; create view probe_view_api.probe_ideas_v as select id, workspace_id, created_by from app.content_ideas; grant select, insert on probe_view_api.probe_ideas_v to authenticated; create temporary view probe_temp_v as select id, workspace_id, created_by from app.content_ideas; grant select on probe_temp_v to authenticated; do $d$ begin perform pg_catalog.set_config(\'allow_system_\' || \'table_mods\', \'on\', true); end $d$; create view pg_toast.probe_toast_v as select id, workspace_id, created_by from app.content_ideas; grant select on pg_toast.probe_toast_v to authenticated;',
        raises: 'view(s), materialized view(s) or foreign table(s) a client role can use',
        names: ['app.probe_invoker_off_v', 'private.probe_mv', 'public.probe_plain_v', 'probe_view_api.probe_ideas_v', '.probe_temp_v', 'pg_toast.probe_toast_v'] },
      // A1 R6: an allow-everything table in public; a grant on a private table; and since batch 128 a table
      // with no RLS in a new schema (A1 V13, C0 G2, Q0 R3s).
      { drift: 'create table public.probe_pub (id uuid primary key, workspace_id uuid, created_by uuid); alter table public.probe_pub enable row level security; create policy probe_pub_any on public.probe_pub for insert to authenticated with check (true); grant insert on public.probe_pub to authenticated; grant select on private.ai_credential_references to authenticated; create schema probe_table_api; create table probe_table_api.probe_notes (id uuid, workspace_id uuid); grant select, insert, update, delete on probe_table_api.probe_notes to authenticated; create temporary table probe_temp_notes (id uuid, workspace_id uuid); grant select, insert on probe_temp_notes to authenticated; do $d$ begin perform pg_catalog.set_config(\'allow_system_\' || \'table_mods\', \'on\', true); end $d$; create table pg_toast.probe_toast_notes (id uuid, workspace_id uuid); grant select, insert on pg_toast.probe_toast_notes to authenticated;',
        raises: 'table(s) outside schema app a client role can read or write',
        names: ['private.ai_credential_references', 'public.probe_pub', 'probe_table_api.probe_notes', '.probe_temp_notes', 'pg_toast.probe_toast_notes'] },
      // Batch 129 (A1 R1 on 128's re-check): a default privilege for a client, per schema and in every schema.
      { drift: 'alter default privileges for role app_worker in schema app grant select on tables to authenticated; alter default privileges for role app_worker grant execute on functions to anon; alter default privileges for role app_worker in schema private grant usage on sequences to public;',
        raises: 'default privilege(s) granting a client role',
        names: ['authenticated SELECT on tables in schema app (default for app_worker)', 'anon EXECUTE on functions in every schema (default for app_worker)', 'public USAGE on sequences in schema private (default for app_worker)'] },
    ] },
  // Batch 128 (A1 N1 and N5, C0 N1, Q0 N1 on 127's re-check): which schemas a client may use or create in.
  { label: 'client schema probe', sql: CLIENT_SCHEMA_PROBE_SQL,
    claim: `the USAGE and CREATE ${CLIENT_ROLES.join(', ')} hold on every schema, and the CREATE and TEMPORARY they hold on the database, are exactly the ${clientSchemaRows.length} pinned, none with grant option, and on every other database they hold no CREATE and no grant option`,
    // A new schema a client may use (the re-checks' first step), CREATE on app (A1 V16), a grant option,
    // and a pinned triple revoked: unlisted and missing are each named. Since 128's review round, CREATE on
    // information_schema (a system schema the first version did not read) and on the database (C0 X4). Since
    // batch 129, CREATE on another database, template1 (Q0 F3 on 128's re-check).
    selfTests: [{ drift: "create schema probe_client_api; grant usage on schema probe_client_api to authenticated; grant create on schema app to anon; grant usage on schema public to authenticated with grant option; revoke usage on schema app from authenticated; grant create on schema information_schema to authenticated; do $d$ begin execute pg_catalog.format('grant create on database %I to authenticated', pg_catalog.current_database()); end $d$; grant create on database template1 to authenticated;",
      raises: 'client schema or database privilege(s) not exactly the pinned list',
      names: ['unlisted: authenticated USAGE on schema probe_client_api', 'unlisted: anon CREATE on schema app', 'unlisted: authenticated USAGE WITH GRANT OPTION on schema public', 'missing: authenticated USAGE on schema app',
        'unlisted: authenticated CREATE on schema information_schema', 'unlisted: authenticated CREATE on database', 'unlisted: authenticated CREATE on database template1'] }] },
  // Batch 128 (Q0 N2, A1 N3 on 127's re-check): what a client role may become.
  { label: 'client membership probe', sql: CLIENT_MEMBERSHIP_PROBE_SQL,
    claim: `anon and authenticated are members, directly or through another role, of exactly the ${CLIENT_ROLE_MEMBERSHIPS.length} pinned role(s), each has ${CLIENT_ROLE_FALSE_ATTRIBUTES.join(', ')} false, and they and every role default exactly the ${CLIENT_ROLE_SETTINGS.length} pinned setting(s)`,
    // Q0 R0 and A1 V14d (superuser by SET ROLE), and a membership two roles deep, with no INHERIT. The
    // superuser is a role of the drift's own, not `postgres`: the driver redacts the connection's user
    // name from stderr, so a refusal naming `postgres` could not be tied to its object (measured).
    selfTests: [
      { drift: 'create role probe_member_super superuser nologin; grant probe_member_super to authenticated; create role probe_member_mid nologin; create role probe_member_top nologin; grant probe_member_top to probe_member_mid; grant probe_member_mid to anon with inherit false;',
      raises: 'client role(s) members of a role not pinned',
      names: ['authenticated -> probe_member_super', 'anon -> probe_member_mid', 'anon -> probe_member_top'] },
      // Batch 129 (A1 R2, C0 F3 and X6 on 128's re-check): bypassrls, and two more attributes on the other role.
      { drift: 'alter role authenticated bypassrls; alter role anon inherit createdb;',
        raises: 'client role attribute(s) not their pinned value',
        names: ['authenticated rolbypassrls = true', 'anon rolcreatedb = true', 'anon rolinherit = true'] },
      // Batch 129's review round (A1 R2): a client role's search_path, and a default for every role in one database.
      { drift: "alter role authenticated set search_path = public, app; alter role all in database template1 set work_mem = '64kB';",
        raises: 'client role setting default(s) not pinned',
        names: ['authenticated in every database: search_path=public, app', 'every role in database template1: work_mem=64kB'] },
    ] },
  // Batch 129 (C0 G1, Q0 F1 on 128's re-check): what initdb made, redefined or re-granted in place. One rule,
  // one drift with the three shapes the re-checks named: a view replaced, a function made SECURITY DEFINER,
  // and a grant on a pg_catalog function. Batch 129's review round adds three: an SQL-standard body replaced
  // by another with nothing else changed (A1 R1: prosqlbody was not read, and prosrc is empty for all 56
  // such functions initdb makes), and a function and a table renamed in place (C0 F2, Q0 F1: the name was
  // stored and never compared).
  { label: 'system object fingerprint probe', sql: SYSTEM_FINGERPRINT_PROBE_SQL,
    claim: 'every function, relation, schema and language initdb made (OID below 16384) is exactly as the fingerprint taken on this database before the migrations found it: name, body (prosrc and an SQL-standard body), security, settings, owner, ACL, view definition, columns, rules, triggers and policies',
    selfTests: [{ drift: "create or replace view information_schema.information_schema_catalog_name as select 'probe'::information_schema.sql_identifier as catalog_name; alter function information_schema._pg_char_max_length(oid, integer) security definer; grant execute on function pg_catalog.pg_ls_dir(text) to authenticated; create or replace function information_schema._pg_numeric_precision_radix(typid oid, typmod integer) returns integer language sql immutable parallel safe strict return 2; alter function pg_catalog.pg_read_file(text) rename to probe_renamed_read_file; alter table information_schema.sql_features rename to probe_renamed_sql_features;",
      raises: 'initdb object(s) not as the fingerprint taken before the migrations found them',
      names: ['relation information_schema.information_schema_catalog_name [changed]', 'function information_schema._pg_char_max_length(typid oid, typmod integer) [changed]', 'function pg_catalog.pg_ls_dir(text) [changed]',
        'function information_schema._pg_numeric_precision_radix(typid oid, typmod integer) [changed]',
        'function pg_catalog.pg_read_file(text) [renamed to pg_catalog.probe_renamed_read_file(text)]',
        'relation information_schema.sql_features [renamed to information_schema.probe_renamed_sql_features]'] }] },
  { label: 'pinned check probe', sql: PINNED_CHECK_PROBE_SQL,
    claim: `the ${Object.keys(PINNED_CHECKS).length} CHECK constraints the decider rule leans on, validated and in their pinned text, and the ${PINNED_NOT_NULL.length} NOT NULL column(s) they read`,
    selfTests: [
      { drift: 'alter table app.approval_requests drop constraint approval_requests_decision_has_a_decider;',
        raises: 'pinned CHECK constraint(s) missing, unvalidated or not in their pinned text', names: ['approval_requests.approval_requests_decision_has_a_decider'] },
      // Q0 T3 on batch 126.
      { drift: 'alter table app.approval_requests alter column created_at drop not null;',
        raises: 'pinned NOT NULL column(s) a pinned CHECK reads are nullable or missing', names: ['app.approval_requests.created_at'] },
    ] },
  { label: 'pinned policy probe', sql: PINNED_POLICY_PROBE_SQL,
    claim: `the ${Object.keys(PINNED_POLICIES).length} restrictive policies that bound which rows a client may update or see, in their pinned text`,
    selfTests: [{ drift: 'alter policy approval_requests_settled_is_immutable on app.approval_requests using (true);',
      raises: 'pinned restrictive policy(ies) missing or not in their pinned text', names: ['approval_requests.approval_requests_settled_is_immutable'] }] },
  { label: 'security definer probe', sql: SECURITY_DEFINER_PROBE_SQL,
    claim: `the ${SECURITY_DEFINER_FUNCTIONS.length} SECURITY DEFINER functions are exactly the pinned ones, each with its owner, body, an empty search_path and no EXECUTE for PUBLIC, and the SECURITY DEFINER extension members exactly the ${EXTENSION_DEFINER_FUNCTIONS.length} pinned`,
    selfTests: [
      { drift: 'alter function private.set_updated_at() reset search_path;',
        raises: 'SECURITY DEFINER function(s) not in their pinned shape', names: ['private.set_updated_at() [proconfig is not exactly search_path=""]'] },
      // No longer a definer, so the first rule does not see it and only the second can.
      { drift: 'alter function private.set_updated_at() security invoker;',
        raises: 'pinned SECURITY DEFINER function(s) missing or no longer SECURITY DEFINER', names: ['private.set_updated_at()'] },
      // Batch 128 (A1 V06b, N2 on 127's re-check): a definer function hidden in an extension. It passes the
      // first two rules (pinned, unchanged) and only the third can see it.
      { drift: "create function app.probe_ext_definer() returns integer language sql stable security definer set search_path = '' as $f$ select 1 $f$; alter extension pgcrypto add function app.probe_ext_definer();",
        raises: 'SECURITY DEFINER extension member(s) not pinned', names: ['app.probe_ext_definer() (extension pgcrypto)'] },
    ] },
  // Batch 127's review round (C0 F4).
  { label: 'policy helper probe', sql: POLICY_HELPER_PROBE_SQL,
    claim: `the ${POLICY_HELPER_FUNCTIONS.length} invoker helpers the policies call match their pinned owner, body and empty search_path, and every function a policy calls is one of them, a pinned SECURITY DEFINER function or ${POLICY_PLATFORM_FUNCTIONS.join(', ')}`,
    selfTests: [
      // C0 X1: the body replaced by `select true`, the deparse of every policy unchanged. And since batch 128
      // (C0 N4 on 127's re-check) the rule's other four conditions, one helper each: SECURITY DEFINER, its
      // search_path reset, its owner changed, and one renamed away (missing).
      { drift: "create or replace function app.member_scope_covers_business(workspace uuid, business uuid) returns boolean language sql stable security invoker set search_path = '' as $f$ select true $f$; alter function app.member_scope_admits_business(uuid, uuid) security definer; alter function app.member_scope_admits_page(uuid, uuid, uuid) reset search_path; alter function app.member_scope_covers_page(uuid, uuid, uuid) owner to app_worker; alter function app.member_scope_is_narrowed(uuid) rename to probe_was_narrowed;",
        raises: 'policy helper function(s) not in their pinned shape',
        names: ['app.member_scope_covers_business(workspace uuid, business uuid) [body differs from the pinned digest]',
          'app.member_scope_admits_business(workspace uuid, business uuid) [SECURITY DEFINER]',
          'app.member_scope_admits_page(workspace uuid, business uuid, page_context uuid) [proconfig is not exactly search_path=""]',
          'app.member_scope_covers_page(workspace uuid, business uuid, page_context uuid) [owner is not the pinned owner]',
          'app.member_scope_is_narrowed(workspace uuid) [missing]'] },
      { drift: "create function app.probe_helper(workspace uuid) returns boolean language sql stable as $f$ select true $f$; create policy probe_helper_narrowing on app.content_versions as restrictive for select to authenticated using (app.probe_helper(workspace_id));",
        raises: 'function(s) a policy calls that are not pinned by body',
        names: ['app.probe_helper(workspace uuid)'] },
    ] },
  { label: 'trigger probe', sql: TRIGGER_PROBE_SQL,
    claim: `every trigger outside the system schemas is enabled, internal ones included, no role or database defaults session_replication_role, the ${REFUSE_MUTATION_TRIGGERS.length} append-only triggers match their pinned definitions on two plain tables with no children, no parameter grant hands session_replication_role to a non-superuser, and the event triggers are exactly the ${PINNED_EVENT_TRIGGERS.length} pinned`,
    // Each drift leaves the rules before its own intact, since the first raise ends the block.
    selfTests: [
      { drift: 'alter table app.security_events disable trigger refuse_mutation;',
        raises: 'trigger(s) not enabled', names: ['app.security_events.refuse_mutation (tgenabled D)'] },
      { drift: 'drop trigger refuse_truncate on app.audit_logs;',
        raises: 'the private.refuse_mutation triggers are not exactly the four pinned definitions',
        names: ['missing: CREATE TRIGGER refuse_truncate BEFORE TRUNCATE ON app.audit_logs'] },
      { drift: "alter role authenticated set session_replication_role = 'replica';",
        raises: 'session_replication_role is set as a default for', names: ['authenticated/<every database>'] },
      { drift: 'create table app.probe_child_of_security_events () inherits (app.security_events);',
        raises: 'append-only table(s) partitioned, inherited from or inheriting', names: ['app.security_events'] },
      // Blocker 186 item 14 (A1 V3 on batch 125).
      { drift: 'grant set on parameter session_replication_role to authenticated;',
        raises: 'session_replication_role can be SET or ALTER SYSTEM-ed through a parameter grant', names: ['authenticated (SET)'] },
      // Batch 129's review round (A1 R3): an event trigger, on a function of the drift's own.
      { drift: 'create function pg_temp.probe_event_fn() returns event_trigger language plpgsql as $f$ begin null; end $f$; create event trigger probe_event_ddl on ddl_command_end execute function pg_temp.probe_event_fn(); create event trigger probe_event_drop on sql_drop execute function pg_temp.probe_event_fn();',
        raises: 'event trigger(s) not pinned', names: ['probe_event_ddl on ddl_command_end', 'probe_event_drop on sql_drop'] },
    ] },
  // Blocker 186 item 13 (Q0 F3, F8 on batch 125).
  { label: 'pinned trigger probe', sql: PINNED_TRIGGER_PROBE_SQL,
    claim: `the ${Object.values(PINNED_TABLE_TRIGGERS).flat().length} triggers on ${Object.keys(PINNED_TABLE_TRIGGERS).join(', ')} are exactly their pinned definitions, and the ${PINNED_TRIGGER_FUNCTIONS.length} functions they run match their pinned bodies, security and empty search_path`,
    selfTests: [
      // Q0's M7: a second BEFORE UPDATE trigger sorting after set_decided_at.
      { drift: 'create trigger set_decided_at_backfill before update on app.approval_requests for each row execute function private.set_updated_at();',
        raises: 'trigger(s) on a pinned table not exactly its pinned definitions',
        names: ['unpinned: CREATE TRIGGER set_decided_at_backfill BEFORE UPDATE ON app.approval_requests'] },
      // Q0's M6: the body rewritten in place. A function body is a DO-free drift that holds `begin` and
      // `end` inside its dollar quotes, which the statement-position rule admits (A1 V4).
      // And Q0 T5 on batch 126: its owner changed as well.
      { drift: "create or replace function private.set_decided_at() returns trigger language plpgsql security invoker set search_path = '' as $f$ begin return new; end $f$; alter function private.set_decided_at() owner to app_worker;",
        raises: 'trigger function(s) on a pinned table not in their pinned shape',
        names: ['private.set_decided_at() [body differs from the pinned digest] [owner is not the pinned owner]'] },
    ] },
  // Batch 126, from batch 091's third round (C0 H1, A1 R1 and R3); every table and every role since the
  // batch 170 draft, with the table-list rule first.
  { label: 'pinned grant probe', sql: PINNED_GRANT_PROBE_SQL,
    claim: `the ${Object.keys(PINNED_GRANTS).length} tables in app and private are exactly the pinned list, each owned by a superuser, and every non-superuser role's privileges on them are exactly the ${pinnedGrantRows('table').length} table-level and ${pinnedGrantRows('column').length} column-level grants pinned in ${PINNED_GRANTS_FILE}, none with grant option`,
    selfTests: [
      // The batch 170 draft: a table no entry names, in each schema, and a pinned one renamed away.
      { drift: 'create table app.probe_unpinned (id uuid); create table private.probe_unpinned_private (id uuid); alter table app.audit_logs rename to probe_audit_renamed;',
        raises: 'app or private table(s) not exactly the pinned grant table list',
        names: ['unpinned: app.probe_unpinned', 'unpinned: private.probe_unpinned_private', 'unpinned: app.probe_audit_renamed', 'pinned but absent: app.audit_logs'] },
      // A1's R1: a table-level privilege no item of 091's block names.
      // C0 F5 on batch 126: the owner the role set leaves out must be a superuser.
      { drift: 'create role probe_table_owner nologin; alter table app.calendar_items owner to probe_table_owner;',
        raises: 'pinned table(s) owned by a role that is not a superuser',
        names: ['app.calendar_items (owner probe_table_owner)'] },
      // A1's R1, and the grant option (C0 F3, A1 F3, Q0 F7 on batch 126). Since the batch 170 draft, a
      // privilege for a role no rule read (app_maintenance) on a table outside 091's two, and one revoked.
      { drift: 'grant truncate on app.content_schedules to authenticated with grant option; grant delete on app.audit_logs to app_maintenance; revoke select on app.ai_models from app_worker;',
        raises: 'table-level privilege(s) on a pinned table not exactly its allowlist',
        names: ['unlisted: authenticated TRUNCATE on app.content_schedules', 'unlisted: authenticated TRUNCATE WITH GRANT OPTION on app.content_schedules',
          'unlisted: app_maintenance DELETE on app.audit_logs', 'missing: app_worker SELECT on app.ai_models'] },
      // C0's d3 and d11: a placement born deleted, and a creation time the client chooses; and a column
      // for a service role, which a role list naming authenticated alone would miss (A1 R4). Since the
      // batch 170 draft, a column for a command role on a kernel table, and a worker's column revoked.
      { drift: 'grant insert (deleted_at) on app.calendar_items to authenticated; grant insert (created_at) on app.content_schedules to authenticated; grant select (id) on app.content_schedules to service_role; grant update (timezone) on app.calendar_items to authenticated with grant option; grant select (input_ref) on app.jobs to app_command; revoke update (lease_owner) on app.jobs from app_worker;',
        raises: 'column privilege(s) on a pinned table not exactly its allowlist',
        names: ['unlisted: authenticated INSERT (deleted_at) on app.calendar_items', 'unlisted: authenticated INSERT (created_at) on app.content_schedules',
          'unlisted: service_role SELECT (id) on app.content_schedules', 'unlisted: authenticated UPDATE WITH GRANT OPTION (timezone) on app.calendar_items',
          'unlisted: app_command SELECT (input_ref) on app.jobs', 'missing: app_worker UPDATE (lease_owner) on app.jobs'] },
    ] },
  // The batch 170 draft (RFC-2026-021 §8.2, §8.5): the read allowlist, both ways.
  { label: 'read allowlist probe', sql: READ_ALLOWLIST_PROBE_SQL,
    claim: `every relation a client role can SELECT from is one of the ${READ_ALLOWLIST.length} read allowlist entries (${READ_ALLOWLIST_FILE}) or the ${READ_ALLOWLIST_EXCEPTIONS.length} known exceptions (${READ_ALLOWLIST_EXCEPTIONS_FILE}), at its level, and every one of them matches a client grant`,
    selfTests: [
      // A column grant on a table no list names, for authenticated and for anon; a table-wide SELECT on an
      // excepted table (§8.4: a finding even over the same columns); and a view no entry names.
      { drift: 'grant select (id) on app.jobs to authenticated; grant select (user_id) on app.user_profiles to anon; grant select on app.workspaces to authenticated; create view app.probe_allow_v with (security_invoker = true) as select id from app.workspaces; grant select on app.probe_allow_v to authenticated;',
        raises: 'client SELECT grant(s) neither on the read allowlist nor in its known exceptions',
        names: ['authenticated SELECT (columns) on app.jobs', 'anon SELECT (columns) on app.user_profiles', 'authenticated SELECT (table) on app.workspaces', 'authenticated SELECT (view) on app.probe_allow_v'] },
      // An excepted grant revoked: the exception now names nothing, which is how a list becomes documentation.
      { drift: 'revoke select on app.notifications from authenticated;',
        raises: 'read allowlist or known-exception row(s) matching no client grant',
        names: ['authenticated SELECT (columns) on app.notifications'] },
    ] },
  // The batch 170 draft (plan (c); ERD §5, §9.1): classification, and no client reach into a refused class.
  { label: 'data classification probe', sql: DATA_CLASSIFICATION_PROBE_SQL,
    claim: `the ${Object.keys(DATA_CLASSIFICATION.tables).length} tables in app and private are exactly those ${DATA_CLASSIFICATION_FILE} classifies, and no client role holds any privilege on the ${REFUSED_CLASS_TABLES.length} tables or ${REFUSED_CLASS_COLUMNS.length} columns classed ${REFUSED_CLASSES.join(', ')}`,
    selfTests: [
      { drift: 'create table app.probe_unclassified (id uuid); alter table app.consumer_ledger rename to probe_ledger_renamed;',
        raises: 'app or private table(s) not exactly the classification registry',
        names: ['unclassified: app.probe_unclassified', 'unclassified: app.probe_ledger_renamed', 'classified but absent: app.consumer_ledger'] },
      // The plan's drift: SELECT on a refused table's column to authenticated; and INSERT for anon and a
      // PUBLIC grant on a SECRET-4 table (which every client inherits).
      { drift: 'grant select (input_ref) on app.jobs to authenticated; grant insert (id) on app.outbox_events to anon; grant select (id) on private.ai_credential_references to public;',
        raises: 'client privilege(s) on a table or column classed SECRET-4, PROVIDER-3 or INTERNAL-3',
        names: ['authenticated SELECT on app.jobs', 'anon INSERT on app.outbox_events', 'public SELECT on private.ai_credential_references', 'authenticated SELECT on private.ai_credential_references'] },
    ] },
  // Batch 126, from batch 091's third round (C0 H3).
  { label: 'pinned default probe', sql: PINNED_DEFAULT_PROBE_SQL,
    claim: `the ${Object.keys(PINNED_DEFAULTS).length} column default(s) a decision fixes (${Object.keys(PINNED_DEFAULTS).join(', ')}) in their pinned text`,
    selfTests: [{ drift: "alter table app.calendar_items alter column timezone set default 'UTC';",
      raises: 'pinned column default(s) missing or not in their pinned text', names: ['app.calendar_items.timezone'] }] },
  // Batch 126's review round (Q0 F5).
  { label: 'rewrite rule probe', sql: REWRITE_RULE_PROBE_SQL,
    claim: 'no relation in app or private carries a rewrite rule but a view\'s _RETURN',
    selfTests: [{ drift: 'create rule probe_self_approve as on delete to app.approval_requests do instead nothing;',
      raises: 'rewrite rule(s) on a relation in app or private', names: ['app.approval_requests.probe_self_approve'] }] },
  // Batch 126's review round (Q0 F3). Also run inside every job by probeJobScript.
  { label: 'pg_catalog guard probe', sql: PG_CATALOG_GUARD_SQL,
    claim: 'nothing in pg_catalog, information_schema or pg_toast was created after initdb (no function, operator, cast or relation but a TOAST table at or above OID 16384), checked here and in every probe job after its drift',
    // Since 128's review round the drift also puts a definer-rights view and a SECURITY DEFINER function in
    // information_schema (C0 X1b, X5; Q0 ISV, ISF), each named.
    selfTests: [{ drift: "create function pg_catalog.probe_overload(integer) returns integer language sql as 'select 1'; create view information_schema.probe_is_v as select id, workspace_id from app.content_ideas; create function information_schema.probe_is_f() returns bigint language sql security definer set search_path = '' as 'select count(*) from app.content_ideas';",
      raises: 'object(s) created in pg_catalog', names: ['function probe_overload(integer)', 'relation information_schema.probe_is_v', 'function probe_is_f()'] }] },
];

// A drift runs inside the executor's `begin; ... rollback;`, so a drift that ends that transaction
// makes itself permanent -- the role-default drift then persists cluster-wide -- and the run reported
// green (Q0's re-test of 123's corrections, F3; A1's, N5). Three defences, the first two checked BEFORE
// ANY JOB IS FED (blocker 186 item 12; C0 F4 on batch 125: the keyword rule ran in the verdict, after the
// drifts had run):
//   * no drift and no probe carries a psql meta-command, or a shape on which psql could lex it otherwise (psqlLex):
//     `\gexec`, `\c`, `\set` and `\i` each ended the transaction past the keyword rule (Q0 TG1, TG2;
//     A1 M2 committed a parameter grant with the verdict green);
//   * no drift has a TOP-LEVEL STATEMENT that begins with transaction control. Statement position, not
//     any word anywhere: the old rule refused every DO block and every function body through `end`
//     (A1 V4), so a drift could never replace a body;
//   * the job's markers carry the transaction id from before the drift and after it, and the verdict
//     requires them equal: a transaction that did not survive the drift is a failed job, whatever the
//     probe then said. And after every drift has run each probe runs AS BUILT AGAIN, which fails on any
//     residue a probe can read.
export const TRANSACTION_CONTROL = /^(begin|commit|rollback|end|abort|savepoint|release|start\s+transaction|prepare\s+transaction)\b/i;
export function driftHazards(sql) {
  const { metaCommands, statements } = psqlLex(sql);
  return [
    ...metaCommands.map((m) => `a psql meta-command at line ${m.line} (${m.text.slice(0, 20)})`),
    ...statements.filter((s) => TRANSACTION_CONTROL.test(s.head)).map((s) => `transaction control at line ${s.line} (${s.head.slice(0, 20)})`),
  ];
}
export function unsafeDrifts(probes) {
  const failures = [];
  for (const probe of probes) {
    for (const hazard of psqlLex(probe.sql).metaCommands) failures.push(`${probe.label}: its SQL carries a psql meta-command at line ${hazard.line}, which psql would execute`);
    for (const [i, { drift }] of (probe.selfTests ?? []).entries()) {
      for (const hazard of driftHazards(drift)) failures.push(`${probe.label}: drift ${i + 1} holds ${hazard}, so it could outlive the rollback that contains it`);
    }
  }
  return failures;
}
export function catalogProbeJobs(probes) {
  const jobs = [];
  for (const probe of probes) {
    jobs.push({ label: probe.label, kind: 'as built', sql: probe.sql });
    (probe.selfTests ?? []).forEach(({ drift, raises, names }, i) => {
      jobs.push({ label: probe.label, kind: `after drift ${i + 1}`, drift, sql: probe.sql, raises, names });
    });
  }
  for (const probe of probes) jobs.push({ label: probe.label, kind: 'as built, after every drift', sql: probe.sql });
  return jobs;
}
// What psql is fed for one job. The first marker is selected BEFORE the drift and carries the
// transaction id; the second is selected AFTER the drift and carries a nonce the drift cannot know
// (the executor draws one per job) and the transaction id again; then the search_path is pinned to
// pg_catalog so nothing the drift created in another schema can shadow a function the probe calls;
// then the pg_catalog guard (PG_CATALOG_GUARD_SQL), which refuses the job if the drift created anything
// in pg_catalog itself, where the pinned search_path would find it (Q0 F3 on batch 126); then the
// probe; and, only if the probe passes, a closing marker. A drift that raises the rule's prefix itself never
// reaches the second marker, and a drift that ends the transaction changes the id.
export const PROBE_TX_MARK = 'probe-tx:';
export function probeJobScript(job, nonce) {
  return ['begin;',
    `select '${PROBE_TX_MARK}' || pg_catalog.txid_current() as probe;`,
    ...(job.drift ? [job.drift] : []),
    `select '${nonce}:mark:' || pg_catalog.txid_current() as probe;`,
    'set local search_path = pg_catalog;',
    PG_CATALOG_GUARD_SQL.trimEnd(),
    job.sql,
    `select '${nonce}:end:' || pg_catalog.txid_current() as probe;`,
    'rollback;', ''].join('\n');
}
// What the transcript proves, read from stdout's marker lines. A line, not a substring: the probe
// prints nothing on stdout, and a drift that printed a marker of its own makes a count other than one.
export function probeMarkers(stdout, nonce) {
  const lines = String(stdout ?? '').split('\n');
  const values = (prefix) => lines.filter((l) => l.startsWith(prefix)).map((l) => l.slice(prefix.length));
  const opened = values(PROBE_TX_MARK);
  const marked = values(`${nonce}:mark:`);
  const ended = values(`${nonce}:end:`);
  const tx = opened.length === 1 && /^\d+$/.test(opened[0]) ? opened[0] : null;
  return {
    sameTransaction: tx !== null && marked.length === 1 && marked[0] === tx,
    ended: tx !== null && ended.length === 1 && ended[0] === tx,
    endedAtAll: ended.length > 0,
  };
}
export function decideCatalogProbes(probes, outcomes) {
  const failures = [];
  for (const probe of probes) {
    if (!probe.selfTests?.length) failures.push(`${probe.label}: carries no self-test drift; a probe that cannot be shown to fail asserts nothing`);
    for (const [i, { names }] of (probe.selfTests ?? []).entries()) {
      if (!Array.isArray(names) || names.length === 0 || names.some((n) => typeof n !== 'string' || n.length < 6)) {
        failures.push(`${probe.label}: drift ${i + 1} names nothing its refusal must name, so a refusal cannot be tied to its object`);
      }
    }
  }
  failures.push(...unsafeDrifts(probes));
  const expected = catalogProbeJobs(probes);
  if (outcomes.length !== expected.length) failures.push(`${expected.length} probe run(s) were due and ${outcomes.length} came back`);
  const refused = new Map();
  for (const job of expected) {
    const got = outcomes.find((o) => o.label === job.label && o.kind === job.kind && o.sql === job.sql && o.drift === job.drift);
    if (!got || !got.result) { failures.push(`${job.label}: not run ${job.kind}`); continue; }
    if (typeof got.nonce !== 'string' || !/^[0-9a-f-]{32,}$/.test(got.nonce)) {
      failures.push(`${job.label}: ${job.kind} ran with no nonce, so nothing ties its outcome to the probe`); continue;
    }
    const error = got.result.error;
    const markers = probeMarkers(got.result.stdout, got.nonce);
    if (!markers.sameTransaction) {
      failures.push(`${job.label}: ${job.kind}: the probe did not run after ${job.drift ? 'its drift ' : ''}in the transaction the job opened${error ? ` (${error.code ?? 'no code'}: ${error.message})` : ''} -- a drift that raised for itself, ended the transaction or printed a marker`);
      continue;
    }
    if (job.kind.startsWith('as built')) {
      if (error) failures.push(`${job.label}: ${job.kind}: ${error.message} (${error.code ?? 'no code'})`);
      else if (!markers.ended) failures.push(`${job.label}: ${job.kind}: the probe passed but the job's closing marker never printed`);
      continue;
    }
    // Counted ONLY inside an explicit match (C0 F1 on batch 125): P0001, the rule's own prefix, every
    // object the drift names, one ERROR line on stderr (a forged one would be a second), and no
    // closing marker (the probe raised; it did not pass).
    const message = String(error?.message ?? '');
    const errorLines = (String(got.result.stderr ?? '').match(/ERROR:/g) ?? []).length;
    const missing = (job.names ?? []).filter((n) => !message.includes(n));
    if (error && error.code === 'P0001' && message.startsWith(job.raises) && missing.length === 0 && errorLines === 1 && !markers.endedAtAll) {
      refused.set(job.label, (refused.get(job.label) ?? 0) + 1);
    } else {
      const why = !error ? 'passed'
        : error.code !== 'P0001' || !message.startsWith(job.raises) ? `failed with ${error.code ?? 'no code'}: ${message}`
          : missing.length ? `was refused without naming ${missing.join(', ')}`
            : errorLines !== 1 ? `left ${errorLines} ERROR line(s) on stderr where a refusal leaves one`
              : 'printed the closing marker as well as a refusal';
      failures.push(`${job.label}: its self-test ${job.kind} ${why} -- the probe must refuse it with P0001 beginning "${job.raises}" and naming ${(job.names ?? []).join(', ')}; a rule that cannot fail asserts nothing`);
    }
  }
  // Each claim counts the drifts that were REFUSED, and a probe whose refused count is not its declared
  // count fails, whatever else the verdict found (C0 F1 on batch 125).
  for (const p of probes) {
    const n = refused.get(p.label) ?? 0;
    if (n !== (p.selfTests ?? []).length) failures.push(`${p.label}: declares ${(p.selfTests ?? []).length} drift(s) and ${n} were refused`);
  }
  return { ok: failures.length === 0, failures, claims: probes.map((p) => {
    const n = refused.get(p.label) ?? 0;
    return `${p.label}: ${p.claim} (self-test: refused ${n === 1 ? 'its drift' : `each of its ${n} drifts`}; clean again after every drift)`;
  }) };
}

// THE POST-MIGRATE ASSERTION PASS. Most batches end with a `do $$` block asserting what they built
// (000-003 and 010 carry none), and until this pass each block ran ONCE, when its own file was applied. A later file could undo any of
// those guarantees and every layer stayed green: Q0's D01h on batch 121 dropped a CHECK in a later
// migration and survived all three. So migrate-clean re-runs every block against the database the
// whole set built. Measured on 2026-09-27 before this was written: of 42 blocks, 32 passed as written
// and 10 failed, each because a later batch legitimately changed what it asserted. Those ten are in
// the register with a final-state replacement; the register's own `_guards` says what keeps it honest.
// Two of the 32 -- 011#1 and 131#1 -- are idempotent `if not exists` guards that CREATE rather than
// assert, so re-running them (rolled back) cannot fail; what they create is asserted by 011#2 and
// 131#2 (C0's review of d70d2d6). They are counted among the blocks, not among the assertions.
export const INVARIANTS = 'db/foundation/invariants';
export const SUPERSEDED = `${INVARIANTS}/superseded.json`;

// A block is a line that is exactly `do $$` through the next line that is exactly `end $$;`, which is
// how every migration in this repository writes them. A block written any other way (`DO $body$`, an
// inline `do $$ begin ... end $$;`) would escape the pass silently, so it is refused rather than
// skipped: the count of anything that opens a do-block must equal the count extracted.
export function applyTimeBlocks(name, sql) {
  const lines = sql.split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^do \$\$\s*$/.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !/^end \$\$;\s*$/.test(lines[j])) j += 1;
    if (j === lines.length) throw new Error(`${name}: a do-block opened at line ${i + 1} never closes with a line that is exactly "end $$;"`);
    blocks.push({ id: `${name}#${blocks.length + 1}`, line: i + 1, sql: `${lines.slice(i, j + 1).join('\n')}\n` });
    i = j;
  }
  // Anything that opens a do-block, anywhere on a line: C0 and Q0 found the first version missed
  // `do language plpgsql $$`, a `do` with its `$$` on the next line, and a block opened mid-line.
  // Counted over the text with comments and string literals removed, so a message or a comment that
  // mentions `do $$` is not a block.
  // Literals are stripped line by line: a pattern allowed to cross a newline pairs an apostrophe in
  // one statement with one in another and swallows whole blocks (measured on 050).
  const code = sql.replace(/--[^\n]*/g, '').replace(/'(?:[^'\n]|'')*'/g, "''");
  const openers = (code.match(/\bdo\b(?:\s+language\s+\w+)?\s*\$|^\s*do\s*$/gim) ?? []).length;
  if (openers !== blocks.length) {
    throw new Error(`${name}: ${openers} line(s) open a do-block and ${blocks.length} are in the form the post-migrate pass extracts; write each as a line "do $$" ... a line "end $$;"`);
  }
  return blocks;
}

// What the pass will run, in order, with every register entry checked against the files before a
// database is touched. Static on purpose: a register naming a block, a later file or a replacement
// that does not exist is a lie about the repository, and a test can catch it without Postgres.
export async function postMigratePlan(register = undefined) {
  register ??= JSON.parse(await readFile(SUPERSEDED, 'utf8'));
  const files = await migrationFiles();
  const names = files.map((f) => f.name);
  const byBlock = new Map();
  for (const entry of register.entries) {
    if (byBlock.has(entry.block)) throw new Error(`${SUPERSEDED}: ${entry.block} is listed twice`);
    const [file] = entry.block.split('#');
    if (!entry.superseded_by?.length) throw new Error(`${SUPERSEDED}: ${entry.block} names no later file`);
    if (typeof entry.fails_with !== 'string' || entry.fails_with.length < 20) throw new Error(`${SUPERSEDED}: ${entry.block} does not record the raise it fails with (fails_with)`);
    for (const later of entry.superseded_by) {
      if (!names.includes(later)) throw new Error(`${SUPERSEDED}: ${entry.block} is superseded by ${later}, which is not a migration`);
      if (later <= file) throw new Error(`${SUPERSEDED}: ${entry.block} is superseded by ${later}, which does not sort after it`);
    }
    const replacementSql = await readFile(join(INVARIANTS, entry.replacement ?? ''), 'utf8').catch(() => {
      throw new Error(`${SUPERSEDED}: ${entry.block}'s replacement ${entry.replacement} is not a file in ${INVARIANTS}`);
    });
    // A replacement is fed to psql on stdin, where a line beginning with a backslash is a meta-command
    // psql EXECUTES (`\\!` runs a shell command) and anything after `end $$;` runs outside the block.
    // A1 measured both passing the first version's tests: a `commit;`, a DDL statement and a shell
    // command, the table it created persisting into the database schema-lint and rls-smoke then read.
    // So the file must be exactly one block in the house form, and nothing else, checked HERE, at
    // runtime, and not only by a test.
    const inFile = applyTimeBlocks(entry.replacement, replacementSql);
    if (inFile.length !== 1 || inFile[0].sql !== replacementSql) {
      throw new Error(`${SUPERSEDED}: ${entry.block}'s replacement ${entry.replacement} is not exactly one do-block and nothing else`);
    }
    // ANYWHERE psql would execute one, not only at the start of a line (blocker 186 item 12).
    const meta = psqlLex(replacementSql).metaCommands;
    if (meta.length) {
      throw new Error(`${SUPERSEDED}: ${entry.block}'s replacement ${entry.replacement} carries a backslash outside a literal, a body or a comment at line ${meta[0].line}, which psql would execute as a meta-command`);
    }
    byBlock.set(entry.block, { ...entry, replacementSql });
  }
  const plan = [];
  for (const { name, sql } of files) {
    for (const block of applyTimeBlocks(name, sql)) {
      const entry = byBlock.get(block.id);
      byBlock.delete(block.id);
      plan.push(entry ? { ...block, superseded: entry } : block);
    }
  }
  if (byBlock.size) throw new Error(`${SUPERSEDED}: no such block(s): ${[...byBlock.keys()].join(', ')}`);
  return plan;
}

// Every script the pass must run: each block as written, and each superseded block's replacement.
export function postMigrateJobs(plan) {
  const jobs = [];
  for (const block of plan) {
    jobs.push({ id: block.id, kind: 'verbatim', sql: block.sql });
    if (block.superseded) jobs.push({ id: block.id, kind: 'replacement', sql: block.superseded.replacementSql });
  }
  return jobs;
}

// What the outcomes MEAN, as a pure function. An outcome counts only if it ran exactly the script
// the plan names, so a block fed something else, or not run at all, fails rather than passes.
export function decidePostMigrate(plan, outcomes) {
  const failures = [];
  const expected = postMigrateJobs(plan);
  if (outcomes.length !== expected.length) failures.push(`${expected.length} script(s) were due and ${outcomes.length} outcome(s) came back`);
  const ran = (id, kind, sql) => outcomes.find((o) => o.id === id && o.kind === kind && o.sql === sql);
  let superseded = 0;
  for (const block of plan) {
    const verbatim = ran(block.id, 'verbatim', block.sql);
    if (!verbatim) { failures.push(`${block.id} was not run as written`); continue; }
    const error = verbatim.result?.error;
    if (!block.superseded) {
      if (error || !verbatim.result) {
        failures.push(`${block.id} (line ${block.line}) no longer holds on the migrated database: ${error?.message ?? 'no result'} (${error?.code ?? 'no code'})\n`
          + `    If a later migration changed this on purpose, list the block in ${SUPERSEDED} with a final-state replacement.`);
      }
      continue;
    }
    superseded += 1;
    // Its OWN raise, and the one the register recorded: a block that starts failing for another
    // reason has moved, and the entry describing why it fails is no longer true (C0 NOTE 6, Q0 F8).
    if (!error || error.code !== 'P0001' || !String(error.message).startsWith(block.superseded.fails_with)) {
      failures.push(`${block.id} is listed as superseded but ${error ? `fails with ${error.code ?? 'no code'}: ${error.message} -- the register expects P0001 beginning "${block.superseded.fails_with}"` : 'passes as written'}; the register entry is stale`);
    }
    const replaced = ran(block.id, 'replacement', block.superseded.replacementSql);
    if (!replaced) failures.push(`${block.id}'s replacement ${block.superseded.replacement} was not run`);
    else if (replaced.result?.error || !replaced.result) failures.push(`${block.id}'s replacement ${block.superseded.replacement} fails: ${replaced.result?.error?.message ?? 'no result'} (${replaced.result?.error?.code ?? 'no code'})`);
  }
  return {
    ok: failures.length === 0,
    failures,
    summary: `${plan.length} apply-time blocks, ${plan.length - superseded} re-run as written, ${superseded} superseded and replaced`,
  };
}

// EVERY SCRIPT migrate-clean FEEDS psql ON STDIN, scanned before the first is applied (blocker 186 item
// 12; Q0 F4 and A1 V4 on batch 125: `select 1; \\! touch <file>` appended to a migration ran a shell
// command at migrate-clean, past a static rule that read only lines BEGINNING with a backslash). A
// pure function over (name, sql) pairs, so a test can drive it without a database.
export function metaCommandFindings(sources) {
  return sources.flatMap(({ name, sql }) => psqlLex(sql).metaCommands
    .map((m) => `${name} line ${m.line}: a psql meta-command psql would execute, or a shape on which psql could read the text otherwise (${m.text.slice(0, 60)})`));
}

export async function migrateCleanSteps() {
  return [
    { name: PREREQUISITE, sql: await readFile(PREREQUISITE, 'utf8') },
    ...await migrationFiles(),
  ];
}

// STATIC: the lint rules §12.3 item 8 lists that can be decided from the migration text without
// connecting anywhere. The rules that need the live catalog are asserted by the live targets and
// are NOT silently claimed here: every FK has a supporting index is FK_SUPPORT_PROBE_SQL in
// migrate-clean (since batch 104; before it this sentence claimed a target that did not exist);
// every role's attributes is rls-smoke's.
export async function schemaLint(files) {
  const problems = [];
  const all = files ?? await migrationFiles();
  for (const { name, sql } of all) {
    const stripped = sql.replace(/--[^\n]*/g, '');
    // §3.1 forbids creating or altering an OBJECT in a Supabase-managed schema.
    //
    // The first version of this rule matched any `create|alter|drop` within 200 characters of
    // `auth.`, `storage.` or `realtime.`. That reads `create policy p on app.t using
    // ((select auth.uid()) = user_id)` as this file creating something in the `auth` schema —
    // and §8.5 MANDATES that exact call in every tenant policy, so the rule rejected the shape
    // the specification requires. A1 hit it on the first real migration and, correctly, did not
    // contort the SQL to dodge it.
    //
    // It was also formatting-dependent: only the policies whose `create` fell inside the
    // 200-character window matched, so four of ten were flagged and six identical ones were not.
    // A rule whose verdict depends on where a line wraps is not a rule.
    //
    // What §3.1 actually forbids is the managed schema being the TARGET of the DDL. A target
    // appears in exactly two places: straight after the object kind (`create table auth.x`,
    // `alter function auth.f`), or after `on` for the objects that attach to a table
    // (`create policy p on auth.users`, `create index i on storage.objects`). A schema-qualified
    // call inside a predicate is in neither position.
    //
    // Out of scope, deliberately: `grant`/`revoke` naming a managed schema. That alters
    // privileges, not an object, and widening this rule to cover it is a separate decision with
    // its own false-positive surface.
    const MANAGED = '(auth|storage|realtime)';
    const KIND = '(?:table|schema|view|materialized\\s+view|function|procedure|type|domain|sequence|extension|publication|subscription)';
    const ATTACHED = '(?:policy|index|trigger|rule)';
    const targets = [
      // create/alter/drop <kind> [if [not] exists] <managed>.<name>
      new RegExp(`\\b(?:create|alter|drop)\\s+(?:or\\s+replace\\s+)?${KIND}\\s+(?:if\\s+(?:not\\s+)?exists\\s+)?${MANAGED}\\.`, 'gi'),
      // create/alter/drop policy|index|trigger <name> on [only] <managed>.<table>
      new RegExp(`\\b(?:create|alter|drop)\\s+${ATTACHED}\\b[^;]{0,120}?\\bon\\s+(?:only\\s+)?${MANAGED}\\.`, 'gi'),
    ];
    for (const pattern of targets) {
      for (const m of stripped.matchAll(pattern)) {
        problems.push(`${name}: creates or alters an object in the Supabase-managed schema '${m[1]}' — §3.1 forbids it`);
      }
    }
    // §8.5: a SECURITY DEFINER function pins an empty search_path.
    for (const m of stripped.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)[\s\S]*?\$\$/gi)) {
      const body = m[0];
      if (/security\s+definer/i.test(body) && !/set\s+search_path\s*=\s*''/i.test(body)) {
        problems.push(`${name}: ${m[1]} is SECURITY DEFINER without an empty search_path — §8.5`);
      }
    }
    // §8.5: an exposed view is security invoker.
    for (const m of stripped.matchAll(/create\s+(?:or\s+replace\s+)?view\s+app\.(\w+)([\s\S]*?);/gi)) {
      if (!/security_invoker\s*=\s*(true|on)/i.test(m[2])) {
        problems.push(`${name}: view app.${m[1]} is not security_invoker — §8.5`);
      }
    }
    // BOTH SCHEMAS THIS REPOSITORY OWNS, not only the exposed one.
    //
    // A3 AI GATEWAY CORRECTION, batch 060. This loop matched `app.` alone, so every
    // rule it holds — owner comment (§3.1), ENABLE, FORCE, primary key — was a rule about a table's
    // SCHEMA PREFIX rather than about a table. Batch 060 is the first migration to create a table in
    // `private`, which §3.1 names as the home of "secret references", and under the old pattern a
    // SECRET-4 table would have been the one table in the schema exempt from all four checks.
    //
    // The rules apply unchanged: `private` is not exposed, but §12.3's lint list is not written about
    // exposure — a table with no primary key is unaddressable wherever it lives, and RFC-2026-016 §4
    // requires FORCE unconditionally. The inertness is asserted rather than assumed: this widening
    // changes no verdict for batches 000-040, because none of them creates a table outside `app`.
    for (const m of stripped.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(app|private)\.(\w+)/gi)) {
      const s = m[1].toLowerCase();
      const t = m[2];
      const has = (re) => new RegExp(re, 'i').test(stripped);
      if (!has(`comment\\s+on\\s+table\\s+${s}\\.${t}\\b`)) problems.push(`${name}: table ${s}.${t} has no owner comment — §3.1`);
      if (!has(`alter\\s+table\\s+${s}\\.${t}\\s+enable\\s+row\\s+level\\s+security`)) problems.push(`${name}: table ${s}.${t} does not ENABLE ROW LEVEL SECURITY`);
      // FORCE is a DIFFERENT catalog column from ENABLE, and the data package's own lint rule tests
      // only the first — so ENABLE-without-FORCE passes it clean while the table owner stays exempt.
      // RFC-2026-016 records that gap. It is closed here, in the batch every later one inherits.
      if (!has(`alter\\s+table\\s+${s}\\.${t}\\s+force\\s+row\\s+level\\s+security`)) problems.push(`${name}: table ${s}.${t} does not FORCE ROW LEVEL SECURITY — ENABLE alone leaves the table owner exempt`);
      if (!/primary\s+key/i.test(stripped.slice(m.index, m.index + 4000))) problems.push(`${name}: table ${s}.${t} declares no primary key`);
    }
  }
  problems.push(...identityExpressionLint(all));
  return problems;
}

// RFC-2026-020 §6.1/7, the half of it that is decidable from migration TEXT.
//
// §5/4 inlines the platform's identity expression because no role our migrations create can call
// `auth.uid()` — measured, and recorded in 011's own header. A copied expression drifts, so the
// copy is held to two properties a build can check without a database:
//
//   * it is written character for character as AUTHZ_IDENTITY_SQL, so the string the platform
//     comparison in `catalogLint` checks is the string the migration actually contains; and
//   * it appears EXACTLY TWICE, in one migration. Twice is not a tidy number picked afterwards:
//     `app.jwt_subject()` is the one named home the helpers call, and `app_authz`'s own policy has
//     to inline it because a function call there would re-enter the cycle the role exists to break.
//     A third occurrence is a third place to forget, and a first-and-only occurrence would mean one
//     of those two started calling something else.
export function identityExpressionLint(files) {
  const problems = [];
  const counts = new Map();
  for (const { name, sql } of files) {
    const stripped = sql.replace(/--[^\n]*/g, '');
    const occurrences = stripped.split(AUTHZ_IDENTITY_SQL).length - 1;
    if (occurrences > 0) counts.set(name, occurrences);
  }
  const authz = files.find((f) => f.name === AUTHZ_MIGRATION);
  if (!authz) return problems;
  for (const [name, occurrences] of counts) {
    if (name === AUTHZ_MIGRATION) continue;
    problems.push(`${name}: contains the pinned identity expression ${occurrences} time(s). It belongs to `
      + `${AUTHZ_MIGRATION} alone — every other reader goes through app.jwt_subject(), which is what makes `
      + 'one lint rule able to hold the copy to the platform.');
  }
  const here = counts.get(AUTHZ_MIGRATION) ?? 0;
  if (here !== 2) {
    problems.push(`${AUTHZ_MIGRATION}: the identity expression appears ${here} time(s) and must appear exactly `
      + "twice — app.jwt_subject()'s body and app_authz's own policy, which cannot call a function without "
      + 're-entering the recursion it exists to break. Expected, character for character: '
      + `${AUTHZ_IDENTITY_SQL}`);
  }
  return problems;
}


const SNAPSHOT = 'db/foundation/lint/catalog-snapshot.json';
const EXEMPTIONS = 'db/foundation/lint/rls-exemption-register.json';

// The text lint reads migration files. This reads what the database actually BECAME.
//
// They are not the same rule. `alter table ... force row level security` appearing in a file says
// somebody wrote it; `relforcerowsecurity` in the catalog says the database is in that state. A
// migration that failed halfway, a later one that undid it, or a hand-run statement in the
// dashboard all break the first without touching the second.
//
// The snapshot is committed evidence, and committed evidence goes stale — this repository has
// spent its whole history on exactly that failure. So the snapshot names the migration set it was
// taken against, and a mismatch FAILS. It cannot quietly describe a database that no longer exists.
export async function migrationSetDigest(files) {
  const each = (files ?? await migrationFiles()).map(({ sql }) =>
    createHash('sha256').update(sql).digest('hex'));
  return createHash('sha256').update(each.join('\n') + '\n').digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------------------------
// RFC-2026-020, as rules. §6.1 lists seven; this section carries all seven and nothing else.
// ---------------------------------------------------------------------------------------------
//
// WHERE EACH ONE IS ANSWERED, because the answer is not the same place for all seven and pretending
// it was would be the defect this file exists to remove.
//
//   1-6  are properties of a database that HAS batch 011. `authzLint` is exported so it can be run
//        against either catalog: the committed snapshot, when the provisioned instance has received
//        011, and the CI container, which receives it on every pull request. Today it is the second
//        — see `scripts/db/authz-proofs.mjs`, which measures the container and calls this.
//   7    is a property of the PLATFORM and of this repository's own text: the recorded body of
//        `auth.uid()` against the expression batch 011 inlines. It needs no batch-011 database and
//        runs on every `npm run check`, here and in `identityExpressionLint` above.
export const AUTHZ_ROLE = 'app_authz';
export const AUTHZ_MIGRATION = '011_authorization_helpers.sql';
export const AUTHZ_TABLE = 'workspace_members';
export const AUTHZ_POLICY = 'workspace_members_select_authz_own_active';

// The identity expression as WRITTEN in 011, character for character. `identityExpressionLint`
// holds the migration to it; rule 7 holds it to the platform.
export const AUTHZ_IDENTITY_SQL =
  "(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid";

// The same expression as POSTGRES DEPARSES IT, which is what `pg_get_expr(polqual, polrelid)`
// returns and what rule 5 pins.
//
// **This string is the control.** Any widening of app_authz's single policy — `using (true)`, a
// dropped `status = 'active'`, an added function call, a second column — changes it, and the build
// fails with a diff showing exactly what changed. That is why RFC-2026-020 §4 chose option G over
// option E: E needed no exemption at all but its central claim ("the projection equals the table")
// had no artefact that could hold it, and this one is a string comparison a build performs.
//
// Derived from PostgreSQL 17.6's own deparser rather than written by hand: measured read-only on
// the provisioned instance 2026-09-06 with `explain (verbose, costs off)` over the same expression
// (`ruleutils.c` prints both), and CI applies 011 to postgres:17 and compares the real
// `pg_get_expr` against it on every run.
export const AUTHZ_POLICY_QUAL =
  "((user_id = (((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text))::uuid)"
  + " AND (status = 'active'::text))";

// §6.1/6, exactly. Anything else app_authz holds is a widening nobody declared.
export const AUTHZ_SCHEMA_GRANTS = ['USAGE on schema app'];
export const AUTHZ_COLUMN_GRANTS = ['role', 'status', 'user_id', 'workspace_id'];

// The platform's own `auth.uid()`, measured read-only on `xtvtflkntpqfvflvdbwk` 2026-09-06 and
// normalised (whitespace collapsed, case folded). RFC-2026-020 §2.2 and the evidence file Q5 carry
// the verbatim `pg_get_functiondef`.
export const PLATFORM_AUTH_UID_BODY =
  "select coalesce( nullif(current_setting('request.jwt.claim.sub', true), ''), "
  + "(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub') )::uuid";

// The branch of it batch 011 copies. `auth.uid()` COALESCEs the legacy singular GUC FIRST; 011
// reads only the second, so where the two differ 011 DENIES. Narrower in the safe direction, and
// stated rather than glossed — rule 7 requires this substring to still be there.
export const PLATFORM_IDENTITY_BRANCH =
  "(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')";

const collapse = (text) => String(text).replace(/\s+/g, ' ').trim().toLowerCase();

// The roles the access matrix is written for. A policy naming one of these is §8.1 being
// implemented; a policy naming any OTHER role is an exemption in RFC-2026-016 §4's sense and owes
// the register a row. See `registerLint` below.
export const REQUEST_PATH_ROLES = ['anon', 'authenticated', 'service_role'];

// RFC-2026-020 §6.1/1-6, against a catalog that HAS batch 011.
//
// `catalog` is the snapshot's `catalog` object, or the same shape measured live. Every rule reads a
// named field and reports when the field is MISSING as well as when it is wrong: an unmeasured
// property must not read as a passing one, which is the rule this file already applies to
// `service_roles.superuser` and to `authenticator_memberships`.
export function authzLint(catalog) {
  const problems = [];
  const c = catalog ?? {};
  const authz = c.authz;
  if (authz === undefined || authz === null) {
    return [`the catalog records no ${AUTHZ_ROLE} block, so RFC-2026-020 §6.1/1-6 cannot be checked — `
      + 'and an unmeasured property must not read as a passing one'];
  }

  // 1. The role exists with every attribute false and no password.
  const role = authz.role ?? {};
  for (const [field, label] of [['canlogin', 'rolcanlogin'], ['bypassrls', 'rolbypassrls'],
    ['superuser', 'rolsuper'], ['inherit', 'rolinherit'], ['has_password', 'a password']]) {
    if (role[field] === undefined) problems.push(`${AUTHZ_ROLE} carries no ${field} field — ${label} is what RFC-2026-020 §6.1/1 asserts, and it cannot be asserted from a field nobody measured`);
    else if (role[field]) problems.push(`${AUTHZ_ROLE} holds ${label} — RFC-2026-020 §5/2 creates it NOLOGIN NOBYPASSRLS NOINHERIT with no password. `
      + (field === 'bypassrls' || field === 'superuser'
        ? 'A helper owner that bypasses row level security reads every membership row in the database and answers every authorization question yes, for reasons unrelated to the caller.'
        : 'A default is not a decision and neither is a drift.'));
  }

  // 2. `authenticator` is a member of it: no. RFC-2026-019 §5's negative, extended by one name.
  if (c.authenticator_memberships === undefined) {
    problems.push(`the snapshot does not record what authenticator is a member of, so ${AUTHZ_ROLE} cannot be `
      + 'excluded from that list');
  } else if (c.authenticator_memberships.includes(AUTHZ_ROLE)) {
    problems.push(`authenticator is a member of ${AUTHZ_ROLE} — RFC-2026-020 §5/2 grants it membership to nothing. `
      + 'A membership makes the helper owner assumable from a JWT claim, which is the whole boundary.');
  }

  // 3. No table in app is owned by it.
  if (authz.owns_tables === undefined) problems.push(`the catalog does not record which tables ${AUTHZ_ROLE} owns`);
  else if (authz.owns_tables.length > 0) {
    problems.push(`${AUTHZ_ROLE} owns app.${authz.owns_tables.join(', app.')} — RFC-2026-020 §5/2 says it owns no `
      + 'table, for the same reason app_command does not: a SECURITY DEFINER function owned by the table owner is '
      + 'not subject to the policies on that table.');
  }

  // 4. Every function it owns is SECURITY DEFINER with an empty search_path.
  if (authz.functions === undefined) problems.push(`the catalog does not record the functions ${AUTHZ_ROLE} owns`);
  else {
    if (authz.functions.length === 0) problems.push(`${AUTHZ_ROLE} owns no function at all — the role exists only as the owner of the helpers, so an empty set means batch 011 did not land`);
    for (const f of authz.functions) {
      if (!f.security_definer) {
        problems.push(`${f.function} is owned by ${AUTHZ_ROLE} and is not SECURITY DEFINER — that is RFC-2026-020 `
          + "option D arriving unremarked: an invoker-mode helper runs as the caller, whose policy set on "
          + 'app.workspace_members by then contains the policy that calls it.');
      }
      if (!(f.config ?? []).some((o) => /^search_path=""$/.test(o))) {
        problems.push(`${f.function} is owned by ${AUTHZ_ROLE} and does not pin an empty search_path (§8.5)`);
      }
    }
  }

  // 5. Exactly one policy, on app.workspace_members, FOR SELECT, and its qual is the pinned string.
  const policies = authz.policies;
  if (policies === undefined) problems.push(`the catalog does not record the policies ${AUTHZ_ROLE} holds`);
  else if (policies.length !== 1) {
    problems.push(`${AUTHZ_ROLE} holds ${policies.length} policies in schema app; RFC-2026-020 §5/3 gives it exactly one. `
      + 'The exemption is structural, not scopal — a second policy is a second decision and needs its own RFC.');
  } else {
    const [p] = policies;
    if (p.table !== AUTHZ_TABLE) problems.push(`${AUTHZ_ROLE}'s policy is on app.${p.table}, and §5/3 puts it on app.${AUTHZ_TABLE}`);
    if (p.policy !== AUTHZ_POLICY) problems.push(`${AUTHZ_ROLE}'s policy is named ${p.policy}, and batch 011 names it ${AUTHZ_POLICY}`);
    if (p.command !== 'select') problems.push(`${AUTHZ_ROLE}'s policy is FOR ${String(p.command).toUpperCase()}, and §5/3 gives it SELECT only`);
    if (p.qual !== AUTHZ_POLICY_QUAL) {
      problems.push(`${AUTHZ_ROLE}'s policy expression is not the pinned one. This string IS the control — any `
        + 'widening changes it, and RFC-2026-020 §4 chose this option over the alternatives precisely because the '
        + 'claim is a string a build can compare.\n'
        + `      pinned:   ${AUTHZ_POLICY_QUAL}\n`
        + `      measured: ${p.qual}`);
    }
  }

  // 6. Its grants are exactly USAGE on app and a column-scoped SELECT on app.workspace_members.
  const grants = authz.grants;
  if (grants === undefined) problems.push(`the catalog does not record ${AUTHZ_ROLE}'s grants`);
  else {
    const schemas = [...(grants.schemas ?? [])].sort();
    if (schemas.join('|') !== AUTHZ_SCHEMA_GRANTS.join('|')) {
      problems.push(`${AUTHZ_ROLE} holds schema grants [${schemas.join(', ')}] and §6.1/6 gives it exactly `
        + `[${AUTHZ_SCHEMA_GRANTS.join(', ')}]`);
    }
    const tables = [...(grants.tables ?? [])].sort();
    if (tables.length > 0) {
      problems.push(`${AUTHZ_ROLE} holds whole-table privilege(s) on ${tables.join(', ')}. §6.1/6 makes the SELECT `
        + 'COLUMN-scoped, so the role cannot read token_hash or anything else it was not given a reason to read.');
    }
    const columns = [...(grants.columns ?? [])].sort();
    const expected = [...AUTHZ_COLUMN_GRANTS].sort().map((column) => `app.${AUTHZ_TABLE}.${column}`);
    if (columns.join('|') !== expected.join('|')) {
      problems.push(`${AUTHZ_ROLE} holds column SELECT on [${columns.join(', ')}] and §6.1/6 gives it exactly `
        + `[${expected.join(', ')}]`);
    }
  }
  return problems;
}

// RFC-2026-020 §6.1/7. The cost of §5/4, made falsifiable.
//
// 011 inlines the platform's identity expression because no role our migrations create can call
// `auth.uid()` — measured, not assumed. The cost of a copy is that Supabase can change the original
// and nothing would notice. So the platform's body is recorded in the snapshot as measured, and
// this compares it against both the pinned body and the branch 011 actually copied. A Supabase
// change fails the build with a diff instead of diverging silently.
export function platformIdentityLint(catalog) {
  const problems = [];
  const recorded = (catalog ?? {}).platform_auth_uid;
  if (recorded === undefined || recorded === null) {
    return ['the snapshot records no platform auth.uid() definition, so RFC-2026-020 §6.1/7 cannot be checked — '
      + 'and the whole point of §5/4 is that the copy is held to the original by a build rather than by memory'];
  }
  const body = collapse(String(recorded.definition ?? '').replace(/^[\s\S]*?\$function\$/, '').replace(/\$function\$[\s\S]*$/, ''));
  if (body !== collapse(PLATFORM_AUTH_UID_BODY)) {
    problems.push('the platform\'s auth.uid() is not the function batch 011 copied a branch of.\n'
      + `      recorded on ${recorded.measured_at ?? 'an unrecorded date'}: ${body}\n`
      + `      expected:                  ${collapse(PLATFORM_AUTH_UID_BODY)}\n`
      + '      Batch 011 inlines this expression because no role our migrations create can call auth.uid() '
      + '(RFC-2026-020 §2.3, measured). If the platform moved, the inlined copy is now a different function '
      + 'from the one every other policy in the schema uses, and that divergence must be decided rather than absorbed.');
  }
  if (!collapse(PLATFORM_AUTH_UID_BODY).includes(collapse(PLATFORM_IDENTITY_BRANCH))) {
    problems.push('the branch batch 011 copies is no longer a substring of the platform body this rule pins. '
      + 'The two constants have drifted apart inside this file, which makes the comparison vacuous.');
  }
  if (collapse(AUTHZ_IDENTITY_SQL) !== `${collapse(PLATFORM_IDENTITY_BRANCH)}::uuid`) {
    problems.push(`the expression batch 011 inlines (${AUTHZ_IDENTITY_SQL}) is not the platform's own `
      + `request.jwt.claims branch cast to uuid (${PLATFORM_IDENTITY_BRANCH}::uuid). §5/4 permits a COPY of the `
      + 'platform expression and nothing else; anything wider is a second identity model nobody decided on.');
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------
// A0's OPEN BLOCKER, closed here: the exemption register could not carry the form RFC-2026-016 §4
// actually sanctions.
// ---------------------------------------------------------------------------------------------
//
// §4's own sentence is "A bypass is a policy on a named role, never a role attribute". Until this
// change the corroboration rule demanded `rolbypassrls` or `rolsuper` and nothing else — so the
// only exemption the register could corroborate was the ROLE ATTRIBUTE, which is the form §4 was
// REPLACING. A row for a policy-on-a-named-role failed the lint, and `app_authz` — whose entire
// exemption is one policy on one named role, and which must hold neither attribute — could not be
// registered at all. The sanctioned form had no home in the register built for it.
//
// It is widened here rather than in the change that landed RFC-2026-020, because widening a
// corroboration rule in the same commit as the decision that needs it wider is how a rule stops
// being a check.
//
// THE WIDENING IS NARROWER THAN THE ONE IT JOINS, AND THAT IS THE POINT. A role attribute holds
// for every table in the database at once, so naming a table in an attribute-corroborated row
// narrows nothing. A POLICY is attached to one relation, so for this form the row's `table` field
// is corroborable — and it is checked. A row claiming an exemption on app.X while the catalog
// shows the policy on app.Y describes a database that does not exist, and is refused.
export function roleScopedCorroboration(e, where, { bypassing, rolePolicies, pending }) {
  const problems = [];
  if (bypassing.has(e.role)) return problems;

  const forRole = (rolePolicies ?? []).filter((p) => p.role === e.role);
  if (forRole.length === 0) {
    const blocked = [...(pending ?? [])];
    problems.push(`${where}: ${e.role} is exempt from row level security nowhere in this catalog — it holds `
      + 'neither rolbypassrls nor rolsuper, and no policy in schema app names it. A row naming a role is '
      + 'corroborated against that role: by a role ATTRIBUTE, which is database-wide, or by a POLICY naming '
      + 'it, which is the form RFC-2026-016 §4 calls the sanctioned one. This row records an exemption the '
      + 'catalog does not show.'
      + (blocked.length > 0
        ? `\n      Note: ${blocked.join(', ')} ${blocked.length === 1 ? 'is' : 'are'} declared not applied to `
          + 'this instance, so a policy that batch creates cannot appear in this snapshot yet. Register the row '
          + 'when the batch reaches the instance and the snapshot is retaken — not before. A row is corroborated '
          + 'by a measurement or it is not corroborated.'
        : ''));
    return problems;
  }

  // The table field means something for this form, so it is checked.
  if (e.table && !forRole.some((p) => p.table === e.table)) {
    problems.push(`${where}: the policy corroborating ${e.role} is on app.${[...new Set(forRole.map((p) => p.table))].join(', app.')}, `
      + `and this row claims app.${e.table}. Unlike a role attribute — which is database-wide, so naming a table `
      + 'in such a row narrows nothing — a policy is attached to one relation, so for this form the table is '
      + 'corroborable and it does not corroborate. Register the exemption that was actually taken.');
  }
  return problems;
}

// The other direction, and the one that makes the register COMPLETE rather than merely consistent.
//
// RFC-2026-016 §4 requires the register be read in both directions, and completeness is the whole
// of what it proves about the roles that are NOT in it. So: every policy in schema `app` naming a
// role OUTSIDE the request path is an exemption in §4's sense, and owes the register a row.
//
// Request-path roles are excluded because a policy naming `anon`, `authenticated` or `service_role`
// is §8.1's access matrix being implemented, not an exemption. Demanding a row for each would fill
// the register with the access matrix and make it unreadable — and a register nobody reads is the
// unfalsifiable shape §4 retired "force where compatible" for being.
//
// Today, measured, this passes vacuously: all ten policies on the provisioned instance name
// `authenticated`. It is written now because it is what will FORCE `app_authz`'s row into the
// register the day batch 011 reaches that instance and the snapshot records its policy — rather
// than leaving that to whoever remembers. A vacuous rule that becomes load-bearing on a known
// future measurement is not the same as a rule nobody checks.
export function roleScopedCompleteness(rolePolicies, register) {
  const registered = new Set((register?.exemptions ?? []).map((e) => e.role));
  const problems = [];
  for (const role of [...new Set((rolePolicies ?? []).map((p) => p.role))].sort()) {
    if (registered.has(role)) continue;
    const tables = [...new Set((rolePolicies ?? []).filter((p) => p.role === role).map((p) => p.table))].sort();
    problems.push(`app.${tables.join(', app.')} carr${tables.length === 1 ? 'ies' : 'y'} a policy naming ${role}, `
      + 'which is not a request-path role and has no row in the exemption register. RFC-2026-016 §4 calls a policy '
      + 'on a named role the sanctioned form of a bypass, and §4 requires the register be read in BOTH directions: '
      + 'an exemption either has a row or it does not exist. Register it, with a reason, an owner and a review '
      + 'date, or drop the policy.');
  }
  return problems;
}

// A snapshot describes ONE database, and this repository's migration set can move ahead of it.
//
// Until batch 011 that could not happen honestly: every batch was applied to the provisioned
// instance before its snapshot was retaken, so `taken_against_migrations` and the digest of
// `db/foundation/migrations/*.sql` were the same number and a difference could only mean neglect.
// Batch 011 is the first migration this repository has written that is NOT applied to the instance
// — deliberately, because CI is its proof surface and applying an unmerged authorization boundary
// to a live database is not something a batch does to prove itself.
//
// So the gap is DECLARED rather than absorbed. `not_applied_to_this_instance.migrations` names, by
// filename, every batch the instance has not received; the expected digest is the digest of the set
// WITHOUT them. Nothing is weakened: a batch the instance HAS received still has to be in the
// digest, an undeclared change still fails exactly as before, and the declaration itself is checked
// below — it must name files that exist, and it must name a TAIL of the ordered set, because a
// database missing a middle batch while holding later ones is divergent rather than merely behind,
// and that is a different finding with a different fix.
export function pendingMigrations(snap) {
  return [...new Set((snap?.not_applied_to_this_instance?.migrations ?? []))];
}

export async function appliedMigrationDigest(snap, files) {
  const pending = new Set(pendingMigrations(snap));
  const all = files ?? await migrationFiles();
  return migrationSetDigest(all.filter(({ name }) => !pending.has(name)));
}

export async function pendingDeclarationLint(snap, files) {
  const problems = [];
  const declaration = snap?.not_applied_to_this_instance;
  if (declaration === undefined) return problems;
  if (!Array.isArray(declaration.migrations)) {
    return ['not_applied_to_this_instance has no migrations array. The gap between the repository and the '
      + 'instance is declared by NAME or it is not declared at all.'];
  }
  if (typeof declaration.why !== 'string' || declaration.why.trim().length < 40) {
    problems.push('not_applied_to_this_instance carries no stated reason. A snapshot that stops describing the '
      + 'whole migration set has to say why in a sentence someone can disagree with.');
  }
  const all = (files ?? await migrationFiles()).map(({ name }) => name);
  const declared = pendingMigrations(snap);
  for (const name of declared) {
    if (!all.includes(name)) {
      problems.push(`not_applied_to_this_instance names ${name}, which is not in db/foundation/migrations. `
        + 'A declaration that excludes a file nobody can find excludes nothing and hides everything.');
    }
  }
  const tail = all.slice(all.length - declared.length);
  if (declared.length > 0 && [...declared].sort().join('|') !== [...tail].sort().join('|')) {
    problems.push(`not_applied_to_this_instance names [${declared.join(', ')}], which is not the tail of the `
      + `migration set ([${tail.join(', ')}]). An instance missing a middle batch while holding later ones is `
      + 'DIVERGENT, not behind, and that is a different finding with a different fix. Declaring it here would '
      + 'let the digest go on matching while the database and the repository disagree about what is in it.');
  }
  return problems;
}

// Every table in schema `app` that a given set of migrations creates, read from the migration TEXT.
//
// It exists so `tenantTableLint` can ask the question the previous version of this file could not:
// not only "is every table in the snapshot's list correct" but "is the list the RIGHT LIST". Until
// batch 020 that distinction was invisible — the instance had every migration, so a table missing
// from `tenant_tables` was a measurement nobody took and looked exactly like a table that does not
// exist. With a batch declared not applied, the two are different states with different verdicts,
// and only a comparison against the migrations can tell them apart.
//
// The regex is the one `schemaLint` already uses on the same files, deliberately: two rules reading
// the same text with two different patterns is how one of them starts describing a different set of
// tables from the other.
export function tenantTablesInMigrations(files) {
  const tables = new Set();
  for (const { sql } of files ?? []) {
    const stripped = String(sql).replace(/--[^\n]*/g, '');
    for (const m of stripped.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?app\.(\w+)/gi)) {
      tables.add(m[1]);
    }
  }
  return [...tables].sort();
}

// The per-table rules AND the completeness of the list itself, in one function.
//
// They were two loops in `catalogLint` — one for RLS/FORCE/PK/comment, one for RFC-2026-017 §3's
// owner rule, several hundred lines apart — and neither asked whether the list they walked was the
// whole list. A snapshot that simply omitted a tenant table passed both of them clean, and every
// rule this repository writes about tenant tables is worth exactly as much as the guarantee that
// the list is complete.
//
// `expected` is the table set derived from the migrations THIS DATABASE HAS RECEIVED, which is why
// the caller must read the pending declaration first: a table batch 020 creates is correctly absent
// from a snapshot that declares 020 not applied, and is a finding in a snapshot that does not. It
// is required rather than optional — a caller that could omit it would silently turn the
// completeness half off, and an unmeasured property must not read as a passing one.
//
// WHERE THE SAME RULES ARE ASKED OF A DATABASE THIS SNAPSHOT DOES NOT DESCRIBE, stated plainly
// because the honest answer is "not here": the four tables batch 020 creates are not in this
// catalog and this function does not judge them. `schemaLint` holds them from the migration text
// (owner comment, ENABLE, FORCE, primary key) on every `npm run check`, and 020's own apply-time
// `do $$` block asserts ENABLE, FORCE and the owner rule against the live catalog of whatever
// database receives it — which in practice is the postgres:17 service container `make
// db-migrate-clean` builds on every pull request. The moment 020 reaches the provisioned instance
// and this snapshot is retaken, the completeness rule below REQUIRES its four rows here, and they
// are judged by the same code as the other five.
export function tenantTableLint(catalog, { expected, forceExempt } = {}) {
  const problems = [];
  const recorded = (catalog ?? {}).tenant_tables;
  if (recorded === undefined) {
    return ['the catalog records no tenant_tables at all, so nothing below can be checked — and an '
      + 'unmeasured property must not read as a passing one'];
  }
  const exempt = forceExempt ?? (() => false);

  for (const t of recorded) {
    // ENABLE is not exemptible and no row can make it so. RFC-2026-012 commits the whole
    // client/database boundary to row level security, and RFC-2026-016 §4 retired only the FORCE
    // condition; the register replaces that condition and nothing else.
    if (!t.rls_enabled) {
      problems.push(`app.${t.table}: relrowsecurity is false — the exemption register replaces the FORCE `
        + 'condition only (RFC-2026-016 §4), and no row excuses a tenant table carrying no row level security at all');
    }
    if (!t.rls_forced && !exempt(t.table)) {
      problems.push(`app.${t.table}: relforcerowsecurity is false and no table-wide exemption `
        + "(role '*', operation 'all') is registered — ENABLE alone leaves the table owner exempt");
    }
    if (!t.has_pk) problems.push(`app.${t.table}: no primary key`);
    if (!t.comment) problems.push(`app.${t.table}: no owner comment`);
    // RFC-2026-017 §3: app_command is deliberately NOT the table owner. FORCE makes the owner subject
    // to its own policies, but a SECURITY DEFINER function owned by app_command on a table app_command
    // owns is the shape §3 refuses for a different reason — the role that owns the function must be
    // one the policies can NAME: such a function "is subject to RLS and needs policies that name it,
    // which is the intended behaviour". (Batch 082 corrected this comment: it read "is exempt from the
    // policies on a forced table", which contradicts the FORCE line six lines above and 001's own
    // reason for creating the role NOBYPASSRLS.)
    if (t.owner === undefined) {
      problems.push(`app.${t.table}: no owner recorded — RFC-2026-017 §3 turns on which role owns it`);
    } else if (t.owner === 'app_command') {
      problems.push(`app.${t.table} is owned by app_command — RFC-2026-017 §3 requires it not be the table `
        + 'owner, because a SECURITY DEFINER function owned by the table owner is exempt from the policies '
        + 'on a forced table');
    }
  }

  if (expected === undefined) {
    problems.push('tenantTableLint was called without the table set the migrations create, so the '
      + 'completeness half — the half that decides whether this list is the RIGHT list — did not run. '
      + 'A caller that may omit it can turn the rule off by forgetting it.');
    return problems;
  }

  // Both directions, because either one alone is satisfiable while the other is wrong.
  const present = new Set(recorded.map((t) => t.table));
  for (const table of expected) {
    if (present.has(table)) continue;
    problems.push(`app.${table} is created by a migration this database has received and has no row in `
      + 'tenant_tables. Every rule above is a rule about the tables in that list, so a table missing from '
      + 'it is a table with no RLS rule, no primary key rule, no owner rule and nothing to notice that. '
      + 'If the batch that creates it has not reached this database, declare it in '
      + 'not_applied_to_this_instance by name; if it has, retake the snapshot.');
  }
  for (const table of present) {
    if (expected.includes(table)) continue;
    problems.push(`tenant_tables records app.${table} and no migration this database has received creates `
      + 'it. Either the snapshot is describing an object that was made outside the migration set — which is '
      + 'the divergence this file exists to catch — or a batch that creates it is wrongly declared not '
      + 'applied to this instance.');
  }
  return problems;
}

// RFC-2026-022 §5: which shape each §8 `S` cell takes is recorded in a file the lint reads in both
// directions, rather than argued in each migration's header where four batches would each argue it
// once. The file is created empty and stays checkable while empty, which is the point: "no cell has
// been classified" is a claim, and a rule that only wakes up once there is an entry cannot hold it.
//
// The decision is APPROVED AND NOT IN EFFECT — measured 2026-09-08, the only member of app_worker is
// postgres, which bypasses RLS — so a well-formed entry classifies a cell and authorises no policy.
// That is why this rule refuses a `shape` it does not know and does not ask whether a policy exists:
// the policy is owed to §7, not to this file.
export const SERVICE_POLICY_MAP = 'db/foundation/lint/service-policy-map.json';

// The set `servicePolicyMapLint` is checked AGAINST, and it did not exist while the map was empty:
// the rule took `tablesInMigrations` as an argument and the only caller was a test that passed
// `new Set()`, which is a set no entry can be in. That was fine for "no cell has been classified"
// and useless the moment one was, so batch 110 derives the real set here rather than letting the
// committed map be checked against nothing.
//
// It reads the same `create table` form `schemaLint` reads, on the same stripped text, deliberately:
// two rules reading the migration text differently is how one of them starts describing a schema
// that does not exist.
export async function tablesCreatedByMigrations(files) {
  const all = files ?? await migrationFiles();
  const tables = new Set();
  for (const { sql } of all) {
    const stripped = sql.replace(/--[^\n]*/g, '');
    for (const m of stripped.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(app|private)\.(\w+)/gi)) {
      tables.add(`${m[1].toLowerCase()}.${m[2]}`);
    }
  }
  return tables;
}

const SHAPES = ['carried', 'discovered'];
const CELL_OPERATIONS = ['select', 'insert', 'update', 'delete'];
// The CLOSED set of fields a classification row may carry, which is exactly what the file's own
// `_shape` declares. See the correction beside the check that reads it.
const CELL_FIELDS = ['cell', 'table', 'operation', 'shape', 'why', 'batch'];

export function servicePolicyMapLint(map, tablesInMigrations) {
  const problems = [];
  const cells = map?.cells;
  if (!Array.isArray(cells)) {
    return ['db/foundation/lint/service-policy-map.json has no `cells` array — RFC-2026-022 §5 makes this '
      + 'file the record of which shape each `S` cell takes, and a file that cannot be read is not one'];
  }
  const seen = new Set();
  for (const [index, c] of cells.entries()) {
    const where = `service-policy-map.cells[${index}]`;
    for (const field of ['cell', 'table', 'operation', 'shape', 'why', 'batch']) {
      if (!c?.[field]) problems.push(`${where}: no ${field} — RFC-2026-022 §5 requires the cell, the table, the operation, the shape, the reason and the batch that classified it`);
    }
    if (c?.shape && !SHAPES.includes(c.shape)) {
      problems.push(`${where}: shape ${JSON.stringify(c.shape)} is neither 'carried' nor 'discovered'. RFC-2026-022 §3's test has two outcomes, and a third would be a decision this file is not entitled to record`);
    }
    if (c?.operation && !CELL_OPERATIONS.includes(c.operation)) {
      problems.push(`${where}: operation ${JSON.stringify(c.operation)} is not one of ${CELL_OPERATIONS.join(', ')}`);
    }
    // A6 META CONNECTOR CORRECTION, batch 110. `table` was read as an unqualified name in `app`, and
    // the cell batch 110 classifies is on a table in `private`: §8.3's "Raw token/webhook SELECT" is
    // about the raw webhook inbox, which §3.1 puts in `private` BY NAME and §14's gate checklist
    // requires not be exposed. The rule could not express the entry it was written to receive, and a
    // rule that cannot state a true classification is not a narrower rule.
    //
    // The widening is one line of meaning: a qualified name is taken as written, an unqualified one
    // resolves to `app`, and the set is compared against qualified names. That changes NO VERDICT for
    // a cell in `app` — an entry written the way RFC-2026-022 §7.2's example writes it still resolves
    // to the same table — and it makes a `private` cell checkable instead of unstatable.
    const qualified = c?.table && (c.table.includes('.') ? c.table : `app.${c.table}`);
    if (qualified && tablesInMigrations && !tablesInMigrations.has(qualified)) {
      problems.push(`${where}: ${qualified} is created by no migration — a classification of a cell on a table that does not exist is a claim about nothing`);
    }
    // A4 ASSET CORRECTION, batch 100, found by a reversal probe. The rule required six fields and
    // said nothing about a SEVENTH. Adding `"role": "app_worker"` to a classification row passed
    // every check here and every test in the isolation suite — and that field is not decoration:
    // RFC-2026-022 §7.2's own proposed shape carries `role` and `broker_owner` and gives them
    // meaning ("`role: null` is only valid with a `broker_owner`, so a DISCOVERED row cannot quietly
    // acquire a service policy"), while THIS file's `_shape` declares neither. So a row could grow a
    // field that READS as an authorisation, in the one file §7.1/6 makes the answer to "which shape
    // does this cell take", and nothing would object.
    //
    // The narrowing is a closed set rather than an interpretation of the extra field: `_shape` is
    // the declaration, and a key outside it is a claim this file's own documentation does not
    // define. If a later batch needs `role` or `broker_owner` — which §7.2 expects once a broker
    // exists — it adds them to `_shape` in a diff a reviewer reads, which is the whole point.
    for (const field of Object.keys(c ?? {})) {
      if (!CELL_FIELDS.includes(field)) {
        problems.push(`${where}: \`${field}\` is not a field this register declares. db/foundation/lint/service-policy-map.json's own \`_shape\` names ${CELL_FIELDS.join(', ')} and nothing else; RFC-2026-022 §7.2 sketches \`role\` and \`broker_owner\` besides, and a row that acquires either without \`_shape\` acquiring it first would read as an authorisation the register is not entitled to record`);
      }
    }
    const key = `${qualified}.${c?.operation}`;
    if (c?.table && c?.operation) {
      if (seen.has(key)) problems.push(`${where}: ${key} is classified twice, and RFC-2026-022 §3's test has one answer per statement`);
      seen.add(key);
    }
  }
  return problems;
}

// A0/A6 METERING CORRECTION, batch 061. `servicePolicyMapLint` was written, exported, exercised by
// test-kits/db/foundation-contract.test.mjs — and INVOKED BY NO TARGET. RFC-2026-022 §7.1/6 asks for
// a rule that reads the map "in both directions", and the declared command contract read it in
// neither: `make db-schema-lint` composed `schemaLint` and `catalogLint` and nothing else, so a
// malformed entry, an entry naming a table no migration creates, or a `shape` outside §3's two
// outcomes would have shipped and only a unit test would have said so.
//
// That was harmless while the file was empty and stopped being harmless the moment a batch
// classified a cell. It is wired here rather than left, and the table set is READ from the
// migrations rather than kept by hand, because the rule's own strongest clause — "app.X is created
// by no migration, and a classification of a cell on a table that does not exist is a claim about
// nothing" — can only be asked of the truth.
export async function servicePolicyMapCheck(mapPath = SERVICE_POLICY_MAP, files) {
  let map;
  try {
    map = JSON.parse(await readFile(mapPath, 'utf8'));
  } catch (failure) {
    return [`${mapPath} could not be read as JSON: ${failure.message}. RFC-2026-022 §5 makes this file the `
      + 'record of which shape each `S` cell takes, and a file that cannot be read is not one.'];
  }
  // The set comes from `tablesCreatedByMigrations`, which is the same function the rule's own
  // tests use and the only place the shape of a table name is decided. This function once built
  // its own set with a regex for `create table app.(\w+)`, which produced UNQUALIFIED names --
  // correct while every classified cell was on an `app` table, and wrong the moment one was not.
  // A second definition of "the tables the migrations create" does not merely duplicate the
  // first: it drifts from it, and the drift shows up as the rule reporting that a table which
  // plainly exists does not.
  return servicePolicyMapLint(map, await tablesCreatedByMigrations(files));
}

export async function catalogLint(snapshot, digest, exemptions) {
  const problems = [];
  const snap = snapshot ?? JSON.parse(await readFile(SNAPSHOT, 'utf8'));
  const register = exemptions ?? JSON.parse(await readFile(EXEMPTIONS, 'utf8'));

  // The declaration is checked BEFORE it is used. A malformed one must not be allowed to shrink the
  // set the digest is taken over.
  const declarationProblems = await pendingDeclarationLint(snap);
  if (declarationProblems.length > 0) return declarationProblems;
  const pending = new Set(pendingMigrations(snap));
  const expected = digest ?? await appliedMigrationDigest(snap);

  if (snap.taken_against_migrations !== expected) {
    return [`the catalog snapshot was taken against migration set ${snap.taken_against_migrations}, `
      + `but the migrations now digest to ${expected}. Retake it — a snapshot describing a database `
      + 'that no longer exists is not evidence.'
      + (pending.size > 0 ? ` (${pending.size} batch(es) are declared not applied to this instance and are `
        + `excluded from that digest: ${[...pending].join(', ')}.)` : '')];
  }

  const c = snap.catalog ?? {};
  for (const name of ['app', 'private']) {
    if (!(c.our_schemas ?? []).includes(name)) problems.push(`schema ${name} is not in the live catalog`);
  }
  if (c.public_grants?.usage_on_private !== false) problems.push('PUBLIC holds USAGE on private — no client role may reach it');
  if (c.public_grants?.create_on_app !== false) problems.push('PUBLIC may CREATE in app');

  // The rule the specified lint misses, now asserted against the catalog column rather than text.
  //
  // An unforced table is a finding UNLESS the exemption register carries a row for it. That is
  // RFC-2026-016 §4's replacement for "force where compatible": the condition was retired for being
  // unfalsifiable, and a register is the falsifiable form — an exemption either has a row or it
  // does not exist.
  //
  // WHAT THIS CATALOG CAN AND CANNOT CORROBORATE. §4 names the register role × table × operation
  // and requires the lint to read it in BOTH directions. Reading a row in the second direction
  // means finding, in this snapshot, the state the row claims — so the granularity the lint can
  // ENFORCE is bounded by the granularity the snapshot RECORDS, and it records exactly two kinds of
  // exemption, neither of which has three dimensions:
  //
  //   * `relrowsecurity` / `relforcerowsecurity` are properties of a TABLE. Each is one value for
  //     the whole table, for every role and every operation at once; FORCE changes exactly one
  //     thing, whether the table OWNER is subject to the policies. So an unforced table corroborates
  //     one row and one only: role `*`, operation `all`.
  //   * `rolbypassrls` / `rolsuper` are properties of a ROLE. Each holds for every table in the
  //     database at once. So a row naming a role is corroborated against that role's own
  //     attributes, and naming a table in such a row narrows nothing — the bypass is not confined
  //     to the table the row names.
  //   * NOTHING here is per-operation. The snapshot counts a table's policies; no field says which
  //     command any policy is FOR. An `operation` other than `all` therefore asserts a state
  //     nothing in this file can show, which is exactly the unfalsifiable shape §4 retired "force
  //     where compatible" for being. It is refused rather than accepted on trust. Corroborating it
  //     would need a per-policy `cmd` measurement this snapshot does not carry.
  //
  // The previous version declared that granularity and enforced none of it: rows were matched to a
  // table by NAME alone, so `{role: 'app_worker', operation: 'select'}` bought the whole table a
  // blanket pass, and the same row suppressed `rls_enabled` as well as `rls_forced` — one register
  // row excusing a tenant table carrying no row level security at all. C0's review D2.
  //
  // The direction "a role bypass without a row cannot pass" is NOT carried by the register: a
  // service role holding BYPASSRLS or SUPERUSER is refused unconditionally below, and the platform
  // roles that hold it are pinned in KNOWN_BYPASS. A role-scoped row is therefore corroborative
  // only — it records and dates a bypass that exists, and is refused when the catalog stops showing
  // it — and it suppresses no table finding, because a table's FORCE state is not evidence about a
  // role.
  const TABLE_WIDE = (e) => e.role === '*' && e.operation === 'all';
  const forceExemptions = (table) => (register.exemptions ?? []).filter((e) => e.table === table && TABLE_WIDE(e));
  // The per-table rules, and the completeness of the list itself, are `tenantTableLint`. `expected`
  // is derived from the migrations this instance HAS received, which is why the pending declaration
  // has to be read first: a table batch 020 creates is correctly absent from a snapshot that
  // declares 020 pending, and would be a finding in a snapshot that does not.
  //
  // This is the only caller. `authzLint` has two — the snapshot and the CI container — because
  // batch 011's objects have a live catalog measurement (`scripts/db/authz-proofs.mjs`) to be asked
  // of; there is no equivalent tenant-table measurement of the container, and the rules for a batch
  // this instance has not received are asked instead by `schemaLint` over the migration text and by
  // that batch's own apply-time assertions. Saying so here rather than implying a second caller that
  // does not exist.
  problems.push(...tenantTableLint(c, {
    expected: tenantTablesInMigrations((await migrationFiles()).filter(({ name }) => !pending.has(name))),
    forceExempt: (table) => forceExemptions(table).length > 0,
  }));

  // And the other direction, which is what makes it a control rather than a list. A row here claims
  // an exemption was taken; if the catalog does not show it, the register is describing a database
  // that does not exist — and a register nobody can trust to be complete cannot be read as evidence
  // that the tables NOT in it are forced.
  const OPERATIONS = ['select', 'insert', 'update', 'delete', 'all'];
  const known = new Map((c.tenant_tables ?? []).map((t) => [t.table, t]));
  // Every role this snapshot shows exempt from row level security, from either attribute that
  // produces one. It is the only evidence a row naming a role can be read against.
  const bypassing = new Set([
    ...(c.roles_bypassing_rls ?? []),
    ...(c.roles_superuser ?? []),
    ...(c.service_roles ?? []).filter((r) => r.bypassrls || r.superuser).map((r) => r.role),
  ]);
  // The OTHER evidence a row naming a role can be read against, and the one RFC-2026-016 §4
  // actually sanctions: a policy in schema `app` whose `polroles` names that role. Measured from
  // `pg_policy`, one entry per (policy, table, role) pair, and restricted to roles OUTSIDE the
  // request path — a policy naming `anon`, `authenticated` or `service_role` is §8.1 being
  // implemented, not an exemption, and demanding a register row for each would fill the register
  // with the access matrix and make it unreadable.
  if (c.role_scoped_policies === undefined) {
    problems.push('the snapshot does not record which policies name which roles, so a policy-on-a-named-role — '
      + 'the form RFC-2026-016 §4 calls the sanctioned one — can be corroborated in neither direction, and an '
      + 'unmeasured property must not read as a passing one');
  }
  const rolePolicies = (c.role_scoped_policies ?? []).filter((p) => !REQUEST_PATH_ROLES.includes(p.role));
  for (const [index, e] of (register.exemptions ?? []).entries()) {
    const where = `rls-exemption-register.exemptions[${index}]`;
    for (const field of ['role', 'table', 'operation', 'reason', 'owner', 'review_date']) {
      if (!e[field]) problems.push(`${where}: no ${field} — RFC-2026-016 §4 requires role, table, operation, reason, owner and review date`);
    }
    if (e.operation && !OPERATIONS.includes(e.operation)) {
      problems.push(`${where}: operation ${JSON.stringify(e.operation)} is not one of ${OPERATIONS.join(', ')}`);
    } else if (e.operation && e.operation !== 'all') {
      problems.push(`${where}: operation ${JSON.stringify(e.operation)} is narrower than anything this catalog `
        + 'records. relforcerowsecurity is table-wide and rolbypassrls is role-wide, and no field in the snapshot '
        + 'says which command a policy is for, so a per-operation exemption can be corroborated in neither '
        + "direction. Register the exemption that was actually taken, with operation 'all'.");
    }
    const table = known.get(e.table);
    if (e.table && table === undefined) {
      problems.push(`${where}: app.${e.table} is not in the catalog — the exemption is for a table that does not exist`);
    } else if (table && e.role === '*') {
      // A table-wide row is a claim about the TABLE, and the table's own FORCE column answers it.
      if (table.rls_forced) {
        problems.push(`${where}: app.${e.table} is FORCED, so the exemption this row records was not taken. `
          + 'Remove the row: a register carrying exemptions nobody took cannot be read as complete, and completeness '
          + 'is the whole of what it proves about the tables that are NOT in it.');
      }
    } else if (table && e.role) {
      // A row naming a role is a claim about the ROLE, and only the role's own attributes answer
      // it. Nothing about app.<table> being forced or unforced is evidence either way, which is
      // why the previous version — which read the table's state for every row — could accept a
      // role-scoped row with no catalog evidence about that role at all.
      //
      // A0's OPEN BLOCKER, found by A1 while writing RFC-2026-020 and due with this batch. Until
      // now this branch demanded `rolbypassrls` or `rolsuper` and nothing else — so the only
      // exemption the register could corroborate was the ROLE ATTRIBUTE, which is precisely the
      // form RFC-2026-016 §4 RETIRED. §4's own sentence is "A bypass is a policy on a named role,
      // never a role attribute", and a row for such a policy FAILED here, because the rule
      // recognised only the shape it was replacing. `app_authz`, whose entire exemption is one
      // policy on one named role and which must hold neither attribute, could not be registered
      // at all.
      //
      // Widened below, and the widening is itself falsifiable in both directions — see
      // `roleScopedCorroboration` and the completeness pass after this loop. It was deliberately
      // NOT widened in the change that landed RFC-2026-020: widening a corroboration rule in the
      // same commit as the decision that needs it wider is how a rule stops being a check.
      problems.push(...roleScopedCorroboration(e, where, { bypassing, rolePolicies, pending }));
    }
    // An exemption past its review date is a finding rather than a grandfathered fact. Dates are
    // compared against the snapshot's own measurement date, not against now(): the register is
    // judged against the database state it is being read with. The limitation of that choice,
    // stated rather than hidden (C0 §6.1): `taken_at` only has to move when the migration digest
    // does, so against a still snapshot an exemption does not expire on its own. The comparison is
    // lexicographic and is correct only for zero-padded YYYY-MM-DD on both sides.
    if (e.review_date && snap.taken_at && String(e.review_date) < String(snap.taken_at)) {
      problems.push(`${where}: review date ${e.review_date} is before the snapshot was taken (${snap.taken_at}). `
        + 'An expired exemption is a finding, not a fact that ages into permanence.');
    }
  }
  problems.push(...roleScopedCompleteness(rolePolicies, register));

  // RFC-2026-020 §6.1/1-6, and the honest answer to "which database is this snapshot describing".
  //
  // The snapshot describes the PROVISIONED INSTANCE. Batch 011 is deliberately not applied there —
  // CI is this batch's proof surface, and applying an unmerged authorization boundary to a live
  // database to make a lint pass is the inversion this file exists to prevent. So the objects
  // RFC-2026-020 §6.1/1-6 are about do not exist on the instance, and NO FIELD IS INVENTED FOR
  // THEM: there is no `authz` block, and the gap is declared by name in
  // `not_applied_to_this_instance` instead.
  //
  // The absence is checked in BOTH directions, which is what stops it being a hole:
  //
  //   * while 011 is declared pending, an `authz` block MUST NOT be present — a block describing
  //     objects the declaration says are not there is a measurement of nothing; and
  //   * the moment 011 stops being declared pending, the block becomes REQUIRED, and rules 1-6 run
  //     against it.
  //
  // Until then rules 1-6 are answered where the objects actually exist: `scripts/db/authz-proofs.mjs`
  // measures the CI container after `db-migrate-clean` applies 011, and calls `authzLint` on that
  // live catalog. The rules are not skipped; they are asked of a database that can answer them.
  if (pending.has(AUTHZ_MIGRATION)) {
    if (c.authz !== undefined) {
      problems.push(`the snapshot carries an ${AUTHZ_ROLE} block while ${AUTHZ_MIGRATION} is declared not applied `
        + 'to this instance. One of the two is false. A block describing objects the declaration says do not '
        + 'exist is not a measurement — it is the invented field this whole file exists to refuse.');
    }
  } else {
    problems.push(...authzLint(c));
  }

  // §6.1/7 is a property of the PLATFORM, not of batch 011, so it is checked against this snapshot
  // whether or not 011 has been applied: `auth.uid()` exists on the instance either way, and the
  // inlined copy in 011 is held to it here.
  problems.push(...platformIdentityLint(c));
  // RFC-2026-019 §5, and the reason it is three rules rather than a sentence.
  //
  // The decision is a NEGATIVE -- authenticator is granted membership in none of the service roles --
  // and a negative is the strongest thing a lint can hold: nobody has to remember it, and a later
  // grant fails the build until an RFC changes the decision. RFC-2026-018 proposed the opposite and
  // would have made this rule impossible to write.
  const SERVICE_ROLES_NOT_FOR_THE_REQUEST_PATH = ['app_worker', 'app_command', 'app_maintenance'];
  if (c.authenticator_memberships === undefined) {
    problems.push('the snapshot does not record what authenticator is a member of, so RFC-2026-019 §4/1 '
      + 'cannot be checked — and an unmeasured property must not read as a passing one');
  } else {
    for (const role of c.authenticator_memberships.filter((r) => SERVICE_ROLES_NOT_FOR_THE_REQUEST_PATH.includes(r))) {
      problems.push(`authenticator is a member of ${role} — RFC-2026-019 §4/1 grants it membership in none of `
        + 'the service roles. The request path runs as authenticated and reaches app_command only as the owner '
        + 'of a SECURITY DEFINER function it invokes; a membership makes the role assumable by a JWT claim, '
        + 'which skips the function entirely.');
    }
  }

  // RFC-2026-017 §3's ownership rule moved into `tenantTableLint`, several hundred lines up, with
  // the rest of the per-table rules. It used to be a second loop over the same list here, which is
  // how the list came to be walked twice by two rules and checked for completeness by neither.
  //
  // The gap that move does NOT close, named rather than glossed: a table created by a batch this
  // instance has not received is still not owner-checked by this file, because this file reads a
  // snapshot of an instance that does not have it. Batch 020 closes that for its own four tables in
  // its own apply-time assertions, against whatever database receives it.

  for (const v of c.exposed_views ?? []) {
    if (!(v.reloptions ?? []).some((o) => /^security_invoker=(true|on)$/i.test(o))) {
      problems.push(`app.${v.view}: not security_invoker`);
    }
  }
  for (const f of c.security_definer_functions ?? []) {
    // Recorded so that the first function owned by app_command arrives in a diff rather than
    // unremarked. This rule does not forbid that owner — it is what RFC-2026-017 §3 expects of a
    // command function — it forbids not knowing.
    if (!f.owner) {
      problems.push(`${f.function}: SECURITY DEFINER with no owner recorded — the owner is what decides `
        + 'whether the function is subject to the policies on a forced table');
    }
    if (!(f.config ?? []).some((o) => /^search_path=""$/.test(o))) {
      problems.push(`${f.function}: SECURITY DEFINER without an empty search_path`);
    }
    // A SECURITY DEFINER function owned by a role that bypasses RLS is exempt from every policy
    // written for it, forced or not. Recorded, not yet failing: batch 000's helper is owned by
    // `postgres` because that is the only role the platform gives us today, and the role topology
    // that fixes it is A1's to create. Failing here would fail the repository for a defect it
    // cannot fix yet; naming it keeps it visible until it can.
    if ((c.roles_bypassing_rls ?? []).includes(f.owner)) {
      stderr.write(`  note: ${f.function} is owned by ${f.owner}, which bypasses RLS. `
        + 'It is exempt from every policy regardless of FORCE. Tracked for the role topology.\n');
    }
  }

  // The service roles RFC-2026-017 created. Every property here was a deliberate decision, so
  // every one is asserted rather than assumed to hold.
  //
  // `has_password` is read from `pg_authid` in the snapshot, NOT `pg_roles`: `pg_roles` replaces
  // rolpassword with the literal '********', so the obvious query reports a password on every role
  // including ones that have none. The first measurement taken here made exactly that mistake.
  // `app_authz` is deliberately NOT in this list, and RFC-2026-020 §6.1/1 asks that it join one
  // like it — so the reason is recorded rather than left as an omission a reviewer has to notice.
  //
  // This list is read against `c.service_roles`, which is a property of the SNAPSHOT, and the
  // snapshot describes the provisioned instance, which does not have batch 011 and must not. Adding
  // the name here would fail the build with "service role app_authz is missing from the catalog" —
  // a finding about a role that is correctly absent, which is the false-positive shape this file
  // exists to remove.
  //
  // The substance of §6.1/1 is not skipped: `authzLint` asserts the same five attributes for
  // `app_authz`, and more besides, and it runs wherever batch 011 actually is — against the CI
  // container today, and against this snapshot the moment `not_applied_to_this_instance` stops
  // naming 011, at which point the missing block is a refusal in its own right. `KNOWN_BYPASS`
  // below is unchanged, so a fourth bypassing role is still a finding either way.
  const SERVICE_ROLES = ['app_command', 'app_maintenance', 'app_worker'];
  const present = (c.service_roles ?? []).map((r) => r.role).sort();
  if (c.service_roles !== undefined) {
    for (const name of SERVICE_ROLES) {
      if (!present.includes(name)) problems.push(`service role ${name} is missing from the catalog — RFC-2026-017 created it`);
    }
    for (const r of c.service_roles ?? []) {
      // The one that matters. A service role that bypasses RLS is the exact defect this whole
      // decision exists to prevent, and it would look identical to a working one from the outside.
      if (r.bypassrls) problems.push(`${r.role} holds BYPASSRLS — RFC-2026-017 requires that RLS apply to it, and every policy written for it is inert while this is true`);
      // The other half of RFC-2026-016 §6, missing until A1's countersignature §5.2 pointed at it.
      // A SUPERUSER bypasses row level security whatever rolbypassrls says, so a service role that
      // acquired superuser would satisfy the check above and defeat the decision entirely. The
      // cheaper half was implemented and the half that cannot be worked around was not.
      if (r.superuser) problems.push(`${r.role} is a SUPERUSER — a superuser bypasses row level security whatever rolbypassrls says, so every policy written for this role is inert`);
      if (r.superuser === undefined) problems.push(`${r.role} carries no superuser field in the snapshot — the property RFC-2026-016 §6 requires cannot be checked, and an unmeasured property must not read as a passing one`);
      if (r.canlogin && !r.has_password) problems.push(`${r.role} can log in with no password`);
      if (r.can_use_private) problems.push(`${r.role} has USAGE on private, which no service role is granted`);
      // Two different switches, and batch 002 confused them. `assumable` is what lets a test or a
      // maintenance path deliberately become this role; `inherited` would hand its privileges to
      // the admin role ambiently, which is how a path ends up running with more than it declared.
      if (r.assumable_by_admin === false) problems.push(`${r.role} cannot be assumed by the administrative role — every service-path assertion fails at the assume-identity step, and with SQLSTATE 42501, the same code an RLS refusal raises`);
      if (r.inherited_by_admin === true) problems.push(`${r.role} is inherited ambiently by the administrative role; it must be taken by an explicit SET ROLE`);
    }
  }

  // The measurement that answers DATA-DEC-03's decisive question, kept as a standing assertion
  // rather than a one-off: these are the roles that bypass RLS on this platform today. A new one
  // appearing is a security event, not a detail.
  const KNOWN_BYPASS = ['postgres', 'service_role', 'supabase_admin', 'supabase_etl_admin', 'supabase_read_only_user'];
  const unexpected = (c.roles_bypassing_rls ?? []).filter((r) => !KNOWN_BYPASS.includes(r));
  // And the superuser set, pinned the same way and for the same reason: superuser is the wider
  // property. Measured 2026-09-06 — `supabase_admin` is the only rolsuper on the instance. A second
  // one appearing is a platform change with security consequences, not a detail.
  const KNOWN_SUPERUSERS = ['supabase_admin'];
  for (const role of (c.roles_superuser ?? []).filter((r) => !KNOWN_SUPERUSERS.includes(r))) {
    problems.push(`${role} is a SUPERUSER and was not when this was measured — a superuser bypasses row level security, so every policy in this database is advisory for it`);
  }
  for (const r of unexpected) problems.push(`role ${r} bypasses RLS and is not in the known platform set — every policy is inert for it`);

  return problems;
}

// STATIC: the command contract describes itself honestly — every target §12.5 names is reachable.
export async function contractCheck(makefileText) {
  const makefile = makefileText ?? await readFile('Makefile', 'utf8');
  return ORDER.concat('verify')
    .filter((t) => !new RegExp(`^db-${t}:`, 'm').test(makefile))
    .map((t) => `Makefile exposes no target db-${t}, which §12.5 requires`);
}

// STATIC: nothing is generated yet, so there is nothing to drift. Saying so is the honest answer;
// returning ok as though a comparison happened is not.
async function generatedDriftCheck() { return []; }

function refuseLive(target) {
  stderr.write(
    `db-${target} needs a Postgres test instance and none is configured.\n`
    + `  Set ${TEST_URL} to a TEST database. §12.5 forbids a production URL and requires a separate instance;\n`
    + '  db-reset-test additionally refuses any host or database not on an explicit test allowlist.\n'
    + '  This target has no no-database mode. It fails rather than report a pass it cannot earn.\n');
  return 1;
}

// The live half, wired. Each target does its job or fails saying why; none has a mode that
// reports a pass without a database, which is what `refuseLive` exists to enforce.
async function runLive(target) {
  const { script } = await import('./psql-driver.mjs');

  if (target === 'reset-test') {
    // §12.5: reset must refuse any host or database outside an explicit test allowlist. The
    // allowlist is deliberately narrow — a local container or the CI service — because this target
    // DROPS things, and the cost of a wrong match is someone's data.
    const url = env[TEST_URL] ?? '';
    const allowed = /@(localhost|127\.0\.0\.1|postgres)[:/]/.test(url);
    if (!allowed) {
      stderr.write('db-reset-test refuses this host: it is not localhost, 127.0.0.1 or the CI service container.\n'
        + '  This target drops and recreates. It does not run against a host it cannot recognise as a test instance.\n');
      return 1;
    }
    const out = await script('drop schema if exists app cascade;\ndrop schema if exists private cascade;');
    if (out.error) { stderr.write(`  ${out.error.message}\n`); return 1; }
    return 0;
  }

  if (target === 'migrate-clean') {
    // The prerequisite first, then every batch. It is applied here rather than assumed of the
    // caller for the reason the file itself gives: a prerequisite that lives in a workflow is a
    // prerequisite the command does not have.
    const steps = await migrateCleanSteps();
    const meta = metaCommandFindings([{ name: 'the system object fingerprint', sql: SYSTEM_FINGERPRINT_SNAPSHOT_SQL }, ...steps]);
    if (meta.length) { for (const m of meta) stderr.write(`  ${m}\n`); return 1; }
    // THE SYSTEM OBJECT FINGERPRINT (batch 129; C0 G1, Q0 F1 on 128's re-check), taken BEFORE the
    // prerequisite and the first migration, on the database as initdb and the shim left it, and sealed:
    // the seal read again after the last migration must be the same. The seal alone pins one query's answer,
    // not the relation it reads (C0 F1 on 129), so the verdict on the migrations as built is taken here, in
    // memory: the rows read before the first migration against the rows read after the last, with the
    // table's own identity read before and after as well. The probe compares with the table for its drifts.
    const { query, feed: readRows } = await import('./psql-driver.mjs');
    const taken = await script(SYSTEM_FINGERPRINT_SNAPSHOT_SQL);
    if (taken.error) { stderr.write(`  system object fingerprint: ${taken.error.message} (${taken.error.code ?? 'no code'})\n`); return 1; }
    const sealed = await query(SYSTEM_FINGERPRINT_SEAL_SQL);
    const seal = sealed.rows?.length === 1 ? sealed.rows[0].seal : null;
    if (!seal || !/^[1-9]\d*:[0-9a-f]{32}$/.test(seal)) { stderr.write(`  system object fingerprint: no sealed fingerprint (${sealed.error?.message ?? seal})\n`); return 1; }
    const relation = await query(SYSTEM_FINGERPRINT_RELATION_SQL);
    const identity = relation.rows?.length === 1 ? relation.rows[0].relation : null;
    if (!identity || !SYSTEM_FINGERPRINT_RELATION_SHAPE.test(identity)) { stderr.write(`  system object fingerprint: its table is not one plain table with no rule, trigger or row level security (${relation.error?.message ?? identity})\n`); return 1; }
    const before = await readRows(SYSTEM_FINGERPRINT_READ_SQL);
    const held = await readRows(SYSTEM_FINGERPRINT_TABLE_READ_SQL);
    if (before.error || held.error || !before.rows?.length) { stderr.write(`  system object fingerprint: not read (${(before.error ?? held.error)?.message ?? 'no rows'})\n`); return 1; }
    const unheld = diffSystemFingerprint(held.rows, before.rows);
    if (unheld.length) { stderr.write(`  system object fingerprint: its table does not hold what initdb made, before any migration ran (${unheld.length}, the first 40 named): ${unheld.slice(0, 40).join(', ')}\n`); return 1; }
    stdout.write(`  system object fingerprint: ${seal.split(':')[0]} objects initdb made, taken before the migrations and sealed\n`);
    for (const { name, sql } of steps) {
      const out = await script(sql);
      if (out.error) { stderr.write(`  ${name}: ${out.error.message} (${out.error.code ?? 'no code'})\n`); return 1; }
      stdout.write(`  applied ${name}\n`);
    }
    const resealed = await query(SYSTEM_FINGERPRINT_SEAL_SQL);
    if (resealed.rows?.length !== 1 || resealed.rows[0].seal !== seal) {
      stderr.write(`  system object fingerprint: its seal moved while the migrations ran (${resealed.error?.message ?? 'the table was rewritten'}), so it is no reference\n`);
      return 1;
    }
    const relationAfter = await query(SYSTEM_FINGERPRINT_RELATION_SQL);
    const identityAfter = relationAfter.rows?.length === 1 ? relationAfter.rows[0].relation : null;
    if (identityAfter !== identity) {
      stderr.write(`  system object fingerprint: its table was replaced while the migrations ran (${identity} before, ${relationAfter.error?.message ?? identityAfter ?? 'none'} after), so it is no reference\n`);
      return 1;
    }
    const after = await readRows(SYSTEM_FINGERPRINT_READ_SQL);
    if (after.error || !after.rows?.length) { stderr.write(`  system object fingerprint: not read after the migrations (${after.error?.message ?? 'no rows'})\n`); return 1; }
    const moved = diffSystemFingerprint(before.rows, after.rows);
    if (moved.length) {
      stderr.write(`  system object fingerprint, compared in memory: initdb object(s) not as the fingerprint taken before the migrations found them (${moved.length}, the first 40 named): ${moved.slice(0, 40).join(', ')}\n`);
      return 1;
    }
    stdout.write(`  system object fingerprint: the ${after.rows.length} objects initdb made, read again after the last migration and compared in memory, are as they were\n`);
    // THE CEILING PROBE. Every migration used to be capped at ~128 KiB by the driver handing it to
    // psql as one argv string; the driver now feeds a script on stdin. That is a claim about the
    // driver, so the target proves it on every run rather than in a comment: a script larger than
    // the old ceiling is applied, and it does nothing to the database.
    const probe = await script(CEILING_PROBE_SQL);
    if (probe.error) { stderr.write(`  ceiling probe: ${probe.error.message} (${probe.error.code ?? 'no code'})\n`); return 1; }
    stdout.write(`  ceiling probe: a ${Buffer.byteLength(CEILING_PROBE_SQL)}-byte script applied through stdin\n`);
    // THE FOREIGN-KEY SUPPORT PROBE (batch 104) is the first of the catalog-rule probes below, so it
    // is self-tested like the rest (C0's re-verification of 123, F6).
    // THE CATALOG-RULE PROBES: each as built and after its own drift, rolled back; the verdict is pure.
    const { feed, feedTranscript } = await import('./psql-driver.mjs');
    const rerun = (sql) => feed(`begin;\n${sql}\nrollback;\n`);
    // Refused BEFORE ANY JOB IS FED, not after the drifts have run (C0 F4 on batch 125).
    const unsafe = unsafeDrifts(CATALOG_RULE_PROBES);
    if (unsafe.length) { for (const u of unsafe) stderr.write(`  ${u}\n`); return 1; }
    const probeOutcomes = [];
    for (const job of catalogProbeJobs(CATALOG_RULE_PROBES)) { const nonce = randomUUID(); probeOutcomes.push({ ...job, nonce, result: await feedTranscript(probeJobScript(job, nonce)) }); }
    const probeVerdict = decideCatalogProbes(CATALOG_RULE_PROBES, probeOutcomes);
    for (const failure of probeVerdict.failures) stderr.write(`  ${failure}\n`);
    if (!probeVerdict.ok) return 1;
    for (const claim of probeVerdict.claims) stdout.write(`  ${claim}\n`);
    // THE POST-MIGRATE ASSERTION PASS, after everything else: each block in its own transaction,
    // ROLLED BACK, so the pass changes nothing -- two blocks carry idempotent DDL guards and two
    // fire probe rows inside a subtransaction, and none of that may outlive the check.
    let plan;
    try { plan = await postMigratePlan(); } catch (error) { stderr.write(`  post-migrate pass: ${error.message}\n`); return 1; }
    // The executor is dumb on purpose: it runs every job and records what came back, and
    // decidePostMigrate -- pure, exported, driven by synthetic outcomes in the tests -- says what
    // that means. Q0's review of d70d2d6 skipped superseded blocks, fed `select 1` for the rest,
    // never ran a replacement and returned early, and each survived tests that read this file as text.
    const outcomes = [];
    for (const job of postMigrateJobs(plan)) outcomes.push({ ...job, result: await rerun(job.sql) });
    const verdict = decidePostMigrate(plan, outcomes);
    for (const failure of verdict.failures) stderr.write(`  post-migrate pass: ${failure}\n`);
    if (!verdict.ok) return 1;
    stdout.write(`  post-migrate pass: ${verdict.summary}\n`);
    return 0;
  }

  if (target === 'migrate-upgrade') {
    // An upgrade path needs a previous-release fixture to upgrade FROM, and none is declared yet.
    // Saying so is the honest outcome; re-running migrate-clean and calling it an upgrade would be
    // a target reporting a check it did not perform.
    stderr.write('db-migrate-upgrade has no previous-release fixture to upgrade from.\n'
      + '  §12.5 asks for FIXTURE=previous-release; none is declared, so there is nothing to verify.\n'
      + '  This is a missing fixture, not a passing upgrade.\n');
    return 1;
  }

  if (target === 'seed-replay') {
    // Idempotence is the claim: applying twice leaves the same counts. Nothing seeds yet beyond
    // the identity fixture, which is a test fixture rather than a global seed, so there is no
    // global seed runner to replay.
    stderr.write('db-seed-replay has no global seed to replay. §12.3 item 4 is not implemented, and an empty replay is not a passing one.\n');
    return 1;
  }

  if (target === 'rls-smoke' || target === 'test-foundation') {
    // rls-smoke goes through the adapter that binds A1's cases to psql. test-foundation runs the
    // module suites under tests/, which are the static half and need no database — they are here
    // because §12.5 names the target, and running them twice is cheaper than a target that lies.
    const entry = target === 'rls-smoke'
      ? ['scripts/db/rls-smoke.mjs']
      : ['--test', 'tests/**/*.test.mjs'];
    const { code } = await new Promise((done) => {
      const child = spawn(process.execPath, entry, {
        stdio: 'inherit',
        env: { ...env, LC_ALL: 'C', TZ: 'UTC' },
      });
      child.on('close', (code) => done({ code }));
    });
    return code === 0 ? 0 : 1;
  }

  return 1;
}

async function runTarget(target) {
  const startedAt = hrtime.bigint();
  if (LIVE.has(target)) {
    if (!env[TEST_URL]) { const code = refuseLive(target); summarise(target, startedAt, false, 'no test database configured'); return code; }
    let code;
    try {
      code = await runLive(target);
    } catch (failure) {
      // A missing psql, or anything else that stopped the target from doing its job, is a failure
      // reported as itself. It is never folded into the database's own vocabulary.
      stderr.write(`db-${target}: ${failure.message}\n`);
      code = 1;
    }
    summarise(target, startedAt, code === 0, code === 0 ? '' : 'see above');
    return code;
  }
  if (!STATIC.has(target)) { stderr.write(`unknown target '${target}'\n`); return 2; }
  const problems = target === 'schema-lint'
    ? [...await schemaLint(), ...await catalogLint(), ...await servicePolicyMapCheck()]
    : target === 'contract-check' ? await contractCheck()
    : await generatedDriftCheck();
  for (const p of problems) stderr.write(`  ${p}\n`);
  summarise(target, startedAt, problems.length === 0, problems.length ? `${problems.length} problem(s)` : '');
  return problems.length === 0 ? 0 : 1;
}

async function verify() {
  const failed = [];
  for (const target of ORDER) if (await runTarget(target) !== 0) failed.push(target);
  if (failed.length === 0) { stdout.write('db-verify: ok — every target passed\n'); return 0; }
  stdout.write(`\ndb-verify: FAILED — ${failed.length} of ${ORDER.length} target(s): ${failed.join(', ')}\n`);
  if (!env[TEST_URL]) stdout.write(`  ${[...LIVE].filter((t) => failed.includes(t)).length} of them need ${TEST_URL}, which is unset.\n`);
  return 1;
}

if (import.meta.url === `file://${argv[1]}`) {
  const target = argv[2];
  if (!target) { stderr.write('usage: node scripts/db/run.mjs <target>\n'); exit(2); }
  exit(target === 'verify' ? await verify() : await runTarget(target));
}
