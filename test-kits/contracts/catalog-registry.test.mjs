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
    status: "Draft",
    owner: "A0",
    index_owner: "A0",
    index_status: "Draft",
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
    status: "Draft",
    owner: "A0",
    index_owner: "A0",
    index_status: "Draft",
    required_before_freeze: ["platform→plan→workspace→business precedence"],
    consumers: ["router","UI","jobs","modules"],
  },
  'ctr-idm-001': {
    contract_id: "CTR-IDM-001",
    version: "1.0.0",
    status: "Draft",
    owner: "A0",
    index_owner: "A0",
    index_status: "Draft",
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
    status: "Draft",
    owner: "A0",
    index_owner: "A0",
    index_status: "Draft",
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
    status: "Draft",
    owner: "A0",
    index_owner: "A0",
    index_status: "Draft",
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
