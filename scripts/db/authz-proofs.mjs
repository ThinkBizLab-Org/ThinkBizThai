#!/usr/bin/env node
// RFC-2026-020 §6.2 and §6.3, executed.
//
// Owner: A1 Identity, with the Security review the migration registry names as batch 011's
// co-owner.
//
// RFC-2026-020's approval carries a condition, and this file is that condition:
//
//   > The decision is NOT IN EFFECT until §6 holds — including §6.2's two claims, which must be
//   > discharged by EXECUTION in batch 011 and never by citation: if the helper inlines, this
//   > decision is wrong.
//
// §2.5 of that RFC records why the two could not be measured when it was written: producing 42P17
// requires CREATING a recursive policy, which is DDL, and the run that wrote the RFC was read-only
// against a provisioned instance and should not have wanted to be otherwise. So they are measured
// HERE, against the postgres:17 service container `make db-rls-smoke` already uses, on every pull
// request, with every transcript printed rather than summarised.
//
// **If the inlining proof ever reports that the helper WAS inlined, RFC-2026-020 option G has
// failed and the decision is wrong.** The correct response is to revert batch 011 and reopen the
// decision, not to adjust this file until it passes.
//
//
// THE TRAP THIS FILE WAS NEARLY BUILT INTO, RECORDED BECAUSE IT IS THE WHOLE VALUE OF PROOF 9
//
// The obvious control for "SECURITY DEFINER is not inlined" is to write the same function SECURITY
// INVOKER and show that one IS inlined. Copying the shipped helper and flipping the security mode
// **passes while proving nothing**, for TWO independent reasons, either of which alone is enough to
// make both sides read "not inlined" and the discriminator never discriminate:
//
//   * the shipped helper carries `set search_path = ''`, and PostgreSQL will not inline a SQL
//     function that has a SET clause, whatever its security mode; and
//   * the shipped helper READS A TABLE. Scalar-function inlining rewrites the body into an
//     expression in the calling query, so it applies only where the body IS an expression. A body
//     with a FROM clause is not inlined by it in any security mode.
//
// So the pair below differs in EXACTLY ONE property and avoids both confounders: same body, no SET
// clause on either, no FROM clause on either, one INVOKER and one DEFINER. Its body is the shape
// RFC-2026-020 §2.4 already measured being inlined on the provisioned instance — `auth.uid()`,
// whose plan contained its body rather than a call.
//
// The shipped helper is then checked on top of that pair, and it is protected twice over, by the
// SET clause and by SECURITY DEFINER. That is worth knowing and is not what §6.2/9 asks, which is
// why it is not what the pair measures.
//
//
// WHY EVERY READ IS FENCED
//
// psql prints every result set in a script back to back with nothing marking where one ends, so a
// script that assumes an identity and then reads something has the identity statement's output and
// the read's output in one stream, and the FIRST line becomes the header for all of it. The driver
// already solved this for the isolation suite: `queryFinal` fences one statement's result between
// two markers and parses only that. Every proof below that reads rows goes through it, one psql
// invocation per read, so a transaction is never expected to survive an exit.
import { argv, exit, stdout, stderr } from 'node:process';

import { query, queryFinal, connectionString } from './psql-driver.mjs';
import {
  AUTHZ_IDENTITY_SQL, AUTHZ_MIGRATION, AUTHZ_POLICY, AUTHZ_POLICY_QUAL, AUTHZ_ROLE, AUTHZ_TABLE,
  AUTHZ_WORKSPACES_POLICY, AUTHZ_WORKSPACES_POLICY_QUAL, AUTHZ_WORKSPACES_TABLE, AUTHZ_SCOPES_POLICY_QUAL,
  authzLint,
} from './run.mjs';
import { fixtureResolver } from '../../tests/db/identity/run-isolation.mjs';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROSTER_POLICY = 'workspace_members_select_workspace_roster';

// Identities by fixture SYMBOL. Nothing here generates a uuid, for the reason db/foundation/README
// gives and the isolation suite is built on: a generated id makes a failure unreproducible, and it
// makes a cross-tenant assertion worthless.
const OWNER_A = 'user_owner_a';
const SUSPENDED_A = 'user_suspended_a';
const OWNER_B = 'user_owner_b';
const WORKSPACE_A = 'workspace_a';
// Batch 141: the identities and rows the acting-user and closing-command proofs read, by fixture symbol.
const PAGE_EDITOR_A = 'user_page_editor_a';
const BUSINESS_A1 = 'business_a1';
const PAGE_A1 = 'page_a1';
const PAGE_A1_SIBLING = 'page_a1_sibling';

const asAuthenticated = (subject) => [
  'set local role authenticated;',
  `select set_config('request.jwt.claims', json_build_object('role','authenticated','sub','${subject}')::text, true) as claims;`,
];

const planText = (rows) => rows.map((r) => r['QUERY PLAN'] ?? Object.values(r)[0]).join('\n');

// A proof records what it did, what it saw, and whether that is what RFC-2026-020 requires. The
// transcript prints on success as well as on failure: a claim discharged by execution is only as
// good as the output someone can read afterwards.
const proof = (id, requires) => ({ id, requires, ok: false, detail: '', transcript: '' });

// -------------------------------------------------------------------------------------------
// §6.2/8 — that the cycle exists.
// -------------------------------------------------------------------------------------------
//
// 010's header says a member-list policy that asks "is the reader a member" queries
// app.workspace_members from a policy on app.workspace_members, and that Postgres raises 42P17.
// That sentence justified leaving two matrix cells unimplemented for a whole batch, and it was
// never executed. It is executed here, by building exactly that policy and running exactly that
// read.
//
// Batch 011's own roster policy is dropped first, inside the transaction, so the error is
// attributable to the naive policy alone rather than to an interaction between the two.
export async function proveCycleExists(run, ids) {
  const p = proof('42p17-the-cycle-exists', 'RFC-2026-020 §6.2/8');
  const out = await run({
    prelude: [
      'begin;',
      `drop policy ${ROSTER_POLICY} on app.${AUTHZ_TABLE};`,
      `create policy __proof_naive_roster on app.${AUTHZ_TABLE}`,
      '  for select to authenticated',
      '  using (exists (',
      `    select 1 from app.${AUTHZ_TABLE} m`,
      `     where m.workspace_id = ${AUTHZ_TABLE}.workspace_id`,
      '       and m.user_id = (select auth.uid())',
      "       and m.status = 'active'));",
      ...asAuthenticated(ids.owner),
    ],
    statement: `select count(*) as members from app.${AUTHZ_TABLE} where workspace_id = '${ids.workspace}';`,
    epilogue: ['rollback;'],
  });

  p.transcript = out.error
    ? `SQLSTATE ${out.error.code ?? '<none>'}: ${out.error.message}`
    : `no error; the read returned ${JSON.stringify(out.rows)}`;

  if (!out.error) {
    p.detail = "the naive recursive member-list policy did NOT raise. 010's header, and RFC-2026-020's whole "
      + 'reason for existing, rest on this cycle being real and being detected. If it is not, the justification '
      + 'for batch 011 has to be re-derived rather than assumed.';
    return p;
  }
  if (out.error.code !== '42P17') {
    p.detail = `the naive policy raised ${out.error.code ?? 'an error with no SQLSTATE'} rather than 42P17. That `
      + 'is a different failure and must not be read as this proof passing: the claim is that the RECURSION is '
      + 'detected, not that something went wrong.';
    return p;
  }
  p.ok = true;
  p.detail = 'the naive recursive member-list policy raises 42P17, verbatim above.';
  return p;
}

// -------------------------------------------------------------------------------------------
// §6.2/9 — that SECURITY DEFINER breaks it.
// -------------------------------------------------------------------------------------------
//
// Option G depends on a SECURITY DEFINER function NOT being inlined into the caller's plan: if it
// inlines, the body is spliced into a query already expanding app.workspace_members and the cycle
// is back. Three plans, taken one psql invocation at a time; see the header for why the pair is
// what makes this a measurement rather than an observation.
//
// The discriminator is structural: an inlined SQL function is GONE from the plan and its body is
// there instead — `current_setting` for the pair, a scan of app.workspace_members for the shipped
// helper. One that was not inlined appears as a call, and its body appears nowhere. Both halves are
// asserted in each direction, because either alone can be satisfied by a plan nobody expected.
export async function proveDefinerIsNotInlined(run, ids) {
  const p = proof('security-definer-is-not-inlined', 'RFC-2026-020 §6.2/9');

  // The pair's body is the identity expression, NOT a table read, and that choice is the whole
  // reason this control works. PostgreSQL's scalar-function inlining converts the body into an
  // expression in the calling query, so it applies only to a body that IS an expression: a
  // function with a FROM clause is never inlined by it, whatever its security mode. A pair built
  // from the helper's own table-reading body would therefore come back "not inlined" on BOTH
  // sides — a control that cannot demonstrate inlining at all, reporting agreement as proof.
  //
  // This body is the shape RFC-2026-020 §2.4 already measured being inlined on the provisioned
  // instance: `auth.uid()`, whose plan contained its body rather than a call. The pair below is
  // that shape with exactly one variable changed.
  const body = `select ${AUTHZ_IDENTITY_SQL}`;
  const explain = (call) => `explain (verbose, costs off) select ${call};`;

  const takePlan = async (label, create, call) => {
    const out = await run({
      prelude: create ? ['begin;', create] : ['begin;'],
      statement: explain(call),
      epilogue: ['rollback;'],
    });
    return { label, out, text: out.error ? '' : planText(out.rows) };
  };

  const invoker = await takePlan(
    'control: SECURITY INVOKER, no SET clause — must be INLINED',
    `create function app.__proof_invoker() returns uuid language sql stable as $fn$ ${body} $fn$;`,
    'app.__proof_invoker()');
  const definer = await takePlan(
    'control: SECURITY DEFINER, no SET clause — must NOT be inlined',
    `create function app.__proof_definer() returns uuid language sql stable security definer as $fn$ ${body} $fn$;`,
    'app.__proof_definer()');
  const shipped = await takePlan(
    'the helper batch 011 ships — must NOT be inlined',
    null,
    `app.workspace_member_role('${ids.workspace}'::uuid)`);

  const taken = [invoker, definer, shipped];
  p.transcript = taken
    .map((t) => `--- ${t.label} ---\n${t.out.error ? `error ${t.out.error.code}: ${t.out.error.message}` : t.text}`)
    .join('\n');

  const failedToPlan = taken.filter((t) => t.out.error);
  if (failedToPlan.length > 0) {
    p.detail = `${failedToPlan.map((t) => t.label).join(' and ')} could not be planned at all, so nothing about `
      + 'inlining was measured.';
    return p;
  }

  // An inlined function is GONE from the plan and its body is there instead. For the pair that is
  // `current_setting`; for the shipped helper, whose body reads a table, it would be a scan of
  // app.workspace_members. Both halves are checked — body present AND call absent — because either
  // one alone can be satisfied by a plan that says something unexpected.
  const bodyIn = (t) => /current_setting/.test(t.text);
  const callIn = (t, name) => new RegExp(name.replace(/[.()]/g, '\\$&')).test(t.text);

  if (!bodyIn(invoker) || callIn(invoker, 'app.__proof_invoker')) {
    p.detail = 'the SECURITY INVOKER control was NOT inlined, so this instrument cannot tell inlining from its '
      + 'absence and its verdict on the other two is worth nothing. A control that fails to demonstrate the '
      + 'effect it exists to demonstrate makes the whole proof vacuous — which is exactly what a green run would '
      + 'otherwise have hidden. RFC-2026-020 §2.4 measured this same shape being inlined, so if it is not '
      + 'inlined here, the difference between that instance and this container has to be understood before any '
      + 'of this means anything.';
    return p;
  }
  if (bodyIn(definer) || !callIn(definer, 'app.__proof_definer')) {
    p.detail = "a SECURITY DEFINER SQL function WAS inlined into the caller's plan, on the same body and with "
      + 'the same absent SET clause as the control above — so SECURITY DEFINER is not what stops inlining. '
      + 'RFC-2026-020 option G rests on it being exactly that, so THE DECISION IS WRONG: batch 011 must be '
      + 'reverted and the decision reopened, not worked around. Both plans are above.';
    return p;
  }
  if (new RegExp(AUTHZ_TABLE).test(shipped.text) || !callIn(shipped, 'app.workspace_member_role')) {
    p.detail = 'app.workspace_member_role — the helper batch 011 ships — was not left as a call in the plan. '
      + 'If its body was spliced in, the policy that calls it is expanding app.workspace_members inside a query '
      + 'already expanding it, and the cycle 42P17 detects is back.';
    return p;
  }
  p.ok = true;
  p.detail = 'the pair differs in prosecdef and in nothing else — same body, no SET clause on either — and the '
    + 'INVOKER one is inlined while the DEFINER one is not, so SECURITY DEFINER is what the difference measures. '
    + 'The shipped helper survives as a call, with no scan of app.workspace_members in its plan. It is also '
    + "protected a second time by set search_path = '', which blocks inlining on its own; that is why the pair "
    + 'deliberately carries no SET clause, since a pair copied from the helper would have proved nothing.';
  return p;
}

// -------------------------------------------------------------------------------------------
// §6.3/14 — the negative control.
// -------------------------------------------------------------------------------------------
//
// "With app_authz's single policy dropped, the member-list cases fail. Without it, a helper that
// silently bypasses is indistinguishable from one that is correctly policed."
//
// This is RFC-2026-020's whole security argument made falsifiable. The helper is SECURITY DEFINER,
// so it runs as app_authz — which holds no bypass, so what it can read is exactly what its one
// policy admits. If that policy were doing nothing, the roster would still come back complete and
// every isolation case would still pass.
export async function proveThePolicyIsLoadBearing(run, ids, expectedRoster) {
  const p = proof('app-authz-policy-is-load-bearing', 'RFC-2026-020 §6.3/14');
  const roster = (extra) => run({
    prelude: ['begin;', ...extra, ...asAuthenticated(ids.owner)],
    statement: `select count(*) as members from app.${AUTHZ_TABLE} where workspace_id = '${ids.workspace}';`,
    epilogue: ['rollback;'],
  });

  const withPolicy = await roster([]);
  const without = await roster([`drop policy ${AUTHZ_POLICY} on app.${AUTHZ_TABLE};`]);
  const shown = (out) => (out.error ? `error ${out.error.code}: ${out.error.message}` : `${out.rows[0]?.members} row(s)`);
  p.transcript = `with ${AUTHZ_POLICY}:    ${shown(withPolicy)}\nwith it dropped: ${' '.repeat(AUTHZ_POLICY.length - 12)}${shown(without)}`;

  if (withPolicy.error || without.error) {
    p.detail = 'one of the two reads failed outright, so the comparison establishes nothing.';
    return p;
  }
  const on = Number(withPolicy.rows[0]?.members);
  const off = Number(without.rows[0]?.members);
  if (on !== expectedRoster) {
    p.detail = `with the policy in place the owner sees ${on} member row(s) and workspace A has ${expectedRoster}. `
      + 'The roster policy is not doing what §8.1\'s "Member list SELECT: Owner Y" says, so the negative control '
      + 'has nothing to negate.';
    return p;
  }
  if (off !== 1) {
    p.detail = `with ${AUTHZ_POLICY} dropped the owner still sees ${off} member row(s) and should see exactly 1 — `
      + "their own, through 010's own policy. A helper that keeps answering after its policy is removed is reading "
      + 'rows that policy was supposed to be the only source of, which means it is bypassing rather than being '
      + 'policed, and the exemption is not the width RFC-2026-020 §5/3 says it is.';
    return p;
  }
  p.ok = true;
  p.detail = `the roster collapses from ${on} rows to 1 when ${AUTHZ_POLICY} is dropped, so that policy is what the `
    + 'member list rests on and the helper is policed rather than bypassing.';
  return p;
}

// -------------------------------------------------------------------------------------------
// §6.3/11 and §6.3/12 — asked THROUGH the helper.
// -------------------------------------------------------------------------------------------
//
// The isolation suite asks both of these of the TABLE. These ask them of the HELPER, which is a
// different execution context: inside it `current_user` is app_authz, and if the identity were
// being taken from the role rather than from the JWT, a suspended member would come back active
// and a stranger would come back a member.
export async function proveTheHelperAnswersOnlyForTheCaller(run, ids) {
  const p = proof('helper-is-not-a-membership-oracle', 'RFC-2026-020 §6.3/11, §6.3/12');
  const ask = (subject) => run({
    prelude: ['begin;', ...asAuthenticated(subject)],
    statement: `select coalesce(app.workspace_member_role('${ids.workspace}'::uuid), '<null>') as role,`
      + ` app.is_active_member('${ids.workspace}'::uuid) as member;`,
    epilogue: ['rollback;'],
  });

  const owner = await ask(ids.owner);
  const suspended = await ask(ids.suspended);
  const stranger = await ask(ids.ownerB);
  const shown = (out) => (out.error ? `error ${out.error.code}: ${out.error.message}` : JSON.stringify(out.rows[0]));
  p.transcript = [
    `active owner of A, asking about A:      ${shown(owner)}`,
    `SUSPENDED member of A, asking about A:  ${shown(suspended)}`,
    `owner of B, asking about A:             ${shown(stranger)}`,
  ].join('\n');

  if (owner.error || suspended.error || stranger.error) {
    p.detail = 'one of the three helper calls failed outright, so nothing is established.';
    return p;
  }
  if (owner.rows[0]?.role !== 'owner' || owner.rows[0]?.member !== 't') {
    p.detail = `the active owner of workspace A is not reported as its owner (${shown(owner)}). Without this the `
      + 'two negatives below are satisfied by the helper never answering anything at all.';
    return p;
  }
  if (suspended.rows[0]?.role !== '<null>' || suspended.rows[0]?.member !== 'f') {
    p.detail = `a SUSPENDED member of workspace A is reported as ${shown(suspended)}. §12.6 assertion 5 says a `
      + 'suspended member sees zero rows, and this is that assertion asked THROUGH the helper — the path a '
      + 'widened policy newly opens, and the one nothing had asked before batch 011.';
    return p;
  }
  if (stranger.rows[0]?.role !== '<null>' || stranger.rows[0]?.member !== 'f') {
    p.detail = `the owner of workspace B is reported as ${shown(stranger)} for workspace A. The helper is `
      + 'EXECUTE-granted to authenticated on purpose, so it is callable by anyone — and it must answer only '
      + 'about its caller, never become a membership oracle for third parties (§6.3/12).';
    return p;
  }
  p.ok = true;
  p.detail = 'the helper reports the active owner as owner, the suspended member as no member at all, and a '
    + 'stranger as no member of a workspace they are not in. It answers about the caller and nobody else.';
  return p;
}

// -------------------------------------------------------------------------------------------
// §6.3/13 — EXECUTE revoked from PUBLIC and granted explicitly.
// -------------------------------------------------------------------------------------------
export async function proveExecuteGrants(runOne) {
  const p = proof('execute-is-explicit', 'RFC-2026-020 §6.3/13, §8.5');
  const out = await runOne(
    'select p.proname::text as function,\n'
    + "       coalesce(array_to_string(p.proacl, ' '), '<default: PUBLIC may execute>') as acl\n"
    + '  from pg_catalog.pg_proc p\n'
    + '  join pg_catalog.pg_namespace n on n.oid = p.pronamespace\n'
    + '  join pg_catalog.pg_roles r on r.oid = p.proowner\n'
    + ` where n.nspname = 'app' and r.rolname = '${AUTHZ_ROLE}' order by 1;`);
  if (out.error) {
    p.transcript = `error ${out.error.code}: ${out.error.message}`;
    p.detail = 'the function ACLs could not be read, so nothing about who may execute them was checked.';
    return p;
  }
  p.transcript = out.rows.map((r) => `${r.function}: ${r.acl}`).join('\n');

  const problems = [];
  const CALLED_BY_A_POLICY = ['is_active_member', 'workspace_member_role'];
  if (out.rows.length === 0) problems.push(`no function in schema app is owned by ${AUTHZ_ROLE}, so batch 011 did not land`);
  for (const row of out.rows) {
    // A null ACL means the default, and the default is that PUBLIC may execute. An explicit entry
    // with nothing before the `=` is PUBLIC too.
    if (row.acl.startsWith('<default')) {
      problems.push(`${row.function} carries no explicit ACL, so PUBLIC may execute it — and PUBLIC reaches anon`);
    }
    if (/(^|\s)=[a-zA-Z]*X/.test(row.acl)) {
      problems.push(`${row.function} grants EXECUTE to PUBLIC, which reaches anon — batch 010 grants anon nothing anywhere`);
    }
    const toAuthenticated = /\bauthenticated=[a-zA-Z]*X/.test(row.acl);
    if (CALLED_BY_A_POLICY.includes(row.function) && !toAuthenticated) {
      problems.push(`${row.function} is not EXECUTE-granted to authenticated, so the policy that calls it cannot `
        + 'be evaluated by the identity it is written for');
    }
    if (row.function === 'jwt_subject' && toAuthenticated) {
      problems.push('jwt_subject is EXECUTE-granted to authenticated. Batch 011 grants it to nobody on purpose: it '
        + 'is called only from inside helpers that run as its owner, and no policy names it, so a grant here is a '
        + "callable surface — and, where app is the API's exposed schema, an RPC endpoint — with no caller");
    }
  }
  if (problems.length > 0) { p.detail = problems.join('; '); return p; }
  p.ok = true;
  p.detail = 'EXECUTE is revoked from PUBLIC on every helper, granted to authenticated on the two the policies '
    + 'call, and granted to nobody on jwt_subject.';
  return p;
}

// -------------------------------------------------------------------------------------------
// §6.1/1-6, against the database that actually has batch 011.
// -------------------------------------------------------------------------------------------
//
// The committed catalog snapshot describes the provisioned instance, which does not have this
// batch and must not: db/foundation/lint/catalog-snapshot.json declares that by name, and
// scripts/db/run.mjs refuses an `authz` block while the declaration stands and REQUIRES one the
// moment it is withdrawn. So these six rules are asked here, of the container, where the objects
// exist — through the same `authzLint` the snapshot path would call, never a second copy that
// could drift from it.
//
// TWO INSTRUMENT CHOICES RULE 6 TURNS ON, both found by CI reporting a finding on a correct
// database rather than by reasoning about them first.
//
//   * `has_table_privilege` is right and `has_any_column_privilege` is not: the first answers about
//     a TABLE-level grant, which is what rule 6 forbids, while the second is true whenever any
//     column is readable and would report batch 011's deliberately column-scoped SELECT as the
//     whole-table grant it exists to avoid.
//
//   * `has_schema_privilege` is WRONG for the schema half, and the first version used it. It
//     answers "can this role use this schema", which includes privileges held through PUBLIC — and
//     PUBLIC holds USAGE on schema `public` by default, so it reported `app_authz` holding a grant
//     nobody made it and that every role in the database holds equally. Rule 6 is about the grants
//     batch 011 MAKES, so the measurement reads the schema's own ACL for an entry naming the role;
//     `aclexplode` gives PUBLIC the grantee oid 0, which the join to pg_roles drops.
//
//     The PUBLIC-derived reach is not thereby hidden, which would be the same defect wearing the
//     other hat: `schemas_reachable_via_public` records it, measured, in the transcript every run
//     prints. It is not checked by rule 6 because it is not this batch's doing and is not what §6.1/6
//     is about — and it confers no read on any table, while the helpers' `search_path = ''` keeps
//     `public` off their resolution path entirely.
export const AUTHZ_CATALOG_SQL = `select json_build_object(
  'authz', json_build_object(
    'role', (select json_build_object(
               'canlogin', a.rolcanlogin, 'bypassrls', a.rolbypassrls, 'superuser', a.rolsuper,
               'inherit', a.rolinherit, 'has_password', (a.rolpassword is not null))
             from pg_catalog.pg_authid a where a.rolname = '${AUTHZ_ROLE}'),
    'owns_tables', (select coalesce(json_agg(c.relname order by c.relname), '[]'::json)
                      from pg_catalog.pg_class c
                      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                     where n.nspname in ('app','private') and c.relkind in ('r','p')
                       and pg_catalog.pg_get_userbyid(c.relowner) = '${AUTHZ_ROLE}'),
    'functions', (select coalesce(json_agg(json_build_object(
                      'function', n.nspname || '.' || p.proname,
                      'security_definer', p.prosecdef,
                      'config', coalesce(to_json(p.proconfig), '[]'::json)) order by p.proname), '[]'::json)
                    from pg_catalog.pg_proc p
                    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                   where pg_catalog.pg_get_userbyid(p.proowner) = '${AUTHZ_ROLE}'),
    'policies', (select coalesce(json_agg(json_build_object(
                     'table', c.relname, 'policy', pol.polname,
                     'command', case pol.polcmd when 'r' then 'select' when 'a' then 'insert'
                                                when 'w' then 'update' when 'd' then 'delete' else 'all' end,
                     'qual', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)) order by pol.polname), '[]'::json)
                   from pg_catalog.pg_policy pol
                   join pg_catalog.pg_class c on c.oid = pol.polrelid
                   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'app'
                    and exists (select 1 from pg_catalog.pg_authid r
                                 where r.oid = any (pol.polroles) and r.rolname = '${AUTHZ_ROLE}')),
    'grants', json_build_object(
      'schemas', (select coalesce(json_agg('USAGE on schema ' || n.nspname order by n.nspname), '[]'::json)
                    from pg_catalog.pg_namespace n
                   where exists (select 1
                                   from aclexplode(coalesce(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a
                                   join pg_catalog.pg_roles r on r.oid = a.grantee
                                  where r.rolname = '${AUTHZ_ROLE}' and a.privilege_type = 'USAGE')),
      'schemas_reachable_via_public', (
                 select coalesce(json_agg(n.nspname order by n.nspname), '[]'::json)
                   from pg_catalog.pg_namespace n
                  where n.nspname not like 'pg\\_%' and n.nspname <> 'information_schema'
                    and pg_catalog.has_schema_privilege('${AUTHZ_ROLE}', n.oid, 'USAGE')
                    and not exists (select 1
                                      from aclexplode(coalesce(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a
                                      join pg_catalog.pg_roles r on r.oid = a.grantee
                                     where r.rolname = '${AUTHZ_ROLE}' and a.privilege_type = 'USAGE')),
      'tables', (select coalesce(json_agg('app.' || c.relname order by c.relname), '[]'::json)
                   from pg_catalog.pg_class c
                   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'app' and c.relkind in ('r','p')
                    and pg_catalog.has_table_privilege('${AUTHZ_ROLE}', c.oid, 'SELECT')),
      'columns', (select coalesce(json_agg('app.' || c.relname || '.' || a.attname
                                           order by c.relname, a.attname), '[]'::json)
                    from pg_catalog.pg_class c
                    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
                   where n.nspname = 'app' and c.relkind in ('r','p')
                     and pg_catalog.has_column_privilege('${AUTHZ_ROLE}', c.oid, a.attnum, 'SELECT')))),
  'authenticator_memberships', (select coalesce(json_agg(g.rolname order by g.rolname), '[]'::json)
                                  from pg_catalog.pg_auth_members m
                                  join pg_catalog.pg_roles g on g.oid = m.roleid
                                  join pg_catalog.pg_roles mem on mem.oid = m.member
                                 where mem.rolname = 'authenticator')
)::text as catalog;`;

export async function measureAuthzCatalog(runOne) {
  const out = await runOne(AUTHZ_CATALOG_SQL);
  if (out.error) return { error: out.error };
  try {
    return { catalog: JSON.parse(out.rows[0].catalog) };
  } catch (failure) {
    return { error: { code: null, message: `the catalog measurement did not parse as JSON: ${failure.message}` } };
  }
}

// -------------------------------------------------------------------------------------------
// RFC-2026-027 §7.2 (a)-(d) and §5's cases 7, 8, 10 and 11 -- the lifecycle gate, executed.
// -------------------------------------------------------------------------------------------
//
// Batch 171 gives app_authz a second policy (workspaces_select_authz_own_open) and the helper a join to
// app.workspaces. RFC-2026-027 §7.2 lists four claims reading cannot settle; each is executed here, on every
// rls-smoke run, against workspace A as the fixture loads it. Every state change is made by the CONNECTION
// ROLE (the migration owner) inside the read's own transaction and rolled back: since batch 170 no client
// role can write lifecycle_state, which is the point.
//
//   (a) the helper is still a call, not inlined, after it reads a second table: proveDefinerIsNotInlined
//       above, unchanged, reads the shipped helper's plan.
//   (b) the new policy, evaluated AS app_authz, reaches app.workspace_members only through app_authz's own
//       policy and raises neither 42P17 nor a runtime recursion: a direct read as app_authz in all eight
//       states, which is also case 10 (the policy's conjunct alone) -- 1 row in active and closing, 0 in
//       the six blocked states.
//   (c) a family policy that calls the helper (business_profiles) is answered under app_authz's policy, not
//       under authenticated's own: with workspaces_select_active_member dropped, the owner still reads A's
//       businesses.
//   (d) whether a column referenced only inside app_authz's policy needs the grant: the helper's body reads
//       lifecycle_state itself, so revoking that one column makes the helper raise 42501 -- the grant is the
//       same whatever (d)'s answer, as the RFC says; the transcript records it.
//   case 7  with workspaces_select_authz_own_open dropped, the owner reads NO business in active or closing:
//           the policy is what admits the helper's read (RFC-2026-020 §6.3/14 as amended).
//   case 8  with 011's helper body restored, the owner of an access_blocked workspace reads its businesses
//           again: the gate is the helper's, and a gate that passes with the gate removed is not a gate.
//   case 11 with the policy's lifecycle conjunct removed, the owner of an access_blocked workspace still reads
//           no business: the helper's own conjunct answers by itself.
export const LIFECYCLE_ADMITTED = Object.freeze(['active', 'closing']);
export const LIFECYCLE_BLOCKED = Object.freeze(['access_blocked', 'purge_queued', 'held', 'purging', 'verify', 'deleted']);
export const HELPER_BODY_011 = `create or replace function app.workspace_member_role(workspace uuid)
returns text language sql stable security definer set search_path = '' as $fn$
  select m.role from app.workspace_members m
   where m.workspace_id = workspace and m.user_id = app.jwt_subject() and m.status = 'active'
   limit 1
$fn$;`;

const moveWorkspace = (workspace, state) => `update app.workspaces set lifecycle_state = '${state}' where id = '${workspace}';`;
const asAuthz = (subject) => [
  `set local role ${AUTHZ_ROLE};`,
  `select set_config('request.jwt.claims', json_build_object('role','authenticated','sub','${subject}')::text, true) as claims;`,
];

export async function proveTheLifecycleGate(run, ids) {
  const p = proof('lifecycle-gate-is-the-helpers-and-the-policys', 'RFC-2026-027 §7.2 (a)-(d), §5 cases 7, 8, 10, 11');
  const lines = [];
  const problems = [];
  const shown = (out) => (out.error ? `error ${out.error.code}: ${out.error.message}` : `${out.rows[0]?.n} row(s)`);
  const count = (out) => (out.error ? null : Number(out.rows[0]?.n));
  const businesses = (prelude) => run({
    prelude: ['begin;', ...prelude, ...asAuthenticated(ids.owner)],
    statement: `select count(*) as n from app.business_profiles where workspace_id = '${ids.workspace}';`,
    epilogue: ['rollback;'],
  });

  // (b) and case 10: the policy alone, read as app_authz, in all eight states.
  for (const state of [...LIFECYCLE_ADMITTED, ...LIFECYCLE_BLOCKED]) {
    const out = await run({
      prelude: ['begin;', moveWorkspace(ids.workspace, state), ...asAuthz(ids.owner)],
      statement: `select count(*) as n from app.${AUTHZ_WORKSPACES_TABLE} where id = '${ids.workspace}';`,
      epilogue: ['rollback;'],
    });
    const want = LIFECYCLE_ADMITTED.includes(state) ? 1 : 0;
    lines.push(`(b)/case 10  as ${AUTHZ_ROLE}, owner of A, A ${state.padEnd(14)}: ${shown(out)} (want ${want})`);
    if (out.error) problems.push(`(b) the read as ${AUTHZ_ROLE} in ${state} raised ${out.error.code}: ${out.error.message} -- 42P17 or a stack-depth error is the recursion RFC-2026-027 §3.1 forbids`);
    else if (count(out) !== want) problems.push(`case 10: as ${AUTHZ_ROLE} the owner of A reads ${count(out)} row(s) of A in ${state} and the policy's own conjunct admits ${want}`);
  }

  // The baseline every negative below is measured against: the owner reads A's businesses in active.
  const base = await businesses([]);
  lines.push(`baseline     authenticated owner of A, A active: businesses ${shown(base)}`);
  if (base.error || !(count(base) > 0)) problems.push('the owner of A reads no business of A in active, so every negative below is vacuous');

  // (c) authenticated's own workspaces policy dropped: the helper's read is app_authz's, so nothing changes.
  const noAuthPolicy = await businesses(['drop policy workspaces_select_active_member on app.workspaces;']);
  lines.push(`(c)          workspaces_select_active_member dropped: businesses ${shown(noAuthPolicy)}`);
  if (noAuthPolicy.error || count(noAuthPolicy) !== count(base)) problems.push(`(c) with authenticated's own workspaces policy dropped the owner reads ${shown(noAuthPolicy)} and should read ${count(base)}: the helper's read of app.workspaces depends on authenticated's policy, not app_authz's`);

  // case 7: the new policy dropped, in both admitted states.
  for (const state of LIFECYCLE_ADMITTED) {
    const off = await businesses([moveWorkspace(ids.workspace, state), `drop policy ${AUTHZ_WORKSPACES_POLICY} on app.${AUTHZ_WORKSPACES_TABLE};`]);
    lines.push(`case 7       ${AUTHZ_WORKSPACES_POLICY} dropped, A ${state}: businesses ${shown(off)} (want 0)`);
    if (off.error || count(off) !== 0) problems.push(`case 7: with ${AUTHZ_WORKSPACES_POLICY} dropped the owner of a ${state} workspace still reads ${shown(off)}; the policy is not what admits the helper's read`);
  }

  // case 8 and case 11, in EVERY blocked state (RFC-2026-027 §5/11 says "in every blocked state"; batch 171's
  // review round, C0 L2, widened both from access_blocked alone). Read on business_profiles, the family
  // open_blockers[53] names; the per-family sweep (§5/1) is the rls-smoke cases'.
  for (const state of LIFECYCLE_BLOCKED) {
    const blocked = await businesses([moveWorkspace(ids.workspace, state)]);
    const oldBody = await businesses([moveWorkspace(ids.workspace, state), HELPER_BODY_011,
      `alter function app.workspace_member_role(uuid) owner to ${AUTHZ_ROLE};`]);
    const noConjunct = await businesses([moveWorkspace(ids.workspace, state),
      `drop policy ${AUTHZ_WORKSPACES_POLICY} on app.${AUTHZ_WORKSPACES_TABLE};`,
      `create policy ${AUTHZ_WORKSPACES_POLICY} on app.${AUTHZ_WORKSPACES_TABLE} for select to ${AUTHZ_ROLE} using (exists (select 1 from app.workspace_members m where m.workspace_id = app.workspaces.id and m.user_id = app.jwt_subject() and m.status = 'active'));`]);
    lines.push(`gate         A ${state.padEnd(14)}: businesses ${shown(blocked)} (want 0)`);
    lines.push(`case 8       011's helper body restored, A ${state.padEnd(14)}: businesses ${shown(oldBody)} (want ${count(base)})`);
    lines.push(`case 11      the policy's lifecycle conjunct removed, A ${state.padEnd(14)}: businesses ${shown(noConjunct)} (want 0)`);
    if (blocked.error || count(blocked) !== 0) problems.push(`the owner of a ${state} workspace reads ${shown(blocked)} of its businesses; the gate does not hold`);
    if (oldBody.error || count(oldBody) !== count(base)) problems.push(`case 8: with 011's helper body restored the owner of a ${state} workspace reads ${shown(oldBody)} and should read ${count(base)}; the refusal above is not the helper's`);
    if (noConjunct.error || count(noConjunct) !== 0) problems.push(`case 11: with the policy's lifecycle conjunct removed the owner of a ${state} workspace reads ${shown(noConjunct)}; the helper's own conjunct does not answer by itself`);
  }

  // (d): the helper's body reads lifecycle_state, so the column grant is needed whatever the policy needs.
  const noColumn = await run({
    prelude: ['begin;', `revoke select (lifecycle_state) on app.${AUTHZ_WORKSPACES_TABLE} from ${AUTHZ_ROLE};`, ...asAuthenticated(ids.owner)],
    statement: `select app.workspace_member_role('${ids.workspace}'::uuid) as n;`,
    epilogue: ['rollback;'],
  });
  lines.push(`(d)          lifecycle_state revoked from ${AUTHZ_ROLE}: helper ${noColumn.error ? `error ${noColumn.error.code}` : `returned ${JSON.stringify(noColumn.rows[0]?.n)}`} (want 42501)`);
  if (!noColumn.error || noColumn.error.code !== '42501') problems.push(`(d) with lifecycle_state revoked from ${AUTHZ_ROLE} the helper did not raise 42501 (${shown(noColumn)}); the six-column grant is not what the helper reads through`);

  p.transcript = `pinned qual of ${AUTHZ_WORKSPACES_POLICY}:\n${AUTHZ_WORKSPACES_POLICY_QUAL}\n${lines.join('\n')}`;
  if (problems.length > 0) { p.detail = problems.join('; '); return p; }
  p.ok = true;
  p.detail = `the read as ${AUTHZ_ROLE} raises no recursion and admits A only in active and closing (b, case 10); the helper's `
    + `read does not depend on authenticated's own workspaces policy (c); dropping ${AUTHZ_WORKSPACES_POLICY} empties the `
    + "admitted states (case 7); restoring 011's body re-opens each of the six blocked states (case 8); removing the "
    + "policy's conjunct leaves each closed (case 11); and the helper needs the lifecycle_state grant itself (d).";
  return p;
}

// -------------------------------------------------------------------------------------------
// BATCH 141 (migration 172): RFC-2026-023 §6's negative controls and RFC-2026-026 §8.2/7, /14 and /16, executed.
// -------------------------------------------------------------------------------------------
//
// The isolation cases (tests/db/identity/isolation-cases.mjs, the batch 141 section) hold what the shipped objects
// do. These hold that the cases would NOTICE if an object stopped doing it: each changes one object inside its own
// rolled-back transaction, as the connection role, and asserts that the claim the case rests on goes the other way.
//
// The acting-user narrowing (RFC-2026-023 §6), asked as app_command with a user's claims:
//   scope    with app_authz's policy on app.workspace_member_scopes dropped, the page editor's sibling page is
//            ADMITTED (the helper reads no scope row and answers "not narrowed") -- §0/7(b)'s failure, red;
//   column   with scope_type withheld from app_authz, the helper raises 42501 at first call (Q0-R7);
//   gate     in each of the six blocked states the shipped helper refuses the owner, and a helper rewritten to
//            repeat 011's join without the lifecycle conjunct admits them -- the inheritance is what refuses.
// The closing command (RFC-2026-026 §8.2), one call as `authenticated` with the owner's claims, read back as the
// connection role (the call's outcome or SQLSTATE, the workspace's state, the audit rows for its request):
//   /14      with audit_logs_insert_command dropped, neither the succeeded nor the denied call can complete;
//   arm      with workspaces_update_command_owner dropped, the close FAILS and records it, and the state stays;
//   Q0-RC1   with workspaces_select_command_owner dropped, the close never reports success and changes nothing;
//   /7       with a CHECK the succeeded row violates, the call raises (23514) and the change is absent;
//   /16      with a restrictive `with check (outcome <> 'succeeded')` for app_command, the succeeded call RAISES
//            42501 (it is not swallowed as a denial) and leaves no row; the control, a refused call under the same
//            injection, returns denied with exactly one denied row; and the self-test, a copy of the command whose
//            succeeded INSERT sits inside a handler catching insufficient_privilege, RETURNS denied with a denied
//            row under the same injection -- so the case tells the two functions apart.
const PROOF_REQUEST = 'batch-141-proof';
const claimsOf = (subject, aal) => JSON.stringify({ role: 'authenticated', sub: subject, ...(aal ? { aal } : {}) });
const asCommand = (subject) => [
  'set local role app_command;',
  `select set_config('request.jwt.claims', '${claimsOf(subject)}', true) as claims;`,
];

// One call of a command function as `authenticated`, after `setup` (as the connection role), in one transaction
// that is rolled back. Returns { call, state, audit } read back as the connection role, or { error }.
export async function commandProbe(run, { setup = [], subject, aal, fn = 'close_workspace', workspace }) {
  const out = await run({
    prelude: ['begin;', ...setup, 'create temp table __proof_141 (k text, v text) on commit drop;',
      `do $do$
declare
  r   record;
  got text;
begin
  perform pg_catalog.set_config('request.jwt.claims', '${claimsOf(subject, aal)}', true);
  perform pg_catalog.set_config('role', 'authenticated', true);
  begin
    select * into r from app.${fn}('${workspace}'::uuid, '${PROOF_REQUEST}', '${PROOF_REQUEST}-correlation');
    got := 'returned ' || coalesce(r.outcome, 'null') || ' ' || coalesce(r.error_code, '-');
  exception when others then
    got := 'raised ' || sqlstate;
  end;
  perform pg_catalog.set_config('role', 'none', true);
  insert into __proof_141 values ('call', got);
  insert into __proof_141 select 'state', w.lifecycle_state from app.workspaces w where w.id = '${workspace}';
  insert into __proof_141 select 'audit', coalesce(string_agg(a.outcome || ':' || coalesce(a.error_code, '-'), ',' order by a.outcome), '')
    from app.audit_logs a where a.request_id = '${PROOF_REQUEST}';
end
$do$;`],
    statement: 'select k, v from __proof_141 order by k;',
    epilogue: ['rollback;'],
  });
  if (out.error) return { error: out.error };
  const seen = Object.fromEntries(out.rows.map((r) => [r.k, r.v]));
  return { call: seen.call ?? '', state: seen.state ?? '', audit: seen.audit ?? '' };
}

export const WRONG_CLOSE_WORKSPACE = `create or replace function app.close_workspace(
  workspace uuid, request_id text, correlation_id text,
  out outcome text, out error_code text, out lifecycle_state text)
language plpgsql volatile security definer set search_path = '' as $fn$
declare
  acting  uuid := app.jwt_subject();
  changed uuid;
begin
  begin
    update app.workspaces as w set lifecycle_state = 'closing', updated_by = acting
     where w.id = workspace and w.lifecycle_state = 'active' returning w.id into changed;
    insert into app.audit_logs (workspace_id, occurred_at, actor_kind, actor_id, action_category, action_name, outcome,
      reason_key, request_id, correlation_id, change_before_ref, error_code, secret_redacted, content_redacted, pii_redacted,
      retention_policy_ref)
    values (changed, now(), 'user', acting::text, 'delete', 'workspace.lifecycle.close', 'succeeded',
      'audit.workspace.closing_started', request_id, correlation_id, 'record:app.workspaces/proof', null, true, true, true,
      'retention.audit');
    outcome := 'succeeded'; lifecycle_state := 'closing';
  exception when insufficient_privilege then
    insert into app.audit_logs (workspace_id, occurred_at, actor_kind, actor_id, action_category, action_name, outcome,
      reason_key, request_id, correlation_id, change_before_ref, error_code, secret_redacted, content_redacted, pii_redacted,
      retention_policy_ref)
    values (workspace, now(), 'user', acting::text, 'delete', 'workspace.lifecycle.close', 'denied',
      'audit.workspace.close_refused', request_id, correlation_id, 'record:app.workspaces/proof',
      'workspace.lifecycle.not_permitted', true, true, true, 'retention.audit');
    outcome := 'denied'; error_code := 'workspace.lifecycle.not_permitted';
  end;
end
$fn$;
alter function app.close_workspace(uuid, text, text) owner to app_command;`;

export const HELPER_WITHOUT_THE_GATE = `create or replace function app.acting_user_admits_business(workspace uuid, business uuid)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select exists (select 1 from app.workspace_members m
                  where m.workspace_id = workspace and m.user_id = app.jwt_subject() and m.status = 'active')
     and (not exists (select 1 from app.workspace_member_scopes s
                       where s.workspace_id = workspace and s.user_id = app.jwt_subject())
          or exists (select 1 from app.workspace_member_scopes s
                      where s.workspace_id = workspace and s.user_id = app.jwt_subject()
                        and (s.scope_type = 'all_businesses' or s.business_profile_id = business)))
$fn$;
alter function app.acting_user_admits_business(uuid, uuid) owner to ${AUTHZ_ROLE};`;

export async function proveTheActingUserNarrowing(run, ids) {
  const p = proof('acting-user-helpers-are-narrowed-and-gated', 'RFC-2026-023 §6, §0/7, Q-023-2');
  const lines = [];
  const problems = [];
  const ask = async (setup, subject, expression) => run({
    prelude: ['begin;', ...setup, ...asCommand(subject)],
    statement: `select (${expression})::text as v;`,
    epilogue: ['rollback;'],
  });
  const shown = (out) => (out.error ? `error ${out.error.code}` : String(out.rows[0]?.v));
  const sibling = `app.acting_user_admits_page('${ids.workspace}'::uuid, '${ids.businessA1}'::uuid, '${ids.pageA1Sibling}'::uuid)`;
  const own = `app.acting_user_admits_page('${ids.workspace}'::uuid, '${ids.businessA1}'::uuid, '${ids.pageA1}'::uuid)`;
  const business = `app.acting_user_admits_business('${ids.workspace}'::uuid, '${ids.businessA1}'::uuid)`;

  const base = await ask([], ids.pageEditor, `${own} and not ${sibling}`);
  lines.push(`baseline     page editor: own page admitted and sibling refused: ${shown(base)} (want true)`);
  if (shown(base) !== 'true') problems.push(`the page editor is not admitted to its page and refused its sibling (${shown(base)}); every control below is vacuous`);

  const noPolicy = await ask(['drop policy workspace_member_scopes_select_authz_own on app.workspace_member_scopes;'], ids.pageEditor, sibling);
  lines.push(`scope        app_authz's scope policy dropped, sibling page: ${shown(noPolicy)} (want true: the vacuous shape)`);
  if (shown(noPolicy) !== 'true') problems.push(`with app_authz's policy on workspace_member_scopes dropped the sibling page reads ${shown(noPolicy)}; the policy is not what the narrowing rests on`);

  const noColumn = await ask([`revoke select (scope_type) on app.workspace_member_scopes from ${AUTHZ_ROLE};`], ids.pageEditor, sibling);
  lines.push(`column       scope_type withheld from ${AUTHZ_ROLE}: ${shown(noColumn)} (want error 42501)`);
  if (!noColumn.error || noColumn.error.code !== '42501') problems.push(`with scope_type withheld the helper did not raise 42501 (${shown(noColumn)}); the five-column grant is not held by execution`);

  for (const state of LIFECYCLE_BLOCKED) {
    const shipped = await ask([moveWorkspace(ids.workspace, state)], ids.owner, business);
    const ungated = await ask([moveWorkspace(ids.workspace, state), HELPER_WITHOUT_THE_GATE], ids.owner, business);
    lines.push(`gate         A ${state.padEnd(14)}: shipped helper ${shown(shipped)} (want false); 011's join without the conjunct ${shown(ungated)} (want true)`);
    if (shown(shipped) !== 'false') problems.push(`the shipped helper admits the owner of a ${state} workspace (${shown(shipped)})`);
    if (shown(ungated) !== 'true') problems.push(`a helper repeating 011's join without the lifecycle conjunct refuses the owner of a ${state} workspace too (${shown(ungated)}); the gate's case would not notice its loss`);
  }
  p.transcript = lines.join('\n');
  if (problems.length > 0) { p.detail = problems.join('; '); return p; }
  p.ok = true;
  p.detail = 'the scope half rests on app_authz\'s policy (dropped: the sibling page is admitted) and on the scope_type '
    + 'column (withheld: 42501 at first call); the admitted-state gate is inherited through app.is_active_member (a '
    + 'helper repeating 011\'s join admits the owner of each blocked workspace, the shipped one refuses).';
  return p;
}

export async function proveTheClosingCommand(run, ids) {
  const p = proof('closing-command-writes-its-audit-row-or-nothing', 'RFC-2026-026 §8.2/7, /14, /16; RFC-2026-023 §8, Q0-RC1');
  const lines = [];
  const problems = [];
  const probe = (label, setup, aal, want) => ({ label, setup, aal, want });
  const RESTRICT = "create policy __proof_refuse_succeeded on app.audit_logs as restrictive for insert to app_command with check (outcome <> 'succeeded');";
  const checks = [
    probe('baseline, stepped up', [], 'aal2', { call: 'returned succeeded -', state: 'closing', audit: 'succeeded:-' }),
    probe('baseline, no step-up', [], null, { call: 'returned denied workspace.lifecycle.step_up_required', state: 'active', audit: 'denied:workspace.lifecycle.step_up_required' }),
    probe('/14 producer policy dropped, stepped up', ['drop policy audit_logs_insert_command on app.audit_logs;'], 'aal2', { call: 'raised 42501', state: 'active', audit: '' }),
    probe('/14 producer policy dropped, no step-up', ['drop policy audit_logs_insert_command on app.audit_logs;'], null, { call: 'raised 42501', state: 'active', audit: '' }),
    probe('arm: UPDATE policy dropped', ['drop policy workspaces_update_command_owner on app.workspaces;'], 'aal2', { call: 'returned failed workspace.lifecycle.write_failed', state: 'active', audit: 'failed:workspace.lifecycle.write_failed' }),
    probe('Q0-RC1: SELECT path dropped', ['drop policy workspaces_select_command_owner on app.workspaces;'], 'aal2', { call: 'returned denied workspace.lifecycle.not_active', state: 'active', audit: 'denied:workspace.lifecycle.not_active' }),
    probe('/7 a CHECK the succeeded row violates', ["alter table app.audit_logs add constraint __proof_refuse_succeeded check (outcome <> 'succeeded') not valid;"], 'aal2', { call: 'raised 23514', state: 'active', audit: '' }),
    probe('/16 restrictive injection, stepped up', [RESTRICT], 'aal2', { call: 'raised 42501', state: 'active', audit: '' }),
    probe('/16 control: same injection, no step-up', [RESTRICT], null, { call: 'returned denied workspace.lifecycle.step_up_required', state: 'active', audit: 'denied:workspace.lifecycle.step_up_required' }),
    probe('/16 self-test: the wrong function under the injection', [RESTRICT, WRONG_CLOSE_WORKSPACE], 'aal2', { call: 'returned denied workspace.lifecycle.not_permitted', state: 'active', audit: 'denied:workspace.lifecycle.not_permitted' }),
  ];
  for (const c of checks) {
    const seen = await commandProbe(run, { setup: c.setup, subject: ids.owner, aal: c.aal, workspace: ids.workspace });
    if (seen.error) {
      lines.push(`${c.label.padEnd(52)}: probe error ${seen.error.code}: ${seen.error.message}`);
      problems.push(`${c.label}: the probe itself failed (${seen.error.code}: ${seen.error.message})`);
      continue;
    }
    lines.push(`${c.label.padEnd(52)}: ${seen.call}; state ${seen.state}; audit [${seen.audit}]`);
    for (const k of ['call', 'state', 'audit']) {
      if (seen[k] !== c.want[k]) problems.push(`${c.label}: ${k} is ${JSON.stringify(seen[k])} and should be ${JSON.stringify(c.want[k])}`);
    }
  }
  p.transcript = lines.join('\n');
  if (problems.length > 0) { p.detail = problems.join('; '); return p; }
  p.ok = true;
  p.detail = 'the close writes its succeeded row in its own transaction or nothing happens (the producer policy dropped '
    + 'or a CHECK violated: the call raises and the state stays active); a refused audit write is never recorded as the '
    + 'user\'s denial (case 16, its control, and its self-test with the wrong function, which returns denied instead of '
    + 'raising); without its UPDATE policy the close records a failure, and without its SELECT path it never reports success.';
  return p;
}

export async function runProofs(run, runOne, ids, expectedRoster) {
  const results = [
    await proveCycleExists(run, ids),
    await proveDefinerIsNotInlined(run, ids),
    await proveThePolicyIsLoadBearing(run, ids, expectedRoster),
    await proveTheHelperAnswersOnlyForTheCaller(run, ids),
    await proveExecuteGrants(runOne),
    await proveTheLifecycleGate(run, ids),
    await proveTheActingUserNarrowing(run, ids),
    await proveTheClosingCommand(run, ids),
  ];

  const measured = await measureAuthzCatalog(runOne);
  const p = proof('catalog-satisfies-rfc-2026-020-6.1', 'RFC-2026-020 §6.1/1-6');
  if (measured.error) {
    p.transcript = `error ${measured.error.code}: ${measured.error.message}`;
    p.detail = 'the batch-011 catalog could not be measured, so rules 1-6 were checked nowhere.';
  } else {
    const problems = authzLint(measured.catalog);
    p.transcript = JSON.stringify(measured.catalog.authz, null, 2);
    p.ok = problems.length === 0;
    p.detail = problems.length === 0
      ? `every rule RFC-2026-020 §6.1/1-6 states holds against the database ${AUTHZ_MIGRATION} was just applied `
        + `to, including all three pinned policy expressions:\n         ${AUTHZ_POLICY_QUAL}\n         ${AUTHZ_WORKSPACES_POLICY_QUAL}\n         ${AUTHZ_SCOPES_POLICY_QUAL}`
      : problems.join('\n         ');
  }
  results.push(p);
  return results;
}

export function formatProofs(results) {
  const failed = results.filter((r) => !r.ok);
  const lines = [];
  for (const r of results) {
    lines.push(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.id} [${r.requires}]`);
    for (const line of String(r.transcript).split('\n')) lines.push(`       | ${line}`);
    lines.push(`       ${r.ok ? '' : '=> '}${r.detail}`);
  }
  lines.push(failed.length === 0
    ? `db-authz-proofs: ok — ${results.length} claim(s) discharged by execution.`
    : `db-authz-proofs: FAILED — ${failed.length} of ${results.length}: ${failed.map((f) => f.id).join(', ')}`);
  return `${lines.join('\n')}\n`;
}

export async function main(run = queryFinal, runOne = query) {
  const resolve = await fixtureResolver();
  const ids = {
    owner: resolve(OWNER_A),
    suspended: resolve(SUSPENDED_A),
    ownerB: resolve(OWNER_B),
    workspace: resolve(WORKSPACE_A),
    pageEditor: resolve(PAGE_EDITOR_A),
    businessA1: resolve(BUSINESS_A1),
    pageA1: resolve(PAGE_A1),
    pageA1Sibling: resolve(PAGE_A1_SIBLING),
  };

  // How many members workspace A actually has, asked of the database as the connection role rather
  // than pinned here. Pinning it would mean that adding a member to the fixture silently turned the
  // roster assertion into a weaker one, which is the failure this repository keeps finding in its
  // own counts.
  const size = await runOne(
    `select count(*) as members from app.${AUTHZ_TABLE} where workspace_id = '${ids.workspace}';`);
  if (size.error) {
    stderr.write(`db-authz-proofs: could not count workspace A's members: ${size.error.message}\n`);
    return 1;
  }
  const expectedRoster = Number(size.rows[0]?.members);
  if (!Number.isInteger(expectedRoster) || expectedRoster < 2) {
    stderr.write(`db-authz-proofs: workspace A has ${expectedRoster} member row(s). The roster proof needs a `
      + 'workspace with more members than the caller\'s own row, or "the owner sees the whole list" and "the owner '
      + 'sees only themselves" are the same number and the negative control cannot fail.\n');
    return 1;
  }

  const results = await runProofs(run, runOne, ids, expectedRoster);
  stdout.write(formatProofs(results));
  return results.every((r) => r.ok) ? 0 : 1;
}

// Real paths on both sides, the repository's runner idiom: `file://${argv[1]}` never matched in a clone whose path
// holds a space or a percent sign, and `pathToFileURL(argv[1])` never matched a script named through a symlink
// (/tmp is one on macOS; C0-TIR-1, A1 R1), so main() was skipped and the process exited 0 having run nothing.
if (argv[1] && realpathSync(argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { connectionString(); } catch (failure) {
    stderr.write(`db-authz-proofs: ${failure.message}\n`);
    exit(1);
  }
  exit(await main());
}
