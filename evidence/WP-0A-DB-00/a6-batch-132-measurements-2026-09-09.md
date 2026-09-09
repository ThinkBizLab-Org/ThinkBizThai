# Batch 132 — the measurements behind a batch that builds nothing

Run: `/claude/a6_entitlement` (A0 Integration + A6). Date: 2026-09-09.
Branch: `agent/claude/WP-0A-DB-00-batch-132`.
Subject: migration batch `132`, which §6's registry calls "entitlement-metering resolver" with the
Deliverable "effective limit resolver", depending on `061` and `130`.

## 0. What this file is, and what it is not

It is the measurement half of a refusal. The argument is in
`db/foundation/migrations/132_entitlement_resolution.sql`, which creates no table, no view, no
function, no policy and no grant; this file records the things that argument rests on, in a form
somebody can re-run.

**No database was touched.** The provisioned instance has not received `011` through `140`, this run
issued no DDL and no query, and every number below is read from the merged tree —
`db/foundation/migrations/*.sql`, `tests/db/identity/fixtures/*.sql`,
`contract-catalog/shared-kernel/ctr-usg-001/manifest.json` and
`db/foundation/lint/*.json`. Claims that would have needed a live catalog are marked as such and are
discharged, where they can be, by the apply-time block the migration carries and by the CI container
`make db-migrate-clean` builds.

**Two limits, stated before the content.** This run authored the batch it is reporting on, so nothing
here is independent review. And the measurements are static: they say what the migration text and the
fixtures contain, which is the right instrument for a question about whether a join has a home and
the wrong one for a question about what a database does.

## 1. The join that does not exist

An effective limit compares an ALLOWANCE, keyed by `app.plan_entitlements.feature_key`, against a
CONSUMPTION, keyed by `app.quota_buckets.dimension`.

### 1.1 The two columns are declared in different migrations

```
$ grep -l '\bfeature_key\b' db/foundation/migrations/*.sql      # comments stripped
db/foundation/migrations/130_billing.sql

$ grep -l '\bdimension\b' db/foundation/migrations/*.sql        # comments stripped
db/foundation/migrations/061_metering.sql
```

Asserted, over the whole migration set with comments stripped, by
`the two keys an effective limit would join live in different migrations, so no relation carries both`
in `tests/db/identity/identity-isolation.test.mjs`. The load-bearing property is the DISJOINTNESS: while
no file declares both columns, no relation carries both, so there is no place a join predicate could
live. The day one file declares both, somebody has decided which feature is metered by which
dimension.

### 1.2 The two vocabularies are different KINDS of thing

| | `app.quota_buckets.dimension` | `app.plan_entitlements.feature_key` |
|---|---|---|
| constraint | `check (dimension in (...))`, six values | `check (feature_key ~ '^[a-z0-9]+(_[a-z0-9]+)*$')` |
| source | `CTR-USG-001`, closed | §5.3's five keys, labelled "ตัวอย่าง" |
| homes | three, asserted byte-identical by `061`'s apply-time block | one |
| enumerated | yes | **no, deliberately** — `130`: "enumerating them in a CHECK would ratify an example as a decision … The set of keys is owed to Product and to batch 132, which resolves them." |

A closed set cannot be mapped onto an open form by anything a migration can write.

### 1.3 §5.3's own five keys intersect the six dimensions in nothing

Dimensions (read from `quota_buckets_dimension_known`): `ai_tokens`, `research_search`,
`storage_bytes`, `egress_bytes`, `media_processing`, `publish_operation`.

Feature keys (§5.3's example plan contract): `workspace_users`, `connected_channels`,
`scheduled_posts_per_month`, `ai_generation_mode`, `asset_storage_bytes`.

Intersection: **empty**. The four near-misses each fail differently, which is why a naming convention
would not repair it:

| key | nearest dimension | why it is not a map |
|---|---|---|
| `asset_storage_bytes` | `storage_bytes` | a STOCK against a FLOW. The allowance is bytes HELD; `CTR-USG-001` never says whether a `storage_bytes` measurement is a level or a delta, and `061`'s bucket SUMS it. Summing levels is wrong; comparing a sum of deltas against a stock is also wrong. |
| `scheduled_posts_per_month` | `publish_operation` | the PERIOD is in the allowance's name and in no column. `plan_entitlements` has no period; `quota_buckets` has an arbitrary `(period_start, period_end)`; `billing_subscriptions` has `(current_period_start, current_period_end)`; nothing ties any two of the three. |
| `workspace_users` | none | no dimension measures a member count. |
| `connected_channels` | none | no dimension measures a connected channel. |
| `ai_generation_mode` | none | kind `value`, `limit_value` null by constraint — no number to compare. |

### 1.4 The merged fixtures cannot demonstrate the join even once

| fixture | loads |
|---|---|
| `tests/db/identity/fixtures/130-billing-fixture.sql` | `workspace_users` (limit 3), `asset_storage_bytes` (limit), `ai_generation_mode` (value) |
| `tests/db/identity/fixtures/061-metering-fixture.sql` | four quota buckets, one ledger row per tenant and one hold, **all `ai_tokens`** |

Intersection: **empty**. So for workspace A the effective limit of `ai_tokens` is undefined (no
entitlement names that dimension) and the consumption of `asset_storage_bytes` is undefined (no bucket
carries it).

**This is not a fixture defect and must not be repaired by adding a row.** Each fixture loaded its own
source document's own vocabulary, faithfully. Asserted by the same test as 1.1, which reads both
vocabularies out of the tree rather than restating them.

### 1.5 The period alignment is a convention nobody enforces

`061`'s fixture writes buckets for `2026-09-01 → 2026-10-01` and `130`'s writes subscription periods
for the same month, and `061`'s fixture says why in its own header: *"Nothing joins the two — §6's
registry gives that join to batch 132 — and the alignment is there so that when 132 writes the join it
is not the first to discover that the two families disagreed about what a period is."*

Measured: no constraint, foreign key or trigger relates `quota_buckets.period_start/period_end` to
`billing_subscriptions.current_period_start/current_period_end`, and `plan_entitlements` carries no
period column at all. They do not yet disagree; nothing makes them agree either.

## 2. Which of batch 061's four open questions this batch needs

`061`'s header lists four things a mechanism keeping the ledger and the bucket equal would have to
decide. **All four are needed by a resolver**, and the honest answer would have been shorter if any
were avoidable.

| # | question (quoted from `061`) | needed | why it cannot be evaded |
|---|---|---|---|
| 1 | which events fall in which bucket when an event arrives after its period closed | yes | the comparison is per period, so period membership is the denominator of every answer. The schema already holds two candidate timestamps pointing different ways: `occurred_at`, which `usage_events_bucket_recompute_idx` is keyed on, and `computed_through`, a watermark over rows CREATED at or before an instant. |
| 2 | whether a `provider_reported` event that supersedes an `estimated` one subtracts the estimate or is added beside it | yes | `sum(quantity_amount)` **is** the answer "added beside it", written in an aggregate where nobody reads it. `CTR-USG-001`'s `freeze_boundary` names "the reconciliation algorithm (OB-008)" as NOT inferred there. |
| 3 | whether an expired reservation is released by the sweep or by the next recompute | yes | "may I start this work" subtracts holds. `061` refused to put this in an index predicate: *"an index predicate is a quieter place to put a lifecycle decision than a CHECK constraint, not a weaker one."* A `where` clause in a resolver is quieter still. |
| 4 | whether the bucket is authoritative between recomputes | yes | `061` wrote this one in this batch's words: *"which is what a caller asking 'may I start this work' actually depends on."* Trusting the bucket answers it yes; reading past the watermark answers it no; ignoring the bucket answers it "not at all", which contradicts the table existing. |

Asserted by `batch 132 needs all four questions batch 061 left open, and quotes them from batch 061 and
from the contract`, which matches each sentence in `061`'s text AND in `132`'s, and checks the
freeze-boundary quotation against `contract-catalog/shared-kernel/ctr-usg-001/manifest.json` rather
than against memory. That manifest's `status` is still `Draft`, so its owners (A0+A6) can still move
the thing this batch is blocked on.

## 3. The billing half, which is blocked on different things

| # | blocker | source |
|---|---|---|
| a | the mapping from `local_access_state` to what a workspace may do is a "versioned policy" that does not exist. §9's own table leaves `TRIALING`, `RESTRICTED` and `MANUAL_FALLBACK` to "policy"; `130` recorded that no such policy exists and stored no provider status at all. | billing contract §9; `130_billing.sql` |
| b | the commonest input is the ABSENCE of a row: `130` made `NO_PLAN` the absence of a subscription, so what an unsubscribed workspace is entitled to lives in no row of `app.plan_entitlements`. There is no free plan revision; `BILL-OQ-01` is open. | `130_billing.sql`; billing contract §9 |
| c | `source` — §5.1's own column of the resolved row — has no vocabulary. Its values would include the plan, §2.1's Manual Billing Grant, a trial (`BILL-DEC-007`, OPEN) and a coupon (`BILL-DEC-008`, OPEN). | billing contract §5.1, §2.1 |
| d | the answer is not a boolean. §5.3 requires an over-limit workspace to be read-only-and-no-new rather than blocked, so the question has at least three outcomes and no document names them. | billing contract §5.3 |

## 4. Table, view or function — and what each refusal rests on

| shape | refused on |
|---|---|
| TABLE (`app.workspace_entitlements`) | §5.1's own rule for it is "คำนวณซ้ำได้จาก source" and the recompute rule is what §1–§3 above say does not exist; it would need a writer and §4's `entitlement-service` does not exist (`RFC-2026-012` §4's command function does not either — `RFC-2026-021` §10); and it would fix a scope, mutability and retention class for a family §5 has no row for. |
| VIEW | `RFC-2026-021` §3 makes an entry five objects plus a registry row and §7/3 keeps the allowlist empty; C1 fails (no client caller, no `src/`); C4 would need a SELECT policy on `app.plan_entitlements` that no §8 row licenses; and `041`'s reason stands on its own — "a view would have to choose a projection, and the projection is the part … that is undecided". |
| FUNCTION | `041` built one because its inputs were decided and its body read no relation. A pure predicate here has arguments nothing can supply (§1) and a body that would answer §2 and §3(d) in arithmetic. A function that READ the relations is worse: under `security invoker` it returns "entitled to nothing" for every client, forever and correctly, so **no case could distinguish "this workspace has no entitlement" from "this caller cannot read the catalog"** — the unfalsifiable shape `RFC-2026-016` §5 found in the data package's own smoke set. Under `security definer` it is the projection bypass `RFC-2026-021` §3 gives to an RFC, owned by `postgres`, which bypasses row level security (`RFC-2026-021` M2). |

## 5. Who could run it: nobody

Read from the approved RFCs rather than measured here, because the objects are not on the instance:

- `RFC-2026-022` §5/8 and M9 — the only member of `app_worker` is `postgres`, which holds
  `rolbypassrls`; a policy `TO app_worker` is "unreachable except from an identity for which it is
  moot".
- `RFC-2026-019` §4/3 — `app_worker`'s connection method is open until a background worker exists;
  `DATA-DEC-03` owns it, due before G1.
- `RFC-2026-022` §5/6 — the broker role `app_queue` does not exist.
- `RFC-2026-021` §10 — no command function exists, so `app_command` owns nothing to invoke.

And `RFC-2026-016` §5 is why that matters rather than being a detail: *"a service path that succeeds
because it holds `BYPASSRLS` is indistinguishable from one that succeeds because a policy admitted
it."*

## 6. What is classified in the service-policy map: nothing

`RFC-2026-022` classifies §8 `S` CELLS. §8's four matrices, read in full:

- §8.4 has two metering rows — "Usage/quota summary SELECT" and "Usage ledger INSERT/UPDATE/DELETE" —
  both batch `061`'s, one implemented and one classified.
- §8.3 has two billing rows — "Billing/subscription SELECT" and "Plan/payment action" — both batch
  `130`'s.
- **There is no row for an entitlement resolution and no row for a read of the plan catalog.** `130`'s
  own header says the second: "§8's four matrices contain no row for a plan catalog anywhere."

So there is no cell to classify. `db/foundation/lint/service-policy-map.json` gains a
`_what_batch_132_classified` note and no `cells` entry, and the negative is asserted.

**And batch 132 declines a service policy batch 130 expected of it.** `130`'s case
`service-sees-zero-plan-entitlements` says: *"Batch 132 is the resolver that will have to read this
table, and the policy that lets it is owed to that batch."* It is not owed — `RFC-2026-022` sanctions a
service policy for an `S` cell and for nothing else. That sentence is left exactly as written:
invariant 1 forbids rewriting a merged migration, an assertion pins the case's text, and editing prose
out from under another batch's test is how a merge loses a control. `131` declined a GRANT `130`
expected of it in the same shape.

## 7. A gap in an approved decision's own artefacts

`RFC-2026-021` §8.1 (approved 2026-09-06) requires `db/foundation/lint/read-allowlist.json` to exist
"as an empty array on approval" and to be "the only place the question 'is this on the allowlist' is
answered"; §8.2 replaces the old prohibition with a rule the lint reads in BOTH directions.

Measured:

```
$ ls db/foundation/lint/
catalog-snapshot.json  rls-exemption-register.json  service-policy-map.json
```

and no script or test in the repository reads a read-allowlist file. So the allowlist is empty by
ABSENCE rather than by declaration, and §8.2's two-way rule does not exist in any form. Batch 132
records it because it is one of the reasons a view was not available here, and holds it with an
assertion so that the file's arrival is a line somebody edits deliberately. **The gap belongs to
`RFC-2026-021` §8 and to A0, who owns `scripts/db/run.mjs`; batch 132 does not create the file,
because creating a registry an RFC specifies is that RFC's act and not a batch's.**

## 8. What the batch produces, and what holds it

| artefact | what it is |
|---|---|
| `db/foundation/migrations/132_entitlement_resolution.sql` | the argument, plus ONE apply-time block: the consumption tables may carry no allowance column and the billing tables no consumption column, in both directions, with a vacuity guard so the block cannot pass by asking nothing. |
| four isolation cases | `owner-a-reads-a-consumed-total-beside-its-subscription` (rows), `owner-a-cannot-reach-the-allowance-that-would-bound-a-consumed-total` (denied/grant/`plan_entitlements`), `service-reads-no-effective-limit` (no-rows), `owner-a-cannot-read-a-quota-bucket-watermark` (denied/grant/`quota_buckets`). |
| nine static tests | appended as one contiguous block at the end of `tests/db/identity/identity-isolation.test.mjs`. |
| a note in the service-policy map | and no cell. |

**Isolation cases: 477 before, 481 after. Static tests in that file: 194 before, 203 after.**

### 8.1 Why the apply-time block asserts one thing

`030`'s rule and `021`'s scar: an applied migration must not assert a property an approved decision or
an already-named batch is EXPECTED to change. Almost every fact in §1–§7 is about a state a later batch
exists to change — that `feature_key` is not enumerated, that no relation carries both keys, that
`app.workspace_entitlements` does not exist, that no reconciliation is written, that the allowlist
registry is missing. Every one of those is pinned in the STATIC suite instead, where the batch that
changes it edits a line a reviewer reads and a failure is a diff rather than a migration that can no
longer be applied.

What IS asserted is the separation the resolver rests on, which two merged batches already decided in
prose and neither asserted anywhere: `061` — *"A bucket records CONSUMPTION and not ALLOWANCE"* — and
`130` — *"It is what a PLAN grants; what a WORKSPACE effectively has is app.workspace_entitlements"*.

It is a DENYLIST of column names and the migration says so. `060` and `131` both record that "a
denylist of column names somebody thought of is defeated by the one they did not", and both answered
with an ALLOWLIST over their OWN tables. That answer is not available here: these seven tables belong
to `061` and `130`, and pinning their column sets from this file would be batch 132 legislating their
schemas.

**The two word lists are different, and the reason is measured rather than stylistic.** `limit_value`
is `130`'s own column and it matches the ALLOWANCE list — correctly, because on the allowance side an
allowance is where it belongs. One list applied to all seven tables would have refused the column §5.1
requires. The static test asserts exactly that, in both directions, against six column names each side
legitimately declares.

### 8.2 What holds the four cases, since it is not the negative control

The CI step disables row level security on ONE TABLE and requires a failed case matching that table's
pattern. Batch 132 creates no table, so it adds no entry — `041` recorded the same about its own
increment. Measured consequences, stated rather than left to be counted:

- two of the four are `deniedBy: 'grant'` refusals, which `.github/workflows/ci.yml` itself says
  "would pass unchanged" with row level security disabled;
- `service-reads-no-effective-limit` names three tables, so no entry that opens one of them restores
  it;
- of the four ids, only `owner-a-cannot-read-a-quota-bucket-watermark` matches an existing control
  pattern (`[a-z0-9-]*quota-bucket`), and it is a grant-layer refusal, so it cannot be credited to
  that control. The measured overlap between control patterns is therefore **unchanged** by this
  batch.

What holds them is the static suite, which pins all four by id, expect, layer and object, and the
positive that sits beside the three negatives. `.github/workflows/ci.yml` is deliberately not edited
and deliberately not declared in `ownership.amends_without_owning`.

## 9. Commands run

```
LC_ALL=C TZ=UTC node --test 'tests/db/identity/*.test.mjs'    # 203 tests, 203 pass
npm run check                                                  # see evidence/VERIFICATION.md
node scripts/verify-branch-scope.mjs <merge-base> WP-0A-DB-00
```

No database command was run. `make db-migrate-clean` and `make db-rls-smoke` need Postgres, which this
run does not have; the four cases above meet a database for the first time in CI, which is §6.5's
finding and the reason the pull request is opened as soon as the first commit exists rather than at the
end.

## 10. What a reviewer should press on

1. **Whether all four of `061`'s questions are really needed**, and in particular whether question 3
   could be avoided by a resolver that ignored reservations. Batch 132 says no, because `061` says a
   hold exists "precisely so that concurrent work cannot overspend a quota the ledger has not yet
   recorded" — but that is a reading of one sentence, and a reviewer who thinks a first resolver could
   answer from the ledger alone would have three blockers here rather than four.
2. **Whether the apply-time assertion is really permanent.** It forbids an allowance column on a
   metering table and a consumption column on a billing table, forever, on the strength of two merged
   headers. If a later RFC decides a bucket should carry a remainder, this migration cannot be
   rewritten and the assertion has no forward fix that is not a new column name.
3. **Whether declining `130`'s expected service policy is right.** The alternative reading is that
   §8's silence about a plan-catalog read is a gap in §8 rather than a denial, in which case the fix
   is an RFC amending §8 and not a policy — which is the same disposition arrived at from the other
   side, and is why this is recorded rather than resolved.
4. **That this run authored what it is reporting.** `prefer_cross_vendor_review` is not satisfied by
   anything in this file.
