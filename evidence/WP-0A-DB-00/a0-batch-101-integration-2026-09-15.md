# Batch 100 integrated, with 101 — the asset family closed before it reaches main

Run: `/claude/a0_atlas` (Author, integrating). Date: 2026-09-15. Branch: `agent/claude/WP-0A-DB-00-batch-100` (PR #118): batch 100 as reviewed (`131de6f`), the merge of `main` (`24e306c`, after 081/082/083/090/092), the three role-run evidence files for 100, and batch 101. Shape as [`a0-batch-083-integration-2026-09-15.md`](a0-batch-083-integration-2026-09-15.md) and [`a0-batch-092-integration-2026-09-15.md`](a0-batch-092-integration-2026-09-15.md); only what differs is here.

## 1. Findings acted on

| Finding | Disposition |
|---|---|
| **S8's shape on four tables, without S8's belief** — C0 H1 (HIGH, not stop-the-line), A1 S1 (HIGH, not stop-the-line), Q0 F3: four narrowings `for all to authenticated`; **`app_worker` already holds INSERT on three tables and UPDATE on two**, with no policy; 100's apply-time block expects a future `TO app_worker` policy; C0 measured that 100's own static rule refuses both known repairs written into 100. | **Batch 101**, 082's shape on `assets`, `asset_versions`, `asset_rights`, `content_asset_links`. Its premise assertion differs from 082's and says why in its header: here a service role does hold grants, so the premise is "no permissive policy admits any role but authenticated" — a grant with no policy is refused by RLS before the closure exactly as after it. The three reviewers judged this latent rather than stop-the-line; it is closed anyway, because the Owner's Q3 answer was for the shape, and a fourth family left open while three are closed is a hole with a name. |
| **"Exempt … on a forced table"** — C0 H2: the hint at `100:1768`. | Corrected in place, original kept. |
| **`asset_versions.original_filename` (PII-2) is in the `authenticated` SELECT grant while its comment says it is withheld** — A1 S2, HIGH, "the closest call", with the disagreement recorded for the Owner. | **Not changed here.** It is a grant decision in the reviewed batch, not a closure, and A1 put it to the Owner explicitly. It stands in A1's file and is the first thing the Owner should read on this PR. |
| Q0: 0 of 76 cases wrong; partition 7/10/5 and 15 on `app.assets` = CI's; F1 (link narrowing's halves unfalsifiable, the "same Business forbids it" reason false), F2, F6 (10 of 12 probes slip the static suite); C0's 6 MEDIUM/4 LOW; A1's 3 MEDIUM/1 LOW-MEDIUM/3 LOW/2 INFO; C0's brief correction (`npm run check:scope` does take arguments: exit 2 without, 73 with). | **Stand in the files.** |

101's four case ids carry no asset word (`…-on-the-library-table`, `-version-table`, `-rights-table`, `-link-table`): batch 100's control rule pins the exact number of ids that mention an asset (76 across four patterns), so the closure rule now finds a closure's case by its table **parameter** rather than by a spelling of the table in its id.

## 2. Measured on the scratch PostgreSQL 17.11 (fresh cluster)

| Command | Result |
|---|---|
| `migrate-clean` | ok — `applied 100_asset.sql`, `applied 101_asset_service_path_closed.sql` |
| `schema-lint` | ok |
| `rls-smoke` | **`837 isolation case(s) passed.`** = 757 + 76 (100) + 4 (101) |
| static suite | 285/285; contract suite 57/57 |

The merge needed the resolver rebuilt a second time: 100's patch to the case list touches six coverage notes that 081 and 090 had also appended to, and `patch` rejected those hunks; they were applied by hand from the `.rej` (the batch's continuation after main's, before the closer). Recorded because a note that three batches append to in the same sentence is a merge hazard by construction, and the next family will meet it.

## 3. What this closes for the package

With 101, every family whose narrowings the 2026-09-15 role runs read is closed: content (082), content targets (083), approval (092), asset (101). One static rule holds all four files to one shape. Shape B remains owed for all four, as one RFC. The families merged before 080 — research (070), knowledge (040), business/page (020/021) and the rest — carry narrowings `to authenticated` too (§6 of `a0-batch-082-probes-2026-09-15.md`); whether they get closures or wait for shape B is the Owner's, and is not decided by this session.
