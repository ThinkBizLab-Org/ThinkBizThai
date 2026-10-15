# Product Owner disposition — who presses the pull request that creates platform-kernel's `index.ts` and `run.ts` (2026-10-14 UTC, session `325454ab`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run, on 2026-10-15. The question, its header, every
option shown with its description, and the answer below are copied by script, byte for byte, from the raw transcript
records of the call and its result (session `325454ab-eb14-4597-afd3-75b6b8c78ee8`, the session's question tool, tool use
`toolu_018Q8bh32CmxtXAA8JURAVSZ`, records 964 and 965 of the transcript file); the copy was checked by script after this file was written.
The times are the transcript's stamps (UTC), not a clock read. Everything marked "A0's reading" is A0's, not the Owner's.
This is a record of the Owner's words and of A0's reading of them. It is not a role verdict and approves nothing on A0's
behalf.

## 1. Where things stood

- `main` was at `2aef8182`: PR #261, `WP-1A-A0-003`'s PR-1 (the pure-TypeScript `domain/**` and `application/**`), merged
  at 2026-10-14T12:55:51Z, pressed by A0 under the manifest's `required_human_authorities[1]` (risk-lane code
  increments). PR #259 (PR-G) had merged at 2026-10-14T09:20:11Z (`e69fc87b`).
- The manifest's `open_blockers` entry "PR-1 DEFERRALS" deferred two files to a later pull request of the package:
  `src/modules/platform-kernel/index.ts`, the module's public surface, and `src/modules/platform-kernel/application/run.ts`,
  the runner that turns any thrown value into an internal-error envelope carrying none of its text. Both are named by a
  string in a guard's fixture (`scripts/verify-app-boundaries.mjs`, `test-kits/app-boundaries.test.mjs`), so under
  RFC-2026-007 Amendment 2026-10-13 §B items 1 and 5 a pull request that creates or edits either is governance,
  whatever is on `main`; the `STRING_NAME_EXCEPTIONS` pairs keep only later pull requests out of governance.
- Neither `required_human_authorities` entry reached that press (R0-261-2, recorded in the same entry): [0] reaches only
  a pull request that is governance because it creates the package's manifest, its `tsconfig.json` include or its branch
  row; [1] only risk-lane code increments. RFC-2026-025 §5 item 6's last bullet would leave it to the Owner personally
  (§4 below). So A0 asked, 47 seconds after #261 merged.

## 2. Question, options shown and answer (verbatim)

Asked 2026-10-14T12:56:38Z (`2026-10-14T12:56:38.893Z`), answered 2026-10-14T13:01:02Z (`2026-10-14T13:01:02.884Z`),
through the session's question tool, as one call of one question, single choice.

### Header "กด PR ถัดไป"

**Q:** "PR ถัดไปของ WP-1A-A0-003 คือ index.ts (public surface ของ module) + runner (แปลง error ที่โยนมาเป็น internal-error envelope) — เป็น governance ถาวรเพราะ guard อ้างชื่อไฟล์ใน fixture และไม่มีคำสั่งเดิมครอบคลุมการกด ใครกด merge?"

- **Options shown:**
  - "A0 กดได้เมื่อ 4 role ผ่าน (Recommended)" — "เฉพาะ PR ที่สร้าง index.ts/run.ts ของ platform-kernel ตามแผน WP-1A-A0-003 · ไม่รวม dependency, CI, guard, RFC · CI เขียว 2 job + ไม่มี security finding ค้าง"
  - "A0 กดได้เฉพาะ PR นี้" — "PR เดียว ครั้งหน้า (เช่น adapters/job-store.ts) ถามใหม่"
  - "ผมกดเอง" — "A0 เตรียม PR + 4 role แล้วส่งคำสั่ง merge ให้คุณ"
- **A:** "A0 กดได้เมื่อ 4 role ผ่าน (Recommended)"

A0's translation (A0's reading, not the Owner's words). The question: "The next PR of WP-1A-A0-003 is index.ts (the
module's public surface) + the runner (turns a thrown error into an internal-error envelope). It is permanently
governance because a guard names the files in a fixture, and no existing direction covers the press. Who presses the
merge?" The options: "A0 may press once the 4 roles pass (Recommended)" — "only the PR that creates platform-kernel's
index.ts/run.ts per the WP-1A-A0-003 plan · not dependency, CI, guard, RFC · CI green on 2 jobs + no security finding
outstanding"; "A0 may press this PR only" — "one PR; next time (e.g. adapters/job-store.ts) ask again"; "I press it
myself" — "A0 prepares the PR + 4 roles, then sends me the merge command". The answer is the first option.

## 3. What it directs (A0's reading)

**(a) Who presses.** A0 may press the pull request of `WP-1A-A0-003` that creates `src/modules/platform-kernel/index.ts`
and `src/modules/platform-kernel/application/run.ts` (PR-2, branch `agent/claude/WP-1A-A0-003-tenant-envelope`), once
all of these hold on its final head:

1. C0, A1, Q0 and R0 have each passed it ("4 role ผ่าน");
2. CI is green on both jobs, `bootstrap` and `application` ("CI เขียว 2 job");
3. no security finding of any grade is open against it ("ไม่มี security finding ค้าง"; RFC-2026-025 §5 item 6's second
   bullet says the same);
4. the head contains current `main` (§5 item 6's first bullet, kept: §4 below).

The Owner may still press it himself.

**(b) Scope, bounded by the option's description.** "เฉพาะ PR ที่สร้าง index.ts/run.ts ของ platform-kernel ตามแผน
WP-1A-A0-003" ("only the PR that creates platform-kernel's index.ts/run.ts per the WP-1A-A0-003 plan"). A0 reads it as
reaching that one pull request and its fix commits before the press, and nothing else:

- not a later pull request that edits `index.ts` or `run.ts` once they exist (it is governance too, by §B item 1, but
  it does not create them);
- not `adapters/**`, `adapters/job-store.ts` included, nor the provider-bound increment. The second option named
  `adapters/job-store.ts` as a next press to ask about again; the chosen option does not say "ask again", but its
  description names only the pull request that creates `index.ts`/`run.ts`, and A0 takes the narrower words as the
  bound. A later pull request outside it is asked again;
- not another package's pull request.

**(c) What it never reaches.** "ไม่รวม dependency, CI, guard, RFC" ("not dependency, CI, guard, RFC"): a dependency
(`package.json`, any lockfile, `scripts/app-dependency-allowlist.json`); CI (`.github/**`); a guard or runner, its data
or allowlists, either classifier (its `STRING_NAME_EXCEPTIONS` included); an RFC (`architecture/decisions/**`); and,
as in the 2026-10-12 direction, `CONTRIBUTING_AGENTS.md`. A pull request carrying any of these is outside this
direction even if it also creates `index.ts` or `run.ts`.

**(d) No lane is lowered.** The pull request is still governance and is read by all four roles.

## 4. RFC-2026-025 §5 item 6

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or
a gate) is merged by the Owner personally**, never by delegation". A0's reading of the Owner's answer against both:

1. **An Owner-directed exception to the last bullet, for this pull request only.** The pull request is governance (a
   file a guard's fixture names, RFC-2026-007 Amendment 2026-10-13 §B item 1), so the last bullet would leave it to the
   Owner. The Owner was shown "ผมกดเอง" ("I press it myself") and chose the option in which A0 presses. That is an
   exception of the kind PR #211, PR #212, the 2026-10-08 direction §10.2, the 2026-10-12 direction of PR-G and the lane
   fix (`evidence/WP-0A-A0-004/product-owner-disposition-2026-10-13-lane-walk-ts.md`) received, given in the Owner's own
   words; it changes no rule.
2. **The third bullet, met by naming the pull request before it existed.** The answer was given at
   2026-10-14T13:01:02Z; this pull request did not exist then. The question named its content: "index.ts (public surface
   ของ module) + runner (แปลง error ที่โยนมาเป็น internal-error envelope)", and the chosen option named which pull
   request: "เฉพาะ PR ที่สร้าง index.ts/run.ts ของ platform-kernel ตามแผน WP-1A-A0-003". A0 reads that as naming the
   sequence explicitly: the one pull request of this package that creates those two files.
3. **The other conditions are kept:** the head contains current `main` when pressed (the first bullet); no security
   finding of any grade is open against it (the second); C0, A1, Q0 and R0 pass on the final head; CI is green on both
   jobs (`bootstrap`, `application`) on that head. The Integration Owner's verdict that moves the package past
   `in_review` is still R0's (the fourth bullet; the manifest's last acceptance criterion keeps the package short of
   `integration_verified` until the provider-bound increment).

## 5. What it does not decide

- Whether the pull request's code and records are right: that is C0's, A1's, Q0's and R0's reading of it.
- The package's status. The Author moves `WP-1A-A0-003` to `in_review` and no further.
- Anything about `adapters/**` or the provider-bound increment (Supabase session, supabase-js with the user's JWT, the
  RFC-2026-029 §8/7 cookies, the real directory adapter, composition wiring), which stays in `scope.exclude` until the
  manifest amendment that brings it in; nor the contract questions in `open_blockers` (Q1–Q8).
- Any change to `required_human_authorities[0]` or [1]: each keeps the reach it had. This record is mirrored there as a
  third entry.
- It amends no RFC and not `CONTRIBUTING_AGENTS.md`; like the precedents in §4, it quotes a direction under RFC-2026-025
  §5 item 6 and changes no rule.

## 6. Addendum 2026-10-15: the two guard tests PR-2 must change (Owner's answer of 2026-10-15T02:13:35Z)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run. Copied by script, byte for byte, from records
1631 and 1632 of the same transcript (tool use `toolu_01NAEu1mQvAiKQ36d3yJDP5k`), and checked by script after writing; the times are the
transcript's stamps (UTC). Everything marked "A0's reading" is A0's.

### 6.1 Why it was asked

Once PR-2's code commit (`099a7ddf`) tracked `index.ts` and `application/run.ts`, `npm run test:bootstrap` failed two
tests of `test-kits/db/foundation-contract.test.mjs` that PR #260 wrote (RFC-2026-007 Amendment 2026-10-13 §C tests 2
and 3): one pinned the named files not at the head as exactly the three platform-kernel files, the other asserted that
none of them existed yet. Neither expected a pull request to create them. Changing them edits a guard test, which §3 (c)
above places outside the direction of 2026-10-14T13:01:02Z, so A0 asked.

### 6.2 Questions, options shown and answers (verbatim)

Asked 2026-10-15T02:09:48Z (`2026-10-15T02:09:48.811Z`), answered 2026-10-15T02:13:35Z (`2026-10-15T02:13:35.293Z`),
through the session's question tool, as one call of two questions, each single choice. Question 2 concerns other
governance pull requests, not PR-2; it is transcribed here because it was asked in the same call, and this record
reads nothing from it for PR-2.

### Question 1 — header "guard test"

**Q:** "PR-2 (index.ts + runner) ต้องแก้ guard test 2 ตัวใน test-kits/db/foundation-contract.test.mjs ที่ #260 เขียนไว้ว่า 'ไฟล์ platform-kernel 3 ไฟล์ยังไม่มี' (ไม่ได้คาดว่าจะมีการสร้าง) — ถ้าไม่แก้ CI ตก · การแก้แตะ guard ซึ่งคำสั่งเดิม (13:01:02Z) ไม่รวม จะให้ทำอย่างไร?"

- **Options shown:**
  - "รวมใน PR-2 + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "แก้เฉพาะ 2 test นั้นให้ยอมรับไฟล์ที่ถูกสร้าง (ยังตรวจคู่ยกเว้นครบ) ใน PR-2 เดียว · ไม่แตะ guard อื่น, CI, RFC · 4 role อ่าน + CI เขียว"
  - "แยก PR governance แก้ test ก่อน, A0 กด" — "PR เล็กแก้ 2 test ก่อน (4 role) แล้ว PR-2 ค่อยตาม · ช้ากว่า 1 รอบ"
  - "ผมกดเอง" — "A0 เตรียม PR + 4 role แล้วส่งคำสั่ง merge ให้คุณ"
- **A:** "รวมใน PR-2 + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

### Question 2 — header "ชุด governance"

**Q:** "งาน governance ที่คำสั่งเดิมไม่ครอบคลุม (ชุดข้อ 4): (1) A1-AUD1015-1 ย้าย npm audit/verify-release-age ใน CI ไปก่อนรันโค้ด package (2) แก้ audit lane ให้ผ่าน guard handoff ได้ (3) Q0-259-1 pin src/** ใน app-stack.test (4) Q0-257r6-1 test 3 จุด (5) status-line RFC-034 §8 item 3 — ใครกด?"

- **Options shown:**
  - "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)" — "เฉพาะ 5 เรื่องนี้ · แต่ละ PR 4 role + CI เขียว 2 job + ไม่มี security finding ค้าง · ไม่รวม dependency ใหม่"
  - "A0 เตรียม, ผมกดเอง" — "A0 เปิด PR + 4 role แล้วส่งคำสั่ง merge ให้คุณทีละ PR"
  - "ยังไม่ทำตอนนี้" — "บันทึกไว้เป็นงานค้าง ทำหลัง PR-2"
- **A:** "A0 กดเมื่อ 4 role ผ่าน ทีละ PR (Recommended)"

A0's translation of question 1 (A0's reading, not the Owner's words): "PR-2 (index.ts + runner) must change two guard
tests in test-kits/db/foundation-contract.test.mjs that #260 wrote as 'the 3 platform-kernel files do not exist yet'
(not expecting them to be created); without the change CI fails; the change touches a guard, which the earlier
direction (13:01:02Z) excludes. What should be done?" The chosen option: "Include it in PR-2 + A0 presses once the 4
roles pass" — "change only those 2 tests so they accept the created files (still checking the exception pairs in full)
in the one PR-2 · touch no other guard, CI, RFC · 4 roles read + CI green".

### 6.3 What it directs (A0's reading)

- PR-2 may change exactly the two tests named, in `test-kits/db/foundation-contract.test.mjs` (the one at "a
  records-only diff on the repository as it stands prints the records lane, …" and the one at "a pair listed for a file
  a guard fixture names before it exists keeps the records lane once a pull request creates the file …"), so that they
  hold whether or not the platform-kernel files exist, with every exception pair still checked in full; plus what the
  integrity rules require for that edit (the regenerated digest of the file in `test-kits/integrity-manifest.json`). No
  test is renamed or removed, so no name digest or floor moves.
- Nothing else of a guard, CI, an RFC, either classifier (its `STRING_NAME_EXCEPTIONS` included) or
  `CONTRIBUTING_AGENTS.md` is reached; §3 (b) and (c) above otherwise stand.
- A0 presses PR-2 with this edit once C0, A1, Q0 and R0 pass on its final head, CI is green on both jobs, no security
  finding of any grade is open against it and its head contains current `main`.

### 6.4 RFC-2026-025 §5 item 6

As §4 above: an Owner-directed exception to the last bullet, for PR-2 with these two tests only; the third bullet met
because the question named the change and the pull request (PR-2, not yet open) before it existed; the other
conditions kept.

### 6.5 What it does not decide

Whether the edited tests are right (the four roles' reading); anything in question 2, whose pull requests carry their
own records; and any later change to these tests or to the exception list.
