import { defineStableError } from '../stable-error';

// The stable errors the outbox relay and the event consumer report, by code ONLY (a relay or consume
// report carries ids and codes; no record stores an error's text). Each code and message key is A0's
// inference, following domain/platform-errors.ts's convention (`errors.` prefix) until A5's message
// catalog exists. A code here is written from a definition in code, never from a thrown value.

// The publisher refused or failed to take an envelope (it threw, rejected, or did not settle as
// accepted). The entry stays unpublished and is published again by a later relay step.
export const OUTBOX_PUBLISH_FAILED = defineStableError({
  code: 'outbox.publish.failed',
  messageKey: 'errors.outbox.publish.failed',
  category: 'temporary',
  retryable: true,
});

// The outbox itself failed: reading the unpublished batch, or marking an entry published after the
// publisher took it. In the second case the entry stays unpublished and is published again: the
// at-least-once redelivery a consumer absorbs through its ledger.
export const OUTBOX_UNAVAILABLE = defineStableError({
  code: 'outbox.unavailable',
  messageKey: 'errors.outbox.unavailable',
  category: 'temporary',
  retryable: true,
});

// A delivered value that is not a CTR-EVT-001 envelope. Nothing is recorded and no handler runs.
export const EVENT_ENVELOPE_INVALID = defineStableError({
  code: 'event.envelope.invalid',
  messageKey: 'errors.event.envelope.invalid',
  category: 'validation',
  retryable: false,
});

// The consumer's handler threw, rejected, or returned something that is not an outcome (including a
// failure whose error platform-kernel did not mint). Its unit of work is rolled back: no ledger row,
// no effect, so a redelivery may run it again.
export const EVENT_CONSUMER_FAILED = defineStableError({
  code: 'event.consumer.failed',
  messageKey: 'errors.event.consumer.failed',
  category: 'internal',
  retryable: true,
});

// The consumer ledger failed before or while recording. Nothing is recorded.
export const EVENT_LEDGER_UNAVAILABLE = defineStableError({
  code: 'event.ledger.unavailable',
  messageKey: 'errors.event.ledger.unavailable',
  category: 'temporary',
  retryable: true,
});
