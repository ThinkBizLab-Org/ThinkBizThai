import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { validateManifestPath } from './validate-work-package-role-separation.mjs';

async function findJsonManifests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return findJsonManifests(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  }));
  return nested.flat();
}

const directory = process.argv[2] ?? 'work-packages';
const manifests = await findJsonManifests(directory);
if (manifests.length === 0) {
  console.error(`no JSON work-package manifests found in ${directory}`);
  process.exit(69);
}

let exitCode = 0;
for (const manifest of manifests.sort()) {
  try {
    await validateManifestPath(manifest);
  } catch (error) {
    console.error(`${manifest}: ${error.message}`);
    exitCode = error.code ?? 65;
  }
}
process.exit(exitCode);
