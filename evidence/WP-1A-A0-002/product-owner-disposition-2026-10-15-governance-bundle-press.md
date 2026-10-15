# Product Owner disposition — who presses the governance bundle's items (3) and (4), the src/** pin and the build guard's three untested safeguards (2026-10-15 UTC, session `325454ab`)

Recorded by A0 (`/claude/a0_atlas`), drafted by an author subagent of that run, on `WP-1A-A0-002`, whose guard tests
(`test-kits/app-stack.test.mjs`, `test-kits/app-boundaries.test.mjs`) both items change. The question, its header, every
option shown with its description, and the answer below are copied by script from the question-tool record of session
`325454ab` (transcript lines 1631 and 1632) and compared with it byte for byte; the times are the transcript's stamps
(UTC), not a clock read. This is a record of the Owner's words and of A0's reading of them. It is not a role verdict,
approves nothing, and moves no status on A0's behalf.

## 1. Where things stood

- This pull request was cut from `main` at `94c858f0` (PR #264) and rebased, before it was pushed, onto `14716adf`
  (PR #265). Two findings against this package's guards were open and owed to a governance
  pull request:
  - **Q0-259-1** (Low; `evidence/WP-1A-A0-003/q0-review-2026-10-13-pr259.md` §6–§7, on `main` since PR #259): no test or
    guard holds that `tsconfig.json`'s `include` reads `src/**/*.ts` and `src/**/*.tsx`; Q0's mutations M1–M3 (both
    patterns removed, `src/**` excluded, the `.tsx` pattern alone removed) passed every suite and guard. Re-measured in
    the round audit as **Q0-AUD1015-5** (`evidence/audits/2026-10-15/q0-audit.md` §5): with the patterns removed,
    `tsc --listFiles` checks none of the 16 files under `src/modules/`.
  - **Q0-257r6-1** (Low; `evidence/WP-1A-A0-002/q0-reread5-2026-10-12-pr257.md` §5 and §7): three safeguards of the
    build guard fail no test when hollowed: (a) `runBuildControls` (Q0's M200), (b) the boundary CLI's rule that its two
    readers agree (M176, M177), (c) the rule against a call in next.config and postcss.config (M142). The Owner left it
    to a follow-up pull request on 2026-10-12T15:19:55Z (`(2) ทำต่อทีหลัง`; this package's disposition
    `product-owner-disposition-2026-10-12-skeleton-licences.md` §7–§8); carried in the round audit as **Q0-AUD1015-4**.
- Both fixes add test cases to guard tests, which RFC-2026-034 §2.2 names as governance ("any test whose subject is a
  governance path"), and raise `scripts/test-suite-contract.mjs`'s floors and name digests for those two suites.

## 2. Question, options shown and answer (verbatim)

Asked 2026-10-15T02:09:48.811Z, answered 2026-10-15T02:13:35.293Z, through the session's question tool, as one call of two
questions. **Question 1** (header "guard test") concerns PR #265 (`WP-1A-A0-003`'s PR-2) and is not this pull request's
authority; it is not transcribed here. **Question 2** is.

### 2.1 Question 2

**Header:** "ชุด governance"

**Q:** "งาน governance ที่คำสั่งเดิมไม่ครอบคลุม (ชุดข้อ 4): (1) A1-AUD1015-1 ย้าย npm audit/verify-release-age ใน CI ไปก่อนรันโค้ด package (2) แก้ audit lane ให้ผ่าน guard handoff ได้ (3) Q0-259-1 pin src/** ใน app-stack.test (4) Q0-257r6-1 test 3 จุด (5) status-line RFC-034 §8 item 3 — ใครกด?"

- **Options shown** (single choice):
  - "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)" — "เฉพาะ 5 เรื่องนี้ · แต่ละ PR 4 role + CI เขียว 2 job + ไม่มี security finding ค้าง · ไม่รวม dependency ใหม่"
  - "A0 เตรียม, ผมกดเอง" — "A0 เปิด PR + 4 role แล้วส่งคำสั่ง merge ให้คุณทีละ PR"
  - "ยังไม่ทำตอนนี้" — "บันทึกไว้เป็นงานค้าง ทำหลัง PR-2"
- **A:** "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)"

## 3. What the answer directs (A0's reading, marked; a role may disagree)

**(a) Who presses.** For each of the five items the question lists, one pull request at a time, A0 may press the merge
once C0, A1, Q0 and R0 have passed on its final head, CI is green on it on both jobs (`bootstrap` and `application`),
and no security finding of any grade is open against it; and the pull request adds no dependency. The Owner may still
press it himself.

**(b) This pull request is items (3) and (4) only.** Item (3) is "Q0-259-1 pin src/** ใน app-stack.test" and item (4)
is "Q0-257r6-1 test 3 จุด". This pull request, on `WP-1A-A0-002`'s branch `agent/claude/WP-1A-A0-002-skeleton`, carries
both and nothing of items (1), (2) or (5). **A0's reading, which a role may not share:** "ทีละ PR" ("one PR at a time")
is read as each pull request pressed on its own, after its own four role passes, not as forbidding two items in one pull
request. Items (3) and (4) are both new test cases in the same package's two guard test files, with the registry lines
those tests need, and change no guard's behaviour; A0 carries them together. If a role reads "ทีละ PR" as one item per
pull request, the two split, and each stays under these words.

**(c) What it does not reach.** Anything outside the five items; a new dependency (`package.json`, any lockfile,
`scripts/app-dependency-allowlist.json`); and, on A0's reading, any change to a guard's behaviour, to CI (`.github/**`),
to an RFC or to a classifier for items (3) and (4), since none is needed for them. This pull request changes no guard
script and no configuration it tests: `scripts/verify-app-build-graph.mjs`, `scripts/verify-app-boundaries.mjs`,
`scripts/app-boundaries.mjs` and `tsconfig.json` are unchanged. Its only script edit is
`scripts/test-suite-contract.mjs`'s counts and digests for the two suites (a raised floor and a changed name digest with
no test removed or renamed).

## 4. RFC-2026-025 §5 item 6

Its third bullet reads: "The delegation must be given after the PR it names exists, or must name its sequence
explicitly." Its last bullet reads: "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is
merged by the Owner personally**, never by delegation."

- **Last bullet.** This pull request changes guard tests CI runs, a governance path under RFC-2026-034 §2.2, so the rule
  would have the Owner merge it personally. The answer above is the Owner's own direction that A0 presses it on the
  stated conditions: an Owner-directed exception to the last bullet for this pull request, of the same kind as PR #211's
  and the 2026-10-08 direction §10.2, given in the Owner's words. It changes no rule.
- **Third bullet.** The answer was given before this pull request existed. A0 reads the bullet's second branch as met:
  the question named the items ("(3) Q0-259-1 pin src/** ใน app-stack.test", "(4) Q0-257r6-1 test 3 จุด") and their
  sequence ("ทีละ PR") before the pull request was opened.
- **The other conditions are kept.** The head contains current `main` when pressed; no unresolved security finding of
  any grade is open against it; the Integration Owner's verdict (R0) is required, and is one of the four role passes in
  §3 (a); CI is green on both jobs on the final head.

## 5. What these words do not do

- They do not move `WP-1A-A0-002`'s status, which stays `in_review`; the Author moves it no further.
- They do not amend RFC-2026-025, RFC-2026-029, RFC-2026-034 or `CONTRIBUTING_AGENTS.md`.
- They do not decide whether the new tests close Q0-259-1, Q0-AUD1015-5, Q0-257r6-1 or Q0-AUD1015-4: that is Q0's to
  write, and C0's, A1's and R0's to read.
- They do not decide items (1), (2) or (5) beyond who presses each one's own pull request, and they do not decide
  PR #265 (question 1).
