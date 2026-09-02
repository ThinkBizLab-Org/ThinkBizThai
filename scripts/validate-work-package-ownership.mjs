import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROTECTED_KEYS } from './verify-test-coverage-floor.mjs';
import { realpathSync } from 'node:fs';

export class OwnershipValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function globToRegExp(pattern) {
  let expression = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        expression += '.*';
        index += 1;
      } else {
        expression += '[^/]*';
      }
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${expression}$`);
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(path));
}

function isRepositoryRelativePath(path, { allowGlobs }) {
  if (typeof path !== 'string' || path.length === 0 || path.startsWith('/') || path.includes('\\') || path.includes('\u0000')) return false;
  if (!allowGlobs && path.includes('*')) return false;
  return path.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

// A pattern that matches everything asserts nothing. Independent review thirteen appended `"**"`
// to `amends_without_owning.paths` -- a field this validator never read, for shape, breadth or
// overlap -- and `globToRegExp('**')` compiles to /^.*$/, so `declaredPaths()` accepted every
// path in the repository and the branch-scope guard reported "all N changed paths are declared"
// for a branch touching contracts it does not own. Exit 0, 198/198.
//
// The sibling field `writable_paths` was already validated; the review's own note is the point:
// the check on one field was "narrowly true and practically irrelevant" while the field beside it
// had none at all.
//
// A declaration must name something. A pattern with no literal segment names everything.
function namesSomething(pattern) {
  return pattern.split('/').some((segment) => segment.length > 0 && !segment.includes('*'));
}

// How many repository files one amendment pattern may cover before it stops being a record of
// what a package touched and becomes a blanket permission.
//
// Independent review thirteen closed the `["**"]` case; probing the fix immediately afterwards
// showed `contract-catalog/**` and `scripts/**` still passed -- one literal segment, an entire
// tree. And the probe found one already in the repository, declared and unnoticed:
// `WP-0A-CON-007` amended `contract-catalog/shared-kernel/**`, which covers **705 files, the
// whole catalog**, when the package actually touched thirteen contract directories.
//
// The threshold is chosen from the tree rather than from taste: every legitimate amendment glob
// declared today covers between 1 and 70 files, and the only one above that covered everything.
// A pattern over the cap is not forbidden work -- it is a request to say which files.
export const AMENDMENT_BREADTH_CAP = 128;

export function validateManifestOwnership(manifests, repositoryFiles = null, digestedFiles = []) {
  const shieldedFiles = [...new Set([...PROTECTED_KEYS, ...digestedFiles])];
  for (const manifest of manifests) {
    const ownership = manifest.ownership ?? {};
    const writablePaths = ownership.writable_paths;
    const readOnlyPaths = ownership.read_only_paths;
    const outputFiles = manifest.outputs?.files;
    const label = manifest.work_package_id ?? '<unknown>';

    if (!Array.isArray(writablePaths) || !Array.isArray(readOnlyPaths) || !Array.isArray(outputFiles)) {
      throw new OwnershipValidationError(66, `work package ${label} requires writable_paths, read_only_paths, and outputs.files arrays`);
    }

    for (const pattern of [...writablePaths, ...readOnlyPaths]) {
      if (!isRepositoryRelativePath(pattern, { allowGlobs: true })) {
        throw new OwnershipValidationError(67, `work package ${label} ownership path must be repository-relative: ${String(pattern)}`);
      }
    }

    // A package declared **/*secret* forbidden and then shipped a file matching it. The
    // validator compared outputs against writable and read-only paths but never against
    // forbidden_paths, so a manifest could contradict its own rule and stay green.
    const forbiddenPaths = ownership.forbidden_paths ?? [];
    for (const output of outputFiles) {
      if (!isRepositoryRelativePath(output, { allowGlobs: false })) {
        throw new OwnershipValidationError(67, `work package ${label} output must be an exact file path: ${String(output)}`);
      }
      if (matchesAny(output, forbiddenPaths)) {
        throw new OwnershipValidationError(72, `work package ${label} declares an output its own forbidden_paths forbid: ${output}`);
      }
      if (!matchesAny(output, writablePaths)) {
        throw new OwnershipValidationError(68, `work package ${label} output is outside writable_paths: ${output}`);
      }
      if (matchesAny(output, readOnlyPaths)) {
        throw new OwnershipValidationError(69, `work package ${label} output matches read_only_paths: ${output}`);
      }
    }
  }

  for (const manifest of manifests) {
    const ownership = manifest.ownership ?? {};
    const label = manifest.work_package_id ?? '<unknown>';
    const amendment = ownership.amends_without_owning;
    if (amendment === undefined) continue;
    const amendedPaths = amendment?.paths;
    if (!Array.isArray(amendedPaths)) {
      throw new OwnershipValidationError(74, `work package ${label} declares amends_without_owning without a paths array`);
    }
    for (const pattern of amendedPaths) {
      if (!isRepositoryRelativePath(pattern, { allowGlobs: true })) {
        throw new OwnershipValidationError(74, `work package ${label} amends an invalid path: ${JSON.stringify(pattern)}`);
      }
      if (!namesSomething(pattern)) {
        throw new OwnershipValidationError(74, `work package ${label} amends ${JSON.stringify(pattern)}, which names no path at all. `
          + 'An amendment records what a package touched outside its own scope; a pattern matching everything records nothing '
          + 'and silences the branch-scope guard entirely.');
      }
      // Breadth in FILES is not the only breadth that matters. `scripts/**` covers only fifteen
      // files and would pass the cap -- and those fifteen are every guard in this repository.
      // A glob must never stand in for a protected file: those are named, or not amended.
      if (pattern.includes('*')) {
        // The shielded set is PROTECTED_KEYS *and every file the integrity manifest digests* --
        // which is every test suite too. Probing the first version found `test-kits/contracts/**`
        // passing at exit 0: fewer than 128 files, none of them in PROTECTED_KEYS, and all of
        // them the ratchets this repository is made of.
        const shielded = shieldedFiles.filter((key) => globToRegExp(pattern).test(key));
        if (shielded.length > 0) {
          throw new OwnershipValidationError(74, `work package ${label} amends ${JSON.stringify(pattern)}, which covers `
            + `${shielded.length} protected file(s) — ${shielded.slice(0, 3).join(', ')}${shielded.length > 3 ? ', …' : ''}. `
            + 'A guard, a protocol schema or a registry is amended by name or not at all; a glob over one is a permission, not a record.');
        }
      }
      if (repositoryFiles && pattern.includes('*')) {
        const covered = repositoryFiles.filter((file) => globToRegExp(pattern).test(file)).length;
        if (covered > AMENDMENT_BREADTH_CAP) {
          throw new OwnershipValidationError(74, `work package ${label} amends ${JSON.stringify(pattern)}, which covers ${covered} files. `
            + `An amendment records what a package TOUCHED; above ${AMENDMENT_BREADTH_CAP} files it is a blanket permission over `
            + 'a tree the package does not own. Name the directories or files instead.');
        }
      }
    }
    // An amendment is a claim ABOUT ANOTHER PACKAGE'S FILES, so it has to say why. The field
    // already carried a rationale by convention; nothing required it.
    if (amendedPaths.length > 0 && (typeof amendment.rationale !== 'string' || amendment.rationale.trim().length < 40)) {
      throw new OwnershipValidationError(74, `work package ${label} amends ${amendedPaths.length} path(s) with no stated reason`);
    }
  }

  for (const owner of manifests) {
    const ownerPaths = owner.ownership?.writable_paths ?? [];
    for (const candidate of manifests) {
      if (candidate.work_package_id === owner.work_package_id) continue;
      for (const output of candidate.outputs?.files ?? []) {
        if (matchesAny(output, ownerPaths)) {
          throw new OwnershipValidationError(70, `work package ${owner.work_package_id ?? '<unknown>'} writable path overlaps ${candidate.work_package_id ?? '<unknown>'} output: ${output}`);
        }
      }
    }
  }
}

async function findJsonManifests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return findJsonManifests(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  }));
  return nested.flat();
}

export async function validateWorkPackageOwnership(directory) {
  const manifestFiles = await findJsonManifests(directory);
  if (manifestFiles.length === 0) {
    throw new OwnershipValidationError(71, `no JSON work-package manifests found in ${directory}`);
  }
  const manifests = await Promise.all(manifestFiles.sort().map(async (manifestFile) => {
    try {
      return JSON.parse(await readFile(manifestFile, 'utf8'));
    } catch (error) {
      throw new OwnershipValidationError(65, `${manifestFile}: invalid JSON: ${error.message}`);
    }
  }));
  validateManifestOwnership(manifests, await repositoryFileList(), await digestedFileList());
}

// Every file the integrity manifest digests: the guards, the protocol schemas, the registries
// AND every test suite. A glob over any of them is a permission over a ratchet.
async function digestedFileList(path = 'test-kits/integrity-manifest.json') {
  try {
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    return Object.keys(manifest.files ?? {});
  } catch {
    // A missing or unreadable manifest must not silently empty the shielded set; PROTECTED_KEYS
    // is the floor that needs no file at all.
    return [];
  }
}

// The tree as it stands, so an amendment pattern's breadth is measured rather than guessed.
// `.git` is skipped for the obvious reason; `node_modules` because this repository has no
// dependencies and an amendment can never legitimately reach into one.
async function repositoryFileList(root = '.') {
  const files = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const path = `${directory === '.' ? '' : `${directory}/`}${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  await walk(root);
  return files;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const directory = process.argv[2] ?? 'work-packages';
  try {
    await validateWorkPackageOwnership(directory);
  } catch (error) {
    console.error(error.message);
    process.exit(error.code ?? 65);
  }
}
