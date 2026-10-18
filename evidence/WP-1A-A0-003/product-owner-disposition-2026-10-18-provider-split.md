# Product Owner disposition — the provider-bound scope leaves WP-1A-A0-003 for a new package (2026-10-18 UTC, session `325454ab`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run, on 2026-10-18. The questions, headers, the
options shown with their descriptions, and the answers below are copied by script, byte for byte, from the raw
transcript records of the call and its result (session `325454ab-eb14-4597-afd3-75b6b8c78ee8`, the session's question
tool, tool use `toolu_01VBSkRssP3oTmx2m5hkmUx2`, records 9933 and 9946 of the transcript file); the copy was checked by script after this
file was written. The times are the transcript's stamps (UTC), not a clock read. Everything marked "A0's reading" is
A0's, not the Owner's. This is a record of the Owner's words and of A0's reading of them. It is not a role verdict and
approves nothing on A0's behalf.

## 1. Where things stood

- `main` was at `f9f1aad7`. `WP-1A-A0-003` was `in_progress`; its pure-TypeScript increments had merged as PR #259
  (PR-G), #261 (PR-1), #265 (PR-2) and #275 (PR-3), and its records as #282.
- The manifest's `acceptance_criteria[7]` (the 2026-10-08 plan row's "actor, scope และ correlation ต่อกันได้จาก request ถึง
  DB") is met only by the provider-bound increment (`open_blockers[13]`, C0-259-3), which RFC-2026-034 §2.1 keeps
  closed until a later decision opens provider accounts and sandboxes. The R0 round audit of 2026-10-18
  (`evidence/audits/2026-10-18/r0-audit.md` §5) read the package as unable to move past `in_review` for that reason.
- So A0 asked, in one call of three questions, single choice each. Two of them bear on this record.

## 2. Questions, options shown and answers (verbatim)

Asked 2026-10-18T15:29:17Z (`2026-10-18T15:29:17.333Z`), answered 2026-10-18T15:36:54Z (`2026-10-18T15:36:54.968Z`).

### Header "A0-003"

**Q:** "WP-1A-A0-003 (tenant context) ติดเกณฑ์ข้อสุดท้ายที่ต้องต่อ Supabase จริง (ต้องเปิด provider sandbox ก่อน) — จะทำอย่างไร?"

- **Options shown:**
  - "แยกส่วน provider ออกเป็น WP ใหม่ (Recommended)" — "A0-003 ปิดด้วยส่วน TypeScript ที่เสร็จแล้ว (ย้ายเกณฑ์ข้อ [7] ไป WP ที่ต่อ DB จริงทีหลัง) · risk lane, A0 กดหลัง A1+Q0"
  - "เปิด provider sandbox เลย" — "ต้องมี RFC governance + คุณเปิด Supabase project/คีย์เอง — ช้ากว่า"
  - "พัก A0-003 ไว้ก่อน" — "ไปทำ job/outbox เลย"
- **A:** "แยกส่วน provider ออกเป็น WP ใหม่ (Recommended)"

### Header "A0-004 open"

**Q:** "เปิด WP-1A-A0-004 (job worker + outbox) — PR แรกที่เปิด package เป็น governance (แตะ guard แบบ additive) · PR ถัดไป (โค้ด job/outbox บน fake) เป็น risk lane — ใครกด PR แรก?"

- **Options shown:**
  - "เปิด + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "หรือถ้า A1+Q0 ยืนยันว่าเป็น additive ก็ลดเป็น risk lane ตาม RFC-034"
  - "เปิด แต่ผมกดเอง" — "A0 เตรียมครบแล้วรอคุณกด"
- **A:** "เปิด + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

The third question of the call (header `ลด gov`) concerns a governance pull request on the guard fixtures; this record
does not rely on it beyond naming it in `open_blockers[24]`'s closing clause.

A0's translation of the first question (A0's reading, not the Owner's words): "WP-1A-A0-003 (tenant context) is held by
its last criterion, which needs the real Supabase connection (a provider sandbox must be opened first) — what to do?"
The chosen option: "Split the provider part out into a new WP (Recommended)" — "A0-003 closes on the TypeScript part
already done (criterion [7] moves to the WP that connects the real DB later) · risk lane, A0 presses after A1+Q0".

## 3. What it directs (A0's reading)

1. `acceptance_criteria[7]` and the provider-bound increment (the Supabase session, supabase-js with the user's JWT,
   the RFC-2026-029 §8/7 cookies, the real tenant access directory adapter, composition wiring, `adapters/**`) leave
   `WP-1A-A0-003` for a future package. A0 proposes the id `WP-1A-A0-006` ("Supabase session and tenant adapters",
   A0, platform-kernel); `WP-1A-A1-001` is already the 2026-10-08 plan's row for A1's migrations on hosted Supabase,
   which the future package depends on. The future package is not created by this record or its pull request.
2. `WP-1A-A0-003` closes on the pure-TypeScript increments on `main`: its status moves to `in_review`. The package's
   `review_approved`, `test_verified` and `integration_verified` still come only from the round audits
   (RFC-2026-034 §2.3).
3. The pull request recording this takes the risk lane, and A0 presses it once A1 and Q0 pass on its final head with CI
   green ("risk lane, A0 กดหลัง A1+Q0"). It reaches no other pull request.
4. Because `WP-1A-A0-004` is to be opened (header `A0-004 open`), `WP-1A-A0-003`'s `writable_paths` is narrowed
   from `src/modules/platform-kernel/**` to the module's top-level, `domain/` and `application/` files, so the
   job and outbox directories (`src/modules/platform-kernel/{domain,application}/{jobs,outbox}/**`) can be that
   package's without an ownership overlap. Who presses `WP-1A-A0-004`'s first pull request is that answer's own
   matter and is not read here.

## 4. Where it is recorded

`work-packages/WP-1A-A0-003.json`: `status`, `purpose`, `scope.exclude` (`[0]` extended, one entry added),
`acceptance_criteria[7]` (marked moved out, old text kept), `ownership.writable_paths`, `outputs.files`,
`required_human_authorities[4]` (appended), and `open_blockers` (`[0]`, `[9]`, `[11]`, `[13]`, `[24]` extended
after their old text; `[25]` appended).
