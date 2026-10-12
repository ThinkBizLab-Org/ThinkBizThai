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
`test-kits/app-dependencies.test.mjs`. Three readings are A0's, not the Owner's words, which named `caniuse-lite`,
`lightningcss` and `sharp/libvips`: that `lightningcss`'s per-platform binaries (`lightningcss-<platform>`) are part of
the `lightningcss` he named (C0-257-5); that `@img/sharp-wasm32`, licensed `Apache-2.0 AND LGPL-3.0-or-later AND MIT`,
is one of "the `@img/sharp-*` builds" (MIT is on §3.4/2's list already); and that "used unmodified" excludes a package
that patches or vendors one of them. A reviewer who reads any of them differently should say so.

**(b) ESLint.** ESLint and `eslint-config-next` are not installed in the skeleton, and there is no `eslint.config.mjs`.
RFC-2026-029 §8/4 asks for the §6.3 boundaries "as lint errors"; as the option's description says, they are checked
instead by a guard script, `scripts/verify-app-boundaries.mjs` (its rules in `scripts/app-boundaries.mjs`), with a
negative control per boundary in `test-kits/app-boundaries.test.mjs`. ESLint stays on the allowlist (§3.2) and is
"considered later" (`ค่อยพิจารณาทีหลัง`): its licences, its install script and its advisories go back to the Owner when a
package proposes it.

RFC-2026-029's Amendment 2026-10-12 records this answer, in the option's words, as how §8/4 is held while ESLint is
deferred; that record is part of the amendment the press direction (c) reaches. Beyond the Owner's words, and marked
there as A0's reading (C0-257-1, C0-257-2, R0-257-2): the same guard holds §2.1/3 (`@ts-ignore` not used,
`@ts-expect-error` only with a reason, no `any` in application code) and stands as §2.1/4's lint step, as its own CI
step, while ESLint is deferred. Its rules need no dependency and run in `npm run check` with none; in CI the guard also
reads the sources with TypeScript's parser, through the `typescript` package §3.2 already lists, and that step fails if
the parser cannot load. Whether that use of an installed package sits inside the option's "ไม่มี dependency" is A0's
reading too, and is named to the Owner in the press report.

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

## 5. Two further questions, after the first review round on PR #257 (verbatim)

Asked 2026-10-12T07:08:30Z, answered 07:24:27Z (UTC, the transcript's stamps; local time 14:08–14:24), through the
question tool of session `c2816eec`, as one call of two questions. The questions, every option shown with its
description, and the answers are copied from that call's record. As in §2, this records the Owner's words and A0's
reading of them; it is not a role verdict.

### 5.1 TS parser

**Q:** "แก้ #257 ตาม A1 แล้ว: guard ตรวจ import ต้องใช้ parser ของ TypeScript (ติดตั้งอยู่แล้ว ไม่เพิ่ม package) จึงจะหลบไม่ได้ — แต่ RFC-029 §3.2 เขียนว่า typescript 'import ได้จาก: nowhere (a CLI)' และคำตอบเดิมของคุณบอก guard ที่ 'ไม่มี dependency' — จะให้ทำอย่างไร?"

- **Options shown:**
  - "อนุญาตให้ guard import typescript (Recommended)" — "เพิ่ม amendment แคบ ๆ ใน RFC-029: typescript import ได้เฉพาะไฟล์ scripts/app-boundaries-parser.mjs (ใช้ parser API อย่างเดียว, รันใน CI) — ใน PR skeleton เดียวกัน และ A0 กดได้เมื่อ 4 role ผ่าน"
  - "ไม่ — ใช้ guard แบบไม่มี dependency ต่อ" — "guard แบบ regex ที่ปิดช่อง JSX แล้ว แต่การห้าม any จะตรวจด้วยคนอ่านอย่างเดียว และ A1 อาจไม่ปิด finding"
- **A:** "อนุญาตให้ guard import typescript (Recommended)"

### 5.2 Required

**Q:** "CI ของ #257 แยก job 'application' (tsc, test แอป, build) ออกจาก 'bootstrap' ตาม A1 — แต่ branch protection ตอนนี้บังคับเฉพาะ 'bootstrap' ถ้าไม่เพิ่ม 'application' เป็น required check จะ merge ได้แม้ job นั้นแดง — จะให้ใครตั้ง?"

- **Options shown:**
  - "A0 ตั้งผ่าน gh api หลัง #257 merge (Recommended)" — "เพิ่ม 'application' เข้า required status checks ของ main ครั้งเดียว ไม่แตะค่าอื่น บันทึกคำสั่งนี้ใน disposition"
  - "ผมตั้งเองใน GitHub" — "Settings → Branches → main → Require status checks → เพิ่ม 'application' หลัง #257 merge"
- **A:** "A0 ตั้งผ่าน gh api หลัง #257 merge (Recommended)"

## 6. What these answers direct

**(a) `typescript` in the boundary guard's parser.** RFC-2026-029 §3.2's `typescript` row widens, by a dated amendment
in this pull request, so that `typescript` may be imported by `scripts/app-boundaries-parser.mjs` only, for its parser
API only, run in CI. It is recorded in RFC-2026-029 § "Amendment 2026-10-12" (its paragraphs "`typescript` in the
boundary guard's parser (§3.2)" and "Who presses"), and §3.2's cell now reads "nowhere, except
`scripts/app-boundaries-parser.mjs` (parser API; RFC amendment 2026-10-12)". It is held by the allowlist copy
`scripts/app-dependency-allowlist.json` (the `typescript` row admits that one path), by `parseWhereCell` in
`scripts/verify-app-dependencies.mjs` (the "nowhere, except" form admits single backticked files only), and by
`checkBoundaries` and `checkRepositoryImports` in `scripts/app-boundaries.mjs`, which fail an import of `typescript`
anywhere else in the repository; the tests are in `test-kits/app-boundaries.test.mjs`,
`test-kits/app-dependencies.test.mjs` and `test-kits/app-stack.test.mjs`. This answers the question §3 (b) left open:
the parsed reader's use of `typescript` is no longer A0's reading of "ไม่มี dependency" but the Owner's decision.

The press direction (§3 (c)) covers this amendment, as the option's description says
(`ใน PR skeleton เดียวกัน และ A0 กดได้เมื่อ 4 role ผ่าน`), **in this skeleton pull request only**: A0 may press it once C0,
A1, Q0 and R0 have passed on its final head and CI is green on it, with RFC-2026-025 §5 item 6's other conditions kept. If the widening travels on
its own, or any further widening of a §3 cell is proposed, A0 asks again.

**(b) The `application` required check.** After #257 merges, A0 adds the `application` job to the required status
checks of `main`'s branch protection through `gh api`, once, changing nothing else in branch protection, and records the
command and the before and after state in this package's evidence. Until then GitHub can merge a head whose
`application` job is red, so A0 presses #257 only with that job green on its final head (§3 (c), "CI is green on it").
A0's reading, not the Owner's words: "ไม่แตะค่าอื่น" means the other required checks, the review rules and every other
protection setting stay as they are, so the call adds one context to the existing list rather than replacing the
protection object.
