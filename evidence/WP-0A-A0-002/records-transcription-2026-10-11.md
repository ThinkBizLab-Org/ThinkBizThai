# Records transcription: six amendment records on WP-0A-A0-002, each acknowledged by R0 (2026-10-11)

Scribe: `/claude/a0_atlas` (A0). A0 gives no acknowledgement. Each acknowledgement is `/claude/r0_steward`'s, as this
package's Integration Owner, given in the file each record cites, on `main`; the quoted sentence is extracted by script.

| amended_by | By | PR, merge | What moved in this package's files | R0's acknowledgement |
|---|---|---|---|---|
| `[4]` | WP-0A-CON-004 | #236, `5e444c53` | `DIGESTED_FLOOR` +RFC-2026-032; `integrity-manifest.json` key + regeneration | `evidence/WP-0A-CON-004/r0-review-2026-10-09-pr236.md` §2 |
| `[5]` | WP-0A-CON-004 | #239, `92968774` | `DIGESTED_FLOOR` +RFC-2026-033; `integrity-manifest.json` key + regeneration | `evidence/WP-0A-CON-004/r0-review-2026-10-09-pr239.md` §2 |
| `[6]` | WP-0A-CON-006 | #242, `9d0751ec` | one digest (`catalog-registry.test.mjs`) | `evidence/WP-0A-CON-006/r0-review-2026-10-10-ntf2a.md` R0-242-4 |
| `[7]` | WP-0A-CON-006 | #243, `50d9dd8a` | one digest | `evidence/WP-0A-CON-006/r0-review-2026-10-10-ntf2b.md` R0-243-3 |
| `[8]` | WP-0A-CON-006 | #244, `89b2167d` | five digests | `evidence/WP-0A-CON-006/r0-review-2026-10-10-ntf3.md` R0-244-3 |
| `[9]` | WP-0A-CON-008 | #245, `f0b948c7` | two digests (RFC-2026-010, `WP-0A-CON-008.json`) | `evidence/WP-0A-CON-008/r0-review-2026-10-11-ntf4.md` R0-245-4 |

`amended_by[0]` to `[3]` are unchanged. Status stays `integration_verified`. No script, test or digest changes on
this branch. Older amendments not named above (for example #229's for RFC-2026-031) are not recorded here.

## Second increment of 2026-10-11 (after PRs #251 and #252)

Written by A0 (`/claude/a0_atlas`) under RFC-2026-034 (PR #251). A0 gives no acknowledgement of its own. This pull
request adds `amended_by` entries, so it is **not** records-only (RFC-2026-025 §6.1 rule 4 admits acknowledgement keys
only on existing entries); it is tier H outside governance and takes the RFC-2026-034 §2.2 Risk lane (A1 and Q0).

| Entry | Amending package | What | Acknowledgement |
|---|---|---|---|
| `[10]` | WP-0A-CON-008 | `package.json` gains `"record:verification": "node scripts/record-verification.mjs"` (first at `ae5864d6`) | acknowledged: R0's words in `evidence/WP-0A-A0-001/r0-review-2026-10-11-pr250.md` §6, which says this package is where the record belongs (WP-0A-A0-001 `amended_by[3]` carries R0's correction) |
| `[11]` | WP-0A-CON-008 | PR #249 (`b83f420b`): `integrity-manifest.json` regenerated for `work-packages/WP-0A-CON-008.json` alone | acknowledged: R0's words in `evidence/WP-0A-CON-008/r0-review-2026-10-11-pr249.md` §6 (R0-246-3, R0-249-3) |
| `[12]` | WP-0A-A0-001 | PR #251 (`8086281b`): `DIGESTED_FLOOR` gains the RFC-2026-034 path (`21af6654`); the integrity manifest regenerated for that script, `CONTRIBUTING_AGENTS.md`, `test-kits/repository-json.test.mjs` and the new RFC | **pending** `/claude/r0_steward`: no R0 acknowledgement of it is on `main`; R0 may give it in the first round audit (RFC-2026-034 §2.3) |

Both acknowledgement notes are R0's text verbatim inside the transcription sentence WP-0A-A0-001 uses, extracted by
script. Measured for `[12]`: `git diff b4aa4fcd 8086281b -- scripts/verify-test-coverage-floor.mjs` is one added
line; the manifest diff moves those four digests. PR #252 changed no file of this package.

Still not recorded (R0-246-1): the older amendments of this package's files by #211, #213, #229, #230, #233 and #237,
and R0's review of `amended_by[0]` to `[2]`.
