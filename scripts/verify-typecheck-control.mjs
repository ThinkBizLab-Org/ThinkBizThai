import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

// The negative control for `npm run typecheck` (RFC-2026-029 §8/3, WP-1A-A0-002).
//
// A green `tsc --noEmit` says nothing until the same compiler, under the same flags, is shown to go
// red. This runs in CI after `npm ci --ignore-scripts` and `npm run typecheck` -- it needs the
// installed `typescript`, so it is NOT part of `npm run check`, which stays dependency-free
// (RFC-2026-029 §2.1/4). It checks three things:
//
//   1. `tsc --noEmit -p test-kits/typecheck-control/tsconfig.json` FAILS, and reports every error the
//      fixture marks with `// expect: TSxxxx <flag>`, at that line, with that code: one per flag of
//      RFC-2026-029 §2.1/2. A flag switched off in tsconfig.base.json removes its error and fails this.
//   2. `tsc --noEmit -p test-kits/typecheck-control/tsconfig.allowjs.json` FAILS with TS6504, which is
//      "allowJs": false refusing a .js file.
//   3. `tsc --showConfig` on the two real projects (tsconfig.json, apps/web/tsconfig.json) reports
//      each §2.1/2 flag at its required value, so neither project overrides the base.
//
// The verdict functions are pure and exported; test-kits/app-stack.test.mjs drives them with
// synthetic compiler output (no node_modules), including every way this control could pass vacuously.

export const FIXTURE = 'test-kits/typecheck-control/mistyped.ts';
export const CONTROL_PROJECT = 'test-kits/typecheck-control/tsconfig.json';
export const ALLOWJS_PROJECT = 'test-kits/typecheck-control/tsconfig.allowjs.json';
export const PROJECTS = ['tsconfig.json', 'apps/web/tsconfig.json'];
export const TSC = 'node_modules/typescript/bin/tsc';

// RFC-2026-029 §2.1/2, and the value each must have.
export const REQUIRED_FLAGS = {
  strict: true,
  noUncheckedIndexedAccess: true,
  noImplicitOverride: true,
  noFallthroughCasesInSwitch: true,
  isolatedModules: true,
  allowJs: false,
};

// `// expect: TS7006 strict (noImplicitAny)` -> { line, code, flag }.
export function expectationsFrom(source) {
  const expected = [];
  source.split('\n').forEach((text, index) => {
    const m = text.match(/\/\/ expect: (TS\d+) ([A-Za-z]+)/);
    if (m) expected.push({ line: index + 1, code: m[1], flag: m[2] });
  });
  return expected;
}

// `path(line,col): error TSxxxx: message` -> { file, line, code }.
export function errorsFrom(output) {
  return [...output.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+):/gm)]
    .map((m) => ({ file: m[1], line: Number(m[2]), code: m[4] }));
}

export function controlVerdict({ expected, status, output, fixture = FIXTURE }) {
  const problems = [];
  const flags = new Set(expected.map((e) => e.flag));
  for (const flag of Object.keys(REQUIRED_FLAGS)) {
    if (flag !== 'allowJs' && !flags.has(flag)) problems.push(`the fixture marks no error for ${flag}; the control would not notice it switched off`);
  }
  if (status === 0) problems.push('tsc exited 0 on the deliberately mistyped fixture: the type check cannot fail, so its green means nothing');
  if (status === null || status === undefined) problems.push('tsc did not run to an exit status');
  const errors = errorsFrom(output);
  for (const { line, code, flag } of expected) {
    if (!errors.some((e) => e.file.endsWith(fixture) && e.line === line && e.code === code)) {
      problems.push(`${fixture}:${line} expects ${code} (${flag}) and tsc did not report it`);
    }
  }
  return problems;
}

export function allowJsVerdict({ status, output }) {
  const problems = [];
  if (status === 0) problems.push('tsc exited 0 on a .js file named in `files`: "allowJs": false is not in effect');
  if (!/error TS6504:/.test(output)) problems.push('tsc did not report TS6504 for the .js file: "allowJs": false is not what refused it');
  return problems;
}

export function flagsVerdict(project, shown) {
  const options = shown?.compilerOptions ?? {};
  return Object.entries(REQUIRED_FLAGS)
    .filter(([flag, value]) => options[flag] !== value)
    .map(([flag, value]) => `${project}: ${flag} is ${JSON.stringify(options[flag])} where RFC-2026-029 §2.1/2 requires ${value}`);
}

function tsc(args) {
  const result = spawnSync(process.execPath, [TSC, ...args], { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const expected = expectationsFrom(await readFile(FIXTURE, 'utf8'));
  const problems = [
    ...controlVerdict({ expected, ...tsc(['--noEmit', '--pretty', 'false', '-p', CONTROL_PROJECT]) }),
    ...allowJsVerdict(tsc(['--noEmit', '--pretty', 'false', '-p', ALLOWJS_PROJECT])),
  ];
  for (const project of PROJECTS) {
    const shown = tsc(['--showConfig', '-p', project]);
    let parsed = null;
    try { parsed = JSON.parse(shown.output); } catch { problems.push(`${project}: tsc --showConfig did not print JSON (exit ${shown.status})`); }
    if (parsed) problems.push(...flagsVerdict(project, parsed));
  }
  if (problems.length > 0) {
    console.error(`typecheck negative control: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`typecheck negative control: tsc failed the fixture with all ${expected.length} marked errors, refused a .js file (TS6504), and both projects carry the RFC-2026-029 §2.1/2 flags`);
}
