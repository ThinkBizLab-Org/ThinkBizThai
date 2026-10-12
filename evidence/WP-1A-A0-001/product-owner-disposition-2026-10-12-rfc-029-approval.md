# Product Owner disposition — RFC-2026-029 approved, §7 aligned to RFC-2026-034, and who presses the skeleton (2026-10-11 UTC, session `c2816eec`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run. The questions, options and answers below are
copied from the question-tool records in the session transcript `c2816eec`; times are the transcript's stamps (UTC),
not a clock read. Local time (UTC+7) was 2026-10-12 01:33–01:46. This is a record of the Owner's words and of A0's
reading of them. It is not a role verdict and approves nothing on A0's behalf.

## 1. Where things stood

- RFC-2026-029 reached `main` through PR #215 (`4b5dac8e`, 2026-10-08T10:21:38Z) with its status line still reading
  **In review**. Its own text said the Owner's personal merge would be its approval (RFC-2026-025 §5 item 6), and the
  status line was never changed, so it was read as In review afterwards (for example A1-251r2-5,
  `evidence/WP-0A-A0-001/a1-reread2-2026-10-11-pr251.md`).
- RFC-2026-034 (fast lane) was approved by the Owner on 2026-10-11 and is on `main` (PR #251). Its §2.1 lets application
  code, fakes and consumer tests against contracts at `Candidate` or above be merged as reversible work. RFC-2026-029
  §7 still merged such code only against `Integrated v1` contracts. RFC-2026-034 could not amend an RFC that was not in
  effect (A1-251r2-5), so the two disagreed, with RFC-2026-029 the stricter.
- PR #255 (CI prints the tier and the lane on every pull request, RFC-2026-034 §8 item 2) had just merged (`3070d888`).

## 2. Questions, options shown and answers (verbatim)

### 2.1 What next (context)

Asked 2026-10-11T18:33:42Z, answered 18:41:50Z, through the session's question tool.

**Q:** "#255 merge แล้ว (CI พิมพ์ tier + lane ทุก PR) — ทำอะไรต่อ?"

- **Options shown:**
  - "เริ่มโค้ดแอป (Recommended)" — "วาง layout แอป (RFC-029) + platform-kernel ชิ้นแรก พร้อมให้ CI รัน test ของแอป (§8 item 4) ในตัว — ได้ของที่เห็นได้จริงเร็วกว่า"
  - "ทำ §8 item 4 ก่อน" — "ให้ CI รัน test ใน src/ และ apps/ ก่อนมีโค้ดแอป (governance PR อีกตัว, อาจใช้หลายรอบ)"
  - "เก็บ records + audit ก่อน" — "records หลัง merge ของ #255 และ audit รอบแรก (ครบกำหนด 18 ต.ค.)"
  - "หยุดก่อน" — "handoff อัปเดตแล้วครบทั้ง 3 ที่"
- **A:** "เริ่มโค้ดแอป (Recommended)"

This chose the next work. It approved nothing: RFC-2026-029 still had to be Approved before application code, which is
what A0 asked next.

### 2.2 Q1 — RFC-2026-029

Asked 2026-10-11T18:42:55Z, answered 18:46:09Z, through the session's question tool, together with Q2.

**Q:** "ก่อนเขียนโค้ดแอปได้ RFC-2026-029 (stack: Next.js + TypeScript strict + Tailwind/shadcn + Supabase, รายการ dependency ที่อนุญาต, layout apps/web + src/modules) ต้องเป็น Approved — ตอนนี้อยู่บน main แต่สถานะ 'In review' และ §7 ยังบอกว่าห้าม merge โค้ดแอปจนสัญญา Integrated v1 (ขัดกับ RFC-034 ที่คุณเพิ่งอนุมัติ) จะให้ผมทำอย่างไร?"

- **Options shown:**
  - "อนุมัติ RFC-029 ตามที่เขียน + ปรับ §7 ตาม RFC-034 (Recommended)" — "A0 เปิด PR: §7 ให้โค้ดแอปบนสัญญา Candidate merge ได้แบบ reversible (synthetic, ไม่ผูก provider) ตาม RFC-034 §2.1 + บันทึกคำตอบนี้ + ตั้ง Approved → 4 role อ่าน → คุณกด merge เอง"
  - "ขออ่าน RFC-029 ก่อน" — "ผมสรุป RFC-029 เป็นภาษาไทยให้อ่านก่อนตัดสินใจ"
- **A:** "อนุมัติ RFC-029 ตามที่เขียน + ปรับ §7 ตาม RFC-034 (Recommended)"

### 2.3 Q2 — who presses the skeleton

**Q:** "หลัง RFC-029 อนุมัติ PR แรกของแอปคือ skeleton (WP-1A-A0-002: Next.js + TypeScript + Tailwind, package.json/lockfile, CI รัน tsc และ test ของแอป = RFC-034 §8 item 4) ซึ่งเป็น governance — ใครกด merge?"

- **Options shown:**
  - "A0 กดได้เองเมื่อ 4 role ผ่าน (Recommended)" — "เหมือน Q-034-6 (i) — ครอบคลุมเฉพาะ skeleton PR นี้ (รวม §8 item 4) ไม่รวม RFC-029 เอง; คำตอบจะถูกบันทึกใน disposition"
  - "ผมกดเอง" — "ผมจะส่งคำสั่ง merge ให้คุณกดเหมือน #251"
- **A:** "A0 กดได้เองเมื่อ 4 role ผ่าน (Recommended)"

## 3. What the answers direct

**(a) RFC-2026-029 is approved as written, with §7 aligned to RFC-2026-034 §2.1.** "As written" is the text on `main`
at `3070d888` (blob `f22d6b36b6ed3068b94c3c0bfd126321349f57f5`). The one substantive change the answer directs is §7:
application code, fakes and consumer tests against contracts at `Candidate` or above may be merged into
`src/modules/` and `apps/` as reversible work (synthetic data only; migrations on local and CI service-container
databases only; no external provider account, sandbox included, bound, and no provider credential used); code against
a `Draft` contract stays a spike under `spikes/`; and every contract a deploy uses is `Frozen` before any paid beta,
real customer data or production deploy serving users. The rest of the PR follows from that: the status line, a note
in §10, and the sentences elsewhere in the RFC that relied on the old §7 or on facts the old text dated (PR #214 open,
Draft contracts). Any further substantive change is not covered by these words and goes back to the Owner. The approval
takes effect when the Owner merges this PR personally ((c) below). It does not answer Q-029-2, -3, -4 or -6, which stay
with the packages the RFC names; Q-029-1, -5 and -7 were not put to him one by one: they remain A0's recommendations, not
his answers, and §10 says so (C0-256-1, R0-256-1).

**(b) A0 may press the WP-1A-A0-002 skeleton pull request.** That pull request installs Next.js, TypeScript and
Tailwind, adds `package.json` changes and the lockfile, and makes CI run `tsc` and the application tests (RFC-2026-034
§8 item 4). A0 (`/claude/a0_atlas`) may press its merge once C0, A1, Q0 and R0 have passed on its final head and CI is
green on that head. RFC-2026-025 §5 item 6's other conditions still apply in full: the head contains current `main`,
and no security finding of any grade is open against it. The Owner may still press it himself. RFC-2026-025 §5 item 6 says a governance PR is merged by the Owner
personally, "never by delegation"; this is a named exception the Owner gave for one pull request, of the kind
RFC-2026-025 records for PR #211 and the 2026-10-08 disposition §10.2 records, not a delegation under that rule
(C0-256-2). It does not amend RFC-2026-025. Its reach, in A0's reading of the option text ("ครอบคลุมเฉพาะ skeleton PR นี้ (รวม §8 item
4) ไม่รวม RFC-029 เอง"):

- It reaches **that one pull request only**. The pull request does not exist yet. RFC-2026-025 §5 item 6 says the
  delegation "must be given after the PR it names exists, or must name its sequence explicitly". The question names it
  by its sequence: "หลัง RFC-029 อนุมัติ PR แรกของแอปคือ skeleton (WP-1A-A0-002 …)", the first application pull request
  after RFC-2026-029 is approved. This reading is A0's. If the skeleton is split across several pull requests, A0 asks
  again before pressing any of them.
- It does **not** reach RFC-2026-029 itself, which (c) keeps with the Owner.
- It does **not** reach later dependency amendments. Any amendment to RFC-2026-029's allowlist, including the one
  dated amendment Q-029-7 expects `WP-1A-A0-002` to bring, changes RFC-2026-029. The Owner merges it personally under
  §3.4/1, whether it travels in the skeleton pull request or on its own. This reading is A0's. If the skeleton pull
  request carries such an amendment, A0 does not press it under this direction and asks the Owner.
- It does **not** reach any other governance pull request. RFC-2026-034 Q-034-6 (i) already lets A0 press §8 item 4 on
  its own. This direction extends the same exception to the skeleton's package, lockfile, tool configuration and `tsc` step,
  which are governance under RFC-2026-034 §2.2 (C0-256-2).
- It reaches **Next.js, TypeScript and Tailwind** and what RFC-2026-029 §3 lists for them, as the question named. A
  provider SDK (`@supabase/*`, `pg`, `@sentry/nextjs`) installed in the skeleton pull request is outside those words;
  if the skeleton carries one, A0 asks the Owner before pressing (A1 note, R0-256-2). Because Q-029-7 expects the
  skeleton to carry a dated allowlist amendment, the Owner should expect A0 to ask him about that amendment, or to land
  it separately first.

**(c) This RFC-2026-029 pull request is merged by the Owner personally.** The chosen option says so ("คุณกด merge
เอง"). No delegation covers it: not (b), not the 2026-10-08 disposition §10.2 (which let A0 press PR #215 in that
day's plan), and not RFC-2026-034 Q-034-6. Before he merges, C0, A1, Q0 and R0 read the pull request's head, as the
option says ("4 role อ่าน").

## 4. What these words do not do

- They do not move `WP-1A-A0-001`'s status. The Author moves it to `in_review` and no further.
- They do not close `OPEN-018` in the Decision Register. That edit is owed once the Owner merges this pull request, and
  no package lists a `docs/` path among its `writable_paths` at `3070d888` (RFC-2026-029 §11).
- They do not change `evidence/g0-tracker-th.md`, whose OPEN-018 row (line 270) still says RFC-2026-029 "ยังไม่ได้เขียน".
  That file is WP-0A-A0-001's and is updated by its owner.
- They install nothing, bind no provider, and provision nothing. RFC-2026-034 §2.1 keeps provider accounts, sandboxes
  and credentials out until a later decision.
