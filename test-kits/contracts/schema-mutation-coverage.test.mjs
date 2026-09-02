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
