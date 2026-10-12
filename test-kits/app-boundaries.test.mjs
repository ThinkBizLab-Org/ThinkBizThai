import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  checkBoundaries,
  checkRepositoryImports,
  checkResolutionConfigs,
  checkSecretsAndMigrations,
  checkTypeDirectives,
  collectDirectories,
  collectRepositoryCode,
  collectResolutionConfigs,
  collectSources,
  extractSpecifiers,
  packageNameOf,
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
  assert.ok(configs.has('tsconfig.json') && configs.has('apps/web/tsconfig.json') && configs.has('apps/web/next.config.ts'),
    `the alias walk reaches every resolution config (${[...configs.keys()].join(', ')})`);
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
  assert.deepEqual(check({ 'tsconfig.json': json({ extends: './tsconfig.base.json', include: ['apps/**/*.ts'] }), 'apps/web/next.config.ts': 'export default { images: { unoptimized: true } };\n' }), []);
  fails(check({ 'tsconfig.json': json({ compilerOptions: { paths: { zod: ['./node_modules/pg'] } } }) }), /tsconfig\.json sets compilerOptions\.paths/, 'an alias of an allowlisted name onto pg');
  fails(check({ 'apps/web/tsconfig.json': json({ compilerOptions: { baseUrl: '.' } }) }), /sets compilerOptions\.baseUrl/, 'a baseUrl');
  fails(check({ 'tsconfig.base.json': json({ compilerOptions: { rootDirs: ['src', 'apps'] } }) }), /sets compilerOptions\.rootDirs/, 'rootDirs');
  fails(check({ 'tsconfig.json': json({ extends: '@tsconfig/next/tsconfig.json' }) }), /extends "@tsconfig\/next\/tsconfig\.json", which is not a file in this repository/, 'an extends from a package');
  fails(check({ 'jsconfig.json': json({ compilerOptions: { paths: { '@/*': ['./*'] } } }) }), /jsconfig\.json sets compilerOptions\.paths/, 'a jsconfig');
  fails(check({ 'tsconfig.json': '{ // a comment\n "compilerOptions": {} }' }), /is not plain JSON/, 'a tsconfig the guard cannot read');
  fails(check({ 'apps/web/next.config.ts': "export default { turbopack: { resolveAlias: { zod: 'pg' } } };\n" }), /names `resolveAlias`/, 'a turbopack alias');
  fails(check({ 'apps/web/next.config.mjs': "export default { 'webpack': (c) => c };\n" }), /next\.config\.mjs names `webpack`/, 'a quoted webpack hook');
  fails(check({ 'apps/web/next.config.ts': 'export default { typescript: { tsconfigPath: "./other.json" } };\n' }), /names `tsconfigPath`/, 'another tsconfig');
  fails(check({ 'apps/web/next.config.ts': 'export default { experimental: { alias: {} } };\n' }), /names `alias`/, 'a bare alias key');
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
