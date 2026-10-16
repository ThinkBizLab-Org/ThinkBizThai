# Product Owner disposition — the platform-kernel deletion gap, A1-280-1 / Q0-280-1 (2026-10-17, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author), drafted by an author subagent of that run, on `WP-0A-DB-00`, the
package that owns `test-kits/db/foundation-contract.test.mjs` (`ownership.writable_paths`: `test-kits/db/**`). The
paragraph, the question and the answer below are copied by script from the raw transcript of session `325454ab`
(`~/.claude/projects/-Users-bank-ThinkBizThai/325454ab-eb14-4597-afd3-75b6b8c78ee8.jsonl`, lines 5264 and 5268) and
checked byte for byte against them by script. Times are the transcript's stamps (UTC), not a clock read. Everything
marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of A0's reading of them: it is
not a role verdict, approves nothing, and moves no status on A0's behalf.

## 1. Why it was asked

- `main` is at `c2979b28` (PR #280). Since PR #265 (commit `ca8fde5f`), RFC-2026-007 Amendment 2026-10-13 §C test 2 in
  `test-kits/db/foundation-contract.test.mjs` accepts each of the three platform-kernel files as present or absent.
  RFC-2026-007 §F item 4 (added by #280) records it: "A platform-kernel file that leaves after it was created does not
  fail test 2 now".
- **A1-280-1** (Low, integrity; `evidence/WP-0A-A0-004/a1-review-2026-10-16-pr280.md` §4) and **Q0-280-1** (Low;
  `evidence/WP-0A-A0-004/q0-review-2026-10-16-pr280.md` §4) measured it: deleting `src/modules/platform-kernel/index.ts`,
  `src/modules/platform-kernel/application/run.ts`, or both, leaves test 2 green, and with their tests deleted too the
  whole `bootstrap` check passes (843/843). The Owner's answer for #280 barred a test change there.
- The fix changes a test of the classifier's string-name exceptions, so it is governance (RFC-2026-034 §2.2: "any test
  whose subject is a governance path (for example the classifier's pins in `test-kits/db/foundation-contract.test.mjs`)"),
  which RFC-2026-025 §5 item 6's last bullet has the Owner merge personally. A0 asked, before the pull request existed.

## 2. A0's recommendation and the Owner's answer (verbatim)

A0's message at 2026-10-16T16:39:12Z (`2026-10-16T16:39:12.653Z`, transcript line 5264), the paragraph on A1-280-1,
whole:

```text
**มีเรื่องใหม่ที่ต้องให้คุณตัดสิน 1 ข้อ (A1-280-1, Low):** ตั้งแต่ #265 ถ้ามี PR ลบ `index.ts`/`run.ts` ของ platform-kernel พร้อม test ของมัน suite จะยังผ่าน และ PR นั้นจะอยู่ใน lane risk (A1 และ Q0 ยังต้องอ่าน) ต้นเหตุคือ guard test ที่ผมแก้ใน #265 ซึ่งยอมรับทั้งกรณีมีไฟล์และไม่มีไฟล์ การแก้ต้องแตะ guard test จึงต้องได้คำสั่งจากคุณ ผมแนะนำให้เปิด PR แก้ test ให้ไฟล์ที่สร้างแล้วต้องมีอยู่ และให้ A0 กดเมื่อ 4 role ผ่าน
```

and its closing question:

```text
จะให้ทำ A1-280-1 ตามที่แนะนำไหมครับ
```

The Owner's answer at 2026-10-16T17:10:27Z (`2026-10-16T17:10:27.643Z`, transcript line 5268), the whole message:

```text
ตาแนะนำ
```

A0's translation of the paragraph: "One new item for you to decide (A1-280-1, Low): since #265, a PR that deletes
platform-kernel's `index.ts`/`run.ts` together with their tests still passes the suite, and that PR sits in the risk
lane (A1 and Q0 still read it). The cause is the guard test I changed in #265, which accepts the file both present and
absent. The fix has to touch a guard test, so it needs your direction. I recommend opening a PR that fixes the test so
that files already created must exist, and that A0 presses once the 4 roles pass." Of the question: "Shall I do
A1-280-1 as recommended?"

**A0's reading of the answer:** `ตาแนะนำ` is a typing slip for `ตามแนะนำ` ("as recommended"), one letter (`ม`) missing;
read as "yes, as recommended", the answer to the closing question. That reading is A0's: the Owner's text is
`ตาแนะนำ`, kept verbatim above.

## 3. What it directs (A0's reading, marked; a role may disagree)

Bounded to the recommendation the answer accepts:

1. **One pull request fixing the test so that created files must exist**
   ("เปิด PR แก้ test ให้ไฟล์ที่สร้างแล้วต้องมีอยู่"). This pull request, on `WP-0A-DB-00`'s branch `agent/claude/WP-0A-DB-00-batch-rfc-030-risk-tiered-review`, is
   it. §C test 2 (name unchanged) now pins the platform-kernel files created so far, `index.ts` and
   `application/run.ts`, as present: deleting either, or both, with or without their tests, fails test 2, as deleting
   any other named file (for example `vitest.config.ts`) already did. `adapters/job-store.ts`, not yet created, may
   still be absent; the pull request that creates it adds it to the pinned list.
2. **A0 presses once the four roles pass** ("ให้ A0 กดเมื่อ 4 role ผ่าน"): C0, A1, Q0 and R0 on the final head. A0
   reads it, as in every earlier governance press, together with CI green on both jobs (`bootstrap`, `application`) on
   that head and no security finding of any grade open against it; the words waive none of these.
3. **Nothing else.** No classifier change, no change to `STRING_NAME_EXCEPTIONS`, no other guard, no other test, no
   RFC edit (§F's gap statement is recorded as closed by this pull request in the manifest's `amends_without_owning`
   rationale, not in the RFC), no new dependency.

It is not a standing delegation: it names this one change by its content and no other governance pull request.
A0's reading.

## 4. RFC-2026-025 §5 item 6

Its third bullet reads: "The delegation must be given after the PR it names exists, or must name its sequence
explicitly." Its last bullet reads: "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is
merged by the Owner personally**, never by delegation."

1. **An exception to the last bullet, for this pull request only.** This pull request changes a test whose subject
   is a governance path, so the rule would have the Owner merge it personally. The recommendation the Owner accepted names
   A0 as the presser ("ให้ A0 กดเมื่อ 4 role ผ่าน"): an Owner-directed exception to the last bullet of the kind PR #270,
   PR #279 and PR #280 received (`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-15-governance-bundle-press.md`,
   `evidence/WP-0A-A0-004/product-owner-disposition-2026-10-16-ci-audit.md`,
   `evidence/WP-0A-A0-004/product-owner-disposition-2026-10-16-rfc007-wording.md`). It changes no rule.
2. **The third bullet, by naming the change before the pull request existed.** The answer was given at
   2026-10-16T17:10:27Z, before this pull request existed. The recommendation it accepts names the change by its
   content (the finding, A1-280-1; the file, the guard test changed in #265; the fix, created files must exist) and its
   shape (one PR, then A0's press after four roles). A0 reads that as naming the sequence explicitly.
3. **The other conditions are kept:** the head contains current `main` when pressed; no security finding of any grade
   is open against it; the Integration Owner's verdict (R0) is one of the four role passes; CI is green on both jobs on
   the final head.

## 5. What it does not decide

- Whether the test change is right or sufficient: that is C0's, A1's, Q0's and R0's reading of this pull request.
- Any change to the classifier, `STRING_NAME_EXCEPTIONS`, any other guard or test, or any rule of RFC-2026-007 or its
  amendments; §F's text stays as merged in #280.
- When or how WP-1A-A0-003 creates `adapters/job-store.ts`; only that the pull request that does adds it to the pinned
  list.
- `WP-0A-DB-00`'s status, which stays `in_review`; the Author moves it no further.
- The other open items A0's message listed (records of several packages, `shell:` in CI (A1-279-3), the `--omit=dev`
  wording, the second audit of RFC-2026-034): the answer is to the closing question on A1-280-1 only, on A0's reading.
