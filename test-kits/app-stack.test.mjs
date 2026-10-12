import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import { ALLOWED_DEPENDENCIES, CoverageFloorError, assertPackageScripts, extractImports } from '../scripts/verify-test-coverage-floor.mjs';
import {
  BUILD_CONTROLS,
  CLEAN_BUILD,
  checkBuildGraph,
  collectBuild,
  judgeIncluded,
  reachablePackages,
  readBuildGraph,
  runBuildControls,
} from '../scripts/verify-app-build-graph.mjs';
import { loadAllowlist } from '../scripts/verify-app-dependencies.mjs';

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
  const record = 'evidence/WP-X/a1-release-age-c.md';
  const exceptions = [{ package: 'c@3.0.0', a1_record: record }];
  fails(ageVerdict(entries, young, now, { exceptions }), /which this pull request does not add or change/, 'an exception whose A1 record the pull request does not touch');
  assert.deepEqual(ageVerdict(entries, young, now, { exceptions, changed: new Set([record]) }), [],
    'a young security fix with A1\'s recorded approval added in this pull request is admitted (§4.8)');
  // A1-257-3, Q0-257-4: a file that merely exists, or one the pull request touches that is not an A1
  // record, is not "A1's recorded approval in that pull request".
  const readme = [{ package: 'c@3.0.0', a1_record: 'README.md' }];
  fails(ageVerdict(entries, young, now, { exceptions: readme, changed: new Set(['README.md']) }), /"README\.md", which is not an A1 record evidence\/<package>\/a1-\*\.md/,
    "Q0's M19: README.md named as the record, even when the pull request changes it");
  for (const path of ['evidence/WP-X/q0-review.md', 'evidence/a1-x.md', 'evidence/WP-X/sub/a1-x.md', 'evidence/WP-X/a1-x.txt']) {
    fails(ageVerdict(entries, young, now, { exceptions: [{ package: 'c@3.0.0', a1_record: path }], changed: new Set([path]) }), /is not an A1 record/, `the path ${path}`);
  }
  fails(ageVerdict(entries, young, now, { days: 7, exceptions: [{ package: 'b@2.1.0', a1_record: record }], changed: new Set([record]) }), /c@3\.0\.0 was published/,
    'an exception names one version and admits no other');
});

// The workflow's jobs and steps, read by indentation: a job is a two-space key under `jobs:`, a step a
// six-space `- ` item in it. Comments are dropped first, so a step quoted in a comment is not a step.
function workflowJobs(ci) {
  const lines = ci.split('\n').filter((line) => !/^\s*#/.test(line));
  const jobs = new Map();
  let job = null;
  let step = null;
  let inJobs = false;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
    if (!inJobs) continue;
    const key = line.match(/^ {2}([A-Za-z][\w-]*):\s*$/);
    if (key) { job = { name: key[1], head: [], steps: [] }; jobs.set(key[1], job); step = null; continue; }
    if (!job) continue;
    if (/^ {6}- /.test(line)) { step = { text: [line.slice(8)] }; job.steps.push(step); continue; }
    if (step && (/^ {8}/.test(line) || line.trim() === '')) { step.text.push(line.slice(8)); continue; }
    step = null;
    job.head.push(line);
  }
  for (const each of jobs.values()) {
    for (const s of each.steps) {
      const text = s.text.join('\n');
      s.name = text.match(/^name: (.+)$/m)?.[1] ?? null;
      s.uses = text.match(/^(?:- )?uses: (.+)$/m)?.[1] ?? null;
      const block = text.match(/^run: \|\n((?: {2}.*\n?|\n)*)/m);
      s.run = block ? block[1].split('\n').map((l) => l.slice(2)).join('\n').trim() : (text.match(/^run: (.+)$/m)?.[1] ?? null);
      s.raw = text;
    }
  }
  return jobs;
}

// R0-257-1. Before any step that runs `npm run check` -- the pull request's own `scripts.check` -- the
// workflow must have invoked the test-integrity guard itself, which refuses a neutered check string
// (RFC-2026-007). Returns the problems, so the same reading is run on the workflow and on a mutation.
function guardBeforeCheck(steps) {
  const guard = steps.findIndex((s) => s.run === 'node scripts/verify-test-coverage-floor.mjs');
  const check = steps.findIndex((s) => /(^|\n|&&\s*|;\s*)npm run check\b/.test(s.run ?? ''));
  if (check === -1) return ['no step runs npm run check'];
  if (guard === -1 || guard > check) return [`step "${steps[check].name}" runs npm run check before the workflow has run the test-integrity guard`];
  const early = steps.slice(0, guard).filter((s) => /\b(npm run|npm test|node scripts\/|make )/.test(s.run ?? ''));
  return early.map((s) => `step "${s.name}" runs repository code before the test-integrity guard`);
}

test('the test-integrity guard runs before the first npm run check, and refuses there the check string that would empty it (R0-257-1)', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const bootstrap = workflowJobs(ci).get('bootstrap');
  assert.ok(bootstrap && bootstrap.steps.length > 10, 'the bootstrap job is read');
  assert.deepEqual(guardBeforeCheck(bootstrap.steps), [], 'the guard precedes every npm run check in the bootstrap job');
  const names = bootstrap.steps.map((s) => s.name);
  const order = ['Print the review tier and lane (informational, gates nothing)', 'Verify test-integrity guard before the first npm run check',
    'Validate repository bootstrap with no node_modules', 'Clean install', 'Verify test-integrity guard', 'Validate repository bootstrap'];
  assert.deepEqual(order.map((name) => names.indexOf(name)).every((at, i, all) => at >= 0 && (i === 0 || at === all[i - 1] + 1)), true,
    `the bootstrap job runs ${order.join(' -> ')} back to back (found ${names.join(' | ')})`);
  const bare = bootstrap.steps.find((s) => s.name === 'Validate repository bootstrap with no node_modules');
  assert.match(bare.run, /if \[ -e node_modules \]; then[\s\S]*exit 1[\s\S]*npm run check/, 'the check runs before any install and refuses a node_modules already present (§8/6)');

  // The negative control: the order of PR #257's first head (no early guard), and the guard moved after
  // the check, are both refused by the same reading.
  const withoutGuard = ci.replace('      - name: Verify test-integrity guard before the first npm run check\n        run: node scripts/verify-test-coverage-floor.mjs\n', '');
  assert.notEqual(withoutGuard, ci);
  assert.match(guardBeforeCheck(workflowJobs(withoutGuard).get('bootstrap').steps).join(), /runs npm run check before the workflow has run the test-integrity guard/, 'no early guard');
  const late = ci.replace(/(      - name: Verify test-integrity guard before the first npm run check\n        run: node scripts\/verify-test-coverage-floor\.mjs\n)(      - name: Validate repository bootstrap with no node_modules\n        run: \|\n(?: {10}.*\n)+)/, '$2$1');
  assert.notEqual(late, ci);
  assert.match(guardBeforeCheck(workflowJobs(late).get('bootstrap').steps).join(), /before the workflow has run the test-integrity guard/, 'the guard moved after the check');

  // And what the guard does when it runs first: R0's `scripts.check` that empties the guard file is
  // refused with exit 81 before it can run.
  const neutered = { ...JSON.parse(await readFile('package.json', 'utf8')).scripts, check: "node -e \"require('fs').writeFileSync('scripts/verify-test-coverage-floor.mjs','')\"" };
  assert.throws(() => assertPackageScripts(neutered), (error) => error instanceof CoverageFloorError && error.code === 81, "R0's check string is refused by the guard");
});

test('CI runs the application checks in a job of their own, after every guard of the bootstrap job (A1-257-4)', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const jobs = workflowJobs(ci);
  assert.deepEqual([...jobs.keys()], ['bootstrap', 'application'], 'two jobs, the bootstrap job first');
  const app = jobs.get('application');
  const head = app.head.join('\n');
  assert.match(head, /^ {4}needs: bootstrap$/m, 'the application job starts only after the bootstrap job has run its guards');
  assert.match(head, /^ {4}runs-on: ubuntu-24\.04$/m);
  assert.match(head, /^ {4}env:\n {6}NEXT_TELEMETRY_DISABLED: '1'$/m, 'Next.js telemetry is off for the whole job (§4.7)');
  assert.doesNotMatch(head, /^ {4}if:/m, 'the job carries no condition: it runs on every pull request and push');
  const expected = [
    [null, /^actions\/checkout@11d5960a326750d5838078e36cf38b85af677262$/],
    ['Verify the checkout is the commit this application run reports on', null],
    [null, /^actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020$/],
    ['Verify pinned toolchain for the application', null],
    ['Clean install for the application', 'npm ci --ignore-scripts'],
    ['Verify the application dependencies', 'node scripts/verify-app-dependencies.mjs'],
    ['Verify the application boundaries (parsed)', 'node scripts/verify-app-boundaries.mjs --require-parser'],
    ['Type-check the application', 'npm run typecheck'],
    ['Type-check negative control', 'node scripts/verify-typecheck-control.mjs'],
    ['Application tests', 'npm run test:app'],
    ['Build the web application', 'npm run build --workspace apps/web'],
    ['Verify what the build included', 'node scripts/verify-app-build-graph.mjs'],
    ['Vulnerability audit (network)', 'npm audit --omit=dev --audit-level=high'],
    ['Release age of new lockfile entries (network)', 'node scripts/verify-release-age.mjs "$BASE_SHA"'],
  ];
  assert.equal(app.steps.length, expected.length, `the application job has exactly its ${expected.length} steps (found ${app.steps.map((s) => s.name ?? s.uses).join(' | ')})`);
  expected.forEach(([name, run], i) => {
    const step = app.steps[i];
    if (name === null) assert.match(step.uses ?? '', run, `step ${i + 1} uses ${run}`);
    else {
      assert.equal(step.name, name, `step ${i + 1} is "${name}"`);
      if (run) assert.equal(step.run, run, `"${name}" runs \`${run}\``);
    }
  });
  assert.match(app.steps[0].raw, /ref: \$\{\{ github\.head_ref \}\}[\s\S]*persist-credentials: false[\s\S]*fetch-depth: 0/, 'the same checkout as the bootstrap job, with the base in the clone');
  assert.match(app.steps[1].run, /EXPECTED_SHA|cannot report on a commit it did not test/);
  assert.match(app.steps[1].raw, /EXPECTED_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(app.steps.at(-1).raw, /if: github\.event_name == 'pull_request'[\s\S]*BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/, 'the release age is measured against the pull request\'s base');

  // Nothing that runs an installed package is left in the bootstrap job, where the RLS guards run.
  const bootstrap = jobs.get('bootstrap').steps.map((s) => s.run ?? '').join('\n');
  for (const command of ['npm run typecheck', 'npm run test:app', 'vitest', 'next build', 'npm run build', 'npm audit', 'verify-release-age', 'verify-typecheck-control', 'verify-app-boundaries', 'tsc']) {
    assert.ok(!bootstrap.includes(command), `the bootstrap job does not run ${command}`);
  }
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  for (const appCommand of ['typecheck', 'test:app', 'tsc', 'vitest', 'next']) {
    assert.ok(!pkg.scripts.check.includes(appCommand), `npm run check does not run ${appCommand}; the application checks are their own CI steps (§2.1/4)`);
  }
});

test('CI installs only with npm ci --ignore-scripts, once per job, and no step may fail without failing the run (Q0-257-5)', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const installs = (text) => [...workflowJobs(text).values()].map((job) => [job.name,
    job.steps.flatMap((s) => (s.run ?? '').split('\n')).filter((line) => /\bnpm (?:ci|install|i|add|update|rebuild)\b|\bnpx\b|\byarn\b|\bpnpm\b/.test(line)).map((line) => line.trim())]);
  assert.deepEqual(installs(ci), [['bootstrap', ['npm ci --ignore-scripts --no-bin-links']], ['application', ['npm ci --ignore-scripts']]],
    'one npm ci --ignore-scripts in each job, and no other install; the bootstrap job links no package bin (A1-257-6)');
  // A1-257-6's negative control: the bootstrap install without --no-bin-links, as it stood at 82a1741f, is seen.
  const linked = ci.replace('      - name: Clean install\n        run: npm ci --ignore-scripts --no-bin-links\n', '      - name: Clean install\n        run: npm ci --ignore-scripts\n');
  assert.notEqual(linked, ci);
  assert.deepEqual(installs(linked)[0], ['bootstrap', ['npm ci --ignore-scripts']], 'a bootstrap install that links bins is seen');
  assert.notDeepEqual(installs(linked), installs(ci));
  const code = ci.split('\n').filter((line) => !/^\s*#/.test(line)).join('\n');
  assert.doesNotMatch(code, /continue-on-error/, 'no step or job is continue-on-error');
  // The negative controls: Q0's M40 (a second, plain npm ci) and M45 (continue-on-error on the release age).
  const plain = ci.replace('      - name: Verify the application dependencies\n', '      - name: Reinstall\n        run: npm ci\n      - name: Verify the application dependencies\n');
  assert.deepEqual(installs(plain)[1], ['application', ['npm ci --ignore-scripts', 'npm ci']], 'a second, plain npm ci is seen');
  const soft = ci.replace("      - name: Release age of new lockfile entries (network)\n        if: github.event_name == 'pull_request'\n",
    "      - name: Release age of new lockfile entries (network)\n        if: github.event_name == 'pull_request'\n        continue-on-error: true\n");
  assert.notEqual(soft, ci);
  assert.match(soft.split('\n').filter((line) => !/^\s*#/.test(line)).join('\n'), /continue-on-error/, 'a continue-on-error is seen');
});

test('vitest runs the application tests and fails when there are none (Q0 N1)', async () => {
  const config = await readFile('vitest.config.ts', 'utf8');
  assert.match(config, /^ {4}passWithNoTests: false,$/m, 'a deleted test file must fail `npm run test:app`, not pass it');
  assert.doesNotMatch(config, /passWithNoTests: true/);
  assert.match(config, /include: \['apps\/\*\*\/\*\.test\.ts', 'apps\/\*\*\/\*\.test\.tsx', 'src\/\*\*\/\*\.test\.ts', 'src\/\*\*\/\*\.test\.tsx'\]/, 'the application\'s tests, and only those');
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
  // ONE exception, pinned here by name and by what it imports: the boundary guard's parsed reader, which
  // CI runs in the application job (--require-parser) and which no test reaches (the suite's import
  // closure refuses a package, ALLOWED_DEPENDENCIES = []). It stands where §2.1/4's lint step stands
  // while ESLint is deferred (C0-257-1, A1-257-1).
  // The exception is RFC-2026-029's own since its Amendment 2026-10-12 (the Owner's answer of 07:24:27Z):
  // §3.2's typescript cell, as the allowlist copy reads it, admits this one file and no other.
  const PARSER = 'scripts/app-boundaries-parser.mjs';
  const PARSER_IMPORTS = ['typescript', 'typescript/unstable/ast', 'typescript/unstable/sync'];
  const allowlist = JSON.parse(await readFile('scripts/app-dependency-allowlist.json', 'utf8'));
  assert.deepEqual(allowlist.development.find((row) => row.name === 'typescript').imports, [PARSER], 'the file pinned here is the one §3.2 admits');
  const bare = [];
  const parserImports = [];
  const importers = [];
  for (const file of files) {
    for (const { specifier } of extractImports(await readFile(file, 'utf8')).imports) {
      if (specifier.endsWith('/app-boundaries-parser.mjs') || specifier.endsWith('/verify-app-boundaries.mjs')) importers.push(`${file} imports ${specifier}`);
      if (specifier.startsWith('node:') || specifier.startsWith('./') || specifier.startsWith('../')) continue;
      if (file === PARSER) parserImports.push(specifier); else bare.push(`${file} imports ${specifier}`);
    }
  }
  assert.deepEqual(bare, [], 'a tooling module importing a package would need node_modules to run');
  assert.deepEqual(parserImports.sort(), PARSER_IMPORTS, `${PARSER} imports typescript's parser API and nothing else`);
  assert.deepEqual(importers, ['scripts/verify-app-boundaries.mjs imports ./app-boundaries-parser.mjs'],
    'only the CLI loads the parsed reader, and no module imports the CLI: no test reaches either');
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  assert.match(cli, /await import\('\.\/app-boundaries-parser\.mjs'\)/, 'the CLI loads it dynamically, so it runs without node_modules');
  assert.match(cli, /process\.argv\.includes\('--require-parser'\)/, 'and fails when CI requires it and it cannot load');
});

// Q0-257r2-2: the parsed reader's own safeguards, read from the two files' text (no test may import
// either: the parser imports `typescript`, and the CLI loads the parser). Each problem names a safeguard
// that is gone; the test below shows the real files have none, and that each of Q0's mutations is seen.
function parsedReaderSafeguards(cli, parser) {
  const problems = [];
  // The negative controls run, and a failed one ends the run with exit 1, before the parsed reader is
  // handed the repository (M71: `const failures = [];`).
  if (!/^ {4}parser = parserModule\.createParser\(\);\n {4}const failures = runControls\(parser, allowlist\);\n {4}if \(failures\.length > 0\) \{\n(?: {6}.*\n){1,6}? {6}process\.exit\(1\);\n {4}\}\n {4}extract = parsedExtract\(parser, files\);\n/m.test(cli)) {
    problems.push('the CLI does not run runControls on the parser it created, and exit 1 on a failure, before it reads the repository through that parser');
  }
  if (!/^export function runControls\(parser, allowlist\) \{\n {2}const failures = \[\];\n[\s\S]*?\n {2}for \(const \[name, overrides, pattern\] of CONTROLS\) \{[\s\S]*?\n {2}for \(const \[name, overrides, pattern\] of ALIAS_CONTROLS\) \{[\s\S]*?\n {2}return failures;\n\}\n/m.test(cli)) {
    problems.push('runControls does not hold every control and return its failures');
  }
  const controlsAt = cli.indexOf('const failures = runControls(parser, allowlist);');
  if (controlsAt === -1 || controlsAt > cli.indexOf('= await collectRepositoryCode(\'.\');') || controlsAt > cli.indexOf('= await collectResolutionConfigs(\'.\');')) {
    problems.push('the controls run after the repository is read');
  }
  // The parser refuses any typescript but the version the root package.json pins, before it starts the
  // compiler (M69: `if (false) {`).
  if (!/^const PINNED = JSON\.parse\(readFileSync\(new URL\('\.\.\/package\.json', import\.meta\.url\), 'utf8'\)\)\.devDependencies\?\.typescript;$/m.test(parser)) {
    problems.push('the parser does not read its pinned typescript version from the root package.json');
  }
  if (!/^export function createParser\(\) \{\n {2}if \(typeof typescript\.version !== 'string' \|\| typescript\.version !== PINNED\) \{\n {4}throw new Error\(/m.test(parser)) {
    problems.push('createParser does not refuse, first, a typescript version other than the pinned one');
  }
  if (parser.indexOf('throw new Error(`the parsed boundary reader is measured on typescript') > parser.indexOf('new API(')) {
    problems.push('the compiler is started before the version is checked');
  }
  return problems;
}

test("Q0-257r2-2: the parsed reader's own safeguards hold: its negative controls run first, and it refuses an unpinned typescript", async () => {
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  const parser = await readFile('scripts/app-boundaries-parser.mjs', 'utf8');
  assert.deepEqual(parsedReaderSafeguards(cli, parser), []);
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  assert.match(pkg.devDependencies.typescript, /^\d+\.\d+\.\d+$/, 'the pin the parser reads is one exact version');
  assert.equal(lock.packages['node_modules/typescript'].version, pkg.devDependencies.typescript, 'and it is the version the lockfile installs');
  // The negative controls: Q0's M71 and M69, and the controls moved after the repository read.
  const swap = (text, from, to) => { assert.ok(text.includes(from), from); return text.replace(from, to); };
  const m71 = swap(cli, '    const failures = runControls(parser, allowlist);', '    const failures = [];');
  assert.match(parsedReaderSafeguards(m71, parser).join(), /does not run runControls/, "Q0's M71: the controls skipped");
  const hollow = swap(cli, '  return failures;\n}\n\nasync function loadParserModule', '  return [];\n}\n\nasync function loadParserModule');
  assert.match(parsedReaderSafeguards(hollow, parser).join(), /runControls does not hold every control/, 'runControls returning nothing');
  const noExit = swap(cli, "      for (const failure of failures) console.error(`  ${failure}`);\n      process.exit(1);\n", "      for (const failure of failures) console.error(`  ${failure}`);\n");
  assert.match(parsedReaderSafeguards(noExit, parser).join(), /does not run runControls/, 'a failed control that does not end the run');
  const late = swap(swap(cli, '  const repository = await collectRepositoryCode(\'.\');\n', ''), '  const files = await collectSources(\'.\');\n', '  const files = await collectSources(\'.\');\n  const repository = await collectRepositoryCode(\'.\');\n');
  assert.match(parsedReaderSafeguards(late, parser).join(), /the controls run after the repository is read/, 'the controls moved after the repository read');
  const m69 = swap(parser, "  if (typeof typescript.version !== 'string' || typescript.version !== PINNED) {", '  if (false) {');
  assert.match(parsedReaderSafeguards(cli, m69).join(), /createParser does not refuse, first, a typescript version/, "Q0's M69: the version check removed");
  const unpinned = swap(parser, '.devDependencies?.typescript;', ".devDependencies?.typescript ?? '*';");
  assert.match(parsedReaderSafeguards(cli, unpinned).join(), /does not read its pinned typescript version/, 'a fallback pin');
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

test('A1-257-7: after the build, what it included is held to §6.3, and the check\'s controls hold before it reads the build', async () => {
  const allowlist = await loadAllowlist();
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const reachable = reachablePackages(lock, allowlist);
  for (const name of ['next', 'react', 'react-dom', '@swc/helpers', 'styled-jsx', 'postcss', 'tailwindcss', 'sharp']) assert.ok(reachable.has(name), `${name} is reachable from an allowlisted package`);
  for (const name of ['pg', 'typescript', 'left-pad']) assert.ok(!reachable.has(name), `${name} is not: pg by §6.3/5, typescript by its cell (the parser only)`);
  assert.deepEqual(runBuildControls(reachable), [], 'every control is refused, and the clean build passes');
  const verdict = (overrides) => checkBuildGraph(new Map(Object.entries({ ...CLEAN_BUILD, ...overrides })), { reachable }).problems;
  assert.deepEqual(verdict({}), []);
  // A1-257-7's three routes, as their builds on this branch showed them: the page's SSR chunk map names db/probe-a1/target.ts.
  for (const [name, overrides] of BUILD_CONTROLS.slice(0, 3)) {
    assert.match(name, /^A1-257-7 route [123] \(built\)/);
    assert.match(verdict(overrides).join(' | '), /^db\/probe-a1\/target\.ts is a repository file outside apps\/web\/\*\* and src\/modules\/\*\* \(RFC-2026-029 §6\.3\); the build included it \(server\/chunks\/ssr\//, name);
  }
  assert.equal(BUILD_CONTROLS.length, 11);
  // Each form a build writes a module in is read and placed.
  const { included, unplaced } = readBuildGraph(new Map(Object.entries({
    'server/app/page.js.nft.json': JSON.stringify({ version: 1, files: ['../../../../../node_modules/next/package.json'] }),
    'server/chunks/ssr/a.js.map': JSON.stringify({ version: 3, sections: [{ map: { sourceRoot: 'src', sources: ['../../../../../../../apps/web/app/%5Bslug%5D/page.tsx?x=1'] } }] }),
    'build/chunks/b.js.map': JSON.stringify({ version: 3, sources: ['turbopack:///[project]/apps/web/postcss.config.mjs', 'turbopack:///[turbopack-node]/x.ts', 'turbopack:///[other]/y.ts'] }),
    'server/app/page_client-reference-manifest.js': '{"[project]/apps/web/components/b.tsx":{}} "[project]/src/modules/k/index.ts [app-ssr] (ecmascript)"',
  })));
  assert.deepEqual(included.map((i) => i.path).sort(), ['apps/web/app/[slug]/page.tsx', 'apps/web/components/b.tsx', 'apps/web/postcss.config.mjs', 'node_modules/next/package.json', 'src/modules/k/index.ts']);
  assert.deepEqual(unplaced, ['build/chunks/b.js.map names turbopack:///[other]/y.ts, a Turbopack source the check cannot place']);
  assert.equal(judgeIncluded('src/modules/identity-workspace/adapters/store.ts', reachable), null, 'another module\'s adapters, which a composition root may import');
  assert.match(judgeIncluded('src/modules/platform-kernel/adapters/job-store.ts', reachable), /§6\.3\/5/);
  assert.match(judgeIncluded('apps/worker/composition/jobs.ts', reachable), /outside apps\/web\/\*\* and src\/modules\/\*\*/);
  assert.match(judgeIncluded('package.json', reachable), /outside apps\/web/, 'not even the root package.json');
  assert.match(judgeIncluded('db/node_modules/zod/index.js', reachable), /outside apps\/web/, 'a node_modules directory the install did not make is a repository file');
  assert.match(judgeIncluded('node_modules/next/node_modules/pg/lib/index.js', reachable), /is pg/, 'a nested copy is judged by its own name');
  assert.match(checkBuildGraph(new Map(), { reachable }).problems.join(), /a build this check cannot see into is not a pass/, 'an empty build fails');
  assert.match(checkBuildGraph(new Map(Object.entries({ 'server/app/page.js.nft.json': JSON.stringify({ version: 1, files: [] }), 'server/x.js.map': JSON.stringify({ sources: [] }) })), { reachable }).problems.join(),
    /0 module\(s\) under apps\/web\/app\//, 'a build that shows no application module fails');
  // The collector reads the build's text files, and not its cache or generated types.
  const root = await mkdtemp(join(tmpdir(), 'app-build-graph-'));
  try {
    for (const [path, text] of Object.entries({ 'server/app/page.js.nft.json': '{}', 'server/chunks/ssr/a.js.map': '{}', 'static/chunks/c.js': 'x', 'cache/x.json': '{}', 'types/routes.d.ts': 'x', 'server/app/index.html': 'x' })) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), text);
    }
    assert.deepEqual([...(await collectBuild(root)).keys()].sort(), ['server/app/page.js.nft.json', 'server/chunks/ssr/a.js.map', 'static/chunks/c.js']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  // The CLI runs the controls, and exits on a failure, before it reads the build.
  const cli = await readFile('scripts/verify-app-build-graph.mjs', 'utf8');
  const controlsAt = cli.indexOf('const failures = runBuildControls(reachable);');
  assert.ok(controlsAt > 0 && controlsAt < cli.indexOf('build = await collectBuild(directory);'), 'the controls run first');
  assert.match(cli, /if \(failures\.length > 0\) \{\n(?: {4}.*\n){1,3} {4}process\.exit\(1\);\n {2}\}/, 'and a failed control ends the run');
  assert.doesNotMatch(cli, /^import .* from '(?!node:|\.\/)/m, 'the check imports no package: it runs on what the build wrote, not on what it installed');
});
