import type { ActorKind, TenantScope } from '../domain/tenant-context';

// The ports the tenant-context resolver depends on. Their adapters (the Supabase session, the real
// directory read path, a server id generator) are the provider-bound increment (manifest
// scope.exclude); until then, application/fakes.ts implements them with synthetic data.

// Who the server has authenticated for this request. Never read from the request body.
export interface AuthenticatedPrincipal {
  readonly kind: ActorKind;
  readonly id: string;
}

export interface AuthenticatedPrincipalPort {
  // null: no authenticated principal. A rejection is a dependency failure.
  current(): Promise<AuthenticatedPrincipal | null>;
}

// Decides whether a principal may act in a scope, validating Workspace -> Business -> Page as
// CTR-TEN-001's trust_boundary requires. Only `true` admits. A rejection is a dependency failure,
// and the resolver copies nothing from it. Membership is keyed on the principal's kind AND id
// (A1-AUD1015-2): a `system_actor` and a `user` that share an id string are different principals.
// The scope it receives is frozen (A1-AUD1015-3); it is read, never changed.
export interface TenantAccessDirectory {
  admits(principal: AuthenticatedPrincipal, scope: TenantScope): Promise<boolean>;
}

// Server-minted ids for the request and correlation ids of a context.
export interface RequestIdSource {
  mint(): string;
}

// Where the runner (application/run.ts) reports a failure it answered without detail, so a swallowed
// failure is not a blind spot (A1-261-N5). The record is redacted by construction: server-minted ids,
// the stage, the code of the error answered and the `typeof` of a thrown value, never the value, its
// message, name, stack or cause. Its adapter (a logger under CTR-OBS-001's rules, WP-1A-A6-002) is
// the provider-bound increment; application/fakes.ts records the reports for tests. A report that
// throws, or returns a promise that rejects, does not change the reply.
export type FailureStage = 'resolve' | 'handle';

export type ThrownKind = 'undefined' | 'object' | 'boolean' | 'number' | 'bigint' | 'string' | 'symbol' | 'function';

export interface FailureReport {
  readonly stage: FailureStage;
  // The code of the stable error answered (platform.temporary, platform.internal), or null when
  // there was no correlation id to answer under.
  readonly answered: string | null;
  // Present once the resolver has minted them and they reached the runner.
  readonly correlation_id?: string;
  readonly request_id?: string;
  // Present when the runner caught a thrown value; absent when the resolver had already dropped it.
  readonly thrown?: ThrownKind;
}

export interface FailureReportPort {
  report(failure: FailureReport): void;
}
