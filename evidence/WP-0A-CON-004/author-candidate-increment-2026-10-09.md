# WP-0A-CON-004: CTR-SEC-001, CTR-AUD-001 and CTR-OBS-001 Draft → Candidate (Author increment, 2026-10-09)

Written by a subagent of `/claude/a0_atlas`, the Author. It states what this increment changes, what it was checked
against, and what it leaves undone. It is not a role verdict. The Author approves, test-verifies and integrates
nothing.

Branch `agent/claude/WP-0A-CON-004-security-audit-observability-2026-10-09`, fast-forwarded to `origin/main`
`d17ff25606977b6e9135e9466e3606a7ccdc45da` (PR #231), the head both signatures read.

## 1. Commits, in order

| Commit | What | Why first / why separate |
|---|---|---|
| `1b9c81a9` | A1's signature, `git cherry-pick -x 2688c040` | the co-owner signature on SEC (RFC-2026-031 §3.2 (2), §4.1 (1)) |
| `4a40b6a3` | A6's signature, `git cherry-pick -x 855c2eb2` | the co-owner signature on AUD and OBS |
| `01deb3c1` | `product-owner-disposition-2026-10-09-candidate-sec-aud-obs-usg.md` | A1 K2 (F5) and K3, RFC-2026-031 §3.2 (3): the Owner's words on the branch before the move |
| `15e2dd30` | the status move, every file of it in one commit | RFC-2026-031 §4.5, "All of these move in one commit" |
| next | `work-packages/WP-0A-CON-004.json` records and this file | cite `15e2dd30` as the head the move landed at (A1 §7 (d) asks for it) |
| last | the handoff, refreshed last and alone | |

## 2. The conditions of the signatures, checked against `15e2dd30`

| Condition | Check | Result |
|---|---|---|
| A1 K1, A6 §8: under the three directories only `manifest.json` `"status"` changes | `git diff d17ff256 15e2dd30 -- contract-catalog/shared-kernel/ctr-{sec,aud,obs}-001` | three hunks, each `-  "status": "Draft",` / `+  "status": "Candidate",`; nothing else |
| A1 header: SEC tree and schema digest | `git rev-parse d17ff256:contract-catalog/shared-kernel/ctr-sec-001`; `shasum -a 256 …/ctr-sec-001/schema.json` at `15e2dd30` | tree `40893342…` at the signed head; schema `ef604c02…dbfc9`, equal to A1's header |
| A6 §0: AUD and OBS blobs | `git rev-parse 15e2dd30:<path>` | AUD schema `73609d10`, examples `05d24f98`; OBS schema `c9f28c72`, examples `64ab193a`; all equal to A6's §0 (each `manifest.json` differs by the status line only) |
| A1 K1, A6 §8: outside the directories, only index status, registry pin, census assertions, integrity manifest | `git show --stat 15e2dd30` | those, plus `ratchets-bite.test.mjs`, where one reversal that set CTR-SEC-001 to Candidate would be a no-op after this move; it now names CTR-NTF-001. Neither signature names that file. It is not contract text, and the reason is in `amends_without_owning.rationale` item (5). **Flag for A1 and A6:** whether this edit sits inside "the census assertions" is theirs to say |
| A1 K2: F5 on `main` with or before the move | `01deb3c1` | in this PR, before `15e2dd30` |
| A1 K3: the Owner's disposition naming CTR-SEC-001 | same file §2, question 2 | `อนุมัติ SEC (Recommended)` |
| A1 K4: the consumer bound in the status-move record | `open_blockers[22]` | A1's §7 (d) wording, which carries the K4 sentence byte for byte |
| A1 K5: its own round | — | owed: C0, A1, Q0, R0 at this PR's final head. Status stays `in_review` |
| A6 §5 restriction | `open_blockers[21]` (A6's words) and `[23]` (A0's) | recorded |
| Freeze-boundary text unchanged ("Draft only." stays at Candidate, A1 K1) | the K1 diff above | unchanged |

## 3. What is recorded in `work-packages/WP-0A-CON-004.json`

Every role wording is copied by a script from the signed files on this branch: blockquote lines joined with single
spaces, placeholders filled with measured values, old entries kept whole.

| Index | Source | Edit |
|---|---|---|
| `[0]` | A1 §7 (a) | appended; `<disposition path>` = the disposition above |
| `[6]` | A1 §7 (b) | appended |
| `[7]` | A1 §7 (c) | appended |
| `[18]` | A6 §7, `open_blockers[18]` | prefixed CLOSED, old text after "Text as recorded:" |
| `[20]` | A6 §7 defers to R0's R-230-1; R0 `r0-review-2026-10-09-pr230.md` §7 `open_blockers[20]` wording | prefixed CLOSED with R0's words, placeholders filled (§4), old text after "Text as recorded:" |
| `[21]` | A6 §7, new entry | appended; includes A6's correction of its own `[4]` view. `[4]` itself is not edited |
| `[22]` | A1 §7 (d) | appended; `<date>` 2026-10-09, `<head sha>` `15e2dd30a66f3bf4272d334974804ae787a23f23`, `<path>` the disposition |
| `[23]` | A0 | the AUD/OBS move, the OBS consumer bound, the scope note, and what is not done (RFC-2026-010) |
| `required_human_authorities` | A0 | one entry appended: A1 reclassified C2 and SEC-003 as before freeze, not before leaving Draft |
| `ownership.amends_without_owning` | A0 | paths set to the six files changed outside `writable_paths`; rationale appended |

`status` stays `in_review`. R0's PR #230 file says the status may move to `integration_verified` in the first records
PR after the merge. This PR is not a records PR: it moves three contracts, which needs its own round (A1 K5). So the
`[20]` close records R0's verdict for PR #230's increment, and the package's status waits for this increment's round.

## 4. Facts behind the `[20]` placeholders (PR #230)

| Fact | Value | Command |
|---|---|---|
| Merge commit, head, time | `75c60335a02443797834e589e9c7a52914e4ceb0`, head `52a238c48a2e30cc87770d5c278a39f66b6c75f8`, 2026-10-09T09:06:31Z | `gh pr view 230 --json mergeCommit,headRefOid,mergedAt` |
| Merge parents | `1bcc2349` (main) and `52a238c4` (the head) | `git log -1 --format=%P 75c60335` |
| CI on the final head | `Bootstrap validation` run `37907963752`, `pull_request`, success | `gh run list --commit 52a238c4… --json databaseId,conclusion,event,headSha` |
| Role verdicts and the head each read | C0 `review_approved`, A1 `security_approved`, Q0 `test_verified`, all at `c202e9641253863ba70b374365dbbed28c224b7d` | §7 of each `*-review-2026-10-09-pr230.md` |
| Commits after `c202e964` | `827e40a0` C0, `a16ec906` A1, `2aa73a9c` Q0, `2225c4ae` R0 (each one file, `(cherry picked from commit …)`); `64d975d9` merge of main; `52a238c4` handoff only | `git log c202e964..52a238c4`; `git show --stat <each>` |
| The main merge is mechanical | `classify-records-only.mjs --sync 2225c4ae 64d975d9 1bcc2349`: exit 0, "no conflict inside the PR's own paths"; `git show --cc 64d975d9` empty (no hand resolution); `npm run regenerate:manifest` at `64d975d9` left the tree clean | run in a detached scratch worktree, removed afterwards |
| Not re-measured here | `npm run record:verification` cmp at `64d975d9` (it runs the full suite, which may run once at a time on this machine); `--match-head-commit` on the merge (the second parent equals the head, which is what it pins) | — |

## 5. What this increment does not do

- **RFC-2026-010's status line is not edited.** It still reads "CTR-SEC-001 awaits A1; CTR-AUD-001, CTR-OBS-001 and
  CTR-USG-001 await A6". RFC-2026-010 is `WP-0A-CON-008`'s file. An RFC edit is a governance change (RFC-2026-025 §5
  item 6), and the Owner's press direction covers Draft→Candidate PRs, not RFC edits. A1 §7 (e) and A6 §7 give the
  replacement text; the update is owed to a `WP-0A-CON-008` records step.
- **CTR-USG-001 does not move.** Its disposition is recorded here; the `WP-0A-CON-006` PR moves it.
- **No `freeze_boundary`, schema, fixture or annotation changes.** Each would void a signature (A1 K1, A6 §8).
- **`scope.exclude` and `contracts_produced`** ("at Draft only; no freeze-level advancement") are left as written. They
  describe the materialization increment. RFC-2026-031 §4.1 (1) and §4.5 (approved 2026-10-09) assign this move to
  this package; `open_blockers[23]` says so.
- **`test-kits/db/fixtures/ctr-aud-001/store-conformance.json`** says "status Draft" in its `_what` prose. It asserts
  nothing about status, belongs to the DB package, and is not edited.
- **The owners' amendment records** on WP-0A-CON-001, WP-0A-CON-002, WP-0A-CON-008 and WP-0A-A0-002 are owed by their
  next PRs.

## 6. Who presses

The Owner's answer `ให้ A0 กดทั้งสองแบบ (Recommended)`
(`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-prep-and-candidate-press.md`) names the Draft→Candidate
PRs of SEC, AUD, OBS, NTF and USG. A0 may press this PR when all of these hold: C0, A1, Q0 and R0 pass on its final
head; no security finding of any grade is open; CI is green on that exact head, which contains current `main`; and
the Owner's disposition naming each contract is on the branch (`01deb3c1`). That answer was given before this PR
existed, and names the PR by its content.
