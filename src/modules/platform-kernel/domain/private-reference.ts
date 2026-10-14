// The private-reference rule CTR-API-001 (accepted.status_ref, accepted.deep_link_ref) and
// CTR-IDM-001 (result_ref) share: an allow-listed scheme and a body of dot-separated identifier
// segments, at most 256 code points. The source string is pinned against both schemas by
// domain/contract-fixtures.test.ts.

import { codePointLength } from './json-shape';

export const PRIVATE_REFERENCE_PATTERN_SOURCE =
  '^(job|status|result|app|asset|content):[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*(?:/[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*)*$';
export const PRIVATE_REFERENCE_MAX_LENGTH = 256;

const PRIVATE_REFERENCE = new RegExp(PRIVATE_REFERENCE_PATTERN_SOURCE, 'u');

export const isPrivateReference = (value: unknown): value is string =>
  typeof value === 'string'
  && PRIVATE_REFERENCE.test(value)
  && codePointLength(value) <= PRIVATE_REFERENCE_MAX_LENGTH;
