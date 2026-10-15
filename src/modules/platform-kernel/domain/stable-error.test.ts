// CTR-ERR-001's factory (manifest acceptance criterion 5): no stable error carries a thrown value's
// message, name or stack, and every error's details is empty.
import { describe, expect, it } from 'vitest';

import * as platformErrors from './platform-errors';
import { checkStableError, defineStableError, definitionOf, mintedDefinitionOf, stableError, type StableErrorDefinition } from './stable-error';

const LEAK_MARKER = 'zz-text-from-a-thrown-value';

describe('stableError', () => {
  it('builds an error that satisfies CTR-ERR-001, with empty details, frozen', () => {
    const error = stableError(platformErrors.PLATFORM_INTERNAL, 'cor_synthetic_0001');
    expect(checkStableError(error)).toBe(true);
    expect(error.details).toEqual({});
    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.isFrozen(error.details)).toBe(true);
    expect(error.correlation_id).toBe('cor_synthetic_0001');
  });

  it('copies only the named fields of a definition, never a cause, message, name or stack', () => {
    const thrown = new Error(LEAK_MARKER);
    // A definition object that also carries a thrown value's text under every name a cause uses.
    const polluted = Object.assign({}, platformErrors.PLATFORM_INTERNAL, {
      cause: thrown,
      message: thrown.message,
      name: thrown.name,
      stack: thrown.stack,
      details: { raw: LEAK_MARKER },
    }) as StableErrorDefinition;
    const error = stableError(polluted, 'cor_synthetic_0001');
    expect(Object.keys(error).sort()).toEqual(['category', 'code', 'correlation_id', 'details', 'message_key', 'retryable']);
    expect(JSON.stringify(error)).not.toContain(LEAK_MARKER);
    expect(error.details).toEqual({});
  });

  it('copies field errors field by field and nothing else', () => {
    const fieldErrors = [{ field: 'business_profile_id', code: 'required', stack: LEAK_MARKER }];
    const error = stableError(platformErrors.TENANT_SELECTION_INVALID, 'cor_synthetic_0001', fieldErrors);
    expect(error.field_errors).toEqual([{ field: 'business_profile_id', code: 'required' }]);
    expect(JSON.stringify(error)).not.toContain(LEAK_MARKER);
    expect(checkStableError(error)).toBe(true);
  });

  it('refuses to build an error the schema would refuse', () => {
    expect(() => stableError(platformErrors.PLATFORM_INTERNAL, '')).toThrow(TypeError);
    expect(() => defineStableError({ code: '', messageKey: 'errors.x', category: 'internal', retryable: false })).toThrow(TypeError);
    expect(() => defineStableError({ code: 'x.y', messageKey: 'errors.x', category: 'temporary', retryable: true, retryAfterSeconds: 0 })).toThrow(TypeError);
  });

  it('re-issues an error from its definition under another correlation id', () => {
    const first = stableError(platformErrors.PLATFORM_TEMPORARY, 'cor_synthetic_0001');
    const second = stableError(definitionOf(first), 'cor_synthetic_0002');
    expect({ ...second, correlation_id: 'cor_synthetic_0001' }).toEqual(first);
  });

  it('every platform-kernel definition makes a valid error', () => {
    for (const definition of Object.values(platformErrors)) {
      expect(checkStableError(stableError(definition, 'cor_synthetic_0001'))).toBe(true);
    }
  });

  // A1-261-N1: which errors count as minted (A0's inference beyond CTR-ERR-001).
  it('knows the definition of an error minted from a defineStableError definition, and of nothing else', () => {
    const minted = stableError(platformErrors.PLATFORM_TEMPORARY, 'cor_synthetic_0001');
    expect(mintedDefinitionOf(minted)).toBe(platformErrors.PLATFORM_TEMPORARY);
    const undefinedDefinition = { code: 'x.y', messageKey: 'errors.x.y', category: 'internal', retryable: false } as const;
    for (const value of [
      stableError(undefinedDefinition, 'cor_synthetic_0001'),
      stableError(definitionOf(minted), 'cor_synthetic_0001'),
      stableError({ ...platformErrors.PLATFORM_TEMPORARY }, 'cor_synthetic_0001'),
      { ...minted },
      JSON.parse(JSON.stringify(minted)) as unknown,
      platformErrors.PLATFORM_TEMPORARY,
      null,
      undefined,
      'platform.temporary',
    ]) {
      expect(mintedDefinitionOf(value)).toBeUndefined();
    }
    const defined = defineStableError(undefinedDefinition);
    expect(defined).not.toBe(undefinedDefinition);
    expect(mintedDefinitionOf(stableError(defined, 'cor_synthetic_0001'))).toBe(defined);
  });
});
