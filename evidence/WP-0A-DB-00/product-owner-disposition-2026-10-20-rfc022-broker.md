# Product Owner disposition — RFC-2026-022 Amendment 2026-10-20, the broker's shape (2026-10-20, session `5ea77291`)

Recorded for A0 (`/claude/a0_atlas`, the Author), drafted by an author subagent of that run, on `WP-0A-DB-00`, the
package that owns `architecture/decisions/RFC-2026-022-service-policy-shape.md` (`ownership.writable_paths`). The
questions, options and answers in §2 are copied by script from the raw transcript of session `5ea77291`
(`~/.claude/projects/-Users-bank-ThinkBizThai/5ea77291-c263-4dfc-83e9-1d395eee5e51.jsonl`, records 2323/2324 and
1601/1605) and are byte for byte the `input.questions` and `toolUseResult.answers` values there. Times are the
transcript's stamps (UTC), not a clock read. Everything marked "A0's reading" is A0's, not the Owner's. This record is
not a role verdict, approves nothing, and moves no status.

## 1. Why it was asked

The author of `WP-1A-A0-006`'s migration 176 (the `app_queue` broker) stopped before writing it: RFC-2026-022 §5/5
(no `app_worker` policy on `app.jobs`, `app.outbox_events`, `app.consumer_ledger`), §6's two shapes and §7.1/4 ("exactly
one" `app_queue` function) together leave heartbeat, complete, fail, the outbox's append, fetch and mark, and the ledger
with no lawful route, and §9 leaves the broker's signature open. A0 put the choice to the Owner before any pull request
existed.

## 2. The questions and the answers (verbatim)

### Header `Broker shape` (asked 2026-10-20T16:42:45.699Z, transcript record 2323, tool use `toolu_011rspDmdJLHXCahAncywkW9`; answered 2026-10-20T16:43:53.055Z, record 2324)

Question:

```text
RFC-022 ที่อนุมัติแล้วกำหนด broker app_queue ไว้แค่ 'function เดียว' สำหรับ claim (§7.1/4) แต่ worker ไม่มี policy บนตาราง (§5/5) จึง heartbeat/complete/fail, การอ่านและ mark outbox และ ledger ไม่มีทางทำตาม RFC เลย ต้องตัดสินรูปร่าง broker ก่อนเขียน 176 จะเดินทางไหน?
```

Option 1, label and description:

```text
แก้ RFC-022 ก่อน แล้วค่อยเขียน 176 (Recommended)
```

```text
A0 เขียน RFC PR: broker มีหลาย function หนึ่งตัวต่อหนึ่ง action ทุกตัว pin ไว้ ยังคง §5/5 (ไม่มี policy ให้ worker) ตามที่คุณเลือก claim เริ่มตอน workspace ว่างแล้ว broker ตั้งเอง (ตาม §5/7) action หลัง claim ต้องถือ lease และ workspace ตรงกัน ส่วน relay ของ outbox ได้ function claim ของตัวเอง และ A1 เสนอว่าค่า D6 ควร hard-code หรือเก็บในตาราง kernel parameter
```

Option 2, label and description:

```text
ทำ function เดียวตามตัวอักษร §7.1/4
```

```text
ไม่แก้ RFC function เดียวรับชื่อ action เป็นพารามิเตอร์ signature และการตัดสินใจอื่น ๆ ยังต้องคิดขึ้นเองโดยไม่มี RFC รองรับ function ใหญ่ตัวเดียวตรวจยากกว่า
```

Answer (the `answers` value for this question):

```text
แก้ RFC-022 ก่อน แล้วค่อยเขียน 176 (Recommended)
```

### Header `RFC กด` (asked 2026-10-20T16:42:45.699Z, transcript record 2323, tool use `toolu_011rspDmdJLHXCahAncywkW9`; answered 2026-10-20T16:43:53.055Z, record 2324)

Question:

```text
ถ้าแก้ RFC-022 PR นั้นจะให้ใครอนุมัติและกด merge?
```

Option 1, label and description:

```text
Owner อ่านและอนุมัติเอง (Recommended)
```

```text
เป็นการแก้ข้อตัดสินใจด้านความปลอดภัยที่คุณอนุมัติไว้ (RFC บอกเองว่าการแก้เป็นสิทธิ์ของ Product Owner) A0 เปิด PR รัน 4 role แล้วส่งสรุปภาษาไทยให้คุณอ่านก่อนกด
```

Option 2, label and description:

```text
A0 กดเมื่อ 4 role ผ่าน
```

```text
เร็วกว่า แต่คุณจะไม่ได้อ่านการเปลี่ยนข้อตัดสินใจด้านความปลอดภัยก่อน merge
```

Answer (the `answers` value for this question):

```text
Owner อ่านและอนุมัติเอง (Recommended)
```

### Header `RFC-022 §5/5` (asked 2026-10-20T11:03:31.665Z, transcript record 1601, tool use `toolu_01A4oZHk8r4sCZJowJsszD6H`; answered 2026-10-20T11:22:35.315Z, record 1605; the call's other question, header `JOB lifecycle`, is WP-0A-CON-001's record)

Question:

```text
RFC-022 §5/5 ที่อนุมัติแล้วห้าม policy ของ app_worker บน jobs/outbox/ledger ถาวร ให้ worker เข้าตารางทาง broker app_queue เท่านั้น จะเดินทางไหน?
```

Option 1 (chosen), label and description:

```text
คง §5/5 ใช้ broker เท่านั้น (Recommended)
```

```text
ไม่แก้ RFC เขียน broker app_queue (function ที่ claim/complete/fail/append ใน workspace ของ transaction) ตาม RFC-022 §5/6 เป็น migration 176 ต้องรอให้ lifecycle ของ CTR-JOB-001 ถูก freeze ก่อน
```

Answer:

```text
คง §5/5 ใช้ broker เท่านั้น (Recommended)
```

## 3. A0's reading

(a) **Authority to propose, not approval.** `Broker shape` directs A0 to write an RFC-2026-022 pull request in the
shape its description names (several functions, one per action, each pinned; §5/5 kept; a claim starting with the
workspace unset and the broker setting it, per §5/7; acts after a claim holding the lease with the workspace matching;
the outbox relay's own claim function; the D6 numbers hard-coded or in a kernel-parameter table, proposed by A1). That
is what Amendment 2026-10-20 writes (§B1-§B3, §C1). The amendment states the D6 choice as two options and leaves the
choice to A1's review, which is A0's reading of "A1 เสนอ" (A1 proposes).

(b) **Who approves and presses.** `RFC กด` → `Owner อ่านและอนุมัติเอง (Recommended)`. The Owner reads the amendment and
the Thai summary after C0, A1, Q0 and R0 have read its final head, and merges the pull request himself; that merge is
the approval (`RFC-2026-025` §5 item 6, default case: no exception to its last bullet is directed). A0 does not press
it. No earlier delegation reaches it: the standing directions recorded in this manifest's
`required_human_authorities[1]`-`[4]` each name other items.

(c) **What the answers do not reach.** They reach the text of RFC-2026-022 only (an append-only dated section). They do
not reach migration 176, any policy, grant, function, lint rule, registry row, test, other RFC (`RFC-2026-016`, `-017`,
`-028` are noted in the amendment's §C6, not edited) or another package's manifest. They do not reopen §5/5 (`RFC-022
§5/5`, kept).

(d) **Items decided by A0 inside the Owner's shape, for the roles to check** (A0's reading of the RFC's own principles,
each traced in the amendment): act 6 returns one workspace's batch (§B3, from §5/7's two setters); acts 5 and 9 are in
the closed set (§B1); the outbox append takes actor and request ids from the leased job (§C2, from §4 F, RFC-2026-026
§3.5 and A1-302-I1); no caller-supplied instant (§B4); `app_queue`'s grants follow `x-lifecycle.never` (§B2).
Left open with an owner named: the D6 numbers (A1, §C1), `causation_id` on append and appends outside a lease (§C2),
the claim tie-break (§C4), jobs of a `Closing`/`AccessBlocked` workspace (§C5).
