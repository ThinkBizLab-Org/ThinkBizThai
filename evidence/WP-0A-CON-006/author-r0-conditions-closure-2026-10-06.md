# WP-0A-CON-006: Author closure of the R0 conditions (R0 `6dcafee`), 2026-10-06

Author run: `/claude/a0_atlas` (this file was written by a subagent of that run). PR #194, branch
`agent/claude/WP-0A-CON-006-stale-blockers`. A0 executes under the Product Owner's delegation
"เอาตามที่คุณแนะนำทุกอย่าง". A0 does not decide. Each item below carries out a condition the way the
named role worded it. This file approves no review, test, security or integration gate, and it
authorises no merge. G0 remains Specification Baseline Complete / External Verification Pending.
All data is synthetic. No RFC was touched, so this is not a governance PR.

## 1. Order of work

1. Cherry-picked with `-x` the four role commits: C0 `69a6456`, A1 `734c4ee`, Q0 `78a272d`, R0
   `6dcafee`. Each one adds a single file under `evidence/WP-0A-CON-006/`.
2. Merged `origin/main` at `fa10229` into the branch with a normal merge, commit `cd2b276`. The only
   conflict was in `test-kits/integrity-manifest.json`. I resolved it the way R0 §5 and C0 F-4 say:
   this branch's `catalog-registry.test.mjs` digest (`441fb17b…`) and main's
   `ctr-evt-001-schema-ref-bounds.test.mjs` digest (`cc93f8be…`). `npm run regenerate:manifest` then
   rebuilt 91 digests, and `cmp` against the hand-resolved file showed them identical.
3. Closed the conditions below in one commit, inside `writable_paths` plus the two declared
   `amends_without_owning` paths.

## 2. Conditions and what was done

| Source | Condition | Done here |
|---|---|---|
| A1 SC-1 / R0 R1 (A1-S1, Medium) | CTR-USG-001 must declare that `attribution.workspace_id` (and `business_profile_id` when present) equals the Trusted Tenant Context's value in the same identifier space, and that a consumer rejects a mismatch | `ctr-usg-001/manifest.json` `untestable_by_schema` gains item (5), which says exactly that. It states that the fields are not different identifiers, and it names the enforcement owner: the usage-ledger consumer, MOD-130 (A6), at ingest. The same rule is on `attribution` in `schema.json` as an `x-rule`. A fixture for a mismatch **cannot** be written: the subset validator has no cross-field comparison, as A1 itself recorded and as items (2) and (3) already say. So no invalid fixture is shipped. |
| A1-S1 (fixtures) | The valid fixtures carried `ws_synthetic_0001` in `attribution` and `dedupe_key` against a UUID in `tenant_context` | All 46 object fixtures of CTR-USG-001 now carry `00000000-0000-4000-8000-000000000001` there. The error list of every one of the 47 fixtures under the shipped validator is **byte-identical** before and after (measured). No fixture name changes. |
| A1 SC-1 (countersignature) | "Countersigned by A6" | **OWED.** It is recorded as `open_blockers[18]`, to be given in G0 step 5's A6 run, together with A1, C0 and Q0 re-verification of this commit (RFC-2026-025 §5 item 2). |
| R0 R1 (pins) | Move the seventh pin and the digest, and rewrite the rationale | `catalog-registry.test.mjs`: the USG `untestable_by_schema` caveat is the seventh pin. C0 F-3 below adds an **eighth**, the USG `source_references`. Two of the original six move again: the USG annotation pin goes from count 14 to 15 plus a new digest (the new `x-rule`), and the NTF `source_references` digest changes. The integrity-manifest digest moves. `amends_without_owning.rationale` now says eight and names each pin. **A fresh R0 acknowledgement is needed** (R0 §5). |
| A1-S2 / SC-2 (Medium) | The deep-link permission check has no subject | Recorded as owed to A5 in `open_blockers[19]`, with A1's SC-2 text verbatim. NTF is not redesigned here. |
| A1-S3 / SC-3 (Low) | Personal data in free-form identifiers; NTF `dedupe_key` composition | `open_blockers[13]` extended with the PII-shape point and the `dedupe_key` composition or character class |
| A1-S4 / R0 R4 | `required_human_authorities[1]` is stale | Marked DISPOSED with a pointer to `evidence/WP-0A-CON-004/security-disposition-handle-ownership-a1.md` §4. The original text is kept. |
| R0 R2 / C0 F-1 / Q0 N1 | H-6 has no owner | `open_blockers[17]`: owed by WP-0A-CON-001, with R0 R2 as the receipt. `integration_owner_note` is corrected to cover evidence/ (Q0 N1). |
| C0 F-2 | The "#188 not merged" reason in `open_blockers[13]` has expired | Rewritten: #188 merged at `fa10229`, and this branch carries it. The ten bounds are **scheduled as this package's next increment** with RFC-2026-009's values (ids 128, references 256), A5 and A6 sign-off. |
| C0 F-3 | Decision Register 5.5 missing from `source_references` | Added to both CTR-USG-001 and CTR-NTF-001. |
| Q0 N2 | H-9's single-fault fix is not pinned | `open_blockers[20]`: owed to WP-0A-CON-003 / WP-0A-CON-008 |
| R0 R5 | Owner manifests do not record the amendments | `open_blockers[21]`: advisory, owed by WP-0A-CON-008 / WP-0A-A0-002 |
| R0 §6 step 4 | Mark `open_blockers[16]` answered by the four role files | Done. The original text is kept. |

No assertion keyword, enum, requiredness, assertion site or freeze level moves. An `x-rule` is an
annotation, and `schema-mutation-coverage.test.mjs` passes without an edit. The contract test
directory measured `tests 79, pass 79, fail 0`.

## 3. Not done here, on purpose

- The handoff refresh. The brief says not to refresh it yet, so the handoff guard is expected to be
  red until the last-and-alone handoff commit.
- Any RFC, NTF redesign, or a file under WP-0A-CON-001's, CON-003's, CON-008's or A0-002's ownership
  beyond the two declared amendments.
- `integration_verified`. It needs a fresh R0 verdict at the new head (R0 §6 step 6), A6's
  countersignature, and the re-verification named above.
