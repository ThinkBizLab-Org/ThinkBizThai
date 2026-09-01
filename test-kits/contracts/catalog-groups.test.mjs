import assert from 'node:assert/strict';
import { lstat, readFile, readdir, stat } from 'node:fs/promises';
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

// Every position whose value may be a subschema, and therefore may be a BOOLEAN schema.
//
// `additionalProperties` is deliberately NOT here. `additionalProperties: false` is the closure
// rule every contract in this catalog uses, it is an assertion keyword, and `surfaceOf` records
// it with its value -- so it is already visible in the constraint record and changing it already
// fails. The rest have no such record, which is the whole finding.
const SUBSCHEMA_POSITIONS = [
  'not', 'if', 'then', 'else', 'items', 'contains', 'propertyNames',
  'unevaluatedProperties', 'unevaluatedItems', 'additionalItems', 'contentSchema',
];

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
    // Independent review THIRTEEN: a BOOLEAN subschema. `false` rejects every instance at that
    // location and `true` accepts every instance -- both are real rules, and this repository's
    // validator read them as "no schema here" while every real validator enforces them. It
    // planted three, all at exit 0, 198/198, with byte-identical constraint records and no
    // declaration edit anywhere:
    //
    //   ctr-pag-001  properties.items.items = false  every paginated page must carry zero rows
    //   ctr-api-001  allOf[2].then.allOf = [false]   an `accepted` envelope is always rejected
    //   ctr-ten-001  allOf = [false]                 every tenant context rejected, on the
    //                                                contract nine others $ref
    //
    // The one-token edit `"items": false` put a rule into an envelope contract that a reviewer
    // reading the diff of the record would never see. Forbidden outright: a boolean subschema has
    // no legitimate use in this catalog, and this is the version that cannot be reasoned around.
    if (SUBSCHEMA_POSITIONS.includes(key) && typeof value === 'boolean') {
      found.push({
        path: [...path, key].join('/'),
        effect: value === false ? 'is `false`, which rejects every document at this location'
          : 'is `true`, which accepts every document at this location',
      });
    }
    if (['allOf', 'anyOf', 'oneOf'].includes(key) && Array.isArray(value)) {
      value.forEach((branch, index) => {
        if (typeof branch === 'boolean') {
          found.push({
            path: [...path, key, index].join('/'),
            effect: branch === false ? 'is `false`, so this branch rejects every document'
              : 'is `true`, so this branch asserts nothing',
          });
        }
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

test('no path under the catalog is a symbolic link', async () => {
  // Independent review thirteen: `isGovernedContractDirectory` compares strings, and
  // `readdir(..., {withFileTypes:true})` reports a symlink-to-directory as neither isDirectory()
  // nor isFile(). So `contract-catalog/shared-kernel/vocab -> ../../docs/shared-kernel-vocabulary`
  // was invisible to catalogJsonFiles, contractDirectories, contracts(), the mutation walk and
  // CATALOG_REGISTRY, while satisfying the $ref restriction added for review twelve.
  //
  // It was contained — but only by `scripts/scan-repository-secrets.mjs`, which fails closed on
  // any symlink (exit 71), for an unrelated reason, in a package this one does not own. **Not one
  // contract test failed.** A containment that lives somewhere else by accident is one allow-list
  // entry away from being no containment at all.
  const found = [];
  // The ROOT itself, first. Independent review fourteen: the walk `readdir`s CATALOG and `lstat`s
  // its children, so `mv contract-catalog catalog-real && ln -s catalog-real contract-catalog`
  // left every contract suite at 71/71 passing. Contained again only by the secret scanner, in
  // another package, for an unrelated reason -- the exact thing this test's own comment says it
  // exists to stop, one level up.
  const root = await lstat(CATALOG);
  if (root.isSymbolicLink()) found.push(`${CATALOG} — the catalog root is a symbolic link`);
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) { found.push(`${path} — a symbolic link`); continue; }
      if (stats.isDirectory()) await walk(path);
    }
  };
  await walk(CATALOG);
  assert.deepEqual(found, [], `symbolic link(s) under the catalog, invisible to every contract suite:\n  ${found.join('\n  ')}`);
});

test('no file under the catalog is undeclared, whatever its extension', async () => {
  // Two guards each assuming the other covered this. `catalog-reference-integrity.test.mjs`
  // iterates contract DIRECTORIES and only `.json`; this file iterated directories only. A file
  // sitting at the group root was in neither's domain, and `.md` was in nobody's.
  //
  // Independent review fifteen placed four, all at exit 0, 214/214:
  //   contract-catalog/shared-kernel/catalog-policy.json   "normative_rules" applying to every contract
  //   contract-catalog/shared-kernel/CATALOG-RULES.md      group rules "taking precedence over a contract's schema"
  //   contract-catalog/shared-kernel/ctr-sec-001/RULES.md  a rules file inside a contract directory
  //
  // A rule does not become harmless by being written in a file no parser reads; a human reads it,
  // and a human is who a contract catalog is for.
  const allowedAtRoot = ['README.md'];
  const allowedInGroup = ['index.json', 'README.md'];
  const allowedInContract = ['manifest.json', 'schema.json'];
  const undeclared = [];

  for (const entry of await readdir(CATALOG, { withFileTypes: true })) {
    if (entry.isFile() && !allowedAtRoot.includes(entry.name)) {
      undeclared.push(`${join(CATALOG, entry.name)} — a file at the catalog root`);
    }
    if (!entry.isDirectory()) continue;
    const group = join(CATALOG, entry.name);
    for (const child of await readdir(group, { withFileTypes: true })) {
      if (child.isFile() && !allowedInGroup.includes(child.name)) {
        undeclared.push(`${join(group, child.name)} — a file at a group root`);
      }
      if (!child.isDirectory()) continue;
      const contract = join(group, child.name);
      const manifest = await readFile(join(contract, 'manifest.json'), 'utf8')
        .then(JSON.parse).catch(() => ({}));
      const declaredFixtures = new Set((manifest.fixtures ?? []).map((f) => f.replace(/^\.\//, '')));
      for (const file of await readdir(contract, { withFileTypes: true })) {
        if (file.isDirectory()) {
          if (file.name !== 'examples') undeclared.push(`${join(contract, file.name)} — a directory no suite reads`);
          continue;
        }
        if (!allowedInContract.includes(file.name)) {
          undeclared.push(`${join(contract, file.name)} — not a manifest, a schema, or a declared fixture`);
        }
      }
      for (const fixture of await readdir(join(contract, 'examples')).catch(() => [])) {
        if (!declaredFixtures.has(`examples/${fixture}`) && !declaredFixtures.has(fixture)) {
          undeclared.push(`${join(contract, 'examples', fixture)} — a fixture the manifest does not declare`);
        }
      }
    }
  }
  assert.deepEqual(undeclared, [], `undeclared file(s) under the catalog:\n  ${undeclared.join('\n  ')}`);
});
