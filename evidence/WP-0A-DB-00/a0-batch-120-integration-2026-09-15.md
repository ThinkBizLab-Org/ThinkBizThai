# Batch 120 integrated, with 122 — the publisher, and the send the service cannot compose

Run: `/claude/a0_atlas` (Author, integrating). Date: 2026-09-15. Branch:
`agent/claude/WP-0A-DB-00-batch-120`. Authority: the Product Owner's disposition of 2026-09-15
([`product-owner-disposition-2026-09-15-batch-120.md`](product-owner-disposition-2026-09-15-batch-120.md)),
answering the fourteen questions in [`a0-batch-120-plan-2026-09-15.md`](a0-batch-120-plan-2026-09-15.md)
§11 with the recommended option on every one. This file records what was measured, not what was
intended; it approves nothing and is none of the four role signatures RFC-2026-002 requires.

## 1. What the batch is

| File | What |
|---|---|
| `db/foundation/migrations/120_publisher.sql` | five tables (`publish_intents`, `publish_targets`, `publish_target_assets`, `publish_jobs`, `published_posts`), one forward key on batch 081's `app.content_targets`, ten policies, the grants, and an apply-time block with four CHECK probes |
| `db/foundation/migrations/122_publisher_service_path_closed.sql` | shape C on the two tables that are not `S` cells — `publish_intents` and `publish_target_assets` |
| `db/foundation/lint/service-policy-map.json` | three CARRIED rows (target, job, post) and the `_what_batch_120_classified` note |
| `tests/db/identity/fixtures/120-publisher-fixture.sql` | five intents, five sends, two pins, four jobs, three posts, three `app.content_variants` rows batch 080 had no occasion to load |
| `tests/db/identity/isolation-cases.mjs` | 84 cases (30 / 16 / 8 / 14 / 14, plus two closure cases) |
| `.github/workflows/ci.yml` | five per-family negative-control entries |

## 2. Measured on a scratch PostgreSQL 17.11 (fresh cluster, TCP-only `127.0.0.1:5499`)

The user's own server on `/tmp:5432` was not touched. The cluster is re-`initdb`'d for every run,
because batch `001` creates cluster-level roles and a second apply fails on `42710`.

| Command | Result |
|---|---|
| `migrate-clean` | **ok** — every migration applied, `120_publisher.sql` and `122_publisher_service_path_closed.sql` included; ceiling probe 200,024 bytes; FK support probe: every key in `app` and `private` supported, 4 exempt by name |
| `schema-lint` | **ok** |
| `rls-smoke` | **941 isolation case(s) passed** (857 + 84) |
| static suite | `clean: exit 0 — tests 658, pass 658, fail 0, skipped 0, todo 0` (was 647) |

## 3. The negative controls, one table at a time

Row level security disabled on ONE table, the whole suite re-run, then re-enabled. The number that
matters is the second one: **every failing case matched that entry's own pattern and no other**, so
each entry is detectable on its own rather than satisfied by a regression it did not cause.

| Entry | Suite | Cases red | Matching that pattern |
|---|---|---|---|
| `app.publish_intents` | red | 14 | **14** |
| `app.publish_targets` | red | 7 | **7** |
| `app.publish_target_assets` | red | 4 | **4** |
| `app.publish_jobs` | red | 6 | **6** |
| `app.published_posts` | red | 5 | **5** |

And the closure, twice:

| Mutation | Result |
|---|---|
| both `122` closures dropped | exactly **2** cases red — `batch-122-closes-the-service-path-on-the-intent-table` and `…-on-the-pin-table` |
| one closure rewritten to `using (true)` | exactly **1** case red, the one whose table was rewritten |

The second is the mutation `SERVICE_PATH_CLOSURE_ON` gained its predicate term for after Q0-pre-080
F1: a closure that exists but admits everything is caught, not merely a closure that is missing.

## 4. Exploit probes, before the push

| Probe | Answer |
|---|---|
| a send aimed at another tenant's destination, issued by the BYPASSRLS migration role | `23503` — `publish_targets_content_target_fk` |
| a post naming an account its own send does not | `23503` — `published_posts_target_destination_fk` |
| a second job on one send | `23505` — `publish_jobs_one_per_target` |
| a provider request key reused across two sends | `23505` — `publish_jobs_provider_request_key_unique` |
| `app_worker` inserts a send (holds the grant, no policy) | `42501` — **row-level security**, which is the flip case's refusal |
| `authenticated` inserts a send (holds nothing) | `42501` — **privilege**, on the table |

The first probe is worth reading exactly: the cross-tenant destination is refused by the **aim** key
rather than by the social key, because `publish_targets_content_target_fk` is evaluated first. Both
would have refused it; only one did, and the record says which.

## 5. Three things this pass measured that the plan did not know

1. **The apply-time narrowing check matched the wrong policies, and only a live apply could say so.**
   The loop selected every RESTRICTIVE policy on a publisher table, which includes the two batch
   094/102-shaped `FOR INSERT` policies on `app.publish_intents` — and an INSERT policy has no
   `USING` half, so `pg_get_expr(polqual, …)` is NULL. The first apply failed with *"the
   publish_intents narrowing does not resolve through the intent's item"* against a policy that is
   not the narrowing: a guard failing for the wrong reason. The loop now carries `pol.polcmd = '*'`
   and the comment says why.

2. **An added fixture row took a pair batch 081's own cases depend on.** The first draft loaded a
   seventh content target — `(content_item_a1_page, social_account_a2)` — so the four fan-out cases
   could hold its id. The live run turned `owner-a-can-aim-a-content-target` and
   `editor-a-can-aim-a-content-target-inside-their-narrowing` red with `23505`: those cases insert
   exactly that pair, and their own `why` says the pair is one no fixture row holds **so that the
   insert LANDS when the negative control disables row level security**. Every free (item,
   destination) pair in workspace A is spoken for by one of batch 081's insert cases. The fix takes
   nothing from anybody: batch 120 fixes the ids of batch 081's six existing targets, as batch 111
   fixed batch 110's social account ids on the day a foreign key started naming them, and the
   fan-out cases name `(content_item_a1_page, social_account_a1)` — the one aim no send uses.

3. **The service cannot compose the fan-out §8.3 marks `S` for it.** Measured directly:
   `set role app_worker; select count(*) from app.content_targets` answers *permission denied for
   table content_targets*, and the same against `app.content_variants` answers *permission denied for
   table content_variants*. A send COPIES an aim and a variant from those two tables. So the
   statement RFC-2026-022 §3 classifies CARRIED cannot be issued by the identity the cell names —
   the server must resolve both ids before the statement is formed, which is what CARRIED means and
   is why the map rows say so. It is also why the four fan-out cases hold those two ids as
   PARAMETERS: a subselect would have run as `app_worker` and been refused on `app.content_variants`,
   giving the right identity, the wrong table, the wrong layer, and a case that passes while proving
   nothing. New open blocker, owed to the command surface and to `DATA-DEC-03`.

## 6. What this batch decided that the documents did not

Nine entries were added to the work package's `open_blockers`. The five worth naming here:

- **The client writes the intent and RFC-2026-012's inventory says the service should** — the Owner
  took that departure knowingly (question 14); owed to that RFC's owners.
- **`app.publish_intents` has no `status`**, so "cancel *pending*" is not a database rule (question
  5b). A cancellation is accepted whatever the sends already did.
- **Which §8 row governs a publisher job** — §8.3 has no SELECT half and §8.4's job row is for a
  different family. The client SELECT is the redacted set, which satisfies either reading.
- **Two vocabularies for one distinction** — `facebook`/`instagram` on the variant, the link and the
  post; `fb`/`ig` on the account. Nothing holds them in step and the fixture keeps them consistent
  by hand so that no case demonstrates the gap as though it were a feature.
- **§4 invariant 5's two conditions are unenforced on the asset pin** — blocker 153's sentence about
  `app.content_asset_links`, word for word, on a second table.

## 6A. The three role runs, and what the Author changed because of them

Three distinct runs, each in its own isolation worktree, each opening its file with the §0 spawning
disclosure RFC-2026-024 made a rule. Every one reviewed head `bd732a0`; the Author's corrections are
`42244d6` and the commit this record is in. None of them is the Author, and the Author approved
nothing of its own.

| Run | Findings | Stop-the-line | Measured live |
|---|---|---|---|
| C0 `/claude/c0_contract_reviewer` | 1 HIGH, 7 MEDIUM, 5 LOW | **yes** (H1) | no, and its §0 says so |
| A1 `/claude/a1_bastion` | 1 MEDIUM, 4 LOW | no | yes — its own cluster on 5501, eight probe scripts |
| Q0 `/claude/q0_sentinel` | 1 HIGH, 1 MEDIUM, 1 LOW | no | yes — 25 mutations on its own cluster on 5503 |

### Acted on

| Finding | What it said | What changed |
|---|---|---|
| **C0 H1** (stop-the-line) | Every NARRATIVE field of the author handoff still described the fourth pass — `migration_and_data_impact: "None."` for two migrations and five tables, `open_risks_or_blockers: ["None opened…"]` against ten, a test count of 647 against its own `VERIFICATION.md`'s 658, and no PR or CI run where RFC-2026-002 requires them. | All rewritten. `refresh-author-handoff.mjs` regenerates the mechanical fields only; the narrative is the Author's and the Author had not written it. |
| **A1 F1** | `publish_targets.failure_class` was the only PROVIDER-3 column inside the client SELECT with neither a bound nor a shape, so §9.2's "never a provider's message" was a comment ON the column rather than a control OVER it — the one path left by which the raw identifier this batch refuses a home could reach `app` and be read by every active member. | `publish_targets_failure_class_is_a_code`: at most 64 characters of lower-case, digits, dot and underscore (140's shape, tightened). A fifth apply-time probe writes what a careless worker would — a Graph API sentence with a post id in it — and the constraint refuses it `23514` by name. |
| **Q0 F3** (HIGH) | `publish_jobs_provider_request_key_unique` could be dropped with **every layer green**. It is what stops one provider request key standing for two sends, and no isolation case attempts a collision because the job-open helper parameterises the key on purpose. | A new apply-time block asserts all eleven uniqueness rules this family rests on BY NAME against `pg_constraint`. Re-run of Q0's own mutation: `a uniqueness rule batch 120 depends on is gone: publish_jobs_provider_request_key_unique`. |
| **Q0 F1** | Nothing asserted NOT NULL on any column the batch creates; three mutations removed one each, `publish_targets.workspace_id` among them, and every layer stayed green. Q0 checked before grading: an integrity gap, not a leak — a NULL workspace satisfies no policy comparison, so the row is invisible rather than misfiled. | The same block asserts thirty-four columns per column against `pg_attribute`. Re-run of Q0's M08: `a batch 120 column that may not be null has lost NOT NULL: publish_targets.workspace_id`. |
| **Q0 F2** | The apply-time CHECK probes were asserted only by themselves; nothing counted them, so one could be deleted without the others objecting. | The probe set is counted, as item 12 counts the narrowings. |
| **C0 M1** | `ADR-010` cited five times for a rule that is `ADR-012`'s — one occurrence inside a `comment on table`, which migration invariant 1 would have frozen after merge. | Six citations corrected. |
| **C0 M2** and **A1 F2** | The same class, found twice independently: the migration header named two blockers that did not exist — the editor's undefined publishing capability, and the raw-identifier debt batch 110 assigned to batch 120 by name. | Both are now entries (174 and 175). |
| **C0 M4** | `122`'s header claimed "no role but authenticated holds a privilege" on the tables it closes, which batch 120's own grants falsify; its probe omitted SELECT rather than test it; and closing the intent makes the worker's READ of it permanent — and that read is the first step of the fan-out the same file leaves open. | Header corrected, the assertion extended to SELECT in both directions, and the consequence named where a reader meets it. |

### Recorded and not acted on

- **C0 M3** — the blocker citations (5, 146, 153, 161) are indices into an unnumbered 173-string array, so they are unresolvable by anyone who does not know the convention. Checked: each number is correct under the package's own 0-based convention. The fragility is real and is not this batch's to fix.
- **C0 M5–M7, A1 F3–F5, Q0's note on probe counting after the fifth probe** — recorded in their own files. The one worth repeating: A1 F4 measured that a child narrowing's scope term cannot decide a read (2=2, 3=3, 2=2), because the parent's own policy answers first inside the subquery. That is batch 081's finding one family further down, and this batch states the phenomenon in every affected case.

### What no run could verify, in their own words

C0 ran nothing live and adopted none of the Author's numbers. A1 could not verify the source `docs/**`, the Owner's answers as answers, or a real service identity — the only member of `app_worker` is `postgres`. Q0's three findings all come from classes its brief did not name, which it records as the main limit on its own run. **No run verified CI in execution**, and none of them is the Integration Owner.

## 7. What is still owed, and to whom

**Nothing in this batch is waiting on the Product Owner.** All fourteen questions are answered and
transcribed. What is owed is owed elsewhere: the raw provider identifiers to the typed service and
`DATA-DEC-03`; the CARRIED policies to `RFC-2026-022` §7; the schedule row to batch 091 and A5; the
`§8` readings to the matrix's owner; and shape B to `RFC-2026-023`, which the Owner left In review on
2026-09-15 and which nothing here depends on.

**Before merge:** three role runs — A1 Security, C0 Reviewer, Q0 Tester — each a distinct run in its
own isolation worktree, each opening its file with the §0 spawning disclosure, and CI green on the
head of the pull request measured on the branch name.
