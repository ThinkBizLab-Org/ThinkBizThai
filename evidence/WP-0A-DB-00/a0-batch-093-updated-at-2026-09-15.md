# Batch 093 — updated_at is the database's to write on the five tables that handed it to the client

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Closes C0-080 M4 (`content_ideas`, `content_items`), C0-081 M3 (`content_targets`), C0-090 M5 (`approval_policies`, `approval_requests`) — three reviews, one shape: `updated_at … default now()`, the column inside the UPDATE grant to `authenticated`, no `private.set_updated_at` trigger, so the column held whatever the last client wrote.

## 1. The change

- `db/foundation/migrations/093_updated_at_triggers.sql`: the trigger every other mutable table has, on the five, in 010's spelling; and an apply-time assertion **over the whole schema**: every `app` table with an `updated_at` column on which any non-owner role holds UPDATE carries a BEFORE UPDATE trigger calling `private.set_updated_at` (`tgtype` bits checked so an AFTER or INSERT-only trigger does not satisfy it). The grants are untouched: a client may still list the column; the database decides what it holds.
- `test-kits/db/foundation-contract.test.mjs`: the static twin — every `grant update (… updated_at …) on app.<t> to <role>` in the migration set is paired with a `create trigger set_updated_at before update on app.<t>`; the five pinned by name.
- `tests/db/identity/isolation-cases.mjs`: `owner-a-cannot-backdate-a-content-item` — a CTE that writes `2000-01-01` and returns a row only if what was stored is within the last minute. **Fails against 080 alone** (the filter is false), passes with 093, rolled back with the case.

## 2. Measured on the scratch PostgreSQL 17.11 (fresh cluster)

| | Result |
|---|---|
| the general assertion run against the set **before** 093 | raises, naming exactly the five: `app.approval_policies, app.approval_requests, app.content_ideas, app.content_items, app.content_targets (updatable by authenticated)` |
| `migrate-clean` with 093 | ok — `applied 093_updated_at_triggers.sql`, assertion passed |
| the proof statement as owner A, after 093 | `overwritten=true stored=<now>` |
| `rls-smoke` | **`842 isolation case(s) passed.`** = 841 + 1 |
| static suites | contract 58/58 (one new rule), identity 285/285 |

## 3. Not done

The grants themselves are left as the batches wrote them. Batch 070's shape — keep `updated_at` out of the client grant — is the stricter one and would make a client UPDATE that lists the column a privilege refusal rather than a silent overwrite; choosing between the two shapes for the whole schema is a decision, not a fix, and is not made here. A1-100 S4 (`app_worker`'s UPDATE on `assets.updated_at` for acts no §8 cell licenses) is a grant question and stands.
