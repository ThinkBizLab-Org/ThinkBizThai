# Batch 090 integrated, with 092 — the approval family closed before it reaches main

Run: `/claude/a0_atlas` (Author, integrating). Date: 2026-09-15. Branch: `agent/claude/WP-0A-DB-00-batch-090` (PR #119): batch 090 as reviewed (`6c113ae`), the merge of `main` (`5990708`, after 081/082/083), the three role-run evidence files for 090, and batch 092. The shape of this integration is [`a0-batch-083-integration-2026-09-15.md`](a0-batch-083-integration-2026-09-15.md), applied one family over; only what differs is written here.

## 1. Findings acted on

| Finding | Disposition |
|---|---|
| **S8 on three tables** — A1 S11 (stop-the-line), C0 H2 (stop-the-line), Q0 F5: `approval_policies`, `approval_requests`, `approval_events` narrowings are `for all to authenticated`; `090:611-616` and `:1128-1135` say they bound the `app_command` writer. | **Batch 092**, 082's exact shape on the three tables, in this PR. Declared in `SERVICE_PATH_CLOSURES`; three catalog cases fail against 090 alone. |
| **"Exempt by ownership" re-introduced** — C0 H1: `090:92-95`, the stored table comment at `:415-419`, `:892-896`, `:1131-1134`. | All four corrected in place, originals kept beside each. One is a `comment on table` string, so the catalog comment changes too. |
| **"Nothing in this repository can write an approval event" is false against the tree** — C0 H3: the fixture writes `app.approval_events` every run, and says it can because it is "the table owner", which FORCE refutes; it can because the connection role bypasses RLS. | The blanket sentence corrected at `090:97-98` and in the table comment to the precise true statement; the fixture's two explanations corrected. The manifest blocker and the case `why` that repeat it are left as the batch wrote them — they are the batch's claims, dispositioned by the files above. |
| Everything else the three files found (C0: 3 HIGH/6 MEDIUM/2 LOW; A1: 2 HIGH/2 MEDIUM/2 LOW/3 INFO; Q0: 4 MEDIUM/5 LOW, 0 of 83 cases wrong, probes 13 run/4 noticed/9 missed) | **Stands in the files.** Not disposed of here. |

## 2. Measured on the scratch PostgreSQL 17.11 (fresh cluster)

| Command | Result |
|---|---|
| `migrate-clean` | ok — `applied 090_approval.sql`, `applied 092_approval_service_path_closed.sql`, apply-time blocks passed |
| `schema-lint` | ok |
| `rls-smoke` | **`757 isolation case(s) passed.`** = 671 (main after 081/083) + 83 (090) + 3 (092) |
| `npm run verify` on the branch name | see the PR body |

The merge of `main` was done twice: the first resolution joined git's minimal hunks and produced two suite files that did not parse (a comment ruled with `=` signs contains `=======`, and the regex resolver split on it). It was reset and redone with each suite rebuilt as `main`'s file plus 090's own patch (`git diff c5eb1b9 6c113ae`) applied with fuzz, the two EOF appends by hand. Recorded because the first attempt was staged before it was checked, and a resolver that can silently corrupt a suite is worth a sentence.

## 3. Not done here

092's own probes: the closure rule is the one file-level rule 083 added, already probed (2/2) and sharing 082's regexes (6/6). No new probe was run for 092; that is stated rather than implied.
