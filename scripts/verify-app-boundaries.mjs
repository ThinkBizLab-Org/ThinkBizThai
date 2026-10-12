import { lstat, readFile, readdir } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import { globToRegExp } from './verify-branch-scope.mjs';
import { stripNonCode } from './verify-test-coverage-floor.mjs';
import { ALLOWLIST_PATH, loadAllowlist } from './verify-app-dependencies.mjs';

// RFC-2026-029 §8/4 (the §6.3 boundaries) and §8/5 (one migration source, no service-role key, the
// worker credential's scope), as a dependency-free guard (WP-1A-A0-002).
//
// RFC-2026-029 §8/4 asks for these as lint errors. On 2026-10-12 the Product Owner chose not to
// install ESLint in the skeleton (`ไม่ใส่ตอนนี้ (Recommended)`: "check the import boundaries (§6.3) with a
// guard script that has no dependency instead"; evidence/WP-1A-A0-002/product-owner-disposition-
// 2026-10-12-skeleton-licences.md), so the boundaries are checked here, from the source text alone.
// That keeps them inside `npm run check` (through test-kits/app-boundaries.test.mjs), with no
// node_modules, as well as in their own CI step.
//
// WHAT IT READS. Every source file under apps/ and src/ (and tests/e2e/ and the root config files the
// allowlist names), skipping node_modules, .next and the generated next-env.d.ts. In each: import and
// re-export statements (`import ... from`, `import '...'`, `import type`, `export ... from`,
// `export type ... from`), literal dynamic `import('...')`, `/// <reference types|path>` directives,
// and CSS `@import`. A `require`, an `import x = require()` or a dynamic import of anything but one
// string literal is refused outright: the guard cannot name the module it loads.
//
// WHAT IT IS NOT. A scanner, not a parser. It finds statements on the text left after
// `stripNonCode` (scripts/verify-test-coverage-floor.mjs) blanks comments, strings, templates and
// regex literals, and inherits that scanner's misreads (open_blockers[11] of WP-0A-A0-002): in TSX, a
// `</tag>` is read as a regex start and blanks the rest of its line, so an import() written on the same
// line as a closing tag is not seen. Static imports sit at the top of a module, where this does not
// arise. Path aliases are not resolved: a bare specifier that is not an allowlisted package or a Node
// builtin is refused, so an alias such as `@modules/<key>` (RFC-2026-029 Q-029-1) fails here until
// the guard is taught it in the same pull request that configures it.

const SOURCE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|css)$/;
const RESOLVE_EXTENSIONS = ['', '.ts', '.tsx', '.d.ts', '.mts', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx'];
const ROOT_CONFIGS = ['vitest.config.ts', 'eslint.config.mjs', 'playwright.config.ts'];
const SCANNED_ROOTS = ['apps', 'src', 'tests/e2e'];
const SKIPPED_NAMES = new Set(['node_modules', '.next', '.git']);

const matches = (path, globs) => globs.some((glob) => globToRegExp(glob).test(path));

// The package a bare specifier names: `react-dom/server` -> `react-dom`, `@scope/a/b` -> `@scope/a`.
export function packageNameOf(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function literalAt(raw, from) {
  let i = from;
  while (i < raw.length && /\s/.test(raw[i])) i += 1;
  const quote = raw[i];
  if (quote !== "'" && quote !== '"') return null;
  const end = raw.indexOf(quote, i + 1);
  if (end === -1 || raw.slice(i + 1, end).includes('\n')) return null;
  return { value: raw.slice(i + 1, end), end: end + 1 };
}

const IMPORT_FROM = /^\s*(?:type\s+)?(?:[\w$]+\s*,?\s*)?(?:\{[^}]*\}\s*|\*\s*as\s+[\w$]+\s*)?from(?![\w$])/;
const IMPORT_TYPE_DEFAULT = /^\s*type\s+[\w$]+\s+from(?![\w$])/;
const IMPORT_EQUALS = /^\s*(?:type\s+)?[\w$]+\s*=\s*require\s*\(/;
const EXPORT_FROM = /^\s*(?:type\s+)?(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from(?![\w$])/;

// Every module specifier a source file names, with how it was found; and every form it refuses.
export function extractSpecifiers(raw, path = '') {
  const found = [];
  const refusals = [];
  if (path.endsWith('.css')) {
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    for (const m of code.matchAll(/@import\s+(?:url\(\s*)?(['"])([^'"\n]+)\1/g)) found.push({ specifier: m[2], kind: 'css-import' });
    return { found, refusals };
  }
  for (const m of raw.matchAll(/^\/\/\/\s*<reference\s+(types|path)\s*=\s*(['"])([^'"\n]+)\2/gm)) {
    found.push({ specifier: m[1] === 'path' && !m[3].startsWith('.') ? `./${m[3]}` : m[3], kind: `reference-${m[1]}` });
  }
  const stripped = stripNonCode(raw);
  for (const m of stripped.matchAll(/(?<![\w$])(require|createRequire)(?![\w$])/g)) {
    refusals.push(`\`${m[1]}\` at offset ${m.index}: CommonJS loading is a module this guard cannot name`);
  }
  for (const m of stripped.matchAll(/(?<![\w$])(?<!(?<!\.)\.)(import|export)(?![\w$])/g)) {
    const keyword = m[1];
    const after = m.index + keyword.length;
    const rest = stripped.slice(after);
    const next = rest.trimStart()[0] ?? '';
    if (keyword === 'import') {
      if (next === '.') continue; // import.meta
      if (next === '(') {
        const open = after + rest.indexOf('(');
        const literal = literalAt(raw, open + 1);
        const close = literal ? raw.slice(literal.end).trimStart()[0] : '';
        if (!literal || (close !== ')' && close !== ',')) refusals.push(`dynamic import() at offset ${m.index} whose argument is not one string literal`);
        else found.push({ specifier: literal.value, kind: 'dynamic-import' });
        continue;
      }
      if (IMPORT_EQUALS.test(rest)) continue; // reported through `require` above
      const side = literalAt(raw, after);
      if (side) { found.push({ specifier: side.value, kind: 'import' }); continue; }
      const clause = rest.match(IMPORT_TYPE_DEFAULT) ?? rest.match(IMPORT_FROM);
      const literal = clause ? literalAt(raw, after + clause[0].length) : null;
      if (!literal) refusals.push(`\`import\` at offset ${m.index} has no string-literal specifier where one must stand`);
      else found.push({ specifier: literal.value, kind: 'import' });
      continue;
    }
    const clause = rest.match(EXPORT_FROM);
    if (!clause) continue; // a local export loads nothing
    const literal = literalAt(raw, after + clause[0].length);
    if (!literal) refusals.push(`\`export ... from\` at offset ${m.index} has no string-literal specifier`);
    else found.push({ specifier: literal.value, kind: 'export-from' });
  }
  return { found, refusals };
}

// --- the tree ----------------------------------------------------------------------------------

async function exists(path) {
  try { await lstat(path); return true; } catch { return false; }
}

export async function collectSources(root = '.') {
  const files = new Map();
  const walk = async (directory) => {
    let entries;
    try { entries = await readdir(posix.join(root, directory), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (SKIPPED_NAMES.has(entry.name)) continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) { files.set(path, null); continue; }
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!entry.isFile()) continue;
      files.set(path, await readFile(posix.join(root, path), 'utf8'));
    }
  };
  for (const directory of [...SCANNED_ROOTS, 'spikes']) await walk(directory);
  for (const file of ROOT_CONFIGS) {
    if (await exists(posix.join(root, file))) files.set(file, await readFile(posix.join(root, file), 'utf8'));
  }
  return files;
}

// Every directory, anywhere in the tree, so that §6.4's "no supabase/migrations" is a fact about the
// tree and not about one path.
export async function collectDirectories(root = '.') {
  const found = [];
  const walk = async (directory) => {
    for (const entry of await readdir(posix.join(root, directory || '.'), { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIPPED_NAMES.has(entry.name)) continue;
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (path === '.claude') continue;
      found.push(path);
      await walk(path);
    }
  };
  await walk('');
  return found;
}

function resolveRelative(importer, specifier, files) {
  const base = posix.normalize(posix.join(posix.dirname(importer), specifier));
  if (base.startsWith('../') || base === '..' || posix.isAbsolute(base)) return { outside: true, path: base };
  for (const extension of RESOLVE_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (files.has(candidate)) return { path: candidate };
  }
  // `./x.js` written for a `./x.ts` source, as TypeScript's ESM resolution allows.
  const swapped = base.replace(/\.(m?)js$/, '.$1ts');
  if (swapped !== base && files.has(swapped)) return { path: swapped };
  if (swapped !== base && files.has(base.replace(/\.js$/, '.tsx'))) return { path: base.replace(/\.js$/, '.tsx') };
  return { path: base, unresolved: true };
}

const moduleOf = (path) => path.match(/^src\/modules\/([^/]+)\//)?.[1] ?? null;
const isAdapters = (path) => /^src\/modules\/[^/]+\/adapters\//.test(path);
const isDomain = (path) => /^src\/modules\/[^/]+\/domain\//.test(path);
const isGenerated = (path) => /(^|\/)next-env\.d\.ts$/.test(path);

export function checkBoundaries(files, allowlist) {
  const problems = [];
  const packages = new Map([...allowlist.runtime, ...allowlist.development].map((row) => [row.name, row]));
  const providers = new Set(allowlist.providerSdks);
  const framework = new Set(allowlist.framework);
  const edges = new Map(); // importer -> resolved repository targets
  const packageUse = new Map(); // file -> package names it imports
  for (const [path, raw] of files) {
    if (raw === null) { problems.push(`${path} is a symbolic link; the guard reads no file it cannot place`); continue; }
    if (!SOURCE.test(path) || isGenerated(path)) continue;
    const { found, refusals } = extractSpecifiers(raw, path);
    for (const refusal of refusals) problems.push(`${path}: ${refusal}`);
    const targets = [];
    const used = [];
    for (const { specifier, kind } of found) {
      for (const refused of allowlist.refusedImports) {
        if (specifier === refused.specifier || specifier.startsWith(`${refused.specifier}/`)) problems.push(`${path} imports ${specifier}, which ${refused.why}`);
      }
      if (specifier.startsWith('.') || kind === 'reference-path') {
        const target = resolveRelative(path, specifier, files);
        if (target.outside) { problems.push(`${path} imports ${specifier}, which resolves outside the repository`); continue; }
        if (target.path.startsWith('spikes/') && !path.startsWith('spikes/')) {
          problems.push(`${path} imports ${target.path}: nothing under apps/ or src/ imports from spikes/ (RFC-2026-029 §6.3/3)`);
        }
        if (target.unresolved) { problems.push(`${path} imports ${specifier}, which names no file the guard can find`); continue; }
        targets.push(target.path);
        // §6.3/1: a module is entered through its index.ts; only a composition root reaches adapters/.
        const targetModule = moduleOf(target.path);
        if (targetModule) {
          const sameModule = moduleOf(path) === targetModule;
          const intoAdapters = isAdapters(target.path);
          const fromRoot = matches(path, allowlist.compositionRoot);
          if (intoAdapters && !fromRoot && !(sameModule && isAdapters(path))) {
            problems.push(`${path} imports ${target.path}: only a composition root imports a module's adapters/ directly (RFC-2026-029 §6.3/1)`);
          } else if (!sameModule && !intoAdapters && !/^src\/modules\/[^/]+\/index\.tsx?$/.test(target.path)) {
            problems.push(`${path} imports ${target.path}: another module is imported only through its index.ts (RFC-2026-029 §6.3/1)`);
          }
          if (isDomain(path) && intoAdapters) problems.push(`${path} imports ${target.path}: nothing under domain/ imports adapters/ (RFC-2026-029 §6.3/2)`);
        }
        continue;
      }
      if (specifier.startsWith('node:') || isBuiltin(specifier)) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(specifier) || specifier.startsWith('/')) {
        problems.push(`${path} imports ${specifier}: a URL or absolute specifier names no allowlisted package`);
        continue;
      }
      const name = packageNameOf(specifier);
      used.push(name);
      const row = packages.get(name);
      if (!row) {
        problems.push(`${path} imports ${specifier}: ${name} is not in RFC-2026-029 §3.1 or §3.2 (§6.3/4)`);
        continue;
      }
      if (!matches(path, row.imports)) {
        problems.push(`${path} imports ${specifier}: RFC-2026-029 allows ${name} only ${row.where} (§6.3/4)`);
      }
      if (isDomain(path) && (providers.has(name) || framework.has(name))) {
        problems.push(`${path} imports ${name}: nothing under domain/ imports a provider SDK, Next.js or React (RFC-2026-029 §6.3/2)`);
      }
    }
    edges.set(path, targets);
    packageUse.set(path, used);
  }
  // §6.3/5: nothing under apps/web reaches pg or the platform-kernel adapters, directly or through
  // anything it imports -- its composition root included.
  const forbidden = (file) => (packageUse.get(file) ?? []).includes('pg')
    || file.startsWith('src/modules/platform-kernel/adapters/');
  for (const start of [...edges.keys()].filter((file) => file.startsWith('apps/web/'))) {
    const seen = new Set([start]);
    const queue = [[start, [start]]];
    while (queue.length > 0) {
      const [file, chain] = queue.shift();
      if (forbidden(file)) {
        problems.push(`${start} reaches ${(packageUse.get(file) ?? []).includes('pg') ? `pg (through ${chain.join(' -> ')})` : chain.join(' -> ')}: nothing under apps/web reaches pg or src/modules/platform-kernel/adapters/** (RFC-2026-029 §6.3/5)`);
        break;
      }
      for (const next of edges.get(file) ?? []) {
        if (!seen.has(next)) { seen.add(next); queue.push([next, [...chain, next]]); }
      }
    }
  }
  return [...new Set(problems)];
}

// §8/5: one migration source; no service-role key; the worker credential's name stays in its scope.
export function checkSecretsAndMigrations(files, directories, allowlist) {
  const problems = [];
  for (const directory of directories) {
    if (/(^|\/)supabase\/migrations$/.test(directory)) {
      problems.push(`${directory} exists: db/foundation/migrations/ is the only migration source (RFC-2026-029 §6.4, §8/5)`);
    }
  }
  const { names, allowedUnder } = allowlist.workerCredential;
  for (const [path, raw] of files) {
    if (raw === null || !(path.startsWith('apps/') || path.startsWith('src/'))) continue;
    if (/service[\s_-]?role/i.test(raw)) {
      problems.push(`${path} names the service role or its key: the service-role key is never on the request or worker path (RFC-2026-029 §2.7/2, §8/5)`);
    }
    for (const name of names) {
      if (!new RegExp(`(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`).test(raw)) continue;
      if (path.startsWith('apps/web/')) {
        problems.push(`${path} names ${name}: no file under apps/web names the worker credential (RFC-2026-029 §2.7/3, §8/5)`);
      } else if (!matches(path, allowedUnder)) {
        problems.push(`${path} names ${name}: outside apps/worker/composition/** no file reads the worker credential (RFC-2026-029 §8/5)`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const allowlist = await loadAllowlist(ALLOWLIST_PATH);
  const files = await collectSources('.');
  const problems = [
    ...checkBoundaries(files, allowlist),
    ...checkSecretsAndMigrations(files, await collectDirectories('.'), allowlist),
  ];
  if (problems.length > 0) {
    console.error(`application boundaries: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`application boundaries: ${[...files.keys()].filter((f) => SOURCE.test(f)).length} source file(s) keep RFC-2026-029 §6.3 and §8/5`);
}
