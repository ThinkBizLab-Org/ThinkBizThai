# WP-0A-CON-004 — the 22-bounds increment (2026-10-07)

Written by a subagent of `/claude/a0_atlas` (Author). A0 executes under the Owner's standing delegation
"เอาตามที่คุณแนะนำทุกอย่าง" (follow everything you recommend) and the Owner's 2026-10-06 night words
"คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน" (go all night, don't ask me). A0 executes; it
does not approve, test-verify or integrate this increment, and it moves the package only to `in_review`.

Base: `origin/main` `0955b32e` (PR #203 merged). Branch:
`agent/claude/WP-0A-CON-004-security-audit-observability-2026-10-07`. The package's earlier branch
`agent/claude/WP-0A-CON-004-security-audit-observability` is merged into `main` (its head `6352ee85` is an
ancestor of `0955b32e`), but its local ref is checked out in another worktree of the same repository, so
this increment uses the dated name, and `ownership.branch` names it so that
`scripts/verify-branch-identity.mjs` finds exactly one claimant.

This is **not a governance PR**: no RFC, `CONTRIBUTING_AGENTS.md`, CI workflow or gate file is touched.

## 1. What this increment closes

`open_blockers[14]` (R0 R4, C0 N-2, Q0 F-3, A1 N-2): 22 reference-shaped fields in this package's three
contracts carried no `maxLength` and were listed as owed by WP-0A-CON-004 in `KNOWN_UNBOUNDED` of
`test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`. All 22 are bounded, each with an
`x-bound-note` stating its source as a DECLARED INFERENCE, each killed by its own `invalid-*-too-long.json`
fixture, and the 22 entries are removed from `KNOWN_UNBOUNDED`. The ratchet's stale-entry check now holds
each field to a bound: a later edit that removes one fails as an unrecorded unbounded reference.

Status checked first: CTR-SEC-001, CTR-AUD-001 and CTR-OBS-001 are `Draft` in
`contract-catalog/shared-kernel/index.json` and in each manifest, so no Candidate change path applies and no
field was stopped.

## 2. The value of each bound, and why (C0 R-2 on PR #196)

C0 R-2 noted that "ids 128, references 256 per RFC-2026-009" is a precedent that does not cover all 22:
seven are KEYS, not ids or references, and RFC-2026-009 used 64 for `producer.module_key`. None of the 22
is a `scheme:path` reference, so the 256 bound applies to none of them. Each value below is **A0's
decision as Author under the Owner's delegation**, sourced to a precedent and declared as an inference
in the field's `x-bound-note`; no baseline task states a length for any of them.

| Contract | Field | Class | Bound | Reason |
|---|---|---|---:|---|
| CTR-SEC-001 | `scope.workspace_id` | id | 128 | RFC-2026-009 R-2 identifier bound; CTR-IDM-001 `scope.workspace_id` is already 128 |
| CTR-SEC-001 | `scope.business_profile_id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-SEC-001 | `scope.page_context_profile_id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-SEC-001 | `scope.capability_key` | key | 64 | the length CTR-OBS-001 `sli_tags.capability_key` admits, so a credential's capability can be carried as an SLI tag |
| CTR-SEC-001 | `rotation.owner.id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-SEC-001 | `revocation.actor.id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-SEC-001 | `revocation.reason_key` | key | 96 | this family's stable reason-key length (CTR-AUD-001 `reason_key`, `action.name`; CTR-OBS-001 readiness `reason_key`) |
| CTR-SEC-001 | `correlation_id` | id | 128 | RFC-2026-009 R-2 identifier bound (CTR-EVT/API/IDM `correlation_id` are 128) |
| CTR-AUD-001 | `audit_id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-AUD-001 | `actor.id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-AUD-001 | `correlation_id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-AUD-001 | `causation_id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-OBS-001 | `correlation.correlation_id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-OBS-001 | `correlation.request_id` | id | 128 | RFC-2026-009 R-2 identifier bound (CTR-API-001 `request_id` is 128) |
| CTR-OBS-001 | `correlation.causation_id` | id | 128 | RFC-2026-009 R-2 identifier bound |
| CTR-OBS-001 | `correlation.trace_id` | id | 128 | RFC-2026-009 R-2 identifier bound; the trace wire format is out of scope, so nothing narrower is inferred |
| CTR-OBS-001 | `correlation.job_id` | id | 128 | RFC-2026-009 R-2 identifier bound (CTR-JOB-001 `job_id` is 128) |
| CTR-OBS-001 | `module.module_key` | key | 64 | RFC-2026-009 R-2 `producer.module_key` bound |
| CTR-OBS-001 | `readiness.capabilities[].capability_key` | key | 64 | as `scope.capability_key` |
| CTR-OBS-001 | `dependencies[].dependency_key` | key | 64 | module-key bound; a dependency is named by a module or provider key |
| CTR-OBS-001 | `sli_tags.module_key` | key | 64 | RFC-2026-009 R-2 `producer.module_key` bound, and the length its pattern already admitted |
| CTR-OBS-001 | `sli_tags.capability_key` | key | 64 | the length its pattern already admitted |

15 ids at 128, 6 keys at 64, 1 reason key at 96. The seven keys C0 named are exactly the seven non-id rows.

**One pattern edit, accept set unchanged.** `sli_tags.module_key` and `sli_tags.capability_key` carried
`^[a-z0-9_.:-]{1,64}$`. A `maxLength: 64` beside a `{1,64}` quantifier is unkillable by any fixture,
because each states the same limit. The limit moved from the quantifier to `maxLength` (`^[a-z0-9_.:-]+$`
plus `maxLength: 64`), which admits exactly the same strings and makes the bound testable on its own.
`outcome` and `error_code` are not reference-shaped and keep `{1,64}`.

None of these bounds is a control against credential material pasted into an id; each note says so. That
residual (A1's co-owner finding that free-text id fields can carry pasted credential material) is
unchanged.

## 3. Co-owner countersignature: OWED

RFC-2026-009 R-2 recorded its bounds as a decision of A0 for four contracts A0 owns alone. These three are
jointly owned (Decision Register 5.2; `index.json`): CTR-SEC-001 **A0+A1**, CTR-AUD-001 and CTR-OBS-001
**A0+A6**. This increment records every value as A0's decision only. **Owed:** A1's countersignature of the
eight CTR-SEC-001 values, and A6's countersignature of the four CTR-AUD-001 and ten CTR-OBS-001 values.
This Author run did not see an A1 role run sign the SEC values in this workflow, so none is claimed. Recorded
in the manifest's `open_blockers`.

## 4. The fixtures

The fixture set is pinned by name in `test-kits/contracts/catalog-registry.test.mjs` `FIXTURE_SET`
(WP-0A-CON-008). The pin admits a new fixture as a written edit to that list, which `ctr-api-001` and
`ctr-evt-001` already use for their `-too-long` fixtures, so one fixture per bounded field was added and
pinned:

- CTR-SEC-001 (8): `invalid-scope-workspace-id-too-long.json`, `invalid-scope-business-profile-id-too-long.json`,
  `invalid-scope-page-context-profile-id-too-long.json`, `invalid-scope-capability-key-too-long.json`,
  `invalid-rotation-owner-id-too-long.json`, `invalid-revocation-actor-id-too-long.json`,
  `invalid-revocation-reason-key-too-long.json`, `invalid-correlation-id-too-long.json`.
- CTR-AUD-001 (4): `invalid-audit-id-too-long.json`, `invalid-actor-id-too-long.json`,
  `invalid-correlation-id-too-long.json`, `invalid-causation-id-too-long.json`.
- CTR-OBS-001 (10): `invalid-correlation-{correlation,request,causation,trace,job}-id-too-long.json`,
  `invalid-module-module-key-too-long.json`, `invalid-readiness-capabilities-capability-key-too-long.json`,
  `invalid-dependencies-dependency-key-too-long.json`, `invalid-sli-tags-module-key-too-long.json`,
  `invalid-sli-tags-capability-key-too-long.json`.

Each is a shipped valid fixture with one field set to `bound + 1` characters that **satisfy the field's
pattern**. For each, the generator checked two things against the shipped schema with the WP-0A-CON-002
subset validator: the fixture is rejected naming that field ("longer than maxLength"), and with that one
`maxLength` deleted it is accepted. So the bound alone rejects it. All values are synthetic
(`ws_synthetic_0101_aaa…`, `meta-publisher-aaa…`).

## 5. Carried role items, if cheap

| Item | Done |
|---|---|
| A1 N-2 second half: bound or pattern the 22, the four bare CTR-SEC-001 strings first | Done: all 22 bounded; the four bare strings (`scope.workspace_id`, `rotation.owner.id`, `revocation.actor.id`, `correlation_id`) at 128. Recording N-2 closed is A1's. |
| Q0 O-2, first half: `revocation.required` `reason_key` held only by the generic pin | Done: `ctr-sec-001/examples/invalid-revocation-reason-key-missing.json`, a revoked handle whose revocation record omits `reason_key`. Rejected by the shipped schema ("missing required property 'reason_key'"); accepted with `reason_key` dropped from `revocation.required`. |
| Q0 O-2, second half: `liveness.status` enum | Measured, nothing added: on `main` `0955b32e`, `ctr-obs-001/examples/invalid-liveness-status-enum.json` (`status: "zz_not_in_enum"`) is rejected by the shipped schema and ACCEPTED with `liveness.properties.status.enum` deleted, so an existing fixture already kills that site. Q0 should confirm. |
| Q0 O-3: closure §5 heading cites base `8c089cc` | Done: a dated one-line note under the heading in `author-conditions-closure-2026-10-06.md`. |
| C0 N-3: `author-self-check.md` §2 still quotes withdrawn claims | Done: a dated correction note before point 2; the original text kept as record. |
| R0's `integration_verified` wording for PR #196 | Already transcribed on `main`: `open_blockers[15]` carries R0's wording, recorded by A0 on R0's behalf, with `records-transcription-2026-10-06.md`. Nothing to transcribe here. |

## 6. Paths amended outside this package's writable paths

Declared in `ownership.amends_without_owning`:

- `test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs` (WP-0A-CON-007): the 22 entries removed from
  `KNOWN_UNBOUNDED`, with a dated comment. The guard's stale-entry assertion requires it.
- `test-kits/contracts/catalog-registry.test.mjs` (WP-0A-CON-008): the three annotation pins move (one
  `x-bound-note` per field: aud 23→27, obs 21→31, sec 21→29) and the three `FIXTURE_SET` name lists gain
  the 23 fixtures, each with a dated comment.
- `test-kits/contracts/schema-mutation-coverage.test.mjs` (WP-0A-CON-008, also listed by WP-0A-CON-003):
  `CONSTRAINT_SURFACE` records the 22 new `maxLength` sites and the two `sli_tags` pattern rewrites (three
  digests move); `SITE_FLOOR` raised to the measured counts (aud 68, obs 93, sec 86). `UNKILLED_CEILING`
  and `UNKILLED_SITES` do not move: every new site is killed.
- `test-kits/branch-identity.test.mjs`: the pinned branch-to-package table repoints the WP-0A-CON-004 row
  to the dated branch name (`ownership.branch_note`), as WP-0A-A0-003 did for its own dated branch.
- `test-kits/integrity-manifest.json` (WP-0A-A0-002): the four test files' digests, rebuilt by
  `npm run regenerate:manifest`.

The record of these amendments on the owners' manifests is owed by their next PRs, as for the 2026-10-06
increment (R0 R3); this package does not edit those manifests.

## 7. Commands

Exit codes and counts for the final head are in the handoff (`handoffs/WP-0A-CON-004-author-handoff.json`)
and in `evidence/VERIFICATION.md`; this file does not quote a test count.

| Command | Exit |
|---|---|
| `node --test test-kits/contracts/*.test.mjs` | 0 |
| `npm run regenerate:manifest` | 0 |
| `npm run check` | see handoff |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-004` | see handoff |

## 8. What this increment does not do

It moves no freeze level and no status in `index.json`. It does not close A1's carried items (C2 issuance
format, the §4(c) RFC, SEC-003 data class, SEC-016 break-glass fields, runtime redaction tests, cross-tenant
scope binding, audit immutability), F5 to the Owner (R5), the CON-004 amendment record on WP-0A-A0-002 and
WP-0A-CON-008 (R3), or the A6 OB-006 label-value budget. A bound is a rule change to a Draft contract, so
this increment needs its own C0, A1, Q0 and R0 round.
