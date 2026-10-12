import { execFileSync } from 'node:child_process';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { posix } from 'node:path';

import { globToRegExp } from './verify-branch-scope.mjs';
import { stripNonCode } from './verify-test-coverage-floor.mjs';

// RFC-2026-029 §8/4 (the §6.3 boundaries), §2.1/3 (no `@ts-ignore`, a reasoned `@ts-expect-error`, no
// `any`) and §8/5 (one migration source, no service-role or secret key, the worker credential's scope):
// the rules of the guard `scripts/verify-app-boundaries.mjs`, as a library (WP-1A-A0-002).
//
// RFC-2026-029 §8/4 asks for the boundaries as lint errors and §2.1/4 for a lint step. On 2026-10-12 the
// Product Owner chose not to install ESLint in the skeleton (`ไม่ใส่ตอนนี้ (Recommended)`: "check the
// import boundaries (§6.3) with a guard script that has no dependency instead"; evidence/WP-1A-A0-002/
// product-owner-disposition-2026-10-12-skeleton-licences.md), so the boundaries, and the §2.1/3 rules a
// linter would have held, are checked here (C0-257-1).
//
// TWO READERS, ONE SET OF RULES. Every rule below takes the specifiers a file names from an `extract`
// function. This module's own, `extractSpecifiers`, reads the source TEXT with no dependency; it is what
// test-kits/app-boundaries.test.mjs drives inside `npm run check`, which must run with no node_modules
// (§8/6) and must not run dependency code (§2.1/4). The other reader is the TypeScript compiler's parser
// (scripts/app-boundaries-parser.mjs, through the `typescript` devDependency's API), which the CLI uses
// whenever `typescript` loads and which CI requires (`--require-parser`), in the application job only
// (A1-257-1, Q0-257-3). This module never imports `typescript`, so nothing in the test suite's import
// closure does (ALLOWED_DEPENDENCIES stays []).
//
// WHAT IT READS. Every source file under apps/ and src/ (and tests/e2e/, spikes/ and the root config
// files named below), skipping node_modules, .next and the generated next-env.d.ts. And, for the
// packages they import only, every other code file in the repository (checkRepositoryImports, below),
// so that `typescript` is imported by scripts/app-boundaries-parser.mjs and nowhere else (RFC-2026-029
// Amendment 2026-10-12). In each: import and
// re-export statements, literal dynamic `import('...')`, `import('...')` types, `/// <reference
// types|path>` directives, and CSS `@import`. A `require`, an `import x = require()` or a dynamic import
// of anything but one string literal is refused outright: the guard cannot name the module it loads.
//
// WHAT THE TEXT READER IS NOT. A scanner, not a parser. It finds statements on the text left after
// `stripNonCode` (scripts/verify-test-coverage-floor.mjs) blanks comments, strings, templates and regex
// literals, and inherits that scanner's misreads (open_blockers[11] of WP-0A-A0-002). The one that
// mattered here: in JSX a `</tag>` is read as a regex start that blanks the rest of its line, so an
// import written after a closing tag on the same line was not seen (A1-257-1, Q0-257-3). The text
// reader now REFUSES any `import`, `export` or `require` that follows a closing tag on its line; the
// parsed reader reads such a line as the compiler does. Anything else the text reader misreads, the
// parsed reader in CI does not.
//
// `any` IS SEEN BY THE PARSER ONLY. A type annotation cannot be told from an object key or a word in
// JSX without a parser, so `npm run check` (the text reader) does not hold §2.1/3's `any`; the CI step
// does, on every head. The two comment directives are read from the text by both.
//
// PATH ALIASES ARE REFUSED, not resolved (Q-029-1, A1-257-1's alias note), in what the tools LOAD, not
// in what a file is named (A1-257-5, Q0-257r2-1). Every tsconfig*.json and jsconfig*.json is followed
// along its `extends` chain to the file TypeScript would read, whatever that file is called; an
// `extends` that leaves the repository, or names a package that is not one of the repository's own
// workspaces, is refused. In every file of a chain a `paths`, `baseUrl` or `rootDirs` is refused, and so
// are `jsxImportSource`, `jsxFactory`, `jsxFragmentFactory` and `reactNamespace`, which name the module
// the compiler imports for every JSX element. In any package.json a `browser`, `imports`, `exports`,
// `alias`, `react-native` or `typesVersions` map is refused. Each is refused unless
// scripts/app-dependency-allowlist.json's resolutionAliases names that file and option (none does),
// because each can make the bundler load `pg` under an allowlisted name. A JSX pragma
// (`@jsxImportSource`, `@jsx`, `@jsxFrag`) in application code is refused by checkJsxPragmas, below,
// for the same reason. A bare specifier that is not an allowlisted package or a Node builtin is refused
// too, so `@modules/<key>` fails here until the package that configures it teaches the guard to resolve it.
//
// BUILD CONFIGURATION IS AN ALLOWLISTED SHAPE, NOT A LIST OF REFUSED WORDS (A1-257-7, Q0-257r3-1,
// R0-257-8, Q0 N12). Three review rounds each found another key, or another way to bring a key in, that
// made the bundler or vitest load a module no statement names. So every next.config.*, vitest.config.*
// and postcss.config.* is read as a program of a few statement forms (a type-only or allowlisted import,
// one `const`, one `export default`, and the one `process.env` default the allowlist names) whose
// exported value is literal data -- objects with written keys, arrays, strings, booleans -- and that
// value must fit the shape scripts/app-dependency-allowlist.json's configShapes gives for that kind of
// file, key by key. A spread, a computed key, a function, a call other than the allowlisted wrapper, a
// value import, a `node:` builtin, a `require` and any key the shape does not name fail. The text reader
// below fails closed on anything outside that grammar; in CI the TypeScript parser reads the same file
// into the same form and the two readings must agree (scripts/app-boundaries-parser.mjs, readShape). A
// Babel configuration (`.babelrc`, `.babelrc.*`, `babel.config.*`, a package.json `babel` key), a PostCSS
// configuration other than postcss.config.* (every other name on the search list Turbopack 16.3.8
// reads, POSTCSS_SEARCH_NAMES below, and a package.json `postcss` key), any file under a `.config/`
// directory (A1-257-8, C0-257r4-1), a `vite.config.*` and a `vitest.workspace.*` are refused wherever
// they stand: the tools load them on their own and the guard reads no shape for them.
//
// WHAT RUNS DURING THE BUILD (A1-257-9, A1-257-10). A tracked `.env*` file under apps/, src/ or at the
// root (all but `.env.example`) is refused (checkTrackedFiles): Next.js loads one into the build's
// environment, and a NODE_OPTIONS there preloads a module into every build worker. CI also sets
// NODE_OPTIONS to '' for the whole application job. Every workspace package.json declares exactly the
// `scripts` scripts/app-dependency-allowlist.json's workspaceScripts gives it (apps/web: `build` = `next
// build`), so no `prebuild` or `postbuild` hook and no changed build command runs around `next build`
// (A1-257-10); the root's scripts are pinned by the test-integrity tooling. These rules hold what
// configuration can make a build tool load. They do not hold all code that runs: code the repository
// itself runs in CI after this guard has read the tree (a test, a page's own code when `next build`
// prerenders it, build-time code it imports) could still write files or change the build's output, and
// that residual is held by review of every pull request, not by a check. CI runs this guard a second
// time immediately before the build, which catches a refused file left on disk by then, not one written
// later. The build-graph check (scripts/verify-app-build-graph.mjs) reads what the build output names,
// not what ran to make it.
//
// NAMES ARE MATCHED IN ANY LETTER CASE (A1's advisory, round five). macOS's file system is
// case-insensitive, so a tool looking for `.config/postcssrc.json` opens `.Config/postcssrc.json`: every
// pattern below that refuses or collects a configuration file by its name takes the `i` flag.

const SOURCE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|css)$/;
export const CODE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
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
    // Tailwind's `@plugin` and `@config` load a JavaScript module into the CSS build: a module like any
    // other, held to the same rules (A1-257-7's class: build configuration that loads a module).
    for (const m of code.matchAll(/@(plugin|config)\s+(['"])([^'"\n]+)\2/g)) found.push({ specifier: m[3], kind: `css-${m[1]}` });
    for (const m of code.matchAll(/@(plugin|config)(?![\w-])(?!\s+(['"])[^'"\n]+\2)/g)) refusals.push(`\`@${m[1]}\` at offset ${m.index} names no module as one string literal`);
    return { found, refusals };
  }
  for (const m of raw.matchAll(/^\/\/\/\s*<reference\s+(types|path)\s*=\s*(['"])([^'"\n]+)\2/gm)) {
    found.push({ specifier: m[1] === 'path' && !m[3].startsWith('.') ? `./${m[3]}` : m[3], kind: `reference-${m[1]}` });
  }
  const stripped = stripNonCode(raw);
  // A1-257-1, Q0-257-3: `stripNonCode` reads the `/` of a JSX closing tag as a regex start and blanks
  // the rest of the line, so whatever follows it there is invisible to this reader. A closing tag in
  // code (not in a string or comment, where `stripped` blanks the `<` too) followed on its line by a
  // loader keyword is refused rather than trusted.
  for (let at = raw.indexOf('</'); at !== -1; at = raw.indexOf('</', at + 2)) {
    if (stripped[at] !== '<') continue;
    const lineEnd = raw.indexOf('\n', at);
    const word = raw.slice(at, lineEnd === -1 ? raw.length : lineEnd).match(/(?<![\w$])(import|export|require)(?![\w$])/);
    if (word) refusals.push(`\`${word[1]}\` after a closing tag at offset ${at}, on the same line: the text reader cannot read past a closing tag, so the statement goes on a line of its own`);
  }
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
const isApplicationCode = (path) => /^(apps|src)\//.test(path) && CODE.test(path) && !isGenerated(path);

// `extract(raw, path)` returns `{ found, refusals, anys }`: the text reader by default, the parsed
// reader when the CLI has one. `anys` (lines of an `any` type) is the parser's alone.
export function checkBoundaries(files, allowlist, { extract = extractSpecifiers } = {}) {
  const problems = [];
  const packages = new Map([...allowlist.runtime, ...allowlist.development].map((row) => [row.name, row]));
  const providers = new Set(allowlist.providerSdks);
  const framework = new Set(allowlist.framework);
  const edges = new Map(); // importer -> resolved repository targets
  const packageUse = new Map(); // file -> package names it imports
  for (const [path, raw] of files) {
    if (raw === null) { problems.push(`${path} is a symbolic link; the guard reads no file it cannot place`); continue; }
    if (!SOURCE.test(path) || isGenerated(path)) continue;
    const { found, refusals, anys = [] } = extract(raw, path);
    for (const refusal of refusals) problems.push(`${path}: ${refusal}`);
    if (isApplicationCode(path)) {
      for (const line of anys) problems.push(`${path}:${line} uses the type \`any\`, which RFC-2026-029 §2.1/3 makes an error in application code`);
    }
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

// --- the rest of the repository (Amendment 2026-10-12: `typescript` in the parser) ---------------

// RFC-2026-029's Amendment 2026-10-12 widens §3.2's `typescript` cell to one file outside the
// application tree, scripts/app-boundaries-parser.mjs, for its parser API (the Product Owner's answer
// of 2026-10-12, 07:24:27Z: `อนุญาตให้ guard import typescript (Recommended)`). checkBoundaries reads
// the application tree only (SCANNED_ROOTS, spikes/ and ROOT_CONFIGS), so a cell that names a file
// elsewhere is held here, over every other code file in the repository: scripts/, test-kits/, tests/
// outside tests/e2e/, db/, evidence/ and any root module. Each package such a file names must be on the
// allowlist with a cell whose globs admit that file; so `typescript`, or any subpath of it, imported
// anywhere but the parser fails, and so does any other package. A form the reader cannot name is
// refused, as under apps/. Relative and Node builtin specifiers load no package and are not this rule's.
const inApplicationTree = (path) => SCANNED_ROOTS.some((root) => path.startsWith(`${root}/`))
  || path.startsWith('spikes/') || ROOT_CONFIGS.includes(path);

export async function collectRepositoryCode(root = '.') {
  const files = new Map();
  const walk = async (directory) => {
    let entries;
    try { entries = await readdir(posix.join(root, directory || '.'), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (SKIPPED_NAMES.has(entry.name)) continue;
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (path === '.claude' || inApplicationTree(path)) continue;
      if (entry.isSymbolicLink()) { if (CODE.test(path)) files.set(path, null); continue; }
      if (entry.isDirectory()) { await walk(path); continue; }
      if (entry.isFile() && CODE.test(path)) files.set(path, await readFile(posix.join(root, path), 'utf8'));
    }
  };
  await walk('');
  return files;
}

export function checkRepositoryImports(files, allowlist, { extract = extractSpecifiers } = {}) {
  const problems = [];
  const packages = new Map([...allowlist.runtime, ...allowlist.development].map((row) => [row.name, row]));
  for (const [path, raw] of files) {
    if (inApplicationTree(path) || !CODE.test(path)) continue;
    if (raw === null) { problems.push(`${path} is a symbolic link; the guard reads no file it cannot place`); continue; }
    const { found, refusals } = extract(raw, path);
    for (const refusal of refusals) problems.push(`${path}: ${refusal}`);
    for (const { specifier } of found) {
      if (specifier.startsWith('.') || specifier.startsWith('node:') || isBuiltin(specifier)) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(specifier) || specifier.startsWith('/')) {
        problems.push(`${path} imports ${specifier}: a URL or absolute specifier names no allowlisted package`);
        continue;
      }
      const name = packageNameOf(specifier);
      const row = packages.get(name);
      if (!row) problems.push(`${path} imports ${specifier}: ${name} is not in RFC-2026-029 §3.1 or §3.2`);
      else if (!matches(path, row.imports)) problems.push(`${path} imports ${specifier}: RFC-2026-029 allows ${name} only ${row.where} (§3, Amendment 2026-10-12)`);
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
    // A1-257-2: Supabase's newer API keys replace the service-role JWT with a SECRET key (`sb_secret_…`,
    // conventionally `SUPABASE_SECRET_KEY`) that bypasses RLS the same way, so both names of that key
    // are refused, the legacy one above and the current one here. This reads the text: a name or prefix
    // built by concatenation (`'sb_' + 'secret_'`, `'SUPABASE_' + 'SECRET_KEY'`) is not caught.
    for (const [pattern, what] of [[/sb_secret_/i, 'a Supabase secret key (`sb_secret_`)'], [/secret[\s_-]?key/i, 'a secret key (`secret_key`, `SUPABASE_SECRET_KEY`)']]) {
      if (pattern.test(raw)) problems.push(`${path} names ${what}: a key that bypasses RLS is never on the request or worker path (RFC-2026-029 §2.7/2, §8/5)`);
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

// --- tracked files the build reads on its own (A1-257-9, A1-257-8) ----------------------------------

// A1-257-9: Next.js (@next/env) loads `.env.production.local`, `.env.local`, `.env.production` and `.env`
// from the project directory into the build's environment, adopting each key the environment does not
// already define, and passes NODE_OPTIONS on to every build worker: a committed `.env` holding
// `NODE_OPTIONS=--import <a module anywhere>` runs that module in every worker, after the files the
// build-graph check reads are written. `.env*` is in .gitignore, but `git add -f` tracks one. So every
// TRACKED file whose name starts `.env`, under apps/ or src/ or at the root, is refused, `.env.example`
// alone excepted (a template Next.js does not load). Tracked, not on disk: a developer's own untracked
// `.env.local` is not this rule's, and nothing untracked reaches CI. A file under a `.config/`
// directory is refused here too when it is tracked (A1-257-8), whether or not the configuration walk
// above reads its directory. CI also runs the whole application job with NODE_OPTIONS set to '', so a
// value from a `.env` the guard did not see would not be adopted either.
const TRACKED_ENV_FILE = /^(?:(?:apps|src)\/(?:[^/]+\/)*)?\.env[^/]*$/i;

// The repository's tracked paths (`git ls-files`: the index, so a file staged with `git add -f` counts),
// or null when git cannot list them; checkTrackedFiles refuses a null list rather than pass it.
export function collectTrackedFiles(root = '.') {
  try {
    return execFileSync('git', ['ls-files', '-z', '--cached'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter((path) => path !== '');
  } catch {
    return null;
  }
}

export function checkTrackedFiles(paths) {
  if (!Array.isArray(paths)) return ['the tracked files could not be listed (`git ls-files` failed), so the guard cannot tell a committed `.env` or `.config/` file from none (A1-257-8, A1-257-9)'];
  const problems = [];
  for (const path of paths) {
    if (TRACKED_ENV_FILE.test(path) && posix.basename(path) !== '.env.example') {
      problems.push(`${path} is a tracked environment file: Next.js loads it into the build, where a NODE_OPTIONS in it runs a module in every build worker; none but .env.example is tracked under apps/, src/ or at the root (A1-257-9)`);
    }
    if (IN_CONFIG_DIRECTORY.test(path)) {
      problems.push(`${path} is a tracked file under a \`.config/\` directory, where build tools look for their own configuration (Turbopack: \`.config/postcssrc*\`); none is admitted (A1-257-8, C0-257r4-1)`);
    }
  }
  return problems;
}

// §2.1/3: "`@ts-ignore` is not used. `@ts-expect-error` is allowed only with a reason on the same line."
// Read from the text of every application source file (apps/, src/; not the type-check control's
// fixtures under test-kits/), in a comment or anywhere else: a directive spelled inside a string is
// refused too, which costs nothing and leaves no reading to argue about. `@ts-nocheck` turns the check
// off for a whole file and is refused with them. A reason is a word on the same line after the
// directive (`// @ts-expect-error -- the reason`).
export function checkTypeDirectives(files) {
  const problems = [];
  for (const [path, raw] of files) {
    if (raw === null || !isApplicationCode(path)) continue;
    for (const m of raw.matchAll(/@ts-(ignore|nocheck)(?![\w-])/gi)) {
      problems.push(`${path}:${raw.slice(0, m.index).split('\n').length} uses \`${m[0]}\`, which RFC-2026-029 §2.1/3 does not allow`);
    }
    for (const m of raw.matchAll(/@ts-expect-error(?![\w-])([^\n]*)/gi)) {
      const reason = m[1].replace(/\*\/.*$/, '').replace(/^[\s:\-–—]+/, '');
      if (!/[\p{L}\p{N}]/u.test(reason)) {
        problems.push(`${path}:${raw.slice(0, m.index).split('\n').length} uses \`@ts-expect-error\` with no reason on its line (RFC-2026-029 §2.1/3)`);
      }
    }
  }
  return problems;
}

// A1-257-5: a JSX pragma names the module the compiler imports for every JSX element of its file
// (`/** @jsxImportSource x */` makes SWC and tsc import `x/jsx-runtime`; `@jsx` and `@jsxFrag` name the
// factory the classic runtime calls). That import is written in no statement, so neither reader sees it
// and no edge is recorded: a pragma naming `src/modules/platform-kernel/adapters/` would reach it from
// apps/web unseen. So the three pragmas are refused in application code (apps/, src/), read from the
// text like the §2.1/3 directives above: the same refusal whichever reader the CLI runs, in a comment or
// anywhere else, and in any letter case (TypeScript reads pragma names case-insensitively).
export function checkJsxPragmas(files) {
  const problems = [];
  for (const [path, raw] of files) {
    if (raw === null || !isApplicationCode(path)) continue;
    for (const m of raw.matchAll(/@jsx(?:ImportSource|Frag)?(?![\w$-])/gi)) {
      problems.push(`${path}:${raw.slice(0, m.index).split('\n').length} uses the \`${m[0]}\` pragma, which makes the compiler load a module no statement names; the boundary guard cannot follow it, so none is admitted (A1-257-5)`);
    }
  }
  return problems;
}

// --- module resolution aliases (Q-029-1; A1-257-1's alias note; A1-257-5; Q0-257r2-1) -------------

// In any letter case (A1's advisory, round five): on a case-insensitive file system the tools open these.
const RESOLUTION_CONFIG = /(^|\/)(?:tsconfig[^/]*\.json|jsconfig[^/]*\.json|(?:next|vitest|postcss|babel|vite)\.config\.[a-z]+|\.babelrc(?:\.[a-z]+)?|\.postcssrc(?:\.[a-z]+)?|vitest\.workspace\.[a-z]+|package\.json)$/i;
// A `.config` entry, or anything under one, wherever it stands (A1-257-8, C0-257r4-1), in any letter case.
const IN_CONFIG_DIRECTORY = /(^|\/)\.config(\/|$)/i;
const COMPILER_CONFIG = /(^|\/)[tj]sconfig[^/]*\.json$/i;
const PACKAGE_MANIFEST = /(^|\/)package\.json$/i;
// The compiler options that make a specifier load another file (`paths`, `baseUrl`, `rootDirs`), or make
// every JSX element import a module no statement names (`jsxImportSource`, `jsxFactory`,
// `jsxFragmentFactory`, `reactNamespace`).
export const ALIAS_COMPILER_OPTIONS = ['paths', 'baseUrl', 'rootDirs', 'jsxImportSource', 'jsxFactory', 'jsxFragmentFactory', 'reactNamespace'];
// The package.json fields a bundler, Node or TypeScript reads to load a file other than the one a
// specifier names: the `browser` field's file map (Q0-257r2-1), subpath `imports` and `exports`, the
// `alias` and `react-native` maps some bundlers read, and TypeScript's `typesVersions`.
export const ALIAS_PACKAGE_FIELDS = ['browser', 'imports', 'exports', 'alias', 'react-native', 'typesVersions'];

const inRepository = (path) => !(path === '..' || path.startsWith('../') || posix.isAbsolute(path))
  && !path.split('/').some((segment) => SKIPPED_NAMES.has(segment)) && path.split('/')[0] !== '.claude';

// The repository's own workspace packages, by name: the package.json files the root's `workspaces`
// names, which npm links into node_modules under their names.
function workspacePackages(configs) {
  const parse = (raw) => { try { return JSON.parse(raw); } catch { return null; } };
  const root = parse(configs.get('package.json') ?? 'null');
  const patterns = Array.isArray(root?.workspaces) ? root.workspaces.filter((w) => typeof w === 'string') : [];
  const found = new Map();
  for (const [path, raw] of configs) {
    if (!PACKAGE_MANIFEST.test(path) || path === 'package.json' || raw === null) continue;
    const directory = path.slice(0, -'/package.json'.length);
    const manifest = parse(raw);
    if (typeof manifest?.name === 'string' && (patterns.includes(directory) || matches(directory, patterns))) found.set(manifest.name, { directory, manifest });
  }
  return found;
}

// Where TypeScript looks for the file an `extends` names (its getExtendsConfigPath): a path relative to
// the config's directory, with `.json` appended when no file has the name as written; or a package
// specifier, resolved through node_modules. Only a workspace of this repository resolves a package
// specifier to a file the guard can read, and only by a path inside it, with no `exports` map to
// remap that path. Anything else is refused: an absolute path, a URL, a path that leaves the
// repository or enters node_modules, .next, .git or .claude, and any other package.
export function extendsCandidates(from, specifier, workspaces) {
  if (typeof specifier !== 'string' || specifier === '') return { refused: 'it is not a path' };
  const written = specifier.replace(/\\/g, '/');
  const candidates = (base) => (base.endsWith('.json') ? [base] : [base, `${base}.json`]);
  if (/^\.\.?\//.test(written)) {
    const base = posix.normalize(posix.join(posix.dirname(from), written));
    return inRepository(base) ? { candidates: candidates(base) } : { refused: 'it leaves the repository or enters a directory the guard does not read' };
  }
  if (posix.isAbsolute(written) || /^[a-z][a-z0-9+.-]*:/i.test(written)) return { refused: 'it is an absolute path or a URL' };
  const name = packageNameOf(written);
  const workspace = workspaces.get(name);
  if (!workspace) return { refused: `the package ${name} resolves through node_modules, and only this repository's own workspaces resolve inside it` };
  if (workspace.manifest.exports !== undefined) return { refused: `the workspace ${name} remaps its files through \`exports\`` };
  const inside = written.slice(name.length + 1);
  const base = posix.normalize(posix.join(workspace.directory, inside));
  if (inside === '' || !base.startsWith(`${workspace.directory}/`) || !inRepository(base)) return { refused: `it names no file inside the workspace ${name}` };
  return { candidates: candidates(base) };
}

const parseJson = (raw) => { try { return { value: JSON.parse(raw) }; } catch (error) { return { error }; } };
const extendsOf = (config) => [config?.extends].flat().filter((x) => x !== undefined);

// Every tsconfig*.json, jsconfig*.json, build configuration (next, vitest, postcss; and the Babel,
// PostCSS, Vite and vitest-workspace files and every file under a `.config/` directory, refused
// outright) and package.json in the tree, outside
// node_modules, .next, .git and .claude (harness worktrees); and every file a compiler config's
// `extends` chain reaches, whatever its name (A1-257-5: `"extends": "./base.json"`), read from where
// TypeScript would read it. A chain step the guard cannot place is left out here, and
// checkResolutionConfigs refuses it.
export async function collectResolutionConfigs(root = '.') {
  const found = new Map();
  const walk = async (directory) => {
    let entries;
    try { entries = await readdir(posix.join(root, directory || '.'), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (SKIPPED_NAMES.has(entry.name)) continue;
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (path === '.claude') continue;
      if (entry.isDirectory()) { await walk(path); continue; }
      if (RESOLUTION_CONFIG.test(path) || IN_CONFIG_DIRECTORY.test(path)) found.set(path, entry.isFile() ? await readFile(posix.join(root, path), 'utf8') : null);
    }
  };
  await walk('');
  const workspaces = workspacePackages(found);
  const queue = [...found.keys()].filter((path) => COMPILER_CONFIG.test(path));
  while (queue.length > 0) {
    const path = queue.shift();
    const raw = found.get(path);
    const config = raw === null ? {} : parseJson(raw).value;
    for (const parent of extendsOf(config)) {
      const { candidates = [] } = extendsCandidates(path, parent, workspaces);
      for (const candidate of candidates) {
        if (found.has(candidate)) break;
        let stat;
        try { stat = await lstat(posix.join(root, candidate)); } catch { continue; }
        found.set(candidate, stat.isFile() ? await readFile(posix.join(root, candidate), 'utf8') : null);
        queue.push(candidate);
        break;
      }
    }
  }
  return found;
}

// --- build configuration files: allowlisted shapes (A1-257-7, Q0-257r3-1, R0-257-8, Q0 N12) ---------

// The kind of build configuration a path is, by the name the tool looks for; its shape is
// allowlist.configShapes[kind].
// In any letter case: a `PostCSS.config.js` is the file Turbopack opens for `postcss.config.js` on macOS.
export const CONFIG_KINDS = { 'next.config': /(^|\/)next\.config\.[a-z]+$/i, 'vitest.config': /(^|\/)vitest\.config\.[a-z]+$/i, 'postcss.config': /(^|\/)postcss\.config\.[a-z]+$/i };
export const configKindOf = (path) => Object.keys(CONFIG_KINDS).find((kind) => CONFIG_KINDS[kind].test(path)) ?? null;

// The names Turbopack (Next.js 16.3.8, the skeleton's `next build`) looks for a PostCSS configuration
// under, in its order (A1-257-8, C0-257r4-1). Read on 2026-10-12 from the installed package: the
// strings of @next/swc-darwin-arm64 16.3.8's binary hold them together, after the PostCSS transform's
// evaluation script (`.postcssrc` and `.postcssrc.json` stored once, shared with longer names). Next's
// webpack mode (next/dist/lib/find-config.js: a package.json `postcss` key, `.postcssrc.json`,
// `postcss.config.json`, `.postcssrc.js`, `postcss.config.{js,mjs,cjs}`) and Vite 8.3.2's
// postcss-load-config, which vitest uses (a package.json `postcss` key, `.postcssrc` and
// `.postcssrc.{json,yaml,yml,ts,cts,mts,js,cjs,mjs}`, `postcss.config.{ts,cts,mts,js,cjs,mjs}`), name
// no file outside this list. Every name but `postcss.config.*` is refused below: `.postcssrc*` by its
// own pattern, `.config/postcssrc*` with everything under a `.config/` directory; a `postcss.config.*`
// is held to its allowlisted shape (a `postcss.config.json` cannot be one, and fails).
export const POSTCSS_SEARCH_NAMES = [
  '.postcssrc', '.postcssrc.json', '.postcssrc.yaml', '.postcssrc.yml', '.postcssrc.js', '.postcssrc.mjs', '.postcssrc.cjs',
  '.postcssrc.ts', '.postcssrc.mts', '.postcssrc.cts',
  '.config/postcssrc', '.config/postcssrc.json', '.config/postcssrc.yaml', '.config/postcssrc.yml', '.config/postcssrc.js',
  '.config/postcssrc.mjs', '.config/postcssrc.cjs', '.config/postcssrc.ts', '.config/postcssrc.mts', '.config/postcssrc.cts',
  'postcss.config.js', 'postcss.config.mjs', 'postcss.config.cjs', 'postcss.config.ts', 'postcss.config.mts', 'postcss.config.cts',
  'postcss.config.json',
];

// Configuration a build tool loads on its own, for which the guard reads no shape: refused wherever it
// stands. Next.js picks up a Babel configuration by itself, and a Babel plugin rewrites any import
// (A1-257-7's third route); PostCSS reads `.postcssrc*` and `.config/postcssrc*` ahead of
// postcss.config.* (POSTCSS_SEARCH_NAMES); a `.config/` directory is where tools search for their own
// configuration, so nothing under one is admitted (A1-257-8); vitest reads a vite.config.* or a
// workspace file where it finds one. Every pattern matches in any letter case (A1's advisory, round five).
export const REFUSED_CONFIG_FILES = [
  [/(^|\/)\.babelrc(?:\.[a-z]+)?$/i, 'a Babel configuration'],
  [/(^|\/)babel\.config\.[a-z]+$/i, 'a Babel configuration'],
  [/(^|\/)\.postcssrc(?:\.[a-z]+)?$/i, 'a PostCSS configuration other than postcss.config.*'],
  [IN_CONFIG_DIRECTORY, 'a file under a `.config/` directory, where build tools look for their own configuration (Turbopack: `.config/postcssrc*`)', 'A1-257-8, C0-257r4-1'],
  [/(^|\/)vite\.config\.[a-z]+$/i, 'a Vite configuration, which vitest reads in place of a vitest.config'],
  [/(^|\/)vitest\.workspace\.[a-z]+$/i, 'a vitest workspace file, which names further configurations'],
];
// The package.json keys that are such a configuration: Babel's and PostCSS's. Refused with no
// allowlist route, like the files above.
export const CONFIG_PACKAGE_FIELDS = ['babel', 'postcss'];

// A1-257-10: `npm run build --workspace apps/web` runs the workspace's `prebuild`, then `build`, then
// `postbuild`, and npm adds the two hooks without a word in the command; a `postbuild` runs after `next
// build` has written the traces and maps scripts/verify-app-build-graph.mjs reads, and can rewrite them.
// So every package.json but the root's declares `scripts` exactly as scripts/app-dependency-allowlist.json's
// workspaceScripts gives them for its directory (apps/web: { "build": "next build" }), every key with its
// command and no other key, or declares no `scripts` at all (then npm runs nothing); a package.json in a
// directory the allowlist names no scripts for declares none. The root's scripts are not this rule's:
// the test-integrity tooling pins them (scripts/verify-test-coverage-floor.mjs pins the check chain and
// its commands; test-kits/test-coverage-floor.test.mjs pins the set of names, typecheck's and
// test:app's commands among them, so a root `pre*`/`post*` hook fails `npm run check`).
export function workspaceScriptProblems(path, manifest, allowlist) {
  if (path === 'package.json' || manifest?.scripts === undefined) return [];
  const directory = path.slice(0, -'/package.json'.length);
  const entries = allowlist.workspaceScripts ?? {};
  const admitted = Object.hasOwn(entries, directory) && directory !== '$comment' ? entries[directory] : {};
  const scripts = manifest.scripts;
  if (scripts === null || typeof scripts !== 'object' || Array.isArray(scripts)) {
    return [`${path} declares \`scripts\` that is not an object of commands; a workspace declares exactly the scripts scripts/app-dependency-allowlist.json's workspaceScripts gives it (A1-257-10)`];
  }
  const problems = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (!Object.hasOwn(admitted, name)) {
      const hook = /^(?:pre|post)/.test(name) ? ', a hook npm runs around another script without being asked' : '';
      problems.push(`${path} declares the script \`${name}\`${hook}; a workspace declares exactly the scripts scripts/app-dependency-allowlist.json's workspaceScripts gives it (${Object.keys(admitted).join(', ') || 'none'}) (A1-257-10)`);
    } else if (command !== admitted[name]) {
      problems.push(`${path} declares the script \`${name}\` as ${JSON.stringify(command)}, and the allowlist admits exactly ${JSON.stringify(admitted[name])} (A1-257-10)`);
    }
  }
  for (const name of Object.keys(admitted).filter((key) => !Object.hasOwn(scripts, key))) {
    problems.push(`${path} declares \`scripts\` without \`${name}\`; a workspace that declares scripts declares exactly the allowlisted ones (A1-257-10)`);
  }
  return problems;
}

const CONFIG_PUNCTUATION = ['??=', '{', '}', '(', ')', '[', ']', ',', ';', ':', '.', '='];
const IDENTIFIER = /[A-Za-z_$][A-Za-z0-9_$]*/y;
const LINE_TERMINATOR = /[\n\r\u2028\u2029]/g;

// The text reader of a build configuration: dependency-free, and closed. It tokenizes comments, plain
// string literals (no escape, no template), identifiers and the punctuation above, and refuses any
// other character; it then reads the statement forms below and refuses any other. A file it refuses
// is one no allowlisted shape could match, so refusing it costs nothing. It returns the same form as
// the parsed reader's readShape (scripts/app-boundaries-parser.mjs): { statements, refusals }, each
// statement one of
//   { kind: 'import', specifier, typeOnly, defaultName, named: [{ name, alias, typeOnly }] }
//   { kind: 'env-default', name, value }          process.env.NAME ??= 'value'
//   { kind: 'const', name, type, value }          const NAME[: Type] = value
//   { kind: 'export-default', value }             export default value
// and each value one of { object: [[key, value]] }, { array: [value] }, { string }, { boolean },
// { ref: name }, { call: name, args: [value] }, { satisfies: Type, value }.
export function readConfigShape(raw) {
  const tokens = [];
  for (let i = 0; i < raw.length;) {
    const c = raw[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (/^\/\/\/\s*<(?:reference|amd)/.test(raw.slice(i, i + 40))) return { statements: [], refusals: [`a triple-slash directive at offset ${i}`] };
    // A `//` comment ends at the first line terminator, as JavaScript and TypeScript end it: LF, CR,
    // U+2028 or U+2029 (A1's advisory: ended at LF alone, a key written after a CR or U+2028 on the
    // comment's line was skipped by this reader and read by the compiler).
    if (raw.startsWith('//', i)) { LINE_TERMINATOR.lastIndex = i; const end = LINE_TERMINATOR.exec(raw); i = end === null ? raw.length : end.index; continue; }
    if (raw.startsWith('/*', i)) {
      const end = raw.indexOf('*/', i + 2);
      if (end === -1) return { statements: [], refusals: [`an unterminated comment at offset ${i}`] };
      i = end + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < raw.length && raw[j] !== c && raw[j] !== '\\' && raw[j] !== '\n') j += 1;
      if (raw[j] !== c) return { statements: [], refusals: [`a string at offset ${i} holds an escape or does not end on its line; an allowlisted shape needs neither`] };
      tokens.push({ type: 'string', value: raw.slice(i + 1, j), at: i });
      i = j + 1;
      continue;
    }
    IDENTIFIER.lastIndex = i;
    const name = IDENTIFIER.exec(raw);
    if (name) { tokens.push({ type: 'name', value: name[0], at: i }); i += name[0].length; continue; }
    const punctuation = CONFIG_PUNCTUATION.find((p) => raw.startsWith(p, i));
    if (punctuation) { tokens.push({ type: 'punct', value: punctuation, at: i }); i += punctuation.length; continue; }
    return { statements: [], refusals: [`\`${c}\` at offset ${i}, which no allowlisted shape holds (a template, a number, an operator, an escape or a spread)`] };
  }
  let k = 0;
  const at = () => (tokens[k] ? `offset ${tokens[k].at}` : 'the end of the file');
  const refuse = (what) => { throw Object.assign(new Error(`${what} at ${at()}`), { shape: true }); };
  const is = (type, value, ahead = 0) => tokens[k + ahead]?.type === type && (value === undefined || tokens[k + ahead].value === value);
  const take = (type, value, what) => { if (!is(type, value)) refuse(`expected ${what ?? value}`); k += 1; return tokens[k - 1].value; };
  const value = () => {
    let node;
    if (is('punct', '{')) {
      k += 1;
      const entries = [];
      while (!is('punct', '}')) {
        if (!is('name') && !is('string')) refuse('a key that is not written out (a spread, a computed key or a method)');
        const key = tokens[k].value;
        k += 1;
        take('punct', ':', '`:` after a key (a shorthand, a method or an accessor is no allowlisted shape)');
        entries.push([key, value()]);
        if (!is('punct', '}')) take('punct', ',');
      }
      k += 1;
      node = { object: entries };
    } else if (is('punct', '[')) {
      k += 1;
      const items = [];
      while (!is('punct', ']')) {
        items.push(value());
        if (!is('punct', ']')) take('punct', ',');
      }
      k += 1;
      node = { array: items };
    } else if (is('string')) {
      node = { string: tokens[k].value };
      k += 1;
    } else if (is('name', 'true') || is('name', 'false')) {
      node = { boolean: tokens[k].value === 'true' };
      k += 1;
    } else if (is('name')) {
      const name = tokens[k].value;
      k += 1;
      if (is('punct', '(')) {
        k += 1;
        const args = [];
        while (!is('punct', ')')) {
          args.push(value());
          if (!is('punct', ')')) take('punct', ',');
        }
        k += 1;
        node = { call: name, args };
      } else node = { ref: name };
    } else refuse('a value that is not literal data');
    if (is('name', 'satisfies')) { k += 1; node = { satisfies: take('name', undefined, 'a type name'), value: node }; }
    return node;
  };
  const statements = [];
  const STARTS = new Set(['import', 'export', 'const', 'process']);
  try {
    while (k < tokens.length) {
      if (is('punct', ';')) { k += 1; continue; }
      if (is('name', 'import')) {
        k += 1;
        const typeOnly = is('name', 'type') && !is('name', 'from', 1) ? (k += 1, true) : false;
        let defaultName = null;
        const named = [];
        if (is('punct', '{')) {
          k += 1;
          while (!is('punct', '}')) {
            const specTypeOnly = is('name', 'type') && is('name', undefined, 1) && !is('name', 'as', 1) ? (k += 1, true) : false;
            const name = take('name', undefined, 'an imported name');
            const alias = is('name', 'as') ? (k += 1, take('name', undefined, 'a local name')) : null;
            named.push({ name, alias, typeOnly: specTypeOnly });
            if (!is('punct', '}')) take('punct', ',');
          }
          k += 1;
        } else defaultName = take('name', undefined, 'an import clause (`{ ... }` or one name)');
        take('name', 'from');
        statements.push({ kind: 'import', specifier: take('string', undefined, 'a module specifier'), typeOnly, defaultName, named });
      } else if (is('name', 'export')) {
        k += 1;
        take('name', 'default');
        statements.push({ kind: 'export-default', value: value() });
      } else if (is('name', 'const')) {
        k += 1;
        const name = take('name', undefined, 'a constant name');
        const type = is('punct', ':') ? (k += 1, take('name', undefined, 'a type name')) : null;
        take('punct', '=');
        statements.push({ kind: 'const', name, type, value: value() });
      } else if (is('name', 'process') && is('punct', '.', 1) && is('name', 'env', 2) && is('punct', '.', 3) && is('name', undefined, 4) && is('punct', '??=', 5) && is('string', undefined, 6)) {
        statements.push({ kind: 'env-default', name: tokens[k + 4].value, value: tokens[k + 6].value });
        k += 7;
      } else refuse('a statement no allowlisted shape holds');
      if (k < tokens.length && !is('punct', ';') && !(is('name') && STARTS.has(tokens[k].value))) refuse('more after a statement');
    }
  } catch (error) {
    if (!error.shape) throw error;
    return { statements: [], refusals: [error.message] };
  }
  return { statements, refusals: [] };
}

// Whether `node` fits `schema`: `true`/`false` that literal, 'boolean' and 'string' any of that type,
// { $oneOf: [...] } one of those strings, { $arrayOf: s } an array of s, and any other object an object
// whose every key the schema names (each at most once), with its value fitting that key's schema.
function fitShape(node, schema, where, problems) {
  const describe = (n) => Object.keys(n ?? {})[0] ?? 'nothing';
  const at = `\`${where || 'the default export'}\``;
  if (schema === true || schema === false) {
    if (node.boolean !== schema) problems.push(`${at} is ${describe(node) === 'boolean' ? node.boolean : `a ${describe(node)}`}, and the shape admits only ${schema}`);
  } else if (schema === 'boolean' || schema === 'string') {
    if (!(schema in node)) problems.push(`${at} is a ${describe(node)}, and the shape admits a ${schema}`);
  } else if (Array.isArray(schema?.$oneOf)) {
    if (!schema.$oneOf.includes(node.string)) problems.push(`${at} is ${'string' in node ? JSON.stringify(node.string) : `a ${describe(node)}`}, and the shape admits only ${schema.$oneOf.map((v) => JSON.stringify(v)).join(' or ')}`);
  } else if (schema && typeof schema === 'object' && '$arrayOf' in schema) {
    if (!node.array) problems.push(`${at} is a ${describe(node)}, and the shape admits an array`);
    else node.array.forEach((item, i) => fitShape(item, schema.$arrayOf, `${where}[${i}]`, problems));
  } else if (schema && typeof schema === 'object') {
    if (!node.object) { problems.push(`${at} is a ${describe(node)}, and the shape admits an object of written keys`); return; }
    const seen = new Set();
    for (const [key, child] of node.object) {
      const path = where ? `${where}.${key}` : key;
      if (seen.has(key)) problems.push(`\`${path}\` is written twice`);
      seen.add(key);
      if (!Object.hasOwn(schema, key)) problems.push(`\`${path}\` is a key the allowlisted shape does not name`);
      else fitShape(child, schema[key], path, problems);
    }
  } else problems.push(`${at}: the allowlist's shape is not one the guard can read`);
}

// One build configuration against its allowlisted shape. `reading` is a reader's { statements, refusals }.
export function configShapeProblems(kind, reading, shape) {
  if (!shape) return [`no allowlisted shape for a ${kind} (scripts/app-dependency-allowlist.json configShapes)`];
  if (reading.refusals.length > 0) return [...reading.refusals];
  const problems = [];
  const imported = new Map();
  const consts = new Map();
  const exports = [];
  for (const statement of reading.statements) {
    if (statement.kind === 'import') {
      const entry = (shape.imports ?? []).find((e) => e.specifier === statement.specifier);
      const what = `the import of ${JSON.stringify(statement.specifier)}`;
      if (!entry) { problems.push(`${what} is not one the shape admits (it admits ${(shape.imports ?? []).map((e) => `${e.typeOnly ? 'import type' : 'import'} { ${e.names.join(', ')} } from ${JSON.stringify(e.specifier)}`).join('; ') || 'no import'})`); continue; }
      const admits = entry.typeOnly ? 'a type-only import (`import type`) only' : 'a value import';
      const written = statement.typeOnly ? 'type-only' : 'a value import';
      if (statement.typeOnly !== entry.typeOnly) problems.push(`${what} is ${written}, and the shape admits ${admits}`);
      if (statement.defaultName !== null) problems.push(`${what} takes a default binding, which the shape does not admit`);
      for (const spec of statement.named) {
        if (!entry.names.includes(spec.name) || spec.alias !== null || spec.typeOnly) problems.push(`${what} names \`${spec.name}\`${spec.alias ? ` as \`${spec.alias}\`` : ''}${spec.typeOnly ? ' as a type' : ''}, which the shape does not admit`);
        else imported.set(spec.name, entry.typeOnly);
      }
    } else if (statement.kind === 'env-default') {
      if (!Object.hasOwn(shape.env ?? {}, statement.name) || shape.env[statement.name] !== statement.value) {
        problems.push(`\`process.env.${statement.name} ??= ${JSON.stringify(statement.value)}\` is not a default the shape admits`);
      }
    } else if (statement.kind === 'const') {
      if (consts.has(statement.name) || consts.size > 0) problems.push('more than one `const`; the shape holds one exported object');
      consts.set(statement.name, statement);
    } else if (statement.kind === 'export-default') exports.push(statement);
  }
  if (exports.length !== 1) { problems.push(`${exports.length} default exports; the shape holds exactly one`); return problems; }
  const types = new Set(shape.types ?? []);
  const typeName = (name) => { if (!types.has(name) || imported.get(name) !== true) problems.push(`the type \`${name}\` is not one the shape admits, imported type-only`); };
  let node = exports[0].value;
  if (node.ref !== undefined) {
    const declared = consts.get(node.ref);
    if (!declared) { problems.push(`\`export default ${node.ref}\` names no \`const\` of this file`); return problems; }
    if (declared.type !== null) typeName(declared.type);
    node = declared.value;
  } else if (consts.size > 0) problems.push('a `const` that is not the default export');
  if (node.satisfies !== undefined) { typeName(node.satisfies); node = node.value; }
  if (shape.call) {
    if (node.call !== shape.call || node.args.length !== 1 || imported.get(shape.call) !== false) {
      problems.push(`the default export is not \`${shape.call}({ ... })\`, with \`${shape.call}\` imported as the shape says`);
      return problems;
    }
    node = node.args[0];
  }
  if (node.call !== undefined || node.ref !== undefined || node.satisfies !== undefined) {
    problems.push(`the default export is ${node.call !== undefined ? `a call of \`${node.call}\`` : 'not an object written in this file'}; the shape holds one object literal`);
    return problems;
  }
  fitShape(node, shape.value, '', problems);
  return problems;
}

// Fails closed: a compiler config the guard cannot parse as JSON may hide an alias, so it is refused,
// and so is an `extends` whose file the guard has not read. A build configuration is read by
// `readShape` -- readConfigShape, the text reader, by default; in the CLI the parsed reader too, and
// the two must agree -- and held to its allowlisted shape (A1-257-7, Q0-257r3-1, R0-257-8).
export function checkResolutionConfigs(configs, allowlist, { readShape = readConfigShape } = {}) {
  const problems = [];
  const allowed = (file, option) => (allowlist.resolutionAliases?.allowed ?? []).some((e) => e.file === file && e.option === option);
  for (const [path, raw] of configs) {
    const refusedFile = REFUSED_CONFIG_FILES.find(([pattern]) => pattern.test(path));
    if (refusedFile) {
      problems.push(`${path} is ${refusedFile[1]}, which a build tool loads on its own and the guard reads no shape for; none is admitted (${refusedFile[2] ?? 'A1-257-7'})`);
      continue;
    }
    if (raw === null) { problems.push(`${path} is not a regular file; the guard reads no resolution config it cannot place`); continue; }
    const kind = configKindOf(path);
    if (kind) {
      for (const problem of configShapeProblems(kind, readShape(raw, path), allowlist.configShapes?.[kind])) {
        problems.push(`${path} is not the allowlisted ${kind} shape: ${problem} (A1-257-7; scripts/app-dependency-allowlist.json configShapes)`);
      }
      continue;
    }
    if (PACKAGE_MANIFEST.test(path)) {
      const { value: manifest, error } = parseJson(raw);
      if (error) { problems.push(`${path} is not plain JSON (${error.message}); a package.json the guard cannot read may hide a module map`); continue; }
      for (const field of ALIAS_PACKAGE_FIELDS) {
        if (manifest?.[field] !== undefined && !allowed(path, field)) {
          problems.push(`${path} declares \`${field}\`, which can make a bundler, Node or TypeScript load a module other than the one a specifier names; none is admitted until the guard resolves it (Q0-257r2-1, RFC-2026-029 Q-029-1)`);
        }
      }
      for (const field of CONFIG_PACKAGE_FIELDS) {
        if (manifest?.[field] !== undefined) problems.push(`${path} declares \`${field}\`, a ${field === 'babel' ? 'Babel' : 'PostCSS'} configuration a build tool loads on its own; none is admitted (A1-257-7)`);
      }
      problems.push(...workspaceScriptProblems(path, manifest, allowlist));
    }
  }
  // Every compiler config, and every file its `extends` chain reaches, whatever that file is named
  // (A1-257-5). A file reached twice is read once; a cycle stops where it closes.
  const workspaces = workspacePackages(configs);
  const queue = [...configs.keys()].filter((path) => COMPILER_CONFIG.test(path) && configs.get(path) !== null);
  const seen = new Set(queue);
  while (queue.length > 0) {
    const path = queue.shift();
    const { value: config, error } = parseJson(configs.get(path));
    if (error) {
      problems.push(`${path} is not plain JSON (${error.message}); a tsconfig the guard cannot read may hide a path alias`);
      continue;
    }
    for (const option of ALIAS_COMPILER_OPTIONS) {
      if (config?.compilerOptions?.[option] !== undefined && !allowed(path, option)) {
        problems.push(`${path} sets compilerOptions.${option}, which can make the compiler or the bundler load a module other than the one a specifier names; none is admitted until the guard resolves it (RFC-2026-029 Q-029-1, A1-257-5)`);
      }
    }
    for (const parent of extendsOf(config)) {
      const { candidates, refused } = extendsCandidates(path, parent, workspaces);
      const target = candidates?.find((candidate) => configs.has(candidate));
      if (refused || target === undefined) {
        problems.push(`${path} extends ${JSON.stringify(parent)}, which is not a file in this repository the guard has read (${refused ?? `no ${candidates.join(' or ')}`}); an inherited \`paths\` would be one the guard never reads`);
      } else if (configs.get(target) !== null && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return problems;
}
