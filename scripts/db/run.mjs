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
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
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
// holds the two lists equal.
export const FK_SUPPORT_EXEMPTIONS = {
  assets_current_version_scope_fk: 'assets_current_version_idx (workspace_id, business_profile_id, current_version_id) WHERE current_version_id IS NOT NULL finds every row a version delete checks; id is the asset\'s own key and adds nothing',
  billing_invoices_subscription_scope_fk: 'billing_invoices_subscription_idx (billing_subscription_id): the subscription id is unique across workspaces, so the single column is the lookup',
  billing_payments_invoice_mode_fk: 'billing_payments_invoice_idx leads with billing_invoice_id, unique across workspaces and modes',
  billing_payments_invoice_scope_fk: 'billing_payments_invoice_idx leads with billing_invoice_id, unique across workspaces and modes',
};
export const FK_SUPPORT_PROBE_SQL = `do \$\$
declare
  offending text;
  exempt constant text[] := array[${Object.keys(FK_SUPPORT_EXEMPTIONS).map((k) => `'${k}'`).join(', ')}];
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
    raise exception 'foreign key(s) with no supporting index and no named exemption: %', offending;
  end if;
  -- Every exemption names a key that exists; a stale exemption is a lie about the catalog. Asked
  -- here and not in 104's own block because three of the four are 130's and 131's keys, which sort
  -- after 104.
  select string_agg(e, ', ' order by e) into offending from unnest(exempt) e
   where not exists (select 1 from pg_catalog.pg_constraint c where c.conname = e and c.contype = 'f');
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

// 2c. The CHECK constraints the attribution closures lean on, by EXACT definition text: 090's
// equivalence and 123's pair together are what make a cancelled, pending or expired request name no
// decider. Q0's test of 123 dropped or weakened either in a later file (E20, E20b, G06b+E08) and every
// layer stayed green, because only the batches' own apply-time blocks read them.
export const PINNED_CHECKS = {
  'approval_requests.approval_requests_decision_has_a_decider': "CHECK (((status = ANY (ARRAY['approved'::text, 'changes_requested'::text])) = ((decided_at IS NOT NULL) AND (decided_by IS NOT NULL))))",
  'approval_requests.approval_requests_decider_is_a_pair': 'CHECK (((decided_at IS NULL) = (decided_by IS NULL)))',
};
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
     where p.prosecdef and n.nspname not in ('pg_catalog', 'information_schema')
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
  if (select array_agg(pg_catalog.pg_get_triggerdef(t.oid) order by pg_catalog.pg_get_triggerdef(t.oid))
        from pg_catalog.pg_trigger t
        join pg_catalog.pg_proc p on p.oid = t.tgfoid join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
       where not t.tgisinternal and pn.nspname = 'private' and p.proname = 'refuse_mutation')
     is distinct from array[${[...REFUSE_MUTATION_TRIGGERS].sort().map((d) => `'${d}'`).join(', ')}] then
    raise exception 'the private.refuse_mutation triggers are not exactly the four pinned definitions on audit_logs and security_events';
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
export const CATALOG_RULE_PROBES = [
  // The FK-support probe (batch 104) ran once before this list with no self-test and no digest pin, so
  // silenced it still printed its claim over a live unindexed key (C0's re-verification of 123, F6).
  { label: 'fk support probe', sql: FK_SUPPORT_PROBE_SQL,
    claim: `every foreign key in app and private has a supporting index, ${Object.keys(FK_SUPPORT_EXEMPTIONS).length} exempt by name`,
    selfTests: [
      { drift: 'drop index app.content_targets_social_scope_idx;',
        raises: 'foreign key(s) with no supporting index and no named exemption' },
      { drift: 'alter table app.billing_invoices drop constraint billing_invoices_subscription_scope_fk;',
        raises: 'exempted foreign key(s) do not exist' },
    ] },
  { label: 'fk action probe', sql: FK_ACTION_PROBE_SQL,
    claim: `every foreign key is NO ACTION on delete and update, not deferrable and validated, ${Object.keys(FK_ACTION_EXEMPTIONS).length} exempt by name`,
    selfTests: [
      { drift: 'alter table app.content_targets drop constraint content_targets_social_scope_fk; alter table app.content_targets add constraint content_targets_social_scope_fk foreign key (workspace_id, social_account_id) references app.social_accounts (workspace_id, id) on update cascade;',
        raises: 'foreign key(s) with an action, deferrable or NOT VALID' },
      // The stale-exemption rule is written only when an exemption exists, and so is its drift.
      ...Object.keys(FK_ACTION_EXEMPTIONS).slice(0, 1).map((k) => ({
        drift: `alter table ${k.split('.').slice(0, 2).join('.')} drop constraint ${k.split('.')[2]};`,
        raises: 'exempted foreign key(s) do not exist' })),
    ] },
  { label: 'updated_by insert closure probe', sql: UPDATED_BY_CLOSURE_PROBE_SQL,
    claim: `${UPDATED_BY_CLOSURES.length} updated_by INSERT closures in their exact text on their pinned tables`,
    selfTests: [{ drift: 'alter policy knowledge_items_updated_by_is_caller on app.knowledge_items with check (true);',
      raises: 'updated_by_is_caller closure(s) not in their pinned shape' }] },
  { label: 'requester closure probe', sql: REQUESTER_CLOSURE_PROBE_SQL,
    claim: `${REQUESTER_CLOSURES.length} requester closures in their exact text on their pinned tables`,
    selfTests: [{ drift: 'alter policy publish_intents_requester_is_caller on app.publish_intents with check (true);',
      raises: 'requester_is_caller closure(s) not in their pinned shape' }] },
  { label: 'updated_by update closure probe', sql: UPDATED_BY_ON_UPDATE_CLOSURE_PROBE_SQL,
    claim: `${UPDATED_BY_ON_UPDATE_CLOSURES.length} updated_by UPDATE closures in their exact text on their pinned tables`,
    selfTests: [{ drift: 'alter policy content_items_updated_by_on_update_is_caller on app.content_items with check (true);',
      raises: 'updated_by_on_update_is_caller closure(s) not in their pinned shape' }] },
  { label: 'decider closure probe', sql: DECIDER_CLOSURE_PROBE_SQL,
    claim: `${DECIDER_CLOSURES.length} decided_by UPDATE closure in its exact text on its pinned table`,
    selfTests: [{ drift: 'alter policy approval_requests_decided_by_on_update_is_caller on app.approval_requests with check (true);',
      raises: 'decided_by_on_update_is_caller closure(s) not in their pinned shape' }] },
  { label: 'closure coverage probe', sql: CLOSURE_COVERAGE_PROBE_SQL,
    claim: `every client-updatable *_by column is among the ${Object.values(ATTRIBUTION_UPDATE_CLOSURES).flat().length} with a pinned closure (${Object.keys(ATTRIBUTION_UPDATE_CLOSURES).join(', ')})`,
    selfTests: [{ drift: 'grant update (updated_by) on app.workspace_member_scopes to authenticated;',
      raises: 'client-updatable attribution column(s) with no pinned UPDATE closure' }] },
  { label: 'pinned check probe', sql: PINNED_CHECK_PROBE_SQL,
    claim: `the ${Object.keys(PINNED_CHECKS).length} CHECK constraints the decider rule leans on, validated and in their pinned text`,
    selfTests: [{ drift: 'alter table app.approval_requests drop constraint approval_requests_decision_has_a_decider;',
      raises: 'pinned CHECK constraint(s) missing, unvalidated or not in their pinned text' }] },
  { label: 'pinned policy probe', sql: PINNED_POLICY_PROBE_SQL,
    claim: `the ${Object.keys(PINNED_POLICIES).length} restrictive policies that bound which rows a client may update or see, in their pinned text`,
    selfTests: [{ drift: 'alter policy approval_requests_settled_is_immutable on app.approval_requests using (true);',
      raises: 'pinned restrictive policy(ies) missing or not in their pinned text' }] },
  { label: 'security definer probe', sql: SECURITY_DEFINER_PROBE_SQL,
    claim: `the ${SECURITY_DEFINER_FUNCTIONS.length} SECURITY DEFINER functions are exactly the pinned ones, each with its owner, body, an empty search_path and no EXECUTE for PUBLIC`,
    selfTests: [
      { drift: 'alter function private.set_updated_at() reset search_path;',
        raises: 'SECURITY DEFINER function(s) not in their pinned shape' },
      // No longer a definer, so the first rule does not see it and only the second can.
      { drift: 'alter function private.set_updated_at() security invoker;',
        raises: 'pinned SECURITY DEFINER function(s) missing or no longer SECURITY DEFINER' },
    ] },
  { label: 'trigger probe', sql: TRIGGER_PROBE_SQL,
    claim: `every trigger outside the system schemas is enabled, internal ones included, no role or database defaults session_replication_role, and the ${REFUSE_MUTATION_TRIGGERS.length} append-only triggers match their pinned definitions on two plain tables with no children`,
    // Each drift leaves the rules before its own intact, since the first raise ends the block.
    selfTests: [
      { drift: 'alter table app.security_events disable trigger refuse_mutation;',
        raises: 'trigger(s) not enabled' },
      { drift: 'drop trigger refuse_truncate on app.audit_logs;',
        raises: 'the private.refuse_mutation triggers are not exactly the four pinned definitions' },
      { drift: "alter role authenticated set session_replication_role = 'replica';",
        raises: 'session_replication_role is set as a default for' },
      { drift: 'create table app.probe_child_of_security_events () inherits (app.security_events);',
        raises: 'append-only table(s) partitioned, inherited from or inheriting' },
    ] },
];

// A drift runs inside the executor's `begin; ... rollback;`, so a drift that ends that transaction
// makes itself permanent -- the role-default drift then persists cluster-wide -- and the run reported
// green (Q0's re-test of 123's corrections, F3; A1's, N5). Two defences: a drift may not contain
// transaction control, and after every drift has run each probe runs AS BUILT AGAIN, which fails on
// any residue a drift left behind.
export const TRANSACTION_CONTROL = /\b(begin|commit|rollback|end|abort|savepoint|release|start\s+transaction|prepare\s+transaction)\b/i;
export function catalogProbeJobs(probes) {
  const jobs = [];
  for (const probe of probes) {
    jobs.push({ label: probe.label, kind: 'as built', sql: probe.sql });
    (probe.selfTests ?? []).forEach(({ drift, raises }, i) => {
      jobs.push({ label: probe.label, kind: `after drift ${i + 1}`, sql: `${drift}\n${probe.sql}`, raises });
    });
  }
  for (const probe of probes) jobs.push({ label: probe.label, kind: 'as built, after every drift', sql: probe.sql });
  return jobs;
}
export function decideCatalogProbes(probes, outcomes) {
  const failures = [];
  for (const probe of probes) {
    if (!probe.selfTests?.length) failures.push(`${probe.label}: carries no self-test drift; a probe that cannot be shown to fail asserts nothing`);
    for (const [i, { drift }] of (probe.selfTests ?? []).entries()) {
      if (TRANSACTION_CONTROL.test(drift)) failures.push(`${probe.label}: drift ${i + 1} contains transaction control, so it could outlive the rollback that contains it`);
    }
  }
  const expected = catalogProbeJobs(probes);
  if (outcomes.length !== expected.length) failures.push(`${expected.length} probe run(s) were due and ${outcomes.length} came back`);
  const refused = new Map();
  for (const job of expected) {
    const got = outcomes.find((o) => o.label === job.label && o.kind === job.kind && o.sql === job.sql);
    if (!got || !got.result) { failures.push(`${job.label}: not run ${job.kind}`); continue; }
    const error = got.result.error;
    if (job.kind.startsWith('as built')) {
      if (error) failures.push(`${job.label}: ${job.kind}: ${error.message} (${error.code ?? 'no code'})`);
    } else if (!error || error.code !== 'P0001' || !String(error.message).startsWith(job.raises)) {
      failures.push(`${job.label}: its self-test ${job.kind} ${error ? `failed with ${error.code ?? 'no code'}: ${error.message}` : 'passed'} -- the probe must refuse it with P0001 beginning "${job.raises}"; a rule that cannot fail asserts nothing`);
    } else {
      refused.set(job.label, (refused.get(job.label) ?? 0) + 1);
    }
  }
  // Each claim counts the drifts that were REFUSED, not the drifts declared (Q0's re-test, F1).
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
    if (/^\s*\\/m.test(replacementSql)) {
      throw new Error(`${SUPERSEDED}: ${entry.block}'s replacement ${entry.replacement} carries a line beginning with a backslash, which psql would execute as a meta-command`);
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
    for (const { name, sql } of await migrateCleanSteps()) {
      const out = await script(sql);
      if (out.error) { stderr.write(`  ${name}: ${out.error.message} (${out.error.code ?? 'no code'})\n`); return 1; }
      stdout.write(`  applied ${name}\n`);
    }
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
    const { feed } = await import('./psql-driver.mjs');
    const rerun = (sql) => feed(`begin;\n${sql}\nrollback;\n`);
    const probeOutcomes = [];
    for (const job of catalogProbeJobs(CATALOG_RULE_PROBES)) probeOutcomes.push({ ...job, result: await rerun(job.sql) });
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
