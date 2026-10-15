// platform-kernel's public surface (index.ts): exactly the names below, each the module's own
// binding, and none of the fakes or shape helpers. A name added to or dropped from the surface fails
// here, so a change to it is a reviewed change.
import { describe, expect, it } from 'vitest';

import * as fakes from './application/fakes';
import * as run from './application/run';
import * as resolver from './application/tenant-context';
import * as shape from './domain/json-shape';
import * as kernel from './index';

const SURFACE = [
  'ACTOR_KINDS',
  'API_VERSION',
  'ERROR_CATEGORIES',
  'IDEMPOTENCY_CONFLICT',
  'InvalidEnvelopeError',
  'PLATFORM_INTERNAL',
  'PLATFORM_TEMPORARY',
  'TENANT_ID_PATTERN',
  'TENANT_LOCALE',
  'TENANT_SCOPE_DENIED',
  'TENANT_SELECTION_INVALID',
  'TENANT_TIMEZONE',
  'TENANT_UNAUTHENTICATED',
  'UntrustedStableErrorError',
  'UntrustedTenantContextError',
  'acceptedEnvelope',
  'checkAcceptedReceipt',
  'checkEnvelope',
  'checkIdempotencyRecord',
  'checkStableError',
  'checkTenantContext',
  'defineStableError',
  'errorEnvelope',
  'idempotencyOutcome',
  'isMintedTenantContext',
  'resolveTenantContext',
  'runCommand',
  'stableError',
  'successEnvelope',
  'tenantContextRecordOf',
];

describe('platform-kernel index.ts', () => {
  it('exports exactly the public surface', () => {
    expect(Object.keys(kernel).sort()).toEqual([...SURFACE].sort());
  });

  it('exports the module\'s own bindings, not copies', () => {
    expect(kernel.runCommand).toBe(run.runCommand);
    expect(kernel.resolveTenantContext).toBe(resolver.resolveTenantContext);
    expect(kernel.isMintedTenantContext).toBe(resolver.isMintedTenantContext);
  });

  it('exports none of the fakes or the shape helpers', () => {
    const exported = new Set(Object.keys(kernel));
    for (const name of [...Object.keys(fakes), ...Object.keys(shape), 'mintedDefinitionOf', 'definitionOf']) {
      expect(exported.has(name)).toBe(false);
    }
  });
});
