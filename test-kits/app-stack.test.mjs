import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  REQUIRED_FLAGS,
  allowJsVerdict,
  controlVerdict,
  errorsFrom,
  expectationsFrom,
  flagsVerdict,
} from '../scripts/verify-typecheck-control.mjs';
import { ageVerdict, changedEntries } from '../scripts/verify-release-age.mjs';
import { ALLOWED_DEPENDENCIES, extractImports } from '../scripts/verify-test-coverage-floor.mjs';

// The application tier's checks that need the installed toolchain or the network -- `tsc` and its
// negative control (RFC-2026-029 §8/3), the release age (§4.8, §8/9), the audit (§4.6), the
// application tests (RFC-2026-034 §8 item 4) -- run in CI, never in `npm run check`. What CAN be
// held without node_modules is held here: the compiler flags as written, the verdicts those CI steps
// reach (driven with synthetic compiler and registry output, every vacuous pass included), the CI
// wiring, and §8/6's rule that nothing the tooling tier runs imports an application package.
// WP-1A-A0-002.

const FLAG_FILE = 'tsconfig.base.json';
const PROJECT_FILES = ['tsconfig.json', 'apps/web/tsconfig.json', 'test-kits/typecheck-control/tsconfig.json', 'test-kits/typecheck-control/tsconfig.allowjs.json'];

test('tsconfig.base.json carries the RFC-2026-029 §2.1/2 flags, and every project extends it without overriding them', async () => {
  const base = JSON.parse(await readFile(FLAG_FILE, 'utf8'));
  for (const [flag, value] of Object.entries(REQUIRED_FLAGS)) {
    assert.equal(base.compilerOptions[flag], value, `${FLAG_FILE} sets ${flag} to ${value}`);
  }
  assert.equal(base.compilerOptions.skipLibCheck, true, 'skipLibCheck is the one relaxation §2.1/2 allows');
  assert.equal(base.compilerOptions.noEmit, true, 'the check emits nothing; Next.js compiles');
  assert.deepEqual(Object.keys(REQUIRED_FLAGS).sort(),
    ['allowJs', 'isolatedModules', 'noFallthroughCasesInSwitch', 'noImplicitOverride', 'noUncheckedIndexedAccess', 'strict']);
  for (const file of PROJECT_FILES) {
    const project = JSON.parse(await readFile(file, 'utf8'));
    assert.match(project.extends, /(^|\/)tsconfig\.base\.json$/, `${file} extends the base`);
    const overridden = Object.keys(project.compilerOptions ?? {}).filter((flag) => flag in REQUIRED_FLAGS || flag === 'skipLibCheck');
    assert.deepEqual(overridden, [], `${file} overrides ${overridden.join(', ')}; turning a §2.1/2 flag off is a change to RFC-2026-029`);
  }
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(pkg.scripts.typecheck, 'tsc --noEmit', '`npm run typecheck` is `tsc --noEmit` (RFC-2026-029 §8/3)');
  assert.equal(pkg.scripts['test:app'], 'vitest run', 'the application tests are `vitest run` (RFC-2026-034 §8 item 4)');
  const root = JSON.parse(await readFile('tsconfig.json', 'utf8'));
  assert.ok(root.include.includes('apps/**/*.ts') && root.include.includes('apps/**/*.tsx'), 'the type check covers the application');
  assert.ok(!root.include.some((pattern) => /^(scripts|test-kits|tests|db)\//.test(pattern)), 'and never the JavaScript tooling tier (RFC-2026-011)');
});

test('the negative-control fixture marks one deliberate error for each §2.1/2 flag', async () => {
  const expected = expectationsFrom(await readFile('test-kits/typecheck-control/mistyped.ts', 'utf8'));
  assert.deepEqual([...new Set(expected.map((e) => e.flag))].sort(),
    ['isolatedModules', 'noFallthroughCasesInSwitch', 'noImplicitOverride', 'noUncheckedIndexedAccess', 'strict']);
  assert.ok(expected.every((e) => /^TS\d{4}$/.test(e.code) && e.line > 0));
  assert.deepEqual(expected.map((e) => e.code), ['TS7006', 'TS2322', 'TS2322', 'TS4114', 'TS7029', 'TS1205']);
  const js = JSON.parse(await readFile('test-kits/typecheck-control/tsconfig.allowjs.json', 'utf8'));
  assert.deepEqual(js.files, ['plain.js'], 'the allowJs control names exactly one .js file');
  const control = JSON.parse(await readFile('test-kits/typecheck-control/tsconfig.json', 'utf8'));
  assert.deepEqual(control.files, ['mistyped.ts', 'shape.ts']);
});

test('the typecheck control fails when tsc passes, misses a marked error, or a project loses a flag', async () => {
  const expected = expectationsFrom(await readFile('test-kits/typecheck-control/mistyped.ts', 'utf8'));
  const fixture = 'test-kits/typecheck-control/mistyped.ts';
  const report = expected.map((e) => `${fixture}(${e.line},5): error ${e.code}: synthetic.`).join('\n');
  assert.deepEqual(controlVerdict({ expected, status: 2, output: report }), [], 'every marked error reported: the control holds');
  assert.equal(errorsFrom(report).length, expected.length);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  fails(controlVerdict({ expected, status: 0, output: report }), /tsc exited 0 on the deliberately mistyped fixture/, 'a tsc that exits 0');
  fails(controlVerdict({ expected, status: null, output: report }), /did not run to an exit status/, 'a tsc that never ran');
  fails(controlVerdict({ expected, status: 2, output: '' }), /expects TS7006 \(strict\) and tsc did not report it/, 'a run that reported nothing (a missing compiler prints nothing)');
  const withoutOverride = report.split('\n').filter((line) => !line.includes('TS4114')).join('\n');
  fails(controlVerdict({ expected, status: 2, output: withoutOverride }), /expects TS4114 \(noImplicitOverride\)/, 'noImplicitOverride switched off');
  const shifted = report.replace(/\((\d+),5\): error TS7029/, (m, line) => `(${Number(line) + 1},5): error TS7029`);
  fails(controlVerdict({ expected, status: 2, output: shifted }), /expects TS7029/, 'the right code on the wrong line');
  const elsewhere = report.replaceAll(fixture, 'apps/web/app/page.tsx');
  fails(controlVerdict({ expected, status: 2, output: elsewhere }), /tsc did not report it/, 'the errors coming from another file');
  fails(controlVerdict({ expected: expected.filter((e) => e.flag !== 'isolatedModules'), status: 2, output: report }),
    /marks no error for isolatedModules/, 'a fixture that stopped marking a flag');
  assert.deepEqual(allowJsVerdict({ status: 2, output: "error TS6504: File 'plain.js' is a JavaScript file." }), []);
  fails(allowJsVerdict({ status: 0, output: '' }), /"allowJs": false is not in effect/, 'a .js file accepted');
  fails(allowJsVerdict({ status: 2, output: 'error TS5083: Cannot read file.' }), /did not report TS6504/, 'a failure for another reason');
  const shown = { compilerOptions: { ...REQUIRED_FLAGS } };
  assert.deepEqual(flagsVerdict('tsconfig.json', shown), []);
  fails(flagsVerdict('apps/web/tsconfig.json', { compilerOptions: { ...REQUIRED_FLAGS, noUncheckedIndexedAccess: false } }),
    /apps\/web\/tsconfig\.json: noUncheckedIndexedAccess is false/, 'a project that overrides a flag');
  fails(flagsVerdict('tsconfig.json', { compilerOptions: { strict: true } }), /allowJs is undefined/, 'a project whose shown config omits a flag');
});

test('the release-age verdict asks only about new entries and refuses a young, unknown or unexcepted version', () => {
  const lock = (packages) => ({ lockfileVersion: 3, packages: { '': {}, ...packages } });
  const base = lock({ 'node_modules/a': { version: '1.0.0' }, 'node_modules/b': { version: '2.0.0' } });
  const head = lock({
    'node_modules/a': { version: '1.0.0' },
    'node_modules/b': { version: '2.1.0' },
    'node_modules/c': { version: '3.0.0' },
    'node_modules/x/node_modules/a': { version: '1.0.0' },
    'node_modules/w': { version: '1.0.0', link: true, resolved: 'apps/web' },
    'node_modules/p/node_modules/q': { version: '9.9.9', inBundle: true },
  });
  assert.deepEqual(changedEntries(base, head).map((e) => `${e.name}@${e.version}`), ['b@2.1.0', 'c@3.0.0'],
    'an unchanged entry, a nested copy of an unchanged version, a workspace link and a bundled entry are not asked about');
  assert.equal(changedEntries({ packages: {} }, head).length, 3, 'with no base lockfile every distinct registry version is new');
  const now = Date.parse('2026-10-12T00:00:00Z');
  const entries = changedEntries(base, head);
  const old = new Map([['b@2.1.0', '2026-09-01T00:00:00Z'], ['c@3.0.0', '2026-10-05T00:00:00Z']]);
  assert.deepEqual(ageVerdict(entries, old, now), [], 'seven days to the hour is old enough');
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  fails(ageVerdict(entries, new Map([...old, ['c@3.0.0', '2026-10-09T00:00:00Z']]), now), /c@3\.0\.0 was published .*3\.0 day\(s\) ago/, 'a three-day-old version');
  fails(ageVerdict(entries, new Map([['b@2.1.0', '2026-09-01T00:00:00Z']]), now), /c@3\.0\.0: the registry gave no publish time/, 'a version with no publish time');
  fails(ageVerdict(entries, new Map([...old, ['c@3.0.0', 'yesterday']]), now), /no publish time this step could read/, 'an unreadable time');
  const young = new Map([...old, ['c@3.0.0', '2026-10-11T00:00:00Z']]);
  const exceptions = [{ package: 'c@3.0.0', a1_record: 'evidence/WP-X/a1-approval.md' }];
  fails(ageVerdict(entries, young, now, { exceptions }), /which is not in the tree/, 'an exception whose A1 record does not exist');
  assert.deepEqual(ageVerdict(entries, young, now, { exceptions, existing: new Set(['evidence/WP-X/a1-approval.md']) }), [],
    'a young security fix with A1\'s recorded approval in the tree is admitted (§4.8)');
});

test('CI runs the application checks as their own steps, after the clean install and outside npm run check', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const at = (text) => {
    const index = ci.indexOf(text);
    assert.ok(index >= 0, `ci.yml has ${JSON.stringify(text)}`);
    return index;
  };
  const steps = [
    ['- name: Validate repository bootstrap with no node_modules', null],
    ['- name: Clean install', 'run: npm ci --ignore-scripts'],
    ['- name: Validate repository bootstrap', 'run: npm run check'],
    ['- name: Verify the application dependencies', 'run: node scripts/verify-app-dependencies.mjs'],
    ['- name: Verify the application boundaries', 'run: node scripts/verify-app-boundaries.mjs'],
    ['- name: Type-check the application', 'run: npm run typecheck'],
    ['- name: Type-check negative control', 'run: node scripts/verify-typecheck-control.mjs'],
    ['- name: Application tests', 'run: npm run test:app'],
    ['- name: Build the web application', 'run: npm run build --workspace apps/web'],
    ['- name: Vulnerability audit (network)', 'run: npm audit --omit=dev --audit-level=high'],
    ['- name: Release age of new lockfile entries (network)', 'run: node scripts/verify-release-age.mjs "$BASE_SHA"'],
  ];
  let previous = -1;
  for (const [name, run] of steps) {
    const position = at(`${name}\n`);
    assert.ok(position > previous, `${name} runs after the step before it in this list`);
    const next = ci.indexOf('- name:', position + name.length);
    if (run) assert.ok(ci.slice(position, next === -1 ? ci.length : next).includes(run), `${name} runs \`${run}\``);
    previous = position;
  }
  const bare = ci.slice(at('- name: Validate repository bootstrap with no node_modules\n'), at('- name: Clean install\n'));
  assert.match(bare, /if \[ -e node_modules \]; then[\s\S]*exit 1[\s\S]*npm run check/, 'the check runs before any install and refuses a node_modules already present (§8/6)');
  assert.ok(at('- name: Print the review tier and lane') < at('- name: Validate repository bootstrap with no node_modules\n'),
    'the classification steps stay the last steps before the pull request\'s own code runs');
  const age = ci.slice(at('- name: Release age of new lockfile entries (network)\n'));
  assert.match(age.split('- name:')[1], /if: github\.event_name == 'pull_request'[\s\S]*BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/, 'the release age is measured against the pull request\'s base');
  assert.match(ci, /^ {4}env:\n {6}NEXT_TELEMETRY_DISABLED: '1'$/m, 'Next.js telemetry is off for the whole job (§4.7)');
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  for (const app of ['typecheck', 'test:app', 'tsc', 'vitest', 'next']) {
    assert.ok(!pkg.scripts.check.includes(app), `npm run check does not run ${app}; the application checks are their own CI steps (§2.1/4)`);
  }
});

test('npm run check needs no node_modules: nothing the tooling tier runs imports an application package', async () => {
  assert.deepEqual(ALLOWED_DEPENDENCIES, [], 'the tooling tier admits no package (RFC-2026-029 §2.1/4)');
  const walk = async (directory) => {
    const out = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) out.push(...await walk(path));
      else if (entry.isFile() && path.endsWith('.mjs')) out.push(path);
    }
    return out;
  };
  const files = (await Promise.all(['scripts', 'test-kits', 'tests'].map(walk))).flat();
  assert.ok(files.length > 50, `the walk reaches the tooling tier (${files.length} modules)`);
  const bare = [];
  for (const file of files) {
    for (const { specifier } of extractImports(await readFile(file, 'utf8')).imports) {
      if (!specifier.startsWith('node:') && !specifier.startsWith('./') && !specifier.startsWith('../')) bare.push(`${file} imports ${specifier}`);
    }
  }
  assert.deepEqual(bare, [], 'a tooling module importing a package would need node_modules to run');
});

test('the web skeleton wires Tailwind through PostCSS, keeps telemetry off, needs no sharp and has no data path', async () => {
  const config = await readFile('apps/web/next.config.ts', 'utf8');
  assert.match(config, /images: \{ unoptimized: true \}/, 'the build does not need sharp (RFC-2026-029 Amendment 2026-10-12)');
  assert.match(config, /process\.env\.NEXT_TELEMETRY_DISABLED \?\?= '1';/, 'telemetry is off however the config is loaded (§4.7)');
  assert.match(await readFile('apps/web/postcss.config.mjs', 'utf8'), /'@tailwindcss\/postcss': \{\}/);
  assert.match(await readFile('apps/web/app/globals.css', 'utf8'), /^@import 'tailwindcss';$/m);
  const web = JSON.parse(await readFile('apps/web/package.json', 'utf8'));
  assert.deepEqual(web.scripts, { build: 'next build' });
  const page = await readFile('apps/web/app/page.tsx', 'utf8');
  const layout = await readFile('apps/web/app/layout.tsx', 'utf8');
  for (const [name, source] of [['page.tsx', page], ['layout.tsx', layout]]) {
    assert.doesNotMatch(source, /process\.env|fetch\(|next\/font|'use server'|"use server"/, `${name} reads no environment, fetches nothing and holds no Server Action`);
  }
  assert.match(await readFile('apps/web/.gitignore', 'utf8'), /^next-env\.d\.ts$/m, 'the generated next-env.d.ts is not tracked; apps/web/types/next.d.ts carries its references');
});
