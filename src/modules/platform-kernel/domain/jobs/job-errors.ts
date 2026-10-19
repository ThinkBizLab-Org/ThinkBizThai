import { defineStableError } from '../stable-error';

// The stable errors the job worker writes, as `last_error_code` ONLY (CTR-JOB-001 stores a code and
// nothing else). Each code and message key is A0's inference, following domain/platform-errors.ts's
// convention (`errors.` prefix) until A5's message catalog exists. A code here is written from a
// definition in code, never from a thrown value or from a handler's own text.

// The handler did not finish within the job's timeout_seconds. The worker discards any result it
// returned late.
export const JOB_TIMEOUT = defineStableError({
  code: 'job.timeout',
  messageKey: 'errors.job.timeout',
  category: 'temporary',
  retryable: true,
});

// The handler threw, rejected, or returned something that is not an outcome (including a failure
// whose error this module did not mint, or a result_ref outside the private-reference rule).
// Carries nothing from what it threw or returned.
export const JOB_HANDLER_FAILED = defineStableError({
  code: 'job.handler.failed',
  messageKey: 'errors.job.handler.failed',
  category: 'internal',
  retryable: true,
});

// No handler is registered for the job's job_type (an own property of the worker's handler table).
export const JOB_TYPE_UNKNOWN = defineStableError({
  code: 'job.type.unknown',
  messageKey: 'errors.job.type.unknown',
  category: 'internal',
  retryable: true,
});

// A1-301-I3: an enqueue asked for more attempts or a longer timeout than the kernel's D6-provisional
// caps (job-limits.ts). Kernel policy, not a CTR-JOB-001 rule. Nothing is created; enqueue rejects
// with a stable error minted from this definition, carrying the request's correlation id only.
export const JOB_ENQUEUE_OVER_CAP = defineStableError({
  code: 'job.enqueue.over_cap',
  messageKey: 'errors.job.enqueue.over_cap',
  category: 'validation',
  retryable: false,
});
