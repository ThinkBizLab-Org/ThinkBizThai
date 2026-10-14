// The envelope builders (manifest acceptance criteria 4 and 5): a context the resolver did not mint
// is refused, the envelope's ids are the context's, an error's correlation id is the envelope's,
// and no envelope carries a thrown value's text.
import { describe, expect, it } from 'vitest';

import { checkEnvelope } from '../domain/envelope';
import { PLATFORM_INTERNAL } from '../domain/platform-errors';
import { stableError } from '../domain/stable-error';
import { acceptedEnvelope, errorEnvelope, InvalidEnvelopeError, successEnvelope, UntrustedTenantContextError } from './envelope';
import { fixedPrincipal, sequentialRequestIdSource, tableTenantAccessDirectory } from './fakes';
import { resolveTenantContext, tenantContextRecordOf, type TenantContext } from './tenant-context';

async function mintedContext(): Promise<TenantContext> {
  const resolution = await resolveTenantContext({
    principal: fixedPrincipal({ kind: 'user', id: 'usr_synthetic_0001' }),
    directory: tableTenantAccessDirectory({
      workspaces: ['ws_synthetic_0001'],
      members: [{ actor_id: 'usr_synthetic_0001', workspace_id: 'ws_synthetic_0001' }],
      businesses: [],
      pages: [],
    }),
    ids: sequentialRequestIdSource(),
  }, { workspace_id: 'ws_synthetic_0001' });
  if (!resolution.ok) throw new Error('expected a context');
  return resolution.context;
}

const RECEIPT = { job_id: 'job_synthetic_0001', status_ref: 'job:job_synthetic_0001/status' };

describe('envelope builders', () => {
  it('build success, error and accepted envelopes that satisfy CTR-API-001, ids from the context', async () => {
    const context = await mintedContext();
    const envelopes = [
      successEnvelope(context, {}),
      errorEnvelope(context, stableError(PLATFORM_INTERNAL, context.correlation_id)),
      acceptedEnvelope(context, { ...RECEIPT, deep_link_ref: 'app:content/job_synthetic_0001' }),
    ];
    for (const envelope of envelopes) {
      expect(checkEnvelope(envelope)).toBe(true);
      expect(envelope.request_id).toBe(context.request_id);
      expect(envelope.correlation_id).toBe(context.correlation_id);
      expect(envelope.tenant_context.correlation_id).toBe(context.correlation_id);
      expect(envelope.api_version).toBe(1);
      expect(Object.isFrozen(envelope)).toBe(true);
    }
  });

  it('re-issues an error under the envelope\'s correlation id', async () => {
    const context = await mintedContext();
    const envelope = errorEnvelope(context, stableError(PLATFORM_INTERNAL, 'cor_somewhere_else'));
    expect(envelope.error.correlation_id).toBe(envelope.correlation_id);
  });

  it.each([
    ['an `as` cast of a minted context\'s plain record', async () => tenantContextRecordOf(await mintedContext()) as TenantContext],
    ['a JSON round trip', async () => JSON.parse(JSON.stringify(await mintedContext())) as TenantContext],
    ['a spread copy of a minted context', async () => ({ ...(await mintedContext()) })],
    ['a hand-written record', async () => ({
      workspace_id: 'ws_synthetic_0002',
      actor: { kind: 'user', id: 'usr_synthetic_0002' },
      request_id: 'req_forged',
      correlation_id: 'cor_forged',
      locale: 'th-TH',
      timezone: 'Asia/Bangkok',
    }) as unknown as TenantContext],
  ])('refuse %s', async (_label, forge) => {
    const forged = await forge();
    expect(() => successEnvelope(forged, {})).toThrow(UntrustedTenantContextError);
    expect(() => errorEnvelope(forged, stableError(PLATFORM_INTERNAL, 'cor_forged'))).toThrow(UntrustedTenantContextError);
    expect(() => acceptedEnvelope(forged, RECEIPT)).toThrow(UntrustedTenantContextError);
  });

  it('carry nothing of an error but its definition, so no thrown value\'s text reaches the wire', async () => {
    const context = await mintedContext();
    const LEAK_MARKER = 'zz-stack-of-a-thrown-value';
    const thrown = new Error(LEAK_MARKER);
    const error = { ...stableError(PLATFORM_INTERNAL, context.correlation_id), details: { stack: thrown.stack } };
    // An error with details is not a CTR-ERR-001 error: refused, not passed through.
    expect(() => errorEnvelope(context, error as unknown as ReturnType<typeof stableError>)).toThrow(InvalidEnvelopeError);
    const envelope = errorEnvelope(context, stableError(PLATFORM_INTERNAL, context.correlation_id));
    expect(JSON.stringify(envelope)).not.toContain(LEAK_MARKER);
    expect(envelope.error.details).toEqual({});
  });

  it('refuse a receipt or data that CTR-API-001 refuses', async () => {
    const context = await mintedContext();
    expect(() => acceptedEnvelope(context, { job_id: 'job_synthetic_0002', status_ref: 'https://api.example.invalid/jobs/1' })).toThrow(InvalidEnvelopeError);
    expect(() => acceptedEnvelope(context, { job_id: 'j'.repeat(129), status_ref: 'job:j' })).toThrow(InvalidEnvelopeError);
    expect(() => successEnvelope(context, [] as unknown as Record<string, unknown>)).toThrow(InvalidEnvelopeError);
  });

  it('serialize the tenant context as its CTR-TEN-001 record, without the brand', async () => {
    const context = await mintedContext();
    const envelope = successEnvelope(context, {});
    expect(Object.getOwnPropertySymbols(envelope.tenant_context)).toEqual([]);
    expect(JSON.parse(JSON.stringify(envelope)).tenant_context).toEqual(JSON.parse(JSON.stringify(context)));
  });
});
