import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import test from 'node:test';

import { validate } from './json-schema-subset.mjs';

// WP-0A-CON-007 / RFC-2026-009.
//
// CTR-EVT-001 shipped metadata.schema_ref as { type: string, minLength: 1 } -- no shape at
// all. Probed against the shipped schema BEFORE the fix, it ACCEPTED all sixteen hostile
// forms below, including file:///etc/passwd, javascript:, a data: URI, a protocol-relative
// //host, traversal, a cloud instance-metadata address and a 100000-character string, on the
// envelope that carries every event in the system.
//
// The fix is deliberately NOT the catalog's `scheme:path` reference pattern. schema_ref does
// not locate a resource; it NAMES the contract that defines the event body, so its form is a
// contract id and a semantic version. A reference pattern here would have admitted every URL
// form the probe demonstrated, which is why the earlier escalation said this field needed a
// DIFFERENT constraint rather than a tightened one.
//
// Written against behaviour, never against the pattern text: asserting the literal would only
// prove the schema still says what it says, and this repository has already had one test that
// pinned a vulnerable pattern as its expected value and made the correct fix unmergeable.
const BASE = 'contract-catalog/shared-kernel/ctr-evt-001';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const HOSTILE = [
  'file:///etc/passwd',
  'javascript:alert(1)',
  'data:text/html;base64,PHN2Zz4=',
  '//evil.example',
  'https://public.example.invalid/exfil',
  'HTTPS://public.example.invalid/exfil',
  '../../../../etc/shadow',
  'http://169.254.169.254/latest/meta-data/',
  'gopher://x',
  'CTR-EVT-001@1.0.0/../../secret',
  'ctr-evt-001@1.0.0',
  'CTR-EVT-001@1.0.0 .evil',
  'CTR-EVT-001@1.0.0\n<script>',
  'CTR-EVT-001@01.0.0',
  '{{leak}}',
  '${env.SECRET}',
];

// Added 2026-10-06, from the independent role verdicts on main 03c584b.
// Every form above is hostile INSTEAD of a well-formed name, or a well-formed name with hostile
// text APPENDED, so the `$` anchor was guarded and the `^` anchor was guarded by nothing: with `^`
// removed the schema accepted file:///CTR-EVT-001@1.0.0 and javascript:CTR-EVT-001@1.0.0 and this
// suite stayed green (C0 F1). And form 11 is lowercase THROUGHOUT, so the literal `CTR-` prefix
// rejects it before the letter class is ever consulted; widening that class to [A-Za-z] went
// unseen (C0 F3). Each form here is a well-formed name with one thing wrong, and each is shorter
// than the bound, so only the shape can reject it.
const HOSTILE_AROUND_A_GOOD_NAME = [
  'file:///CTR-EVT-001@1.0.0',
  'javascript:CTR-EVT-001@1.0.0',
  '../../CTR-EVT-001@1.0.0',
  'CTR-evt-001@1.0.0',
];

// Forms 05, 06 and 08 (the two public https URLs and the cloud metadata address) are 36, 36 and
// 40 characters, longer than the 32-character bound. Against the shipped schema they are rejected
// by the BOUND as well as the shape, so a pattern widened to admit an https URL left this suite
// green (A1 S-3). The first test below therefore also runs every hostile form against the schema
// with the bound set aside, so each one must be rejected by the shape alone.

async function loadContract() {
  const schema = await readJson(join(BASE, 'schema.json'));
  const resolved = new Map();
  const walk = async (node) => {
    if (Array.isArray(node)) { for (const item of node) await walk(item); return; }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string' && !value.startsWith('#')) {
        resolved.set(value, await readJson(normalize(join(BASE, value))));
      } else await walk(value);
    }
  };
  await walk(schema);
  const valid = await readJson(join(BASE, 'examples/valid.json'));
  return { schema, valid, resolve: (ref) => resolved.get(ref) ?? null };
}

const withRef = (valid, value) => ({ ...valid, metadata: { ...valid.metadata, schema_ref: value } });

// The same schema with schema_ref's maxLength removed, so a rejection can only come from the shape.
const withoutBound = (schema) => {
  const copy = structuredClone(schema);
  delete copy.properties.metadata.properties.schema_ref.maxLength;
  return copy;
};

// The accepted range, written out so that moving the bound is an edit a reviewer reads. The
// longest well-formed name the bound admits is 32 characters, and one more is rejected. Both
// values satisfy the shape, so only the bound decides them. Without these two the bound could be
// raised to 79 or lowered to 18 with every test green, because the only values that pinned it were
// the 80-character overlong probe and three accepted names of 17 and 18 characters (C0 F2, Q0 M04
// and M05).
const AT_THE_BOUND = 'CTR-EVT-001@111111.111111.111111';
const ONE_PAST_THE_BOUND = 'CTR-EVT-001@1111111.111111.111111';

test('CTR-EVT-001 rejects every demonstrated hostile schema_ref', async () => {
  const { schema, valid, resolve } = await loadContract();
  const shapeOnly = withoutBound(schema);
  const accepted = [];
  const acceptedByShape = [];
  for (const value of [...HOSTILE, ...HOSTILE_AROUND_A_GOOD_NAME]) {
    const errors = validate(schema, withRef(valid, value), { resolve });
    if (errors.length === 0) accepted.push(value);
    else assert.ok(errors.some((message) => message.includes('schema_ref')),
      `${value} was rejected, but not because of schema_ref: ${errors.join('; ')}`);
    const shapeErrors = validate(shapeOnly, withRef(valid, value), { resolve });
    if (!shapeErrors.some((message) => message.includes('schema_ref'))) acceptedByShape.push(value);
  }
  assert.deepEqual(accepted, [], `CTR-EVT-001 accepts hostile schema_ref(s): ${accepted.join(', ')}`);
  assert.deepEqual(acceptedByShape, [],
    `with the bound set aside, the schema_ref shape accepts: ${acceptedByShape.join(', ')} -- only the length rejects them`);
});

test('CTR-EVT-001 bounds schema_ref length, so a well-formed name cannot be unbounded', async () => {
  const { schema, valid, resolve } = await loadContract();
  // Satisfies the contract-id shape and exceeds the bound. A value that failed BOTH would
  // prove nothing about the bound: the shape alone would already have rejected it.
  const overlong = `CTR-EVT-001@${'1'.repeat(64)}.0.0`;
  const errors = validate(schema, withRef(valid, overlong), { resolve });
  assert.ok(errors.length > 0, 'a schema_ref of the right shape and unbounded length must be rejected');
  assert.ok(errors.some((message) => message.includes('schema_ref')),
    `rejected, but not because of schema_ref: ${errors.join('; ')}`);
  // One character past the bound is rejected, and the shape is not what rejects it.
  assert.equal(ONE_PAST_THE_BOUND.length, 33);
  assert.deepEqual(validate(withoutBound(schema), withRef(valid, ONE_PAST_THE_BOUND), { resolve }), [],
    `${ONE_PAST_THE_BOUND} must satisfy the shape, or it proves nothing about the bound`);
  const pastErrors = validate(schema, withRef(valid, ONE_PAST_THE_BOUND), { resolve });
  assert.ok(pastErrors.some((message) => message.includes('schema_ref')),
    `a 33-character well-formed schema_ref must be rejected; the bound has been raised past 32`);
});

// A guard that only ever rejects is indistinguishable from one that rejects everything.
test('CTR-EVT-001 still accepts a well-formed contract name', async () => {
  const { schema, valid, resolve } = await loadContract();
  for (const value of ['CTR-EVT-001@1.0.0', 'CTR-JOB-001@2.11.0', 'CTR-TEN-001@10.0.3']) {
    assert.deepEqual(validate(schema, withRef(valid, value), { resolve }), [], `${value} must be accepted`);
  }
  assert.equal(AT_THE_BOUND.length, 32);
  assert.deepEqual(validate(schema, withRef(valid, AT_THE_BOUND), { resolve }), [],
    `${AT_THE_BOUND} is 32 characters, at the declared bound, and must be accepted; the bound has been lowered`);
});

// Discovered, not enumerated. Independent security review pointed out that this test was
// titled "every reference field" while iterating a literal list of six: a reference added
// tomorrow would not be noticed, and the title would keep asserting otherwise.
// Independent testing walked through the first version of this predicate twice. It compared
// `type` to the string 'string' by strict equality, so `{"type": ["string", "null"]}` -- a
// nullable reference, which this repository's own validator fully supports -- was not
// discovered, and an unbounded `parent_event_id` accepting a 100000-character value,
// file:///etc/passwd and a cloud metadata address shipped with the whole check green. The
// second escape was `related_event_ids`: an array of references, whose own type is `array`
// and whose name is plural.
const REFERENCE_FIELD = /(^|_)(refs?|keys?|ids?)$/;

const isStringSchema = (node) => {
  const type = node?.type;
  return type === 'string' || (Array.isArray(type) && type.includes('string'));
};

// A field is reference-shaped by NAME. What it holds may be the string itself, or an array of
// them, or a nullable one -- and each still needs a bound, on the item where the string is.
function stringBearer(node) {
  if (isStringSchema(node)) return node;
  const type = node?.type;
  if (type === 'array' || (Array.isArray(type) && type.includes('array'))) {
    if (isStringSchema(node.items)) return node.items;
  }
  return null;
}

function referenceFields(node, path = []) {
  let found = [];
  if (Array.isArray(node)) {
    node.forEach((item) => { found = found.concat(referenceFields(item, path)); });
    return found;
  }
  if (!node || typeof node !== 'object') return found;
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('x-')) continue;
    if (key === 'properties' && value && typeof value === 'object') {
      for (const [name, sub] of Object.entries(value)) {
        const bearer = REFERENCE_FIELD.test(name) ? stringBearer(sub) : null;
        if (bearer) found.push([[...path, name], bearer, sub]);
        found = found.concat(referenceFields(sub, [...path, name]));
      }
      continue;
    }
    found = found.concat(referenceFields(value, path));
  }
  return found;
}

// Every reference-shaped field in the named contract that has no upper bound. An array of
// references bounded only per item is still unbounded in aggregate.
function boundGaps(dir, schema) {
  const gaps = [];
  for (const [path, field, declared] of referenceFields(schema)) {
    if (typeof field.maxLength !== 'number') gaps.push(`${dir}.${path.join('.')}`);
    if (field !== declared && typeof declared.maxItems !== 'number') {
      gaps.push(`${dir}.${path.join('.')} (array with no maxItems)`);
    }
  }
  return gaps;
}

const CATALOG = 'contract-catalog/shared-kernel';

// Every contract directory in the catalog that carries a schema, discovered rather than listed.
async function catalogSchemas() {
  const entries = await readdir(CATALOG, { withFileTypes: true });
  const found = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    let schema;
    try { schema = await readJson(join(CATALOG, entry.name, 'schema.json')); } catch { continue; }
    found.push([entry.name, schema]);
  }
  return found;
}

// The fourteen contract directories the catalog held, and the reference-shaped fields the discovery
// found in them, on main 03c584b and again on e1fa28e. A floor, so a test that walks nothing fails
// rather than passing over an empty set (Q0 M15 and M16).
const CATALOG_CONTRACT_FLOOR = 14;
const CATALOG_REFERENCE_FIELD_FLOOR = 76;

// The four contracts this package bounded. Every reference-shaped field in them carries a bound.
const BOUNDED_CONTRACTS = ['ctr-api-001', 'ctr-evt-001', 'ctr-idm-001', 'ctr-job-001'];

// The reference-shaped fields KNOWN to be unbounded, each in a contract this package does not own,
// named with the work package whose writable paths hold that contract. Bounding a field is a change
// to its owner's contract, so this package reports them and does not fix them.
//
// This list was an enumeration of four contracts until 2026-10-06, and that hid 49 unbounded fields
// from the guard and let a fifteenth contract, or a new field in any of the ten, arrive unbounded
// with every test green (C0 F4, Q0 M12). The default is now inverted: the whole catalog is walked,
// and a new unbounded reference fails unless it is written down here. An entry that its owner has
// since bounded also fails, so the list cannot go stale and later hide a field that loses its bound.
//
// The walk reads each contract's own schema, so CTR-TEN-001's seven fields are found in
// ctr-ten-001 itself. That is how the guard sees what rides inside CTR-EVT-001.tenant_context:
// referenceFields does not follow `$ref` (A1 S-4, Q0 §4), and it does not need to when every
// contract is walked.
const KNOWN_UNBOUNDED = new Map([
  ...['audit_id', 'actor.id', 'correlation_id', 'causation_id']
    .map((p) => [`ctr-aud-001.${p}`, 'WP-0A-CON-004']),
  ...['message_key', 'correlation_id']
    .map((p) => [`ctr-err-001.${p}`, 'WP-0A-CON-001']),
  ...['policy_key', 'reason_key', 'audit.actor.id', 'audit.reason_key']
    .map((p) => [`ctr-flg-001.${p}`, 'WP-0A-CON-003']),
  ...['module_key', 'module_id', 'capabilities.capability_key', 'dependencies.module_key']
    .map((p) => [`ctr-mod-001.${p}`, 'WP-0A-CON-003']),
  ...['correlation.correlation_id', 'correlation.request_id', 'correlation.causation_id',
    'correlation.trace_id', 'correlation.job_id', 'module.module_key',
    'readiness.capabilities.capability_key', 'dependencies.dependency_key', 'sli_tags.module_key',
    'sli_tags.capability_key']
    .map((p) => [`ctr-obs-001.${p}`, 'WP-0A-CON-004']),
  ...['scope.workspace_id', 'scope.business_profile_id', 'scope.page_context_profile_id',
    'scope.capability_key', 'rotation.owner.id', 'revocation.actor.id', 'revocation.reason_key',
    'correlation_id']
    .map((p) => [`ctr-sec-001.${p}`, 'WP-0A-CON-004']),
  ...['workspace_id', 'business_profile_id', 'page_context_profile_id', 'actor.id', 'request_id',
    'correlation_id', 'causation_id']
    .map((p) => [`ctr-ten-001.${p}`, 'WP-0A-CON-001']),
  // CTR-NTF-001's four and CTR-USG-001's six were bounded by WP-0A-CON-006 on 2026-10-07
  // (its open_blockers[13]) and removed from this list in the same change.
]);

test('every reference-shaped field in the contracts this package touches carries an upper bound', async () => {
  const contracts = await catalogSchemas();
  const unbounded = [];
  const unrecorded = [];
  const stale = new Set(KNOWN_UNBOUNDED.keys());
  let discovered = 0;
  for (const [dir, schema] of contracts) {
    discovered += referenceFields(schema).length;
    for (const gap of boundGaps(dir, schema)) {
      if (BOUNDED_CONTRACTS.includes(dir)) unbounded.push(gap);
      else if (KNOWN_UNBOUNDED.has(gap)) stale.delete(gap);
      else unrecorded.push(gap);
    }
  }
  for (const dir of BOUNDED_CONTRACTS) {
    assert.ok(contracts.some(([name]) => name === dir), `${dir} is not in the catalog; BOUNDED_CONTRACTS is stale`);
  }
  assert.ok(contracts.length >= CATALOG_CONTRACT_FLOOR,
    `walked ${contracts.length} contract(s), fewer than the ${CATALOG_CONTRACT_FLOOR} the catalog holds`);
  assert.ok(discovered >= CATALOG_REFERENCE_FIELD_FLOOR,
    `discovered ${discovered} reference-shaped field(s), fewer than the ${CATALOG_REFERENCE_FIELD_FLOOR} the catalog holds`);
  assert.deepEqual(unbounded, [], `reference-shaped field(s) with no upper bound: ${unbounded.join(', ')}`);
  assert.deepEqual(unrecorded, [],
    `reference-shaped field(s) with no upper bound, in a contract this package does not own and not recorded in KNOWN_UNBOUNDED: ${unrecorded.join(', ')}`);
  assert.deepEqual([...stale], [],
    `KNOWN_UNBOUNDED names field(s) that are now bounded or gone; remove them from the list: ${[...stale].join(', ')}`);
});

// A bound only means something if the shipped schema is the one being read, so this asserts
// the discovery actually found the fields rather than walking past them.
test('the discovery finds the reference fields it is meant to bound', async () => {
  const schema = await readJson(join('contract-catalog/shared-kernel', 'ctr-evt-001', 'schema.json'));
  const names = referenceFields(schema).map(([path]) => path.join('.')).sort();
  for (const expected of ['event_id', 'correlation_id', 'causation_id', 'idempotency_key',
    'metadata.schema_ref', 'producer.module_key', 'subject.id']) {
    assert.ok(names.includes(expected), `discovery missed ${expected}; it found ${names.join(', ')}`);
  }

  // The two escapes this repository records as hard-won -- a nullable reference and an array of
  // references -- exist in no shipped schema, so the branches of stringBearer that catch them were
  // exercised by nothing, and removing the array branch left every test green (C0 F9, Q0 M17).
  // A synthetic fragment exercises both, unbounded and then bounded.
  const fragment = {
    type: 'object',
    properties: {
      parent_event_id: { type: ['string', 'null'] },
      related_event_ids: { type: 'array', items: { type: 'string' } },
    },
  };
  const found = referenceFields(fragment).map(([path]) => path.join('.')).sort();
  assert.deepEqual(found, ['parent_event_id', 'related_event_ids'],
    'discovery must find a nullable reference and an array of references');
  assert.deepEqual(boundGaps('fragment', fragment).sort(), [
    'fragment.parent_event_id',
    'fragment.related_event_ids',
    'fragment.related_event_ids (array with no maxItems)',
  ], 'an unbounded nullable reference, an unbounded array item and an array with no maxItems must each be reported');
  const bounded = structuredClone(fragment);
  bounded.properties.parent_event_id.maxLength = 128;
  bounded.properties.related_event_ids.items.maxLength = 128;
  bounded.properties.related_event_ids.maxItems = 16;
  assert.deepEqual(boundGaps('fragment', bounded), [], 'a bounded nullable reference and a bounded array must not be reported');
});

// Independent security review found CTR-AUD-001 still carrying the two negative lookaheads
// that CTR-API-001, CTR-IDM-001 and CTR-JOB-001 had removed for RE2 portability. A lookahead
// makes an RE2-backed validator fail to COMPILE the schema rather than mis-evaluate it, so
// the schema does not merely behave differently there -- it does not load.
//
// The guard is catalog-wide and structural rather than a list, because the last three
// removals were done one contract at a time and the fourth was missed.
const RE2_UNSUPPORTED = /\(\?[=!<]/;

test('no pattern in the catalog uses a construct RE2 cannot compile', async () => {
  const offenders = [];
  let patterns = 0;
  const contracts = await catalogSchemas();
  // Without this the test passed over an empty directory in 0.47 ms (Q0 M16).
  assert.ok(contracts.length >= CATALOG_CONTRACT_FLOOR,
    `walked ${contracts.length} contract(s), fewer than the ${CATALOG_CONTRACT_FLOOR} the catalog holds`);
  for (const [name, schema] of contracts) {
    const entry = { name };
    const walk = (node, path) => {
      if (Array.isArray(node)) { node.forEach((item, i) => walk(item, `${path}.${i}`)); return; }
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (key.startsWith('x-')) continue;
        if (key === 'pattern' && typeof value === 'string') {
          patterns += 1;
          if (RE2_UNSUPPORTED.test(value)) offenders.push(`${entry.name}${path}.pattern`);
        }
        walk(value, `${path}.${key}`);
      }
    };
    walk(schema, '');
  }
  assert.ok(patterns > 0, 'the sweep examined no pattern at all');
  assert.deepEqual(offenders, [], `pattern(s) an RE2-backed validator cannot compile:\n  ${offenders.join('\n  ')}`);
});

// Every guard in this repository is computed by DELETING a keyword. Independent review pointed
// out what that leaves invisible: changing a keyword's VALUE. Narrowing `maxLength` from 128 to
// 24, or dropping four of six allow-listed schemes from a pattern, are real contract changes
// that reject values the shipped contract declares legal -- and every mutation guard is
// invariant under both, because they are computed from key presence.
//
// A negative-only test cannot see it either: the hostile-reference suites assert that bad
// schemes are REJECTED, and a narrowed pattern still rejects those. The missing direction is
// acceptance. CTR-JOB-001's suite already had it, with the right comment -- "a guard that only
// ever rejects is indistinguishable from one that rejects everything" -- and the other
// reference fields did not.
// Pinned, not derived. A first version read the scheme list and the bound out of the very
// field it was checking, so narrowing the field narrowed the test with it and nothing failed --
// a test that measures itself cannot fail. What each field ACCEPTS is declared here, so
// removing a scheme or lowering a bound has to be an edit a reviewer reads.
const REFERENCE_FIELDS = [
  ['ctr-api-001', ['accepted', 'status_ref'], ['job', 'status', 'result', 'app', 'asset', 'content'], 256],
  ['ctr-api-001', ['accepted', 'deep_link_ref'], ['job', 'status', 'result', 'app', 'asset', 'content'], 256],
  ['ctr-idm-001', ['result_ref'], ['job', 'status', 'result', 'app', 'asset', 'content'], 256],
  ['ctr-job-001', ['input_ref'], ['job', 'status', 'result', 'app', 'asset', 'content'], 256],
  ['ctr-job-001', ['result_ref'], ['job', 'status', 'result', 'app', 'asset', 'content'], 256],
  ['ctr-aud-001', ['change', 'before_ref'], ['snapshot', 'record'], 256],
  ['ctr-aud-001', ['change', 'after_ref'], ['snapshot', 'record'], 256],
];

const fieldAt = (schema, path) => path.reduce((node, key) => node?.properties?.[key], schema);

test('every allow-listed reference scheme is still accepted, not only the hostile ones rejected', async () => {
  const rejected = [];
  for (const [dir, path, schemes] of REFERENCE_FIELDS) {
    const schema = await readJson(join('contract-catalog/shared-kernel', dir, 'schema.json'));
    const field = fieldAt(schema, path);
    assert.ok(field?.pattern, `${dir}.${path.join('.')} does not exist or declares no pattern — this list is stale`);
    for (const scheme of schemes) {
      const value = `${scheme}:synthetic_0001/detail`;
      if (!new RegExp(field.pattern).test(value)) {
        rejected.push(`${dir}.${path.join('.')} — "${value}" is rejected, though ${scheme} is a scheme this field accepts`);
      }
    }
  }
  assert.deepEqual(rejected, [], `allow-listed scheme(s) the pattern no longer accepts:\n  ${rejected.join('\n  ')}`);
});

test('a value at exactly the declared bound is accepted, so the bound cannot be quietly tightened', async () => {
  const wrong = [];
  for (const [dir, path, schemes, bound] of REFERENCE_FIELDS) {
    const schema = await readJson(join('contract-catalog/shared-kernel', dir, 'schema.json'));
    const field = fieldAt(schema, path);
    if (field?.maxLength !== bound) {
      wrong.push(`${dir}.${path.join('.')} — declares maxLength ${field?.maxLength}, this suite expects ${bound}`);
      continue;
    }
    const value = `${schemes[0]}:${'a'.repeat(bound - schemes[0].length - 1)}`;
    if (value.length !== bound || !new RegExp(field.pattern).test(value)) {
      wrong.push(`${dir}.${path.join('.')} — a ${bound}-character value of its own shape is rejected at its own limit`);
    }
  }
  assert.deepEqual(wrong, [], `reference field(s) whose accepted range has moved:\n  ${wrong.join('\n  ')}`);
});
