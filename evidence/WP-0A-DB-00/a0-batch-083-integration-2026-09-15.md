# Batch 081 integrated, with 083 — the sixth content table closed before it reaches main

Run: `/claude/a0_atlas` (Author, integrating). Date: 2026-09-15. Branch: `agent/claude/WP-0A-DB-00-batch-081` (PR #117), which now carries: batch 081 as written (`822501c`), the merge of `main` (`0dc640f`, after 082), the three role-run evidence files for 081, and batch 083.

## 1. What the three role runs found, and what this integration does about each

| Finding | Where | Disposition here |
|---|---|---|
| **S8 on a sixth table** — `content_targets_scope_narrowing` is `for all to authenticated`; 082's closures, apply-time count and static rule range over five names. A1 S1 (stop-the-line), C0 H1 (stop-the-line), Q0 (inherited). A1 measured it live on a scratch PostgreSQL 17.11: with a permissive INSERT policy naming `app_command`, the role wrote targets under tenant B's item while 082 refused the identical shape on `content_items`. | [`a1-security-batch-081-2026-09-15.md`](a1-security-batch-081-2026-09-15.md), [`c0-review-batch-081-2026-09-15.md`](c0-review-batch-081-2026-09-15.md), [`q0-test-batch-081-2026-09-15.md`](q0-test-batch-081-2026-09-15.md) | **Batch 083**, `083_content_targets_service_path_closed.sql`: 082's exact shape on `app.content_targets`, in the same PR, so 081 never sits on `main` with the finding open. A forward file rather than an edit to 081, because 081's own apply-time block counts its restrictive policies (`:643-652`, `:659-692`) and its static rules read its own text; a closure inside 081 would trip both and rewrite what three runs reviewed (C0 H1 names exactly those two assertions). |
| **"Exempt by OWNERSHIP" written twice into 081** (`:540-542`, `:697-701`) — the sentence 082 declares false, which would become permanent on merge. C0 H2, Q0 F4. | same | Both comments corrected in 081, with the original reading kept beside the correction. Comments only; no statement in 081 changes. |
| Q0's 36-case hand-simulation: 0 wrong outcome, 0 wrong layer, 1 right-for-the-wrong-reason; partition 14 = CI's 14; probes 10 run, 1 noticed, 9 missed. C0's other findings (2 HIGH incl. H1, 4 MEDIUM, 5 LOW). A1's 2 MEDIUM, 2 LOW-MEDIUM. | same | **Left standing in the files.** Nothing else in 081 is changed by this integration; the remaining findings are the batch's to dispose of in a later increment, and the manifest's blockers already carry the class each belongs to. |

## 2. What 083 is, and what holds it to 082

One RESTRICTIVE policy, `for all`, no `TO`, `current_user = 'authenticated'` both halves, on `app.content_targets`; the same four apply-time claims as 082, over `closed_tables = {content_targets}`. Generated from a template of 082's shape so the two files differ in nothing but the table list and the header.

**One static rule now holds every `*_service_path_closed.sql` to 082's shape** — `SERVICE_PATH_CLOSURES` in `tests/db/identity/identity-isolation.test.mjs`: a file on disk with no declared table list fails, a declared list with no file fails, and for each declared table the closure must be RESTRICTIVE, FOR ALL, TO nobody, `current_user = 'authenticated'` on both halves, with the general-rule assertion and the `{0}` spelling present in the file, no grant, no role change, no policy rewrite, no scope helper — and a catalog case that fails against the batch it closes alone. 090 and 100 integrate by adding a row each (092, 101).

One isolation case: `batch-083-closes-the-service-path-on-content-targets`, `expect: 'rows'` against `pg_policy`; it fails against 081 alone (README §"Forward fix" step 2).

## 3. Measured on this machine — there IS a PostgreSQL here

The previous records, and the briefs this session wrote, said this machine has no PostgreSQL. **That was wrong**, found by the A1-081 run: Homebrew `postgresql@17` 17.11 is installed and the user's own server runs on `/tmp:5432` (it holds `workchat_dev` and was not touched). A0 runs a scratch cluster of the same binaries, `initdb`'d in the session scratchpad, TCP-only on `127.0.0.1:5499`, with `db/foundation/ci/supabase-shim.sql` applied — plain Postgres plus the shim, not Supabase, with everything the shim's header says about that.

On this branch, fresh cluster each run (001 creates cluster roles and cannot be re-applied):

| Command | Result |
|---|---|
| `make db-migrate-clean` | ok — `applied 083_content_targets_service_path_closed.sql` after 082, apply-time block passed |
| `make db-schema-lint` | ok |
| `make db-rls-smoke` | **`671 isolation case(s) passed.`** = 629 + 36 (081) + 5 (082) + 1 (083) |
| `npm run verify` on the branch name | see the PR body; 604 → 605 tests |

**A1-081's exploit, replayed with 083 applied**, in one rolled-back transaction as `postgres` (BYPASSRLS, the migration role): `grant select, insert on app.content_targets to app_command; create policy … for insert to app_command with check (true); set local role app_command;` then the INSERT under `content_item_b1`:

```
ERROR:  new row violates row-level security policy "content_targets_service_path_closed" for table "content_targets"
```

Refused by 083's closure, by name. Without 083 (A1's measurement on 081 alone) the same statement inserted the row. That is the finding closed at the layer it was found, on a database, not by reading.

## 4. Probe tally for 083's rules

The closure rule is shared with 082's; 082's six probes (`a0-batch-082-probes-2026-09-15.md` §4) exercise the same regexes, and the new generic rule was additionally probed by (a) deleting the `'083…': ['content_targets']` row — noticed (`a closure file with no declared table list…`), and (b) renaming 083's policy to `content_targets_closed` — noticed (`one closure per declared table`). **2 run, 2 noticed.** Small, and stated as such: the rule's regexes are 082's, already probed six ways.

## 5. What this does not do

- Does not dispose of C0's, Q0's or A1's remaining findings on 081; they stand in the files.
- Does not touch 090 or 100; each gets the same treatment (092, 101) in its own PR after this one merges.
- Does not write shape B. Shape B is now owed for four families and is one RFC (blocker updated).
- Does not re-sign anything: the three evidence files are the signatures, in the roles the manifest names, under the withdrawn cross-vendor condition (Q1). This file is the Author's.
