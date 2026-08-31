import { readFile, readdir } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A green `npm run check` must never mean "executed nothing".
// `node --test <pattern>` exits 0 with `tests 0` when the pattern matches no file,
// so a rename, relocation, or a shell that does not strip the quotes would report
// success having run no test at all. This guard fails the run instead.
const DEFAULT_FLOOR = 8;

export class CoverageFloorError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function globToRegExp(pattern) {
  let expression = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        // `**/` spans zero or more directory segments; a bare `**` spans any suffix.
        if (pattern[index + 2] === '/') {
          expression += '(?:[^/]+/)*';
          index += 2;
        } else {
          expression += '.*';
          index += 1;
        }
      } else {
        expression += '[^/]*';
      }
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${expression}$`);
}

export function extractTestPattern(testScript) {
  const match = /--test\s+'([^']+)'/.exec(testScript ?? '');
  if (!match) {
    throw new CoverageFloorError(74, `test:bootstrap must invoke node --test with a single-quoted pattern; found: ${String(testScript)}`);
  }
  return match[1];
}

export async function discoverTestFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverTestFiles(entryPath, root);
    return entry.isFile() && entry.name.endsWith('.test.mjs') ? [entryPath] : [];
  }));
  return nested.flat().sort();
}

export function assertCoverage(pattern, files, floor = DEFAULT_FLOOR) {
  if (files.length < floor) {
    throw new CoverageFloorError(75, `expected at least ${floor} test files under test-kits/, found ${files.length}. A green run that executes nothing is the defect this guard exists to prevent.`);
  }
  const matcher = globToRegExp(pattern);
  const unmatched = files.filter((file) => !matcher.test(posix.normalize(file.split('\\').join('/'))));
  if (unmatched.length > 0) {
    throw new CoverageFloorError(76, `test:bootstrap pattern '${pattern}' does not match ${unmatched.length} discovered test file(s): ${unmatched.join(', ')}. These would silently never run.`);
  }
  const directories = new Set(files.map((file) => file.split('/').slice(0, -1).join('/')));
  if (directories.size < 2) {
    throw new CoverageFloorError(77, `expected test files in at least two directories under test-kits/, found only: ${[...directories].join(', ')}. A pattern that stops descending into subdirectories is the WP-0A-A0-002 defect class.`);
  }
}

export async function verifyTestCoverageFloor(packageJsonPath = 'package.json', testDirectory = 'test-kits', floor = DEFAULT_FLOOR) {
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const pattern = extractTestPattern(manifest.scripts?.['test:bootstrap']);
  const files = await discoverTestFiles(testDirectory);
  assertCoverage(pattern, files, floor);
  return { pattern, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await verifyTestCoverageFloor();
  } catch (error) {
    console.error(error.message);
    process.exit(error.code ?? 65);
  }
}
