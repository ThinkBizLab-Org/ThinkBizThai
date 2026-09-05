# RFC-2026-016 — The RLS policy set denies every service operation, and the platform it runs on

Status: Proposed — awaiting Product Owner disposition and A0 countersignature
Date: 2026-09-04
Author: /claude/a0_atlas (A0), on A1's security analysis of DATA-DEC-03
Affects: the data package §8.5 RLS baseline; records the database platform; advances `DATA-DEC-03`

## 1. The defect

The data package specifies, in §8.5, that a tenant policy is written **`TO authenticated`**, and
that anonymous has no tenant policy. Policies are specified for exactly one role.

The same document, in §8.2 through §8.4, marks a long list of operations **`S` — service/worker
only**: research run, source and evidence inserts; asset hard purge; raw token and webhook reads;
publish delivery, post and metric inserts; notification insert and delivery state; internal job,
attempt and DLQ rows; usage ledger writes; audit and security inserts.

`RFC-2026-012`, **approved 2026-09-02**, commits the whole client/database boundary to running
under `FORCE ROW LEVEL SECURITY`.

Put together: **under forced RLS with a policy set naming only `authenticated`, every one of those
service operations is denied.** Deny-by-default denies, because no policy matches a service role.

The only way to make the specification as written actually run is for the service path to bypass
RLS — which is the precise thing forcing exists to prevent. This is not a projected regression. It
is the current state of the specification, found before any migration was written.

## 2. The fix

Amend §8.5: a policy is `TO authenticated` for user paths **and `TO <service role>` for each
operation the matrix already marks `S`**, with the service policy scoped by a server-set workspace
GUC derived from the server-resolved tenant context `CTR-TEN-001` already requires.

**This introduces no new permission.** Every `S` cell already says the service may perform that
operation. The amendment only makes it expressible without a bypass.

Rejected alternative: the service assumes `authenticated` with a synthetic claim. It makes
`auth.uid()` null or synthetic on exactly the path that must be auditable, and collapses the two
actor identities the audit trail exists to tell apart.

This is an RLS change and therefore RFC-gated. It lands with DB-00, and it must land **in batch
`000`**: DB-00's schema lint is where the assertion physically lives, migration invariant 1 forbids
rewriting a merged migration, and a lint that codifies the `authenticated`-only shape would be
inherited by every batch from `010` to `180`. Closing it later is a forward fix across twenty-odd
batches instead of one line at the start.

## 3. The platform

The Product Owner decided on 2026-09-04: **the database platform is Supabase.**

This is recorded because it was not. A1's review found Supabase named only in planning documents,
which rank below the decision register, while the register never closed the question — every
artefact so far was built on an assumption nobody had ratified.

It matters immediately: on Supabase the `service_role` key is documented as bypassing row level
security. That makes the service path the decisive security question rather than an implementation
detail, and it is why §4 below cannot close yet.

## 4. DATA-DEC-03 — direction decided, two parameters open

A1 declined to close it alone, on the same reasoning A0 used in `RFC-2026-015`: an owner ratifying
after the fact is a weaker control than an owner proposing, and that reasoning is symmetric.

**Closeable now, independent of anything unresolved:**

- **Force on every exposed tenant table, unconditionally.** `FORCE` is strictly stronger, costs
  nothing at runtime, and changes exactly one thing — whether the table owner is subject to RLS.
- **"Force where compatible" is retired.** As written the condition is unfalsifiable: no artefact
  can be pointed at to decide whether a table met it. It is replaced by a declared exemption
  register — role × table × operation × reason × owner × review date — that the schema lint reads
  **in both directions**, so neither a bypass without a row nor a row without a matching catalog
  state can pass.
- **No application or worker role ever holds `BYPASSRLS`.** Forcing does not remove it; the two are
  independent exemptions. A service path authenticating as a `BYPASSRLS` role is unaffected by
  forcing every table in the database, while the record reads as satisfied.
- **A bypass is a policy on a named role, never a role attribute.** A policy can be enumerated,
  scoped, linted and tested against. `BYPASSRLS` is invisible to every RLS test ever written,
  applies to every table at once, and cannot be narrowed.

**Not closeable yet — the service path is undecided.** The Product Owner confirmed on 2026-09-04
that it has not been chosen. If it resolves to supabase-js with the service-role key, forcing is a
no-op on the service path and `DATA-DEC-03` would close as satisfied while changing nothing. Until
it is decided, this RFC does not claim the control.

`DATA-DEC-03` is due before **G1** and does not gate the DB-00 dispatch.

## 5. What the acceptance tests would not have caught

Of the eight RLS smoke assertions and twelve acceptance tests the data package specifies, **none as
written detects a regression in this decision.**

Assertions 1 through 7 execute as client roles, and forcing has no effect on a non-owner role —
they were always subject. Each passes bit-identically with forcing on or off.

Assertion 8 is the only one that touches the service path, and it passes in the most dangerous way:
it asserts the server helper **succeeds**. A service path that succeeds because it holds `BYPASSRLS`
is indistinguishable from one that succeeds because a policy admitted it. Nothing anywhere asserts
that the service identity is **denied** something the matrix already marks `N` for service.

Three tests are silent passes on their own subject: the blank-migrate check treats
`relforcerowsecurity` as not an object; the RLS lint tests `relrowsecurity`, a different catalog
column, so `ENABLE` without `FORCE` passes clean; and the upgrade test can pass over a forced
backfill that updated zero rows and exited 0.

DB-00 must ship the assertions that close these. They need a live database and are therefore
DB-00/G1 artefacts, not something this RFC can demonstrate.

## 6. Consequences

- DB-00's schema lint asserts `relrowsecurity AND relforcerowsecurity`, plus a `pg_roles` check that
  no reachable application or worker role holds `rolbypassrls` or `rolsuper`.
- Batch `000` carries the service-role policy shape, so later batches inherit a correct one.
- The service-path decision is escalated as its own question, due before G1.
- Until it is answered, no document may state that forced RLS constrains the service path.

## 7. Provenance and its limit

Section 4 and section 5 come from an A1 security analysis run for this decision. **That run was
spawned from the A0 session, so it is not independent of the author in the sense
`independence.no_self_approval` intends.** It began from empty context and read the sources itself,
and its findings are reproducible against the cited files — but it is recorded as A0-solicited
analysis, not as an independent A1 review, and it does not satisfy `prefer_cross_vendor_review`.

A1 also recommends verifying the platform's role attributes empirically against the provisioned
instance rather than from any model's recollection of vendor behaviour, before this is disposed:

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolcanlogin;
SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class WHERE relnamespace = 'app'::regnamespace AND relkind = 'r';
```

Those two queries are also, not coincidentally, the two lints §6 makes permanent.
