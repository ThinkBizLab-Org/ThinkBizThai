# A0 plan: four catalog-rule probes in migrate-clean (the weak-assertion survey's items 1, 2 and 4)

Author run: `/claude/a0_atlas`. Package `WP-0A-DB-00`. Written 2026-09-27 at `main` = `9039738`
(merge of PR #158), CI run `36313476515` success. This file decides nothing. §6 lists the questions
and A0's recommendation on each. §7 says on what authority the recommended options are taken.

## 1. Why these four

[`weak-assertion-survey-2026-09-27.md`](weak-assertion-survey-2026-09-27.md) §6 ranks, cheapest and
highest value first:

1. an FK-action probe;
2. text pins of the `updated_by` and requester closures;
3. eleven forging cases;
4. a SECURITY DEFINER search_path probe and a trigger `tgenabled` probe.

Items 1, 2 and 4 are live probes in `scripts/db/run.mjs`, in the FK-support probe's pattern. They
need no migration, no case and no protected file. Item 3 changes the case list and its floors, so
it is its own increment.

A replacement cannot carry any of these checks, because the register holds only blocks that a later
file made false (Q0 F6). All the blocks they would strengthen still pass, so each check needs a
probe.

## 2. Measured before writing a line

This was measured on a private cluster at `127.0.0.1:5499`, TCP only, with the shim applied first
and a fresh `make db-migrate-clean` on `9039738`. `:5432` was not touched.

| Fact | Value |
|---|---|
| FKs in `app` and `private` | **87**, every one `confdeltype = a`, `confupdtype = a`, not deferrable |
| SECURITY DEFINER functions in `app` and `private` | **5**, every one with `proconfig = {search_path=""}`: `app.is_active_member`, `app.jwt_subject`, `app.workspace_member_role`, `private.refuse_mutation`, `private.set_updated_at` |
| Non-internal triggers in `app` and `private` | **47**, every one `tgenabled = O` |
| `private.refuse_mutation` triggers | 4: `refuse_mutation` (row, BEFORE UPDATE OR DELETE, tgtype 27) and `refuse_truncate` (statement, BEFORE TRUNCATE, tgtype 34), each on `audit_logs` and on `security_events` |
| `*_updated_by_is_caller` policies | **14**, one deparse: restrictive, INSERT, TO authenticated, no USING, WITH CHECK `((updated_by IS NULL) OR (updated_by = ( SELECT auth.uid() AS uid)))` |
| `*_requester_is_caller` policies | **2** (approval_requests, publish_intents): restrictive, INSERT, TO authenticated, WITH CHECK `(requested_by = ( SELECT auth.uid() AS uid))` |

No exemption is needed today for any of the four rules.

## 3. The probes

Each probe is one `do $$` block, exported from `run.mjs`, applied by `migrate-clean` after the
FK-support probe and before the post-migrate pass. Each one fails the target by name.

1. **FK actions.** Every foreign key in `app` and `private` must have NO ACTION on delete and on
   update, and must not be deferrable, unless it is listed in `FK_ACTION_EXEMPTIONS` with a reason.
   That list is empty today. A stale exemption fails the probe. This closes the survey's m1 and m2
   and A1 M14, and covers every future key.
2. **Closure text.** Every `*_updated_by_is_caller` policy and every `*_requester_is_caller`
   policy must:
   - sit on exactly the pinned (table, name) set of 14 and 2;
   - be restrictive, INSERT and TO authenticated alone;
   - have no USING;
   - have a WITH CHECK whose deparse **equals** the measured text.

   A future batch that adds a closure adds its pair to the set. This closes A1 F3, Q0 F5 and D38,
   and the survey's m3.
3. **SECURITY DEFINER.** Every SECURITY DEFINER function in `app` and `private` must carry exactly
   `search_path=""` in `proconfig`. This closes Q0 D14, D15 and D44.
4. **Triggers.** Every non-internal trigger in `app` and `private` must be enabled
   (`tgenabled = 'O'`). The `refuse_mutation` set must be exactly the four (table, name, tgtype)
   triples above. This closes Q0 D20b and the survey's 093/120/140 disable gap, and it catches a
   trigger moved between the two tables.

## 4. Proof

- **Static contract tests,** in the FK probe's style: each probe is wired after the FK probe; a
  failing probe fails the target; each exemption carries a reason; each probe reads the catalog
  column it claims to.
- **Live:** each of the survivors this closes is appended to `140_audit.sql` and must fail
  `migrate-clean` by name: m1, m2, m3, D14, D20b, a moved refuse trigger, and a closure made
  permissive. The clean set must pass, and `rls-smoke` must stay green.
- **Three role runs:** C0, Q0 and A1, as for #155.

## 5. What this does not do

- No forging cases (survey item 3). That is its own increment.
- Nothing for batch 150 (survey item 5), which belongs in batch 150's own block.
- No text pins of the narrowings or vocabularies (survey items 6 and 7).
- Deparse text is measured on PostgreSQL 17. A change of major version in CI could change it,
  because the text pin compares exact strings. That is recorded as a limitation, not hidden.

## 6. Questions, with A0's recommendation

| # | Question | Options | A0 recommends |
|---|---|---|---|
| A | Scope | (a) items 1, 2 and 4 of the survey as four `run.mjs` probes; (b) add item 3's forging cases | **(a)** |
| B | Where | (a) `migrate-clean`, after the FK probe, before the post-migrate pass; (b) `rls-smoke` | **(a)** |
| C | FK rule's reach | (a) NO ACTION on both, not deferrable, schema-wide in `app` and `private`, with named exemptions (none today); (b) only the social FK | **(a)** |
| D | Closure pin | (a) exact deparse text plus the pinned (table, name) sets; (b) tokens plus roles only | **(a)**, with the PG-version limit recorded |
| E | Triggers | (a) all enabled, plus the exact `refuse_mutation` set; (b) enabled only | **(a)** |
| F | Blockers | (a) narrow the survey blocker and blocker 188 by what these close, count unchanged; (b) close either | **(a)**: neither is fully discharged |
| G | Role runs | (a) C0, Q0, A1; (b) fewer | **(a)** |

## 7. On what authority

The Owner's words, given after A0 listed this work as the next step and before this file existed,
were: `ทำเลยทุกอย่างตามคุณแนะนำไม่ต้องรอง`. A0 reads them as the Owner taking A0's recommended
option on each question above, **without having seen these particular questions**. The
[disposition](product-owner-disposition-2026-09-27-catalog-rule-probes.md) records that plainly.
A stop-the-line finding from any role run still halts the merge and goes back to the Owner.
