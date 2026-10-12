import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import {
  CODE,
  checkBoundaries,
  checkJsxPragmas,
  checkRepositoryImports,
  checkResolutionConfigs,
  checkSecretsAndMigrations,
  checkTypeDirectives,
  collectDirectories,
  collectRepositoryCode,
  collectResolutionConfigs,
  collectSources,
  extractSpecifiers,
} from './app-boundaries.mjs';
import { ALLOWLIST_PATH, loadAllowlist } from './verify-app-dependencies.mjs';

// RFC-2026-029 §8/4 (the §6.3 boundaries, path aliases and JSX pragmas included), §2.1/3 (no
// `@ts-ignore`, a reasoned `@ts-expect-error`, no `any`) and §8/5, as a guard (WP-1A-A0-002). The rules are scripts/app-boundaries.mjs's; this is the
// command that applies them to the repository. It also holds §3's cells over every code file outside
// the application tree, for the packages they import (checkRepositoryImports), so that `typescript` is
// imported by scripts/app-boundaries-parser.mjs alone (Amendment 2026-10-12).
//
//   node scripts/verify-app-boundaries.mjs                   the parsed reader if `typescript` loads,
//                                                            else the dependency-free text reader
//   node scripts/verify-app-boundaries.mjs --require-parser  the parsed reader, or exit 1 (CI)
//
// With the parsed reader it first runs its NEGATIVE CONTROLS: synthetic trees built to break one rule
// each, every one of which must be refused, and one clean tree that must pass. A reader that cannot
// see the line `export const a = <div></div>; import x from 'pg';` (A1-257-1) has no business reporting
// a clean repository, so a control that passes fails the run before the repository is read.
//
// This file and scripts/app-boundaries-parser.mjs are not imported by any test: `npm run check` drives
// the library through test-kits/app-boundaries.test.mjs with the text reader, and runs no dependency
// code (RFC-2026-029 §2.1/4). CI runs this command with --require-parser in its application job.

const tree = (entries) => new Map(Object.entries(entries));
const CLEAN = {
  'src/modules/identity-workspace/index.ts': "export { createWorkspace } from './application/create';\n",
  'src/modules/identity-workspace/application/create.ts': "import type { Workspace } from '../domain/workspace';\nexport const createWorkspace = (w: Workspace): Workspace => w;\n",
  'src/modules/identity-workspace/domain/workspace.ts': "export type Workspace = { readonly id: string };\n",
  'src/modules/platform-kernel/index.ts': 'export const kernel = 1;\n',
  'src/modules/platform-kernel/adapters/job-store.ts': "import { Pool } from 'pg';\nexport const jobs = (): unknown => Pool;\n",
  'apps/web/app/page.tsx': "import { createWorkspace } from '../../../src/modules/identity-workspace/index';\n"
    + 'export default function Page() { return <main>{String(createWorkspace)}</main>; }\n',
  'apps/web/app/page.test.tsx': "import { it } from 'vitest';\n// @ts-expect-error -- the reason is written on the line\nit('x', () => undefined);\n",
  'apps/web/next.config.ts': "import type { NextConfig } from 'next';\nconst config: NextConfig = {};\nexport default config;\n",
  'apps/worker/composition/jobs.ts': "import { jobs } from '../../../src/modules/platform-kernel/adapters/job-store';\nexport const run = jobs;\n",
  // RFC-2026-029 Amendment 2026-10-12: the one file `typescript`'s §3.2 cell admits.
  'scripts/app-boundaries-parser.mjs': "import typescript from 'typescript';\nimport { SyntaxKind } from 'typescript/unstable/ast';\nexport const t = [typescript, SyntaxKind];\n",
};

// Each control: the files it changes, and the problem the guard must report for it.
export const CONTROLS = [
  ['A1-257-1: a static import after a JSX closing tag, on the same line', { 'apps/web/app/x.tsx': "export const a = <div></div>; import x from 'pg';\nexport const b = x;\n" },
    /apps\/web\/app\/x\.tsx (?:imports pg|reaches pg)/],
  ['Q0-257-3: an import after a closing tag inside a component', { 'apps/web/app/page.tsx': "export default function Page() { return (<main>\n</main>); } import { Pool } from 'pg'; export const pool = Pool;\n" },
    /apps\/web\/app\/page\.tsx (?:imports pg|reaches pg)/],
  ['MOD-900: a page importing @supabase/ssr', { 'apps/web/app/page.tsx': "import { createServerClient } from '@supabase/ssr';\nexport default createServerClient;\n" },
    /RFC-2026-029 allows @supabase\/ssr only/],
  ['§6.3/5: apps/web reaching the platform-kernel adapters', { 'apps/web/composition/jobs.ts': "import { jobs } from '../../../src/modules/platform-kernel/adapters/job-store';\nexport const j = jobs;\n" },
    /nothing under apps\/web reaches pg or src\/modules\/platform-kernel\/adapters/],
  ['§2.1/3: // @ts-ignore', { 'apps/web/app/x.ts': '// @ts-ignore\nexport const n: number = 1;\n' }, /uses `@ts-ignore`/],
  ['§2.1/3: an `any` annotation', { 'apps/web/app/x.ts': 'export const loose: any = 1;\n' }, /x\.ts:1 uses the type `any`/],
  ['§2.1/3: `as any` inside JSX', { 'apps/web/app/x.tsx': 'export const e = <b>{(1 as any) as number}</b>;\n' }, /x\.tsx:1 uses the type `any`/],
  ['§2.1/3: a bare @ts-expect-error', { 'apps/web/app/x.ts': '// @ts-expect-error\nexport const n: number = 1;\n' }, /`@ts-expect-error` with no reason/],
  ['a computed dynamic import', { 'apps/web/app/x.ts': "const name = 'pg';\nexport const m = import(name);\n" }, /dynamic import\(\) whose argument is not one string literal/],
  ['an import = require()', { 'apps/web/app/x.ts': "import pg = require('pg');\nexport const p = pg;\n" }, /CommonJS loading/],
  ['a require in a .js file', { 'apps/web/app/x.js': "const pg = require('pg');\nexport default pg;\n" }, /`require` is CommonJS loading/],
  ['a file that does not parse', { 'apps/web/app/x.ts': "import { Pool } from 'pg'\nexport const = ;\n" }, /does not parse/],
  ['an import(\'pg\') type in a page', { 'apps/web/app/x.ts': "export type P = import('pg').Pool;\n" }, /apps\/web\/app\/x\.ts imports pg/],
  ['Amendment 2026-10-12: typescript imported by a script other than the parser', { 'scripts/other.mjs': "import ts from 'typescript';\nexport default ts;\n" },
    /scripts\/other\.mjs imports typescript: RFC-2026-029 allows typescript only nowhere, except/],
  ['Amendment 2026-10-12: a typescript subpath imported by a test', { 'test-kits/x.test.mjs': "import { API } from 'typescript/unstable/sync';\nexport const a = API;\n" },
    /test-kits\/x\.test\.mjs imports typescript\/unstable\/sync/],
  ['Amendment 2026-10-12: typescript imported by a page', { 'apps/web/app/x.ts': "import ts from 'typescript';\nexport default ts;\n" },
    /apps\/web\/app\/x\.ts imports typescript: RFC-2026-029 allows typescript only nowhere, except/],
  ['A1-257-5: a @jsxImportSource pragma in a page', { 'apps/web/app/x.tsx': '/** @jsxImportSource ../../../db/probe/rt */\nexport const e = <b>x</b>;\n' },
    /apps\/web\/app\/x\.tsx:1 uses the `@jsxImportSource` pragma/],
  ['A1-257-5: a @jsx and a @jsxFrag pragma in a module', { 'src/modules/identity-workspace/application/x.tsx': '/* @jsx h */\n/* @jsxFrag F */\nexport const e = 1;\n' },
    /x\.tsx:2 uses the `@jsxFrag` pragma/],
];

// Alias controls: the resolution configs (tsconfigs, next.config.*, vitest.config.*, package.json) are
// read from their text, and a next.config's imports through the parsed reader (A1-257-5).
export const ALIAS_CONTROLS = [
  ['an alias to pg through tsconfig paths', { 'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { zod: ['./node_modules/pg'] } } }) }, /sets compilerOptions\.paths/],
  ['a baseUrl', { 'apps/web/tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.' } }) }, /sets compilerOptions\.baseUrl/],
  ['a turbopack resolveAlias', { 'apps/web/next.config.ts': "export default { turbopack: { resolveAlias: { zod: 'pg' } } };\n" }, /names `resolveAlias`/],
  ['a webpack hook', { 'apps/web/next.config.ts': "export default { 'webpack': (c: unknown) => c };\n" }, /names `webpack`/],
  ['a next.config rewriting an import through modularizeImports', { 'apps/web/next.config.ts': "export default { modularizeImports: { zod: { transform: '../../db/probe/{{member}}' } } };\n" },
    /next\.config\.ts names `modularizeImports`/],
  ['a next.config running an SWC plugin', { 'apps/web/next.config.ts': "export default { experimental: { swcPlugins: [['./probe-plugin.wasm', {}]] } };\n" }, /next\.config\.ts names `swcPlugins`/],
  ['a vitest.config with resolve.alias', { 'vitest.config.ts': "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ resolve: { alias: { zod: './db/probe/target.ts' } } });\n" },
    /vitest\.config\.ts names `(?:resolve|alias)`/],
  ['a tsconfig extended from a package', { 'tsconfig.json': JSON.stringify({ extends: '@tsconfig/next/tsconfig.json' }) }, /is not a file in this repository/],
  ['A1-257-5: an extends into a JSON not named tsconfig, holding paths', {
    'tsconfig.base.json': '{}',
    'apps/web/tsconfig.json': JSON.stringify({ extends: './base.json' }),
    'apps/web/base.json': JSON.stringify({ extends: '../../tsconfig.base.json', compilerOptions: { paths: { zod: ['../../db/probe/target.ts'] } } }),
  }, /apps\/web\/base\.json sets compilerOptions\.paths/],
  ['A1-257-5: jsxImportSource in a tsconfig', { 'apps/web/tsconfig.json': JSON.stringify({ compilerOptions: { jsxImportSource: '../../db/probe/rt' } }) }, /sets compilerOptions\.jsxImportSource/],
  ['A1-257-5: a next.config spreading an object from a sibling module', {
    'apps/web/next.config.ts': "import type { NextConfig } from 'next';\nimport { extra } from './next-extra';\nconst config: NextConfig = { ...extra };\nexport default config;\n",
  }, /next\.config\.ts imports \.\/next-extra: a next\.config imports only allowlisted packages/],
  ['Q0-257r2-1: a browser field in a workspace package.json', {
    'package.json': JSON.stringify({ name: 'r', private: true, workspaces: ['apps/web'] }),
    'apps/web/package.json': JSON.stringify({ name: '@r/web', private: true, browser: { './lib/probe.ts': './lib/alt.ts' } }),
  }, /apps\/web\/package\.json declares `browser`/],
];

function judge(files, allowlist, extract) {
  return [
    ...checkBoundaries(files, allowlist, { extract }),
    ...checkRepositoryImports(files, allowlist, { extract }),
    ...checkTypeDirectives(files),
    ...checkJsxPragmas(files),
    ...checkSecretsAndMigrations(files, [], allowlist),
  ];
}

// The extract function over one parse of `files`: parsed results for code, the text reader for CSS.
function parsedExtract(parser, files) {
  const parsed = parser.parse(files);
  return (raw, path) => (CODE.test(path) ? (parsed.get(path) ?? { found: [], refusals: ['the parsed reader returned nothing for this file'], anys: [] }) : extractSpecifiers(raw, path));
}

export function runControls(parser, allowlist) {
  const failures = [];
  const clean = tree(CLEAN);
  const cleanProblems = judge(clean, allowlist, parsedExtract(parser, clean));
  if (cleanProblems.length > 0) failures.push(`the clean control tree was refused: ${cleanProblems.join(' | ')}`);
  for (const [name, overrides, pattern] of CONTROLS) {
    const files = tree({ ...CLEAN, ...overrides });
    const problems = judge(files, allowlist, parsedExtract(parser, files));
    if (!problems.some((p) => pattern.test(p))) failures.push(`control "${name}" was not refused: ${problems.join(' | ') || 'no problem reported'}`);
  }
  for (const [name, overrides, pattern] of ALIAS_CONTROLS) {
    const configs = tree(overrides);
    const problems = checkResolutionConfigs(configs, allowlist, { extract: parsedExtract(parser, configs) });
    if (!problems.some((p) => pattern.test(p))) failures.push(`control "${name}" was not refused: ${problems.join(' | ') || 'no problem reported'}`);
  }
  return failures;
}

async function loadParserModule(required) {
  try {
    return await import('./app-boundaries-parser.mjs');
  } catch (error) {
    const missing = error?.code === 'ERR_MODULE_NOT_FOUND' && /['"]typescript['"/]/.test(String(error.message));
    if (required || !missing) {
      console.error(`application boundaries: the parsed reader could not load (${error.message})${required ? '; --require-parser makes that a failure' : ''}`);
      process.exit(1);
    }
    return null;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const required = process.argv.includes('--require-parser');
  const allowlist = await loadAllowlist(ALLOWLIST_PATH);
  const files = await collectSources('.');
  const parserModule = await loadParserModule(required);
  let extract = extractSpecifiers;
  let parser = null;
  if (parserModule) {
    parser = parserModule.createParser();
    const failures = runControls(parser, allowlist);
    if (failures.length > 0) {
      parser.close();
      console.error(`application boundaries: ${failures.length} negative control(s) failed; the parsed reader cannot be trusted on the repository`);
      for (const failure of failures) console.error(`  ${failure}`);
      process.exit(1);
    }
    extract = parsedExtract(parser, files);
  }
  // The rest of the repository, for the packages it imports (Amendment 2026-10-12): read by the parsed
  // reader too when it is loaded, so a `typescript` import the text reader would misread is still seen.
  const repository = await collectRepositoryCode('.');
  const repositoryExtract = parser ? parsedExtract(parser, repository) : extractSpecifiers;
  // Every resolution config, the files their `extends` chains reach included; a next.config's imports
  // are read by the parsed reader too when it is loaded (A1-257-5).
  const configs = await collectResolutionConfigs('.');
  const configExtract = parser ? parsedExtract(parser, configs) : extractSpecifiers;
  const problems = [
    ...checkBoundaries(files, allowlist, { extract }),
    ...checkRepositoryImports(repository, allowlist, { extract: repositoryExtract }),
    ...checkTypeDirectives(files),
    ...checkJsxPragmas(files),
    ...checkSecretsAndMigrations(files, await collectDirectories('.'), allowlist),
    ...checkResolutionConfigs(configs, allowlist, { extract: configExtract }),
  ];
  parser?.close();
  if (problems.length > 0) {
    console.error(`application boundaries: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const count = [...files.keys()].filter((f) => /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|css)$/.test(f)).length;
  const others = `; ${repository.size} other code file(s) import no package outside their §3 cell (typescript: the parser only, Amendment 2026-10-12)`;
  if (parser) {
    console.log(`application boundaries: ${count} source file(s) keep RFC-2026-029 §6.3, §2.1/3 and §8/5, read by the TypeScript parser `
      + `(${CONTROLS.length + ALIAS_CONTROLS.length + 1} negative and positive controls held first)${others}`);
  } else {
    console.log(`application boundaries: ${count} source file(s) keep RFC-2026-029 §6.3, the §2.1/3 directives and §8/5, read by the dependency-free text reader${others}. `
      + '`typescript` did not load, so the parsed checks (the full import reading and §2.1/3\'s `any`) were not run here; CI runs them with --require-parser');
  }
}
