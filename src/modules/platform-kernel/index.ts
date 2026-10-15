// platform-kernel's public surface (RFC-2026-029 §6.1, §6.3/1): another module imports this module
// only through this file. It names what consumers need: the ports and their record types, the
// tenant-context resolver, the envelope builders, the runner, the stable errors with their factory,
// and the four contracts' checkers and types. It does not export the fakes (application/fakes.ts),
// which are for this module's tests, the shape helpers the checkers share (domain/json-shape.ts), or
// anything under adapters/, which does not exist yet and which this file must never re-export
// (RFC-2026-029 §6.3/5). index.test.ts pins the exported names.

// Ports (application/ports.ts).
export type {
  AuthenticatedPrincipal,
  AuthenticatedPrincipalPort,
  FailureReport,
  FailureReportPort,
  FailureStage,
  RequestIdSource,
  TenantAccessDirectory,
  ThrownKind,
} from './application/ports';

// The tenant-context resolver.
export {
  TENANT_ID_PATTERN,
  isMintedTenantContext,
  resolveTenantContext,
  tenantContextRecordOf,
} from './application/tenant-context';
export type { TenantContext, TenantContextDependencies, TenantContextResolution } from './application/tenant-context';

// The CTR-API-001 envelope builders.
export {
  InvalidEnvelopeError,
  UntrustedStableErrorError,
  UntrustedTenantContextError,
  acceptedEnvelope,
  errorEnvelope,
  successEnvelope,
} from './application/envelope';

// The runner.
export { runCommand } from './application/run';
export type { CommandHandler, CommandReply, RunResult, RunnerDependencies } from './application/run';

// CTR-TEN-001.
export { ACTOR_KINDS, TENANT_LOCALE, TENANT_TIMEZONE, checkTenantContext } from './domain/tenant-context';
export type { Actor, ActorKind, TenantContextRecord, TenantScope } from './domain/tenant-context';

// CTR-ERR-001, and platform-kernel's own stable errors.
export { ERROR_CATEGORIES, checkStableError, defineStableError, stableError } from './domain/stable-error';
export type { ErrorCategory, FieldError, StableError, StableErrorDefinition } from './domain/stable-error';
export {
  IDEMPOTENCY_CONFLICT,
  PLATFORM_INTERNAL,
  PLATFORM_TEMPORARY,
  TENANT_SCOPE_DENIED,
  TENANT_SELECTION_INVALID,
  TENANT_UNAUTHENTICATED,
} from './domain/platform-errors';

// CTR-API-001.
export { API_VERSION, checkAcceptedReceipt, checkEnvelope } from './domain/envelope';
export type { AcceptedEnvelope, AcceptedReceipt, Envelope, EnvelopeKind, ErrorEnvelope, SuccessEnvelope } from './domain/envelope';

// CTR-IDM-001.
export { checkIdempotencyRecord, idempotencyOutcome } from './domain/idempotency';
export type { IdempotencyOutcome, IdempotencyRecord, IdempotencyRequest, IdempotencyScope, IdempotencyState } from './domain/idempotency';

// A JSON object, as success data and the checkers take it.
export type { JsonObject } from './domain/json-shape';
