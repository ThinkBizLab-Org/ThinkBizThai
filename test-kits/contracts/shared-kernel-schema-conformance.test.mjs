import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import test from 'node:test';

import { assertSchemaSupported, validate } from './json-schema-subset.mjs';

// Until this suite existed, NOTHING in the repository executed a schema.json. Independent
// review found ctr-pag-001 declaring `sort.minItems: 1` while every test and the manifest
// claimed a mandatory tiebreaker, so the fixture named `invalid-unstable-sort-without-
// tiebreaker` was VALID against the shipped contract. Independent testing generalised it:
// every additionalProperties, pattern and type in every schema was decorative, and extra
// keys carrying secrets passed at envelope, tenant_context, accepted, error and scope level.
// These tests run the contracts instead of describing them.
const CATALOG = 'contract-catalog/shared-kernel';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

async function contracts() {
  const entries = await readdir(CATALOG, { withFileTypes: true });
  const found = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const base = join(CATALOG, entry.name);
    try {
      const manifest = await readJson(join(base, 'manifest.json'));
      // Independent review shipped a manifest naming a schema other than schema.json: this
      // loop skipped the directory, and an `invalid-` fixture its schema accepted went green.
      if (manifest.schema !== 'schema.json') {
        throw new Error(`${entry.name}: manifest.schema must be exactly "schema.json"; a differently named schema escapes conformance entirely. Found: ${manifest.schema}`);
      }
      found.push({ dir: entry.name, base, schema: await readJson(join(base, 'schema.json')), manifest });
    } catch (error) {
      if (error instanceof SyntaxError || /must be exactly/.test(error.message)) throw error;
      /* a directory with neither file is covered by the reference-integrity suite */
    }
  }
  return found;
}

async function refResolver(base, schema) {
  const resolved = new Map();
  const walk = async (node) => {
    if (Array.isArray(node)) { for (const item of node) await walk(item); return; }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string' && !value.startsWith('#')) {
        resolved.set(value, await readJson(normalize(join(base, value))));
      } else await walk(value);
    }
  };
  await walk(schema);
  return (ref) => resolved.get(ref) ?? null;
}

test('every catalog schema uses only keywords this validator actually enforces', async () => {
  for (const { dir, schema } of await contracts()) {
    assert.doesNotThrow(() => assertSchemaSupported(schema), `${dir} declares a keyword nothing enforces`);
  }
});

test('every fixture agrees with its own shipped schema, not with a hand-written predicate', async () => {
  for (const { dir, base, schema, manifest } of await contracts()) {
    const resolve = await refResolver(base, schema);
    for (const fixture of manifest.fixtures ?? []) {
      const body = await readJson(join(base, fixture));
      const errors = validate(schema, body, { resolve });
      const mustPass = /(^|\/)(valid[-.]|accepted-gap-)/.test(fixture);
      if (mustPass) assert.deepEqual(errors, [], `${dir}/${fixture} must satisfy its schema`);
      else assert.ok(errors.length > 0, `${dir}/${fixture} is named invalid but its schema accepts it`);
    }
  }
});

test('a fixture the contract knowingly accepts is declared as a gap, with a reason', async () => {
  for (const { dir, manifest } of await contracts()) {
    const gaps = (manifest.fixtures ?? []).filter((f) => f.includes('accepted-gap-'));
    for (const gap of gaps) {
      const reason = manifest.accepted_gaps?.[gap];
      assert.ok(typeof reason === 'string' && reason.length > 80, `${dir}/${gap} must state in accepted_gaps why the contract accepts it`);
      // A length check alone passed 81 literal 'x' characters. The reason must name what is
      // unspecified and who must decide, which is the whole point of recording a gap.
      assert.match(reason, /baseline|owner|specified|contract owner|before freeze/i, `${dir}/${gap} reason must say what is unresolved and who resolves it`);
      assert.ok(new Set(reason.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/)).size >= 20, `${dir}/${gap} reason must be a real explanation, not padding`);
    }
    for (const declared of Object.keys(manifest.accepted_gaps ?? {})) {
      assert.ok((manifest.fixtures ?? []).includes(declared), `${dir} declares a gap for a fixture it does not list: ${declared}`);
    }
  }
});

// The previous version skipped any contract that did not declare additionalProperties: false,
// so DELETING that line from ctr-ten-001 made the guard skip it and re-opened the leak at
// exit 0. A contract must declare it, and the guard must not be opt-out.
test('every catalog schema closes its root against undeclared properties', async () => {
  for (const { dir, schema } of await contracts()) {
    assert.equal(schema.additionalProperties, false,
      `${dir} must declare additionalProperties: false at its root; without it an extra key carrying a secret is accepted and the leak guard silently skips this contract`);
  }
});

test('an extra property carrying a secret is rejected at every declared object level', async () => {
  for (const { dir, base, schema, manifest } of await contracts()) {
    const resolve = await refResolver(base, schema);
    const clean = (manifest.fixtures ?? []).find((f) => /(^|\/)valid[-.]/.test(f));
    if (!clean) continue;
    const original = await readJson(join(base, clean));
    assert.ok(validate(schema, { ...original, leaked_api_key: 'synthetic' }, { resolve }).length > 0, `${dir} accepts an undeclared extra property at the root`);
    // The earlier version mutated only the root, so a nested container stayed unprobed.
    for (const [name, sub] of Object.entries(schema.properties ?? {})) {
      if (sub.additionalProperties !== false || typeof original[name] !== 'object' || original[name] === null || Array.isArray(original[name])) continue;
      const nested = { ...original, [name]: { ...original[name], leaked_api_key: 'synthetic' } };
      assert.ok(validate(schema, nested, { resolve }).length > 0, `${dir} accepts an undeclared extra property inside ${name}`);
    }
  }
});

test('a reference field rejects every scheme outside its allow-list', async () => {
  const hostile = ['https://public.example.invalid/x', 'HTTPS://public.example.invalid/x', '//public.example.invalid/x',
    'file:///etc/passwd', 'data:text/plain;base64,AA==', 'javascript:alert(1)', '../../../etc/passwd', 'ftp://h/x'];
  const targets = [
    { dir: 'ctr-api-001', fixture: 'examples/valid-accepted.json', set: (b, v) => { b.accepted.status_ref = v; } },
    { dir: 'ctr-idm-001', fixture: 'examples/valid-completed-replay.json', set: (b, v) => { b.result_ref = v; } },
  ];
  for (const { dir, fixture, set } of targets) {
    const base = join(CATALOG, dir);
    const schema = await readJson(join(base, 'schema.json'));
    const resolve = await refResolver(base, schema);
    for (const value of hostile) {
      const body = await readJson(join(base, fixture));
      set(body, value);
      assert.ok(validate(schema, body, { resolve }).length > 0, `${dir} accepts a hostile reference: ${value}`);
    }
  }
});
