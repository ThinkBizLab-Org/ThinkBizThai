import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  checkLicences,
  checkLockfile,
  checkPackageManifests,
  compareAllowlistWithRfc,
  licenceAlternatives,
  loadAllowlist,
  parseRfcAllowlist,
  readRepository,
  verifyAll,
} from '../scripts/verify-app-dependencies.mjs';

// RFC-2026-029 §8/1, §8/2 and §3.4/2 with its Amendment 2026-10-12 (WP-1A-A0-002). Each rule is
// shown to hold on the repository as it stands AND to fail on a synthetic case built to break it:
// a guard that has only ever been seen green is not yet known to be a guard. Nothing here reads
// node_modules, so these run inside `npm run check` with or without an install (§8/6).

const SHA = `sha512-${'A'.repeat(86)}==`;
const REG = (name, version) => `https://registry.npmjs.org/${name}/-/${name.split('/').pop()}-${version}.tgz`;
const entry = (name, version, extra = {}) => ({ version, resolved: REG(name, version), integrity: SHA, license: 'MIT', ...extra });

async function repository() {
  return readRepository('.');
}

function rootManifests(extra = {}) {
  return {
    'package.json': { name: 'r', private: true, workspaces: ['apps/web'], devDependencies: { typescript: '7.0.2' }, ...extra.root },
    'apps/web/package.json': { name: '@r/web', private: true, dependencies: { next: '16.3.8' }, ...extra.web },
  };
}

function lockFor(manifests, packages = {}) {
  return {
    lockfileVersion: 3,
    packages: {
      '': { name: 'r', workspaces: ['apps/web'], devDependencies: manifests['package.json'].devDependencies },
      'apps/web': { name: '@r/web', dependencies: manifests['apps/web/package.json'].dependencies },
      'node_modules/@r/web': { resolved: 'apps/web', link: true },
      'node_modules/next': entry('next', '16.3.8'),
      'node_modules/typescript': entry('typescript', '7.0.2', { license: 'Apache-2.0' }),
      ...packages,
    },
  };
}

test('the allowlist copy agrees with RFC-2026-029 §3.1, §3.2, §3.4/2 and its amendment', async () => {
  const { allowlist, rfc } = await repository();
  assert.deepEqual(compareAllowlistWithRfc(allowlist, rfc), []);
  const parsed = parseRfcAllowlist(rfc);
  assert.equal(parsed.runtime.length, 14, 'RFC-2026-029 §3.1 lists fourteen runtime packages');
  assert.equal(parsed.development.length, 13, 'RFC-2026-029 §3.2 lists thirteen development packages');
  assert.equal(allowlist.runtime.length + allowlist.development.length, 27);
});

test('the copy and the RFC are held to each other: a row, a cell, a glob, a column or a licence that differs fails', async () => {
  const { allowlist, rfc } = await repository();
  const copy = () => JSON.parse(JSON.stringify(allowlist));
  const fails = (list, pattern, why) => assert.ok(list.some((p) => pattern.test(p)), `${why}: ${list.join(' | ') || 'no problem reported'}`);

  const dropped = copy();
  dropped.runtime = dropped.runtime.filter((r) => r.name !== 'zod');
  fails(compareAllowlistWithRfc(dropped, rfc), /the RFC lists zod/, 'a row the copy lost');

  fails(compareAllowlistWithRfc(allowlist, rfc.replace('| `clsx` | shadcn/ui class helper | D12 | `apps/web/components/**`, `apps/web/lib/utils.ts` |',
    '| `clsx` | shadcn/ui class helper | D12 | `apps/**` |')), /the copy lists clsx/, 'a where cell the RFC changed');

  const widened = copy();
  widened.runtime.find((r) => r.name === '@supabase/ssr').imports.push('apps/web/app/**');
  fails(compareAllowlistWithRfc(widened, rfc), /@supabase\/ssr: the copy admits apps\/web\/app\/\*\*/, 'a glob the cell does not name');

  const narrowed = copy();
  narrowed.runtime.find((r) => r.name === 'clsx').imports = ['apps/web/components/**'];
  fails(compareAllowlistWithRfc(narrowed, rfc), /clsx: the RFC names `apps\/web\/lib\/utils\.ts`/, 'a path the cell names and the copy dropped');

  const nowhere = copy();
  nowhere.development.find((r) => r.name === 'typescript').imports = ['scripts/**'];
  fails(compareAllowlistWithRfc(nowhere, rfc), /typescript: the RFC says "nowhere/, 'an import admitted for a package the RFC says is imported nowhere');

  const moved = copy();
  const vitest = moved.development.find((r) => r.name === 'vitest');
  moved.development = moved.development.filter((r) => r !== vitest);
  moved.runtime.push(vitest);
  fails(compareAllowlistWithRfc(moved, rfc), /runtime: the copy lists vitest/, 'a name moved between columns');

  const decided = copy();
  decided.runtime.find((r) => r.name === 'pg').decision = 'D5';
  fails(compareAllowlistWithRfc(decided, rfc), /the RFC lists pg/, 'a decision cell that differs');

  fails(compareAllowlistWithRfc(allowlist, rfc.replace('Apache-2.0, 0BSD.', 'Apache-2.0, 0BSD, MPL-2.0.')), /licences: §3\.4\/2 accepts/, 'a licence list that differs');
  fails(compareAllowlistWithRfc(allowlist, rfc.replace('## Amendment 2026-10-12', '## Addendum 2026-10-12')), /has no "## Amendment 2026-10-12" section/, 'the amendment gone');
  const extraException = copy();
  extraException.licences.exceptions.push({ licence: 'GPL-3.0-only', packages: ['^anything$'], named: 'anything' });
  fails(compareAllowlistWithRfc(extraException, rfc), /the amendment does not name GPL-3\.0-only/, 'an exception the amendment does not make');
});

test('every package.json names only allowlisted packages, at exact versions, in their column', async () => {
  const { manifests, allowlist } = await repository();
  assert.deepEqual(Object.keys(manifests).sort(), ['apps/web/package.json', 'package.json']);
  assert.deepEqual(checkPackageManifests(manifests, allowlist), []);
  assert.deepEqual(manifests['package.json'].workspaces, ['apps/web']);
  assert.equal(manifests['package.json'].dependencies, undefined, 'the root holds no runtime dependency');
});

test('a package outside the allowlist, a range, a moved column, a lifecycle script or a stray package.json fails', async () => {
  const allowlist = await loadAllowlist();
  const fails = (manifests, pattern, why) => {
    const problems = checkPackageManifests(manifests, allowlist);
    assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  };
  assert.deepEqual(checkPackageManifests(rootManifests(), allowlist), [], 'the synthetic baseline is clean');
  fails(rootManifests({ web: { dependencies: { next: '16.3.8', 'left-pad': '1.3.0' } } }), /left-pad, which is not in RFC-2026-029/, 'an unlisted package');
  fails(rootManifests({ web: { dependencies: { next: '^16.3.8' } } }), /"\^16\.3\.8", not an exact version/, 'a caret range');
  for (const spelling of ['~16.3.8', '16.x', 'latest', '*', '>=16', 'npm:next@16.3.8', 'github:vercel/next.js', 'file:../next', 'workspace:*']) {
    fails(rootManifests({ web: { dependencies: { next: spelling } } }), /not an exact version/, `the spelling ${spelling}`);
  }
  fails(rootManifests({ root: { devDependencies: { next: '16.3.8' } } }), /lists under §3\.1 \(dependencies\)/, 'a runtime package as a devDependency');
  fails(rootManifests({ web: { dependencies: { vitest: '5.0.3' } } }), /lists under §3\.2 \(devDependencies\)/, 'a development package as a dependency');
  fails(rootManifests({ web: { scripts: { postinstall: 'node x.js' } } }), /lifecycle script\(s\) postinstall/, 'a postinstall script');
  fails(rootManifests({ root: { scripts: { prepare: 'x' } } }), /lifecycle script\(s\) prepare/, 'a root prepare script');
  fails(rootManifests({ web: { optionalDependencies: { sharp: '0.35.5' } } }), /declares optionalDependencies/, 'an optional dependency');
  fails(rootManifests({ root: { overrides: { postcss: '8.5.28' } } }), /declares overrides/, 'an override');
  fails(rootManifests({ web: { private: false } }), /is not "private": true/, 'a publishable workspace');
  fails(rootManifests({ root: { workspaces: ['apps/*'] } }), /RFC-2026-029 §4\.1 makes apps\/web/, 'a glob workspace');
  const stray = rootManifests();
  stray['scripts/tool/package.json'] = { name: 'tool', private: true, dependencies: { 'left-pad': '1.3.0' } };
  fails(stray, /scripts\/tool\/package\.json is neither the root package nor a workspace/, 'a package.json no workspace declares');
});

test('the lockfile is registry-only with sha512 integrity, and its root entries match the package files', async () => {
  const { manifests, lock } = await repository();
  assert.deepEqual(checkLockfile(lock, manifests), []);
  assert.equal(lock.lockfileVersion, 3);
  const entries = Object.entries(lock.packages).filter(([key]) => key.startsWith('node_modules/'));
  assert.ok(entries.length > 100, `the installed tree is in the lockfile (${entries.length} entries)`);
  for (const [key, value] of entries) {
    if (value.link) assert.equal(value.resolved, 'apps/web', `${key} links only the workspace`);
  }
});

test('a non-registry, unpinned, integrity-less or mismatched lockfile entry fails', () => {
  const manifests = rootManifests();
  assert.deepEqual(checkLockfile(lockFor(manifests), manifests), [], 'the synthetic baseline is clean');
  const fails = (lock, pattern, why) => {
    const problems = checkLockfile(lock, manifests);
    assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  };
  fails(lockFor(manifests, { 'node_modules/x': entry('x', '1.0.0', { resolved: 'git+ssh://git@github.com/a/x.git#abc' }) }), /not https:\/\/registry\.npmjs\.org\//, 'a git dependency');
  fails(lockFor(manifests, { 'node_modules/x': entry('x', '1.0.0', { resolved: 'http://registry.npmjs.org/x/-/x-1.0.0.tgz' }) }), /not https:\/\/registry/, 'plain http');
  fails(lockFor(manifests, { 'node_modules/x': entry('x', '1.0.0', { resolved: 'https://registry.example.com/x/-/x-1.0.0.tgz' }) }), /not https:\/\/registry/, 'another registry');
  fails(lockFor(manifests, { 'node_modules/x': entry('x', '1.0.0', { integrity: 'sha1-abcdefabcdefabcdefabcdefabcdefabcdefabcd' }) }), /not a sha512/, 'a sha1 integrity');
  fails(lockFor(manifests, { 'node_modules/x': entry('x', '1.0.0', { integrity: undefined }) }), /not a sha512/, 'no integrity');
  fails(lockFor(manifests, { 'node_modules/x': { resolved: '../outside', link: true } }), /not a declared workspace/, 'a link outside the workspaces');
  fails(lockFor(manifests, { 'apps/other': { name: 'other' } }), /neither the root, a declared workspace nor a node_modules path/, 'an undeclared package path');
  fails({ ...lockFor(manifests), lockfileVersion: 2 }, /lockfileVersion is 2, not 3/, 'lockfile v2');
  const drifted = lockFor(manifests);
  drifted.packages['apps/web'].dependencies = { next: '16.3.7' };
  fails(drifted, /workspace apps\/web dependencies does not match/, 'a lockfile that no longer matches its package.json');
  const missing = lockFor(manifests);
  delete missing.packages['apps/web'];
  fails(missing, /has no entry for workspace apps\/web/, 'a workspace missing from the lockfile');
});

test('an inBundle entry is accepted only inside a registry parent that bundles it', () => {
  const manifests = rootManifests();
  const parent = 'node_modules/@tailwindcss/oxide-wasm32-wasi';
  const bundled = ['@napi-rs/wasm-runtime', '@emnapi/core', '@emnapi/runtime', '@tybys/wasm-util', '@emnapi/wasi-threads', 'tslib'];
  const packages = {
    [parent]: entry('@tailwindcss/oxide-wasm32-wasi', '4.3.3', { bundleDependencies: bundled, optional: true }),
  };
  for (const name of bundled) packages[`${parent}/node_modules/${name}`] = { version: '1.0.0', inBundle: true, license: 'MIT', optional: true };
  packages[`${parent}/node_modules/@napi-rs/wasm-runtime/node_modules/tslib`] = { version: '2.8.1', inBundle: true, license: '0BSD' };
  assert.deepEqual(checkLockfile(lockFor(manifests, packages), manifests), [], 'six bundled entries and a nested one, as npm writes them');

  const fails = (mutate, pattern, why) => {
    const copy = JSON.parse(JSON.stringify(packages));
    mutate(copy);
    const problems = checkLockfile(lockFor(manifests, copy), manifests);
    assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  };
  fails((p) => { p[parent].bundleDependencies = bundled.filter((n) => n !== 'tslib'); }, /whose bundleDependencies do not list tslib/, 'a bundled entry its parent does not bundle');
  fails((p) => { delete p[parent].bundleDependencies; }, /bundleDependencies do not list/, 'a parent that bundles nothing');
  fails((p) => { p[parent].resolved = 'https://example.com/x.tgz'; }, /which is not a registry entry with a sha512 integrity/, 'a parent off the registry');
  fails((p) => { p[parent].integrity = 'sha1-x'; }, /which is not a registry entry with a sha512 integrity/, 'a parent without sha512');
  fails((p) => { p[`${parent}/node_modules/tslib`].resolved = 'https://registry.npmjs.org/tslib/-/tslib-1.0.0.tgz'; }, /also names its own resolved\/integrity/, 'a bundled entry with a tarball of its own');
  fails((p) => { p['node_modules/orphan'] = { version: '1.0.0', inBundle: true, license: 'MIT' }; }, /no enclosing entry carries it/, 'an inBundle entry at the top');
});

test('every lockfile licence is accepted by §3.4/2 or named by the amendment', async () => {
  const { manifests, lock, allowlist } = await repository();
  assert.deepEqual(checkLicences(lock, manifests, allowlist), []);
  const outside = Object.entries(lock.packages)
    .filter(([key, value]) => key.startsWith('node_modules/') && !value.link)
    .map(([, value]) => value.license)
    .filter((l) => !licenceAlternatives(l).some((ids) => ids.every((id) => allowlist.licences.accepted.includes(id))));
  assert.ok(outside.every((l) => /CC-BY-4\.0|MPL-2\.0|LGPL-3\.0-or-later/.test(l)),
    `only the three amended families sit outside §3.4/2: ${[...new Set(outside)].join(', ')}`);
  assert.deepEqual(verifyAll({ ...(await repository()) }), { allowlist: [], manifests: [], lockfile: [], licences: [] });
});

test('a licence outside the list fails unless the amendment names that transitive package', async () => {
  const allowlist = await loadAllowlist();
  const manifests = rootManifests();
  const check = (packages) => checkLicences(lockFor(manifests, packages), manifests, allowlist);
  assert.deepEqual(check({
    'node_modules/caniuse-lite': entry('caniuse-lite', '1.0.30001814', { license: 'CC-BY-4.0' }),
    'node_modules/lightningcss-linux-x64-gnu': entry('lightningcss-linux-x64-gnu', '1.32.0', { license: 'MPL-2.0' }),
    'node_modules/vite/node_modules/lightningcss': entry('lightningcss', '1.33.0', { license: 'MPL-2.0' }),
    'node_modules/@img/sharp-libvips-linux-x64': entry('@img/sharp-libvips-linux-x64', '1.3.4', { license: 'LGPL-3.0-or-later' }),
    'node_modules/@img/sharp-win32-x64': entry('@img/sharp-win32-x64', '0.35.5', { license: 'Apache-2.0 AND LGPL-3.0-or-later' }),
    'node_modules/@img/sharp-wasm32': entry('@img/sharp-wasm32', '0.35.5', { license: 'Apache-2.0 AND LGPL-3.0-or-later AND MIT' }),
    'node_modules/dual': entry('dual', '1.0.0', { license: '(MIT OR GPL-3.0-only)' }),
  }), [], 'the named exceptions and an OR with an accepted side pass');
  const fails = (packages, pattern, why) => {
    const problems = check(packages);
    assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  };
  fails({ 'node_modules/x': entry('x', '1.0.0', { license: 'GPL-3.0-only' }) }, /licensed GPL-3\.0-only/, 'a copyleft licence nobody decided');
  fails({ 'node_modules/browserslist-data': entry('browserslist-data', '1.0.0', { license: 'CC-BY-4.0' }) }, /licensed CC-BY-4\.0/, 'an amended licence on a package the amendment does not name');
  fails({ 'node_modules/lightningcss-plugin': entry('lightningcss-plugin', '1.0.0', { license: 'MPL-2.0' }) }, /licensed MPL-2\.0/, 'a name that only resembles a platform binary');
  fails({ 'node_modules/@img/sharp-linux-x64': entry('@img/sharp-linux-x64', '0.35.5', { license: 'Apache-2.0 AND GPL-2.0-only' }) }, /licensed Apache-2\.0 AND GPL-2\.0-only/, 'a named package under a licence the amendment does not accept');
  fails({ 'node_modules/x': entry('x', '1.0.0', { license: undefined }) }, /has no licence the guard can read/, 'no licence recorded');
  fails({ 'node_modules/x': entry('x', '1.0.0', { license: '(MIT AND (GPL-2.0 OR BSD-3-Clause))' }) }, /has no licence the guard can read/, 'an expression too complex to read');
  const direct = rootManifests({ web: { dependencies: { next: '16.3.8', 'caniuse-lite': '1.0.30001814' } } });
  const directProblems = checkLicences(lockFor(direct, { 'node_modules/caniuse-lite': entry('caniuse-lite', '1.0.30001814', { license: 'CC-BY-4.0' }) }), direct, allowlist);
  assert.ok(directProblems.some((p) => /for a direct dependency/.test(p)), `the amendment is for transitive packages only: ${directProblems.join(' | ')}`);
  const fallback = JSON.parse(JSON.stringify(allowlist));
  fallback.licences.lockfileFallback = { 'x@1.0.0': 'ISC' };
  assert.deepEqual(checkLicences(lockFor(manifests, { 'node_modules/x': entry('x', '1.0.0', { license: undefined }) }), manifests, fallback), [],
    'a licence recorded at install for an entry whose lockfile carries none is read from the copy');
});
