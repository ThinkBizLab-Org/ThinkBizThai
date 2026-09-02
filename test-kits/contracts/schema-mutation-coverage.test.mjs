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

// A constraint is EXERCISED when removing it lets through something the contract rejects.
//
// Comparing verdict strings does not say that. Deleting a keyword normally weakens a schema,
// but under `not` -- and inside an empty `oneOf` branch -- the polarity inverts and deletion
// STRENGTHENS it: `not: { required: [a, b] }` becomes `not: {}`, which rejects everything, so
// every fixture flips valid->invalid, the verdict string changes, and the site scores "killed"
// by fixtures that never demonstrated anything. Independent review used that to inject a real
// and harmful rule -- an API error envelope carrying a causation chain, legal under the shipped
// contract, silently rejected -- with the whole check green, and found 56 more like it.
//
// The same asymmetry explains why an `if`-guard keyword used to score killed: deleting it
// WIDENS the guard, breaking a valid fixture, without any fixture ever entering the branch.
//
// So a kill is one direction only: some fixture the contract rejects must become accepted.
function relaxationObserved(schema, mutated, bodies, resolve) {
  for (const { body } of bodies) {
    const before = validate(schema, body, { resolve }).length === 0;
    if (before) continue;
    if (validate(mutated, body, { resolve }).length === 0) return true;
  }
  return false;
}

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
const SITE_FLOOR = {
  'ctr-api-001': 36, 'ctr-aud-001': 56, 'ctr-err-001': 23, 'ctr-evt-001': 52,
  'ctr-flg-001': 55, 'ctr-idm-001': 33, 'ctr-job-001': 42, 'ctr-mod-001': 78,
  'ctr-ntf-001': 29, 'ctr-obs-001': 75, 'ctr-pag-001': 30, 'ctr-sec-001': 68,
  'ctr-ten-001': 23, 'ctr-usg-001': 37 };

// Held at the measured actual, not at a round number above it. Slack in this ceiling is
// room for coverage to regress without anything failing, so every fixture that closes a
// site tightens it in the same commit.
// The number of sites NO FIXTURE KILLS, per contract -- the proof-excused ones included.
// UNKILLED_SITES below names the subset the redundancy proof does NOT excuse, so the gap
// between the two is exactly the count the proof carries, and the test at the bottom of this
// file asserts that relationship rather than leaving two numbers to drift apart.
const UNKILLED_CEILING = {
  'ctr-api-001': 1, 'ctr-aud-001': 1, 'ctr-err-001': 0, 'ctr-evt-001': 1, 'ctr-flg-001': 4,
  'ctr-idm-001': 1, 'ctr-job-001': 0, 'ctr-mod-001': 4, 'ctr-ntf-001': 3, 'ctr-obs-001': 0,
  'ctr-pag-001': 6, 'ctr-sec-001': 6, 'ctr-ten-001': 0, 'ctr-usg-001': 0 };

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
// WHICH constraints can a deletion test see at all? Not every one, and pretending otherwise is
// how two independent reviews walked rules past this suite.
//
// Deleting a keyword normally weakens a schema. Under an `if` guard and under `not`, the
// polarity inverts: widening a guard makes it fire MORE often, and emptying a `not` makes it
// reject MORE. A deletion there can never turn a rejected instance into an accepted one, so no
// fixture can ever demonstrate it. Counting such positions as sites produced two opposite
// errors at once -- an `if` keyword scored "killed" because deleting it broke a valid fixture
// that never entered the branch, and `not: { required: [a, b] }` scored "killed" because
// emptying the `not` rejected everything.
//
// So the walk follows polarity:
//
//   `if`   is a CONDITION, not an obligation. It contributes nothing, and is not descended
//          into: every position inside it is unkillable by deletion, by construction.
//   `not`  is ONE obligation. Deleting the whole thing removes it -- that is the observable
//          act -- and the assertions inside it are not separately countable.
//   an `anyOf`/`oneOf` branch that is the empty schema turns the whole combinator into a
//          negation, so the combinator itself becomes the obligation.
//   a `then`/`else` with no assertion under it is itself the obligation, since the rule says
//          "reject" and names nothing.
function hasAssertion(node) {
  if (Array.isArray(node)) return node.some(hasAssertion);
  if (!node || typeof node !== 'object') return false;
  return Object.entries(node).some(([key, value]) =>
    (ASSERTIONS.has(key) && !METADATA.has(key)) || (!key.startsWith('x-') && hasAssertion(value)));
}

const isEmptySchema = (node) => node && typeof node === 'object' && !Array.isArray(node)
  && Object.keys(node).filter((k) => !k.startsWith('x-')).length === 0;

function constraintSites(node, path = []) {
  let found = [];
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (path.some((segment) => typeof segment === 'string' && segment.startsWith('x-'))) continue;
      if (key.startsWith('x-')) continue;
      if (key === 'if') continue;                                   // a condition, never an obligation
      if (key === 'not') { found.push([...path, key]); continue; }  // one obligation, not its parts
      if ((key === 'anyOf' || key === 'oneOf') && Array.isArray(value) && value.some(isEmptySchema)) {
        found.push([...path, key]);
        continue;
      }
      if (ASSERTIONS.has(key) && !METADATA.has(key)) found.push([...path, key]);
      else if ((key === 'then' || key === 'else') && !hasAssertion(value)) found.push([...path, key]);
      found = found.concat(constraintSites(value, [...path, key]));
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
    const sites = constraintSites(schema);
    let killed = 0;
    for (const site of sites) {
      const mutated = without(schema, site);
      if (mutated && relaxationObserved(schema, mutated, bodies, resolve)) killed += 1;
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
    const declared = UNKILLED_CEILING[entry.name];
    if (declared === undefined) {
      weak.push(`${entry.name} — no entry in UNKILLED_CEILING. A new contract must declare how many constraints no fixture kills, so the number cannot drift in either direction unnoticed.`);
    } else if (unkilled !== declared) {
      // EXACT, not a ceiling. Independent review pointed out that this count and
      // UNKILLED_SITES measure different sets -- this one counts every site no fixture kills,
      // including the ones the redundancy proof excuses; the list names only the ones it does
      // not. Two guards disagreeing about what "unkilled" means is how a change slips between
      // them. They are reconciled by making this one exact and asserting the relationship
      // below, so a change to EITHER set has to be written down.
      weak.push(`${entry.name} — ${unkilled} constraint sites killed by no fixture, but ${declared} declared. ${unkilled > declared ? 'A rule was added that nothing tests.' : 'A site was closed, or a rule removed.'} Either way it is a deliberate act and must be a deliberate edit here.`);
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
    if (!relaxationObserved(schema, mutated, bodies, resolve)) {
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
    if (!relaxationObserved(schema, mutated, bodies, resolve)) {
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
// Keywords whose meaning depends on their siblings, so an equal value elsewhere is not the
// same obligation and proves nothing.
const SIBLING_DEPENDENT = new Set(['additionalProperties', 'minProperties', 'maxProperties']);

// Every schema node that constrains the SAME instance location as `path`, gathered on the
// way down. An `allOf` branch and a `then` do not descend into the instance; they add
// another obligation at the level they sit on. `if` and `not` are traversed but never
// counted -- an `if` states a condition, not an obligation, and `not` inverts one.
function scopesAlong(schema, path) {
  // TWO things are tracked, and conflating them is what made the first version unsound.
  //
  // `cursor` walks the ACTUAL path to the site. `evidence` holds nodes that constrain the same
  // instance location and apply whenever the site's branch applies.
  //
  // Descending through `properties`/`items` moves every evidence node in step: they all
  // describe the same instance location, so they all descend into the same child.
  //
  // Stepping into `then`, `else` or an `allOf` branch does NOT. It selects one obligation out
  // of many at the current level, so only the cursor moves and only the cursor is added.
  // Independent review and independent testing each defeated a version that mapped these
  // steps over the whole evidence list: a sibling `allOf` branch guarded by a DIFFERENT `if`
  // was admitted as proof, and independent testing used exactly that to ship an untested
  // business rule -- a percentage bucket that did not allocate the subject still returning
  // allow -- past this suite with the whole check green.
  let cursor = schema;
  let evidence = [schema];
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (key === 'properties' || key === 'items') {
      const name = path[index + 1];
      const step = key === 'properties' ? (node) => node?.properties?.[name] : (node) => node?.items;
      if (key === 'properties') index += 1;
      evidence = evidence.map(step).filter(Boolean);
      cursor = step(cursor);
    } else if (key === 'allOf' || key === 'anyOf' || key === 'oneOf') {
      const branch = path[index + 1];
      index += 1;
      cursor = cursor?.[key]?.[branch];
      // An `anyOf`/`oneOf` branch is an alternative, not a conjunct: that one of them holds
      // says nothing about this one, so such a branch is walked and never cited.
      if (cursor && key === 'allOf') evidence = [...evidence, cursor];
    } else if (key === 'then' || key === 'else') {
      cursor = cursor?.[key];
      if (cursor) evidence = [...evidence, cursor];
    } else if (key === 'if') {
      // An `if` states a condition, not an obligation. Walked, never cited.
      cursor = cursor?.if;
    } else {
      return null;
    }
    if (!cursor) return null;
  }
  return evidence;
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
  const elsewhere = scopes.filter((node) => node !== undefined && node !== owner);
  if (keyword === 'required') {
    const demanded = new Set(elsewhere.flatMap((node) => (Array.isArray(node.required) ? node.required : [])));
    return Array.isArray(site) && site.every((key) => demanded.has(key));
  }
  // `additionalProperties: false` is not a self-contained assertion. It means "no key beyond
  // THIS node's `properties`", so two nodes can carry a byte-identical value and forbid
  // different key sets -- independent review distinguished exactly that with {kind:'P',b:'x'}.
  // Every schema in this catalog carries root `additionalProperties: false`, so a future
  // contract writing "in this state, only these fields may appear" -- the leakage-path rule
  // class this whole test exists to cover -- would have been silently excused.
  if (SIBLING_DEPENDENT.has(keyword)) return false;
  const same = JSON.stringify(site);
  return elsewhere.some((node) => node[keyword] !== undefined && JSON.stringify(node[keyword]) === same);
}

// Conditional sites this proof cannot account for. Listing one is a statement that the site
// is untested, so the list is the thing a reviewer should read first.
//
// Both entries are CORRECTIONS to an earlier claim. They were reported as gaps belonging to
// A5, and independent review and independent testing separately showed they are not gaps at
// all: each guard is `required: ["delivery"]`, and each matching `then` constrains only
// inside `properties.delivery`, which is vacuous when `delivery` is absent. No instance can
// distinguish the schema from the schema without the guard -- independent testing put 150000
// targeted instances against each and found none. They are unkillable for a reason this
// proof does not model (a vacuous consequent, not a duplicated obligation), so they stay
// listed rather than silently excused, and the earlier escalation to A5 is withdrawn.
// Empty, and it emptied itself. Both entries were `if` guards on CTR-NTF-001, and an `if` is
// no longer a constraint site at all: deleting anything inside one WIDENS the guard, which can
// only cause more rejections, so no fixture can ever demonstrate it. What two independent runs
// had to establish with 150000 targeted instances each is now a property of the walk.
const UNPROVEN_CONDITIONAL_GAPS = [];

// The proof decides whether an untested rule is reported or excused, so its soundness is the
// whole guarantee. These are the counterexamples independent review and independent testing
// each used to defeat an earlier version of it; every one is a schema where deleting the site
// DOES change a real instance's verdict, so excusing it would hide a testable rule.
const PROOF_MUST_NOT_EXCUSE = [
  {
    why: 'a sibling allOf branch, guarded by a different `if`, is not evidence about this one',
    schema: {
      type: 'object', required: ['kind'],
      properties: { kind: { enum: ['P', 'Q'] }, a: { type: 'string' } },
      if: { properties: { kind: { const: 'P' } }, required: ['kind'] }, then: { required: ['a'] },
      allOf: [{ if: { properties: { kind: { const: 'Q' } }, required: ['kind'] }, then: { required: ['a'] } }],
    },
    site: ['allOf', 0, 'then', 'required'],
    distinguishedBy: { kind: 'Q' },
  },
  {
    why: '`additionalProperties: false` means "nothing beyond THIS node\'s properties", so an equal value elsewhere forbids a different key set',
    schema: {
      type: 'object', required: ['kind'],
      properties: { kind: { enum: ['P', 'Q'] }, a: { type: 'string' }, b: { type: 'string' } },
      additionalProperties: false,
      allOf: [{
        if: { properties: { kind: { const: 'P' } }, required: ['kind'] },
        then: { properties: { kind: {}, a: {} }, additionalProperties: false },
      }],
    },
    site: ['allOf', 0, 'then', 'additionalProperties'],
    distinguishedBy: { kind: 'P', b: 'x' },
  },
  {
    why: 'a rule nested under `then.allOf[i].then` must not be excused by an unrelated branch that happens to carry the same value',
    schema: {
      type: 'object', required: ['kind', 'effect'],
      properties: { kind: { enum: ['P', 'Q'] }, effect: { enum: ['allow', 'deny'] } },
      allOf: [
        { if: { properties: { kind: { const: 'P' } }, required: ['kind'] }, then: { properties: { effect: { const: 'deny' } } } },
        { if: { properties: { kind: { const: 'Q' } }, required: ['kind'] },
          then: { allOf: [{}, { if: {}, then: { properties: { effect: { const: 'deny' } } } }] } },
      ],
    },
    site: ['allOf', 1, 'then', 'allOf', 1, 'then', 'properties', 'effect', 'const'],
    distinguishedBy: { kind: 'Q', effect: 'allow' },
  },
];

test('the redundancy proof excuses nothing a real instance can distinguish', () => {
  const wrong = [];
  for (const { why, schema, site, distinguishedBy } of PROOF_MUST_NOT_EXCUSE) {
    const full = { $schema: 'https://json-schema.org/draft/2020-12/schema', ...schema };
    const mutated = without(full, site);
    assert.ok(mutated, `${site.join('.')} does not exist — this counterexample is stale`);
    // The case only means anything while the instance really does tell the two apart.
    const before = validate(full, distinguishedBy, { resolve: () => null }).length === 0;
    const after = validate(mutated, distinguishedBy, { resolve: () => null }).length === 0;
    assert.notEqual(before, after,
      `${site.join('.')}: ${JSON.stringify(distinguishedBy)} no longer distinguishes the two schemas — the counterexample needs rebuilding, not deleting`);
    if (provablyRedundant(full, site)) wrong.push(`${site.join('.')} — ${why}`);
  }
  assert.deepEqual(wrong, [], `the proof excused a site a real instance distinguishes:\n  ${wrong.join('\n  ')}`);
});

test('every conditional constraint is killed by a fixture or proved unkillable', async () => {
  const entries = await readdir(CATALOG, { withFileTypes: true });
  const gaps = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    let data;
    try { data = await fixturesOf(entry.name); } catch { continue; }
    const { schema, bodies, resolve } = data;
    for (const site of constraintSites(schema)) {
      if (!site.some((key) => typeof key === 'string' && CONDITIONAL.has(key))) continue;
      const mutated = without(schema, site);
      if (!mutated || relaxationObserved(schema, mutated, bodies, resolve)) continue;
      if (provablyRedundant(schema, site)) continue;
      gaps.push(`${entry.name} ${site.join('.')}`);
    }
  }
  const surprises = gaps.filter((gap) => !UNPROVEN_CONDITIONAL_GAPS.includes(gap));
  assert.deepEqual(surprises, [], `conditional rule(s) that no fixture exercises and no proof excuses:\n  ${surprises.join('\n  ')}`);
  const closed = UNPROVEN_CONDITIONAL_GAPS.filter((gap) => !gaps.includes(gap));
  assert.deepEqual(closed, [], `declared gap(s) that are no longer gaps — remove them from UNPROVEN_CONDITIONAL_GAPS:\n  ${closed.join('\n  ')}`);
});


// Independent testing found the hole this closes, and closed nothing by finding it: it added
// a real untested business rule to ctr-flg-001 -- a percentage bucket that did not allocate
// the subject still returning allow -- and kept the whole check green by ALSO deleting one
// vacuous guard elsewhere in the same contract. Four new unkilled sites in, four out. Both
// numeric guards were satisfied: the site count stayed above its floor and the unkilled count
// landed back on its ceiling.
//
// A count can always be offset. A NAME cannot. Every site no fixture kills is listed below,
// so an untested rule appears here as a new line in a diff a reviewer reads, and deleting a
// rule somewhere else does not remove that line.
//
// Note what conformance makes structural: `valid-*` fixtures must pass and `invalid-*` must
// fail, so a newly added rule can NEVER be counted killed without someone writing a new
// fixture. Every rule added to this catalog therefore arrives here first. That is the point.
//
// Sites that are provably unkillable are NOT listed -- they are excused by the proof above,
// which cites the schema rather than the fixture set, and re-listing them would bury the real
// gaps in noise.
//
// The 64 below are not one problem. Read by keyword they are five, and only some are gaps:
//
// What remains is annotated by CLASS below, but the annotations are prose and prose has been
// the weakest part of this file: three consecutive independent reviews found a "not closeable"
// note that was wrong -- `$ref`, then `type`, then four `required`/`type` sites that a
// reviewer closed in an afternoon. Each time the note reasoned about the schema instead of
// executing against it.
//
// So the one claim that can be machine-checked is machine-checked, in the test below rather
// than asserted here: the root `type` entries are unkillable because for ANY non-object the
// `required` inside their `not` is vacuously satisfied, the `not` therefore fails, and the
// instance is rejected with `type` deleted. The rest are recorded as observations, not proofs:
//
//   `type`      root `type: "object"` on six contracts, machine-checked below. Others are
//               rejected by a sibling `const` or an enclosing branch first.
//   `required`  duplicated by a conditional copy. NOTE this is only true where the two lists
//               MATCH: independent review found three sites where the unconditional list had a
//               member the conditional copy did not, and that extra member was testable.
//   `$ref`      CTR-NTF-001's is KILLABLE -- `tenant_context: null` closes it. It is here
//               because A5 owns the contract, not because it cannot be tested. That
//               distinction was missing and it matters: an ownership block is temporary.
//
// Listing them together and calling them all "untested" would be the same flattening this
// suite was written to stop.
const UNKILLED_SITES = {
  'ctr-api-001': [
    'type',
  ],
  'ctr-aud-001': [
    'type',
  ],
  'ctr-evt-001': [
    'properties.subject.properties.type',
  ],
  'ctr-flg-001': [
    'properties.decision_source.type',
  ],
  'ctr-idm-001': [
    'type',
  ],
  'ctr-mod-001': [
    'properties.lifecycle.properties.readiness.properties.activated.type',
  ],
  'ctr-ntf-001': [
    'properties.delivery.type',
    'properties.tenant_context.$ref',
    'type',
  ],
  'ctr-pag-001': [
    'properties.next_cursor.minLength',
    'properties.next_cursor.type',
    'required',
    'type',
  ],
  'ctr-sec-001': [
    'properties.rotation.properties.owner.properties.kind.enum',
    'type',
  ],
};

test('every untested constraint is named, so no arithmetic can offset a new one', async () => {
  const entries = await readdir(CATALOG, { withFileTypes: true });
  const found = {};
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    let data;
    try { data = await fixturesOf(entry.name); } catch { continue; }
    const { schema, bodies, resolve } = data;
    for (const site of constraintSites(schema)) {
      const mutated = without(schema, site);
      if (!mutated || relaxationObserved(schema, mutated, bodies, resolve)) continue;
      const conditional = site.some((key) => typeof key === 'string' && CONDITIONAL.has(key));
      if (conditional && provablyRedundant(schema, site)) continue;
      (found[entry.name] ??= []).push(site.join('.'));
    }
  }
  const problems = [];
  for (const [contract, sites] of Object.entries(found)) {
    for (const site of sites) {
      if (!(UNKILLED_SITES[contract] ?? []).includes(site)) {
        problems.push(`${contract} ${site} — no fixture exercises this rule, and it is not declared. Write a fixture that kills it, or add it here and say why it cannot be tested.`);
      }
    }
  }
  for (const [contract, sites] of Object.entries(UNKILLED_SITES)) {
    for (const site of sites) {
      if (!(found[contract] ?? []).includes(site)) {
        problems.push(`${contract} ${site} — declared untested but a fixture now kills it, or the rule is gone. Remove it from UNKILLED_SITES; a stale entry is a licence for the next untested rule to hide behind.`);
      }
    }
  }
  assert.deepEqual(problems, [], `untested-constraint declaration is out of date:\n  ${problems.join('\n  ')}`);
});

// The one claim in UNKILLED_SITES that can be settled by execution, settled by execution.
// Three consecutive reviews found a prose annotation in that block wrong, so this claim does
// not live in a comment: if a root `type` becomes killable -- someone removes the `not`, or
// relaxes the required list inside it -- this fails and the entry must come off the list.
test('each root `type` on the list is unkillable because a `not` rejects every non-object', async () => {
  const wrong = [];
  for (const [contract, sites] of Object.entries(UNKILLED_SITES)) {
    if (!sites.includes('type')) continue;
    const { schema, resolve } = await fixturesOf(contract);
    const mutated = without(schema, ['type']);
    for (const probe of [0, 'zz', true, null, [], [1, 2]]) {
      if (validate(schema, probe, { resolve }).length === 0) {
        wrong.push(`${contract} — ${JSON.stringify(probe)} is accepted by the shipped schema, which cannot be right for a contract whose root type is object`);
        continue;
      }
      if (validate(mutated, probe, { resolve }).length === 0) {
        wrong.push(`${contract} — ${JSON.stringify(probe)} is rejected with root \`type\`, accepted without it. The site IS killable: add this as a fixture and remove the declaration.`);
      }
    }
  }
  assert.deepEqual(wrong, [], `root \`type\` declaration(s) that execution does not support:\n  ${wrong.join('\n  ')}`);
});

// Independent review found that UNKILLED_CEILING and UNKILLED_SITES measure different sets --
// the count includes sites the redundancy proof excuses, the list does not -- and that a
// change could slip between two guards that disagree about what "unkilled" means. One of them
// caught an injected rule the other missed, which is useful, but only if the relationship
// between them is stated rather than accidental.
test('the untested count and the untested list agree about what they measure', async () => {
  const problems = [];
  const entries = await readdir(CATALOG, { withFileTypes: true });
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    let data;
    try { data = await fixturesOf(entry.name); } catch { continue; }
    const { schema, bodies, resolve } = data;
    let raw = 0;
    let excused = 0;
    const named = [];
    for (const site of constraintSites(schema)) {
      const mutated = without(schema, site);
      if (!mutated || relaxationObserved(schema, mutated, bodies, resolve)) continue;
      raw += 1;
      const conditional = site.some((key) => typeof key === 'string' && CONDITIONAL.has(key));
      if (conditional && provablyRedundant(schema, site)) excused += 1;
      else named.push(site.join('.'));
    }
    const listed = UNKILLED_SITES[entry.name] ?? [];
    if (named.length !== listed.length) {
      problems.push(`${entry.name} — ${named.length} sites the proof does not excuse, ${listed.length} named in UNKILLED_SITES`);
    }
    if (raw !== named.length + excused) {
      problems.push(`${entry.name} — ${raw} unkilled sites but ${named.length} named + ${excused} excused; the two guards are counting different things`);
    }
    if ((UNKILLED_CEILING[entry.name] ?? -1) !== raw) {
      problems.push(`${entry.name} — UNKILLED_CEILING says ${UNKILLED_CEILING[entry.name]}, measured ${raw}`);
    }
  }
  assert.deepEqual(problems, [], `the two untested-constraint guards disagree:\n  ${problems.join('\n  ')}`);
});
