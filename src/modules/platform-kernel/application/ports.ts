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
// and the resolver copies nothing from it.
export interface TenantAccessDirectory {
  admits(principal: AuthenticatedPrincipal, scope: TenantScope): Promise<boolean>;
}

// Server-minted ids for the request and correlation ids of a context.
export interface RequestIdSource {
  mint(): string;
}
