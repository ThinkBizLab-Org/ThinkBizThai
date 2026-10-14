# Product Owner disposition — the lane walk and the TypeScript files of PR #257 (2026-10-13, session `c2816eec`)

Recorded for A0 (`/claude/a0_atlas`, the Author) on WP-0A-A0-004, the package whose PR #255 amended
`scripts/db/classify-review-tier.mjs` (WP-0A-DB-00's file) with the lane and its import walk; this record follows #255's
precedent and sits in that package's evidence. Times are the session transcript's stamps (UTC), not a clock read. The
question, header, options, descriptions and answers below are copied from the raw transcript records of the call and its
result (the session's question tool, tool use `toolu_01BLRuRYwq7keX5RoNYuEKXx`). Everything marked "A0's reading" is A0's,
not the Owner's.

## Why it was asked

On main `40267ae9` (the merge of PR #257) A0 measured a one-file diff adding
`evidence/WP-1A-A0-002/records-transcription-probe.md`: `tier: records`, but `lane: governance`, with 26 reasons of the
form `governance: "test-kits/app-stack.test.mjs" names "apps/web/next.config.ts", which resolves to
"apps/web/next.config.ts", code node can run and the walk cannot read (fail closed)`. PR #257 added guards and guard tests
that name the application's `.ts` and `.tsx` files by strings (read as text, listed as paths, or handed to `tsc`), and the
lane's string rule (RFC-2026-007 Amendment 2026-10-11 §B) makes each such mention a problem, so every pull request prints
governance and RFC-2026-034's records, fast and risk lanes are not reached.

## Question, options shown and answers (verbatim)

Asked 2026-10-12T20:24:47Z (`2026-10-12T20:24:47.782Z`), answered 2026-10-12T20:28:22Z (`2026-10-12T20:28:22.054Z`),
through the session's question tool. Two questions in one call.

### Question 1 — header "Role model"

**Q:** "โควตา Opus ของ subagent หมดถึง 18 ต.ค. ส่วน Sonnet ยังใช้ได้ จะให้ role (C0/A1/Q0/R0) อ่าน PR ด้วยอะไรช่วงนี้?"

- **Options shown:**
  - "ใช้ Sonnet อ่านไปก่อน (Recommended)" — "งานเดินต่อได้ทันที · ระบุชื่อ model ไว้ในไฟล์ role ทุกไฟล์ · PR โค้ดใหญ่ (PR-1 tenant context) ให้ Opus อ่านซ้ำหลัง 18 ต.ค. ก่อน merge"
  - "ใช้ Sonnet เฉพาะ records/PR เล็ก" — "#258, PR-G และ PR แก้ตัวจัดเลน ใช้ Sonnet · PR โค้ดรอ Opus หลัง 18 ต.ค."
  - "รอ Opus ถึง 18 ต.ค." — "ไม่มี role อ่านเลยจนถึงวันนั้น · ผมเตรียมโค้ดไว้ก่อนได้แต่ merge ไม่ได้"
- **A:** "limit ผมกด reset ไปแล้ว  opus ลุยต่อได้"

The Owner's first answer in this call was not one of the options shown: it was typed (two spaces between `แล้ว` and
`opus` are the Owner's). A0's reading: role runs continue on Opus.

### Question 2 — header "Lane fix"

**Q:** "ตัวจัดเลนตอนนี้ตีทุก PR เป็น governance (ไล่ import ไปเจอชื่อไฟล์ .ts ที่ #257 เพิ่ม แล้วอ่านไม่ได้) จะให้ทำอย่างไร?"

- **Options shown:**
  - "เปิด PR แก้ + A0 กดได้เมื่อ 4 role ผ่าน (Recommended)" — "ใส่รายการยกเว้นแบบระบุคู่ (ไฟล์ test → ไฟล์ .ts ที่มันอ่านเป็นข้อความ) พร้อม test ยึด · ระหว่างรอ PR ไหนเป็น governance ก็ใช้ 4 role ไปก่อน · #258 ให้ A0 กดเมื่อ 4 role ผ่าน"
  - "เปิด PR แก้ แต่ผมกดเอง" — "PR แก้ตัวจัดเลน และ #258 ผมกด merge เอง"
  - "ปล่อยไว้ก่อน" — "ทุก PR ใช้ 4 role และคุณกดเองจนกว่าจะสั่งใหม่"
- **A:** "เปิด PR แก้ + A0 กดได้เมื่อ 4 role ผ่าน (Recommended)"

A0's translation of the chosen option and its description: "Open a fix PR, and A0 may press it once the four roles
pass" — "put in an exception list by named pairs (test file → the .ts file it reads as text), with tests that pin it;
meanwhile any PR that is governance takes the four roles; A0 presses #258 once the four roles pass".

## What it directs

A0's reading of the answer to question 2, for these two pull requests only:

1. A0 opens the fix pull request (this branch, `agent/claude/WP-0A-A0-004-ci-independent-guard-step`): an exact,
   named-pair exception list in the classifier's string rule, with tests that pin it (RFC-2026-007 Amendment
   2026-10-13).
2. A0 presses THIS fix pull request, and PR #258 (`docs(evidence): records of PR #257 after its merge (WP-1A-A0-002)`),
   each only after C0, A1, Q0 and R0 pass on its final head and CI is green there. The words do not waive any role
   verdict, the green bootstrap on the final head, or RFC-2026-025 §5 item 6's bar on pressing while a security finding
   of any grade is open against the pull request. PR #258 was pressed under these words at 2026-10-12T21:06:31Z
   (merge `5d8f8fd4`, by the GitHub account A0 runs under, `workstationgroup`), after its four roles passed; that press
   is done, and only this fix pull request remains under item 2.
3. Until the fix is merged, every pull request the lane prints as governance takes the four roles. The fix changes what
   the base's classifier prints only from the first pull request whose base carries it (RFC-2026-030 §4: CI runs the
   base's copy), so this pull request itself, and every pull request opened on a base without it, still prints
   governance.

It is not a standing delegation: it names this fix and #258, and no later governance pull request. A0's reading.

## RFC-2026-025 §5 item 6 (added after C0-260-1)

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or
a gate) is merged by the Owner personally**, never by delegation". This fix pull request changes an RFC and the lane
classifier, so it is governance by that bullet. A0's reading of the Owner's answer against both bullets:

1. **An exception to the last bullet, for this pull request (and #258) only.** The Owner was shown
   `เปิด PR แก้ แต่ผมกดเอง` ("open the fix PR, but I press it myself") and `ปล่อยไว้ก่อน`, and chose the option in which A0
   presses. That is an Owner-directed exception to the last bullet of the kind PR #211 and PR #212 received (this
   package's `required_human_authorities`, the INCREMENT 2026-10-08 entry), not a standing delegation.
2. **The third bullet, by naming the sequence.** The answer was given at 2026-10-12T20:28:22Z, before this pull request
   existed (it was created 2026-10-14T08:52:10Z). The chosen option names it by its content before it existed:
   "เปิด PR แก้" ("open the fix PR") for the lane printing governance on every pull request, with
   `ใส่รายการยกเว้นแบบระบุคู่ (ไฟล์ test → ไฟล์ .ts ที่มันอ่านเป็นข้อความ) พร้อม test ยึด` as what it holds. A0 reads that as
   naming the sequence explicitly: one fix pull request for that defect, of that shape.
3. **The other conditions are kept:** the head contains current `main` when pressed (the first bullet), no security
   finding of any grade is open against it, C0, A1, Q0 and R0 pass on the final head, and CI is green on both jobs
   (`bootstrap`, `application`) on that head.

## The list against the option's words (added after C0-260-2)

The option's description says "ไฟล์ test → ไฟล์ .ts ที่มันอ่านเป็นข้อความ" ("test file → the .ts file it reads as text").
The list is wider in form, and that is A0's reading of the option, not the Owner's words: it also names namers that are
not test files (four guard scripts and the classifier itself: 20 of the 48 pairs), uses that are data but not reading as
text (keys of synthetic trees, paths listed or compared, a project handed to `tsc`, which compiles and runs nothing),
and six pairs for platform-kernel files that do not exist yet (R0-259-1). A0 reads "as text" as "as data, not as code
that runs", which is what the fix needs to reach the lanes (RFC-2026-007 Amendment 2026-10-13 §A–§B). A1 judged on this
pull request that every listed use is data (`evidence/WP-0A-A0-004/a1-review-2026-10-14-pr260.md`).

## What it does not decide

- Whether the exception list is right: that is C0's, A1's, Q0's and R0's reading of this pull request.
- Anything about the role model beyond "role runs continue on Opus" (question 1).
- The disposition of RFC-2026-007 Amendment 2026-10-06, which stays OWED (WP-0A-A0-004 `required_human_authorities`).
