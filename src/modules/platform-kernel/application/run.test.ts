// The runner (manifest scope.include, third item; PR-1 DEFERRALS): any thrown value becomes an answer
// that carries none of its text, under the request's context or correlation id where one exists, and
// every failure answered without detail is reported, redacted (A1-261-N5).
import { describe, expect, it } from 'vitest';

import { checkEnvelope } from '../domain/envelope';
import { idempotencyOutcome } from '../domain/idempotency';
import { IDEMPOTENCY_CONFLICT, PLATFORM_INTERNAL } from '../domain/platform-errors';
import { checkStableError, defineStableError, stableError, type StableError } from '../domain/stable-error';
import { errorEnvelope, successEnvelope } from './envelope';
import {
  failingPrincipal,
  failingTenantAccessDirectory,
  fixedPrincipal,
  recordingFailureReport,
  sequentialRequestIdSource,
  tableTenantAccessDirectory,
  type RecordingFailureReport,
} from './fakes';
import type { AuthenticatedPrincipalPort, FailureReportPort, RequestIdSource, TenantAccessDirectory } from './ports';
import { runCommand, type CommandHandler, type CommandReply, type RunResult } from './run';
import { tenantContextRecordOf, type TenantContext } from './tenant-context';

const LEAK_MARKER = 'zz-text-from-a-thrown-value';

const DIRECTORY = () => tableTenantAccessDirectory({
  workspaces: ['ws_synthetic_0001'],
  members: [{ actor_id: 'usr_synthetic_0001', workspace_id: 'ws_synthetic_0001' }],
  businesses: [],
  pages: [],
});

const SELECTION = { workspace_id: 'ws_synthetic_0001' };
// The ids the sequential source mints for one run: the request id, then the correlation id.
const REQUEST_ID = 'id_synthetic_000001';
const CORRELATION_ID = 'id_synthetic_000002';

interface Run {
  readonly result: RunResult;
  readonly reports: RecordingFailureReport;
  readonly calls: number;
}

async function run(
  handler: CommandHandler,
  options: {
    readonly principal?: AuthenticatedPrincipalPort;
    readonly directory?: TenantAccessDirectory;
    readonly ids?: RequestIdSource;
    readonly failures?: FailureReportPort;
    readonly selection?: unknown;
  } = {},
): Promise<Run> {
  const reports = recordingFailureReport();
  let calls = 0;
  const counted: CommandHandler = (context) => {
    calls += 1;
    return handler(context);
  };
  const result = await runCommand({
    principal: options.principal ?? fixedPrincipal({ kind: 'user', id: 'usr_synthetic_0001' }),
    directory: options.directory ?? DIRECTORY(),
    ids: options.ids ?? sequentialRequestIdSource(),
    failures: options.failures ?? reports,
  }, 'selection' in options ? options.selection : SELECTION, counted);
  return { result, reports, calls };
}

function envelopeOf(result: RunResult) {
  if (result.kind !== 'envelope') throw new Error(`expected an envelope, got ${result.kind}`);
  return result.envelope;
}

// The platform.internal error envelope under the run's context, and its one redacted report.
function expectInternal({ result, reports }: Run, thrown: string) {
  const envelope = envelopeOf(result);
  expect(checkEnvelope(envelope)).toBe(true);
  expect(envelope.kind).toBe('error');
  if (envelope.kind !== 'error') return;
  expect(envelope.error).toEqual({
    code: 'platform.internal',
    message_key: 'errors.platform.internal',
    category: 'internal',
    retryable: false,
    correlation_id: CORRELATION_ID,
    details: {},
  });
  expect(envelope.request_id).toBe(REQUEST_ID);
  expect(envelope.correlation_id).toBe(CORRELATION_ID);
  expect(JSON.stringify(result)).not.toContain(LEAK_MARKER);
  expect(reports.reports).toEqual([{ stage: 'handle', answered: 'platform.internal', correlation_id: CORRELATION_ID, request_id: REQUEST_ID, thrown }]);
  expect(JSON.stringify(reports.reports)).not.toContain(LEAK_MARKER);
  expect(Object.isFrozen(reports.reports[0])).toBe(true);
}

const revokedProxy = (): object => {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  return proxy;
};

describe('runCommand', () => {
  it('turns a success reply into a success envelope under the minted context, reporting nothing', async () => {
    let seen: TenantContext | undefined;
    const outcome = await run((context) => {
      seen = context;
      return { kind: 'success', data: { title: 'synthetic' } };
    });
    const envelope = envelopeOf(outcome.result);
    expect(checkEnvelope(envelope)).toBe(true);
    expect(envelope).toEqual({
      api_version: 1,
      kind: 'success',
      request_id: REQUEST_ID,
      correlation_id: CORRELATION_ID,
      tenant_context: seen === undefined ? undefined : tenantContextRecordOf(seen),
      data: { title: 'synthetic' },
    });
    expect(outcome.calls).toBe(1);
    expect(outcome.reports.reports).toEqual([]);
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(envelope)).toBe(true);
  });

  it('turns an accepted reply into an accepted envelope', async () => {
    const accepted = { job_id: 'job_synthetic_0001', status_ref: 'job:job_synthetic_0001/status' };
    const envelope = envelopeOf((await run(() => Promise.resolve({ kind: 'accepted', accepted }))).result);
    expect(envelope.kind).toBe('accepted');
    if (envelope.kind === 'accepted') expect(envelope.accepted).toEqual(accepted);
  });

  it('turns an error reply into an error envelope re-issued under the context\'s correlation id', async () => {
    const OTHER_MODULE_ERROR = defineStableError({ code: 'content.title.required', messageKey: 'errors.content.title.required', category: 'validation', retryable: false });
    const error = stableError(OTHER_MODULE_ERROR, 'cor_somewhere_else', [{ field: 'title', code: 'required' }]);
    const outcome = await run(() => ({ kind: 'error', error }));
    const envelope = envelopeOf(outcome.result);
    expect(envelope.kind).toBe('error');
    if (envelope.kind === 'error') expect(envelope.error).toEqual({ ...error, correlation_id: CORRELATION_ID });
    expect(outcome.reports.reports).toEqual([]);
  });

  it.each<[string, () => unknown, string]>([
    ['an Error carrying the marker', () => new Error(LEAK_MARKER), 'object'],
    ['an Error whose cause carries the marker', () => new Error('constant', { cause: new Error(LEAK_MARKER) }), 'object'],
    ['a string', () => LEAK_MARKER, 'string'],
    ['undefined', () => undefined, 'undefined'],
    ['null', () => null, 'object'],
    ['a number', () => 42, 'number'],
    ['a bigint', () => 42n, 'bigint'],
    ['a boolean', () => false, 'boolean'],
    ['a symbol', () => Symbol(LEAK_MARKER), 'symbol'],
    ['a function', () => () => LEAK_MARKER, 'function'],
    ['an object whose message, name, stack and toString throw', () => ({
      get message(): string { throw new Error(LEAK_MARKER); },
      get name(): string { throw new Error(LEAK_MARKER); },
      get stack(): string { throw new Error(LEAK_MARKER); },
      toString(): string { throw new Error(LEAK_MARKER); },
    }), 'object'],
    ['a revoked proxy', revokedProxy, 'object'],
  ])('answers a handler that throws %s as platform.internal, carrying none of it', async (_label, make, thrown) => {
    const value = make();
    expectInternal(await run(() => { throw value; }), thrown);
    expectInternal(await run(() => Promise.reject(value)), thrown);
  });

  // PR-1 DEFERRALS: platform-kernel's own constant-message throws, which nothing caught before the runner.
  it.each<[string, CommandHandler]>([
    ['UntrustedTenantContextError (a forged context)', (context) => successEnvelope({ ...context }, {}) && { kind: 'success', data: {} }],
    ['InvalidEnvelopeError (data that is not an object)', (context) => successEnvelope(context, [] as unknown as Record<string, unknown>) && { kind: 'success', data: {} }],
    ['UntrustedStableErrorError (an error not minted)', (context) => errorEnvelope(context, { ...stableError(PLATFORM_INTERNAL, LEAK_MARKER) }) && { kind: 'success', data: {} }],
    ['TypeError from stableError (an empty correlation id)', () => ({ kind: 'error', error: stableError(IDEMPOTENCY_CONFLICT, '') })],
    ['TypeError from idempotencyOutcome (a request outside CTR-IDM-001)', () => {
      idempotencyOutcome(undefined, { idempotency_key: LEAK_MARKER, scope: { workspace_id: 'ws_synthetic_0001', operation: 'not an operation' }, payload_hash: 'x' }, CORRELATION_ID);
      return { kind: 'success', data: {} };
    }],
    ['a getter that throws on an in-process argument to a checker', () => {
      const error = { ...stableError(PLATFORM_INTERNAL, CORRELATION_ID) };
      Object.defineProperty(error, 'code', { get: () => { throw new Error(LEAK_MARKER); } });
      checkStableError(error);
      return { kind: 'success', data: {} };
    }],
  ])('answers %s as platform.internal', async (_label, handler) => {
    expectInternal(await run(handler), 'object');
  });

  it.each<[string, () => unknown]>([
    ['null', () => null],
    ['a string', () => LEAK_MARKER],
    ['an unknown kind', () => ({ kind: 'redirect', data: {} })],
    ['success without data', () => ({ kind: 'success' })],
    ['success with an array as data', () => ({ kind: 'success', data: [LEAK_MARKER] })],
    ['accepted with a receipt CTR-API-001 refuses', () => ({ kind: 'accepted', accepted: { job_id: 'job_synthetic_0001', status_ref: `https://${LEAK_MARKER}.invalid/` } })],
    ['error with an error CTR-ERR-001 refuses', () => ({ kind: 'error', error: { code: LEAK_MARKER } })],
    ['error with a valid error that was not minted', () => ({ kind: 'error', error: JSON.parse(JSON.stringify(stableError(PLATFORM_INTERNAL, CORRELATION_ID))) as StableError })],
    ['error with a hand-written error carrying the marker', () => ({ kind: 'error', error: { code: LEAK_MARKER, message_key: 'errors.x', category: 'internal', retryable: false, correlation_id: CORRELATION_ID, details: {} } })],
    ['a reply whose kind and data are only inherited', () => Object.create({ kind: 'success', data: { leaked: LEAK_MARKER } }) as unknown],
    ['a reply whose kind getter throws', () => ({ get kind(): string { throw new Error(LEAK_MARKER); } })],
    ['a revoked proxy', revokedProxy],
  ])('answers a reply that is %s as platform.internal', async (_label, reply) => {
    expectInternal(await run(() => reply() as CommandReply), 'object');
  });

  it.each<[string, AuthenticatedPrincipalPort, unknown, string]>([
    ['no principal', fixedPrincipal(null), SELECTION, 'tenant.unauthenticated'],
    ['a workspace that is not admitted', fixedPrincipal({ kind: 'user', id: 'usr_synthetic_0001' }), { workspace_id: 'ws_synthetic_0404' }, 'tenant.scope.denied'],
    ['a selection carrying an actor', fixedPrincipal({ kind: 'user', id: 'usr_synthetic_0001' }), { ...SELECTION, actor: { kind: 'user', id: 'usr_synthetic_0002' } }, 'tenant.selection.invalid'],
  ])('answers %s with the resolver\'s bare error, without running the handler or reporting', async (_label, principal, selection, code) => {
    const outcome = await run(() => ({ kind: 'success', data: {} }), { principal, selection });
    expect(outcome.result.kind).toBe('error');
    if (outcome.result.kind !== 'error') return;
    expect(outcome.result.error.code).toBe(code);
    expect(outcome.result.error.correlation_id).toBe(CORRELATION_ID);
    expect(outcome.calls).toBe(0);
    expect(outcome.reports.reports).toEqual([]);
  });

  it.each<[string, { principal?: AuthenticatedPrincipalPort; directory?: TenantAccessDirectory }]>([
    ['a failing directory', { directory: failingTenantAccessDirectory(new Error(LEAK_MARKER)) }],
    ['a failing principal port', { principal: failingPrincipal(LEAK_MARKER) }],
  ])('reports %s that the resolver answered as platform.temporary, under its correlation id', async (_label, options) => {
    const outcome = await run(() => ({ kind: 'success', data: {} }), options);
    expect(outcome.result.kind).toBe('error');
    if (outcome.result.kind !== 'error') return;
    expect(outcome.result.error.code).toBe('platform.temporary');
    expect(outcome.calls).toBe(0);
    expect(outcome.reports.reports).toEqual([{ stage: 'resolve', answered: 'platform.temporary', correlation_id: CORRELATION_ID }]);
    expect(JSON.stringify(outcome)).not.toContain(LEAK_MARKER);
  });

  it.each<[string, RequestIdSource]>([
    ['throws', { mint: (): string => { throw new Error(LEAK_MARKER); } }],
    ['mints an id outside the minted shape', { mint: (): string => `${LEAK_MARKER} with spaces` }],
  ])('answers uncorrelated, carrying nothing, when the id source %s', async (_label, ids) => {
    const outcome = await run(() => ({ kind: 'success', data: {} }), { ids });
    expect(outcome.result).toEqual({ kind: 'uncorrelated' });
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(outcome.calls).toBe(0);
    expect(outcome.reports.reports).toEqual([{ stage: 'resolve', answered: null, thrown: 'object' }]);
    expect(JSON.stringify(outcome)).not.toContain(LEAK_MARKER);
  });

  it.each<[string, () => FailureReportPort]>([
    ['throws', () => ({ report: () => { throw new Error(LEAK_MARKER); } })],
    ['returns a promise that rejects', () => ({ report: () => Promise.reject(new Error(LEAK_MARKER)) as unknown as void })],
    ['returns a thenable whose then getter throws', () => ({ report: () => ({ get then(): unknown { throw new Error(LEAK_MARKER); } }) as unknown as void })],
    ['is itself a getter that throws', () => Object.defineProperty({}, 'report', { get: () => { throw new Error(LEAK_MARKER); } }) as FailureReportPort],
  ])('keeps the answer when the failure report %s', async (_label, failures) => {
    const handled = await run(() => { throw new Error(LEAK_MARKER); }, { failures: failures() });
    expect(envelopeOf(handled.result).kind).toBe('error');
    expect(JSON.stringify(handled.result)).not.toContain(LEAK_MARKER);
    const resolved = await run(() => ({ kind: 'success', data: {} }), { failures: failures(), directory: failingTenantAccessDirectory(LEAK_MARKER) });
    expect(resolved.result.kind).toBe('error');
    const uncorrelated = await run(() => ({ kind: 'success', data: {} }), { failures: failures(), ids: { mint: (): string => { throw LEAK_MARKER; } } });
    expect(uncorrelated.result).toEqual({ kind: 'uncorrelated' });
  });

  it('passes the handler the minted context, and runs it once', async () => {
    const outcome = await run((context) => {
      // The context is the resolver's: the builders accept it.
      expect(checkEnvelope(successEnvelope(context, {}))).toBe(true);
      return { kind: 'success', data: {} };
    });
    expect(outcome.calls).toBe(1);
    expect(envelopeOf(outcome.result).kind).toBe('success');
  });
});
