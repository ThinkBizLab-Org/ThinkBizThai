# Batch 094 — an approval request names its requester, and the requester is the caller

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Closes A1-090 **S13** (MEDIUM): `requested_by` was in the INSERT grant, outside the UPDATE grant, and checked by no policy — a caller could write `created_by = self, requested_by = someone else`, and the value could never be corrected. The suite never issued that statement (the raise builder fills all three actor columns from one argument).

## 1. The change

- `db/foundation/migrations/094_approval_requested_by.sql`: one RESTRICTIVE, INSERT-only, `TO authenticated` policy, `with check (requested_by = (select auth.uid()))`, ANDed with 090's permissive INSERT policy; an apply-time block asserts its shape and that `requested_by` is still not updatable by `authenticated`. A NULL `requested_by` is refused, stated as a decision. RFC-2026-023 §3.3 will have to name this policy beside 092's closure when the command path opens.
- `tests/db/identity/isolation-cases.mjs`: `approvalRaiseRequestFor` (requester split from creator) and `editor-a-cannot-raise-an-approval-request-in-the-owners-name` — `denied`, `deniedBy: 'policy'`, attributable to `requested_by` alone (the existing forge case changes one argument and is refused by `created_by`).

## 2. Measured on the scratch PostgreSQL 17.11 (fresh cluster each time)

| | Result |
|---|---|
| **without 094**, the new case | `FAILED — 1 of 843`: `editor-a-cannot-raise-an-approval-request-in-the-owners-name … 1 row(s) came back. The operation was permitted.` — the forgery lands, as A1 said |
| with 094 | `applied 094_approval_requested_by.sql`, lint ok, **`844 isolation case(s) passed.`** = 843 + 1 |
| static suites | contract 58/58, identity 285/285 |

## 3. Not done

A1-090's related LOW siblings (`updated_by` in the INSERT grants checked on UPDATE only) stand; so does S14 (the `approval_events.comment` read surface), which is a projection/allowlist question for RFC-2026-021's path and the Owner.
