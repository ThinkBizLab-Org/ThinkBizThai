import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkBoundaries,
  checkSecretsAndMigrations,
  collectDirectories,
  collectSources,
  extractSpecifiers,
  packageNameOf,
} from '../scripts/verify-app-boundaries.mjs';
import { loadAllowlist } from '../scripts/verify-app-dependencies.mjs';

// RFC-2026-029 §8/4 (the §6.3 boundaries) and §8/5 (WP-1A-A0-002). ESLint is deferred by the
// Product Owner (2026-10-12, `ไม่ใส่ตอนนี้ (Recommended)`), so each boundary is a rule of
// scripts/verify-app-boundaries.mjs, and each is shown here to fail on a tree built to break it.
// The trees are in-memory maps of path to source text; nothing is written and nothing is installed.

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
  assert.deepEqual(checkSecretsAndMigrations(files, await collectDirectories('.'), allowlist), []);
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
