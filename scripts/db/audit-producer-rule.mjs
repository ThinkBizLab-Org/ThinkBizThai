// RFC-2026-026 §8.1/1, AS A CATALOG PROBE (batch 141, migration 172): only the pinned producer set inserts an
// audit row, and nothing else reaches one -- no trigger, no rewrite rule, no stored expression. And RFC-2026-023
// §8/3 (A1 F7): only the two lifecycle functions write app.workspaces among the functions app_command owns.
//
// WHY A SEPARATE PROBE, DECIDED IN NODE. Every other catalog probe in scripts/db/run.mjs is a `do $$` block that
// raises. This rule reads function bodies, rules and stored expressions as TOKENS, through the repository's one SQL
// lexer (scripts/db/sql-lexer.mjs: comments dropped, every literal and dollar body read as SQL at every nesting
// level, unquoted identifiers folded), which PL/pgSQL cannot do. So the catalog is READ as JSON (READ_SQL below) and
// the verdict is a pure function of what was read (decideAuditProducerRule), exported so a static test can drive it
// with synthetic catalogs. The self-test convention is run.mjs's (C0-SR-3): every drift runs in its own rolled-back
// transaction, after it the pg_catalog guard, then the read; a drift counts as refused only if the verdict names
// every object the drift names, and the catalog as built -- before the drifts and again after all of them -- must
// draw no refusal at all.
//
// WHAT IS READ (RFC-2026-026 §8.1/1's head): every function or procedure in a non-system schema or with an OID at or
// above 16384 (run.mjs's userObject), extension members included; its full definition (pg_get_functiondef, so a
// BEGIN ATOMIC body is read), language, kind, owner, SECURITY DEFINER flag, volatility, settings and return type;
// every rewrite rule on a relation in the same scope (pg_get_ruledef); every stored expression in the scope -- column
// defaults, CHECK constraints by connamespace (a domain's included), policy USING and WITH CHECK, index definitions,
// trigger definitions (their WHEN), domain defaults; every trigger in pg_trigger whole; every pg_depend row whose
// referenced object is a function in the scope; pg_extension; and the four foreign-data catalogs.
//
// THE PARTS, each with the text its refusal begins with:
//   (a) the functions read whose definition names audit_logs or security_events are exactly the pinned producers
//       (AUDIT_PRODUCERS, read from the coverage map's rows with producer_path "command") plus the pinned reader list
//       (AUDIT_READERS, empty); each producer is SECURITY DEFINER, owned by app_command, search_path "", not returning
//       trigger, no BEGIN ATOMIC body, and pinned in SECURITY_DEFINER_FUNCTIONS; each reader is STABLE or IMMUTABLE;
//   (b) no function names a producer other than in its own header, and no object but a pinned one depends on a
//       producer in pg_depend (AUDIT_DEPEND_EXEMPTIONS, empty);
//   (c) no function has an unquoted `execute` token at any level (DYNAMIC_SQL_EXEMPTIONS, empty), none names a
//       function that executes its text argument (TEXT_EXECUTING_FUNCTIONS), and every function is in sql or plpgsql
//       or is a c member of an approved extension;
//   (d) cited, not re-read: the audit tables' triggers are exactly 140's (PINNED_TABLE_TRIGGERS, the pinned trigger
//       probe and its self-tests);
//   (e) no trigger on any table runs a function (a) or (b) selects;
//   (f) no rewrite rule but a view's or materialized view's _RETURN; no _RETURN names a producer; one naming an
//       audit table is a pinned reader;
//   (g) no stored expression names a producer;
//   (h) pg_extension is exactly the approved extensions plus plpgsql, and the foreign-data catalogs are empty;
//   (i) RFC-2026-023 §8/3: among the functions app_command owns, only LIFECYCLE_WRITERS name app.workspaces at all
//       (stricter than "write": a reader would fail closed too, and goes on the list in a reviewed diff);
//   and the lexer's own limits, fail closed: a refusal at level 0 or inside the dollar-quoted body
//   pg_get_functiondef prints, or any level past NESTED_DEPTH, fails the function.
// The drifts are RFC-2026-026 §8.1/1's 1-20 where a drift can be written against the landed producers; the plan
// (evidence/WP-0A-DB-00/a0-batch-141-plan-2026-10-03.md) says which are cited and why drift 16 cannot be built.
import { readFileSync } from 'node:fs';
import { NESTED_DEPTH, keyword, walkLevels, word } from './sql-lexer.mjs';

const AUDIT_COVERAGE_MAP = new URL('../../db/foundation/lint/audit-coverage-map.json', import.meta.url);

export const AUDIT_TABLE_NAMES = Object.freeze(['audit_logs', 'security_events']);
// (a): the coverage map is the producer register (RFC-2026-026 §8.1/1 (a), §8.1/4).
export const auditProducersFromMap = (map) => [...new Set((map?.actions ?? [])
  .filter((a) => a.producer_path === 'command').flatMap((a) => a.producer ?? []))].sort();
export const AUDIT_PRODUCERS = Object.freeze(auditProducersFromMap(JSON.parse(readFileSync(AUDIT_COVERAGE_MAP, 'utf8'))));
export const AUDIT_READERS = Object.freeze([]);
export const AUDIT_DEPEND_EXEMPTIONS = Object.freeze([]);
export const DYNAMIC_SQL_EXEMPTIONS = Object.freeze([]);
export const TEXT_EXECUTING_FUNCTIONS = Object.freeze(['query_to_xml', 'query_to_xmlschema', 'query_to_xml_and_xmlschema', 'ts_stat', 'ts_rewrite']);
export const APPROVED_EXTENSION_SET = Object.freeze(['pgcrypto', 'plpgsql']);
export const FOREIGN_DATA_EXEMPTIONS = Object.freeze([]);
// (i): RFC-2026-023 §8/3 (A1 F7). The UPDATE grant and policy on app.workspaces are app_command's, so they reach
// every function it owns; these two are the only ones that may name the table.
export const LIFECYCLE_WRITERS = Object.freeze(['app.cancel_workspace_closing(uuid,text,text)', 'app.close_workspace(uuid,text,text)']);

const USER_OBJECT = (oid, nsp) => `((${nsp}.nspname not in ('pg_catalog', 'information_schema') and ${nsp}.nspname !~ '^pg_') or ${oid} >= 16384)`;

// One row, one column: the catalog as JSON. Run with search_path = pg_catalog after the guard, as every probe is.
export const AUDIT_PRODUCER_READ_SQL = `select pg_catalog.json_build_object(
  'functions', (select coalesce(pg_catalog.json_agg(pg_catalog.json_build_object(
      'ident', p.oid::pg_catalog.regprocedure::text, 'name', p.proname::text,
      'pin', pg_catalog.format('%s.%s(%s)', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)),
      'owner', pg_catalog.pg_get_userbyid(p.proowner)::text, 'definer', p.prosecdef, 'volatile', p.provolatile::text,
      'kind', p.prokind::text, 'lang', l.lanname::text, 'config', p.proconfig, 'returns', p.prorettype::pg_catalog.regtype::text,
      'atomic', p.prosqlbody is not null,
      'extension', (select e.extname::text from pg_catalog.pg_depend d join pg_catalog.pg_extension e on e.oid = d.refobjid
                     where d.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass and d.objid = p.oid
                       and d.refclassid = 'pg_catalog.pg_extension'::pg_catalog.regclass and d.deptype = 'e' limit 1),
      'def', case when p.prokind <> 'a' then pg_catalog.pg_get_functiondef(p.oid) end) order by p.oid), '[]')
     from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     join pg_catalog.pg_language l on l.oid = p.prolang
    where ${USER_OBJECT('p.oid', 'n')}),
  'rules', (select coalesce(pg_catalog.json_agg(pg_catalog.json_build_object(
      'relation', c.oid::pg_catalog.regclass::text, 'relkind', c.relkind::text, 'rule', r.rulename::text,
      'def', pg_catalog.pg_get_ruledef(r.oid)) order by r.oid), '[]')
     from pg_catalog.pg_rewrite r join pg_catalog.pg_class c on c.oid = r.ev_class join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where ${USER_OBJECT('c.oid', 'n')}),
  'expressions', (select coalesce(pg_catalog.json_agg(x order by x->>'what'), '[]') from (
      select pg_catalog.json_build_object('what', 'default ' || c.oid::pg_catalog.regclass::text || '.' || a.attname::text,
             'text', pg_catalog.pg_get_expr(ad.adbin, ad.adrelid)) as x
        from pg_catalog.pg_attrdef ad join pg_catalog.pg_class c on c.oid = ad.adrelid join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = ad.adrelid and a.attnum = ad.adnum
       where ${USER_OBJECT('c.oid', 'n')}
      union all
      select pg_catalog.json_build_object('what', 'check ' || n.nspname::text || '.' || con.conname::text, 'text', pg_catalog.pg_get_constraintdef(con.oid))
        from pg_catalog.pg_constraint con join pg_catalog.pg_namespace n on n.oid = con.connamespace
       where con.contype = 'c' and ${USER_OBJECT('con.oid', 'n')}
      union all
      select pg_catalog.json_build_object('what', 'policy ' || c.oid::pg_catalog.regclass::text || '.' || pol.polname::text,
             'text', coalesce(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), '') || ' ' || coalesce(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), ''))
        from pg_catalog.pg_policy pol join pg_catalog.pg_class c on c.oid = pol.polrelid join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where ${USER_OBJECT('c.oid', 'n')}
      union all
      select pg_catalog.json_build_object('what', 'index ' || i.indexrelid::pg_catalog.regclass::text, 'text', pg_catalog.pg_get_indexdef(i.indexrelid))
        from pg_catalog.pg_index i join pg_catalog.pg_class c on c.oid = i.indrelid join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where (i.indexprs is not null or i.indpred is not null) and ${USER_OBJECT('c.oid', 'n')}
      union all
      select pg_catalog.json_build_object('what', 'trigger ' || t.tgname::text || ' on ' || c.oid::pg_catalog.regclass::text, 'text', pg_catalog.pg_get_triggerdef(t.oid))
        from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where not t.tgisinternal and ${USER_OBJECT('c.oid', 'n')}
      union all
      select pg_catalog.json_build_object('what', 'domain default ' || ty.oid::pg_catalog.regtype::text, 'text', ty.typdefault)
        from pg_catalog.pg_type ty join pg_catalog.pg_namespace n on n.oid = ty.typnamespace
       where ty.typtype = 'd' and ty.typdefault is not null and ${USER_OBJECT('ty.oid', 'n')}) e),
  'triggers', (select coalesce(pg_catalog.json_agg(pg_catalog.json_build_object(
      'trigger', t.tgname::text || ' on ' || t.tgrelid::pg_catalog.regclass::text, 'function', t.tgfoid::pg_catalog.regprocedure::text) order by t.oid), '[]')
     from pg_catalog.pg_trigger t),
  'depends', (select coalesce(pg_catalog.json_agg(pg_catalog.json_build_object(
      'object', pg_catalog.pg_describe_object(d.classid, d.objid, d.objsubid), 'on', d.refobjid::pg_catalog.regprocedure::text) order by d.objid), '[]')
     from pg_catalog.pg_depend d join pg_catalog.pg_proc p on p.oid = d.refobjid join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where d.refclassid = 'pg_catalog.pg_proc'::pg_catalog.regclass and d.deptype <> 'e' and ${USER_OBJECT('p.oid', 'n')}),
  'extensions', (select coalesce(pg_catalog.json_agg(e.extname::text order by e.extname), '[]') from pg_catalog.pg_extension e),
  'foreign', (select coalesce(pg_catalog.json_agg(f order by f), '[]') from (
      select 'wrapper ' || w.fdwname::text as f from pg_catalog.pg_foreign_data_wrapper w
      union all select 'server ' || s.srvname::text from pg_catalog.pg_foreign_server s
      union all select 'user mapping ' || pg_catalog.pg_get_userbyid(um.umuser)::text || ' on ' || s.srvname::text from pg_catalog.pg_user_mapping um join pg_catalog.pg_foreign_server s on s.oid = um.umserver
      union all select 'foreign table ' || ft.ftrelid::pg_catalog.regclass::text from pg_catalog.pg_foreign_table ft) ff)
)::text as catalog;`;

// Every identifier at every level of `text`, with where its level came from, and the lexer's refusals.
export function readText(text, { skipHeaderName = false } = {}) {
  const idents = [];
  const unquoted = [];
  const failClosed = [];
  const dollarStarts = new Set();
  walkLevels(String(text ?? ''), ({ tokens, refusals, depth, at }) => {
    let skipping = false;
    let skipped = false;
    for (const t of tokens) {
      if (depth === 0 && t.kind === 'dollar') dollarStarts.add(t.start);
      if (skipHeaderName && depth === 0 && !skipped) {
        const k = keyword(t);
        if (!skipping && (k === 'function' || k === 'procedure')) { skipping = true; continue; }
        if (skipping) {
          if (t.text === '(') { skipping = false; skipped = true; } else continue;
        }
      }
      const w = word(t);
      if (w !== null) idents.push(w);
      const k = keyword(t);
      if (k !== null) unquoted.push(k);
    }
    if (refusals.length && (depth === 0 || (depth === 1 && dollarStarts.has(at)))) {
      failClosed.push(`a lexer refusal at level ${depth} (${refusals[0].reason})`);
    }
  }, { beyond: ({ depth }) => failClosed.push(`a level past NESTED_DEPTH (${depth} > ${NESTED_DEPTH})`) });
  return { idents, unquoted, failClosed };
}

// The verdict: a list of refusals, each beginning with its part's label and naming its object. Empty is green.
export function decideAuditProducerRule(catalog, {
  producers = AUDIT_PRODUCERS, readers = AUDIT_READERS, dependExemptions = AUDIT_DEPEND_EXEMPTIONS,
  dynamicExemptions = DYNAMIC_SQL_EXEMPTIONS, definerPins = [], lifecycleWriters = LIFECYCLE_WRITERS,
} = {}) {
  const out = [];
  const c = catalog ?? {};
  for (const field of ['functions', 'rules', 'expressions', 'triggers', 'depends', 'extensions', 'foreign']) {
    if (!Array.isArray(c[field])) out.push(`(read) the catalog read carries no ${field}, so the rule cannot be decided -- an unread catalog is not a passing one`);
  }
  if (out.length) return out;
  const producerNames = new Set(producers.map((p) => p.replace(/^[^.]*\./, '').replace(/\(.*$/, '')));
  const auditNames = new Set(AUDIT_TABLE_NAMES);
  const selected = new Set();
  const present = new Set(c.functions.map((f) => f.ident));
  for (const p of producers) if (!present.has(p)) out.push(`(a) pinned producer ${p} does not exist`);
  for (const f of c.functions) {
    const read = f.def === null || f.def === undefined ? null : readText(f.def);
    const header = f.def ? readText(f.def, { skipHeaderName: true }) : null;
    // The language rule, first: an opaque language is read by nothing below.
    const approvedC = f.lang === 'c' && f.extension && APPROVED_EXTENSION_SET.includes(f.extension);
    if (!['sql', 'plpgsql'].includes(f.lang) && !approvedC) out.push(`(c) ${f.ident} is in language ${f.lang}${f.extension ? ` (extension ${f.extension})` : ''}, which this rule cannot read: only sql, plpgsql and a c member of an approved extension`);
    if (read === null) { if (f.kind === 'a') out.push(`(c) ${f.ident} is an aggregate, which has no definition to read`); continue; }
    for (const reason of read.failClosed) out.push(`(lexer) ${f.ident} fails closed: ${reason}`);
    const namesAudit = read.idents.some((w) => auditNames.has(w));
    const isProducer = producers.includes(f.ident);
    const isReader = readers.includes(f.ident);
    if (namesAudit && !isProducer && !isReader) { out.push(`(a) ${f.ident} names an audit table and is not a pinned producer or reader`); selected.add(f.ident); }
    if (isProducer) {
      const wrong = [];
      if (!f.definer) wrong.push('not SECURITY DEFINER');
      if (f.owner !== 'app_command') wrong.push(`owned by ${f.owner}`);
      if (JSON.stringify(f.config) !== JSON.stringify(['search_path=""'])) wrong.push('search_path is not ""');
      if (f.returns === 'trigger') wrong.push('returns trigger');
      if (f.atomic) wrong.push('a BEGIN ATOMIC body');
      if (!definerPins.includes(f.pin)) wrong.push('not pinned in SECURITY_DEFINER_FUNCTIONS');
      if (wrong.length) out.push(`(a) producer ${f.ident} is not in a producer's shape: ${wrong.join(', ')}`);
    }
    if (isReader && !['s', 'i'].includes(f.volatile)) out.push(`(a) reader ${f.ident} is volatile, so "writes none" is held by nothing`);
    if (header.idents.some((w) => producerNames.has(w))) { out.push(`(b) ${f.ident} names a producer outside its own header`); selected.add(f.ident); }
    if (read.unquoted.includes('execute') && !dynamicExemptions.includes(f.ident)) out.push(`(c) ${f.ident} carries an execute token: dynamic SQL hides what it names`);
    const executing = read.idents.filter((w) => TEXT_EXECUTING_FUNCTIONS.includes(w));
    if (executing.length) out.push(`(c) ${f.ident} names ${[...new Set(executing)].join(', ')}, which execute their text argument`);
    if (f.owner === 'app_command' && read.idents.includes('workspaces') && !lifecycleWriters.includes(f.ident)) {
      out.push(`(i) ${f.ident} is owned by app_command and names app.workspaces; only ${lifecycleWriters.join(' and ')} may (RFC-2026-023 §8/3)`);
    }
  }
  for (const d of c.depends) {
    if (producers.includes(d.on) && !dependExemptions.includes(d.object)) out.push(`(b) ${d.object} depends on producer ${d.on}`);
  }
  for (const t of c.triggers) {
    if (producers.includes(t.function) || selected.has(t.function)) out.push(`(e) trigger ${t.trigger} runs ${t.function}, which (a) or (b) selects`);
  }
  for (const r of c.rules) {
    const view = r.rule === '_RETURN' && ['v', 'm'].includes(r.relkind);
    if (!view) { out.push(`(f) rewrite rule ${r.rule} on ${r.relation}: only a view's _RETURN is allowed`); continue; }
    const { idents } = readText(r.def);
    if (idents.some((w) => producerNames.has(w))) out.push(`(f) view ${r.relation} names a producer`);
    if (idents.some((w) => auditNames.has(w)) && !readers.includes(r.relation)) out.push(`(f) view ${r.relation} names an audit table and is not a pinned reader`);
  }
  for (const e of c.expressions) {
    const { idents } = readText(e.text);
    if (idents.some((w) => producerNames.has(w))) out.push(`(g) ${e.what} names a producer`);
  }
  const extensions = [...c.extensions].sort();
  if (JSON.stringify(extensions) !== JSON.stringify([...APPROVED_EXTENSION_SET].sort())) out.push(`(h) extensions are ${extensions.join(', ')}, not exactly ${APPROVED_EXTENSION_SET.join(', ')}`);
  for (const f of c.foreign) if (!FOREIGN_DATA_EXEMPTIONS.includes(f)) out.push(`(h) foreign data: ${f}`);
  return out;
}

// The drifts (RFC-2026-026 §8.1/1, 1-20, where one can be written against the landed producers; and RFC-2026-023
// §8/3's). `names`: what the verdict must name. `clean`: a CONTROL, which must draw no refusal at all.
export const AUDIT_PRODUCER_DRIFTS = Object.freeze([
  { n: '1', drift: 'create function app.probe_audit_writer() returns trigger language plpgsql as $f$ begin insert into app.audit_logs default values; return null; end $f$;',
    names: ['(a) app.probe_audit_writer() names an audit table'] },
  { n: '1c', drift: 'alter function app.close_workspace(uuid, text, text) security invoker;',
    names: ['(a) producer app.close_workspace(uuid,text,text) is not in a producer\'s shape: not SECURITY DEFINER'] },
  { n: '2', drift: 'create function public.probe_audit_writer_p() returns void language sql as $f$ insert into app.audit_logs default values $f$; create schema probe_audit_s; create function probe_audit_s.w() returns void language sql as $f$ insert into app.security_events default values $f$;',
    names: ['(a) public.probe_audit_writer_p() names an audit table', '(a) probe_audit_s.w() names an audit table'] },
  { n: '3', drift: 'create function public.probe_unqualified() returns void language sql set search_path = app as $f$ insert into audit_logs default values $f$;',
    names: ['(a) public.probe_unqualified() names an audit table'] },
  { n: '4', drift: "do $d$ begin execute 'create function public.probe_atomic() returns void language sql begin atomic insert into app.audit_logs default values; end'; end $d$;",
    names: ['(a) public.probe_atomic() names an audit table'] },
  { n: '5', drift: 'create function public.probe_caller() returns text language sql as $f$ select (app.close_workspace(null, null, null)).outcome $f$;',
    names: ['(b) public.probe_caller() names a producer outside its own header'] },
  { n: '6', drift: "create function public.probe_dynamic() returns setof record language plpgsql as $f$ begin return query execute 'select 1'; end $f$;",
    names: ['(c) public.probe_dynamic() carries an execute token'] },
  { n: '7', drift: 'create schema probe_trig_s; create table probe_trig_s.t (id integer); create function probe_trig_s.w() returns trigger language plpgsql as $f$ begin insert into app.audit_logs default values; return null; end $f$; create trigger probe_audit_tr after insert on probe_trig_s.t for each row execute function probe_trig_s.w();',
    names: ['(e) trigger probe_audit_tr on probe_trig_s.t runs probe_trig_s.w()'] },
  { n: '9', drift: 'create function public.probe_member() returns void language sql as $f$ insert into app.audit_logs default values $f$; alter extension pgcrypto add function public.probe_member();',
    names: ['(a) public.probe_member() names an audit table'] },
  { n: '10', drift: 'create table public.probe_rule_t (id integer); create rule probe_audit_rule as on insert to public.probe_rule_t do also insert into app.audit_logs default values; create view public.probe_producer_v as select (app.close_workspace(null, null, null)).outcome;',
    names: ['(f) rewrite rule probe_audit_rule on public.probe_rule_t', '(f) view public.probe_producer_v names a producer'] },
  { n: '11', drift: 'create table public.probe_default_t (x text default (app.close_workspace(null, null, null)).outcome);',
    names: ['(g) default public.probe_default_t.x names a producer', '(b) default value for column x of table public.probe_default_t depends on producer'] },
  { n: '13', clean: true, drift: "create function public.probe_prose() returns void language plpgsql as $f$ begin raise notice 'the caller can''t do this'; perform '{\"k\": \"it''s\"}'::jsonb; end $f$;" },
  { n: '13b', drift: "set local check_function_bodies = off; create function public.probe_unlexed() returns void language plpgsql as $f$ begin raise notice 'unterminated; end $f$;",
    names: ['(lexer) public.probe_unlexed() fails closed'] },
  { n: '14', drift: 'create table public.probe_when_t (id integer); create function public.probe_noop() returns trigger language plpgsql as $f$ begin return null; end $f$; create trigger probe_when_tr after insert on public.probe_when_t for each row when ((app.close_workspace(null, null, null)).outcome is null) execute function public.probe_noop();',
    names: ['(g) trigger probe_when_tr on public.probe_when_t names a producer', '(b) trigger probe_when_tr on table public.probe_when_t depends on producer'] },
  { n: '15', drift: 'create domain public.probe_dom as text default ((app.close_workspace(null, null, null)).outcome); create domain public.probe_dom_c as text check ((app.close_workspace(null, null, null)).outcome is not null or value is null);',
    names: ['(g) domain default public.probe_dom names a producer', '(g) check public.probe_dom_c_check names a producer', '(b) constraint probe_dom_c_check depends on producer'] },
  { n: '17', drift: "create function public.probe_xml() returns xml language sql as $f$ select pg_catalog.query_to_xml('select 1', true, false, '') $f$;",
    names: ['(c) public.probe_xml() names query_to_xml'] },
  { n: '18', drift: "create schema probe_lang_s; do $d$ begin execute 'create function probe_lang_s.i(integer, integer) returns integer language ' || 'internal' || ' as ''int4pl'''; execute 'create function probe_lang_s.c(bytea, text) returns bytea language ' || 'c' || ' as ''$libdir/pgcrypto'', ''pg_digest'''; end $d$;",
    names: ['(c) probe_lang_s.i(integer,integer) is in language internal', '(c) probe_lang_s.c(bytea,text) is in language c'] },
  // Every statement computed in a DO block, as A1's r7 was: the driver refuses these only as spelled.
  { n: '19', drift: "do $d$ begin execute 'create ' || 'ext' || 'ension postgres_fdw schema extensions'; execute 'create ' || 'ser' || 'ver probe_srv foreign data wrapper postgres_fdw'; execute 'create ' || 'user ' || 'mapping for current_user server probe_srv'; execute 'create ' || 'for' || 'eign table public.probe_ft (id uuid) server probe_srv options (schema_name ''app'', table_name ''audit_logs'')'; end $d$;",
    names: ['(h) extensions are pgcrypto, plpgsql, postgres_fdw', '(h) foreign data: server probe_srv', '(h) foreign data: foreign table public.probe_ft', '(h) foreign data: user mapping postgres on probe_srv', '(h) foreign data: wrapper postgres_fdw'] },
  { n: 'i', drift: "create function app.probe_third_lifecycle() returns void language sql security definer set search_path = '' as $f$ update app.workspaces set lifecycle_state = 'active' where false $f$; alter function app.probe_third_lifecycle() owner to app_command;",
    names: ['(i) app.probe_third_lifecycle() is owned by app_command and names app.workspaces'] },
]);

export const AUDIT_PRODUCER_RULE_LABEL = 'audit producer rule';

// The verdict over every job: as built (must be clean), each drift (refused naming its objects, or clean for a
// control), and as built again after every drift. `outcomes`: [{ kind: 'as built' | 'drift <n>' | 'as built, after
// every drift', result: { rows } | { error } }].
export function decideAuditProducerJobs(outcomes, pins) {
  const failures = [];
  let refused = 0;
  const verdictOf = (o) => {
    if (o?.result?.error) return { error: `${o.result.error.code ?? 'no code'}: ${o.result.error.message}` };
    let catalog;
    try { catalog = JSON.parse(o.result.rows[0].catalog); } catch (e) { return { error: `the read did not parse: ${e.message}` }; }
    return { refusals: decideAuditProducerRule(catalog, pins) };
  };
  for (const kind of ['as built', 'as built, after every drift']) {
    const o = outcomes.find((x) => x.kind === kind);
    if (!o) { failures.push(`${AUDIT_PRODUCER_RULE_LABEL}: not run ${kind}`); continue; }
    const v = verdictOf(o);
    if (v.error) failures.push(`${AUDIT_PRODUCER_RULE_LABEL}: ${kind}: ${v.error}`);
    else if (v.refusals.length) failures.push(`${AUDIT_PRODUCER_RULE_LABEL}: ${kind}: ${v.refusals.join('; ')}`);
  }
  for (const d of AUDIT_PRODUCER_DRIFTS) {
    const o = outcomes.find((x) => x.kind === `drift ${d.n}`);
    if (!o) { failures.push(`${AUDIT_PRODUCER_RULE_LABEL}: drift ${d.n} was not run`); continue; }
    const v = verdictOf(o);
    if (v.error) { failures.push(`${AUDIT_PRODUCER_RULE_LABEL}: drift ${d.n} did not reach the rule (${v.error})`); continue; }
    if (d.clean) {
      if (v.refusals.length) failures.push(`${AUDIT_PRODUCER_RULE_LABEL}: control drift ${d.n} drew refusals it must not: ${v.refusals.join('; ')}`);
      else refused += 1;
      continue;
    }
    const missing = (d.names ?? []).filter((name) => !v.refusals.some((r) => r.includes(name)));
    if (!d.names?.length) failures.push(`${AUDIT_PRODUCER_RULE_LABEL}: drift ${d.n} names nothing its refusal must name`);
    else if (missing.length) failures.push(`${AUDIT_PRODUCER_RULE_LABEL}: drift ${d.n} was not refused naming ${missing.join(', ')} (refusals: ${v.refusals.join('; ') || 'none'})`);
    else refused += 1;
  }
  return { ok: failures.length === 0, failures, decided: refused };
}
