// RLS assertion helpers (data package §12.3 item 7): row visibility and mutation denial.
//
// The distinction this module exists to enforce, and the one the data package's own smoke set
// blurs:
//
//   * A SELECT that RLS filters returns ZERO ROWS. It is not an error.
//   * An INSERT, UPDATE or DELETE that RLS refuses raises an ERROR (SQLSTATE 42501).
//
// So "the query came back empty" and "the database refused" are different outcomes, and only one
// of them is evidence. A helper that treats an empty result as denial passes identically when:
//
//   - RLS is working and correctly hid the row, and
//   - RLS is entirely OFF and the row simply does not exist.
//
// The second is the state a fresh test database is in. An isolation suite written against such a
// helper is green on a database with no policies at all — which is the shape of every false clean
// run this repository has spent its history removing, arriving on the surface where a false pass
// means one tenant's rows reaching another.
//
// Hence: `expectDenied` requires an error and checks its code. `expectNoRows` is a separate,
// weaker assertion, and it refuses to be used where a denial is what the rule demands.

export const INSUFFICIENT_PRIVILEGE = '42501';

// Postgres reports an RLS refusal on a write as insufficient_privilege. A check constraint, a
// not-null violation or a foreign key failure are different codes and different bugs; treating any
// error as "denied" would let a typo in the fixture masquerade as a working policy.
const DENIAL_CODES = new Set([INSUFFICIENT_PRIVILEGE]);

export class AssertionOutcome extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'AssertionOutcome';
    this.detail = detail;
  }
}

// Classify what actually happened, without deciding whether it is what was wanted.
// `result` is { rows, error } as any driver would report it: error carries `code` when the
// database raised one.
export function classify(result) {
  if (result?.error) {
    const code = result.error.code ?? null;
    return DENIAL_CODES.has(code)
      ? { kind: 'denied', code }
      : { kind: 'errored', code, message: result.error.message ?? '' };
  }
  const rows = result?.rows ?? [];
  return rows.length === 0 ? { kind: 'empty', rows: 0 } : { kind: 'rows', rows: rows.length };
}

// The strong assertion. Use it wherever the rule is "may not", which is every `N` cell in the
// access matrix and every mutation in §12.6 assertions 3, 4, 5 and 7.
export function expectDenied(result, what) {
  const outcome = classify(result);
  if (outcome.kind === 'denied') return outcome;
  if (outcome.kind === 'empty') {
    throw new AssertionOutcome(
      `${what}: the database returned zero rows rather than refusing. An empty result is NOT a denial — `
      + 'it is also what a database with no policies at all returns when the row does not exist, so this '
      + 'assertion would pass with RLS entirely off. A mutation that must be refused has to raise '
      + `${INSUFFICIENT_PRIVILEGE}.`, outcome);
  }
  if (outcome.kind === 'rows') {
    throw new AssertionOutcome(`${what}: ${outcome.rows} row(s) came back. The operation was permitted.`, outcome);
  }
  throw new AssertionOutcome(
    `${what}: the database raised ${outcome.code ?? 'an error with no code'}, which is not an RLS refusal. `
    + 'A constraint violation or a malformed fixture is a different bug and must not be read as a working policy: '
    + outcome.message, outcome);
}

// The weak assertion, for reads only. §12.6 assertions 1, 2, 5 and 6 are visibility rules, and a
// filtered SELECT legitimately returns nothing.
//
// It is weaker on purpose, and saying so is the point: passing here does NOT establish that a
// policy did the filtering. Pair it with a positive assertion — the same identity CAN see its own
// rows — or the suite cannot tell a working policy from an empty table.
export function expectNoRows(result, what) {
  const outcome = classify(result);
  if (outcome.kind === 'empty') return outcome;
  if (outcome.kind === 'rows') {
    throw new AssertionOutcome(`${what}: ${outcome.rows} row(s) were visible and none should have been.`, outcome);
  }
  throw new AssertionOutcome(
    `${what}: expected an empty read, got ${outcome.kind}${outcome.code ? ` (${outcome.code})` : ''}. `
    + 'A read that errors is not a read that was filtered.', outcome);
}

export function expectRows(result, what, atLeast = 1) {
  const outcome = classify(result);
  if (outcome.kind === 'rows' && outcome.rows >= atLeast) return outcome;
  if (outcome.kind === 'empty') {
    throw new AssertionOutcome(
      `${what}: nothing was visible. Without this, a suite cannot distinguish a policy that filters `
      + 'correctly from a table that is simply empty, and every negative assertion beside it is vacuous.', outcome);
  }
  throw new AssertionOutcome(`${what}: expected rows, got ${outcome.kind}${outcome.code ? ` (${outcome.code})` : ''}.`, outcome);
}

// A visibility rule is only proven by BOTH halves: the identity sees what it should, and does not
// see what it should not. Either half alone passes on a database where RLS does nothing.
export function expectVisibleOnly(seen, hidden, what) {
  expectRows(seen, `${what}: own rows visible`);
  expectNoRows(hidden, `${what}: other tenant's rows hidden`);
  return { kind: 'isolated' };
}
