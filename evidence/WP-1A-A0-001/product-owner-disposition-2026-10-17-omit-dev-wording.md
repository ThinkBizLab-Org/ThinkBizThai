# Product Owner disposition — who presses the pull request that records what CI's audit runs under RFC-2026-029 §4 item 6 (2026-10-17, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author) on WP-1A-A0-001, the package that owns
`architecture/decisions/RFC-2026-029-application-tier-stack.md`; drafted by a subagent of that run. Times are the session
transcript's stamps (UTC), not a clock read. The question, header, options, descriptions, answer and message below are
copied by script from the raw transcript records of session `325454ab`
(`~/.claude/projects/-Users-bank-ThinkBizThai/325454ab-eb14-4597-afd3-75b6b8c78ee8.jsonl`), lines 6128, 6137 and 6355,
and checked byte for byte against them by script. Everything marked "A0's reading" is A0's, not the Owner's. This is a
record of the Owner's words and of A0's reading of them; it is not a role verdict and approves nothing on A0's behalf.

## 1. Why it was asked

RFC-2026-029 §4 item 6 (the RFC calls it §4.6) proposes "a separate CI step running `npm audit --omit=dev
--audit-level=high`" for WP-1A-A0-002. That step was added with `--omit=dev` by PR #257 (WP-1A-A0-002, `40267ae9`) and
moved ahead of every step that runs package code by PR #270 (WP-0A-A0-004, `047385f8`). A1's review of #270 found that
`--omit=dev` leaves out the development dependencies that the `application` job runs first (A1-270-1, Low,
`evidence/WP-0A-A0-004/a1-review-2026-10-15-pr270.md`). PR #279 (WP-0A-A0-004, merged 2026-10-16T13:45:28Z as
`42b37f00`) changed the step to `npm audit --include=dev --audit-level=high` (`.github/workflows/ci.yml` line 1354 on
`main` at `6fd6aa0e`). Its disposition (`evidence/WP-0A-A0-004/product-owner-disposition-2026-10-16-ci-audit.md`, "What
it does not decide") names RFC-2026-029 §4.6's wording as outside that answer. So two texts still say `--omit=dev`:
RFC-2026-029 §4 item 6 and `work-packages/WP-1A-A0-002.json` (`acceptance_criteria[7]` and
`deterministic_commands.package_evidence[4]`). Bringing an RFC into line with CI is a governance change, which RFC-2026-025
§5 item 6's last bullet has the Owner merge personally. A0 asked who presses it.

## 2. The question, options shown and answer (verbatim)

Asked 2026-10-17T11:53:13Z (`2026-10-17T11:53:13.702Z`, transcript line 6128, an `AskUserQuestion` tool call, tool use
id `toolu_01DZR9JF1Tc9J8FW2qMqvf7D`), answered 2026-10-17T11:53:17Z (`2026-10-17T11:53:17.372Z`, transcript line 6137, its
tool result). Two questions in one call. The chosen labels are read from the tool result's structured `answers` and agree
with its own text.

Question 1 (header "#283 ใครกด") concerns PR #283 (WP-0A-A0-004), not this pull request; the Owner chose "A0 กดเมื่อ 4 role ผ่าน (Recommended)". It is
recorded in full by WP-0A-A0-004 (`evidence/WP-0A-A0-004/product-owner-disposition-2026-10-17-rfc-007-f-note.md`) and is
noted here only because it was asked in the same call.

### Question 2 — header "gov ที่เหลือ"

**Q:** "ต่อจากนี้ PR governance ที่เหลือ (ปิดช่องว่างในเทสต์ CI: A1-279-3 `shell:` และ Q0-279r2-2 `$GITHUB_ENV` · แก้ถ้อยคำ `--omit=dev` ใน RFC-029 §4.6 และ WP-1A-A0-002) จะให้ใครกด?"

- **Options shown:**
  - "A0 กดทีละ PR เมื่อ 4 role ผ่าน (Recommended)" — "แต่ละ PR ต้องผ่าน C0, A1, Q0 และ R0 บน head สุดท้าย และ CI เขียวทั้ง 2 job · ถ้ามี security finding ค้างจะไม่กด"
  - "ผมกดเองทุกตัว" — "A0 เตรียมให้ 4 role ผ่านแล้วรอคุณกด"
  - "ยังไม่ต้องทำ" — "ทำแค่ records และ audit ไปก่อน"
- **A:** "A0 กดทีละ PR เมื่อ 4 role ผ่าน (Recommended)"

The chosen option's description, verbatim: "แต่ละ PR ต้องผ่าน C0, A1, Q0 และ R0 บน head สุดท้าย และ CI เขียวทั้ง 2 job · ถ้ามี security finding ค้างจะไม่กด"

A0's translation of question 2: "From here on, who presses the remaining governance PRs (closing the gaps in the CI tests:
A1-279-3 `shell:` and Q0-279r2-2 `$GITHUB_ENV` · correcting the `--omit=dev` wording in RFC-029 §4.6 and WP-1A-A0-002)?"
Of the chosen option: "A0 presses one PR at a time when the 4 roles pass" — "each PR must pass C0, A1, Q0 and R0 on the
final head and CI green on both jobs · if a security finding is left open, it is not pressed".

## 3. The Owner's later message (verbatim)

At 2026-10-17T12:24:40Z (`2026-10-17T12:24:40.564Z`, transcript line 6355, a user message; line 6353 is the queue entry
of the same text, `2026-10-17T12:24:40.449Z`), the whole message:

> ลุยต่อเลย ไม่ต้องหยุดถาม

A0's translation: "press on, no need to stop and ask". A0's reading: it tells A0 to carry on with the work in hand without
stopping for further questions. It directs no particular pull request and widens no answer of §2: who presses this pull
request rests on question 2, within that question's bounds.

## 4. What it directs

A0's reading of the answer to question 2, bounded to the chosen option's description:

1. **This pull request is one of the items it names.** Question 2 names, by content, "the `--omit=dev` wording in RFC-029
   §4.6 and WP-1A-A0-002". This pull request carries the RFC half: a dated note under RFC-2026-029 §4 item 6 that records
   what CI runs, citing PR #279 and A1-270-1. The original sentence is kept as written; the note is appended after it.
   No rule, threshold, CI step, guard or test changes.
2. **One pull request at a time, each package its own.** WP-1A-A0-001's `writable_paths` do not include
   `work-packages/WP-1A-A0-002.json`, so the two manifest strings are corrected by a separate pull request of
   WP-1A-A0-002, recorded again by that package. A0 reads "ทีละ PR" ("one PR at a time") as allowing the one named item
   to be carried by two pull requests, one per owning package, each pressed on its own four roles and CI.
3. **A0 presses this pull request** only after C0, A1, Q0 and R0 pass on its final head, CI is green on both jobs
   (`bootstrap`, `application`) on that head, and no security finding of any grade is open against it. The words waive
   none of these.

It is not a standing delegation: it names the remaining governance items by their content and no other governance pull
request. A0's reading.

## 5. RFC-2026-025 §5 item 6

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or
a gate) is merged by the Owner personally**, never by delegation" (a line break of the source removed). This pull request amends an RFC, so it is governance by
that bullet (and the base's classifier prints its lane as governance). A0's reading of the Owner's answer against both
bullets:

1. **An exception to the last bullet, for the items question 2 names.** The Owner was shown "ผมกดเองทุกตัว" ("I press
   every one myself") and "ยังไม่ต้องทำ" ("not yet"), and chose the option in which A0 presses, one pull request at a
   time. That is an Owner-directed exception of the kind PR #211, PR #212, the lane-walk fix, PR #270 and PR #279
   received, not a standing delegation.
2. **The third bullet, by naming the item before the pull request existed.** The answer was given at
   2026-10-17T11:53:17Z, before this pull request existed. The question names the change by its content and its place
   ("แก้ถ้อยคำ `--omit=dev` ใน RFC-029 §4.6 และ WP-1A-A0-002"), and the chosen option names its shape ("ทีละ PR"). A0
   reads that as naming the sequence explicitly.
3. **The other conditions are kept:** the head contains current `main` when pressed (the first bullet), no security
   finding of any grade is open against it (the second), the Integration Owner's verdict (the fourth, R0 among the four
   roles), C0, A1, Q0 and R0 pass on the final head, and CI is green on both jobs there.

Whether the answer covers A0 pressing this pull request is for the roles to judge on their reading.

## 6. What it does not decide

- Whether the note is right: that is C0's, A1's, Q0's and R0's reading of this pull request.
- The correction of `work-packages/WP-1A-A0-002.json` `acceptance_criteria[7]` and
  `deterministic_commands.package_evidence[4]`: WP-1A-A0-002's own pull request, recorded by that package.
- The CI-test gaps A1-279-3 and Q0-279r2-2, the other items of question 2: each in its own pull request of the package
  that owns it.
- Question 1 (PR #283): recorded by WP-0A-A0-004.
- Any other wording of RFC-2026-029, its status line, or anything WP-1A-A0-001's `open_blockers` record.
