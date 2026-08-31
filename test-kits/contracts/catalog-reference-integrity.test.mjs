import assert from 'node:assert/strict';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, join, normalize } from 'node:path';
import test from 'node:test';

// WP-0A-CON-001 shipped two $refs pointing at a path that does not exist. Nothing caught
// it: the catalog tests validate fixtures with hand-written predicates and never resolve a
// $ref, and until WP-0A-A0-002 those tests were not executed by CI at all. This suite is
// the standing guard -- it resolves every reference the catalog declares, against disk.
// D4: the root was hardcoded to shared-kernel while the baseline declares 25 more contracts
// in other groups. Walk every catalog root. D2: only <dir>/schema.json was read, so a $ref in
// a manifest, a nested directory, or a differently-named file was invisible. Walk every JSON.
const CATALOG_ROOT = 'contract-catalog';
const CATALOG = 'contract-catalog/shared-kernel';

async function catalogJsonFiles(directory = CATALOG_ROOT) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return catalogJsonFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  }));
  return nested.flat().sort();
}

// D1 is the one that matters most. The guard checked only that a target EXISTS. Independent
// security review repointed CTR-EVT-001's tenant_context at ctr-err-001/schema.json and CI
// STAYED GREEN -- the envelope carrying every domain event could declare its tenant context
// to be the error schema. A reference must resolve to the contract it claims.
const EXPECTED_REF_TARGET = { tenant_context: 'CTR-TEN-001', error: 'CTR-ERR-001' };

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

test('every external $ref in the catalog resolves to a FILE that exists', async () => {
  const bad = [];
  for (const file of await catalogJsonFiles()) {
    for (const { path, ref } of collectRefs(JSON.parse(await readFile(file, 'utf8')))) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) { bad.push(`${file} ${path}.$ref -> ${ref} — a remote or scheme-qualified reference is a network dependency and must be named as one`); continue; }
      const target = normalize(join(dirname(file), ref));
      // D3: access(F_OK) succeeds on a DIRECTORY, so a $ref to one counted as resolvable
      // while being unusable to any real resolver.
      const info = await stat(target).catch(() => null);
      if (!info) bad.push(`${file} ${path}.$ref -> ${ref} -> ${target} — does not exist`);
      else if (!info.isFile()) bad.push(`${file} ${path}.$ref -> ${ref} -> ${target} — is not a file`);
      // D7: this filesystem is case-insensitive and CI is case-sensitive, so an existence
      // check alone gives different verdicts per platform. Compare the real name.
      else {
        const listed = await readdir(dirname(target));
        if (!listed.includes(basename(target))) bad.push(`${file} ${path}.$ref -> ${ref} — case does not match the file on disk; this passes here and fails on a case-sensitive CI runner`);
      }
    }
  }
  assert.deepEqual(bad, [], `catalog $ref problems:\n  ${bad.join('\n  ')}`);
});

test('a $ref resolves to the contract it claims, not merely to some file that exists', async () => {
  const wrong = [];
  for (const file of await catalogJsonFiles()) {
    for (const { path, ref } of collectRefs(JSON.parse(await readFile(file, 'utf8')))) {
      const property = path.split('.').at(-1);
      const expected = EXPECTED_REF_TARGET[property];
      if (!expected) continue;
      const target = normalize(join(dirname(file), ref));
      const targetSchema = await readFile(target, 'utf8').then(JSON.parse).catch(() => null);
      if (targetSchema?.$id !== expected) {
        wrong.push(`${file} ${path}.$ref -> ${ref} resolves to $id ${JSON.stringify(targetSchema?.$id)}, expected ${expected}`);
      }
    }
  }
  assert.deepEqual(wrong, [], `$ref(s) pointing at the wrong contract:\n  ${wrong.join('\n  ')}`);
});

test('a $ref never escapes the contract catalog', async () => {
  const escaping = [];
  for (const file of await catalogJsonFiles()) {
    for (const { ref } of collectRefs(JSON.parse(await readFile(file, 'utf8')))) {
      const target = normalize(join(dirname(file), ref));
      // The earlier version of this test PASSED on https://evil.example/tenant.json, because
      // a URL does not start with '../'. A scheme-qualified reference escapes by definition.
      if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || !target.startsWith(`${CATALOG_ROOT}/`)) {
        escaping.push(`${file} -> ${ref} -> ${target}`);
      }
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
      const target = normalize(join(CATALOG, directory, declared));
      if (!target.startsWith(`${CATALOG}/${directory}/`)) { missing.push(`${manifestPath} declares ${declared}, which escapes its own contract directory`); continue; }
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
