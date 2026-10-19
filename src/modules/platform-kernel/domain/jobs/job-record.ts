import { hasOnlyKeys, hasRequired, isDateTime, isInteger, isObject, isStringWithin, optional, type JsonObject } from '../json-shape';
import { isPrivateReference } from '../private-reference';
import { checkTenantContext, type TenantContextRecord } from '../tenant-context';

// CTR-JOB-001 (Background Job Envelope), contract-catalog/shared-kernel/ctr-job-001/schema.json: the
// record and a checker that accepts exactly what the shipped schema accepts, composing CTR-TEN-001
// as the schema's $ref does. The record has NO status field, and the contract's freeze_boundary
// reserves lifecycle state names to owner review, so nothing here names a state; the decisions over
// a record (job-decisions.ts) read its timestamps and counters only.
//
// The schema bounds job_id and dedupe_key at 128 and input_ref/result_ref at 256, and gives
// job_type, lease_owner, progress_stage and last_error_code `minLength: 1` and no maximum. The
// checker holds exactly that; it adds no bound the contract does not state (050_async_kernel.sql's
// header reports the four unbounded fields to the contract's owner).

export const JOB_ID_MAX_LENGTH = 128;
export const JOB_DEDUPE_KEY_MAX_LENGTH = 128;
export const JOB_PROGRESS_PERCENT_MAX = 100;

export interface JobRecord {
  readonly job_id: string;
  readonly job_type: string;
  readonly job_version: number;
  readonly tenant_context: TenantContextRecord;
  readonly priority: number;
  readonly available_at: string;
  readonly attempt: number;
  readonly max_attempts: number;
  readonly timeout_seconds: number;
  readonly lease_owner?: string;
  readonly lease_expires_at?: string;
  readonly dedupe_key: string;
  readonly cancel_requested_at?: string;
  readonly input_ref: string;
  readonly result_ref?: string;
  readonly progress_percent: number;
  readonly progress_stage: string;
  readonly last_error_code?: string;
}

// The key lists below are pinned to the schema's properties and required by
// domain/jobs/job-record.test.ts.
export const JOB_KEYS = [
  'job_id',
  'job_type',
  'job_version',
  'tenant_context',
  'priority',
  'available_at',
  'attempt',
  'max_attempts',
  'timeout_seconds',
  'lease_owner',
  'lease_expires_at',
  'dedupe_key',
  'cancel_requested_at',
  'input_ref',
  'result_ref',
  'progress_percent',
  'progress_stage',
  'last_error_code',
] as const;

export const JOB_REQUIRED = [
  'job_id',
  'job_type',
  'job_version',
  'tenant_context',
  'priority',
  'available_at',
  'attempt',
  'max_attempts',
  'timeout_seconds',
  'dedupe_key',
  'input_ref',
  'progress_percent',
  'progress_stage',
] as const;

const nonEmpty = (value: unknown): boolean => isStringWithin(value, 1);
const integerFrom = (minimum: number) => (value: unknown): boolean => isInteger(value) && value >= minimum;

export const isProgressPercent = (value: unknown): value is number =>
  isInteger(value) && value >= 0 && value <= JOB_PROGRESS_PERCENT_MAX;

export function checkJobRecord(value: unknown): value is JobRecord {
  if (!isObject(value)) return false;
  const record: JsonObject = value;
  return hasRequired(record, JOB_REQUIRED)
    && hasOnlyKeys(record, JOB_KEYS)
    && isStringWithin(record.job_id, 1, JOB_ID_MAX_LENGTH)
    && nonEmpty(record.job_type)
    && integerFrom(1)(record.job_version)
    && checkTenantContext(record.tenant_context)
    && isInteger(record.priority)
    && isDateTime(record.available_at)
    && integerFrom(0)(record.attempt)
    && integerFrom(1)(record.max_attempts)
    && integerFrom(1)(record.timeout_seconds)
    && optional(record, 'lease_owner', nonEmpty)
    && optional(record, 'lease_expires_at', isDateTime)
    && isStringWithin(record.dedupe_key, 1, JOB_DEDUPE_KEY_MAX_LENGTH)
    && optional(record, 'cancel_requested_at', isDateTime)
    && isPrivateReference(record.input_ref)
    && optional(record, 'result_ref', isPrivateReference)
    && isProgressPercent(record.progress_percent)
    && nonEmpty(record.progress_stage)
    && optional(record, 'last_error_code', nonEmpty);
}
