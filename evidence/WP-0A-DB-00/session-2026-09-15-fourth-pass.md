# Session record — 2026-09-15, fourth pass: the Owner answered in session, and the answers are landed

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. Written at the close of the
fourth pass of 2026-09-15 — the one where the Product Owner was awake and answered in session
("ต่อเลย", "1. merge 2. b 3. แนะนำยังไง", "1. approve 2. รอ + ขอรายละเอียดเพิ่มเติม 3. ตามแนะนำ",
"1. a"). This file is a STATE RECORD and approves nothing. It supersedes
[`session-2026-09-15-third-pass.md`](session-2026-09-15-third-pass.md) for STATE. Every Owner
answer is transcribed verbatim in the two disposition files named in §2 before it is read here.

## 1. Where `main` is

`main` = `__MAIN__` = merge of the last pull request in §2. No force-push, no direct push.

| Measure | Value |
|---|---|
| `npm run verify` on `main` | **clean: exit 0 — tests 647, pass 647, fail 0, skipped 0, todo 0** |
| Isolation cases | **857** (847 after the third pass: +7 pre-080 closures, +2 row-(b) closures, +1 filename) |
| Migrations added this pass | 022, 031, 042 (pre-080 closures); 062, 071 (row (b)); 103 (filename withheld); 104 (FK supporting indexes) |
| Live rule added | `FK_SUPPORT_PROBE_SQL` in `migrate-clean` |
| Static rules added | the closure query asserts the predicate (19 cases); §0 disclosure over role files; apply-time silencing class; the social key's no-ON-DELETE |
| Decision records | **RFC-2026-024 Approved**; RFC-2026-023 In review (Owner: wait, detail given in session) |
| S8 (A1-080) | closed on **11 families**; open only on the four `S`-cell tables (`usage_events`; research runs/sources/evidence) until RFC-2026-023 lands |
| Open Draft PRs for this package | none |

## 2. What merged, in order

| PR | What | Owner's word | Cases |
|---|---|---|---|
| #144 | closures 022/031/042 — the three pre-080 families the S8 map read as closable; three role runs | `1. merge` | 854 |
| #145 | closures 062/071 — row (b): the one narrowed non-S table per family; three role runs | `2. b` | 856 |
| #146 | RFC-2026-024 approved: `prefer_cross_vendor_review: false`, exception rewritten, §0 disclosure a rule | `1. approve` | — |
| #147 | batch 103 — `original_filename` leaves the client SELECT grant (A1-100 S2) | `3. ตามแนะนำ` | 857 |
| #148 | batch 104 — every FK has a supporting index, live probe, four reasoned exemptions (C0-111 M1) | — | 857 |
| #149 | the apply-time silencing rule (Q0 P6 class); the ON DELETE memo | — | 857 |
| this PR | the ON DELETE decision landed (README, contract rule, blocker 161 closed); this record | `1. a` | 857 |

Dispositions: [`product-owner-disposition-2026-09-15-pr-144-and-row-b.md`](product-owner-disposition-2026-09-15-pr-144-and-row-b.md),
[`product-owner-disposition-2026-09-15-rfcs-and-pii-filename.md`](product-owner-disposition-2026-09-15-rfcs-and-pii-filename.md) (§5 for "1. a").

## 3. Things measured this pass that the records did not know

1. **The closure cases proved existence, not predicate** (Q0-pre-080 F1, A1 F2, C0 L1): `alter policy … using (true)` left all of them green. `SERVICE_PATH_CLOSURE_ON` now compares `pg_get_expr` of both halves; one closure rewritten to `true` goes 1-of-N red.
2. **The S8 map understated the worker's grants** on all three closable families (INSERT on seven tables, UPDATE on four; the map said SELECT) — corrected in place; the consequence with a closure dropped is a cross-tenant *write* (A1 measured 5 rows in 2 tenants).
3. **A partial index on the key's own `IS NOT NULL` supports a foreign key**, which C0's count did not accept: five of the twenty-one were already supported; the rule accepts that shape.
4. **The secret scan reads `062-071-2026` as a Thai phone number**; role-run files are named `…-062-and-071-…`.
5. **The apply-time silencing class** (`false and`, bare `return;`) had been found by four Tester runs and closed by none; one static rule over 32 do-blocks, four shapes refused by name.

## 4. Where this session was wrong

- The 062 apply failed on a double-escaped `like` pattern (the generator read as text), twice across two batches before it was fixed at source.
- A `git checkout --` discarded an uncommitted probe in `run.mjs`; re-applied from a saved script, checkpointed before every mutation since.
- The first 104 block asked whether every exemption exists at 104's apply time; three are 130/131's keys, which sort after it. Moved to the probe.
- 102's evidence first recorded 846 (measured before 111 merged); replayed on the right base.
- Backticks inside a double-quoted `node -e` ate a handoff sentence (C0 L6); script files since.

## 5. What is owed, and to whom

**Owner:** RFC-2026-023 — disposition after the detail given in session (approve with A1 countersign + fail-closed measurement at landing, per family, closures untouched until a command function asks; or reject with "service never writes for a user" stated; or wait). Nothing blocks on it until a batch needs a command function. The connector contract (`docs/**`) owes itself the ON DELETE sentence.

**A0, next:** batch 120 (Publisher) — start with a plan and a case list for the Owner, not with a migration; it is the first `S`-cell family (delivery/post/metric INSERT, CARRIED) written after RFC-2026-022 and needs that RFC's status read first.

**Nothing else from four passes is unpaid.**

## 6. Housekeeping

Scratch cluster on `127.0.0.1:5499` stopped; the user's server on `/tmp:5432` never touched; worktrees removed; merged branches deleted; memory file current.
