#!/usr/bin/env node
// ============================================================================================
// WHAT THIS VALIDATES, AND WHAT IT CANNOT. READ THIS BEFORE TREATING EXIT 0 AS COVERAGE.
//
// This script validates PRESENCE. For every metric that names a contract, it resolves each
// declared dotted field path against that contract's committed schema, and it checks a set of
// declared invariants about the dictionary itself.
//
// IT CANNOT VALIDATE AN ABSENCE CLAIM, AND IT NEVER COULD. A metric marked `absent` says that
// something exists in no contract. There is nothing for this script to resolve, so the entry is
// exempted from every check here by construction -- and an `absent` verdict is the
// HIGHEST-CONSEQUENCE claim in the dictionary, because it generates a request to another
// contract's owner. That exemption is how a false one shipped on a green run: the withdrawn
// increment asserted three times that CTR-EVT-001 could carry no step identifier, and a
// step-identifying event validates against it unmodified. Exit 0 from this script said nothing
// about that, and could not have.
//
// The absence claims are executed separately, by constructing documents and running them
// through the repository's own validator:
//
//     node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs
//
// BOTH commands must pass. Neither alone is coverage of the dictionary, and neither reaches the
// Product Owner's questions under OPEN-016: whether these are the right fourteen metrics,
// whether a formula means what its definition says, and every target.
//
// ============================================================================================
// WHAT WAS ADDED AFTER INDEPENDENT REVIEW, each closing a demonstrated hole:
//
//  1. A metric with a non-`absent` status that declares ZERO fields used to pass vacuously --
//     nothing to resolve, no problem reported. It now fails.
//  2. The resolved-path count is PINNED. A count that only ever gets printed cannot notice a
//     metric quietly losing a field: every path it still declares still resolves, and the run
//     stays green while the dictionary says less than it did.
//  3. A budget line marked `enforced` now has its NUMBER compared to the schema enum's length.
//     The old check compared only the `enforced` flag to whether the schema closed the values,
//     so `max_distinct_values: 99` against `enum(4)` printed both numbers and reported no
//     problems.
//  4. An UNRESOLVABLE $ref is reported as its own reason. It used to collapse into "this field
//     does not exist", which is a guard giving the wrong reason -- the field may exist perfectly
//     well behind a reference this script cannot follow.
//  5. A field NAMED in a formula or a population but not DECLARED in `source.fields` now fails.
//     That is how C-03 shipped naming `occurred_at` in its window and omitting it from its
//     sources -- the one such case in fourteen, and precisely the class this script was blind to.
//     A path that appears only in explanatory prose is declared in `fields_mentioned_not_read`,
//     which must itself resolve, so the escape hatch cannot hide a typo.
//  6. Every metric's `population` block, where it has one, is checked for all three axes C2
//     requires: supersession, dedupe and restatement.
//
// ============================================================================================
// WHAT THIS STILL DOES NOT CATCH. Found by independent testing, ruled non-blocking, and written
// here rather than left for the next author to rediscover. Each is a hole in THIS script, not a
// defect in the dictionary, and each is a smaller version of the mistake that produced the last
// increment: a check that looks like coverage from the outside.
//
//  A. `source.status` IS NEVER CHECKED AGAINST `source_status_vocabulary`. A metric whose status
//     reads `obviously_derivable` -- a word the dictionary defines nowhere -- exits 0. This is
//     the one to close first: the three defined statuses ROUTE work (`absent` to a contract
//     owner, `derivable_with_caveat` to A6), so a status outside the vocabulary routes nothing
//     and nothing says so. Close it against Object.keys(source_status_vocabulary) MINUS
//     `vocabulary_amendment_note`, which is prose living in that object.
//  B. THE FIELD/FORMULA CHECK RUNS ONE WAY ONLY. It fails when a formula NAMES a field the entry
//     does not declare; it never fails when an entry DECLARES a field its formula does not name,
//     so a formula gutted to one word passes with seven declared fields. And a token that does
//     not resolve is treated as prose -- so if C-03's defect had been a MISSPELLING of
//     `occurred_at` instead of an omission, hole 5 as built would have missed it, because a
//     misspelling and an English word are indistinguishable to this check. The backtick
//     convention below could carry that distinction and does not yet.
//  C. THE PIN IS A COUNT, NOT A CHECKSUM. A compensating pair -- one citation removed, one added
//     -- keeps the total at 63 and stays green. A digest of the sorted field list would close it.
//
// And one branch here is closed by inspection and NOT by execution: `unresolvedRef` fires only
// for a `$ref` this script cannot follow, and every `$ref` in the shared kernel is the followable
// sibling form, so no mutation available to this package reaches it without a schema edit that
// this package must not make.
//
// Read-only. It parses committed schemas and the dictionary; it writes nothing and calls nothing.
// Usage: node evidence/WP-0A-A6-001/verify-source-fields.mjs   (from the repository root)
import { readFile, readdir } from 'node:fs/promises';

const DICTIONARY = 'evidence/WP-0A-A6-001/product-kpi-metric-dictionary.json';
const CATALOG = 'contract-catalog/shared-kernel';

// PINNED. Change this only when a field is deliberately added to or removed from the dictionary,
// and say which entry moved in the same change. See note 2 in the header.
const EXPECTED_RESOLVED_PATHS = 63;

const schemaPathFor = (contractId) => `${CATALOG}/${contractId.toLowerCase()}/schema.json`;

// Every shared-kernel schema, keyed by its own directory name, so a `$ref` can be followed
// without a resolver library. Only the sibling form this catalog actually uses --
// `../ctr-xxx-nnn/schema.json` -- is followed; anything else is reported rather than silently
// treated as resolved.
const byContract = new Map();
for (const entry of await readdir(CATALOG, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  byContract.set(entry.name, JSON.parse(await readFile(`${CATALOG}/${entry.name}/schema.json`, 'utf8')));
}

function deref(node) {
  let current = node;
  for (let hops = 0; current?.$ref !== undefined && hops < 8; hops += 1) {
    const sibling = /^\.\.\/([a-z0-9-]+)\/schema\.json$/.exec(current.$ref);
    if (sibling === null) return { node: null, unresolvedRef: current.$ref };
    const target = byContract.get(sibling[1]);
    if (target === undefined) return { node: null, unresolvedRef: current.$ref };
    current = target;
  }
  return { node: current, unresolvedRef: null };
}

// Resolve a dotted path through `properties`, stepping into `items` for an array segment and
// through `$ref` for a cross-contract envelope. Returns which of the two failure modes occurred,
// because "I could not follow a reference" and "this field is not there" are different findings
// and reporting the second for the first is how a guard sends a reader to the wrong file.
function resolve(schema, dotted) {
  let node = schema;
  for (const segment of dotted.split('.')) {
    const followed = deref(node);
    if (followed.node === null) return { node: null, unresolvedRef: followed.unresolvedRef };
    node = followed.node;
    if (node?.type === 'array' || node?.items) node = node.items;
    const next = node?.properties?.[segment];
    if (next === undefined) return { node: null, unresolvedRef: null };
    node = next;
  }
  const followed = deref(node);
  return { node: followed.node ?? node, unresolvedRef: followed.unresolvedRef };
}

const describe = (node) => {
  if (node === null) return 'MISSING';
  if (Array.isArray(node.enum)) return `enum(${node.enum.length}): ${node.enum.join('|')}`;
  if (node.$ref) return `$ref ${node.$ref}`;
  return node.type ?? 'untyped';
};

// A dotted lower-case token is the only thing that can be a field path in this catalog, so
// anything else in a formula string is prose and is not offered to the resolver.
//
// TWO EXTRACTION RULES, and the difference is deliberate rather than a convenience.
//
//   `formula` values are terse expressions -- `count(... where dimension == "publish_operation")`
//   -- where a bare property name IS a field reference. EVERY token is offered to the resolver,
//   which is what catches the C-03 case: its window read `calendar month on occurred_at, UTC`,
//   with no backticks and no dots, and `occurred_at` was undeclared.
//
//   `population` values are prose paragraphs, and several CTR-USG-001 property names are also
//   ordinary English words -- `cost`, `attribution`, `dimension`, `quantity`. Offering every
//   token there reports "a record's cost" as an undeclared field citation, which is a guard
//   crying wolf until a reader stops reading it. Only BACKTICKED tokens count in prose. That is
//   a convention this dictionary already follows for every genuine field reference, and it is
//   stated here as a rule so a future author knows a backtick is load-bearing.
const FIELD_PATH_RE = /\b[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*\b/g;
const BACKTICKED = /`([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)`/g;
const tokensIn = (value, { backtickedOnly = false } = {}) => {
  const out = new Set();
  const walk = (v) => {
    if (typeof v === 'string') {
      if (backtickedOnly) for (const m of v.matchAll(BACKTICKED)) out.add(m[1]);
      else for (const m of v.match(FIELD_PATH_RE) ?? []) out.add(m);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(value);
  return out;
};

const dictionary = JSON.parse(await readFile(DICTIONARY, 'utf8'));
const schemas = new Map();
const problems = [];
let resolved = 0;

for (const metric of dictionary.metrics) {
  const { contract, fields, status } = metric.source;

  if (status === 'absent') {
    if (contract !== null || fields.length > 0) {
      problems.push(`${metric.id} is declared absent but cites ${contract} ${JSON.stringify(fields)}`);
    } else {
      console.log(`${metric.id} ${metric.key}\n    absent — cites no contract, as an absent source must`);
      console.log('      NOT CHECKED HERE. An absence claim is not checkable by a presence checker; '
        + 'see population-and-carrier-probes.mjs');
    }
    continue;
  }
  if (contract === null) {
    problems.push(`${metric.id} has status ${status} and names no contract`);
    continue;
  }
  // Hole 1: a non-absent metric that declares nothing used to pass vacuously.
  if (fields.length === 0) {
    problems.push(`${metric.id} has status ${status} and declares NO fields. A metric that cites a `
      + 'contract and names no field in it makes a claim nothing can check.');
    continue;
  }
  if (!schemas.has(contract)) {
    schemas.set(contract, JSON.parse(await readFile(schemaPathFor(contract), 'utf8')));
  }
  const schema = schemas.get(contract);
  console.log(`${metric.id} ${metric.key}\n    ${contract} (${status})`);
  for (const field of fields) {
    const { node, unresolvedRef } = resolve(schema, field);
    // Hole 4: an unfollowable reference is its own finding, not a missing field.
    if (unresolvedRef !== null) {
      problems.push(`${metric.id} cites ${contract}.${field}, whose path crosses a $ref this script `
        + `cannot follow: '${unresolvedRef}'. The field may exist; the REFERENCE is what failed.`);
    } else if (node === null) {
      problems.push(`${metric.id} cites ${contract}.${field}, which does not exist in ${schemaPathFor(contract)}`);
    } else resolved += 1;
    console.log(`      ${field}: ${unresolvedRef !== null ? `UNRESOLVED $ref ${unresolvedRef}` : describe(node)}`);
  }

  // Hole 5: the fields a formula NAMES must be the fields it DECLARES.
  const declared = new Set([...fields, ...(metric.fields_mentioned_not_read ?? [])]);
  const named = new Set([
    ...tokensIn(metric.formula),
    ...tokensIn(metric.population ?? null, { backtickedOnly: true }),
  ]);
  for (const token of named) {
    if (declared.has(token)) continue;
    const { node, unresolvedRef } = resolve(schema, token);
    if (node === null && unresolvedRef === null) continue; // prose, not a field path
    problems.push(`${metric.id}'s formula or population names ${contract}.${token}, which resolves `
      + 'in that schema, and its source.fields does not declare it. Declare it, or list it in '
      + 'fields_mentioned_not_read if it is mentioned and not read.');
  }
  for (const mentioned of metric.fields_mentioned_not_read ?? []) {
    const { node } = resolve(schema, mentioned);
    if (node === null) problems.push(`${metric.id} lists ${contract}.${mentioned} in fields_mentioned_not_read and it does not resolve`);
    else if (!named.has(mentioned)) problems.push(`${metric.id} lists ${contract}.${mentioned} in fields_mentioned_not_read and mentions it nowhere`);
  }

  // Hole 6: C2's three axes, each stated or none of them counts as stated.
  if (metric.population !== undefined) {
    for (const axis of ['supersession', 'dedupe', 'restatement']) {
      if (typeof metric.population[axis] !== 'string' || metric.population[axis].trim().length === 0) {
        problems.push(`${metric.id} states a population and omits its ${axis} boundary`);
      }
    }
    console.log(`      population: dedupe + supersession + restatement all stated`);
  }
}

// The budget speaks about five labels by name. If CTR-OBS-001 renames or drops one, the budget
// silently describes a field nobody emits.
const obs = JSON.parse(await readFile(schemaPathFor('CTR-OBS-001'), 'utf8'));
console.log('\nCTR-OBS-001 sli_tags labels named by the cardinality budget:');
for (const line of dictionary.metric_label_cardinality_budget.budget) {
  const { node } = resolve(obs, `sli_tags.${line.label}`);
  if (node === null) problems.push(`the cardinality budget names sli_tags.${line.label}, which CTR-OBS-001 does not carry`);
  else resolved += 1;
  const closed = Array.isArray(node?.enum);
  console.log(`  sli_tags.${line.label}: ${describe(node)} — budget ${line.max_distinct_values}, `
    + `declared enforced=${line.enforced}, schema closes values=${closed}`);
  if (line.enforced !== closed) {
    problems.push(`the budget declares sli_tags.${line.label} enforced=${line.enforced} `
      + `while the schema ${closed ? 'closes' : 'does not close'} its values`);
  }
  // Hole 3: an enforced line's NUMBER must be the number the schema enforces. `enforced: true`
  // with a budget of 99 against enum(4) used to print both figures and report no problems.
  if (line.enforced && closed && line.max_distinct_values !== node.enum.length) {
    problems.push(`the budget declares sli_tags.${line.label} enforced with max_distinct_values `
      + `${line.max_distinct_values} while the schema closes it to ${node.enum.length} value(s). `
      + 'An enforced budget line states the number the schema actually enforces.');
  }
}

// The dependency the error_code line is blocked on, asserted rather than described.
const err = JSON.parse(await readFile(schemaPathFor('CTR-ERR-001'), 'utf8'));
const hasVocabulary = Array.isArray(err.properties?.code?.enum);
console.log(`\nCTR-ERR-001.code: ${describe(err.properties?.code)} — vocabulary present: ${hasVocabulary}`);
if (hasVocabulary) {
  problems.push('CTR-ERR-001.code now has a vocabulary; the error_code budget line says it cannot be closed until it does, and must be revisited');
}

// Every target null, checked here too so this one command is the whole target self-check.
const withTargets = dictionary.metrics.filter((m) => m.target !== null);
if (withTargets.length > 0) problems.push(`${withTargets.length} metric(s) carry a target value: ${withTargets.map((m) => m.id).join(', ')}`);
const unexplained = dictionary.metrics.filter((m) => typeof m.target_null_reason !== 'string' || m.target_null_reason.trim().length === 0);
if (unexplained.length > 0) problems.push(`${unexplained.length} metric(s) state no reason for a null target: ${unexplained.map((m) => m.id).join(', ')}`);

// Hole 2: a printed count notices nothing. A pinned one notices a field that quietly left.
if (resolved !== EXPECTED_RESOLVED_PATHS) {
  problems.push(`${resolved} field path(s) resolved, and this script pins ${EXPECTED_RESOLVED_PATHS}. `
    + 'Either a citation was added or removed, or one stopped resolving. Update the pin in the same '
    + 'change that moves the dictionary, and say which entry moved.');
}

console.log(`\n${dictionary.metrics.length} metric(s), ${resolved} field path(s) resolved against a committed schema `
  + `(pinned at ${EXPECTED_RESOLVED_PATHS}), `
  + `${dictionary.metrics.filter((m) => m.source.status === 'absent').length} recorded as having no source at all, `
  + `${dictionary.metrics.filter((m) => m.population !== undefined).length} carrying a stated population, `
  + `${dictionary.metrics.filter((m) => m.target === null).length} of ${dictionary.metrics.length} targets null.`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('no problems: every cited field exists, every formula names only fields it declares, every '
  + 'stated population covers all three axes, every absent metric cites nothing, every enforced budget '
  + 'line matches the number the schema enforces, and every target is null.');
console.log('NOT CHECKED: any absence claim. Run population-and-carrier-probes.mjs for those.');
