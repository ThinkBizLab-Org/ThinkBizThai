import type { TenantScope } from '../domain/tenant-context';
import type { AuthenticatedPrincipal, AuthenticatedPrincipalPort, RequestIdSource, TenantAccessDirectory } from './ports';

// Fakes of the three ports, for consumer tests. Synthetic ids only; no provider, no I/O, no clock,
// no randomness.

// A table-driven directory. A principal is admitted to a scope when:
// - the workspace exists and the principal is a member of it;
// - a named business exists, belongs to that workspace and is within the member's businesses
//   (a member with no `businesses` list reaches every business of the workspace);
// - a named page exists and belongs to that business.
export interface DirectoryTable {
  readonly workspaces: readonly string[];
  readonly members: readonly {
    readonly actor_id: string;
    readonly workspace_id: string;
    readonly businesses?: readonly string[];
  }[];
  readonly businesses: readonly { readonly business_profile_id: string; readonly workspace_id: string }[];
  readonly pages: readonly { readonly page_context_profile_id: string; readonly business_profile_id: string }[];
}

export interface RecordingDirectory extends TenantAccessDirectory {
  readonly calls: readonly TenantScope[];
}

export function tableTenantAccessDirectory(table: DirectoryTable): RecordingDirectory {
  const calls: TenantScope[] = [];
  const admitsNow = (principal: AuthenticatedPrincipal, scope: TenantScope): boolean => {
    if (!table.workspaces.includes(scope.workspace_id)) return false;
    const member = table.members.find((row) => row.actor_id === principal.id && row.workspace_id === scope.workspace_id);
    if (member === undefined) return false;
    if (scope.business_profile_id === undefined) return scope.page_context_profile_id === undefined;
    const business = table.businesses.find((row) => row.business_profile_id === scope.business_profile_id);
    if (business === undefined || business.workspace_id !== scope.workspace_id) return false;
    if (member.businesses !== undefined && !member.businesses.includes(business.business_profile_id)) return false;
    if (scope.page_context_profile_id === undefined) return true;
    const page = table.pages.find((row) => row.page_context_profile_id === scope.page_context_profile_id);
    return page !== undefined && page.business_profile_id === business.business_profile_id;
  };
  return {
    calls,
    admits(principal, scope) {
      calls.push(scope);
      return Promise.resolve(admitsNow(principal, scope));
    },
  };
}

// A directory whose every call rejects with the given value.
export function failingTenantAccessDirectory(failure: unknown): TenantAccessDirectory {
  return { admits: () => Promise.reject(failure) };
}

export function fixedPrincipal(principal: AuthenticatedPrincipal | null): AuthenticatedPrincipalPort {
  return { current: () => Promise.resolve(principal) };
}

export function failingPrincipal(failure: unknown): AuthenticatedPrincipalPort {
  return { current: () => Promise.reject(failure) };
}

// A deterministic id source: `<prefix>_000001`, `<prefix>_000002`, ...
export function sequentialRequestIdSource(prefix = 'id_synthetic'): RequestIdSource {
  let next = 0;
  return {
    mint() {
      next += 1;
      return `${prefix}_${String(next).padStart(6, '0')}`;
    },
  };
}
