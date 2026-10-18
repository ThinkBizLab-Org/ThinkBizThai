# Product Owner disposition — the branch-scope test's children inherit no `GIT_*` of their caller's (A1-292-2; 2026-10-18, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author), drafted by an author subagent of that run, on WP-0A-A0-004, the
package that owns `test-kits/branch-scope.test.mjs` (`ownership.writable_paths`). A0's words and the Owner's answer
below are copied by script from the raw transcript of session `325454ab`
(`~/.claude/projects/-Users-bank-ThinkBizThai/325454ab-eb14-4597-afd3-75b6b8c78ee8.jsonl`, lines 8561 and 8565) and
checked byte for byte against them by the same script. Times are the transcript's stamps (UTC), not a clock read.
Everything marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of A0's reading of
them: it is not a role verdict, approves nothing, and moves no status on A0's behalf. It is modelled on
`evidence/WP-0A-A0-004/product-owner-disposition-2026-10-17-ci-shell-env.md`.

## 1. Why it was asked

- **A1-292-2** (Low, integrity; pre-existing, against the suite, not against PR #292;
  `evidence/WP-0A-CON-008/a1-review-2026-10-18-pr292.md` §4 and §6): `ci-guard-behaviour.test.mjs`,
  `branch-scope.test.mjs` and `handoff-conformance.test.mjs` hand their caller's `GIT_*` to `git` in their throwaway
  repositories. Run with `GIT_INDEX_FILE` naming another repository's index, `branch-scope.test.mjs` passed 39/39 and
  replaced that index. A1 asked that it be routed to the owners of those files as an open blocker and recorded before
  the next press of any of them; the fix it named is the one PR #292 made in `ratchets-bite.test.mjs`, an environment
  with no `GIT_*` for every child.
- **Q0-292-2** (Low; `evidence/WP-0A-CON-008/q0-review-2026-10-18-pr292.md` §6): with `GIT_INDEX_FILE` and
  `GIT_OBJECT_DIRECTORY` pointed at a throwaway "caller" repository, `branch-scope` changed 80 files under that
  repository's `.git` (and failed).
- `test-kits/branch-scope.test.mjs` is a top-level `test-kits/*.test.mjs` guard test, so a change to it is a governance
  pull request (RFC-2026-034 §2.2), which RFC-2026-025 §5 item 6's last bullet has the Owner merge personally unless he
  directs otherwise.

## 2. A0's words and the Owner's answer (verbatim)

A0's message at transcript line 8561 (stamped `2026-10-18T02:24:44.011Z`) reported the merge of PR #292 and listed what
was outstanding. Its heading for that list, verbatim:

```text
**งานค้าง:**
```

Item 1 under it, whole, verbatim:

```text
1. **A1-292-2 (Low):** เทสต์อีก 3 ไฟล์ (`ci-guard-behaviour`, `branch-scope`, `handoff-conformance`) ยังส่ง `GIT_*` ของผู้เรียกต่อไปให้ git · ตอนนี้ยังไม่มีอะไรไปเรียกให้เกิดปัญหา แต่เป็นงาน governance ที่ต้องมีคำสั่งคุณก่อน
```

The message's last line, verbatim:

```text
ข้อ 1 ผมแนะนำให้แก้แบบเดียวกับ #292 แล้วให้ A0 กดเมื่อ 4 role ผ่าน ต้องการให้เริ่มไหมครับ
```

A0's translation of item 1: "A1-292-2 (Low): three more test files (`ci-guard-behaviour`, `branch-scope`,
`handoff-conformance`) still pass the caller's `GIT_*` on to git. Nothing calls them in a way that causes the problem
yet, but it is governance work that needs your direction first." Of the last line: "For item 1 I recommend fixing it
the same way as #292 and having A0 press once the 4 roles pass. Do you want me to start?"

Lines 8562 to 8564 are a session system record and two queue-operation records; no message lies between. The Owner's
next message, at transcript line 8565 (stamped `2026-10-18T02:39:25.100Z`), whole:

```text
ลุยเลย ไม่ต้องรอถาม
```

A0's translation: "Go ahead, no need to wait and ask."

## 3. What it directs

A0's reading, bounded to item 1 (A1-292-2), for this package's file:

1. One governance pull request, on this package's branch `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, that
   makes every child process of `test-kits/branch-scope.test.mjs` (git, bash, sh, and what the bash steps run) start
   with no `GIT_*` variable of its caller's, removed as a class as `ratchets-bite.test.mjs`'s `CHILD_ENV` does, and
   adds one test that reruns the file's other tests with `GIT_INDEX_FILE`, `GIT_DIR` and `GIT_WORK_TREE`, or
   `GIT_INDEX_FILE` and `GIT_OBJECT_DIRECTORY` pointed at a throwaway repository and requires that repository unchanged
   byte for byte. No existing test is removed or renamed.
2. Besides the test it changes `scripts/test-suite-contract.mjs` (WP-0A-A0-002's; the file's floors and name digest,
   under `ownership.amends_without_owning`), `evidence/VERIFICATION.md` (WP-0A-CON-008's; `npm run
   record:verification`, under the same field), the regenerated `test-kits/integrity-manifest.json`, and this package's
   records: this file, the manifest (`open_blockers`, `required_human_authorities`, `ownership.amends_without_owning`)
   and the author handoff.
3. A0 presses it only after C0, A1, Q0 and R0 pass on its final head, CI is green on both jobs (`bootstrap`,
   `application`) there, no security finding is left open against it, and the head contains current `main`.

The other two files item 1 names, `ci-guard-behaviour.test.mjs` and `handoff-conformance.test.mjs`, are not this
package's; their pull request and its record belong to their owning package. It is not a standing delegation.

## 4. RFC-2026-025 §5 item 6

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, that a PR changing governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a
gate) is merged by the Owner personally, never by delegation. A0's reading of the answer against both:

1. **An exception to the last bullet, for this pull request only**, in the form PR #211, PR #212, the lane-walk fix,
   PR #270, PR #279, PR #280, PR #281, PR #283 and PR #287 received one. Unlike those, the Owner was not shown a
   choice between options: A0's question recommended, in words, that A0 press once the four roles pass, and the Owner
   answered "go ahead" to it. A0 reads the answer as accepting the recommendation, including who presses; whether it
   covers the press is for the roles to judge.
2. **The third bullet, by naming the item before the pull request existed.** The answer was given at
   2026-10-18T02:39:25Z, before this pull request existed, to a message that names its content (item 1, A1-292-2, the
   three files) and its form (fixed as #292 was). A0 reads that as naming its sequence explicitly.
3. **The other conditions are kept:** current `main` in the head when pressed (the first bullet), no security finding
   of any grade open (the second), the Integration Owner's verdict (the fourth; R0 among the four roles), and green CI
   on both jobs on the final head.

## 5. What it does not decide

- Whether the change is right and whether its residual is acceptable: C0's, A1's, Q0's and R0's reading.
- The other two files of A1-292-2, and any shared helper or guard over every `spawnSync('git'` in `test-kits/` (A1's
  "better still"): not this pull request's.
- Items 2 and 3 of the same list (R0's `integration_verified` after PR #292; the third round audit).
- WP-0A-A0-002's and WP-0A-CON-008's acknowledgements of the amendments to their files, owed from their Integration
  Owner (`/claude/r0_steward`).

## 6. Records

`work-packages/WP-0A-A0-004.json` `required_human_authorities` gains one entry at the end, gov-a004h, citing this file,
and `open_blockers` one at the end recording A1-292-2 fixed for `test-kits/branch-scope.test.mjs`; every earlier entry of
both is kept byte for byte (append-only). `ownership.amends_without_owning.paths` names `scripts/test-suite-contract.mjs`
and `evidence/VERIFICATION.md`, its rationale prefixed with this increment and the earlier text kept after it.
