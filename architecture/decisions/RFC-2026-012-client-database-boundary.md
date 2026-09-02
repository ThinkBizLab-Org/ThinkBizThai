# RFC-2026-012 — Which tier issues the statement: the client/server database boundary

Status: Proposed
Decision needed by: G0 / `OPEN-015`
Owner: A0 Architecture/Integration with A1 Security
Protocol version: `1.0.0`

## Problem

`OPEN-015` reads *"Direct client DB allowlist vs server-only API inventory"*, owner
**A0+A1 Security**, preparer **A1**, due gate **G0**, safe default *"server-only
mutations; deny direct table access"*, stop condition *"ห้าม frontend สร้าง direct write
จากการเดา"*. It is the decision-register form of **G-24** in the gap register, whose
named deliverable is *"Endpoint inventory, direct-client allowlist, server-only commands,
authz mapping"*.

A1 prepared the inventory as a separate agent run. Every claim below about what a
document says was then re-checked by the author against the document before it was used.

**The §8 RLS matrices cannot answer this question, by construction.** The legend at
`sprint-0a-core-erd-rls-retention-th.md:335` defines `Y`, `P` and `O` purely in terms of
active membership, capability and scope. Only `S` — *"service/worker เท่านั้น"* — carries
any information about which tier issues the statement. Every row marked `Y`, `P` or `O`
for a client role is **silent on whether the statement may originate in a browser**. That
silence is the whole of `OPEN-015`.

**The baseline contains exactly one tier-level statement**, line 415: *"Browser/mobile
ห้ามถือ service-role credential"*. Searching the whole 897-line document for any other
mention of a key or a credential tier returns that single line. It forbids the
service-role key and **says nothing about the anon/publishable key** — which is precisely
the credential a direct-client path would use.

## The crux, and it is not a contradiction

§8.5 line 409 mandates *"`INSERT`: `WITH CHECK` scope ทั้งหมด; user action ตรวจ
`created_by = (select auth.uid())`"*. Read quickly, that looks like a contemplated
client-direct insert, against a safe default of server-only mutations.

It is not. `auth.uid()` reads a claim on the **session**, not the origin of the
statement. A server request handler that opens its Postgres session with the end user's
access token executes as `authenticated` with the identical `auth.uid()`. The policy
constrains the **content of the row** and the **identity of the session**; it says nothing
about the **tier**, and RLS has no predicate that could. §8.5's INSERT pattern is a policy
pattern for a server-issued statement. Both statements are true together.

**The corollary is the finding that matters.** Nothing in the baseline stops a browser
holding a valid user JWT from issuing that same INSERT. Today, "server-only mutations" is
enforced by *not shipping the client SDK call*. **That is a convention, not a control** —
and a convention is exactly what `OPEN-015`'s stop condition exists to replace.

## Decision

**1. Server-only mutation for every table family in §5, zero exceptions at G0.** No
INSERT, UPDATE or DELETE originates in a browser or mobile client against any table in
the canonical domain schema.

**2. Direct client reads only through named `security_invoker` views, never a base
table** — including where a base table would be safe today. Column drift is silent, and
RLS filters rows, not columns.

**3. The read allowlist starts empty.** Each entry is added by RFC, not by a pull request.
The inventory below is the *classification*, not the allowlist: it records what a view
over each family may expose once that view is specified.

**4. The enforcement mechanism is named, and its dependency is recorded rather than
hidden.** `authenticated` holds `SELECT` only, on views; all DML runs through
`SECURITY DEFINER` command functions under `FORCE ROW LEVEL SECURITY`, where §8.5's
`created_by = auth.uid()` `WITH CHECK` still evaluates against the real end user because
the JWT GUC is unchanged by `SECURITY DEFINER`. The baseline already contains every part
of this — `private` has no direct grant (§3.1), the schema lint checks grants (§12.3), the
`SECURITY DEFINER` pattern with revoked public execute (§8.5:414), `FORCE RLS`
(§8.5:406) — but **nowhere assembles them, and the assembly depends on `DATA-DEC-03`,
which is open and due G1.** This RFC states the target; it does not claim the control
exists today.

**5. The one genuine client-direct write is the object plane**, not a table: a browser
PUTs bytes under a server-issued signed URL bound to an exact key, length and content
type, with the database row created server-side first. It is already server-mediated by
the object-storage contract and **must not be cited as precedent for a table write.**

## Inventory

Classification per table family in the §5 canonical dictionary. "View" means a
`security_invoker` view per §8.5, never the base table. Mutation is server-only in every
row; the column records what the source says beyond that.

| Table family | Direct client read | Notes on mutation |
|---|---|---|
| `user_profiles` | own row, via view | §8.1 `O`; PII-2 |
| `workspaces`, `workspace_settings` | permitted | §8.1 all-`Y`; TENANT-1 |
| `workspace_members`, `_scopes` | view only | AUTH-3 minimum-role projection |
| `workspace_invitations` | **server-only** | no §8 SELECT row; token hash only (§9.3) |
| `business_profiles`, `page_context_profiles` + versions | permitted | versions immutable to all, incl. service |
| industry pack catalog + assignments | permitted | PUBLIC-0 |
| knowledge items + versions, typed profiles | permitted | versions immutable |
| research runs/sources/suggestions | view only | INSERT is service-only in §8.2 |
| research snapshots/evidence | **server-only** | COPYRIGHT-3; excluded from export (§11.1) |
| content ideas/items/versions/variants/quality | permitted | approved and published versions immutable to all |
| approval policies/requests/events | view only | events immutable to all |
| calendar items/schedules | permitted | — |
| asset metadata/versions/links | view only | MEDIA-2 signed URL only; purge service-only |
| asset rights/proof | **server-only** | RIGHTS-3 |
| meta connections/accounts/bindings | health projection view only | base row carries a credential reference (SECRET-4) |
| raw webhook inbox | **server-only** | `private`, no direct grant |
| publish intents/targets/posts/metrics | view only | INSERT service-only; PROVIDER-3 |
| jobs/attempts/DLQ/outbox/ledger | redacted-status view only | base tables server-only; INTERNAL-3 |
| notifications, preferences | own row, via view | — |
| push subscriptions | **server-only** | never returned after write (SECRET-4) |
| ai model registry/policies/generation runs | view only | — |
| **ai credential refs** | **no read by anyone, including service** | §8.3 `N` in every column |
| metering reservations/events/quota | summary view only, owner/admin | service-only writes; FIN-3 |
| billing plans/subscriptions/invoices | owner/admin summary view | entitlement from webhook projection only |
| audit logs | safe view only | service-only; no UPDATE or DELETE by anyone |
| security events | **server-only**, owner `P` only | service-only |
| *`storage` objects (not a domain table)* | signed URL only | **the one genuine client-direct write** |

No family in §5 requires a client-direct write. The two rows that look like exceptions —
own-profile UPDATE and notification mark-read, both `O` in §8 — are tier-blind markings,
not grants of a direct path.

Rows marked here from a §8 row are read from the source. Rows with no §8 SELECT row are
classified from the §9 data classification, and are inferences: `workspace_invitations`,
industry pack catalog, and the several "view only" rows derived from AUTH-3 and the
projection rules. They are inferences the author agrees with, not statements of the
baseline.

## What can be checked today, and what cannot

Gate G0 is specification-only. There is **no `src/` and no `db/` in this repository** —
verified, not assumed — so the instruments that would actually enforce this have nothing
to run against.

**Checkable now:** the inventory as a machine-readable artifact with a validator that
re-extracts the §5 family list from the ERD and asserts a 1:1 match, failing loudly if it
cannot locate §5 rather than passing on an empty set. It catches one real failure mode —
the ERD grows a family and this inventory silently does not — and it checks bookkeeping,
not security. Also: a `trust_boundary` annotation on `CTR-API-001`, which carries none
today while `CTR-TEN-001` does, and whose `freeze_boundary` still records auth rules as
not inferred.

**Deliberately not proposed:** a repository-wide grep for client SDK mutation calls. It
would scan an empty set and report a pass it cannot substantiate, and it would flag §8.5's
own mandated pattern in the baseline text. A guard that reports a reason it cannot
substantiate is worse than no guard.

**Not checkable until there is a database:** whether `authenticated` holds DML grants on
exposed tables — the actual control — plus `FORCE RLS`, `security_invoker` on views, and
§8.6's ten mandatory authorization cases. Those are G1 artifacts.

## Conditions A1 attached

Carried here as conditions of the decision, not as commentary:

1. The disposition names the enforcement mechanism and records its `DATA-DEC-03`
   dependency rather than claiming enforcement it cannot have. *Done above.*
2. DB-00's schema lint is extended from immutable/ledger tables to *no exposed table
   grants INSERT/UPDATE/DELETE to `authenticated`*. This is an RLS change and therefore
   RFC-gated; it lands with DB-00, not here.
3. §12.6 gains an assertion that an **editor** — not only the viewer — fails to mutate
   directly. The current set proves the server path needs its helper; it does not prove an
   authorized client cannot bypass it, which is the case `OPEN-015` exists to close.
4. The storage upload path is recorded as the one genuine client-direct write. *Done.*

## Limitations

**Realtime is unresolved.** Supabase Realtime `postgres_changes` is understood to publish
base-table row images under base-table RLS. If that is right, a job-status subscription
would be a base-table read of an INTERNAL-3 family the matrix marks `N`, not a read of the
redacted view — and either the redacted status needs its own table or realtime cannot
serve it. This could not be verified inside G0, which forbids provider integration. It is
recorded as open, not answered.

**A status drift, found in passing.** The register marks `G0-006` and `G0-007` *"Not
started"* while §16 of the ERD document states that exactly their deliverables were
delivered. `OPEN-015` attaches to `G0-007`. The author does not flip a gate row belonging
to another owner; it is recorded here for A1 and the Product Owner.

**This RFC does not make anything server-only.** It states what the boundary is, names
what would enforce it, and says plainly that today the boundary holds because no client
code exists to break it.

## Rollback

Delete this file and the register row that cites it. No code depends on it.
