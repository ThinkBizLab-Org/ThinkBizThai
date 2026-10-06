# WP-0A-CON-006: the bounds increment (open_blockers[13])

Author: `/claude/a0_atlas`, 2026-10-07, on `agent/claude/WP-0A-CON-006-stale-blockers`, recreated from
`origin/main` `0955b32e` (the branch's earlier head `569e331` merged in pull request #194).
Owner's words this runs on: the standing delegation `เอาตามที่คุณแนะนำทุกอย่าง`, and 2026-10-06 night
`คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน`. A0 executes; it decides nothing the
owners have not delegated. This file is the Author's record. It approves nothing. C0, Q0, A1 and R0
still have to re-check it.

## 1. What was owed

`open_blockers[13]` named the work. C0 N-6 asked for it. A1-S3 / SC-3 sharpened it, and C0 F-5 was added
to it (`evidence/WP-0A-CON-006/c0-recheck-2026-10-06.md`). The owed items:

- an upper bound on the ten reference-shaped fields that WP-0A-CON-007's `KNOWN_UNBOUNDED` lists for this package;
- NTF `dedupe_key` gets a stated composition or a character class that cannot carry a contact detail, or the
  manifest records why not (A1-S3 / SC-3);
- C0 F-5. Either a conditional that rejects `cost.supersedes_usage_id` on an `estimated` event, with an invalid
  fixture, or a declaration in `untestable_by_schema` that the field is ignored on an estimate.

## 2. Is an RFC required? No.

- Both contracts are **Draft**: `contract-catalog/shared-kernel/index.json` (status `Draft` for CTR-NTF-001 and
  CTR-USG-001) and each `manifest.json` `status`.
- The Decision Register's §5.1 defines Draft as `Owner กำลังออกแบบ` ("the owner is designing"). Consumers may
  run exploratory spikes only.
- The Candidate change path (an RFC before a meaning/requiredness change) protects consumers who have built
  fakes and tests against a Candidate. There are none at Draft.
- RFC-2026-009 governed the same bounds on CTR-EVT-001, CTR-API-001, CTR-IDM-001 and CTR-JOB-001. Those
  contracts carry consumers, and RFC-2026-009 already fixes the values for each class.
- This increment adds no new value class. It adds one rule (F-5) to a Draft contract, inside its owner's design
  phase, and records that rule as owed to A6.

This is A0's reading. If a reviewer reads `CONTRIBUTING_AGENTS.md` § Ownership ("contract meaning/requiredness")
as applying at Draft too, the F-5 rule is the one item that would need the RFC. The bounds take RFC-2026-009's
values as precedent. So no GOVERNANCE label.

## 3. The bounds, per field, with the reason

Each bound is a DECLARED INFERENCE. No baseline task states a length limit (RFC-2026-009 R-2). Each field's
reason is in its own `x-bound-note`.

| Contract | Field | Bound | Class and reason |
|---|---|---|---|
| CTR-NTF-001 | `notification_id` | 128 | id; the bound of `CTR-EVT-001.event_id`, `CTR-JOB-001.job_id` and `CTR-API-001.request_id` |
| CTR-NTF-001 | `message_key` | 128 | catalog key; a dotted identifier naming one catalog entry, so it takes the id bound. Longest fixture value: 29 |
| CTR-NTF-001 | `deep_link.target_ref` | 256 | `scheme:path` reference; the grammar and bound of `CTR-IDM-001.result_ref`, also the database CHECK length on the IDM/JOB/audit references RFC-2026-009 R-2 lists (CORRECTED 2026-10-07 for R0 R2 and A1-B3: NOT on `app.notifications.deep_link_target_ref`, which carries no length CHECK; see `author-review-conditions-closure-2026-10-07.md`) |
| CTR-NTF-001 | `dedupe_key` | 128 | dedupe key; `CTR-JOB-001.dedupe_key`'s bound (RFC-2026-009 R-2, "128 on the ids and dedupe_key") |
| CTR-USG-001 | `usage_id` | 128 | event id; `CTR-EVT-001.event_id`'s bound; also ID-002's redelivery key |
| CTR-USG-001 | `attribution.workspace_id` | 128 | id; `CTR-IDM-001.scope.workspace_id`'s bound; must equal `tenant_context.workspace_id` |
| CTR-USG-001 | `attribution.business_profile_id` | 128 | id; the same as `workspace_id` |
| CTR-USG-001 | `attribution.job_id` | 128 | names a CTR-JOB-001 job, so `CTR-JOB-001.job_id`'s own bound |
| CTR-USG-001 | `attribution.provider_key` | 64 | registry key; the class of `CTR-EVT-001.producer.module_key` (64). Longest fixture value: 10 |
| CTR-USG-001 | `cost.supersedes_usage_id` | 128 | holds a `usage_id`, so it takes `usage_id`'s bound |

**Composition check (measured):** `CTR-USG-001.dedupe_key` embeds `workspace_id` and `job_id`. At their new
maxima the composed key is at most `4 + 128 + 1 + 128 + 1 + 17 + 1 + 17 + 1 + 22 = 320` characters. That is
inside the key's own 512.

## 4. A1-S3 / SC-3: the PII shape

- **NTF `dedupe_key`** gets a CHARACTER CLASS: `^ntf:[A-Za-z0-9_-]+(?::[A-Za-z0-9_.-]+)*$`.
  - It rejects `@`, `+`, whitespace and `/`. So it rejects an email address, an E.164 number and a spaced name.
  - The witness is `invalid-dedupe-key-contact-detail.json`, which uses a synthetic `+000…` value that fails for
    the pattern alone.
  - It still admits a bare run of digits. That limit is recorded and not hidden: CTR-NTF-001
    `untestable_by_schema` (2), and the field's `x-pii-shape`.
  - The full COMPOSITION is **not** stated. It is ID-005's "dedupe key policy" and A5's decision. That is the
    recorded "why not" for the composition half.
  - The `ntf:` namespace follows CTR-USG-001's `usg:` and the shipped fixtures.
- **The ids** (`notification_id`, USG `job_id` and its siblings) stay opaque by design (RFC-2026-009 R-5).
  - A 128-character email address still validates in them, as A1 measured. Both manifests record this
    (NTF (2), USG (6)).
  - A character class for them is left to the owners (A5; A0 and A6).
- **A side effect**, measured. CTR-NTF-001 `dedupe_key.minLength: 1` is now subsumed by the pattern. This is
  the same case CTR-USG-001 already records.
  - It is named in `UNKILLED_SITES` with the proof, and declared in NTF `untestable_by_schema` (3).
  - Removing it is A5's edit.

## 5. C0 F-5: the first option, taken

CTR-USG-001 gains `allOf[0]`: an event with `cost.basis: "estimated"` cannot carry `cost.supersedes_usage_id`.
The witness is `invalid-estimated-carries-supersedes-usage-id.json`, and it fails only with
`$.cost: matches a schema it must not match`.

**Why the first option:** C0 measured the rule as expressible in the subset. This catalog's
`untestable_by_schema` lists only what the subset cannot express. Declaring an expressible rule there would
misuse the list.

The `if` is written with `cost.type: "object"`. Without it, a non-object `cost` satisfies the `if` vacuously and
the `then` rejects it. That took `cost.type`'s kill away from `invalid-cost-type.json`. The coverage guard
measured this on the first draft, and the fix is in place.

Two older fixtures carried `basis: "estimated"` with a `supersedes_usage_id`:
`invalid-cost-supersedes-usage-id-minlength.json` and `-type.json`. They now carry `provider_reported` (and the
matching `dedupe_key` segment), so each still fails for its named reason alone.

## 6. Fixtures

There are twelve new `invalid-` fixtures. Every one was validated with the repository's subset validator, and
each produces exactly one error, on its named field:

- **CTR-NTF-001:**
  - `invalid-notification-id-too-long.json`
  - `invalid-message-key-too-long.json`
  - `invalid-deep-link-target-ref-too-long.json`
  - `invalid-dedupe-key-too-long.json`
  - `invalid-dedupe-key-contact-detail.json`
- **CTR-USG-001:**
  - `invalid-usage-id-too-long.json`
  - `invalid-attribution-workspace-id-too-long.json`
  - `invalid-attribution-business-profile-id-too-long.json`
  - `invalid-attribution-job-id-too-long.json`
  - `invalid-attribution-provider-key-too-long.json`
  - `invalid-cost-supersedes-usage-id-too-long.json`
  - `invalid-estimated-carries-supersedes-usage-id.json`

Each too-long value satisfies the field's pattern where it has one. So only the bound rejects it.

**Why the fixtures are added, not owed:**

- WP-0A-CON-008 owns `FIXTURE_SET`, and its `author_agent_run_id` is `/claude/a0_atlas`. The owner is A0, and
  A0 allows the twelve names.
- Without them, CTR-NTF-001 measured **29/44 (65.9 %)**, below the 70 % `COVERAGE_FLOOR`. The bounds could
  not land without lowering a floor, and lowering a floor is not an option.
- Acknowledgement by `/claude/r0_steward` (WP-0A-CON-008's Integration Owner) is OWED.

## 7. Guards moved (all outside writable paths; declared in `ownership.amends_without_owning`)

**`test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs`** (WP-0A-CON-007's)
- The ten `KNOWN_UNBOUNDED` entries are removed.

**`test-kits/contracts/schema-mutation-coverage.test.mjs`** (WP-0A-CON-003's)
- `CONSTRAINT_SURFACE` is regenerated for both contracts by the guard's own `surfaceOf`: NTF +5 lines, USG +14,
  none removed.
- `SITE_FLOOR`: NTF 39 → 44, USG 37 → 48.
- `UNKILLED_CEILING`: NTF 9 → 10, USG 1 → 4.
- `UNKILLED_SITES`: + NTF `properties.dedupe_key.minLength`.
- USG's three extra unkilled sites are `allOf[0]`'s `if` sites, which the redundancy proof excuses.

**`test-kits/contracts/catalog-registry.test.mjs`** (WP-0A-CON-008's)
- `FIXTURE_SET`: +5 NTF names, +7 USG names, none removed.
- `ANNOTATION_DIGESTS`: NTF 15 → 20, USG 15 → 22.
- Both `untestable_by_schema` caveat digests move.

**`test-kits/integrity-manifest.json`** (WP-0A-A0-002's)
- Exactly the three digests above move. Regenerated by `npm run regenerate:manifest`.

## 8. Owed, not done here

- **A5 ratification** of the NTF bounds, the class and the declarations: `open_blockers[22]`.
- **A6 countersignature** of the USG bounds, the F-5 rule and `untestable_by_schema` (6): `open_blockers[23]`.
- **R0 acknowledgement** of the four amendments in §7.
- **ID-005's NTF dedupe-key composition**, and a character class on the opaque ids: A5 for NTF; A0 and A6 for USG.
- **C0, Q0, A1 and R0 re-checks** of this increment. Until they are recorded, `open_blockers[13]` reads
  "LANDED ON THIS BRANCH … NOT CLOSED".

## 9. Commands

`npm run check` and the scope and handoff checks were run on the branch name. The counts are in
`evidence/VERIFICATION.md` and the handoff, not restated here.

## 10. Superseded in part, 2026-10-07

After the first C0, A1, Q0 and R0 runs on this increment, `author-review-conditions-closure-2026-10-07.md`
changed three things this file describes. The C0 F-5 rule (USG `allOf[0]`) and its fixture
`invalid-estimated-carries-supersedes-usage-id.json` were WITHDRAWN in favour of C0's second option (C0 F-3),
so §2's no-RFC reasoning now covers the ten bounds and the class only. The NTF `dedupe_key` sizing limit is
declared (C0 F-1). Three USG too-long fixtures were made consistent with rules (5) and (3) (Q0 Q-1). The
rest of this file stands as the record of the commit it describes.
