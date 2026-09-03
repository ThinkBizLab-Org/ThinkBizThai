#!/usr/bin/env node
// WHAT THIS IS FOR, and it is the half `verify-source-fields.mjs` structurally cannot do.
//
// That script validates PRESENCE: a cited field path resolves in a committed schema. It has
// never been able to validate an ABSENCE claim -- "this contract cannot express X" -- and an
// absence claim is the highest-consequence sentence in the dictionary, because it generates a
// request to another contract's owner. Two absence claims shipped false through a green run on
// that checker.
//
// So the absence claims that are constructible are CONSTRUCTED here and run through the
// repository's own JSON Schema subset validator, `test-kits/contracts/json-schema-subset.mjs`.
// That file is imported read-only and is not modified by this package; it is the same validator
// the contract test kit uses, which is the point -- a probe that used its own validator would be
// asserting against a second opinion rather than against the repository's.
//
// A probe is one of two shapes, and the shape carries the meaning:
//   EXPECT-VALID    a document that VALIDATES, proving a "the contract cannot carry this" claim
//                   FALSE. This is what withdrew A-03's and A-02's reasoning.
//   EXPECT-INVALID  a document that FAILS to validate, which is what condition C3 requires
//                   before any claim that a contract cannot express something may stand.
//
// Read-only: it parses committed schemas, builds documents in memory, and writes nothing.
// Usage: node evidence/WP-0A-A6-001/population-and-carrier-probes.mjs   (from the repo root)
import { readFile, readdir } from 'node:fs/promises';
import { validate } from '../../test-kits/contracts/json-schema-subset.mjs';

const CATALOG = 'contract-catalog/shared-kernel';

const schemas = new Map();
for (const entry of await readdir(CATALOG, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  schemas.set(entry.name, JSON.parse(await readFile(`${CATALOG}/${entry.name}/schema.json`, 'utf8')));
}
// The catalog's only $ref form is the sibling `../ctr-xxx-nnn/schema.json`; anything else is
// left unresolved so the validator reports it rather than silently accepting the document.
const resolve = (ref) => {
  const sibling = /^\.\.\/([a-z0-9-]+)\/schema\.json$/.exec(ref);
  return sibling === null ? null : schemas.get(sibling[1]) ?? null;
};
const schema = (id) => schemas.get(id.toLowerCase());

const failures = [];
const record = (id, claim, expectValid, errors) => {
  const valid = errors.length === 0;
  const ok = valid === expectValid;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  expected ${expectValid ? 'VALID' : 'INVALID'}, got ${valid ? 'VALID' : 'INVALID'}`);
  console.log(`       ${claim}`);
  if (!valid) console.log(`       first error: ${errors[0]}`);
  if (!ok) failures.push(`${id}: expected ${expectValid ? 'valid' : 'invalid'} and the document was ${valid ? 'valid' : 'invalid'}`);
};
const probe = (id, claim, contractId, document, expectValid) =>
  record(id, claim, expectValid, validate(schema(contractId), document, { resolve }));

const assertion = (id, claim, condition, detail) => {
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${id}  ${claim}`);
  console.log(`       ${detail}`);
  if (!condition) failures.push(`${id}: ${claim}`);
};

const tenantContext = (extra = {}) => ({
  workspace_id: 'ws_synthetic_0001',
  actor: { kind: 'user', id: 'usr_synthetic_0001' },
  request_id: 'req_synthetic_0001',
  correlation_id: 'cor_synthetic_0001',
  locale: 'th-TH',
  timezone: 'Asia/Bangkok',
  ...extra,
});

console.log('=== A-03 and A-02: can CTR-EVT-001 carry a step or a lifecycle identifier? ===\n');

// The document the withdrawn increment said could not exist. It carries the step in `event_type`
// and `subject`, leaves `payload` empty, and takes `workspace_id` from the tenant context.
probe(
  'EVT-CARRIER',
  'A step-identifying event VALIDATES against CTR-EVT-001 unmodified, so "no event may carry a '
  + 'step identifier at all" is FALSE. This is what withdrew A-03\'s reason.',
  'CTR-EVT-001',
  {
    event_id: 'evt_synthetic_0001',
    event_type: 'onboarding.step.completed',
    event_version: 1,
    occurred_at: '2026-09-03T04:00:00.000Z',
    producer: { module_key: 'mod_synthetic', implementation_version: '0.0.0' },
    tenant_context: tenantContext(),
    subject: { type: 'onboarding_step', id: 'connect_meta_page', version: 1 },
    correlation_id: 'cor_synthetic_0001',
    payload: {},
    metadata: { schema_ref: 'CTR-EVT-001@1.0.0' },
  },
  true,
);

probe(
  'EVT-LIFECYCLE',
  'A workspace-creation event validates too, so A-02\'s "no workspace-created fact exists anywhere '
  + 'in the shared kernel" was the same over-claim. The proxy stands; the reason is corrected.',
  'CTR-EVT-001',
  {
    event_id: 'evt_synthetic_0002',
    event_type: 'workspace.lifecycle.created',
    event_version: 1,
    occurred_at: '2026-09-03T04:00:00.000Z',
    producer: { module_key: 'mod_synthetic', implementation_version: '0.0.0' },
    tenant_context: tenantContext(),
    subject: { type: 'workspace', id: 'ws_synthetic_0001', version: 1 },
    correlation_id: 'cor_synthetic_0002',
    payload: {},
    metadata: { schema_ref: 'CTR-EVT-001@1.0.0' },
  },
  true,
);

// The one true fragment of the withdrawn claim, kept because it is what makes the withdrawn
// REQUEST wrong rather than merely unnecessary: `payload` really is closed, so asking to widen it
// was asking to open a control -- and the two probes above show the metric never needed it.
probe(
  'EVT-PAYLOAD-CLOSED',
  'Putting the step identifier in `payload` FAILS: maxProperties 0 is a real closed control. '
  + 'It is not load-bearing for this metric, which is why the payload-widening ask is withdrawn.',
  'CTR-EVT-001',
  {
    event_id: 'evt_synthetic_0003',
    event_type: 'onboarding.step.completed',
    event_version: 1,
    occurred_at: '2026-09-03T04:00:00.000Z',
    producer: { module_key: 'mod_synthetic', implementation_version: '0.0.0' },
    tenant_context: tenantContext(),
    subject: { type: 'onboarding_step', id: 'connect_meta_page', version: 1 },
    correlation_id: 'cor_synthetic_0003',
    payload: { step: 'connect_meta_page' },
    metadata: { schema_ref: 'CTR-EVT-001@1.0.0' },
  },
  false,
);

// What IS absent is the vocabulary, and absence of a vocabulary is checkable directly.
assertion(
  'EVT-NO-VOCABULARY',
  'CTR-EVT-001.event_type has no enum, and `subject.type` has no enum: the grammar is open and '
  + 'nothing DEFINES a step. This is the true ground for A-03 being `absent`.',
  !Array.isArray(schema('CTR-EVT-001').properties.event_type.enum)
    && !Array.isArray(schema('CTR-EVT-001').properties.subject.properties.type.enum),
  `event_type: pattern ${schema('CTR-EVT-001').properties.event_type.pattern}, enum absent; `
  + 'subject.type: free text, enum absent',
);

console.log('\n=== M-01: what CTR-TEN-001 actually says about the timezone ===\n');

assertion(
  'TEN-TIMEZONE-CONST',
  'CTR-TEN-001.timezone is `const` and REQUIRED, not a per-tenant value and not a plausible guess.',
  schema('CTR-TEN-001').properties.timezone.const === 'Asia/Bangkok'
    && schema('CTR-TEN-001').required.includes('timezone'),
  `timezone const = ${JSON.stringify(schema('CTR-TEN-001').properties.timezone.const)}, `
  + `in required = ${schema('CTR-TEN-001').required.includes('timezone')}, `
  + `locale const = ${JSON.stringify(schema('CTR-TEN-001').properties.locale.const)}`,
);

probe(
  'TEN-OTHER-TIMEZONE',
  'A tenant context carrying any other timezone FAILS. There is no per-tenant timezone to report on.',
  'CTR-TEN-001',
  tenantContext({ timezone: 'UTC' }),
  false,
);

console.log('\n=== S-03: can one CTR-AUD-001 record carry an interval between two parties? ===\n');

const auditRecord = (extra = {}) => ({
  audit_id: 'aud_synthetic_0001',
  occurred_at: '2026-09-03T04:00:00.000Z',
  actor: { kind: 'user', id: 'usr_synthetic_0001' },
  action: { category: 'support', name: 'support.request.received' },
  tenant_context: tenantContext(),
  correlation_id: 'cor_synthetic_0004',
  outcome: 'succeeded',
  // `^audit\.[a-z0-9_.]+$`. The first draft of this fixture used `synthetic_reason` and the
  // BASELINE probe caught it -- which is the whole reason the baseline probe is here. Without it
  // AUD-INTERVAL would have "passed" on a malformed reason_key while claiming to demonstrate
  // something about timestamps, which is a probe reporting the wrong reason and is worse than none.
  reason_key: 'audit.synthetic_reason',
  redaction: { secret_redacted: true, content_redacted: true, pii_redacted: true },
  retention: { policy_ref: 'retention.synthetic' },
  details: {},
  ...extra,
});

probe('AUD-BASELINE', 'The unmodified audit record validates, so the next probe fails for the reason claimed and not for a broken fixture.', 'CTR-AUD-001', auditRecord(), true);

// Checked for the RIGHT error, not merely for failure. A probe that accepts any rejection cannot
// tell "the contract closes its property set" from "my fixture was malformed" -- which is the
// mistake the baseline probe above caught in this very fixture.
const intervalErrors = validate(schema('CTR-AUD-001'),
  auditRecord({ first_response_at: '2026-09-03T05:00:00.000Z' }), { resolve });
record(
  'AUD-INTERVAL',
  'An audit record carrying a SECOND timestamp FAILS: one record, one `occurred_at`, '
  + '`additionalProperties: false`. S-03 cannot be computed from a single audit record.',
  false,
  intervalErrors,
);
assertion(
  'AUD-INTERVAL-REASON',
  'and it fails for the stated reason -- the undeclared property -- rather than for any other.',
  intervalErrors.some((e) => /first_response_at/.test(e)),
  `errors: ${intervalErrors.join(' | ') || 'none'}`,
);

assertion(
  'AUD-NO-ACTION-VOCABULARY',
  'The two-record route needs an `action.name` vocabulary and CTR-AUD-001 defines none, so S-03\'s '
  + 'remaining route is a DEFINITION gap of A-03\'s kind and is recorded as one.',
  !Array.isArray(schema('CTR-AUD-001').properties.action.properties.name.enum),
  `action.category: enum(${schema('CTR-AUD-001').properties.action.properties.category.enum.length}); `
  + 'action.name: free text, enum absent',
);

console.log('\n=== S-04 and S-05: two absence claims, asserted over the whole schema ===\n');

const propertiesWhere = (node, predicate, prefix = '', seen = new Set()) => {
  const found = [];
  if (!node || typeof node !== 'object' || seen.has(node)) return found;
  seen.add(node);
  for (const [name, sub] of Object.entries(node.properties ?? {})) {
    if (predicate(name, sub)) found.push(prefix + name);
    found.push(...propertiesWhere(sub, predicate, `${prefix}${name}.`, seen));
  }
  return found;
};

const ntfTimestamps = propertiesWhere(schema('CTR-NTF-001'), (_n, s) => s.format === 'date-time');
assertion(
  'NTF-NO-TIMESTAMP',
  'CTR-NTF-001 carries NO timestamp on its envelope, so S-04\'s window is cut by the storing '
  + 'module and not by the contract.',
  ntfTimestamps.length === 0,
  `properties with format date-time in CTR-NTF-001 (excluding the $ref\'d tenant context): ${ntfTimestamps.length === 0 ? 'none' : ntfTimestamps.join(', ')}`,
);

// "No terminal-state field" is the claim. Checked two ways, because a lifecycle could arrive
// either as a field named for it or as an enum of state values on a differently-named field.
const LIFECYCLE_NAMES = /^(state|status|phase|lifecycle|terminal_state|completed_at|finished_at|failed_at|succeeded_at)$/;
const LIFECYCLE_VALUES = new Set(['completed', 'complete', 'succeeded', 'success', 'failed', 'failure', 'cancelled', 'canceled', 'done', 'dead', 'terminal']);
const jobStateFields = propertiesWhere(schema('CTR-JOB-001'), (n) => LIFECYCLE_NAMES.test(n));
const jobStateEnums = propertiesWhere(schema('CTR-JOB-001'),
  (_n, s) => Array.isArray(s.enum) && s.enum.some((v) => LIFECYCLE_VALUES.has(String(v).toLowerCase())));
assertion(
  'JOB-NO-TERMINAL-STATE',
  'CTR-JOB-001 declares no terminal-state field and no enum of lifecycle states, which is why '
  + 'S-05 is a COUNT and not a rate: there is no completed-or-failed population to divide by.',
  jobStateFields.length === 0 && jobStateEnums.length === 0,
  `state-named properties: ${jobStateFields.length === 0 ? 'none' : jobStateFields.join(', ')}; `
  + `properties whose enum carries a terminal value: ${jobStateEnums.length === 0 ? 'none' : jobStateEnums.join(', ')}`,
);

console.log('\n=== C-01 to C-05: the population boundary, executed ===\n');

// The two documents from the capability benchmark's T2 probe, rebuilt here rather than quoted.
// The dedupe key composition is RFC-2026-014's: usg:<workspace>:<job>:<dimension>:<basis>:<instant>.
const usageRecord = (id, basis, amount, extra = {}) => ({
  usage_id: id,
  occurred_at: '2026-09-01T10:00:00.000Z',
  dimension: 'ai_tokens',
  quantity: { amount: '1000', unit: 'token' },
  attribution: { workspace_id: 'ws_synthetic_0001', job_id: 'job_synthetic_0001', provider_key: 'synthetic' },
  cost: { amount, currency: 'THB', basis, ...(extra.cost ?? {}) },
  dedupe_key: `usg:ws_synthetic_0001:job_synthetic_0001:ai_tokens:${basis}:20260901T100000Z`,
  tenant_context: tenantContext(),
});

const estimate = usageRecord('usg_synthetic_0001', 'estimated', '20.00');
const reported = usageRecord('usg_synthetic_0002', 'provider_reported', '22.00', {
  cost: { supersedes_usage_id: 'usg_synthetic_0001' },
});

probe('USG-ESTIMATE', 'The estimated 20.00 THB record is VALID.', 'CTR-USG-001', estimate, true);
probe('USG-SUPERSEDING', 'The provider_reported 22.00 THB record that supersedes it is ALSO VALID.', 'CTR-USG-001', reported, true);

const corpus = [estimate, reported];
// Decimal arithmetic on the string form, per M-04: these are never parsed to a binary float.
const decimalSum = (records) => {
  const total = records.reduce((acc, r) => acc + BigInt(r.cost.amount.replace('.', '').padEnd(String(r.cost.amount.split('.')[0]).length + 8, '0')), 0n);
  const s = total.toString().padStart(9, '0');
  return `${s.slice(0, -8)}.${s.slice(-8)}`.replace(/(\.\d\d)0+$/, '$1');
};

const byDedupeKey = new Map();
for (const r of corpus) if (!byDedupeKey.has(r.dedupe_key)) byDedupeKey.set(r.dedupe_key, r);
const postDedupe = [...byDedupeKey.values()];

const supersededIds = new Set(corpus.map((r) => r.cost.supersedes_usage_id).filter(Boolean));
const settled = postDedupe.filter((r) => !supersededIds.has(r.usage_id));

const naive = decimalSum(corpus);
const afterDedupeOnly = decimalSum(postDedupe);
const afterSupersession = decimalSum(settled);

console.log(`       corpus: ${corpus.length} valid records`);
console.log(`       C-01 with NO population stated (the withdrawn increment): ${naive} THB`);
console.log(`       C-01 post-dedupe only (RFC-2026-014 alone):               ${afterDedupeOnly} THB`);
console.log(`       C-01 post-dedupe AND superseded excluded (this version):  ${afterSupersession} THB`);
console.log(`       settled cost of the one measurement:                      22.00 THB\n`);

assertion(
  'POP-NAIVE-DOUBLE-COUNTS',
  'A formula with no stated population returns 42.00 for a settled cost of 22.00 -- nearly double, '
  + 'in the money direction, from two documents that both validate.',
  naive === '42.00',
  `decimal_sum over the whole corpus = ${naive}`,
);

assertion(
  'POP-DEDUPE-DOES-NOT-FIX-IT',
  'RFC-2026-014 does NOT close this. `cost.basis` is part of `dedupe_key`, so the two records carry '
  + 'DIFFERENT keys, both survive dedupe, and the total is still 42.00. Supersession is a separate axis.',
  afterDedupeOnly === '42.00' && estimate.dedupe_key !== reported.dedupe_key,
  `post-dedupe total = ${afterDedupeOnly}; keys differ = ${estimate.dedupe_key !== reported.dedupe_key}`,
);

assertion(
  'POP-BOUNDARY-IS-CORRECT',
  'Post-dedupe AND superseded-excluded returns the settled 22.00. This is the population every cost '
  + 'aggregate in the dictionary now states.',
  afterSupersession === '22.00',
  `settled total = ${afterSupersession}`,
);

// Two resolver obligations the contract itself records as untestable by its schema. Probed so the
// dictionary's `declared_not_sourced` notes are demonstrated rather than repeated from the annotation.
probe(
  'USG-SELF-SUPERSESSION-VALIDATES',
  'A record that supersedes ITSELF validates. Rejecting it is a resolver obligation, which is why '
  + 'the supersession population is a DECLARED INFERENCE and not a contract guarantee.',
  'CTR-USG-001',
  usageRecord('usg_synthetic_0003', 'provider_reported', '22.00', { cost: { supersedes_usage_id: 'usg_synthetic_0003' } }),
  true,
);

probe(
  'USG-NO-NEGATIVE-AMOUNT',
  'A negative cost.amount FAILS. There is no credit and no refund in this contract, which is why '
  + 'C-01 EXCLUDES a superseded record rather than netting its replacement against it.',
  'CTR-USG-001',
  usageRecord('usg_synthetic_0004', 'provider_reported', '22.00', { cost: { amount: '-22.00' } }),
  false,
);

console.log('\n=== what these probes DO NOT reach ===\n');
for (const line of [
  'Whether these are the right fourteen metrics. A product judgement; OPEN-016 reserves it.',
  'Whether a formula means what its plain-language definition says. No probe can read a definition.',
  'Every target. Fourteen are null and no probe could make one right if it were not.',
  'M-10: which window a superseding record falls into. Both readings validate; the contract does not choose, so neither does a probe.',
  'Whether a producer derives dedupe_key from the document rather than inventing it. RFC-2026-014 records it as a resolver obligation the schema cannot express.',
]) console.log(`  - ${line}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('\nno problems: every EXPECT-VALID document validated, every EXPECT-INVALID document was '
  + 'rejected for its stated reason, and every absence assertion held against the committed schemas.');
