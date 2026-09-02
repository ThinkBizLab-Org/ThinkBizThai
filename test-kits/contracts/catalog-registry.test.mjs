import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

// A contract's STATUS, its OWNER and the list it must satisfy before it can be frozen are the
// three facts every gate decision in this repository rests on, and independent review found all
// three enforced by nothing.
//
// It set `ctr-sec-001` to `"Frozen"` and dropped **A1** as security co-owner of the
// secret-handle contract, and set two more Draft contracts to `"Frozen"` -- `npm run check`
// exited 0. It then emptied `CTR-MOD-001`'s `required_before_freeze` in the catalog index,
// which is the exact list RFC-2026-010 assesses each contract against, making any contract
// vacuously freeze-ready -- exit 0 again.
//
// `WP-0A-CON-008`'s own scope says it excludes "any change to a contract status, in a manifest,
// in the catalog index or in the Decision Register". Nothing enforced that exclusion, including
// against this package.
//
// So the registry is pinned. A promotion, a co-owner change or a freeze-requirement edit is a
// deliberate act and must be an edit here, in a diff a reviewer reads -- which is exactly what
// RFC-2026-010 asks the Product Owner and A1 and A6 to perform.
const CATALOG = 'contract-catalog/shared-kernel';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

// The only levels the Decision Register defines. Anything else is not a status.
const FREEZE_LEVELS = ['Draft', 'Candidate'];

const CATALOG_REGISTRY = {
  'ctr-api-001': {
    contract_id: "CTR-API-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0",
    index_owner: "A0",
    index_status: "Candidate",
    required_before_freeze: ["success/error examples","correlation","auth rules"],
    consumers: ["BFF","application modules"],
  },
  'ctr-aud-001': {
    contract_id: "CTR-AUD-001",
    version: "1.0.0",
    status: "Draft",
    owner: "A0+A6",
    index_owner: "A0+A6",
    index_status: "Draft",
    required_before_freeze: ["actor/scope/action/reason/ref/redaction"],
    consumers: ["security","admin","external actions"],
  },
  'ctr-err-001': {
    contract_id: "CTR-ERR-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0",
    index_owner: "A0",
    index_status: "Candidate",
    required_before_freeze: ["taxonomy","retry class","safe detail","Thai mapping key"],
    consumers: ["all modules","UI"],
  },
  'ctr-evt-001': {
    contract_id: "CTR-EVT-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0",
    index_owner: "A0",
    index_status: "Candidate",
    required_before_freeze: ["version/name/tenant/trace/subject fixtures"],
    consumers: ["all event producer/consumer"],
  },
  'ctr-flg-001': {
    contract_id: "CTR-FLG-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0",
    index_owner: "A0",
    index_status: "Candidate",
    required_before_freeze: ["platform→plan→workspace→business precedence"],
    consumers: ["router","UI","jobs","modules"],
  },
  'ctr-idm-001': {
    contract_id: "CTR-IDM-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0",
    index_owner: "A0",
    index_status: "Candidate",
    required_before_freeze: ["scope","payload hash","conflict/replay examples"],
    consumers: ["create","generate","upload","schedule","connect"],
  },
  'ctr-job-001': {
    contract_id: "CTR-JOB-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0",
    index_owner: "A0",
    index_status: "Candidate",
    required_before_freeze: ["lifecycle","retry","lease","progress","cancel fixtures"],
    consumers: ["Research","AI","Media","Publish","Metrics"],
  },
  'ctr-mod-001': {
    contract_id: "CTR-MOD-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0",
    index_owner: "A0",
    index_status: "Candidate",
    required_before_freeze: ["capabilities","dependencies","health","flags","owner"],
    consumers: ["composition root","all modules"],
  },
  'ctr-ntf-001': {
    contract_id: "CTR-NTF-001",
    version: "1.0.0",
    status: "Draft",
    owner: "A5",
    index_owner: "A5",
    index_status: "Draft",
    required_before_freeze: ["locale","dedupe","permission-checked deep link"],
    consumers: ["Job","UI","Email adapter"],
  },
  'ctr-obs-001': {
    contract_id: "CTR-OBS-001",
    version: "1.0.0",
    status: "Draft",
    owner: "A0+A6",
    index_owner: "A0+A6",
    index_status: "Draft",
    required_before_freeze: ["propagation","SLI tags","bounded cardinality"],
    consumers: ["all runtime modules"],
  },
  'ctr-pag-001': {
    contract_id: "CTR-PAG-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0",
    index_owner: "A0",
    index_status: "Candidate",
    required_before_freeze: ["opaque cursor fixture","stable ordering tests"],
    consumers: ["list APIs","UI"],
  },
  'ctr-sec-001': {
    contract_id: "CTR-SEC-001",
    version: "1.0.0",
    status: "Draft",
    owner: "A0+A1",
    index_owner: "A0+A1",
    index_status: "Draft",
    required_before_freeze: ["opaque ref","scope","rotation/revoke","redaction tests"],
    consumers: ["AI","Meta","Notification","Storage adapters"],
  },
  'ctr-ten-001': {
    contract_id: "CTR-TEN-001",
    version: "1.0.0",
    status: "Candidate",
    owner: "A0+A1",
    index_owner: "A0+A1",
    index_status: "Candidate",
    required_before_freeze: ["schema","valid/invalid fixtures","scope matrix"],
    consumers: ["all modules","API","Job","Event"],
  },
  'ctr-usg-001': {
    contract_id: "CTR-USG-001",
    version: "1.0.0",
    status: "Draft",
    owner: "A0+A6",
    index_owner: "A0+A6",
    index_status: "Draft",
    required_before_freeze: ["dimensions","attribution","decimal money","dedupe"],
    consumers: ["AI","Research","Storage","Media","Publish","Billing"],
  },
};
test('every contract states a freeze level the Decision Register defines', async () => {
  const wrong = [];
  for (const [dir, pinned] of Object.entries(CATALOG_REGISTRY)) {
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    if (!FREEZE_LEVELS.includes(manifest.status)) {
      wrong.push(`${dir} — status "${manifest.status}" is not one of ${FREEZE_LEVELS.join(', ')}`);
    }
    if (manifest.status !== pinned.status) {
      wrong.push(`${dir} — status is "${manifest.status}", pinned as "${pinned.status}". A promotion is the owner's decision and the Product Owner's approval; see RFC-2026-010.`);
    }
  }
  assert.deepEqual(wrong, [], `contract freeze level(s) changed without being recorded:\n  ${wrong.join('\n  ')}`);
});

test('no contract loses or gains an owner without the change being recorded', async () => {
  const wrong = [];
  for (const [dir, pinned] of Object.entries(CATALOG_REGISTRY)) {
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    if (manifest.owner !== pinned.owner) {
      wrong.push(`${dir} — owner is "${manifest.owner}", pinned as "${pinned.owner}". Dropping a co-owner removes a required sign-off.`);
    }
    if (manifest.contract_id !== pinned.contract_id || manifest.version !== pinned.version) {
      wrong.push(`${dir} — identity is ${manifest.contract_id}@${manifest.version}, pinned as ${pinned.contract_id}@${pinned.version}`);
    }
  }
  assert.deepEqual(wrong, [], `contract ownership or identity changed without being recorded:\n  ${wrong.join('\n  ')}`);
});

test('the catalog index agrees with the manifests and keeps its freeze requirements', async () => {
  const index = await readJson(join(CATALOG, 'index.json'));
  const wrong = [];
  const seen = new Set();
  for (const entry of index.contracts) {
    const dir = entry.id.toLowerCase();
    const pinned = CATALOG_REGISTRY[dir];
    if (!pinned) { wrong.push(`${entry.id} — in the index but not in the pinned registry`); continue; }
    seen.add(dir);
    if (entry.owner !== pinned.index_owner) wrong.push(`${entry.id} — index owner "${entry.owner}", pinned "${pinned.index_owner}"`);
    if (entry.status !== pinned.index_status) wrong.push(`${entry.id} — index status "${entry.status}", pinned "${pinned.index_status}"`);
    if (JSON.stringify(entry.required_before_freeze) !== JSON.stringify(pinned.required_before_freeze)) {
      wrong.push(`${entry.id} — required_before_freeze is ${JSON.stringify(entry.required_before_freeze)}, pinned ${JSON.stringify(pinned.required_before_freeze)}. Emptying this list makes a contract vacuously freeze-ready, and RFC-2026-010 assesses every contract against it.`);
    }
    if (JSON.stringify(entry.consumers) !== JSON.stringify(pinned.consumers)) {
      wrong.push(`${entry.id} — consumers changed from ${JSON.stringify(pinned.consumers)} to ${JSON.stringify(entry.consumers)}`);
    }
    // The index and the manifest must not disagree with each other either.
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    if (entry.status !== manifest.status) wrong.push(`${entry.id} — index says "${entry.status}", its manifest says "${manifest.status}"`);
    if (entry.owner !== manifest.owner) wrong.push(`${entry.id} — index owner "${entry.owner}", manifest owner "${manifest.owner}"`);
  }
  const missing = Object.keys(CATALOG_REGISTRY).filter((dir) => !seen.has(dir));
  for (const dir of missing) wrong.push(`${dir} — pinned in the registry but absent from the index`);
  assert.deepEqual(wrong, [], `catalog index drifted from the manifests or from its record:\n  ${wrong.join('\n  ')}`);
});

test('every contract directory on disk is in the pinned registry', async () => {
  const dirs = (await readdir(CATALOG, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const unpinned = dirs.filter((dir) => !CATALOG_REGISTRY[dir]);
  assert.deepEqual(unpinned, [], `contract(s) present but not pinned — a new contract must record its status, owner and freeze requirements: ${unpinned.join(', ')}`);
});

// Independent review eleven: `freeze_boundary`, `source_references`, `untestable_by_fixture`
// and `untestable_by_schema` are pinned by nothing across the catalog as a whole. Two contracts
// have their text asserted in the envelope suite; the other twelve can be rewritten to say
// anything, emptied, or -- the case that matters -- have a caveat DELETED.
//
// A caveat is the only record that a contract makes a claim its own fixtures cannot demonstrate.
// Deleting one does not fail a test; it makes the contract look better than it is. So the SET of
// contracts carrying each caveat is pinned by name, the same way untested constraints are: a
// count can be paid for by adding a caveat somewhere cheap, a name cannot.
const DECLARES_UNTESTABLE_BY_FIXTURE = [
  'CTR-AUD-001', 'CTR-FLG-001', 'CTR-MOD-001', 'CTR-NTF-001',
  'CTR-OBS-001', 'CTR-PAG-001', 'CTR-SEC-001', 'CTR-USG-001',
];
const DECLARES_UNTESTABLE_BY_SCHEMA = [
  'CTR-AUD-001', 'CTR-NTF-001', 'CTR-OBS-001', 'CTR-PAG-001', 'CTR-SEC-001', 'CTR-USG-001',
];

test('every contract states a freeze boundary and cites where it came from', async () => {
  const wrong = [];
  for (const dir of Object.keys(CATALOG_REGISTRY)) {
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    const id = manifest.contract_id;
    const boundary = manifest.freeze_boundary;
    // A boundary is a sentence about what freezing this contract does NOT settle. An empty
    // string, a placeholder, or "n/a" is the absence of one wearing its name.
    if (typeof boundary !== 'string' || boundary.trim().length < 40) {
      wrong.push(`${id}: freeze_boundary is ${JSON.stringify(boundary)} — must state what the freeze leaves open`);
    } else if (/^(n\/?a|none|tbd|todo)\b/i.test(boundary.trim())) {
      wrong.push(`${id}: freeze_boundary is a placeholder — ${JSON.stringify(boundary.trim().slice(0, 40))}`);
    }
    const refs = manifest.source_references;
    if (!Array.isArray(refs) || refs.length === 0) {
      wrong.push(`${id}: source_references is ${JSON.stringify(refs)} — a contract with no cited source is unreviewable`);
    } else if (!refs.every((r) => typeof r === 'string' && r.trim().length > 0)) {
      wrong.push(`${id}: source_references holds an empty entry`);
    }
  }
  assert.deepEqual(wrong, [], `contract manifest field(s) nothing was checking:\n  ${wrong.join('\n  ')}`);
});

test('a contract does not quietly stop declaring what its fixtures cannot demonstrate', async () => {
  const carries = { fixture: [], schema: [] };
  for (const dir of Object.keys(CATALOG_REGISTRY)) {
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    const id = manifest.contract_id;
    const stated = (value) => typeof value === 'string' && value.trim().length >= 20;
    if (stated(manifest.untestable_by_fixture)) carries.fixture.push(id);
    if (stated(manifest.untestable_by_schema)) carries.schema.push(id);
  }
  // Equality in both directions. A contract that drops its caveat fails; a contract that gains
  // one fails too, because a new caveat is a new admission and belongs in a reviewed diff.
  assert.deepEqual(carries.fixture.sort(), [...DECLARES_UNTESTABLE_BY_FIXTURE].sort(),
    'the set of contracts admitting a claim their fixtures cannot demonstrate has changed');
  assert.deepEqual(carries.schema.sort(), [...DECLARES_UNTESTABLE_BY_SCHEMA].sort(),
    'the set of contracts admitting a claim their schema cannot express has changed');
});

// Independent review twelve: the caveat pin checked PRESENCE and LENGTH only -- a caveat had to
// be at least 20 characters, a freeze boundary at least 40 and not start with a placeholder
// word. So the text could be replaced by its opposite. It rewrote CTR-SEC-001, the secret-handle
// contract:
//
//   freeze_boundary       -> "Freezing this contract settles every open question about secret handling."
//   untestable_by_fixture -> "Every claim this contract makes is demonstrated by its fixtures."
//   untestable_by_schema  -> "Every rule this contract states is expressed in its JSON Schema."
//
// exit 0, 187/187. The admission that revocation immediacy and encryption cannot be demonstrated
// by fixtures was replaced by the claim that everything is demonstrated -- and RFC-2026-010
// assesses freeze readiness against exactly these three fields.
//
// The text is now pinned the way schemas are: by digest, per contract. Editing a caveat is a
// deliberate act in a diff a reviewer reads, which is the whole point of writing one down.
const CAVEAT_DIGESTS = {
  'ctr-api-001': { freeze_boundary: '815831740f125bb3' },
  'ctr-aud-001': { freeze_boundary: '5a435a5ce9469e0f', untestable_by_fixture: '67c4cb4f02912a5a', untestable_by_schema: '8afa0bc10012b320' },
  'ctr-err-001': { freeze_boundary: '07345b618e8388f4' },
  'ctr-evt-001': { freeze_boundary: '236e75aeda851184' },
  'ctr-flg-001': { freeze_boundary: '4eac2ca0f49b152b', untestable_by_fixture: 'a33afe671089ceac' },
  'ctr-idm-001': { freeze_boundary: '5cba1fd899632d41' },
  'ctr-job-001': { freeze_boundary: '05243c910b16d414' },
  'ctr-mod-001': { freeze_boundary: '22314a6d0c859d81', untestable_by_fixture: '8053ad9e74ea24fd' },
  'ctr-ntf-001': { freeze_boundary: '0d7a35df9e223055', untestable_by_fixture: '0b3a2ecd0bb8fa68', untestable_by_schema: 'd97d8cb30f2c4735' },
  'ctr-obs-001': { freeze_boundary: '23991f04c65fefc7', untestable_by_fixture: 'bbdf43f4298434e5', untestable_by_schema: '5f8f6304b630de9e' },
  'ctr-pag-001': { freeze_boundary: '7cc50c9d8daf646d', untestable_by_fixture: 'd5b82746b3379dcd', untestable_by_schema: '632e77c7c5fd5e87' },
  'ctr-sec-001': { freeze_boundary: 'bb9ed12a3f70f374', untestable_by_fixture: '1ffa2979d8f056c7', untestable_by_schema: 'c4809fecbc249148' },
  'ctr-ten-001': { freeze_boundary: '8f0ab5a50b9a2de4' },
  'ctr-usg-001': { freeze_boundary: '8ef114c8bfe9c430', untestable_by_fixture: '7254124ea26dfae6', untestable_by_schema: 'fc93a0da49f8d1b1' },
};

test('a caveat cannot be replaced by its opposite', async () => {
  const { createHash } = await import('node:crypto');
  const digest = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);
  const wrong = [];
  for (const [dir, pinned] of Object.entries(CAVEAT_DIGESTS)) {
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    for (const [field, expected] of Object.entries(pinned)) {
      const actual = manifest[field];
      if (typeof actual !== 'string' || actual.trim().length === 0) {
        wrong.push(`${dir}.${field} is gone; it read something with digest ${expected}`);
        continue;
      }
      const found = digest(actual);
      if (found !== expected) {
        wrong.push(`${dir}.${field} was rewritten — digest ${expected} became ${found}: ${JSON.stringify(actual.slice(0, 90))}…`);
      }
    }
    for (const field of ['untestable_by_fixture', 'untestable_by_schema']) {
      if (pinned[field] === undefined && typeof manifest[field] === 'string' && manifest[field].trim().length > 0) {
        wrong.push(`${dir}.${field} appeared and is pinned by nothing; a new admission belongs in a reviewed diff`);
      }
    }
  }
  assert.deepEqual(wrong, [], `caveat text that changed without being written down:\n  ${wrong.join('\n  ')}`);
});

// Independent review thirteen: `accepted_gaps` is the FOURTH field of this kind and CAVEAT_DIGESTS
// pinned three. It records what a contract knowingly accepts that it should not, and it was
// checked only by heuristics in the conformance suite -- length over 80, a keyword regex, twenty
// unique words. That is the identical weakness review twelve found in the length-only caveat pin,
// relocated one field over.
//
// The review rewrote CTR-SEC-001's record that the opaque-handle pattern gives ZERO coverage
// against a credential smuggled inside a conforming handle body, replacing it with "nothing about
// credential material remains unresolved before freeze", and kept all three heuristics satisfied:
// exit 0, 198/198. That is the security co-owner's open item, deleted by rewrite, in silence.
//
// RFC-2026-010 assesses freeze readiness against exactly these records.
const ACCEPTED_GAP_DIGESTS = {
  'ctr-aud-001': {
    'examples/accepted-gap-break-glass-without-time-bound.json': 'b8dbc99e5acd5125',
  },
  'ctr-obs-001': {
    'examples/accepted-gap-unbounded-error-code-label.json': 'f484e4844a4c0978',
  },
  'ctr-pag-001': {
    'examples/accepted-gap-decodable-offset-cursor.json': 'd94f54b4994bfda5',
    'examples/accepted-gap-unbounded-page-size.json': 'c8dc0e403b072644',
  },
  'ctr-sec-001': {
    'examples/accepted-gap-classification-below-restricted.json': 'e21de50c52685457',
    'examples/accepted-gap-structureless-handle-body.json': '4a59065e1aac7016',
  },
};

test('an accepted gap cannot be rewritten into a reassurance', async () => {
  const { createHash } = await import('node:crypto');
  const digest = (value) => createHash('sha256').update(JSON.stringify(value, Object.keys(value ?? {}).sort())).digest('hex').slice(0, 16);
  const wrong = [];
  const seen = {};
  for (const dir of Object.keys(CATALOG_REGISTRY)) {
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    const gaps = manifest.accepted_gaps;
    if (gaps === undefined) continue;
    if (typeof gaps !== 'object' || gaps === null || Array.isArray(gaps)) {
      wrong.push(`${dir}.accepted_gaps is not a map`);
      continue;
    }
    seen[dir] = Object.keys(gaps).sort();
    const pinned = ACCEPTED_GAP_DIGESTS[dir] ?? {};
    for (const [key, value] of Object.entries(gaps)) {
      const expected = pinned[key];
      if (expected === undefined) {
        wrong.push(`${dir} accepted a new gap "${key}" that is pinned by nothing; a new admission belongs in a reviewed diff`);
        continue;
      }
      const found = digest(value);
      if (found !== expected) wrong.push(`${dir} rewrote the gap "${key}" — digest ${expected} became ${found}`);
    }
    for (const key of Object.keys(pinned)) {
      if (!(key in gaps)) wrong.push(`${dir} dropped the gap "${key}"; a gap that stops being recorded has not stopped existing`);
    }
  }
  // Both directions on the key set too, so a whole contract cannot quietly stop declaring gaps.
  const expectedContracts = Object.keys(ACCEPTED_GAP_DIGESTS).sort();
  assert.deepEqual(Object.keys(seen).filter((d) => seen[d].length > 0).sort(), expectedContracts,
    'the set of contracts declaring accepted gaps has changed');
  assert.deepEqual(wrong, [], `accepted gap(s) that changed without being written down:\n  ${wrong.join('\n  ')}`);
});

// I wrote, one wave ago: "prose in an `x-` annotation is not enforced, by design ... written down
// rather than guarded badly." Independent review fourteen showed why that was the wrong call for
// the annotations that live inside `schema.json`.
//
// It rewrote CTR-SEC-001's `x-opacity-limitation` -- "THIS PATTERN IS NOT A SECURITY CONTROL, AND
// MUST NOT BE CITED AS ONE" -- into "THIS PATTERN IS A SECURITY CONTROL AND MAY BE CITED AS ONE
// ... no further opacity mechanism is required before freeze", and DELETED
// `x-cross-tenant-limitation`, the record that nothing binds a claimed scope to its handle, raised
// by independent security review. **exit 0, 208/208.**
//
// That is review thirteen's MEDIUM 3 relocated one file over: the manifest caveats were pinned and
// the schema annotations were not, while `x-reference-rule` and `x-tiebreaker-rule` are cited
// elsewhere in this repository as THE source of a rule. The catalog treats this channel as
// normative, so it is pinned like one.
//
// The cost is real and accepted: fixing a typo in a comment is now a ratchet edit. The count is
// pinned beside the digest so that a deletion and an addition cannot cancel out.
const ANNOTATION_DIGESTS = {
  'ctr-api-001': { count: 10, digest: 'bbe5e0cc5f6c5bbb' },
  'ctr-aud-001': { count: 22, digest: '69cdfdb6184b0cf0' },
  'ctr-err-001': { count: 1, digest: '591ca9e7afafdece' },
  'ctr-evt-001': { count: 12, digest: '1d3766091e62de86' },
  'ctr-flg-001': { count: 19, digest: '627b839672f67d8b' },
  'ctr-idm-001': { count: 8, digest: '651b5e5ef2e84103' },
  'ctr-job-001': { count: 8, digest: 'b374d6bd002c3ad4' },
  'ctr-mod-001': { count: 20, digest: '29985bb8dcd4186c' },
  'ctr-ntf-001': { count: 15, digest: 'b2ad9b8499a8fce6' },
  'ctr-obs-001': { count: 19, digest: '117d7f1aa91e5d10' },
  'ctr-pag-001': { count: 8, digest: 'b69a983bac7678fb' },
  'ctr-sec-001': { count: 21, digest: 'e34025a0d11d5e37' },
  'ctr-ten-001': { count: 1, digest: '72dd93913f524475' },
  'ctr-usg-001': { count: 14, digest: '45167d79fd628647' },
};

// `description` and `title` belong here for the same reason `x-` keys do, and independent review
// fifteen showed it by rewriting CTR-SEC-001's `description` -- "It never carries credential
// material, and this schema declares no property that could hold any" -- into "A handle MAY carry
// credential material inline in its handle body ... consumers MUST accept such a handle", and
// adding to CTR-API-001 a top-level description exempting internal callers from tenant isolation.
// **exit 0, 214/214.**
//
// `description` is the STANDARD documentation channel: it is what a code generator, an OpenAPI
// render and a reviewer read first, and it is strictly more visible than an `x-` extension. The
// mutation walk skips it as METADATA -- correctly, since it constrains no instance -- which is
// exactly why nothing else was watching it.
const NARRATIVE_KEYS = ['description', 'title'];

function annotationsOf(node, path = '') {
  const found = {};
  if (Array.isArray(node)) {
    node.forEach((item, index) => Object.assign(found, annotationsOf(item, `${path}[${index}]`)));
    return found;
  }
  if (node === null || typeof node !== 'object') return found;
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('x-') || NARRATIVE_KEYS.includes(key)) found[`${path}.${key}`] = value;
    else Object.assign(found, annotationsOf(value, `${path}.${key}`));
  }
  return found;
}

test('an annotation cannot be rewritten, deleted or added without being written down', async () => {
  const { createHash } = await import('node:crypto');
  const wrong = [];
  for (const dir of Object.keys(CATALOG_REGISTRY)) {
    const schema = await readJson(join(CATALOG, dir, 'schema.json'));
    const annotations = annotationsOf(schema);
    const blob = Object.keys(annotations).sort()
      .map((key) => `${key} = ${JSON.stringify(annotations[key])}`).join('\n');
    const digest = createHash('sha256').update(blob).digest('hex').slice(0, 16);
    const pinned = ANNOTATION_DIGESTS[dir];
    if (pinned === undefined) { wrong.push(`${dir} has no pinned annotation digest`); continue; }
    const count = Object.keys(annotations).length;
    if (count !== pinned.count) {
      wrong.push(`${dir} carries ${count} annotation(s), pinned at ${pinned.count} — one was added or removed`);
    }
    if (digest !== pinned.digest) {
      wrong.push(`${dir} annotation text changed — digest ${pinned.digest} became ${digest}`);
    }
  }
  assert.deepEqual(wrong, [], `annotation(s) that changed without being written down:\n  ${wrong.join('\n  ')}\n`
    + 'These carry the security admissions this catalog makes in prose, and other suites cite them as the source of a rule.');
});

// Independent review fourteen, two findings that meet here.
//
// HIGH 3: ACCEPTED_GAP_DIGESTS pins the PROSE of an accepted gap and nothing pinned the fixture
// that demonstrates it. The review changed five fixture bodies while leaving every reason
// untouched -- `page_size` 500 -> 20 under a reason that still reads "page_size 500. The contract
// ACCEPTS it."; the credential-smuggling demonstration removed from the structureless-handle
// fixture; `classification` internal -> restricted; the error-code cardinality gap removed; the
// break-glass action replaced. **exit 0, 208/208 each.** A contract could not weaken what it SAYS
// it admits, and could silently stop demonstrating it -- and RFC-2026-010 assesses freeze
// readiness against exactly these records.
//
// MEDIUM 4: nothing pinned the fixture SET. Deleting five negative fixtures -- among them the
// proof that a secret handle must declare `event_safe: true`, and four of CTR-USG-001's money
// rules -- passed at exit 0. Twelve at once does fail, so the coverage ratchet bites eventually;
// it does not bite at five, and five is what an author would delete.
//
// Names, not a count, for the reason every ratchet here is named: a count can be paid for by
// adding a fixture somewhere cheap.
const FIXTURE_SET = {
  'ctr-api-001': {
    names: ['invalid-accepted-additionalproperties.json', 'invalid-accepted-deep-link-ref-pattern.json', 'invalid-accepted-deep-link-ref-type.json', 'invalid-accepted-job-id-minlength.json', 'invalid-accepted-job-id-too-long.json', 'invalid-accepted-job-id-type.json', 'invalid-accepted-required.json', 'invalid-accepted-status-ref-type.json', 'invalid-accepted-type.json', 'invalid-additionalproperties.json', 'invalid-allof0-forbids-accepted.json', 'invalid-allof1-forbids-accepted.json', 'invalid-allof1-forbids-data.json', 'invalid-allof2-forbids-data.json', 'invalid-allof2-forbids-error.json', 'invalid-api-version-minimum.json', 'invalid-api-version-missing.json', 'invalid-api-version-type.json', 'invalid-causation-id-minlength.json', 'invalid-causation-id-too-long.json', 'invalid-causation-id-type.json', 'invalid-correlation-id-minlength.json', 'invalid-correlation-id-too-long.json', 'invalid-correlation-id-type.json', 'invalid-data-type.json', 'invalid-deep-link-ref-too-long.json', 'invalid-error-kind-without-error.json', 'invalid-error-violates-referenced-contract.json', 'invalid-kind-enum.json', 'invalid-public-status-ref.json', 'invalid-request-id-minlength.json', 'invalid-request-id-too-long.json', 'invalid-request-id-type.json', 'invalid-required.json', 'invalid-status-ref-too-long.json', 'invalid-success-with-error.json', 'invalid-success-without-data.json', 'invalid-tenant-context-violates-referenced-contract.json', 'valid-accepted.json', 'valid-error.json', 'valid-success.json'],
  },
  'ctr-aud-001': {
    names: ['accepted-gap-break-glass-without-time-bound.json', 'invalid-action-additionalproperties.json', 'invalid-action-name-pattern.json', 'invalid-action-name-too-long.json', 'invalid-action-name-type.json', 'invalid-action-required.json', 'invalid-action-type.json', 'invalid-actor-additionalproperties.json', 'invalid-actor-id-minlength.json', 'invalid-actor-id-type.json', 'invalid-actor-kind-enum.json', 'invalid-actor-required.json', 'invalid-actor-type.json', 'invalid-additionalproperties.json', 'invalid-audit-id-minlength.json', 'invalid-audit-id-type.json', 'invalid-causation-id-minlength.json', 'invalid-causation-id-type.json', 'invalid-change-additionalproperties.json', 'invalid-change-after-ref-pattern.json', 'invalid-change-after-ref-too-long.json', 'invalid-change-after-ref-type.json', 'invalid-change-before-ref-too-long.json', 'invalid-change-before-ref-type.json', 'invalid-change-empty.json', 'invalid-change-required.json', 'invalid-change-type.json', 'invalid-correlation-id-minlength.json', 'invalid-correlation-id-type.json', 'invalid-delete-without-before-ref.json', 'invalid-denied-without-error.json', 'invalid-details-type.json', 'invalid-error-violates-referenced-contract.json', 'invalid-free-text-reason.json', 'invalid-occurred-at-format.json', 'invalid-occurred-at-type.json', 'invalid-outcome-enum.json', 'invalid-public-before-ref.json', 'invalid-reason-key-too-long.json', 'invalid-reason-key-type.json', 'invalid-redaction-additionalproperties.json', 'invalid-redaction-content-redacted-const.json', 'invalid-redaction-pii-redacted-const.json', 'invalid-redaction-required.json', 'invalid-redaction-secret-redacted-const.json', 'invalid-redaction-type.json', 'invalid-required.json', 'invalid-retention-additionalproperties.json', 'invalid-retention-policy-ref-pattern.json', 'invalid-retention-policy-ref-too-long.json', 'invalid-retention-policy-ref-type.json', 'invalid-retention-required.json', 'invalid-retention-type.json', 'invalid-succeeded-with-error.json', 'invalid-tenant-context-violates-referenced-contract.json', 'invalid-unknown-action-category.json', 'invalid-unredacted-details-payload.json', 'valid-business-profile-deleted.json', 'valid-change-with-after-ref.json', 'valid-credential-revoked.json', 'valid-failed-with-error.json', 'valid-publish-denied.json'],
    gapDigests: {
      'accepted-gap-break-glass-without-time-bound.json': '7fa1965a3fe7c1ce',
    },
  },
  'ctr-err-001': {
    names: ['invalid-additionalproperties.json', 'invalid-category-enum.json', 'invalid-code-minlength.json', 'invalid-code-type.json', 'invalid-correlation-id-minlength.json', 'invalid-correlation-id-type.json', 'invalid-details-type.json', 'invalid-field-errors-additionalproperties.json', 'invalid-field-errors-code-minlength.json', 'invalid-field-errors-code-type.json', 'invalid-field-errors-field-minlength.json', 'invalid-field-errors-field-type.json', 'invalid-field-errors-not-an-array.json', 'invalid-field-errors-required.json', 'invalid-field-errors-type.json', 'invalid-message-key-minlength.json', 'invalid-message-key-type.json', 'invalid-not-an-object.json', 'invalid-required.json', 'invalid-retry-after-seconds-minimum.json', 'invalid-retry-after-seconds-type.json', 'invalid-retryable-type.json', 'invalid-unsafe-detail.json', 'valid-retryable-error.json', 'valid-validation-error.json'],
  },
  'ctr-evt-001': {
    names: ['invalid-causation-id-minlength.json', 'invalid-causation-id-too-long.json', 'invalid-causation-id-type.json', 'invalid-correlation-id-minlength.json', 'invalid-correlation-id-too-long.json', 'invalid-correlation-id-type.json', 'invalid-event-id-minlength.json', 'invalid-event-id-too-long.json', 'invalid-event-id-type.json', 'invalid-event-type-shape.json', 'invalid-event-type-too-long.json', 'invalid-event-type-type.json', 'invalid-event-version-type.json', 'invalid-event-version-zero.json', 'invalid-extra-top-level-property.json', 'invalid-idempotency-key-minlength.json', 'invalid-idempotency-key-too-long.json', 'invalid-idempotency-key-type.json', 'invalid-metadata-additionalproperties.json', 'invalid-metadata-required.json', 'invalid-metadata-schema-ref-minlength.json', 'invalid-metadata-schema-ref-type.json', 'invalid-metadata-type.json', 'invalid-missing-event-id.json', 'invalid-missing-tenant.json', 'invalid-not-an-object.json', 'invalid-occurred-at-not-a-timestamp.json', 'invalid-occurred-at-type.json', 'invalid-payload-type.json', 'invalid-producer-additionalproperties.json', 'invalid-producer-implementation-version-minlength.json', 'invalid-producer-implementation-version-too-long.json', 'invalid-producer-implementation-version-type.json', 'invalid-producer-module-key-minlength.json', 'invalid-producer-module-key-too-long.json', 'invalid-producer-module-key-type.json', 'invalid-producer-type.json', 'invalid-producer-without-implementation-version.json', 'invalid-schema-ref-too-long.json', 'invalid-subject-additionalproperties.json', 'invalid-subject-id-minlength.json', 'invalid-subject-id-too-long.json', 'invalid-subject-id-type.json', 'invalid-subject-required.json', 'invalid-subject-type-minlength.json', 'invalid-subject-type-too-long.json', 'invalid-subject-type-type.json', 'invalid-subject-type.json', 'invalid-subject-version-type.json', 'invalid-subject-version-zero.json', 'invalid-tenant-context-violates-referenced-contract.json', 'invalid-unsafe-payload.json', 'valid.json'],
  },
  'ctr-flg-001': {
    names: ['invalid-additionalproperties.json', 'invalid-audit-actor-additionalproperties.json', 'invalid-audit-actor-id-minlength.json', 'invalid-audit-actor-id-type.json', 'invalid-audit-actor-kind-enum.json', 'invalid-audit-actor-required.json', 'invalid-audit-actor-type.json', 'invalid-audit-additionalproperties.json', 'invalid-audit-changed-at-format.json', 'invalid-audit-changed-at-type.json', 'invalid-audit-expires-at-format.json', 'invalid-audit-expires-at-type.json', 'invalid-audit-owner-role-enum.json', 'invalid-audit-reason-key-pattern.json', 'invalid-audit-reason-key-type.json', 'invalid-audit-required.json', 'invalid-audit-type.json', 'invalid-bucket-additionalproperties.json', 'invalid-bucket-allocated-type.json', 'invalid-bucket-percentage-minimum.json', 'invalid-bucket-percentage-type.json', 'invalid-bucket-required.json', 'invalid-bucket-type.json', 'invalid-business-overrides-kill-switch.json', 'invalid-decided-at-format.json', 'invalid-decided-at-type.json', 'invalid-decision-source-additionalproperties.json', 'invalid-decision-source-required.json', 'invalid-decision-source-rule-enum.json', 'invalid-decision-source-scope-enum.json', 'invalid-default-deny-allows.json', 'invalid-effect-enum.json', 'invalid-explicit-allow-yielding-deny.json', 'invalid-explicit-deny-yielding-allow.json', 'invalid-historical-read-allowed-type.json', 'invalid-kill-switch-allows.json', 'invalid-missing-required-reason-key.json', 'invalid-not-an-object.json', 'invalid-percentage-over-100.json', 'invalid-percentage-without-bucket.json', 'invalid-policy-key-pattern.json', 'invalid-policy-key-type.json', 'invalid-reason-key-free-text.json', 'invalid-reason-key-type.json', 'invalid-required.json', 'invalid-scopes-out-of-order.json', 'invalid-temporary-type.json', 'invalid-temporary-without-expiry.json', 'invalid-temporary-without-owner.json', 'invalid-write-disabled-type.json', 'invalid-write-disabled-without-historical-read.json', 'invalid-write-disabled-without-history.json', 'valid-default-deny.json', 'valid-explicit-allow.json', 'valid-kill-switch-preserves-history.json', 'valid-percentage-bucket.json', 'valid-permanent-flag-without-audit.json', 'valid-temporary-with-expiry.json', 'valid-writes-open-history-closed.json'],
  },
  'ctr-idm-001': {
    names: ['invalid-additionalproperties.json', 'invalid-allof0-forbids-error.json', 'invalid-allof1-forbids-result-ref.json', 'invalid-allof2-forbids-completed-at.json', 'invalid-allof2-forbids-error.json', 'invalid-allof2-forbids-result-ref.json', 'invalid-completed-at-format.json', 'invalid-completed-at-type.json', 'invalid-completed-without-result-ref.json', 'invalid-correlation-id-minlength.json', 'invalid-correlation-id-too-long.json', 'invalid-correlation-id-type.json', 'invalid-created-at-format.json', 'invalid-created-at-type.json', 'invalid-error-violates-referenced-contract.json', 'invalid-failed-without-error.json', 'invalid-idempotency-key-minlength.json', 'invalid-idempotency-key-too-long.json', 'invalid-idempotency-key-type.json', 'invalid-payload-hash-format.json', 'invalid-payload-hash-type.json', 'invalid-public-result-ref.json', 'invalid-required.json', 'invalid-result-ref-too-long.json', 'invalid-result-ref-type.json', 'invalid-scope-additionalproperties.json', 'invalid-scope-missing-workspace.json', 'invalid-scope-operation-pattern.json', 'invalid-scope-operation-type.json', 'invalid-scope-type.json', 'invalid-scope-workspace-id-minlength.json', 'invalid-scope-workspace-id-too-long.json', 'invalid-scope-workspace-id-type.json', 'invalid-state-enum.json', 'valid-alternate-hash-algorithm.json', 'valid-completed-replay.json', 'valid-failed.json', 'valid-in-progress.json'],
  },
  'ctr-job-001': {
    names: ['invalid-attempt-negative.json', 'invalid-attempt-type.json', 'invalid-available-at-format.json', 'invalid-available-at-type.json', 'invalid-cancel-requested-at-format.json', 'invalid-cancel-requested-at-type.json', 'invalid-dedupe-key-minlength.json', 'invalid-dedupe-key-too-long.json', 'invalid-dedupe-key-type.json', 'invalid-extra-top-level-property.json', 'invalid-input-ref-too-long.json', 'invalid-input-ref-type.json', 'invalid-job-id-minlength.json', 'invalid-job-id-too-long.json', 'invalid-job-id-type.json', 'invalid-job-type-minlength.json', 'invalid-job-type-type.json', 'invalid-job-version-type.json', 'invalid-job-version-zero.json', 'invalid-last-error-code-minlength.json', 'invalid-last-error-code-type.json', 'invalid-lease-expires-at-format.json', 'invalid-lease-expires-at-type.json', 'invalid-lease-owner-minlength.json', 'invalid-lease-owner-type.json', 'invalid-max-attempts-type.json', 'invalid-max-attempts.json', 'invalid-missing-dedupe-key.json', 'invalid-missing-tenant-context.json', 'invalid-not-an-object.json', 'invalid-priority-type.json', 'invalid-progress-over-100.json', 'invalid-progress-percent-minimum.json', 'invalid-progress-percent-type.json', 'invalid-progress-stage-minlength.json', 'invalid-progress-stage-type.json', 'invalid-public-input-ref.json', 'invalid-result-ref-pattern.json', 'invalid-result-ref-too-long.json', 'invalid-result-ref-type.json', 'invalid-tenant-context-violates-referenced-contract.json', 'invalid-timeout-seconds-type.json', 'invalid-timeout-zero.json', 'valid.json'],
  },
  'ctr-mod-001': {
    names: ['invalid-additionalproperties.json', 'invalid-blocked-but-activated.json', 'invalid-blocked-without-missing.json', 'invalid-capabilities-additionalproperties.json', 'invalid-capabilities-capability-key-pattern.json', 'invalid-capabilities-capability-key-type.json', 'invalid-capabilities-duplicated.json', 'invalid-capabilities-minitems.json', 'invalid-capabilities-required.json', 'invalid-capabilities-type.json', 'invalid-capabilities-version-minimum.json', 'invalid-capabilities-version-type.json', 'invalid-capabilities-wrong-type.json', 'invalid-cost-policy-additionalproperties.json', 'invalid-cost-policy-metered-type.json', 'invalid-cost-policy-required.json', 'invalid-cost-policy-type.json', 'invalid-cost-policy-usage-contract-pattern.json', 'invalid-cost-policy-usage-contract-type.json', 'invalid-data-policy-additionalproperties.json', 'invalid-data-policy-consent-reference-minlength.json', 'invalid-data-policy-consent-reference-type.json', 'invalid-data-policy-redaction-reference-minlength.json', 'invalid-data-policy-redaction-reference-type.json', 'invalid-data-policy-required.json', 'invalid-data-policy-retention-reference-minlength.json', 'invalid-data-policy-retention-reference-type.json', 'invalid-data-policy-tenant-scoped-type.json', 'invalid-data-policy-type.json', 'invalid-dependencies-additionalproperties.json', 'invalid-dependencies-duplicated.json', 'invalid-dependencies-module-key-pattern.json', 'invalid-dependencies-module-key-type.json', 'invalid-dependencies-range-minlength.json', 'invalid-dependencies-range-type.json', 'invalid-dependencies-required.json', 'invalid-dependencies-type.json', 'invalid-dependencies-wrong-type.json', 'invalid-lifecycle-additionalproperties.json', 'invalid-lifecycle-readiness-additionalproperties.json', 'invalid-lifecycle-readiness-missing-minitems.json', 'invalid-lifecycle-readiness-missing-type.json', 'invalid-lifecycle-readiness-reason-pattern.json', 'invalid-lifecycle-readiness-reason-type.json', 'invalid-lifecycle-readiness-type.json', 'invalid-lifecycle-required.json', 'invalid-lifecycle-state-enum.json', 'invalid-lifecycle-state-missing.json', 'invalid-lifecycle-supports-drain-type.json', 'invalid-lifecycle-type.json', 'invalid-missing-data-policy.json', 'invalid-missing-required-permissions.json', 'invalid-missing-unknown-reason.json', 'invalid-module-id-pattern.json', 'invalid-module-id-type.json', 'invalid-module-key-pattern.json', 'invalid-module-key-type.json', 'invalid-not-an-object.json', 'invalid-owner-role-enum.json', 'invalid-permissioned-data-not-tenant-scoped.json', 'invalid-permissioned-without-declarations.json', 'invalid-permissions-duplicated.json', 'invalid-permissions-minlength.json', 'invalid-permissions-type.json', 'invalid-permissions-wrong-type.json', 'invalid-readiness-reason-missing.json', 'invalid-ready-without-activation.json', 'invalid-ready-without-readiness.json', 'invalid-secret-handle-shape.json', 'invalid-secret-handles-duplicated.json', 'invalid-secret-handles-type.json', 'invalid-secret-handles-wrong-type.json', 'invalid-semver.json', 'invalid-unknown-classification.json', 'invalid-version-type.json', 'valid-blocked-missing-secret.json', 'valid-ready.json'],
  },
  'ctr-ntf-001': {
    names: ['invalid-additionalproperties.json', 'invalid-channel-enum.json', 'invalid-command-carrying-delivery.json', 'invalid-command-without-deep-link.json', 'invalid-dedupe-key-minlength.json', 'invalid-dedupe-key-type.json', 'invalid-deep-link-additionalproperties.json', 'invalid-deep-link-omits-permission-flag.json', 'invalid-deep-link-public-url.json', 'invalid-deep-link-target-ref-type.json', 'invalid-deep-link-type.json', 'invalid-deep-link-without-permission.json', 'invalid-delivered-with-failure-class.json', 'invalid-delivery-additionalproperties.json', 'invalid-delivery-failure-class-enum.json', 'invalid-delivery-required.json', 'invalid-failure-missing-class-only.json', 'invalid-failure-without-class.json', 'invalid-kind-enum.json', 'invalid-message-free-text.json', 'invalid-message-key-type.json', 'invalid-missing-tenant-context.json', 'invalid-notification-id-minlength.json', 'invalid-notification-id-type.json', 'invalid-required.json', 'invalid-unknown-delivery-state.json', 'invalid-unsupported-locale.json', 'valid-command.json', 'valid-result-delivered.json', 'valid-result-failed-transient.json', 'valid-result-suppressed-duplicate.json'],
  },
  'ctr-obs-001': {
    names: ['accepted-gap-unbounded-error-code-label.json', 'invalid-additionalproperties.json', 'invalid-correlation-additionalproperties.json', 'invalid-correlation-causation-id-minlength.json', 'invalid-correlation-causation-id-type.json', 'invalid-correlation-correlation-id-minlength.json', 'invalid-correlation-correlation-id-type.json', 'invalid-correlation-job-id-minlength.json', 'invalid-correlation-job-id-type.json', 'invalid-correlation-request-id-minlength.json', 'invalid-correlation-request-id-type.json', 'invalid-correlation-required.json', 'invalid-correlation-trace-id-minlength.json', 'invalid-correlation-trace-id-type.json', 'invalid-correlation-type.json', 'invalid-dependencies-additionalproperties.json', 'invalid-dependencies-dependency-key-pattern.json', 'invalid-dependencies-dependency-key-type.json', 'invalid-dependencies-duplicated.json', 'invalid-dependencies-kind-enum.json', 'invalid-dependencies-required.json', 'invalid-dependencies-type.json', 'invalid-dependencies-wrong-type.json', 'invalid-down-but-ready.json', 'invalid-environment-enum.json', 'invalid-free-text-readiness-reason.json', 'invalid-liveness-additionalproperties.json', 'invalid-liveness-depends-on-external-provider.json', 'invalid-liveness-required.json', 'invalid-liveness-status-enum.json', 'invalid-liveness-type.json', 'invalid-module-additionalproperties.json', 'invalid-module-implementation-version-minlength.json', 'invalid-module-implementation-version-type.json', 'invalid-module-module-key-pattern.json', 'invalid-module-module-key-type.json', 'invalid-module-required.json', 'invalid-module-type.json', 'invalid-not-an-object.json', 'invalid-readiness-additionalproperties.json', 'invalid-readiness-capabilities-0-reason-key-too-long.json', 'invalid-readiness-capabilities-additionalproperties.json', 'invalid-readiness-capabilities-capability-key-pattern.json', 'invalid-readiness-capabilities-capability-key-type.json', 'invalid-readiness-capabilities-minitems.json', 'invalid-readiness-capabilities-ready-type.json', 'invalid-readiness-capabilities-reason-key-type.json', 'invalid-readiness-capabilities-required.json', 'invalid-readiness-capabilities-type.json', 'invalid-readiness-capabilities-wrong-type.json', 'invalid-readiness-ready-type.json', 'invalid-readiness-required.json', 'invalid-readiness-type.json', 'invalid-ready-with-unready-capability.json', 'invalid-redaction-additionalproperties.json', 'invalid-redaction-content-redacted-const.json', 'invalid-redaction-pii-redacted-const.json', 'invalid-redaction-required.json', 'invalid-redaction-secret-redacted-const.json', 'invalid-redaction-type.json', 'invalid-required.json', 'invalid-sli-tags-capability-key-pattern.json', 'invalid-sli-tags-capability-key-type.json', 'invalid-sli-tags-environment-pattern.json', 'invalid-sli-tags-environment-type.json', 'invalid-sli-tags-error-code-pattern.json', 'invalid-sli-tags-error-code-type.json', 'invalid-sli-tags-module-key-pattern.json', 'invalid-sli-tags-module-key-type.json', 'invalid-sli-tags-outcome-pattern.json', 'invalid-sli-tags-outcome-type.json', 'invalid-sli-tags-required.json', 'invalid-sli-tags-type.json', 'invalid-unknown-dependency-status.json', 'invalid-unready-capability-without-reason.json', 'invalid-user-content-metric-label.json', 'valid-down-and-not-ready.json', 'valid-provider-unavailable-but-still-live.json', 'valid-ready.json'],
    gapDigests: {
      'accepted-gap-unbounded-error-code-label.json': '25a6faa9f5efd886',
    },
  },
  'ctr-pag-001': {
    names: ['accepted-gap-decodable-offset-cursor.json', 'accepted-gap-unbounded-page-size.json', 'invalid-additionalproperties.json', 'invalid-allof0-forbids-has-more.json', 'invalid-allof0-forbids-items.json', 'invalid-allof0-forbids-next-cursor.json', 'invalid-allof1-forbids-cursor.json', 'invalid-cursor-minlength.json', 'invalid-cursor-type.json', 'invalid-filter-type.json', 'invalid-has-more-type.json', 'invalid-has-more-without-cursor.json', 'invalid-kind-enum.json', 'invalid-next-cursor-type.json', 'invalid-page-size-minimum.json', 'invalid-page-size-type.json', 'invalid-page-without-sort.json', 'invalid-required.json', 'invalid-sort-additionalproperties.json', 'invalid-sort-direction-enum.json', 'invalid-sort-duplicated.json', 'invalid-sort-field-minlength.json', 'invalid-sort-field-type.json', 'invalid-sort-required.json', 'invalid-sort-type.json', 'invalid-sort-wrong-type.json', 'invalid-type.json', 'invalid-unstable-sort-without-tiebreaker.json', 'valid-first-page-request.json', 'valid-last-page-result.json', 'valid-next-page-request.json', 'valid-page-result.json'],
    gapDigests: {
      'accepted-gap-decodable-offset-cursor.json': 'e5213272565f37ea',
      'accepted-gap-unbounded-page-size.json': '87d963d7aff2ef52',
    },
  },
  'ctr-sec-001': {
    names: ['accepted-gap-classification-below-restricted.json', 'accepted-gap-structureless-handle-body.json', 'invalid-allof1-forbids-revocation.json', 'invalid-byok-rotated-by-platform-role.json', 'invalid-classification-enum.json', 'invalid-correlation-id-minlength.json', 'invalid-correlation-id-type.json', 'invalid-event-surface-not-redaction-safe.json', 'invalid-handle-not-an-opaque-reference.json', 'invalid-handle-too-long.json', 'invalid-handle-type.json', 'invalid-inline-credential-material.json', 'invalid-managed-rotated-by-workspace-owner.json', 'invalid-ownership-enum.json', 'invalid-redaction-additionalproperties.json', 'invalid-redaction-analytics-safe-false.json', 'invalid-redaction-browser-safe-false.json', 'invalid-redaction-error-trace-safe-false.json', 'invalid-redaction-event-safe-false.json', 'invalid-redaction-job-safe-false.json', 'invalid-redaction-log-safe-false.json', 'invalid-redaction-required.json', 'invalid-redaction-type.json', 'invalid-required.json', 'invalid-resolvable-const.json', 'invalid-resolvable-type.json', 'invalid-revocation-actor-additionalproperties.json', 'invalid-revocation-actor-id-minlength.json', 'invalid-revocation-actor-id-type.json', 'invalid-revocation-actor-kind-enum.json', 'invalid-revocation-actor-required.json', 'invalid-revocation-actor-type.json', 'invalid-revocation-additionalproperties.json', 'invalid-revocation-reason-key-pattern.json', 'invalid-revocation-reason-key-type.json', 'invalid-revocation-required.json', 'invalid-revocation-revoked-at-format.json', 'invalid-revocation-revoked-at-type.json', 'invalid-revocation-type.json', 'invalid-revoked-still-resolvable.json', 'invalid-revoked-without-revocation-record.json', 'invalid-rotating-with-revocation-record.json', 'invalid-rotation-additionalproperties.json', 'invalid-rotation-next-rotation-due-at-format.json', 'invalid-rotation-next-rotation-due-at-type.json', 'invalid-rotation-owner-additionalproperties.json', 'invalid-rotation-owner-id-minlength.json', 'invalid-rotation-owner-id-missing.json', 'invalid-rotation-owner-id-type.json', 'invalid-rotation-owner-type.json', 'invalid-rotation-rotated-at-format.json', 'invalid-rotation-rotated-at-missing.json', 'invalid-rotation-rotated-at-type.json', 'invalid-rotation-type.json', 'invalid-scope-additionalproperties.json', 'invalid-scope-business-profile-id-minlength.json', 'invalid-scope-business-profile-id-type.json', 'invalid-scope-capability-key-pattern.json', 'invalid-scope-capability-key-type.json', 'invalid-scope-page-context-profile-id-minlength.json', 'invalid-scope-page-context-profile-id-type.json', 'invalid-scope-required.json', 'invalid-scope-type.json', 'invalid-scope-workspace-id-minlength.json', 'invalid-scope-workspace-id-type.json', 'invalid-state-enum.json', 'valid-byok-rotating.json', 'valid-managed-active.json', 'valid-revoked-no-longer-resolvable.json'],
    gapDigests: {
      'accepted-gap-classification-below-restricted.json': '3dbfe9feed889cdc',
      'accepted-gap-structureless-handle-body.json': '524b7f9732ce4ec9',
    },
  },
  'ctr-ten-001': {
    names: ['invalid-actor-additionalproperties.json', 'invalid-actor-id-minlength.json', 'invalid-actor-id-type.json', 'invalid-actor-kind-enum.json', 'invalid-actor-required.json', 'invalid-actor-type.json', 'invalid-additionalproperties.json', 'invalid-business-profile-id-minlength.json', 'invalid-business-profile-id-type.json', 'invalid-causation-id-minlength.json', 'invalid-causation-id-type.json', 'invalid-correlation-id-minlength.json', 'invalid-correlation-id-type.json', 'invalid-locale-const.json', 'invalid-missing-workspace.json', 'invalid-not-an-object.json', 'invalid-page-context-profile-id-minlength.json', 'invalid-page-context-profile-id-type.json', 'invalid-request-id-minlength.json', 'invalid-request-id-type.json', 'invalid-timezone-const.json', 'invalid-workspace-id-minlength.json', 'invalid-workspace-id-type.json', 'valid.json'],
  },
  'ctr-usg-001': {
    names: ['invalid-additionalproperties.json', 'invalid-attribution-additionalproperties.json', 'invalid-attribution-business-profile-id-minlength.json', 'invalid-attribution-business-profile-id-type.json', 'invalid-attribution-job-id-minlength.json', 'invalid-attribution-job-id-type.json', 'invalid-attribution-provider-key-pattern.json', 'invalid-attribution-provider-key-type.json', 'invalid-attribution-required.json', 'invalid-attribution-type.json', 'invalid-attribution-workspace-id-minlength.json', 'invalid-attribution-workspace-id-type.json', 'invalid-cost-additionalproperties.json', 'invalid-cost-amount-type.json', 'invalid-cost-basis-enum.json', 'invalid-cost-magnitude-past-exact-range.json', 'invalid-cost-required.json', 'invalid-cost-supersedes-usage-id-minlength.json', 'invalid-cost-supersedes-usage-id-type.json', 'invalid-cost-type.json', 'invalid-dedupe-key-minlength.json', 'invalid-dedupe-key-pattern.json', 'invalid-dedupe-key-too-long.json', 'invalid-dedupe-key-type.json', 'invalid-dimension-enum.json', 'invalid-float-cost.json', 'invalid-missing-dedupe-key.json', 'invalid-missing-provider-attribution.json', 'invalid-missing-tenant-context.json', 'invalid-negative-cost.json', 'invalid-not-an-object.json', 'invalid-occurred-at-format.json', 'invalid-occurred-at-type.json', 'invalid-quantity-additionalproperties.json', 'invalid-quantity-amount-type.json', 'invalid-quantity-leading-zero.json', 'invalid-quantity-required.json', 'invalid-quantity-type.json', 'invalid-quantity-unit-enum.json', 'invalid-tenant-context-violates-referenced-contract.json', 'invalid-unknown-currency.json', 'invalid-unknown-dimension.json', 'invalid-usage-id-minlength.json', 'invalid-usage-id-type.json', 'valid-estimated-ai-tokens.json', 'valid-estimated-storage.json', 'valid-provider-reported.json'],
  },
};

test('the fixture set is what it was, and each accepted gap still demonstrates itself', async () => {
  const { createHash } = await import('node:crypto');
  const wrong = [];
  for (const [dir, pinned] of Object.entries(FIXTURE_SET)) {
    let names = [];
    try {
      names = (await readdir(join(CATALOG, dir, 'examples'))).filter((n) => n.endsWith('.json')).sort();
    } catch {
      wrong.push(`${dir} has no examples directory at all`);
      continue;
    }
    const missing = pinned.names.filter((n) => !names.includes(n));
    const added = names.filter((n) => !pinned.names.includes(n));
    if (missing.length > 0) wrong.push(`${dir} lost ${missing.length} fixture(s): ${missing.join(', ')}`);
    if (added.length > 0) wrong.push(`${dir} gained ${added.length} fixture(s) nobody pinned: ${added.join(', ')}`);
    for (const [name, digest] of Object.entries(pinned.gapDigests ?? {})) {
      if (!names.includes(name)) continue;
      const body = await readFile(join(CATALOG, dir, 'examples', name), 'utf8');
      const found = createHash('sha256').update(body).digest('hex').slice(0, 16);
      if (found !== digest) {
        wrong.push(`${dir}/${name} no longer demonstrates its gap — digest ${digest} became ${found}`);
      }
    }
  }
  assert.deepEqual(wrong, [], `fixture evidence that changed without being written down:\n  ${wrong.join('\n  ')}`);
});

// Independent review fourteen, MEDIUM 5: the registry pinned each entry's owner, status,
// required_before_freeze and consumers. It did not pin the index's own header, nor each entry's
// name and version. The review rewrote the index freeze_boundary -- "It does not change
// Candidate/Draft status or freeze any contract" -- into "This index freezes every contract
// listed. No further owner sign-off is required.", set catalog_version to 9.9.9, source to
// "none", and gave CTR-MOD-001 version 2.0.0 while its manifest still said 1.0.0, with the name
// "Module manifest (deprecated, do not use)". **exit 0, 208/208.**
//
// The index is what RFC-2026-010 and every gate decision read. Its header is pinned, its names
// and versions are pinned, and each entry's version is cross-checked against the manifest that
// contract actually ships -- the way status and owner already were.
const INDEX_HEADER = {
  catalog_version: "1.0.0",
  source: "docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md#5.2",
  freeze_boundary_digest: '5120fd9c3d6b5636',
};
const INDEX_ENTRIES = {
  'CTR-TEN-001': { name: "Trusted Tenant Context", version: '1.0.0' },
  'CTR-ERR-001': { name: "Stable Error + Thai action key", version: '1.0.0' },
  'CTR-API-001': { name: "API command/query envelope", version: '1.0.0' },
  'CTR-PAG-001': { name: "Keyset pagination/filter/sort", version: '1.0.0' },
  'CTR-IDM-001': { name: "Command idempotency", version: '1.0.0' },
  'CTR-EVT-001': { name: "Domain Event Envelope", version: '1.0.0' },
  'CTR-JOB-001': { name: "Background Job Envelope + receipt", version: '1.0.0' },
  'CTR-USG-001': { name: "Usage/Cost Event", version: '1.0.0' },
  'CTR-SEC-001': { name: "Secret Reference/Handle", version: '1.0.0' },
  'CTR-MOD-001': { name: "Module Manifest/Lifecycle", version: '1.0.0' },
  'CTR-FLG-001': { name: "Feature Policy Decision", version: '1.0.0' },
  'CTR-AUD-001': { name: "Audit Event", version: '1.0.0' },
  'CTR-OBS-001': { name: "Correlation/health/readiness", version: '1.0.0' },
  'CTR-NTF-001': { name: "Notification command/deep-link", version: '1.0.0' },
};

test('the catalog index header and every entry name and version are pinned', async () => {
  const { createHash } = await import('node:crypto');
  const index = await readJson(join(CATALOG, 'index.json'));
  const wrong = [];
  if (index.catalog_version !== INDEX_HEADER.catalog_version) {
    wrong.push(`catalog_version is ${JSON.stringify(index.catalog_version)}, pinned at ${JSON.stringify(INDEX_HEADER.catalog_version)}`);
  }
  if (index.source !== INDEX_HEADER.source) {
    wrong.push(`source is ${JSON.stringify(index.source)}, pinned at ${JSON.stringify(INDEX_HEADER.source)}`);
  }
  const boundary = createHash('sha256').update(String(index.freeze_boundary)).digest('hex').slice(0, 16);
  if (boundary !== INDEX_HEADER.freeze_boundary_digest) {
    wrong.push(`the index freeze_boundary was rewritten — digest ${INDEX_HEADER.freeze_boundary_digest} became ${boundary}: `
      + `${JSON.stringify(String(index.freeze_boundary).slice(0, 90))}…`);
  }
  const seen = new Set();
  for (const entry of index.contracts ?? []) {
    seen.add(entry.id);
    const pinned = INDEX_ENTRIES[entry.id];
    if (pinned === undefined) { wrong.push(`${entry.id} is in the index and pinned by nothing`); continue; }
    if (entry.name !== pinned.name) wrong.push(`${entry.id} name is ${JSON.stringify(entry.name)}, pinned at ${JSON.stringify(pinned.name)}`);
    if (entry.version !== pinned.version) wrong.push(`${entry.id} version is ${entry.version}, pinned at ${pinned.version}`);
    // And the index must agree with the contract it points at.
    const dir = entry.id.toLowerCase();
    if (CATALOG_REGISTRY[dir] !== undefined) {
      const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
      if (manifest.version !== entry.version) {
        wrong.push(`${entry.id} is version ${entry.version} in the index and ${manifest.version} in its own manifest`);
      }
    }
  }
  for (const id of Object.keys(INDEX_ENTRIES)) {
    if (!seen.has(id)) wrong.push(`${id} was removed from the index`);
  }
  assert.deepEqual(wrong, [], `catalog index change(s) nobody wrote down:\n  ${wrong.join('\n  ')}`);
});

// Independent review fourteen, MEDIUM 6: a contract manifest took arbitrary fields. The review
// added `"normative_rules": ["Every paginated page MUST carry zero rows…", "page_size MUST NOT
// exceed 20."]` to CTR-PAG-001 and deleted its `composes` list, at exit 0. A manifest is read by
// humans deciding whether a contract is ready to freeze; an invented normative field there is a
// rule with no schema behind it and no ratchet over it.

const COMPOSES = {
  'ctr-api-001': ["CTR-TEN-001", "CTR-ERR-001"],
  'ctr-aud-001': ["CTR-TEN-001", "CTR-ERR-001"],
  'ctr-idm-001': ["CTR-ERR-001"],
  'ctr-ntf-001': ["CTR-TEN-001"],
  'ctr-obs-001': [],
  'ctr-pag-001': ["CTR-API-001"],
  'ctr-sec-001': [],
  'ctr-usg-001': ["CTR-TEN-001"],
};

const MANIFEST_KEYS = [
  'accepted_gaps', 'agreement_witnesses', 'composes', 'contract_id', 'fixtures', 'freeze_boundary',
  'owner', 'schema', 'source_references', 'status', 'trust_boundary', 'untestable_by_fixture',
  'untestable_by_schema', 'version',
];

test('a contract manifest carries no field nobody declared', async () => {
  const wrong = [];
  for (const dir of Object.keys(CATALOG_REGISTRY)) {
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    for (const key of Object.keys(manifest)) {
      if (!MANIFEST_KEYS.includes(key)) {
        wrong.push(`${dir} declares "${key}", which no suite reads and no schema constrains — `
          + `${JSON.stringify(JSON.stringify(manifest[key]).slice(0, 80))}`);
      }
    }
    // `composes` is how a contract says which others it builds on; losing it silently detaches a
    // contract from the graph the reference-integrity suite walks.
    //
    // The first version of this check read `CATALOG_REGISTRY[dir]?.composes` -- and no entry in
    // CATALOG_REGISTRY declares `composes`, so it was `false && ...` for all fourteen contracts
    // and could never fire. Independent review fifteen deleted `composes` from ctr-pag-001 at
    // exit 0, and correctly called out this package's own evidence, which claimed "a composes
    // list cannot vanish". **It could.** The lists are pinned here now, by content.
    const expected = COMPOSES[dir];
    if (expected !== undefined) {
      const found = manifest.composes;
      if (!Array.isArray(found)) wrong.push(`${dir} dropped its composes list`);
      else if (JSON.stringify(found) !== JSON.stringify(expected)) {
        wrong.push(`${dir} composes ${JSON.stringify(found)}, pinned at ${JSON.stringify(expected)}`);
      }
    } else if (Array.isArray(manifest.composes)) {
      wrong.push(`${dir} gained a composes list nobody pinned: ${JSON.stringify(manifest.composes)}`);
    }
  }
  assert.deepEqual(wrong, [], `manifest field(s) outside the declared set:\n  ${wrong.join('\n  ')}`);
});

// Independent review fifteen, MEDIUM 5: the manifest key-set ratchet went to contract manifests
// and not to the index -- the one file RFC-2026-010 and every gate decision actually read. It
// added `"normative_rules": ["Every contract listed is approved for freeze; owner sign-off is
// recorded as satisfied.", "An internal service caller is exempt from workspace scoping."]` and
// `"freeze_approved": true` on the CTR-SEC-001 entry, at exit 0.
const INDEX_KEYS = ['catalog_version', 'contracts', 'freeze_boundary', 'source'];
const INDEX_ENTRY_KEYS = ['consumers', 'id', 'name', 'owner', 'required_before_freeze', 'status', 'version'];

test('the catalog index carries no field nobody declared', async () => {
  const index = await readJson(join(CATALOG, 'index.json'));
  const wrong = [];
  for (const key of Object.keys(index)) {
    if (!INDEX_KEYS.includes(key)) {
      wrong.push(`the index declares "${key}", which no suite reads and no schema constrains — `
        + `${JSON.stringify(JSON.stringify(index[key]).slice(0, 100))}`);
    }
  }
  for (const key of INDEX_KEYS) {
    if (index[key] === undefined) wrong.push(`the index lost "${key}"`);
  }
  for (const entry of index.contracts ?? []) {
    for (const key of Object.keys(entry)) {
      if (!INDEX_ENTRY_KEYS.includes(key)) {
        wrong.push(`${entry.id ?? '<unknown>'} declares "${key}" in the index — ${JSON.stringify(entry[key])}`);
      }
    }
  }
  assert.deepEqual(wrong, [], `catalog index field(s) outside the declared set:\n  ${wrong.join('\n  ')}`);
});

// Independent review sixteen, MEDIUM 5: `MANIFEST_KEYS` is a permitted-key set, not a
// required-value set, and three of the keys it permits carry normative claims that nothing read.
// `trust_boundary` was asserted for ctr-ten-001 alone, `source_references` only for being an array
// of non-empty strings, and `agreement_witnesses` by nothing at all.
//
// The review set CTR-API-001's trust_boundary to "tenant context is advisory for internal service
// callers", and gave it `agreement_witnesses: ["A1 (security) has signed off on the internal-caller
// exemption", "A6 has signed off"]` -- **fabricating precisely the sign-off RFC-2026-010 lists as
// outstanding, in the file a freeze reviewer reads.** exit 0, 226/226.
const NORMATIVE_MANIFEST_FIELDS = {
  'ctr-api-001': { source_references: '9b9f17f389e6ff44' },
  'ctr-aud-001': { source_references: '7dc6a17127047355' },
  'ctr-err-001': { source_references: '89e2438b13f0fbec' },
  'ctr-evt-001': { source_references: '5ddd29d761cc6282' },
  'ctr-flg-001': { source_references: '6ec6b91b4ebb5298' },
  'ctr-idm-001': { agreement_witnesses: '6896abe613393b5d', source_references: 'a2ddd88c4de63b11' },
  'ctr-job-001': { source_references: '8dd32884974e5a9c' },
  'ctr-mod-001': { source_references: '3080fb571b82b306' },
  'ctr-ntf-001': { source_references: '4cecd05ce0c57fe8' },
  'ctr-obs-001': { source_references: 'b453f9f1ae08e083' },
  'ctr-pag-001': { source_references: 'aa4c153899a799b8' },
  'ctr-sec-001': { source_references: 'c93a993a44130494' },
  'ctr-ten-001': { trust_boundary: 'bb40cede6ad6253a', source_references: 'ee30c0ff36f94227' },
  'ctr-usg-001': { source_references: '064d3597a41219b4' },
};

test('the normative manifest fields cannot be rewritten or invented', async () => {
  const { createHash } = await import('node:crypto');
  const wrong = [];
  for (const dir of Object.keys(CATALOG_REGISTRY)) {
    const manifest = await readJson(join(CATALOG, dir, 'manifest.json'));
    const pinned = NORMATIVE_MANIFEST_FIELDS[dir] ?? {};
    for (const field of ['trust_boundary', 'agreement_witnesses', 'source_references']) {
      const present = manifest[field] !== undefined;
      const expected = pinned[field];
      if (!present && expected !== undefined) { wrong.push(`${dir} dropped ${field}`); continue; }
      if (present && expected === undefined) {
        wrong.push(`${dir} gained ${field}, which nobody pinned — ${JSON.stringify(JSON.stringify(manifest[field]).slice(0, 90))}`);
        continue;
      }
      if (!present) continue;
      const digest = createHash('sha256').update(JSON.stringify(manifest[field])).digest('hex').slice(0, 16);
      if (digest !== expected) {
        wrong.push(`${dir}.${field} was rewritten — digest ${expected} became ${digest}`);
      }
    }
  }
  assert.deepEqual(wrong, [], `normative manifest field(s) that changed without being written down:\n  ${wrong.join('\n  ')}\n`
    + 'agreement_witnesses records who has signed off; a contract must not be able to write its own sign-off.');
});
