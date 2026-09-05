# RFC-2026-017 — The service path runs under a role that RLS still applies to

Status: Approved 2026-09-05 by the Product Owner — the service path runs under app_worker, app_command and app_maintenance, none holding BYPASSRLS; service_role and postgres are reserved for migration and platform administration. DATA-DEC-03 closes with RFC-2026-016 §4. Isolation remains unproven until the negative assertion in §7 exists.
Date: 2026-09-05
Author: /claude/a0_atlas (A0)
Closes: the half of `DATA-DEC-03` that `RFC-2026-016` left open
Depends on: `RFC-2026-016` (approved), which amended the policy set to carry service-role policies

## 1. What was open

`RFC-2026-016` closed the direction of `DATA-DEC-03` — force unconditionally, retire "where
compatible", no application or worker role holds `BYPASSRLS` — and refused to claim the control,
because the service path was undecided. It stated, and this RFC now lifts:

> Until it is answered, no document may state that forced RLS constrains the service path.

## 2. What was measured

Against the provisioned instance (`ThinkBizThai`, ap-southeast-2, Postgres 17.6), not from vendor
documentation, which is the standard A1 asked for and this repository applies to itself:

| role | `rolbypassrls` | `rolcanlogin` |
|---|---|---|
| `supabase_admin` | yes (superuser) | yes |
| **`postgres`** | **yes** | **yes** |
| **`service_role`** | **yes** | via `authenticator` |
| `supabase_etl_admin` | yes | yes |
| `supabase_read_only_user` | yes | yes |
| `authenticator`, `authenticated`, `anon` | no | `authenticator` only |

Two findings follow, and the second was not anticipated:

1. **`service_role` bypasses RLS.** Forcing every table changes nothing on a service path that uses
   it, while the record would read as satisfied.
2. **`postgres` bypasses RLS too** — and `postgres` is the role in every Supabase direct connection
   string. So both of the obvious options bypass, and "use a direct driver instead of the
   service-role key" is not by itself a fix.

`postgres` holds `rolcreaterole`, so a role topology that does not bypass **is implementable on this
platform**. That was the other question `RFC-2026-016` could not answer.

## 3. Decision

**The service path runs under roles created for it, none of which holds `BYPASSRLS`.**

| role | purpose | `BYPASSRLS` |
|---|---|---|
| `app_worker` | background work — publish delivery, usage ledger writes, notification state, research rows, job and attempt rows | **no** |
| `app_command` | owns the `SECURITY DEFINER` command functions that perform user-initiated writes | **no** |
| `app_maintenance` | the only cross-tenant path — retention sweeps, purge verification, backfills | **no**; reaches across tenants through explicit `USING (true)` policies on named tables and operations |

`service_role` and `postgres` are reserved for migration and platform administration. **Neither is
used by application or worker code.** Every use of `app_maintenance` carries a recorded reason.

`app_command` is deliberately **not** the table owner. A `SECURITY DEFINER` function executes as its
owner, so a function owned by the table owner on a forced table is subject to RLS and needs policies
that name it — which is the intended behaviour, and only holds if the owner is a role the policies
can name.

**Policies land in the same migration as the table they protect.** Not afterwards.

## 4. What this costs, recorded so nobody is surprised later

- Every service operation needs a policy. Writing the table is no longer the whole job.
- `permission denied` will appear during development more often than it would otherwise. Each
  occurrence is RLS doing its job; the temptation to silence it by widening a grant is the failure
  mode to watch for, and the exemption register exists so widening is visible.
- Some platform features assume `service_role`. Supabase Realtime and parts of Storage are the known
  cases. Each is handled explicitly, not by handing the application `service_role`.

## 5. Why now rather than later

Today the repository holds zero tenant tables and zero server queries. The topology is one
migration.

Deferred, every server query would be written against a database where RLS does not apply to it.
Reversing that means auditing every query, adding policies to every table already merged, and
trusting that nothing was missed — across the twenty-odd migration batches the registry defines,
with customers on the system. `RFC-2026-016` already established that migration invariant 1 forbids
rewriting a merged migration, so the correction would be a forward fix, not an edit.

The cost of being right early is one migration. The cost of being wrong is an audit that will not
happen.

## 6. Consequences

- Batch `010` (A1 Identity) writes tables **and** their policies, naming `authenticated` for user
  paths and `app_worker` / `app_command` for the operations the matrix marks `S`.
- The role topology itself is a foundation concern and belongs in batch `000` or an early batch A0
  owns; A1 does not create it as a side effect of writing tables.
- The DB-00 catalog lint already asserts that the set of roles holding `BYPASSRLS` is exactly the
  five the platform ships. A sixth — including any role added by this decision being created
  incorrectly — is reported as a finding.
- `DATA-DEC-03` closes on disposition of this RFC, together with `RFC-2026-016` §4.

## 7. What is still not claimed

This decides the **identity**. It does not yet prove the isolation: no tenant table exists, so no
cross-tenant assertion has been run. `DB00-A03` and the §12.6 smoke assertions remain unexecuted,
and the data package's own smoke set would not detect a regression in this decision — every
assertion in it runs as a client role, and one asserts only that the server helper **succeeds**.

The negative half — the service identity attempting an operation the matrix marks `N` for service
and being **denied with an error, not an empty result** — is the assertion that would detect it, and
it does not exist yet. It is owed by whoever writes the first tenant table.
