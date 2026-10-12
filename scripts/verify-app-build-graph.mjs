import { readFile, readdir } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLOWLIST_PATH, loadAllowlist } from './verify-app-dependencies.mjs';

// RFC-2026-029 §6.3 and §8/4, held on what `next build` actually included (A1-257-7, WP-1A-A0-002).
//
// The boundary guard (scripts/verify-app-boundaries.mjs) reads the sources and the configuration
// before the build; three review rounds each found another configuration route (a path alias, a
// module map, a loader, a Babel plugin, a key read from another file) that made the bundler load a
// module no statement names. The configuration is now held to allowlisted shapes; this check backs
// those shapes up from the other side, and does not replace them. After `next build`, in CI's
// application job, it reads what the build output names -- what the bundler and Next.js's file tracer
// say they included:
//
//   - every `*.nft.json` trace's `files` (the files a server entry needs at run time);
//   - every source map's `sources` (and `sections[].map.sources`): the modules bundled into a server
//     or build chunk, written `turbopack:///[project]/<path>` or relative to the map;
//   - every Turbopack module id `[project]/<path>` written in a server or build chunk or manifest
//     (the client reference manifests list the client modules this way);
//
// resolves each to a repository path and refuses any that is outside apps/web/** and src/modules/**
// (§6.3), under src/modules/platform-kernel/adapters/** (§6.3/5), outside the repository, or in a
// package that is not reachable, through package-lock.json, from an allowlisted package the
// application tree may import (pg excluded, §6.3/5). Turbopack's own runtime (`[turbopack]`,
// `[turbopack-node]`) is not a repository file. A source it cannot place fails closed.
//
// WHAT IT DOES NOT SEE (A1-257-8, A1-257-9, A1-257-10). It reads what the output names, not what ran
// to make it. Code that runs during the build -- a NODE_OPTIONS preload, a loader, a PostCSS or Babel
// plugin loaded by `require`, an npm `postbuild` hook, a page's own code at prerender -- is named in no
// trace, map or module id, and can change the output after the traces and maps are written. What
// configuration can make a build tool load is held before the build, by the configuration shapes and
// refused files of scripts/app-boundaries.mjs (a `.config/` directory and every PostCSS name but
// postcss.config.* among them, in any letter case), its refusal of a tracked `.env*` file, its pin of
// every workspace's `scripts`, and CI's NODE_OPTIONS set to '' for the whole application job. Code the
// repository itself runs in CI after the guard (a test, a page at prerender, build-time code it imports)
// could still write files or change the output; that residual is held by review of every pull
// request, not by this check or any other.
//
// Client chunks carry no module path in a production build and no source map (productionBrowserSourceMaps
// is not in the next.config shape: it would publish the source). A client component rendered on the
// server has its modules in the server chunks read here. A module reached only through
// `next/dynamic(..., { ssr: false })` is not rendered on the server and may be in client chunks alone,
// so it may be an exception this check does not see (not measured; C0-257r4-2); its import statements
// are still read by the boundary guard. What only a browser condition would select is a package's own
// `browser` map inside node_modules, which stays inside a reachable package.
//
// Dependency-free (node: builtins only), so `npm run check` drives these rules through
// test-kits/app-stack.test.mjs; the CLI runs its negative controls before it reads the build:
//
//   node scripts/verify-app-build-graph.mjs [build directory, relative to the repository root;
//                                            default apps/web/.next]

export const BUILD_DIRECTORY = 'apps/web/.next';
const READ = /\.(?:js|json|map)$/;
const SKIPPED = new Set(['cache', 'types', 'diagnostics']);
const MODULE_ID = /\[project\]\/([^\s"'`\\?]+)/g;

// The build's text files a graph is read from: build-relative path -> text. `cache`, `diagnostics` and
// the generated `types` are not what the bundle holds.
export async function collectBuild(directory = BUILD_DIRECTORY) {
  const files = new Map();
  const walk = async (relative) => {
    for (const entry of await readdir(posix.join(directory, relative), { withFileTypes: true })) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { if (!(relative === '' && SKIPPED.has(entry.name))) await walk(path); continue; }
      if (entry.isFile() && READ.test(path)) files.set(path, await readFile(posix.join(directory, path), 'utf8'));
    }
  };
  await walk('');
  return files;
}

// Every package the application tree may reach: the allowlisted packages whose cells admit a file
// under apps/ or src/ (or any file), and everything package-lock.json says they depend on, optionally
// or as a peer, transitively; pg is left out, as nothing under apps/web reaches it (§6.3/5).
export function reachablePackages(lock, allowlist) {
  const entries = new Map();
  for (const [path, entry] of Object.entries(lock?.packages ?? {})) {
    if (!path.includes('node_modules/') || entry?.link) continue;
    const name = entry.name ?? path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    entries.set(name, [...(entries.get(name) ?? []), entry]);
  }
  const roots = [...allowlist.runtime, ...allowlist.development]
    .filter((row) => row.name !== 'pg' && row.imports.some((glob) => /^(?:apps\/|src\/|\*\*)/.test(glob)))
    .map((row) => row.name);
  const reached = new Set();
  const queue = [...roots];
  while (queue.length > 0) {
    const name = queue.shift();
    if (reached.has(name) || name === 'pg') continue;
    reached.add(name);
    for (const entry of entries.get(name) ?? []) {
      for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) queue.push(...Object.keys(entry[field] ?? {}));
    }
  }
  return reached;
}

// Where the build says each included file came from: [{ from, path }] with `path` repository-relative
// (it may begin with `../` when it leaves the repository), plus what it could not place.
export function readBuildGraph(build, directory = BUILD_DIRECTORY) {
  const included = [];
  const unplaced = [];
  const place = (from, base, written) => {
    let text;
    try { text = decodeURIComponent(written); } catch { text = written; }
    text = text.split('?')[0];
    if (text.startsWith('turbopack:///')) {
      const rest = text.slice('turbopack:///'.length);
      if (rest.startsWith('[project]/')) { included.push({ from, path: posix.normalize(rest.slice('[project]/'.length)) }); return; }
      if (/^\[turbopack(?:-node)?\]\//.test(rest)) return; // Turbopack's runtime, not a repository file
      unplaced.push(`${from} names ${written}, a Turbopack source the check cannot place`);
      return;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(text) || posix.isAbsolute(text)) { unplaced.push(`${from} names ${written}, an absolute or URL source the check cannot place`); return; }
    included.push({ from, path: posix.normalize(posix.join(base, text)) });
  };
  for (const [file, raw] of build) {
    const base = posix.join(directory, posix.dirname(file));
    if (file.endsWith('.nft.json') || file.endsWith('.map')) {
      let value;
      try { value = JSON.parse(raw); } catch (error) { unplaced.push(`${file} is not JSON (${error.message}); a trace or map the check cannot read may hide a module`); continue; }
      if (file.endsWith('.nft.json')) {
        if (!Array.isArray(value?.files)) { unplaced.push(`${file} has no files list`); continue; }
        for (const entry of value.files) place(file, base, String(entry));
      } else {
        const maps = [value, ...(Array.isArray(value?.sections) ? value.sections.map((s) => s?.map ?? {}) : [])];
        for (const map of maps) {
          const root = typeof map.sourceRoot === 'string' && map.sourceRoot !== '' ? posix.join(base, map.sourceRoot) : base;
          for (const source of Array.isArray(map.sources) ? map.sources : []) place(file, root, String(source));
        }
      }
    }
    if (!file.endsWith('.map')) {
      for (const m of raw.matchAll(MODULE_ID)) included.push({ from: file, path: posix.normalize(m[1]) });
    }
  }
  return { included, unplaced };
}

// The verdict on one path the build included.
export function judgeIncluded(path, reachable) {
  if (path === '..' || path.startsWith('../') || posix.isAbsolute(path)) return 'is outside the repository';
  const packageAt = path.match(/^(?:apps\/web\/)?node_modules\/(.+)$/);
  if (packageAt) {
    const inner = packageAt[1].split('/node_modules/').at(-1).split('/');
    const name = inner[0].startsWith('@') ? inner.slice(0, 2).join('/') : inner[0];
    if (name === 'pg') return 'is pg, which nothing under apps/web reaches (RFC-2026-029 §6.3/5)';
    return reachable.has(name) ? null : `is in the package ${name}, on which no package the application may use depends (RFC-2026-029 §3, §6.3/4)`;
  }
  if (path.startsWith('src/modules/platform-kernel/adapters/')) return 'is a platform-kernel adapter, which nothing under apps/web reaches (RFC-2026-029 §6.3/5)';
  if (path.startsWith('apps/web/') || path.startsWith('src/modules/')) return null;
  return 'is a repository file outside apps/web/** and src/modules/** (RFC-2026-029 §6.3)';
}

// Every problem with what the build included; `seen` counts what was read, so that an empty or
// unreadable build is never a pass.
export function checkBuildGraph(build, { directory = BUILD_DIRECTORY, reachable }) {
  const { included, unplaced } = readBuildGraph(build, directory);
  const problems = [...unplaced];
  const reported = new Set();
  for (const { from, path } of included) {
    const verdict = judgeIncluded(path, reachable);
    if (verdict && !reported.has(path)) { reported.add(path); problems.push(`${path} ${verdict}; the build included it (${from})`); }
  }
  const files = [...build.keys()];
  const seen = {
    traces: files.filter((f) => f.endsWith('.nft.json')).length,
    maps: files.filter((f) => f.endsWith('.map')).length,
    included: new Set(included.map((i) => i.path)).size,
    application: [...new Set(included.map((i) => i.path).filter((p) => p.startsWith('apps/web/app/')))],
  };
  if (seen.traces === 0 || seen.maps === 0 || seen.application.length === 0) {
    problems.push(`the build shows ${seen.traces} trace(s), ${seen.maps} source map(s) and ${seen.application.length} module(s) under apps/web/app/; a build this check cannot see into is not a pass`);
  }
  return { problems, seen };
}

// The negative controls: synthetic builds, each of which must be refused, and a clean one that must
// pass. A1-257-7's three routes are recorded as their real builds showed them (2026-10-12, Next.js
// 16.3.8, Turbopack, on this branch): in each, the module under db/ that the page's `zod` import was
// sent to is a source of the page's SSR chunk map, written relative to the map. The other forms a
// build writes a module in (a Turbopack source URL, a module id, a trace entry) have a control each.
const map = (sources) => JSON.stringify({ version: 3, sources, mappings: '' });
const trace = (files) => JSON.stringify({ version: 1, files });
const UP = '../../../../../../';
export const CLEAN_BUILD = {
  'server/app/page.js.nft.json': trace(['../../../../../node_modules/next/dist/server/next.js', '../chunks/ssr/_1shicyx._.js']),
  'server/chunks/ssr/_1shicyx._.js.map': map([`${UP}apps/web/app/page.tsx`, `${UP}node_modules/next/dist/esm/build/templates/app-page.js%3Fpage%3D/page`]),
  'server/chunks/ssr/[turbopack]_runtime.js.map': map(['turbopack:///[turbopack]/shared/runtime/runtime-utils.ts']),
  'server/app/page_client-reference-manifest.js': 'globalThis.__RSC_MANIFEST["/page"] = {"clientModules":{"[project]/node_modules/next/dist/esm/client/components/layout-router.js":{}}};',
  'build/chunks/[root-of-the-server]__0qxha8t._.js.map': map(['turbopack:///[project]/apps/web/postcss.config.mjs', 'turbopack:///[turbopack-node]/transforms/postcss.ts?config=[project]/apps/web/postcss.config.mjs']),
};
const DB = /^db\/probe-a1\/target\.ts is a repository file outside apps\/web\/\*\* and src\/modules\/\*\*/;
export const BUILD_CONTROLS = [
  ['A1-257-7 route 1 (built): a turbopack.resolveAlias read from a JSON file sends zod to db/', { 'server/chunks/ssr/_1shicyx._.js.map': map([`${UP}db/probe-a1/target.ts`, `${UP}apps/web/app/page.tsx`]) }, DB],
  ['A1-257-7 route 2 (built): a turbopack.rules loader rewrites the import into db/', { 'server/chunks/ssr/_02zvdzi._.js.map': map([`${UP}db/probe-a1/target.ts`, `${UP}apps/web/app/page.tsx.tsx`]) }, DB],
  ['A1-257-7 route 3 (built): a .babelrc plugin rewrites the import into db/', { 'server/chunks/ssr/_1shicyx._.js.map': map([`${UP}db/probe-a1/target.ts`, `${UP}apps/web/app/page.tsx`]) }, DB],
  ['a Turbopack source URL naming db/', { 'build/chunks/x.js.map': map(['turbopack:///[project]/db/probe-a1/target.ts']) }, DB],
  ['a module id naming db/', { 'server/chunks/ssr/x.js': '"[project]/db/probe-a1/target.ts [app-ssr] (ecmascript)"' }, DB],
  ['§6.3/5: a platform-kernel adapter in the bundle', { 'server/chunks/ssr/k.js.map': map([`${UP}src/modules/platform-kernel/adapters/job-store.ts`]) }, /is a platform-kernel adapter/],
  ['§6.3/5: pg in a trace', { 'server/app/x.js.nft.json': trace(['../../../../../node_modules/pg/lib/index.js']) }, /^node_modules\/pg\/lib\/index\.js is pg/],
  ['a package no allowlisted package depends on', { 'server/app/x.js.nft.json': trace(['../../../../../node_modules/left-pad/index.js']) }, /is in the package left-pad/],
  ['a file outside the repository', { 'server/app/x.js.nft.json': trace(['../../../../../../etc/x.js']) }, /is outside the repository/],
  ['a source the check cannot place', { 'server/chunks/ssr/u.js.map': map(['webpack://x/./db/y.ts']) }, /a.*source the check cannot place/],
  ['a map that is not JSON', { 'server/chunks/ssr/v.js.map': '{' }, /is not JSON/],
];

export function runBuildControls(reachable) {
  const failures = [];
  const clean = checkBuildGraph(new Map(Object.entries(CLEAN_BUILD)), { reachable });
  if (clean.problems.length > 0) failures.push(`the clean control build was refused: ${clean.problems.join(' | ')}`);
  for (const [name, overrides, pattern] of BUILD_CONTROLS) {
    const { problems } = checkBuildGraph(new Map(Object.entries({ ...CLEAN_BUILD, ...overrides })), { reachable });
    if (!problems.some((p) => pattern.test(p))) failures.push(`control "${name}" was not refused: ${problems.join(' | ') || 'no problem reported'}`);
  }
  const empty = checkBuildGraph(new Map(), { reachable });
  if (!empty.problems.some((p) => /a build this check cannot see into is not a pass/.test(p))) failures.push('an empty build was not refused');
  return failures;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const directory = process.argv[2] ?? BUILD_DIRECTORY;
  const allowlist = await loadAllowlist(ALLOWLIST_PATH);
  const reachable = reachablePackages(JSON.parse(await readFile('package-lock.json', 'utf8')), allowlist);
  const failures = runBuildControls(reachable);
  if (failures.length > 0) {
    console.error(`application build graph: ${failures.length} negative control(s) failed; the check cannot be trusted on the build`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  let build;
  try { build = await collectBuild(directory); } catch (error) {
    console.error(`application build graph: ${directory} cannot be read (${error.message}); run \`npm run build --workspace apps/web\` first`);
    process.exit(1);
  }
  const { problems, seen } = checkBuildGraph(build, { directory, reachable });
  if (problems.length > 0) {
    console.error(`application build graph: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`application build graph: ${seen.included} file(s) and module(s) the build included, from ${seen.traces} trace(s) and ${seen.maps} source map(s), `
    + `are under apps/web/** or src/modules/** (§6.3) or in a package an allowlisted package reaches (${reachable.size}); `
    + `${BUILD_CONTROLS.length + 2} negative and positive controls held first`);
}
