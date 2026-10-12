import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import { globToRegExp } from './verify-branch-scope.mjs';

// RFC-2026-029 §8/1, §8/2 and the licence rule of §3.4/2 with its Amendment 2026-10-12
// (WP-1A-A0-002). Three questions about the package files, answered from package.json and
// package-lock.json alone -- never from node_modules -- so the answer is the same on a clean clone,
// in `npm run check` with no install, and in CI after `npm ci --ignore-scripts`:
//
//   1. Is every direct dependency of every package.json named in RFC-2026-029 §3.1 or §3.2, in the
//      column it is listed under (§8/1)? And is every package.json the root or one of its workspaces,
//      with no lifecycle script and nothing that changes resolution behind the allowlist's back?
//   2. Is every version exact, and every resolved lockfile entry a registry tarball with a sha512
//      integrity (§8/2, §4.2, §4.3)? An `inBundle` entry has no tarball of its own: it arrived inside
//      its parent's, so it is accepted only when its parent is a registry entry with a sha512
//      integrity that lists it in `bundleDependencies`.
//   3. Is every lockfile entry's licence in §3.4/2's list, or covered by one of the amendment's
//      named-package exceptions (transitive packages only)? Anything else needs its own decision.
//
// This is a guard over two JSON files, not a supply-chain control: it cannot see what a tarball
// contains, and the registry and integrity it checks are what the lockfile says. `npm ci` checks the
// tarballs against those integrities; `npm audit` and the release-age step (§4.6, §4.8) run in CI.

export const ALLOWLIST_PATH = 'scripts/app-dependency-allowlist.json';
export const RFC_PATH = 'architecture/decisions/RFC-2026-029-application-tier-stack.md';
export const REGISTRY = 'https://registry.npmjs.org/';

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies'];
// Fields that add a dependency or change how one resolves, none of which RFC-2026-029 admits.
const REFUSED_FIELDS = ['optionalDependencies', 'peerDependencies', 'peerDependenciesMeta', 'bundleDependencies',
  'bundledDependencies', 'overrides', 'resolutions'];
// npm runs these around install and pack, before anything here can look at the tree.
export const LIFECYCLE_SCRIPTS = ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly',
  'prepack', 'postpack', 'preuninstall', 'uninstall', 'postuninstall', 'dependencies'];
// An exact version: no range, tag, alias, URL, path or workspace protocol.
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA512 = /^sha512-[A-Za-z0-9+/]{86}==$/;
// A1-257-6: `npm run` puts node_modules/.bin first on PATH, and `--ignore-scripts` does not stop npm
// linking a package's `bin` there, so a bin named after a command a script or a CI step runs would run
// in its place, inside the job that runs it. The bootstrap job installs with `--no-bin-links`
// (.github/workflows/ci.yml); the application job and a local install link bins, so no lockfile entry
// may carry a bin named after one of these commands.
export const SHADOWED_COMMANDS = ['node', 'npm', 'npx', 'git', 'sh', 'bash', 'zsh', 'env', 'psql', 'pg_ctl', 'initdb', 'curl',
  'wget', 'tar', 'gzip', 'make', 'python', 'python3', 'ruby', 'perl', 'ssh', 'scp', 'docker', 'gh', 'sudo', 'cp', 'mv', 'rm',
  'cat', 'ls', 'test', 'true', 'false'];

export async function loadAllowlist(path = ALLOWLIST_PATH) {
  return JSON.parse(await readFile(path, 'utf8'));
}

// --- §8/1: the copy against the RFC -------------------------------------------------------------

// The RFC's §3.1 and §3.2 tables, read row by row: name, decision and the "where" cell verbatim.
export function parseRfcAllowlist(text) {
  const section = (from, to) => {
    const start = text.indexOf(from);
    const end = text.indexOf(to, start + from.length);
    if (start === -1 || end === -1) throw new Error(`RFC-2026-029 has no section between "${from}" and "${to}"`);
    return text.slice(start, end);
  };
  const rows = (body) => body.split('\n')
    .map((line) => line.match(/^\| `([^`]+)` \| .* \| (D\d+(?:, D\d+)*) \| (.*) \|$/))
    .filter(Boolean)
    .map(([, name, decision, where]) => ({ name, decision, where: where.trim() }));
  return {
    runtime: rows(section('### 3.1', '### 3.2')),
    development: rows(section('### 3.2', '### 3.3')),
  };
}

// The two names §3.1 defines ("Two names it uses"), read from the RFC itself so that the copy's
// `compositionRoot` and `adapters` are held to the definition and not to each other. `<app>` stands
// for each app the definition names (`apps/web`, `apps/worker`); `<key>` for any module key.
export function parseRfcTerms(text) {
  const bullet = (label) => {
    const at = text.indexOf(`- **${label}**`);
    if (at === -1) throw new Error(`RFC-2026-029 §3.1 does not define "${label}"`);
    const end = text.indexOf('\n- ', at + 3);
    const stop = text.indexOf('\n\n', at);
    return text.slice(at, Math.min(end === -1 ? Infinity : end, stop === -1 ? Infinity : stop));
  };
  const tokens = (body) => [...body.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const root = bullet('Composition root').split('Nothing else under')[0];
  const rootTokens = tokens(root);
  const apps = rootTokens.map((t) => t.match(/^apps\/([a-z0-9-]+)\/composition\/\*\*$/)?.[1]).filter(Boolean);
  if (apps.length === 0) throw new Error('RFC-2026-029 §3.1 names no apps/<app>/composition/** in its composition-root definition');
  const compositionRoot = rootTokens.flatMap((t) => (t.includes('<app>') ? apps.map((app) => t.replace('<app>', app)) : [t]));
  const adapters = tokens(bullet('Adapters')).map((t) => t.replace('<key>', '*'));
  return { compositionRoot, adapters };
}

// A "where it may be imported" cell, read by a fixed grammar into the exact set of globs it admits
// (Q0-257-1, C0-257-4). The cell is a list of items joined by ",", ", and" or "and", with an optional
// trailing "only" or "at the root only"; parenthetical remarks (`(the job store, MOD-000)`,
// `(`@import`)`) are commentary, and a clause opened by "; never" is a prohibition held by §6.3/5,
// not a place the package may be imported. An item is a backticked path, which admits exactly that
// glob; the defined term "adapters"; "the composition root of `apps/X` and `apps/Y`", which admits
// the definition's globs under those apps and no others; "anywhere under `d/` and `e/`", which admits
// `d/**` and `e/**`; the whole cell "nowhere"; or "nowhere, except `f`" (Amendment 2026-10-12,
// `typescript`'s cell), which admits exactly the files it names, each one backticked path with no glob
// character, so that the exception cannot widen to a directory by a `*`. Anything else is a cell this
// reader does not know, and it is a problem, never a guess: a new phrasing is taught here in the pull
// request that writes it.
export function parseWhereCell(cell, terms) {
  const [admitted, ...prohibitions] = cell.split(/;\s*(?=never\b)/);
  const never = prohibitions.map((clause) => clause.trim());
  let text = admitted.replace(/\s*\((?:[^()`]|`[^`]*`)*\)/g, '').trim();
  if (text === 'nowhere') return { globs: [], never };
  text = text.replace(/\s+(?:at the root\s+)?only$/, '');
  const items = (list) => list.split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map((item) => item.trim());
  const path = (item) => item.match(/^`([^`]+)`$/)?.[1] ?? null;
  const fail = (why) => { throw new Error(`the cell "${cell}" ${why}`); };
  let match = text.match(/^nowhere, except (.+)$/);
  if (match) {
    const globs = items(match[1]).map((item) => {
      const file = path(item);
      if (!file || /[*?[\]{}!]/.test(file) || file.endsWith('/')) fail(`names ${JSON.stringify(item)} after "nowhere, except", where one file (\`path/to/file\`) must stand`);
      return file;
    });
    return { globs, never };
  }
  match = text.match(/^the composition root of (.+)$/);
  if (match) {
    const globs = items(match[1]).flatMap((item) => {
      const app = path(item);
      if (!app || !/^apps\/[a-z0-9-]+$/.test(app)) fail(`names ${JSON.stringify(item)} where an app (\`apps/<app>\`) must stand`);
      return terms.compositionRoot.filter((glob) => glob.startsWith(`${app}/`));
    });
    return { globs, never };
  }
  match = text.match(/^anywhere under (.+)$/);
  if (match) {
    const globs = items(match[1]).map((item) => {
      const directory = path(item);
      if (!directory || !directory.endsWith('/')) fail(`names ${JSON.stringify(item)} where a directory (\`d/\`) must stand`);
      return `${directory}**`;
    });
    return { globs, never };
  }
  const globs = items(text).flatMap((item) => {
    if (item === 'adapters') return terms.adapters;
    const glob = path(item);
    if (!glob) fail(`holds ${JSON.stringify(item)}, which is neither a backticked path nor a term RFC-2026-029 §3.1 defines`);
    return [glob];
  });
  return { globs, never };
}

// The one prohibition a "where" cell states, and the guard that holds it: pg's "never reachable from
// `apps/web` (§6.3/5)" is scripts/app-boundaries.mjs's §6.3/5 walk. A prohibition this list does not
// name is one no guard holds, and it is a problem.
const HELD_PROHIBITIONS = { pg: ['never reachable from `apps/web` (§6.3/5)'] };

// Amendment 2026-10-12's table, read by a fixed grammar into rows of (licence, package patterns,
// exact licence expressions) (Q0-257-2, C0-257-4, R0-257-4). A package cell is a list of items
// separated by top-level commas: a backticked name (that name, under exactly the row's licence);
// "`x` and its per-platform binaries (`x-<platform>`)" (both patterns, the row's licence);
// "the `p` builds whose licence is `E` (with or without `MIT` beside them)" (pattern p, under exactly E
// or E AND MIT); and "optional through ..." (how they arrive, which admits nothing). Anything else is
// a problem, as for the "where" cells.
export function parseLicenceTable(amendment) {
  const rows = [];
  const problems = [];
  const head = amendment.indexOf('| Licence | Packages |');
  if (head === -1) return { rows, problems: ['the amendment has no "| Licence | Packages |" table'] };
  const lines = amendment.slice(head).split('\n').slice(2);
  for (const line of lines) {
    if (!line.startsWith('|')) break;
    const cells = line.match(/^\| `([^`]+)` \| (.+) \|$/);
    if (!cells) { problems.push(`the amendment's table row ${JSON.stringify(line)} is not "| \`licence\` | packages |"`); continue; }
    const [, licence, cell] = cells;
    const items = [];
    let depth = 0; let quoted = false; let current = '';
    for (const ch of cell) {
      if (ch === '`') quoted = !quoted;
      else if (!quoted && ch === '(') depth += 1;
      else if (!quoted && ch === ')') depth -= 1;
      if (ch === ',' && depth === 0 && !quoted) { items.push(current.trim()); current = ''; } else current += ch;
    }
    items.push(current.trim());
    for (const raw of items) {
      const item = raw.replace(/^and\s+/, '');
      let m;
      if ((m = item.match(/^`([^`]+)`$/))) rows.push({ licence, packages: [m[1]], expressions: [licence] });
      else if ((m = item.match(/^`([^`]+)` and its per-platform binaries \(`([^`]+)`\)$/)) && m[2] === `${m[1]}-<platform>`) {
        rows.push({ licence, packages: [m[1], m[2]], expressions: [licence] });
      } else if ((m = item.match(/^the `([^`]+)` builds whose licence is `([^`]+)` \(with or without `MIT` beside them\)$/)) && m[2].split(/\s+AND\s+/).includes(licence)) {
        rows.push({ licence, packages: [m[1]], expressions: [m[2], `${m[2]} AND MIT`] });
      } else if (!/^optional through /.test(item)) {
        problems.push(`the amendment's ${licence} row holds ${JSON.stringify(item)}, which this reader does not know`);
      }
    }
  }
  if (rows.length === 0 && problems.length === 0) problems.push("the amendment's licence table parsed to no row");
  return { rows, problems };
}

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fourteen: 14, thirty: 30 };

// §4.8's day count, as the RFC writes it ("at least **seven days**") (A1-257-3, Q0-257-4).
export function parseReleaseAgeDays(text) {
  const match = text.match(/\*\*Release age\.\*\*[\s\S]*?for at least \*\*([a-z]+|\d+) days\*\*/);
  if (!match) return null;
  return /^\d+$/.test(match[1]) ? Number(match[1]) : (NUMBER_WORDS[match[1]] ?? null);
}

// §4.8: "admitted only with A1's recorded approval in that pull request". The record is an A1 file
// under a package's evidence directory; scripts/verify-release-age.mjs also requires the pull
// request to add or change it.
export const A1_RECORD = /^evidence\/[A-Za-z0-9._-]+\/a1-[A-Za-z0-9._-]+\.md$/;
const PACKAGE_AT_VERSION = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const canonical = (row) => JSON.stringify([row.licence, [...row.packages].sort(), [...row.expressions].sort()]);
const sameSet = (a, b) => a.length === b.length && [...new Set(a)].length === a.length && a.every((x) => b.includes(x));

export function compareAllowlistWithRfc(allowlist, rfcText) {
  const problems = [];
  const parsed = parseRfcAllowlist(rfcText);
  let terms = null;
  try {
    terms = parseRfcTerms(rfcText);
  } catch (error) {
    problems.push(error.message);
  }
  if (terms) {
    if (!sameSet(allowlist.compositionRoot ?? [], terms.compositionRoot)) {
      problems.push(`compositionRoot: §3.1 defines ${terms.compositionRoot.join(', ')}; the copy has ${(allowlist.compositionRoot ?? []).join(', ')}`);
    }
    if (!sameSet(allowlist.adapters ?? [], terms.adapters)) {
      problems.push(`adapters: §3.1 defines ${terms.adapters.join(', ')}; the copy has ${(allowlist.adapters ?? []).join(', ')}`);
    }
  }
  for (const column of ['runtime', 'development']) {
    const fromRfc = parsed[column];
    const copy = allowlist[column] ?? [];
    if (fromRfc.length === 0) problems.push(`RFC-2026-029's ${column} table parsed to no row`);
    const key = (row) => JSON.stringify([row.name, row.decision, row.where]);
    const rfcKeys = new Set(fromRfc.map(key));
    const copyKeys = new Set(copy.map(key));
    for (const row of fromRfc) if (!copyKeys.has(key(row))) problems.push(`${column}: the RFC lists ${row.name} (${row.decision}, "${row.where}") and the copy does not`);
    for (const row of copy) if (!rfcKeys.has(key(row))) problems.push(`${column}: the copy lists ${row.name} (${row.decision}, "${row.where}") and the RFC does not`);
    if (!terms) continue;
    // The copy's globs are compared with what the RFC's cell admits, read by the grammar above.
    for (const row of fromRfc) {
      let cell;
      try {
        cell = parseWhereCell(row.where, terms);
      } catch (error) {
        problems.push(`${row.name}: ${error.message}`);
        continue;
      }
      const held = HELD_PROHIBITIONS[row.name] ?? [];
      for (const clause of cell.never) if (!held.includes(clause)) problems.push(`${row.name}: the RFC states "${clause}", which no guard here holds`);
      for (const clause of held) if (!cell.never.includes(clause)) problems.push(`${row.name}: the guard holds "${clause}", which the RFC's cell no longer states`);
      const imports = copy.find((r) => r.name === row.name)?.imports;
      if (!imports) continue;
      const extra = imports.filter((glob) => !cell.globs.includes(glob));
      const missing = cell.globs.filter((glob) => !imports.includes(glob));
      for (const glob of extra) problems.push(`${row.name}: the copy admits ${glob}, which "${row.where}" does not name`);
      for (const glob of missing) problems.push(`${row.name}: the RFC's cell admits ${glob} and the copy has no such glob`);
      if (imports.length !== new Set(imports).size) problems.push(`${row.name}: the copy repeats a glob`);
    }
  }
  // §3.4/2's list, and the amendment's exceptions, are the RFC's words too.
  const accepted = rfcText.match(/\*\*Licences\*\* accepted without further discussion: ((?:[A-Za-z0-9.+-]+, )*[A-Za-z0-9.+-]+?)\.\s/);
  const listed = accepted ? accepted[1].split(',').map((s) => s.trim()) : [];
  if (JSON.stringify(listed) !== JSON.stringify(allowlist.licences.accepted)) {
    problems.push(`licences: §3.4/2 accepts ${listed.join(', ') || 'nothing the parser could read'}; the copy accepts ${allowlist.licences.accepted.join(', ')}`);
  }
  const at = rfcText.indexOf(`## ${allowlist.licences.amendment}`);
  if (at === -1) problems.push(`licences: RFC-2026-029 has no "## ${allowlist.licences.amendment}" section for the copy's exceptions`);
  else {
    const { rows, problems: unread } = parseLicenceTable(rfcText.slice(at));
    problems.push(...unread.map((p) => `licences: ${p}`));
    const rfcRows = new Map(rows.map((row) => [canonical(row), row]));
    const copyRows = new Map((allowlist.licences.exceptions ?? []).map((row) => [canonical(row), row]));
    for (const [k, row] of rfcRows) if (!copyRows.has(k)) problems.push(`licences: the amendment admits ${row.licence} for ${row.packages.join(', ')} under ${row.expressions.join(' | ')}, and the copy has no such row`);
    for (const [k, row] of copyRows) if (!rfcRows.has(k)) problems.push(`licences: the copy admits ${row.licence} for ${row.packages.join(', ')} under ${(row.expressions ?? []).join(' | ')}, which the amendment's table does not`);
  }
  // §4.8: the day count is the RFC's, and an exception names one version and A1's record of it.
  const days = parseReleaseAgeDays(rfcText);
  if (days === null) problems.push('releaseAgeDays: RFC-2026-029 §4.8 states no day count this reader can find');
  else if (allowlist.releaseAgeDays !== days) problems.push(`releaseAgeDays: §4.8 says ${days} days; the copy says ${JSON.stringify(allowlist.releaseAgeDays)}`);
  for (const exception of allowlist.releaseAgeExceptions ?? []) {
    if (typeof exception?.package !== 'string' || !PACKAGE_AT_VERSION.test(exception.package)) {
      problems.push(`releaseAgeExceptions: ${JSON.stringify(exception?.package)} is not one exact name@version`);
    }
    if (typeof exception?.a1_record !== 'string' || !A1_RECORD.test(exception.a1_record)) {
      problems.push(`releaseAgeExceptions: ${exception?.package}'s a1_record ${JSON.stringify(exception?.a1_record)} is not evidence/<package>/a1-*.md (§4.8: A1's recorded approval)`);
    }
  }
  for (const entry of allowlist.resolutionAliases?.allowed ?? []) {
    if (typeof entry?.file !== 'string' || typeof entry?.option !== 'string') problems.push(`resolutionAliases: ${JSON.stringify(entry)} names no file and option`);
  }
  return problems;
}

// --- §8/1 and §8/2: the package.json files ------------------------------------------------------

// Every package.json in the tree, outside node_modules, .git, build output and harness worktrees.
export async function findPackageManifests(root = '.') {
  const found = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (['node_modules', '.git', '.next'].includes(entry.name)) continue;
      const path = directory === '.' ? entry.name : `${directory}/${entry.name}`;
      if (path === '.claude') continue;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name === 'package.json') found.push(path);
    }
  };
  await walk(root);
  return found.sort();
}

export function checkPackageManifests(manifests, allowlist) {
  const problems = [];
  const root = manifests['package.json'];
  if (!root) return ['the root package.json is missing'];
  const workspaces = Array.isArray(root.workspaces) ? root.workspaces : [];
  for (const workspace of workspaces) {
    if (typeof workspace !== 'string' || !/^apps\/[a-z0-9-]+$/.test(workspace)) {
      problems.push(`root workspaces lists ${JSON.stringify(workspace)}; RFC-2026-029 §4.1 makes apps/web and apps/worker workspaces, each named by its exact path`);
    }
  }
  const runtime = new Set(allowlist.runtime.map((r) => r.name));
  const development = new Set(allowlist.development.map((r) => r.name));
  for (const [path, manifest] of Object.entries(manifests)) {
    const directory = path === 'package.json' ? '' : path.slice(0, -'/package.json'.length);
    if (directory !== '' && !workspaces.includes(directory)) {
      problems.push(`${path} is neither the root package nor a workspace the root declares; npm would not install it and nothing here would check it`);
    }
    for (const field of REFUSED_FIELDS) {
      if (manifest[field] !== undefined) problems.push(`${path} declares ${field}, which RFC-2026-029 does not admit (§3, §4)`);
    }
    const lifecycle = LIFECYCLE_SCRIPTS.filter((name) => manifest.scripts?.[name] !== undefined);
    if (lifecycle.length > 0) problems.push(`${path} declares npm lifecycle script(s) ${lifecycle.join(', ')} (RFC-2026-029 §4.4)`);
    if (directory !== '' && manifest.private !== true) problems.push(`${path} is not "private": true; a workspace is never published`);
    for (const field of DEPENDENCY_FIELDS) {
      for (const [name, version] of Object.entries(manifest[field] ?? {})) {
        const column = field === 'dependencies' ? runtime : development;
        const other = field === 'dependencies' ? development : runtime;
        if (!column.has(name)) {
          problems.push(other.has(name)
            ? `${path} ${field} names ${name}, which RFC-2026-029 lists under ${field === 'dependencies' ? '§3.2 (devDependencies)' : '§3.1 (dependencies)'}; moving a name between columns is an amendment (§3.4/7)`
            : `${path} ${field} names ${name}, which is not in RFC-2026-029 §3.1 or §3.2; a direct dependency is added only by an approved RFC (§3.4/1)`);
        }
        if (typeof version !== 'string' || !EXACT_VERSION.test(version)) {
          problems.push(`${path} ${field}.${name} is ${JSON.stringify(version)}, not an exact version (RFC-2026-029 §4.2)`);
        }
      }
    }
  }
  return problems;
}

// --- §8/2: the lockfile -------------------------------------------------------------------------

export const nameOf = (key, entry) => entry?.name ?? key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);

// The nearest enclosing package of an entry: `node_modules/a/node_modules/b` sits inside `node_modules/a`.
function parentKey(key) {
  const at = key.lastIndexOf('/node_modules/');
  return at === -1 ? null : key.slice(0, at);
}

export function checkLockfile(lock, manifests) {
  const problems = [];
  if (lock?.lockfileVersion !== 3) problems.push(`package-lock.json lockfileVersion is ${lock?.lockfileVersion}, not 3 (RFC-2026-029 §4.1)`);
  const packages = lock?.packages ?? {};
  const root = manifests['package.json'] ?? {};
  const workspaces = new Set(root.workspaces ?? []);
  const compare = (key, manifest, label) => {
    const entry = packages[key];
    if (!entry) { problems.push(`package-lock.json has no entry for ${label}`); return; }
    for (const field of DEPENDENCY_FIELDS) {
      if (JSON.stringify(sortObject(entry[field] ?? {})) !== JSON.stringify(sortObject(manifest[field] ?? {}))) {
        problems.push(`package-lock.json ${label} ${field} does not match ${key === '' ? 'package.json' : `${key}/package.json`}; the lockfile travels with its package.json (§4.5)`);
      }
    }
  };
  compare('', root, 'the root package');
  for (const workspace of workspaces) {
    if (manifests[`${workspace}/package.json`]) compare(workspace, manifests[`${workspace}/package.json`], `workspace ${workspace}`);
  }
  for (const [key, entry] of Object.entries(packages)) {
    // Every entry, the root and the workspaces included: npm links a workspace's bins too. A `bin`
    // string is linked under the package's own name (without its scope).
    const bins = typeof entry?.bin === 'string' ? [nameOf(key, entry).split('/').pop()] : Object.keys(entry?.bin ?? {});
    for (const bin of bins) {
      const linked = String(bin).split('/').pop().toLowerCase();
      if (SHADOWED_COMMANDS.includes(linked)) {
        problems.push(`${key || 'the root package'} declares a bin named ${JSON.stringify(bin)}, which npm links into node_modules/.bin, first on PATH under \`npm run\`, in place of the ${linked} command (A1-257-6)`);
      }
    }
    if (key === '' || workspaces.has(key)) continue;
    if (!key.startsWith('node_modules/') || key.split('/').some((s) => s === '..' || s === '.')) {
      problems.push(`package-lock.json entry ${JSON.stringify(key)} is neither the root, a declared workspace nor a node_modules path`);
      continue;
    }
    if (entry.link === true) {
      if (!workspaces.has(entry.resolved)) problems.push(`${key} is a link to ${JSON.stringify(entry.resolved)}, which is not a declared workspace (RFC-2026-029 §4.3)`);
      continue;
    }
    if (entry.version !== undefined && !EXACT_VERSION.test(entry.version)) problems.push(`${key} resolves to version ${JSON.stringify(entry.version)}`);
    if (entry.inBundle === true) {
      // No tarball of its own: it arrived inside an ancestor's. The ancestor carries the integrity.
      if (entry.resolved !== undefined || entry.integrity !== undefined) {
        problems.push(`${key} is inBundle and also names its own resolved/integrity; a bundled entry has neither`);
      }
      let ancestor = parentKey(key);
      while (ancestor && packages[ancestor]?.inBundle === true) ancestor = parentKey(ancestor);
      const holder = ancestor ? packages[ancestor] : undefined;
      const bundles = holder?.bundleDependencies ?? holder?.bundledDependencies;
      if (!holder) {
        problems.push(`${key} is inBundle but no enclosing entry carries it`);
      } else if (!String(holder.resolved ?? '').startsWith(REGISTRY) || !SHA512.test(String(holder.integrity ?? ''))) {
        problems.push(`${key} is inBundle in ${ancestor}, which is not a registry entry with a sha512 integrity`);
      } else if (!Array.isArray(bundles) || !bundles.includes(nameOf(directChildOf(key, ancestor), {}))) {
        problems.push(`${key} is inBundle in ${ancestor}, whose bundleDependencies do not list ${nameOf(directChildOf(key, ancestor), {})}`);
      }
      continue;
    }
    if (!String(entry.resolved ?? '').startsWith(REGISTRY)) {
      problems.push(`${key} is resolved from ${JSON.stringify(entry.resolved)}, not ${REGISTRY} (RFC-2026-029 §4.3)`);
    }
    if (!SHA512.test(String(entry.integrity ?? ''))) {
      problems.push(`${key} has integrity ${JSON.stringify(entry.integrity)}, not a sha512 (RFC-2026-029 §4.3)`);
    }
  }
  return problems;
}

// `node_modules/p/node_modules/a/node_modules/b` bundled by `node_modules/p` is reached through `a`,
// the package p's tarball bundles directly; bundleDependencies names that one.
function directChildOf(key, ancestor) {
  const rest = key.slice(ancestor.length + '/node_modules/'.length);
  const parts = rest.split('/node_modules/');
  return `node_modules/${parts[0]}`;
}

function sortObject(object) {
  return Object.fromEntries(Object.keys(object).sort().map((k) => [k, object[k]]));
}

// --- §3.4/2 and Amendment 2026-10-12: licences ------------------------------------------------

// An SPDX expression in the shapes the lockfile carries: one id, ids joined by AND, alternatives
// joined by OR, optionally in parentheses. Anything more complex is refused rather than guessed.
export function licenceAlternatives(expression) {
  if (typeof expression !== 'string' || expression.trim() === '') return null;
  const text = expression.trim().replace(/^\((.*)\)$/, '$1');
  if (/[()]/.test(text)) return null;
  return text.split(/\s+OR\s+/).map((alt) => alt.split(/\s+AND\s+/).map((id) => id.trim()));
}

// A package cell's spelling as a pattern: `*` is one or more name characters; `<platform>` is an
// operating system npm names followed by its architecture and libc, which is A0's reading of "its
// per-platform binaries" (C0-257-5): `lightningcss-plugin` is not one.
const PLATFORM = '(?:android|darwin|freebsd|linux|win32)-[a-z0-9-]+';
export function packagePattern(spelling) {
  const escaped = spelling.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace('<platform>', PLATFORM).replace(/\*/g, '[a-z0-9-]+')}$`);
}
const normaliseExpression = (expression) => String(expression ?? '').trim().replace(/^\((.*)\)$/, '$1').split(/\s+/).join(' ');

export function checkLicences(lock, manifests, allowlist) {
  const problems = [];
  const accepted = new Set(allowlist.licences.accepted);
  const direct = new Set(Object.values(manifests).flatMap((m) => DEPENDENCY_FIELDS.flatMap((f) => Object.keys(m[f] ?? {}))));
  const workspaces = new Set(manifests['package.json']?.workspaces ?? []);
  for (const [key, entry] of Object.entries(lock?.packages ?? {})) {
    if (key === '' || workspaces.has(key) || entry.link === true) continue;
    const name = nameOf(key, entry);
    const recorded = entry.license ?? allowlist.licences.lockfileFallback?.[`${name}@${entry.version}`];
    const alternatives = licenceAlternatives(recorded);
    if (!alternatives) {
      problems.push(`${key} (${name}@${entry.version}) has no licence the guard can read (${JSON.stringify(recorded)}); record it or decide it`);
      continue;
    }
    // The amendment's exceptions are for the named TRANSITIVE packages, each under the exact licence
    // expression its row states; a direct dependency with such a licence is a new decision.
    const expression = normaliseExpression(recorded);
    const excepted = !direct.has(name) && allowlist.licences.exceptions.some((row) => row.packages.some((pattern) => packagePattern(pattern).test(name))
      && row.expressions.some((allowed) => normaliseExpression(allowed) === expression));
    const ok = excepted || alternatives.some((ids) => ids.every((id) => accepted.has(id)));
    if (!ok) {
      problems.push(`${key} (${name}@${entry.version}) is licensed ${recorded}, which RFC-2026-029 §3.4/2 does not accept${direct.has(name) ? ' for a direct dependency' : ''} and no named exception of its ${allowlist.licences.amendment} covers`);
    }
  }
  return problems;
}

// --- the repository ----------------------------------------------------------------------------

export async function readRepository(root = '.') {
  const paths = await findPackageManifests(root);
  const manifests = {};
  for (const path of paths) manifests[path] = JSON.parse(await readFile(join(root, path), 'utf8'));
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  const rfc = await readFile(join(root, RFC_PATH), 'utf8');
  const allowlist = await loadAllowlist(join(root, ALLOWLIST_PATH));
  return { manifests, lock, rfc, allowlist };
}

export function verifyAll({ manifests, lock, rfc, allowlist }) {
  return {
    allowlist: compareAllowlistWithRfc(allowlist, rfc),
    manifests: checkPackageManifests(manifests, allowlist),
    lockfile: checkLockfile(lock, manifests),
    licences: checkLicences(lock, manifests, allowlist),
  };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const result = verifyAll(await readRepository());
  const problems = Object.entries(result).flatMap(([part, list]) => list.map((p) => `${part}: ${p}`));
  if (problems.length > 0) {
    console.error(`application dependencies: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const entries = Object.entries(lock.packages).filter(([key, value]) => key.startsWith('node_modules/') && value.link !== true);
  const bundled = entries.filter(([, value]) => value.inBundle === true).length;
  console.log(`application dependencies: every package.json names only RFC-2026-029 §3 packages at exact versions; `
    + `${entries.length - bundled} lockfile entries are registry tarballs with sha512, ${bundled} more ship inside one, all under accepted licences`);
}
