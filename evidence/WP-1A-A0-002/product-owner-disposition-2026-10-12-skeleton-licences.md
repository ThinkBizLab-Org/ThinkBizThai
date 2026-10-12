# Product Owner disposition — the skeleton's transitive licences, ESLint, and who presses (2026-10-12 UTC, session `c2816eec`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run. The questions, every option shown with its
description, and the answers below are copied from the question-tool record of session `c2816eec`; the times are the
transcript's stamps (UTC), not a clock read. Local time (UTC+7) was 2026-10-12 09:37–09:39. This is a record of the
Owner's words and of A0's reading of them. It is not a role verdict and approves nothing on A0's behalf.

## 1. Where things stood

- RFC-2026-029 was approved by the Owner on 2026-10-11 and is on `main` (PR #256, `8c9a32ba`). Its §3.4/2 accepts MIT,
  ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0 and 0BSD "without further discussion"; "Anything else, including any
  copyleft licence, is named in the request and decided there."
- An earlier run of `WP-1A-A0-002` resolved the skeleton's minimum set and stopped at the licence condition of its
  brief, writing nothing: every direct dependency is MIT or Apache-2.0, but `caniuse-lite` (CC-BY-4.0), `lightningcss`
  and its platform binaries (MPL-2.0) and `@img/sharp-libvips-*` (LGPL-3.0-or-later; with the `@img/sharp-*` builds
  licensed `Apache-2.0 AND LGPL-3.0-or-later`) arrive transitively. With ESLint and `eslint-config-next`, four more
  licences outside the list, one install script (`unrs-resolver`) and five high-severity advisories (development only)
  came with them.
- The Owner's direction of 2026-10-11 (`evidence/WP-1A-A0-001/product-owner-disposition-2026-10-12-rfc-029-approval.md`
  §3 (b)) lets A0 press the skeleton pull request once C0, A1, Q0 and R0 pass, but says that it "does **not** reach later
  dependency amendments" and that if the skeleton carries one, "A0 does not press it under this direction and asks the
  Owner". A licence decision written into RFC-2026-029 is such an amendment, so A0 asked.

## 2. Questions, options shown and answers (verbatim)

Asked 2026-10-12T02:37:33Z, answered 02:39:15Z, through the session's question tool, as one call of three questions.

### 2.1 Licence

**Q:** "ติดตั้ง Next.js + Tailwind + vitest แล้ว package ตรงทุกตัวเป็น MIT/Apache-2.0 แต่ package ที่ติดมาด้วย (transitive) มี license นอกรายการที่ RFC-029 §3.4/2 ยอมรับอัตโนมัติ: caniuse-lite (CC-BY-4.0, ข้อมูล browser ที่ Next.js ต้องใช้), lightningcss (MPL-2.0, ตัว build CSS ของ Tailwind/vite), และ sharp/libvips (LGPL-3.0, optional สำหรับย่อรูปใน Next.js) — ทั้งหมดใช้แบบไม่แก้ไข ซึ่งปกติไม่ทำให้ต้องเปิดโค้ดของเรา (ผมไม่ใช่ทนาย ถ้าต้องการความแน่นอนทางกฎหมายควรถามทนาย) — จะให้ทำอย่างไร?"

- **Options shown:**
  - "ยอมรับ 3 license นี้สำหรับ transitive (Recommended)" — "บันทึกคำตัดสินของคุณเป็น amendment สั้น ๆ ใน RFC-029 §3.4 (เฉพาะ CC-BY-4.0, MPL-2.0, LGPL-3.0 ของ package ที่ระบุ ใช้แบบไม่แก้ไข) + guard ที่ตรวจ license ทุกตัวใน lockfile ต่อจากนี้"
  - "ไม่ยอมรับ เปลี่ยน stack" — "ต้องเลิก Tailwind v4/vitest หรือปรับ stack ซึ่งต้องแก้ RFC-029 ใหญ่ (caniuse-lite เลี่ยงไม่ได้ถ้าใช้ Next.js)"
- **A:** "ยอมรับ 3 license นี้สำหรับ transitive (Recommended)"

The question said, in A0's words, that A0 is not a lawyer and that a lawyer should be asked for legal certainty
(`ผมไม่ใช่ทนาย ถ้าต้องการความแน่นอนทางกฎหมายควรถามทนาย`). The Owner decided with that said.

### 2.2 ESLint

**Q:** "ESLint (ตาม RFC-029) ดึง package เพิ่มที่มี license นอกรายการอีก 4 ตัว, มี install script 1 ตัว และมีช่องโหว่ high 5 จุด (dev only) — ใส่ใน skeleton ไหม?"

- **Options shown:**
  - "ไม่ใส่ตอนนี้ (Recommended)" — "ตรวจขอบเขต import (§6.3) ด้วย guard script ที่ไม่มี dependency แทน — ESLint ค่อยพิจารณาทีหลัง"
  - "ใส่ ESLint ด้วย" — "ต้องยอมรับ license เพิ่ม (Python-2.0, BlueOak, CC0, MPL) และ install script ของ unrs-resolver"
- **A:** "ไม่ใส่ตอนนี้ (Recommended)"

### 2.3 Who presses

**Q:** "คำตัดสินเรื่อง license จะอยู่ใน PR skeleton เดียวกัน (amendment สั้น ๆ ใน RFC-029) — ใครกด merge PR นั้น?"

- **Options shown:**
  - "A0 กดได้เมื่อ 4 role ผ่าน (Recommended)" — "ขยายสิทธิ์ที่ให้ไว้ให้ครอบคลุม amendment เรื่อง license นี้ใน PR skeleton เท่านั้น"
  - "ผมกดเอง" — "ผมส่งคำสั่ง merge ให้คุณกดเหมือน #256"
- **A:** "A0 กดได้เมื่อ 4 role ผ่าน (Recommended)"

## 3. What the answers direct

**(a) Licences.** CC-BY-4.0 (`caniuse-lite`), MPL-2.0 (`lightningcss` and its platform binaries) and
LGPL-3.0-or-later (`@img/sharp-libvips-*`, and the `Apache-2.0 AND LGPL-3.0-or-later` `@img/sharp-*` builds, optional
through `next` → `sharp`) are accepted for those named **transitive** packages, used unmodified. Any other licence
outside §3.4/2, anywhere in the lockfile, still needs its own decision. The option's description names both halves of
the work: a short amendment to RFC-2026-029 §3.4, and a guard that checks every licence in the lockfile from now on.
They are `RFC-2026-029` § "Amendment 2026-10-12" and `scripts/verify-app-dependencies.mjs` (`checkLicences`), with its
copy of the exceptions in `scripts/app-dependency-allowlist.json` and its tests in
`test-kits/app-dependencies.test.mjs`. Two readings are A0's, not the Owner's words: that `@img/sharp-wasm32`, licensed
`Apache-2.0 AND LGPL-3.0-or-later AND MIT`, is one of "the `@img/sharp-*` builds" (MIT is on §3.4/2's list already); and
that "used unmodified" excludes a package that patches or vendors one of them. A reviewer who reads either differently
should say so.

**(b) ESLint.** ESLint and `eslint-config-next` are not installed in the skeleton, and there is no `eslint.config.mjs`.
RFC-2026-029 §8/4 asks for the §6.3 boundaries "as lint errors"; as the option's description says, they are checked
instead by a dependency-free guard script, `scripts/verify-app-boundaries.mjs`, with a negative control per boundary in
`test-kits/app-boundaries.test.mjs`. ESLint stays on the allowlist (§3.2) and is "considered later" (`ค่อยพิจารณา
ทีหลัง`): its licences, its install script and its advisories go back to the Owner when a package proposes it. These
words do not amend §8/4's text; whether the RFC should say how §8/4 is met meanwhile is A0's to raise.

**(c) Who presses.** The Owner's direction of 2026-10-11 (disposition of that date, §3 (b)) is extended to the licence
amendment, as it travels in the `WP-1A-A0-002` skeleton pull request: A0 may press that pull request once C0, A1, Q0 and
R0 have passed on its final head and CI is green on it, with RFC-2026-025 §5 item 6's other conditions kept (the head
contains current `main`; no security finding of any grade is open against it). The Owner may still press it himself.
Its reach, in A0's reading of the option ("ขยายสิทธิ์ที่ให้ไว้ให้ครอบคลุม amendment เรื่อง license นี้ใน PR skeleton
เท่านั้น"):

- It reaches **this skeleton pull request only, including this amendment**. If the skeleton is split across several pull
  requests, or the amendment travels on its own, A0 asks again.
- It reaches **no other amendment** of RFC-2026-029: not ESLint's licences, not Q-029-7's packages, not any other
  licence that a later lockfile brings.
- It does not change who merges RFC-2026-029 itself or any other governance pull request.

## 4. What these words do not do

- They do not move `WP-1A-A0-002`'s status. The Author moves it to `in_review` and no further.
- They are not legal advice and A0 gave none; the question said so.
- They install no provider SDK and bind no provider. RFC-2026-034 §2.1 keeps provider accounts, sandboxes and
  credentials out until a later decision.
