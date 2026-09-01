import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { validate } from './json-schema-subset.mjs';

// Independent testing mutation-tested this catalog and found that 84 of 92 constraint sites
// in CTR-MOD-001 and 65 of 77 in CTR-FLG-001 were exercised by NO fixture. Deleting the
// PT-010 secret_handles credential pattern, the readiness.missing enum, the bucket bounds
// and the expires_at obligation each left `npm run check` green at 85/85. Writing rules
// schema-first stopped them drifting into tests; it did nothing to make them TESTED.
//
// A constraint no fixture can kill is documentation. This suite deletes each protected
// constraint and requires some declared fixture to change verdict.
const CATALOG = 'contract-catalog/shared-kernel';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

// Sites whose deletion must be observable. Chosen because each one is the only thing
// standing between a fixture and a real hazard: a credential in a manifest, an
// unaccountable activation denial, an unbounded rollout, a flag that never expires,
// a policy decision that reports the wrong effect, and a precedence order.
const PROTECTED = [
  ['ctr-mod-001', ['properties', 'secret_handles', 'items', 'pattern']],
  ['ctr-mod-001', ['properties', 'lifecycle', 'properties', 'readiness', 'properties', 'missing', 'items', 'enum']],
  ['ctr-mod-001', ['properties', 'version', 'pattern']],
  ['ctr-mod-001', ['properties', 'data_policy', 'properties', 'classification', 'enum']],
  ['ctr-flg-001', ['properties', 'bucket', 'properties', 'percentage', 'maximum']],
  ['ctr-flg-001', ['properties', 'evaluated_scopes', 'enum']],
  ['ctr-flg-001', ['properties', 'reason_key', 'pattern']],
  // Independent review measured CTR-SEC-001 at 16.0%, CTR-AUD-001 at 19.4% and CTR-OBS-001
  // at 15.7% -- the same band CON-003 sat in before fixtures were added for it, and the 31
  // new fixtures did not move it. It named the specific sites defended by nothing: five of
  // six redaction const-true surfaces, though freeze_boundary says the contract "materializes
  // exactly" that requirement; SEC-009's six action categories, the package's best citation;
  // and the whole dependencies subtree, so M1's enum was tested by nothing.
  ['ctr-sec-001', ['properties', 'handle', 'pattern']],
  ['ctr-sec-001', ['properties', 'redaction', 'properties', 'browser_safe', 'const']],
  ['ctr-sec-001', ['properties', 'redaction', 'properties', 'log_safe', 'const']],
  ['ctr-sec-001', ['properties', 'redaction', 'properties', 'event_safe', 'const']],
  ['ctr-sec-001', ['properties', 'redaction', 'properties', 'job_safe', 'const']],
  ['ctr-sec-001', ['properties', 'redaction', 'properties', 'analytics_safe', 'const']],
  ['ctr-sec-001', ['properties', 'redaction', 'properties', 'error_trace_safe', 'const']],
  ['ctr-aud-001', ['properties', 'action', 'properties', 'category', 'enum']],
  ['ctr-obs-001', ['properties', 'dependencies', 'items', 'properties', 'status', 'enum']],
  // Independent testing measured CTR-USG-001 at 7.0% -- the lowest of the session -- and
  // CTR-NTF-001 at 24.5%, and found neither contract had a single entry here. The guard
  // built for exactly this defect had not been extended to the packages that followed it.
  // These are the sites it named as carrying a guarantee and killed by nothing.
  ['ctr-usg-001', ['properties', 'cost', 'properties', 'amount', 'pattern']],
  ['ctr-usg-001', ['properties', 'quantity', 'properties', 'amount', 'pattern']],
  ['ctr-usg-001', ['properties', 'cost', 'properties', 'currency', 'enum']],
  ['ctr-usg-001', ['required']],
  ['ctr-ntf-001', ['properties', 'deep_link', 'required']],
  ['ctr-ntf-001', ['properties', 'deep_link', 'properties', 'requires_permission', 'const']],
  ['ctr-ntf-001', ['properties', 'deep_link', 'properties', 'target_ref', 'pattern']],
  ['ctr-ntf-001', ['properties', 'delivery', 'properties', 'state', 'enum']],
  ['ctr-ntf-001', ['properties', 'locale', 'enum']],
  ['ctr-ntf-001', ['required']],
];

function without(schema, path) {
  const copy = structuredClone(schema);
  let node = copy;
  for (const key of path.slice(0, -1)) {
    if (node?.[key] === undefined) return null;
    node = node[key];
  }
  if (node?.[path.at(-1)] === undefined) return null;
  delete node[path.at(-1)];
  return copy;
}

async function fixturesOf(dir) {
  const base = join(CATALOG, dir);
  const manifest = await readJson(join(base, 'manifest.json'));
  const schema = await readJson(join(base, 'schema.json'));
  const refs = {};
  const walk = async (node) => {
    if (Array.isArray(node)) { for (const item of node) await walk(item); return; }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string' && !value.startsWith('#')) {
        refs[value] = await readJson(join(base, value).replace(/[^/]+\/\.\.\//g, ''));
      } else await walk(value);
    }
  };
  await walk(schema);
  const bodies = [];
  for (const fixture of manifest.fixtures ?? []) bodies.push({ fixture, body: await readJson(join(base, fixture)) });
  return { schema, bodies, resolve: (ref) => refs[ref] ?? null };
}

const verdicts = (schema, bodies, resolve) =>
  bodies.map(({ body }) => validate(schema, body, { resolve }).length === 0).join(',');

// A hand-maintained list of protected sites has a failure mode this Author demonstrated:
// WP-0A-CON-006 shipped two contracts and added neither to the list, and independent testing
// measured one of them at 7.0% -- the lowest of the session -- precisely because the guard
// built for that defect was never extended to it. A list you must remember to extend is a
// list you will forget to extend.
//
// So the floor is computed per contract instead of enumerated. Every contract must reach it,
// including one added tomorrow by someone who never reads this file.
// Set to bite, not to pass. Independent review showed the previous 30% floor failed nothing
// -- the weakest contract cleared it by ONE killed site -- and that the metric it measured was
// gameable in both directions. With the metric counting assertion keywords only, the true
// catalog figure was 19.3%, not the 42.4% previously reported. 397 single-fault
// counterexamples later the catalog is at 82.1% and the weakest contract at 72.4%, so a 70%
// floor leaves roughly two sites of headroom on the weakest and fails anything that regresses.
const COVERAGE_FLOOR = 0.70;
// A RATIO always rewards shrinking its denominator. Independent testing deleted six real but
// untested rules from ctr-mod-001 and the score ROSE 72.4% -> 77.8% with CI green, because a
// rule nothing tests is a rule you are rewarded for removing.
//
// A ceiling on UNKILLED sites alone does not fix it either: deleting an untested rule lowers
// that count too. What deletion cannot do is preserve the TOTAL. So each contract declares a
// floor on its constraint-site count, and a rule can only leave the catalog by lowering a
// number someone has to edit deliberately, in a diff a reviewer reads.
const SITE_FLOOR = { 'ctr-api-001': 38, 'ctr-aud-001': 63, 'ctr-err-001': 23, 'ctr-evt-001': 42,
  'ctr-flg-001': 74, 'ctr-idm-001': 36, 'ctr-job-001': 40, 'ctr-mod-001': 87, 'ctr-ntf-001': 39,
  'ctr-obs-001': 83, 'ctr-pag-001': 38, 'ctr-sec-001': 76, 'ctr-ten-001': 23, 'ctr-usg-001': 37 };

// Held at the measured actual, not at a round number above it. Slack in this ceiling is
// room for coverage to regress without anything failing, so every fixture that closes a
// site tightens it in the same commit.
const UNKILLED_CEILING = { 'ctr-api-001': 6, 'ctr-aud-001': 12, 'ctr-err-001': 2, 'ctr-evt-001': 2,
  'ctr-flg-001': 15, 'ctr-idm-001': 4, 'ctr-job-001': 4, 'ctr-mod-001': 21, 'ctr-ntf-001': 9,
  'ctr-obs-001': 10, 'ctr-pag-001': 10, 'ctr-sec-001': 13, 'ctr-ten-001': 1, 'ctr-usg-001': 2 };

// `$schema`, `$id`, `title` and `description` are metadata: deleting one cannot change any
// verdict, so counting them as constraints would drag every ratio down and make the floor
// measure documentation rather than enforcement.
const METADATA = new Set(['$schema', '$id', 'title', 'description']);
const STRUCTURAL = new Set(['properties', 'allOf', 'anyOf', 'oneOf', 'items', 'then', 'else', 'if', 'not']);
// Every JSON Schema keyword that actually constrains an instance. Anything else in a schema
// is a name, a container, or an annotation.
const ASSERTIONS = new Set([
  'type', 'enum', 'const', 'required', 'additionalProperties', 'minItems', 'maxItems',
  'uniqueItems', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum',
  'maxProperties', 'minProperties', 'format', '$ref',
]);

// Independent review proved the earlier version gameable in BOTH directions on real copies
// with CI green each time: deleting six untested constraints RAISED ctr-ten-001 from 32.4%
// to 39.3%, and adding four zero-constraint properties raised it to 39.5%. The cause was
// counting a bare property NAME as a site -- 55-91% of every contract's "kills" -- so a
// schema was rewarded for having fewer rules and for having more names. It also counted
// x-amended-by internals, which are unobservable by construction and permanently dead.
//
// Only assertion keywords count now. A property name is not a constraint; deleting one
// removes whatever it contained, which is a different measurement entirely.
function constraintSites(node, path = []) {
  let found = [];
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (path.some((segment) => typeof segment === 'string' && segment.startsWith('x-'))) continue;
      if (ASSERTIONS.has(key) && !METADATA.has(key)) found.push([...path, key]);
      if (!key.startsWith('x-')) found = found.concat(constraintSites(value, [...path, key]));
    }
  } else if (Array.isArray(node)) {
    node.forEach((value, index) => { found = found.concat(constraintSites(value, [...path, index])); });
  }
  return found;
}

test('every contract reaches the mutation-coverage floor', async () => {
  const entries = await readdir(CATALOG, { withFileTypes: true });
  const weak = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    let data;
    try {
      data = await fixturesOf(entry.name);
    } catch (error) {
      // A directory holding a schema but no manifest was silently exempt from the floor AND
      // from conformance -- the quietest way to remove a contract from every check at once.
      const hasSchema = await readFile(join(CATALOG, entry.name, 'schema.json'), 'utf8').then(() => true, () => false);
      if (hasSchema) weak.push(`${entry.name} — carries a schema.json but no readable manifest.json, so it is exempt from this floor and from conformance. A contract cannot opt out by omission.`);
      continue;
    }
    const { schema, bodies, resolve } = data;
    const baseline = verdicts(schema, bodies, resolve);
    const sites = constraintSites(schema);
    let killed = 0;
    for (const site of sites) {
      const mutated = without(schema, site);
      if (mutated && verdicts(mutated, bodies, resolve) !== baseline) killed += 1;
    }
    const ratio = sites.length === 0 ? 1 : killed / sites.length;
    if (ratio < COVERAGE_FLOOR) {
      weak.push(`${entry.name} — ${killed}/${sites.length} constraint sites killed by a fixture (${(ratio * 100).toFixed(1)}%), below the ${(COVERAGE_FLOOR * 100).toFixed(0)}% floor`);
    }
    const siteFloor = SITE_FLOOR[entry.name];
    if (siteFloor === undefined) {
      weak.push(`${entry.name} — no entry in SITE_FLOOR. A new contract must declare how many constraints it carries, or a later commit can delete rules and raise its score.`);
    } else if (sites.length < siteFloor) {
      weak.push(`${entry.name} — ${sites.length} constraint sites, below its declared floor of ${siteFloor}. A rule was removed; that is a deliberate act and must be a deliberate edit here, not a silent score improvement.`);
    }
    const unkilled = sites.length - killed;
    const ceiling = UNKILLED_CEILING[entry.name];
    if (ceiling === undefined) {
      weak.push(`${entry.name} — no entry in UNKILLED_CEILING. A new contract must declare how many untested constraints it ships, so the number cannot drift upward unnoticed.`);
    } else if (unkilled > ceiling) {
      weak.push(`${entry.name} — ${unkilled} constraint sites killed by no fixture, above its ceiling of ${ceiling}. Deleting a rule does not improve this number; only writing a fixture does.`);
    }
  }
  assert.deepEqual(weak, [], `contract(s) below the mutation-coverage floor:\n  ${weak.join('\n  ')}`);
});

test('deleting a protected constraint changes at least one fixture verdict', async () => {
  const unkilled = [];
  for (const [dir, path] of PROTECTED) {
    const { schema, bodies, resolve } = await fixturesOf(dir);
    const mutated = without(schema, path);
    assert.ok(mutated, `${dir}: ${path.join('.')} does not exist — the protected-site list is stale`);
    if (verdicts(schema, bodies, resolve) === verdicts(mutated, bodies, resolve)) {
      unkilled.push(`${dir} ${path.join('.')} — no declared fixture detects its removal`);
    }
  }
  assert.deepEqual(unkilled, [], `constraint(s) that no fixture exercises:\n  ${unkilled.join('\n  ')}`);
});

// Scoped to the contracts WP-0A-CON-003 owns. Running it catalog-wide showed that NOT ONE
// of the nine contracts has a fixture that kills its root `required` list -- the negative
// fixtures all fail for some other reason first. That is a real finding about the whole
// catalog, but seven of those contracts belong to other packages and are outside this
// package's writable paths, so it is recorded as an open blocker and escalated rather than
// enforced here over paths this package may not change.
const OWNED = ['ctr-mod-001', 'ctr-flg-001'];

test('every contract this package owns carries a fixture that kills its root required list', async () => {
  const weak = [];
  for (const name of OWNED) {
    let data;
    try { data = await fixturesOf(name); } catch { continue; }
    const { schema, bodies, resolve } = data;
    if (!Array.isArray(schema.required) || schema.required.length === 0) continue;
    const mutated = structuredClone(schema);
    delete mutated.required;
    if (verdicts(schema, bodies, resolve) === verdicts(mutated, bodies, resolve)) {
      weak.push(`${name} — deleting the entire root \`required\` list changes no fixture verdict`);
    }
  }
  assert.deepEqual(weak, [], `contract(s) whose required list nothing tests:\n  ${weak.join('\n  ')}`);
});

// A ratio hides which HALF is untested. Measured per keyword class, the conditional rules --
// the `if`/`then` business logic -- sat 30 points below the leaf constraints, and those are
// exactly the failure, deny and leakage paths: an error envelope that also carries a result,
// a permissioned-data module that is not tenant scoped, a managed secret rotated by a
// workspace. The catalog had valid fixtures for the happy path of every contract and for the
// failure path of almost none.
//
// Raising the ratio is not the goal; a ratio can be raised by deleting rules. This test
// admits no ratio. Every conditional site is either killed by a fixture or PROVED
// unkillable, and the proof is structural: the same obligation is already imposed at the
// same instance location by a schema that applies unconditionally, so no single-fault
// deletion can change any verdict. Anything else is a gap and must be named below.
const CONDITIONAL = new Set(['allOf', 'anyOf', 'oneOf', 'if', 'then', 'else', 'not']);

// Every schema node that constrains the SAME instance location as `path`, gathered on the
// way down. An `allOf` branch and a `then` do not descend into the instance; they add
// another obligation at the level they sit on. `if` and `not` are traversed but never
// counted -- an `if` states a condition, not an obligation, and `not` inverts one.
function scopesAlong(schema, path) {
  let scopes = [schema];
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (key === 'properties') {
      const name = path[index + 1];
      index += 1;
      scopes = scopes.map((node) => node?.properties?.[name]).filter(Boolean);
    } else if (key === 'items') {
      scopes = scopes.map((node) => node?.items).filter(Boolean);
    } else if (key === 'allOf' || key === 'anyOf' || key === 'oneOf') {
      const branch = path[index + 1];
      index += 1;
      scopes = scopes.flatMap((node) => {
        const target = node?.[key]?.[branch];
        return target ? [node, target] : [node];
      });
    } else if (key === 'then' || key === 'else' || key === 'if') {
      // An `if` sits at the instance level of its parent; it does not descend into the
      // instance. The obligations its ancestors impose still bind every instance that
      // reaches it, and those ancestors are what prove an `if` guard redundant.
      scopes = scopes.flatMap((node) => (node?.[key] ? [node, node[key]] : [node]));
    } else if (key === 'not') {
      scopes = scopes.flatMap((node) => (node?.not ? [node.not] : []));
    } else {
      return null;
    }
    if (scopes.length === 0) return null;
  }
  return scopes;
}

// `not` inverts the meaning of everything under it: deleting a constraint inside a `not`
// makes the schema STRICTER, not weaker, so the redundancy argument does not hold there and
// this refuses to make it.
function provablyRedundant(schema, path) {
  if (path.includes('not')) return false;
  const keyword = path.at(-1);
  const scopes = scopesAlong(schema, path);
  if (!scopes) return false;
  const site = path.reduce((node, key) => node?.[key], schema);
  // The node the site lives on is not evidence that the site is redundant. Without this the
  // proof reads a constraint as its own justification and excuses every gap it is given.
  const owner = path.slice(0, -1).reduce((node, key) => node?.[key], schema);
  const conditions = new Set();
  const collectConditions = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(collectConditions); return; }
    if (node.if) conditions.add(node.if);
    Object.values(node).forEach(collectConditions);
  };
  collectConditions(schema);
  const elsewhere = scopes.filter((node) => node !== undefined && node !== owner && !conditions.has(node));
  if (keyword === 'required') {
    const demanded = new Set(elsewhere.flatMap((node) => (Array.isArray(node.required) ? node.required : [])));
    return Array.isArray(site) && site.every((key) => demanded.has(key));
  }
  const same = JSON.stringify(site);
  return elsewhere.some((node) => node[keyword] !== undefined && JSON.stringify(node[keyword]) === same);
}

// Conditional sites that no fixture kills and no proof excuses. CTR-NTF-001 belongs to A5:
// its two gaps are reported to its owner, not closed here, because proposing a change to
// another role's contract is reserved to that role.
const UNPROVEN_CONDITIONAL_GAPS = [
  'ctr-ntf-001 allOf.2.if.required',
  'ctr-ntf-001 allOf.3.if.required',
];

test('every conditional constraint is killed by a fixture or proved unkillable', async () => {
  const entries = await readdir(CATALOG, { withFileTypes: true });
  const gaps = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    let data;
    try { data = await fixturesOf(entry.name); } catch { continue; }
    const { schema, bodies, resolve } = data;
    const baseline = verdicts(schema, bodies, resolve);
    for (const site of constraintSites(schema)) {
      if (!site.some((key) => typeof key === 'string' && CONDITIONAL.has(key))) continue;
      const mutated = without(schema, site);
      if (!mutated || verdicts(mutated, bodies, resolve) !== baseline) continue;
      if (provablyRedundant(schema, site)) continue;
      gaps.push(`${entry.name} ${site.join('.')}`);
    }
  }
  const surprises = gaps.filter((gap) => !UNPROVEN_CONDITIONAL_GAPS.includes(gap));
  assert.deepEqual(surprises, [], `conditional rule(s) that no fixture exercises and no proof excuses:\n  ${surprises.join('\n  ')}`);
  const closed = UNPROVEN_CONDITIONAL_GAPS.filter((gap) => !gaps.includes(gap));
  assert.deepEqual(closed, [], `declared gap(s) that are no longer gaps — remove them from UNPROVEN_CONDITIONAL_GAPS:\n  ${closed.join('\n  ')}`);
});
