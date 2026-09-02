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
  const last = path.at(-1);
  if (node?.[last] === undefined) return null;
  // Removing a combinator BRANCH means removing the element, not blanking it: a branch left as
  // `{}` inside a `not` matches everything and makes the schema reject everything, which is the
  // opposite of removing an obligation.
  if (Array.isArray(node) && typeof last === 'number') node.splice(last, 1);
  else delete node[last];
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
// polarity  1: deletion relaxes, so a REJECTED fixture must become accepted.
// polarity -1: deletion tightens, so an ACCEPTED fixture must become rejected.
// polarity  0: the position sits under a guard with both branches; either direction is a
//              genuine observation, so accept either.
function relaxationObserved(schema, mutated, bodies, resolve, polarity = 1) {
  for (const { body } of bodies) {
    const before = validate(schema, body, { resolve }).length === 0;
    const after = validate(mutated, body, { resolve }).length === 0;
    if (before === after) continue;
    // Polarity 0 marks a position where no direction is sound -- inside a `oneOf`, or under a
    // guard with both branches. A flip there is not evidence, so it never scores a kill and the
    // site goes on the named untested list instead of vanishing from every count.
    if (polarity === 0) return false;
    if (polarity > 0 && !before && after) return true;
    if (polarity < 0 && before && !after) return true;
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
  'ctr-api-001': 42, 'ctr-aud-001': 63, 'ctr-err-001': 23, 'ctr-evt-001': 51,
  'ctr-flg-001': 74, 'ctr-idm-001': 38, 'ctr-job-001': 42, 'ctr-mod-001': 87,
  'ctr-ntf-001': 39, 'ctr-obs-001': 83, 'ctr-pag-001': 38, 'ctr-sec-001': 76,
  'ctr-ten-001': 23, 'ctr-usg-001': 37 };

// Held at the measured actual, not at a round number above it. Slack in this ceiling is
// room for coverage to regress without anything failing, so every fixture that closes a
// site tightens it in the same commit.
// The number of sites NO FIXTURE KILLS, per contract -- the proof-excused ones included.
// UNKILLED_SITES below names the subset the redundancy proof does NOT excuse, so the gap
// between the two is exactly the count the proof carries, and the test at the bottom of this
// file asserts that relationship rather than leaving two numbers to drift apart.
const UNKILLED_CEILING = {
  'ctr-api-001': 1, 'ctr-aud-001': 5, 'ctr-err-001': 0, 'ctr-evt-001': 0, 'ctr-flg-001': 14,
  'ctr-idm-001': 1, 'ctr-job-001': 0, 'ctr-mod-001': 10, 'ctr-ntf-001': 9, 'ctr-obs-001': 5,
  'ctr-pag-001': 8, 'ctr-sec-001': 10, 'ctr-ten-001': 0, 'ctr-usg-001': 0 };

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
// WHICH constraints can a deletion test see, and in which direction?
//
// Deleting a keyword normally weakens a schema. Under `not` the polarity inverts and deletion
// STRENGTHENS. Under an `if` guard it depends on what the branch does with the guard: widening
// a guard makes a `then` fire more (stricter) and an `else` fire less (weaker).
//
// An earlier version resolved this by refusing to look: `if` contributed nothing and `not` was
// one opaque site. Independent review broke both. It appended a conjunct to an existing `not`
// -- the same rule a previous review had injected, rejecting an error envelope that carries a
// causation chain -- at ZERO new sites, because the walk never descended; a sweep found 132
// such injections structurally invisible. And it produced two positions inside an `if` that a
// fixture CAN kill: a `not` inside the guard, where deletion narrows it, and a guard with an
// `else`, where widening makes the `else` fire less.
//
// So the walk descends everywhere and carries the polarity with it. `relaxationObserved` is
// asked for the direction that position can actually be observed in.
// A deletion test can only see a constraint whose removal RELAXES the schema, and inside a
// `not` a keyword deletion does the opposite: `not: { required: [a, b] }` becomes `not: {}`,
// which matches everything and rejects everything. An earlier version tried to rescue that by
// asking for the other direction. Independent review showed the rescue was vacuous -- deleting
// every `invalid-*` fixture from every manifest left all 55 negative-polarity sites still
// scoring "killed", because the flip comes from the mere existence of one accepted instance and
// not from any fixture exercising the rule. It then appended one conjunct to an existing `not`
// -- an error envelope may not carry a causation chain, silently rejecting a legal response --
// and the whole check stayed green.
//
// The mutation operator was wrong, not the direction. Removing an obligation stated inside a
// `not` means removing the BRANCH, and that relaxes. So `not` is not descended into for
// keywords; instead each branch under it is a site whose deletion removes it, judged in the
// ordinary positive direction, and a fixture has to actually be let through to score a kill.
// The polarity a `not` is REACHED at, not a constant. Independent review pointed out that
// hardcoding 1 bypasses the polarity-0 invariant everywhere else in the walk: a `not` inside a
// `oneOf` should never score a kill, and one inside an `if` guard carrying only a `then` is
// negative. It was not exploitable -- a positive kill needs a rejected fixture to become
// accepted, and conformance guarantees each rejected fixture is rejected for its own defect --
// but code that contradicts the comment above it is a defect waiting for its context to change.
function notSites(node, path, polarity = 1) {
  const body = node?.not;
  if (body === undefined) return [];
  for (const combinator of ['anyOf', 'oneOf', 'allOf']) {
    if (Array.isArray(body[combinator])) {
      return body[combinator].map((_, index) => [[...path, 'not', combinator, index], polarity]);
    }
  }
  return [[[...path, 'not'], polarity]];
}

// A `properties` container's keys are NAMES, not keywords. Independent review found the walk
// applying keyword dispatch to them: `subject.properties.type` was read as a `type` assertion
// (one of the eighteen names on the untested list was not a constraint at all), a property
// named `not` collapsed its whole subtree into one opaque site, and a property named `oneOf`
// produced no sites for its subtree at all. Both are plausible in a filter or query contract.
function constraintSites(node, path = [], polarity = 1, inProperties = false) {
  let found = [];
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    if (inProperties) {
      // Every key here is a property name. Recurse into each value as a schema, never as a
      // keyword.
      for (const [name, value] of Object.entries(node)) {
        found = found.concat(constraintSites(value, [...path, name], polarity));
      }
      return found;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('x-')) continue;
      if (key === 'properties') {
        found = found.concat(constraintSites(value, [...path, key], polarity, true));
        continue;
      }
      if (key === 'not') { found = found.concat(notSites(node, path, polarity)); continue; }
      let next = polarity;
      if (key === 'if') {
        // A guard read through its branches: only `then` and widening tightens; only `else` and
        // widening relaxes. With BOTH, a deletion is observable either way and neither
        // direction is evidence, so the sites are counted and never scored killed -- they go on
        // the named list rather than disappearing from it.
        const hasThen = node.then !== undefined;
        const hasElse = node.else !== undefined;
        next = hasThen && hasElse ? 0 : hasThen ? -polarity : polarity;
      } else if (key === 'oneOf') {
        // `oneOf` is non-monotone: widening a branch can produce a second match and therefore a
        // rejection, so no direction is sound. An earlier version answered that by not counting
        // its interior at all, and independent review put a real rule through the hole -- a
        // success envelope whose `data` carries more than three properties, rejected by the
        // envelope every module composes, with every count, list and ceiling unchanged.
        //
        // Invisible is strictly worse than unprovable. Its interior is counted at polarity 0,
        // which never scores a kill, so anything added inside a `oneOf` lands on the named
        // untested list and has to be written down.
        next = 0;
      }
      if (ASSERTIONS.has(key) && !METADATA.has(key)) found.push([[...path, key], polarity]);
      else if ((key === 'then' || key === 'else') && !hasAssertion(value)) found.push([[...path, key], polarity]);
      else if (key === 'anyOf' && Array.isArray(value) && value.some(isEmptySchema)) {
        found.push([[...path, key], polarity]);
      } else if (key === 'oneOf' && Array.isArray(value) && value.some(isEmptySchema)) {
        found.push([[...path, key], polarity]);
      }
      found = found.concat(constraintSites(value, [...path, key], next));
    }
  } else if (Array.isArray(node)) {
    node.forEach((value, index) => { found = found.concat(constraintSites(value, [...path, index], polarity)); });
  }
  return found;
}

function hasAssertion(node) {
  if (Array.isArray(node)) return node.some(hasAssertion);
  if (!node || typeof node !== 'object') return false;
  return Object.entries(node).some(([key, value]) =>
    (ASSERTIONS.has(key) && !METADATA.has(key)) || (!key.startsWith('x-') && hasAssertion(value)));
}

const isEmptySchema = (node) => node && typeof node === 'object' && !Array.isArray(node)
  && Object.keys(node).filter((k) => !k.startsWith('x-')).length === 0;

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
    for (const [site, polarity] of sites) {
      const mutated = without(schema, site);
      if (mutated && relaxationObserved(schema, mutated, bodies, resolve, polarity)) killed += 1;
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
// These two came back, and the reason is worth recording. An earlier version excused them by
// refusing to count `if` interiors at all -- "unkillable by construction" -- and independent
// review showed that claim false: a `not` inside a guard, or a guard with an `else`, gives a
// position a fixture CAN kill. The walk descends into guards again, so these two are sites
// again, and they are genuinely untested: each is `required: ["delivery"]` guarding a `then`
// that constrains only inside `properties.delivery`, vacuous when `delivery` is absent. Two
// independent runs put 150000 targeted instances against each and found nothing that
// distinguishes them. Unkillable for a reason this proof does not model, on A5's contract.
const UNPROVEN_CONDITIONAL_GAPS = [
  'ctr-ntf-001 allOf.2.if.required',
  'ctr-ntf-001 allOf.3.if.required',
];

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
    for (const [site, polarity] of constraintSites(schema)) {
      if (!site.some((key) => typeof key === 'string' && CONDITIONAL.has(key))) continue;
      const mutated = without(schema, site);
      if (!mutated || relaxationObserved(schema, mutated, bodies, resolve, polarity)) continue;
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
    'allOf.2.if.required',
    'allOf.3.if.required',
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
    for (const [site, polarity] of constraintSites(schema)) {
      const mutated = without(schema, site);
      if (!mutated || relaxationObserved(schema, mutated, bodies, resolve, polarity)) continue;
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
    for (const [site, polarity] of constraintSites(schema)) {
      const mutated = without(schema, site);
      if (!mutated || relaxationObserved(schema, mutated, bodies, resolve, polarity)) continue;
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

// Every guard above is computed by DELETING a keyword, so every one of them is invariant under
// a change to a keyword's VALUE. Independent review demonstrated the consequence three times
// over: `maxLength` narrowed 128 to 24 on three CTR-API-001 fields, the body alphabet of a
// PINNED reference pattern narrowed from [A-Za-z0-9_-] to [a-z0-9_], and `currency` narrowed
// from ["THB","USD"] to ["THB"] on a site this file lists as PROTECTED. All three passed.
//
// Pinning individual fields did not work either -- the previous attempt pinned seven, and the
// narrowings landed on the other sixty-nine. So the whole constraint surface is pinned: every
// assertion keyword in every contract, with its value, reduced to one digest per contract.
//
// The digest is what stays small; the failure message is what stays readable. On a mismatch it
// prints the sites that were added, removed or changed, so "a narrowing" and "a deliberate
// tightening someone wrote down" look different in a diff a reviewer reads.
const CONSTRAINT_SURFACE = {
  'ctr-api-001': {
    digest: '6cd40cd39fbd1019',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [kind]",
      ".allOf.0.if.properties.kind.const = \"success\"",
      ".allOf.0.then.not.anyOf.0.required = [\"error\"]",
      ".allOf.0.then.not.anyOf.1.required = [\"accepted\"]",
      ".allOf.0.then.required = [\"data\"]",
      ".allOf.1.if.properties = [kind]",
      ".allOf.1.if.properties.kind.const = \"error\"",
      ".allOf.1.then.not.anyOf.0.required = [\"data\"]",
      ".allOf.1.then.not.anyOf.1.required = [\"accepted\"]",
      ".allOf.1.then.required = [\"error\"]",
      ".allOf.2.if.properties = [kind]",
      ".allOf.2.if.properties.kind.const = \"accepted\"",
      ".allOf.2.then.not.anyOf.0.required = [\"data\"]",
      ".allOf.2.then.not.anyOf.1.required = [\"error\"]",
      ".allOf.2.then.required = [\"accepted\"]",
      ".properties = [accepted, api_version, causation_id, correlation_id, data, error, kind, request_id, tenant_context]",
      ".properties.accepted.additionalProperties = false",
      ".properties.accepted.properties = [deep_link_ref, job_id, status_ref]",
      ".properties.accepted.properties.deep_link_ref.maxLength = 256",
      ".properties.accepted.properties.deep_link_ref.pattern = \"^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*)*$\"",
      ".properties.accepted.properties.deep_link_ref.type = \"string\"",
      ".properties.accepted.properties.job_id.maxLength = 128",
      ".properties.accepted.properties.job_id.minLength = 1",
      ".properties.accepted.properties.job_id.type = \"string\"",
      ".properties.accepted.properties.status_ref.maxLength = 256",
      ".properties.accepted.properties.status_ref.pattern = \"^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*)*$\"",
      ".properties.accepted.properties.status_ref.type = \"string\"",
      ".properties.accepted.required = [\"job_id\",\"status_ref\"]",
      ".properties.accepted.type = \"object\"",
      ".properties.api_version.minimum = 1",
      ".properties.api_version.type = \"integer\"",
      ".properties.causation_id.maxLength = 128",
      ".properties.causation_id.minLength = 1",
      ".properties.causation_id.type = \"string\"",
      ".properties.correlation_id.maxLength = 128",
      ".properties.correlation_id.minLength = 1",
      ".properties.correlation_id.type = \"string\"",
      ".properties.data.type = \"object\"",
      ".properties.error.$ref = \"../ctr-err-001/schema.json\"",
      ".properties.kind.enum = [\"success\",\"error\",\"accepted\"]",
      ".properties.request_id.maxLength = 128",
      ".properties.request_id.minLength = 1",
      ".properties.request_id.type = \"string\"",
      ".properties.tenant_context.$ref = \"../ctr-ten-001/schema.json\"",
      ".required = [\"api_version\",\"kind\",\"request_id\",\"correlation_id\",\"tenant_context\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-aud-001': {
    digest: '80676c327acc1c54',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [action]",
      ".allOf.0.if.properties.action.properties = [category]",
      ".allOf.0.if.properties.action.properties.category.const = \"delete\"",
      ".allOf.0.if.properties.action.required = [\"category\"]",
      ".allOf.0.if.required = [\"action\"]",
      ".allOf.0.then.properties = [change]",
      ".allOf.0.then.properties.change.required = [\"before_ref\"]",
      ".allOf.0.then.required = [\"change\"]",
      ".allOf.1.if.properties = [outcome]",
      ".allOf.1.if.properties.outcome.enum = [\"failed\",\"denied\"]",
      ".allOf.1.if.required = [\"outcome\"]",
      ".allOf.1.then.required = [\"error\"]",
      ".allOf.2.if.properties = [outcome]",
      ".allOf.2.if.properties.outcome.const = \"succeeded\"",
      ".allOf.2.if.required = [\"outcome\"]",
      ".allOf.2.then.not.required = [\"error\"]",
      ".properties = [action, actor, audit_id, causation_id, change, correlation_id, details, error, occurred_at, outcome, reason_key, redaction, retention, tenant_context]",
      ".properties.action.additionalProperties = false",
      ".properties.action.properties = [category, name]",
      ".properties.action.properties.category.enum = [\"role\",\"credential\",\"publish\",\"delete\",\"billing\",\"support\"]",
      ".properties.action.properties.name.maxLength = 96",
      ".properties.action.properties.name.pattern = \"^[a-z0-9_]+(\\\\.[a-z0-9_]+)+$\"",
      ".properties.action.properties.name.type = \"string\"",
      ".properties.action.required = [\"category\",\"name\"]",
      ".properties.action.type = \"object\"",
      ".properties.actor.additionalProperties = false",
      ".properties.actor.properties = [id, kind]",
      ".properties.actor.properties.id.minLength = 1",
      ".properties.actor.properties.id.type = \"string\"",
      ".properties.actor.properties.kind.enum = [\"user\",\"system_actor\"]",
      ".properties.actor.required = [\"kind\",\"id\"]",
      ".properties.actor.type = \"object\"",
      ".properties.audit_id.minLength = 1",
      ".properties.audit_id.type = \"string\"",
      ".properties.causation_id.minLength = 1",
      ".properties.causation_id.type = \"string\"",
      ".properties.change.additionalProperties = false",
      ".properties.change.properties = [after_ref, before_ref]",
      ".properties.change.properties.after_ref.maxLength = 256",
      ".properties.change.properties.after_ref.pattern = \"^(snapshot|record):[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*)*$\"",
      ".properties.change.properties.after_ref.type = \"string\"",
      ".properties.change.properties.before_ref.maxLength = 256",
      ".properties.change.properties.before_ref.pattern = \"^(snapshot|record):[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*)*$\"",
      ".properties.change.properties.before_ref.type = \"string\"",
      ".properties.change.type = \"object\"",
      ".properties.correlation_id.minLength = 1",
      ".properties.correlation_id.type = \"string\"",
      ".properties.details.maxProperties = 0",
      ".properties.details.type = \"object\"",
      ".properties.error.$ref = \"../ctr-err-001/schema.json\"",
      ".properties.occurred_at.format = \"date-time\"",
      ".properties.occurred_at.type = \"string\"",
      ".properties.outcome.enum = [\"succeeded\",\"failed\",\"denied\"]",
      ".properties.reason_key.maxLength = 96",
      ".properties.reason_key.pattern = \"^audit\\\\.[a-z0-9_.]+$\"",
      ".properties.reason_key.type = \"string\"",
      ".properties.redaction.additionalProperties = false",
      ".properties.redaction.properties = [content_redacted, pii_redacted, secret_redacted]",
      ".properties.redaction.properties.content_redacted.const = true",
      ".properties.redaction.properties.pii_redacted.const = true",
      ".properties.redaction.properties.secret_redacted.const = true",
      ".properties.redaction.required = [\"secret_redacted\",\"content_redacted\",\"pii_redacted\"]",
      ".properties.redaction.type = \"object\"",
      ".properties.retention.additionalProperties = false",
      ".properties.retention.properties = [policy_ref]",
      ".properties.retention.properties.policy_ref.maxLength = 96",
      ".properties.retention.properties.policy_ref.pattern = \"^retention\\\\.[a-z0-9_.]+$\"",
      ".properties.retention.properties.policy_ref.type = \"string\"",
      ".properties.retention.required = [\"policy_ref\"]",
      ".properties.retention.type = \"object\"",
      ".properties.tenant_context.$ref = \"../ctr-ten-001/schema.json\"",
      ".required = [\"audit_id\",\"occurred_at\",\"actor\",\"action\",\"tenant_context\",\"correlation_id\",\"outcome\",\"reason_key\",\"redaction\",\"retention\",\"details\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-err-001': {
    digest: '58d0cefec7a96119',
    sites: [
      ".additionalProperties = false",
      ".properties = [category, code, correlation_id, details, field_errors, message_key, retry_after_seconds, retryable]",
      ".properties.category.enum = [\"validation\",\"auth\",\"permission\",\"conflict\",\"rate_limit\",\"provider\",\"temporary\",\"internal\"]",
      ".properties.code.minLength = 1",
      ".properties.code.type = \"string\"",
      ".properties.correlation_id.minLength = 1",
      ".properties.correlation_id.type = \"string\"",
      ".properties.details.maxProperties = 0",
      ".properties.details.type = \"object\"",
      ".properties.field_errors.items.additionalProperties = false",
      ".properties.field_errors.items.properties = [code, field]",
      ".properties.field_errors.items.properties.code.minLength = 1",
      ".properties.field_errors.items.properties.code.type = \"string\"",
      ".properties.field_errors.items.properties.field.minLength = 1",
      ".properties.field_errors.items.properties.field.type = \"string\"",
      ".properties.field_errors.items.required = [\"field\",\"code\"]",
      ".properties.field_errors.items.type = \"object\"",
      ".properties.field_errors.type = \"array\"",
      ".properties.message_key.minLength = 1",
      ".properties.message_key.type = \"string\"",
      ".properties.retry_after_seconds.minimum = 1",
      ".properties.retry_after_seconds.type = \"integer\"",
      ".properties.retryable.type = \"boolean\"",
      ".required = [\"code\",\"message_key\",\"category\",\"retryable\",\"correlation_id\",\"details\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-evt-001': {
    digest: '8cd2878cb3b9c1d6',
    sites: [
      ".additionalProperties = false",
      ".properties = [causation_id, correlation_id, event_id, event_type, event_version, idempotency_key, metadata, occurred_at, payload, producer, subject, tenant_context]",
      ".properties.causation_id.maxLength = 128",
      ".properties.causation_id.minLength = 1",
      ".properties.causation_id.type = \"string\"",
      ".properties.correlation_id.maxLength = 128",
      ".properties.correlation_id.minLength = 1",
      ".properties.correlation_id.type = \"string\"",
      ".properties.event_id.maxLength = 128",
      ".properties.event_id.minLength = 1",
      ".properties.event_id.type = \"string\"",
      ".properties.event_type.maxLength = 128",
      ".properties.event_type.pattern = \"^[a-z0-9]+\\\\.[a-z0-9]+\\\\.[a-z0-9]+$\"",
      ".properties.event_type.type = \"string\"",
      ".properties.event_version.minimum = 1",
      ".properties.event_version.type = \"integer\"",
      ".properties.idempotency_key.maxLength = 200",
      ".properties.idempotency_key.minLength = 1",
      ".properties.idempotency_key.type = \"string\"",
      ".properties.metadata.additionalProperties = false",
      ".properties.metadata.properties = [schema_ref]",
      ".properties.metadata.properties.schema_ref.maxLength = 32",
      ".properties.metadata.properties.schema_ref.pattern = \"^CTR-[A-Z]{3}-[0-9]{3}@(0|[1-9][0-9]*)\\\\.(0|[1-9][0-9]*)\\\\.(0|[1-9][0-9]*)$\"",
      ".properties.metadata.properties.schema_ref.type = \"string\"",
      ".properties.metadata.required = [\"schema_ref\"]",
      ".properties.metadata.type = \"object\"",
      ".properties.occurred_at.format = \"date-time\"",
      ".properties.occurred_at.type = \"string\"",
      ".properties.payload.maxProperties = 0",
      ".properties.payload.type = \"object\"",
      ".properties.producer.additionalProperties = false",
      ".properties.producer.properties = [implementation_version, module_key]",
      ".properties.producer.properties.implementation_version.maxLength = 64",
      ".properties.producer.properties.implementation_version.minLength = 1",
      ".properties.producer.properties.implementation_version.type = \"string\"",
      ".properties.producer.properties.module_key.maxLength = 64",
      ".properties.producer.properties.module_key.minLength = 1",
      ".properties.producer.properties.module_key.type = \"string\"",
      ".properties.producer.required = [\"module_key\",\"implementation_version\"]",
      ".properties.producer.type = \"object\"",
      ".properties.subject.additionalProperties = false",
      ".properties.subject.properties = [id, type, version]",
      ".properties.subject.properties.id.maxLength = 128",
      ".properties.subject.properties.id.minLength = 1",
      ".properties.subject.properties.id.type = \"string\"",
      ".properties.subject.properties.type.maxLength = 64",
      ".properties.subject.properties.type.minLength = 1",
      ".properties.subject.properties.type.type = \"string\"",
      ".properties.subject.properties.version.minimum = 1",
      ".properties.subject.properties.version.type = \"integer\"",
      ".properties.subject.required = [\"type\",\"id\",\"version\"]",
      ".properties.subject.type = \"object\"",
      ".properties.tenant_context.$ref = \"../ctr-ten-001/schema.json\"",
      ".required = [\"event_id\",\"event_type\",\"event_version\",\"occurred_at\",\"producer\",\"tenant_context\",\"subject\",\"correlation_id\",\"payload\",\"metadata\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-flg-001': {
    digest: '60aa9eebe1c03f01',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [decision_source]",
      ".allOf.0.if.properties.decision_source.properties = [rule]",
      ".allOf.0.if.properties.decision_source.properties.rule.const = \"percentage_bucket\"",
      ".allOf.0.if.properties.decision_source.required = [\"rule\"]",
      ".allOf.0.if.required = [\"decision_source\"]",
      ".allOf.0.then.required = [\"bucket\"]",
      ".allOf.1.if.properties = [decision_source]",
      ".allOf.1.if.properties.decision_source.properties = [rule]",
      ".allOf.1.if.properties.decision_source.properties.rule.const = \"kill_switch\"",
      ".allOf.1.if.properties.decision_source.required = [\"rule\"]",
      ".allOf.1.if.required = [\"decision_source\"]",
      ".allOf.1.then.properties = [decision_source, effect]",
      ".allOf.1.then.properties.decision_source.properties = [scope]",
      ".allOf.1.then.properties.decision_source.properties.scope.const = \"platform\"",
      ".allOf.1.then.properties.effect.const = \"deny\"",
      ".allOf.2.if.properties = [write_disabled]",
      ".allOf.2.if.properties.write_disabled.const = true",
      ".allOf.2.if.required = [\"write_disabled\"]",
      ".allOf.2.then.properties = [historical_read_allowed]",
      ".allOf.2.then.properties.historical_read_allowed.const = true",
      ".allOf.2.then.required = [\"historical_read_allowed\"]",
      ".allOf.3.if.properties = [temporary]",
      ".allOf.3.if.properties.temporary.const = true",
      ".allOf.3.if.required = [\"temporary\"]",
      ".allOf.3.then.properties = [audit]",
      ".allOf.3.then.properties.audit.required = [\"expires_at\",\"owner_role\"]",
      ".allOf.3.then.required = [\"audit\"]",
      ".allOf.4.if.properties = [decision_source]",
      ".allOf.4.if.properties.decision_source.properties = [rule]",
      ".allOf.4.if.properties.decision_source.properties.rule.const = \"default_deny\"",
      ".allOf.4.if.properties.decision_source.required = [\"rule\"]",
      ".allOf.4.if.required = [\"decision_source\"]",
      ".allOf.4.then.properties = [effect]",
      ".allOf.4.then.properties.effect.const = \"deny\"",
      ".allOf.4.then.required = [\"effect\"]",
      ".allOf.5.if.properties = [decision_source]",
      ".allOf.5.if.properties.decision_source.properties = [rule]",
      ".allOf.5.if.properties.decision_source.properties.rule.const = \"explicit_deny\"",
      ".allOf.5.if.properties.decision_source.required = [\"rule\"]",
      ".allOf.5.if.required = [\"decision_source\"]",
      ".allOf.5.then.properties = [effect]",
      ".allOf.5.then.properties.effect.const = \"deny\"",
      ".allOf.5.then.required = [\"effect\"]",
      ".allOf.6.if.properties = [decision_source]",
      ".allOf.6.if.properties.decision_source.properties = [rule]",
      ".allOf.6.if.properties.decision_source.properties.rule.const = \"explicit_allow\"",
      ".allOf.6.if.properties.decision_source.required = [\"rule\"]",
      ".allOf.6.if.required = [\"decision_source\"]",
      ".allOf.6.then.properties = [effect]",
      ".allOf.6.then.properties.effect.const = \"allow\"",
      ".allOf.6.then.required = [\"effect\"]",
      ".properties = [audit, bucket, decided_at, decision_source, effect, evaluated_scopes, historical_read_allowed, policy_key, reason_key, temporary, write_disabled]",
      ".properties.audit.additionalProperties = false",
      ".properties.audit.properties = [actor, changed_at, expires_at, owner_role, reason_key]",
      ".properties.audit.properties.actor.additionalProperties = false",
      ".properties.audit.properties.actor.properties = [id, kind]",
      ".properties.audit.properties.actor.properties.id.minLength = 1",
      ".properties.audit.properties.actor.properties.id.type = \"string\"",
      ".properties.audit.properties.actor.properties.kind.enum = [\"user\",\"system_actor\"]",
      ".properties.audit.properties.actor.required = [\"kind\",\"id\"]",
      ".properties.audit.properties.actor.type = \"object\"",
      ".properties.audit.properties.changed_at.format = \"date-time\"",
      ".properties.audit.properties.changed_at.type = \"string\"",
      ".properties.audit.properties.expires_at.format = \"date-time\"",
      ".properties.audit.properties.expires_at.type = \"string\"",
      ".properties.audit.properties.owner_role.enum = [\"A0\",\"A1\",\"A2\",\"A3\",\"A4\",\"A5\",\"A6\"]",
      ".properties.audit.properties.reason_key.pattern = \"^policy\\\\.[a-z_.]+$\"",
      ".properties.audit.properties.reason_key.type = \"string\"",
      ".properties.audit.required = [\"actor\",\"reason_key\",\"changed_at\"]",
      ".properties.audit.type = \"object\"",
      ".properties.bucket.additionalProperties = false",
      ".properties.bucket.properties = [allocated, percentage]",
      ".properties.bucket.properties.allocated.type = \"boolean\"",
      ".properties.bucket.properties.percentage.maximum = 100",
      ".properties.bucket.properties.percentage.minimum = 0",
      ".properties.bucket.properties.percentage.type = \"integer\"",
      ".properties.bucket.required = [\"percentage\",\"allocated\"]",
      ".properties.bucket.type = \"object\"",
      ".properties.decided_at.format = \"date-time\"",
      ".properties.decided_at.type = \"string\"",
      ".properties.decision_source.additionalProperties = false",
      ".properties.decision_source.properties = [rule, scope]",
      ".properties.decision_source.properties.rule.enum = [\"kill_switch\",\"explicit_deny\",\"explicit_allow\",\"percentage_bucket\",\"default_deny\"]",
      ".properties.decision_source.properties.scope.enum = [\"platform\",\"plan\",\"workspace\",\"business\",\"capability\"]",
      ".properties.decision_source.required = [\"scope\",\"rule\"]",
      ".properties.decision_source.type = \"object\"",
      ".properties.effect.enum = [\"allow\",\"deny\"]",
      ".properties.evaluated_scopes.enum = [[\"platform\"],[\"platform\",\"plan\"],[\"platform\",\"plan\",\"workspace\"],[\"platform\",\"plan\",\"workspace\",\"business\"],[\"platform\",\"plan\",\"workspace\",\"business\",\"capability\"]]",
      ".properties.historical_read_allowed.type = \"boolean\"",
      ".properties.policy_key.pattern = \"^[a-z][a-z0-9.]*$\"",
      ".properties.policy_key.type = \"string\"",
      ".properties.reason_key.pattern = \"^policy\\\\.[a-z_.]+$\"",
      ".properties.reason_key.type = \"string\"",
      ".properties.temporary.type = \"boolean\"",
      ".properties.write_disabled.type = \"boolean\"",
      ".required = [\"policy_key\",\"effect\",\"decided_at\",\"decision_source\",\"reason_key\",\"evaluated_scopes\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-idm-001': {
    digest: '5ac140989679057f',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [state]",
      ".allOf.0.if.properties.state.const = \"completed\"",
      ".allOf.0.then.not.required = [\"error\"]",
      ".allOf.0.then.required = [\"completed_at\",\"result_ref\"]",
      ".allOf.1.if.properties = [state]",
      ".allOf.1.if.properties.state.const = \"failed\"",
      ".allOf.1.then.not.required = [\"result_ref\"]",
      ".allOf.1.then.required = [\"completed_at\",\"error\"]",
      ".allOf.2.if.properties = [state]",
      ".allOf.2.if.properties.state.const = \"in_progress\"",
      ".allOf.2.then.not.anyOf.0.required = [\"result_ref\"]",
      ".allOf.2.then.not.anyOf.1.required = [\"error\"]",
      ".allOf.2.then.not.anyOf.2.required = [\"completed_at\"]",
      ".properties = [completed_at, correlation_id, created_at, error, idempotency_key, payload_hash, result_ref, scope, state]",
      ".properties.completed_at.format = \"date-time\"",
      ".properties.completed_at.type = \"string\"",
      ".properties.correlation_id.maxLength = 128",
      ".properties.correlation_id.minLength = 1",
      ".properties.correlation_id.type = \"string\"",
      ".properties.created_at.format = \"date-time\"",
      ".properties.created_at.type = \"string\"",
      ".properties.error.$ref = \"../ctr-err-001/schema.json\"",
      ".properties.idempotency_key.maxLength = 128",
      ".properties.idempotency_key.minLength = 1",
      ".properties.idempotency_key.type = \"string\"",
      ".properties.payload_hash.pattern = \"^[a-z0-9-]+:[0-9a-f]{32,128}$\"",
      ".properties.payload_hash.type = \"string\"",
      ".properties.result_ref.maxLength = 256",
      ".properties.result_ref.pattern = \"^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*)*$\"",
      ".properties.result_ref.type = \"string\"",
      ".properties.scope.additionalProperties = false",
      ".properties.scope.properties = [operation, workspace_id]",
      ".properties.scope.properties.operation.pattern = \"^[a-z0-9]+(\\\\.[a-z0-9]+)+$\"",
      ".properties.scope.properties.operation.type = \"string\"",
      ".properties.scope.properties.workspace_id.maxLength = 128",
      ".properties.scope.properties.workspace_id.minLength = 1",
      ".properties.scope.properties.workspace_id.type = \"string\"",
      ".properties.scope.required = [\"workspace_id\",\"operation\"]",
      ".properties.scope.type = \"object\"",
      ".properties.state.enum = [\"in_progress\",\"completed\",\"failed\"]",
      ".required = [\"idempotency_key\",\"scope\",\"payload_hash\",\"state\",\"created_at\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-job-001': {
    digest: '62391eb76e72d55e',
    sites: [
      ".additionalProperties = false",
      ".properties = [attempt, available_at, cancel_requested_at, dedupe_key, input_ref, job_id, job_type, job_version, last_error_code, lease_expires_at, lease_owner, max_attempts, priority, progress_percent, progress_stage, result_ref, tenant_context, timeout_seconds]",
      ".properties.attempt.minimum = 0",
      ".properties.attempt.type = \"integer\"",
      ".properties.available_at.format = \"date-time\"",
      ".properties.available_at.type = \"string\"",
      ".properties.cancel_requested_at.format = \"date-time\"",
      ".properties.cancel_requested_at.type = \"string\"",
      ".properties.dedupe_key.maxLength = 128",
      ".properties.dedupe_key.minLength = 1",
      ".properties.dedupe_key.type = \"string\"",
      ".properties.input_ref.maxLength = 256",
      ".properties.input_ref.pattern = \"^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*)*$\"",
      ".properties.input_ref.type = \"string\"",
      ".properties.job_id.maxLength = 128",
      ".properties.job_id.minLength = 1",
      ".properties.job_id.type = \"string\"",
      ".properties.job_type.minLength = 1",
      ".properties.job_type.type = \"string\"",
      ".properties.job_version.minimum = 1",
      ".properties.job_version.type = \"integer\"",
      ".properties.last_error_code.minLength = 1",
      ".properties.last_error_code.type = \"string\"",
      ".properties.lease_expires_at.format = \"date-time\"",
      ".properties.lease_expires_at.type = \"string\"",
      ".properties.lease_owner.minLength = 1",
      ".properties.lease_owner.type = \"string\"",
      ".properties.max_attempts.minimum = 1",
      ".properties.max_attempts.type = \"integer\"",
      ".properties.priority.type = \"integer\"",
      ".properties.progress_percent.maximum = 100",
      ".properties.progress_percent.minimum = 0",
      ".properties.progress_percent.type = \"integer\"",
      ".properties.progress_stage.minLength = 1",
      ".properties.progress_stage.type = \"string\"",
      ".properties.result_ref.maxLength = 256",
      ".properties.result_ref.pattern = \"^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*)*$\"",
      ".properties.result_ref.type = \"string\"",
      ".properties.tenant_context.$ref = \"../ctr-ten-001/schema.json\"",
      ".properties.timeout_seconds.minimum = 1",
      ".properties.timeout_seconds.type = \"integer\"",
      ".required = [\"job_id\",\"job_type\",\"job_version\",\"tenant_context\",\"priority\",\"available_at\",\"attempt\",\"max_attempts\",\"timeout_seconds\",\"dedupe_key\",\"input_ref\",\"progress_percent\",\"progress_stage\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-mod-001': {
    digest: '59d8c7d8c9198664',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [lifecycle]",
      ".allOf.0.if.properties.lifecycle.properties = [state]",
      ".allOf.0.if.properties.lifecycle.properties.state.const = \"ready\"",
      ".allOf.0.if.properties.lifecycle.required = [\"state\"]",
      ".allOf.0.if.required = [\"lifecycle\"]",
      ".allOf.0.then.properties = [lifecycle]",
      ".allOf.0.then.properties.lifecycle.properties = [readiness]",
      ".allOf.0.then.properties.lifecycle.properties.readiness.properties = [activated]",
      ".allOf.0.then.properties.lifecycle.properties.readiness.properties.activated.const = true",
      ".allOf.0.then.properties.lifecycle.properties.readiness.required = [\"activated\"]",
      ".allOf.0.then.properties.lifecycle.required = [\"readiness\"]",
      ".allOf.1.if.properties = [lifecycle]",
      ".allOf.1.if.properties.lifecycle.properties = [state]",
      ".allOf.1.if.properties.lifecycle.properties.state.const = \"blocked\"",
      ".allOf.1.if.properties.lifecycle.required = [\"state\"]",
      ".allOf.1.if.required = [\"lifecycle\"]",
      ".allOf.1.then.properties = [lifecycle]",
      ".allOf.1.then.properties.lifecycle.properties = [readiness]",
      ".allOf.1.then.properties.lifecycle.properties.readiness.properties = [activated, missing]",
      ".allOf.1.then.properties.lifecycle.properties.readiness.properties.activated.const = false",
      ".allOf.1.then.properties.lifecycle.properties.readiness.properties.missing.minItems = 1",
      ".allOf.1.then.properties.lifecycle.properties.readiness.properties.missing.type = \"array\"",
      ".allOf.1.then.properties.lifecycle.properties.readiness.required = [\"activated\",\"missing\"]",
      ".allOf.1.then.properties.lifecycle.required = [\"readiness\"]",
      ".allOf.2.if.properties = [data_policy]",
      ".allOf.2.if.properties.data_policy.properties = [classification]",
      ".allOf.2.if.properties.data_policy.properties.classification.const = \"permissioned-data\"",
      ".allOf.2.if.properties.data_policy.required = [\"classification\"]",
      ".allOf.2.if.required = [\"data_policy\"]",
      ".allOf.2.then.properties = [data_policy]",
      ".allOf.2.then.properties.data_policy.properties = [tenant_scoped]",
      ".allOf.2.then.properties.data_policy.properties.tenant_scoped.const = true",
      ".allOf.2.then.properties.data_policy.required = [\"classification\",\"tenant_scoped\",\"retention_reference\",\"consent_reference\",\"redaction_reference\"]",
      ".properties = [capabilities, cost_policy, data_policy, dependencies, lifecycle, module_id, module_key, owner_role, permissions, secret_handles, version]",
      ".properties.capabilities.items.additionalProperties = false",
      ".properties.capabilities.items.properties = [capability_key, version]",
      ".properties.capabilities.items.properties.capability_key.pattern = \"^[a-z][a-z0-9.]*$\"",
      ".properties.capabilities.items.properties.capability_key.type = \"string\"",
      ".properties.capabilities.items.properties.version.minimum = 1",
      ".properties.capabilities.items.properties.version.type = \"integer\"",
      ".properties.capabilities.items.required = [\"capability_key\",\"version\"]",
      ".properties.capabilities.items.type = \"object\"",
      ".properties.capabilities.minItems = 1",
      ".properties.capabilities.type = \"array\"",
      ".properties.capabilities.uniqueItems = true",
      ".properties.cost_policy.additionalProperties = false",
      ".properties.cost_policy.properties = [metered, usage_contract]",
      ".properties.cost_policy.properties.metered.type = \"boolean\"",
      ".properties.cost_policy.properties.usage_contract.pattern = \"^CTR-[A-Z]{3}-[0-9]{3}$\"",
      ".properties.cost_policy.properties.usage_contract.type = \"string\"",
      ".properties.cost_policy.required = [\"metered\"]",
      ".properties.cost_policy.type = \"object\"",
      ".properties.data_policy.additionalProperties = false",
      ".properties.data_policy.properties = [classification, consent_reference, redaction_reference, retention_reference, tenant_scoped]",
      ".properties.data_policy.properties.classification.enum = [\"synthetic-only\",\"tenant-data\",\"permissioned-data\"]",
      ".properties.data_policy.properties.consent_reference.minLength = 1",
      ".properties.data_policy.properties.consent_reference.type = \"string\"",
      ".properties.data_policy.properties.redaction_reference.minLength = 1",
      ".properties.data_policy.properties.redaction_reference.type = \"string\"",
      ".properties.data_policy.properties.retention_reference.minLength = 1",
      ".properties.data_policy.properties.retention_reference.type = \"string\"",
      ".properties.data_policy.properties.tenant_scoped.type = \"boolean\"",
      ".properties.data_policy.required = [\"classification\",\"tenant_scoped\"]",
      ".properties.data_policy.type = \"object\"",
      ".properties.dependencies.items.additionalProperties = false",
      ".properties.dependencies.items.properties = [module_key, range]",
      ".properties.dependencies.items.properties.module_key.pattern = \"^[a-z][a-z0-9-]*$\"",
      ".properties.dependencies.items.properties.module_key.type = \"string\"",
      ".properties.dependencies.items.properties.range.minLength = 1",
      ".properties.dependencies.items.properties.range.type = \"string\"",
      ".properties.dependencies.items.required = [\"module_key\",\"range\"]",
      ".properties.dependencies.items.type = \"object\"",
      ".properties.dependencies.type = \"array\"",
      ".properties.dependencies.uniqueItems = true",
      ".properties.lifecycle.additionalProperties = false",
      ".properties.lifecycle.properties = [readiness, state, supports_drain]",
      ".properties.lifecycle.properties.readiness.additionalProperties = false",
      ".properties.lifecycle.properties.readiness.properties = [activated, missing, reason]",
      ".properties.lifecycle.properties.readiness.properties.activated.type = \"boolean\"",
      ".properties.lifecycle.properties.readiness.properties.missing.items.enum = [\"secret_handle\",\"scope\",\"entitlement\",\"permission\",\"health\"]",
      ".properties.lifecycle.properties.readiness.properties.missing.minItems = 1",
      ".properties.lifecycle.properties.readiness.properties.missing.type = \"array\"",
      ".properties.lifecycle.properties.readiness.properties.reason.pattern = \"^readiness\\\\.[a-z_.]+$\"",
      ".properties.lifecycle.properties.readiness.properties.reason.type = \"string\"",
      ".properties.lifecycle.properties.readiness.required = [\"activated\",\"reason\"]",
      ".properties.lifecycle.properties.readiness.type = \"object\"",
      ".properties.lifecycle.properties.state.enum = [\"registered\",\"initializing\",\"ready\",\"draining\",\"stopped\",\"blocked\"]",
      ".properties.lifecycle.properties.supports_drain.type = \"boolean\"",
      ".properties.lifecycle.required = [\"state\",\"supports_drain\"]",
      ".properties.lifecycle.type = \"object\"",
      ".properties.module_id.pattern = \"^MOD-(0[0-9]{2}|1[0-4][0-9])$\"",
      ".properties.module_id.type = \"string\"",
      ".properties.module_key.pattern = \"^[a-z][a-z0-9-]*$\"",
      ".properties.module_key.type = \"string\"",
      ".properties.owner_role.enum = [\"A0\",\"A1\",\"A2\",\"A3\",\"A4\",\"A5\",\"A6\"]",
      ".properties.permissions.items.minLength = 1",
      ".properties.permissions.items.type = \"string\"",
      ".properties.permissions.type = \"array\"",
      ".properties.permissions.uniqueItems = true",
      ".properties.secret_handles.items.pattern = \"^secret:[a-z0-9._-]+$\"",
      ".properties.secret_handles.items.type = \"string\"",
      ".properties.secret_handles.type = \"array\"",
      ".properties.secret_handles.uniqueItems = true",
      ".properties.version.pattern = \"^(0|[1-9]\\\\d*)\\\\.(0|[1-9]\\\\d*)\\\\.(0|[1-9]\\\\d*)(?:-[0-9A-Za-z-]+(?:\\\\.[0-9A-Za-z-]+)*)?(?:\\\\+[0-9A-Za-z-]+(?:\\\\.[0-9A-Za-z-]+)*)?$\"",
      ".properties.version.type = \"string\"",
      ".required = [\"module_key\",\"module_id\",\"version\",\"owner_role\",\"capabilities\",\"dependencies\",\"permissions\",\"cost_policy\",\"data_policy\",\"lifecycle\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-ntf-001': {
    digest: 'fb2df24d208929e2',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [kind]",
      ".allOf.0.if.properties.kind.const = \"command\"",
      ".allOf.0.if.required = [\"kind\"]",
      ".allOf.0.then.not.required = [\"delivery\"]",
      ".allOf.0.then.required = [\"channel\",\"message_key\",\"deep_link\"]",
      ".allOf.1.if.properties = [kind]",
      ".allOf.1.if.properties.kind.const = \"result\"",
      ".allOf.1.if.required = [\"kind\"]",
      ".allOf.1.then.required = [\"delivery\"]",
      ".allOf.2.if.properties = [delivery]",
      ".allOf.2.if.properties.delivery.properties = [state]",
      ".allOf.2.if.properties.delivery.properties.state.const = \"failed\"",
      ".allOf.2.if.properties.delivery.required = [\"state\"]",
      ".allOf.2.if.required = [\"delivery\"]",
      ".allOf.2.then.properties = [delivery]",
      ".allOf.2.then.properties.delivery.required = [\"state\",\"failure_class\"]",
      ".allOf.3.if.properties = [delivery]",
      ".allOf.3.if.properties.delivery.properties = [state]",
      ".allOf.3.if.properties.delivery.properties.state.const = \"delivered\"",
      ".allOf.3.if.properties.delivery.required = [\"state\"]",
      ".allOf.3.if.required = [\"delivery\"]",
      ".allOf.3.then.properties = [delivery]",
      ".allOf.3.then.properties.delivery.not.required = [\"failure_class\"]",
      ".properties = [channel, dedupe_key, deep_link, delivery, kind, locale, message_key, notification_id, tenant_context]",
      ".properties.channel.enum = [\"in_app\",\"email\",\"line\"]",
      ".properties.dedupe_key.minLength = 1",
      ".properties.dedupe_key.type = \"string\"",
      ".properties.deep_link.additionalProperties = false",
      ".properties.deep_link.properties = [requires_permission, target_ref]",
      ".properties.deep_link.properties.requires_permission.const = true",
      ".properties.deep_link.properties.target_ref.pattern = \"^(app|content|asset|job):[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\\\.[A-Za-z0-9_-]+)*)*$\"",
      ".properties.deep_link.properties.target_ref.type = \"string\"",
      ".properties.deep_link.required = [\"target_ref\",\"requires_permission\"]",
      ".properties.deep_link.type = \"object\"",
      ".properties.delivery.additionalProperties = false",
      ".properties.delivery.properties = [failure_class, state]",
      ".properties.delivery.properties.failure_class.enum = [\"transient\",\"permanent\"]",
      ".properties.delivery.properties.state.enum = [\"queued\",\"delivered\",\"failed\",\"suppressed_duplicate\"]",
      ".properties.delivery.required = [\"state\"]",
      ".properties.delivery.type = \"object\"",
      ".properties.kind.enum = [\"command\",\"result\"]",
      ".properties.locale.enum = [\"th-TH\"]",
      ".properties.message_key.pattern = \"^notification\\\\.[a-z_.]+$\"",
      ".properties.message_key.type = \"string\"",
      ".properties.notification_id.minLength = 1",
      ".properties.notification_id.type = \"string\"",
      ".properties.tenant_context.$ref = \"../ctr-ten-001/schema.json\"",
      ".required = [\"kind\",\"notification_id\",\"dedupe_key\",\"locale\",\"tenant_context\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-obs-001': {
    digest: '31b8ed3985d4ccd8',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [readiness]",
      ".allOf.0.if.properties.readiness.properties = [ready]",
      ".allOf.0.if.properties.readiness.properties.ready.const = true",
      ".allOf.0.if.properties.readiness.required = [\"ready\"]",
      ".allOf.0.if.required = [\"readiness\"]",
      ".allOf.0.then.properties = [readiness]",
      ".allOf.0.then.properties.readiness.properties = [capabilities]",
      ".allOf.0.then.properties.readiness.properties.capabilities.items.properties = [ready]",
      ".allOf.0.then.properties.readiness.properties.capabilities.items.properties.ready.const = true",
      ".allOf.1.if.properties = [liveness]",
      ".allOf.1.if.properties.liveness.properties = [status]",
      ".allOf.1.if.properties.liveness.properties.status.const = \"down\"",
      ".allOf.1.if.properties.liveness.required = [\"status\"]",
      ".allOf.1.if.required = [\"liveness\"]",
      ".allOf.1.then.properties = [readiness]",
      ".allOf.1.then.properties.readiness.properties = [ready]",
      ".allOf.1.then.properties.readiness.properties.ready.const = false",
      ".properties = [correlation, dependencies, environment, liveness, module, readiness, redaction, sli_tags]",
      ".properties.correlation.additionalProperties = false",
      ".properties.correlation.properties = [causation_id, correlation_id, job_id, request_id, trace_id]",
      ".properties.correlation.properties.causation_id.minLength = 1",
      ".properties.correlation.properties.causation_id.type = \"string\"",
      ".properties.correlation.properties.correlation_id.minLength = 1",
      ".properties.correlation.properties.correlation_id.type = \"string\"",
      ".properties.correlation.properties.job_id.minLength = 1",
      ".properties.correlation.properties.job_id.type = \"string\"",
      ".properties.correlation.properties.request_id.minLength = 1",
      ".properties.correlation.properties.request_id.type = \"string\"",
      ".properties.correlation.properties.trace_id.minLength = 1",
      ".properties.correlation.properties.trace_id.type = \"string\"",
      ".properties.correlation.required = [\"correlation_id\"]",
      ".properties.correlation.type = \"object\"",
      ".properties.dependencies.items.additionalProperties = false",
      ".properties.dependencies.items.properties = [dependency_key, kind, status]",
      ".properties.dependencies.items.properties.dependency_key.pattern = \"^[a-z][a-z0-9.-]*$\"",
      ".properties.dependencies.items.properties.dependency_key.type = \"string\"",
      ".properties.dependencies.items.properties.kind.enum = [\"module\",\"external_provider\"]",
      ".properties.dependencies.items.properties.status.enum = [\"healthy\",\"degraded\",\"unavailable\"]",
      ".properties.dependencies.items.required = [\"dependency_key\",\"kind\",\"status\"]",
      ".properties.dependencies.items.type = \"object\"",
      ".properties.dependencies.type = \"array\"",
      ".properties.dependencies.uniqueItems = true",
      ".properties.environment.enum = [\"local\",\"preview\",\"staging\",\"production\"]",
      ".properties.liveness.additionalProperties = false",
      ".properties.liveness.properties = [depends_on_external_provider, status]",
      ".properties.liveness.properties.depends_on_external_provider.const = false",
      ".properties.liveness.properties.status.enum = [\"up\",\"down\"]",
      ".properties.liveness.required = [\"status\",\"depends_on_external_provider\"]",
      ".properties.liveness.type = \"object\"",
      ".properties.module.additionalProperties = false",
      ".properties.module.properties = [implementation_version, module_key]",
      ".properties.module.properties.implementation_version.minLength = 1",
      ".properties.module.properties.implementation_version.type = \"string\"",
      ".properties.module.properties.module_key.pattern = \"^[a-z][a-z0-9-]*$\"",
      ".properties.module.properties.module_key.type = \"string\"",
      ".properties.module.required = [\"module_key\",\"implementation_version\"]",
      ".properties.module.type = \"object\"",
      ".properties.readiness.additionalProperties = false",
      ".properties.readiness.properties = [capabilities, ready]",
      ".properties.readiness.properties.capabilities.items.additionalProperties = false",
      ".properties.readiness.properties.capabilities.items.allOf.0.if.properties = [ready]",
      ".properties.readiness.properties.capabilities.items.allOf.0.if.properties.ready.const = false",
      ".properties.readiness.properties.capabilities.items.allOf.0.if.required = [\"ready\"]",
      ".properties.readiness.properties.capabilities.items.allOf.0.then.required = [\"reason_key\"]",
      ".properties.readiness.properties.capabilities.items.properties = [capability_key, ready, reason_key]",
      ".properties.readiness.properties.capabilities.items.properties.capability_key.pattern = \"^[a-z][a-z0-9.]*$\"",
      ".properties.readiness.properties.capabilities.items.properties.capability_key.type = \"string\"",
      ".properties.readiness.properties.capabilities.items.properties.ready.type = \"boolean\"",
      ".properties.readiness.properties.capabilities.items.properties.reason_key.maxLength = 96",
      ".properties.readiness.properties.capabilities.items.properties.reason_key.pattern = \"^readiness\\\\.[a-z0-9_.]+$\"",
      ".properties.readiness.properties.capabilities.items.properties.reason_key.type = \"string\"",
      ".properties.readiness.properties.capabilities.items.required = [\"capability_key\",\"ready\"]",
      ".properties.readiness.properties.capabilities.items.type = \"object\"",
      ".properties.readiness.properties.capabilities.minItems = 1",
      ".properties.readiness.properties.capabilities.type = \"array\"",
      ".properties.readiness.properties.ready.type = \"boolean\"",
      ".properties.readiness.required = [\"ready\",\"capabilities\"]",
      ".properties.readiness.type = \"object\"",
      ".properties.redaction.additionalProperties = false",
      ".properties.redaction.properties = [content_redacted, pii_redacted, secret_redacted]",
      ".properties.redaction.properties.content_redacted.const = true",
      ".properties.redaction.properties.pii_redacted.const = true",
      ".properties.redaction.properties.secret_redacted.const = true",
      ".properties.redaction.required = [\"secret_redacted\",\"content_redacted\",\"pii_redacted\"]",
      ".properties.redaction.type = \"object\"",
      ".properties.sli_tags.additionalProperties = false",
      ".properties.sli_tags.properties = [capability_key, environment, error_code, module_key, outcome]",
      ".properties.sli_tags.properties.capability_key.pattern = \"^[a-z0-9_.:-]{1,64}$\"",
      ".properties.sli_tags.properties.capability_key.type = \"string\"",
      ".properties.sli_tags.properties.environment.pattern = \"^[a-z0-9_.:-]{1,64}$\"",
      ".properties.sli_tags.properties.environment.type = \"string\"",
      ".properties.sli_tags.properties.error_code.pattern = \"^[a-z0-9_.:-]{1,64}$\"",
      ".properties.sli_tags.properties.error_code.type = \"string\"",
      ".properties.sli_tags.properties.module_key.pattern = \"^[a-z0-9_.:-]{1,64}$\"",
      ".properties.sli_tags.properties.module_key.type = \"string\"",
      ".properties.sli_tags.properties.outcome.pattern = \"^[a-z0-9_.:-]{1,64}$\"",
      ".properties.sli_tags.properties.outcome.type = \"string\"",
      ".properties.sli_tags.required = [\"module_key\",\"environment\"]",
      ".properties.sli_tags.type = \"object\"",
      ".required = [\"correlation\",\"module\",\"environment\",\"liveness\",\"readiness\",\"sli_tags\",\"redaction\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-pag-001': {
    digest: 'b7c65d64d6a9f75f',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [kind]",
      ".allOf.0.if.properties.kind.const = \"request\"",
      ".allOf.0.then.not.anyOf.0.required = [\"items\"]",
      ".allOf.0.then.not.anyOf.1.required = [\"next_cursor\"]",
      ".allOf.0.then.not.anyOf.2.required = [\"has_more\"]",
      ".allOf.0.then.required = [\"page_size\",\"sort\"]",
      ".allOf.1.if.properties = [kind]",
      ".allOf.1.if.properties.kind.const = \"page\"",
      ".allOf.1.then.allOf.0.if.properties = [has_more]",
      ".allOf.1.then.allOf.0.if.properties.has_more.const = true",
      ".allOf.1.then.allOf.0.if.required = [\"has_more\"]",
      ".allOf.1.then.allOf.0.then.properties = [next_cursor]",
      ".allOf.1.then.allOf.0.then.properties.next_cursor.minLength = 1",
      ".allOf.1.then.allOf.0.then.properties.next_cursor.type = \"string\"",
      ".allOf.1.then.allOf.0.then.required = [\"next_cursor\"]",
      ".allOf.1.then.allOf.1.if.properties = [has_more]",
      ".allOf.1.then.allOf.1.if.properties.has_more.const = false",
      ".allOf.1.then.allOf.1.if.required = [\"has_more\"]",
      ".allOf.1.then.allOf.1.then.properties = [next_cursor]",
      ".allOf.1.then.allOf.1.then.properties.next_cursor.type = \"null\"",
      ".allOf.1.then.not.required = [\"cursor\"]",
      ".allOf.1.then.required = [\"items\",\"next_cursor\",\"has_more\",\"sort\"]",
      ".properties = [cursor, filter, has_more, items, kind, next_cursor, page_size, sort]",
      ".properties.cursor.minLength = 1",
      ".properties.cursor.type = \"string\"",
      ".properties.filter.type = \"object\"",
      ".properties.has_more.type = \"boolean\"",
      ".properties.items.type = \"array\"",
      ".properties.kind.enum = [\"request\",\"page\"]",
      ".properties.next_cursor.minLength = 1",
      ".properties.next_cursor.type = [\"string\",\"null\"]",
      ".properties.page_size.minimum = 1",
      ".properties.page_size.type = \"integer\"",
      ".properties.sort.items.additionalProperties = false",
      ".properties.sort.items.properties = [direction, field]",
      ".properties.sort.items.properties.direction.enum = [\"asc\",\"desc\"]",
      ".properties.sort.items.properties.field.minLength = 1",
      ".properties.sort.items.properties.field.type = \"string\"",
      ".properties.sort.items.required = [\"field\",\"direction\"]",
      ".properties.sort.items.type = \"object\"",
      ".properties.sort.minItems = 2",
      ".properties.sort.type = \"array\"",
      ".properties.sort.uniqueItems = true",
      ".required = [\"kind\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-sec-001': {
    digest: '638983384c302c88',
    sites: [
      ".additionalProperties = false",
      ".allOf.0.if.properties = [state]",
      ".allOf.0.if.properties.state.const = \"revoked\"",
      ".allOf.0.if.required = [\"state\"]",
      ".allOf.0.then.properties = [resolvable]",
      ".allOf.0.then.properties.resolvable.const = false",
      ".allOf.0.then.required = [\"revocation\"]",
      ".allOf.1.if.properties = [state]",
      ".allOf.1.if.properties.state.const = \"active\"",
      ".allOf.1.if.required = [\"state\"]",
      ".allOf.1.then.not.required = [\"revocation\"]",
      ".allOf.1.then.properties = [resolvable]",
      ".allOf.1.then.properties.resolvable.const = true",
      ".allOf.2.if.properties = [ownership]",
      ".allOf.2.if.properties.ownership.const = \"managed\"",
      ".allOf.2.if.required = [\"ownership\"]",
      ".allOf.2.then.properties = [rotation]",
      ".allOf.2.then.properties.rotation.properties = [owner]",
      ".allOf.2.then.properties.rotation.properties.owner.properties = [kind]",
      ".allOf.2.then.properties.rotation.properties.owner.properties.kind.const = \"platform_role\"",
      ".allOf.2.then.properties.rotation.properties.owner.required = [\"kind\"]",
      ".allOf.2.then.properties.rotation.required = [\"owner\"]",
      ".allOf.3.if.properties = [ownership]",
      ".allOf.3.if.properties.ownership.const = \"byok\"",
      ".allOf.3.if.required = [\"ownership\"]",
      ".allOf.3.then.properties = [rotation]",
      ".allOf.3.then.properties.rotation.properties = [owner]",
      ".allOf.3.then.properties.rotation.properties.owner.properties = [kind]",
      ".allOf.3.then.properties.rotation.properties.owner.properties.kind.const = \"workspace_owner\"",
      ".allOf.3.then.properties.rotation.properties.owner.required = [\"kind\"]",
      ".allOf.3.then.properties.rotation.required = [\"owner\"]",
      ".properties = [classification, correlation_id, handle, ownership, redaction, resolvable, revocation, rotation, scope, state]",
      ".properties.classification.enum = [\"public\",\"internal\",\"confidential\",\"restricted\"]",
      ".properties.correlation_id.minLength = 1",
      ".properties.correlation_id.type = \"string\"",
      ".properties.handle.maxLength = 128",
      ".properties.handle.pattern = \"^secret:[a-z0-9._-]+$\"",
      ".properties.handle.type = \"string\"",
      ".properties.ownership.enum = [\"managed\",\"byok\"]",
      ".properties.redaction.additionalProperties = false",
      ".properties.redaction.properties = [analytics_safe, browser_safe, error_trace_safe, event_safe, job_safe, log_safe]",
      ".properties.redaction.properties.analytics_safe.const = true",
      ".properties.redaction.properties.browser_safe.const = true",
      ".properties.redaction.properties.error_trace_safe.const = true",
      ".properties.redaction.properties.event_safe.const = true",
      ".properties.redaction.properties.job_safe.const = true",
      ".properties.redaction.properties.log_safe.const = true",
      ".properties.redaction.required = [\"browser_safe\",\"log_safe\",\"event_safe\",\"job_safe\",\"analytics_safe\",\"error_trace_safe\"]",
      ".properties.redaction.type = \"object\"",
      ".properties.resolvable.type = \"boolean\"",
      ".properties.revocation.additionalProperties = false",
      ".properties.revocation.properties = [actor, reason_key, revoked_at]",
      ".properties.revocation.properties.actor.additionalProperties = false",
      ".properties.revocation.properties.actor.properties = [id, kind]",
      ".properties.revocation.properties.actor.properties.id.minLength = 1",
      ".properties.revocation.properties.actor.properties.id.type = \"string\"",
      ".properties.revocation.properties.actor.properties.kind.enum = [\"user\",\"system_actor\"]",
      ".properties.revocation.properties.actor.required = [\"kind\",\"id\"]",
      ".properties.revocation.properties.actor.type = \"object\"",
      ".properties.revocation.properties.reason_key.pattern = \"^secret\\\\.[a-z_.]+$\"",
      ".properties.revocation.properties.reason_key.type = \"string\"",
      ".properties.revocation.properties.revoked_at.format = \"date-time\"",
      ".properties.revocation.properties.revoked_at.type = \"string\"",
      ".properties.revocation.required = [\"revoked_at\",\"actor\",\"reason_key\"]",
      ".properties.revocation.type = \"object\"",
      ".properties.rotation.additionalProperties = false",
      ".properties.rotation.properties = [next_rotation_due_at, owner, rotated_at]",
      ".properties.rotation.properties.next_rotation_due_at.format = \"date-time\"",
      ".properties.rotation.properties.next_rotation_due_at.type = \"string\"",
      ".properties.rotation.properties.owner.additionalProperties = false",
      ".properties.rotation.properties.owner.properties = [id, kind]",
      ".properties.rotation.properties.owner.properties.id.minLength = 1",
      ".properties.rotation.properties.owner.properties.id.type = \"string\"",
      ".properties.rotation.properties.owner.properties.kind.enum = [\"platform_role\",\"workspace_owner\"]",
      ".properties.rotation.properties.owner.required = [\"kind\",\"id\"]",
      ".properties.rotation.properties.owner.type = \"object\"",
      ".properties.rotation.properties.rotated_at.format = \"date-time\"",
      ".properties.rotation.properties.rotated_at.type = \"string\"",
      ".properties.rotation.required = [\"owner\",\"rotated_at\"]",
      ".properties.rotation.type = \"object\"",
      ".properties.scope.additionalProperties = false",
      ".properties.scope.properties = [business_profile_id, capability_key, page_context_profile_id, workspace_id]",
      ".properties.scope.properties.business_profile_id.minLength = 1",
      ".properties.scope.properties.business_profile_id.type = \"string\"",
      ".properties.scope.properties.capability_key.pattern = \"^[a-z][a-z0-9.]*$\"",
      ".properties.scope.properties.capability_key.type = \"string\"",
      ".properties.scope.properties.page_context_profile_id.minLength = 1",
      ".properties.scope.properties.page_context_profile_id.type = \"string\"",
      ".properties.scope.properties.workspace_id.minLength = 1",
      ".properties.scope.properties.workspace_id.type = \"string\"",
      ".properties.scope.required = [\"workspace_id\",\"capability_key\"]",
      ".properties.scope.type = \"object\"",
      ".properties.state.enum = [\"active\",\"rotating\",\"revoked\"]",
      ".required = [\"handle\",\"scope\",\"ownership\",\"classification\",\"state\",\"resolvable\",\"rotation\",\"redaction\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-ten-001': {
    digest: 'a91d0bcf161ca5a7',
    sites: [
      ".additionalProperties = false",
      ".properties = [actor, business_profile_id, causation_id, correlation_id, locale, page_context_profile_id, request_id, timezone, workspace_id]",
      ".properties.actor.additionalProperties = false",
      ".properties.actor.properties = [id, kind]",
      ".properties.actor.properties.id.minLength = 1",
      ".properties.actor.properties.id.type = \"string\"",
      ".properties.actor.properties.kind.enum = [\"user\",\"system_actor\"]",
      ".properties.actor.required = [\"kind\",\"id\"]",
      ".properties.actor.type = \"object\"",
      ".properties.business_profile_id.minLength = 1",
      ".properties.business_profile_id.type = \"string\"",
      ".properties.causation_id.minLength = 1",
      ".properties.causation_id.type = \"string\"",
      ".properties.correlation_id.minLength = 1",
      ".properties.correlation_id.type = \"string\"",
      ".properties.locale.const = \"th-TH\"",
      ".properties.page_context_profile_id.minLength = 1",
      ".properties.page_context_profile_id.type = \"string\"",
      ".properties.request_id.minLength = 1",
      ".properties.request_id.type = \"string\"",
      ".properties.timezone.const = \"Asia/Bangkok\"",
      ".properties.workspace_id.minLength = 1",
      ".properties.workspace_id.type = \"string\"",
      ".required = [\"workspace_id\",\"actor\",\"request_id\",\"correlation_id\",\"locale\",\"timezone\"]",
      ".type = \"object\"",
    ],
  },
  'ctr-usg-001': {
    digest: '7546cafb151d70f9',
    sites: [
      ".additionalProperties = false",
      ".properties = [attribution, cost, dedupe_key, dimension, occurred_at, quantity, tenant_context, usage_id]",
      ".properties.attribution.additionalProperties = false",
      ".properties.attribution.properties = [business_profile_id, job_id, provider_key, workspace_id]",
      ".properties.attribution.properties.business_profile_id.minLength = 1",
      ".properties.attribution.properties.business_profile_id.type = \"string\"",
      ".properties.attribution.properties.job_id.minLength = 1",
      ".properties.attribution.properties.job_id.type = \"string\"",
      ".properties.attribution.properties.provider_key.pattern = \"^[a-z][a-z0-9._-]*$\"",
      ".properties.attribution.properties.provider_key.type = \"string\"",
      ".properties.attribution.properties.workspace_id.minLength = 1",
      ".properties.attribution.properties.workspace_id.type = \"string\"",
      ".properties.attribution.required = [\"workspace_id\",\"job_id\",\"provider_key\"]",
      ".properties.attribution.type = \"object\"",
      ".properties.cost.additionalProperties = false",
      ".properties.cost.properties = [amount, basis, currency, supersedes_usage_id]",
      ".properties.cost.properties.amount.pattern = \"^(0|[1-9][0-9]{0,15})\\\\.[0-9]{2,8}$\"",
      ".properties.cost.properties.amount.type = \"string\"",
      ".properties.cost.properties.basis.enum = [\"provider_reported\",\"estimated\"]",
      ".properties.cost.properties.currency.enum = [\"THB\",\"USD\"]",
      ".properties.cost.properties.supersedes_usage_id.minLength = 1",
      ".properties.cost.properties.supersedes_usage_id.type = \"string\"",
      ".properties.cost.required = [\"amount\",\"currency\",\"basis\"]",
      ".properties.cost.type = \"object\"",
      ".properties.dedupe_key.minLength = 1",
      ".properties.dedupe_key.type = \"string\"",
      ".properties.dimension.enum = [\"ai_tokens\",\"research_search\",\"storage_bytes\",\"egress_bytes\",\"media_processing\",\"publish_operation\"]",
      ".properties.occurred_at.format = \"date-time\"",
      ".properties.occurred_at.type = \"string\"",
      ".properties.quantity.additionalProperties = false",
      ".properties.quantity.properties = [amount, unit]",
      ".properties.quantity.properties.amount.pattern = \"^(0|[1-9][0-9]{0,15})(\\\\.[0-9]{1,8})?$\"",
      ".properties.quantity.properties.amount.type = \"string\"",
      ".properties.quantity.properties.unit.enum = [\"token\",\"request\",\"byte\",\"second\",\"operation\"]",
      ".properties.quantity.required = [\"amount\",\"unit\"]",
      ".properties.quantity.type = \"object\"",
      ".properties.tenant_context.$ref = \"../ctr-ten-001/schema.json\"",
      ".properties.usage_id.minLength = 1",
      ".properties.usage_id.type = \"string\"",
      ".required = [\"usage_id\",\"occurred_at\",\"dimension\",\"quantity\",\"attribution\",\"cost\",\"dedupe_key\",\"tenant_context\"]",
      ".type = \"object\"",
    ],
  },
};

// Keywords whose VALUE is a subschema (or a map of them). An empty subschema under any of these
// is a rule with no keywords in it, which is why a keyword-driven surface cannot see it.
// Distinct from STRUCTURAL above, which is the walk's descent set: this is the set of keywords
// whose VALUE is a subschema, and so can be empty.
const SUBSCHEMA_VALUED = new Set([
  'not', 'if', 'then', 'else', 'items', 'contains', 'propertyNames',
  'additionalProperties', 'unevaluatedProperties', 'unevaluatedItems',
  // `additionalItems` (2019-09) and `contentSchema` complete the single-subschema set. Neither
  // appears in this catalog and neither is supported by the validator, so today they are
  // rejected earlier -- but a set that is complete only by accident of what is currently
  // written is not a set, and the next contract is what breaks it.
  'additionalItems', 'contentSchema',
]);

const COMBINATOR_KEYWORDS = new Set(['allOf', 'anyOf', 'oneOf']);

function isEmptySubschema(value) {
  if (value === true || value === false) return false; // a boolean schema is explicit, not empty
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  // `x-` annotations are skipped everywhere else in this file; a subschema carrying only
  // annotations still constrains nothing.
  return Object.keys(value).every((key) => key.startsWith('x-'));
}

function surfaceOf(schema) {
  const entries = [];
  // `inProperties` for the same reason `constraintSites` needs it: a container's keys are
  // NAMES. Without it, `subject.properties.type` was recorded as a `type` assertion whose
  // value is the whole subschema -- 380 characters including an `x-` annotation every other
  // guard deliberately skips -- so appending one sentence to that comment failed CI. A false
  // failure, and a nonsense line in the record a reviewer is meant to read.
  const walk = (node, path, inProperties = false) => {
    if (Array.isArray(node)) { node.forEach((item, i) => walk(item, `${path}.${i}`)); return; }
    if (!node || typeof node !== 'object') return;
    if (inProperties) {
      for (const [name, value] of Object.entries(node)) walk(value, `${path}.${name}`);
      return;
    }
    // The SHAPE, not only the assertions. Independent review added `properties.diagnostics = {}`
    // to CTR-API-001 and `properties.impersonated_actor = {}` to CTR-TEN-001 -- the contract
    // nine others compose -- and `npm run check` stayed green at 153/153 with no guard edit of
    // any kind. An unconstrained property defeats `additionalProperties: false` for that key,
    // so the envelope then accepts anything under it: the reviewer put a provider secret and a
    // stack trace through the one CTR-API-001's own `x-leakage-boundary` exists to stop.
    //
    // A property carrying no assertion contributes no keyword, so a surface built only from
    // keywords cannot see it. The declared property NAMES are part of the contract.
    if (node.properties && typeof node.properties === 'object' && !Array.isArray(node.properties)) {
      entries.push(`${path}.properties = [${Object.keys(node.properties).sort().join(', ')}]`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('x-')) continue;
      if (key === 'properties') { walk(value, `${path}.${key}`, true); continue; }
      if (ASSERTIONS.has(key) && !METADATA.has(key)) entries.push(`${path}.${key} = ${JSON.stringify(value)}`);
      // An EMPTY subschema under a structural keyword asserts something enormous and records
      // nothing. Independent review twelve added `"not": {}` to CTR-API-001's `causation_id` --
      // `not` is not in ASSERTIONS, and walking `{}` emits no entry, so the ~950-line record and
      // its digest were byte-identical while a legal envelope started failing:
      //
      //   valid-success.json + causation_id -> ["$.causation_id: matches a schema it must not match"]
      //
      // CTR-API-001 is the envelope every module composes, so the causation chain was outlawed
      // in silence. The injection also DE-KILLED three constraints that had been tested --
      // causation_id's type, minLength and maxLength -- because a location that rejects
      // everything can no longer show a mutation. An added rule can retroactively untest others.
      if (SUBSCHEMA_VALUED.has(key) && isEmptySubschema(value)) {
        entries.push(`${path}.${key} = <empty schema, rejects or vacuously accepts everything here>`);
      }
      // A BOOLEAN subschema. `isEmptySubschema` returns false for booleans -- deliberately, a
      // boolean is explicit rather than empty -- so review thirteen used `items: false`,
      // `allOf: [false]` and `not: true` to add real rules with a byte-identical record.
      // `not: true` and `not: {}` are the same rule; only one of them produced a line.
      // `additionalProperties` is excluded: it is an assertion keyword, already recorded above
      // with its value, so a boolean line here would duplicate every closure rule in the catalog.
      if (SUBSCHEMA_VALUED.has(key) && key !== 'additionalProperties' && typeof value === 'boolean') {
        entries.push(`${path}.${key} = ${value} (boolean schema: ${value ? 'accepts' : 'rejects'} everything here)`);
      }
      if (COMBINATOR_KEYWORDS.has(key) && Array.isArray(value)) {
        value.forEach((branch, index) => {
          if (typeof branch === 'boolean') {
            entries.push(`${path}.${key}[${index}] = ${branch} (boolean schema branch)`);
          }
        });
      }
      walk(value, `${path}.${key}`);
    }
  };
  walk(schema, '');
  return entries.sort();
}

test('no constraint value changes without the change being written down', async () => {
  const { createHash } = await import('node:crypto');
  const problems = [];
  const entries = await readdir(CATALOG, { withFileTypes: true });
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    let schema;
    try { schema = await readJson(join(CATALOG, entry.name, 'schema.json')); } catch { continue; }
    const surface = surfaceOf(schema);
    const digest = createHash('sha256').update(surface.join('\n')).digest('hex').slice(0, 16);
    const declared = CONSTRAINT_SURFACE[entry.name];
    if (declared === undefined) {
      problems.push(`${entry.name} — no entry in CONSTRAINT_SURFACE. A new contract must record its constraint surface, or its rules can be narrowed later with nothing failing.`);
      continue;
    }
    // The RECORD is asserted, not only its digest. Independent review pointed out that a
    // digest match short-circuited before `sites` was ever read, so the hex could be updated
    // and the ~950 readable lines left to rot -- it narrowed `currency` from ["THB","USD"] to
    // ["THB"], updated one hex string, and the record still said the old enum while the check
    // passed. It also replaced an entire contract's `sites` array with `[]` and nothing failed.
    //
    // The file's whole claim is that a change is WRITTEN DOWN. A digest cannot carry that; only
    // the list can, so the list is what is compared and the digest is a label on it.
    const before = new Set(declared.sites ?? []);
    const after = new Set(surface);
    const added = surface.filter((s) => !before.has(s));
    const removed = (declared.sites ?? []).filter((s) => !after.has(s));
    if (added.length === 0 && removed.length === 0 && declared.digest === digest) continue;
    if (added.length === 0 && removed.length === 0) {
      problems.push(`${entry.name} — the recorded surface matches but its digest does not (declared ${declared.digest}, measured ${digest}). Regenerate the record; a hand-edited digest is the one thing this guard cannot interpret.`);
      continue;
    }
    problems.push(`${entry.name} — constraint surface changed (declared ${declared.digest}, measured ${digest})`
      + added.map((s) => `\n      + ${s}`).join('')
      + removed.map((s) => `\n      - ${s}`).join(''));
  }
  assert.deepEqual(problems, [], `constraint value(s) changed without being recorded:\n  ${problems.join('\n  ')}`);
});

test('every keyword whose value is a subschema can be seen when it is empty', () => {
  // The set is asserted against the JSON Schema 2020-12 vocabulary rather than against what the
  // catalog happens to contain. Independent review twelve got `not: {}` past a 950-line record
  // because ONE keyword was missing from a set like this; a set that is complete only by
  // accident of today's contracts is not a set.
  const vocabulary = [
    'not', 'if', 'then', 'else', 'items', 'contains', 'propertyNames',
    'additionalProperties', 'unevaluatedProperties', 'unevaluatedItems',
    'additionalItems', 'contentSchema',
  ];
  const missing = vocabulary.filter((keyword) => !SUBSCHEMA_VALUED.has(keyword));
  assert.deepEqual(missing, [], `subschema-valued keyword(s) an empty value could hide behind:\n  ${missing.join('\n  ')}`);

  // And the walk must actually emit for each one, not merely list it.
  for (const keyword of vocabulary) {
    const surface = surfaceOf({ type: 'object', properties: { subject: { [keyword]: {} } } });
    assert.ok(surface.some((line) => line === `.properties.subject.${keyword} = <empty schema, rejects or vacuously accepts everything here>`),
      `an empty ${keyword} produced no line in the constraint record: ${JSON.stringify(surface)}`);
  }
});
