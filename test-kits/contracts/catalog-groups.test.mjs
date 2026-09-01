import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

// Every ratchet in this repository points at `contract-catalog/shared-kernel` by name -- the
// mutation walk, the conformance suite, the reference-integrity check, the registry pin. That
// was fine while the catalog had one group, and independent review showed what it costs the
// moment it does not: a new `contract-catalog/billing/ctr-pay-001/` with `status: "Frozen"` --
// a level FREEZE_LEVELS explicitly rejects -- `owner: "nobody"`, zero fixtures, an unsupported
// schema keyword and a rule contradicting CONTRIBUTING_AGENTS.md passed at exit 0.
//
// The Decision Register declares 25 further contracts in other groups, so this is not
// hypothetical; it is the next package.
//
// A contract group that no suite governs must not be creatable by adding a directory. Adding
// one is now a deliberate act: declare the group here AND point the suites at it, or the check
// fails naming the directory nobody is checking.
const CATALOG = 'contract-catalog';

// Groups this repository's suites actually govern. Adding a name here is a promise that every
// ratchet has been pointed at it -- it is not a way to silence this test.
const GOVERNED_GROUPS = ['shared-kernel'];

const isDirectory = async (path) => (await stat(path)).isDirectory();

test('every contract directory lives in a group the suites govern', async () => {
  const ungoverned = [];
  for (const entry of await readdir(CATALOG, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (GOVERNED_GROUPS.includes(entry.name)) continue;
    const group = join(CATALOG, entry.name);
    const contracts = [];
    for (const child of await readdir(group, { withFileTypes: true })) {
      if (child.isDirectory() && await isDirectory(join(group, child.name))) contracts.push(child.name);
    }
    ungoverned.push(`${group} — ${contracts.length} contract directory(ies): ${contracts.join(', ') || 'none yet'}. `
      + 'No mutation walk, conformance suite, reference-integrity check or registry pin covers this group. '
      + 'Point them at it and add the group to GOVERNED_GROUPS in the same commit.');
  }
  assert.deepEqual(ungoverned, [], `contract group(s) no suite governs:\n  ${ungoverned.join('\n  ')}`);
});

test('a governed group is not silently emptied', async () => {
  // The reverse of the same hole: a group named here but absent, or present and empty, means
  // the suites are pointed at nothing and every count over it reads zero.
  const wrong = [];
  for (const group of GOVERNED_GROUPS) {
    const path = join(CATALOG, group);
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch { wrong.push(`${path} is declared governed but does not exist`); continue; }
    const contracts = entries.filter((e) => e.isDirectory());
    if (contracts.length === 0) wrong.push(`${path} is declared governed but holds no contract`);
  }
  assert.deepEqual(wrong, [], `governed group(s) that are not there:\n  ${wrong.join('\n  ')}`);
});

// Independent review eleven, finding eight: `anyOf: []` and `oneOf: []` reject every document,
// and `allOf: []` accepts every document -- vacuous truth. None of the three is visible to the
// mutation walk as a constraint, because there is nothing inside to delete.
//
// Probed against this catalog, all three are currently caught, but only by accident of coverage:
// the empty combinator happened to sit where a fixture reaches it, so a valid fixture stopped
// validating or a negative fixture stopped being rejected. Put one where no fixture reaches and
// the only thing that fires is the constraint-surface pin, and only if the KEYWORD is new. Empty
// an `allOf` that already exists, in a branch no fixture exercises, and nothing observes it.
//
// So it is made a shape the catalog cannot hold, rather than a hazard that depends on fixtures
// staying where they are. This costs nothing: an empty combinator has no legitimate use.
const COMBINATORS = ['anyOf', 'oneOf', 'allOf'];

// An object carrying nothing but `x-` annotations constrains as little as `{}` does; every other
// guard in this repository skips those keys deliberately.
const isEmptyObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).every((key) => key.startsWith('x-'));

function emptyCombinators(node, path = []) {
  if (Array.isArray(node)) return node.flatMap((item, index) => emptyCombinators(item, [...path, index]));
  if (node === null || typeof node !== 'object') return [];
  const found = [];
  for (const [key, value] of Object.entries(node)) {
    if (COMBINATORS.includes(key) && Array.isArray(value) && value.length === 0) {
      found.push({
        path: [...path, key].join('/'),
        effect: key === 'allOf' ? 'accepts every document (vacuous truth)' : 'rejects every document',
      });
    }
    // Independent review twelve: three more shapes with the same property -- an enormous
    // assertion made of no keywords, so nothing keyword-driven can see it.
    //
    //   not: {}    rejects every instance at that location. Added to CTR-API-001's causation_id
    //              it produced ZERO new lines in the ~950-line constraint record and left the
    //              digest byte-identical, while a legal envelope started failing.
    //   enum: []   permits no value at all.
    //   if: {}     matches everything, so `then` becomes unconditional and `else` unreachable.
    if (key === 'not' && isEmptyObject(value)) {
      found.push({ path: [...path, key].join('/'), effect: 'rejects every document at this location' });
    }
    if (key === 'if' && isEmptyObject(value)) {
      found.push({ path: [...path, key].join('/'), effect: 'always matches, so `then` is unconditional and `else` unreachable' });
    }
    if (key === 'enum' && Array.isArray(value) && value.length === 0) {
      found.push({ path: [...path, key].join('/'), effect: 'permits no value at all' });
    }
    found.push(...emptyCombinators(value, [...path, key]));
  }
  return found;
}

test('no catalog schema holds an empty combinator', async () => {
  const wrong = [];
  for (const group of GOVERNED_GROUPS) {
    for (const entry of await readdir(join(CATALOG, group), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = join(CATALOG, group, entry.name, 'schema.json');
      let schema;
      try { schema = JSON.parse(await readFile(path, 'utf8')); } catch { continue; }
      for (const site of emptyCombinators(schema)) {
        wrong.push(`${path} — ${site.path} is empty, which ${site.effect}`);
      }
    }
  }
  assert.deepEqual(wrong, [], `empty combinator(s), invisible to the mutation walk:\n  ${wrong.join('\n  ')}`);
});

test('the empty-combinator walk finds one wherever it is buried', () => {
  // The test above is only worth its line count if the walk reaches the positions that matter:
  // under a property, inside an array item, and beneath a `not` where polarity inverts.
  const buried = {
    properties: { a: { anyOf: [] } },
    items: { allOf: [] },
    not: { properties: { b: { oneOf: [] } } },
    definitions: { c: { properties: { d: { items: { anyOf: [] } } } } },
  };
  const found = emptyCombinators(buried).map((site) => site.path).sort();
  assert.deepEqual(found, [
    'definitions/c/properties/d/items/anyOf',
    'items/allOf',
    'not/properties/b/oneOf',
    'properties/a/anyOf',
  ]);
  assert.equal(emptyCombinators({ allOf: [{ type: 'object' }], anyOf: [{}] }).length, 0,
    'a populated combinator is not a finding, and `anyOf: [{}]` is populated');
});

test('the walk sees the three empty shapes that carry no keyword at all', () => {
  // `not: {}`, `if: {}` and `enum: []` are assertions made of nothing, which is exactly why a
  // keyword-driven record cannot represent them. Review twelve shipped `not: {}` past the
  // ~950-line constraint surface with a byte-identical digest.
  const found = emptyCombinators({
    properties: {
      causation_id: { not: {} },
      status: { enum: [] },
      annotated: { not: { 'x-source': 'a comment is not a constraint' } },
    },
    if: {},
    then: { required: ['a'] },
  }).map((site) => site.path).sort();
  assert.deepEqual(found, [
    'if',
    'properties/annotated/not',
    'properties/causation_id/not',
    'properties/status/enum',
  ]);
  // And the populated forms are not findings.
  assert.deepEqual(emptyCombinators({ not: { type: 'string' }, if: { required: ['a'] }, enum: ['x'] }), []);
});
