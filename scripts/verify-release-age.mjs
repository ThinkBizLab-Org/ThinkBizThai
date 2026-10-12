import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import { A1_RECORD, ALLOWLIST_PATH, REGISTRY, loadAllowlist, nameOf } from './verify-app-dependencies.mjs';

// RFC-2026-029 §4.8: a version, direct or transitive, enters the lockfile only once it has been
// published on the registry for at least seven days; CI checks the publish time of every lockfile
// entry the pull request changes (§8/9). WP-1A-A0-002.
//
// It reads the registry, so it needs the network, and runs as its own CI step outside `npm run
// check`. It compares the pull request's package-lock.json with the base commit's and asks the
// registry for the publish time of every (name, version) that is new at the head -- added, or
// changed to another version. An entry the base already held is not asked about again. An `inBundle`
// entry has no publication of its own: it shipped inside its parent's tarball, whose own time is the
// one checked. A version younger than the allowlist's releaseAgeDays fails the step unless the
// allowlist's releaseAgeExceptions names it with an A1 record that the pull request itself adds or
// changes (§4.8: "admitted only with A1's recorded approval in that pull request"): the record must be
// an `evidence/<package>/a1-*.md` file, and `git diff --name-only --diff-filter=AM <base>...HEAD` must
// list it (A1-257-3, Q0-257-4). A file that merely exists in the tree, such as README.md, is not a
// record of that approval. releaseAgeDays itself is held to §4.8's "seven days" by
// compareAllowlistWithRfc in scripts/verify-app-dependencies.mjs.
//
// A registry it cannot read, a version with no publish time, or a time it cannot parse FAILS the
// step: a release age nobody measured is not a release age.
//
// The pure parts (what changed, the verdict) are exported and driven offline by
// test-kits/app-stack.test.mjs.

const DAY = 24 * 60 * 60 * 1000;

export function changedEntries(baseLock, headLock) {
  const before = new Set();
  for (const [key, entry] of Object.entries(baseLock?.packages ?? {})) {
    if (key.startsWith('node_modules/') && !entry.link) before.add(`${nameOf(key, entry)}@${entry.version}`);
  }
  const changed = new Map();
  for (const [key, entry] of Object.entries(headLock?.packages ?? {})) {
    if (!key.startsWith('node_modules/') || entry.link || entry.inBundle) continue;
    const id = `${nameOf(key, entry)}@${entry.version}`;
    if (!before.has(id)) changed.set(id, { name: nameOf(key, entry), version: entry.version, key });
  }
  return [...changed.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// `times`: Map of `name@version` -> ISO string (or undefined when the registry gave none).
// `changed`: the paths the pull request adds or modifies, against its base.
export function ageVerdict(entries, times, now, { days = 7, exceptions = [], changed = new Set() } = {}) {
  const problems = [];
  const excepted = new Map(exceptions.map((e) => [e.package, e]));
  for (const { name, version } of entries) {
    const id = `${name}@${version}`;
    const published = Date.parse(times.get(id) ?? '');
    if (Number.isNaN(published)) { problems.push(`${id}: the registry gave no publish time this step could read`); continue; }
    const age = (now - published) / DAY;
    if (age >= days) continue;
    const exception = excepted.get(id);
    const record = exception?.a1_record;
    const isRecord = typeof record === 'string' && A1_RECORD.test(record);
    if (isRecord && changed.has(record)) continue;
    problems.push(`${id} was published ${new Date(published).toISOString()}, ${age.toFixed(1)} day(s) ago; RFC-2026-029 §4.8 admits a version after ${days} days`
      + (!exception ? ''
        : !isRecord ? ` (its exception names ${JSON.stringify(record)}, which is not an A1 record evidence/<package>/a1-*.md)`
          : ` (its exception names ${JSON.stringify(record)}, which this pull request does not add or change)`));
  }
  return problems;
}

async function publishTimes(entries) {
  const byName = new Map();
  for (const { name } of entries) byName.set(name, null);
  const times = new Map();
  const names = [...byName.keys()];
  const failures = [];
  const worker = async () => {
    while (names.length > 0) {
      const name = names.shift();
      try {
        const response = await fetch(`${REGISTRY}${name.replace('/', '%2F')}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const document = await response.json();
        for (const entry of entries.filter((e) => e.name === name)) times.set(`${name}@${entry.version}`, document.time?.[entry.version]);
      } catch (error) {
        failures.push(`${name}: the registry could not be read (${error.message})`);
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return { times, failures };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const base = process.argv[2];
  if (!base) { console.error('usage: node scripts/verify-release-age.mjs <base-commit>'); process.exit(2); }
  let baseLock = { packages: {} };
  try {
    baseLock = JSON.parse(execFileSync('git', ['show', `${base}:package-lock.json`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch (error) {
    console.error(`release age: the base ${base} has no readable package-lock.json (${error.message.split('\n')[0]}); every entry is checked`);
  }
  const headLock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const entries = changedEntries(baseLock, headLock);
  if (entries.length === 0) {
    console.log(`release age: no lockfile entry is new against ${base}; nothing to ask the registry`);
    process.exit(0);
  }
  const allowlist = await loadAllowlist(ALLOWLIST_PATH);
  const exceptions = allowlist.releaseAgeExceptions ?? [];
  let changed = new Set();
  if (exceptions.length > 0) {
    try {
      changed = new Set(execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', `${base}...HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean));
    } catch (error) {
      console.error(`release age: the paths this pull request changes against ${base} could not be read (${error.message.split('\n')[0]}); no exception is admitted`);
    }
  }
  const { times, failures } = await publishTimes(entries);
  const problems = [...failures, ...ageVerdict(entries, times, Date.now(), { days: allowlist.releaseAgeDays, exceptions, changed })];
  if (problems.length > 0) {
    console.error(`release age: ${problems.length} problem(s) among ${entries.length} new lockfile entr${entries.length === 1 ? 'y' : 'ies'}`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const newest = [...times.entries()].sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))[0];
  console.log(`release age: all ${entries.length} new lockfile entries were published at least ${allowlist.releaseAgeDays} days ago (newest ${newest[0]} at ${newest[1]})`);
}
