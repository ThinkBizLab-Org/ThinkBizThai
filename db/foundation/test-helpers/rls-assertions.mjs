// RLS assertion helpers (data package §12.3 item 7): row visibility and mutation denial.
//
// The distinction this module exists to enforce, and the one the data package's own smoke set
// blurs:
//
//   * A SELECT that RLS filters returns ZERO ROWS. It is not an error.
//   * A write REJECTED BY A `WITH CHECK` CLAUSE raises an ERROR (SQLSTATE 42501). That is an
//     INSERT, or an UPDATE whose resulting row fails the check.
//   * A write FILTERED BY A `USING` CLAUSE raises NOTHING. The UPDATE or DELETE simply matches no
//     row, reports zero rows affected, and succeeds.
//
// The first version of this comment said flatly that a refused write raises 42501. **That is only
// true of WITH CHECK.** A1 found it while writing the first real isolation suite, and the error
// matters in both directions: a suite demanding `expectDenied` on every mutation FAILS against a
// correct database wherever the rule is expressed with USING -- which is most of the negative cases
// in the access matrix -- and the obvious repair, downgrading those to `expectNoRows`, walks
// straight into the trap this module exists to close.
//
// So there are three outcomes for a write, not two, and the third needs its own assertion:
// `expectNoEffect`, which pairs the empty result with a WITNESS READ proving the target row still
// exists and still carries its original value. That is strictly stronger than `expectNoRows`: it
// fails when RLS is off (the write lands and the witness sees the change) and it fails when the
// fixture never loaded (the witness sees nothing).
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


// A write that a USING clause filtered: nothing was raised, nothing was changed, and the target
// row is still there unchanged. All three have to hold. The witness is what separates this from
// `expectNoRows`, which cannot tell "the policy filtered it" from "the row was never there".
//
// `witness` is the result of re-reading the target row as an identity that CAN see it — the
// fixture loader or an owner — not as the identity under test, which by construction cannot.
export function expectNoEffect(result, witness, expected, what) {
  const outcome = classify(result);
  if (outcome.kind === 'denied') {
    // Not a failure of the rule, but not this assertion either: a WITH CHECK refusal is a
    // stronger outcome and belongs to expectDenied. Saying so keeps the two from blurring.
    throw new AssertionOutcome(
      `${what}: the write was refused with ${outcome.code} rather than filtered. That is a WITH CHECK `
      + 'rejection and is asserted with expectDenied; using the weaker assertion here would hide which '
      + 'clause is doing the work.', outcome);
  }
  if (outcome.kind === 'rows') {
    throw new AssertionOutcome(`${what}: the write affected ${outcome.rows} row(s). It was not filtered.`, outcome);
  }
  if (outcome.kind === 'errored') {
    throw new AssertionOutcome(
      `${what}: the write raised ${outcome.code ?? 'an error with no code'}, which is neither a filter nor an `
      + `RLS refusal: ${outcome.message}`, outcome);
  }

  // The empty result is necessary and not sufficient. The witness carries the rest.
  const witnessOutcome = classify(witness);
  if (witnessOutcome.kind !== 'rows') {
    throw new AssertionOutcome(
      `${what}: the write affected nothing, but the witness read cannot see the target row either `
      + `(${witnessOutcome.kind}). An empty write against a row that does not exist proves nothing — `
      + 'the fixture did not load, and every assertion in this suite is vacuous.', witnessOutcome);
  }
  const actual = witness.rows[0];
  for (const [column, value] of Object.entries(expected ?? {})) {
    if (actual[column] !== value) {
      throw new AssertionOutcome(
        `${what}: the write reported zero rows, but ${column} is now ${JSON.stringify(actual[column])} `
        + `and should still be ${JSON.stringify(value)}. The row changed, so the write was not filtered — `
        + 'this is what an assertion sees when RLS is off.', { column, actual: actual[column], expected: value });
    }
  }
  return { kind: 'no-effect', witnessed: Object.keys(expected ?? {}).length };
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
