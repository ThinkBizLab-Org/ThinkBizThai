import {
  API_VERSION,
  checkAcceptedReceipt,
  checkEnvelope,
  type AcceptedEnvelope,
  type AcceptedReceipt,
  type Envelope,
  type ErrorEnvelope,
  type SuccessEnvelope,
} from '../domain/envelope';
import { isObject, type JsonObject } from '../domain/json-shape';
import { checkStableError, mintedDefinitionOf, stableError, type StableError } from '../domain/stable-error';
import { isMintedTenantContext, tenantContextRecordOf, type TenantContext } from './tenant-context';

// The CTR-API-001 envelope builders. Each takes a context the resolver minted and nothing else in
// its place: an object cast to TenantContext, rebuilt from JSON or spread from a minted one is
// refused with UntrustedTenantContextError, whose message is a constant. The envelope's
// request_id and correlation_id are the context's, and an error envelope's error is re-issued
// under the context's correlation id from its definition alone, so the two ids cannot differ and
// nothing outside the definition is carried. Every envelope is checked against CTR-API-001 before
// it is returned.
//
// An error envelope takes only an error this module minted (`stableError` from a definition that
// `defineStableError` returned), and any other CTR-ERR-001-valid error is refused with
// UntrustedStableErrorError: A0's inference beyond the contract (A1-261-N1; domain/stable-error.ts).
// What stays the caller's is `field_errors`: its `field` and `code` strings must name the command's
// own fields and checks, which only review holds.

export class UntrustedTenantContextError extends Error {
  constructor() {
    super('envelope: the tenant context was not minted by the tenant-context resolver');
    this.name = 'UntrustedTenantContextError';
  }
}

export class UntrustedStableErrorError extends Error {
  constructor() {
    super('envelope: the stable error was not minted from a defineStableError definition');
    this.name = 'UntrustedStableErrorError';
  }
}

export class InvalidEnvelopeError extends Error {
  constructor() {
    super('envelope: the envelope does not satisfy CTR-API-001');
    this.name = 'InvalidEnvelopeError';
  }
}

function header(context: TenantContext) {
  if (!isMintedTenantContext(context)) throw new UntrustedTenantContextError();
  return {
    api_version: API_VERSION,
    request_id: context.request_id,
    correlation_id: context.correlation_id,
    tenant_context: tenantContextRecordOf(context),
  };
}

function checked<T extends Envelope>(envelope: T): T {
  if (!checkEnvelope(envelope)) throw new InvalidEnvelopeError();
  return Object.freeze(envelope);
}

// `data` is the caller's; CTR-API-001 does not constrain it (its x-leakage-boundary), and the
// command's own response schema must.
export function successEnvelope(context: TenantContext, data: JsonObject): SuccessEnvelope {
  const head = header(context);
  if (!isObject(data)) throw new InvalidEnvelopeError();
  return checked({ ...head, kind: 'success', data });
}

export function errorEnvelope(context: TenantContext, error: StableError): ErrorEnvelope {
  const head = header(context);
  if (!checkStableError(error)) throw new InvalidEnvelopeError();
  const definition = mintedDefinitionOf(error);
  if (definition === undefined) throw new UntrustedStableErrorError();
  const reissued = stableError(definition, head.correlation_id, error.field_errors);
  return checked({ ...head, kind: 'error', error: reissued });
}

export function acceptedEnvelope(context: TenantContext, accepted: AcceptedReceipt): AcceptedEnvelope {
  const head = header(context);
  if (!checkAcceptedReceipt(accepted)) throw new InvalidEnvelopeError();
  const receipt: AcceptedReceipt = Object.freeze({
    job_id: accepted.job_id,
    status_ref: accepted.status_ref,
    ...(accepted.deep_link_ref === undefined ? {} : { deep_link_ref: accepted.deep_link_ref }),
  });
  return checked({ ...head, kind: 'accepted', accepted: receipt });
}
