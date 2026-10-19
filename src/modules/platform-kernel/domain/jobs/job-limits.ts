// The job worker's operational limits, in ONE place. Every number below is D6 PROVISIONAL: the
// Owner's G1 decisions leave "lease length, per-round budget, retry/backoff numbers" unset and
// assign them to WP-1A-A0-004 (evidence/WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-
// and-g1-decisions.md:151; OPEN-019). They are test values, A0's inference, chosen only so the
// decisions can be exercised; they are set, with the Vercel function-duration measurement, before
// the dispatcher increment (manifest open_blockers, "DECISION OWED, D6 operational limits"). The
// decisions take a `JobLimits` parameter, so no caller is bound to these values.

export interface JobLimits {
  // Added to a job's own timeout_seconds when a claim grants its lease, so a handler that stays
  // within its timeout keeps the lease without a heartbeat, and a crashed worker's job becomes
  // reclaimable once timeout + grace has passed. D6 provisional.
  readonly leaseGraceSeconds: number;
  // How far a heartbeat moves a held lease's expiry from the heartbeat's instant (never earlier
  // than the expiry it already has). D6 provisional.
  readonly heartbeatLeaseSeconds: number;
  // The retry back-off after the n-th failed attempt is min(retryMaxDelaySeconds,
  // retryBaseDelaySeconds * retryBackoffFactor^(n-1)): bounded, exponential, with no jitter
  // (jitter needs randomness, which a pure decision does not read; whether the dispatcher adds it
  // is a D6 question). D6 provisional.
  readonly retryBaseDelaySeconds: number;
  readonly retryBackoffFactor: number;
  readonly retryMaxDelaySeconds: number;
}

// D6 provisional (A0's inference; test values only).
export const D6_PROVISIONAL_JOB_LIMITS: JobLimits = Object.freeze({
  leaseGraceSeconds: 30,
  heartbeatLeaseSeconds: 60,
  retryBaseDelaySeconds: 30,
  retryBackoffFactor: 2,
  retryMaxDelaySeconds: 3600,
});

const isPositiveInteger = (value: number): boolean => Number.isSafeInteger(value) && value >= 1;

// A limits object a decision may use: whole positive seconds, a factor of at least 1, and a maximum
// delay no smaller than the base.
export const checkJobLimits = (limits: JobLimits): boolean =>
  isPositiveInteger(limits.leaseGraceSeconds)
  && isPositiveInteger(limits.heartbeatLeaseSeconds)
  && isPositiveInteger(limits.retryBaseDelaySeconds)
  && isPositiveInteger(limits.retryBackoffFactor)
  && isPositiveInteger(limits.retryMaxDelaySeconds)
  && limits.retryMaxDelaySeconds >= limits.retryBaseDelaySeconds;

// A1-301-I3: the most a producer may ask for. D6 PROVISIONAL (A0's inference; test values only).
// These are KERNEL POLICY, NOT A CONTRACT RULE: CTR-JOB-001's schema gives `max_attempts` and
// `timeout_seconds` `minimum: 1` and no maximum, so a record above them still satisfies the contract
// (checkJobRecord accepts it, and so does 050's app.jobs); only the kernel's enqueue refuses to create
// one (JOB_ENQUEUE_OVER_CAP), so a crashed worker's job is never unreclaimable for longer than the
// cap plus the grace. Set with the other D6 limits before the dispatcher increment (manifest
// open_blockers).
export const D6_PROVISIONAL_MAX_ATTEMPTS_CAP = 20;
export const D6_PROVISIONAL_TIMEOUT_SECONDS_CAP = 900;

// The request stays within the kernel's provisional caps.
export const withinEnqueueCaps = (maxAttempts: number, timeoutSeconds: number): boolean =>
  maxAttempts <= D6_PROVISIONAL_MAX_ATTEMPTS_CAP && timeoutSeconds <= D6_PROVISIONAL_TIMEOUT_SECONDS_CAP;
