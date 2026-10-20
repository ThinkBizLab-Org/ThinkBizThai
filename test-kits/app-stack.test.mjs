import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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
import { ALLOWLIST_PATH, loadAllowlist } from '../scripts/verify-app-dependencies.mjs';
import { checkResolutionConfigs, readConfigShape } from '../scripts/app-boundaries.mjs';

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
// WP-1A-A0-006: a job's `services:` block, written plainly as a four-space key with every line under it
// indented deeper, is read apart from the job's head into `services`, from ci.yml's RAW lines; the
// application job's is held to APPLICATION_SERVICES byte for byte (servicesProblems). Any other spelling
// of the key stays in the head, where the key allowlist refuses it. A1-305-1: inside the block, a blank
// line and a `#`-led line are NOT left out. In a block scalar (`options: >-`) YAML reads both as content
// (a `#`-led line after a blank one becomes text docker splits into flags), so each is kept in `services`
// and the block no longer equals the pin. Blank and `#`-led lines are held pending and kept only when a
// further line of the block follows them; those after the block's last line (`- 5432:5432`, a plain
// scalar the pin puts last, so no block scalar is open there) are ci.yml's comments and stay free.
function workflowJobs(ci) {
  const lines = ci.split('\n');
  const jobs = new Map();
  let job = null;
  let step = null;
  let inJobs = false;
  let pending = [];
  for (const line of lines) {
    const loose = line.trim() === '' || /^\s*#/.test(line);
    if (job?.inServices) {
      if (loose) { pending.push(line); continue; }
      if (/^ {6}/.test(line)) { job.services.push(...pending, line); pending = []; continue; }
      job.inServices = false;
    }
    pending = [];
    if (/^\s*#/.test(line)) continue;
    if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
    if (!inJobs) continue;
    const key = line.match(/^ {2}([A-Za-z][\w-]*):\s*$/);
    if (key) { job = { name: key[1], head: [], steps: [] }; jobs.set(key[1], job); step = null; continue; }
    if (!job) continue;
    if (/^ {6}- /.test(line)) { step = { text: [line.slice(8)] }; job.steps.push(step); continue; }
    if (step && (/^ {8}/.test(line) || line.trim() === '')) { step.text.push(line.slice(8)); continue; }
    step = null;
    if (/^ {4}services:\s*$/.test(line)) { job.services = [...(job.services ?? []), line]; job.inServices = true; continue; }
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

// A1-AUD1015-1. The vulnerability audit and the release age are the checks that would report a
// compromised or freshly published package, so they must run after the job's install and before any
// step that executes installed package code: such code could prepend a shim to $GITHUB_PATH or edit the
// checkout first. A step executes package code when it runs tsc, vitest or next, `npm run typecheck`,
// `npm run test:app` or `npm run build`, the type-check control (which runs tsc) or the parsed boundary
// guard (which loads typescript). Returns the problems, so the same reading is run on a mutation.
const PACKAGE_CODE = /\b(?:tsc|vitest|next)\b|\bnpm run (?:typecheck|test:app|build)\b|verify-typecheck-control|--require-parser/;
function dependencyChecksBeforePackageCode(steps) {
  const at = (matches) => steps.findIndex((s) => matches(s.run ?? ''));
  const install = at((run) => /^npm ci --ignore-scripts\b/m.test(run));
  const firstCode = at((run) => PACKAGE_CODE.test(run));
  const problems = [];
  for (const [label, pattern] of [['npm audit', /\bnpm audit\b/], ['verify-release-age', /verify-release-age\.mjs/]]) {
    const index = at((run) => pattern.test(run));
    if (index === -1) problems.push(`no step runs ${label}`);
    else if (install === -1 || index < install) problems.push(`${label} runs before the install`);
    else if (firstCode !== -1 && index > firstCode) problems.push(`${label} runs after step "${steps[firstCode].name}", which executes installed package code`);
  }
  if (firstCode === -1) problems.push('no step executes installed package code: the reading found nothing to order against');
  return problems;
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
    ['Vulnerability audit (network)', 'npm audit --include=dev --audit-level=high'],
    ['Release age of new lockfile entries (network)', 'node scripts/verify-release-age.mjs "$BASE_SHA"'],
    ['Verify the application dependencies', 'node scripts/verify-app-dependencies.mjs'],
    ['Verify the application boundaries (parsed)', 'node scripts/verify-app-boundaries.mjs --require-parser'],
    ['Type-check the application', 'npm run typecheck'],
    ['Type-check negative control', 'node scripts/verify-typecheck-control.mjs'],
    ['Database for the application tests', null],
    ['Application tests', 'npm run test:app'],
    ['Verify the application boundaries again, before the build (parsed)', 'node scripts/verify-app-boundaries.mjs --require-parser'],
    ['Build the web application', 'npm run build --workspace apps/web'],
    ['Verify what the build included', 'node scripts/verify-app-build-graph.mjs'],
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
  assert.match(app.steps.find((s) => s.name === 'Release age of new lockfile entries (network)').raw, /if: github\.event_name == 'pull_request'[\s\S]*BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/, 'the release age is measured against the pull request\'s base');
  // WP-1A-A0-006: one Postgres service, the bootstrap job's exactly; the migrations applied to it as the
  // bootstrap job applies them, before the tests; the tests given its URL (no password in it).
  assert.deepEqual(app.services, APPLICATION_SERVICES, 'the application job starts the pinned postgres:17 container and nothing else');
  assert.deepEqual(jobs.get('bootstrap').services, APPLICATION_SERVICES, 'the same container as the bootstrap job, written exactly as it is there');
  const DB_ENV = /env:\n {2}PGPASSWORD: postgres\n {2}DB_TEST_URL: postgresql:\/\/postgres@localhost:5432\/thinkbizthai_test\n/;
  const database = app.steps.find((s) => s.name === 'Database for the application tests');
  assert.equal(database.run, 'psql "$DB_TEST_URL" -v ON_ERROR_STOP=1 -q -f db/foundation/ci/supabase-shim.sql\nLC_ALL=C TZ=UTC make db-migrate-clean', 'the shim, then the migrations, as the bootstrap job applies them');
  assert.match(database.raw, DB_ENV);
  assert.match(app.steps.find((s) => s.name === 'Application tests').raw, DB_ENV, 'the tests reach the container');
  assert.ok(!PACKAGE_CODE.test(database.run), 'the database step runs no installed package code');

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

test('CI runs npm audit and the release age straight after the install, before any step that executes package code (A1-AUD1015-1)', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  assert.deepEqual(dependencyChecksBeforePackageCode(workflowJobs(ci).get('application').steps), [], 'the application job checks its dependencies before it runs them');
  // The negative controls. The order as it stood at 2aef8182 (both checks last, after tsc, vitest and
  // next build) is refused for both checks; each check moved alone behind `npm run typecheck` is refused.
  const AUDIT = '      - name: Vulnerability audit (network)\n        run: npm audit --include=dev --audit-level=high\n';
  const AGE = "      - name: Release age of new lockfile entries (network)\n        if: github.event_name == 'pull_request'\n        env:\n          BASE_SHA: ${{ github.event.pull_request.base.sha }}\n        run: node scripts/verify-release-age.mjs \"$BASE_SHA\"\n";
  assert.ok(ci.includes(AUDIT) && ci.includes(AGE), 'the two steps read as written');
  const last = `${ci.replace(AUDIT, '').replace(AGE, '').trimEnd()}\n${AUDIT}${AGE}`;
  assert.deepEqual(dependencyChecksBeforePackageCode(workflowJobs(last).get('application').steps), [
    'npm audit runs after step "Verify the application boundaries (parsed)", which executes installed package code',
    'verify-release-age runs after step "Verify the application boundaries (parsed)", which executes installed package code',
  ], 'the order before A1-AUD1015-1 is refused');
  const TYPECHECK = '      - name: Type-check the application\n        run: npm run typecheck\n';
  for (const [label, step] of [['npm audit', AUDIT], ['verify-release-age', AGE]]) {
    const moved = ci.replace(step, '').replace(TYPECHECK, TYPECHECK + step);
    assert.notEqual(moved, ci);
    assert.match(dependencyChecksBeforePackageCode(workflowJobs(moved).get('application').steps).join('\n'), new RegExp(`^${label} runs after step`), `${label} behind npm run typecheck is refused`);
  }
  // Each kind of package-code step is recognised, so the rule cannot be met by renaming the first one.
  for (const run of ['npm run typecheck', 'npm run test:app', 'npm run build --workspace apps/web', 'npx tsc -p .', 'vitest run', 'next build', 'node scripts/verify-typecheck-control.mjs', 'node scripts/verify-app-boundaries.mjs --require-parser']) {
    assert.ok(PACKAGE_CODE.test(run), `\`${run}\` executes package code`);
  }
  for (const run of ['npm ci --ignore-scripts', 'node scripts/verify-app-dependencies.mjs', 'npm audit --include=dev --audit-level=high', 'node scripts/verify-release-age.mjs "$BASE_SHA"', 'node scripts/verify-app-build-graph.mjs']) {
    assert.ok(!PACKAGE_CODE.test(run), `\`${run}\` does not`);
  }
});

// A1-270-1. The audit must screen the dev dependencies too: typescript, vitest and the Tailwind/PostCSS
// toolchain are devDependencies, and they are the package code the application job runs first. Each
// `npm audit` line must name --include=dev, which npm applies whatever an `omit` config or
// NODE_ENV=production says (a plain `npm audit` drops the dev tree under NODE_ENV=production), and none
// may name --omit, --production or --only in any form. Returns the problems.
// A1-279-2. The audit's command line is pinned, but npm also reads its configuration from the
// environment: an `npm_config_workspace` narrows the audit to one workspace, an `npm_config_registry`
// points it at another server. So the audit step carries no `env:` at all, and no key of the application
// job, at the job or any step, names an `npm_config_*` variable in any letter case. Returns the problems.
function auditEnvProblems(job) {
  const problems = job.steps.filter((s) => /\bnpm audit\b/.test(s.run ?? '') && keyLines(s.raw).some((line) => /^\s*["']?env["']?\s*:/.test(line)))
    .map((s) => `step "${s.name}" runs npm audit with an env: of its own`);
  const lines = [...job.head, ...job.steps.flatMap((s) => keyLines(s.raw))];
  for (const line of lines.filter((l) => /(?:^|[{,]|-\s|\?\s)\s*["']?npm_config_/i.test(l))) problems.push(`the application job sets \`${line.trim()}\``);
  return problems;
}
// A1-279r2-2. A workflow-level `env:` (or one on any job) applies the same way, so no key line anywhere
// in ci.yml, outside comments and `run: |` bodies, names an npm_config_* variable. Returns the problems.
// A1-279r3-2. The workflow level, as a class: every top-level line is one of `name:`, `on:`,
// `permissions:` or `jobs:`, written plainly. A workflow env: or defaults:, in any spelling (escaped,
// tagged, anchored, explicit, merged, commented), is refused because it is not one of those lines.
const TOP_LEVEL = /^(?:name|on|permissions|jobs):(?: [^#]*)?$/;
function workflowTopLevelProblems(ci) {
  return ci.split('\n').filter((line) => /^\S/.test(line) && !line.startsWith('#') && !TOP_LEVEL.test(line)).map((line) => `ci.yml has the top-level line \`${line}\``);
}
function workflowNpmConfigProblems(ci) {
  const lines = keyLines(ci.split('\n').filter((line) => !/^\s*#/.test(line)).join('\n'));
  return lines.filter((l) => /(?:^|[{[,]|-\s|\?\s)\s*["']?npm_config_/i.test(l)).map((l) => `ci.yml sets \`${l.trim()}\``);
}
// Q0-279r2-2 and A1-279-3 read the same text, applicationJobText: the lines of ci.yml from the line after
// `  application:` to the next two-space job key, as written, with exactly one kind of line left out: a
// `#`-led line OUTSIDE a block scalar, which YAML reads as a comment. Inside the body of a block scalar
// (`run: |`, `run: >`, with any chomping or indentation indicator, any line indented deeper than the line
// that opened it) a `#`-led line is content, shell text the step runs, and it is read (A1-287-1: a shell
// string can span such a line). A token is looked for anywhere on each line read, not in a spelling.
// What the text does not show, the YAML layer refuses rather than reads: a quoted scalar that spans
// lines, whose continuation lines YAML reads as content even when they begin with `#` (A1-287-1), and
// the forms that could spell a key without its letters (an escape, a tag, an anchor, an alias, a merge),
// both in yamlFormProblems; and every key the job may carry is on an allowlist (applicationKeyProblems).
function applicationJobText(ci) {
  const lines = ci.split('\n');
  const start = lines.findIndex((line) => /^ {2}application:\s*$/.test(line));
  if (start === -1) return ['(ci.yml has no application job: nothing to read, refused)'];
  const out = [];
  let block = null;
  for (const line of lines.slice(start + 1)) {
    const indent = line.match(/^ */)[0].length;
    if (block !== null) {
      if (line.trim() === '' || indent > block) { out.push(line); continue; }
      block = null;
    }
    if (/^\s*#/.test(line)) continue;
    if (/^ {2}[A-Za-z][\w-]*:\s*$/.test(line)) break;
    out.push(line);
    if (/:\s*[|>][-+0-9]*\s*$/.test(withoutComment(line))) block = indent;
  }
  return out;
}
// A1-287-2. The job's keys, and the environment it sets, reach the same effects without either token:
// `container:` hands every run: to another image's shell, `services:` starts more of them, an env
// BASH_ENV is sourced by bash before every run: (it can define `npm` as a no-op or prepend PATH), an env
// PATH or NODE_OPTIONS redirects what runs. Closed as a CLASS by allowlist: every key line of the
// application job, at the job level, in its env:, at a step's level and in a step's env: and with:, names
// a key main's ci.yml uses there today, and nothing else; a key line at any other depth, or a line the
// reading cannot place, is refused. The test pins each list to main's ci.yml exactly, so it cannot widen
// unseen. Returns the problems and the keys seen.
const APPLICATION_KEYS = Object.freeze({
  job: Object.freeze(['env', 'needs', 'runs-on', 'steps']),
  'job env': Object.freeze(['NEXT_TELEMETRY_DISABLED', 'NODE_OPTIONS']),
  step: Object.freeze(['env', 'if', 'name', 'run', 'uses', 'with']),
  'step env': Object.freeze(['BASE_SHA', 'DB_TEST_URL', 'EXPECTED_SHA', 'PGPASSWORD']),
  'step with': Object.freeze(['check-latest', 'fetch-depth', 'node-version', 'persist-credentials', 'ref']),
});
// WP-1A-A0-006 (the Product Owner's answer of 2026-10-20, header `Deps + CI`). A1-287-2 names `services:` as
// a key that starts more containers, so the job's one service is not a key on the allowlist but a block held
// line for line: the bootstrap job's postgres:17 container, written exactly as it is there. A second service,
// another image, an option, a volume, an entrypoint or a port added, removed or changed is refused.
const APPLICATION_SERVICES = Object.freeze([
  '    services:',
  '      postgres:',
  '        image: postgres:17',
  '        env:',
  '          POSTGRES_PASSWORD: postgres',
  '          POSTGRES_DB: thinkbizthai_test',
  '        options: >-',
  '          --health-cmd pg_isready',
  '          --health-interval 10s',
  '          --health-timeout 5s',
  '          --health-retries 5',
  '        ports:',
  '          - 5432:5432',
]);
function servicesProblems(job) {
  if (job.services === undefined) return [];
  if (JSON.stringify(job.services) === JSON.stringify(APPLICATION_SERVICES)) return [];
  const loose = job.services.filter((l) => l.trim() === '' || /^\s*#/.test(l));
  return [`the ${job.name} job's services: block is not the pinned postgres:17 container, byte for byte: \`${job.services.map((l) => JSON.stringify(l)).join(' | ')}\``,
    ...(loose.length ? [`the ${job.name} job's services: block holds ${loose.length} blank or \`#\`-led line(s) inside it, which YAML reads as content in a block scalar (A1-305-1)`] : [])];
}
// A1-305-I1 / C0-305-I1. The two step-env names the service brought (DB_TEST_URL, PGPASSWORD) are on the
// step env allowlist by key; this holds them by step and by value: they may appear only on the two steps
// that use them, and there only with the bootstrap job's values (the container's URL with no password,
// and its throwaway password), so no `${{ secrets.* }}` or other host can ride on either name.
const DB_ENV_STEPS = Object.freeze(['Database for the application tests', 'Application tests']);
const DB_ENV_VALUES = Object.freeze({ PGPASSWORD: 'PGPASSWORD: postgres', DB_TEST_URL: 'DB_TEST_URL: postgresql://postgres@localhost:5432/thinkbizthai_test' });
function dbEnvProblems(job) {
  const problems = [];
  job.steps.forEach((step, i) => {
    const where = `step "${step.name ?? step.uses ?? `step ${i + 1}`}"`;
    let under = null;
    for (const line of keyLines(step.raw).filter((l) => l.trim() !== '')) {
      const match = line.match(KEY_LINE);
      if (!match) continue;
      const indent = match[1].length;
      const key = unquoted(match[2]);
      if (indent === 0) { under = key; continue; }
      if (indent !== 2 || under !== 'env' || !Object.hasOwn(DB_ENV_VALUES, key)) continue;
      if (!DB_ENV_STEPS.includes(step.name)) problems.push(`${where} sets \`${key}\`, which only ${DB_ENV_STEPS.map((n) => `"${n}"`).join(' and ')} may set: \`${line.trim()}\``);
      else if (line.trim() !== DB_ENV_VALUES[key]) problems.push(`${where} sets \`${key}\` to another value than the bootstrap job's: \`${line.trim()}\``);
    }
  });
  return problems;
}
const KEY_LINE = /^( *)(?:-[ ]+)?("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s"'#:][^:#]*?)[ ]*:(?:[ ]|$)/;
const unquoted = (key) => (key.startsWith('"') ? key.slice(1, -1) : key.startsWith("'") ? key.slice(1, -1).replace(/''/g, "'") : key);
function applicationKeys(job) {
  const seen = Object.fromEntries(Object.keys(APPLICATION_KEYS).map((level) => [level, new Set()]));
  const problems = [];
  const place = (where, line, level) => {
    const key = unquoted(line.match(KEY_LINE)[2]);
    seen[level].add(key);
    if (!APPLICATION_KEYS[level].includes(key)) problems.push(`${where} has the ${level} key \`${key}\`, which the application job's allowlist does not hold: \`${line.trim()}\``);
    return key;
  };
  let parent = null;
  for (const line of job.head.filter((l) => l.trim() !== '')) {
    const indent = line.match(/^ */)[0].length;
    if (!KEY_LINE.test(line) || (indent !== 4 && indent !== 6)) { problems.push(`the application job has a line the key reading cannot place: \`${line.trim()}\``); continue; }
    if (indent === 4) parent = place('the application job', line, 'job');
    else if (parent === 'env') place('the application job', line, 'job env');
    else problems.push(`the application job has a key under \`${parent}\`, which holds none: \`${line.trim()}\``);
  }
  job.steps.forEach((step, i) => {
    const where = `step "${step.name ?? step.uses ?? `step ${i + 1}`}"`;
    let under = null;
    for (const line of keyLines(step.raw).filter((l) => l.trim() !== '')) {
      const indent = line.match(/^ */)[0].length;
      if (!KEY_LINE.test(line) || (indent !== 0 && indent !== 2)) { problems.push(`${where} has a line the key reading cannot place: \`${line.trim()}\``); continue; }
      if (indent === 0) under = place(where, line, 'step');
      else if (under === 'env' || under === 'with') place(where, line, `step ${under}`);
      else problems.push(`${where} has a key under \`${under}\`, which holds none: \`${line.trim()}\``);
    }
  });
  return { problems, seen };
}
// Q0-279r2-2. A step that writes a line to the file `$GITHUB_ENV` names sets that variable for every
// later step of the job (an `npm_config_workspace` that narrows the audit, a NODE_OPTIONS that preloads
// a module), and one that writes to `$GITHUB_PATH` puts a directory before every later `node`, `npm` and
// `git`. Neither shows as a YAML key, so the A1-279-2 pin, which reads keys, does not see them. Closed
// as a CLASS, not by listing spellings: no line applicationJobText reads names the token GITHUB_ENV or
// GITHUB_PATH in any letter case, however it is quoted, braced or redirected (`>>`, `tee -a`, `>|`, a
// `{ ... } >>` group, an env: key or a `${{ env.* }}` expression all name it); nor the runner's
// file-command directory `_runner_file_commands`, nor the retired `::set-env` and `::add-path` workflow
// commands or the ACTIONS_ALLOW_UNSECURE_COMMANDS switch that would revive them. With it, yamlFormProblems
// and the key allowlist (an env BASH_ENV or PATH is refused there).
// THE RESIDUAL, stated plainly: the reader sees the job's text and nothing it runs or evaluates. Not
// seen: a token assembled when the job runs, by the shell (`${!name}`, `"GITHUB_""ENV"`, eval, a decoded
// string, `env | grep`) or by the runner from a `${{ }}` expression (`${{ format('GITHUB_{0}', 'ENV') }}`
// becomes `GITHUB_ENV` before the shell runs, and no `${{ }}` is evaluated here); a glob that reaches the
// runner's file-command files without naming them; and a write made by a program a step runs (a
// repository script, an npm script, installed package code, or the pinned actions, of which
// actions/setup-node writes $GITHUB_PATH by design). Nor is a `run:` body line, read and passed, that
// writes a file later steps or tools read without naming either token (A1-287r2-1): npm's user or project
// configuration (`npm config set`, a write to `~/.npmrc`, including `node-options=`, which undoes the
// job's `NODE_OPTIONS: ''`), a project `.npmrc` created at run time, or an executable that shadows a
// command in a directory already on PATH; it reaches the same effects and is not refused. Those are held
// by the review of every ci.yml and script change, the step-list pin of A1-257-4, and the order of
// A1-AUD1015-1 (the audit and release age run before any step that executes package code). The bootstrap job is not read: a job's GITHUB_ENV and
// GITHUB_PATH reach only that job's later steps, never the application job. Returns the problems.
const RUNNER_ENV_WRITE = /GITHUB_ENV|GITHUB_PATH|_runner_file_commands|ACTIONS_ALLOW_UNSECURE_COMMANDS|::(?:set-env|add-path)\b/i;
// A1-305-2. Every reader here splits ci.yml on `\n` and drops `#`-led lines, but YAML also breaks a line
// on a lone `\r` (every version) and YAML 1.1 parsers on NEL U+0085, LS U+2028 and PS U+2029. So one
// line the reader takes for a comment (`    # note\r        volumes:\r          - ...`) can carry
// further YAML lines: a service volume, a step env (`DB_TEST_URL: ${{ secrets.* }}`), or a job key
// past A1-287-2's allowlist. Closed as a CLASS, on the raw text, before any reading: ci.yml holds no
// `\r` (a CRLF line end included), no U+0085, U+2028 or U+2029, no other C0 or C1 control character
// but `\n` and `\t`, no DEL and no U+FEFF byte-order mark anywhere. main's ci.yml holds none of them, so
// nothing legitimate is lost. Returns one problem per character kind found.
const RAW_LINE_BREAKS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\ufeff]/g;
function rawLineBreakProblems(ci) {
  const counts = new Map();
  for (const [ch] of ci.matchAll(RAW_LINE_BREAKS)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts].map(([ch, n]) => `ci.yml holds ${n} U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} character(s), which YAML can read as a line break or which the line reading does not see; refused before ci.yml is read (A1-305-2)`);
}
function runnerEnvWriteProblems(ci) {
  const job = workflowJobs(ci).get('application');
  return [...rawLineBreakProblems(ci), ...applicationJobText(ci).filter((line) => RUNNER_ENV_WRITE.test(line)).map((line) => `the application job names \`${line.trim()}\`, which writes or opens the environment of later steps`),
    ...yamlFormProblems(job), ...applicationKeys(job).problems, ...servicesProblems(job), ...dbEnvProblems(job)];
}
function auditProblems(steps) {
  const lines = steps.flatMap((s) => (s.run ?? '').split('\n')).filter((line) => /\bnpm audit\b/.test(line)).map((line) => line.trim());
  if (lines.length === 0) return ['no step runs npm audit'];
  const problems = [];
  for (const line of lines) {
    if (!/(?:^|\s)--include=dev(?=\s|$)/.test(line)) problems.push(`\`${line}\` does not name --include=dev`);
    const narrowing = line.match(/(?:^|\s)(--(?:omit|production|only)\b\S*)/);
    if (narrowing) problems.push(`\`${line}\` narrows the audit with ${narrowing[1]}`);
  }
  return problems;
}

test('CI audits the dev dependencies too, the packages the application job runs first (A1-270-1)', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  assert.deepEqual(auditProblems(workflowJobs(ci).get('application').steps), [], 'the application job audits with --include=dev');
  // The negative controls: the audit as it stood before A1-270-1, each other way of leaving the dev tree
  // out, a plain `npm audit` (which NODE_ENV=production narrows), and an --omit beside --include=dev.
  const RUN = '        run: npm audit --include=dev --audit-level=high\n';
  assert.ok(ci.includes(RUN), 'the audit step reads as written');
  for (const [flags, expected] of [
    ['--omit=dev --audit-level=high', /does not name --include=dev[\s\S]*narrows the audit with --omit=dev/],
    ['--omit dev --audit-level=high', /does not name --include=dev[\s\S]*narrows the audit with --omit/],
    ['--production --audit-level=high', /does not name --include=dev[\s\S]*narrows the audit with --production/],
    ['--only=prod --audit-level=high', /does not name --include=dev[\s\S]*narrows the audit with --only=prod/],
    ['--audit-level=high', /^`npm audit --audit-level=high` does not name --include=dev$/],
    ['--include=dev --omit=dev --audit-level=high', /^`npm audit --include=dev --omit=dev --audit-level=high` narrows the audit with --omit=dev$/],
    ['--include=dev --audit-level=high --omit=optional', /narrows the audit with --omit=optional/],
  ]) {
    const mutated = ci.replace(RUN, `        run: npm audit ${flags}\n`);
    assert.notEqual(mutated, ci);
    assert.match(auditProblems(workflowJobs(mutated).get('application').steps).join('\n'), expected, `npm audit ${flags} is refused`);
  }
  const removed = ci.replace(`      - name: Vulnerability audit (network)\n${RUN}`, '');
  assert.notEqual(removed, ci);
  assert.deepEqual(auditProblems(workflowJobs(removed).get('application').steps), ['no step runs npm audit'], 'a job with no audit is refused');
  // A1-279-2: the audit's environment. None on the head; an env: on the audit, before or after its run
  // line, or an npm_config_* key in the job's env or on another step, is refused.
  assert.deepEqual(auditEnvProblems(workflowJobs(ci).get('application')), [], 'the audit runs with the job\'s environment, which names no npm_config_*');
  const AUDIT_STEP = `      - name: Vulnerability audit (network)\n${RUN}`;
  for (const [mutated, expected] of [
    [ci.replace(AUDIT_STEP, `${AUDIT_STEP}        env:\n          npm_config_workspace: apps/web\n`), /runs npm audit with an env: of its own[\s\S]*sets `npm_config_workspace: apps\/web`/],
    [ci.replace(AUDIT_STEP, `      - name: Vulnerability audit (network)\n        env:\n          NPM_CONFIG_REGISTRY: http://127.0.0.1:9/\n${RUN}`), /runs npm audit with an env: of its own[\s\S]*sets `NPM_CONFIG_REGISTRY: http:\/\/127\.0\.0\.1:9\/`/],
    [ci.replace(AUDIT_STEP, `${AUDIT_STEP}        env:\n          FOO: bar\n`), /^step "Vulnerability audit \(network\)" runs npm audit with an env: of its own$/],
    [ci.replace("      NODE_OPTIONS: ''\n", "      NODE_OPTIONS: ''\n      npm_config_workspace: apps/web\n"), /^the application job sets `npm_config_workspace: apps\/web`$/],
    [ci.replace("      NODE_OPTIONS: ''\n", "      NODE_OPTIONS: ''\n      ? npm_config_workspace\n      : apps/web\n"), /^the application job sets `\? npm_config_workspace`$/],
    [ci.replace("    env:\n      NEXT_TELEMETRY_DISABLED: '1'\n      NODE_OPTIONS: ''\n", "    env: { NEXT_TELEMETRY_DISABLED: '1', NODE_OPTIONS: '', ? NPM_CONFIG_REGISTRY : http://127.0.0.1:9/ }\n"), /^the application job sets `env: \{/],
  ]) {
    assert.notEqual(mutated, ci);
    assert.match(auditEnvProblems(workflowJobs(mutated).get('application')).join('\n'), expected, `refused: ${expected}`);
  }
  // A1-279r2-2: the workflow level. None on the head; a top-level env: with npm_config_workspace (E1),
  // the same as an explicit key, and the same on the bootstrap job, are refused.
  assert.deepEqual(workflowNpmConfigProblems(ci), [], 'no key line of ci.yml names an npm_config_* variable');
  assert.deepEqual(workflowTopLevelProblems(ci), [], 'ci.yml has only name, on, permissions and jobs at the top level');
  const PERMISSIONS = 'permissions:\n  contents: read\n';
  assert.ok(ci.includes(PERMISSIONS), 'the workflow permissions read as written');
  for (const [mutated, expected] of [
    [ci.replace(PERMISSIONS, `${PERMISSIONS}env:\n  npm_config_workspace: apps/web\n`), 'ci.yml sets `npm_config_workspace: apps/web`'],
    [ci.replace(PERMISSIONS, `${PERMISSIONS}env:\n  ? NPM_CONFIG_WORKSPACE\n  : apps/web\n`), 'ci.yml sets `? NPM_CONFIG_WORKSPACE`'],
    [ci.replace(PERMISSIONS, `${PERMISSIONS}env: { npm_config_workspace: apps/web }\n`), 'ci.yml sets `env: { npm_config_workspace: apps/web }`'],
  ]) {
    assert.notEqual(mutated, ci);
    assert.deepEqual(workflowNpmConfigProblems(mutated), [expected], `refused: ${expected}`);
  }
  // A1-279r3-2's W1 to W5 and a defaults:, each refused at the top level whatever its spelling.
  for (const [added, line] of [
    ['env: # :|\n  npm_config_workspace: apps/web\n', 'env: # :|'],
    ['env:\n  "npm\\x5fconfig_workspace": apps/web\n', 'env:'],
    ['env:\n  !!str npm_config_workspace: apps/web\n', 'env:'],
    ['env:\n  &k npm_config_workspace: apps/web\n', 'env:'],
    ['env:\n  "NPM_\\x43ONFIG_WORKSPACE": apps/web\n', 'env:'],
    ['"\\x65nv":\n  npm_config_workspace: apps/web\n', '"\\x65nv":'],
    ['? env\n: { npm_config_workspace: apps/web }\n', '? env'],
    ['defaults:\n  run:\n    shell: bash {0}\n', 'defaults:'],
  ]) {
    const mutated = ci.replace(PERMISSIONS, PERMISSIONS + added);
    assert.notEqual(mutated, ci);
    assert.ok(workflowTopLevelProblems(mutated).includes('ci.yml has the top-level line `' + line + '`'), 'refused: ' + JSON.stringify(added));
  }
  // W1 is also read now: `# :|` opens no block, so the key under it is seen.
  assert.deepEqual(workflowNpmConfigProblems(ci.replace(PERMISSIONS, PERMISSIONS + 'env: # :|\n  npm_config_workspace: apps/web\n')), ['ci.yml sets `npm_config_workspace: apps/web`'], 'W1 is read through its comment');
  // Q0-279r2-2: no step of the application job writes $GITHUB_ENV or $GITHUB_PATH. None on the head; each
  // mutation below adds one write, in the toolchain step's `run: |` body (before the audit), on the
  // audit's own run line, or as YAML, and each is refused. The spellings are samples of the class, not
  // its definition: the reading refuses the token, so a spelling not listed here is refused the same.
  assert.deepEqual(runnerEnvWriteProblems(ci), [], 'no line of the application job names GITHUB_ENV, GITHUB_PATH or a runner file command');
  const TOOLCHAIN = '      - name: Verify pinned toolchain for the application\n        run: |\n          test "$(node --version)" = "v24.20.0"\n';
  assert.ok(ci.includes(TOOLCHAIN), 'the application toolchain step reads as written');
  const writes = [
    'echo "npm_config_workspace=apps/web" >> "$GITHUB_ENV"',
    'echo npm_config_workspace=apps/web >> $GITHUB_ENV',
    'echo "npm_config_registry=http://127.0.0.1:9/" >> "${GITHUB_ENV}"',
    'echo "NODE_OPTIONS=--import ./x.mjs" | tee -a "$GITHUB_ENV" > /dev/null',
    '{ echo "npm_config_workspace=apps/web"; } >>"${GITHUB_ENV:?}"',
    'printf \'%s\\n\' "$PWD/shim" >> "$GITHUB_PATH"',
    'echo "$PWD/shim" | tee -a ${GITHUB_PATH}',
    'cat .env >> "$github_env"',
    'echo "x=1" >> "$RUNNER_TEMP"/_runner_file_commands/set_env_1',
    'echo "::set-env name=npm_config_workspace::apps/web"',
    'echo "::add-path::$PWD/shim"',
  ];
  for (const write of writes) {
    const mutated = ci.replace(TOOLCHAIN, '      - name: Verify pinned toolchain for the application\n        run: |\n          ' + write + '\n          test "$(node --version)" = "v24.20.0"\n');
    assert.notEqual(mutated, ci);
    assert.deepEqual(runnerEnvWriteProblems(mutated), ['the application job names `' + write + '`, which writes or opens the environment of later steps'], 'refused: ' + write);
  }
  for (const [mutated, expected] of [
    [ci.replace(RUN, '        run: echo npm_config_omit=dev >> $GITHUB_ENV && npm audit --include=dev --audit-level=high\n'), 'names `run: echo npm_config_omit=dev >> $GITHUB_ENV && npm audit'],
    [ci.replace("      NODE_OPTIONS: ''\n", "      NODE_OPTIONS: ''\n      ACTIONS_ALLOW_UNSECURE_COMMANDS: 'true'\n"), "names `ACTIONS_ALLOW_UNSECURE_COMMANDS: 'true'`"],
    [ci.replace(AUDIT_STEP, AUDIT_STEP + '        env:\n          GITHUB_ENV: /tmp/elsewhere\n'), 'names `GITHUB_ENV: /tmp/elsewhere`'],
    [ci.replace(AUDIT_STEP, AUDIT_STEP + '        env:\n          OUT: ${{ env.GITHUB_PATH }}\n'), 'names `OUT: ${{ env.GITHUB_PATH }}`'],
    [ci.replace(AUDIT_STEP, AUDIT_STEP + '        env:\n          "GITHUB_\\x45NV": /tmp/elsewhere\n'), 'uses a double-quoted key with a backslash escape'],
  ]) {
    assert.notEqual(mutated, ci);
    const problems = runnerEnvWriteProblems(mutated);
    assert.ok(problems.some((p) => p.includes(expected)), 'refused: ' + expected + ' (found ' + JSON.stringify(problems) + ')');
  }
  // A1-287-2: the key allowlist. On the head every key line of the application job is placed and on its
  // list, and each list is exactly the keys main's ci.yml uses there, so neither side can drift unseen.
  const keys = applicationKeys(workflowJobs(ci).get('application'));
  assert.deepEqual(keys.problems, [], 'every key of the application job is on its allowlist');
  // WP-1A-A0-006: the job's one service is held line for line. On the head it is the pinned container;
  // a second service, another image, an entrypoint option or a volume added, or the key quoted (then read
  // in the head, where the key allowlist refuses it) are each refused.
  assert.deepEqual(servicesProblems(workflowJobs(ci).get('application')), [], 'the application job\'s service is the pinned container');
  const SERVICE_PORTS = '        ports:\n          - 5432:5432\n';
  assert.ok(ci.indexOf(SERVICE_PORTS, ci.indexOf('  application:\n')) !== -1, 'the application service reads as written');
  const atService = (from, to) => { const i = ci.indexOf(from, ci.indexOf('  application:\n')); return ci.slice(0, i) + to + ci.slice(i + from.length); };
  for (const [mutated, expected] of [
    [atService(SERVICE_PORTS, '        ports:\n          - 5432:5432\n      redis:\n        image: redis:7\n'), 'services: block is not the pinned postgres:17 container'],
    [atService('        image: postgres:17\n', '        image: postgres:latest\n'), 'services: block is not the pinned postgres:17 container'],
    [atService('          --health-retries 5\n', '          --health-retries 5\n          --entrypoint /bin/sh\n'), 'services: block is not the pinned postgres:17 container'],
    [atService(SERVICE_PORTS, '        ports:\n          - 5432:5432\n        volumes:\n          - /var/run/docker.sock:/var/run/docker.sock\n'), 'services: block is not the pinned postgres:17 container'],
    [atService('    services:\n', '    "services":\n'), 'has the job key `services`'],
  ]) {
    assert.notEqual(mutated, ci);
    const problems = runnerEnvWriteProblems(mutated);
    assert.ok(problems.some((p) => p.includes(expected)), 'refused: ' + expected + ' (found ' + JSON.stringify(problems) + ')');
  }
  // A1-305-1: inside the block a blank line and a `#`-led line are content to YAML (in `options: >-` a
  // blank line then `#x --privileged ...` hands docker real flags), so the block is read from the raw lines
  // and each such line breaks the byte-for-byte pin. A1's insertion, then its parts alone and its variants:
  // a `#`-led line at the job's depth, tab-led lines, a CRLF line end and a trailing space. The same in the
  // bootstrap job's block. A comment after the block's last line is ci.yml's own, and stays free.
  const HEALTH_CMD = '          --health-cmd pg_isready\n';
  const PIN = 'services: block is not the pinned postgres:17 container';
  for (const [mutated, expected] of [
    [atService(HEALTH_CMD, HEALTH_CMD + '\n          #x --privileged -v /var/run/docker.sock:/var/run/docker.sock\n'), 'blank or `#`-led line(s) inside it'],
    [atService(HEALTH_CMD, HEALTH_CMD + '\n'), 'blank or `#`-led line(s) inside it'],
    [atService(HEALTH_CMD, HEALTH_CMD + '   \n'), 'blank or `#`-led line(s) inside it'],
    [atService(HEALTH_CMD, HEALTH_CMD + '          #x --privileged\n'), 'blank or `#`-led line(s) inside it'],
    [atService(HEALTH_CMD, HEALTH_CMD + '    # --privileged\n'), 'blank or `#`-led line(s) inside it'],
    [atService(HEALTH_CMD, HEALTH_CMD + '\n\t#x --privileged\n'), 'blank or `#`-led line(s) inside it'],
    [atService(HEALTH_CMD, HEALTH_CMD + '          \t--privileged\n'), PIN],
    [atService(HEALTH_CMD, '          --health-cmd pg_isready\r\n'), PIN],
    [atService(HEALTH_CMD, '          --health-cmd pg_isready \n'), PIN],
    [atService('        image: postgres:17\n', '        image: postgres:17\n\n        # x\n'), 'blank or `#`-led line(s) inside it'],
  ]) {
    assert.notEqual(mutated, ci);
    const problems = runnerEnvWriteProblems(mutated);
    assert.ok(problems.some((p) => p.includes(expected)), 'refused: ' + JSON.stringify(expected) + ' (found ' + JSON.stringify(problems) + ')');
    assert.ok(problems.some((p) => p.includes(PIN)), 'the block is not the pin');
  }
  const bootHealth = ci.indexOf(HEALTH_CMD);
  assert.ok(bootHealth !== -1 && bootHealth < ci.indexOf('  application:\n'), 'the bootstrap job\'s service reads as written');
  const bootMutated = ci.slice(0, bootHealth) + HEALTH_CMD + '\n          #x --privileged -v /var/run/docker.sock:/var/run/docker.sock\n' + ci.slice(bootHealth + HEALTH_CMD.length);
  assert.notDeepEqual(workflowJobs(bootMutated).get('bootstrap').services, APPLICATION_SERVICES, 'A1\'s insertion in the bootstrap job\'s block breaks its pin too');
  assert.deepEqual(servicesProblems(workflowJobs(atService(SERVICE_PORTS, SERVICE_PORTS + '\n    # a comment after the block\n\n')).get('application')), [], 'a comment after the block is not in it');
  // A1-305-I1 / C0-305-I1: DB_TEST_URL and PGPASSWORD only on their two steps, and only with the bootstrap
  // job's values; a `${{ secrets.* }}` or another host on either name, on any step, is refused.
  const BUILD_STEP = '      - name: Build the web application\n';
  const TESTS_DB_URL = '          DB_TEST_URL: postgresql://postgres@localhost:5432/thinkbizthai_test\n        run: npm run test:app\n';
  assert.deepEqual(dbEnvProblems(workflowJobs(ci).get('application')), [], 'the two names are on their two steps, with the bootstrap job\'s values');
  assert.ok(ci.includes(BUILD_STEP) && ci.includes(TESTS_DB_URL), 'the build and tests steps read as written');
  for (const [mutated, expected] of [
    [ci.replace(BUILD_STEP, BUILD_STEP + '        env:\n          DB_TEST_URL: ${{ secrets.X }}\n'), 'step "Build the web application" sets `DB_TEST_URL`, which only'],
    [ci.replace(BUILD_STEP, BUILD_STEP + "        env:\n          'PGPASSWORD': postgres\n"), 'step "Build the web application" sets `PGPASSWORD`, which only'],
    [ci.replace(AUDIT_STEP, AUDIT_STEP + '        env:\n          PGPASSWORD: postgres\n'), 'step "Vulnerability audit (network)" sets `PGPASSWORD`, which only'],
    [ci.replace(TESTS_DB_URL, '          DB_TEST_URL: ${{ secrets.DB_TEST_URL }}\n        run: npm run test:app\n'), 'step "Application tests" sets `DB_TEST_URL` to another value'],
    [ci.replace(TESTS_DB_URL, '          DB_TEST_URL: postgresql://postgres@db.example.com:5432/thinkbizthai_test\n        run: npm run test:app\n'), 'step "Application tests" sets `DB_TEST_URL` to another value'],
    [ci.replace(TESTS_DB_URL, TESTS_DB_URL.replace('          DB_TEST_URL', '          "DB_TEST_URL"').replace('thinkbizthai_test\n', 'prod\n')), 'step "Application tests" sets `DB_TEST_URL` to another value'],
  ]) {
    assert.notEqual(mutated, ci);
    const problems = runnerEnvWriteProblems(mutated);
    assert.ok(problems.some((p) => p.includes(expected)), 'refused: ' + expected + ' (found ' + JSON.stringify(problems) + ')');
  }
  // A1-305-2: a line break the line reading does not split on. None in ci.yml; A1's three insertions (a
  // service volume after `- 5432:5432`, a step env on the build step, and main's job-head `services:` past
  // the A1-287-2 allowlist), each with a lone `\r` and again with NEL, LS and PS, plus `credentials:`, a
  // `container:` key, a whole-file CRLF, a BOM and other control characters, are each refused by both
  // readers, on the raw text, whatever the rest of the reading makes of them.
  assert.deepEqual(rawLineBreakProblems(ci), [], 'ci.yml holds no line break but \\n and no control character but \\n and \\t');
  const AFTER_NEEDS = '  application:\n    needs: bootstrap\n';
  assert.ok(ci.includes(AFTER_NEEDS), 'the application job head reads as written');
  const breaks = [];
  for (const [br, code] of [['\r', 'U+000D'], ['\u0085', 'U+0085'], ['\u2028', 'U+2028'], ['\u2029', 'U+2029']]) {
    breaks.push([atService(SERVICE_PORTS, SERVICE_PORTS + `    # note${br}        volumes:${br}          - /var/run/docker.sock:/var/run/docker.sock\n`), code]);
    breaks.push([atService(SERVICE_PORTS, SERVICE_PORTS + `    # note${br}        credentials:${br}          username: x${br}          password: \${{ secrets.X }}\n`), code]);
    breaks.push([ci.replace(BUILD_STEP, BUILD_STEP + `        # x${br}        env:${br}          DB_TEST_URL: \${{ secrets.PROD_DB_URL }}\n`), code]);
    breaks.push([ci.replace(AFTER_NEEDS, AFTER_NEEDS + `    # note${br}    services:${br}      evil:${br}        image: alpine${br}        options: --privileged\n`), code]);
    breaks.push([ci.replace(AFTER_NEEDS, AFTER_NEEDS + `    # note${br}    container: ubuntu:24.04\n`), code]);
  }
  breaks.push([ci.replace(/\n/g, '\r\n'), 'U+000D']);
  breaks.push(['\ufeff' + ci, 'U+FEFF']);
  breaks.push([ci.replace(AFTER_NEEDS, AFTER_NEEDS + '    # note\u000b    container: ubuntu:24.04\n'), 'U+000B']);
  breaks.push([ci.replace(AFTER_NEEDS, AFTER_NEEDS + '    # note\u000c    container: ubuntu:24.04\n'), 'U+000C']);
  breaks.push([ci.replace(AFTER_NEEDS, AFTER_NEEDS + '    # note\u0000\n'), 'U+0000']);
  breaks.forEach(([mutated, code], i) => {
    assert.notEqual(mutated, ci);
    const expected = `${code} character(s), which YAML can read as a line break`;
    for (const reader of [runnerEnvWriteProblems, shellProblems]) {
      const problems = reader(mutated);
      assert.ok(problems.some((p) => p.includes(expected) && p.endsWith('(A1-305-2)')), `${reader.name} refuses ${code} in control ${i + 1} (found ${JSON.stringify(problems).slice(0, 400)})`);
    }
  });
  for (const [level, allowed] of Object.entries(APPLICATION_KEYS)) assert.deepEqual([...keys.seen[level]].sort(), [...allowed], 'the ' + level + ' allowlist is exactly what the application job uses');
  // A1-287-1: a `#`-led line inside a block-scalar body is shell text, and is read; a quoted scalar that
  // spans lines is refused. Q1 and Q2 are A1's: a shell string opened on one line and closed on a `#`-led
  // line, writing $GITHUB_ENV (in the checkout step) and $GITHUB_PATH (in the toolchain step). P3 and P4
  // are A1's YAML forms: a double-quoted run with an escaped line break, and a single-quoted one, each
  // naming the token on a `#`-led continuation line. Then the environment keys A1-287-2 names.
  const CHECKOUT_TAIL = 'is the commit this run reports on"\n';
  const atApplication = (text, find, insert) => { const i = text.lastIndexOf(find); return text.slice(0, i + find.length) + insert + text.slice(i + find.length); };
  assert.ok(ci.lastIndexOf(CHECKOUT_TAIL) > ci.indexOf('  application:\n'), 'the application checkout step reads as written');
  const NEXT_ENV = "      NEXT_TELEMETRY_DISABLED: '1'\n";
  assert.ok(ci.includes(NEXT_ENV), 'the job env reads as written');
  for (const [mutated, expected] of [
    [atApplication(ci, CHECKOUT_TAIL, '          echo npm_config_workspace=apps/web | tee -a "$RUNNER_TEMP/x\n          #" "$GITHUB_ENV" >/dev/null\n'), 'names `#" "$GITHUB_ENV" >/dev/null`'],
    [ci.replace(TOOLCHAIN, TOOLCHAIN + '          echo "$PWD/node_modules/.bin" | tee -a "$RUNNER_TEMP/x\n          #" "$GITHUB_PATH" >/dev/null\n'), 'names `#" "$GITHUB_PATH" >/dev/null`'],
    [ci.replace(TOOLCHAIN, TOOLCHAIN + '          # >> "$GITHUB_ENV"\n'), 'names `# >> "$GITHUB_ENV"`'],
    [ci.replace(RUN, '        run: >-\n          echo x\n          # >> $GITHUB_ENV\n          npm audit --include=dev --audit-level=high\n'), 'names `# >> $GITHUB_ENV`'],
    [ci.replace(RUN, '        run: "echo npm_config_omit=dev | tee -a x\\\n          # $GITHUB_ENV; npm audit --include=dev --audit-level=high"\n'), 'uses a quoted scalar that spans lines: `run: "echo npm_config_omit=dev | tee -a x\\`'],
    [ci.replace(RUN, "        run: 'echo npm_config_omit=dev | tee -a \"x\n          #\" \"$GITHUB_ENV\"; npm audit --include=dev --audit-level=high'\n"), "uses a quoted scalar that spans lines: `run: 'echo npm_config_omit=dev | tee -a \"x`"],
    [ci.replace(NEXT_ENV, NEXT_ENV + "      BASH_ENV: '$(echo /tmp/e)'\n"), 'has the job env key `BASH_ENV`'],
    [ci.replace(NEXT_ENV, NEXT_ENV + '      PATH: /home/runner/shim:/usr/local/bin:/usr/bin:/bin\n'), 'has the job env key `PATH`'],
    [ci.replace(NEXT_ENV, NEXT_ENV + '      "ENV": /tmp/e\n'), 'has the job env key `ENV`'],
    [ci.replace(AUDIT_STEP, AUDIT_STEP + '        env:\n          BASH_ENV: /tmp/e\n'), 'has the step env key `BASH_ENV`'],
    [ci.replace(AUDIT_STEP, AUDIT_STEP + "        env:\n          NODE_OPTIONS: '--import ./x.mjs'\n"), 'has the step env key `NODE_OPTIONS`'],
    [ci.replace(AUDIT_STEP, AUDIT_STEP + '        working-directory: apps/web\n'), 'has the step key `working-directory`'],
  ]) {
    assert.notEqual(mutated, ci);
    const problems = runnerEnvWriteProblems(mutated);
    assert.ok(problems.some((p) => p.includes(expected)), 'refused: ' + expected + ' (found ' + JSON.stringify(problems) + ')');
  }
});

// A1-270-2. A step condition such as `if: always()`, `if: ${{ !cancelled() }}` or `if: success() ||
// failure()` runs a step after an earlier step failed, and `continue-on-error` lets a step fail without
// failing the job: on any step of the application job either would let package code run after a failed
// audit or release age, and undo the order above. The job carries one condition, the release age's
// `if: github.event_name == 'pull_request'` (a push has no base to compare against), and nothing else,
// at the job or the step level. Every key line of a step is read, at any depth, plain, single- or
// double-quoted, or in a flow mapping; the body of a `run: |` block is shell and is not read. The reading
// is a key regex, not a YAML parser, so the job may use only the block-style spellings it reads, and it
// fails closed on the rest (A1-279-1, A1-279r2-1): within the application job it refuses any flow
// collection (a `{`, `}`, `[` or `]` outside a `${{ ... }}` expression), any `?` or `:` where a YAML token
// can start (the line start, after a `- `, `{`, `[` or `,`), a double-quoted key holding a backslash escape
// (`"\x69f": always()`), a tag (`!!str if:`), an anchor (`&name`), an alias (`*name`), a merge key (`<<:`),
// a comment on a key or dash line (`- # :|`, A1-279r3-1) and a dash line with no key on it, each of which
// a YAML parser can read in a way the regex does not. A block-scalar header is decided with any trailing
// comment removed, so `# :|` opens no block. Whole-line comments are dropped before anything is read, so
// they hide nothing.
// THE RESIDUAL, stated plainly: this is a line-based reader, not a YAML parser. It refuses the YAML
// features the job does not use (flow collections, explicit keys, tags, anchors, aliases and merges,
// escapes in keys, comments after content, bare dashes; at the workflow level any top-level key but
// name, on, permissions and jobs, so no workflow env: or defaults:) and anything it cannot place. A
// spelling that needs a parser more lenient than YAML allows, beyond these, is held by the review of
// every ci.yml change, which is a governance path four roles read. Returns the problems.
const RELEASE_AGE_CONDITION = "if: github.event_name == 'pull_request'";
const CONDITION_KEY = /(?:^|[{,]|-\s)\s*["']?(if|continue-on-error)["']?\s*:/;
// A trailing comment, `#` at the line start or after whitespace, removed (quotes are not considered: a
// `#` in a quoted value is refused below as a comment, failing closed).
const withoutComment = (line) => line.replace(/(?:^|\s)#.*$/, '');
function keyLines(text) {
  const out = [];
  let block = null;
  for (const line of text.split('\n')) {
    const indent = line.match(/^ */)[0].length;
    if (block !== null) {
      if (line.trim() === '' || indent > block) continue;
      block = null;
    }
    out.push(line);
    if (/:\s*[|>][-+0-9]*\s*$/.test(withoutComment(line))) block = indent;
  }
  return out;
}
const YAML_FORMS = [
  ['a comment after content', /(?:^|\s)#/],
  ['a flow collection', /[{}[\]]/],
  ['an explicit key or value indicator', /(?:^\s*(?:-\s+)?|[{[,]\s*)[?:](?:\s|$)/],
  ['a double-quoted key with a backslash escape', /(?:^|[{,]|-\s|\?\s)\s*"(?:[^"\\]|\\.)*\\(?:[^"\\]|\\.)*"\s*:/],
  ['a tag', /(?:^|[{,[]|-\s|:\s|\?\s)\s*!/],
  ['an anchor or alias', /(?:^|[{,[]|-\s|:\s|\?\s)\s*[&*][^\s,\]}]/],
  ['a merge key', /(?:^|[{,]|-\s|\?\s)\s*["']?<<["']?\s*:/],
  ['a quoted scalar that spans lines', { test: (line) => quotedScalarSpansLines(line) }],
];
// A1-287-1. A quoted scalar that does not close on its line goes on over the next lines, and YAML reads
// every one of them as part of the value, a `#`-led one included, where the line reading drops it as a
// comment. So within the application job a quote that opens a key or a value (at the line start, after
// `- ` or after `: `) must close on the same line; one that does not is refused, as a class, whatever
// the quote holds. A quote inside a plain scalar (`Owner's`) opens nothing and is not read.
function quotedScalarSpansLines(line) {
  const opens = /(?:^\s*(?:-\s+)?|:\s+)(["'])/g;
  let m;
  while ((m = opens.exec(line))) {
    const from = m.index + m[0].length - 1;
    const closed = (m[1] === '"' ? /^"(?:[^"\\]|\\.)*"/ : /^'(?:[^']|'')*'/).exec(line.slice(from));
    if (!closed) return true;
    opens.lastIndex = from + closed[0].length;
  }
  return false;
}
// A GitHub expression, `${{ ... }}`, is the one place the job writes braces; it is removed before the
// forms are read, so its `{{`, `}}` and a `!` inside it are not taken for flow or a tag.
const withoutExpressions = (line) => line.replace(/\$\{\{[^}]*\}\}/g, '');
function yamlFormProblems(job) {
  const lines = [...job.head.map((line) => ['the application job', line]),
    ...job.steps.flatMap((step, i) => keyLines(step.raw).map((line) => [`step "${step.name ?? step.uses ?? `step ${i + 1}`}"`, line]))];
  const bare = job.steps.flatMap((step, i) => (withoutComment(step.raw.split('\n')[0]).trim() === '' ? [`step ${i + 1} is a dash line with no key on it: \`- ${step.raw.split('\n')[0]}\``] : []));
  // A dash the step reader does not take for a step (a bare `-`, a `-` and a tab) lands in the job's own
  // lines; it is refused there as a line the reading cannot place.
  bare.push(...job.head.filter((line) => /^\s*-(?:\s|$)/.test(line)).map((line) => `the application job has a dash line the reading cannot place: \`${line.trim()}\``));
  return [...bare, ...lines.flatMap(([where, line]) => YAML_FORMS.filter(([, form]) => form.test(withoutExpressions(line))).map(([what]) => `${where} uses ${what}: \`${line.trim()}\``))];
}
function applicationConditionProblems(job) {
  const problems = job.head.filter((line) => CONDITION_KEY.test(line)).map((line) => `the application job carries \`${line.trim()}\``);
  problems.push(...yamlFormProblems(job));
  job.steps.forEach((step, i) => {
    const label = step.name ?? step.uses ?? `step ${i + 1}`;
    const found = keyLines(step.raw).filter((line) => CONDITION_KEY.test(line)).map((line) => line.trim());
    const allowed = step.name === 'Release age of new lockfile entries (network)' && /verify-release-age\.mjs/.test(step.run ?? '');
    for (const line of found) {
      if (allowed && line === RELEASE_AGE_CONDITION && found.length === 1) continue;
      problems.push(`step "${label}" carries \`${line}\``);
    }
  });
  return problems;
}

// A1-279-3. `shell:` chooses the program a `run:` is handed to. `shell: bash {0}` drops the `-e` of the
// default `bash -e {0}`, so a multi-line step whose first line fails goes on and exits 0; `shell: true
// {0}`, or any program that ignores its script, runs nothing and passes. It can be set on a step, on the
// job (`defaults: run: shell:`) or on the workflow (`defaults:` at the top level). Closed as a CLASS, not
// by listing spellings: no line applicationJobText reads (the job's own lines, its steps' lines and every
// line of its block-scalar bodies, `#`-led ones included; YAML comments outside them left out) holds the
// token `shell` or `defaults` in any letter case, so the key is refused however it is quoted, nested or
// placed (a run body that only mentions the word is refused too, failing closed); the workflow's top
// level may hold only name, on, permissions and jobs, so no workflow `defaults:` in any spelling
// (workflowTopLevelProblems); the YAML forms that could spell the key without its letters, or hide lines
// in a quoted scalar, are refused by yamlFormProblems; and the job's keys are an allowlist (A1-287-2), so
// `container:` (another image's shell) is refused, as is any key main does not use; `services:` is held to
// the one pinned postgres:17 block (WP-1A-A0-006, servicesProblems), so another or a further service is refused.
// THE RESIDUAL, stated plainly: the reader sees ci.yml's text, not what runs or what a `${{ }}`
// expression evaluates to. A shell chosen by other means (a step that runs `bash +e script.sh` or
// `sh -c "..."`, or `set +e` in a `run: |` body, which the default `bash -e` honours), a repository or npm
// script that swallows its own failure, and the pinned actions' own behaviour are not seen; they are held
// by the review of every ci.yml and script change and by the step list A1-257-4 pins. The bootstrap job
// is not read here (A1-279-3 named the application job). A1-305-2: a line break the reading does not
// split on is refused first, on ci.yml's raw text (rawLineBreakProblems). Returns the problems.
const SHELL_CHOICE = /shell|defaults/i;
function shellProblems(ci) {
  const job = workflowJobs(ci).get('application');
  return [...rawLineBreakProblems(ci), ...workflowTopLevelProblems(ci),
    ...applicationJobText(ci).filter((line) => SHELL_CHOICE.test(line)).map((line) => `the application job names \`${line.trim()}\`, which can choose the shell a run: is handed to`),
    ...yamlFormProblems(job), ...applicationKeys(job).problems, ...servicesProblems(job)];
}

test('no step of the application job runs on a condition or may fail softly, except the release age\'s pull-request condition (A1-270-2)', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const app = workflowJobs(ci).get('application');
  assert.deepEqual(applicationConditionProblems(app), [], 'the application job carries no condition but the release age\'s');
  assert.equal(app.steps.filter((s) => keyLines(s.raw).some((line) => line.trim() === RELEASE_AGE_CONDITION)).length, 1, 'the release age\'s condition is read and is the only one');
  // The negative controls: on a package-code step ("Application tests") each condition that would run it
  // after a failed check, in each spelling, and continue-on-error; the same on the audit; the release
  // age's condition widened or joined by continue-on-error; its exact text on another step; and a
  // condition or continue-on-error on the job itself.
  const TESTS = '      - name: Application tests\n';
  const AUDIT = '      - name: Vulnerability audit (network)\n';
  const AGE = "      - name: Release age of new lockfile entries (network)\n        if: github.event_name == 'pull_request'\n";
  const TYPECHECK = '      - name: Type-check the application\n';
  const NEEDS = '  application:\n    needs: bootstrap\n';
  for (const anchor of [TESTS, AUDIT, AGE, TYPECHECK, NEEDS]) assert.ok(ci.includes(anchor), `${JSON.stringify(anchor)} reads as written`);
  const cases = [];
  for (const condition of ['if: always()', 'if: ${{ always() }}', 'if: ${{ !cancelled() }}', 'if: success() || failure()', "'if': always()", '"if": ${{ !cancelled() }}', 'continue-on-error: true', 'continue-on-error: ${{ true }}']) {
    cases.push([ci.replace(TESTS, `${TESTS}        ${condition}\n`), `step "Application tests" carries \`${condition}\``]);
    cases.push([ci.replace(AUDIT, `${AUDIT}        ${condition}\n`), `step "Vulnerability audit (network)" carries \`${condition}\``]);
  }
  cases.push([ci.replace(AGE, AGE.replace("== 'pull_request'", "== 'pull_request' || always()")), "step \"Release age of new lockfile entries (network)\" carries `if: github.event_name == 'pull_request' || always()`"]);
  cases.push([ci.replace(AGE, AGE.replace("if: github.event_name == 'pull_request'", 'if: always()')), 'step "Release age of new lockfile entries (network)" carries `if: always()`']);
  cases.push([ci.replace(AGE, `${AGE}        continue-on-error: true\n`), 'step "Release age of new lockfile entries (network)" carries `continue-on-error: true`']);
  cases.push([ci.replace(TYPECHECK, `${TYPECHECK}        ${RELEASE_AGE_CONDITION}\n`), `step "Type-check the application" carries \`${RELEASE_AGE_CONDITION}\``]);
  cases.push([ci.replace(TESTS, '      - { name: Application tests, if: always(), run: npm run test:app }\n      - name: Application tests (unused)\n'), 'carries `{ name: Application tests, if: always(), run: npm run test:app }`']);
  cases.push([ci.replace(NEEDS, `${NEEDS}    if: always()\n`), 'the application job carries `if: always()`']);
  // A1-279-1: the YAML spellings a parser reads as `if` or `continue-on-error` and the key regex does not.
  const BOOT_WITH = '      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262\n        with:\n';
  assert.ok(ci.includes(BOOT_WITH), 'a bootstrap with: map to anchor reads as written');
  for (const [text, expected] of [
    ['"\\x69f": always()', 'step "Application tests" uses a double-quoted key with a backslash escape'],
    ['"continue-on-\\x65rror": true', 'step "Application tests" uses a double-quoted key with a backslash escape'],
    ['? if\n        : always()', 'step "Application tests" uses an explicit key or value indicator: `? if`'],
    ['!!str if: always()', 'step "Application tests" uses a tag'],
    ['!!str continue-on-error: true', 'step "Application tests" uses a tag'],
    ['<<: *c', 'step "Application tests" uses a merge key'],
  ]) {
    cases.push([ci.replace(TESTS, `${TESTS}        ${text}\n`), expected]);
  }
  cases.push([ci.replace(TESTS, `${TESTS}        <<: *c\n`).replace(BOOT_WITH, `${BOOT_WITH.replace('with:', 'with: &c')}          if: always()\n`), 'step "Application tests" uses an anchor or alias: `<<: *c`']);
  cases.push([ci.replace(TESTS, `${TESTS}        x: &c\n          if: always()\n`), 'step "Application tests" uses an anchor or alias: `x: &c`']);
  cases.push([ci.replace(NEEDS, `${NEEDS}    "\\x69f": always()\n`), 'the application job uses a double-quoted key with a backslash escape']);
  cases.push([ci.replace(NEEDS, `${NEEDS}    "continue-on-\\x65rror": true\n`), 'the application job uses a double-quoted key with a backslash escape']);
  cases.push([ci.replace(NEEDS, `${NEEDS}    ? if\n    : always()\n`), 'the application job uses an explicit key or value indicator: `? if`']);
  cases.push([ci.replace(NEEDS, `${NEEDS}    !!str if: always()\n`), 'the application job uses a tag']);
  cases.push([ci.replace(NEEDS, `${NEEDS}    <<: *c\n`), 'the application job uses a merge key']);
  // A1-279r2-1 and Q0-279r2-1: an explicit key inside a flow mapping, after `{` or `,`, on a step whose
  // name and run keep lines of their own (S3, S10, S6, S4), and in a flow env of the job. The class is
  // refused, not the spelling: each is a flow collection, and each `?` stands where a token starts.
  const PARSED = '      - name: Verify the application boundaries (parsed)\n        run: node scripts/verify-app-boundaries.mjs --require-parser\n';
  const JOB_ENV = "    env:\n      NEXT_TELEMETRY_DISABLED: '1'\n      NODE_OPTIONS: ''\n";
  assert.ok(ci.includes(PARSED) && ci.includes(JOB_ENV), 'the parsed guard step and the job env read as written');
  // Concatenated, not a template: the guard's import walk refuses a template that names a loader word
  // (here --require-parser) after an interpolation.
  const flowStep = (entry) => '      - { ' + entry + ',\n        name: Verify the application boundaries (parsed)\n        ,\n        run: node scripts/verify-app-boundaries.mjs --require-parser\n        }\n';
  for (const entry of ['? if : always()', "? 'if' : always()", '? !!str if : always()', '? "continue-on-\\x65rror" : true', 'name: x, ? if : always()']) {
    const mutated = ci.replace(PARSED, flowStep(entry));
    cases.push([mutated, 'uses a flow collection']);
    cases.push([mutated, `uses an explicit key or value indicator: \`{ ${entry},\``]);
  }
  cases.push([ci.replace(JOB_ENV, "    env: { NEXT_TELEMETRY_DISABLED: '1', NODE_OPTIONS: '', ? if : always() }\n"), 'the application job uses a flow collection']);
  cases.push([ci.replace(JOB_ENV, "    env: [ NEXT_TELEMETRY_DISABLED ]\n"), 'the application job uses a flow collection']);
  cases.push([ci.replace(TESTS, `${TESTS}        x: y, ? if : always()\n`), 'step "Application tests" uses an explicit key or value indicator']);
  // A1-279r3-1: U1 to U3 on "Type-check negative control", which no other control anchors on. The dash line
  // carries a comment that ends in `:|`, and the keys sit a level deeper; U2 adds decoy name/run lines inside
  // a double-quoted scalar, U3 inside a flow mapping re-opened by `, # :|`. A bare `-` line, and a comment
  // after a key, are refused too.
  const CONTROL = '      - name: Type-check negative control\n        run: node scripts/verify-typecheck-control.mjs\n';
  assert.ok(ci.includes(CONTROL), 'the type-check control step reads as written');
  const NAME_RUN = '          name: Type-check negative control\n          run: node scripts/verify-typecheck-control.mjs\n';
  const U1 = '      - # :|\n          if: always()\n' + NAME_RUN;
  const U2 = '      - # :|\n          if: always()\n          env:\n            X: "a\n        name: Type-check negative control\n        run: node scripts/verify-typecheck-control.mjs\n            b"\n' + NAME_RUN;
  const U3 = '      - # :|\n          if: always()\n          env: {X: "1",\n        name: Type-check negative control\n        , # :|\n        run: node scripts/verify-typecheck-control.mjs\n        , # :|\n          }\n';
  for (const [label, step] of [['U1', U1], ['U2', U2], ['U3', U3]]) {
    const mutated = ci.replace(CONTROL, step);
    cases.push([mutated, 'is a dash line with no key on it: `- # :|`']);
    cases.push([mutated, 'carries `if: always()`']);
    assert.ok(mutated !== ci, label);
  }
  cases.push([ci.replace(CONTROL, '      -\n        name: Type-check negative control\n        run: node scripts/verify-typecheck-control.mjs\n'), 'the application job has a dash line the reading cannot place: `-`']);
  cases.push([ci.replace(CONTROL, '      - name: Type-check negative control # :|\n        run: node scripts/verify-typecheck-control.mjs\n'), 'uses a comment after content: `name: Type-check negative control # :|`']);
  cases.push([ci.replace(NEEDS, '  application:\n    needs: bootstrap # x\n'), 'the application job uses a comment after content: `needs: bootstrap # x`']);
  cases.push([ci.replace(NEEDS, `${NEEDS}    continue-on-error: true\n`), 'the application job carries `continue-on-error: true`']);
  for (const [mutated, expected] of cases) {
    assert.notEqual(mutated, ci);
    const problems = applicationConditionProblems(workflowJobs(mutated).get('application'));
    assert.ok(problems.length > 0 && problems.some((p) => p.includes(expected)), `refused: ${expected} (found ${JSON.stringify(problems)})`);
  }
  // On the head the job uses none of those spellings, and the reading sees each where it stands; the
  // braces of its `${{ ... }}` expressions are not flow.
  assert.deepEqual(yamlFormProblems(app), [], 'the application job uses only the spellings the reading reads');
  assert.ok(app.steps.some((s) => s.raw.includes('${{')), 'the job does write expressions, and they are not refused');
  // A shell `if` inside a `run: |` block is not a condition: the checkout check's own `if [ ... ]` is not read.
  assert.match(app.steps[1].run, /^if \[/m, 'the checkout check runs a shell if');
  // A1-279-3: no `shell:` and no `defaults:` reach the application job. None on the head; each mutation
  // below adds one, at step, job or workflow level, and each is refused. The spellings are samples of the
  // class: the reading refuses the token, so a spelling not listed here is refused the same.
  assert.deepEqual(shellProblems(ci), [], 'no line of the application job names shell or defaults, and the workflow has no defaults:');
  const TOOLCHAIN_STEP = '      - name: Verify pinned toolchain for the application\n';
  const PERMISSIONS_LINE = 'permissions:\n  contents: read\n';
  assert.ok(ci.includes(TOOLCHAIN_STEP) && ci.includes(PERMISSIONS_LINE), 'the toolchain step and the workflow permissions read as written');
  const shellCases = [];
  for (const key of ['shell: bash {0}', "'shell': bash {0}", '"shell": sh {0}', 'Shell: true {0}', 'shell:   bash --noprofile --norc {0}']) {
    shellCases.push([ci.replace(TOOLCHAIN_STEP, TOOLCHAIN_STEP + '        ' + key + '\n'), 'names `' + key.trim() + '`']);
    shellCases.push([ci.replace(TESTS, TESTS + '        ' + key + '\n'), 'names `' + key.trim() + '`']);
  }
  shellCases.push([ci.replace(NEEDS, NEEDS + '    defaults:\n      run:\n        shell: bash {0}\n'), 'names `defaults:`']);
  shellCases.push([ci.replace(NEEDS, NEEDS + '    defaults:\n      run:\n        shell: bash {0}\n'), 'names `shell: bash {0}`']);
  shellCases.push([ci.replace(NEEDS, NEEDS + "    'defaults': { run: { shell: bash {0} } }\n"), 'uses a flow collection']);
  shellCases.push([ci.replace(NEEDS, NEEDS + '    "\\x64efaults":\n      run:\n        "\\x73hell": bash {0}\n'), 'uses a double-quoted key with a backslash escape']);
  shellCases.push([ci.replace(TESTS, TESTS + '        "\\x73hell": bash {0}\n'), 'step "Application tests" uses a double-quoted key with a backslash escape']);
  shellCases.push([ci.replace(TESTS, TESTS + '        ? shell\n        : bash {0}\n'), 'names `? shell`']);
  shellCases.push([ci.replace(TESTS, TESTS + '        <<: *s\n').replace(BOOT_WITH, BOOT_WITH.replace('with:', 'with: &s') + '          x: y\n'), 'uses a merge key']);
  shellCases.push([ci.replace(PERMISSIONS_LINE, PERMISSIONS_LINE + 'defaults:\n  run:\n    shell: bash {0}\n'), 'ci.yml has the top-level line `defaults:`']);
  shellCases.push([ci.replace(PERMISSIONS_LINE, PERMISSIONS_LINE + '"\\x64efaults":\n  run:\n    shell: bash {0}\n'), 'ci.yml has the top-level line `"\\x64efaults":`']);
  // A1-287-2: job keys that hand every run: to another shell, refused by the allowlist.
  shellCases.push([ci.replace(NEEDS, NEEDS + '    container: ubuntu:24.04\n'), 'has the job key `container`']);
  shellCases.push([ci.replace(NEEDS, NEEDS + '    container:\n      image: ubuntu:24.04\n'), 'has the job key `container`']);
  shellCases.push([ci.replace(NEEDS, NEEDS + '    services:\n      cache:\n        image: redis:7\n'), 'services: block is not the pinned postgres:17 container']);
  shellCases.push([ci.replace(NEEDS, NEEDS + "    'container': ubuntu:24.04\n"), 'has the job key `container`']);
  shellCases.push([ci.replace(TOOLCHAIN_STEP + '        run: |\n', TOOLCHAIN_STEP + '        run: |\n          # shell: x\n'), 'names `# shell: x`']);
  // A YAML comment outside a block body is still a comment, and is not read: ci.yml's own comments stay free.
  assert.deepEqual(shellProblems(ci.replace(TOOLCHAIN_STEP, TOOLCHAIN_STEP + '        # shell: x, $GITHUB_ENV\n')), [], 'a YAML comment is not read');
  assert.deepEqual(runnerEnvWriteProblems(ci.replace(TOOLCHAIN_STEP, TOOLCHAIN_STEP + '        # shell: x, $GITHUB_ENV\n')), [], 'a YAML comment is not read');
  for (const [mutated, expected] of shellCases) {
    assert.notEqual(mutated, ci);
    const problems = shellProblems(mutated);
    assert.ok(problems.some((p) => p.includes(expected)), 'refused: ' + expected + ' (found ' + JSON.stringify(problems) + ')');
  }
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
  assert.match(judgeIncluded('src/modules/platform-kernel/adapters/probe-store.ts', reachable), /§6\.3\/5/);
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

test('A1-257-9, A1-257-8, C0-257r4-2: the application job runs every step with NODE_OPTIONS empty, and the records say what the graph check does not see', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  // Job-level, beside the telemetry switch, so every step has it; no step, and no write to $GITHUB_ENV, sets it again.
  const nodeOptions = (text) => {
    const app = workflowJobs(text).get('application');
    return {
      job: /^ {4}env:\n {6}NEXT_TELEMETRY_DISABLED: '1'\n {6}NODE_OPTIONS: ''$/m.test(app.head.join('\n')),
      steps: app.steps.filter((s) => /NODE_OPTIONS|GITHUB_ENV/.test(s.raw)).map((s) => s.name ?? s.uses),
    };
  };
  assert.deepEqual(nodeOptions(ci), { job: true, steps: [] }, 'NODE_OPTIONS is empty for the whole application job, and nothing sets it again (A1-257-9)');
  // The negative controls: the job-level line removed, and a step that sets it again.
  const without = ci.replace("      NEXT_TELEMETRY_DISABLED: '1'\n      NODE_OPTIONS: ''\n", "      NEXT_TELEMETRY_DISABLED: '1'\n");
  assert.notEqual(without, ci);
  assert.equal(nodeOptions(without).job, false, 'a job without it is seen');
  const reset = ci.replace('      - name: Build the web application\n', '      - name: Build the web application\n        env:\n          NODE_OPTIONS: --import ./db/probe/preload.mjs\n');
  assert.notEqual(reset, ci);
  assert.deepEqual(nodeOptions(reset).steps, ['Build the web application'], 'a step that sets it again is seen');
  const exported = ci.replace('        run: npm run build --workspace apps/web\n', '        run: |\n          echo "NODE_OPTIONS=--import ./x.mjs" >> "$GITHUB_ENV"\n          npm run build --workspace apps/web\n');
  assert.notEqual(exported, ci);
  assert.deepEqual(nodeOptions(exported).steps, ['Build the web application'], 'a write to $GITHUB_ENV is seen');

  // The records stop claiming that the graph check closes the class "whatever route a module took", and
  // say what holds code that runs during the build instead (A1-257-9's last paragraph).
  const rfc = await readFile('architecture/decisions/RFC-2026-029-application-tier-stack.md', 'utf8');
  const graph = await readFile('scripts/verify-app-build-graph.mjs', 'utf8');
  const library = await readFile('scripts/app-boundaries.mjs', 'utf8');
  for (const [name, text] of [['ci.yml', ci], ['RFC-2026-029', rfc], ['verify-app-build-graph.mjs', graph], ['app-boundaries.mjs', library]]) {
    assert.doesNotMatch(text.replace(/\s+/g, ' '), /whatever route|closes the class|What the shapes miss/, `${name} does not say the graph check closes the class`);
  }
  const paragraph = rfc.slice(rfc.indexOf('**Build configuration, and what the build included'), rfc.indexOf('**`typescript` in the boundary guard\'s parser (§3.2).**')).replace(/\s+/g, ' ');
  assert.match(paragraph, /reads what the build output names/);
  assert.match(paragraph, /It reads what the output names, not what ran to make it\./);
  assert.match(paragraph, /anything under a `\.config\/` directory/);
  const status = rfc.slice(rfc.indexOf('Status of this amendment:'), rfc.indexOf('**What was found.**')).replace(/\s+/g, ' ');
  assert.match(status, /\(below, "Build configuration, and what the build included"\)/, 'the status paragraph names the new paragraph (C0-257r4-2)');
  assert.match(ci.replace(/\n\s*# ?/g, ' '), /it reads what the output names, not what ran to make it/);
  assert.match(graph.replace(/\n\/\/ ?/g, ' '), /`next\/dynamic\(\.\.\., \{ ssr: false \}\)` is not rendered on the server and may be in client chunks alone, so it may be an exception this check does not see \(not measured; C0-257r4-2\)/);
});

// A1-257-10. The step that runs the boundary guard again: the one immediately before the build, after
// every step that runs repository code, with the parsed reader required. Returns the problems.
function guardBeforeBuild(steps) {
  const GUARD = 'node scripts/verify-app-boundaries.mjs --require-parser';
  const build = steps.findIndex((s) => s.run === 'npm run build --workspace apps/web');
  if (build === -1) return ['no step builds the web application'];
  const runs = steps.map((s, i) => [s, i]).filter(([s]) => s.run === GUARD).map(([, i]) => i);
  const problems = [];
  if (runs.length !== 2) problems.push(`the boundary guard runs ${runs.length} time(s); it runs after the install and again before the build`);
  if (steps[build - 1]?.run !== GUARD) problems.push(`the step before the build is "${steps[build - 1]?.name}", not the boundary guard`);
  const tests = steps.findIndex((s) => s.run === 'npm run test:app');
  if (tests === -1 || tests > build - 1) problems.push('the guard\'s second run does not follow the application tests');
  return problems;
}

test('A1-257-10: CI runs the boundary guard a second time, as the step immediately before the build, after the steps that run repository code', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const steps = workflowJobs(ci).get('application').steps;
  assert.deepEqual(guardBeforeBuild(steps), [], 'the guard runs again immediately before npm run build');
  const names = steps.map((s) => s.name);
  assert.deepEqual(names.slice(names.indexOf('Application tests'), names.indexOf('Build the web application') + 1),
    ['Application tests', 'Verify the application boundaries again, before the build (parsed)', 'Build the web application']);
  // The negative controls: the second run removed, moved before the tests, and run without the parser.
  const SECOND = '      - name: Verify the application boundaries again, before the build (parsed)\n        run: node scripts/verify-app-boundaries.mjs --require-parser\n';
  const removed = ci.replace(SECOND, '');
  assert.notEqual(removed, ci);
  assert.match(guardBeforeBuild(workflowJobs(removed).get('application').steps).join(' | '), /runs 1 time\(s\)[\s\S]*the step before the build is "Application tests"/, 'removed');
  const early = removed.replace('      - name: Application tests\n', `${SECOND}      - name: Application tests\n`);
  assert.notEqual(early, removed);
  assert.match(guardBeforeBuild(workflowJobs(early).get('application').steps).join(' | '), /the step before the build is "Application tests"/, 'moved before the tests');
  const bare = ci.replace(SECOND, SECOND.replace(' --require-parser\n', '\n'));
  assert.notEqual(bare, ci);
  assert.match(guardBeforeBuild(workflowJobs(bare).get('application').steps).join(' | '), /runs 1 time\(s\)[\s\S]*not the boundary guard/, 'without --require-parser');
  // The comment says what it catches and what it does not.
  assert.match(ci.replace(/\n\s*# ?/g, ' '), /A1-257-10: the boundary guard again, as the step immediately before the build\.[^]*A file written later, or by a process still running, is not/);
});

test('A1-257-10: the records say that code the repository runs in CI after the guard could still write files or change the output, and that this residual is held by review, not by a check', async () => {
  const flat = (text) => text.replace(/\n\s*(?:#|\/\/) ?/g, ' ').replace(/\s+/g, ' ');
  const rfc = await readFile('architecture/decisions/RFC-2026-029-application-tier-stack.md', 'utf8');
  const paragraph = flat(rfc.slice(rfc.indexOf('**Build configuration, and what the build included'), rfc.indexOf('**`typescript` in the boundary guard\'s parser (§3.2).**')));
  const ci = flat(await readFile('.github/workflows/ci.yml', 'utf8'));
  const allowlist = await loadAllowlist();
  const library = flat(await readFile('scripts/app-boundaries.mjs', 'utf8'));
  const graph = flat(await readFile('scripts/verify-app-build-graph.mjs', 'utf8'));
  const records = [['the RFC paragraph', paragraph], ['ci.yml', ci], ['configShapes.$comment', allowlist.configShapes.$comment], ['app-boundaries.mjs', library], ['verify-app-build-graph.mjs', graph]];
  // A sentence that says build-time code is held by the shapes and refusals, as if that were all of it.
  const COMPLETE = /(?:that|it) is held (?:here, )?by (?:the|those) (?:configuration )?shapes|is held by those shapes|The shapes and these refusals hold what runs during the build|That is held before the build, by the configuration shapes/;
  for (const [name, text] of records) {
    assert.match(text, /held by review of every pull request, not by (?:a|this) check/, `${name} names the residual and who holds it`);
    assert.match(text, /could still write files/, `${name} says what that code could do`);
    assert.match(text, /a test|a page/, `${name} names the code`);
    assert.doesNotMatch(text, COMPLETE, `${name} does not say build-time code is held by the shapes and refusals as if that were complete`);
  }
  assert.match(paragraph, /\(a test under `npm run test:app`, a page's own code when `next build` prerenders it, build-time code it imports, each with the Node builtins the guard admits\)/);
  assert.match(paragraph, /The guard's second run catches a refused file such code has left on disk by then, not one written later or by a process still running\./);
  assert.match(paragraph, /no `prebuild` or `postbuild` hook and no changed build command runs around `next build`/);
  // The negative control: each record as round four left it is refused by the same reading.
  for (const old of [
    'It does not see code that runs during the build (a preload, a loader, a PostCSS or Babel plugin), which can change the output after the traces and maps are written: that is held by the configuration shapes, the `.config/` and `.env` refusals and the empty `NODE_OPTIONS`, not by the graph check (A1-257-8, A1-257-9).',
    'and is held by those shapes, the guard\'s `.env` and `.config/` refusals and the empty NODE_OPTIONS above, not by this check (A1-257-8, A1-257-9).',
    "The shapes and these refusals hold what runs during the build (a loader, a PostCSS or Babel plugin), with the guard's refusal of a tracked `.env*` file and CI's NODE_OPTIONS set to '' (A1-257-9)",
    'so it is held here, by the shapes, the refused files and those two rules, and not by the graph check.',
    'That is held before the build, by the configuration shapes and refused files of scripts/app-boundaries.mjs',
  ]) assert.match(old, COMPLETE, `the reading refuses round four's sentence: ${old.slice(0, 60)}`);
});

// Q0-259-1, Q0-AUD1015-5: `npm run typecheck` reads the application's modules under src/. A glob is read as
// TypeScript reads `include` and `exclude`: `**/` is any run of directories, `*` any name part, and an
// exclude pattern also takes everything under a directory it names. Each problem names what is gone.
const globToRegExp = (glob) => new RegExp(`^${glob.split(/(\*\*\/|\*\*|\*|\?)/).map((part) => (
  part === '**/' ? '(?:[^/]+/)*' : part === '**' ? '.*' : part === '*' ? '[^/]*' : part === '?' ? '[^/]' : part.replace(/[.+^${}()|[\]\\]/g, '\\$&'))).join('')}$`);
function sourceTreeProblems(project, sources) {
  const problems = [];
  const include = Array.isArray(project.include) ? project.include : [];
  const exclude = Array.isArray(project.exclude) ? project.exclude : [];
  for (const pattern of ['src/**/*.ts', 'src/**/*.tsx']) {
    if (!include.includes(pattern)) problems.push(`tsconfig.json's include does not hold "${pattern}"`);
  }
  const excluded = (path) => exclude.some((pattern) => {
    const glob = globToRegExp(pattern.replace(/^\.\//, '').replace(/\/$/, ''));
    const parts = path.split('/');
    return parts.some((_, i) => glob.test(parts.slice(0, i + 1).join('/')));
  });
  for (const path of sources) {
    if (excluded(path)) problems.push(`tsconfig.json's exclude takes ${path} out of the type check`);
    else if (!include.some((pattern) => globToRegExp(pattern).test(path))) problems.push(`tsconfig.json's include does not reach ${path}`);
  }
  return problems;
}

test('Q0-259-1: the type check reads every TypeScript file under src/: include holds src/**/*.ts and src/**/*.tsx, and nothing excludes src/**', async () => {
  const project = JSON.parse(await readFile('tsconfig.json', 'utf8'));
  const walk = async (directory) => {
    const out = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) out.push(...await walk(path));
      else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(path);
    }
    return out;
  };
  const real = await walk('src');
  assert.ok(real.length > 0, 'src/ holds TypeScript today (src/modules/platform-kernel, WP-1A-A0-003)');
  // Synthetic paths beside the real ones, so a pattern that spares today's files but not a .tsx or a new module is seen.
  const sources = [...real, 'src/modules/x/index.ts', 'src/modules/x/application/view.tsx', 'src/modules/x/domain/a/b/c.ts'];
  assert.deepEqual(sourceTreeProblems(project, sources), []);
  // The negative controls: Q0's M1, M2 and M3 (q0-review-2026-10-13-pr259.md §6), and the other ways to drop src/.
  const mutate = (change) => { const copy = structuredClone(project); change(copy); return sourceTreeProblems(copy, sources).join(' | '); };
  const without = (...patterns) => (copy) => { copy.include = copy.include.filter((p) => !patterns.includes(p)); };
  assert.match(mutate(without('src/**/*.ts', 'src/**/*.tsx')), /does not hold "src\/\*\*\/\*\.ts"[\s\S]*does not reach src\/modules\/platform-kernel\//, "Q0's M1: both src/** patterns removed");
  assert.match(mutate((copy) => { copy.exclude.push('src/**'); }), /exclude takes src\/modules\/platform-kernel\/[^ ]+ out of the type check/, "Q0's M2: src/** excluded");
  assert.match(mutate(without('src/**/*.tsx')), /does not hold "src\/\*\*\/\*\.tsx"[\s\S]*does not reach src\/modules\/x\/application\/view\.tsx/, "Q0's M3: src/**/*.tsx alone removed");
  assert.match(mutate(without('src/**/*.ts')), /does not hold "src\/\*\*\/\*\.ts"/, 'src/**/*.ts alone removed');
  for (const pattern of ['src', './src/', 'src/modules', '**/modules/**', 'src/**/*.ts', '**/*.tsx', 'src/modules/platform-kernel']) {
    assert.match(mutate((copy) => { copy.exclude.push(pattern); }), /out of the type check/, `"${pattern}" in exclude`);
  }
  assert.match(mutate((copy) => { delete copy.include; }), /does not hold "src\/\*\*\/\*\.ts"/, 'include removed');
  assert.match(mutate((copy) => { copy.include = copy.include.map((p) => p.replace(/^src\//, 'src/modules/platform-kernel/')); }), /does not hold/, 'include narrowed to one module');
  // Positive controls: the exclusions tsconfig.json holds today, and their like, spare src/.
  assert.deepEqual(project.exclude, ['node_modules', '**/node_modules', 'apps/**/.next', 'test-kits/**']);
  assert.deepEqual(sourceTreeProblems({ ...project, exclude: [...project.exclude, 'apps/web/**', '**/*.d.ts.map'] }, sources), []);
});

test('Q0-257r6-1 (a): the graph check\'s controls runner reports a control that is not refused, and the CLI exits 1 on it before it reads the build', async () => {
  const allowlist = await loadAllowlist();
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const reachable = reachablePackages(lock, allowlist);
  assert.deepEqual(runBuildControls(reachable), []);
  // A reachable set that admits left-pad: the one control that rests on it is no longer refused, and the runner says so
  // (Q0's M200 hollowed the runner to return [] and every suite still passed).
  assert.deepEqual(runBuildControls(new Set([...reachable, 'left-pad'])),
    [`control "a package no allowlisted package depends on" was not refused: ${'no problem reported'}`]);
  // A reachable set without next: the clean control build is refused, and the runner says so.
  const withoutNext = new Set([...reachable].filter((name) => name !== 'next'));
  assert.match(runBuildControls(withoutNext).join(' | '), /^the clean control build was refused: node_modules\/next\/[^ ]+ is in the package next/);
  // The CLI, run where package-lock.json makes left-pad reachable (next depends on it): exit 1 on the failed
  // control, before it reads the build directory, which does not exist. With the real lockfile the same run
  // passes the controls and stops at the build directory, so the first refusal is the controls'.
  const root = await mkdtemp(join(tmpdir(), 'app-build-controls-'));
  try {
    await mkdir(join(root, 'scripts'), { recursive: true });
    await writeFile(join(root, ALLOWLIST_PATH), await readFile(ALLOWLIST_PATH, 'utf8'));
    const run = async (lockfile) => {
      await writeFile(join(root, 'package-lock.json'), JSON.stringify(lockfile));
      return spawnSync(process.execPath, [resolve('scripts/verify-app-build-graph.mjs'), 'no-build-here'], { cwd: root, encoding: 'utf8' });
    };
    const poisoned = structuredClone(lock);
    poisoned.packages['node_modules/next'].dependencies = { ...poisoned.packages['node_modules/next'].dependencies, 'left-pad': '1.3.0' };
    poisoned.packages['node_modules/left-pad'] = { version: '1.3.0', license: 'WTFPL' };
    const refused = await run(poisoned);
    assert.equal(refused.status, 1, refused.stderr);
    assert.match(refused.stderr, /^application build graph: 1 negative control\(s\) failed; the check cannot be trusted on the build\n {2}control "a package no allowlisted package depends on" was not refused/);
    assert.doesNotMatch(refused.stderr, /cannot be read/, 'the build is not read once a control has failed');
    const clean = await run(lock);
    assert.equal(clean.status, 1, clean.stderr);
    assert.match(clean.stderr, /^application build graph: no-build-here cannot be read/, 'with every control refused, the CLI goes on to the build');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// Q0-257r6-1 (b): the boundary CLI reads each build configuration with both readers and uses a reading only when
// they agree (A1-257-7). No test may import the CLI (above: it loads the parsed reader, which imports
// `typescript`), so its `parsedShape` is taken from the file's text and run with a stand-in parser, as the text
// reader is run in npm run check. Each problem names a part of the rule that is gone.
function agreementProblems(cli) {
  const problems = [];
  const source = cli.match(/^function parsedShape\(parser, files\) \{\n[\s\S]*?\n\}\n/m)?.[0];
  if (!source) return ['the CLI holds no function parsedShape(parser, files)'];
  // The CLI reads its controls' configurations and the repository's through parsedShape, and never one reader alone.
  if (!cli.includes('checkResolutionConfigs(cleanConfigs, allowlist, { readShape: parsedShape(parser, cleanConfigs) })')) problems.push('the clean configurations are not read through parsedShape');
  if (!cli.includes('checkResolutionConfigs(configs, allowlist, { readShape: parsedShape(parser, configs) })')) problems.push('the alias controls are not read through parsedShape');
  if (!cli.includes('const configShape = parser ? parsedShape(parser, configs) : readConfigShape;') || !cli.includes('...checkResolutionConfigs(configs, allowlist, { readShape: configShape }),')) {
    problems.push('the repository\'s configurations are not read through parsedShape when the parser loads');
  }
  const parsedShape = new Function('readConfigShape', `${source}\nreturn parsedShape;`)(readConfigShape);
  const shapes = { 'next.config': { imports: [{ specifier: 'next', typeOnly: true, names: ['NextConfig'] }], types: ['NextConfig'], value: { poweredByHeader: 'boolean' } } };
  // A stand-in for the parsed reader, returning for the one file what scripts/app-boundaries-parser.mjs returns:
  // { found, refusals, anys, shape } for a file it parses, and { found: [], refusals: [...] } with no shape for one it
  // cannot (measured with typescript 7.0.2: an `import type` in a .mjs file "does not parse"; a hashbang reads).
  const verdict = (path, raw, reading) => checkResolutionConfigs(new Map([[path, raw]]), { configShapes: shapes },
    { readShape: parsedShape({ parse: () => new Map(reading === undefined ? [] : [[path, reading]]) }, new Map([[path, raw]])) }).join(' | ');
  const parsedAs = (shape) => ({ found: [], refusals: [], anys: [], shape });
  const NEXT = 'apps/web/next.config.ts';
  const config = (value) => `import type { NextConfig } from 'next';\nconst config: NextConfig = { poweredByHeader: ${value} };\nexport default config;\n`;
  const agreed = config('false');
  const expect = (what, got, reason) => {
    if (got === '') problems.push(`${what} is not refused`);
    else if (!reason.test(got)) problems.push(`${what} is refused for another reason: ${got}`);
  };
  if (verdict(NEXT, agreed, parsedAs(readConfigShape(agreed))) !== '') problems.push('two equal readings of an allowlisted configuration are refused');
  // The readers disagree, each reading an allowlisted shape on its own: only the agreement rule refuses it.
  expect('two readings that differ', verdict(NEXT, agreed, parsedAs(readConfigShape(config('true')))), /the TypeScript parser and the text reader read it differently/);
  // Q0's second direction: the parser reads past a hashbang, the text reader refuses it.
  expect('a file the text reader refuses and the parser reads', verdict(NEXT, `#!/usr/bin/env node\n${agreed}`, parsedAs(readConfigShape(agreed))), /`#` at offset 0/);
  // Q0's first direction: the text reader reads an `import type` in a .mjs file, the parser cannot parse it.
  const MJS = 'apps/web/next.config.mjs';
  expect('a file the parser cannot parse and the text reader reads', verdict(MJS, agreed, { found: [], refusals: [`does not parse ('import type' declarations can only be used in TypeScript files.)`] }), /does not parse/);
  expect('a file whose shape the parser refuses and the text reader reads', verdict(NEXT, agreed, parsedAs({ statements: [], refusals: ['a spread the parser reads'] })), /a spread the parser reads/);
  expect('a file the parser returned nothing for', verdict(NEXT, agreed, undefined), /the parsed reader returned nothing for this file/);
  return problems;
}

test('Q0-257r6-1 (b): the boundary CLI uses a build configuration\'s reading only when its two readers agree, and either reader\'s refusal is a refusal', async () => {
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  assert.deepEqual(agreementProblems(cli), []);
  // The negative controls: Q0's M176 and M177 (q0-reread5-2026-10-12-pr257.md §5), and the rule's other parts.
  const swap = (from, to) => { assert.ok(cli.includes(from), from); return cli.replace(from, to); };
  const RETURN = "    if (!result?.shape) return { statements: [], refusals: result?.refusals?.length ? result.refusals : ['the parsed reader returned nothing for this file'] };\n";
  const m176 = swap(RETURN, '    return text;\n');
  assert.deepEqual(agreementProblems(m176).filter((p) => / is not refused$/.test(p)).length, 4, "Q0's M176: the text reading alone decides");
  assert.match(agreementProblems(m176).join(' | '), /two readings that differ is not refused[\s\S]*a file the parser cannot parse and the text reader reads is not refused/);
  const TEXT_CHECKS = "    if (text.refusals.length > 0) return text;\n    if (JSON.stringify(result.shape) !== JSON.stringify(text)) return { statements: [], refusals: ['the TypeScript parser and the text reader read it differently'] };\n";
  const m177 = swap(TEXT_CHECKS, '');
  assert.deepEqual(agreementProblems(m177), ['two readings that differ is not refused', 'a file the text reader refuses and the parser reads is not refused'], "Q0's M177: the parsed reading alone decides");
  const unequal = swap("    if (JSON.stringify(result.shape) !== JSON.stringify(text)) return { statements: [], refusals: ['the TypeScript parser and the text reader read it differently'] };\n", '');
  assert.deepEqual(agreementProblems(unequal), ['two readings that differ is not refused'], 'the comparison removed');
  const nothing = swap(RETURN, '    if (!result?.shape) return text;\n');
  assert.deepEqual(agreementProblems(nothing), ['a file the parser cannot parse and the text reader reads is not refused', 'a file the parser returned nothing for is not refused'], 'a missing parsed reading read as the text reading');
  // Dropping either reader's own refusal leaves the file refused through the comparison; the reason reported is lost.
  const textIgnored = swap('    if (text.refusals.length > 0) return text;\n', '');
  assert.match(agreementProblems(textIgnored).join(' | '), /^a file the text reader refuses and the parser reads is refused for another reason: .*read it differently \(A1-257-7; [^|]*$/, 'the text reader\'s refusal dropped');
  const parserIgnored = swap('    if (result.shape.refusals.length > 0) return result.shape;\n', '');
  assert.match(agreementProblems(parserIgnored).join(' | '), /^a file whose shape the parser refuses and the text reader reads is refused for another reason: .*read it differently \(A1-257-7; [^|]*$/, 'the parser\'s refusal dropped');
  const textAlone = swap('  const configShape = parser ? parsedShape(parser, configs) : readConfigShape;', '  const configShape = readConfigShape;');
  assert.match(agreementProblems(textAlone).join(' | '), /the repository's configurations are not read through parsedShape/, 'the repository\'s configurations read by the text reader alone');
  const controlsAlone = swap('checkResolutionConfigs(configs, allowlist, { readShape: parsedShape(parser, configs) })', 'checkResolutionConfigs(configs, allowlist, { readShape: readConfigShape })');
  assert.match(agreementProblems(controlsAlone).join(' | '), /the alias controls are not read through parsedShape/, 'the alias controls read by the text reader alone');
  assert.deepEqual(agreementProblems(cli.replace('function parsedShape(parser, files) {', 'function shapeOfBoth(parser, files) {')), ['the CLI holds no function parsedShape(parser, files)']);
});
