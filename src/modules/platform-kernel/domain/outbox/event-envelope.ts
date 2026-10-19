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
// contract's fields can ride along on an envelope the outbox stores. Each nested object is read once
// here; for a value a caller hands in, use readEnvelope, which reads every property once BEFORE the
// check (A1-302-1).
export function freezeEnvelope(event: EventEnvelope): EventEnvelope {
  const context = event.tenant_context;
  const actor = context.actor;
  const producer = event.producer;
  const subject = event.subject;
  const copy: EventEnvelope = {
    event_id: event.event_id,
    event_type: event.event_type,
    event_version: event.event_version,
    occurred_at: event.occurred_at,
    producer: Object.freeze({ module_key: producer.module_key, implementation_version: producer.implementation_version }),
    tenant_context: Object.freeze({
      workspace_id: context.workspace_id,
      ...(Object.hasOwn(context, 'business_profile_id') ? { business_profile_id: context.business_profile_id } : {}),
      ...(Object.hasOwn(context, 'page_context_profile_id') ? { page_context_profile_id: context.page_context_profile_id } : {}),
      actor: Object.freeze({ kind: actor.kind, id: actor.id }),
      request_id: context.request_id,
      correlation_id: context.correlation_id,
      ...(Object.hasOwn(context, 'causation_id') ? { causation_id: context.causation_id } : {}),
      locale: context.locale,
      timezone: context.timezone,
    }),
    subject: Object.freeze({ type: subject.type, id: subject.id, version: subject.version }),
    correlation_id: event.correlation_id,
    ...(Object.hasOwn(event, 'causation_id') ? { causation_id: event.causation_id } : {}),
    ...(Object.hasOwn(event, 'idempotency_key') ? { idempotency_key: event.idempotency_key } : {}),
    payload: Object.freeze({}),
    metadata: Object.freeze({ schema_ref: event.metadata.schema_ref }),
  };
  if (!checkEventEnvelope(copy)) throw new TypeError('event envelope: the envelope does not satisfy CTR-EVT-001');
  return Object.freeze(copy);
}

// The deepest object level an envelope has (envelope, tenant_context, actor) and some room: a
// deeper or cyclic value is not an envelope.
const SNAPSHOT_DEPTH = 8;

// One read of a caller's value: every own string-keyed property is read exactly once (a getter is
// called once, a proxy's ownKeys and getOwnPropertyDescriptor traps run once per key), into frozen
// plain data that keeps each property's enumerability, so the checker reads the copy exactly as it
// would have read the value. An array is replaced by an empty frozen array (no envelope level is an
// array, so the checker refuses it either way) and is not read.
function snapshotOnce(value: unknown, depth: number): unknown {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return Object.freeze([]);
  if (depth === 0) throw new TypeError('event envelope: the value nests deeper than an envelope');
  const copy: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') continue;
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) continue;
    const read = 'value' in descriptor ? descriptor.value : descriptor.get === undefined ? undefined : Reflect.apply(descriptor.get, value, []);
    Object.defineProperty(copy, key, { value: snapshotOnce(read, depth - 1), enumerable: descriptor.enumerable === true, writable: false, configurable: false });
  }
  return Object.freeze(copy);
}

// A1-302-1: the envelope a port, fake, relay or consumer may decide on, from a value a caller hands
// in. Every property is read once, the check runs on that copy, and the deep-frozen contract copy is
// returned; null when the value is not a CTR-EVT-001 envelope, including a value whose getter or
// proxy trap throws (nothing of what was thrown is kept). Every later decision reads the returned
// copy only, so a getter cannot answer the check and the decision differently.
export function readEnvelope(value: unknown): EventEnvelope | null {
  try {
    const data = snapshotOnce(value, SNAPSHOT_DEPTH);
    return checkEventEnvelope(data) ? freezeEnvelope(data) : null;
  } catch {
    return null;
  }
}

// The envelope a new event starts as, checked against CTR-EVT-001. A field outside the contract is a
// programming fault (TypeError, constant message, carrying nothing from the input).
export function newEvent(event: NewEvent, now: Instant): EventEnvelope {
  const occurredAt = timestampOf(instantFromMilliseconds(now));
  const invalid = (): TypeError => new TypeError('event envelope: the new event does not satisfy CTR-EVT-001');
  // The producer's spec, its producer, subject and context objects are the caller's: each property
  // is read once, and the envelope is built and checked from that copy only (A1-302-1).
  let spec: unknown;
  try {
    spec = snapshotOnce(event, SNAPSHOT_DEPTH);
  } catch {
    throw invalid();
  }
  if (!isObject(spec)) throw invalid();
  const context = spec.tenant_context;
  const envelope = {
    event_id: spec.event_id,
    event_type: spec.event_type,
    event_version: spec.event_version,
    occurred_at: occurredAt,
    producer: spec.producer,
    tenant_context: context,
    subject: spec.subject,
    correlation_id: isObject(context) ? context.correlation_id : undefined,
    ...(spec.causation_id === undefined ? {} : { causation_id: spec.causation_id }),
    ...(spec.idempotency_key === undefined ? {} : { idempotency_key: spec.idempotency_key }),
    payload: {},
    metadata: { schema_ref: spec.schema_ref },
  };
  if (!checkEventEnvelope(envelope)) throw invalid();
  return freezeEnvelope(envelope);
}
