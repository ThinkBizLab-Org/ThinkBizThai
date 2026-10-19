import { instantFromMilliseconds, timestampOf, type Instant } from '../jobs/job-decisions';
import { hasOnlyKeys, hasRequired, isDateTime, isInteger, isObject, isStringWithin, matches, optional, type JsonObject } from '../json-shape';
import { checkTenantContext, type TenantContextRecord } from '../tenant-context';

// CTR-EVT-001 (Domain Event Envelope), contract-catalog/shared-kernel/ctr-evt-001/schema.json: the
// envelope and a checker that accepts exactly what the shipped schema accepts, composing CTR-TEN-001
// as the schema's $ref does. The contract's freeze_boundary permits no payload business fields
// ("payload" is an object with maxProperties 0) and limits metadata to a schema reference, so the
// envelope carries identity, routing and scope only.
//
// The schema does not require the top-level correlation_id to equal tenant_context.correlation_id,
// so the checker does not either; the builder below (newEvent) writes the context's own id, which is
// the builder's choice, not a rule the checker adds.

export const EVENT_ID_MAX_LENGTH = 128;
export const EVENT_TYPE_MAX_LENGTH = 128;
export const EVENT_TYPE_PATTERN_SOURCE = '^[a-z0-9]+\\.[a-z0-9]+\\.[a-z0-9]+$';
export const EVENT_PRODUCER_FIELD_MAX_LENGTH = 64;
export const EVENT_SUBJECT_TYPE_MAX_LENGTH = 64;
export const EVENT_SUBJECT_ID_MAX_LENGTH = 128;
export const EVENT_CORRELATION_ID_MAX_LENGTH = 128;
export const EVENT_IDEMPOTENCY_KEY_MAX_LENGTH = 200;
export const EVENT_SCHEMA_REF_PATTERN_SOURCE = '^CTR-[A-Z]{3}-[0-9]{3}@(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$';
export const EVENT_SCHEMA_REF_MAX_LENGTH = 32;

const EVENT_TYPE = new RegExp(EVENT_TYPE_PATTERN_SOURCE, 'u');
const SCHEMA_REF = new RegExp(EVENT_SCHEMA_REF_PATTERN_SOURCE, 'u');

export interface EventProducer {
  readonly module_key: string;
  readonly implementation_version: string;
}

export interface EventSubject {
  readonly type: string;
  readonly id: string;
  readonly version: number;
}

export type EmptyPayload = { readonly [key: string]: never };

export interface EventMetadata {
  readonly schema_ref: string;
}

export interface EventEnvelope {
  readonly event_id: string;
  readonly event_type: string;
  readonly event_version: number;
  readonly occurred_at: string;
  readonly producer: EventProducer;
  readonly tenant_context: TenantContextRecord;
  readonly subject: EventSubject;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly idempotency_key?: string;
  readonly payload: EmptyPayload;
  readonly metadata: EventMetadata;
}

// The key lists below are pinned to the schema's properties and required, at every object level the
// schema closes, by domain/outbox/event-envelope.test.ts.
export const EVENT_KEYS = [
  'event_id',
  'event_type',
  'event_version',
  'occurred_at',
  'producer',
  'tenant_context',
  'subject',
  'correlation_id',
  'causation_id',
  'idempotency_key',
  'payload',
  'metadata',
] as const;

export const EVENT_REQUIRED = [
  'event_id',
  'event_type',
  'event_version',
  'occurred_at',
  'producer',
  'tenant_context',
  'subject',
  'correlation_id',
  'payload',
  'metadata',
] as const;

export const EVENT_PRODUCER_KEYS = ['module_key', 'implementation_version'] as const;
export const EVENT_SUBJECT_KEYS = ['type', 'id', 'version'] as const;
export const EVENT_METADATA_KEYS = ['schema_ref'] as const;

const boundedId = (value: unknown): boolean => isStringWithin(value, 1, EVENT_CORRELATION_ID_MAX_LENGTH);
const positiveInteger = (value: unknown): boolean => isInteger(value) && value >= 1;

export const isEventType = (value: unknown): value is string =>
  matches(value, EVENT_TYPE) && isStringWithin(value, 0, EVENT_TYPE_MAX_LENGTH);

// metadata.schema_ref has a pattern and a maximum and, deliberately, no minLength (the schema's
// x-source: the pattern already needs seventeen characters).
export const isSchemaRef = (value: unknown): value is string =>
  matches(value, SCHEMA_REF) && isStringWithin(value, 0, EVENT_SCHEMA_REF_MAX_LENGTH);

const checkProducer = (value: unknown): value is EventProducer =>
  isObject(value)
  && hasRequired(value, EVENT_PRODUCER_KEYS)
  && hasOnlyKeys(value, EVENT_PRODUCER_KEYS)
  && isStringWithin(value.module_key, 1, EVENT_PRODUCER_FIELD_MAX_LENGTH)
  && isStringWithin(value.implementation_version, 1, EVENT_PRODUCER_FIELD_MAX_LENGTH);

const checkSubject = (value: unknown): value is EventSubject =>
  isObject(value)
  && hasRequired(value, EVENT_SUBJECT_KEYS)
  && hasOnlyKeys(value, EVENT_SUBJECT_KEYS)
  && isStringWithin(value.type, 1, EVENT_SUBJECT_TYPE_MAX_LENGTH)
  && isStringWithin(value.id, 1, EVENT_SUBJECT_ID_MAX_LENGTH)
  && positiveInteger(value.version);

// "payload": an object with no properties at all (maxProperties 0, counted over own keys).
const checkPayload = (value: unknown): value is EmptyPayload => isObject(value) && Object.keys(value).length === 0;

const checkMetadata = (value: unknown): value is EventMetadata =>
  isObject(value)
  && hasRequired(value, EVENT_METADATA_KEYS)
  && hasOnlyKeys(value, EVENT_METADATA_KEYS)
  && isSchemaRef(value.schema_ref);

export function checkEventEnvelope(value: unknown): value is EventEnvelope {
  if (!isObject(value)) return false;
  const record: JsonObject = value;
  return hasRequired(record, EVENT_REQUIRED)
    && hasOnlyKeys(record, EVENT_KEYS)
    && isStringWithin(record.event_id, 1, EVENT_ID_MAX_LENGTH)
    && isEventType(record.event_type)
    && positiveInteger(record.event_version)
    && isDateTime(record.occurred_at)
    && checkProducer(record.producer)
    && checkTenantContext(record.tenant_context)
    && checkSubject(record.subject)
    && boundedId(record.correlation_id)
    && optional(record, 'causation_id', boundedId)
    && optional(record, 'idempotency_key', (key) => isStringWithin(key, 1, EVENT_IDEMPOTENCY_KEY_MAX_LENGTH))
    && checkPayload(record.payload)
    && checkMetadata(record.metadata);
}

// What a producer gives a new event. The rest is fixed by the builder: occurred_at is the supplied
// instant, correlation_id is the tenant context's own, payload is empty and metadata names the
// schema only (the freeze boundary).
export interface NewEvent {
  readonly event_id: string;
  readonly event_type: string;
  readonly event_version: number;
  readonly producer: EventProducer;
  readonly tenant_context: TenantContextRecord;
  readonly subject: EventSubject;
  readonly causation_id?: string;
  readonly idempotency_key?: string;
  readonly schema_ref: string;
}

// A deep-frozen copy built field by field from the named properties only, so nothing but the
// contract's fields can ride along on an envelope the outbox stores.
export function freezeEnvelope(event: EventEnvelope): EventEnvelope {
  const context = event.tenant_context;
  const copy: EventEnvelope = {
    event_id: event.event_id,
    event_type: event.event_type,
    event_version: event.event_version,
    occurred_at: event.occurred_at,
    producer: Object.freeze({ module_key: event.producer.module_key, implementation_version: event.producer.implementation_version }),
    tenant_context: Object.freeze({
      workspace_id: context.workspace_id,
      ...(Object.hasOwn(context, 'business_profile_id') ? { business_profile_id: context.business_profile_id } : {}),
      ...(Object.hasOwn(context, 'page_context_profile_id') ? { page_context_profile_id: context.page_context_profile_id } : {}),
      actor: Object.freeze({ kind: context.actor.kind, id: context.actor.id }),
      request_id: context.request_id,
      correlation_id: context.correlation_id,
      ...(Object.hasOwn(context, 'causation_id') ? { causation_id: context.causation_id } : {}),
      locale: context.locale,
      timezone: context.timezone,
    }),
    subject: Object.freeze({ type: event.subject.type, id: event.subject.id, version: event.subject.version }),
    correlation_id: event.correlation_id,
    ...(Object.hasOwn(event, 'causation_id') ? { causation_id: event.causation_id } : {}),
    ...(Object.hasOwn(event, 'idempotency_key') ? { idempotency_key: event.idempotency_key } : {}),
    payload: Object.freeze({}),
    metadata: Object.freeze({ schema_ref: event.metadata.schema_ref }),
  };
  if (!checkEventEnvelope(copy)) throw new TypeError('event envelope: the envelope does not satisfy CTR-EVT-001');
  return Object.freeze(copy);
}

// The envelope a new event starts as, checked against CTR-EVT-001. A field outside the contract is a
// programming fault (TypeError, constant message, carrying nothing from the input).
export function newEvent(event: NewEvent, now: Instant): EventEnvelope {
  const occurredAt = timestampOf(instantFromMilliseconds(now));
  const envelope = {
    event_id: event.event_id,
    event_type: event.event_type,
    event_version: event.event_version,
    occurred_at: occurredAt,
    producer: event.producer,
    tenant_context: event.tenant_context,
    subject: event.subject,
    correlation_id: event.tenant_context.correlation_id,
    ...(event.causation_id === undefined ? {} : { causation_id: event.causation_id }),
    ...(event.idempotency_key === undefined ? {} : { idempotency_key: event.idempotency_key }),
    payload: {},
    metadata: { schema_ref: event.schema_ref },
  };
  if (!checkEventEnvelope(envelope)) throw new TypeError('event envelope: the new event does not satisfy CTR-EVT-001');
  return freezeEnvelope(envelope);
}
