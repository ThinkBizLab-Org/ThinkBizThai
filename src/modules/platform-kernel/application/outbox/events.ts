import { newEvent, type EventEnvelope, type EventProducer, type EventSubject } from '../../domain/outbox/event-envelope';
import { isMintedTenantContext, tenantContextRecordOf, type TenantContext } from '../tenant-context';
import type { EventIdSource, OutboxClock } from './outbox-port';

// Building an event for the outbox. The tenant context is one the resolver minted
// (isMintedTenantContext): an event carries the context of the request whose unit of work produces
// it, never one built by hand, so its scope is the scope the directory admitted.

export interface EventSpec {
  readonly event_type: string;
  readonly event_version: number;
  readonly producer: EventProducer;
  readonly subject: EventSubject;
  readonly causation_id?: string;
  readonly idempotency_key?: string;
  readonly schema_ref: string;
}

export interface EventBuilderDependencies {
  readonly clock: OutboxClock;
  readonly ids: EventIdSource;
}

export function buildEvent(dependencies: EventBuilderDependencies, context: TenantContext, spec: EventSpec): EventEnvelope {
  if (!isMintedTenantContext(context)) throw new TypeError('outbox: the tenant context was not minted by the resolver');
  return newEvent({
    event_id: dependencies.ids.mint(),
    event_type: spec.event_type,
    event_version: spec.event_version,
    producer: spec.producer,
    tenant_context: tenantContextRecordOf(context),
    subject: spec.subject,
    ...(spec.causation_id === undefined ? {} : { causation_id: spec.causation_id }),
    ...(spec.idempotency_key === undefined ? {} : { idempotency_key: spec.idempotency_key }),
    schema_ref: spec.schema_ref,
  }, dependencies.clock.now());
}
