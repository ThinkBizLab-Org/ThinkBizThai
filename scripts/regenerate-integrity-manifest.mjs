import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import { TEST_ROOTS } from './test-suite-contract.mjs';

// Four places in this repository tell someone to "rebuild the digests" and none of them said
// how, because there was no command. Every rebuild so far was an inline script written from
// memory at the moment it was needed -- during a rebase, under a conflict, which is exactly when
// an improvised script is least trustworthy.
//
// The manifest conflicts by construction: every package adds digests to the same file. It is
// generated, so on a conflict it is rebuilt rather than merged, and this is the tool that does
// it.
export const MANIFEST_PATH = 'test-kits/integrity-manifest.json';

async function discoverTestFiles(root) {
  const found = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && path.endsWith('.test.mjs')) found.push(path);
    }
  };
  await walk(root);
  return found.sort();
}

const digest = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

// A file the manifest names but that no longer exists is dropped; a test file that exists but is
// not named is added. Everything else keeps its place -- this rebuilds the digests, it does not
// decide what deserves one.
export async function rebuild(manifest, discovered) {
  const files = {};
  const dropped = [];
  for (const path of Object.keys(manifest.files ?? {})) {
    try {
      await stat(path);
      files[path] = await digest(path);
    } catch {
      dropped.push(path);
    }
  }
  const added = [];
  for (const path of discovered) {
    if (files[path] === undefined) added.push(path);
    files[path] = await digest(path);
  }
  const ordered = Object.fromEntries(Object.keys(files).sort().map((key) => [key, files[key]]));
  return { manifest: { ...manifest, files: ordered }, added, dropped };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  // Both roots. The runner globs `test-kits/**` and `tests/**`, and a manifest that walks only
  // the first would DROP every module test on the next regeneration — which the ratchet then
  // reports as protection being removed, correctly. Discovery here has to match discovery there,
  // or the two disagree about what exists.
  const discovered = (await Promise.all(TEST_ROOTS.map((root) => discoverTestFiles(root).catch(() => []))))
    .flat().sort();
  const { manifest: rebuilt, added, dropped } = await rebuild(manifest, discovered);
  await writeFile(MANIFEST_PATH, `${JSON.stringify(rebuilt, null, 2)}\n`);
  const count = Object.keys(rebuilt.files).length;
  console.log(`rebuilt ${count} digest(s)`);
  for (const path of added) console.log(`  + ${path} (discovered test file, was not digested)`);
  for (const path of dropped) console.log(`  - ${path} (named by the manifest but not on disk)`);
  if (added.length > 0 || dropped.length > 0) {
    console.log('Read those lines before committing: a file appearing or disappearing here is a change to what is protected, not a formatting update.');
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  await main();
}
