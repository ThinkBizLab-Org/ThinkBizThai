import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function validateManifestOwnership(manifests) {
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

    for (const output of outputFiles) {
      if (!isRepositoryRelativePath(output, { allowGlobs: false })) {
        throw new OwnershipValidationError(67, `work package ${label} output must be an exact file path: ${String(output)}`);
      }
      if (!matchesAny(output, writablePaths)) {
        throw new OwnershipValidationError(68, `work package ${label} output is outside writable_paths: ${output}`);
      }
      if (matchesAny(output, readOnlyPaths)) {
        throw new OwnershipValidationError(69, `work package ${label} output matches read_only_paths: ${output}`);
      }
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
  validateManifestOwnership(manifests);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ?? 'work-packages';
  try {
    await validateWorkPackageOwnership(directory);
  } catch (error) {
    console.error(error.message);
    process.exit(error.code ?? 65);
  }
}
