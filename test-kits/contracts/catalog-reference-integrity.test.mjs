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

// Keying this on the PROPERTY NAME let review defeat it three ways: nest the $ref one level
// deeper (allOf[0]), rename the property, or drop a decoy schema.v2.json carrying a forged
// $id. Identity is bound to LOCATION instead. Every external $ref anywhere must point at the
// canonical schema.json of a catalog contract directory, and that file's $id must match the
// directory it lives in — so a decoy is unreachable and a forged $id contradicts its path.
// A contract directory the ratchets actually iterate: a direct child of a governed group.
const GOVERNED_GROUP_ROOTS = ['contract-catalog/shared-kernel'];
async function isGovernedContractDirectory(directory) {
  const normalized = normalize(directory);
  return GOVERNED_GROUP_ROOTS.some((root) => normalize(join(root, basename(normalized))) === normalized);
}

test('every $ref points at a canonical contract schema whose $id matches its directory', async () => {
  const wrong = [];
  for (const file of await catalogJsonFiles()) {
    for (const { path, ref } of collectRefs(JSON.parse(await readFile(file, 'utf8')))) {
      const target = normalize(join(dirname(file), ref));
      if (basename(target) !== 'schema.json') {
        wrong.push(`${file} ${path}.$ref -> ${ref} — a $ref may only target a contract's canonical schema.json, never another file`);
        continue;
      }
      const owningDirectory = basename(dirname(target));
      // The target must be a TOP-LEVEL contract directory of a governed group, not merely some
      // directory holding a file named schema.json. Independent review twelve created
      // `ctr-api-001/vocab/schema.json` with `$id: "vocab"`, referenced it from the contract,
      // declared it in `manifest.fixtures` to satisfy the undeclared-file check, and paid three
      // one-time declaration edits. After that, EVERY later edit to that file was free: it
      // added `maxProperties: 1` to every success payload, `allOf: []` -- the exact vacuous
      // primitive this repository had just made impossible -- and `dependentRequired`, a keyword
      // the validator does not implement, at exit 0 with no further edit anywhere.
      //
      // Nothing followed the $ref: contracts(), constraintSites, surfaceOf and
      // assertSchemaSupported all iterate top-level directories only. A rule channel outside
      // every ratchet is worse than an unmeasured rule, because it stays outside them forever.
      if (!(await isGovernedContractDirectory(dirname(target)))) {
        wrong.push(`${file} ${path}.$ref -> ${ref} — target is not a top-level contract directory of a governed group. `
          + 'A $ref may only reach a contract the ratchets iterate; anything else is a rule channel no suite measures.');
        continue;
      }
      const targetSchema = await readFile(target, 'utf8').then(JSON.parse).catch(() => null);
      if (typeof targetSchema?.$id !== 'string') { wrong.push(`${file} ${path}.$ref -> ${ref} — target declares no $id`); continue; }
      if (targetSchema.$id.toLowerCase() !== owningDirectory) {
        wrong.push(`${file} ${path}.$ref -> ${ref} — target declares $id ${targetSchema.$id} but lives in ${owningDirectory}; an $id must match its directory or it can be forged`);
      }
      const expected = EXPECTED_REF_TARGET[path.split('.').at(-1)];
      if (expected && targetSchema.$id !== expected) {
        wrong.push(`${file} ${path}.$ref -> ${ref} resolves to ${targetSchema.$id}, expected ${expected}`);
      }
    }
  }
  assert.deepEqual(wrong, [], `$ref identity problems:\n  ${wrong.join('\n  ')}`);
});

// A decoy schema is only unreachable if nothing else can be a schema. Every JSON file in a
// contract directory must be a declared fixture, the manifest, or the canonical schema.
test('a contract directory contains no undeclared schema-like file', async () => {
  const stray = [];
  for (const directory of await contractDirectories()) {
    const manifest = await readFile(join(CATALOG, directory, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (!manifest) continue;
    const declared = new Set(['manifest.json', 'schema.json', ...(manifest.fixtures ?? [])]);
    for (const file of await catalogJsonFiles(join(CATALOG, directory))) {
      const relative = file.slice(join(CATALOG, directory).length + 1);
      if (!declared.has(relative)) stray.push(`${file} — not declared by its manifest; an undeclared schema-like file can be used as a permissive decoy $ref target`);
    }
  }
  assert.deepEqual(stray, [], `undeclared file(s) in a contract directory:\n  ${stray.join('\n  ')}`);
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
