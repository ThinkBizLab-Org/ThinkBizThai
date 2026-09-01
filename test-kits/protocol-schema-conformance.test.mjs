import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { assertSchemaSupported, validate } from './contracts/json-schema-subset.mjs';

// `.agents/handoff.schema.json` was written, protected, and validated nothing until a suite was
// pointed at it. Independent review fifteen found the same shape in the other three: a work
// package could declare `"normative_rules": ["Tenant isolation MAY be skipped for internal
// service callers…"]` and flip `security_privacy.data_classification` to
// `permissioned-customer-content` with no consent, retention or redaction declared -- **exit 0**,
// because `.agents/work-package.schema.json` is digested, parsed as JSON by a syntax test, listed
// in PROTECTED_KEYS, and **read by no validator at all.**
//
// A schema nothing validates against is a document, not a control. These three are now controls.
// Written as two explicit tests, not a loop over a CASES array. The first version generated them
// with `for (const … of CASES) test(…)` and `npm run check` exited **88**: the declaration counter
// reads test() calls statically, so a loop producing two tests declares one. I reported that run
// as passing because I read the `ℹ pass` line instead of the exit code — the exact mistake this
// repository has a machine-written verification record to prevent, made while adding a test.
async function assertConforms(schemaPath, directory, label) {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  // A schema this validator only partly understands would silently under-check; the same rule the
  // contract catalog lives under.
  assertSchemaSupported(schema, schemaPath);
  const failures = [];
  for (const entry of (await readdir(directory)).sort()) {
    if (!entry.endsWith('.json')) continue;
    const document = JSON.parse(await readFile(join(directory, entry), 'utf8'));
    const errors = validate(schema, document, { path: entry });
    if (errors.length > 0) failures.push(`${entry}: ${errors.slice(0, 4).join('; ')}`);
  }
  assert.deepEqual(failures, [], `${label}(s) that do not satisfy ${schemaPath}:\n  ${failures.join('\n  ')}`);
}

test('every work package conforms to the schema that governs it', async () => {
  await assertConforms('.agents/work-package.schema.json', 'work-packages', 'work package');
});

test('every capability profile conforms to the schema that governs it', async () => {
  await assertConforms('.agents/capabilities.schema.json', '.agents/capability-profiles', 'capability profile');
});

test('the work-package schema is closed, so an invented normative field cannot be added', async () => {
  // The specific hole: `additionalProperties` was `true` at the top level, so any field could be
  // added to a work package and read as binding by the humans this protocol is written for.
  const schema = JSON.parse(await readFile('.agents/work-package.schema.json', 'utf8'));
  assert.equal(schema.additionalProperties, false,
    'a work package must not accept a field nobody declared');
  const sample = JSON.parse(await readFile('work-packages/WP-0A-CON-008.json', 'utf8'));
  assert.deepEqual(validate(schema, sample, { path: 'sample' }), []);
  const invented = { ...sample, normative_rules: ['Tenant isolation MAY be skipped for internal callers.'] };
  assert.notDeepEqual(validate(schema, invented, { path: 'sample' }), [],
    'an invented normative field must be rejected');
});

test('permissioned data cannot be declared without consent, retention and redaction', async () => {
  // CONTRIBUTING_AGENTS.md requires all three for a package touching permissioned customer
  // content. Nothing enforced it: review fifteen flipped the classification and declared none of
  // them, at exit 0.
  const schema = JSON.parse(await readFile('.agents/work-package.schema.json', 'utf8'));
  const sample = JSON.parse(await readFile('work-packages/WP-0A-CON-008.json', 'utf8'));
  const flipped = {
    ...sample,
    security_privacy: { ...sample.security_privacy, data_classification: 'permissioned-customer-content' },
  };
  const errors = validate(schema, flipped, { path: 'flipped' });
  assert.notDeepEqual(errors, [], 'permissioned data with no consent basis must be rejected');
  // And the declaration that satisfies the rule is accepted, so this is a requirement and not a ban.
  const declared = {
    ...flipped,
    security_privacy: {
      ...flipped.security_privacy,
      consent_basis: 'RFC-2026-005 section 4',
      retention_policy: 'RFC-2026-005 section 6',
      redaction_policy: 'RFC-2026-005 section 7',
      pii_policy: 'RFC-2026-005. Thai national ID and Thai phone numbers are first-class PII.',
    },
  };
  assert.deepEqual(validate(schema, declared, { path: 'declared' }), []);
});
