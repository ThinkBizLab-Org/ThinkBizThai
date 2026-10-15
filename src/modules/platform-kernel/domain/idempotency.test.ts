// CTR-IDM-001's outcome (manifest acceptance criterion 6): replay, conflict (an ERR `conflict`) and
// independent, with the blake3 witness accepted and no hash algorithm pinned.
import { describe, expect, it } from 'vitest';

import { checkIdempotencyRecord, idempotencyOutcome, type IdempotencyRecord, type IdempotencyRequest } from './idempotency';
import { checkStableError } from './stable-error';

// The shapes of ctr-idm-001/examples/valid-completed-replay.json and valid-alternate-hash-algorithm.json.
const sha = `sha256:${'a'.repeat(64)}`;
const blake = `blake3:${'c'.repeat(64)}`;
const stored = (payloadHash: string): IdempotencyRecord => ({
  idempotency_key: 'idem_synthetic_0001',
  scope: { workspace_id: 'ws_synthetic_0001', operation: 'content.generation.create' },
  payload_hash: payloadHash,
  state: 'completed',
  created_at: '2026-08-31T10:00:00Z',
  completed_at: '2026-08-31T10:00:04Z',
  result_ref: 'result:content_synthetic_0001',
  correlation_id: 'cor_synthetic_0001',
});
const request = (overrides: Partial<IdempotencyRequest> = {}): IdempotencyRequest => ({
  idempotency_key: 'idem_synthetic_0001',
  scope: { workspace_id: 'ws_synthetic_0001', operation: 'content.generation.create' },
  payload_hash: sha,
  ...overrides,
});

describe('idempotencyOutcome', () => {
  it('replays the stored record for the same key, scope and payload hash', () => {
    const record = stored(sha);
    expect(idempotencyOutcome(record, request(), 'cor_synthetic_0002')).toEqual({ kind: 'replay', record });
  });

  it('replays under blake3: no algorithm is pinned', () => {
    const record = stored(blake);
    expect(checkIdempotencyRecord(record)).toBe(true);
    expect(idempotencyOutcome(record, request({ payload_hash: blake }), 'cor_synthetic_0002').kind).toBe('replay');
  });

  it('is a conflict, an ERR `conflict` with empty details, for the same key and scope with another payload', () => {
    const outcome = idempotencyOutcome(stored(sha), request({ payload_hash: `sha256:${'b'.repeat(64)}` }), 'cor_synthetic_0002');
    expect(outcome.kind).toBe('conflict');
    if (outcome.kind !== 'conflict') return;
    expect(checkStableError(outcome.error)).toBe(true);
    expect(outcome.error.category).toBe('conflict');
    expect(outcome.error.correlation_id).toBe('cor_synthetic_0002');
    expect(outcome.error.details).toEqual({});
  });

  it("is a conflict for another algorithm's hash under the same key (A0's inference)", () => {
    expect(idempotencyOutcome(stored(sha), request({ payload_hash: blake }), 'cor_synthetic_0002').kind).toBe('conflict');
  });

  it('is a conflict for the same hex digits under another algorithm name: the whole string is compared', () => {
    const hex = 'a'.repeat(64);
    expect(idempotencyOutcome(stored(`sha256:${hex}`), request({ payload_hash: `blake3:${hex}` }), 'cor_synthetic_0002').kind).toBe('conflict');
    expect(idempotencyOutcome(stored(`blake3:${hex}`), request({ payload_hash: `sha256:${hex}` }), 'cor_synthetic_0002').kind).toBe('conflict');
  });

  it('is independent with no stored record, another key, another workspace or another operation', () => {
    expect(idempotencyOutcome(undefined, request(), 'cor_synthetic_0002')).toEqual({ kind: 'independent' });
    const record = stored(sha);
    const other = `sha256:${'b'.repeat(64)}`;
    expect(idempotencyOutcome(record, request({ idempotency_key: 'idem_synthetic_0009', payload_hash: other }), 'c').kind).toBe('independent');
    expect(idempotencyOutcome(record, request({ scope: { workspace_id: 'ws_synthetic_0002', operation: 'content.generation.create' }, payload_hash: other }), 'c').kind).toBe('independent');
    expect(idempotencyOutcome(record, request({ scope: { workspace_id: 'ws_synthetic_0001', operation: 'content.generation.update' }, payload_hash: other }), 'c').kind).toBe('independent');
  });

  it('refuses a request or a stored record that does not satisfy CTR-IDM-001', () => {
    expect(() => idempotencyOutcome(undefined, request({ payload_hash: 'deadbeef' }), 'c')).toThrow(TypeError);
    expect(() => idempotencyOutcome(undefined, request({ scope: { workspace_id: 'ws', operation: 'single' } }), 'c')).toThrow(TypeError);
    const broken = { ...stored(sha), state: 'in_progress' } as const;
    expect(() => idempotencyOutcome(broken, request(), 'c')).toThrow(TypeError);
  });

  // Q0-AUD1015-3: a non-object is answered false, not thrown on.
  it('answers false for a record that is not an object', () => {
    for (const value of [null, undefined, 'idem_synthetic_0001', 42, [], [stored(sha)]]) {
      expect(checkIdempotencyRecord(value)).toBe(false);
    }
  });

  // A1-AUD1015-4 (A0's inference against CTR-IDM-001): the record names no actor, so replay cannot
  // match on one; with the actor bound into the payload hash by the caller, another member of the
  // workspace presenting the same key and payload gets a conflict, not the first member's result_ref.
  it('gives another member a conflict, not a replay, when the actor is bound into the hash', () => {
    const firstMember = `sha256:${'1'.repeat(64)}`;
    const secondMember = `sha256:${'2'.repeat(64)}`;
    const outcome = idempotencyOutcome(stored(firstMember), request({ payload_hash: secondMember }), 'cor_synthetic_0002');
    expect(outcome.kind).toBe('conflict');
    expect(JSON.stringify(outcome)).not.toContain('result:content_synthetic_0001');
  });
});
