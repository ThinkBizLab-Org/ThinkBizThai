# Product Owner disposition — WP-1A-A0-006's forward migration 175: what the Owner's answers direct, what 175 writes, and what it does not (2026-10-20 UTC, session `5ea77291`)

Recorded by A0 (`/claude/a0_atlas`), drafted by an author subagent of that run. The questions, their headers, every
option shown with its description, and the answers below are copied by script, byte for byte, from the raw transcript
records of the calls and their results (session `5ea77291-c263-4dfc-83e9-1d395eee5e51`, the session's question tool:
tool use `toolu_012kiYSGkgvG7oxLMwudBgd6`, records 913 and 914; tool use `toolu_01D5JQaqHZvyuu7L7JmmaAbJ`, records 1341
and 1342). The times are the transcript's stamps (UTC), not a clock read. Everything marked "A0's reading" or "the
Author's reading" is not the Owner's. This is a record of the Owner's words and of a reading of them. It is not a role
verdict and approves nothing on A0's behalf.

## 1. Where things stood

- `main` was at `0440c672`: PR #305 (this package's dependencies-and-CI pull request) was merged. The manifest's
  `open_blockers[5]` recorded the need: `050_async_kernel.sql` and `173_worker_login_identity.sql` leave `app_worker`
  with grants and no policy on `app.jobs`, `app.outbox_events` and `app.consumer_ledger` (FORCE RLS, empty policy set),
  and `app.outbox_events` lacks the full `tenant_context` (A1-302-I2, WP-1A-A0-004 `open_blockers[13]`).
- `ownership.writable_paths` already declared `db/foundation/migrations/175_*.sql` (written under the `Migration`
  answer, PR #305). Nothing had been written there.

## 2. Questions, options shown and answers (verbatim)

### 2.1 Migration (records 913 and 914)

Asked 2026-10-20T02:58:32.953Z, answered 2026-10-20T03:00:37.969Z, as the first of three questions in one call (the
other two, `Deps + CI` and `Q-029-2`, are recorded in `product-owner-disposition-2026-10-20-deps-ci.md` and are not
relied on here).

**Header:** `Migration`

**Q:** "ตอนนี้ app_worker อ่านหรือเขียน app.jobs / outbox_events / consumer_ledger ไม่ได้เลย เพราะตารางเปิด FORCE RLS แต่ไม่มี policy ใครควรเขียน forward migration (เลข 175 ขึ้นไป)?"

- **Options shown:**
  - "A0-006 เขียนเอง (Recommended)" — "ขยาย writable ของ A0-006 ให้ครอบไฟล์ migration ใหม่ ให้เขียน policy แบบ CARRIED, broker app_queue และคอลัมน์ tenant_context ของ outbox ได้ ทุก PR ที่แตะ migration เป็น governance ต้องผ่าน 4 role"
  - "ให้ WP-0A-DB-00 เขียน" — "ให้เจ้าของฐานข้อมูลเดิมเขียน ส่วน A0-006 รอใช้"
- **A:** "A0-006 เขียนเอง (Recommended)"

### 2.2 Mig 175 กด (records 1341 and 1342)

Asked 2026-10-20T06:43:33.062Z, answered 2026-10-20T07:20:50.664Z, as the first of two questions in one call (the
other, `RFC Cron`, belongs to an RFC-2026-029 note pull request and is not relied on here).

**Header:** `Mig 175 กด`

**Q:** "PR migration 175 (policy ให้ app_worker บน app.jobs / outbox_events / consumer_ledger, broker app_queue สำหรับ claim, คอลัมน์ tenant_context ของ outbox) เป็น governance ใครกด merge?"

- **Options shown:**
  - "A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "แบบเดียวกับ #304 และ #305 ทั้ง 4 role ต้องผ่านบน head สุดท้าย, CI เขียวทั้ง 2 job (migration รันจริงบน Postgres ใน CI) และไม่มี security finding ค้าง"
  - "Owner กดเอง" — "A0 เปิด PR และรัน 4 role ให้ครบ แล้วรอคุณกด merge เอง"
- **A:** "A0 กดเมื่อ 4 role ผ่าน (Recommended)"

## 3. What the answers direct, and what 175 writes (the Author's reading, for A0 to confirm)

**(a) Who writes it and who presses.** `WP-1A-A0-006` writes one forward migration numbered 175 in its own governance
pull request; A0 presses it once C0, A1, Q0 and R0 have passed on its final head, CI is green on both jobs (the
migration applied to Postgres in CI) and no security finding is open. This pull request is that one.

**(b) Outbox `tenant_context` — WRITTEN.** Both descriptions name "คอลัมน์ tenant_context ของ outbox". 175 adds
`actor_kind`, `actor_id` and `request_id` to `app.outbox_events`: text, NOT NULL, no default, `actor_kind`
CTR-TEN-001's enum, the two ids bounded exactly as 174 bounds a job's (`^[A-Za-z0-9._:-]{1,128}$`, a narrowing of
CTR-TEN-001 owed to its owner with 174's); `app_worker` may SELECT and INSERT them and no role may UPDATE them; its own
apply-time block asserts all of it. `correlation_id` is 050's existing column (RFC-2026-028 §3.4 names it), so no
second column is added. No backfill: no migrate-clean cluster holds an outbox row when 175 runs, and the instance has
never received 050.

**(c) CARRIED policies `TO app_worker` on `app.jobs`, `app.outbox_events`, `app.consumer_ledger` — NOT WRITTEN; the
Author stopped here and hands the question back to A0.** Both descriptions name "policy แบบ CARRIED" / "policy ให้
app_worker บน app.jobs / outbox_events / consumer_ledger". RFC-2026-022, approved by the Product Owner on 2026-09-08,
decides the opposite in §5/5: "`app_worker` holds no policy on `app.jobs`, `app.outbox_events` or
`app.consumer_ledger` — permanently, not pending", and §7.1/5 makes that a lint negative ("if anyone writes one
later, the build fails until an RFC changes the decision"). RFC-2026-028 (approved 2026-10-05) §3.2 and §5/10 hold the
same, naming a permissive `app_worker` policy on `app.jobs` as the drift its zero-row case must catch. CONTRIBUTING_AGENTS.md's
conflict order puts an approved RFC first and chat last, and requires an RFC "before changing ... tenant hierarchy/RLS".
Neither question put §5/5 in front of the Owner: both asked who writes or who presses, and the policy wording is in
an option's description. The Author's reading is that the answers do not, by themselves, amend an approved RFC's
"permanently" decision, so 175 writes no policy on the three tables. **Owed to A0:** either an explicit Owner decision
amending RFC-2026-022 §5/5 (an RFC amendment pull request, governance, with §7.1/5's lint negative changed in the same
diff), after which a later migration writes the policies; or A0's confirmation that the worker's statements on the
three tables go through the §5/6 broker only, in which case no policy is ever written there.

**(d) The `app_queue` claim broker (RFC-2026-022 §5/6) — NOT WRITTEN; owed, with the missing term named.** The
broker's body is the claimability predicate (which jobs may be claimed: a definition over `available_at`,
`lease_owner`/`lease_expires_at`, `attempt`/`max_attempts`, `cancel_requested_at` and `result_ref`).
`contract-catalog/shared-kernel/ctr-job-001/manifest.json` is `Candidate` and its `freeze_boundary` reads "Candidate
only; lifecycle state names and transition policy remain subject to source-defined owner review." RFC-2026-022 §9
refuses to write the broker before that vocabulary exists ("does not pretend the broker can be written before it
exists"), and 050 refused it twice. **The missing term: CTR-JOB-001's lifecycle state names and transition policy**
(owner A0; `contract-catalog/**` is read-only to this package). Owed before the broker: that restatement by the
contract's owner, then a migration creating `app_queue` (§7.1/1-4: NOLOGIN, NOBYPASSRLS, NOINHERIT, owning no table,
one `prosecdef` function with `search_path = ''` pinned in `catalog-snapshot.json`), its exemption-register row, the
`service-policy-map.json` row and §7.4's cases 11-13 with the negative control.

**(e) What the proofs therefore show, and what they cannot yet.** The brief's proofs "app_worker can claim/complete
only its workspace's jobs" and "runs the job's carried statements under it" need (c) or (d); neither exists, so they are
not written and are owed with them (`acceptance_criteria[4]` stays open). What is proven now, in rls-smoke's
`outbox-event-names-its-tenant-context` (29 rolled-back attempts): the three columns' shape, NOT NULL, bounds and ACL,
each refusal with a control; and, with `app.workspace_id` set by `set_config(..., true)` to the fixture's own workspace,
`app_worker` reads ZERO rows of each of the three tables (no policy reads the setting), with a permissive policy as the
control turning each zero into the row; `authenticated` and `anon` are refused on all three.

**(f) Ownership.** The file sits inside `WP-0A-DB-00`'s writable `db/foundation/**` too. As PR #305's R0 reading
recorded, `scripts/validate-work-package-ownership.mjs` refuses (exit 70) a file one package lists as an output while
another holds it writable, so 175 is NOT listed in this manifest's `outputs.files`; it is declared writable here and
named in this record. Narrowing `WP-0A-DB-00`'s `db/foundation/**` to exclude `175_*.sql` is owed to a pull request of
that package. The DB-00 guard and registry files 175 must change are amended by name (`ownership.amends_without_owning`).
R0's acceptance of 175 as the next free number above 174 (the registry exception 172, 173 and 174 took) is owed.

## 4. What this record does not reach

No RFC text, no contract, no other package's manifest, no CI file, no dependency and no provisioning. No hosted
instance: 175 is declared not applied to the provisioned instance (`catalog-snapshot.json`), as 050-174 are.
