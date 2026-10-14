import { defineStableError } from './stable-error';

// The stable errors platform-kernel itself raises. Every code and message key here is A0's
// inference (manifest open_blockers, Q6): no error-code or message-key taxonomy exists, and until
// A5's message catalog does, the keys follow ctr-err-001's fixtures (`errors.` prefix).

// No authenticated principal, or one outside the minted shape (an actor kind outside the enum, an
// id outside the resolver's id pattern).
export const TENANT_UNAUTHENTICATED = defineStableError({
  code: 'tenant.unauthenticated',
  messageKey: 'errors.tenant.unauthenticated',
  category: 'auth',
  retryable: false,
});

// The ONE error for a scope the directory does not admit: a workspace, business or page that does
// not exist, belongs to another tenant, or that this principal is not a member of. One definition,
// so the answers cannot differ and existence is not revealed.
export const TENANT_SCOPE_DENIED = defineStableError({
  code: 'tenant.scope.denied',
  messageKey: 'errors.tenant.scope.denied',
  category: 'permission',
  retryable: false,
});

// A selection that is not a scope selection at all: not an object, a key other than the three
// scope keys (a client-supplied actor, locale, timezone or id among them), a non-string id, or a
// page without a business.
export const TENANT_SELECTION_INVALID = defineStableError({
  code: 'tenant.selection.invalid',
  messageKey: 'errors.tenant.selection.invalid',
  category: 'validation',
  retryable: false,
});

// A dependency failed (the directory, the principal source, a principal whose read throws).
// Carries nothing from the failure.
export const PLATFORM_TEMPORARY = defineStableError({
  code: 'platform.temporary',
  messageKey: 'errors.platform.temporary',
  category: 'temporary',
  retryable: true,
});

// Anything unexpected. Carries nothing from what was thrown.
export const PLATFORM_INTERNAL = defineStableError({
  code: 'platform.internal',
  messageKey: 'errors.platform.internal',
  category: 'internal',
  retryable: false,
});

// The same idempotency key, in the same scope, with a different payload hash (CTR-IDM-001's
// freeze_boundary: "payload-hash mismatch is a conflict", expressed through category `conflict`).
export const IDEMPOTENCY_CONFLICT = defineStableError({
  code: 'idempotency.conflict',
  messageKey: 'errors.idempotency.conflict',
  category: 'conflict',
  retryable: false,
});
