# Product Owner disposition — A0 isolates this package's three test files from the machine's git configuration and presses after four roles (2026-10-18, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author), drafted by an author subagent of that run, on WP-0A-CON-008, the
package that owns `test-kits/ratchets-bite.test.mjs`, `test-kits/ci-guard-behaviour.test.mjs` and
`test-kits/handoff-conformance.test.mjs`, on its branch `agent/claude/WP-0A-CON-008-merge-parent-order`. The question,
its header, the three option labels, the answer and the chosen option's description below are copied by script from
the raw transcript of session `325454ab`
(`~/.claude/projects/-Users-bank-ThinkBizThai/325454ab-eb14-4597-afd3-75b6b8c78ee8.jsonl`): line 9353 (A0's question-tool
call, uuid `6ee6500e-b7f2-4744-9bdb-122d55c57992`, stamped `2026-10-18T11:44:43.153Z`) and line 9379 (the tool result carrying the Owner's answer,
uuid `3a8b42ce-7023-499c-9bfd-96cd2f627844`, stamped `2026-10-18T12:07:58.209Z`, whose parent is line 9353's record and whose `tool_use_id`
is that call's `toolu_01SzE6HAyeoheWDdhhAcxPXT`), and checked byte for byte against them by script. Lines 9354 to 9378 hold no message:
17 `queue-operation`, 1 `last-prompt`, 1 `custom-title`, 1 `agent-name`, 1 `mode`, 1 `atis-latch`, 1 `pr-link`, 1 `history-suppression`, 1 `bridge-session` records (the queue records are background-task notifications). Times are the transcript's stamps (UTC),
not a clock read. Everything marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of
A0's reading of them: it is not a role verdict, approves nothing, and moves no status.

## 1. Why it was asked

A1 recorded two Info findings of one class. A1-293-2, on PR #293 (WP-0A-A0-004,
`evidence/WP-0A-A0-004/a1-review-2026-10-18-pr293.md`): configuration that has no `GIT_` name — `HOME`/`XDG_CONFIG_HOME`
selecting the caller's global git configuration, where a `core.hooksPath` runs in the scratch repositories — still
reaches `branch-scope.test.mjs`'s git, with `ratchets-bite.test.mjs`'s `CHILD_ENV` of the same scope; the optional fix
named `GIT_CONFIG_GLOBAL=/dev/null` and `GIT_CONFIG_NOSYSTEM=1` set after the strip. A1-294-3, on PR #294 (this package,
`evidence/WP-0A-CON-008/a1-review-2026-10-18-pr294.md`): the same for `ci-guard-behaviour` and `handoff-conformance`
(`HOME`/`XDG_CONFIG_HOME`, a global `core.hooksPath` or `init.templateDir`, the system gitconfig). The fix changes
top-level `test-kits/*.test.mjs` guard tests and the `scripts/test-suite-contract.mjs` registry lines they move:
RFC-2026-034 §2.2 puts them in the governance lane, and RFC-2026-025 §5 item 6's last bullet has the Owner merge a
governance pull request personally unless he directs otherwise. So A0 asked. No pull request of this increment existed
when the Owner answered: `gh pr list --head agent/claude/WP-0A-CON-008-merge-parent-order --state all` lists PR #294,
created 2026-10-18T08:41:56Z and merged 2026-10-18T10:28:04Z as `27ff9970`, as the latest; nothing after it.

## 2. Question, options shown and answer (verbatim)

Asked 2026-10-18T11:44:43.153Z, answered 2026-10-18T12:07:58.209Z, through the session's question tool, one question, single choice.

**Header:** "HOME/XDG"

**Q:**

```text
Info จาก A1 (A1-293-2, A1-294-3): เทสต์ที่สร้าง repo ชั่วคราวยังรับ git config ของเครื่อง (`HOME`, `XDG_CONFIG_HOME`, system gitconfig) อยู่ — ถ้าเครื่องใครตั้ง hook/config แปลก ๆ อาจทำให้เทสต์เพี้ยนหรือรันโค้ดได้ · แก้ด้วยการตั้ง `GIT_CONFIG_GLOBAL=/dev/null` + `GIT_CONFIG_NOSYSTEM=1` ในเทสต์ 4 ไฟล์ (ratchets-bite, ci-guard-behaviour, handoff-conformance ของ CON-008 และ branch-scope ของ A0-004) = PR governance 2 ตัว · จะให้ทำไหม และใครกด?
```

**Option labels shown, in order:**

```text
ทำ + A0 กดทีละ PR เมื่อ 4 role ผ่าน (Recommended)
```

```text
ทำ แต่ผมกดเอง
```

```text
ยังไม่ต้องทำ
```

**A (the chosen label):**

```text
ทำ + A0 กดทีละ PR เมื่อ 4 role ผ่าน (Recommended)
```

**The chosen option's description:**

```text
2 PR (CON-008, A0-004) · แต่ละตัวต้องผ่าน C0, A1, Q0, R0 บน head สุดท้าย, CI เขียว, ไม่มี security finding ค้าง
```

A0's translation of the question: "Info from A1 (A1-293-2, A1-294-3): the tests that make temporary repositories still
take the machine's git configuration (`HOME`, `XDG_CONFIG_HOME`, the system gitconfig) — if someone's machine sets an
odd hook or setting it can skew the tests or run code · fixed by setting `GIT_CONFIG_GLOBAL=/dev/null` +
`GIT_CONFIG_NOSYSTEM=1` in 4 test files (ratchets-bite, ci-guard-behaviour, handoff-conformance of CON-008 and
branch-scope of A0-004) = 2 governance PRs · do you want it done, and who presses?" Of the options: "Do it + A0 presses
one PR at a time when the 4 roles pass (Recommended)"; "Do it, but I press myself"; "Not yet". Of the chosen
description: "2 PRs (CON-008, A0-004) · each must pass C0, A1, Q0, R0 on the final head, CI green, no security finding
open".

## 3. A0's reading

The Owner chose the recommended option: do the fix, as two pull requests, one per owning package, and A0 presses each
once C0, A1, Q0 and R0 pass on its final head, CI is green, and no security finding is open. This pull request is the
CON-008 one: `test-kits/ratchets-bite.test.mjs`, `test-kits/ci-guard-behaviour.test.mjs` and
`test-kits/handoff-conformance.test.mjs`, the `scripts/test-suite-contract.mjs` lines their added cases move, the
regenerated integrity manifest and the records. `test-kits/branch-scope.test.mjs` is WP-0A-A0-004's and is recorded
there. A0 presses this one only after C0, A1, Q0 and R0 pass on its final head, CI is green on both jobs
(`bootstrap`, `application`) there, no security finding of any grade is open against it, and the head contains current
`main`; with `gh pr merge <n> --merge --match-head-commit <final head>`. It is not a standing delegation, and reaches
no other pull request or item. A0's reading.

**A separate item carried in the same pull request: Q0-AUD1018-1.** Q0's round audit of 2026-10-18
(`evidence/audits/2026-10-18/q0-audit.md` §5, on branch `q0/audit-2026-10-18`, commit `d9f1f4b0`) found (Low) that
`ratchets-bite.test.mjs`'s case "the commit gate puts the index back and stops its verifier when it is interrupted"
asserts the verifier is gone the instant the gate exits, while under parallel load the verifier outlives the gate by 82
to 128 ms (4 of 24 runs failed). The Owner's answer above does not name it. A0 directed it into this pull request on
A0's reading that the answer's subject is making these test files robust against the machine they run on, and that
this fix belongs to it only as test hardening of one of the three files: the case now polls up to 2 s for the verifier
to be gone before the same assertion; `scripts/commit-when-clean.mjs` is not changed. It is recorded as its own item
so a role can separate it: if a role reads it as outside the answer, it goes back to the Owner on its own, and the
rest of this pull request does not depend on it. A0's reading, not the Owner's.

## 4. RFC-2026-025 §5 item 6

A0's reading of the answer against that item:

1. **An exception to the last bullet, for this pull request only** (and for WP-0A-A0-004's pull request for
   `branch-scope.test.mjs`, recorded in that package), of the kind PR #266, #271, #278, #289, #292 and #294 of this
   package received. The question stated that the fix is governance and asked who presses; the Owner chose A0, after
   four roles, one pull request at a time.
2. **The third bullet, by naming the content before the pull request existed.** The answer was given at
   `2026-10-18T12:07:58.209Z`, before this pull request existed, to a question that names its content: the two settings, the
   four files by name and package, and "PR governance 2 ตัว". A0 reads that as naming its sequence explicitly: one pull
   request per owning package for that content.
3. **The other conditions are kept:** current `main` in the head when pressed (the first bullet), no security finding
   of any grade open (the second, and the chosen description's own condition), the Integration Owner's verdict (the
   fourth; R0 among the four roles), and green CI on both jobs on the final head. The Owner may press it himself.

## 5. What it does not decide

- Whether the change closes A1-293-2 and A1-294-3 for these three files: A1's to say on its reading. Whether it is
  right and tested: C0's, Q0's and R0's.
- `test-kits/branch-scope.test.mjs` (WP-0A-A0-004's), and A1-293-2 for it.
- `scripts/commit-when-clean.mjs`: its verifier's environment is not changed here (A1 did not ask for it), nor how it waits
  for its verifier (Q0-AUD1018-1 is fixed in the test only).
- Whether Q0-AUD1018-1 is closed: Q0's to say.
- Anything of another package. `status` stays `in_review`.

## 6. Records

`work-packages/WP-0A-CON-008.json` `required_human_authorities` gains one entry at the end citing this file; the
nine existing entries are kept byte for byte (the field is strictly append-only, RFC-2026-025 §6.1 item 4,
`scripts/db/classify-records-only.mjs` `appendedEntriesOnly`). `open_blockers` gains one entry at the end; the
eighteen existing entries are kept byte for byte. `ownership.amends_without_owning.rationale` is extended, its old
text kept whole in front; its `paths` are unchanged.
