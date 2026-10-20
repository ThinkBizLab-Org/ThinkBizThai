# Product Owner disposition — Q-029-2 (which Cron fires the dispatcher) and who presses the RFC-2026-029 note that records it (2026-10-20, session `5ea77291`)

Recorded for A0 (`/claude/a0_atlas`, the Author) on WP-1A-A0-001, the package that owns
`architecture/decisions/RFC-2026-029-application-tier-stack.md`; drafted by a subagent of that run. Times are the session
transcript's stamps (UTC), not a clock read. The questions, headers, options, descriptions and answers below are copied
by script from the raw transcript records of session `5ea77291`
(`~/.claude/projects/-Users-bank-ThinkBizThai/5ea77291-c263-4dfc-83e9-1d395eee5e51.jsonl`), records (lines) 913, 914,
1341 and 1342, and checked byte for byte against them by script. Everything marked "A0's reading" is A0's, not the
Owner's. This is a record of the Owner's words and of A0's reading of them; it is not a role verdict and approves
nothing on A0's behalf.

## 1. Why it was asked

RFC-2026-029 §10 left Q-029-2 ("Which Cron fires the dispatcher") open, recommending Vercel Cron in the worker's project
so that the Cron's secret lives beside the worker credential, and naming `WP-1A-A0-004` as the package that decides it.
§2.8 says "The Cron's secret lives in the worker project's environment beside the worker credential, not in the web
project." `WP-1A-A0-006` now writes the dispatcher route (`work-packages/WP-1A-A0-006.json` `open_blockers[14]`, C0's
INFO from PR #304), so A0 asked the Owner which Cron fires it. After he chose Supabase Cron, the RFC's text no longer
matched the decision, and amending an RFC is a governance change that `RFC-2026-025` §5 item 6's last bullet has the
Owner merge personally; A0 asked how the RFC should record it and who presses that pull request.

## 2. Q-029-2 (verbatim)

Asked 2026-10-20T02:58:32Z (`2026-10-20T02:58:32.953Z`, transcript record 913, an `AskUserQuestion` tool call, tool use
id `toolu_012kiYSGkgvG7oxLMwudBgd6`), answered 2026-10-20T03:00:37Z (`2026-10-20T03:00:37.969Z`, record 914, its tool
result). Three questions in one call; the chosen labels are read from the tool result's structured `answers` and agree
with its own text. Questions 1 (header "Migration") and 2 (header "Deps + CI") concern `WP-1A-A0-006` and are recorded by
that package (`evidence/WP-1A-A0-006/product-owner-disposition-2026-10-20-deps-ci.md`); they are noted here only because
they were asked in the same call.

### Question 3 — header "Q-029-2"

**Q:** "Q-029-2: dispatcher จะให้ Cron ตัวไหนเรียก?"

- **Options shown:**
  - "Supabase Cron เรียก route ทุกนาที (Recommended)" — "ตาม D6 ในแผน 2026-10-08 Cron ระดับนาทีเรียก dispatcher route ที่ claim ด้วย lease และจำกัดเวลาต่อรอบ"
  - "Vercel Cron" — "ใช้ Cron ของ Vercel ที่ deploy แอป"
  - "ยังไม่ตัดสิน" — "ทำ adapter บน Postgres ก่อน แล้วค่อยตัดสินตอนทำ dispatcher"
- **A:** "Supabase Cron เรียก route ทุกนาที (Recommended)"

A0's translation: "Q-029-2: which Cron should call the dispatcher?" — chosen: "Supabase Cron calls the route every
minute" — "per D6 in the 2026-10-08 plan, a minute-level Cron calls the dispatcher route, which claims under a lease and
limits its time per round".

## 3. How the RFC records it, and who presses (verbatim)

Asked 2026-10-20T06:43:33Z (`2026-10-20T06:43:33.062Z`, record 1341, tool use id `toolu_01D5JQaqHZvyuu7L7JmmaAbJ`),
answered 2026-10-20T07:20:50Z (`2026-10-20T07:20:50.664Z`, record 1342). Two questions in one call. Question 1 (header
"Mig 175 กด") concerns `WP-1A-A0-006`'s migration pull request and is that package's record; it is noted here only
because it was asked in the same call.

### Question 2 — header "RFC Cron"

**Q:** "RFC-029 ยังเขียนว่าใช้ Vercel Cron และเก็บ secret ไว้ใน env ของ worker แต่คุณเลือก Supabase Cron จะให้ทำ RFC note อย่างไร?"

- **Options shown:**
  - "A0 เขียน note ต่อท้าย RFC-029 แล้วกดเองเมื่อ 4 role ผ่าน (Recommended)" — "เพิ่ม note ต่อท้าย RFC แบบไม่แก้ข้อความเดิม บันทึกว่าใช้ Supabase Cron และให้ A1 เสนอว่าใครถือ secret ที่ใช้เรียก dispatcher ทำก่อนเริ่ม increment ของ dispatcher"
  - "Owner กดเอง" — "A0 เขียน note และรัน 4 role ให้ครบ แล้วรอคุณกด merge เอง"
- **A:** "A0 เขียน note ต่อท้าย RFC-029 แล้วกดเองเมื่อ 4 role ผ่าน (Recommended)"

A0's translation of the question: "RFC-029 still says Vercel Cron is used and the secret is kept in the worker's env, but
you chose Supabase Cron; how should the RFC note be done?" Of the chosen option: "A0 writes a note appended to RFC-029
and presses it itself when the 4 roles pass" — "add a note at the end of the RFC without editing the existing text,
recording that Supabase Cron is used, and have A1 propose who holds the secret used to call the dispatcher, done before
the dispatcher increment begins".

## 4. What it directs

A0's reading, bounded to the chosen options' words:

1. **Q-029-2 is decided.** A once-a-minute Supabase Cron calls the dispatcher route. RFC-2026-029 §10's "Decided by
   `WP-1A-A0-004`" is read as decided by the Owner, owed under `WP-1A-A0-006`, which writes the route (C0-305-I4).
2. **The RFC records it as an appended, dated note** that edits no existing line ("แบบไม่แก้ข้อความเดิม"). The note
   says which sentences of §2.8 and §10 it supersedes and which of §2.8 stand.
3. **Who holds the caller's secret is not decided.** The option has A1 propose it, before the dispatcher increment
   begins. The note lists the realistic options neutrally (Supabase Vault with a `pg_net` header, a Supabase Edge
   Function relay, a signed short-lived token) and picks none. This package records it as an open blocker; A1's proposal
   and the decision come in their own record.
4. **A0 presses the pull request carrying the note** only after C0, A1, Q0 and R0 pass on its final head, CI is green on
   both jobs (`bootstrap`, `application`) on that head, the head contains current `main`, and no security finding of any
   grade is open against it. The words waive none of these.

## 5. RFC-2026-025 §5 item 6

Its last bullet has a pull request that changes governance (an RFC among them) merged by the Owner personally; its third
requires a delegation to be given after the pull request it names exists, or to name its sequence explicitly. A0's
reading: the Owner was shown "Owner กดเอง" ("the Owner presses it") and chose the option in which A0 presses, so this is
an Owner-directed exception to the last bullet for this one note, of the kind PR #285 received, not a standing
delegation. The answer was given before this pull request existed and names the change by its content and place ("note
ต่อท้าย RFC-029", recording Supabase Cron), which A0 reads as meeting the third bullet. The other conditions are kept.
Whether the answer covers A0 pressing this pull request is for the roles to judge on their reading.

## 6. What it does not decide

- Whether the note is right: that is C0's, A1's, Q0's and R0's reading of this pull request.
- Who holds the dispatcher's caller secret, how it is rotated, and who can read it: A1 proposes, decided before the
  dispatcher increment.
- D6's per-round time budget and the lease length: `WP-1A-A0-006` (`open_blockers[9]`).
- `WP-1A-A0-004`'s and `WP-1A-A0-006`'s own records of Q-029-2: each package's, not edited here.
- Questions 1 and 2 of the first call and question 1 of the second: recorded by `WP-1A-A0-006`.
- Provisioning the Cron job, the secret or the worker project: `WP-1A-A6-001`, when the worker is provisioned.
