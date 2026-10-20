# Product Owner disposition — WP-1A-A0-006's dependencies and CI Postgres in one pull request, who writes the forward migration, and which Cron fires the dispatcher (2026-10-20 UTC, session `5ea77291`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run. The three questions, their headers, every option
shown with its description, and the three answers below are copied by script, byte for byte, from the raw transcript
records of the call and its result (session `5ea77291-c263-4dfc-83e9-1d395eee5e51`, the session's question tool, tool
use `toolu_012kiYSGkgvG7oxLMwudBgd6`, records 913 and 914 of the transcript file). The times are the transcript's stamps
(UTC), not a clock read. Everything marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words
and of A0's reading of them. It is not a role verdict and approves nothing on A0's behalf.

## 1. Where things stood

- `main` was at `0fc0e2f1`: PR #304, which opened `WP-1A-A0-006`, was merged. Its manifest recorded four decisions
  owed before the first code increment (`open_blockers[2]`, `[5]`, `[6]`, `[9]` there): installing `pg`, `@types/pg`,
  `@supabase/supabase-js` and `@supabase/ssr` with the `apps/worker` workspace; who writes the forward migration that
  gives `app_worker` policies on `app.jobs`, `app.outbox_events` and `app.consumer_ledger`; how the adapters' tests
  reach Postgres in CI (the `application` job had no database); and Q-029-2. `open_blockers[8]` carried the
  KERNEL_CREATED duty for `adapters/job-store.ts`.
- RFC-2026-029 §3.1 and §3.2 already list the four packages, with where each may be imported, so the names needed no
  RFC amendment. Installing them edits `package.json`, `package-lock.json` and a workspace, and giving the
  `application` job a database edits `.github/workflows/ci.yml` and the guard test that pins that job: governance
  under RFC-2026-034 §2.2.

## 2. Questions, options shown and answers (verbatim)

Asked 2026-10-20T02:58:32.953Z, answered 2026-10-20T03:00:37.969Z, through the session's question tool, as one call of
three questions (headers `Migration`, `Deps + CI` and `Q-029-2`). All three are relied on here, in the order this
record uses them.

### 2.1 Deps + CI

**Header:** `Deps + CI`

**Q:** "การติดตั้ง dependency (pg, @types/pg, @supabase/supabase-js, @supabase/ssr ซึ่งอยู่ใน allowlist ของ RFC-029 แล้ว) กับการเพิ่ม Postgres ให้ CI job application เป็น governance ใครกด merge?"

- **Options shown:**
  - "รวม 1 PR แล้ว A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "รวม package.json, lockfile, workspace apps/worker, Postgres service ใน CI และการเพิ่ม job-store.ts เข้า KERNEL_CREATED ไว้ใน PR เดียว"
  - "แยก PR และ Owner กดเอง" — "A0 เปิด PR แยกทีละเรื่องและรัน 4 role แล้วคุณกด merge เอง"
- **A:** "รวม 1 PR แล้ว A0 กดเมื่อ 4 role ผ่าน (Recommended)"

### 2.2 Migration

**Header:** `Migration`

**Q:** "ตอนนี้ app_worker อ่านหรือเขียน app.jobs / outbox_events / consumer_ledger ไม่ได้เลย เพราะตารางเปิด FORCE RLS แต่ไม่มี policy ใครควรเขียน forward migration (เลข 175 ขึ้นไป)?"

- **Options shown:**
  - "A0-006 เขียนเอง (Recommended)" — "ขยาย writable ของ A0-006 ให้ครอบไฟล์ migration ใหม่ ให้เขียน policy แบบ CARRIED, broker app_queue และคอลัมน์ tenant_context ของ outbox ได้ ทุก PR ที่แตะ migration เป็น governance ต้องผ่าน 4 role"
  - "ให้ WP-0A-DB-00 เขียน" — "ให้เจ้าของฐานข้อมูลเดิมเขียน ส่วน A0-006 รอใช้"
- **A:** "A0-006 เขียนเอง (Recommended)"

### 2.3 Q-029-2

**Header:** `Q-029-2`

**Q:** "Q-029-2: dispatcher จะให้ Cron ตัวไหนเรียก?"

- **Options shown:**
  - "Supabase Cron เรียก route ทุกนาที (Recommended)" — "ตาม D6 ในแผน 2026-10-08 Cron ระดับนาทีเรียก dispatcher route ที่ claim ด้วย lease และจำกัดเวลาต่อรอบ"
  - "Vercel Cron" — "ใช้ Cron ของ Vercel ที่ deploy แอป"
  - "ยังไม่ตัดสิน" — "ทำ adapter บน Postgres ก่อน แล้วค่อยตัดสินตอนทำ dispatcher"
- **A:** "Supabase Cron เรียก route ทุกนาที (Recommended)"

## 3. What the answers direct (A0's reading)

**(a) One pull request, pressed by A0 after the four roles.** The answer "รวม 1 PR แล้ว A0 กดเมื่อ 4 role ผ่าน (Recommended)" and its description
name the contents: `package.json`, the lockfile, the `apps/worker` workspace, a Postgres service in CI, and
`job-store.ts` added to KERNEL_CREATED. A0 reads them as this pull request (`scope.include[6]` of the manifest):

- `pg` 8.23.1 in `apps/worker/package.json`, `@supabase/supabase-js` 2.117.3 and `@supabase/ssr` 0.12.7 in
  `apps/web/package.json`, `@types/pg` 8.23.1 in the root `devDependencies`; `apps/worker` in the root `workspaces`;
  `package-lock.json` as npm 11.19.0 wrote it;
- the `application` job given the bootstrap job's `postgres:17` service container, written exactly as it is there, a
  step that applies the shim and `make db-migrate-clean` to it, and `DB_TEST_URL`/`PGPASSWORD` on that step and on the
  application tests; a test under `src/modules/platform-kernel/adapters/` proving only that the tests reach it;
- `src/modules/platform-kernel/adapters/job-store.ts`, created type-only, and its KERNEL_CREATED entry in
  `test-kits/db/foundation-contract.test.mjs`;
- the guard-test edits these need (`test-kits/app-stack.test.mjs`, `test-kits/app-dependencies.test.mjs`,
  `test-kits/test-coverage-floor.test.mjs`'s workspace pin) and the regenerated `test-kits/integrity-manifest.json`.

A0 may press it once C0, A1, Q0 and R0 have passed on its final head and CI is green on both jobs (`bootstrap` and
`application`), with RFC-2026-025 §5 item 6's other conditions kept (the head contains current `main`; no security
finding of any grade is open against it). The Owner may still press it himself. The answer does not reach an RFC
edit, `scripts/app-dependency-allowlist.json` or another guard script, a migration, or another package's manifest;
none is edited.

One hunk is named here because the answer reaches it only through its description: the A1-287-2 key allowlist in
`test-kits/app-stack.test.mjs` refused any `services:` key on the `application` job. "Postgres service ใน CI" cannot land
without changing it, so the test now reads a job's `services:` block apart from its head and holds the `application`
job's to the bootstrap job's container line for line. That widens a guard by one pinned block and is **not** one of
RFC-2026-034 §2.2's additive kinds; A0 reads the Owner's words as directing it, and A1 reads it.

**(b) The forward migration is this package's.** The answer "A0-006 เขียนเอง (Recommended)" makes WP-1A-A0-006 the author. Its description
names what the migration holds (policies for the CARRIED statements, the `app_queue` broker, the outbox's
`tenant_context` column) and that every pull request touching a migration is governance read by all four roles. A0
reads it as a later pull request, not this one. This pull request only declares the path:
`db/foundation/migrations/175_*.sql` in `ownership.writable_paths`, with the rest of `db/` enumerated read-only. It
writes nothing under `db/`.

**(c) Q-029-2 is decided.** The answer "Supabase Cron เรียก route ทุกนาที (Recommended)" decides that a once-a-minute Supabase Cron calls the
dispatcher route, which claims under a lease and stops within a per-round budget (its description, citing D6 of the
2026-10-08 plan). RFC-2026-029 §10 still recommends Vercel Cron and notes that Supabase Cron "would need the secret
stored in the database"; §2.8 places the Cron's secret in the worker project's environment. Neither is edited here.
A0 records the decision in the manifest (`open_blockers[9]`) and owes, before the dispatcher increment, an appended
RFC-2026-029 note and the answer to how the caller's secret is held when Supabase Cron is the caller, read by A1.

## 4. RFC-2026-029 §8/8's per-name answers, from the resolved lockfile

Resolved with `npm install --save-exact --ignore-scripts --engine-strict --before=2026-10-13` on npm 11.19.0 and Node
24.20.0 (the release age of §4.8: seven days before 2026-10-20). `@supabase/supabase-js` 2.118.0 is the registry's
`latest` but was published 2026-10-15, so 2.117.3 (2026-10-07) is installed. The pull request adds 25 lockfile entries,
all from `https://registry.npmjs.org/` with a `sha512` integrity, and removes none; `node scripts/verify-release-age.mjs
origin/main` reports the newest at 2026-10-07T12:36:31.240Z.

| Name (version, workspace) | Licence | Install script | Lockfile entries it adds | Network at build or run time |
|---|---|---|---|---|
| `pg` 8.23.1 (`apps/worker`) | MIT | none | 14: `pg` and `pg-cloudflare` (optional), `pg-connection-string`, `pg-int8` (ISC), `pg-pool`, `pg-protocol`, `pg-types`, `pgpass`, `postgres-array`, `postgres-bytea`, `postgres-date`, `postgres-interval`, `split2` (ISC), `xtend`; all MIT unless named | none at build; at run time only the database it is given |
| `@types/pg` 8.23.1 (root, dev) | MIT | none | 1 | none (types) |
| `@supabase/supabase-js` 2.117.3 (`apps/web`) | MIT | none | 8: itself, `@supabase/auth-js`, `-functions-js`, `-postgrest-js`, `-realtime-js`, `-storage-js` (each 2.117.3), `@supabase/phoenix` 0.4.5, `iceberg-js` 0.8.1; all MIT | none at build; at run time only the Supabase project it is given, with a client-version header; an opt-in tracing entry (`@supabase/supabase-js/tracing`) imports `@opentelemetry/api`, which is not installed and is not imported here |
| `@supabase/ssr` 0.12.7 (`apps/web`) | MIT | none | 2: itself and `cookie` 1.1.1 (MIT; its `prepare` script is not run for a registry install, and the lockfile marks no install script) | none |

No entry declares a `bin`; the lockfile's only `hasInstallScript` entry is `fsevents`, which was there before. No new
package has telemetry of its own (a search of the installed files found the word only in version comments and the
opt-in tracing entry above). §4.7's switches are unchanged. `npm audit --include=dev --audit-level=high` reports 0
vulnerabilities.

## 5. What this record does not decide

The forward migration's content and number acceptance (R0, the registry exception), its pins and the contract owner's
answers; the RFC-2026-029 text for Q-029-2 and the Cron secret's custody; D6's lease length, back-off, per-round budget
and concurrency; WP-1A-A1-001's and WP-1A-A6-001's provisioning and the worker's connection route (Q-029-6). Each stays
in the manifest's `open_blockers`.
