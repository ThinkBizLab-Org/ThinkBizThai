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

// Every path the "where" cell names in backticks must be covered by a glob, and every glob must come
// from a path the cell names or from one of the two terms the RFC defines (§3.1): "adapters" and
// "composition root". A cell reading "nowhere" admits no glob at all.
export function whereMatchesImports(entry, allowlist) {
  const problems = [];
  // A clause opened by "never" names where a package may NOT be reached (pg: "never reachable from `apps/web`").
  const admitted = entry.where.split(/;\s*never\b/)[0];
  const tokens = [...admitted.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((t) => !t.startsWith('@') && !t.startsWith('§'));
  const extends_ = (glob, token) => glob === token || glob.startsWith(token.endsWith('/') ? token : `${token}/`);
  if (/^nowhere\b/.test(entry.where)) {
    if (entry.imports.length !== 0) problems.push(`${entry.name}: the RFC says "${entry.where}" and the copy admits ${entry.imports.join(', ')}`);
    return problems;
  }
  for (const token of tokens) {
    if (!entry.imports.some((glob) => extends_(glob, token))) problems.push(`${entry.name}: the RFC names \`${token}\` and the copy has no glob for it`);
  }
  for (const glob of entry.imports) {
    const fromToken = tokens.some((token) => extends_(glob, token));
    const fromAdapters = /\badapters\b/.test(entry.where) && allowlist.adapters.includes(glob);
    const fromRoot = /\bcomposition root\b/.test(entry.where) && allowlist.compositionRoot.includes(glob);
    if (!fromToken && !fromAdapters && !fromRoot) problems.push(`${entry.name}: the copy admits ${glob}, which "${entry.where}" does not name`);
  }
  if (entry.imports.length === 0) problems.push(`${entry.name}: the RFC says "${entry.where}" and the copy admits nowhere`);
  return problems;
}

export function compareAllowlistWithRfc(allowlist, rfcText) {
  const problems = [];
  const parsed = parseRfcAllowlist(rfcText);
  for (const column of ['runtime', 'development']) {
    const fromRfc = parsed[column];
    const copy = allowlist[column] ?? [];
    if (fromRfc.length === 0) problems.push(`RFC-2026-029's ${column} table parsed to no row`);
    const key = (row) => JSON.stringify([row.name, row.decision, row.where]);
    const rfcKeys = new Set(fromRfc.map(key));
    const copyKeys = new Set(copy.map(key));
    for (const row of fromRfc) if (!copyKeys.has(key(row))) problems.push(`${column}: the RFC lists ${row.name} (${row.decision}, "${row.where}") and the copy does not`);
    for (const row of copy) if (!rfcKeys.has(key(row))) problems.push(`${column}: the copy lists ${row.name} (${row.decision}, "${row.where}") and the RFC does not`);
    for (const row of copy) problems.push(...whereMatchesImports(row, allowlist));
  }
  // §3.4/2's list, and the amendment's exceptions, are the RFC's words too.
  const accepted = rfcText.match(/\*\*Licences\*\* accepted without further discussion: ((?:[A-Za-z0-9.+-]+, )*[A-Za-z0-9.+-]+?)\.\s/);
  const listed = accepted ? accepted[1].split(',').map((s) => s.trim()) : [];
  if (JSON.stringify(listed) !== JSON.stringify(allowlist.licences.accepted)) {
    problems.push(`licences: §3.4/2 accepts ${listed.join(', ') || 'nothing the parser could read'}; the copy accepts ${allowlist.licences.accepted.join(', ')}`);
  }
  const at = rfcText.indexOf(`## ${allowlist.licences.amendment}`);
  if (at === -1) problems.push(`licences: RFC-2026-029 has no "## ${allowlist.licences.amendment}" section for the copy's exceptions`);
  const amendment = at === -1 ? '' : rfcText.slice(at);
  for (const exception of allowlist.licences.exceptions) {
    if (!amendment.includes(`\`${exception.licence}\``)) problems.push(`licences: the amendment does not name ${exception.licence}`);
    if (!amendment.includes(`\`${exception.named}\``)) problems.push(`licences: the amendment does not name ${exception.named}`);
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
    // The amendment's exceptions are for the named TRANSITIVE packages; a direct dependency with
    // such a licence is a new decision.
    const extra = direct.has(name) ? [] : allowlist.licences.exceptions
      .filter((exception) => exception.packages.some((pattern) => new RegExp(pattern).test(name)))
      .map((exception) => exception.licence);
    const ok = alternatives.some((ids) => ids.every((id) => accepted.has(id) || extra.includes(id)));
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
