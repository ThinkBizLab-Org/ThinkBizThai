// THE RECORDS-ONLY CLASSIFIER AND THE MECHANICAL SYNC CHECK (RFC-2026-025 §6, PROPOSED 2026-10-07).
//
// Why it exists. RFC-2026-025 §5 item 5 says a test, not the Author's judgement, decides whether a PR is
// record-only, and "until item 5's mechanical check exists, no PR is treated as record-only". It did not exist, so
// every records transcription of 2026-10-06 (five of them) and every `main` sync (ten R0 sync readings and two carry
// readings that night) ran as if it changed code. §6 proposes a light path for both; this file is the check §6
// rests on. It is a classifier, not an approver: exit 0 says the diff is the SHAPE §6 names, and nothing about
// whether the records are true. The one independent reading §6(b) keeps is what reads that.
//
// It FAILS CLOSED. Anything it cannot classify -- a rename, a deletion, a mode change, a symlink, a manifest it
// cannot parse, a field it does not know, a git error -- makes the answer "not records-only" (exit 1) or a usage
// error (exit 2). Only exit 0 means records-only, and only for the diff it measured.
//
// Usage:
//   node scripts/db/classify-records-only.mjs [<base>=origin/main] [<head>=HEAD]
//       classifies the PR's own diff, merge-base(base, head)..head.
//   node scripts/db/classify-records-only.mjs --sync <pre-merge-tip> <merge> [<base>=origin/main]
//       checks that <merge> is a mechanical sync of <pre-merge-tip> with `main` (§6(c)).
//
// Node built-ins only (RFC-2026-001: no dependency).
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Generated files: rebuilt by their generator and compared, never merged by hand (§6(c)). They are NOT records:
// a records-only diff may not touch them, and a sync may conflict on them only.
export const GENERATED_PATHS = ['test-kits/integrity-manifest.json', 'evidence/VERIFICATION.md'];

// The manifest fields a records-only PR may change (§6(a)). Everything else in a work-package manifest must be
// byte-for-byte the same value (deep-equal after parsing).
export const MANIFEST_RECORD_FIELDS = ['status', 'open_blockers', 'required_human_authorities'];

const REGULAR = '100644';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isPlainObject(a)) {
    if (!isPlainObject(b)) return false;
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return deepEqual(ka, kb) && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

// An append-only list of strings: nothing removed, nothing reordered, nothing reworded. Each old entry is either
// unchanged or kept VERBATIM, whole, at the start (text appended) or at the end (a transcribed closing clause put in
// front of it, as `evidence/WP-0A-CON-003/records-transcription-2026-10-06.md` closed open_blockers[10]: the new
// entry ends with the old text after `Text as recorded: `). New entries may follow at the end.
export function appendOnlyStrings(field, before, after) {
  const reasons = [];
  if (before === undefined && after === undefined) return reasons;
  const old = before ?? [];
  if (!Array.isArray(old) || !old.every((s) => typeof s === 'string')) return [`${field}: the base value is not a list of strings`];
  if (!Array.isArray(after) || !after.every((s) => typeof s === 'string')) return [`${field}: the new value is not a list of strings`];
  if (after.length < old.length) return [`${field}: ${old.length - after.length} entr(y/ies) removed`];
  old.forEach((was, i) => {
    const now = after[i];
    if (now === was) return;
    if (was.length > 0 && (now.startsWith(was) || now.endsWith(was))) return;
    reasons.push(`${field}[${i}]: reworded (the old text is not kept whole at its start or end)`);
  });
  return reasons;
}

// ownership.amended_by: the only change admitted is an acknowledgement transcription -- the same entries, in the
// same order, each changing or adding only keys that begin with `acknowledg` (acknowledgement_status, and any
// acknowledgement record or date the acknowledging role names).
export function amendedByDelta(before, after) {
  if (deepEqual(before, after)) return [];
  if (!Array.isArray(before) || !Array.isArray(after)) return ['ownership.amended_by: changed shape (not a list on both sides)'];
  if (before.length !== after.length) return [`ownership.amended_by: ${after.length - before.length > 0 ? 'entries added' : 'entries removed'}`];
  const reasons = [];
  before.forEach((was, i) => {
    const now = after[i];
    if (!isPlainObject(was) || !isPlainObject(now)) { reasons.push(`ownership.amended_by[${i}]: not an object on both sides`); return; }
    for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
      if (deepEqual(was[key], now[key])) continue;
      if (!key.startsWith('acknowledg')) { reasons.push(`ownership.amended_by[${i}].${key}: changed`); continue; }
      if (now[key] === undefined) reasons.push(`ownership.amended_by[${i}].${key}: removed`);
    }
  });
  return reasons;
}

// ownership.amends_without_owning: a records increment may NARROW it -- drop paths the increment no longer amends --
// and restate its `rationale` for the increment it is. It may not add a path (that widens what the branch may touch)
// or change any other key.
export function amendsNarrowedOnly(before, after) {
  if (deepEqual(before, after)) return [];
  if (!isPlainObject(before) || !isPlainObject(after)) return ['ownership.amends_without_owning: not an object on both sides'];
  const reasons = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (deepEqual(before[key], after[key])) continue;
    if (key === 'rationale') {
      if (typeof after.rationale !== 'string') reasons.push('ownership.amends_without_owning.rationale: not a string');
      continue;
    }
    if (key === 'paths') {
      const was = before.paths;
      const now = after.paths;
      if (!Array.isArray(was) || !Array.isArray(now) || !now.every((p) => typeof p === 'string')) {
        reasons.push('ownership.amends_without_owning.paths: not a list of strings on both sides');
        continue;
      }
      const added = now.filter((p) => !was.includes(p));
      if (added.length > 0) reasons.push(`ownership.amends_without_owning.paths: widened by ${added.join(', ')}`);
      continue;
    }
    reasons.push(`ownership.amends_without_owning.${key}: changed`);
  }
  return reasons;
}

// One work-package manifest, before and after. Returns the reasons it is NOT a records change ([] = it is).
export function manifestDelta(beforeText, afterText) {
  let before;
  let after;
  try { before = JSON.parse(beforeText); } catch { return ['the base manifest does not parse as JSON']; }
  try { after = JSON.parse(afterText); } catch { return ['the new manifest does not parse as JSON']; }
  if (!isPlainObject(before) || !isPlainObject(after)) return ['the manifest is not a JSON object on both sides'];
  const reasons = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (deepEqual(before[key], after[key])) continue;
    if (key === 'status') {
      if (typeof after.status !== 'string') reasons.push('status: not a string');
      continue;
    }
    if (key === 'open_blockers' || key === 'required_human_authorities') {
      reasons.push(...appendOnlyStrings(key, before[key], after[key]));
      continue;
    }
    if (key === 'ownership') {
      const ob = before.ownership;
      const oa = after.ownership;
      if (!isPlainObject(ob) || !isPlainObject(oa)) { reasons.push('ownership: not an object on both sides'); continue; }
      for (const k of new Set([...Object.keys(ob), ...Object.keys(oa)])) {
        if (deepEqual(ob[k], oa[k])) continue;
        if (k === 'amended_by') reasons.push(...amendedByDelta(ob[k], oa[k]));
        else if (k === 'amends_without_owning') reasons.push(...amendsNarrowedOnly(ob[k], oa[k]));
        else reasons.push(`ownership.${k}: changed`);
      }
      continue;
    }
    reasons.push(`${key}: changed`);
  }
  return reasons;
}

const isWorkPackageManifest = (path) => /^work-packages\/[^/]+\.json$/.test(path);

// One changed path, as `git diff --raw` reports it. `text` reads a blob by id. Returns the reasons it is NOT a
// records change ([] = it is).
export function classifyChange(change, text) {
  const { status, path, oldMode, newMode, oldBlob, newBlob } = change;
  if (status !== 'A' && status !== 'M') return [`${path}: status ${status} (only an addition or a modification is a record)`];
  if (newMode !== REGULAR || (status === 'M' && oldMode !== REGULAR)) return [`${path}: mode ${oldMode} -> ${newMode} (only a regular, non-executable file)`];
  if (GENERATED_PATHS.includes(path)) return [`${path}: a generated file, not a record`];
  if (path.startsWith('evidence/') && path.split('/').length >= 3) {
    if (status === 'A') return [];
    // An existing record is appended to, never rewritten: a role's verdict or an Owner's transcribed words cannot be
    // edited on the light path.
    return text(newBlob).startsWith(text(oldBlob)) ? [] : [`${path}: an existing evidence file rewritten, not appended to`];
  }
  if (path.startsWith('handoffs/') && path.endsWith('.json') && path.split('/').length === 2) return [];
  if (isWorkPackageManifest(path)) {
    if (status !== 'M') return [`${path}: a new work-package manifest is not a record`];
    return manifestDelta(text(oldBlob), text(newBlob)).map((r) => `${path}: ${r}`);
  }
  return [`${path}: outside evidence/<package>/**, handoffs/*.json and work-packages/*.json`];
}

// The whole diff. Returns { recordsOnly, reasons, paths }.
export function classifyDiff(changes, text) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return { recordsOnly: false, reasons: ['an empty diff is not classified (nothing to merge on the light path)'], paths: [] };
  }
  const reasons = changes.flatMap((c) => classifyChange(c, text));
  return { recordsOnly: reasons.length === 0, reasons, paths: changes.map((c) => c.path) };
}

// `git diff --raw -z --no-abbrev` output: ":<oldmode> <newmode> <oldsha> <newsha> <status>\0<path>\0" per entry.
// Copies and renames carry two paths; --no-renames is always passed, and an R or C entry is still parsed and refused.
export function parseRawDiff(raw) {
  const parts = raw.split('\0');
  const changes = [];
  let i = 0;
  while (i < parts.length) {
    const head = parts[i];
    if (head === '') { i += 1; continue; }
    const m = /^:(\d{6}) (\d{6}) ([0-9a-f]{40,64}) ([0-9a-f]{40,64}) ([A-Z])(\d*)$/.exec(head);
    if (!m) throw new Error(`unparsed raw diff entry: ${JSON.stringify(head)}`);
    const status = m[5];
    const path = parts[i + 1];
    if (path === undefined) throw new Error('raw diff entry without a path');
    const twoPaths = status === 'R' || status === 'C';
    changes.push({ oldMode: m[1], newMode: m[2], oldBlob: m[3], newBlob: m[4], status, path: twoPaths ? `${path} -> ${parts[i + 2]}` : path });
    i += twoPaths ? 3 : 2;
  }
  return changes;
}

// §6(c): is <merge> a mechanical sync of <tip> with `main`? `names(a, b)` lists the paths that differ between two
// commits; `same(a, b, paths)` says whether the two commits hold the same content at every one of those paths.
// Returns { mechanical, reasons, generatedTouched }.
export function syncDelta({ parents, tip, prPaths, mainPaths, mergeVsMain, mergeVsTip, samePrPaths, sameMainPaths }) {
  const reasons = [];
  if (!Array.isArray(parents) || parents.length !== 2) reasons.push(`the merge has ${parents?.length ?? 0} parent(s), not 2`);
  else if (parents[0] !== tip) reasons.push(`the merge's first parent ${parents[0]} is not the PR tip ${tip}`);
  const gen = new Set(GENERATED_PATHS);
  const pr = new Set(prPaths);
  const main = new Set(mainPaths);
  const overlap = [...pr].filter((p) => main.has(p) && !gen.has(p)).sort();
  if (overlap.length > 0) reasons.push(`main changed the PR's own path(s): ${overlap.join(', ')}`);
  if (!samePrPaths) reasons.push("the merge changed the PR's own paths (they differ from the PR tip)");
  if (!sameMainPaths) reasons.push("the merge changed main's paths (they differ from the main commit merged)");
  const strayVsMain = mergeVsMain.filter((p) => !pr.has(p) && !gen.has(p)).sort();
  if (strayVsMain.length > 0) reasons.push(`the merge holds path(s) neither the PR nor main changed: ${strayVsMain.join(', ')}`);
  const strayVsTip = mergeVsTip.filter((p) => !main.has(p) && !gen.has(p)).sort();
  if (strayVsTip.length > 0) reasons.push(`the merge differs from the PR tip at path(s) main did not change: ${strayVsTip.join(', ')}`);
  const generatedTouched = [...gen].filter((p) => pr.has(p) || main.has(p) || mergeVsMain.includes(p)).sort();
  return { mechanical: reasons.length === 0, reasons, generatedTouched };
}

// ---- the git side ---------------------------------------------------------------------------------------------

const git = (args) => execFileSync('git', args, {
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
  env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const rev = (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();
const names = (a, b) => git(['diff', '--no-renames', '--no-ext-diff', '--name-only', '-z', a, b]).split('\0').filter(Boolean);
const same = (a, b, paths) => {
  if (paths.length === 0) return true;
  try { git(['diff', '--no-renames', '--no-ext-diff', '--quiet', a, b, '--', ...paths]); return true; } catch { return false; }
};

export function classifyRange(base, head) {
  const b = rev(base);
  const h = rev(head);
  const mb = git(['merge-base', b, h]).trim();
  const raw = git(['diff', '--raw', '-z', '--no-abbrev', '--no-renames', '--no-ext-diff', mb, h]);
  const text = (blob) => git(['cat-file', 'blob', blob]);
  return { mergeBase: mb, head: h, ...classifyDiff(parseRawDiff(raw), text) };
}

export function checkSync(tip, merge, base) {
  const t = rev(tip);
  const m = rev(merge);
  rev(base);
  const parents = git(['rev-list', '--parents', '-n', '1', m]).trim().split(' ').slice(1);
  if (parents.length !== 2) return syncDelta({ parents, tip: t, prPaths: [], mainPaths: [], mergeVsMain: [], mergeVsTip: [], samePrPaths: true, sameMainPaths: true });
  const x = parents[1];
  let reach = true;
  try { git(['merge-base', '--is-ancestor', x, rev(base)]); } catch { reach = false; }
  const o = git(['merge-base', t, x]).trim();
  const prPaths = names(o, t);
  const mainPaths = names(o, x);
  const gen = new Set(GENERATED_PATHS);
  const result = syncDelta({
    parents, tip: t, prPaths, mainPaths,
    mergeVsMain: names(x, m),
    mergeVsTip: names(t, m),
    samePrPaths: same(t, m, prPaths.filter((p) => !gen.has(p) && !mainPaths.includes(p))),
    sameMainPaths: same(x, m, mainPaths.filter((p) => !gen.has(p) && !prPaths.includes(p))),
  });
  if (!reach) { result.reasons.push(`the commit merged in, ${x}, is not on ${base}`); result.mechanical = false; }
  return { ...result, mergedMain: x, oldBranchPoint: o };
}

function main(argv) {
  if (argv[0] === '--sync') {
    const [, tip, merge, base = 'origin/main'] = argv;
    if (!tip || !merge) { console.error('usage: classify-records-only.mjs --sync <pre-merge-tip> <merge> [<base>]'); return 2; }
    const r = checkSync(tip, merge, base);
    if (!r.mechanical) {
      console.log(`NOT a mechanical sync:\n  ${r.reasons.join('\n  ')}`);
      return 1;
    }
    console.log(`mechanical sync: ${merge} = ${tip} + ${r.mergedMain} (old branch point ${r.oldBranchPoint}); no conflict inside the PR's own paths.`);
    if (r.generatedTouched.length > 0) {
      console.log(`  generated file(s) involved: ${r.generatedTouched.join(', ')} -- regenerate (npm run regenerate:manifest, npm run record:verification) and cmp; a difference is not mechanical.`);
    }
    return 0;
  }
  const [base = 'origin/main', head = 'HEAD'] = argv;
  const r = classifyRange(base, head);
  if (!r.recordsOnly) {
    console.log(`NOT records-only (${r.paths.length} path(s), ${r.mergeBase.slice(0, 7)}..${r.head.slice(0, 7)}):\n  ${r.reasons.join('\n  ')}`);
    return 1;
  }
  console.log(`records-only: all ${r.paths.length} changed path(s) are records (${r.mergeBase.slice(0, 7)}..${r.head.slice(0, 7)}).`);
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`classify-records-only: ${error.message.split('\n')[0]} -- not classified (fail closed).`);
    process.exitCode = 2;
  }
}
