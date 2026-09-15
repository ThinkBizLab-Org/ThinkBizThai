# The S8 shape in the families merged before 080 — a map for the decision, not a decision

Run: `/claude/a0_atlas` (Author). Date: 2026-09-15. Answers the open question the two 2026-09-15 state records put to the Owner: the families merged before 080 carry narrowings `for all to authenticated` too — shape-C closures, or wait for shape B (RFC-2026-023)? This file measures what a closure would do to each family so the question can be answered per family rather than in one word. It changes nothing.

## 1. What a shape-C closure does, once more

A RESTRICTIVE policy `TO PUBLIC`, `current_user = 'authenticated'`, refuses **every** role that is not `authenticated` — `app_command`, `app_worker`, `app_maintenance`, `app_authz`, `anon` — every row, whatever permissive policy the role holds or is later given. That is right where the family's Service column is `P` (a command function that does not exist) or `N`. It is a **decision** where the Service column is `S`: RFC-2026-022 classifies each `S` cell CARRIED or DISCOVERED and expects, when it comes into effect, a service policy `TO app_worker` on that cell — which a closure ANDs against and refuses until the closure is amended beside it (RFC-2026-023 §3.3 is where the amendment shape lives).

## 2. The map, read from the migration set on 2026-09-15

| Family (batch) | Restrictive narrowings, all `to authenticated` | `app_worker` grants today | `S` cells (RFC-2026-022 §3) | What a closure would refuse | Reading |
|---|---|---|---|---|---|
| business/page (020, 021) | `business_profiles`, `business_profile_versions`, `page_context_profiles`, `page_context_profile_versions` | ~~SELECT on all four~~ **corrected 2026-09-15 (A1-pre-080 F1, C0-pre-080 M1): SELECT, INSERT and UPDATE on the two profile tables, SELECT and INSERT on the version tables** (`020:452-455`; grants, no policy) | none | a worker read *or write* that no policy admits today anyway | **closable now**, 082's shape |
| industry (030) | `industry_assignments` | ~~SELECT~~ **corrected: SELECT, INSERT and UPDATE on `industry_assignments`** (`030:485`); SELECT on the two global pack tables | none | as above | **closable now** (packs and pack versions are global tables and carry no narrowing — a closure there is a separate question) |
| knowledge (040, 041) | `knowledge_items`, `knowledge_item_versions` | ~~SELECT on both~~ **corrected: SELECT, INSERT and UPDATE on `knowledge_items`, SELECT and INSERT on `knowledge_item_versions`** (`040:529-530`) | none | as above | **closable now** |
| metering (061) | `quota_buckets` | SELECT/INSERT/UPDATE on `usage_events`, `usage_reservations`, `quota_buckets` | usage ledger INSERT — CARRIED (`usage_events`) | the worker's future CARRIED policy on `usage_events`; today's grants-and-no-policy refusals unchanged | **wait**, or close `quota_buckets` alone (the narrowed table is not the `S` cell's table) |
| research (070) | `research_runs`, `research_sources`, `research_evidence`, `research_suggestions` | SELECT/INSERT/UPDATE across the family | run/source/evidence INSERT — CARRIED | the worker's future CARRIED policies on three of the four narrowed tables | **wait for RFC-2026-022 in effect + RFC-2026-023**, or close with the amendment written into the same file |
| async kernel (050), notification (051), AI gateway (060), meta connector (110), billing (130, 131, 132), audit (140) | **no restrictive narrowing** — these families are workspace-scoped by their permissive policies alone | worker grants on most | 050 claim DISCOVERED; 051 CARRIED; 110/131 DISCOVERED; 140 CARRIED | not S8's shape: there is no narrowing that claims to bound the writer | **out of scope** of this question |
| content (080, 081), approval (090), asset (100) | — | asset: INSERT/UPDATE on three tables | asset hard purge — BOTH (100/160) | already closed by 082/083/092/101; **101 sits on an `S` family**, so the purge policy, when RFC-2026-022 is in effect, lands beside an amended closure — recorded in 101's header | done |

## 3. What the map says

> **Disposed, 2026-09-15:** the Owner merged 022/031/042 (PR #144) and chose **row (b)** for metering and research — batches 062 (`quota_buckets`) and 071 (`research_suggestions`). The `S`-cell tables stay open until RFC-2026-023's amendment lands beside their closures.

> **Correction, 2026-09-15 (from the role runs on PR #144):** §2's grants column understated the worker's grants on all three closable families — the tree grants INSERT on all seven tables and UPDATE on four, not SELECT alone. The conclusion does not move (the `S`-cell column and every permissive policy's TO clause were re-verified against the tree and a live 17.11 by A1 and C0), but the consequence does: with a closure dropped, a permissive worker policy is a cross-tenant **write**, not only a read — A1-pre-080 measured 5 rows in 2 tenants. The rows above are struck and corrected in place rather than rewritten.

- **Three families can take 082's shape tonight with no decision beyond the one already made**: business/page, industry, knowledge. No `S` cell, worker holds SELECT grants that no policy admits, and their narrowings make the same claim 080's did.
- **Two need the Owner**: metering and research, because a closure there pre-empts RFC-2026-022's own remedy. The honest options are (a) wait, (b) close only the narrowed tables that are not `S` cells (`quota_buckets`; `research_suggestions`, which the worker may INSERT but which RFC-2026-022 §3 does not name), or (c) close all and write the amendment in the same file.
- **Six families are not the shape**. S8 is about a narrowing that says it bounds a writer and does not; a family with no narrowing makes no such claim. Their service policies are RFC-2026-022's business, not this question's.

## 4. What this file does not do

It writes no closure. `gen-closure.mjs` (this session's scratchpad tooling, not in the repository) produces one in 082's shape from a table list; the static rule `SERVICE_PATH_CLOSURES` holds any new file to that shape; the three "closable now" families would be one file each (`022`, `031`, `042` are free in §6's registry) with one catalog case per table. That is an evening's work once the Owner says which row of §3 applies.
