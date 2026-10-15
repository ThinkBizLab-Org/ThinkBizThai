// The envelope builders (manifest acceptance criteria 4 and 5): a context the resolver did not mint
// is refused, the envelope's ids are the context's, an error's correlation id is the envelope's,
// and no envelope carries a thrown value's text.
import { describe, expect, it } from 'vitest';

import { checkEnvelope } from '../domain/envelope';
import { PLATFORM_TEMPORARY } from '../domain/platform-errors';
import { PLATFORM_INTERNAL } from '../domain/platform-errors';
import { defineStableError, stableError, type StableError } from '../domain/stable-error';
import { acceptedEnvelope, errorEnvelope, InvalidEnvelopeError, successEnvelope, UntrustedStableErrorError, UntrustedTenantContextError } from './envelope';
import { fixedPrincipal, sequentialRequestIdSource, tableTenantAccessDirectory } from './fakes';
import { resolveTenantContext, tenantContextRecordOf, type TenantContext } from './tenant-context';

async function mintedContext(selection: object = { workspace_id: 'ws_synthetic_0001' }): Promise<TenantContext> {
  const resolution = await resolveTenantContext({
    principal: fixedPrincipal({ kind: 'user', id: 'usr_synthetic_0001' }),
    directory: tableTenantAccessDirectory({
      workspaces: ['ws_synthetic_0001'],
      members: [{ actor_id: 'usr_synthetic_0001', workspace_id: 'ws_synthetic_0001' }],
      businesses: [{ business_profile_id: 'biz_synthetic_0001', workspace_id: 'ws_synthetic_0001' }],
      pages: [{ page_context_profile_id: 'page_synthetic_0001', business_profile_id: 'biz_synthetic_0001' }],
    }),
    ids: sequentialRequestIdSource(),
  }, selection);
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

  // A1-261-N1, decided with the runner (A0's inference beyond CTR-ERR-001): only a minted error.
  it.each([
    ['an error built from a definition defineStableError did not return, a caught message in its code', () =>
      stableError({ code: 'Error: zz-raw at /srv/app.ts:12', messageKey: 'errors.x', category: 'internal', retryable: false }, 'cor_synthetic_0001')],
    ['a JSON round trip of a minted error', () => JSON.parse(JSON.stringify(stableError(PLATFORM_INTERNAL, 'cor_synthetic_0001'))) as StableError],
    ['a spread copy of a minted error', () => ({ ...stableError(PLATFORM_INTERNAL, 'cor_synthetic_0001') })],
    ['a hand-written error', () => ({ code: 'password=hunter2', message_key: 'errors.x', category: 'internal', retryable: false, correlation_id: 'cor_synthetic_0001', details: {} }) as StableError],
  ])('refuse %s', async (_label, make) => {
    const context = await mintedContext();
    expect(() => errorEnvelope(context, make())).toThrow(UntrustedStableErrorError);
  });

  it('accept an error minted from any defineStableError definition, another module\'s included, re-issued from that definition', async () => {
    const context = await mintedContext();
    const OTHER_MODULE_ERROR = defineStableError({ code: 'content.title.required', messageKey: 'errors.content.title.required', category: 'validation', retryable: false });
    const minted = stableError(OTHER_MODULE_ERROR, 'cor_somewhere_else', [{ field: 'title', code: 'required' }]);
    const envelope = errorEnvelope(context, minted);
    expect(envelope.error).toEqual({ ...minted, correlation_id: context.correlation_id });
    // The re-issued error is itself minted, so it can be passed on again.
    expect(errorEnvelope(context, envelope.error).error).toEqual(envelope.error);
  });

  // Q0-AUD1015-1: a page-scoped context's business and page ids reach the envelope and the record.
  it('carry a business- and page-scoped context\'s ids into the envelope\'s tenant_context', async () => {
    const context = await mintedContext({ workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001', page_context_profile_id: 'page_synthetic_0001' });
    const expected = { workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001', page_context_profile_id: 'page_synthetic_0001' };
    expect(tenantContextRecordOf(context)).toMatchObject(expected);
    expect(successEnvelope(context, {}).tenant_context).toMatchObject(expected);
    const business = await mintedContext({ workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001' });
    expect(successEnvelope(business, {}).tenant_context).toMatchObject({ workspace_id: 'ws_synthetic_0001', business_profile_id: 'biz_synthetic_0001' });
    expect(Object.hasOwn(successEnvelope(business, {}).tenant_context, 'page_context_profile_id')).toBe(false);
  });

  // Q0-AUD1015-2: retry_after_seconds survives a re-issue; deep_link_ref is copied into the receipt.
  it('keep retry_after_seconds through the re-issue and deep_link_ref in the receipt', async () => {
    const context = await mintedContext();
    const RETRY_LATER = defineStableError({ ...PLATFORM_TEMPORARY, code: 'platform.retry.later', retryAfterSeconds: 30 });
    const envelope = errorEnvelope(context, stableError(RETRY_LATER, 'cor_somewhere_else'));
    expect(envelope.error.retry_after_seconds).toBe(30);
    const accepted = acceptedEnvelope(context, { ...RECEIPT, deep_link_ref: 'app:content/job_synthetic_0001' });
    expect(accepted.accepted).toEqual({ ...RECEIPT, deep_link_ref: 'app:content/job_synthetic_0001' });
    expect(Object.hasOwn(acceptedEnvelope(context, RECEIPT).accepted, 'deep_link_ref')).toBe(false);
  });

  // Q0-AUD1015-3: the checker answers false for a non-object, not a throw.
  it('check a non-object envelope as false', () => {
    for (const value of [null, undefined, 'success', 1, [], [{}]]) expect(checkEnvelope(value)).toBe(false);
  });
});
