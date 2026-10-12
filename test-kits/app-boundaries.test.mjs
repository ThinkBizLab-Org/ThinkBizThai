import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  ALIAS_COMPILER_OPTIONS,
  ALIAS_PACKAGE_FIELDS,
  CONFIG_PACKAGE_FIELDS,
  POSTCSS_SEARCH_NAMES,
  REFUSED_CONFIG_FILES,
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
  configKindOf,
  configShapeProblems,
  extractSpecifiers,
  packageNameOf,
  readConfigShape,
  workspaceScriptProblems,
} from '../scripts/app-boundaries.mjs';
import { loadAllowlist } from '../scripts/verify-app-dependencies.mjs';

// RFC-2026-029 §8/4 (the §6.3 boundaries), §2.1/3 and §8/5 (WP-1A-A0-002). ESLint is deferred by the
// Product Owner (2026-10-12, `ไม่ใส่ตอนนี้ (Recommended)`), so each boundary is a rule of
// scripts/app-boundaries.mjs (the library scripts/verify-app-boundaries.mjs applies), and each is shown
// here to fail on a tree built to break it. The trees are in-memory maps of path to source text;
// nothing is written and nothing is installed. These tests drive the dependency-free TEXT reader, as
// `npm run check` must (§2.1/4, §8/6); the parsed reader, which needs `typescript`, holds its own
// negative controls in CI (`node scripts/verify-app-boundaries.mjs --require-parser`), and the wiring
// it plugs into is driven here with a stand-in.

const tree = (entries) => new Map(Object.entries(entries));
const KEY = 'identity-workspace';
const base = {
  [`src/modules/${KEY}/index.ts`]: "export { createWorkspace } from './application/create';\n",
  [`src/modules/${KEY}/application/create.ts`]: "import { Workspace } from '../domain/workspace';\nexport const createWorkspace = (w: Workspace) => w;\n",
  [`src/modules/${KEY}/domain/workspace.ts`]: "import { z } from 'zod';\nexport type Workspace = { id: string };\nexport const schema = z.object({});\n",
  [`src/modules/${KEY}/adapters/store.ts`]: "import { createClient } from '@supabase/supabase-js';\nimport { schema } from '../domain/workspace';\nexport const store = () => [createClient, schema];\n",
  'src/modules/platform-kernel/index.ts': "export const kernel = 1;\n",
  'src/modules/platform-kernel/adapters/job-store.ts': "import { Pool } from 'pg';\nexport const jobs = () => Pool;\n",
  'apps/web/composition/modules.ts': "import { store } from '../../../src/modules/identity-workspace/adapters/store';\n"
    + "import { createWorkspace } from '../../../src/modules/identity-workspace/index';\nexport const wired = [store, createWorkspace];\n",
  'apps/web/app/page.tsx': "import { wired } from '../composition/modules';\nexport default function Page() { return <main>{String(wired.length)}</main>; }\n",
  'apps/web/app/globals.css': "@import 'tailwindcss';\n",
  'apps/web/components/button.tsx': "import { clsx } from 'clsx';\nimport { cva } from 'class-variance-authority';\nexport const b = [clsx, cva];\n",
  'apps/web/postcss.config.mjs': "export default { plugins: { '@tailwindcss/postcss': {} } };\n",
  'apps/web/next.config.ts': "import type { NextConfig } from 'next';\nimport * as Sentry from '@sentry/nextjs';\nexport default { Sentry } as unknown as NextConfig;\n",
  'apps/worker/composition/jobs.ts': "import { jobs } from '../../../src/modules/platform-kernel/adapters/job-store';\nexport const run = jobs;\n",
  'apps/web/app/page.test.tsx': "import { describe, it } from 'vitest';\nimport { renderToStaticMarkup } from 'react-dom/server';\ndescribe('x', () => { it('y', () => renderToStaticMarkup); });\n",
  'vitest.config.ts': "import { defineConfig } from 'vitest/config';\nexport default defineConfig({});\n",
};

async function verdict(overrides = {}, remove = []) {
  const allowlist = await loadAllowlist();
  const files = tree({ ...base, ...overrides });
  for (const path of remove) files.delete(path);
  return checkBoundaries(files, allowlist);
}

async function mustFail(overrides, pattern, why, remove = []) {
  const problems = await verdict(overrides, remove);
  assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  return problems;
}

test('the application sources keep the §6.3 boundaries and §8/5 on the repository as it stands', async () => {
  const allowlist = await loadAllowlist();
  const files = await collectSources('.');
  const sources = [...files.keys()].filter((path) => /\.(tsx?|mjs|css)$/.test(path));
  assert.ok(sources.includes('apps/web/app/page.tsx') && sources.includes('apps/web/app/globals.css') && sources.includes('vitest.config.ts'),
    `the walk reaches the skeleton (${sources.join(', ')})`);
  assert.ok(![...files.keys()].some((path) => path.includes('/node_modules/') || path.includes('/.next/')), 'installed and built files are not read');
  assert.deepEqual(checkBoundaries(files, allowlist), []);
  assert.deepEqual(checkTypeDirectives(files), []);
  assert.deepEqual(checkSecretsAndMigrations(files, await collectDirectories('.'), allowlist), []);
  const configs = await collectResolutionConfigs('.');
  assert.ok(configs.has('tsconfig.json') && configs.has('apps/web/tsconfig.json') && configs.has('apps/web/next.config.ts')
    && configs.has('tsconfig.base.json') && configs.has('package.json') && configs.has('apps/web/package.json') && configs.has('vitest.config.ts'),
    `the alias walk reaches every resolution config and package.json (${[...configs.keys()].join(', ')})`);
  assert.deepEqual(checkJsxPragmas(files), []);
  assert.deepEqual(checkResolutionConfigs(configs, allowlist), []);
  const repository = await collectRepositoryCode('.');
  assert.ok(repository.has('scripts/app-boundaries-parser.mjs') && repository.has('test-kits/app-boundaries.test.mjs') && !repository.has('apps/web/app/page.tsx'),
    'the repository walk reaches the tooling tier and leaves the application tree to checkBoundaries');
  assert.deepEqual(checkRepositoryImports(repository, allowlist), [], 'outside the application tree, only the parser imports a package: typescript');
});

test('a well-formed synthetic tree with modules, adapters and composition roots passes', async () => {
  assert.deepEqual(await verdict(), []);
});

test('§6.3/1: a module is entered only through its index.ts, and only a composition root imports adapters/', async () => {
  await mustFail({ 'apps/web/app/page.tsx': `import { createWorkspace } from '../../../src/modules/${KEY}/application/create';\nexport default createWorkspace;\n` },
    /another module is imported only through its index\.ts \(RFC-2026-029 §6\.3\/1\)/, 'apps reaching into a module past its index');
  await mustFail({ 'src/modules/platform-kernel/index.ts': `import { createWorkspace } from '../${KEY}/application/create';\nexport const k = createWorkspace;\n` },
    /another module is imported only through its index\.ts/, 'one module reaching into another past its index');
  await mustFail({ 'apps/web/app/page.tsx': `import { store } from '../../../src/modules/${KEY}/adapters/store';\nexport default store;\n` },
    /only a composition root imports a module's adapters\/ directly/, 'a page importing an adapter');
  await mustFail({ [`src/modules/${KEY}/application/create.ts`]: "import { store } from '../adapters/store';\nexport const createWorkspace = store;\n" },
    /only a composition root imports a module's adapters\/ directly/, "a module's own application layer importing its adapter");
  await mustFail({ [`src/modules/${KEY}/index.ts`]: "export { store } from './adapters/store';\n" },
    /only a composition root imports a module's adapters\/ directly/, 'an index.ts re-exporting an adapter');
});

test('§6.3/2: nothing under domain/ imports a provider SDK, Next.js, React or adapters/', async () => {
  for (const pkg of ['react', 'next/server', '@supabase/supabase-js', 'pg']) {
    await mustFail({ [`src/modules/${KEY}/domain/workspace.ts`]: `import x from '${pkg}';\nexport type Workspace = { id: string };\nexport const schema = x;\n` },
      /nothing under domain\/ imports a provider SDK, Next\.js or React \(RFC-2026-029 §6\.3\/2\)/, `domain importing ${pkg}`);
  }
  await mustFail({ [`src/modules/${KEY}/domain/workspace.ts`]: "import { store } from '../adapters/store';\nexport type Workspace = { id: string };\nexport const schema = store;\n" },
    /nothing under domain\/ imports adapters\/ \(RFC-2026-029 §6\.3\/2\)/, 'domain importing its adapter');
});

test('§6.3/3: nothing under apps/ or src/ imports from spikes/', async () => {
  await mustFail({ 'spikes/WP-1A-Q0-001/probe.ts': 'export const probe = 1;\n', 'apps/web/app/page.tsx': "import { probe } from '../../../spikes/WP-1A-Q0-001/probe';\nexport default probe;\n" },
    /nothing under apps\/ or src\/ imports from spikes\/ \(RFC-2026-029 §6\.3\/3\)/, 'a page importing a spike');
  await mustFail({ 'spikes/WP-X/a.ts': 'export const a = 1;\n', [`src/modules/${KEY}/application/create.ts`]: "export { a } from '../../../../spikes/WP-X/a';\n" },
    /imports from spikes\//, 'a module re-exporting a spike');
});

test('§6.3/4: only allowlisted packages, only from the places RFC-2026-029 §3 allows', async () => {
  await mustFail({ 'apps/web/app/page.tsx': "import pad from 'left-pad';\nexport default pad;\n" }, /left-pad is not in RFC-2026-029 §3\.1 or §3\.2/, 'an unlisted package');
  await mustFail({ 'apps/web/app/page.tsx': "import { createServerClient } from '@supabase/ssr';\nexport default createServerClient;\n" },
    /RFC-2026-029 allows @supabase\/ssr only `apps\/web\/composition\/\*\*` only/, 'a provider SDK outside the composition root (MOD-900)');
  await mustFail({ 'apps/web/app/page.tsx': "import { clsx } from 'clsx';\nexport default clsx;\n" }, /allows clsx only/, 'a component helper outside components/');
  await mustFail({ 'apps/web/app/layout.tsx': "import { it } from 'vitest';\nexport default it;\n" }, /allows vitest only/, 'a test runner in shipped code');
  await mustFail({ 'apps/web/app/page.tsx': "import ts from 'typescript';\nexport default ts;\n" }, /allows typescript only nowhere/, 'a CLI imported by name');
  await mustFail({ 'apps/web/app/x.css': "@import 'tailwind-merge';\n" }, /allows tailwind-merge only/, 'a CSS import of the wrong package');
  await mustFail({ 'src/modules/platform-kernel/application/run.ts': "import { Pool } from 'pg';\nexport const run = Pool;\n" }, /allows pg only `src\/modules\/platform-kernel\/adapters\/\*\*`/, 'pg outside the job store');
  await mustFail({ 'apps/web/app/fonts.ts': "import { Inter } from 'next/font/google';\nexport const f = Inter;\n" }, /fetches fonts from Google at build time/, 'a font fetched at build');
  await mustFail({ 'apps/web/app/x.ts': "const m = require('next');\nexport default m;\n" }, /`require` at offset \d+: CommonJS loading/, 'a require');
  await mustFail({ 'apps/web/app/x.ts': "const name = 'next';\nexport const m = import(name);\n" }, /dynamic import\(\) at offset \d+ whose argument is not one string literal/, 'a computed dynamic import');
  await mustFail({ 'apps/web/app/x.ts': "export { a } from 'https://example.com/a.js';\n" }, /a URL or absolute specifier/, 'a URL import');
  await mustFail({ 'apps/web/app/x.ts': "import { a } from './missing';\nexport default a;\n" }, /names no file the guard can find/, 'an unresolved relative import');
  await mustFail({ 'apps/web/app/x.ts': "import { a } from '../../../../outside';\nexport default a;\n" }, /resolves outside the repository/, 'a relative import leaving the repository');
});

test('§6.3/5: nothing under apps/web reaches pg or the platform-kernel adapters, its composition root included', async () => {
  await mustFail({ 'apps/web/composition/jobs.ts': "import { jobs } from '../../../src/modules/platform-kernel/adapters/job-store';\nexport const j = jobs;\n" },
    /nothing under apps\/web reaches pg or src\/modules\/platform-kernel\/adapters\/\*\* \(RFC-2026-029 §6\.3\/5\)/, 'the web composition root wiring the job store');
  const reexport = await mustFail({
    'src/modules/platform-kernel/index.ts': "export { jobs } from './adapters/job-store';\n",
    'apps/web/composition/modules.ts': "import { kernel } from '../../../src/modules/platform-kernel/index';\nexport const wired = [kernel];\n",
  }, /reaches .*src\/modules\/platform-kernel\/adapters\/job-store\.ts/, 'platform-kernel index.ts re-exporting the job store, reached from apps/web');
  assert.ok(reexport.some((p) => /src\/modules\/platform-kernel\/index\.ts imports .*only a composition root/.test(p)), 'the re-export itself is refused too');
  await mustFail({ 'apps/web/composition/db.ts': "import { Pool } from 'pg';\nexport const p = Pool;\n" }, /reaches pg/, 'pg named directly under apps/web');
});

test('the specifier reader sees every import form and refuses what it cannot name', () => {
  const read = (source, path = 'a.ts') => extractSpecifiers(source, path);
  const specs = (source, path) => read(source, path).found.map((f) => f.specifier);
  assert.deepEqual(specs([
    "import a from 'p1';",
    "import type { T } from 'p2';",
    "import type D from 'p3';",
    "import * as ns from 'p4';",
    "import d, { e } from 'p5';",
    "import 'p6';",
    "export * from 'p7';",
    "export * as n from 'p8';",
    "export { f } from 'p9';",
    "export type { G } from 'p10';",
    "const lazy = import('p11');",
    "const meta = import.meta.url;",
    'export const local = 1;',
    "// import x from 'commented';",
    "const s = \"import y from 'in-a-string'\";",
  ].join('\n')), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11']);
  assert.deepEqual(specs('/// <reference types="next" />\n/// <reference path="./other.d.ts" />\n', 'x.d.ts'), ['next', './other.d.ts']);
  assert.deepEqual(specs("/* @import 'no'; */\n@import 'tailwindcss';\n@import url('./theme.css');\n", 'g.css'), ['tailwindcss', './theme.css']);
  assert.match(read("import x = require('p');").refusals.join(), /`require`/);
  assert.match(read("const m = await import(`p${1}`);").refusals.join(), /not one string literal/);
  assert.deepEqual(['react-dom/server', '@supabase/ssr', '@scope/pkg/deep/path', 'next'].map(packageNameOf), ['react-dom', '@supabase/ssr', '@scope/pkg', 'next']);
});

test('§8/5: a supabase/migrations directory, the service role and the worker credential outside its scope each fail', async () => {
  const allowlist = await loadAllowlist();
  const check = (files, directories = []) => checkSecretsAndMigrations(tree(files), directories, allowlist);
  assert.deepEqual(check({ 'apps/worker/composition/db.ts': 'export const url = process.env.WORKER_DATABASE_URL;\n' }, ['db/foundation/migrations', 'supabase']), [],
    'the worker credential read in the worker composition root, and a supabase/ directory with no migrations, pass');
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  fails(check({}, ['supabase/migrations']), /supabase\/migrations exists: db\/foundation\/migrations\/ is the only migration source/, 'a supabase/migrations directory');
  fails(check({}, ['apps/web/supabase/migrations']), /apps\/web\/supabase\/migrations exists/, 'one nested anywhere');
  for (const spelling of ['SUPABASE_SERVICE_ROLE_KEY', "role: 'service_role'", 'service-role key', 'ServiceRole']) {
    fails(check({ 'src/modules/x/adapters/a.ts': `export const k = ${JSON.stringify(spelling)};\n` }), /names the service role or its key/, `the spelling ${spelling}`);
  }
  fails(check({ 'apps/web/app/x.ts': 'export const u = process.env.WORKER_DATABASE_URL;\n' }), /no file under apps\/web names the worker credential/, 'the worker credential under apps/web');
  fails(check({ 'apps/web/composition/x.ts': "export const r = 'app_worker_login';\n" }), /apps\/web\/composition\/x\.ts names app_worker_login/, "the worker's login role under the web composition root");
  fails(check({ 'apps/worker/app/route.ts': 'export const u = process.env.WORKER_DATABASE_URL;\n' }), /outside apps\/worker\/composition\/\*\* no file reads the worker credential/, 'the credential read by the dispatcher route itself');
  fails(check({ 'src/modules/platform-kernel/adapters/job-store.ts': 'export const u = process.env.WORKER_DATABASE_URL;\n' }), /outside apps\/worker\/composition/, 'the credential read by the job store adapter');
  assert.deepEqual(check({ 'apps/web/app/x.ts': 'export const u = process.env.NOT_WORKER_DATABASE_URL_SUFFIXED;\n' }), [], 'a longer identifier that merely contains the name is not the name');
});

test('A1-257-1: the text reader refuses an import, export or require written after a JSX closing tag on its line', async () => {
  const refused = (source, path = 'apps/web/app/x.tsx') => extractSpecifiers(source, path).refusals.join(' | ');
  assert.match(refused("export const a = <div></div>; import x from 'pg';\n"), /`import` after a closing tag at offset 22/, "A1's one-line probe");
  assert.match(refused("export default function P() { return (<main>\n</main>); } import { Pool } from 'pg';\n"), /`import` after a closing tag/, "Q0's M28");
  assert.match(refused("export const b = <p></p>; export * from 'pg';\n"), /`export` after a closing tag/, 'a re-export');
  assert.match(refused("export const c = <p></p>; const pg = require('pg');\n"), /`require` after a closing tag/, 'a require');
  await mustFail({ 'apps/web/app/page.tsx': "export const a = <div></div>; import { Client } from 'pg';\nexport default a;\n" },
    /apps\/web\/app\/page\.tsx: `import` after a closing tag/, 'the probe reaches the verdict');
  assert.equal(refused("export const d = <p>text</p>;\nimport x from 'zod';\nexport const e = x;\n"), '', 'a statement on its own line is read, not refused');
  assert.equal(refused("const s = '</p> import';\n// </p> export\nexport const t = s;\n", 'apps/web/app/x.ts'), '', 'a closing tag in a string or comment is not code');
  assert.deepEqual(extractSpecifiers("export const d = <p>text</p>;\nimport x from 'zod';\n", 'apps/web/app/x.tsx').found.map((f) => f.specifier), ['zod']);
});

test('§2.1/3: @ts-ignore, @ts-nocheck and a bare @ts-expect-error fail in application code; a reasoned one passes', () => {
  const check = (files) => checkTypeDirectives(tree(files));
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  fails(check({ 'apps/web/app/x.ts': '// @ts-ignore\nexport const n: number = 1;\n' }), /x\.ts:1 uses `@ts-ignore`/, '// @ts-ignore');
  fails(check({ 'src/modules/k/domain/x.ts': 'export const n = 1; /* @ts-ignore */\n' }), /uses `@ts-ignore`/, 'a block-comment @ts-ignore under src/');
  fails(check({ 'apps/web/app/x.tsx': '// @ts-nocheck\nexport const n = 1;\n' }), /uses `@ts-nocheck`/, '@ts-nocheck');
  fails(check({ 'apps/web/app/x.ts': 'export const a = 1;\n// @ts-expect-error\nexport const n: number = "";\n' }), /x\.ts:2 uses `@ts-expect-error` with no reason/, 'a bare @ts-expect-error');
  fails(check({ 'apps/web/app/x.ts': '/* @ts-expect-error */ export const n: number = "";\n' }), /with no reason/, 'a bare block-comment @ts-expect-error');
  fails(check({ 'apps/web/app/x.ts': '// @ts-expect-error: \nexport const n: number = "";\n' }), /with no reason/, 'a colon and nothing after it');
  assert.deepEqual(check({ 'apps/web/app/x.ts': '// @ts-expect-error -- the fixture is mistyped on purpose\nexport const n: number = "";\n' }), [], 'a reasoned @ts-expect-error passes');
  assert.deepEqual(check({ 'apps/web/app/x.ts': '// @ts-expect-error: ข้อมูลทดสอบ\nexport const n: number = "";\n' }), [], 'a reason in Thai is a reason');
  assert.deepEqual(check({ 'test-kits/typecheck-control/x.ts': '// @ts-ignore\n', 'spikes/WP-X/a.ts': '// @ts-ignore\n', 'apps/web/app/g.css': '/* @ts-ignore */\n' }), [],
    'the type-check fixtures, spikes and CSS are not application code');
});

test('Q-029-1: a path alias in a tsconfig or a next.config is refused until the guard resolves aliases', async () => {
  const allowlist = await loadAllowlist();
  const check = (configs, copy = allowlist) => checkResolutionConfigs(tree(configs), copy);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  const json = (value) => JSON.stringify(value);
  assert.deepEqual(check({ 'tsconfig.json': json({ extends: './tsconfig.base.json', include: ['apps/**/*.ts'] }), 'tsconfig.base.json': '{}', 'apps/web/next.config.ts': 'export default { images: { unoptimized: true } };\n' }), []);
  fails(check({ 'tsconfig.json': json({ compilerOptions: { paths: { zod: ['./node_modules/pg'] } } }) }), /tsconfig\.json sets compilerOptions\.paths/, 'an alias of an allowlisted name onto pg');
  fails(check({ 'apps/web/tsconfig.json': json({ compilerOptions: { baseUrl: '.' } }) }), /sets compilerOptions\.baseUrl/, 'a baseUrl');
  fails(check({ 'tsconfig.base.json': json({ compilerOptions: { rootDirs: ['src', 'apps'] } }) }), /sets compilerOptions\.rootDirs/, 'rootDirs');
  fails(check({ 'tsconfig.json': json({ extends: '@tsconfig/next/tsconfig.json' }) }), /extends "@tsconfig\/next\/tsconfig\.json", which is not a file in this repository/, 'an extends from a package');
  fails(check({ 'jsconfig.json': json({ compilerOptions: { paths: { '@/*': ['./*'] } } }) }), /jsconfig\.json sets compilerOptions\.paths/, 'a jsconfig');
  fails(check({ 'tsconfig.json': '{ // a comment\n "compilerOptions": {} }' }), /is not plain JSON/, 'a tsconfig the guard cannot read');
  // A next.config is an allowlisted shape (A1-257-7): each of these keys is one the shape does not name.
  fails(check({ 'apps/web/next.config.ts': "export default { turbopack: { resolveAlias: { zod: 'pg' } } };\n" }), /next\.config\.ts is not the allowlisted next\.config shape: `turbopack` is a key/, 'a turbopack alias');
  fails(check({ 'apps/web/next.config.mjs': "export default { 'webpack': (c) => c };\n" }), /next\.config\.mjs is not the allowlisted next\.config shape/, 'a quoted webpack hook');
  fails(check({ 'apps/web/next.config.ts': 'export default { typescript: { tsconfigPath: "./other.json" } };\n' }), /`typescript` is a key the allowlisted shape does not name/, 'another tsconfig');
  fails(check({ 'apps/web/next.config.ts': 'export default { experimental: { alias: {} } };\n' }), /`experimental` is a key the allowlisted shape does not name/, 'a bare alias key');
  const admitted = { ...allowlist, resolutionAliases: { allowed: [{ file: 'tsconfig.json', option: 'paths' }] } };
  assert.deepEqual(check({ 'tsconfig.json': json({ compilerOptions: { paths: { '@modules/*': ['./src/modules/*'] } } }) }, admitted), [],
    'an entry in the allowlist admits that file and option, and only that one');
  fails(check({ 'apps/web/tsconfig.json': json({ compilerOptions: { paths: {} } }) }, admitted), /apps\/web\/tsconfig\.json sets compilerOptions\.paths/, 'another file is not admitted by it');
  assert.deepEqual(allowlist.resolutionAliases.allowed, [], 'no alias is admitted today');
});

test('the rules take the reader they are given: a parsed reader\'s imports and `any` types are judged like the text reader\'s', async () => {
  const allowlist = await loadAllowlist();
  const files = tree({ ...base, 'apps/web/app/x.tsx': 'whatever the text says\n', 'spikes/WP-X/a.ts': 'x\n', 'src/modules/k/domain/d.ts': 'y\n' });
  const stand = new Map([
    ['apps/web/app/x.tsx', { found: [{ specifier: 'pg', kind: 'import' }], refusals: [], anys: [3] }],
    ['spikes/WP-X/a.ts', { found: [], refusals: [], anys: [1] }],
    ['src/modules/k/domain/d.ts', { found: [], refusals: ['line 1: a refusal the reader made'], anys: [2] }],
  ]);
  const extract = (raw, path) => stand.get(path) ?? extractSpecifiers(raw, path);
  const problems = checkBoundaries(files, allowlist, { extract });
  const fails = (pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  fails(/apps\/web\/app\/x\.tsx imports pg/, "a parsed import is held to §6.3/4 though the text names nothing");
  fails(/apps\/web\/app\/x\.tsx reaches pg/, 'and to §6.3/5');
  fails(/apps\/web\/app\/x\.tsx:3 uses the type `any`/, 'an `any` under apps/');
  fails(/src\/modules\/k\/domain\/d\.ts:2 uses the type `any`/, 'an `any` under src/');
  fails(/src\/modules\/k\/domain\/d\.ts: line 1: a refusal the reader made/, "the reader's own refusals");
  assert.ok(!problems.some((p) => p.startsWith('spikes/WP-X/a.ts:1 uses the type')), '`any` outside application code is not §2.1/3\'s');
  assert.deepEqual(checkBoundaries(tree(base), allowlist, { extract: (raw, path) => ({ ...extractSpecifiers(raw, path), anys: [] }) }), [], 'the clean tree is clean through the hook');
});

test('A1-257-2: a Supabase secret key under its current names fails like the service-role key', async () => {
  const allowlist = await loadAllowlist();
  const check = (files) => checkSecretsAndMigrations(tree(files), [], allowlist);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  // Spelled by concatenation here so that this file is not itself a secret-shaped text; the guard reads
  // the joined text, as it would read a file that holds it.
  const prefix = ['sb', 'secret', ''].join('_');
  fails(check({ 'apps/web/composition/supabase.ts': `export const k = '${prefix}0123456789abcdef';\n` }), /names a Supabase secret key \(`sb_secret_`\)/, 'the sb_secret_ prefix');
  fails(check({ 'apps/web/composition/supabase.ts': `export const k = process.env.${['SUPABASE', 'SECRET', 'KEY'].join('_')};\n` }), /names a secret key/, 'SUPABASE_SECRET_KEY');
  fails(check({ 'src/modules/x/adapters/a.ts': `export const k = process.env.${['SECRET', 'KEY'].join('_')};\n` }), /names a secret key/, 'SECRET_KEY under src/');
  fails(check({ 'apps/worker/composition/a.ts': `export const k = { ${['secret', 'Key'].join('')}: '' };\n` }), /names a secret key/, 'secretKey');
  fails(check({ 'apps/web/composition/a.ts': `export const k = process.env.${['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')};\n` }), /names the service role or its key/, 'the legacy name still fails');
  assert.deepEqual(check({ 'apps/web/composition/a.ts': "export const k = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;\n", 'scripts/x.mjs': `const k = '${prefix}';\n` }), [],
    'the publishable key, and a file outside apps/ and src/, are not this rule\'s');
});


test('Amendment 2026-10-12: typescript is imported by scripts/app-boundaries-parser.mjs only, and an import of it anywhere else fails', async () => {
  const allowlist = await loadAllowlist();
  const row = allowlist.development.find((r) => r.name === 'typescript');
  assert.deepEqual(row.imports, ['scripts/app-boundaries-parser.mjs'], "the copy's typescript cell admits the parser and nothing else");
  const PARSER = "import typescript from 'typescript';\nimport { SyntaxKind } from 'typescript/unstable/ast';\nimport { API } from 'typescript/unstable/sync';\nexport const t = [typescript, SyntaxKind, API];\n";
  assert.deepEqual(checkRepositoryImports(tree({ 'scripts/app-boundaries-parser.mjs': PARSER }), allowlist), [], 'the parser itself passes');
  const fails = (files, pattern, why) => {
    const problems = [...checkRepositoryImports(tree(files), allowlist), ...checkBoundaries(tree({ ...base, ...files }), allowlist)];
    assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  };
  const ts = "import ts from 'typescript';\nexport default ts;\n";
  fails({ 'scripts/other.mjs': ts }, /scripts\/other\.mjs imports typescript: RFC-2026-029 allows typescript only nowhere, except `scripts\/app-boundaries-parser\.mjs`/, 'another script');
  fails({ 'scripts/app-boundaries.mjs': ts }, /scripts\/app-boundaries\.mjs imports typescript/, 'the dependency-free rules module');
  fails({ 'scripts/verify-app-boundaries.mjs': ts }, /scripts\/verify-app-boundaries\.mjs imports typescript/, 'the CLI that loads the parser');
  fails({ 'scripts/sub/app-boundaries-parser.mjs': ts }, /scripts\/sub\/app-boundaries-parser\.mjs imports typescript/, 'a file of the same name elsewhere');
  fails({ 'test-kits/x.test.mjs': "import { API } from 'typescript/unstable/sync';\nexport const a = API;\n" }, /test-kits\/x\.test\.mjs imports typescript\/unstable\/sync/, 'a subpath in a test');
  fails({ 'tests/db/x.mjs': "export const m = await import('typescript');\n" }, /tests\/db\/x\.mjs imports typescript/, 'a dynamic import under tests/');
  fails({ 'db/foundation/x.mjs': "export * from 'typescript';\n" }, /db\/foundation\/x\.mjs imports typescript/, 'a re-export under db/');
  fails({ 'evidence/WP-X/probe.mjs': ts }, /evidence\/WP-X\/probe\.mjs imports typescript/, 'an evidence probe');
  fails({ 'build.mjs': ts }, /build\.mjs imports typescript/, 'a root module');
  fails({ 'scripts/x.cjs': "const ts = require('typescript');\nmodule.exports = ts;\n" }, /scripts\/x\.cjs: `require` at offset \d+: CommonJS loading/, 'a require, which names no module the guard can read');
  fails({ 'apps/web/app/page.tsx': ts }, /apps\/web\/app\/page\.tsx imports typescript: RFC-2026-029 allows typescript only nowhere, except/, 'a page');
  fails({ 'tests/e2e/x.ts': ts }, /tests\/e2e\/x\.ts imports typescript/, 'an end-to-end test');
  fails({ 'vitest.config.ts': ts }, /vitest\.config\.ts imports typescript/, 'a root config');
  fails({ 'scripts/other.mjs': "import pad from 'left-pad';\nexport default pad;\n" }, /scripts\/other\.mjs imports left-pad: left-pad is not in RFC-2026-029/, 'any other package in the tooling tier');
  const widened = JSON.parse(JSON.stringify(allowlist));
  widened.development.find((r) => r.name === 'typescript').imports = [];
  assert.ok(checkRepositoryImports(tree({ 'scripts/app-boundaries-parser.mjs': PARSER }), widened).some((p) => /app-boundaries-parser\.mjs imports typescript/.test(p)),
    'with the cell back to "nowhere", the parser itself fails: the rule reads the copy, not a name written here');
  // The CLI applies the rule to the repository and holds a control for it first (it is not imported here,
  // so its wiring is read as text).
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  assert.match(cli, /const repository = await collectRepositoryCode\('\.'\);/, 'the CLI walks the rest of the repository');
  assert.match(cli, /\.\.\.checkRepositoryImports\(repository, allowlist, \{ extract: repositoryExtract \}\),/, 'and judges it, through the parser when it is loaded');
  assert.match(cli, /\.\.\.checkRepositoryImports\(files, allowlist, \{ extract \}\),/, 'and its negative controls run the rule');
  assert.match(cli, /'Amendment 2026-10-12: typescript imported by a script other than the parser'/, 'with a control for a script importing typescript');
});

test('A1-257-5: a compiler config is followed along its extends chain, whatever its files are named, and an alias anywhere in the chain fails', async () => {
  const allowlist = await loadAllowlist();
  const json = (value) => JSON.stringify(value);
  const BASE = { 'tsconfig.base.json': json({ compilerOptions: { strict: true } }), 'package.json': json({ name: 'r', private: true, workspaces: ['apps/web'] }), 'apps/web/package.json': json({ name: '@r/web', private: true }) };
  const check = (configs, copy = allowlist) => checkResolutionConfigs(tree({ ...BASE, ...configs }), copy);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  const paths = { compilerOptions: { paths: { zod: ['../../db/probe-a1/target.ts'] } } };
  assert.deepEqual(check({ 'apps/web/tsconfig.json': json({ extends: './base.json' }), 'apps/web/base.json': json({ extends: '../../tsconfig.base.json' }) }), [], 'a clean chain through a file of any name passes');
  // A1's first route, as A1 measured it: apps/web/tsconfig.json -> ./base.json (paths) -> the repository base.
  fails(check({ 'apps/web/tsconfig.json': json({ extends: './base.json' }), 'apps/web/base.json': json({ extends: '../../tsconfig.base.json', ...paths }) }),
    /apps\/web\/base\.json sets compilerOptions\.paths/, "A1's base.json");
  fails(check({ 'apps/web/tsconfig.json': json({ extends: './base' }), 'apps/web/base.json': json(paths) }), /apps\/web\/base\.json sets compilerOptions\.paths/, 'an extends with .json left off, as tsc appends it');
  fails(check({ 'tsconfig.json': json({ extends: './a.json' }), 'a.json': json({ extends: './conf/b.json' }), 'conf/b.json': json({ compilerOptions: { baseUrl: '..' } }) }),
    /conf\/b\.json sets compilerOptions\.baseUrl/, 'two links down');
  fails(check({ 'tsconfig.json': json({ extends: ['./tsconfig.base.json', './more.json'] }), 'more.json': json({ compilerOptions: { rootDirs: ['a', 'b'] } }) }),
    /more\.json sets compilerOptions\.rootDirs/, 'the second entry of an extends array');
  for (const option of ['jsxImportSource', 'jsxFactory', 'jsxFragmentFactory', 'reactNamespace']) {
    fails(check({ 'apps/web/tsconfig.json': json({ extends: './base.json' }), 'apps/web/base.json': json({ compilerOptions: { [option]: '../../db/probe-a1/rt' } }) }),
      new RegExp(`apps/web/base\\.json sets compilerOptions\\.${option}`), `${option} inherited through the chain`);
    fails(check({ 'tsconfig.base.json': json({ compilerOptions: { [option]: 'x' } }) }), new RegExp(`tsconfig\\.base\\.json sets compilerOptions\\.${option}`), `${option} in a tsconfig`);
  }
  assert.deepEqual(ALIAS_COMPILER_OPTIONS, ['paths', 'baseUrl', 'rootDirs', 'jsxImportSource', 'jsxFactory', 'jsxFragmentFactory', 'reactNamespace']);
  fails(check({ 'apps/web/tsconfig.json': json({ extends: './missing.json' }) }), /extends "\.\/missing\.json", which is not a file in this repository the guard has read \(no apps\/web\/missing\.json\)/, 'a file the guard has not read');
  fails(check({ 'apps/web/tsconfig.json': json({ extends: '../../../outside.json' }) }), /which is not a file in this repository the guard has read \(it leaves the repository/, 'a path leaving the repository');
  fails(check({ 'tsconfig.json': json({ extends: './node_modules/@tsconfig/next/tsconfig.json' }) }), /enters a directory the guard does not read/, 'a path into node_modules');
  fails(check({ 'tsconfig.json': json({ extends: '/etc/tsconfig.json' }) }), /it is an absolute path or a URL/, 'an absolute path');
  fails(check({ 'tsconfig.json': json({ extends: '@tsconfig/next/tsconfig.json' }) }), /the package @tsconfig\/next resolves through node_modules, and only this repository's own workspaces resolve inside it/, 'a package from the registry');
  fails(check({ 'tsconfig.json': json({ extends: 7 }) }), /extends 7, which is not a file in this repository/, 'an extends that is not a string');
  // A package specifier that resolves inside the repository: one of its own workspaces, by a path in it.
  assert.deepEqual(check({ 'tsconfig.json': json({ extends: '@r/web/tsconfig.shared.json' }), 'apps/web/tsconfig.shared.json': '{}' }), [], 'a workspace file, named through its package');
  fails(check({ 'tsconfig.json': json({ extends: '@r/web/shared' }), 'apps/web/shared.json': json(paths) }), /apps\/web\/shared\.json sets compilerOptions\.paths/, 'and the file it names is read like any other');
  fails(check({ 'tsconfig.json': json({ extends: '@r/web' }) }), /it names no file inside the workspace @r\/web/, 'a workspace named with no file');
  fails(check({ 'tsconfig.json': json({ extends: '@r/web/../../x.json' }) }), /it names no file inside the workspace @r\/web/, 'a workspace path climbing out');
  fails(check({ 'apps/web/package.json': json({ name: '@r/web', private: true, exports: { './t.json': './other.json' } }), 'tsconfig.json': json({ extends: '@r/web/t.json' }), 'apps/web/t.json': '{}' }),
    /the workspace @r\/web remaps its files through `exports`/, 'a workspace whose exports would remap the path');
  assert.deepEqual(check({ 'a.json': json({ extends: './tsconfig.json' }), 'tsconfig.json': json({ extends: './a.json' }) }), [], 'a cycle ends where it closes');
  const admitted = { ...allowlist, resolutionAliases: { allowed: [{ file: 'apps/web/base.json', option: 'paths' }] } };
  assert.deepEqual(check({ 'apps/web/tsconfig.json': json({ extends: './base.json' }), 'apps/web/base.json': json(paths) }, admitted), [], 'an allowlist entry admits that file and option');
  fails(check({ 'apps/web/tsconfig.json': json({ extends: './base.json', ...paths }), 'apps/web/base.json': '{}' }, admitted), /apps\/web\/tsconfig\.json sets compilerOptions\.paths/, 'and only that file');

  // The walk reads the chain from disk, where TypeScript reads it: A1's tree, written to a scratch directory.
  const root = await mkdtemp(join(tmpdir(), 'app-boundaries-'));
  try {
    const write = async (path, text) => { await mkdir(join(root, path, '..'), { recursive: true }); await writeFile(join(root, path), text); };
    for (const [path, text] of Object.entries(BASE)) await write(path, text);
    await write('apps/web/tsconfig.json', json({ extends: './base' }));
    await write('apps/web/base.json', json({ extends: './conf/deep' }));
    await write('apps/web/conf/deep.json', json({ extends: '../../../tsconfig.base.json', ...paths }));
    await write('apps/web/node_modules/x/tsconfig.json', json(paths));
    await write('apps/web/next.config.ts', 'export default {};\n');
    await write('apps/web/vitest.config.mts', 'export default {};\n');
    const configs = await collectResolutionConfigs(root);
    assert.deepEqual([...configs.keys()].sort(), ['apps/web/base.json', 'apps/web/conf/deep.json', 'apps/web/next.config.ts', 'apps/web/package.json', 'apps/web/tsconfig.json', 'apps/web/vitest.config.mts', 'package.json', 'tsconfig.base.json'],
      'every link of the chain is read whatever its name, two links down, and nothing under node_modules is');
    fails(checkResolutionConfigs(configs, allowlist), /apps\/web\/conf\/deep\.json sets compilerOptions\.paths/, 'the walked chain is refused');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A1-257-5, A1-257-7: a next.config imports nothing but `import type { NextConfig } from \'next\'`, so no configuration reaches it from another module or file', async () => {
  const allowlist = await loadAllowlist();
  const check = (source, options) => checkResolutionConfigs(tree({ 'apps/web/next.config.ts': source }), allowlist, options);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  assert.deepEqual(check("import type { NextConfig } from 'next';\nexport default { reactStrictMode: true } satisfies NextConfig;\n"), [], 'the one admitted import, type-only');
  // A1-257-7's first route, as A1 built it: a node: builtin reads the keys from a sibling JSON file.
  fails(check("import type { NextConfig } from 'next';\nimport { readFileSync } from 'node:fs';\n"
    + "const config: NextConfig = { ...JSON.parse(readFileSync(new URL('./next-extra.json', import.meta.url), 'utf8')) };\nexport default config;\n"),
  /next\.config\.ts is not the allowlisted next\.config shape/, "A1's node:fs route");
  fails(check("import { join } from 'node:path';\nexport default { reactStrictMode: true };\n"), /the import of "node:path" is not one the shape admits/, 'a node: builtin, which round two admitted');
  // A1-257-5's second route: the keys arrive by a spread from apps/web/next-extra.ts.
  fails(check("import type { NextConfig } from 'next';\nimport { extra } from './next-extra';\nconst config: NextConfig = { ...extra };\nexport default config;\n"),
    /next\.config\.ts is not the allowlisted next\.config shape/, "A1's sibling module");
  fails(check("import type { Extra } from './types';\nexport default {};\n"), /the import of "\.\/types" is not one the shape admits/, 'a type-only local import');
  fails(check("import { NextConfig } from 'next';\nexport default {};\n"), /the import of "next" is a value import, and the shape admits a type-only import \(`import type`\) only/, 'a value import of next');
  fails(check("import type { NextConfig as C } from 'next';\nexport default {};\n"), /names `NextConfig` as `C`/, 'an aliased type');
  fails(check("export * from '../shared/config';\n"), /is not the allowlisted next\.config shape/, 'a re-export');
  fails(check("export default (await import('./extra.mjs')).default;\n"), /is not the allowlisted next\.config shape/, 'a dynamic import');
  fails(check("const extra = require('./extra.cjs');\nmodule.exports = extra;\n"), /is not the allowlisted next\.config shape/, 'a require');
  fails(check("import { createRequire } from 'node:module';\nconst r = createRequire(import.meta.url);\nexport default r('./x.cjs');\n"), /is not the allowlisted next\.config shape/, 'createRequire');
  fails(check("import pad from 'left-pad';\nexport default pad;\n"), /the import of "left-pad" is not one the shape admits/, 'a package the shape does not name');
  fails(check("import x from 'https://example.com/x.mjs';\nexport default x;\n"), /the import of "https:\/\/example\.com\/x\.mjs" is not one the shape admits/, 'a URL');
  fails(check("/// <reference path=\"./extra.d.ts\" />\nexport default {};\n"), /a triple-slash directive/, 'a reference to a local file');
  // The file is read by the reader the CLI hands over: in CI, the parsed reader, agreeing with the text reader.
  const stand = () => ({ statements: [{ kind: 'import', specifier: './seen-by-the-parser', typeOnly: true, defaultName: null, named: [] }, { kind: 'export-default', value: { object: [] } }], refusals: [] });
  fails(check('export default {};\n', { readShape: stand }), /the import of "\.\/seen-by-the-parser" is not one the shape admits/, 'an import only the given reader reports');
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  assert.match(cli, /const configShape = parser \? parsedShape\(parser, configs\) : readConfigShape;/, 'the CLI reads the configs through the parser when it is loaded');
  assert.match(cli, /\.\.\.checkResolutionConfigs\(configs, allowlist, \{ readShape: configShape \}\),/, 'and judges them with it');
  assert.match(cli, /checkResolutionConfigs\(configs, allowlist, \{ readShape: parsedShape\(parser, configs\) \}\)/, 'its alias controls run through the parser too');
  assert.match(cli, /if \(JSON\.stringify\(result\.shape\) !== JSON\.stringify\(text\)\) return \{ statements: \[\], refusals: \['the TypeScript parser and the text reader read it differently'\] \};/,
    'and the parsed reading counts only when the text reader reads the same');
  for (const control of ["'A1-257-5: an extends into a JSON not named tsconfig, holding paths'", "'A1-257-5: a next.config spreading an object from a sibling module'", "'A1-257-5: jsxImportSource in a tsconfig'",
    "'A1-257-7: a next.config reading its keys from a JSON file through node:fs'", "'A1-257-7, Q0-257r3-1: a turbopack.rules loader in next.config'", "'A1-257-7: a Babel configuration file'"]) {
    assert.ok(cli.includes(control), `the CLI holds the control ${control} before it reads the repository`);
  }
});

test('A1-257-5: a @jsxImportSource, @jsx or @jsxFrag pragma in application code fails, whichever reader runs', async () => {
  const check = (files) => checkJsxPragmas(tree(files));
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  // A1's third route, as A1 measured it: every JSX element of the page imports ../../../db/probe-a1/rt/jsx-runtime.
  fails(check({ 'apps/web/app/page.tsx': "/** @jsxImportSource ../../../db/probe-a1/rt */\nexport default function Page() { return <main />; }\n" }),
    /apps\/web\/app\/page\.tsx:1 uses the `@jsxImportSource` pragma/, "A1's pragma");
  fails(check({ 'apps/web/app/x.tsx': 'export const a = 1;\n/* @jsx h */\n' }), /x\.tsx:2 uses the `@jsx` pragma/, '@jsx');
  fails(check({ 'src/modules/k/application/x.tsx': '// @jsxFrag Fragment\n' }), /x\.tsx:1 uses the `@jsxFrag` pragma/, '@jsxFrag under src/');
  fails(check({ 'apps/web/app/x.ts': '/** @JSXImportSource ./rt */\n' }), /uses the `@JSXImportSource` pragma/, 'in another letter case, which TypeScript reads too');
  fails(check({ 'apps/web/app/x.jsx': "export const s = '@jsxImportSource x';\n" }), /uses the `@jsxImportSource` pragma/, 'spelled in a string, which costs nothing to refuse');
  assert.deepEqual(check({ 'apps/web/app/x.tsx': 'export const jsx = 1; // a jsx note, @jsxs aside\n', 'spikes/WP-X/a.tsx': '/** @jsxImportSource x */\n', 'test-kits/x.tsx': '/* @jsx h */\n', 'apps/web/app/g.css': '/* @jsx */\n' }), [],
    'a word that is not a pragma, and files outside application code, pass');
  // Both readers: the rule reads the text, and the CLI applies it to its controls and to the repository
  // whichever reader it runs (it is not imported here, so its wiring is read as text).
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  assert.equal(cli.match(/\.\.\.checkJsxPragmas\(files\),/g)?.length, 2, 'the CLI judges its controls and the repository with it');
  assert.ok(cli.includes("'A1-257-5: a @jsxImportSource pragma in a page'"), 'and holds a control for it');
});

test('a next.config naming modularizeImports or swcPlugins, and a vitest.config naming alias or resolve, fail unless the allowlisted shape names them', async () => {
  const allowlist = await loadAllowlist();
  const check = (configs, copy = allowlist) => checkResolutionConfigs(tree(configs), copy);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  // Each rewrites what a specifier loads: modularizeImports rewrites an import's path, swcPlugins runs a
  // compiler plugin over every file, and Vite's resolve.alias (or vitest's test.alias) points a specifier elsewhere.
  fails(check({ 'apps/web/next.config.ts': "export default { modularizeImports: { zod: { transform: '../../db/probe/{{member}}' } } };\n" }),
    /apps\/web\/next\.config\.ts is not the allowlisted next\.config shape: `modularizeImports` is a key/, 'a next.config rewriting an import through modularizeImports');
  fails(check({ 'apps/web/next.config.mjs': "export default { experimental: { 'swcPlugins': [['./probe-plugin.wasm', {}]] } };\n" }),
    /apps\/web\/next\.config\.mjs is not the allowlisted next\.config shape: `experimental` is a key/, 'a next.config running an SWC plugin, its key quoted');
  const vitest = "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ resolve: { alias: { zod: './db/probe/target.ts' } } });\n";
  fails(check({ 'vitest.config.ts': vitest }), /^vitest\.config\.ts is not the allowlisted vitest\.config shape: `resolve` is a key/, 'a vitest.config with resolve.alias');
  fails(check({ 'apps/web/vitest.config.mts': "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { alias: { zod: 'pg' } } });\n" }),
    /apps\/web\/vitest\.config\.mts is not the allowlisted vitest\.config shape: `test\.alias` is a key/, "vitest's own test.alias, in a nested config");
  fails(check({ 'vitest.config.ts': "export default { test: {} };\n" }), /the default export is not `defineConfig\(\{ \.\.\. \}\)`/, 'a vitest.config not wrapped as the shape says');
  // R0-257-9: the word scan is gone, so `resolve` in a comment or a string is no longer a refusal.
  assert.deepEqual(check({ 'vitest.config.ts': "import { defineConfig } from 'vitest/config';\n// path.resolve is not used here\nexport default defineConfig({ test: { include: ['apps/**/*.test.ts'], environment: 'node' } });\n",
    'apps/web/next.config.ts': 'export default { images: { unoptimized: true } };\n' }), [], 'a vitest.config and a next.config of the allowlisted shapes pass');
  const widened = JSON.parse(JSON.stringify(allowlist));
  widened.configShapes['vitest.config'].value.resolve = { alias: { zod: 'string' } };
  assert.deepEqual(check({ 'vitest.config.ts': vitest }, widened), [], 'a key is admitted by widening the allowlisted shape, and only so');
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  for (const control of ["'a next.config rewriting an import through modularizeImports'", "'a next.config running an SWC plugin'", "'a vitest.config with resolve.alias'"]) {
    assert.ok(cli.includes(control), `the CLI holds the control ${control} before it reads the repository`);
  }
});

test('Q0-257r2-1: a browser, imports, exports or other module map in a package.json fails unless the allowlist names it', async () => {
  const allowlist = await loadAllowlist();
  const json = (value) => JSON.stringify(value);
  const ROOT = json({ name: 'r', private: true, workspaces: ['apps/web'] });
  const check = (web, copy = allowlist, root = ROOT) => checkResolutionConfigs(tree({ 'package.json': root, 'apps/web/package.json': json({ name: '@r/web', private: true, ...web }) }), copy);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  assert.deepEqual(check({ scripts: { build: 'next build' }, dependencies: { next: '16.3.8' } }), [], 'a package.json with no module map passes');
  // Q0's probe, as Q0 measured it: the client bundle loads ./lib/alt.ts where the code imports ./lib/probe.
  fails(check({ browser: { './lib/probe.ts': './lib/alt.ts' } }), /apps\/web\/package\.json declares `browser`/, "Q0's browser field");
  fails(check({ imports: { '#db': 'pg' } }), /declares `imports`/, "Q0's imports field");
  fails(check({ exports: { '.': './lib/x.js' } }), /declares `exports`/, 'an exports map');
  for (const field of ALIAS_PACKAGE_FIELDS) fails(check({ [field]: {} }), new RegExp(`declares \`${field}\``), `the ${field} field`);
  assert.deepEqual(ALIAS_PACKAGE_FIELDS, ['browser', 'imports', 'exports', 'alias', 'react-native', 'typesVersions']);
  fails(check({}, allowlist, json({ name: 'r', private: true, workspaces: ['apps/web'], browser: './x.js' })), /^package\.json declares `browser`/, 'the root package.json');
  fails(checkResolutionConfigs(tree({ 'apps/web/package.json': '{ "name": "x", }' }), allowlist), /apps\/web\/package\.json is not plain JSON/, 'a package.json the guard cannot read');
  const admitted = { ...allowlist, resolutionAliases: { allowed: [{ file: 'apps/web/package.json', option: 'imports' }] } };
  assert.deepEqual(check({ imports: { '#x': './x.js' } }, admitted), [], 'an allowlist entry admits that file and field');
  fails(check({ browser: {} }, admitted), /declares `browser`/, 'and only that field');
  fails(check({}, admitted, json({ name: 'r', imports: {} })), /^package\.json declares `imports`/, 'and only that file');
});

test('A1-257-7, Q0-257r3-1, R0-257-8, Q0 N12: every build configuration is held to its allowlisted shape, so each route the reviewers built fails', async () => {
  const allowlist = await loadAllowlist();
  const check = (path, source, copy = allowlist) => checkResolutionConfigs(tree({ [path]: source }), copy);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  const NEXT = 'apps/web/next.config.ts';
  const next = (body, head = "import type { NextConfig } from 'next';\n") => `${head}const config: NextConfig = {\n  images: { unoptimized: true },\n${body}};\nexport default config;\n`;
  // The skeleton's own three files pass, and the allowlist names exactly what they use.
  for (const path of ['apps/web/next.config.ts', 'vitest.config.ts', 'apps/web/postcss.config.mjs']) {
    assert.deepEqual(check(path, await readFile(path, 'utf8')), [], `${path} is of its allowlisted shape`);
    assert.equal(configKindOf(path), path.match(/(next|vitest|postcss)\.config/)[0]);
  }
  assert.deepEqual(Object.keys(allowlist.configShapes).filter((k) => k !== '$comment'), ['next.config', 'vitest.config', 'postcss.config']);
  assert.deepEqual(allowlist.configShapes['next.config'].value, { images: { unoptimized: true }, poweredByHeader: 'boolean', reactStrictMode: 'boolean' }, 'next.config: the keys the skeleton uses, and no other');
  assert.deepEqual(allowlist.configShapes['next.config'].imports, [{ specifier: 'next', typeOnly: true, names: ['NextConfig'] }]);
  assert.deepEqual(allowlist.configShapes['next.config'].env, { NEXT_TELEMETRY_DISABLED: '1' });
  assert.deepEqual(Object.keys(allowlist.configShapes['vitest.config'].value.test), ['include', 'exclude', 'environment', 'passWithNoTests']);
  assert.deepEqual(allowlist.configShapes['postcss.config'].value, { plugins: { '@tailwindcss/postcss': {} } });
  assert.match(allowlist.configShapes.$comment, /`turbopack`[\s\S]*`experimental`[\s\S]*`webpack`[\s\S]*`compiler`[\s\S]*`modularizeImports`[\s\S]*`transpilePackages`[\s\S]*`rewrites`[\s\S]*`redirects`/, 'the comment lists what the shape leaves out');

  // next.config: Q0-257r3-1 and A1-257-7's second route, the turbopack.rules loader; then each other form.
  fails(check(NEXT, next("  turbopack: { rules: { '*.tsx': { loaders: ['./probe-loader.cjs'], as: '*.tsx' } } },\n")), /`turbopack` is a key the allowlisted shape does not name/, 'a turbopack.rules loader');
  fails(check(NEXT, "export default { ['resolve' + 'Alias']: { zod: 'pg' } };\n"), /is not the allowlisted next\.config shape/, "Q0's computed key");
  fails(check(NEXT, "export default { ['turbopack']: {} };\n"), /a key that is not written out/, 'a computed key of one string');
  fails(check(NEXT, "export default { ...JSON.parse(process.env.NEXT_EXTRA ?? '{}') };\n"), /is not the allowlisted next\.config shape/, "Q0's process.env keys");
  fails(check(NEXT, "export default { ...process.env };\n"), /a key that is not written out/, 'a spread of process.env');
  fails(check(NEXT, next('  reactStrictMode: process.env.STRICT,\n')), /is not the allowlisted next\.config shape/, 'a value read from process.env');
  fails(check(NEXT, next("  images: { unoptimized: true, loader: 'custom', loaderFile: './probe-loader.ts' },\n").replace('  images: { unoptimized: true },\n', '')), /`images\.loader` is a key the allowlisted shape does not name/, 'an image loader file, which is a module');
  fails(check(NEXT, next('').replace('unoptimized: true', 'unoptimized: false')), /`images\.unoptimized` is false, and the shape admits only true/, 'sharp back in the build');
  fails(check(NEXT, next("  poweredByHeader: 'no',\n")), /`poweredByHeader` is a string, and the shape admits a boolean/, 'a value of another type');
  fails(check(NEXT, next('  reactStrictMode: true,\n  reactStrictMode: false,\n')), /`reactStrictMode` is written twice/, 'a key written twice');
  fails(check(NEXT, next('  webpack: (config) => config,\n')), /is not the allowlisted next\.config shape/, 'a function value');
  fails(check(NEXT, next('  rewrites() { return []; },\n')), /is not the allowlisted next\.config shape/, 'a method');
  for (const key of ['experimental', 'compiler', 'transpilePackages', 'redirects', 'productionBrowserSourceMaps', 'distDir', 'output']) {
    fails(check(NEXT, next(`  ${key}: true,\n`)), new RegExp(`\`${key}\` is a key the allowlisted shape does not name`), `the ${key} key`);
  }
  fails(check(NEXT, "export default async () => ({});\n"), /is not the allowlisted next\.config shape/, 'a config function');
  fails(check(NEXT, "const a = {};\nconst b = {};\nexport default a;\n"), /more than one `const`/, 'two constants');
  fails(check(NEXT, "export default {};\nexport default {};\n"), /2 default exports/, 'two default exports');
  fails(check(NEXT, "let config = {};\nexport default config;\n"), /a statement no allowlisted shape holds/, 'a let');
  fails(check(NEXT, "export const config = {};\n"), /expected default/, 'a named export');
  fails(check(NEXT, "export default other;\n"), /`export default other` names no `const` of this file/, 'an export of a name the file does not declare');
  fails(check(NEXT, "process.env.NODE_OPTIONS ??= '--require ./x.cjs';\nexport default {};\n"), /`process\.env\.NODE_OPTIONS \?\?= .*` is not a default the shape admits/, 'another environment default');
  fails(check(NEXT, "process.env.NEXT_TELEMETRY_DISABLED ??= '0';\nexport default {};\n"), /is not a default the shape admits/, 'telemetry turned back on');
  fails(check(NEXT, "import type { NextConfig } from 'next';\nexport default {} satisfies Other;\n"), /the type `Other` is not one the shape admits/, 'a type the shape does not name');
  fails(check(NEXT, 'export default { a: `x` };\n'), /``` at offset \d+, which no allowlisted shape holds/, 'a template literal');
  fails(check(NEXT, "export default { a: 'x\\u0041' };\n"), /a string at offset \d+ holds an escape/, 'an escape in a string');
  fails(check(NEXT, 'export default { \\u0061: true };\n'), /`\\` at offset \d+/, 'an escape in an identifier');
  fails(check(NEXT, 'export default { a: 1 };\n'), /`1` at offset \d+/, 'a number');
  fails(check(NEXT, 'export default {}; /* open\n'), /an unterminated comment/, 'an unterminated comment');
  fails(check(NEXT, "export default {}\n['a'];\n"), /more after a statement/, 'a statement that ASI would join to the next');

  // vitest.config: R0-257-8 (a spread from an application module), Q0 N12 (an inline resolveId plugin), and the rest.
  const V = 'vitest.config.ts';
  const vitest = (body, head = "import { defineConfig } from 'vitest/config';\n") => `${head}export default defineConfig({\n${body}  test: { environment: 'node' },\n});\n`;
  fails(check(V, vitest('  ...extra,\n', "import { defineConfig } from 'vitest/config';\nimport { extra } from './apps/web/lib/extra';\n")), /is not the allowlisted vitest\.config shape/, "R0's spread from apps/web/lib/extra");
  fails(check(V, vitest("  plugins: [{ name: 'p', enforce: 'pre', resolveId(id) { return id; } }],\n")), /is not the allowlisted vitest\.config shape/, "Q0's inline resolveId plugin");
  fails(check(V, vitest("  plugins: [],\n")), /`plugins` is a key the allowlisted shape does not name/, 'even an empty plugins list');
  fails(check(V, vitest('').replace("environment: 'node'", "environment: './db/probe/env.ts'")), /`test\.environment` is "\.\/db\/probe\/env\.ts", and the shape admits only "node"/, 'a custom environment, which is a module');
  for (const key of ['setupFiles', 'globalSetup', 'alias', 'deps', 'server', 'projects']) {
    fails(check(V, vitest('').replace("test: { environment: 'node' }", `test: { ${key}: [] }`)), new RegExp(`\`test\\.${key}\` is a key the allowlisted shape does not name`), `test.${key}`);
  }
  fails(check(V, vitest('', "import { defineConfig } from 'vitest/node';\n")), /the import of "vitest\/node" is not one the shape admits/, 'defineConfig from another module');
  fails(check(V, "import { defineConfig as d } from 'vitest/config';\nexport default d({ test: {} });\n"), /names `defineConfig` as `d`/, 'an aliased wrapper');
  fails(check(V, "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: {} }, {});\n"), /the default export is not `defineConfig\(\{ \.\.\. \}\)`/, 'a second argument');
  fails(check(V, vitest('').replace("'node'", "'node', include: 'apps'")), /`test\.include` is a string, and the shape admits an array/, 'include as a string');

  // postcss.config: only @tailwindcss/postcss, with no options, and no import.
  const P = 'apps/web/postcss.config.mjs';
  fails(check(P, "export default { plugins: { './probe-plugin.js': {} } };\n"), /`plugins\.\.\/probe-plugin\.js` is a key the allowlisted shape does not name/, 'a local plugin');
  fails(check(P, "export default { plugins: { '@tailwindcss/postcss': { base: '../../db' } } };\n"), /`plugins\.@tailwindcss\/postcss\.base` is a key/, 'plugin options');
  fails(check(P, "export default { plugins: ['@tailwindcss/postcss'] };\n"), /`plugins` is a array, and the shape admits an object of written keys/, 'the array form');
  fails(check(P, "import tailwind from '@tailwindcss/postcss';\nexport default { plugins: [tailwind()] };\n"), /the import of "@tailwindcss\/postcss" is not one the shape admits/, 'a plugin imported as a value');
  fails(check(P, "export default { plugins: {}, syntax: 'postcss-scss' };\n"), /`syntax` is a key the allowlisted shape does not name/, 'a syntax module');

  // The rule reads the copy: with no shape for a kind, every file of that kind fails.
  const bare = { ...allowlist, configShapes: {} };
  fails(check(NEXT, await readFile(NEXT, 'utf8'), bare), /no allowlisted shape for a next\.config/, 'no shape, no file');
  assert.deepEqual(configShapeProblems('next.config', readConfigShape(await readFile(NEXT, 'utf8')), allowlist.configShapes['next.config']), []);
});

test('A1-257-7: a Babel, extra PostCSS, Vite or vitest workspace configuration anywhere, and a babel or postcss key in any package.json, fail', async () => {
  const allowlist = await loadAllowlist();
  const check = (configs) => checkResolutionConfigs(tree(configs), allowlist);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  // A1-257-7's third route, as A1 built it: Next.js picks up apps/web/.babelrc by itself.
  fails(check({ 'apps/web/.babelrc': JSON.stringify({ presets: ['next/babel'], plugins: ['./probe-babel.cjs'] }) }), /apps\/web\/\.babelrc is a Babel configuration/, "A1's .babelrc");
  for (const path of ['.babelrc.json', 'apps/web/.babelrc.js', 'babel.config.js', 'apps/web/babel.config.cjs', 'src/modules/x/babel.config.json']) {
    fails(check({ [path]: '{}' }), new RegExp(`^${path.replace(/[.]/g, '\\.')} is a Babel configuration`), path);
  }
  fails(check({ 'apps/web/.postcssrc.json': '{}' }), /is a PostCSS configuration other than postcss\.config\.\*/, '.postcssrc.json');
  fails(check({ '.postcssrc': '{}' }), /^\.postcssrc is a PostCSS configuration/, '.postcssrc');
  fails(check({ 'vite.config.ts': 'export default {};\n' }), /^vite\.config\.ts is a Vite configuration/, 'a vite.config');
  fails(check({ 'apps/web/vitest.workspace.ts': 'export default [];\n' }), /is a vitest workspace file/, 'a vitest workspace');
  assert.equal(REFUSED_CONFIG_FILES.length, 6, 'five kinds of file, and since A1-257-8 anything under a .config/ directory');
  const json = (value) => JSON.stringify(value);
  fails(check({ 'apps/web/package.json': json({ name: '@r/web', private: true, babel: { plugins: ['./probe-babel.cjs'] } }) }), /apps\/web\/package\.json declares `babel`, a Babel configuration/, 'a babel key');
  fails(check({ 'package.json': json({ name: 'r', private: true, postcss: { plugins: { './x.js': {} } } }) }), /^package\.json declares `postcss`, a PostCSS configuration/, 'a postcss key');
  assert.deepEqual(CONFIG_PACKAGE_FIELDS, ['babel', 'postcss']);
  const admitted = { ...allowlist, resolutionAliases: { allowed: [{ file: 'apps/web/package.json', option: 'babel' }, { file: 'apps/web/.babelrc', option: 'plugins' }] } };
  fails(checkResolutionConfigs(tree({ 'apps/web/package.json': json({ name: 'x', babel: {} }), 'apps/web/.babelrc': '{}' }), admitted), /declares `babel`/, 'no allowlist entry admits them');
  // The walk finds them on disk wherever they stand, outside node_modules.
  const root = await mkdtemp(join(tmpdir(), 'app-boundaries-'));
  try {
    const write = async (path, text) => { await mkdir(join(root, path, '..'), { recursive: true }); await writeFile(join(root, path), text); };
    for (const path of ['apps/web/.babelrc', 'db/x/babel.config.mjs', 'apps/web/.postcssrc.yml', 'vite.config.mts', 'apps/web/postcss.config.mjs', 'apps/web/node_modules/x/.babelrc']) await write(path, '{}');
    const configs = await collectResolutionConfigs(root);
    assert.deepEqual([...configs.keys()].sort(), ['apps/web/.babelrc', 'apps/web/.postcssrc.yml', 'apps/web/postcss.config.mjs', 'db/x/babel.config.mjs', 'vite.config.mts']);
    assert.equal(checkResolutionConfigs(configs, allowlist).length, 5, 'each fails, the postcss.config.mjs by its shape');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A1-257-7: a Tailwind @plugin or @config in CSS is read as an import and held to the same rules', async () => {
  const { found, refusals } = extractSpecifiers("@import 'tailwindcss';\n@plugin '../../../db/probe/plugin.js';\n@config \"./tailwind.config.mjs\";\n/* @plugin 'not-read' */\n", 'apps/web/app/globals.css');
  assert.deepEqual(found.map((f) => [f.specifier, f.kind]), [['tailwindcss', 'css-import'], ['../../../db/probe/plugin.js', 'css-plugin'], ['./tailwind.config.mjs', 'css-config']]);
  assert.deepEqual(refusals, []);
  assert.match(extractSpecifiers('@plugin someName;\n', 'apps/web/app/x.css').refusals.join(), /`@plugin` at offset 0 names no module as one string literal/);
  await mustFail({ 'apps/web/app/globals.css': "@import 'tailwindcss';\n@plugin '../../../db/probe/plugin.js';\n" }, /apps\/web\/app\/globals\.css imports \.\.\/\.\.\/\.\.\/db\/probe\/plugin\.js, which names no file/, 'a plugin from db/');
  await mustFail({ 'apps/web/app/globals.css': "@plugin '@tailwindcss/typography';\n" }, /imports @tailwindcss\/typography: @tailwindcss\/typography is not in RFC-2026-029/, 'a plugin package the allowlist does not name');
  await mustFail({ 'apps/web/app/globals.css': "@plugin './plugin.js';\n", 'apps/web/app/plugin.js': "import pg from 'pg';\nexport default pg;\n" }, /apps\/web\/app\/plugin\.js imports pg/, 'a local plugin is read as application code');
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  assert.ok(cli.includes("'A1-257-7: a Tailwind @plugin loading a module from outside the application'"), 'the CLI holds a control for it');
});

test('A1-257-8, C0-257r4-1: every PostCSS configuration name Turbopack reads but postcss.config.*, and anything under a .config/ directory, fails wherever it stands', async () => {
  const allowlist = await loadAllowlist();
  const check = (configs) => checkResolutionConfigs(tree(configs), allowlist);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  // The list is Turbopack's own (Next.js 16.3.8), as the installed binary holds it; the allowlist says where it came from.
  assert.equal(POSTCSS_SEARCH_NAMES.length, 27);
  assert.equal(new Set(POSTCSS_SEARCH_NAMES).size, 27);
  assert.deepEqual(POSTCSS_SEARCH_NAMES.filter((n) => n.startsWith('.config/')), ['', '.json', '.yaml', '.yml', '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'].map((e) => `.config/postcssrc${e}`));
  assert.match(allowlist.configShapes.$comment, /search list of Turbopack in Next\.js 16\.3\.8, read on 2026-10-12 from the strings of the installed @next\/swc-darwin-arm64 16\.3\.8 binary/);
  assert.match(allowlist.configShapes.$comment, /any file under a `\.config\/` directory \(A1-257-8, C0-257r4-1\)/);
  // A1's and C0's files, as they built and probed them: each fails, by name, before any shape is read.
  fails(check({ 'apps/web/.config/postcssrc.json': JSON.stringify({ plugins: { '@tailwindcss/postcss': {}, '../../../../../db/probe-a1/pc.mjs': {} } }) }),
    /^apps\/web\/\.config\/postcssrc\.json is a file under a `\.config\/` directory, where build tools look for their own configuration .*\(A1-257-8, C0-257r4-1\)$/, "A1's apps/web/.config/postcssrc.json");
  fails(check({ '.config/postcssrc.mjs': "export default { plugins: { 'postcss-import': {} } };\n" }), /^\.config\/postcssrc\.mjs is a file under a `\.config\/` directory/, "C0's .config/postcssrc.mjs");
  // Every name on the list, at the root, in apps/web and in a module: refused, or (postcss.config.*) held to the shape.
  for (const directory of ['', 'apps/web/', 'src/modules/x/']) {
    for (const name of POSTCSS_SEARCH_NAMES) {
      const path = `${directory}${name}`;
      const problems = check({ [path]: '{ "plugins": { "@tailwindcss/postcss": {} } }' });
      if (name.startsWith('postcss.config.')) {
        assert.equal(configKindOf(path), 'postcss.config', path);
        fails(problems, /is not the allowlisted postcss\.config shape: a statement no allowlisted shape holds/, `${path}, JSON where a program must stand`);
      } else {
        fails(problems, new RegExp(`^${path.replace(/[.]/g, '\\.')} is (?:a PostCSS configuration other than postcss\\.config\\.\\*|a file under a \`\\.config\\/\` directory)`), path);
      }
    }
  }
  fails(check({ 'apps/web/.config/anything.json': '{}' }), /is a file under a `\.config\/` directory/, 'not only PostCSS: any file there');
  // The walk reads them on disk, a .config entry that is a symbolic link included, and not inside node_modules.
  const root = await mkdtemp(join(tmpdir(), 'app-boundaries-config-'));
  try {
    const write = async (path, text) => { await mkdir(join(root, path, '..'), { recursive: true }); await writeFile(join(root, path), text); };
    for (const path of ['apps/web/.config/postcssrc.json', '.config/postcssrc.mjs', 'src/modules/x/.config/tool/settings', 'apps/web/node_modules/x/.config/postcssrc.json']) await write(path, '{}');
    await mkdir(join(root, 'db'), { recursive: true });
    await symlink('../apps', join(root, 'db/.config'));
    const configs = await collectResolutionConfigs(root);
    assert.deepEqual([...configs.keys()].sort(), ['.config/postcssrc.mjs', 'apps/web/.config/postcssrc.json', 'db/.config', 'src/modules/x/.config/tool/settings']);
    const problems = checkResolutionConfigs(configs, allowlist);
    assert.equal(problems.length, 4, problems.join(' | '));
    assert.ok(problems.every((p) => /is a file under a `\.config\/` directory/.test(p)), problems.join(' | '));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  for (const control of ["'A1-257-8: a PostCSS configuration in apps/web/.config/, which Turbopack reads ahead of postcss.config.mjs'", "'C0-257r4-1: a .config/postcssrc.mjs at the root'"]) {
    assert.ok(cli.includes(control), `the CLI holds the control ${control}`);
  }
});

test('A1-257-9: a tracked .env file under apps/, src/ or at the root fails, .env.example excepted; an untracked one is not the rule\'s', async () => {
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  assert.deepEqual(checkTrackedFiles(collectTrackedFiles('.')), [], 'the repository as it stands tracks none');
  assert.ok(collectTrackedFiles('.').includes('apps/web/next.config.ts'), 'and the list is the repository\'s');
  for (const path of ['apps/web/.env', '.env', '.env.local', '.env.production', '.env.production.local', 'apps/web/.env.development.local', 'src/modules/x/.env', 'apps/.env.test']) {
    fails(checkTrackedFiles([path]), new RegExp(`^${path.replace(/[.]/g, '\\.')} is a tracked environment file: Next\\.js loads it into the build.*\\(A1-257-9\\)$`), path);
  }
  assert.deepEqual(checkTrackedFiles(['.env.example', 'apps/web/.env.example', 'db/.env', 'scripts/.env.test', 'apps/web/app/env.ts', 'apps/web/lib/.environment/x.ts']), [],
    'a template, and files outside apps/, src/ and the root, or not named .env*, are not this rule\'s');
  fails(checkTrackedFiles(['apps/web/.config/postcssrc.json']), /^apps\/web\/\.config\/postcssrc\.json is a tracked file under a `\.config\/` directory/, 'a tracked .config/ file (A1-257-8)');
  fails(checkTrackedFiles(null), /the tracked files could not be listed/, 'a list git could not give fails closed');
  // A1's route, in a repository of its own: apps/web/.env setting NODE_OPTIONS, force-added past .gitignore.
  const root = await mkdtemp(join(tmpdir(), 'app-boundaries-env-'));
  try {
    const git = (...args) => { const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`); };
    git('-c', 'init.defaultBranch=main', 'init', '-q');
    await mkdir(join(root, 'apps/web'), { recursive: true });
    await writeFile(join(root, '.gitignore'), '.env*\n!.env.example\n');
    await writeFile(join(root, 'apps/web/.env'), 'NODE_OPTIONS=--import ../../db/probe-a1/preload.mjs\n');
    await writeFile(join(root, 'apps/web/.env.local'), 'NEXT_PUBLIC_X=1\n');
    await writeFile(join(root, 'apps/web/.env.example'), 'NEXT_PUBLIC_X=\n');
    git('add', '.gitignore', 'apps/web/.env.example');
    assert.deepEqual(checkTrackedFiles(collectTrackedFiles(root)), [], 'before the force-add: the template is tracked, the local file is not');
    git('add', '-f', 'apps/web/.env');
    assert.deepEqual(collectTrackedFiles(root).sort(), ['.gitignore', 'apps/web/.env', 'apps/web/.env.example']);
    const problems = checkTrackedFiles(collectTrackedFiles(root));
    assert.equal(problems.length, 1, problems.join(' | '));
    assert.match(problems[0], /^apps\/web\/\.env is a tracked environment file/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  assert.equal(collectTrackedFiles(tmpdir()), null, 'outside a repository git lists nothing, and the guard says so');
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  assert.ok(cli.includes("'A1-257-9: a tracked apps/web/.env setting NODE_OPTIONS'"), 'the CLI holds the control');
  assert.match(cli, /\n {4}\.\.\.checkTrackedFiles\(collectTrackedFiles\('\.'\)\),\n/, 'and applies the rule to the repository');
  assert.match(cli, /\n {2}for \(const \[name, paths, pattern\] of TRACKED_CONTROLS\) \{\n/, 'and runs every tracked-file control');
});

test('A1 advisory (round four): the text reader ends a // comment at CR, U+2028 and U+2029 as at LF, so a key written after one is read, as the compiler reads it', async () => {
  const allowlist = await loadAllowlist();
  const NEXT = 'apps/web/next.config.ts';
  const body = (terminator) => "import type { NextConfig } from 'next';\nconst config: NextConfig = {\n  images: { unoptimized: true },\n"
    + `  // note${terminator}turbopack: { resolveAlias: { zod: '../../db/x.ts' } },\n  reactStrictMode: true,\n};\nexport default config;\n`;
  for (const [name, terminator] of [['LF', '\n'], ['CR', '\r'], ['U+2028', '\u2028'], ['U+2029', '\u2029'], ['CR LF', '\r\n']]) {
    const reading = readConfigShape(body(terminator));
    assert.deepEqual(reading.refusals, [], name);
    const keys = reading.statements.find((st) => st.kind === 'const').value.object.map(([key]) => key);
    assert.deepEqual(keys, ['images', 'turbopack', 'reactStrictMode'], `${name}: the key after the comment is read`);
    const problems = checkResolutionConfigs(tree({ [NEXT]: body(terminator) }), allowlist);
    assert.ok(problems.some((p) => /`turbopack` is a key the allowlisted shape does not name/.test(p)), `${name}: ${problems.join(' | ') || 'no problem reported'}`);
  }
  // A comment that runs to the end of the file still ends there.
  assert.deepEqual(readConfigShape('export default {};\n// last line, no terminator').refusals, []);
});

test('A1-257-10: every workspace package.json declares exactly its allowlisted scripts, so a prebuild or postbuild hook or a changed build command fails', async () => {
  const allowlist = await loadAllowlist();
  const json = (value) => JSON.stringify(value);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  const ROOT = await readFile('package.json', 'utf8');
  const WEB = JSON.parse(await readFile('apps/web/package.json', 'utf8'));
  const check = (scripts, path = 'apps/web/package.json') => checkResolutionConfigs(tree({ 'package.json': ROOT, [path]: json({ ...WEB, scripts }) }), allowlist);
  // The allowlist names apps/web's one script, and the repository's package.json files pass as they stand.
  assert.deepEqual(Object.keys(allowlist.workspaceScripts).filter((k) => k !== '$comment'), ['apps/web']);
  assert.deepEqual(allowlist.workspaceScripts['apps/web'], { build: 'next build' });
  assert.match(allowlist.workspaceScripts.$comment, /A1-257-10[\s\S]*`postbuild`[\s\S]*no other script \(a `pre\*`\/`post\*` hook included\)/);
  assert.deepEqual(WEB.scripts, { build: 'next build' }, 'apps/web declares the build and nothing else');
  assert.deepEqual(checkResolutionConfigs(tree({ 'package.json': ROOT, 'apps/web/package.json': json(WEB) }), allowlist), [], 'the repository\'s package.json files pass');
  assert.deepEqual(check(undefined), [], 'a workspace that declares no scripts runs none, and passes');
  // A1's route 1, as A1 built it: a prebuild and a postbuild beside the unchanged build.
  const hook = 'node ../../db/probe-a1/post.mjs';
  fails(check({ prebuild: hook, build: 'next build' }), /^apps\/web\/package\.json declares the script `prebuild`, a hook npm runs around another script without being asked; .*\(build\) \(A1-257-10\)$/, "A1's prebuild");
  fails(check({ build: 'next build', postbuild: hook }), /^apps\/web\/package\.json declares the script `postbuild`, a hook npm runs around another script/, "A1's postbuild");
  fails(check({ build: `next build && ${hook}` }), /^apps\/web\/package\.json declares the script `build` as "next build && node \.\.\/\.\.\/db\/probe-a1\/post\.mjs", and the allowlist admits exactly "next build" \(A1-257-10\)$/, 'a changed build command');
  fails(check({ build: 'next build --debug' }), /declares the script `build` as "next build --debug"/, 'a flag added to the build');
  fails(check({ build: 'next build', dev: 'next dev' }), /declares the script `dev`; a workspace declares exactly/, 'any other script, not only a hook');
  fails(check({ build: 'next build', pretest: hook, postinstall: hook }), /declares the script `pretest`, a hook/, 'a hook of another script');
  fails(check({}), /declares `scripts` without `build`/, 'scripts declared without the build');
  fails(check(['next build']), /declares `scripts` that is not an object of commands/, 'scripts that are not an object');
  fails(check({ build: 'next build' }, 'db/tool/package.json'), /^db\/tool\/package\.json declares the script `build`; .*\(none\)/, 'a package.json in a directory the allowlist names no scripts for declares none');
  // The root is the test-integrity tooling's: its names are pinned there, and this rule leaves it alone.
  assert.deepEqual(workspaceScriptProblems('package.json', { scripts: { prebuild: hook } }, allowlist), []);
  const floorTest = await readFile('test-kits/test-coverage-floor.test.mjs', 'utf8');
  assert.match(floorTest, /assert\.deepEqual\(Object\.keys\(manifest\.scripts\)\.sort\(\), \[/, 'the root\'s script names are pinned by the test-integrity tooling');
  const removed = { ...allowlist, workspaceScripts: { 'apps/web': { build: 'next build', postbuild: hook } } };
  assert.deepEqual(checkResolutionConfigs(tree({ 'apps/web/package.json': json({ ...WEB, scripts: { build: 'next build', postbuild: hook } }) }), removed), [], 'the rule reads the allowlist, not a list written here');
  // The walk reads the workspace's package.json from disk, as npm does.
  const root = await mkdtemp(join(tmpdir(), 'app-boundaries-scripts-'));
  try {
    await mkdir(join(root, 'apps/web'), { recursive: true });
    await writeFile(join(root, 'package.json'), ROOT);
    await writeFile(join(root, 'apps/web/package.json'), json({ ...WEB, scripts: { build: 'next build', postbuild: hook } }));
    const problems = checkResolutionConfigs(await collectResolutionConfigs(root), allowlist);
    assert.equal(problems.length, 1, problems.join(' | '));
    assert.match(problems[0], /^apps\/web\/package\.json declares the script `postbuild`/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  for (const control of ["'A1-257-10: a prebuild hook in apps/web/package.json'", "'A1-257-10: a postbuild hook in apps/web/package.json'", "'A1-257-10: a changed build command in apps/web/package.json'"]) {
    assert.ok(cli.includes(control), `the CLI holds the control ${control}`);
  }
});

test("A1's advisory (round five): a configuration or environment file is refused, and collected, in any letter case", async () => {
  const allowlist = await loadAllowlist();
  const check = (configs) => checkResolutionConfigs(tree(configs), allowlist);
  const fails = (problems, pattern, why) => assert.ok(problems.some((p) => pattern.test(p)), `${why}: ${problems.join(' | ') || 'no problem reported'}`);
  const escape = (path) => path.replace(/[.]/g, '\\.');
  // A1's probe: apps/web/.Config/postcssrc.json, which macOS opens for Turbopack's .config/postcssrc.json.
  for (const path of ['apps/web/.Config/postcssrc.json', '.CONFIG/postcssrc.mjs', 'src/modules/x/.cOnFiG/tool']) {
    fails(check({ [path]: '{}' }), new RegExp(`^${escape(path)} is a file under a \`\\.config\\/\` directory`), path);
  }
  for (const [path, what] of [['.PostCSSrc', 'a PostCSS configuration other'], ['apps/web/.POSTCSSRC.JSON', 'a PostCSS configuration other'], ['apps/web/Babel.config.js', 'a Babel configuration'],
    ['.BabelRC', 'a Babel configuration'], ['apps/web/.babelrc.JSON', 'a Babel configuration'], ['Vite.config.ts', 'a Vite configuration'], ['apps/web/Vitest.Workspace.ts', 'a vitest workspace file']]) {
    fails(check({ [path]: '{}' }), new RegExp(`^${escape(path)} is ${what}`), path);
  }
  // A build configuration in another letter case is held to its shape, as the tool would load it.
  for (const [path, kind] of [['apps/web/PostCSS.config.js', 'postcss.config'], ['apps/web/Next.Config.TS', 'next.config'], ['Vitest.config.mts', 'vitest.config']]) {
    assert.equal(configKindOf(path), kind, path);
    fails(check({ [path]: "export default { plugins: { './probe.js': {} } };\n" }), new RegExp(`^${escape(path)} is not the allowlisted ${escape(kind)} shape`), path);
  }
  // Tracked environment and .config/ files, in any letter case; the template keeps its one spelling.
  for (const path of ['apps/web/.ENV', '.Env.Local', 'src/modules/x/.ENV.production']) {
    fails(checkTrackedFiles([path]), new RegExp(`^${escape(path)} is a tracked environment file`), path);
  }
  fails(checkTrackedFiles(['apps/web/.Config/postcssrc.json']), /is a tracked file under a `\.config\/` directory/, 'a tracked .Config/ file');
  assert.deepEqual(checkTrackedFiles(['.env.example', 'apps/web/.env.example']), [], 'the template passes');
  // The walk collects them from disk whatever their case, and nothing under node_modules.
  const root = await mkdtemp(join(tmpdir(), 'app-boundaries-case-'));
  try {
    const write = async (path, text) => { await mkdir(join(root, path, '..'), { recursive: true }); await writeFile(join(root, path), text); };
    for (const path of ['apps/web/.Config/postcssrc.json', 'apps/web/Babel.Config.JS', 'apps/web/node_modules/x/.Config/postcssrc.json']) await write(path, '{}');
    const configs = await collectResolutionConfigs(root);
    assert.deepEqual([...configs.keys()].sort(), ['apps/web/.Config/postcssrc.json', 'apps/web/Babel.Config.JS']);
    assert.equal(checkResolutionConfigs(configs, allowlist).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  const cli = await readFile('scripts/verify-app-boundaries.mjs', 'utf8');
  assert.ok(cli.includes('"A1 advisory (round five): a .Config/ directory in another letter case"'), 'the CLI holds a control for it');
  assert.ok(cli.includes("'A1 advisory (round five): a tracked apps/web/.ENV in another letter case'"), 'and one for a tracked .ENV');
});
