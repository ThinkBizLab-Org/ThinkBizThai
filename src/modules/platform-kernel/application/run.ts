import { checkAcceptedReceipt, type AcceptedReceipt, type Envelope } from '../domain/envelope';
import { hasOwn, isObject, type JsonObject } from '../domain/json-shape';
import { PLATFORM_INTERNAL, PLATFORM_TEMPORARY } from '../domain/platform-errors';
import { checkStableError, mintedDefinitionOf, stableError, type StableError } from '../domain/stable-error';
import { acceptedEnvelope, errorEnvelope, successEnvelope } from './envelope';
import type { FailureReport, FailureReportPort } from './ports';
import {
  resolveTenantContext,
  type TenantContext,
  type TenantContextDependencies,
  type TenantContextResolution,
} from './tenant-context';

// The runner: resolves the tenant context, runs one command handler under it, and turns any value
// thrown on the way into an answer that carries none of its text (manifest scope.include, third
// item; PR-1 DEFERRALS). It is the catch the PR-1 DEFERRALS entry says nothing had yet: the
// constant-message errors platform-kernel throws for a programming fault (UntrustedTenantContextError,
// UntrustedStableErrorError and InvalidEnvelopeError from the builders; TypeError from the resolver,
// stableError and idempotencyOutcome), a getter on an in-process argument that throws, and anything a
// handler or a port throws, of any type.
//
// What it answers:
// - `envelope`: a CTR-API-001 envelope under the minted context. The handler's reply becomes a
//   success, accepted or error envelope; anything the handler throws, and any reply the builders
//   refuse, becomes the platform.internal error envelope, under the context's request and
//   correlation ids.
// - `error`: the resolver refused, so no tenant context exists. A bare CTR-ERR-001 error under the
//   resolver's minted correlation id, because CTR-API-001 has no error shape without a tenant
//   context yet (manifest open_blockers, Q1); the composition increment maps it to the wire.
// - `uncorrelated`: the resolver threw, which it does only when no correlation id could be minted
//   (its id source failed or minted outside the minted shape) or for a programming fault. With no
//   correlation id there is no CTR-ERR-001 error to give; the answer carries nothing at all.
//
// Every failure answered without detail is reported to the failure-report port with a redacted
// record (A1-261-N5): what the runner caught (`typeof` only), and the dependency failures the
// resolver already swallowed (its platform.temporary). Refusals that are answers, not failures
// (unauthenticated, scope denied, an invalid selection), are not reported.
//
// No clock, randomness, I/O or global is read here; the ids are the resolver's.

export type CommandReply =
  | { readonly kind: 'success'; readonly data: JsonObject }
  | { readonly kind: 'accepted'; readonly accepted: AcceptedReceipt }
  // A minted error only (domain/stable-error.ts, A1-261-N1); any other is answered as platform.internal.
  | { readonly kind: 'error'; readonly error: StableError };

export type CommandHandler = (context: TenantContext) => Promise<CommandReply> | CommandReply;

export interface RunnerDependencies extends TenantContextDependencies {
  readonly failures: FailureReportPort;
}

export type RunResult =
  | { readonly kind: 'envelope'; readonly envelope: Envelope }
  | { readonly kind: 'error'; readonly error: StableError }
  | { readonly kind: 'uncorrelated' };

const UNCORRELATED: RunResult = Object.freeze({ kind: 'uncorrelated' });

// A report never changes the reply: a port that throws, or returns a promise that rejects, is
// ignored, and nothing it returns is read but to attach that handler.
function report(dependencies: RunnerDependencies, failure: FailureReport): void {
  try {
    const returned: unknown = dependencies.failures.report(Object.freeze(failure));
    Promise.resolve(returned).catch(() => undefined);
  } catch {
    // Nothing from the report's failure is kept.
  }
}

const own = (value: JsonObject, key: string): unknown => (hasOwn(value, key) ? value[key] : undefined);

// The handler's reply as an envelope. Only the reply's OWN properties are read, each once; anything
// that is not a command reply throws, and the caller answers it as platform.internal.
function envelopeOf(context: TenantContext, reply: unknown): Envelope {
  if (isObject(reply)) {
    const kind = own(reply, 'kind');
    if (kind === 'success') {
      const data = own(reply, 'data');
      if (isObject(data)) return successEnvelope(context, data);
    } else if (kind === 'accepted') {
      const accepted = own(reply, 'accepted');
      if (checkAcceptedReceipt(accepted)) return acceptedEnvelope(context, accepted);
    } else if (kind === 'error') {
      const error = own(reply, 'error');
      if (checkStableError(error)) return errorEnvelope(context, error);
    }
  }
  throw new TypeError('runner: the handler did not reply with a command reply');
}

export async function runCommand(
  dependencies: RunnerDependencies,
  selection: unknown,
  handler: CommandHandler,
): Promise<RunResult> {
  let resolution: TenantContextResolution;
  try {
    resolution = await resolveTenantContext(dependencies, selection);
  } catch (thrown) {
    report(dependencies, { stage: 'resolve', answered: null, thrown: typeof thrown });
    return UNCORRELATED;
  }
  if (!resolution.ok) {
    const { error } = resolution;
    if (mintedDefinitionOf(error) === PLATFORM_TEMPORARY) {
      report(dependencies, { stage: 'resolve', answered: error.code, correlation_id: error.correlation_id });
    }
    return Object.freeze({ kind: 'error', error });
  }

  const { context } = resolution;
  let envelope: Envelope;
  try {
    envelope = envelopeOf(context, await handler(context));
  } catch (thrown) {
    report(dependencies, {
      stage: 'handle',
      answered: PLATFORM_INTERNAL.code,
      correlation_id: context.correlation_id,
      request_id: context.request_id,
      thrown: typeof thrown,
    });
    // Built from constants under a minted context: it throws only if this module itself is broken.
    envelope = errorEnvelope(context, stableError(PLATFORM_INTERNAL, context.correlation_id));
  }
  return Object.freeze({ kind: 'envelope', envelope });
}
