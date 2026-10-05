#!/usr/bin/env node
// THE WS:911 EXPLAIN HARNESS (the batch 150 prerequisite draft; plan "Batch 150 -- Can do now" (c)).
//
//   DB_TEST_URL=postgresql://postgres@127.0.0.1:<port>/postgres node scripts/db/explain-harness.mjs [options]
//     --scale small | full | <factor in (0,1]>   the fixture size (default small: WS905_SMALL)
//     --analyze                                    EXPLAIN (ANALYZE, BUFFERS): the plans as executed
//     --json                                       print every plan and its summary as JSON
//     --fail-on-seq-scan                           exit 3 when a membership-class query plans a Seq Scan
//
// It loads the synthetic WS:911 fixture (test-kits/db/ws905-fixture.mjs) into a FRESH database that `make
// db-migrate-clean` built and nothing has written to since -- run it before `make db-rls-smoke`, which
// commits rows (C0-4, Q0 Q-6 on batch 150-prereq) -- inside ONE transaction. Before its first write it
// refuses (exit 2) unless every table the fixture loads is empty (A1 S3: it used to load everything and
// only then find the residue); then it checks every table holds the rows the fixture says; runs ANALYZE on
// them; captures the plan of each named query of docs/plans/core-database-and-rls-workstream-th.md
// :909-917 (membership check, workspace list, content / calendar / library first page, worker claim, and
// three reads the batch 150 tables serve), each under the role that runs it; prints each plan's summary --
// every Seq Scan by relation, every index used, any Sort -- and ROLLS BACK.
//
// Rolled back is NOT "left as it was" (A1 S2, Q0 Q-5 on batch 150-prereq, measured): no row stays, but
// identity sequences advance (nextval is not transactional; 402000 values after three runs), ANALYZE's
// reltuples stay, and the dead tuples and WAL stay on disk until VACUUM or the cluster is removed (A1
// measured three runs, small, 0.2 and 0.2: the database grew from 14 MB to 592 MB and 1.6 GB of free disk
// went, none of it returned at rollback; the full scale needs about 2 GB while it runs). Plan costs drift between repeat runs on one cluster although the plan shapes do not. So: one run per
// fresh cluster, and remove the cluster afterwards. It has no free-space guard (open_blockers[194] (12)).
//
// What it does NOT do, by decision of the plan: it asserts no p95 or any other timing (the SLO is Q150-d: A0
// drafted values in a0-batch-150-plan-2026-10-03.md §5, RATIFIED 2026-10-05 as the Pilot p95 DB-time budget through
// the Owner's delegation, product-owner-disposition-2026-10-03-batch-171.md, and written in db/foundation/README.md;
// a timing assertion is owed, open_blockers[194], because one sample here is not a p95), it is not a target in the Makefile and it is not run by CI (CI is protected: adding it needs
// the Integration Owner), and it changes no schema. A Seq Scan on a membership-class query is REPORTED; it
// fails the run only under --fail-on-seq-scan, because at a small scale the planner may rightly prefer one.
//
// It refuses without DB_TEST_URL, and refuses a URL the shared test-instance guard refuses (testHostRefusal
// in psql-driver.mjs, also db-reset-test's): the URL is parsed, its host must be exactly localhost,
// 127.0.0.1, [::1] or the CI service container, and it may carry no host, hostaddr, service or servicefile
// parameter (A1 S1, Q0 Q-4, C0-9). It writes up to 3.1M rows, even if it rolls them back.
import { argv, env, exit, stderr, stdout } from 'node:process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { WS905_FULL, WS905_SMALL, ws905Scaled, fixtureSql, expectedCounts, fixtureIds } from '../../test-kits/db/ws905-fixture.mjs';
import { testHostRefusal } from './psql-driver.mjs';

export const EXIT = Object.freeze({ ok: 0, failed: 1, refused: 2, seqScan: 3 });
// The first statement after BEGIN raises this when a fixture table already holds a row, before any write.
export const NOT_EMPTY = 'ws905 harness refuses a database that is not empty';

export function parseArgs(args) {
  const opts = { scale: 'small', analyze: false, json: false, failOnSeqScan: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--analyze') opts.analyze = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--fail-on-seq-scan') opts.failOnSeqScan = true;
    else if (a === '--scale' && i + 1 < args.length) opts.scale = args[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

export function paramsFor(scale) {
  if (scale === 'small') return WS905_SMALL;
  if (scale === 'full') return WS905_FULL;
  const f = Number(scale);
  if (!Number.isFinite(f)) throw new Error(`--scale is small, full or a factor in (0, 1], not ${scale}`);
  return ws905Scaled(f);
}

// The named queries. `role` is the role the statement runs as in the product: the membership check is the
// body of app.workspace_member_role, a SECURITY DEFINER function owned by app_authz; the client reads run as
// authenticated through every policy; the worker and the service reads run as the migration owner, because
// no worker identity exists yet (RFC-2026-022 §7, DATA-DEC-03), which the report says.
const ws1 = fixtureIds.workspace(1);
const bp1 = fixtureIds.business(1);
const pp1 = "md5('ws905:pp:1')::uuid";
export const NAMED_QUERIES = Object.freeze([
  // Batch 171 (RFC-2026-027 §3.2, §7.1): the body now joins app.workspaces on its key and admits only the open
  // states, so the membership check is re-measured with the join, as app_authz under its two policies.
  { name: 'membership check', klass: 'membership', role: 'app_authz', source: 'WS:913; app.workspace_member_role',
    sql: `select m.role from app.workspace_members m join app.workspaces w on w.id = m.workspace_id where m.workspace_id = ${ws1} and m.user_id = app.jwt_subject() and m.status = 'active' and w.lifecycle_state in ('active', 'closing') limit 1` },
  // Batch 150 (Q150-e, answered 2026-10-04 as A0 recommended): the list is read FROM the caller's active
  // memberships and joined to workspaces, so the plan starts on workspace_members_user_id_status_idx and reaches
  // each workspace by its key. Read from workspaces outward (the batch 150 prerequisites' text,
  // `select w.id, w.name from app.workspaces w order by w.name limit 50`) it seq-scanned app.workspaces at the
  // 0.2 scale (F2, open_blockers[194] (1)). The policies are unchanged. The caller's id is a LITERAL here because
  // a client role on the shim can neither call app.jwt_subject() nor name schema auth. NOTHING BINDS THAT LITERAL
  // TO THE SESSION (review round, C0-3 and A1 F150-5, measured): workspace_members_select_workspace_roster lets an
  // owner or admin read co-members' rows, so with a co-member's id the query returns that co-member's workspaces
  // the caller can also see (workspaces_select_active_member still limits every row to the caller's own). The BFF
  // that issues this list MUST bind m.user_id to the authenticated subject ((select auth.uid())), never to a
  // client-supplied id; owed with the BFF, open_blockers[194] (1).
  { name: 'workspace list', klass: 'membership', role: 'authenticated', source: 'WS:913; workspace_members, then workspaces_select_active_member',
    sql: `select w.id, w.name from app.workspace_members m join app.workspaces w on w.id = m.workspace_id where m.user_id = ${fixtureIds.owner(1)} and m.status = 'active' order by w.name limit 50` },
  { name: 'content first page', klass: 'first page', role: 'authenticated', source: 'WS:914',
    sql: `select c.id, c.title, c.status, c.created_at from app.content_items c where c.workspace_id = ${ws1} and c.business_profile_id = ${bp1} and c.deleted_at is null order by c.created_at desc, c.id desc limit 50` },
  { name: 'calendar first page', klass: 'first page', role: 'authenticated', source: 'WS:914',
    sql: `select k.id, k.content_item_id, k.scheduled_local_date from app.calendar_items k where k.workspace_id = ${ws1} and k.deleted_at is null and k.scheduled_local_date >= date '2026-10-01' and k.scheduled_local_date < date '2026-11-01' order by k.scheduled_local_date, k.id limit 200` },
  { name: 'library first page', klass: 'first page', role: 'authenticated', source: 'WS:914',
    sql: `select a.id, a.title, a.kind, a.created_at from app.assets a where a.workspace_id = ${ws1} and a.business_profile_id = ${bp1} and a.deleted_at is null order by a.created_at desc, a.id desc limit 50` },
  { name: 'worker claim', klass: 'worker', role: null, source: 'WS:915; no worker role exists yet (DATA-DEC-03)',
    sql: 'select j.id from app.jobs j where j.available_at <= now() and j.lease_expires_at is null and j.cancel_requested_at is null order by j.available_at limit 10 for update skip locked' },
  { name: 'metrics per post', klass: 'batch 150 table', role: 'authenticated', source: 'performance_snapshots, re-keyed in place by batch 150 (Q150-a)',
    sql: `select s.metric_time, s.metrics from app.performance_snapshots s where s.workspace_id = ${ws1} and s.business_profile_id = ${bp1} and s.published_post_id = ${pp1} order by s.metric_time desc limit 30` },
  { name: 'usage recompute', klass: 'batch 150 table', role: null, source: 'usage_events, 1M rows at WS:911',
    sql: `select u.dimension, sum(u.quantity_amount) from app.usage_events u where u.workspace_id = ${ws1} and u.business_profile_id = ${bp1} and u.dimension = 'ai_tokens' and u.occurred_at >= timestamptz '2026-09-01 00:00:00+00' and u.occurred_at < timestamptz '2026-09-02 00:00:00+00' group by u.dimension` },
  { name: 'audit first page', klass: 'batch 150 table', role: null, source: 'audit_logs, 1M rows at WS:911; no client reads it',
    sql: `select l.id, l.occurred_at, l.action_name from app.audit_logs l where l.workspace_id = ${ws1} order by l.occurred_at desc, l.id desc limit 50` },
]);

const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

// The whole run as one script: the fixture, the count check, ANALYZE, the plans into a temporary table,
// one SELECT of them, ROLLBACK. Each statement's role and claims are set with set_config(..., true), as
// db/foundation/test-helpers/auth-context.sql does, and reset before the plan is stored.
export function harnessScript(params, { analyze = false } = {}) {
  const counts = expectedCounts(params);
  const explain = analyze ? 'explain (analyze, buffers, format json) ' : 'explain (format json) ';
  const claims = `json_build_object('role', 'authenticated', 'sub', (${fixtureIds.owner(1)})::text)::text`;
  const steps = NAMED_QUERIES.map((q, i) => `
  ${q.role ? `perform pg_catalog.set_config('request.jwt.claims', ${claims}, true);
  perform pg_catalog.set_config('role', ${quote(q.role)}, true);` : '-- as the migration owner'}
  execute ${quote(explain + q.sql)} into plan;
  perform pg_catalog.set_config('role', 'none', true);
  perform pg_catalog.set_config('request.jwt.claims', '', true);
  plans := plans || jsonb_build_object('n', ${i}, 'plan', plan);`).join('');
  return `begin;
do $ws905$
declare
  occupied text;
begin
  select string_agg(t, ', ' order by t) into occupied from (
${Object.keys(counts).map((t) => `    select '${t}' as t where exists (select 1 from ${t})`).join('\n    union all\n')}
  ) o;
  if occupied is not null then raise exception '${NOT_EMPTY} (run it on a fresh migrate-clean, before rls-smoke): % already hold rows', occupied; end if;
end $ws905$;
${fixtureSql(params)}
do $ws905$
declare
  found_rows bigint;
begin
${Object.entries(counts).map(([t, n]) => `  select count(*) into found_rows from ${t};
  if found_rows <> ${n} then raise exception 'ws905 fixture: ${t} holds % row(s), not ${n}', found_rows; end if;`).join('\n')}
end $ws905$;
analyze ${Object.keys(counts).join(', ')};
create temporary table ws905_plans (n integer, plan jsonb) on commit drop;
do $ws905$
declare
  plan json;
  plans jsonb := '[]'::jsonb;
begin${steps}
  insert into ws905_plans select (x ->> 'n')::integer, x -> 'plan' from jsonb_array_elements(plans) x;
end $ws905$;
select n, plan::text as plan from ws905_plans order by n;
rollback;
`;
}

// What a plan says, read from its JSON: every node type, every relation read by Seq Scan, every index, and
// whether it sorts. A node's children are under "Plans".
export function summarisePlan(planJson) {
  const root = Array.isArray(planJson) ? planJson[0] : planJson;
  const nodes = [];
  const walk = (node) => { if (!node) return; nodes.push(node); for (const c of node.Plans ?? []) walk(c); };
  walk(root?.Plan);
  const relation = (n) => (n.Schema ? `${n.Schema}.${n['Relation Name']}` : n['Relation Name']);
  return {
    seqScans: nodes.filter((n) => n['Node Type'] === 'Seq Scan').map(relation),
    indexes: [...new Set(nodes.filter((n) => n['Index Name']).map((n) => `${n['Node Type']} ${n['Index Name']}`))],
    sorts: nodes.filter((n) => n['Node Type'] === 'Sort' || n['Node Type'] === 'Incremental Sort').map((n) => (n['Sort Key'] ?? []).join(', ')),
    totalCost: root?.Plan?.['Total Cost'] ?? null,
    nodeTypes: [...new Set(nodes.map((n) => n['Node Type']))],
  };
}

export function verdict(results) {
  const flagged = results.filter((r) => r.klass === 'membership' && r.summary.seqScans.length > 0);
  return { flagged: flagged.map((r) => `${r.name}: Seq Scan on ${r.summary.seqScans.join(', ')}`) };
}

async function main() {
  let opts;
  try { opts = parseArgs(argv.slice(2)); } catch (e) { stderr.write(`explain-harness: ${e.message}\n`); return EXIT.refused; }
  const url = env.DB_TEST_URL ?? '';
  if (!url) {
    stderr.write('explain-harness needs a Postgres TEST instance: set DB_TEST_URL to a database `make db-migrate-clean` built. It has no no-database mode.\n');
    return EXIT.refused;
  }
  const refusal = testHostRefusal(url);
  if (refusal) {
    stderr.write(`explain-harness refuses this host: ${refusal}; it is not localhost, 127.0.0.1 or the CI service container.\n`);
    return EXIT.refused;
  }
  let params;
  try { params = paramsFor(opts.scale); } catch (e) { stderr.write(`explain-harness: ${e.message}\n`); return EXIT.refused; }
  const { feed } = await import('./psql-driver.mjs');
  const started = Date.now();
  const out = await feed(harnessScript(params, { analyze: opts.analyze }));
  if (out.error) {
    stderr.write(`explain-harness: ${out.error.message} (${out.error.code ?? 'no code'})\n`);
    return out.error.code === 'P0001' && out.error.message.startsWith(NOT_EMPTY) ? EXIT.refused : EXIT.failed;
  }
  const rows = out.rows ?? [];
  if (rows.length !== NAMED_QUERIES.length) { stderr.write(`explain-harness: ${rows.length} plan(s) came back for ${NAMED_QUERIES.length} queries\n`); return EXIT.failed; }
  const results = rows.map((r) => {
    const q = NAMED_QUERIES[Number(r.n)];
    const plan = JSON.parse(r.plan);
    return { name: q.name, klass: q.klass, role: q.role ?? 'migration owner', source: q.source, summary: summarisePlan(plan), plan };
  });
  const v = verdict(results);
  if (opts.json) {
    stdout.write(`${JSON.stringify({ params, analyze: opts.analyze, seconds: Math.round((Date.now() - started) / 1000), results, flagged: v.flagged }, null, 2)}\n`);
  } else {
    stdout.write(`ws905 fixture ${JSON.stringify(params)} loaded, analysed and rolled back in ${Math.round((Date.now() - started) / 1000)} s\n`);
    for (const r of results) {
      const s = r.summary;
      stdout.write(`  ${r.name} [${r.klass}; as ${r.role}]: ${s.seqScans.length ? `SEQ SCAN on ${s.seqScans.join(', ')}` : 'no seq scan'}; `
        + `${s.indexes.length ? s.indexes.join(', ') : 'no index'}${s.sorts.length ? `; sort on ${s.sorts.join(' | ')}` : ''}; total cost ${s.totalCost}\n`);
    }
    stdout.write(v.flagged.length ? `membership-class seq scans: ${v.flagged.join('; ')}\n` : 'membership-class seq scans: none\n');
    stdout.write('No timing is asserted (Q150-d). Not run by CI.\n');
  }
  return v.flagged.length && opts.failOnSeqScan ? EXIT.seqScan : EXIT.ok;
}

if (argv[1] && realpathSync(argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  exit(await main());
}
