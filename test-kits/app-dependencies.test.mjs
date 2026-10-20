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
  parseLicenceTable,
  parseReleaseAgeDays,
  parseRfcAllowlist,
  parseRfcTerms,
  parseWhereCell,
  readRepository,
  SHADOWED_COMMANDS,
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
  fails(compareAllowlistWithRfc(narrowed, rfc), /clsx: the RFC's cell admits apps\/web\/lib\/utils\.ts and the copy has no such glob/, 'a path the cell names and the copy dropped');

  const nowhere = copy();
  nowhere.development.find((r) => r.name === 'typescript').imports = ['scripts/**'];
  fails(compareAllowlistWithRfc(nowhere, rfc), /typescript: the copy admits scripts\/\*\*, which "nowhere, except `scripts\/app-boundaries-parser\.mjs`/, 'an import admitted beyond the one file the RFC names for typescript');

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
  extraException.licences.exceptions.push({ licence: 'GPL-3.0-only', packages: ['anything'], expressions: ['GPL-3.0-only'] });
  fails(compareAllowlistWithRfc(extraException, rfc), /the copy admits GPL-3\.0-only for anything under GPL-3\.0-only, which the amendment's table does not/, 'an exception the amendment does not make');
});

test('every package.json names only allowlisted packages, at exact versions, in their column', async () => {
  const { manifests, allowlist } = await repository();
  assert.deepEqual(Object.keys(manifests).sort(), ['apps/web/package.json', 'apps/worker/package.json', 'package.json']);
  assert.deepEqual(checkPackageManifests(manifests, allowlist), []);
  assert.deepEqual(manifests['package.json'].workspaces, ['apps/web', 'apps/worker']);
  assert.equal(manifests['package.json'].dependencies, undefined, 'the root holds no runtime dependency');
  // WP-1A-A0-006 (the Product Owner's answer of 2026-10-20, header `Deps + CI`): apps/worker is the
  // dispatcher's workspace (RFC-2026-029 §2.7/3, §6.1). It declares no script (workspaceScripts names
  // none for it) and one runtime package, pg, the worker driver (§3.1); apps/web, whose composition root
  // is where @supabase/ssr may be imported, holds the Supabase packages and never pg (§6.3/5).
  const worker = manifests['apps/worker/package.json'];
  assert.equal(worker.scripts, undefined, 'apps/worker declares no script');
  assert.deepEqual(Object.keys(worker.dependencies ?? {}), ['pg'], 'apps/worker depends on pg alone');
  assert.equal(worker.devDependencies, undefined, 'apps/worker holds no development package');
  const web = manifests['apps/web/package.json'];
  assert.equal(web.dependencies?.pg, undefined, 'apps/web does not depend on pg');
  assert.ok(web.dependencies?.['@supabase/ssr'] && web.dependencies?.['@supabase/supabase-js'], 'apps/web holds the request path\'s Supabase packages');
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
    if (value.link) assert.ok(['apps/web', 'apps/worker'].includes(value.resolved), `${key} links only a workspace (apps/worker: WP-1A-A0-006)`);
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
  fails({ 'node_modules/@img/sharp-linux-x64': entry('@img/sharp-linux-x64', '0.35.5', { license: 'LGPL-3.0-or-later' }) }, /licensed LGPL-3\.0-or-later/, 'R0-257-4: a non-libvips build under plain LGPL');
  fails({ 'node_modules/@img/sharp-evil': entry('@img/sharp-evil', '1.0.0', { license: 'LGPL-3.0-or-later' }) }, /licensed LGPL-3\.0-or-later/, 'R0-257-4: a new @img/sharp-* name under plain LGPL');
  fails({ 'node_modules/caniuse-lite': entry('caniuse-lite', '1.0.30001814', { license: 'CC-BY-4.0 AND GPL-3.0-only' }) }, /licensed CC-BY-4\.0 AND GPL-3\.0-only/, 'a named package under an expression its row does not state');
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

test('Q0-257-1: each "where" cell is read exactly, so a widened glob, a redefined term or an unknown phrasing fails', async () => {
  const { allowlist, rfc } = await repository();
  const terms = parseRfcTerms(rfc);
  assert.deepEqual([...terms.adapters], ['src/modules/*/adapters/**'], "§3.1's definition of adapters");
  assert.deepEqual([...terms.compositionRoot].sort(), [...allowlist.compositionRoot].sort(), "§3.1's definition of the composition root");
  assert.equal(terms.compositionRoot.length, 10, 'two composition directories and four entry files for each of the two apps');
  const where = (cell) => parseWhereCell(cell, terms);
  assert.deepEqual(where('`apps/**`').globs, ['apps/**']);
  assert.deepEqual(where('adapters, and `apps/web/composition/**`').globs, ['src/modules/*/adapters/**', 'apps/web/composition/**']);
  assert.deepEqual(where('`src/modules/platform-kernel/adapters/**` (the job store, MOD-000) only; never reachable from `apps/web` (§6.3/5)'),
    { globs: ['src/modules/platform-kernel/adapters/**'], never: ['never reachable from `apps/web` (§6.3/5)'] }, "pg's cell: one glob, and the prohibition §6.3/5 holds");
  assert.deepEqual(where('anywhere under `apps/` and `src/`').globs, ['apps/**', 'src/**']);
  assert.deepEqual([...where('the composition root of `apps/web` and `apps/worker` only').globs].sort(), [...terms.compositionRoot].sort());
  assert.deepEqual(where('the composition root of `apps/web` only').globs.every((g) => g.startsWith('apps/web/')), true, 'one app admits that app\'s files only');
  assert.deepEqual(where('nowhere (ambient types)').globs, []);
  assert.deepEqual(where('`apps/web/**/*.css` (`@import`) only').globs, ['apps/web/**/*.css']);
  assert.deepEqual(where('`eslint.config.mjs` at the root only').globs, ['eslint.config.mjs']);
  assert.deepEqual(where('`**/*.test.ts`, `**/*.test.tsx` and `vitest.config.ts` only').globs, ['**/*.test.ts', '**/*.test.tsx', 'vitest.config.ts']);
  assert.throws(() => where('wherever the composition root decides'), /neither a backticked path nor a term/, 'an unknown phrasing is refused, not guessed');
  assert.throws(() => where('anywhere under `apps`'), /where a directory/, '"anywhere under" a path that is not a directory');

  const copy = () => JSON.parse(JSON.stringify(allowlist));
  const fails = (list, pattern, why) => assert.ok(list.some((p) => pattern.test(p)), `${why}: ${list.join(' | ') || 'no problem reported'}`);
  const sentry = copy();
  sentry.runtime.find((r) => r.name === '@sentry/nextjs').imports.push('apps/web/**');
  fails(compareAllowlistWithRfc(sentry, rfc), /@sentry\/nextjs: the copy admits apps\/web\/\*\*/, "Q0's M13: @sentry/nextjs widened to every apps/web file");
  const pg = copy();
  pg.runtime.find((r) => r.name === 'pg').imports.push('src/modules/*/adapters/**');
  fails(compareAllowlistWithRfc(pg, rfc), /pg: the copy admits src\/modules\/\*\/adapters\/\*\*/, "Q0's M14: pg widened to every module's adapters");
  const root = copy();
  root.compositionRoot.push('apps/web/app/**');
  fails(compareAllowlistWithRfc(root, rfc), /compositionRoot: §3\.1 defines/, 'the composition root widened in the copy');
  const adapters = copy();
  adapters.adapters = ['src/**'];
  fails(compareAllowlistWithRfc(adapters, rfc), /adapters: §3\.1 defines src\/modules\/\*\/adapters\/\*\*/, 'the adapters term widened in the copy');
  fails(compareAllowlistWithRfc(allowlist, rfc.replace('(§6.3/5) |', '(§6.3/5); never reachable from `apps/worker` |')), /pg: the RFC states "never reachable from `apps\/worker`", which no guard here holds/,
    'a prohibition the guard does not hold');
  fails(compareAllowlistWithRfc(allowlist, rfc.replace('| D12 | `apps/web/components/**` |\n| `class-variance-authority`', '| D12 | wherever components live |\n| `class-variance-authority`')),
    /radix-ui: the cell "wherever components live" holds/, 'a cell the reader does not know');
});

test("Q0-257-2: the amendment's licence rows and the copy's exceptions are held to each other, both ways", async () => {
  const { allowlist, rfc } = await repository();
  const amendment = rfc.slice(rfc.indexOf('## Amendment 2026-10-12'));
  const { rows, problems } = parseLicenceTable(amendment);
  assert.deepEqual(problems, []);
  assert.deepEqual(rows, [
    { licence: 'CC-BY-4.0', packages: ['caniuse-lite'], expressions: ['CC-BY-4.0'] },
    { licence: 'MPL-2.0', packages: ['lightningcss', 'lightningcss-<platform>'], expressions: ['MPL-2.0'] },
    { licence: 'LGPL-3.0-or-later', packages: ['@img/sharp-libvips-*'], expressions: ['LGPL-3.0-or-later'] },
    { licence: 'LGPL-3.0-or-later', packages: ['@img/sharp-*'], expressions: ['Apache-2.0 AND LGPL-3.0-or-later', 'Apache-2.0 AND LGPL-3.0-or-later AND MIT'] },
  ], 'the table, read row by row');
  const copy = () => JSON.parse(JSON.stringify(allowlist));
  const fails = (list, pattern, why) => assert.ok(list.some((p) => pattern.test(p)), `${why}: ${list.join(' | ') || 'no problem reported'}`);
  const everything = copy();
  everything.licences.exceptions.find((e) => e.packages.includes('@img/sharp-libvips-*')).packages = ['.*'];
  fails(compareAllowlistWithRfc(everything, rfc), /the copy admits LGPL-3\.0-or-later for \.\*/, "Q0's M16: the LGPL pattern widened to .*");
  const plain = copy();
  plain.licences.exceptions.find((e) => e.packages.includes('@img/sharp-*')).expressions.push('LGPL-3.0-or-later');
  fails(compareAllowlistWithRfc(plain, rfc), /the copy admits LGPL-3\.0-or-later for @img\/sharp-\*/, 'R0-257-4: @img/sharp-* admitted under plain LGPL');
  fails(compareAllowlistWithRfc(allowlist, rfc.replace('| `CC-BY-4.0` | `caniuse-lite` |\n', '')), /the copy admits CC-BY-4\.0 for caniuse-lite under CC-BY-4\.0, which the amendment's table does not/,
    "Q0's M25: the RFC's caniuse-lite row deleted");
  const lost = copy();
  lost.licences.exceptions = lost.licences.exceptions.filter((e) => e.licence !== 'MPL-2.0');
  fails(compareAllowlistWithRfc(lost, rfc), /the amendment admits MPL-2\.0 for lightningcss, lightningcss-<platform> under MPL-2\.0, and the copy has no such row/, 'a row the copy lost');
  fails(compareAllowlistWithRfc(allowlist, rfc.replace('`lightningcss` and its per-platform binaries (`lightningcss-<platform>`)', '`lightningcss` and its friends')),
    /holds "`lightningcss` and its friends", which this reader does not know/, 'a cell the reader does not know');
});

test('A1-257-3: releaseAgeDays is §4.8\'s "seven days", and an exception names one version and an A1 record', async () => {
  const { allowlist, rfc } = await repository();
  assert.equal(parseReleaseAgeDays(rfc), 7, '§4.8 reads seven days');
  assert.equal(allowlist.releaseAgeDays, 7);
  assert.deepEqual(allowlist.releaseAgeExceptions, [], 'no exception is admitted today');
  const fails = (list, pattern, why) => assert.ok(list.some((p) => pattern.test(p)), `${why}: ${list.join(' | ') || 'no problem reported'}`);
  fails(compareAllowlistWithRfc({ ...allowlist, releaseAgeDays: 0 }, rfc), /releaseAgeDays: §4\.8 says 7 days; the copy says 0/, "Q0's M18: releaseAgeDays 0");
  fails(compareAllowlistWithRfc(allowlist, rfc.replace('for at least **seven days**', 'for at least **three days**')), /§4\.8 says 3 days; the copy says 7/, 'the RFC changed and the copy did not');
  fails(compareAllowlistWithRfc(allowlist, rfc.replace('**Release age.**', '**Age.**')), /§4\.8 states no day count/, 'a §4.8 the reader cannot find');
  fails(compareAllowlistWithRfc({ ...allowlist, releaseAgeExceptions: [{ package: 'x@1.0.0', a1_record: 'README.md' }] }, rfc),
    /x@1\.0\.0's a1_record "README\.md" is not evidence\/<package>\/a1-\*\.md/, "Q0's M19: README.md as the A1 record");
  fails(compareAllowlistWithRfc({ ...allowlist, releaseAgeExceptions: [{ package: 'x@^1.0.0', a1_record: 'evidence/WP-X/a1-x.md' }] }, rfc),
    /"x@\^1\.0\.0" is not one exact name@version/, 'an exception for a range');
  assert.deepEqual(compareAllowlistWithRfc({ ...allowlist, releaseAgeExceptions: [{ package: '@scope/x@1.0.1', a1_record: 'evidence/WP-1A-A0-002/a1-release-age-x.md' }] }, rfc), [],
    'a well-formed exception passes this check; the CI step then requires the pull request to add or change its record');
});


test('Amendment 2026-10-12: typescript\'s §3.2 cell admits scripts/app-boundaries-parser.mjs exactly, and the copy is held to it', async () => {
  const { allowlist, rfc } = await repository();
  const CELL = 'nowhere, except `scripts/app-boundaries-parser.mjs` (parser API; RFC amendment 2026-10-12)';
  const PARSER = 'scripts/app-boundaries-parser.mjs';
  const terms = parseRfcTerms(rfc);
  const rfcRow = parseRfcAllowlist(rfc).development.find((r) => r.name === 'typescript');
  assert.deepEqual(rfcRow, { name: 'typescript', decision: 'D1', where: CELL }, "the RFC's §3.2 row, read by the parity parser");
  assert.deepEqual(allowlist.development.find((r) => r.name === 'typescript'), { name: 'typescript', decision: 'D1', where: CELL, imports: [PARSER] }, "the copy's row");
  assert.deepEqual(parseWhereCell(CELL, terms), { globs: [PARSER], never: [] }, 'the cell admits the one file it names');
  assert.match(rfc, /^The `@types\/\*` packages are never imported by name\. `typescript` is imported by one file only,\n`scripts\/app-boundaries-parser\.mjs`, for its parser API, which CI runs \(Amendment 2026-10-12\)\.$/m, "§3.2's sentence above the table says the same");
  assert.match(rfc, /^## Amendment 2026-10-12 — [^\n]*`typescript` in the boundary guard's parser/m, 'the amendment that makes the widening');
  assert.match(rfc, /`อนุญาตให้ guard import typescript \(Recommended\)`/, "the Owner's answer, verbatim, in the amendment");

  // Fails closed: "nowhere, except" admits backticked single files and nothing else.
  for (const cell of ['nowhere, except `scripts/**`', 'nowhere, except `scripts/`', 'nowhere, except `scripts/*.mjs`', 'nowhere, except scripts/app-boundaries-parser.mjs', 'nowhere, except the parser']) {
    assert.throws(() => parseWhereCell(cell, terms), /after "nowhere, except", where one file/, `the cell ${JSON.stringify(cell)} is refused, not read as a wider grant`);
  }

  const copy = () => JSON.parse(JSON.stringify(allowlist));
  const fails = (list, pattern, why) => assert.ok(list.some((p) => pattern.test(p)), `${why}: ${list.join(' | ') || 'no problem reported'}`);
  const row = (c) => c.development.find((r) => r.name === 'typescript');
  const extra = copy();
  row(extra).imports.push('scripts/verify-app-boundaries.mjs');
  fails(compareAllowlistWithRfc(extra, rfc), /typescript: the copy admits scripts\/verify-app-boundaries\.mjs/, 'a second file in the copy');
  const dropped = copy();
  row(dropped).imports = [];
  fails(compareAllowlistWithRfc(dropped, rfc), /typescript: the RFC's cell admits scripts\/app-boundaries-parser\.mjs and the copy has no such glob/, 'the parser dropped from the copy');
  const old = copy();
  row(old).where = 'nowhere (a CLI)';
  row(old).imports = [];
  fails(compareAllowlistWithRfc(old, rfc), /development: the copy lists typescript \(D1, "nowhere \(a CLI\)"\) and the RFC does not/, 'the copy left at the old cell');
  const tsLine = `| \`typescript\` | \`tsc --noEmit\` | D1 | ${CELL} |`;
  assert.ok(rfc.includes(tsLine), "the RFC's row as the test edits it");
  fails(compareAllowlistWithRfc(allowlist, rfc.replace(tsLine, '| `typescript` | `tsc --noEmit` | D1 | nowhere (a CLI) |')), /development: the RFC lists typescript \(D1, "nowhere \(a CLI\)"\) and the copy does not/, 'the RFC reverted and the copy not');
  fails(compareAllowlistWithRfc(allowlist, rfc.replace(tsLine, '| `typescript` | `tsc --noEmit` | D1 | nowhere, except `scripts/**` (parser API; RFC amendment 2026-10-12) |')),
    /typescript: the cell "nowhere, except `scripts\/\*\*`[^"]*" names/, 'the RFC widened to a glob');
});

test('A1-257-6: a lockfile entry whose bin is named after a common command fails, so no package can stand in for it on PATH', async () => {
  const { manifests, lock } = await repository();
  const bins = Object.entries(lock.packages).flatMap(([key, value]) => Object.keys(value.bin ?? {}).map((bin) => `${key.replace(/^node_modules\//, '')}:${bin}`)).sort();
  assert.deepEqual(bins, ['baseline-browser-mapping:baseline-browser-mapping', 'jiti:jiti', 'nanoid:nanoid', 'next:next', 'rolldown:rolldown', 'semver:semver',
    'typescript:tsc', 'vite:vite', 'vitest:vitest', 'why-is-node-running:why-is-node-running'], "today's ten bins, as A1 measured them; none shadows a command");
  assert.deepEqual(checkLockfile(lock, manifests).filter((p) => /A1-257-6/.test(p)), []);
  assert.deepEqual(SHADOWED_COMMANDS, ['node', 'npm', 'npx', 'git', 'sh', 'bash', 'zsh', 'env', 'psql', 'pg_ctl', 'initdb', 'curl', 'wget', 'tar', 'gzip', 'make',
    'python', 'python3', 'ruby', 'perl', 'ssh', 'scp', 'docker', 'gh', 'sudo', 'cp', 'mv', 'rm', 'cat', 'ls', 'test', 'true', 'false']);
  const synthetic = rootManifests();
  assert.deepEqual(checkLockfile(lockFor(synthetic, { 'node_modules/x': entry('x', '1.0.0', { bin: { 'x-cli': 'cli.js' } }) }), synthetic), [], 'a bin with its own name passes');
  const fails = (packages, pattern, why) => {
    const problems = checkLockfile(lockFor(synthetic, packages), synthetic);
    assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  };
  // A1's probe, as A1 measured it: a package declaring bins named node and git, installed with --ignore-scripts.
  fails({ 'node_modules/x': entry('x', '1.0.0', { bin: { node: 'x.js', git: 'x.js' } }) }, /node_modules\/x declares a bin named "node", .* in place of the node command \(A1-257-6\)/, "A1's node bin");
  fails({ 'node_modules/x': entry('x', '1.0.0', { bin: { node: 'x.js', git: 'x.js' } }) }, /declares a bin named "git"/, "A1's git bin");
  for (const command of SHADOWED_COMMANDS) {
    fails({ 'node_modules/y': entry('y', '1.0.0', { bin: { [command]: 'y.js' } }) }, new RegExp(`declares a bin named "${command}"`), `a bin named ${command}`);
  }
  fails({ 'node_modules/a/node_modules/npm': entry('npm', '1.0.0', { bin: 'cli.js' }) }, /node_modules\/a\/node_modules\/npm declares a bin named "npm", .* in place of the npm command/, 'a string bin, linked under the package name');
  fails({ 'node_modules/@s/sh': entry('@s/sh', '1.0.0', { bin: 'run.js' }) }, /in place of the sh command/, 'a scoped package, linked without its scope');
  fails({ 'node_modules/z': entry('z', '1.0.0', { bin: { Node: 'z.js' } }) }, /in place of the node command/, 'in another letter case');
  fails({ 'node_modules/b': entry('b', '1.0.0', { bin: { psql: 'b.js' } }) }, /declares a bin named "psql"/, "a database client the bootstrap job's guards run");
  const workspaceBin = lockFor(synthetic);
  workspaceBin.packages['apps/web'].bin = { npx: 'x.js' };
  assert.ok(checkLockfile(workspaceBin, synthetic).some((p) => /^apps\/web declares a bin named "npx"/.test(p)), 'a workspace\'s own bin, which npm links too');
});
