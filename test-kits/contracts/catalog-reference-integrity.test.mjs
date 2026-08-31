import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import test from 'node:test';

// WP-0A-CON-001 shipped two $refs pointing at a path that does not exist. Nothing caught
// it: the catalog tests validate fixtures with hand-written predicates and never resolve a
// $ref, and until WP-0A-A0-002 those tests were not executed by CI at all. This suite is
// the standing guard -- it resolves every reference the catalog declares, against disk.
const CATALOG = 'contract-catalog/shared-kernel';

async function contractDirectories() {
  const entries = await readdir(CATALOG, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export function collectRefs(node, path = '$') {
  if (Array.isArray(node)) return node.flatMap((item, index) => collectRefs(item, `${path}[${index}]`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) => (
      key === '$ref' && typeof value === 'string' && !value.startsWith('#')
        ? [{ path, ref: value }]
        : collectRefs(value, `${path}.${key}`)
    ));
  }
  return [];
}

const exists = async (path) => access(path).then(() => true, () => false);

test('every external $ref in the catalog resolves to a file that exists', async () => {
  const unresolved = [];
  for (const directory of await contractDirectories()) {
    const schemaPath = join(CATALOG, directory, 'schema.json');
    if (!(await exists(schemaPath))) continue;
    for (const { path, ref } of collectRefs(JSON.parse(await readFile(schemaPath, 'utf8')))) {
      const target = normalize(join(dirname(schemaPath), ref));
      if (!(await exists(target))) unresolved.push(`${schemaPath} ${path}.$ref -> ${ref} -> ${target}`);
    }
  }
  assert.deepEqual(unresolved, [], `unresolved catalog $ref(s):\n  ${unresolved.join('\n  ')}`);
});

test('a $ref never escapes the contract catalog', async () => {
  const escaping = [];
  for (const directory of await contractDirectories()) {
    const schemaPath = join(CATALOG, directory, 'schema.json');
    if (!(await exists(schemaPath))) continue;
    for (const { ref } of collectRefs(JSON.parse(await readFile(schemaPath, 'utf8')))) {
      const target = normalize(join(dirname(schemaPath), ref));
      if (!target.startsWith('contract-catalog/')) escaping.push(`${schemaPath} -> ${ref} -> ${target}`);
    }
  }
  assert.deepEqual(escaping, [], `catalog $ref(s) escaping the catalog:\n  ${escaping.join('\n  ')}`);
});

test('every manifest fixture and schema it declares exists on disk', async () => {
  const missing = [];
  for (const directory of await contractDirectories()) {
    const manifestPath = join(CATALOG, directory, 'manifest.json');
    if (!(await exists(manifestPath))) continue;
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    for (const declared of [manifest.schema, ...(manifest.fixtures ?? [])]) {
      const target = join(CATALOG, directory, declared);
      if (!(await exists(target))) missing.push(`${manifestPath} declares ${declared} -> ${target}`);
    }
  }
  assert.deepEqual(missing, [], `manifest(s) declaring files that do not exist:\n  ${missing.join('\n  ')}`);
});

test('every fixture on disk is declared by its manifest', async () => {
  const undeclared = [];
  for (const directory of await contractDirectories()) {
    const manifestPath = join(CATALOG, directory, 'manifest.json');
    if (!(await exists(manifestPath))) continue;
    const declared = new Set((JSON.parse(await readFile(manifestPath, 'utf8')).fixtures ?? []));
    const examplesDir = join(CATALOG, directory, 'examples');
    if (!(await exists(examplesDir))) continue;
    for (const file of await readdir(examplesDir)) {
      if (!declared.has(`examples/${file}`)) undeclared.push(`${directory}/examples/${file}`);
    }
  }
  assert.deepEqual(undeclared, [], `fixture(s) on disk not declared by a manifest:\n  ${undeclared.join('\n  ')}`);
});
