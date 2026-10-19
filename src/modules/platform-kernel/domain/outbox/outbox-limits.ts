// The outbox relay's operational limits, in ONE place. Every number below is D6 PROVISIONAL, like
// domain/jobs/job-limits.ts: the Owner's G1 decisions leave the per-round budget unset and assign it
// to WP-1A-A0-004 (evidence/WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-
// decisions.md:151; OPEN-019). It is a test value, A0's inference, chosen only so the relay can be
// exercised; it is set with the other D6 limits before the dispatcher increment. relayOnce takes an
// `OutboxLimits` parameter, so no caller is bound to it.

export interface OutboxLimits {
  // The most unpublished entries one relay step reads and publishes. D6 provisional.
  readonly relayBatchSize: number;
}

// D6 provisional (A0's inference; test value only).
export const D6_PROVISIONAL_OUTBOX_LIMITS: OutboxLimits = Object.freeze({
  relayBatchSize: 50,
});

export const checkOutboxLimits = (limits: OutboxLimits): boolean =>
  Number.isSafeInteger(limits.relayBatchSize) && limits.relayBatchSize >= 1;
