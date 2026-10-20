# Product Owner disposition — CTR-JOB-001's lifecycle, named from the job code, and the broker that follows it (2026-10-20 UTC, session `5ea77291`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run. The two questions, their headers, every option
shown with its description, and the two answers below are copied by script, byte for byte, from the raw transcript
records of the call and its result (session `5ea77291-c263-4dfc-83e9-1d395eee5e51`, the session's question tool, tool
use `toolu_01A4oZHk8r4sCZJowJsszD6H`, records 1601 and 1605 of the transcript file). The times are the transcript's stamps (UTC), not a
clock read. Everything marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of
A0's reading of them. It is not a role verdict, approves nothing on A0's behalf, and is not the per-contract freeze
approval of RFC-2026-031 §4.4.

## 1. Where things stood

- `main` was at `f20b7319` (PR #306 merged). CTR-JOB-001 was `Candidate`, and its manifest's `freeze_boundary` read
  "Candidate only; lifecycle state names and transition policy remain subject to source-defined owner review."
- `WP-1A-A0-004` had merged the job decisions on in-memory fakes (`src/modules/platform-kernel/domain/jobs/**`,
  `application/jobs/**`), deriving every decision from the record's timestamps and counters, because `app.jobs`
  (migration 050) has no status column.
- RFC-2026-022 §5 item 5 (approved) gives `app_worker` no policy on `app.jobs`, `app.outbox_events` or
  `app.consumer_ledger`, "permanently, not pending", and item 6 puts the claim behind a broker owned by `app_queue`.
  RFC-2026-022 §9 says the broker cannot be written before CTR-JOB-001's lifecycle vocabulary exists.

## 2. Questions, options shown and answers (verbatim)

Asked 2026-10-20T11:03:31.665Z, answered 2026-10-20T11:22:35.315Z, through the session's question tool, as one call of two questions
(headers `RFC-022 §5/5` and `JOB lifecycle`). Both are relied on here.

### 2.1 The broker

**Header:** `RFC-022 §5/5`

**Q:** "RFC-022 §5/5 ที่อนุมัติแล้วห้าม policy ของ app_worker บน jobs/outbox/ledger ถาวร ให้ worker เข้าตารางทาง broker app_queue เท่านั้น จะเดินทางไหน?"

- **Options shown:**
  - "คง §5/5 ใช้ broker เท่านั้น (Recommended)" — "ไม่แก้ RFC เขียน broker app_queue (function ที่ claim/complete/fail/append ใน workspace ของ transaction) ตาม RFC-022 §5/6 เป็น migration 176 ต้องรอให้ lifecycle ของ CTR-JOB-001 ถูก freeze ก่อน"
  - "แก้ RFC-022 ให้ worker มี policy ตรง" — "เปิด RFC PR แก้ §5/5 ให้ app_worker มี policy แบบ CARRIED ตาม workspace ง่ายกว่า แต่กลับข้อตัดสินใจด้านความปลอดภัยที่อนุมัติไปแล้ว"
- **A:** "คง §5/5 ใช้ broker เท่านั้น (Recommended)"

### 2.2 The lifecycle

**Header:** `JOB lifecycle`

**Q:** "broker ต้องรู้ชื่อ lifecycle state และ transition ของ CTR-JOB-001 ซึ่งยังไม่ freeze (เจ้าของคือ WP-0A-CON-008) จะให้ทำอย่างไร?"

- **Options shown:**
  - "A0 ดัน CTR-JOB-001 ให้ freeze แล้วกดเมื่อ 4 role ผ่าน (Recommended)" — "เปิด PR ใน WP-0A-CON-008 กำหนด lifecycle จากที่โค้ด job บน fake ทำไว้แล้ว (สถานะคำนวณจาก timestamp/counter ไม่มี status column) แล้วค่อยเขียน broker เป็น migration 176"
  - "Owner กด PR contract เอง" — "A0 เปิด PR และรัน 4 role ให้ครบ แล้วรอคุณกด merge"
- **A:** "A0 ดัน CTR-JOB-001 ให้ freeze แล้วกดเมื่อ 4 role ผ่าน (Recommended)"

## 3. A0's reading, and what this increment does with it

1. **The lifecycle comes from the code, not from a new design.** The option text reads "กำหนด lifecycle จากที่โค้ด job
   บน fake ทำไว้แล้ว (สถานะคำนวณจาก timestamp/counter ไม่มี status column)". So `x-lifecycle` in
   `contract-catalog/shared-kernel/ctr-job-001/schema.json` names what `domain/jobs/job-decisions.ts` at `f20b7319`
   decides, state by state and act by act (`ctr-job-lifecycle-2026-10-20.md` §3), and stores no state. Where that
   code departs from the Workstream's task list, the departure is listed in `x-lifecycle.not_settled`, not changed.
2. **The package is WP-0A-CON-001, not WP-0A-CON-008.** The option text says "เปิด PR ใน WP-0A-CON-008". The contract's
   directory belongs to `WP-0A-CON-001` (`ownership.writable_paths`), `WP-0A-CON-008` holds `contract-catalog/**`
   read-only, and RFC-2026-031 §4.5 (approved) says the change is "a PR of the package that owns the contract's
   directory", naming `WP-0A-CON-001` for JOB. `WP-0A-CON-008`'s registry pins move under `amends_without_owning`, as
   §4.5 says. A0's reading: the ownership rule decides where the edit lands; the Owner's direction is followed in
   substance.
3. **"ให้ freeze" is a direction, not the §4.4 approval.** RFC-2026-031 §4.4 asks the Owner by name, "freeze CTR-XXX-001
   at head `<sha>`", after the role files are on the branch. No such head exists. This increment makes the vocabulary
   decided and keeps CTR-JOB-001 `Candidate`, because §4.1's preconditions do not all hold
   (`ctr-job-lifecycle-2026-10-20.md` §4 names each one and its owner).
4. **Who presses.** The chosen option reads "กดเมื่อ 4 role ผ่าน". A0's reading: A0 may press this pull request once
   C0, A1, Q0 and R0 pass on its final head with CI green on a head containing current `main`. This pull request
   freezes nothing, so no Owner approval under §4.4 is owed for it. A later freeze pull request still needs that
   approval by name.
5. **The broker.** The first answer keeps RFC-2026-022 §5 item 5 unamended, and `x-lifecycle.actors.worker` says a
   worker acts only through the broker. The broker itself (migration 176) is not written here. **The chosen option's
   own text sets an order:** "เป็น migration 176 ต้องรอให้ lifecycle ของ CTR-JOB-001 ถูก freeze ก่อน". Read literally,
   the broker waits for CTR-JOB-001 to be Frozen, not only for its lifecycle to be named, and Frozen waits on the items
   of `ctr-job-lifecycle-2026-10-20.md` §4, several of them schema narrowings owed by A0. A0's reading: whether the
   broker may be written against the lifecycle once this increment merges, with CTR-JOB-001 still Candidate
   (RFC-2026-034 §2.1 lets application code and local migrations build against a Candidate contract, as reversible
   work), or must wait for the freeze, is a question for the Owner. This increment does not answer it.

## 4. The Owner's answers of 2026-10-18

The common brief for this work names A0's question of 2026-10-18T15:29:17.333Z (headers `A0-003`, `A0-004 open`,
`ลด gov`; transcript `325454ab-eb14-4597-afd3-75b6b8c78ee8.jsonl` line 9933) and its answers at
2026-10-18T15:36:54.968Z (line 9946). None of its three questions concerns a contract, so none is relied on here. The
lane follows RFC-2026-034 §2.2 as the classifier reports it.
