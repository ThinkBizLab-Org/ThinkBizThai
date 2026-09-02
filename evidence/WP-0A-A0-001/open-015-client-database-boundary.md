# OPEN-015 — preparation, verification and disposition

Author: A0 (`/claude/a0_atlas`). Preparer: A1 (`/claude/a1_bastion`), the role the
decision register names for this item. Distinct agent runs.

`OPEN-015` is due at **G0** and its preparer is A1, so the inventory was prepared by an
independent run rather than written by the author and reviewed afterwards.

## What was verified before it was used

Every claim A1 made about a document was re-checked against that document. Nine were
checked; all nine held.

| A1's claim | Author's check |
|---|---|
| The §8 legend defines `Y`/`P`/`O` in terms of membership, capability and scope only | **Confirmed**, line 335 |
| Line 415 is the only tier-level statement in the document | **Confirmed** — a search of all 897 lines for a credential tier returns exactly that one line |
| It forbids the service-role credential and is silent on the anon/publishable key | **Confirmed** — no occurrence of anon, publishable or service_role anywhere else |
| §8.5 mandates `created_by = (select auth.uid())` on INSERT | **Confirmed** verbatim, line 409 |
| The schema lint is scoped to immutable/ledger tables only | **Confirmed**, line 658 |
| `OPEN-015` is the register form of G-24 | **Confirmed**, gap register line 35 |
| `CTR-API-001` carries no `trust_boundary` while `CTR-TEN-001` does | **Confirmed** by reading both manifests |
| There is no `src/` and no `db/` in the tree | **Confirmed** |
| `G0-006`/`G0-007` read "Not started" while ERD §16 states their deliverables were delivered | **Confirmed** — register lines 340–341 against ERD line 879 |

## The finding

The §8 RLS matrices answer *who* may do a thing under *what* scope. They never answer
*which tier issues the statement*, and no RLS predicate could — `auth.uid()` reads a
session claim, identical whether the session belongs to a browser or to a server handler
holding the same user's token.

So §8.5's `created_by = auth.uid()` INSERT pattern and the `OPEN-015` safe default of
server-only mutations are **both true at once**: the policy constrains row content and
session identity, not origin. And the corollary is the reason `OPEN-015` exists — nothing
in the baseline stops a browser with a valid user JWT issuing that INSERT. Today the
boundary holds because no client code exists to break it.

## Disposition

RFC-2026-012, Proposed. Server-only mutation for every family with zero exceptions at G0;
direct reads only through named `security_invoker` views with an allowlist that starts
empty; the enforcement mechanism named, with its dependency on the open `DATA-DEC-03`
recorded rather than hidden; the storage signed-URL upload recorded as the one genuine
client-direct write and explicitly not precedent for a table write.

All four conditions A1 attached are carried into the RFC. Two are satisfied there; two
(the extended schema lint, and a §12.6 assertion that an *editor* cannot mutate directly)
land with DB-00 because they are RLS changes and RFC-gated.

## What was deliberately not built

A repository-wide grep for client SDK mutation calls. There is no `src/` and no `db/`, so
it would scan an empty set and report a pass it cannot substantiate — and it would flag
the baseline's own mandated policy text. A guard that reports a reason it cannot
substantiate is worse than no guard.

## Left open, on purpose

Whether Supabase Realtime `postgres_changes` publishes base-table row images under
base-table RLS. If it does, a job-status subscription reads an INTERNAL-3 family the
matrix marks `N`. This could not be verified inside G0, which forbids provider
integration, so it is recorded as open rather than answered.

`npm run verify`: `clean: exit 0 — tests 256, pass 256, fail 0`.
