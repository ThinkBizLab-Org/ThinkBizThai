import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import {
  CODE,
  checkBoundaries,
  checkJsxPragmas,
  checkRepositoryImports,
  checkResolutionConfigs,
  checkSecretsAndMigrations,
  checkTrackedFiles,
  checkTypeDirectives,
  collectDirectories,
  collectRepositoryCode,
  collectResolutionConfigs,
  collectSources,
  collectTrackedFiles,
  extractSpecifiers,
  readConfigShape,
} from './app-boundaries.mjs';
import { ALLOWLIST_PATH, loadAllowlist } from './verify-app-dependencies.mjs';

// RFC-2026-029 §8/4 (the §6.3 boundaries, path aliases and JSX pragmas included), §2.1/3 (no
// `@ts-ignore`, a reasoned `@ts-expect-error`, no `any`) and §8/5, as a guard (WP-1A-A0-002). The rules are scripts/app-boundaries.mjs's; this is the
// command that applies them to the repository. It also holds §3's cells over every code file outside
// the application tree, for the packages they import (checkRepositoryImports), so that `typescript` is
// imported by scripts/app-boundaries-parser.mjs alone (Amendment 2026-10-12). And it refuses a tracked
// `.env*` file under apps/, src/ or at the root (`.env.example` excepted) and any tracked file under a
// `.config/` directory, read from `git ls-files` (checkTrackedFiles; A1-257-9, A1-257-8), and any
// workspace package.json whose `scripts` are not exactly the allowlisted ones (A1-257-10). CI runs it
// twice: after the install, and again immediately before the build, so a refused file that a test
// left on disk is seen; one written later, or by a process still running, is not (A1-257-10: that
// residual is held by review of every pull request, not by a check).
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
  ['A1-257-7: a Tailwind @plugin loading a module from outside the application', { 'apps/web/app/globals.css': "@import 'tailwindcss';\n@plugin '../../../db/probe/plugin.js';\n" },
    /apps\/web\/app\/globals\.css imports \.\.\/\.\.\/\.\.\/db\/probe\/plugin\.js/],
];

// Alias controls: the resolution configs (tsconfigs, package.json, and the build configurations, read
// as allowlisted shapes) through the parsed reader, which must agree with the text reader (A1-257-5,
// A1-257-7). CLEAN_CONFIGS is the skeleton's own three build configurations, which must pass that way.
export const CLEAN_CONFIGS = {
  'apps/web/next.config.ts': "import type { NextConfig } from 'next';\n// telemetry\nprocess.env.NEXT_TELEMETRY_DISABLED ??= '1';\n"
    + 'const nextConfig: NextConfig = {\n  images: { unoptimized: true },\n  poweredByHeader: false,\n  reactStrictMode: true,\n};\n\nexport default nextConfig;\n',
  'vitest.config.ts': "import { defineConfig } from 'vitest/config';\nexport default defineConfig({\n  test: {\n    include: ['apps/**/*.test.ts'],\n    exclude: ['**/node_modules/**'],\n    environment: 'node',\n    passWithNoTests: false,\n  },\n});\n",
  'apps/web/postcss.config.mjs': "const config = {\n  plugins: {\n    '@tailwindcss/postcss': {},\n  },\n};\n\nexport default config;\n",
};
const NEXT = 'apps/web/next.config.ts';
const shapeOf = (kind) => new RegExp(`is not the allowlisted ${kind.replace('.', '\\.')} shape`);
export const ALIAS_CONTROLS = [
  ['an alias to pg through tsconfig paths', { 'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { zod: ['./node_modules/pg'] } } }) }, /sets compilerOptions\.paths/],
  ['a baseUrl', { 'apps/web/tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.' } }) }, /sets compilerOptions\.baseUrl/],
  ['a turbopack resolveAlias', { [NEXT]: "export default { turbopack: { resolveAlias: { zod: 'pg' } } };\n" }, /`turbopack` is a key the allowlisted shape does not name/],
  ['a webpack hook', { [NEXT]: "export default { 'webpack': (c: unknown) => c };\n" }, shapeOf('next.config')],
  ['a next.config rewriting an import through modularizeImports', { [NEXT]: "export default { modularizeImports: { zod: { transform: '../../db/probe/{{member}}' } } };\n" },
    /`modularizeImports` is a key the allowlisted shape does not name/],
  ['a next.config running an SWC plugin', { [NEXT]: "export default { experimental: { swcPlugins: [['./probe-plugin.wasm', {}]] } };\n" }, /`experimental` is a key the allowlisted shape does not name/],
  ['a vitest.config with resolve.alias', { 'vitest.config.ts': "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ resolve: { alias: { zod: './db/probe/target.ts' } } });\n" },
    /vitest\.config\.ts is not the allowlisted vitest\.config shape: `resolve` is a key/],
  ['a tsconfig extended from a package', { 'tsconfig.json': JSON.stringify({ extends: '@tsconfig/next/tsconfig.json' }) }, /is not a file in this repository/],
  ['A1-257-5: an extends into a JSON not named tsconfig, holding paths', {
    'tsconfig.base.json': '{}',
    'apps/web/tsconfig.json': JSON.stringify({ extends: './base.json' }),
    'apps/web/base.json': JSON.stringify({ extends: '../../tsconfig.base.json', compilerOptions: { paths: { zod: ['../../db/probe/target.ts'] } } }),
  }, /apps\/web\/base\.json sets compilerOptions\.paths/],
  ['A1-257-5: jsxImportSource in a tsconfig', { 'apps/web/tsconfig.json': JSON.stringify({ compilerOptions: { jsxImportSource: '../../db/probe/rt' } }) }, /sets compilerOptions\.jsxImportSource/],
  ['A1-257-5: a next.config spreading an object from a sibling module', {
    [NEXT]: "import type { NextConfig } from 'next';\nimport { extra } from './next-extra';\nconst config: NextConfig = { ...extra };\nexport default config;\n",
  }, shapeOf('next.config')],
  ['Q0-257r2-1: a browser field in a workspace package.json', {
    'package.json': JSON.stringify({ name: 'r', private: true, workspaces: ['apps/web'] }),
    'apps/web/package.json': JSON.stringify({ name: '@r/web', private: true, browser: { './lib/probe.ts': './lib/alt.ts' } }),
  }, /apps\/web\/package\.json declares `browser`/],
  ['A1-257-7: a next.config reading its keys from a JSON file through node:fs', {
    [NEXT]: "import type { NextConfig } from 'next';\nimport { readFileSync } from 'node:fs';\n"
      + "const config: NextConfig = { ...JSON.parse(readFileSync(new URL('./next-extra.json', import.meta.url), 'utf8')) };\nexport default config;\n",
  }, shapeOf('next.config')],
  ['A1-257-7, Q0-257r3-1: a turbopack.rules loader in next.config', {
    [NEXT]: "import type { NextConfig } from 'next';\nconst config: NextConfig = { turbopack: { rules: { '*.tsx': { loaders: ['./probe-loader.cjs'], as: '*.tsx' } } } };\nexport default config;\n",
  }, /`turbopack` is a key the allowlisted shape does not name/],
  ['A1-257-7: a Babel configuration file', { 'apps/web/.babelrc': JSON.stringify({ presets: ['next/babel'], plugins: ['./probe-babel.cjs'] }) }, /apps\/web\/\.babelrc is a Babel configuration/],
  ['A1-257-7: a babel key in a package.json', { 'apps/web/package.json': JSON.stringify({ name: '@r/web', private: true, babel: { plugins: ['./probe-babel.cjs'] } }) },
    /apps\/web\/package\.json declares `babel`/],
  ['Q0-257r3-1: a computed key in next.config', { [NEXT]: "export default { ['resolve' + 'Alias']: { zod: 'pg' } };\n" }, shapeOf('next.config')],
  ['Q0-257r3-1: next.config keys taken from process.env', { [NEXT]: "export default { ...JSON.parse(process.env.NEXT_EXTRA ?? '{}') };\n" }, shapeOf('next.config')],
  ['R0-257-8: a vitest.config spreading an application module', {
    'vitest.config.ts': "import { defineConfig } from 'vitest/config';\nimport { extra } from './apps/web/lib/extra';\nexport default defineConfig({ ...extra, test: { environment: 'node' } });\n",
  }, shapeOf('vitest.config')],
  ['Q0 N12: a vitest.config with an inline resolveId plugin', {
    'vitest.config.ts': "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ plugins: [{ name: 'p', enforce: 'pre', resolveId(id: string) { return id; } }], test: {} });\n",
  }, shapeOf('vitest.config')],
  ['a postcss.config loading a local plugin', { 'apps/web/postcss.config.mjs': "export default { plugins: { './probe-plugin.js': {} } };\n" },
    /`plugins\.\.\/probe-plugin\.js` is a key the allowlisted shape does not name/],
  ['A1-257-8: a PostCSS configuration in apps/web/.config/, which Turbopack reads ahead of postcss.config.mjs', {
    'apps/web/.config/postcssrc.json': JSON.stringify({ plugins: { '@tailwindcss/postcss': {}, '../../../../../db/probe/pc.mjs': {} } }),
  }, /^apps\/web\/\.config\/postcssrc\.json is a file under a `\.config\/` directory/],
  ['C0-257r4-1: a .config/postcssrc.mjs at the root', { '.config/postcssrc.mjs': "export default { plugins: { 'postcss-import': {} } };\n" },
    /^\.config\/postcssrc\.mjs is a file under a `\.config\/` directory/],
  // A1-257-10: npm runs a workspace's `prebuild` and `postbuild` around `npm run build --workspace apps/web`.
  ['A1-257-10: a prebuild hook in apps/web/package.json', { 'apps/web/package.json': JSON.stringify({ name: '@r/web', private: true, scripts: { prebuild: 'node ../../db/probe/post.mjs', build: 'next build' } }) },
    /^apps\/web\/package\.json declares the script `prebuild`, a hook npm runs around another script/],
  ['A1-257-10: a postbuild hook in apps/web/package.json', { 'apps/web/package.json': JSON.stringify({ name: '@r/web', private: true, scripts: { build: 'next build', postbuild: 'node ../../db/probe/post.mjs' } }) },
    /^apps\/web\/package\.json declares the script `postbuild`, a hook npm runs around another script/],
  ['A1-257-10: a changed build command in apps/web/package.json', { 'apps/web/package.json': JSON.stringify({ name: '@r/web', private: true, scripts: { build: 'next build && node ../../db/probe/post.mjs' } }) },
    /^apps\/web\/package\.json declares the script `build` as "next build && node \.\.\/\.\.\/db\/probe\/post\.mjs", and the allowlist admits exactly "next build"/],
  // A1's advisory (round five): macOS opens `.Config/postcssrc.json` where Turbopack asks for `.config/postcssrc.json`.
  ["A1 advisory (round five): a .Config/ directory in another letter case", { 'apps/web/.Config/postcssrc.json': JSON.stringify({ plugins: { '../../../db/probe/pc.mjs': {} } }) },
    /^apps\/web\/\.Config\/postcssrc\.json is a file under a `\.config\/` directory/],
];

// Tracked-file controls (A1-257-9, A1-257-8): lists of tracked paths, each of which must be refused,
// and one clean list that must pass. Read from the path, not the content: no `.env` but `.env.example`
// is tracked under apps/, src/ or at the root, whatever it holds.
export const CLEAN_TRACKED = ['package.json', 'apps/web/app/page.tsx', 'apps/web/postcss.config.mjs', '.env.example', 'apps/web/.env.example', 'db/foundation/README.md'];
export const TRACKED_CONTROLS = [
  ['A1-257-9: a tracked apps/web/.env setting NODE_OPTIONS', ['apps/web/.env'], /^apps\/web\/\.env is a tracked environment file/],
  ['A1-257-9: a tracked .env.production.local at the root', ['.env.production.local'], /^\.env\.production\.local is a tracked environment file/],
  ['A1-257-9: a tracked .env.local in a module', ['src/modules/x/.env.local'], /^src\/modules\/x\/\.env\.local is a tracked environment file/],
  ['A1-257-8: a tracked file under apps/web/.config/', ['apps/web/.config/postcssrc.json'], /^apps\/web\/\.config\/postcssrc\.json is a tracked file under a `\.config\/` directory/],
  ['A1 advisory (round five): a tracked apps/web/.ENV in another letter case', ['apps/web/.ENV'], /^apps\/web\/\.ENV is a tracked environment file/],
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

// A build configuration read by both readers over one parse of `files` (A1-257-7): the parsed reading
// is used only when the text reader's is equal to it, so neither reader alone decides a shape. A
// refusal by either is a refusal.
function parsedShape(parser, files) {
  const parsed = parser.parse(files);
  return (raw, path) => {
    const text = readConfigShape(raw);
    const result = parsed.get(path);
    if (!result?.shape) return { statements: [], refusals: result?.refusals?.length ? result.refusals : ['the parsed reader returned nothing for this file'] };
    if (result.shape.refusals.length > 0) return result.shape;
    if (text.refusals.length > 0) return text;
    if (JSON.stringify(result.shape) !== JSON.stringify(text)) return { statements: [], refusals: ['the TypeScript parser and the text reader read it differently'] };
    return result.shape;
  };
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
  const cleanConfigs = tree(CLEAN_CONFIGS);
  const cleanConfigProblems = checkResolutionConfigs(cleanConfigs, allowlist, { readShape: parsedShape(parser, cleanConfigs) });
  if (cleanConfigProblems.length > 0) failures.push(`the clean build configurations were refused: ${cleanConfigProblems.join(' | ')}`);
  for (const [name, overrides, pattern] of ALIAS_CONTROLS) {
    const configs = tree(overrides);
    const problems = checkResolutionConfigs(configs, allowlist, { readShape: parsedShape(parser, configs) });
    if (!problems.some((p) => pattern.test(p))) failures.push(`control "${name}" was not refused: ${problems.join(' | ') || 'no problem reported'}`);
  }
  const cleanTracked = checkTrackedFiles(CLEAN_TRACKED);
  if (cleanTracked.length > 0) failures.push(`the clean tracked list was refused: ${cleanTracked.join(' | ')}`);
  for (const [name, paths, pattern] of TRACKED_CONTROLS) {
    const problems = checkTrackedFiles([...CLEAN_TRACKED, ...paths]);
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
  // Every resolution config, the files their `extends` chains reach included; a build configuration is
  // read by the parsed reader too when it is loaded, and the two readings must agree (A1-257-7).
  const configs = await collectResolutionConfigs('.');
  const configShape = parser ? parsedShape(parser, configs) : readConfigShape;
  const problems = [
    ...checkBoundaries(files, allowlist, { extract }),
    ...checkRepositoryImports(repository, allowlist, { extract: repositoryExtract }),
    ...checkTypeDirectives(files),
    ...checkJsxPragmas(files),
    ...checkSecretsAndMigrations(files, await collectDirectories('.'), allowlist),
    ...checkResolutionConfigs(configs, allowlist, { readShape: configShape }),
    // A tracked `.env*` or `.config/` file (A1-257-9, A1-257-8), read from `git ls-files`.
    ...checkTrackedFiles(collectTrackedFiles('.')),
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
      + `(${CONTROLS.length + ALIAS_CONTROLS.length + TRACKED_CONTROLS.length + 3} negative and positive controls held first)${others}`);
  } else {
    console.log(`application boundaries: ${count} source file(s) keep RFC-2026-029 §6.3, the §2.1/3 directives and §8/5, read by the dependency-free text reader${others}. `
      + '`typescript` did not load, so the parsed checks (the full import reading and §2.1/3\'s `any`) were not run here; CI runs them with --require-parser');
  }
}
