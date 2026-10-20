# Product Owner disposition — opening WP-1A-A0-006 (the provider and database increment), who presses its first pull request, and the D6 provisional limits (2026-10-20 UTC, session `5ea77291`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run. The three questions, their headers, every option
shown with its description, and the three answers below are copied by script, byte for byte, from the raw transcript
records of the call and its result (session `5ea77291-c263-4dfc-83e9-1d395eee5e51`, the session's question tool, tool
use `toolu_01YTSZNJveweMPY5gjVJ7huT`, records 680 and 681 of the transcript file). The times are the transcript's stamps (UTC), not
a clock read. Everything marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of
A0's reading of them. It is not a role verdict and approves nothing on A0's behalf.

## 1. Where things stood

- `main` was at `f36b23ec` (PR #303, WP-1A-A0-004's Info batch). No manifest for `WP-1A-A0-006` existed, so CI's
  branch-scope step would find no claimant for its branch.
- `WP-1A-A0-003` had moved its provider-bound increment out on 2026-10-18 (the Supabase session, supabase-js wrapped
  with the user's JWT, the session cookies of RFC-2026-029 §8/7, the real tenant access directory adapter and the
  composition wiring), with its `acceptance_criteria[7]`, to "the future package proposed as WP-1A-A0-006"
  (`work-packages/WP-1A-A0-003.json` `open_blockers[25]`; `evidence/WP-1A-A0-003/product-owner-disposition-2026-10-18-provider-split.md`).
- `WP-1A-A0-004` wrote the job and outbox code on in-memory fakes and excludes "the provider and database part"
  (`scope.exclude[0]`): the adapters over `app.jobs`, `app.outbox_events` and `app.consumer_ledger`, the dispatcher
  route, the Cron, the worker's credential and `apps/worker/**`. Its `acceptance_criteria[6]` says the plan rows'
  end-to-end acceptance is met only by that increment.
- Opening a package needs its manifest and its row in `test-kits/branch-identity.test.mjs` (`BRANCH_OWNERSHIP`) with
  the regenerated `test-kits/integrity-manifest.json`. Both test-kit files are governance paths under RFC-2026-034
  §2.2. Both edits are kinds §2.2 lists as additive ("a row for a new branch"; "a regeneration of
  `test-kits/integrity-manifest.json` that only records the digests of files the pull request adds or changes").

## 2. Questions, options shown and answers (verbatim)

Asked 2026-10-20T00:24:13.767Z, answered 2026-10-20T01:10:13.792Z, through the session's question tool, as one call of three questions (headers
`D6 ค่าเพดาน`, `งานถัดไป` and `กด PR เปิด`). All three are relied on here, in the order this record uses them.

### 2.1 Which package opens next

**Header:** `งานถัดไป`

**Q:** "งาน G1 ถัดไปจะเปิด package ไหน? (PR แรกที่เปิด package เป็น governance แบบ additive)"

- **Options shown:**
  - "WP-1A-A0-006 ต่อฐานข้อมูลจริง (Recommended)" — "เขียน adapters/job-store.ts กับ outbox บน Postgres, dispatcher route ต่อ Cron และ worker login role ของ RFC-028 แล้วปิด tenant-context provider ที่ย้ายมาจาก A0-003 ด้วย เป็นเส้นวิกฤตไปสู่ G1"
  - "WP-1A-A5-001 Notification store" — "consumer ของ event ที่สร้าง in-app notification บน fake ก่อน แต่ต้องดัน CTR-NTF-001 ให้เป็น Candidate ก่อน"
  - "WP-1A-A6-002 Observability" — "logger ที่มี redaction, ส่ง correlation ต่อจาก HTTP ไป job ไป event, health/readiness"
- **A:** "WP-1A-A0-006 ต่อฐานข้อมูลจริง (Recommended)"

### 2.2 Who presses the opening pull request

**Header:** `กด PR เปิด`

**Q:** "PR แรกที่เปิด package ใหม่ (governance แบบ additive) ใครเป็นคนกด merge?"

- **Options shown:**
  - "A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "ทำแบบเดียวกับตอนเปิด WP-1A-A0-004 (#299)"
  - "Owner กดเอง" — "A0 เปิด PR และรัน 4 role แล้วรอคุณกด merge"
- **A:** "A0 กดเมื่อ 4 role ผ่าน (Recommended)"

### 2.3 The D6 provisional limits

**Header:** `D6 ค่าเพดาน`

**Q:** "D6: ค่าเพดานชั่วคราวที่ author ตั้งไว้ (max_attempts 20, timeout_seconds 900, relay batch 50) และนโยบาย relay ที่หยุดเมื่อเจอ event ที่ส่งไม่ได้ จะใช้ไปก่อนไหม?"

- **Options shown:**
  - "ใช้ไปก่อน ทบทวนตอน G1 slice (Recommended)" — "คงค่า 20 / 900 / 50 และให้ relay หยุดที่ event ที่ส่งไม่ได้ไว้ก่อน จะตัดสินใหม่ตอนทำ WP-1A-A0-005 ที่ต้องวัดผลบน staging"
  - "เพิ่ม dead-letter ให้ event ตอนนี้" — "event ที่ส่งไม่ได้หลายครั้งจะถูกย้ายออกจากคิว ต้องแก้ CTR-EVT-001 และ migration ด้วย ซึ่งเป็นงาน governance"
- **A:** "ใช้ไปก่อน ทบทวนตอน G1 slice (Recommended)"

## 3. What the answers direct (A0's reading)

**(a) The package is opened.** The answer "WP-1A-A0-006 ต่อฐานข้อมูลจริง (Recommended)" opens `WP-1A-A0-006`. `work-packages/WP-1A-A0-006.json` is
created with status `in_progress`, owner A0 and branch `agent/claude/WP-1A-A0-006-provider-database`, and the branch's
row is added to `BRANCH_OWNERSHIP`. The option's description, "เขียน adapters/job-store.ts กับ outbox บน Postgres, dispatcher route ต่อ Cron และ worker login role ของ RFC-028 แล้วปิด tenant-context provider ที่ย้ายมาจาก A0-003 ด้วย เป็นเส้นวิกฤตไปสู่ G1", names the scope. A0 reads it as two
halves. The first is the database half of `WP-1A-A0-004`: `adapters/job-store.ts` and the outbox store on Postgres,
the dispatcher route for the Cron, and the worker connecting as RFC-2026-028's login role. The second is the
provider-bound increment moved from `WP-1A-A0-003` ("tenant-context provider ที่ย้ายมาจาก A0-003"). The manifest's
`scope.include` states both.

**(b) Who presses the opening pull request.** The question names it before it exists: "PR แรกที่เปิด package ใหม่
(governance แบบ additive)". The chosen option's description is "ทำแบบเดียวกับตอนเปิด WP-1A-A0-004 (#299)". A0 reads it as the conditions under which
#299 was pressed: A0 may press this opening pull request once C0, A1, Q0 and R0 have passed on its final head and CI is
green on both jobs (`bootstrap` and `application`), with RFC-2026-025 §5 item 6's other conditions kept. Those
conditions are that the head contains current `main` and that no security finding of any grade is open against it.
#299's answer also offered the risk lane if A1 and Q0 confirmed the guard hunks additive; this answer does not repeat
that sentence. **A0's reading is therefore the narrower one: all four roles read this pull request, and A0 does not
press it on A1 and Q0 alone.** If A1 and Q0 confirm the hunks additive, their confirmations are recorded as at #299.
The Owner may still press it himself.

**(c) What it reaches.** The opening pull request only: this manifest, the one `BRANCH_OWNERSHIP` row, the
integrity-manifest regeneration recording that file's digest, this record and the author handoff. No source code. It
does not reach a dependency (`package.json`, `package-lock.json`, a workspace), CI, any other guard or its data, an
allowlist, a migration, an RFC, `CONTRIBUTING_AGENTS.md`, another package's manifest, or provisioning; those are asked
again (§4).

**(d) The D6 provisional limits.** The answer "ใช้ไปก่อน ทบทวนตอน G1 slice (Recommended)" keeps the values WP-1A-A0-004's author set as provisional,
together with the relay's policy of stopping at an event it cannot publish. The description reads "คงค่า 20 / 900 / 50 และให้ relay หยุดที่ event ที่ส่งไม่ได้ไว้ก่อน จะตัดสินใหม่ตอนทำ WP-1A-A0-005 ที่ต้องวัดผลบน staging". The
values are `max_attempts` 20, `timeout_seconds` 900 and relay batch 50 (`domain/jobs/job-limits.ts` and
`domain/outbox/outbox-limits.ts` on `main`). A0 reads three consequences for this package:
- the database adapters enforce the same caps the in-memory fake enforces, so a job above either cap is refused
  before a row is written. That answers A1-303-I2 ("the future `adapters/job-store.ts` must enforce it too") in the
  increment that writes the adapter;
- the relay adapter keeps the stop-at-first policy. No event dead-letter is added; that was the other option, and it
  would have needed a CTR-EVT-001 change and a migration;
- the numbers are re-decided in `WP-1A-A0-005` against staging measurements, not by this package.

The question did not ask about lease length, back-off numbers, the per-round time budget or concurrency, so they stay
owed with D6.

**Where the D6 answer is recorded.** It is recorded here and in WP-1A-A0-006's manifest. Its record in
**WP-1A-A0-004's manifest `open_blockers` is left to a later WP-1A-A0-004 records pull request** (RFC-2026-025 §6) on
that package's own branch. This pull request edits no other package's manifest, so its diff stays to the kinds #299 had.

**(e) Consistency with the standing direction of 2026-10-12.** The Owner's direction of 2026-10-12T19:38:08Z
(`evidence/WP-1A-A0-003/product-owner-disposition-2026-10-13-package-tool-config-press.md` §3 (a) 1 and 3) already
lets A0 press a pull request that is governance only because it creates a WP-1A package's manifest and that package's
branch row with the regeneration. A0 reads this answer as the specific direction for this package, consistent with that
one. Neither reaches anything beyond those edits. A role that reads it otherwise should say so.

## 4. Decisions this package owes (recorded, not decided here)

Each item is A0's reading of the tree at `f36b23ec`. Each one is decided before the increment that needs it.

1. **Dependencies.** `pg`, `@supabase/supabase-js` and `@supabase/ssr` are on RFC-2026-029 §3.1, and `@types/pg` is on
   §3.2, each with the place it may be imported. So **no RFC amendment is needed for the names.** Installing them is
   still governance, because it edits `package.json` and `package-lock.json` (RFC-2026-034 §2.2). It also needs §8/8's
   per-name answers before the install, §4.8's release age, and A1 for these four names (§3.4/5 and /6). The worker also
   needs `apps/worker` as an npm workspace of the root package (§4.1), which is another `package.json` edit. That pull
   request needs its own Owner direction.
2. **Where the request-path adapters live.** §3.1 allows `@supabase/ssr` in `apps/web/composition/**` only. §6.3/5
   forbids anything under `apps/web/` from reaching `src/modules/platform-kernel/adapters/**`, its composition root
   included (`scripts/app-boundaries.mjs` enforces it). So a session or tenant-directory adapter that `apps/web` wires
   cannot live under `adapters/**`. *A0's recommendation:* the request-path adapters (the session cookies, the
   per-request supabase-js client and the real tenant access directory) live in `apps/web/composition/**`, which §3.1
   already allows for both Supabase packages. `adapters/**` then holds the `pg` job and outbox stores only. That needs
   no amendment. Narrowing §6.3/5 instead would be an RFC amendment, which is governance.
3. **Ownership overlap (`WP-1A-A0-003`'s R4, `open_blockers[11]`).** `apps/web/composition/**` is inside `WP-1A-A0-002`'s writable
   `apps/web/**`. `scripts/validate-work-package-ownership.mjs` passes today only because this manifest's outputs list
   no file there. The first increment that lists one fails with exit 70 unless `WP-1A-A0-002`'s writable paths are
   narrowed first, in a pull request of that package. `apps/worker/**` is forbidden to `WP-1A-A0-002` and
   `WP-1A-A0-004`, and no package's outputs list a file there.
4. **A forward migration is needed (A0's reading: yes).** None is written here, and `db/**` is read-only to this
   package.
   - `050_async_kernel.sql` and `173_worker_login_identity.sql` give `app_worker` grants and no policy on the three
     queue tables, all `FORCE ROW LEVEL SECURITY` with an empty policy set. Until a policy batch lands, "app_worker
     reads and writes no row of any forced table" (173's header).
   - RFC-2026-022 §5/6 (option F) makes the job claim a DISCOVERED statement served by a `SECURITY DEFINER` broker owned
     by a new role, `app_queue`. That broker needs `CTR-JOB-001`'s lifecycle vocabulary (RFC-2026-028 §3.5/3), which
     `CTR-JOB-001`'s freeze boundary reserves to owner review.
   - The CARRIED statements (complete, fail, heartbeat, outbox append and mark, ledger insert) need policies `TO app_worker`
     under the `app.workspace_id` GUC.
   - `app.outbox_events` stores `workspace_id` but not the full CTR-TEN-001 `tenant_context` the relayed envelope
     requires (A1-302-I2). That needs a 174-style forward migration or a decision.
   - RFC-2026-028 §3.5/1 (Q-028-7) puts RFC-2026-026's worker half, the worker's audit INSERT, before every other worker
     act.

   Still owed: who writes the migration (this package by amendment, or `WP-0A-DB-00`), its number (the next free
   number above 174, the precedent of Q-028-9, with the Integration Owner's acceptance of the registry exception), and
   its own reading. A migration is risk lane under RFC-2026-034 §2.2. Its pins in `scripts/db/run.mjs` and
   `db/foundation/lint/**` are additive only as §2.2 states, and an entry in an admission list only when A1's
   confirmation names it.
5. **How the adapters' tests reach Postgres.** CI's `bootstrap` job runs a `postgres:17` service. The `application` job,
   which runs `npm run test:app`, has none. Testing the adapters against real tables in CI means changing CI or the
   database harness (`scripts/db/**`), both governance, or a runner a governance change admits. Owed before the first
   adapter increment's tests can run in CI.
6. **`WP-1A-A1-001`.** No manifest exists for it on `main` at `f36b23ec`, and none for `WP-1A-A6-001`. The 2026-10-08
   plan's row gives it the hosted migrations and the platform measurements (Q-028-12, the pooler with the custom login
   role), and `WP-1A-A0-003` `open_blockers[9]` (Q8) and `[25]` name it as gating the provider-bound increment. *A0's
   reading:* the reversible work here does not need it (code, fakes, and tests on the local and CI container under
   RFC-2026-029 §7 and RFC-2026-034 §2.1). Anything on a hosted Supabase project, any provider credential and the
   worker's connection route (Q-029-6) do need it, together with RFC-2026-034 §2.1's later decision that opens provider
   accounts. It is recorded in the manifest's `open_blockers` and not listed in `dependencies.required_work_packages`,
   because no manifest exists to point at.
7. **The `KERNEL_CREATED` duty (A1-300-I2; R0-281-2).** The pull request that creates
   `src/modules/platform-kernel/adapters/job-store.ts` must add it to `KERNEL_CREATED` in
   `test-kits/db/foundation-contract.test.mjs`. The test's comment says "The pull request that creates the job store
   adapter (adapters/job-store.ts) adds it here, which is an edit of this test". That file is `WP-0A-DB-00`'s, and the
   test pins the lane classifier's behaviour. *A0's reading:* that pull request is governance unless A1 and Q0 confirm
   the hunk additive under §2.2, and its press needs an Owner direction this answer does not give.
8. **Q-029-2** (which Cron fires the dispatcher). RFC-2026-029 §10 gives it to `WP-1A-A0-004`, and the dispatcher route
   is now this package's. It is decided before the dispatcher increment. A0's recommendation there is Vercel Cron in
   the worker's project.
9. **Inherited from `WP-1A-A0-003`.** Q1 (`open_blockers[2]`: CTR-API-001 has no error shape before a tenant is known) blocks the wire
   form of a refusal on the request path. Q5 (`open_blockers[6]`: the correlation id is always minted) waits on CTR-OBS-001. The session
   cookies' `HttpOnly`, `Secure` and `SameSite=Lax` (§8/7) are shown by a test on the code that sets them. A real
   directory read needs an RFC-2026-021 allowlist entry or a reviewed database function, and none exists.
10. **Not provisioned.** No Supabase project, Vercel project or credential is bound by this package's reversible work.
    The worker credential exists only once Q-028-3's custody is answered (RFC-2026-029 §2.7/3). Provisioning is
    `WP-1A-A6-001`'s and `WP-1A-A1-001`'s.
