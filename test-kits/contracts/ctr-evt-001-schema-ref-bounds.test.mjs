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

test('CTR-EVT-001 rejects every demonstrated hostile schema_ref', async () => {
  const { schema, valid, resolve } = await loadContract();
  const accepted = [];
  for (const value of HOSTILE) {
    const errors = validate(schema, withRef(valid, value), { resolve });
    if (errors.length === 0) accepted.push(value);
    else assert.ok(errors.some((message) => message.includes('schema_ref')),
      `${value} was rejected, but not because of schema_ref: ${errors.join('; ')}`);
  }
  assert.deepEqual(accepted, [], `CTR-EVT-001 accepts hostile schema_ref(s): ${accepted.join(', ')}`);
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
});

// A guard that only ever rejects is indistinguishable from one that rejects everything.
test('CTR-EVT-001 still accepts a well-formed contract name', async () => {
  const { schema, valid, resolve } = await loadContract();
  for (const value of ['CTR-EVT-001@1.0.0', 'CTR-JOB-001@2.11.0', 'CTR-TEN-001@10.0.3']) {
    assert.deepEqual(validate(schema, withRef(valid, value), { resolve }), [], `${value} must be accepted`);
  }
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

// The contracts this package touches. Every other contract is listed in RFC-2026-009 as
// reported and not fixed, because bounding a field is a change to its owner's contract.
const BOUNDED_CONTRACTS = ['ctr-api-001', 'ctr-evt-001', 'ctr-idm-001', 'ctr-job-001'];

test('every reference-shaped field in the contracts this package touches carries an upper bound', async () => {
  const unbounded = [];
  for (const dir of BOUNDED_CONTRACTS) {
    const schema = await readJson(join('contract-catalog/shared-kernel', dir, 'schema.json'));
    for (const [path, field, declared] of referenceFields(schema)) {
      if (typeof field.maxLength !== 'number') unbounded.push(`${dir}.${path.join('.')}`);
      // An array of references bounded only per item is still unbounded in aggregate.
      if (field !== declared && typeof declared.maxItems !== 'number') {
        unbounded.push(`${dir}.${path.join('.')} (array with no maxItems)`);
      }
    }
  }
  assert.deepEqual(unbounded, [], `reference-shaped field(s) with no upper bound: ${unbounded.join(', ')}`);
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
  const entries = await readdir('contract-catalog/shared-kernel', { withFileTypes: true });
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    let schema;
    try { schema = await readJson(join('contract-catalog/shared-kernel', entry.name, 'schema.json')); } catch { continue; }
    const walk = (node, path) => {
      if (Array.isArray(node)) { node.forEach((item, i) => walk(item, `${path}.${i}`)); return; }
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (key.startsWith('x-')) continue;
        if (key === 'pattern' && typeof value === 'string' && RE2_UNSUPPORTED.test(value)) {
          offenders.push(`${entry.name}${path}.pattern`);
        }
        walk(value, `${path}.${key}`);
      }
    };
    walk(schema, '');
  }
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
