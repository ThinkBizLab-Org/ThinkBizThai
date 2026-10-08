# WP-0A-CON-008: A0 closure of the first role round on the G1 freeze-readiness increment — 2026-10-08

Author: `/claude/a0_atlas` (A0), on PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/216, branch
`agent/claude/WP-0A-CON-008-merge-parent-order`, reviewed head `4fe85fdfca8636781231d614b587bfe0149915a1`,
`origin/main` `bd019c9c` (unchanged since the increment; no merge of `main` was needed).

The Owner's words under which A0 runs this pass: the standing delegation "เอาตามที่คุณแนะนำทุกอย่าง",
and on the night of 2026-10-06 "คืนนี้คุณยิงยาว เหมือนเดิมเบย ไม่ต้องถามผม ไล่ทำไปทั้งคืน". A0 executes
the recommendations below; it decides no gate rule, gives no co-owner signature and moves no status.

The four role files are cherry-picked with `-x` onto the branch:

| Role | Run | Verdict at `4fe85fdf` | File |
|---|---|---|---|
| Reviewer | `/claude/c0_contract_reviewer` | `review_approved_with_conditions` (F-1..F-3 before merge) | `c0-review-2026-10-07.md` |
| Security | `/claude/a1_bastion` | `security_approved_with_conditions` (N-1, N-2 recorded before leaving `in_review`) | `a1-review-2026-10-07.md` |
| Tester | `/claude/q0_sentinel` | `test_verified` | `q0-review-2026-10-07.md` |
| Integration | `/claude/r0_steward` | not yet `integration_verified`; conditions 1-5 | `r0-review-2026-10-07.md` |

No role raised a stop-the-line finding.

## Disposition of every finding

| ID | Grade | Decision | Where |
|---|---|---|---|
| C0 F-1 / A1 N-1 | Medium condition / Low-Medium record | **Fixed as a record; the question is routed, not answered.** §1 now quotes Register §7.2 (2) (line 365) beside §1.2/§5.1, states the cycle, names the one-event reading both reviewers point to, and does not choose between readings. §4 item 3 no longer orders `WP-0A-A0-010` before every freeze. The question is recorded as owed by the **Product Owner + A0** (G0-024), through an RFC, in manifest `open_blockers[6]`. A0 does not decide it: interpreting the G0 pass rule is gate territory (C0 I-3). | record §1, §4; manifest `open_blockers[6]` |
| C0 F-2 / R0 R-2 | Medium condition / Low | **Fixed.** The SEC row cites RFC-2026-013's immediate effect, the 2026-09-02 co-owner review's "all now signed" and the G0 tracker's "เซ็นโดยมีเงื่อนไขบังคับ", and says why they do not carry SEC to Candidate today: the eight SEC bound values changed on 2026-10-07; A1, with RFC-2026-013 already in force, said on 2026-10-05 the RFC-2026-010 question "is still not answered"; SEC has no Product Owner disposition. The conflict is left to A1 and the Product Owner. "At each round since 2026-10-05" is corrected to the 2026-10-05 and 2026-10-06 files (lines 215, 172); the 2026-10-07 files say "at Draft only". A1's own §4 of this round ("I do not promote it") confirms the row. | record §3 SEC row |
| C0 F-3 | Low condition | **Fixed.** `scope.include` now says eleven of the twelve are assessed and CTR-NTF-001 is listed, not assessed; the NTF row carries "listed, not assessed" and no verdict; `scope.exclude` and `open_blockers[3]` already agree. | manifest `scope.include`; record §3 NTF row |
| C0 F-4 / Q0 O-1 | Low record / observation | **Fixed.** The API, IDM, MOD and FLG rows name the "Draft only." `freeze_boundary` restatement owed by A0 before freeze, citing WP-0A-CON-003 `open_blockers[14]` (3), where it is already recorded on `main` (C0 corrects Q0's "no blocker records it"). The API quote no longer drops "Draft only." with an ellipsis. CTR-PAG-001 is noted as carrying the same sentence, outside the twelve. The restatement itself is in `contract-catalog/`, read-only here; owed by A0 in the package that owns those paths. | record §2 |
| A1 N-2 / C0 I-2 | Low record / Info | **Fixed.** The Luhn-digest scanner hazard is restored as manifest `open_blockers[5]`, owner WP-0A-A0-003 (the package whose writable paths hold `scripts/scan-repository-secrets.mjs`). The offending digit run is not reproduced. It reaches the handoff at the next refresh. | manifest `open_blockers[5]` |
| Q0 O-2 | observation | **Fixed.** The JOB row carries the H-6 `x-amended-by` record (WP-0A-CON-006 `open_blockers[17]` names ctr-evt-001 and ctr-job-001); §4 item 3 lists API/IDM/EVT/JOB. Owner WP-0A-CON-001. | record §2 JOB row, §4 |
| R0 R-1 | Info | **Fixed.** "§3" corrected to §4.1 Ownership Rules, line 138. | record §1 table |
| R0 R-3 / C0 I-1 | Low accepted / Info | **No change.** Handoff `open_risks_or_blockers[0]` stays reworded against `APPROVAL_LANGUAGE`, meaning equal to manifest `open_blockers[0]`, as R0 recorded the exception. The new `[5]` and `[6]` use no approval verb, so the next refresh can copy them byte-equal. | — |
| R0 R-4 | Info | **Recorded.** `mergeStateStatus` is CLEAN with no role verdict; the Draft flag is the only mechanical hold. The merge decision checks R0's conditions 1-5, not the button. | here |
| R0 R-5 | Info, escalation | **Owed by A0 to the Owner, in A0's next report.** The plan's 3-5 PD for "bring the contracts G1 uses to Frozen v1" is not achievable inside this package: every Candidate → Frozen step waits on the gate-rule question in `open_blockers[6]`, an RFC defining the freeze review, and the per-contract owners; the Draft four wait on A6, A1 and A5 runs and a Product Owner disposition. | here |
| R0 R-6 | Info | **Recorded.** R0 acknowledges the one-line `test-kits/integrity-manifest.json` amendment (digest of `work-packages/WP-0A-CON-008.json`); this pass moves the same line again, by `npm run regenerate:manifest`, not by hand. The amendment record on WP-0A-A0-002's manifest stays owed by that package's next PR. | here |
| C0 I-3 | Info | **Recorded.** This PR stays a non-governance PR: the F-1 fix records a question and its owners; it does not interpret the G0 pass rule. | here |
| Q0 O-3 | observation | **No change.** The branch name is the previous increment's; the guards map it to WP-0A-CON-008. | — |
| Q0 O-4 | observation | **Recorded.** C0, A1 and R0 verdicts are on the branch; co-owner signatures (A1, A6, A5) are owed before any status move, not before this merge. | here |

## What changed in this pass

- `evidence/WP-0A-CON-008/g1-freeze-readiness-2026-10-08.md`: §1 (R-1, F-1/N-1), §2 rows API, IDM,
  JOB, MOD, FLG (F-4/O-1, O-2), §3 rows SEC (F-2/R-2) and NTF (F-3), §4 item 3. **No verdict changed**:
  every contract that was blocked is still blocked; NTF moves from "blocked" to "listed, not assessed",
  which removes a verdict rather than changing one.
- `work-packages/WP-0A-CON-008.json`: `scope.include` item (F-3); `open_blockers[4]` amended in place,
  index kept; `open_blockers[5]` (N-2) and `[6]` (F-1/N-1) added. Status stays `in_review`.
- `test-kits/integrity-manifest.json`: the `work-packages/WP-0A-CON-008.json` digest, regenerated.
- This file.

Nothing under `contract-catalog/`, `docs/`, `architecture/`, `scripts/`, `.github/` or any test file
changed. The handoff is **not** refreshed in this pass; it is refreshed last and alone after the
re-checks.

## Who re-checks

- **C0**: F-1, F-2, F-3 were C0's merge conditions; C0 re-checks this commit.
- **A1**: N-1 and N-2 were A1's conditions, and the SEC row it co-owns was rewritten; A1 confirms.
- **R0**: its condition 1 lapses on any change beyond evidence, manifest record lines and the handoff;
  this pass also changes `scope.include`, so R0 re-checks, then conditions 3-5 (status record, handoff
  last and alone, bootstrap green on the final head).
- **Q0**: its carry rule covers record wording that adds O-1/O-2 without changing a verdict and a
  regenerated digest. This pass also edits the manifest's `scope.include` and `open_blockers` and
  rewrites the NTF and SEC rows; A0 asks Q0 to confirm the carry rather than assume it.
