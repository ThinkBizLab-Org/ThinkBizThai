# RFC-2026-018 — How the service path connects, since nothing can reach it yet

Status: Approved 2026-09-06 by the Product Owner — the request path assumes `app_command` through `authenticator` with `inherit false, set true`; `app_worker` and `app_maintenance` are not granted to `authenticator`; `service_role` stays reserved for platform administration and migration. The decision is not IN EFFECT until §5 holds: the grant, the lint that reads the membership in both directions, and an isolation case that assumes the role through the path the request path uses. Until then `RFC-2026-017` §3's present tense is still wrong.
Date: 2026-09-06
Author: /claude/a0_atlas (A0)
Depends on: `RFC-2026-017` (approved), which created the service roles and deliberately left the
connection method open
Decides: which login path may assume `app_worker`, `app_command` and `app_maintenance`, and what
must be true before any document may say the service path runs under them

## 1. What is open

`RFC-2026-017` §3 is written in the present tense: *the service path runs under `app_worker`,
`app_command` and `app_maintenance`, none holding `BYPASSRLS`*. Measured against the provisioned
instance, **that is not yet true of any reachable path.** The roles exist, hold their grants, and
nothing can become them except the one role that already bypasses row level security.

`001_service_roles.sql:22` says so itself, as a deliberate omission rather than an oversight:

> It grants no membership to `authenticator`. Whether the API path assumes these roles through
> PostgREST or a driver issues `SET LOCAL ROLE` is a connection-method question `RFC-2026-017` did
> not settle, and granting membership now would pick it silently.

This RFC picks it out loud.

## 2. What was measured

Instance `xtvtflkntpqfvflvdbwk`, 2026-09-06, read from `pg_auth_members`, `pg_authid` and
`information_schema`. Not from vendor documentation.

**Who can become what** (`set_option` is the PostgreSQL 16 option that permits `SET ROLE`; it is
separate from `ADMIN` and from `INHERIT`):

| member | may become | `set_option` | `inherit_option` |
|---|---|---|---|
| `authenticator` | `anon`, `authenticated`, `service_role` | true | false |
| `authenticator` | `app_worker`, `app_command`, `app_maintenance` | **no membership at all** | — |
| `postgres` | all three service roles | true | false |

`authenticator` is the login role every PostgREST request arrives on. `postgres` holds `BYPASSRLS`
(measured, `RFC-2026-017` §2). So the only role that can become `app_worker` today is one for which
every policy written for `app_worker` is already inert.

**What the roles hold in `app`**, which is why this matters rather than being a naming question:

| role | schema `USAGE` | table-level grants | column-level grants |
|---|---|---|---|
| `app_worker` | yes | SELECT 4, INSERT 3, UPDATE 3 | 41 / 30 / 23 columns |
| `authenticated` | yes | **none** | SELECT 41, INSERT 7, UPDATE 15 columns |
| `anon` | no | none | none |

`authenticated` is column-scoped on purpose — §9.2/§9.3: it may write `token_hash` and may not read
it. `app_worker` carries the table-level grants a server path needs. The two are different shapes,
and today only the first is reachable.

**Environment.** `authenticator` logs in with `session_preload_libraries=supautils, safeupdate`,
`statement_timeout=8s`, `lock_timeout=8s`. A `pgbouncer` login role exists on the instance, so a
pooler is in the path and connection reuse is a fact rather than a possibility.

## 3. The candidates, and what each makes true

### A — grant `authenticator` membership in the service roles; PostgREST switches on the JWT claim

`grant app_command to authenticator with inherit false, set true;` and the same for the others that
need it. PostgREST reads the `role` claim from the verified JWT and issues `SET LOCAL ROLE` inside
the request's transaction.

**What it makes true.** The request path runs under a role RLS applies to, with the table-level
grants a server needs. No new credential is created, stored or rotated.

**The security question, answered directly.** It looks like a widening — a second way to reach a
privileged role through the public API — and it is the opposite. The capability being granted is
already held: anyone able to sign a JWT with the project secret can today claim `service_role`,
which **bypasses RLS entirely**. Option A gives that same holder a strictly weaker role to claim
instead. It narrows what the existing secret can do; it does not create a new door.

**What it costs.** The separation between a client request and a service request becomes a *claim*
rather than a network path. That is worth stating plainly: an attacker who obtains the signing
secret gets `app_worker` — and, unchanged by this RFC, `service_role` as well. The signing secret is
already the boundary. This does not move it, and it does not improve it.

**The platform risk.** `authenticator` is managed by the platform. A platform-side change could drop
the membership, and the failure would be silent: requests would arrive as `authenticated` and be
filtered by policies written for a client. It is falsifiable, so it must be falsified — see §5.

### B — a dedicated login role, and the application issues `SET LOCAL ROLE`

Create `app_service` with a password, connect directly, `SET LOCAL ROLE app_worker` per transaction.

**What it makes true.** Separation by credential and network path, not by a claim. A background job
that never arrives over HTTP has no other option: it cannot be a PostgREST request.

**What it costs.** A credential that must be stored, rotated and kept out of the repository — this
repository has a secret scanner with thirty rules precisely because that is where credentials end
up. And it puts `SET LOCAL` on the application's critical path: under a transaction-mode pooler a
plain `SET` outlives the transaction and the next request on that connection inherits another
tenant's identity. The rule is already written down; option B makes every future author responsible
for obeying it on every path.

### C — use `service_role`, as the platform's own examples do

**Refused, and recorded rather than left unavailable.** `service_role` holds `BYPASSRLS` (measured).
Every policy in batch 010 and every policy any later batch writes is advisory for it. Choosing C
would close `DATA-DEC-03` as satisfied while changing nothing, which `RFC-2026-016` §4 already
named as the failure mode to avoid.

## 4. Decision proposed

1. **The request path takes A.** `authenticator` is granted `app_command` `with inherit false, set
   true`. `inherit false` is not decoration: it is the switch batch 002 got wrong and batch 003
   fixed, and it means the privileges must be taken by an explicit role switch rather than held
   ambiently by every request that has not switched.
2. **`app_worker` and `app_maintenance` are NOT granted to `authenticator`.** Nothing arrives over
   HTTP that needs them. When a background worker exists, it takes B, and the credential is that
   decision's cost to carry — not a cost smuggled into this one.
3. **`service_role` remains reserved** for platform administration and migration, and no application
   path uses it.
4. **No document may say the service path runs under these roles until §5 holds.** Including
   `RFC-2026-017` §3, whose present tense is what prompted this RFC.

## 5. What must be true before this closes

Falsifiable, and in the tree rather than in a sentence:

- A migration batch grants the membership, and the catalog lint asserts it **in both directions**:
  the membership exists, and `inherit_option` is false. A membership that silently disappears is the
  platform risk in §3A, and this is what turns it from a worry into a failing build.
- An isolation case assumes `app_command` **through the same mechanism the request path uses** — a
  role switch, in a transaction, with no `BYPASSRLS` anywhere in the chain — and is refused by the
  policies written for it. The existing service cases assume the role as `postgres`; that proves the
  policies, not the path.
- The catalog snapshot records `authenticator`'s memberships, so a change to them is a diff.

Until all three exist, this RFC is `Proposed` and `RFC-2026-017` §3's present tense stays wrong.

## 6. Consequences

- `db/foundation/lint/catalog-snapshot.json` gains `authenticator`'s memberships; `scripts/db/run.mjs`
  gains the rule that reads them.
- One migration batch, forward-only. Batches 001–004 are applied and are not rewritten.
- `RFC-2026-017` §3 needs its tense corrected when this closes. That is a decision-record change and
  belongs to its own owner, not to this one.

## 7. What this does not decide

- **How a background worker authenticates.** Option B is described, not chosen. No worker exists,
  and choosing a credential for a component nobody has written is how a decision gets made by
  whoever writes the first line of it.
- **Whether the API is PostgREST at all.** This RFC decides what happens *if* requests arrive
  through `authenticator`, which is the only path the instance currently has. A different API
  process with its own login role is option B under another name and needs its own RFC.
- **JWT minting, rotation or custody.** The signing secret is the boundary in option A and this RFC
  does not improve it. Saying so is not a defence of it.

## 8. Provenance

Every fact in §2 was read from the provisioned instance by this run on 2026-09-06 and is reproducible
from the queries named. The reasoning is A0's alone: `DATA-DEC-03` is owned A0+A1, and A1 has not
seen this RFC. Its countersignature on the role topology
(`evidence/WP-0A-DB-00/a1-countersignature-role-topology.md` §"the topology is built but not
connected") is what identified the gap this RFC addresses, but identifying a gap is not agreeing with
a proposal for filling it.
