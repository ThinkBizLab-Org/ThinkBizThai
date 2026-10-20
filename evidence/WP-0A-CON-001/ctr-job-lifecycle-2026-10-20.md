# CTR-JOB-001: the lifecycle named, and what still blocks Frozen v1 (WP-0A-CON-001, 2026-10-20)

Author: A0 (`/claude/a0_atlas`), as the owner of CTR-JOB-001 (`owner: "A0"` in its manifest and in
`contract-catalog/shared-kernel/index.json`), drafted by a subagent of that run. Base: `origin/main` `f20b7319`.
This file is the Author's record. It is not a role verdict, and nothing in it is reviewed, tested or approved by the
Author.

## 1. What this increment changes

| File | Change |
|---|---|
| `contract-catalog/shared-kernel/ctr-job-001/schema.json` | One new top-level annotation, `x-lifecycle`: the seven derived states, the three actors, fourteen transitions, what no act does (`never`), and what the lifecycle does not settle (`not_settled`). No other key changes. |
| `contract-catalog/shared-kernel/ctr-job-001/manifest.json` | `freeze_boundary` restated (the lifecycle is decided and not frozen, and what stays open before Frozen v1); `untestable_by_fixture` added. `status` stays `Candidate`, `version` stays `1.0.0`. |
| `test-kits/contracts/catalog-registry.test.mjs` (WP-0A-CON-008's, declared under `amends_without_owning`) | `ANNOTATION_DIGESTS` ctr-job-001 count 8 → 9 and its digest; `CAVEAT_DIGESTS` ctr-job-001 `freeze_boundary` digest and a new `untestable_by_fixture` digest; `DECLARES_UNTESTABLE_BY_FIXTURE` gains CTR-JOB-001. |
| `tests/db/identity/identity-isolation.test.mjs` (WP-0A-DB-00's, declared under `amends_without_owning`) | The case "batch 050 invents no lifecycle vocabulary, in a column, in a CHECK or in an index predicate" matched the old boundary's reservation, and its message says lifting it "is a decision, which is what this assertion makes someone do". The decision is `x-lifecycle.stored` (no state is stored), which leaves every 050 refusal standing. That one assertion now checks the reservation is gone and pins the `stored` sentence; the case's name and its other assertions are unchanged. |
| `test-kits/db/foundation-contract.test.mjs` (WP-0A-DB-00's guard test, declared under `amends_without_owning`; arrived with the merge of `origin/main` `0a8690de`, PR #307) | Its batch 175 case matched the old boundary's reservation as "the broker's missing term". That one assertion now checks the reservation is gone and pins `x-lifecycle.stored`. 175 still writes no broker; the case's name and other assertions are unchanged. |
| `work-packages/WP-0A-CON-001.json` | `ownership.amends_without_owning` (the two paths above and the integrity manifest); `open_blockers[4]` records this increment and what blocks the freeze. Status unchanged. |
| `test-kits/integrity-manifest.json` | Regenerated. |

**The schema's accepted set does not change.** `x-` keys are skipped by the repository's validator
(`test-kits/contracts/json-schema-subset.mjs`) and by the mutation walk; every fixture keeps its verdict. Under
RFC-2026-031 §3.3, "a description or `x-` annotation" is the example of a change that is not breaking. The record still
has no status field and gains none (`additionalProperties: false`), so `app.jobs` (migration 050), the checker
(`domain/jobs/job-record.ts`) and its test "the record has no status field" stay true.

**Where it lives, and why there.** The catalog has no lifecycle field. A new manifest key would need a new entry in
`MANIFEST_KEYS` and a new kind of pin. The schema's `x-` channel is already the catalog's normative prose channel: it
is pinned by count and digest (`ANNOTATION_DIGESTS`), and other suites cite `x-reference-rule` as the source of a rule.
The broker author reads the schema. So the lifecycle is one `x-lifecycle` object there, with the restated
`freeze_boundary` pointing at it.

## 2. Authority

The Product Owner's answer of 2026-10-20 (header `JOB lifecycle`), transcribed byte-exact in
`product-owner-disposition-2026-10-20-ctr-job-lifecycle.md` beside this file. Its option text directs a PR "กำหนด
lifecycle จากที่โค้ด job บน fake ทำไว้แล้ว (สถานะคำนวณจาก timestamp/counter ไม่มี status column)". So this increment
names what the kernel already decides. It does not choose new behaviour. Where the kernel's behaviour departs from the
Contracts/Events/Jobs Workstream's task list (§5 F, JB-001 to JB-010), the departure is listed in
`x-lifecycle.not_settled` rather than fixed here.

**Which package.** The Owner's option text names `WP-0A-CON-008`. The files belong to `WP-0A-CON-001`: its
`ownership.writable_paths` holds `contract-catalog/shared-kernel/ctr-job-001/**` and `index.json`, and no other
manifest lists them. `WP-0A-CON-008` lists `contract-catalog/**` as read-only. RFC-2026-031 §4.5, approved, says a
contract increment "is a PR of the package that owns the contract's directory" and names `WP-0A-CON-001` for JOB. So
the change is made here. The one `WP-0A-CON-008` file it moves (the registry pins) is declared under
`amends_without_owning`, as §4.5 says. A0's reading: the Owner named the package that holds the freeze-readiness
record and the registry, and the ownership rules decide where the edit lands.

## 3. The lifecycle against the code (main `f20b7319`)

All paths under `src/modules/platform-kernel/`. Each row was checked by reading the cited function.

### 3.1 States (first match wins)

| State | Condition | Code that decides it the same way |
|---|---|---|
| `completed` | `result_ref` present | `claimRefusal` returns `'completed'` first (`domain/jobs/job-decisions.ts:90`) |
| `cancelling` | `cancel_requested_at` present and the lease held | `claimRefusal` returns `'cancelled'` before `'leased'`; `heartbeat`, `complete` and `fail` check only `holdsLease` (`:214`), so the holder may still act |
| `cancelled` | `cancel_requested_at` present | `claimRefusal` `'cancelled'`; with no held lease no worker act is admitted, and `requestCancel` keeps the first instant |
| `leased` | the lease held | `isLeaseHeld` (`:74`): both fields present and `lease_expires_at > now`; `claimRefusal` `'leased'` |
| `dead_lettered` | `attempt >= max_attempts` | `isDeadLettered` (`:105`): no result, no cancellation, budget spent, no held lease; `claimRefusal` `'exhausted'` |
| `waiting` | `available_at > now` | `claimRefusal` `'not_due'` |
| `ready` | none of the above | `claimRefusal(...) === null`, i.e. `isClaimable` (`:101`) |

`ready` is exactly `isClaimable`, and `dead_lettered` is exactly `isDeadLettered`, at the same instant. An expired lease
counts as no lease (`isLeaseHeld`), and its fields stay until `claim` replaces them (`withoutLease`, `:136`).

### 3.2 Transitions

| Act | By | From → to | Code |
|---|---|---|---|
| enqueue | command | (none) → `ready` / `waiting` | `newJob` (`:166`): attempt 0, progress 0, `available_at = max(requested, now)`; dedupe per (workspace, `dedupe_key`) returns the existing job (`application/jobs/fakes.ts`, `enqueueNow`, `:147`) |
| due | clock | `waiting` → `ready` | no write; `claimRefusal` stops returning `'not_due'` |
| claim | worker | `ready` → `leased` | `claim` (`:194`): refused unless `claimRefusal` is null; `attempt + 1`, `lease_owner`, `lease_expires_at = now + timeout_seconds + leaseGraceSeconds` (`leaseExpiryFor`, `:131`) |
| heartbeat | worker | `leased`, `cancelling` → same | `heartbeat` (`:235`): later of current expiry and `now + heartbeatLeaseSeconds`; progress optional, not checked for increase |
| complete | worker | `leased`, `cancelling` → `completed` | `complete` (`:255`): `result_ref`, lease removed |
| fail, attempts remain | worker | `leased` → `waiting` | `fail` (`:274`): `last_error_code`, lease removed, `available_at = nextRetryAt(now, attempt)` (`:127`, `retryDelaySeconds` `:115`), outcome `'retry'`, whatever `retryable` |
| fail, budget spent | worker | `leased` → `dead_lettered` | `fail`: `last_error_code`, lease removed, `available_at` kept, outcome `'dead_letter'` |
| fail while cancelling | worker | `cancelling` → `cancelled` | `fail` does not read `cancel_requested_at`; the derivation does. The worker still reports `'retry'` or `'dead_letter'` (`application/jobs/worker.ts`, `workOnce`) |
| lease expiry | clock | `leased` → `ready` / `dead_lettered`; `cancelling` → `cancelled` | no write; `isLeaseHeld` turns false. `ready` because `claim` needed `available_at <= now` and does not move it |
| cancel | command | `ready`, `waiting`, `dead_lettered` → `cancelled`; `leased` → `cancelling`; `completed` unchanged; `cancelling`, `cancelled` unchanged | `requestCancel` (`:287`): writes `cancel_requested_at` once and keeps the first instant; `JobStorePort.requestCancel(scope, jobId)` finds a job only in the scope's workspace (`application/jobs/job-store-port.ts:68`) |
| any act with a lost lease | worker | none | `holdsLease` false → `lease_lost`, nothing written (`LEASE_LOST`, `:231`) |

**The actors.** The worker's acts are `JobStorePort.claim`, `heartbeat`, `complete` and `fail`. In the database they
are the broker's: RFC-2026-022 §5 item 5 ("`app_worker` holds no policy on `app.jobs`, `app.outbox_events` or
`app.consumer_ledger` — permanently, not pending") and item 6 (the `app_queue` role that owns the broker). The broker
is not written yet; the Owner's same answer puts it in migration 176 after this lifecycle. The command path's acts are
`enqueue` and `requestCancel`. How the database admits them is not settled here, and `x-lifecycle.actors.command` says
so.

## 4. Frozen v1: not reached, and what blocks it

RFC-2026-031 §4.1 lists six preconditions on `main` before a freeze review starts, then §4.3's role files and §4.4's
Owner approval "freeze CTR-JOB-001 at head `<sha>`". Against each, after this increment:

| §4.1 item | State | What blocks, and its owner |
|---|---|---|
| (1) It is Candidate | **holds** | — |
| (2) Every `required_before_freeze` item present (`lifecycle`, `retry`, `lease`, `progress`, `cancel fixtures`) | **not met, A0's reading** | `lifecycle`, `retry`, `lease`: present as `x-lifecycle` text, for C0 to judge. `progress` and `cancel fixtures`: the only valid fixture (`examples/valid.json`) is one record, leased, at `attempt` 0, which the kernel never produces (a claim makes `attempt` at least 1). No valid fixture carries `cancel_requested_at`, `result_ref`, `last_error_code` or a spent budget. A valid fixture per derived state is owed (A0, this package). §5.5 item 1: a missing item cannot be declared. |
| (3) Every open item closed or declared | **not met** | (a) `job_type`, `lease_owner`, `progress_stage`, `last_error_code` unbounded (WP-0A-CON-005 `open_blockers[11]`, A1 S3 Medium; WP-0A-CON-007 `[5]`, `[9]`(b)); the numeric fields unbounded (CON-005 `[11]`, A1 S8 Low). Owner A0. (b) `tenant_context` restated against `app.jobs` after migration 174 (WP-0A-DB-00 `[202]`(2), "lands BEFORE ANY PRODUCER ENQUEUES"). Owner A0, with A1 as CTR-TEN-001's co-owner. (c) The binding of `input_ref` and `result_ref` to the job's tenant (CON-005 `[7]`). A tenant-isolation gap, which §5.5 item 3 forbids declaring; it must be closed. Owner A0. (d) The scheme allow-list (CON-005 `[6]`) and `dedupe_key` composition (CON-005 `[13]`(d)). Owner A0. (e) The H-6 `x-amended-by` record for WP-0A-CON-006's fixture amendment (CON-006 `[17]`) and the two `x-amended-by` acknowledgements still `pending` (CON-005 `[0]`). Owners A0 and `/claude/r0_steward`. (f) `x-lifecycle.not_settled` and `untestable_by_fixture`, which may be declared under §5.2 with an owner and a gate. No `declared_gaps` entry is written in this increment. |
| (4) `freeze_boundary` restated | **not met, by design** | It still opens "Candidate only;", which the registry's Frozen test refuses. It is restated at the freeze increment. |
| (5) The registry admits Frozen | **holds** | `FREEZE_LEVELS` includes `'Frozen'` (merged `f914ca67`). |
| (6) No A1 finding of any grade open against the text | **not met** | A1 S3 (Medium) and S8 (Low) in CON-005 `[11]` are open. |

Then §4.3 (C0, A1, Q0, R0 files naming CTR-JOB-001 and a head) and §4.4 (the Owner's approval by name at that head)
follow. **The Owner's answer of 2026-10-20 is a direction to drive the freeze. A0 does not read it as the §4.4
approval**, which names a head that does not exist yet.

**A0's reading of the order** (not binding, for the Owner): the bounds (3a) and the reference binding (3c) narrow the
schema, so they are cheapest before the freeze (§3.3 "Consequence"); the `tenant_context` restatement (3b) is owed
before any producer enqueues into `app.jobs`; the state fixtures (2) are additive. Each is a CON-001 increment.

## 5. What this increment does not do, and what it leaves stale

- **No status, version, fixture, `required`, property or `$ref` change.** No `declared_gaps`, no index change, no
  freeze.
- **The broker (migration 176) is not written.** It is `WP-1A-A0-006`'s or `WP-0A-DB-00`'s, after this merges.
- **Text in other packages now quotes the old boundary.** `src/modules/platform-kernel/domain/jobs/job-decisions.ts`
  (lines 10-11, 20-23 and the `fail` comment at 270-273), `job-record.ts` (lines 7-8) and the title of the `job-record.test.ts` case
  "the record has no status field (the freeze boundary reserves lifecycle state names)" belong to `WP-1A-A0-004`; its
  `open_blockers[4]` says "Naming states in the contract is the contract owner's change (A0), through the RFC path".
  Migration 050's header and RFC-2026-022 §4 F and §9 quote it too. None is wrong about the past, and none is edited
  here. A0's recommendation: `WP-1A-A0-004` points its comments at `x-lifecycle` in the broker increment, and adds a
  test that its derivation and `x-lifecycle.states` agree.
- **"Through the RFC path".** `CONTRIBUTING_AGENTS.md` asks for an RFC "before changing ... contract
  meaning/requiredness/state". A0's reading: naming the lifecycle of a Candidate contract, on the Owner's direction,
  in an annotation that leaves the accepted set unchanged, is the contract owner's act that the manifest's own
  boundary reserved ("subject to source-defined owner review"), and this PR is read by all four roles as governance.
  If a role reads the rule as requiring an RFC, that is a finding for the Owner, not something this increment settles.
- **WP-0A-CON-007 `open_blockers[9]`** asks that the bound decision on the four strings be recorded on this package's
  side. `open_blockers[4]` of this package now records it as open. It is not decided.
