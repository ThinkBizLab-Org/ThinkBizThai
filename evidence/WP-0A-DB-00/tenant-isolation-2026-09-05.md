# Tenant isolation, executed — 2026-09-05

The first time anything in this repository has proved that row level security works.

## What this evidence is, and what it is NOT

**Executed by A0 through the Supabase MCP connector against the provisioned instance
`xtvtflkntpqfvflvdbwk` (ThinkBizThai, ap-southeast-2, PostgreSQL 17.6).**

**It is not `make db-rls-smoke` passing.** That target still refuses — this host has no `psql`,
`pg_ctl` or `docker`, and the repository forbids adding a dependency, so `run-isolation.mjs` has no
driver to inject. The two are different claims:

| | what it establishes |
|---|---|
| this run | the database is in a correct state **right now**, and the policies work |
| `make db-rls-smoke` in CI | **anyone** can reproduce it, and a regression is caught before merge |

Only the second is a control. This is a measurement. Treating it as the first would be exactly the
substitution this repository exists to prevent, so it is labelled rather than filed under the
harness's name.

## The cases

Every attack was made **holding tenant B's exact UUID**, read from
`db/foundation/seeds/fixture-catalog.json`. Proving tenant A cannot reach tenant B *by failing to
guess* would establish nothing.

| # | case | expected | observed |
|---|---|---|---|
| 1 | `owner_a` sees workspace A | rows=1 | **rows=1** |
| 2 | `owner_a` cannot see workspace B | rows=0 | **rows=0** |
| 3 | `owner_a` cannot update workspace B | rows=0 | **rows=0** |
| 4 | `owner_b` sees workspace B | rows=1 | **rows=1** |
| 5 | `viewer_a` cannot update workspace A | rows=0 | **rows=0** |
| 6 | `suspended_a` sees zero workspaces | rows=0 | **rows=0** |
| 7 | `owner_a` sees only workspace A, of two that exist | rows=1 | **rows=1** |
| 8 | `owner_a` cannot read workspace B's invitations | rows=0 | **rows=0** |
| 9 | `owner_a` cannot read `token_hash` at all | ERROR 42501 | **ERROR 42501** |
| 10 | `owner_a` cannot insert into workspace B | ERROR 42501 | **ERROR 42501** |

Cases 9 and 10 raise; the rest filter. That distinction is the point of `expectDenied` versus
`expectNoEffect`, and it is why the module's original claim — that every refused write raises — had
to be corrected: cases 3 and 5 are refusals that raise nothing.

## The witness half

`rows=0` is not evidence on its own. It is also what an UPDATE returns when RLS is off and the row
is absent. Each filtered write was followed by a read as an identity that CAN see the target:

| witness | result |
|---|---|
| `workspaces.name` for B after case 3 | still `fixture workspace b` — **not** `hijacked` |
| `workspaces.name` for A after case 5 | still `fixture workspace a` |

## The controls, without which every row above is vacuous

| control | result |
|---|---|
| both workspaces exist | **2** — the suite is not green against an empty database |
| workspace B's invitation exists | **1** |
| no `app_*` role holds `BYPASSRLS` | **0 roles** |
| every `app` table has RLS enabled **and forced** | **5 of 5** |

The third matters most: a service role that had acquired `BYPASSRLS` would make every case above
pass while enforcing nothing, and no case written against client identities would notice.

## What this does not cover

- §12.6 assertions 2 and 3 name business, page, content and knowledge tables. Those are batches
  020, 040 and 080, and claiming them here would put a tick against a control nothing exercises.
- The **positive** half of the service-path assertion. `app_worker` holds table privileges and no
  policy, which makes its refusals meaningful; what it *should* be able to do once the §8.2–8.4
  service policies exist is untested, because those operations belong to later batches.
- Anything about the connection method. No membership is granted to `authenticator`, so nothing
  here says how the API will assume these roles in production.

## Defects this run found

1. **`public.gen_random_uuid()` does not exist.** Batch 000 claimed pgcrypto was installed
   `with schema public`; it was already present in `extensions`, so `create extension if not
   exists` silently did nothing — and `gen_random_uuid()` has been in `pg_catalog` since
   PostgreSQL 13 and needs no extension at all. A1 wrote correct SQL against an incorrect record.
2. **Owner comments were lost on the first apply.** Not A1's error — A0 split the migration for
   transport and dropped them. The catalog snapshot reported `comment: false` on all five tables
   and they were restored. The snapshot caught what the reviewer did not.
