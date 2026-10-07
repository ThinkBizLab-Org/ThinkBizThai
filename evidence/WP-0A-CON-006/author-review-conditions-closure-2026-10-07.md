# WP-0A-CON-006: Author closure of the first role runs on the bounds increment, 2026-10-07

Author run: `/claude/a0_atlas`. This file was written by a subagent of that run. PR #209, branch
`agent/claude/WP-0A-CON-006-stale-blockers`, starting head `bd8b56c4`.

The Owner's words this runs on:

- the standing delegation `เอาตามที่คุณแนะนำทุกอย่าง`;
- 2026-10-06 night: `คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน`.

A0 executes; it does not decide. Where a finding offered options, this file takes the one that leaves a
decision with its owner. It approves no review, test, security or integration gate, and it authorises no merge.
G0 remains Specification Baseline Complete / External Verification Pending. All data is synthetic. No RFC,
script, CI file, `db/` path or `docs/` path is touched, so this is not a governance PR.

## 1. Order of work

1. Checked the branch out by name in a fresh worktree. `origin/main` is `9b4a0ce`, already contained in the
   head (merge `42111dd`), so no merge was needed.
2. Cherry-picked with `-x` the four role commits, each adding one file under `evidence/WP-0A-CON-006/`:
   - C0 `767efdc`;
   - A1 `4fb6179`;
   - Q0 `673a3e1`;
   - R0 `b235205`.
3. Closed or recorded every finding below in one commit, inside `writable_paths` plus the four declared
   `amends_without_owning` paths. The handoff is NOT refreshed here; that comes last and alone.

## 2. Findings and dispositions

| Source | Finding | Disposition |
|---|---|---|
| C0 F-3 (Medium, governance); A1-B4; R0 I-1; Q0 I-1 | The F-5 rule (`estimated` cannot carry `cost.supersedes_usage_id`) decides part of the supersession model, so the Draft-only no-RFC reasoning does not cover it (RFC-2026-014 precedent). C0 offers: (i) an A6 not-billing-semantics countersignature that R0 accepts, (ii) a short RFC, or (iii) C0's second F-5 option | **(iii) taken.** CTR-USG-001 `allOf[0]` and `invalid-estimated-carries-supersedes-usage-id.json` are **removed**. The manifest's `untestable_by_schema` gains item **(7)**: the contract does not decide whether an estimate may supersede, the schema accepts it, and a consumer must not read an estimate's `supersedes_usage_id` as replacing anything. Adopting the rule is A6's, through the RFC path if A6 reads it as billing semantics: `open_blockers[23]`. Why (iii): (i) needs a decision A6 has not given, and (ii) would be A0 proposing billing semantics. Only (iii) lands nothing that its owner has not decided. |
| C0 F-2; Q0 Q-2 (Low) | `allOf[0]`'s `x-rule` says its witness fixture is still owed | **Closed by F-3.** The `x-rule` left with the rule. |
| C0 F-1 (Medium); Q0 Q-4 (Advisory) | NTF `dedupe_key`: 128 and the first-segment class do not fit `ntf:<source id>:<event>` | **Declared.** The bound and the class are NOT changed. The key's composition is ID-005's and A5's (`open_blockers[22]`), and resizing it here would be A0 deciding A5's composition. The `dedupe_key` `x-bound-note` now states the measured limit: the longest source id that fits with `:approved` is 115, and a dotted id such as `content.v2` is rejected. It also says A5's composition must size against the bound and class, or change them. `[22]` carries the same item. |
| Q0 Q-1 (Low) | Three USG too-long fixtures broke rule (5) or (3) on top of their named fault | **Fixed.** `invalid-attribution-workspace-id-too-long.json` puts the 129-character id in `tenant_context.workspace_id` and in the `dedupe_key`. `invalid-attribution-business-profile-id-too-long.json` puts it in `tenant_context.business_profile_id`. `invalid-attribution-job-id-too-long.json` puts it in the `dedupe_key`. Each still fails exactly once, on its named field (measured, §3). |
| Q0 Q-3 (Low) | `SITE_FLOOR` ctr-usg-001 was 48 against a measured 50 | **Fixed.** After the F-3 withdrawal the measured count is 45, and the floor is 45. |
| C0 F-4; A1-B1; R0 R1 | `app.notifications` (051) and `app.usage_events` (061) are wider than the contract; 051's header and comment are stale; 051's fixture keys no longer fit; the handoff says "None" | **Recorded as owed** to WP-0A-DB-00 in the new **`open_blockers[24]`**: a forward migration or a corrected record. `db/**` is forbidden to this package. It is not stop-the-line: the database is wider than the wire. The F-5 CHECK that A1 and R0 named is no longer owed, because the rule was withdrawn. The handoff's `migration_and_data_impact` is corrected at the handoff refresh, which this step does not do. |
| R0 R2; A1-B3 (record) | Author evidence §3 says `target_ref`'s 256 is "also the database CHECK length" | **Corrected in place** in `author-bounds-increment-2026-10-07.md` §3, marked CORRECTED. It is true for the IDM, JOB and audit references, not for `app.notifications.deep_link_target_ref`. A §10 there points here. |
| R0 R3 (process) | C0, Q0 and A1 had not run | **Answered** by the four cherry-picked files. They must now re-check this closure commit (§4). |
| C0 I-1; R0 R4 | Whether `[22]` and `[23]` gate the merge | **Recorded as R0 read it:** they gate `integration_verified`, the closure of `[13]` and freeze. They do not gate merging as `in_review`. This is now written into `[22]` and `[23]`. |
| A1-B2 (accepted residual) | The NTF class still admits a digit run and a dotted name without `@` | Already declared in NTF `untestable_by_schema` (2). Nothing changes. |
| A1-B5; R0 acknowledgement | A0 allowed its own FIXTURE_SET names | R0 acknowledged the four guard files at `bd8b56c`. The pins moved again here (§3), so a **fresh R0 acknowledgement is owed**. This is recorded in `amends_without_owning.rationale`. |
| C0 I-2, I-3 | A0-written NTF content; double fault of the older NTF minlength fixture | Info. Both are already recorded (`[1]`, `[2]`, `[22]`; NTF (3) and `UNKILLED_SITES`). |
| Found by A0 while closing (not a reviewer finding) | Once cherry-picked, `npm run scan:secrets` failed on `q0-review-2026-10-07.md`: `pii: thai-phone-number`. The probe table quoted a realistic mobile-number shape twice, once bare and once in E.164 form. | **Redacted in place, visibly.** Both probe values in that table were replaced by synthetic zero runs, `ntf:0000000000:approved` and `ntf:+00000000000`. These are the same shapes C0 and the shipped fixture use. Each changed cell is marked with A0's note. The verdicts Q0 recorded do not change: a bare digit run is still accepted, and `+` is still rejected. **Q0 must confirm the edit on re-check.** The other choice was to allowlist the number in the scanner, which the scanner's own comment refuses. |

## 3. What moved, measured

All of this was measured with Node `v24.20.0` first on `PATH`, in the worktree, on the branch name.

**Contract changes**

- **CTR-USG-001 schema.** `allOf` is removed (one rule, 8 constraint-surface lines). Every other key is
  byte-for-byte as at `bd8b56c`.
- **CTR-USG-001 manifest.**
  - One example is removed from the list.
  - `untestable_by_schema` (6): its last sentence no longer names the F-5 rule.
  - `untestable_by_schema` (7): added.
- **CTR-NTF-001 schema.** One `x-bound-note` sentence block is added. No assertion moves.

**Guard pins**

- `schema-mutation-coverage.test.mjs`, ctr-usg-001:
  - `CONSTRAINT_SURFACE` digest `8516f55cf46c99f4` → `8f81070a5da43640`, minus the 8 `allOf.0` lines;
  - `SITE_FLOOR` 48 → 45;
  - `UNKILLED_CEILING` 4 → 1.
- `catalog-registry.test.mjs`:
  - FIXTURE_SET ctr-usg-001 loses one name.
  - ANNOTATION_DIGESTS ctr-ntf-001: count 20, digest `394bff8e52a5141a` → `6676c9e55382b076`.
  - ANNOTATION_DIGESTS ctr-usg-001: count 22 → 21, digest `d7b21fd9694ab59d` → `54e3a0d20e9fecb5`.
  - CAVEAT_DIGESTS ctr-usg-001 `untestable_by_schema`: `0a75650cb201efa8` → `cbd0acbf2f282076`.
- `test-kits/integrity-manifest.json`: the two test-file digests move, regenerated by `npm run regenerate:manifest`.

**Checks**

- Each guard failed first with the exact measured value, and each pin above is that value.
- `node --test test-kits/contracts/*.test.mjs`: 79/79.
- Probes with the repository's subset validator, `test-kits/contracts/json-schema-subset.mjs`:
  - Every USG and NTF fixture has the error count its name promises. The exceptions are the two
    `invalid-dedupe-key-minlength.json` fixtures, whose double fault was declared before this change.
  - The three re-made USG fixtures each fail once, on their named field. Rules (5) and (3) hold in each. Their
    keys are 193, 100 and 211 characters, all within 512.
  - `valid-estimated-storage.json` with a `supersedes_usage_id` added now **validates**, which is declaration (7).

The full `npm run check`, scope, identity and handoff checks are run before the push and recorded in the
handoff refresh. They are not restated here.

## 4. Who re-checks, and what stays owed

The contract changed beyond records (USG `allOf` was withdrawn, three fixtures were re-made, and an NTF annotation
was added), so these runs must re-check the closure commit:

- **C0**: F-1 through F-4;
- **Q0**: Q-1 through Q-3, and the new pins;
- **A1**: the withdrawal changes what the wire rejects, though only toward acceptance; SC-3 is unchanged;
- **R0**: a fresh acknowledgement of the moved pins, and its integration verdict.

After them, the handoff refresh comes last and alone, and CI must be green on that head.

These stay owed:

- A5: `[22]`, with `[1]`, `[2]` and `[19]`;
- A6: `[23]` and `[18]`, including whether to adopt the withdrawn rule;
- WP-0A-DB-00: `[24]`.
